import test from 'node:test';
import assert from 'node:assert/strict';
import {publicFields,fieldPayload,fieldReference} from '../public-fields.mjs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {standaloneBookState} from '../reading-workspace.mjs';

const selected={id:'FIELD:selected',field:'lateral',title:'Selected comparison',bundle:{
  id:'FIELD:selected',field:'lateral',members:[{id:'PUBLISHED'},{id:'NEW_LOCAL_VERSION'},{id:'PRIVATE'}],panes:[],routes:[]
}};

test('published shelf omits an absent legacy lateral and includes only explicitly saved fields',()=>{
  const adapter={savedConnection:{id:'LEGACY',field:'lateral'}};
  assert.deepEqual(publicFields({works:[],fields:[selected]},adapter),[selected]);
  assert.deepEqual(publicFields({works:[],lateral:null},adapter),[]);
  assert.deepEqual(publicFields({lateral:{id:'LEGACY'},fields:[selected]},adapter),[adapter.savedConnection,selected]);
});

test('field source panes load only already published members, including exact version aliases',()=>{
  const calls=[];
  const adapter={works:[{id:'PUBLISHED'},{id:'STABLE_PUBLIC',version_work_id:'NEW_LOCAL_VERSION'},{id:'UNRELATED'}],
    stack(id,state){calls.push([id,state]);return {work_id:id,active_unit_id:state.unitId||''};}};
  const state={fieldBookStates:{NEW_LOCAL_VERSION:{unitId:'CH_LATEST'}}};
  const payload=fieldPayload(selected,adapter,state);
  assert.deepEqual(Object.keys(payload.stacks),['PUBLISHED','NEW_LOCAL_VERSION']);
  assert.deepEqual(calls,[['PUBLISHED',{}],['STABLE_PUBLIC',{unitId:'CH_LATEST'}]]);
  assert.equal(payload.stacks.NEW_LOCAL_VERSION.work_id,'NEW_LOCAL_VERSION');
  assert.equal(payload.stacks.NEW_LOCAL_VERSION.active_unit_id,'CH_LATEST');
  assert.equal(payload.field.id,selected.bundle.id);
  assert.match(payload.field.member_load_errors.PRIVATE,/not been published/);
  assert.equal(payload.reference,null);
  assert.equal(payload.field.members.length,3);
});

test('field routes retain source-pane scope and never guess between repeated claim identities',()=>{
  const first={id:'REUSED',source_pane:'first',text:'First reading'},second={id:'REUSED',source_pane:'second',text:'Second reading'};
  const field={references:{'first|REUSED':first,'second|REUSED':second,'first|UNIQUE':{id:'UNIQUE'}}};
  assert.equal(fieldReference(field,'first','REUSED'),first);
  assert.equal(fieldReference(field,'second','REUSED'),second);
  assert.equal(fieldReference(field,'','REUSED'),null);
  assert.equal(fieldReference(field,'unknown','REUSED'),null);
  assert.deepEqual(fieldReference(field,'','UNIQUE'),{id:'UNIQUE'});
  assert.equal(fieldReference(field,'first','missing'),null);
});


test('ordinary book navigation never treats an empty connection identity as a removed lateral',()=>{
  const work={id:'BOOK',slug:'book',title:'Published book',sources:[{id:'RAW_BOOK',title:'Chapter',paragraphs:[]}],units:[]};
  for(const lateral of [undefined,null,{id:'',title:'',parents:[],sections:[]}]){
    const adapter=createPublicReaderAdapter({works:[work],lateral});
    const state=standaloneBookState(work.id);
    assert.equal(state.connectionId,'');
    const payload=adapter.workspace(state);
    assert.equal(payload.connection,null);
    assert.equal(payload.stack.active_chapter.raw_unit_id,'RAW_BOOK');
    assert.equal(adapter.reduce(state,'open_field',''),state);
    assert.equal(adapter.reduce(state,'open_field','XR_REMOVED'),state);
    assert.equal(adapter.reduce(state,'connection_action',{action:'open',id:''}),state);
  }
});

test('field files load on demand and use the newest published cover metadata',async()=>{
  const {loadPublicField}=await import('../public-fields.mjs');
  const field={id:'FIELD:selected',field:'corpus',members:[{id:'PUBLISHED',cover_url:'new-cover'}],bundle_url:'./data/fields/abc-def.json'};
  let calls=0;
  const loader=async(url)=>{calls++;assert.equal(url,field.bundle_url);return {ok:true,json:async()=>({bundle:{id:field.id,field:field.field,members:[{id:'PUBLISHED',cover_url:'old-cover'}]},references:{}})};};
  await loadPublicField(field,loader);await loadPublicField(field,loader);
  assert.equal(calls,1);assert.equal(field.bundle.members[0].cover_url,'new-cover');
  await assert.rejects(loadPublicField({...field,bundle:null,bundle_url:'https://elsewhere.example/private'},loader),/no published file/);
  await assert.rejects(loadPublicField({...field,bundle:null},async()=>({ok:true,json:async()=>({bundle:{id:'WRONG',field:'corpus'}})})),/does not match/);
});
