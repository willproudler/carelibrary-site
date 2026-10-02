import mountReader from './native/study-desk.mjs?v=1.68';
import mountViewer from './native/reference-viewer.mjs';
import {createPublicReaderAdapter} from './public-reader-adapter.mjs';
import {searchLibrary} from './library-core.mjs';
import {reconcileReadings,closeReading,standaloneBookState,READING_STYLES} from './reading-workspace.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readLocal = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key)) || fallback;}catch{return fallback;}};
const saveLocal = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{notice('Your browser could not save this bookmark.');}};
let noticeTimer;
function notice(message){const el=$('#notice');el.textContent=message;el.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,4300);}

async function start(){
 const response=await fetch('./data/library.json');if(!response.ok)throw Error('CARE Library Beta could not load. Please refresh to try again.');
 const data=await response.json(),adapter=createPublicReaderAdapter(data),{index}=adapter;
 const [css,scope,viewerCSS,viewerHTML]=await Promise.all(['./native/study-desk.css?v=1.68','./native/public-scope.css','./native/reference-viewer.css','./native/reference-viewer.html'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('A reading component could not load. Please refresh.');return r.text();}));
 const host=$('#reader');host.replaceChildren();const shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style>${css}\n${scope}</style><div class="study-desk" data-study-desk tabindex="0" style="height:100%;min-height:0"></div>`;
 // CARE's viewer deliberately uses the document surface (isolate_styles=False).
 const viewerHost=document.createElement('div');document.body.append(viewerHost);const viewerShadow=viewerHost;
 viewerShadow.innerHTML=`<style>.care-reference-component{--st-text-color:#ece8df;--st-background-color:#0e1117;--st-secondary-background-color:#171c23;--st-font:system-ui,sans-serif;--st-code-font:ui-monospace,monospace}${viewerCSS}\n.crv-tool-rate,.crv-tool-quality,.crv-tool-collect,.crv-tool-sheet,.crv-tool-reveal-sheet{display:none!important}.crv-launcher{bottom:40px}.crv-panel{bottom:100px}.crv-text p:first-child{margin-top:0}.crv-text p:last-child{margin-bottom:0}</style>${viewerHTML}`;
 let state={workId:data.works[0].id,routeMode:'incoming',outlineUnits:[]},view='library',cleanup,viewerCleanup;
 let opened=[],history=[],historyIndex=-1;
 let saved=readLocal('care-public-saved-v1',{bookmarks:[],favourites:[]});
 saved.bookmarks=(saved.bookmarks||[]).filter(row=>index.units.has(row.care_unit_id));saved.favourites=(saved.favourites||[]).filter(id=>index.nodes.has(id));
 const bookStates=new Map();
 let readingMenu=null;
 const books=data.works.map(work=>({id:work.id,title:work.title,author:work.author,year:work.year,publication_year:Number.parseInt(work.year),content_kind:'book',has_source:true,has_care:true,layers:['WB','MC','CL','CH'],cloth:work.slug==='kant'?'#303b4c':'#3b4531',foil:'#cf9b61',language_code:'en',language_name:'English'}));
 const fields=[adapter.savedConnection];
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
  el.innerHTML=`<span class="open-label">${opened.includes(data.lateral.id)?'OPEN READINGS':'OPEN BOOKS'}</span>`+opened.map(key=>{
   const w=adapter.workFor(key),kind=w?(w.content_kind||'work'):'lateral',style=READING_STYLES[kind]||READING_STYLES.work,title=w?.title||data.lateral.title,href=w?'#book='+w.slug:'#lateral='+data.lateral.id,active=view==='workspace'&&currentKey()===key;
   return `<span class="open-tab ${active?'active':''}" data-kind="${esc(kind)}" style="--workspace-accent:${style.color}"><a href="${href}"${active?' aria-current="page"':''} title="${esc(style.label+' · '+title)}">${style.icon?`<svg class="reading-kind" viewBox="0 0 24 24" aria-hidden="true">${style.icon}</svg>`:''}<span>${esc(title)}</span></a><button data-reading-menu="${esc(key)}" aria-label="Options for ${esc(title)}" aria-haspopup="menu" aria-expanded="false">⌄</button><button data-close-book="${esc(key)}" aria-label="Close ${esc(title)}">×</button></span>`;
  }).join('');
  document.querySelectorAll('.app-header [data-page]').forEach(el=>el.classList.toggle('active',(view==='library'&&el.dataset.page==='library')||(view==='laterals'&&el.dataset.page==='laterals')));
 }
 function saveState(){if(view==='workspace')bookStates.set(currentKey(),{...state});}
 function closeReadingMenu(restore=false){if(!readingMenu)return;const {anchor,element}=readingMenu;readingMenu=null;anchor.setAttribute('aria-expanded','false');element.remove();if(restore&&anchor.isConnected)anchor.focus({preventScroll:true});}
 function showReading(key){
  if(!key){view='library';window.history.replaceState(null,'',location.pathname);paint();return;}
  const work=adapter.workFor(key);
  if(work)state=standaloneBookState(work.id,bookStates.get(work.id));
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
  if(!work)element.innerHTML+=data.works.map(keep=>{const close=data.works.find(other=>other.id!==keep.id);return `<button role="menuitem" data-keep-book="${esc(keep.id)}"><strong>Close ${esc(close.title)}</strong><small>Keep ${esc(keep.title)} open</small></button>`;}).join('');
  document.body.append(element);readingMenu={anchor,element};anchor.setAttribute('aria-expanded','true');
  const rect=anchor.getBoundingClientRect(),width=Math.min(330,innerWidth-16);Object.assign(element.style,{width:width+'px',left:Math.max(8,Math.min(innerWidth-width-8,rect.left))+'px',top:Math.min(rect.bottom+6,innerHeight-element.offsetHeight-8)+'px'});
  element.onclick=event=>{const keep=event.target.closest('[data-keep-book]'),close=event.target.closest('[data-close-book]');if(keep)keepBook(keep.dataset.keepBook);else if(close)closeTab(close.dataset.closeBook);};
  element.onkeydown=event=>{const choices=[...element.querySelectorAll('button')],at=choices.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();closeReadingMenu(true);}else if(event.key==='Tab')closeReadingMenu(true);else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();choices[event.key==='Home'?0:event.key==='End'?choices.length-1:(at+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length].focus();}};
  element.querySelector('button').focus();
 }
 function remember(){const id=state.connectionReferenceId||state.referenceId;if(!id)return;const entry={...state,outlineUnits:[]};const last=history[historyIndex];if(last?.referenceId===entry.referenceId&&last?.connectionReferenceId===entry.connectionReferenceId&&last?.routeMode===entry.routeMode)return;history=history.slice(0,historyIndex+1);history.push(entry);historyIndex=history.length-1;}
 function syncURL(){const w=adapter.workFor(state.workId);const p=new URLSearchParams();if(state.connectionId)p.set('lateral',state.connectionId);else p.set('book',w.slug);if(state.connectionReferenceId||state.referenceId)p.set('ref',state.connectionReferenceId||state.referenceId);else if(state.unitId)p.set('unit',state.unitId);else if(state.rawUnitId)p.set('source',state.rawUnitId);window.history.replaceState(null,'','#'+p);}
 function paintViewer(){
  const id=state.selectedAxiom?.passage_id||state.selectedAxiom?.axiom_id||state.connectionSelection?.reference_id||state.referenceId||state.connectionReferenceId||'';
  const node=index.nodes.get(id);for(const r of references)r.favourite=saved.favourites.includes(r.id);
  viewerHost.hidden=view!=='workspace';
  viewerCleanup=mountViewer({parentElement:viewerShadow,data:{studio_mode:true,references,default_id:id,default_kind:node?.kind==='passage'?'passage':'axiom',follow_default:true},setTriggerValue:(kind,value)=>{
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
  const payload=view==='workspace'?adapter.workspace(state):{mode:'library',books,fields,library_scope:view==='laterals'?'lateral':'',shelf_request:view,workspace_managed:true};
  cleanup?.();cleanup=mountReader({parentElement:shadow,data:payload,setStateValue:(kind,value)=>{state=adapter.reduce(state,kind,value);},setTriggerValue:dispatch});
  const closeComparison=shadow.querySelector('[data-connection-close]');
  if(closeComparison){closeComparison.textContent='Close comparison ⌄';closeComparison.setAttribute('aria-label','Close comparison options');closeComparison.setAttribute('aria-haspopup','menu');closeComparison.setAttribute('aria-expanded','false');}
  paintViewer();saveState();
 }
 function toggleFavourite(id,active){if(!index.nodes.has(id))return;saved.favourites=saved.favourites.filter(v=>v!==id);if(active)saved.favourites.push(id);saveLocal('care-public-saved-v1',saved);paint();notice(active?'Saved on this device.':'Removed from your saved readings.');}
 function dispatch(kind,value){
  try{
   if(kind==='connection_action'&&value.action==='close'){openReadingMenu(data.lateral.id,shadow.querySelector('[data-connection-close]'));return;}
   if(kind==='open_work'){const w=adapter.workFor(value);if(w)location.hash='book='+w.slug;return;}
   if(kind==='open_field'){if(value===data.lateral.id)location.hash='lateral='+value;return;}
   if(kind==='book_action'){const w=adapter.workFor(value.work_id);if(value.action==='book_info'&&w)notice(`${w.author} · ${w.edition} · ${w.sources.length} reading sections`);return;}
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
 function routeFromURL(){
  try{saveState();const p=new URLSearchParams(location.hash.slice(1));const lateral=p.get('lateral'),work=adapter.workFor(p.get('book'));
   if(lateral===data.lateral.id||p.has('compare')){state={workId:data.works[0].id,...bookStates.get(data.lateral.id),connectionId:data.lateral.id,connectionReferenceId:p.get('ref')||'',referenceId:''};view='workspace';}
   else if(work){state=standaloneBookState(work.id,bookStates.get(work.id));view='workspace';}
   else{view=p.get('view')==='laterals'?'laterals':'library';paint();return;}
   if(p.has('unit')&&p.get('unit')!==data.lateral.id){state.unitId=p.get('unit');state.rawUnitId='';state.referenceId='';}
   if(p.has('source')){state.rawUnitId=p.get('source');state.unitId='';state.referenceId='';}
   if(p.has('ref')){if(state.connectionId)state.connectionReferenceId=p.get('ref');else state.referenceId=p.get('ref');remember();}
   if(!opened.includes(currentKey()))opened.push(currentKey());paint();
  }catch(error){notice(error.message);view='library';paint();}
 }
 $('#open-books').addEventListener('click',event=>{const menu=event.target.closest('[data-reading-menu]'),close=event.target.closest('[data-close-book]');if(menu)openReadingMenu(menu.dataset.readingMenu,menu);else if(close)closeTab(close.dataset.closeBook);});
 document.addEventListener('pointerdown',event=>{if(readingMenu&&!event.composedPath().includes(readingMenu.element)&&!event.composedPath().includes(readingMenu.anchor))closeReadingMenu();},true);
 addEventListener('resize',()=>closeReadingMenu());
 document.querySelector('[data-page=library]').addEventListener('click',event=>{event.preventDefault();if(location.hash)location.hash='';else{view='library';paint();}});
 document.querySelector('[data-page=search]').onclick=()=>{$('#search-dialog').showModal();$('#search-query').focus();};
 document.querySelector('[data-page=saved]').onclick=()=>{const nodes=[...saved.bookmarks.map(row=>index.nodes.get(row.care_unit_id)),...saved.favourites.map(id=>index.nodes.get(id))].filter(Boolean);$('#saved-results').innerHTML=nodes.length?nodes.map(n=>resultLink(n)).join(''):'<p>No saved readings yet. Use the bookmark controls while reading.</p>';$('#saved-dialog').showModal();};
 function resultLink(n){return `<a class="result" href="${urlFor(n,{route:n.kind==='claim'||n.kind==='passage'})}"><small>${esc(n.work?.title||data.lateral.title)} · ${esc(n.unit.layer)} · ${esc(n.id)}</small><strong>${esc(n.section||n.title||n.unit.title)}</strong>${n.text?`<p>${esc(n.text.slice(0,250))}${n.text.length>250?'…':''}</p>`:''}</a>`;}
 $('#search-query').oninput=()=>{const q=$('#search-query').value.trim(),nodes=searchLibrary(index,q,60);$('#search-status').textContent=q?(nodes.length?`${nodes.length===60?'First ':''}${nodes.length} matching passages and claims`:'No matches. Try a shorter phrase.'):'Search both source texts and their saved readings.';$('#search-results').innerHTML=nodes.map(resultLink).join('');};
 document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target.closest('.result'))dialog.close();if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
 addEventListener('hashchange',routeFromURL);routeFromURL();
}
start().catch(error=>{$('#reader').textContent=error.message;$('#reader').classList.add('loading');});
