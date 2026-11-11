"""Build crawlable canonical URLs from the reviewed public search-page exports."""
from __future__ import annotations

from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

from book_seo import build as build_books
from numogram_seo import build as build_numogram


def build(source: Path, destination: Path | None = None, *, origin: str = "https://carelibrary.org") -> list[dict]:
    destination = Path(destination or source)
    pages = [{"loc":origin+"/"},{"loc":origin+"/about.html"},
             *build_books(source,destination,origin=origin),*build_numogram(source,destination,origin=origin)]
    namespace="http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("",namespace)
    sitemap=ET.Element("{"+namespace+"}urlset")
    found=set()
    for page in pages:
        location=page["loc"]
        if urlsplit(location).fragment or location in found:
            continue
        found.add(location)
        node=ET.SubElement(sitemap,"{"+namespace+"}url")
        ET.SubElement(node,"{"+namespace+"}loc").text=location
        # Source timestamps are optional. Never claim that every page changed
        # merely because a deployment rebuilt its HTML.
        if page.get("lastmod"):
            ET.SubElement(node,"{"+namespace+"}lastmod").text=page["lastmod"]
    ET.indent(sitemap)
    (destination/"sitemap.xml").write_bytes(ET.tostring(sitemap,encoding="utf-8",xml_declaration=True)+b"\n")
    (destination/"robots.txt").write_text(
        "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /login.html\nDisallow: /request-access.html\nDisallow: /site-settings.html\n"
        f"\nSitemap: {origin}/sitemap.xml\n",encoding="utf-8")
    return pages


if __name__ == "__main__":
    build(Path(__file__).resolve().parents[1])
