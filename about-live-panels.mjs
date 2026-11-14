import mountStudyDesk from './native/study-desk.mjs';
import mountReferenceViewer from './native/reference-viewer.mjs';

const nativeCSSURL = new URL('./native/study-desk.css', import.meta.url).href;
const allowedPanes = new Set(['source', 'chapter']);

// Scoped sizing around CARE’s native reader. The same native components render
// its sections, claims, material finish, keyboard selection and controls.
export const ABOUT_PANEL_CSS = `
:host{color-scheme:dark;display:block;height:100%;min-height:0;min-width:0;--st-font:Care Sans,system-ui,-apple-system,sans-serif;--st-code-font:Care Code,ui-monospace,SFMono-Regular,Menlo,monospace;--source-paper:#191c22;--st-text-color:#ece8df;--st-background-color:#0e1117;--st-secondary-background-color:#171c23}
.study-desk[data-about-native]{display:block!important;height:100%!important;min-height:0!important;max-height:none!important;width:100%;overflow-anchor:none;position:relative;border:0!important;border-radius:0}
.study-desk[data-about-native]>.desk-strip{display:flex!important;align-items:stretch!important;position:relative;height:100%!important;min-height:0!important;width:100%;overflow-anchor:none}
.study-desk[data-about-native]:not([data-about-route="true"])>.desk-strip>.desk-window:not(.care-pane-minimized){flex:0 0 calc(100% - 2rem)!important;min-width:0!important;max-width:calc(100% - 2rem)!important;height:100%!important}
.study-desk[data-about-native][data-about-route="true"]>.desk-strip>.desk-window:not(.care-pane-minimized){flex:0 0 min(32rem,calc(100% - 2rem));min-width:min(20rem,calc(100% - 2rem))}
.study-desk[data-about-native] .window-body{min-height:0!important;overflow-anchor:none}
.study-desk[data-about-native]:not([data-about-route="true"])[data-about-view="chapter"]>.desk-strip>.source-pane,.study-desk[data-about-native]:not([data-about-route="true"])[data-about-view="source"]>.desk-strip>.care-pane{display:none!important}
.study-desk[data-about-native]:not([data-pane-reading="true"],[data-pane-reading-child="true"])>.desk-menu-toolbar,.study-desk[data-about-native]>.desk-status,.study-desk[data-about-native] .connection-discovery-pane{display:none!important}
.study-desk[data-about-native][data-about-route="true"]>.desk-menu-toolbar:has(.route-toolbar){display:flex!important}
.study-desk[data-about-native][data-about-route="true"]>.desk-strip{height:calc(100% - 2.8rem)!important}
.study-desk[data-about-native] .source-pane:not(.outline-lane) .source-layout>.source-copy{background-image:var(--material-grain,none),radial-gradient(ellipse 92% 22rem at 27% 0,#cddce60a,transparent)}
[data-about-native-viewer]{position:absolute;inset:0;z-index:90;pointer-events:none;--st-text-color:#ece8df;--st-background-color:#0e1117;--st-secondary-background-color:#171c23}
[data-about-native-viewer] .care-reference-component{position:absolute;inset:0;height:100%;pointer-events:none}
[data-about-native-viewer] .crv-launcher{position:absolute!important;right:12px!important;bottom:12px!important;left:auto!important;pointer-events:auto}
[data-about-native-viewer] .crv-panel{position:absolute!important;inset:0 0 0 auto!important;width:min(100%,32rem)!important;min-width:0!important;max-width:100%!important;max-height:100%!important;pointer-events:auto}
[data-about-native-viewer] :is(.crv-tool-reveal-sheet,.crv-write,.crv-send,.crv-return-studio){display:none!important}
@media(prefers-reduced-motion:reduce){.study-desk[data-about-native] *{scroll-behavior:auto!important}}
`;

const copy = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function panelPanes(panel) {
  return [...allowedPanes].filter(name => panel?.[name]?.stack?.work?.id);
}

// Standalone file previews point their live Library actions at the real site.
// Production leaves these paths relative so the current site origin is retained.
export function resolveAboutLibraryHref(href, libraryOrigin) {
  if (!href || typeof href !== 'string') return '';
  if (!libraryOrigin) return href;
  try {
    const origin = new URL(libraryOrigin);
    if (origin.protocol !== 'https:' || origin.username || origin.password) return href;
    return new URL(href, origin).href;
  } catch { return href; }
}

