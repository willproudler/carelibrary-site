import {session} from './auth.mjs';

const app=document.getElementById('care-search-app');
const shellLoads=new WeakMap();

export async function mountSearchApplicationShell(doc=document,fetcher=globalThis.fetch){
 const shell=doc.getElementById('care-search-app');
 if(!shell||shell.dataset.careSearchShell!=='library'||shell.dataset.careSearchShellMounted==='true')return shell;
 if(shellLoads.has(shell))return shellLoads.get(shell);
 const loading=(async()=>{
  const response=await fetcher('/library.html',{credentials:'same-origin',cache:'no-store',redirect:'error'});
  const destination=new URL(response.url||'/library.html',doc.location.href);
  if(!response.ok||response.redirected||destination.origin!==doc.location.origin||destination.pathname!=='/library.html'||
    !response.headers.get('content-type')?.includes('text/html'))throw Error('The Library shell is unavailable.');
  const parsed=new doc.defaultView.DOMParser().parseFromString(await response.text(),'text/html');
  for(const node of parsed.querySelectorAll('script,noscript'))node.remove();
  parsed.getElementById('care-published-catalogue')?.remove();
  if(!['reader','workbench-library-menu','studio-workspace'].every(id=>parsed.getElementById(id))||parsed.getElementById('care-search-app')){
   throw Error('The Library shell is incomplete.');
  }
  const ids=new Set();
  for(const node of parsed.body.querySelectorAll('[id]')){
   if(ids.has(node.id)||doc.getElementById(node.id))throw Error('The Library shell has conflicting elements.');
   ids.add(node.id);
  }
  shell.replaceChildren(...[...parsed.body.childNodes].map(node=>doc.importNode(node,true)));
  shell.dataset.careSearchShellMounted='true';
  return shell;
 })();
 shellLoads.set(shell,loading);
 try{return await loading;}catch(error){shellLoads.delete(shell);throw error;}
}

export function revealSearchApplication(doc=document){
 const content=doc.getElementById('care-search-content'),shell=doc.getElementById('care-search-app');
 if(!content||!shell)return false;
 if(shell.dataset.careSearchShell==='library'&&shell.dataset.careSearchShellMounted!=='true')return false;
 shell.removeAttribute('inert');shell.removeAttribute('aria-hidden');
 content.hidden=true;
 doc.documentElement.dataset.careSearchReady='true';
 return true;
}

function accessMessage(message,doc=document){
 const target=doc.querySelector('[data-care-search-access]');
 if(!target)return;
 target.hidden=false;target.replaceChildren(doc.createTextNode(message+' '));
 const link=doc.createElement('a');
 link.href='/login.html?next='+encodeURIComponent(doc.location.pathname+doc.location.search+doc.location.hash);
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

export async function startSearchPage({doc=document,readSession=session,fetcher=globalThis.fetch,
 bootLibrary=()=>import('/library-boot.mjs'),bootNumogram=publicNumogram}={}){
 const initial=doc.getElementById('care-search-route'),fallback=doc.getElementById('care-search-content'),shell=doc.getElementById('care-search-app');
 if(!initial||!fallback||!shell)return;
 const route=JSON.parse(initial.textContent);
 const rendered=()=>{if(revealSearchApplication(doc))doc.removeEventListener('care:search-ready',rendered);};
 doc.addEventListener('care:search-ready',rendered);
 const current=await readSession();
 if(current.authenticated||current.beta_enabled===false){
  await mountSearchApplicationShell(doc,fetcher);
  await bootLibrary();
 }else if(route.view==='numogram'){
  await bootNumogram(route);
 }else{
  accessMessage('The book’s public catalogue entry is available here. The reading panes are available to invited beta readers.',doc);
 }
}

startSearchPage().catch(()=>accessMessage('The interactive view could not load. The reference remains available on this page.'));
