"""Readable book pages from the exact attested website export, never local drafts.

Book URLs always use a small metadata page and the existing reader shell.
Each source-section URL has its own public metadata page and a bounded text
variant which the server may select only when the existing beta gate is off.
A static host must not publish text variants while keeping the library private.
"""
from __future__ import annotations

from collections import Counter
import hashlib
from html import escape
import json
from pathlib import Path
import re
import shutil
import tempfile
import unicodedata
from urllib.parse import quote, urlencode, urlsplit

SCHEMA = "care-book-search-pages/1"
MAX_EXPORT_BYTES = 512 * 1024 * 1024
_CSS = """html{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#111415;color:#e8e4da;font:17px/1.7 system-ui,-apple-system,sans-serif}a{color:#b6cec5;text-underline-offset:.2em}a:hover{color:#f4e9c6}header,main,footer{max-width:1040px;margin:auto;padding:30px 28px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #343c3b}.brand{text-decoration:none;font-size:18px;letter-spacing:.05em}nav{display:flex;gap:22px;flex-wrap:wrap}h1,h2,h3{font-family:Georgia,serif;font-weight:400;line-height:1.15}h1{font-size:clamp(2.6rem,6vw,4.8rem);max-width:20ch;margin:.2em 0}h2{font-size:2rem;margin-top:1.6em}h3{font-size:1.35rem}p{max-width:72ch}.eyebrow{color:#b5b5a7;text-transform:uppercase;letter-spacing:.12em;font-size:.72rem}.byline{font-family:Georgia,serif;font-size:1.65rem}.intro{max-width:70ch;color:#d1cec4}.actions{display:flex;gap:16px;flex-wrap:wrap;margin:30px 0}.button{display:inline-block;padding:10px 18px;border:1px solid #6b8177;border-radius:5px;text-decoration:none}.button.primary{background:#b6cfc1;color:#16231e}dl{display:grid;grid-template-columns:130px minmax(0,1fr);gap:10px 24px;padding:26px 0;border-top:1px solid #343c3b;border-bottom:1px solid #343c3b}dt{color:#a6ada4}dd{margin:0;overflow-wrap:anywhere}.notice{padding:18px 22px;border-left:2px solid #879f91;background:#1b2221;color:#c3cabf}.chapters{columns:2;column-gap:38px;padding-left:23px}.chapters li{break-inside:avoid;padding:5px 0}.source-chapter{margin:55px 0;padding-top:20px;border-top:1px solid #343c3b;max-width:78ch}.source-body{font:1.15rem/1.85 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere}.source-body p{white-space:pre-wrap}.source-tools{font-size:.85rem}.book-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}.book-card{border:1px solid #343c3b;border-radius:8px;padding:22px}.book-card h2{font-size:1.7rem;margin:0 0 10px}.book-card p{margin:0;color:#bec3b9}.language{color:#aab6ac;font-size:.85rem}footer{color:#9aa79b;font-size:.85rem;border-top:1px solid #343c3b;margin-top:40px}@media(max-width:650px){.chapters{columns:1}dl{grid-template-columns:1fr;gap:3px}dd{margin-bottom:12px}header{align-items:flex-start;flex-direction:column}}"""


def _json(data: bytes | str):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("Duplicate field in the attested website export.")
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Non-finite export value.")))


def _digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _read(path: Path, root: Path) -> bytes:
    if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()) or not path.is_file():
        raise ValueError("A book search input is missing or outside the attested website.")
    if path.stat().st_size > MAX_EXPORT_BYTES:
        raise ValueError("The website export exceeds the supported build size.")
    return path.read_bytes()


