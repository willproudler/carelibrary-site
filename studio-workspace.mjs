import {mountNumogramDraftMargins,numogramDraftLines} from './native/numogram-draft-lines.mjs';
import {loginURL} from './auth.mjs';
import {searchPublished, searchReadingHref} from './native/beta-search.mjs';
import {openFeaturePreview} from './native/feature-previews.mjs';
import {createGuestStudioStorage} from './native/studio-guest-storage.mjs';
import {copyStudioFootnotes, footnoteSavePayload, linkStudioFootnote, nativeStudioFootnotes, studioFootnoteReference} from './native/studio-footnotes.mjs';

export {nativeStudioFootnotes};
import {studioBinderApi} from './native/beta-binder.mjs';
import {studioBinderDocuments} from './native/studio-first-drafts.mjs';

const DRAFT_API = '/api/studio/drafts';
export const MAX_DRAFT_TITLE = 160;
export const MAX_DRAFT_BYTES = 256 * 1024;
const AUTOSAVE_DELAY = 800;
const encoder = new TextEncoder();
const titleOf = (draft) => draft?.title?.trim() || 'Untitled';
const MAX_HTML_TITLE = 300;
const companionRouteKeys = new Set(['book', 'field', 'lateral', 'ref', 'focus', 'scope', 'work', 'unit', 'source']);

export async function copyStudioSource(view, packet, tryNative = true) {
  let token;
  try {
    token = view.crypto.randomUUID();
    view.sessionStorage.setItem('care-studio-source-clipboard-v1', JSON.stringify({token, packet}));
  } catch {
    return false;
  }
  const escaped = packet.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<span data-care-studio-source="${token}">${escaped}</span>`;
  try {
    await view.navigator.clipboard.write([new view.ClipboardItem({
      'text/plain': new view.Blob([packet.text], {type:'text/plain'}),
      'text/html': new view.Blob([html], {type:'text/html'}),
    })]);
    return true;
  } catch {
    if (!tryNative) return false;
  }
  let copied = false;
  const handleCopy = event => {
    if (!event.clipboardData) return;
    event.clipboardData.setData('text/plain', packet.text);
    event.clipboardData.setData('text/html', html);
    try { event.clipboardData.setData('application/x-care-studio-source', token); } catch {}
    event.preventDefault();
    copied = true;
  };
  view.addEventListener('copy', handleCopy, true);
  try { view.document.execCommand?.('copy'); } catch {}
  finally { view.removeEventListener('copy', handleCopy, true); }
  return copied;
}

export function copyStudioLibraryReference(view, reference, request) {
  if (!request || !['axiom','passage'].includes(reference?.kind) || !reference.id || !reference.work_id ||
      reference.resolved === false || reference.preserved || reference.is_translation ||
      typeof reference.text !== 'string' || !reference.text.trim()) return false;
  const {kind, id, work_id, text:source_text} = reference;
  return copyStudioSource(view, {kind, id, work_id, source_text, request, mode:'reference', text:id});
}

export function studioLibraryFragment(destination) {
  if (destination === '') return '';
  if (typeof destination !== 'string' || !destination.startsWith('#') || destination.length > 4096) return null;
  const route = new URLSearchParams(destination.slice(1));
  const identities = [...route.keys()].filter(key => ['book', 'field', 'lateral'].includes(key));
  if (identities.length !== 1 || !route.get(identities[0]) ||
      [...route.keys()].some(key => !companionRouteKeys.has(key) || route.getAll(key).length > 1)) return null;
  return '#' + route.toString();
}

export function studioFootnoteFragment(source) {
  if (!['axiom', 'passage'].includes(source?.kind) || typeof source.item_id !== 'string' || !source.item_id) return null;
  const fragment = studioLibraryFragment(source.href);
  if (!fragment) return null;
  const route = new URLSearchParams(fragment.slice(1));
  for (const key of ['ref', 'focus']) if (route.has(key) && route.get(key) !== source.item_id) return null;
  // Older portable footnotes sometimes retained only the book route. Add its
  // exact source address rather than opening the book at an unrelated place.
  if (!route.has('ref') && !route.has('focus')) route.set(route.has('book') ? 'focus' : 'ref', source.item_id);
  const root = ['book', 'field', 'lateral'].find(key => route.has(key));
  const ordered = new URLSearchParams([[root, route.get(root)]]);
  for (const [key, value] of route) if (key !== root) ordered.append(key, value);
  return searchReadingHref('#' + ordered.toString(), source.item_id);
}

export async function resolveStudioFootnoteReading(draft, referenceId, {search = searchPublished} = {}) {
  const source = draft.footnotes?.find(note => note.id === referenceId)?.source;
  if (!['axiom', 'passage'].includes(source?.kind) || typeof source.item_id !== 'string' || !source.item_id) {
    throw new Error('This footnote has no linked Library reading.');
  }
  const saved = studioFootnoteFragment(source);
  if (saved) return {...source, href: saved};
  // An explicit route may name a saved edition. Only ID-only citations may be
  // recovered through the canonical published index.
  if (typeof source.href === 'string' && source.href.trim()) {
    throw new Error('This footnote’s saved Library route is unavailable. Its saved citation is still in your draft.');
  }
  const {results} = await search({query: source.item_id, kind: source.kind, mode: 'classic', limit: 8});
  const found = results.find(row => row.item_id === source.item_id && row.kind === source.kind &&
    (!source.work_id || row.work_id === source.work_id));
  const fragment = found && studioFootnoteFragment(found);
  if (!fragment) throw new Error('This footnote’s reading is not available in the published Library. Its saved citation is still in your draft.');
  return {...found, href: fragment};
}

export function studioDraftApi(fetcher = globalThis.fetch) {
  async function request(account, method, id = '', payload) {
    const response = await fetcher(`${DRAFT_API}${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method, cache: 'no-store', credentials: 'same-origin',
      headers: {'X-Care-Account': account, ...(payload ? {'Content-Type': 'application/json'} : {})},
      ...(payload ? {body: JSON.stringify({...payload, account})} : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || 'draft_request_failed');
      error.code = result.error;
      error.status = response.status;
      throw error;
    }
    return result;
  }
  return {
    list: (account) => request(account, 'GET'),
    load: (account, id) => request(account, 'GET', id),
    create: (account, payload) => request(account, 'POST', '', payload),
    update: (account, id, payload) => request(account, 'PUT', id, payload),
    remove: (account, id, revision) => request(account, 'DELETE', id, {revision}),
  };
}

