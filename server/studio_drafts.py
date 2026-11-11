"""Private Studio documents scoped to the active Library account."""
from __future__ import annotations

from dataclasses import dataclass, field
from html import escape
from html.parser import HTMLParser
import json
import re
import time
from urllib.parse import urlsplit
from uuid import NAMESPACE_URL, uuid4, uuid5


MAX_DRAFTS = 50
MAX_TITLE = 160
MAX_RICH_TITLE = 300
MAX_BODY_BYTES = 256 * 1024
MAX_REQUEST_BYTES = 6 * MAX_BODY_BYTES + 4096  # Allow JSON Unicode escapes.
MAX_REVISION = 2**53 - 1
DRAFT_ID = re.compile(r"[0-9a-f]{32}")
ANCHOR_ID = re.compile(r"[A-Za-z0-9_-]{1,100}")
BLOCK_TAGS = frozenset("p div h1 h2 h3 h4 h5 h6 blockquote pre ul ol hr table".split())
ALLOWED_TAGS = BLOCK_TAGS | frozenset(
    "a b br code del em i li mark s span strike strong sub sup u tbody td th thead tr".split())
DROP_TAGS = frozenset(
    "applet base button embed frame frameset iframe img input link math meta noscript object plaintext "
    "script select style svg template textarea xmp".split())
VOID_TAGS = frozenset("base br embed frame hr img input link meta".split())
FONT_FAMILIES = frozenset({
    "Iowan Old Style", "Georgia", "Palatino", "Times New Roman", "Helvetica", "Arial", "Menlo",
    "var(--serif, Georgia)",
})
DEFAULT_FONT_SIZE = "var(--writing-default-size, 12pt)"
MAX_FOOTNOTES = 250


class StudioDraftError(Exception):
    def __init__(self, code, status):
        super().__init__(code)
        self.code, self.status = code, status


def _style(value, block):
    declarations = {}
    for declaration in value.split(";"):
        key, colon, setting = declaration.partition(":")
        if colon:
            declarations[key.strip().lower()] = setting.strip()
    styles = []
    alignment = declarations.get("text-align", "")
    if block and alignment in {"left", "right", "center", "justify"}:
        styles.append(f"text-align: {alignment}")
    family = declarations.get("font-family", "")
    if len(family) >= 2 and family[0] in {"'", '"'} and family[0] == family[-1]:
        family = family[1:-1]
    if family in FONT_FAMILIES:
        styles.append(f"font-family: {family}")
    size = declarations.get("font-size", "")
    points = re.fullmatch(r"([0-9]{1,2})pt", size)
    if size == DEFAULT_FONT_SIZE or points and 8 <= int(points[1]) <= 72:
        styles.append(f"font-size: {size}")
    for key, allowed in (("font-weight", {"normal", "bold", "400", "500", "600", "700", "800", "900"}),
                         ("font-style", {"normal", "italic"}), ("text-decoration-line", {"none", "underline"})):
        if declarations.get(key) in allowed:
            styles.append(f"{key}: {declarations[key]}")
    return "; ".join(styles)


def _paragraph_styles(value):
    if not isinstance(value, str) or len(value) > 4096:
        return ""
    try:
        definitions = json.loads(value)
    except (ValueError, RecursionError):
        return ""
    if not isinstance(definitions, dict) or not definitions or not set(definitions) <= {"p", "h1", "h2", "h3", "h4", "h5", "h6"}:
        return ""
    fields = {"font", "size", "bold", "italic", "underline", "align"}
    result = {}
    for tag, style in definitions.items():
        if not isinstance(style, dict) or not fields <= set(style) or not set(style) <= fields | {"weight"}:
            return ""
        font, size = style["font"], style["size"]
        if not isinstance(font, str) or font not in (FONT_FAMILIES - {"var(--serif, Georgia)"}) | {"default"}:
            return ""
        if not isinstance(size, str) or (size != "default" and not (size.isascii() and size.isdecimal() and str(int(size)) == size and 8 <= int(size) <= 72)):
            return ""
        if any(type(style[key]) is not bool for key in ("bold", "italic", "underline")):
            return ""
        if "weight" in style and (not isinstance(style["weight"], str) or style["weight"] not in {"400", "500", "600", "700", "800", "900"}):
            return ""
        if not isinstance(style["align"], str) or style["align"] not in {"left", "center", "right", "justify"}:
            return ""
        result[tag] = {key: style[key] for key in ("font", "size", "bold", "italic", "underline", "align")}
        if "weight" in style:
            result[tag]["weight"] = style["weight"]
    return json.dumps(result, ensure_ascii=True, separators=(",", ":"), sort_keys=True)


