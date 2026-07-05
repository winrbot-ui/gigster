"""Chrome extension API — thread ingest, brief decision, auto settings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.auth import require_active_user
from app.db import get_supabase_optional, first_row
from app.services import ext_threads
from app.services.agent2.jobs import enqueue_agent2, agent2_status_for
from app.services.ai import pipeline as ai
from app.services.brief_document import markdown_to_pdf_bytes, project_to_markdown
from app.services.telegram import notify_brief_ready

router = APIRouter(prefix="/ext", tags=["extension"])


class ThreadMessage(BaseModel):
    role: str = "client"
    text: str = Field(min_length=1)
    sent_at: str | None = None


class ThreadRequest(BaseModel):
    platform: str = Field(min_length=1)
    thread_id: str = Field(min_length=1)
    client_name: str | None = None
    client_username: str | None = None
    messages: list[ThreadMessage] = Field(default_factory=list)
    mode: str = "manual"
    sync_only: bool = False
    pending_assistant_text: str | None = None


class BriefDecisionRequest(BaseModel):
    project_id: str = Field(min_length=1)
    action: str = Field(pattern="^(build|document|both)$")


class AutoSettingsRequest(BaseModel):
    disclaimer_accepted: bool = False
    enabled: bool | None = None


@router.post("/thread")
async def post_thread(
    body: ThreadRequest,
    user_id: str = Depends(require_active_user),
):
    """Ingest inbox messages for a thread and return an on-persona draft."""
    sb = get_supabase_optional()
    if not sb:
        raise HTTPException(503, "Database not configured")

    try:
        return await ext_threads.process_thread(
            sb,
            user_id,
            {
                "platform": body.platform,
                "thread_id": body.thread_id,
                "client_name": body.client_name,
                "client_username": body.client_username,
                "messages": [m.model_dump() for m in body.messages],
                "mode": body.mode,
                "sync_only": body.sync_only,
                "pending_assistant_text": body.pending_assistant_text,
            },
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/brief/decision")
async def brief_decision(
    body: BriefDecisionRequest,
    user_id: str = Depends(require_active_user),
):
    sb = get_supabase_optional()
    if not sb:
        raise HTTPException(503, "Database not configured")

    proj = first_row(
        sb.table("projects")
        .select("*")
        .eq("id", body.project_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not proj:
        raise HTTPException(404, "Project not found")

    project_json = proj.get("project_json") or {}
    score = proj.get("brief_score") or ai.compute_brief_score(project_json)
    readiness = ai.brief_readiness_details(project_json, score)
    if not readiness["ready"]:
        raise HTTPException(400, "Brief is not ready yet")

    action = body.action
    project_json = {**project_json, "brief_decision": action}
    sb.table("projects").update({"project_json": project_json}).eq("id", body.project_id).execute()

    tg = first_row(
        sb.table("telegram_links")
        .select("chat_id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    chat_id = (tg or {}).get("chat_id")

    result: dict = {"ok": True, "action": action, "project_id": body.project_id}

    if action in ("build", "both"):
        if not proj.get("build_spec"):
            build_spec = await ai.brief(project_json, proj.get("preview_slug"))
            sb.table("projects").update({"build_spec": build_spec}).eq("id", body.project_id).execute()
        agent2 = await enqueue_agent2(body.project_id, notify_chat_id=chat_id)
        result["agent2"] = agent2

    if action in ("document", "both"):
        md = project_to_markdown(project_json, client_name=proj.get("client_name"))
        result["document"] = {
            "markdown": md,
            "filename_base": f"brief-{body.project_id[:8]}",
        }

    return result


@router.get("/brief/document/{project_id}")
async def download_brief_document(
    project_id: str,
    format: str = "pdf",
    user_id: str = Depends(require_active_user),
):
    sb = get_supabase_optional()
    if not sb:
        raise HTTPException(503, "Database not configured")

    proj = first_row(
        sb.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not proj:
        raise HTTPException(404, "Project not found")

    project_json = proj.get("project_json") or {}
    md = project_to_markdown(project_json, client_name=proj.get("client_name"))
    base = f"brief-{project_id[:8]}"

    if format == "md":
        return Response(
            content=md,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{base}.md"'},
        )

    pdf_bytes = markdown_to_pdf_bytes(md)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{base}.pdf"'},
    )


@router.get("/agent2/status")
async def get_agent2_status(
    project_id: str,
    user_id: str = Depends(require_active_user),
):
    sb = get_supabase_optional()
    if not sb:
        raise HTTPException(503, "Database not configured")

    proj = first_row(
        sb.table("projects")
        .select("id, agent2_status, preview_url, preview_slug")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not proj:
        raise HTTPException(404, "Project not found")
    return agent2_status_for(proj)


@router.post("/auto-settings")
async def update_auto_settings(
    body: AutoSettingsRequest,
    user_id: str = Depends(require_active_user),
):
    sb = get_supabase_optional()
    if not sb:
        raise HTTPException(503, "Database not configured")

    payload = {"user_id": user_id, "disclaimer_accepted": body.disclaimer_accepted}
    if body.enabled is not None:
        payload["enabled"] = body.enabled

    sb.table("desktop_auto_settings").upsert(payload, on_conflict="user_id").execute()
    return {"ok": True, **payload}
