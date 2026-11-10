import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {copyStudioLibraryReference, createStudioDraftState, nativeStudioDocument, nativeStudioFootnotes, nativeStudioImport, MAX_DRAFT_BYTES, studioDraftApi, studioLibraryFragment} from '../studio-workspace.mjs';

const account = 'writer@example.test';
const original = {id: 'first', title: 'First draft', body: 'Opening', revision: 1, updated_at: 50};
const makeStore = (api, options = {}) => createStudioDraftState({api, account, schedule: () => 1, cancel: () => {}, ...options});
const reject = (status, code) => Object.assign(new Error(code), {status, code});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

test('the inline Library accepts reading fragments and excludes draft and external routes', () => {
  assert.equal(studioLibraryFragment(''), '');
  assert.equal(studioLibraryFragment('#book=timaeus&ref=CH_TIM%3AA1'), '#book=timaeus&ref=CH_TIM%3AA1');
  assert.equal(studioLibraryFragment('#book=timaeus&focus=SOURCE_1'), '#book=timaeus&focus=SOURCE_1');
  assert.equal(studioLibraryFragment('#field=corpus-i&scope=cb'), '#field=corpus-i&scope=cb');
  for (const route of [
    'https://other.example/library.html#book=timaeus', '#view=studio&draft=123', '#book=a&book=b',
    '#book=&ref=x', '#book=a&field=b', '#book=a&view=reader',
  ]) assert.equal(studioLibraryFragment(route), null);
});

test('the viewer copies a tab-scoped citation that Studio accepts from its Library pane', async () => {
  const memory = new Map();
  const sessionStorage = {getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value)};
  let item;
  const view = {crypto, sessionStorage, Blob, document:{execCommand:()=>false},
    addEventListener() {}, removeEventListener() {},
    ClipboardItem: class { constructor(types) { this.types = types; } },
    navigator:{clipboard:{async write([entry]) { item = entry; }}}};
  const ref = {id:'CH_TEST:A1', kind:'axiom', work_id:'WORK_TEST', text:'Exact published axiom'};
  assert.equal(copyStudioLibraryReference(view, {...ref, is_translation:true}, 'pane-request'), false);
  assert.equal(await copyStudioLibraryReference(view, ref, 'pane-request'), true);
  const plain = await item.types['text/plain'].text(), html = await item.types['text/html'].text();
  assert.equal(plain, ref.id);
  assert.doesNotMatch(html, /Exact published axiom/);
  const token = html.match(/data-care-studio-source="([a-z0-9-]+)"/)[1];
  const editor = readFileSync(new URL('../native/writing-editor.mjs', import.meta.url), 'utf8');
  const parser = editor.slice(editor.indexOf('function studioClipboardSource('), editor.indexOf('\nfunction citationPoint('));
  const readCitation = new Function('sessionStorage', 'writingSearchKinds', `${parser}\nreturn studioClipboardSource;`)(sessionStorage, new Set(['axiom','passage']));
  const runtime = {librarySourceRequests:new Set(['pane-request'])};
  assert.equal(readCitation(runtime, plain, '', token)?.id, ref.id);
  assert.equal(readCitation({librarySourceRequests:new Set(['another-pane'])}, plain, '', token), null);
});

test('copying the exact highlighted axiom ID in the Library pane retains its citation', () => {
  const module = readFileSync(new URL('../native/study-desk.mjs', import.meta.url), 'utf8');
  const setup = new Function(module.replace('export default function(component)', 'function mount(component)') + '\nreturn setupStudioDeskCopy;')();
  const handlers = new Map(), values = new Map(), id = 'CH_TEST:A1';
  const listen = {addEventListener(type, handler) { handlers.set(type, handler); }, removeEventListener() {}};
  const view = {parent:{}, location:{href:'https://example.test/library.html?care_studio_request=pane-request'},
    crypto, sessionStorage:{setItem() {}}};
  const card = {dataset:{selectAxiom:id}, closest: selector => selector === '[data-pane]' ? {dataset:{pane:'CH_TEST'}} : null,
    matches: () => false};
  const node = {closest: selector => selector.includes('[data-select-axiom]') ? card : null};
  let text = id;
  const selection = {isCollapsed:false, anchorNode:node, focusNode:node, toString:()=>text};
  const root = {...listen, dataset:{}, ownerDocument:{...listen, defaultView:view}, contains: el => el === card,
    getRootNode:()=>({getSelection:()=>selection})};
  const close = setup({root, data:{studio_embed:true, studio_axiom_draft_counts:{}, copy_studio_source() {},
    stack:{work:{id:'WORK_TEST'}, care_path:[{id:'CH_TEST', sections:[{items:[{id, text:'Published axiom'}]}]}]}}});
  const event = {target:node, clipboardData:{setData:(key,value)=>values.set(key,value)}, preventDefault() {}};
  try {
    handlers.get('copy')(event);
    assert.equal(values.get('text/plain'), id);
    assert.match(values.get('text/html'), /data-care-studio-source/);
    values.clear();
    text = 'Published axiom';
    handlers.get('copy')(event);
    assert.equal(values.size, 0);
  } finally { close(); }
});