function errorCode(error) {
  if (['guest_storage_unavailable', 'guest_storage_full'].includes(error?.code)) return error.code;
  if (error?.status === 401) return 'sign_in';
  if (error?.status === 403) return 'account_changed';
  if (error?.status === 404) return 'missing';
  if (['source_not_published', 'source_quote_changed', 'source_unavailable'].includes(error?.code)) return error.code;
  if (error?.status === 400) return 'invalid';
  if (error?.status === 413) return 'too_large';
  if (error?.status === 409) return error.code === 'draft_limit' ? 'limit' : 'conflict';
  return 'unavailable';
}

const messages = {
  sign_in: 'Your session ended. Download your edits or sign back in to save.',
  account_changed: 'This browser switched accounts. Sign back in to the original account to save.',
  missing: 'This draft is no longer available in your account.',
  invalid: 'This draft contains unsupported characters. Remove them or download a copy.',
  too_large: 'This draft is too long to save. Shorten the title or text, or download a copy.',
  limit: 'Your account has reached its draft limit. Remove an unused draft or download a copy.',
  conflict: 'A newer revision was saved elsewhere. Save your edits as a separate draft or download them.',
  unavailable: 'Could not connect. Your edits are still in this tab.',
  guest_storage_unavailable: 'This browser could not save drafts. Check that site storage is enabled and try again.',
  guest_storage_full: 'This browser is out of storage for drafts. Download a copy of your work.',
  source_not_published: 'That reading is unavailable in the published Library. Search again to choose a reference.',
  source_quote_changed: 'That quotation differs from the published source. Copy the exact passage again.',
  source_unavailable: 'Library citations are temporarily unavailable. Try again shortly.',
};

function makeDraft(snapshot = {}) {
  return {id: '', title: '', body: '', revision: 0, updated_at: 0,
    dirty: false, saving: null, removing: false, error: '', editVersion: 0, timer: null, ...snapshot};
}

// Each draft collection has its own in-memory working copies. One save at a time
// advances a document revision; a late response can never overwrite edits made during a save.
export function createStudioDraftState({api, account, local = false, change = () => {},
  saved = () => {}, autoSave = true, schedule = globalThis.setTimeout, cancel = globalThis.clearTimeout}) {
  const working = new Map();
  const summaries = new Map();
  const pendingLoads = new Map();
  let listRequest = null;
  let scratch = makeDraft();

  function remember(snapshot) {
    const {id, title, revision, updated_at} = snapshot;
    if ((summaries.get(id)?.revision || 0) <= revision) summaries.set(id, {id, title, revision, updated_at});
  }

  function reconcile(drafts, previous = new Map(summaries)) {
    const ids = new Set(drafts.map(({id}) => id));
    for (const [id, summary] of previous) {
      if (!ids.has(id) && summaries.get(id) === summary) {
        summaries.delete(id);
        if (!working.get(id)?.dirty) working.delete(id);
      }
    }
    for (const draft of drafts) {
      if (!previous.has(draft.id) || summaries.has(draft.id)) remember(draft);
    }
    return entries();
  }

  function list() {
    if (listRequest) return listRequest;
    const previous = new Map(summaries);
    listRequest = (async () => reconcile((await api.list(account)).drafts, previous))()
      .finally(() => { listRequest = null; });
    return listRequest;
  }

  function entries() {
    return [...summaries.values()].sort((a, b) => b.updated_at - a.updated_at || a.title.localeCompare(b.title));
  }

  async function load(id, {fresh = false} = {}) {
    if (!id) return scratch;
    const cached = working.get(id);
    if (!fresh && cached && (cached.dirty || cached.revision >= (summaries.get(id)?.revision || 0))) return cached;
    if (!pendingLoads.has(id)) {
      pendingLoads.set(id, (async () => {
        const {draft: snapshot} = await api.load(account, id);
        remember(snapshot);
        const draft = makeDraft(snapshot);
        working.set(id, draft);
        return draft;
      })().finally(() => pendingLoads.delete(id)));
    }
    return pendingLoads.get(id);
  }

  function clearTimer(draft) {
    if (draft.timer !== null) cancel(draft.timer);
    draft.timer = null;
  }

  function queue(draft) {
    clearTimer(draft);
    if (!autoSave || draft.saving || draft.removing || draft.error) return;
    draft.timer = schedule(() => { draft.timer = null; save(draft); }, AUTOSAVE_DELAY);
  }

  function sizeError(draft) {
    const titleLimit = draft.format === 'html' ? MAX_HTML_TITLE : MAX_DRAFT_TITLE;
    const notesSize = draft.footnotes?.reduce((size, note) => size + encoder.encode(note.note || '').length, 0) || 0;
    return [...draft.title].length > titleLimit || draft.body.length > MAX_DRAFT_BYTES ||
      encoder.encode(draft.body).length + notesSize > MAX_DRAFT_BYTES;
  }

  function edit(draft, patch) {
    if (draft.removing) return;
    if (Object.entries(patch).every(([key, value]) => draft[key] === value ||
      (key === 'footnotes' && JSON.stringify(draft[key]) === JSON.stringify(value)))) return;
    Object.assign(draft, patch);
    draft.dirty = true;
    draft.editVersion += 1;
    if (draft.error === 'too_large' || draft.error === 'invalid') draft.error = '';
    if (!draft.error && sizeError(draft)) draft.error = 'too_large';
    queue(draft);
    change(draft);
  }

  function save(draft, {copy = false} = {}) {
    clearTimer(draft);
    if (draft.saving || draft.removing) return draft.saving || Promise.resolve(false);
    if (!draft.dirty && draft.id && !copy) return Promise.resolve(true);
    if (draft.error === 'conflict' && !copy) return Promise.resolve(false);
    if (sizeError(draft)) {
      // Keep the conflict until the author can fit their changes in a new draft.
      if (!copy) draft.error = 'too_large';
      change(draft, copy ? 'too_large' : '');
      return Promise.resolve(false);
    }
    const previousId = draft.id;
    const atVersion = draft.editVersion;
    const payload = {title: draft.title, body: draft.body};
    if (draft.format === 'html') {
      const footnotes = draft.footnotes || [];
      Object.assign(payload, {format: 'html', footnotes: local ? footnotes : footnoteSavePayload(footnotes)});
    }
    const titleLimit = draft.format === 'html' ? MAX_HTML_TITLE : MAX_DRAFT_TITLE;
    if (copy) payload.title = `${[...titleOf(draft)].slice(0, titleLimit - 7).join('')} (copy)`;
    draft.error = '';
    draft.saving = Promise.resolve().then(async () => {
      let succeeded = false;
      try {
        const {draft: snapshot} = copy || !previousId
          ? await api.create(account, payload)
          : await api.update(account, previousId, {...payload, revision: draft.revision});
        if (copy && previousId) working.delete(previousId);
        if (scratch === draft) scratch = makeDraft();
        Object.assign(draft, {id: snapshot.id, revision: snapshot.revision, updated_at: snapshot.updated_at});
        draft.dirty = atVersion !== draft.editVersion;
        if (!draft.dirty && Array.isArray(snapshot.footnotes)) draft.footnotes = snapshot.footnotes;
        if (!draft.dirty && copy) draft.title = snapshot.title;
        if (draft.dirty && sizeError(draft)) draft.error = 'too_large';
        remember(snapshot);
        working.set(draft.id, draft);
        succeeded = true;
        saved(draft, previousId);
      } catch (error) {
        draft.error = copy ? 'conflict' : errorCode(error);
        change(draft, copy ? errorCode(error) : '');
      } finally {
        draft.saving = null;
        if (succeeded && draft.dirty) queue(draft);
        change(draft);
      }
      return succeeded;
    });
    change(draft);
    return draft.saving;
  }

  async function newDraft(payload = {title: '', body: ''}) {
    const {draft: snapshot} = await api.create(account, payload);
    remember(snapshot);
    const draft = makeDraft(snapshot);
    working.set(draft.id, draft);
    return draft;
  }

  async function remove(draft, removeSavedDraft = api.remove) {
    if (!draft.id || draft.dirty || draft.saving || draft.removing) return false;
    draft.removing = true;
    change(draft);
    try {
      await removeSavedDraft(account, draft.id, draft.revision);
      working.delete(draft.id);
      summaries.delete(draft.id);
      return true;
    } finally {
      draft.removing = false;
      change(draft);
    }
  }

  function hasUnsentEdits() {
    return scratch.dirty || [...working.values()].some(({dirty}) => dirty);
  }

  function pause() {
    clearTimer(scratch);
    working.forEach(clearTimer);
  }

  return {list, entries, reconcile, load, edit, save, newDraft, remove, hasUnsentEdits, pause,
    get scratch() { return scratch; }};
}

