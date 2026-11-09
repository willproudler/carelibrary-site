"""Adapt the reviewed browser catalogue to the desktop's Studio search engine."""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path
import re
from threading import Lock
from urllib.parse import urlencode

from .writing_search import MAX_QUERY_CHARS, DeepSearchIndex, fold, stem, words


MAX_REQUEST_BYTES = 6 * MAX_QUERY_CHARS + 40_000
MAX_DEPTH = 4
MAX_LIMIT = 24
CLASSIC_LIMIT = 48
KINDS = frozenset({"passage", "axiom", "all"})
MODES = frozenset({"classic", "deep", "explore", "wild", "challenge"})
_QUERY_FIELDS = frozenset({"query", "kind", "mode", "work_id", "depth", "exclude", "limit"})
_CHUNK = re.compile(r"(work|lateral)-([0-9a-f]{24})\.json")
_EXACT_ID = re.compile(r"(?:RAW|CH|CL|MC|WB|XR|XS|SC|XA|NUMO)_[\w.:-]+:[\w.:-]+", re.IGNORECASE)
_PHRASE_WORD = re.compile(r"[^\W_]+", re.UNICODE)


class LibrarySearchError(ValueError):
    """The request is valid JSON but does not describe a bounded search."""


def search_options(value):
    if value.keys() - _QUERY_FIELDS:
        raise LibrarySearchError("Invalid Library search.")
    query = value.get("query")
    kind, mode = value.get("kind", "all"), value.get("mode", "classic")
    work_id = value.get("work_id", "")
    depth, limit = value.get("depth", 0), value.get("limit", 8)
    exclude = value.get("exclude", [])
    if (not isinstance(query, str) or len(query) > MAX_QUERY_CHARS
            or not isinstance(kind, str) or kind not in KINDS
            or not isinstance(mode, str) or mode not in MODES
            or not isinstance(work_id, str) or len(work_id) > 256
            or type(depth) is not int or not 0 <= depth <= MAX_DEPTH
            or type(limit) is not int or not 1 <= limit <= (CLASSIC_LIMIT if mode == "classic" else MAX_LIMIT)
            or not isinstance(exclude, list) or len(exclude) > MAX_LIMIT * (MAX_DEPTH + 1)
            or any(not isinstance(identity, str) or not 0 < len(identity) <= 256 for identity in exclude)):
        raise LibrarySearchError("Invalid Library search.")
    for text in (query, work_id, *exclude):
        if any((ord(character) < 32 and character not in "\r\n\t") or 0xD800 <= ord(character) <= 0xDFFF
               for character in text):
            raise LibrarySearchError("Invalid Library search.")
    return query.strip(), kind, mode, work_id.strip(), depth, tuple(dict.fromkeys(exclude)), limit


def _verified_path(root: Path, relative: str) -> Path:
    path = root / relative
    if path.resolve(strict=True) != path or not path.is_file():
        raise ValueError("Invalid Library delivery file.")
    return path


def _delivery_chunk(root, descriptor, kind):
    match = _CHUNK.fullmatch(descriptor.get("name", ""))
    digest = descriptor.get("sha256", "")
    size = descriptor.get("bytes")
    if (not match or match[1] != kind or not isinstance(digest, str)
            or len(digest) != 64 or not digest.startswith(match[2])
            or type(size) is not int or not 0 < size <= 32 * 1024 * 1024):
        raise ValueError("Invalid Library delivery descriptor.")
    path = _verified_path(root, "search/" + match[0])
    if path.stat().st_size != size:
        raise ValueError("Invalid Library delivery size.")
    contents = path.read_bytes()
    if sha256(contents).hexdigest() != digest:
        raise ValueError("Invalid Library delivery fingerprint.")
    return json.loads(contents)


def _iter_work_documents(work):
    # Only the original/source passages and canonical CARE axioms feed the
    # index. Chapter bodies and translated copies would duplicate the evidence.
    for chapter in work["sources"]:
        passages = chapter.get("paragraphs", [])
        for index, (identity, text) in enumerate(passages):
            adjacent = tuple(row[0] for row in passages[max(0, index - 3):index + 4] if row[0] != identity)
            yield "passage", chapter, identity, text, "", adjacent
    for unit in work["units"]:
        for section in unit.get("sections", []):
            for identity, text, linked in section["items"]:
                yield "axiom", unit, identity, text, section.get("name", ""), tuple(linked)


