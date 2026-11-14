"""Release staging boundaries using disposable fixtures, without running builders."""
from __future__ import annotations

import importlib.util
import gzip
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


MODULE = Path(__file__).resolve().parents[1] / "tools" / "build-production-site.py"
spec = importlib.util.spec_from_file_location("care_production_build", MODULE)
production = importlib.util.module_from_spec(spec)
spec.loader.exec_module(production)


class ProductionBuildTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.fixture_number = 0
        # These fixtures exercise the staging boundary, not real catalogue/SEO
        # generation. The real generator has separate attestation tests.
        search = patch.object(production, "build_search_pages")
        self.search_pages = search.start()
        self.addCleanup(search.stop)
        about = patch.object(production, "build_about_page")
        self.about_page = about.start()
        self.addCleanup(about.stop)

    def site(self):
        self.fixture_number += 1
        site = self.root / f"site-{self.fixture_number}"
        site.mkdir()
        for name in production.ROOT_FILES:
            (site / name).write_bytes(("approved browser file: " + name).encode())
        for name in production.ASSET_DIRECTORIES:
            (site / name).mkdir()
        for name, contents in {
            "assets/covers/book.svg": b"<svg>approved cover</svg>",
            "data/library.json": b'{"format":"care-public-library-parts/1"}',
            "data/library-parts/reviewed.jsonpart": b'{"works":[]}',
            "data/fields/reviewed.json": b'{"field":"reviewed"}',
            "native/reader.mjs": b"export const reader = 'reviewed';",
            "native/reference-viewer.html": b"<div>reviewed viewer</div>",
        }.items():
            target = site / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(contents)
        return site

    def test_only_browser_files_are_staged_and_stale_files_are_removed(self):
        site = self.site()
        excluded = {
            "server/app.py": "private server implementation",
            "tests/test_private.py": "development tests",
            "tools/private.py": "development tool",
            ".env": "SECRET=never-publish",
            ".env.production": "SECRET=never-publish",
            ".git/config": "repository settings",
            ".care-beta/accounts.sqlite3": "private database",
            "accounts.sqlite3": "private database",
            "accounts.sqlite3-wal": "private database journal",
            "email.json": "private mail configuration",
            "private.key": "private key",
            "README.md": "development notes",
        }
        for name, contents in excluded.items():
            target = site / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(contents)
        dist = site / "dist"
        dist.mkdir()
        (dist / "stale-secret.json").write_text("old build residue")

        production.copy_browser_files(site, dist)

        staged = {path.relative_to(dist).as_posix() for path in dist.rglob("*") if path.is_file()}
        expected = set(production.ROOT_FILES) | {
            "assets/covers/book.svg", "data/library.json", "data/library-parts/reviewed.jsonpart",
            "data/fields/reviewed.json", "native/reader.mjs", "native/reference-viewer.html",
        }
        self.assertEqual(staged, expected)
        self.assertTrue(staged.isdisjoint(excluded))
        for name in staged:
            self.assertEqual((dist / name).read_bytes(), (site / name).read_bytes(), name)
        for name, contents in excluded.items():
            self.assertEqual((site / name).read_text(), contents)

    def test_sensitive_or_unknown_files_in_browser_directories_fail_before_replacing_dist(self):
        for name in (
            "data/accounts.sqlite3", "data/accounts.sqlite3-wal", "native/server.py",
            "assets/private.pem", "assets/.env", "data/.private/email.json", "native/.hidden/reader.mjs",
        ):
            with self.subTest(name=name):
                site = self.site()
                dist = site / "dist"
                dist.mkdir()
                (dist / "previous.html").write_text("last known build")
                target = site / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text("not a public browser file")
                with self.assertRaises(ValueError):
                    production.copy_browser_files(site, dist)
                self.assertEqual(list(dist.iterdir()), [dist / "previous.html"])
                self.assertEqual((dist / "previous.html").read_text(), "last known build")

    def test_only_registered_reading_markdown_is_staged(self):
        site = self.site()
        name = "books/timaeus-plato/readings/wb/timaeus-unit123/reading.md"
        reading = site / name
        reading.parent.mkdir(parents=True)
        reading.write_text("# Saved CARE reading\n\nRecorded analysis.")
        manifest = {"schema": "care-reading-search-pages/1", "pages": [{
            "kind": "reading", "book_slug": "timaeus-plato", "layer_slug": "wb",
            "unit_slug": "timaeus-unit123", "markdown_path": name}]}
        (site / "books/readings-manifest.json").write_text(json.dumps(manifest))
        production.copy_browser_files(site, site / "dist")
        self.assertEqual((site / "dist" / name).read_bytes(), reading.read_bytes())
        reading.write_text(reading.read_text() * 100)
        production.copy_browser_files(site, site / "dist")
        self.assertEqual(gzip.decompress((site / "dist" / (name + ".gz")).read_bytes()), reading.read_bytes())
        private = site / "native/private-notes.md"
        private.write_text("Unregistered private notes")
        with self.assertRaisesRegex(ValueError, "Unrecognized browser asset"):
            production.copy_browser_files(site, site / "dist")
        self.assertFalse((site / "dist/native/private-notes.md").exists())

    def test_reading_markdown_manifest_cannot_allow_an_arbitrary_path(self):
        site = self.site()
        (site / "books/readings-manifest.json").write_text(json.dumps({
            "schema": "care-reading-search-pages/1", "pages": [{
                "kind": "reading", "book_slug": "../../private", "layer_slug": "wb",
                "unit_slug": "unit", "markdown_path": "private/notes.md"}]}))
        with self.assertRaisesRegex(ValueError, "registered reading Markdown"):
            production.copy_browser_files(site, site / "dist")
        self.assertFalse((site / "dist").exists())

    def test_only_registered_reading_plaintext_is_staged_and_compressed(self):
        site = self.site()
        self.assertNotIn(".txt", production.ASSET_EXTENSIONS)
        name = "books/timaeus-plato/readings/wb/timaeus-unit123/reading.txt"
        reading = site / name
        reading.parent.mkdir(parents=True)
        reading.write_text("Timaeus\n\nExact saved wording.\n" * 100)
        manifest = {"schema": "care-reading-search-pages/1", "pages": [{
            "kind": "reading", "book_slug": "timaeus-plato", "layer_slug": "wb",
            "unit_slug": "timaeus-unit123", "plaintext_path": name}]}
        (site / "books/readings-manifest.json").write_text(json.dumps(manifest))
        production.copy_browser_files(site, site / "dist")
        self.assertEqual((site / "dist" / name).read_bytes(), reading.read_bytes())
        self.assertEqual(gzip.decompress((site / "dist" / (name + ".gz")).read_bytes()), reading.read_bytes())
        private = site / "native/private-notes.txt"
        private.write_text("Unregistered private notes")
        with self.assertRaisesRegex(ValueError, "Unrecognized browser asset"):
            production.copy_browser_files(site, site / "dist")
        self.assertFalse((site / "dist/native/private-notes.txt").exists())
        self.assertEqual((site / "dist" / name).read_bytes(), reading.read_bytes())

    def test_plaintext_manifest_cannot_register_arbitrary_or_traversing_paths(self):
        for changes in ({"plaintext_path": "private/notes.txt"}, {"book_slug": "../../private"},
                        {"layer_slug": "../wb"}, {"unit_slug": "unit/../notes"}, {"kind": "overview"}):
            site = self.site()
            entry = {"kind": "reading", "book_slug": "timaeus-plato", "layer_slug": "wb", "unit_slug": "unit",
                     "plaintext_path": "books/timaeus-plato/readings/wb/unit/reading.txt"}
            entry.update(changes)
            (site / "books/readings-manifest.json").write_text(json.dumps({"schema": "care-reading-search-pages/1", "pages": [entry]}))
            with self.assertRaisesRegex(ValueError, "registered reading plain text"):
                production.copy_browser_files(site, site / "dist")
            self.assertFalse((site / "dist").exists())

    def test_symlinked_root_files_assets_and_asset_directories_are_rejected(self):
        outside = self.root / "private.json"
        outside.write_text("private content")
        outside_directory = self.root / "private-directory"
        outside_directory.mkdir()
        (outside_directory / "reading.json").write_text("private content")
        for name, target in (
            ("index.html", outside), ("data/library.json", outside),
            ("assets/covers/linked.svg", outside), ("native/linked.mjs", outside),
            ("data/linked", outside_directory), ("assets", outside_directory),
        ):
            with self.subTest(name=name):
                site = self.site()
                link = site / name
                if link.is_file():
                    link.unlink()
                elif link.is_dir():
                    # Keep fixture contents intact while replacing its directory entry.
                    link.rename(site / "retained-assets")
                link.symlink_to(target, target_is_directory=target.is_dir())
                with self.assertRaises(ValueError):
                    production.copy_browser_files(site, site / "dist")
                self.assertFalse((site / "dist").exists())
        self.assertEqual(outside.read_text(), "private content")

    def test_missing_required_browser_file_is_rejected(self):
        site = self.site()
        (site / "library.html").unlink()
        with self.assertRaisesRegex(ValueError, "Missing or unsafe browser file"):
            production.copy_browser_files(site, site / "dist")
        self.assertFalse((site / "dist").exists())

    def test_build_destination_cannot_replace_source_or_another_directory(self):
        site = self.site()
        outside = self.root / "outside-dist"
        outside.mkdir()
        sentinel = outside / "private.json"
        sentinel.write_text("must remain untouched")
        for destination in (site, site / "public", site / "dist" / "nested", outside):
            with self.subTest(destination=destination):
                with self.assertRaises(ValueError):
                    production.copy_browser_files(site, destination)
                self.assertTrue((site / "index.html").is_file())
                self.assertEqual(sentinel.read_text(), "must remain untouched")
        (site / "dist").symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symbolic link"):
            production.copy_browser_files(site, site / "dist")
        self.assertEqual(sentinel.read_text(), "must remain untouched")

    def test_builders_receive_only_the_staged_web_root(self):
        site = self.site()
        with patch.object(production.subprocess, "run") as run:
            with patch("builtins.print"):
                result = production.build(site)
        self.assertEqual(result, site / "dist")
        self.search_pages.assert_called_once_with(site)
        self.about_page.assert_called_once_with(site / "dist")
        commands = [call.args[0] for call in run.call_args_list]
        self.assertEqual(commands, [
            [sys.executable, str(site / "tools/optimise-covers.py"), str(site / "dist")],
            ["node", str(site / "tools/build-public-assets.mjs"), str(site / "dist")],
        ])
        self.assertTrue(all(call.kwargs == {"check": True} for call in run.call_args_list))
        self.assertFalse((site / "dist" / "tools").exists())

    def test_clean_build_refreshes_about_after_catalogue_and_before_stamping(self):
        site = self.site()
        dist = site / "dist"
        self.assertFalse((site / "data/catalogue.json").exists())
        (site / "book-routes.json").write_text('{"books":[]}')
        original_about = (site / "about.html").read_bytes()
        stages = []
        self.search_pages.side_effect = lambda root: stages.append("search")

        def prepare_asset(command, *, check):
            self.assertTrue(check)
            self.assertEqual(Path(command[-1]), dist)
            if command[1].endswith("optimise-covers.py"):
                stages.append("covers")
            elif command[1].endswith("build-public-assets.mjs"):
                stages.append("catalogue")
                (dist / "data/catalogue.json").write_text('{"works":[]}')
            else:
                self.fail(f"Unexpected builder: {command}")

        def prepare_about(root):
            self.assertEqual(root, dist)
            self.assertTrue((root / "data/catalogue.json").is_file())
            self.assertEqual((root / "book-routes.json").read_text(), '{"books":[]}')
            self.assertFalse((root / "tools").exists())
            stages.append("about")
            (root / "about.html").write_text('<html><body>' + 'Saved About example. ' * 100 + '</body></html>')

        self.about_page.side_effect = prepare_about
        stamp = production.stamp_browser_modules
        def stamp_after_about(root):
            self.assertIn('Saved About example.', (root / "about.html").read_text())
            stages.append("stamp")
            stamp(root)

        with patch.object(production.subprocess, "run", side_effect=prepare_asset), \
             patch.object(production, "stamp_browser_modules", side_effect=stamp_after_about), \
             patch("builtins.print"):
            self.assertEqual(production.build(site), dist)
        self.assertEqual(stages, ["search", "covers", "catalogue", "about", "stamp"])
        self.assertIn(b'Saved About example.', gzip.decompress((dist / "about.html.gz").read_bytes()))
        self.assertEqual((site / "about.html").read_bytes(), original_about)
        self.assertFalse((site / "data/catalogue.json").exists())

    def test_stamping_updates_both_entry_chains_without_changing_native_exports(self):
        site = self.site()
        files = {
            "index.html": '<script type="module" src="/landing.mjs?v=old"></script><link href="/auth.css" rel="stylesheet">',
            "landing.mjs": "import {session} from './auth.mjs'; await import('./discover-reader.mjs?v=old');",
            "library.html": '<script type="module" src="/library-boot.mjs?v=old"></script>',
            "library-boot.mjs": "import {session} from './auth.mjs'; await import('./boot.mjs?v=old');",
            "site-settings.html": '<script type="module" src="/site-settings.mjs?v=old"></script>',
            "site-settings.mjs": "import {session, postJSON} from './auth.mjs';",
            "boot.mjs": "import('./public-app.mjs?v=old');",
            "public-app.mjs": "import mount from './native/reader.mjs?v=old';",
            "native/reader.mjs": "import './internal-reader.mjs?v=reviewed'; export const reader = 'reviewed';",
            "native/reader-version.json": '{"assets":{"reader.mjs":"reviewed-exact-sha"}}',
        }
        for name, content in files.items():
            (site / name).write_text(content)
        dist = site / "dist"
        production.copy_browser_files(site, dist)
        native_before = {path.name: path.read_bytes() for path in (dist / "native").iterdir()}

        production.stamp_browser_modules(dist)

        versions = set()
        for name, target in (
            ("index.html", "/landing.mjs"), ("index.html", "/auth.css"),
            ("landing.mjs", "./auth.mjs"), ("landing.mjs", "./discover-reader.mjs"),
            ("library.html", "/library-boot.mjs"), ("library-boot.mjs", "./boot.mjs"),
            ("library-boot.mjs", "./auth.mjs"), ("boot.mjs", "./public-app.mjs"),
            ("public-app.mjs", "./native/reader.mjs"),
            ("site-settings.html", "/site-settings.mjs"), ("site-settings.mjs", "./auth.mjs"),
        ):
            match = re.search(re.escape(target) + r"\?v=([a-f0-9]{16})['\"]", (dist / name).read_text())
            self.assertIsNotNone(match, (name, target))
            versions.add(match.group(1))
        self.assertEqual(len(versions), 1)
        self.assertEqual({path.name: path.read_bytes() for path in (dist / "native").iterdir()}, native_before)
        for name, content in files.items():
            self.assertEqual((site / name).read_text(), content)

    def test_about_page_and_its_public_assets_survive_staging_and_stamping(self):
        site = self.site()
        about = '<!doctype html><html><head><link rel="stylesheet" href="/about.css"><script type="module" src="/about-page.mjs"></script></head><body><h1>About CARE Library</h1></body></html>'
        (site / "about.html").write_text(about)
        (site / "about.css").write_text('body { color: #ece8df; }')
        (site / "about-page.mjs").write_text('import "./about-live-panels.mjs";')
        (site / "about-live-panels.mjs").write_text('export const panel = true;')
        (site / "welcome.html").write_text('<html><body>Compatibility</body></html>')
        dist = site / "dist"
        production.copy_browser_files(site, dist)
        production.stamp_browser_modules(dist)
        staged = (dist / "about.html").read_text()
        self.assertIn('<h1>About CARE Library</h1>', staged)
        for name in ("about.css", "about-page.mjs"):
            self.assertTrue((dist / name).is_file())
            self.assertRegex(staged, re.escape('/' + name) + r'\?v=[a-f0-9]{16}')
        self.assertTrue((dist / "about-live-panels.mjs").is_file())
        self.assertRegex((dist / "about-page.mjs").read_text(), r'about-live-panels\.mjs\?v=[a-f0-9]{16}')
        self.assertEqual(staged.count('static.cloudflareinsights.com/beacon.min.js'), 1)
        self.assertNotIn('beacon.min.js', (dist / "welcome.html").read_text())
        self.assertEqual((site / "about.html").read_text(), about)

    def test_gzip_copies_roundtrip_final_stamped_bytes_and_leave_binary_files_alone(self):
        site = self.site()
        source = "import './boot.mjs?v=old';\n" + "// compressible browser text\n" * 100
        (site / "library-boot.mjs").write_text(source)
        (site / "data/library.json").write_text('{"works":[],"note":"' + "reviewed data " * 100 + '"}')
        (site / "assets/covers/image.png").write_bytes(b"binary" * 1000)
        with patch.object(production.subprocess, "run"), patch("builtins.print"):
            dist = production.build(site)
        self.assertRegex((dist / "library-boot.mjs").read_text(), r"\./boot\.mjs\?v=[a-f0-9]{16}")
        for name in ("library-boot.mjs", "data/library.json"):
            original = (dist / name).read_bytes()
            compressed = (dist / (name + ".gz")).read_bytes()
            self.assertLess(len(compressed), len(original))
            self.assertEqual(gzip.decompress(compressed), original)
            self.assertEqual(compressed[4:8], b"\0\0\0\0")
        self.assertFalse((dist / "assets/covers/image.png.gz").exists())
        self.assertEqual((site / "library-boot.mjs").read_text(), source)
        self.assertFalse((site / "library-boot.mjs.gz").exists())

    def test_failed_asset_builder_stops_the_build(self):
        site = self.site()
        with patch.object(production.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "builder")) as run:
            with self.assertRaises(subprocess.CalledProcessError):
                production.build(site)
        self.assertEqual(run.call_count, 1)


if __name__ == "__main__":
    unittest.main()