export function panelReadingHref(panel, pane) {
  if (!allowedPanes.has(pane) || !panelPanes(panel).includes(pane)) return '';
  return String(pane === 'source' ? panel.sourceHref || panel.href || '' : panel.chapterHref || panel.href || '');
}

/** Only a claim/passage belonging to the displayed frozen native pane can be linked. */
export function panelSelectionHref(panel, pane, selection) {
  if (!selection || !allowedPanes.has(pane)) return '';
  const stack = panel?.[pane]?.stack;
  if (!stack || selection.work_id !== stack.work?.id) return '';
  const passage = String(selection.passage_id || '');
  const axiom = String(selection.axiom_id || '');
  if (Boolean(passage) === Boolean(axiom)) return '';
  const unit = String(selection.unit_id || '');
  let known = false;
  if (pane === 'source' && passage && stack.active_chapter?.raw_unit_id === unit) {
    known = (stack.active_chapter.passages || []).some(row => row.id === passage);
  } else if (pane === 'chapter' && axiom) {
    const sheet = (stack.care_path || []).find(row => row.id === unit);
    known = Boolean(sheet && [...(sheet.items || []), ...(sheet.sections || []).flatMap(section => section.items || [])].some(row => row.id === axiom));
  }
  const base = String(panel.claimHrefBase || '');
  if (!known || !base.startsWith('/library.html#')) return '';
  const query = new URLSearchParams(base.slice(base.indexOf('#') + 1));
  query.delete('unit'); query.delete('source');
  query.set('ref', passage || axiom);
  return '/library.html#' + query;
}

export function inflateAboutExplorer(value, shared = {}, memo = new Map()) {
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && typeof value.$aboutRef === 'string') {
    const id=value.$aboutRef;
    if(memo.has(id))return memo.get(id);
    if(!Object.prototype.hasOwnProperty.call(shared,id))throw Error('A saved example packet is incomplete.');
    const result=inflateAboutExplorer(shared[id],shared,memo);memo.set(id,result);return result;
  }
  if(Array.isArray(value))return value.map(row=>inflateAboutExplorer(row,shared,memo));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,row])=>[key,inflateAboutExplorer(row,shared,memo)]));
  return value;
}

