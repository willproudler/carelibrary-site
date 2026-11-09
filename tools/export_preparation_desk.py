"""Export only the desktop Preparation Desk's presentation and sample rows."""

import argparse
import ast
from html import escape
from pathlib import Path


def literal_assignment(tree, name):
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == name for target in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError(f"Preparation Desk export could not find {name}")


def function(tree, name):
    return next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name)


def export(workspace, destination):
    upload = ast.parse((workspace / "care_reader_upload.py").read_text(encoding="utf-8"))
    desk = ast.parse((workspace / "care_platform/import_preparation_desk.py").read_text(encoding="utf-8"))
    header = ast.literal_eval(function(upload, "_render_preparation_header").body[0].value.args[0])
    palette = ast.literal_eval(function(upload, "_reader_upload_palette").body[-1].value)
    theme = next(node.value for node in ast.walk(function(upload, "_install_upload_style"))
                 if isinstance(node, ast.Constant) and isinstance(node.value, str) and ".reader-preparation-header h1" in node.value)
    hero = []
    mobile_hero = []
    for line in theme.splitlines():
        rule = line.strip()
        if not rule.startswith(("__READER_SCOPE__.reader-preparation-header", "__READER_SCOPE__.reader-desk-illustration",
                                "__READER_SCOPE__.reader-upload-kicker {")):
            continue
        target = mobile_hero if rule.endswith(("padding: 20px 17px; }", "display: none; }")) else hero
        target.append(rule.replace("__READER_SCOPE__", ".preparation-preview "))

    css = literal_assignment(desk, "_STYLE").strip().removeprefix("<style>").removesuffix("</style>").strip()
    variables = [f"  --reader-{key}: {value};" for key, value in palette.items()]
    variables.extend(("  --reader-page-glow: rgba(176,126,68,.12);", "  --reader-book-start: #30271f;",
                      "  --reader-book-end: #15191d;"))
    (destination / "preparation-desk.css").write_text(
        "/* Exported from the desktop Preparation Desk. */\n"
        + ".preparation-preview {\n" + "\n".join(variables) + "\n}\n"
        + "\n".join(hero) + "\n@media (max-width: 620px) {\n" + "\n".join(mobile_hero) + "\n}\n" + css + "\n",
        encoding="utf-8",
    )

    scopes = "".join(f"<span>{escape(scope)}</span>" for scope in literal_assignment(desk, "SCOPES"))
    rows = []
    for filetype, title, state, status, action in (
        ("PDF", "Example book", "review", "Needs review", "Review chapters"),
        ("EPUB", "Example edition", "ready", "Ready to run", "Run options"),
        ("XML", "Example source", "interrupted", "Interrupted", "View progress"),
    ):
        rows.append(f'''<div data-testid="stLayoutWrapper">
          <div class="st-key-staged_book_example">
            <div class="care-import-identity">
              <span class="care-import-folio" data-format="{filetype}">{filetype}</span>
              <div class="care-import-copy"><span class="care-import-title">{title}</span><span class="care-import-byline">Example import</span></div>
            </div>
            <div class="care-import-status" data-state="{state}"><span>{status}</span><span>Saved locally</span></div>
            <div class="preparation-row-actions"><span>→ {action}</span><small>More ⌄</small></div>
          </div>
        </div>''')

    (destination / "preparation-desk.html").write_text(
        '<span class="preparation-store">▤ &nbsp; Find free books in the Care Store</span>\n'
        + header.strip()
        + f'''
        <div class="preparation-tabs"><span>Saved imports</span><span>+ New source</span></div>
        <div class="preparation-grounding">› &nbsp; Continue grounding existing analyses</div>
        <div class="st-key-care_reader_preparation_desk">
          <p class="care-import-overview"><strong>Saved imports</strong><span>Find a source or pick up a run.</span></p>
          <div class="preparation-scopes">{scopes}</div>
          <div class="preparation-toolbar">
            <span>Search title, author or filename</span><span>Recent first ⌄</span><span>List &nbsp; Grid</span><span>↻ Refresh</span>
          </div>
          <div class="st-key-care_reader_import_list">{''.join(rows)}</div>
        </div>
        '''.strip() + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    export(parser.parse_args().workspace, Path(__file__).resolve().parents[1] / "native")
