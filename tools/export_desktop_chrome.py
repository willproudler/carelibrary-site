"""Adapt desktop toolbar CSS and its installed Material Symbols outlines for the beta."""

import argparse
import ast
from pathlib import Path
import re


NAVIGATION = "care_platform/studio_navigation.py"
SHELL = ".app-header.beta-workbench"
PRIMARY = ':is([data-page="library"],[data-page="preparation"])'
SECONDARY = ":is(.workbench-tools > button, .workbench-settings summary)"
CONTROLS = f":is({PRIMARY},.workbench-rooms summary,{SECONDARY})"
ICONS = ("upload_file", "downloading", "forum", "scatter_plot", "storefront")
ICON_START = "  <!-- Shared desktop toolbar symbols -->\n"
ICON_END = "  <!-- End shared desktop toolbar symbols -->\n"


def literal(workspace, source, key):
    tree = ast.parse((workspace / source).read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == key for target in node.targets
        ):
            return ast.literal_eval(node.value)
    raise ValueError(f"{key} not found in {source}")


def declarations(css, selector):
    rule = re.search(r"(?m)^\s*" + re.escape(selector) + r"\s*\{([^{}]*)\}", css)
    if rule is None:
        raise ValueError(f"Desktop CSS selector not found: {selector}")
    return rule[1].strip()


def export_workspace_strip(workspace):
    css = literal(workspace, "care_platform/study_workspace_component.py", "_WORKSPACE_CSS")
    rail = ".reading-tabbar"
    scroll = ".reading-tab-scroll"
    scroll_styles = "\n".join(
        f"{scroll}{suffix} {{ {declarations(css, '.workspace-scroll-controls' + suffix)} }}"
        for suffix in ("", " button", " button:disabled", " svg")
    )
    scroll_styles += f"""
{scroll}[hidden] {{ display: none; }}
{scroll} button {{ appearance: none; border: 0; background: transparent; cursor: pointer; }}
{scroll} button:not(:disabled):hover {{ color: #faf5e9; background: #222b32; }}
{scroll} button:focus-visible {{ outline: 1px solid #8bc5ba; outline-offset: -2px; }}
@media (pointer: coarse) {{ {scroll} button {{ width: 30px; height: 32px; }} }}
"""
    selectors = (
        ("nav", rail),
        (".workspace-books", f"{rail} .open-books"),
        (".workspace-books::-webkit-scrollbar", f"{rail} .open-books::-webkit-scrollbar"),
        (".workspace-books::after", f"{rail} .open-books::after"),
        (".workspace-book", f"{rail} :where(.open-tab)"),
        (".workspace-title", f"{rail} :where(.open-tab) a"),
        (".workspace-kind", f"{rail} .reading-kind"),
        ('.workspace-book:is([data-kind="draft"],[data-kind="reader"]) .workspace-kind',
         f'{rail} .open-tab:is([data-kind="studio"],[data-kind="reader"]) .reading-kind'),
        (".workspace-project-badge", f"{rail} [data-tab-role]"),
        (".workspace-close", f"{rail} [data-close-book]"),
    )
    rules = []
    for source, target in selectors:
        style = declarations(css, source).replace("var(--st-font,ui-sans-serif,system-ui,sans-serif)", "var(--care-web-sans)")
        rules.append(f"  {target} {{ {style} }}")
    rules.append(f"  {rail} .open-books {{ min-height: 0; background: transparent; }}")
    return "\n" + scroll_styles + "\n@media (min-width: 641px) and (pointer: fine) {\n" + "\n".join(rules) + "\n}\n"


