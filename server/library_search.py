"""Adapt the reviewed browser catalogue to the desktop's Studio search engine."""
from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from functools import lru_cache
from hashlib import sha256
import json
from math import isqrt
from pathlib import Path
import re
from threading import Lock
from unicodedata import normalize
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

AQ_PAGE_SIZE = 24
AQ_MAX_OFFSET = 4_800
_AQ_KINDS = {"all", "text", "word", "phrase", "sentence", "title", "research"}
_AQ_SORTS = {"variety", "alphabetical", "source", "shortest", "longest"}
_AQ_FIELDS = {"total", "match_kind", "sort", "offset", "id"}
_AQ_ID = re.compile(r"AQPUB_[0-9a-f]{24}")
_AQ_SYMBOLS = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
_AQ_VALUES = bytes.maketrans(_AQ_SYMBOLS, bytes(range(len(_AQ_SYMBOLS))))
_AQ_NON_SYMBOL = re.compile(r"[^A-Z0-9]+")
_AQ_HAS_LETTERS = re.compile(r"[A-Z]")
_AQ_WORD = re.compile(r"[^\W_]+(?:['’][^\W_]+)*", re.UNICODE)
_AQ_PARAGRAPH = re.compile(r"\S(?:.*?\S)?(?=\n[ \t]*\n|\Z)", re.DOTALL)
_AQ_SENTENCE_END = re.compile(r"[.!?][\"'’”)\]}]*(?=\s|$)")
_AQ_MAX_RECORDS = 600_000
_AQ_MAX_MATCH_CHARS = 16_384
_AQ_SOURCE_TYPES = {
    "work_title": ("work", "Work title", "title"),
    "raw_title": ("raw_title", "Source title", "title"),
    "care_title": ("care_unit", "CARE sheet title", "title"),
    "passage": ("raw_phrase", "Source passage", "passage"),
    "sentence": ("raw_phrase", "Source sentence", "sentence"),
    "word": ("raw_word", "Source word", "token"),
    "axiom": ("care_item", "CARE axiom", "text"),
    "axiom_word": ("axiom_word", "CARE axiom word", "token"),
}


class LibrarySearchError(ValueError):
    """The request is valid JSON but does not describe a bounded search."""


@dataclass(frozen=True, slots=True)
class AQRequest:
    total: int
    match_kind: str
    sort: str
    offset: int
    identity: str


def aq_options(parameters):
    values = dict(parameters)
    total = values.get("total", "")
    match_kind, sort = values.get("match_kind", "text"), values.get("sort", "variety")
    offset, identity = values.get("offset", "0"), values.get("id", "")
    if (len(values) != len(parameters) or values.keys() - _AQ_FIELDS
            or not re.fullmatch(r"[0-9]{1,12}", total)
            or match_kind not in _AQ_KINDS or sort not in _AQ_SORTS
            or not re.fullmatch(r"[0-9]{1,4}", offset) or int(offset) > AQ_MAX_OFFSET
            or "id" in values and (not _AQ_ID.fullmatch(identity) or "offset" in values)):
        raise LibrarySearchError("Invalid AQ lookup.")
    return AQRequest(int(total), match_kind, sort, int(offset), identity)


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


def _aq_normalized(text):
    # The desktop CCRU AQ rules use NFKD, upper case, and ASCII 0–9/A–Z.
    return _AQ_NON_SYMBOL.sub("", normalize("NFKD", text).upper())


def _aq_sentences(text):
    for paragraph in _AQ_PARAGRAPH.finditer(text):
        start = paragraph.start()
        for boundary in _AQ_SENTENCE_END.finditer(text, start, paragraph.end()):
            while start < boundary.end() and text[start].isspace():
                start += 1
            yield start, boundary.end()
            start = boundary.end()
        while start < paragraph.end() and text[start].isspace():
            start += 1
        if start < paragraph.end():
            yield start, paragraph.end()


def _aq_factors(total):
    remainder, factors, prime = total, [], 2
    while prime <= isqrt(remainder):
        exponent = 0
        while remainder % prime == 0:
            remainder //= prime
            exponent += 1
        if exponent:
            factors.append({"prime": prime, "exponent": exponent})
        prime = 3 if prime == 2 else prime + 2
    if remainder > 1:
        factors.append({"prime": remainder, "exponent": 1})
    return factors


