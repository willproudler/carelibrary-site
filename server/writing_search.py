"""Bounded, local idea retrieval for Studio.

The existing full-text index supplies candidates. Only those candidates are
read and compared, so a draft scan does not tokenize a million-item library.
Concept relations are retrieval hints; every result explains its actual match.
"""

from __future__ import annotations

import math
import re
import sqlite3
import threading
import unicodedata
from collections import Counter, defaultdict
from collections.abc import Callable, Mapping, Sequence
from functools import lru_cache
from typing import Any


MAX_QUERY_CHARS = 160_000
_WORD = re.compile(r"[^\W_]{2,64}", re.UNICODE)
_STOP = frozenset((
    "a an and are as at be been being but by can could did do does doing for from had has have having how "
    "i if in into is it its itself just may me might more most much must my no nor not of off on only or our "
    "out over own same she should so some than that the their them then there these they this those through "
    "to too under up us very was we were what when where which while who whom why will with within without "
    "would you your about after again against also among around because before between both down each few "
    "first here like never now once other shall still such thus until upon way well yet says said say "
    "something anything everything thing things one two three become becomes rather really seems seem "
    "all any across even get gets got go goes going give gives given take takes taking make makes making made "
    "form forms formed forming far real see sees seeing seen end ends level part apart place need needs needed "
    "true talk told tell offer offers offered reach reaches reaching always whole many another every final"
).split())

# These are explicit neighbouring vocabularies, not claims of equivalence.
# Polysemous words ("bank", "right", "light", "subject") deliberately stay out.
_CONCEPTS = (
    ("kinship", "kin", "clan", "familial", "family", "nepotism", "consanguinity"),
    ("marriage", "marital", "matrimony", "wedlock", "exogamy", "endogamy", "consanguinity"),
    ("cousin", "consanguinity", "incest", "incestuous", "endogamy"),
    ("parent", "parental", "parenthood", "parents"),
    ("father", "paternal", "paternity", "fatherhood", "patriarchy"),
    ("mother", "maternal", "maternity", "motherhood"),
    ("children", "child", "offspring", "descendants", "progeny"),
    ("capitalism", "capital", "capitalist", "accumulation", "commodification", "technocapital", "technocapitalist"),
    ("acceleration", "accelerating", "accelerate", "speed", "velocity", "accelerationism", "accelerationist"),
    ("obsolete", "obsolescence", "displacement", "superseded", "outmoded"),
    ("atomisation", "atomization", "atomised", "atomized", "individualisation", "individualization"),
    ("religion", "religious", "theology", "theological", "sacred"),
    ("church", "ecclesiastical", "ecclesial", "christianity"),
    ("reproduction", "reproductive", "procreation", "procreative"),
    ("hyperstition", "hyperstitional", "fictional", "fiction", "mythopoesis"),
    ("memory", "mnemonic", "recollection", "remembering", "anamnesis"),
    ("outside", "outsideness", "exterior", "exteriority", "externality"),
    ("inside", "interiority", "interior", "internality"),
    ("boundary", "border", "limit", "threshold", "liminal"),
    ("desire", "desiring", "libidinal", "libido", "appetite"),
    ("unconscious", "unconsciously", "subconscious", "psychoanalysis", "psychoanalytic"),
    ("repression", "repressed", "sublimation", "suppression"),
    ("freedom", "liberty", "liberation", "emancipation"),
    ("control", "controlling", "regulation", "regulating", "discipline"),
    ("domination", "dominating", "subjugation", "oppression"),
    ("alienation", "alienated", "estrangement", "estranged"),
    ("labour", "labor", "worker", "workers", "workforce"),
    ("economy", "economic", "economics", "commerce", "commercial"),
    ("technology", "technological", "technics", "technical", "technicity"),
    ("machine", "machinic", "mechanism", "mechanical", "automation"),
    ("network", "networked", "distributed", "reticulation"),
    ("feedback", "recursion", "recursive", "cybernetics", "cybernetic"),
    ("entropy", "entropic", "thermodynamics", "thermodynamic"),
    ("chaos", "chaotic", "turbulence", "turbulent"),
    ("number", "numeric", "numerical", "numerology", "arithmetic"),
    ("numogram", "numographic", "lemurian", "lemuria"),
    ("ritual", "rituals", "ceremony", "ceremonial", "initiation"),
    ("magic", "magical", "sorcery", "theurgy", "thaumaturgy"),
    ("angel", "angelic", "angelology", "angels"),
    ("demon", "demonic", "demonology", "daemon", "daemonic"),
    ("knowledge", "knowing", "epistemology", "epistemic", "cognition", "cognitive"),
    ("perception", "perceptual", "perceiving", "sensation", "sensory"),
    ("consciousness", "conscious", "awareness", "phenomenology"),
    ("immanence", "immanent", "immanency"),
    ("transcendence", "transcendent", "transcendental"),
    ("difference", "differential", "differentiation", "differing"),
    ("repetition", "repeating", "recurrence", "recurring"),
    ("becoming", "transformation", "metamorphosis", "mutation"),
    ("time", "temporal", "temporality", "chronology", "chronological"),
    ("future", "futurity", "futuristic", "anticipation"),
    ("past", "historical", "historicity", "history"),
    ("death", "mortality", "dying", "mortal", "thanatos"),
    ("life", "living", "vital", "vitality", "vitalism"),
    ("body", "bodily", "corporeal", "corporeality", "embodiment"),
    ("image", "imagery", "imaging", "visual", "visuality"),
    ("cinema", "cinematic", "film", "filmic", "filmmaking"),
    ("theatre", "theater", "theatrical", "dramatic", "dramaturgy"),
    ("language", "linguistic", "linguistics", "speech", "verbal"),
    ("translation", "translating", "translatable", "translator"),
    ("symbol", "symbolic", "symbolism", "signification", "semiotics"),
    ("hierarchy", "hierarchical", "stratification", "strata"),
    ("territory", "territorial", "territoriality", "deterritorialization", "deterritorialisation"),
    ("community", "communal", "collectivity", "collective"),
    ("individual", "individuality", "individuation", "singularity"),
    ("sacrifice", "sacrificial", "sacrificing", "oblation"),
    ("gift", "gifting", "reciprocity", "reciprocal"),
    ("violence", "violent", "aggression", "aggressive"),
    ("trust", "trusting", "confidence", "fiduciary"),
    ("race", "racial", "racialisation", "racialization", "racism"),
    ("gender", "gendered", "masculinity", "femininity", "sexuality"),
    ("sexual", "sexuality", "sex", "erotic", "eroticism"),
)


