#!/usr/bin/env python3
"""Ensure Chrome Web Store screenshots are exactly 1280x800 RGB PNG."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    raise SystemExit(1)

TARGET = (1280, 800)
ROOT = Path(__file__).resolve().parents[1]


def fix(path: Path) -> None:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    tw, th = TARGET
    scale = max(tw / w, th / h)
    nw, nh = int(w * scale), int(h * scale)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    img = img.crop((left, top, left + tw, top + th))
    img.save(path, "PNG")
    out = Image.open(path)
    print(f"OK {path} -> {out.size} {out.mode}")


def main() -> None:
    for rel in (
        "apps/extension-fiverr/store-assets/screenshot-1280x800.png",
        "apps/extension-freelancer/store-assets/screenshot-1280x800.png",
    ):
        fix(ROOT / rel)


if __name__ == "__main__":
    main()
