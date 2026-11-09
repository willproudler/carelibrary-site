"""The public search service reads only a hashed, reviewed projection."""
from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

import httpx

SITE = Path(__file__).resolve().parents[1]
if str(SITE) not in sys.path:
    sys.path.insert(0, str(SITE))

from server.app import create_app
from server.library_search import PublishedLibrarySearch, search_options


ORIGIN = "https://care.example.test"


def write_projection(root):
    search = root / "search"
    data = root / "data"
    search.mkdir()
    data.mkdir()
    works = [
        {
            "id": "WORK_ONE", "slug": "first", "title": "First", "author": "A. Author",
            "sources": [{"id": "RAW_FIRST", "title": "The opening", "paragraphs": [
                ["RAW_FIRST:P0001", "First came memory, then the question."],
                ["RAW_FIRST:P0002", "Memory does not remain unchanged."],
            ]}],
            "units": [{"id": "CH_FIRST", "title": "The opening", "layer": "CH", "sections": [
                {"name": "Axioms", "items": [
                    ["CH_FIRST:A1", "Memory preserves the past as an active process.", ["CH_FIRST:A2", "RAW_FIRST:P0001"]],
                    ["CH_FIRST:A2", "Memory changes through perception.", []],
                    ["CH_FIRST:A3", "Desire is productive and does not originate in lack.", []],
                ]},
            ]}],
        },
        {
            "id": "WORK_TWO", "slug": "second", "title": "Second", "author": "B. Author",
            "sources": [{"id": "RAW_SECOND", "title": "Another opening", "paragraphs": [
                ["RAW_SECOND:P0001", "Memory preserves the past unchanged."],
                ["RAW_SECOND:P0002", "The question came first and memory came later."],
            ]}],
            "units": [],
        },
    ]
    revision = "public-test-revision"
    manifest = {"version": 1, "revision": revision, "works": {}}
    for work in works:
        contents = json.dumps(work).encode()
        digest = sha256(contents).hexdigest()
        name = f"work-{digest[:24]}.json"
        (search / name).write_bytes(contents)
        manifest["works"][work["id"]] = {"name": name, "sha256": digest, "bytes": len(contents)}
    (search / "catalogue.json").write_text(json.dumps(manifest))
    (data / "catalogue.json").write_text(json.dumps({
        "public_assets": {"revision": revision},
        "works": [{"id": work["id"], "slug": work["slug"]} for work in works],
    }))
    (data / "library.json").write_text('{"private": "secret phrase unlisted by any projection"}')
    return manifest


class SearchTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name).resolve()
        self.manifest = write_projection(self.root)
        self.service = PublishedLibrarySearch(self.root)

    def search(self, **values):
        return self.service.search(search_options(values))["results"]

    def test_exact_ids_phrases_scopes_and_recorded_connections(self):
        exact, = self.search(query="raw_first:p0001", kind="passage")
        self.assertEqual(exact["href"], "#book=first&ref=RAW_FIRST%3AP0001")
        self.assertEqual(exact["search_match"]["label"], "Exact ID")
        self.assertEqual(self.search(query="RAW_FIRST:P0001", kind="passage", work_id="WORK_TWO"), [])
        self.assertEqual(self.search(query='"first and memory"', kind="passage")[0]["item_id"], "RAW_SECOND:P0002")
        self.assertEqual(self.search(query='"memory the question"', kind="passage"), [])
        deeper, = self.search(query="CH_FIRST:A1", kind="axiom", mode="explore", depth=1, exclude=["CH_FIRST:A1"])
        self.assertEqual(deeper["item_id"], "CH_FIRST:A2")
        self.assertEqual(deeper["search_match"]["label"], "Recorded connection")
        self.assertEqual(self.search(query='"secret phrase unlisted"'), [])

    def test_challenge_preserves_the_native_evidence_quote(self):
        results = self.search(query="Desire is always lack.", kind="axiom", mode="challenge")
        match = next(row for row in results if row["item_id"] == "CH_FIRST:A3")
        self.assertEqual(match["search_match"]["label"], "Possible challenge")
        self.assertIn(match["search_match"]["quote"], match["text"])

    def test_tampered_or_outside_projection_is_rejected(self):
        descriptor = self.manifest["works"]["WORK_ONE"]
        path = self.root / "search" / descriptor["name"]
        contents = path.read_bytes()
        path.write_bytes(contents.replace(b"memory", b"SECRET"))
        with self.assertRaisesRegex(ValueError, "fingerprint"):
            self.search(query="memory")
        descriptor["name"] = "../data/library.json"
        (self.root / "search" / "catalogue.json").write_text(json.dumps(self.manifest))
        with self.assertRaisesRegex(ValueError, "descriptor"):
            self.search(query="memory")


class SearchRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_requires_beta_account_and_same_origin_then_allows_open_mode(self):
        with TemporaryDirectory() as directory:
            base = Path(directory).resolve()
            web = base / "web"
            web.mkdir()
            (web / "index.html").write_text("CARE Library")
            write_projection(web)
            app = create_app(env={"CARE_WEB_ROOT": str(web), "CARE_PUBLIC_ORIGIN": ORIGIN,
                                  "CARE_DATABASE_PATH": str(base / "private" / "accounts.sqlite3")})
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url=ORIGIN) as browser:
                route = "/api/library/search"
                value = {"query": "RAW_FIRST:P0001", "kind": "passage"}
                self.assertEqual((await browser.post(route, json=value, headers={"Origin": ORIGIN})).status_code, 401)
                self.assertEqual((await browser.get("/search/catalogue.json")).status_code, 404)
                email, password = "reviewer@example.test", "A private test account password"
                app.state.auth.add_user(email, "Reviewer", password)
                login = await browser.post("/api/login", json={"email": email, "password": password}, headers={"Origin": ORIGIN})
                self.assertEqual(login.status_code, 200, login.text)
                self.assertEqual((await browser.post(route, json=value, headers={"Origin": ORIGIN})).status_code, 200)
                browser.cookies.clear()
                app.state.site_settings.update(False, 0)
                self.assertEqual((await browser.post(route, json=value, headers={"Origin": "https://elsewhere.test"})).status_code, 403)
                self.assertEqual((await browser.post(route, json={**value, "limit": 100}, headers={"Origin": ORIGIN})).status_code, 400)
                result = await browser.post(route, json=value, headers={"Origin": ORIGIN})
                self.assertEqual(result.status_code, 200, result.text)
                self.assertEqual(result.headers["Cache-Control"], "no-store")
                self.assertEqual(result.json()["results"][0]["item_id"], "RAW_FIRST:P0001")
                self.assertEqual((await browser.get("/search/catalogue.json")).status_code, 404)

    async def test_private_studio_footnotes_use_exact_published_references(self):
        with TemporaryDirectory() as directory:
            base = Path(directory).resolve()
            web = base / "web"
            web.mkdir()
            (web / "index.html").write_text("CARE Library")
            write_projection(web)
            app = create_app(env={"CARE_WEB_ROOT": str(web), "CARE_PUBLIC_ORIGIN": ORIGIN,
                                  "CARE_DATABASE_PATH": str(base / "private" / "accounts.sqlite3")})
            email, password = "author@example.test", "A private test account password"
            app.state.auth.add_user(email, "Author", password)
            headers = {"Origin": ORIGIN}
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url=ORIGIN) as browser:
                login = await browser.post("/api/login", json={"email": email, "password": password}, headers=headers)
                self.assertEqual(login.status_code, 200, login.text)
                note = {"id": "source-note", "block_id": "paragraph", "marker_offset": 10,
                        "marker_order": 0, "note": "My private note"}
                source = {"kind": "passage", "item_id": "RAW_FIRST:P0001", "quote": "came memory, then"}
                document = {"account": email, "title": "My draft", "format": "html",
                            "body": '<p data-block-id="paragraph">My opening came memory, then</p>',
                            "footnotes": [{**note, "source": source}, {**note, "id": "manual-note", "marker_order": 1}]}
                response = await browser.post("/api/studio/drafts", json=document, headers=headers)
                self.assertEqual(response.status_code, 201, response.text)
                saved = response.json()["draft"]
                citation, manual = saved["footnotes"]
                self.assertEqual(citation["source"]["text"], "First came memory, then the question.")
                self.assertEqual(citation["source"]["href"], "#book=first&ref=RAW_FIRST%3AP0001")
                self.assertEqual(citation["source"]["quote"], source["quote"])
                self.assertNotIn("source", manual)
                draft_path = "/api/studio/drafts/" + saved["id"]
                for bad_source, code in (
                    ({**source, "item_id": "RAW_LOCAL:P0001"}, "source_not_published"),
                    ({**source, "quote": "a fabricated excerpt"}, "source_quote_changed"),
                    ({**source, "href": "https://elsewhere.test"}, "invalid_draft"),
                ):
                    update = {**document, "revision": 1, "footnotes": [{**note, "source": bad_source}]}
                    failed = await browser.put(draft_path, json=update, headers=headers)
                    self.assertEqual((failed.status_code, failed.json()["error"]), (400, code))
                self.assertEqual((await browser.get(draft_path)).json()["draft"], saved)
                moved = {**document, "revision": 1, "footnotes": [{**note, "marker_offset": 20,
                                                                  "note": "Moved", "source": source}]}
                updated = await browser.put(draft_path, json=moved, headers=headers)
                self.assertEqual(updated.status_code, 200, updated.text)
                self.assertEqual(updated.json()["draft"]["footnotes"],
                                 [{**citation, "marker_offset": 20, "note": "Moved"}])
