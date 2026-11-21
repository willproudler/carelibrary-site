"""Deterministic reading copies of attested public original-source sections.

The caller verifies the public catalogue. This module never reads private book
files, selects translations, generates prose, or claims to create a .care book.
"""
from __future__ import annotations

import hashlib
from html import escape
from io import BytesIO
import json
from pathlib import Path
import re
from urllib.parse import quote, urlsplit
from xml.etree import ElementTree as ET
import zipfile

from source_document_exports import print_edition, word_edition

_XHTML = "http://www.w3.org/1999/xhtml"
_EPUB = "http://www.idpf.org/2007/ops"
_FORMATS = (("txt", "text/plain"), ("md", "text/markdown"), ("epub", "application/epub+zip"), ("pdf", "application/pdf"),
            ("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
_NOTICE_FIELDS = (("provider", "Source provider"), ("source_url", "Source edition"),
                  ("licence", "Licence"), ("statement", "Source rights statement"),
                  ("attribution", "Source attribution"), ("evidence_url", "Rights reference"))
_STYLE = """
body { margin: 5%; font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
       font-kerning: normal; font-variant-ligatures: common-ligatures; line-height: 1.58; }
h1, h2 { line-height: 1.18; font-weight: 600; break-after: avoid; }
.title { margin: 3em 0 3em; text-align: center; }
.title h1 { margin: 0 0 .45em; font-size: 1.84em; letter-spacing: -.025em; text-wrap: balance; }
.byline { margin: 0; font-style: normal; }
h2 { font-size: 1.3em; margin: 2em 0 1em; }
.source-text p { margin: 0; white-space: pre-wrap; text-align: justify; text-align-last: start;
                 -webkit-hyphens: auto; hyphens: auto; orphans: 2; widows: 2; }
.source-text p + p { text-indent: 1.2em; }
.source-text p.lineated { text-align: start; text-indent: 0; hyphens: manual; }
"""


def _line(value) -> str:
    return " ".join(value.split()) if isinstance(value, str) else ""


def _language(value) -> str:
    value = _line(value).replace("_", "-")
    return value if re.fullmatch(r"[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*", value) else "und"


def _xml_text(value: str) -> None:
    if any(not (char in "\t\n\r" or 0x20 <= ord(char) <= 0xD7FF
                or 0xE000 <= ord(char) <= 0xFFFD or 0x10000 <= ord(char) <= 0x10FFFF)
           for char in value):
        raise ValueError("A saved source contains characters unsupported by XML; no source edition was written.")


_TEI_PAGE = re.compile(r"<!-- CARE_TEI_PAGE (\{[^<>\r\n]+\}) -->")
_SCAN_LINK = re.compile(r"\[(Source scan [0-9]+(?: · printed page [0-9]+)?)\]\((https?://[^()<>\s]+)\)")
_MERGED_SOURCE = re.compile(r"<!-- CARE merged source: ([\w.-]+\.md); title: ([^<>\r\n]+?); sequence: ([0-9]+) -->")
_PDF_REGION = re.compile(r"\[(Visual material: PDF page [0-9]+, region [0-9]+)\]")
# Exact standalone running heads in the published 1939 transcription and its saved translation.
_BERGSON_RUNNING_HEAD = re.compile(
    r"Henri Bergson, (?:Matière et mémoire\. Essai sur la relation du corps à l’esprit\.|"
    r"Matter and Memory\. (?:An )?Essay on the Relation of (?:the )?Body to (?:the )?(?:Mind|Spirit)\.)"
    r" \(1939\) [0-9]+", re.IGNORECASE,
)
_SOURCE_HEADING = re.compile(r"^ {0,3}(#{1,6})[ \t]+(.+?)\s*$")
_FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")


def source_reading_blocks(text: str, *, work_id="") -> tuple[list[tuple[int, str, str]], list[tuple[int, str, str]]]:
    """Return (heading level, wording, separator) and located source-navigation notes.

    Only the documented, explicit source tokens are interpreted. Code fences,
    unknown references and text on either side of an inline marker remain literal.
    """
    blocks, notes, prose = [], [], []
    fence = ""
    at_start = True

    def finish_prose():
        if not prose:
            return
        value = "".join(prose)
        prose.clear()
        leading = re.match(r"(?:[ \t]*\r?\n)+", value)
        if leading:
            if blocks:
                level, previous, after = blocks[-1]
                blocks[-1] = level, previous, after + leading[0]
            value = value[leading.end():]
        parts = re.split(r"(\r?\n(?:[ \t]*\r?\n)+)", value)
        for index in range(0, len(parts), 2):
            wording = parts[index]
            separator = parts[index + 1] if index + 1 < len(parts) else ""
            if wording.strip():
                blocks.append((0, wording, separator))
            elif blocks:
                level, previous, after = blocks[-1]
                blocks[-1] = level, previous, after + wording + separator

    def move_page(match):
        try:
            marker = json.loads(match[1])
        except ValueError:
            return match[0]
        if (isinstance(marker, dict) and set(marker) == {"n", "facs"}
                and isinstance(marker["n"], str) and re.fullmatch(r"(?:[0-9]+|\[[0-9]+\])", marker["n"])
                and isinstance(marker["facs"], str) and re.fullmatch(r"#[\w.-]+", marker["facs"])):
            notes.append((line_number, "Page " + marker["n"] + " · facsimile " + marker["facs"], ""))
            return ""
        return match[0]

    lines = text.splitlines(keepends=True)
    for line_number, raw in enumerate(lines, 1):
        line = raw.rstrip("\r\n")
        newline = raw[len(line):]
        delimiter = _FENCE.fullmatch(line)
        if fence or delimiter:
            prose.append(raw)
            if not fence:
                fence = delimiter[1]
            elif delimiter and delimiter[1].startswith(fence) and not delimiter[2].strip():
                fence = ""
            at_start = False
            continue

        if line.startswith(("    ", "\t")) or "`" in line:
            prose.append(raw)
            at_start = False
            continue
        if "<!-- CARE_TEI_PAGE " in line:
            original = line
            line = _TEI_PAGE.sub(move_page, line)
            if not line.strip() and line != original:
                continue
        literal = line.strip()
        if scan := _SCAN_LINK.fullmatch(literal):
            try:
                url = urlsplit(scan[2])
                safe = bool(url.hostname and url.username is None and url.password is None)
            except ValueError:
                safe = False
            if safe:
                notes.append((line_number, scan[1], scan[2]))
                continue
        if merged := _MERGED_SOURCE.fullmatch(literal):
            notes.append((line_number, f"Source {merged[3]} · {merged[2]} · {merged[1]}", ""))
            continue
        region = _PDF_REGION.fullmatch(literal)
        entire_block = at_start and (line_number == len(lines) or not lines[line_number].strip())
        if (entire_block and work_id == "WORK_MATIERE_ET_MEMOIRE_HENRI_BERGSON"
                and _BERGSON_RUNNING_HEAD.fullmatch(literal)):
            notes.append((line_number, literal, ""))
            continue
        if region or (literal in {"Retour à la table des matières", "Return to the table of contents"} and entire_block):
            notes.append((line_number, region[1] if region else literal, ""))
            continue
        heading = _SOURCE_HEADING.fullmatch(line) if at_start else None
        if heading:
            finish_prose()
            wording = re.sub(r"[ \t]+#+[ \t]*$", "", heading[2])
            blocks.append((max(2, len(heading[1])), wording, newline))
        else:
            prose.append(line + newline)
        at_start = bool(heading) or not literal
    finish_prose()
    return blocks, notes


def _chapters(work: dict) -> list[dict]:
    sources = work.get("sources")
    if not isinstance(sources, list) or not sources:
        return []
    chapters = []
    # Array order is the published source order, shared with the reading pages.
    for source in sources:
        if not isinstance(source, dict):
            return []
        body = source.get("text")
        if not isinstance(body, str) or not body.strip():
            paragraphs = source.get("paragraphs")
            if (not isinstance(paragraphs, list) or not paragraphs
                    or any(not isinstance(row, dict) or not isinstance(row.get("text"), str)
                           or not row["text"].strip() for row in paragraphs)):
                return []
            body = "\n\n".join(row["text"] for row in paragraphs)
        blocks, notes = source_reading_blocks(body, work_id=work.get("id"))
        title = _line(source.get("original_title")) or _line(source.get("title"))
        author = _line(work.get("author")).casefold()
        bylines = {prefix + author for prefix in ("", "by ", "par ", "von ", "di ", "por ")} if author else set()
        duplicate_author = not chapters and any(_line(source.get(key)).casefold() in bylines
                                                for key in ("title", "original_title"))
        has_opening_heading = bool(blocks and blocks[0][0])
        heading = "" if duplicate_author or has_opening_heading else title
        navigation = "" if duplicate_author else title
        if not navigation and has_opening_heading:
            navigation = blocks[0][1]
        chapters.append({"id": _line(source.get("id")), "title": title, "heading": heading,
                         "navigation": navigation or f"Section {len(chapters) + 1}",
                         "text": body, "blocks": blocks, "notes": notes,
                         "language": _language(source.get("language_code") or work.get("language_code"))})
    return chapters


def _metadata(work: dict, canonical: str) -> list[tuple[str, str]]:
    facts = [("Author", _line(work.get("author"))), ("Edition", _line(work.get("edition"))),
             ("Language", _line(work.get("language_name")) or _language(work.get("language_code"))),
             ("Reading", canonical)]
    rendition = work.get('source_language_edition')
    if rendition:
        facts.append(('Translation', 'Saved ' + ('machine translation' if rendition.get('rendition_type') == 'machine' else 'translation')
                      + ' · ' + rendition['language_name'] + ' · review: ' + (rendition.get('review_status') or 'unspecified')))
    notices = work.get("source_notices")
    notices = notices if isinstance(notices, dict) else {}
    if _line(work.get("source_url")) and not _line(notices.get("source_url")):
        facts.append(("Source edition", _line(work["source_url"])))
    facts.extend((label, _line(notices.get(key))) for key, label in _NOTICE_FIELDS)
    return [(label, value) for label, value in facts if value]


def _markdown(value: str) -> str:
    # Text is literal source wording, never active HTML or a Markdown program.
    value = escape(value, quote=False)
    return re.sub(r"([\\`*_{}\[\]()#+.!|>-])", r"\\\1", value)


def _text(work: dict, chapters: list[dict], facts: list[tuple[str, str]], *, markdown=False) -> bytes:
    label = _markdown if markdown else lambda value: value
    title = label(_line(work.get("title")) or "Source text")
    author = label(_line(work.get("author")))
    lines = [("# " if markdown else "") + title]
    if author:
        if markdown:
            lines.append("")
        lines.append(author)
    for chapter in chapters:
        lines.append("")
        if chapter["heading"]:
            lines.extend([("## " if markdown else "") + label(chapter["heading"]), ""])
        lines.append("".join(("#" * level + " " if markdown and level else "") + label(wording) + after
                             for level, wording, after in chapter["blocks"]))
    if any(chapter["notes"] for chapter in chapters):
        lines.extend(["", ("## " if markdown else "") + "Source references"])
        for chapter in chapters:
            if chapter["notes"]:
                lines.extend(["", ("### " if markdown else "") + label(chapter["navigation"])])
                for number, wording, url in chapter["notes"]:
                    reference = label(wording)
                    if url:
                        reference = f"[{reference}](<{url}>)" if markdown else reference + " — " + url
                    lines.append(f"Line {number} · {reference}")
    # Keep supplied attribution and rights notices with the copy, after the text.
    notices = [label(value) for name, value in facts if name in {"Source rights statement", "Licence", "Source attribution", "Translation"}]
    if notices:
        lines.extend(["", *notices])
    return ("\n".join(lines) + "\n").encode("utf-8")


def _xhtml(title: str, language: str, children: list[ET.Element]) -> bytes:
    root = ET.Element("html", {"xmlns": _XHTML, "xmlns:epub": _EPUB,
                              "lang": language, "xml:lang": language})
    if language.split("-", 1)[0].lower() in {"ar", "fa", "he", "ur", "yi"}:
        root.set("dir", "rtl")
    head = ET.SubElement(root, "head")
    ET.SubElement(head, "title").text = title
    ET.SubElement(head, "link", {"rel": "stylesheet", "type": "text/css", "href": "style.css"})
    body = ET.SubElement(root, "body")
    body.extend(children)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def _epub(work: dict, chapters: list[dict], facts: list[tuple[str, str]]) -> bytes:
    title = _line(work.get("title")) or "Source text"
    author = _line(work.get("author"))
    language = _language(work.get("language_code"))
    identity = hashlib.sha256(json.dumps({"title": title, "author": author, "language": language,
                                         "facts": facts, "chapters": chapters}, ensure_ascii=False,
                                        sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    entries = {
        "META-INF/container.xml": (b'<?xml version="1.0" encoding="utf-8"?>'
            b'<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
            b'<rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>'
            b'</rootfiles></container>'),
        "EPUB/style.css": _STYLE.encode(),
    }
    nav = ET.Element("nav", {"epub:type": "toc", "id": "toc"})
    ET.SubElement(nav, "h1").text = title
    ET.SubElement(nav, "p").text = author
    links = ET.SubElement(nav, "ol")
    for index, chapter in enumerate(chapters, 1):
        filename = f"chapter-{index}.xhtml"
        children = []
        if index == 1:
            opening = ET.Element("header", {"class": "title"})
            ET.SubElement(opening, "h1").text = title
            if author:
                ET.SubElement(opening, "p", {"class": "byline"}).text = author
            translation = next((v for k,v in facts if k == 'Translation'), '')
            if translation:
                ET.SubElement(opening, 'p', {'class':'edition'}).text = translation
            children.append(opening)
        if chapter["heading"]:
            heading = ET.Element("h2")
            heading.text = chapter["heading"]
            children.append(heading)
        body = ET.Element("div", {"class": "source-text"})
        for level, wording, separator in chapter["blocks"]:
            block = ET.SubElement(body, f"h{level}" if level else "p")
            block.text, block.tail = wording, separator
            if not level and ("\n" in wording or wording.startswith((" ", "\t"))):
                block.set("class", "lineated")
        children.append(body)
        navigation_title = chapter["navigation"]
        entries["EPUB/" + filename] = _xhtml(navigation_title, chapter["language"], children)
        ET.SubElement(ET.SubElement(links, "li"), "a", {"href": filename}).text = navigation_title
    notes_page = any(chapter["notes"] for chapter in chapters)
    if notes_page:
        heading = ET.Element("h1")
        heading.text = "Source references"
        children = [heading]
        for chapter in chapters:
            if not chapter["notes"]:
                continue
            group = ET.Element("section")
            ET.SubElement(group, "h2").text = chapter["navigation"]
            items = ET.SubElement(group, "ul")
            for number, wording, url in chapter["notes"]:
                item = ET.SubElement(items, "li")
                item.text = f"Line {number} · "
                if url:
                    ET.SubElement(item, "a", {"href": url}).text = wording
                else:
                    item.text += wording
            children.append(group)
        entries["EPUB/references.xhtml"] = _xhtml("Source references", language, children)
        ET.SubElement(ET.SubElement(links, "li"), "a", {"href": "references.xhtml"}).text = "Source references"
    entries["EPUB/nav.xhtml"] = _xhtml("Contents", language, [nav])
    package = ET.Element("package", {"xmlns": "http://www.idpf.org/2007/opf", "version": "3.0",
                                     "unique-identifier": "book-id"})
    metadata = ET.SubElement(package, "metadata", {"xmlns:dc": "http://purl.org/dc/elements/1.1/"})
    ET.SubElement(metadata, "dc:identifier", {"id": "book-id"}).text = "urn:sha256:" + identity
    ET.SubElement(metadata, "dc:title").text = title
    if author:
        ET.SubElement(metadata, "dc:creator").text = author
    for code in dict.fromkeys([language, *(chapter["language"] for chapter in chapters)]):
        ET.SubElement(metadata, "dc:language").text = code
    ET.SubElement(metadata, "dc:description").text = next((v for k,v in facts if k=="Translation"), "Reading copy of the published source edition.")
    for name, value in facts:
        if name in {"Source rights statement", "Licence", "Source attribution"}:
            ET.SubElement(metadata, "dc:rights").text = name + ": " + value
        elif name == "Source edition":
            ET.SubElement(metadata, "dc:source").text = value
    ET.SubElement(metadata, "meta", {"property": "dcterms:modified"}).text = "2000-01-01T00:00:00Z"
    manifest = ET.SubElement(package, "manifest")
    ET.SubElement(manifest, "item", {"id": "nav", "href": "nav.xhtml", "media-type": "application/xhtml+xml", "properties": "nav"})
    ET.SubElement(manifest, "item", {"id": "style", "href": "style.css", "media-type": "text/css"})
    spine = ET.SubElement(package, "spine")
    for index in range(1, len(chapters) + 1):
        ET.SubElement(manifest, "item", {"id": f"chapter-{index}", "href": f"chapter-{index}.xhtml", "media-type": "application/xhtml+xml"})
        ET.SubElement(spine, "itemref", {"idref": f"chapter-{index}"})
    if notes_page:
        ET.SubElement(manifest, "item", {"id": "references", "href": "references.xhtml", "media-type": "application/xhtml+xml"})
        ET.SubElement(spine, "itemref", {"idref": "references"})
    entries["EPUB/package.opf"] = ET.tostring(package, encoding="utf-8", xml_declaration=True)
    output = BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name, contents in [("mimetype", b"application/epub+zip"), *entries.items()]:
            entry = zipfile.ZipInfo(name, date_time=(2000, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            entry.compress_type = zipfile.ZIP_STORED if name == "mimetype" else zipfile.ZIP_DEFLATED
            archive.writestr(entry, contents, compresslevel=6)
    return output.getvalue()


def axiom_appendix(work, code, origin, route_slug):
    """Use only the recorded axiom section of one unambiguous whole-book sheet."""
    whole = [unit for unit in work.get("units", []) if unit.get("layer") == "WB"]
    if len(whole) != 1:
        return None
    unit = whole[0]
    candidates = [
        section for section in unit.get("sections", [])
        if any(_line(section.get(key)).casefold() == "global load-bearing axioms"
               for key in ("name", "original_name"))
    ]
    if len(candidates) != 1:
        return None
    originals = candidates[0].get("items") or []
    original_ids = [item.get("id") for item in originals]
    if not original_ids or not all(original_ids) or len(set(original_ids)) != len(original_ids):
        return None
    if code == unit.get("language_code"):
        chosen = unit
    else:
        options = [
            row for row in unit.get("translations", [])
            if row.get("language_code") == code and not row.get("translate_quotations")
            and (not row.get("source_sha256") or row["source_sha256"] == unit.get("sha256"))
        ]
        if len(options) != 1:
            return None
        chosen = options[0]
    # Match the saved section by its canonical item identities. Its title can
    # legitimately be translated, but every recorded axiom must match once.
    matches = [
        section for section in chosen.get("sections", [])
        if set(original_ids) == {row.get("id") for row in section.get("items", [])}
        and len(original_ids) == len(section.get("items", []))
    ]
    if len(matches) != 1:
        return None
    wording = {row["id"]: row.get("text") for row in matches[0]["items"]}
    if any(not _line(wording[key]) for key in original_ids):
        return None
    from reading_seo import unit_url
    url = origin.rstrip("/") + unit_url(route_slug, unit)
    heading = "Appendix · Saved CARE axioms"
    label = "CARE commentary on the whole book. " + (chosen.get("language_name") or code)
    label += " · " + (chosen.get("rendition_type") or "canonical saved reading") + "."
    blocks = [(0, label, "\n\n"), (0, unit.get("revision") or unit["id"], "\n\n"), (0, url, "\n\n")]
    for key in original_ids:
        blocks.extend([(2, key, "\n"), (0, wording[key], "\n\n")])
    return {
        "title": heading, "heading": heading, "navigation": heading, "id": unit["id"], "language": code,
        "text": "\n".join(block[1] for block in blocks), "notes": [], "blocks": blocks, "commentary_appendix": True,
    }


def build_source_editions(work: dict, book_slug: str, route_slug: str,
                          output_dir: Path, origin: str, *, appendix=None) -> list[dict]:
    """Write complete original-language editions beneath a staged books root.

    Output declarations use web-root-relative paths and canonical download URLs.
    The source array is one published edition: translations are never combined
    with it, and a missing section prevents all complete-edition downloads.
    """
    if not re.fullmatch(r"[\w-]+", book_slug) or not re.fullmatch(r"[a-z0-9]+", route_slug):
        raise ValueError("Source download paths require safe published book routes.")
    parsed = urlsplit(origin)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in {"", "/"} or parsed.query or parsed.fragment
            or any(ord(char) <= 32 for char in origin)):
        raise ValueError("Source editions require an explicit HTTPS origin.")
    chapters = _chapters(work)
    if not chapters:
        return []
    language = work.get('source_language_edition', {}).get('language_code')
    if language and (language != _language(language).lower() or len(language)>63):
        raise ValueError('Invalid source edition language.')
    canonical = origin.rstrip('/') + '/' + route_slug + ('/language/' + language + '/' if language else '')
    facts = _metadata(work, canonical)
    if appendix:
        chapters.append(appendix)
    for value in [_line(work.get("title")), _line(work.get("author")),
                  *(part for fact in facts for part in fact),
                  *(chapter[key] for chapter in chapters for key in ("title", "text"))]:
        _xml_text(value)
    payloads = {"epub": _epub(work, chapters, facts), "pdf": print_edition(work, chapters, facts)}
    if not appendix:
        payloads.update(txt=_text(work,chapters,facts), md=_text(work,chapters,facts,markdown=True),
                        docx=word_edition(work,chapters,facts))
    root = Path(output_dir).absolute()
    prefix = Path(book_slug) / 'downloads'
    if language:
        prefix /= language
    stem = 'source-with-axioms' if appendix else 'source'
    directory = root / prefix
    if root.is_symlink() or any(path.is_symlink() for path in (directory, *directory.parents) if path.is_relative_to(root)):
        raise ValueError("Source downloads must not replace symbolic links.")
    if not directory.resolve().is_relative_to(root.resolve()):
        raise ValueError("Source download paths must remain beneath the books root.")
    destinations = {kind: directory / (stem + "." + kind) for kind in payloads}
    if any(path.is_symlink() or path.exists() and not path.is_file() for path in destinations.values()):
        raise ValueError("Source downloads must replace regular generated files only.")
    directory.mkdir(parents=True, exist_ok=True)
    declarations = []
    for kind, media_type in _FORMATS:
        if kind not in payloads:
            continue
        payload = payloads[kind]
        destinations[kind].write_bytes(payload)
        declarations.append({"format": kind, "path": f"books/{prefix.as_posix()}/{stem}.{kind}",
                             "url": canonical.removeprefix(origin.rstrip("/")).rstrip("/") + f"/downloads/{stem}.{kind}",
                             "media_type": media_type, "sha256": hashlib.sha256(payload).hexdigest(),
                             "bytes": len(payload)})
    return declarations


def book_edition_downloads(work, definitions, book_slug, route_slug, output_dir, origin):
    """Build each complete source edition and any separately selected commentary."""
    records = {}
    for definition in definitions:
        code = definition['language_code']
        edition = definition.get('work') or work
        files = build_source_editions(edition, book_slug, route_slug, output_dir, origin)
        records[code] = {'downloads': files}
        appendix = axiom_appendix(work,code,origin,route_slug) if files else None
        if appendix:
            records[code]['axiom_downloads'] = build_source_editions(
                edition,book_slug,route_slug,output_dir,origin,appendix=appendix)
    return records
