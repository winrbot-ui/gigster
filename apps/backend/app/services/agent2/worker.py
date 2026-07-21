"""Agent 2 worker — validate → template → generate → build → deploy."""

from __future__ import annotations

import logging
import re
import shutil

from app.config import settings
from app.db import get_supabase_optional
from app.services.agent2.builder import build_site
from app.services.agent2.deploy import deploy_preview, ensure_wildcard_domain, slugify
from app.services.agent2.generator import generate_site_spec, pick_template
from app.services.agent2.validate import sanitize_build_spec, validate_build_spec

logger = logging.getLogger(__name__)


def _sanitize_slug(raw: str | None, project_id: str, client_name: str) -> str:
    if raw:
        slug = re.sub(r"[^a-z0-9-]", "-", raw.lower()).strip("-")
        if slug:
            return slug[:63]
    return slugify(client_name or "preview", project_id)


def _mark_agent2_failed(sb, project_id: str, project_json: dict, error: str) -> None:
    pj = dict(project_json or {})
    pj["agent2_last_error"] = str(error)[:500]
    sb.table("projects").update({
        "agent2_status": "failed",
        "project_json": pj,
    }).eq("id", project_id).execute()


def _mark_agent2_ready(
    sb,
    project_id: str,
    project_json: dict,
    *,
    preview_url: str,
    preview_slug: str,
    build_spec: dict,
) -> None:
    pj = dict(project_json or {})
    pj.pop("agent2_last_error", None)
    sb.table("projects").update({
        "agent2_status": "ready",
        "preview_url": preview_url,
        "preview_slug": preview_slug,
        "build_spec": build_spec,
        "project_json": pj,
    }).eq("id", project_id).execute()


async def run_agent2(project_id: str) -> dict:
    sb = get_supabase_optional()
    if not sb:
        return {"ok": False, "error": "Database not configured"}

    proj = sb.table("projects").select("*").eq("id", project_id).single().execute()
    if not proj.data:
        return {"ok": False, "error": "Project not found"}

    project_json = proj.data.get("project_json") or {}

    spec = proj.data.get("build_spec")
    if not spec:
        _mark_agent2_failed(sb, project_id, project_json, "No build_spec")
        return {"ok": False, "error": "No build_spec"}

    spec = sanitize_build_spec(spec)
    valid, reason = validate_build_spec(spec)
    if not valid:
        _mark_agent2_failed(sb, project_id, project_json, reason)
        return {"ok": False, "error": reason}

    sb.table("projects").update({"agent2_status": "building"}).eq("id", project_id).execute()

    try:
        spec["template"] = pick_template(spec)
        persona_row = (
            sb.table("agent_personas")
            .select("*")
            .eq("user_id", proj.data.get("user_id"))
            .maybe_single()
            .execute()
        )
        persona_data = {}
        if persona_row is not None and getattr(persona_row, "data", None):
            persona_data = persona_row.data or {}
        context = {
            "project_json": project_json,
            "persona": persona_data,
            "conversation": project_json.get("notes") or "",
        }
        enriched = await generate_site_spec(spec, context=context)
        enriched = sanitize_build_spec(enriched)

        valid, reason = validate_build_spec(enriched)
        if not valid:
            _mark_agent2_failed(sb, project_id, project_json, f"Post-generate validation failed: {reason}")
            return {"ok": False, "error": f"Post-generate validation failed: {reason}"}

        dist_dir, build_error = build_site(enriched)
        if not dist_dir:
            _mark_agent2_failed(sb, project_id, project_json, build_error)
            return {"ok": False, "error": build_error}

        slug = _sanitize_slug(
            proj.data.get("preview_slug") or enriched.get("_preview_slug"),
            project_id,
            proj.data.get("client_name") or enriched.get("site_name") or "preview",
        )

        if settings.vercel_token:
            await ensure_wildcard_domain()

        preview_url, deploy_meta = await deploy_preview(slug, dist_dir)
        shutil.rmtree(dist_dir.parent, ignore_errors=True)

        if not preview_url:
            _mark_agent2_failed(sb, project_id, project_json, deploy_meta)
            return {"ok": False, "error": deploy_meta}

        _mark_agent2_ready(
            sb,
            project_id,
            project_json,
            preview_url=preview_url,
            preview_slug=slug,
            build_spec=enriched,
        )

        return {
            "ok": True,
            "preview_url": preview_url,
            "preview_slug": slug,
            "template": enriched.get("template"),
            "deploy": deploy_meta,
        }
    except Exception as exc:
        logger.exception("Agent 2 failed for project %s", project_id)
        _mark_agent2_failed(sb, project_id, project_json, str(exc))
        return {"ok": False, "error": str(exc)}
