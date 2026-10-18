import test from 'node:test';
import assert from 'node:assert/strict';
import {indexLibrary} from '../library-core.mjs';
import {reconcileReadings,closeReading} from '../reading-workspace.mjs';
import {SAVED_READING_ID,SAVED_READING_STYLE,normalizeSavedState,normalizeFieldSavedState,collectSavedItems,removeSavedItem,savedItemTarget,filterSavedItems,fieldSavedStorageKey,withSavedFavourite,withSavedBookmark,fieldSavedRecord} from '../saved-library.mjs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';

const work={id:'BOOK',slug:'book',title:'The book',author:'An author',cover_url:'./cover.png',sources:[{id:'RAW_BOOK',title:'Original',paragraphs:[{id:'RAW_BOOK:P1',text:'Original words'}]}],units:[{id:'CH_BOOK',layer:'CH',title:'Chapter one',sections:[{name:'Axioms',items:[{id:'CH_BOOK:A1',text:'An exact thought'}]}]}]};
const data={works:[work]},index=indexLibrary(data);
const field={id:'FIELD:ONE',title:'A saved comparison',field:'lateral',bundle_url:'./data/fields/one.json'};
const fieldStore={saved_panes:[{care_unit_id:'CH_BOOK',work_id:'BOOK',source_pane:'first',saved_at:'2026-10-02'}],saved_axioms:[{care_item_id:'REUSED',unit_id:'SC_ONE',source_pane:'first'},{care_item_id:'REUSED',unit_id:'SC_TWO',source_pane:'second'}]};

test('Saved library is one closeable red reading alongside books',()=>{
  assert.equal(SAVED_READING_STYLE.color,'#b75260');
  assert.equal(SAVED_READING_STYLE.label,'Saved library');
  const opened=reconcileReadings(reconcileReadings(['BOOK'],SAVED_READING_ID),SAVED_READING_ID);
  assert.deepEqual(opened,['BOOK',SAVED_READING_ID]);
  assert.deepEqual(closeReading(opened,SAVED_READING_ID,SAVED_READING_ID),{opened:['BOOK'],destination:'BOOK'});
  assert.deepEqual(closeReading(opened,'BOOK',SAVED_READING_ID),{opened:[SAVED_READING_ID],destination:SAVED_READING_ID});
  assert.deepEqual(closeReading([SAVED_READING_ID],SAVED_READING_ID,SAVED_READING_ID),{opened:[],destination:''});
});

test('malformed browser collections recover and unknown identities are preserved',()=>{
  for(const source of [null,42,'broken',[],{bookmarks:{},favourites:false}])assert.deepEqual(normalizeSavedState(source).bookmarks,[]);
  const old={otherPreference:true,bookmarks:[null,{care_unit_id:'MISSING',title:'Keep me'},{care_unit_id:'CH_BOOK'},{care_unit_id:'CH_BOOK',title:'Latest'}],favourites:['MISSING','MISSING',null,42]};
  const clean=normalizeSavedState(old);
  assert.deepEqual(clean.favourites,['MISSING']);
  assert.deepEqual(clean.bookmarks.map(row=>row.care_unit_id),['MISSING','CH_BOOK']);
  assert.equal(clean.bookmarks[1].title,'Latest');assert.equal(clean.otherPreference,true);
  assert.equal(old.bookmarks.length,4);
  assert.deepEqual(normalizeFieldSavedState({saved_panes:false,saved_axioms:42}),{saved_panes:[],saved_axioms:[]});
});

test('saved collection combines existing book and scoped field saves without loading field files',()=>{
  const reads=[],saved={bookmarks:[{care_unit_id:'CH_BOOK',saved_at:'2026-10-01'},{care_unit_id:'MISSING',title:'Unavailable saved pane'}],favourites:['CH_BOOK:A1']};
  const items=collectSavedItems({saved,index,fields:[field],readLocal:key=>{reads.push(key);return fieldStore;},card:()=>({reading_text:'The selected translation'})});
  assert.deepEqual(reads,[fieldSavedStorageKey(field.id)]);assert.equal(items.length,6);
  assert.equal(items[0].field_id,field.id);assert.equal(items[0].work_title,field.title);
  const regular=items.find(row=>row.care_item_id==='CH_BOOK:A1');
  assert.equal(regular.text,'The selected translation');assert.equal(regular.author,work.author);
  const unavailable=items.find(row=>row.title==='Unavailable saved pane');
  assert.equal(unavailable.available,false);assert.equal(savedItemTarget(unavailable),null);
  const reused=items.filter(row=>row.care_item_id==='REUSED');
  assert.equal(new Set(reused.map(row=>row.id)).size,2);assert.deepEqual(reused.map(row=>row.care_unit_id),['SC_ONE','SC_TWO']);
});

test('opening saved books selects the exact pane or axiom without entering Routes',()=>{
  const items=collectSavedItems({saved:{bookmarks:[{care_unit_id:'CH_BOOK'}],favourites:['CH_BOOK:A1','RAW_BOOK:P1']},index});
  const pane=savedItemTarget(items.find(row=>row.kind==='pane'),'pane-request');
  assert.equal(pane.type,'book');assert.equal(pane.id,'BOOK');assert.equal(pane.state.unitId,'CH_BOOK');
  assert.equal(pane.state.referenceId,'');assert.equal(pane.state.connectionId,'');assert.equal(pane.state.selectedAxiom,null);
  const axiom=savedItemTarget(items.find(row=>row.care_item_id==='CH_BOOK:A1'));
  assert.equal(axiom.state.selectedAxiom.axiom_id,'CH_BOOK:A1');assert.equal(axiom.state.referenceId,'');
  const passage=savedItemTarget(items.find(row=>row.care_item_id==='RAW_BOOK:P1'));
  assert.equal(passage.state.rawUnitId,'RAW_BOOK');assert.equal(passage.state.unitId,'');assert.equal(passage.state.selectedAxiom.passage_id,'RAW_BOOK:P1');
});

