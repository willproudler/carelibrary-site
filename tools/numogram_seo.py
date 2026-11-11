"""Build ordinary public reference pages from the already-published NUMO export.

No private library, model output or authenticated API is consulted. The static
pages are useful without JavaScript; the instrument remains an explicit link.
"""
from __future__ import annotations

import hashlib
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import quote, urlsplit

from seo_shell import embed_library, scope_stylesheet


MATRIX_URL = "https://www.ccru.net/digithype/pandemonium.htm"
NUMOGRAM_URL = "https://ccru.net/declab.htm"
GLOSSARY_URL = "https://ccru.net/id%28entity%29/glossary.htm"
_ID = re.compile(r"MESH-(?:0[0-9]|[1-3][0-9]|4[0-4])\Z")


def load_reference(source: Path) -> list[dict]:
    text = (source / "native/numogram-reference.mjs").read_text(encoding="utf-8")
    prefix, separator, payload = text.partition("export default ")
    if not separator or not prefix.lstrip().startswith("// Generated"):
        raise ValueError("Expected the reviewed public NUMO JSON export.")
    record = json.loads(payload.strip().removesuffix(";"))
    demons = record.get("demons")
    if not isinstance(demons, list) or len(demons) != 45:
        raise ValueError("The public Matrix must contain all 45 demons.")
    ids, spans, slugs = set(), set(), set()
    for demon in demons:
        if not isinstance(demon, dict) or not _ID.fullmatch(str(demon.get("id", ""))):
            raise ValueError("Invalid public demon identity.")
        poles = demon.get("poles")
        if (not isinstance(poles, list) or len(poles) != 2
                or any(type(value) is not int or not 0 <= value <= 9 for value in poles)
                or poles[0] <= poles[1]):
            raise ValueError("Invalid public demon net-span.")
        slug = demon_slug(demon)
        if demon["id"] in ids or tuple(poles) in spans or slug in slugs:
            raise ValueError("Duplicate public demon identity or net-span.")
        ids.add(demon["id"]); spans.add(tuple(poles)); slugs.add(slug)
    return sorted(demons, key=lambda item: item["id"])


def demon_slug(demon: dict) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(demon.get("name", "")).casefold()).strip("-")
    if not slug:
        raise ValueError("A public demon needs a name.")
    return slug