test('the native editor receives HTML and escapes legacy draft text', () => {
  assert.equal(nativeStudioDocument({...original, body: '<script> & text\r\nNew line'}).html,
    '<p>&lt;script&gt; &amp; text</p><p>New line</p>');
  const body = '<h2 data-block-id="opening"><em>Opening</em></h2>';
  assert.equal(nativeStudioDocument({...original, body, format: 'html'}).html, body);
});

test('manuscript import preserves Markdown as text and restores CARE draft notes', async () => {
  const file = (name, source) => Object.assign(new Blob([source]), {name});
  const text = await nativeStudioImport(file('Opening.markdown', '# Heading\r\n<script>text</script>'));
  assert.deepEqual(text, {title: 'Opening', body: '# Heading\n<script>text</script>'});
  assert.equal(nativeStudioDocument(text).html, '<p># Heading</p><p>&lt;script&gt;text&lt;/script&gt;</p>');
  const note = {id: 'note', block_id: 'opening', marker_offset: 0, marker_order: 0, note: 'Source'};
  const html = '<p data-block-id="opening"><em>Opening</em></p>';
  const source = {kind: 'passage', item_id: 'RAW_OPENING:P0001'};
  const backup = {format: 'care.beta-draft/1', title: 'Opening', html,
    footnotes: [{...note, source: {...source, text: 'Published text', href: '#book=opening'}}]};
  assert.deepEqual(await nativeStudioImport(file('Opening.care-draft.json', JSON.stringify(backup))),
    {title: 'Opening', body: html, format: 'html', footnotes: [{...note, source}]});
  await assert.rejects(nativeStudioImport(file('Opening.html', html)), /Markdown, plain text/);
  await assert.rejects(nativeStudioImport(file('Broken.txt', new Uint8Array([0xff]))), /UTF-8/);
  await assert.rejects(nativeStudioImport(file('Broken.care-draft.json', '{}')), /draft backup/);
});

test('native footnote actions retain note content and move markers by block', () => {
  const footnotes = [{id: 'one', block_id: 'old', marker_offset: 0, marker_order: 0, note: 'First note'}];
  assert.deepEqual(nativeStudioFootnotes({footnotes}, {
    type: 'manual-footnote', reference_id: 'two', location: ['new', 7, 1],
    footnote_positions: {one: ['new', 1, 0]}, footnote_notes: {one: 'Edited note'},
  }), [
    {id: 'one', block_id: 'new', marker_offset: 1, marker_order: 0, note: 'Edited note'},
    {id: 'two', block_id: 'new', marker_offset: 7, marker_order: 1, note: ''},
  ]);
  assert.deepEqual(nativeStudioFootnotes({footnotes}, {removed_footnotes: ['one']}), []);
});

test('native autosave sends formatting and footnotes together with the saved revision', async () => {
  const body = '<p data-block-id="opening">An <em>opening</em></p>';
  const footnotes = [{id: 'one', block_id: 'opening', marker_offset: 3, marker_order: 0, note: 'First note'}];
  const state = makeStore({
    load: async () => ({draft: original}),
    update: async (_owner, id, payload) => {
      assert.equal(id, original.id);
      assert.deepEqual(payload, {title: original.title, body, footnotes, format: 'html', revision: 1});
      return {draft: {...original, ...payload, revision: 2}};
    },
  }, {autoSave: false, schedule() { throw new Error('Native editor owns the save timer'); }});
  const draft = await state.load(original.id);
  state.edit(draft, {format: 'html', body, footnotes});
  assert.equal(await state.save(draft), true);
  assert.equal(draft.revision, 2);
  assert.equal(state.hasUnsentEdits(), false);
});

test('draft requests are scoped to the current account and include the saved revision', async () => {
  const calls = [];
  const api = studioDraftApi(async (path, init) => {
    calls.push({path, ...init});
    return new Response('{}', {status: 200});
  });
  await api.list(account);
  await api.load(account, 'draft/id');
  await api.update(account, 'draft/id', {title: 'Title', body: 'Text', revision: 7});
  assert.deepEqual(calls.map(({path, method}) => [path, method]), [
    ['/api/studio/drafts', 'GET'], ['/api/studio/drafts/draft%2Fid', 'GET'], ['/api/studio/drafts/draft%2Fid', 'PUT'],
  ]);
  assert.ok(calls.every(({headers, cache}) => headers['X-Care-Account'] === account && cache === 'no-store'));
  assert.deepEqual(JSON.parse(calls[2].body), {title: 'Title', body: 'Text', revision: 7, account});
});

