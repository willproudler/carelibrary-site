"""Stage reviewed browser files; never expose the checkout as a web root."""
from __future__ import annotations

import gzip
import hashlib
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_FILES = """
about.html auth.css auth.mjs boot.mjs brand-header.css care-about.mjs care-version.json
discover-atlas.css discover-atlas.mjs discover-book-picker.mjs
discover-experiments.css discover-experiments.mjs discover-field-reader.mjs
discover-reader.mjs discover-reference-viewer.mjs discover.css
favicon.ico favicon.svg index.html landing.mjs legacy-landing.mjs
library-boot.mjs library-core.mjs library-loader.mjs library-sort.mjs
library.css library.html llms.txt login.html login.mjs public-app.css public-app.mjs
native-draft-reader.mjs
numo-header-skin.css public-fields.mjs public-library.mjs public-reader-adapter.mjs quick-start.pdf
reading-workspace.mjs request-access.html request-access.mjs resource-loader.mjs
robots.txt saved-library.mjs saved-translations.mjs site.js site.webmanifest
site-settings.html site-settings.mjs
studio-workspace.css studio-workspace.mjs studio-editor-adapter.mjs study-sets.css study-sets.mjs
sitemap.xml styles.css welcome.html
ui-fonts-ofl.txt ui-icons-apache.txt web-workspace.css web-workspace.mjs
""".split()
ASSET_DIRECTORIES = ("assets", "data", "native")
ASSET_EXTENSIONS = {
    ".html", ".css", ".mjs", ".js", ".json", ".jsonpart", ".svg", ".ico",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff", ".woff2", ".ttf", ".otf",
}


def copy_browser_files(source: Path, destination: Path) -> None:
    """Fail on links/unknown files instead of accidentally shipping private data."""
    source = source.resolve(strict=True)
    if destination.is_symlink():
        raise ValueError("The build destination must not be a symbolic link.")
    destination = destination.resolve()
    if destination != source / "dist":
        raise ValueError("The production build must be staged in this checkout's dist directory.")
    paths = [source / name for name in ROOT_FILES]
    for name in ASSET_DIRECTORIES:
        directory = source / name
        if directory.is_symlink() or not directory.is_dir():
            raise ValueError(f"Invalid browser asset directory: {name}")
        for path in directory.rglob("*"):
            relative = path.relative_to(source)
            if path.is_symlink() or any(part.startswith(".") for part in relative.parts):
                raise ValueError(f"Unsafe browser asset: {relative}")
            if path.is_file():
                if path.suffix.lower() not in ASSET_EXTENSIONS:
                    raise ValueError(f"Unrecognized browser asset: {relative}")
                paths.append(path)
    for path in paths:
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Missing or unsafe browser file: {path.relative_to(source)}")
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir()
    for path in paths:
        target = destination / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)


def stamp_browser_modules(destination: Path) -> None:
    """Invalidate the new landing/auth/reader chains without rewriting exports."""
    digest = hashlib.sha256()
    for path in sorted(destination.rglob("*")):
        if path.is_file() and path.suffix in {".html", ".mjs", ".js", ".css"}:
            digest.update(str(path.relative_to(destination)).encode())
            digest.update(path.read_bytes())
    version = digest.hexdigest()[:16]
    pattern = re.compile(r"(?P<quote>['\"`])(?P<url>(?:\.{0,2}/)?[A-Za-z0-9_./-]+\.(?:mjs|js|css))(?:\?v=[A-Za-z0-9_.-]+)?(?P=quote)")
    for name in ROOT_FILES:
        path = destination / name
        if path.suffix not in {".html", ".mjs", ".js", ".css"}:
            continue
        def replace(match):
            url = match['url']
            target = (destination / url.lstrip('/')).resolve()
            if not target.is_relative_to(destination) or not target.is_file():
                return match.group(0)
            return f"{match['quote']}{url}?v={version}{match['quote']}"
        path.write_text(pattern.sub(replace, path.read_text()))


def build(source: Path) -> Path:
    source = source.resolve(strict=True)
    destination = source / "dist"
    copy_browser_files(source, destination)
    # These builders verify the existing public export, not the private library.
    subprocess.run([sys.executable, str(source / "tools/optimise-covers.py"), str(destination)], check=True)
    subprocess.run(["node", str(source / "tools/build-public-assets.mjs"), str(destination)], check=True)
    stamp_browser_modules(destination)
    for path in destination.rglob("*"):
        if path.is_file() and path.suffix in {".html", ".css", ".js", ".mjs", ".json", ".jsonpart", ".svg", ".txt", ".xml"}:
            contents = path.read_bytes()
            compressed = gzip.compress(contents, compresslevel=6, mtime=0)
            if len(compressed) < len(contents):
                path.with_name(path.name + ".gz").write_bytes(compressed)
    print("Production web root ready: dist (server source and private configuration excluded).")
    return destination


if __name__ == "__main__":
    build(Path(__file__).resolve().parents[1])