def load_attested_library(source: Path) -> tuple[dict, str]:
    """Verify split/full bytes and the publication audit before exposing metadata."""
    source = Path(source).resolve()
    raw = _read(source / "data/library.json", source)
    descriptor = _json(raw)
    if not isinstance(descriptor, dict):
        raise ValueError("The published library must be an object.")
    if descriptor.get("format") == "care-public-library-parts/1":
        if set(descriptor) != {"format", "parts", "bytes", "sha256"}:
            raise ValueError("Unsupported split catalogue fields.")
        parts = descriptor.get("parts")
        if not isinstance(parts, list) or not 1 <= len(parts) <= 128:
            raise ValueError("Invalid split catalogue inventory.")
        chunks, seen, total = [], set(), 0
        for part in parts:
            if not isinstance(part, dict) or set(part) != {"path", "sha256", "bytes"}:
                raise ValueError("Invalid split catalogue entry.")
            name = part["path"]
            if not isinstance(name, str) or not re.fullmatch(r"library-parts/[0-9a-f]{64}\.jsonpart", name) or name in seen:
                raise ValueError("Unsafe or duplicate split catalogue path.")
            seen.add(name)
            chunk = _read(source / "data" / name, source)
            if type(part["bytes"]) is not int or len(chunk) != part["bytes"] or _digest(chunk) != part["sha256"]:
                raise ValueError("A split catalogue part changed or is incomplete.")
            total += len(chunk)
            if total > MAX_EXPORT_BYTES:
                raise ValueError("The split catalogue exceeds the supported build size.")
            chunks.append(chunk)
        raw = b"".join(chunks)
        if len(raw) != descriptor["bytes"] or _digest(raw) != descriptor["sha256"]:
            raise ValueError("The complete split catalogue does not match its publication digest.")
        library = _json(raw)
    else:
        library = descriptor
    audit = _json(_read(source / "data/export-audit.json", source))
    if not isinstance(audit, dict) or audit.get("bytes") != len(raw) or audit.get("sha256") != _digest(raw):
        raise ValueError("Book search pages require the exact attested public export.")
    if not isinstance(library, dict) or library.get("format") != "care-public-library/1" or not isinstance(library.get("works"), list):
        raise ValueError("Unsupported published library format.")
    attested = audit.get("works")
    if not isinstance(attested, list) or any(not isinstance(row, dict)
                                          or not all(isinstance(row.get(key), str) and row[key] for key in ("slug", "seal"))
                                          for row in attested):
        raise ValueError("The public export has no valid book attestation list.")
    declared = [(row.get("slug"), row.get("seal")) for row in attested]
    actual, identities = [], set()
    for work in library["works"]:
        if not isinstance(work, dict) or not all(isinstance(work.get(key), str) and work[key].strip()
                                              for key in ("id", "slug", "seal", "title", "author")):
            raise ValueError("A published book is missing its stable identity or display metadata.")
        if work["id"] in identities:
            raise ValueError("Duplicate published book identity.")
        identities.add(work["id"])
        actual.append((work["slug"], work["seal"]))
    if len(declared) != len(set(declared)) or len(actual) != len(set(actual)) or set(actual) != set(declared):
        raise ValueError("A book does not match the attested publication list.")
    if len({slug for slug, _ in actual}) != len(actual):
        raise ValueError("Published books must have unique reader slugs.")
    return library, _digest(raw)


def _slug(text: str) -> str:
    # Preserve readable non-Latin titles as well as accented European names.
    normalized = unicodedata.normalize("NFKD", text).casefold()
    characters = [char if char.isalnum() else "-" for char in normalized if not unicodedata.combining(char)]
    return re.sub("-+", "-", "".join(characters)).strip("-")[:180].rstrip("-")


def book_slugs(works: list[dict]) -> dict[str, str]:
    bases = {work["id"]: _slug(work["title"] + " " + work["author"]) or "book" for work in works}
    counts = Counter(bases.values())
    return {identity: base + ("-" + _digest(identity.encode())[:12] if counts[base] > 1 or base == "book" else "")
            for identity, base in bases.items()}


_RESERVED_ROOTS = frozenset({
    "api", "assets", "data", "native", "numogram", "books", "search", "server", "tools", "dist",
    "login", "logout", "library", "studio", "reader", "about", "index", "welcome", "requestaccess",
    "sitesettings", "robots", "sitemap", "favicon", "researchindex", "health", "healthz", "readyz", "auth", "admin",
})


