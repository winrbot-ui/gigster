from __future__ import annotations

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from app.config import settings
from app.db import get_supabase_optional, first_row
from app.services.subscriptions import subscription_is_live

security = HTTPBearer(auto_error=False)


async def _user_id_from_supabase_api(token: str) -> str | None:
    """Validate user JWT via Supabase Auth (no local JWT secret required)."""
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_anon_key,
                },
            )
        if res.status_code != 200:
            return None
        user_id = res.json().get("id")
        return str(user_id) if user_id else None
    except Exception:
        return None


async def get_current_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing authorization")
    token = creds.credentials
    try:
        if settings.supabase_jwt_secret:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
            return str(sub)

        user_id = await _user_id_from_supabase_api(token)
        if user_id:
            return user_id

        sb = get_supabase_optional()
        if sb:
            try:
                res = sb.auth.get_user(jwt=token)
                if res and getattr(res, "user", None):
                    return str(res.user.id)
            except Exception:
                pass

        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid token — configure SUPABASE_JWT_SECRET or Supabase Auth verification",
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            f"Invalid token: {exc}",
        ) from exc


async def require_active_user(user_id: str = Depends(get_current_user_id)) -> str:
    sb = get_supabase_optional()
    if not sb:
        return user_id
    row = first_row(
        sb.table("users")
        .select("status, role")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not row:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Active subscription required")
    if row.get("role") == "admin":
        return user_id
    if row.get("status") != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Active subscription required")

    sub = first_row(
        sb.table("subscriptions")
        .select("active, expires_at")
        .eq("user_id", user_id)
        .eq("active", True)
        .order("expires_at", desc=True)
        .limit(1)
        .execute()
    )
    if not subscription_is_live(sub):
        sb.table("subscriptions").update({"active": False}).eq("user_id", user_id).eq(
            "active", True
        ).execute()
        sb.table("users").update({"status": "expired"}).eq("id", user_id).execute()
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Subscription expired")
    return user_id
