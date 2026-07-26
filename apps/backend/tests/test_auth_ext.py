"""Extension auth error parsing — Supabase often returns `msg`, not `error_description`."""

from __future__ import annotations

import httpx
import pytest
from fastapi import HTTPException

from app.routers import auth_ext


def test_auth_error_detail_uses_msg_without_double_json(monkeypatch):
    """Regression: calling res.json() twice on failure caused HTTP 500 on production."""

    class FakeResponse:
        status_code = 400

        @staticmethod
        def json():
            return {"msg": "Invalid login credentials", "error_code": "invalid_credentials"}

    async def fake_post(*_args, **_kwargs):
        return FakeResponse()

    monkeypatch.setattr(auth_ext.settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(auth_ext.settings, "supabase_anon_key", "anon-key")
    monkeypatch.setattr(auth_ext.httpx.AsyncClient, "post", fake_post)

    with pytest.raises(HTTPException) as exc:
        import asyncio

        asyncio.run(
            auth_ext.extension_login(
                auth_ext.ExtensionLoginRequest(identifier="user@example.com", password="wrong")
            )
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid login credentials"