@dataclass(frozen=True, slots=True)
class _Document:
    text: str
    kind: str
    title: str
    unit_id: str
    unit_title: str
    layer: str
    work_id: str
    work_title: str
    slug: str
    author: str
    year: str

    def get(self, key, default=None):
        # The portable index consumes only the record's named text and
        # provenance fields. Keep those shared strings instead of 130k dicts.
        return getattr(self, key, default)

    def target(self, identity, match):
        route = {"book": self.slug, "ref": identity} if self.slug else {"lateral": self.unit_id, "ref": identity}
        return {
            "target_key": identity, "item_id": identity, "kind": self.kind, "href": "#" + urlencode(route),
            "work_id": self.work_id, "work_title": self.work_title, "author": self.author, "year": self.year,
            "unit_id": self.unit_id, "title": self.title, "label": self.layer, "layer": self.layer,
            "metadata": " · ".join(dict.fromkeys(value for value in
                                   (self.work_title, self.unit_title, self.layer, identity) if value)),
            "text": self.text, "search_match": match,
        }


def _document(kind, work, unit, text, section=""):
    return _Document(
        text=text, kind=kind, title=section or unit["title"], unit_id=unit["id"], unit_title=unit["title"],
        layer="SOURCE" if kind == "passage" else unit["layer"],
        work_id=work["id"] if work else "", work_title=work["title"] if work else unit["title"],
        slug=work["slug"] if work else "", author=work.get("author", "") if work else "",
        year=work.get("year", "") if work else "",
    )


def _read_records(root):
    catalogue_path = _verified_path(root, "data/catalogue.json")
    if catalogue_path.stat().st_size > 8 * 1024 * 1024:
        raise ValueError("Invalid Library catalogue size.")
    catalogue = json.loads(catalogue_path.read_bytes())
    projection_path = _verified_path(root, "search/catalogue.json")
    if projection_path.stat().st_size > 64 * 1024:
        raise ValueError("Invalid search catalogue size.")
    assets = json.loads(projection_path.read_bytes())
    headers = {work["id"]: work for work in catalogue["works"]}
    if (assets["version"] != 1 or assets["revision"] != catalogue["public_assets"]["revision"]
            or not 1 <= len(headers) <= 30 or set(headers) != set(assets["works"])):
        raise ValueError("Invalid Library catalogue.")
    records = {"passage": {}, "axiom": {}}
    connections = {}
    total_bytes = 0
    for identity, descriptor in assets["works"].items():
        work = _delivery_chunk(root, descriptor, "work")
        total_bytes += descriptor["bytes"]
        if total_bytes > 64 * 1024 * 1024 or work["id"] != identity or work["slug"] != headers[identity]["slug"]:
            raise ValueError("Invalid Library delivery work.")
        for kind, unit, item_id, item_text, section, neighbors in _iter_work_documents(work):
            if item_text.strip():
                records[kind][item_id] = _document(kind, work, unit, item_text, section)
                if neighbors:
                    connections[item_id] = neighbors
        del work
    if assets.get("lateral"):
        lateral = _delivery_chunk(root, assets["lateral"], "lateral")
        if lateral["id"] != catalogue["lateral"]["id"]:
            raise ValueError("Invalid Library comparison.")
        for section in lateral["sections"]:
            for identity, text, linked in section["items"]:
                records["axiom"][identity] = _document("axiom", None, lateral, text, section.get("name", ""))
                if linked:
                    connections[identity] = tuple(linked)
    return records, connections, frozenset(headers)


def _visible(record, work_id):
    return record is not None and (not work_id or record.work_id == work_id)


def _exact_record(records, query, work_id):
    identity = query if query in records else query.upper()
    record = records.get(identity)
    return (identity, record) if _visible(record, work_id) else None


def _match(label, reason, terms=()):
    return {"label": label, "reason": reason, "terms": list(terms)}


