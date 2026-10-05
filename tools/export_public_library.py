"""Export the three explicitly allowed, sealed CARE readings, never a catalogue.

Run with the private CARE project's Python environment, passing its root as argv[1].
The website itself needs neither Python nor access to the private application.
"""
from __future__ import annotations

import copy
import hashlib
import json
import re
import sqlite3
import sys
from collections import OrderedDict
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
DEST = Path(__file__).resolve().parents[1] / "data"
sys.path.insert(0, str(ROOT))
from care_platform.lateral import load_lateral_care_record
from care_platform.languages import LANGUAGE_BY_CODE, language_name
from scripts.align_ch_to_passages import validate_alignment
from scripts.parse_frozen_ch import parse_ch
from scripts.split_passages_v2 import create_passage_set, normalize_text, source_body

KANT = ROOT / "care_library/historical_adoptions/HISTORICAL_08CA0D44DA3910D06024"
HUME = ROOT / "care_library/projects/A_TREATISE_OF_HUMAN_NATURE_DAVID_HUME"
BERGSON = ROOT / "care_library/projects/MATIERE_ET_MEMOIRE_HENRI_BERGSON"
SPECS = [
    dict(slug="kant", title="The Critique of Pure Reason", author="Immanuel Kant",
         edition="J. M. D. Meiklejohn translation · Gutenberg eText #4280",
         source_url="https://www.gutenberg.org/ebooks/4280", project="KANT_PURE_REASON",
         root=KANT / "artifacts", lock=KANT / "project/care.lock.json",
         seal="SEAL_KPR_B9D86551EDC807AAA095", year="1781 / 1787",
         description="What can we know—and what gives a claim the right to call itself knowledge?"),
    dict(slug="hume", title="A Treatise of Human Nature", author="David Hume",
         edition="Original English · Gutenberg eText #4705 · retained 2012 transcription",
         source_url="https://www.gutenberg.org/ebooks/4705", project="A_TREATISE_OF_HUMAN_NATURE_DAVID_HUME",
         root=HUME, lock=HUME / "care.lock.json", seal="SEAL_THN_B3917927880001FF07EB",
         year="1739–1740", description="How do perceptions become beliefs, a self, and a world held in common?"),
    dict(slug="bergson", title="Matière et mémoire", author="Henri Bergson",
         edition="Original French · retained transcription of the 1939 text",
         source_url="https://classiques.uqam.ca/classiques/bergson_henri/matiere_et_memoire/matiere_et_memoire.html",
         project="MATIERE_ET_MEMOIRE_HENRI_BERGSON", root=BERGSON,
         lock=BERGSON / "care.lock.json", seal="SEAL_MEMA_71BE568F831CC37C00A0",
         year="1896", language_code="fr", language_name="Français",
         description="Comment la mémoire éclaire-t-elle la relation du corps à l’esprit ?"),
]

