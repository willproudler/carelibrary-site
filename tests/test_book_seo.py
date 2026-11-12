"""Book search output only uses attested exports and the existing CARE reader."""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

SITE = Path(__file__).resolve().parents[1]
TOOLS = SITE / "tools"
spec = importlib.util.spec_from_file_location("care_book_seo", TOOLS / "book_seo.py")
seo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seo)
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))


def _book(identity="WORK_ONE", title="A Book of Memory", author="Ada Example", reader_slug="existing-book"):
    return {"id": identity, "slug": reader_slug, "seal": "SEAL_" + identity,
            "title": title, "author": author, "year": "1781 / 1787",
            "edition": "Saved edition", "description": "An attested description of the book.",
            "language_code": "en", "language_name": "English", "source_url": "https://example.org/edition",
            "sources": [{"id": "RAW_" + identity, "title": "The First Chapter", "text": "Exact original source needle, preserved as saved.", "paragraphs": []}],
            "units": [{"id": "WB_" + identity, "title":"Saved whole-book reading", "layer": "WB", "sections": [{"number":"1","name":"Argumental Spine","items": [{"id":"WB_"+identity+":A1","text": "A generated interpretation is not original author prose.","refs":[],"deep_refs":[],"passages":[]}]}]}]}


def _publish(root: Path, works: list[dict], *, split=False):
    data = root / "data"
    data.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps({"format": "care-public-library/1", "exported": "2026-11-11", "works": works}, ensure_ascii=False) + "\n").encode()
    sha = hashlib.sha256(raw).hexdigest()
    if split:
        parts = []
        for chunk in (raw[:len(raw)//2], raw[len(raw)//2:]):
            digest = hashlib.sha256(chunk).hexdigest()
            name = f"library-parts/{digest}.jsonpart"
            (data / "library-parts").mkdir(exist_ok=True)
            (data / name).write_bytes(chunk)
            parts.append({"path": name, "bytes": len(chunk), "sha256": digest})
        (data / "library.json").write_text(json.dumps({"format": "care-public-library-parts/1", "parts": parts, "bytes": len(raw), "sha256": sha}))
    else:
        (data / "library.json").write_bytes(raw)
    (data / "export-audit.json").write_text(json.dumps({"works": [{"slug": work["slug"], "seal": work["seal"]} for work in works], "bytes": len(raw), "sha256": sha}))
    # Exercise progressive enhancement with the actual shell contract: retain
    # these elements and assets rather than inventing a replacement reader.
    (root / "library.html").write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>CARE Library</title><link rel="stylesheet" href="./library.css"></head><body><div id="existing-native-reader">Reader shell</div><script type="module" src="./library-boot.mjs"></script></body></html>')
    return raw


class BookSearchPageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self):
        self.temporary.cleanup()

    def test_metadata_and_public_text_share_the_correct_existing_reader_and_canonical(self):
        work = _book()
        original = _publish(self.root, [work])
        (self.root / "private-draft.txt").write_text("Do not publish my private draft.")
        pages = seo.build(self.root)
        manifest = json.loads((self.root / "books/manifest.json").read_text())
        entry, = manifest["books"]
        chapter, = manifest["chapters"]
        self.assertEqual(entry["slug"], "a-book-of-memory-ada-example")
        self.assertEqual(entry["route_slug"], "examplebookofmemory")
        self.assertEqual(entry["url"], "/examplebookofmemory")
        self.assertEqual(entry["reader_slug"], "existing-book")
        metadata = (self.root / entry["path"]).read_text()
        chapter_metadata = (self.root / chapter["path"]).read_text()
        full = (self.root / chapter["text_path"]).read_text()
        self.assertIn("A Book of Memory by Ada Example | CARE Library", metadata)
        self.assertNotIn("Exact original source needle", metadata)
        self.assertNotIn("Exact original source needle", chapter_metadata)
        self.assertIn("Exact original source needle", full)
        self.assertNotIn("A generated interpretation", full)
        self.assertIn('href="/library.html#book=existing-book&amp;source=RAW_WORK_ONE"', full)
        self.assertIn("The First Chapter", metadata)
        self.assertIn('href="/examplebookofmemory/001-the-first-chapter/"', metadata)
        self.assertIn('id="existing-native-reader"', metadata)
        self.assertIn("library-boot.mjs", metadata)
        self.assertIn('id="care-search-route"', metadata)
        self.assertIn('"book":"existing-book"', metadata.replace(" ", ""))
        self.assertIn('"sources":["RAW_WORK_ONE"]', metadata.replace(" ", ""))
        self.assertIn('"source":"RAW_WORK_ONE"', chapter_metadata.replace(" ", ""))
        self.assertIn('id="care-search-content"', metadata)
        self.assertIn('href="https://carelibrary.org/examplebookofmemory"', metadata)
        self.assertIn('"@type":"Book"', metadata)
        self.assertIn('"@type":"Chapter"', chapter_metadata)
        self.assertNotIn('"datePublished"', metadata)
        self.assertTrue(manifest["text_requires_public_library"])
        self.assertEqual(self.root.joinpath("data/library.json").read_bytes(), original)
        self.assertEqual(len(pages), 6)
        self.assertNotIn("text_path", entry)
        self.assertIn("/books/a-book-of-memory-ada-example/",entry["aliases"])
        mapping=json.loads((self.root/"book-routes.json").read_text())
        self.assertEqual(mapping["books"][0]["url"],"/examplebookofmemory")
        self.assertNotIn("chapters",mapping)
        self.assertIn('id="care-book-routes"',metadata)
        self.assertEqual((self.root/"library.html").read_text().count('id="care-book-routes"'),1)
        self.assertFalse((self.root / "books" / entry["slug"] / "text.html").exists())
        self.assertFalse((self.root / "books/private-draft.txt").exists())
        css = (self.root / "books/books.css").read_text()
        self.assertIn("#care-search-content .source-body", css)
        self.assertNotIn("}a{", css)

    def test_readable_slugs_handle_accents_unicode_and_collisions_deterministically(self):
        works = [_book("W1", "Mémoire et matière", "Henri Bergson", "one"),
                 _book("W2", "Mémoire et matière", "Henri Bergson", "two"),
                 _book("W3", "論語", "孔子", "three")]
        slugs = seo.book_slugs(works)
        self.assertEqual(slugs, seo.book_slugs(list(reversed(works))))
        self.assertNotEqual(slugs["W1"], slugs["W2"])
        self.assertTrue(slugs["W1"].startswith("memoire-et-matiere-henri-bergson-"))
        self.assertEqual(slugs["W3"], "論語-孔子")

    def test_compact_root_routes_are_author_first_ascii_and_collision_safe(self):
        works=[_book("PLATO","Timaeus","Plato","plato"),
               _book("KANT","The Critique of Pure Reason","Immanuel Kant","kant"),
               _book("AUGUSTINE","Confessions","Augustine of Hippo","augustine"),
               _book("FRENCH","Mémoire et matière","Henri Bergson","bergson")]
        routes=seo.book_routes(works)
        self.assertEqual(routes["PLATO"],"platotimaeus")
        self.assertEqual(routes["KANT"],"kantcritiqueofpurereason")
        self.assertEqual(routes["AUGUSTINE"],"augustineconfessions")
        self.assertEqual(routes["FRENCH"],"bergsonmemoireetmatiere")
        self.assertEqual(routes,seo.book_routes(list(reversed(works))))
        suffix=hashlib.sha256(b"A").hexdigest()[:10]
        collisions=[_book("A","Same","X","a"),_book("B","Same","X","b"),
                    _book("C","Same"+suffix,"X","c"),_book("RESERVED","i","ap","reserved")]
        collision_routes=seo.book_routes(collisions)
        self.assertEqual(len(set(collision_routes.values())),4)
        self.assertEqual(collision_routes["C"],"xsame"+suffix)
        self.assertNotEqual(collision_routes["A"],collision_routes["C"])
        self.assertNotEqual(collision_routes["RESERVED"],"api")
        self.assertTrue(all(value.isascii() and value.isalnum() and value==value.lower() for value in collision_routes.values()))

    def test_changed_or_missing_split_bytes_never_fall_back_to_an_old_library(self):
        works = [_book()]
        _publish(self.root, works, split=True)
        self.assertEqual(seo.load_attested_library(self.root)[0]["works"][0]["id"], "WORK_ONE")
        descriptor = json.loads((self.root / "data/library.json").read_text())
        first = self.root / "data" / descriptor["parts"][0]["path"]
        first.write_bytes(b"")
        with self.assertRaisesRegex(ValueError, "changed|incomplete"):
            seo.build(self.root)
        self.assertFalse((self.root / "books").exists())
        first.unlink()
        with self.assertRaisesRegex(ValueError, "missing"):
            seo.load_attested_library(self.root)

    def test_unattested_books_and_path_traversal_are_rejected(self):
        _publish(self.root, [_book()])
        audit = json.loads((self.root / "data/export-audit.json").read_text())
        audit["works"][0]["seal"] = "ANOTHER_SEAL"
        (self.root / "data/export-audit.json").write_text(json.dumps(audit))
        with self.assertRaisesRegex(ValueError, "attested publication"):
            seo.build(self.root)
        _publish(self.root, [_book()], split=True)
        descriptor = json.loads((self.root / "data/library.json").read_text())
        descriptor["parts"][0]["path"] = "../../private.jsonpart"
        (self.root / "data/library.json").write_text(json.dumps(descriptor))
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            seo.load_attested_library(self.root)

    def test_source_markup_is_escaped_and_rebuild_prunes_removed_book_pages(self):
        first = _book("W1", "Book <script>alert(1)</script>")
        first["sources"][0]["text"] = '</div><script>privateCode()</script> & exact source'
        second = _book("W2", "Another book", reader_slug="second")
        _publish(self.root, [first, second])
        seo.build(self.root)
        manifest = json.loads((self.root / "books/manifest.json").read_text())
        entries = {entry["work_id"]: entry for entry in manifest["books"]}
        chapters = {entry["work_id"]: entry for entry in manifest["chapters"]}
        full = (self.root / chapters["W1"]["text_path"]).read_text()
        self.assertNotIn('<script>privateCode()</script>', full)
        self.assertIn('&lt;script&gt;privateCode()&lt;/script&gt;', full)
        self.assertIn('\\u003cscript\\u003e', full)
        _publish(self.root, [first])
        seo.build(self.root)
        self.assertFalse((self.root / entries["W2"]["path"]).exists())

    def test_each_source_search_page_contains_only_its_own_bounded_text(self):
        work = _book()
        first, second = "First source exact wording. " * 6000, "Second source unique wording. " * 6000
        work["sources"] = [{"id": "RAW_A", "title": "First Chapter", "text": first},
                           {"id": "RAW_B", "title": "Second Chapter", "text": second}]
        _publish(self.root, [work])
        seo.build(self.root)
        manifest = json.loads((self.root / "books/manifest.json").read_text())
        first_entry, second_entry = manifest["chapters"]
        main = self.root / manifest["books"][0]["path"]
        self.assertLess(main.stat().st_size, 45000)
        text_a = (self.root / first_entry["text_path"]).read_text()
        self.assertTrue(first.strip() in text_a)
        self.assertFalse(second.strip() in text_a)
        self.assertIn('"source":"RAW_A"', text_a.replace(" ", ""))
        self.assertLess(len(text_a.encode()), len(first.encode()) + 45000)
        self.assertIn('"source":"RAW_B"', (self.root / second_entry["text_path"]).read_text().replace(" ", ""))

    def test_unmanaged_book_folders_are_never_overwritten(self):
        _publish(self.root, [_book()])
        (self.root / "books").mkdir()
        note = self.root / "books/notes.txt"
        note.write_text("Personal notes")
        with self.assertRaisesRegex(ValueError, "not generated"):
            seo.build(self.root)
        self.assertEqual(note.read_text(), "Personal notes")

    def test_identical_rebuild_keeps_library_and_generated_page_bytes_identical(self):
        _publish(self.root,[_book()])
        seo.build(self.root)
        manifest=json.loads((self.root/"books/manifest.json").read_text())
        paths=[self.root/"library.html",self.root/"book-routes.json",
               self.root/manifest["books"][0]["path"],self.root/manifest["chapters"][0]["text_path"]]
        previous={path:path.read_bytes() for path in paths}
        seo.build(self.root)
        for path in paths:
            self.assertEqual(path.read_bytes(),previous[path],str(path))


if __name__ == "__main__":
    unittest.main()
