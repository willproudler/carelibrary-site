import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSearchPageRoute,searchPageRouteParams,bookRouteUnitState} from '../web-workspace.mjs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';

const data=JSON.parse(readFileSync(new URL('./fixtures/original-public-library.json',import.meta.url)));
const adapter=createPublicReaderAdapter(data);
const routeFor=value=>readSearchPageRoute({querySelector:()=>({textContent:JSON.stringify(value)})});

test('every published fixture CARE unit opens its exact saved sheet in the native Reader',()=>{
 const layers=new Set();let count=0;
 for(const work of data.works)for(const unit of work.units){
  const route=routeFor({view:'workspace',book:work.slug,unit:unit.id});
  const params=searchPageRouteParams('',route);
  const selection=bookRouteUnitState(params,work,adapter.index,{focusToken:'opening:'+count,readingPage:true});
  const state={workId:work.id,referenceId:'old-reference',rawUnitId:'old-source',readingLanguages:{[work.id]:'original'},...selection};
  const payload=adapter.workspace(state),pane=payload.stack.care_path.find(row=>row.id===unit.id);
  assert.equal(payload.stack.work.id,work.id);
  assert.equal(payload.stack.active_unit_id,unit.id);
  assert.equal(payload.reference,null);
  assert.equal(pane.type,unit.layer);
  assert.deepEqual(pane.sections.flatMap(section=>section.items.map(item=>[item.id,item.text])),unit.sections.flatMap(section=>section.items.map(item=>[item.id,item.text])));
  assert.deepEqual(payload.saved_focus,{work_id:work.id,unit_id:unit.id,token:'opening:'+count,reading_page:true});
  layers.add(unit.layer);count++;
 }
 assert.equal(count,79);assert.deepEqual(layers,new Set(['CH','CL','MC','WB']));
});

test('semantic unit/ref bootstrap validates the immutable edition and lets explicit navigation replace its selection',()=>{
 const work=data.works[0],unit=work.units.find(row=>row.layer==='WB');
 const claim=unit.sections.flatMap(section=>section.items)[0];
 const route=routeFor({view:'workspace',book:work.slug,unit:unit.id,ref:claim.id,source:work.sources[0].id,sources:work.sources.map(row=>row.id)});
 const params=searchPageRouteParams('',route);
 assert.equal(params.get('unit'),unit.id);assert.equal(params.get('ref'),claim.id);assert.equal(params.has('source'),false);
 const payload=adapter.workspace({workId:work.id,...bookRouteUnitState(params,work,adapter.index),referenceId:params.get('ref')});
 assert.equal(payload.reference.id,claim.id);assert.equal(payload.stack.active_unit_id,unit.id);
 const next=searchPageRouteParams('#source='+encodeURIComponent(work.sources[0].id),route);
 assert.equal(next.has('unit'),false);assert.equal(next.has('ref'),false);assert.equal(next.get('source'),work.sources[0].id);
 const refOnly=searchPageRouteParams('#ref='+encodeURIComponent(claim.id),route);
 assert.equal(refOnly.has('unit'),false);assert.equal(refOnly.get('ref'),claim.id);
 for(const destination of ['#view=library','#view=studio&draft=private-draft','#field=FIELD%3Aother','#book=hume']){
  const actual=searchPageRouteParams(destination,route);assert.equal(actual.has('unit'),false);assert.equal(actual.has('ref'),false);
 }
 for(const invalid of [claim.id,'CH_NOT_PUBLISHED',data.works[1].units[0].id]){
  assert.throws(()=>bookRouteUnitState(new URLSearchParams({unit:invalid}),work,adapter.index),/not included/);
 }
 const otherUnitClaim=work.units.find(row=>row.id!==unit.id).sections.flatMap(section=>section.items)[0];
 assert.throws(()=>bookRouteUnitState(new URLSearchParams({unit:unit.id,ref:otherUnitClaim.id}),work,adapter.index),/not included/);
 assert.equal(bookRouteUnitState(new URLSearchParams(),work,adapter.index),null);
 const fresh=bookRouteUnitState(params,work,adapter.index,{focusToken:'returning-again',readingPage:true});
 assert.equal(fresh.savedFocus.token,'returning-again');
});

test('an explicit semantic reading reveals the exact CARE pane despite a persisted Outline preference',()=>{
 const source=readFileSync(new URL('../native/study-desk.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function applySavedPaneFocus(runtime){'),end=source.indexOf('\nfunction setupPaneBookmarks',start);
 assert.ok(start>=0&&end>start);
 const apply=new Function('bookmarkablePane','isRouteReference','CSS',source.slice(start,end)+';return applySavedPaneFocus;')(
  (data,id)=>data.stack.care_path.find(unit=>unit.id===id),()=>false,{escape:value=>value});
 for(const readingPage of [true,false]){
  const focus=[],pane={getBoundingClientRect:()=>({width:320}),classList:{contains:()=>false}};
  const runtime={readerView:'outline',data:{stack:{work:{id:'WORK'},care_path:[{id:'WB_EXACT',type:'WB'}]},
   saved_focus:{work_id:'WORK',unit_id:'WB_EXACT',token:'direct-link',...(readingPage?{reading_page:true}:{})}},
   setReaderView(value){this.readerView=value;},focus:id=>focus.push(id)};
  runtime.root={querySelector:selector=>selector==='[data-strip]'?{clientWidth:320}:runtime.readerView==='normal'?pane:null};
  assert.equal(apply(runtime),readingPage);
  assert.equal(runtime.readerView,readingPage?'normal':'outline');
  assert.deepEqual(focus,readingPage?['WB_EXACT']:[]);
  if(readingPage){assert.equal(runtime.savedFocusToken,'direct-link');assert.equal(apply(runtime),false);}
 }
});

test('semantic unit selection is resolved before Reader readiness can hide the accessible fallback',()=>{
 const source=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
 const opening=source.slice(source.indexOf(' async function routeFromURL'),source.indexOf(' function signalLibraryCompanion'));
 assert.ok(opening.indexOf('bookRouteUnitState(p,')>opening.indexOf('loader.ensureWork(work.id)'));
 assert.ok(opening.indexOf('bookRouteUnitState(p,')<opening.indexOf('setLoadStatus();paint();searchPageReady({view,book:'));
 assert.match(opening,/readingPage:currentSearchRoute\(\)\?\.unit===p.get\('unit'\)/);
});
