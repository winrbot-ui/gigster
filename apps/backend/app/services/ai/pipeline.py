"""AI pipeline — Extract, Draft, Brief, Stage detect. Prompts stay server-side."""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.config import settings
from app.services.ai.few_shots import load_few_shots
from app.services.ai.scoring import score_brief_readiness

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    path = PROMPTS_DIR / f"{name}.txt"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def _merge_project_json(existing: dict, extracted: dict) -> dict:
    """Merge Extract output into existing project_json without blind overwrites."""
    merged = {**existing, **extracted}
    for key in ("requirements", "open_questions"):
        old = existing.get(key) or []
        new = extracted.get(key) or []
        if isinstance(old, list) and isinstance(new, list):
            seen = {str(x).lower() for x in old}
            merged[key] = list(old) + [x for x in new if str(x).lower() not in seen]
    # Preserve confirmed status unless new evidence
    if existing.get("client_confirmed") and not extracted.get("client_confirmed"):
        merged["client_confirmed"] = True
    return merged


def _parse_json_response(raw: str) -> dict | None:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _mock_extract(ocr_text: str, existing: dict) -> dict:
    updated = {**existing}
    if ocr_text:
        updated.setdefault("requirements", [])
        lower = ocr_text.lower()
        if "website" in lower or "site" in lower:
            req = "5-page business site"
            if req not in updated["requirements"]:
                updated["requirements"].append(req)
        if "landing" in lower:
            req = "Landing page"
            if req not in updated["requirements"]:
                updated["requirements"].append(req)
        if "$" in ocr_text or "budget" in lower:
            import re as _re
            m = _re.search(r"\$[\d,]+", ocr_text)
            updated["budget"] = m.group(0) if m else updated.get("budget") or "Discussed in chat"
        if "week" in lower or "deadline" in lower or "month" in lower:
            updated["deadline"] = updated.get("deadline") or "Mentioned in conversation"
        updated["summary"] = updated.get("summary") or "Client wants a business website."
        if any(w in lower for w in ("yes", "proceed", "let's do it", "confirmed", "go ahead")):
            updated["client_confirmed"] = True
            updated["status"] = "deal"
        elif updated.get("status") == "new":
            updated["status"] = "negotiating"
    return updated


def _mock_draft(persona: dict, project_json: dict, ocr_text: str) -> str:
    name = persona.get("agent_name") or "Alex"
    client = project_json.get("client_name") or "there"
    never = persona.get("never_say") or []
    for phrase in never:
        if phrase.lower() in name.lower():
            name = "Alex"
    return (
        f"Hi {client},\n\n"
        f"Thanks for reaching out — this is {name}. "
        f"I'd love to help with your project. Could you share a bit more about "
        f"the pages and style you're looking for?\n\n"
        f"Best,\n{name}"
    )


def _mock_brief(project_json: dict, slug: str | None) -> dict:
    client = project_json.get("client_name") or "Client"
    preview = slug or client.lower().replace(" ", "-")
    return {
        "template": "business",
        "site_name": client,
        "tagline": project_json.get("summary") or "Professional services",
        "pages": [
            {
                "slug": "home",
                "title": "Home",
                "sections": [
                    {"kind": "hero", "content": {"headline": client, "cta": "Contact Us"}},
                    {"kind": "services", "content": {"items_count": 3}},
                    {"kind": "cta", "content": {"headline": "Ready to get started?"}},
                ],
            },
            {
                "slug": "about",
                "title": "About",
                "sections": [
                    {"kind": "about_story", "content": {"text": "Our story."}},
                    {"kind": "team", "content": {"members_count": 2}},
                ],
            },
            {
                "slug": "services",
                "title": "Services",
                "sections": [{"kind": "services", "content": {"items_count": 4}}],
            },
            {
                "slug": "contact",
                "title": "Contact",
                "sections": [
                    {
                        "kind": "contact_form",
                        "content": {"fields": ["name", "email", "message"]},
                    },
                    {"kind": "embed", "content": {"service": "google_maps"}},
                ],
            },
            {
                "slug": "faq",
                "title": "FAQ",
                "sections": [{"kind": "faq", "content": {"items": []}}],
            },
        ],
        "theme": {"primary": "#003366", "accent": "#c8a86a", "dark": True},
        "contact": {"email": None, "phone": None, "address": None},
        "_preview_slug": preview,
    }


async def call_claude(system: str, user: str) -> str:
    if not settings.anthropic_api_key:
        return user
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        block = msg.content[0]
        return block.text if hasattr(block, "text") else str(block)
    except Exception:
        return user


async def extract(ocr_text: str, existing: dict) -> dict:
    if not settings.anthropic_api_key:
        return _mock_extract(ocr_text, existing)
    system = _load_prompt("extract") or (
        "Extract structured project JSON from OCR text. Return valid JSON only."
    )
    user = json.dumps({"ocr": ocr_text, "existing": existing})
    raw = await call_claude(system, user)
    parsed = _parse_json_response(raw)
    if parsed:
        return _merge_project_json(existing, parsed)
    return _mock_extract(ocr_text, existing)


async def draft(persona: dict, project_json: dict, ocr_text: str) -> str:
    if not settings.anthropic_api_key:
        return _mock_draft(persona, project_json, ocr_text)

    niche = "business"
    summary = (project_json.get("summary") or "").lower()
    if "restaurant" in summary or "menu" in summary:
        niche = "restaurant"
    elif "landing" in summary:
        niche = "landing"

    few_shots = await load_few_shots(niche)
    base_prompt = _load_prompt("draft") or "Write a human freelancer reply."
    system = f"{base_prompt}\n\nFew-shot examples:\n{few_shots}"
    user = json.dumps({"persona": persona, "project": project_json, "ocr": ocr_text})
    return await call_claude(system, user)


async def brief(project_json: dict, slug: str | None) -> dict:
    if not settings.anthropic_api_key:
        return _mock_brief(project_json, slug)
    system = _load_prompt("brief") or "Generate build_spec JSON for Agent 2."
    user = json.dumps({"project": project_json, "slug": slug})
    raw = await call_claude(system, user)
    parsed = _parse_json_response(raw)
    if parsed:
        return parsed
    return _mock_brief(project_json, slug)


async def detect_stage(ocr_text: str) -> str:
    if not settings.openai_api_key:
        text = ocr_text.lower()
        if "budget" in text or "price" in text or "$" in text:
            return "propose"
        if any(w in text for w in ("confirm", "yes", "proceed", "go ahead")):
            return "confirm"
        if "?" in text:
            return "clarify"
        return "discovery"
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Classify freelance negotiation stage. Reply with ONE word only: "
                        "discovery, clarify, propose, confirm, or close."
                    ),
                },
                {"role": "user", "content": ocr_text[:4000]},
            ],
            max_tokens=10,
        )
        stage = (resp.choices[0].message.content or "discovery").strip().lower()
        valid = {"discovery", "clarify", "propose", "confirm", "close"}
        return stage if stage in valid else "discovery"
    except Exception:
        return "discovery"


def compute_brief_score(project_json: dict) -> int:
    score, _ = score_brief_readiness(project_json)
    return score


def brief_readiness_details(project_json: dict, brief_score: int | None = None) -> dict:
    score, missing = score_brief_readiness(project_json)
    if brief_score is not None:
        score = brief_score
    from app.services.ai.scoring import is_brief_ready

    return {
        "score": score,
        "missing": missing,
        "ready": is_brief_ready(project_json, score),
        "min_score": 85,
    }