# These are the saved translations approved for the three-book public reading
# room. Pin both sides: a later translation or a revised source must be reviewed
# explicitly, rather than silently entering the public export through a query.
SAVED_TRANSLATION_PINS = {
    "CH_MEMA_CID2": dict(id="CAREVAR_20261004T165401046809Z_851d1d38", version="v1",
        source_sha256="e055658b39fa773a9411a9711d7f6e54bb391a4a1122a1f207913ba5ff52a4c6",
        sha256="e681890a3b0fc19eed8e12e1e06b9949274fd2e56bbe207f91f6b61865579a76"),
    "CH_MEMA_CID3": dict(id="CAREVAR_20261004T173429802879Z_7d41061d", version="v1",
        source_sha256="caffb9f71b69dc347ad38b334dbdff8cf50b3de8e8f376cbe2e8d6c49afa7919",
        sha256="a43b17ce8c025d5a218375dea27189e3b527938d808b3b26c91630a28b111d78"),
    "CH_MEMA_CIDL": dict(id="CAREVAR_20261004T173454594394Z_7dd621e3", version="v1",
        source_sha256="652bce029e4ee39acdcb1f9668df8f0a0661ac9cab46ab4ec59f2bfa46053abd",
        sha256="4957804ac1bea6c8b08c34b6b1a78ebf738e50af00ee5053d74612eb13e3b16c"),
    "CH_MEMA_CI_2": dict(id="CAREVAR_20261004T173521898423Z_f7c64f8a", version="v1",
        source_sha256="dde34c01f6d1a82c3e845648da195e21c4d5c6bf8af473f88a7747e6dcc7eac5",
        sha256="f0f3d54ab8f20c1fc72d184c5adc491c81db8c63eec84c36b8b236b74746d0a3"),
    "WB_MEMA": dict(id="CAREVAR_20261004T173606737609Z_42a967fa", version="WB_MEMA@R002",
        source_sha256="fe8e8e473d065fac44aba1b25cd5192942f8dd066d63508b49affee17bc1ee36",
        sha256="55253263337baa1c5f358942ba2aae02ceec3bf6c2ca26c9bc5bad7d61608b06"),
}

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_translation_record(source, translated):
    """Only the saved title, section names and prose may differ from the source."""
    uid = source["care_unit"]["care_unit_id"]
    original_items, translated_items = source["items"], translated.get("items", [])
    require([item.get("care_item_id") for item in translated_items] ==
            [item["care_item_id"] for item in original_items],
            f"{uid}: translation changed item identities, order or completeness")
    restored = copy.deepcopy(translated)
    restored.pop("translation", None)
    restored["care_unit"]["title"] = source["care_unit"].get("title", "")
    if "language" in source["care_unit"]:
        restored["care_unit"]["language"] = source["care_unit"]["language"]
    else:
        restored["care_unit"].pop("language", None)
    for original, replacement in zip(original_items, restored["items"]):
        require(isinstance(replacement.get("item_text"), str) and replacement["item_text"].strip(),
                f"{uid}: empty translated item")
        require(isinstance(replacement.get("section_name"), str) and replacement["section_name"].strip(),
                f"{uid}: empty translated section name")
        for key in ("section_name", "item_text"):
            replacement[key] = original[key]
    require(restored == source, f"{uid}: translation changed source references or record structure")


def saved_translations(con, work, unit, record, traces, grounding):
    """Load only explicitly pinned saved renditions; never run a translation."""
    uid = unit["id"]
    pin = SAVED_TRANSLATION_PINS.get(uid)
    if pin is None:
        return []
    require(unit["sha256"] == pin["source_sha256"], f"{uid}: translation source is no longer the approved revision")
    row = con.execute("SELECT * FROM care_sheet_variants WHERE variant_id=?", (pin["id"],)).fetchone()
    require(row is not None, f"{uid}: approved translation is missing")
    variant = dict(row)
    require(variant["canonical_unit_id"] == uid and variant["work_id"] == work["id"],
            f"{uid}: translation belongs to another source")
    expected_source_id = f"canonical:{uid}:{pin['version']}"
    require(variant["version_label"] == pin["version"] and variant["source_variant_id"] == expected_source_id,
            f"{uid}: translation source version changed")
    path = Path(variant["json_path"]).resolve()
    translation_root = (ROOT / "care_library/translations").resolve()
    require(translation_root in path.parents and path.is_file(), f"{uid}: translation is outside the saved translation library")
    require(sha(path) == variant["content_sha256"] == pin["sha256"], f"{uid}: saved translation hash mismatch")
    translated = read(path)
    validate_translation_record(record, translated)
    metadata = translated.get("translation", {})
    language = variant["language_code"]
    require(language in LANGUAGE_BY_CODE and language != unit["language_code"], f"{uid}: invalid translation language")
    require(metadata.get("schema") == "care-sheet-translation/1.0" and
            metadata.get("canonical_identifiers_preserved") is True and
            metadata.get("source_variant_id") == expected_source_id and
            metadata.get("source_language_code") == variant["source_language_code"] == unit["language_code"] and
            metadata.get("target_language_code") == translated["care_unit"].get("language") == language,
            f"{uid}: translation provenance does not match the pinned source")
    return [dict(id=variant["variant_id"], language_code=language,
        language_name=language_name(language, native=True),
        title=translated["care_unit"].get("title") or unit["title"],
        sections=sections(translated, traces, grounding),
        source_sha256=pin["source_sha256"], sha256=pin["sha256"], revision=unit["revision"],
        source_variant_id=expected_source_id, source_language_code=unit["language_code"],
        rendition_type=variant["rendition_type"], review_status=variant["review_status"],
        model=variant["model"], created=variant["created_at"])]

