import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDiscoverController,DISCOVER_EXAMPLES,discoverChoices,discoverInitialReading} from '../discover-reader.mjs';
import {incoming} from '../library-core.mjs';

const data=JSON.parse(fs.readFileSync(new URL('./fixtures/original-public-library.json',import.meta.url),'utf8'));

test('Discover starts with a real Hume route across all five reading scales',()=>{
  const reader=createDiscoverController(data),payload=reader.payload();
  assert.equal(payload.reference.id,DISCOVER_EXAMPLES.hume);
  assert.equal(payload.reference.route_mode,'both');
  assert.deepEqual(new Set([payload.reference.layer,...Object.entries(payload.reference.route_layers).filter(([,rows])=>rows.length).map(([layer])=>layer)]),new Set(['SOURCE','CH','CL','MC','WB']));
  assert.ok(payload.reference.route_edges.length>0);
  for(const edge of payload.reference.route_edges)assert.ok(incoming(reader.adapter.index.nodes.get(edge.target_id)).some(link=>link.id===edge.source_id));
});

test('closing a route restores full source and CARE sheets, and route history returns to it',()=>{
  const reader=createDiscoverController(data);
  reader.dispatch('clear_reference',true);
  assert.equal(reader.payload().reference,null);
  assert.equal(reader.payload().stack.care_path.length,4);
  assert.ok(reader.payload().stack.active_chapter.passages.length);
  assert.equal(reader.payload().route_history.can_back,true);
  reader.dispatch('navigate_route',-1);
  assert.equal(reader.payload().reference.id,DISCOVER_EXAMPLES.hume);
  reader.dispatch('navigate_route',1);
  assert.equal(reader.payload().reference,null);
});

test('book changes and source/outline requests stay in the selected public edition',()=>{
  const reader=createDiscoverController(data);
  reader.open({book:'kant'});
  assert.equal(reader.payload().reference.id,DISCOVER_EXAMPLES.kant);
  reader.open({book:'kant',unit:'RAW_KPR_INTRODUCTION'});
  assert.equal(reader.payload().reference,null);
  assert.equal(reader.payload().stack.active_chapter.raw_unit_id,'RAW_KPR_INTRODUCTION');
  reader.dispatch('open_outline_sheet',{id:'CH_KPR_INTRODUCTION',layer:'CH',request_id:'discover-check'});
  assert.equal(reader.payload().outline_response.unit.id,'CH_KPR_INTRODUCTION');
  assert.ok(reader.payload().outline_response.unit.sections[0].items.length);
  assert.throws(()=>reader.open({book:'kant',ref:DISCOVER_EXAMPLES.hume}));
  assert.equal(reader.status().book,'kant');
  reader.open({book:'hume'});
  assert.equal(reader.payload().reference.id,DISCOVER_EXAMPLES.hume);
});

test('atlas lateral references open the native saved comparison and both source books',()=>{
  const reader=createDiscoverController(data);
  reader.open({book:'hume',unit:'XR_KPR_THN',ref:DISCOVER_EXAMPLES.lateral});
  const payload=reader.payload(),connection=payload.connection;
  assert.equal(reader.status().book,'lateral');
  assert.equal(connection.reference.id,DISCOVER_EXAMPLES.lateral);
  assert.equal(connection.members.length,2);
  assert.deepEqual(new Set(connection.reference.route_edges.flatMap(edge=>[reader.adapter.index.nodes.get(edge.source_id)?.work?.slug,reader.adapter.index.nodes.get(edge.target_id)?.work?.slug]).filter(Boolean)),new Set(['hume','kant']));
  assert.match(reader.href(),/lateral=XR_KPR_THN/);
  reader.dispatch('connection_action',{action:'clear_reference'});
  assert.equal(reader.payload().connection.reference,null);
  reader.dispatch('connection_action',{action:'close'});
  assert.equal(reader.payload().connection,null);
  assert.equal(reader.status().book,'hume');
});

