"""Semantic book/reading responses contain evidence before UI enhancement."""
from html.parser import HTMLParser
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from seo_shell import embed_library


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.text, self.links = [], [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs.get("href"))

    def handle_data(self, text):
        self.text.append(text)


def test_workspace_html_keeps_only_its_semantic_reading_and_minimal_open_control(tmp_path):
    native = '''<!doctype html><html><head><title>CARE Library</title>
<link rel="stylesheet" href="/public-app.css"><script type="module" src="/library-boot.mjs"></script></head>
<body><header id="workbench-library-menu">Periodic table of demons</header><button>Search NUMO / AQ</button>
<dialog>Available in the full version</dialog><main id="main"><div id="reader"></div></main>
<section id="studio-workspace"></section><script>startNativeAgain()</script></body></html>'''
    (tmp_path / "library.html").write_text(native)
    reference = '''<!doctype html><html><head><title>Timaeus reading</title>
<link rel="canonical" href="https://carelibrary.org/platotimaeus/readings/wb/saved/"></head>
<body><a href="#main">Skip to reading</a><main id="main"><h1>Timaeus</h1><p id="claim-one">The complete saved interpretation remains readable.</p></main></body></html>'''
    for route in ({"view": "workspace", "book": "plato"},
                  {"view": "workspace", "book": "plato", "unit": "WB_EXACT", "ref": "WB_EXACT:A1"}):
        result = embed_library(tmp_path, reference, route)
        page = Page(result)
        assert "The complete saved interpretation remains readable." in result
        assert "Open in CARE" in page.text
        assert 'data-care-search-shell="library"' in result
        assert '<div id="care-search-app" aria-hidden="true" inert data-care-search-shell="library"></div>' in result
        assert 'href="#care-reference-main"' in result
        assert len(page.ids) == len(set(page.ids))
        for irrelevant in ("Periodic table of demons", "Search NUMO / AQ", "Available in the full version",
                           "startNativeAgain", "library-boot.mjs", 'id="reader"', 'id="studio-workspace"'):
            assert irrelevant not in result
        assert json.dumps(route, separators=(",", ":")) in result
        assert any(link and link.startswith("/library.html#view=workspace&book=plato") for link in page.links)
        if route.get("unit"):
            assert any("unit=WB_EXACT" in link and "ref=WB_EXACT%3AA1" in link for link in page.links if link)
        assert 'href="/public-app.css"' in result
        assert 'href="https://carelibrary.org/platotimaeus/readings/wb/saved/"' in result
    # Anonymous Numogram pages retain their established local shell and do not
    # require the authenticated Library endpoint merely to show the map.
    numogram = embed_library(tmp_path, reference, {"view": "numogram", "demon": "1"})
    assert 'data-care-search-shell="library"' not in numogram
    assert 'id="reader"' in numogram
