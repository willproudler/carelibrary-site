"""Public asset caching never bypasses the live Library or owner boundary."""
from __future__ import annotations

import gzip
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server.app import create_app
from server.static_cache import PUBLIC_ASSET, REVALIDATE_READING


class StaticCacheTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        folder = Path(temporary.name).resolve()
        self.web = folder / "web"
        self.web.mkdir()
        for name, text in {
            "index.html": "Public introduction",
            "auth.css": "body { color: navy; }",
            "login.html": "Sign in",
            "library.html": "Reading workspace",
            "public-app.mjs": "// Existing mode-gated reader module",
            "data/library.json": '{"saved":"published text"}',
            "site-settings.mjs": "// Owner controls",
        }.items():
            path = self.web / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
            Path(str(path) + ".gz").write_bytes(gzip.compress(text.encode()))
        self.app = create_app(env={"CARE_PUBLIC_ORIGIN": "https://care.example.test",
                                   "CARE_WEB_ROOT": str(self.web),
                                   "CARE_SITE_ADMIN_EMAILS": "owner@example.test",
                                   "CARE_DATABASE_PATH": str(folder / "private/accounts.sqlite3")})
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="https://care.example.test")
        self.addAsyncCleanup(self.client.aclose)

    async def test_exact_public_asset_bypasses_database_and_revalidates_for_get_and_head(self):
        with patch.object(self.app.state.site_settings, "get", side_effect=AssertionError("Static asset needs no database")):
            response = await self.client.get("/auth.css?v=asset-version", headers={"Accept-Encoding": "identity"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["cache-control"], PUBLIC_ASSET)
            self.assertEqual(response.headers["cdn-cache-control"], PUBLIC_ASSET)
            self.assertEqual(response.headers["vary"], "Accept-Encoding")
            self.assertNotIn("set-cookie", response.headers)
            for method in ("GET", "HEAD"):
                cached = await self.client.request(method, "/auth.css?v=asset-version", headers={
                    "Accept-Encoding": "identity", "If-None-Match": '"other", W/' + response.headers["etag"]})
                self.assertEqual(cached.status_code, 304)
                self.assertEqual(cached.content, b"")
                self.assertEqual(cached.headers["etag"], response.headers["etag"])
                self.assertEqual(cached.headers["cache-control"], PUBLIC_ASSET)
            dated = await self.client.get("/auth.css", headers={"Accept-Encoding": "identity",
                "If-Modified-Since": response.headers["last-modified"]})
            self.assertEqual(dated.status_code, 304)
            changed = await self.client.get("/auth.css", headers={"Accept-Encoding": "identity",
                "If-None-Match": '"not-current"', "If-Modified-Since": response.headers["last-modified"]})
            self.assertEqual(changed.status_code, 200)

    async def test_gzip_and_identity_have_distinct_validators(self):
        raw = await self.client.get("/auth.css", headers={"Accept-Encoding": "identity"})
        compressed = await self.client.get("/auth.css", headers={"Accept-Encoding": "gzip"})
        self.assertNotEqual(raw.headers["etag"], compressed.headers["etag"])
        self.assertEqual(compressed.headers["content-encoding"], "gzip")
        response = await self.client.get("/auth.css", headers={"Accept-Encoding": "gzip", "If-None-Match": raw.headers["etag"]})
        self.assertEqual(response.status_code, 200)

    async def test_cached_library_and_reader_module_still_require_live_permission(self):
        self.app.state.site_settings.update(False, 0)
        responses = {}
        for name in ("/data/library.json", "/public-app.mjs", "/library.html"):
            response = await self.client.get(name)
            self.assertEqual(response.headers["cache-control"], REVALIDATE_READING)
            self.assertEqual(response.headers["cdn-cache-control"], "no-store")
            self.assertEqual(response.headers["vary"], "Cookie, Accept-Encoding")
            responses[name] = response
            cached = await self.client.get(name, headers={"If-None-Match": response.headers["etag"]})
            self.assertEqual(cached.status_code, 304)
        self.app.state.site_settings.update(True, 1)
        for name, previous in responses.items():
            response = await self.client.get(name, headers={"If-None-Match": previous.headers["etag"]})
            self.assertIn(response.status_code, {303, 401})
            self.assertEqual(response.headers["cache-control"], "no-store")
            self.assertEqual(response.headers["cdn-cache-control"], "no-store")

    async def test_control_api_owner_errors_and_similar_paths_never_enter_shared_cache(self):
        for name in ("/login.html", "/api/session", "/healthz", "/site-settings.mjs", "/SITE-SETTINGS.mjs",
                     "/not-public/auth.css", "/auth.css/more", "/data/missing.json", "/missing.css"):
            response = await self.client.get(name, headers={"If-None-Match": "*"})
            self.assertNotEqual(response.status_code, 304, name)
            self.assertEqual(response.headers["cache-control"], "no-store", name)
            self.assertEqual(response.headers["cdn-cache-control"], "no-store", name)

    async def test_owner_and_session_cookies_remain_uncacheable_in_public_mode(self):
        self.app.state.auth.add_user("owner@example.test", "Owner", "A sufficiently long owner test password")
        response = await self.client.post("/api/login", json={"email": "owner@example.test",
            "password": "A sufficiently long owner test password"}, headers={"Origin": "https://care.example.test"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("set-cookie", response.headers)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["cdn-cache-control"], "no-store")
        self.app.state.site_settings.update(False, 0)
        for path in ("/site-settings.mjs", "/api/session", "/api/site-settings", "/api/studio/drafts"):
            response = await self.client.get(path, headers={"If-None-Match": "*"})
            self.assertEqual(response.status_code, 200, path)
            self.assertEqual(response.headers["cache-control"], "no-store", path)
            self.assertEqual(response.headers["cdn-cache-control"], "no-store", path)
