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

# This is a visual loading surface, not an alternate crawler response. The
# catalogue remains ordinary HTML beneath it, including when scripts are off.
# Set the state synchronously in the head, before any deferred module can paint.
BOOT_SCRIPT = r"""(() => {
 const root=document.documentElement;
 root.dataset.careLibraryBoot='loading';
 let timer;
 function panel(){return document.getElementById('care-library-loading');}
 function message(text){
  const surface=panel();
  if(!surface)return;
  surface.querySelector('[data-care-library-loading-status]').textContent=text;
  surface.querySelector('[data-care-library-loading-actions]').hidden=false;
 }
 window.CARELibraryBoot={
  ready(){clearTimeout(timer);root.dataset.careLibraryBoot='ready';panel()?.remove();},
  fail(){clearTimeout(timer);root.dataset.careLibraryBoot='error';message('CARE Library could not load. Check your connection and try again.');}
 };
 document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-care-library-retry]'))location.reload();
 });
 timer=setTimeout(()=>{
  if(root.dataset.careLibraryBoot!=='loading')return;
  root.dataset.careLibraryBoot='slow';
  message('Opening CARE Library is taking longer than usual.');
 },20000);
})();"""
BOOT_STYLE = '''<style id="care-library-loading-style">
#care-library-loading{display:none}
html[data-care-library-boot="loading"] #care-library-loading,html[data-care-library-boot="slow"] #care-library-loading,html[data-care-library-boot="error"] #care-library-loading{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:32px max(24px,env(safe-area-inset-right)) 32px max(24px,env(safe-area-inset-left));background:#0d1015;color:#ece8df;overscroll-behavior:none;text-align:center;font:15px/1.6 system-ui,-apple-system,sans-serif}
#care-library-loading .care-library-loading-copy{max-width:30rem}
#care-library-loading img{display:block;width:74px;height:74px;object-fit:contain;margin:0 auto 18px}
#care-library-loading strong{display:block;font-size:19px;font-weight:500;letter-spacing:.08em}
#care-library-loading p{margin:12px 0;color:#b8c0bd}
#care-library-loading [data-care-library-loading-actions]:not([hidden]){display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px 20px;margin-top:20px}
#care-library-loading button{min-height:44px;padding:8px 18px;border:1px solid #62746c;border-radius:6px;background:#24332d;color:#ece8df;font:inherit;cursor:pointer}
#care-library-loading a{color:#c5d9cc;text-underline-offset:.2em}
#care-library-loading :is(a,button):focus-visible{outline:2px solid #c5d9cc;outline-offset:4px}
</style>'''
BOOT_HEAD = BOOT_STYLE + '<script id="care-library-loading-script">' + BOOT_SCRIPT + '</script>'
BOOT_SURFACE = '''<!-- CARE-LIBRARY-LOADING:START --><div id="care-library-loading" aria-label="Opening CARE Library"><div class="care-library-loading-copy"><img src="/assets/care-mark.svg" alt=""><strong>CARE Library</strong><p role="status" aria-live="polite" data-care-library-loading-status>Opening the library…</p><div data-care-library-loading-actions hidden><button type="button" data-care-library-retry>Try again</button><a href="/books/">Read text catalogue</a></div></div></div><!-- CARE-LIBRARY-LOADING:END -->'''
_BOOT_HEAD_RE = re.compile(r'<(?:style|script)\b[^>]*\bid=["\']care-library-loading-(?:style|script)["\'][^>]*>.*?</(?:style|script)>', re.I | re.S)
_BOOT_SURFACE_RE = re.compile(r'<!-- CARE-LIBRARY-LOADING:START -->.*?<!-- CARE-LIBRARY-LOADING:END -->', re.S)


def strip_library_loading(document: str) -> str:
    return _BOOT_SURFACE_RE.sub('', _BOOT_HEAD_RE.sub('', document))


def with_library_loading(document: str) -> str:
    """Cover the native app's startup without removing its semantic fallback."""
    document = strip_library_loading(document)
    if not re.search(r'<div\b[^>]*\bid=["\']reader["\']', document, re.I):
        return document
    document = re.sub(r'</head>', lambda _: BOOT_HEAD + '</head>', document, count=1, flags=re.I)
    return re.sub(r'(<body\b[^>]*>)', lambda match: match[1] + BOOT_SURFACE, document, count=1, flags=re.I)


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
    document=strip_library_loading(_STYLE_RE.sub('', BLOCK.sub('', document)))
    # Its native host is inert while the page's exact saved reading is visible.
    # Normalize it before/after catalogue generation so rebuilds are identical.
    return re.sub(r'(<div\b[^>]*\bid=["\']reader["\'][^>]*>).*?(</div>)',
                  lambda match:match[1]+match[2],document,count=1,flags=re.I|re.S)


def with_style(document: str) -> str:
    document = _STYLE_RE.sub('', document)
    return re.sub(r'</head>', lambda _: STYLE + '</head>', document, count=1, flags=re.I)


def inject_catalogue(document: str, fragment: str, *, library=False) -> str:
    """Idempotent semantic fallback, with an early cover for the native app."""
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
    document = with_style(document)
    return with_library_loading(document) if library else document
