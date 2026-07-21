"""Extension thread processing — persist inbox log, run Agent 1, optional Agent 2."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from postgrest.exceptions import APIError

from app.db import first_row
from app.services.ai import pipeline as ai
from app.services.platform_limits import assert_platform_allowed
from app.services.telegram import notify_brief_ready, notify_new_client, notify_new_message

logger = logging.getLogger(__name__)

_CONVERSATION_TABLE_MISSING = "conversation_messages"
_THREAD_ID_NOTE_PREFIX = "gigster_thread:"


def _table_missing(exc: Exception) -> bool:
    msg = str(exc).lower()
    return _CONVERSATION_TABLE_MISSING in msg or "pgrst205" in msg


def _thread_id_column_missing(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "thread_id" in msg and (
        "does not exist" in msg or "pgrst204" in msg or "could not find" in msg
    )


def _normalize_text(text: str) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip().lower())
    t = re.sub(r"^a\s+", "", t)
    return t


_BOILERPLATE = re.compile(
    r"we have your back|share feedback|translate to english|has joined the conversation",
    re.I,
)
_DATE_IN_TEXT = re.compile(
    r"\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)",
    re.I,
)


def _is_blob(text: str) -> bool:
    if len(text) > 2000:
        return True
    if _BOILERPLATE.search(text) and len(text) > 300:
        return True
    if len(_DATE_IN_TEXT.findall(text)) >= 2:
        return True
    return False


def sanitize_thread_messages(messages: list[dict]) -> list[dict]:
    """Drop Fiverr noise, blobs, and duplicate lines before Agent 1 / Agent 2."""
    cleaned: list[dict] = []
    for msg in messages:
        text = (msg.get("text") or "").strip()
        if len(text) < 2:
            continue
        if _is_blob(text):
            continue
        if _BOILERPLATE.search(text) and len(text) > 200:
            continue
        role = _normalize_role(msg.get("role", "client"))
        cleaned.append(
            {"role": role, "text": text, "sent_at": msg.get("sent_at")}
        )

    seen: dict[tuple[str, str], int] = {}
    out: list[dict] = []
    for m in cleaned:
        key = (m["role"], _normalize_text(m["text"]))
        if key in seen:
            idx = seen[key]
            if m.get("sent_at") and not out[idx].get("sent_at"):
                out[idx] = m
            continue
        seen[key] = len(out)
        out.append(m)

    texts = [m["text"] for m in out]
    keep: list[dict] = []
    for i, m in enumerate(out):
        if any(
            i != j
            and m["text"] in texts[j]
            and len(texts[j]) > len(m["text"]) + 50
            for j in range(len(out))
        ):
            continue
        keep.append(m)
    return keep


def _normalize_role(raw: str) -> str:
    role = (raw or "client").strip().lower()
    if role in ("assistant", "seller", "me", "you", "freelancer"):
        return "assistant"
    return "client"


def save_conversation_messages(
    sb,
    user_id: str,
    platform: str,
    thread_id: str,
    messages: list[dict],
) -> int:
    try:
        existing = (
            sb.table("conversation_messages")
            .select("role, text, sent_at")
            .eq("user_id", user_id)
            .eq("platform", platform)
            .eq("thread_id", thread_id)
            .execute()
        )
    except APIError as exc:
        if _table_missing(exc):
            logger.warning(
                "conversation_messages table missing — run npm run db:extension"
            )
            return 0
        raise

    seen = {
        (r["role"], _normalize_text(r["text"]))
        for r in (existing.data or [])
    }

    rows: list[dict] = []
    for msg in sanitize_thread_messages(messages):
        text = (msg.get("text") or "").strip()
        if not text:
            continue
        role = _normalize_role(msg.get("role", "client"))
        sent_at = msg.get("sent_at")
        key = (role, _normalize_text(text))
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "user_id": user_id,
                "platform": platform,
                "thread_id": thread_id,
                "role": role,
                "text": text,
                "sent_at": sent_at,
            }
        )

    if rows:
        try:
            sb.table("conversation_messages").insert(rows).execute()
        except APIError as exc:
            if not _table_missing(exc):
                raise
            logger.warning(
                "conversation_messages table missing — run infra/supabase/migrations/20260629000007_extension_messages.sql"
            )
            return 0
    return len(rows)


def load_thread_messages(sb, user_id: str, platform: str, thread_id: str) -> list[dict]:
    try:
        res = (
            sb.table("conversation_messages")
            .select("role, text, sent_at, created_at")
            .eq("user_id", user_id)
            .eq("platform", platform)
            .eq("thread_id", thread_id)
            .execute()
        )
        rows = res.data or []
        rows.sort(
            key=lambda r: r.get("sent_at") or r.get("created_at") or "",
        )
        return sanitize_thread_messages(rows)
    except APIError as exc:
        if _table_missing(exc):
            logger.warning("conversation_messages not available — using request payload only")
            return []
        raise


def _normalize_client_username(raw: str | None) -> str | None:
    value = (raw or "").strip().lstrip("@")
    return value or None


def _patch_project_identity(
    sb,
    project: dict,
    *,
    client_name: str,
    client_username: str | None,
) -> dict:
    project_id = project["id"]
    updates: dict = {}
    project_json = dict(project.get("project_json") or {})

    if client_username and not project_json.get("client_username"):
        project_json["client_username"] = client_username
    if client_name and not project_json.get("client_name"):
        project_json["client_name"] = client_name
    if client_name and project.get("client_name") != client_name:
        updates["client_name"] = client_name
    if project_json != (project.get("project_json") or {}):
        updates["project_json"] = project_json

    if not updates:
        return project

    sb.table("projects").update(updates).eq("id", project_id).execute()
    return {**project, **updates}


def get_or_create_project(
    sb,
    user_id: str,
    platform: str,
    thread_id: str,
    client_name: str,
    client_username: str | None = None,
) -> tuple[dict, bool]:
    row = None
    try:
        row = first_row(
            sb.table("projects")
            .select("*")
            .eq("user_id", user_id)
            .eq("platform", platform)
            .eq("thread_id", thread_id)
            .limit(1)
            .execute()
        )
    except APIError as exc:
        if not _thread_id_column_missing(exc):
            raise

    if not row:
        candidates = (
            sb.table("projects")
            .select("*")
            .eq("user_id", user_id)
            .eq("platform", platform)
            .eq("client_name", client_name)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        note = f"{_THREAD_ID_NOTE_PREFIX}{thread_id}"
        for candidate in candidates.data or []:
            pj = candidate.get("project_json") or {}
            if pj.get("_thread_id") == thread_id or pj.get("notes") == note:
                row = candidate
                break

    if row:
        return (
            _patch_project_identity(
                sb,
                row,
                client_name=client_name,
                client_username=client_username,
            ),
            False,
        )

    assert_platform_allowed(sb, user_id, platform)
    project_json = ai.empty_project_json()
    project_json["_thread_id"] = thread_id
    project_json["notes"] = f"{_THREAD_ID_NOTE_PREFIX}{thread_id}"
    project_json["client_name"] = client_name
    if client_username:
        project_json["client_username"] = client_username

    payload = {
        "user_id": user_id,
        "platform": platform,
        "client_name": client_name,
        "status": "new",
        "project_json": project_json,
        "brief_score": 0,
        "thread_id": thread_id,
    }

    try:
        res = sb.table("projects").insert(payload).execute()
    except APIError as exc:
        if not _thread_id_column_missing(exc):
            raise
        payload.pop("thread_id", None)
        res = sb.table("projects").insert(payload).execute()

    data = res.data
    if isinstance(data, list) and data:
        return data[0], True
    if isinstance(data, dict):
        return data, True
    raise RuntimeError("Failed to create project")


def resolve_payment_state(sb, user_id: str, *, deal_ready: bool) -> bool:
    """Return whether the paid payoff is locked for this member.

    Freemium rule: Agent 1 drafting is free, but the first concluded deal flips
    the member into "must pay" mode. Admins and members with an active
    subscription are never locked. Records the first deal so the web profile can
    prompt for payment.
    """
    membership = (
        first_row(
            sb.table("users")
            .select("status, role, has_reached_deal")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        or {}
    )
    if membership.get("role") == "admin" or membership.get("status") == "active":
        return False

    has_reached_deal = bool(membership.get("has_reached_deal"))
    if deal_ready and not has_reached_deal:
        try:
            sb.table("users").update(
                {
                    "has_reached_deal": True,
                    "first_deal_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", user_id).execute()
            has_reached_deal = True
        except APIError:
            logger.warning(
                "could not flag has_reached_deal — run migration 20260710000009_free_tier.sql"
            )

    return has_reached_deal


async def process_thread(sb, user_id: str, body: dict) -> dict:
    platform = str(body.get("platform", "")).strip().lower()
    thread_id = str(body.get("thread_id", "")).strip()
    if not platform or not thread_id:
        raise ValueError("platform and thread_id are required")

    client_name = (body.get("client_name") or thread_id).strip()
    client_username = _normalize_client_username(body.get("client_username"))
    messages = list(body.get("messages") or [])
    mode = (body.get("mode") or "manual").strip().lower()
    sync_only = bool(body.get("sync_only"))

    pending_assistant = (body.get("pending_assistant_text") or "").strip()
    if pending_assistant:
        messages.append(
            {"role": "assistant", "text": pending_assistant, "sent_at": None}
        )

    assert_platform_allowed(sb, user_id, platform)
    inserted = save_conversation_messages(sb, user_id, platform, thread_id, messages)
    all_messages = load_thread_messages(sb, user_id, platform, thread_id)
    if not all_messages and messages:
        all_messages = sanitize_thread_messages(
            [
                {
                    "role": _normalize_role(m.get("role", "client")),
                    "text": (m.get("text") or "").strip(),
                    "sent_at": m.get("sent_at"),
                }
                for m in messages
                if (m.get("text") or "").strip()
            ]
        )
    inbox_text = ai.messages_to_inbox_text(all_messages)

    project, is_new_project = get_or_create_project(
        sb, user_id, platform, thread_id, client_name, client_username
    )
    project_id = project["id"]
    existing_json = project.get("project_json") or {}

    tg = first_row(
        sb.table("telegram_links")
        .select("chat_id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    chat_id = (tg or {}).get("chat_id")
    if is_new_project and chat_id:
        await notify_new_client(chat_id, platform, client_name)

    updated, extract_mode = await ai.extract(inbox_text, existing_json, platform=platform)
    if not updated.get("client_name"):
        updated["client_name"] = client_name
    if client_username and not updated.get("client_username"):
        updated["client_username"] = client_username
    if not updated.get("platform"):
        updated["platform"] = platform

    score = ai.compute_brief_score(updated)
    stage = await ai.detect_stage(inbox_text)
    updated = ai.apply_stage_to_project(updated, stage)

    sb.table("projects").update(
        {
            "project_json": updated,
            "brief_score": score,
            "status": updated.get("status") or project.get("status") or "new",
            "client_name": updated.get("client_name") or client_name,
        }
    ).eq("id", project_id).execute()

    readiness = ai.brief_readiness_details(updated, score)
    # Free until the first concluded deal; then lock the paid payoff.
    payment_required = resolve_payment_state(sb, user_id, deal_ready=readiness["ready"])

    if sync_only:
        return {
            "synced": True,
            "project_id": project_id,
            "brief_score": score,
            "stage": stage,
            "project_json": updated,
            "message_count": len(all_messages),
            "messages_inserted": inserted,
            "readiness": readiness,
            "payment_required": payment_required,
        }

    persona = (
        first_row(
            sb.table("agent_personas")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        or {}
    )

    draft_text, draft_mode = await ai.draft(
        persona,
        updated,
        inbox_text,
        stage=stage,
        platform=platform,
    )

    last_incoming = messages[-1] if messages else None
    if (
        chat_id
        and last_incoming
        and _normalize_role(last_incoming.get("role", "")) == "client"
        and not is_new_project
    ):
        await notify_new_message(chat_id, platform, client_name, mode)

    agent2_result = None
    if readiness["ready"] and not project.get("build_spec"):
        if chat_id:
            await notify_brief_ready(chat_id, platform, client_name)

    return {
        "draft": draft_text,
        "ai_mode": draft_mode if draft_mode == "live" else extract_mode,
        "project_id": project_id,
        "brief_score": score,
        "stage": stage,
        "readiness": readiness,
        "project_json": updated,
        "message_count": len(all_messages),
        "messages_inserted": inserted,
        "agent2": agent2_result,
        "is_new_project": is_new_project,
        "payment_required": payment_required,
        "awaiting_brief_decision": readiness["ready"]
        and not payment_required
        and not (updated.get("brief_decision") or existing_json.get("brief_decision")),
    }