def fold(value: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", value.casefold())
                   if not unicodedata.combining(c))


def words(value: str) -> list[str]:
    return [word for word in _WORD.findall(fold(value)) if word not in _STOP]


@lru_cache(maxsize=65_536)
def stem(word: str) -> str:
    """Conservative Porter word forms for verifying full-text candidates."""
    if len(word) < 4 or not word.isascii():
        return word

    def vowels(value: str) -> str:
        result = ""
        for char in value:
            result += "V" if char in "aeiou" or (char == "y" and result and result[-1] == "C") else "C"
        return result

    def measure(value: str) -> int:
        return vowels(value).count("VC")

    def short(value: str) -> bool:
        return len(value) >= 3 and vowels(value)[-3:] == "CVC" and value[-1] not in "wxy"

    if word.endswith("sses"):
        word = word[:-2]
    elif word.endswith("ies"):
        word = word[:-2]
    elif not word.endswith("ss") and word.endswith("s"):
        word = word[:-1]
    if word.endswith("eed"):
        if measure(word[:-3]) > 0:
            word = word[:-1]
    else:
        for suffix in ("ing", "ed"):
            if word.endswith(suffix) and "V" in vowels(word[:-len(suffix)]):
                word = word[:-len(suffix)]
                if word.endswith(("at", "bl", "iz")):
                    word += "e"
                elif len(word) > 1 and word[-1] == word[-2] and vowels(word)[-1] == "C" and word[-1] not in "lsz":
                    word = word[:-1]
                elif measure(word) == 1 and short(word):
                    word += "e"
                break
    if word.endswith("y") and "V" in vowels(word[:-1]):
        word = word[:-1] + "i"
    for suffix, ending in (
        ("ational", "ate"), ("tional", "tion"), ("enci", "ence"), ("anci", "ance"),
        ("izer", "ize"), ("abli", "able"), ("alli", "al"), ("entli", "ent"),
        ("eli", "e"), ("ousli", "ous"), ("ization", "ize"), ("ation", "ate"),
        ("ator", "ate"), ("alism", "al"), ("iveness", "ive"), ("fulness", "ful"),
        ("ousness", "ous"), ("aliti", "al"), ("iviti", "ive"), ("biliti", "ble"),
    ):
        if word.endswith(suffix):
            if measure(word[:-len(suffix)]) > 0:
                word = word[:-len(suffix)] + ending
            break
    for suffix, ending in (("icate", "ic"), ("ative", ""), ("alize", "al"),
                           ("iciti", "ic"), ("ical", "ic"), ("ful", ""), ("ness", "")):
        if word.endswith(suffix):
            if measure(word[:-len(suffix)]) > 0:
                word = word[:-len(suffix)] + ending
            break
    for suffix in ("ement", "ance", "ence", "able", "ible", "ment", "ant", "ent", "ism", "ate", "iti", "ous", "ive", "ize", "al", "er", "ic", "ou", "ion"):
        if word.endswith(suffix):
            base = word[:-len(suffix)]
            if measure(base) > 1 and (suffix != "ion" or base.endswith(("s", "t"))):
                word = base
            break
    if word.endswith("e") and (measure(word[:-1]) > 1 or (measure(word[:-1]) == 1 and not short(word[:-1]))):
        word = word[:-1]
    if word.endswith("ll") and measure(word) > 1:
        word = word[:-1]
    return word