def _compact_ascii(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().casefold()
    return re.sub(r"[^a-z0-9]", "", normalized)


def _author_key(value: str) -> str:
    name = " ".join(value.split())
    # These traditional names have a place of attribution, not a family name.
    # Other multi-part credited names use their final surname/mononym.
    if re.search(r"\s+of\s+", name, re.I):
        name = re.split(r"\s+of\s+", name, maxsplit=1, flags=re.I)[0]
    words = name.split()
    return _compact_ascii(words[-1]) if words else ""


def book_routes(works: list[dict]) -> dict[str, str]:
    """Deterministic compact root addresses; the manifest is the shared mapping.

    Author surname/mononym comes first, followed by the book title without an
    initial English article. Collisions and reserved roots gain a stable suffix,
    rather than depending on catalogue order.
    """
    bases = {work["id"]: (_author_key(work["author"]) + _compact_ascii(
        re.sub(r"^(?:the|an|a)\s+", "", work["title"].strip(), count=1, flags=re.I)))[:160] or "book"
        for work in works}
    counts = Counter(bases.values())
    reserved = set(bases.values()) | set(_RESERVED_ROOTS)
    assigned = {}
    for identity in sorted(bases):
        base = bases[identity]
        if counts[base] == 1 and base not in _RESERVED_ROOTS and base != "book":
            assigned[identity] = base
            continue
        digest = _digest(identity.encode())
        width = 10
        candidate = base + digest[:width]
        while candidate in reserved or candidate in assigned.values():
            width += 2
            if width > len(digest):
                raise ValueError("Unable to assign unique compact book addresses.")
            candidate = base + digest[:width]
        assigned[identity] = candidate
    return assigned


def _origin(value: str) -> str:
    if not isinstance(value, str) or any(ord(char) <= 32 for char in value):
        raise ValueError("Book canonical URLs require an explicit HTTPS origin.")
    parsed = urlsplit(value)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or parsed.path not in ("", "/") or parsed.port not in (None, 443)):
        raise ValueError("Book canonical URLs require an explicit HTTPS origin.")
    return value.rstrip("/")


def _rows(value) -> list:
    return value if isinstance(value, list) else []


