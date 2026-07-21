"""Validate build_spec schema and Agent 2 capabilities."""

from __future__ import annotations

import copy
import re

from app.services.ai.capabilities import (
    BLOCKER_PATTERNS,
    BUILD_TEMPLATES,
    SECTION_KINDS,
    detect_blockers as _detect_blockers_from_text,
)

_CMS_REPLACE = re.compile(
    r"\b(wordpress|wix|shopify|webflow|squarespace|framer)\b",
    re.I,
)


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
    """Collect metadata-only text for capability blockers.

    Marketing copy inside sections (FAQ, features, tokenomics, etc.) is allowed
    to mention industry terms. Blockers apply to site-level promises only.
    """
    parts: list[str] = [
        str(spec.get("site_name") or ""),
        str(spec.get("tagline") or ""),
        str(spec.get("summary") or ""),
    ]
    for page in spec.get("pages") or []:
        if isinstance(page, dict):
            parts.append(str(page.get("title") or ""))
            parts.append(str(page.get("slug") or ""))
    contact = spec.get("contact") or {}
    if isinstance(contact, dict):
        parts.extend(str(v) for v in contact.values() if v)
    return " ".join(parts)


def detect_blockers(spec: dict) -> list[str]:
    return _detect_blockers_from_text(_collect_text(spec))


def _sanitize_value(value):
    if isinstance(value, str):
        return _CMS_REPLACE.sub("custom static site", value)
    if isinstance(value, list):
        return [_sanitize_value(v) for v in value]
    if isinstance(value, dict):
        return {k: _sanitize_value(v) for k, v in value.items()}
    return value


def sanitize_build_spec(spec: dict) -> dict:
    """Replace CMS platform names in copy so validation/build does not fail on stale thread text."""
    if not isinstance(spec, dict):
        return spec
    out = copy.deepcopy(spec)
    for key in ("site_name", "tagline", "summary"):
        if isinstance(out.get(key), str):
            out[key] = _CMS_REPLACE.sub("custom static site", out[key])
    if isinstance(out.get("pages"), list):
        out["pages"] = _sanitize_value(out["pages"])
    if isinstance(out.get("sections"), list):
        out["sections"] = _sanitize_value(out["sections"])
    if isinstance(out.get("contact"), dict):
        out["contact"] = _sanitize_value(out["contact"])
    return out


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