test('field save navigation and removal retain exact pane scope for repeated IDs',()=>{
  const items=collectSavedItems({saved:{},index,fields:[field],readLocal:()=>fieldStore});
  const item=items.find(row=>row.care_item_id==='REUSED'&&row.source_pane==='second');
  const target=savedItemTarget(item,'field-request');
  assert.equal(target.type,'field');assert.equal(target.id,field.id);assert.equal(target.state.fieldReference,null);
  assert.deepEqual(target.state.fieldSelected,{id:'REUSED',source_pane:'second'});
  assert.equal(target.state.fieldSavedFocus.unit_id,'SC_TWO');assert.equal(target.state.fieldSavedFocus.token,'field-request');
  const next=removeSavedItem(fieldStore,item);
  assert.equal(next.saved_axioms.length,1);assert.equal(next.saved_axioms[0].source_pane,'first');
  assert.deepEqual(next.saved_panes,fieldStore.saved_panes);assert.equal(fieldStore.saved_axioms.length,2);
});

test('removal never drops unrelated or unavailable saves and filters work across collections',()=>{
  const saved={bookmarks:[{care_unit_id:'CH_BOOK'},{care_unit_id:'MISSING'}],favourites:['CH_BOOK:A1','UNKNOWN'],favouriteDates:{'CH_BOOK:A1':'2026-10-03','UNKNOWN':'2026-10-01'}};
  const items=collectSavedItems({saved,index,fields:[field],readLocal:()=>fieldStore});
  const item=items.find(row=>row.care_item_id==='CH_BOOK:A1'),next=removeSavedItem(saved,item);
  assert.deepEqual(next.favourites,['UNKNOWN']);assert.deepEqual(next.bookmarks,saved.bookmarks);assert.deepEqual(next.favouriteDates,{UNKNOWN:'2026-10-01'});
  assert.equal(filterSavedItems(items,{kind:'axiom',query:'exact thought'}).length,1);
  assert.equal(filterSavedItems(items,{book:field.id}).length,3);
  assert.equal(filterSavedItems(items,{query:'not found'}).length,0);
});

test('legacy comparison favourites remain readable and use their original storage collection',()=>{
  const lateral={id:'XR_PAIR',title:'Old comparison',layer:'XR',sections:[{name:'Claims',items:[{id:'XR_PAIR:A1',text:'A comparison thought'}]}]};
  const items=collectSavedItems({saved:{favourites:['XR_PAIR:A1']},index:indexLibrary({...data,lateral})});
  assert.equal(items[0].field_id,'');assert.equal(items[0].work_title,lateral.title);
  const target=savedItemTarget(items[0]);assert.equal(target.type,'lateral');assert.equal(target.id,lateral.id);assert.equal(target.state.connectionSelection.reference_id,'XR_PAIR:A1');assert.equal(target.state.connectionReferenceId,'');
});

test('candidate bookmark changes do not mutate live state before storage succeeds',()=>{
  const saved={bookmarks:[{care_unit_id:'MISSING'}],favourites:['OLD'],favouriteDates:{OLD:'2026-10-01'}};
  const first=withSavedFavourite(saved,'CH_BOOK:A1',true,'2026-10-18');
  assert.deepEqual(saved.favourites,['OLD']);assert.deepEqual(saved.favouriteDates,{OLD:'2026-10-01'});
  assert.equal(first.favouriteDates['CH_BOOK:A1'],'2026-10-18');
  const removed=withSavedFavourite(first,'OLD',false);
  assert.deepEqual(removed.favourites,['CH_BOOK:A1']);assert.equal(removed.favouriteDates.OLD,undefined);
  const bookmarked=withSavedBookmark(saved,{care_unit_id:'CH_BOOK',saved_at:'2026-10-18'},true);
  assert.equal(bookmarked.bookmarks.length,2);assert.equal(saved.bookmarks.length,1);
});

test('new and old field saves use exact preserved pane metadata instead of another edition',()=>{
  const loaded={...field,bundle:{panes:[{id:'first',unit_id:'CH_BOOK',title:'Preserved chapter',layer:'CH'}]},references:{'first|CH_BOOK:A1':{id:'CH_BOOK:A1',unit_id:'CH_BOOK',sheet_title:'Preserved chapter',reading_text:'The preserved thought',layer:'CH',resolved:true}}};
  const row=fieldSavedRecord(loaded,{care_item_id:'CH_BOOK:A1',unit_id:'CH_BOOK',source_pane:'first'},index,'2026-10-18');
  assert.equal(row.title,'Preserved chapter');assert.equal(row.text,'The preserved thought');assert.equal(row.saved_at,'2026-10-18');assert.equal(row.layer,'CH');
  const items=collectSavedItems({saved:{},index,fields:[loaded],readLocal:()=>({saved_axioms:[{care_item_id:'CH_BOOK:A1',unit_id:'CH_BOOK',source_pane:'first'}]})});
  assert.equal(items[0].text,'The preserved thought');assert.equal(items[0].title,'Preserved chapter');assert.equal(items[0].saved_at,'');
});

test('native reader receives the explicit bookmark focus request',()=>{
  const savedFocus={work_id:work.id,unit_id:'CH_BOOK',token:'new-saved-open'};
  const payload=createPublicReaderAdapter(data).workspace({workId:work.id,unitId:'CH_BOOK',savedFocus});
  assert.deepEqual(payload.saved_focus,savedFocus);
});
