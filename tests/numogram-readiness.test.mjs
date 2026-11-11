import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../native/numogram-atlas.mjs',import.meta.url),'utf8')
 .replace(/^import .*;\n/gm,'').replace(/^export \{.*\};\n/gm,'')
 .replace('export default function mountNumogramAtlas','return function mountNumogramAtlas')
 .replaceAll('import.meta.url',JSON.stringify(new URL('../native/numogram-atlas.mjs',import.meta.url).href));

function fixture(){
 const frames=new Map(),events=[];let next=0,selected='',rendered=false,disposals=0;
 const frame={requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),
  CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}}};
 const shadow={set innerHTML(value){this.html=value;},querySelector:()=>rendered?{childElementCount:4}:null,
  replaceChildren(){rendered=false;}};
 const host={ownerDocument:{defaultView:frame},dataset:{},isConnected:true,
  attachShadow(){this.shadowRoot=shadow;return shadow;},setAttribute(){},removeAttribute(){},
  dispatchEvent(event){events.push({type:event.type,selected});}};
 const mountInstrument=({data})=>{
  data.bindReferenceOpen(value=>{selected=value.id;});rendered=true;
  return ()=>{disposals++;};
 };
 const mount=new Function('mountInstrument','reference','arithmetic','css','html',source)(mountInstrument,
  {demons:[{id:'MESH-00',poles:[1,0]}]}, {zones:[{id:0},{id:1}]}, '', '<section class="nl"></section>');
 return {mount,host,frames,events,get disposals(){return disposals;},paint(){for(const [id,fn] of [...frames]){frames.delete(id);fn();}}};
}

test('NUMO readiness follows real mounted content and an immediately selected demon',()=>{
 const f=fixture(),instance=f.mount(f.host);
 assert.deepEqual(f.events,[]);
 instance.openReference({kind:'demon',id:'MESH-00'});
 f.paint();
 assert.deepEqual(f.events,[{type:'care:numo-ready',selected:'MESH-00'}]);
 assert.equal(f.host.dataset.careNumoReady,'true');
 instance.unmount();assert.equal(f.host.dataset.careNumoReady,undefined);assert.equal(f.disposals,1);
});

test('leaving before first frame cancels readiness and preserves a newer mount owner',()=>{
 const f=fixture(),old=f.mount(f.host);
 old.unmount();f.paint();assert.deepEqual(f.events,[]);
 const current=f.mount(f.host);old.unmount();
 // A previous cleanup must not claim or clear the newer readiness marker.
 f.paint();assert.equal(f.events.length,1,'the newer populated mount announces its own readiness');
 current.unmount();assert.equal(f.frames.size,0);
});
