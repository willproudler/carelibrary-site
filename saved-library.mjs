// Browser-local collections use the same Saved library surface as the Mac app.
import mountNativeSaved, {css, html} from './native/saved-library.mjs?v=e82129a28b49e3c9';

export const SAVED_READING_ID = 'saved:library';
export const SAVED_READING_STYLE = {label:'Saved library',color:'#b75260',icon:'<path d="M6 3h12v18l-6-4-6 4z"/>'};
export const SAVED_STORAGE_KEY = 'care-public-saved-v1';
export const fieldSavedStorageKey = id => 'care-public-field-saved:' + id;

const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const rows = value => Array.isArray(value) ? value : [];
const identity = value => typeof value === 'string' ? value.trim() : '';
const bookmarkKey = value => JSON.stringify([identity(value.care_unit_id),identity(value.passage_id),identity(value.source_pane)]);
const uniqueBookmarks = values => [...new Map(rows(values).filter(value=>identity(record(value).care_unit_id)).map(value=>[bookmarkKey(value),{...value}])).values()];

// Keep unknown published IDs: a temporary catalogue change must not erase saves.
export function normalizeSavedState(value) {
  const source=record(value);
  return {...source,bookmarks:uniqueBookmarks(source.bookmarks),favourites:[...new Set(rows(source.favourites).filter(value=>identity(value))) ]};
}

export function normalizeFieldSavedState(value) {
  const source=record(value);
  const clean=(values,key)=>[...new Map(rows(values).filter(value=>identity(record(value)[key])).map(value=>[JSON.stringify([value[key],identity(value.source_pane)]),{...value}])).values()];
  return {...source,saved_panes:clean(source.saved_panes,'care_unit_id'),saved_axioms:clean(source.saved_axioms,'care_item_id')};
}

export function withSavedFavourite(value,id,active,savedAt=new Date().toISOString()) {
  const next=normalizeSavedState(value),favouriteDates={...record(next.favouriteDates)};
  const favourites=next.favourites.filter(value=>value!==id);
  if(active){favourites.push(id);favouriteDates[id]=savedAt;}else delete favouriteDates[id];
  return {...next,favourites,favouriteDates};
}

export function withSavedBookmark(value,bookmark,active) {
  const next=normalizeSavedState(value),key=bookmarkKey(bookmark),bookmarks=next.bookmarks.filter(row=>bookmarkKey(row)!==key);
  if(active)bookmarks.push({...bookmark});
  return {...next,bookmarks};
}

export function bookBookmarkRecord(index,value,savedAt=new Date().toISOString()) {
  const row=record(value),unit=index.units.get(row.care_unit_id),passageId=identity(row.passage_id);
  if(!unit?.work || unit.work.id!==row.work_id || row.source_pane)return null;
  if(passageId){
    const passage=index.nodes.get(passageId);
    if(unit.layer!=='SOURCE'||passage?.kind!=='passage'||passage.unit?.id!==unit.id||passage.work?.id!==unit.work.id)return null;
  }
  return {care_unit_id:unit.id,work_id:unit.work.id,title:unit.title,layer:unit.layer,saved_at:savedAt,available:true,
    ...(passageId?{raw_unit_id:unit.id,passage_id:passageId}:{})};
}

export function fieldSavedRecord(field,value,index,savedAt=new Date().toISOString()) {
  const row=record(value),scope=identity(row.source_pane),itemId=row.care_item_id||row.care_unit_id||'';
  const reference=field.references?.[scope+'|'+itemId];
  const panes=rows(field.bundle?.panes).flatMap(pane=>[pane,...rows(pane.variants)]);
  const pane=panes.find(pane=>scope?pane.id===scope:(pane.unit_id||pane.id)===(row.care_unit_id||row.unit_id));
  const node=!scope?index.nodes.get(itemId):null;
  const unitId=row.care_unit_id||row.unit_id||reference?.unit_id||pane?.unit_id||node?.unit?.id||'';
  return {...row,field_id:field.id,source_pane:scope,care_unit_id:unitId,
    work_id:row.work_id||reference?.work_id||pane?.work_id||node?.work?.id||'',
    title:reference?.sheet_title||reference?.title||pane?.title||row.title||node?.unit?.title||unitId,
    layer:reference?.layer||pane?.layer||row.layer||node?.unit?.layer||'',
    text:reference?.reading_text||reference?.text||row.text||node?.text||'',
    saved_at:row.saved_at||savedAt,available:row.available!==false&&reference?.resolved!==false&&pane?.resolved!==false};
}

const itemIdentity = (kind,fieldId,scope,id) => JSON.stringify([kind,fieldId,scope,id]);