def export_css(workspace):
    room_colors = literal(workspace, NAVIGATION, "_ROOM_COLORS")
    room_keys = {"writing_studio": "studio", "care_reader": "reader", "numo": "numogram"}
    room_palettes = "\n".join(
        f'body[data-workbench-room="{room_keys.get(room, room)}"] {{ '
        f'--room-accent: {accent}; --room-surface: {surface}; --room-active: {active}; }}'
        for room, (accent, surface, active) in room_colors.items()
    )
    chrome = literal(workspace, "care_platform/study_reader_chrome.py", "STUDIO_CHROME_CSS")
    chrome = (
        chrome.replace("__STUDIO_SHELL__", SHELL)
        .replace("__STUDIO_CONTROLS__", CONTROLS)
        .replace("__STUDIO_SECONDARY_CONTROLS__", SECONDARY)
        .replace(".care-studio-brand span", ".brand .brand-name")
        .replace(".care-studio-brand img", ".brand .brand-mark")
        .replace('[data-testid="stIconMaterial"]', "svg[data-material-symbol]")
        .replace('[data-testid="stPageLink"] a', "a")
    )

    history = literal(workspace, "care_platform/library_history.py", "_CSS").strip()
    history = history.replace(".st-key-care_library_history_slot .care-history", f"{SHELL} .workbench-history")
    history = history.replace(".care-history", f"{SHELL} .workbench-history")

    picker = literal(workspace, "care_platform/writing_studio_picker.py", "_PICKER_CSS")
    switch = "\n".join(
        line for line in picker.splitlines()
        if line.startswith((".studio-mode-switch", "@media(prefers-reduced-motion:reduce) {.studio-mode-switch"))
    )
    switch = (
        switch.replace(".studio-mode-switch", f"{SHELL} .workbench-switch")
        .replace('[data-mode="reader"]', ':has(a[data-page="reader"][aria-current="page"])')
        .replace("[data-mode]", ':has(a[aria-current="page"])')
        .replace(".studio-picker-trigger", "a")
        .replace("[data-active]", '[aria-current="page"]')
    )

    desktop_shell = literal(workspace, NAVIGATION, "_SHELL_CSS")
    tokens = declarations(desktop_shell, "__STUDIO_SHELL__")
    tokens = "\n  ".join(
        line.strip() for line in tokens.splitlines()
        if line.strip().startswith(("--care-command-", "box-shadow:"))
    )
    services = declarations(desktop_shell, "__STUDIO_SHELL__ .st-key-care_study_services")
    services = ";\n  ".join(
        part.strip() for part in services.split(";")
        if part.strip().startswith(("gap:", "border:", "border-radius:", "background:"))
    )
    wordmark = declarations(desktop_shell, ".care-studio-wordmark")
    studio_brand = declarations(desktop_shell, ".care-studio-brand")
    brand_font = next(part for part in studio_brand.split(";") if part.startswith("font:"))
    brand_font = brand_font.replace("var(--st-font,ui-sans-serif,system-ui,sans-serif)", "var(--care-web-sans)")
    brand_gap = next(part for part in studio_brand.split(";") if part.startswith("gap:"))
    brand_opacity = next(
        part for part in declarations(desktop_shell, ".care-studio-brand img").split(";") if part.startswith("opacity:")
    )
    native_brand = declarations(
        desktop_shell, ":root:has(#care-native-window-inset) __STUDIO_SHELL__ .care-studio-brand",
    )
    brand_inset = re.search(r"padding-inline-start:[^;]+", native_brand)[0]
    secondary_icon_size = re.search(
        r"font-size:([^; ]+)",
        declarations(desktop_shell, '__STUDIO_SHELL__ __STUDIO_SECONDARY_CONTROLS__ [data-testid="stIconMaterial"]'),
    )[1]
    shell_library = re.search(r"--care-library-active:([^;]+);\s*--care-library-border:([^;]+);", desktop_shell)
    library_active, library_border = shell_library.groups()
    saved_icon = declarations(
        desktop_shell,
        '__STUDIO_SHELL__ .st-key-care_saved_popover [data-testid="stPopoverButton"] [data-testid="stIconMaterial"]',
    )
    upload_icon = declarations(
        desktop_shell,
        '__STUDIO_SHELL__ .st-key-care_study_add_book button:not([kind="primary"],:active) [data-testid="stIconMaterial"]',
    )
    search = declarations(desktop_shell, "__STUDIO_SHELL__ .st-key-care_study_home button")
    search = "\n  ".join(
        line.strip() for line in search.splitlines()
        if line.strip().startswith(("gap:", "min-height:", "background:", "text-align:"))
    )
    primary = declarations(
        desktop_shell, '__STUDIO_SHELL__ .st-key-care_study_primary button:not([kind="primary"],:active)',
    )

    layout = f"""
/* The web host keeps its own grid and links. Desktop selectors target their web equivalents. */
{SHELL} {{
  {tokens}
  --care-library-active: {library_active};
  --care-library-border: {library_border};
  grid-template-columns: max-content minmax(36px, 1fr) max-content;
}}
{SHELL} .workbench-identity {{ gap: .25rem; }}
{SHELL} > nav {{ gap: .25rem; }}
{SHELL} .brand {{ {brand_font}; {brand_gap}; }}
{SHELL} .brand .brand-name {{ {wordmark} }}
{SHELL} .brand .brand-mark {{ {brand_opacity}; }}
@media (min-width: 1151px) and (pointer: fine) {{
  :root:not([data-library-companion]) {SHELL} {{ {brand_inset}; }}
  :root:not([data-library-companion]) {SHELL} .brand .brand-mark {{
    scale: .96;
    transform-origin: left center;
  }}
  {SHELL} {SECONDARY} > svg[data-material-symbol] {{
    width: {secondary_icon_size};
    height: {secondary_icon_size};
  }}
}}
{SHELL} .workbench-tools {{
  {services};
}}
{SHELL} .workbench-history button:disabled {{ opacity: 1; }}
{SHELL} .workbench-search {{ {search} }}
{SHELL} .workbench-search svg {{ color: #8fa8a7; }}
{SHELL} .workbench-search kbd {{
  padding: .1rem .25rem;
  border-color: #e1e5eb16;
  font: 500 .59rem/1.2 var(--care-web-mono);
  opacity: .64;
}}
{SHELL} {PRIMARY}:not([aria-current="page"],:active) {{
  {primary}
}}
{SHELL} {PRIMARY}:hover:not([aria-current="page"],:active) {{
  border-color: var(--care-command-edge) !important;
  background: var(--care-command-hover) !important;
}}
{SHELL} {PRIMARY} {{ --care-nav-active: var(--care-library-active); --care-nav-border: var(--care-library-border); }}
{SHELL} [data-page="library"][aria-current="page"] {{
  border-color: var(--care-library-border);
  background: var(--care-library-active);
  color: #fff;
}}
{SHELL} [data-page="preparation"]:not([aria-current="page"],:active) svg {{ {upload_icon} }}
{SHELL} .workbench-saved svg {{ {saved_icon} }}
{SHELL} .workbench-switch {{
  --care-picker-width: var(--care-command-hit);
  --care-picker-padding: 0;
  overflow: visible;
}}
html[data-care-toolbar-labels="true"] {SHELL} .workbench-switch {{
  --care-picker-width: 0px;
  --care-picker-padding: .5rem;
}}
{SHELL} .workbench-switch a:is([aria-current="page"],.active) {{
  background: transparent;
  border-color: transparent;
  color: #eff9f5;
}}
{SHELL} .workbench-switch svg {{ stroke-width: 1.6; }}
{SHELL} .workbench-rooms {{ --care-nav-active: var(--room-active, var(--care-library-active)); }}
{SHELL} .workbench-saved {{ --care-nav-active: #673748; --care-nav-border: #ac5368; }}
@media (min-width: 881px) {{
  {SHELL} .workbench-switch {{ margin-inline-start: .48rem; }}
  {SHELL} .workbench-switch::after {{
    content: ""; position: absolute; inset-block: 0; inset-inline-start: -.48rem;
    border-inline-start: 1px solid var(--care-command-edge);
  }}
}}
@media (max-width: 450px) {{
  {SHELL} .workbench-history button {{ width: 28px; }}
  {SHELL} .workbench-switch {{ --care-picker-width: 27px; }}
  {SHELL} {SECONDARY} {{ width: 30px !important; min-width: 30px !important; }}
}}
@media (pointer: coarse) {{
  {SHELL} {{ --care-command-hit: 44px; }}
  {SHELL} .workbench-search {{ min-height: 44px !important; }}
  {SHELL} .workbench-history button {{ height: 42px; min-height: 42px !important; }}
}}
@media (pointer: coarse) and (min-width: 451px) {{
  {SHELL} .workbench-history button {{ width: 40px; }}
}}
@container workspace-search (max-width: 5.5rem) {{
  {SHELL} .workbench-search {{
    width: 36px;
    justify-content: center;
    padding: 0 !important;
  }}
}}
"""
    return (
        "/* Generated by export_desktop_chrome.py from desktop navigation and workspace styles. */\n"
        + layout
        + room_palettes + "\n"
        + history + "\n" + switch + "\n" + chrome.strip() + "\n"
        + export_workspace_strip(workspace)
    )


