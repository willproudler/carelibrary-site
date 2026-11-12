"""Prerender every saved CARE unit from the attested public book export.

Metadata pages are public. Saved analysis HTML and Markdown remain separate
resources so the server can apply the existing live beta/public-mode boundary.
No text is generated, translated, inferred or loaded from the private machine.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from html import escape
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote, unquote, urlencode

from book_seo import (_book_url, _chapter_slugs, _chapter_url, _digest, _jsonld,
                      _origin, _rows, _shell, _sources, _text, _with_book_routes,
                      _write, book_routes, book_slugs, load_attested_library)
from reading_text_export import render_reading_markdown, render_reading_packet, render_reading_text, rendition_anchor
from seo_shell import embed_library

SCHEMA = "care-reading-search-pages/1"
LAYER_NAMES = {"WB": "Whole-book", "MC": "Macro / metacluster", "CL": "Cluster", "CH": "Chapter", "NUMO": "NUMO"}
LAYER_ORDER = {"WB": 0, "MC": 1, "CL": 2, "CH": 3, "NUMO": 4}
_CSS = """#care-search-content .care-reading-prose{font:1.08rem/1.75 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere}#care-search-content .care-claim{border-top:1px solid #343c3b;padding:22px 0;scroll-margin-top:25px}#care-search-content .care-claim h4{font:.78rem/1.5 ui-monospace,monospace;overflow-wrap:anywhere}#care-search-content .care-reading-rendition{margin:45px 0}#care-search-content .care-reading-meta{font-size:.83rem;color:#aebbac;overflow-wrap:anywhere}#care-search-content .care-recorded-links{font-size:.8rem;overflow-wrap:anywhere}#care-search-content .care-recorded-links li{margin:5px 0}#care-search-content .care-reading-context{color:#bfc7bb}#care-search-content .care-reading-units{padding-left:24px}#care-search-content .care-reading-units li{margin:12px 0}#care-search-content .care-reading-units small{display:block;color:#b3beb1}#care-search-content .care-reading-rendition h3{margin-top:35px}#care-search-content .care-reading-rendition h4{margin-bottom:10px}"""


