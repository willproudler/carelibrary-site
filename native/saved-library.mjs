
const instances = new WeakMap()
const paths = {
  bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  book:'<path d="M4 4h6c2 0 2 1 2 2v15c0-2-2-3-4-3H4zm16 0h-6c-2 0-2 1-2 2v15c0-2 2-3 4-3h4z"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
  remove:'<path d="m7 7 10 10M17 7 7 17"/>',
  time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  all:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
}
const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>'
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
const text = value => String(value ?? '').trim()
const readingType = item => item.kind === 'axiom' ? 'axiom' : item.kind === 'passage' ? 'passage' : item.layer === 'SOURCE' ? 'chapter' : 'pane'
const readingTitle = item => text(item.title) || `Saved ${readingType(item)}`
const searchWords = query => query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
function matchesSavedQuery(item, words) {
  if (!words.length) return true
  const contents = [item.title,item.text,item.excerpt,item.work_title,item.author,item.layer,item.layer_label,
    item.original_title,item.original_work_title].join(' ').toLocaleLowerCase()
  return words.every(word => contents.includes(word))
}
function savedDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:date.getFullYear()!==new Date().getFullYear()?'numeric':undefined}).format(date)
}
const popupBatchSize = 8
const savedOrder = new Intl.Collator(undefined, {sensitivity:'base', numeric:true})
const popupSorts = [['recent','Recent first'],['book','Group by book'],['author','Group by author'],['title','Title A–Z']]
const popupTypes = [['','All types'],['pane','Chapters & panes'],['passage','Source passages'],['axiom','Favourite axioms']]
const popupLayer = item => item.layer_label || item.layer || 'CARE'
const popupGroup = (item, order) => order === 'book'
  ? [text(item.work_title) || item.work_id || 'Untitled book', text(item.author)]
  : [text(item.author) || 'Unknown author', '']

function popupRow(item, order) {
  const noun = readingType(item), title = readingTitle(item), excerpt = text(item.excerpt || item.text)
  const hasExcerpt = item.kind !== 'pane' && Boolean(excerpt)
  const layer = item.layer === 'SOURCE' ? `Source ${noun}` : popupLayer(item)
  const context = [hasExcerpt ? title : '', order === 'book' ? '' : item.work_title, item.available === false ? 'Unavailable' : ''].filter(Boolean).join(' · ')
  return `<li><button type="button" class="saved-popup-row" data-open="${esc(item.token)}" data-layer="${esc(item.layer)}" ${item.available === false ? 'disabled' : ''}>
    <span class="saved-popup-glyph">${icon(item.kind === 'axiom' ? 'star' : 'bookmark')}</span>
    <span class="saved-popup-copy"><span class="saved-popup-title">${esc(hasExcerpt ? excerpt : title)}</span>
    <span class="saved-popup-meta"><span class="saved-popup-layer">${esc(layer)}</span>${context ? `<span>${esc(context)}</span>` : ''}</span></span>
    ${icon('arrow')}</button></li>`
}

function popupGroups(items, state) {
  const words = searchWords(state.query)
  const visible = items.filter(item => (!state.kind || item.kind === state.kind)
    && (!state.layer || popupLayer(item) === state.layer) && matchesSavedQuery(item, words))
  if (state.order === 'title') visible.sort((a,b) => savedOrder.compare(readingTitle(a), readingTitle(b)))
  const grouped = state.order === 'book' || state.order === 'author'
  const groups = new Map()
  for (const item of visible) {
    const [title, detail] = grouped ? popupGroup(item, state.order) : ['', '']
    const key = JSON.stringify([title, detail])
    if (!groups.has(key)) groups.set(key, {title, detail, items:[]})
    groups.get(key).items.push(item)
  }
  return {groups:[...groups.values()].sort((a,b) => savedOrder.compare(a.title,b.title) || savedOrder.compare(a.detail,b.detail)),
    count:visible.length}
}

