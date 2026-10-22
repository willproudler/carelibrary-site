import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFieldMembers,loadPublicField,fieldPayload,fieldReference} from '../public-fields.mjs';

function fixture() {
  const leaf={id:'WB_ONE:A1',text:'Exact saved whole-book claim',source_trace:['MC_ONE:A1']};
  const field={id:'FIELD:preview',field:'corpus',reference_mode:'preserved-on-demand',bundle:{
    id:'FIELD:preview',field:'corpus',preview_depth:'WB',members:[{id:'ONE'},{work_id:'TWO_VERSION'}],
    panes:[{id:'CB:FINAL',layer:'CB',unit_id:'CB_FINAL',origin_pane_ids:['saved-wb'],strict_origin_bindings:true,
      items:[{id:'CB_FINAL:A1',text:'Corpus claim',source_trace:[leaf.id]}]}],
    route_panes:[{id:'saved-wb',layer:'WB',unit_id:'WB_ONE',work_id:'ONE',items:[leaf]}],routes:[],
  }};
  const calls=[],works=[{id:'ONE'},{id:'TWO',version_work_id:'TWO_VERSION'}];
  const loader={data:{works},ensureWorks:async ids=>{calls.push(ids);}};
  return {field,leaf,calls,works,loader};
}

test('opening a WB preview downloads no current member books; explicit expansion loads only the requested edition',async()=>{
  const {field,loader,calls}=fixture();
  assert.deepEqual(await loadFieldMembers(field,loader),[]);
  assert.deepEqual(calls,[]);
  assert.deepEqual(await loadFieldMembers(field,loader,['TWO_VERSION']),['TWO_VERSION']);
  assert.deepEqual(calls,[['TWO']]);
  assert.deepEqual(await loadFieldMembers(field,loader,['PRIVATE']),[]);
  assert.equal(calls.length,1);
});

test('ordinary saved fields retain their member loading behavior',async()=>{
  const {field,loader,calls}=fixture();delete field.bundle.preview_depth;
  assert.deepEqual(await loadFieldMembers(field,loader),['ONE','TWO_VERSION']);
  assert.deepEqual(calls,[['ONE','TWO']]);
});

test('preview payloads do not materialize current book stacks unless explicitly opened',()=>{
  const {field,works}=fixture(),calls=[];
  const adapter={works,stack(id){calls.push(id);return {work:{id},care_path:[]};}};
  assert.deepEqual(fieldPayload(field,adapter).stacks,{});
  assert.deepEqual(calls,[]);
  const payload=fieldPayload(field,adapter,{fieldLoadedMembers:['TWO_VERSION'],fieldMemberLoadErrors:{ONE:'Temporary download error'}});
  assert.deepEqual(calls,['TWO']);
  assert.deepEqual(Object.keys(payload.stacks),['TWO_VERSION']);
  assert.equal(payload.stacks.TWO_VERSION.work.id,'TWO_VERSION');
  assert.equal(payload.field.member_load_errors.ONE,'Temporary download error');
  assert.equal(payload.field.panes,field.bundle.panes);
});

test('preview corpus routes retain exact WB claims and finish at WB without broken deep routes',()=>{
  const {field,leaf}=fixture();
  const before=JSON.stringify(field.bundle);
  const corpus=fieldReference(field,'CB:FINAL','CB_FINAL:A1');
  assert.equal(corpus.built_from[0].id,leaf.id);
  assert.equal(corpus.built_from[0].source_pane,'saved-wb');
  assert.equal(corpus.built_from[0].text,leaf.text);
  assert.equal(corpus.unresolved_reference_count,0);
  const whole=fieldReference(field,'saved-wb',leaf.id);
  assert.equal(whole.text,leaf.text);
  assert.deepEqual(whole.route_layers,{});
  assert.deepEqual(whole.built_from,[]);
  assert.deepEqual(whole.route_edges,[]);
  assert.equal(whole.unresolved_reference_count,0);
  assert.equal(whole.route_truncated,false);
  assert.equal(JSON.stringify(field.bundle),before);
});

test('the same missing deep route remains visible in an unrestricted field',()=>{
  const {field,leaf}=fixture();delete field.bundle.preview_depth;
  const whole=fieldReference(field,'saved-wb',leaf.id);
  assert.equal(whole.unresolved_reference_count,1);
  assert.equal(whole.built_from[0].id,'MC_ONE:A1');
});


test('inline compact corpus files restore section items before the native reader receives them',async()=>{
  const field={id:'FIELD:inline',field:'corpus',bundle_url:'./data/fields/inline-preview.json'};
  const source={id:'WB_BOOK:A1',text:'Whole book wording'},corpus={id:'CB_BUILD:A1',text:'Corpus wording',source_trace:[source.id]};
  const bundle={id:field.id,field:field.field,preview_depth:'WB',members:[],
    panes:[{id:'CB:BUILD',layer:'CB',items:[corpus],sections:[{name:'Corpus section',item_ids:[corpus.id]}]}],
    route_panes:[{id:'WB:BOOK',layer:'WB',items:[source],sections:[{name:'Whole book section',item_ids:[source.id]}],
      variants:[{id:'WB:EARLIER',layer:'WB',items:[source],sections:[{name:'Earlier edition',item_ids:[source.id]}]}]}]};
  await loadPublicField(field,async()=>({ok:true,json:async()=>({bundle,reference_mode:'preserved-on-demand',references:{}})}));
  for(const pane of [field.bundle.panes[0],field.bundle.route_panes[0],field.bundle.route_panes[0].variants[0]]){
    assert.equal(pane.sections[0].items.length,1);
    assert.equal(pane.sections[0].items[0],pane.items[0]);
    assert.equal('item_ids' in pane.sections[0],false);
  }
  const payload=fieldPayload(field,{works:[]});
  assert.equal(payload.field.panes[0].sections[0].items[0].text,'Corpus wording');
  assert.equal(payload.field.route_panes[0].sections[0].items[0].text,'Whole book wording');
});
