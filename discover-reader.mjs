/* The Discover page mounts CARE's shipped reader against the selected public
 * collection. No authoring, generation, account or private-library API is used. */
import mountReader from './native/study-desk.mjs?v=ecc3f42e94e19788';
import {createPublicReaderAdapter} from './public-reader-adapter.mjs?v=d6fb94305f051e89';
import {mountDiscoverBookPicker} from './discover-book-picker.mjs?v=20261016-books';
import {loadPublicField,loadFieldMembers} from './public-fields.mjs?v=8256b20bae53e80f';
import {loadLibrary} from './library-loader.mjs';

export const DISCOVER_EXAMPLES = Object.freeze({
  hume:'CH_THN_INTR:AS1',
  kant:'CH_KPR_INTRODUCTION:AS1',
  bergson:'CH_MEMA_PHB0:AS1',
  lateral:'XR_KPR_THN:RSN-01',
});

const copy = value => structuredClone(value);
const routeKey = state => JSON.stringify([state.workId,state.connectionId,state.referenceId,state.connectionReferenceId,state.routeMode,state.connectionRouteMode,state.unitId,state.rawUnitId]);

export function discoverChoices(data) {
  return (data.works||[]).map(work=>({value:work.slug,type:'book',id:work.id,
    author:work.author||'',title:work.title,
    label:[work.author,work.title].filter(Boolean).join(' · ')}));
}

export function discoverInitialReading(data) {
  const choices=discoverChoices(data);
  const selected=choices.find(choice=>choice.value==='hume')||choices[0];
  return selected?{book:selected.value}:null;
}

