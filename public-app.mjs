import mountField from './native/study-field.mjs?v=a63dd9a83abd5bd5';
import {publicFields,fieldPayload,fieldReference,loadPublicField} from './public-fields.mjs?v=a63dd9a83abd5bd5';
import mountReader from './native/study-desk.mjs?v=a63dd9a83abd5bd5';
import mountViewer from './native/reference-viewer.mjs?v=a63dd9a83abd5bd5';
import {createPublicReaderAdapter} from './public-reader-adapter.mjs?v=a63dd9a83abd5bd5';
import {searchLibrary} from './library-core.mjs?v=20261014-current';
import {reconcileReadings,closeReading,standaloneBookState,READING_STYLES} from './reading-workspace.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readLocal = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key)) || fallback;}catch{return fallback;}};
const saveLocal = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{notice('Your browser could not save this bookmark.');}};
let noticeTimer;
function notice(message){const el=$('#notice');el.textContent=message;el.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,4300);}

async function start(){
 const response=await fetch('./data/library.json',{cache:'no-cache'});if(!response.ok)throw Error('CARE Library Beta could not load. Please refresh to try again.');
 const data=await response.json();data.lateral=data.lateral||{id:"",title:"",parents:[],sections:[]};const adapter=createPublicReaderAdapter(data),{index}=adapter;
 const [css,scope,viewerCSS,viewerHTML,fieldCSS]=await Promise.all(['./native/study-desk.css?v=a63dd9a83abd5bd5','./native/public-scope.css?v=a63dd9a83abd5bd5','./native/reference-viewer.css?v=a63dd9a83abd5bd5','./native/reference-viewer.html?v=a63dd9a83abd5bd5','./native/study-field.css?v=a63dd9a83abd5bd5'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('A reading component could not load. Please refresh.');return r.text();}));
 const host=$('#reader');host.replaceChildren();const shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style>${css}\n${scope}\n${fieldCSS}</style><div class="study-desk" data-study-desk tabindex="0" style="height:100%;min-height:0"></div><div class="field-desk" data-field-desk hidden style="height:100%;min-height:0"></div>`;
 // CARE's viewer deliberately uses the document surface (isolate_styles=False).
 const viewerHost=document.createElement('div');document.body.append(viewerHost);const viewerShadow=viewerHost;
 viewerShadow.innerHTML=`<style>.care-reference-component{--st-text-color:#ece8df;--st-background-color:#0e1117;--st-secondary-background-color:#171c23;--st-font:system-ui,sans-serif;--st-code-font:ui-monospace,monospace}${viewerCSS}\n.crv-tool-rate,.crv-tool-quality,.crv-tool-collect,.crv-tool-sheet,.crv-tool-reveal-sheet{display:none!important}.crv-launcher{bottom:40px}.crv-panel{bottom:100px}.crv-text p:first-child{margin-top:0}.crv-text p:last-child{margin-bottom:0}</style>${viewerHTML}`;
 let state={workId:data.works[0].id,routeMode:'incoming',outlineUnits:[]},view='library',cleanup,viewerCleanup;
 let opened=[],history=[],historyIndex=-1;
 let saved=readLocal('care-public-saved-v1',{bookmarks:[],favourites:[]});
 saved.bookmarks=(saved.bookmarks||[]).filter(row=>index.units.has(row.care_unit_id));saved.favourites=(saved.favourites||[]).filter(id=>index.nodes.has(id));
 const bookStates=new Map();
 let readingMenu=null;
 const books=data.works.map(work=>({id:work.id,title:work.title,author:work.author,year:work.year,cover_url:work.cover_url,publication_year:Number.parseInt(work.year),content_kind:'book',has_source:true,has_care:true,layers:[...new Set(work.units.map(unit=>unit.layer))],cloth:work.slug==='kant'?'#303b4c':work.slug==='bergson'?'#50403c':'#3b4531',foil:'#cf9b61',language_code:work.language_code||'en',language_name:work.language_name||'English'}));
 const fields=publicFields(data,adapter);
 const fieldFor=id=>fields.find(field=>field.id===id&&(field.bundle||field.bundle_url));
 const lateralBooks=data.works.filter(work=>adapter.savedConnection.members.some(member=>member.id===work.id));
 function urlFor(node,{route=false}={}){const p=new URLSearchParams();if(!node.work)p.set('lateral',data.lateral.id);else p.set('book',node.work.slug);if(route)p.set('ref',node.id);else if(node.kind==='passage')p.set('source',node.unit.id);else if(node.work)p.set('unit',node.unit.id);return '#'+p;}
 const baseReferences=[...index.nodes.values()].filter(n=>['claim','passage'].includes(n.kind)).map(node=>{
  const row=adapter.card(node.id),citation=[node.work?.author,node.work?.title||data.lateral.title,node.id].filter(Boolean).join(', ')+'.';
  const alignmentNote=node.grounding?.type==='Unresolved'?'Source alignment unresolved':node.passages?.some(p=>p.review==='unreviewed')?'AI source links · awaiting review':'';
  return {...row,scope:'',metadata:[row.author,row.work_title,row.chapter_title,alignmentNote].filter(Boolean),citation,citation_short:citation,citation_ibid:`Ibid., ${node.id}.`,
   destination:urlFor(node,{route:true}),sheet_destination:urlFor(node),studio_route:{work:node.work?.id||data.works[0].id},open_label:'Open Routes',favourite:saved.favourites.includes(node.id)};
 });
 const references=baseReferences.flatMap(row=>[row,{...row,scope:`public:${row.unit_id}`},...(row.work_id?[{...row,scope:`work:${row.work_id}`}]:[])]);
 function currentKey(){return state.connectionId||state.workId;}
 function tabs(){
  opened=reconcileReadings(opened,currentKey(),view==='workspace');
  const el=$('#open-books');el.hidden=!opened.length;
  el.innerHTML=`<span class="open-label">${opened.some(key=>key===data.lateral.id||fieldFor(key))?'OPEN READINGS':'OPEN BOOKS'}</span>`+opened.map(key=>{
   const w=adapter.workFor(key),kind=w?(w.content_kind||'work'):(fieldFor(key)?.field||'lateral'),style=READING_STYLES[kind]||READING_STYLES.work,title=w?.title||fieldFor(key)?.title||data.lateral.title,href=w?'#book='+w.slug:fieldFor(key)?'#field='+encodeURIComponent(key):'#lateral='+data.lateral.id,active=view==='workspace'&&currentKey()===key;
   return `<span class="open-tab ${active?'active':''}" data-kind="${esc(kind)}" style="--workspace-accent:${style.color}"><a href="${href}"${active?' aria-current="page"':''} title="${esc(style.label+' · '+title)}">${style.icon?`<svg class="reading-kind" viewBox="0 0 24 24" aria-hidden="true">${style.icon}</svg>`:''}<span>${esc(title)}</span></a>${!w?`<button data-reading-menu="${esc(key)}" aria-label="Options for ${esc(title)}" aria-haspopup="menu" aria-expanded="false">⌄</button>`:''}<button data-close-book="${esc(key)}" aria-label="Close ${esc(title)}">×</button></span>`;
  }).join('');
  document.querySelectorAll('.app-header [data-page]').forEach(el=>el.classList.toggle('active',(view==='library'&&el.dataset.page==='library')||(view==='laterals'&&el.dataset.page==='laterals')||(view==='corpuses'&&el.dataset.page==='corpuses')));
 }
 function saveState(){if(view==='workspace')bookStates.set(currentKey(),{...state});}
 function closeReadingMenu(restore=false){if(!readingMenu)return;const {anchor,element}=readingMenu;readingMenu=null;anchor.setAttribute('aria-expanded','false');element.remove();if(restore&&anchor.isConnected)anchor.focus({preventScroll:true});}
 function showReading(key){
  if(!key){view='library';window.history.replaceState(null,'',location.pathname);paint();return;}
  const work=adapter.workFor(key);
  if(work)state=standaloneBookState(work.id,bookStates.get(work.id));
  else if(fieldFor(key))state={workId:data.works[0].id,...bookStates.get(key),connectionId:key};
  else state={workId:data.works[0].id,...bookStates.get(data.lateral.id),connectionId:data.lateral.id};
  view='workspace';syncURL();paint();
 }
 function closeTab(key){
  closeReadingMenu();saveState();
  const active=view==='workspace'?currentKey():'',fallback=key===data.lateral.id?state.workId:'';
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
 function syncURL(){const w=adapter.workFor(state.workId);const p=new URLSearchParams();if(state.connectionId)p.set(fieldFor(state.connectionId)?'field':'lateral',state.connectionId);else p.set('book',w.slug);if(state.connectionReferenceId||state.referenceId)p.set('ref',state.connectionReferenceId||state.referenceId);else if(state.unitId)p.set('unit',state.unitId);else if(state.rawUnitId)p.set('source',state.rawUnitId);window.history.replaceState(null,'','#'+p);}
 function paintViewer(){
  const id=state.selectedAxiom?.passage_id||state.selectedAxiom?.axiom_id||state.connectionSelection?.reference_id||state.referenceId||state.connectionReferenceId||'';
  const node=index.nodes.get(id),projected=new Map();
  const readingReferences=references.map(row=>{
   if(!projected.has(row.id))projected.set(row.id,adapter.card(row.id,{state}));
   const reading=projected.get(row.id),languageNote=reading.is_translation?`${reading.reading_language_name} · saved machine translation`:'';
   return {...row,...reading,metadata:[reading.author,reading.work_title,reading.chapter_title,...row.metadata.slice(3),languageNote].filter(Boolean),favourite:saved.favourites.includes(row.id)};
  });
  viewerHost.hidden=view!=='workspace';
  viewerCleanup=mountViewer({parentElement:viewerShadow,data:{studio_mode:true,references:readingReferences,default_id:id,default_kind:node?.kind==='passage'?'passage':'axiom',follow_default:true},setTriggerValue:(kind,value)=>{
   if(kind!=='action')return;const n=index.nodes.get(value.id);if(!n)return;
   if(value.type==='studio_open_reference')openNode(n,true);
   else if(value.type==='studio_open_sheet')openNode(n,false);
   else if(value.type==='favourite'){toggleFavourite(n.id,value.active);}
  }});
 }
 function paint(){
  closeReadingMenu();
  tabs();state.bookmarks=saved.bookmarks;state.favouriteAxiomIds=saved.favourites;
  state.routeHistory={can_back:historyIndex>0,can_forward:historyIndex<history.length-1};
  const activeField=view==='workspace'&&fieldFor(state.connectionId);
  shadow.querySelector('[data-study-desk]').hidden=Boolean(activeField);shadow.querySelector('[data-field-desk]').hidden=!activeField;
  if(activeField){state.fieldSaved=readLocal('care-public-field-saved:'+activeField.id,{saved_panes:[],saved_axioms:[]});cleanup?.();cleanup=mountField({parentElement:shadow,data:fieldPayload(activeField,adapter,state),setStateValue:()=>{},setTriggerValue:(kind,value)=>{if(kind==='action')dispatchField(activeField,value);}});paintFieldViewer(activeField);saveState();return;}
  const payload=view==='workspace'?adapter.workspace(state):{mode:'library',books,fields,library_scope:view==='laterals'?'lateral':view==='corpuses'?'corpus':'',shelf_request:view,workspace_managed:true};
  cleanup?.();cleanup=mountReader({parentElement:shadow,data:payload,setStateValue:(kind,value)=>{state=adapter.reduce(state,kind,value);},setTriggerValue:dispatch});
  const closeComparison=shadow.querySelector('[data-connection-close]');
  if(closeComparison){closeComparison.textContent='Close comparison ⌄';closeComparison.setAttribute('aria-label','Close comparison options');closeComparison.setAttribute('aria-haspopup','menu');closeComparison.setAttribute('aria-expanded','false');}
  paintViewer();saveState();
 }
 function showBookInfo(work){
  let dialog=$('#book-info-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='book-info-dialog';dialog.setAttribute('aria-labelledby','book-info-title');document.body.append(dialog);}
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="book-info-title">${esc(work.title)}</h2><button aria-label="Close book info">×</button></div><dl>${[['Author',work.author],['Year',work.year],['Edition',work.edition],['Version',work.version_label]].filter(([,value])=>value).map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>${work.description?`<p>${esc(work.description)}</p>`:''}<p>${work.sources.length} source chapters · ${work.units.length} CARE readings</p>`;
  dialog.querySelector('button').onclick=()=>dialog.close();dialog.showModal();
 }
 function paintFieldViewer(field){
  const references=Object.values(field.references||{}).map(reference=>({...reference,scope:reference.source_pane||'',kind:'axiom',resolved:true,reading_html:reference.reading_html||esc(reference.text||'')}));
  viewerHost.hidden=false;viewerCleanup?.();viewerCleanup=mountViewer({parentElement:viewerShadow,data:{studio_mode:true,references,default_id:state.fieldSelected?.id||state.fieldReference?.id||'',default_kind:'axiom',default_scope:state.fieldSelected?.source_pane||state.fieldReference?.source_pane||'',follow_default:true},setTriggerValue:(kind,value)=>{if(kind!=='action')return;const reference=fieldReference(field,value.scope||state.fieldSelected?.source_pane||'',value.id);if(reference&&['studio_open_reference','studio_open_sheet'].includes(value.type)){state.fieldReference=reference;paint();}}});
 }
 function dispatchField(field,action){
  if(action.type==='selected_axiom'){state.fieldSelected={id:action.value?.axiom_id||action.value?.passage_id,source_pane:action.source_pane};paintFieldViewer(field);return;}
  if(['bookmark_action','axiom_favourite_action'].includes(action.type)){
   if(action.action==='open'){state.fieldReference=null;state.fieldSavedFocus={...action,unit_id:action.care_unit_id};paint();return;}
   const collection=action.type==='bookmark_action'?'saved_panes':'saved_axioms',key=collection==='saved_panes'?'care_unit_id':'care_item_id';
   const values=state.fieldSaved||{saved_panes:[],saved_axioms:[]};values[collection]=values[collection].filter(row=>row[key]!==action[key]||row.source_pane!==action.source_pane);
   if(action.active)values[collection].push({...action,field_id:field.id});saveLocal('care-public-field-saved:'+field.id,values);paint();return;
  }
  if(action.type==='library'){location.hash='view='+ (field.field==='corpus'?'corpuses':'laterals');return;}
  if(action.type==='clear_reference'){state.fieldReference=null;paint();return;}
  if(action.type==='open_reference'){
   const reference=fieldReference(field,action.source_pane,action.reference_id);
   if(reference){state.fieldReference=reference;paint();}else notice('This route is not included in the published reading.');return;
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
 function toggleFavourite(id,active){if(!index.nodes.has(id))return;saved.favourites=saved.favourites.filter(v=>v!==id);if(active)saved.favourites.push(id);saveLocal('care-public-saved-v1',saved);paint();notice(active?'Saved on this device.':'Removed from your saved readings.');}
 function dispatch(kind,value){
  try{
   if(kind==='connection_action'&&value.action==='close'){openReadingMenu(data.lateral.id,shadow.querySelector('[data-connection-close]'));return;}
   if(kind==='open_work'){const w=adapter.workFor(value);if(w)location.hash='book='+w.slug;return;}
   if(kind==='open_field'){if(fieldFor(value))location.hash='field='+encodeURIComponent(value);else if(value===data.lateral.id)location.hash='lateral='+value;return;}
   if(kind==='book_action'){const w=adapter.workFor(value.work_id);if(value.action==='book_info'&&w)showBookInfo(w);return;}
   if(kind==='bookmark_action'){
    const unit=index.units.get(value.care_unit_id);if(!unit||unit.work?.id!==value.work_id)return;
    if(value.action==='open'){openNode(index.nodes.get(unit.id),false);return;}
    if(value.action==='toggle'){saved.bookmarks=saved.bookmarks.filter(r=>r.care_unit_id!==unit.id);if(value.active)saved.bookmarks.push({care_unit_id:unit.id,work_id:unit.work.id,title:unit.title,layer:unit.layer,saved_at:new Date().toISOString(),available:true});saveLocal('care-public-saved-v1',saved);paint();notice(value.active?'Pane bookmarked on this device.':'Bookmark removed.');}return;
   }
   if(kind==='axiom_favourite_action'){toggleFavourite(value.care_item_id,value.active);return;}
   if(kind==='navigate_route'){const target=historyIndex+Number(value);if(target<0||target>=history.length)return;historyIndex=target;state={...history[target]};syncURL();paint();return;}
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
 async function routeFromURL(){
  const request=++routeRequest;
  try{saveState();const p=new URLSearchParams(location.hash.slice(1));const field=fieldFor(p.get('field')),lateral=p.get('lateral'),work=adapter.workFor(p.get('book'));
   if(field){await loadPublicField(field);if(request!==routeRequest)return;state={workId:data.works[0].id,...bookStates.get(field.id),connectionId:field.id};view='workspace';if(!opened.includes(currentKey()))opened.push(currentKey());paint();return;}
   if(data.lateral.id&&(lateral===data.lateral.id||p.has('compare'))){state={workId:data.works[0].id,...bookStates.get(data.lateral.id),connectionId:data.lateral.id,connectionReferenceId:p.get('ref')||'',referenceId:''};view='workspace';}
   else if(work){state=standaloneBookState(work.id,bookStates.get(work.id));view='workspace';}
   else{view=['laterals','corpuses'].includes(p.get('view'))?p.get('view'):'library';paint();return;}
   if(p.has('unit')&&p.get('unit')!==data.lateral.id){state.unitId=p.get('unit');state.rawUnitId='';state.referenceId='';}
   if(p.has('source')){state.rawUnitId=p.get('source');state.unitId='';state.referenceId='';}
   if(p.has('ref')){if(state.connectionId)state.connectionReferenceId=p.get('ref');else state.referenceId=p.get('ref');remember();}
   if(!opened.includes(currentKey()))opened.push(currentKey());paint();
  }catch(error){console.error(error);notice(error.message);view='library';paint();}
 }
 $('#open-books').addEventListener('click',event=>{const menu=event.target.closest('[data-reading-menu]'),close=event.target.closest('[data-close-book]');if(menu)openReadingMenu(menu.dataset.readingMenu,menu);else if(close)closeTab(close.dataset.closeBook);});
 document.addEventListener('pointerdown',event=>{if(readingMenu&&!event.composedPath().includes(readingMenu.element)&&!event.composedPath().includes(readingMenu.anchor))closeReadingMenu();},true);
 addEventListener('resize',()=>closeReadingMenu());
 document.querySelector('[data-page=library]').addEventListener('click',event=>{event.preventDefault();if(location.hash)location.hash='';else{view='library';paint();}});
 document.querySelector('[data-page=search]').onclick=()=>{$('#search-dialog').showModal();$('#search-query').focus();};
 document.querySelector('[data-page=saved]').onclick=()=>{const nodes=[...saved.bookmarks.map(row=>index.nodes.get(row.care_unit_id)),...saved.favourites.map(id=>index.nodes.get(id))].filter(Boolean);$('#saved-results').innerHTML=nodes.length?nodes.map(n=>resultLink(n)).join(''):'<p>No saved readings yet. Use the bookmark controls while reading.</p>';$('#saved-dialog').showModal();};
 function resultLink(n){const prose=n.kind==='claim'?adapter.card(n.id).reading_text:n.text;return `<a class="result" href="${urlFor(n,{route:n.kind==='claim'||n.kind==='passage'})}"><small>${esc(n.work?.title||data.lateral.title)} · ${esc(n.unit.layer)} · ${esc(n.id)}</small><strong>${esc(n.section||n.title||n.unit.title)}</strong>${prose?`<p>${esc(prose.slice(0,250))}${prose.length>250?'…':''}</p>`:''}</a>`;}
 $('#search-query').oninput=()=>{const q=$('#search-query').value.trim(),nodes=searchLibrary(index,q,60);$('#search-status').textContent=q?(nodes.length?`${nodes.length===60?'First ':''}${nodes.length} matching passages and claims`:'No matches. Try a shorter phrase.'):'Search all three source texts and their saved readings.';$('#search-results').innerHTML=nodes.map(resultLink).join('');};
 document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target.closest('.result'))dialog.close();if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
 addEventListener('hashchange',routeFromURL);routeFromURL();
}
start().catch(error=>{$('#reader').textContent=error.message;$('#reader').classList.add('loading');});
