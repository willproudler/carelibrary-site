"""Ordinary no-script discovery links for the reviewed published book map."""
from __future__ import annotations

from collections import defaultdict
from html import escape
import re

START = '<!-- CARE-PUBLISHED-CATALOGUE:START -->'
END = '<!-- CARE-PUBLISHED-CATALOGUE:END -->'
BLOCK = re.compile(re.escape(START) + r'.*?' + re.escape(END), re.S)
STYLE = '<style id="care-published-catalogue-style">.care-static-catalogue{max-width:1120px;margin:0 auto;padding:38px 28px;color:#e9e6df;font:16px/1.6 system-ui,sans-serif}.care-static-catalogue h1,.care-static-catalogue h2,.care-static-catalogue h3{font-family:Georgia,serif;font-weight:400;line-height:1.2}.care-static-catalogue h1,.care-static-catalogue h2{font-size:30px;margin:0 0 14px}.care-static-catalogue h3{font-size:22px;margin:0 0 8px}.care-static-catalogue p{max-width:78ch;color:#bbc6bd}.care-static-catalogue a{color:#c5d9cc;text-decoration:underline;text-underline-offset:.2em}.care-catalogue-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:15px;list-style:none;padding:0;margin:26px 0}.care-catalogue-grid>li{border:1px solid #38443c;border-radius:7px;padding:20px;min-width:0}.care-catalogue-grid p{font-size:14px;margin:6px 0 12px}.care-catalogue-links{display:flex;gap:9px 15px;flex-wrap:wrap;font-size:13px;line-height:1.7}.care-catalogue-links+ .care-catalogue-links{margin-top:10px}#reader>.care-static-catalogue{max-height:100%;overflow:auto;overscroll-behavior:contain}@media(max-width:600px){.care-static-catalogue{padding:24px 18px}.care-catalogue-grid{grid-template-columns:1fr}}</style>'
_STYLE_RE = re.compile(r'<style\b[^>]*\bid=["\']care-published-catalogue-style["\'][^>]*>.*?</style>', re.I | re.S)


def _href(value: str) -> str:
    if (not isinstance(value, str) or not value.startswith('/') or value.startswith('//')
            or '\\' in value or any(ord(char) < 32 for char in value)
            or any(part in {'.', '..'} for part in value.split('/'))):
        raise ValueError('Published catalogue links must use exact canonical site paths.')
    return escape(value, quote=True)


def catalogue_fragment(books: list[dict], reading_pages: list[dict], *, heading='Published books and saved CARE readings', level=2) -> str:
    if level not in {1, 2}:
        raise ValueError('The catalogue heading level must be one or two.')
    whole = defaultdict(list)
    for entry in reading_pages:
        if entry.get('kind') == 'reading' and entry.get('layer') == 'WB':
            whole[entry['work_id']].append(entry)
    cards = []
    layer_names = {'CH':'Chapter', 'CL':'Cluster', 'MC':'Macro / metacluster', 'WB':'Whole-book', 'NUMO':'NUMO'}
    for book in sorted(books, key=lambda entry:(entry['title'].casefold(),entry['author'].casefold(),entry['work_id'])):
        links = ['<a href="' + _href(book['url']) + '">Open book and source</a>']
        if book.get('care_overview_url'):
            links.append('<a href="' + _href(book['care_overview_url']) + '">All saved CARE readings</a>')
        for layer, url in (book.get('care_layer_urls') or {}).items():
            links.append('<a href="' + _href(url) + '">' + escape(layer_names.get(layer,layer)) + ' readings</a>')
        summaries = []
        if len(whole[book['work_id']])==1 and book.get('summary_plaintext_url'):
            summaries.append('<p class="care-catalogue-links"><a href="'+_href(book['summary_plaintext_url'])+'">Whole-book CARE summary — plain text</a></p>')
        if len(whole[book['work_id']])==1 and book.get('summary_text_url') and book.get('summary_data_url'):
            summaries.append('<p class="care-catalogue-links"><a href="'+_href(book['summary_text_url'])+'">Full Markdown record</a>'
                             '<a href="'+_href(book['summary_data_url'])+'">Structured whole-book summary</a></p>')
        for reading in whole[book['work_id']]:
            summaries.append('<p class="care-catalogue-links"><a href="' + _href(reading['url']) + '">Whole-book CARE summary</a>'
                             + ('<a href="'+_href(reading['plaintext_url'])+'">Plain text</a>' if reading.get('plaintext_url') else '')
                             + '<a href="' + _href(reading['markdown_url']) + '">Markdown</a>'
                             '<a href="' + _href(reading['json_url']) + '">Structured CARE packet</a></p>')
        cards.append('<li><article><h3><a href="' + _href(book['url']) + '">' + escape(book['title']) + '</a></h3>'
                     '<p>by ' + escape(book['author']) + '</p><nav class="care-catalogue-links" aria-label="' + escape(book['title']+' reading links',quote=True) + '">'
                     + ''.join(links) + '</nav>' + ''.join(summaries) + '</article></li>')
    return (START + '<section class="care-static-catalogue" id="care-published-catalogue" aria-labelledby="care-published-catalogue-title">'
            f'<h{level} id="care-published-catalogue-title">' + escape(heading) + f'</h{level}>'
            '<p>Open a book’s original source or its saved CARE analysis. Whole-book summaries, chapter, cluster and macro readings have direct HTML and plain-text links; Markdown and structured CARE packets retain the full reading record. The interactive panes remain available.</p>'
            '<ul class="care-catalogue-grid">' + ''.join(cards) + '</ul>'
            '<p><a href="/research-index.json">Machine-readable research index</a> · <a href="/llms.txt">Reading and citation guide</a> · <a href="/numogram/">NUMO reference</a></p></section>' + END)


def strip_catalogue(document: str) -> str:
    """Semantic pages supply their own exact reading; omit repeated shelf HTML."""
    document=_STYLE_RE.sub('', BLOCK.sub('', document))
    # Its native host is inert while the page's exact saved reading is visible.
    # Normalize it before/after catalogue generation so rebuilds are identical.
    return re.sub(r'(<div\b[^>]*\bid=["\']reader["\'][^>]*>).*?(</div>)',
                  lambda match:match[1]+match[2],document,count=1,flags=re.I|re.S)


def with_style(document: str) -> str:
    document = _STYLE_RE.sub('', document)
    return re.sub(r'</head>', lambda _: STYLE + '</head>', document, count=1, flags=re.I)


def inject_catalogue(document: str, fragment: str, *, library=False) -> str:
    """Idempotent visible fallback; the normal app replaces #reader's children."""
    if BLOCK.search(document):
        document = BLOCK.sub(lambda _: fragment, document, count=1)
    elif library:
        reader = re.compile(r'(<div\b[^>]*\bid=["\']reader["\'][^>]*>)(.*?)(</div>)', re.I | re.S)
        if reader.search(document):
            document = reader.sub(lambda match:match[1] + fragment + match[3], document, count=1)
        else:
            # Minimal independent shell fixtures need not contain the real host.
            document = re.sub(r'</body>', lambda _:fragment+'</body>', document, count=1, flags=re.I)
    else:
        destination = r'</main>' if re.search(r'</main>',document,re.I) else r'</body>'
        document = re.sub(destination, lambda match:fragment+match[0], document, count=1, flags=re.I)
    # The old notice incorrectly implied that no saved reading could be read
    # without JavaScript and pointed to only two external original editions.
    document = re.sub(r'<noscript\b[^>]*>.*?</noscript>', '', document, flags=re.I | re.S)
    return with_style(document)