_GROUP_STEMS = tuple(frozenset(stem(word) for word in group) for group in _CONCEPTS)
_GROUPS_BY_STEM: dict[str, set[int]] = defaultdict(set)
for _number, _group in enumerate(_GROUP_STEMS):
    for _word in _group:
        _GROUPS_BY_STEM[_word].add(_number)

# Wild mode can compare relational vocabulary across different subject areas.
# These are retrieval patterns; sharing one does not establish an equivalence.
_STRUCTURES = (
    ("feedback", ("feedback", "recursion", "recursive", "loop", "reinforcement", "return")),
    ("boundary-making", ("boundary", "border", "selection", "exclusion", "filter", "gate", "threshold")),
    ("transmission", ("transmission", "inheritance", "reproduction", "replication", "copy", "propagation")),
    ("capture", ("capture", "enclosure", "privatization", "domestication", "control", "confinement")),
    ("circulation", ("flow", "circulation", "exchange", "distribution", "network", "relay")),
    ("breakdown", ("dissolution", "fragmentation", "breakdown", "collapse", "disintegration")),
    ("stabilisation", ("stabilization", "equilibrium", "homeostasis", "maintenance", "persistence")),
    ("emergence", ("emergence", "assembly", "differentiation", "individuation", "organization")),
    ("encoding", ("encoding", "translation", "inscription", "representation", "mediation")),
    ("synchronisation", ("synchronization", "synchronisation", "entrainment", "coupling", "rhythm", "resonance")),
    ("delay", ("delay", "latency", "deferral", "anticipation", "hysteresis")),
    ("camouflage", ("camouflage", "concealment", "masking", "mimicry", "disguise")),
    ("contagion", ("contagion", "infection", "diffusion", "imitation", "cascade")),
    ("inversion", ("inversion", "reversal", "countermovement", "reversion", "rebound")),
)
_STRUCTURE_STEMS = tuple(frozenset(stem(word) for word in terms) for _, terms in _STRUCTURES)