def _classic(index, query, *, work_id, exclude, limit, depth):
    """Prefer literal wording, then the desktop's bounded keyword scan."""
    query = " ".join(query[:12_000].split())
    literal = query.startswith('"') and query.endswith('"') and len(query) > 1
    phrase = fold(query.strip('"'))
    candidates = _PHRASE_WORD.findall(phrase)
    if not candidates or (literal and (len(phrase) > 240 or len(candidates) > 24)):
        return []
    found = []
    excluded = set(exclude)
    # This host constructs the index itself. Its table and registered scope
    # function are fixed by DeepSearchIndex, never selected by a request.
    scope = f" AND {index._scope_function}(item_id) = ?" if work_id else ""
    scoped = (work_id,) if work_id else ()
    mask = " AND item_id NOT IN (" + ",".join("?" for _ in excluded) + ")" if excluded else ""

    def matching(expression, count):
        return index.connection.execute(
            "SELECT item_id FROM documents WHERE documents MATCH ?" + scope + mask
            + " ORDER BY bm25(documents, 0, 1.0, 0.12), item_id LIMIT ?",
            (expression, *scoped, *excluded, count),
        ).fetchall()

    with index.lock:
        if len(phrase) <= 240 and len(candidates) <= 24:
            # Porter finds word-form candidates. Verify the actual phrase in
            # the original published text before calling it a phrase match.
            for identity, in matching('body : "' + " ".join(candidates) + '"', 384):
                if phrase in " ".join(fold(index.records[identity].text).split()):
                    found.append((identity, _match("Shared phrase", "Contains the phrase used in your search.")))
                    if len(found) >= limit:
                        return found
        if literal:
            return found
        terms = sorted(set(words(query)), key=lambda term: (-len(term), term))[:6 if not depth else 12]
        if not terms:
            return found
        ranked = []
        roots = {stem(term) for term in terms}
        selected = {identity for identity, _ in found}
        for rank, (identity,) in enumerate(matching(" OR ".join(f'"{term}"' for term in terms), 384)):
            if identity in selected:
                continue
            tokens = set(words(index.records[identity].text))
            matching_terms = sorted(tokens.intersection(terms))
            if depth >= 2:
                matching_terms = sorted(term for term in tokens if stem(term) in roots)
            shared = len(set(map(stem, matching_terms)))
            if shared >= (1 if depth >= 2 or len(terms) == 1 else 2):
                ranked.append((-shared, rank, identity, matching_terms))
        for _, _, identity, matched in sorted(ranked)[:limit - len(found)]:
            found.append((identity, _match("Shared wording", "Matches " + ", ".join(matched[:5]) + ".", matched[:10])))
    return found


class PublishedLibrarySearch:
    def __init__(self, web_root):
        self.root = web_root
        self.lock = Lock()
        self.catalogue = None
        self.indexes = {}

    def _index(self, kind):
        with self.lock:
            if self.catalogue is None:
                self.catalogue = _read_records(self.root)
            if kind not in self.indexes:
                self.indexes[kind] = DeepSearchIndex(self.catalogue[0][kind], text_key="text",
                    metadata_keys=("work_title", "unit_title", "author"), unit_key="unit_id")
            return self.indexes[kind]

    def reference(self, kind, identity):
        """Resolve a saved citation by exact identity in the reviewed catalogue."""
        if kind not in {"passage", "axiom"}:
            return None
        with self.lock:
            if self.catalogue is None:
                self.catalogue = _read_records(self.root)
            record = self.catalogue[0][kind].get(identity)
        if record is None:
            return None
        return {**record.target(identity, {}), "unit_title": record.unit_title}

    def search(self, options):
        query, kind, mode, work_id, depth, exclude, limit = options
        if not query:
            return {"results": [], "more": False}
        indexes = {target: self._index(target) for target in ("passage", "axiom") if kind in (target, "all")}
        _, connections, work_ids = self.catalogue
        if work_id and work_id not in work_ids:
            raise LibrarySearchError("Choose a book in the published Library.")
        excluded = set(exclude)
        quoted = query.startswith('"') and query.endswith('"') and len(query) > 1
        lookup = query.strip('"')
        exact = next((record for index in indexes.values()
                      if (record := _exact_record(index.records, lookup, work_id))), None)
        if exact and not depth and exact[0] not in excluded:
            return {"results": [exact[1].target(exact[0], _match("Exact ID", "Matches this published reading ID."))],
                    "more": not quoted}
        if not exact and _EXACT_ID.fullmatch(lookup):
            return {"results": [], "more": False}
        if exact and exact[0] not in excluded:
            exclude = (*exclude, exact[0])
        lists = []
        for target_kind, index in indexes.items():
            if exact and exact[1].kind != target_kind:
                continue
            if quoted or mode == "classic":
                if exact:
                    ids = [identity for identity in connections.get(exact[0], ())
                           if identity not in exclude and _visible(index.records.get(identity), work_id)]
                    matches = [(identity, _match("Recorded connection", f"Linked in CARE to {exact[0]}."))
                               for identity in ids[:limit]]
                else:
                    matches = _classic(index, query, work_id=work_id, exclude=exclude, limit=limit, depth=depth)
            else:
                matches = index.search(
                    lookup, mode=mode, scope="work" if work_id else "library", work_id=work_id,
                    limit=limit, depth=depth, previous=tuple({"item_id": identity} for identity in exclude),
                    neighbors=lambda identity: connections.get(identity, ()),
                )
            lists.append([index.records[identity].target(identity, match) for identity, match in matches])
        # Mixed Spotlight searches balance the two reading types, while Studio
        # searches one type and keeps the native engine's full ranking.
        results = [rows[position] for position in range(limit)
                   for rows in lists if position < len(rows)][:limit]
        return {"results": results, "more": depth < MAX_DEPTH and (not quoted or len(results) == limit)}
