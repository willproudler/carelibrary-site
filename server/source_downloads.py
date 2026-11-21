"""Exact source-asset declarations shared by the production stager and web routes."""
from __future__ import annotations

import re
from pathlib import PurePosixPath

TYPES = {
    "txt": "text/plain",
    "md": "text/markdown",
    "epub": "application/epub+zip",
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_BYTES = 128 * 1024 * 1024


def download_records(book):
    """Return (file record, canonical edition, suggested filename), or reject the group."""
    slug, route = book.get("slug"), book.get("route_slug")
    if (
        not isinstance(slug, str) or not slug or slug.startswith(".") or len(slug) > 240
        or "\\" in slug or PurePosixPath(slug).parts != (slug,)
        or any(ord(char) < 32 or ord(char) == 127 for char in slug)
        or not isinstance(route, str) or not re.fullmatch("[a-z0-9]{1,224}", route)
        or book.get("url") != "/" + route or book.get("path") != f"books/{slug}/index.html"
        or book.get("text_path") != f"books/{slug}/text.html" or book.get("has_text") is not True
    ):
        raise ValueError("Invalid registered source download.")
    groups = [("", False, book.get("downloads", []))]
    seen_languages = set()
    editions = book.get("editions", [])
    if not isinstance(editions, list) or len(editions) > 256:
        raise ValueError("Invalid source download editions.")
    for edition in editions:
        if not isinstance(edition, dict):
            raise ValueError("Invalid source download edition.")
        if not any(key in edition for key in ("downloads", "axiom_downloads")):
            continue
        code = edition.get("language_code")
        if (not isinstance(code, str) or len(code) > 63 or code in seen_languages
                or not re.fullmatch("[a-z]{2,8}(?:-[a-z0-9]{1,8})*", code)):
            raise ValueError("Invalid source download language.")
        seen_languages.add(code)
        if edition.get("kind") == "original":
            if (edition.get("path") != book["text_path"] or edition.get("url") != book["url"]
                    or edition.get("downloads", []) != book.get("downloads", [])):
                raise ValueError("Invalid original edition downloads.")
            code = ""
        elif (edition.get("kind") == "translation"
              and edition.get("path") == f"books/{slug}/languages/{code}/index.html"
              and edition.get("url") == f"/{route}/language/{code}/"):
            groups.append((code, False, edition.get("downloads", [])))
        else:
            raise ValueError("Invalid translated edition downloads.")
        if "axiom_downloads" in edition:
            groups.append((code, True, edition["axiom_downloads"]))
    records = []
    for code, commentary, files in groups:
        formats = {"epub", "pdf"} if commentary else TYPES.keys()
        if not isinstance(files, list) or len(files) > len(formats):
            raise ValueError("Invalid registered source downloads.")
        stem = "source-with-axioms" if commentary else "source"
        folder = f"books/{slug}/downloads/" + (code + "/" if code else "")
        canonical = f"/{route}" + (f"/language/{code}/" if code else "")
        root = canonical.rstrip("/") + "/downloads/"
        seen_formats = set()
        for row in files:
            if not isinstance(row, dict) or set(row) != {"format", "media_type", "sha256", "url", "path", "bytes"}:
                raise ValueError("Invalid registered source download.")
            fmt = row["format"]
            if (
                not isinstance(fmt, str) or fmt not in formats or fmt in seen_formats
                or row["media_type"] != TYPES[fmt] or row["path"] != f"{folder}{stem}.{fmt}"
                or row["url"] != f"{root}{stem}.{fmt}" or not isinstance(row["sha256"], str)
                or not re.fullmatch("[a-f0-9]{64}", row["sha256"])
                or type(row["bytes"]) is not int or not 0 < row["bytes"] <= MAX_BYTES
            ):
                raise ValueError("Invalid registered source download.")
            seen_formats.add(fmt)
            filename = route + ("-" + code if code else "") + f"-{stem}.{fmt}"
            records.append((row, canonical, filename))
    return records
