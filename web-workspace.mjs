// The compact ten-zone map is shared by NUMO's tab and Rooms menu.
export const NUMOGRAM_GLYPH = '<g data-numogram-glyph="" stroke-width=".8"><path d="M10.1 2.2h2.5m3 3.1 1.4 2.2M7.1 9.4l1.6-2.1m3.6 6.2v2.9m0 2.8V22"/><path opacity=".7" d="M9.5 2.9C7 3.2 6.5 5.4 8.1 6.7m6.9-.8c-2 1.2-3.6-.2-4.3-2.7M8.9 8.2c.7 2.1 1.1 3.8 2.6 4.9m5-4.8c-.1 2.8-1.8 4.6-3.3 5m-.2 3.5c1.6.6 1.6 1.8.1 2.2"/><g fill="var(--workspace-icon-zone-fill,none)"><circle data-numogram-zone="3" cx="10.1" cy="2.2" r=".9"/><circle data-numogram-zone="6" cx="12.6" cy="2" r=".9"/><circle data-numogram-zone="2" cx="15.6" cy="5.3" r=".9"/><circle data-numogram-zone="7" cx="17" cy="7.5" r=".9"/><circle data-numogram-zone="5" cx="8.7" cy="7.3" r=".9"/><circle data-numogram-zone="4" cx="7.1" cy="9.4" r=".9"/><circle data-numogram-zone="1" cx="12.3" cy="13.5" r=".9"/><circle data-numogram-zone="8" cx="12.3" cy="16.4" r=".9"/><circle data-numogram-zone="9" cx="12.3" cy="19.2" r=".9"/><circle data-numogram-zone="0" cx="12.3" cy="22" r=".9"/></g></g>';
export const NUMOGRAM_READING_STYLE = Object.freeze({label:'NUMO',color:'#88c7a4',icon:NUMOGRAM_GLYPH});

// The public workbench has one stable presentation. Legacy saved settings and
// older reader-menu events must not reverse these states after a view mounts.
export function installFixedWorkbenchPreferences(window, document) {
  const labelsKey='care-web-toolbar-labels-v1',arrowsKey='care-slider-arrows-v1';
  const store=(key,value)=>{try{window.localStorage.setItem(key,value);}catch{}};
  function labels(){
    window.careToolbarLabelsVisible=false;
    document.documentElement.dataset.careToolbarLabels='false';
    store(labelsKey,'false');
    window.dispatchEvent(new window.CustomEvent('care-toolbar-labels-changed',{detail:{visible:false}}));
  }
  function arrows(){
    window.careSliderArrowsVisible=true;
    document.documentElement.dataset.careSliderArrows='true';
    store(arrowsKey,'true');
    window.dispatchEvent(new window.CustomEvent('care-slider-arrows-changed',{detail:{visible:true}}));
  }
  const requestLabels=event=>{event.stopImmediatePropagation();labels();};
  const requestArrows=event=>{event.stopImmediatePropagation();arrows();};
  const changedLabels=event=>{if(event.detail?.visible!==false){event.stopImmediatePropagation();labels();}};
  const changedArrows=event=>{if(event.detail?.visible!==true){event.stopImmediatePropagation();arrows();}};
  const storage=event=>{if(event.key===null||event.key===labelsKey)labels();if(event.key===null||event.key===arrowsKey)arrows();};
  const listeners=[['care-toolbar-labels-request',requestLabels],['care-slider-arrows-request',requestArrows],
    ['care-toolbar-labels-changed',changedLabels],['care-slider-arrows-changed',changedArrows],['storage',storage]];
  for(const [type,listener] of listeners)window.addEventListener(type,listener,true);
  labels();arrows();
  return ()=>{for(const [type,listener] of listeners)window.removeEventListener(type,listener,true);};
}

// A native chamber address reflects the instrument's current selection and
// takes precedence over the initial demon link supplied by a public page.
export function numogramDemonTarget(params, demons) {
  const id=params.get('demon');
  if(params.get('view')!=='numogram'||params.get('numo')||!/^MESH-[0-9]{2}$/.test(id||''))return null;
  return demons.some(demon=>demon.id===id)?{kind:'demon',id}:null;
}

const searchable = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

