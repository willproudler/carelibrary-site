"""Account-scoped folders and reading copies for the desktop Studio Binder."""
from __future__ import annotations

from html import escape
import json
import sqlite3
import time
from uuid import uuid4

from .studio_drafts import DRAFT_ID, MAX_DRAFTS, MAX_REVISION, StudioDraftError, _studio_html, draft_content


MAX_REQUEST_BYTES = 8 * 1024
MAX_FOLDERS = 100
MAX_PREVIEW_BYTES = 768 * 1024

_OPERATIONS = {
    "create-folder": {"folder_name", "folder_id"},
    "folder-from-selection": {"folder_name", "folder_id", "document_ids", "document_revisions"},
    "move-selection": {"folder_id", "document_ids", "document_revisions"},
    "move": {"item_kind", "target_id", "target_revision", "folder_id"},
    "rename": {"item_kind", "target_id", "target_revision", "name"},
    "trash": {"item_kind", "target_id", "target_revision"},
    "restore": {"item_kind", "target_id"},
    "read": {"document_ids"},
}

_SUBTREE = """
    WITH RECURSIVE subtree(id) AS (
        SELECT id FROM studio_folders WHERE owner=:owner AND id=:id AND trash_root IS NULL
        UNION
        SELECT child.id FROM studio_folders child JOIN subtree ON child.parent_id=subtree.id
        WHERE child.owner=:owner AND child.trash_root IS NULL
    )
"""


def _invalid():
    return StudioDraftError("binder_invalid", 400)


def _identity(value):
    if not isinstance(value, str) or not DRAFT_ID.fullmatch(value):
        raise _invalid()
    return value


def _folder_name(value):
    if not isinstance(value, str):
        raise _invalid()
    value = value.strip()
    if not 1 <= len(value) <= 120 or any(
        ord(char) < 32 or 127 <= ord(char) <= 159 or char in "\u2028\u2029"
        or 0xD800 <= ord(char) <= 0xDFFF for char in value
    ):
        raise _invalid()
    return value


def _selected(payload):
    identities = payload.get("document_ids")
    if not isinstance(identities, list) or not 1 <= len(identities) <= MAX_DRAFTS:
        raise _invalid()
    for identity in identities:
        _identity(identity)
    if len(set(identities)) != len(identities):
        raise _invalid()
    return identities


def _snapshot(db, owner, ack=None):
    folders = db.execute("""SELECT id,name,parent_id FROM studio_folders
        WHERE owner=? AND trash_root IS NULL ORDER BY name_key,id""", (owner,))
    docs = [dict(row) for row in db.execute("""SELECT id,title,revision,updated_at,folder_id FROM studio_drafts
        WHERE owner=? AND trash_root IS NULL ORDER BY updated_at DESC,id""", (owner,))]
    trash = db.execute("""SELECT id,title,'document' AS kind,trashed_at FROM studio_drafts
        WHERE owner=? AND trash_root='document:' || id
        UNION ALL
        SELECT id,name AS title,'folder' AS kind,trashed_at FROM studio_folders
        WHERE owner=? AND trash_root='folder:' || id ORDER BY trashed_at DESC,id""", (owner, owner))
    locations = {draft["id"]: draft.pop("folder_id") for draft in docs}
    return {"folders": [dict(folder) for folder in folders], "locations": locations,
            "trash": [dict(item) for item in trash], "drafts": docs, "ack": ack or {}}


def _require_draft_revision(db, owner, identity, revision):
    if type(revision) is not int or not 1 <= revision < MAX_REVISION:
        raise _invalid()
    draft = db.execute("""SELECT id,title,revision,document_format FROM studio_drafts
        WHERE owner=? AND id=? AND trash_root IS NULL""", (owner, identity)).fetchone()
    if draft is None:
        raise StudioDraftError("draft_not_found", 404)
    if draft["revision"] != revision:
        raise StudioDraftError("draft_conflict", 409)
    return draft


