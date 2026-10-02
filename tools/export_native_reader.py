"""Copy the original CARE shelf/desk renderer, without library or server data."""
from pathlib import Path
import hashlib
import json
import sys
import ast

root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root))
from care_platform.study_desk_component import STUDY_DESK_CSS, STUDY_DESK_JS, CARE_STUDY_DESK_VERSION

destination = Path(__file__).resolve().parents[1] / "native"
destination.mkdir(exist_ok=True)
assets = {"study-desk.css": STUDY_DESK_CSS, "study-desk.mjs": STUDY_DESK_JS}
for name, contents in assets.items():
    (destination / name).write_text(contents)
(destination / "reader-version.json").write_text(json.dumps({
    "version": CARE_STUDY_DESK_VERSION,
    "source": "care_platform/study_desk_component.py",
    "assets": {name: hashlib.sha256(contents.encode()).hexdigest() for name, contents in assets.items()},
}, indent=2) + "\n")
print(f"Exported {CARE_STUDY_DESK_VERSION}: original shelf and reading panes")

# The floating reference viewer is registered on the document surface by CARE.
# Read only its literal UI assets; do not load its private-library controllers.
source = (root / "care_platform/reference_viewer.py").read_text()
tree = ast.parse(source)
registration = next(node.value for node in tree.body if isinstance(node, ast.Assign)
                    and any(getattr(target, "id", "") == "_REFERENCE_VIEWER" for target in node.targets))
viewer_assets = {}
for field in registration.keywords:
    if field.arg not in ("html", "css", "js"):
        continue
    if field.arg == "css":
        from care_platform.reading_presentation import reading_style
        value = eval(compile(ast.Expression(field.value), "<viewer-styles>", "eval"),
                     {"reading_style": reading_style, "__builtins__": {}})
    else:
        value = ast.literal_eval(field.value)
    if field.arg == "js":
        # The standalone desk lives in a ShadowRoot. Keep Enter on its actual
        # button instead of letting the document viewer steal the key event.
        value = value.replace("const target=event.target instanceof Element?event.target:null",
                              "const origin=event.composedPath?.()[0]||event.target\n    const target=origin instanceof Element?origin:null")
    name = "reference-viewer." + {"html": "html", "css": "css", "js": "mjs"}[field.arg]
    (destination / name).write_text(value)
    viewer_assets[name] = hashlib.sha256(value.encode()).hexdigest()
(destination / "reference-viewer-version.json").write_text(json.dumps({
    "source": "care_platform/reference_viewer.py",
    "compatibility_changes": ["Resolve the keyboard event origin across the standalone desk ShadowRoot"],
    "assets": viewer_assets,
}, indent=2) + "\n")
