import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createTabMenus,createWorkspaceHistory,findCatalogue,manuscriptHash,updateLibraryMenu,installFixedWorkbenchPreferences,NUMOGRAM_GLYPH,NUMOGRAM_READING_STYLE,numogramDemonTarget,readSearchPageRoute,searchPageRouteParams,createSearchPageReady} from '../web-workspace.mjs';

test('catalogue search can find accents, authors and published connections without loading text', () => {
  const books=[{title:'Matière et mémoire',author:'Henri Bergson',year:'1896',slug:'bergson'}];
  const fields=[{title:'Kant × Hume',id:'FIELD:pair',field:'lateral'}];
  assert.equal(findCatalogue(books,fields,'matiere bergson')[0].href,'#book=bergson');
  assert.equal(findCatalogue(books,fields,'hume lateral')[0].href,'#field=FIELD%3Apair');
  assert.deepEqual(findCatalogue(books,fields,'unpublished'),[]);
  assert.equal(manuscriptHash('reader','abc123'),'#view=reader&draft=abc123');
});

test('workspace history keeps its entry on route replacement and discards the forward branch on a new visit', () => {
  let entries=[{hash:'',state:null}], index=0;
  const location={get hash(){return entries[index].hash;}};
  const history={
    get state(){return entries[index].state;},
    replaceState(state,_title,hash){entries[index]={hash:hash??location.hash,state};},
    go(step){index+=step;},
  };
  const push=hash=>{entries=entries.slice(0,index+1);entries.push({hash,state:null});index++;};
  let status;
  const navigation=createWorkspaceHistory(history,location,value=>{status=value;});
  assert.deepEqual(status,{back:false,forward:false});
  push('#book=kant');navigation.observe();
  push('#view=studio');navigation.observe();
  navigation.replace('#view=studio&draft=abc');
  assert.deepEqual(status,{back:true,forward:false});
  navigation.move(-1);navigation.observe();
  assert.equal(location.hash,'#book=kant');
  assert.deepEqual(status,{back:true,forward:true});
  push('#view=study-sets');navigation.observe();
  assert.deepEqual(status,{back:true,forward:false});
  navigation.move(-1);navigation.observe();
  navigation.move(-1);navigation.observe();
  assert.deepEqual(status,{back:false,forward:true});
});

test('the Library dropdown hands reading commands off to the real File and Go menus', () => {
  const element = () => ({
    children:[], attributes:new Map(),
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.children=children;},
    setAttribute(key,value){this.attributes.set(key,value);},
    getAttribute(key){return this.attributes.get(key);},
  });
  const calls=[];
  const reading={
    headings:()=>[['book','File'],['navigate','Go']],
    toggle:(...args)=>calls.push(args),
    dismiss:()=>calls.push('dismiss reading menu'),
  };
  let scope, anchors;
  const bridge={useShell({scope:next,paint}){scope=next;anchors=paint(next?reading:null);return ()=>paint(null);}};
  const host=element();
  host.ownerDocument={defaultView:{[Symbol.for('care.context-menus/1')]:bridge},createElement:element,createElementNS:element};
  const compactAnchor=element();
  const sync=createTabMenus(host,{compactAnchor,beforeOpen:()=>calls.push('close Library dropdown')});
  sync('study:WORK');
  assert.equal(scope,'study:WORK');
  assert.equal(host.hidden,false);
  assert.equal(anchors.get('$compact'),compactAnchor);
  assert.equal(anchors.get('book').getAttribute('aria-label'),'File');
  anchors.get('book').onclick();
  anchors.get('navigate').onkeydown({key:'ArrowUp',preventDefault:()=>calls.push('prevent arrow scroll')});
  sync.dismiss();
  assert.deepEqual(calls,[
    'close Library dropdown',['book',{toggle:true,focus:true}],
    'prevent arrow scroll','close Library dropdown',['navigate',{focus:true,last:true}],
    'dismiss reading menu',
  ]);
  sync('');
  assert.equal(host.hidden,true);
  assert.deepEqual(host.children,[]);
});

test('Library Home and workspace commands live in the CARE Library dropdown, leaving the tab rail clear', () => {
  const html=readFileSync(new URL('../library.html',import.meta.url),'utf8');
  const menu=html.match(/<details[^>]*id="workbench-library-menu"[^>]*>([\s\S]*?)<\/details>/)[1];
  assert.match(menu,/<summary[^>]*aria-label="CARE Library menu"/);
  assert.match(menu,/workbench-brand-chevron/);
  assert.match(menu,/<a(?![^>]*\bhidden\b)[^>]*href="\/library\.html"[^>]*>[^\n]*Library Home<\/a>/);
  const commands=/data-open-readings|id="reading-tab-menus"|data-write-beside|data-separate-tabs|data-file-group/g;
  assert.equal([...new Set(menu.match(commands))].length,5);
  const tabs=html.match(/<div[^>]*id="reading-tabbar"[^>]*>([\s\S]*?)<div id="load-status"/)[1];
  assert.match(tabs,/id="open-books"/);
  assert.match(tabs,/id="reading-tab-scroll"/);
  assert.doesNotMatch(tabs,commands);
});

