import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createPublicAssetPlan} from '../tools/build-public-assets.mjs';
import {createLibraryLoader,fetchPublicJSON,loadLibrary} from '../library-loader.mjs';
import {indexLibrary} from '../library-core.mjs';

const work=(id,slug)=>({id,slug,title:slug,author:'Author',sources:[{id:`${id}-source`,title:'Source',order:1,text:'Complete source',chapter_id:`${id}-chapter`,paragraphs:[{id:`${id}-passage`,text:'A saved passage.'}]}],units:[{id:`${id}-chapter`,title:'Chapter',layer:'CH',order:1,parents:[],sections:[{name:'Claims',items:[{id:`${id}-claim`,text:'A recorded claim.',refs:[`${id}-passage`]}]}]}]});
const fixture=()=>({format:'care-public-library/1',works:[work('A','alpha'),work('B','beta')],lateral:{id:'L',title:'Comparison',layer:'XR',parents:['A-chapter','B-chapter'],sections:[{name:'Comparison',items:[{id:'L-claim',text:'A saved connection.',refs:['A-claim','B-claim']}]}]},fields:[]});
function harness(data=fixture()){
  const {catalog,files}=createPublicAssetPlan(data),calls=[];
  const fetcher=async(url,options)=>{const path='.'+new URL(url).pathname;calls.push({path,options});return files.has(path)?{ok:true,status:200,json:async()=>JSON.parse(files.get(path))}:{ok:false,status:404};};
  return {data,catalog,files,calls,fetcher,loader:createLibraryLoader(catalog,{fetch:fetcher,baseURL:'https://carelibrary.org/library-loader.mjs'})};
}

test('catalogue is readable without fetching prose; opening one book deduplicates and preserves the export',async()=>{
  const h=harness(),{loader}=h;
  assert.equal(h.calls.length,0);assert.deepEqual(loader.data.works[0].sources[0].paragraphs,[]);
  assert.equal(loader.data.works[0].sources[0].text,undefined);assert.deepEqual(loader.data.works[0].units[0].sections,[]);
  assert.equal(indexLibrary(loader.data).nodes.size,5);
  const [a,b]=await Promise.all([loader.ensureWork('A'),loader.ensureWork('alpha')]);
  assert.equal(a,b);assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.cache,'force-cache');
  assert.deepEqual(a,h.data.works[0]);assert.equal(loader.data.works[0],a);
  assert.equal(loader.isWorkLoaded('alpha'),true);assert.equal(loader.isWorkLoaded('beta'),false);
  assert.deepEqual(loader.data.works[1].units[0].sections,[]);
});

test('lateral routes load every parent before indexing and preserve all recorded connections',async()=>{
  const h=harness();await h.loader.ensureLateral();
  assert.equal(h.calls.length,3);assert.deepEqual(h.loader.data.lateral,h.data.lateral);
  const index=indexLibrary(h.loader.data);assert.equal(index.nodes.size,10);
  assert.equal(index.outgoing.get('A-claim')[0].id,'L-claim');
  await h.loader.ensureAll();assert.equal(h.calls.length,3);
});

test('saved pane lookup uses catalogue; a saved claim lazily loads its owner map and book',async()=>{
  const h=harness();assert.equal(await h.loader.ownerFor('A-chapter'),'A');assert.equal(h.calls.length,0);
  await h.loader.ensureReference('B-claim');assert.equal(h.calls.length,2);assert.equal(h.loader.isWorkLoaded('B'),true);assert.equal(h.loader.isWorkLoaded('A'),false);
  assert.equal(await h.loader.ownerFor('missing'),null);assert.equal(h.calls.length,2);
  await assert.rejects(h.loader.ensureReference('missing'),/no longer/);
  await h.loader.ensureReference('L-claim');assert.equal(h.loader.isWorkLoaded('A'),true);assert.deepEqual(h.loader.data.lateral,h.data.lateral);
});

test('a failed or mismatched load can be retried without replacing the shelf entry',async()=>{
  const h=harness();let available=false;
  const loader=createLibraryLoader(h.catalog,{baseURL:'https://carelibrary.org/library-loader.mjs',fetch:async(url,options)=>available?h.fetcher(url,options):{ok:true,json:async()=>work('WRONG','wrong')}});
  await assert.rejects(loader.ensureWork('A'),/does not match/);
  assert.equal(loader.isWorkLoaded('A'),false);assert.deepEqual(loader.data.works[0].units[0].sections,[]);
  available=true;assert.equal((await loader.ensureWork('A')).id,'A');
});

test('transient requests retry; absent files and malformed data fail clearly',async()=>{
  let calls=0;const data=await fetchPublicJSON('https://carelibrary.org/test',{fetch:async()=>++calls===1?{ok:false,status:503}:{ok:true,json:async()=>({ready:true})}});
  assert.equal(calls,2);assert.equal(data.ready,true);
  calls=0;await assert.rejects(fetchPublicJSON('x',{fetch:async()=>{calls++;return {ok:false,status:404};}}),/could not load/);assert.equal(calls,1);
  await assert.rejects(fetchPublicJSON('x',{fetch:async()=>({ok:true,json:async()=>[]})}),/incomplete/);
});

test('catalogue requests revalidate while immutable reading chunks can be reused',async()=>{
  const h=harness(),calls=[];
  const loader=await loadLibrary({baseURL:'https://carelibrary.org/library-loader.mjs',fetch:async(url,options)=>{calls.push([String(url),options.cache]);return {ok:true,json:async()=>h.catalog};}});
  assert.equal(calls[0][0],'https://carelibrary.org/data/catalogue.json');assert.equal(calls[0][1],'no-cache');assert.equal(loader.data,h.catalog);
});

test('asset generation rejects incomplete and cross-book references instead of shipping broken routes',()=>{
  const data=fixture();data.works[0].units[0].sections[0].items[0].refs=['missing'];assert.throws(()=>createPublicAssetPlan(data),/Missing public reference/);
  data.works[0].units[0].sections[0].items[0].refs=['B-claim'];assert.throws(()=>createPublicAssetPlan(data),/crosses a book boundary/);
});

test('release delivery files preserve every canonical book and remain under the catalogue size budget',()=>{
  const raw=readFileSync(new URL('../data/library.json',import.meta.url),'utf8'),data=JSON.parse(raw),before=JSON.stringify(data);
  const {catalog,files}=createPublicAssetPlan(data);
  assert.equal(JSON.stringify(data),before);
  assert.ok(Buffer.byteLength(JSON.stringify(catalog))<Buffer.byteLength(raw)*0.03,'Catalogue must be under 3% of the full export');
  for(const work of data.works){
    const descriptor=catalog.public_assets.works[work.id],content=files.get(descriptor.url);
    assert.deepEqual(JSON.parse(content),work);
    assert.equal(createHash('sha256').update(content).digest('hex'),descriptor.sha256);
    assert.equal(Buffer.byteLength(content),descriptor.bytes);
    indexLibrary({works:[work]});
  }
});
