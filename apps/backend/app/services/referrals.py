"""Referral qualification cron — 90-day active users + churn clawback."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.db import get_supabase_optional

QUALIFICATION_DAYS = 90

# Marketer tier thresholds (qualified referral counts)
TIER_10K_COUNT = 20   # €10k bonus tier
TIER_20K_COUNT = 40   # €20k bonus tier + €5k salary


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _apply_milestone_tiers(sb, marketer_id: str, count: int, now_iso: str) -> None:
    ms = (
        sb.table("marketer_milestones")
        .select("*")
        .eq("marketer_id", marketer_id)
        .maybe_single()
        .execute()
    )
    row = ms.data or {"marketer_id": marketer_id, "qualified_count": 0}
    updates: dict = {
        "qualified_count": count,
        "updated_at": now_iso,
    }

    if count >= TIER_10K_COUNT and not row.get("milestone_20_paid"):
        updates["milestone_20_paid"] = True
        updates.setdefault("tier_10k_reached_at", now_iso)
    elif count < TIER_10K_COUNT:
        updates["milestone_20_paid"] = False
        updates["tier_10k_reached_at"] = None

    if count >= TIER_20K_COUNT and not row.get("milestone_40_paid"):
        updates["milestone_40_paid"] = True
        updates["salary_active"] = True
        updates.setdefault("tier_20k_reached_at", now_iso)
        updates.setdefault("salary_started_at", now_iso)
    elif count < TIER_20K_COUNT:
        updates["milestone_40_paid"] = False
        updates["salary_active"] = False
        updates["tier_20k_reached_at"] = None
        updates["salary_started_at"] = None

    sb.table("marketer_milestones").upsert(
        {"marketer_id": marketer_id, **updates},
        on_conflict="marketer_id",
    ).execute()


async def run_referral_qualification() -> dict:
    sb = get_supabase_optional()
    if not sb:
        return {"qualified": 0, "error": "Database not configured"}

    cutoff = datetime.now(timezone.utc) - timedelta(days=QUALIFICATION_DAYS)
    pending = (
        sb.table("referrals")
        .select("*, referred:referred_id(id, status, created_at)")
        .eq("status", "pending")
        .execute()
    )

    qualified = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for ref in pending.data or []:
        referred = ref.get("referred") or {}
        created = _parse_ts(referred.get("created_at"))
        if referred.get("status") != "active" or not created:
            continue
        if created > cutoff:
            continue

        sb.table("referrals").update({
            "status": "qualified",
            "qualified_at": now_iso,
        }).eq("id", ref["id"]).execute()
        qualified += 1

        referrer_id = ref["referrer_id"]
        ms = (
            sb.table("marketer_milestones")
            .select("qualified_count")
            .eq("marketer_id", referrer_id)
            .maybe_single()
            .execute()
        )
        count = (ms.data.get("qualified_count") or 0) + 1 if ms.data else 1
        _apply_milestone_tiers(sb, referrer_id, count, now_iso)

    return {"qualified": qualified}


async def run_referral_churn_clawback() -> dict:
    """
    Mark qualified referrals as churned when the referred user is no longer active.
    Decrement marketer qualified_count and revert milestone tiers.
    """
    sb = get_supabase_optional()
    if not sb:
        return {"clawed_back": 0, "error": "Database not configured"}

    qualified_refs = (
        sb.table("referrals")
        .select("*, referred:referred_id(id, status)")
        .eq("status", "qualified")
        .execute()
    )

    clawed_back = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    referrers_to_recount: set[str] = set()

    for ref in qualified_refs.data or []:
        referred = ref.get("referred") or {}
        if referred.get("status") == "active":
            continue

        sb.table("referrals").update({
            "status": "churned",
            "qualified_at": None,
        }).eq("id", ref["id"]).execute()
        clawed_back += 1
        referrers_to_recount.add(ref["referrer_id"])

    for referrer_id in referrers_to_recount:
        count_resp = (
            sb.table("referrals")
            .select("id", count="exact")
            .eq("referrer_id", referrer_id)
            .eq("status", "qualified")
            .execute()
        )
        count = count_resp.count or 0
        _apply_milestone_tiers(sb, referrer_id, count, now_iso)

    return {"clawed_back": clawed_back, "referrers_updated": len(referrers_to_recount)}
