"""Clean source pages and exact source editions follow the public-library gate."""
from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server.app import create_app
from server import search_pages

spec = importlib.util.spec_from_file_location("source_download_production", ROOT / "tools/build-production-site.py")
production = importlib.util.module_from_spec(spec)
spec.loader.exec_module(production)


def fixture(web: Path) -> dict:
    book = {"slug": "monadology-leibniz", "route_slug": "leibnizmonadology", "url": "/leibnizmonadology",
            "path": "books/monadology-leibniz/index.html", "text_path": "books/monadology-leibniz/text.html",
            "has_text": True, "downloads": []}
    files = {"index.html": b"Public home", book["path"]: b"Metadata only",
             book["text_path"]: b"Clean original source with no CARE workspace"}
    for extension, mime in (("txt", "text/plain"), ("md", "text/markdown"), ("epub", "application/epub+zip")):
        payload = ("Original source edition: " + extension + " \u03bb\n").encode()
        path = f"books/{book['slug']}/downloads/source.{extension}"
        book["downloads"].append({"format": extension, "media_type": mime, "path": path,
                                  "url": f"/leibnizmonadology/downloads/source.{extension}",
                                  "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload)})
        files[path] = payload
    for name, payload in files.items():
        path = web / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
    manifest = {"schema": "care-book-search-pages/1", "source_sha256": "a" * 64, "books": [book], "chapters": []}
    (web / "books/manifest.json").write_text(json.dumps(manifest))
    (web / "data").mkdir(exist_ok=True)
    (web / "data/export-audit.json").write_text(json.dumps({"sha256": "a" * 64}))
    return manifest


class SourceDownloadRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        folder = Path(temporary.name).resolve()
        self.web = folder / "web"
        self.web.mkdir()
        self.manifest = fixture(self.web)
        self.book = self.manifest["books"][0]
        self.app = create_app(env={"CARE_PUBLIC_ORIGIN": "https://care.example.test", "CARE_WEB_ROOT": str(self.web),
                                  "CARE_DATABASE_PATH": str(folder / "private/accounts.sqlite3")})
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="https://care.example.test")
        self.addAsyncCleanup(self.client.aclose)

    def save_manifest(self, value):
        (self.web / "books/manifest.json").write_text(json.dumps(value))

    async def test_canonical_book_uses_clean_text_only_when_public(self):
        response = await self.client.get(self.book["url"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "Metadata only")
        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.app.state.site_settings.update(False, 0)
        response = await self.client.get(self.book["url"])
        self.assertEqual(response.status_code, 200)
        self.assertIn("Clean original source", response.text)
        self.assertEqual(response.headers["x-frame-options"], "SAMEORIGIN")
        self.assertIn("frame-ancestors 'self'", response.headers["content-security-policy"])
        response = await self.client.get("/" + self.book["text_path"])
        self.assertEqual(response.status_code, 308)
        self.assertEqual(response.headers["location"], self.book["url"])
        self.app.state.site_settings.update(True, 1)
        self.assertEqual((await self.client.get("/" + self.book["text_path"])).status_code, 404)

    async def test_downloads_are_exact_attachments_with_correct_get_head_types(self):
        self.app.state.site_settings.update(False, 0)
        for item in self.book["downloads"]:
            payload = (self.web / item["path"]).read_bytes()
            for method in ("GET", "HEAD"):
                with self.subTest(format=item["format"], method=method):
                    response = await self.client.request(method, item["url"])
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.headers["x-frame-options"], "DENY")
                    self.assertTrue(response.headers["content-type"].startswith(item["media_type"]))
                    self.assertIn('attachment; filename="leibnizmonadology-source.', response.headers["content-disposition"])
                    self.assertIn('</leibnizmonadology>; rel="canonical"', response.headers["link"])
                    self.assertEqual(response.content, payload if method == "GET" else b"")
            alias = await self.client.get("/" + item["path"])
            self.assertEqual(alias.status_code, 308)
            self.assertEqual(alias.headers["location"], item["url"])
            self.assertEqual((await self.client.get(item["url"] + ".gz")).status_code, 404)
        self.assertEqual((await self.client.get("/leibnizmonadology/downloads/source.care")).status_code, 404)
        self.assertEqual((await self.client.get("/leibnizmonadology/downloads/private.txt")).status_code, 404)

    async def test_gated_mode_denies_downloads_even_to_authenticated_readers(self):
        self.app.state.auth.add_user("reader@example.test", "Reader", "A source-download test password")
        response = await self.client.post("/api/login", json={"email": "reader@example.test", "password": "A source-download test password"},
                                          headers={"Origin": "https://care.example.test"})
        self.assertEqual(response.status_code, 200)
        for item in self.book["downloads"]:
            self.assertEqual((await self.client.get(item["url"])).status_code, 404)
            self.assertEqual((await self.client.get("/" + item["path"])).status_code, 404)

    async def test_invalid_declarations_and_stale_attestation_fail_closed(self):
        self.app.state.site_settings.update(False, 0)
        cases = (("path", "data/private.txt"), ("url", "/other/downloads/source.txt"),
                 ("media_type", "text/html"), ("format", "care"), ("bytes", True),
                 ("sha256", "0" * 64))
        for field, value in cases:
            manifest = copy.deepcopy(self.manifest)
            manifest["books"][0]["downloads"][0][field] = value
            self.save_manifest(manifest)
            with self.subTest(field=field):
                self.assertEqual((await self.client.get(self.book["downloads"][0]["url"])).status_code, 404)
        manifest = copy.deepcopy(self.manifest)
        manifest["source_sha256"] = "b" * 64
        self.save_manifest(manifest)
        self.assertEqual((await self.client.get(self.book["downloads"][0]["url"])).status_code, 404)

    async def test_translated_files_and_optional_axioms_need_exact_attested_paths(self):
        from server.source_downloads import TYPES
        rows=[]
        for fmt,stem in [('docx','source'),('pdf','source-with-axioms')]:
            folder=f"books/{self.book['slug']}/downloads/en/"
            url=self.book['url']+'/language/en/downloads/'+stem+'.'+fmt
            payload=('English edition · '+stem).encode()
            file=self.web/folder/(stem+'.'+fmt)
            file.parent.mkdir(parents=True,exist_ok=True)
            file.write_bytes(payload)
            rows.append({'format':fmt,'path':folder+stem+'.'+fmt,'url':url,'media_type':TYPES[fmt],
                         'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
        self.book['editions']=[{'language_code':'en','kind':'translation','language_name':'English',
                                'path':f"books/{self.book['slug']}/languages/en/index.html",
                                'url':self.book['url']+'/language/en/', 'downloads':[rows[0]],'axiom_downloads':[rows[1]]}]
        self.save_manifest(self.manifest)
        self.assertEqual((await self.client.get(rows[0]['url'])).status_code,404)
        self.app.state.site_settings.update(False,0)
        for row in rows:
            response=await self.client.get(row['url'])
            self.assertEqual(response.status_code,200)
            self.assertTrue(response.headers['content-type'].startswith(row['media_type']))
            self.assertIn('-en-source',response.headers['content-disposition'])
            self.assertEqual((await self.client.get('/'+row['path'])).headers['location'],row['url'])
        self.book['editions'][0]['path']='books/other/languages/en/index.html'
        self.save_manifest(self.manifest)
        self.assertEqual((await self.client.get(rows[1]['url'])).status_code,404)

    async def test_changed_bytes_or_symlink_never_serve_a_registered_download(self):
        self.app.state.site_settings.update(False, 0)
        item = self.book["downloads"][0]
        path = self.web / item["path"]
        self.assertEqual((await self.client.get(item["url"])).status_code, 200)
        payload = path.read_bytes()
        path.write_bytes(b"X" * len(payload))
        self.assertEqual((await self.client.get(item["url"])).status_code, 404)
        outside = self.web.parent / "private-copy.txt"
        outside.write_bytes(payload)
        path.unlink()
        path.symlink_to(outside)
        self.assertEqual((await self.client.get(item["url"])).status_code, 404)

    async def test_unverified_gzip_sidecars_cannot_replace_verified_download_bytes(self):
        self.app.state.site_settings.update(False, 0)
        item = self.book["downloads"][0]
        path = self.web / item["path"]
        path.with_name(path.name + ".gz").write_bytes(b"not the registered source edition")
        response = await self.client.get(item["url"], headers={"Accept-Encoding": "gzip"})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("content-encoding", response.headers)
        self.assertEqual(response.content, path.read_bytes())


class SourceDownloadStagingTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.web = Path(temporary.name).resolve() / "web"
        self.web.mkdir()
        self.manifest = fixture(self.web)
        for name in production.ROOT_FILES:
            path = self.web / name
            if not path.exists():
                path.write_text("Reviewed browser file")
        for name in production.ASSET_DIRECTORIES:
            (self.web / name).mkdir(exist_ok=True)

    def test_only_registered_verified_source_files_are_staged(self):
        self.assertNotIn(".epub", production.ASSET_EXTENSIONS)
        production.copy_browser_files(self.web, self.web / "dist")
        for item in self.manifest["books"][0]["downloads"]:
            self.assertEqual((self.web / "dist" / item["path"]).read_bytes(), (self.web / item["path"]).read_bytes())
        extra = self.web / "books/monadology-leibniz/downloads/private.html"
        extra.write_text("Private file with a normally accepted extension")
        with self.assertRaisesRegex(ValueError, "Unrecognized browser asset"):
            production.copy_browser_files(self.web, self.web / "dist")
        self.assertFalse((self.web / "dist" / extra.relative_to(self.web)).exists())

    def test_wrong_hash_or_arbitrary_path_does_not_replace_previous_build(self):
        dist = self.web / "dist"
        dist.mkdir()
        (dist / "previous.html").write_text("Previous successful build")
        item = self.manifest["books"][0]["downloads"][0]
        (self.web / item["path"]).write_text("Changed source")
        with self.assertRaisesRegex(ValueError, "changed or is incomplete"):
            production.copy_browser_files(self.web, dist)
        self.assertEqual((dist / "previous.html").read_text(), "Previous successful build")

    def test_duplicate_download_formats_and_publication_digest_mismatch_fail(self):
        book = self.manifest["books"][0]
        book["downloads"][1] = copy.deepcopy(book["downloads"][0])
        (self.web / "books/manifest.json").write_text(json.dumps(self.manifest))
        with self.assertRaisesRegex(ValueError, "Invalid registered source download"):
            production.source_download_assets(self.web)
        self.manifest["source_sha256"] = "b" * 64
        (self.web / "books/manifest.json").write_text(json.dumps(self.manifest))
        with self.assertRaisesRegex(ValueError, "attested publication"):
            production.source_download_assets(self.web)

    def test_stamping_preserves_standalone_source_prose_and_still_stamps_normal_assets(self):
        source = self.web / self.manifest["books"][0]["text_path"]
        original = ('<!doctype html><html><head><meta name="care-source-page" content="original">'
                    '<style>body{font-family:serif}</style></head><body>'
                    '<p>The literal path `/about.css` belongs to this source passage.</p></body></html>')
        source.write_text(original, encoding="utf-8")
        ordinary = self.web / "about.html"
        ordinary.write_text('<!doctype html><html><head><link rel="stylesheet" href="/about.css"></head>'
                            '<body><p>Ordinary website content.</p></body></html>', encoding="utf-8")
        (self.web / "about.css").write_text("body{color:white}", encoding="utf-8")
        production.stamp_browser_modules(self.web)
        self.assertEqual(source.read_text(encoding="utf-8"), original)
        self.assertIn('href="/about.css?v=', ordinary.read_text(encoding="utf-8"))
        self.assertIn("static.cloudflareinsights.com/beacon.min.js", ordinary.read_text(encoding="utf-8"))

    def test_source_marker_in_body_does_not_bypass_normal_asset_stamping(self):
        ordinary = self.web / "about.html"
        ordinary.write_text('<!doctype html><html><head><link rel="stylesheet" href="/about.css"></head>'
                            '<body><meta name="care-source-page" content="original"></body></html>', encoding="utf-8")
        (self.web / "about.css").write_text("body{color:white}", encoding="utf-8")
        production.stamp_browser_modules(self.web)
        self.assertIn('href="/about.css?v=', ordinary.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
