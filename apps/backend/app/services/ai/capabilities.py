"""Agent capabilities — keep in sync with packages/shared-types/src/capabilities.ts"""

from __future__ import annotations

import re

# --- Offerings (5 core product types) ---
AGENT_OFFERINGS = [
    {
        "id": "business",
        "label": "Business website",
        "description": "Multi-page sites for local businesses and companies.",
        "template": "business",
    },
    {
        "id": "landing",
        "label": "Landing page",
        "description": "Single-page campaign or product pages.",
        "template": "landing",
    },
    {
        "id": "restaurant",
        "label": "Restaurant & café",
        "description": "Menu, gallery, hours, map, booking embed.",
        "template": "restaurant",
    },
    {
        "id": "portfolio",
        "label": "Portfolio & personal brand",
        "description": "Showcase sites for creatives and freelancers.",
        "template": "portfolio",
    },
    {
        "id": "event",
        "label": "Event & promo",
        "description": "Event pages with schedule, location, RSVP embed.",
        "template": "event",
    },
]

BUILD_TEMPLATES = frozenset(o["template"] for o in AGENT_OFFERINGS)

SECTION_KINDS = frozenset({
    "hero", "services", "about_story", "team", "contact_form", "cta", "faq",
    "pricing", "gallery", "testimonials", "menu", "embed", "blog_list",
    "stats", "features", "process", "video", "map", "hours", "social_links",
    "logos", "booking_embed", "newsletter",
})

# Blocker patterns — synced with CAPABILITY_BLOCKER_PATTERNS in shared-types
BLOCKER_PATTERN_STRINGS = [
    r"\bwordpress\b",
    r"\bwix\b",
    r"\bwebflow\b",
    r"\bshopify\b",
    r"\bwoocommerce\b",
    r"\bsquarespace\b",
    r"\bframer\s+(site|website|cms)\b",
    r"\be[\s-]?commerce\b",
    r"\bonline\s+store\b",
    r"\bshopping\s+cart\b",
    r"\bcheckout\b",
    r"\bpayment\s+(gateway|processing)\b",
    r"\bmobile\s+app\b",
    r"\bios\s+app\b",
    r"\bandroid\s+app\b",
    r"\bweb\s+app\b",
    r"\bsaas\b",
    r"\buser\s+account",
    r"\bmembership\s+portal\b",
    r"\bcustom\s+backend\b",
    r"\bapi\s+endpoint\b",
    r"\breal[\s-]?time\b",
    r"\bwebsocket\b",
    r"\bbooking\s+system\b",
    r"\breservation\s+system\b",
    r"\bblockchain\s+(platform|development|app)\b",
    r"\bsmart\s+contract\b",
    r"\bdapp\b",
    r"\bnft\s+(marketplace|minting|platform)\b",
]

BLOCKER_PATTERNS = [re.compile(p, re.I) for p in BLOCKER_PATTERN_STRINGS]

NON_CAPABILITIES_SUMMARY = [
    ("Platforms & CMS", "WordPress, Wix, Webflow, Shopify — we build custom static sites instead."),
    ("E-commerce", "No cart/checkout — pricing + contact form or link to existing store."),
    ("Applications", "No mobile/desktop/SaaS apps — mobile-friendly marketing sites only."),
    ("Backend", "No login, databases, or custom APIs."),
    ("Live features", "No real-time chat/forums — contact form, WhatsApp, Calendly embed."),
    ("Custom booking", "No proprietary booking engine — Calendly/Cal.com embed OK."),
    ("Marketing retainers", "Website delivery only — not SEO/ad/social management."),
]

IFRAME_ALLOWLIST = (
    "youtube.com", "youtu.be", "vimeo.com", "calendly.com", "cal.com",
    "google.com/maps", "maps.google.com", "open.spotify.com",
)


def capabilities_can_block() -> str:
    """Bullet list for Agent 1 system prompts — what we CAN build."""
    lines = ["WHAT YOU CAN BUILD (offer confidently):"]
    for o in AGENT_OFFERINGS:
        lines.append(f"- {o['label']}: {o['description']}")
    lines.append("")
    lines.append("Section types: hero, services, gallery, menu, FAQ, pricing, testimonials,")
    lines.append("stats, features, process, video, map, hours, social links, booking embed (Calendly), contact form.")
    return "\n".join(lines)


def capabilities_cannot_block() -> str:
    """Bullet list for Agent 1 — decline + alternative."""
    lines = ["WHAT YOU CANNOT BUILD (decline politely, always offer alternative):"]
    for group, msg in NON_CAPABILITIES_SUMMARY:
        lines.append(f"- {group}: {msg}")
    return "\n".join(lines)


def capabilities_prompt_block() -> str:
    return f"{capabilities_can_block()}\n\n{capabilities_cannot_block()}"


def detect_blockers(text: str) -> list[str]:
    return [p.pattern for p in BLOCKER_PATTERNS if p.search(text or "")]