def export_icons(workspace, target, material_font=None):
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.ttLib import TTFont

    if material_font is None:
        candidates = sorted(workspace.glob(".venv/lib/python*/site-packages/streamlit/static/static/media/MaterialSymbols-Rounded.*.woff2"))
        if len(candidates) != 1:
            raise ValueError("Specify the desktop Material Symbols Rounded font with --material-font.")
        material_font = candidates[0]
    with TTFont(material_font) as font:
        glyphs = font.getGlyphSet()
        units = font["head"].unitsPerEm
        rows = []
        for icon in ICONS:
            pen = SVGPathPen(glyphs)
            glyphs[icon].draw(pen)
            rows.append(
                f'  <symbol id="{icon}" viewBox="0 0 {units} {units}">'
                f'<path transform="translate(0 {units}) scale(1 -1)" d="{pen.getCommands()}"/></symbol>\n'
            )
    svg = target.read_text(encoding="utf-8")
    if ICON_START in svg:
        before, new_symbols = svg.split(ICON_START, 1)
        svg = before + new_symbols.split(ICON_END, 1)[1]
    if not svg.rstrip().endswith("</svg>"):
        raise ValueError("Existing workbench icon sprite is invalid.")
    target.write_text(svg[:svg.rindex("</svg>")] + ICON_START + "".join(rows) + ICON_END + "</svg>\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, epilog="Install fonttools[woff] to regenerate icon outlines.")
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--material-font", type=Path)
    args = parser.parse_args()
    beta = Path(__file__).resolve().parents[1]
    css = export_css(args.workspace)
    export_icons(args.workspace, beta / "assets/ui-icons/workbench.svg", args.material_font)
    (beta / "native/desktop-chrome.css").write_text(css, encoding="utf-8")