def _text(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def _reader_url(work: dict, source_id: str = "") -> str:
    values = {"book": work["slug"]}
    if source_id:
        values["source"] = source_id
    return "/library.html#" + urlencode(values, quote_via=quote)


def _source_text(source: dict) -> str:
    text = _text(source.get("text"))
    if text:
        return text
    return "\n\n".join(_text(paragraph.get("text")) for paragraph in _rows(source.get("paragraphs"))
                        if isinstance(paragraph, dict) and _text(paragraph.get("text")))


def _source_markup(source: dict) -> str:
    """Add passage anchors only for an exact ordered text reconstruction.

    If saved passage wording differs from the canonical chapter or leaves an
    unaccounted prose gap, retain the chapter verbatim without invented offsets.
    """
    text=_source_text(source)
    paragraphs=[paragraph for paragraph in _rows(source.get('paragraphs'))
                if isinstance(paragraph,dict) and isinstance(paragraph.get('id'),str)
                and paragraph['id'] and isinstance(paragraph.get('text'),str) and paragraph['text']]
    if not paragraphs:
        return escape(text)
    cursor=0;parts=[];seen=set()
    for paragraph in paragraphs:
        identity=paragraph['id'];value=paragraph['text']
        position=text.find(value,cursor)
        if identity in seen or position<0 or text[cursor:position].strip():
            return escape(text)
        seen.add(identity)
        parts.append(escape(text[cursor:position]))
        parts.append('<span id="'+escape('ref='+identity,quote=True)+'" data-passage-id="'+escape(identity,quote=True)+'">'+escape(value)+'</span>')
        cursor=position+len(value)
    if text[cursor:].strip():
        return escape(text)
    return ''.join(parts)+escape(text[cursor:])


def _safe_external(value) -> str:
    if not isinstance(value, str):
        return ""
    parsed = urlsplit(value)
    return value if parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password else ""


def _sources(work: dict) -> list[dict]:
    return [source for source in _rows(work.get("sources")) if isinstance(source, dict)
            and isinstance(source.get("id"), str) and source["id"]]


def _chapter_slugs(work: dict) -> dict[str, str]:
    result = {}
    for index, source in enumerate(_sources(work), 1):
        if source["id"] in result:
            raise ValueError("Source-section identities must be unique within a book.")
        title = _slug(_text(source.get("title")))[:120].rstrip("-") or "source-section"
        result[source["id"]] = f"{index:03d}-{title}"
    return result


def _book_url(slug: str) -> str:
    return "/" + slug


def _chapter_url(book_slug: str, chapter_slug: str) -> str:
    return _book_url(book_slug) + "/" + quote(chapter_slug, safe="-") + "/"


def _aliases(resource: str, canonical: str) -> list[str]:
    legacy = "/" + resource.removesuffix("index.html")
    candidates = {legacy, legacy.rstrip("/"), "/" + resource,
                  canonical.rstrip("/"), canonical.rstrip("/") + "/", canonical.rstrip("/") + "/index.html"}
    return sorted(candidates - {canonical})


def _jsonld(work: dict, canonical: str, description: str) -> str:
    book = {"@context": "https://schema.org", "@type": "Book", "@id": canonical + "#book",
            "name": work["title"], "author": {"@type": "Person", "name": work["author"]},
            "url": canonical, "description": description,
            "inLanguage": _text(work.get("language_code")) or "und",
            "identifier": {"@type": "PropertyValue", "propertyID": "CARE work", "value": work["id"]}}
    if edition := _text(work.get("edition")):
        book["bookEdition"] = edition
    if source_url := _safe_external(work.get("source_url")):
        book["sameAs"] = source_url
    # Date ranges, BCE and approximate historical dates are display metadata,
    # never misrepresented as an ISO publication date or the CARE edition date.
    if year := _text(work.get("year")):
        book["temporalCoverage"] = year
    encoded = json.dumps(book, ensure_ascii=False, separators=(",", ":"))
    return encoded.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def _shell(*, title: str, description: str, canonical: str, body: str, structured: str = "") -> str:
    script = f'<script type="application/ld+json">{structured}</script>' if structured else ""
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{escape(title)}</title><meta name="description" content="{escape(description, quote=True)}">'
            f'<link rel="canonical" href="{escape(canonical, quote=True)}">'
            '<meta name="robots" content="index,follow">'
            f'<meta property="og:type" content="book"><meta property="og:title" content="{escape(title, quote=True)}">'
            f'<meta property="og:description" content="{escape(description, quote=True)}">'
            f'<meta property="og:url" content="{escape(canonical, quote=True)}">'
            '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
            '<link rel="stylesheet" href="/books/books.css">' + script + '</head><body id="care-search-content">'
            '<header><a class="brand" href="/">CARE Library</a><nav aria-label="Main navigation">'
            '<a href="/books/">Books</a><a href="/library.html">Open library</a><a href="/about.html">About</a>'
            '</nav></header><main>' + body + '</main><footer>CARE Library · Original source texts and their separately identified CARE readings.</footer></body></html>\n')


