"""Complete saved reading prose is accessible without executing JavaScript."""
from __future__ import annotations

from copy import deepcopy
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import tempfile
import unittest
from urllib.parse import unquote, urlsplit

import httpx

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'tools'))
from test_book_seo import _book,_publish,seo
from reading_seo import renditions
from server.app import create_app


class _Extract(HTMLParser):
    def __init__(self,source):
        super().__init__(convert_charrefs=True);self.ids=[];self.parts=[];self.skip=0;self.feed(source)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        if tag in {'script','style'}:self.skip+=1
    def handle_endtag(self,tag):
        if tag in {'script','style'}:self.skip-=1
    def handle_data(self,value):
        if not self.skip:self.parts.append(value)


def _reading_book():
    work=_book('TIMAEUS','Timaeus','Plato','published-timaeus')
    work['language_code']='grc';work['language_name']='Ἑλληνική'
    work['sources']=[{'id':'RAW_TIM','chapter_id':'CH_TIM','title':'Source section','text':'Original source passage.',
                      'paragraphs':[{'id':'RAW_TIM:P0001','text':'Original source passage.','kind':'passage'}]}]
    units=[]
    for identity,layer,parents,reference in [('CH_TIM','CH',[],None),('CL_TIM','CL',['CH_TIM'],'CH_TIM:A1'),
                                          ('MC_TIM_L1','MC',['CL_TIM'],'CL_TIM:A1'),('MC_TIM_L2','MC',['MC_TIM_L1'],'MC_TIM_L1:A1'),
                                          ('WB_TIM','WB',['MC_TIM_L2'],'MC_TIM_L2:A1')]:
        item={'id':identity+':A1','text':'Saved canonical Greek CARE wording for '+identity+'. <script>not executable</script>',
              'refs':[reference] if reference else [],'deep_refs':[],'trace_type':'Composite',
              'passages':[{'id':'RAW_TIM:P0001','trace_type':'Composite','confidence':'high','alignment_provenance':'frozen-grounding'}] if layer=='CH' else []}
        units.append({'id':identity,'layer':layer,'title':identity+' saved title','revision':identity+'@R002','sha256':identity.lower()+'-hash',
                      'language_code':'grc','language_name':'Ἑλληνική','parents':parents,'identity':{'context':'Recorded unit context'},
                      'sections':[{'number':'1','name':'Saved section','original_name':'Saved original section','items':[item]}],'translations':[]})
    translation=deepcopy(units[-1])
    translation.update(id='SAVED_ENGLISH_WB_TIM',language_code='en',language_name='English',source_sha256=units[-1]['sha256'],
                       sha256='english-checksum',rendition_type='machine',review_status='machine',model='saved-model',translations=None)
    translation['sections'][0]['items'][0]['text']='Saved English whole-book CARE thesis that an AI can read directly.'
    units[-1]['translations']=[translation]
    work['units']=units
    return work


class ReadingSEOTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.addCleanup(self.temp.cleanup)
        self.work=_reading_book();_publish(self.root,[self.work]);self.pages=seo.build(self.root)
        self.manifest=json.loads((self.root/'books/readings-manifest.json').read_text())
        self.units={entry['unit_id']:entry for entry in self.manifest['pages'] if entry['kind']=='reading'}

    def test_every_unit_and_hierarchy_are_linked_without_a_book_prose_dump(self):
        self.assertEqual(set(self.units),{unit['id'] for unit in self.work['units']})
        book=json.loads((self.root/'books/manifest.json').read_text())['books'][0]
        main=(self.root/book['path']).read_text()
        self.assertIn('Whole-book CARE summary',main)
        self.assertIn(self.units['WB_TIM']['url'],main)
        self.assertNotIn('Saved English whole-book CARE thesis',main)
        self.assertLess(len(main),60000)
        overview=next(entry for entry in self.manifest['pages'] if entry['kind']=='overview')
        self.assertEqual(overview['index_url'],'/platotimaeus/readings/index.json')
        self.assertEqual(overview['layers'],{'WB':1,'MC':2,'CL':1,'CH':1})
        for page in self.manifest['pages']:
            if page['kind']=='layer':self.assertNotIn('index_path',page)
        self.assertEqual(self.units['CH_TIM']['source_id'],'RAW_TIM','Reverse source.chapter_id must work even without RAW parents')
        packet=json.loads((self.root/self.units['MC_TIM_L2']['json_path']).read_text())
        self.assertEqual(packet['metadata']['parents'],['MC_TIM_L1'])

    def test_html_markdown_and_packet_preserve_every_saved_rendition_and_reference(self):
        entry=self.units['WB_TIM'];metadata=(self.root/entry['path']).read_text();full=(self.root/entry['text_path']).read_text()
        english=self.work['units'][-1]['translations'][0]['sections'][0]['items'][0]['text']
        canonical=self.work['units'][-1]['sections'][0]['items'][0]['text']
        self.assertNotIn(english,metadata)
        parsed=_Extract(full);visible=' '.join(parsed.parts)
        self.assertIn(english,visible);self.assertIn(canonical,visible)
        self.assertLess(full.index(english),full.index('Canonical saved CARE rendition'))
        self.assertIn('Saved machine translation of CARE analysis',visible)
        self.assertIn('Recorded review status: machine',visible)
        self.assertIn('not prose written by Plato',visible)
        self.assertNotIn('<script>not executable</script>',full)
        self.assertEqual(len(parsed.ids),len(set(parsed.ids)))
        self.assertIn('ref=WB_TIM:A1',parsed.ids)
        self.assertIn('ref=WB_TIM:A1&rendition=SAVED_ENGLISH_WB_TIM',parsed.ids)
        packet=json.loads((self.root/entry['json_path']).read_text())
        self.assertEqual(packet['schema'],'care-reading-packet/1')
        self.assertEqual(packet['content_kind'],'saved-generated-care-analysis')
        self.assertNotIn('translations',packet['renditions'][1],'Do not duplicate nested saved translations')
        originals={rendition['rendition_type']:rendition['sections'][0]['items'][0]['text'] for rendition in packet['renditions']}
        self.assertEqual(originals,{'machine':english,'canonical':canonical})
        for rendition in packet['renditions']:
            item=rendition['sections'][0]['items'][0]
            self.assertIn(unquote(urlsplit(item['citation_url']).fragment),parsed.ids)
            self.assertEqual(item['refs'],['MC_TIM_L2:A1'])
        md=(self.root/entry['markdown_path']).read_text()
        self.assertIn(english,md);self.assertIn(canonical,md);self.assertIn('Generated CARE analysis; not original author prose.',md)
        source_packet=json.loads((self.root/self.units['CH_TIM']['json_path']).read_text())
        self.assertEqual(source_packet['renditions'][0]['sections'][0]['items'][0]['passages'][0],
                         {'id':'RAW_TIM:P0001','trace_type':'Composite','confidence':'high','alignment_provenance':'frozen-grounding'})

    def test_saved_translation_pin_identity_and_links_are_validated(self):
        unit=deepcopy(self.work['units'][-1]);unit['translations'][0]['source_sha256']='wrong'
        with self.assertRaisesRegex(ValueError,'pinned'):renditions(unit)
        unit=deepcopy(self.work['units'][-1]);unit['translations'][0]['sections'][0]['items'][0]['id']='ANOTHER_ITEM'
        with self.assertRaisesRegex(ValueError,'identities'):renditions(unit)
        unit=deepcopy(self.work['units'][-1]);unit['translations'][0]['sections'][0]['items'][0]['refs']=[]
        with self.assertRaisesRegex(ValueError,'evidence links'):renditions(unit)

    def test_source_only_book_still_gets_an_overview_without_fabricated_units(self):
        source=_book('EMPTY','Source Only','Author','source-only');source['units']=[]
        _publish(self.root,[source]);seo.build(self.root)
        manifest=json.loads((self.root/'books/readings-manifest.json').read_text())
        self.assertEqual(len(manifest['pages']),1)
        self.assertEqual(manifest['pages'][0]['kind'],'overview')
        self.assertEqual(manifest['pages'][0]['unit_count'],0)

    def test_source_passage_anchors_require_exact_reconstruction_without_duplicate_text(self):
        source={'text':'First source paragraph.\n\nSecond source paragraph.',
                'paragraphs':[{'id':'RAW:P1','text':'First source paragraph.'},{'id':'RAW:P2','text':'Second source paragraph.'}]}
        html=seo._source_markup(source);parsed=_Extract(html)
        self.assertEqual(''.join(parsed.parts),source['text'])
        self.assertEqual(parsed.ids,['ref=RAW:P1','ref=RAW:P2'])
        source['paragraphs'][1]['text']='Wording from a different edition.'
        fallback=seo._source_markup(source)
        self.assertNotIn('data-passage-id',fallback)
        self.assertEqual(''.join(_Extract(fallback).parts),source['text'])


class ReadingNoJSAccessTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        folder=Path(self.temp.name).resolve();self.web=folder/'web';self.web.mkdir();(self.web/'index.html').write_text('Public home')
        self.work=_reading_book();_publish(self.web,[self.work]);seo.build(self.web)
        self.entry=next(item for item in json.loads((self.web/'books/readings-manifest.json').read_text())['pages'] if item.get('unit_id')=='WB_TIM')
        self.app=create_app(env={'CARE_PUBLIC_ORIGIN':'https://care.example.test','CARE_WEB_ROOT':str(self.web),
                                 'CARE_DATABASE_PATH':str(folder/'private/accounts.sqlite3')})
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url='https://care.example.test');self.addAsyncCleanup(self.client.aclose)

    async def test_ai_can_read_saved_english_wb_without_js_only_when_public(self):
        phrase='Saved English whole-book CARE thesis that an AI can read directly.'
        self.assertNotIn(phrase,(await self.client.get(self.entry['url'])).text)
        for key in ('markdown_url','json_url'):
            self.assertEqual((await self.client.get(self.entry[key])).status_code,404)
        self.app.state.site_settings.update(False,0)
        response=await self.client.get(self.entry['url']);self.assertEqual(response.status_code,200,response.text)
        self.assertIn(phrase,' '.join(_Extract(response.text).parts))
        self.assertIn('"unit":"WB_TIM"',response.text)
        md=await self.client.get(self.entry['markdown_url']);self.assertEqual(md.status_code,200,md.text)
        self.assertIn(phrase,md.text)
        packet=await self.client.get(self.entry['json_url']);self.assertEqual(packet.status_code,200,packet.text)
        self.assertEqual(packet.json()['metadata']['unit_id'],'WB_TIM')
        self.assertIn(phrase,json.dumps(packet.json(),ensure_ascii=False))
        self.app.state.site_settings.update(True,1)
        self.assertNotIn(phrase,(await self.client.get(self.entry['url'])).text)
        for key in ('markdown_url','json_url'):
            self.assertEqual((await self.client.get(self.entry[key])).status_code,404)


if __name__=='__main__':unittest.main()