test('source passage routes use outgoing direction and invalid atlas inputs preserve the reading',()=>{
  const reader=createDiscoverController(data);
  reader.open({ref:'RAW_THN_INTR:P0001'});
  assert.equal(reader.status().routeMode,'outgoing');
  const previous=reader.getState();
  for(const input of [{book:'private'},{ref:'CH_PRIVATE:AS1'},{ref:'WB_THN'},{unit:'CH_THN_INTR:AS1'}])assert.throws(()=>reader.open(input));
  assert.deepEqual(reader.getState(),previous);
});

test('Discover opens the saved French Bergson route without inventing a metacluster',()=>{
 const reader=createDiscoverController(data);reader.open({book:'bergson'});
 assert.equal(reader.status().referenceId,'CH_MEMA_PHB0:AS1');
 assert.deepEqual(reader.payload().stack.care_path.map(unit=>unit.layer),['CH','CL','WB']);
 assert.equal(reader.payload().reference.route_layers.MC.length,0);
 assert.match(reader.href(),/book=bergson/);
});

test('Discover follows a revised book when its old example reference has been replaced',()=>{
  const revised=structuredClone(data);
  revised.works=revised.works.map(work=>work.slug==='kant'?JSON.parse(JSON.stringify(work).replaceAll('KPR','KNEW')):work);
  delete revised.lateral;
  const reader=createDiscoverController(revised);
  reader.open({book:'kant'});
  assert.equal(reader.status().book,'kant');
  assert.match(reader.status().referenceId,/KNEW/);
  assert.equal(reader.payload().reference.id,reader.status().referenceId);
  assert.equal(reader.payload().connection,null);
  const previous=reader.getState();
  assert.throws(()=>reader.open({book:'lateral'}),/no longer published/);
  assert.deepEqual(reader.getState(),previous);
  assert.deepEqual(reader.dispatch('open_field','XR_KPR_THN'),previous);
});

test('Discover can start from a source-only public book without fixed demonstration editions',()=>{
  const sourceOnly={works:[{id:'WORK_FIRST',slug:'first',title:'First publication',author:'Example',
    sources:[{id:'RAW_FIRST',title:'Chapter',paragraphs:[{id:'RAW_FIRST:DISPLAY-1',text:'Saved source.'}]}],units:[]}]};
  const reader=createDiscoverController(sourceOnly);
  assert.equal(reader.status().book,'first');
  assert.equal(reader.status().referenceId,'');
  assert.equal(reader.payload().stack.active_chapter.raw_unit_id,'RAW_FIRST');
  assert.equal(reader.payload().reference,null);
});

test('featured books and laterals never replace Hume as the opening book',()=>{
  for(const featured_reading of [{type:'book',id:data.works[0].id},{type:'field',id:'FIELD:published'},null]){
    const featured={...data,featured_reading,fields:[{id:'FIELD:published',field:'lateral',title:'Latest comparison'}]};
    assert.deepEqual(discoverInitialReading(featured),{book:'hume'});
    assert.equal(createDiscoverController(featured).status().book,'hume');
    assert.ok(discoverChoices(featured).every(choice=>choice.type==='book'));
  }
});

test('a catalogue with only fields has no default book or book choices',()=>{
  const featured={works:[],fields:[{id:'FIELD:published',field:'lateral'}],featured_reading:{type:'field',id:'FIELD:published'}};
  assert.equal(discoverInitialReading(featured),null);
  assert.deepEqual(discoverChoices(featured),[]);
});

test('a missing Hume falls back to the first published book and ignores featured fields',()=>{
  const works=data.works.filter(work=>work.slug!=='hume');
  const featured={...data,works,lateral:null,featured_reading:{type:'field',id:data.lateral.id}};
  assert.deepEqual(discoverInitialReading(featured),{book:works[0].slug});
  assert.equal(createDiscoverController(featured).status().book,works[0].slug);
});

test('book choices preserve titles and authors and exclude every kind of field',()=>{
  const fixture={works:[{id:'SAME',slug:'same',title:'Book',author:'Author'}],
    fields:[{id:'SAME',field:'corpus'},{id:'OTHER',field:'lateral'}],lateral:{id:'LEGACY'}};
  assert.deepEqual(discoverChoices(fixture),[{type:'book',id:'SAME',value:'same',title:'Book',author:'Author',label:'Author · Book'}]);
});