test('Library dropdown keeps Home available and adapts command groups to the active workspace', () => {
  const groups=['library','numogram','documents'].map(fileGroup=>({dataset:{fileGroup}}));
  const command=editorOnly=>({hasAttribute:name=>name==='data-studio-editor-only'&&editorOnly});
  const commands=[command(true),command(false)];
  const home={hidden:false};
  const menu={
    querySelectorAll:selector=>selector==='[data-file-group]'?groups:commands,
    querySelector:()=>home,
  };
  for(const [view,visibleGroups,visibleCommands] of [
    ['library',['library','documents'],[false,false]],
    ['workspace',['library','documents'],[false,false]],
    ['studio',['documents'],[true,true]],
    ['reader',['documents'],[false,true]],
    ['numogram',['numogram'],[false,false]],
  ]){
    updateLibraryMenu(menu,view);
    assert.deepEqual(groups.filter(group=>!group.hidden).map(group=>group.dataset.fileGroup),visibleGroups,view);
    assert.deepEqual(commands.map(button=>!button.hidden),visibleCommands,view);
    assert.equal(home.hidden,false,view);
  }
});


test('public workbench fixes labels off and slider arrows on despite older saved preferences and events', () => {
  const saved=new Map([['care-web-toolbar-labels-v1','true'],['care-slider-arrows-v1','false']]);
  const window=new EventTarget();
  window.CustomEvent=CustomEvent;
  window.localStorage={setItem:(key,value)=>saved.set(key,value),getItem:key=>saved.get(key)};
  const document={documentElement:{dataset:{careToolbarLabels:'true'}}};
  const cleanup=installFixedWorkbenchPreferences(window,document);
  const fixed=()=>{
    assert.equal(window.careToolbarLabelsVisible,false);
    assert.equal(window.careSliderArrowsVisible,true);
    assert.equal(document.documentElement.dataset.careToolbarLabels,'false');
    assert.equal(document.documentElement.dataset.careSliderArrows,'true');
    assert.equal(saved.get('care-web-toolbar-labels-v1'),'false');
    assert.equal(saved.get('care-slider-arrows-v1'),'true');
  };
  fixed();
  const painted=[];
  window.addEventListener('care-slider-arrows-changed',event=>painted.push(event.detail.visible));
  window.dispatchEvent(new CustomEvent('care-toolbar-labels-request',{detail:{visible:true}}));
  window.dispatchEvent(new CustomEvent('care-slider-arrows-request',{detail:{visible:false}}));
  window.dispatchEvent(new CustomEvent('care-slider-arrows-changed',{detail:{visible:false}}));
  assert.deepEqual(painted,[true,true]);
  saved.set('care-web-toolbar-labels-v1','true');saved.set('care-slider-arrows-v1','false');
  const storage=new Event('storage');storage.key=null;
  window.dispatchEvent(storage);
  fixed();
  cleanup();
});

test('fixed workbench presentation also works when browser storage is unavailable', () => {
  const window=new EventTarget();window.CustomEvent=CustomEvent;
  window.localStorage={setItem(){throw Error('Storage unavailable');}};
  const document={documentElement:{dataset:{}}};
  const cleanup=installFixedWorkbenchPreferences(window,document);
  assert.equal(window.careToolbarLabelsVisible,false);
  assert.equal(window.careSliderArrowsVisible,true);
  cleanup();
});

