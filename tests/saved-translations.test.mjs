import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {createDiscoverController} from '../discover-reader.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/library.json',import.meta.url)));
const bergson=data.works.find(work=>work.slug==='bergson');
const translated=bergson.units.filter(unit=>unit.translations?.length);
const chooseEnglish=(adapter,state)=>adapter.reduce(state,'public_reading_language',{work_id:bergson.id,language_code:'en'});

test('public languages list exactly the saved English Bergson panes with original fallback',()=>{
 const a=createPublicReaderAdapter(data),state=chooseEnglish(a,{workId:bergson.id});
 assert.equal(translated.length,5);
 const description=a.bookLanguages(bergson.id,state);
 assert.equal(description.translated_count,5);assert.equal(description.total,9);
 assert.match(description.summary,/5 of 9/);assert.match(description.summary,/source and other panes remain in French/);
 for(const original of bergson.units){
  const projected=a.unit(original.id,state),variant=original.translations?.[0];
  assert.deepEqual(projected.sections.flatMap(section=>section.items.map(item=>item.text)),(variant||original).sections.flatMap(section=>section.items.map(item=>item.text)));
  assert.equal(projected.sheet_versions.can_translate,false);assert.deepEqual(projected.sheet_versions.language_options,[]);
  assert.equal(projected.sheet_versions.selected_id,variant?.id||'original');
 }
 for(const source of bergson.sources)assert.deepEqual(a.chapter(source.id).passages.map(row=>row.text),source.paragraphs.map(row=>row.text));
 for(const work of data.works.filter(work=>work!==bergson))assert.equal(a.bookLanguages(work.id,state).options.length,1);
});

test('independent pane language choices survive navigation and reset with the toolbar',()=>{
 const a=createPublicReaderAdapter(data);let state=chooseEnglish(a,{workId:bergson.id});
 const [first,second]=translated;
 state=a.reduce(state,'version_action',{kind:'sheet',work_id:bergson.id,unit_id:first.id,variant_id:'original'});
 assert.equal(a.unit(first.id,state).sheet_versions.selected_id,'original');
 assert.equal(a.unit(second.id,state).sheet_versions.selected_id,second.translations[0].id);
 assert.equal(a.bookLanguages(bergson.id,state).selected,'mixed');
 state=a.reduce(state,'open_sheet',second.id);
 assert.equal(a.unit(first.id,state).sheet_versions.selected_id,'original');
 state=chooseEnglish(a,state);
 assert.equal(a.bookLanguages(bergson.id,state).selected,'en');assert.equal(a.unit(first.id,state).sheet_versions.selected_id,first.translations[0].id);
 state=a.reduce(state,'public_reading_language',{work_id:bergson.id,language_code:'original'});
 assert.equal(a.bookLanguages(bergson.id,state).translated_count,0);
});

test('translated route cards and expanded sheets keep canonical IDs, passages and edges',()=>{
 const a=createPublicReaderAdapter(data),state=chooseEnglish(a,{workId:bergson.id});
 const original=translated[0],variant=original.translations[0],item=variant.sections[0].items[0];
 const canonical=a.reference(item.id,'both'),route=a.reference(item.id,'both',{state});
 assert.equal(route.text,item.text);assert.equal(route.is_translation,true);
 assert.deepEqual(route.route_edges,canonical.route_edges);
 assert.deepEqual(route.source_passages.map(row=>[row.id,row.text]),canonical.source_passages.map(row=>[row.id,row.text]));
 const viewer=a.card(item.id,{state});assert.equal(viewer.reading_text,item.text);assert.equal(viewer.reading_language_code,'en');
 const outline=a.outline(bergson.id,{id:original.id,layer:original.layer},state);
 assert.equal(outline.unit.sections[0].items[0].id,item.id);assert.equal(outline.unit.sections[0].items[0].text,item.text);
 for(const row of variant.sections.flatMap(section=>section.items)){
  const canonicalItem=a.index.nodes.get(row.id);assert.deepEqual(row.refs,canonicalItem.refs);assert.deepEqual(row.passages,canonicalItem.passages);
 }
});

test('unsupported languages, unknown variants and every generation event remain inert',()=>{
 const a=createPublicReaderAdapter(data),state={workId:bergson.id},unit=translated[0];
 assert.equal(a.reduce(state,'public_reading_language',{work_id:bergson.id,language_code:'xx'}),state);
 for(const kind of ['translate','translate_source','build','generate'])assert.equal(a.reduce(state,'version_action',{kind,work_id:bergson.id,unit_id:unit.id,language_code:'en'}),state);
 assert.equal(a.reduce(state,'version_action',{kind:'sheet',work_id:bergson.id,unit_id:unit.id,variant_id:'not-a-saved-record'}),state);
 assert.equal(a.reduce({workId:'hume'},'version_action',{kind:'sheet',work_id:bergson.id,unit_id:unit.id,variant_id:unit.translations[0].id}).paneVersions,undefined);
});

test('Discover uses the same saved-language reducer without changing its current route',()=>{
 const controller=createDiscoverController(data);controller.open({book:'bergson',ref:translated[0].sections[0].items[0].id});
 const before=controller.status();controller.dispatch('public_reading_language',{work_id:bergson.id,language_code:'en'});
 assert.deepEqual(controller.status(),before);assert.equal(controller.payload().reference.is_translation,true);
});
