"""Refresh the standalone reader's CSS from the editable CARE Studio sources."""
import argparse
from pathlib import Path


def marked_region(css: str, name: str):
    start = f"/* {name} */"
    end = f"/* End {name[0].lower() + name[1:]} */"
    if css.count(start) != 1 or css.count(end) != 1:
        raise ValueError(f"Expected one '{name}' block in the stylesheet")
    before, rest = css.split(start)
    contents, after = rest.split(end)
    return before, start + contents + end, after


def export_styles(studio: Path, current: str) -> str:
    assets = studio / "care_platform"
    grain = (assets / "writing_editor/material.css").read_text(encoding="utf-8")
    surface = (assets / "writing_review_assets/reader_surface.css").read_text(encoding="utf-8")
    book = (assets / "writing_review_assets/reader_book.css").read_text(encoding="utf-8")
    before, _, after = marked_region(current, "Studio manuscript surface")
    current = (before + "/* Studio manuscript surface */\n" + grain + "\n" + surface
               + "/* End studio manuscript surface */" + after)
    before, _, after = marked_region(current, "Shared book typography")
    return before + marked_region(book, "Shared book typography")[1] + after


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("studio_workspace", type=Path)
    parser.add_argument("--check", action="store_true", help="Report whether the portable CSS matches Studio.")
    args = parser.parse_args()
    target = Path(__file__).with_name("source_reader.css")
    current = target.read_text(encoding="utf-8")
    refreshed = export_styles(args.studio_workspace, current)
    if args.check:
        if refreshed != current:
            raise SystemExit("Standalone reader material differs from the Studio sources.")
    elif refreshed != current:
        target.write_text(refreshed, encoding="utf-8")
