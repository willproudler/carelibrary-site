import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {libraryDestination, legacyLibraryDestination, loginURL, session, postJSON, accountStorageKey, prepareAccountStorage, clearReadingHistory, watchSession} from '../auth.mjs';

test('login retains a requested reading and rejects redirects outside the library', () => {
  assert.equal(libraryDestination('/library.html#book=hume&ref=CH_THN_INTR%3AAS1'), '/library.html#book=hume&ref=CH_THN_INTR%3AAS1');
  assert.equal(libraryDestination('/library.html', '#field=FIELD%3Aexample'), '/library.html#field=FIELD%3Aexample');
  for (const target of ['https://example.com/', '//example.com/library.html', '/request-access.html', 'javascript:alert(1)', '/library.html/../data/library.json', 'https://care.invalid@evil.test/library.html']) {
    assert.equal(libraryDestination(target), '/library.html');
  }
  assert.equal(loginURL('/library.html#book=kant'), '/login.html?next=%2Flibrary.html%23book%3Dkant');
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
  const anonymous = await session(async (path, options) => {
    assert.equal(path, '/api/session'); assert.equal(options.cache, 'no-store');
    return Response.json({authenticated:false});
  });
  assert.equal(anonymous.authenticated, false);
});

test('book and field saves are isolated by account without replacing anonymous saves', () => {
  const source=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
  const start=source.indexOf('const storageKey = '),end=source.indexOf('\nlet noticeTimer;',start);
  assert.ok(start>=0&&end>start);
  const stored=new Map([['care-public-saved-v1',JSON.stringify({favourites:['LEGACY']})]]);
  const localStorage={getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)};
  const makeStore=email=>new Function('accountStorageKey','document','localStorage','notice',
    source.slice(start,end)+';return {readLocal,saveLocal};')(
      accountStorageKey,{documentElement:{dataset:{careAccount:email}}},localStorage,()=>{});
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
  populate();clearReadingHistory(view);
  for(const store of Object.values(view)){
    for(const key of history)assert.equal(store.getItem(key),null,key);
    for(const key of retained)assert.equal(store.getItem(key),'kept',key);
  }
});

test('a hidden reader discards prior-account history immediately when another tab logs in', () => {
  const names=['window','document','location','localStorage','sessionStorage'];
  const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const events=new Map();let reloads=0;
  try {
    const globals={window:{addEventListener:(name,handler)=>events.set(name,[...(events.get(name)||[]),handler]),setInterval:()=>0},
      document:{hidden:true,addEventListener:()=>{}},location:{reload:()=>reloads++},
      localStorage:storageFixture([['care-study-workspace-reader-v1:WORK','previous account']]),
      sessionStorage:storageFixture([['care-studio-reference-history-v1','previous account']])};
    for(const [name,value] of Object.entries(globals))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
    watchSession('previous@example.test');
    for(const handler of events.get('storage'))handler({key:'care-beta-login'});
    assert.equal(reloads,1);
    assert.equal(globalThis.localStorage.getItem('care-study-workspace-reader-v1:WORK'),null);
    assert.equal(globalThis.sessionStorage.getItem('care-studio-reference-history-v1'),null);
    assert.equal(events.get('pagehide').length,1);
  } finally {
    for(const [name,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
});

test('library boot authenticates before loading the current reader and preserves deep links', async () => {
  const source=readFileSync(new URL('../library-boot.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('import(', 'loadModule(');
  const run=new Function('session','loginURL','bindLogout','watchSession','prepareAccountStorage','document','location','loadModule',`return (async()=>{${source}})();`);
  const location={pathname:'/library.html',search:'?from=shared',hash:'#field=FIELD%3Aexample',replace:value=>calls.push(['redirect',value])};
  const document={documentElement:{dataset:{}}},calls=[];
  const args=[loginURL,()=>calls.push(['logout']),email=>calls.push(['watch',email]),email=>calls.push(['storage',email]),document,location,path=>calls.push(['load',path])];
  await run(async()=>({authenticated:false}),...args);
  assert.deepEqual(calls,[['redirect',loginURL('/library.html?from=shared#field=FIELD%3Aexample')]]);
  calls.length=0;
  await run(async()=>({authenticated:true,user:{email:'reader@example.test'}}),...args);
  assert.equal(document.documentElement.dataset.careAccount,'reader@example.test');
  assert.deepEqual(calls.slice(0,3),[['storage','reader@example.test'],['logout'],['watch','reader@example.test']]);
  assert.match(calls[3][1],/^\.\/boot\.mjs\?v=/);
});

test('Discover guests never import the reading modules and legacy landing retains its fragment', async () => {
  const source=readFileSync(new URL('../landing.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('import(', 'loadModule(');
  const run=new Function('session','legacyLibraryDestination','watchSession','bindLogout','prepareAccountStorage','document','location','loadModule',`return (async()=>{${source}})();`);
  const calls=[],location={search:'',hash:'',replace:value=>calls.push(['redirect',value])};
  const unexpected=()=>{throw Error('A guest must not mount the reader.');};
  await run(async()=>({authenticated:false}),legacyLibraryDestination,unexpected,unexpected,unexpected,{},location,unexpected);
  assert.deepEqual(calls,[]);
  location.search='?from=shared';location.hash='#book=hume&source=RAW_EXAMPLE';
  await run(unexpected,legacyLibraryDestination,unexpected,unexpected,unexpected,{},location,unexpected);
  assert.deepEqual(calls,[['redirect','/library.html?from=shared#book=hume&source=RAW_EXAMPLE']]);
  const compatibility=readFileSync(new URL('../legacy-landing.mjs',import.meta.url),'utf8');
  calls.length=0;new Function('location',compatibility)(location);
  assert.deepEqual(calls,[['redirect','/?from=shared#book=hume&source=RAW_EXAMPLE']]);
});

test('access delivery failures are shown as failures rather than a successful request', async () => {
  await assert.rejects(postJSON('/api/access-requests', {name:'Reader',email:'reader@example.test'}, async () =>
    Response.json({message:'Your request was saved, but we could not deliver the email. Please try again.'}, {status:502})), /could not deliver/);
  await assert.rejects(postJSON('/api/login', {}, async () => { throw Error('offline'); }), /could not connect/);
});
