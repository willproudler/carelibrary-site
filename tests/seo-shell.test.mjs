import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document={getElementById:()=>null};
const {mountSearchApplicationShell,revealSearchApplication,startSearchPage}=await import('../seo-shell.mjs');

class Node {
 constructor(id='',tag='div'){this.id=id;this.tag=tag;this.dataset={};this.childNodes=[];this.attributes=new Map();this.hidden=false;}
 append(...nodes){for(const node of nodes){node.parent=this;this.childNodes.push(node);}}
 replaceChildren(...nodes){this.childNodes=[];this.append(...nodes);}
 remove(){if(this.parent)this.parent.childNodes=this.parent.childNodes.filter(node=>node!==this);}
 removeAttribute(name){this.attributes.delete(name);}
 querySelectorAll(selector){return descendants(this).filter(node=>selector==='[id]'?node.id:selector==='script,noscript'&&['script','noscript'].includes(node.tag));}
}
const descendants=node=>node.childNodes.flatMap(child=>[child,...descendants(child)]);
const clone=node=>{const next=new Node(node.id,node.tag);next.append(...node.childNodes.map(clone));return next;};

function fixture({parse='native',conflict=false}={}){
 const shell=new Node('care-search-app'),content=new Node('care-search-content'),access=new Node();
 shell.dataset.careSearchShell='library';shell.attributes.set('inert','');shell.attributes.set('aria-hidden','true');
 const route={view:'workspace',book:'saved-plato',unit:'WB_EXACT',ref:'WB_EXACT:A1'};
 const initial={id:'care-search-route',textContent:JSON.stringify(route)};
 const listeners=new Map(),location=new URL('https://care.example/platotimaeus/readings/wb/saved/?test=one#ref=WB_EXACT%3AA1');
 const doc={location,documentElement:{dataset:{}},
  getElementById(id){return ({'care-search-app':shell,'care-search-content':content,'care-search-route':initial})[id]||
   (conflict&&id==='reader'?new Node('reader'):descendants(shell).find(node=>node.id===id))||null;},
  querySelector(selector){return selector==='[data-care-search-access]'?access:null;},
  createTextNode(text){return {text,childNodes:[]};},createElement:tag=>new Node('',tag),importNode:clone,
  addEventListener(type,handler){const list=listeners.get(type)||[];list.push(handler);listeners.set(type,list);},
  removeEventListener(type,handler){listeners.set(type,(listeners.get(type)||[]).filter(item=>item!==handler));},
  dispatchEvent(event){for(const handler of [...listeners.get(event.type)||[]])handler(event);},
 };
 doc.defaultView={DOMParser:class{
  parseFromString(text,type){
   assert.equal(text,'current native Library shell');assert.equal(type,'text/html');
   const body=new Node('','body');
   if(parse==='native'||parse==='duplicate'){
    const main=new Node('main'),reader=new Node('reader');reader.append(new Node('care-published-catalogue'));main.append(reader);
    body.append(new Node('workbench-library-menu'),main,new Node('studio-workspace'),new Node('double-boot','script'),new Node('no-script','noscript'));
    if(parse==='duplicate')body.append(new Node('reader'));
   }else body.append(new Node('login-form'));
   return {body,querySelectorAll:selector=>body.querySelectorAll(selector),getElementById:id=>descendants(body).find(node=>node.id===id)};
  }
 }};
 return {doc,shell,content,access,initial,location,route};
}

function response(changes={}){
 return {ok:true,redirected:false,url:'https://care.example/library.html',headers:new Headers({'content-type':'text/html; charset=utf-8'}),
  text:async()=>'current native Library shell',...changes};
}