/** Pure controller, shared by the browser embed and the route integration tests. */
export function createDiscoverController(data) {
  let adapter=createPublicReaderAdapter(data),savedLateral=data.lateral?.id ? data.lateral : null;
  let indexedWorks=[...data.works],indexedLateral=data.lateral;
  const bookStates=new Map();
  const defaultWork=adapter.workFor('hume') || data.works[0];
  if(!defaultWork)throw Error('No books have been published yet.');
  const exampleFor=work=>{
    const preferred=adapter.index.nodes.get(DISCOVER_EXAMPLES[work.slug]);
    if(preferred?.work?.id===work.id&&preferred.kind==='claim')return preferred.id;
    return [...adapter.index.nodes.values()].find(node=>node.work?.id===work.id&&node.kind==='claim')?.id||'';
  };
  const lateralExample=()=>{
    const preferred=adapter.index.nodes.get(DISCOVER_EXAMPLES.lateral);
    return preferred?.unit?.id===savedLateral?.id ? preferred.id :
      savedLateral?.sections?.flatMap(section=>section.items||[])[0]?.id||'';
  };
  let state,history=[],position=-1;
  const key=()=>state.connectionId?'lateral':adapter.workFor(state.workId).slug;
  const remember=()=>{
    bookStates.set(key(),copy(state));
    if(history[position]&&routeKey(history[position])===routeKey(state))return;
    history=history.slice(0,position+1);history.push(copy(state));position=history.length-1;
  };
  const normalise=next=>{
    const payload=adapter.workspace(next);
    if(payload.reference)next.routeMode=payload.reference.route_mode;
    if(payload.connection?.reference)next.connectionRouteMode=payload.connection.reference.route_mode;
    return next;
  };
  function open(request={}) {
    const referenceId=String(request.ref||''),unitId=String(request.unit||'');
    const node=adapter.index.nodes.get(referenceId||unitId);
    if((referenceId||unitId)&&!node)throw Error('This reading is not in the public collection.');
    if(referenceId&&!['claim','passage'].includes(node.kind))throw Error('Choose an individual claim or passage to open its route.');
    const lateral=Boolean(request.book==='lateral'||savedLateral&&(unitId===savedLateral.id||node?.unit?.id===savedLateral.id));
    if(lateral&&!savedLateral)throw Error('This lateral is no longer published. Choose a book from the Library.');
    const book=lateral?'lateral':request.book||node?.work?.slug||defaultWork.slug;
    const work=lateral ? data.works.find(work=>work.id===defaultWork.id&&work.units.some(unit=>savedLateral.parents.includes(unit.id)))
      ||data.works.find(work=>work.units.some(unit=>savedLateral.parents.includes(unit.id)))||defaultWork : adapter.workFor(book);
    if(!work)throw Error('This book is not in the public collection.');
    if(!lateral&&node&&node.work?.id!==work.id)throw Error('This reference belongs to a different book.');
    if(state)bookStates.set(key(),copy(state));
    let next=bookStates.has(book)?copy(bookStates.get(book)):{workId:work.id,routeMode:'both',outlineUnits:[],referenceId:exampleFor(work)};
    if(lateral){next.workId=work.id;next.connectionId=savedLateral.id;next.referenceId='';next.connectionReferenceId=referenceId||next.connectionReferenceId||lateralExample();next.connectionRouteMode=request.routeMode||next.connectionRouteMode||'incoming';}
    else if(referenceId){next.referenceId=referenceId;next.routeMode=request.routeMode||'both';next.selectedAxiom=null;}
    else if(unitId){
      if(!['unit','source'].includes(node.kind))throw Error('Choose a chapter or CARE sheet to read.');
      next.referenceId='';next.unitId=node.kind==='unit'?unitId:'';next.rawUnitId=node.kind==='source'?unitId:'';next.selectedAxiom=null;
    }
    state=normalise(next);remember();return getState();
  }
  function dispatch(kind,value){
    if(kind==='open_work')return open({book:adapter.workFor(value)?.slug||value});
    if(kind==='open_field')return savedLateral&&value===savedLateral.id?open({book:'lateral'}):getState();
    if(kind==='navigate_route'){
      const target=position+Number(value);
      if(![-1,1].includes(Number(value))||target<0||target>=history.length)return getState();
      bookStates.set(key(),copy(state));position=target;state=copy(history[position]);return getState();
    }
    if(kind==='open_reference'){
      const node=adapter.index.nodes.get(value);
      if(!node||!['claim','passage'].includes(node.kind))return getState();
    }
    if(kind==='connection_action'&&value?.action==='open')return open({book:'lateral'});
    const next=adapter.reduce(state,kind,value);
    if(next===state)return getState();
    state=normalise(next);
    if(kind!=='selected_axiom'&&kind!=='open_outline_sheet')remember();
    return getState();
  }
  function getState(){return copy(state);}
  function payload(){return adapter.workspace({...state,routeHistory:{can_back:position>0,can_forward:position<history.length-1}});}
  function status(){
    const work=adapter.workFor(state.workId),referenceId=state.connectionReferenceId||state.referenceId||'';
    return {workId:work.id,book:key(),referenceId,routeMode:state.connectionReferenceId?state.connectionRouteMode:state.routeMode,
      unitId:state.unitId||state.rawUnitId||'',connectionId:state.connectionId||'',title:state.connectionId?savedLateral?.title||work.title:work.title};
  }
  function href(){
    const current=status(),params=new URLSearchParams();
    if(current.connectionId)params.set('lateral',current.connectionId);else params.set('book',current.book);
    if(current.referenceId)params.set('ref',current.referenceId);
    else if(state.unitId)params.set('unit',state.unitId);
    else if(state.rawUnitId)params.set('source',state.rawUnitId);
    return './#'+params;
  }
  function refresh(){
    if(indexedLateral===data.lateral&&indexedWorks.length===data.works.length&&indexedWorks.every((work,i)=>work===data.works[i]))return adapter;
    adapter=createPublicReaderAdapter(data);savedLateral=data.lateral?.id ? data.lateral : null;
    indexedWorks=[...data.works];indexedLateral=data.lateral;
    return adapter;
  }
  open({book:defaultWork.slug});
  return {get adapter(){return adapter;},refresh,open,dispatch,getState,payload,status,href};
}

/** Load only the book (or comparison parents) needed by this request. */
export async function prepareDiscoverReading(library,request={}) {
  if(request.book==='lateral')await library.ensureLateral();
  else if(request.book)await library.ensureWork(request.book);
  const reference=request.ref||request.unit||request.source;
  if(reference)await library.ensureReference(reference);
  if(!request.book&&!reference){
    const initial=discoverInitialReading(library.data);
    if(initial)await library.ensureWork(initial.book);
  }
  return library.data;
}

