"""Discovery files expose citation metadata, never gated book prose or drafts."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))
spec = importlib.util.spec_from_file_location("care_ai_discovery", TOOLS / "ai_discovery.py")
ai = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ai)
import search_index


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "books/book/chapter").mkdir(parents=True)
        (self.root / "numogram").mkdir()
        self.books = {"schema": "care-book-search-pages/1", "source_sha256": "attested-book-revision",
                      "books": [{"slug": "book", "work_id": "WORK", "reader_slug": "published-book",
                                 "title": "An Original Book", "author": "Ada Author", "url": "/adaauthoranoriginalbook",
                                 "route_slug": "adaauthoranoriginalbook", "aliases": ["/books/book/"],
                                 "path": "books/book/index.html", "text_path": "books/book/text.html"}],
                      "chapters": [{"work_id": "WORK", "source_id": "RAW_CHAPTER", "title": "The First Section",
                                    "url": "/adaauthoranoriginalbook/001-the-first-section/", "path": "books/book/chapter/index.html",
                                    "aliases": ["/books/book/chapter/"],
                                    "text_path": "books/book/chapter/text.html"}]}
        (self.root / "books/book/index.html").write_text('<html><head><title>An Original Book</title><script type="application/ld+json">{"@type":"Book","name":"An Original Book","author":{"@type":"Person","name":"Ada Author"}}</script></head></html>')
        (self.root / "books/book/chapter/index.html").write_text("<title>The First Section</title>")
        for name in ("books/book/text.html", "books/book/chapter/text.html", "private-studio-draft.txt"):
            (self.root / name).write_text("PRIVATE TEXT MUST NOT ENTER METADATA")
        self.reference = [{"id": "MESH-00", "name": "Lurgo", "poles": [1, 0], "domain": "Example attributed domain"}]
        self.numogram = {"version": 1, "public_reference_sha256": "published-reference-revision",
                         "pages": [{"url": "/numogram/", "path": "numogram/index.html"},
                                   {"url": "/numogram/lurgo/", "path": "numogram/lurgo/index.html", "demon_id": "MESH-00"}]}
        self.readings = {"schema": "care-reading-search-pages/1", "source_sha256": "attested-book-revision",
                         "pages": [{"kind": "overview", "work_id": "WORK", "url": "/adaauthoranoriginalbook/readings/",
                                    "path": "books/book/readings/index.html",
                                    "index_url": "/adaauthoranoriginalbook/readings/index.json",
                                    "index_path": "books/book/readings/index.json"}]}
        for layer in ("WB", "CH", "CL", "MC"):
            base = "/adaauthoranoriginalbook/readings/" + layer.lower() + "/"
            self.readings["pages"] += [
                {"kind": "layer", "work_id": "WORK", "layer": layer, "url": base},
                {"kind": "reading", "work_id": "WORK", "unit_id": layer + "_SAVED_UNIT", "layer": layer,
                 "url": base + "saved-reading/", "markdown_url": base + "saved-reading/reading.md",
                 "json_url": base + "saved-reading/fullreading.json",
                 "text_path": "books/book/never-load-saved-content.html", "title": layer + " saved reading",
                 "source_id": "RAW_CHAPTER", "revision": "saved-revision", "content_sha256": "recorded-content-hash",
                 "item_count": 3, "section_count": 1}]
        (self.root / "books/book/never-load-saved-content.html").write_text("SAVED INTERPRETATION PROSE MUST NOT BE COPIED INTO INDEX")
        self.write_manifests()

    def write_manifests(self):
        (self.root / "books/manifest.json").write_text(json.dumps(self.books))
        (self.root / "numogram/manifest.json").write_text(json.dumps(self.numogram))
        (self.root / "books/readings-manifest.json").write_text(json.dumps(self.readings))

    def build(self):
        with patch.object(ai, "load_reference", return_value=self.reference):
            return ai.build(self.root)

    def details(self):
        return json.loads((self.root / "books/book/readings/index.json").read_text())

    def test_short_summary_addresses_are_additional_and_ambiguous_wb_omits_them(self):
        overview=self.readings['pages'][0]
        overview.update(summary_text_url='/adaauthoranoriginalbook/summary.md',summary_data_url='/adaauthoranoriginalbook/summary.json')
        self.write_manifests();first=self.build();book=first['books'][0]
        self.assertEqual(book['summary_text_url'],'https://carelibrary.org/adaauthoranoriginalbook/summary.md')
        self.assertEqual(book['summary_data_url'],'https://carelibrary.org/adaauthoranoriginalbook/summary.json')
        self.assertIn('/readings/wb/saved-reading/',book['whole_book_reading_url'])
        guide=(self.root/'llms.txt').read_text();self.assertIn(book['summary_text_url'],guide);self.assertIn(book['whole_book_reading_text_url'],guide)
        self.assertEqual(first,self.build())
        duplicate=dict(next(item for item in self.readings['pages'] if item.get('unit_id')=='WB_SAVED_UNIT'))
        duplicate.update(unit_id='WB_SECOND',url='/adaauthoranoriginalbook/readings/wb/other/')
        self.readings['pages'].append(duplicate);self.write_manifests()
        ambiguous=self.build()['books'][0]
        self.assertNotIn('summary_text_url',ambiguous);self.assertNotIn('summary_data_url',ambiguous)
        self.readings['pages']=[item for item in self.readings['pages'] if item.get('layer')!='WB'];self.write_manifests()
        empty=self.build()['books'][0]
        self.assertNotIn('summary_text_url',empty);self.assertNotIn('summary_data_url',empty)

    def test_preferred_plain_text_is_advertised_first_with_positive_summary_guidance(self):
        self.readings['pages'][0]['summary_plaintext_url']='/adaauthoranoriginalbook/summary.txt'
        wb=next(item for item in self.readings['pages'] if item.get('unit_id')=='WB_SAVED_UNIT')
        wb['plaintext_url']=wb['url']+'reading.txt';self.write_manifests()
        result=self.build();book=result['books'][0]
        self.assertEqual(book['summary_plaintext_url'],'https://carelibrary.org/adaauthoranoriginalbook/summary.txt')
        reading=next(item for item in self.details()['care_readings'] if item['layer']=='WB')
        self.assertEqual(reading['plain_text_url'],'https://carelibrary.org'+wb['plaintext_url'])
        self.assertTrue(reading['text_url'].endswith('/reading.md'))
        guide=(self.root/'llms.txt').read_text()
        self.assertLess(guide.index('/summary.txt'),guide.index(wb['markdown_url']))
        self.assertIn('central problem',guide);self.assertIn('concept connections',guide)
        self.assertIn('claim IDs support precise attribution',guide);self.assertIn('compact source note',guide)
        self.assertIn('Chapter readings retain its close textual detail',guide)
        self.assertIn('bounded recorded source trails',guide)
        self.assertNotIn('not proof',guide);self.assertNotIn('No page or index grants',guide)

    def test_canonical_titles_identities_and_citations_are_complete_without_prose(self):
        first = self.build()
        content = (self.root / "research-index.json").read_text()
        guide = (self.root / "llms.txt").read_text()
        details = self.details()
        self.assertEqual(first["scope"], {"books": 1, "source_sections": 1, "care_readings": 4, "demons": 1})
        self.assertEqual(first["books"][0]["url"], "https://carelibrary.org/adaauthoranoriginalbook")
        self.assertEqual(first["schema"], "care-research-index/2")
        self.assertEqual(first["books"][0]["details_index"], "https://carelibrary.org/adaauthoranoriginalbook/readings/index.json")
        self.assertNotIn("source_sections", first)
        self.assertNotIn("care_readings", first, "The root stays compact as more units are published")
        self.assertEqual(details["schema"], "care-book-research-index/1")
        self.assertEqual(details["scope"], {"source_sections": 1, "care_readings": 4})
        self.assertEqual(details["source_sections"][0]["source_id"], "RAW_CHAPTER")
        self.assertEqual(details["source_sections"][0]["citation"]["author"], "Ada Author")
        self.assertEqual(details["source_sections"][0]["citation"]["url"], "https://carelibrary.org/adaauthoranoriginalbook/001-the-first-section/")
        self.assertEqual(details["source_sections"][0]["citation"]["book_url"], "https://carelibrary.org/adaauthoranoriginalbook")
        self.assertEqual(first["demons"][0]["url"], "https://carelibrary.org/numogram/lurgo/")
        self.assertNotIn("PRIVATE TEXT", content + guide)
        self.assertNotIn("SAVED INTERPRETATION PROSE", content + guide)
        self.assertNotIn("text.html", content + guide)
        self.assertNotIn("/books/book/", content + guide, "Redirect aliases and storage paths are not advertised as canonical citations")
        self.assertIn("https://carelibrary.org/adaauthoranoriginalbook)", guide)
        self.assertIn("AI-assisted CARE interpretations are separate", guide)
        self.assertIn("https://carelibrary.org/research-index.json", guide)
        self.assertEqual(self.build(), first, "Rebuilding unchanged metadata is deterministic")
        self.assertEqual((self.root / "research-index.json").read_text(), content)

    def test_saved_care_text_is_discoverable_by_book_level_and_exact_unit_without_misattribution(self):
        records = self.build()
        book = records["books"][0]
        self.assertEqual(book["care_readings_url"], "https://carelibrary.org/adaauthoranoriginalbook/readings/")
        self.assertEqual(book["care_reading_count"], 4)
        self.assertEqual({layer["layer"] for layer in book["care_layers"]}, {"CH", "CL", "MC", "WB"})
        wb = next(item for item in self.details()["care_readings"] if item["layer"] == "WB")
        self.assertEqual(wb["citation"]["care_unit_id"], "WB_SAVED_UNIT")
        self.assertEqual(wb["content_origin"], "saved_ai_assisted_interpretation")
        self.assertEqual(wb["citation"]["work_author"], "Ada Author")
        self.assertNotIn("author", wb["citation"], "The original author did not write the saved CARE interpretation")
        self.assertEqual(wb["source_id"], "RAW_CHAPTER")
        self.assertEqual(wb["revision"], "saved-revision")
        self.assertTrue(wb["text_url"].endswith("/reading.md"))
        self.assertTrue(wb["data_url"].endswith("/fullreading.json"))
        self.assertEqual(wb["data_schema"], "care-reading-packet/1")
        self.assertEqual(book["whole_book_reading_url"], wb["url"])
        self.assertEqual(book["whole_book_reading_text_url"], wb["text_url"])
        self.assertEqual(book["whole_book_reading_data_url"], wb["data_url"])
        guide = (self.root / "llms.txt").read_text()
        self.assertIn(wb["url"], guide)
        self.assertIn(wb["text_url"], guide)
        self.assertIn(wb["data_url"], guide)
        self.assertIn("readable HTML", guide)
        self.assertIn("metadata-only research index", guide)
        self.assertIn("Chapter CARE readings (CH)", guide)

    def test_sitemap_and_ai_index_use_the_same_manifest_canonicals_without_aliases(self):
        records = self.build()
        details = self.details()
        book_pages = [{"loc": item["url"]} for item in records["books"] + details["source_sections"] + details["care_readings"]]
        book_pages += [{"loc": book["care_readings_url"]} for book in records["books"]]
        book_pages += [{"loc": layer["url"]} for book in records["books"] for layer in book["care_layers"]]
        numogram_pages = [{"loc": item["url"]} for item in records["demons"]]
        with patch.object(search_index, "build_books", return_value=book_pages), patch.object(search_index, "build_numogram", return_value=numogram_pages):
            search_index.build(self.root)
        namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        locations = [node.text for node in ET.parse(self.root / "sitemap.xml").findall("s:url/s:loc", namespace)]
        self.assertEqual(len(locations), len(set(locations)))
        self.assertTrue({item["loc"] for item in book_pages + numogram_pages}.issubset(locations))
        self.assertFalse(any("/books/book/" in url for url in locations))

    def test_missing_book_and_unpublished_demon_targets_are_rejected(self):
        self.books["chapters"][0]["work_id"] = "UNKNOWN"
        self.write_manifests()
        with self.assertRaisesRegex(ValueError, "published book"):
            self.build()
        self.books["chapters"][0]["work_id"] = "WORK"
        self.numogram["pages"] = self.numogram["pages"][:1]
        self.write_manifests()
        with self.assertRaisesRegex(ValueError, "every published demon"):
            self.build()

    def test_saved_reading_metadata_requires_the_same_export_and_exact_available_targets(self):
        self.readings["source_sha256"] = "a-different-export"
        self.write_manifests()
        with self.assertRaisesRegex(ValueError, "same published export"):
            self.build()
        self.readings["source_sha256"] = "attested-book-revision"
        self.readings["pages"][-1]["work_id"] = "UNKNOWN"
        self.write_manifests()
        with self.assertRaisesRegex(ValueError, "published book"):
            self.build()

    def test_per_book_details_cannot_write_to_an_unregistered_or_external_path(self):
        self.readings["pages"][0]["index_path"] = "data/not-the-overview.json"
        self.write_manifests()
        with self.assertRaisesRegex(ValueError, "exact registered metadata route"):
            self.build()

    def test_adding_saved_units_grows_only_the_book_details_not_the_master_catalogue(self):
        first = self.build()
        before = (self.root / "research-index.json").stat().st_size
        template = next(item for item in self.readings["pages"] if item.get("kind") == "reading" and item.get("layer") == "CH")
        for number in range(1000):
            self.readings["pages"].append({**template, "unit_id": "CH_MORE_" + str(number),
                                           "url": "/adaauthoranoriginalbook/readings/ch/more-" + str(number) + "/",
                                           "markdown_url": "/adaauthoranoriginalbook/readings/ch/more-" + str(number) + "/reading.md"})
        self.write_manifests()
        result = self.build()
        self.assertEqual(result["scope"]["care_readings"], first["scope"]["care_readings"] + 1000)
        self.assertEqual(len(self.details()["care_readings"]), 1004)
        self.assertLess((self.root / "research-index.json").stat().st_size - before, 100)

    def test_discovery_never_publishes_external_or_traversal_targets(self):
        for value in ("//elsewhere.test/", "https://elsewhere.test/book/", "/books/../private/", "/books/book/?token=secret"):
            with self.subTest(value=value):
                self.books["books"][0]["url"] = value
                self.write_manifests()
                with self.assertRaises(ValueError):
                    self.build()


if __name__ == "__main__":
    unittest.main()
