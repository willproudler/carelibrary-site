/* The Discover page mounts CARE's shipped reader against the selected public
 * collection. No authoring, generation, account or private-library API is used. */
import mountReader from './native/study-desk.mjs?v=59d5753af7404ea2';
import {createPublicReaderAdapter} from './public-reader-adapter.mjs?v=59d5753af7404ea2';
import {createDiscoverReferenceViewer} from './discover-reference-viewer.mjs?v=59d5753af7404ea2';
import {loadPublicField} from './public-fields.mjs?v=59d5753af7404ea2';

export const DISCOVER_EXAMPLES = Object.freeze({
  hume:'CH_THN_INTR:AS1',
  kant:'CH_KPR_INTRODUCTION:AS1',
  bergson:'CH_MEMA_PHB0:AS1',
  lateral:'XR_KPR_THN:RSN-01',
});

const copy = value => structuredClone(value);
const routeKey = state => JSON.stringify([state.workId,state.connectionId,state.referenceId,state.connectionReferenceId,state.routeMode,state.connectionRouteMode,state.unitId,state.rawUnitId]);

export function discoverChoices(data) {
  const choices=(data.works||[]).map(work=>({value:work.slug,type:'book',id:work.id,
    label:[work.author,work.title].filter(Boolean).join(' · ')}));
  for(const field of data.fields||[]){
    if(!field.id||!['lateral','corpus'].includes(field.field)||choices.some(choice=>choice.type==='field'&&choice.id===field.id))continue;
    choices.push({value:'field:'+field.id,type:'field',id:field.id,
      label:`${field.field==='corpus'?'Corpus':'Lateral'} · ${field.title||field.id}`});
  }
  if(data.lateral?.id&&!choices.some(choice=>choice.type==='field'&&choice.id===data.lateral.id))
    choices.push({value:'lateral',type:'field',id:data.lateral.id,label:data.lateral.title||'Saved lateral'});
  return choices;
}

export function discoverInitialReading(data) {
  const choices=discoverChoices(data),featured=data.featured_reading;
  const selected=choices.find(choice=>choice.type===featured?.type&&choice.id===featured?.id)
    ||choices.find(choice=>choice.type==='book'&&choice.value==='hume')||choices[0];
  if(!selected)return null;
  return selected.value.startsWith('field:')?{field:selected.id}:{book:selected.value};
}

