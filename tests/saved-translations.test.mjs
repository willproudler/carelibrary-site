import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {createDiscoverController} from '../discover-reader.mjs';
const data=JSON.parse(fs.readFileSync(new URL('./fixtures/original-public-library.json',import.meta.url)));
const published=JSON.parse(fs.readFileSync(new URL('../data/library.json',import.meta.url)));
const bergson=data.works.find(work=>work.slug==='bergson');
const translated=bergson.units.filter(unit=>unit.translations?.length);
const chooseEnglish=(adapter,state)=>adapter.reduce(state,'public_reading_language',{work_id:bergson.id,language_code:'en'});

test('public languages list exactly the saved English Bergson panes with original fallback',()=>{
 const a=createPublicReaderAdapter(data),state=chooseEnglish(a,{workId:bergson.id});
 assert.equal(translated.length,5);
 const description=a.bookLanguages(bergson.id,state);
 assert.equal(description.translated_count,5);assert.equal(description.total,15);
 assert.match(description.summary,/5 of 15/);assert.match(description.summary,/Other panes use their original text/);
 for(const original of bergson.units){
  const projected=a.unit(original.id,state),variant=original.translations?.[0];
  assert.deepEqual(projected.sections.flatMap(section=>section.items.map(item=>item.text)),(variant||original).sections.flatMap(section=>section.items.map(item=>item.text)));
  assert.equal(projected.sheet_versions.can_translate,false);assert.deepEqual(projected.sheet_versions.language_options,[]);
  assert.equal(projected.sheet_versions.selected_id,variant?.id||'original');
 }
 for(const source of bergson.sources)assert.deepEqual(a.chapter(source.id).passages.map(row=>row.text),source.paragraphs.map(row=>row.text));
 for(const work of data.works.filter(work=>!['sources','units'].some(key=>work[key].some(row=>row.translations?.length))))assert.equal(a.bookLanguages(work.id,state).options.length,1);
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

test('new public readings use saved English by default and retain explicit original choices',()=>{
 const a=createPublicReaderAdapter(data),state={workId:bergson.id};
 assert.equal(a.bookLanguages(bergson.id,state).selected,'en');
 for(const original of translated)assert.equal(a.unit(original.id,state).sheet_versions.selected_id,original.translations[0].id);
 const originalState=a.reduce(state,'public_reading_language',{work_id:bergson.id,language_code:'original'});
 assert.equal(a.bookLanguages(bergson.id,originalState).selected,'original');
 for(const original of translated)assert.equal(a.unit(original.id,originalState).sheet_versions.selected_id,'original');
 const navigated=a.reduce(originalState,'open_sheet',translated[1].id);
 assert.equal(a.unit(translated[1].id,navigated).sheet_versions.selected_id,'original');
});

function sourceTranslationBook(rendition='machine',aligned=true) {
 const passageId='RAW_FRENCH:P0001',variantId='SOURCE_EN';
 const source={id:'RAW_FRENCH',order:1,title:'Chapitre',chapter_id:'CH_FRENCH',language_code:'fr',paragraphs:[{id:passageId,text:'Le texte original.',kind:'passage'}],translations:[{id:variantId,language_code:'en',language_name:'English',title:'Chapter',rendition_type:rendition,paragraphs:[{id:aligned?passageId:`${variantId}:DISPLAY-0001`,text:'The English source text.',kind:aligned?'passage':'display'}]}]};
 const work={id:'WORK_FRENCH',slug:'french',title:'French book',language_code:'fr',sources:[source],units:[{id:'CH_FRENCH',layer:'CH',parents:[],title:'CARE',sections:[{number:1,name:'Analysis',items:[{id:'CH_FRENCH:AS1',text:'Analysis claim.',refs:[passageId]}]}]}]};
 return {works:[work],lateral:{id:'XR_EMPTY',parents:[],sections:[]}};
}

test('saved English source text is projected in panes, expanded chapters and canonical routes',()=>{
 const fixture=sourceTranslationBook(),a=createPublicReaderAdapter(fixture),work=fixture.works[0],source=work.sources[0],state={workId:work.id};
 const chapter=a.chapter(source.id,state);
 assert.equal(chapter.title,'Chapter');assert.equal(chapter.source_rendition_type,'machine');
 assert.equal(chapter.passages[0].text,'The English source text.');assert.equal(chapter.passages[0].route_available,true);
 assert.equal(chapter.source_versions.selected_id,'SOURCE_EN');
 assert.equal(a.workspace(state).stack.active_chapter.passages[0].text,'The English source text.');
 assert.equal(a.outline(work.id,{id:source.id,layer:'SOURCE'},state).chapter.passages[0].text,'The English source text.');
 const route=a.reference('CH_FRENCH:AS1','incoming',{state});
 assert.equal(route.source_passages[0].text,'The English source text.');assert.equal(route.source_passages[0].is_translation,true);
 assert.equal(route.source_passages[0].id,source.paragraphs[0].id);
 assert.deepEqual(route.route_edges.map(row=>[row.source_id,row.target_id]),[['RAW_FRENCH:P0001','CH_FRENCH:AS1']]);
 const original=a.reduce(state,'version_action',{kind:'source',work_id:work.id,unit_id:source.id,variant_id:'original'});
 assert.equal(a.chapter(source.id,original).passages[0].text,'Le texte original.');
 assert.equal(a.bookLanguages(work.id,original).selected,'mixed');
 const reset=a.reduce(original,'public_reading_language',{work_id:work.id,language_code:'en'});
 assert.equal(a.chapter(source.id,reset).passages[0].text,'The English source text.');
 assert.equal(a.bookLanguages(work.id,reset).selected,'en');
});

for(const rendition of ['supplied','machine'])test(`unaligned ${rendition} source translations keep canonical source routes on original text`,()=>{
 const fixture=sourceTranslationBook(rendition,false),a=createPublicReaderAdapter(fixture),work=fixture.works[0],source=work.sources[0],state={workId:work.id};
 const chapter=a.workspace(state).stack.active_chapter;
 assert.equal(chapter.passages[0].text,'The English source text.');assert.equal(chapter.passages[0].route_available,false);
 assert.equal(chapter.source_rendition_type,rendition);
 assert.match(chapter.source_versions.options[1].label,rendition==='supplied'?/supplied translation/:/machine translation/);
 const reference=a.reference('CH_FRENCH:AS1','incoming',{state});
 assert.equal(reference.source_passages[0].text,'Le texte original.');assert.equal(reference.source_passages[0].is_translation,false);
 assert.equal(reference.source_passages[0].reading_language_code,'fr');assert.equal(reference.source_passages[0].chapter_title,'Chapitre');
 assert.equal(a.index.nodes.has(chapter.passages[0].id),false);
 assert.equal(a.reduce(state,'open_reference',chapter.passages[0].id),state);
});

test('missing English variants use original text without claiming an English translation',()=>{
 const fixture=sourceTranslationBook(),work=fixture.works[0];
 work.sources[0].translations[0].language_code='de';
 const a=createPublicReaderAdapter(fixture),state={workId:work.id};
 assert.equal(a.bookLanguages(work.id,state).selected,'original');
 assert.equal(a.chapter(work.sources[0].id,state).passages[0].text,'Le texte original.');
 assert.equal(a.chapter(work.sources[0].id,state).source_versions.is_translation,false);
});


test('every published saved English source and CARE pane opens in English',()=>{
 const a=createPublicReaderAdapter(published);
 for(const work of published.works)for(const pane of [...work.sources,...work.units]){
  const english=pane.translations?.find(row=>row.language_code==='en');if(!english)continue;
  const state={workId:work.id};
  const projected=pane.layer?a.unit(pane.id,state):a.chapter(pane.id,state);
  assert.equal((projected.sheet_versions||projected.source_versions).selected_id,english.id);
  if(pane.layer)assert.deepEqual(projected.sections.flatMap(s=>s.items.map(i=>i.text)),english.sections.flatMap(s=>s.items.map(i=>i.text)));
  else assert.deepEqual(projected.passages.map(p=>p.text),english.paragraphs.map(p=>p.text));
 }
});
