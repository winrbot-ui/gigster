from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from app.config import settings
from app.db import get_supabase_optional

security = HTTPBearer(auto_error=False)


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
        sb = get_supabase_optional()
        if sb:
            user = sb.auth.get_user(token)
            if user and user.user:
                return user.user.id
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth not configured")
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc


async def require_active_user(user_id: str = Depends(get_current_user_id)) -> str:
    sb = get_supabase_optional()
    if not sb:
        return user_id
    row = sb.table("users").select("status").eq("id", user_id).single().execute()
    if not row.data or row.data.get("status") != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Active subscription required")
    return user_id
