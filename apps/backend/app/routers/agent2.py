from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from app.auth import require_active_user
from app.services.agent2.jobs import enqueue_agent2
from app.db import get_supabase_optional

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
        .select("id, agent2_status")
        .eq("id", body.project_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not proj.data:
        raise HTTPException(404, "Project not found")

    result = await enqueue_agent2(body.project_id)
    if not result.get("ok"):
        raise HTTPException(500, result.get("error", "Agent 2 failed"))
    return result
