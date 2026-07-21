"""Agent 1 pipeline — extract, draft, brief, stage (see docs/03-ai-pipeline.md)."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Literal

from app.config import settings
from app.services.ai.capabilities import SECTION_KINDS as CAP_SECTION_KINDS
from app.services.ai.capabilities import capabilities_prompt_block
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

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"

SECTION_KINDS = list(CAP_SECTION_KINDS)


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


async def call_claude(
    system: str,
    user: str,
    *,
    max_tokens: int = 1024,
    model: str | None = None,
    temperature: float | None = None,
) -> str:
    if not settings.anthropic_api_key:
        raise AIUnavailable("ANTHROPIC_API_KEY not configured")
    if not _anthropic_client:
        raise AIUnavailable("Anthropic client not installed")
    model_id = model or settings.anthropic_model
    kwargs: dict = {
        "model": model_id,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    if temperature is not None:
        kwargs["temperature"] = temperature
    try:
        msg = await _anthropic_client.messages.create(**kwargs)
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
        "out_of_scope_requests": [],
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
        elif k == "out_of_scope_requests" and isinstance(v, list):
            merged = list(out.get("out_of_scope_requests") or [])
            for item in v:
                if item and item not in merged:
                    merged.append(item)
            out["out_of_scope_requests"] = merged
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
        "open_questions (array of strings), out_of_scope_requests (array — things client asked for that we "
        "cannot build: WordPress, e-commerce, mobile apps, custom backends, etc.), "
        "budget, deadline, status (new|negotiating|deal|done), "
        "client_confirmed (boolean), notes. "
        "Merge with existing context; refine requirements and open_questions rather than replacing blindly. "
        f"Supported builds only: {capabilities_prompt_block()}"
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


def _load_prompt(name: str) -> str:
    path = PROMPTS_DIR / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def _extract_previous_replies(inbox_text: str, limit: int | None = None) -> list[str]:
    replies: list[str] = []
    for line in inbox_text.splitlines():
        if line.strip().startswith("You:"):
            replies.append(line.split(":", 1)[1].strip())
    if limit is not None:
        return replies[-limit:]
    return replies


_GREETING_OPENER = re.compile(
    r"^(hi|hey|hello|good\s+(morning|afternoon|evening))\b",
    re.I,
)
_BANNED_OPENERS = (
    "perfect",
    "great",
    "sounds good",
    "absolutely",
    "i'd love to",
    "i'd be happy to",
    "excellent",
    "wonderful",
)

_CMS_TERMS = re.compile(
    r"\b(wordpress|wix|shopify|webflow|squarespace|framer)\b",
    re.I,
)
_LEADING_GREETING = re.compile(
    r"^(?:hi|hey|hello|good\s+(?:morning|afternoon|evening))(?:\s+there)?[!.,\s]+",
    re.I,
)
_CORPORATE_PHRASES = re.compile(
    r"\b(?:i(?:'d| would) be happy to help|i specialize in|establish their online presence|"
    r"conversion-focused|professional business websites)\b",
    re.I,
)


def _reply_word_count(text: str) -> int:
    return len((text or "").split())


def _reply_has_question(text: str) -> bool:
    return "?" in (text or "")


def _reply_opener(text: str, words: int = 3) -> str:
    parts = (text or "").strip().split()
    return " ".join(parts[:words]).lower() if parts else ""


def _last_client_message(inbox_text: str) -> str:
    last = ""
    for line in (inbox_text or "").splitlines():
        if line.strip().startswith("Client:"):
            last = line.split(":", 1)[1].strip()
    return last


def _sanitize_persona_text(text: str) -> str:
    """Strip CMS terms and conflicting instructions from persona fields."""
    out = _CMS_TERMS.sub("custom static sites", text or "")
    out = re.sub(
        r"\b(?:client first name|2-5 sentences|max 2 questions)\b",
        "",
        out,
        flags=re.I,
    )
    out = re.sub(r"\s{2,}", " ", out).strip(" ,;.")
    return out or "Keep replies short and natural."


def _polish_draft_reply(
    text: str,
    *,
    previous_replies: list[str],
    client_name: str | None,
    inbox_text: str,
) -> str:
    """Deterministic cleanup when the model ignores humanization rules."""
    out = (text or "").strip()
    if not out:
        return out

    out = _CMS_TERMS.sub("custom static sites", out)
    out = _CORPORATE_PHRASES.sub("", out)
    out = re.sub(r"\s{2,}", " ", out).strip()

    if previous_replies:
        out = _LEADING_GREETING.sub("", out).strip()
        if client_name:
            name = client_name.strip()
            if name and sum(1 for r in previous_replies if name.lower() in r.lower()) >= 1:
                out = re.sub(re.escape(name), "", out, flags=re.I).strip()
                out = re.sub(r"^,\s*", "", out)

    recent = previous_replies[-2:]
    if recent and any(_reply_has_question(r) for r in recent) and _reply_has_question(out):
        sentences = re.split(r"(?<=[.!?])\s+", out)
        while sentences and _reply_has_question(sentences[-1]):
            sentences.pop()
        if sentences:
            out = " ".join(sentences).strip()
        else:
            out = re.sub(r"\?[^?]*$", "", out).strip()

    last_client = _last_client_message(inbox_text)
    client_words = _reply_word_count(last_client)
    max_words = max(12, client_words + 18) if client_words else 45
    if _reply_word_count(out) > max_words:
        sentences = re.split(r"(?<=[.!?])\s+", out)
        trimmed: list[str] = []
        total = 0
        for sentence in sentences:
            w = _reply_word_count(sentence)
            if total + w > max_words and trimmed:
                break
            trimmed.append(sentence)
            total += w
        if trimmed:
            out = " ".join(trimmed).strip()

    out = re.sub(r"\s{2,}", " ", out).strip()
    out = re.sub(r"^[,.\s]+", "", out)
    if out and out[0].islower():
        out = out[0].upper() + out[1:]
    return out


def _conversation_state(
    previous_replies: list[str],
    *,
    client_name: str | None = None,
    inbox_text: str = "",
) -> str:
    """Per-reply dynamic constraints to keep drafts human-like."""
    lines: list[str] = []

    if previous_replies:
        lines.append(
            "You already replied in this thread. Do NOT open with Hi, Hey, Hello, "
            "or the client's name."
        )
    else:
        lines.append(
            "First reply — one brief greeting is OK. Keep it natural, not corporate."
        )

    if client_name and previous_replies:
        name_lower = client_name.strip().lower()
        if name_lower and sum(1 for r in previous_replies if name_lower in r.lower()) >= 1:
            lines.append(
                f"You already used the client's name ({client_name}). Do NOT use it again."
            )

    recent = previous_replies[-2:]
    if recent and any(_reply_has_question(r) for r in recent):
        lines.append(
            "Your last reply included a question. This reply must NOT ask a question "
            "unless price or deadline acceptance is still unanswered."
        )

    if previous_replies:
        last_lengths = [_reply_word_count(r) for r in previous_replies[-2:]]
        avg_len = sum(last_lengths) / len(last_lengths)
        if avg_len >= 35:
            lines.append(
                f"Your recent replies were ~{int(avg_len)} words. Make this reply noticeably shorter."
            )
        elif avg_len <= 12:
            lines.append(
                f"Your recent replies were ~{int(avg_len)} words. "
                "You may use 2–3 sentences if explaining scope or price."
            )
        else:
            last_len = _reply_word_count(previous_replies[-1])
            if last_len >= 25:
                lines.append("Keep this reply short — a sentence or two max.")
            elif last_len <= 10:
                lines.append(
                    "You can use 2–3 sentences if you're explaining scope or quoting price."
                )

    used_openers: list[str] = []
    for reply in previous_replies:
        opener = _reply_opener(reply)
        for banned in _BANNED_OPENERS:
            if opener.startswith(banned) or banned in opener[:24]:
                label = banned.replace("i'd", "I'd").title() if banned.startswith("i'") else banned.title()
                used_openers.append(label)

    if used_openers:
        unique = list(dict.fromkeys(used_openers))
        lines.append(f"Never start with any of these (already used): {', '.join(unique)}.")

    last_client = _last_client_message(inbox_text)
    if last_client:
        client_words = _reply_word_count(last_client)
        if client_words <= 12:
            lines.append(
                f"Client's last message was {client_words} words. "
                f"Keep your reply under {max(10, client_words + 15)} words."
            )
        if re.search(r"\b(profession|what do you do|who are you)\b", last_client, re.I):
            lines.append(
                "Client asked what you do. ONE short sentence: job title + what you build. "
                "No resume, no years of experience, no page-type list, no question."
            )

    return "THIS REPLY — MANDATORY CONSTRAINTS\n" + "\n".join(f"- {line}" for line in lines)


def _persona_field(persona: dict, key: str, default: str = "") -> str:
    val = persona.get(key)
    if val is None:
        return default
    if isinstance(val, list):
        return ", ".join(str(x) for x in val if x) or default
    return str(val).strip() or default


def _draft_system(
    persona: dict,
    stage: str,
    platform: str | None = None,
    *,
    conversation_state: str = "",
) -> str:
    template = _load_prompt("agent1_draft.txt")
    if not template:
        tone = persona.get("tone") or "professional and friendly"
        return (
            f"You are a freelancer replying in a marketplace inbox. Tone: {tone}. "
            "Write ONE short reply in English only. "
            f"{capabilities_prompt_block()}"
        )
    platform_label = (platform or "marketplace").replace("_", " ").title()
    never_say = persona.get("never_say") or []
    if isinstance(never_say, list):
        never_say_str = ", ".join(str(x) for x in never_say if x) or "(none)"
    else:
        never_say_str = str(never_say)
    return template.format(
        full_name=_persona_field(persona, "full_name", _persona_field(persona, "agent_name", "Freelancer")),
        agent_name=_persona_field(persona, "agent_name", "Freelancer"),
        title=_sanitize_persona_text(_persona_field(persona, "title", "Web designer")),
        specialty=_sanitize_persona_text(_persona_field(persona, "specialty", "Static marketing websites")),
        tone=_persona_field(persona, "tone", "Friendly and professional"),
        experience_years=_persona_field(persona, "experience_years", "5"),
        location=_persona_field(persona, "location", "Remote"),
        always_do=_sanitize_persona_text(_persona_field(persona, "always_do", "Be clear and helpful")),
        never_say=never_say_str,
        stage=stage or "discovery",
        platform_label=platform_label,
        capabilities_block=capabilities_prompt_block(),
        conversation_state=conversation_state or "THIS REPLY — MANDATORY CONSTRAINTS\n- Write naturally.",
    )


def _mock_draft(persona: dict, project_json: dict, inbox_text: str) -> str:
    name = project_json.get("client_name") or "there"
    return (
        f"Hi {name}, thanks for reaching out! I'd love to help with your project. "
        "Could you share a bit more about your goals and timeline so I can give you an accurate quote?"
    )


async def draft(
    persona: dict,
    project_json: dict,
    inbox_text: str,
    *,
    stage: str = "discovery",
    platform: str | None = None,
) -> tuple[str, AIMode]:
    previous = _extract_previous_replies(inbox_text)
    conversation_state = _conversation_state(
        previous,
        client_name=project_json.get("client_name"),
        inbox_text=inbox_text,
    )
    user = json.dumps({
        "project": project_json,
        "conversation": inbox_text[:8000],
        "previous_replies": previous,
        "instruction": (
            "Do not repeat phrasing from previous_replies. "
            "Follow THIS REPLY constraints in the system prompt."
        ),
    })
    if not settings.anthropic_api_key:
        _ai_fallback_or_raise("draft")
        return _mock_draft(persona, project_json, inbox_text), "template"
    try:
        text = await call_claude(
            _draft_system(
                persona,
                stage,
                platform or project_json.get("platform"),
                conversation_state=conversation_state,
            ),
            user,
            temperature=0.9,
        )
        if _looks_like_json_reply(text):
            return _mock_draft(persona, project_json, inbox_text), "template"
        polished = _polish_draft_reply(
            text,
            previous_replies=previous,
            client_name=project_json.get("client_name"),
            inbox_text=inbox_text,
        )
        return polished or text, "live"
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


async def brief(
    project_json: dict,
    preview_slug: str | None,
    *,
    persona: dict | None = None,
    conversation: str | None = None,
) -> dict:
    if not settings.anthropic_api_key:
        _ai_fallback_or_raise("brief")
        return _mock_brief(project_json, preview_slug)
    sections = ", ".join(SECTION_KINDS)
    templates = "business, landing, restaurant, portfolio, event"
    system = (
        "Generate build_spec JSON for Agent 2. Keys: template ({templates}), "
        "site_name, tagline, sections (array of {{kind, content}}) OR pages (array with slug, title, sections), "
        "theme {{primary, accent, dark}}, contact {{email, phone, address}}. "
        f"Section kinds must be from: {sections}. "
        "Pick the best template for the business type. Use ALL relevant sections from the project requirements. "
        "Populate contact from project notes when available."
    ).format(templates=templates)
    persona_ctx = json.dumps(persona or {}, indent=0)[:2000]
    project_ctx = json.dumps({
        "project": project_json,
        "conversation_excerpt": (conversation or "")[:6000],
    }, indent=0)
    user = json.dumps({
        "project_context": project_ctx,
        "persona_context": persona_ctx,
        "preview_slug": preview_slug,
    })
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