def _origin(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.netloc or parsed.path not in {"", "/"} or parsed.query or parsed.fragment or parsed.username:
        raise ValueError("Use the canonical HTTPS website origin.")
    return value.rstrip("/")


def _json(value) -> str:
    # JSON-LD is inert data, but its HTML parser still recognises </script>.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).replace("<", "\\u003c")


def _a(href: str, text: str, extra: str = "") -> str:
    return f'<a href="{escape(href, quote=True)}"{extra}>{escape(text)}</a>'


def _url(demon: dict) -> str:
    return f"/numogram/{demon_slug(demon)}/"


def _instrument(demon: dict | None = None) -> str:
    return "/library.html#view=numogram" + ("&demon=" + quote(demon["id"]) if demon else "")


def _shell(title: str, description: str, route: str, body: str, *, origin: str, schemas: list[dict]) -> str:
    canonical = origin + route
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)}</title><meta name="description" content="{escape(description, quote=True)}">
<link rel="canonical" href="{canonical}"><meta name="robots" content="index,follow,max-snippet:-1">
<meta property="og:type" content="article"><meta property="og:title" content="{escape(title, quote=True)}">
<meta property="og:description" content="{escape(description, quote=True)}"><meta property="og:url" content="{canonical}">
<meta property="og:site_name" content="NUMO"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/numogram/numogram.css">
<script type="application/ld+json">{_json({'@context':'https://schema.org','@graph':schemas})}</script>
</head><body><a class="skip" href="#main">Skip to content</a>
<header class="masthead"><a class="brand" href="/numogram/">NUMO<span>the decimal labyrinth</span></a>
<nav aria-label="Main">{_a('/numogram/', 'Numogram')}{_a('/books/', 'Books')}{_a(_instrument(), 'Open instrument')}</nav></header>
<main id="main">{body}</main>
<footer><p>NUMO · A reference and reading instrument from {_a('/', 'CARE Library')}.</p>
<p>Names and Matrix attributes are attributed to CCRU. Arithmetic is shown separately from interpretation.</p>
<p>{_a(NUMOGRAM_URL, 'CCRU: Decimal Numogram')} · {_a(MATRIX_URL, 'CCRU: Pandemonium Matrix')} · {_a(GLOSSARY_URL, 'CCRU glossary')}</p></footer>
</body></html>'''


def _breadcrumbs(origin: str, demon: dict | None = None) -> dict:
    items = [{"@type": "ListItem", "position": 1, "name": "Numogram", "item": origin + "/numogram/"}]
    if demon:
        items.append({"@type": "ListItem", "position": 2, "name": demon["name"], "item": origin + _url(demon)})
    return {"@type": "BreadcrumbList", "itemListElement": items}


def _region(number: int) -> str:
    return "Warp" if number in {3, 6} else "Plex" if number in {0, 9} else "Time-Circuit"


def _channel(number: int) -> int:
    gate = number * (number + 1) // 2
    return 0 if gate == 0 else 1 + (gate - 1) % 9


def _diagram(poles: list[int] | None = None) -> str:
    points = {9:(190,35),0:(330,35),8:(120,120),1:(250,120),7:(95,220),2:(280,220),
              6:(395,150),3:(395,270),5:(130,330),4:(265,330)}
    paths = []
    for high in range(5, 10):
        end = high - (9 - high)
        x1, y1 = points[high]; x2, y2 = points[end]
        if high == end:
            paths.append(f'<path d="M {x1+15} {y1-5} C {x1+90} {y1-65}, {x1+90} {y1+65}, {x1+15} {y1+5}"/>')
        else:
            paths.append(f'<path d="M {x1} {y1} L {x2} {y2}"/>')
    if poles:
        (x1,y1),(x2,y2) = (points[value] for value in poles)
        paths.append(f'<path class="span" d="M {x1} {y1} L {x2} {y2}"/>')
    circles = []
    for value, (x, y) in points.items():
        active = ' class="selected"' if poles and value in poles else ""
        circles.append(f'<g{active}><circle cx="{x}" cy="{y}" r="19"/><text x="{x}" y="{y+6}">{value}</text></g>')
    label = f"Net-span {poles[0]}::{poles[1]} highlighted on the ten Numogram zones" if poles else "The ten Numogram zones and five arithmetic currents"
    return f'<svg class="diagram" viewBox="0 0 490 390" role="img" aria-label="{label}"><g class="currents">{"".join(paths)}</g>{"".join(circles)}</svg>'


def _landing(demons: list[dict], origin: str) -> str:
    title = "Numogram — Decimal Labyrinth and the 45 Demons | NUMO"
    description = "Explore the Numogram: ten zones, five currents, gates, channels and all 45 demons of CCRU’s Pandemonium Matrix. Open any demon in NUMO."
    rows = []
    for demon in demons:
        rows.append(f'<tr><td><code>{escape(demon["id"])}</code></td><th scope="row">{_a(_url(demon), demon["name"])}</th><td>{escape(demon["net_span"])}</td><td>{escape(demon.get("domain", ""))}</td></tr>')
    zones = "".join(f'<tr><th scope="row">{n}</th><td>{9-n}</td><td>{n*(n+1)//2:02d}</td><td>{_channel(n)}</td><td>{_region(n)}</td></tr>' for n in range(10))
    body = f'''<section class="hero landing"><div><p class="eyebrow">CCRU · Pandemonium</p><h1>Numogram</h1>
