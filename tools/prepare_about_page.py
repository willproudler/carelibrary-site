"""Refresh About's small saved excerpts from the published export; no model calls."""
from __future__ import annotations

from html import escape
import json
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

START = '<!-- CARE-ABOUT-PANELS:START -->'
END = '<!-- CARE-ABOUT-PANELS:END -->'


def safe_external(value):
    if not isinstance(value, str):
        return ''
    parsed = urlsplit(value)
    return value if parsed.scheme in {'https', 'http'} and parsed.netloc and not parsed.username and not parsed.password else ''


def rights_disclosure(books):
    if not books or len({book['id'] for book in books}) != len(books):
        raise ValueError('The public book records must contain unique works.')
    rows = []
    for book in books:
        notices = book.get('source_notices') or {}
        source = safe_external(book.get('source_url')) or safe_external(notices.get('source_url'))
        licence = safe_external(notices.get('licence') or notices.get('license'))
        title, author = escape(book['title']), escape(book.get('author') or 'Not recorded')
        slug = book.get('slug') or book['id']
        from urllib.parse import urlencode
        destination = '/library.html#' + urlencode({'book': slug})
        edition = escape(book.get('edition') or 'Not recorded')
        provider = escape(notices.get('provider') or 'Not recorded')
        statement = escape(notices.get('statement') or 'Edition or transcription terms not recorded.')
        links = []
        if source:
            links.append('<a href="' + escape(source, quote=True) + '" target="_blank" rel="noopener">Source edition ↗</a>')
        if licence:
            label = 'Recorded licence / rights link'
            if licence.rstrip('/') == 'https://creativecommons.org/licenses/by-sa/4.0':
                label = 'CC BY-SA 4.0'
            elif licence.rstrip('/') == 'https://creativecommons.org/publicdomain/zero/1.0':
                label = 'CC0 1.0'
            elif 'gutenberg.org/policy/license' in licence:
                label = 'Project Gutenberg terms'
            links.append('<a href="' + escape(licence, quote=True) + '" target="_blank" rel="noopener">' + label + ' ↗</a>')
        rows.append('<li data-rights-work="' + escape(book['id'], quote=True) + '"><div class="rights-title"><a href="' + escape(destination, quote=True) + '">' + title + '</a><span class="public-domain-label">Public-domain work</span></div><p class="rights-author">' + author + '</p><dl class="rights-record"><dt>Edition</dt><dd>' + edition + '</dd><dt>Provider</dt><dd>' + provider + '</dd><dt>Terms</dt><dd>' + statement + '</dd></dl>' + ('<div class="rights-links">' + ''.join(links) + '</div>' if links else '') + '</li>')
    return '<!-- CARE-ABOUT-RIGHTS:START --><details class="book-rights"><summary>View all ' + str(len(books)) + ' books and source licences</summary><ul>' + ''.join(rows) + '</ul><p class="rights-explanation">The public-domain label refers to the original work. Source notices above are reproduced as recorded for the supplied edition or transcription.</p></details><!-- CARE-ABOUT-RIGHTS:END -->'


def inject_examples(source: Path, data: dict) -> None:
    if data.get('schema') != 'care-about-panels/1' or set(data.get('panels', {})) != {'metaphysics', 'kant', 'lateral'}:
        raise ValueError('The saved About examples are incomplete.')
    page = source / 'about.html'
    document = page.read_text(encoding='utf-8')
    if data.get('books'):
        rights = rights_disclosure(data['books'])
        document, count = re.subn(r'<!-- CARE-ABOUT-RIGHTS:START -->.*?<!-- CARE-ABOUT-RIGHTS:END -->', lambda _: rights, document, count=1, flags=re.S)
        if count != 1:
            raise ValueError('The About page is missing its book rights disclosure.')
        document = re.sub(r'(<span data-about-book-count>).*?(</span>)', lambda match: match[1] + str(len(data['books'])) + match[2], document)
    for key, panel in data['panels'].items():
        if panel.get('source'):
            passages = panel['source']['stack']['active_chapter']['passages']
            text = passages[0].get('reading_text') or passages[0]['text']
            identity = passages[0]['id']
            label = 'Source · saved excerpt'
        else:
            sheet = panel['chapter']['stack']['care_path'][0]
            item = next(item for section in sheet['sections'] for item in section['items'])
            text = item.get('reading_text') or item['text']
            identity = item['id']
            label = ('Lateral' if key == 'lateral' else 'Chapter') + ' · saved excerpt'
        href = panel.get('sourceHref') if panel.get('source') else panel['chapterHref']
        if not isinstance(href, str) or not href.startswith('/library.html#'):
            raise ValueError('An About reading has no valid Library destination.')
        fallback = '<div class="live-fallback"><p>' + escape(label) + '</p><blockquote>' + escape(text) + '</blockquote><span data-fallback-id>' + escape(identity) + '</span></div>'
        pattern = re.compile(r'(<figure\b[^>]*data-about-live-panel="' + re.escape(key) + r'"[^>]*>)(.*?)(</figure>)', re.S)
        def update(match):
            body = match[2]
            body, count = re.subn(r'(<div class="live-panel"[^>]*>).*?(</div>\s*</div>)', lambda m: m[1] + fallback + '</div>', body, count=1, flags=re.S)
            if count != 1:
                raise ValueError('An About example is missing its fallback host.')
            body, count = re.subn(r'(<a\b[^>]*data-about-open-reading\b[^>]*href=")[^"]*(")', lambda m: m[1] + escape(href, quote=True) + m[2], body, count=1)
            if count != 1:
                raise ValueError('An About example is missing its full reading link.')
            return match[1] + body + match[3]
        document, count = pattern.subn(update, document, count=1)
        if count != 1:
            raise ValueError('An About example is missing from the page.')
    public_data = {key: value for key, value in data.items() if key != 'books'}
    encoded = json.dumps(public_data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    packet = START + '\n<script id="about-panel-data" type="application/json">' + encoded + '</script>\n' + END
    if START in document:
        document = re.sub(re.escape(START) + '.*?' + re.escape(END), lambda _: packet, document, count=1, flags=re.S)
    else:
        document = document.replace('</main>', '</main>\n' + packet, 1)
    page.write_text(document, encoding='utf-8')


def build(source: Path) -> None:
    tools = Path(__file__).resolve().parent
    # The destination is a public web root without a tools directory. Keep
    # intermediate packets outside it and remove them on success or failure.
    with TemporaryDirectory(prefix='care-about-build-') as temporary:
        output = Path(temporary) / 'about-panel-data.json'
        rights_output = Path(temporary) / 'about-book-rights.json'
        subprocess.run(['node', str(tools / 'build-about-examples.mjs'), str(source), str(output)], check=True)
        subprocess.run(['node', str(tools / 'build-about-rights.mjs'), str(source), str(rights_output)], check=True)
        data = json.loads(output.read_text(encoding='utf-8'))
        data['books'] = json.loads(rights_output.read_text(encoding='utf-8'))
        inject_examples(source, data)


if __name__ == '__main__':
    import sys
    source = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
    if len(sys.argv) > 2:
        inject_examples(source, json.loads(Path(sys.argv[2]).read_text(encoding='utf-8')))
    else:
        build(source)
