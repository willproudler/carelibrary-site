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

const menuIcons = {
  book:'M5 2.5h7l3 3v12H5zm7 0v4h3M7.5 10h5m-5 3h5',
  navigate:'M3 10h14M13 6l4 4-4 4M7 6l-4 4 4 4',
  connections:'M7 10h6M5 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4m10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  view:'M2.5 5h15v10h-15zm5 0v10',
};

// Reuse the renderer's own menus and keyboard handling from the tab strip.
export function createTabMenus(host) {
  const window = host.ownerDocument.defaultView;
  let scope, release, active, signature, anchors;
  return function sync(nextScope) {
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
          button.onclick=()=>reading.toggle(id,{toggle:true,focus:true});
          button.onkeydown=event=>{
            if(!['ArrowDown','ArrowUp','Escape'].includes(event.key))return;
            if(event.key==='Escape'&&button.getAttribute('aria-expanded')!=='true')return;
            event.preventDefault();
            reading.toggle(id,event.key==='Escape'?{close:true}:{focus:true,last:event.key==='ArrowUp'});
          };
          anchors.set(id,button);host.append(button);
        }
        return anchors;
      },
    });
  };
}

// One layer above each reader's own axiom-route history. New hash entries
// replace the browser's forward branch and Back still works with bookmarks.
export function createWorkspaceHistory(history, windowLocation, onChange) {
  const session = Math.random().toString(36).slice(2);
  let cursor = 0, end = 0, lastHash = windowLocation.hash;
  const stamp = () => history.replaceState({...history.state, careWorkspace: {session, cursor}}, '');
  stamp();
  function observe() {
    const entry = history.state?.careWorkspace;
    if (entry?.session === session) cursor = entry.cursor;
    else if (windowLocation.hash !== lastHash) {
      end = ++cursor;
      stamp();
    }
    lastHash = windowLocation.hash;
    onChange({back:cursor > 0, forward:cursor < end});
  }
  observe();
  return {
    observe,
    replace(url) {
      history.replaceState(history.state, '', url);
      lastHash = windowLocation.hash;
    },
    move(step) {
      if (step === -1 && cursor > 0 || step === 1 && cursor < end) history.go(step);
    },
  };
}
