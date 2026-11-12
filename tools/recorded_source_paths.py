"""Bounded projections of published references, never inferred semantic support.

Build one index from the already-attested public export. Canonical records,
translations and direct passage alignments are immutable inputs.
"""
from collections import deque
from copy import deepcopy
from html.parser import HTMLParser
import json
import re
from urllib.parse import unquote, urlsplit

SCHEMA = "care-recorded-source-paths/1"
DEFAULT_LIMITS = {"max_hops": 12, "max_nodes": 2048, "max_edges": 8192,
                  "max_passages": 128, "max_bytes": 65536}


def _bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def _id(value):
    return isinstance(value, str) and 0 < len(value) <= 512 and not any(ord(c) < 32 for c in value)


def _url(value):
    if not isinstance(value, str) or len(value) > 8192 or any(ord(c) < 32 for c in value):
        return None
    parsed = urlsplit(value)
    return value if parsed.scheme in {"https", "http"} and parsed.hostname and not parsed.username and not parsed.password else None


class _Anchors(HTMLParser):
    def __init__(self, document):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.feed(document)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name == "id":
                self.ids.add(value)


class RecordedSourcePathIndex:
    """One export-scoped index; results are cached and copied for each caller."""
    def __init__(self, library, references, *, export_sha256, limits=None):
        from book_seo import _source_markup

        if not isinstance(export_sha256, str) or not re.fullmatch(r"[a-f0-9]{64}", export_sha256):
            raise ValueError("Recorded trails require the attested public export digest.")
        self.limits = {**DEFAULT_LIMITS, **(limits or {})}
        if (set(self.limits) != set(DEFAULT_LIMITS) or any(type(v) is not int or not 0 < v <= DEFAULT_LIMITS[k]
                for k, v in self.limits.items()) or self.limits["max_bytes"] < 1024):
            raise ValueError("Invalid recorded-trail bounds.")
        self.export_sha256 = export_sha256
        self.nodes, self.contexts, self.passages, self._owners, self._cache = {}, {}, {}, {}, {}

        def own(identity, kind):
            if not _id(identity) or identity in self._owners:
                raise ValueError("Published reference identities must have unique owners.")
            self._owners[identity] = kind

        for work in library.get("works", []):
            work_id = work["id"]
            for source in work.get("sources", []):
                source_id = source["id"]
                own(source_id, "source")
                source_url = _url(references.get(source_id))
                self.contexts[source_id] = ("source_section", source_url)
                # Use the actual source renderer. An ID in a paragraph registry
                # alone does not prove that the public HTML has an anchor.
                anchors = (_Anchors(_source_markup(source)).ids
                           if isinstance(source.get("text"), str) and source["text"].strip() else set())
                for paragraph in source.get("paragraphs", []):
                    identity = paragraph.get("id")
                    own(identity, "passage")
                    url = _url(references.get(identity))
                    anchor = "ref=" + identity
                    rendered = (anchor in anchors and url and source_url
                                and url.partition("#")[0] == source_url.partition("#")[0]
                                and unquote(urlsplit(url).fragment) == anchor)
                    self.passages[identity] = {"source_id": source_id, "source_title": source.get("title", ""),
                        "work_id": work_id, "url": url if rendered else None,
                        "reason": "anchor_unavailable" if not rendered else None}
            for unit in work.get("units", []):
                unit_id = unit["id"]
                own(unit_id, "unit")
                self.contexts[unit_id] = ("unit", _url(references.get(unit_id)))
                for section in unit.get("sections", []):
                    for item in section.get("items", []):
                        identity = item["id"]
                        own(identity, "item")
                        edges = []
                        for field in ("refs", "deep_refs"):
                            values = item.get(field, [])
                            if not isinstance(values, list):
                                raise ValueError("Published item references must be lists.")
                            edges.extend((field, target) for target in values)
                        self.nodes[identity] = {"unit_id": unit_id, "work_id": work_id,
                            "layer": unit.get("layer"), "revision": unit.get("revision", ""),
                            "edges": sorted(edges, key=lambda pair: (pair[0], str(pair[1]))),
                            "passages": deepcopy(item.get("passages", []))}

    def for_item(self, item_id):
        if item_id in self._cache:
            return deepcopy(self._cache[item_id])
        if item_id not in self.nodes or self.nodes[item_id]["layer"] != "WB":
            raise ValueError("A source-trail entrypoint must be a published WB item.")
        start, limit = self.nodes[item_id], self.limits
        parents, distance, queue = {}, {item_id: 0}, deque([item_id])
        loci, observed, contexts, unresolved, adjacency = {}, set(), [], [], {}
        hits, edge_count, ref_count, alignment_count = set(), 0, 0, 0

        def path(at):
            ids, fields = [at], []
            while at in parents:
                at, field = parents[at]
                ids.append(at)
                fields.append(field)
            return list(reversed(ids)), list(reversed(fields))

        def edge():
            nonlocal edge_count
            if edge_count >= limit["max_edges"]:
                hits.add("max_edges")
                return False
            edge_count += 1
            return True

        def missing(at, target, field, reason):
            unresolved.append({"from_item_id": at, "target_id": target if _id(target) else None,
                               "reference_field": field, "reason": reason})

        while queue and "max_edges" not in hits:
            at = queue.popleft()
            node = self.nodes[at]
            adjacency[at] = []
            if distance[at] >= limit["max_hops"]:
                if node["edges"] or node["passages"]:
                    hits.add("max_hops")
                continue
            for alignment in node["passages"]:
                if not edge():
                    break
                alignment_count += 1
                target = alignment.get("id") if isinstance(alignment, dict) else alignment
                passage = self.passages.get(target) if _id(target) else None
                if not passage or not passage["url"]:
                    missing(at, target, "passages", passage["reason"] if passage else "unresolved_passage")
                    continue
                observed.add(target)
                if target in loci:
                    continue
                if len(loci) >= limit["max_passages"]:
                    hits.add("max_passages")
                    continue
                ids, fields = path(at)
                loci[target] = {"claim_path": ids, "reference_fields": fields,
                    "passage_id": target, "source_id": passage["source_id"],
                    "source_title": passage["source_title"], "source_url": passage["url"],
                    "terminal_alignment_type": alignment.get("trace_type") if isinstance(alignment, dict) else None}
            for field, target in node["edges"]:
                if not edge():
                    break
                ref_count += 1
                if _id(target) and target in self.nodes:
                    adjacency[at].append(target)
                    if target not in distance:
                        if len(distance) >= limit["max_nodes"]:
                            hits.add("max_nodes")
                        else:
                            distance[target] = distance[at] + 1
                            parents[target] = (at, field)
                            queue.append(target)
                elif _id(target) and target in self.contexts:
                    kind, url = self.contexts[target]
                    if url:
                        contexts.append({"from_item_id": at, "target_id": target,
                            "reference_field": field, "kind": kind + "_context", "url": url, "expanded": False})
                    else:
                        missing(at, target, field, "context_url_unavailable")
                else:
                    missing(at, target, field, "unresolved_reference")

        # A shared descendant is not a cycle. Detect actual backedges separately
        # from the BFS tree, retaining valid shortest paths without looping.
        colors, cycles = {}, []
        for first in distance:
            if colors.get(first):
                continue
            colors[first] = 1
            stack = [(first, iter(adjacency.get(first, [])))]
            while stack:
                at, children = stack[-1]
                target = next(children, None)
                if target is None:
                    colors[at] = 2
                    stack.pop()
                elif target not in distance:
                    continue
                elif colors.get(target) == 1:
                    cycles.append({"from_item_id": at, "target_id": target})
                elif not colors.get(target):
                    colors[target] = 1
                    stack.append((target, iter(adjacency.get(target, []))))

        result = {"schema": SCHEMA, "relation": "inherited_via_recorded_refs",
            "path_policy": "one_shortest_recorded_path_per_passage", "public_export_sha256": self.export_sha256,
            "item_id": item_id, "unit_id": start["unit_id"], "work_id": start["work_id"], "revision": start["revision"],
            "paths": [loci[key] for key in sorted(loci)], "context_links": contexts,
            "unresolved_refs": unresolved, "cycles": cycles, "limits": dict(limit),
            "counters": {"nodes_visited": len(distance), "edges_seen": edge_count,
                "reference_edges_seen": ref_count, "alignment_edges_seen": alignment_count,
                "source_loci_observed": len(observed), "unresolved_refs_observed": len(unresolved),
                "context_links_observed": len(contexts), "cycles_observed": len(cycles)}}
        # Diagnostic arrays are also bounded by the serialized byte ceiling.
        def status():
            result["limits_hit"] = sorted(hits)
            result["complete"] = not hits and not unresolved and not cycles
            result["counters"]["paths_emitted"] = len(result["paths"])
        status()
        while len(_bytes(result)) > limit["max_bytes"]:
            hits.add("max_bytes")
            for key in ("context_links", "unresolved_refs", "cycles", "paths"):
                if result[key]:
                    # Remove chunks, rather than repeatedly encoding a huge
                    # diagnostic list one entry at a time.
                    del result[key][max(0, len(result[key]) // 2):]
                    break
            else:
                raise ValueError("Recorded-trail identity exceeds its byte bound.")
            status()
        self._cache[item_id] = deepcopy(result)
        return result

    def to_json(self, item_id):
        """The exact bounded deterministic UTF-8 sidecar, including newline."""
        return _bytes(self.for_item(item_id))
