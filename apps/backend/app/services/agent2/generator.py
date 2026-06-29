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
    if template in ("business", "landing", "restaurant"):
        return template

    kinds = {s.get("kind") for s in _all_sections(spec) if isinstance(s, dict)}
    if "menu" in kinds:
        return "restaurant"
    page_count = len(spec.get("pages") or []) or len(_all_sections(spec))
    if page_count <= 1 and "hero" in kinds:
        return "landing"
    return "business"


def _enrich_section(section: dict, spec: dict) -> dict:
    kind = section.get("kind", "")
    content = dict(section.get("content") or {})
    if kind == "hero" and not content.get("headline"):
        content["headline"] = spec.get("site_name")
        content["subheadline"] = spec.get("tagline")
        content.setdefault("cta", "Get in touch")
    if kind == "services" and not content.get("items"):
        content["items"] = [
            {"title": "Consulting", "description": "Expert guidance tailored to your goals."},
            {"title": "Implementation", "description": "Reliable delivery from plan to launch."},
            {"title": "Support", "description": "Ongoing help after go-live."},
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


async def generate_site_spec(spec: dict) -> dict:
    """Call Claude to enrich section content; fall back to defaults offline."""
    spec = {**spec, "template": pick_template(spec)}
    if not settings.anthropic_api_key:
        return _default_enrich(spec)

    system = _load_prompt()
    user = json.dumps({"build_spec": spec})
    raw = await call_claude(system, user)
    parsed = _parse_json_response(raw)
    if parsed and isinstance(parsed, dict) and (parsed.get("sections") or parsed.get("pages")):
        parsed["template"] = pick_template(parsed)
        return parsed
    return _default_enrich(spec)
