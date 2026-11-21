"""Saved complete translations remain distinct from original source evidence."""
from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile
import unittest

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tools"))
from source_languages import edition_record, source_language_editions
from server.app import create_app


def work():
    return {
        "id": "WORK", "slug": "existing-book", "seal": "SEALED", "title": "A source book",
        "author": "An author", "language_code": "fr", "language_name": "Français",
        "sources": [
            {"id": "RAW_A", "title": "Première", "sha256": "a" * 64, "text": "Original A.",
             "paragraphs": [{"id": "RAW_A:P1", "text": "Original A."}],
             "translations": [
                 {"id": "EN_A", "language_code": "en", "language_name": "English", "rendition_type": "machine",
                  "review_status": "machine", "source_sha256": "a" * 64, "source_language_code": "fr",
                  "title": "First", "paragraphs": [{"id": "RAW_A:P1", "text": "Translated A."}]},
                 {"id": "DE_A", "language_code": "de", "language_name": "Deutsch", "text": "Only one German section."},
             ]},
            {"id": "RAW_B", "title": "Deuxième", "sha256": "b" * 64, "text": "Original B.",
             "paragraphs": [{"id": "RAW_B:P1", "text": "Original B."}],
             "translations": [
                 {"id": "EN_B", "language_code": "en", "language_name": "English", "rendition_type": "machine",
                  "review_status": "machine", "source_sha256": "b" * 64, "text": "Translated B."},
             ]},
        ],
        "units": [{"id": "GENERATED_ANALYSIS", "text": "Never presented as original or translated source."}],
    }


class SourceLanguageProjectionTests(unittest.TestCase):
    def test_missing_translation_method_is_left_unspecified(self):
        value = work()
        for source in value["sources"]:
            translation = source["translations"][0]
            del translation["rendition_type"], translation["review_status"]
        edition, = source_language_editions(value)
        self.assertEqual(edition["rendition_type"], "unspecified")
        self.assertEqual(edition["review_status"], "unspecified")

    def test_only_complete_saved_languages_are_projected_without_mutating_originals(self):
        value = work()
        original = deepcopy(value)
        editions = source_language_editions(value)
        self.assertEqual(value, original)
        self.assertEqual([row["language_code"] for row in editions], ["en"])
        edition = editions[0]
        self.assertEqual(edition["kind"], "translation")
        self.assertEqual(edition["rendition_type"], "machine")
        self.assertEqual(edition["review_status"], "machine")
        projection = edition["work"]
        self.assertEqual((projection["id"], projection["seal"]), ("WORK", "SEALED"))
        self.assertEqual(projection["language_code"], "en")
        self.assertEqual(projection["source_language_edition"]["source_language_code"], "fr")
        self.assertEqual([source["id"] for source in projection["sources"]], ["RAW_A", "RAW_B"])
        self.assertEqual([source["text"] for source in projection["sources"]], ["Translated A.", "Translated B."])
        self.assertEqual(projection["units"], [])
        for source in projection["sources"]:
            self.assertEqual(source["paragraphs"], [])
            self.assertNotIn("translations", source)
        self.assertNotIn("Original A.", json.dumps(projection))
        self.assertNotIn("GENERATED_ANALYSIS", json.dumps(projection))

    def test_partial_stale_quotation_and_unsafe_variants_are_not_offered(self):
        variants = [
            {"source_sha256": "0" * 64},
            {"source_language_code": "de"},
            {"translate_quotations": True},
            {"language_code": "../en"},
            {"text": "", "paragraphs": [{"text": ""}]},
        ]
        for change in variants:
            with self.subTest(change=change):
                value = work()
                value["sources"][1]["translations"][0].update(change)
                self.assertEqual(source_language_editions(value), [])
        value = work()
        value["sources"][1]["translations"] = []
        self.assertEqual(source_language_editions(value), [])

    def test_saved_order_is_used_and_original_language_is_not_reoffered_as_translation(self):
        value = work()
        for source in value["sources"]:
            source["translations"].append({"language_code": "en", "text": "An older variant."})
            source["translations"].append({"language_code": "fr", "text": "Same-language rendering."})
        editions = source_language_editions(value)
        self.assertEqual(len(editions), 1)
        self.assertEqual(editions[0]["work"]["sources"][0]["text"], "Translated A.")

    def test_edition_records_preserve_current_original_routes_and_safe_language_paths(self):
        original = edition_record({"kind": "original", "language_code": "fr", "language_name": "Français"},
                                  "source-book", "authorsourcebook")
        self.assertEqual(original["path"], "books/source-book/text.html")
        self.assertEqual(original["url"], "/authorsourcebook")
        translated = edition_record({"language_code": "EN_us", "language_name": "English"},
                                    "source-book", "authorsourcebook", "001-leçon")
        self.assertEqual(translated["language_code"], "en-us")
        self.assertEqual(translated["path"], "books/source-book/001-leçon/languages/en-us/index.html")
        self.assertEqual(translated["url"], "/authorsourcebook/001-le%C3%A7on/language/en-us/")
        for code in ("../en", "en/secret", "", "en' onclick='bad"):
            with self.subTest(code=code), self.assertRaises(ValueError):
                edition_record({"language_code": code}, "source-book", "authorsourcebook")


