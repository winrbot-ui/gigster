#!/usr/bin/env python3
"""Export Chrome Web Store screenshots at exact required sizes (RGB, no alpha)."""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "release" / "store-upload"

SOURCES = {
    "gigster-fiverr-screenshot-1280x800.png": ROOT
    / "apps/extension-fiverr/store-assets/screenshot-1280x800.png",
    "gigster-freelancer-screenshot-1280x800.png": ROOT
    / "apps/extension-freelancer/store-assets/screenshot-1280x800.png",
}


def export_exact(src: Path, dst: Path, size: tuple[int, int]) -> None:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    tw, th = size
    scale = max(tw / w, th / h)
    nw, nh = int(w * scale), int(h * scale)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    img = img.crop((left, top, left + tw, top + th))
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, format="PNG", optimize=True)
    out = Image.open(dst)
    if out.size != size or out.mode != "RGB":
        raise RuntimeError(f"Bad export {dst}: {out.size} {out.mode}")
    print(f"OK {dst.name} -> {out.size} {out.mode}")


def main() -> None:
    for name, src in SOURCES.items():
        if not src.exists():
            print(f"Missing {src}", file=sys.stderr)
            raise SystemExit(1)
        export_exact(src, OUT / name, (1280, 800))
        stem = name.replace("1280x800", "640x400")
        export_exact(src, OUT / stem, (640, 400))

    for zip_name in ("gigster-fiverr.zip", "gigster-freelancer.zip"):
        z = ROOT / "release" / zip_name
        if z.exists():
            shutil.copy2(z, OUT / zip_name)
            print(f"Copied {zip_name}")

    print(f"\nUpload files from: {OUT}")


if __name__ == "__main__":
    main()
