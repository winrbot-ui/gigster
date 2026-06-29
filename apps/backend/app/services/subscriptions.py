"""Subscription expiry cron — deactivate expired memberships."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.db import get_supabase_optional
from app.services.email import send_membership_expired, send_membership_expiring_soon

WARNING_DAYS = 3


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def run_subscription_expiry() -> dict:
    """Mark subscriptions past expires_at inactive and set users to expired."""
    sb = get_supabase_optional()
    if not sb:
        return {"expired": 0, "error": "Database not configured"}

    now_iso = _now().isoformat()
    rows = (
        sb.table("subscriptions")
        .select("id, user_id, expires_at")
        .eq("active", True)
        .lt("expires_at", now_iso)
        .execute()
    )

    expired = 0
    user_ids: set[str] = set()

    for sub in rows.data or []:
        sb.table("subscriptions").update({"active": False}).eq("id", sub["id"]).execute()
        user_ids.add(sub["user_id"])
        expired += 1

    for user_id in user_ids:
        user_row = (
            sb.table("users")
            .select("email, username, status")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        sb.table("users").update({"status": "expired"}).eq("id", user_id).execute()
        if user_row.data and user_row.data.get("status") == "active":
            await send_membership_expired(
                user_row.data["email"],
                user_row.data.get("username") or "",
            )

    return {"expired": expired, "users_updated": len(user_ids)}


async def run_expiry_warnings() -> dict:
    """Email active members whose subscription expires within WARNING_DAYS."""
    sb = get_supabase_optional()
    if not sb:
        return {"warned": 0, "error": "Database not configured"}

    now = _now()
    window_start = now + timedelta(days=WARNING_DAYS - 1)
    window_end = now + timedelta(days=WARNING_DAYS + 1)

    subs = (
        sb.table("subscriptions")
        .select("id, user_id, expires_at, users(email, username, status)")
        .eq("active", True)
        .gte("expires_at", window_start.isoformat())
        .lte("expires_at", window_end.isoformat())
        .execute()
    )

    warned = 0
    for sub in subs.data or []:
        user = sub.get("users") or {}
        if user.get("status") != "active":
            continue
        expires = sub.get("expires_at", "")
        ok = await send_membership_expiring_soon(
            user.get("email") or "",
            user.get("username") or "",
            expires[:10] if expires else "",
        )
        if ok:
            warned += 1

    return {"warned": warned}


def subscription_is_live(sub: dict | None) -> bool:
    """True when subscription row is active and not past expires_at."""
    if not sub or not sub.get("active"):
        return False
    expires_at = sub.get("expires_at")
    if not expires_at:
        return False
    try:
        exp = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
    except ValueError:
        return False
    return exp > _now()
