"""Enforce Basic=1 / Pro=2 distinct marketplace platforms per user (Fiverr + Freelancer)."""

from __future__ import annotations

from fastapi import HTTPException

from app.db import first_row
from app.services.subscriptions import subscription_is_live

SUPPORTED_PLATFORMS = frozenset({"fiverr", "freelancer"})
COMING_SOON_PLATFORMS = frozenset({"upwork"})


def _active_subscription(sb, user_id: str) -> dict | None:
    row = first_row(
        sb.table("subscriptions")
        .select("platforms_allowed, plan, active, expires_at")
        .eq("user_id", user_id)
        .eq("active", True)
        .order("expires_at", desc=True)
        .limit(1)
        .execute()
    )
    if subscription_is_live(row):
        return row
    return None


def used_platforms(sb, user_id: str) -> set[str]:
    rows = (
        sb.table("projects")
        .select("platform")
        .eq("user_id", user_id)
        .execute()
    )
    return {r["platform"] for r in (rows.data or []) if r.get("platform")}


def platforms_allowed_for(sb, user_id: str) -> int:
    sub = _active_subscription(sb, user_id)
    if sub and sub.get("platforms_allowed"):
        return int(sub["platforms_allowed"])
    return 1


def can_use_platform(platforms_allowed: int, used: set[str], platform: str) -> bool:
    if platform in used:
        return True
    return len(used) < platforms_allowed


def limit_message(platforms_allowed: int) -> str:
    if platforms_allowed <= 1:
        return (
            "Your Basic plan allows 1 platform (Fiverr or Freelancer). "
            "Upgrade to Pro for both."
        )
    return "Your Pro plan allows Fiverr and Freelancer. Upwork is coming soon."


def assert_platform_allowed(sb, user_id: str, platform: str) -> None:
    platform = platform.strip().lower()
    if platform in COMING_SOON_PLATFORMS:
        raise HTTPException(400, "Upwork is coming soon — use Fiverr or Freelancer.")
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(400, "Invalid platform.")
    allowed = platforms_allowed_for(sb, user_id)
    used = used_platforms(sb, user_id)
    if not can_use_platform(allowed, used, platform):
        raise HTTPException(403, limit_message(allowed))


def allowed_platforms_payload(sb, user_id: str) -> dict:
    allowed = platforms_allowed_for(sb, user_id)
    used = sorted(used_platforms(sb, user_id))
    available = [
        p
        for p in sorted(SUPPORTED_PLATFORMS)
        if can_use_platform(allowed, set(used), p)
    ]
    return {
        "platforms_allowed": allowed,
        "used_platforms": used,
        "available_platforms": available,
    }
