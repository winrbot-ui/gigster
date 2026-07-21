"""Tests for Agent 2 build_spec validation and capability blockers."""

from app.services.agent2.validate import detect_blockers, validate_build_spec

VALID_SPEC = {
    "template": "business",
    "site_name": "ILE Garage",
    "tagline": "Auto repair you can trust",
    "sections": [
        {"kind": "hero", "content": {"headline": "ILE Garage"}},
        {"kind": "services", "content": {"items": []}},
        {"kind": "contact_form", "content": {}},
    ],
    "theme": {"primary": "#003366", "accent": "#c8a86a", "dark": True},
    "contact": {"email": None, "phone": None, "address": None},
}


def test_valid_business_spec():
    ok, reason = validate_build_spec(VALID_SPEC)
    assert ok, reason


def test_portfolio_template_valid():
    spec = {**VALID_SPEC, "template": "portfolio", "sections": [
        {"kind": "hero", "content": {}},
        {"kind": "gallery", "content": {"images": []}},
        {"kind": "contact_form", "content": {}},
    ]}
    ok, reason = validate_build_spec(spec)
    assert ok, reason


def test_new_section_stats_valid():
    spec = {**VALID_SPEC, "sections": [
        {"kind": "hero", "content": {}},
        {"kind": "stats", "content": {"items": [{"value": "10+", "label": "Years"}]}},
        {"kind": "contact_form", "content": {}},
    ]}
    ok, reason = validate_build_spec(spec)
    assert ok, reason


def test_wordpress_blocker():
    spec = {
        **VALID_SPEC,
        "tagline": "We will build this on WordPress for you",
    }
    ok, reason = validate_build_spec(spec)
    assert not ok
    assert "wordpress" in reason.lower() or "blocker" in reason.lower()


def test_mobile_app_blocker():
    spec = {**VALID_SPEC, "summary": "Need a mobile app for iOS and Android"}
    blockers = detect_blockers(spec)
    assert any("mobile" in b.lower() for b in blockers)


def test_booking_embed_allowed():
    spec = {**VALID_SPEC, "sections": [
        {"kind": "hero", "content": {}},
        {"kind": "booking_embed", "content": {"url": "https://calendly.com/demo"}},
        {"kind": "contact_form", "content": {}},
    ]}
    ok, reason = validate_build_spec(spec)
    assert ok, reason


def test_payment_in_pricing_copy_allowed():
    spec = {
        **VALID_SPEC,
        "sections": [
            {"kind": "hero", "content": {}},
            {
                "kind": "pricing",
                "content": {
                    "items": [{"title": "Paint job", "price": "$800", "description": "Payment on completion"}],
                },
            },
            {"kind": "contact_form", "content": {}},
        ],
    }
    ok, reason = validate_build_spec(spec)
    assert ok, reason


def test_sanitize_build_spec_strips_wordpress():
    from app.services.agent2.validate import sanitize_build_spec

    spec = {**VALID_SPEC, "tagline": "WordPress site for garage"}
    cleaned = sanitize_build_spec(spec)
    ok, reason = validate_build_spec(cleaned)
    assert ok, reason
    assert "wordpress" not in cleaned["tagline"].lower()


def test_crypto_landing_marketing_copy_allowed():
    spec = {
        **VALID_SPEC,
        "template": "landing",
        "site_name": "KLOS",
        "tagline": "Crypto token launch landing page",
        "sections": [
            {"kind": "hero", "content": {"headline": "KLOS", "subheadline": "Web3 token launch"}},
            {"kind": "features", "content": {"items": [{"title": "Tokenomics", "description": "Roadmap and team"}]}},
            {"kind": "contact_form", "content": {}},
        ],
    }
    ok, reason = validate_build_spec(spec)
    assert ok, reason


def test_section_copy_blockers_not_scanned():
    spec = {
        **VALID_SPEC,
        "sections": [
            {
                "kind": "faq",
                "content": {
                    "items": [
                        {
                            "q": "Do you have a mobile app?",
                            "a": "No mobile app — this is a marketing site with user account info via email only.",
                        }
                    ]
                },
            },
            {"kind": "contact_form", "content": {}},
        ],
    }
    ok, reason = validate_build_spec(spec)
    assert ok, reason
