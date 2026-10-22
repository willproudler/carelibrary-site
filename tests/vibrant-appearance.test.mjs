import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const readers=['study-desk','study-field'];
function readerHelpers(name){
  const source=read(`native/${name}.mjs`);
  const start=source.indexOf('const VIBRANT_VIEW_KEY=');
  const end=source.indexOf('\nfunction axiomCopyAttributes',start);
  assert.ok(start>=0&&end>start);
  return new Function(source.slice(start,end)+';return {setup:setupVibrantView,control:vibrantViewControl};')();
}
function viewerSetup(){
  const source=read('native/reference-viewer.mjs');
  return new Function(source.slice(source.indexOf('const VIEWER_VIBRANT_KEY'),source.indexOf('\nfunction setup(parentElement'))+';return setupViewerVibrantView;')();
}
function environment(entries=[],bodyState={}){
  const saved=new Map(entries),view=new EventTarget();
  view.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  view.CustomEvent=class extends Event{constructor(name,options){super(name);this.detail=options.detail;}};
  const doc={defaultView:view,body:{dataset:{...bodyState}}};
  const storage=(key,newValue)=>view.dispatchEvent(Object.assign(new Event('storage'),{key,newValue}));
  return {saved,view,doc,storage};
}
function mount(setup,env){
  const control={attrs:{},setAttribute(name,value){this.attrs[name]=value;},closest(selector){return selector==='[data-vibrant-view-toggle]'?this:null;}};
  const root=Object.assign(new EventTarget(),{ownerDocument:env.doc,dataset:{},querySelectorAll:()=>[control],contains:node=>node===control});
  const runtime={root,vibrantView:true,selectedAxiom:{id:'recorded-axiom'},data:{text:'Unchanged reading'}};
  setup(runtime);
  const click=()=>{const event=new Event('click',{cancelable:true});Object.defineProperty(event,'target',{value:control});root.dispatchEvent(event);};
  return {runtime,root,control,click};
}

test('old vibrant preferences and unversioned body state cannot enable any reader',()=>{
  for(const name of readers){
    const env=environment([['care-vibrant-view-v1','true']],{careVibrantView:'true'});
    const reader=mount(readerHelpers(name).setup,env),viewer=mount(viewerSetup(),env);
    for(const mounted of [reader,viewer]){
      assert.equal(mounted.runtime.vibrantView,false,name);
      assert.equal(mounted.root.dataset.vibrantView,'false');
    }
    assert.equal(reader.control.attrs['aria-pressed'],'false');
    assert.equal(env.doc.body.dataset.careVibrantViewVersion,'2');
    assert.equal(env.saved.has('care-vibrant-view-v2'),false,'Defaulting off does not create an opt-in');
    env.storage('care-vibrant-view-v1','true');
    assert.equal(reader.runtime.vibrantView,false);
    assert.equal(viewer.runtime.vibrantView,false);
  }
  const env=environment([['care-vibrant-view-v1','true']],{careVibrantView:'true'});
  const first=mount(viewerSetup(),env);
  assert.equal(first.runtime.vibrantView,false,'A reference viewer mounted first also ignores legacy state');
});

test('only an explicit current preference enables colours on initial mount',()=>{
  for(const setup of [...readers.map(name=>readerHelpers(name).setup),viewerSetup()]){
    const env=environment([['care-vibrant-view-v1','false'],['care-vibrant-view-v2','true']]);
    const reader=mount(setup,env);
    assert.equal(reader.runtime.vibrantView,true);
    assert.equal(env.doc.body.dataset.careVibrantViewVersion,'2');
    assert.equal(env.doc.body.dataset.careVibrantView,'true');
  }
});

test('advanced opt-in synchronizes books, fields and references without changing the reading',()=>{
  const env=environment([['care-vibrant-view-v1','true']]);
  const book=mount(readerHelpers('study-desk').setup,env);
  const field=mount(readerHelpers('study-field').setup,env);
  const viewer=mount(viewerSetup(),env);
  const selection=book.runtime.selectedAxiom,data=book.runtime.data;
  book.click();
  assert.equal(env.saved.get('care-vibrant-view-v2'),'true');
  for(const mounted of [book,field,viewer])assert.equal(mounted.runtime.vibrantView,true);
  assert.equal(book.runtime.selectedAxiom,selection);
  assert.equal(book.runtime.data,data);
  assert.equal(mount(viewerSetup(),env).runtime.vibrantView,true,'Later mounts adopt the shared current state');
  env.storage('care-vibrant-view-v2','false');
  for(const mounted of [book,field,viewer])assert.equal(mounted.runtime.vibrantView,false,'Storage event overrides cached body/session state');
  field.click();
  for(const mounted of [book,field,viewer])assert.equal(mounted.runtime.vibrantView,true);
  env.storage(null,null);
  for(const mounted of [book,field,viewer])assert.equal(mounted.runtime.vibrantView,false,'Clearing preferences restores quiet colours');
  viewer.runtime.cleanupVibrantView();
  field.runtime.cleanupVibrantView();
  book.click();
  assert.equal(viewer.runtime.vibrantView,false,'Detached references stop receiving events');
  assert.equal(field.runtime.vibrantView,false,'Detached field readers stop receiving events');
});

