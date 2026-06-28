"""npm install + build with retries."""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).resolve().parent / "templates" / "site-builder"
MAX_RETRIES = 3


def _run(cmd: list[str], cwd: Path) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300,
            shell=False,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, out
    except subprocess.TimeoutExpired:
        return 1, "Build timed out after 300s"
    except FileNotFoundError as exc:
        return 1, str(exc)


def build_site(spec: dict, retries: int = MAX_RETRIES) -> tuple[Path | None, str]:
    """Copy template, write site.json, npm install + build. Returns dist path or error."""
    last_error = "Unknown build error"

    for attempt in range(1, retries + 1):
        work_dir = Path(tempfile.mkdtemp(prefix="gigster-agent2-"))
        try:
            if not TEMPLATE_DIR.exists():
                return None, f"Template missing: {TEMPLATE_DIR}"

            shutil.copytree(TEMPLATE_DIR, work_dir, dirs_exist_ok=True)
            data_dir = work_dir / "data"
            data_dir.mkdir(exist_ok=True)
            (data_dir / "site.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")

            code, out = _run(["npm", "install", "--omit=dev"], work_dir)
            if code != 0:
                last_error = f"npm install failed (attempt {attempt}): {out[-2000:]}"
                logger.warning(last_error)
                shutil.rmtree(work_dir, ignore_errors=True)
                continue

            code, out = _run(["npm", "run", "build"], work_dir)
            dist = work_dir / "dist"
            if code != 0 or not (dist / "index.html").exists():
                last_error = f"npm run build failed (attempt {attempt}): {out[-2000:]}"
                logger.warning(last_error)
                shutil.rmtree(work_dir, ignore_errors=True)
                continue

            return dist, "ok"
        except Exception as exc:
            last_error = f"Build exception (attempt {attempt}): {exc}"
            logger.exception(last_error)
            shutil.rmtree(work_dir, ignore_errors=True)

    return None, last_error