def layer_slug(layer: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", layer.casefold()).strip("-")
    return slug or "reading-" + _digest(layer.encode())[:12]


def unit_slug(unit: dict) -> str:
    title = unicodedata.normalize("NFKD", _text(unit.get("title"))).encode("ascii", "ignore").decode().casefold()
    title = re.sub(r"[^a-z0-9]+", "-", title).strip("-")[:96].rstrip("-") or layer_slug(unit["layer"]) + "-reading"
    return title + "-" + _digest(unit["id"].encode())[:12]


def overview_url(route_slug: str) -> str:
    return _book_url(route_slug) + "/readings/"


def layer_url(route_slug: str, layer: str) -> str:
    return overview_url(route_slug) + layer_slug(layer) + "/"


def unit_url(route_slug: str, unit: dict) -> str:
    return layer_url(route_slug, unit["layer"]) + unit_slug(unit) + "/"


def _units(work: dict) -> list[dict]:
    units = _rows(work.get("units"))
    if any(not isinstance(unit, dict) or not all(isinstance(unit.get(key), str) and unit[key] for key in ("id", "layer")) for unit in units):
        raise ValueError("Saved CARE units require stable identities and layers.")
    if len({unit["id"] for unit in units}) != len(units):
        raise ValueError("Duplicate saved CARE unit identity.")
    return units


def _items(rendition: dict) -> list[dict]:
    result = []
    for section in _rows(rendition.get("sections")):
        if not isinstance(section, dict):
            raise ValueError("A saved CARE section is malformed.")
        for item in _rows(section.get("items")):
            if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not item["id"] or not isinstance(item.get("text"), str):
                raise ValueError("A saved CARE item is missing its exact identity or text.")
            result.append(item)
    if len({item['id'] for item in result}) != len(result):
        raise ValueError('Duplicate saved CARE item identity.')
    return result


def renditions(unit: dict) -> list[dict]:
    """Saved English translations lead; canonical wording always remains present."""
    original_items = _items(unit)
    retained = ('id','title','language_code','language_name','revision','sha256','source_sha256','source_language_code',
                'model','review_status','rendition_type','source_variant_id','created','sections')
    canonical = {**{key: unit[key] for key in retained if key in unit}, "rendition_type": "canonical", "kind": "Canonical saved CARE rendition"}
    translated = []
    for translation in _rows(unit.get("translations")):
        if not isinstance(translation, dict) or translation.get("source_sha256") != unit.get("sha256"):
            raise ValueError("A saved reading translation is not pinned to its published unit.")
        translated_items = _items(translation)
        if [item["id"] for item in original_items] != [item["id"] for item in translated_items]:
            raise ValueError("A saved reading translation changed item identities or order.")
        for original, saved in zip(original_items, translated_items):
            for key in ("refs", "deep_refs", "passages", "trace_type"):
                if original.get(key) != saved.get(key):
                    raise ValueError("A saved reading translation changed recorded evidence links.")
        kind = "Saved machine translation of CARE analysis" if translation.get("rendition_type") == "machine" or translation.get("review_status") == "machine" else "Saved translation of CARE analysis"
        translated.append({**{key: translation[key] for key in retained if key in translation}, "kind": kind})
    english = [item for item in translated if item.get("language_code") == "en"]
    others = [item for item in translated if item.get("language_code") != "en"]
    saved = [*english, canonical, *others]
    if original_items:
        anchors = [rendition_anchor(rendition, original_items[0]['id']) for rendition in saved]
        if len(anchors) != len(set(anchors)):
            raise ValueError('Duplicate saved CARE rendition identity.')
    return saved


def _claim_fragment(identity: str) -> str:
    return "#" + urlencode({"ref": identity}, quote_via=quote)


def _link(identity: str, references: dict[str, str], *, label: str | None = None) -> str:
    text = escape(label or identity)
    target = references.get(identity)
    return f'<a href="{escape(target, quote=True)}">{text}</a>' if target else text


def _recorded(item: dict, references: dict[str, str]) -> str:
    pieces = []
    for name, key in (("Recorded references", "refs"), ("Recorded deep references", "deep_refs")):
        if values := _rows(item.get(key)):
            pieces.append('<p>' + name + ': ' + '; '.join(_link(str(identity), references) for identity in values) + '</p>')
    if item.get("trace_type"):
        pieces.append('<p>Recorded trace type: ' + escape(str(item["trace_type"])) + '</p>')
    passages = []
    for record in _rows(item.get("passages")):
        if isinstance(record, str):
            record = {"id": record}
        if not isinstance(record, dict) or not isinstance(record.get("id"), str):
            raise ValueError("A saved passage alignment is malformed.")
        details = {key: value for key, value in record.items() if key != "id"}
        text = _link(record["id"], references)
        if details:
            text += ' — ' + escape(json.dumps(details, ensure_ascii=False, sort_keys=True))
        passages.append('<li>' + text + '</li>')
    if passages:
        pieces.append('<p>Recorded passage alignments:</p><ul>' + ''.join(passages) + '</ul>')
    if item.get("grounding"):
        pieces.append('<p>Recorded grounding: ' + escape(json.dumps(item["grounding"], ensure_ascii=False, sort_keys=True)) + '</p>')
    return '<div class="care-recorded-links">' + ''.join(pieces) + '</div>' if pieces else ''


def _render_renditions(saved: list[dict], references: dict[str, str]) -> str:
    output = []
    for rendition_index, rendition in enumerate(saved):
        language = _text(rendition.get("language_name")) or _text(rendition.get("language_code")) or "Language not recorded"
        header = '<section class="care-reading-rendition"><h2>' + escape(rendition["kind"] + ' — ' + language) + '</h2>'
        metadata = []
        for label, key in (("Rendition", "rendition_type"), ("Language", "language_code"), ("Saved model", "model"),
                           ("Recorded review status", "review_status"), ("Rendition ID", "id"), ("Source SHA-256", "source_sha256"), ("Rendition SHA-256", "sha256")):
            if rendition.get(key):
                metadata.append(label + ': ' + str(rendition[key]))
        output.append(header + '<p class="care-reading-meta">' + escape(' · '.join(metadata)) + '</p>')
        for section in _rows(rendition.get("sections")):
            title = ' · '.join(str(section.get(key) or '') for key in ("number", "name") if section.get(key) not in (None, '')) or "Saved section"
            output.append('<section><h3>' + escape(title) + '</h3>')
            if section.get("original_name") and section.get("original_name") != section.get("name"):
                output.append('<p class="care-reading-meta">Saved original section label: ' + escape(str(section["original_name"])) + '</p>')
            for item in _rows(section.get("items")):
                identity = item["id"]
                fragment = rendition_anchor(rendition, identity)
                anchor = unquote(fragment)
                canonical = references.get(identity, '').split('#',1)[0]
                own_link = '<a href="' + escape(canonical + '#' + fragment, quote=True) + '">' + escape(identity) + '</a>' if canonical else escape(identity)
                output.append(f'<article class="care-claim" id="{escape(anchor, quote=True)}" data-item-id="{escape(identity, quote=True)}">'
                              '<h4>' + own_link + '</h4><p class="care-reading-prose">' + escape(item["text"]) + '</p>'
                              + _recorded(item, references) + '</article>')
            output.append('</section>')
        output.append('</section>')
    return ''.join(output)


def _page(source: Path, *, title: str, description: str, canonical: str, body: str, route: dict, mapping: dict, structured: dict | None = None, plaintext_url: str = '', markdown_url: str = '', json_url: str = '') -> str:
    encoded = json.dumps(structured, ensure_ascii=False, separators=(",", ":")).replace('<', '\\u003c') if structured else ''
    html = _shell(title=title, description=description, canonical=canonical, body=body, structured=encoded)
    html = html.replace('<meta property="og:type" content="book">', '<meta property="og:type" content="article">')
    extra = '<link rel="stylesheet" href="/books/readings.css">'
    if plaintext_url:
        extra += '<link rel="alternate" type="text/plain" href="' + escape(plaintext_url, quote=True) + '">'
    if markdown_url:
        extra += '<link rel="alternate" type="text/markdown" href="' + escape(markdown_url, quote=True) + '">'
    if json_url:
        extra += '<link rel="alternate" type="application/json" href="' + escape(json_url, quote=True) + '">'
    html = html.replace('</head>', extra + '</head>')
    return _with_book_routes(embed_library(source, html, route), mapping)


def _unit_header(work: dict, unit: dict, entry: dict, references: dict[str, str], origin: str) -> str:
    layer_name = LAYER_NAMES.get(unit['layer'], unit['layer'])
    body = ('<article><p class="eyebrow">Saved CARE reading · ' + escape(unit['layer']) + '</p>'
            '<p><a href="' + escape(_book_url(entry['route_slug']), quote=True) + '">' + escape(work['title']) + '</a> by ' + escape(work['author']) + ' — author of the source book</p>'
            '<h1>' + escape(_text(unit.get('title')) or unit['id']) + '</h1>'
            '<p class="intro">' + escape(layer_name) + ' reading: saved AI-assisted CARE analysis of the source book.</p>'
            '<div class="actions"><a class="button" href="' + escape(entry['plaintext_url'], quote=True) + '">Plain-text reading</a>'
            '<a class="button" href="' + escape(overview_url(entry['route_slug']), quote=True) + '">All CARE readings</a>'
            '<a class="button" href="' + escape(layer_url(entry['route_slug'], unit['layer']), quote=True) + '">' + escape(layer_name) + ' readings</a>'
            '<a class="button" href="' + escape(entry['markdown_url'], quote=True) + '">Full Markdown record</a></div>')
    body += '<p><a href="' + escape(entry['json_url'], quote=True) + '">Structured machine-readable CARE packet</a></p>'
    facts = [('Book', work['title']), ('Author of source book', work['author']), ('CARE layer', unit['layer']), ('Work ID', work['id']),
             ('Saved unit ID', unit['id']), ('Saved revision', _text(unit.get('revision'))), ('Reading content SHA-256', _text(unit.get('sha256')))]
    body += '<dl>' + ''.join('<dt>' + label + '</dt><dd>' + escape(value) + '</dd>' for label, value in facts if value) + '</dl>'
    context = unit.get('identity') or {}
    if isinstance(context, dict) and context.get('context'):
        body += '<p class="care-reading-context">Saved context: ' + escape(str(context['context'])) + '</p>'
    parents = _rows(unit.get('parents'))
    if parents:
        body += '<p class="care-reading-meta">Recorded parent units: ' + '; '.join(_link(str(identity), references) for identity in parents) + '</p>'
    return body


def build_into(source: Path, books_directory: Path, *, library: dict, library_sha256: str, books: list[dict], origin: str, mapping: dict) -> list[dict]:
    """Build inside book_seo's staged tree from its already-verified export."""
    origin = _origin(origin)
    if {work['id'] for work in library['works']} != {entry['work_id'] for entry in books}:
        raise ValueError("CARE reading pages must belong to the attested published books.")
    by_work = {entry['work_id']: entry for entry in books}
    unit_entries, index_entries, references = {}, [], {}
    pages, sitemap = [], []
    def remember(identity: str, url: str):
        if identity in references and references[identity] != url:
            raise ValueError("A saved CARE reference has more than one published owner.")
        references[identity] = url
    for work in library['works']:
        book = by_work[work['id']]
        source_slugs = _chapter_slugs(work)
        source_ids = {section['id'] for section in _sources(work)}
        source_chapters = {section.get('chapter_id'):section['id'] for section in _sources(work) if section.get('chapter_id')}
        for source_index, section in enumerate(_sources(work), 1):
            url = origin + _chapter_url(book['route_slug'], source_slugs[section['id']])
            remember(section['id'], url)
            for passage in _rows(section.get('paragraphs')):
                if isinstance(passage, dict) and passage.get('id'):
                    remember(passage['id'], url + _claim_fragment(passage['id']))
        for unit in _units(work):
            slug = unit_slug(unit)
            url = unit_url(book['route_slug'], unit)
            folder = f"books/{book['slug']}/readings/{layer_slug(unit['layer'])}/{slug}/"
            saved = renditions(unit)
            items = _items(unit)
            entry = {'kind': 'reading', 'book_slug': book['slug'], 'route_slug': book['route_slug'], 'work_id': work['id'],
                     'reader_slug': work['slug'], 'book_title': work['title'], 'author': work['author'],
                     'title': _text(unit.get('title')) or unit['id'], 'unit_id': unit['id'], 'unit_slug': slug,
                     'layer': unit['layer'], 'layer_slug': layer_slug(unit['layer']), 'url': url,
                     'path': folder + 'index.html', 'text_path': folder + 'text.html', 'has_text': bool(items),
                     'markdown_path': folder + 'reading.md', 'markdown_url': url + 'reading.md',
                     'plaintext_path': folder + 'reading.txt', 'plaintext_url': url + 'reading.txt',
                     'json_path': folder + 'reading.json', 'json_url': url + 'reading.json',
                     'item_count': len(items), 'section_count': len(_rows(unit.get('sections'))),
                     'language': _text(saved[0].get('language_code')), 'language_name': _text(saved[0].get('language_name')),
                     'revision': _text(unit.get('revision')), 'content_sha256': _text(unit.get('sha256')),
                     'rendition_languages': [str(rendition.get('language_code') or '') for rendition in saved]}
            parent_sources = [identity for identity in _rows(unit.get('parents')) if identity in source_ids]
            source_id = parent_sources[0] if len(parent_sources)==1 else source_chapters.get(unit['id'])
            if source_id:
                entry['source_id'] = source_id
            if unit['id'] in unit_entries:
                raise ValueError("Duplicate published CARE unit identity.")
            unit_entries[unit['id']] = (work, unit, saved, entry)
            remember(unit['id'], origin + url)
            for item in items:
                remember(item['id'], origin + url + _claim_fragment(item['id']))
            pages.append(entry)
            sitemap.append({'loc': origin + url})
    _write(books_directory / 'readings.css', _CSS)
    for work in library['works']:
        book = by_work[work['id']]
        units = _units(work)
        groups = defaultdict(list)
        for unit in units:
            groups[unit['layer']].append(unit)
        layers = sorted(groups, key=lambda value: (LAYER_ORDER.get(value, 99), value))
        book['care_overview_url'] = overview_url(book['route_slug'])
        book['care_layer_urls'] = {layer: layer_url(book['route_slug'], layer) for layer in layers}
        book['care_readings_count'] = len(units)
        book['care_whole_book_urls'] = [unit_entries[unit['id']][3]['url'] for unit in groups.get('WB', [])]
        for field in ('summary_text_url','summary_data_url','summary_plaintext_url'):
            book.pop(field,None)
        whole=groups.get('WB',[])
        if len(whole)==1 and unit_entries[whole[0]['id']][3]['has_text']:
            book['summary_text_url']=_book_url(book['route_slug'])+'/summary.md'
            book['summary_data_url']=_book_url(book['route_slug'])+'/summary.json'
            book['summary_plaintext_url']=_book_url(book['route_slug'])+'/summary.txt'
        default = next(iter(groups.get('WB') or units), None)
        base_route = {'view': 'workspace', 'book': work['slug'], 'sources': [section['id'] for section in _sources(work)]}
        if default:
            base_route['unit'] = default['id']
        overview = {'kind': 'overview', 'book_slug': book['slug'], 'route_slug': book['route_slug'], 'work_id': work['id'],
                    'reader_slug': work['slug'], 'book_title': work['title'], 'author': work['author'],
                    'title': 'CARE readings of ' + work['title'], 'url': book['care_overview_url'],
                    'path': f"books/{book['slug']}/readings/index.html", 'has_text': False,
                    'index_path': f"books/{book['slug']}/readings/index.json", 'index_url': book['care_overview_url'] + 'index.json',
                    'unit_count': len(units), 'layers': {layer: len(groups[layer]) for layer in layers}}
        for field in ('summary_text_url','summary_data_url','summary_plaintext_url'):
            if book.get(field):overview[field]=book[field]
        body = '<article><p class="eyebrow">Saved CARE analysis</p><h1>CARE readings of ' + escape(work['title']) + '</h1><p>Source book by ' + escape(work['author']) + '. Explore its saved AI-assisted CARE readings.</p>'
        if book.get('summary_text_url'):
            body+='<p><a href="'+escape(book['summary_plaintext_url'],quote=True)+'">Whole-book CARE summary — plain text</a> · <a href="'+escape(book['summary_text_url'],quote=True)+'">Full Markdown record</a> · <a href="'+escape(book['summary_data_url'],quote=True)+'">Structured JSON record</a></p>'
        body += '<p><a href="' + escape(_book_url(book['route_slug']), quote=True) + '">Book and original source sections</a></p><ul class="care-reading-units">'
        for layer in layers:
            body += '<li><a href="' + escape(layer_url(book['route_slug'], layer), quote=True) + '">' + escape(LAYER_NAMES.get(layer, layer)) + ' CARE readings</a> · ' + str(len(groups[layer])) + ' saved units</li>'
        body += '</ul>'
        for unit in groups.get('WB', []):
            body += '<p><a href="' + escape(unit_entries[unit['id']][3]['url'], quote=True) + '">Whole-book CARE summary: ' + escape(_text(unit.get('title')) or unit['id']) + '</a></p>'
        body += '<p>Read the preferred saved text directly, or use Markdown and JSON for the complete multilingual record, revisions and source connections.</p></article>'
        _write(books_directory / Path(overview['path']).relative_to('books'), _page(source, title=overview['title'] + ' | CARE Library', description='Saved whole-book, macro, cluster and chapter CARE readings of ' + work['title'] + ' by ' + work['author'] + '.', canonical=origin + overview['url'], body=body, route=base_route, mapping=mapping))
        index_entries.append(overview); sitemap.append({'loc': origin + overview['url']})
        for layer in layers:
            entry = {**{key:value for key,value in overview.items() if key not in {'index_path','index_url','layers','summary_text_url','summary_data_url','summary_plaintext_url'}}, 'kind': 'layer', 'layer': layer, 'layer_slug': layer_slug(layer),
                     'title': LAYER_NAMES.get(layer, layer) + ' CARE readings of ' + work['title'],
                     'url': layer_url(book['route_slug'], layer),
                     'path': f"books/{book['slug']}/readings/{layer_slug(layer)}/index.html", 'unit_count': len(groups[layer])}
            body = '<article><p class="eyebrow">Saved generated CARE analysis · ' + escape(layer) + '</p><h1>' + escape(entry['title']) + '</h1><p>Source book by ' + escape(work['author']) + '. Analysis generated through CARE; not original author prose.</p><p><a href="' + escape(book['care_overview_url'], quote=True) + '">All CARE layers</a></p><ul class="care-reading-units">'
            for unit in groups[layer]:
                item = unit_entries[unit['id']][3]
                body += '<li><a href="' + escape(item['url'], quote=True) + '">' + escape(item['title']) + '</a><small>' + escape(unit['id'] + ' · ' + item['revision']) + ' · ' + str(item['item_count']) + ' saved items</small></li>'
            body += '</ul></article>'
            _write(books_directory / Path(entry['path']).relative_to('books'), _page(source, title=entry['title'] + ' | CARE Library', description='Saved ' + LAYER_NAMES.get(layer, layer) + ' CARE units and exact reading revisions for ' + work['title'] + '.', canonical=origin + entry['url'], body=body, route={**base_route, 'unit': groups[layer][0]['id']}, mapping=mapping))
            index_entries.append(entry); sitemap.append({'loc': origin + entry['url']})
    for work, unit, saved, entry in unit_entries.values():
        book = by_work[work['id']]
        canonical = origin + entry['url']
        metadata = {'title': entry['title'], 'book_title': work['title'], 'book_author': work['author'], 'work_id': work['id'],
                    'unit_id': unit['id'], 'layer': unit['layer'], 'revision': entry['revision'], 'content_sha256': entry['content_sha256'],
                    'source_sha256': _text(unit.get('source_sha256')), 'public_export_sha256': library_sha256,
                    'canonical_url': canonical, 'parents': _rows(unit.get('parents')),
                    'source_id': entry.get('source_id',''), 'context': (unit.get('identity') or {}).get('context','') if isinstance(unit.get('identity'),dict) else ''}
        route = {'view': 'workspace', 'book': work['slug'], 'unit': unit['id'], 'sources': [section['id'] for section in _sources(work)]}
        header = _unit_header(work, unit, entry, references, origin)
        description = 'Saved ' + LAYER_NAMES.get(unit['layer'], unit['layer']) + ' CARE analysis of ' + work['title'] + ' by ' + work['author'] + ', unit ' + unit['id'] + '.'
        structured = {'@context': 'https://schema.org', '@type': 'Article', '@id': canonical + '#care-reading', 'headline': entry['title'],
                      'url': canonical, 'description': description, 'creator': {'@type': 'Organization', 'name': 'CARE'},
                      'inLanguage': entry['language'] or 'und', 'identifier': unit['id'],
                      'isBasedOn': {'@type': 'Book', '@id': origin + _book_url(book['route_slug']) + '#book', 'name': work['title'],
                                    'author': {'@type': 'Person', 'name': work['author']}, 'url': origin + _book_url(book['route_slug'])}}
        meta_body = header + '<h2>Saved sections</h2><ol>' + ''.join('<li>' + escape(str(section.get('number') or '') + ' · ' + str(section.get('name') or 'Saved section')) + '</li>' for section in _rows(saved[0].get('sections'))) + '</ol></article>'
        full_body = header + _render_renditions(saved, references) + '</article>'
        kwargs = dict(source=source, title=work['title'] + ' — ' + LAYER_NAMES.get(unit['layer'], unit['layer']) + ' CARE reading: ' + entry['title'] + ' | CARE Library', description=description, canonical=canonical, route=route, mapping=mapping, structured=structured, plaintext_url=origin + entry['plaintext_url'], markdown_url=origin + entry['markdown_url'], json_url=origin + entry['json_url'])
        _write(books_directory / Path(entry['path']).relative_to('books'), _page(body=meta_body, **kwargs))
        _write(books_directory / Path(entry['text_path']).relative_to('books'), _page(body=full_body, **kwargs))
        plaintext=render_reading_text(metadata,saved,reference_url=lambda identity:references.get(identity,''))
        _write(books_directory/Path(entry['plaintext_path']).relative_to('books'),plaintext)
        markdown = render_reading_markdown(metadata, saved, reference_url=lambda identity: references.get(identity, ''))
        _write(books_directory / Path(entry['markdown_path']).relative_to('books'), markdown)
        packet = render_reading_packet(metadata, saved, reference_url=lambda identity: references.get(identity, ''))
        _write(books_directory / Path(entry['json_path']).relative_to('books'), json.dumps(packet, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n')
    manifest = {'schema': SCHEMA, 'source_sha256': library_sha256, 'analysis_provenance': 'Saved AI-assisted CARE analysis; not original author prose.',
                'text_requires_public_library': True, 'pages': [*index_entries, *pages]}
    _write(books_directory / 'readings-manifest.json', json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n')
    return sitemap


def build(source: Path, destination: Path | None = None, *, origin: str = 'https://carelibrary.org') -> list[dict]:
    """Standalone rebuild uses the same attested export and reviewed book map."""
    source, destination = Path(source).resolve(), Path(destination or source).resolve()
    library, digest = load_attested_library(source)
    manifest = json.loads((destination / 'books/manifest.json').read_text())
    if manifest.get('schema') != 'care-book-search-pages/1' or manifest.get('source_sha256') != digest:
        raise ValueError('Build the matching published book pages before reading pages.')
    mapping = json.loads((destination / 'book-routes.json').read_text())
    return build_into(source, destination / 'books', library=library, library_sha256=digest,
                      books=manifest['books'], origin=origin, mapping=mapping)
