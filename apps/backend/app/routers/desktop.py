from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from app.auth import require_active_user
from app.services.ai import pipeline as ai
from app.db import get_supabase_optional

router = APIRouter(prefix="/desktop", tags=["desktop"])

SUPPORTED_PLATFORMS = ("upwork", "fiverr", "freelancer")
DELAY_RANGE = (3, 45)


class OcrDraftRequest(BaseModel):
    project_id: str
    ocr_text: str
    mode: str = "manual"  # manual | auto
    auto_delay_minutes: int | None = None


class AutoModeSettings(BaseModel):
    enabled: bool
    disclaimer_accepted: bool
    delay_minutes: int = Field(default=15, ge=3, le=45)


def _clamp_delay(minutes: int) -> int:
    return min(max(minutes, DELAY_RANGE[0]), DELAY_RANGE[1])


def _load_auto_settings(sb, user_id: str) -> dict:
    row = (
        sb.table("desktop_auto_settings")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if row.data:
        return row.data
    return {
        "enabled": False,
        "disclaimer_accepted": False,
        "delay_minutes": 15,
    }


@router.post("/draft")
async def desktop_draft(
    body: OcrDraftRequest,
    user_id: str = Depends(require_active_user),
):
    """Desktop app sends OCR text; backend returns draft (Manual + Auto)."""
    sb = get_supabase_optional()
    persona = {}
    existing = {}
    auto_settings = {"enabled": False, "disclaimer_accepted": False, "delay_minutes": 15}

    if sb:
        p = sb.table("agent_personas").select("*").eq("user_id", user_id).maybe_single().execute()
        persona = p.data or {}
        if body.project_id:
            proj = sb.table("projects").select("project_json").eq("id", body.project_id).maybe_single().execute()
            existing = (proj.data or {}).get("project_json") or {}
        auto_settings = _load_auto_settings(sb, user_id)

    if body.mode == "auto":
        if not auto_settings.get("enabled") or not auto_settings.get("disclaimer_accepted"):
            raise HTTPException(
                400,
                "Auto mode not enabled. Accept disclaimer in desktop settings first.",
            )

    updated = await ai.extract(body.ocr_text, existing)
    draft_text = await ai.draft(persona, updated, body.ocr_text)
    score = ai.compute_brief_score(updated)
    stage = await ai.detect_stage(body.ocr_text)
    readiness = ai.brief_readiness_details(updated, score)

    if sb and body.project_id:
        sb.table("projects").update({
            "project_json": updated,
            "brief_score": score,
            "status": updated.get("status", existing.get("status", "new")),
        }).eq("id", body.project_id).execute()

    response = {
        "draft": draft_text,
        "brief_score": score,
        "stage": stage,
        "mode": body.mode,
        "project_json": updated,
        "readiness": readiness,
    }
    if body.mode == "auto":
        delay = _clamp_delay(body.auto_delay_minutes or auto_settings.get("delay_minutes") or 15)
        response["auto_send_after_seconds"] = delay * 60
        response["auto_delay_minutes"] = delay
        response["disclaimer"] = (
            "Auto mode sends replies via UI Automation. This increases platform ban risk. "
            "Use at your own risk."
        )
        response["supported_platforms"] = list(SUPPORTED_PLATFORMS)
    return response


@router.get("/auto-settings")
async def get_auto_settings(user_id: str = Depends(require_active_user)):
    sb = get_supabase_optional()
    settings_row = {
        "enabled": False,
        "disclaimer_accepted": False,
        "delay_minutes": 15,
    }
    if sb:
        settings_row = _load_auto_settings(sb, user_id)

    return {
        "enabled": settings_row.get("enabled", False),
        "disclaimer_accepted": settings_row.get("disclaimer_accepted", False),
        "delay_minutes": _clamp_delay(settings_row.get("delay_minutes") or 15),
        "supported_platforms": list(SUPPORTED_PLATFORMS),
        "delay_range_minutes": list(DELAY_RANGE),
    }


@router.post("/auto-settings")
async def save_auto_settings(
    body: AutoModeSettings,
    user_id: str = Depends(require_active_user),
):
    if body.enabled and not body.disclaimer_accepted:
        return {"ok": False, "error": "Accept disclaimer before enabling Auto mode."}

    delay = _clamp_delay(body.delay_minutes)
    sb = get_supabase_optional()
    if sb:
        sb.table("desktop_auto_settings").upsert({
            "user_id": user_id,
            "enabled": body.enabled,
            "disclaimer_accepted": body.disclaimer_accepted,
            "delay_minutes": delay,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="user_id").execute()

    return {
        "ok": True,
        "enabled": body.enabled,
        "disclaimer_accepted": body.disclaimer_accepted,
        "delay_minutes": delay,
        "supported_platforms": list(SUPPORTED_PLATFORMS),
    }
