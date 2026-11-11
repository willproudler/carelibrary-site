import {binderActionPayload} from './beta-binder.mjs';
import {sanitizeGuestMarkup} from './studio-guest-markup.mjs';
import {firstDraftTitle} from './studio-first-drafts.mjs';

const databaseName = 'care-studio-guest';
const selectionLimit = 50;
const bodyLimit = 256 * 1024;
const previewLimit = 768 * 1024;
const encoder = new TextEncoder();
const anchorId = /^[A-Za-z0-9_-]{1,100}$/;
const unsupportedText = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\p{Surrogate}]/u;
const unsupportedName = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\p{Surrogate}]/u;
const binderTables = ['drafts', 'folders'];

function fault(code, status, message = code) {
  return Object.assign(new Error(message), {code, status});
}

function storageError(error) {
  if (error?.code === 'guest_storage_unavailable' || error?.code === 'guest_storage_full') return error;
  if (error?.name === 'QuotaExceededError') {
    return fault('guest_storage_full', undefined, 'This browser is out of storage. Download a copy to keep your edits.');
  }
  return fault('guest_storage_unavailable', undefined, 'Studio cannot access browser storage. Allow this site to store data and try again.');
}

const invalid = () => fault('invalid_draft', 400);
const tooLarge = () => fault('draft_too_large', 413, 'Use a shorter draft name or less text.');
const missing = () => fault('draft_not_found', 404, 'That draft is no longer available.');
const conflict = () => fault('draft_conflict', 409, 'That draft changed in another tab. Refresh the Binder and try again.');
const binderInvalid = () => fault('binder_invalid', 400, 'Choose a valid draft, folder or name.');
const newId = () => globalThis.crypto.randomUUID().replaceAll('-', '');
const now = () => Date.now() / 1000;
const escape = text => text.replace(/[&<>]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[char]);
const draftSummary = ({id, title, revision, updated_at}) => ({id, title, revision, updated_at});
const draftSnapshot = (draft, content) => ({...draftSummary(draft), body: content.body,
  ...(content.format === 'html' ? {format: 'html', footnotes: content.footnotes} : {})});

function activeDraft(draft, revision) {
  if (!draft || draft.trash_root) throw missing();
  if (revision !== undefined && (revision !== draft.revision || revision >= Number.MAX_SAFE_INTEGER)) throw conflict();
  return draft;
}

function folderFor(folders, id) {
  if (id == null) return null;
  const folder = folders.get(id);
  if (!folder || folder.trash_root) throw fault('binder_folder_not_found', 404, 'That folder is no longer available.');
  return folder;
}

function draftTitle(title, format) {
  if (typeof title !== 'string' || unsupportedName.test(title)) throw invalid();
  if ([...title].length > (format === 'html' ? 300 : 160)) throw tooLarge();
  return title.trim() || 'Untitled';
}

function noteSource(source) {
  const {kind, item_id, quote} = source || {};
  if (!['axiom', 'passage'].includes(kind) || typeof item_id !== 'string' || !item_id ||
      item_id.length > 300 || /\s/u.test(item_id) || unsupportedText.test(item_id)) throw invalid();
  const claim = {kind, item_id};
  if (quote !== undefined) {
    if (kind !== 'passage' || typeof quote !== 'string' || !quote.trim() ||
        quote.length > 20_000 || unsupportedText.test(quote)) throw invalid();
    claim.quote = quote;
  }
  for (const key of ['work_id', 'work_title', 'author', 'year', 'title', 'unit_id', 'unit_title', 'layer', 'text']) {
    const value = source[key];
    if (typeof value === 'string' && !unsupportedText.test(value)) claim[key] = [...value].slice(0, key === 'text' ? 6000 : 500).join('');
    else if (key === 'year' && Number.isSafeInteger(value)) claim.year = value;
  }
  if (typeof source.href === 'string' && /^#(?:book|field|lateral)=[^\s\\]+$/.test(source.href) &&
      source.href.length <= 4096) claim.href = source.href;
  return claim;
}

