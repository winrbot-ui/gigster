from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from app.auth import require_active_user
from app.db import get_supabase_optional, first_row
from app.services.ai import pipeline as ai
from app.services import ext_threads
from app.services.agent2.jobs import enqueue_agent2

router = APIRouter(prefix="/agent2", tags=["agent2"])


class RetryRequest(BaseModel):
    project_id: str


@router.post("/retry")
async def retry_build(
    body: RetryRequest,
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

    row = proj.data
    project_json = row.get("project_json") or {}

    from app.services.agent2.validate import sanitize_build_spec

    if row.get("build_spec"):
        sanitized = sanitize_build_spec(row["build_spec"])
        pj = dict(project_json)
        pj.pop("agent2_last_error", None)
        sb.table("projects").update({
            "build_spec": sanitized,
            "project_json": pj,
        }).eq("id", body.project_id).execute()
        row["build_spec"] = sanitized
        project_json = pj

    if row.get("agent2_status") == "failed":
        persona = first_row(
            sb.table("agent_personas")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        thread_id = row.get("thread_id")
        platform = row.get("platform") or project_json.get("platform") or ""
        conversation = ""
        if thread_id and platform:
            msgs = ext_threads.load_thread_messages(sb, user_id, platform, thread_id)
            conversation = ai.messages_to_inbox_text(msgs)
        build_spec = await ai.brief(
            project_json,
            row.get("preview_slug"),
            persona=persona,
            conversation=conversation,
        )
        pj = dict(project_json)
        pj.pop("agent2_last_error", None)
        sb.table("projects").update({
            "build_spec": build_spec,
            "project_json": pj,
            "agent2_status": "idle",
        }).eq("id", body.project_id).execute()

    result = await enqueue_agent2(body.project_id)
    if not result.get("ok"):
        raise HTTPException(500, result.get("error", "Agent 2 failed"))
    return result
