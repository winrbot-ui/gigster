"""Telegram Bot webhook: /start + link code → telegram_links.chat_id."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from app.config import settings
from app.db import get_supabase_optional
from app.services.telegram import send_telegram

router = APIRouter(prefix="/telegram", tags=["telegram"])

LINK_CODE_RE = re.compile(r"^[a-f0-9]{8}$", re.IGNORECASE)


def _webhook_secret() -> str:
    return settings.telegram_webhook_secret or settings.cron_secret


@router.post("/webhook/{secret}")
async def telegram_webhook(secret: str, request: Request):
    expected = _webhook_secret()
    if not expected or secret != expected:
        raise HTTPException(404, "Not found")
    if not settings.telegram_bot_token:
        raise HTTPException(503, "Telegram bot not configured")

    update = await request.json()
    message = update.get("message") or update.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id = str(message["chat"]["id"])
    text = (message.get("text") or "").strip()

    if text.startswith("/start"):
        await send_telegram(
            chat_id,
            "Welcome to Gigster.\n\n"
            "Paste your 8-character link code from gigster.website → Desktop app.",
        )
        return {"ok": True}

    code = text.lower().replace(" ", "")
    if not LINK_CODE_RE.match(code):
        await send_telegram(
            chat_id,
            "Send /start, then paste the 8-character code from your Desktop page.",
        )
        return {"ok": True}

    sb = get_supabase_optional()
    if not sb:
        await send_telegram(chat_id, "Server error — try again later.")
        return {"ok": True}

    row = (
        sb.table("telegram_links")
        .select("user_id, chat_id, linked_at")
        .eq("link_code", code)
        .maybe_single()
        .execute()
    )
    link = row.data
    if not link:
        await send_telegram(chat_id, "Invalid code. Copy it from gigster.website → Desktop.")
        return {"ok": True}

    existing = link.get("chat_id")
    if existing and str(existing) != chat_id:
        await send_telegram(chat_id, "This code is already linked to another Telegram account.")
        return {"ok": True}

    sb.table("telegram_links").update(
        {
            "chat_id": chat_id,
            "linked_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("user_id", link["user_id"]).execute()

    await send_telegram(
        chat_id,
        "Linked. You will receive message alarms when the Desktop app detects new client messages.",
    )
    return {"ok": True}
