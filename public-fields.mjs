/* Selected saved fields use the same native reader as the desktop app. */
import {fetchPublicJSON} from './library-loader.mjs?v=20261018';

const fieldLoads=new WeakMap();
const hashedFieldURL=/^\.\/data\/fields\/[a-f0-9]{16}-[a-f0-9]{16}\.json$/;
export function publicFields(data, adapter) {
  return [...(data.lateral?.id ? [adapter.savedConnection] : []), ...(data.fields || [])];
}
export function fieldMemberFor(field,adapter,workId) {
  if(!workId)return null;
  const work=adapter.works.find(work=>work.id===workId||work.version_work_id===workId);
  if(!work)return null;
  const member=(field.bundle?.members||field.members||[]).find(member=>[work.id,work.version_work_id].includes(member.work_id||member.id));
  return member?{work,memberId:member.work_id||member.id}:null;
}
function memberReading(value,workId,memberId) {
  if(workId===memberId)return value;
  if(Array.isArray(value))return value.map(row=>memberReading(row,workId,memberId));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,row])=>[key,key==='work_id'&&row===workId?memberId:memberReading(row,workId,memberId)]));
}
export function fieldMemberCard(field,adapter,id,state={}) {
  const node=adapter.index.nodes.get(id),member=fieldMemberFor(field,adapter,node?.work?.id);
  if(!member||!['claim','passage'].includes(node.kind))return null;
  return {...memberReading(adapter.card(id,{state}),member.work.id,member.memberId),source_pane:'',scope:''};
}
export function resolveFieldReference(field,adapter,id,{scope='',workId='',state={},routeMode='incoming'}={}) {
  if(scope||!workId){
    const matches=Object.entries(field.references||{}).filter(([key])=>scope?key===`${scope}|${id}`:key.endsWith(`|${id}`));
    if(matches.length===1){const [key,reference]=matches[0];return {...reference,source_pane:reference.source_pane||key.slice(0,key.lastIndexOf('|'))};}
    if(scope||matches.length)return null;
  }
  const node=adapter.index.nodes.get(id),member=fieldMemberFor(field,adapter,workId||node?.work?.id);
  if(!member||node?.work?.id!==member.work.id||!['claim','passage'].includes(node.kind))return null;
  const reference=adapter.reference(id,routeMode,{workId:member.work.id,state:{...state,...state.fieldBookStates?.[member.memberId]}});
  return {...memberReading(reference,member.work.id,member.memberId),source_pane:''};
}
export function fieldReferenceState(field,adapter,state,{id,scope='',workId='',routeMode='incoming'}) {
  const reference=resolveFieldReference(field,adapter,id,{scope,workId,state,routeMode});
  if(!reference)return null;
  const next={...state,fieldReference:reference,connectionReferenceId:'',referenceId:'',
    fieldSelected:{id,source_pane:reference.source_pane||'',work_id:reference.work_id||'',kind:reference.kind||'axiom'}};
  if(!reference.source_pane){
    const member=fieldMemberFor(field,adapter,reference.work_id);
    next.fieldBookStates={...state.fieldBookStates,[member.memberId]:{...state.fieldBookStates?.[member.memberId],workId:member.work.id,
      unitId:reference.kind==='passage'?'':reference.unit_id,rawUnitId:reference.kind==='passage'?reference.unit_id:''}};
  }
  return next;
}
export function fieldPayload(field, adapter, state = {}) {
  const stacks = {}, member_load_errors = {};
  for (const member of field.bundle.members || []) {
    const id = member.work_id || member.id;
    const work = adapter.works.find(work => work.id === id || work.version_work_id === id);
    if (!work) {member_load_errors[id]='This source book has not been published to the beta yet. Its saved reading remains available below.';continue;}
    const selected = state.fieldBookStates?.[id] || {};
    const stack = adapter.stack(work.id, selected);
    stacks[id] = {...stack, work:{...stack.work,id}, work_id:id};
  }
  const saved=state.fieldSaved||{},bookmarks=(state.bookmarks||[]).flatMap(row=>{
    const member=fieldMemberFor(field,adapter,row.work_id);return member?[{...row,work_id:member.memberId}]:[];
  });
  const favourites=[...(state.favouriteAxiomIds||[]),...(saved.saved_axioms||[]).filter(row=>!row.source_pane).map(row=>row.care_item_id)]
    .filter(id=>fieldMemberFor(field,adapter,adapter.index?.nodes.get(id)?.work?.id));
  return {field:{...field.bundle,member_load_errors,...saved,saved_panes:[...(saved.saved_panes||[]),...bookmarks],
    favourite_axiom_ids:[...new Set(favourites)],saved_focus:state.fieldSavedFocus},stacks,reference:state.fieldReference || null};
}
export function fieldReference(field, paneId, referenceId) {
  const entries = field.references || {};
  const exact = entries[`${paneId}|${referenceId}`];
  if (exact) return exact;
  if (paneId) return null;
  const matches = Object.entries(entries).filter(([key]) => key.endsWith(`|${referenceId}`));
  return matches.length === 1 ? matches[0][1] : null;
}
export async function loadPublicField(field, fetcher = globalThis.fetch.bind(globalThis), options = {}) {
  if (field?.bundle) return field;
  if (!/^\.\/data\/fields\/[a-zA-Z0-9_-]+\.json$/.test(field?.bundle_url || '')) throw Error('This saved reading has no published file.');
  if(fieldLoads.has(field))return fieldLoads.get(field);
  const request=(async()=>{
    const payload=await fetchPublicJSON(field.bundle_url,{
      ...options,fetch:fetcher,cache:hashedFieldURL.test(field.bundle_url)?'force-cache':'no-cache',
    });
    if (!payload.bundle || payload.bundle.id !== field.id || payload.bundle.field !== field.field) throw Error('The published reading does not match this shelf entry.');
    if(payload.references&&(typeof payload.references!=='object'||Array.isArray(payload.references)))throw Error('The published reading has incomplete routes. Please try again.');
    field.bundle = {...payload.bundle,members:field.members || payload.bundle.members};field.references = payload.references || {};
    return field;
  })();
  fieldLoads.set(field,request);
  try{return await request;}
  finally{if(fieldLoads.get(field)===request)fieldLoads.delete(field);}
}
