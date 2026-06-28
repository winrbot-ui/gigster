"""Telegram Bot API notifications."""

import httpx
from app.config import settings


async def send_telegram(chat_id: str, text: str) -> bool:
    if not settings.telegram_bot_token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={"chat_id": chat_id, "text": text})
        return resp.status_code == 200


async def notify_new_message(
    chat_id: str,
    platform: str,
    client_name: str,
    mode: str = "manual",
) -> bool:
    emoji = "🔔"
    text = f"{emoji} {platform.title()} — {client_name} — new message\nMode: {mode.title()}"
    return await send_telegram(chat_id, text)
