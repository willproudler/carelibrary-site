import {loadLibrary} from './library-loader.mjs?v=20261018';
import {loadText} from './resource-loader.mjs?v=20261018';
import mountSavedLibrary, {SAVED_READING_ID,SAVED_READING_STYLE,normalizeSavedState,normalizeFieldSavedState,collectSavedItems,removeSavedItem,savedItemTarget,withSavedFavourite,withSavedBookmark,fieldSavedRecord} from './saved-library.mjs?v=20261018';
import {publicFields,fieldPayload,fieldMemberFor,fieldMemberCard,fieldReferenceState,loadPublicField} from './public-fields.mjs?v=20261018';
import mountReader from './native/study-desk.mjs?v=09bfc207f004bc18';

import {createPublicReaderAdapter} from './public-reader-adapter.mjs?v=e42759f6cd7691f3';
import {searchLibrary} from './library-core.mjs?v=9cc86f99fc737162';
import {reconcileReadings,closeReading,standaloneBookState,READING_STYLES} from './reading-workspace.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readLocal = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key)) || fallback;}catch{return fallback;}};
const saveLocal = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{notice('Your browser could not save this change. Please allow browser storage and try again.');return false;}};
let noticeTimer;
function notice(message){const el=$('#notice');el.textContent=message;el.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,4300);}

