import {accountStorageKey, loginURL} from './auth.mjs';

const STORAGE = 'study-sets-v1';
const NAME_LIMIT = 120;
const STORAGE_ERROR = 'Study sets could not be saved. Check that this browser allows site storage and try again.';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = value => typeof value === 'string' ? value.trim() : '';
const setName = value => text(value).replace(/\s+/g, ' ');
const searchText = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
const titleOrder = new Intl.Collator(undefined, {numeric:true, sensitivity:'base'});
const bookIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v13m0-13C9 5 6 5 3 6v13c3-1 6-1 9 1 3-2 6-2 9-1V6c-3-1-6-1-9 1z"/></svg>';
const setIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v11H3zM5 7V4h8l2 2h4v3"/></svg>';

function storageKey(accountKey) {
  return text(accountKey) ? accountStorageKey(STORAGE, accountKey) : null;
}

export function normalizeStudySets(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.flatMap(entry => {
    const id = text(entry?.id), title = setName(entry?.title).slice(0, NAME_LIMIT);
    if (!id || !title || seen.has(id)) return [];
    seen.add(id);
    const bookIds = Array.isArray(entry.bookIds) ? [...new Set(entry.bookIds.map(text).filter(Boolean))] : [];
    return [{id, title, bookIds}];
  });
}

export function loadStudySets(storage, accountKey) {
  const key = storageKey(accountKey);
  if (!key) return [];
  const raw = storage.getItem(key);
  if (!raw) return [];
  try { return normalizeStudySets(JSON.parse(raw)); } catch { return []; }
}

export function saveStudySets(storage, accountKey, sets) {
  const key = storageKey(accountKey);
  if (!key) return false;
  storage.setItem(key, JSON.stringify(normalizeStudySets(sets)));
  return true;
}

export function changeStudySets(sets, {type, id, title, bookIds = []}, publishedBooks) {
  const current = sets.find(set => set.id === id);
  if (type === 'create' || type === 'rename') {
    title = setName(title);
    if (!title || title.length > NAME_LIMIT) throw Error('Enter a study set name of up to 120 characters.');
    if (sets.some(set => set.id !== id && set.title.toLowerCase() === title.toLowerCase())) throw Error('A study set already has this name.');
  }
  if (type === 'create') {
    if (!text(id) || current) throw Error('The study set could not be created. Please try again.');
    if (!Array.isArray(bookIds) || bookIds.some(bookId => !publishedBooks.has(bookId))) {
      throw Error('Choose books that are available in the Library.');
    }
    return [...sets, {id, title, bookIds:[...new Set(bookIds)]}];
  }
  if (!current) throw Error('This study set is no longer available.');
  if (type === 'delete') return sets.filter(set => set.id !== id);
  let next;
  if (type === 'rename') next = {...current, title};
  if (type === 'add') {
    if (!Array.isArray(bookIds) || !bookIds.length || bookIds.some(bookId => !publishedBooks.has(bookId))) {
      throw Error('Choose books that are available in the Library.');
    }
    next = {...current, bookIds:[...new Set([...current.bookIds, ...bookIds])]};
  }
  if (type === 'remove') next = {...current, bookIds:current.bookIds.filter(bookId => !bookIds.includes(bookId))};
  return next ? sets.map(set => set.id === id ? next : set) : sets;
}

export function studySetBookChoices(books, memberIds, query = '') {
  const members = new Set(memberIds);
  const terms = searchText(query).trim().split(/\s+/).filter(Boolean);
  return [...books.values()].filter(book => {
    const haystack = searchText(`${book.title ?? ''} ${book.author ?? ''}`);
    return !members.has(book.id) && terms.every(term => haystack.includes(term));
  }).sort((a, b) => titleOrder.compare(a.title, b.title));
}

