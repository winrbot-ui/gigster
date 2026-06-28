"""Few-shot example library — loaded from DB, injected server-side into Draft."""

from __future__ import annotations

from app.db import get_supabase_optional

# Dev fallback when DB has no rows
DEFAULT_EXAMPLES = [
    {
        "niche": "business",
        "client_msg": "I need a 5 page website for my consulting firm. Budget $800.",
        "good_reply": (
            "Hi John,\n\nThanks for reaching out — I'd love to help with your consulting site. "
            "A 5-page business site with a clean, professional look is right in my wheelhouse. "
            "Could you share your preferred style (modern/minimal vs. corporate) and whether you "
            "have logo/colors ready?\n\nBest,\nAlex"
        ),
        "bad_reply": (
            "As an AI assistant, I can build any website you need instantly for $50. "
            "I also do logos, e-commerce, and WordPress admin training."
        ),
    },
    {
        "niche": "landing",
        "client_msg": "Need a landing page for my new product launch next month.",
        "good_reply": (
            "Hi Sarah,\n\nA focused landing page for your launch sounds great. "
            "I typically deliver hero + features + contact within 2 weeks. "
            "What's the product and do you have copy or should we draft it together?\n\nBest,\nAlex"
        ),
        "bad_reply": "Sure, I can do anything — full e-commerce store with payment gateway by tomorrow.",
    },
]


def _format_examples(examples: list[dict]) -> str:
    blocks: list[str] = []
    for ex in examples[:5]:
        blocks.append(
            f"---\nNiche: {ex.get('niche', 'general')}\n"
            f"Client: {ex.get('client_msg', '')}\n"
            f"GOOD reply:\n{ex.get('good_reply', '')}\n"
            f"BAD reply (never write like this):\n{ex.get('bad_reply', '')}"
        )
    return "\n\n".join(blocks)


async def load_few_shots(niche: str | None = None) -> str:
    """Return formatted few-shot block for Draft prompt injection."""
    sb = get_supabase_optional()
    examples: list[dict] = []

    if sb:
        query = sb.table("few_shot_examples").select("*").limit(5)
        if niche:
            query = query.eq("niche", niche)
        result = query.execute()
        examples = result.data or []

    if not examples:
        filtered = [e for e in DEFAULT_EXAMPLES if not niche or e["niche"] == niche]
        examples = filtered or DEFAULT_EXAMPLES

    return _format_examples(examples)
