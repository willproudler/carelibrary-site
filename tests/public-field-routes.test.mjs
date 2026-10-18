import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {fieldMemberFor,fieldMemberCard,resolveFieldReference,fieldReferenceState,fieldPayload} from '../public-fields.mjs';

const data=JSON.parse(readFileSync(new URL('./fixtures/original-public-library.json',import.meta.url)));
const hume=data.works.find(work=>work.slug==='hume'),kant=data.works.find(work=>work.slug==='kant');
hume.version_work_id='LATEST_HUME';
const adapter=createPublicReaderAdapter(data),id='CH_THN_INTR:AS1',passage='RAW_THN_INTR:P0001';
const field={id:'FIELD:reading',field:'lateral',bundle:{id:'FIELD:reading',field:'lateral',
  members:[{work_id:'LATEST_HUME'},{id:kant.id}],panes:[]},references:{
  ['saved-first|'+id]:{id,unit_id:'CH_THN_INTR',work_id:'LATEST_HUME',text:'The first preserved edition',kind:'axiom',preserved:true},
  ['saved-second|'+id]:{id,unit_id:'CH_THN_INTR',work_id:'LATEST_HUME',text:'Another preserved edition',kind:'axiom',preserved:true},
}};

test('field deep links restore the exact saved pane without guessing another edition',()=>{
  const state=fieldReferenceState(field,adapter,{}, {id,scope:'saved-second'});
  assert.equal(state.fieldReference.text,'Another preserved edition');
  assert.equal(state.fieldReference.source_pane,'saved-second');
  assert.equal(state.fieldSelected.source_pane,'saved-second');
  assert.equal(state.connectionReferenceId,'');
  assert.equal(fieldPayload(field,adapter,state).reference,state.fieldReference);
  assert.equal(resolveFieldReference(field,adapter,id),null);
  assert.equal(resolveFieldReference(field,adapter,id,{scope:'missing',workId:'LATEST_HUME'}),null);
});

test('current member routes use the current book and preserve field member aliases throughout',()=>{
  const state=fieldReferenceState(field,adapter,{}, {id,workId:'LATEST_HUME'});
  assert.equal(state.fieldReference.id,id);
  assert.notEqual(state.fieldReference.text,field.references['saved-first|'+id].text);
  assert.equal(state.fieldReference.source_pane,'');
  assert.equal(state.fieldReference.work_id,'LATEST_HUME');
  assert.equal(state.fieldBookStates.LATEST_HUME.workId,hume.id);
  assert.equal(state.fieldBookStates.LATEST_HUME.unitId,'CH_THN_INTR');
  for(const card of Object.values(state.fieldReference.route_layers).flat())assert.equal(card.work_id,'LATEST_HUME');
  assert.equal(fieldPayload(field,adapter,state).stacks.LATEST_HUME.work.id,'LATEST_HUME');
  assert.equal(adapter.index.nodes.get(id).work.id,hume.id);
});

test('member source passages keep passage kind and select the correct source chapter',()=>{
  const card=fieldMemberCard(field,adapter,passage);
  assert.equal(card.kind,'passage');assert.equal(card.scope,'');assert.equal(card.work_id,'LATEST_HUME');
  const state=fieldReferenceState(field,adapter,{}, {id:passage,workId:hume.id});
  assert.equal(state.fieldReference.kind,'passage');assert.equal(state.fieldReference.route_mode,'outgoing');
  assert.equal(state.fieldBookStates.LATEST_HUME.rawUnitId,'RAW_THN_INTR');
  assert.equal(state.fieldBookStates.LATEST_HUME.unitId,'');
  assert.equal(state.fieldSelected.kind,'passage');
});

test('field reference fallback rejects unrelated books, wrong members and unit identities',()=>{
  assert.equal(fieldMemberFor(field,adapter,undefined),null);
  assert.equal(resolveFieldReference(field,adapter,id,{workId:kant.id}),null);
  assert.equal(resolveFieldReference(field,adapter,'CH_MEMA_PHB0:AS1',{workId:data.works.find(work=>work.slug==='bergson').id}),null);
  assert.equal(resolveFieldReference(field,adapter,'CH_THN_INTR',{workId:hume.id}),null);
  assert.equal(fieldMemberCard(field,adapter,'CH_MEMA_PHB0:AS1'),null);
});

test('field readers reflect global member saves while retaining scoped preserved saves',()=>{
  const state={bookmarks:[{care_unit_id:'CH_THN_INTR',work_id:hume.id},{care_unit_id:'CH_MEMA_PHB0',work_id:data.works.find(work=>work.slug==='bergson').id}],
    favouriteAxiomIds:[id,'CH_MEMA_PHB0:AS1'],fieldSaved:{saved_panes:[{care_unit_id:'CH_THN_INTR',source_pane:'saved-first'}],saved_axioms:[{care_item_id:id,source_pane:'saved-first'}]}};
  const payload=fieldPayload(field,adapter,state);
  assert.deepEqual(payload.field.saved_panes,[state.fieldSaved.saved_panes[0],{care_unit_id:'CH_THN_INTR',work_id:'LATEST_HUME'}]);
  assert.deepEqual(payload.field.favourite_axiom_ids,[id]);
  assert.deepEqual(payload.field.saved_axioms,state.fieldSaved.saved_axioms);
});