const template = `
  <div data-studio-native></div>
  <input type="file" data-studio-import accept=".txt,.md,.markdown,.care-draft.json" hidden>
  <div class="studio-web__message" hidden>
    <p data-studio-message role="status"></p>
    <a data-studio-signin hidden>Sign in</a>
    <button type="button" data-studio-retry hidden>Retry</button>
    <button type="button" data-studio-start hidden>Open Studio</button>
    <button type="button" data-studio-close-beside hidden>Close Write beside</button>
  </div>
  <div class="studio-web__recovery" hidden role="alert">
    <span data-studio-error></span>
    <button type="button" data-studio-copy>Save as copy</button>
    <button type="button" data-studio-download>Download draft</button>
    <button type="button" data-studio-reload>Reload saved draft</button>
  </div>
  <dialog class="studio-web__dialog" aria-label="Studio drafts">
    <form method="dialog"><button class="studio-web__close" aria-label="Close">×</button></form>
    <h2 data-studio-dialog-title></h2>
    <p data-studio-dialog-message></p>
    <div data-studio-dialog-drafts></div>
  </dialog>`;

const plainMarkup = (body) => body ? body.split(/\r\n|\r|\n/).map(line =>
  '<p>' + (line ? line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<br>') + '</p>'
).join('') : '';

export function nativeStudioDocument(draft) {
  return {
    id: draft.id, revision: draft.revision, title: draft.title,
    html: draft.format === 'html' ? draft.body : plainMarkup(draft.body),
  };
}

export async function nativeStudioImport(file, {local = false} = {}) {
  const rich = file.name.toLowerCase().endsWith('.care-draft.json');
  if (!rich && !/\.(txt|md|markdown)$/i.test(file.name)) {
    throw new Error('Choose a Markdown, plain text or CARE draft file.');
  }
  if (file.size > (rich ? MAX_DRAFT_BYTES * 6 + 4096 : MAX_DRAFT_BYTES)) {
    throw new Error('Choose a smaller manuscript. Drafts support up to 256 KB of text and notes.');
  }
  let text;
  try {
    text = new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer());
  } catch {
    throw new Error('Choose a manuscript saved as UTF-8 text.');
  }
  if (!rich) return {
    title: [...file.name.replace(/\.[^.]+$/, '').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').trim()]
      .slice(0, MAX_DRAFT_TITLE).join(''),
    body: text.replace(/\r\n?/g, '\n'),
  };
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('Choose a draft backup downloaded from CARE Studio.');
  }
  if (backup?.format !== 'care.beta-draft/1' || typeof backup.title !== 'string' ||
      typeof backup.html !== 'string' || !Array.isArray(backup.footnotes) ||
      backup.footnotes.some(note => !note || typeof note !== 'object' || Array.isArray(note))) {
    throw new Error('Choose a draft backup downloaded from CARE Studio.');
  }
  return {title: backup.title, body: backup.html, format: 'html',
    footnotes: local ? backup.footnotes : footnoteSavePayload(backup.footnotes)};
}

function downloadFile(doc, name, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], {type}));
  const link = doc.createElement('a');
  link.href = url;
  link.download = name;
  doc.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function draftFilename(draft) {
  return titleOf(draft).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/, '').slice(0, 100) || 'Untitled';
}

function downloadDraft(doc, draft) {
  // Keep an editable backup of rich drafts, including private footnotes and formatting.
  const rich = draft.format === 'html';
  const contents = rich ? JSON.stringify({format: 'care.beta-draft/1', title: draft.title, html: draft.body, footnotes: draft.footnotes || []}, null, 2) : draft.body;
  downloadFile(doc, draftFilename(draft) + (rich ? '.care-draft.json' : '.txt'), contents, rich ? 'application/json' : 'text/plain;charset=utf-8');
}

