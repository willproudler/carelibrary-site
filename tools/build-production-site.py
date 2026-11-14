"""Stage reviewed browser files; never expose the checkout as a web root."""
from __future__ import annotations

import gzip
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path, PurePosixPath

ROOT_FILES = """
about.html about.css about-page.mjs about-live-panels.mjs auth.css auth.mjs boot.mjs book-routes.json brand-header.css care-about.mjs care-version.json
discover-atlas.css discover-atlas.mjs discover-book-picker.mjs
discover-experiments.css discover-experiments.mjs discover-field-reader.mjs
discover-reader.mjs discover-reference-viewer.mjs discover.css
favicon.ico favicon.svg index.html landing.mjs legacy-landing.mjs
library-boot.mjs library-core.mjs library-loader.mjs library-sort.mjs
library.css library.html llms.txt login.html login.mjs public-app.css public-app.mjs
native-draft-reader.mjs
seo-shell.css seo-shell.mjs
numo-header-skin.css public-fields.mjs public-library.mjs public-reader-adapter.mjs quick-start.pdf
reading-workspace.mjs request-access.html request-access.mjs resource-loader.mjs
robots.txt research-index.json saved-library.mjs saved-translations.mjs site.js site.webmanifest
site-settings.html site-settings.mjs
studio-workspace.css studio-workspace.mjs studio-editor-adapter.mjs study-sets.css study-sets.mjs
sitemap.xml styles.css welcome.html
ui-fonts-ofl.txt ui-icons-apache.txt web-workspace.css web-workspace.mjs
""".split()
ASSET_DIRECTORIES = ("assets", "data", "native", "numogram", "books")
ASSET_EXTENSIONS = {
    ".html", ".css", ".mjs", ".js", ".json", ".jsonpart", ".svg", ".ico",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff", ".woff2", ".ttf", ".otf",
}


def reading_text_assets(source: Path) -> set[str]:
    """Allow only text editions registered by the attested reading-page builder."""
    manifest = source / "books/readings-manifest.json"
    if not manifest.exists():
        return set()
    if (manifest.is_symlink() or not manifest.resolve().is_relative_to(source.resolve())
            or manifest.stat().st_size > 16 * 1024 * 1024):
        raise ValueError("Invalid reading-page manifest.")
    contents = json.loads(manifest.read_text(encoding="utf-8"))
    if contents.get("schema") != "care-reading-search-pages/1" or not isinstance(contents.get("pages"), list):
        raise ValueError("Invalid reading-page manifest.")
    approved = set()
    for entry in contents["pages"]:
        if not isinstance(entry, dict):
            continue
        for field, filename, label in (("markdown_path", "reading.md", "Markdown"),
                                       ("plaintext_path", "reading.txt", "plain text")):
            if entry.get(field) is None:
                continue
            parts = [entry.get(key) for key in ("book_slug", "layer_slug", "unit_slug")]
            if (entry.get("kind") != "reading" or any(not isinstance(part, str) or not part
                    or part.startswith(".") or PurePosixPath(part).parts != (part,) or "\\" in part
                    or any(ord(char) < 32 for char in part) for part in parts)):
                raise ValueError(f"Invalid registered reading {label}.")
            expected = f"books/{parts[0]}/readings/{parts[1]}/{parts[2]}/{filename}"
            if entry[field] != expected:
                raise ValueError(f"Invalid registered reading {label}.")
            approved.add(expected)
    return approved


def reading_markdown_assets(source: Path) -> set[str]:
    return {name for name in reading_text_assets(source) if name.endswith(".md")}


