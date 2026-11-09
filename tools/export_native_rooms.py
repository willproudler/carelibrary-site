"""Export the desktop Rooms palette and card styles into the beta shell."""

from __future__ import annotations

import argparse
import ast
from html import escape
from pathlib import Path
from textwrap import dedent
from xml.etree import ElementTree


SITE = Path(__file__).resolve().parents[1]
DESKTOP_SOURCE = Path("care_platform") / "studio_navigation.py"
HTML_START = "    <!-- Shared desktop Rooms -->"
HTML_END = "    <!-- End shared desktop Rooms -->"
PANEL = ".st-key-care_study_rooms_panel"
DESKTOP_CARD = PANEL + " button"
WEB_CARD = ".rooms-menu > :is(a, button)"
WEB_ROUTES = {"laterals": "laterals", "corpuses": "corpuses", "numo": "numogram"}
WEB_BANNERS = {**WEB_ROUTES, "writing_studio": "studio", "care_reader": "reader"}


def desktop_rooms(path):
    names = {"_ROOMS", "_ROOM_COLORS", "_SHELL_CSS"}
    values = {
        node.targets[0].id: ast.literal_eval(node.value)
        for node in ast.parse(path.read_text(encoding="utf-8")).body
        if isinstance(node, ast.Assign)
        and isinstance(node.targets[0], ast.Name)
        and node.targets[0].id in names
    }
    return values["_ROOMS"], values["_ROOM_COLORS"], values["_SHELL_CSS"]


def room_styles(rooms, palettes, source):
    start = f'[data-testid="stPopoverBody"]:has({PANEL})'
    end = '[data-testid="stPopoverBody"]:has(.st-key-care_quick_settings)'
    first_rule = source.rfind("\n", 0, source.index(start)) + 1
    css = dedent(source[first_rule:source.index(end)]).strip()
    palette_rules = []
    room_ids = {name for name, *_ in rooms}
    for name, (accent, surface, active) in palettes.items():
        selectors = []
        if name in room_ids:
            selectors.append(f'.rooms-menu [data-care-room="{name}"]')
        if view := WEB_BANNERS.get(name):
            selectors.append(f'body[data-workbench-view="{view}"] .beta-workbench')
        if selectors:
            palette_rules.append(f'{", ".join(selectors)} {{'
                                 f'--room-accent:{accent};--room-surface:{surface};--room-active:{active}'
                                 '}')
    selector_map = {
        start: ".rooms-menu",
        f'{DESKTOP_CARD} [data-has-shortcut]': WEB_CARD + " .room-card-content",
        f'{DESKTOP_CARD} [data-testid="stIconMaterial"]': WEB_CARD + " .room-card-icon",
        f'{DESKTOP_CARD} [data-testid="stMarkdownContainer"]': WEB_CARD + " .room-card-label",
        f"{DESKTOP_CARD} p": WEB_CARD + " .room-card-label",
        '[kind="primary"]': '[aria-current="page"]',
        DESKTOP_CARD: WEB_CARD,
        PANEL: ".rooms-menu",
    }
    for desktop, web in selector_map.items():
        css = css.replace(desktop, web)
    if "data-testid" in css or "st-key-" in css or css.count("__ROOM_PALETTES__") != 1:
        raise ValueError("Desktop Rooms selectors changed. Update the web mapping.")
    return ("/* Generated from care_platform/studio_navigation.py by tools/export_native_rooms.py. */\n"
            + css.replace("__ROOM_PALETTES__", "\n".join(palette_rules))
            .replace("var(--st-font,ui-sans-serif,system-ui,sans-serif)", "var(--care-web-sans)")
            + "\n")


def room_rows(rooms):
    rows = []
    for name, label, icon, description in rooms:
        picture = ('<svg data-material-symbol viewBox="0 0 960 960" aria-hidden="true">'
                   f'<use href="/assets/ui-icons/workbench.svg#{escape(icon)}"/></svg>')
        room = f' data-care-room="{escape(name)}"'
        if view := WEB_ROUTES.get(name):
            opening = f'<a{room} data-page="{view}" href="#view={view}">'
            note = ""
            closing = "</a>"
        else:
            feature = "CARE Store" if name == "store" else label
            opening = f'<button type="button"{room} data-full-feature="{escape(feature)}">'
            note = '<small class="room-unavailable">Available in the full version</small>'
            closing = "</button>"
        rows.append(f'    {opening}<span class="room-card-content">'
                    f'<span class="room-card-icon">{picture}</span>'
                    f'<span class="room-card-label"><strong>{escape(label)}</strong>{escape(description)}{note}</span>'
                    f'</span>{closing}')
    return "\n".join(rows)


def export(desktop_workspace, *, check=False):
    rooms, palettes, source = desktop_rooms(desktop_workspace / DESKTOP_SOURCE)
    symbols = ElementTree.parse(SITE / "assets" / "ui-icons" / "workbench.svg")
    ids = {symbol.get("id") for symbol in symbols.iter("{http://www.w3.org/2000/svg}symbol")}
    missing = {icon for _, _, icon, _ in rooms} - ids
    if missing:
        raise ValueError("Missing desktop Rooms glyphs: " + ", ".join(sorted(missing)))
    page = SITE / "library.html"
    html = page.read_text(encoding="utf-8")
    head, marker, rest = html.partition(HTML_START)
    _, end, tail = rest.partition(HTML_END)
    if not marker or not end:
        raise ValueError("Missing shared desktop Rooms markers in library.html.")
    outputs = {
        SITE / "native" / "rooms.css": room_styles(rooms, palettes, source),
        page: f"{head}{HTML_START}\n{room_rows(rooms)}\n{HTML_END}{tail}",
    }
    for path, text in outputs.items():
        if check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                raise SystemExit(f"Desktop Rooms export is stale: {path.name}")
        else:
            path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("desktop_workspace", nargs="?", type=Path, default=SITE.parents[1])
    parser.add_argument("--check", action="store_true", help="Check the browser files without changing them.")
    options = parser.parse_args()
    export(options.desktop_workspace, check=options.check)
