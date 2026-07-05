from __future__ import annotations

from functools import lru_cache
from supabase import create_client, Client
from app.config import settings


@lru_cache
def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase credentials not configured")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def clear_supabase_cache() -> None:
    get_supabase.cache_clear()


def get_supabase_optional() -> Client | None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return get_supabase()


def first_row(response) -> dict | None:
    """Supabase execute() can return None; maybe_single() does when no row matches."""
    if response is None:
        return None
    data = getattr(response, "data", None)
    if isinstance(data, list):
        return data[0] if data else None
    if isinstance(data, dict):
        return data
    return None
