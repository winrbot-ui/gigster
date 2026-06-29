"""Transactional email via Resend (Gigster account notifications only)."""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"


async def send_email(to: str, subject: str, html: str) -> bool:
    if not settings.resend_api_key or not settings.resend_from:
        logger.info("Resend not configured — skipping email to %s: %s", to, subject)
        return False
    if not to:
        return False

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                RESEND_API,
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.resend_from,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
            )
        if resp.status_code not in (200, 201):
            logger.warning("Resend failed %s: %s", resp.status_code, resp.text[:300])
            return False
        return True
    except Exception:
        logger.exception("Resend error for %s", to)
        return False


async def send_membership_activated(to: str, username: str) -> bool:
    site = settings.site_url.rstrip("/")
    return await send_email(
        to,
        "Your Gigster account is live",
        f"""
        <p>Hi @{username},</p>
        <p>Your membership payment was verified. You now have full access to Gigster.</p>
        <p><a href="{site}/desktop">Download the Desktop app</a> and link Telegram for message alerts.</p>
        <p>Dashboard: <a href="{site}/dashboard">{site}/dashboard</a></p>
        """,
    )


async def send_membership_expiring_soon(to: str, username: str, expiry_date: str) -> bool:
    site = settings.site_url.rstrip("/")
    return await send_email(
        to,
        "Your Gigster access expires in 3 days",
        f"""
        <p>Hi @{username},</p>
        <p>Your Gigster membership expires on <strong>{expiry_date}</strong>.</p>
        <p>Renew at <a href="{site}/buy">{site}/buy</a> to keep Desktop app access and AI agents running.</p>
        """,
    )


async def send_membership_expired(to: str, username: str) -> bool:
    site = settings.site_url.rstrip("/")
    return await send_email(
        to,
        "Your Gigster access has expired",
        f"""
        <p>Hi @{username},</p>
        <p>Your 30-day membership has ended. Desktop monitoring and AI are paused until you renew.</p>
        <p>Renew at <a href="{site}/buy">{site}/buy</a></p>
        """,
    )


async def send_marketer_approved(to: str, username: str) -> bool:
    site = settings.site_url.rstrip("/")
    return await send_email(
        to,
        "Approved as Gigster marketer",
        f"""
        <p>Hi @{username},</p>
        <p>Your marketer application was approved. You now have unlimited invites and access to marketer stats.</p>
        <p>Open your <a href="{site}/marketer">marketer dashboard</a>.</p>
        """,
    )
