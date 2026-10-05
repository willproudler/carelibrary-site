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

# Project only the fixed public collection through the same reading boundary as
# the desktop app. Exact input matching prevents an older view being reused for
# revised text or a different translation. Canonical library.json is untouched.
from care_platform.reading_payload import prepare_reading_payload
from care_platform.item_presentation import ITEM_PRESENTATION_VERSION
public_library = json.loads((destination.parent / "data" / "library.json").read_text())
titles = {unit["id"]: unit.get("title") or work["title"]
          for work in public_library["works"] for unit in work["units"]}
titles[public_library["lateral"]["id"]] = public_library["lateral"]["title"]
reading_views = {}
def collect_reading_views(value):
    if isinstance(value, dict):
        if value.get("id") and isinstance(value.get("text"), str) and not value["id"].startswith("RAW_"):
            display = prepare_reading_payload(value, _titles=titles)["reading_text"]
            if display != value["text"]:
                pair = [value["text"], display]
                versions = reading_views.setdefault(value["id"], [])
                if pair not in versions:
                    versions.append(pair)
        for child in value.values():
            collect_reading_views(child)
    elif isinstance(value, list):
        for child in value:
            collect_reading_views(child)
collect_reading_views(public_library)
reading_module = (
    "// Generated public reading views; canonical text and route IDs stay intact.\n"
    + "// " + ITEM_PRESENTATION_VERSION + "\n"
    + "const views = " + json.dumps(reading_views, ensure_ascii=False, separators=(",", ":")) + ";\n"
    + "export function publicReadingText(item) {\n"
    + "  const source = String(item?.text ?? '');\n"
    + "  return views[item?.id]?.find(([original]) => original === source)?.[1] ?? source;\n}\n"
)
(destination / "reading-views.mjs").write_text(reading_module)
manifest_path = destination / "reader-version.json"
reader_manifest = json.loads(manifest_path.read_text())
reader_manifest["reading_presentation"] = ITEM_PRESENTATION_VERSION
reader_manifest["assets"]["reading-views.mjs"] = hashlib.sha256(reading_module.encode()).hexdigest()
manifest_path.write_text(json.dumps(reader_manifest, indent=2) + "\n")
print(f"Exported reading views for {len(reading_views)} public claims; canonical records retained")

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