function draftNotes(notes, anchors, previous) {
  if (!Array.isArray(notes) || notes.length > 250) throw invalid();
  const identities = new Set();
  const savedSources = new Map(previous.map(note => [note.id, note.source]));
  return notes.map(entry => {
    const {id, block_id, marker_offset, marker_order, note, source} = entry || {};
    if (typeof id !== 'string' || !anchorId.test(id) || identities.has(id) || !anchors.has(block_id) ||
        typeof note !== 'string' || note.length > 20_000 || unsupportedText.test(note) ||
        [marker_offset, marker_order].some(value => !Number.isSafeInteger(value) || value < 0 || value > bodyLimit * 2)) {
      throw invalid();
    }
    identities.add(id);
    const result = {id, block_id, marker_offset, marker_order, note};
    if (source !== undefined) {
      const claim = noteSource(source);
      const saved = savedSources.get(id);
      result.source = saved && ['kind', 'item_id', 'quote'].every(key => saved[key] === claim[key])
        ? {...saved, ...claim} : claim;
    }
    return result;
  });
}

function checkContent(payload, previous, document) {
  const {format = 'text', title, body} = payload;
  const name = draftTitle(title, format);
  if (!['text', 'html'].includes(format) || typeof body !== 'string' || unsupportedText.test(body) ||
      (format === 'text' && payload.footnotes !== undefined)) throw invalid();
  if (body.length > bodyLimit || encoder.encode(body).length > bodyLimit) throw tooLarge();
  if (previous?.format === 'html' && format !== 'html') throw conflict();
  if (format === 'text') return {title: name, content: {body, format}};
  let safe;
  try {
    safe = sanitizeGuestMarkup(body, document);
  } catch (error) {
    if (error instanceof RangeError) throw invalid();
    throw error;
  }
  const oldNotes = previous?.footnotes || [];
  const footnotes = draftNotes(payload.footnotes ?? oldNotes, safe.anchors, oldNotes);
  const noteBytes = footnotes.length ? encoder.encode(JSON.stringify(footnotes)).length : 0;
  if (encoder.encode(safe.body).length + noteBytes > bodyLimit) throw tooLarge();
  return {title: name, content: {body: safe.body, format, footnotes}};
}

function binderSnapshot(drafts, folders, ack = {}) {
  const entries = [...drafts.values()].filter(draft => !draft.trash_root);
  const activeFolders = [...folders.values()].filter(folder => !folder.trash_root);
  const trash = [];
  for (const [kind, items] of [['document', drafts], ['folder', folders]]) {
    for (const item of items.values()) {
      if (item.trash_root === `${kind}:${item.id}`) {
        trash.push({id: item.id, title: item.title || item.name, kind, trashed_at: item.trashed_at});
      }
    }
  }
  return {
    drafts: entries.sort((a, b) => b.updated_at - a.updated_at).map(draftSummary),
    locations: Object.fromEntries(entries.map(draft => [draft.id, draft.folder_id])),
    first_drafts: entries.filter(draft => draft.first_draft).map(draft => draft.id),
    folders: activeFolders.sort((a, b) => a.name.localeCompare(b.name)).map(({id, name, parent_id}) => ({id, name, parent_id})),
    trash: trash.sort((a, b) => b.trashed_at - a.trashed_at),
    ack,
  };
}

function requireFolderName(name) {
  if (typeof name !== 'string' || unsupportedName.test(name) || !name.trim() || [...name.trim()].length > 120) {
    throw binderInvalid();
  }
  return name.trim();
}

function folderNameTaken(folders, name, parent, excluding) {
  const key = name.toLowerCase();
  return [...folders.values()].some(folder => folder.id !== excluding && !folder.trash_root &&
    folder.parent_id === parent && folder.name.toLowerCase() === key);
}

function ensureFolderName(folders, name, parent, excluding) {
  if (folderNameTaken(folders, name, parent, excluding)) {
    throw fault('binder_name_taken', 409, 'This location already has a folder with that name.');
  }
}

function put(table, map, item) {
  table.put(item);
  map.set(item.id, item);
}

function createFolder(table, folders, name, parent) {
  ensureFolderName(folders, name, parent);
  const id = newId();
  put(table, folders, {id, name, parent_id: parent});
  return id;
}