def _book_page(work: dict, slug: str, origin: str) -> str:
    from book_landings import has_stephanus_pages, landing_metadata, source_label
    from reading_seo import LAYER_NAMES, LAYER_ORDER, layer_url, overview_url, unit_url

    canonical = origin + _book_url(slug)
    guide = landing_metadata(work)
    description = guide['description'] or f'{work["title"]} by {work["author"]}. Read the original text and explore the available saved CARE readings in CARE Library.'
    short_description = " ".join(description.split())[:300]
    sources = _sources(work)
    units = [unit for unit in _rows(work.get("units")) if isinstance(unit, dict)]
    citation_pages = has_stephanus_pages(work)
    layer_names = {"WB": "whole-book structural", "MC": "book architecture", "CL": "cluster", "CH": "close", "NUMO": "NUMO"}
    layers = Counter(_text(unit.get("layer")) for unit in units)
    facts = []
    for label, value in (("Author", work["author"]), ("Work date", _text(work.get("year"))),
                         ("Edition", _text(work.get("edition"))), ("Language", _text(work.get("language_name")))):
        if value:
            facts.append(f'<dt>{label}</dt><dd>{escape(value)}</dd>')
    facts.append(f'<dt>{"Stephanus pages" if citation_pages else "Source sections"}</dt><dd>{len(sources)}</dd>')
    if units:
        facts.append('<dt>CARE readings</dt><dd>' + escape(", ".join(f'{count} {layer_names.get(layer, layer)}' for layer, count in sorted(layers.items()))) + '</dd>')
    if source_url := _safe_external(work.get("source_url")):
        facts.append(f'<dt>Source edition</dt><dd><a href="{escape(source_url, quote=True)}" rel="noopener">Original edition reference</a></dd>')
    chapter_links = []
    chapter_slugs = _chapter_slugs(work)
    for index, source in enumerate(sources, 1):
        title = source_label(work, source, f"Source section {index}")
        target = _chapter_url(slug, chapter_slugs[source["id"]])
        chapter_links.append(f'<li><a href="{escape(target, quote=True)}">{escape(title)}</a></li>')
    body = ('<article><p class="eyebrow">Book · CARE Library</p>'
            f'<h1>{escape(work["title"])}</h1><p class="byline">by {escape(work["author"])}</p>'
            f'<p class="intro">{escape(short_description)}</p><div class="actions">'
            f'<a class="button primary" href="{escape(_reader_url(work), quote=True)}">Open this book in CARE</a>'
            '<a class="button" href="/books/">Browse books</a></div>')
    if guide['overview']:
        body += '<section aria-labelledby="work-overview"><h2 id="work-overview">Overview of the work</h2><p class="eyebrow">Editorial guide</p>'
        body += ''.join('<p>' + escape(paragraph) + '</p>' for paragraph in guide['overview'])
        body += '<p class="source-tools">Overview references: ' + ' · '.join(
            '<a href="' + escape(reference['url'], quote=True) + '">' + escape(reference['label']) + '</a>'
            for reference in guide['references']) + '</p></section>'
    if guide['topics']:
        body += '<section aria-labelledby="source-topics"><h2 id="source-topics">Explore the original text</h2><ul>'
        for topic in guide['topics']:
            target = _chapter_url(slug, chapter_slugs[topic['source_id']])
            body += '<li><a href="' + escape(target, quote=True) + '">' + escape(topic['title']) + '</a> · ' + escape(topic['citation']) + '</li>'
        body += '</ul><p class="source-tools">' + escape(guide['citation_note']) + '</p></section>'
    if guide['reading_map']:
        body += '<section aria-labelledby="reading-map"><h2 id="reading-map">A reading map</h2><p>Starting points from the published source headings and saved close-reading titles:</p><ul>'
        units_by_id = {unit.get('id'): unit for unit in units}
        for topic in guide['reading_map']:
            target = (unit_url(slug, units_by_id[topic['id']]) if topic['kind'] == 'reading'
                      else _chapter_url(slug, chapter_slugs[topic['id']]))
            body += '<li><a href="' + escape(target, quote=True) + '">' + escape(topic['title']) + '</a></li>'
        body += '</ul></section>'
    body += '<dl>' + ''.join(facts) + '</dl>'
    body += '<section aria-labelledby="care-readings"><h2 id="care-readings">Saved CARE readings</h2><p>CARE’s generated analysis follows the work’s structure and arguments; the original text is linked separately above and below.</p>'
    body += '<p><a href="' + escape(overview_url(slug), quote=True) + '">All saved CARE readings</a></p><ul>'
    for unit in units:
        if unit.get('layer') == 'WB' and isinstance(unit.get('id'), str) and unit['id']:
            body += '<li><a href="' + escape(unit_url(slug, unit), quote=True) + '">Whole-book structural reading</a></li>'
    for layer in sorted((key for key in layers if key != 'WB'), key=lambda key: (LAYER_ORDER.get(key, 99), key)):
        label = 'Close readings of citation pages (CH)' if layer == 'CH' and citation_pages else 'Close readings (CH)' if layer == 'CH' else LAYER_NAMES.get(layer, layer) + ' CARE readings'
        body += '<li><a href="' + escape(layer_url(slug, layer), quote=True) + '">' + escape(label) + '</a></li>'
    body += '</ul></section>'
    if chapter_links:
        heading = 'Original text · Stephanus pages' if citation_pages else 'Original text · source sections'
        body += '<section aria-labelledby="contents"><h2 id="contents">' + heading + '</h2>'
        if citation_pages:
            body += '<p>These are citation pages in the saved Greek edition, rather than authored chapter divisions.</p>'
        body += '<ul class="chapters">' + ''.join(chapter_links) + '</ul></section>'
    body += '</article>'
    return _shell(title=f'{work["title"]} by {work["author"]} | CARE Library', description=short_description,
                  canonical=canonical, body=body, structured=_jsonld(work, canonical, short_description))


