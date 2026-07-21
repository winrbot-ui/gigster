"""Unit and smoke tests for Agent 1 pipeline helpers."""

from __future__ import annotations

import pytest

from app.services.ai.pipeline import (
    _conversation_state,
    _extract_previous_replies,
    _polish_draft_reply,
    _sanitize_persona_text,
    merge_project_json,
)
from app.services.ai.scoring import is_brief_ready, score_brief_readiness
from app.services.ext_threads import sanitize_thread_messages

GOLDEN_THREAD = [
    {"role": "client", "text": "Hi, I need a website for my consulting business."},
    {"role": "assistant", "text": "Happy to help! What pages do you need?"},
    {
        "role": "client",
        "text": "Home, services, about, contact form. Budget $800, need it in 2 weeks. Let's do it.",
    },
    {"role": "assistant", "text": "Perfect — I'll send a brief summary shortly."},
]

GOLDEN_PROJECT = {
    "client_name": "Sarah",
    "platform": "fiverr",
    "summary": "Consulting business website",
    "requirements": ["Home page", "Services", "About", "Contact form"],
    "open_questions": [],
    "budget": "$800",
    "deadline": "2 weeks",
    "status": "deal",
    "client_confirmed": True,
    "notes": "Content from client messages",
}


def test_sanitize_thread_messages_dedupes_and_drops_blobs():
    noisy = [
        {"role": "client", "text": "Hello"},
        {"role": "client", "text": "Hello"},
        {"role": "client", "text": "x" * 2500},
    ]
    out = sanitize_thread_messages(noisy)
    assert len(out) == 1
    assert out[0]["text"] == "Hello"


def test_sanitize_golden_thread_keeps_order():
    out = sanitize_thread_messages(GOLDEN_THREAD)
    assert len(out) == 4
    assert out[0]["role"] == "client"
    assert "consulting" in out[0]["text"].lower()


def test_score_brief_readiness_golden():
    score, missing = score_brief_readiness(GOLDEN_PROJECT)
    assert score >= 85
    assert missing == [] or "Client confirmed" not in missing


def test_is_brief_ready_golden():
    score, _ = score_brief_readiness(GOLDEN_PROJECT)
    assert is_brief_ready(GOLDEN_PROJECT, score)


def test_merge_project_json_merges_requirements():
    base = {"requirements": ["Home page"], "status": "new"}
    extracted = {"requirements": ["Contact form"], "budget": "$500"}
    merged = merge_project_json(base, extracted)
    assert "Home page" in merged["requirements"]
    assert "Contact form" in merged["requirements"]
    assert merged["budget"] == "$500"
    assert merged["status"] == "new"


def test_golden_thread_e2e_scoring_smoke():
    """Smoke: sanitized golden thread + merged project reaches brief-ready bar."""
    messages = sanitize_thread_messages(GOLDEN_THREAD)
    assert len(messages) >= 3
    project = merge_project_json({}, GOLDEN_PROJECT)
    score, _ = score_brief_readiness(project)
    assert is_brief_ready(project, score)


DANIL_INBOX = """Client: Hello how are you?
You: Hi Danil! I'm doing great, thanks for reaching out! I'd love to help you with your project. What kind of website are you looking to build?
Client: Hey, I came here for that shit, how are you going to build my website?
You: I code it from scratch — clean static site, mobile-friendly, no WordPress or templates. What kind of business is it for?
Client: I love it, I'm an auto body shop, so I want to have a simple website, my name is CAT, so it should just be a simple website for an auto body shop, do what you think.
You: Auto body shop — got it. I'll do a simple business site with services, a gallery, and contact form. Stock photos are fine unless you have your own.
Client: Put pictures from somewhere
You: Cool, I'll grab some stock shots for the gallery.
Client: Put any logo, it's no problem, just tell me how many days it will take and how much it will cost."""


def test_extract_previous_replies_returns_all():
    replies = _extract_previous_replies(DANIL_INBOX)
    assert len(replies) == 4
    assert "WordPress" not in replies[1] or "no WordPress" in replies[1]


def test_conversation_state_first_reply_allows_greeting():
    state = _conversation_state([], client_name="Danil")
    assert "First reply" in state
    assert "Do NOT open" not in state


def test_conversation_state_second_reply_blocks_greeting_and_name():
    previous = [
        "Hi Danil! I'm doing great, thanks for reaching out! What kind of website are you looking to build?",
    ]
    state = _conversation_state(previous, client_name="Danil")
    assert "Do NOT open with Hi, Hey, Hello" in state
    assert "Do NOT use it again" in state


def test_conversation_state_blocks_consecutive_questions():
    previous = [
        "Hi Danil! What kind of website are you looking to build?",
        "I code it from scratch — clean static site. What kind of business is it for?",
    ]
    state = _conversation_state(previous, client_name="Danil")
    assert "must NOT ask a question" in state


def test_conversation_state_danil_price_turn_suggests_shorter():
    previous = _extract_previous_replies(DANIL_INBOX)
    state = _conversation_state(previous, client_name="Danil")
    assert "MANDATORY CONSTRAINTS" in state
    assert "Do NOT open" in state


def test_sanitize_persona_text_strips_wordpress():
    raw = "WordPress, business sites, landing pages"
    assert "wordpress" not in _sanitize_persona_text(raw).lower()
    assert "custom static sites" in _sanitize_persona_text(raw).lower()


def test_polish_draft_strips_wordpress_and_question():
    bad = (
        "I'm a Small Business Website Developer specializing in WordPress sites, "
        "landing pages, and professional business websites. What kind of business are you in?"
    )
    previous = [
        "Hi! I'm doing well, thank you for reaching out! What type of site are you looking to build?",
    ]
    inbox = (
        "Client: Hello how are you?\n"
        f"You: {previous[0]}\n"
        "Client: What do you do, what is your profession?"
    )
    polished = _polish_draft_reply(
        bad,
        previous_replies=previous,
        client_name="Demo Client",
        inbox_text=inbox,
    )
    assert "wordpress" not in polished.lower()
    assert "?" not in polished


def test_conversation_state_profession_question():
    inbox = (
        "Client: Hello\n"
        "You: Hi there, what do you need?\n"
        "Client: What do you do, what is your profession?"
    )
    previous = _extract_previous_replies(inbox)
    state = _conversation_state(previous, inbox_text=inbox)
    assert "what you do" in state.lower() or "ONE short sentence" in state
