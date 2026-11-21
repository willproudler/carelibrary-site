"""A quiet source document with optional, local reading controls.

The source is present in ordinary HTML. A small inline enhancement manages the
contents rail and optional reading aids; it never loads the CARE application.
"""
from __future__ import annotations

from functools import lru_cache
from html import escape
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

TOOLS = Path(__file__).resolve().parent
BOOK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v14.5a2.7 2.7 0 0 0-2-1H6.5A2.5 2.5 0 0 1 4 16V5.5Zm16 0A2.5 2.5 0 0 0 17.5 3H15a2 2 0 0 0-2 2v14.5a2.7 2.7 0 0 1 2-1h2.5A2.5 2.5 0 0 0 20 16V5.5Z"/></svg>'
CONTENTS_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h16v16H4zM9 4v16M12 8h5m-5 4h5m-5 4h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
PAGES_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="6" height="8" rx="1"/><rect x="4" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="6" height="7" rx="1"/></svg>'
TOOLS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 7h6m4 0h8M3 17h10m4 0h4"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg>'
MINIMIZE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10m0-10L5 15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'


# Without scripting, the same title precedes the uninterrupted, selectable edition.
NOSCRIPT_STYLE = (
    '.js-control,.reader-progress,.nav-tabs,.contents-search,.panel-close{display:none!important}'
    '.source-reader #reader-panel-tools[hidden]{display:block!important}.source-reader .contents-panel{overflow:auto}'
    '[data-reader-opening]{margin-bottom:1.5rem}'
    '[data-reader-opening] .page-slot{width:min(100%,168mm);height:auto;aspect-ratio:210/297;container-type:inline-size}'
    '[data-reader-opening] .reading-page{width:100%!important;height:100%!important;transform:none}'
    '[data-reader-opening] .page-content{padding:8% 10%}'
    '[data-reader-opening] .document-title[data-title-page]{padding:0}'
    '[data-reader-opening] .book-title{max-width:56.45cqw;font-size:4.4cqw}'
    '[data-reader-opening] .book-author{font-size:1.976cqw;margin-top:1.915cqw}'
)


def _language(value) -> str:
    return value if isinstance(value, str) and re.fullmatch(r"[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*", value) else "und"


def _section_heading(title: str) -> str:
    # Split only an actual numbered chapter heading with a title after it.
    match = re.fullmatch(r'(chapter\s+(?:[0-9]+|[ivxlcdm]+)\b(?:[.:]\s*|\s+[—–-]\s+|\s+))(\S.*)', title, re.I | re.S)
    if match:
        return '<span class="source-chapter-number">' + escape(match[1]) + '</span>' + escape(match[2])
    return escape(title)


def _inline(text: str) -> str:
    """Typeset saved Markdown links/headings without accepting source HTML."""
    result, cursor = [], 0
    pattern = re.compile(r'\[([^\]\n]+)\]\(([^\s)]+)\)')
    for match in pattern.finditer(text):
        result.append(escape(text[cursor:match.start()]))
        label, url = match.groups()
        parsed = urlsplit(url)
        safe = (parsed.scheme in {'https', 'http'} and parsed.hostname and not parsed.username and not parsed.password
                or url.startswith('#') and not any(ord(char) < 32 for char in url))
        result.append('<a href="' + escape(url, quote=True) + '">' + escape(label) + '</a>' if safe else escape(match[0]))
        cursor = match.end()
    result.append(escape(text[cursor:]))
    return ''.join(result)


def _blocks(text: str) -> str:
    blocks = re.split(r'\r?\n[ \t]*\r?\n', text.strip('\r\n'))
    output = []
    for block in blocks:
        if not block.strip():
            continue
        lines = block.splitlines()
        # Only standalone author/export headings become headings. Prose,
        # numbering, Greek, poetry and literal tags retain their own wording.
        if len(lines) == 1 and (heading := re.fullmatch(r'\s*#{1,6}\s+(.+?)\s*#*\s*', block)):
            output.append('<h3 class="source-subheading">' + _inline(heading[1]) + '</h3>')
        else:
            lineated = len(lines) > 1 or block.startswith((' ', '\t'))
            output.append(('<p class="lineated">' if lineated else '<p>') + _inline(block) + '</p>')
    return ''.join(output)


