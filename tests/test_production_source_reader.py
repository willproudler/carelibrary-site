"""Quiet source documents keep their text, citations and saved editions intact."""
from copy import deepcopy
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from book_seo import build
from source_reader import source_page
from test_book_seo import _book, _publish


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.scripts, self.links, self.ids, self.elements, self.options = [], [], [], [], []
        self.source_copy, self._source_depth, self._option = [], 0, None
        self._select = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.elements.append((tag, attrs))
        if tag == "script":
            self.scripts.append(attrs)
        if tag in {"a", "link"}:
            self.links.append(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "select":
            self._select = attrs.get("id")
        if tag == "option" and self._select == "reader-language":
            self._option = [attrs, ""]
        if tag == "div" and "source-text" in attrs.get("class", "").split():
            self._source_depth = 1
        elif self._source_depth and tag not in {"br", "hr", "img", "input", "meta", "link"}:
            self._source_depth += 1

    def handle_endtag(self, tag):
        if tag == "select":
            self._select = None
        if tag == "option" and self._option is not None:
            self.options.append(self._option)
            self._option = None
        if self._source_depth:
            self._source_depth -= 1

    def handle_data(self, value):
        if self._source_depth:
            self.source_copy.append(value)
        if self._option is not None:
            self._option[1] += value

    @property
    def source_text(self):
        return "".join(self.source_copy)

    @property
    def passages(self):
        return [attrs for tag, attrs in self.elements
                if tag == "div" and "source-passage" in attrs.get("class", "").split()]


def structured_data(html):
    scripts = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    if len(scripts) != 1:
        raise AssertionError("A source document must identify exactly one canonical edition.")
    return json.loads(scripts[0]), scripts[0]


class SourceReaderTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)

    def publish(self, work):
        _publish(self.root, [work])
        build(self.root)
        return json.loads((self.root / "books/manifest.json").read_text())

    def assert_standalone(self, html):
        page = Document(html)
        self.assertEqual(len([script for script in page.scripts
                              if script.get("type") == "application/ld+json"]), 1)
        self.assertEqual(len([script for script in page.scripts if "data-reader-opening-script" in script and not script.get("src")]), 1)
        enhancements = [script for script in page.scripts if script.get("type") != "application/ld+json" and "data-reader-opening-script" not in script]
        self.assertEqual(len(enhancements), 1)
        for script in enhancements:
            self.assertEqual(script.get("type"), "module")
            self.assertIn("data-source-reader-runtime", script)
            if script.get("src"):
                address = urlsplit(script["src"])
                self.assertEqual((address.scheme, address.netloc, address.path), ("", "", "/books/source-reader.mjs"))
        for link in page.links:
            if link.get("rel") == "stylesheet":
                address = urlsplit(link["href"])
                self.assertEqual((address.scheme, address.netloc, address.path), ("", "", "/books/source-reader.css"))
        for asset in ("library-boot.mjs", "seo-shell.mjs", "public-app.mjs", "study-desk.mjs"):
            self.assertNotIn(asset, html)
        self.assertTrue(all(attrs.get("class") == "document-title" for tag, attrs in page.elements if tag == "header"))
        self.assertFalse(any(tag == "footer" for tag, _ in page.elements))
        self.assertTrue({"reader-navigation", "reader-tools", "reader-language", "text-size",
                         "passage-toggle", "aq-toggle"} <= set(page.ids))
        self.assertEqual(len(page.ids), len(set(page.ids)))
        return page

    def test_book_and_chapters_preserve_original_passage_anchors_without_loading_care(self):
        work = _book()
        work.update(language_code="fr", language_name="Français", edition="Édition originale")
        work["sources"] = [
            {"id": "RAW_ONE", "title": "Première leçon", "text": "Un texte exact.\n\nUne suite.",
             "paragraphs": [{"id": "RAW_ONE:P1", "text": "Un texte exact."}, {"id": "RAW_ONE:P2", "text": "Une suite."}],
             "translations": [{"language_code": "en", "text": "A partial translation stays separate."}]},
            {"id": "RAW_TWO", "title": "Deuxième leçon", "text": "La deuxième leçon."},
        ]
        manifest = self.publish(work)
        book = manifest["books"][0]
        html = (self.root / book["text_path"]).read_text()
        page = self.assert_standalone(html)
        self.assertTrue(book["has_text"])
        self.assertIn("Un texte exact.", page.source_text)
        self.assertIn("La deuxième leçon.", page.source_text)
        self.assertNotIn("A partial translation", html)
        self.assertNotIn("A generated interpretation", html)
        self.assertIn('<html lang="fr">', html)
        self.assertIn("Édition originale", html)
        self.assertIn("ref=RAW_ONE:P1", page.ids)
        self.assertEqual([passage.get("data-passage-id") for passage in page.passages if passage.get("id")],
                         ["RAW_ONE:P1", "RAW_ONE:P2"])
        self.assertEqual({row["format"] for row in book["downloads"]}, {"txt", "md", "epub", "pdf", "docx"})
        self.assertTrue(any(link.get("href") == "/library.html#book=existing-book" for link in page.links))
        self.assertEqual([row["language_code"] for row in book["editions"]], ["fr"])
        for chapter in manifest["chapters"]:
            with self.subTest(source=chapter["source_id"]):
                chapter_html = (self.root / chapter["text_path"]).read_text()
                chapter_page = self.assert_standalone(chapter_html)
                structured, _ = structured_data(chapter_html)
                self.assertEqual(structured["@type"], "Chapter")
                self.assertEqual(structured["identifier"], chapter["source_id"])
                self.assertIn("Whole book", chapter_html)
                self.assertEqual("La deuxième leçon." in chapter_page.source_text, chapter["source_id"] == "RAW_TWO")

    def test_unmatched_passages_get_display_marks_and_incomplete_sources_have_no_downloads(self):
        work = _book()
        work["sources"] = [
            {"id": "RAW_ONE", "title": "First", "text": "Preserved text.",
             "paragraphs": [{"id": "BAD:P1", "text": "Different wording."}]},
            {"id": "RAW_TWO", "title": "Not published", "paragraphs": []},
        ]
        manifest = self.publish(work)
        book = manifest["books"][0]
        html = (self.root / book["text_path"]).read_text()
        page = self.assert_standalone(html)
        self.assertIn("Preserved text.", page.source_text)
        self.assertNotIn("ref=BAD:P1", page.ids)
        self.assertTrue(all(not passage.get("id") and not passage.get("data-passage-id") for passage in page.passages))
        self.assertTrue(any(tag == "span" and "passage-marker" in attrs.get("class", "").split()
                            and "data-passage-number" in attrs for tag, attrs in page.elements))
        self.assertEqual(book["downloads"], [])
        self.assertFalse(any("download" in link for link in page.links))
        self.assertIn("has not been published", html)

    def test_source_provenance_and_saved_links_are_safe_html(self):
        work = _book()
        work["sources"][0]["text"] = '<script>alert("source")</script> & exact prose\n\n[Bad](javascript:evil)'
        work["edition"] = '</p><script>alert("edition")</script>'
        work["source_notices"] = {"attribution": "<img src=x onerror=evil()>", "licence": "Edition-specific licence"}
        work["source_url"] = "javascript:evil()"
        manifest = self.publish(work)
        html = (self.root / manifest["books"][0]["text_path"]).read_text()
        page = self.assert_standalone(html)
        self.assertNotIn("<script>alert(", html)
        self.assertIn("&lt;script&gt;alert(", html)
        self.assertNotIn("<img src=x", html)
        self.assertFalse(any(link.get("href", "").startswith("javascript:") for link in page.links))
        self.assertIn("Edition-specific licence", html)

    def test_chapter_jsonld_roundtrips_original_title_characters_without_script_injection(self):
        work = _book()
        work["title"] = 'Book <title> & "</script><script>book()</script>"'
        work["author"] = "Author <A> & B"
        source = work["sources"][0]
        source["title"] = 'Chapter <one> & "</script><script>chapter()</script>"'
        manifest = self.publish(work)
        chapter = manifest["chapters"][0]
        html = (self.root / chapter["text_path"]).read_text()
        self.assert_standalone(html)
        structured, encoded = structured_data(html)
        self.assertNotIn("<", encoded)
        self.assertNotIn(">", encoded)
        self.assertNotIn("&", encoded)
        self.assertIn(r"\u003c", encoded)
        self.assertNotIn(r"\\u003c", encoded)
        self.assertEqual(structured["@type"], "Chapter")
        self.assertEqual(structured["name"], source["title"])
        self.assertEqual(structured["isPartOf"]["name"], work["title"])
        self.assertEqual(structured["isPartOf"]["author"]["name"], work["author"])
        self.assertEqual(structured["identifier"], source["id"])
        self.assertEqual(structured["url"], "https://carelibrary.org" + chapter["url"])

    def test_complete_saved_language_pages_keep_their_canonicals_text_and_navigation(self):
        work = _book()
        work.update(language_code="fr", language_name="Français")
        work["sources"] = []
        for index, french, english in ((1, "Première leçon", "First lesson"), (2, "Deuxième leçon", "Second lesson")):
            work["sources"].append({
                "id": f"RAW_{index}", "title": french, "text": f"Original français {index}.",
                "paragraphs": [{"id": f"RAW_{index}:P1", "text": f"Original français {index}."}],
                "translations": [{"id": f"EN_{index}", "language_code": "en", "language_name": "English",
                                  "rendition_type": "machine", "review_status": "unreviewed", "title": english,
                                  "paragraphs": [{"id": f"RAW_{index}:P1", "text": f"Saved English source {index}."}]}],
            })
        work["sources"][0]["translations"].append({"language_code": "de", "language_name": "Deutsch", "text": "Partial German."})
        original = deepcopy(work)
        manifest = self.publish(work)
        self.assertEqual(work, original)
        book = manifest["books"][0]
        self.assertEqual({row["language_code"] for row in book["editions"]}, {"fr", "en"})
        original_html = (self.root / book["text_path"]).read_text()
        self.assertNotIn("Saved English source", original_html)
        translation = next(row for row in book["editions"] if row["kind"] == "translation")
        translated_html = (self.root / translation["path"]).read_text()
        translated_page = self.assert_standalone(translated_html)
        self.assertIn('<html lang="en">', translated_html)
        self.assertIn("Saved machine translation", translated_html)
        self.assertIn("unreviewed", translated_html)
        self.assertIn("Download English edition", translated_html)
        for row in translation['downloads']:
            self.assertIn('/language/en/downloads/', row['url'])
            self.assertIn(row['url'], translated_html)
        translated_txt = next(row for row in translation['downloads'] if row['format']=='txt')
        exported = (self.root / translated_txt['path']).read_text()
        self.assertIn('Saved English source 1.', exported)
        self.assertNotIn('Original français', exported)
        self.assertIn('Saved machine translation',exported)
        self.assertNotIn("Original français", translated_page.source_text)
        self.assertNotIn("Partial German.", translated_html)
        self.assertIn("Saved English source 1.", translated_page.source_text)
        self.assertIn("Saved English source 2.", translated_page.source_text)
        self.assertTrue(all(not passage.get("id") and not passage.get("data-passage-id")
                            for passage in translated_page.passages))
        selected = [attrs["value"] for attrs, _ in translated_page.options if "selected" in attrs]
        self.assertEqual(selected, [translation["url"]])
        self.assertEqual({attrs["value"] for attrs, _ in translated_page.options},
                         {row["url"] for row in book["editions"]})
        book_data, _ = structured_data(translated_html)
        self.assertEqual(book_data["url"], "https://carelibrary.org" + translation["url"])
        self.assertEqual(book_data["inLanguage"], "en")
        expected_chapter_urls = {
            row["url"] for chapter in manifest["chapters"] for row in chapter["editions"] if row["kind"] == "translation"
        }
        book_links = {link.get("href") for link in translated_page.links}
        self.assertTrue(expected_chapter_urls <= book_links)
        for chapter in manifest["chapters"]:
            with self.subTest(chapter=chapter["source_id"]):
                record = next(row for row in chapter["editions"] if row["kind"] == "translation")
                html = (self.root / record["path"]).read_text()
                page = self.assert_standalone(html)
                data, _ = structured_data(html)
                self.assertEqual(data["url"], "https://carelibrary.org" + record["url"])
                self.assertEqual(data["inLanguage"], "en")
                self.assertEqual(data["identifier"], chapter["source_id"])
                self.assertTrue(all(not passage.get("id") for passage in page.passages))
                selected = [attrs["value"] for attrs, _ in page.options if "selected" in attrs]
                self.assertEqual(selected, [record["url"]])
                links = {link.get("href") for link in page.links}
                self.assertTrue(expected_chapter_urls <= links)
                self.assertIn("Saved English source " + chapter["source_id"].split("_")[-1] + ".", page.source_text)

    def test_all_reading_tools_share_one_library_panel_and_cover_has_only_title_and_byline(self):
        manifest = self.publish(_book())
        html = (self.root / manifest["books"][0]["text_path"]).read_text()
        page = self.assert_standalone(html)
        self.assertTrue(any(link.get("rel") == "stylesheet" and
                            urlsplit(link.get("href", "")).path == "/books/source-reader.css" for link in page.links))
        self.assertTrue(any(urlsplit(script.get("src", "")).path == "/books/source-reader.mjs" for script in page.scripts))
        css = (self.root / "books/source-reader.css").read_text()
        self.assertEqual(css, (ROOT / "tools/source_reader.css").read_text())
        body_style = re.search(r"body\.source-reader\s*\{([^}]+)\}", css).group(1)
        self.assertIn("min-height: 100dvh", body_style)
        self.assertIn('body[data-reader-theme="blue"]', css)
        runtime = (self.root / "books/source-reader.mjs").read_text()
        import hashlib
        module = "source-reader-pages.mjs"
        digest = hashlib.sha256((self.root / "books" / module).read_bytes()).hexdigest()[:16]
        self.assertIn(f"./{module}?v={digest}", runtime)
        self.assertEqual([attrs.get("id") for tag, attrs in page.elements if tag == "details" and attrs.get("id")], ["reader-navigation"])
        self.assertTrue({"reader-panel-tools", "reader-panel-contents", "reader-panel-pages"} <= set(page.ids))
        cover = re.search(r'<header class="document-title"[^>]*>(.*?)</header>', html, re.S).group(1)
        self.assertEqual(re.findall(r">([^<>]+)<", cover), [_book()["title"], _book()["author"]])
        body = next(attrs for tag, attrs in page.elements if tag == "body")
        self.assertEqual(body["data-reader-theme"], "green")
        self.assertEqual((body["data-passages"], body["data-aq"]), ("false", "false"))

    def test_standalone_preview_can_inline_only_its_small_reading_enhancement(self):
        html = source_page(_book(), "examplebook", "https://carelibrary.org", [], inline_assets=True)
        page = self.assert_standalone(html)
        self.assertFalse(any(script.get("src") for script in page.scripts))
        self.assertIn("data-source-reader-runtime", html)
        self.assertIn("--reader-canvas", html)

    def test_generated_original_and_language_html_end_with_real_newlines(self):
        work = _book()
        work["language_code"], work["language_name"] = "fr", "Français"
        work["sources"][0]["translations"] = [{"language_code": "en", "language_name": "English", "text": "Saved English."}]
        manifest = self.publish(work)
        for entry in [*manifest["books"], *manifest["chapters"]]:
            paths = {entry["text_path"], *(record["path"] for record in entry["editions"])}
            for relative in paths:
                with self.subTest(path=relative):
                    html = (self.root / relative).read_text()
                    self.assertTrue(html.endswith("</html>\n"))
                    self.assertFalse(html.endswith(r"</html>\n"))


if __name__ == "__main__":
    unittest.main()
