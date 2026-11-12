"""Exact public search routes, with source-text access following library mode."""
from __future__ import annotations

from dataclasses import dataclass, replace
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote

MAX_MANIFEST_BYTES = 2 * 1024 * 1024
MAX_READING_MANIFEST_BYTES = 16 * 1024 * 1024


@dataclass(frozen=True)
class SearchPage:
    resource: str
    canonical: str
    redirect: bool = False
    document_canonical: str | None = None
    alternates: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True)
class _ReadingRoute:
    resource: str
    canonical: str
    full_html: str | None = None
    has_text: bool = False
    representation: str = "html"
    markdown_path: str | None = None
    markdown_url: str | None = None
    json_path: str | None = None
    json_url: str | None = None
    document_canonical: str | None = None
    shortcut: bool = False


@lru_cache(maxsize=4)
def _manifest(name: str, stamp: tuple, max_bytes: int = MAX_MANIFEST_BYTES) -> dict:
    path=Path(name)
    if stamp[-1] > max_bytes:
        return {}
    try:
        value=json.loads(path.read_text(encoding="utf-8"))
    except (OSError,ValueError):
        return {}
    return value if isinstance(value,dict) else {}


def _read(root: Path, name: str) -> dict:
    path=root/name
    try:
        stat=path.stat()
        if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
            return {}
        stamp=(stat.st_dev,stat.st_ino,stat.st_mtime_ns,stat.st_ctime_ns,stat.st_size)
        return _manifest(str(path),stamp)
    except OSError:
        return {}


def _component(value) -> bool:
    return (isinstance(value,str) and bool(value) and not value.startswith(".") and len(value)<=240
            and "/" not in value and "\\" not in value and not any(ord(char)<32 or ord(char)==127 for char in value))


@lru_cache(maxsize=4)
def _book_index(name: str, stamp: tuple) -> dict:
    """Compile exact book/chapter aliases once per generated manifest revision."""
    catalogue=_manifest(name,stamp)
    if catalogue.get("schema") != "care-book-search-pages/1":
        return {}
    routes={}
    def register(path,entry):
        # An ambiguous/corrupt manifest must never choose an arbitrary owner.
        if path in routes and routes[path]!=entry:
            routes[path]=None
        else:
            routes[path]=entry
    for kind in ("books","chapters"):
        items=catalogue.get(kind,[])
        if not isinstance(items,list):
            continue
        for item in items:
            if not isinstance(item,dict):
                continue
            slug=item.get("slug")
            if not _component(slug):
                continue
            if kind=="books":
                folder=f"books/{slug}/"
            else:
                book_slug=item.get("book_slug")
                if not _component(book_slug):
                    continue
                folder=f"books/{book_slug}/{slug}/"
            resource,canonical=item.get("path"),item.get("url")
            if not isinstance(canonical,str) or resource!=folder+"index.html":
                continue
            decoded=unquote(canonical)
            route_slug=item.get("route_slug")
            if route_slug is None:
                # Earlier deployments remain readable during the upgrade.
                if decoded!="/"+folder:
                    continue
            elif (not isinstance(route_slug,str) or not re.fullmatch(r"[a-z0-9]{1,224}",route_slug)
                  or decoded!=(f"/{route_slug}" if kind=="books" else f"/{route_slug}/{slug}/")):
                continue
            text=item.get("text_path") if kind=="chapters" else None
            if kind=="chapters" and text!=folder+"text.html":
                continue
            legacy="/"+folder
            aliases={legacy,legacy.rstrip("/"),"/"+resource,
                     decoded.rstrip("/"),decoded.rstrip("/")+"/",decoded.rstrip("/")+"/index.html"}
            declared=item.get("aliases",[])
            if not isinstance(declared,list) or any(not isinstance(alias,str) or unquote(alias) not in aliases for alias in declared):
                continue
            entry=(resource,text,canonical,decoded,bool(item.get("has_text")),False)
            for alias in aliases:
                register(alias,entry)
            if text:
                register("/"+text,(resource,text,canonical,decoded,bool(item.get("has_text")),True))
    return routes


def _book_routes(root: Path) -> dict:
    path=root/"books/manifest.json"
    try:
        stat=path.stat()
        if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
            return {}
        stamp=(stat.st_dev,stat.st_ino,stat.st_mtime_ns,stat.st_ctime_ns,stat.st_size)
        return _book_index(str(path),stamp)
    except OSError:
        return {}


