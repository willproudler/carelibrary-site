/* Discover uses the shipped field reader for published comparisons. */
import {fieldPayload,fieldReference,loadPublicField} from './public-fields.mjs?v=77525b5fe43e3a31';

const copy = value => structuredClone(value);

/** Pure, isolated state for one already loaded published lateral or corpus. */
export function createDiscoverFieldController(field,adapter) {
  if(!field?.id||!['lateral','corpus'].includes(field.field)||field.bundle?.id!==field.id||field.bundle?.field!==field.field)
    throw Error('This saved reading does not match the published field.');
  let state={fieldReference:null,fieldSelected:null,fieldBookStates:{},fieldSaved:{saved_panes:[],saved_axioms:[]}};
  const members=field.bundle.members||[];
  const memberId=member=>member.work_id||member.id;
  const workFor=id=>members.some(member=>memberId(member)===id)
    ? adapter.works.find(work=>work.id===id||work.version_work_id===id) : null;
  const memberWorkIds=[...new Set(members.map(member=>workFor(memberId(member))?.id).filter(Boolean))];
  const referenceFor=(id,scope='')=>{
    const reference=fieldReference(field,scope,id);
    if(!reference)throw Error('This route is not included in the published reading.');
    const key=Object.entries(field.references||{}).find(([,value])=>value===reference)?.[0]||'';
    return {...reference,source_pane:reference.source_pane||key.slice(0,key.lastIndexOf('|'))};
  };
  function open(request={}) {
    if(request.fieldId&&request.fieldId!==field.id||request.book&&request.book!=='field:'+field.id)
      throw Error('This field is no longer the selected published reading.');
    const id=String(request.ref??request.referenceId??'');
    if(id){
      const reference=referenceFor(id,String(request.scope??request.source_pane??''));
      state={...state,fieldReference:reference,fieldSelected:{id,source_pane:reference.source_pane}};
    }else if('ref' in request||'referenceId' in request)clearRoute();
    return getState();
  }
  function clearRoute(){state={...state,fieldReference:null};return getState();}
  function dispatch(action={}) {
    if(action.type==='open_reference')return open({ref:action.reference_id,scope:action.source_pane||''});
    if(action.type==='clear_reference')return clearRoute();
    if(action.type==='selected_axiom'){
      const id=action.value?.axiom_id||action.value?.passage_id;
      if(!id){state={...state,fieldSelected:null};return getState();}
      const reference=referenceFor(id,action.source_pane||'');
      state={...state,fieldSelected:{id,source_pane:reference.source_pane}};
    }else if(['load_member','load_members'].includes(action.type)){
      const ids=action.work_ids||[action.work_id];
      if(ids.some(id=>!workFor(id)))throw Error('This source book has not been published to the beta yet.');
    }else if(['open_work','open_chapter','open_sheet'].includes(action.type)){
      const work=workFor(action.work_id);
      if(!work)throw Error('This source book has not been published to the beta yet.');
      if(action.unit_id&&!(work.units||[]).some(unit=>unit.id===action.unit_id)||
         action.raw_unit_id&&!(work.sources||[]).some(source=>source.id===action.raw_unit_id))
        throw Error('This chapter or sheet is not in the published version of this source book.');
      state={...state,fieldBookStates:{...state.fieldBookStates,[action.work_id]:{
        workId:work.id,unitId:action.unit_id||'',rawUnitId:action.raw_unit_id||'',
      }}};
    }else if(action.type==='resolution'){
      if(state.fieldReference)state={...state,fieldReference:{...state.fieldReference,resolution:copy(action.resolution)}};
    }else if(['bookmark_action','axiom_favourite_action'].includes(action.type)){
      if(action.action==='open'){
        state={...state,fieldReference:null,fieldSavedFocus:{...action,unit_id:action.care_unit_id}};
      }else{
        const collection=action.type==='bookmark_action'?'saved_panes':'saved_axioms';
        const key=collection==='saved_panes'?'care_unit_id':'care_item_id';
        const values=state.fieldSaved[collection].filter(row=>row[key]!==action[key]||row.source_pane!==action.source_pane);
        if(action.active)values.push({...action,field_id:field.id});
        state={...state,fieldSaved:{...state.fieldSaved,[collection]:values}};
      }
    }
    return getState();
  }
  function getState(){return copy(state);}
  function status(){return {
    fieldId:field.id,title:field.title||field.bundle.title||field.id,
    referenceId:state.fieldReference?.id||'',scope:state.fieldReference?.source_pane||'',
    book:'field:'+field.id,connectionId:field.id,workId:memberWorkIds[0]||'',memberWorkIds:[...memberWorkIds],
  };}
  return {open,clearRoute,dispatch,getState,status,
    payload:()=>fieldPayload(field,adapter,state),href:()=>'./#field='+encodeURIComponent(field.id)};
}