def _chapter_page(work: dict, book_slug: str, source: dict, chapter_slug: str, origin: str, *, include_text: bool) -> str:
    from book_landings import source_label, source_page_number

    sources = _sources(work)
    index = next(index for index, item in enumerate(sources) if item["id"] == source["id"])
    chapter_slugs = _chapter_slugs(work)
    title = source_label(work, source, f"Source section {index + 1}")
    citation_page = source_page_number(work, source)
    book_url = _book_url(book_slug)
    canonical = origin + _chapter_url(book_slug, chapter_slug)
    description = f'{title} of {work["title"]} by {work["author"]}. Read the original text and its saved CARE close reading in CARE Library.'
    structured = {"@context": "https://schema.org", "@type": "CreativeWork" if citation_page else "Chapter", "@id": canonical + "#source",
                  "name": title, "url": canonical, "position": index + 1,
                  "inLanguage": _text(source.get("language_code")) or _text(work.get("language_code")) or "und",
                  "identifier": source["id"],
                  "isPartOf": {"@type": "Book", "@id": origin + book_url + "#book", "name": work["title"],
                               "url": origin + book_url, "author": {"@type": "Person", "name": work["author"]}}}
    source_caption = title if citation_page else f'Section {index + 1}'
    source_context = (f'{title} in the saved Greek edition of {work["title"]}; the page number is a Stephanus citation, not an authored chapter division.'
                      if citation_page else f'Source section {index + 1} of {len(sources)} in the saved edition of {work["title"]}.')
    body = (f'<article><p class="eyebrow">Original source · {escape(source_caption)}</p>'
            f'<p><a href="{escape(book_url, quote=True)}">{escape(work["title"])}</a> by {escape(work["author"])}</p>'
            f'<h1>{escape(title)}</h1><p class="intro">{escape(source_context)}</p><div class="actions">'
            f'<a class="button primary" href="{escape(_reader_url(work, source["id"]), quote=True)}">Open this section in CARE</a>'
            f'<a class="button" href="{escape(book_url, quote=True)}">Book contents</a></div>')
    details = [("Book", work["title"]), ("Author", work["author"]), ("Work date", _text(work.get("year"))),
               ("Edition", _text(work.get("edition"))),
               ("Language", _text(source.get("language_name")) or _text(work.get("language_name")))]
    body += '<dl>' + ''.join(f'<dt>{label}</dt><dd>{escape(value)}</dd>' for label, value in details if value) + '</dl>'
    if include_text and (text := _source_text(source)):
        body += ('<p class="notice">The text below is this section of the saved original edition. '
                 'CARE interpretations and generated readings are separate from the author’s prose.</p>'
                 f'<section class="source-chapter" id="source-{index + 1}"><h2>{escape(title)}</h2>'
                 f'<div class="source-body">{_source_markup(source)}</div></section>')
    else:
        body += ('<p class="notice">This is the published source-section entry. Opening the reading panes follows the '
                 'website’s current beta setting; signing in may be required.</p>')
    neighbors = []
    for offset, label in ((-1, "Previous citation page" if citation_page else "Previous source section"),
                          (1, "Next citation page" if citation_page else "Next source section")):
        target = index + offset
        if 0 <= target < len(sources):
            neighbor = sources[target]
            href = _chapter_url(book_slug, chapter_slugs[neighbor["id"]])
            neighbors.append(f'<a href="{escape(href, quote=True)}">{label}: {escape(source_label(work, neighbor))}</a>')
    body += '<nav class="source-tools" aria-label="Source-section navigation">' + ''.join(neighbors) + '</nav></article>'
    encoded = json.dumps(structured, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return _shell(title=f'{work["title"]} by {work["author"]} — {title} | CARE Library', description=description[:300],
                  canonical=canonical, body=body, structured=encoded)


def _write(path: Path, contents: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")


def _with_book_routes(document: str, mapping: dict) -> str:
    encoded=json.dumps(mapping,ensure_ascii=False,separators=(",", ":"),allow_nan=False).replace("<","\\u003c")
    document=re.sub(r'<script\b[^>]*\bid=["\']care-book-routes["\'][^>]*>.*?</script>[ \t]*(?:\r?\n)?',"",document,flags=re.I|re.S)
    script='<script id="care-book-routes" type="application/json">'+encoded+'</script>'
    return re.sub(r"</head>",lambda _:script+"</head>",document,count=1,flags=re.I)


def _scoped_css() -> str:
    def prefix(match):
        selector = match[0]
        if selector.lstrip().startswith("@"):
            return selector
        return ",".join("#care-search-content" if part.strip() in {"html", "body"}
                        else "#care-search-content " + part.strip() for part in selector.split(","))
    return re.sub(r"[^{}]+(?=\{)", prefix, _CSS)


def build(source: Path, destination: Path | None = None, *, origin: str = "https://carelibrary.org") -> list[dict]:
    """Build only attested books; return canonical URLs for the shared sitemap."""
    from book_landings import source_label

    source = Path(source).resolve(strict=True)
    destination = Path(destination or source).absolute()
    if destination.is_symlink():
        raise ValueError("Book search output must not be a symbolic link.")
    destination.mkdir(parents=True, exist_ok=True)
    origin = _origin(origin)
    library, digest = load_attested_library(source)
    works = library["works"]
    slugs = book_slugs(works)
    routes = book_routes(works)
    compact_mapping={"schema":"care-book-routes/1","books":[{
        "work_id":work["id"],"reader_slug":work["slug"],"route_slug":routes[work["id"]],
        "url":_book_url(routes[work["id"]]),
        "aliases":_aliases(f'books/{slugs[work["id"]]}/index.html',_book_url(routes[work["id"]]))}
        for work in sorted(works,key=lambda item:item["id"])]}
    target = destination / "books"
    if target.is_symlink():
        raise ValueError("Book search output must not replace a symbolic link.")
    if target.exists():
        manifest_path = target / "manifest.json"
        previous = _json(manifest_path.read_bytes()) if manifest_path.is_file() and not manifest_path.is_symlink() else None
        if not isinstance(previous, dict) or previous.get("schema") != SCHEMA:
            raise ValueError("The books folder contains files not generated by this builder.")
    temporary = Path(tempfile.mkdtemp(prefix=".book-search-build-", dir=destination))
    old = None
    try:
        entries, chapters, sitemap = [], [], [{"loc": origin + "/books/"}]
        _write(temporary / "books.css", _scoped_css())
        # Import only the shared site-shell builder. It supplies the existing
        # CARE reader DOM/assets and keeps the static reference as fallback.
        from seo_shell import embed_library
        for work in sorted(works, key=lambda item: (item["title"].casefold(), item["author"].casefold(), item["id"])):
            slug = slugs[work["id"]]
            route_slug = routes[work["id"]]
            url = _book_url(route_slug)
            route = {"book": work["slug"], "view": "workspace", "sources": [source["id"] for source in _sources(work)]}
            _write(temporary / slug / "index.html", _with_book_routes(embed_library(source, _book_page(work, route_slug, origin), route),compact_mapping))
            resource = f"books/{slug}/index.html"
            entries.append({"slug": slug, "route_slug": route_slug, "work_id": work["id"], "reader_slug": work["slug"], "url": url,
                            "path": resource, "aliases": _aliases(resource, url), "chapter_count": len(_sources(work)),
                            "title": work["title"], "author": work["author"], "year": _text(work.get("year")),
                            "edition": _text(work.get("edition")), "language": _text(work.get("language_code")),
                            "language_name": _text(work.get("language_name"))})
            sitemap.append({"loc": origin + url})
            chapter_slugs = _chapter_slugs(work)
            for source_index, section in enumerate(_sources(work), 1):
                chapter_slug = chapter_slugs[section["id"]]
                chapter_url = _chapter_url(route_slug, chapter_slug)
                chapter_route = {**route, "source": section["id"]}
                prefix = f"books/{slug}/{chapter_slug}"
                _write(temporary / slug / chapter_slug / "index.html", _with_book_routes(embed_library(source, _chapter_page(work, route_slug, section, chapter_slug, origin, include_text=False), chapter_route),compact_mapping))
                _write(temporary / slug / chapter_slug / "text.html", _with_book_routes(embed_library(source, _chapter_page(work, route_slug, section, chapter_slug, origin, include_text=True), chapter_route),compact_mapping))
                chapters.append({"book_slug": slug, "route_slug": route_slug, "slug": chapter_slug, "work_id": work["id"], "reader_slug": work["slug"],
                                 "source_id": section["id"], "source_order": source_index, "url": chapter_url,
                                 "path": prefix + "/index.html", "text_path": prefix + "/text.html",
                                 "aliases": _aliases(prefix + "/index.html", chapter_url),
                                 "has_text": bool(_source_text(section)), "title": source_label(work, section),
                                 "source_language": _text(section.get("language_code")) or _text(work.get("language_code")),
                                 "source_language_name": _text(section.get("language_name")) or _text(work.get("language_name"))})
                sitemap.append({"loc": origin + chapter_url})
        from reading_seo import build_into as build_readings
        sitemap.extend(build_readings(source, temporary, library=library, library_sha256=digest,
                                     books=entries, origin=origin, mapping=compact_mapping))
        from static_catalogue import catalogue_fragment, inject_catalogue, with_style
        reading_pages=json.loads((temporary/'readings-manifest.json').read_text(encoding='utf-8'))['pages']
        fragment=catalogue_fragment(entries,reading_pages)
        body=catalogue_fragment(entries,reading_pages,heading='Books and saved CARE readings',level=1)
        _write(temporary/'index.html',with_style(_shell(title='Books by title and author | CARE Library',
               description='Browse published books, saved whole-book CARE summaries and chapter, cluster and macro readings in HTML, Markdown and structured packets.',
               canonical=origin+'/books/',body=body)))
        _write(temporary / "manifest.json", json.dumps({"schema": SCHEMA, "source_sha256": digest,
               "metadata_public": True, "text_requires_public_library": True, "books": entries, "chapters": chapters}, ensure_ascii=False, indent=2) + "\n")
        if target.exists():
            old = destination / (temporary.name + "-old")
            target.rename(old)
        temporary.rename(target)
        if old:
            shutil.rmtree(old)
        _write(destination/"book-routes.json",json.dumps(compact_mapping,ensure_ascii=False,separators=(",", ":"))+"\n")
        library_page=destination/"library.html"
        if library_page.is_file() and not library_page.is_symlink():
            _write(library_page,inject_catalogue(_with_book_routes(library_page.read_text(encoding='utf-8'),compact_mapping),fragment,library=True))
        homepage=destination/'index.html'
        if homepage.is_file() and not homepage.is_symlink():
            _write(homepage,inject_catalogue(homepage.read_text(encoding='utf-8'),fragment))
        return sitemap
    except Exception:
        if old and old.exists() and not target.exists():
            old.rename(target)
        raise
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--origin", default="https://carelibrary.org")
    options = parser.parse_args()
    pages = build(options.source, options.destination, origin=options.origin)
    print(f"Prepared {len(pages) - 1} attested book/source-section pages and their title index.")