<p class="lede">Ten zones. Forty-five demons. A decimal labyrinth to read and explore.</p>
<p>The Numogram is CCRU’s map of decimal zones and their connections. Its companion, the Pandemonium Matrix, names a demon for each pair of distinct zones. NUMO brings those records together with an interactive map.</p>
<p class="actions">{_a(_instrument(), 'Enter the Numogram', ' class="button"')}{_a('#demons', 'Browse all 45 demons', ' class="quiet"')}</p></div><div>{_diagram()}</div></section>
<section class="reading"><h2>How the Numogram is organised</h2>
<p>The ten zones are numbered 0–9. Nine-sum twinning pairs them into five syzygies: 9–0, 8–1, 7–2, 6–3 and 5–4. Subtracting the lower zone from the higher gives a current’s destination. For example, 8 − 1 = 7.</p>
<p>Each zone also has a gate: the sum of the integers from 1 to that zone. Reducing that total to a single digit gives its channel destination. Zone 7 therefore has gate 28 and a channel to zone 1, because 2 + 8 = 10 and 1 + 0 = 1. Gate zero remains an explicitly disputed case in the source tradition.</p>
<p>These connections distinguish the Time-Circuit, the Warp and the Plex. They are the map’s arithmetic structure. Demon names, domains, pitches and rites belong to the attributed Matrix records; later readings and correspondences are separate interpretive layers.</p>
<div class="table-scroll"><table><caption>Zones, twins, gates and channels</caption><thead><tr><th>Zone</th><th>Twin</th><th>Gate</th><th>Channel to</th><th>Region</th></tr></thead><tbody>{zones}</tbody></table></div>
<p class="source">Source: {_a(NUMOGRAM_URL, 'CCRU, “Decimal Numogram”')} and {_a(MATRIX_URL, '“Pandemonium”')}. The numerical values in this table are calculated directly from the stated rules.</p></section>
<section id="demons"><p class="eyebrow">Mesh 00–44</p><h2>The forty-five demons</h2>
<p>Choose a name to read its own Matrix entry, see its two zones, follow its recorded rites and open that demon directly in the instrument. A net-span such as 1::0 identifies a pair of zones; a Mesh number identifies the record in the Matrix.</p>
<div class="table-scroll"><table><caption>Published Pandemonium Matrix reference</caption><thead><tr><th>Mesh</th><th>Demon</th><th>Net-span</th><th>Domain</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section>'''
    schemas = [{"@type":"CollectionPage", "@id":origin + "/numogram/#page", "url":origin + "/numogram/",
                "name":title, "description":description, "inLanguage":"en", "isBasedOn":[NUMOGRAM_URL,MATRIX_URL],
                "mainEntity":{"@type":"ItemList", "numberOfItems":45, "itemListElement":[
                    {"@type":"ListItem", "position":i+1, "name":demon["name"], "url":origin+_url(demon)} for i,demon in enumerate(demons)]}}, _breadcrumbs(origin)]
    return _shell(title, description, "/numogram/", body, origin=origin, schemas=schemas)


def _demon_page(demon: dict, demons: list[dict], origin: str) -> str:
    name, identity, span = demon["name"], demon["id"], demon["net_span"]
    title = f"{name} — Numogram Demon {identity} | NUMO"
    description = f"{name}, {identity}, net-span {span}: {demon.get('epithet','').rstrip('.')} in CCRU’s Pandemonium Matrix. Attributes, zones, rites and the NUMO instrument."
    aliases = ", ".join(demon.get("aliases", []))
    fields = [("Mesh",identity),("Net-span",span),("Epithet",demon.get("epithet")),("Domain",demon.get("domain")),
              ("Class",demon.get("demon_class")),("Pitch",demon.get("pitch")),("Aliases",aliases)]
    if demon.get("phase_limit") is not None:
        fields.append(("Phase limit",str(demon["phase_limit"])))
    door = demon.get("door") or {}
    for label,key in (("Door number","number"),("Door name","name"),("Door correspondence","correspondence"),("Door location","location")):
        if door.get(key): fields.append((label,str(door[key])))
    attributes = "".join(f'<dt>{escape(label)}</dt><dd>{escape(str(value))}</dd>' for label,value in fields if value)
    pole_rows = "".join(f'<tr><th scope="row">Zone {n}</th><td>{_region(n)}</td><td>{9-n}</td><td>{n*(n+1)//2:02d}</td><td>{_channel(n)}</td></tr>' for n in demon["poles"])
    rite_rows = []
    for rite in demon.get("rites", []):
        sequence = " → ".join(str(n) for n in rite.get("zones", [])) or "Not specified"
        rite_rows.append(f'<tr><th scope="row">{escape(str(rite.get("rite_id", "")))}</th><td><code>{escape(str(rite.get("code", "")))}</code></td><td>{escape(sequence)}</td></tr>')
    rites = (f'<div class="table-scroll"><table><caption>{escape(name)}: recorded rite sequences</caption><thead><tr><th>Rite</th><th>Code</th><th>Zone sequence</th></tr></thead><tbody>{"".join(rite_rows)}</tbody></table></div>'
             if rite_rows else '<p>The published reference records no rite sequence for this entry.</p>')
    relations = "".join(f'<li><strong>{escape(str(row.get("relation", "")))}</strong> · {escape(str(row.get("target", "")))}</li>' for row in demon.get("relations", []))
    related = [item for item in demons if item["id"] != identity and set(item["poles"]) & set(demon["poles"])]
    neighbours = "".join(f'<li>{_a(_url(item),item["name"])} <span>{escape(item["net_span"])}</span></li>' for item in related)
    high, low = demon["poles"]
    body = f'''<nav class="breadcrumbs" aria-label="Breadcrumb">{_a('/numogram/','Numogram')}<span>/</span>{escape(name)}</nav>
