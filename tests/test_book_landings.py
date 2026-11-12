"""Editorial context is bounded, attributed and separate from saved analysis."""
from copy import deepcopy
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

TOOLS = Path(__file__).resolve().parents[1] / 'tools'
sys.path.insert(0, str(TOOLS))
import book_landings as landings
import book_seo as seo
from test_book_seo import _book, _publish


def _timaeus():
    work = _book(landings.TIMAEUS_WORK, 'Timaeus', 'Plato', 'existing-timaeus')
    work['source_url'] = 'https://www.perseus.tufts.edu/hopper/text?doc=tlg0059.tlg031.perseus-grc2.xml'
    work['sources'] = [{'id':f'RAW_PAGE_{page}', 'title':f'Section {page}', 'text':f'Exact saved Greek source {page}.'}
                       for page in (17,28,34,48,53,69,71,92)]
    work['units'].append({'id':'CH_PAGE_28','layer':'CH','title':'Section 28', 'parents':['RAW_PAGE_28'], 'sections':[]})
    return work


class BookLandingTests(unittest.TestCase):
    def test_reviewed_overview_is_factual_editorial_context_not_saved_care_text(self):
        work = _timaeus()
        guide = landings.landing_metadata(work)
        self.assertEqual(len(guide['overview']), 3)
        text = ' '.join(guide['overview'])
        self.assertTrue(120 <= len(text.split()) <= 160)
        self.assertLessEqual(len(guide['description']), 160)
        for term in ('Socrates','Critias','Atlantis','Demiurge','eternal model','world soul','time','receptacle','chōra','triangles','liver'):
            self.assertIn(term, text)
        page = seo._book_page(work, 'platotimaeus', 'https://carelibrary.org')
        self.assertIn('<h2 id="work-overview">Overview of the work</h2>', page)
        self.assertIn('Editorial guide', page)
        self.assertIn('Whole-book structural reading', page)
        self.assertIn('Close readings of citation pages (CH)', page)
        self.assertIn('CARE’s generated analysis', page)
        self.assertNotIn('A generated interpretation is not original', page)
        self.assertEqual(page.count('"@type":"Book"'), 1)
        self.assertIn('https://www.gutenberg.org/files/1572/1572-h/1572-h.htm', page)
        self.assertIn('https://plato.stanford.edu/entries/plato-timaeus/', page)

    def test_stephanus_display_labels_preserve_existing_identity_text_and_routes(self):
        work = _timaeus()
        original = deepcopy(work)
        slugs = seo._chapter_slugs(work)
        self.assertEqual(slugs['RAW_PAGE_17'], '001-section-17')
        page = seo._book_page(work, 'platotimaeus', 'https://carelibrary.org')
        self.assertIn('href="/platotimaeus/001-section-17/">Stephanus page 17</a>', page)
        self.assertIn('rather than authored chapter divisions', page)
        source = work['sources'][0]
        chapter = seo._chapter_page(work, 'platotimaeus', source, slugs[source['id']], 'https://carelibrary.org', include_text=True)
        self.assertIn('"@type":"CreativeWork"', chapter)
        self.assertNotIn('"@type":"Chapter"', chapter)
        self.assertIn('Exact saved Greek source 17.', chapter)
        self.assertIn('RAW_PAGE_17', chapter)
        self.assertNotRegex(page + chapter, r'17a|20c|28a|69a')
        self.assertEqual(work, original)
        self.assertEqual(slugs, seo._chapter_slugs(work))
        foreign = _book()
        foreign['sources'][0]['title'] = 'Section 17'
        self.assertEqual(landings.source_label(foreign,foreign['sources'][0]), 'Section 17')
        work['source_url'] = 'https://example.org/unrelated'
        self.assertEqual(landings.source_label(work, source), 'Section 17')

    def test_topics_only_link_to_existing_published_source_pages(self):
        work = _timaeus()
        work['sources'] = [source for source in work['sources'] if source['id'] != 'RAW_PAGE_71']
        topics = landings.landing_metadata(work)['topics']
        self.assertNotIn('The liver', [topic['title'] for topic in topics])
        self.assertEqual({topic['source_id'] for topic in topics}, {'RAW_PAGE_28','RAW_PAGE_34','RAW_PAGE_48','RAW_PAGE_53','RAW_PAGE_69'})
        page = seo._book_page(work, 'platotimaeus', 'https://carelibrary.org')
        self.assertIn('href="/platotimaeus/004-section-48/">Receptacle (chōra)</a>', page)

    def test_other_books_use_literal_saved_titles_and_never_invent_an_overview(self):
        work = _book()
        work['description'] = ''
        work['units'] = [{'id':'CH_A','layer':'CH','title':'1) Die Ware.', 'parents':['RAW_WORK_ONE'],
                          'translations':[{'language_code':'en','title':'1) The Commodity.'}], 'sections':[]}]
        guide = landings.landing_metadata(work)
        self.assertEqual(guide['overview'], [])
        self.assertEqual(guide['reading_map'][0]['title'], '1) The Commodity.')
        page = seo._book_page(work, 'examplebookofmemory', 'https://carelibrary.org')
        self.assertIn('A reading map', page)
        self.assertIn('1) The Commodity.', page)
        self.assertNotIn('Overview of the work', page)
        self.assertIn('/readings/ch/', page)
        work['units'][0]['title'] = 'Section 17'
        work['units'][0]['translations'] = []
        work['sources'][0]['title'] = 'Chapter I'
        self.assertEqual(landings.reading_map(work), [])
        self.assertEqual(landings.landing_metadata(work)['description'], '')
        work['sources'][0]['title'] = 'Argumental Spine'
        self.assertEqual(landings.reading_map(work), [])
        for title in ('T H E O R E M IIII.', 'T H E O R. X.', 'Theor. XVIII.', 'THEORY XXIIII.',
                      'BOOK ELEVEN.', 'BOOK THIRTEEN.', 'Première Partie.', 'Sixième Partie.', 'Summary and Conclusion'):
            with self.subTest(title=title):
                work['sources'][0]['title'] = title
                self.assertEqual(landings.reading_map(work), [])

    def test_reading_map_is_bounded_escaped_and_uses_reverse_source_mapping(self):
        work = _book()
        work['sources'] = [{'id':f'RAW_{i}', 'chapter_id':f'CH_{i}', 'title':f'Chapter {i}'} for i in range(8)]
        work['units'] = [{'id':f'CH_{i}', 'title':f'Saved topic {i} <script>x()</script>', 'layer':'CH','sections':[]}
                         for i in reversed(range(8))]
        entries = landings.reading_map(work)
        self.assertEqual([entry['id'] for entry in entries], ['CH_0','CH_2','CH_5','CH_7'])
        page = seo._book_page(work, 'examplebookofmemory', 'https://carelibrary.org')
        self.assertNotIn('<script>x()</script>', page)
        self.assertIn('&lt;script&gt;x()&lt;/script&gt;', page)

    def test_fixture_build_preserves_hash_attestation_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            work = _timaeus()
            published = _publish(root, [work])
            seo.build(root)
            manifest = json.loads((root/'books/manifest.json').read_text())
            chapter = manifest['chapters'][0]
            self.assertEqual(chapter['title'], 'Stephanus page 17')
            self.assertEqual(chapter['slug'], '001-section-17')
            self.assertEqual(chapter['source_id'], 'RAW_PAGE_17')
            book_path = root/manifest['books'][0]['path']
            before = book_path.read_bytes()
            seo.build(root)
            self.assertEqual(book_path.read_bytes(), before)
            self.assertEqual((root/'data/library.json').read_bytes(), published)
            self.assertIn('"book":"existing-timaeus"', book_path.read_text())


if __name__ == '__main__':
    unittest.main()