function chooseDrafts(ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > selectionLimit || new Set(ids).size !== ids.length ||
      ids.some(id => typeof id !== 'string' || !/^[0-9a-f]{32}$/.test(id))) throw binderInvalid();
  return ids;
}

function trashItem(tables, drafts, folders, item, kind) {
  const root = `${kind}:${item.id}`;
  const trashed_at = now();
  const trashDraft = draft => put(tables.drafts, drafts, {...draft, trash_root: root, trashed_at,
    revision: Math.min(draft.revision + 1, Number.MAX_SAFE_INTEGER)});
  if (kind === 'document') {
    trashDraft(item);
    return;
  }
  const subtree = new Set([item.id]);
  for (const id of subtree) {
    for (const folder of folders.values()) {
      if (!folder.trash_root && folder.parent_id === id) subtree.add(folder.id);
    }
  }
  if ([...drafts.values()].some(draft => !draft.trash_root && draft.first_draft && subtree.has(draft.folder_id))) {
    throw fault('binder_folder_contains_first_drafts', 409, 'Move the First drafts out of this folder before moving it to Trash.');
  }
  for (const id of subtree) put(tables.folders, folders, {...folders.get(id), trash_root: root, trashed_at});
  for (const draft of drafts.values()) if (!draft.trash_root && subtree.has(draft.folder_id)) trashDraft(draft);
}

function restoreItem(tables, drafts, folders, id, kind) {
  const root = `${kind}:${id}`;
  const item = (kind === 'folder' ? folders : drafts).get(id);
  if (item?.trash_root !== root) throw fault('binder_trash_not_found', 404, 'That item is no longer in Trash.');
  const parent = candidate => folders.has(candidate) && !folders.get(candidate).trash_root ? candidate : null;
  const restore = ({trash_root, trashed_at, ...entry}) => entry;
  if (kind === 'folder') {
    const parent_id = parent(item.parent_id);
    let name = item.name;
    for (let index = 2; folderNameTaken(folders, name, parent_id, id); index++) {
      const suffix = ` (${index})`;
      name = [...item.name].slice(0, 120 - suffix.length).join('').trimEnd() + suffix;
    }
    for (const folder of folders.values()) {
      if (folder.trash_root === root) put(tables.folders, folders,
        folder.id === id ? {...restore(folder), name, parent_id} : restore(folder));
    }
  }
  for (const draft of drafts.values()) {
    if (draft.trash_root === root) put(tables.drafts, drafts,
      kind === 'document' ? {...restore(draft), folder_id: parent(draft.folder_id)} : restore(draft));
  }
}

