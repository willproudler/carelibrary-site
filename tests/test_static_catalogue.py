"""The actual catalogue links must be readable from ordinary HTML, without JS."""
from __future__ import annotations

from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from test_book_seo import _publish,seo
from test_reading_seo import _reading_book
from static_catalogue import START,END,catalogue_fragment


class _Links(HTMLParser):
    def __init__(self,text):
        super().__init__(convert_charrefs=True);self.links=[];self.ids=[];self.tags=[];self.meta=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs);self.tags.append(tag)
        if tag=='a':self.links.append(attrs.get('href',''))
        if 'id' in attrs:self.ids.append(attrs['id'])
        if tag=='meta':self.meta.append(attrs)


class StaticCatalogueTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        self.work=_reading_book();_publish(self.root,[self.work])
        (self.root/'library.html').write_text('<!doctype html><html><head><meta name="robots" content="index,follow"><link rel="canonical" href="https://carelibrary.org/library.html"></head><body><nav id="existing-navigation">Native navigation</nav><main><div id="reader" tabindex="-1"><p class="loading">Opening reader</p></div></main><noscript>The reading panes need JavaScript. Gutenberg only.</noscript></body></html>')
        (self.root/'index.html').write_text('<!doctype html><html><head><title>CARE Library</title></head><body><main><h1>Existing homepage</h1><section id="existing-home">Existing homepage content</section><noscript>The interactive reader needs JavaScript.</noscript></main></body></html>')
        seo.build(self.root)
        self.book=json.loads((self.root/'books/manifest.json').read_text())['books'][0]
        self.readings=json.loads((self.root/'books/readings-manifest.json').read_text())['pages']
        self.wb=next(entry for entry in self.readings if entry.get('unit_id')=='WB_TIM')

    def test_library_home_and_book_cards_expose_real_canonical_reading_links(self):
        expected={self.book['url'],self.book['care_overview_url'],*self.book['care_layer_urls'].values(),
                  self.wb['url'],self.wb['markdown_url'],self.wb['json_url'],self.book['summary_text_url'],self.book['summary_data_url']}
        for path in (self.root/'library.html',self.root/'index.html',self.root/'books/index.html'):
            text=path.read_text();parsed=_Links(text)
            self.assertTrue(expected.issubset(set(parsed.links)),str(path))
            self.assertNotIn('The reading panes need JavaScript',text)
            self.assertNotIn('The interactive reader needs JavaScript',text)
            self.assertNotIn('<noscript',text)
            self.assertEqual(text.count(START),1)
            self.assertEqual(text.count(END),1)
            self.assertNotIn('Saved English whole-book CARE thesis',text,'Catalogue contains links, not gated reading prose')
            self.assertEqual(len(parsed.ids),len(set(parsed.ids)),str(path))
        library=(self.root/'library.html').read_text()
        self.assertLess(library.index('id="reader"'),library.index(START))
        self.assertLess(library.index(END),library.index('</main>'))
        self.assertIn('id="existing-navigation"',library)
        self.assertIn('id="existing-home"',(self.root/'index.html').read_text())
        self.assertIn({'name':'robots','content':'index,follow'},_Links(library).meta)

    def test_identical_rebuild_is_byte_stable_and_semantic_pages_omit_shelf_duplication(self):
        files=[self.root/'library.html',self.root/'index.html',self.root/'books/index.html',self.root/self.wb['text_path']]
        before={path:path.read_bytes() for path in files}
        seo.build(self.root)
        for path in files:self.assertEqual(path.read_bytes(),before[path],str(path))
        semantic=(self.root/self.wb['text_path']).read_text()
        self.assertNotIn(START,semantic)
        self.assertNotIn('id="care-published-catalogue"',semantic)
        self.assertNotIn('id="care-published-catalogue-style"',semantic)
        self.assertIn('id="reader"',semantic)

    def test_catalogue_escapes_titles_and_rejects_external_or_unreviewed_paths(self):
        book={**self.book,'title':'<script>Foreign title</script>'}
        html=catalogue_fragment([book],self.readings)
        self.assertIn('&lt;script&gt;Foreign title&lt;/script&gt;',html)
        self.assertNotIn('<script>Foreign title</script>',html)
        book['url']='https://unreviewed.example/another-book'
        with self.assertRaises(ValueError):catalogue_fragment([book],self.readings)

    def test_short_summary_links_are_not_advertised_for_zero_or_multiple_wb(self):
        without=[entry for entry in self.readings if not(entry.get('kind')=='reading' and entry.get('layer')=='WB')]
        self.assertNotIn('/summary.md',catalogue_fragment([self.book],without))
        multiple=[*self.readings,{**self.wb,'unit_id':'WB_SECOND'}]
        self.assertNotIn('/summary.md',catalogue_fragment([self.book],multiple))


if __name__=='__main__':unittest.main()