function mountSavedPopover(root, state, items, emit) {
  const layers = [...new Set(items.map(popupLayer))].sort(savedOrder.compare)
  if (!layers.includes(state.layer)) state.layer = ''
  const signature = JSON.stringify(items)
  const options = (choices, value) => choices.map(([key,label]) => `<option value="${esc(key)}" ${key === value ? 'selected' : ''}>${esc(label)}</option>`).join('')
  if (!root.querySelector('.saved-popup') || state.signature !== signature) {
    state.signature = signature
    const controls = items.length ? `<div class="saved-popup-controls">
      <label class="saved-search">${icon('search')}<input type="search" aria-label="Search saved readings" placeholder="Search books, authors or passages…" data-search value="${esc(state.query)}"></label>
      <div class="saved-popup-filters">
        <select aria-label="Sort or group saved readings" data-saved-filter="order">${options(popupSorts, state.order)}</select>
        <select aria-label="Filter by bookmark type" data-saved-filter="kind">${options(popupTypes, state.kind)}</select>
        <select aria-label="Filter by CARE layer" data-saved-filter="layer">${options([['','All layers'],...layers.map(layer => [layer,layer === 'SOURCE' ? 'Source' : layer])], state.layer)}</select>
      </div></div>` : ''
    root.innerHTML = `<div class="saved-popup"><header class="saved-popup-heading"><span class="saved-popup-emblem">${icon('bookmark')}</span>
      <div><span class="saved-eyebrow">Your personal collection</span><h2>Saved readings</h2></div></header>${controls}
      <p class="saved-popup-status" data-status role="status" ${items.length ? '' : 'hidden'}></p>
      <div class="saved-popup-results" data-results ${items.length ? 'role="region" aria-label="Saved reading results" tabindex="0"' : ''}></div></div>`
  }
  const results = root.querySelector('[data-results]')
  let groups, groupIndex, groupOffset
  function appendNext() {
    let remaining = popupBatchSize
    while (remaining && groupIndex < groups.length) {
      const group = groups[groupIndex]
      if (!groupOffset) {
        const title = group.title ? `<h3 class="saved-popup-group">${esc(group.title)}${group.detail ? `<small>${esc(group.detail)}</small>` : ''}</h3>` : ''
        results.insertAdjacentHTML('beforeend', `${title}<ul class="saved-popup-list"></ul>`)
      }
      const rows = group.items.slice(groupOffset, groupOffset + remaining)
      results.lastElementChild.insertAdjacentHTML('beforeend', rows.map(item => popupRow(item, state.order)).join(''))
      groupOffset += rows.length
      remaining -= rows.length
      if (groupOffset === group.items.length) {
        groupIndex++
        groupOffset = 0
      }
    }
  }
  function paint(resetScroll = false) {
    const matched = popupGroups(items, state), count = matched.count
    groups = matched.groups
    groupIndex = groupOffset = 0
    root.querySelector('[data-status]').textContent = count === items.length
      ? `${count} saved ${count === 1 ? 'reading' : 'readings'}` : `${count} of ${items.length} saved readings`
    const empty = items.length
      ? '<p>No saved readings match these filters.</p><button type="button" class="saved-popup-small" data-clear>Clear filters</button>'
      : '<p>Bookmark a source passage, chapter or pane, or favourite an axiom. They will appear here.</p>'
    results.innerHTML = count ? '' : `<div class="saved-popup-empty">${empty}</div>`
    appendNext()
    // On a tall screen the first batch may not overflow the viewport yet.
    while (results.clientHeight && results.scrollHeight <= results.clientHeight && groupIndex < groups.length) appendNext()
    if (resetScroll) results.scrollTop = 0
  }
  results.onscroll = () => {
    if (results.scrollHeight - results.scrollTop - results.clientHeight < 96) appendNext()
  }
  const focusLastReading = event => {
    if (event.target === results.lastElementChild?.lastElementChild?.firstElementChild) appendNext()
  }
  results.addEventListener('focusin', focusLastReading)
  root.oninput = event => {
    if (!event.target.hasAttribute('data-search')) return
    state.query = event.target.value
    paint(true)
  }
  root.onchange = event => {
    const filter = event.target.dataset.savedFilter
    if (!['kind','layer','order'].includes(filter)) return
    state[filter] = event.target.value
    paint(true)
  }
  root.onclick = event => {
    const button = event.target.closest('button')
    if (!button || button.disabled) return
    if (button.hasAttribute('data-clear')) {
      state.query = state.kind = state.layer = ''
      const search = root.querySelector('[data-search]')
      search.value = ''
      for (const select of root.querySelectorAll('[data-saved-filter]')) select.value = state[select.dataset.savedFilter]
      paint(true)
      search.focus()
      return
    }
    const item = items.find(item => item.token === button.dataset.open)
    if (!item || item.available === false) return
    button.disabled = true
    emit('open', item)
  }
  paint()
  return () => {
    root.onclick = root.oninput = root.onchange = null
    results.onscroll = null
    results.removeEventListener('focusin', focusLastReading)
  }
}