/** Pure controller, shared by the browser embed and the route integration tests. */
export function createDiscoverController(data) {
  const adapter=createPublicReaderAdapter(data),bookStates=new Map();
  const savedLateral=data.lateral?.id ? data.lateral : null;
  const defaultWork=(data.featured_reading?.type==='book'&&data.works.find(work=>work.id===data.featured_reading.id))
    ||adapter.workFor('hume') || data.works[0];
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
  open({book:defaultWork.slug});
  return {adapter,open,dispatch,getState,payload,status,href};
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
 * #discover-book: published book slugs, legacy lateral, or field:<id>; #discover-open: reading link.
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
    const urls=['./data/library.json','./native/study-desk.css?v=59d5753af7404ea2','./native/public-scope.css?v=59d5753af7404ea2'];
    const [data,css,scope]=await Promise.all(urls.map(async (url,index)=>{
      const response=await fetcher(new URL(url,import.meta.url),index===0?{cache:'no-cache'}:{});
      if(!response.ok)throw Error('The reading could not load. Please try again.');
      return index===0?response.json():response.text();
    }));
    const controller=data.works?.length?createDiscoverController(data):null;
    const adapter=controller?.adapter||createPublicReaderAdapter(data),choices=discoverChoices(data);
    const bookViewer=await createDiscoverReferenceViewer({document:doc,fetcher,onAction:action=>{
      const node=adapter.index.nodes.get(action.id);if(!node||!controller)return;
      if(action.type==='studio_open_reference')open({book:node.work?.slug,ref:node.id});
      else if(action.type==='studio_open_sheet')open({book:node.work?.slug,unit:node.unit.id});
    }});
    if(!choices.length)throw Error('No readings have been published yet.');
    if(selector){
      selector.replaceChildren(...choices.map(choice=>{const option=doc.createElement('option');option.value=choice.value;option.textContent=choice.label;return option;}));
    }
    const shadow=host.shadowRoot||host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>${css}\n${scope}\n${embedCSS}</style><div data-discover-book style="height:100%;min-height:0"><div class="study-desk" data-study-desk tabindex="0" style="height:100%;min-height:0"></div></div>`;
    const bookHost=shadow.querySelector('[data-discover-book]'),mapSection=doc.querySelector('#discover-atlas')?.closest('section');
    let cleanup,fieldApi,fieldHost,destroyed=false,paintQueued=false,requestVersion=0;
    const notify=message=>{if(statusElement)statusElement.textContent=message;};
    const status=()=>fieldApi?fieldApi.status():controller?.status();
    function publish(current=status()){
      if(!current)return;
      host.dataset.book=current.book;host.dataset.reference=current.referenceId||'';
      if(selector)selector.value=current.book;
      if(mapSection)mapSection.hidden=Boolean(current.fieldId);
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
      const state=controller.getState(),id=state.selectedAxiom?.passage_id||state.selectedAxiom?.axiom_id||state.connectionSelection?.reference_id||state.connectionReferenceId||state.referenceId||'';
      const references=[...adapter.index.nodes.values()].filter(node=>['claim','passage'].includes(node.kind)&&(node.work?.id===state.workId||node.unit?.id===state.connectionId)).map(node=>({...adapter.card(node.id,{state}),kind:node.kind==='passage'?'passage':'axiom',resolved:true}));
      bookViewer.render({studio_mode:true,references,default_id:id,default_kind:adapter.index.nodes.get(id)?.kind==='passage'?'passage':'axiom',follow_default:true});
      publish();
    }
    function queuePaint(){
      if(paintQueued)return;paintQueued=true;
      queueMicrotask(()=>{paintQueued=false;paint();});
    }
    function dispatch(kind,value){
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
          const [field,module]=await Promise.all([loadPublicField(published,fetcher),import('./discover-field-reader.mjs?v=59d5753af7404ea2')]);
          if(destroyed||version!==requestVersion)return;
          const nextHost=doc.createElement('div');nextHost.style.cssText='height:100%;min-height:0';
          const nextApi=await module.mountDiscoverField({host:nextHost,field,adapter,fetcher,
            onStatus:current=>{if(!destroyed&&fieldHost===nextHost)publish(current);},
            onLibrary:href=>{view.location.href=href;}});
          if(destroyed||version!==requestVersion){nextApi.destroy();return;}
          removeField();cleanup?.();cleanup=null;bookViewer.hide();bookHost.hidden=true;
          fieldHost=nextHost;fieldApi=nextApi;shadow.append(nextHost);
          if(request.ref)fieldApi.open({...request,fieldId:identity});
          publish();
        }else{
          if(!controller)throw Error('Choose a published lateral or corpus.');
          controller.open(request);removeField();paint();
        }
      }catch(error){
        if(version!==requestVersion||destroyed)return;
        if(!fieldApi&&controller)paint();
        notify(error.message);
      }finally{if(version===requestVersion)host.removeAttribute('aria-busy');}
    }
    const receive=event=>open(event.detail||{}),choose=()=>open({book:selector.value});
    const close=()=>fieldApi?fieldApi.clearRoute():controller&&dispatch(controller.status().connectionId?'connection_action':'clear_reference',controller.status().connectionId?{action:'clear_reference'}:true);
    const closeButtons=[...doc.querySelectorAll('[data-discover-close-route]')];
    selector?.addEventListener('change',choose);closeButtons.forEach(button=>button.addEventListener('click',close));
    view.removeEventListener('care:discover-open',receiveEarly);view.addEventListener('care:discover-open',receive);
    const api={open,status,destroy(){destroyed=true;++requestVersion;cleanup?.();bookViewer.destroy();removeField();if(mapSection)mapSection.hidden=false;selector?.removeEventListener('change',choose);closeButtons.forEach(button=>button.removeEventListener('click',close));view.removeEventListener('care:discover-open',receive);delete host.discoverReader;}};
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
