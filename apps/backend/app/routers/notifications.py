from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends
from app.auth import require_active_user
from app.db import get_supabase_optional
from app.services.platform_limits import assert_platform_allowed
from app.services.telegram import notify_new_message

router = APIRouter(prefix="/notifications", tags=["notifications"])


class MessageEvent(BaseModel):
    platform: str
    client_name: str
    thread_id: str | None = None
    mode: str = "manual"


@router.post("/message")
async def record_message_event(
    body: MessageEvent,
    user_id: str = Depends(require_active_user),
):
    sb = get_supabase_optional()
    if sb:
        assert_platform_allowed(sb, user_id, body.platform)
        sb.table("message_events").insert({
            "user_id": user_id,
            "platform": body.platform,
            "client_name": body.client_name,
            "thread_id": body.thread_id,
        }).execute()
        link = sb.table("telegram_links").select("chat_id").eq("user_id", user_id).maybe_single().execute()
        if link.data and link.data.get("chat_id"):
            await notify_new_message(
                link.data["chat_id"],
                body.platform,
                body.client_name,
                body.mode,
            )
    return {"ok": True}