@dataclass(frozen=True, slots=True)
class _AQMatch:
    source_id: str
    document: _Document
    origin: str
    match_kind: str
    start: int
    end: int
    readable: bool

    @property
    def id(self):
        material = f"{self.origin}\0{self.source_id}\0{self.start}\0{self.end}\0{self.text}"
        return "AQPUB_" + sha256(material.encode("utf-8")).hexdigest()[:24]

    @property
    def text(self):
        if self.origin == "work_title":
            return self.document.work_title
        if self.match_kind == "title":
            return self.document.unit_title
        return self.document.text[self.start:self.end]

    def card(self, total, *, full=False):
        source_type, source_label, source_field = _AQ_SOURCE_TYPES[self.origin]
        document, text = self.document, self.text
        provenance = {"work_id": document.work_id, "sample_title": document.unit_title}
        if self.origin in {"raw_title", "passage", "sentence", "word"}:
            provenance["raw_unit_id"] = document.unit_id
            if self.origin != "raw_title":
                provenance["passage_id"] = self.source_id
        elif self.origin != "work_title":
            provenance["care_unit_id"] = document.unit_id
            if self.origin != "care_title":
                provenance["care_item_id"] = self.source_id
                provenance["section_name"] = document.title
        if self.match_kind in {"word", "sentence"}:
            provenance.update(character_start=self.start, character_end=self.end)
        reduction = (total - 1) % 9 + 1 if total else 0
        result = {
            "id": self.id, "source_type": source_type, "source_label": source_label,
            "source_id": self.source_id, "source_field": source_field, "match_kind": self.match_kind,
            "text": text if full else text[:480], "text_truncated": not full and len(text) > 480,
            "aq_total": total, "digital_reduction": reduction, "zone": reduction % 9,
            "zone_label": "9/0" if reduction == 9 else str(reduction), "rules_version": "ccru-aq/1.0",
            "work_id": document.work_id, "work_title": document.work_title, "author": document.author,
            "provenance": provenance, "collection_available": False,
        }
        if full:
            normalized = _aq_normalized(text)
            factors = _aq_factors(total)
            route = {"book": document.slug} if document.slug else {"lateral": document.unit_id}
            if self.origin != "work_title":
                route["ref"] = self.source_id
            result.update(
                normalized_text=normalized, total_digits=str(total), digit_signature="".join(sorted(str(total))),
                prime_status="zero" if total == 0 else "unit" if total == 1 else (
                    "prime" if factors == [{"prime": total, "exponent": 1}] else "composite"),
                factorization=factors, source_sha256=sha256(text.encode("utf-8")).hexdigest(),
                normalization_version="care-aq-normalization/1.0", mapping_version="ccru-decimal-alphanumeric/1.0",
                character_values=[{"symbol": symbol, "value": value}
                                  for symbol, value in zip(normalized, normalized.encode("ascii").translate(_AQ_VALUES))],
                can_open_source=True, source_href="/library.html#" + urlencode(route),
            )
        return result


class _PublishedAQIndex:
    """Keep compact, bounded span references into the reviewed search records."""

    def __init__(self, records):
        self.totals = defaultdict(list)
        self.size = 0
        titles = set()
        seen_words = {"word": set(), "axiom_word": set()}
        normalize_word = lru_cache(maxsize=32_768)(_aq_normalized)
        for document_kind, documents in records.items():
            is_passage = document_kind == "passage"
            for source_id, document in documents.items():
                if document.work_id and document.work_id not in titles:
                    self._add(document, document.work_id, "work_title", "title", document.work_title)
                    titles.add(document.work_id)
                if document.unit_id not in titles:
                    self._add(document, document.unit_id, "raw_title" if is_passage else "care_title", "title", document.unit_title)
                    titles.add(document.unit_id)
                text = document.text
                self._add(document, source_id, document_kind, "phrase", text)
                if is_passage:
                    for start, end in _aq_sentences(text):
                        self._add(document, source_id, "sentence", "sentence", text[start:end], start)
                word_origin = "word" if is_passage else "axiom_word"
                seen = seen_words[word_origin]
                for token in _AQ_WORD.finditer(text):
                    surface = token.group()
                    normalized = normalize_word(surface)
                    if not normalized or normalized in seen:
                        continue
                    seen.add(normalized)
                    self._add(document, source_id, word_origin, "word", surface, token.start(), normalized=normalized)

    def _add(self, document, source_id, origin, kind, text, start=0, *, normalized=None):
        if len(text) > _AQ_MAX_MATCH_CHARS:
            return
        if normalized is None:
            normalized = _aq_normalized(text)
        if not normalized:
            return
        if self.size >= _AQ_MAX_RECORDS:
            raise ValueError("Published AQ catalogue exceeds its record limit.")
        end = start + len(text)
        total = sum(normalized.encode("ascii").translate(_AQ_VALUES))
        readable = (bool(_AQ_HAS_LETTERS.search(normalized))
                    and not (origin == "raw_title" and text == source_id and source_id.startswith("RAW_"))
                    and not text.lstrip().lower().removeprefix("<!--").lstrip().startswith("care_pdf_page:"))
        self.totals[total].append(_AQMatch(source_id, document, origin, kind, start, end, readable))
        self.size += 1

    def lookup(self, request):
        entries = self.totals.get(request.total, ())
        if request.identity:
            entry = next((entry for entry in entries if entry.id == request.identity), None)
            return {"total": request.total, "id": request.identity, "status": "ok" if entry else "not_found",
                    "record": entry.card(request.total, full=True) if entry else None}
        kind = request.match_kind
        matched = [entry for entry in entries if kind == "all" or kind == "text" and entry.readable or kind == entry.match_kind]
        if request.sort == "alphabetical":
            matched.sort(key=lambda entry: entry.text.casefold())
        elif request.sort in {"shortest", "longest"}:
            matched.sort(key=lambda entry: entry.end - entry.start, reverse=request.sort == "longest")
        elif request.sort == "variety":
            groups = defaultdict(deque)
            for entry in matched:
                groups[entry.document.work_id or entry.document.unit_id].append(entry)
            remaining = deque(groups.values())
            matched = []
            while remaining:
                group = remaining.popleft()
                matched.append(group.popleft())
                if group:
                    remaining.append(group)
        end = request.offset + AQ_PAGE_SIZE
        return {
            "status": "ok", "request": {"instrument": True, "query": str(request.total), "match_kind": kind,
                                        "sort": request.sort, "offset": request.offset},
            "records": [entry.card(request.total) for entry in matched[request.offset:end]],
            "total_count": len(matched), "index_count": len(entries), "limit": AQ_PAGE_SIZE,
            "has_more": end < len(matched) and end <= AQ_MAX_OFFSET,
        }


class PublishedLibrarySearch:
    def __init__(self, web_root):
        self.root = web_root
        self.lock = Lock()
        self.catalogue = None
        self.indexes = {}
        self.aq_index = None

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

    def aq(self, options):
        with self.lock:
            if self.catalogue is None:
                self.catalogue = _read_records(self.root)
            if self.aq_index is None:
                self.aq_index = _PublishedAQIndex(self.catalogue[0])
        return self.aq_index.lookup(options)

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
