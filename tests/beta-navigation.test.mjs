import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {libraryDestination, postLoginDestination, legacyLibraryDestination, loginURL, session, postJSON, accountStorageKey, readingStorageKey, prepareAccountStorage, preparePublicStorage, clearReadingHistory, watchSession, showSessionNavigation} from '../auth.mjs';
import {createBetaSettings, readSiteSettings} from '../site-settings.mjs';

const betaGuest={authenticated:false,beta_enabled:true,can_manage_site:false};
const publicGuest={authenticated:false,beta_enabled:false,can_manage_site:false};
const member={authenticated:true,user:{email:'reader@example.test'},beta_enabled:true,can_manage_site:false};

test('login retains a requested reading and rejects redirects outside the library', () => {
  assert.equal(libraryDestination('/library.html#book=hume&ref=CH_THN_INTR%3AAS1'), '/library.html#book=hume&ref=CH_THN_INTR%3AAS1');
  assert.equal(libraryDestination('/library.html', '#field=FIELD%3Aexample'), '/library.html#field=FIELD%3Aexample');
  for (const target of ['https://example.com/', '//example.com/library.html', '/request-access.html', 'javascript:alert(1)', '/library.html/../data/library.json', 'https://care.invalid@evil.test/library.html']) {
    assert.equal(libraryDestination(target), '/library.html');
  }
  assert.equal(loginURL('/library.html#book=kant'), '/login.html?next=%2Flibrary.html%23book%3Dkant');
  assert.equal(postLoginDestination('/site-settings.html'), '/site-settings.html');
  assert.equal(loginURL('/site-settings.html'), '/login.html?next=%2Fsite-settings.html');
  assert.equal(libraryDestination('/site-settings.html'), '/library.html');
  for(const target of ['https://elsewhere.test/site-settings.html','//elsewhere.test/site-settings.html','/api/site-settings','/site-settings.html/other'])assert.equal(postLoginDestination(target),'/library.html');
});

test('legacy reading URLs reach the library while Discover section anchors stay on Discover', () => {
  assert.equal(legacyLibraryDestination('#book=hume&ref=CH_THN_INTR%3AAS1'), '/library.html#book=hume&ref=CH_THN_INTR%3AAS1');
  assert.equal(legacyLibraryDestination('#view=laterals', '?from=link'), '/library.html?from=link#view=laterals');
  assert.equal(legacyLibraryDestination('#experience'), null);
  assert.equal(legacyLibraryDestination(''), null);
});

test('a static server or malformed session cannot appear authenticated', async () => {
  await assert.rejects(session(async () => new Response('<html></html>', {headers:{'Content-Type':'text/html'}})), /unavailable/);
  await assert.rejects(session(async () => Response.json({user:{email:'reader@example.test'}})), /unavailable/);
  await assert.rejects(session(async () => Response.json({authenticated:true})), /unavailable/);
  await assert.rejects(session(async () => Response.json({authenticated:false})), /unavailable/);
  await assert.rejects(session(async () => Response.json({...publicGuest,beta_enabled:'false'})), /unavailable/);
  await assert.rejects(session(async () => Response.json({...publicGuest,can_manage_site:true})), /unavailable/);
  const anonymous = await session(async (path, options) => {
    assert.equal(path, '/api/session'); assert.equal(options.cache, 'no-store');
    return Response.json(betaGuest);
  });
  assert.equal(anonymous.authenticated, false);
});