@lru_cache(maxsize=4)
def _reading_index(name: str, stamp: tuple, book_name: str, book_stamp: tuple) -> dict:
    """Validate generated reading identities and compile exact routes once."""
    # Unit records include three exact representation paths; this generated
    # registry is larger than the book catalog, while remaining bounded.
    manifest = _manifest(name, stamp, MAX_READING_MANIFEST_BYTES)
    books = _manifest(book_name, book_stamp)
    source_digest = manifest.get("source_sha256")
    if (manifest.get("schema") != "care-reading-search-pages/1"
            or books.get("schema") != "care-book-search-pages/1"
            or not isinstance(source_digest, str) or not re.fullmatch(r"[a-f0-9]{64}", source_digest)
            or source_digest != books.get("source_sha256")):
        return {}
    book_routes = _book_index(book_name, book_stamp)
    identities = {}
    book_entries = books.get("books")
    if not isinstance(book_entries, list):
        return {}
    for book in book_entries:
        if not isinstance(book, dict):
            continue
        slug, route = book.get("slug"), book.get("route_slug")
        identity = (book.get("work_id"), book.get("reader_slug"), route)
        if (not _component(slug) or not _component(identity[0]) or not _component(identity[1])
                or not isinstance(route, str) or not re.fullmatch(r"[a-z0-9]{1,224}", route)
                or book.get("url") != "/" + route or book_routes.get("/" + route) is None):
            continue
        if slug in identities and identities[slug] != identity:
            identities[slug] = None
        else:
            identities[slug] = identity
    pages = manifest.get("pages")
    if not isinstance(pages, list):
        return {}
    routes = {}
    whole_book_counts = {}
    whole_books = {}
    def register(path, entry):
        if path in routes and routes[path] != entry:
            routes[path] = None
        else:
            routes[path] = entry
    for item in pages:
        if not isinstance(item, dict):
            continue
        book_slug, route = item.get("book_slug"), item.get("route_slug")
        identity = (item.get("work_id"), item.get("reader_slug"), route)
        if not _component(book_slug) or identities.get(book_slug) != identity:
            continue
        whole_book = (item.get("kind") == "reading" and isinstance(item.get("layer"), str)
                      and item["layer"].upper() == "WB")
        if whole_book:
            whole_book_counts[route] = whole_book_counts.get(route, 0) + 1
        canonical = item.get("url")
        if not isinstance(canonical, str):
            continue
        prefix = f"/{route}/readings/"
        if not canonical.startswith(prefix) or not canonical.endswith("/"):
            continue
        suffix = canonical[len(prefix):]
        components = suffix.rstrip("/").split("/") if suffix else []
        if any(not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,239}", part) for part in components):
            continue
        kind = item.get("kind")
        if (kind == "overview" and components or kind == "layer" and len(components) != 1
                or kind == "reading" and (len(components) != 2 or not _component(item.get("unit_id")))
                or kind not in ("overview", "layer", "reading")):
            continue
        if kind != "overview" and (not _component(item.get("layer"))
                or item.get("layer_slug") != components[0]):
            continue
        if kind != "overview" and item["layer"].upper() in {"CH", "CL", "MC", "WB", "NUMO"} and item["layer"].lower() != components[0]:
            continue
        if kind == "reading":
            unit_slug = item.get("unit_slug")
            identity_suffix = "-" + hashlib.sha256(item["unit_id"].encode()).hexdigest()[:12]
            if (unit_slug != components[1] or not unit_slug.endswith(identity_suffix)
                    or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,95}", unit_slug[:-len(identity_suffix)])):
                continue
        folder = f"books/{book_slug}/readings/" + suffix
        resource, text = item.get("path"), item.get("text_path")
        markdown, markdown_url = item.get("markdown_path"), item.get("markdown_url")
        json_path, json_url = item.get("json_path"), item.get("json_url")
        index_path, index_url = item.get("index_path"), item.get("index_url")
        has_text = item.get("has_text", False)
        if (resource != folder + "index.html" or not isinstance(has_text, bool)
                or text is not None and text != folder + "text.html"
                or has_text and (kind != "reading" or text is None)
                or (markdown is not None or markdown_url is not None)
                and (kind != "reading" or markdown != folder + "reading.md" or markdown_url != canonical + "reading.md")
                or (json_path is not None or json_url is not None)
                and (kind != "reading" or json_path != folder + "reading.json" or json_url != canonical + "reading.json")
                or (index_path is not None or index_url is not None)
                and (kind != "overview" or index_path != folder + "index.json" or index_url != canonical + "index.json")):
            continue
        entry = _ReadingRoute(resource, canonical, text, has_text, markdown_path=markdown,
                              markdown_url=markdown_url, json_path=json_path, json_url=json_url)
        if whole_book:
            whole_books[route] = entry
        aliases = {canonical, canonical.rstrip("/"), canonical + "index.html",
                   "/" + resource, "/" + folder, "/" + folder.rstrip("/")}
        for alias in aliases:
            register(alias, entry)
        if text:
            register("/" + text, replace(entry, representation="text"))
        if markdown:
            md_entry = replace(entry, representation="markdown")
            register("/" + markdown, md_entry)
            register(markdown_url, md_entry)
        if json_path:
            json_entry = replace(entry, representation="json")
            register("/" + json_path, json_entry)
            register(json_url, json_entry)
        if index_path:
            index_entry = _ReadingRoute(index_path, index_url, representation="index", document_canonical=canonical)
            register("/" + index_path, index_entry)
            register(index_url, index_entry)
    for route, entry in whole_books.items():
        # A summary is an exact alias of one saved whole-book reading. Incomplete
        # or ambiguous WB declarations cannot select a fallback reading.
        if (whole_book_counts[route] != 1 or not entry.has_text
                or not entry.markdown_path or not entry.json_path
                or routes.get(entry.markdown_url) != replace(entry, representation="markdown")
                or routes.get(entry.json_url) != replace(entry, representation="json")):
            continue
        register(f"/{route}/summary.md", replace(entry, representation="markdown", shortcut=True))
        register(f"/{route}/summary.json", replace(entry, representation="json", shortcut=True))
    return routes