def validate_grounding_packet(source, chapter, chapter_markdown_sha256, packet, frozen, aligned):
    """Validate identity and unchanged prose, without judging semantic support."""
    uid = source["ch_unit_id"]
    expected_frozen = dict(
        care_unit_id=uid, ch_content_hash=chapter_markdown_sha256,
        item_count=len(chapter["items"]),
        items=[dict(care_item_id=i["care_item_id"], item_text=i["item_text"])
               for i in chapter["items"]],
    )
    require(frozen == expected_frozen, f"{uid}: frozen chapter wording/order changed")
    metadata = packet["passage_set"]
    require(metadata["raw_unit_id"] == source["raw_unit_id"], f"{uid}: foreign passage set")
    require(aligned.get("alignment_metadata", {}).get("ch_content_hash") == chapter_markdown_sha256,
            f"{uid}: alignment chapter hash mismatch")
    for key in ("passage_set_id", "passage_set_checksum"):
        require(aligned.get("alignment_metadata", {}).get(key) == metadata[key],
                f"{uid}: alignment {key} mismatch")
    errors = validate_alignment(frozen, packet, aligned)
    require(not errors, f"{uid}: invalid grounding: {errors[:5]}")

def kant_grounding(spec, source_info, artifacts):
    """Read only completed R001 receipts for the explicitly pinned Kant seal."""
    packets, alignments, unit_metadata, pending = {}, {}, {}, []
    summary = dict(method="supplemental-passage-alignment", revision="R001",
                   expected_chapters=len(source_info), completed_chapters=0,
                   claims=0, aligned_claims=0, unresolved_claims=0, passage_edges=0,
                   review="unreviewed", prose_preserved=True)
    seal = read(spec["root"] / "seals" / f"{spec['seal']}.json")
    require(seal["seal_id"] == spec["seal"], "Kant seal identity mismatch")
    pins = {u["unit_id"]: u for u in seal["units"]}
    for raw_id, source in source_info.items():
        uid = source["ch_unit_id"]
        folder = spec["root"] / "grounding_revisions" / uid / "R001"
        receipt_path = folder / "public_grounding_receipt.json"
        if not receipt_path.exists():
            pending.append(uid)
            continue
        receipt = read(receipt_path)
        require(receipt.get("prose_preserved") is True, f"{uid}: prose preservation not recorded")
        require(receipt.get("review_status") == "unreviewed", f"{uid}: unexpected review status")
        chapter_artifact, raw_artifact = artifacts[uid], artifacts[raw_id]
        chapter_path = spec["root"] / chapter_artifact["json_path"]
        markdown_path = spec["root"] / chapter_artifact["markdown_path"]
        raw_path = spec["root"] / raw_artifact["markdown_path"]
        for aid, artifact in ((uid, chapter_artifact), (raw_id, raw_artifact)):
            for key in ("json_sha256", "markdown_sha256"):
                require(artifact[key] == pins[aid][key], f"{aid}: artifact differs from fixed seal")
        require(sha(chapter_path) == chapter_artifact["json_sha256"] == receipt["chapter_json_sha256"],
                f"{uid}: chapter JSON hash mismatch")
        require(sha(markdown_path) == chapter_artifact["markdown_sha256"] == receipt["chapter_markdown_sha256"],
                f"{uid}: chapter Markdown hash mismatch")
        require(sha(raw_path) == raw_artifact["markdown_sha256"] == source["source_sha256"] == receipt["source_sha256"],
                f"{uid}: source hash mismatch")
        alignment_path = folder / "passage_traces.json"
        require(sha(alignment_path) == receipt["alignment_sha256"], f"{uid}: alignment hash mismatch")
        packet = read(folder / "passage_set.json")
        raw_text = raw_path.read_text(encoding="utf-8")
        require(packet == create_passage_set(raw_id, raw_text), f"{uid}: passage set differs from pinned source")
        normalized = normalize_text(source_body(raw_text))
        # CARE's existing splitter can reflow whitespace and uses approximate
        # character offsets in that case. Verify the full ordered wording,
        # rather than treating those estimates as exact character locations.
        words = lambda value: re.sub(r"\s+", " ", value).strip()
        require(words("\n\n".join(p["text"] for p in packet["passages"])) == words(normalized),
                f"{uid}: passage sequence changes source wording")
        frozen = read(folder / "frozen_ch.json")
        aligned = read(alignment_path)
        validate_grounding_packet(source, read(chapter_path), chapter_artifact["markdown_sha256"], packet, frozen, aligned)
        packets[raw_id] = packet
        unresolved = 0
        for alignment in aligned["alignments"]:
            iid = alignment["care_item_id"]
            require(iid not in alignments, f"{iid}: duplicate supplemental alignment")
            alignments[iid] = dict(type=alignment["trace_type"], confidence=alignment["confidence"],
                                   note=alignment.get("alignment_note") or "", review="unreviewed",
                                   revision="R001", method="supplemental-passage-alignment",
                                   passage_ids=alignment["passage_ids"])
            unresolved += alignment["trace_type"] == "Unresolved"
            summary["passage_edges"] += len(alignment["passage_ids"])
        metadata = aligned["alignment_metadata"]
        unit_metadata[uid] = dict(
            method="supplemental-passage-alignment", revision="R001", review="unreviewed",
            integrity="hash-matched", prose_preserved=True,
            source_id=raw_id, source_sha256=receipt["source_sha256"],
            chapter_json_sha256=receipt["chapter_json_sha256"],
            chapter_markdown_sha256=receipt["chapter_markdown_sha256"],
            alignment_sha256=receipt["alignment_sha256"], receipt_sha256=sha(receipt_path),
            frozen_sha256=sha(folder / "frozen_ch.json"), passage_set_sha256=sha(folder / "passage_set.json"),
            passage_set_id=metadata["passage_set_id"], passage_set_checksum=metadata["passage_set_checksum"],
            model=metadata.get("model", ""), created=metadata.get("created_at", ""),
            claims=len(aligned["alignments"]), unresolved_claims=unresolved,
        )
        summary["completed_chapters"] += 1
        summary["claims"] += len(aligned["alignments"])
        summary["unresolved_claims"] += unresolved
    summary["aligned_claims"] = summary["claims"] - summary["unresolved_claims"]
    summary["pending_chapters"] = pending
    summary["complete"] = not pending
    return packets, alignments, unit_metadata, summary

