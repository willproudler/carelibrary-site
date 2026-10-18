"""Create small web delivery copies. Original covers and public records stay intact."""
from __future__ import annotations

import hashlib
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

SOURCE_URL = re.compile(r"^\./assets/covers/[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp)$", re.IGNORECASE)


def cover_urls(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key == "cover_url" and child:
                yield child
            else:
                yield from cover_urls(child)
    elif isinstance(value, list):
        for child in value:
            yield from cover_urls(child)


def optimise(root: Path):
    root = root.resolve()
    data = json.loads((root / "data/library.json").read_text())
    destination = root / "assets/covers/web"
    destination.mkdir(parents=True, exist_ok=True)
    variants = {}
    original_bytes = 0
    delivery_bytes = 0
    for url in sorted(set(cover_urls(data))):
        if not isinstance(url, str) or not SOURCE_URL.fullmatch(url):
            raise ValueError(f"A cover is not a local published image: {url}")
        source = (root / url).resolve()
        if source.parent != (root / "assets/covers").resolve():
            raise ValueError("Cover paths must stay inside the published covers directory")
        original = source.read_bytes()
        with Image.open(io.BytesIO(original)) as opened:
            image = ImageOps.exif_transpose(opened)
            image.thumbnail((600, 600), Image.Resampling.LANCZOS)
            image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB")
            encoded = io.BytesIO()
            image.save(encoded, format="WEBP", quality=85, method=6, exact=True,
                       **({"icc_profile": opened.info["icc_profile"]} if opened.info.get("icc_profile") else {}))
            contents = encoded.getvalue()
            width, height = image.size
        sha256 = hashlib.sha256(contents).hexdigest()
        name = f"cover-{sha256[:24]}.webp"
        (destination / name).write_bytes(contents)
        variants[url] = {"url": f"./assets/covers/web/{name}", "source_sha256": hashlib.sha256(original).hexdigest(),
                         "sha256": sha256, "bytes": len(contents), "width": width, "height": height}
        original_bytes += len(original)
        delivery_bytes += len(contents)
    manifest = {"version": 1, "covers": variants}
    (root / "data/cover-variants.json").write_text(json.dumps(manifest, separators=(",", ":")) + "\n")
    reduction = 100 * (1 - delivery_bytes / original_bytes) if original_bytes else 0
    print(f"Prepared {len(variants)} covers: {original_bytes / 1024 / 1024:.2f} MB → {delivery_bytes / 1024:.1f} KB ({reduction:.1f}% smaller). Originals preserved.")
    return manifest


if __name__ == "__main__":
    optimise(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1])