def _create_folder(db, owner, name, parent_id):
    if db.execute("SELECT count(*) FROM studio_folders WHERE owner=?", (owner,)).fetchone()[0] >= MAX_FOLDERS:
        raise StudioDraftError("binder_folder_limit", 409)
    identity = uuid4().hex
    db.execute("INSERT INTO studio_folders(id,owner,name,name_key,parent_id) VALUES (?,?,?,?,?)",
               (identity, owner, name, name.casefold(), parent_id))
    return identity


def _reading_copy(db, owner, identities, draft_store):
    fragments = []
    size = 0
    for identity in identities:
        draft = draft_store._draft(db, owner, identity)
        body = draft["body"]
        if draft.get("format") == "html":
            body = _studio_html(body)[0]
        else:
            body = "<p>" + escape(body) + "</p>"
        footnotes = []
        for note in draft.get("footnotes", ()):
            source = note.get("source") or {}
            citation = ", ".join(source[key] for key in ("author", "work_title", "item_id") if source.get(key))
            text = " · ".join(filter(None, (citation, note.get("note"))))
            if text:
                footnotes.append(f"<li>{escape(text)}</li>")
        notes = "<h2>Footnotes</h2><ol>" + "".join(footnotes) + "</ol>" if footnotes else ""
        fragment = f"<h1>{escape(draft['title'])}</h1>{body}{notes}"
        size += len(fragment.encode("utf-8"))
        if size > MAX_PREVIEW_BYTES:
            raise StudioDraftError("binder_preview_too_large", 413)
        fragments.append(fragment)
    return {"binder_preview": {"html": "".join(fragments), "count": len(fragments)}}


def _move_selection(db, owner, payload, operation, folder_id):
    identities = _selected(payload)
    versions = payload.get("document_revisions")
    if not isinstance(versions, dict) or set(versions) != set(identities):
        raise _invalid()
    for identity in identities:
        _require_draft_revision(db, owner, identity, versions[identity])
    ack = {}
    if operation == "folder-from-selection":
        folder_id = _create_folder(db, owner, _folder_name(payload.get("folder_name")), folder_id)
        ack["binder_folder"] = folder_id
    db.executemany("UPDATE studio_drafts SET folder_id=? WHERE owner=? AND id=?",
                   [(folder_id, owner, identity) for identity in identities])
    return ack


def _trash(db, owner, identity, kind, root):
    stamp = time.time()
    if kind == "document":
        db.execute("""UPDATE studio_drafts SET trash_root=?,trashed_at=?,revision=revision+1
            WHERE owner=? AND id=?""", (root, stamp, owner, identity))
        return
    params = {"owner": owner, "id": identity, "root": root, "date": stamp, "max_revision": MAX_REVISION}
    db.execute(_SUBTREE + """
        UPDATE studio_drafts SET trash_root=:root,trashed_at=:date,revision=min(revision+1,:max_revision)
        WHERE owner=:owner AND trash_root IS NULL AND folder_id IN (SELECT id FROM subtree)
    """, params)
    db.execute(_SUBTREE + """
        UPDATE studio_folders SET trash_root=:root,trashed_at=:date
        WHERE owner=:owner AND id IN (SELECT id FROM subtree)
    """, params)


def _restore(db, owner, identity, kind, root):
    table, location = ("studio_folders", "parent_id") if kind == "folder" else ("studio_drafts", "folder_id")
    fields = "parent_id,name" if kind == "folder" else "folder_id"
    row = db.execute(f"SELECT {fields} FROM {table} WHERE owner=? AND id=? AND trash_root=?",
                     (owner, identity, root)).fetchone()
    if row is None:
        raise StudioDraftError("binder_trash_not_found", 404)
    parent = db.execute("""SELECT id FROM studio_folders WHERE owner=? AND id=? AND trash_root IS NULL""",
                        (owner, row[location])).fetchone()
    parent_id = parent["id"] if parent else None
    if kind == "folder":
        taken = {sibling[0] for sibling in db.execute("""SELECT name_key FROM studio_folders
            WHERE owner=? AND parent_id IS ? AND trash_root IS NULL""", (owner, parent_id))}
        name = base = row["name"]
        number = 2
        while name.casefold() in taken:
            suffix = f" ({number})"
            name = base[:120 - len(suffix)].rstrip() + suffix
            number += 1
        db.execute("UPDATE studio_folders SET name=?,name_key=?,parent_id=? WHERE owner=? AND id=?",
                   (name, name.casefold(), parent_id, owner, identity))
        db.execute("UPDATE studio_folders SET trash_root=NULL,trashed_at=NULL WHERE owner=? AND trash_root=?",
                   (owner, root))
    else:
        db.execute("UPDATE studio_drafts SET folder_id=? WHERE owner=? AND id=?", (parent_id, owner, identity))
    db.execute("UPDATE studio_drafts SET trash_root=NULL,trashed_at=NULL WHERE owner=? AND trash_root=?",
               (owner, root))


