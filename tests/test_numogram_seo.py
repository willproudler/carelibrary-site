"""Public search pages retain their exact identity and existing instrument UI."""
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import sys
import unittest
import xml.etree.ElementTree as ET

import httpx

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT / "tools"))
sys.path.insert(0,str(ROOT))
from numogram_seo import build, load_reference, demon_slug
from seo_shell import embed_library, scope_stylesheet
from server.app import create_app


class Page(HTMLParser):
    def __init__(self,text):
        super().__init__();self.titles=[];self.current=None;self.metas=[];self.links=[];self.ids=[];self.routes=[];self.script=None
        self.feed(text)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag in {"title","h1"}: self.current=tag
        if tag=="meta": self.metas.append(attrs)
        if tag=="link": self.links.append(attrs)
        if "id" in attrs: self.ids.append(attrs["id"])
        if tag=="script" and attrs.get("id")=="care-search-route": self.script="route"
    def handle_data(self,value):
        if self.current=="title": self.titles.append(value)
        if self.script=="route": self.routes.append(json.loads(value))
    def handle_endtag(self,tag):
        if tag in {"title","h1"}: self.current=None
        if tag=="script": self.script=None


def test_all_demons_have_canonical_server_html_and_exact_instrument_target(tmp_path):
    pages=build(ROOT,tmp_path)
    demons=load_reference(ROOT)
    assert len(pages)==46
    for demon in demons:
        route=f"/numogram/{demon_slug(demon)}/"
        text=(tmp_path/route[1:]/"index.html").read_text()
        page=Page(text)
        assert len(page.titles)==1 and page.titles[0].startswith(demon["name"]+" — Numogram")
        assert {"rel":"canonical","href":"https://carelibrary.org"+route} in page.links
        assert not any(meta.get("name")=="robots" and "noindex" in meta.get("content","") for meta in page.metas)
        assert page.routes==[{"view":"numogram","demon":demon["id"]}]
        assert len(page.ids)==len(set(page.ids)),"Fallback and app IDs must remain unambiguous"
        assert f'<h1>{demon["name"]}</h1>' in text
        assert f'href="/library.html#view=numogram&amp;demon={demon["id"]}"' in text
        assert demon["net_span"] in text and demon["demon_class"] in text
        assert 'id="care-search-app" aria-hidden="true" inert' in text
        assert 'src="/seo-shell.mjs"' in text
    landing=(tmp_path/"numogram/index.html").read_text()
    assert Page(landing).titles[0].startswith("Numogram —")
    assert all('href="/numogram/'+demon_slug(demon)+'/"' in landing for demon in demons)


def test_reference_styles_are_scoped_and_real_shell_keeps_auth_boot_separate(tmp_path):
    build(ROOT,tmp_path)
    css=(tmp_path/"numogram/numogram.css").read_text()
    assert "#care-search-content .hero" in css
    assert "@media(max-width:720px){#care-search-content" in css
    text=(tmp_path/"numogram/lurgo/index.html").read_text()
    assert '<script type="module" src="/library-boot.mjs' not in text
    assert '<base ' not in text,"Root base would break normal current-page hash navigation"
    assert 'id="main"' in text and 'id="care-reference-main"' in text
    loader=(ROOT/"seo-shell.mjs").read_text()
    assert "current.authenticated||current.beta_enabled===false" in loader
    assert "import('/native/numogram-atlas.mjs')" in loader
    assert "event.composedPath().includes(host)" in loader
    assert "location.replace" not in loader


def test_nested_search_html_and_module_dependencies_get_the_same_build_version(tmp_path):
    import importlib.util
    spec=importlib.util.spec_from_file_location("production_builder",ROOT/"tools/build-production-site.py")
    builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
    (tmp_path/"numogram/lurgo").mkdir(parents=True)
    (tmp_path/"native").mkdir()
    (tmp_path/"seo-shell.mjs").write_text("import '/native/atlas.mjs';")
    (tmp_path/"native/atlas.mjs").write_text("import './instrument.mjs';")
    (tmp_path/"native/instrument.mjs").write_text("export const ready=true;")
    nested=tmp_path/"numogram/lurgo/index.html"
    nested.write_text('<script type="module" src="/seo-shell.mjs"></script>')
    builder.stamp_browser_modules(tmp_path)
    import re
    version=re.search(r"/seo-shell.mjs\?v=([a-f0-9]{16})",nested.read_text())[1]
    assert f"'/native/atlas.mjs?v={version}'" in (tmp_path/"seo-shell.mjs").read_text()
    assert f"'./instrument.mjs?v={version}'" in (tmp_path/"native/atlas.mjs").read_text()


class SearchRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        import tempfile
        self.temporary=tempfile.TemporaryDirectory();self.addCleanup(self.temporary.cleanup)
        folder=Path(self.temporary.name).resolve();self.web=folder/"web";self.web.mkdir()
        (self.web/"index.html").write_text("Public home")
        build(ROOT,self.web)
        (self.web/"books/book").mkdir(parents=True)
        (self.web/"books/index.html").write_text("Book list")
        (self.web/"books/books.css").write_text("/* public presentation */")
        (self.web/"books/book/index.html").write_text("Public metadata only")
        (self.web/"books/book/01-source").mkdir()
        (self.web/"books/book/01-source/index.html").write_text("Chapter metadata only")
        (self.web/"books/book/01-source/text.html").write_text("Protected original words")
        (self.web/"books/manifest.json").write_text(json.dumps({"schema":"care-book-search-pages/1","books":[{
            "slug":"book","url":"/books/book/","path":"books/book/index.html"}],"chapters":[{
            "book_slug":"book","slug":"01-source","source_id":"EXACT_SOURCE","url":"/books/book/01-source/",
            "path":"books/book/01-source/index.html","text_path":"books/book/01-source/text.html","has_text":True}]}))
        (self.web/"native").mkdir()
        for name in ("numogram-atlas.mjs","numogram-instrument.mjs","numogram-reference.mjs","study-desk.mjs","reading-views.mjs"):
            (self.web/"native"/name).write_text("export default {}")
        self.app=create_app(env={"CARE_PUBLIC_ORIGIN":"https://care.example.test","CARE_WEB_ROOT":str(self.web),
            "CARE_DATABASE_PATH":str(folder/"private/accounts.sqlite3")})
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url="https://care.example.test")
        self.addAsyncCleanup(self.client.aclose)

    async def test_public_exact_demon_routes_allow_no_original_reading_data(self):
        response=await self.client.get("/numogram/lurgo/")
        self.assertEqual(response.status_code,200,response.text)
        self.assertNotIn("noindex",response.headers.get("x-robots-tag",""))
        self.assertIn("Lurgo — Numogram",response.text)
        self.assertEqual((await self.client.get("/numogram/lurgo")).headers["location"],"/numogram/lurgo/")
        self.assertEqual((await self.client.get("/numogram/not-a-demon/")).status_code,404)
        self.assertEqual((await self.client.get("/numogram/private.json")).status_code,404)
        for name in ("numogram-atlas.mjs","numogram-instrument.mjs","numogram-reference.mjs"):
            self.assertEqual((await self.client.get("/native/"+name)).status_code,200)
        for name in ("study-desk.mjs","reading-views.mjs"):
            self.assertEqual((await self.client.get("/native/"+name)).status_code,401)

    async def test_original_book_text_follows_live_public_mode_without_caching_gate(self):
        self.assertEqual((await self.client.get("/books/book/")).text,"Public metadata only")
        self.assertEqual((await self.client.get("/books/book/text.html")).status_code,404)
        self.assertEqual((await self.client.get("/books/book/01-source/")).text,"Chapter metadata only")
        self.assertEqual((await self.client.get("/books/book/01-source/text.html")).status_code,404)
        self.app.state.site_settings.update(False,0)
        self.assertEqual((await self.client.get("/books/book/")).text,"Public metadata only")
        self.assertEqual((await self.client.get("/books/book/01-source/")).text,"Protected original words")
        self.assertEqual((await self.client.get("/books/book/01-source/text.html")).status_code,308)
        self.assertEqual((await self.client.get("/books/book/text.html")).status_code,404)
        self.app.state.site_settings.update(True,1)
        self.assertEqual((await self.client.get("/books/book/")).text,"Public metadata only")
        self.assertEqual((await self.client.get("/books/book/01-source/")).text,"Chapter metadata only")
        self.assertEqual((await self.client.get("/books/book/01-source/text.html")).status_code,404)
