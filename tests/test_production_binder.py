"""Studio Binder boundaries using HTTPS ASGI requests and disposable accounts."""
from pathlib import Path
from html import escape
import json
import sys
import tempfile
import unittest

import httpx


RELEASE_ROOT = Path(__file__).resolve().parents[1]
if str(RELEASE_ROOT) not in sys.path:
    sys.path.insert(0, str(RELEASE_ROOT))

from server.app import create_app


ORIGIN = "https://care.example.test"
OWNER = "writer@example.test"
OTHER = "other@example.test"
PASSWORD = "A disposable Binder test password!"
BINDER = "/api/studio/binder"
DRAFTS = "/api/studio/drafts"


class StudioBinderTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name).resolve()
        web = root / "web"
        web.mkdir()
        (web / "index.html").write_text("Public Discover")
        self.app = create_app(env={
            "CARE_PUBLIC_ORIGIN": ORIGIN,
            "CARE_WEB_ROOT": str(web),
            "CARE_DATABASE_PATH": str(root / "private" / "accounts.sqlite3"),
        })
        self.client = await self.client_for(OWNER)

    async def client_for(self, account=None):
        client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url=ORIGIN,
                                   headers={"Origin": ORIGIN})
        self.addAsyncCleanup(client.aclose)
        if account:
            self.app.state.auth.add_user(account, "Binder tester", PASSWORD)
            response = await client.post("/api/login", json={"email": account, "password": PASSWORD})
            self.assertEqual(response.status_code, 200, response.text)
        return client

    async def act(self, operation, **payload):
        response = await self.client.post(BINDER, json={"account": OWNER, "operation": operation, **payload})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    async def folder(self, name, parent=None):
        result = await self.act("create-folder", folder_name=name, folder_id=parent)
        return result["ack"]["binder_folder"]

    async def draft(self, title, body="Manuscript", **fields):
        response = await self.client.post(DRAFTS, json={"account": OWNER, "title": title, "body": body, **fields})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["draft"]

    async def test_nested_grouping_rejects_a_stale_member_atomically(self):
        project = await self.folder("Project")
        first = await self.draft("First", folder_id=project)
        second = await self.draft("Second")
        identities = [first["id"], second["id"]]
        grouping = {"operation": "folder-from-selection", "folder_name": "Selected", "folder_id": project,
                    "document_ids": identities, "document_revisions": {first["id"]: 1, second["id"]: 2}}
        rejected = await self.client.post(BINDER, json={"account": OWNER, **grouping})
        self.assertEqual((rejected.status_code, rejected.json()), (409, {"error": "draft_conflict"}))
        unchanged = (await self.client.get(BINDER)).json()
        self.assertEqual(unchanged["folders"], [{"id": project, "name": "Project", "parent_id": None}])
        self.assertEqual(unchanged["locations"], {first["id"]: project, second["id"]: None})

        grouping["document_revisions"][second["id"]] = 1
        grouped = await self.act(**grouping)
        selected = grouped["ack"]["binder_folder"]
        self.assertIn({"id": selected, "name": "Selected", "parent_id": project}, grouped["folders"])
        self.assertEqual(grouped["locations"], dict.fromkeys(identities, selected))
        self.assertEqual({draft["revision"] for draft in grouped["drafts"]}, {1})
        cycle = await self.client.post(BINDER, json={"account": OWNER, "operation": "move", "item_kind": "folder",
                                                     "target_id": project, "folder_id": selected})
        self.assertEqual((cycle.status_code, cycle.json()), (409, {"error": "binder_cycle"}))

    async def test_binder_folder_and_manuscript_are_private_to_the_owner(self):
        folder = await self.folder("Private project")
        draft = await self.draft("Private draft", folder_id=folder)
        visitor = await self.client_for()
        self.assertEqual((await visitor.get(BINDER)).status_code, 401)
        other = await self.client_for(OTHER)
        self.assertEqual((await other.get(BINDER, headers={"X-Care-Account": OWNER})).status_code, 403)
        other_binder = (await other.get(BINDER)).json()
        self.assertEqual(other_binder["folders"], [])
        self.assertEqual(other_binder["drafts"], [])
        denied = await other.post(DRAFTS, json={"account": OTHER, "title": "New", "body": "", "folder_id": folder})
        self.assertEqual((denied.status_code, denied.json()), (404, {"error": "binder_folder_not_found"}))
        denied = await other.post(BINDER, json={"account": OTHER, "operation": "read", "document_ids": [draft["id"]]})
        self.assertEqual((denied.status_code, denied.json()), (404, {"error": "draft_not_found"}))

    async def test_folder_trash_and_restore_leave_independently_trashed_drafts_hidden(self):
        folder = await self.folder("Project")
        nested = await self.folder("Chapter", folder)
        kept = await self.draft("Recover with folder", folder_id=nested)
        independent = await self.draft("Recover separately", folder_id=nested)
        await self.act("trash", item_kind="document", target_id=independent["id"], target_revision=1)
        trashed = await self.act("trash", item_kind="folder", target_id=folder)
        self.assertEqual(trashed["folders"], [])
        self.assertEqual(trashed["drafts"], [])
        self.assertEqual({(item["kind"], item["id"]) for item in trashed["trash"]},
                         {("document", independent["id"]), ("folder", folder)})
        self.assertEqual((await self.client.get(DRAFTS)).json(), {"drafts": []})
        path = f"{DRAFTS}/{kept['id']}"
        self.assertEqual((await self.client.get(path)).status_code, 404)
        stale = {"account": OWNER, "title": kept["title"], "body": "Old save", "revision": 1}
        self.assertEqual((await self.client.put(path, json=stale)).status_code, 404)
        restored = await self.act("restore", item_kind="folder", target_id=folder)
        self.assertEqual(restored["locations"], {kept["id"]: nested})
        self.assertEqual([item["id"] for item in restored["trash"]], [independent["id"]])
        self.assertEqual((await self.client.get(path)).json()["draft"]["body"], kept["body"])
        self.assertEqual((await self.client.put(path, json=stale)).status_code, 409)
        separately_restored = await self.act("restore", item_kind="document", target_id=independent["id"])
        self.assertEqual(separately_restored["locations"], {kept["id"]: nested, independent["id"]: nested})
        self.assertEqual(separately_restored["trash"], [])

    async def test_reading_copy_orders_and_escapes_drafts(self):
        earlier = await self.draft("Earlier <section>", "<script>alert(1)</script> & text")
        later = await self.draft("Later", '<p data-block-id="opening"><em>Draft</em><img src=x onerror=alert(1)></p>',
                                 format="html", footnotes=[{"id": "n1", "block_id": "opening", "marker_offset": 0,
                                                             "marker_order": 0, "note": "<em>Note</em>"}])
        result = await self.act("read", document_ids=[later["id"], earlier["id"]])
        preview = result["ack"]["binder_preview"]
        self.assertEqual(preview["count"], 2)
        self.assertLess(preview["html"].index("<h1>Later</h1>"), preview["html"].index("<h1>Earlier &lt;section&gt;</h1>"))
        self.assertIn("<em>Draft</em>", preview["html"])
        self.assertIn("&lt;em&gt;Note&lt;/em&gt;", preview["html"])
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt; &amp; text", preview["html"])
        self.assertNotIn("<script", preview["html"])
        self.assertNotIn("<img", preview["html"])

    async def test_heading_styles_survive_account_save_and_reload_without_untrusted_css(self):
        styles = {"h2": {"font": "Georgia", "size": "18", "bold": True, "italic": False,
                         "underline": True, "align": "left", "weight": "700"}}
        encoded = escape(json.dumps(styles), quote=True)
        body = (f'<h2 data-block-id="heading" data-writing-styles="{encoded}" '
                'style="font-family: Georgia; font-size: 18pt; font-weight: 700; font-style: italic; '
                'text-decoration-line: underline; background-image: url(https://example.test)">Heading</h2>'
                f'<p data-block-id="prose" data-writing-styles="{encoded}">Writing remains.</p>')
        draft = await self.draft("Styled draft", body, format="html", footnotes=[])
        self.assertEqual(draft["body"].count("data-writing-styles="), 1)
        for declaration in ("font-weight: 700", "font-style: italic", "text-decoration-line: underline"):
            self.assertIn(declaration, draft["body"])
        self.assertNotIn("background-image", draft["body"])
        path = f"{DRAFTS}/{draft['id']}"
        saved = await self.client.put(path, json={"account": OWNER, "title": draft["title"],
            "body": draft["body"], "format": "html", "footnotes": [], "revision": draft["revision"]})
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()["draft"]["body"], draft["body"])
        self.assertEqual((await self.client.get(path)).json()["draft"], saved.json()["draft"])

    async def test_heading_presets_reject_unknown_properties_and_nested_registries(self):
        style = {"font": "Georgia", "size": "18", "bold": True, "italic": False,
                 "underline": False, "align": "left"}
        from server.studio_drafts import draft_content
        for invalid in ({"script": style}, {"h2": {**style, "css": "url(https://example.test)"}},
                        {"h2": {**style, "bold": 1}}, {"h2": {**style, "size": "018"}},
                        {"h2": {**style, "font": "var(--injected)"}}):
            body = '<h2 data-writing-styles="' + escape(json.dumps(invalid), quote=True) + '">Heading</h2>'
            self.assertNotIn("data-writing-styles", draft_content("Title", body, "html").body)
        encoded = escape(json.dumps({"h2": style}), quote=True)
        body = f'<div>Before<h2 data-writing-styles="{encoded}">Nested heading</h2></div>'
        self.assertNotIn("data-writing-styles", draft_content("Title", body, "html").body)

    async def test_first_drafts_are_owned_editable_documents_and_preserve_saved_rich_text(self):
        folder = await self.folder("Project")
        source = '<p data-block-id="opening">An <em>early manuscript</em> with its evidence</p><p>Second paragraph</p>'
        notes = [{"id": "note", "block_id": "opening", "marker_offset": 3, "marker_order": 0, "note": "Keep this note"}]
        draft = await self.draft("Untitled draft 2", source, format="html", footnotes=notes, folder_id=folder)
        action = {"item_kind": "document", "target_id": draft["id"], "target_revision": draft["revision"],
                  "folder_id": folder, "first_draft": True}
        placed = await self.act("place-draft", **action)
        self.assertEqual(placed["first_drafts"], [draft["id"]])
        self.assertEqual(placed["locations"], {draft["id"]: folder})
        self.assertEqual(placed["ack"], {"binder_placed": True, "binder_title": "An early manuscript with its evidence", "revision": 2})
        self.assertEqual((await self.client.get(BINDER)).json()["first_drafts"], [draft["id"]])
        path = f"{DRAFTS}/{draft['id']}"
        reopened = (await self.client.get(path)).json()["draft"]
        self.assertEqual((reopened["body"], reopened["footnotes"]), (draft["body"], draft["footnotes"]))
        stale = await self.client.post(BINDER, json={"account": OWNER, "operation": "place-draft", **action, "first_draft": False})
        self.assertEqual((stale.status_code, stale.json()), (409, {"error": "draft_conflict"}))
        self.assertEqual((await self.client.get(BINDER)).json()["first_drafts"], [draft["id"]])
        revised = {key: reopened[key] for key in ("title", "revision", "format", "footnotes")}
        revised["body"] = reopened["body"] + "<p>New writing</p>"
        saved = await self.client.put(path, json={"account": OWNER, **revised})
        self.assertEqual(saved.status_code, 200, saved.text)
        edited = saved.json()["draft"]
        self.assertEqual((await self.client.get(BINDER)).json()["first_drafts"], [draft["id"]])
        moved = await self.act("place-draft", **{**action, "first_draft": False, "target_revision": edited["revision"]})
        self.assertEqual(moved["first_drafts"], [])
        self.assertEqual(moved["locations"][draft["id"]], folder)
        self.assertEqual(moved["ack"]["revision"], edited["revision"])
        self.assertEqual((await self.client.get(path)).json()["draft"], edited)

    async def test_first_drafts_protect_hidden_folder_members_and_selection_moves_clear_the_shelf(self):
        parent = await self.folder("Project")
        folder = await self.folder("Chapter", parent)
        draft = await self.draft("An authored title", folder_id=folder)
        placed = await self.act("place-draft", item_kind="document", target_id=draft["id"], target_revision=1,
                                folder_id=folder, first_draft=True)
        self.assertEqual(placed["ack"]["revision"], 1)
        denied = await self.client.post(BINDER, json={"account": OWNER, "operation": "trash", "item_kind": "folder", "target_id": parent})
        self.assertEqual((denied.status_code, denied.json()), (409, {"error": "binder_folder_contains_first_drafts"}))
        self.assertEqual((await self.client.get(BINDER)).json()["trash"], [])
        moved = await self.act("move-selection", folder_id=None, document_ids=[draft["id"]], document_revisions={draft["id"]: 1})
        self.assertEqual(moved["first_drafts"], [])
        await self.act("trash", item_kind="folder", target_id=parent)
        self.assertEqual((await self.client.get(f"{DRAFTS}/{draft['id']}")).json()["draft"]["body"], draft["body"])

    async def test_first_drafts_placement_rejects_cross_account_targets_and_invalid_flags(self):
        draft = await self.draft("Private early manuscript")
        payload = {"account": OWNER, "operation": "place-draft", "item_kind": "document", "target_id": draft["id"],
                   "target_revision": 1, "folder_id": None, "first_draft": True}
        other = await self.client_for(OTHER)
        denied = await other.post(BINDER, json={**payload, "account": OTHER})
        self.assertEqual((denied.status_code, denied.json()), (404, {"error": "draft_not_found"}))
        for flag in (1, "true", None):
            response = await self.client.post(BINDER, json={**payload, "first_draft": flag})
            self.assertEqual((response.status_code, response.json()), (400, {"error": "binder_invalid"}))
        self.assertEqual((await self.client.get(BINDER)).json()["first_drafts"], [])