def route_fixture(web: Path):
    (web / "index.html").write_text("Public home")
    book = {
        "slug": "source-book", "route_slug": "authorsourcebook", "work_id": "WORK",
        "url": "/authorsourcebook", "path": "books/source-book/index.html",
        "text_path": "books/source-book/text.html", "has_text": True, "language": "fr",
    }
    chapter = {
        "slug": "001-first", "book_slug": "source-book", "route_slug": "authorsourcebook", "work_id": "WORK",
        "url": "/authorsourcebook/001-first/", "path": "books/source-book/001-first/index.html",
        "text_path": "books/source-book/001-first/text.html", "has_text": True, "source_id": "RAW_A",
    }
    original = {"kind": "original", "language_code": "fr", "language_name": "Français"}
    translation = {"kind": "translation", "language_code": "en", "language_name": "English",
                   "rendition_type": "machine", "review_status": "machine"}
    book["editions"] = [edition_record(row, book["slug"], book["route_slug"]) for row in (original, translation)]
    chapter["editions"] = [edition_record(row, book["slug"], book["route_slug"], chapter["slug"])
                           for row in (original, translation)]
    for item in (book, chapter):
        files = [(item["path"], "Metadata only"), (item["text_path"], "Original French source.")]
        files += [(row["path"], "Saved English source translation.") for row in item["editions"] if row["kind"] == "translation"]
        for relative, text in files:
            path = web / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
    manifest = {"schema": "care-book-search-pages/1", "source_sha256": "a" * 64, "books": [book], "chapters": [chapter]}
    (web / "books/manifest.json").write_text(json.dumps(manifest))
    (web / "data").mkdir()
    (web / "data/export-audit.json").write_text(json.dumps({"sha256": "a" * 64}))
    return manifest


class SourceLanguageRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        folder = Path(temporary.name).resolve()
        self.web = folder / "web"
        self.web.mkdir()
        self.manifest = route_fixture(self.web)
        self.app = create_app(env={"CARE_PUBLIC_ORIGIN": "https://care.example.test", "CARE_WEB_ROOT": str(self.web),
                                  "CARE_DATABASE_PATH": str(folder / "private/accounts.sqlite3")})
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="https://care.example.test")
        self.addAsyncCleanup(self.client.aclose)

    def save_manifest(self, value):
        (self.web / "books/manifest.json").write_text(json.dumps(value))

    async def test_language_pages_and_physical_aliases_follow_the_existing_public_gate(self):
        for item in (self.manifest["books"][0], self.manifest["chapters"][0]):
            edition = item["editions"][1]
            self.assertEqual((await self.client.get(edition["url"])).status_code, 404)
            self.assertEqual((await self.client.get("/" + edition["path"])).status_code, 404)
        self.app.state.site_settings.update(False, 0)
        for item in (self.manifest["books"][0], self.manifest["chapters"][0]):
            edition = item["editions"][1]
            response = await self.client.get(edition["url"])
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.text, "Saved English source translation.")
            self.assertIn(f'<{edition["url"]}>; rel="canonical"', response.headers["link"])
            alias = await self.client.get("/" + edition["path"])
            self.assertEqual(alias.status_code, 308)
            self.assertEqual(alias.headers["location"], edition["url"])
            self.assertEqual((await self.client.get(edition["url"].rstrip("/"))).headers["location"], edition["url"])
        self.assertEqual((await self.client.get("/authorsourcebook")).text, "Original French source.")
        self.app.state.site_settings.update(True, 1)
        self.assertEqual((await self.client.get("/authorsourcebook/language/en/")).status_code, 404)

    async def test_invalid_language_declarations_and_stale_publication_fail_closed(self):
        self.app.state.site_settings.update(False, 0)
        changes = (("path", "data/private.html"), ("url", "/other/language/en/"),
                   ("language_code", "../en"), ("kind", "generated"), ("kind", {"invalid": True}))
        for key, value in changes:
            manifest = deepcopy(self.manifest)
            manifest["books"][0]["editions"][1][key] = value
            self.save_manifest(manifest)
            with self.subTest(field=key):
                self.assertEqual((await self.client.get("/authorsourcebook/language/en/")).status_code, 404)
                self.assertEqual((await self.client.get("/authorsourcebook/001-first/language/en/")).status_code, 404)
        manifest = deepcopy(self.manifest)
        manifest["source_sha256"] = "b" * 64
        self.save_manifest(manifest)
        self.assertEqual((await self.client.get("/authorsourcebook/language/en/")).status_code, 404)

    async def test_chapter_only_and_unregistered_languages_never_gain_file_access(self):
        self.app.state.site_settings.update(False, 0)
        manifest = deepcopy(self.manifest)
        manifest["books"][0]["editions"] = manifest["books"][0]["editions"][:1]
        self.save_manifest(manifest)
        self.assertEqual((await self.client.get("/authorsourcebook/001-first/language/en/")).status_code, 404)
        private = self.web / "books/source-book/languages/de/index.html"
        private.parent.mkdir(parents=True)
        private.write_text("Undeclared text")
        self.assertEqual((await self.client.get("/authorsourcebook/language/de/")).status_code, 404)
        self.assertEqual((await self.client.get("/books/source-book/languages/de/index.html")).status_code, 404)

    async def test_symlinks_and_duplicate_language_entries_are_rejected(self):
        self.app.state.site_settings.update(False, 0)
        edition = self.manifest["books"][0]["editions"][1]
        path = self.web / edition["path"]
        path.unlink()
        outside = self.web.parent / "private-source.html"
        outside.write_text("Never publish")
        path.symlink_to(outside)
        self.assertEqual((await self.client.get(edition["url"])).status_code, 404)
        manifest = deepcopy(self.manifest)
        manifest["books"][0]["editions"].append(deepcopy(edition))
        self.save_manifest(manifest)
        self.assertEqual((await self.client.get(edition["url"])).status_code, 404)


if __name__ == "__main__":
    unittest.main()
