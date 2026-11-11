"""First drafts preserve older account databases and use authored names."""
from contextlib import contextmanager
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.studio_drafts import StudioDraftStore
from server.studio_first_drafts import first_draft_title


class FirstDraftTests(unittest.TestCase):
    def test_title_uses_authored_opening_words_and_keeps_named_documents(self):
        html = '<p>Untitled draft 2</p><p>A <em>manuscript</em><span data-writing-footnote="n">1</span> begins here</p><div class="draft-footnotes">Source notes</div>'
        self.assertEqual(first_draft_title("Untitled (2)", html, "html", 1794355200), "A manuscript begins here")
        self.assertEqual(first_draft_title("My title", html, "html", 1794355200), "My title")
        self.assertEqual(first_draft_title("Untitled", "", "text", 1794355200), "First draft — 11 Nov 2026")
        self.assertEqual(first_draft_title("Untitled", "one two three four five six seven eight nine ten eleven twelve thirteen", "text", 0),
                         "one two three four five six seven eight nine ten eleven twelve…")

    def test_additive_migration_preserves_older_manuscripts(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "accounts.sqlite3"

            class Auth:
                @contextmanager
                def connect(self, readonly=False):
                    with sqlite3.connect(path) as db:
                        db.row_factory = sqlite3.Row
                        yield db

            auth = Auth()
            with auth.connect() as db:
                db.executescript("""CREATE TABLE users(email TEXT PRIMARY KEY);
                    INSERT INTO users VALUES('writer@example.test');
                    CREATE TABLE studio_drafts(id TEXT PRIMARY KEY,owner TEXT,title TEXT,body TEXT,revision INTEGER,updated_at REAL);
                    INSERT INTO studio_drafts VALUES('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','writer@example.test','Original title','Exact original prose',7,1234);
                """)
            StudioDraftStore(auth)
            StudioDraftStore(auth)
            with auth.connect() as db:
                row = db.execute("SELECT title,body,revision,updated_at,first_draft,footnotes,document_format FROM studio_drafts").fetchone()
                self.assertEqual(tuple(row), ("Original title", "Exact original prose", 7, 1234, 0, "[]", "text"))


if __name__ == "__main__":
    unittest.main()
