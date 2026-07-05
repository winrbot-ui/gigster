"""Agent 1 pipeline — extract, draft, brief, stage (see docs/03-ai-pipeline.md)."""
from __future__ import annotations

import json
import re
from typing import Literal

from app.config import settings
from app.services.ai.scoring import (
    BRIEF_READINESS_MIN_SCORE,
    is_brief_ready,
    score_brief_readiness,
)

try:
    import anthropic
except ImportError:
    anthropic = None  # type: ignore

_anthropic_client = (
    anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key) if anthropic and settings.anthropic_api_key else None
)

AIMode = Literal["live", "template"]

SECTION_KINDS = [
    "hero",
    "services",
    "about_story",
    "team",
    "contact_form",
    "cta",
    "faq",
    "pricing",
    "gallery",
    "testimonials",
    "menu",
    "embed",
    "blog_list",
]


class AIUnavailable(Exception):
    """Claude API unavailable, misconfigured, or returned unusable output."""


def _looks_like_json_reply(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return True
    if t.startswith("{") and t.endswith("}"):
        try:
            json.loads(t)
            return True
        except json.JSONDecodeError:
            return True
    return False


async def call_claude(system: str, user: str, *, max_tokens: int = 1024, model: str | None = None) -> str:
    if not settings.anthropic_api_key:
        raise AIUnavailable("ANTHROPIC_API_KEY not configured")
    if not _anthropic_client:
        raise AIUnavailable("Anthropic client not installed")
    model_id = model or settings.anthropic_model
    try:
        msg = await _anthropic_client.messages.create(
            model=model_id,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text.strip()
    except Exception as e:
        print(f"[AI] Claude error ({model_id}): {e}")
        raise AIUnavailable(str(e)) from e


def _parse_json_response(text: str) -> dict | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _empty_project_json() -> dict:
    return {
        "client_name": None,
        "client_username": None,
        "platform": None,
        "summary": None,
        "requirements": [],
        "open_questions": [],
        "budget": None,
        "deadline": None,
        "status": "new",
        "client_confirmed": False,
        "notes": None,
    }


def empty_project_json() -> dict:
    return _empty_project_json()


def _merge_project_json(existing: dict, extracted: dict) -> dict:
    out = {**_empty_project_json(), **(existing or {})}
    preserved = {
        k: out[k]
        for k in ("brief_decision", "_thread_id")
        if out.get(k) is not None
    }
    for k, v in extracted.items():
        if k in preserved:
            continue
        if k == "requirements" and isinstance(v, list):
            merged = list(out.get("requirements") or [])
            for item in v:
                if item and item not in merged:
                    merged.append(item)
            out["requirements"] = merged
        elif k == "open_questions" and isinstance(v, list):
            merged = list(out.get("open_questions") or [])
            for item in v:
                if item and item not in merged:
                    merged.append(item)
            out["open_questions"] = merged
        elif v is not None and v != "":
            out[k] = v
    out.update(preserved)
    return out


def merge_project_json(existing: dict, extracted: dict) -> dict:
    return _merge_project_json(existing, extracted)


def _mock_extract(inbox_text: str, existing: dict) -> dict:
    out = _merge_project_json(existing, {})
    if not out.get("client_name"):
        m = re.search(r"Client:\s*(\S+)", inbox_text)
        if m:
            out["client_name"] = m.group(1)
    if not out.get("summary"):
        out["summary"] = "Website project"
    if not out.get("requirements"):
        out["requirements"] = ["marketing website"]
    if not out.get("status"):
        out["status"] = "new"
    return out


def _apply_stage_to_project(project_json: dict, stage: str) -> dict:
    out = dict(project_json)
    if stage == "order":
        out["status"] = "deal"
        out["client_confirmed"] = True
    elif stage in ("negotiation", "discovery"):
        if out.get("status") not in ("deal", "done"):
            out["status"] = "negotiating"
    elif stage in ("delivery", "revision") and out.get("status") != "done":
        out["status"] = "deal"
    return out


def apply_stage_to_project(project_json: dict, stage: str) -> dict:
    return _apply_stage_to_project(project_json, stage)


def is_deal_signal(stage: str, project_json: dict) -> bool:
    """True when we should create a project row for this thread."""
    if project_json.get("client_confirmed"):
        return True
    if project_json.get("status") == "deal":
        return True
    if stage in ("negotiation", "order"):
        return True
    return False


def messages_to_inbox_text(messages: list[dict]) -> str:
    lines = []
    for m in messages:
        role = m.get("role", "client")
        label = "Client" if role == "client" else "You"
        text = (m.get("text") or "").strip()
        if text:
            lines.append(f"{label}: {text}")
    return "\n".join(lines)


def _ai_fallback_or_raise(context: str):
    if settings.ai_required:
        raise AIUnavailable(f"AI required for {context} but ANTHROPIC_API_KEY is missing or call failed")


async def extract(inbox_text: str, existing: dict, *, platform: str | None = None) -> tuple[dict, AIMode]:
    if not settings.anthropic_api_key:
        _ai_fallback_or_raise("extract")
        out = _mock_extract(inbox_text, existing)
        if platform:
            out["platform"] = platform
        return out, "template"
    system = (
        "Extract structured project fields from a freelancer marketplace inbox conversation. "
        "Return ONLY valid JSON with keys: client_name, platform, summary, requirements (array of strings), "
        "open_questions (array of strings), budget, deadline, status (new|negotiating|deal|done), "
        "client_confirmed (boolean), notes. "
        "Merge with existing context; refine requirements and open_questions rather than replacing blindly."
    )
    user = json.dumps({"existing": existing, "conversation": inbox_text[:12000]})
    try:
        raw = await call_claude(system, user, max_tokens=2048)
        parsed = _parse_json_response(raw)
        if parsed:
            out = _merge_project_json(existing, parsed)
            if platform and not out.get("platform"):
                out["platform"] = platform
            return out, "live"
    except AIUnavailable:
        _ai_fallback_or_raise("extract")
    out = _mock_extract(inbox_text, existing)
    if platform:
        out["platform"] = platform
    return out, "template"


def compute_brief_score(project_json: dict) -> int:
    return score_brief_readiness(project_json)[0]


def brief_readiness_details(project_json: dict, score: int | None = None) -> dict:
    s, missing = score_brief_readiness(project_json)
    if score is not None:
        s = score
    return {
        "score": s,
        "missing": missing,
        "ready": is_brief_ready(project_json, s),
        "min_score": BRIEF_READINESS_MIN_SCORE,
    }


def _draft_system(persona: dict) -> str:
    tone = persona.get("tone") or "professional and friendly"
    return (
        f"You are a freelancer replying in a marketplace inbox. Tone: {tone}. "
        "Write ONE short reply in English only (2-4 sentences). No markdown, no JSON. "
        "Scope guard: ONLY offer static marketing sites (hero, services, about, contact, FAQ, pricing, gallery, testimonials, menu, blog, embed). "
        "NEVER promise auth, databases, payments, checkout, user accounts, or custom backends. "
        "If out of scope, politely redirect to a supported static-site alternative."
    )


def _mock_draft(persona: dict, project_json: dict, inbox_text: str) -> str:
    name = project_json.get("client_name") or "there"
    return (
        f"Hi {name}, thanks for reaching out! I'd love to help with your project. "
        "Could you share a bit more about your goals and timeline so I can give you an accurate quote?"
    )


async def draft(persona: dict, project_json: dict, inbox_text: str) -> tuple[str, AIMode]:
    user = json.dumps({"persona": persona, "project": project_json, "conversation": inbox_text[:8000]})
    if not settings.anthropic_api_key:
        _ai_fallback_or_raise("draft")
        return _mock_draft(persona, project_json, inbox_text), "template"
    try:
        text = await call_claude(_draft_system(persona), user)
        if _looks_like_json_reply(text):
            return _mock_draft(persona, project_json, inbox_text), "template"
        return text, "live"
    except AIUnavailable:
        _ai_fallback_or_raise("draft")
        return _mock_draft(persona, project_json, inbox_text), "template"


def _mock_brief(project_json: dict, preview_slug: str | None) -> dict:
    slug = preview_slug or "preview"
    return {
        "template": "business",
        "site_name": project_json.get("client_name") or "Client Site",
        "tagline": project_json.get("summary") or "Your goals here",
        "sections": [
            {"kind": "hero", "content": {"headline": project_json.get("client_name") or "Welcome"}},
            {"kind": "services", "content": {"items": project_json.get("requirements") or []}},
            {"kind": "contact_form", "content": {}},
        ],
        "theme": {"primary": "#2563eb", "accent": "#7c3aed", "dark": True},
        "contact": {"email": None, "phone": None, "address": None},
        "_preview_slug": slug,
    }


async def brief(project_json: dict, preview_slug: str | None) -> dict:
    if not settings.anthropic_api_key:
        _ai_fallback_or_raise("brief")
        return _mock_brief(project_json, preview_slug)
    sections = ", ".join(SECTION_KINDS)
    system = (
        "Generate build_spec JSON for Agent 2. Keys: template (business|landing|restaurant), "
        "site_name, tagline, sections (array of {kind, content}), theme {primary, accent, dark}, "
        f"contact {{email, phone, address}}. Section kinds must be from: {sections}."
    )
    user = json.dumps({"project": project_json, "preview_slug": preview_slug})
    try:
        raw = await call_claude(system, user, max_tokens=4096)
        parsed = _parse_json_response(raw)
        if parsed:
            if preview_slug:
                parsed["_preview_slug"] = preview_slug
            return parsed
    except AIUnavailable:
        _ai_fallback_or_raise("brief")
    return _mock_brief(project_json, preview_slug)


def _mock_stage(inbox_text: str) -> str:
    lower = inbox_text.lower()
    if "order" in lower or "purchase" in lower or "let's do it" in lower or "sounds good" in lower:
        return "order"
    if "price" in lower or "budget" in lower or "$" in inbox_text:
        return "negotiation"
    if "?" in inbox_text:
        return "discovery"
    return "new"


async def detect_stage(inbox_text: str) -> str:
    stage, _ = await detect_stage_with_mode(inbox_text)
    return stage


async def detect_stage_with_mode(inbox_text: str) -> tuple[str, AIMode]:
    if not settings.anthropic_api_key:
        _ai_fallback_or_raise("stage")
        return _mock_stage(inbox_text), "template"
    system = "Classify inbox stage: new, discovery, negotiation, order, delivery, revision. Reply with one word only."
    stage_model = settings.anthropic_stage_model or settings.anthropic_model
    try:
        raw = await call_claude(system, inbox_text[:4000], max_tokens=32, model=stage_model)
        word = raw.strip().lower().split()[0] if raw.strip() else "new"
        if word in ("new", "discovery", "negotiation", "order", "delivery", "revision"):
            return word, "live"
    except AIUnavailable:
        _ai_fallback_or_raise("stage")
    return _mock_stage(inbox_text), "template"