test('the same exact book/unit boot mounts native hosts before listeners and reveals only on actual readiness',async()=>{
 const f=fixture(),calls=[],before=f.location.href,route=f.initial.textContent;
 await startSearchPage({doc:f.doc,readSession:async()=>{
  calls.push('session');f.doc.dispatchEvent({type:'care:search-ready'});
  assert.equal(f.content.hidden,false,'An event before mounting cannot hide the semantic reading');
  return {authenticated:false,beta_enabled:false};
 },fetcher:async(url,options)=>{
  calls.push('fetch');assert.equal(url,'/library.html');
  assert.deepEqual(options,{credentials:'same-origin',cache:'no-store',redirect:'error'});
  return response();
 },bootLibrary:async()=>{
  calls.push('boot');
  for(const id of ['reader','workbench-library-menu','studio-workspace'])assert.ok(f.doc.getElementById(id),id);
  assert.equal(f.doc.getElementById('double-boot'),null,'Fetched scripts cannot start a second application');
  assert.equal(f.doc.getElementById('no-script'),null);
  assert.equal(f.doc.getElementById('care-published-catalogue'),null,'The reader does not mount an unrelated catalogue before replacing it');
  assert.equal(f.content.hidden,false);
  f.doc.getElementById('reader').listenersAttached=true;
 }});
 assert.deepEqual(calls,['session','fetch','boot']);
 assert.equal(f.content.hidden,false,'Completing the shell/import does not claim Reader readiness');
 assert.equal(f.shell.attributes.has('inert'),true);
 f.doc.dispatchEvent({type:'care:search-ready'});
 assert.equal(f.content.hidden,true);assert.equal(f.shell.attributes.has('inert'),false);
 assert.equal(f.shell.attributes.has('aria-hidden'),false);
 assert.equal(f.doc.documentElement.dataset.careSearchReady,'true');
 assert.equal(f.doc.getElementById('reader').listenersAttached,true);
 assert.equal(f.location.href,before);assert.equal(f.initial.textContent,route);
});

test('private Beta leaves the semantic page visible and never fetches or boots the private shell',async()=>{
 const f=fixture();
 await startSearchPage({doc:f.doc,readSession:async()=>({authenticated:false,beta_enabled:true}),
  fetcher:()=>assert.fail('Private shell was fetched'),bootLibrary:()=>assert.fail('Private reader booted')});
 assert.equal(f.content.hidden,false);assert.equal(f.shell.childNodes.length,0);
 assert.equal(revealSearchApplication(f.doc),false);
 assert.ok(f.access.childNodes.some(node=>node.tag==='a'&&node.href.includes('/login.html?next=')));
});

test('authorized readers mount the shell once and concurrent mount callers share one fetch',async()=>{
 const f=fixture();let fetches=0,boots=0;
 await startSearchPage({doc:f.doc,readSession:async()=>({authenticated:true,beta_enabled:true}),
  fetcher:async()=>{fetches++;return response();},bootLibrary:async()=>{boots++;}});
 await Promise.all([mountSearchApplicationShell(f.doc,()=>assert.fail('Shell fetched twice')),
  mountSearchApplicationShell(f.doc,()=>assert.fail('Shell fetched twice'))]);
 assert.equal(fetches,1);assert.equal(boots,1);
 const concurrent=fixture();let requests=0;
 await Promise.all([1,2].map(()=>mountSearchApplicationShell(concurrent.doc,async()=>{requests++;return response();})));
 assert.equal(requests,1);
});

test('network errors, login redirects, foreign shells and conflicting IDs cannot replace the semantic reading',async()=>{
 const cases=[{reply:{ok:false}},{reply:{redirected:true}},{reply:{url:'https://other.example/library.html'}},
  {reply:{url:'https://care.example/login.html'}},{reply:{headers:new Headers({'content-type':'application/json'})}},
  {parse:'login'},{parse:'duplicate'},{conflict:true},{network:true}];
 for(const item of cases){
  const f=fixture(item);let booted=false;
  await assert.rejects(()=>startSearchPage({doc:f.doc,readSession:async()=>({authenticated:false,beta_enabled:false}),
   fetcher:async()=>{if(item.network)throw Error('offline');return response(item.reply);},bootLibrary:async()=>{booted=true;}}));
  assert.equal(booted,false);assert.equal(f.content.hidden,false);assert.equal(f.shell.childNodes.length,0);
  assert.equal(f.shell.attributes.has('inert'),true);
 }
});
