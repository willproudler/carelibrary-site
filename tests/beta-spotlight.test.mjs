import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {searchPublished, searchSpotlight} from '../native/beta-search.mjs';
import {html, css} from '../native/spotlight.mjs';

const works = [
  {id:'KANT',slug:'kant',title:'Critique of Judgement',author:'Immanuel Kant',year:1790},
  {id:'HUME',slug:'hume',title:'An Enquiry Concerning Human Understanding',author:'David Hume',year:1748},
  {id:'HEGEL',slug:'hegel',title:'The Science of Logic',author:'Georg Wilhelm Friedrich Hegel',year:1812},
];
const fields = [{id:'LATERAL:kant-hume',field:'lateral',title:'Kant × Hume'}];
const options = {works,fields};
const unexpectedSearch = () => assert.fail('A catalogue-only query used the text index.');

test('the web palette carries the exported desktop markup, styling, and runtime', async () => {
  const manifest = JSON.parse(await readFile(new URL('../native/spotlight-version.json',import.meta.url)));
  const source = await readFile(new URL('../native/spotlight.mjs',import.meta.url),'utf8');
  const js = source.slice(source.indexOf('\nconst INSTANCES'));
  const sha = value => createHash('sha256').update(value).digest('hex');
  assert.equal(manifest.source,'care_platform/global_shortcuts.py');
  assert.deepEqual({html:sha(html),css:sha(css),js:sha(js)},manifest.assets);
  assert.match(html, /class="csp-overlay"/);
  assert.match(html, /Find in document/);
  assert.match(source,/runtime\.overlay\.showModal/);
});

test('author and century requests match the published catalogue directly', async () => {
  const search = unexpectedSearch;
  const author = await searchSpotlight('Books by Hume, David',{...options,search});
  assert.deepEqual(author.results.map(row=>row.href),['#book=hume']);
  const period = await searchSpotlight('Books from the nineteenth century',{...options,search});
  assert.deepEqual(period.results.map(row=>row.href),['#book=hegel']);
});

test('content requests preserve strict phrases and map native cards to approved routes', async () => {
  const {results} = await searchSpotlight('Passages by Immanuel Kant mentioning "power of judging"',{
    ...options,
    search(request) {
      assert.deepEqual(request,{query:'"power of judging"',kind:'passage',mode:'classic',limit:9,work_id:'KANT'});
      return {results:[
        {kind:'passage',target_key:'passage:raw1',item_id:'raw1',work_id:'KANT',text:'The power of judging.',
          title:'Introduction',work_title:works[0].title,author:works[0].author,href:'#book=kant&ref=raw1'},
        {kind:'passage',target_key:'passage:raw2',item_id:'raw2',work_id:'HUME',href:'#book=hume&ref=raw2'},
        {kind:'passage',target_key:'passage:unsafe',item_id:'unsafe',work_id:'KANT',href:'https://private.invalid'},
      ]};
    },
  });
  assert.equal(results.length,1);
  assert.equal(results[0].href,'#book=kant&focus=raw1');
  assert.equal(results[0].presentation.badge,'Original passage');
  assert.deepEqual(results[0].presentation.heading,[['Introduction',false]]);
  assert.ok(results[0].presentation.title.some(([text,matched])=>text==='judging'&&matched));
});

test('the shared search transport is same-origin and takes an abort signal', async () => {
  const {signal} = new AbortController();
  const results = await searchPublished({query:'custom',kind:'axiom',mode:'deep'},{signal,fetcher(url,options) {
    assert.equal(url,'/api/library/search');
    assert.equal(options.credentials,'same-origin');
    assert.equal(options.method,'POST');
    assert.equal(options.signal,signal);
    assert.deepEqual(JSON.parse(options.body),{query:'custom',kind:'axiom',mode:'deep'});
    return {ok:true,json:async()=>({results:[],more:false})};
  }});
  assert.deepEqual(results,{results:[],more:false});
});
