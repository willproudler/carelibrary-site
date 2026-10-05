"""Safety checks for the public export's already-saved translation snapshots.

Run with the CARE Python environment:
  .venv/bin/python -m unittest discover -s website-redesign/tests -p 'test_translation_export.py'
"""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import unittest


SITE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("public_translation_export", SITE / "tools/export_public_library.py")
exporter = importlib.util.module_from_spec(spec)
arguments = sys.argv[:]
try:
    sys.argv = [str(spec.origin), str(SITE.parent)]
    spec.loader.exec_module(exporter)
finally:
    sys.argv = arguments


class TranslationExportTests(unittest.TestCase):
    def setUp(self):
        self.source = {"care_unit": {"care_unit_id": "CH_EXAMPLE", "title": "Titre", "version": "v1"},
            "items": [{"care_item_id": "CH_EXAMPLE:AS1", "section_number": "1", "section_name": "Arguments",
                "item_text": "Texte français", "source_trace": ["RAW_EXAMPLE:P0001"], "deep_source_trace": []},
                {"care_item_id": "CH_EXAMPLE:AS2", "section_number": "1", "section_name": "Arguments",
                "item_text": "Autre texte", "source_trace": ["RAW_EXAMPLE:P0002"], "deep_source_trace": []}]}
        self.translated = copy.deepcopy(self.source)
        self.translated["care_unit"].update(title="Title", language="en")
        self.translated["translation"] = {"schema": "care-sheet-translation/1.0"}
        for item in self.translated["items"]:
            item.update(section_name="Argumental Spine", item_text="Saved English text")

    def test_translation_allows_only_presentation_wording(self):
        exporter.validate_translation_record(self.source, self.translated)

    def test_incomplete_or_reordered_translation_is_rejected(self):
        for items in (self.translated["items"][:1], list(reversed(self.translated["items"]))):
            with self.subTest(items=items), self.assertRaisesRegex(ValueError, "identities, order or completeness"):
                exporter.validate_translation_record(self.source, {**self.translated, "items": items})

    def test_rewritten_route_or_foreign_source_is_rejected(self):
        self.translated["items"][0]["source_trace"] = ["RAW_FOREIGN:P0001"]
        with self.assertRaisesRegex(ValueError, "source references or record structure"):
            exporter.validate_translation_record(self.source, self.translated)

    def test_empty_translation_is_rejected(self):
        self.translated["items"][0]["item_text"] = "  "
        with self.assertRaisesRegex(ValueError, "empty translated item"):
            exporter.validate_translation_record(self.source, self.translated)

    def test_stale_source_hash_is_rejected_before_loading_translation(self):
        with self.assertRaisesRegex(ValueError, "no longer the approved revision"):
            exporter.saved_translations(None, {}, {"id": "WB_MEMA", "sha256": "different-revision"}, {}, {}, {})

    def test_export_is_limited_to_five_saved_bergson_sheets(self):
        library = json.loads((SITE / "data/library.json").read_text())
        exported = []
        for work in library["works"]:
            self.assertEqual(work["cover_url"], f"./assets/covers/{work['slug']}.png")
            for source in work["sources"]:
                self.assertEqual(source["translations"], [])
            for unit in work["units"]:
                for translation in unit["translations"]:
                    self.assertEqual(work["slug"], "bergson")
                    self.assertEqual(unit["language_code"], "fr")
                    self.assertEqual(translation["language_code"], "en")
                    self.assertEqual(translation["source_sha256"], unit["sha256"])
                    self.assertEqual(translation["review_status"], "machine")
                    originals = [item for section in unit["sections"] for item in section["items"]]
                    translated = [item for section in translation["sections"] for item in section["items"]]
                    self.assertEqual([{k: v for k, v in item.items() if k != "text"} for item in originals],
                                     [{k: v for k, v in item.items() if k != "text"} for item in translated])
                    exported.append(unit["id"])
        self.assertEqual(set(exported), set(exporter.SAVED_TRANSLATION_PINS))
        self.assertEqual(len(exported), 5)
        self.assertEqual(library["lateral"]["translations"], [])


if __name__ == "__main__":
    unittest.main()
