"""Claude generation step — enrich build_spec section content."""

from __future__ import annotations

import json
from pathlib import Path

from app.config import settings
from app.services.ai.pipeline import call_claude, _parse_json_response

PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "agent2_generate.txt"


def _load_prompt() -> str:
    if PROMPT_PATH.exists():
        return PROMPT_PATH.read_text(encoding="utf-8")
    return "Enrich build_spec JSON. Return valid JSON only."


def _all_sections(spec: dict) -> list:
    pages = spec.get("pages")
    if isinstance(pages, list) and pages:
        out = []
        for page in pages:
            if isinstance(page, dict):
                out.extend(page.get("sections") or [])
        return out
    return spec.get("sections") or []


def pick_template(spec: dict) -> str:
    """Return template id; prefer explicit template, infer from sections if needed."""
    template = spec.get("template")
    if template in ("business", "landing", "restaurant", "portfolio", "event"):
        return template

    kinds = {s.get("kind") for s in _all_sections(spec) if isinstance(s, dict)}
    if "menu" in kinds:
        return "restaurant"
    if kinds & {"gallery", "social_links"} and len(_all_sections(spec)) <= 6:
        return "portfolio"
    page_count = len(spec.get("pages") or []) or len(_all_sections(spec))
    if page_count <= 1 and "hero" in kinds:
        return "landing"
    if "process" in kinds and "booking_embed" in kinds:
        return "event"
    return "business"


def _enrich_section(section: dict, spec: dict) -> dict:
    kind = section.get("kind", "")
    content = dict(section.get("content") or {})
    site_name = spec.get("site_name") or "Welcome"
    tagline = spec.get("tagline") or ""
    if kind == "hero" and not content.get("headline"):
        content["headline"] = site_name
        content["subheadline"] = tagline
        content.setdefault("cta", "Get in touch")
    if kind == "services" and not content.get("items"):
        reqs = spec.get("_requirements") or []
        if reqs:
            content["items"] = [
                {"title": str(r)[:60], "description": f"Professional {str(r).lower()} for your business."}
                for r in reqs[:6]
            ]
        else:
            content["items"] = [
                {"title": "Core service", "description": tagline or "Tailored to your goals."},
            ]
    return {"kind": kind, "content": content}


def _default_enrich(spec: dict) -> dict:
    """Offline fallback when Claude is unavailable."""
    enriched = {**spec}
    enriched["template"] = pick_template(spec)

    pages = spec.get("pages")
    if isinstance(pages, list) and pages:
        enriched_pages = []
        for page in pages:
            if not isinstance(page, dict):
                continue
            enriched_pages.append({
                **page,
                "sections": [
                    _enrich_section(s, spec)
                    for s in (page.get("sections") or [])
                    if isinstance(s, dict)
                ],
            })
        enriched["pages"] = enriched_pages
        return enriched

    sections = [
        _enrich_section(s, spec)
        for s in (spec.get("sections") or [])
        if isinstance(s, dict)
    ]
    enriched["sections"] = sections
    return enriched


def _format_context(context: dict | None) -> tuple[str, str]:
    if not context:
        return "{}", "{}"
    project_json = context.get("project_json") or {}
    persona = context.get("persona") or {}
    conversation = context.get("conversation") or ""
    project_ctx = json.dumps({
        "client_name": project_json.get("client_name"),
        "summary": project_json.get("summary"),
        "requirements": project_json.get("requirements"),
        "budget": project_json.get("budget"),
        "deadline": project_json.get("deadline"),
        "notes": project_json.get("notes"),
        "platform": project_json.get("platform"),
        "contact_from_notes": project_json.get("notes"),
        "conversation_excerpt": conversation[:6000],
    }, indent=0)
    persona_ctx = json.dumps({
        "specialty": persona.get("specialty"),
        "title": persona.get("title"),
        "tone": persona.get("tone"),
    }, indent=0)
    return project_ctx, persona_ctx


async def generate_site_spec(spec: dict, context: dict | None = None) -> dict:
    """Call Claude to enrich section content; fall back to defaults offline."""
    spec = {**spec, "template": pick_template(spec)}
    if context and context.get("project_json"):
        reqs = context["project_json"].get("requirements") or []
        spec["_requirements"] = reqs

    if not settings.anthropic_api_key:
        return _default_enrich(spec)

    prompt_template = _load_prompt()
    project_ctx, persona_ctx = _format_context(context)
    system = prompt_template.format(
        project_context=project_ctx,
        persona_context=persona_ctx,
    )
    user = json.dumps({"build_spec": spec})
    raw = await call_claude(system, user, max_tokens=4096)
    parsed = _parse_json_response(raw)
    if parsed and isinstance(parsed, dict) and (parsed.get("sections") or parsed.get("pages")):
        parsed["template"] = pick_template(parsed)
        return parsed
    return _default_enrich(spec)
