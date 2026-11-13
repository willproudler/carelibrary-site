import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const generator=readFileSync(new URL('../tools/static_catalogue.py',import.meta.url),'utf8');
const script=generator.match(/BOOT_SCRIPT = r"""([\s\S]*?)"""/)[1];
function loading(){
 const status={textContent:'Opening the library…'},actions={hidden:true};
 let removed=false,reloads=0,cleared=false;
 const panel={querySelector:selector=>selector.includes('-status')?status:actions,remove(){removed=true;}};
 const listeners=new Map(),timers=[];
 const document={documentElement:{dataset:{}},getElementById:id=>id==='care-library-loading'&&!removed?panel:null,
  addEventListener:(name,callback)=>listeners.set(name,callback)};
 const window={};
 vm.runInNewContext(script,{window,document,location:{reload(){reloads++;}},
  setTimeout:(callback,delay)=>{timers.push({callback,delay});return 1;},clearTimeout(){cleared=true;}});
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

test('a stalled module exposes recovery without revealing the fallback behind it',()=>{
 const view=loading();
 assert.equal(view.timers[0].delay,20000);
 view.timers[0].callback();
 assert.equal(view.document.documentElement.dataset.careLibraryBoot,'slow');
 assert.equal(view.actions.hidden,false);
 assert.match(view.status.textContent,/longer than usual/);
 assert.equal(view.removed,false);
 view.window.CARELibraryBoot.ready();
 assert.equal(view.removed,true,'A late successful load still reveals the app');
});

test('session or app failures show retry and a text route on the solid loading surface',()=>{
 const view=loading();
 view.window.CARELibraryBoot.fail(new Error('network failure'));
 assert.equal(view.document.documentElement.dataset.careLibraryBoot,'error');
 assert.equal(view.actions.hidden,false);
 assert.equal(view.removed,false);
 assert.match(view.status.textContent,/could not load/);
 view.listeners.get('click')({target:{closest:()=>({})}});
 assert.equal(view.reloads,1);
 assert.equal(view.cleared,true);
});

test('native mounting retains the crawler catalogue in the live document',()=>{
 const app=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
 assert.match(app,/host\.replaceChildren\(\.\.\.host\.querySelectorAll\(':scope > #care-published-catalogue'\)\)/);
 assert.match(app,/await routeFromURL\(\);/);
 assert.match(app,/start\(\)\.then\(\(\)=>window\.CARELibraryBoot\?\.ready\(\)\)/);
});
