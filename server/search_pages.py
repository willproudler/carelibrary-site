"""Exact public search routes, with source-text access following library mode."""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path
import re
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


def search_page(root: Path, request_path: str, *, full_text: bool) -> SearchPage | None:
    """Only generated reference routes become public, never a directory prefix."""
    if (not request_path.startswith("/") or "\\" in request_path or "//" in request_path
            or any(part in {".",".."} or part.startswith(".") for part in request_path.split("/") if part)):
        return None
    if request_path in {"/numogram/numogram.css","/books/books.css"}:
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
    entry=_book_routes(root).get(unquote(request_path))
    if entry is None:
        return None
    resource,text,canonical,decoded,has_text,direct_text=entry
    if direct_text:
        return SearchPage(text,canonical,True) if full_text and has_text else None
    selected=text if text and full_text and has_text else resource
    return SearchPage(selected,canonical,request_path!=decoded)