def sections(record, traces=None, grounding=None):
    grouped = OrderedDict()
    for raw in record["items"]:
        key = (str(raw["section_number"]), raw["section_name"])
        group = grouped.setdefault(key, dict(number=key[0], name=key[1], items=[]))
        iid = raw["care_item_id"]
        item = dict(
            id=iid, text=raw["item_text"],
            refs=list(dict.fromkeys(raw.get("source_trace") or [])),
            deep_refs=list(dict.fromkeys(raw.get("deep_source_trace") or [])),
            trace_type=raw.get("trace_type") or "",
            passages=(traces or {}).get(iid, []),
        )
        if iid in (grounding or {}):
            alignment = grounding[iid]
            item["grounding"] = {k:v for k,v in alignment.items() if k != "passage_ids"}
            item["passages"] = [dict(id=pid, type=alignment["type"], review=alignment["review"],
                                     confidence=alignment["confidence"], note=alignment["note"])
                                for pid in alignment["passage_ids"]]
        group["items"].append(item)
    return list(grouped.values())

def sealed_grounding(spec, source_info, artifacts):
    """Export saved passage alignments only when they match the sealed source/CH."""
    packets, alignments = {}, {}
    for raw_id, source in source_info.items():
        uid = source["ch_unit_id"]
        artifact = artifacts[uid]
        folder = spec["root"] / "grounding_revisions" / uid / artifact["revision_id"]
        packet_path = folder / f"{raw_id}_v1.json"
        if not packet_path.exists():
            continue
        packet = read(packet_path)
        frozen = read(folder / f"{uid}_FROZEN_ITEMS.json")
        aligned = read(folder / f"{uid}_PASSAGE_TRACES_v1.json")
        source_path = spec["root"] / artifacts[raw_id]["markdown_path"]
        chapter_path = spec["root"] / artifact["json_path"]
        require(sha(source_path) == artifacts[raw_id]["markdown_sha256"], f"{raw_id}: source differs from seal")
        require(sha(chapter_path) == artifact["json_sha256"], f"{uid}: chapter differs from seal")
        normalized = normalize_text(source_body(source_path.read_text(encoding="utf-8")))
        require(hashlib.sha256(normalized.encode()).hexdigest() == packet["passage_set"]["source_checksum"],
                f"{raw_id}: grounding uses a different source")
        words = lambda value: re.sub(r"\s+", " ", value).strip()
        require(words("\n\n".join(p["text"] for p in packet["passages"])) == words(normalized),
                f"{raw_id}: passage wording changed")
        chapter_markdown = spec["root"] / artifact["markdown_path"]
        require(sha(chapter_markdown) == artifact["markdown_sha256"], f"{uid}: chapter Markdown differs from seal")
        require(frozen == parse_ch(chapter_markdown.read_text(encoding="utf-8")), f"{uid}: frozen reading differs from sealed Markdown")
        require(not validate_alignment(frozen, packet, aligned), f"{uid}: invalid saved passage alignment")
        metadata = aligned["alignment_metadata"]
        require(metadata["ch_content_hash"] == artifact["markdown_sha256"] and
                metadata["passage_set_checksum"] == packet["passage_set"]["passage_set_checksum"] and
                metadata["passage_set_id"] == packet["passage_set"]["passage_set_id"], f"{uid}: alignment identity mismatch")
        packets[raw_id] = packet
        for row in aligned["alignments"]:
            alignments[row["care_item_id"]] = dict(type=row["trace_type"], confidence=row["confidence"],
                note=row.get("alignment_note") or "", review="unreviewed", method="saved-passage-alignment",
                revision=artifact["revision_id"], passage_ids=row["passage_ids"])
    require(len(packets) == len(source_info), "Bergson grounding is incomplete")
    return packets, alignments