function mutateBinder(tables, drafts, folders, action, {content, document} = {}) {
  const {operation, target_id, item_kind} = action;
  if (['move', 'move-selection', 'place-draft'].includes(operation) && action.folder_id === undefined) throw binderInvalid();
  const folderId = folderFor(folders, action.folder_id)?.id ?? null;
  if (operation === 'create-folder') {
    return {binder_folder: createFolder(tables.folders, folders, requireFolderName(action.folder_name), folderId)};
  }
  if (operation === 'move-selection' || operation === 'folder-from-selection') {
    const selected = chooseDrafts(action.document_ids).map(id => {
      const revision = action.document_revisions?.[id];
      if (!Number.isSafeInteger(revision)) throw binderInvalid();
      return activeDraft(drafts.get(id), revision);
    });
    const create = operation === 'folder-from-selection';
    const destination = create ? createFolder(tables.folders, folders, requireFolderName(action.folder_name), folderId) : folderId;
    for (const draft of selected) put(tables.drafts, drafts, {...draft, folder_id: destination, first_draft: false});
    return create ? {binder_folder: destination} : {};
  }
  if (!['document', 'folder'].includes(item_kind) || typeof target_id !== 'string' || !/^[0-9a-f]{32}$/.test(target_id)) throw binderInvalid();
  if (operation === 'restore') {
    restoreItem(tables, drafts, folders, target_id, item_kind);
    return {};
  }
  const isFolder = item_kind === 'folder';
  if (!isFolder && !Number.isSafeInteger(action.target_revision)) throw binderInvalid();
  const item = isFolder ? folderFor(folders, target_id) : activeDraft(drafts.get(target_id), action.target_revision);
  if (operation === 'place-draft') {
    if (isFolder || typeof action.first_draft !== 'boolean') throw binderInvalid();
    if (action.first_draft && !content) throw missing();
    const title = action.first_draft ? firstDraftTitle({...item, ...content}, {document}) : item.title;
    const revision = title === item.title ? item.revision : item.revision + 1;
    put(tables.drafts, drafts, {...item, title, revision, folder_id: folderId, first_draft: action.first_draft,
      ...(revision !== item.revision ? {updated_at: now()} : {})});
    return {binder_placed: true, binder_title: title, revision};
  } else if (operation === 'trash') {
    trashItem(tables, drafts, folders, item, item_kind);
  } else if (operation === 'move') {
    if (isFolder) {
      for (let parent = folders.get(folderId); parent; parent = folders.get(parent.parent_id)) {
        if (parent.id === item.id) throw fault('binder_cycle', 409, 'A folder cannot move inside itself or a subfolder.');
      }
      ensureFolderName(folders, item.name, folderId, item.id);
      put(tables.folders, folders, {...item, parent_id: folderId});
    } else put(tables.drafts, drafts, {...item, folder_id: folderId, first_draft: false});
  } else if (operation === 'rename') {
    if (isFolder) {
      const name = requireFolderName(action.name);
      ensureFolderName(folders, name, item.parent_id, item.id);
      put(tables.folders, folders, {...item, name});
      return {binder_renamed: true};
    }
    if (typeof action.name !== 'string' || !action.name.trim()) throw binderInvalid();
    const title = draftTitle(action.name, item.format);
    const revision = item.title === title ? item.revision : item.revision + 1;
    if (revision !== item.revision) put(tables.drafts, drafts, {...item, title, revision, updated_at: now()});
    return {binder_renamed: true, binder_title: title, revision};
  }
  return {};
}

function readingCopy(documents) {
  let size = 0;
  const fragments = documents.map(({title, body, format, footnotes = []}) => {
    const notes = footnotes.map(({note, source}) => [
      [source?.author, source?.work_title, source?.item_id].filter(Boolean).join(', '), note,
    ].filter(Boolean).join(' · ')).filter(Boolean).map(value => `<li>${escape(value)}</li>`).join('');
    const manuscript = format === 'html' ? body : body.split(/\r\n?|\n/).map(line => `<p>${escape(line) || '<br>'}</p>`).join('');
    const fragment = `<h1>${escape(title)}</h1>${manuscript}${notes ? '<h2>Footnotes</h2><ol>' + notes + '</ol>' : ''}`;
    size += encoder.encode(fragment).length;
    if (size > previewLimit) throw fault('binder_preview_too_large', 413, 'Choose fewer drafts to read together.');
    return fragment;
  });
  return {binder_preview: {html: fragments.join(''), count: fragments.length}};
}