export default function(component) {
  const {parentElement,data,setStateValue} = component
  const root = parentElement.querySelector('[data-saved-library]')
  if (!root) return
  const isPopover = data.surface === 'popover'
  root.dataset.surface = isPopover ? 'popover' : 'library'
  let state = instances.get(parentElement)
  if (!state || state.reviewer !== data.reviewer || state.surface !== data.surface) {
    state = {reviewer:data.reviewer,surface:data.surface,kind:isPopover?'':'all',book:'',query:'',layer:'',order:'recent',signature:''}
    instances.set(parentElement,state)
  }
  const items = Array.isArray(data.items) ? data.items : []
  function emit(action,item) {
    setStateValue('action',{action,kind:item?.kind,id:item?.id,nonce:Date.now()+'-'+Math.random()})
  }
  if (isPopover) return mountSavedPopover(root, state, items, emit)
  const bookMap = new Map(items.filter(item=>item.work_id).map(item=>[item.work_id,item.work_title]))
  const counts = {all:items.length,pane:items.filter(item=>item.kind==='pane').length,passage:items.filter(item=>item.kind==='passage').length,axiom:items.filter(item=>item.kind==='axiom').length}
  if (state.book && !bookMap.has(state.book)) state.book = ''
  root.dataset.theme = data.theme === 'light' ? 'light' : 'dark'
  function card(item) {
    const isAxiom = item.kind==='axiom', noun = readingType(item), title = readingTitle(item)
    const excerpt = text(item.excerpt || item.text), date = savedDate(item.saved_at)
    const available = item.available !== false, kindName = isAxiom?'Favourite axiom':'Bookmarked '+noun
    return `<article class="saved-card" data-kind="${esc(item.kind)}" data-layer="${esc(item.layer)}" data-unavailable="${!available}">
      <div class="saved-card-top"><div class="saved-kind">${icon(isAxiom?'star':'bookmark')}<b>${esc(item.layer_label||item.layer||'CARE')}</b><span>${kindName}</span></div><button class="saved-remove" type="button" data-remove="${esc(item.token)}" title="${isAxiom?'Remove favourite':'Remove bookmark'}" aria-label="${isAxiom?'Remove favourite':'Remove bookmark'}: ${esc(title)}">${icon('remove')}</button></div>
      <button class="saved-open" type="button" data-open="${esc(item.token)}" ${available?'':'disabled'} aria-label="${available?'Open':'Unavailable'} ${noun}: ${esc(title)}">
        <h2>${esc(title)}</h2>${excerpt?`<p class="saved-excerpt">${esc(excerpt)}</p>`:!isAxiom?`<p class="saved-excerpt">${esc(({CH:'Chapter reading',CL:'Cluster reading',MC:'Macro reading',CM:'Macro reading',SOURCE:'Source reading',WB:'Whole-book reading'})[item.layer]||'CARE reading')} · return to this pane in your book.</p>`:''}
        ${available?'':'<p class="saved-unavailable">This reading is currently unavailable.</p>'}
        <div class="saved-book"><span class="saved-book-icon" aria-hidden="true">${icon('book')}${item.cover_url?`<img src="${esc(item.cover_url)}" alt="" loading="lazy" decoding="async">`:''}</span><div class="saved-book-copy"><span class="saved-book-title">${esc(item.work_title||'Untitled book')}</span>${item.author?`<span class="saved-author">${esc(item.author)}</span>`:''}</div></div>
        <div class="saved-card-bottom"><span>${date?'Saved '+esc(date):'Saved to your library'}</span><span class="saved-open-label">${available?'Open '+noun:'Unavailable'}${available?icon('arrow'):''}</span></div>
      </button></article>`
  }
  function renderResults() {
    const words = searchWords(state.query)
    const visible = items.filter(item => (state.kind==='all'||item.kind===state.kind) && (!state.book||item.work_id===state.book) && matchesSavedQuery(item, words))
    root.querySelectorAll('[data-kind-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kindFilter===state.kind)))
    const summary = root.querySelector('[data-summary]')
    summary.innerHTML = `<strong>${visible.length} ${visible.length===1?'saved reading':'saved readings'}</strong>${visible.length!==items.length?` of ${items.length}`:''}${state.book?' in this book':''}`
    const grid = root.querySelector('[data-grid]')
    grid.innerHTML = visible.length ? visible.map(card).join('') : `<div class="saved-empty"><div class="saved-empty-icon">${icon(items.length?'search':'bookmark')}</div><h2>${items.length?'Nothing here just yet.':'Keep what stays with you.'}</h2><p>${items.length?'Try another search, choose a different book, or clear your filters.':'Bookmark a source passage, a whole chapter or a CARE pane as you read. Your favourite axioms will find a home here too.'}</p><div class="saved-empty-actions">${items.length?'<button type="button" data-clear>Clear filters</button>':data.can_exit?`<button type="button" data-exit>${icon('book')}Explore the library</button>`:''}</div></div>`
  }
  const signature = JSON.stringify([items,data.reviewer,data.can_exit,data.theme])
  if (!root.querySelector('.saved-inner') || state.signature!==signature) {
    const scroll = root.scrollTop
    root.innerHTML = `<div class="saved-inner"><header class="saved-heading"><div><div class="saved-eyebrow">${icon('bookmark')}CARE · YOUR PERSONAL COLLECTION</div><h1>Your saved library.</h1><p>The pages you return to. The ideas you want to keep.<br>Source passages, chapters, panes and favourite axioms, together in one place.</p></div><div class="saved-heading-side">${data.can_exit?`<button class="saved-back" type="button" data-exit>${icon('back')}Back to library</button>`:''}<div class="saved-stats"><div class="saved-stat"><strong>${counts.pane}</strong><span>Chapters &amp; panes</span></div><div class="saved-stat"><strong>${counts.passage}</strong><span>Source ${counts.passage===1?'passage':'passages'}</span></div><div class="saved-stat"><strong>${counts.axiom}</strong><span>Favourite ${counts.axiom===1?'axiom':'axioms'}</span></div><div class="saved-stat"><strong>${bookMap.size}</strong><span>${bookMap.size===1?'Book':'Books'}</span></div></div></div></header>
      <div class="saved-controls"><div class="saved-tabs" role="group" aria-label="Saved reading type">${[['all','All saved','all'],['pane','Chapters & panes','bookmark'],['passage','Source passages','bookmark'],['axiom','Favourite axioms','star']].map(([kind,label,glyph])=>`<button type="button" class="saved-tab" data-kind-filter="${kind}" aria-pressed="${state.kind===kind}">${icon(glyph)}${label}<small>${counts[kind]}</small></button>`).join('')}</div><div class="saved-find"><label class="saved-search">${icon('search')}<input type="search" aria-label="Search saved library" placeholder="Search your saved library…" data-search value="${esc(state.query)}"></label><select class="saved-book-select" aria-label="Filter by book" data-book><option value="">All books</option>${[...bookMap].sort((a,b)=>text(a[1]).localeCompare(text(b[1]))).map(([id,title])=>`<option value="${esc(id)}" ${id===state.book?'selected':''}>${esc(title||'Untitled book')}</option>`).join('')}</select></div></div>
      <div class="saved-results-line"><span data-summary role="status" aria-live="polite"></span><span class="saved-order">${icon('time')}Most recently saved</span></div><div class="saved-grid" data-grid></div><p class="saved-collection-note">${icon('bookmark')}Saved for ${esc(data.reviewer||'you')} · ${counts.all?'Each reading opens where you left your bookmark.':'Use the bookmark beside a passage or pane title, or favourite an axiom in its viewer.'}</p></div>`
    state.signature = signature
    renderResults()
    root.scrollTop = scroll
  }
  // An acknowledged action may leave this page mounted (for example a stale
  // reading). Re-enable its controls even if the collection did not change.
  root.querySelectorAll('[data-open], [data-remove]').forEach(button => {
    const item = items.find(item=>(button.dataset.open||button.dataset.remove)===item.token)
    button.disabled = !item || (button.hasAttribute('data-open') && item.available===false)
  })
  root.onclick = event => {
    const button = event.target.closest('button')
    if (!button || button.disabled) return
    if (button.hasAttribute('data-kind-filter')) {state.kind=button.dataset.kindFilter;renderResults();return}
    if (button.hasAttribute('data-clear')) {state.kind='all';state.book='';state.query='';root.querySelector('[data-search]').value='';root.querySelector('[data-book]').value='';renderResults();return}
    if (button.hasAttribute('data-exit')) {emit('exit');return}
    const token = button.dataset.open || button.dataset.remove
    const item = items.find(item=>item.token===token)
    if (!item) return
    const removing = button.hasAttribute('data-remove')
    if (!removing && item.available===false) return
    button.disabled=true
    emit(removing?'remove':'open',item)
  }
  root.oninput = event => {if(event.target.hasAttribute('data-search')){state.query=event.target.value;renderResults()}}
  root.onchange = event => {if(event.target.hasAttribute('data-book')){state.book=event.target.value;renderResults()}}
  const coverError = event => {
    if (event.target.matches?.('.saved-book-icon img')) event.target.remove()
  }
  root.addEventListener('error',coverError,true)
  // Cached failures may complete before handlers are attached during a rerun.
  root.querySelectorAll('.saved-book-icon img').forEach(img=>{
    if (img.complete && !img.naturalWidth) img.remove()
  })
  return () => {root.onclick=null;root.oninput=null;root.onchange=null;root.removeEventListener('error',coverError,true)}
}

export const html = "\n<section class=\"saved-library\" data-saved-library aria-label=\"Saved library\"></section>\n";
export const css = "\n:host{display:block;min-width:0;height:100%;font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif)}\n*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{cursor:default}svg{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}[hidden]{display:none!important}\n.saved-library{--saved-bg:#111116;--saved-panel:#141a22;--saved-ink:#eee9df;--saved-muted:#9aa3ad;--saved-line:#2a343f;--saved-control:#191f28;--saved-burgundy:#bd7b88;--saved-mark:#ac5368;--saved-blue:#88b2d5;--saved-teal:#84bdb1;--saved-purple:#b59acb;--saved-source:#d0a06f;display:flex;flex-direction:column;height:100%;min-height:min(26rem,calc(100dvh - 4rem));max-height:calc(100dvh - 4rem);overflow:auto;overscroll-behavior:contain;background:radial-gradient(ellipse at 5% 0,rgba(104,28,49,.19),transparent 47%),radial-gradient(ellipse at 98% 0,rgba(74,28,46,.10),transparent 40%),var(--saved-bg);color:var(--saved-ink);border:1px solid var(--saved-line);border-radius:12px;scrollbar-width:thin;scrollbar-color:var(--saved-line) transparent}\n.saved-library[data-theme=\"light\"]{--saved-bg:#f1eee7;--saved-panel:#faf8f2;--saved-ink:#292d30;--saved-muted:#686d71;--saved-line:#d8d4cc;--saved-control:#eae6dd;--saved-burgundy:#84354a;--saved-mark:#873249;--saved-blue:#3c6d94;--saved-teal:#397b70;--saved-purple:#7c5695;--saved-source:#975f2d;background:var(--saved-bg)}\n.saved-inner{width:100%;max-width:1560px;margin:0 auto;padding:clamp(24px,3.5vw,56px) clamp(20px,3.6vw,58px) 40px}\n.saved-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;padding-bottom:32px}\n.saved-eyebrow{display:flex;align-items:center;gap:9px;color:var(--saved-burgundy);font:650 10px/1.5 var(--st-code-font,ui-monospace,monospace);letter-spacing:.16em;text-transform:uppercase}.saved-eyebrow svg{width:16px;height:16px;color:var(--saved-mark)}\n.saved-heading h1{margin:14px 0 12px;font:400 clamp(34px,3.9vw,58px)/1.06 Georgia,\"Times New Roman\",serif;letter-spacing:-.035em}.saved-heading p{max-width:38rem;margin:0;color:var(--saved-muted);font-size:13px;line-height:1.65}\n.saved-heading-side{display:flex;flex-direction:column;align-items:flex-end;gap:22px;flex:none}.saved-back{display:flex;align-items:center;gap:8px;padding:8px 0;border:0;background:transparent;color:var(--saved-muted);font-size:12px}.saved-back:hover{color:var(--saved-ink)}.saved-back svg{width:16px;height:16px}\n.saved-stats{display:flex;align-items:center;gap:25px}.saved-stat{display:flex;flex-direction:column;gap:6px;border-left:1px solid var(--saved-line);padding-left:22px}.saved-stat strong{font:400 29px/1 Georgia,\"Times New Roman\",serif;color:var(--saved-ink)}.saved-stat span{font-size:10px;color:var(--saved-muted);white-space:nowrap}\n.saved-controls{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 0;border-top:1px solid var(--saved-line);border-bottom:1px solid var(--saved-line)}.saved-tabs{display:flex;gap:6px;flex-wrap:wrap}.saved-tab{display:flex;align-items:center;gap:7px;padding:10px 13px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--saved-muted);font-size:12px;white-space:nowrap}.saved-tab svg{width:15px;height:15px;color:var(--saved-burgundy)}.saved-tab small{margin-left:3px;opacity:.75;font:500 10px/1 var(--st-code-font,ui-monospace,monospace)}.saved-tab[aria-pressed=\"true\"]{color:var(--saved-ink);background:color-mix(in srgb,var(--saved-mark) 11%,var(--saved-control));border-color:color-mix(in srgb,var(--saved-mark) 32%,var(--saved-line))}.saved-tab:hover{color:var(--saved-ink)}\n.saved-find{display:flex;gap:10px;min-width:0}.saved-search{position:relative;display:flex;align-items:center;gap:9px;min-width:150px;width:230px;padding:0 12px;border:1px solid var(--saved-line);border-radius:7px;background:var(--saved-control);color:var(--saved-muted)}.saved-search svg{width:16px;height:16px}.saved-search input{width:100%;min-width:0;height:38px;padding:0;border:0;outline:0;color:var(--saved-ink);background:transparent;font-size:12px}.saved-search input::placeholder{color:var(--saved-muted)}.saved-search:focus-within{border-color:var(--saved-burgundy)}\n.saved-book-select{max-width:210px;min-width:110px;height:40px;padding:0 28px 0 12px;border:1px solid var(--saved-line);border-radius:7px;background:var(--saved-control);color:var(--saved-ink);font-size:12px;text-overflow:ellipsis}.saved-book-select option{background:var(--saved-panel);color:var(--saved-ink)}\nbutton:focus-visible,select:focus-visible{outline:2px solid var(--saved-burgundy);outline-offset:3px}\n.saved-results-line{display:flex;justify-content:space-between;gap:16px;align-items:center;min-height:58px;color:var(--saved-muted);font-size:11px}.saved-results-line strong{color:var(--saved-ink);font-weight:500}.saved-order{display:flex;align-items:center;gap:6px;white-space:nowrap}.saved-order svg{width:13px;height:13px}\n.saved-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,310px),1fr));gap:18px;align-items:stretch}.saved-card{--accent:var(--saved-blue);position:relative;min-width:0;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--saved-line);border-radius:10px;background:var(--saved-panel);transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}.saved-card[data-layer=\"CL\"]{--accent:var(--saved-teal)}.saved-card[data-layer=\"MC\"],.saved-card[data-layer=\"CM\"],.saved-card[data-layer=\"WB\"]{--accent:var(--saved-purple)}.saved-card[data-layer=\"SOURCE\"]{--accent:var(--saved-source)}.saved-card::before{position:absolute;inset:0 0 auto;height:2px;content:\"\";background:var(--accent);opacity:.7}.saved-card:hover{border-color:color-mix(in srgb,var(--accent) 55%,var(--saved-line));transform:translateY(-2px);box-shadow:0 8px 25px #00000014}.saved-card:focus-within{border-color:var(--accent)}\n.saved-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:20px 20px 0}.saved-kind{display:flex;align-items:center;gap:6px;color:var(--accent);font:650 9px/1.3 var(--st-code-font,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase}.saved-kind svg{width:13px;height:13px;color:var(--saved-mark);fill:color-mix(in srgb,var(--saved-mark) 12%,transparent)}.saved-kind b{display:inline-flex;padding:4px 6px;border:1px solid color-mix(in srgb,var(--accent) 27%,transparent);border-radius:4px;font:inherit}.saved-kind span{color:var(--saved-muted);font-size:9px;letter-spacing:.025em}\n.saved-remove{display:grid;place-items:center;flex:none;width:29px;height:29px;padding:6px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--saved-muted)}.saved-remove svg{width:15px;height:15px}.saved-remove:hover{border-color:var(--saved-line);background:var(--saved-control);color:var(--saved-ink)}\n.saved-open{display:flex;flex-direction:column;flex:1;align-items:stretch;min-width:0;width:100%;padding:17px 20px 19px;border:0;background:transparent;color:inherit;text-align:left}.saved-open:focus-visible{outline-offset:-5px}.saved-open h2{display:-webkit-box;overflow:hidden;margin:0 0 13px;font:400 23px/1.23 Georgia,\"Times New Roman\",serif;letter-spacing:-.017em;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow-wrap:anywhere;text-wrap:pretty}.saved-excerpt{display:-webkit-box;overflow:hidden;margin:0 0 22px;color:var(--saved-muted);font-size:12px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow-wrap:anywhere}.saved-card[data-kind=\"axiom\"] .saved-excerpt,.saved-card[data-kind=\"passage\"] .saved-excerpt{color:var(--saved-ink);font:400 17px/1.55 Georgia,\"Times New Roman\",serif;-webkit-line-clamp:4}.saved-card[data-kind=\"axiom\"] .saved-open h2,.saved-card[data-kind=\"passage\"] .saved-open h2{color:var(--accent);font:600 10px/1.5 var(--st-code-font,ui-monospace,monospace);letter-spacing:.025em;-webkit-line-clamp:2}.saved-book{display:flex;gap:9px;align-items:center;margin-top:auto;padding-top:15px;border-top:1px solid var(--saved-line)}.saved-book-icon{position:relative;overflow:hidden;display:grid;place-items:center;flex:none;width:28px;height:40px;border:1px solid color-mix(in srgb,var(--accent) 32%,transparent);border-radius:2px 5px 5px 2px;color:var(--accent);background:color-mix(in srgb,var(--accent) 6%,transparent);box-shadow:inset 3px 0 0 color-mix(in srgb,var(--accent) 12%,transparent)}.saved-book-icon svg{width:15px;height:15px}.saved-book-icon img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:var(--saved-panel)}.saved-book-copy{min-width:0}.saved-book-title{display:-webkit-box;overflow:hidden;color:var(--saved-ink);font-size:11px;line-height:1.4;-webkit-box-orient:vertical;-webkit-line-clamp:2}.saved-author{display:block;margin-top:3px;overflow:hidden;color:var(--saved-muted);font-size:10px;line-height:1.5;text-overflow:ellipsis;white-space:nowrap}\n.saved-card-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:18px;font-size:10px;color:var(--saved-muted)}.saved-open-label{display:flex;align-items:center;gap:7px;color:var(--accent)}.saved-open-label svg{width:15px;height:15px}.saved-card[data-unavailable=\"true\"]{opacity:.65}.saved-unavailable{margin:0 0 16px;color:var(--saved-muted);font-size:11px;line-height:1.5}\n.saved-empty{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;padding:clamp(40px,8vw,100px) 24px;text-align:center;border:1px dashed var(--saved-line);border-radius:10px;background:linear-gradient(140deg,color-mix(in srgb,var(--saved-panel) 70%,transparent),transparent)}.saved-empty-icon{display:grid;place-items:center;width:58px;height:58px;border:1px solid var(--saved-line);border-radius:16px;color:var(--saved-burgundy);background:var(--saved-panel);transform:rotate(-5deg)}.saved-empty-icon svg{width:25px;height:25px}.saved-empty h2{margin:22px 0 12px;font:400 28px/1.15 Georgia,\"Times New Roman\",serif;letter-spacing:-.02em}.saved-empty p{max-width:430px;margin:0;color:var(--saved-muted);font-size:13px;line-height:1.7}.saved-empty-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin-top:23px}.saved-empty-actions button{display:flex;align-items:center;gap:8px;padding:10px 15px;border:1px solid var(--saved-line);border-radius:7px;background:var(--saved-control);color:var(--saved-ink);font-size:12px}.saved-empty-actions svg{width:15px;height:15px}.saved-collection-note{display:flex;align-items:center;justify-content:center;gap:7px;margin:28px 0 0;color:var(--saved-muted);font-size:10px;line-height:1.6;text-align:center}.saved-collection-note svg{width:13px;height:13px;color:var(--saved-mark)}\n@media(min-width:1550px){.saved-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.saved-open{min-height:260px}}\n@media(max-width:1050px){.saved-heading-side{gap:16px}.saved-stats{gap:16px}.saved-stat{padding-left:15px}.saved-controls{align-items:stretch;flex-direction:column;gap:13px}.saved-find{justify-content:space-between}.saved-search{width:100%;max-width:none}.saved-book-select{max-width:40%;min-width:150px}.saved-tabs{gap:4px}.saved-tab{padding:8px 11px}}\n@media(max-width:640px){.saved-inner{padding:26px 18px}.saved-heading{align-items:flex-start;gap:18px;padding-bottom:25px}.saved-heading h1{font-size:36px}.saved-heading p{font-size:12px}.saved-stats{display:none}.saved-heading-side{padding-top:2px}.saved-back{font-size:0;padding:5px}.saved-back svg{width:20px;height:20px}.saved-eyebrow{font-size:9px;letter-spacing:.09em}.saved-grid{gap:13px}.saved-card-top{padding:17px 18px 0}.saved-open{padding:14px 18px 17px}.saved-tab{gap:5px;padding:8px;font-size:10px}.saved-tab small{font-size:9px;margin:0}.saved-tab svg{width:13px;height:13px}.saved-find{gap:7px}.saved-book-select{min-width:110px;width:35%;font-size:11px;padding-left:9px}.saved-results-line{font-size:10px}.saved-collection-note{align-items:flex-start}}\n@media(prefers-reduced-motion:reduce){.saved-card{transition:none}.saved-card:hover{transform:none}}\n.saved-library[data-surface=\"popover\"] {\n  --saved-bg:#17151a;\n  --saved-panel:#24212a;\n  --saved-line:#493b46;\n  --saved-control:#1b181f;\n  height:auto;\n  min-height:0;\n  max-height:none;\n  overflow:visible;\n  border:0;\n  background:transparent;\n}\n.saved-popup { min-width:0; }\n.saved-popup-heading {\n  display:flex;\n  align-items:center;\n  gap:.7rem;\n  padding:.35rem .35rem .85rem;\n}\n.saved-popup-emblem {\n  display:grid;\n  place-items:center;\n  flex:none;\n  inline-size:2.5rem;\n  block-size:2.5rem;\n  border:1px solid color-mix(in srgb,var(--saved-mark) 48%,var(--saved-line));\n  border-radius:.72rem;\n  color:var(--saved-burgundy);\n  background:var(--care-panel-material,none),linear-gradient(145deg,#442b38,#29232c);\n  box-shadow:var(--care-panel-raised,inset 0 1px #ffffff12);\n}\n.saved-popup-emblem svg { width:21px; height:21px; fill:color-mix(in srgb,var(--saved-mark) 20%,transparent); }\n.saved-popup-heading .saved-eyebrow { font-size:9px; letter-spacing:.12em; }\n.saved-popup-heading h2 { margin:.17rem 0 0; font:400 1.4rem/1.1 Georgia,serif; letter-spacing:-.025em; }\n.saved-popup-controls { display:grid; gap:.4rem; }\n.saved-popup .saved-search { width:100%; min-width:0; max-width:none; }\n.saved-popup .saved-search input { height:2.35rem; }\n.saved-popup .saved-search,.saved-popup-filters select {\n  background:var(--care-stone-grain,none),var(--saved-control);\n  box-shadow:var(--care-panel-recess,none);\n}\n.saved-popup-filters { display:grid; grid-template-columns:1.15fr 1fr .95fr; gap:.35rem; }\n.saved-popup-filters select {\n  width:100%;\n  min-width:0;\n  min-height:2.15rem;\n  padding:.35rem .35rem .35rem .5rem;\n  border:1px solid var(--saved-line);\n  border-radius:.46rem;\n  color:var(--saved-ink);\n  font-size:.7rem;\n  text-overflow:ellipsis;\n}\n.saved-popup-filters select:focus-visible { border-color:var(--saved-burgundy); outline-offset:1px; }\n.saved-popup-results {\n  max-block-size:min(22rem,40dvh);\n  min-block-size:0;\n  overflow:auto;\n  overscroll-behavior:contain;\n  scrollbar-width:thin;\n  scrollbar-color:var(--saved-line) transparent;\n  border-radius:.5rem;\n}\n.saved-popup-results:focus-visible { outline:1px solid var(--saved-burgundy); outline-offset:2px; }\n.saved-popup-list { margin:0; padding:0; list-style:none; }\n.saved-popup-group {\n  display:flex;\n  align-items:baseline;\n  flex-wrap:wrap;\n  gap:.2rem .5rem;\n  margin:0;\n  padding:.55rem .45rem .35rem;\n  color:var(--saved-burgundy);\n  font:600 .72rem/1.4 var(--st-font,system-ui,sans-serif);\n  overflow-wrap:anywhere;\n}\n.saved-popup-group small { color:var(--saved-muted); font-size:.65rem; font-weight:400; }\n.saved-popup-row {\n  --accent:var(--saved-blue);\n  display:grid;\n  grid-template-columns:1.65rem minmax(0,1fr) 1rem;\n  align-items:start;\n  gap:.5rem;\n  width:100%;\n  min-height:44px;\n  margin:0 0 .25rem;\n  padding:.58rem .45rem;\n  text-align:left;\n  color:var(--saved-ink);\n  background:var(--care-panel-material,none),var(--saved-panel);\n  border:1px solid color-mix(in srgb,var(--saved-line) 57%,transparent);\n  box-shadow:var(--care-panel-raised,none);\n  border-radius:.53rem;\n}\n.saved-popup-row[data-layer=\"SOURCE\"] { --accent:var(--saved-source); }\n.saved-popup-row[data-layer=\"CL\"] { --accent:var(--saved-teal); }\n.saved-popup-row:is([data-layer=\"MC\"],[data-layer=\"CM\"],[data-layer=\"WB\"]) { --accent:var(--saved-purple); }\n.saved-popup-row:not(:disabled):is(:hover,:focus-visible) {\n  background-color:color-mix(in srgb,var(--saved-mark) 16%,var(--saved-panel));\n  border-color:color-mix(in srgb,var(--saved-mark) 60%,var(--saved-line));\n  outline-offset:-2px;\n}\n.saved-popup-row:disabled { opacity:.58; }\n.saved-popup-glyph {\n  display:grid;\n  place-items:center;\n  inline-size:1.65rem;\n  block-size:1.65rem;\n  border-radius:.44rem;\n  color:var(--saved-burgundy);\n  background:color-mix(in srgb,var(--saved-mark) 16%,transparent);\n  box-shadow:var(--care-panel-recess,none);\n}\n.saved-popup-glyph svg { width:15px; height:15px; fill:color-mix(in srgb,var(--saved-mark) 12%,transparent); }\n.saved-popup-copy { min-width:0; display:grid; gap:.2rem; }\n.saved-popup-title {\n  display:-webkit-box;\n  overflow:hidden;\n  overflow-wrap:anywhere;\n  -webkit-box-orient:vertical;\n  -webkit-line-clamp:2;\n  font:400 1rem/1.25 Georgia,serif;\n}\n.saved-popup-meta { display:flex; align-items:baseline; flex-wrap:wrap; gap:.15rem .4rem; font-size:.68rem; line-height:1.4; color:var(--saved-muted); }\n.saved-popup-layer { color:var(--accent); font-size:.63rem; font-weight:600; }\n.saved-popup-row > svg { width:14px; height:14px; margin-top:.18rem; color:var(--saved-burgundy); opacity:.78; }\n.saved-popup-status { min-height:1.8rem; margin:0; padding:.45rem .35rem .32rem; color:var(--saved-muted); font-size:.68rem; }\n.saved-popup-empty { padding:.7rem .4rem 1rem; color:var(--saved-muted); font-size:.75rem; line-height:1.5; }\n.saved-popup-empty p { margin:.25rem 0 .65rem; }\n.saved-popup button.saved-popup-small {\n  min-height:2rem;\n  padding:.25rem .45rem;\n  border:1px solid var(--saved-line);\n  border-radius:.45rem;\n  background:var(--saved-control);\n  color:var(--saved-ink);\n  font-size:.68rem;\n}\n.saved-popup button.saved-popup-small:not(:disabled):hover { border-color:var(--saved-mark); }\n@media(max-width:520px) {\n  .saved-popup-filters select,.saved-popup button.saved-popup-small { min-height:2.55rem; }\n  .saved-popup .saved-search input { height:2.6rem; font-size:16px; }\n  .saved-popup-title { font-size:.97rem; }\n}\n";
