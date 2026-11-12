"""Deterministic plain Markdown for saved CARE readings; no I/O or generation."""
from __future__ import annotations

import json
import re
from copy import deepcopy
from html import escape
from typing import Callable
from urllib.parse import quote, unquote

READING_TEXT_EXPORT_VERSION = "care-readable-text/1.1"


def rendition_anchor(rendition: dict, item_id: str) -> str:
    """Canonical item anchors remain stable; saved translations are distinct."""
    anchor = "ref=" + quote(str(item_id), safe="")
    if rendition.get("rendition_type") != "canonical":
        identity = rendition.get("id") or (str(rendition.get("language_code") or "unknown") + ":" + str(rendition.get("sha256") or "saved"))
        anchor += "&rendition=" + quote(str(identity), safe="")
    return anchor


def _citation(metadata, rendition, identity, reference_url):
    canonical = str(metadata.get("canonical_url") or "")
    if canonical.startswith(("https://", "http://")):
        return canonical + "#" + rendition_anchor(rendition, identity)
    citation = reference_url(identity) if reference_url else canonical
    if citation and rendition.get("rendition_type") != "canonical":
        variant = rendition_anchor(rendition, identity).partition("&")[2]
        citation += ("&" if "?" in citation else "?") + variant
    return citation


def render_reading_packet(metadata: dict, renditions: list[dict],
                          reference_url: Callable[[str], str] | None = None) -> dict:
    """A structured saved-reading packet, with no inferred logical relations."""
    fields = ("title", "book_title", "book_author", "work_id", "unit_id", "layer", "revision",
              "content_sha256", "source_sha256", "public_export_sha256", "canonical_url", "parents", "source_id", "context")
    packet = {"schema": "care-reading-packet/1", "exporter": READING_TEXT_EXPORT_VERSION,
              "content_kind": "saved-generated-care-analysis",
              "attribution": "Generated CARE analysis; not original author prose.",
              "relationship_policy": "References and alignments are recorded evidence links; no entailments are inferred.",
              "metadata": {key: deepcopy(metadata[key]) for key in fields if metadata.get(key) not in (None, "")},
              "renditions": deepcopy(renditions)}
    for rendition in packet["renditions"]:
        for section_order, section in enumerate(rendition.get("sections", []), 1):
            section["order"] = section_order
            for item_order, item in enumerate(section.get("items", []), 1):
                item["order"] = item_order
                item["citation_anchor"] = rendition_anchor(rendition, str(item["id"]))
                citation = _citation(metadata, rendition, str(item["id"]), reference_url)
                if citation:
                    item["citation_url"] = citation
    return packet


def _label(value) -> str:
    return re.sub(r"([\\`*\[\]<>])", r"\\\1", " ".join(str(value or "").split()))


def render_reading_markdown(metadata: dict, renditions: list[dict],
                            reference_url: Callable[[str], str] | None = None) -> str:
    """Retain every saved item and trace, with explicit source/analysis attribution.

    Callers select saved renditions and establish their identity before calling.
    Wording is emitted unchanged; this function never paraphrases or translates.
    """
    lines = [f"# {_label(metadata.get('title') or metadata['unit_id'])} — CARE {_label(metadata['layer'])} reading", "",
             "Generated CARE analysis; not original author prose.", ""]
    fields = (("Source book", "book_title"), ("Author of source book", "book_author"),
              ("Work ID", "work_id"), ("CARE unit ID", "unit_id"), ("Layer", "layer"),
              ("Saved revision", "revision"), ("Content SHA-256", "content_sha256"),
              ("Source SHA-256", "source_sha256"), ("Attested public export SHA-256", "public_export_sha256"),
              ("Canonical citation", "canonical_url"))
    lines += [f"- {label}: {_label(metadata[key])}" for label, key in fields if metadata.get(key)]
    if metadata.get("parents"):
        lines.append("- Recorded parent units: " + ", ".join(_label(value) for value in metadata["parents"]))
    lines += ["", "These are saved readings and recorded evidence links. A recorded confidence or alignment is not a claim of independent verification.", ""]

    def reference(identity):
        identity = str(identity)
        url = reference_url(identity) if reference_url else ""
        return f"[{_label(identity)}]({url})" if url else _label(identity)

    for rendition in renditions:
        kind = rendition.get("kind") or ("Canonical saved CARE rendition" if rendition.get("rendition_type") == "canonical" else "Saved CARE translation")
        language = rendition.get("language_name") or rendition.get("language_code") or "Language not recorded"
        lines += [f"## {_label(kind)} — {_label(language)}", ""]
        for label, key in (("Rendition", "rendition_type"), ("Language code", "language_code"),
                           ("Saved model", "model"), ("Recorded review status", "review_status"),
                           ("Rendition ID", "id"), ("Source SHA-256", "source_sha256"), ("Rendition SHA-256", "sha256")):
            if rendition.get(key):
                lines.append(f"- {label}: {_label(rendition[key])}")
        lines.append("")
        for section in rendition.get("sections", []):
            heading = " · ".join(str(section.get(key) or "") for key in ("number", "name") if section.get(key) not in (None, ""))
            lines += ["### " + _label(heading or "Saved section"), ""]
            if section.get("original_name") and section["original_name"] != section.get("name"):
                lines += ["Saved original section label: " + _label(section["original_name"]), ""]
            for item in section.get("items", []):
                identity = str(item["id"])
                lines += ['<a id="' + escape(unquote(rendition_anchor(rendition, identity)), quote=True) + '"></a>', "",
                          "#### " + _label(identity), "", item["text"], ""]
                if citation := _citation(metadata, rendition, identity, reference_url):
                    lines += ["Citation: [" + _label(identity) + "](" + citation + ")", ""]
                for label, key in (("Recorded references", "refs"), ("Recorded deep references", "deep_refs"),
                                   ("Recorded matrix references", "matrix_trace")):
                    if item.get(key):
                        lines += [label + ": " + "; ".join(reference(value) for value in item[key]), ""]
                if item.get("trace_type"):
                    lines += ["Recorded trace type: " + _label(item["trace_type"]), ""]
                if item.get("passages"):
                    lines += ["Recorded passage alignments:", ""]
                    for passage in item["passages"]:
                        if isinstance(passage, str):
                            passage = {"id": passage}
                        details = {key: value for key, value in passage.items() if key != "id"}
                        suffix = " — " + json.dumps(details, ensure_ascii=False, sort_keys=True) if details else ""
                        lines.append("- " + reference(passage["id"]) + suffix)
                    lines.append("")
                if item.get("grounding"):
                    lines += ["Recorded grounding: " + json.dumps(item["grounding"], ensure_ascii=False, sort_keys=True), ""]
    return "\n".join(lines).rstrip("\n") + "\n"