test('Binder removal hides a draft while preserving unsent text in the current tab', async () => {
  const state = makeStore({load: async () => ({draft: original})}, {autoSave: false});
  const draft = await state.load(original.id);
  state.edit(draft, {body: 'Text from the open tab'});

  assert.deepEqual(state.reconcile([]), []);
  assert.equal(state.hasUnsentEdits(), true);
  assert.equal((await state.load(original.id)).body, 'Text from the open tab');
});

test('moving from File to Trash uses Binder and forgets only the saved draft', async () => {
  const state = makeStore({load: async () => ({draft: original})});
  const draft = await state.load(original.id);
  const calls = [];
  assert.equal(await state.remove(draft, async (...args) => { calls.push(args); }), true);
  assert.deepEqual(calls, [[account, original.id, original.revision]]);
  assert.deepEqual(state.entries(), []);
});

test('edits made during an autosave survive and are sent with the next revision', async () => {
  const firstSave = deferred();
  const writes = [];
  const autosaves = new Map();
  let scheduled = 0;
  const state = makeStore({
    load: async () => ({draft: original}),
    update: async (_owner, id, payload) => {
      writes.push({id, ...payload});
      if (writes.length === 1) await firstSave.promise;
      return {draft: {...original, ...payload, revision: payload.revision + 1}};
    },
  }, {
    schedule(fn) { autosaves.set(++scheduled, fn); return scheduled; },
    cancel(key) { autosaves.delete(key); },
  });
  const draft = await state.load(original.id);
  state.edit(draft, {body: 'My first edit'});
  autosaves.get(1)();
  await Promise.resolve();
  assert.deepEqual(writes, [{id: original.id, title: original.title, body: 'My first edit', revision: 1}]);
  const pending = draft.saving;
  state.edit(draft, {body: 'A newer edit'});
  assert.strictEqual(await state.load(original.id), draft);
  firstSave.resolve();
  assert.equal(await pending, true);
  assert.equal(draft.body, 'A newer edit');
  assert.equal(draft.dirty, true);
  assert.equal(draft.revision, 2);
  autosaves.get(2)();
  assert.equal(await draft.saving, true);
  assert.equal(writes[1].revision, 2);
  assert.equal(writes[1].body, 'A newer edit');
  assert.equal(state.hasUnsentEdits(), false);
});

test('a failed first save keeps the unsaved manuscript and retries creation without losing text', async () => {
  let attempts = 0;
  const state = makeStore({create: async (_owner, payload) => {
    if (!attempts++) throw reject(401, 'login_required');
    return {draft: {...original, ...payload}};
  }});
  const draft = await state.load('');
  state.edit(draft, {title: 'New draft', body: 'First line\nSecond line'});
  assert.equal(await state.save(draft), false);
  assert.equal(draft.error, 'sign_in');
  assert.equal(state.hasUnsentEdits(), true);
  assert.equal((await state.load('')).body, 'First line\nSecond line');
  assert.equal(await state.save(draft), true);
  assert.equal((await state.load(original.id)).body, 'First line\nSecond line');
  assert.equal(state.hasUnsentEdits(), false);
});

test('a conflicting update keeps unsaved edits and recovery creates a distinct manuscript', async () => {
  const title = '🔬'.repeat(160);
  let updates = 0;
  let creates = 0;
  const state = makeStore({
    load: async () => ({draft: original}),
    update: async () => { updates++; throw reject(409, 'draft_conflict'); },
    create: async (_owner, payload) => { creates++; return {draft: {...original, id: 'copy', ...payload}}; },
  });
  const draft = await state.load(original.id);
  state.edit(draft, {title, body: 'Edits from the earlier tab'});
  assert.equal(await state.save(draft), false);
  assert.equal(draft.error, 'conflict');
  assert.equal(await state.save(draft), false);
  assert.equal(updates, 1);
  assert.equal(await state.save(draft, {copy: true}), true);
  assert.equal(creates, 1);
  assert.equal(draft.id, 'copy');
  assert.equal([...draft.title].length, 160);
  assert.equal(draft.title.endsWith(' (copy)'), true);
  assert.equal(draft.body, 'Edits from the earlier tab');
  assert.equal((await state.load(original.id)).body, 'Opening');
});

test('body size checks use UTF-8 bytes and a shortened manuscript can be saved', async () => {
  let requests = 0;
  const state = makeStore({create: async (_owner, payload) => {
    requests++;
    return {draft: {...original, ...payload}};
  }});
  const draft = await state.load('');
  const tooLong = 'é'.repeat(MAX_DRAFT_BYTES / 2 + 1);
  state.edit(draft, {body: tooLong});
  assert.equal(await state.save(draft), false);
  assert.equal(draft.error, 'too_large');
  assert.equal(draft.body, tooLong);
  assert.equal(requests, 0);
  state.edit(draft, {body: tooLong.slice(1)});
  assert.equal(await state.save(draft), true);
  assert.equal(requests, 1);
});
