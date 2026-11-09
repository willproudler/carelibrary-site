import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuestStudioStorage} from '../native/studio-guest-storage.mjs';

// Keep the same request event ordering as IndexedDB and publish writes only on
// completion. Tests need neither a browser process nor a filesystem database.
function memoryIndexedDB() {
  const data = new Map();
  const jobs = [];
  let running = false;
  function advance() {
    if (running || !jobs.length) return;
    running = true;
    queueMicrotask(() => {
      jobs.shift()();
      running = false;
      advance();
    });
  }
  const db = {
    createObjectStore(name) { data.set(name, new Map()); },
    transaction(names, mode) {
      const tx = {error: null};
      const requests = [];
      let aborted = false;
      const put = (row, value) => row.set(value.id, structuredClone(value));
      function request(name, operation) {
        const event = {};
        requests.push(tables => {
          event.result = structuredClone(operation(tables.get(name)));
          event.onsuccess?.();
        });
        return event;
      }
      tx.abort = () => { aborted = true; };
      tx.objectStore = name => ({
        get: key => request(name, row => row.get(key)),
        getAll: () => request(name, row => [...row.values()]),
        put: value => request(name, row => { put(row, value); }),
        add: value => request(name, row => { put(row, value); }),
      });
      jobs.push(() => {
        const tables = new Map(names.map(name => [name, structuredClone(data.get(name))]));
        for (let index = 0; index < requests.length && !aborted; index++) requests[index](tables);
        if (aborted) tx.onabort();
        else {
          if (mode === 'readwrite') for (const [name, table] of tables) data.set(name, table);
          tx.oncomplete();
        }
      });
      advance();
      return tx;
    },
  };
  return {
    open() {
      const request = {result: db};
      queueMicrotask(() => {
        if (!data.size) request.onupgradeneeded();
        request.onsuccess();
      });
      return request;
    },
  };
}

test('guest drafts survive reopening and concurrent saves cannot overwrite a newer revision', async () => {
  const indexedDB = memoryIndexedDB();
  const {api} = createGuestStudioStorage({indexedDB});
  const second = createGuestStudioStorage({indexedDB}).api;
  const {draft} = await api.create(null, {title: 'Guest draft', body: 'Original text'});
  assert.match(draft.id, /^[0-9a-f]{32}$/);
  const {draft: reopened} = await second.load(null, draft.id);
  assert.deepEqual(reopened, draft);
  const updates = await Promise.allSettled([
    api.update(null, draft.id, {revision: draft.revision, title: draft.title, body: 'First change'}),
    second.update(null, draft.id, {revision: draft.revision, title: draft.title, body: 'Second change'}),
  ]);
  assert.deepEqual(updates.map(result => result.status), ['fulfilled', 'rejected']);
  assert.equal(updates[1].reason.code, 'draft_conflict');
  const {draft: saved} = await second.load(null, draft.id);
  assert.equal(saved.revision, 2);
  assert.equal(saved.body, 'First change');
  assert.deepEqual((await api.list(null)).drafts.map(entry => entry.id), [draft.id]);
});

test('guest Binder moves and restores folder trees without losing manuscripts', async () => {
  const {api, binderApi} = createGuestStudioStorage({indexedDB: memoryIndexedDB()});
  const {ack: {binder_folder: root}} = await binderApi.act(null, {operation: 'create-folder', folder_name: 'Work'});
  const {ack: {binder_folder: child}} = await binderApi.act(null,
    {operation: 'create-folder', folder_name: 'Chapters', folder_id: root});
  const {draft} = await api.create(null, {title: 'Opening <script>', body: 'Two & three', folder_id: child});
  await assert.rejects(binderApi.act(null, {operation: 'move', item_kind: 'folder',
    target_id: root, folder_id: child}), {code: 'binder_cycle'});
  const {ack: {binder_preview: copy}} = await binderApi.act(null, {operation: 'read', document_ids: [draft.id]});
  assert.equal(copy.html, '<h1>Opening &lt;script&gt;</h1><p>Two &amp; three</p>');
  const trashed = await binderApi.act(null, {operation: 'trash', item_kind: 'folder', target_id: root});
  assert.deepEqual(trashed.drafts, []);
  assert.deepEqual(trashed.trash.map(({id}) => id), [root]);
  await assert.rejects(api.load(null, draft.id), {code: 'draft_not_found'});
  const restored = await binderApi.act(null, {operation: 'restore', item_kind: 'folder', target_id: root});
  assert.equal(restored.locations[draft.id], child);
  assert.equal(restored.drafts[0].revision, draft.revision + 1);
  assert.equal((await api.load(null, draft.id)).draft.body, draft.body);
});

test('blocked guest storage fails explicitly and a later retry can reopen it', async () => {
  const factory = memoryIndexedDB();
  let blocked = true;
  const indexedDB = {open() {
    if (blocked) throw new DOMException('Storage disabled', 'SecurityError');
    return factory.open();
  }};
  const {api} = createGuestStudioStorage({indexedDB});
  for (const result of await Promise.allSettled([api.list(null), api.list(null)])) {
    assert.equal(result.reason.code, 'guest_storage_unavailable');
    assert.match(result.reason.message, /cannot access browser storage/);
  }
  blocked = false;
  assert.deepEqual(await api.list(null), {drafts: []});
});