def copy_browser_files(source: Path, destination: Path) -> None:
    """Fail on links/unknown files instead of accidentally shipping private data."""
    source = source.resolve(strict=True)
    if destination.is_symlink():
        raise ValueError("The build destination must not be a symbolic link.")
    destination = destination.resolve()
    if destination != source / "dist":
        raise ValueError("The production build must be staged in this checkout's dist directory.")
    paths = [source / name for name in ROOT_FILES]
    reading_text = reading_text_assets(source)
    for name in ASSET_DIRECTORIES:
        directory = source / name
        if directory.is_symlink() or not directory.is_dir():
            raise ValueError(f"Invalid browser asset directory: {name}")
        for path in directory.rglob("*"):
            relative = path.relative_to(source)
            if path.is_symlink() or any(part.startswith(".") for part in relative.parts):
                raise ValueError(f"Unsafe browser asset: {relative}")
            if path.is_file():
                if path.suffix.lower() not in ASSET_EXTENSIONS and relative.as_posix() not in reading_text:
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
        if path.relative_to(source).as_posix() in reading_text:
            contents = path.read_bytes()
            compressed = gzip.compress(contents, compresslevel=6, mtime=0)
            if len(compressed) < len(contents):
                target.with_name(target.name + ".gz").write_bytes(compressed)


def stamp_browser_modules(destination: Path) -> None:
    """Invalidate the new landing/auth/reader chains without rewriting exports."""
    # Measure top-level website pages once, excluding embedded reader panes.
    beacon = """<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "d9231c975f5c4b69be1e6aff695cc977"}'></script><!-- End Cloudflare Web Analytics -->"""
    for path in destination.rglob("*.html"):
        relative = path.relative_to(destination)
        if relative.parts[0] == "native" or relative.as_posix() == "welcome.html":
            continue
        html = path.read_text(encoding="utf-8")
        if "static.cloudflareinsights.com/beacon.min.js" in html:
            continue
        # Compatibility redirects should count at their destination.
        if re.search(r"""<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b""", html, re.IGNORECASE):
            continue
        html = re.sub(r"</body\s*>", lambda match: beacon + "\n" + match.group(0),
                      html, count=1, flags=re.IGNORECASE)
        path.write_text(html, encoding="utf-8")
    digest = hashlib.sha256()
    for path in sorted(destination.rglob("*")):
        if path.is_file() and path.suffix in {".html", ".mjs", ".js", ".css"}:
            digest.update(str(path.relative_to(destination)).encode())
            digest.update(path.read_bytes())
    version = digest.hexdigest()[:16]
    pattern = re.compile(r"(?P<quote>['\"`])(?P<url>(?:\.{0,2}/)?[A-Za-z0-9_./-]+\.(?:mjs|js|css))(?:\?v=[A-Za-z0-9_.-]+)?(?P=quote)")
    for path in destination.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix not in {".html", ".mjs", ".js", ".css"}:
            continue
        def replace(match):
            url = match['url']
            target = ((destination / url.lstrip('/')) if url.startswith('/') else path.parent / url).resolve()
            if not target.is_relative_to(destination) or not target.is_file():
                return match.group(0)
            return f"{match['quote']}{url}?v={version}{match['quote']}"
        path.write_text(pattern.sub(replace, path.read_text()))


def build_search_pages(source: Path) -> None:
    # The builder is also loaded with importlib by release-boundary tests.
    # Resolve helper modules from this maintained tools directory in either mode.
    tools = str(Path(__file__).resolve().parent)
    if tools not in sys.path:
        sys.path.insert(0, tools)
    from search_index import build as build_search_index
    from ai_discovery import build as build_ai_discovery
    build_search_index(source)
    build_ai_discovery(source)


def build_about_page(destination: Path) -> None:
    # About consumes the catalogue generated by build-public-assets in dist.
    # Keep the maintained helper code outside the public web root.
    tools = str(Path(__file__).resolve().parent)
    if tools not in sys.path:
        sys.path.insert(0, tools)
    from prepare_about_page import build as prepare_about_page
    prepare_about_page(destination)


def build(source: Path) -> Path:
    source = source.resolve(strict=True)
    destination = source / "dist"
    build_search_pages(source)
    copy_browser_files(source, destination)
    # These builders verify the existing public export, not the private library.
    subprocess.run([sys.executable, str(source / "tools/optimise-covers.py"), str(destination)], check=True)
    subprocess.run(["node", str(source / "tools/build-public-assets.mjs"), str(destination)], check=True)
    build_about_page(destination)
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