export function createGuestStudioStorage({indexedDB, document = globalThis.document} = {}) {
  let opening;
  function open() {
    if (opening) return opening;
    const pending = new Promise((resolve, reject) => {
      let blocked = false;
      const factory = indexedDB ?? globalThis.indexedDB;
      const request = factory.open(databaseName, 1);
      request.onupgradeneeded = () => {
        for (const table of [...binderTables, 'content']) request.result.createObjectStore(table, {keyPath: 'id'});
      };
      request.onblocked = () => {
        blocked = true;
        reject(storageError());
      };
      request.onerror = () => reject(storageError(request.error));
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) { db.close(); return; }
        db.onversionchange = () => {
          db.close();
          if (opening === pending) opening = null;
        };
        resolve(db);
      };
    }).catch(error => {
      if (opening === pending) opening = null;
      throw storageError(error);
    });
    opening = pending;
    return opening;
  }

  async function transaction(names, mode, read, apply) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction(names, mode);
      } catch (error) {
        opening = null;
        reject(storageError(error));
        return;
      }
      let result;
      let failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || storageError(tx.error));
      const tables = Object.fromEntries(names.map(name => [name, tx.objectStore(name)]));
      function run(values) {
        // Keep writes in the request callback so the transaction is active in WebKit too.
        try {
          result = apply(tables, values);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      }
      try {
        const requests = read(tables);
        const values = [];
        let pending = requests.length;
        if (!pending) run(values);
        for (const [index, request] of requests.entries()) {
          request.onsuccess = () => {
            values[index] = request.result;
            if (--pending === 0) run(values);
          };
        }
      } catch (error) {
        failure = storageError(error);
        tx.abort();
      }
    });
  }

  const listBinder = ({drafts, folders}) => [drafts.getAll(), folders.getAll()];
  const byId = rows => new Map(rows.map(row => [row.id, row]));
  const api = {
    list: () => transaction(['drafts'], 'readonly', tables => [tables.drafts.getAll()],
      (_, [drafts]) => ({drafts: drafts.filter(draft => !draft.trash_root).map(draftSummary)})),
    load: (_, id) => transaction(['drafts', 'content'], 'readonly',
      tables => [tables.drafts.get(id), tables.content.get(id)],
      (_, [draft, content]) => ({draft: draftSnapshot(activeDraft(draft), content)})),
    create: (_, payload) => transaction(['drafts', 'folders', 'content'], 'readwrite',
      tables => payload.folder_id ? [tables.folders.get(payload.folder_id)] : [],
      (tables, [folder]) => {
        const folder_id = payload.folder_id || null;
        if (folder_id && (!folder || folder.trash_root)) {
          throw fault('binder_folder_not_found', 404, 'That folder is no longer available.');
        }
        const {title, content} = checkContent(payload, null, document);
        const id = newId();
        const draft = {id, title, format: content.format, revision: 1, updated_at: now(), folder_id};
        tables.drafts.add(draft);
        tables.content.add({id, ...content});
        return {draft: draftSnapshot(draft, content)};
      }),
    update: (_, id, payload) => transaction(['drafts', 'content'], 'readwrite',
      tables => [tables.drafts.get(id), tables.content.get(id)],
      (tables, [saved, previous]) => {
        if (!Number.isSafeInteger(payload.revision)) throw invalid();
        const original = activeDraft(saved, payload.revision);
        const {title, content} = checkContent(payload, previous, document);
        const draft = {...original, title, format: content.format, revision: original.revision + 1, updated_at: now()};
        tables.drafts.put(draft);
        tables.content.put({id, ...content});
        return {draft: draftSnapshot(draft, content)};
      }),
    remove: (_, id, revision) => transaction(['drafts'], 'readwrite', tables => [tables.drafts.get(id)],
      (tables, [saved]) => {
        if (!Number.isSafeInteger(revision)) throw invalid();
        const draft = activeDraft(saved, revision);
        trashItem(tables, new Map(), new Map(), draft, 'document');
        return {deleted: true};
      }),
  };
  const binderApi = {
    list: () => transaction(binderTables, 'readonly', listBinder,
      (_, [drafts, folders]) => binderSnapshot(byId(drafts), byId(folders))),
    act: (_, input, activeRevision) => {
      const action = binderActionPayload(input, activeRevision);
      if (action.operation === 'read') {
        const ids = chooseDrafts(action.document_ids);
        return transaction([...binderTables, 'content'], 'readonly',
          tables => [...listBinder(tables), ...ids.map(id => tables.content.get(id))],
          (_, [rows, folders, ...contents]) => {
            const drafts = byId(rows);
            const documents = ids.map((id, index) => draftSnapshot(activeDraft(drafts.get(id)), contents[index]));
            return binderSnapshot(drafts, byId(folders), readingCopy(documents));
          });
      }
      const place = action.operation === 'place-draft';
      return transaction(place ? [...binderTables, 'content'] : binderTables, 'readwrite',
        tables => [...listBinder(tables), ...(place ? [tables.content.get(action.target_id)] : [])], (tables, [rows, directory, content]) => {
        const drafts = byId(rows);
        const folders = byId(directory);
        return binderSnapshot(drafts, folders, mutateBinder(tables, drafts, folders, action, {content, document}));
      });
    },
  };
  return {api, binderApi};
}