def _source_body(source: dict) -> str:
    from book_seo import _source_text
    text = _source_text(source)
    paragraphs = source.get('paragraphs')
    paragraphs = [p for p in paragraphs if isinstance(p, dict) and isinstance(p.get('id'), str)
                  and p['id'] and isinstance(p.get('text'), str) and p['text']] if isinstance(paragraphs, list) else []
    exact, cursor, seen = [], 0, set()
    for paragraph in paragraphs:
        position = text.find(paragraph['text'], cursor)
        if paragraph['id'] in seen or position < 0 or text[cursor:position].strip():
            exact = []
            break
        seen.add(paragraph['id'])
        exact.append((paragraph['id'], paragraph['text']))
        cursor = position + len(paragraph['text'])
    if text[cursor:].strip():
        exact = []
    segments = exact or [(None, paragraph) for paragraph in re.split(r'\r?\n[ \t]*\r?\n', text) if paragraph.strip()]
    output = []
    for index, (identity, value) in enumerate(segments, 1):
        attrs = ' class="source-passage"'
        if identity:
            attrs += ' id="' + escape('ref=' + identity, quote=True) + '" data-passage-id="' + escape(identity, quote=True) + '"'
            marker = '<a class="passage-marker" href="#' + escape('ref=' + identity, quote=True) + '" data-passage-number="' + str(index) + '" aria-label="' + escape('Passage ' + str(index) + ': ' + identity, quote=True) + '"></a>'
        else:
            marker = '<span class="passage-marker" data-passage-number="' + str(index) + '" title="Reading paragraph ' + str(index) + ' · display break" aria-hidden="true"></span>'
        output.append('<div' + attrs + '>' + marker + '<div class="passage-copy">' + _blocks(value) + '</div></div>')
    return ''.join(output)


def _provenance(work: dict) -> str:
    from book_seo import _safe_external, _text
    rows = []
    notice = work.get('source_notices')
    notice = notice if isinstance(notice, dict) else {}
    rendition = work.get('source_language_edition') or {}
    if rendition.get('kind') == 'translation':
        kind = _text(rendition.get('rendition_type'))
        label = 'Saved machine translation' if 'machine' in kind.lower() or 'generated' in kind.lower() else 'Saved translation'
        review = _text(rendition.get('review_status'))
        if kind == 'mixed':
            label += ' · Mixed translation methods'
        elif kind == 'supplied':
            label = 'Supplied translation'
        if review == 'mixed':
            review = 'Mixed review statuses'
        elif review in ('unspecified', 'unknown'):
            review = 'Review status unrecorded'
        rows.append('<p>' + label + (' · ' + escape(review) if review else '') + '</p>')
    for label, value in (('Edition', work.get('edition')), ('Provider', notice.get('provider')),
                         ('Attribution', notice.get('attribution')), ('Rights', notice.get('statement')),
                         ('Licence', notice.get('licence'))):
        if value := _text(value):
            rows.append('<p>' + label + ': ' + escape(value) + '</p>')
    for label, value in (('Source edition', work.get('source_url') or notice.get('source_url')),
                         ('Rights reference', notice.get('evidence_url'))):
        if url := _safe_external(value):
            rows.append('<p><a href="' + escape(url, quote=True) + '" rel="noopener">' + label + '</a></p>')
    return '<details class="edition-note"><summary>Edition &amp; source</summary>' + ''.join(rows) + '</details>'


