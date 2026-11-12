"""Recorded source trails are bounded reachability, never direct grounding."""
from copy import deepcopy
import json
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from recorded_source_paths import RecordedSourcePathIndex


def fixture():
    def unit(identity, layer, refs=(), passages=()):
        return {"id": identity, "layer": layer, "revision": identity + "@R1", "parents": ["UNRECORDED_PARENT"],
                "sections": [{"items": [{"id": identity + ":A1", "text": "Saved wording", "refs": list(refs),
                                          "deep_refs": [], "passages": list(passages)}]}]}
    units = [unit("WB", "WB", ["MC:A1"]), unit("MC", "MC", ["CL:A1"]),
             unit("CL", "CL", ["CH:A1"]), unit("CH", "CH", passages=[{"id": "RAW:P1", "trace_type": "Negative", "confidence": "high"}])]
    source = {"id": "RAW", "title": "Section 51", "text": "Exact original words.",
              "paragraphs": [{"id": "RAW:P1", "text": "Exact original words."}]}
    library = {"works": [{"id": "WORK", "sources": [source], "units": units}]}
    refs = {"RAW": "https://care.example/book/section-51/", "RAW:P1": "https://care.example/book/section-51/#ref=RAW%3AP1"}
    for u in units:
        refs[u["id"]] = "https://care.example/book/" + u["id"].lower() + "/"
        refs[u["id"] + ":A1"] = refs[u["id"]] + "#ref=" + u["id"] + "%3AA1"
    return library, refs


def index(library, refs, **limits):
    return RecordedSourcePathIndex(library, refs, export_sha256="a" * 64, limits=limits or None)


def test_exact_claim_chain_keeps_terminal_type_without_propagating_support_or_mutating_inputs():
    library, refs = fixture()
    before = deepcopy((library, refs))
    idx = index(library, refs)
    result = idx.for_item("WB:A1")
    assert result["complete"] and result["relation"] == "inherited_via_recorded_refs"
    assert result["paths"] == [{"claim_path": ["WB:A1", "MC:A1", "CL:A1", "CH:A1"],
        "reference_fields": ["refs", "refs", "refs"], "passage_id": "RAW:P1", "source_id": "RAW",
        "source_title": "Section 51", "source_url": refs["RAW:P1"], "terminal_alignment_type": "Negative"}]
    assert "confidence" not in json.dumps(result) and "passages" not in result
    assert (library, refs) == before
    result["paths"].clear()
    assert idx.for_item("WB:A1")["paths"]
    assert idx.to_json("WB:A1") == idx.to_json("WB:A1")


@pytest.mark.parametrize("change", ["mismatch", "blank", "wrong_url"])
def test_paragraph_inventory_alone_cannot_claim_a_rendered_source_anchor(change):
    library, refs = fixture()
    source = library["works"][0]["sources"][0]
    if change == "mismatch": source["text"] = "Different original words."
    elif change == "blank": source["text"] = ""
    else: refs["RAW:P1"] = "https://care.example/other/#ref=RAW%3AP1"
    result = index(library, refs).for_item("WB:A1")
    assert not result["complete"] and result["paths"] == []
    assert result["unresolved_refs"][0]["reason"] == "anchor_unavailable"


def test_unit_context_does_not_expand_membership_or_parent_metadata():
    library, refs = fixture()
    library["works"][0]["units"][0]["sections"][0]["items"][0]["refs"] = ["MC", "UNKNOWN"]
    result = index(library, refs).for_item("WB:A1")
    assert result["paths"] == [] and result["counters"]["nodes_visited"] == 1
    assert result["context_links"][0]["expanded"] is False
    assert result["context_links"][0]["url"] == refs["MC"]
    assert result["unresolved_refs"][0]["target_id"] == "UNKNOWN"


def test_cycles_and_shared_targets_terminate_and_shortest_path_is_deterministic():
    library, refs = fixture()
    nodes = [u["sections"][0]["items"][0] for u in library["works"][0]["units"]]
    nodes[0]["deep_refs"] = ["CH:A1"]
    nodes[2]["refs"].append("MC:A1")
    result = index(library, refs).for_item("WB:A1")
    assert result["paths"][0]["claim_path"] == ["WB:A1", "CH:A1"]
    assert not result["complete"] and result["cycles"]
    assert result["counters"]["nodes_visited"] == 4


@pytest.mark.parametrize("limits,reason", [({"max_hops": 2}, "max_hops"),
    ({"max_nodes": 2}, "max_nodes"), ({"max_edges": 1}, "max_edges")])
def test_explicit_traversal_limits_never_return_invented_or_partial_paths(limits, reason):
    library, refs = fixture()
    result = index(library, refs, **limits).for_item("WB:A1")
    assert not result["complete"] and reason in result["limits_hit"]
    assert result["paths"] == []


def test_unique_loci_and_serialized_byte_limits_are_explicit():
    library, refs = fixture()
    source = library["works"][0]["sources"][0]
    source["paragraphs"] = [{"id": f"RAW:P{i}", "text": f"Original paragraph {i}."} for i in range(40)]
    source["text"] = "\n\n".join(p["text"] for p in source["paragraphs"])
    ch = library["works"][0]["units"][-1]["sections"][0]["items"][0]
    ch["passages"] = [{"id": p["id"], "trace_type": "Composite"} for p in source["paragraphs"]]
    refs.update({p["id"]: refs["RAW"] + "#ref=" + p["id"].replace(":", "%3A") for p in source["paragraphs"]})
    result = index(library, refs, max_passages=2).for_item("WB:A1")
    assert len(result["paths"]) == 2 and "max_passages" in result["limits_hit"]
    idx = index(library, refs, max_bytes=1600)
    data = idx.to_json("WB:A1")
    assert len(data) <= 1600 and "max_bytes" in json.loads(data)["limits_hit"]


def test_duplicate_published_owners_fail_closed_and_non_wb_entrypoints_are_rejected():
    library, refs = fixture()
    with pytest.raises(ValueError): index(library, refs).for_item("CH:A1")
    library["works"][0]["sources"][0]["paragraphs"].append({"id": "RAW:P1", "text": "Exact original words."})
    with pytest.raises(ValueError, match="unique owners"): index(library, refs)
