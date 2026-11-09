"""Export the shared desktop Studio and Reader picker for the web toolbar."""

import argparse
import json
from pathlib import Path

from export_desktop_chrome import literal


SITE = Path(__file__).resolve().parents[1]
SOURCE = "care_platform/writing_studio_picker.py"
HEADER = "Generated from care_platform/writing_studio_picker.py by tools/export_native_studio_picker.py."


def export(workspace: Path, check: bool) -> None:
    markup = literal(workspace, SOURCE, "_PICKER_HTML").strip()
    panel = markup.split("</div>", 1)[1].rsplit("</div>", 1)[0].strip().replace(' role="dialog"', "")
    css = literal(workspace, SOURCE, "_PICKER_CSS")
    rules = [
        line for line in css.splitlines()
        if line.startswith((".studio-mode-hint", ".studio-picker-"))
        and not line.startswith((".studio-picker-trigger", ".studio-picker-label",
                                 ".studio-picker-prefix", ".studio-picker-chevron"))
    ]
    rules.extend((
        "[data-studio-picker] :is(.studio-picker-panel,.studio-mode-hint)[hidden] {display:none}",
        ".studio-picker-panel {font:500 .77rem/1.3 var(--care-web-sans)}",
        ":where(.studio-picker-panel) button {color:inherit}",
        ".studio-picker-panel button:focus-visible {outline:2px solid #98c9bc;outline-offset:-2px}",
        ".beta-workbench .studio-picker-panel svg {width:1.05rem;height:1.05rem;flex:none}",
        ".beta-workbench .studio-picker-panel .studio-picker-crumbs {justify-content:flex-start;margin:0 0 .45rem;gap:.18rem}",
        ".beta-workbench .studio-picker-panel .studio-picker-crumbs button {min-width:0;min-height:0;padding:.16rem .22rem;border:0;border-radius:.2rem;background:transparent;color:#aed4c7;font:inherit}",
        ".beta-workbench .studio-picker-panel .studio-picker-crumbs button:hover {background:#253f36}",
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