class StudioBinderStore:
    def __init__(self, drafts):
        self.drafts = drafts
        self.auth = drafts.auth

    def read(self, token, expected_account):
        with self.auth.connect(readonly=True) as db:
            db.execute("BEGIN")
            owner = self.drafts._owner(db, token, expected_account)
            return _snapshot(db, owner)

    def mutate(self, token, expected_account, payload):
        operation = payload.get("operation")
        if not isinstance(operation, str) or operation not in _OPERATIONS or set(payload) - _OPERATIONS[operation] - {"operation"}:
            raise _invalid()
        with self.auth.connect(readonly=operation == "read") as db:
            db.execute("BEGIN" if operation == "read" else "BEGIN IMMEDIATE")
            owner = self.drafts._owner(db, token, expected_account)
            if operation == "read":
                ack = _reading_copy(db, owner, _selected(payload), self.drafts)
            else:
                try:
                    ack = self._mutate(db, owner, operation, payload)
                except sqlite3.IntegrityError as error:
                    if "studio_active_folder_names" not in str(error):
                        raise
                    raise StudioDraftError("binder_name_taken", 409) from None
            return _snapshot(db, owner, ack)

    def _mutate(self, db, owner, operation, payload):
        if operation in {"move", "move-selection"} and "folder_id" not in payload:
            raise _invalid()
        folder_id = payload.get("folder_id")
        if folder_id is not None:
            self.drafts._folder(db, owner, _identity(folder_id))
        if operation == "create-folder":
            return {"binder_folder": _create_folder(db, owner, _folder_name(payload.get("folder_name")), folder_id)}
        if operation in {"folder-from-selection", "move-selection"}:
            return _move_selection(db, owner, payload, operation, folder_id)

        identity = _identity(payload.get("target_id"))
        kind = payload.get("item_kind")
        if kind not in ("document", "folder"):
            raise _invalid()
        root = f"{kind}:{identity}"
        if operation == "restore":
            _restore(db, owner, identity, kind, root)
            return {}
        if kind == "folder":
            item = self.drafts._folder(db, owner, identity)
        else:
            item = _require_draft_revision(db, owner, identity, payload.get("target_revision"))
        if operation == "trash":
            _trash(db, owner, identity, kind, root)
        elif operation == "move" and kind == "folder":
            cycle = db.execute(_SUBTREE + "SELECT 1 FROM subtree WHERE id=:parent",
                               {"owner": owner, "id": identity, "parent": folder_id}).fetchone()
            if cycle:
                raise StudioDraftError("binder_cycle", 409)
            db.execute("UPDATE studio_folders SET parent_id=? WHERE owner=? AND id=?", (folder_id, owner, identity))
        elif operation == "move":
            db.execute("UPDATE studio_drafts SET folder_id=? WHERE owner=? AND id=?", (folder_id, owner, identity))
        elif kind == "folder":
            name = _folder_name(payload.get("name"))
            db.execute("UPDATE studio_folders SET name=?,name_key=? WHERE owner=? AND id=?",
                       (name, name.casefold(), owner, identity))
            return {"binder_renamed": True}
        else:
            name = payload.get("name")
            if not isinstance(name, str) or not name.strip():
                raise _invalid()
            title = draft_content(name, "", item["document_format"]).title
            revision = item["revision"]
            if item["title"] != title:
                revision += 1
                db.execute("UPDATE studio_drafts SET title=?,revision=?,updated_at=? WHERE owner=? AND id=?",
                           (title, revision, time.time(), owner, identity))
            return {"binder_renamed": True, "binder_title": title, "revision": revision}
        return {}
