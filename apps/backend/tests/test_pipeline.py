"""Unit and smoke tests for Agent 1 pipeline helpers."""

from __future__ import annotations

import pytest

from app.services.ai.pipeline import merge_project_json
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