test('book and field saves are isolated by account without replacing anonymous saves', () => {
  const source=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
  const start=source.indexOf('const storageKey = '),end=source.indexOf('\nlet noticeTimer;',start);
  assert.ok(start>=0&&end>start);
  const stored=new Map([['care-public-saved-v1',JSON.stringify({favourites:['LEGACY']})]]);
  const localStorage={getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)};
  const makeStore=(email,publicMode)=>new Function('readingStorageKey','document','localStorage','notice',
    source.slice(start,end)+';return {readLocal,saveLocal};')(
      readingStorageKey,{documentElement:{dataset:{careAccount:email,carePublicMode:publicMode}}},localStorage,()=>{});
  const first=makeStore('first@example.test'),second=makeStore('second@example.test');
  for(const key of ['care-public-saved-v1','care-public-field-saved:FIELD:example']){
    assert.equal(first.readLocal(key,null),null);
    assert.equal(first.saveLocal(key,{favourites:['FIRST']}),true);
    assert.equal(second.readLocal(key,null),null);
    assert.equal(second.saveLocal(key,{favourites:['SECOND']}),true);
    assert.deepEqual(first.readLocal(key,null),{favourites:['FIRST']});
    assert.deepEqual(second.readLocal(key,null),{favourites:['SECOND']});
  }
  assert.deepEqual(JSON.parse(stored.get('care-public-saved-v1')),{favourites:['LEGACY']});
  const guest=makeStore(undefined,'true');
  assert.deepEqual(guest.readLocal('care-public-saved-v1',null),{favourites:['LEGACY']});
  guest.saveLocal('care-public-saved-v1',{favourites:['PUBLIC']});
  assert.deepEqual(first.readLocal('care-public-saved-v1',null),{favourites:['FIRST']});
  assert.deepEqual(second.readLocal('care-public-saved-v1',null),{favourites:['SECOND']});
  assert.deepEqual(guest.readLocal('care-public-saved-v1',null),{favourites:['PUBLIC']});
  assert.equal(makeStore().saveLocal('care-public-saved-v1',{favourites:['UNVERIFIED']}),false);
  assert.throws(()=>readingStorageKey('care-public-saved-v1',{carePublicMode:'false'}),/verified library session/);
  assert.equal(accountStorageKey('care-public-saved-v1','First@EXAMPLE.test'),accountStorageKey('care-public-saved-v1','first@example.test'));
  assert.throws(()=>accountStorageKey('care-public-saved-v1',''),/verified account/);
});

function storageFixture(entries = []) {
  const values=new Map(entries);
  return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,
    getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}

test('account changes clear native reading history while preserving preferences and collections', () => {
  const history=['care-public-library-visits-v1','care-reference-history-v1','care-studio-reference-history-v1',
    'care-study-workspace-reader-v1:WORK','care-original-reader/1:WORK','care-dialogue-playback/1:DIALOGUE','care-field-layout-v3:FIELD'];
  const retained=['care-public-saved-v1','care-public-field-saved:FIELD',accountStorageKey('care-public-saved-v1','first@example.test'),
    'care-vibrant-view-v2','care-beautiful-text-v1','care-title-view-v1','care-public-library-sort-v1','care-reference-viewer-text-size-v1'];
  const view={localStorage:storageFixture(),sessionStorage:storageFixture()};
  const populate=()=>{for(const store of Object.values(view))for(const key of [...history,...retained])store.setItem(key,'kept');};
  populate();prepareAccountStorage('first@example.test',view);
  for(const store of Object.values(view)){
    for(const key of history)assert.equal(store.getItem(key),null,key);
    for(const key of retained)assert.equal(store.getItem(key),'kept',key);
  }
  populate();prepareAccountStorage('first@example.test',view);
  for(const store of Object.values(view))for(const key of history)assert.equal(store.getItem(key),'kept',key);
  prepareAccountStorage('second@example.test',view);
  for(const store of Object.values(view))for(const key of history)assert.equal(store.getItem(key),null,key);
  populate();preparePublicStorage(view);
  for(const store of Object.values(view))for(const key of history)assert.equal(store.getItem(key),null,key);
  populate();preparePublicStorage(view);
  for(const store of Object.values(view))for(const key of history)assert.equal(store.getItem(key),'kept',key);
  prepareAccountStorage('first@example.test',view);
  for(const store of Object.values(view))for(const key of history)assert.equal(store.getItem(key),null,key);
  populate();clearReadingHistory(view);
  for(const store of Object.values(view)){
    for(const key of history)assert.equal(store.getItem(key),null,key);
    for(const key of retained)assert.equal(store.getItem(key),'kept',key);
  }
});

