import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {libraryYear,librarySortMetadata,createLibrarySort,LIBRARY_SORT_KEY,LIBRARY_VISITS_KEY} from '../library-sort.mjs';

const native=fs.readFileSync(new URL('../native/study-desk.mjs',import.meta.url),'utf8');
const start=native.indexOf('const SHELF_STATE_KEY='),end=native.indexOf('\nfunction fieldMemberCover(',start);
assert.ok(start>=0&&end>start);
const shelf=new Function('arr',native.slice(start,end)+';return {shelfSelection,shelfDefaults,SHELF_SORTS};')(value=>Array.isArray(value)?value:[]);
const onInputBody=native.match(/runtime\.onShelfInput=event=>(\{[^\n]+\})/)[1];
const sorted=(books,sort)=>shelf.shelfSelection({books},{...shelf.shelfDefaults(),sort}).items.map(book=>book.id);
const storage=values=>({values:new Map(Object.entries(values||{})),getItem(key){return this.values.get(key)||null;},setItem(key,value){this.values.set(key,value);}});
function fixture(books=[],{local={},session={},blocked=false}={}){
 const listeners=new Set(),localStorage=storage(local),sessionStorage=storage(session),view={localStorage,sessionStorage,Event:class{constructor(type,options){this.type=type;Object.assign(this,options);}}};
 if(blocked){for(const key of ['localStorage','sessionStorage'])Object.defineProperty(view,key,{get(){throw Error('Storage denied');}});}
 const runtime={shelf:shelf.shelfDefaults(),paintShelf(){this.ids=sorted(books,this.shelf.sort);}};
 const nativeInput=new Function('runtime',`return event=>${onInputBody}`)(runtime);
 const control={value:'title',dataset:{shelfInput:'sort'},closest:()=>control,dispatchEvent(event){event.target=control;nativeInput(event);for(const callback of listeners)callback(event);}};
 const root={ownerDocument:{defaultView:view},querySelector:()=>control,addEventListener(name,handler){assert.equal(name,'change');listeners.add(handler);},removeEventListener(name,handler){listeners.delete(handler);}};
 const sorting=createLibrarySort(root,books,{now:()=> '2026-10-19T12:00:00.000Z'});
 return {sorting,control,runtime,localStorage,sessionStorage,listeners,choose(value){control.value=value;control.dispatchEvent(new view.Event('change',{bubbles:true}));}};
}
function books(){
 return [
  {id:'ancient',title:'Zebra',author:'Zed',year:'360 BCE',units:[{},{}],layers:['CH'],version_label:'Added 1 Oct 2026 · Run 15 Oct 2026'},
  {id:'middle',title:'Alpha',author:'Beta',year:'400 CE',units:[{},{}],layers:['CH','WB'],version_label:'Added 16 Oct 2026 · Run 17 Oct 2026'},
  {id:'modern',title:'Delta',author:'Able',year:'1930',units:[{},{},{}],layers:['CH','WB'],version_label:'Added 14 Oct 2026'},
  {id:'unknown',title:'Beta',author:'Gamma',year:'Undated',units:[],layers:[],version_label:'Run 19 Oct 2026'},
 ].map(work=>({...work,...librarySortMetadata(work)}));
}

test('year projection respects original dates, BCE/CE and ranges without altering published labels',()=>{
 for(const [value,expected]of [[-360,-360],['-350',-350],['55 BCE',-55],['c. 350 B.C.',-350],['AD 400',400],['400 CE',400],['1739–1740',1739],['1781 / 1787',1781],['circa 1600',1600],['unknown',null],['',null],[null,null],['19th century',null],[Infinity,null]])assert.equal(libraryYear(value),expected,String(value));
 const work={year:'1885 / 1891',original_year:1883,publication_year:1891,units:[{}]},before=structuredClone(work);
 assert.equal(librarySortMetadata(work).original_year,1883);
 assert.deepEqual(work,before);
 assert.equal(librarySortMetadata({year:'Unknown',publication_year:1900}).original_year,1900);
 assert.equal(librarySortMetadata({version_label:'Run 19 Oct 2026'}).ingested_at,null,'A build date is not an added date');
 assert.equal(librarySortMetadata({version_label:'Added 31 Feb 2026'}).ingested_at,null);
});

test('real released catalogue sorts oldest to newest across BCE and CE using native shelf logic',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../data/catalogue.json',import.meta.url),'utf8'));
 const projected=data.works.map(work=>({...work,...librarySortMetadata(work)}));
 const ascending=shelf.shelfSelection({books:projected},{...shelf.shelfDefaults(),sort:'oldest'}).items;
 assert.deepEqual(ascending.map(book=>book.title),['Timaeus','Metaphysics','On the Nature of Things','Confessions','Monas Hieroglyphica','Ethics','A Treatise of Human Nature','The Critique of Pure Reason','Thus Spoke Zarathustra','Matter and Memory','Civilization and its Discontents']);
 assert.ok(ascending.every((book,index)=>!index||ascending[index-1].original_year<=book.original_year));
 assert.deepEqual(sorted(projected,'newest'),ascending.map(book=>book.id).reverse());
});

