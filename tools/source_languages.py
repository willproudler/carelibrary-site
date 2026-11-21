"""Complete saved source-language editions, with no translation API calls.

The caller supplies an attested public work. A language is offered only when
every source section has usable text saved in that language. Canonical source
IDs identify sections; translated paragraphs never inherit passage anchors.
"""
from __future__ import annotations

from copy import deepcopy
import re
from urllib.parse import quote


_LANGUAGE = re.compile(r"[a-z]{2,8}(?:-[a-z0-9]{1,8})*")
_WORK_FIELDS = (
    "id", "slug", "seal", "title", "author", "year", "original_year",
    "publication_year", "edition", "description", "source_url", "source_notices",
)


def _line(value) -> str:
    return " ".join(value.split()) if isinstance(value, str) else ""


def _code(value) -> str:
    code = _line(value).replace("_", "-").lower()
    return code if len(code) <= 63 and _LANGUAGE.fullmatch(code) else ""


def _saved_text(variant: dict) -> str:
    text = variant.get("text")
    if isinstance(text, str) and text.strip():
        return text
    paragraphs = variant.get("paragraphs")
    if (not isinstance(paragraphs, list) or not paragraphs
            or any(not isinstance(row, dict) or not isinstance(row.get("text"), str)
                   or not row["text"].strip() for row in paragraphs)):
        return ""
    return "\n\n".join(row["text"] for row in paragraphs)


def _status(values: list[str], default: str) -> str:
    unique = set(values)
    return next(iter(unique)) if len(unique) == 1 else "mixed" if unique else default


def source_language_editions(work: dict) -> list[dict]:
    """Return complete, separately labelled saved translations of a work.

    Each result includes language_code, language_name, kind, rendition_type,
    review_status, and a small source-only work projection. Original text and
    the caller's dictionary remain unchanged. Partial translations, stale
    source hashes, quotation-only variants and unsafe language codes are omitted.
    """
    sources = work.get("sources")
    if (not isinstance(sources, list) or not sources
            or any(not isinstance(source, dict) or not _line(source.get("id")) for source in sources)):
        return []
    original_language = _code(work.get("language_code"))
    candidates = []
    for source in sources:
        variants = source.get("translations")
        available = {}
        for variant in variants if isinstance(variants, list) else []:
            if not isinstance(variant, dict) or variant.get("translate_quotations"):
                continue
            code = _code(variant.get("language_code"))
            if not code or code == original_language or code in available:
                continue
            if (variant.get("source_sha256") and source.get("sha256")
                    and variant["source_sha256"] != source["sha256"]):
                continue
            source_code = _code(source.get("language_code")) or original_language
            if (_code(variant.get("source_language_code"))
                    and source_code and _code(variant["source_language_code"]) != source_code):
                continue
            if text := _saved_text(variant):
                available[code] = (variant, text)
        candidates.append(available)
    complete = set(candidates[0]).intersection(*(set(rows) for rows in candidates[1:]))
    editions = []
    for code in sorted(complete):
        selected = [rows[code] for rows in candidates]
        name = next((_line(variant.get("language_name")) for variant, _ in selected
                     if _line(variant.get("language_name"))), code)
        rendition = _status([_line(variant.get("rendition_type")) or "unspecified" for variant, _ in selected], "unspecified")
        review = _status([_line(variant.get("review_status")) or "unspecified"
                          for variant, _ in selected], "unspecified")
        metadata = {
            "language_code": code, "language_name": name, "kind": "translation",
            "rendition_type": rendition, "review_status": review,
            "source_language_code": original_language or "und",
            "source_language_name": _line(work.get("language_name")) or original_language or "Undetermined",
        }
        projection = {key: deepcopy(work[key]) for key in _WORK_FIELDS if key in work}
        projection.update(language_code=code, language_name=name, units=[],
                          source_language_edition=metadata, sources=[])
        from book_seo import _chapter_slugs
        projection['source_route_slugs'] = _chapter_slugs(work)
        for source, (variant, text) in zip(sources, selected):
            # Source identity supports navigation only. Even when a saved
            # rendition copies canonical paragraph IDs, no new proof of
            # passage alignment is asserted by this source reading edition.
            translated = {key: deepcopy(source[key]) for key in
                          ("id", "chapter_id", "order", "sequence", "sha256", "seal") if key in source}
            translated.update(
                title=_line(variant.get("title")) or _line(source.get("title")),
                language_code=code, language_name=name, text=text, paragraphs=[],
                translation={
                    "id": _line(variant.get("id")), "kind": "translation",
                    "rendition_type": _line(variant.get("rendition_type")) or "unspecified",
                    "review_status": _line(variant.get("review_status")) or "unspecified",
                    "source_sha256": _line(source.get("sha256")),
                },
            )
            projection["sources"].append(translated)
        editions.append({**{key: metadata[key] for key in
                           ("language_code", "language_name", "kind", "rendition_type", "review_status")},
                         "work": projection})
    return editions


def _component(value: str) -> bool:
    return (isinstance(value, str) and bool(value) and not value.startswith(".")
            and len(value) <= 240 and "/" not in value and "\\" not in value
            and not any(ord(char) < 32 or ord(char) == 127 for char in value))


def edition_record(edition: dict, book_slug: str, route_slug: str,
                   chapter_slug: str | None = None) -> dict:
    """Declare one generated book/chapter edition without embedding its text.

    The original edition uses its existing canonical URL and text.html file.
    Saved translations use exact language URLs and static language subfolders.
    """
    code = _code(edition.get("language_code"))
    kind = edition.get("kind", "translation")
    if (not code or not isinstance(kind, str) or kind not in {"original", "translation"} or not _component(book_slug)
            or not isinstance(route_slug, str) or not re.fullmatch(r"[a-z0-9]{1,224}", route_slug)
            or chapter_slug is not None and not _component(chapter_slug)):
        raise ValueError("Source language editions require safe published routes and language codes.")
    folder = f"books/{book_slug}/" + (chapter_slug + "/" if chapter_slug else "")
    canonical = "/" + route_slug + ("/" + quote(chapter_slug, safe="-") + "/" if chapter_slug else "")
    if kind == "original":
        path, url = folder + "text.html", canonical
    else:
        path = folder + f"languages/{code}/index.html"
        url = canonical.rstrip("/") + f"/language/{code}/"
    return {
        "language_code": code, "language_name": _line(edition.get("language_name")) or code,
        "kind": kind, "rendition_type": _line(edition.get("rendition_type")),
        "review_status": _line(edition.get("review_status")), "path": path, "url": url,
    }
