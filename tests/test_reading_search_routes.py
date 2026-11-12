"""Saved CARE reading prose follows the live reader boundary on exact routes."""
from __future__ import annotations

import copy
import gzip
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tools"))
from test_book_seo import _book, _publish, seo
from server.app import create_app
from server import search_pages


class ReadingSearchRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        folder = Path(temporary.name).resolve()
        self.web = folder / "web"
        self.web.mkdir()
        (self.web / "index.html").write_text("Public home")
        _publish(self.web, [_book("PLATO", "Timaeus", "Plato", "existing-plato")])
        seo.build(self.web)
        (self.web / "books/readings.css").write_text("/* generated reading presentation */")
        books = json.loads((self.web / "books/manifest.json").read_text())
        book = books["books"][0]
        base = {"work_id": book["work_id"], "reader_slug": book["reader_slug"],
                "route_slug": book["route_slug"], "book_slug": book["slug"], "has_text": False}
        self.canonical = "/platotimaeus/readings/"
        resource = f'books/{book["slug"]}/readings/'
        unit = "WB_PLATO"
        slug = "whole-book-" + hashlib.sha256(unit.encode()).hexdigest()[:12]
        self.unit_url = self.canonical + f"wb/{slug}/"
        unit_path = resource + f"wb/{slug}/"
        overview = {**base, "kind": "overview", "url": self.canonical, "path": resource + "index.html",
                    "index_url": self.canonical + "index.json", "index_path": resource + "index.json"}
        layer = {**base, "kind": "layer", "layer": "WB", "layer_slug": "wb",
                 "url": self.canonical + "wb/", "path": resource + "wb/index.html"}
        self.reading = {**base, "kind": "reading", "layer": "WB", "layer_slug": "wb", "unit_id": unit,
                        "unit_slug": slug, "url": self.unit_url, "path": unit_path + "index.html",
                        "text_path": unit_path + "text.html", "has_text": True,
                        "markdown_path": unit_path + "reading.md", "markdown_url": self.unit_url + "reading.md",
                        "json_path": unit_path + "reading.json", "json_url": self.unit_url + "reading.json"}
        self.manifest = {"schema": "care-reading-search-pages/1", "source_sha256": books["source_sha256"],
                         "pages": [overview, layer, self.reading]}
        self.manifest_path = self.web / "books/readings-manifest.json"
        self.write_manifest(self.manifest)
        for entry in self.manifest["pages"]:
            path = self.web / entry["path"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('<!doctype html><main><h1>CARE reading</h1><p>Published metadata only.</p></main>')
        (self.web / overview["index_path"]).write_text(json.dumps({"book": "Timaeus", "readings": [{"unit_id": unit, "url": self.unit_url}]}))
        self.prose = "Saved CARE interpretation with its exact citation. " * 1200
        self.html = '<!doctype html><main><h1>CARE analysis</h1><p id="axiom-STABLE">' + self.prose + '</p></main>'
        self.markdown = "# CARE analysis\n\n" + self.prose + "\n"
        self.packet = {"unit_id": unit, "canonical": self.unit_url, "text": self.prose}
        for name, text in ((self.reading["text_path"], self.html), (self.reading["markdown_path"], self.markdown),
                           (self.reading["json_path"], json.dumps(self.packet))):
            path = self.web / name
            path.write_text(text)
            Path(str(path) + ".gz").write_bytes(gzip.compress(text.encode()))
        self.app = create_app(env={"CARE_PUBLIC_ORIGIN": "https://care.example.test", "CARE_WEB_ROOT": str(self.web),
                                  "CARE_DATABASE_PATH": str(folder / "private/accounts.sqlite3")})
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="https://care.example.test")
        self.addAsyncCleanup(self.client.aclose)

    def write_manifest(self, value):
        self.manifest_path.write_text(json.dumps(value))

    async def test_beta_serves_only_metadata_without_authentication_or_bot_special_cases(self):
        with patch.object(self.app.state.auth, "session", side_effect=AssertionError("Metadata requires no login")):
            for route in (self.canonical, self.canonical + "wb/", self.unit_url):
                browser = await self.client.get(route)
                bot = await self.client.get(route, headers={"User-Agent": "Googlebot"})
                self.assertEqual(browser.status_code, 200, browser.text)
                self.assertEqual(browser.text, bot.text)
                self.assertIn("Published metadata only", browser.text)
                self.assertNotIn(self.prose, browser.text)
                self.assertEqual(browser.headers["cache-control"], "no-store")
            for route in ("/" + self.reading["text_path"], self.reading["markdown_url"], "/" + self.reading["markdown_path"],
                          self.reading["json_url"], "/" + self.reading["json_path"]):
                self.assertEqual((await self.client.get(route)).status_code, 404, route)
        self.assertEqual((await self.client.get("/data/library.json")).status_code, 401)
        self.assertEqual((await self.client.get("/books/readings.css")).status_code, 200)

    async def test_only_registered_per_book_metadata_index_is_public_in_both_modes(self):
        overview = self.manifest["pages"][0]
        for beta, revision in ((True, None), (False, 0)):
            if revision is not None:
                self.app.state.site_settings.update(beta, revision)
            response = await self.client.get(overview["index_url"])
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["readings"][0]["unit_id"], self.reading["unit_id"])
            self.assertNotIn(self.prose, response.text)
            self.assertIn(f'<{self.canonical}>; rel="canonical"', response.headers["link"])
            raw = await self.client.get("/" + overview["index_path"])
            self.assertEqual(raw.status_code, 308)
            self.assertEqual(raw.headers["location"], overview["index_url"])
        for changes in ({"index_path": "data/library.json"}, {"index_url": "/api/session"}):
            manifest = copy.deepcopy(self.manifest)
            manifest["pages"][0].update(changes)
            self.write_manifest(manifest)
            self.assertEqual((await self.client.get(overview["index_url"])).status_code, 404)

    async def test_public_raw_html_and_markdown_contain_all_saved_prose_without_javascript(self):
        self.app.state.site_settings.update(False, 0)
        response = await self.client.get(self.unit_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, self.html)
        self.assertIn(self.prose, response.text)
        self.assertIn('id="axiom-STABLE"', response.text)
        self.assertNotIn("<script", response.text)
        self.assertIn(f'<{self.reading["markdown_url"]}>; rel="alternate"; type="text/markdown"', response.headers["link"])
        markdown = await self.client.get(self.reading["markdown_url"])
        self.assertEqual(markdown.text, self.markdown)
        self.assertTrue(markdown.headers["content-type"].startswith("text/markdown"))
        self.assertIn(f'<{self.unit_url}>; rel="canonical"', markdown.headers["link"])
        machine = await self.client.get(self.reading["json_url"])
        self.assertEqual(machine.json(), self.packet)
        self.assertTrue(machine.headers["content-type"].startswith("application/json"))
        self.assertIn(f'<{self.unit_url}>; rel="canonical"', machine.headers["link"])
        self.assertIn(f'<{self.reading["json_url"]}>; rel="alternate"; type="application/json"', response.headers["link"])
        bot = await self.client.get(self.unit_url, headers={"User-Agent": "Google-Extended"})
        self.assertEqual(bot.text, response.text)
        head = await self.client.head(self.reading["markdown_url"], headers={"Accept-Encoding": "identity"})
        self.assertEqual(head.status_code, 200)
        self.assertEqual(head.content, b"")
        self.assertEqual(int(head.headers["content-length"]), len(self.markdown.encode()))

    async def test_mode_toggles_apply_immediately_to_clean_raw_and_gzipped_readings(self):
        self.app.state.site_settings.update(False, 0)
        raw_text = "/" + self.reading["text_path"]
        raw_markdown = "/" + self.reading["markdown_path"]
        raw_json = "/" + self.reading["json_path"]
        self.assertEqual((await self.client.get(raw_text)).headers["location"], self.unit_url)
        self.assertEqual((await self.client.get(raw_markdown)).headers["location"], self.reading["markdown_url"])
        self.assertEqual((await self.client.get(raw_json)).headers["location"], self.reading["json_url"])
        public = await self.client.get(self.unit_url, headers={"Accept-Encoding": "gzip"})
        self.assertEqual(public.headers["content-encoding"], "gzip")
        self.assertIn(self.prose, public.text)
        self.app.state.site_settings.update(True, 1)
        for route in (raw_text, raw_markdown, self.reading["markdown_url"], raw_text + ".gz", raw_markdown + ".gz",
                      raw_json, self.reading["json_url"], raw_json + ".gz"):
            response = await self.client.get(route)
            self.assertEqual(response.status_code, 404, route)
            self.assertNotIn(self.prose, response.text)
            self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertNotIn(self.prose, (await self.client.get(self.unit_url)).text)

    async def test_authenticated_beta_reader_does_not_make_the_public_summary_prose_available(self):
        self.app.state.auth.add_user("reader@example.test", "Reader", "a sufficiently long test password")
        login = await self.client.post("/api/login", json={"email": "reader@example.test", "password": "a sufficiently long test password"},
                                       headers={"Origin": "https://care.example.test"})
        self.assertEqual(login.status_code, 200, login.text)
        self.assertIn("Published metadata only", (await self.client.get(self.unit_url)).text)
        self.assertEqual((await self.client.get(self.reading["markdown_url"])).status_code, 404)
        self.assertEqual((await self.client.get(self.reading["json_url"])).status_code, 404)

    async def test_aliases_are_canonical_and_undeclared_files_never_become_public(self):
        for route in (self.unit_url.rstrip("/"), self.unit_url + "index.html", "/" + self.reading["path"]):
            response = await self.client.get(route)
            self.assertEqual(response.status_code, 308, route)
            self.assertEqual(response.headers["location"], self.unit_url)
        self.app.state.site_settings.update(False, 0)
        private = self.web / self.reading["path"]
        for name in ("private.md", "private.txt", "unit.json"):
            private.with_name(name).write_text("Unpublished material")
        for route in ("/books/readings-manifest.json", self.unit_url + "private.md", self.unit_url + "private.txt",
                      self.unit_url + "reading.txt", self.unit_url + "unit.json", "/" + str(private.relative_to(self.web).with_name("private.md")),
                      "/platotimaeus/readings/wb/not-a-unit/", "/platotimaeus/readings/wb/%2e%2e/text.html",
                      "/platotimaeus/readings/wb/%252e%252e/text.html"):
            self.assertEqual((await self.client.get(route)).status_code, 404, route)

    async def test_corrupt_manifest_identities_paths_and_unit_hashes_fail_closed(self):
        variants = [{"work_id": "ANOTHER_WORK"}, {"reader_slug": "another-reader"}, {"route_slug": "anotherbook"},
                    {"book_slug": "another-book"}, {"unit_id": "ANOTHER_UNIT"}, {"layer": "CH"}, {"layer_slug": "ch"},
                    {"path": "library.html"}, {"text_path": "../private.html"}, {"text_path": []},
                    {"markdown_path": "data/library.json"}, {"markdown_url": "https://other.example/reading.md"},
                    {"json_path": "data/library.json"}, {"json_url": "/api/session"},
                    {"kind": []}, {"has_text": "true"}]
        self.app.state.site_settings.update(False, 0)
        for changes in variants:
            manifest = copy.deepcopy(self.manifest)
            manifest["pages"][2].update(changes)
            self.write_manifest(manifest)
            response = await self.client.get(self.unit_url)
            self.assertEqual(response.status_code, 404, str(changes) + ": " + response.text)
            self.assertNotIn(self.prose, response.text)

    async def test_reading_file_symlinks_cannot_escape_the_web_root(self):
        self.app.state.site_settings.update(False, 0)
        path = self.web / self.reading["text_path"]
        path.unlink()
        target = self.web.parent / "private-prose.html"
        target.write_text("Private unpublished prose")
        path.symlink_to(target)
        response = await self.client.get(self.unit_url)
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("Private unpublished prose", response.text)

    def test_exact_index_is_cached_and_asset_requests_do_not_touch_it(self):
        with patch.object(search_pages, "_reading_routes", side_effect=AssertionError("Asset touched reading manifest")):
            for route in ("/native/reading-views.mjs", "/assets/cover.png", "/data/library.json", "/api/session", "/site-settings.html"):
                self.assertIsNone(search_pages.search_page(self.web, route, full_text=True))
        search_pages._reading_index.cache_clear()
        for _ in range(20):
            self.assertIsNotNone(search_pages.search_page(self.web, self.unit_url, full_text=True))
        self.assertEqual(search_pages._reading_index.cache_info().misses, 1)
        self.assertEqual(search_pages._reading_index.cache_info().hits, 19)

    def test_reading_registry_has_a_larger_bounded_limit_and_follows_book_revisions(self):
        # Exact physical HTML/Markdown/JSON paths put the real unit registry over
        # the smaller book-manifest limit. It must remain readable and bounded.
        manifest = copy.deepcopy(self.manifest)
        manifest["fixture_padding"] = "x" * search_pages.MAX_MANIFEST_BYTES
        self.write_manifest(manifest)
        self.assertGreater(self.manifest_path.stat().st_size, search_pages.MAX_MANIFEST_BYTES)
        self.assertIsNotNone(search_pages.search_page(self.web, self.unit_url, full_text=True))
        with patch.object(Path, "read_text", side_effect=AssertionError("Oversized manifest was read")):
            self.assertEqual(search_pages._manifest(str(self.manifest_path), ("oversized", search_pages.MAX_READING_MANIFEST_BYTES + 1),
                                                   search_pages.MAX_READING_MANIFEST_BYTES), {})
            self.assertEqual(search_pages._manifest(str(self.web / "books/manifest.json"),
                                                   ("oversized-book", search_pages.MAX_MANIFEST_BYTES + 1)), {})
        book_path = self.web / "books/manifest.json"
        original = book_path.read_text()
        books = json.loads(original)
        books["books"][0]["reader_slug"] = "changed-reader"
        book_path.write_text(json.dumps(books))
        self.assertIsNone(search_pages.search_page(self.web, self.unit_url, full_text=True))
        book_path.write_text(original)
        self.assertIsNotNone(search_pages.search_page(self.web, self.unit_url, full_text=True))
        books = json.loads(original)
        books["source_sha256"] = "f" * 64
        book_path.write_text(json.dumps(books))
        self.assertIsNone(search_pages.search_page(self.web, self.unit_url, full_text=True),
                          "Stable book IDs cannot authorize unit pages from a previous export")
        book_path.write_text(original)
        self.assertIsNotNone(search_pages.search_page(self.web, self.unit_url, full_text=True))


if __name__ == "__main__":
    unittest.main()
