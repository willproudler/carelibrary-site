"""A compact, citation-oriented guide to the already-published search pages.

This is ordinary public metadata. It grants no access, changes no crawler or
training preferences, and never loads private drafts or original source prose.
"""
from __future__ import annotations

from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urlsplit

from numogram_seo import load_reference


SCHEMA = "care-research-index/1"


def _read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Expected a generated search manifest.")
    return value


def _origin(value: str) -> str:
    url = urlsplit(value)
    if (url.scheme != "https" or not url.netloc or url.username or url.password
            or url.path not in {"", "/"} or url.query or url.fragment):
        raise ValueError("Use the canonical HTTPS origin.")
    return value.rstrip("/")


def _url(path: str, origin: str) -> str:
    value = urlsplit(path)
    if (not isinstance(path, str) or not path.startswith("/") or path.startswith("//")
            or value.scheme or value.netloc or value.query or value.fragment
            or "\\" in path or any(part in {".", ".."} for part in path.split("/"))):
        raise ValueError("Discovery links must be canonical local paths.")
    return origin + path


class _Metadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self.structured, self.inside_title, self.inside_json = "", [], False, False
        self.content = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        self.inside_title |= tag == "title"
        if tag == "script" and attributes.get("type") == "application/ld+json":
            self.inside_json = True
            self.content = []

    def handle_data(self, data):
        if self.inside_title:
            self.title += data
        if self.inside_json:
            self.content.append(data)

    def handle_endtag(self, tag):
        if tag == "title":
            self.inside_title = False
        if tag == "script" and self.inside_json:
            self.inside_json = False
            self.structured.append(json.loads("".join(self.content)))


def _page_metadata(root: Path, name: str) -> dict:
    path = root / name
    if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()) or path.suffix != ".html":
        raise ValueError("Invalid generated metadata page.")
    parser = _Metadata()
    # Only the metadata variant is read. The gated text_path is never consulted.
    parser.feed(path.read_text(encoding="utf-8"))
    for item in parser.structured:
        candidates = item.get("@graph", []) if isinstance(item, dict) and "@graph" in item else [item]
        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("@type") == "Book":
                author = candidate.get("author") or {}
                return {"title": candidate.get("name") or parser.title,
                        "author": author.get("name", "") if isinstance(author, dict) else str(author),
                        "year": candidate.get("temporalCoverage", "")}
    return {"title": parser.title.split(" | CARE Library", 1)[0]}


def _link(label: str, url: str, note: str = "") -> str:
    label = " ".join(str(label).split()).replace("[", "(").replace("]", ")")
    return f"- [{label}]({url})" + (f": {note}" if note else "")


