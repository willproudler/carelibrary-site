import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBookAddressing,createWorkspaceHistory,searchPageRouteParams} from '../web-workspace.mjs';

const books=[
 {work_id:'PLATO_TIMAEUS',reader_slug:'plato-timaeus',url:'/platotimaeus',aliases:['/books/timaeus-plato/']},
 {work_id:'HUME',reader_slug:'hume',url:'/humetreatiseofhumannature',aliases:['/books/a-treatise-david-hume/']},
];
const addresses=()=>createBookAddressing({querySelector:()=>({textContent:JSON.stringify({schema:'care-book-routes/1',books})})});

test('generated book paths replace reader slugs without changing exact source and route identities',()=>{
 const routes=addresses();
 assert.equal(routes.href('#book=plato-timaeus'),'/platotimaeus');
 assert.equal(routes.href('#book=PLATO_TIMAEUS&source=RAW_TIM%3A001'),'/platotimaeus#source=RAW_TIM%3A001');
 assert.equal(routes.href('#book=hume&unit=CH_THN_INTRO&ref=CH_THN%3AA1'),'/humetreatiseofhumannature#unit=CH_THN_INTRO&ref=CH_THN%3AA1');
 assert.equal(routes.href('#source=RAW_TIM%3A002',{pathname:'/platotimaeus'}),'/platotimaeus#source=RAW_TIM%3A002');
 const params=searchPageRouteParams('#source=RAW_TIM%3A002',routes.route('/platotimaeus'));
 assert.equal(params.get('book'),'plato-timaeus');
 assert.equal(params.get('source'),'RAW_TIM:002');
 assert.equal(routes.route('/books/timaeus-plato/').book,'plato-timaeus');
 assert.equal(routes.route('/platotimaeus/').book,'plato-timaeus');
 assert.equal(routes.href('/books/timaeus-plato/#source=RAW_TIM%3A001'),'/platotimaeus#source=RAW_TIM%3A001');
});

test('only the main book reader receives compact addresses; other rooms and companions retain library routes',()=>{
 const routes=addresses(),current={pathname:'/platotimaeus',search:'?reading=1'};
 assert.equal(routes.href('#view=studio&draft=exact-draft',current),'/library.html?reading=1#view=studio&draft=exact-draft');
 assert.equal(routes.href('#view=numogram',current),'/library.html?reading=1#view=numogram');
 assert.equal(routes.href('#field=FIELD%3Aone',current),'/library.html?reading=1#field=FIELD%3Aone');
 assert.equal(routes.href('/library.html',current),'/library.html');
 assert.equal(routes.href('#book=hume',{...current,embedded:true}),'#book=hume');
 assert.equal(routes.href('/platotimaeus#source=RAW_TIM%3A001',{...current,embedded:true}),'#source=RAW_TIM%3A001&book=plato-timaeus');
 assert.equal(routes.href('#view=workspace&unit=EXACT',current),'/platotimaeus?reading=1#unit=EXACT');
 assert.equal(routes.href('#book=unpublished',current),'/library.html?reading=1#book=unpublished');
 assert.equal(routes.href('https://elsewhere.test/platotimaeus'), 'https://elsewhere.test/platotimaeus');
});

test('older or invalid route metadata keeps published hash links operational',()=>{
 for(const text of ['invalid','{}','{"schema":"care-book-routes/1","books":[{"work_id":"bad","reader_slug":"bad","url":"//evil.test"}]}']){
  const routes=createBookAddressing({querySelector:()=>({textContent:text})});
  assert.equal(routes.route('/bad'),null);
  assert.equal(routes.href('#book=existing-slug'),'/library.html#book=existing-slug');
 }
});

test('workspace Back and Forward distinguish books with identical empty fragments',()=>{
 let entries=[{url:new URL('https://carelibrary.org/library.html'),state:null}],index=0;
 const location={get pathname(){return entries[index].url.pathname;},get search(){return entries[index].url.search;},get hash(){return entries[index].url.hash;}};
 const history={get state(){return entries[index].state;},
  replaceState(state,_title,url){entries[index]={url:url===undefined?entries[index].url:new URL(url,entries[index].url),state};},
  pushState(state,_title,url){const next=new URL(url,entries[index].url);entries=entries.slice(0,index+1);entries.push({url:next,state});index++;},
  go(step){index+=step;},
 };
 let status;const navigation=createWorkspaceHistory(history,location,value=>{status=value;});
 navigation.push('/platotimaeus');navigation.remember({title:'Timaeus'});
 navigation.push('/humetreatiseofhumannature');navigation.remember({title:'Treatise'});
 assert.equal(location.hash,'');
 assert.deepEqual(navigation.recent().map(row=>[row.url,row.title]),[['/platotimaeus','Timaeus'],['/library.html',undefined]]);
 navigation.move(-1);navigation.observe();
 assert.equal(location.pathname,'/platotimaeus');assert.deepEqual(status,{back:true,forward:true});
 navigation.replace('/platotimaeus#source=RAW_TIM%3A002');
 navigation.move(1);navigation.observe();assert.equal(location.pathname,'/humetreatiseofhumannature');
 navigation.move(-1);navigation.observe();assert.equal(location.hash,'#source=RAW_TIM%3A002');
 navigation.push('/library.html#view=studio');assert.deepEqual(status,{back:true,forward:false});
});

test('returning to an initial semantic book or chapter restores its exact title and canonical metadata',()=>{
 const source=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
 const start=source.indexOf('  if(!embedded){',source.indexOf(' function paint(){'));
 const end=source.indexOf('\n  closeReadingMenu();',start);
 assert.ok(start>=0&&end>start);
 const paint=new Function('context','const {embedded,view,state,adapter,initialPathname,initialTitle,initialCanonical,initialSearchRoute,document,location,bookAddressing,roomTitles}=context;'+source.slice(start,end));
 const works={PLATO_TIMAEUS:{id:'PLATO_TIMAEUS',slug:'plato-timaeus',title:'Timaeus',author:'Plato'},HUME:{id:'HUME',slug:'hume',title:'Treatise',author:'David Hume'}};
 for(const initialPathname of ['/platotimaeus','/platotimaeus/003-introduction/']){
  const canonical={href:'https://carelibrary.org'+initialPathname};
  const context={embedded:false,view:'workspace',state:{workId:'PLATO_TIMAEUS'},adapter:{workFor:id=>works[id]},
   initialPathname,initialTitle:'Initial exact chapter or book title',initialCanonical:canonical.href,
   initialSearchRoute:{view:'workspace',book:'plato-timaeus'},document:{title:'',querySelector:()=>canonical},
   location:{pathname:initialPathname,origin:'https://carelibrary.org'},bookAddressing:addresses(),roomTitles:{studio:'Studio'}};
  paint(context);assert.equal(context.document.title,context.initialTitle);
  context.state.workId='HUME';context.location.pathname='/humetreatiseofhumannature';paint(context);
  assert.equal(context.document.title,'Treatise — David Hume · CARE Library');
  assert.equal(canonical.href,'https://carelibrary.org/humetreatiseofhumannature');
  context.state.workId='PLATO_TIMAEUS';context.location.pathname=initialPathname;paint(context);
  assert.equal(context.document.title,context.initialTitle);
  assert.equal(canonical.href,context.initialCanonical);
 }
});
