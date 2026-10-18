// Browser-local collections use the same Saved library surface as the Mac app.
export const SAVED_READING_ID = 'saved:library';
export const SAVED_READING_STYLE = {label:'Saved library',color:'#b75260',icon:'<path d="M6 3h12v18l-6-4-6 4z"/>'};
export const SAVED_STORAGE_KEY = 'care-public-saved-v1';
export const fieldSavedStorageKey = id => 'care-public-field-saved:' + id;

const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const rows = value => Array.isArray(value) ? value : [];
const identity = value => typeof value === 'string' ? value.trim() : '';
const uniqueRows = (values,key) => [...new Map(rows(values).filter(value=>identity(record(value)[key])).map(value=>[value[key],{...value}])).values()];

// Keep unknown published IDs: a temporary catalogue change must not erase saves.
export function normalizeSavedState(value) {
  const source=record(value);
  return {...source,bookmarks:uniqueRows(source.bookmarks,'care_unit_id'),favourites:[...new Set(rows(source.favourites).filter(value=>identity(value))) ]};
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
  const next=normalizeSavedState(value),bookmarks=next.bookmarks.filter(row=>row.care_unit_id!==bookmark.care_unit_id);
  if(active)bookmarks.push({...bookmark});
  return {...next,bookmarks};
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
  function append(kind,row,{field=null}={}) {
    if(field)row=fieldSavedRecord(field,row,index,row.saved_at||'');
    const itemId=kind==='axiom'?row.care_item_id:row.care_unit_id;
    const node=index.nodes.get(itemId),scope=identity(row.source_pane);
    const reference=field?.references?.[scope+'|'+itemId];
    const unitId=identity(row.care_unit_id||row.unit_id||reference?.unit_id||node?.unit?.id);
    const unit=index.units.get(unitId),work=node?.work||unit?.work;
    const fieldId=field?.id||'',lateralId=!field&&!work&&node?node.unit?.id||'':'';
    const available=row.available!==false&&(field?Boolean(unitId&&(field.bundle||field.bundle_url)):Boolean(node));
    let projected=null;
    if(available&&!field&&kind==='axiom')try{projected=card(itemId);}catch{}
    const id=itemIdentity(kind,fieldId,scope,itemId);
    const layer=reference?.layer||node?.unit?.layer||row.layer||'';
    const author=field?'':work?.author||row.author||'';
    const title=field?(row.title||unitId):(kind==='axiom'?(reference?.title||node?.section||row.title||'Saved axiom'):(node?.title||reference?.title||row.title||unitId||'Bookmarked pane'));
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

export function filterSavedItems(items,{kind='all',book='',query=''}={}) {
  const words=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item=>(kind==='all'||item.kind===kind)&&(!book||item.work_id===book)&&words.every(word=>[item.title,item.text,item.excerpt,item.work_title,item.author,item.layer,item.layer_label].join(' ').toLocaleLowerCase().includes(word)));
}

export function removeSavedItem(value,item) {
  if(item.field_id) {
    const next=normalizeFieldSavedState(value),key=item.kind==='axiom'?'saved_axioms':'saved_panes',idKey=item.kind==='axiom'?'care_item_id':'care_unit_id';
    return {...next,[key]:next[key].filter(row=>row[idKey]!==item[idKey]||identity(row.source_pane)!==item.source_pane)};
  }
  const next=normalizeSavedState(value);
  if(item.kind==='pane')return {...next,bookmarks:next.bookmarks.filter(row=>row.care_unit_id!==item.care_unit_id)};
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
  const source=item.layer==='SOURCE',selection=isAxiom?{[item.node_kind==='passage'?'passage_id':'axiom_id']:item.care_item_id,unit_id:item.care_unit_id,work_id:item.work_id,route_root_id:''}:null;
  return {type:'book',id:item.work_id,state:{workId:item.work_id,unitId:source?'':item.care_unit_id,rawUnitId:source?item.care_unit_id:'',referenceId:'',connectionId:'',connectionReferenceId:'',connectionSelection:null,selectedAxiom:selection,outlineUnits:[],savedFocus:{work_id:item.work_id,unit_id:item.care_unit_id,token}}};
}

// Shared Mac Saved library renderer; public storage note and collection filters.

const instances = new WeakMap()
const paths = {
  bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  book:'<path d="M4 4h6c2 0 2 1 2 2v15c0-2-2-3-4-3H4zm16 0h-6c-2 0-2 1-2 2v15c0-2 2-3 4-3h4z"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
  remove:'<path d="m7 7 10 10M17 7 7 17"/>',
  time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  all:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
}
const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>'
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
const text = value => String(value ?? '').trim()
function savedDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:date.getFullYear()!==new Date().getFullYear()?'numeric':undefined}).format(date)
}
export default function(component) {
  const {parentElement,data,setTriggerValue} = component
  const root = parentElement.querySelector('[data-saved-library]')
  if (!root) return
  let state = instances.get(parentElement)
  if (!state || state.reviewer !== data.reviewer) {
    state = {reviewer:data.reviewer,kind:'all',book:'',query:'',signature:''}
    instances.set(parentElement,state)
  }
  const items = Array.isArray(data.items) ? data.items : []
  const bookMap = new Map(items.filter(item=>item.work_id).map(item=>[item.work_id,item.work_title]))
  const counts = {all:items.length,pane:items.filter(item=>item.kind==='pane').length,axiom:items.filter(item=>item.kind==='axiom').length}
  if (state.book && !bookMap.has(state.book)) state.book = ''
  root.dataset.theme = data.theme === 'light' ? 'light' : 'dark'
  function emit(action,item) {
    setTriggerValue('action',{action,kind:item?.kind,id:item?.id,nonce:Date.now()+'-'+Math.random()})
  }
  function card(item) {
    const isAxiom = item.kind==='axiom', title = text(item.title) || (isAxiom?'Saved axiom':'Bookmarked pane')
    const excerpt = text(item.excerpt || item.text), date = savedDate(item.saved_at)
    const available = item.available !== false, kindName = isAxiom?'Favourite axiom':'Bookmarked pane'
    return `<article class="saved-card" data-kind="${esc(item.kind)}" data-layer="${esc(item.layer)}" data-unavailable="${!available}">
      <div class="saved-card-top"><div class="saved-kind">${icon(isAxiom?'star':'bookmark')}<b>${esc(item.layer_label||item.layer||'CARE')}</b><span>${kindName}</span></div><button class="saved-remove" type="button" data-remove="${esc(item.token)}" title="${isAxiom?'Remove favourite':'Remove bookmark'}" aria-label="${isAxiom?'Remove favourite':'Remove bookmark'}: ${esc(title)}">${icon('remove')}</button></div>
      <button class="saved-open" type="button" data-open="${esc(item.token)}" ${available?'':'disabled'} aria-label="${available?'Open':'Unavailable'} ${isAxiom?'axiom':'pane'}: ${esc(title)}">
        <h2>${esc(title)}</h2>${excerpt?`<p class="saved-excerpt">${esc(excerpt)}</p>`:!isAxiom?`<p class="saved-excerpt">${esc(({CH:'Chapter reading',CL:'Cluster reading',MC:'Macro reading',CM:'Macro reading',SOURCE:'Source reading',WB:'Whole-book reading'})[item.layer]||'CARE reading')} · return to this pane in your book.</p>`:''}
        ${available?'':'<p class="saved-unavailable">This reading is currently unavailable.</p>'}
        <div class="saved-book"><span class="saved-book-icon" aria-hidden="true">${icon('book')}${item.cover_url?`<img src="${esc(item.cover_url)}" alt="" loading="lazy" decoding="async">`:''}</span><div class="saved-book-copy"><span class="saved-book-title">${esc(item.work_title||'Untitled book')}</span>${item.author?`<span class="saved-author">${esc(item.author)}</span>`:''}</div></div>
        <div class="saved-card-bottom"><span>${date?'Saved '+esc(date):'Saved to your library'}</span><span class="saved-open-label">${available?(isAxiom?'Open axiom':'Open pane'):'Unavailable'}${available?icon('arrow'):''}</span></div>
      </button></article>`
  }
  function renderResults() {
    const visible = filterSavedItems(items,state)
    root.querySelectorAll('[data-kind-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kindFilter===state.kind)))
    const summary = root.querySelector('[data-summary]')
    summary.innerHTML = `<strong>${visible.length} ${visible.length===1?'saved reading':'saved readings'}</strong>${visible.length!==items.length?` of ${items.length}`:''}${state.book?' in this book':''}`
    const grid = root.querySelector('[data-grid]')
    grid.innerHTML = visible.length ? visible.map(card).join('') : `<div class="saved-empty"><div class="saved-empty-icon">${icon(items.length?'search':'bookmark')}</div><h2>${items.length?'Nothing here just yet.':'Keep what stays with you.'}</h2><p>${items.length?'Try another search, choose a different book, or clear your filters.':'Bookmark a chapter, cluster or macro pane as you read. Your favourite axioms will find a home here too.'}</p><div class="saved-empty-actions">${items.length?'<button type="button" data-clear>Clear filters</button>':data.can_exit?`<button type="button" data-exit>${icon('book')}Explore the library</button>`:''}</div></div>`
  }
  const signature = JSON.stringify([items,data.reviewer,data.can_exit,data.theme])
  if (!root.querySelector('.saved-inner') || state.signature!==signature) {
    const scroll = root.scrollTop
    root.innerHTML = `<div class="saved-inner"><header class="saved-heading"><div><div class="saved-eyebrow">${icon('bookmark')}CARE · YOUR PERSONAL COLLECTION</div><h1>Your saved library.</h1><p>The pages you return to. The ideas you want to keep.<br>Bookmarked panes and favourite axioms, together in one place.</p></div><div class="saved-heading-side">${data.can_exit?`<button class="saved-back" type="button" data-exit>${icon('back')}Back to library</button>`:''}<div class="saved-stats"><div class="saved-stat"><strong>${counts.pane}</strong><span>Bookmarked ${counts.pane===1?'pane':'panes'}</span></div><div class="saved-stat"><strong>${counts.axiom}</strong><span>Favourite ${counts.axiom===1?'axiom':'axioms'}</span></div><div class="saved-stat"><strong>${bookMap.size}</strong><span>${bookMap.size===1?'Book or reading':'Books and readings'}</span></div></div></div></header>
      <div class="saved-controls"><div class="saved-tabs" role="group" aria-label="Saved reading type">${[['all','All saved','all'],['pane','Bookmarked panes','bookmark'],['axiom','Favourite axioms','star']].map(([kind,label,glyph])=>`<button type="button" class="saved-tab" data-kind-filter="${kind}" aria-pressed="${state.kind===kind}">${icon(glyph)}${label}<small>${counts[kind]}</small></button>`).join('')}</div><div class="saved-find"><label class="saved-search">${icon('search')}<input type="search" aria-label="Search saved library" placeholder="Search your saved library…" data-search value="${esc(state.query)}"></label><select class="saved-book-select" aria-label="Filter by book or reading" data-book><option value="">All books and readings</option>${[...bookMap].sort((a,b)=>text(a[1]).localeCompare(text(b[1]))).map(([id,title])=>`<option value="${esc(id)}" ${id===state.book?'selected':''}>${esc(title||'Untitled book')}</option>`).join('')}</select></div></div>
      <div class="saved-results-line"><span data-summary role="status" aria-live="polite"></span><span class="saved-order">${icon('time')}Most recently saved</span></div><div class="saved-grid" data-grid></div><p class="saved-collection-note">${icon('bookmark')}Saved in this browser, on this device. ${counts.all?'Each reading opens where you left your bookmark.':'Use the bookmark beside a pane title, or favourite an axiom in its viewer.'}</p></div>`
    state.signature = signature
    renderResults()
    root.scrollTop = scroll
  }
  // An acknowledged action may leave this page mounted (for example a stale
  // reading). Re-enable its controls even if the collection did not change.
  root.querySelectorAll('[data-open], [data-remove]').forEach(button => {
    const item = items.find(item=>(button.dataset.open||button.dataset.remove)===item.token)
    button.disabled = !item || (button.hasAttribute('data-open') && item.available===false)
  })
  root.onclick = event => {
    const button = event.target.closest('button')
    if (!button || button.disabled) return
    if (button.hasAttribute('data-kind-filter')) {state.kind=button.dataset.kindFilter;renderResults();return}
    if (button.hasAttribute('data-clear')) {state.kind='all';state.book='';state.query='';root.querySelector('[data-search]').value='';root.querySelector('[data-book]').value='';renderResults();return}
    if (button.hasAttribute('data-exit')) {emit('exit');return}
    const token = button.dataset.open || button.dataset.remove
    const item = items.find(item=>item.token===token)
    if (!item) return
    const removing = button.hasAttribute('data-remove')
    if (!removing && item.available===false) return
    button.disabled=true
    emit(removing?'remove':'open',item)
  }
  root.oninput = event => {if(event.target.hasAttribute('data-search')){state.query=event.target.value;renderResults()}}
  root.onchange = event => {if(event.target.hasAttribute('data-book')){state.book=event.target.value;renderResults()}}
  const coverError = event => {
    if (event.target.matches?.('.saved-book-icon img')) event.target.remove()
  }
  root.addEventListener('error',coverError,true)
  // Cached failures may complete before handlers are attached during a rerun.
  root.querySelectorAll('.saved-book-icon img').forEach(img=>{
    if (img.complete && !img.naturalWidth) img.remove()
  })
  return () => {root.onclick=null;root.oninput=null;root.onchange=null;root.removeEventListener('error',coverError,true)}
}
