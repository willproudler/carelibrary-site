import {loadLibrary} from './library-loader.mjs?v=20261018';
import {readingStorageKey} from './auth.mjs';
import {loadText} from './resource-loader.mjs?v=20261018';
import mountSavedLibrary, {SAVED_READING_ID,SAVED_READING_STYLE,normalizeSavedState,normalizeFieldSavedState,collectSavedItems,removeSavedItem,savedItemTarget,withSavedFavourite,withSavedBookmark,fieldSavedRecord,bookBookmarkRecord} from './saved-library.mjs?v=560d2f1181d73174';
import {publicFields,fieldPayload,fieldMemberFor,fieldMemberCard,fieldReferenceState,loadPublicField,loadFieldMembers,fieldViewerReferences} from './public-fields.mjs?v=560d2f1181d73174';
import mountReader from './native/study-desk.mjs?v=560d2f1181d73174';

import {createPublicReaderAdapter} from './public-reader-adapter.mjs?v=560d2f1181d73174';
import {librarySortMetadata,createLibrarySort} from './library-sort.mjs?v=560d2f1181d73174';
import {reconcileReadings,closeReading,standaloneBookState,READING_STYLES} from './reading-workspace.mjs';
import {createTabMenus,createWorkspaceHistory,createBookAddressing,manuscriptHash,updateLibraryMenu,installFixedWorkbenchPreferences,NUMOGRAM_READING_STYLE,numogramDemonTarget,readSearchPageRoute,searchPageRouteParams,bookRouteUnitState,createSearchPageReady} from './web-workspace.mjs?v=20261111-fixed-workbench';
import {copyStudioLibraryReference,copyStudioSource,createStudioWorkspace} from './studio-workspace.mjs';
import {bindWorkspaceBackHistory} from './native/workspace-history-menu.mjs';
import {createNumoCompanion} from './native/numogram-companion.mjs';
import mountDocumentPicker,{pickerMarkup} from './native/writing-studio-picker.mjs';
import {mountStudySets} from './study-sets.mjs';
import {mountBetaSpotlight} from './native/beta-spotlight.mjs';
import {mountNumogramHeaderSearch} from './native/numogram-header-search.mjs';
import {openFeaturePreview} from './native/feature-previews.mjs';

installFixedWorkbenchPreferences(window,document);

const $ = selector => document.querySelector(selector);
const loadNumogram=()=>import('./native/numogram-atlas.mjs?v=560d2f1181d73174');
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Public mode uses the original browser collection; accounts have separate saves.
const storageKey = key => readingStorageKey(key,document.documentElement.dataset);
const readLocal = (key,fallback) => {try{return JSON.parse(localStorage.getItem(storageKey(key))) || fallback;}catch{return fallback;}};
const saveLocal = (key,value) => {try{localStorage.setItem(storageKey(key),JSON.stringify(value));return true;}catch{notice('Your browser could not save this change. Please allow browser storage and try again.');return false;}};
let noticeTimer;
function notice(message){const el=$('#notice');el.textContent=message;el.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,4300);}