test('Settings omit fixed presentation choices while NUMO tabs and Rooms share the exact ten-zone glyph', () => {
  const html=readFileSync(new URL('../library.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
  const css=readFileSync(new URL('../web-workspace.css',import.meta.url),'utf8');
  const settings=html.match(/<details[^>]*id="workbench-settings"[^>]*>([\s\S]*?)<\/details>/)[1];
  assert.doesNotMatch(settings,/workbench-labels|workbench-arrows|Show toolbar labels|Show slider arrows/);
  assert.match(settings,/Desktop settings/);
  assert.match(settings,/Website settings/);
  assert.match(css,/data-care-toolbar-labels-toggle/);
  assert.match(css,/data-care-slider-arrows-toggle/);
  const zones=[...NUMOGRAM_GLYPH.matchAll(/data-numogram-zone="(\d)"/g)].map(match=>match[1]).sort();
  assert.deepEqual(zones,['0','1','2','3','4','5','6','7','8','9']);
  assert.equal(NUMOGRAM_READING_STYLE.icon,NUMOGRAM_GLYPH);
  assert.ok(html.includes('<svg viewBox="0 0 24 24" aria-hidden="true">'+NUMOGRAM_GLYPH+'</svg>'));
  assert.match(app,/isNumo\|\|kind==='numo'\)\?NUMOGRAM_READING_STYLE/);
});


test('public demon links select only a published chamber and preserve native chamber addresses', async () => {
  const {default:reference}=await import('../native/numogram-reference.mjs');
  assert.equal(reference.demons.length,45);
  for(const demon of reference.demons){
    const params=new URLSearchParams({view:'numogram',demon:demon.id});
    assert.deepEqual(numogramDemonTarget(params,reference.demons),{kind:'demon',id:demon.id});
  }
  for(const demon of ['MESH-45','MESH-99','MESH-0','mesh-00',' MESH-00','<script>']){
    assert.equal(numogramDemonTarget(new URLSearchParams({view:'numogram',demon}),reference.demons),null);
  }
  assert.equal(numogramDemonTarget(new URLSearchParams({view:'library',demon:'MESH-00'}),reference.demons),null);
  assert.equal(numogramDemonTarget(new URLSearchParams({view:'numogram',demon:'MESH-00',numo:'matrix'}),reference.demons),null);
  const source=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
  const route=source.slice(source.indexOf("if(nextView==='numogram'){"),source.indexOf("if(nextView==='study-sets')"));
  assert.ok(route.indexOf('numogramDemonTarget(p,reference.demons)')>=0);
  assert.ok(route.indexOf('numoWorkspace.openReference(demonTarget)')>route.indexOf('numoWorkspace=mountNumogramAtlas'));
});


test('clean search-page routes open the exact native book and source without changing the canonical URL',()=>{
 const clean=new URL('https://carelibrary.org/books/a-book-an-author/');
 const initial={view:'workspace',book:'existing-reader-slug',sources:['RAW_FIRST','RAW_SECOND']};
 const document={querySelector:()=>({textContent:JSON.stringify(initial)})};
 const route=readSearchPageRoute(document);
 const opening=searchPageRouteParams(clean.hash,route);
 assert.equal(opening.get('view'),'workspace');
 assert.equal(opening.get('book'),'existing-reader-slug');
 assert.equal(searchPageRouteParams('#source-2',route).get('source'),'RAW_SECOND');
 assert.equal(searchPageRouteParams('#source-99',route).has('source'),false);
 assert.equal(searchPageRouteParams('#ref=CH_EXACT%3AA1',route).get('book'),'existing-reader-slug');
 assert.equal(searchPageRouteParams('#ref=CH_EXACT%3AA1',route).get('ref'),'CH_EXACT:A1');
 assert.equal(searchPageRouteParams('#view=workspace&unit=CH_EXACT',route).get('book'),'existing-reader-slug');
 assert.equal(searchPageRouteParams('#view=library',route).has('book'),false);
 assert.equal(searchPageRouteParams('#book=another-published-book',route).get('book'),'another-published-book');
 assert.equal(clean.href,'https://carelibrary.org/books/a-book-an-author/');
});

test('clean NUMO routes preserve their initial demon and the instrument current address',()=>{
 const document={querySelector:()=>({textContent:'{"view":"numogram","demon":"MESH-00"}'})};
 const route=readSearchPageRoute(document);
 assert.equal(searchPageRouteParams('',route).get('view'),'numogram');
 assert.equal(searchPageRouteParams('',route).get('demon'),'MESH-00');
 assert.equal(searchPageRouteParams('#numo=zone-7',route).get('numo'),'zone-7');
 assert.equal(searchPageRouteParams('#numo=zone-7',route).get('view'),'numogram');
 assert.equal(searchPageRouteParams('#view=library',route).get('view'),'library');
 assert.deepEqual([...searchPageRouteParams('#book=old-link',null)],[['book','old-link']]);
 for(const text of ['broken JSON','{"view":"elsewhere","book":"wrong"}','{"view":"workspace"}']){
  assert.equal(readSearchPageRoute({querySelector:()=>({textContent:text})}),null);
 }
 assert.equal(readSearchPageRoute({querySelector:()=>null}),null);
});

test('search fallback takeover is announced once only after the actual view mounts',()=>{
 const document=new EventTarget();document.querySelector=()=>({});
 let mounted=false,visibleFallback=true,events=0;
 document.addEventListener('care:search-ready',event=>{
  assert.equal(mounted,true);
  assert.equal(event.detail.book,'existing-reader-slug');
  visibleFallback=false;events++;
 });
 const ready=createSearchPageReady(document,{CustomEvent});
 assert.equal(visibleFallback,true);
 mounted=true;ready({view:'workspace',book:'existing-reader-slug'});
 assert.equal(visibleFallback,false);
 ready({view:'numogram'});
 assert.equal(events,1);
 const source=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
 assert.match(source,/setLoadStatus\(\);paint\(\);searchPageReady\(/);
 assert.match(source,/searchPageRouteParams\(location.hash,initialSearchRoute\)/);
});


test('a clean chapter URL opens its exact attested source immediately',()=>{
 const initial={view:'workspace',book:'existing-reader-slug',sources:['RAW_FIRST','RAW_SECOND'],source:'RAW_SECOND'};
 const route=readSearchPageRoute({querySelector:()=>({textContent:JSON.stringify(initial)})});
 const params=searchPageRouteParams('',route);
 assert.equal(params.get('book'),'existing-reader-slug');
 assert.equal(params.get('source'),'RAW_SECOND');
 assert.equal(searchPageRouteParams('#source-1',route).get('source'),'RAW_FIRST');
 const invalid=readSearchPageRoute({querySelector:()=>({textContent:JSON.stringify({...initial,source:'RAW_OTHER_BOOK'})})});
 assert.equal(searchPageRouteParams('',invalid).has('source'),false);
});