function downloadReadingCopy(doc, fragment, name = 'CARE-Binder') {
  // The Binder endpoint generates this fragment from sanitized, owned drafts.
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>CARE Studio reading copy</title>
<style>body{max-width:46rem;margin:2rem auto;padding:0 1rem;font:1.1rem/1.6 Georgia,serif}</style>
</head><body>${fragment}</body></html>`;
  downloadFile(doc, name + '.html', html, 'text/html;charset=utf-8');
}

let editorAssets;
function loadStudioEditor() {
  if (editorAssets) return editorAssets;
  const asset = path => fetch(path, {credentials: 'same-origin'}).then(response => {
    if (!response.ok) throw new Error('Could not load Studio');
    return response.text();
  });
  editorAssets = Promise.all([
    import('./studio-editor-adapter.mjs'), asset('/native/writing-editor.html'), asset('/native/writing-editor.css'),
  ]).catch(error => {
    editorAssets = null;
    throw error;
  });
  return editorAssets;
}

const fullVersion = 'Available in the full version. This feature is unavailable in the online beta.';
const futureActions = {
  collaborate: 'Collaborate', 'remote-connect': 'Collaborate',
  'remote-share': 'Collaborate', 'remote-review-request': 'Request a review', 'peer-review-import': 'Import a review',
  'review-draft': 'AI draft review', 'open-archive': 'Draft archive',
  'review-poll': 'AI draft review',
};

export function createStudioWorkspace({
  host, account = null, guestDrafts = false, preview = false, navigate, onChange = () => {},
  onBesideChange = () => {}, onSearch = () => {},
  searchBooks = () => [], api = studioDraftApi(), binderApi = studioBinderApi(),
}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  host.classList.add('studio-web');
  host.hidden = true;
  host.innerHTML = template;
  const find = selector => host.querySelector(selector);
  const surface = find('[data-studio-native]');
  const message = find('.studio-web__message');
  const recovery = find('.studio-web__recovery');
  const dialog = find('dialog');
  const importInput = find('[data-studio-import]');
  const stores = new Map();
  const initialDrafts = new WeakMap();
  const guestStorage = guestDrafts ? createGuestStudioStorage({document: doc}) : null;
  const localScope = Symbol('guest drafts');
  let local = false;
  let binderStorage = binderApi;
  let store = null;
  let mode = 'studio';
  let besideRequest = '';
  let besideNonce = '';
  let routeId = '';
  let active = null;
  let mounted = null;
  let reader = null;
  let currentRoute = '';
  let ticket = 0;
  let editing = null;
  let pendingNavigation = null;
  let actionError = '';
  let listRequest = null;
  let binder = null;
  const recentlyRead = new Set();
  let libraryDock = null;
  let librarySearch = null;
  let libraryReading = null;
  let importRequest = null;
  const removedFootnotes = new Map();

  function explain(code) {
    if (local && code === 'missing') return 'This draft is not saved in this browser.';
    if (local && code === 'limit') return 'This browser has reached its draft limit. Download drafts to keep copies, then free some space.';
    if (local && code === 'unavailable') return messages.guest_storage_unavailable;
    return messages[code] || messages.unavailable;
  }

  function notify() {
    onChange({mode, draftId: active?.id || routeId, title: titleOf(active)});
  }

  function loadDraftIndex() {
    if (!store) return Promise.resolve([]);
    if (listRequest) return listRequest;
    const state = store;
    const previousBinder = binder;
    const previousDrafts = new Map(state.entries().map(entry => [entry.id, entry]));
    listRequest = binderStorage.list(account).then(snapshot => {
      if (state !== store || binder !== previousBinder) return state.entries();
      binder = snapshot;
      return state.reconcile(snapshot.drafts, previousDrafts);
    }).finally(() => { if (state === store) listRequest = null; });
    return listRequest;
  }

  function pickerData() {
    const folders = binder?.folders || [];
    const byFolder = new Map(folders.map(folder => [folder.id, folder]));
    const drafts = studioBinderDocuments(store?.entries() || [], binder).map(entry => ({...entry, title: titleOf(entry)}));
    function location(draft) {
      if (draft.first_draft) return 'First drafts';
      const names = [];
      const seen = new Set();
      for (let folder = byFolder.get(draft.folder_id); folder && !seen.has(folder.id); folder = byFolder.get(folder.parent_id)) {
        seen.add(folder.id);
        names.unshift(folder.name);
      }
      return ['Drafts', ...names].join(' / ');
    }
    const rows = drafts.map(draft => ({...draft, location: location(draft)}));
    const byDraft = new Map(rows.map(row => [row.id, row]));
    const recentReadings = [...recentlyRead].reverse().map(id => byDraft.get(id)).filter(Boolean);
    return {
      drafts, folders, recent: rows.slice(0, 5), show_readings: true,
      readings: [...recentReadings, ...rows.filter(row => !recentlyRead.has(row.id)).map(row => ({...row, recent: false}))],
      actions_unavailable: !store,
      status: store ? (binder ? (local ? 'Drafts saved on this browser' : '') : 'Opening your drafts…') : 'Sign in to open your private drafts.',
    };
  }

  function setMessage(text = '', {signIn = false, retry = false, start = false} = {}) {
    message.hidden = !text;
    find('[data-studio-message]').textContent = text;
    const link = find('[data-studio-signin]');
    link.hidden = !signIn;
    if (signIn) link.href = loginURL(win.location);
    find('[data-studio-retry]').hidden = !retry;
    find('[data-studio-start]').hidden = !start;
    find('[data-studio-close-beside]').hidden = mode !== 'beside';
  }

  function showRecovery(text = '') {
    actionError = text;
    find('[data-studio-error]').textContent = text;
    recovery.hidden = !text;
    find('[data-studio-copy]').hidden = !active?.dirty;
    find('[data-studio-download]').hidden = !active;
    find('[data-studio-reload]').hidden = !active?.id;
  }

  function clearSurface() {
    reader?.destroy();
    reader = null;
    const cleanup = mounted?.cleanup;
    mounted = null;
    libraryDock = null;
    librarySearch = null;
    libraryReading = null;
    surface.replaceChildren();
    surface.inert = false;
    cleanup?.();
    removedFootnotes.clear();
  }

  function renderEditor(acknowledgement) {
    if (!mounted || !active) return;
    const editor = mounted;
    const {mount, root} = editor;
    editor.cleanup = mount({
      parentElement: root,
      data: {
        compact: mode === 'beside',
        writing_clipboard_request: besideRequest,
        write_beside_nonce: besideNonce,
        document: nativeStudioDocument(active),
        selected_id: active.id,
        documents: studioBinderDocuments(store.entries(), binder),
        folders: binder?.folders || [],
        trash: binder?.trash || [],
        show_unavailable_archive: false,
        references: (active.footnotes || []).map(studioFootnoteReference),
        library_dock: libraryDock,
        search_books: searchBooks(),
        suggestions: librarySearch?.results,
        search_kind: librarySearch?.kind,
        search_progress: librarySearch?.progress,
        reading: libraryReading,
        acknowledgement,
      },
      setTriggerValue(kind, action) {
        if (kind === 'action') queueMicrotask(() => {
          if (editor === mounted) void handleAction(action);
        });
      },
      setSnapshotReader(read) { editor.readSnapshot = read; },
    });
  }

  async function openEditor(opening) {
    const [{default: mount, rememberStudioModePosition}, html, css] = await loadStudioEditor();
    if (opening !== ticket) return;
    const container = doc.createElement('div');
    container.className = 'studio-web__native-editor';
    const root = container.attachShadow({mode: 'open'});
    root.innerHTML = html;
    const style = doc.createElement('style');
    style.textContent = css;
    if (mode === 'beside') style.textContent += `
      :host { display: flex; min-block-size: 0; flex: 1; }
      .studio.compact { display: flex; flex: 1; flex-direction: column; min-block-size: 0; }
      .studio.compact .workspace { flex: 1; min-block-size: 0; block-size: auto; }
    `;
    root.prepend(style);
    surface.append(container);
    mounted = {mount, root, rememberStudioModePosition};
    renderEditor();
  }

  function measureShell() {
    if (!host.hidden) {
      const top = Math.max(0, Math.round(host.getBoundingClientRect().top));
      host.style.setProperty('--library-shell-height', `calc(${top}px + var(--care-safe-bottom, 0px))`);
    }
  }

  win.addEventListener('resize', measureShell);
  if (typeof ResizeObserver === 'function') {
    const shellObserver = new ResizeObserver(measureShell);
    for (const element of doc.querySelectorAll('.beta-workbench, #open-books')) shellObserver.observe(element);
  }

  function go(nextMode, id = '', replace = false) {
    if (nextMode === 'beside') void show(nextMode, id);
    else if (navigate) navigate(nextMode, id, {replace});
    else void show(nextMode, id);
  }

  function openDialog(title, explanation, entries = []) {
    find('[data-studio-dialog-title]').textContent = title;
    find('[data-studio-dialog-message]').textContent = explanation;
    const buttons = entries.map(({label, invoke}) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.onclick = () => { dialog.close(); invoke(); };
      return button;
    });
    find('[data-studio-dialog-drafts]').replaceChildren(...buttons);
    if (!dialog.open) dialog.showModal();
  }

  function fullFeature(label) {
    const previewDialog = doc.getElementById('workbench-feature');
    if (label === 'Collaborate' && previewDialog) {
      openFeaturePreview(previewDialog, label);
      return;
    }
    openDialog(label, fullVersion);
  }

  function setLibraryDock(fragment, reading) {
    libraryDock = {request: win.crypto.randomUUID(), route: {view: 'library'}, fragment,
      title: reading?.work_title || reading?.title || 'CARE Library',
      mode: reading?.kind === 'passage' ? 'source' : fragment ? 'sheet' : 'library',
      layer: reading?.layer, reference: reading?.item_id};
  }

  function findLibraryReading(key) {
    if (!key) return;
    return librarySearch?.results.find(row => row.target_key === key) ||
      (libraryReading?.focus.target_key === key ? libraryReading.focus : null) ||
      active?.footnotes?.find(note => note.source?.item_id === key)?.source;
  }

  function openLibraryReading(reading, destination) {
    if (!reading) throw new Error('This linked reading is no longer available. Search the Library to open it again.');
    const href = destination === 'route' ? reading.href : searchReadingHref(reading.href, reading.item_id);
    const fragment = studioLibraryFragment(href);
    if (!fragment) throw new Error('This reading has no available Library route. Its saved citation is still in your draft.');
    libraryReading = {focus: {...reading, target_key: reading.item_id, route: {view: 'library'}, sheet_route: {view: 'library'}}};
    setLibraryDock(fragment, reading);
    return true;
  }

  function openLibrary(destination = '') {
    const fragment = studioLibraryFragment(destination);
    if (host.hidden || fragment === null) return false;
    if (reader) return reader.openLibrary(fragment);
    if (!mounted || !active) return false;
    doc.dispatchEvent(new win.CustomEvent('care:library-companion-open'));
    const resume = mounted.root.querySelector('[data-action="resume-library"]');
    if (!fragment && resume && !resume.hidden) {
      resume.click();
    } else if (fragment || !libraryDock) {
      setLibraryDock(fragment);
      renderEditor();
    }
    return true;
  }

  function minimizeLibrary() {
    if (reader) reader.minimizeLibrary();
    else mounted?.root.querySelector('[data-library-dock]:not([hidden]) [data-action="minimize-library"]')?.click();
  }

  function draftPaper() {
    return reader?.draftPaper() || mounted?.root.querySelector('[data-paper]');
  }

  function draftLines() {
    return numogramDraftLines(draftPaper());
  }

  function showAQMargins(calculate) {
    return mountNumogramDraftMargins(draftPaper(),calculate);
  }

  function dockDestination() {
    const frame = mounted?.root.querySelector('[data-library-frame]:not([data-library-staging])');
    try {
      const current = new URL(frame.contentWindow.location.href);
      if (current.origin === win.location.origin && current.pathname === '/library.html') {
        return studioLibraryFragment(current.hash) || '';
      }
    } catch { /* The companion may still be loading. */ }
    return libraryDock?.fragment || '';
  }

  async function scanLibrary(action, editor) {
    const deeper = action.type === 'scan-deeper';
    const previous = librarySearch;
    if (deeper && (!previous?.progress.more || previous.progress.id !== action.search_id)) return;
    const query = deeper ? previous.query : action.query;
    const mode = action.search_mode || 'deep';
    const scope = action.search_scope || 'library';
    const work_id = action.search_work_id || '';
    const kind = action.search_kind === 'passage' ? 'passage' : 'axiom';
    const depth = deeper ? previous.progress.depth + 1 : 0;
    const progress = {id: deeper ? previous.progress.id : action.nonce, mode, scope, work_id, depth, status: 'done'};
    const priorResults = deeper ? previous.results : [];
    try {
      const {results, more} = await searchPublished({query, kind, mode, work_id, depth,
        exclude: priorResults.map(row => row.target_key), limit: 8});
      if (mounted === editor) librarySearch = {query, kind, results: [...priorResults, ...results],
        progress: {...progress, more: Boolean(more)}};
    } catch {
      if (mounted === editor) librarySearch = {query, kind, results: priorResults,
        progress: {...progress, error: 'Library search is temporarily unavailable. Try again.'}};
    }
  }

  function draftsDialog() {
    openDialog('Your drafts', local ? 'Drafts are saved on this browser. Download a copy to keep a backup.' :
      preview ? 'These drafts are saved in the local preview on this Mac.' : 'Drafts are private to your CARE account.',
      store.entries().map(entry => ({label: titleOf(entry), invoke: () => go(mode, entry.id)})));
  }

  function offerDraftDownload(draft) {
    const state = store;
    const entries = [{
      label: draft.format === 'html' ? 'Editable CARE draft' : 'Plain text',
      invoke: () => downloadDraft(doc, draft),
    }];
    if (draft.id) entries.push({label: 'HTML reading copy', async invoke() {
      try {
        const {ack} = await binderStorage.act(account, {operation: 'read', document_ids: [draft.id]});
        if (state === store) downloadReadingCopy(doc, ack.binder_preview.html, draftFilename(draft));
      } catch (error) {
        if (state === store && active === draft) openDialog('Download draft', error.message, entries);
      }
    }});
    openDialog('Download draft', 'Save an editable copy or an HTML reading copy with its footnotes.', entries);
  }

  function chooseManuscript(destination) {
    importRequest = {state: store, opening: ticket, destination,
      folderId: destination === 'reader' ? null : binder?.locations[active?.id]};
    importInput.click();
  }

  importInput.onchange = async () => {
    const file = importInput.files[0];
    const request = importRequest;
    importInput.value = '';
    importRequest = null;
    if (!file || request?.state !== store || !store) return;
    const {state, opening, destination, folderId} = request;
    try {
      const payload = await nativeStudioImport(file, {local});
      if (state !== store) return;
      const draft = await state.newDraft({...payload, ...(folderId ? {folder_id: folderId} : {})});
      if (state === store && opening === ticket) go(destination, draft.id);
    } catch (error) {
      if (state === store && opening === ticket) {
        openDialog('Import manuscript', error.status ? explain(errorCode(error)) : error.message);
      }
    }
  };

  function removeDraft() {
    if (!active?.id) return;
    const draft = active;
    openDialog('Move draft to Trash?', 'You can restore it from Trash in the Studio Binder.', [{
      label: 'Move to Trash', async invoke() {
        if (active !== draft || draft.dirty || editing) {
          showRecovery('Save the draft before moving it to Trash.');
          return;
        }
        const state = store;
        let snapshot;
        try {
          const moved = await state.remove(draft, async (owner, id, revision) => {
            snapshot = await binderStorage.act(owner, {operation: 'trash', item_kind: 'document',
              document_id: id, target_id: id}, revision);
          });
          if (!moved || state !== store) return;
          binder = snapshot;
          const entries = state.reconcile(snapshot.drafts);
          if (draft === active) go(mode, entries[0]?.id || '', true);
        } catch (error) {
          if (state === store && draft === active) showRecovery(error.message);
        }
      },
    }]);
  }

  async function handleAction(action) {
    const state = store;
    const draft = active;
    const editor = mounted;
    if (!editor || !state || !draft || action.document_id !== draft.id) return;
    const writingMode = mode === 'beside' ? 'beside' : 'studio';
    let ack = {nonce: action.nonce};
    let after;
    let added = [];
    let rejectedFootnoteEdit;
    try {
      if (action.type === 'reload') {
        const reloaded = await state.load(draft.id, {fresh: true});
        if (state !== store || active !== draft || mounted !== editor) return;
        active = reloaded;
      } else {
        if (action.type === 'link' || action.type === 'paste-cited') {
          let source = action.type === 'link' ? findLibraryReading(action.target_key) : {
            kind: action.source?.kind, item_id: action.source?.id,
            ...(action.source?.mode === 'passage-quote' ? {quote: action.source.quote} : {}),
          };
          if (local && action.type === 'paste-cited' && ['passage', 'axiom'].includes(source.kind) && source.item_id) {
            const {results} = await searchPublished({query: source.item_id, kind: source.kind, mode: 'classic', limit: 1});
            if (state !== store || active !== draft || mounted !== editor) return;
            const published = results.find(row => row.kind === source.kind && row.item_id === source.item_id);
            if (!published) throw new Error(messages.source_not_published);
            const normalized = text => text.trim().replace(/\s+/gu, ' ');
            if (source.quote && !normalized(published.text || '').includes(normalized(source.quote))) {
              throw new Error(messages.source_quote_changed);
            }
            source = {...published, ...source};
          }
          added = [linkStudioFootnote(draft, action, source, win.crypto.randomUUID())];
          if (local && source.href) added[0] = {...added[0], source: {...source, ...added[0].source}};
        } else if (action.type === 'clipboard-footnotes') {
          added = await copyStudioFootnotes(draft, action, state.load, {local});
          if (state !== store || active !== draft || mounted !== editor) return;
        }
        const notesBefore = draft.footnotes || [];
        const patch = {title: action.title, body: action.html, format: 'html',
          footnotes: nativeStudioFootnotes(draft, action, removedFootnotes, added)};
        const original = nativeStudioDocument(draft);
        if (draft.format === 'html' || patch.title !== original.title || patch.body !== original.html || patch.footnotes.length) {
          state.edit(draft, patch);
        }
        if (draft.dirty) {
          if (added.length || action.type === 'manual-footnote') rejectedFootnoteEdit = notesBefore;
          editing = state.save(draft);
          if (!(await editing)) throw new Error(explain(draft.error));
          rejectedFootnoteEdit = undefined;
        }
        if (active === draft) {
          const removed = new Set(action.removed_footnotes || []);
          for (const note of notesBefore) if (removed.has(note.id)) removedFootnotes.set(note.id, note);
          if (removedFootnotes.size > 250) removedFootnotes.delete(removedFootnotes.keys().next().value);
        }
      }
      if (state !== store || mounted !== editor || (active !== draft && action.type !== 'reload')) return;
      showRecovery();
      ack = {...ack, saved: true, revision: active.revision};
      switch (action.type) {
        case 'save':
        case 'reload':
        case 'move-footnote':
        case 'delete-footnotes':
        case 'history-footnotes':
        case 'clipboard-footnotes':
        case 'link':
        case 'note':
          break;
        case 'paste-cited':
          ack.citation_added = true;
          ack.citation_reference_id = added[0].id;
          break;
        case 'manual-footnote':
          ack.manual_reference_id = action.reference_id;
          break;
        case 'new': {
          const created = await state.newDraft({title: '', body: '', format: 'html',
            ...(action.folder_id ? {folder_id: action.folder_id} : {})});
          after = () => go(writingMode, created.id);
          break;
        }
        case 'open':
          if (state.entries().some(entry => entry.id === action.target_id)) after = () => go(writingMode, action.target_id);
          break;
        case 'close':
          if (writingMode === 'beside') after = hide;
          break;
        case 'studio':
          after = () => go('studio', draft.id);
          break;
        case 'files':
          after = draftsDialog;
          break;
        case 'import':
          after = () => chooseManuscript(writingMode);
          break;
        case 'export':
          after = () => offerDraftDownload(draft);
          break;
        case 'open-care-reader':
          after = () => go('reader', draft.id);
          break;
        case 'library-full':
          after = () => { win.location.hash = dockDestination(); };
          break;
        case 'library-close':
          libraryDock = null;
          break;
        case 'scan':
        case 'scan-deeper':
          await scanLibrary(action, editor);
          break;
        case 'history-open':
          if (action.kind === 'library') setLibraryDock('');
          else after = () => fullFeature('CARE the Librarian');
          break;
        case 'read':
        case 'reading-open':
          openLibraryReading(findLibraryReading(action.target_key), action.destination);
          break;
        case 'axiom-footnote':
        case 'axiom-notes': {
          const reading = await resolveStudioFootnoteReading(draft, action.reference_id);
          if (state !== store || active !== draft || mounted !== editor) return;
          openLibraryReading(reading);
          break;
        }
        case 'compile':
        case 'binder': {
          const compile = action.type === 'compile';
          let snapshot;
          try {
            snapshot = await binderStorage.act(account, compile ? {...action, operation: 'read'} : action, draft.revision);
          } catch (error) {
            if (compile) after = () => openDialog('Compile drafts', error.message);
            else ack.binder_error = error.message;
            break;
          }
          if (state !== store || active !== draft || mounted !== editor) return;
          if (compile) {
            after = () => openDialog('Compile drafts', 'Download the selected drafts in Binder order as one HTML file.', [{
              label: 'Download HTML',
              invoke: () => downloadReadingCopy(doc, snapshot.ack.binder_preview.html),
            }]);
            break;
          }
          binder = snapshot;
          const entries = state.reconcile(snapshot.drafts);
          const {binder_title: renamedTitle, revision: renamedRevision, ...binderAck} = snapshot.ack;
          if (action.operation === 'place-draft') binderAck.binder_placed = true;
          Object.assign(ack, binderAck);
          const current = entries.find(entry => entry.id === draft.id);
          if (!current) after = () => go(writingMode, entries[0]?.id || '', true);
          else if (action.target_id === draft.id && renamedTitle !== undefined && current.revision === renamedRevision) {
            Object.assign(ack, {binder_title: renamedTitle, revision: renamedRevision});
            draft.title = current.title;
            draft.revision = current.revision;
            draft.updated_at = current.updated_at;
          }
          break;
        }
        default:
          after = () => fullFeature(futureActions[action.type] || 'Studio tool');
      }
    } catch (error) {
      if (state !== store || active !== draft) return;
      const explanation = error.status ? explain(errorCode(error)) : error.message;
      ack.error = explanation;
      if (rejectedFootnoteEdit) state.edit(draft, {footnotes: rejectedFootnoteEdit});
      showRecovery(explanation);
      pendingNavigation?.cancel();
      pendingNavigation = null;
    } finally {
      if (state === store) editing = null;
    }
    if (state !== store || mounted !== editor) return;
    renderEditor(ack);
    // The editor restores the prose and caret when a footnote insertion is rejected.
    if (rejectedFootnoteEdit) state.edit(draft, currentEdits(draft));
    notify();
    after?.();
  }

  function openInitialDraft(state) {
    if (!initialDrafts.has(state)) {
      initialDrafts.set(state, state.newDraft({title: '', body: '', format: 'html'})
        .finally(() => initialDrafts.delete(state)));
    }
    return initialDrafts.get(state);
  }

  async function show(nextMode, nextId = '', nonce = '') {
    const opening = ++ticket;
    const previousMode = mode;

    if (previousMode !== nextMode) {
      delete win.careWritingModePosition;
      if (nextId && active?.id === nextId) {
        if (previousMode === 'studio' && nextMode === 'reader' && mounted) {
          mounted.rememberStudioModePosition(mounted.root, nextId);
        } else if (previousMode === 'reader' && nextMode === 'studio') {
          reader?.rememberStudioPosition();
        }
      }
    }
    const wasBeside = Boolean(besideRequest);
    const beside = nextMode === 'beside';
    besideNonce = beside ? nonce : '';
    mode = nextMode;
    routeId = nextId;
    currentRoute = win.location.hash;
    host.dataset.mode = mode;
    host.setAttribute('aria-label', beside ? 'Write beside' : 'Document workspace');
    surface.classList.toggle('st-key-care_writing_drawer_surface', beside);
    host.hidden = false;
    if (beside !== wasBeside) {
      besideRequest = beside ? win.crypto.randomUUID().replaceAll('-', '') : '';
      onBesideChange(beside);
    }
    measureShell();
    if (mounted && previousMode === nextMode && active?.id === nextId && nextMode !== 'reader') {
      if (besideNonce) renderEditor();
      notify();
      return;
    }
    clearSurface();
    active = null;
    showRecovery();
    if (!store) {
      setMessage(preview ? 'Restart the local preview to open drafts.' : 'Sign in to open your private drafts.', {signIn: !preview});
      return;
    }
    const state = store;
    setMessage(beside ? 'Opening Write beside…' : mode === 'reader' ? 'Opening CARE Reader…' : 'Opening CARE Studio…');
    try {
      const entries = await loadDraftIndex();
      if (opening !== ticket) return;
      const id = nextId && (!beside || entries.some(entry => entry.id === nextId)) ? nextId : entries[0]?.id;
      if (!id && mode === 'reader') {
        setMessage('Open a draft in Studio to read it here.', {start: true});
        return;
      }
      const draft = id ? await state.load(id) : await openInitialDraft(state);
      if (opening !== ticket) return;
      active = draft;
      if (beside) routeId = draft.id;
      else if (!nextId) {
        go(mode, draft.id, true);
        if (opening !== ticket) return;
      }
      if (mode !== 'reader') {
        await openEditor(opening);
      } else {
        const {mountNativeDraftReader} = await import('./native-draft-reader.mjs');
        if (opening !== ticket) return;
        reader = mountNativeDraftReader(surface, {
          draft: {...draft, ...nativeStudioDocument(draft)}, reviewer: 'You',
          onStudio: () => go('studio', draft.id),
          onClose: () => go('studio', draft.id),
          library: true,
          onSearch,
        });
        if (!(await reader.ready)) {
          if (opening === ticket) setMessage();
          return;
        }
      }
      if (opening !== ticket) return;
      setMessage();
      if (mode === 'reader') {
        recentlyRead.delete(draft.id);
        recentlyRead.add(draft.id);
      }
      notify();
    } catch (error) {
      if (opening !== ticket) return;
      const loadingError = errorCode(error);
      setMessage(explain(loadingError), {signIn: loadingError === 'sign_in', retry: true, start: loadingError === 'missing'});
    }
  }

  function deferNavigation(destination, resume, cancel) {
    if (host.hidden || currentRoute === destination) return false;
    if (reader && !reader.canLeave()) {
      cancel(currentRoute);
      return true;
    }
    if (!mounted) return false;
    if (actionError && active?.dirty) {
      cancel(currentRoute);
      return true;
    }
    if (pendingNavigation) {
      pendingNavigation.resume = resume;
      pendingNavigation.cancel = () => cancel(currentRoute);
      return true;
    }
    pendingNavigation = {resume, cancel: () => cancel(currentRoute)};
    const allowed = win.dispatchEvent(new CustomEvent('care-workspace-before-navigation', {
      cancelable: true,
      detail: {resume() {
        const continuation = pendingNavigation?.resume;
        pendingNavigation = null;
        continuation?.();
      }},
    }));
    if (allowed) pendingNavigation = null;
    return !allowed;
  }

  function hide() {
    delete win.careWritingModePosition;
    ticket += 1;
    currentRoute = '';
    pendingNavigation = null;
    clearSurface();
    if (dialog.open) dialog.close();
    host.hidden = true;
    if (besideRequest) {
      besideRequest = '';
      besideNonce = '';
      onBesideChange(false);
    }
  }

  function showBeside(id = '', nonce = '') {
    if (!store) return;
    if (!besideRequest) return show('beside', id, nonce);
    if (!id || id === active?.id) {
      if (nonce) {
        besideNonce = nonce;
        queueMicrotask(() => {
          if (besideRequest && besideNonce === nonce) renderEditor();
        });
      }
      return;
    }
    const open = () => show('beside', id, nonce);
    if (!deferNavigation('write-beside:' + id, open, () => {})) return open();
  }

  function closeBeside() {
    if (besideRequest && !deferNavigation('close:write-beside', hide, () => {})) hide();
  }

  function syncBesideRoute() {
    if (besideRequest) currentRoute = win.location.hash;
  }

  function setAccount(next, {preview: isPreview = preview, useLocal = false} = {}) {
    preview = isPreview;
    useLocal = Boolean(useLocal && !next && guestStorage);
    if (next === account && useLocal === local && store) return;
    delete win.careWritingModePosition;
    store?.pause();
    account = next;
    local = useLocal;
    const scope = local ? localScope : account;
    binderStorage = local ? guestStorage.binderApi : binderApi;
    store = scope ? stores.get(scope) || createStudioDraftState({
      api: local ? guestStorage.api : api, account, local, autoSave: false,
    }) : null;
    if (scope) stores.set(scope, store);
    listRequest = null;
    binder = null;
    recentlyRead.clear();
    editing = null;
    active = null;
    if (!host.hidden) void show(mode, routeId);
    else clearSurface();
  }

  function fileCommand(command, options) {
    win.dispatchEvent(new CustomEvent('care-writing-file-command', {detail: {command, ...options}}));
  }

  function command(name, options) {
    if (futureActions[name]) return fullFeature(futureActions[name]);
    if (!store) return;
    if (name === 'import' || name === 'import-reader') return chooseManuscript(name === 'import' ? 'studio' : 'reader');
    if (name === 'files' && store && !mounted) return draftsDialog();
    if (name === 'find' && reader) return reader.find();
    if (name === 'export' && reader && active) return offerDraftDownload(active);
    if (name === 'new' && (!mounted || besideRequest)) {
      const create = async () => {
        const state = store;
        const opening = ticket;
        try {
          const draft = await state.newDraft({title: '', body: '', format: 'html',
            ...(options?.folder_id ? {folder_id: options.folder_id} : {})});
          if (state === store && opening === ticket) go('studio', draft.id);
        } catch (error) {
          if (state === store && opening === ticket) setMessage(explain(errorCode(error)), {retry: true});
        }
      };
      if (!besideRequest || !deferNavigation('new:studio', create, () => {})) void create();
      return;
    }
    if (name === 'remove') {
      if (!mounted) return removeDraft();
      if (!deferNavigation('delete', removeDraft, () => {})) removeDraft();
      return;
    }
    fileCommand(name === 'files' ? 'binder' : name, options);
  }

  find('[data-studio-start]').onclick = () => go(mode === 'beside' ? 'beside' : 'studio', '');
  find('[data-studio-retry]').onclick = () => show(mode, routeId);
  find('[data-studio-close-beside]').onclick = closeBeside;
  win.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented || !besideRequest || !host.contains(doc.activeElement) ||
        dialog.open || mounted?.root.querySelector('dialog[open]')) return;
    event.preventDefault();
    closeBeside();
  });
  function currentEdits(draft) {
    const snapshot = mounted?.readSnapshot?.();
    return snapshot ? {title: snapshot.title, body: snapshot.html, format: 'html',
      footnotes: nativeStudioFootnotes(draft, snapshot, removedFootnotes)} : {};
  }
  find('[data-studio-download]').onclick = () => active && downloadDraft(doc, {...active, ...currentEdits(active)});
  find('[data-studio-reload]').onclick = () => {
    if (active?.dirty && !win.confirm('Reload the saved revision and discard the unsaved edits in this tab?')) return;
    mounted?.root.querySelector('[data-action="reload"]')?.click();
  };
  find('[data-studio-copy]').onclick = async () => {
    if (!active?.dirty || editing) return;
    const draft = active;
    const state = store;
    const copyButton = find('[data-studio-copy]');
    surface.inert = copyButton.disabled = true;
    state.edit(draft, currentEdits(draft));
    try {
      if (await state.save(draft, {copy: true}) && state === store && active === draft) {
        showRecovery();
        clearSurface();
        go(mode, draft.id, true);
      } else if (state === store) showRecovery(explain(draft.error));
    } finally {
      surface.inert = copyButton.disabled = false;
    }
  };
  win.addEventListener('care:account-ended', () => {
    if (besideRequest) hide();
    stores.clear();
    setAccount(null);
  });
  win.addEventListener('beforeunload', event => {
    if ([...stores.values()].some(state => state.hasUnsentEdits())) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  const initialAccount = account;
  account = null;
  setAccount(initialAccount, {useLocal: guestDrafts});
  return {show, hide, showBeside, closeBeside, syncBesideRoute, setAccount, command, deferNavigation, openLibrary, minimizeLibrary, draftLines, showAQMargins, loadDraftIndex, pickerData,
    get canWriteBeside() { return Boolean(store); },
    get besideOpen() { return Boolean(besideRequest); },
    get besideRequest() { return besideRequest; },
    get activeDraftId() { return active?.id || ''; }};
}