def _safe_href(value):
    if not value or any(char.isspace() or ord(char) < 32 or 127 <= ord(char) <= 159 or char == "\\" for char in value):
        return ""
    try:
        url = urlsplit(value)
        if url.scheme in {"http", "https"} and url.hostname and url.username is None and url.password is None:
            return value
        if url.scheme == "mailto" and url.path and not url.netloc:
            return value
    except ValueError:
        pass
    return ""


@dataclass
class _Markup:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)

    def render(self):
        attrs = "".join(f' {key}="{escape(value, quote=True)}"' for key, value in self.attrs.items())
        start = f"<{self.tag}{attrs}>"
        if self.tag in VOID_TAGS:
            return start
        children = "".join(child.render() if isinstance(child, _Markup) else escape(child, quote=False)
                           for child in self.children)
        return f"{start}{children}</{self.tag}>"


class _StudioMarkupParser(HTMLParser):
    """Rebuild desktop's text-only tag and attribute allowlist in the web service."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = _Markup("")
        self.stack = [self.root]
        self.dropped = []

    def _start(self, tag, attrs, closed=False):
        if tag in DROP_TAGS:
            if not closed and tag not in VOID_TAGS:
                if len(self.dropped) >= 128:
                    raise StudioDraftError("invalid_draft", 400)
                self.dropped.append(tag)
            return
        if self.dropped or tag not in ALLOWED_TAGS:
            return
        source = {key: value or "" for key, value in attrs}
        result = {}
        block = tag in BLOCK_TAGS
        block_id = source.get("data-block-id", "")
        if block and len(self.stack) == 1 and ANCHOR_ID.fullmatch(block_id):
            result["data-block-id"] = block_id
        if block and len(self.stack) == 1 and (definitions := _paragraph_styles(source.get("data-writing-styles"))):
            result["data-writing-styles"] = definitions
        if block or tag == "span":
            style = _style(source.get("style", ""), block)
            if style:
                result["style"] = style
        if tag == "a":
            href = _safe_href(source.get("href", ""))
            if href:
                result.update(href=href, rel="noopener noreferrer")
        if tag in {"td", "th"}:
            for name in ("colspan", "rowspan"):
                value = source.get(name, "")
                if re.fullmatch(r"[1-9][0-9]{0,2}", value):
                    result[name] = value
        if tag == "ol" and re.fullmatch(r"-?[0-9]{1,8}", source.get("start", "")):
            result["start"] = source["start"]
        node = _Markup(tag, result)
        self.stack[-1].children.append(node)
        if not closed and tag not in VOID_TAGS:
            if len(self.stack) >= 128:
                raise StudioDraftError("invalid_draft", 400)
            self.stack.append(node)

    def handle_starttag(self, tag, attrs):
        self._start(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self._start(tag, attrs, closed=True)

    def handle_endtag(self, tag):
        if self.dropped:
            if tag == self.dropped[-1]:
                self.dropped.pop()
            return
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if not self.dropped:
            self.stack[-1].children.append(data)


def _studio_html(body):
    parser = _StudioMarkupParser()
    try:
        parser.feed(body)
        parser.close()
    except (AssertionError, ValueError):
        raise StudioDraftError("invalid_draft", 400) from None
    blocks = []
    paragraph = None
    for node in parser.root.children:
        if isinstance(node, _Markup) and node.tag in BLOCK_TAGS:
            blocks.append(node)
            paragraph = None
        elif paragraph is not None or not isinstance(node, str) or node.strip():
            if paragraph is None:
                paragraph = _Markup("p")
                blocks.append(paragraph)
            paragraph.children.append(node)
    if not blocks:
        blocks = [_Markup("p", children=[_Markup("br")])]

    reserved = {node.attrs.get("data-block-id") for node in blocks}
    seen = set()
    for index, node in enumerate(blocks):
        if index:
            node.attrs.pop("data-writing-styles", None)
        identity = node.attrs.get("data-block-id")
        if not identity or identity in seen:
            identity = uuid5(NAMESPACE_URL, f"care-beta-studio:{index}:{node.render()}").hex
            while identity in reserved or identity in seen:
                identity = uuid5(NAMESPACE_URL, identity).hex
            node.attrs["data-block-id"] = identity
        seen.add(identity)
    return "".join(node.render() for node in blocks), seen


def _unsupported_control(text):
    return any((ord(char) < 32 and char not in "\t\r\n") or 127 <= ord(char) <= 159 for char in text)


def _footnotes_json(footnotes, anchors):
    if not isinstance(footnotes, list) or len(footnotes) > MAX_FOOTNOTES:
        raise StudioDraftError("invalid_draft", 400)
    fields = {"id", "block_id", "marker_offset", "marker_order", "note"}
    identities = set()
    for footnote in footnotes:
        if not isinstance(footnote, dict) or not fields <= footnote.keys() <= fields | {"source"}:
            raise StudioDraftError("invalid_draft", 400)
        identity, block_id, note = footnote["id"], footnote["block_id"], footnote["note"]
        if (not isinstance(identity, str) or not ANCHOR_ID.fullmatch(identity) or identity in identities
                or not isinstance(block_id, str) or block_id not in anchors or not isinstance(note, str)
                or len(note) > 20_000 or _unsupported_control(note)):
            raise StudioDraftError("invalid_draft", 400)
        for key in ("marker_offset", "marker_order"):
            if type(footnote[key]) is not int or not 0 <= footnote[key] <= MAX_BODY_BYTES * 2:
                raise StudioDraftError("invalid_draft", 400)
        if "source" in footnote:
            _source_claim(footnote["source"])
        identities.add(identity)
    return json.dumps(footnotes, ensure_ascii=False, separators=(",", ":"))


def _source_claim(source):
    fields = {"kind", "item_id"}
    if not isinstance(source, dict) or not fields <= source.keys() <= fields | {"quote"}:
        raise StudioDraftError("invalid_draft", 400)
    kind, identity = source["kind"], source["item_id"]
    if (kind not in ("axiom", "passage") or not isinstance(identity, str)
            or not 0 < len(identity) <= 300 or any(char.isspace() for char in identity)
            or _unsupported_control(identity)):
        raise StudioDraftError("invalid_draft", 400)
    if "quote" in source:
        quote = source["quote"]
        if (kind != "passage" or not isinstance(quote, str) or not 0 < len(quote) <= 20_000
                or not quote.strip() or _unsupported_control(quote)):
            raise StudioDraftError("invalid_draft", 400)


def _same_source_claim(claim, saved):
    return saved and all(claim.get(key) == saved.get(key) for key in ("kind", "item_id", "quote"))


def _snapshot_source(claim, resolve_source):
    try:
        source = resolve_source(claim["kind"], claim["item_id"]) if resolve_source else None
    except (OSError, ValueError, KeyError, TypeError):
        raise StudioDraftError("source_unavailable", 503) from None
    if not source:
        raise StudioDraftError("source_not_published", 400)
    quote = claim.get("quote")
    if quote and " ".join(quote.split()) not in " ".join(source["text"].split()):
        raise StudioDraftError("source_quote_changed", 400)
    keys = ("kind", "item_id", "work_id", "work_title", "author", "year", "title", "unit_id", "unit_title", "href", "layer")
    saved = {key: source[key] for key in keys}
    # Preserve the exact identity and route. An excerpt is enough for the
    # citation display and keeps the draft-size quota useful for long sources.
    text = source["text"]
    saved["text"] = text if len(text) <= 6000 else text[:6000].rstrip() + "…"
    if quote:
        saved["quote"] = quote
    return saved


@dataclass(frozen=True)
class DraftContent:
    title: str
    body: str
    document_format: str
    footnotes: str | None
    anchors: set

    def stored_footnotes(self, previous="[]", resolve_source=None):
        notes = self.footnotes
        if notes is None:
            notes = previous
            if any(note["block_id"] not in self.anchors for note in json.loads(notes)):
                raise StudioDraftError("invalid_draft", 400)
        else:
            pending = json.loads(notes)
            if any("source" in note for note in pending):
                saved_sources = {note["id"]: note["source"] for note in json.loads(previous) if "source" in note}
                for note in pending:
                    if "source" not in note:
                        continue
                    claim = note["source"]
                    saved = saved_sources.get(note["id"])
                    note["source"] = saved if _same_source_claim(claim, saved) else _snapshot_source(claim, resolve_source)
                notes = json.dumps(pending, ensure_ascii=False, separators=(",", ":"))
        return self.checked_footnote_size(notes)

    def checked_footnote_size(self, notes):
        try:
            size = len(self.body.encode("utf-8")) + (len(notes.encode("utf-8")) if notes != "[]" else 0)
        except UnicodeEncodeError:
            raise StudioDraftError("invalid_draft", 400) from None
        if size > MAX_BODY_BYTES:
            raise StudioDraftError("draft_too_large", 413)
        return notes


def draft_content(title, body, document_format="text", footnotes=None):
    if (not isinstance(title, str) or not isinstance(body, str) or document_format not in ("text", "html")
            or document_format == "text" and footnotes is not None):
        raise StudioDraftError("invalid_draft", 400)
    title_limit = MAX_RICH_TITLE if document_format == "html" else MAX_TITLE
    if len(title) > title_limit or len(body) > MAX_BODY_BYTES:
        raise StudioDraftError("draft_too_large", 413)
    try:
        title.encode("utf-8")
        body_size = len(body.encode("utf-8"))
    except UnicodeEncodeError:
        raise StudioDraftError("invalid_draft", 400) from None
    if body_size > MAX_BODY_BYTES:
        raise StudioDraftError("draft_too_large", 413)
    if any(ord(char) < 32 or 127 <= ord(char) <= 159 or char in "\u2028\u2029" for char in title) or _unsupported_control(body):
        raise StudioDraftError("invalid_draft", 400)
    anchors = set()
    if document_format == "html":
        body, anchors = _studio_html(body)
    encoded_notes = _footnotes_json(footnotes, anchors) if footnotes is not None else None
    result = DraftContent(title.strip() or "Untitled", body, document_format, encoded_notes, anchors)
    result.checked_footnote_size(encoded_notes or "[]")
    return result


class StudioDraftStore:
    def __init__(self, auth, *, resolve_source=None):
        self.auth = auth
        self.resolve_source = resolve_source
        with auth.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("""
                CREATE TABLE IF NOT EXISTS studio_folders (
                    id TEXT PRIMARY KEY,
                    owner TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    name_key TEXT NOT NULL,
                    parent_id TEXT REFERENCES studio_folders(id),
                    trash_root TEXT,
                    trashed_at REAL
                )
            """)
            db.execute("""CREATE UNIQUE INDEX IF NOT EXISTS studio_active_folder_names
                ON studio_folders(owner, coalesce(parent_id, ''), name_key) WHERE trash_root IS NULL""")
            db.execute("""
                CREATE TABLE IF NOT EXISTS studio_drafts (
                    id TEXT PRIMARY KEY,
                    owner TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    body TEXT NOT NULL,
                    revision INTEGER NOT NULL CHECK (revision >= 1),
                    updated_at REAL NOT NULL,
                    document_format TEXT NOT NULL DEFAULT 'text' CHECK (document_format IN ('text', 'html')),
                    footnotes TEXT NOT NULL DEFAULT '[]'
                )
            """)
            columns = {row["name"] for row in db.execute("PRAGMA table_info(studio_drafts)")}
            if "document_format" not in columns:
                db.execute("""ALTER TABLE studio_drafts ADD COLUMN document_format TEXT NOT NULL DEFAULT 'text'
                    CHECK (document_format IN ('text', 'html'))""")
            if "footnotes" not in columns:
                db.execute("ALTER TABLE studio_drafts ADD COLUMN footnotes TEXT NOT NULL DEFAULT '[]'")
            if "folder_id" not in columns:
                db.execute("ALTER TABLE studio_drafts ADD COLUMN folder_id TEXT REFERENCES studio_folders(id)")
            if "trash_root" not in columns:
                db.execute("ALTER TABLE studio_drafts ADD COLUMN trash_root TEXT")
            if "trashed_at" not in columns:
                db.execute("ALTER TABLE studio_drafts ADD COLUMN trashed_at REAL")
            db.execute("""CREATE INDEX IF NOT EXISTS studio_drafts_owner_updated
                ON studio_drafts(owner, updated_at DESC)""")

    def _owner(self, db, token, expected_account):
        user = self.auth.session(token, connection=db)
        if not user:
            raise StudioDraftError("login_required", 401)
        if expected_account is not None and user["email"] != expected_account:
            raise StudioDraftError("account_changed", 403)
        return user["email"]

    @staticmethod
    def _draft(db, owner, draft_id):
        row = db.execute("""SELECT id,title,body,revision,updated_at,document_format,footnotes FROM studio_drafts
            WHERE owner=? AND id=? AND trash_root IS NULL""", (owner, draft_id)).fetchone()
        if not row:
            raise StudioDraftError("draft_not_found", 404)
        draft = dict(row)
        document_format, footnotes = draft.pop("document_format"), draft.pop("footnotes")
        if document_format == "html":
            draft.update(format=document_format, footnotes=json.loads(footnotes))
        return draft

    @staticmethod
    def _folder(db, owner, folder_id):
        row = db.execute("""SELECT id,name,parent_id FROM studio_folders
            WHERE owner=? AND id=? AND trash_root IS NULL""", (owner, folder_id)).fetchone()
        if not row:
            raise StudioDraftError("binder_folder_not_found", 404)
        return row

    def read(self, token, expected_account=None, draft_id=None):
        with self.auth.connect(readonly=True) as db:
            db.execute("BEGIN")
            owner = self._owner(db, token, expected_account)
            if draft_id is not None:
                return {"draft": self._draft(db, owner, draft_id)}
            rows = db.execute("""SELECT id,title,revision,updated_at FROM studio_drafts
                WHERE owner=? AND trash_root IS NULL ORDER BY updated_at DESC, id""", (owner,))
            return {"drafts": [dict(row) for row in rows]}

    def create(self, token, expected_account, content, folder_id=None):
        with self.auth.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            owner = self._owner(db, token, expected_account)
            if folder_id is not None:
                if not isinstance(folder_id, str) or not DRAFT_ID.fullmatch(folder_id):
                    raise StudioDraftError("binder_invalid", 400)
                self._folder(db, owner, folder_id)
            if db.execute("SELECT COUNT(*) FROM studio_drafts WHERE owner=?", (owner,)).fetchone()[0] >= MAX_DRAFTS:
                raise StudioDraftError("draft_limit", 409)
            draft_id, updated_at = uuid4().hex, time.time()
            db.execute("""INSERT INTO studio_drafts(id,owner,title,body,revision,updated_at,document_format,footnotes,folder_id)
                VALUES (?,?,?,?,1,?,?,?,?)""", (draft_id, owner, content.title, content.body, updated_at,
                                             content.document_format, content.stored_footnotes(resolve_source=self.resolve_source), folder_id))
            return {"draft": self._draft(db, owner, draft_id)}

    def update(self, token, expected_account, draft_id, revision, content):
        with self.auth.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            owner = self._owner(db, token, expected_account)
            current = db.execute("""SELECT revision,document_format,footnotes FROM studio_drafts
                WHERE owner=? AND id=? AND trash_root IS NULL""", (owner, draft_id)).fetchone()
            if not current:
                raise StudioDraftError("draft_not_found", 404)
            if current["revision"] != revision or revision >= MAX_REVISION:
                raise StudioDraftError("draft_conflict", 409)
            if current["document_format"] == "html" and content.document_format != "html":
                raise StudioDraftError("draft_format_required", 409)
            footnotes = content.stored_footnotes(current["footnotes"], self.resolve_source)
            db.execute("""UPDATE studio_drafts SET title=?,body=?,revision=revision+1,updated_at=?,
                document_format=?,footnotes=? WHERE owner=? AND id=? AND revision=?""",
                (content.title, content.body, time.time(), content.document_format, footnotes, owner, draft_id, revision))
            return {"draft": self._draft(db, owner, draft_id)}

    def delete(self, token, expected_account, draft_id, revision):
        with self.auth.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            owner = self._owner(db, token, expected_account)
            changed = db.execute("DELETE FROM studio_drafts WHERE owner=? AND id=? AND revision=? AND trash_root IS NULL",
                                 (owner, draft_id, revision)).rowcount
            if not changed:
                self._draft(db, owner, draft_id)
                raise StudioDraftError("draft_conflict", 409)
            return {"deleted": True}
