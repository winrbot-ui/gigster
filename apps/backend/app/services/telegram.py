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


async def notify_new_client(
    chat_id: str,
    platform: str,
    client_name: str,
) -> bool:
    text = (
        f"🆕 New client — {platform.title()} / {client_name}\n"
        "First contact detected. Gigster created a project and will draft replies."
    )
    return await send_telegram(chat_id, text)


async def notify_brief_ready(chat_id: str, platform: str, client_name: str) -> bool:
    text = (
        f"✅ Brief ready — {platform.title()} / {client_name}\n"
        "Choose build site, download brief, or both in the extension popup."
    )
    return await send_telegram(chat_id, text)


async def notify_site_ready(chat_id: str, client_name: str, preview_url: str) -> bool:
    text = f"🚀 Site ready for {client_name}\n{preview_url}"
    return await send_telegram(chat_id, text)
