/* Selected saved fields use the same native reader as the desktop app. */
import {fetchPublicJSON} from './library-loader.mjs?v=20261018';
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
    if(field.reference_mode==='preserved-on-demand'){
      const reference=fieldReference(field,scope,id);
      if(reference)return reference;
      if(scope||fieldIndex(field.bundle).items.has(id))return null;
    }else{
      const matches=Object.entries(field.references||{}).filter(([key])=>scope?key===`${scope}|${id}`:key.endsWith(`|${id}`));
      if(matches.length===1){const [key,reference]=matches[0];return {...reference,source_pane:reference.source_pane||key.slice(0,key.lastIndexOf('|'))};}
      if(scope||matches.length)return null;
    }
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
/** A compact corpus uses its preserved whole books until a reader opens a member. */
export async function loadFieldMembers(field, loader, requestedIds = null) {
  if (field.bundle?.preview_depth === 'WB' && requestedIds === null) return [];
  const requested = requestedIds === null ? null : new Set(requestedIds);
  const members = (field.bundle?.members || field.members || []).flatMap(member => {
    const id = member.work_id || member.id;
    const work = loader.data.works.find(work => work.id === id || work.version_work_id === id);
    return work && (!requested || [id,work.id,work.version_work_id].some(value => requested.has(value))) ? [{id,workId:work.id}] : [];
  });
  if (members.length) await loader.ensureWorks([...new Set(members.map(member => member.workId))]);
  return members.map(member => member.id);
}

export function fieldPayload(field, adapter, state = {}) {
  const stacks = {}, member_load_errors = {...state.fieldMemberLoadErrors};
  for (const member of field.bundle.members || []) {
    const id = member.work_id || member.id;
    const work = adapter.works.find(work => work.id === id || work.version_work_id === id);
    if (!work) {member_load_errors[id]='This source book has not been published to the beta yet. Its saved reading remains available below.';continue;}
    if (field.bundle.preview_depth === 'WB' && !(state.fieldLoadedMembers || []).includes(id)) continue;
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
  if (field.reference_mode === 'preserved-on-demand') return preservedReference(field.bundle, paneId, referenceId);
  const entries = field.references || {};
  const exact = entries[`${paneId}|${referenceId}`];
  if (exact) return exact;
  if (paneId) return null;
  const matches = Object.entries(entries).filter(([key]) => key.endsWith(`|${referenceId}`));
  return matches.length === 1 ? matches[0][1] : null;
}

/** The text viewer needs the selected route, not every route in a large corpus. */
export function fieldViewerReferences(field, selection) {
  if (field.reference_mode !== 'preserved-on-demand') return Object.entries(field.references || {})
    .map(([key,reference]) => ({...reference,source_pane:reference.source_pane || key.slice(0,key.lastIndexOf('|'))}));
  if (!selection?.id) return [];
  const reference = fieldReference(field, selection.source_pane || '', selection.id);
  return reference ? [reference] : [];
}

const fieldIndexes = new WeakMap();
const pendingLoads = new WeakMap();
const fieldFile = /^\.\/data\/fields\/[a-zA-Z0-9_-]+\.json$/;
const hashedFieldURL = /^\.\/data\/fields\/[a-f0-9]{16}-[a-f0-9]{16}\.json$/;
const bundleArrays = ['panes', 'route_panes', 'routes'];
const identity = item => String(item.id || item.care_item_id || '');

function allPanes(bundle) {
  const pending = [...(bundle.panes || []), ...(bundle.route_panes || [])], panes = [], seen = new Set();
  for (let next = 0; next < pending.length; next++) {
    const pane = pending[next], id = String(pane.id || '');
    if (seen.has(id)) continue;
    seen.add(id); panes.push(pane); pending.push(...(pane.variants || []));
  }
  return panes;
}

function fieldIndex(bundle) {
  if (fieldIndexes.has(bundle)) return fieldIndexes.get(bundle);
  const index = {panes:new Map(),items:new Map(),selected:new Map(),sourceWorks:new Map(),sourceTitles:new Map(),
    stepwise:['corpus','lateral'].includes(bundle.field)};
  for (const pane of allPanes(bundle)) {
    const paneId = String(pane.id || ''), selected = new Map();
    index.panes.set(paneId,pane); index.selected.set(paneId,selected);
    const items = pane.items?.length ? pane.items : (pane.sections || []).flatMap(section => section.items || []);
    for (const item of items) {
      const id = identity(item);
      if (!id) continue;
      if (!index.items.has(id)) index.items.set(id,[]);
      index.items.get(id).push({pane,item});
      if (!selected.has(id)) selected.set(id,item);
    }
  }
  for (const source of bundle.source_units || []) {
    const id = String(source.id || source.unit_id || '');
    index.sourceWorks.set(id,String(source.work_id || '')); index.sourceTitles.set(id,String(source.title || ''));
  }
  for (const member of bundle.members || []) for (const id of member.source_unit_ids || []) {
    if (!index.sourceWorks.has(String(id))) index.sourceWorks.set(String(id),String(member.work_id || member.id || ''));
    if (!index.sourceTitles.has(String(id))) index.sourceTitles.set(String(id),String(member.title || ''));
  }
  fieldIndexes.set(bundle,index);
  return index;
}

function traces(item, immediate) {
  const keys = immediate ? (item.source_trace?.length ? ['source_trace'] : ['matrix_trace','passage_trace_ids'])
    : ['source_trace','deep_source_trace','matrix_trace','passage_trace_ids'];
  const seen = new Set(), result = [];
  for (const key of keys) {
    const values = typeof item[key] === 'string' ? [item[key]] : item[key];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      const id = String(value && typeof value === 'object' ? value.id || value.ref || '' : value ?? '');
      if (id && !seen.has(id)) {seen.add(id); result.push([id,key]);}
    }
  }
  return result;
}