<article><section class="hero"><div><p class="eyebrow">{escape(identity)} · {escape(span)}</p><h1>{escape(name)}</h1>
<p class="lede">{escape(str(demon.get('epithet','')))}</p>
<p>In CCRU’s Pandemonium Matrix, <strong>{escape(name)}</strong> is the demon of net-span <strong>{escape(span)}</strong>, the pair formed by zones {high} and {low}. Its recorded domain is <strong>{escape(str(demon.get('domain','')))}</strong>.</p>
{f'<p>Also named {escape(aliases)} in the published reference.</p>' if aliases else ''}
<p class="actions">{_a(_instrument(demon),f'Open {name} in NUMO',' class="button"')}{_a('#matrix-entry','Read the Matrix entry',' class="quiet"')}</p></div><div>{_diagram(demon['poles'])}<p class="diagram-caption">Net-span {escape(span)} highlighted. Thin lines show arithmetic currents; the highlighted span marks this demon’s pair.</p></div></section>
<section id="matrix-entry" class="two-columns"><div><p class="eyebrow">Attributed reference</p><h2>Matrix entry</h2><dl class="attributes">{attributes}</dl></div>
<aside class="note"><h2>Reading the record</h2><p>The Mesh address identifies {escape(name)} within the 45-entry Matrix. The net-span identifies its two zones; it does not itself add a directed current to the map.</p>
<p>Names, epithets, domains and other attributes here come from the published NUMO reference adapted from CCRU’s Matrix. They are presented as source records. The zone table below is arithmetic calculated from the Numogram’s rules.</p>
<p>{_a(MATRIX_URL, 'Read CCRU’s Pandemonium Matrix')} · {_a(f'https://www.ccru.net/zones/Zn{high}.htm', f'CCRU: Zone {high}')} · {_a(f'https://www.ccru.net/zones/Zn{low}.htm', f'CCRU: Zone {low}')}</p></aside></section>
<section><h2>Zones {high} and {low}</h2><p>These are the two endpoints of {escape(name)}’s net-span. Each endpoint retains its own twin, gate and channel destination.</p>
<div class="table-scroll"><table><caption>Arithmetic context for net-span {escape(span)}</caption><thead><tr><th>Zone</th><th>Region</th><th>Twin</th><th>Gate</th><th>Channel to</th></tr></thead><tbody>{pole_rows}</tbody></table></div></section>
<section><h2>Rites</h2><p>Rite codes retain the order published in the reference. The arrow notation expands each recorded sequence into its successive zone numbers.</p>{rites}</section>
{f'<section><h2>Recorded relations</h2><ul class="relations">{relations}</ul><p class="source">Labels such as CLICKS, CIPHERS, PROWLS and SHADOWS belong to CCRU’s Matrix and glossary. They are distinct from the map’s computed currents.</p></section>' if relations else ''}
<section><h2>Demons sharing a zone</h2><p>These records share zone {high} or zone {low} with {escape(name)}. Shared endpoints provide a way to browse the Matrix; they do not assert that the entries have the same domain.</p><ul class="neighbours">{neighbours}</ul></section>
</article>'''
    canonical = origin + _url(demon)
    schemas = [{"@type":"WebPage", "@id":canonical+"#page", "url":canonical, "name":title,
                "description":description,"inLanguage":"en", "isBasedOn":MATRIX_URL,
                "mainEntity":{"@type":"DefinedTerm","@id":canonical+"#term","name":name,"termCode":identity,
                              "description":f'{demon.get("epithet", "")} Net-span {span}. Domain: {demon.get("domain", "")}.',
                              **({"alternateName":demon["aliases"]} if aliases else {}),
                              "inDefinedTermSet":{"@type":"DefinedTermSet","name":"CCRU Pandemonium Matrix","url":MATRIX_URL}}},
               _breadcrumbs(origin,demon)]
    return _shell(title,description,_url(demon),body,origin=origin,schemas=schemas)


CSS = '''
:root{color-scheme:dark;--bg:#101512;--panel:#18211b;--ink:#e2e5d5;--muted:#a7b4a7;--accent:#b5cd95;--line:#344438}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:30px}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--accent);text-underline-offset:4px}a:hover{color:#f0f6df}a:focus-visible{outline:2px solid var(--accent);outline-offset:6px}.skip{position:absolute;left:18px;top:-100px;padding:8px 14px;background:var(--panel);z-index:10}.skip:focus{top:12px}.masthead{display:flex;align-items:center;justify-content:space-between;gap:28px;max-width:1180px;margin:auto;padding:30px 34px;border-bottom:1px solid var(--line)}.brand{font:600 27px/1.2 Georgia,serif;letter-spacing:.08em;text-decoration:none;color:var(--ink)}.brand span{display:block;margin-top:7px;font:10px/1.5 ui-monospace,monospace;letter-spacing:.12em;color:var(--muted)}nav{display:flex;gap:25px;font-size:14px}main{max-width:1180px;padding:35px 34px 80px;margin:auto}section{margin:0 0 70px}h1,h2{font-family:Georgia,"Times New Roman",serif;font-weight:400;line-height:1.1;text-wrap:balance}h1{font-size:clamp(58px,8vw,108px);letter-spacing:-.045em;margin:16px 0 25px}h2{font-size:35px;margin:0 0 25px}p{max-width:74ch;margin:0 0 21px}.eyebrow{font:12px/1.6 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}.hero{display:grid;grid-template-columns:1.15fr 1fr;align-items:center;gap:42px;padding:28px 0 5px}.lede{font:26px/1.4 Georgia,serif;color:#c4d1b5;max-width:26ch;margin-bottom:25px}.actions{display:flex;align-items:center;gap:25px;flex-wrap:wrap;margin-top:30px}.button{display:inline-block;background:var(--accent);color:#18231b;text-decoration:none;padding:12px 20px;border-radius:3px;font-size:15px;font-weight:600}.button:hover{background:#d7e9bb;color:#101512}.quiet{font-size:14px}.diagram{width:100%;height:auto;display:block}.diagram .currents{fill:none;stroke:#5b705f;stroke-width:1.5}.diagram .currents .span{stroke:#c4dd9c;stroke-width:3.5}.diagram circle{fill:var(--bg);stroke:#728b73;stroke-width:1.3}.diagram text{fill:#b6c8b4;font:17px ui-monospace,monospace;text-anchor:middle}.diagram .selected circle{fill:#c4dd9c;stroke:#c4dd9c}.diagram .selected text{fill:#152116}.diagram-caption{font-size:12px;line-height:1.6;color:var(--muted);max-width:40ch;margin:0 auto;text-align:center}.breadcrumbs{font-size:13px;color:var(--muted);margin:4px 0 12px;gap:12px}.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:55px}.attributes{display:grid;grid-template-columns:minmax(120px,.6fr) 1fr;margin:0}.attributes dt,.attributes dd{border-bottom:1px solid var(--line);margin:0;padding:12px 0;font-size:15px}.attributes dt{color:var(--muted)}.note{padding:30px;background:var(--panel);align-self:start;border-left:2px solid #79996b;font-size:15px}.note h2{font-size:27px}.note p:last-child{margin:0}.table-scroll{overflow-x:auto;margin:28px 0}table{border-collapse:collapse;width:100%;font-size:15px;text-align:left}caption{text-align:left;font:12px/1.5 ui-monospace,monospace;color:var(--muted);padding:0 0 15px}th,td{padding:14px 18px 14px 0;border-bottom:1px solid var(--line);vertical-align:top}thead th{font:11px/1.5 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}tbody th{font-weight:400}td code{font-size:12px;white-space:nowrap}.source{color:var(--muted);font-size:14px}.relations{list-style:none;padding:0}.relations li{border-bottom:1px solid var(--line);padding:14px 0;font-size:15px}.relations strong{font:12px ui-monospace,monospace}.neighbours{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 25px;padding:0;list-style:none}.neighbours li{padding:12px 0;border-bottom:1px solid var(--line);font-size:15px}.neighbours span{display:block;font:11px/1.8 ui-monospace,monospace;color:var(--muted)}footer{border-top:1px solid var(--line);max-width:1112px;margin:0 auto;padding:32px 0 42px;color:var(--muted);font-size:12px}footer p{max-width:90ch;margin-bottom:8px}@media(max-width:720px){body{font-size:16px}.masthead{padding:22px 20px;align-items:flex-start}.masthead nav{gap:13px;flex-wrap:wrap;justify-content:flex-end;max-width:190px;font-size:12px}main{padding:24px 20px 45px}.hero{display:block}.hero .diagram{max-width:430px;margin:20px auto 5px}.hero .lede{font-size:25px}section{margin-bottom:48px}.two-columns{display:block}.note{margin-top:30px;padding:23px}.neighbours{grid-template-columns:repeat(2,minmax(0,1fr))}h2{font-size:29px}table{min-width:470px}th,td{padding-right:20px}footer{margin:0 20px}h1{font-size:64px}}
'''


def build(source: Path, destination: Path | None = None, *, origin: str = "https://carelibrary.org") -> list[dict]:
    source = Path(source).resolve(strict=True)
    destination = Path(destination or source)
    origin = _origin(origin)
    demons = load_reference(source)
    directory = destination / "numogram"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "numogram.css").write_text(scope_stylesheet(CSS),encoding="utf-8")
    (directory / "index.html").write_text(embed_library(source, _landing(demons,origin), {"view":"numogram"}),encoding="utf-8")
    pages = [{"loc":origin+"/numogram/"}]
    manifest = [{"url":"/numogram/","path":"numogram/index.html"}]
    for demon in demons:
        slug = demon_slug(demon)
        folder = directory / slug
        folder.mkdir(exist_ok=True)
        (folder / "index.html").write_text(embed_library(source, _demon_page(demon,demons,origin),
            {"view":"numogram","demon":demon["id"]}),encoding="utf-8")
        pages.append({"loc":origin+_url(demon)})
        manifest.append({"url":_url(demon),"path":f"numogram/{slug}/index.html","demon_id":demon["id"]})
    (directory / "manifest.json").write_text(json.dumps({"version":1,"pages":manifest,
        "public_reference_sha256":hashlib.sha256((source/"native/numogram-reference.mjs").read_bytes()).hexdigest()},indent=2)+"\n",encoding="utf-8")
    return pages


if __name__ == "__main__":
    build(Path(__file__).resolve().parents[1])
