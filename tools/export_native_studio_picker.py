"""Export the shared desktop Studio and Reader picker for the web toolbar."""

import argparse
import json
from pathlib import Path

from export_desktop_chrome import declarations, literal


SITE = Path(__file__).resolve().parents[1]
SOURCE = "care_platform/writing_studio_picker.py"
MATERIAL = "care_platform/writing_editor/material.css"
HEADER = "Generated from care_platform/writing_studio_picker.py by tools/export_native_studio_picker.py."


def export(workspace: Path, check: bool) -> None:
    markup = literal(workspace, SOURCE, "_PICKER_HTML").strip()
    panel = markup.split("</div>", 1)[1].rsplit("</div>", 1)[0].strip().replace(' role="dialog"', "")
    base, material_rules = literal(workspace, SOURCE, "_PICKER_CSS").split("@media(forced-colors:none)", 1)
    # The toolbar can open before the editor loads its material tokens.
    studio_panel = '.studio-picker-panel[data-picker-mode="studio"]'
    studio_material = declarations(
        (workspace / MATERIAL).read_text(encoding="utf-8"),
        f".studio, .reader-studio-layout, {studio_panel}",
    )
    rules = [
        line for line in base.splitlines()
        if line.startswith((".studio-mode-hint", ".studio-picker-"))
        and not line.startswith((".studio-picker-trigger", ".studio-picker-label",
                                 ".studio-picker-prefix", ".studio-picker-chevron"))
    ]
    rules.extend((
        "[data-studio-picker] :is(.studio-picker-panel,.studio-mode-hint,.studio-picker-panel *)[hidden] {display:none}",
        ".studio-picker-panel {font:500 .77rem/1.3 var(--care-web-sans)}",
        ":where(.studio-picker-panel) :is(button,input) {font:inherit}",
        ":where(.studio-picker-panel) button {color:inherit;cursor:pointer}",
        ".beta-workbench .studio-picker-panel button:focus-visible {outline:2px solid var(--picker-detail,#98c9bc);outline-offset:-2px}",
        ".beta-workbench .studio-picker-panel svg {width:1.05rem;height:1.05rem;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}",
        ".beta-workbench .studio-picker-panel .studio-picker-crumbs {justify-content:flex-start;margin:0 0 .45rem;gap:.18rem}",
        f"{studio_panel} {{\n  {studio_material}\n}}",
        "@media(forced-colors:none)" + material_rules.rstrip(),
    ))
    outputs = {
        "writing-studio-picker.mjs": (
            f"// {HEADER}\nexport const pickerMarkup = {json.dumps(panel)};\n"
            + literal(workspace, SOURCE, "PICKER_JS").strip() + "\n"
        ),
        "writing-studio-picker.css": f"/* {HEADER} */\n" + "\n".join(rules) + "\n",
    }
    for name, text in outputs.items():
        path = SITE / "native" / name
        if check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                raise SystemExit(f"Desktop document picker export is stale: {name}")
        else:
            path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    export(args.workspace, args.check)
