import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const generator=readFileSync(new URL('../tools/static_catalogue.py',import.meta.url),'utf8');
const script=generator.match(/BOOT_SCRIPT = r"""([\s\S]*?)"""/)[1];
function loading({navigation='navigate',embedded=false,online=true,hidden=false}={}){
 const status={textContent:'Opening the library…'},actions={hidden:true};
 let removed=false,reloads=0,cleared=false;
 const panel={querySelector:selector=>selector.includes('-status')?status:actions,remove(){removed=true;}};
 const listeners=new Map(),timers=[];
 const entry={addEventListener:(name,callback)=>listeners.set('entry:'+name,callback)};
 const document={hidden,documentElement:{dataset:{}},getElementById:id=>id==='care-library-loading'&&!removed?panel:null,
  querySelector:selector=>selector.includes('library-boot')?entry:null,
  addEventListener:(name,callback)=>listeners.set(name,callback)};
 const window={performance:{getEntriesByType:()=>navigation?[{type:navigation}]:[]},navigator:{onLine:online},
  addEventListener:(name,callback)=>listeners.set(name,callback)};
 window.top=embedded?{}:window;
 vm.runInNewContext(script,{window,document,location:{reload(){reloads++;}},
  setTimeout:(callback,delay)=>{timers.push({callback,delay});return timers.length;},
  clearTimeout(id){if(id){timers[id-1].cancelled=true;cleared=true;}}});
 return {window,document,status,actions,listeners,timers,get removed(){return removed;},get reloads(){return reloads;},get cleared(){return cleared;}};
}

test('the first synchronous script covers pending module loads and releases only on ready',()=>{
 const view=loading();
 assert.equal(view.document.documentElement.dataset.careLibraryBoot,'loading');
 assert.equal(view.removed,false);
 assert.equal(view.actions.hidden,true);
 view.window.CARELibraryBoot.ready();
 assert.equal(view.document.documentElement.dataset.careLibraryBoot,'ready');
 assert.equal(view.removed,true);
 assert.equal(view.cleared,true);
});

test('a stalled module on a reload still offers recovery and accepts late success',()=>{
 const view=loading({navigation:'reload'});
 assert.equal(view.timers[0].delay,20000);
 view.timers[0].callback();
 assert.equal(view.document.documentElement.dataset.careLibraryBoot,'slow');
 assert.equal(view.actions.hidden,false);
 assert.equal(view.reloads,0);
 assert.match(view.status.textContent,/longer than usual/);
 assert.equal(view.removed,false);
 view.window.CARELibraryBoot.ready();
 assert.equal(view.removed,true,'A late successful load still reveals the app');
});

test('a stalled fresh visit restarts once and a repeated stall offers the catalogue',()=>{
 const first=loading();
 first.timers[0].callback();
 first.listeners.get('visibilitychange')();
 assert.equal(first.reloads,1);
 for(const options of [{navigation:'reload'},{embedded:true},{navigation:null}]){
  const next=loading(options);
  next.timers[0].callback();
  assert.equal(next.reloads,0);
  assert.equal(next.actions.hidden,false);
 }
});

test('an entry module failure can recover on reconnect or return to the tab',()=>{
 const view=loading({online:false,hidden:true});
 view.listeners.get('entry:error')();
 assert.equal(view.reloads,0);
 view.window.navigator.onLine=true;
 view.listeners.get('online')();
 assert.equal(view.reloads,0);
 view.document.hidden=false;
 view.listeners.get('visibilitychange')();
 assert.equal(view.reloads,1);
});

test('a deep link gets time to load its book and still recovers if the route hangs',()=>{
 const reading=loading();
 reading.window.CARELibraryBoot.openingRoute();
 assert.equal(reading.timers[0].cancelled,true);
 reading.timers[1].callback();
 assert.equal(reading.actions.hidden,false);
 assert.equal(reading.reloads,0);
 assert.ok(reading.timers[1].delay+reading.timers[2].delay>90000);
 reading.timers[2].callback();
 assert.equal(reading.reloads,1);
 const completed=loading();
 completed.window.CARELibraryBoot.openingRoute();
 completed.timers[1].callback();
 completed.window.CARELibraryBoot.ready();
 assert.equal(completed.timers[2].cancelled,true);
});

test('returning to a recovered tab does not restart it',()=>{
 const tab=loading({hidden:true});
 tab.timers[0].callback();
 tab.window.CARELibraryBoot.ready();
 tab.document.hidden=false;
 tab.listeners.get('visibilitychange')();
 assert.equal(tab.reloads,0);
});

test('session or app failures show retry and a text route on the solid loading surface',()=>{
 const view=loading();
 view.window.CARELibraryBoot.fail(new Error('network failure'));
 assert.equal(view.document.documentElement.dataset.careLibraryBoot,'error');
 assert.equal(view.actions.hidden,false);
 assert.equal(view.removed,false);
 assert.match(view.status.textContent,/could not load/);
 assert.equal(view.reloads,0);
 view.listeners.get('click')({target:{closest:()=>({})}});
 assert.equal(view.reloads,1);
 assert.equal(view.cleared,true);
});

test('native mounting retains the crawler catalogue in the live document',()=>{
 const app=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
 assert.match(app,/host\.replaceChildren\(\.\.\.host\.querySelectorAll\(':scope > #care-published-catalogue'\)\)/);
 assert.match(app,/CARELibraryBoot\?\.openingRoute\?\.\(\);\s*await routeFromURL\(\);/);
});