async function start(){
 const [loader,css,scope]=await Promise.all([loadLibrary(),loadText('./native/study-desk.css?v=2c8c441f9eaa3ba0'),loadText('./native/public-scope.css?v=225b9b9a34331c20')]);
 const data=loader.data;let adapter=createPublicReaderAdapter(data),index=adapter.index;
 let indexedWorks=[...data.works],indexedLateral=data.lateral;
 function refreshAdapter(){
  if(indexedLateral===data.lateral&&indexedWorks.length===data.works.length&&indexedWorks.every((work,i)=>work===data.works[i]))return;
  adapter=createPublicReaderAdapter(data);index=adapter.index;indexedWorks=[...data.works];indexedLateral=data.lateral;
 }
 const host=$('#reader');host.replaceChildren();const shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style>${css}\n${scope}</style><div class="study-desk" data-study-desk tabindex="0" style="height:100%;min-height:0"></div><div class="field-desk" data-field-desk hidden style="height:100%;min-height:0"></div>`;
 const savedHost=$('[data-saved-library]');
 const viewerHost=document.createElement('div');viewerHost.hidden=true;document.body.append(viewerHost);const viewerShadow=viewerHost;
 let mountViewer,mountField,viewerPromise,fieldPromise;
 async function ensureViewer(){
  if(!viewerPromise)viewerPromise=Promise.all([import('./native/reference-viewer.mjs?v=225b9b9a34331c20'),loadText('./native/reference-viewer.css?v=225b9b9a34331c20'),loadText('./native/reference-viewer.html?v=225b9b9a34331c20')]).then(([module,viewerCSS,viewerHTML])=>{
   mountViewer=module.default;
   viewerHost.innerHTML=`<style>.care-reference-component{--st-text-color:#ece8df;--st-background-color:#0e1117;--st-secondary-background-color:#171c23;--st-font:system-ui,sans-serif;--st-code-font:ui-monospace,monospace}${viewerCSS}\n.crv-tool-rate,.crv-tool-quality,.crv-tool-collect,.crv-tool-sheet,.crv-tool-reveal-sheet{display:none!important}.crv-text p:first-child{margin-top:0}.crv-text p:last-child{margin-bottom:0}</style>${viewerHTML}`;
  }).catch(error=>{viewerPromise=null;throw error;});
  return viewerPromise;
 }
 async function ensureField(){
  if(!fieldPromise)fieldPromise=Promise.all([import('./native/study-field.mjs?v=978d72e469c56768'),loadText('./native/study-field.css?v=225b9b9a34331c20')]).then(([module,fieldCSS])=>{
   mountField=module.default;const style=document.createElement('style');
   // Keep the bottom save control still when pointer entry reveals trace links.
   style.textContent=fieldCSS+`\n.field-desk .field-item[data-open-item] .item-links{display:flex;visibility:hidden}.field-desk .field-item[data-open-item]:hover .item-links,.field-desk .field-item[data-open-item]:focus-within .item-links{visibility:visible}`;
   shadow.append(style);
  }).catch(error=>{fieldPromise=null;throw error;});
  return fieldPromise;
 }
 let state={workId:(data.works[0]?.id||''),routeMode:'incoming',outlineUnits:[]},view='library',cleanup,savedCleanup,viewerCleanup;
 let opened=[],history=[],historyIndex=-1;
 let saved=normalizeSavedState(readLocal('care-public-saved-v1',{}));
 const bookStates=new Map();
 let appliedSavedSelection='';
 let readingMenu=null;
 const books=data.works.map(work=>({id:work.id,title:work.title,author:work.author,year:work.year,cover_url:work.cover_url,publication_year:Number.parseInt(work.year),content_kind:'book',has_source:work.sources.length>0,has_care:work.units.length>0,layers:[...new Set(work.units.map(unit=>unit.layer))],cloth:work.slug==='kant'?'#303b4c':work.slug==='bergson'?'#50403c':'#3b4531',foil:'#cf9b61',language_code:work.language_code||'en',language_name:work.language_name||'English'}));
 const fields=publicFields(data,adapter);
 const fieldFor=id=>fields.find(field=>field.id===id&&(field.bundle||field.bundle_url));
 const lateralBooks=data.works.filter(work=>adapter.savedConnection.members.some(member=>member.id===work.id));
 function urlFor(node,{route=false}={}){const p=new URLSearchParams();if(!node.work)p.set('lateral',data.lateral.id);else p.set('book',node.work.slug);if(route)p.set('ref',node.id);else if(node.kind==='passage')p.set('source',node.unit.id);else if(node.work)p.set('unit',node.unit.id);return '#'+p;}
 function referenceRows(ids){
  const favourites=new Set(saved.favourites);
  return [...ids].flatMap(id=>{
   const node=index.nodes.get(id);if(!node||!['claim','passage'].includes(node.kind))return [];
   const row=adapter.card(id,{state}),citation=[node.work?.author,node.work?.title||data.lateral.title,id].filter(Boolean).join(', ')+'.';
   const note=node.grounding?.type==='Unresolved'?'Source alignment unresolved':node.passages?.some(p=>p.review==='unreviewed')?'AI source links · awaiting review':'';
   const result={...row,scope:'',metadata:[row.author,row.work_title,row.chapter_title,note,row.is_translation?`${row.reading_language_name} · saved machine translation`:''].filter(Boolean),citation,citation_short:citation,citation_ibid:`Ibid., ${id}.`,destination:urlFor(node,{route:true}),sheet_destination:urlFor(node),studio_route:{work:node.work?.id||data.works[0]?.id},open_label:'Open Routes',favourite:favourites.has(id)};
   return [result,{...result,scope:`public:${row.unit_id}`},...(row.work_id?[{...result,scope:`work:${row.work_id}`}]:[])];
  });
 }
 function currentKey(){return view==='saved'?SAVED_READING_ID:state.connectionId||state.workId;}
 function tabs(){
  opened=reconcileReadings(opened,currentKey(),view==='workspace'||view==='saved');
  const el=$('#open-books');el.hidden=!opened.length;
  el.innerHTML=`<span class="open-label">${opened.some(key=>key===SAVED_READING_ID||key===data.lateral.id||fieldFor(key))?'OPEN READINGS':'OPEN BOOKS'}</span>`+opened.map(key=>{
   const isSaved=key===SAVED_READING_ID;
   const w=adapter.workFor(key),kind=isSaved?'saved':w?(w.content_kind||'work'):(fieldFor(key)?.field||'lateral'),style=isSaved?SAVED_READING_STYLE:READING_STYLES[kind]||READING_STYLES.work,title=isSaved?'Saved library':w?.title||fieldFor(key)?.title||data.lateral.title,href=isSaved?'#view=saved':w?'#book='+w.slug:fieldFor(key)?'#field='+encodeURIComponent(key):'#lateral='+data.lateral.id,active=(view==='workspace'||view==='saved')&&currentKey()===key;
   return `<span class="open-tab ${active?'active':''}" data-kind="${esc(kind)}" style="--workspace-accent:${style.color}"><a href="${href}"${active?' aria-current="page"':''} title="${esc(style.label+' · '+title)}">${style.icon?`<svg class="reading-kind" viewBox="0 0 24 24" aria-hidden="true">${style.icon}</svg>`:''}<span>${esc(title)}</span></a>${!w&&!isSaved?`<button data-reading-menu="${esc(key)}" aria-label="Options for ${esc(title)}" aria-haspopup="menu" aria-expanded="false">⌄</button>`:''}<button data-close-book="${esc(key)}" aria-label="Close ${esc(title)}">×</button></span>`;
  }).join('');
  document.querySelectorAll('.app-header [data-page]').forEach(el=>el.classList.toggle('active',(view==='library'&&el.dataset.page==='library')||(view==='laterals'&&el.dataset.page==='laterals')||(view==='corpuses'&&el.dataset.page==='corpuses')||(view==='saved'&&el.dataset.page==='saved')));
 }
 function saveState(){if(view==='workspace')bookStates.set(currentKey(),{...state});}
 function closeReadingMenu(restore=false){if(!readingMenu)return;const {anchor,element}=readingMenu;readingMenu=null;anchor.setAttribute('aria-expanded','false');element.remove();if(restore&&anchor.isConnected)anchor.focus({preventScroll:true});}
 function showReading(key){
  ++routeRequest;setLoadStatus();
  if(key===SAVED_READING_ID){if(location.hash==='#view=saved')routeFromURL();else location.hash='view=saved';return;}
  if(!key){view='library';window.history.replaceState(null,'',location.pathname);paint();return;}
  const work=adapter.workFor(key);
  if(work)state=standaloneBookState(work.id,bookStates.get(work.id));
  else if(fieldFor(key))state={workId:(data.works[0]?.id||''),...bookStates.get(key),connectionId:key};
  else state={workId:(data.works[0]?.id||''),...bookStates.get(data.lateral.id),connectionId:data.lateral.id};
  view='workspace';syncURL();paint();
 }
 function closeTab(key){
  closeReadingMenu();saveState();
  const active=(view==='workspace'||view==='saved')?currentKey():'',fallback=key===data.lateral.id?state.workId:'';
  if(fallback&&!bookStates.has(fallback))bookStates.set(fallback,standaloneBookState(fallback,state));
  const next=closeReading(opened,key,active,fallback);opened=next.opened;
  if(key===active)showReading(next.destination);else tabs();
 }
 function keepBook(workId){
  closeReadingMenu();saveState();
  const comparison=state.connectionId?state:bookStates.get(data.lateral.id)||{};
  const reading=bookStates.get(workId)||(workId===comparison.workId?comparison:comparison.connectionBooks?.[workId])||{};
  bookStates.set(workId,standaloneBookState(workId,reading));
  opened=reconcileReadings(opened.filter(key=>key!==data.lateral.id&&!data.works.some(work=>work.id===key&&key!==workId)),workId);
  showReading(workId);
 }
 function openReadingMenu(key,anchor){
  const same=readingMenu?.anchor===anchor;closeReadingMenu();if(same)return;
  const work=adapter.workFor(key),element=document.createElement('div');element.className='reading-menu';element.setAttribute('role','menu');element.setAttribute('aria-label',work?'Book options':'Close comparison');
  element.innerHTML=`<button role="menuitem" data-close-book="${esc(key)}">Close ${work?'this book':'lateral'}</button>`;
  if(!work&&key===data.lateral.id)element.innerHTML+=lateralBooks.map(keep=>{const close=lateralBooks.find(other=>other.id!==keep.id);return `<button role="menuitem" data-keep-book="${esc(keep.id)}"><strong>Close ${esc(close.title)}</strong><small>Keep ${esc(keep.title)} open</small></button>`;}).join('');
  document.body.append(element);readingMenu={anchor,element};anchor.setAttribute('aria-expanded','true');
  const rect=anchor.getBoundingClientRect(),width=Math.min(330,innerWidth-16);Object.assign(element.style,{width:width+'px',left:Math.max(8,Math.min(innerWidth-width-8,rect.left))+'px',top:Math.min(rect.bottom+6,innerHeight-element.offsetHeight-8)+'px'});
  element.onclick=event=>{const keep=event.target.closest('[data-keep-book]'),close=event.target.closest('[data-close-book]');if(keep)keepBook(keep.dataset.keepBook);else if(close)closeTab(close.dataset.closeBook);};
  element.onkeydown=event=>{const choices=[...element.querySelectorAll('button')],at=choices.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();closeReadingMenu(true);}else if(event.key==='Tab')closeReadingMenu(true);else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();choices[event.key==='Home'?0:event.key==='End'?choices.length-1:(at+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length].focus();}};
  element.querySelector('button').focus();
 }
 function remember(){const id=state.connectionReferenceId||state.referenceId;if(!id)return;const entry={...state,outlineUnits:[]};const last=history[historyIndex];if(last?.referenceId===entry.referenceId&&last?.connectionReferenceId===entry.connectionReferenceId&&last?.routeMode===entry.routeMode)return;history=history.slice(0,historyIndex+1);history.push(entry);historyIndex=history.length-1;}
 function syncURL(){
  const w=adapter.workFor(state.workId),field=fieldFor(state.connectionId),p=new URLSearchParams();
  if(state.connectionId)p.set(field?'field':'lateral',state.connectionId);else p.set('book',w.slug);
  if(field){if(state.fieldReference){p.set('ref',state.fieldReference.id);if(state.fieldReference.source_pane)p.set('scope',state.fieldReference.source_pane);else if(state.fieldReference.work_id)p.set('work',state.fieldReference.work_id);}}
  else if(state.connectionReferenceId||state.referenceId)p.set('ref',state.connectionReferenceId||state.referenceId);
  else if(state.unitId)p.set('unit',state.unitId);else if(state.rawUnitId)p.set('source',state.rawUnitId);
  window.history.replaceState(null,'','#'+p);
 }
 function paintViewer(){
  const id=state.selectedAxiom?.passage_id||state.selectedAxiom?.axiom_id||state.connectionSelection?.reference_id||state.referenceId||state.connectionReferenceId||'';
  if(view!=='workspace'||!mountViewer){viewerHost.hidden=true;viewerCleanup?.();return;}
  // The viewer only needs the items rendered in the current panes and routes.
  const ids=new Set(id?[id]:[]);
  for(const el of shadow.querySelectorAll('[data-ref-id]')){
   const itemId=el.dataset.refId;if(itemId)ids.add(itemId);
  }
  const node=index.nodes.get(id),readingReferences=referenceRows(ids);
  viewerHost.hidden=false;
  viewerCleanup=mountViewer({parentElement:viewerShadow,data:{studio_mode:true,references:readingReferences,default_id:id,default_kind:node?.kind==='passage'?'passage':'axiom',follow_default:true},setTriggerValue:(kind,value)=>{
   if(kind!=='action')return;const n=index.nodes.get(value.id);if(!n)return;
   if(value.type==='studio_open_reference')openNode(n,true);
   else if(value.type==='studio_open_sheet')openNode(n,false);
   else if(value.type==='favourite'){toggleFavourite(n.id,value.active);}
  }});
 }
 function paint(){
  closeReadingMenu();
  tabs();host.hidden=view==='saved';savedHost.hidden=view!=='saved';
  if(view==='saved'){cleanup?.();cleanup=null;viewerCleanup?.();viewerCleanup=null;viewerHost.hidden=true;paintSaved();return;}
  savedCleanup?.();savedCleanup=null;
  state.bookmarks=saved.bookmarks;state.favouriteAxiomIds=saved.favourites;
  state.routeHistory={can_back:historyIndex>0,can_forward:historyIndex<history.length-1};
  const activeField=view==='workspace'&&fieldFor(state.connectionId);
  shadow.querySelector('[data-study-desk]').hidden=Boolean(activeField);shadow.querySelector('[data-field-desk]').hidden=!activeField;
  if(activeField){state.fieldSaved=normalizeFieldSavedState(readLocal('care-public-field-saved:'+activeField.id,{}));cleanup?.();cleanup=mountField({parentElement:shadow,data:fieldPayload(activeField,adapter,state),setStateValue:()=>{},setTriggerValue:(kind,value)=>{if(kind==='action')dispatchField(activeField,value);}});paintFieldViewer(activeField);saveState();return;}
  const payload=view==='workspace'?adapter.workspace(state):{mode:'library',books,fields,library_scope:view==='laterals'?'lateral':view==='corpuses'?'corpus':'',shelf_request:view,workspace_managed:true};
  cleanup?.();cleanup=mountReader({parentElement:shadow,data:payload,setStateValue:(kind,value)=>{state=adapter.reduce(state,kind,value);},setTriggerValue:dispatch});
  const closeComparison=shadow.querySelector('[data-connection-close]');
  if(closeComparison){closeComparison.textContent='Close comparison ⌄';closeComparison.setAttribute('aria-label','Close comparison options');closeComparison.setAttribute('aria-haspopup','menu');closeComparison.setAttribute('aria-expanded','false');}
  paintViewer();
  const savedToken=state.savedFocus?.token,selection=state.selectedAxiom;
  if(view==='workspace'&&savedToken&&savedToken!==appliedSavedSelection&&selection){
   const attribute=selection.passage_id?'data-select-passage':'data-select-axiom',id=selection.passage_id||selection.axiom_id;
   const selected=shadow.querySelector(`[${attribute}="${CSS.escape(id)}"]`);
   if(selected){appliedSavedSelection=savedToken;const section=selected.closest('details');if(section)section.open=true;selected.click();selected.scrollIntoView({block:'nearest',inline:'nearest'});}
  }
  saveState();
 }
 function showBookInfo(work){
  let dialog=$('#book-info-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='book-info-dialog';dialog.setAttribute('aria-labelledby','book-info-title');document.body.append(dialog);}
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="book-info-title">${esc(work.title)}</h2><button aria-label="Close book info">×</button></div><dl>${[['Author',work.author],['Original title',work.original_title && work.original_title !== work.title ? work.original_title : ''],['Year',work.year],['Edition',work.edition],['Version',work.version_label]].filter(([,value])=>value).map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>${work.description?`<p>${esc(work.description)}</p>`:''}<p>${work.sources.length} source chapters · ${work.units.length} CARE readings</p>`;
  dialog.querySelector('button').onclick=()=>dialog.close();dialog.showModal();
 }
 function paintFieldViewer(field){
  const references=Object.entries(field.references||{}).map(([key,reference])=>({...reference,scope:reference.source_pane||key.slice(0,key.lastIndexOf('|')),kind:reference.kind||'axiom',resolved:reference.resolved!==false,reading_html:reference.reading_html||esc(reference.text||'')}));
  const selected=state.fieldSelected||state.fieldReference||{},ids=new Set(selected.id?[selected.id]:[]);
  for(const element of shadow.querySelectorAll('[data-ref-id],[data-item-id],[data-select-axiom],[data-select-passage]')){
   const id=element.dataset.refId||element.dataset.itemId||element.dataset.selectAxiom||element.dataset.selectPassage;if(id)ids.add(id);
  }
  for(const id of ids){const card=fieldMemberCard(field,adapter,id,state);if(card)references.push(card);}
  const globalFavourites=new Set(saved.favourites),fieldFavourites=state.fieldSaved?.saved_axioms||[];
  for(const reference of references)reference.favourite=reference.scope?fieldFavourites.some(row=>row.care_item_id===reference.id&&row.source_pane===reference.scope):globalFavourites.has(reference.id);
  const selectedReference=references.find(reference=>reference.id===selected.id&&reference.scope===(selected.source_pane||''));
  viewerHost.hidden=false;viewerCleanup?.();viewerCleanup=mountViewer({parentElement:viewerShadow,data:{studio_mode:true,references,default_id:selected.id||'',default_kind:selected.kind||selectedReference?.kind||'axiom',default_scope:selected.source_pane||'',follow_default:true},setTriggerValue:(kind,value)=>{
   if(kind!=='action')return;
   const scope=value.scope??selected.source_pane??'',reference=references.find(reference=>reference.id===value.id&&reference.scope===scope);
   if(!reference)return;
   if(value.type==='favourite'){dispatchField(field,{type:'axiom_favourite_action',care_item_id:value.id,unit_id:reference.unit_id,work_id:reference.work_id,source_pane:scope,active:value.active});return;}
   if(['studio_open_reference','studio_open_sheet'].includes(value.type))openFieldReference(field,{id:value.id,scope,workId:scope?'':reference.work_id});
  }});
 }
 function openFieldReference(field,request){
  const next=fieldReferenceState(field,adapter,state,request);
  if(!next){notice('This route is not included in the published reading.');return;}
  state=next;syncURL();paint();
 }
 function dispatchField(field,action){
  if(action.type==='selected_axiom'){state.fieldSelected={id:action.value?.axiom_id||action.value?.passage_id,source_pane:action.source_pane||'',work_id:action.work_id||action.value?.work_id||'',kind:action.value?.passage_id?'passage':'axiom'};paintFieldViewer(field);return;}
  if(['bookmark_action','axiom_favourite_action'].includes(action.type)){
   if(!action.source_pane){
    const member=fieldMemberFor(field,adapter,action.work_id),node=index.nodes.get(action.care_item_id||action.care_unit_id);
    if(!member||node?.work?.id!==member.work.id)return;
    if(action.type==='axiom_favourite_action'){toggleFavourite(node.id,action.active);return;}
    if(action.action==='open'){state.fieldReference=null;state.fieldSavedFocus={...action,work_id:member.memberId,unit_id:node.id};state.fieldBookStates={...state.fieldBookStates,[member.memberId]:{workId:member.work.id,unitId:node.kind==='source'?'':node.id,rawUnitId:node.kind==='source'?node.id:''}};syncURL();paint();return;}
    if(action.action==='toggle'){
     const next=withSavedBookmark(saved,{care_unit_id:node.id,work_id:member.work.id,title:node.title,layer:node.layer||node.unit.layer,saved_at:new Date().toISOString(),available:true},action.active);
     if(saveLocal('care-public-saved-v1',next))saved=next;paint();return;
    }
   }
   if(action.action==='open'){state.fieldReference=null;state.fieldSavedFocus={...action,unit_id:action.care_unit_id};syncURL();paint();return;}
   const collection=action.type==='bookmark_action'?'saved_panes':'saved_axioms',key=collection==='saved_panes'?'care_unit_id':'care_item_id';
   const previous=normalizeFieldSavedState(state.fieldSaved),values={...previous,[collection]:previous[collection].filter(row=>row[key]!==action[key]||(row.source_pane||'')!==(action.source_pane||''))};
   if(action.active)values[collection].push(fieldSavedRecord(field,action,index));
   if(saveLocal('care-public-field-saved:'+field.id,values))state.fieldSaved=values;
   paint();return;
  }
  if(action.type==='library'){location.hash='view='+ (field.field==='corpus'?'corpuses':'laterals');return;}
  if(action.type==='clear_reference'){state.fieldReference=null;syncURL();paint();return;}
  if(action.type==='open_reference'){
   openFieldReference(field,{id:action.reference_id,scope:action.source_pane||'',workId:action.work_id||''});return;
  }
  if(['load_member','load_members'].includes(action.type)){
   const ids=action.work_ids||[action.work_id];if(ids.some(id=>!data.works.some(work=>work.id===id||work.version_work_id===id)))notice('This source book has not been published to the beta yet.');return;
  }
  if(['open_chapter','open_sheet','open_work'].includes(action.type)){
   const work=data.works.find(work=>work.id===action.work_id||work.version_work_id===action.work_id);
   if(!work){notice('This source book has not been published to the beta yet.');return;}
   const next={workId:work.id,unitId:action.unit_id||'',rawUnitId:action.raw_unit_id||''};
   state.fieldBookStates={...state.fieldBookStates,[action.work_id]:next};paint();return;
  }
  if(action.type==='resolution'){state.fieldReference=state.fieldReference?{...state.fieldReference,resolution:action.resolution}:null;paint();}
 }
 function toggleFavourite(id,active){if(!index.nodes.has(id))return;const next=withSavedFavourite(saved,id,active);if(!saveLocal('care-public-saved-v1',next)){paint();return;}saved=next;paint();notice(active?'Saved on this device.':'Removed from your saved readings.');}
 async function dispatch(kind,value){
  try{
   if(kind==='connection_action'&&value.action==='close'){openReadingMenu(data.lateral.id,shadow.querySelector('[data-connection-close]'));return;}
   if(kind==='open_work'){const w=adapter.workFor(value);if(w)location.hash='book='+w.slug;return;}
   if(kind==='open_field'){if(fieldFor(value))location.hash='field='+encodeURIComponent(value);else if(value===data.lateral.id)location.hash='lateral='+value;return;}
   if(kind==='book_action'){const w=adapter.workFor(value.work_id);if(value.action==='book_info'&&w)showBookInfo(w);return;}
   if(kind==='bookmark_action'){
    const unit=index.units.get(value.care_unit_id);if(!unit||unit.work?.id!==value.work_id)return;
    if(value.action==='open'){openNode(index.nodes.get(unit.id),false);return;}
    if(value.action==='toggle'){const next=withSavedBookmark(saved,{care_unit_id:unit.id,work_id:unit.work.id,title:unit.title,layer:unit.layer,saved_at:new Date().toISOString(),available:true},value.active);if(!saveLocal('care-public-saved-v1',next)){paint();return;}saved=next;paint();notice(value.active?'Pane bookmarked on this device.':'Bookmark removed.');}return;
   }
   if(kind==='axiom_favourite_action'){toggleFavourite(value.care_item_id,value.active);return;}
   if(kind==='navigate_route'){const target=historyIndex+Number(value);if(target<0||target>=history.length)return;historyIndex=target;state={...history[target]};syncURL();paint();return;}
   if(kind==='connection_action'&&value.action==='open'){const request=++routeRequest;await Promise.all([loader.ensureLateral(),ensureViewer()]);if(request!==routeRequest)return;refreshAdapter();}
   const next=adapter.reduce(state,kind,value);if(next===state)return;state=next;
   if(kind==='connection_action'&&value.action==='open'){view='workspace';if(!opened.includes(currentKey()))opened.push(currentKey());}
   if(kind==='open_reference'||kind==='set_route_mode'||kind==='connection_action'&&value.action==='reference')remember();
   if(kind!=='open_outline_sheet')syncURL();paint();
  }catch(error){notice(error.message);}
 }
 function openNode(node,route){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  if(state.connectionId&&route){state.connectionReferenceId=node.id;state.referenceId='';remember();syncURL();paint();return;}
  const destination=urlFor(node,{route});if(location.hash===destination)routeFromURL();else location.hash=destination.slice(1);
 }
 let routeRequest=0;
 const loading=$('#load-status');
 function setLoadStatus(message='',retry=null){loading.hidden=!message;loading.replaceChildren();if(!message)return;const text=document.createElement('span');text.textContent=message;loading.append(text);if(retry){const button=document.createElement('button');button.textContent='Try again';button.onclick=retry;const refresh=document.createElement('button');refresh.textContent='Refresh library';refresh.onclick=()=>location.reload();loading.append(button,refresh);}}
 async function prepareSaved(request){
  const ids=[...saved.bookmarks.map(row=>row.care_unit_id),...saved.favourites];
  const requests=ids.map(async id=>{const owner=await loader.ownerFor(id);if(owner)await loader.ensureReference(id);});
  for(const field of fields){const stored=normalizeFieldSavedState(readLocal('care-public-field-saved:'+field.id,{}));if(stored.saved_panes.length||stored.saved_axioms.length)requests.push(loadPublicField(field));}
  const results=await Promise.allSettled(requests);if(request!==routeRequest)return;refreshAdapter();
  if(results.some(result=>result.status==='rejected'))notice('Some saved readings could not load. Open Saved again to retry. Your bookmarks are still kept.');
 }
 function paintSaved(){
  const items=collectSavedItems({saved,index,fields,readLocal,card:id=>adapter.card(id,{state})});
  savedCleanup?.();savedCleanup=mountSavedLibrary({parentElement:$('#main'),data:{items,reviewer:'you',can_exit:true,theme:'dark'},setTriggerValue:async(_,event)=>{
   if(event.action==='exit'){location.hash='';return;}
   const item=items.find(item=>item.id===event.id&&item.kind===event.kind);if(!item)return;
   if(event.action==='remove'){
    const next=removeSavedItem(item.field_id?readLocal(item.storage_key,{}):saved,item);
    if(saveLocal(item.storage_key,next)){if(!item.field_id)saved=next;paintSaved();}else paintSaved();return;
   }
   const target=savedItemTarget(item);if(!target){notice('This saved reading is not currently published.');paintSaved();return;}
   bookStates.set(target.id,{...bookStates.get(target.id),...target.state});
   const destination=target.type==='book'?'#book='+adapter.workFor(target.id).slug:target.type==='field'?'#field='+encodeURIComponent(target.id):'#lateral='+encodeURIComponent(target.id);
   if(location.hash===destination)routeFromURL();else location.hash=destination;
  }});
 }
 async function routeFromURL(){
  const request=++routeRequest;saveState();setLoadStatus();
  const p=new URLSearchParams(location.hash.slice(1)),field=fieldFor(p.get('field')),lateral=p.get('lateral'),work=adapter.workFor(p.get('book'));
  try{
   if(p.get('view')==='saved'){
    view='saved';paint();setLoadStatus('Opening your saved readings…');await prepareSaved(request);if(request!==routeRequest)return;setLoadStatus();paint();return;
   }
   if(field){
    setLoadStatus('Opening '+field.title+'…');await Promise.all([loadPublicField(field),ensureField(),ensureViewer()]);if(request!==routeRequest)return;
    await loader.ensureWorks((field.bundle.members||[]).map(member=>data.works.find(work=>work.id===(member.work_id||member.id)||work.version_work_id===(member.work_id||member.id))?.id).filter(Boolean));
    if(request!==routeRequest)return;refreshAdapter();state={workId:(data.works[0]?.id||''),...bookStates.get(field.id),connectionId:field.id};view='workspace';
   }else if(data.lateral.id&&(lateral===data.lateral.id||p.has('compare'))){
    setLoadStatus('Opening the comparison…');await Promise.all([loader.ensureLateral(),ensureViewer()]);if(request!==routeRequest)return;refreshAdapter();
    state={workId:adapter.savedConnection.members[0]?.id||data.works[0]?.id||'',...bookStates.get(data.lateral.id),connectionId:data.lateral.id,connectionReferenceId:p.get('ref')||'',referenceId:''};view='workspace';
   }else if(work){
    setLoadStatus('Opening '+work.title+'…');await Promise.all([loader.ensureWork(work.id),ensureViewer()]);if(request!==routeRequest)return;refreshAdapter();state=standaloneBookState(work.id,bookStates.get(work.id));view='workspace';
   }else{view=['laterals','corpuses'].includes(p.get('view'))?p.get('view'):'library';paint();return;}
   if(p.has('unit')&&p.get('unit')!==data.lateral.id){state.unitId=p.get('unit');state.rawUnitId='';state.referenceId='';state.selectedAxiom=null;}
   if(p.has('source')){state.rawUnitId=p.get('source');state.unitId='';state.referenceId='';state.selectedAxiom=null;}
   if(p.has('ref')){
    if(field){const next=fieldReferenceState(field,adapter,state,{id:p.get('ref'),scope:p.get('scope')||'',workId:p.get('work')||''});if(!next)throw Error('This route is not included in the published reading.');state=next;}
    else{if(state.connectionId)state.connectionReferenceId=p.get('ref');else state.referenceId=p.get('ref');remember();}
   }
   setLoadStatus();paint();
  }catch(error){if(request!==routeRequest)return;console.error(error);view='library';paint();setLoadStatus(error.message||'This reading could not load.',()=>routeFromURL());}
 }
 $('#open-books').addEventListener('click',event=>{const menu=event.target.closest('[data-reading-menu]'),close=event.target.closest('[data-close-book]');if(menu)openReadingMenu(menu.dataset.readingMenu,menu);else if(close)closeTab(close.dataset.closeBook);});
 document.addEventListener('pointerdown',event=>{if(readingMenu&&!event.composedPath().includes(readingMenu.element)&&!event.composedPath().includes(readingMenu.anchor))closeReadingMenu();},true);
 addEventListener('resize',()=>closeReadingMenu());
 document.querySelector('[data-page=library]').addEventListener('click',event=>{event.preventDefault();if(location.hash)location.hash='';else{view='library';paint();}});
 document.querySelector('[data-page=search]').onclick=()=>{$('#search-dialog').showModal();$('#search-query').focus();};
 document.querySelector('[data-page=saved]').onclick=()=>{if(location.hash==='#view=saved')routeFromURL();else location.hash='view=saved';};
 function resultLink(n){const prose=n.kind==='claim'?adapter.card(n.id).reading_text:n.text;return `<a class="result" href="${urlFor(n,{route:n.kind==='claim'||n.kind==='passage'})}"><small>${esc(n.work?.title||data.lateral.title)} · ${esc(n.unit.layer)} · ${esc(n.id)}</small><strong>${esc(n.section||n.title||n.unit.title)}</strong>${prose?`<p>${esc(prose.slice(0,250))}${prose.length>250?'…':''}</p>`:''}</a>`;}
 let searchRequest=0,searchTimer;
 async function runSearch(){
  const request=++searchRequest,q=$('#search-query').value.trim();
  if(!q){$('#search-status').textContent='Search the published source texts and their saved readings.';$('#search-results').replaceChildren();return;}
  $('#search-status').textContent='Loading the published readings for search…';
  try{await loader.ensureAll();if(request!==searchRequest)return;refreshAdapter();const nodes=searchLibrary(index,q,60);$('#search-status').textContent=nodes.length?`${nodes.length===60?'First ':''}${nodes.length} matching passages and claims`:'No matches. Try a shorter phrase.';$('#search-results').innerHTML=nodes.map(resultLink).join('');}
  catch(error){if(request!==searchRequest)return;$('#search-status').textContent=error.message;const button=document.createElement('button');button.textContent='Try search again';button.onclick=runSearch;$('#search-results').replaceChildren(button);}
 }
 $('#search-query').oninput=()=>{++searchRequest;clearTimeout(searchTimer);searchTimer=setTimeout(runSearch,180);};
 document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target.closest('.result'))dialog.close();if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
 addEventListener('hashchange',routeFromURL);routeFromURL();
}
start().catch(error=>{const host=$('#reader');host.textContent=error.message||'CARE Library could not load.';host.classList.add('loading');const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();host.append(document.createElement('br'),retry);});
