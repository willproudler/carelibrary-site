import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscoverFieldController} from '../discover-field-reader.mjs';

function fixture(){
  const field={id:'FIELD:lateral:chosen',field:'lateral',title:'Chosen comparison',bundle:{
    id:'FIELD:lateral:chosen',field:'lateral',members:[{id:'FIRST'},{work_id:'LATEST_SECOND'},{id:'PRIVATE'}],
    panes:[{id:'first-pane'},{id:'second-pane'}],routes:[],
  },references:{
    'first-pane|REUSED':{id:'REUSED',source_pane:'first-pane',text:'First exact claim',route_layers:{WB:[{id:'WB_FIRST:A1'}]}},
    'second-pane|REUSED':{id:'REUSED',source_pane:'second-pane',text:'Second exact claim',route_layers:{WB:[{id:'WB_SECOND:A1'}]}},
    'first-pane|UNIQUE':{id:'UNIQUE',text:'A unique claim without a repeated scope attribute'},
  }};
  const adapter={works:[
    {id:'FIRST',units:[{id:'CH_FIRST'}],sources:[{id:'RAW_FIRST'}]},
    {id:'SECOND',version_work_id:'LATEST_SECOND',units:[{id:'CH_SECOND'}],sources:[{id:'RAW_SECOND'}]},
    {id:'UNRELATED',units:[{id:'CH_OTHER'}],sources:[]},
  ],stack(id,state){return {work:{id},active_unit_id:state.unitId||'',active_source_id:state.rawUnitId||''};}};
  return {field,adapter,reader:createDiscoverFieldController(field,adapter)};
}

test('Discover field status names the selected publication and only its public members',()=>{
  const {reader}=fixture();
  assert.deepEqual(reader.status(),{
    fieldId:'FIELD:lateral:chosen',title:'Chosen comparison',referenceId:'',scope:'',
    book:'field:FIELD:lateral:chosen',connectionId:'FIELD:lateral:chosen',workId:'FIRST',memberWorkIds:['FIRST','SECOND'],
  });
  assert.equal(reader.href(),'./#field=FIELD%3Alateral%3Achosen');
  const payload=reader.payload();
  assert.deepEqual(Object.keys(payload.stacks),['FIRST','LATEST_SECOND']);
  assert.match(payload.field.member_load_errors.PRIVATE,/not been published/);
});

test('opening a repeated claim keeps the exact source pane in routes and selection',()=>{
  const {reader}=fixture();
  reader.open({book:'field:FIELD:lateral:chosen',ref:'REUSED',scope:'second-pane'});
  assert.equal(reader.payload().reference.text,'Second exact claim');
  assert.equal(reader.status().scope,'second-pane');
  assert.deepEqual(reader.getState().fieldSelected,{id:'REUSED',source_pane:'second-pane'});
});

test('stale field identity, missing route, ambiguous route and wrong scope preserve current reading',()=>{
  const {reader}=fixture();reader.open({ref:'REUSED',scope:'first-pane'});
  const previous=reader.getState();
  for(const request of [
    {fieldId:'FIELD:lateral:removed',ref:'REUSED',scope:'second-pane'},
    {book:'field:FIELD:lateral:removed'},
    {book:'unrelated'},
    {ref:'MISSING',scope:'first-pane'},
    {ref:'REUSED'},
    {ref:'REUSED',scope:'stale-pane'},
  ]){
    assert.throws(()=>reader.open(request));
    assert.deepEqual(reader.getState(),previous);
  }
});

test('unique route restores exact key scope and clearRoute keeps the field and member sheet',()=>{
  const {reader}=fixture();
  reader.dispatch({type:'open_sheet',work_id:'LATEST_SECOND',unit_id:'CH_SECOND'});
  reader.open({ref:'UNIQUE'});
  assert.equal(reader.status().scope,'first-pane');
  reader.clearRoute();
  assert.equal(reader.payload().reference,null);
  assert.equal(reader.payload().stacks.LATEST_SECOND.active_unit_id,'CH_SECOND');
  assert.equal(reader.status().connectionId,'FIELD:lateral:chosen');
  assert.deepEqual(reader.getState().fieldSelected,{id:'UNIQUE',source_pane:'first-pane'});
});

test('selection preserves its source pane without replacing the current route',()=>{
  const {reader}=fixture();reader.open({ref:'UNIQUE'});
  reader.dispatch({type:'selected_axiom',source_pane:'second-pane',value:{axiom_id:'REUSED'}});
  assert.equal(reader.status().referenceId,'UNIQUE');
  assert.deepEqual(reader.getState().fieldSelected,{id:'REUSED',source_pane:'second-pane'});
});

test('member source navigation rejects unpublished, unrelated and stale sheets without losing state',()=>{
  const {reader}=fixture();reader.dispatch({type:'open_chapter',work_id:'FIRST',raw_unit_id:'RAW_FIRST'});
  const previous=reader.getState();
  for(const action of [
    {type:'load_members',work_ids:['FIRST','PRIVATE']},
    {type:'open_work',work_id:'UNRELATED'},
    {type:'open_sheet',work_id:'FIRST',unit_id:'CH_OTHER'},
    {type:'open_chapter',work_id:'FIRST',raw_unit_id:'RAW_STALE'},
  ]){
    assert.throws(()=>reader.dispatch(action));
    assert.deepEqual(reader.getState(),previous);
  }
});

test('field route resolution and saved items stay inside the controller across updates',()=>{
  const {reader,field}=fixture();reader.open({ref:'REUSED',scope:'first-pane'});
  reader.dispatch({type:'resolution',resolution:{WB:2}});
  reader.dispatch({type:'bookmark_action',action:'toggle',care_unit_id:'XR_SAVED',source_pane:'first-pane',active:true});
  reader.dispatch({type:'axiom_favourite_action',action:'toggle',care_item_id:'REUSED',source_pane:'second-pane',active:true});
  assert.deepEqual(reader.payload().reference.resolution,{WB:2});
  assert.equal(reader.payload().field.saved_panes[0].care_unit_id,'XR_SAVED');
  assert.equal(reader.payload().field.saved_axioms[0].source_pane,'second-pane');
  assert.equal(field.references['first-pane|REUSED'].resolution,undefined);
  const snapshot=reader.getState();snapshot.fieldBookStates.FIRST={unitId:'MUTATED'};
  assert.equal(reader.getState().fieldBookStates.FIRST,undefined);
});

test('mismatched downloaded field bundles are rejected before rendering',()=>{
  const {field,adapter}=fixture();
  for(const broken of [{...field,bundle:null},{...field,bundle:{...field.bundle,id:'STALE'}},
    {...field,bundle:{...field.bundle,field:'corpus'}},{...field,field:'numo'}])
    assert.throws(()=>createDiscoverFieldController(broken,adapter),/does not match/);
});