const embedCSS = `
:host{display:block;min-width:0;--st-font:system-ui,sans-serif;--st-code-font:ui-monospace,SFMono-Regular,Menlo,monospace}
.study-desk{width:100%;height:100%;max-height:100%;min-height:0;box-sizing:border-box;border-radius:12px}
.desk-title{min-width:0}.desk-toolbar{align-content:start}
/* Saved items remain available in the full public reading room. */
.desk-bookmark-control,.pane-bookmark,.reader-axiom-mark,.desk-skin{display:none!important}
.reader-has-mark{padding-right:0}
`;

/** Auto-mounts #discover-reader. External controls may be omitted.
 * #discover-book: searchable published-book chooser; #discover-open: reading link.
 * #discover-reader-status: optional live status; [data-discover-close-route]: optional close button.
 * window care:discover-open detail: {book?,field?,ref?,scope?,unit?,routeMode?}.
 * window care:discover-route detail: {workId,book,referenceId,routeMode,unitId,connectionId,title}.
 * host.discoverReader exposes open(), status(), destroy() after care:discover-ready.
 */
export async function mountDiscoverReader(host,options={}) {
  if(!host)return null;
  const doc=host.ownerDocument,view=doc.defaultView;
  const selector=doc.querySelector('#discover-book'),openLink=doc.querySelector('#discover-open');
  const statusElement=doc.querySelector('#discover-reader-status');
  let loadingRequest=null;
  const receiveEarly=event=>{loadingRequest=event.detail||{};};
  view.addEventListener('care:discover-open',receiveEarly);
  host.setAttribute('aria-busy','true');
  try{
    const fetcher=options.fetch||view.fetch.bind(view);
    const readText=async url=>{
      const response=await fetcher(new URL(url,import.meta.url));
      if(!response.ok)throw Error('The reading could not load. Please try again.');
      return response.text();
    };
    const [library,css,scope]=await Promise.all([
      options.library||loadLibrary(options.fetch?{fetch:options.fetch}:{}),
      readText('./native/study-desk.css?v=ecc3f42e94e19788'),
      readText('./native/public-scope.css?v=d6fb94305f051e89'),
    ]);
    const data=await prepareDiscoverReading(library);
    const controller=data.works?.length?createDiscoverController(data):null;
    const choices=discoverChoices(data);
    if(!choices.length)throw Error('No books have been published yet.');
    const picker=mountDiscoverBookPicker(selector,choices,book=>open({book}));
    const shadow=host.shadowRoot||host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>${css}\n${scope}\n${embedCSS}</style><div data-discover-book style="height:100%;min-height:0"><div class="study-desk" data-study-desk data-skin="care" tabindex="0" style="height:100%;min-height:0"></div></div>`;
    const bookHost=shadow.querySelector('[data-discover-book]');
    let cleanup,fieldApi,fieldHost,destroyed=false,paintQueued=false,requestVersion=0;
    const notify=message=>{if(statusElement)statusElement.textContent=message;};
    const status=()=>fieldApi?fieldApi.status():controller?.status();
    function publish(current=status()){
      if(!current)return;
      host.dataset.book=current.book;host.dataset.reference=current.referenceId||'';
      picker?.select(current.book);
      if(openLink){openLink.href=current.fieldId?'./#field='+encodeURIComponent(current.fieldId):controller.href();openLink.setAttribute('aria-label',`Open ${current.title} in the reading room`);}
      notify(current.referenceId?'A saved route is open. Select a passage or claim to explore its connections.':'Read every scale. Select a passage or claim, then choose Routes to follow its connections.');
      view.dispatchEvent(new view.CustomEvent('care:discover-route',{detail:current}));
    }
    function removeField(){fieldApi?.destroy();fieldApi=null;fieldHost?.remove();fieldHost=null;}
    function paint(){
      if(destroyed||!controller||fieldApi)return;
      bookHost.hidden=false;
      cleanup?.();cleanup=mountReader({parentElement:bookHost,data:controller.payload(),
        setStateValue:(kind,value)=>{controller.dispatch(kind,value);},setTriggerValue:dispatch});
      const readButton=bookHost.querySelector('[data-reader-view="normal"]');if(readButton)readButton.textContent='Read';
      publish();
    }
    function queuePaint(){
      if(paintQueued)return;paintQueued=true;
      queueMicrotask(()=>{paintQueued=false;paint();});
    }
    function dispatch(kind,value){
      if(kind==='open_work'){open({book:controller?.adapter.workFor(value)?.slug||value});return;}
      if(kind==='open_field'&&value===data.lateral?.id||kind==='connection_action'&&value?.action==='open'){open({book:'lateral'});return;}
      try{controller?.dispatch(kind,value);queuePaint();}catch(error){notify(error.message);}
    }
    async function open(request={}){
      const version=++requestVersion;
      const identity=request.field||(String(request.book||'').startsWith('field:')?String(request.book).slice(6):'');
      try{
        if(identity){
          const published=(data.fields||[]).find(field=>field.id===identity);
          if(!published)throw Error('This reading is no longer in the public collection.');
          if(fieldApi?.status().fieldId===identity){fieldApi.open({...request,fieldId:identity});publish();return;}
          host.setAttribute('aria-busy','true');notify('Opening the saved reading…');
          const [field,module]=await Promise.all([loadPublicField(published,fetcher),import('./discover-field-reader.mjs?v=8256b20bae53e80f')]);
          if(destroyed||version!==requestVersion)return;
          await loadFieldMembers(field,library);
          if(destroyed||version!==requestVersion)return;
          const adapter=controller?.refresh()||createPublicReaderAdapter(data);
          const nextHost=doc.createElement('div');nextHost.style.cssText='height:100%;min-height:0';
          const nextApi=await module.mountDiscoverField({host:nextHost,field,adapter,fetcher,
            loadMembers:async ids=>({memberIds:await loadFieldMembers(field,library,ids),adapter:controller?.refresh()||createPublicReaderAdapter(data)}),
            onStatus:current=>{if(!destroyed&&fieldHost===nextHost)publish(current);},
            onLibrary:href=>{view.location.href=href;}});
          if(destroyed||version!==requestVersion){nextApi.destroy();return;}
          removeField();cleanup?.();cleanup=null;bookHost.hidden=true;
          fieldHost=nextHost;fieldApi=nextApi;shadow.append(nextHost);
          if(request.ref)fieldApi.open({...request,fieldId:identity});
          publish();
        }else{
          if(!controller)throw Error('Choose a published lateral or corpus.');
          host.setAttribute('aria-busy','true');notify('Opening the reading…');
          await prepareDiscoverReading(library,request);
          if(destroyed||version!==requestVersion)return;
          controller.refresh();
          controller.open(request);removeField();paint();
        }
      }catch(error){
        if(version!==requestVersion||destroyed)return;
        if(!fieldApi&&controller)paint();
        notify(error.message);
      }finally{if(version===requestVersion)host.removeAttribute('aria-busy');}
    }
    const receive=event=>open(event.detail||{});
    const close=()=>fieldApi?fieldApi.clearRoute():controller&&dispatch(controller.status().connectionId?'connection_action':'clear_reference',controller.status().connectionId?{action:'clear_reference'}:true);
    const closeButtons=[...doc.querySelectorAll('[data-discover-close-route]')];
    closeButtons.forEach(button=>button.addEventListener('click',close));
    view.removeEventListener('care:discover-open',receiveEarly);view.addEventListener('care:discover-open',receive);
    const api={open,status,destroy(){destroyed=true;++requestVersion;cleanup?.();removeField();picker?.destroy();closeButtons.forEach(button=>button.removeEventListener('click',close));view.removeEventListener('care:discover-open',receive);delete host.discoverReader;}};
    host.discoverReader=api;
    await open(loadingRequest||discoverInitialReading(data));
    view.dispatchEvent(new view.CustomEvent('care:discover-ready',{detail:status()}));
    return api;
  }catch(error){
    view.removeEventListener('care:discover-open',receiveEarly);host.removeAttribute('aria-busy');
    const message=doc.createElement('p');message.textContent=error.message;
    const retry=doc.createElement('button');retry.type='button';retry.className='button small';retry.textContent='Try loading the reading again';
    retry.addEventListener('click',()=>{retry.disabled=true;mountDiscoverReader(host,options);},{once:true});
    host.replaceChildren(message,retry);return null;
  }
}

if(typeof document!=='undefined'){
  const start=()=>mountDiscoverReader(document.querySelector('#discover-reader'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