test('every advertised sort option runs through the native select handler and changes the shelf correctly',()=>{
 const rows=books(),f=fixture(rows,{local:{[LIBRARY_VISITS_KEY]:JSON.stringify({ancient:'2026-10-19T00:00:00Z',modern:'2026-10-18T00:00:00Z',middle:'2026-10-17T00:00:00Z'})}});
 const expected={title:['middle','unknown','modern','ancient'],'title-desc':['ancient','modern','unknown','middle'],author:['modern','middle','unknown','ancient'],oldest:['ancient','middle','modern','unknown'],newest:['modern','middle','ancient','unknown'],added:['middle','modern','ancient','unknown'],visited:['ancient','modern','middle','unknown'],coverage:['modern','middle','ancient','unknown']};
 assert.deepEqual(new Set(shelf.SHELF_SORTS.map(([id])=>id)),new Set(Object.keys(expected)));
 for(const [sort,ids]of Object.entries(expected)){f.choose(sort);f.runtime.paintShelf();assert.equal(f.control.value,sort);assert.equal(f.runtime.shelf.sort,sort);assert.deepEqual(f.runtime.ids,ids,sort);}
 const ties=[{id:'z',title:'Same',original_year:1500},{id:'a',title:'Same',original_year:1500},{id:'b',title:'Alpha',original_year:1500},{id:'u',title:'Unknown',original_year:null}];
 assert.deepEqual(sorted(ties,'oldest'),['b','a','z','u'],'Ties use title then stable identity; undated books remain last');
 assert.deepEqual(sorted(ties,'newest'),['b','a','z','u']);
});

test('first visit defaults oldest without replacing explicit current or legacy choices',()=>{
 const f=fixture(books());f.sorting.apply();
 assert.equal(f.control.value,'oldest');assert.deepEqual(f.runtime.ids,['ancient','middle','modern','unknown']);
 assert.equal(f.localStorage.getItem(LIBRARY_SORT_KEY),null,'Applying a default is not recorded as an explicit user choice');
 f.choose('newest');f.sorting.apply();assert.equal(f.control.value,'newest');
 const reopened=fixture(books(),{local:Object.fromEntries(f.localStorage.values)});reopened.sorting.apply();assert.equal(reopened.control.value,'newest');
 for(const sort of ['title','author','coverage']){
  const legacy=fixture(books(),{session:{'care-studio-shelf/1':JSON.stringify({sort,query:'old search',language:'fr'})}});legacy.sorting.apply();assert.equal(legacy.control.value,sort);assert.deepEqual(JSON.parse(legacy.localStorage.getItem(LIBRARY_SORT_KEY)),{sort});
 }
 const preferred=fixture(books(),{local:{[LIBRARY_SORT_KEY]:JSON.stringify({sort:'author'})},session:{'care-studio-shelf/1':JSON.stringify({sort:'oldest'})}});preferred.sorting.apply();assert.equal(preferred.control.value,'author');
 f.sorting.dispose();assert.equal(f.listeners.size,0);
});

test('blocked or malformed storage still provides oldest-first ordering and working in-session choices',()=>{
 for(const options of [{blocked:true},{local:{[LIBRARY_SORT_KEY]:'{broken'},session:{'care-studio-shelf/1':'null'}},{local:{[LIBRARY_SORT_KEY]:JSON.stringify({sort:'private-mode'})}}]){
  const f=fixture(books(),options);f.sorting.apply();assert.equal(f.control.value,'oldest');
  f.choose('author');f.sorting.apply();assert.equal(f.control.value,'author');assert.deepEqual(f.runtime.ids,['modern','middle','unknown','ancient']);
 }
});

test('recent visits use actual known book openings and persist without changing dates or saved records',()=>{
 const rows=books(),f=fixture(rows),years=rows.map(book=>book.original_year);
 f.sorting.visit('not-published');assert.equal(f.localStorage.getItem(LIBRARY_VISITS_KEY),null);
 f.sorting.visit('middle');f.choose('visited');assert.equal(f.runtime.ids[0],'middle');
 assert.deepEqual(JSON.parse(f.localStorage.getItem(LIBRARY_VISITS_KEY)),{middle:'2026-10-19T12:00:00.000Z'});
 assert.deepEqual(rows.map(book=>book.original_year),years);
 const later=fixture(books(),{local:Object.fromEntries(f.localStorage.values)});later.sorting.apply();assert.equal(later.control.value,'visited');assert.equal(later.runtime.ids[0],'middle');
});
