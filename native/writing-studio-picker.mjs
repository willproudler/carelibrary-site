// Generated from care_platform/writing_studio_picker.py by tools/export_native_studio_picker.py.
export const pickerMarkup = "<span class=\"studio-mode-hint\" data-mode-hint aria-hidden=\"true\" hidden></span>\n  <section id=\"care-studio-picker-panel\" class=\"studio-picker-panel\" data-picker-panel\n           aria-label=\"CARE Studio drafts\" hidden>\n    <header class=\"studio-picker-header\">\n      <div><span data-picker-kicker>CARE STUDIO</span><strong data-picker-title>Open a draft</strong></div>\n      <button type=\"button\" class=\"studio-picker-new\" data-picker-new>+ New Draft</button>\n      <button type=\"button\" class=\"studio-picker-new\" data-picker-home hidden>Open a copy\u2026</button>\n    </header>\n    <label class=\"studio-picker-search\">\n      <svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><circle cx=\"10.5\" cy=\"10.5\" r=\"5.5\"/><path d=\"m15 15 4 4\"/></svg>\n      <input type=\"search\" data-picker-search placeholder=\"Find drafts or folders\u2026\" aria-label=\"Find drafts or folders\" autocomplete=\"off\">\n    </label>\n    <div class=\"studio-picker-results\" data-picker-results></div>\n  </section>";
const instances = new WeakMap()
const art = {
  folder:'<path d="M3 7h7l2 2h9v10H3z"/>',
  draft:'<path d="M6 3h8l4 4v14H6zm8 0v5h4m-8 5h4m-4 3h4"/>',
  reading:'<path d="M12 6v15M3 5c4-1 7-1 9 1 2-2 5-2 9-1v14c-4-1-7-1-9 2-2-3-5-3-9-2z"/>',
  arrow:'<path d="m9 6 6 6-6 6"/>',
}
function pickerMatches(query, ...values) {
  const text = values.join(' ').toLocaleLowerCase()
  return query.split(/\s+/).every(term => text.includes(term))
}
function folderTrail(id, byId) {
  const path = [], seen = new Set()
  for (let folder = byId.get(id); folder && !seen.has(folder.id); folder = byId.get(folder.parent_id)) {
    seen.add(folder.id)
    path.unshift(folder)
  }
  return path
}
export default function({parentElement, data, setTriggerValue, onPickerOpen, onPickerAction, setPickerController}) {
  const root = parentElement.querySelector('[data-studio-picker]')
  if (!root) return
  const doc = root.ownerDocument, view = doc.defaultView
  const switcher = root.querySelector('[data-mode-switch]')
  const trigger = root.querySelector('[data-picker-trigger]')
  const readerTrigger = root.querySelector('[data-reader-trigger]')
  const hint = root.querySelector('[data-mode-hint]')
  const panel = root.querySelector('[data-picker-panel]')
  const search = root.querySelector('[data-picker-search]')
  const results = root.querySelector('[data-picker-results]')
  const newDraft = root.querySelector('[data-picker-new]')
  const openCopy = root.querySelector('[data-picker-home]')
  const kicker = root.querySelector('[data-picker-kicker]')
  const title = root.querySelector('[data-picker-title]')
  const native = typeof panel.showPopover === 'function'
  if (native && !panel.hasAttribute('popover')) panel.setAttribute('popover', 'manual')
  const nativeHint = typeof hint?.showPopover === 'function'
  if (nativeHint) hint.setAttribute('popover', 'manual')
  let hintTimer
  const hideHint = () => {
    clearTimeout(hintTimer)
    if (!hint || hint.hidden) return
    if (nativeHint && hint.matches(':popover-open')) hint.hidePopover()
    hint.hidden = true
  }
  const showHint = button => {
    hideHint()
    if (!hint || !panel.hidden) return
    hintTimer = setTimeout(() => {
      if (!root.isConnected || !panel.hidden) return
      hint.textContent = button.getAttribute('aria-description')
      hint.hidden = false
      if (nativeHint) hint.showPopover()
      const anchor = button.getBoundingClientRect()
      const width = hint.getBoundingClientRect().width
      const center = (anchor.left + anchor.right - width) / 2
      hint.style.left = `${Math.max(8, Math.min(center, view.innerWidth - width - 8))}px`
      hint.style.top = `${anchor.bottom + 8}px`
    }, 500)
  }
  const state = instances.get(root) || {folder:null, menu:'studio', anchor:trigger}
  instances.set(root, state)
  trigger.toggleAttribute('data-active', Boolean(data.active))
  readerTrigger?.toggleAttribute('data-active', Boolean(data.reader_active))
  if (switcher) {
    const mode = data.active ? 'studio' : data.reader_active ? 'reader' : ''
    if (mode) switcher.dataset.mode = mode
    else switcher.removeAttribute('data-mode')
    trigger.setAttribute('aria-description', data.reader_draft ? 'Edit this draft in Studio' : 'Recent Studio drafts')
    readerTrigger.setAttribute('aria-description', data.can_review ? 'Review this draft in Reader' : 'Recent Reader copies')
    for (const [button, selected, navigates] of [[trigger, data.active, data.reader_draft], [readerTrigger, data.reader_active, data.can_review]]) {
      if (selected) button.setAttribute('aria-current', onPickerAction ? 'page' : 'true')
      else button.removeAttribute('aria-current')
      if (navigates) button.removeAttribute('aria-haspopup')
      else button.setAttribute('aria-haspopup', 'dialog')
      button.onpointerenter = event => {if (event.pointerType === 'mouse') showHint(button)}
      button.onfocus = () => {if (button.matches(':focus-visible')) showHint(button)}
      button.onpointerleave = button.onblur = button.onpointerdown = hideHint
    }
  }
  const folders = data.folders || [], drafts = data.drafts || []
  const readings = data.readings || []
  const byId = new Map(folders.map(folder => [folder.id, folder]))
  const byDraft = new Map(drafts.map(draft => [draft.id, draft]))
  if (!byId.has(state.folder)) state.folder = null
  const alphabetical = (left, right) => left.localeCompare(right, undefined, {numeric:true, sensitivity:'base'})
  const location = id => ['Drafts', ...folderTrail(id, byId).map(folder => folder.name)].join(' / ')
  const make = (tag, text, className) => {
    const node = doc.createElement(tag)
    if (text !== undefined) node.textContent = text
    if (className) node.className = className
    return node
  }
  const icon = kind => {
    const span = make('i')
    span.setAttribute('aria-hidden', 'true')
    span.innerHTML = '<svg viewBox="0 0 24 24">'+art[kind]+'</svg>'
    return span
  }
  const row = (kind, identity, title, subtitle) => {
    const button = make('button', undefined, 'studio-picker-row')
    button.type = 'button'
    button.dataset.pickerAction = kind
    button.dataset.pickerIdentity = identity
    const copy = make('span')
    copy.append(make('strong', title))
    if (subtitle) copy.append(make('small', subtitle))
    button.append(icon(kind), copy)
    if (kind === 'folder') button.append(icon('arrow'))
    return button
  }
  const selectFolder = id => {
    state.folder = byId.has(id) ? id : null
    search.value = ''
    paint()
    results.scrollTop = 0
    search.focus({preventScroll:true})
  }
  function paint() {
    const query = search.value.trim().toLocaleLowerCase()
    const items = []
    const heading = title => items.push(make('h3', title))
    if (data.status) {
      const status = make('p', data.status, 'studio-picker-empty')
      status.setAttribute('role', 'status')
      results.replaceChildren(status)
      return
    }
    const showFolder = folder => items.push(row('folder', folder.id, folder.name, query && location(folder.parent_id)))
    const showDraft = draft => items.push(row('draft', draft.id, draft.title, query && location(draft.folder_id)))
    const showReading = copy => items.push(row('reading', copy.id, copy.title, copy.location))
    const readingMatches = readings.filter(copy => pickerMatches(query, copy.title, copy.location))
    const recentReadings = readingMatches.filter(copy => copy.recent !== false)
    const readingShelf = () => {
      const head = make('div', undefined, 'studio-picker-reading-head')
      const more = make('button', 'Browse readings', 'studio-picker-link')
      more.type = 'button'
      more.dataset.pickerAction = 'reader-menu'
      head.append(make('h3', 'Recent readings'), more)
      items.push(head)
    }
    if (state.menu === 'reader') {
      const available = readingMatches.filter(copy => copy.recent === false)
      if (recentReadings.length || !available.length) {
        heading(query ? 'Search results' : 'Recent readings')
        recentReadings.forEach(showReading)
      }
      if (available.length) {
        heading(query ? 'Matching drafts' : 'Saved drafts')
        available.forEach(showReading)
      }
      if (!readingMatches.length) items.push(make('p', query ? 'No recent readings match.' : 'Reading copies you open will appear here.', 'studio-picker-empty'))
    } else if (query) {
      const matches = [
        ...folders.filter(folder => pickerMatches(query, folder.name, location(folder.parent_id))),
        ...drafts.filter(draft => pickerMatches(query, draft.title, location(draft.folder_id))),
      ]
      heading('Search results')
      matches.slice(0, 60).forEach(entry => entry.name !== undefined ? showFolder(entry) : showDraft(entry))
      if (recentReadings.length) {heading('Reading copies'); recentReadings.forEach(showReading)}
      if (!matches.length && !recentReadings.length) items.push(make('p', 'No drafts, folders or readings match.', 'studio-picker-empty'))
      if (matches.length > 60) items.push(make('p', 'Refine your search to see more matches.', 'studio-picker-empty'))
    } else {
      if (state.folder) {
        const crumbs = make('nav', undefined, 'studio-picker-crumbs')
        crumbs.setAttribute('aria-label', 'Current folder')
        const path = [{id:'', name:'Drafts'}, ...folderTrail(state.folder, byId)]
        path.forEach((part, index) => {
          if (index) crumbs.append(make('span', '/'))
          if (index === path.length - 1) crumbs.append(make('span', part.name))
          else {
            const button = make('button', part.name)
            button.type = 'button'; button.dataset.pickerAction = 'folder'; button.dataset.pickerIdentity = part.id
            crumbs.append(button)
          }
        })
        items.push(crumbs)
      } else {
        if (data.recent?.length) {
          heading('Recent drafts')
          data.recent.slice(0, data.show_readings ? 3 : 5).forEach(draft => items.push(row('draft', draft.id, draft.title, draft.location)))
        }
        if (data.show_readings) {
          readingShelf()
          recentReadings.slice(0, 2).forEach(showReading)
          if (!recentReadings.length) items.push(make('p', 'Opened reading copies will appear here.', 'studio-picker-empty'))
        }
      }
      const children = folders.filter(folder => (folder.parent_id || null) === state.folder)
        .sort((a,b) => alphabetical(a.name, b.name))
      const visibleDrafts = drafts.filter(draft => (draft.folder_id || null) === state.folder)
        .sort((a,b) => alphabetical(a.title, b.title))
      if (children.length) {heading('Folders'); children.forEach(showFolder)}
      if (visibleDrafts.length) {heading(state.folder ? 'Drafts in this folder' : 'All drafts here'); visibleDrafts.forEach(showDraft)}
      if (!children.length && !visibleDrafts.length && (state.folder || !data.recent?.length)) {
        items.push(make('p', state.folder ? 'This folder is empty.' : 'Create a draft to start writing.', 'studio-picker-empty'))
      }
    }
    results.replaceChildren(...items)
  }
  function close(refocus = false) {
    hideHint()
    if (panel.hidden) return
    if (native && panel.matches(':popover-open')) panel.hidePopover()
    panel.hidden = true
    if (onPickerAction) panel.removeAttribute('role')
    state.anchor.setAttribute('aria-expanded','false')
    if (refocus) state.anchor.focus({preventScroll:true})
  }
  function position() {
    const rect = (switcher || trigger).getBoundingClientRect()
    const width = panel.getBoundingClientRect().width
    panel.style.left = `${Math.max(8, Math.min(rect.right - width, view.innerWidth - width - 8))}px`
    panel.style.top = `${rect.bottom + 5}px`
    panel.style.setProperty('--picker-top', panel.style.top)
  }
  function open(menu = 'studio', anchor = trigger) {
    hideHint()
    state.anchor.setAttribute('aria-expanded', 'false')
    state.menu = menu
    panel.dataset.pickerMode = menu
    state.anchor = anchor
    state.folder = null
    search.value = ''
    search.placeholder = menu === 'reader' ? 'Find recent readings…' : 'Find drafts, folders or readings…'
    search.setAttribute('aria-label', search.placeholder.replace('…', ''))
    if (kicker) kicker.textContent = menu === 'reader' ? 'CARE READER' : 'CARE STUDIO'
    if (title) title.textContent = menu === 'reader' ? 'Continue reading' : 'Open a draft'
    if (openCopy) openCopy.hidden = menu !== 'reader' || data.actions_unavailable === true
    newDraft.hidden = menu === 'reader' || data.actions_unavailable === true
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-label', menu === 'reader' ? 'CARE Reader readings' : 'CARE Studio drafts')
    paint()
    panel.hidden = false
    if (native && !panel.matches(':popover-open')) panel.showPopover()
    position()
    anchor.setAttribute('aria-expanded','true')
    search.focus({preventScroll:true})
    onPickerOpen?.()
  }
  function navigate(action) {
    if (onPickerAction) return onPickerAction(action)
    const resume = () => setTriggerValue('action',{...action, nonce:Date.now()+'-'+Math.random()})
    const request = new view.CustomEvent('care-workspace-before-navigation', {cancelable:true, detail:{resume, modeSwitch:action.type}})
    if (view.dispatchEvent(request)) resume()
  }
  function emit(type, identity) {
    if (type === 'open' && !byDraft.has(identity)) return
    close(true)
    const detail = type === 'open' ? {target_id:identity} : {folder_id:state.folder}
    if (onPickerAction) return onPickerAction({type, ...detail})
    if (data.active) {
      view.dispatchEvent(new view.CustomEvent('care-writing-file-command', {
        detail:{command:type === 'open' ? 'open-recent' : 'new', ...detail},
      }))
    } else {
      navigate({type, ...detail})
    }
  }
  function read(choice, identity = null) {
    close(true)
    if (onPickerAction) return onPickerAction({type:`reader-${choice}`, target_id:identity})
    if (data.active) {
      const request = new view.CustomEvent('care-writing-file-command', {
        cancelable:true, detail:{command:'open-care-reader', reader_choice:choice, reader_target:identity},
      })
      if (!view.dispatchEvent(request)) return
    }
    if (choice !== 'current') navigate({type:`reader-${choice}`, target_id:identity})
  }
  const outside = event => {if (!event.composedPath().includes(root)) close()}
  const toggle = (menu, button) => !panel.hidden && state.menu === menu ? close(true) : open(menu, button)
  const keepLink = event => onPickerAction && event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
  trigger.onclick = event => {
    if (keepLink(event)) return
    event?.preventDefault()
    if (!data.reader_draft) return toggle('studio', trigger)
    close(false)
    navigate({type:'edit-reading'})
  }
  trigger.onkeydown = event => {
    if (event.key === 'Escape') hideHint()
    if (event.key === 'ArrowDown') {event.preventDefault(); open('studio', trigger)}
  }
  if (readerTrigger) {
    readerTrigger.onclick = event => {
      if (keepLink(event)) return
      event?.preventDefault()
      return data.can_review ? read('current') : toggle('reader', readerTrigger)
    }
    readerTrigger.onkeydown = event => {
      if (event.key === 'Escape') hideHint()
      if (event.key === 'ArrowDown') {event.preventDefault(); open('reader', readerTrigger)}
    }
  }
  if (openCopy) openCopy.onclick = () => read('home')
  newDraft.onclick = () => emit('new')
  search.oninput = () => {paint(); results.scrollTop = 0}
  results.onclick = event => {
    const button = event.target.closest('button[data-picker-action]')
    if (!button) return
    const {pickerAction, pickerIdentity} = button.dataset
    if (pickerAction === 'folder') selectFolder(pickerIdentity)
    else if (pickerAction === 'reader-menu') open('reader', readerTrigger)
    else if (pickerAction === 'reading') read('open', pickerIdentity)
    else emit('open', pickerIdentity)
  }
  panel.onkeydown = event => {
    if (event.key === 'Escape') {event.preventDefault();event.stopPropagation();close(true);return}
    const rows = [...results.querySelectorAll('.studio-picker-row')]
    const current = rows.indexOf(event.target)
    if ((current !== -1 || event.target === search) && ['ArrowDown','ArrowUp'].includes(event.key) && rows.length) {
      event.preventDefault()
      const next = event.key === 'ArrowDown' ? Math.min(rows.length - 1, current + 1) : current - 1
      if (next < 0) search.focus({preventScroll:true})
      else rows[next].focus()
    } else if (event.target === search && search.value.trim() && event.key === 'Enter' && rows.length) {
      event.preventDefault(); rows[0].click()
    }
  }
  panel.ontoggle = event => {if (event.newState === 'closed' && !panel.matches(':popover-open')) close()}
  view.addEventListener('pointerdown', outside, true)
  const resize = () => {hideHint(); if (!panel.hidden) position()}
  view.addEventListener('resize', resize)
  setPickerController?.({open: menu => open(menu, menu === 'reader' ? readerTrigger : trigger), close})
  if (!panel.hidden) {
    const focused = results.contains(doc.activeElement) ? doc.activeElement.dataset : null
    paint()
    position()
    if (focused?.pickerAction) {
      const next = [...results.querySelectorAll('[data-picker-action]')].find(item =>
        item.dataset.pickerAction === focused.pickerAction && item.dataset.pickerIdentity === focused.pickerIdentity)
      const target = next || search
      target.focus({preventScroll:true})
    }
  }
  return () => {
    hideHint()
    view.removeEventListener('pointerdown', outside, true)
    view.removeEventListener('resize', resize)
  }
}
