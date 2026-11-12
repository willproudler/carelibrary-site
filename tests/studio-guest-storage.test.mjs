import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuestStudioStorage} from '../native/studio-guest-storage.mjs';
import {createBrowserStudioStorage} from '../studio-workspace.mjs';

// Keep the same request event ordering as IndexedDB and publish writes only on
// completion. Tests need neither a browser process nor a filesystem database.
function memoryIndexedDB() {
  const databases = new Map();
  function database() {
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
    objectStoreNames: {contains: name => data.has(name)},
    close() {},
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
  return {db, version: 0};
  }
  return {
    names: databases,
    open(name, version = 1) {
      if (!databases.has(name)) databases.set(name, database());
      const record = databases.get(name);
      const request = {result: record.db};
      queueMicrotask(() => {
        if (record.version < version) { request.onupgradeneeded?.(); record.version = version; }
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

test('guest First drafts survive reopening, remain editable and move back into folders', async () => {
  const indexedDB = memoryIndexedDB();
  const {api, binderApi} = createGuestStudioStorage({indexedDB});
  const {ack: {binder_folder: folder}} = await binderApi.act(null, {operation: 'create-folder', folder_name: 'Project'});
  const {draft} = await api.create(null, {title: 'Untitled', body: 'The opening words of an early manuscript\nSecond paragraph', folder_id: folder});
  const place = {operation: 'place-draft', document_id: draft.id, target_id: draft.id,
    target_revision: draft.revision, folder_id: folder, first_draft: true};
  const placed = await binderApi.act(null, place);
  assert.deepEqual(placed.first_drafts, [draft.id]);
  assert.equal(placed.locations[draft.id], folder);
  assert.equal(placed.ack.binder_title, 'The opening words of an early manuscript');
  assert.equal(placed.ack.revision, 2);
  const reopened = createGuestStudioStorage({indexedDB});
  assert.deepEqual((await reopened.binderApi.list()).first_drafts, [draft.id]);
  const saved = (await reopened.api.load(null, draft.id)).draft;
  assert.equal(saved.body, draft.body);
  await assert.rejects(reopened.binderApi.act(null, {...place, first_draft: false}), {code: 'draft_conflict'});
  assert.deepEqual((await reopened.binderApi.list()).first_drafts, [draft.id]);
  const edited = (await reopened.api.update(null, draft.id, {...saved, body: 'Revised early manuscript'})).draft;
  assert.deepEqual((await reopened.binderApi.list()).first_drafts, [draft.id]);
  const moved = await reopened.binderApi.act(null, {...place, target_revision: edited.revision, first_draft: false});
  assert.deepEqual(moved.first_drafts, []);
  assert.equal(moved.locations[draft.id], folder);
  assert.equal(moved.ack.revision, edited.revision);
  assert.equal((await reopened.api.load(null, draft.id)).draft.body, edited.body);
});

test('guest First drafts protect their old folder from recursive Trash and keep named titles', async () => {
  const {api, binderApi} = createGuestStudioStorage({indexedDB: memoryIndexedDB()});
  const {ack: {binder_folder: parent}} = await binderApi.act(null, {operation: 'create-folder', folder_name: 'Project'});
  const {ack: {binder_folder: folder}} = await binderApi.act(null, {operation: 'create-folder', folder_name: 'Chapter', folder_id: parent});
  const {draft} = await api.create(null, {title: 'Authored title', body: 'Opening text', folder_id: folder});
  const placed = await binderApi.act(null, {operation: 'place-draft', target_id: draft.id,
    target_revision: draft.revision, folder_id: folder, first_draft: true});
  assert.equal(placed.ack.binder_title, draft.title);
  assert.equal(placed.ack.revision, draft.revision);
  await assert.rejects(binderApi.act(null, {operation: 'trash', item_kind: 'folder', target_id: parent}),
    {code: 'binder_folder_contains_first_drafts'});
  assert.deepEqual((await binderApi.list()).first_drafts, [draft.id]);
  assert.deepEqual((await binderApi.list()).trash, []);
  const moved = await binderApi.act(null, {operation: 'move-selection', document_ids: [draft.id],
    document_revisions: {[draft.id]: draft.revision}, folder_id: null});
  assert.deepEqual(moved.first_drafts, []);
  assert.equal(moved.locations[draft.id], null);
  assert.equal((await api.load(null, draft.id)).draft.body, draft.body);
  const trashed = await binderApi.act(null, {operation: 'trash', item_kind: 'folder', target_id: parent});
  assert.deepEqual(trashed.trash.map(item => item.id), [parent]);
  assert.equal((await api.load(null, draft.id)).draft.body, draft.body);
});


test('signed-in browser storage is persistent and isolated from other accounts and legacy guest drafts', async () => {
  const indexedDB = memoryIndexedDB();
  const guest = createGuestStudioStorage({indexedDB});
  const alice = createGuestStudioStorage({indexedDB, account: 'Alice@Example.test'});
  const bob = createGuestStudioStorage({indexedDB, account: 'bob@example.test'});
  const {draft} = await guest.api.create(null, {title: 'Guest work', body: 'Guest manuscript'});
  const {draft: privateDraft} = await alice.api.create(null, {title: 'Alice work', body: 'Private manuscript'});
  assert.deepEqual((await bob.api.list()).drafts, []);
  assert.deepEqual((await guest.api.list()).drafts.map(row => row.id), [draft.id]);
  const reopened = createGuestStudioStorage({indexedDB, account: 'alice@example.test'});
  assert.equal((await reopened.api.load(null, privateDraft.id)).draft.body, 'Private manuscript');
  await assert.rejects(bob.api.load(null, privateDraft.id), {code: 'draft_not_found'});
  assert.equal(indexedDB.names.size, 3);
  assert.ok(indexedDB.names.has('care-studio-guest'));
  assert.ok([...indexedDB.names.keys()].filter(name => name !== 'care-studio-guest')
    .every(name => /^care-studio-account-[a-f0-9]{64}$/.test(name)));
});

const cloudId = 'a'.repeat(32), cloudFolder = 'f'.repeat(32);
const cloudDraft = {id: cloudId, title: 'Previous online work', body: 'Saved before browser storage', revision: 7, updated_at: 45};
function previousOnlineDrafts() {
  const calls = [];
  const forbidden = () => { throw new Error('Online writing mutations are forbidden'); };
  const api = {create: forbidden, update: forbidden, remove: forbidden,
    async load(account, id) { calls.push(['GET draft', account, id]); return {draft: structuredClone(cloudDraft)}; }};
  const binderApi = {act: forbidden, async list(account) {
    calls.push(['GET binder', account]);
    return {drafts: [{id: cloudId}], folders: [{id: cloudFolder, name: 'Earlier work', parent_id: null}],
      locations: {[cloudId]: cloudFolder}, first_drafts: [cloudId], trash: []};
  }};
  return {api, binderApi, calls};
}

test('one-time online copy preserves routes and folders, then writing and Binder changes make no online calls', async () => {
  const indexedDB = memoryIndexedDB(), online = previousOnlineDrafts();
  const options = {indexedDB, account: 'alice@example.test', ...online};
  const storage = createBrowserStudioStorage(options);
  const binder = await storage.binderApi.list(options.account);
  assert.deepEqual(binder.first_drafts, [cloudId]);
  assert.equal(binder.locations[cloudId], cloudFolder);
  assert.equal(binder.folders[0].name, 'Earlier work');
  const draft = (await storage.api.load(options.account, cloudId)).draft;
  assert.deepEqual(draft, cloudDraft);
  assert.deepEqual(online.calls.map(call => call[0]), ['GET binder', 'GET draft']);
  const edited = (await storage.api.update(options.account, cloudId, {...draft, body: 'Edited only on this device'})).draft;
  assert.equal(edited.revision, 8);
  const {draft: fresh} = await storage.api.create(options.account, {title: 'New local draft', body: 'New writing'});
  await storage.binderApi.act(options.account, {operation: 'move', item_kind: 'document', target_id: fresh.id,
    target_revision: fresh.revision, folder_id: cloudFolder});
  const reopened = createBrowserStudioStorage(options);
  assert.equal((await reopened.api.load(options.account, cloudId)).draft.body, edited.body);
  assert.equal((await reopened.binderApi.list(options.account)).locations[fresh.id], cloudFolder);
  assert.equal(online.calls.length, 2, 'Migration receipt prevents later document requests');
});

test('failed online copy never blocks new local writing and retries without overwriting local edits or reviving trash', async () => {
  const indexedDB = memoryIndexedDB(), online = previousOnlineDrafts();
  const options = {indexedDB, account: 'alice@example.test', ...online};
  const storage = createBrowserStudioStorage({...options,
    binderApi: {...online.binderApi, async list() { throw new Error('Network unavailable'); }}});
  assert.deepEqual((await storage.binderApi.list(options.account)).drafts, []);
  assert.ok(storage.migrationError);
  const {draft: localDraft} = await storage.api.create(options.account, {title: 'Offline work', body: 'Still writing'});
  const local = createGuestStudioStorage({indexedDB, account: options.account});
  await local.importCloud({drafts: [cloudDraft], folders: [], locations: {}, first_drafts: []});
  const imported = (await local.api.load(options.account, cloudId)).draft;
  const edited = (await local.api.update(options.account, cloudId, {...imported, body: 'Keep these local edits'})).draft;
  await local.binderApi.act(options.account, {operation: 'trash', item_kind: 'document', target_id: cloudId,
    target_revision: edited.revision});
  const reopened = createBrowserStudioStorage(options);
  await reopened.retryImport();
  await assert.rejects(reopened.api.load(options.account, cloudId), {code: 'draft_not_found'});
  assert.equal((await reopened.api.load(options.account, localDraft.id)).draft.body, localDraft.body);
  assert.deepEqual((await reopened.binderApi.list(options.account)).trash.map(row => row.id), [cloudId]);
  assert.equal(online.calls.length, 0, 'Existing receipt preserves local Trash and makes no requests');
});

test('retry after a failed migration copies saved online drafts once without changing new local work', async () => {
  const indexedDB = memoryIndexedDB(), online = previousOnlineDrafts();
  let disconnected = true;
  const storage = createBrowserStudioStorage({indexedDB, account: 'alice@example.test', api: online.api,
    binderApi: {act: online.binderApi.act, list: account => disconnected
      ? Promise.reject(new Error('Offline')) : online.binderApi.list(account)}});
  await storage.binderApi.list();
  const {draft} = await storage.api.create(null, {title: 'While offline', body: 'Keep all of this'});
  disconnected = false;
  assert.equal((await storage.retryImport()).imported, 1);
  assert.equal(storage.migrationError, null);
  assert.equal((await storage.api.load(null, draft.id)).draft.body, 'Keep all of this');
  assert.equal((await storage.api.load(null, cloudId)).draft.body, cloudDraft.body);
  await storage.retryImport();
  assert.equal(online.calls.length, 2);
});

test('invalid online batch is atomic and does not consume its migration receipt', async () => {
  const storage = createGuestStudioStorage({indexedDB: memoryIndexedDB(), account: 'alice@example.test'});
  await assert.rejects(storage.importCloud({drafts: [cloudDraft, {...cloudDraft, id: 'b'.repeat(32), body: 'x'.repeat(256 * 1024 + 1)}]}),
    {code: 'draft_too_large'});
  assert.deepEqual((await storage.api.list()).drafts, []);
  assert.equal(await storage.hasCloudImport(), false);
  assert.equal((await storage.importCloud({drafts: [cloudDraft]})).imported, 1);
  assert.equal(await storage.hasCloudImport(), true);
});


test('first import skips existing local IDs, including locally trashed drafts', async () => {
  const storage = createGuestStudioStorage({indexedDB: memoryIndexedDB(), account: 'alice@example.test'});
  const {draft: edited} = await storage.api.create(null, {title: 'Local title', body: 'Local changes win'});
  const {draft: trashed} = await storage.api.create(null, {title: 'Local trash', body: 'Keep me in Trash'});
  await storage.binderApi.act(null, {operation: 'trash', item_kind: 'document', target_id: trashed.id,
    target_revision: trashed.revision});
  const result = await storage.importCloud({drafts: [edited, trashed].map(draft =>
    ({...draft, title: 'Old cloud title', body: 'Do not replace local data', revision: 9}))});
  assert.equal(result.imported, 0);
  assert.equal((await storage.api.load(null, edited.id)).draft.body, edited.body);
  await assert.rejects(storage.api.load(null, trashed.id), {code: 'draft_not_found'});
  assert.deepEqual((await storage.binderApi.list()).trash.map(row => row.id), [trashed.id]);
});


test('guest writing through the normal browser adapter needs neither sign-in nor any document API request', async () => {
  const denyNetwork = () => { throw new Error('Guest writing must remain local'); };
  const storage = createBrowserStudioStorage({indexedDB: memoryIndexedDB(),
    api: {list: denyNetwork, load: denyNetwork, create: denyNetwork, update: denyNetwork, remove: denyNetwork},
    binderApi: {list: denyNetwork, act: denyNetwork}});
  assert.deepEqual((await storage.binderApi.list(null)).drafts, []);
  const {draft} = await storage.api.create(null, {title: 'Without signing in', body: 'My manuscript'});
  const edited = (await storage.api.update(null, draft.id, {...draft, body: 'My revised manuscript'})).draft;
  await storage.binderApi.act(null, {operation: 'trash', item_kind: 'document', target_id: draft.id,
    target_revision: edited.revision});
  await storage.binderApi.act(null, {operation: 'restore', item_kind: 'document', target_id: draft.id});
  assert.equal((await storage.api.load(null, draft.id)).draft.body, 'My revised manuscript');
});

test('upgrading the original guest database adds migration metadata without replacing saved writing', async () => {
  const indexedDB = memoryIndexedDB();
  await new Promise(resolve => {
    const request = indexedDB.open('care-studio-guest', 1);
    request.onupgradeneeded = () => {
      for (const name of ['drafts', 'folders', 'content']) request.result.createObjectStore(name, {keyPath: 'id'});
    };
    request.onsuccess = () => {
      const tx = request.result.transaction(['drafts', 'content'], 'readwrite');
      tx.objectStore('drafts').add({...cloudDraft, format: 'text', folder_id: null});
      tx.objectStore('content').add({id: cloudId, body: cloudDraft.body, format: 'text'});
      tx.oncomplete = resolve;
    };
  });
  const storage = createGuestStudioStorage({indexedDB});
  assert.equal((await storage.api.load(null, cloudId)).draft.body, cloudDraft.body);
  assert.equal(await storage.hasCloudImport(), false);
  assert.equal(indexedDB.names.get('care-studio-guest').version, 2);
});

test('a timed-out previous-draft read falls back to browser writing and leaves migration retryable', async () => {
  const indexedDB = memoryIndexedDB();
  let aborted = false;
  const storage = createBrowserStudioStorage({indexedDB, account: 'alice@example.test', timeout: 5,
    binderApi: {list(_account, {signal}) {
      return new Promise((_, reject) => signal.addEventListener('abort', () => {
        aborted = true;
        reject(new DOMException('Offline', 'AbortError'));
      }, {once: true}));
    }}, api: {load() { throw new Error('No draft read after timeout'); }}});
  assert.deepEqual((await storage.binderApi.list()).drafts, []);
  assert.equal(aborted, true);
  const {draft} = await storage.api.create(null, {title: 'Writing offline', body: 'Saved despite timeout'});
  assert.equal((await storage.api.load(null, draft.id)).draft.body, 'Saved despite timeout');
  assert.equal(await createGuestStudioStorage({indexedDB, account: 'alice@example.test'}).hasCloudImport(), false);
});
