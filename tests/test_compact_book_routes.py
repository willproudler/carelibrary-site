"""Compact URLs preserve the existing reader and the live beta text boundary."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import httpx

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
sys.path.insert(0,str(ROOT/"tools"))
from test_book_seo import _book,_publish,seo
from server.app import create_app
from server import search_pages


class CompactBookRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temporary=tempfile.TemporaryDirectory();self.addCleanup(self.temporary.cleanup)
        folder=Path(self.temporary.name).resolve();self.web=folder/"web";self.web.mkdir()
        (self.web/"index.html").write_text("Public home")
        _publish(self.web,[_book("PLATO","Timaeus","Plato","existing-plato")])
        seo.build(self.web)
        self.manifest=json.loads((self.web/"books/manifest.json").read_text())
        self.book=self.manifest["books"][0];self.chapter=self.manifest["chapters"][0]
        self.app=create_app(env={"CARE_PUBLIC_ORIGIN":"https://care.example.test","CARE_WEB_ROOT":str(self.web),
            "CARE_DATABASE_PATH":str(folder/"private/accounts.sqlite3")})
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url="https://care.example.test")
        self.addAsyncCleanup(self.client.aclose)

    async def test_root_book_and_old_aliases_use_one_canonical_native_reader(self):
        response=await self.client.get("/platotimaeus")
        self.assertEqual(response.status_code,200,response.text)
        self.assertIn('href="https://carelibrary.org/platotimaeus"',response.text)
        self.assertIn('"book":"existing-plato"',response.text)
        self.assertIn('id="existing-native-reader"',response.text)
        for alias in self.book["aliases"]:
            redirected=await self.client.get(alias)
            self.assertEqual(redirected.status_code,308,alias)
            self.assertEqual(redirected.headers["location"],"/platotimaeus")
        self.assertEqual((await self.client.get("/notapublishedbook")).status_code,404)

    async def test_chapter_aliases_preserve_source_and_never_bypass_beta(self):
        canonical=self.chapter["url"]
        metadata=await self.client.get(canonical)
        self.assertEqual(metadata.status_code,200)
        self.assertIn('"source":"RAW_PLATO"',metadata.text)
        self.assertNotIn("Exact original source needle",metadata.text)
        for alias in self.chapter["aliases"]:
            response=await self.client.get(alias)
            self.assertEqual(response.status_code,308,alias)
            self.assertEqual(response.headers["location"],canonical)
        text="/"+self.chapter["text_path"]
        self.assertEqual((await self.client.get(text)).status_code,404)
        self.app.state.site_settings.update(False,0)
        self.assertIn("Exact original source needle",(await self.client.get(canonical)).text)
        self.assertEqual((await self.client.get(text)).headers["location"],canonical)
        self.assertNotIn("Exact original source needle",(await self.client.get("/platotimaeus")).text)
        self.app.state.site_settings.update(True,1)
        self.assertNotIn("Exact original source needle",(await self.client.get(canonical)).text)
        self.assertEqual((await self.client.get(text)).status_code,404)
        self.assertEqual((await self.client.get("/books/"+self.book["slug"]+"/text.html")).status_code,404)

    async def test_tiny_public_mapping_has_no_chapter_or_source_prose(self):
        response=await self.client.get("/book-routes.json")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()["schema"],"care-book-routes/1")
        self.assertEqual(response.json()["books"][0]["url"],"/platotimaeus")
        self.assertNotIn("chapters",response.json())
        self.assertNotIn("Exact original source needle",response.text)
        self.assertEqual((await self.client.get("/books/manifest.json")).status_code,404)

    async def test_unrelated_assets_skip_book_manifest_and_alias_index_is_reused(self):
        with patch.object(search_pages,"_book_routes",side_effect=AssertionError("Touched book routes for an asset")):
            for path in ("/native/reader.mjs","/assets/cover.png","/data/catalogue.json","/search/file.json","/api/session","/site-settings.html"):
                self.assertIsNone(search_pages.search_page(self.web,path,full_text=False))
        search_pages._book_index.cache_clear()
        with patch.object(search_pages,"_manifest",wraps=search_pages._manifest) as read:
            for _ in range(10):
                self.assertIsNotNone(search_pages.search_page(self.web,"/platotimaeus",full_text=False))
                self.assertIsNotNone(search_pages.search_page(self.web,self.chapter["url"],full_text=True))
            self.assertEqual(read.call_count,1)
        self.manifest["books"][0]["aliases"].append("/api/session")
        (self.web/"books/manifest.json").write_text(json.dumps(self.manifest))
        self.assertIsNone(search_pages.search_page(self.web,"/platotimaeus",full_text=False))


if __name__ == "__main__":
    unittest.main()
