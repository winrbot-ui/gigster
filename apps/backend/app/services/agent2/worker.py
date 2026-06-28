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
from app.services.agent2.validate import validate_build_spec

logger = logging.getLogger(__name__)


def _sanitize_slug(raw: str | None, project_id: str, client_name: str) -> str:
    if raw:
        slug = re.sub(r"[^a-z0-9-]", "-", raw.lower()).strip("-")
        if slug:
            return slug[:63]
    return slugify(client_name or "preview", project_id)


async def run_agent2(project_id: str) -> dict:
    sb = get_supabase_optional()
    if not sb:
        return {"ok": False, "error": "Database not configured"}

    proj = sb.table("projects").select("*").eq("id", project_id).single().execute()
    if not proj.data:
        return {"ok": False, "error": "Project not found"}

    spec = proj.data.get("build_spec")
    if not spec:
        return {"ok": False, "error": "No build_spec"}

    valid, reason = validate_build_spec(spec)
    if not valid:
        sb.table("projects").update({"agent2_status": "failed"}).eq("id", project_id).execute()
        return {"ok": False, "error": reason}

    sb.table("projects").update({"agent2_status": "building"}).eq("id", project_id).execute()

    try:
        spec["template"] = pick_template(spec)
        enriched = await generate_site_spec(spec)

        valid, reason = validate_build_spec(enriched)
        if not valid:
            sb.table("projects").update({"agent2_status": "failed"}).eq("id", project_id).execute()
            return {"ok": False, "error": f"Post-generate validation failed: {reason}"}

        dist_dir, build_error = build_site(enriched)
        if not dist_dir:
            sb.table("projects").update({"agent2_status": "failed"}).eq("id", project_id).execute()
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
            sb.table("projects").update({"agent2_status": "failed"}).eq("id", project_id).execute()
            return {"ok": False, "error": deploy_meta}

        sb.table("projects").update({
            "agent2_status": "ready",
            "preview_url": preview_url,
            "preview_slug": slug,
            "build_spec": enriched,
        }).eq("id", project_id).execute()

        return {
            "ok": True,
            "preview_url": preview_url,
            "preview_slug": slug,
            "template": enriched.get("template"),
            "deploy": deploy_meta,
        }
    except Exception as exc:
        logger.exception("Agent 2 failed for project %s", project_id)
        sb.table("projects").update({"agent2_status": "failed"}).eq("id", project_id).execute()
        return {"ok": False, "error": str(exc)}
