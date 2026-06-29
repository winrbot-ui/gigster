"""Validate build_spec schema and Agent 2 capabilities."""

from __future__ import annotations

import re

SECTION_KINDS = frozenset({
    "hero", "services", "about_story", "team", "contact_form", "cta",
    "faq", "pricing", "gallery", "testimonials", "menu", "embed", "blog_list",
})

BUILD_TEMPLATES = frozenset({"business", "landing", "restaurant"})

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


def _validate_sections(sections: list, label: str) -> tuple[bool, str]:
    if not isinstance(sections, list) or not sections:
        return False, f"No sections on {label}"
    for i, section in enumerate(sections):
        if not isinstance(section, dict):
            return False, f"Section {i} on {label} must be an object"
        kind = section.get("kind")
        if kind not in SECTION_KINDS:
            return False, f"Invalid section kind on {label}: {kind!r}"
        if "content" not in section:
            return False, f"Section {i} on {label} missing content"
    return True, "ok"


def _iter_sections(spec: dict) -> list[dict]:
    pages = spec.get("pages")
    if isinstance(pages, list) and pages:
        out: list[dict] = []
        for page in pages:
            if isinstance(page, dict):
                out.extend(page.get("sections") or [])
        return out
    return spec.get("sections") or []


def _collect_text(spec: dict) -> str:
    parts: list[str] = [
        str(spec.get("site_name") or ""),
        str(spec.get("tagline") or ""),
    ]
    for page in spec.get("pages") or []:
        if isinstance(page, dict):
            parts.append(str(page.get("title") or ""))
            parts.append(str(page.get("slug") or ""))
    for section in _iter_sections(spec):
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

    pages = spec.get("pages")
    if isinstance(pages, list) and pages:
        for i, page in enumerate(pages):
            if not isinstance(page, dict):
                return False, f"Page {i} must be an object"
            slug = page.get("slug")
            if not slug or not str(slug).strip():
                return False, f"Page {i} missing slug"
            ok, reason = _validate_sections(page.get("sections") or [], f"page {slug}")
            if not ok:
                return False, reason
    else:
        ok, reason = _validate_sections(spec.get("sections") or [], "site")
        if not ok:
            return False, reason

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
