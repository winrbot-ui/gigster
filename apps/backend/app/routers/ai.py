from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from app.auth import require_active_user
from app.db import get_supabase_optional
from app.services.ai import pipeline as ai
from app.services.agent2.worker import run_agent2

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateRequest(BaseModel):
    project_id: str
    ocr_text: str = ""


class BriefRequest(BaseModel):
    project_id: str


class ScoreRequest(BaseModel):
    project_id: str | None = None
    project_json: dict | None = None


@router.post("/generate")
async def generate_draft(
    body: GenerateRequest,
    user_id: str = Depends(require_active_user),
):
    sb = get_supabase_optional()
    if not sb:
        raise HTTPException(503, "Database not configured")

    proj = (
        sb.table("projects")
        .select("*")
        .eq("id", body.project_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not proj.data:
        raise HTTPException(404, "Project not found")

    persona_row = (
        sb.table("agent_personas").select("*").eq("user_id", user_id).maybe_single().execute()
    )
    existing = proj.data.get("project_json") or {}
    updated = await ai.extract(body.ocr_text, existing)
    score = ai.compute_brief_score(updated)
    stage = await ai.detect_stage(body.ocr_text)
    draft_text = await ai.draft(persona_row.data or {}, updated, body.ocr_text)
    readiness = ai.brief_readiness_details(updated, score)

    new_status = updated.get("status") or proj.data.get("status")
    sb.table("projects").update({
        "project_json": updated,
        "brief_score": score,
        "status": new_status,
    }).eq("id", body.project_id).execute()

    return {
        "draft": draft_text,
        "brief_score": score,
        "stage": stage,
        "project_json": updated,
        "readiness": readiness,
    }


@router.post("/score")
async def score_brief(
    body: ScoreRequest,
    user_id: str = Depends(require_active_user),
):
    """Return brief readiness score and missing fields for a project."""
    sb = get_supabase_optional()
    project_json = body.project_json

    if body.project_id:
        if not sb:
            raise HTTPException(503, "Database not configured")
        proj = (
            sb.table("projects")
            .select("project_json, brief_score")
            .eq("id", body.project_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not proj.data:
            raise HTTPException(404, "Project not found")
        project_json = proj.data.get("project_json") or {}
        stored_score = proj.data.get("brief_score")
        return ai.brief_readiness_details(project_json, stored_score)

    if not project_json:
        raise HTTPException(400, "project_id or project_json required")

    return ai.brief_readiness_details(project_json)


@router.post("/brief")
async def generate_brief(
    body: BriefRequest,
    user_id: str = Depends(require_active_user),
):
    sb = get_supabase_optional()
    if not sb:
        raise HTTPException(503, "Database not configured")

    proj = (
        sb.table("projects")
        .select("*")
        .eq("id", body.project_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not proj.data:
        raise HTTPException(404, "Project not found")

    pj = proj.data.get("project_json") or {}
    score = proj.data.get("brief_score") or 0
    readiness = ai.brief_readiness_details(pj, score)
    if not readiness["ready"]:
        raise HTTPException(400, f"Brief not ready: missing {', '.join(readiness['missing'])}")

    build_spec = await ai.brief(pj, proj.data.get("preview_slug"))
    sb.table("projects").update({"build_spec": build_spec}).eq("id", body.project_id).execute()

    result = await run_agent2(body.project_id)
    if not result.get("ok"):
        raise HTTPException(500, result.get("error", "Agent 2 failed"))

    return {"build_spec": build_spec, "preview_url": result.get("preview_url")}
