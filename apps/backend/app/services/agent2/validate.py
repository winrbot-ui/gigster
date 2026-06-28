"""Validate build_spec schema and Agent 2 capabilities."""

from __future__ import annotations

import re

SECTION_KINDS = frozenset({
    "hero", "services", "about_story", "team", "contact_form", "cta",
    "faq", "pricing", "gallery", "testimonials", "menu", "embed", "blog_list",
})

BUILD_TEMPLATES = frozenset({"business", "landing", "restaurant"})

# Capability blockers — features Agent 2 cannot build.
BLOCKER_PATTERNS = [
    re.compile(p, re.I)
    for p in (
        r"\blogin\b",
        r"\bsign[\s-]?up\b",
        r"\bauth(entication)?\b",
        r"\bdatabase\b",
        r"\buser[\s-]?account",
        r"\bpayment\b",
        r"\bcheckout\b",
        r"\be[\s-]?commerce\b",
        r"\bshopping[\s-]?cart\b",
        r"\breal[\s-]?time\b",
        r"\bwebsocket\b",
        r"\bcustom[\s-]?backend\b",
        r"\bapi[\s-]?endpoint\b",
    )
]


def _collect_text(spec: dict) -> str:
    parts: list[str] = [
        str(spec.get("site_name") or ""),
        str(spec.get("tagline") or ""),
    ]
    for section in spec.get("sections") or []:
        if isinstance(section, dict):
            parts.append(str(section.get("kind") or ""))
            content = section.get("content")
            if isinstance(content, dict):
                parts.extend(str(v) for v in content.values())
            elif content is not None:
                parts.append(str(content))
    contact = spec.get("contact") or {}
    if isinstance(contact, dict):
        parts.extend(str(v) for v in contact.values() if v)
    return " ".join(parts)


def detect_blockers(spec: dict) -> list[str]:
    text = _collect_text(spec)
    return [p.pattern for p in BLOCKER_PATTERNS if p.search(text)]


def validate_build_spec(spec: dict) -> tuple[bool, str]:
    if not isinstance(spec, dict):
        return False, "build_spec must be an object"

    template = spec.get("template")
    if template not in BUILD_TEMPLATES:
        return False, f"Invalid template: {template!r}"

    site_name = spec.get("site_name")
    if not site_name or not str(site_name).strip():
        return False, "Missing site_name"

    sections = spec.get("sections")
    if not isinstance(sections, list) or not sections:
        return False, "No sections"

    for i, section in enumerate(sections):
        if not isinstance(section, dict):
            return False, f"Section {i} must be an object"
        kind = section.get("kind")
        if kind not in SECTION_KINDS:
            return False, f"Invalid section kind: {kind!r}"
        if "content" not in section:
            return False, f"Section {i} missing content"

    theme = spec.get("theme")
    if theme is not None and not isinstance(theme, dict):
        return False, "theme must be an object"

    contact = spec.get("contact")
    if contact is not None and not isinstance(contact, dict):
        return False, "contact must be an object"

    blockers = detect_blockers(spec)
    if blockers:
        return False, f"Capability blockers: {', '.join(blockers[:3])}"

    return True, "ok"