test('existing account markers and legacy public history survive a mode-switch upgrade', () => {
  const history='care-study-workspace-reader-v1:WORK';
  const marker='care-beta-reading-history-account';
  const view={localStorage:storageFixture([[marker,'reader@example.test'],[history,'account history']]),
    sessionStorage:storageFixture([[marker,'reader@example.test'],[history,'account history']])};
  prepareAccountStorage('Reader@Example.test',view);
  for(const store of Object.values(view)){
    assert.equal(store.getItem(history),'account history');
    assert.equal(store.getItem(marker),'reader@example.test');
  }
  const legacy={localStorage:storageFixture([[history,'public history']]),sessionStorage:storageFixture([[history,'public history']])};
  preparePublicStorage(legacy);
  for(const store of Object.values(legacy)){
    assert.equal(store.getItem(history),'public history');
    assert.equal(store.getItem(marker),'public');
  }
  prepareAccountStorage('reader@example.test',legacy);
  for(const store of Object.values(legacy))assert.equal(store.getItem(history),null);
});

test('a hidden reader discards prior-account history immediately when another tab logs in', () => {
  const names=['window','document','location','localStorage','sessionStorage'];
  const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const events=new Map();let reloads=0;const emitted=[];
  try {
    const globals={window:{addEventListener:(name,handler)=>events.set(name,[...(events.get(name)||[]),handler]),
      dispatchEvent:event=>emitted.push(event.type),setInterval:()=>0},
      document:{hidden:true,addEventListener:()=>{}},location:{reload:()=>reloads++},
      localStorage:storageFixture([['care-study-workspace-reader-v1:WORK','previous account']]),
      sessionStorage:storageFixture([['care-studio-reference-history-v1','previous account']])};
    for(const [name,value] of Object.entries(globals))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
    watchSession(member, {library:true});
    for(const handler of events.get('storage'))handler({key:'care-beta-login'});
    assert.equal(reloads,1);
    assert.deepEqual(emitted,['care:account-ended']);
    assert.equal(globalThis.localStorage.getItem('care-study-workspace-reader-v1:WORK'),null);
    assert.equal(globalThis.sessionStorage.getItem('care-studio-reference-history-v1'),null);
    assert.equal(events.get('pagehide').length,1);
  } finally {
    for(const [name,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
});

test('library boot authenticates before loading the current reader and preserves deep links', async () => {
  const source=readFileSync(new URL('../library-boot.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('import(', 'loadModule(');
  const run=new Function('session','loginURL','bindLogout','watchSession','prepareAccountStorage','preparePublicStorage','showSessionNavigation','document','location','loadModule',`return (async()=>{${source}})();`);
  const location={pathname:'/library.html',search:'?from=shared',hash:'#field=FIELD%3Aexample',replace:value=>calls.push(['redirect',value])};
  const document={documentElement:{dataset:{}}},calls=[];
  const args=[loginURL,()=>calls.push(['logout']),current=>calls.push(['watch',current]),email=>calls.push(['storage',email]),()=>calls.push(['public-storage']),current=>calls.push(['navigation',current]),document,location,path=>calls.push(['load',path])];
  await run(async()=>betaGuest,...args);
  assert.deepEqual(calls,[['redirect',loginURL('/library.html?from=shared#field=FIELD%3Aexample')]]);
  calls.length=0;
  await run(async()=>member,...args);
  assert.equal(document.documentElement.dataset.careAccount,'reader@example.test');
  assert.deepEqual(calls.slice(0,4),[['storage','reader@example.test'],['navigation',member],['logout'],['watch',member]]);
  assert.match(calls[4][1],/^\.\/boot\.mjs\?v=/);
  calls.length=0;
  await run(async()=>publicGuest,...args);
  assert.equal(document.documentElement.dataset.careAccount,undefined);
  assert.equal(document.documentElement.dataset.carePublicMode,'true');
  assert.deepEqual(calls.slice(0,4),[['public-storage'],['navigation',publicGuest],['logout'],['watch',publicGuest]]);
  assert.match(calls[4][1],/^\.\/boot\.mjs\?v=/);
  calls.length=0;
  await run(async()=>({...member,beta_enabled:false}),...args);
  assert.equal(document.documentElement.dataset.careAccount,'reader@example.test');
  assert.equal(document.documentElement.dataset.carePublicMode,undefined);
});

test('Discover guests never import the reading modules and legacy landing retains its fragment', async () => {
  const source=readFileSync(new URL('../landing.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('import(', 'loadModule(');
  const run=new Function('session','legacyLibraryDestination','watchSession','bindLogout','prepareAccountStorage','preparePublicStorage','showSessionNavigation','document','location','loadModule',`return (async()=>{${source}})();`);
  const calls=[],location={pathname:'/',search:'',hash:'',replace:value=>calls.push(['redirect',value])};
  const unexpected=()=>{throw Error('A guest must not mount the reader.');};
  await run(async()=>betaGuest,legacyLibraryDestination,current=>calls.push(['watch',current]),unexpected,unexpected,unexpected,unexpected,{},location,unexpected);
  assert.deepEqual(calls,[['watch',betaGuest]]);
  calls.length=0;
  await run(async()=>publicGuest,legacyLibraryDestination,unexpected,unexpected,unexpected,unexpected,unexpected,{},location,unexpected);
  assert.deepEqual(calls,[['redirect','/library.html']]);
  calls.length=0;
  location.search='?from=shared';location.hash='#book=hume&source=RAW_EXAMPLE';
  await run(unexpected,legacyLibraryDestination,unexpected,unexpected,unexpected,unexpected,unexpected,{},location,unexpected);
  assert.deepEqual(calls,[['redirect','/library.html?from=shared#book=hume&source=RAW_EXAMPLE']]);
  const compatibility=readFileSync(new URL('../legacy-landing.mjs',import.meta.url),'utf8');
  calls.length=0;new Function('location',compatibility)(location);
  assert.deepEqual(calls,[['redirect','/?from=shared#book=hume&source=RAW_EXAMPLE']]);
});

test('explicit Discover remains available with public previews when beta mode is off', async () => {
  const source=readFileSync(new URL('../landing.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('import(', 'loadModule(');
  const run=new Function('session','legacyLibraryDestination','watchSession','bindLogout','prepareAccountStorage','preparePublicStorage','showSessionNavigation','document','location','loadModule',`return (async()=>{${source}})();`);
  const calls=[],guest={hidden:false},preview={hidden:true},entry={href:'/login.html'},document={documentElement:{dataset:{}},querySelectorAll:selector=>({
    '[data-guest-only]':[guest],'[data-members-only]':[preview],'[data-library-entry]':[entry],
  })[selector]||[]};
  const location={pathname:'/discover.html',search:'',hash:'#experience',replace:()=>assert.fail('Explicit Discover must remain accessible.')};
  await run(async()=>publicGuest,legacyLibraryDestination,current=>calls.push(['watch',current]),()=>{},
    ()=>assert.fail('A public visitor is not an account.'),()=>calls.push(['public-storage']),current=>calls.push(['navigation',current]),document,location,path=>calls.push(['load',path]));
  assert.equal(document.documentElement.dataset.careAccount,undefined);
  assert.equal(document.documentElement.dataset.carePublicMode,'true');
  assert.equal(guest.hidden,true);assert.equal(preview.hidden,false);
  assert.equal(entry.href,'/library.html');assert.equal(entry.textContent,'Enter the library ↗');
  assert.deepEqual(calls.slice(0,3),[['public-storage'],['navigation',publicGuest],['watch',publicGuest]]);
  assert.equal(calls.filter(([kind])=>kind==='load').length,3);
  assert.match(readFileSync(new URL('../library.html',import.meta.url),'utf8'),/class="discover" href="\/discover.html"/);
});

test('access delivery failures are shown as failures rather than a successful request', async () => {
  await assert.rejects(postJSON('/api/access-requests', {name:'Reader',email:'reader@example.test'}, async () =>
    Response.json({message:'Your request was saved, but we could not deliver the email. Please try again.'}, {status:502})), /could not deliver/);
  await assert.rejects(postJSON('/api/login', {}, async () => { throw Error('offline'); }), /could not connect/);
});

test('beta settings require verified initialization and save the chosen mode with its revision', async () => {
  const requests=[];
  const model=createBetaSettings({read:async()=>({beta_enabled:true,revision:4}),save:async body=>{
    requests.push(body);return {beta_enabled:body.beta_enabled,revision:body.revision+1};
  }});
  assert.equal(model.snapshot().selected,null);
  assert.equal(model.snapshot().canSave,false);
  model.select(false);assert.equal(model.snapshot().selected,null);
  assert.equal(await model.submit(),false);assert.deepEqual(requests,[]);
  await model.reload();assert.equal(model.snapshot().selected,true);assert.equal(model.snapshot().canSave,false);
  model.select(false);assert.equal(model.snapshot().canSave,true);assert.deepEqual(requests,[]);
  assert.equal(await model.submit(),true);
  assert.deepEqual(requests,[{beta_enabled:false,revision:4}]);
  assert.equal(model.snapshot().current,false);assert.equal(model.snapshot().canSave,false);
  assert.match(model.snapshot().message,/without logging in/);
  model.select(true);assert.equal(await model.submit(),true);
  assert.deepEqual(requests[1],{beta_enabled:true,revision:5});
  assert.equal(model.snapshot().current,true);assert.match(model.snapshot().message,/must log in/);
});

test('a stale beta setting preserves the unsaved choice and blocks saving until refreshed', async () => {
  let revision=7,conflict=true;
  const requests=[];
  const model=createBetaSettings({read:async()=>({beta_enabled:true,revision}),save:async body=>{
    requests.push(body);
    if(conflict){const error=Error('stale');error.status=409;throw error;}
    return {beta_enabled:body.beta_enabled,revision:body.revision+1};
  }});
  await model.reload();model.select(false);
  assert.equal(await model.submit(),false);
  assert.equal(model.snapshot().selected,false);assert.equal(model.snapshot().current,true);
  assert.equal(model.snapshot().canSave,false);assert.match(model.snapshot().error,/changed elsewhere/);
  await model.submit();assert.equal(requests.length,1);
  revision=9;conflict=false;await model.reload();
  assert.equal(model.snapshot().selected,false);assert.equal(model.snapshot().canSave,true);
  assert.equal(await model.submit(),true);
  assert.deepEqual(requests[1],{beta_enabled:false,revision:9});
});

test('unavailable or malformed settings never guess a mode, and uncertain saves preserve pending changes', async () => {
  await assert.rejects(readSiteSettings(async()=>Response.json({beta_enabled:'false',revision:0})),/could not be verified/);
  await assert.rejects(readSiteSettings(async()=>Response.json({error:'Owner access required.'},{status:403})),error=>error.status===403);
  let available=false;
  const model=createBetaSettings({read:async()=>{
    if(!available)throw Error('Unavailable');return {beta_enabled:true,revision:1};
  },save:async()=>{throw Error('Connection lost');}});
  await model.reload();assert.equal(model.snapshot().selected,null);assert.equal(model.snapshot().current,null);
  assert.equal(model.snapshot().canSave,false);assert.equal(model.snapshot().error,'Unavailable');
  available=true;await model.reload();model.select(false);await model.submit();
  assert.equal(model.snapshot().selected,false);assert.equal(model.snapshot().current,true);
  assert.equal(model.snapshot().canSave,false);assert.equal(model.snapshot().error,'Connection lost');
  const malformed=createBetaSettings({read:async()=>({beta_enabled:true,revision:3}),save:async()=>({beta_enabled:false,revision:3})});
  await malformed.reload();malformed.select(false);assert.equal(await malformed.submit(),false);
  assert.equal(malformed.snapshot().current,true);assert.equal(malformed.snapshot().selected,false);
  assert.equal(malformed.snapshot().needsRefresh,true);
});

test('an open anonymous reader returns to login if beta mode is enabled, preserving its reading link', async () => {
  const names=['window','document','location','localStorage','sessionStorage','fetch'];
  const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  let check,redirect;
  try {
    const globals={window:{addEventListener:()=>{},setInterval:handler=>{check=handler;return 0;}},
      document:{hidden:false,addEventListener:()=>{}},
      location:{pathname:'/library.html',search:'?from=shared',hash:'#book=hume',replace:value=>{redirect=value;},reload:()=>assert.fail('A closed beta must direct a guest to login.')},
      localStorage:storageFixture(),sessionStorage:storageFixture(),fetch:async()=>Response.json(betaGuest)};
    for(const [name,value] of Object.entries(globals))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
    watchSession(publicGuest,{library:true});await check();
    assert.equal(redirect,loginURL('/library.html?from=shared#book=hume'));
  } finally {
    for(const [name,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
});

test('only verified owners see Website settings and public guests retain a login link', () => {
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  const logout={hidden:true},login={hidden:true},settings={hidden:true};
  try {
    Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelectorAll:selector=>({
      '[data-logout]':[logout],'[data-public-login]':[login],'[data-owner-only]':[settings],
    })[selector]||[]}});
    showSessionNavigation(publicGuest);
    assert.deepEqual([logout.hidden,login.hidden,settings.hidden],[true,false,true]);
    showSessionNavigation(member);
    assert.deepEqual([logout.hidden,login.hidden,settings.hidden],[false,true,true]);
    showSessionNavigation({...member,beta_enabled:false,can_manage_site:true});
    assert.deepEqual([logout.hidden,login.hidden,settings.hidden],[false,true,false]);
    showSessionNavigation({...publicGuest,can_manage_site:true});
    assert.equal(settings.hidden,true);
  } finally {if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
});

test('an authenticated reader retains history when mode or owner access changes', async () => {
  const names=['window','document','location','localStorage','sessionStorage','fetch'];
  const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  let check,reloads=0,current={...member,beta_enabled:false};
  const events=new Map(),history='care-study-workspace-reader-v1:WORK';
  try {
    const globals={window:{addEventListener:(name,handler)=>events.set(name,handler),setInterval:handler=>{check=handler;return 0;}},
      document:{hidden:false,addEventListener:()=>{}},location:{reload:()=>reloads++,replace:()=>assert.fail('An authenticated reader remains admitted.')},
      localStorage:storageFixture([[history,'account history']]),sessionStorage:storageFixture([[history,'account history']]),fetch:async()=>Response.json(current)};
    for(const [name,value] of Object.entries(globals))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
    watchSession(member,{library:true});await check();assert.equal(reloads,1);
    events.get('storage')({key:'care-beta-mode'});assert.equal(reloads,2);
    current={...member,can_manage_site:true};await check();assert.equal(reloads,3);
    assert.equal(events.has('pagehide'),false);
    assert.equal(globalThis.localStorage.getItem(history),'account history');
    assert.equal(globalThis.sessionStorage.getItem(history),'account history');
  } finally {
    for(const [name,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
});
