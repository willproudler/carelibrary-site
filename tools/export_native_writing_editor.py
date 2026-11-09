"""Export the exact desktop Studio renderer; do not read drafts or library data."""

import argparse
import hashlib
import json
from pathlib import Path
import sys


def export(workspace: Path, destination: Path) -> None:
    sys.path.insert(0, str(workspace.resolve(strict=True)))
    from care_platform.writing_editor_assets import WRITING_EDITOR_VERSION, load_writing_editor_assets

    destination.mkdir(exist_ok=True)
    hashes = {}
    for kind, content in load_writing_editor_assets().items():
        filename = "writing-editor." + {"html": "html", "css": "css", "js": "mjs"}[kind]
        payload = content.encode("utf-8")
        (destination / filename).write_bytes(payload)
        hashes[filename] = hashlib.sha256(payload).hexdigest()
    (destination / "writing-editor-version.json").write_text(json.dumps({
        "version": WRITING_EDITOR_VERSION,
        "source": "care_platform/writing_editor_assets.py",
        "assets": hashes,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {WRITING_EDITOR_VERSION}: original CARE Studio browser renderer")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("desktop_workspace", type=Path, help="path to the CARE desktop source checkout")
    export(parser.parse_args().desktop_workspace, Path(__file__).resolve().parents[1] / "native")