export function findCatalogue(works, fields, query, limit = 20) {
  const words = searchable(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const rows = [
    ...works.map(work => ({
      title: work.title, detail: [work.author, work.year].filter(Boolean).join(' · '),
      search: [work.title, work.original_title, work.author, work.year, work.edition].join(' '),
      href: '#book=' + encodeURIComponent(work.slug),
    })),
    ...fields.map(field => ({
      title: field.title, detail: field.field === 'corpus' ? 'Corpus' : 'Lateral',
      search: [field.title, field.field, field.author].join(' '),
      href: '#field=' + encodeURIComponent(field.id),
    })),
  ];
  return rows.filter(row => words.every(word => searchable(row.search).includes(word)))
    .sort((a, b) => Number(words.every(word => searchable(b.title).includes(word)))
      - Number(words.every(word => searchable(a.title).includes(word)))
      || a.title.localeCompare(b.title)).slice(0, limit);
}

export function manuscriptHash(mode, draftId = '') {
  const route = new URLSearchParams({view: mode});
  if (draftId) route.set('draft', draftId);
  return '#' + route;
}

// Generated alongside the public book pages. Reuse the exact route assigned to
// each work; author/title spellings and collision rules belong to the exporter.
export function createBookAddressing(document) {
  const byBook=new Map(),byPath=new Map();
  try {
    const value=JSON.parse(document.querySelector('#care-book-routes')?.textContent||'null');
    if(value?.schema==='care-book-routes/1'&&Array.isArray(value.books))for(const entry of value.books){
      if(typeof entry.work_id!=='string'||typeof entry.reader_slug!=='string'||!/^\/[a-z0-9]{2,224}$/.test(entry.url||''))continue;
      const route={view:'workspace',book:entry.reader_slug,url:entry.url};
      byBook.set(entry.work_id,route);byBook.set(entry.reader_slug,route);
      for(const path of [entry.url,entry.url+'/',...(Array.isArray(entry.aliases)?entry.aliases:[])]){
        if(typeof path==='string'&&/^\/(?!\/)[^?#\\]*$/.test(path))byPath.set(path,route);
      }
    }
  } catch { /* An older export still has fully functional hash-based readings. */ }
  return {
    route(pathname){return byPath.get(pathname)||null;},
    book(id){return byBook.get(id)||null;},
    href(destination,{pathname='/library.html',search='',embedded=false}={}){
      const target=new URL(destination||'#','https://care.invalid'+pathname+search);
      if(target.origin!=='https://care.invalid')return destination;
      const params=new URLSearchParams(target.hash.slice(1));
      const nonBookRoom=['field','lateral','compare'].some(key=>params.has(key))||params.has('view')&&params.get('view')!=='workspace';
      const route=!nonBookRoom&&(params.has('book')?byBook.get(params.get('book')):byPath.get(target.pathname));
      if(embedded){
        if(route&&!params.has('book'))params.set('book',route.book);
        return '#'+params;
      }
      if(route){
        params.delete('book');if(params.get('view')==='workspace')params.delete('view');
        return route.url+target.search+(params.size?'#'+params:'');
      }
      // Hash workspace links must leave the previous book's semantic pathname.
      if(String(destination).startsWith('#'))return '/library.html'+target.search+(params.size?'#'+params:'');
      return destination;
    },
  };
}

const menuIcons = {
  book:'M5 2.5h7l3 3v12H5zm7 0v4h3M7.5 10h5m-5 3h5',
  navigate:'M3 10h14M13 6l4 4-4 4M7 6l-4 4 4 4',
  connections:'M7 10h6M5 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4m10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  view:'M2.5 5h15v10h-15zm5 0v10',
};

export function updateLibraryMenu(menu, view) {
  const manuscript = view === 'studio' || view === 'reader';
  const numogram = view === 'numogram';
  for (const group of menu.querySelectorAll('[data-file-group]')) {
    const scope = group.dataset.fileGroup;
    group.hidden = scope === 'numogram' ? !numogram : numogram || (scope === 'library' && manuscript);
  }
  for (const command of menu.querySelectorAll('[data-studio-editor-only],[data-file-manuscript-only]')) {
    command.hidden = command.hasAttribute('data-studio-editor-only') ? view !== 'studio' : !manuscript;
  }
}

// Keep the reader's own menu panels and keyboard handling. The brand remains
// available as their anchor after its command dropdown closes.
export function createTabMenus(host, {compactAnchor, beforeOpen = () => {}} = {}) {
  const window = host.ownerDocument.defaultView;
  let scope, release, active, signature, anchors;
  function sync(nextScope) {
    if(scope===nextScope)return;
    const bridge=window[Symbol.for('care.context-menus/1')];
    if(!bridge)return;
    release?.();
    scope=nextScope;
    release=bridge.useShell({
      scope,
      paint(reading) {
        const headings=reading?.headings()||[];
        const next=JSON.stringify(headings);
        if(reading===active&&next===signature)return anchors;
        active=reading;signature=next;anchors=new Map();
        host.hidden=!headings.length;
        host.replaceChildren();
        for(const [id,label] of headings){
          const button=host.ownerDocument.createElement('button');
          button.type='button';button.title=label;
          button.setAttribute('aria-label',label);
          button.setAttribute('aria-haspopup','dialog');
          button.setAttribute('aria-expanded','false');
          const icon=host.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');
          icon.setAttribute('viewBox','0 0 20 20');icon.setAttribute('aria-hidden','true');
          const path=host.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path');
          path.setAttribute('d',menuIcons[id]||'M4 6h12M4 10h12M4 14h12');icon.append(path);
          const text=host.ownerDocument.createElement('span');text.textContent=label;
          button.append(icon,text);
          button.onclick=()=>{
            beforeOpen();
            reading.toggle(id,{toggle:true,focus:true});
          };
          button.onkeydown=event=>{
            if(!['ArrowDown','ArrowUp','Escape'].includes(event.key))return;
            if(event.key==='Escape'&&button.getAttribute('aria-expanded')!=='true')return;
            event.preventDefault();
            if(event.key!=='Escape')beforeOpen();
            reading.toggle(id,event.key==='Escape'?{close:true}:{focus:true,last:event.key==='ArrowUp'});
          };
          anchors.set(id,button);host.append(button);
        }
        if(compactAnchor)anchors.set('$compact',compactAnchor);
        return anchors;
      },
    });
  }
  sync.dismiss=()=>active?.dismiss?.();
  return sync;
}

// One layer above each reader's own axiom-route history. New hash entries
// replace the browser's forward branch and Back still works with bookmarks.
export function createWorkspaceHistory(history, windowLocation, onChange) {
  const session = Math.random().toString(36).slice(2);
  const address=()=>String(windowLocation.pathname||'')+String(windowLocation.search||'')+windowLocation.hash;
  let cursor = 0, end = 0, lastAddress = address();
  const visits = new Map();
  const stamp = () => history.replaceState({...history.state, careWorkspace: {session, cursor}}, '');
  stamp();
  function remember(metadata = {}) {
    const entry = history.state?.careWorkspace;
    if (entry?.session !== session || entry.cursor !== cursor) return;
    const hash = windowLocation.hash, url=address(), previous = visits.get(cursor);
    visits.set(cursor, {...(previous?.url === url ? previous : {}), ...metadata, hash, url});
    lastAddress = url;
  }
  function observe() {
    const entry = history.state?.careWorkspace;
    if (entry?.session === session) cursor = entry.cursor;
    else if (address() !== lastAddress) {
      for (const index of visits.keys()) if (index > cursor) visits.delete(index);
      end = ++cursor;
      stamp();
    }
    remember();
    onChange({back:cursor > 0, forward:cursor < end});
  }
  const validOffset = step => Number.isInteger(step) && step !== 0 && cursor + step >= 0 && cursor + step <= end;
  observe();
  return {
    observe,
    remember,
    recent(limit = 60) {
      const entries = [];
      for (let offset = -1; cursor + offset >= 0 && entries.length < limit; offset--) {
        const entry = visits.get(cursor + offset);
        if (entry) entries.push({...entry, offset});
      }
      return entries;
    },
    destination(step) {
      return validOffset(step) ? visits.get(cursor + step)?.hash : undefined;
    },
    replace(url) {
      history.replaceState(history.state, '', url);
      remember();
    },
    push(url) {
      history.pushState(null, '', url);
      observe();
    },
    move(step) {
      if (validOffset(step)) history.go(step);
    },
  };
}

// Search pages embed the same reader shell plus an inert initial route. Hash
// navigation remains authoritative once the visitor chooses another workspace.
export function readSearchPageRoute(document) {
  const source=document.querySelector('#care-search-route');
  if(!source)return null;
  try{
    const route=JSON.parse(source.textContent);
    if(route?.view==='workspace'&&typeof route.book==='string'&&route.book){
      const sources=Array.isArray(route.sources)&&route.sources.every(id=>typeof id==='string'&&id)?[...route.sources]:[];
      return {view:'workspace',book:route.book,sources,
        ...(typeof route.source==='string'&&sources.includes(route.source)?{source:route.source}:{})};
    }
    if(route?.view==='numogram')return {view:'numogram',
      ...(typeof route.demon==='string'?{demon:route.demon}:{})};
  }catch{}
  return null;
}

export function searchPageRouteParams(hash, initial) {
  const raw=String(hash||'').replace(/^#/,''),params=new URLSearchParams(raw);
  if(!initial)return params;
  // Full app destinations replace the page's initial route. A reference or
  // source-only fragment stays attached to the book named by this clean URL.
  if(['view','book','field','lateral','compare'].some(key=>params.has(key))){
    if(params.get('view')==='workspace'&&!params.has('book')&&initial.book)params.set('book',initial.book);
    return params;
  }
  const route=new URLSearchParams({view:initial.view});
  if(initial.book)route.set('book',initial.book);
  if(initial.source)route.set('source',initial.source);
  if(initial.demon)route.set('demon',initial.demon);
  const source=/^source-([1-9][0-9]*)$/.exec(raw);
  if(source){
    const identity=initial.sources?.[Number(source[1])-1];
    if(identity)route.set('source',identity);
  }else if(raw.includes('=')){
    for(const [key,value] of params)route.set(key,value);
  }
  return route;
}

export function createSearchPageReady(document, window) {
  let announced=false;
  return detail=>{
    if(announced||!document.querySelector('#care-search-route'))return;
    announced=true;
    document.dispatchEvent(new window.CustomEvent('care:search-ready',{detail}));
  };
}
