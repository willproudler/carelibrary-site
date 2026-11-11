import {session} from '/auth.mjs';

const initial=document.getElementById('care-search-route');
const fallback=document.getElementById('care-search-content');
const app=document.getElementById('care-search-app');

export function revealSearchApplication(doc=document){
 const content=doc.getElementById('care-search-content'),shell=doc.getElementById('care-search-app');
 if(!content||!shell)return false;
 shell.removeAttribute('inert');shell.removeAttribute('aria-hidden');
 content.hidden=true;
 doc.documentElement.dataset.careSearchReady='true';
 return true;
}

function accessMessage(message){
 const target=document.querySelector('[data-care-search-access]');
 if(!target)return;
 target.hidden=false;target.replaceChildren(document.createTextNode(message+' '));
 const link=document.createElement('a');
 link.href='/login.html?next='+encodeURIComponent(location.pathname+location.search+location.hash);
 link.textContent='Log in to CARE Library';target.append(link);
}

async function publicNumogram(route){
 const [{default:mount},{default:reference},{mountNumogramHeaderSearch}]=await Promise.all([
  import('/native/numogram-atlas.mjs'),import('/native/numogram-reference.mjs'),import('/native/numogram-header-search.mjs'),
 ]);
 const host=app.querySelector('#reader');host.replaceChildren();
 document.documentElement.dataset.careSearchAnonymous='true';
 document.body.dataset.workbenchView='numogram';
 const demon=reference.demons.find(item=>item.id===route.demon);
 const rendered=event=>{
  if(!event.composedPath().includes(host))return;
  document.removeEventListener('care:numo-ready',rendered);
  revealSearchApplication();
 };
 document.addEventListener('care:numo-ready',rendered);
 let search;
 const workspace=mount(host,{libraryBooks:[],focusHeaderAQ:()=>search?.open(),openSource:href=>{location.href=href;}});
 if(demon)workspace.openReference({kind:'demon',id:demon.id});
 search=mountNumogramHeaderSearch({host:app.querySelector('[data-numo-header-search]'),
  onOpenNumogram:target=>workspace.openAQ(target),onOpenReference:target=>workspace.openReference(target),
  onSearchCare:()=>{location.href='/library.html';}});
 search.setActive(true);
 app.querySelector('.workbench-search').hidden=true;
 const tools=app.querySelector('[data-numo-tools]');if(tools){tools.hidden=false;tools.onclick=()=>workspace.openTools();}
 for(const button of app.querySelectorAll('[data-workspace-file-action]')){
  const action=button.dataset.workspaceFileAction;
  if(['map','demons','aq'].includes(action))button.onclick=()=>{
   if(action==='aq')search.open();else workspace.openReference({kind:action==='map'?'home':'matrix'});
  };
 }
 for(const group of app.querySelectorAll('[data-file-group]'))group.hidden=group.dataset.fileGroup!=='numogram';
 for(const link of app.querySelectorAll('a[data-page]')){
  const view=link.dataset.page;link.href=view==='numogram'?'/numogram/':view==='library'?'/library.html':'/library.html#view='+encodeURIComponent(view);
 }
 const login=app.querySelector('[data-public-login]');if(login){login.hidden=false;login.href='/login.html?next='+encodeURIComponent(location.pathname);}
 document.addEventListener('care:numo-history',event=>{
  for(const button of app.querySelectorAll('[data-history]'))button.disabled=!event.detail?.[Number(button.dataset.history)<0?'back':'forward'];
 });
 for(const button of app.querySelectorAll('[data-history]'))button.onclick=()=>document.dispatchEvent(new CustomEvent('care:numo-history-step',{detail:{step:Number(button.dataset.history)}}));
 app.querySelector('[data-write-beside]')?.setAttribute('hidden','');
}

async function start(){
 if(!initial||!fallback||!app)return;
 const route=JSON.parse(initial.textContent);
 document.addEventListener('care:search-ready',()=>revealSearchApplication());
 const current=await session();
 if(current.authenticated||current.beta_enabled===false){
  await import('/library-boot.mjs');
 }else if(route.view==='numogram'){
  await publicNumogram(route);
 }else{
  accessMessage('The book’s public catalogue entry is available here. The reading panes are available to invited beta readers.');
 }
}

start().catch(()=>accessMessage('The interactive view could not load. The reference remains available on this page.'));
