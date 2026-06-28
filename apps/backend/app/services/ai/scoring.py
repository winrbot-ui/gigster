"""Brief readiness scoring — mirrors packages/shared-types scoreBriefReadiness."""

from __future__ import annotations

BRIEF_READINESS_MIN_SCORE = 85


def score_brief_readiness(project_json: dict) -> tuple[int, list[str]]:
    score = 0
    missing: list[str] = []

    if project_json.get("status") and project_json["status"] != "new":
        score += 15
    else:
        missing.append("Negotiation status")

    reqs = project_json.get("requirements") or []
    if len(reqs) >= 1:
        score += 15
    else:
        missing.append("Scope / pages")

    if project_json.get("summary"):
        score += 15
    else:
        missing.append("Design direction")

    if len(reqs) >= 2:
        score += 15
    else:
        missing.append("Features")

    if project_json.get("budget"):
        score += 15
    else:
        missing.append("Budget")

    if project_json.get("deadline"):
        score += 15
    else:
        missing.append("Deadline")

    if project_json.get("notes") or len(reqs) >= 1:
        score += 15
    else:
        missing.append("Content plan")

    if project_json.get("client_confirmed"):
        score += 10
    else:
        missing.append("Client confirmed")

    final = min(score, 100)
    return final, missing


def is_brief_ready(project_json: dict, brief_score: int | None = None) -> bool:
    score = brief_score if brief_score is not None else score_brief_readiness(project_json)[0]
    return (
        score >= BRIEF_READINESS_MIN_SCORE
        and project_json.get("status") == "deal"
        and bool(project_json.get("client_confirmed"))
    )
