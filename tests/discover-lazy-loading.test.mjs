import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLibraryLoader} from '../library-loader.mjs';
import {createDiscoverController,prepareDiscoverReading,DISCOVER_EXAMPLES} from '../discover-reader.mjs';
import {loadDiscoverAtlasData,buildAtlasModel} from '../discover-atlas.mjs';

const original=JSON.parse(readFileSync(new URL('./fixtures/original-public-library.json',import.meta.url)));

function fixture(){
  const files=new Map(),requests=[];
  const descriptor=(kind,value,index)=>{
    const url=`./data/chunks/${kind}-${String(index).padStart(24,'0')}.json`;
    files.set(new URL(url,'https://example.test/').href,value);return {url};
  };
  const works=Object.fromEntries(original.works.map((work,i)=>[work.id,descriptor('work',work,i+1)]));
  const owners=Object.fromEntries(original.works.flatMap(work=>[
    ...work.sources.flatMap(source=>source.paragraphs.map(item=>[item.id,work.id])),
    ...work.units.flatMap(unit=>unit.sections.flatMap(section=>section.items.map(item=>[item.id,work.id]))),
  ]));
  for(const section of original.lateral.sections)for(const item of section.items)owners[item.id]=original.lateral.id;
  const catalogue={...original,works:original.works.map(work=>({...work,
    sources:work.sources.map(source=>({...source,paragraphs:[]})),
    units:work.units.map(unit=>({...unit,sections:[]})),
  })),lateral:{...original.lateral,sections:[]},public_assets:{version:1,works,
    lateral:{...descriptor('lateral',original.lateral,8),dependencies:original.works.filter(work=>work.units.some(unit=>original.lateral.parents.includes(unit.id))).map(work=>work.id)},
    reference_owners:descriptor('references',owners,9),
  }};
  const library=createLibraryLoader(catalogue,{baseURL:'https://example.test/library-loader.mjs',fetch:async url=>{
    requests.push(String(url));assert.ok(files.has(String(url)),`Unexpected download ${url}`);
    return {ok:true,json:async()=>structuredClone(files.get(String(url)))};
  }});
  return {library,requests,files};
}

test('Discover reader and atlas share the opening book download and leave other books unloaded',async()=>{
  const {library,requests}=fixture();
  const [,atlas]=await Promise.all([prepareDiscoverReading(library),loadDiscoverAtlasData(library)]);
  assert.equal(requests.length,1);
  assert.equal(library.isWorkLoaded('hume'),true);
  assert.equal(library.isWorkLoaded('kant'),false);
  assert.equal(library.isWorkLoaded('bergson'),false);
  assert.deepEqual(atlas.works.map(work=>work.slug),['hume']);
  assert.equal(atlas.lateral,null);
  assert.ok([...buildAtlasModel(atlas).index.nodes.values()].every(node=>node.work.slug==='hume'));
  assert.equal(createDiscoverController(library.data).payload().reference.id,DISCOVER_EXAMPLES.hume);
});

test('loading another book preserves Discover reading history and rebuilds the index only once',async()=>{
  const {library,requests}=fixture();
  await prepareDiscoverReading(library);
  const controller=createDiscoverController(library.data),firstAdapter=controller.adapter;
  controller.dispatch('clear_reference',true);
  await prepareDiscoverReading(library,{book:'kant'});
  controller.refresh();
  assert.notEqual(controller.adapter,firstAdapter);
  assert.equal(controller.refresh(),controller.adapter);
  controller.open({book:'kant'});
  assert.equal(controller.payload().reference.id,DISCOVER_EXAMPLES.kant);
  controller.dispatch('navigate_route',-1);
  assert.equal(controller.status().book,'hume');
  assert.equal(controller.payload().reference,null);
  controller.dispatch('navigate_route',-1);
  assert.equal(controller.payload().reference.id,DISCOVER_EXAMPLES.hume);
  assert.equal(requests.length,2);
});

test('a direct lateral reference loads its recorded parents without loading unrelated books',async()=>{
  const {library}=fixture();
  await prepareDiscoverReading(library,{ref:DISCOVER_EXAMPLES.lateral});
  assert.equal(library.isWorkLoaded('hume'),true);
  assert.equal(library.isWorkLoaded('kant'),true);
  assert.equal(library.isWorkLoaded('bergson'),false);
  const controller=createDiscoverController(library.data);
  controller.open({ref:DISCOVER_EXAMPLES.lateral});
  assert.equal(controller.status().book,'lateral');
  assert.equal(controller.payload().connection.reference.id,DISCOVER_EXAMPLES.lateral);
});
