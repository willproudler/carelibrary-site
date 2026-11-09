"""Conservative local cues for possible counterpoints, never proof of conflict.

An aligned assertion can offer a reversal, an exception, a scope restriction
or a different explanation. A topic-only search can surface an explicit limit
for the reader to test. Each result quotes the wording that warrants its label.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from .writing_search import fold, stem, words


_MAX_QUERY = 160_000
_MAX_CANDIDATE = 16_000
_MAX_CLAIMS = 64
_SENTENCE = re.compile(r"[^.!?\n]+(?:[.!?]+|$)")
_CLAUSE = re.compile(r"\s+(?:and|but|yet|whereas|while)\s+|;\s*|:\s*", re.I)
_SINGLE_VERB = (
    r"originate(?:s|d)?|arise(?:s)?|derive(?:s|d)?|emerge(?:s|d)?|"
    r"require(?:s|d)?|need(?:s|ed)?|depend(?:s|ed)?|cause(?:s|d)?|"
    r"produce(?:s|d)?|determine(?:s|d)?|precede(?:s|d)?|"
    r"repress(?:es|ed)?|liberate(?:s|d)?|exclude(?:s|d)?|include(?:s|d)?|"
    r"weaken(?:s|ed)?|strengthen(?:s|ed)?|erode(?:s|d)?|preserve(?:s|d)?|"
    r"abolish(?:es|ed)?|retain(?:s|ed)?|prevent(?:s|ed)?|enable(?:s|d)?|"
    r"limit(?:s|ed)?|expand(?:s|ed)?|reduce(?:s|d)?|increase(?:s|d)?|"
    r"transform(?:s|ed)?|shape(?:s|d)?|organis(?:e|es|ed)|organiz(?:e|es|ed)|"
    r"regulate(?:s|d)?|disrupt(?:s|ed)?|dissolve(?:s|d)?|sustain(?:s|ed)?|"
    r"maintain(?:s|ed)?|create(?:s|d)?|support(?:s|ed)?|allow(?:s|ed)?|"
    r"map(?:s|ped)?|describ(?:e|es|ed)|represent(?:s|ed)?|model(?:s|led|ed)?|depict(?:s|ed)?|"
    r"generat(?:e|es|ed)|construct(?:s|ed)?|invent(?:s|ed)?|"
    r"undermine(?:s|d)?|destroy(?:s|ed)?|stabiliz(?:e|es|ed)|stabilis(?:e|es|ed)"
)
_RELATION = re.compile(
    r"\b(?P<link>"
    r"(?:is|are|was|were)\s+(?:not\s+)?(?:chiefly\s+|primarily\s+)?"
    r"(?:caused|shaped|determined|produced|governed|driven|structured|explained)\s+"
    r"(?:chiefly\s+|primarily\s+)?(?:by|through)|"
    r"(?:stem(?:s|med)?|result(?:s|ed)?|come(?:s)?|came)\s+from|"
    r"(?:can\s+)?(?:exist(?:s)?|function(?:s)?|operat(?:e|es)|surviv(?:e|es)|persist(?:s)?|work(?:s)?)\s+without|"
    r"isn['’]t|aren['’]t|wasn['’]t|weren['’]t|"
    r"is|are|was|were|become(?:s)?|remain(?:s)?|constitute(?:s)?|mean(?:s)?|equal(?:s)?|"
    rf"(?:does|do|did)(?:\s+not)?\s+(?:{_SINGLE_VERB})|"
    rf"(?:doesn['’]t|don['’]t|didn['’]t|cannot|can['’]t)\s+(?:{_SINGLE_VERB})|"
    rf"(?:{_SINGLE_VERB})"
    r")\b", re.I,
)
_REPORT = re.compile(
    r"\b(?:asks?|questions?|whether|according\s+to|claims?|says?|said|argues?|reports?|"
    r"believes?|holds?|states?|maintains?|writes?|asserts?|thinks?|assumes?|alleges?|denies|denied|rejects?|disputes?)\b", re.I,
)
_QUESTION = re.compile(r"^\s*(?:why|what|how|when|where|whether|does|do|did|is|are|can|could|should)\b", re.I)
_NON_NEGATING = re.compile(r"\bnot\s+(?:only|merely|just)|\bcannot\s+but\b|\bnot\s+without\b|\b(?:not|never)\s+(?:not|never)\b", re.I)
_UNCERTAIN = re.compile(r"\b(?:maybe|perhaps|possibly|unlikely|uncertain|doubtful)\b", re.I)
_NEGATION = re.compile(r"\b(?:not|never|no|without|neither|cannot)\b|n['’]t\b", re.I)
_UNIVERSAL = re.compile(r"\b(?:always|never|all|every|only|entirely|necessarily|exclusively|absolutely)\b", re.I)
_EXCEPTION = re.compile(r"\b(?:not\s+(?:always|necessarily|all|every)|except|unless|only\s+sometimes)\b", re.I)
_SCOPE = re.compile(
    r"\b(?:only\s+(?:when|if|where|in|for|under|during|among|with)|"
    r"sometimes|(?:in|under)\s+(?:some|certain|specific)\s+"
    r"(?:cases|conditions|contexts|circumstances|settings)|limited\s+to)\b", re.I,
)
_EXPLANATION = re.compile(r"\b(?:chiefly|primarily|instead|rather\s+than)\b", re.I)
_REPRESENTS = re.compile(r"\b(?:map|describ|represent|model|depict)\w*\b", re.I)
_GENERATES = re.compile(r"\b(?:caus|produc|determin|gener|construct|invent)\w*\b", re.I)
_SUBORDINATE = re.compile(r"\b(?:because|since|when|where|if|unless|although|that|which)\b", re.I)
_TOKEN = re.compile(r"[^\W_]+(?:['’][^\W_]+)?", re.UNICODE)
_TOPIC_FILLER = {stem(word) for word in "concept notion theory idea account claim description question view interpretation form kind type".split()}
_TOPIC_WRAPPERS = {stem(word) for word in "order logic field nature movement economy structure concept notion theory account".split()}
_PREDICATE_FILLER = {stem(word) for word in (
    "absolutely necessarily entirely primarily inherently basically generally merely simply only just "
    "always never sometimes possible possibility certain"
).split()}

# Small, explicitly guarded oppositions in a shared asserted predicate. These
# supply retrieval words; they do not establish philosophical incompatibility.
_OPPOSITIONS = (
    (("lack", "deficiency", "privation"), ("productive", "production", "abundance")),
    (("immanent", "immanence"), ("transcendent", "transcendence")),
    (("necessary", "necessity"), ("contingent", "contingency", "optional")),
    (("predetermined", "determined", "deterministic"), ("indeterminate", "undetermined", "open", "stochastic")),
    (("centralized", "centralised", "centralization", "centralisation"), ("distributed", "decentralized", "decentralised")),
    (("finite", "finitude"), ("infinite", "infinity")),
    (("continuous", "continuity"), ("discrete", "discontinuity", "discontinuous")),
    (("stable", "stability"), ("unstable", "instability")),
    (("primary", "primacy", "original"), ("secondary", "derived", "derivative")),
    (("separable", "separate"), ("inseparable", "indivisible")),
    (("repressive", "repress", "repression"), ("liberating", "liberate", "liberation")),
    (("weaken", "erode", "undermine"), ("strengthen", "preserve", "sustain")),
    (("abolish", "destroy"), ("retain", "maintain")),
    (("prevent", "disrupt"), ("enable", "allow")),
    (("limit", "reduce"), ("expand", "increase")),
)
_OPPOSITE: dict[str, frozenset[str]] = {}
_OPPOSITE_WORDS: dict[str, tuple[str, ...]] = {}
for _first, _second in _OPPOSITIONS:
    for _side, _other in ((_first, _second), (_second, _first)):
        for _word in _side:
            _OPPOSITE[stem(_word)] = frozenset(stem(word) for word in _other)
            _OPPOSITE_WORDS[stem(_word)] = _other


@dataclass(frozen=True, slots=True)
class _Claim:
    subject: frozenset[str]
    predicates: frozenset[str]
    negative: frozenset[str]
    relation: str
    verb: str
    head: str
    of_object: bool
    universal: bool
    exception: bool
    scoped: bool
    explanation: bool
    quote: str
    subject_words: tuple[str, ...]
    predicate_words: tuple[str, ...]


def _short(value: str, limit: int = 260) -> str:
    value = value.strip()
    if len(value) <= limit:
        return value
    boundary = value.rfind(" ", 0, limit)
    return value[:boundary if boundary > 40 else limit].rstrip()


def _relation_kind(link: str) -> str:
    normalized = fold(link)
    if normalized.endswith(" without"):
        return "without"
    if normalized.endswith(" from") or re.search(r"originat|aris|deriv|emerg", normalized):
        return "origin"
    if normalized.endswith((" by", " through")):
        return "explanation"
    if re.search(r"requir|need|depend", normalized):
        return "requirement"
    if _REPRESENTS.search(normalized):
        return "representation"
    if _GENERATES.search(normalized) or "preced" in normalized:
        return "causation"
    return "identity" if re.fullmatch(r"isn['’]t|aren['’]t|wasn['’]t|weren['’]t|is|are|was|were|becomes?|remains?|constitutes?|means?|equals?", normalized) else "action"


def _parse(sentence: str) -> list[_Claim]:
    if ("?" in sentence or _QUESTION.search(sentence) or _REPORT.search(sentence)
            or sentence.lstrip().startswith(('"', "“", "‘"))):
        return []
    result: list[_Claim] = []
    inherited: tuple[str, ...] = ()
    # A sentence may have coordinated assertions with an omitted second subject.
    for clause in _CLAUSE.split(sentence):
        if not clause.strip() or _NON_NEGATING.search(clause) or _UNCERTAIN.search(clause) or _REPORT.search(clause):
            continue
        match = _RELATION.search(clause)
        if not match:
            continue
        before, link, rest = clause[:match.start()], match.group("link"), clause[match.end():]
        if (_REPORT.search(before) or re.search(r"\b(?:that|which|who|whose)\b", before, re.I)
                or any(char in before for char in ('"', "“", "”"))):
            continue
        topic = tuple(word for word in words(before) if stem(word) not in _TOPIC_FILLER)
        if not topic and (not before.strip() or fold(before.strip()) in {"it", "they", "this", "that", "these", "those"}):
            topic = inherited
        if not topic or len(topic) > 12:
            continue
        inherited = topic
        of_object = bool(re.search(r"\bof\b", before, re.I))
        head_words = words(re.split(r"\bof\b", before, maxsplit=1, flags=re.I)[0]) if of_object else list(topic)
        head = stem(head_words[-1]) if head_words else stem(topic[-1])
        # Keep scope cues from the whole clause before removing the
        # subordinate condition from its asserted predicate.
        subordinate = _SUBORDINATE.search(rest)
        asserted = clause[:match.end() + subordinate.end()] if subordinate else clause
        exception = bool(_EXCEPTION.search(asserted))
        scoped = bool(_SCOPE.search(asserted))
        if subordinate:
            rest = rest[:subordinate.start()]
        relation = _relation_kind(link)
        link_words = words(link)
        verb = stem(link_words[-1]) if link_words else ""
        raw_predicates = words(rest)
        # For action verbs, retain the verb itself so a reversal such as
        # represses/liberates still needs the same object as well as the topic.
        if relation == "action":
            raw_predicates = [*words(link), *raw_predicates]
        predicates = tuple(word for word in raw_predicates if stem(word) not in _PREDICATE_FILLER
                           and stem(word) not in {stem(value) for value in topic})
        if not predicates:
            continue
        anchors = frozenset(stem(word) for word in predicates)
        token_spans = list(_TOKEN.finditer(fold(rest)))
        # A leading copular negation governs the nominal/adjectival predicate.
        # Later negation is attached only to nearby predicate words.
        first_words = " ".join(token.group() for token in token_spans[:3])
        leading_negative = bool(_NEGATION.search(link) or _NEGATION.search(first_words) or
                                re.match(r"\s*(?:no|none|neither)\b", before, re.I))
        negative = set(anchors) if leading_negative else set()
        if not leading_negative:
            for position, token in enumerate(token_spans):
                anchor = stem(token.group())
                if anchor not in anchors:
                    continue
                preceding = " ".join(item.group() for item in token_spans[max(0, position - 3):position])
                if _NEGATION.search(preceding):
                    negative.add(anchor)
        quote = _short(sentence) if len(sentence.strip()) <= 260 else _short(clause)
        result.append(_Claim(frozenset(stem(word) for word in topic), anchors, frozenset(negative), relation, verb, head, of_object,
                             bool(_UNIVERSAL.search(asserted)), exception, scoped, bool(_EXPLANATION.search(asserted)),
                             quote, topic, predicates))
    return result


@lru_cache(maxsize=16)
def _claims(text: str) -> tuple[_Claim, ...]:
    parsed: list[_Claim] = []
    for match in _SENTENCE.finditer(text[:_MAX_QUERY]):
        # Very large unpunctuated passages are split without discarding their
        # ending, while each syntactic comparison remains bounded.
        sentence = match.group()
        for offset in range(0, len(sentence), 700):
            parsed.extend(_parse(sentence[offset:offset + 700]))
    if len(parsed) <= _MAX_CLAIMS:
        return tuple(parsed)
    # Spread claim windows across the whole draft, always including its end.
    positions = {round(number * (len(parsed) - 1) / (_MAX_CLAIMS - 1)) for number in range(_MAX_CLAIMS)}
    return tuple(parsed[position] for position in sorted(positions))


def analyze_claims(query: str) -> list[dict[str, Any]]:
    """Return at most 64 explicit assertion windows covering the bounded draft."""
    return [{"subject": list(claim.subject_words), "predicates": list(claim.predicate_words),
             "negative": sorted(claim.negative), "relation": claim.relation, "verb": claim.verb,
             "universal": claim.universal, "quote": claim.quote} for claim in _claims(query[:_MAX_QUERY])]


def challenge_terms(query: str) -> tuple[str, ...]:
    """Bounded opposite predicate vocabulary, suitable only for topic-gated FTS."""
    terms = []
    for claim in _claims(query[:_MAX_QUERY]):
        for predicate in sorted(claim.predicates):
            terms.extend(_OPPOSITE_WORDS.get(predicate, ()))
    return tuple(dict.fromkeys(terms))[:32]


@lru_cache(maxsize=24)
def challenge_topics(query: str) -> tuple[str, ...]:
    """Give counterclaim retrieval its own subject-anchored candidate lane."""
    query = query[:_MAX_QUERY]
    claims = _claims(query)
    topics = (word for claim in claims for word in reversed(claim.subject_words)) if claims else iter(words(query))
    return tuple(dict.fromkeys(topics))[:16]


def _topic_lead(query: str, sources: tuple[_Claim, ...], claims: tuple[_Claim, ...]) -> dict[str, Any] | None:
    topics = {stem(word): word for word in challenge_topics(query)}
    for source in sources:
        shared = source.subject & topics.keys()
        if not (source.head in shared or len(shared) >= 2):
            continue
        if not (source.scoped or source.exception or source.relation == "without"):
            continue
        if claims:
            related = [claim for claim in claims if claim.head == source.head]
            if not any(not (claim.scoped or claim.exception) for claim in related):
                continue
            if any(claim.predicates & source.predicates and
                   (claim.relation == source.relation or {claim.relation, source.relation} == {"requirement", "without"})
                   for claim in related):
                continue
        return {"label": "Question to test", "reason": f"This reading raises a limit worth testing. “{source.quote}”",
                "terms": [topics[word] for word in sorted(shared)[:6]], "strength": 1.2,
                "quote": source.quote, "claim": ""}
    return None


def assess_challenge(query: str, text: str, *, allow_topic_leads: bool = False) -> dict[str, Any] | None:
    """Find a locally aligned directional difference and quote its exact context.

    This intentionally misses implicit or complex counterarguments. A result is
    a possible point to compare, not a determination that the source disagrees.
    """
    queries = _claims(query[:_MAX_QUERY])
    sources = _claims(text[:_MAX_CANDIDATE])
    if not queries:
        return _topic_lead(query, sources, queries) if allow_topic_leads else None
    best: dict[str, Any] | None = None
    for source in sources:
        for claim in queries:
            subjects = source.subject & claim.subject
            if not subjects:
                continue
            # Compare the subject of each assertion. Abstract wrappers like
            # "the order of desire" can name that subject. Incidental overlap
            # like "the image of desire" cannot carry a reversal on its own.
            same_topic = source.head == claim.head
            wrapped = ((source.of_object and source.head in _TOPIC_WRAPPERS and claim.head in source.subject) or
                       (claim.of_object and claim.head in _TOPIC_WRAPPERS and source.head in claim.subject))
            if not (same_topic or wrapped):
                continue
            relations = {source.relation, claim.relation}
            if (source.relation != claim.relation and relations not in
                    ({"identity", "origin"}, {"origin", "explanation"}, {"requirement", "without"},
                     {"representation", "causation"})):
                continue
            common = source.predicates & claim.predicates
            reversed_terms = {word for word in common if (word in source.negative) != (word in claim.negative)}
            oppositions = {(word, other) for word in claim.predicates
                           for other in source.predicates & _OPPOSITE.get(word, frozenset())
                           if (word in claim.negative) == (other in source.negative)}
            if source.relation != claim.relation:
                oppositions.clear()
            # Action polarity applies to the verb, not to its object. Aligned
            # objects with different unrelated verbs do not establish reversal.
            if source.relation == "action":
                objects = common - {claim.verb, source.verb}
                reversed_terms = ({claim.verb} if objects and claim.verb == source.verb and
                                  (claim.verb in claim.negative) != (source.verb in source.negative) else set())
                oppositions = ({(claim.verb, source.verb)} if objects and
                               source.verb in _OPPOSITE.get(claim.verb, frozenset()) and
                               (claim.verb in claim.negative) == (source.verb in source.negative) else set())
            qualified = same_topic and common and not (claim.scoped or claim.exception) and (source.exception or source.scoped)
            example = (same_topic and common and claim.relation == "requirement" and
                       not claim.negative and source.relation == "without")
            alternative = (same_topic and relations <= {"origin", "explanation"} and
                           not common and not (claim.negative or source.negative) and
                           source.explanation)
            account = (same_topic and common and relations == {"representation", "causation"} and
                       (_GENERATES.search(claim.verb) or _GENERATES.search(source.verb)) and
                       not (claim.negative or source.negative))
            if not (reversed_terms or oppositions or qualified or example or alternative or account):
                continue
            topic_ratio = len(subjects) / max(1, min(len(source.subject), len(claim.subject)))
            if topic_ratio < 0.5:
                continue
            anchors = (reversed_terms or {word for pair in oppositions for word in pair} or
                       common or claim.predicates | source.predicates)
            display = list(dict.fromkeys(word for word in (*claim.predicate_words, *source.predicate_words)
                                         if stem(word) in anchors))[:6]
            if example or qualified and source.exception:
                label, reason, weight = "Possible exception", "A possible case where the claim may not hold", 2.1
            elif reversed_terms or oppositions:
                label, reason, weight = "Possible challenge", "A possible counterpoint around " + ", ".join(display[:4]), 3.0 if reversed_terms else 2.5
            elif qualified:
                label, reason, weight = "Scope to check", "A possible restriction on where the claim applies", 1.7
            elif account:
                label, reason, weight = "Different account", "The source treats the relationship as a different kind of action", 1.6
            else:
                label, reason, weight = "Alternative explanation", "A different mechanism is proposed for the same subject", 1.6
            strength = weight + min(2, len(common)) * 0.25 + topic_ratio
            record = {"label": label, "reason": reason + f". “{source.quote}”", "terms": display,
                      "strength": strength, "quote": source.quote, "claim": claim.quote}
            if best is None or strength > best["strength"]:
                best = record
    return best or (_topic_lead(query, sources, queries) if allow_topic_leads else None)
