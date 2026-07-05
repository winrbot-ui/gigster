"""Async Agent 2 job queue — in-process background tasks with status polling."""

from __future__ import annotations

import asyncio
import logging

from app.db import get_supabase_optional
from app.services.agent2.worker import run_agent2
from app.services.telegram import notify_site_ready

logger = logging.getLogger(__name__)

_running: set[str] = set()


async def enqueue_agent2(project_id: str, *, notify_chat_id: str | None = None) -> dict:
    """Start Agent 2 build in the background if not already running."""
    if project_id in _running:
        return {"ok": True, "status": "building", "queued": False}

    sb = get_supabase_optional()
    if sb:
        sb.table("projects").update({"agent2_status": "building"}).eq("id", project_id).execute()

    _running.add(project_id)
    asyncio.create_task(_run_job(project_id, notify_chat_id=notify_chat_id))
    return {"ok": True, "status": "building", "queued": True}


async def _run_job(project_id: str, *, notify_chat_id: str | None = None) -> None:
    try:
        result = await run_agent2(project_id)
        if result.get("ok") and notify_chat_id:
            sb = get_supabase_optional()
            if sb:
                proj = (
                    sb.table("projects")
                    .select("client_name, preview_url")
                    .eq("id", project_id)
                    .single()
                    .execute()
                )
                if proj.data:
                    await notify_site_ready(
                        notify_chat_id,
                        proj.data.get("client_name") or "Client",
                        proj.data.get("preview_url") or result.get("preview_url") or "",
                    )
    except Exception:
        logger.exception("Background Agent 2 failed for %s", project_id)
    finally:
        _running.discard(project_id)


def agent2_status_for(project: dict) -> dict:
    return {
        "status": project.get("agent2_status") or "idle",
        "preview_url": project.get("preview_url"),
        "preview_slug": project.get("preview_slug"),
        "running": project.get("id") in _running,
    }