test('blocked storage defaults off and preserves only a new session opt-in',()=>{
  const env=environment([],{careVibrantView:'true'});
  Object.defineProperty(env.view,'localStorage',{get(){throw Error('Storage denied');}});
  const book=mount(readerHelpers('study-desk').setup,env);
  const viewer=mount(viewerSetup(),env);
  assert.equal(book.runtime.vibrantView,false);
  assert.equal(viewer.runtime.vibrantView,false);
  book.click();
  assert.equal(viewer.runtime.vibrantView,true);
  assert.equal(mount(readerHelpers('study-field').setup,env).runtime.vibrantView,true);
});

test('Vibrant colours starts inside a closed Advanced appearance disclosure',()=>{
  for(const name of readers){
    const control=readerHelpers(name).control();
    assert.match(control,/^<details class="reader-advanced-appearance"><summary>Advanced appearance<\/summary>/);
    assert.match(control,/data-vibrant-view-toggle[^>]*aria-pressed="false"/);
    assert.ok(control.endsWith('</button></details>'));
    assert.doesNotMatch(control,/<details[^>]*\bopen\b/);
  }
});

test('arrow navigation reaches Advanced appearance and skips its closed toggle',()=>{
  for(const name of readers){
    const source=read(`native/${name}.mjs`),start=source.indexOf('function setupReaderMenus(runtime){');
    const setup=new Function(source.slice(start,source.indexOf('\nfunction paneTab',start))+';return setupReaderMenus;')();
    let focused=null,open=false;
    const item=label=>({label,closest:()=>null,matches:()=>false,getClientRects:()=>label==='toggle'&&!open?[]:[{}],focus(){focused=this;}});
    const before=item('before'),summary=item('summary'),toggle=item('toggle'),after=item('after'),items=[before,summary,toggle,after];
    const trigger={};
    const panel={contains:node=>items.includes(node),querySelectorAll:selector=>items.filter(node=>node!==summary||selector.includes('summary'))};
    const root={ownerDocument:{defaultView:{}},querySelectorAll:()=>[trigger],querySelector:()=>null};
    const runtime={root,onKey(){throw Error('Reading shortcut must not handle menu keys');}};
    setup(runtime);
    runtime.readerMenu={panel,button:trigger};
    const down=target=>runtime.onKey({target,key:'ArrowDown',preventDefault(){},stopPropagation(){}});
    down(before);assert.equal(focused,summary,name);
    down(summary);assert.equal(focused,after,'Closed advanced options are skipped');
    open=true;
    down(summary);assert.equal(focused,toggle,'Opened advanced options join keyboard navigation');
  }
});

const bootURL=new URL('../boot.mjs',import.meta.url);
test('boot paints the current preference before loading the reader',{skip:!existsSync(bootURL)},()=>{
  const source=readFileSync(bootURL,'utf8'),load=source.indexOf("import('./public-app.mjs");
  assert.ok(load>0);
  const boot=new Function('document','localStorage',source.slice(0,load));
  for(const [entries,expected] of [
    [[['care-vibrant-view-v1','true']],false],
    [[['care-vibrant-view-v1','true'],['care-vibrant-view-v2','false']],false],
    [[['care-vibrant-view-v2','true']],true],
  ]){
    const env=environment(entries,{careVibrantView:'true'});
    boot(env.doc,env.view.localStorage);
    assert.equal(env.doc.body.dataset.careVibrantView,String(expected));
    assert.equal(env.doc.body.dataset.careVibrantViewVersion,'2');
    assert.equal(mount(readerHelpers('study-desk').setup,env).runtime.vibrantView,expected);
    assert.equal(mount(viewerSetup(),env).runtime.vibrantView,expected);
  }
  const env=environment([],{careVibrantView:'true'});
  boot(env.doc,{getItem(){throw Error('Storage denied');}});
  assert.equal(env.doc.body.dataset.careVibrantView,'false');
  assert.equal(env.doc.body.dataset.careVibrantViewVersion,'2');
});