const embedCSS=`
:host{display:block;height:100%;min-height:0;min-width:0;--st-font:system-ui,sans-serif;--st-code-font:ui-monospace,monospace}
.field-desk{height:100%;min-height:0;width:100%;box-sizing:border-box;border-radius:12px}
.discover-field-notice{position:absolute;z-index:70;left:1rem;right:1rem;top:3.5rem;margin:0;padding:.75rem 1rem;border:1px solid #665d76;border-radius:8px;background:#24202c;color:#ece8df;font:14px/1.5 system-ui,sans-serif}
`;

/** Mounts the reading into its own shadow root. */
export async function mountDiscoverField({host,field,adapter,fetcher,onStatus,onLibrary}) {
  if(!host)return null;
  const doc=host.ownerDocument,view=doc.defaultView;
  const fetchFile=fetcher||view.fetch.bind(view);
  host.setAttribute('aria-busy','true');
  let cleanup,noticeTimer,destroyed=false;
  try{
    const readText=async path=>{
      const response=await fetchFile(new URL(path,import.meta.url));
      if(!response.ok)throw Error('A reading component could not load. Please try again.');
      return response.text();
    };
    const [loaded,{default:mountField},css,scope]=await Promise.all([
      loadPublicField(field,(path,options)=>fetchFile(new URL(path,import.meta.url),options)),
      import('./native/study-field.mjs?v=77525b5fe43e3a31'),
      readText('./native/study-field.css?v=77525b5fe43e3a31'),
      readText('./native/public-scope.css?v=77525b5fe43e3a31'),
    ]);
    const controller=createDiscoverFieldController(loaded,adapter);
    const shadow=host.shadowRoot||host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>${css}\n${scope}\n${embedCSS}</style><div class="field-desk" data-field-desk tabindex="0"></div><p class="discover-field-notice" role="status" hidden></p>`;
    const noticeElement=shadow.querySelector('.discover-field-notice');
    const notify=()=>onStatus?.(controller.status());
    const notice=message=>{
      noticeElement.textContent=message;noticeElement.hidden=false;view.clearTimeout(noticeTimer);
      noticeTimer=view.setTimeout(()=>{noticeElement.hidden=true;},4500);
    };
    function paint(){
      if(destroyed)return;
      cleanup?.();
      cleanup=mountField({parentElement:shadow,data:controller.payload(),setStateValue:()=>{},setTriggerValue:(kind,action)=>{
        if(destroyed||kind!=='action')return;
        if(action.type==='library'){
          if(onLibrary)onLibrary(controller.href());else view.location.assign(controller.href());
          return;
        }
        try{
          controller.dispatch(action);
          if(action.type==='selected_axiom')notify();else paint();
        }catch(error){notice(error.message);}
      }});
      notify();
    }
    const api={
      open(request={}){controller.open(request);paint();return controller.status();},
      clearRoute(){controller.clearRoute();paint();return controller.status();},
      status:()=>controller.status(),
      destroy(){if(destroyed)return;destroyed=true;cleanup?.();view.clearTimeout(noticeTimer);shadow.replaceChildren();},
    };
    paint();
    return api;
  }catch(error){cleanup?.();throw error;}
  finally{host.removeAttribute('aria-busy');}
}
