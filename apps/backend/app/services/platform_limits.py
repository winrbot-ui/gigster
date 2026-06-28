"""Enforce Basic=1 / Pro=3 distinct marketplace platforms per user."""

from __future__ import annotations

from fastapi import HTTPException

SUPPORTED_PLATFORMS = frozenset({"upwork", "fiverr", "freelancer"})


def _active_subscription(sb, user_id: str) -> dict | None:
    row = (
        sb.table("subscriptions")
        .select("platforms_allowed, plan")
        .eq("user_id", user_id)
        .eq("active", True)
        .order("expires_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    return row.data


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
            "Your Basic plan allows 1 platform (Upwork, Fiverr, or Freelancer). "
            "Upgrade to Pro for all 3."
        )
    return (
        f"Your plan allows {platforms_allowed} platforms. "
        "Remove a project on another platform or upgrade."
    )


def assert_platform_allowed(sb, user_id: str, platform: str) -> None:
    platform = platform.strip().lower()
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
        for p in ("upwork", "fiverr", "freelancer")
        if can_use_platform(allowed, set(used), p)
    ]
    return {
        "platforms_allowed": allowed,
        "used_platforms": used,
        "available_platforms": available,
    }