def export(require_kant_grounding=False):
    con = sqlite3.connect(f"file:{ROOT / 'care_library/care.db'}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    result = dict(format="care-public-library/1", exported="2026-10-05", works=[])
    files = []
    for spec in SPECS:
        lock = read(spec["lock"])
        graph = {n["unit_id"]: n for n in lock["graph"] if not n.get("excluded")}
        source_info = {s["raw_unit_id"]: s for s in lock["sources"] if not s.get("excluded")}
        records = [dict(r) for r in con.execute(
            "SELECT * FROM published_artifacts WHERE project_key=? AND seal_id=?",
            (spec["project"], spec["seal"]))]
        assert len(records) == len(graph), (spec["slug"],len(records),len(graph))
        by_id = {r["unit_id"]:r for r in records}
        seal = read(spec["root"] / "seals" / f"{spec['seal']}.json")
        pins = {row["unit_id"]:row for row in seal["units"]}
        for uid, artifact in by_id.items():
            require(uid in pins and all(artifact[key] == pins[uid][key] for key in ("json_sha256", "markdown_sha256")),
                    f"{uid}: published record differs from pinned seal")
        work = {k:spec[k] for k in ("slug","title","author","edition","source_url","year","description")}
        work.update(language_code=spec.get("language_code", "en"), language_name=spec.get("language_name", "English"))
        work["cover_url"] = f"./assets/covers/{spec['slug']}.png"
        work.update(id=lock["work_id"], seal=spec["seal"], units=[], sources=[])
        packets, grounding, grounding_units = {}, {}, {}
        if spec["slug"] == "kant":
            packets, grounding, grounding_units, summary = kant_grounding(spec, source_info, by_id)
            require(not require_kant_grounding or summary["complete"],
                    f"Kant grounding incomplete: {summary['completed_chapters']}/{summary['expected_chapters']}")
            work["grounding"] = summary
        elif spec["slug"] == "bergson":
            packets, grounding = sealed_grounding(spec, source_info, by_id)
        trace_map = {}
        if spec["slug"] == "hume":
            for r in con.execute("SELECT care_item_id, passage_id, trace_type, review_status FROM passage_traces WHERE care_item_id LIKE 'CH_THN_%'"):
                trace_map.setdefault(r["care_item_id"],[]).append(dict(id=r["passage_id"],type=r["trace_type"],review=r["review_status"]))
        for uid,node in graph.items():
            artifact = by_id[uid]
            if node["stage"] == "RAW":
                info = source_info[uid]
                path = spec["root"] / artifact["markdown_path"]
                assert sha(path) == artifact["markdown_sha256"], uid
                text = path.read_text(encoding="utf-8")
                text = re.sub(r"\A---\n.*?\n---\n", "", text, flags=re.S).strip()
                passage_file = spec["root"] / "passage_sets" / f"{uid}_v1.json"
                paragraphs = []
                if uid in packets:
                    for p in packets[uid]["passages"]:
                        paragraphs.append(dict(id=p["passage_id"],text=p["text"],kind="passage",
                                               checksum=p["checksum"]))
                elif passage_file.exists():
                    for p in read(passage_file)["passages"]:
                        paragraphs.append(dict(id=p["passage_id"],text=p["text"],kind="passage"))
                else:
                    # Display addresses are NOT represented as recorded CARE passage anchors.
                    for i,p in enumerate(re.split(r"\n\s*\n", text),1):
                        paragraphs.append(dict(id=f"{uid}:DISPLAY-{i:04d}",text=p,kind="display"))
                work["sources"].append(dict(id=uid,title=info["title"],order=info["sequence"],chapter_id=info["ch_unit_id"],text=text,paragraphs=paragraphs,sha256=artifact["markdown_sha256"]))
                work["sources"][-1].update(language_code=work["language_code"], language_name=work["language_name"], translations=[])
                if uid in packets:
                    work["sources"][-1]["passage_set"] = packets[uid]["passage_set"]
                continue
            path = spec["root"] / artifact["json_path"]
            assert sha(path) == artifact["json_sha256"], uid
            record = read(path)
            source = next((s for s in source_info.values() if s["ch_unit_id"]==uid),None)
            labels = {"CL":"Cluster", "MC":"Metacluster", "WB":"Whole book"}
            title = source["title"] if source else record["care_unit"].get("title") or (spec["title"] if node["stage"]=="WB" else f"{labels[node['stage']]} {node['ordinal']}")
            work["units"].append(dict(id=uid,layer=node["stage"],title=title,order=node["ordinal"],parents=node["parent_ids"],revision=artifact["revision_id"],sha256=artifact["json_sha256"],sections=sections(record,trace_map,grounding)))
            version = SAVED_TRANSLATION_PINS.get(uid, {}).get("version", record["care_unit"].get("version", "v1"))
            language_run = con.execute("SELECT output_language_code FROM care_language_runs WHERE care_unit_id=? AND version_label=?", (uid, version)).fetchone()
            language = language_run["output_language_code"] if language_run else "en"
            require(language in LANGUAGE_BY_CODE, f"{uid}: unknown canonical language")
            work["units"][-1].update(language_code=language, language_name=language_name(language, native=True))
            work["units"][-1]["translations"] = saved_translations(con, work, work["units"][-1], record, trace_map, grounding)
            if uid in grounding_units:
                work["units"][-1]["grounding"] = grounding_units[uid]
        work["sources"].sort(key=lambda s:s["order"])
        work["units"].sort(key=lambda u:(["CH","CL","MC","WB"].index(u["layer"]),u["order"]))
        result["works"].append(work)
    lateral_path = ROOT / "care_library/lateral_runs/XR/XR_KPR_THN/R01/XR_KPR_THN_R01.json"
    original = read(lateral_path)
    record = load_lateral_care_record(dict(json_path=str(lateral_path),unit_id="XR_KPR_THN",stage="XR"))
    assert original["metadata"]["input_units"] == ["WB_THN","WB_KPR"]
    result["lateral"] = dict(id="XR_KPR_THN",layer="XR",title="Kant × Hume",revision="R01",mode="Diagnostic",parents=["WB_THN","WB_KPR"],sha256=sha(lateral_path),created=original["metadata"]["created_at"],sections=sections(record),pins=[{k:p[k] for k in ("unit_id","revision_id","seal_id","content_sha256")} for p in original["metadata"]["published_source_pins"]])
    result["lateral"].update(language_code="en", language_name="English", translations=[])
    nodes = {}
    for w in result["works"]:
        for s in w["sources"]:
            nodes[s["id"]] = s
            for p in s["paragraphs"]: nodes[p["id"]] = p
        for u in w["units"]:
            nodes[u["id"]] = u
            for s in u["sections"]:
                for i in s["items"]:
                    assert i["id"] not in nodes,i["id"]
                    nodes[i["id"]] = i
    for s in result["lateral"]["sections"]:
        for i in s["items"]: nodes[i["id"]] = i
    unresolved = []
    for iid,node in nodes.items():
        for ref in node.get("refs",[])+node.get("deep_refs",[])+[p["id"] for p in node.get("passages",[])]:
            if ref not in nodes: unresolved.append([iid,ref])
    assert not unresolved, unresolved[:10]
    translated_sheets = [dict(work=w["slug"], unit_id=u["id"], language_code=t["language_code"],
        variant_id=t["id"], source_sha256=t["source_sha256"], sha256=t["sha256"])
        for w in result["works"] for u in w["units"] for t in u["translations"]]
    require(len(translated_sheets) == len(SAVED_TRANSLATION_PINS), "Approved translations were not all exported")
    con.close()
    DEST.mkdir(exist_ok=True)
    encoded = json.dumps(result,ensure_ascii=False,separators=(",",":"))
    assert "/Users/" not in encoded and "api_key" not in encoded.lower()
    (DEST/"library.json").write_text(encoded,encoding="utf-8")
    audit = dict(works=[dict(slug=w["slug"],seal=w["seal"],sections=len(w["sources"]),units=len(w["units"]),items=sum(len(s["items"]) for u in w["units"] for s in u["sections"])) for w in result["works"]],lateral_items=sum(len(s["items"]) for s in result["lateral"]["sections"]),unresolved_references=unresolved,bytes=len(encoded.encode()),sha256=hashlib.sha256(encoded.encode()).hexdigest())
    audit["kant_grounding"] = result["works"][0]["grounding"]
    audit["saved_translations"] = translated_sheets
    (DEST/"export-audit.json").write_text(json.dumps(audit,indent=2)+"\n")
    print(json.dumps(audit,indent=2))

if __name__ == "__main__": export(require_kant_grounding="--require-kant-grounding" in sys.argv[2:])