/** Follow exact preserved versions; compact corpora include their WB ancestry. */
function preservedReference(bundle, paneId, referenceId) {
  if (!bundle || !referenceId) return null;
  const index = fieldIndex(bundle);
  if (!paneId) {
    const matches = new Set((index.items.get(referenceId) || []).map(({pane}) => String(pane.id || '')));
    if (matches.size !== 1) return null;
    paneId = [...matches][0];
  }
  const selectedPane = index.panes.get(paneId), selected = index.selected.get(paneId)?.get(referenceId);
  if (!selectedPane || !selected) return null;
  const cardFor = (pane,item) => {
    const unitId = String(pane.unit_id || '');
    return {...item,id:identity(item),kind:'axiom',preserved:true,resolved:true,source_pane:String(pane.id || ''),
      unit_id:unitId,layer:String(pane.layer || pane.type || 'CARE'),title:String(pane.title || identity(item)),
      sheet_title:String(pane.title || ''),work_title:String(pane.work_title || pane.title || ''),
      source_work_titles:[...(pane.source_work_titles || [])],text:String(item.text || item.item_text || ''),
      work_id:String(pane.work_id || index.sourceWorks.get(unitId) || ''),
      metadata:['Preserved reading',String(pane.title || ''),String(pane.version || '')].filter(Boolean).join(' · ')};
  };
  const resolve = (id,context) => {
    const candidates = index.items.get(id) || [], local = candidates.filter(row => row.pane.id === context.id);
    if (local.length === 1) return local[0];
    const declared = new Set(context.origin_pane_ids?.length ? context.origin_pane_ids : index.stepwise ? [] : selectedPane.origin_pane_ids || []);
    const bound = candidates.filter(({pane}) => declared.has(pane.id) || (pane.used_by_panes || []).includes(context.id || '') || (pane.used_by_panes || []).includes(paneId));
    if (bound.length === 1) return bound[0];
    return !context.strict_origin_bindings && candidates.length === 1 ? candidates[0] : null;
  };
  const root = cardFor(selectedPane,selected), layers = {}, direct = [], edges = [];
  const corpusPreview = bundle.field === 'corpus' && bundle.preview_depth === 'WB';
  // The public corpus deliberately ends at its saved whole books. Its terminal
  // cards remain readable without reporting omitted deep routes as broken links.
  if (corpusPreview && selectedPane.layer === 'WB') return {
    ...root,route_layers:{},built_from:[],route_edges:[],route_truncated:false,
    unresolved_reference_count:0,route_mode:'immediate',source_passages:[],
  };
  const nodeKey = (pane,id) => JSON.stringify([pane,id]);
  const rootKey = nodeKey(paneId,referenceId), visited = new Set([rootKey]), emitted = new Set();
  const queue = [{pane:selectedPane,item:selected,depth:0}];
  let truncated = false, unresolved = 0;
  for (let next = 0; next < queue.length; next++) {
    const {pane:parentPane,item:parentItem,depth} = queue[next];
    if (corpusPreview && parentPane.layer === 'WB') continue;
    const sources = traces(parentItem,index.stepwise);
    if (depth >= 6) {truncated ||= sources.length > 0; continue;}
    for (const [id,kind] of sources) {
      if (emitted.size >= 256) {truncated = true; break;}
      const matched = resolve(id,parentPane);
      let card;
      if (matched) card = cardFor(matched.pane,matched.item);
      else {
        const alternatives = index.items.get(id) || [], unitId = id.split(':')[0], layer = unitId.split('_')[0].toUpperCase();
        card = {id,kind:'unresolved',unresolved:true,resolved:false,
          layer:['WB','MC','CL','CH','XS','SC','XA','NUMO','CB'].includes(layer) ? layer : 'REFERENCES',
          title:id,source_pane:'',unit_id:unitId,work_title:index.sourceTitles.get(unitId) || '',sheet_title:index.sourceTitles.get(unitId) || '',
          text:alternatives.length ? 'This trace does not identify one preserved version.' : 'The preserved field records this source reference; its text is not included here.',
          metadata:'Recorded reference · '+(alternatives.length ? 'version unresolved' : 'saved text unavailable'),
          candidates:alternatives.map(({pane}) => ({source_pane:String(pane.id || ''),version:String(pane.version || '')}))};
      }
      const key = nodeKey(card.source_pane,id);
      edges.push({from:id,to:identity(parentItem),kind,from_pane:card.source_pane,to_pane:String(parentPane.id || ''),
        source_id:id,target_id:identity(parentItem),source_pane:card.source_pane,target_pane:String(parentPane.id || ''),
        source_layer:card.layer,target_layer:String(parentPane.layer || parentPane.type || 'CARE')});
      if (depth === 0 && !direct.some(value => value.id === id && value.source_pane === card.source_pane)) direct.push(card);
      if (!emitted.has(key) && key !== rootKey) {
        emitted.add(key); (layers[card.layer] ||= []).push({...card,route_depth:depth+1});
        if (card.unresolved) unresolved++;
      }
      if (matched && !visited.has(key) && (corpusPreview || !index.stepwise)) {visited.add(key); queue.push({...matched,depth:depth+1});}
    }
  }
  // Native route cards and curved connectors use the same scoped edge graph.
  // A shared feeder can feed several recipients without duplicating its prose.
  const feeds = new Map();
  for (const edge of edges) {
    const key = nodeKey(edge.source_pane,edge.source_id);
    if (!feeds.has(key)) feeds.set(key,new Set());
    feeds.get(key).add(edge.target_id);
  }
  for (const card of [...direct,...Object.values(layers).flat()]) {
    card.feeds_ids = [...(feeds.get(nodeKey(card.source_pane,card.id)) || [])];
    card.feeds_id = card.feeds_ids[0] || '';
  }
  return {...root,route_layers:layers,built_from:direct,route_edges:edges,route_truncated:truncated,
    unresolved_reference_count:unresolved,route_mode:corpusPreview ? 'incoming' : index.stepwise ? 'immediate' : 'ancestry',
    source_passages:[...(layers.SOURCE || []),...(layers.PASSAGE || [])]};
}