def _navigation(work: dict, route_slug: str, section: dict | None, active_language: str, tools_panel: str) -> str:
    from book_landings import source_label
    from book_seo import _sources, _chapter_slugs, _chapter_url
    sources, slugs = _sources(work), work.get('source_route_slugs') or _chapter_slugs(work)
    contents = []
    for index, item in enumerate(sources, 1):
        title = source_label(work, item)
        target = 'source-' + item['id']
        href = ('#' + target if section is None else _chapter_url(route_slug, slugs[item['id']]))
        if section and active_language:
            href += 'language/' + active_language + '/'
        current = ' aria-current="page"' if item['id'] == (section or sources[0])['id'] else ''
        data = ' data-source-target="' + escape(target, quote=True) + '" data-source-title="' + escape(title, quote=True) + '"'
        contents.append('<li class="contents-row" data-source-title="' + escape(title, quote=True) + '"><a class="contents-link" href="' + escape(href, quote=True) + '"' + data + current + '><span class="contents-number">' + str(index).zfill(2) + '</span><span>' + escape(title) + '</span></a></li>')
    tabs = []
    for key, name, icon in (('contents', 'Contents', CONTENTS_ICON), ('pages', 'Pages', PAGES_ICON), ('tools', 'Tools', TOOLS_ICON)):
        selected = key == 'contents'
        tabs.append(f'<button id="reader-tab-{key}" type="button" role="tab" data-nav-tab="{key}" '
                    f'aria-selected="{str(selected).lower()}" aria-controls="reader-panel-{key}" tabindex="{0 if selected else -1}">'
                    f'{icon}<span>{name}</span></button>')
    return ('<details id="reader-navigation" class="reader-navigation" lang="en">'
            '<summary class="reader-fab" title="Library" aria-label="Library, contents and reading tools">' + BOOK_ICON + '<span class="sr-only">Library</span></summary>'
            '<aside class="contents-panel" aria-label="CARE the Librarian"><div class="nav-head"><span>CARE the Librarian</span><button type="button" data-close-navigation class="panel-close" aria-label="Minimize Library">' + MINIMIZE_ICON + '</button></div>'
            '<div class="nav-tabs" role="tablist" aria-label="Library panels">' + ''.join(tabs) + '</div>'
            '<label class="contents-search"><span class="sr-only">Find a section</span><input id="contents-search" type="search" placeholder="Find a section" autocomplete="off"></label>'
            '<div id="reader-panel-contents" data-nav-panel="contents" role="tabpanel" aria-labelledby="reader-tab-contents"><ol class="contents-list">' + ''.join(contents) + '</ol></div>'
            '<div id="reader-panel-pages" data-nav-panel="pages" role="tabpanel" aria-labelledby="reader-tab-pages" hidden><div class="page-thumbnails" data-pages-list></div></div>'
            '<div id="reader-panel-tools" data-nav-panel="tools" role="tabpanel" aria-labelledby="reader-tab-tools" hidden>' + tools_panel + '</div>'
            '<p data-contents-empty class="empty-contents" hidden>No matching sections.</p>'
            '<div class="reader-progress"><div class="progress-track"><span class="progress-fill"></span></div><span class="progress-label" data-reading-progress>0%</span></div></aside></details>')