def query_windows(query: str) -> list[str]:
    """Cover the complete bounded draft; the final paragraphs are included."""
    query = query[:MAX_QUERY_CHARS]
    target = max(900, math.ceil(len(query) / 16))
    pieces = []
    cursor = 0
    while cursor < len(query):
        if len(pieces) == 15:
            pieces.append(query[cursor:])
            break
        end = min(len(query), cursor + target)
        if end < len(query):
            boundary = query.rfind(" ", cursor + target // 2, end)
            if boundary > cursor:
                end = boundary
        pieces.append(query[cursor:end])
        cursor = end
    return pieces


class DeepSearchIndex:
    """A reusable FTS candidate index with bounded per-query comparison.

    Existing axiom FTS storage can be supplied, avoiding a duplicate index.
    Standalone passage indexes use Porter tokenization. Stored records and
    exact citation identities remain owned by the caller.
    """

    def __init__(self, records: Mapping[str, Mapping[str, Any]], *, text_key: str = "item_text",
                 metadata_keys: Sequence[str] = ("work_title", "unit_title", "author"),
                 work_key: str = "work_id", unit_key: str = "care_unit_id",
                 connection: sqlite3.Connection | None = None, table: str = "documents",
                 vocabulary: str = "document_words", body_column: str = "body",
                 metadata_column: str = "metadata", identity_column: str = "item_id"):
        self.records, self.text_key = records, text_key
        self.metadata_keys, self.work_key, self.unit_key = tuple(metadata_keys), work_key, unit_key
        self.lock = threading.RLock()
        self._variant_cache: dict[str, tuple[tuple[str, int], ...]] = {}
        self.table, self.vocabulary = table, vocabulary
        self.body_column, self.metadata_column, self.identity_column = body_column, metadata_column, identity_column
        self.owns_connection = connection is None
        self.connection = connection if connection is not None else sqlite3.connect(":memory:", check_same_thread=False)
        self._scope_function = f"studio_work_{id(self):x}"
        scope_records, scope_key = self.records, self.work_key
        self.connection.create_function(self._scope_function, 1,
            lambda identity: str(scope_records.get(identity, {}).get(scope_key) or ""))
        if connection is None:
            self.connection.execute(
                "CREATE VIRTUAL TABLE documents USING fts5(item_id UNINDEXED, body, metadata, "
                "tokenize='porter unicode61 remove_diacritics 2')"
            )
            self.connection.executemany("INSERT INTO documents(item_id, body, metadata) VALUES (?, ?, ?)", (
                (identity, fold(str(record.get(text_key) or "")),
                 fold(" ".join(str(record.get(key) or "") for key in metadata_keys)))
                for identity, record in records.items()
            ))
            self.connection.execute("CREATE VIRTUAL TABLE document_words USING fts5vocab(documents, 'row')")
            self.connection.commit()

    def _variants(self, word: str) -> tuple[tuple[str, int], ...]:
        if word in self._variant_cache:
            return self._variant_cache[word]
        root = stem(word)
        # A short common prefix bounds vocabulary walks; all forms are checked.
        common = 0
        for first, second in zip(word, root):
            if first != second:
                break
            common += 1
        shared = word[:common]
        prefix = shared if len(shared) >= 4 else word
        rows = self.connection.execute(
            f"SELECT term, doc FROM {self.vocabulary} WHERE term >= ? AND term < ? ORDER BY doc DESC, term LIMIT 48",
            (prefix, prefix + "\uffff"),
        ).fetchall()
        forms = [(term, count) for term, count in rows if stem(term) == root]
        # Porter y->i (family/famili, memory/memori) is not itself a lexical
        # prefix in the reused Unicode61 axiom vocabulary.
        rows = self.connection.execute(
            f"SELECT term, doc FROM {self.vocabulary} WHERE term = ?", (word,),
        ).fetchall()
        forms.extend((term, count) for term, count in rows)
        if self.owns_connection:
            # Porter vocabulary already contains stems, rather than raw forms.
            rows = self.connection.execute(
                f"SELECT term, doc FROM {self.vocabulary} WHERE term = ?", (root,),
            ).fetchall()
            forms.extend((term, count) for term, count in rows)
        result = tuple(dict.fromkeys(forms))
        if len(self._variant_cache) >= 4096:
            self._variant_cache.pop(next(iter(self._variant_cache)))
        self._variant_cache[word] = result
        return result

    def _terms(self, window: str, mode: str, depth: int) -> dict[str, Any]:
        counts = Counter(words(window))
        total = max(2, len(self.records))
        ranked, weights = [], {}
        for word, count in counts.items():
            variants = self._variants(word)
            if not variants:
                continue
            frequency = min(total, sum(n for _, n in variants))
            idf = math.log1p(total / max(1, frequency))
            # Rare incidental words cannot outweigh recurring topic vocabulary.
            weight = min(5.0, idf) * (1 + math.log1p(min(5, count)))
            ranked.append((weight, word, variants))
            weights[stem(word)] = max(weight, weights.get(stem(word), 0))
        ranked.sort(key=lambda row: (-row[0], row[1]))
        selected = ranked[:24 + min(depth, 2) * 8]
        direct = tuple(dict.fromkeys(term for _, _, forms in selected for term, _ in forms))[:96]
        original = {stem(word) for word in counts}
        groups = set().union(*(_GROUPS_BY_STEM.get(word, set()) for word in original)) if original else set()
        group_weights = {group: 2.0 + math.log1p(sum(count for word, count in counts.items()
                              if stem(word) in _GROUP_STEMS[group])) * 2 for group in groups}
        expanded = []
        for group in sorted(groups):
            for word in _CONCEPTS[group]:
                if stem(word) not in original:
                    forms = self._variants(word)
                    expanded.extend((min(5.0, math.log1p(total / max(1, number))), term)
                                    for term, number in forms)
        expanded.sort(key=lambda row: (-row[0], row[1]))
        expansions = tuple(dict.fromkeys(term for _, term in expanded))[:36 if mode == "deep" else 64]
        return {"text": fold(window), "words": counts, "original": original, "weights": weights,
                "groups": groups, "group_weights": group_weights, "direct": direct, "expanded": expansions}

    def search(self, query: str, *, mode: str = "deep", scope: str = "library", work_id: str = "",
               limit: int = 8, depth: int = 0, previous: Sequence[Mapping[str, Any]] = (),
               neighbors: Callable[[str], Sequence[str]] | None = None,
               seeds: Sequence[str] = ()) -> list[tuple[str, dict[str, Any]]]:
        if not query.strip() or limit <= 0 or (scope == "work" and not work_id):
            return []
        with self.lock:
            return self._search(query, mode=mode, scope=scope, work_id=work_id,
                                limit=min(24, limit), depth=depth, previous=previous, neighbors=neighbors,
                                seed_ids=seeds)

    def _search(self, query: str, *, mode: str, scope: str, work_id: str, limit: int, depth: int,
                previous: Sequence[Mapping[str, Any]], neighbors: Callable | None,
                seed_ids: Sequence[str] = ()) -> list[tuple[str, dict[str, Any]]]:
        excluded = {str(record.get("item_id") or record.get("passage_id") or "") for record in previous}

        def in_scope(identity: str) -> bool:
            return (identity in self.records and
                    (scope != "work" or self.records[identity].get(self.work_key) == work_id))

        def allowed(identity: str) -> bool:
            return identity not in excluded and in_scope(identity)

        exact = query.strip()
        if exact not in self.records and exact.upper() in self.records:
            exact = exact.upper()
        if exact in self.records:
            if scope == "work" and self.records[exact].get(self.work_key) != work_id:
                return []
            if depth == 0:
                return [(exact, {"label": "Exact ID", "reason": "Matches this exact saved identity.", "terms": []})] if allowed(exact) else []
            if mode in {"wild", "challenge"}:
                return self._search(str(self.records[exact].get(self.text_key) or ""), mode=mode,
                    scope=scope, work_id=work_id, limit=limit, depth=depth, previous=previous,
                    neighbors=neighbors, seed_ids=(exact,) if mode == "wild" else ())
            if neighbors:
                return [(identity, {"label": "Recorded connection", "reason": f"Linked in CARE to {exact}.", "terms": []})
                        for identity in dict.fromkeys(neighbors(exact)) if allowed(identity)][:limit]
            return []
        windows = [self._terms(part, mode, depth) for part in query_windows(query)]
        windows = [window for window in windows if window["direct"] or window["expanded"]]
        if not windows:
            return []
        candidates: dict[str, dict[str, Any]] = {}
        # Whole-draft scans cover every window with a bounded total candidate pool.
        per_window = max(48, min(160, 1400 // len(windows))) + min(depth, 2) * 24
        for number, window in enumerate(windows):
            routes = [(" OR ".join(f'"{term}"' for term in terms), weight, size)
                      for terms, weight, size in ((window["direct"], 1.0, per_window),
                                                  (window["expanded"], 0.5, per_window // 2)) if terms]
            if mode == "challenge":
                from .writing_search_challenges import challenge_terms, challenge_topics

                opposed = tuple(dict.fromkeys(term for word in challenge_terms(window["text"])
                                              for term, _ in self._variants(word)))[:32]
                subjects = tuple(dict.fromkeys(term for word in challenge_topics(window["text"])
                                               for term, _ in self._variants(word)))[:32]
                if subjects:
                    anchors = " OR ".join(f'"{term}"' for term in subjects)
                    cues = ("without", "except", "unless", "sometimes", "not always", "not necessarily",
                            "only when", "only if", "only in", "only where", "chiefly", "primarily",
                            "rather than", "arises from", "results from", "caused by", "produces", "generates",
                            "represents", "maps")
                    evidence = " OR ".join(f'"{term}"' for term in (*opposed, *cues))
                    routes.insert(1, (f'{self.body_column} : (({anchors}) AND ({evidence}))', 1.2, per_window))
            literal = _WORD.findall(window["text"])
            if len(windows) == 1 and 1 < len(literal) <= 12 and len(window["text"]) <= 240:
                routes.append((self.body_column + ' : "' + " ".join(literal) + '"', 1.8, 48))
            # A rare incidental word must not crowd out an axiom that connects
            # two central ideas under different vocabulary. Intersections give
            # those connections their own bounded retrieval lane.
            top_groups = sorted(window["groups"], key=lambda group: (-window["group_weights"][group], group))[:16]
            group_expressions = []
            for group in top_groups:
                group_terms = tuple(dict.fromkeys(term for word in _CONCEPTS[group]
                                                  for term, _ in self._variants(word)))[:24]
                if group_terms:
                    group_expressions.append("(" + " OR ".join(f'"{term}"' for term in group_terms) + ")")
            for first, expression in enumerate(group_expressions[:4]):
                for second_number, second in enumerate(group_expressions[first + 1:], start=first + 1):
                    if first == 0 or second_number < 4:
                        routes.append((expression + " AND " + second, 0.8, 24))
            # At most 64 FTS routes and 1,800 lexical candidates cover the
            # complete draft, independently of the number of concept families.
            route_budget = max(2, (48 if mode == "wild" else 64) // len(windows))
            routes = routes[:route_budget]
            candidate_budget = max(1, (1200 if mode == "wild" else 1800) // len(windows) // max(1, len(routes)))
            for expression, route_weight, fetch in routes:
                fetch = min(fetch, candidate_budget)
                # body is weighted strongly; repeated sheet/section headings do
                # not acquire relevance merely because the book title matches.
                weights = "0, 1.0, 0.12" if self.owns_connection else "0, 0.12, 1.0"
                # Work scope is applied before limiting. A million irrelevant
                # library hits must never starve a book-specific query.
                keep = f" AND {self._scope_function}({self.identity_column}) = ?" if scope == "work" else ""
                params = (expression, work_id, fetch) if scope == "work" else (expression, fetch)
                matches = self.connection.execute(
                    f"SELECT {self.identity_column}, bm25({self.table}, {weights}) "
                    f"FROM {self.table} WHERE {self.table} MATCH ? {keep} "
                    f"ORDER BY bm25({self.table}, {weights}) LIMIT ?", params,
                )
                kept = 0
                for rank, row in enumerate(matches):
                    identity = row[0]
                    if not allowed(identity):
                        continue
                    candidate = candidates.setdefault(identity, {"rrf": 0.0, "graph": []})
                    candidate["rrf"] += route_weight / (32 + rank)
                    kept += 1
                    if kept >= fetch:
                        break

        def compare(identity: str, candidate: dict[str, Any]) -> dict[str, Any]:
            record = self.records[identity]
            text = str(record.get(self.text_key) or "")
            folded = fold(text)
            tokens = words(text)
            forms = Counter(stem(word) for word in tokens)
            metadata = " ".join(str(record.get(key) or "") for key in self.metadata_keys)
            metadata_forms = {stem(word) for word in words(metadata)}
            all_groups = set().union(*(_GROUPS_BY_STEM.get(word, set()) for word in forms)) if forms else set()
            scores, details = [], []
            for number, window in enumerate(windows):
                direct = set(forms).intersection(window["original"])
                groups = all_groups.intersection(window["groups"])
                indirect = {word for word in forms if word not in window["original"] and
                            _GROUPS_BY_STEM.get(word, set()).intersection(groups)}
                exact = []
                metadata_hits = metadata_forms.intersection(window["original"])
                # Matching a single common word inside a long draft is weak.
                phrase = window["text"].strip('" ')
                key_phrase = (len(phrase) <= 240 and bool(re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", folded)))
                strong = (len(direct) >= 2 or key_phrase or
                          (len(window["original"]) <= 3 and bool(direct or indirect)) or
                          (bool(direct) and bool(indirect)) or len(groups) >= 2)
                if not strong and not (depth > 0 and direct and max((window["weights"].get(word, 0) for word in direct), default=0) >= 4.8):
                    scores.append(0.0); details.append((direct, indirect, groups, exact, key_phrase)); continue
                base = sum(window["weights"].get(word, 2.0) * (1 + 0.15 * math.log1p(forms[word])) for word in direct)
                base *= 1 + 0.3 * min(5, len(direct))
                base += sum(sorted((window["group_weights"][group] for group in groups), reverse=True)[:4]) * (1.0 if mode == "deep" else 1.15)
                base += min(4, len(indirect)) * 1.5
                base += (30.0 if len(_WORD.findall(phrase)) >= 2 else 9.0) if key_phrase else 0.0
                # Adjacent distinctive wording is stronger than scattered words.
                adjacent = sum(1 for first, second in zip(tokens, tokens[1:])
                               if stem(first) in direct and stem(second) in direct)
                base += min(6, adjacent) * 1.4
                base += min(3, len(metadata_hits)) * 0.6
                if len(tokens) <= 3 and not key_phrase:
                    base *= 0.45
                scores.append(base)
                details.append((direct, indirect, groups, exact, key_phrase))
            best = max(range(len(scores)), key=lambda number: scores[number])
            score = scores[best] + sum(sorted(scores, reverse=True)[1:4]) * 0.10 + candidate["rrf"] * 20
            # Long report/table sections can accumulate scattered incidental
            # words. Prefer an axiom that connects the ideas in a compact claim.
            density_penalty = max(1.0, (len(tokens) / 80) ** 0.65)
            if any(detail[4] for detail in details) and len(_WORD.findall(windows[best]["text"])) >= 2:
                density_penalty = min(1.4, density_penalty)
            score /= density_penalty
            direct, indirect, groups, exact, phrase = details[best]
            matching = list(dict.fromkeys(word for word in tokens if stem(word) in direct))[:8]
            related = list(dict.fromkeys(word for word in tokens if stem(word) in indirect))[:6]
            if phrase:
                label, reason = "Shared phrase", "Contains the phrase used in your search."
            elif direct and matching:
                label, reason = "Shared wording", "Matches " + ", ".join(matching[:5]) + "."
                if related:
                    reason += " Related vocabulary: " + ", ".join(related[:4]) + "."
            else:
                label, reason = "Related vocabulary", "Connected vocabulary: " + ", ".join(related[:5]) + "."
            return {**candidate, "id": identity, "score": score if max(scores) > 0 else 0,
                    "tokens": frozenset(forms), "window": best, "work": str(record.get(self.work_key) or ""),
                    "unit": str(record.get(self.unit_key) or ""), "signature": " ".join(tokens),
                    "match": {"label": label, "reason": reason, "terms": [*matching, *related][:10]}}

        if mode == "challenge":
            from .writing_search_challenges import assess_challenge

            ranked, questions = [], []
            for identity, candidate in candidates.items():
                assessment = assess_challenge(query, str(self.records[identity].get(self.text_key) or ""),
                                              allow_topic_leads=True)
                if assessment is None:
                    continue
                result = compare(identity, candidate)
                # An aligned contrast may share only the subject with a draft.
                # Rank the evidence first, then use wording as a small tie-break.
                result["score"] = assessment["strength"] * 12 + min(8, 2 * math.log1p(result["score"]))
                result["match"] = {key: assessment[key] for key in ("label", "reason", "terms", "quote", "claim")}
                (questions if assessment["label"] == "Question to test" else ranked).append(result)
            ranked = ranked or questions
        else:
            ranked = [result for identity, candidate in candidates.items()
                      if (result := compare(identity, candidate))["score"] > 0]
        ranked.sort(key=lambda candidate: (-candidate["score"], candidate["id"]))
        if mode == "wild":
            forced = [compare(identity, {"rrf": 0, "graph": []}) for identity in dict.fromkeys(seed_ids[:4])
                      if in_scope(identity)]
            anchors = forced or [candidate for candidate in ranked[:4]
                                 if candidate["score"] >= ranked[0]["score"] * 0.6]
            if anchors:
                ranked = self._wild_expand(ranked, anchors, compare=compare, neighbors=neighbors,
                    allowed=allowed, in_scope=in_scope, scope=scope, work_id=work_id)
        # Saved graph edges are a secondary route, anchored to strong wording.
        if neighbors and ranked and mode not in {"wild", "challenge"} and (mode == "explore" or depth >= 2):
            seeds = [candidate for candidate in ranked[:4] if candidate["score"] >= ranked[0]["score"] * 0.6]
            graph: dict[str, list[str]] = defaultdict(list)
            for seed in seeds:
                for identity in neighbors(seed["id"])[:16]:
                    if allowed(identity) and identity != seed["id"]:
                        graph[identity].append(seed["id"])
            for identity, sources in graph.items():
                if identity in candidates:
                    continue
                candidate = compare(identity, {"rrf": 0, "graph": sources})
                if candidate["score"]:
                    candidate["score"] += 2.0
                elif len(sources) >= 2 or depth >= 3:
                    candidate["score"] = ranked[0]["score"] * 0.22
                    candidate["match"] = {"label": "Recorded connection", "reason": "Linked in CARE to " + ", ".join(sources[:2]) + ".", "terms": []}
                else:
                    continue
                ranked.append(candidate)
            ranked.sort(key=lambda candidate: (-candidate["score"], candidate["id"]))
        if not ranked:
            return []
        floor = ranked[0]["score"] * (0.14 if mode in {"explore", "wild"} or depth >= 2 else 0.22)
        pool = [candidate for candidate in ranked if candidate["score"] >= floor]
        chosen, seen_text = [], set()
        while pool and len(chosen) < limit:
            def diverse(candidate: dict[str, Any]) -> float:
                same_work = sum(candidate["work"] == prior["work"] for prior in chosen) if candidate["work"] else 0
                same_unit = sum(candidate["unit"] == prior["unit"] for prior in chosen) if candidate["unit"] else 0
                overlap = max((len(candidate["tokens"] & prior["tokens"]) / max(1, len(candidate["tokens"] | prior["tokens"])) for prior in chosen), default=0)
                represented = sum(candidate["window"] == prior["window"] for prior in chosen)
                return candidate["score"] / (1 + (0.35 if mode == "wild" else 0.10) * same_work +
                    (0.45 if mode == "wild" else 0.15) * same_unit + max(0, overlap - 0.55) + 0.05 * represented)
            options = pool
            if mode == "wild" and len(chosen) in {1, 3}:
                connections = [candidate for candidate in pool if candidate.get("wild_kind")]
                two_hop = [candidate for candidate in connections if candidate.get("wild_kind") == "two-hop"]
                analogies = [candidate for candidate in connections if candidate.get("wild_kind") == "analogy"]
                options = (two_hop if len(chosen) == 1 else analogies) or connections or pool
            candidate = max(options, key=diverse)
            pool.remove(candidate)
            if candidate["signature"] in seen_text:
                continue
            chosen.append(candidate); seen_text.add(candidate["signature"])
        return [(candidate["id"], candidate["match"]) for candidate in chosen]

    def _wild_expand(self, ranked: list[dict[str, Any]], anchors: list[dict[str, Any]], *,
                     compare: Callable, neighbors: Callable | None, allowed: Callable,
                     in_scope: Callable, scope: str, work_id: str) -> list[dict[str, Any]]:
        """Follow saved paths and bounded operator analogies from strong seeds."""
        anchors = [anchor for anchor in anchors[:4] if anchor["score"] > 0]
        if not anchors:
            return ranked
        by_id = {candidate["id"]: candidate for candidate in ranked}
        anchor_ids = {candidate["id"] for candidate in anchors}
        paths: dict[str, list[str]] = {}
        if neighbors:
            for anchor in anchors:
                seed = anchor["id"]
                first = [identity for identity in dict.fromkeys(neighbors(seed)[:12])
                         if identity != seed and in_scope(identity)]
                for bridge in first:
                    if allowed(bridge) and bridge not in anchor_ids:
                        paths.setdefault(bridge, [seed, bridge])
                    for identity in dict.fromkeys(neighbors(bridge)[:12]):
                        if identity not in {seed, bridge} and in_scope(identity) and allowed(identity) and identity not in anchor_ids:
                            paths.setdefault(identity, [seed, bridge, identity])
            for identity, path in paths.items():
                candidate = dict(by_id.get(identity) or compare(identity, {"rrf": 0, "graph": path[:-1]}))
                if not candidate["signature"]:
                    continue
                works = {self.records[step].get(self.work_key) for step in path} - {None, ""}
                cross_work = len(works) > 1
                factor = (0.45 if len(path) == 3 else 0.36) + (0.12 if cross_work else 0)
                candidate["score"] = max(candidate["score"], anchors[0]["score"] * factor)
                candidate["wild_kind"] = "two-hop" if len(path) == 3 else "one-hop"
                candidate["match"] = {"label": "Connection of connections" if len(path) == 3 else "Recorded connection",
                    "reason": f"Recorded CARE route ({len(path) - 1} links): " + " → ".join(path) + ".",
                    "terms": candidate["match"].get("terms", []), "path": path}
                by_id[identity] = candidate

        # Sixteen extra FTS routes and at most 576 candidates are reserved for
        # analogies. Combined with the first pass this stays below 64/1,800.
        routes = 0
        for anchor in anchors:
            seed_tokens = words(str(self.records[anchor["id"]].get(self.text_key) or "")[:6000])
            seed_forms = {stem(word) for word in seed_tokens}
            families = [number for number, family in enumerate(_STRUCTURE_STEMS) if family & seed_forms]
            if len(families) < 2:
                continue
            families.sort(key=lambda number: (-len(_STRUCTURE_STEMS[number] & seed_forms), number))
            for number, first in enumerate(families[:3]):
                for second in families[number + 1:number + 3]:
                    if routes >= 16:
                        break
                    clauses = []
                    for family in (first, second):
                        variants = tuple(dict.fromkeys(term for word in _STRUCTURES[family][1]
                                                       for term, _ in self._variants(word)))[:24]
                        if variants:
                            clauses.append("(" + " OR ".join(f'"{term}"' for term in variants) + ")")
                    if len(clauses) < 2:
                        continue
                    expression = " AND ".join(clauses)
                    keep = f" AND {self._scope_function}({self.identity_column}) = ?" if scope == "work" else ""
                    params = (expression, work_id, 36) if scope == "work" else (expression, 36)
                    weights = "0, 1.0, 0.12" if self.owns_connection else "0, 0.12, 1.0"
                    rows = self.connection.execute(
                        f"SELECT {self.identity_column} FROM {self.table} WHERE {self.table} MATCH ? {keep} "
                        f"ORDER BY bm25({self.table}, {weights}) LIMIT ?", params)
                    routes += 1
                    for row in rows:
                        identity = row[0]
                        if not allowed(identity) or identity in anchor_ids or by_id.get(identity, {}).get("wild_kind"):
                            continue
                        candidate = dict(by_id.get(identity) or compare(identity, {"rrf": 0, "graph": []}))
                        if candidate["work"] and candidate["work"] == anchor["work"]:
                            continue
                        candidate_tokens = words(str(self.records[identity].get(self.text_key) or "")[:6000])
                        actual = [word for word in candidate_tokens if stem(word) in (_STRUCTURE_STEMS[first] | _STRUCTURE_STEMS[second])]
                        candidate_forms = {stem(word) for word in actual}
                        if not (_STRUCTURE_STEMS[first] & candidate_forms and _STRUCTURE_STEMS[second] & candidate_forms):
                            continue
                        operators = _STRUCTURE_STEMS[first] | _STRUCTURE_STEMS[second]
                        candidate_context, anchor_context = candidate["tokens"] - operators, anchor["tokens"] - operators
                        overlap = len(candidate_context & anchor_context) / max(1, len(candidate_context | anchor_context))
                        if overlap > 0.65 or len(candidate_tokens) > 240:
                            continue
                        terms = list(dict.fromkeys(actual))[:8]
                        source_terms = list(dict.fromkeys(word for word in seed_tokens
                            if stem(word) in (_STRUCTURE_STEMS[first] | _STRUCTURE_STEMS[second])))[:6]
                        candidate["score"] = max(candidate["score"],
                                                 anchor["score"] * (0.42 + min(0.1, len(terms) * 0.02) + (1 - overlap) * 0.08))
                        candidate["wild_kind"] = "analogy"
                        candidate["match"] = {"label": "Structural connection", "reason":
                            f"Possible analogy in {_STRUCTURES[first][0]} and {_STRUCTURES[second][0]} "
                            f"with {anchor['id']}: " +
                            ", ".join(source_terms) + " ↔ " + ", ".join(terms) + ".", "terms": terms,
                            "via": anchor["id"]}
                        by_id[identity] = candidate
        return sorted(by_id.values(), key=lambda candidate: (-candidate["score"], candidate["id"]))