def _reading_routes(root: Path) -> dict:
    names = (root / "books/readings-manifest.json", root / "books/manifest.json")
    stamps = []
    try:
        for path in names:
            stat = path.stat()
            if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
                return {}
            stamps.append((stat.st_dev, stat.st_ino, stat.st_mtime_ns, stat.st_ctime_ns, stat.st_size))
    except OSError:
        return {}
    return _reading_index(str(names[0]), stamps[0], str(names[1]), stamps[1])


def search_page(root: Path, request_path: str, *, full_text: bool) -> SearchPage | None:
    """Only generated reference routes become public, never a directory prefix."""
    if (not request_path.startswith("/") or "\\" in request_path or "//" in request_path
            or any(part in {".",".."} or part.startswith(".") for part in request_path.split("/") if part)):
        return None
    if request_path in {"/numogram/numogram.css","/books/books.css","/books/readings.css"}:
        return SearchPage(request_path[1:],request_path)
    if request_path=="/book-routes.json":
        return SearchPage("book-routes.json",request_path) if _read(root,"book-routes.json").get("schema")=="care-book-routes/1" else None
    if request_path.startswith("/numogram"):
        numogram=_read(root,"numogram/manifest.json")
        for item in numogram.get("pages",[]):
            if not isinstance(item,dict):
                continue
            canonical, resource=item.get("url"),item.get("path")
            if (not isinstance(canonical,str) or not canonical.startswith("/numogram/")
                    or not isinstance(resource,str) or resource != canonical[1:]+"index.html"):
                continue
            aliases={canonical.rstrip("/"),canonical,canonical+"index.html"}
            if request_path in aliases:
                return SearchPage(resource,canonical,request_path!=canonical)
        return None
    if request_path in {"/books","/books/","/books/index.html"} and (root/"books/index.html").is_file():
        return SearchPage("books/index.html","/books/",request_path!="/books/")
    first=request_path.strip("/").split("/",1)[0]
    if first in {"api","assets","data","native","search","server","tools","dist"}:
        return None
    if first!="books" and not re.fullmatch(r"[a-z0-9]+",first):
        return None
    decoded = unquote(request_path)
    components = decoded.strip("/").split("/")
    summary = (len(components) == 2 and components[1] in {"summary.md", "summary.json"}
               and decoded == f"/{components[0]}/{components[1]}")
    if (summary or (len(components) >= 2 and components[1] == "readings")
            or (first == "books" and len(components) >= 3 and components[2] == "readings")):
        entry = _reading_routes(root).get(decoded)
        if entry is None:
            return None
        if entry.representation == "text":
            return SearchPage(entry.full_html, entry.canonical, True) if full_text and entry.has_text else None
        alternates = tuple((url, kind) for url, kind in (
            (entry.markdown_url, "text/markdown"), (entry.json_url, "application/json")) if url and full_text and entry.has_text)
        if entry.representation in {"markdown", "json"}:
            if not full_text or not entry.has_text:
                return None
            resource, canonical = ((entry.markdown_path, entry.markdown_url) if entry.representation == "markdown"
                                   else (entry.json_path, entry.json_url))
            links = ((entry.canonical, "text/html"),) + tuple(link for link in alternates if link[0] != canonical)
            return SearchPage(resource, canonical, not entry.shortcut and request_path != canonical,
                              document_canonical=entry.canonical, alternates=links)
        if entry.representation == "index":
            return SearchPage(entry.resource, entry.canonical, request_path != entry.canonical,
                              document_canonical=entry.document_canonical, alternates=((entry.document_canonical, "text/html"),))
        selected = entry.full_html if entry.full_html and full_text and entry.has_text else entry.resource
        return SearchPage(selected, entry.canonical, request_path != entry.canonical,
                          document_canonical=entry.canonical, alternates=alternates)
    entry=_book_routes(root).get(unquote(request_path))
    if entry is None:
        return None
    resource,text,canonical,decoded,has_text,direct_text=entry
    if direct_text:
        return SearchPage(text,canonical,True) if full_text and has_text else None
    selected=text if text and full_text and has_text else resource
    return SearchPage(selected,canonical,request_path!=decoded)