def build(source: Path, destination: Path | None = None, *, origin: str = "https://carelibrary.org") -> dict:
    """Run after book/NUMO generation; preserve exact public identities and URLs."""
    source, destination = Path(source).resolve(), Path(destination or source).resolve()
    origin = _origin(origin)
    books_path, numo_path = destination / "books/manifest.json", destination / "numogram/manifest.json"
    books_manifest, numo_manifest = _read_json(books_path), _read_json(numo_path)
    if books_manifest.get("schema") != "care-book-search-pages/1" or numo_manifest.get("version") != 1:
        raise ValueError("Expected the reviewed book and NUMO search manifests.")
    books, chapters, demons = [], [], []
    book_by_id = {}
    for item in books_manifest.get("books", []):
        metadata = _page_metadata(destination, item["path"])
        record = {"type": "book", "work_id": item["work_id"], "reader_slug": item["reader_slug"],
                  "title": item.get("title") or metadata["title"],
                  "author": item.get("author") or metadata.get("author", ""),
                  "url": _url(item["url"], origin)}
        for field in ("year", "edition", "language", "language_code", "language_name"):
            if value := item.get(field) or metadata.get(field):
                record[field] = value
        books.append(record)
        book_by_id[item["work_id"]] = record
    for item in books_manifest.get("chapters", []):
        book = book_by_id.get(item["work_id"])
        if not book:
            raise ValueError("A source section must belong to a published book.")
        title = item.get("title") or _page_metadata(destination, item["path"])["title"]
        canonical = _url(item["url"], origin)
        record = {"type": "original_source_section", "work_id": item["work_id"],
                  "source_id": item["source_id"], "title": title,
                  "book_url": book["url"], "url": canonical,
                  "citation": {"author": book["author"], "book": book["title"],
                               "section": title, "source_id": item["source_id"],
                               "url": canonical, "book_url": book["url"]}}
        for field in ("source_language", "source_language_name"):
            if item.get(field):
                record[field] = item[field]
        chapters.append(record)
    published = {item.get("demon_id"): item for item in numo_manifest.get("pages", []) if item.get("demon_id")}
    reference = load_reference(source)
    if set(published) != {item["id"] for item in reference}:
        raise ValueError("The discovery index must retain every published demon.")
    for demon in reference:
        record = {"type": "numogram_demon", "demon_id": demon["id"], "name": demon["name"],
                  "url": _url(published[demon["id"]]["url"], origin), "net_span": demon["poles"],
                  "source": "CCRU Pandemonium Matrix, as attributed in the published NUMO reference"}
        for field in ("aliases", "epithet", "domain"):
            if value := demon.get(field):
                record[field] = value
        demons.append(record)
    records = {
        "schema": SCHEMA, "name": "CARE Library and NUMO public research index", "url": origin + "/research-index.json",
        "links": {"guide": origin + "/llms.txt", "books": origin + "/books/", "numogram": origin + "/numogram/",
                  "sitemap": origin + "/sitemap.xml"},
        "scope": {"books": len(books), "source_sections": len(chapters), "demons": len(demons)},
        "access": {"metadata": "public", "original_source_text": "Available on chapter pages when the library is in public mode; beta access rules still apply.",
                   "private_studio_drafts": "not included"},
        "provenance": {"book_export_sha256": books_manifest.get("source_sha256", ""),
                       "numogram_reference_sha256": numo_manifest.get("public_reference_sha256", "")},
        "citation_guidance": "Cite the canonical chapter URL and its recorded author, book, section and source_id. Original source prose and saved CARE interpretations are distinct. A recorded link is provenance, not proof of interpretive correctness.",
        "books": books, "source_sections": chapters, "demons": demons,
    }
    encoded = json.dumps(records, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n"
    if len(encoded.encode()) > 2 * 1024 * 1024:
        raise ValueError("The public discovery index must remain compact.")
    (destination / "research-index.json").write_text(encoded, encoding="utf-8")
    guide = ["# CARE Library and NUMO", "",
             "> A reading environment for tracing original texts, arguments and recorded connections, with an interactive Numogram and its attributed CCRU demon reference.", "",
             "The public research index lists the published books, exact source sections and all 45 demon records. Canonical book and chapter URLs open the existing source and CARE panes; demon URLs open the same NUMO instrument on that entry.", "",
             "Book and source metadata are public. Original source text follows the website’s current beta access setting. Private Studio drafts, account records and unpublished books are not listed.", "",
             "Original author prose and saved AI-assisted CARE interpretations are separate. For quotations, verify the original source section and cite its canonical URL, author, book title, section title and recorded source ID. Recorded links describe provenance, not proof of an interpretation. No page or index grants a new reuse licence.", "",
             "## Research entry points", "",
             _link("Machine-readable research index", origin + "/research-index.json", "Canonical URLs, authors, exact source IDs and public reference identities."),
             _link("Books by title and author", origin + "/books/"),
             _link("Numogram", origin + "/numogram/", "The map, zones, currents, gates and linked demon records."),
             _link("Sitemap", origin + "/sitemap.xml"), "", "## Books", ""]
    guide += [_link(book["title"] + " — " + book["author"], book["url"]) for book in books]
    guide += ["", "## Numogram demons", ""]
    guide += [_link(demon["name"], demon["url"], demon["demon_id"] + "; net-span " + "::".join(map(str, demon["net_span"]))) for demon in demons]
    guide += ["", "## Optional", "", _link("About CARE", origin + "/about.html"),
              _link("Request beta access", origin + "/request-access.html"), ""]
    (destination / "llms.txt").write_text("\n".join(guide), encoding="utf-8")
    return records


if __name__ == "__main__":
    build(Path(__file__).resolve().parents[1])
