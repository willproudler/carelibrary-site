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


SCHEMA = "care-research-index/2"
BOOK_SCHEMA = "care-book-research-index/1"
CARE_LAYERS = {"WB": "Whole-book CARE reading", "MC": "Meta-cluster CARE readings",
               "CL": "Cluster CARE readings", "CH": "Chapter CARE readings"}


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
    readings_manifest = _read_json(destination / "books/readings-manifest.json")
    if (books_manifest.get("schema") != "care-book-search-pages/1" or numo_manifest.get("version") != 1
            or readings_manifest.get("schema") != "care-reading-search-pages/1"):
        raise ValueError("Expected the reviewed book, CARE reading and NUMO search manifests.")
    if readings_manifest.get("source_sha256") != books_manifest.get("source_sha256"):
        raise ValueError("CARE readings and book metadata must describe the same published export.")
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
    care_readings, seen_readings, layer_indexes, detail_paths = [], set(), {}, {}
    for item in readings_manifest.get("pages", []):
        book = book_by_id.get(item.get("work_id"))
        if not book:
            raise ValueError("A CARE reading must belong to a published book.")
        canonical = _url(item["url"], origin)
        kind, layer = item.get("kind"), item.get("layer")
        if kind == "overview":
            if book.get("care_readings_url"):
                raise ValueError("A book must have one CARE reading overview.")
            book["care_readings_url"] = canonical
            path = Path(item["path"])
            index_path = path.with_name("index.json")
            index_url = item["url"] + "index.json"
            if (path.is_absolute() or path.parts[:1] != ("books",) or path.name != "index.html"
                    or path.parent.name != "readings" or any(part in {".", ".."} for part in path.parts)
                    or item.get("index_path") != index_path.as_posix() or item.get("index_url") != index_url):
                raise ValueError("The per-book discovery index needs its exact registered metadata route.")
            target = destination / index_path
            if target.is_symlink() or not target.resolve().is_relative_to(destination):
                raise ValueError("The per-book discovery index must remain inside the generated book directory.")
            detail_paths[item["work_id"]] = target
            book["details_index"] = _url(index_url, origin)
            for field in ("summary_text_url","summary_data_url","summary_plaintext_url"):
                if item.get(field):book[field]=_url(item[field],origin)
        elif kind == "layer":
            key = item["work_id"], layer
            if layer not in CARE_LAYERS or key in layer_indexes:
                raise ValueError("Invalid or duplicate published CARE layer.")
            layer_indexes[key] = {"layer": layer, "label": CARE_LAYERS[layer], "url": canonical}
        elif kind == "reading":
            identity = item.get("unit_id")
            key = item["work_id"], identity
            if layer not in CARE_LAYERS or not isinstance(identity, str) or not identity or key in seen_readings:
                raise ValueError("Invalid or duplicate saved CARE reading identity.")
            seen_readings.add(key)
            record = {"type": "saved_care_reading", "work_id": item["work_id"], "unit_id": identity,
                      "layer": layer, "title": item["title"], "url": canonical, "book_url": book["url"],
                      "content_origin": "saved_ai_assisted_interpretation",
                      "citation": {"url": canonical, "care_unit_id": identity, "layer": layer,
                                   "attribution": "CARE Library saved AI-assisted interpretation",
                                   "of_work": book["title"], "work_author": book["author"]}}
            for field in ("source_id", "revision", "content_sha256", "item_count", "section_count", "language", "language_name", "rendition_languages"):
                if item.get(field) is not None and item.get(field) != "":
                    record[field] = item[field]
            text = item.get("markdown_url") or item.get("text_url")
            if item.get('plaintext_url'):
                record['plain_text_url']=_url(item['plaintext_url'],origin)
                record['plain_text_format']='text/plain'
            if text:
                record["text_url"] = _url(text, origin)
                record["text_format"] = "text/markdown"
            data = item.get("json_url") or item.get("packet_url")
            if data:
                record["data_url"] = _url(data, origin)
                record["data_format"] = "application/json"
                record["data_schema"] = "care-reading-packet/1"
            care_readings.append(record)
        else:
            raise ValueError("Unknown published CARE reading page kind.")
    for book in books:
        saved = [item for item in care_readings if item["work_id"] == book["work_id"]]
        if saved and not book.get("care_readings_url"):
            raise ValueError("Saved CARE readings need a discoverable book overview.")
        book["care_reading_count"] = len(saved)
        book["care_layers"] = []
        for layer in CARE_LAYERS:
            layer_readings = [item for item in saved if item["layer"] == layer]
            if not layer_readings:
                continue
            index = layer_indexes.get((book["work_id"], layer))
            if not index:
                raise ValueError("Saved CARE readings need a discoverable layer index.")
            book["care_layers"].append({**index, "reading_count": len(layer_readings)})
        whole = [item for item in saved if item["layer"] == "WB"]
        if len(whole) == 1:
            book["whole_book_reading_url"] = whole[0]["url"]
            if whole[0].get("text_url"):
                book["whole_book_reading_text_url"] = whole[0]["text_url"]
            if whole[0].get("data_url"):
                book["whole_book_reading_data_url"] = whole[0]["data_url"]
            if whole[0].get('plain_text_url'):
                book['whole_book_reading_plain_text_url']=whole[0]['plain_text_url']
        else:
            for field in ("summary_text_url","summary_data_url","summary_plaintext_url"):
                book.pop(field,None)
        source_sections = [item for item in chapters if item["work_id"] == book["work_id"]]
        book["source_section_count"] = len(source_sections)
        if book["work_id"] not in detail_paths:
            raise ValueError("Every published book needs a registered research details index.")
        details = {
            "schema": BOOK_SCHEMA, "url": book["details_index"], "book": book,
            "scope": {"source_sections": len(source_sections), "care_readings": len(saved)},
            "content_distinction": "Original source sections and saved AI-assisted CARE readings are separately identified editions.",
            "access": "This index contains public citation/navigation metadata, not reading prose. Full original text and saved CARE HTML, Markdown and JSON packets follow the website's current beta access setting.",
            "provenance": {"book_export_sha256": books_manifest["source_sha256"]},
            "source_sections": source_sections, "care_readings": saved,
        }
        detail_paths[book["work_id"]].parent.mkdir(parents=True, exist_ok=True)
        detail_paths[book["work_id"]].write_text(
            json.dumps(details, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")
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
        "scope": {"books": len(books), "source_sections": len(chapters), "care_readings": len(care_readings), "demons": len(demons)},
        "access": {"metadata": "public", "original_source_text": "Available on chapter pages when the library is in public mode; beta access rules still apply.",
                   "saved_care_text": "Preferred plain text, HTML and full Markdown/JSON reading records are available in public mode.",
                   "private_studio_drafts": "not included"},
        "provenance": {"book_export_sha256": books_manifest.get("source_sha256", ""),
                       "numogram_reference_sha256": numo_manifest.get("public_reference_sha256", "")},
        "citation_guidance": "Cite original-source quotations with source-section URLs and CARE analysis with canonical saved-reading URLs and unit/claim IDs. Keep edition and saved-rendition details in a compact source note.",
        "details_schema": BOOK_SCHEMA,
        "details_guidance": "Book pages orient the work and link its original sections. CH readings retain close textual detail, MC/CL trace the argument's organisation, and WB gives the whole-book structural interpretation. Each book's details_index supplies exact source and claim citations; WB reading JSON also links individual recorded source trails.",
        "books": books, "demons": demons,
    }
    encoded = json.dumps(records, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n"
    (destination / "research-index.json").write_text(encoded, encoding="utf-8")
    guide = ["# CARE Library and NUMO", "",
             "> A reading environment for tracing original texts, arguments and recorded connections, with an interactive Numogram and its attributed CCRU demon reference.", "",
             "Book pages introduce the work and link its original sections. Chapter readings retain its close textual detail; whole-book readings offer a structural interpretation of the argument. A preferred plain-text reading contains the complete saved English rendition where available, otherwise the canonical saved rendition, with section headings, claim IDs and citation links. Markdown and structured JSON retain the full multilingual record and source connections.", "",
             "AI-assisted CARE interpretations are separate editions from the original source texts. Edition and rendition details belong in a short source note. Plain text and readable HTML require no JavaScript in public mode; the indexes supply navigation and citation metadata.", "",
             "## Research entry points", "",
             _link("Machine-readable research index", origin + "/research-index.json", "Canonical URLs, original authors, exact source IDs, saved CARE unit/layer IDs and plain-text reading URLs."),
             _link("Books by title and author", origin + "/books/"),
             _link("Numogram", origin + "/numogram/", "The map, zones, currents, gates and linked demon records."),
             _link("Sitemap", origin + "/sitemap.xml"), "",
             "## Reading and summarising a work", "",
             "- WB covers the central problem, thesis, key moves, concept connections, tensions and open questions. The preferred plain-text edition supports continuous reading.",
             "- MC (macro/metacluster) and CL (cluster) trace the argument's organisation; CH supplies detailed chapter claims and distinctions.",
             "- Original source sections support quotations. Stable reading URLs and claim IDs support precise attribution of CARE's interpretations.",
             "- WB claim records link bounded recorded source trails through the saved lower-layer references to available original passage anchors. These preserve each terminal alignment type and distinguish inherited paths from direct passage alignments.",
             "- Edition and saved-rendition details fit in a compact source note; Markdown and JSON retain the full record.", "", "## Books", ""]
    for book in books:
        label = book["title"] + " — " + book["author"]
        guide.append(_link(label, book["url"]))
        preferred=book.get('summary_plaintext_url') or book.get('whole_book_reading_plain_text_url')
        if preferred:
            guide.append(_link(label+': whole-book CARE summary — preferred plain text',preferred,'Complete preferred saved rendition with section headings and exact claim citations.'))
        if book.get("care_readings_url"):
            guide.append(_link(label + ": saved CARE readings", book["care_readings_url"], "Overview of available saved interpretations, grouped by level."))
        guide.append(_link(label + ": research details JSON", book["details_index"], "All original source-section citations and saved CARE unit/layer identities for this book."))
        if book.get("summary_text_url"):
            guide.append(_link(label + ": whole-book CARE summary — full Markdown record",book["summary_text_url"],"Complete multilingual record and saved source connections."))
        if book.get("summary_data_url"):
            guide.append(_link(label + ": whole-book CARE summary — structured JSON",book["summary_data_url"],"The same saved CARE packet, with its exact unit citation and recorded evidence fields."))
        if book.get("whole_book_reading_url"):
            guide.append(_link(label + ": whole-book CARE reading (WB)", book["whole_book_reading_url"], "Saved whole-book interpretation in the reading interface."))
        if book.get("whole_book_reading_text_url"):
            guide.append(_link(label + ": WB full Markdown record", book["whole_book_reading_text_url"]))
        if book.get("whole_book_reading_data_url"):
            guide.append(_link(label + ": WB structured saved-reading JSON", book["whole_book_reading_data_url"], "Complete saved sections, claim IDs, rendition labels and recorded evidence fields; this contains the reading, unlike the metadata-only research index."))
        for layer in book["care_layers"]:
            if layer["layer"] != "WB" or not book.get("whole_book_reading_url"):
                guide.append(_link(label + ": " + layer["label"] + " (" + layer["layer"] + ")", layer["url"], str(layer["reading_count"]) + " saved readings."))
    guide += ["", "## Numogram demons", ""]
    guide += [_link(demon["name"], demon["url"], demon["demon_id"] + "; net-span " + "::".join(map(str, demon["net_span"]))) for demon in demons]
    guide += ["", "## Optional", "", _link("About CARE", origin + "/about.html"),
              _link("Request beta access", origin + "/request-access.html"), ""]
    (destination / "llms.txt").write_text("\n".join(guide), encoding="utf-8")
    return records


if __name__ == "__main__":
    build(Path(__file__).resolve().parents[1])
