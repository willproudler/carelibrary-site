"""The public About packet preserves excerpts and exact links across refreshes."""
from __future__ import annotations

from copy import deepcopy
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


MODULE = Path(__file__).resolve().parents[1] / "tools" / "prepare_about_page.py"
spec = importlib.util.spec_from_file_location("prepare_about_page", MODULE)
about = importlib.util.module_from_spec(spec)
spec.loader.exec_module(about)


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.packet = []
        self.in_packet = False
        self.scripts = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and "data-about-open-reading" in attrs:
            self.links.append(attrs["href"])
        if tag == "script":
            self.scripts += 1
            self.in_packet = attrs.get("id") == "about-panel-data"

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_packet = False

    def handle_data(self, data):
        if self.in_packet:
            self.packet.append(data)


class AboutExamplesTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.page = self.root / "about.html"
        examples = []
        for key in ("metaphysics", "kant", "lateral"):
            examples.append(
                f'<figure data-about-live-panel="{key}">'
                '<div class="live-panel"><div class="live-fallback">Old excerpt</div></div>'
                '<a data-about-open-reading href="/library.html">Open reading</a>'
                '</figure>'
            )
        self.page.write_text('<html><body><main>' + ''.join(examples) + '</main></body></html>')
        self.original = self.page.read_bytes()
        self.text = 'Exact wording: "a < b" & </script><script>unsafe()</script>.'
        self.data = {
            "schema": "care-about-panels/1",
            "snapshot": {"public_revision": "saved-revision"},
            "panels": {
                "metaphysics": {
                    "sourceHref": "/library.html#book=metaphysics&source=RAW_META",
                    "source": {"stack": {"active_chapter": {"passages": [
                        {"id": "RAW_META:P0001", "text": "Canonical wording", "reading_text": self.text}
                    ]}}},
                },
                "kant": {
                    "chapterHref": "/library.html#book=kant&unit=CH_KANT",
                    "chapter": {"stack": {"care_path": [{"sections": [{"items": [
                        {"id": "CH_KANT:A1", "text": "A complete saved claim."}
                    ]}]}]}},
                },
                "lateral": {
                    "chapterHref": "/library.html#field=FIELD%3Alateral%3A123&scope=XR%3Acomparison%3AR01&ref=XR:A1",
                    "chapter": {"stack": {"care_path": [{"sections": [{"items": [
                        {"id": "XR:A1", "text": "A complete saved comparison."}
                    ]}]}]}},
                },
            },
        }

    def test_refresh_is_idempotent_and_preserves_exact_saved_links_and_packet(self):
        about.inject_examples(self.root, self.data)
        first = self.page.read_bytes()
        about.inject_examples(self.root, self.data)
        self.assertEqual(self.page.read_bytes(), first)
        parsed = Page()
        parsed.feed(first.decode())
        self.assertEqual(parsed.links, [
            self.data["panels"]["metaphysics"]["sourceHref"],
            self.data["panels"]["kant"]["chapterHref"],
            self.data["panels"]["lateral"]["chapterHref"],
        ])
        self.assertEqual(json.loads(''.join(parsed.packet)), self.data)
        self.assertEqual(parsed.scripts, 1)
        self.assertIn('&lt;/script&gt;&lt;script&gt;unsafe()', first.decode())
        self.assertNotIn('</script><script>unsafe()', first.decode())

    def test_invalid_destination_does_not_partially_overwrite_the_page(self):
        changed = deepcopy(self.data)
        changed["panels"]["lateral"]["chapterHref"] = "https://example.com/#ref=XR:A1"
        with self.assertRaisesRegex(ValueError, "valid Library destination"):
            about.inject_examples(self.root, changed)
        self.assertEqual(self.page.read_bytes(), self.original)

    def test_build_uses_maintained_tools_and_keeps_temporary_packets_outside_web_root(self):
        temporary_paths = []
        expected_tools = MODULE.parent.resolve()
        def generate(command, *, check):
            self.assertTrue(check)
            self.assertEqual(Path(command[1]).parent, expected_tools)
            self.assertEqual(Path(command[2]), self.root)
            self.assertFalse((self.root / "tools").exists())
            output = Path(command[3])
            self.assertFalse(output.is_relative_to(self.root))
            temporary_paths.append(output)
            if Path(command[1]).name == 'build-about-examples.mjs':
                output.write_text(json.dumps(self.data))
            elif Path(command[1]).name == 'build-about-rights.mjs':
                output.write_text('[]')
            else:
                self.fail(f"Unexpected helper: {command[1]}")
        with patch.object(about.subprocess, "run", side_effect=generate):
            about.build(self.root)
        self.assertEqual(len(temporary_paths), 2)
        self.assertTrue(all(not path.parent.exists() for path in temporary_paths))
        self.assertFalse((self.root / 'about-panel-data.json').exists())
        self.assertFalse((self.root / 'about-book-rights.json').exists())
        parsed = Page()
        parsed.feed(self.page.read_text())
        self.assertEqual(json.loads(''.join(parsed.packet)), self.data)

    def test_missing_example_fails_without_changing_existing_public_content(self):
        changed = deepcopy(self.data)
        del changed["panels"]["kant"]
        with self.assertRaisesRegex(ValueError, "incomplete"):
            about.inject_examples(self.root, changed)
        self.assertEqual(self.page.read_bytes(), self.original)


    def test_rights_dropdown_preserves_recorded_terms_and_does_not_invent_missing_licences(self):
        rows = [{"id": "WORK_A", "slug": "a", "title": "A <book>", "author": "Author",
                 "edition": "", "source_url": "javascript:unsafe()",
                 "source_notices": {"provider": "An archive", "statement": "Electronic edition rights reserved & recorded.",
                                    "licence": "https://creativecommons.org/licenses/by-sa/4.0/"}},
                {"id": "WORK_B", "slug": "b", "title": "Second", "author": "Writer",
                 "edition": None, "source_url": None, "source_notices": None}]
        fragment = about.rights_disclosure(rows)
        self.assertEqual(fragment.count('data-rights-work='), 2)
        self.assertIn('View all 2 books and source licences', fragment)
        self.assertIn('Electronic edition rights reserved &amp; recorded.', fragment)
        self.assertIn('CC BY-SA 4.0', fragment)
        self.assertIn('Edition or transcription terms not recorded.', fragment)
        self.assertIn('A &lt;book&gt;', fragment)
        self.assertNotIn('javascript:', fragment)
        with self.assertRaisesRegex(ValueError, 'unique works'):
            about.rights_disclosure([rows[0], rows[0]])


if __name__ == "__main__":
    unittest.main()