async function start(){
 const initialSearchRoute=readSearchPageRoute(document);
 const initialPathname=location.pathname,initialTitle=document.title,initialCanonical=document.querySelector('link[rel="canonical"]')?.href;
 const bookAddressing=createBookAddressing(document);
 const searchPageReady=createSearchPageReady(document,window);
 const companionRequest=new URLSearchParams(location.search);
 const companionId=companionRequest.get('care_studio_request');
 const embedded=window.parent!==window&&companionRequest.get('care_studio_embed')==='1'&&/^[a-zA-Z0-9_-]{8,80}$/.test(companionId||'');
 const libraryCompanion=embedded&&companionRequest.get('care_studio_pane_reading')==='1';
 const readingSplitCompanion=libraryCompanion&&companionRequest.get('care_tab_split')==='1';
 const documentSplitCompanion=embedded&&companionRequest.get('care_studio_split_document')==='1';
 const citationCompanion=embedded&&!readingSplitCompanion&&!documentSplitCompanion;
 const addressKey=()=>location.pathname+location.search+location.hash;
 let routedAddress='',paintedAddress='';
 function currentSearchRoute(){return location.pathname===initialPathname&&initialSearchRoute?initialSearchRoute:bookAddressing.route(location.pathname);}
 function readingAddress(destination){return bookAddressing.href(destination,{pathname:location.pathname,search:location.search,embedded});}
 function replaceWorkspaceAddress(destination){workspaceHistory.replace(destination);routedAddress=addressKey();}
 const copyStudioPacket=(packet,tryNative)=>copyStudioSource(window,packet,tryNative);
 const splitDraftId=documentSplitCompanion?companionRequest.get('care_studio_split_draft')||'':'';
 const libraryMenu=$('#workbench-library-menu'),libraryMenuTrigger=libraryMenu.querySelector('summary');
 if(documentSplitCompanion)document.documentElement.setAttribute('data-document-split-companion','');
 if(libraryCompanion){
  document.documentElement.setAttribute('data-library-companion','');
  const shelf=document.createElement('a');
  shelf.className='brand companion-library-home';
  shelf.href='/library.html';
  shelf.setAttribute('aria-label','Back to the Library shelf');
  shelf.title='Back to the Library shelf';
  shelf.append(...[...libraryMenuTrigger.querySelectorAll('.brand-mark,.mobile-care-mark,.mobile-library-label')].map(mark=>mark.cloneNode(true)));
  libraryMenu.hidden=true;
  libraryMenu.after(shelf);
 }
 const [loader,css,scope]=await Promise.all([loadLibrary(),loadText('./native/study-desk.css?v=560d2f1181d73174'),loadText('./native/public-scope.css?v=560d2f1181d73174')]);
 const data=loader.data;let adapter=createPublicReaderAdapter(data),index=adapter.index;
 let indexedWorks=[...data.works],indexedLateral=data.lateral;
 function refreshAdapter(){
  if(indexedLateral===data.lateral&&indexedWorks.length===data.works.length&&indexedWorks.every((work,i)=>work===data.works[i]))return;
  adapter=createPublicReaderAdapter(data);index=adapter.index;indexedWorks=[...data.works];indexedLateral=data.lateral;
 }
 const host=$('#reader');host.replaceChildren();const shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style data-study-style>${css}</style><style>${scope}</style><div class="study-desk" data-study-desk data-skin="care" tabindex="0" style="height:100%;min-height:0"></div><div class="field-desk" data-field-desk hidden style="height:100%;min-height:0"></div>`;
 const studyStyle=shadow.querySelector('[data-study-style]');
 const savedHost=$('[data-saved-library]');
 const studioHost=$('#studio-workspace'),setsHost=$('#study-sets-view');
 const preparationHost=$('#preparation-view'),preparationStage=preparationHost.querySelector('.preparation-preview-stage');
 let preparationPreview;
 const numoHost=document.createElement('section');
 numoHost.hidden=true;
 numoHost.setAttribute('aria-label','CARE Numogram');
 numoHost.style.cssText='flex:1;min-width:0;min-height:0';
 studioHost.after(numoHost);
 const tabMenuHost=$('#reading-tab-menus');
 const syncTabMenus=createTabMenus(tabMenuHost,{
  compactAnchor:libraryMenuTrigger,beforeOpen:()=>{libraryMenu.open=false;},
 });
 const account=document.documentElement.dataset.careAccount||null;
 const localPreview=document.documentElement.dataset.careLocalPreview==='true';
 const localAddress=location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname);
 const guestDrafts=!account&&!localPreview&&!localAddress&&!libraryCompanion&&document.documentElement.dataset.carePublicMode==='true';
 let pageHistory={back:false,forward:false},numoHistory={back:false,forward:false},historyInNumo=false;
 function chamberStep(step){return historyInNumo&&numoHistory[step<0?'back':'forward'];}
 function paintHistoryButtons(){
  document.querySelectorAll('[data-history]').forEach(button=>{
   const step=Number(button.dataset.history),backwards=step<0,chamber=chamberStep(step);
   button.disabled=!chamber&&!pageHistory[backwards?'back':'forward'];
   const label=chamber?(backwards?'Previous chamber':'Next chamber'):(backwards?'Go back':'Go forward');
   button.setAttribute('aria-label',label);
   button.title=backwards?label+' · Hold for recent history':label;
  });
 }
 const workspaceHistory=createWorkspaceHistory(window.history,location,history=>{
  pageHistory=history;
  paintHistoryButtons();
 });
 document.addEventListener('care:numo-history',event=>{
  numoHistory=event.detail;
  if(historyInNumo)paintHistoryButtons();
 });
 const viewerHost=document.createElement('div');viewerHost.hidden=true;document.body.append(viewerHost);const viewerShadow=viewerHost;
 let mountViewer,mountField,viewerPromise,fieldPromise,fieldStyle;
 async function ensureViewer(){
  if(!viewerPromise)viewerPromise=Promise.all([import('./native/reference-viewer.mjs?v=560d2f1181d73174'),loadText('./native/reference-viewer.css?v=560d2f1181d73174'),loadText('./native/reference-viewer.html?v=560d2f1181d73174')]).then(([module,viewerCSS,viewerHTML])=>{
   mountViewer=module.default;
   viewerHost.innerHTML=`<style>.care-reference-component{--st-text-color:#ece8df;--st-background-color:#0e1117;--st-secondary-background-color:#171c23;--st-font:system-ui,sans-serif;--st-code-font:ui-monospace,monospace}${viewerCSS}\n.crv-tool-rate,.crv-tool-quality,.crv-tool-collect,.crv-tool-sheet,.crv-tool-reveal-sheet{display:none!important}.crv-text p:first-child{margin-top:0}.crv-text p:last-child{margin-bottom:0}</style>${viewerHTML}`;
  }).catch(error=>{viewerPromise=null;throw error;});
  return viewerPromise;
 }
 async function ensureField(){
  if(!fieldPromise)fieldPromise=Promise.all([import('./native/study-field.mjs?v=560d2f1181d73174'),loadText('./native/study-field.css?v=560d2f1181d73174')]).then(([module,fieldCSS])=>{
   mountField=module.default;fieldStyle=document.createElement('style');fieldStyle.media='not all';
   // Keep the bottom save control still when pointer entry reveals trace links.
   fieldStyle.textContent=fieldCSS+`\n.field-desk .field-item[data-open-item] .item-links{display:flex;visibility:hidden}.field-desk .field-item[data-open-item]:hover .item-links,.field-desk .field-item[data-open-item]:focus-within .item-links{visibility:visible}`;
   shadow.append(fieldStyle);
  }).catch(error=>{fieldPromise=null;throw error;});
  return fieldPromise;
 }
 let state={workId:(data.works[0]?.id||''),routeMode:'incoming',outlineUnits:[]},view='library',cleanup,savedCleanup,viewerCleanup,numoWorkspace;
 let numoHeader,pendingNumoAQ,pendingNumoReference;
 let opened=[],history=[],historyIndex=-1;
 const manuscriptTabs=new Map();
 let draftId='',lastDraftId='';
 const isManuscript=()=>view==='studio'||view==='reader';
 const draftKey=id=>'manuscript:'+id;
 function navigateDocument(mode,id='',{replace=false}={}){
  if(documentSplitCompanion&&id!==splitDraftId)return;
  const destination=manuscriptHash(mode,id);
  if(destination===location.hash)return;
  if(replace||documentSplitCompanion){
   if(isManuscript()&&!draftId&&id){
    const scratch=draftKey('');
    opened=opened.map(key=>key===scratch?draftKey(id):key);
    manuscriptTabs.delete(scratch);
   }
   workspaceHistory.replace(destination);
   routeFromURL();
  }
  else location.hash=destination;
 }
 const studio=createStudioWorkspace({
  host:studioHost,account,guestDrafts,preview:localPreview,navigate:navigateDocument,
  searchBooks:()=>data.works.map(work=>({work_id:work.id,title:work.title,author:work.author})),
  onSearch:query=>spotlight.open(query),
  onBesideChange(){if(view==='workspace')paint();},
  onChange({mode,draftId:id,title}){
   if(mode==='beside'&&view==='workspace'&&id){
    lastDraftId=id;
    const key=draftKey(id);
    manuscriptTabs.set(key,{id,title:title||'Untitled',mode:'studio'});
    if(!opened.includes(key))opened.push(key);
    tabs();
    return;
   }
   if(!isManuscript()||view!==mode)return;
   const previous=draftKey(draftId);
   if(id){
    draftId=id;
    lastDraftId=id;
    if(previous===draftKey(''))opened=opened.map(key=>key===previous?draftKey(id):key);
   }
   manuscriptTabs.set(draftKey(draftId),{id:draftId,title:title||'Untitled',mode});
   tabs();
  },
 });
 const numoCompanion=createNumoCompanion($('#numo-companion'),{
  loadNumogram,
  libraryBooks:data.works,
  draftLines:()=>studio.draftLines(),
  showAQMargins:calculate=>studio.showAQMargins(calculate),
  beforeOpen:()=>studio.minimizeLibrary(),
  openSource(href){
   const source=new URL(href,location.href);
   if(source.origin===location.origin&&source.pathname==='/library.html'&&studio.openLibrary(source.hash))numoCompanion.minimize();
  },
 });
 function openNumoCompanion(){
  if(!isManuscript())return false;
  numoCompanion.setVisible(true,view+':'+draftId);
  numoCompanion.open();
  return true;
 }
 document.addEventListener('care:numogram-companion-open',openNumoCompanion);
 document.addEventListener('care:library-companion-open',()=>numoCompanion.minimize());
 document.addEventListener('care:library-companion-visibility',event=>numoCompanion.setLibraryOpen(event.detail.open===true));
 document.addEventListener('care:librarian-visibility',event=>numoCompanion.setLibrarianOpen(event.detail.open===true));
 const pickerRoot=$('[data-studio-picker]');
 pickerRoot.insertAdjacentHTML('beforeend',pickerMarkup);
 let pickerCleanup,pickerController,pickerSignature;
 function refreshDocumentPicker(loadFailed=false){
  const draft=studio.activeDraftId;
  const data={...studio.pickerData(),active:view==='studio',reader_active:view==='reader',
   can_review:view==='studio'&&Boolean(draft),reader_draft:view==='reader'?draft:''};
  if(loadFailed&&!data.drafts.length&&!data.actions_unavailable)data.status='Drafts could not load. Reopen this menu to try again.';
  const signature=JSON.stringify(data);
  if(signature===pickerSignature)return;
  pickerSignature=signature;
  pickerCleanup?.();
  pickerCleanup=mountDocumentPicker({
   parentElement:pickerRoot.parentElement,
   data,
   setPickerController:controller=>{pickerController=controller;},
   onPickerOpen:()=>studio.loadDraftIndex().then(()=>refreshDocumentPicker(),()=>refreshDocumentPicker(true)),
   onPickerAction({type,target_id,folder_id}){
    switch(type){
     case 'new':studio.command('new',{folder_id});break;
     case 'open':navigateDocument('studio',target_id);break;
     case 'edit-reading':navigateDocument('studio',draft);break;
     case 'reader-open':navigateDocument('reader',target_id);break;
     case 'reader-current':studio.command('open-care-reader',{reader_choice:'current'});break;
     case 'reader-home':studio.command('import-reader');break;
    }
   },
  });
 }
 refreshDocumentPicker();
 window.addEventListener('care:account-ended',()=>{
  pickerController?.close();
  refreshDocumentPicker();
  $('[data-guest-draft-storage]').hidden=true;
 });
 let saved=normalizeSavedState(readLocal('care-public-saved-v1',{}));
 const bookStates=new Map();
 let appliedSavedSelection='';
 let readingMenu=null;
 let tabSplit=null;
 let splitChoice='';
 let pendingSplit=null;
 let pendingStudySetAction=null;
 const books=data.works.map(work=>({id:work.id,title:work.title,author:work.author,year:work.year,cover_url:work.cover_url,...librarySortMetadata(work),content_kind:'book',has_source:work.sources.length>0,has_care:work.units.length>0,layers:[...new Set(work.units.map(unit=>unit.layer))],cloth:work.slug==='kant'?'#303b4c':work.slug==='bergson'?'#50403c':'#3b4531',foil:'#cf9b61',language_code:work.language_code||'en',language_name:work.language_name||'English'}));
 const librarySort=createLibrarySort(shadow,books,{initialSort:'title'});let lastVisitedBook='';
 const fields=publicFields(data,adapter);
 const fieldFor=id=>fields.find(field=>field.id===id&&(field.bundle||field.bundle_url));
 const lateralBooks=data.works.filter(work=>adapter.savedConnection.members.some(member=>member.id===work.id));
 const tabStorageKey='care-web-open-readings-v1',numoTabId='room:numogram';
 if(!libraryCompanion&&!documentSplitCompanion)try{
  const stored=JSON.parse(sessionStorage.getItem(storageKey(tabStorageKey))||'[]');
  if(Array.isArray(stored))opened=stored.slice(-30).filter(key=>typeof key==='string'
    &&(key===SAVED_READING_ID||key===numoTabId||key===data.lateral.id||fieldFor(key)||adapter.workFor(key)));
 }catch{}
 const studySets=mountStudySets(setsHost,{onOpenBook(id){
  const work=adapter.workFor(id);
  if(work)openReadingRoute('#book='+encodeURIComponent(work.slug));
 }});
 studySets.update({accountKey:account,books});
 function urlFor(node,{route=false}={}){const p=new URLSearchParams();if(!node.work)p.set('lateral',data.lateral.id);else p.set('book',node.work.slug);if(route)p.set('ref',node.id);else if(node.kind==='passage')p.set('source',node.unit.id);else if(node.work)p.set('unit',node.unit.id);return readingAddress('#'+p);}
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
 const hasActiveTab=()=>view==='workspace'||view==='saved'||view==='numogram'||isManuscript();
 function currentKey(){return isManuscript()?draftKey(draftId):view==='saved'?SAVED_READING_ID:view==='numogram'?numoTabId:state.connectionId||state.workId;}
 function tabDetails(key){
  const document=manuscriptTabs.get(key),work=adapter.workFor(key),field=fieldFor(key),isSaved=key===SAVED_READING_ID,isNumo=key===numoTabId;
  const kind=document?document.mode:isSaved?'saved':isNumo?'numogram':work?(work.content_kind||'work'):(field?.field||'lateral');
  const style=document?{label:document.mode==='reader'?'Reader':'Studio',color:'#84bda6',icon:'<path d="M6 3h8l4 4v14H6zm8 0v5h4M9 12h6m-6 4h6"/>'}:isSaved?SAVED_READING_STYLE:(isNumo||kind==='numo')?NUMOGRAM_READING_STYLE:READING_STYLES[kind]||READING_STYLES.work;
  const title=document?.title||(isNumo?'Numogram':isSaved?'Saved library':work?.title||field?.title||data.lateral.title);
  const href=document?manuscriptHash(document.mode,document.id):isSaved?'#view=saved':isNumo?'#view=numogram':work?'#book='+encodeURIComponent(work.slug):field?'#field='+encodeURIComponent(key):'#lateral='+encodeURIComponent(data.lateral.id);
  return {document,work,field,isSaved,isNumo,kind,style,title,href};
 }
 const tabStrip=$('#reading-tabbar'),tabRail=$('#open-books'),tabScroll=$('#reading-tab-scroll'),splitWorkspace=$('#main');
 const openReadings=$('[data-open-readings]'),separateTabsButton=$('[data-separate-tabs]');
 const isShelf=()=>['library','laterals','corpuses'].includes(view);
 let libraryMenuView;
 const splitTools=document.createElement('div');
 splitTools.className='tab-split-tools';splitTools.hidden=true;
 splitTools.innerHTML='<span role="status" data-tab-split-hint>Choose another tab</span><button type="button">Cancel split</button>';
 tabScroll.after(splitTools);
 splitTools.querySelector('button').onclick=()=>cancelSplitChoice(true);
 new MutationObserver(()=>{
  if(tabSplit?.kind==='numo'&&$('#numo-companion').hidden)closeTabSplit(false);
 }).observe($('#numo-companion'),{attributeFilter:['hidden']});
 const writeBeside=$('[data-write-beside]');
 const roomTitles={laterals:'Laterals',corpuses:'Corpora',dialogues:'Dialogues',numogram:'Numogram',studio:'Studio',reader:'Studio',preparation:'Studio'};
 const shelfRooms={lateral:'laterals',corpus:'corpuses',dialogue:'dialogues'};
 function paintRoomChrome(){
  const room=view==='library'?shelfRooms[host.dataset.careShelfTheme]:
   view==='workspace'?shelfRooms[fieldFor(state.connectionId)?.field||(state.connectionId?'lateral':'')]:view;
  document.body.dataset.workbenchRoom=room||'';
  $('#workspace-name').textContent=roomTitles[room]||'Library';
 }
 new MutationObserver(paintRoomChrome).observe(host,{attributes:true,attributeFilter:['data-care-shelf-theme']});
 writeBeside.onclick=()=>{
  if(studio.besideOpen)studio.closeBeside();
  else void studio.showBeside(lastDraftId);
 };
 const [scrollLeftButton,scrollRightButton]=tabScroll.querySelectorAll('button');
 function updateTabScrollControls(){
  const limit=tabRail.scrollWidth-tabRail.clientWidth;
  const controlSpace=tabScroll.hidden?0:tabScroll.offsetWidth+(parseFloat(getComputedStyle(tabStrip).columnGap)||0);
  tabScroll.hidden=limit<=controlSpace+1;
  scrollLeftButton.disabled=tabRail.scrollLeft<=1;
  scrollRightButton.disabled=tabRail.scrollLeft>=tabRail.scrollWidth-tabRail.clientWidth-1;
 }
 tabRail.addEventListener('scroll',updateTabScrollControls,{passive:true});
 new ResizeObserver(updateTabScrollControls).observe(tabRail);
 document.fonts.ready.then(updateTabScrollControls);
 tabScroll.addEventListener('click',event=>{
  const button=event.target.closest('[data-tab-scroll]');
  if(!button||button.disabled)return;
  tabRail.scrollLeft+=Number(button.dataset.tabScroll)*Math.max(80,tabRail.clientWidth*.65);
  updateTabScrollControls();
 });
 function tabs(){
  numoCompanion.setVisible(isManuscript(),view+':'+draftId);
  const inTab=hasActiveTab(),keyNow=currentKey();
  opened=reconcileReadings(opened,keyNow,inTab);
  if(tabSplit&&(!inTab||tabSplit.primary!==keyNow||!opened.includes(tabSplit.key)||
    (tabSplit.kind==='write'&&!studio.besideOpen)||(tabSplit.kind!=='write'&&studio.besideOpen)))closeTabSplit();
  if(tabSplit){tabSplit.primaryHash=location.hash;tabSplit.primaryAddress=addressKey();}
  if(splitChoice&&!opened.includes(splitChoice))cancelSplitChoice();
  if(!libraryCompanion&&!documentSplitCompanion)try{sessionStorage.setItem(storageKey(tabStorageKey),JSON.stringify(opened.filter(key=>!manuscriptTabs.has(key)).slice(-30)));}catch{}
  tabStrip.hidden=libraryCompanion||documentSplitCompanion||!opened.length;
  openReadings.hidden=!opened.length;
  if(libraryMenuView!==view){
   libraryMenuView=view;
   libraryMenu.open=false;
   updateLibraryMenu(libraryMenu,view);
  }
  writeBeside.hidden=libraryCompanion||view!=='workspace'||!studio.canWriteBeside;
  writeBeside.setAttribute('aria-expanded',String(studio.besideOpen));
  writeBeside.textContent=studio.besideOpen?'Close Write beside':'Write beside';
  $('[data-guest-draft-storage]').hidden=!guestDrafts||!isManuscript();
  const currentPage=view==='workspace'?'library':view;
  document.body.dataset.workbenchView=currentPage;
  historyInNumo=view==='numogram';
  const historyTab=hasActiveTab()?tabDetails(currentKey()):null;
  workspaceHistory.remember({title:historyTab?.title||roomTitles[view]||'Library',
   kind:historyTab?.isNumo?'NUMO':historyTab?.style.label||(roomTitles[view]||'Library')});
  paintHistoryButtons();
  numoHeader?.setActive(historyInNumo);
  $('.workbench-search').hidden=view==='numogram';
  $('[data-numo-tools]').hidden=view!=='numogram';
  const markup=opened.map(key=>{
   const {document,work,isSaved,isNumo,kind,style,title,href}=tabDetails(key),active=inTab&&keyNow===key;
   return `<span class="open-tab ${active?'active':''}" data-tab-key="${esc(key)}" data-kind="${esc(kind)}" style="--workspace-accent:${style.color}"><a href="${esc(readingAddress(href))}" draggable="false" aria-keyshortcuts="Shift+F10"${active?' aria-current="page"':''} title="${esc(style.label+' · '+title)}">${style.icon?`<svg class="reading-kind" viewBox="0 0 24 24" aria-hidden="true">${style.icon}</svg>`:''}<span>${esc(title)}</span>${document?`<small data-tab-role>${style.label}</small>`:''}</a>${!work&&!document&&!isSaved&&!isNumo?`<button data-reading-menu="${esc(key)}" aria-label="Options for ${esc(title)}" aria-haspopup="menu" aria-expanded="false">⌄</button>`:''}<button data-close-book="${esc(key)}" aria-label="Close ${esc(title)}">×</button></span>`;
  }).join('');
  if(tabRail.dataset.tabMarkup!==markup){
   tabRail.innerHTML=markup;
   tabRail.dataset.tabMarkup=markup;
   updateTabScrollControls();
   const activeTab=tabRail.querySelector('.open-tab.active');
   if(activeTab){
    const rail=tabRail.getBoundingClientRect(),tab=activeTab.getBoundingClientRect();
    if(tab.left<rail.left)tabRail.scrollLeft+=tab.left-rail.left;
    else if(tab.right>rail.right)tabRail.scrollLeft+=tab.right-rail.right;
   }
  }
  document.body.toggleAttribute('data-workbench-shelf',isShelf());
  paintRoomChrome();
  $('#workbench-search-title').textContent=isManuscript()?(manuscriptTabs.get(keyNow)?.title||'Untitled'):view==='workspace'?tabDetails(keyNow).title||'Search':'Search';
  const openDraft=isManuscript()?draftId:lastDraftId;
  $('.beta-workbench [data-page=studio]').href=manuscriptHash('studio',openDraft);
  $('.beta-workbench [data-page=reader]').href=manuscriptHash('reader',openDraft);
  document.querySelectorAll('.app-header nav [data-page]').forEach(el=>{
   const active=el.dataset.page===currentPage;
   el.classList.toggle('active',active);
   if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
  });
  refreshDocumentPicker();
  paintSplitTools();
  if(pendingSplit?.primary===keyNow&&inTab){
   const pair=pendingSplit;
   pendingSplit=null;
   queueMicrotask(()=>{if(hasActiveTab()&&currentKey()===pair.primary)openTabSplit(pair.key);});
  }
 }
 function saveState(){if(view==='workspace')bookStates.set(currentKey(),{...state});}
 function closeReadingMenu(restore=false){if(!readingMenu)return;const {anchor,element}=readingMenu;readingMenu=null;if(anchor.hasAttribute('aria-expanded'))anchor.setAttribute('aria-expanded','false');element.remove();if(restore&&anchor.isConnected)anchor.focus({preventScroll:true});}
 function showReading(key,resumed=false){
  if(!resumed&&(isManuscript()||studio.besideOpen)&&studio.deferNavigation('reading:'+key,()=>showReading(key,true),()=>{}))return;
  ++routeRequest;setLoadStatus();
  const document=manuscriptTabs.get(key);
  if(document){navigateDocument(document.mode,document.id);return;}
  if(isManuscript())studio.hide();
  if(key===SAVED_READING_ID){if(location.hash==='#view=saved')routeFromURL();else location.hash='view=saved';return;}
  if(key===numoTabId){location.hash='view=numogram';return;}
  if(!key){openReadingRoute(embedded?'#view=library':'/library.html');return;}
  const work=adapter.workFor(key);
  if(work)state=standaloneBookState(work.id,bookStates.get(work.id));
  else if(fieldFor(key))state={workId:(data.works[0]?.id||''),...bookStates.get(key),connectionId:key};
  else state={workId:(data.works[0]?.id||''),...bookStates.get(data.lateral.id),connectionId:data.lateral.id};
  view='workspace';syncURL();paint();
 }
 function closeTab(key,resumed=false,splitResumed=false){
  if(!splitResumed&&[tabSplit?.key,tabSplit?.primary].includes(key)&&guardTabSplit(()=>closeTab(key,resumed,true)))return;
  const closesWriteSplit=hasActiveTab()&&key===currentKey()&&splitWorkspace.hasAttribute('data-tab-write-split');
  const promoteDraft=closesWriteSplit&&studio.activeDraftId?draftKey(studio.activeDraftId):'';
  if(closesWriteSplit||(isManuscript()&&key===currentKey())||(studio.besideOpen&&key===draftKey(studio.activeDraftId))){
   if(!resumed&&studio.deferNavigation('close:'+key,()=>closeTab(key,true,splitResumed),()=>{}))return;
   studio.hide();
  }
  closeReadingMenu();saveState();
  const active=hasActiveTab()?currentKey():'',fallback=key===data.lateral.id?state.workId:'';
  if(fallback&&!bookStates.has(fallback))bookStates.set(fallback,standaloneBookState(fallback,state));
  const next=closeReading(opened,key,active,fallback);opened=next.opened;
  manuscriptTabs.delete(key);
  if(key===active){
   const promotion=tabSplit?.primary===key?tabSplit.key:promoteDraft;
   showReading(opened.includes(promotion)?promotion:next.destination);
  }else tabs();
 }
 function keepBook(workId){
  closeReadingMenu();saveState();
  const comparison=state.connectionId?state:bookStates.get(data.lateral.id)||{};
  const reading=bookStates.get(workId)||(workId===comparison.workId?comparison:comparison.connectionBooks?.[workId])||{};
  bookStates.set(workId,standaloneBookState(workId,reading));
  opened=reconcileReadings(opened.filter(key=>key!==data.lateral.id&&!data.works.some(work=>work.id===key&&key!==workId)),workId);
  showReading(workId);
 }
 function openReadingRoute(destination){
  const address=readingAddress(destination);
  if(libraryCompanion){
   replaceWorkspaceAddress(address||'#');
   void routeFromURL();
  }else{
   const target=new URL(address,location.href);
   if(target.origin!==location.origin)return;
   if(target.pathname===location.pathname&&target.search===location.search){
    if(target.hash===location.hash)void routeFromURL();else location.hash=target.hash;
   }else{workspaceHistory.push(address);void routeFromURL();}
  }
 }
 function readingFragment(key,tab){
  const reading=bookStates.get(key),params=new URLSearchParams(tab.href.slice(1));
  if(tab.field&&reading?.fieldReference){
   const {id,source_pane,work_id}=reading.fieldReference;
   params.set('ref',id);
   if(source_pane)params.set('scope',source_pane);else if(work_id)params.set('work',work_id);
  }else if(!tab.field&&reading){
   const reference=reading.connectionReferenceId||reading.referenceId;
   if(reference)params.set('ref',reference);
   else if(reading.unitId)params.set('unit',reading.unitId);
   else if(reading.rawUnitId)params.set('source',reading.rawUnitId);
  }
  return '#'+params;
 }
 function canPairTabs(first,second){
  if(embedded||first===second||!opened.includes(first)||!opened.includes(second))return false;
  const a=tabDetails(first),b=tabDetails(second);
  if((a.document&&!a.document.id)||(b.document&&!b.document.id))return false;
  return !a.document||!b.document||a.document.id!==b.document.id;
 }
 function paintSplitTools(){
  splitTools.hidden=!splitChoice;
  separateTabsButton.hidden=!tabSplit;
  tabRail.toggleAttribute('data-split-choosing',Boolean(splitChoice));
  for(const tab of tabRail.querySelectorAll('[data-tab-key]')){
   tab.toggleAttribute('data-split-origin',tab.dataset.tabKey===splitChoice);
   tab.toggleAttribute('data-split-target',Boolean(splitChoice&&canPairTabs(splitChoice,tab.dataset.tabKey)));
  }
 }
 function startSplitChoice(key){
  splitChoice=key;
  paintSplitTools();
  tabRail.querySelector('[data-split-origin] a')?.focus({preventScroll:true});
 }
 function cancelSplitChoice(restore=false){
  const origin=tabRail.querySelector('[data-split-origin] a');
  splitChoice='';
  paintSplitTools();
  if(restore)origin?.focus({preventScroll:true});
 }
 function guardTabSplit(resume,cancel=()=>{}){
  if(tabSplit?.kind==='write')return studio.deferNavigation('split:close',resume,cancel);
  if(tabSplit?.kind!=='document')return false;
  const child=tabSplit.element.querySelector('iframe').contentWindow;
  try{
   return Boolean(child&&!child.dispatchEvent(new child.CustomEvent('care-split-before-close',{
    cancelable:true,detail:{resume,cancel},
   })));
  }catch{return false;}
 }
 function closeTabSplit(restore=false){
  if(!tabSplit)return;
  const {kind,element,messages}=tabSplit;
  tabSplit=null;
  messages?.abort();
  element?.remove();
  splitWorkspace.removeAttribute('data-tab-reading-split');
  splitWorkspace.removeAttribute('data-tab-write-split');
  if(kind==='numo')numoCompanion.close();
  if(kind==='write'&&studio.besideOpen)studio.hide();
  paintSplitTools();
  if(restore)tabRail.querySelector('.open-tab.active a')?.focus({preventScroll:true});
 }
 function separateTabs(resumed=false){
  if(!resumed&&guardTabSplit(()=>separateTabs(true)))return;
  closeTabSplit(true);
 }
 function openTabSplit(key){
  const primary=currentKey(),tab=tabDetails(key);
  if(!canPairTabs(primary,key))return;
  const split={primary,key,primaryHash:location.hash,primaryAddress:addressKey()};
  if(tab.isNumo&&isManuscript()&&openNumoCompanion()){
   tabSplit={...split,kind:'numo'};
  }else if(view==='workspace'&&tab.document?.mode==='studio'&&studio.canWriteBeside){
   void studio.showBeside(tab.document.id);
   if(studio.besideOpen){
    tabSplit={...split,kind:'write'};
    splitWorkspace.setAttribute('data-tab-write-split','');
   }
  }else{
   if(isManuscript())studio.minimizeLibrary();
   const element=document.createElement('aside');
   element.className='tab-reading-split';
   element.setAttribute('aria-label','Split view');
   element.innerHTML=`<header class="tab-reading-split-header"><div><small>${esc(tab.style.label)}</small><strong>${esc(tab.title)}</strong></div><button type="button" aria-label="Separate tabs" title="Separate tabs">×</button></header><iframe></iframe>`;
   element.querySelector('button').onclick=()=>separateTabs();
   const frame=element.querySelector('iframe'),url=new URL('/library.html',location.origin);
   const request=crypto.randomUUID(),messages=new AbortController();
   url.searchParams.set('care_studio_embed','1');
   url.searchParams.set('care_studio_request',request);
   if(tab.document){
    url.searchParams.set('care_studio_split_document','1');
    url.searchParams.set('care_studio_split_draft',tab.document.id);
   }else{
    url.searchParams.set('care_studio_pane_reading','1');
    url.searchParams.set('care_tab_split','1');
   }
   url.hash=tab.document||tab.isNumo||tab.isSaved?tab.href:readingFragment(key,tab);
   frame.title=tab.title;
   const title=element.querySelector('strong');
   window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='care-studio-reader-ready'||event.data.request!==request)return;
    if(typeof event.data.workTitle==='string'&&event.data.workTitle)frame.title=title.textContent=event.data.workTitle;
   },{signal:messages.signal});
   frame.src=url.href;
   tabSplit={...split,kind:tab.document?'document':'reading',element,messages};
   splitWorkspace.setAttribute('data-tab-reading-split','');
   splitWorkspace.append(element);
   element.querySelector('button').focus({preventScroll:true});
  }
  paintSplitTools();
 }
 function chooseSplitTarget(key,resumed=false){
  const primary=splitChoice;
  if(!canPairTabs(primary,key))return;
  if(!resumed&&guardTabSplit(()=>chooseSplitTarget(key,true)))return;
  if(!tabSplit&&studio.besideOpen){
   if(!resumed&&studio.deferNavigation('split:choose',()=>chooseSplitTarget(key,true),()=>{}))return;
   studio.hide();
  }
  cancelSplitChoice();
  closeTabSplit();
  if(hasActiveTab()&&currentKey()===primary){openTabSplit(key);return;}
  const tab=tabDetails(primary);
  const href=tab.document||tab.isNumo||tab.isSaved?tab.href:readingFragment(primary,tab);
  pendingSplit={primary,key};
  if(location.hash===href)void routeFromURL();
  else location.hash=href;
 }
 function mountReadingMenu(element,anchor,width,point){
  document.body.append(element);readingMenu={anchor,element};
  if(anchor.hasAttribute('aria-expanded'))anchor.setAttribute('aria-expanded','true');
  const rect=anchor.getBoundingClientRect(),menuWidth=Math.min(width,innerWidth-16);
  Object.assign(element.style,{width:menuWidth+'px',maxHeight:Math.max(80,innerHeight-16)+'px',
   left:Math.max(8,Math.min(innerWidth-menuWidth-8,point?.x??rect.left))+'px'});
  element.style.top=Math.max(8,Math.min(point?.y??rect.bottom+6,innerHeight-element.offsetHeight-8))+'px';
  element.onkeydown=event=>{
   const choices=[...element.querySelectorAll('[role=menuitem]')],at=choices.indexOf(document.activeElement);
   if(event.key==='Escape'||event.key==='Tab'){
    if(event.key==='Escape')event.preventDefault();
    closeReadingMenu(true);
   }else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
    event.preventDefault();
    choices[event.key==='Home'?0:event.key==='End'?choices.length-1:(at+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length]?.focus();
   }
  };
  element.querySelector('[role=menuitem]')?.focus({preventScroll:true});
 }
 function openReadingMenu(key,anchor,{point,toggle=false}={}){
  if(!anchor)return;
  const same=readingMenu?.anchor===anchor;closeReadingMenu();if(toggle&&same)return;
  const tab=tabDetails(key),active=hasActiveTab()&&key===currentKey(),element=document.createElement('div');
  element.className='reading-menu tab-options-menu';
  element.setAttribute('role','menu');element.setAttribute('aria-label','Options for '+tab.title);
  element.innerHTML=`<div class="tab-menu-caption" role="presentation"><small>${esc(tab.style.label)}</small><strong>${esc(tab.title)}</strong></div>`;
  if(opened.some(candidate=>canPairTabs(key,candidate))){
   element.innerHTML+='<button type="button" role="menuitem" data-start-tab-split>Split view</button>';
  }
  if(tabSplit&&(active||tabSplit.key===key))element.innerHTML+='<button type="button" role="menuitem" data-close-tab-split>Separate tabs</button>';
  element.innerHTML+=`<button type="button" role="menuitem" data-close-book="${esc(key)}">Close tab</button>`;
  if(key===data.lateral.id)element.innerHTML+=lateralBooks.map(keep=>{const close=lateralBooks.find(other=>other.id!==keep.id);return close?`<button type="button" role="menuitem" data-keep-book="${esc(keep.id)}"><strong>Close ${esc(close.title)}</strong><small>Keep ${esc(keep.title)} open</small></button>`:'';}).join('');
  element.onclick=event=>{
   const choice=event.target.closest('[role=menuitem]');
   if(!choice)return;
   closeReadingMenu(true);
   if(choice.hasAttribute('data-start-tab-split'))startSplitChoice(key);
   else if(choice.hasAttribute('data-close-tab-split'))separateTabs();
   else if(choice.dataset.keepBook)keepBook(choice.dataset.keepBook);
   else if(choice.dataset.closeBook){
    closeTab(choice.dataset.closeBook);
    if(!anchor.isConnected)tabRail.querySelector('.open-tab.active a')?.focus({preventScroll:true});
   }
  };
  mountReadingMenu(element,anchor,300,point);
 }
 function remember(){const id=state.connectionReferenceId||state.referenceId;if(!id)return;const entry={...state,outlineUnits:[]};const last=history[historyIndex];if(last?.referenceId===entry.referenceId&&last?.connectionReferenceId===entry.connectionReferenceId&&last?.routeMode===entry.routeMode)return;history=history.slice(0,historyIndex+1);history.push(entry);historyIndex=history.length-1;}
 function syncURL(){
  const w=adapter.workFor(state.workId),field=fieldFor(state.connectionId),p=new URLSearchParams();
  if(state.connectionId)p.set(field?'field':'lateral',state.connectionId);else p.set('book',w.slug);
  if(field){if(state.fieldReference){p.set('ref',state.fieldReference.id);if(state.fieldReference.source_pane)p.set('scope',state.fieldReference.source_pane);else if(state.fieldReference.work_id)p.set('work',state.fieldReference.work_id);}}
  else if(state.connectionReferenceId||state.referenceId)p.set('ref',state.connectionReferenceId||state.referenceId);
  else if(state.unitId)p.set('unit',state.unitId);else if(state.rawUnitId)p.set('source',state.rawUnitId);
  replaceWorkspaceAddress(readingAddress('#'+p));
  studio.syncBesideRoute();
 }
 function paintViewer(){
  const id=state.selectedAxiom?.passage_id||state.selectedAxiom?.axiom_id||state.connectionSelection?.reference_id||state.referenceId||state.connectionReferenceId||'';
  if(view!=='workspace'||!mountViewer){viewerHost.hidden=true;viewerCleanup?.();return;}
  // The viewer only needs the items rendered in the current panes and routes.
  const ids=new Set(id?[id]:[]);
  for(const el of shadow.querySelectorAll('[data-ref-id]')){
   const itemId=el.dataset.refId;if(itemId)ids.add(itemId);
  }
  const node=index.nodes.get(id),readingReferences=referenceRows(ids).map(row=>({...row,writing_available:!libraryCompanion&&studio.canWriteBeside}));
  viewerHost.hidden=false;
  viewerCleanup=mountViewer({parentElement:viewerShadow,data:{studio_mode:true,studio_embed:libraryCompanion,references:readingReferences,default_id:id,default_kind:node?.kind==='passage'?'passage':'axiom',follow_default:true,
   copy_studio_reference:viewerCitationCopy()},setTriggerValue:(kind,value)=>{
   if(kind!=='action')return;const n=index.nodes.get(value.id);if(!n)return;
   if(value.type==='write_beside_axiom'&&!libraryCompanion&&studio.canWriteBeside)void studio.showBeside(lastDraftId,value.nonce);
   if(value.type==='studio_open_reference')openNode(n,true);
   else if(value.type==='studio_open_sheet')openNode(n,false);
   else if(value.type==='favourite'){toggleFavourite(n.id,value.active);}
  }});
 }
 function viewerCitationCopy(){
  const request=citationCompanion?companionId:studio.besideRequest;
  return request?reference=>copyStudioLibraryReference(window,reference,request):null;
 }
 function paint(){
  paintedAddress=addressKey();
  if(!embedded){
   const work=view==='workspace'&&!state.connectionId&&adapter.workFor(state.workId);
   const sameSearchPage=location.pathname===initialPathname&&initialSearchRoute&&
    (work?.slug===initialSearchRoute.book||view==='numogram'&&initialSearchRoute.view==='numogram');
   document.title=sameSearchPage?initialTitle:work?[work.title,work.author].filter(Boolean).join(' — ')+' · CARE Library':(roomTitles[view]||'CARE Library')+(roomTitles[view]?' · CARE Library':'');
   const canonical=document.querySelector('link[rel="canonical"]');
   if(canonical){
    if(sameSearchPage&&initialCanonical)canonical.href=initialCanonical;
    else if(!sameSearchPage)canonical.href=new URL(work?bookAddressing.book(work.id)?.url||'/library.html':'/library.html',location.origin).href;
   }
  }
  closeReadingMenu();
  const visiting=view==='workspace'&&!state.connectionId?state.workId:'';
  if(!visiting)lastVisitedBook='';
  tabs();
  host.hidden=view==='saved'||isManuscript()||view==='study-sets'||view==='numogram'||view==='preparation';
  preparationHost.hidden=view!=='preparation';
  savedHost.hidden=view!=='saved';
  if(view==='workspace'&&studio.besideOpen)studio.syncBesideRoute();
  else if(!isManuscript()&&studio.besideOpen)studio.hide();
  studioHost.hidden=!isManuscript()&&!studio.besideOpen;
  setsHost.hidden=view!=='study-sets';
  numoHost.hidden=view!=='numogram';
  if(numoHost.hidden&&numoWorkspace){numoWorkspace.unmount();numoWorkspace=null;}
  if(view==='saved'){syncTabMenus('');cleanup?.();cleanup=null;viewerCleanup?.();viewerCleanup=null;viewerHost.hidden=true;paintSaved();return;}
  savedCleanup?.();savedCleanup=null;
  if(host.hidden){syncTabMenus('');cleanup?.();cleanup=null;viewerCleanup?.();viewerCleanup=null;viewerHost.hidden=true;return;}
  state.bookmarks=saved.bookmarks;state.favouriteAxiomIds=saved.favourites;
  state.routeHistory={can_back:historyIndex>0,can_forward:historyIndex<history.length-1};
  const activeField=view==='workspace'&&fieldFor(state.connectionId);
  // Both readers use shared pane classes. The ordinary desk's unlayered
  // defaults would override the field's own Library pane theme.
  studyStyle.media=activeField?'not all':'';
  if(fieldStyle)fieldStyle.media=activeField?'':'not all';
  shadow.querySelector('[data-study-desk]').hidden=Boolean(activeField);shadow.querySelector('[data-field-desk]').hidden=!activeField;
  if(activeField){
   state.fieldSaved=normalizeFieldSavedState(readLocal('care-public-field-saved:'+activeField.id,{}));
   const payload=fieldPayload(activeField,adapter,state);
   if(!libraryCompanion&&studio.canWriteBeside)Object.assign(payload,{
    write_beside_available:true,writing_clipboard_request:studio.besideRequest,
   });
   cleanup?.();
   cleanup=mountField({parentElement:shadow,data:payload,setStateValue:()=>{},setTriggerValue:(kind,value)=>{if(kind==='action')dispatchField(activeField,value);}});
   syncTabMenus('field:'+activeField.id);paintFieldViewer(activeField);saveState();return;
  }
  const payload=view==='workspace'?adapter.workspace(state):{mode:'library',books,fields,library_scope:view==='laterals'?'lateral':view==='corpuses'?'corpus':'',shelf_request:view,workspace_managed:true,web_study_sets:!libraryCompanion,web_study_set_actions:!libraryCompanion&&Boolean(account)};
  if(citationCompanion||libraryCompanion)Object.assign(payload,{studio_embed:true,studio_axiom_draft_counts:{},copy_studio_source:citationCompanion?copyStudioPacket:null});
  else if(view==='workspace'&&studio.canWriteBeside)Object.assign(payload,{
   write_beside_available:true,writing_clipboard_request:studio.besideRequest,copy_studio_source:studio.besideRequest?copyStudioPacket:null,
  });
  cleanup?.();cleanup=mountReader({parentElement:shadow,data:payload,setStateValue:(kind,value)=>{state=adapter.reduce(state,kind,value);},setTriggerValue:dispatch});
  syncTabMenus(view==='workspace'&&payload.stack?.work?.id?'study:'+payload.stack.work.id:'');
  if(visiting&&visiting!==lastVisitedBook){librarySort.visit(visiting);lastVisitedBook=visiting;}
  if(view!=='workspace')librarySort.apply();
  const closeComparison=shadow.querySelector('[data-connection-close]');
  if(closeComparison){closeComparison.textContent='Close comparison ⌄';closeComparison.setAttribute('aria-label','Close comparison options');closeComparison.setAttribute('aria-haspopup','menu');closeComparison.setAttribute('aria-expanded','false');}
  paintViewer();
  const savedToken=state.savedFocus?.token,selection=state.selectedAxiom;
  if(view==='workspace'&&savedToken&&savedToken!==appliedSavedSelection&&selection&&!state.savedFocus?.passage_id){
   const attribute=selection.passage_id?'data-select-passage':'data-select-axiom',id=selection.passage_id||selection.axiom_id;
   const selected=shadow.querySelector(`[${attribute}="${CSS.escape(id)}"]`);
   if(selected){appliedSavedSelection=savedToken;const section=selected.closest('details');if(section)section.open=true;selected.click();selected.scrollIntoView({block:'nearest',inline:'nearest'});}
  }
  saveState();
 }
 function showBookInfo(work){
  let dialog=$('#book-info-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='book-info-dialog';dialog.setAttribute('aria-labelledby','book-info-title');document.body.append(dialog);}
  const layers=['WB','MC','CL','CH'].filter(layer=>work.units.some(unit=>unit.layer===layer));
  const facts=[
   ['Author',work.author],
   ['Original title',work.original_title!==work.title?work.original_title:''],
   [work.original_year?'Original writing date':'Date',work.original_year||work.year],
   ['Edition publication year',work.publication_year],
   ['Edition',work.edition],
   ['Source language',work.language_name],
   ['CARE version',work.version_label],
   ['Available panes',[(work.sources.length?'Source':''),...layers].filter(Boolean).join(' · ')],
  ].filter(([,value])=>value);
  const destination=readingAddress('#book='+encodeURIComponent(work.slug));
  const source=typeof work.source_url==='string'&&/^https?:\/\//i.test(work.source_url)?work.source_url:'';
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="book-info-title">${esc(work.title)}</h2><button type="button" aria-label="Close book info">×</button></div>
   <div class="book-info-overview"><div>${work.cover_url?`<img src="${esc(work.cover_url)}" alt="">`:''}</div>
   <dl>${facts.map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl></div>
   ${work.description?`<p>${esc(work.description)}</p>`:''}
   <p>${work.sources.length} source chapters · ${work.units.length} CARE readings</p>
   <div class="book-info-actions"><a href="${destination}">Open book</a><button type="button" data-copy-book-link>Copy beta link</button>${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">View source edition ↗</a>`:''}</div>`;
  dialog.querySelector('.dialog-heading button').onclick=()=>dialog.close();
  dialog.querySelector('.book-info-actions a').onclick=()=>dialog.close();
  const copy=dialog.querySelector('[data-copy-book-link]');
  copy.onclick=async()=>{
   const url=new URL(destination,location.href);
   try{await navigator.clipboard.writeText(url.href);copy.textContent='Link copied';}
   catch{
    const input=document.createElement('input');input.readOnly=true;input.value=url.href;input.setAttribute('aria-label','Beta link');
    copy.replaceWith(input);input.select();
   }
  };
  if(!dialog.open)dialog.showModal();
 }
 function paintFieldViewer(field){
  const references=fieldViewerReferences(field,state.fieldSelected||state.fieldReference).map(reference=>({...reference,scope:reference.source_pane||'',kind:reference.kind||'axiom',resolved:reference.resolved!==false,reading_html:reference.reading_html||esc(reference.text||'')}));
  const selected=state.fieldSelected||state.fieldReference||{},ids=new Set(selected.id?[selected.id]:[]);
  for(const element of shadow.querySelectorAll('[data-ref-id],[data-item-id],[data-select-axiom],[data-select-passage]')){
   const id=element.dataset.refId||element.dataset.itemId||element.dataset.selectAxiom||element.dataset.selectPassage;if(id)ids.add(id);
  }
  for(const id of ids){const card=fieldMemberCard(field,adapter,id,state);if(card)references.push(card);}
  const globalFavourites=new Set(saved.favourites),fieldFavourites=state.fieldSaved?.saved_axioms||[];
  for(const reference of references){
   reference.favourite=reference.scope?fieldFavourites.some(row=>row.care_item_id===reference.id&&row.source_pane===reference.scope):globalFavourites.has(reference.id);
   reference.writing_available=!libraryCompanion&&studio.canWriteBeside;
  }
  const selectedReference=references.find(reference=>reference.id===selected.id&&reference.scope===(selected.source_pane||''));
  viewerHost.hidden=false;viewerCleanup?.();viewerCleanup=mountViewer({parentElement:viewerShadow,data:{studio_mode:true,studio_embed:libraryCompanion,references,default_id:selected.id||'',default_kind:selected.kind||selectedReference?.kind||'axiom',default_scope:selected.source_pane||'',follow_default:true,copy_studio_reference:viewerCitationCopy()},setTriggerValue:(kind,value)=>{
   if(kind!=='action')return;
   const scope=value.scope??selected.source_pane??'',reference=references.find(reference=>reference.id===value.id&&reference.scope===scope);
   if(!reference)return;
   if(value.type==='write_beside_axiom'&&reference.writing_available){void studio.showBeside(lastDraftId,value.nonce);return;}
   if(value.type==='favourite'){dispatchField(field,{type:'axiom_favourite_action',care_item_id:value.id,unit_id:reference.unit_id,work_id:reference.work_id,source_pane:scope,active:value.active});return;}
   if(['studio_open_reference','studio_open_sheet'].includes(value.type))openFieldReference(field,{id:value.id,scope,workId:scope?'':reference.work_id});
  }});
 }
 function openFieldReference(field,request){
  const next=fieldReferenceState(field,adapter,state,request);
  if(!next){notice('This route is not included in the published reading.');return;}
  state=next;syncURL();paint();
 }
 async function dispatchField(field,action){
  if(action.type==='book_action'&&action.value?.action==='write_beside_section'){
   if(!libraryCompanion&&studio.canWriteBeside&&fieldMemberFor(field,adapter,action.work_id))await studio.showBeside(lastDraftId);
   return;
  }
  if(action.type==='selected_axiom'){const id=action.value?.axiom_id||action.value?.passage_id;state.fieldSelected=id?{id,source_pane:action.source_pane||'',work_id:action.work_id||action.value?.work_id||'',kind:action.value?.passage_id?'passage':'axiom'}:null;paintFieldViewer(field);return;}
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
  if(action.type==='library'){openReadingRoute('#view='+(field.field==='corpus'?'corpuses':'laterals'));return;}
  if(action.type==='clear_reference'){state.fieldReference=null;syncURL();paint();return;}
  if(action.type==='open_reference'){
   openFieldReference(field,{id:action.reference_id,scope:action.source_pane||'',workId:action.work_id||''});return;
  }
  if(['load_member','load_members'].includes(action.type)){
   const ids=action.work_ids||[action.work_id];
   if(ids.some(id=>!data.works.some(work=>work.id===id||work.version_work_id===id))){notice('This source book has not been published to the beta yet.');return;}
   if(field.bundle.preview_depth!=='WB')return;
   const request=routeRequest;
   try{
    const loaded=await loadFieldMembers(field,loader,ids);
    if(request!==routeRequest||state.connectionId!==field.id)return;
    refreshAdapter();state.fieldLoadedMembers=[...new Set([...(state.fieldLoadedMembers||[]),...loaded])];
    state.fieldMemberLoadErrors={...state.fieldMemberLoadErrors};loaded.forEach(id=>delete state.fieldMemberLoadErrors[id]);paint();
   }catch(error){
    if(request!==routeRequest||state.connectionId!==field.id)return;
    state.fieldMemberLoadErrors={...state.fieldMemberLoadErrors,...Object.fromEntries(ids.map(id=>[id,error.message]))};paint();notice(error.message);
   }
   return;
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
   if(kind==='open_work'){const w=adapter.workFor(value);if(w)openReadingRoute('#book='+w.slug);return;}
   if(kind==='open_field'){if(fieldFor(value))openReadingRoute('#field='+encodeURIComponent(value));else if(value===data.lateral.id)openReadingRoute('#lateral='+value);return;}
   if(kind==='open_study_sets'){
    if(libraryCompanion)return;
    pendingStudySetAction=value;
    if(view==='study-sets'){studySets.openFromShelf(pendingStudySetAction);pendingStudySetAction=null;}
    else location.hash='view=study-sets';
    return;
   }
   if(kind==='book_action'){
    const w=adapter.workFor(value.work_id);
    if(value.action==='book_info'&&w)showBookInfo(w);
    if(value.action==='write_beside_section'&&w&&!libraryCompanion&&studio.canWriteBeside)await studio.showBeside(lastDraftId);
    return;
   }
   if(kind==='bookmark_action'){
    const bookmark=bookBookmarkRecord(index,value);
    if(!bookmark)return;
    if(value.action==='open'){
     if(!bookmark.passage_id){openNode(index.nodes.get(bookmark.care_unit_id),false);return;}
     const target=savedItemTarget({...bookmark,kind:'pane'},value.token);
     if(!target)return;
     state={...standaloneBookState(bookmark.work_id,bookStates.get(bookmark.work_id)),...target.state};
     view='workspace';syncURL();paint();return;
    }
    if(value.action==='toggle'){
     const next=withSavedBookmark(saved,bookmark,value.active);
     if(!saveLocal('care-public-saved-v1',next)){paint();return;}
     saved=next;paint();notice(value.active?(bookmark.passage_id?'Passage bookmarked on this device.':'Pane bookmarked on this device.'):'Bookmark removed.');
    }
    return;
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
  const destination=urlFor(node,{route});if(location.hash===destination)routeFromURL();else openReadingRoute(destination);
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
   if(event.action==='exit'){showReading('');return;}
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
 async function routeFromURL(resumed=false,splitResumed=false){
  routedAddress=addressKey();
  const destination=addressKey(),previousAddress=paintedAddress;
  if(!splitResumed&&tabSplit&&destination!==tabSplit.primaryAddress&&guardTabSplit(
   ()=>{if(addressKey()===destination)routeFromURL(resumed,true);},
   ()=>replaceWorkspaceAddress(tabSplit?.primaryAddress||'/library.html')))return;
  if(resumed!==true&&(isManuscript()||studio.besideOpen)&&studio.deferNavigation(destination,
   ()=>{if(addressKey()===destination)routeFromURL(true,splitResumed);},
   previous=>replaceWorkspaceAddress(previousAddress||readingAddress(previous))))return;
  workspaceHistory.observe();
  const request=++routeRequest;saveState();setLoadStatus();
  const p=searchPageRouteParams(location.hash,currentSearchRoute()),field=fieldFor(p.get('field')),lateral=p.get('lateral'),work=adapter.workFor(p.get('book'));
  if(!embedded){
   const originalSemantic=location.pathname===initialPathname&&initialSearchRoute&&
    !['view','book','field','lateral','compare'].some(key=>new URLSearchParams(location.hash.slice(1)).has(key));
   if(!originalSemantic)replaceWorkspaceAddress(readingAddress('#'+p));
  }
  try{
   const nextView=p.get('view');
   if(documentSplitCompanion&&(!['studio','reader'].includes(nextView)||p.get('draft')!==splitDraftId)){
    workspaceHistory.replace(manuscriptHash('studio',splitDraftId));routeFromURL(true,true);return;
   }
   if(libraryCompanion&&nextView&&!['library','laterals','corpuses'].includes(nextView)&&
     !(readingSplitCompanion&&['numogram','saved'].includes(nextView))){
    workspaceHistory.replace('#');routeFromURL(true);return;
   }
   if(nextView==='studio'||nextView==='reader'){
    view=nextView;
    draftId=p.get('draft')||'';
    const key=draftKey(draftId);
    if(draftId)lastDraftId=draftId;
    manuscriptTabs.set(key,{id:draftId,title:manuscriptTabs.get(key)?.title||'Untitled',mode:view});
    paint();
    if(localAddress&&!account)setLoadStatus('Restart the local preview to open drafts. Press Control-C in its Terminal window, then reopen the preview launcher.');
    await studio.show(view,draftId);
    searchPageReady({view});
    return;
   }
   if(isManuscript())studio.hide();
   if(nextView==='preparation'){
    view='preparation';paint();
    $('#preparation-preview-title').focus({preventScroll:true});
    searchPageReady({view});
    if(!preparationPreview)preparationPreview=loadText('./native/preparation-desk.html')
     .then(markup=>{preparationStage.innerHTML=markup;})
     .catch(()=>{preparationPreview=null;});
    return;
   }
   if(nextView==='numogram'){
    view='numogram';paint();
    const opening=!numoWorkspace;
    if(opening)setLoadStatus('Opening CARE Numogram…');
    const [atlas,referenceModule]=await Promise.all([
     opening?loadNumogram():null,
     p.get('demon')&&!p.get('numo')?import('./native/numogram-reference.mjs'):null,
    ]);
    if(request!==routeRequest)return;
    const reference=referenceModule?.default;
    const demonTarget=reference?numogramDemonTarget(p,reference.demons):null;
    if(opening){
     const {default:mountNumogramAtlas}=atlas;
     numoWorkspace=mountNumogramAtlas(numoHost,{libraryBooks:data.works,focusHeaderAQ:()=>numoHeader?.open(),openSource:href=>{
      const source=new URL(href,location.href);
      const params=new URLSearchParams(source.hash.slice(1));
      if(source.origin===location.origin&&source.pathname==='/library.html'&&(params.has('book')||params.has('lateral')))location.hash=source.hash;
     }});
     if(pendingNumoAQ)numoWorkspace.openAQ(pendingNumoAQ);
     if(pendingNumoReference)numoWorkspace.openReference(pendingNumoReference);
     pendingNumoAQ=pendingNumoReference=null;
     setLoadStatus();
    }
    if(demonTarget)numoWorkspace.openReference(demonTarget);
    searchPageReady({view,demon:demonTarget?.id||''});
    return;
   }
   if(nextView==='study-sets'){
    view='study-sets';paint();
    if(pendingStudySetAction)studySets.openFromShelf(pendingStudySetAction);
    pendingStudySetAction=null;
    searchPageReady({view});
    return;
   }
   if(p.get('view')==='saved'){
    view='saved';paint();setLoadStatus('Opening your saved readings…');await prepareSaved(request);if(request!==routeRequest)return;setLoadStatus();paint();searchPageReady({view});return;
   }
   if(field){
    setLoadStatus('Opening '+field.title+'…');await Promise.all([loadPublicField(field),ensureField(),ensureViewer()]);if(request!==routeRequest)return;
    const memberRequest=field.bundle.preview_depth==='WB'&&p.get('work')&&!p.get('scope')?[p.get('work')]:null;
    const loadedMembers=await loadFieldMembers(field,loader,memberRequest);
    if(request!==routeRequest)return;refreshAdapter();state={workId:(data.works[0]?.id||''),...bookStates.get(field.id),connectionId:field.id};
    state.fieldLoadedMembers=[...new Set([...(state.fieldLoadedMembers||[]),...loadedMembers])];view='workspace';
   }else if(data.lateral.id&&(lateral===data.lateral.id||p.has('compare'))){
    setLoadStatus('Opening the comparison…');await Promise.all([loader.ensureLateral(),ensureViewer()]);if(request!==routeRequest)return;refreshAdapter();
    state={workId:adapter.savedConnection.members[0]?.id||data.works[0]?.id||'',...bookStates.get(data.lateral.id),connectionId:data.lateral.id,connectionReferenceId:p.get('ref')||'',referenceId:''};view='workspace';
   }else if(work){
    setLoadStatus('Opening '+work.title+'…');await Promise.all([loader.ensureWork(work.id),ensureViewer()]);if(request!==routeRequest)return;refreshAdapter();state=standaloneBookState(work.id,bookStates.get(work.id));view='workspace';
   }else{view=['laterals','corpuses'].includes(p.get('view'))?p.get('view'):'library';paint();signalLibraryCompanion();if(['library','laterals','corpuses'].includes(p.get('view')))searchPageReady({view});return;}
   if(p.has('unit')&&p.get('unit')!==data.lateral.id){
    if(work&&!state.connectionId)state={...state,...bookRouteUnitState(p,adapter.workFor(work.id),index,{
     focusToken:'public-unit:'+request,readingPage:currentSearchRoute()?.unit===p.get('unit'),
    })};
    else{state.unitId=p.get('unit');state.rawUnitId='';state.referenceId='';state.selectedAxiom=null;}
   }
   if(p.has('source')){state.rawUnitId=p.get('source');state.unitId='';state.referenceId='';state.selectedAxiom=null;}
   if(work&&!state.connectionId&&p.has('focus')){
    const node=index.nodes.get(p.get('focus'));
    if(node?.work?.id!==work.id||!['passage','claim'].includes(node.kind))throw Error('This result is outside the published book.');
    const isPassage=node.kind==='passage';
    const target=savedItemTarget({
     available:true,kind:isPassage?'passage':'axiom',work_id:work.id,care_unit_id:node.unit.id,
     layer:node.unit.layer,care_item_id:node.id,passage_id:isPassage?node.id:'',
    });
    state={...state,...target.state};
   }
   if(p.has('ref')){
    if(field){const next=fieldReferenceState(field,adapter,state,{id:p.get('ref'),scope:p.get('scope')||'',workId:p.get('work')||''});if(!next)throw Error('This route is not included in the published reading.');state=next;}
    else{if(state.connectionId)state.connectionReferenceId=p.get('ref');else state.referenceId=p.get('ref');remember();}
   }
   setLoadStatus();paint();searchPageReady({view,book:work?.slug||'',source:p.get('source')||'',unit:p.get('unit')||'',ref:p.get('ref')||''});signalLibraryCompanion(!state.connectionId&&adapter.workFor(state.workId),field?.title,index.nodes.get(p.get('focus')||p.get('ref')));
  }catch(error){if(request!==routeRequest)return;console.error(error);view='library';paint();signalLibraryCompanion();setLoadStatus(error.message||'This reading could not load.',()=>routeFromURL());}
 }
 function signalLibraryCompanion(work,fieldTitle,target){
  if(libraryCompanion)window.parent.postMessage({type:'care-studio-reader-ready',request:companionId,
   workId:work?.id||'',workTitle:work?.title||fieldTitle||'',readingKind:target?.kind||'',
   readingLayer:target?.unit?.layer||'',readingReference:target?.id||''},location.origin);
 }
 function openTabList(anchor){
  const same=readingMenu?.anchor===anchor;
  closeReadingMenu();
  if(same)return;
  const element=document.createElement('div');
  element.className='reading-menu tab-list-menu';
  element.setAttribute('role','menu');
  element.setAttribute('aria-label','Open readings');
  const active=hasActiveTab()?currentKey():'';
  element.innerHTML=(active?`<button type="button" role="menuitem" class="tab-list-options" data-active-tab-options><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5h17v13h-17zm8.5 0v13"/></svg>Tab options…</button>`:'')+opened.map(key=>{
   const {title,href,style}=tabDetails(key);
   return `<a role="menuitem" href="${esc(readingAddress(href))}">${esc(title)} <small>${esc(style.label)}</small></a>`;
  }).join('');
  element.onclick=event=>{
   if(event.target.closest('[data-active-tab-options]'))openReadingMenu(active,anchor);
   else if(event.target.closest('a'))closeReadingMenu(true);
  };
  mountReadingMenu(element,anchor,320);
 }
 tabStrip.addEventListener('click',event=>{
  const target=event.target.closest('[data-tab-key] a');
  if(splitChoice&&target){
   event.preventDefault();
   chooseSplitTarget(target.closest('[data-tab-key]').dataset.tabKey);
   return;
  }
  const menu=event.target.closest('[data-reading-menu]'),close=event.target.closest('[data-close-book]');
  if(menu)openReadingMenu(menu.dataset.readingMenu,menu,{toggle:true});else if(close)closeTab(close.dataset.closeBook);
 });
 function tabContextMenu(event,point){
  const tab=event.target.closest('[data-tab-key]');
  if(!tab)return;
  event.preventDefault();
  openReadingMenu(tab.dataset.tabKey,tab.querySelector('a'),{point});
 }
 tabStrip.addEventListener('contextmenu',event=>{
  const point=event.clientX||event.clientY?{x:event.clientX,y:event.clientY}:undefined;
  tabContextMenu(event,point);
 });
 tabStrip.addEventListener('keydown',event=>{
  const target=event.target.closest('[data-tab-key] a');
  if(splitChoice&&target&&event.key===' '){
   event.preventDefault();chooseSplitTarget(target.closest('[data-tab-key]').dataset.tabKey);
  }else if((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu')tabContextMenu(event);
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&splitChoice&&!readingMenu){
   event.preventDefault();cancelSplitChoice(true);
  }
 });
 if(documentSplitCompanion)addEventListener('care-split-before-close',event=>{
  const {resume,cancel}=event.detail||{};
  if(typeof resume==='function'&&typeof cancel==='function'&&studio.deferNavigation('split:close',resume,cancel))event.preventDefault();
 });
 document.addEventListener('pointerdown',event=>{if(readingMenu&&!event.composedPath().includes(readingMenu.element)&&!event.composedPath().includes(readingMenu.anchor))closeReadingMenu();},true);
 addEventListener('resize',()=>closeReadingMenu());
 document.querySelectorAll('.beta-workbench [data-page=library],.companion-library-home').forEach(link=>link.addEventListener('click',event=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(isManuscript()&&link.matches('[data-page=library]')&&studio.openLibrary())return;
  showReading('');
 }));
 function moveHistory(step){
  if(chamberStep(step))document.dispatchEvent(new CustomEvent('care:numo-history-step',{detail:{step}}));
  else workspaceHistory.move(step);
 }
 for(const button of document.querySelectorAll('[data-history]'))button.onclick=()=>moveHistory(Number(button.dataset.history));
 bindWorkspaceBackHistory([...document.querySelectorAll('[data-history="-1"]')],{
  entries:()=>[
   ...(historyInNumo?(numoHistory.entries||[]).map(row=>({...row,title:row.label,kind:'Chamber'})):[]),
   ...workspaceHistory.recent().map(row=>({...row,title:row.title||'Library',kind:row.kind||'Library'})),
  ],
  jump(row){
   if(row.kind==='Chamber')document.dispatchEvent(new CustomEvent('care:numo-history-jump',{detail:{index:row.index}}));
   else workspaceHistory.move(row.offset);
  },
 });
 const routeChanged=()=>{if(addressKey()!==routedAddress)void routeFromURL();};
 addEventListener('popstate',routeChanged);
 const settingsMenu=$('#workbench-settings'),roomsMenu=$('#workbench-rooms');
 const toolbarMenus=[libraryMenu,roomsMenu,settingsMenu];
 $('[data-numo-tools]').onclick=()=>numoWorkspace?.openTools();
 for(const menu of toolbarMenus){
  menu.addEventListener('toggle',()=>{
   if(!menu.open)return;
   for(const other of toolbarMenus)if(other!==menu)other.open=false;
   if(menu===libraryMenu){closeReadingMenu();syncTabMenus.dismiss();}
  });
  if(menu!==libraryMenu)menu.addEventListener('click',event=>{
   if(event.target.closest('.workbench-menu a,.workbench-menu button'))menu.open=false;
  });
 }
 document.addEventListener('pointerdown',event=>{
  const path=event.composedPath();
  for(const menu of toolbarMenus)if(menu.open&&!path.includes(menu))menu.open=false;
 });
 libraryMenu.querySelector('.library-command-menu').addEventListener('click',event=>{
  const item=event.target.closest('button,a');
  if(!item||tabMenuHost.contains(item))return;
  const action=item.dataset.workspaceFileAction;
  const restoreFocus=document.activeElement===item;
  libraryMenu.open=false;
  if(restoreFocus)libraryMenuTrigger.focus({preventScroll:true});
  if(item===openReadings){openTabList(libraryMenuTrigger);return;}
  if(item===separateTabsButton){separateTabs();return;}
  if(action==='library'&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();showReading('');}
  if(action==='map')numoWorkspace?.openReference({kind:'home'});
  if(action==='demons')numoWorkspace?.openReference({kind:'matrix'});
  if(action==='aq')numoHeader?.open();
  if(action==='find'){
   const input=isShelf()&&shadow.querySelector('[data-shelf-input="query"]');
   if(input){input.focus();input.select();}
   else spotlight.open('',{expanded:true});
  }
 });
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-studio-command], [data-document-picker], [data-full-feature]');
  if(!button)return;
  const menu=button.closest('details');
  if(menu)menu.open=false;
  if(button.dataset.fullFeature){
   openFeaturePreview($('#workbench-feature'),button.dataset.fullFeature);
  }else if(button.dataset.documentPicker){
   pickerController?.open(button.dataset.documentPicker);
  }else studio.command(button.dataset.studioCommand);
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   const menu=toolbarMenus.find(item=>item.open);
   if(menu){menu.open=false;menu.querySelector('summary').focus();event.preventDefault();return;}
  }
  if(event.defaultPrevented||event.isComposing||event.shiftKey||event.altKey||event.metaKey===event.ctrlKey)return;
  if(event.key.toLowerCase()!=='f')return;
  if(document.querySelector('dialog[open], .studio-picker-panel:not([hidden])'))return;
  if(!['library','laterals','corpuses'].includes(view))return;
  const input=shadow.querySelector('[data-shelf-input="query"]');
  if(!input)return;
  event.preventDefault();
  input.focus();
  input.select();
 });
 $('.workbench-saved').onclick=()=>{if(location.hash==='#view=saved')routeFromURL();else location.hash='view=saved';};
 numoHeader=mountNumogramHeaderSearch({
  host:$('[data-numo-header-search]'),
  loadAQParser:()=>loadNumogram().then(module=>module.instrumentAQInput),
  onOpenNumogram(target){
   if(numoWorkspace)numoWorkspace.openAQ(target);
   else pendingNumoAQ=target;
  },
  onOpenReference(target){
   if(numoWorkspace)numoWorkspace.openReference(target);
   else pendingNumoReference=target;
  },
  onSearchCare:query=>spotlight.open(query,{expanded:true}),
 });
 document.addEventListener('keydown',event=>{
  if(view!=='numogram'||event.defaultPrevented||event.isComposing||event.altKey||event.shiftKey||
    !(event.metaKey||event.ctrlKey)||event.key.toLowerCase()!=='k'||
    document.querySelector('dialog[open], .csp-overlay[open]'))return;
  event.preventDefault();
  event.stopImmediatePropagation();
  numoHeader.open();
 },true);
 const spotlight=mountBetaSpotlight({
  works:data.works,fields,
  workspaceTitle(){
   const title=$('#workbench-search-title').textContent;
   return title==='Search'?'':title;
  },
  onSelect({href}){
   if(!isManuscript()||!studio.openLibrary(href))openReadingRoute(href);
  },
 });
 document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target.closest('.result'))dialog.close();if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.composedPath().find(node=>node?.localName==='a');
  if(!link||link.target||link.hasAttribute('download'))return;
  const target=new URL(link.href,location.href);
  if(target.origin!==location.origin)return;
  const params=new URLSearchParams(target.hash.slice(1));
  const workspaceRoute=['book','view','field','lateral','compare','source','unit','ref','focus'].some(key=>params.has(key));
  const bookPath=bookAddressing.route(target.pathname);
  if(!(bookPath&&(!target.hash||workspaceRoute)||target.pathname==='/library.html'&&workspaceRoute))return;
  event.preventDefault();openReadingRoute(target.pathname+target.search+target.hash);
 });
 addEventListener('hashchange',routeChanged);routeFromURL();
}
start().catch(error=>{const host=$('#reader');host.textContent=error.message||'CARE Library could not load.';host.classList.add('loading');const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();host.append(document.createElement('br'),retry);});