def _reading_tools(work: dict, reader_url: str, downloads: list[dict], editions: list[dict], canonical_path: str) -> str:
    language = _language(work.get('language_code'))
    options = []
    for edition in editions:
        selected = ' selected' if edition.get('url') == canonical_path else ''
        label = str(edition.get('language_name') or edition.get('language_code') or '')
        if edition.get('kind') == 'original':
            label += ' · Original'
        else:
            label += ' · Saved translation'
        options.append('<option value="' + escape(edition['url'], quote=True) + '"' + selected + '>' + escape(label) + '</option>')
    if not options:
        options = ['<option value="' + escape(canonical_path, quote=True) + '">' + escape(str(work.get('language_name') or language)) + ' · Original</option>']
    from source_download_menu import file_links, language_downloads
    selected = next((row for row in editions if row.get('url') == canonical_path), {})
    download_links = file_links(downloads)
    download_label = 'Download ' + str(work.get('language_name') or language) + ' edition'
    other_files = language_downloads(row for row in editions if row.get('language_code') != language)
    other_languages = ('<details class="download-languages"><summary>Other languages</summary>'
                       + other_files + '</details>') if other_files else ''
    optional = selected.get('axiom_downloads') or []
    axiom_links = ('<details class="download-axioms"><summary>Include saved CARE axioms</summary>'
                   '<p class="control-note">Source text with a separate whole-book CARE commentary appendix.</p>'
                   '<div class="download-links">' + file_links(optional) + '</div></details>') if optional else ''
    return ('<section id="reader-tools" class="tools-panel" aria-label="Reading tools">'
            '<div class="control-row zoom-row js-control"><span class="control-label">Zoom</span><div class="reader-zoom js-control" role="group" aria-label="Zoom"><button id="reader-zoom-out" type="button" aria-label="Zoom out">−</button><button id="reader-zoom-value" type="button" title="Reset zoom to 100%" aria-label="Zoom percentage, reset to 100%">82%</button><button id="reader-zoom-in" type="button" aria-label="Zoom in">+</button><button id="reader-zoom-fit" type="button" title="Fit page width" aria-label="Fit page width">Fit</button></div></div>'
            '<div class="control-row js-control"><label class="control-label" for="reader-language">Language</label><select id="reader-language">' + ''.join(options) + '</select></div>'
            '<noscript><ul class="language-links">' + ''.join('<li><a href="' + escape(item['url'], quote=True) + '">' + escape(item.get('language_name') or item['language_code']) + '</a></li>' for item in editions) + '</ul></noscript>'
            '<div class="control-row js-control"><label class="control-label" for="reader-theme">Paper</label><select id="reader-theme"><option value="green" selected>Deep green</option><option value="blue">Blue slate</option></select></div>'
            '<div class="control-row text-size-row js-control"><label class="control-label" for="text-size">Text size</label><div class="text-size-control"><span aria-hidden="true">A</span><input id="text-size" type="range" min="18" max="27" value="19" step="1"><span aria-hidden="true">A</span><output id="text-size-value" for="text-size">19</output></div></div>'
            '<div class="mark-controls"><label class="control-row js-control" for="passage-toggle"><span class="control-label">Passage marks</span><input class="switch-control" id="passage-toggle" type="checkbox"></label>'
            '<label class="control-row js-control" for="aq-toggle" title="AQ per line. Letters A–Z score 10–35. Digits keep their value."><span class="control-label">AQ per line</span><input class="switch-control" id="aq-toggle" type="checkbox"></label></div>'
            '<div class="panel-divider"></div><div class="download-section" data-download-scope="book" tabindex="-1"><noscript><span id="download"></span></noscript><p class="control-label">' + escape(download_label) + '</p><div class="download-links">' + download_links + '</div>' + ('<p class="control-note">Whole book · Clean source edition</p>' if downloads else '<p class="control-note">A complete source download is not available for this edition.</p>') + axiom_links + other_languages + '</div>'
            '<div class="panel-actions"><a class="open-care-action" href="' + escape(reader_url, quote=True) + '">' + BOOK_ICON + '<span>Open in CARE</span><span aria-hidden="true">↗</span></a><a href="/library.html">Library home <span aria-hidden="true">↗</span></a></div>'
            + _provenance(work) + '</section>')


@lru_cache(maxsize=1)
def _opening_script() -> str:
    return (TOOLS / 'source_reader_opening.js').read_text(encoding='utf-8')