export async function prepareAboutPanel(panel) {
  if(panel?.explorer?.encoding!=='object-intern-gzip/1')return panel;
  if(typeof DecompressionStream!=='function')throw Error('This browser cannot open the compressed saved example.');
  const bytes=Uint8Array.from(atob(panel.explorer.gzip),char=>char.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const explorer=JSON.parse(await new Response(stream).text());
  return {...panel,explorer};
}

export function createAboutPanelController(panel, options = {}) {
  const encoded=panel.explorer||{},memo=new Map();
  const inflate=value=>inflateAboutExplorer(value,encoded.shared||{},memo);
  const explorer={sources:inflate(encoded.sources||{}),sheets:inflate(encoded.sheets||{}),routes:inflate(encoded.routes||{}),references:inflate(encoded.references||{}),outlines:inflate(encoded.outlines||{})};
  const panes=panelPanes(panel),initialPane=panes.includes(options.defaultPane)?options.defaultPane:panes[0];
  let state,history,position,bookmarks,favourites,marks,lastReading;
  const initial=()=>({kind:'reading',pane:initialPane,id:initialPane==='source'?panel.source?.stack?.active_raw_unit_id||panel.source?.stack?.active_chapter?.raw_unit_id:panel.chapter?.stack?.active_unit_id||panel.chapter?.stack?.care_path?.[0]?.id});
  const remember=()=>{history=history.slice(0,position+1);history.push({...state});position=history.length-1;};
  function reset(){state=initial();history=[{...state}];position=0;bookmarks=[];favourites=new Set();marks={};lastReading={...state};return status();}
  function rawPayload(){
    if(state.kind==='route')return explorer.routes[state.id]?.[state.mode]||explorer.routes[state.id]?.incoming||explorer.routes[state.id]?.outgoing||explorer.routes[state.id]?.both||explorer.routes[state.id];
    return state.pane==='source'?explorer.sources[state.id]||panel.source:explorer.sheets[state.id]||panel.chapter;
  }
  function payload(){
    const value=copy(rawPayload()||panel[initialPane]);
    value.mode='workspace';value.studio_embed=false;value.ephemeral_workspace=true;value.local_navigation_enabled=false;value.workspace_managed=false;
    value.route_history={can_back:position>0,can_forward:position<history.length-1};
    value.bookmarks=copy(bookmarks);value.favourite_axiom_ids=[...favourites];value.selected_axiom=state.selection||null;value.saved_focus=state.savedFocus||null;
    if(state.kind!=='route'){
      if(state.pane==='source')value.stack.care_path=[];
      else{value.stack.active_chapter=null;const chosen=value.stack.care_path.find(unit=>unit.id===state.id);value.stack.care_path=chosen?[chosen]:value.stack.care_path.filter(unit=>['CH','XR'].includes(unit.type));}
      value.reference=null;value.selected_reference_id='';value.connection=null;
    }
    if(state.outline){value.outline_available=true;value.outline_response=copy(state.outline);value.outline_units=[copy(state.outline)];}
    return value;
  }
  function referenceFor(id){
    const recorded=Array.isArray(explorer.references)?explorer.references.find(row=>row.id===id):explorer.references[id];
    if(recorded)return {...copy(recorded),favourite:favourites.has(id),...(marks[id]||{})};
    const current=rawPayload();const route=current?.reference;
    const rows=[...(current?.stack?.active_chapter?.passages||[]).map(row=>({...row,kind:'passage',layer:'SOURCE',unit_id:current.stack.active_chapter.raw_unit_id})),...(current?.stack?.care_path||[]).flatMap(unit=>(unit.sections||[]).flatMap(section=>(section.items||[]).map(row=>({...row,kind:'axiom',layer:unit.type,unit_id:unit.id})))),...(route?[route,...Object.values(route.route_layers||{}).flatMap(rows=>rows||[])]:[])];
    const row=rows.find(row=>row.id===id);return row?{...copy(row),work_id:row.work_id||current.stack?.work?.id,work_title:row.work_title||current.stack?.work?.title,kind:row.kind==='passage'?'passage':'axiom',favourite:favourites.has(id),...(marks[id]||{})}:null;
  }
  function selectedReference(){return referenceFor(state.selection?.passage_id||state.selection?.axiom_id||(state.kind==='route'?state.id:''));}
  function references(){
    const values=Array.isArray(explorer.references)?explorer.references:Object.values(explorer.references);
    const rows=values.map(row=>({...copy(row),favourite:favourites.has(row.id),...(marks[row.id]||{})}));
    const selected=selectedReference();if(selected&&!rows.some(row=>row.id===selected.id))rows.unshift(selected);
    return rows;
  }
  function status(){return {pane:state.pane,referenceId:state.kind==='route'?state.id:'',routeMode:state.mode||'incoming',selection:state.selection||null,warning:state.warning||'',bookmarks:copy(bookmarks),favourites:[...favourites]};}
  function href(){
    if(state.continuation){const query=new URLSearchParams(String(panel.claimHrefBase||'').split('#')[1]||'');query.set('ref',state.continuation);return '/library.html#'+query;}
    if(state.kind==='route'){const query=new URLSearchParams(String(panel.claimHrefBase||'').split('#')[1]||'');query.set('ref',state.id);return '/library.html#'+query;}
    const base=panelReadingHref(panel,state.pane);const query=new URLSearchParams(base.split('#')[1]||'');query.set(state.pane==='source'?'source':'unit',state.id);return '/library.html#'+query;
  }
  function dispatch(kind,value){
    const id=String(value?.id||value?.reference_id||value||'');state.warning='';
    if(kind==='selected_axiom'){state.selection=value;state.continuation='';return status();}
    if(kind==='choose_pane'&&panes.includes(value)){state={kind:'reading',pane:value,id:value==='source'?panel.source.stack.active_raw_unit_id||panel.source.stack.active_chapter.raw_unit_id:panel.chapter.stack.active_unit_id||panel.chapter.stack.care_path[0].id};lastReading={...state};remember();}
    else if(kind==='open_chapter'||kind==='open_sheet'){
      const pane=kind==='open_chapter'?'source':'chapter',record=pane==='source'?explorer.sources[id]:explorer.sheets[id];
      if(record){state={kind:'reading',pane,id};lastReading={...state};remember();}else state.warning='This next reading is available in the full Library.';
    }else if(kind==='open_reference'){
      if(explorer.routes[id]){if(state.kind!=='route')lastReading={...state};state={kind:'route',pane:state.pane,id,mode:['incoming','outgoing','both'].find(mode=>explorer.routes[id]?.[mode])||'incoming',selection:null};remember();}
      else {state.warning='Continue this recorded route in the full Library.';if(referenceFor(id))state.continuation=id;}
    }else if(kind==='set_route_mode'&&state.kind==='route'){
      const mode=typeof value==='string'?value:value?.mode;
      if(['incoming','outgoing','both'].includes(mode)&&explorer.routes[state.id]?.[mode]){state={...state,mode};remember();}
    }else if(kind==='clear_reference'){state={...lastReading,selection:null};remember();}
    else if(kind==='navigate_route'&&[-1,1].includes(Number(value))){const next=position+Number(value);if(next>=0&&next<history.length){position=next;state={...history[next]};}}
    else if(kind==='bookmark_action'){
      const key=row=>[row.care_unit_id,row.passage_id||''].join('|');bookmarks=bookmarks.filter(row=>key(row)!==key(value));if(value.active??value.action==='add')bookmarks.push({...value});
    }else if(kind==='axiom_favourite_action'){const key=value.care_item_id||value.id;if(value.active)favourites.add(key);else favourites.delete(key);}
    else if(kind==='viewer_mark'){marks[value.id]={...(marks[value.id]||{}),...value.mark};}
    else if(kind==='public_reading_language'||kind==='version_action'){state.warning='Choose this language or edition in the full Library.';}
    else if(kind==='open_outline_sheet'){const key=value.id||value.unit_id||value.raw_unit_id||value;const outline=explorer.outlines[key];if(outline)state.outline=outline;}
    return status();
  }
  reset();return {payload,dispatch,reset,status,selectedReference,references,href};
}

function installStyle(shadow,doc,text,url){
  if(typeof text==='string'){const style=doc.createElement('style');style.textContent=text;shadow.append(style);return Promise.resolve();}
  const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL(url,import.meta.url).href;
  const promise=new Promise((resolve,reject)=>{link.addEventListener('load',resolve,{once:true});link.addEventListener('error',()=>reject(Error('The CARE panel style could not load.')),{once:true});});shadow.append(link);return promise;
}

export async function mountAboutPanel(wrapper,panel,options={}){
  if(panel?.explorer?.encoding==='object-intern-gzip/1')panel=await prepareAboutPanel(panel);
  const host=wrapper?.querySelector('[data-about-live-content]'),panes=panelPanes(panel);if(!host||!panes.length)throw Error('A published CARE example is unavailable.');
  const doc=wrapper.ownerDocument,view=doc.defaultView,renderer=options.renderer||mountStudyDesk,viewerRenderer=options.viewerRenderer||mountReferenceViewer;
  const controller=createAboutPanelController(panel,{defaultPane:wrapper.dataset.aboutDefaultPane});
  const status=wrapper.querySelector('[data-about-panel-status]'),readingLink=wrapper.querySelector('[data-about-open-reading]'),claimLink=wrapper.querySelector('[data-about-open-claim]'),buttons=[...wrapper.querySelectorAll('[data-about-pane]')],resetButton=wrapper.querySelector('[data-about-reset]');
  const fallback=[...host.childNodes].map(node=>node.cloneNode(true)),shadow=host.shadowRoot||host.attachShadow({mode:'open'});shadow.replaceChildren();
  const enableViewer=!options.renderer||Boolean(options.viewerRenderer);
  const pendingStyles=[installStyle(shadow,doc,options.cssText,'./native/study-desk.css'),installStyle(shadow,doc,enableViewer?options.scopeCSSText:'','./native/public-scope.css'),installStyle(shadow,doc,enableViewer?options.viewerCSSText:'','./native/reference-viewer.css')];
  const style=doc.createElement('style');style.textContent=ABOUT_PANEL_CSS;shadow.append(style);const slot=doc.createElement('slot');shadow.append(slot);
  let root,viewerHost,cleanup,viewerCleanup,mounted=false,destroyed=false,paintQueued=false,viewerOpen=false;
  const eventScope='about-'+wrapper.dataset.aboutLivePanel;
  const viewerHTMLPromise=!enableViewer?Promise.resolve(''):typeof options.viewerHTML==='string'?Promise.resolve(options.viewerHTML):view.fetch(new URL('./native/reference-viewer.html',import.meta.url),{credentials:'omit'}).then(response=>{if(!response.ok)throw Error('The Axiom viewer could not load.');return response.text();});
  host.setAttribute('aria-busy','true');
  function makeRoots(html){
    root=doc.createElement('div');root.className='study-desk';root.dataset.studyDesk='';root.dataset.skin='care';root.dataset.aboutNative='';root.tabIndex=0;root.setAttribute('aria-label',panel.title+' · saved CARE example');
    viewerHost=doc.createElement('div');viewerHost.dataset.aboutNativeViewer='';viewerHost.innerHTML=html;shadow.append(root,viewerHost);
  }
  function updateLinks(){
    const state=controller.status();if(readingLink)readingLink.href=resolveAboutLibraryHref(controller.href(),options.libraryOrigin);
    const selected=controller.selectedReference();if(claimLink){claimLink.hidden=!selected;if(selected){const query=new URLSearchParams(String(panel.claimHrefBase||'').split('#')[1]||'');query.set('ref',selected.id);claimLink.href=resolveAboutLibraryHref('/library.html#'+query,options.libraryOrigin);claimLink.textContent=selected.kind==='passage'?'Open this passage in Library ↗':'Open this claim in Library ↗';}}
    for(const button of buttons){button.hidden=!panes.includes(button.dataset.aboutPane);button.setAttribute('aria-pressed',String(button.dataset.aboutPane===state.pane));}
    if(status)status.textContent=state.warning||'Explore the panel. Each example resets on refresh.';
  }
  function closeViewer(){viewerOpen=false;viewerHost?.querySelector('.crv-close')?.click();}
  function paintViewer(open=viewerOpen){
    if(!mounted||!viewerHost||options.renderer&&!options.viewerRenderer)return;
    const selected=controller.selectedReference(),refs=controller.references().map(row=>({...row,scope:row.scope||row.source_pane||'',resolved:row.resolved!==false,writing_available:false,bookmark_available:row.kind==='passage',bookmarked:controller.status().bookmarks.some(mark=>mark.passage_id===row.id),href:resolveAboutLibraryHref(row.href||row.destination||controller.href(),options.libraryOrigin),destination:resolveAboutLibraryHref(row.destination||row.href||controller.href(),options.libraryOrigin),sheet_destination:resolveAboutLibraryHref(row.sheet_destination||panelReadingHref(panel,controller.status().pane),options.libraryOrigin)}));
    viewerCleanup?.();viewerCleanup=viewerRenderer({parentElement:viewerHost,eventRoot:wrapper,eventScope,data:{studio_mode:true,studio_embed:true,ephemeral_workspace:true,references:refs,default_id:selected?.id||'',default_kind:selected?.kind||'axiom',default_scope:selected?.scope||selected?.source_pane||'',follow_default:true,open_default:Boolean(open&&selected)},setTriggerValue:(kind,value)=>{
      if(kind!=='action')return;
      if(value.type==='preview_select'){const ref=controller.references().find(row=>row.id===value.id);if(ref){controller.dispatch('selected_axiom',{work_id:ref.work_id,unit_id:ref.unit_id,...(ref.kind==='passage'?{passage_id:ref.id}:{axiom_id:ref.id})});updateLinks();}}
      else if(value.type==='studio_open_reference'){closeViewer();controller.dispatch('open_reference',value.id);paint();}
      else if(value.type==='studio_open_sheet'){closeViewer();const selected=controller.references().find(row=>row.id===value.id);if(selected)controller.dispatch(selected.kind==='passage'?'open_chapter':'open_sheet',selected.unit_id);paint();}
      else if(value.type==='favourite'){controller.dispatch('axiom_favourite_action',{care_item_id:value.id,active:value.active});paint();}
      else if(value.type==='source_bookmark'){const selected=controller.selectedReference();controller.dispatch('bookmark_action',{care_unit_id:selected?.unit_id,passage_id:value.id,active:value.active});paint();}
      else if(value.type==='rate'||value.type==='quality'){controller.dispatch('viewer_mark',{id:value.id,mark:value.type==='rate'?{rating:value.score}:{quality:value.rank}});updateLinks();}
    }});
    viewerHost.querySelector('[data-care-reference-viewer-root]')?.setAttribute('data-compact-toolbar','');
  }
  function paint(){
    if(destroyed||!mounted)return;cleanup?.();const state=controller.status(),payload=controller.payload();root.dataset.aboutView=state.pane;root.dataset.aboutRoute=String(Boolean(state.referenceId));
    cleanup=renderer({parentElement:shadow,eventRoot:wrapper,eventScope,data:payload,setStateValue:(kind,value)=>{if(kind==='selected_axiom'){controller.dispatch(kind,value);updateLinks();paintViewer(true);}},setTriggerValue:(kind,value)=>{if(kind==='open_reference')closeViewer();controller.dispatch(kind,value);if(!paintQueued){paintQueued=true;queueMicrotask(()=>{paintQueued=false;paint();});}}});
    // Runtime remains isolated; this selects the exact published Library material.
    root.dataset.studioEmbed='false';
    if(root.querySelector('.inspector-empty b')?.textContent==='THE DESK COULD NOT DRAW')throw Error('The saved CARE example could not be drawn.');
    updateLinks();paintViewer();
  }
  const onToggle=event=>{controller.dispatch('choose_pane',event.currentTarget.dataset.aboutPane);paint();};for(const button of buttons)button.addEventListener('click',onToggle);
  let html='';
  function reset(){if(!mounted||destroyed)return;cleanup?.();viewerCleanup?.();root?.remove();viewerHost?.remove();controller.reset();viewerOpen=false;makeRoots(html);paint();if(status)status.textContent='Example reset. Explore the panel; it resets again on refresh.';}
  resetButton?.addEventListener('click',reset);
  try{const results=await Promise.all([...pendingStyles,viewerHTMLPromise]);html=results.at(-1);if(destroyed)return null;makeRoots(html);mounted=true;paint();slot.remove();host.removeAttribute('aria-busy');wrapper.dataset.aboutPanelReady='true';return {pane:()=>controller.status().pane,choose(next){controller.dispatch('choose_pane',next);paint();},reset,controller,destroy(){if(destroyed)return;destroyed=true;cleanup?.();viewerCleanup?.();for(const button of buttons)button.removeEventListener('click',onToggle);resetButton?.removeEventListener('click',reset);shadow.replaceChildren();}};
  }catch(error){cleanup?.();viewerCleanup?.();host.removeAttribute('aria-busy');wrapper.dataset.aboutPanelReady='error';wrapper.dataset.aboutPanelError=String(error?.message||error);destroyed=true;for(const button of buttons){button.removeEventListener('click',onToggle);button.hidden=true;}resetButton?.removeEventListener('click',reset);const fallbackStyle=doc.createElement('style');fallbackStyle.textContent=':host{display:block;color-scheme:dark;color:#dce0d6;font:16px/1.7 Care Sans,system-ui,sans-serif}*{box-sizing:border-box}a{color:#d7b18e;text-underline-offset:4px}section,article{padding:20px;background:#171d24;border:1px solid #39434a;border-radius:5px}';shadow.replaceChildren(fallbackStyle,...fallback);if(!shadow.querySelector('a[href]')){const link=doc.createElement('a');link.href=resolveAboutLibraryHref(panelReadingHref(panel,panes[0]),options.libraryOrigin);link.textContent='Open this reading in Library ↗';shadow.append(link);}if(status)status.textContent='The live example could not load. The saved reading is still available in the Library.';throw error;}
}

export function mountAboutPanels(options={}){
  const doc=options.document||globalThis.document;if(!doc)return {destroy(){}};let data=options.data;if(!data){try{data=JSON.parse(doc.getElementById('about-panel-data')?.textContent||'{}');}catch{data={};}}if(data.schema!=='care-about-panels/1')return {destroy(){}};
  const wrappers=[...doc.querySelectorAll('[data-about-live-panel]')],api=new Map(),pending=new Map();let destroyed=false;
  const mount=wrapper=>{if(pending.has(wrapper))return pending.get(wrapper);const panel=data.panels?.[wrapper.dataset.aboutLivePanel];if(!panel)return Promise.resolve(null);const loading=mountAboutPanel(wrapper,panel,options).then(value=>{if(destroyed)value?.destroy();else if(value)api.set(wrapper,value);return value;}).catch(error=>{options.onError?.(error,wrapper);return null;});pending.set(wrapper,loading);return loading;};
  const Observer=doc.defaultView?.IntersectionObserver,observer=Observer?new Observer(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);mount(entry.target);}},{rootMargin:'240px 0px'}):null;for(const wrapper of wrappers){if(observer)observer.observe(wrapper);else mount(wrapper);}
  return {mountAll:()=>Promise.all(wrappers.map(mount)),reset(){for(const value of api.values())value.reset();},destroy(){if(destroyed)return;destroyed=true;observer?.disconnect();for(const value of api.values())value.destroy();api.clear();}};
}
