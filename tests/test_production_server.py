"""Production boundary tests using HTTPS ASGI requests and disposable accounts.

No network sockets are opened. SMTP is prohibited unless a test replaces the
delivery method with a fake, so these tests cannot send email.
"""
from __future__ import annotations

import asyncio
import errno
import gzip
import hashlib
import json
import os
from pathlib import Path
import runpy
import smtplib
import sqlite3
import stat
import sys
import tempfile
import time
import unittest
from unittest.mock import Mock, patch

import httpx


RELEASE_ROOT = Path(__file__).resolve().parents[1]
if str(RELEASE_ROOT) not in sys.path:
    sys.path.insert(0, str(RELEASE_ROOT))

from server.app import create_app


ORIGIN = "https://care.example.test"
EMAIL = "reader@example.test"
OWNER_EMAIL = "owner@example.test"
PASSWORD = "An explicit production test password!"
COOKIE_NAME = "__Host-care_session"
SMTP_ENV = {
    "CARE_BETA_SMTP_HOST": "smtp.example.test",
    "CARE_BETA_SMTP_PORT": "465",
    "CARE_BETA_SMTP_TLS": "ssl",
    "CARE_BETA_SMTP_FROM": "sender@example.test",
    "CARE_BETA_SMTP_USERNAME": "test-sender",
    "CARE_BETA_SMTP_PASSWORD": "fake-test-credential",
}


class ProductionServerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.web = self.root / "web"
        self.web.mkdir()
        self.database = self.root / "private" / "accounts.sqlite3"
        self.env = {
            "CARE_PUBLIC_ORIGIN": ORIGIN,
            "CARE_WEB_ROOT": str(self.web),
            "CARE_DATABASE_PATH": str(self.database),
        }
        self.files = {
            "index.html": "Public Discover",
            "about.html": "Discover compatibility",
            "welcome.html": "Welcome compatibility",
            "login.html": "Login",
            "request-access.html": "Request access",
            "auth.mjs": "public authentication interface",
            "landing.mjs": "public landing interface",
            "login.mjs": "public login interface",
            "request-access.mjs": "public access request interface",
            "site-settings.html": "Private owner settings",
            "site-settings.mjs": "private owner settings module",
            "auth.css": "public login styles",
            "assets/care-header-mark.svg": "<svg>public branding</svg>",
            "assets/favicon-32.png": "public icon",
            "library.html": "Protected Library",
            "public-app.mjs": "protected reader module",
            "boot.mjs": "protected reader boot",
            "data/library.json": '{"private":"library catalogue"}',
            "data/library-parts/part.jsonpart": '{"private":"large catalogue part"}',
            "data/chunks/work-123.json": '{"private":"reading chunk"}',
            "data/chunks/work-123.json.gz": "private precompressed reading",
            "native/study-desk.mjs": "protected renderer",
            "native/study-desk.css": "protected renderer styles",
            "native/reference-viewer.html": "protected reference view",
            "native/reading-views.mjs": "protected generated readings",
            "assets/covers/book.jpg": "protected cover",
            "assets/covers/web/cover-123.webp": "protected cover variant",
            "README.md": "private deployment notes",
            ".env": "private configuration",
            "credentials.json": "private credentials",
            "accounts.sqlite3": "private database",
        }
        for name, contents in self.files.items():
            target = self.web / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(contents)
        for relative in ("data/chunks/work-123.json", "site-settings.mjs"):
            source = self.web / relative
            Path(str(source) + ".gz").write_bytes(gzip.compress(source.read_bytes()))
        for provider in ("smtplib.SMTP", "smtplib.SMTP_SSL"):
            mocked = patch(provider, side_effect=AssertionError("Tests must never open SMTP connections"))
            mocked.start()
            self.addCleanup(mocked.stop)
        self.app = create_app(env=self.env)
        self.clients = []
        self.client = self.new_client()

    async def asyncTearDown(self):
        for client in self.clients:
            await client.aclose()

    def new_client(self, app=None, ip="203.0.113.10", base_url=ORIGIN, raise_app_exceptions=True):
        client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app or self.app, client=(ip, 12345),
                                         raise_app_exceptions=raise_app_exceptions),
            base_url=base_url,
            follow_redirects=False,
        )
        self.clients.append(client)
        return client

    async def add_user(self, email=EMAIL, name="Reader", password=PASSWORD, app=None):
        return await asyncio.to_thread((app or self.app).state.auth.add_user, email, name, password)

    async def post(self, path, payload, *, client=None, headers=None):
        return await (client or self.client).post(
            path, content=json.dumps(payload, ensure_ascii=True).encode("utf-8"),
            headers={"Origin": ORIGIN, "Content-Type": "application/json", **(headers or {})})

    async def login(self, email=EMAIL, password=PASSWORD, *, client=None, headers=None):
        return await self.post("/api/login", {"email": email, "password": password},
                               client=client, headers=headers)

    async def authenticated(self, *, client=None):
        await self.add_user()
        response = await self.login(client=client)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"authenticated": True,
                         "user": {"email": EMAIL, "name": "Reader"}})
        return response

    def assert_no_store(self, response):
        self.assertIn("no-store", response.headers.get("cache-control", ""))

    def assert_anonymous_session(self, response, beta_enabled=True):
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"authenticated": False,
                         "beta_enabled": beta_enabled, "can_manage_site": False})

    async def owner_context(self):
        application = create_app(env={**self.env, "CARE_SITE_ADMIN_EMAILS": OWNER_EMAIL})
        await self.add_user(email=OWNER_EMAIL, name="Owner", app=application)
        owner = self.new_client(app=application, ip="203.0.113.60")
        response = await self.login(email=OWNER_EMAIL, client=owner)
        self.assertEqual(response.status_code, 200, response.text)
        return application, owner

    def persisted_account_state(self):
        with sqlite3.connect(self.database) as db:
            return {
                table: db.execute("SELECT * FROM " + table + " ORDER BY 1").fetchall()
                for table in ("users", "sessions", "access_requests")
            }

    def inherited_setgid(self, directory):
        # Some macOS filesystems strip SGID when chmod is applied. Present the
        # Linux volume metadata to the guard while using real private files.
        original_fstat = os.fstat
        identity = directory.stat()

        def fstat(descriptor):
            info = original_fstat(descriptor)
            if (info.st_dev, info.st_ino) == (identity.st_dev, identity.st_ino):
                fields = list(info)
                fields[0] |= stat.S_ISGID
                return os.stat_result(fields)
            return info

        return patch("server.auth.os.fstat", fstat)

    async def test_public_discover_and_login_are_available_but_readings_require_session(self):
        for path in ("/", "/index.html", "/about.html", "/welcome.html", "/login.html",
                     "/request-access.html", "/auth.mjs", "/landing.mjs", "/login.mjs",
                     "/request-access.mjs", "/auth.css", "/assets/care-header-mark.svg",
                     "/assets/favicon-32.png"):
            with self.subTest(path=path):
                response = await self.client.get(path)
                self.assertEqual(response.status_code, 200, response.text)
                self.assert_no_store(response)
        library = await self.client.get("/library.html?mode=read")
        self.assertEqual(library.status_code, 303)
        target = httpx.URL(library.headers["location"])
        self.assertEqual(target.path, "/login.html")
        self.assertEqual(target.params.get("next"), "/library.html?mode=read")
        for path in ("/data/library.json", "/data/library-parts/part.jsonpart",
                     "/data/chunks/work-123.json", "/native/study-desk.mjs",
                     "/native/study-desk.css", "/native/reference-viewer.html",
                     "/native/reading-views.mjs", "/assets/covers/book.jpg",
                     "/assets/covers/web/cover-123.webp", "/public-app.mjs", "/boot.mjs"):
            with self.subTest(path=path):
                for method in ("GET", "HEAD"):
                    response = await self.client.request(method, path)
                    self.assertEqual(response.status_code, 401, path)
                    self.assert_no_store(response)
        compressed = await self.client.get("/data/chunks/work-123.json.gz")
        self.assertIn(compressed.status_code, (401, 404))
        self.assertNotIn("private precompressed reading", compressed.text)

    async def test_secure_server_session_unlocks_assets_and_logout_revokes_old_token(self):
        response = await self.authenticated()
        header = response.headers["set-cookie"]
        self.assertTrue(header.startswith(COOKIE_NAME + "="))
        for attribute in ("secure", "httponly", "samesite=strict", "path=/", "max-age=28800"):
            self.assertIn(attribute, header.lower())
        self.assertNotIn("domain=", header.lower())
        token = response.cookies[COOKIE_NAME]
        cookie = COOKIE_NAME + "=" + token
        with sqlite3.connect(self.database) as db:
            token_hash, expires_at = db.execute("SELECT token_hash, expires_at FROM sessions").fetchone()
            self.assertEqual(token_hash, hashlib.sha256(token.encode("ascii")).hexdigest())
            self.assertNotEqual(token_hash, token)
            self.assertAlmostEqual(expires_at - time.time(), 8 * 3600, delta=10)
        for path in ("/library.html", "/data/library.json", "/data/library-parts/part.jsonpart",
                     "/native/reading-views.mjs", "/assets/covers/book.jpg",
                     "/assets/covers/web/cover-123.webp", "/public-app.mjs"):
            response = await self.client.get(path)
            self.assertEqual(response.status_code, 200, path)
            self.assert_no_store(response)
        self.assertTrue((await self.client.get("/api/session")).json()["authenticated"])
        logout = await self.post("/api/logout", {})
        self.assertEqual(logout.status_code, 200)
        self.assertEqual(logout.json(), {"authenticated": False})
        self.assertIn("max-age=0", logout.headers["set-cookie"].lower())
        self.assertEqual((await self.client.get("/data/library.json", headers={"Cookie": cookie})).status_code, 401)

    async def test_only_workspace_companions_can_be_framed_by_the_same_origin(self):
        query = "?view=library&care_studio_embed=1&care_studio_pane_reading=1&care_studio_request=companion-token"
        split = ("?care_studio_embed=1&care_studio_split_document=1&care_studio_request=companion-token"
                 "&care_studio_split_draft=draft-123")
        guest = await self.client.get("/library.html" + query)
        self.assertEqual(guest.status_code, 303)
        self.assertEqual(guest.headers["x-frame-options"], "DENY")
        await self.authenticated()
        for options in (query, split):
            companion = await self.client.get("/library.html" + options)
            self.assertEqual(companion.status_code, 200)
            self.assertEqual(companion.headers["x-frame-options"], "SAMEORIGIN")
            self.assertIn("frame-ancestors 'self'", companion.headers["content-security-policy"])
        for path in ("/library.html", "/library.html" + query + "&care_studio_embed=1",
                     "/library.html" + query.replace("companion-token", "x"),
                     "/library.html" + split.replace("draft-123", "invalid%2Fdraft"),
                     "/library.html" + split + "&care_studio_pane_reading=1",
                     "/login.html" + query, "/api/studio/drafts" + split):
            response = await self.client.get(path)
            self.assertEqual(response.headers["x-frame-options"], "DENY", path)
            self.assertIn("frame-ancestors 'none'", response.headers["content-security-policy"], path)

    async def test_open_library_allows_guest_companion_and_keeps_account_routes_private(self):
        query = "?view=library&care_studio_embed=1&care_studio_pane_reading=1&care_studio_request=guest-companion"
        await asyncio.to_thread(self.app.state.site_settings.update, False, 0)
        for method in ("GET", "HEAD"):
            companion = await self.client.request(method, "/library.html" + query)
            self.assertEqual(companion.status_code, 200)
            self.assertEqual(companion.headers["x-frame-options"], "SAMEORIGIN")
            self.assertIn("frame-ancestors 'self'", companion.headers["content-security-policy"])
            self.assert_no_store(companion)
        for path, status in (("/library.html" + query + "&care_studio_request=duplicate", 200),
                             ("/login.html" + query, 200), ("/site-settings.html" + query, 303),
                             ("/api/studio/drafts" + query, 401), ("/api/studio/binder" + query, 401)):
            response = await self.client.get(path)
            self.assertEqual(response.status_code, status, path)
            self.assertEqual(response.headers["x-frame-options"], "DENY", path)
            self.assertIn("frame-ancestors 'none'", response.headers["content-security-policy"], path)
        for path, payload in (("/api/studio/drafts", {"account": EMAIL, "title": "Draft", "body": "Local prose"}),
                              ("/api/studio/binder", {"account": EMAIL, "operation": "create-folder", "folder_name": "Guest"})):
            denied = await self.post(path + query, payload)
            self.assertEqual((denied.status_code, denied.json()), (401, {"error": "login_required"}))
        await asyncio.to_thread(self.app.state.site_settings.update, True, 1)
        closed = await self.client.get("/library.html" + query)
        self.assertEqual(closed.status_code, 303)
        self.assertEqual(httpx.URL(closed.headers["location"]).path, "/login.html")
        self.assertEqual(closed.headers["x-frame-options"], "DENY")

    async def test_only_the_live_public_catalogue_is_crawlable_for_get_head_and_gzip(self):
        from server.app import PUBLIC_FILES
        self.assertNotIn("library.html", PUBLIC_FILES)
        page = self.web / "library.html"
        Path(str(page) + ".gz").write_bytes(gzip.compress(page.read_bytes()))
        for method in ("GET", "HEAD"):
            private = await self.client.request(method, "/library.html")
            self.assertEqual(private.status_code, 303)
            self.assertEqual(httpx.URL(private.headers["location"]).path, "/login.html")
        await asyncio.to_thread(self.app.state.site_settings.update, False, 0)
        with patch.object(self.app.state.auth, "session", side_effect=AssertionError("Public catalogue requested a session")):
            for method in ("GET", "HEAD"):
                for encoding in ("identity", "gzip"):
                    public = await self.client.request(method, "/library.html", headers={"Accept-Encoding": encoding})
                    self.assertEqual(public.status_code, 200)
                    self.assertNotIn("x-robots-tag", public.headers)
                    self.assertIn('</llms.txt>; rel="describedby"', public.headers["link"])
                    self.assertIn('</library.html>; rel="canonical"', public.headers["link"])
                    self.assert_no_store(public)
                    if encoding == "gzip":
                        self.assertEqual(public.headers["content-encoding"], "gzip")
                    if method == "GET":
                        self.assertEqual(public.text, self.files["library.html"])
                    else:
                        self.assertEqual(public.content, b"")
        # Crawl permission belongs only to the catalogue. It cannot expose the
        # owner settings, account APIs, or make private renderer pages indexable.
        for path, expected in (("/site-settings.html", 303), ("/api/site-settings", 401),
                               ("/api/studio/drafts", 401), ("/api/studio/binder", 401)):
            self.assertEqual((await self.client.get(path)).status_code, expected, path)
        renderer = await self.client.get("/native/reference-viewer.html")
        self.assertEqual(renderer.headers["x-robots-tag"], "noindex")
        query = "?care_studio_embed=1&care_studio_pane_reading=1&care_studio_request=companion-token"
        for suffix in (query, query + "&care_studio_request=duplicate"):
            companion = await self.client.get("/library.html" + suffix)
            self.assertEqual(companion.status_code, 200)
            self.assertEqual(companion.headers["x-robots-tag"], "noindex")
            self.assertIn('</library.html>; rel="canonical"', companion.headers["link"])
            self.assertNotIn('rel="describedby"', companion.headers["link"])
        await asyncio.to_thread(self.app.state.site_settings.update, True, 1)
        for method in ("GET", "HEAD"):
            for encoding in ("identity", "gzip"):
                denied = await self.client.request(method, "/library.html", headers={"Accept-Encoding": encoding})
                self.assertEqual(denied.status_code, 303)
                self.assertNotIn(self.files["library.html"], denied.text)
        logged_in = self.new_client()
        await self.authenticated(client=logged_in)
        for method in ("GET", "HEAD"):
            private = await logged_in.request(method, "/library.html", headers={"Accept-Encoding": "gzip"})
            self.assertEqual(private.status_code, 200)
            self.assertEqual(private.headers["x-robots-tag"], "noindex")
            self.assertNotIn('rel="describedby"', private.headers["link"])
        await asyncio.to_thread(self.app.state.site_settings.update, False, 2)
        reopened = await self.client.get("/library.html", headers={"Accept-Encoding": "gzip"})
        self.assertEqual(reopened.status_code, 200)
        self.assertNotIn("x-robots-tag", reopened.headers)
        self.assertIn('rel="describedby"', reopened.headers["link"])

    async def test_password_hashes_record_production_parameters_and_database_is_private(self):
        await self.add_user()
        with sqlite3.connect(self.database) as db:
            hashed, salt, n, r, p = db.execute(
                "SELECT password_hash, salt, n, r, p FROM users WHERE email = ?", (EMAIL,)).fetchone()
        self.assertNotEqual(hashed, PASSWORD.encode())
        self.assertGreaterEqual(len(salt), 16)
        self.assertGreaterEqual(n, 32768)
        self.assertEqual(r, 8)
        self.assertGreaterEqual(p, 3)
        self.assertEqual(self.database.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.database.parent.stat().st_mode & 0o777, 0o700)

    async def test_private_database_directory_accepts_inherited_setgid_without_group_access(self):
        private = self.root / "setgid-private"
        private.mkdir(mode=0o700)
        private.chmod(0o2700)
        database = private / "accounts.sqlite3"
        with self.inherited_setgid(private), patch("server.auth.os.fchmod", wraps=os.fchmod) as chmod:
            application = await asyncio.to_thread(
                create_app, env={**self.env, "CARE_DATABASE_PATH": str(database)})
            chmod.assert_not_called()
        self.assertEqual(stat.S_IMODE(private.stat().st_mode) & 0o777, 0o700)
        self.assertEqual(stat.S_IMODE(database.stat().st_mode), 0o600)
        self.assertFalse(application.state.auth.has_enabled_users())
        response = await self.new_client(app=application).get("/api/session")
        self.assert_anonymous_session(response)

    async def test_private_directory_repairs_only_service_owned_access_permissions(self):
        private = self.root / "setgid-insecure"
        private.mkdir(mode=0o700)
        private.chmod(0o2770)
        database = private / "accounts.sqlite3"
        with self.inherited_setgid(private):
            create_app(env={**self.env, "CARE_DATABASE_PATH": str(database)})
        self.assertEqual(stat.S_IMODE(private.stat().st_mode) & 0o777, 0o700)
        self.assertEqual(stat.S_IMODE(database.stat().st_mode), 0o600)
        private.chmod(0o2770)
        foreign_database = private / "foreign.sqlite3"
        actual_uid = os.getuid()
        with self.inherited_setgid(private), patch("server.auth.os.getuid", return_value=actual_uid + 1), \
             patch("server.auth.os.fchmod", wraps=os.fchmod) as chmod:
            with self.assertRaisesRegex(ValueError, f"owner_uid={actual_uid}, process_uid={actual_uid + 1}"):
                create_app(env={**self.env, "CARE_DATABASE_PATH": str(foreign_database)})
            chmod.assert_not_called()
        self.assertEqual(stat.S_IMODE(private.stat().st_mode) & 0o777, 0o770)
        self.assertFalse(foreign_database.exists())

    async def test_login_rotates_session_and_session_expiry_does_not_write_during_lookup(self):
        first = await self.authenticated()
        old_cookie = COOKIE_NAME + "=" + first.cookies[COOKIE_NAME]
        second = await self.login()
        self.assertEqual(second.status_code, 200)
        self.assertNotEqual(second.cookies[COOKIE_NAME], first.cookies[COOKIE_NAME])
        self.assertEqual((await self.client.get("/data/library.json", headers={"Cookie": old_cookie})).status_code, 401)
        with sqlite3.connect(self.database) as db:
            db.execute("UPDATE sessions SET expires_at = ?", (time.time() - 1,))
            count = db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        self.assert_anonymous_session(await self.client.get("/api/session"))
        self.assertEqual((await self.client.get("/data/library.json")).status_code, 401)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0], count)

    async def test_reset_and_disable_revoke_existing_sessions_and_old_passwords(self):
        await self.authenticated()
        updated = "A different explicit test password!"
        await asyncio.to_thread(self.app.state.auth.reset_password, EMAIL, updated)
        self.assert_anonymous_session(await self.client.get("/api/session"))
        self.assertEqual((await self.login()).status_code, 401)
        self.assertEqual((await self.login(password=updated)).status_code, 200)
        await asyncio.to_thread(self.app.state.auth.disable_user, EMAIL)
        self.assertEqual((await self.client.get("/data/library.json")).status_code, 401)
        disabled = await self.login(password=updated)
        unknown = await self.login(email="missing@example.test", password=updated)
        self.assertEqual(disabled.status_code, 401)
        self.assertEqual(disabled.json(), unknown.json())

    async def test_login_failures_are_generic_and_account_throttle_survives_restart_and_ip_change(self):
        await self.add_user()
        missing = await self.login(email="missing@example.test", password="wrong password")
        known = await self.login(password="wrong password")
        self.assertEqual(missing.status_code, 401)
        self.assertEqual(known.status_code, 401)
        self.assertEqual(missing.json(), known.json())
        last = known
        for _ in range(12):
            last = await self.login(password="wrong password")
            if last.status_code == 429:
                break
        self.assertEqual(last.status_code, 429)
        self.assertGreater(int(last.headers["retry-after"]), 0)
        reloaded = create_app(env=self.env)
        elsewhere = self.new_client(app=reloaded, ip="203.0.113.20")
        self.assertEqual((await self.login(client=elsewhere)).status_code, 429)
        await self.add_user(email="another@example.test", app=reloaded)
        allowed = await self.login(email="another@example.test", client=elsewhere)
        self.assertEqual(allowed.status_code, 200, allowed.text)

    async def test_ip_throttle_cannot_be_bypassed_with_untrusted_forwarded_headers(self):
        await self.add_user()
        blocked = None
        for index in range(80):
            response = await self.login(email="unknown{}@example.test".format(index), password="wrong",
                headers={"X-Forwarded-For": "198.51.100.{}".format(index + 1)})
            if response.status_code == 429:
                blocked = response
                break
            self.assertEqual(response.status_code, 401)
        self.assertIsNotNone(blocked, "A single peer must be throttled across different account names")
        self.assertEqual((await self.login()).status_code, 429)
        elsewhere = self.new_client(ip="203.0.113.42")
        self.assertEqual((await self.login(client=elsewhere)).status_code, 200)

    async def test_origin_host_and_https_checks_apply_before_authentication(self):
        await self.add_user()
        payload = {"email": EMAIL, "password": PASSWORD}
        for origin in ("https://evil.example.test", "null", "http://care.example.test", "https://care.example.test.evil.test"):
            with self.subTest(origin=origin):
                response = await self.post("/api/login", payload, headers={"Origin": origin})
                self.assertEqual(response.status_code, 403)
                self.assertNotIn("set-cookie", response.headers)
        missing = await self.client.post("/api/login", json=payload)
        self.assertEqual(missing.status_code, 403)
        cross_site = await self.post("/api/login", payload, headers={"Sec-Fetch-Site": "cross-site"})
        self.assertEqual(cross_site.status_code, 403)
        host = await self.client.get("/", headers={"Host": "evil.example.test"})
        self.assertIn(host.status_code, (400, 403, 421))
        insecure = self.new_client(base_url="http://care.example.test")
        downgrade = await self.post("/api/login", payload, client=insecure,
                                    headers={"X-Forwarded-Proto": "https"})
        self.assertNotEqual(downgrade.status_code, 200)
        self.assertNotIn("set-cookie", downgrade.headers)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0], 0)

    async def test_only_explicit_additional_https_origins_are_accepted(self):
        alternative = "https://care-beta.onrender.com"
        app = create_app(env={**self.env, "CARE_ADDITIONAL_ORIGINS": alternative})
        await self.add_user(app=app)
        client = self.new_client(app=app, base_url=alternative)
        response = await self.post("/api/login", {"email": EMAIL, "password": PASSWORD},
                                   client=client, headers={"Origin": alternative})
        self.assertEqual(response.status_code, 200, response.text)
        mismatch = await self.post("/api/login", {"email": EMAIL, "password": PASSWORD},
                                   client=client, headers={"Origin": ORIGIN})
        self.assertEqual(mismatch.status_code, 403)
        unlisted = self.new_client(app=app, base_url="https://another.onrender.com")
        self.assertIn((await unlisted.get("/")).status_code, (400, 403, 421))

    async def test_explicit_proxy_trust_sets_https_and_uses_rightmost_untrusted_client(self):
        app = create_app(env={**self.env, "CARE_TRUSTED_PROXY_CIDRS": "10.20.0.0/16"})
        authentication = Mock(return_value=(None, None, 0))
        app.state.auth.login = authentication
        proxy_client = self.new_client(app=app, ip="10.20.0.5", base_url="http://care.example.test")
        response = await self.login(client=proxy_client, headers={
            "X-Forwarded-Proto": "https",
            "X-Forwarded-For": "198.51.100.99, 203.0.113.20, 10.20.0.4",
        })
        self.assertEqual(response.status_code, 401, response.text)
        authentication.assert_called_once()
        self.assertEqual(authentication.call_args.args[2], "203.0.113.20")
        malformed = await self.login(client=proxy_client, headers={
            "X-Forwarded-Proto": "https", "X-Forwarded-For": "not-an-address"})
        self.assertEqual(malformed.status_code, 400)
        stranger = self.new_client(app=app, ip="203.0.113.50", base_url="http://care.example.test")
        forged = await self.login(client=stranger, headers={
            "X-Forwarded-Proto": "https", "X-Forwarded-For": "203.0.113.20"})
        self.assertEqual(forged.status_code, 400)
        authentication.assert_called_once()
        for cidr in ("*", "0.0.0.0/0", "::/0"):
            with self.subTest(cidr=cidr), self.assertRaises(ValueError):
                create_app(env={**self.env, "CARE_TRUSTED_PROXY_CIDRS": cidr})

    async def test_malformed_oversized_and_wrong_content_type_requests_do_not_create_sessions(self):
        await self.add_user()
        ordinary = {"Origin": ORIGIN, "Content-Type": "application/json"}
        for content in (b"{", b"[]", b"null", b'"text"', b'\xff'):
            response = await self.client.post("/api/login", content=content, headers=ordinary)
            self.assertEqual(response.status_code, 400, repr(content))
        oversized = await self.client.post("/api/login", content=b" " * 4097, headers=ordinary)
        self.assertEqual(oversized.status_code, 413)
        async def chunks():
            yield b" " * 2048
            yield b" " * 2049
        streamed = await self.client.post("/api/login", content=chunks(), headers=ordinary)
        self.assertEqual(streamed.status_code, 413)
        ambiguous_origin = await self.client.post("/api/login", content=b"{}", headers=[
            ("Content-Type", "application/json"), ("Origin", ORIGIN),
            ("Origin", "https://evil.example.test")])
        self.assertEqual(ambiguous_origin.status_code, 403)
        wrong_type = await self.client.post("/api/login", content=b"{}",
                                           headers={"Origin": ORIGIN, "Content-Type": "text/plain"})
        self.assertEqual(wrong_type.status_code, 415)
        for payload in ({}, {"email": [], "password": "x"}, {"email": EMAIL, "password": None},
                        {"email": EMAIL, "password": "\ud800"},
                        {"email": EMAIL, "password": "x" * 1025},
                        {"email": EMAIL, "password": PASSWORD, "admin": True}):
            self.assertEqual((await self.post("/api/login", payload)).status_code, 400)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0], 0)

    async def test_logout_cannot_be_triggered_by_get_or_cross_origin_post(self):
        await self.authenticated()
        self.assertIn((await self.client.get("/api/logout")).status_code, (404, 405))
        denied = await self.post("/api/logout", {}, headers={"Origin": "https://evil.example.test"})
        self.assertEqual(denied.status_code, 403)
        self.assertEqual((await self.post("/api/logout", {"extra": True})).status_code, 400)
        self.assertTrue((await self.client.get("/api/session")).json()["authenticated"])

    async def test_authenticated_requests_never_expose_sources_config_traversal_or_symlinks(self):
        await self.authenticated()
        for relative in ("server/app.py", "tools/configure.py", "tests/test.py", ".git/config"):
            target = self.web / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("must stay private")
        outside = self.root / "outside.json"
        outside.write_text("outside secret")
        (self.web / "data" / "linked.json").symlink_to(outside)
        (self.web / "data" / "linked-directory").symlink_to(self.root, target_is_directory=True)
        (self.web / "assets" / "care-mark.svg").symlink_to(outside)
        for path in ("/.git/config", "/server/app.py", "/tools/configure.py", "/tests/test.py",
                     "/README.md", "/.env", "/credentials.json", "/accounts.sqlite3",
                     "/data/%2e%2e/auth.mjs", "/%2e%2e/outside.json", "/data/%00.json",
                     "/data/%5c../outside.json", "/data/linked.json",
                     "/data/linked-directory/outside.json", "/assets/care-mark.svg",
                     "/data/", "/native/", "/assets/"):
            with self.subTest(path=path):
                response = await self.client.get(path)
                self.assertEqual(response.status_code, 404, response.text)
                self.assert_no_store(response)

    async def test_readiness_requires_account_and_email_and_health_reveals_no_private_details(self):
        health = await self.client.get("/healthz")
        ready = await self.client.get("/readyz")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(ready.status_code, 503)
        await self.add_user()
        self.assertEqual((await self.client.get("/readyz")).status_code, 503)
        configured = create_app(env={**self.env, **SMTP_ENV})
        client = self.new_client(app=configured)
        ready = await client.get("/readyz")
        self.assertEqual(ready.status_code, 200, ready.text)
        for response in (health, ready):
            self.assert_no_store(response)
            self.assertNotIn(EMAIL, response.text)
            self.assertNotIn(str(self.database), response.text)
            self.assertNotIn("fake-test-credential", response.text)
        await asyncio.to_thread(configured.state.auth.disable_user, EMAIL)
        self.assertEqual((await client.get("/readyz")).status_code, 503)

    async def test_access_request_delivery_uses_fake_mail_and_never_grants_accounts(self):
        app = create_app(env={**self.env, **SMTP_ENV})
        client = self.new_client(app=app)
        sender = Mock(return_value={})
        app.state.access_requests._send = sender
        self.assertEqual((await client.get("/api/access-requests/config")).json(), {"email_delivery_ready": True})
        response = await self.post("/api/access-requests", {
            "name": "Applicant", "email": "applicant@example.test", "website": ""}, client=client)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["delivered"])
        sender.assert_called_once()
        self.assertEqual(sender.call_args.args[3], ["willproudler@gmail.com"])
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM users").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT delivery_status FROM access_requests").fetchone()[0], "delivered")
        self.assertEqual((await client.get("/data/library.json")).status_code, 401)

    async def test_access_email_only_addresses_will_and_keeps_applicant_as_reply_to(self):
        app = create_app(env={**self.env, **SMTP_ENV})
        client = self.new_client(app=app)
        smtp = Mock()
        smtp.send_message.return_value = {}
        with patch("server.access_requests.smtplib.SMTP_SSL", return_value=smtp) as connection:
            response = await self.post("/api/access-requests", {
                "name": "Applicant", "email": "applicant@example.test", "website": ""}, client=client)
            self.assertEqual(response.status_code, 200, response.text)
            connection.assert_called_once()
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args.args[0]
        self.assertEqual(smtp.send_message.call_args.kwargs["to_addrs"], ["willproudler@gmail.com"])
        self.assertEqual(str(message["To"]), "willproudler@gmail.com")
        self.assertEqual(str(message["Reply-To"]), "applicant@example.test")
        self.assertIsNone(message["Cc"])
        self.assertIsNone(message["Bcc"])
        self.assertNotIn("ianwenzelgaray@gmail.com", message.as_string())
        with self.assertRaises(ValueError):
            app.state.access_requests._send("Applicant", "applicant@example.test", "test", ["ianwenzelgaray@gmail.com"])
        smtp.send_message.assert_called_once()

    async def test_access_request_validation_origin_and_throttle_apply_without_login(self):
        app = create_app(env={**self.env, **SMTP_ENV})
        app.state.access_requests._send = Mock(return_value={})
        client = self.new_client(app=app)
        payload = {"name": "Applicant", "email": "applicant@example.test", "website": ""}
        denied = await self.post("/api/access-requests", payload, client=client,
                                 headers={"Origin": "https://evil.example.test"})
        self.assertEqual(denied.status_code, 403)
        self.assertEqual((await self.post("/api/access-requests", {**payload, "email": "invalid"}, client=client)).status_code, 400)
        self.assertEqual((await self.post("/api/access-requests", {**payload, "website": "bot"}, client=client)).status_code, 400)
        blocked = None
        for index in range(12):
            response = await self.post("/api/access-requests", {**payload, "email": "applicant{}@example.test".format(index)}, client=client)
            if response.status_code == 429:
                blocked = response
                break
            self.assertEqual(response.status_code, 200, response.text)
        self.assertIsNotNone(blocked)

    async def test_failed_email_delivery_remains_saved_and_does_not_report_success(self):
        app = create_app(env={**self.env, **SMTP_ENV})
        app.state.access_requests._send = Mock(side_effect=smtplib.SMTPException("provider-secret"))
        client = self.new_client(app=app)
        response = await self.post("/api/access-requests", {
            "name": "Applicant", "email": "applicant@example.test", "website": ""}, client=client)
        self.assertEqual(response.status_code, 503)
        self.assertTrue(response.json()["saved"])
        self.assertFalse(response.json()["delivered"])
        self.assertNotIn("provider-secret", response.text)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT delivery_status FROM access_requests").fetchone()[0], "failed")
            self.assertEqual(db.execute("SELECT COUNT(*) FROM users").fetchone()[0], 0)

    async def test_missing_email_configuration_never_claims_delivery(self):
        config = await self.client.get("/api/access-requests/config")
        self.assertEqual(config.json(), {"email_delivery_ready": False})
        response = await self.post("/api/access-requests", {
            "name": "Applicant", "email": "applicant@example.test", "website": ""})
        self.assertIn(response.status_code, (202, 503))
        self.assertFalse(response.json().get("delivered", False))

    async def test_required_production_configuration_and_unsafe_paths_fail_closed(self):
        for key in ("CARE_PUBLIC_ORIGIN", "CARE_WEB_ROOT", "CARE_DATABASE_PATH"):
            env = {k: v for k, v in self.env.items() if k != key}
            with self.subTest(missing=key), self.assertRaises((ValueError, RuntimeError)):
                create_app(env=env)
        for origin in ("http://care.example.test", "https://user:password@care.example.test",
                       "https://*.example.test", "https://localhost", "https://127.0.0.1",
                       "https://care.example.test/path", "https://care.example.test?query=1",
                       "https://care.example.test#fragment", "https://care.example.test:444"):
            with self.subTest(origin=origin), self.assertRaises((ValueError, RuntimeError)):
                create_app(env={**self.env, "CARE_PUBLIC_ORIGIN": origin})
        with self.assertRaises((ValueError, RuntimeError)):
            create_app(env={**self.env, "CARE_ADDITIONAL_ORIGINS": "https://*.onrender.com"})
        with self.assertRaises((ValueError, RuntimeError)):
            create_app(env={**self.env, "CARE_DATABASE_PATH": str(self.web / "database.sqlite3")})
        with self.assertRaises((ValueError, RuntimeError)):
            create_app(env={**self.env, "CARE_WEB_ROOT": "."})
        (self.web / ".git").mkdir()
        with self.assertRaises((ValueError, RuntimeError)):
            create_app(env=self.env)

    async def test_private_paths_refuse_symlinks_and_local_account_database(self):
        web_link = self.root / "linked-web"
        web_link.symlink_to(self.web, target_is_directory=True)
        with self.assertRaises(ValueError):
            create_app(env={**self.env, "CARE_WEB_ROOT": str(web_link)})
        db_link = self.root / "linked-database.sqlite3"
        db_link.symlink_to(self.database)
        with self.assertRaises(ValueError):
            create_app(env={**self.env, "CARE_DATABASE_PATH": str(db_link)})
        legacy_parent = self.root / "legacy"
        legacy_parent.mkdir(mode=0o700)
        legacy = legacy_parent / "accounts.sqlite3"
        with sqlite3.connect(legacy) as db:
            db.execute("CREATE TABLE users(email TEXT PRIMARY KEY, name TEXT, password_hash BLOB)")
            db.execute("INSERT INTO users VALUES (?, ?, ?)", ("local@example.test", "Local", b"preview-hash"))
        legacy.chmod(0o600)
        with self.assertRaises(ValueError):
            create_app(env={**self.env, "CARE_DATABASE_PATH": str(legacy)})
        with sqlite3.connect(legacy) as db:
            self.assertEqual(db.execute("SELECT email FROM users").fetchone()[0], "local@example.test")
            self.assertEqual(db.execute("SELECT COUNT(*) FROM sqlite_master WHERE name='care_metadata'").fetchone()[0], 0)

    async def test_site_owner_is_explicit_and_settings_stay_private_in_both_modes(self):
        await self.authenticated()
        regular_session = (await self.client.get("/api/session")).json()
        self.assertTrue(regular_session["authenticated"])
        self.assertTrue(regular_session["beta_enabled"])
        self.assertFalse(regular_session["can_manage_site"])
        self.assertEqual((await self.client.get("/api/site-settings")).status_code, 403)
        app, owner = await self.owner_context()
        outsider = self.new_client(app=app)
        regular = self.new_client(app=app)
        self.assertEqual((await self.login(client=regular)).status_code, 200)
        for beta_enabled in (True, False):
            configuration = (await owner.get("/api/site-settings")).json()
            self.assertEqual(configuration["beta_enabled"], beta_enabled)
            self.assertEqual((await owner.get("/api/session")).json(), {
                "authenticated": True, "user": {"email": OWNER_EMAIL, "name": "Owner"},
                "beta_enabled": beta_enabled, "can_manage_site": True})
            self.assert_anonymous_session(await outsider.get("/api/session"), beta_enabled)
            self.assertEqual((await outsider.get("/api/site-settings")).status_code, 401)
            self.assertEqual((await self.post("/api/site-settings", {
                "beta_enabled": not beta_enabled, "revision": configuration["revision"]}, client=regular)).status_code, 403)
            html = await outsider.get("/site-settings.html?section=access")
            self.assertEqual(html.status_code, 303)
            self.assertEqual(httpx.URL(html.headers["location"]).params["next"],
                             "/site-settings.html?section=access")
            for method in ("GET", "HEAD"):
                for path in ("/site-settings.html", "/site-settings.mjs"):
                    self.assertEqual((await regular.request(method, path)).status_code, 403)
                    self.assertEqual((await owner.request(method, path)).status_code, 200)
                self.assertEqual((await outsider.request(method, "/site-settings.mjs",
                    headers={"Accept-Encoding": "gzip"})).status_code, 401)
            for path in ("/site-settings.html/", "/site-settings.mjs/", "/site-settings.mjs//",
                         "/site-settings.mjs%2f", "/SITE-SETTINGS.MJS", "/SITE-SETTINGS.HTML",
                         "/site-settings.mjs.gz"):
                self.assertEqual((await outsider.get(path)).status_code, 404, path)
            if beta_enabled:
                result = await self.post("/api/site-settings", {
                    "beta_enabled": False, "revision": configuration["revision"]}, client=owner)
                self.assertEqual(result.status_code, 200, result.text)
        await asyncio.to_thread(app.state.auth.disable_user, OWNER_EMAIL)
        self.assertEqual((await owner.get("/api/site-settings")).status_code, 401)
        self.assert_anonymous_session(await owner.get("/api/session"), False)

    async def test_beta_switch_off_and_on_preserves_private_records_and_survives_restart(self):
        app, owner = await self.owner_context()
        await self.add_user(app=app)
        ordinary = self.new_client(app=app)
        self.assertEqual((await self.login(client=ordinary)).status_code, 200)
        request = await self.post("/api/access-requests", {
            "name": "Saved applicant", "email": "saved@example.test", "website": ""}, client=owner)
        self.assertEqual(request.status_code, 503)
        self.assertTrue(request.json()["saved"])
        original = self.persisted_account_state()
        initial = await owner.get("/api/site-settings")
        self.assertEqual(initial.json(), {"beta_enabled": True, "revision": 0})
        changed = await self.post("/api/site-settings", {"beta_enabled": False, "revision": 0}, client=owner)
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(changed.json(), {"beta_enabled": False, "revision": 1})
        # This client belongs to the app created before the switch: requests
        # must read current durable settings rather than a startup snapshot.
        self.assert_anonymous_session(await self.client.get("/api/session"), False)
        for path in ("/library.html", "/data/library.json", "/data/library-parts/part.jsonpart",
                     "/native/reading-views.mjs", "/public-app.mjs", "/boot.mjs",
                     "/assets/covers/book.jpg", "/assets/covers/web/cover-123.webp"):
            response = await self.client.get(path)
            self.assertEqual(response.status_code, 200, path)
            self.assert_no_store(response)
        compressed = await self.client.get("/data/chunks/work-123.json", headers={"Accept-Encoding": "gzip"})
        self.assertEqual(compressed.status_code, 200)
        self.assertEqual(compressed.headers["content-encoding"], "gzip")
        self.assertEqual(compressed.json(), {"private": "reading chunk"})
        for path in ("/?view=books&query=one%20two", "/index.html?mode=read"):
            response = await self.client.get(path)
            self.assertEqual(response.status_code, 303)
            self.assertEqual(response.headers["location"], "/library.html?" + path.partition("?")[2])
        for path in ("/.env", "/README.md", "/credentials.json", "/accounts.sqlite3",
                     "/unknown.mjs", "/data/missing.json", "/server/app.py", "/tools/config.py",
                     "/tests/test.py", "/.git/config", "/data/%2e%2e/auth.mjs"):
            self.assertEqual((await self.client.get(path)).status_code, 404, path)
        self.assertEqual(self.persisted_account_state(), original)
        reloaded = create_app(env={**self.env, "CARE_SITE_ADMIN_EMAILS": OWNER_EMAIL})
        restart_owner = self.new_client(app=reloaded)
        restart_owner.cookies.update(owner.cookies)
        self.assertEqual((await restart_owner.get("/api/site-settings")).json(),
                         {"beta_enabled": False, "revision": 1})
        self.assertEqual(self.persisted_account_state(), original)
        restored = await self.post("/api/site-settings", {"beta_enabled": True, "revision": 1},
                                   client=restart_owner)
        self.assertEqual(restored.status_code, 200, restored.text)
        self.assertEqual(restored.json(), {"beta_enabled": True, "revision": 2})
        self.assertEqual((await self.client.get("/")).status_code, 200)
        self.assertEqual((await self.client.get("/library.html")).status_code, 303)
        self.assertEqual((await self.client.get("/data/library.json")).status_code, 401)
        self.assertEqual((await ordinary.get("/data/library.json")).status_code, 200)
        self.assertEqual(self.persisted_account_state(), original)

    async def test_site_settings_enforce_origin_types_duplicate_fields_and_stale_revisions(self):
        app, owner = await self.owner_context()
        baseline = {"beta_enabled": True, "revision": 0}
        desired = {"beta_enabled": False, "revision": 0}
        self.assertEqual((await self.post("/api/site-settings", desired, client=owner,
            headers={"Origin": "https://evil.example.test"})).status_code, 403)
        self.assertEqual((await owner.post("/api/site-settings", json=desired)).status_code, 403)
        self.assertEqual((await self.post("/api/site-settings", desired, client=owner,
            headers={"Content-Type": "text/plain"})).status_code, 415)
        for payload in ({}, {"beta_enabled": False}, {"revision": 0},
                        {"beta_enabled": "false", "revision": 0},
                        {"beta_enabled": 0, "revision": 0},
                        {"beta_enabled": False, "revision": True},
                        {"beta_enabled": False, "revision": -1},
                        {"beta_enabled": False, "revision": 2**63 - 1},
                        {"beta_enabled": False, "revision": 0.0},
                        {"beta_enabled": False, "revision": 0, "owner": True}):
            self.assertEqual((await self.post("/api/site-settings", payload, client=owner)).status_code, 400, repr(payload))
        duplicate = await owner.post("/api/site-settings", content=
            b'{"beta_enabled":true,"beta_enabled":false,"revision":0}',
            headers={"Origin": ORIGIN, "Content-Type": "application/json"})
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual((await owner.get("/api/site-settings")).json(), baseline)
        self.assertEqual((await self.post("/api/site-settings", desired, client=owner)).status_code, 200)
        stale = await self.post("/api/site-settings", {"beta_enabled": True, "revision": 0}, client=owner)
        self.assertEqual(stale.status_code, 409)
        self.assertEqual((await owner.get("/api/site-settings")).json(), {"beta_enabled": False, "revision": 1})

    async def test_concurrent_site_settings_updates_accept_only_one_matching_revision(self):
        _, owner = await self.owner_context()
        responses = await asyncio.gather(
            self.post("/api/site-settings", {"beta_enabled": False, "revision": 0}, client=owner),
            self.post("/api/site-settings", {"beta_enabled": True, "revision": 0}, client=owner),
        )
        self.assertEqual(sorted(response.status_code for response in responses), [200, 409])
        winning = next(response.json() for response in responses if response.status_code == 200)
        self.assertEqual(winning["revision"], 1)
        self.assertEqual((await owner.get("/api/site-settings")).json(), winning)

    async def test_site_settings_read_write_and_corruption_fail_closed(self):
        app, owner = await self.owner_context()
        owner_errors = self.new_client(app=app, raise_app_exceptions=False)
        owner_errors.cookies.update(owner.cookies)
        anonymous = self.new_client(app=app, raise_app_exceptions=False)
        self.assertEqual((await self.post("/api/site-settings", {
            "beta_enabled": False, "revision": 0}, client=owner)).status_code, 200)
        with patch.object(app.state.site_settings, "get", side_effect=sqlite3.DatabaseError("private-database-detail")):
            for client, path in ((anonymous, "/"), (anonymous, "/library.html"),
                                 (anonymous, "/data/library.json"), (anonymous, "/native/reading-views.mjs"),
                                 (anonymous, "/api/session"), (owner_errors, "/api/site-settings"),
                                 (owner_errors, "/site-settings.html"), (anonymous, "/readyz")):
                response = await client.get(path)
                self.assertEqual(response.status_code, 503, path)
                self.assertNotIn("private-database-detail", response.text)
                self.assert_no_store(response)
        with patch.object(app.state.site_settings, "update", side_effect=sqlite3.DatabaseError("private-write-detail")):
            failed = await self.post("/api/site-settings", {"beta_enabled": True, "revision": 1}, client=owner_errors)
            self.assertEqual(failed.status_code, 503)
            self.assertNotIn("private-write-detail", failed.text)
        self.assertEqual((await owner.get("/api/site-settings")).json(), {"beta_enabled": False, "revision": 1})
        for mutate in ("UPDATE site_settings SET beta_enabled=2 WHERE singleton=1",
                       "DELETE FROM site_settings WHERE singleton=1"):
            with sqlite3.connect(self.database) as db:
                db.execute("PRAGMA ignore_check_constraints=ON")
                db.execute(mutate)
            self.assertEqual((await anonymous.get("/data/library.json")).status_code, 503)
            self.assertEqual((await owner_errors.get("/api/site-settings")).status_code, 503)
            self.assertEqual((await self.post("/api/site-settings", {
                "beta_enabled": True, "revision": 1}, client=owner_errors)).status_code, 503)

    async def test_discover_alias_remains_public_in_both_modes_without_changing_the_homepage(self):
        _, owner = await self.owner_context()
        self.assertFalse((self.web / "discover.html").exists())
        discover = await self.client.get("/discover.html?view=topics")
        self.assertEqual(discover.status_code, 200)
        self.assertEqual(discover.text, self.files["index.html"])
        self.assert_no_store(discover)
        self.assertEqual((await self.client.get("/")).text, discover.text)
        changed = await self.post("/api/site-settings", {
            "beta_enabled": False, "revision": 0}, client=owner)
        self.assertEqual(changed.status_code, 200)
        for path in ("/", "/index.html"):
            response = await self.client.get(path + "?view=topics")
            self.assertEqual(response.status_code, 303)
            self.assertEqual(response.headers["location"], "/library.html?view=topics")
        (self.web / "index.html.gz").write_bytes(gzip.compress(self.files["index.html"].encode()))
        for encoding in ("identity", "gzip"):
            response = await self.client.get("/discover.html", headers={"Accept-Encoding": encoding})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.text, discover.text)
            self.assert_no_store(response)
            if encoding == "gzip":
                self.assertEqual(response.headers["content-encoding"], "gzip")
        self.assertEqual((await self.client.get("/discover.html/")).status_code, 404)
        self.assertEqual((await self.client.get("/discover.html.gz")).status_code, 404)

    async def test_site_admin_allowlist_rejects_wildcards_malformed_and_empty_entries(self):
        for value in ("*", "*@example.test", "owner@*.test", "not-an-email", "owner@example.test,",
                      ",owner@example.test", "owner@example.test,,other@example.test",
                      "Owner <owner@example.test>", "owner@example.test\nother@example.test"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                create_app(env={**self.env, "CARE_SITE_ADMIN_EMAILS": value})

    async def test_studio_draft_persists_and_revision_protects_save_and_delete(self):
        await self.authenticated()
        path = "/api/studio/drafts"
        original_body = "<p>Plain text, not HTML.</p>\nΈνα προσχέδιο\t🌒"
        created = await self.post(path, {"account": EMAIL, "title": "  ", "body": original_body})
        self.assertEqual(created.status_code, 201, created.text)
        self.assert_no_store(created)
        draft = created.json()["draft"]
        self.assertEqual((draft["title"], draft["body"], draft["revision"]), ("Untitled", original_body, 1))
        target = f"{path}/{draft['id']}"
        listed = await self.client.get(path, headers={"X-Care-Account": EMAIL})
        self.assertEqual(listed.json(), {"drafts": [{key: draft[key] for key in (
            "id", "title", "revision", "updated_at")}]})
        self.assert_no_store(listed)

        restart = await asyncio.to_thread(create_app, env=self.env)
        restored = self.new_client(app=restart)
        restored.cookies.update(self.client.cookies)
        opened = await restored.get(target, headers={"X-Care-Account": EMAIL})
        self.assertEqual(opened.json(), {"draft": draft})
        self.assert_no_store(opened)

        headers = {"Origin": ORIGIN}
        saved, other = sorted(await asyncio.gather(*(
            restored.put(target, headers=headers, json={"account": EMAIL, "title": title,
                         "body": f"{original_body}\n{title}", "revision": 1}) for title in ("First tab", "Second tab")
        )), key=lambda response: response.status_code)
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()["draft"]["revision"], 2)
        self.assertEqual((other.status_code, other.json()), (409, {"error": "draft_conflict"}))
        self.assert_no_store(other)
        self.assertEqual((await self.client.get(target)).json(), saved.json())

        stale_delete = await restored.request("DELETE", target, headers=headers,
                                              json={"account": EMAIL, "revision": 1})
        self.assertEqual((stale_delete.status_code, stale_delete.json()), (409, {"error": "draft_conflict"}))
        deleted = await restored.request("DELETE", target, headers=headers, json={"account": EMAIL, "revision": 2})
        self.assertEqual((deleted.status_code, deleted.json()), (200, {"deleted": True}))
        self.assertEqual((await restored.get(target)).status_code, 404)
        self.assertEqual((await restored.get(path)).json(), {"drafts": []})

    async def test_studio_drafts_remain_private_in_open_mode_and_when_accounts_switch(self):
        await asyncio.to_thread(self.app.state.site_settings.update, False, 0)
        path = "/api/studio/drafts"
        value = {"account": EMAIL, "title": "Private title", "body": "Private document"}
        for guest in (await self.client.get(path), await self.post(path, value)):
            self.assertEqual((guest.status_code, guest.json()), (401, {"error": "login_required"}))
            self.assert_no_store(guest)
        first = await self.authenticated()
        created = await self.post(path, value)
        draft = created.json()["draft"]
        target = f"{path}/{draft['id']}"
        await self.add_user(email=OWNER_EMAIL, name="Another reader")
        self.assertEqual((await self.login(email=OWNER_EMAIL)).status_code, 200)
        self.assertEqual((await self.client.get(path)).json(), {"drafts": []})
        self.assertEqual((await self.client.get(path, headers={"X-Care-Account": EMAIL})).json(),
                         {"error": "account_changed"})
        self.assertEqual((await self.client.get(target)).json(), {"error": "draft_not_found"})
        self.assertEqual((await self.client.get(target, headers={
            "Cookie": COOKIE_NAME + "=" + first.cookies[COOKIE_NAME]})).status_code, 401)
        for method, resource, payload in (("POST", path, value),
                                           ("PUT", target, {**value, "revision": 1}),
                                           ("DELETE", target, {"account": EMAIL, "revision": 1})):
            switched = await self.client.request(method, resource, headers={"Origin": ORIGIN}, json=payload)
            self.assertEqual((switched.status_code, switched.json()), (403, {"error": "account_changed"}))
        for method, payload in (("PUT", {**value, "account": OWNER_EMAIL, "revision": 1}),
                                ("DELETE", {"account": OWNER_EMAIL, "revision": 1})):
            denied = await self.client.request(method, target, headers={"Origin": ORIGIN}, json=payload)
            self.assertEqual((denied.status_code, denied.json()), (404, {"error": "draft_not_found"}))
            self.assertNotIn(value["body"], denied.text)
        self.assertEqual((await self.client.get(path)).json(), {"drafts": []})
        self.assertEqual((await self.login()).status_code, 200)
        self.assertEqual((await self.client.get(target)).json(), {"draft": draft})
        await asyncio.to_thread(self.app.state.auth.disable_user, EMAIL)
        self.assertEqual((await self.client.get(target)).status_code, 401)
        self.assertEqual((await self.post(path, value)).status_code, 401)

    async def test_studio_validates_payload_origin_and_concurrent_draft_quota(self):
        await self.authenticated()
        path = "/api/studio/drafts"
        value = {"account": EMAIL, "title": "Notes", "body": "Draft body"}
        for headers in ({"Origin": "https://unrelated.example.test"}, {"Sec-Fetch-Site": "same-site"}):
            denied = await self.post(path, value, headers=headers)
            self.assertEqual(denied.status_code, 403)
            self.assert_no_store(denied)
        self.assertEqual((await self.client.post(path, json=value)).status_code, 403)
        for invalid in ({"title": "Notes", "body": "Draft body"}, {**value, "title": 12},
                        {**value, "body": "\x00"}, {**value, "body": "\ud800"}, {**value, "public": True}):
            denied = await self.post(path, invalid)
            self.assertEqual((denied.status_code, denied.json()), (400, {"error": "invalid_draft"}))
        for oversized in ({**value, "title": "x" * 161}, {**value, "body": "é" * (128 * 1024 + 1)}):
            denied = await self.post(path, oversized)
            self.assertEqual((denied.status_code, denied.json()), (413, {"error": "draft_too_large"}))
        oversized_request = await self.client.post(path, headers={"Origin": ORIGIN},
                                                   json={**value, "body": "x" * (2 * 1024 * 1024)})
        self.assertEqual(oversized_request.status_code, 413)
        self.assertEqual((await self.client.get(path)).json(), {"drafts": []})

        with patch("server.studio_drafts.MAX_DRAFTS", 1):
            created, limited = sorted(await asyncio.gather(self.post(path, value), self.post(path, value)),
                                      key=lambda response: response.status_code)
            self.assertEqual(created.status_code, 201)
            self.assertEqual((limited.status_code, limited.json()), (409, {"error": "draft_limit"}))
            await self.add_user(email=OWNER_EMAIL, name="Another reader")
            other = self.new_client()
            self.assertEqual((await self.login(email=OWNER_EMAIL, client=other)).status_code, 200)
            self.assertEqual((await self.post(path, {**value, "account": OWNER_EMAIL}, client=other)).status_code, 201)

    async def test_studio_saves_native_html_and_footnotes_with_the_same_revision_guards(self):
        await self.authenticated()
        path = "/api/studio/drafts"
        source = (
            '<h2 data-block-id="heading">A section</h2>'
            '<p data-block-id="body" onclick="alert(1)" style="text-align: center; color: red">'
            '<span style="font-family: Georgia; font-size: 18pt; background: url(https://example.test)">'
            '<em>Native formatting</em></span> and <a href="https://example.test?a=1&amp;b=2">a link</a>'
            '<a href="jav&#x61;script:alert(1)">unsafe link</a><img src=x onerror=alert(1)>'
            '<script>alert(2)</script><svg><a href="https://example.test">gone</a></svg></p>'
            '<ol data-block-id="list" start="5"><li>First item</li></ol>'
        )
        safe_body = (
            '<h2 data-block-id="heading">A section</h2>'
            '<p data-block-id="body" style="text-align: center">'
            '<span style="font-family: Georgia; font-size: 18pt"><em>Native formatting</em></span> '
            'and <a href="https://example.test?a=1&amp;b=2" rel="noopener noreferrer">a link</a>'
            '<a>unsafe link</a></p><ol data-block-id="list" start="5"><li>First item</li></ol>'
        )
        notes = [{"id": "footnote-1", "block_id": "body", "marker_offset": 18, "marker_order": 0,
                  "note": "A plain note, with <angle brackets>."}]
        value = {"account": EMAIL, "title": "A" * 240, "format": "html", "body": source, "footnotes": notes}
        created = await self.post(path, value)
        self.assertEqual(created.status_code, 201, created.text)
        draft = created.json()["draft"]
        self.assertEqual((draft["format"], draft["body"], draft["footnotes"]), ("html", safe_body, notes))
        target = f"{path}/{draft['id']}"
        listed = (await self.client.get(path)).json()["drafts"]
        self.assertEqual(listed, [{key: draft[key] for key in ("id", "title", "revision", "updated_at")}])
        self.assertEqual((await self.client.get(target)).json()["draft"], draft)

        headers = {"Origin": ORIGIN}
        revised = {**value, "body": safe_body.replace("A section", "A new section"), "revision": 1}
        del revised["footnotes"]
        saved = await self.client.put(target, headers=headers, json=revised)
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()["draft"]["footnotes"], notes)
        self.assertEqual(saved.json()["draft"]["revision"], 2)
        stale = await self.client.put(target, headers=headers, json={**value, "revision": 1})
        self.assertEqual((stale.status_code, stale.json()), (409, {"error": "draft_conflict"}))
        downgraded = await self.client.put(target, headers=headers,
                                           json={"account": EMAIL, "title": "Old client", "body": "Text", "revision": 2})
        self.assertEqual((downgraded.status_code, downgraded.json()), (409, {"error": "draft_format_required"}))
        orphaned = await self.client.put(target, headers=headers, json={
            **revised, "body": '<p data-block-id="other">No original anchor.</p>', "revision": 2})
        self.assertEqual((orphaned.status_code, orphaned.json()), (400, {"error": "invalid_draft"}))
        removed = await self.client.put(target, headers=headers, json={**revised, "footnotes": [], "revision": 2})
        self.assertEqual(removed.status_code, 200, removed.text)
        self.assertEqual(removed.json()["draft"]["footnotes"], [])

    async def test_studio_migrates_plain_drafts_and_upgrades_only_explicit_html(self):
        await self.authenticated()
        path = "/api/studio/drafts"
        created = await self.post(path, {"account": EMAIL, "title": "Legacy", "body": "<b>Literal characters</b>"})
        draft = created.json()["draft"]
        target = f"{path}/{draft['id']}"
        with sqlite3.connect(self.database) as db:
            db.execute("ALTER TABLE studio_drafts DROP COLUMN footnotes")
            db.execute("ALTER TABLE studio_drafts DROP COLUMN document_format")

        app = await asyncio.to_thread(create_app, env=self.env)
        legacy = self.new_client(app=app)
        legacy.cookies.update(self.client.cookies)
        self.assertEqual((await legacy.get(target)).json(), {"draft": draft})
        upgraded = await legacy.put(target, headers={"Origin": ORIGIN}, json={
            "account": EMAIL, "title": draft["title"], "revision": draft["revision"], "format": "html",
            "body": "<p>&lt;b&gt;Literal characters&lt;/b&gt;</p>",
        })
        self.assertEqual(upgraded.status_code, 200, upgraded.text)
        saved = upgraded.json()["draft"]
        self.assertEqual(saved["format"], "html")
        self.assertRegex(saved["body"], r'^<p data-block-id="[a-f0-9]{32}">&lt;b&gt;Literal characters&lt;/b&gt;</p>$')
        self.assertEqual(saved["footnotes"], [])
        self.assertEqual(saved["revision"], 2)

    async def test_studio_preview_uses_its_own_local_account_and_database(self):
        preview = runpy.run_path(str(RELEASE_ROOT / "tools" / "preview-local.py"))
        loopback = preview["HOST"]
        local_origin = f"http://{loopback}:{preview['PORT']}"
        database = self.root / "preview-private" / "preview.sqlite3"
        local_app = await asyncio.to_thread(preview["make_preview"], self.web, database)
        local = self.new_client(app=local_app, ip=loopback, base_url=local_origin)
        foreign = self.new_client(app=local_app, ip="203.0.113.42", base_url=local_origin)
        self.assertEqual((await foreign.get("/api/session")).status_code, 403)
        self.assertEqual((await local.get("/api/session", headers={"Host": "foreign.example.test"})).status_code, 403)

        current = await local.get("/api/session")
        self.assertEqual(current.status_code, 200, current.text)
        self.assertTrue(current.json()["authenticated"])
        self.assertEqual(current.headers.get("x-care-local-preview"), "1")
        self.assertNotIn("set-cookie", current.headers)
        account = current.json()["user"]["email"]
        path = "/api/studio/drafts"
        value = {"account": account, "title": "Local preview", "body": "Test preview draft"}
        same_origin = {"Origin": local_origin, "Sec-Fetch-Site": "same-origin"}
        for origin in (preview["PREVIEW_ORIGIN"], "https://foreign.example.test"):
            response = await local.post(path, headers={"Origin": origin}, json=value)
            self.assertEqual(response.status_code, 403)
        self.assertEqual((await local.post(path, json=value)).status_code, 403)
        self.assertEqual((await local.post("/api/logout", headers=same_origin, json={})).status_code, 403)

        created = await local.post(path, headers=same_origin, json=value)
        self.assertEqual(created.status_code, 201, created.text)
        self.assert_no_store(created)
        draft = created.json()["draft"]
        target = f"{path}/{draft['id']}"
        reloaded = self.new_client(app=local_app, ip=loopback, base_url=local_origin)
        self.assertEqual((await reloaded.get(target, headers={"X-Care-Account": account})).json(), {"draft": draft})
        saved = await reloaded.put(target, headers=same_origin, json={**value, "revision": 1, "body": "Edited"})
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()["draft"]["revision"], 2)
        relaunched_app = await asyncio.to_thread(preview["make_preview"], self.web, database)
        relaunched = self.new_client(app=relaunched_app, ip=loopback, base_url=local_origin)
        self.assertEqual((await relaunched.get(target, headers={"X-Care-Account": account})).json(), saved.json())
        await self.authenticated()
        self.assertEqual((await self.client.get(path)).json(), {"drafts": []})
        self.assertEqual((await self.client.get(target)).status_code, 404)
        deleted = await relaunched.request("DELETE", target, headers=same_origin,
                                           json={"account": account, "revision": 2})
        self.assertEqual((deleted.status_code, deleted.json()), (200, {"deleted": True}))

    async def test_studio_preview_duplicate_launcher_preserves_the_running_session(self):
        preview = runpy.run_path(str(RELEASE_ROOT / "tools" / "preview-local.py"))
        site = self.root / "preview-release"
        catalogue = site / "dist" / "data" / "catalogue.json"
        catalogue.parent.mkdir(parents=True)
        catalogue.write_text("{}")
        database = site / ".care-beta" / "browser-preview" / "preview.sqlite3"
        running = await asyncio.to_thread(preview["make_preview"], site / "dist", database)
        host, port = preview["HOST"], preview["PORT"]
        local = self.new_client(app=running, ip=host, base_url=f"http://{host}:{port}")
        self.assertTrue((await local.get("/api/session")).json()["authenticated"])

        def account_rows():
            with sqlite3.connect(database) as connection:
                return (connection.execute("SELECT * FROM users").fetchall(),
                        connection.execute("SELECT * FROM sessions").fetchall())

        before = account_rows()
        main = preview["main"]
        with patch.dict(main.__globals__, {"SITE": site}), patch.object(preview["socket"], "socket") as socket:
            listener = socket.return_value.__enter__.return_value
            listener.bind.side_effect = OSError(errno.EADDRINUSE, "Address already in use")
            with self.assertRaisesRegex(SystemExit, "already running.*Control-C"):
                main()
            listener.bind.assert_called_once_with((host, port))

        self.assertEqual(account_rows(), before)
        self.assertTrue((await local.get("/api/session")).json()["authenticated"])
        drafts = await local.get("/api/studio/drafts")
        self.assertEqual((drafts.status_code, drafts.json()), (200, {"drafts": []}))


if __name__ == "__main__":
    unittest.main()
