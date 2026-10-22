import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../native/reference-viewer.mjs',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('function dismissMobileViewerOutside('),source.indexOf('function setup(parentElement'));
const dismiss=new Function(helper+';return dismissMobileViewerOutside;')();
const closeSource=source.match(/  runtime\.onClose = .*\n/)[0];

class Node {
  constructor(parent=null){this.parent=parent;}
  contains(node){for(let current=node;current;current=current.parent)if(current===this)return true;return false;}
}
function fixture(width=390){
  const root=new Node(),panel=new Node(root),launcher=new Node(root),inside=new Node(panel),outside=new Node(),shadowHost=new Node();
  let currentWidth=width,renderCount=0;
  root.ownerDocument={defaultView:{matchMedia:query=>({matches:query==='(max-width: 640px)'&&currentWidth<=640})}};
  const selected={id:'CH_EXAMPLE:A1',text:'The selected axiom'};
  const runtime={root,panel,launcher,open:true,selected,previewSource:'source',surface:'tools',toolScreen:'history',render(){renderCount++;}};
  new Function('runtime',closeSource)(runtime);
  const fire=(target=outside,extra={})=>{
    let prevented=false,stopped=false;
    const event={type:'click',target,button:0,defaultPrevented:false,composedPath:()=>[target],preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;},...extra};
    return {dismissed:dismiss(runtime,event),get prevented(){return prevented;},get stopped(){return stopped;}};
  };
  return {runtime,root,panel,launcher,inside,outside,shadowHost,selected,fire,set width(value){currentWidth=value;},get renderCount(){return renderCount;}};
}

test('a phone outside tap closes once, preserves the selected axiom and consumes the underlying activation',()=>{
  const f=fixture();let activations=0;
  const first=f.fire();if(!first.stopped)activations++;
  assert.equal(first.dismissed,true);assert.equal(first.prevented,true);assert.equal(first.stopped,true);
  assert.equal(f.runtime.open,false);assert.equal(f.runtime.previewSource,null);
  assert.equal(f.runtime.surface,'read');assert.equal(f.runtime.toolScreen,'home');
  assert.equal(f.runtime.selected,f.selected);assert.equal(f.renderCount,1);assert.equal(activations,0);
  const next=f.fire();if(!next.stopped)activations++;
  assert.equal(next.dismissed,false);assert.equal(next.prevented,false);assert.equal(activations,1);
});

test('panel controls and launcher taps remain native, including shadow-retargeted clicks',()=>{
  const f=fixture();
  for(const target of [f.panel,f.inside,f.launcher,new Node(f.launcher)]){
    const result=f.fire(target,{composedPath:undefined});
    assert.equal(result.dismissed,false);assert.equal(result.prevented,false);assert.equal(result.stopped,false);
  }
  const shadowResult=f.fire(f.shadowHost,{composedPath:()=>[f.inside,f.panel,f.root,f.shadowHost]});
  assert.equal(shadowResult.dismissed,false);assert.equal(f.runtime.open,true);assert.equal(f.renderCount,0);
});

test('blank areas and reader headers across shadow roots dismiss on phones only',()=>{
  const f=fixture(640);
  const result=f.fire(f.shadowHost,{composedPath:()=>[new Node(),f.shadowHost]});
  assert.equal(result.dismissed,true);
  const desktop=fixture(641),click=desktop.fire();
  assert.equal(click.dismissed,false);assert.equal(click.prevented,false);assert.equal(click.stopped,false);assert.equal(desktop.runtime.open,true);
  desktop.width=390;assert.equal(desktop.fire().dismissed,true,'The current viewport is checked on each tap');
});

test('scrolling, touch cancellation and non-primary gestures do not dismiss or prevent native input',()=>{
  const f=fixture();
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','touchmove','scroll','contextmenu']){
    const result=f.fire(f.outside,{type});
    assert.equal(result.dismissed,false,type);assert.equal(result.prevented,false,type);assert.equal(result.stopped,false,type);
  }
  for(const extra of [{button:2},{metaKey:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{defaultPrevented:true}]){
    assert.equal(f.fire(f.outside,extra).dismissed,false);
  }
  assert.equal(f.runtime.open,true);assert.equal(f.renderCount,0);
});

test('outside dismissal runs before the viewer can select or activate an underlying reference',()=>{
  const f=fixture();
  const handler=source.slice(source.indexOf('  runtime.onDocumentClick = event => {'),source.indexOf('  runtime.eventComesFromEditable = event => {'));
  new Function('runtime','root',helper+handler)(f.runtime,f.root);
  let prevented=false,stopped=false;
  // A ReferenceError in the remaining legacy handler would reveal a failure to return early.
  f.runtime.onDocumentClick({type:'click',button:0,target:f.outside,composedPath:()=>[f.outside],preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
  assert.equal(f.runtime.open,false);assert.equal(f.runtime.selected,f.selected);assert.equal(prevented,true);assert.equal(stopped,true);
});