function restoreSections(bundle) {
  for (const pane of allPanes(bundle)) {
    if (!(pane.sections || []).some(section => Array.isArray(section.item_ids))) continue;
    const items = new Map((pane.items || []).map(item => [identity(item),item]));
    for (const section of pane.sections || []) if (Array.isArray(section.item_ids)) {
      if (section.item_ids.some(id => !items.has(id))) throw Error('Part of this saved reading is incomplete. Please try again shortly.');
      section.items = section.item_ids.map(id => items.get(id)); delete section.item_ids;
    }
  }
}

async function readPart(part, field, fetcher, options) {
  const {text} = await fetchPublicJSON(part.url,{...options,cache:'force-cache',fetch:async(url,init) => {
    const response = await fetcher(url,init);
    return {ok:response.ok,status:response.status,json:async() => ({text:await response.text()})};
  }});
  const digest = await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('');
  if (hash !== part.sha256) throw Error('Part of this saved reading has changed. Please refresh and try again.');
  const payload = JSON.parse(text);
  if (payload.field_id !== field.id || payload.field !== field.field || bundleArrays.some(key => payload[key] !== undefined && !Array.isArray(payload[key])))
    throw Error('The published reading does not match this shelf entry.');
  return payload;
}

export async function loadPublicField(field, fetcher = globalThis.fetch.bind(globalThis), options = {}) {
  if (field?.bundle) return field;
  if (!fieldFile.test(field?.bundle_url || '')) throw Error('This saved reading has no published file.');
  if (pendingLoads.has(field)) return pendingLoads.get(field);
  const loading = (async () => {
    const payload = await fetchPublicJSON(field.bundle_url,{
      ...options,fetch:fetcher,cache:hashedFieldURL.test(field.bundle_url)?'force-cache':'no-cache',
    });
    if (!payload.bundle || payload.bundle.id !== field.id || payload.bundle.field !== field.field) throw Error('The published reading does not match this shelf entry.');
    if(payload.references&&(typeof payload.references!=='object'||Array.isArray(payload.references)))throw Error('The published reading has incomplete routes. Please try again.');
    const bundle = {...payload.bundle,members:field.members || payload.bundle.members};
    if (payload.bundle_parts !== undefined) {
      if (!Array.isArray(payload.bundle_parts) || payload.bundle_parts.some(part => !fieldFile.test(part?.url || '') || !/^[a-f0-9]{64}$/.test(part?.sha256 || '')))
        throw Error('This saved reading has an invalid published part.');
      const parts = new Array(payload.bundle_parts.length);
      let next = 0;
      await Promise.all(Array.from({length:Math.min(3,parts.length)},async () => {
        while (next < parts.length) {
          const current = next++;
          parts[current] = await readPart(payload.bundle_parts[current],field,fetcher,options);
        }
      }));
      for (const key of bundleArrays) bundle[key] = [...(bundle[key] || [])];
      for (const part of parts) for (const key of bundleArrays) for (const row of part[key] || []) bundle[key].push(row);
    }
    restoreSections(bundle);
    field.bundle = bundle; field.references = payload.references || {};
    field.reference_mode = payload.reference_mode || '';
    return field;
  })();
  pendingLoads.set(field,loading);
  try {return await loading;} finally {pendingLoads.delete(field);}
}
