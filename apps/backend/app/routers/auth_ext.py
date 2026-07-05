"""Extension login — same identifier rules as the web app (@nickname or email)."""

from __future__ import annotations

import re

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.db import first_row, get_supabase_optional

router = APIRouter(prefix="/auth", tags=["auth"])


class ExtensionLoginRequest(BaseModel):
    identifier: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


def _normalize_username(raw: str) -> str:
    return re.sub(r"[^a-z0-9_]", "", raw.strip().replace("@", "").lower())


@router.post("/extension-login")
async def extension_login(body: ExtensionLoginRequest):
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(503, "Auth not configured")

    identifier = body.identifier.strip()
    email = identifier

    if "@" not in identifier:
        sb = get_supabase_optional()
        if not sb:
            raise HTTPException(503, "Database not configured")
        username = _normalize_username(identifier)
        row = first_row(
            sb.table("users")
            .select("email, username, status")
            .eq("username", username)
            .limit(1)
            .execute()
        )
        if not row:
            raise HTTPException(401, "Account not found.")
        email = row["email"]

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            url,
            headers={
                "apikey": settings.supabase_anon_key,
                "Content-Type": "application/json",
            },
            json={"email": email, "password": body.password},
        )

    if res.status_code != 200:
        detail = res.json().get("error_description") or res.json().get("msg") or "Login failed"
        raise HTTPException(401, detail)

    data = res.json()
    sb = get_supabase_optional()
    profile = None
    if sb and data.get("user", {}).get("id"):
        profile = first_row(
            sb.table("users")
            .select("username, status, role")
            .eq("id", data["user"]["id"])
            .limit(1)
            .execute()
        )

    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "user": {
            "email": data.get("user", {}).get("email") or email,
            "username": (profile or {}).get("username"),
            "status": (profile or {}).get("status"),
            "role": (profile or {}).get("role"),
        },
    }


@router.post("/refresh")
async def refresh_token(body: RefreshTokenRequest):
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(503, "Auth not configured")

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/token?grant_type=refresh_token"
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            url,
            headers={
                "apikey": settings.supabase_anon_key,
                "Content-Type": "application/json",
            },
            json={"refresh_token": body.refresh_token},
        )

    if res.status_code != 200:
        detail = res.json().get("error_description") or res.json().get("msg") or "Refresh failed"
        raise HTTPException(401, detail)

    data = res.json()
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
    }
