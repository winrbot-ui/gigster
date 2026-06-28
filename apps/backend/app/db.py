from __future__ import annotations

from functools import lru_cache
from supabase import create_client, Client
from app.config import settings


@lru_cache
def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase credentials not configured")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_optional() -> Client | None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return get_supabase()
