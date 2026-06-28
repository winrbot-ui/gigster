"""Deploy built static site to Vercel and assign slug.gigsterr.online alias."""

from __future__ import annotations

import base64
import hashlib
import logging
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

VERCEL_API = "https://api.vercel.com"


def _auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.vercel_token}"}


def _team_query() -> str:
    if settings.vercel_team_id:
        return f"?teamId={settings.vercel_team_id}"
    return ""


def _collect_files(dist_dir: Path) -> list[dict]:
    files: list[dict] = []
    for path in sorted(dist_dir.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(dist_dir).as_posix()
        raw = path.read_bytes()
        files.append({
            "file": rel,
            "data": base64.b64encode(raw).decode("ascii"),
            "encoding": "base64",
        })
    return files


async def ensure_wildcard_domain() -> dict:
    """
    Ensure the preview wildcard domain is registered on the Vercel team/project.
    Idempotent — safe to call before each deploy when token is configured.
    """
    if not settings.vercel_token:
        return {"ok": False, "skipped": True, "reason": "No VERCEL_TOKEN"}

    domain = settings.agent2_domain
    project = settings.vercel_agent2_project_name or "gigster-agent2-previews"
    headers = _auth_headers()

    async with httpx.AsyncClient(timeout=60) as client:
        # Register apex domain on team (wildcard *.domain is configured in Vercel UI / DNS)
        reg = await client.post(
            f"{VERCEL_API}/v5/domains{ _team_query()}",
            headers=headers,
            json={"name": domain},
        )
        registered = reg.status_code in (200, 201, 409)

        # Attach domain to project for alias assignment
        attach = await client.post(
            f"{VERCEL_API}/v9/projects/{project}/domains{ _team_query()}",
            headers=headers,
            json={"name": domain},
        )
        attached = attach.status_code in (200, 201, 409)

    return {
        "ok": registered or attached,
        "domain": domain,
        "wildcard": f"*.{domain}",
        "registered": registered,
        "attached": attached,
    }


async def deploy_preview(slug: str, dist_dir: Path) -> tuple[str | None, str]:
    """Upload dist/ to Vercel and assign {slug}.{agent2_domain} alias."""
    domain = settings.agent2_domain
    preview_url = f"https://{slug}.{domain}"

    if not settings.vercel_token:
        logger.info("VERCEL_TOKEN not set — returning preview URL pattern only")
        return preview_url, "local"

    files = _collect_files(dist_dir)
    if not files:
        return None, "No build output to deploy"

    project_name = settings.vercel_agent2_project_name or "gigster-agent2-previews"
    alias = f"{slug}.{domain}"
    headers = {**_auth_headers(), "Content-Type": "application/json"}

    payload = {
        "name": project_name,
        "files": files,
        "target": "production",
        "projectSettings": {
            "framework": None,
            "buildCommand": None,
            "outputDirectory": None,
        },
    }

    async with httpx.AsyncClient(timeout=120) as client:
        deploy_resp = await client.post(
            f"{VERCEL_API}/v13/deployments{ _team_query()}",
            headers=headers,
            json=payload,
        )
        if deploy_resp.status_code not in (200, 201):
            return None, f"Vercel deploy failed: {deploy_resp.status_code} {deploy_resp.text[:500]}"

        deployment = deploy_resp.json()
        deployment_id = deployment.get("id")
        if not deployment_id:
            return None, "Vercel deploy missing deployment id"

        alias_resp = await client.post(
            f"{VERCEL_API}/v2/deployments/{deployment_id}/aliases{ _team_query()}",
            headers=headers,
            json={"alias": alias},
        )
        if alias_resp.status_code not in (200, 201, 409):
            # Fallback: try assign-domain endpoint
            assign = await client.post(
                f"{VERCEL_API}/v10/projects/{project_name}/domains{ _team_query()}",
                headers=headers,
                json={"name": alias},
            )
            if assign.status_code not in (200, 201, 409):
                return None, f"Alias assignment failed: {alias_resp.text[:300]}"

    return preview_url, deployment_id


def slugify(name: str, project_id: str) -> str:
    """Produce a DNS-safe preview slug."""
    base = "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-")
    base = base[:40] or "preview"
    suffix = hashlib.sha256(project_id.encode()).hexdigest()[:6]
    slug = f"{base}-{suffix}".strip("-")
    return slug[:63]