export function mountStudySets(host, {onOpenBook} = {}) {
  const doc = host.ownerDocument, view = doc.defaultView;
  const chooser = doc.createElement('dialog');
  const content = doc.createElement('div');
  const status = doc.createElement('div');
  host.classList.add('study-sets');
  chooser.className = 'study-sets-dialog';
  chooser.setAttribute('aria-labelledby', 'study-sets-dialog-title');
  status.className = 'study-sets-status';
  status.setAttribute('role', 'status');
  host.replaceChildren(content, status, chooser);

  let accountKey = null, catalog = new Map(), previousBooks, sets = [], selectedId = '', modal, storageError = false, statusTimer;

  function tell(message = '') {
    view.clearTimeout(statusTimer);
    status.textContent = message;
    if (message) statusTimer = view.setTimeout(() => { status.textContent = ''; }, 5000);
  }
  function title(id) { return sets.find(set => set.id === id)?.title || ''; }
  function newId() { return view.crypto?.randomUUID?.() ?? `set-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function focusAction(action, id) {
    [...content.querySelectorAll(`[data-set-action="${action}"]`)].find(el => id === undefined || el.dataset.id === id)?.focus();
  }
  function refresh() {
    try { sets = loadStudySets(accountKey && view.localStorage, accountKey); storageError = false; }
    catch { sets = []; storageError = true; }
    if (!title(selectedId)) selectedId = sets[0]?.id || '';
  }
  function change(command, message) {
    let current, next, storage;
    try { storage = view.localStorage; current = loadStudySets(storage, accountKey); }
    catch { showError(STORAGE_ERROR); return false; }
    try { next = changeStudySets(current, command, catalog); }
    catch (error) { showError(error.message); return false; }
    try { if (!saveStudySets(storage, accountKey, next)) return false; }
    catch { showError(STORAGE_ERROR); return false; }
    sets = next;
    storageError = false;
    if (command.type === 'create') selectedId = command.id;
    if (!title(selectedId)) selectedId = sets[0]?.id || '';
    paint();
    tell(message);
    return true;
  }
  function showError(message) {
    const error = chooser.open && chooser.querySelector('[data-study-error]');
    if (error) error.textContent = message;
    else tell(message);
  }
  function bookCard(id) {
    const book = catalog.get(id);
    const cover = `<span class="study-sets-cover"><span aria-hidden="true">${bookIcon}</span>${book?.cover_url ? `<img src="${esc(book.cover_url)}" alt="" loading="lazy" decoding="async">` : ''}</span>`;
    const info = `<span class="study-sets-book-title">${esc(book?.title || 'Unavailable book')}</span><span class="study-sets-book-meta">${esc(book ? [book.author, book.year].filter(Boolean).join(' · ') : 'Currently unavailable in the Library')}</span>`;
    return `<li class="study-sets-card">${book ? `<button class="study-sets-open-book" type="button" data-set-action="open-book" data-id="${esc(id)}">${cover}${info}</button>` : `<div class="study-sets-open-book">${cover}${info}</div>`}<button class="study-sets-remove-book" type="button" data-set-action="remove-book" data-id="${esc(id)}" aria-label="Remove ${esc(book?.title || 'unavailable book')} from this set">Remove</button></li>`;
  }
  function paint() {
    const active = sets.find(set => set.id === selectedId);
    const header = `<div class="study-sets-header"><div><p class="study-sets-kicker">CARE Library</p><h1 id="study-sets-heading">Study sets</h1><p>Organize books from the Library into personal collections.</p></div>${accountKey ? `<button type="button" data-set-action="new" class="study-sets-primary"${storageError ? ' disabled' : ''}>New study set</button>` : ''}</div>`;
    const note = accountKey ? '<p class="study-sets-note">Saved for your account in this browser. Study sets don’t sync to other devices.</p>' : '';
    let body;
    if (!accountKey) body = `<div class="study-sets-empty">${setIcon}<h2>Your own reading shelf</h2><p>Sign in to create and reopen your personal study sets on this device.</p><a class="study-sets-primary" href="${esc(loginURL('/library.html#view=study-sets'))}">Sign in</a></div>`;
    else if (storageError) body = `<div class="study-sets-empty">${setIcon}<h2>Browser storage is unavailable</h2><p>Allow site storage to use study sets in this browser.</p><button type="button" data-set-action="retry">Try again</button></div>`;
    else if (!active) body = `<div class="study-sets-empty">${setIcon}<h2>Your own reading shelf</h2><p>Create a set for a reading group, project, or line of inquiry. Add any available book from the Library.</p><button type="button" data-set-action="new" class="study-sets-primary">Create a study set</button></div>`;
    else body = `<div class="study-sets-layout"><aside class="study-sets-list" aria-label="Your study sets"><p class="study-sets-kicker">Your sets</p><ul>${[...sets].sort((a,b) => titleOrder.compare(a.title, b.title)).map(set => `<li><button type="button" data-set-action="select" data-id="${esc(set.id)}" aria-pressed="${set.id === active.id}">${setIcon}<span>${esc(set.title)}</span><small>${set.bookIds.length}</small></button></li>`).join('')}</ul></aside><section class="study-sets-shelf" aria-labelledby="study-sets-shelf-title"><div class="study-sets-shelf-header"><div><h2 id="study-sets-shelf-title">${esc(active.title)}</h2><p>${active.bookIds.length} ${active.bookIds.length === 1 ? 'book' : 'books'}</p></div><div class="study-sets-actions"><button type="button" data-set-action="rename">Rename</button><button type="button" data-set-action="delete">Delete set</button><button type="button" class="study-sets-primary" data-set-action="add">Add books</button></div></div>${active.bookIds.length ? `<ul class="study-sets-grid">${active.bookIds.map(bookCard).join('')}</ul>` : `<div class="study-sets-empty study-sets-empty-shelf">${bookIcon}<h3>No books in this set yet</h3><p>Choose titles from the Library to get started.</p></div>`}</section></div>`;
    content.innerHTML = `<div class="study-sets-inner">${header}${note}${body}</div>`;
    host.setAttribute('aria-labelledby', 'study-sets-heading');
  }
  function updatePicker() {
    if (modal?.kind !== 'add') return;
    const set = sets.find(set => set.id === modal.id);
    if (!set) { chooser.close(); return; }
    const query = chooser.querySelector('[data-study-query]').value;
    const choices = studySetBookChoices(catalog, set.bookIds, query);
    const list = chooser.querySelector('[data-study-choices]');
    const added = new Set(set.bookIds);
    modal.chosen = new Set([...modal.chosen].filter(id => catalog.has(id) && !added.has(id)));
    const empty = !catalog.size ? 'There are no published books available right now.' : query.trim() ? 'No available books match your search.' : 'All available books are already in this set.';
    list.innerHTML = choices.length ? choices.map(book => `<label class="study-sets-choice"><input type="checkbox" value="${esc(book.id)}"${modal.chosen.has(book.id) ? ' checked' : ''}><span><strong>${esc(book.title)}</strong>${book.author ? `<small>${esc(book.author)}</small>` : ''}</span></label>`).join('') : `<p class="study-sets-no-choices" role="status">${empty}</p>`;
    syncPickerButton();
  }
  function syncPickerButton() {
    const button = chooser.querySelector('[data-study-submit]');
    const count = modal.chosen.size;
    button.disabled = !count;
    button.textContent = count ? `Add ${count} ${count === 1 ? 'book' : 'books'}` : 'Add books';
  }
  function showModal(kind) {
    if (!accountKey || storageError || chooser.open) return;
    const id = selectedId, setTitle = title(id), name = kind === 'new' ? 'New study set' : kind === 'rename' ? 'Rename study set' : kind === 'delete' ? 'Delete study set?' : 'Add books';
    modal = {kind, id, chosen:new Set(), returnAction:kind};
    const body = kind === 'add' ? `<label class="study-sets-input-label" for="study-sets-query">Find a book</label><input id="study-sets-query" type="search" placeholder="Search by title or author…" data-study-query autofocus><div class="study-sets-choices" data-study-choices></div>` : kind === 'delete' ? `<p>Delete “${esc(setTitle)}” from your study sets? The books will still be available in the Library.</p>` : `<label class="study-sets-input-label" for="study-sets-name">Set name</label><input id="study-sets-name" name="title" value="${kind === 'rename' ? esc(setTitle) : ''}" maxlength="${NAME_LIMIT}" required autofocus>`;
    chooser.innerHTML = `<form class="study-sets-dialog-form"><h2 id="study-sets-dialog-title">${name}</h2>${body}<p data-study-error class="study-sets-error" role="alert"></p><div class="study-sets-actions"><button type="button" data-study-cancel${kind === 'delete' ? ' autofocus' : ''}>Cancel</button><button type="submit" data-study-submit class="${kind === 'delete' ? 'study-sets-danger' : 'study-sets-primary'}">${kind === 'new' ? 'Create set' : kind === 'rename' ? 'Save name' : kind === 'delete' ? 'Delete set' : 'Add books'}</button></div></form>`;
    if (kind === 'add') updatePicker();
    chooser.showModal();
  }
  function showShelfBookPicker(bookId) {
    const book = catalog.get(bookId);
    if (!accountKey || storageError || chooser.open || !book) return;
    const ordered = [...sets].sort((a, b) => titleOrder.compare(a.title, b.title));
    modal = {kind:'shelf-book', bookId, returnAction:'select'};
    chooser.innerHTML = `<form class="study-sets-dialog-form"><h2 id="study-sets-dialog-title">Add to study set</h2><p>${esc(book.title)}</p><label class="study-sets-input-label" for="study-sets-destination">Study set</label><select id="study-sets-destination" name="destination" data-study-destination autofocus>${ordered.map(set => `<option value="${esc(set.id)}"${set.id === selectedId ? ' selected' : ''}>${esc(set.title)}</option>`).join('')}<option value="">New study set…</option></select><label class="study-sets-input-label" for="study-sets-name" data-study-name-label>Set name</label><input id="study-sets-name" name="title" maxlength="${NAME_LIMIT}"><p data-study-error class="study-sets-error" role="alert"></p><div class="study-sets-actions"><button type="button" data-study-cancel>Cancel</button><button type="submit" class="study-sets-primary">Add book</button></div></form>`;
    syncShelfBookPicker();
    chooser.showModal();
  }
  function syncShelfBookPicker() {
    const creating = !chooser.querySelector('[data-study-destination]').value;
    const name = chooser.querySelector('#study-sets-name');
    name.hidden = !creating;
    name.disabled = !creating;
    name.required = creating;
    chooser.querySelector('[data-study-name-label]').hidden = !creating;
  }
  function onClick(event) {
    const button = event.target.closest('[data-set-action]');
    if (!button || !host.contains(button)) return;
    const {setAction, id} = button.dataset;
    tell();
    if (setAction === 'retry') { refresh(); paint(); focusAction(storageError ? 'retry' : 'new'); }
    else if (!accountKey) return;
    else if (setAction === 'select' && title(id)) { selectedId = id; paint(); focusAction('select', id); }
    else if (setAction === 'open-book' && catalog.has(id)) onOpenBook?.(id);
    else if (setAction === 'remove-book') {
      if (change({type:'remove', id:selectedId, bookIds:[id]}, 'Book removed from this study set.')) focusAction('add');
    } else if (['new', 'rename', 'delete', 'add'].includes(setAction)) showModal(setAction);
  }
  function onInput(event) {
    if (event.target.matches('[data-study-query]')) updatePicker();
    if (event.target.id === 'study-sets-name') event.target.setCustomValidity('');
  }
  function onChange(event) {
    const input = event.target;
    if (modal?.kind === 'shelf-book' && input.matches('[data-study-destination]')) {
      syncShelfBookPicker();
      return;
    }
    if (modal?.kind !== 'add' || !input.matches('input[type="checkbox"]')) return;
    if (input.checked) modal.chosen.add(input.value);
    else modal.chosen.delete(input.value);
    syncPickerButton();
  }
  function onSubmit(event) {
    event.preventDefault();
    if (!accountKey || !modal) return;
    const {kind, id, chosen} = modal;
    const name = event.target.elements.namedItem('title');
    if (name && !name.disabled && !text(name.value)) {
      name.setCustomValidity('Enter a study set name.');
      name.reportValidity();
      return;
    }
    if (kind === 'shelf-book') {
      const destination = event.target.elements.namedItem('destination').value;
      const command = destination
        ? {type:'add', id:destination, bookIds:[modal.bookId]}
        : {type:'create', id:newId(), title:name.value, bookIds:[modal.bookId]};
      if (change(command, 'Book added to your study set.')) {
        selectedId = command.id;
        paint();
        chooser.close();
      }
      return;
    }
    const commands = {
      new:[{type:'create', id:kind === 'new' ? newId() : '', title:name?.value}, 'Study set created.'],
      rename:[{type:'rename', id, title:name?.value}, 'Study set renamed.'],
      delete:[{type:'delete', id}, 'Study set deleted.'],
      add:[{type:'add', id, bookIds:[...chosen]}, 'Books added to this study set.'],
    };
    if (!change(...commands[kind])) return;
    modal.returnAction = kind === 'delete' ? 'new' : kind === 'new' ? 'select' : kind;
    chooser.close();
  }
  function onClose() {
    if (!modal) return;
    const {returnAction} = modal;
    modal = null;
    focusAction(returnAction, returnAction === 'select' ? selectedId : undefined);
  }
  function onStorage(event) {
    if (!accountKey || (event.key !== null && event.key !== storageKey(accountKey))) return;
    refresh(); paint();
    if (modal?.id && !title(modal.id)) chooser.close();
    else if (modal?.kind === 'add') updatePicker();
  }
  function onCoverError(event) {
    if (event.target.matches?.('.study-sets-cover img')) event.target.remove();
  }
  const onCancelClick = event => { if (event.target.closest('[data-study-cancel]')) chooser.close(); };
  host.addEventListener('click', onClick);
  host.addEventListener('error', onCoverError, true);
  chooser.addEventListener('click', onCancelClick);
  chooser.addEventListener('input', onInput);
  chooser.addEventListener('change', onChange);
  chooser.addEventListener('submit', onSubmit);
  chooser.addEventListener('close', onClose);
  view.addEventListener('storage', onStorage);

  return {
    openFromShelf({create = false, work_id} = {}) {
      if (work_id) showShelfBookPicker(work_id);
      else if (create) showModal('new');
    },
    update({accountKey: nextAccount, books} = {}) {
      nextAccount = text(nextAccount).toLowerCase() || null;
      if (nextAccount === accountKey && books === previousBooks && content.hasChildNodes()) return;
      if (nextAccount !== accountKey) {
        accountKey = nextAccount;
        selectedId = '';
        modal = null;
        if (chooser.open) chooser.close();
        chooser.replaceChildren();
        tell();
        refresh();
      }
      if (books !== previousBooks) {
        previousBooks = books;
        catalog = new Map((books || []).filter(book => book?.id).map(book => [book.id, book]));
        if (modal?.kind === 'add') updatePicker();
      }
      paint();
    },
    destroy() {
      view.removeEventListener('storage', onStorage);
      host.removeEventListener('click', onClick);
      host.removeEventListener('error', onCoverError, true);
      view.clearTimeout(statusTimer);
      modal = null;
      if (chooser.open) chooser.close();
      host.replaceChildren();
    },
  };
}