def _version(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


@lru_cache(maxsize=2)
def reader_assets(inline: bool = False) -> dict[str, str]:
    css = (TOOLS / 'source_reader.css').read_text(encoding='utf-8')
    pages = (TOOLS / 'source_reader_pages.mjs').read_text(encoding='utf-8')
    runtime = (TOOLS / 'source_reader_runtime.mjs').read_text(encoding='utf-8')
    if inline:
        runtime = pages + '\n' + runtime.replace("import { initialisePagedReader } from './source_reader_pages.mjs';", '')
        if '</script' in runtime.lower():
            raise ValueError('The source reader runtime contains a closing script token.')
    else:
        runtime = runtime.replace("'./source_reader_pages.mjs'", f"'./source-reader-pages.mjs?v={_version(pages)}'")
    return {'source-reader.css': css, 'source-reader.mjs': runtime,
            'source-reader-pages.mjs': pages}


def source_page(work: dict, route_slug: str, origin: str, downloads: list[dict], *, section: dict | None = None,
                editions: list[dict] | None = None, active_language: str = '', canonical_override: str = '', inline_assets: bool = False) -> str:
    from book_landings import source_label, source_page_number
    from book_seo import _book_url, _chapter_slugs, _chapter_url, _jsonld, _reader_url, _source_text, _sources
    sources, slugs = _sources(work), work.get('source_route_slugs') or _chapter_slugs(work)
    canonical_path = canonical_override or (_chapter_url(route_slug, slugs[section['id']]) if section else _book_url(route_slug))
    canonical = origin + canonical_path
    language = _language((section or {}).get('language_code') or work.get('language_code'))
    title = source_label(work, section) if section else work['title']
    reader_url = _reader_url(work, section['id'] if section else '')
    available_formats = {row['format'] for row in downloads}
    named_formats = [name for key, name in [('pdf', 'PDF'), ('epub', 'EPUB'), ('docx', 'Word'), ('txt', 'plain text'), ('md', 'Markdown')] if key in available_formats]
    edition_language = str(work.get('language_name') or language).strip()
    work_title = work['title']
    description = (f"Read {title} in {work_title} by {work['author']}." if section else
                   f"Read {work_title} by {work['author']} in {edition_language}.")
    page_title = f"{title} · {work_title}" if section and title != work_title else f"{title} by {work['author']}"
    if named_formats:
        description += f" Download the complete {edition_language} edition in " + ", ".join(named_formats) + "."
        if not section:
            page_title += " — Read or download " + " & ".join(named_formats[:2])
    if active_language:
        page_title += f" ({edition_language})"
    page_title += " | CARE Library"
    toc_items = []
    for position, item in enumerate([section] if section else sources, 1):
        target = '#source-' + item['id']
        toc_items.append('<li><a href="' + escape(target, quote=True) + '"><span class="toc-order">' + str(position) + '</span><span class="toc-title">' + escape(source_label(work, item)) + '</span><span class="toc-page" data-page-ref="' + escape('source-' + item['id'], quote=True) + '"></span></a></li>')
    tools_panel = _reading_tools(work, reader_url, downloads, editions or [], canonical_path)
    body = ('<a class="skip" href="#source-text">Skip to text</a><a class="reader-back-link" data-reader-back lang="en" href="' + escape(reader_url, quote=True) + '">Back to CARE</a>' + _navigation(work, route_slug, section, active_language, tools_panel)
            + '<main id="source-document" class="reader-document"><script data-reader-opening-script>' + _opening_script() + '</script>'
            '<div class="reading-pages" data-reader-opening><div class="page-slot" data-page-number="1"><article id="reading-page-1" class="reading-page" data-page-number="1" data-page-kind="title"><div class="page-content"><header class="document-title" data-title-page>'
            + '<h1 class="book-title">' + escape(title) + '</h1>'
            + '<p class="book-author">' + escape(work['author']) + '</p></header></div></article></div></div><article class="reader-paper" data-reader-source-flow>'
            + '<nav class="document-contents" data-contents-page aria-labelledby="document-contents-title"><h2 id="document-contents-title"><a href="#reader-navigation" data-open-reader-contents>Contents</a></h2><ol class="document-contents-list">' + ''.join(toc_items) + '</ol></nav><div id="source-text">')
    for item in ([section] if section else sources):
        body += '<section class="source-section" id="' + escape('source-' + item['id'], quote=True) + '" data-source-id="' + escape(item['id'], quote=True) + '" lang="' + _language(item.get('language_code') or language) + '" dir="auto">'
        if not section:
            chapter_url = _chapter_url(route_slug, slugs[item['id']]) + ('language/' + active_language + '/' if active_language else '')
            body += '<h2 class="source-section-title"><a href="' + escape(chapter_url, quote=True) + '">' + _section_heading(source_label(work, item)) + '</a></h2>'
        body += '<div class="source-text">' + _source_body(item) + '</div>' if _source_text(item) else '<p class="unavailable" lang="en">This section’s original source text has not been published.</p>'
        body += '</section>'
    body += '</div>'
    if section:
        index = next(index for index, item in enumerate(sources) if item['id'] == section['id'])
        body += '<nav class="section-nav" aria-label="Source section navigation" lang="en">'
        for offset, label in ((-1, 'Previous'), (1, 'Next')):
            if 0 <= index + offset < len(sources):
                neighbor = sources[index + offset]
                href = _chapter_url(route_slug, slugs[neighbor['id']]) + ('language/' + active_language + '/' if active_language else '')
                body += '<a href="' + escape(href, quote=True) + '">' + label + ': ' + escape(source_label(work, neighbor)) + '</a>'
        body += '</nav>'
    body += '</article></main>'
    structured = _jsonld(work, canonical, description)
    if not section and downloads:
        book_data = json.loads(structured)
        book_data['encoding'] = [
            {'@type': 'MediaObject', 'encodingFormat': entry['media_type'],
             'contentUrl': origin + entry['url'], 'inLanguage': language}
            for entry in downloads
        ]
        structured = json.dumps(book_data, ensure_ascii=False, separators=(',', ':')).replace('<', r'\u003c').replace('>', r'\u003e').replace('&', r'\u0026')
    if section:
        structured = json.dumps({'@context': 'https://schema.org', '@type': 'CreativeWork' if source_page_number(work, section) else 'Chapter',
            '@id': canonical + '#source', 'name': title, 'url': canonical, 'identifier': section['id'], 'position': next(i for i, item in enumerate(sources, 1) if item['id'] == section['id']),
            'inLanguage': language, 'isPartOf': {'@type': 'Book', '@id': origin + _book_url(route_slug) + '#book', 'name': work['title'], 'url': origin + _book_url(route_slug), 'author': {'@type': 'Person', 'name': work['author']}}}, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    alternates = ''.join('<link rel="alternate" type="' + escape(row['media_type'], quote=True) + '" href="' + escape(origin + row['url'], quote=True) + '">' for row in downloads)
    alternates += ''.join('<link rel="alternate" hreflang="' + escape(item['language_code'], quote=True) + '" href="' + escape(origin + item['url'], quote=True) + '">' for item in editions or [])
    assets = reader_assets(inline_assets)
    css, runtime = assets['source-reader.css'], assets['source-reader.mjs']
    styles = '<style>' + css + '</style>' if inline_assets else '<link rel="stylesheet" href="/books/source-reader.css?v=' + _version(css) + '">'
    enhancement = ('<script type="module" data-source-reader-runtime>' + runtime + '</script>' if inline_assets
                   else '<script type="module" data-source-reader-runtime src="/books/source-reader.mjs?v=' + _version(runtime) + '"></script>')
    edition_kind = 'translation' if active_language else 'original'
    return ('<!doctype html><html lang="' + language + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta name="care-source-page" content="' + edition_kind + '"><title>' + escape(page_title) + '</title><meta name="description" content="' + escape(description, quote=True) + '">'
            '<link rel="canonical" href="' + escape(canonical, quote=True) + '"><meta name="robots" content="index,follow"><link rel="icon" href="/favicon.svg" type="image/svg+xml">'
            + '<meta property="og:type" content="book"><meta property="og:title" content="' + escape(page_title, quote=True) + '"><meta property="og:description" content="' + escape(description, quote=True) + '"><meta property="og:url" content="' + escape(canonical, quote=True) + '">'
            + alternates + '<script type="application/ld+json">' + structured + '</script>' + styles + '<noscript><style>' + NOSCRIPT_STYLE + '</style></noscript></head>'
            '<body class="source-reader" data-reader-theme="green" data-passages="false" data-aq="false" data-nav-open="false">' + body + enhancement + '</body></html>\n')
