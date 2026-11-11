"""Exact public search routes, with source-text access following library mode."""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path
from urllib.parse import unquote


@dataclass(frozen=True)
class SearchPage:
    resource: str
    canonical: str
    redirect: bool = False


@lru_cache(maxsize=4)
def _manifest(name: str, stamp: tuple) -> dict:
    path=Path(name)
    if stamp[-1] > 2*1024*1024:
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


def search_page(root: Path, request_path: str, *, full_text: bool) -> SearchPage | None:
    """Only generated reference routes become public, never a directory prefix."""
    if (not request_path.startswith("/") or "\\" in request_path or "//" in request_path
            or any(part in {".",".."} or part.startswith(".") for part in request_path.split("/") if part)):
        return None
    if not request_path.startswith(("/books", "/numogram")):
        return None
    if request_path in {"/numogram/numogram.css","/books/books.css"}:
        return SearchPage(request_path[1:],request_path)
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
    if request_path in {"/books","/books/","/books/index.html"} and (root/"books/index.html").is_file():
        return SearchPage("books/index.html","/books/",request_path!="/books/")
    catalogue=_read(root,"books/manifest.json")
    if catalogue.get("schema") != "care-book-search-pages/1":
        return None
    for item in catalogue.get("books",[]):
        if not isinstance(item,dict):
            continue
        canonical,resource=item.get("url"),item.get("path")
        if not all(isinstance(value,str) for value in (canonical,resource)):
            continue
        # The generator may percent-encode non-Latin book names. Compare the
        # server-decoded path but keep the published canonical in redirects.
        decoded=unquote(canonical)
        slug=item.get("slug")
        if (not isinstance(slug,str) or any(part in {"", ".", ".."} for part in slug.split("/"))
                or "/" in slug or "\\" in slug or resource != f"books/{slug}/index.html"
                or decoded != f"/books/{slug}/"):
            continue
        if request_path in {decoded,decoded.rstrip("/"),"/"+resource}:
            # Opening a whole book always transfers its compact catalogue
            # shell. Original text has separate, bounded chapter URLs.
            return SearchPage(resource,canonical,request_path!=decoded)
    for item in catalogue.get("chapters",[]):
        if not isinstance(item,dict):
            continue
        canonical,resource,text=item.get("url"),item.get("path"),item.get("text_path")
        if not all(isinstance(value,str) for value in (canonical,resource,text)):
            continue
        book_slug,slug=item.get("book_slug"),item.get("slug")
        if any(not isinstance(value,str) or not value or value.startswith(".")
               or "/" in value or "\\" in value for value in (book_slug,slug)):
            continue
        folder=f"books/{book_slug}/{slug}/"
        decoded=unquote(canonical)
        if resource!=folder+"index.html" or text!=folder+"text.html" or decoded!="/"+folder:
            continue
        if request_path=="/"+text:
            return SearchPage(text,canonical,True) if full_text and item.get("has_text") else None
        if request_path in {decoded,decoded.rstrip("/"),"/"+resource}:
            selected=text if full_text and item.get("has_text") else resource
            return SearchPage(selected,canonical,request_path!=decoded)
    return None
