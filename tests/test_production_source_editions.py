from __future__ import annotations

from copy import deepcopy
import hashlib
from io import BytesIO
from pathlib import Path
import re
import sys
import tempfile
import unittest
from xml.etree import ElementTree as ET
import zipfile
import zlib

TOOLS = Path(__file__).resolve().parents[1] / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))
from source_editions import build_source_editions, source_reading_blocks, book_edition_downloads


def work():
    return {"id": "WORK_1", "title": "Περὶ μνήμης & <λόγου>", "author": "Auteur [A]",
            "language_code": "grc", "language_name": "Ancient Greek", "edition": "Saved 1890 edition",
            "source_url": "https://example.org/edition", "source_notices": {
                "provider": "Archive", "licence": "https://example.org/license", "statement": "Retain this notice.",
                "attribution": "Edited by A & B", "private_path": "/Users/private/never-export"},
            "sources": [{"id": "RAW_2", "order": 2, "title": "Πρῶτον", "text": "λόγος  καὶ μνήμη\n\n<script>alert(1)</script> **literal** 😀",
                         "translations": [{"language_code": "en", "text": "DO NOT SUBSTITUTE TRANSLATION"}]},
                        {"id": "RAW_1", "order": 1, "title": "Δεύτερον", "paragraphs": [{"text": "Πέρας."}, {"text": "Τέλος."}]}],
            "units": [{"sections": [{"items": [{"text": "DO NOT EXPORT GENERATED ANALYSIS"}]}]}]}


class SourceEditionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self):
        self.temporary.cleanup()

    def build(self, value=None):
        return build_source_editions(value or work(), "greek-book", "authorgreekbook", self.root, "https://carelibrary.org")

    def test_complete_original_downloads_preserve_published_order_wording_and_notices(self):
        value = work()
        original = deepcopy(value)
        declarations = self.build(value)
        self.assertEqual([row["format"] for row in declarations], ["txt", "md", "epub", "pdf", "docx"])
        for declaration in declarations:
            # output_dir is itself the staged books root, not the web root.
            path = self.root / declaration["path"].removeprefix("books/")
            payload = path.read_bytes()
            self.assertEqual(declaration["sha256"], hashlib.sha256(payload).hexdigest())
            self.assertEqual(declaration["bytes"], len(payload))
            self.assertEqual(declaration["url"], "/authorgreekbook/downloads/source." + declaration["format"])
        text = (self.root / "greek-book/downloads/source.txt").read_text()
        self.assertTrue(text.startswith(value["title"] + "\n" + value["author"] + "\n\nΠρῶτον\n\n" + value["sources"][0]["text"]))
        self.assertIn(value["sources"][0]["text"], text)
        self.assertLess(text.index("Πρῶτον"), text.index("Δεύτερον"))
        self.assertIn("Πέρας.\n\nΤέλος.", text)
        self.assertIn("Retain this notice.", text)
        self.assertIn("Edited by A & B", text)
        self.assertGreater(text.index("Retain this notice."), text.index("Τέλος."))
        self.assertNotIn("never-export", text)
        self.assertNotIn("DO NOT", text)
        self.assertEqual(value, original)

    def test_epub_has_xml_navigation_language_and_exact_escaped_source_text(self):
        self.build()
        payload = (self.root / "greek-book/downloads/source.epub").read_bytes()
        with zipfile.ZipFile(BytesIO(payload)) as archive:
            first = archive.infolist()[0]
            self.assertEqual(first.filename, "mimetype")
            self.assertEqual(first.compress_type, zipfile.ZIP_STORED)
            self.assertEqual(archive.read(first), b"application/epub+zip")
            for entry in archive.infolist():
                self.assertEqual(entry.date_time, (2000, 1, 1, 0, 0, 0))
                if entry.filename.endswith((".xml", ".xhtml", ".opf")):
                    ET.fromstring(archive.read(entry))
            ns = {"h": "http://www.w3.org/1999/xhtml", "dc": "http://purl.org/dc/elements/1.1/",
                  "opf": "http://www.idpf.org/2007/opf"}
            chapter = ET.fromstring(archive.read("EPUB/chapter-1.xhtml"))
            self.assertEqual(chapter.attrib["lang"], "grc")
            self.assertEqual(chapter.find(".//h:header/h:h1", ns).text, work()["title"])
            self.assertEqual(chapter.find(".//h:header/h:p", ns).text, work()["author"])
            self.assertEqual(chapter.find(".//h:body/h:h2", ns).text, work()["sources"][0]["title"])
            source = chapter.find(".//h:div[@class='source-text']", ns)
            self.assertEqual("".join(source.itertext()), work()["sources"][0]["text"])
            self.assertIsNone(chapter.find(".//h:script", ns))
            package = ET.fromstring(archive.read("EPUB/package.opf"))
            self.assertEqual(package.find(".//dc:language", ns).text, "grc")
            self.assertEqual(package.find(".//opf:spine/opf:itemref", ns).get("idref"), "chapter-1")
            self.assertIn("Source rights statement: Retain this notice.", [r.text for r in package.findall(".//dc:rights", ns)])
            self.assertTrue(package.find(".//opf:item[@properties='nav']", ns) is not None)
            nav = ET.fromstring(archive.read("EPUB/nav.xhtml"))
            self.assertEqual([link.attrib["href"] for link in nav.findall(".//h:a", ns)],
                             ["chapter-1.xhtml", "chapter-2.xhtml"])

    def test_markdown_literal_text_never_executes_saved_html(self):
        self.build()
        markdown = (self.root / "greek-book/downloads/source.md").read_text()
        self.assertNotIn("<script>", markdown)
        self.assertIn("&lt;script&gt;", markdown)
        self.assertIn(r"\*\*literal\*\*", markdown)
        self.assertTrue(markdown.startswith("# Περὶ μνήμης &amp; &lt;λόγου&gt;\n\nAuteur \\[A\\]\n\n## Πρῶτον\n\nλόγος"))

    def test_untitled_section_begins_with_its_own_words_and_keeps_verse_lines(self):
        value = {**work(), "sources": [{"text": "  First line\nSecond line\n\nThird line."}]}
        self.build(value)
        prefix = value["title"] + "\n" + value["author"] + "\n\n" + value["sources"][0]["text"]
        self.assertTrue((self.root / "greek-book/downloads/source.txt").read_text().startswith(prefix))
        with zipfile.ZipFile(self.root / "greek-book/downloads/source.epub") as archive:
            body = ET.fromstring(archive.read("EPUB/chapter-1.xhtml")).find("{*}body")
            self.assertEqual([child.tag.split("}")[1] for child in body], ["header", "div"])
            self.assertEqual(body.find("{*}div/{*}p").get("class"), "lineated")

    def test_reading_text_opens_with_source_headings_and_collects_provenance_at_the_end(self):
        marker = '<!-- CARE_TEI_PAGE {"n": "[1]", "facs": "#f0020"} -->'
        merge = "<!-- CARE merged source: material.md; title: Saved chapter; sequence: 3 -->"
        scan = "[Source scan 9 · printed page 6](https://example.org/scans/9)"
        value = {**work(), "original_title": "Alternate catalogue language",
                 "sources": [{"title": "Translated label", "original_title": "Original section",
                              "text": marker + "\n\n" + merge + "\n\n## Part I\n\n### Ideas\n\n" + scan +
                                      "\n\nA sentence.\n\n[Visual material: PDF page 3, region 1]\n\n[illegible]"},
                             {"title": "Translated label two", "original_title": "Second original section",
                              "text": "The last sentence."}]}
        self.build(value)
        path = self.root / "greek-book/downloads"
        txt = (path / "source.txt").read_text()
        opening, references = txt.split("Source references", 1)
        self.assertTrue(opening.startswith(value["title"] + "\n" + value["author"] + "\n\nPart I\n\nIdeas"))
        self.assertIn("A sentence.", opening)
        self.assertIn("[illegible]", opening)
        self.assertIn("Second original section\n\nThe last sentence.", opening)
        for unwanted in ("Original section", "##", "CARE_TEI_PAGE", "CARE merged source", "Source scan", "PDF page", "Translated label"):
            self.assertNotIn(unwanted, opening)
        for preserved in ("Page [1] · facsimile #f0020", "Source scan 9", "https://example.org/scans/9", "PDF page 3", "material.md"):
            self.assertIn(preserved, references)
        md = (path / "source.md").read_text()
        self.assertIn("\n## Part I\n\n### Ideas\n", md)
        with zipfile.ZipFile(path / "source.epub") as archive:
            front = ET.fromstring(archive.read("EPUB/chapter-1.xhtml"))
            self.assertEqual(front.find(".//{*}div/{*}h2").text, "Part I")
            self.assertEqual(front.find(".//{*}div/{*}h3").text, "Ideas")
            self.assertEqual(front.find(".//{*}div/{*}p").text, "A sentence.")
            self.assertIsNone(front.find(".//{*}body/{*}h2"))
            refs = ET.fromstring(archive.read("EPUB/references.xhtml"))
            self.assertEqual(refs.find(".//{*}a").get("href"), "https://example.org/scans/9")
            package = ET.fromstring(archive.read("EPUB/package.opf"))
            self.assertEqual(package.find(".//{*}spine")[-1].get("idref"), "references")

    def test_duplicate_byline_and_transcription_navigation_leave_the_original_opening(self):
        value = {**work(), "sources": [{"title": "By Auteur [A]", "original_title": "Par Auteur [A]",
                                        "text": "Retour à la table des matières\n\nDébut."}]}
        self.build(value)
        txt = (self.root / "greek-book/downloads/source.txt").read_text()
        self.assertTrue(txt.startswith(value["title"] + "\nAuteur [A]\n\nDébut.\n"))
        self.assertNotIn("Par Auteur", txt)
        self.assertIn("Retour à la table des matières", txt.split("Source references")[1])

    def test_only_explicit_machine_tokens_are_relocated_and_code_remains_literal(self):
        marker = '<!-- CARE_TEI_PAGE {"n": "2", "facs": "#f0021"} -->'
        other = '<!-- CARE_TEI_PAGE {"n": "2", "note": "original testimony"} -->'
        raw = ("Part one " + marker + " part two.\n\n" + other + "\n\n"
               + "```text\n\n## Literal heading\n" + marker + "\n\n```\n\n"
               + "The literal `" + marker + "` remains.\n\n"
               + "Retour à la table des matières\npour l’explication.\n\n"
               + "An embedded [Source scan 9](https://example.org/9) remains.")
        blocks, notes = source_reading_blocks(raw)
        self.assertEqual(len(notes), 1)
        self.assertFalse(any(level for level, _, _ in blocks))
        self.assertEqual("".join(text + after for _, text, after in blocks), raw.replace(marker, "", 1))

    def test_word_preserves_unicode_and_pdf_has_embedded_bookmarks(self):
        self.build()
        folder=self.root/'greek-book/downloads'
        with zipfile.ZipFile(folder/'source.docx') as archive:
            xml=ET.fromstring(archive.read('word/document.xml'))
            body=' '.join(node.text or '' for node in xml.findall('.//{*}t'))
            self.assertIn('λόγος  καὶ μνήμη',body)
            self.assertIn('Edited by A & B',body)
            self.assertNotIn('DO NOT EXPORT',body)
        pdf=(folder/'source.pdf').read_bytes()
        self.assertTrue(pdf.startswith(b'%PDF-'))
        self.assertIn(b'/Outlines',pdf)
        self.assertIn(b'/ToUnicode',pdf)
        maps = []
        for payload in re.findall(rb"stream\r?\n(.*?)endstream", pdf, re.DOTALL):
            try:
                stream = zlib.decompress(payload)
            except zlib.error:
                continue
            if b"begincmap" in stream:
                maps.append(stream)
        self.assertIn(b"<D83DDE00>", b"".join(maps))

    def test_recorded_axioms_are_only_in_explicitly_selected_appendix_files(self):
        value=work()
        value['units']=[{'id':'WB_TEST','layer':'WB','language_code':'grc','revision':'WB_TEST@R1',
                         'sections':[{'name':'Global Load-Bearing Axioms','items':[{'id':'WB:GLA-01','text':'Commentary only.'}]}]}]
        built=book_edition_downloads(value,[{'language_code':'grc'}],'greek-book','authorgreekbook',self.root,'https://carelibrary.org')['grc']
        self.assertEqual({row['format'] for row in built['axiom_downloads']},{'pdf','epub'})
        for key in ('downloads','axiom_downloads'):
            record=next(row for row in built[key] if row['format']=='epub')
            with zipfile.ZipFile(self.root/record['path'].removeprefix('books/')) as archive:
                words=' '.join(''.join(ET.fromstring(archive.read(page)).itertext()) for page in archive.namelist() if page.endswith('.xhtml'))
            self.assertEqual('Commentary only.' in words,key=='axiom_downloads')
            self.assertEqual('Appendix · Saved CARE axioms' in words,key=='axiom_downloads')

    def test_downloads_are_byte_deterministic(self):
        first = self.build()
        before = {row["format"]: (self.root / row["path"].removeprefix("books/")).read_bytes() for row in first}
        self.assertEqual(self.build(), first)
        self.assertEqual(before, {row["format"]: (self.root / row["path"].removeprefix("books/")).read_bytes() for row in first})

    def test_incomplete_sections_do_not_offer_a_complete_book(self):
        for sources in ([], [{"id": "A", "title": "Missing"}],
                        [{"text": "Saved"}, {"translations": [{"text": "Translation alone"}]}],
                        [{"paragraphs": [{"text": "Saved"}, {"text": ""}]}]):
            with self.subTest(sources=sources):
                value = {**work(), "sources": sources}
                self.assertEqual(self.build(value), [])
                self.assertFalse((self.root / "greek-book").exists())

    def test_unsafe_destination_and_xml_text_fail_before_writing(self):
        with self.assertRaises(ValueError):
            build_source_editions(work(), "../outside", "book", self.root, "https://carelibrary.org")
        bad = work()
        bad["sources"][0]["text"] = "invalid\x00XML"
        with self.assertRaises(ValueError):
            self.build(bad)
        self.assertFalse((self.root / "greek-book").exists())
        (self.root / "greek-book").symlink_to(self.root / "other", target_is_directory=True)
        with self.assertRaises(ValueError):
            self.build()


if __name__ == "__main__":
    unittest.main()
