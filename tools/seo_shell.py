"""Progressively enhance readable search HTML with the existing CARE UI shell."""
from __future__ import annotations

from html import escape
import json
from pathlib import Path
import re

from static_catalogue import strip_catalogue


def scope_stylesheet(css: str, scope: str = "#care-search-content") -> str:
    """Scope generated reference styles without affecting the live reader.

    Generated sheets use ordinary rules plus nested @media/@supports only. This
    deliberately small transformer rejects other nested constructs rather than
    silently rewriting a stylesheet it does not understand.
    """
    output = []
    position = 0
    while position < len(css):
        start = css.find("{", position)
        if start < 0:
            if css[position:].strip():
                raise ValueError("Unexpected stylesheet content.")
            break
        header = css[position:start].strip()
        depth, end = 1, start + 1
        while depth and end < len(css):
            depth += (css[end] == "{") - (css[end] == "}")
            end += 1
        if depth:
            raise ValueError("Unclosed stylesheet rule.")
        body = css[start+1:end-1]
        if header.startswith(("@media", "@supports")):
            output.append(header + "{" + scope_stylesheet(body,scope) + "}")
        elif header.startswith("@"):
            raise ValueError("Unsupported generated stylesheet rule.")
        else:
            selectors = []
            for selector in header.split(","):
                selector = selector.strip()
                if selector in {":root", "html", "body"}:
                    selectors.append(scope)
                else:
                    selectors.append(scope + " " + selector)
            output.append(",".join(selectors) + "{" + body + "}")
        position = end
    return "\n".join(output) + "\n"


def embed_library(source: Path, reference_html: str, route: dict) -> str:
    """Keep the canonical page and visible evidence while its actual UI loads.

    All visitors receive the same HTML. There are no user-agent tests, client
    redirects or duplicate hidden article copies. The reference remains usable
    when scripts, network access or authentication are unavailable.
    """
    library = strip_catalogue((Path(source) / "library.html").read_text(encoding="utf-8"))
    reference_head = re.search(r"<head[^>]*>(.*?)</head>",reference_html,re.S|re.I)
    reference_body = re.search(r"<body[^>]*>(.*?)</body>",reference_html,re.S|re.I)
    library_head = re.search(r"<head[^>]*>(.*?)</head>",library,re.S|re.I)
    library_body = re.search(r"<body[^>]*>(.*?)</body>",library,re.S|re.I)
    if not all((reference_head,reference_body,library_head,library_body)):
        raise ValueError("Expected complete reference and library HTML documents.")
    # Metadata belongs to the public reference URL. Keep the existing shell's
    # styling, but let seo-shell select its authenticated/public boot path.
    shared_head = re.sub(r"<script\b.*?</script>","",library_head[1],flags=re.S|re.I)
    shared_head = re.sub(r"<title\b.*?</title>","",shared_head,flags=re.S|re.I)
    shared_head = re.sub(r"<meta\b[^>]*>","",shared_head,flags=re.I)
    shared_head = re.sub(r'<link\b[^>]*\brel=["\']canonical["\'][^>]*>',"",shared_head,flags=re.I)
    body = reference_body[1].replace('id="main"','id="care-reference-main"')
    body = body.replace('href="#main"','href="#care-reference-main"')
    live_body = re.sub(r"<noscript\b.*?</noscript>","",library_body[1],flags=re.S|re.I)
    encoded = json.dumps(route,ensure_ascii=False,separators=(",",":"),allow_nan=False).replace("<","\\u003c")
    return f'''<!doctype html>
<html lang="en" data-care-search-page="true" data-care-toolbar-labels="false" data-care-slider-arrows="true">
<head>{reference_head[1]}{shared_head}
<link rel="stylesheet" href="/seo-shell.css">
<script id="care-search-route" type="application/json">{encoded}</script>
<script type="module" src="/seo-shell.mjs"></script>
</head><body class="care-library-shell">
<div id="care-search-content">{body}<p class="care-search-access" data-care-search-access hidden></p></div>
<div id="care-search-app" aria-hidden="true" inert>{live_body}</div>
</body></html>'''
