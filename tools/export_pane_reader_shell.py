"""Package the standalone reader for the desktop app's offline source panes."""
from pathlib import Path
import argparse

from source_reader import source_page


def pane_shell() -> str:
    # One empty section supplies the same navigation, tools, paper, and runtime
    # as the public source. The host fills the section with the open pane only.
    source = {"id": "pane", "title": "Source section", "text": ""}
    work = {"id": "pane", "slug": "pane", "title": "Source pane", "author": "", "sources": [source]}
    downloads = [{"format": "txt", "media_type": "text/plain", "url": "#download"}]
    return source_page(work, "pane", "", downloads, section=source, inline_assets=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    args.destination.write_text(pane_shell(), encoding="utf-8")
    if args.destination.name == "pane-shell.html":
        chooser = Path(__file__).resolve().parents[1] / "book-opening.mjs"
        args.destination.with_name("book-opening.mjs").write_bytes(chooser.read_bytes())
