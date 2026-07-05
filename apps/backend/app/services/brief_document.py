"""Generate client-facing brief documents (Markdown + PDF)."""

from __future__ import annotations

import io
from datetime import datetime, timezone

from fpdf import FPDF


def project_to_markdown(project_json: dict, *, client_name: str | None = None) -> str:
    name = client_name or project_json.get("client_name") or "Client"
    platform = project_json.get("platform") or "marketplace"
    lines = [
        f"# Project brief — {name}",
        "",
        f"**Platform:** {platform.title()}",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
    ]

    if project_json.get("summary"):
        lines.extend(["## Summary", "", str(project_json["summary"]), ""])

    reqs = project_json.get("requirements") or []
    if reqs:
        lines.append("## Requirements")
        lines.append("")
        for item in reqs:
            lines.append(f"- {item}")
        lines.append("")

    if project_json.get("budget"):
        lines.extend(["## Budget", "", str(project_json["budget"]), ""])
    if project_json.get("deadline"):
        lines.extend(["## Deadline", "", str(project_json["deadline"]), ""])

    questions = project_json.get("open_questions") or []
    if questions:
        lines.append("## Open questions")
        lines.append("")
        for q in questions:
            lines.append(f"- {q}")
        lines.append("")

    if project_json.get("notes"):
        lines.extend(["## Notes", "", str(project_json["notes"]), ""])

    lines.append("---")
    lines.append("_Prepared by Gigster — for client review._")
    return "\n".join(lines)


def markdown_to_pdf_bytes(markdown: str) -> bytes:
    """Render a simple PDF from markdown plain text (headings stripped for layout)."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)

    for raw_line in markdown.splitlines():
        line = raw_line.rstrip()
        if not line:
            pdf.ln(4)
            continue
        if line.startswith("# "):
            pdf.set_font("Helvetica", "B", 16)
            pdf.multi_cell(0, 8, line[2:])
            pdf.set_font("Helvetica", size=11)
            continue
        if line.startswith("## "):
            pdf.set_font("Helvetica", "B", 13)
            pdf.multi_cell(0, 7, line[3:])
            pdf.set_font("Helvetica", size=11)
            continue
        if line.startswith("- "):
            pdf.multi_cell(0, 6, f"  • {line[2:]}")
            continue
        if line.startswith("**") and line.endswith("**"):
            pdf.set_font("Helvetica", "B", 11)
            pdf.multi_cell(0, 6, line.strip("*"))
            pdf.set_font("Helvetica", size=11)
            continue
        pdf.multi_cell(0, 6, line)

    out = io.BytesIO()
    pdf.output(out)
    return out.getvalue()