export function collectSavedItems({saved,index,fields=[],readLocal=()=>null,card=()=>null}) {
  const store=normalizeSavedState(saved),items=[];
  function append(storedKind,row,{field=null}={}) {
    if(field)row=fieldSavedRecord(field,row,index,row.saved_at||'');
    const passageId=!field&&storedKind==='pane'?identity(row.passage_id):'';
    const kind=passageId?'passage':storedKind;
    const itemId=kind==='axiom'?row.care_item_id:passageId||row.care_unit_id;
    const node=index.nodes.get(itemId),scope=identity(row.source_pane);
    const reference=field?.references?.[scope+'|'+itemId];
    const unitId=identity(row.care_unit_id||row.unit_id||reference?.unit_id||node?.unit?.id);
    const unit=index.units.get(unitId),work=node?.work||unit?.work;
    const fieldId=field?.id||'',lateralId=!field&&!work&&node?node.unit?.id||'':'';
    const available=row.available!==false&&(field?Boolean(unitId&&(field.bundle||field.bundle_url)):
      passageId?Boolean(node?.kind==='passage'&&node.unit?.id===unitId&&node.work?.id===row.work_id):Boolean(node));
    let projected=null;
    if(available&&!field&&kind==='axiom')try{projected=card(itemId);}catch{}
    const id=itemIdentity(kind,fieldId,scope,passageId?bookmarkKey(row):itemId);
    const layer=reference?.layer||node?.unit?.layer||row.layer||'';
    const author=field?'':work?.author||row.author||'';
    const title=field?(row.title||unitId):(kind==='axiom'?(reference?.title||node?.section||row.title||'Saved axiom'):
      passageId?[unit?.title||row.title,passageId].filter(Boolean).join(' · '):(node?.title||reference?.title||row.title||unitId||'Bookmarked pane'));
    items.push({...row,id,token:id,kind,field_id:fieldId,source_pane:scope,
      care_unit_id:unitId,care_item_id:kind==='axiom'?itemId:'',
      work_id:fieldId||work?.id||row.work_id||'',reading_work_id:row.work_id||work?.id||reference?.work_id||'',
      work_title:field?.title||work?.title||(lateralId?index.data?.lateral?.title:'')||row.work_title||'Unavailable reading',author,
      cover_url:field?'':work?.cover_url||'',title,layer,
      text:field?(reference?.reading_text||reference?.text||row.text||''):(projected?.reading_text||node?.text||row.text||''),
      saved_at:row.saved_at||'',available,node_kind:node?.kind||'',lateral_id:lateralId,
      ...(field?{storage_key:fieldSavedStorageKey(fieldId)}:{storage_key:SAVED_STORAGE_KEY})});
  }
  for(const row of store.bookmarks)append('pane',row);
  for(const id of store.favourites)append('axiom',{care_item_id:id,saved_at:record(store.favouriteDates)[id]||''});
  for(const field of fields) {
    const fieldStore=normalizeFieldSavedState(readLocal(fieldSavedStorageKey(field.id),null));
    for(const row of fieldStore.saved_panes)append('pane',row,{field});
    for(const row of fieldStore.saved_axioms)append('axiom',row,{field});
  }
  return items.sort((a,b)=>String(b.saved_at).localeCompare(String(a.saved_at)));
}

export function removeSavedItem(value,item) {
  if(item.field_id) {
    const next=normalizeFieldSavedState(value),key=item.kind==='axiom'?'saved_axioms':'saved_panes',idKey=item.kind==='axiom'?'care_item_id':'care_unit_id';
    return {...next,[key]:next[key].filter(row=>row[idKey]!==item[idKey]||identity(row.source_pane)!==item.source_pane)};
  }
  const next=normalizeSavedState(value);
  if(item.kind==='pane'||item.kind==='passage')return {...next,bookmarks:next.bookmarks.filter(row=>bookmarkKey(row)!==bookmarkKey(item))};
  const favouriteDates={...record(next.favouriteDates)};delete favouriteDates[item.care_item_id];
  return {...next,favourites:next.favourites.filter(id=>id!==item.care_item_id),favouriteDates};
}

// Explicit saved locations clear Routes and retain the exact field pane scope.
export function savedItemTarget(item,token=Date.now()+'-'+Math.random()) {
  if(!item?.available||!item.care_unit_id)return null;
  const isAxiom=item.kind==='axiom';
  if(item.field_id)return {type:'field',id:item.field_id,state:{connectionId:item.field_id,fieldReference:null,
    fieldSelected:isAxiom?{id:item.care_item_id,source_pane:item.source_pane}:null,
    fieldSavedFocus:{work_id:item.reading_work_id,source_pane:item.source_pane,unit_id:item.care_unit_id,care_item_id:isAxiom?item.care_item_id:'',token}}};
  if(item.lateral_id)return {type:'lateral',id:item.lateral_id,state:{connectionId:item.lateral_id,referenceId:'',connectionReferenceId:'',selectedAxiom:null,connectionSelection:isAxiom?{reference_id:item.care_item_id}:null}};
  if(!item.work_id)return null;
  const passageId=identity(item.passage_id)||(isAxiom&&item.node_kind==='passage'?item.care_item_id:'');
  const source=item.layer==='SOURCE'||Boolean(passageId),selection=passageId||isAxiom?{
    [passageId?'passage_id':'axiom_id']:passageId||item.care_item_id,unit_id:item.care_unit_id,work_id:item.work_id,route_root_id:''}:null;
  return {type:'book',id:item.work_id,state:{workId:item.work_id,unitId:source?'':item.care_unit_id,rawUnitId:source?item.care_unit_id:'',referenceId:'',connectionId:'',connectionReferenceId:'',connectionSelection:null,selectedAxiom:selection,outlineUnits:[],savedFocus:{work_id:item.work_id,unit_id:item.care_unit_id,token,...(passageId?{passage_id:passageId}:{})}}};
}

// Streamlit and the browser use the same component, with different persistence.
export default function mountSavedLibrary({parentElement, data, setTriggerValue}) {
  const host = parentElement.querySelector('[data-saved-library]');
  if (!host) return;
  const shadow = host.shadowRoot ?? host.attachShadow({mode: 'open'});
  if (!shadow.hasChildNodes()) shadow.innerHTML = `<style>${css}</style>${html}`;
  return mountNativeSaved({
    parentElement: shadow,
    data: {surface: 'library', ...data},
    setStateValue: setTriggerValue,
  });
}
