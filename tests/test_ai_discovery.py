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
        self.write_manifests()

    def write_manifests(self):
        (self.root / "books/manifest.json").write_text(json.dumps(self.books))
        (self.root / "numogram/manifest.json").write_text(json.dumps(self.numogram))

    def build(self):
        with patch.object(ai, "load_reference", return_value=self.reference):
            return ai.build(self.root)

    def test_canonical_titles_identities_and_citations_are_complete_without_prose(self):
        first = self.build()
        content = (self.root / "research-index.json").read_text()
        guide = (self.root / "llms.txt").read_text()
        self.assertEqual(first["scope"], {"books": 1, "source_sections": 1, "demons": 1})
        self.assertEqual(first["books"][0]["url"], "https://carelibrary.org/adaauthoranoriginalbook")
        self.assertEqual(first["source_sections"][0]["source_id"], "RAW_CHAPTER")
        self.assertEqual(first["source_sections"][0]["citation"]["author"], "Ada Author")
        self.assertEqual(first["source_sections"][0]["citation"]["url"], "https://carelibrary.org/adaauthoranoriginalbook/001-the-first-section/")
        self.assertEqual(first["source_sections"][0]["citation"]["book_url"], "https://carelibrary.org/adaauthoranoriginalbook")
        self.assertEqual(first["demons"][0]["url"], "https://carelibrary.org/numogram/lurgo/")
        self.assertNotIn("PRIVATE TEXT", content + guide)
        self.assertNotIn("text.html", content + guide)
        self.assertNotIn("/books/book/", content + guide, "Redirect aliases and storage paths are not advertised as canonical citations")
        self.assertIn("https://carelibrary.org/adaauthoranoriginalbook)", guide)
        self.assertIn("AI-assisted CARE interpretations are separate", guide)
        self.assertIn("https://carelibrary.org/research-index.json", guide)
        self.assertEqual(self.build(), first, "Rebuilding unchanged metadata is deterministic")
        self.assertEqual((self.root / "research-index.json").read_text(), content)

    def test_sitemap_and_ai_index_use_the_same_manifest_canonicals_without_aliases(self):
        records = self.build()
        book_pages = [{"loc": item["url"]} for item in records["books"] + records["source_sections"]]
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

    def test_discovery_never_publishes_external_or_traversal_targets(self):
        for value in ("//elsewhere.test/", "https://elsewhere.test/book/", "/books/../private/", "/books/book/?token=secret"):
            with self.subTest(value=value):
                self.books["books"][0]["url"] = value
                self.write_manifests()
                with self.assertRaises(ValueError):
                    self.build()


if __name__ == "__main__":
    unittest.main()
