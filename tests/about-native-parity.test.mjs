import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// Execute the production helpers together, so the isolation tests exercise the
// same storage dependencies and global snapshot map as the actual renderer.
function nativeHelpers(name, names) {
  const source = read(`native/${name}.mjs`);
  return new Function(source.replace('export default function(component)', 'function mount(component)') + `\nreturn {${names}};`)();
}

function storageRoot(ephemeral = true) {
  const calls = [];
  const stores = Object.fromEntries(['localStorage', 'sessionStorage'].map(kind => [kind, {
    getItem(key) { calls.push(['get', kind, key]); return 'saved Library preference'; },
    setItem(key, value) { calls.push(['set', kind, key, value]); },
    removeItem(key) { calls.push(['remove', kind, key]); },
  }]));
  return {root: {dataset: {ephemeralWorkspace: String(ephemeral)}, ownerDocument: {defaultView: stores}}, stores, calls};
}

test('About native readers and reference histories use separate per-root memory stores', () => {
  for (const [name, helper] of [['study-desk', 'studyDeskStorage'], ['reference-viewer', 'referenceViewerStorage']]) {
    const storage = nativeHelpers(name, helper)[helper];
    const first = storageRoot(), second = storageRoot();
    const local = storage(first.root, 'localStorage');
    const session = storage(first.root, 'sessionStorage');
    assert.equal(local.getItem('appearance'), null, name);
    local.setItem('appearance', true);
    session.setItem('history', '["selected claim"]');
    assert.equal(local.getItem('appearance'), 'true');
    assert.equal(session.getItem('history'), '["selected claim"]');
    assert.equal(session.getItem('appearance'), null, 'Local and session preferences are independent');
    assert.equal(storage(second.root, 'sessionStorage').getItem('history'), null, 'Another demo has no history');
    local.removeItem('appearance');
    assert.equal(local.getItem('appearance'), null);
    session.clear();
    assert.equal(session.getItem('history'), null);
    assert.deepEqual(first.calls, [], 'No existing Library preferences are read or written');
    assert.deepEqual(second.calls, []);
    const ordinary = storageRoot(false);
    assert.equal(storage(ordinary.root, 'localStorage'), ordinary.stores.localStorage, 'Normal Library behavior is preserved');
    assert.equal(storage(ordinary.root, 'sessionStorage'), ordinary.stores.sessionStorage);
  }
});

test('About workspace checkpoints cannot change or restore a Library reading position', () => {
  const desk = nativeHelpers('study-desk', 'workspaceCheckpoint,workspaceReadSnapshot,workspaceSnapshots');
  const {root, calls} = storageRoot();
  const saved = {version: 1, workId: 'WORK_EXAMPLE', signature: 'saved', referenceId: '', context: ''};
  desk.workspaceSnapshots.set('WORK_EXAMPLE', saved);
  root.querySelector = () => { throw Error('An ephemeral checkpoint must return before reading the workspace'); };
  desk.workspaceCheckpoint({data: {ephemeral_workspace: true}, root, workId: 'WORK_EXAMPLE'});
  assert.equal(desk.workspaceSnapshots.get('WORK_EXAMPLE'), saved);
  assert.equal(desk.workspaceReadSnapshot(root, 'WORK_EXAMPLE', 'saved', ''), null);
  assert.deepEqual(calls, []);
  root.dataset.ephemeralWorkspace = 'false';
  assert.equal(desk.workspaceReadSnapshot(root, 'WORK_EXAMPLE', 'saved', ''), saved, 'Normal readers still restore their own snapshot');
});

test('Ephemeral appearance stays local while normal readers retain their shared preference', () => {
  const desk = nativeHelpers('study-desk', 'setupVibrantView');
  const viewer = nativeHelpers('reference-viewer', 'setupViewerVibrantView');
  const view = new EventTarget();
  view.CustomEvent = class extends Event { constructor(type, options) { super(type); this.detail = options.detail; } };
  view.localStorage = {getItem: () => 'true', setItem() { throw Error('An example cannot change saved appearance'); }};
  const doc = {defaultView: view, body: {dataset: {careVibrantView: 'true', careVibrantViewVersion: '2'}}};
  function mount(setup, ephemeral) {
    const control = {setAttribute() {}, closest: () => control};
    const root = Object.assign(new EventTarget(), {ownerDocument: doc, dataset: {ephemeralWorkspace: String(ephemeral)}, querySelectorAll: () => [control], contains: node => node === control});
    const runtime = {root, data: {ephemeral_workspace: ephemeral}};
    setup(runtime);
    return {root, runtime, toggle() { const event = new Event('click', {cancelable: true}); Object.defineProperty(event, 'target', {value: control}); root.dispatchEvent(event); }};
  }
  const ordinary = mount(desk.setupVibrantView, false), example = mount(desk.setupVibrantView, true), exampleViewer = mount(viewer.setupViewerVibrantView, true);
  assert.equal(ordinary.runtime.vibrantView, true);
  assert.equal(example.runtime.vibrantView, false);
  assert.equal(exampleViewer.runtime.vibrantView, false);
  let broadcasts = 0;
  view.addEventListener('care-vibrant-view-change', () => broadcasts++);
  example.toggle();
  example.toggle();
  assert.equal(example.runtime.vibrantView, false);
  assert.equal(ordinary.runtime.vibrantView, true);
  assert.equal(doc.body.dataset.careVibrantView, 'true');
  assert.equal(broadcasts, 0);
  view.dispatchEvent(Object.assign(new Event('storage'), {key: 'care-vibrant-view-v2', newValue: 'true'}));
  assert.equal(example.runtime.vibrantView, false, 'Other tabs do not overwrite this example');
  assert.equal(exampleViewer.runtime.vibrantView, false);
  for (const mounted of [ordinary, example, exampleViewer]) mounted.runtime.cleanupVibrantView();
});

function explorerFixture() {
  const work = {id: 'WORK_EXAMPLE', title: 'Example book', author: 'Example author'};
  const chapters = [1, 2].map(n => ({id: `RAW_${n}`, raw_unit_id: `RAW_${n}`, care_unit_id: `CH_${n}`, chapter_number: n, sequence_number: n, title: `Saved chapter ${n}`, readable: true}));
  const options = chapters.map(row => ({id: row.care_unit_id, type: 'CH', title: row.title, chapter_number: row.chapter_number, sequence_number: row.sequence_number, available: true}));
  function payload(n) {
    return {mode: 'workspace', studio_embed: false, stack: {
      work, chapters, sheet_options: {CH: options}, active_raw_unit_id: `RAW_${n}`, active_unit_id: `CH_${n}`,
      active_chapter: {id: `RAW_${n}`, raw_unit_id: `RAW_${n}`, title: `Saved chapter ${n}`, passages: [{id: `RAW_${n}:P1`, text: `Saved source passage ${n}.`}]},
      care_path: [{id: `CH_${n}`, type: 'CH', title: `Saved chapter ${n}`, sections: [{number: 1, title: 'Saved section', items: [{id: `CH_${n}:A1`, text: `Saved claim ${n}.`, source_trace: [`RAW_${n}:P1`]}]}]}],
    }};
  }
  const first = payload(1), second = payload(2);
  function route(n, mode) {
    return {...payload(n), route_mode: mode, selected_reference_id: `CH_${n}:A1`, reference: {id: `CH_${n}:A1`, kind: 'axiom', layer: 'CH', work_id: work.id, unit_id: `CH_${n}`, text: `Saved claim ${n}.`, route_mode: mode, available_route_modes: ['incoming', 'both', 'outgoing'], has_outgoing: true, route_layers: {CH: []}, route_edges: []}};
  }
  return {
    title: work.title, href: '/library.html#book=example', sourceHref: '/library.html#book=example&source=RAW_1', chapterHref: '/library.html#book=example&unit=CH_1', claimHrefBase: '/library.html#book=example',
    source: first, chapter: first,
    explorer: {format: 'care-about-native-explorer/1', encoding: 'object-intern/1',
      shared: {first, second}, sources: {RAW_1: {$aboutRef: 'first'}, RAW_2: {$aboutRef: 'second'}}, sheets: {CH_1: {$aboutRef: 'first'}, CH_2: {$aboutRef: 'second'}},
      routes: Object.fromEntries([1, 2].map(n => [`CH_${n}:A1`, Object.fromEntries(['incoming', 'both', 'outgoing'].map(mode => [mode, route(n, mode)]))])),
      references: Object.fromEntries([1, 2].map(n => [`CH_${n}:A1`, {id: `CH_${n}:A1`, kind: 'axiom', layer: 'CH', work_id: work.id, unit_id: `CH_${n}`, text: `Saved claim ${n}.`, destination: `/library.html#book=example&ref=CH_${n}%3AA1`}])),
      outlines: {}, initial: {source: 'RAW_1', chapter: 'CH_1'}, scope: 'book:example',
    },
  };
}

const hash = href => new URLSearchParams(href.split('#')[1]);

test('Compressed published example packets decode locally and remain immutable through navigation', async () => {
  const {prepareAboutPanel, createAboutPanelController} = await import('../about-live-panels.mjs');
  const panel = explorerFixture(), explorer = panel.explorer;
  const compressed = {...panel, explorer: {format: explorer.format, encoding: 'object-intern-gzip/1', gzip: gzipSync(JSON.stringify(explorer)).toString('base64'), initial: explorer.initial, scope: explorer.scope}};
  const before = JSON.stringify(compressed);
  const prepared = await prepareAboutPanel(compressed);
  assert.deepEqual(prepared.explorer, explorer);
  const controller = createAboutPanelController(prepared);
  controller.dispatch('open_sheet', 'CH_2');
  const payload = controller.payload();
  assert.equal(payload.stack.active_unit_id, 'CH_2');
  payload.stack.care_path[0].sections[0].items[0].text = 'A temporary local mutation';
  assert.equal(controller.payload().stack.care_path[0].sections[0].items[0].text, 'Saved claim 2.');
  assert.equal(JSON.stringify(compressed), before);
});

test('The real native renderer supplies the source paper, chapter picker and working range controls', () => {
  const desk = nativeHelpers('study-desk', 'sourcePane,carePane');
  const stack = explorerFixture().source.stack;
  const source = desk.sourcePane(stack, '', null);
  const chapter = desk.carePane(stack.care_path[0], 0, '', null, stack);
  assert.match(source, /class="source-copy"/);
  assert.match(source, /Saved source passage 1\./);
  assert.match(chapter, /Saved claim 1\./);
  for (const [markup, layer] of [[source, 'SOURCE'], [chapter, 'CH']]) {
    assert.match(markup, /data-pane-slider-heading/);
    assert.match(markup, /data-slider-jump aria-label="Choose /);
    const input = markup.match(new RegExp(`<input[^>]*data-sheet-slider="${layer}"[^>]*>`))?.[0];
    assert.ok(input, `Actual ${layer} slider is present`);
    assert.match(input, /max="1"/);
    assert.doesNotMatch(input, /disabled/);
    assert.match(markup, /reader-full-title/);
    assert.match(markup, /reader-simple-title/);
  }
});

test('Native chapter controls navigate actual saved payloads and exact Library destinations', async () => {
  const {createAboutPanelController} = await import('../about-live-panels.mjs');
  const panel = explorerFixture(), original = JSON.stringify(panel);
  const controller = createAboutPanelController(panel);
  const payload = controller.payload();
  assert.equal(payload.studio_embed, false, 'Use the actual Library material skin');
  assert.equal(payload.ephemeral_workspace, true, 'Keep reader state in this example');
  assert.equal(payload.local_navigation_enabled, false, 'The controller supplies the published examples');
  assert.equal(payload.stack.chapters.length, 2);
  assert.equal(payload.stack.sheet_options.CH.length, 2);
  controller.dispatch('open_chapter', 'RAW_2');
  assert.equal(controller.payload().stack.active_raw_unit_id, 'RAW_2');
  assert.equal(hash(controller.href()).get('source'), 'RAW_2');
  controller.dispatch('open_sheet', 'CH_2');
  assert.equal(controller.payload().stack.active_unit_id, 'CH_2');
  assert.equal(hash(controller.href()).get('unit'), 'CH_2');
  assert.equal(JSON.stringify(panel), original, 'Native interactions never mutate the saved packet');
});

test('Route direction, history and close stay in the example and reset returns to the saved opening', async () => {
  const {createAboutPanelController} = await import('../about-live-panels.mjs');
  const panel = explorerFixture(), original = JSON.stringify(panel);
  const controller = createAboutPanelController(panel, {defaultPane: 'chapter'});
  controller.dispatch('open_reference', 'CH_1:A1');
  assert.equal(controller.status().referenceId, 'CH_1:A1');
  assert.equal(controller.selectedReference().id, 'CH_1:A1');
  assert.equal(hash(controller.href()).get('ref'), 'CH_1:A1');
  for (const mode of ['outgoing', 'both', 'incoming']) {
    controller.dispatch('set_route_mode', mode);
    assert.equal(controller.payload().reference.route_mode, mode);
    assert.equal(controller.status().routeMode, mode);
  }
  controller.dispatch('open_reference', 'CH_2:A1');
  controller.dispatch('navigate_route', -1);
  assert.equal(controller.status().referenceId, 'CH_1:A1');
  controller.dispatch('navigate_route', 1);
  assert.equal(controller.status().referenceId, 'CH_2:A1');
  controller.dispatch('clear_reference');
  assert.equal(controller.status().referenceId, '');
  assert.equal(hash(controller.href()).get('unit'), 'CH_1');
  controller.dispatch('open_sheet', 'CH_2');
  controller.dispatch('selected_axiom', {work_id: 'WORK_EXAMPLE', unit_id: 'CH_2', axiom_id: 'CH_2:A1'});
  controller.reset();
  assert.equal(controller.status().referenceId, '');
  assert.equal(controller.status().selection, null);
  assert.equal(controller.payload().stack.active_unit_id, 'CH_1');
  assert.equal(JSON.stringify(panel), original);
});

test('Unavailable chapter and claim requests preserve the current saved example', async () => {
  const {createAboutPanelController} = await import('../about-live-panels.mjs');
  const controller = createAboutPanelController(explorerFixture(), {defaultPane: 'chapter'});
  const original = controller.href();
  controller.dispatch('open_sheet', 'CH_NOT_PUBLISHED');
  assert.equal(controller.href(), original);
  controller.dispatch('open_reference', 'CH_NOT_PUBLISHED:A1');
  assert.equal(controller.href(), original);
  assert.equal(controller.status().referenceId, '');
});

class ExampleElement {
  constructor(tagName, ownerDocument) { Object.assign(this, {tagName, ownerDocument, childNodes: [], dataset: {}, attributes: new Map(), listeners: new Map(), textContent: ''}); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.childNodes.push(node); } }
  replaceChildren(...nodes) { for (const node of this.childNodes) node.parent = null; this.childNodes = []; this.append(...nodes); }
  cloneNode() { const clone = new ExampleElement(this.tagName, this.ownerDocument); clone.textContent = this.textContent; clone.append(...this.childNodes.map(node => node.cloneNode(true))); return clone; }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  removeAttribute(key) { this.attributes.delete(key); }
  addEventListener(key, value) { this.listeners.set(key, value); }
  removeEventListener(key, value) { if (this.listeners.get(key) === value) this.listeners.delete(key); }
  querySelector() { return null; }
  remove() { if (this.parent) this.parent.childNodes = this.parent.childNodes.filter(node => node !== this); this.parent = null; }
}

function nativeMountFixture() {
  const doc = {defaultView: {}, createElement(tag) { return new ExampleElement(tag, this); }};
  const host = doc.createElement('host'), fallback = doc.createElement('p');
  host.append(fallback);
  host.attachShadow = () => host.shadowRoot = doc.createElement('shadow');
  const nodes = Object.fromEntries(['live-content', 'panel-status', 'open-reading', 'open-claim'].map(name => [name, name === 'live-content' ? host : doc.createElement('span')]));
  const wrapper = {ownerDocument: doc, dataset: {aboutLivePanel: 'example', aboutDefaultPane: 'chapter'}, querySelector(selector) { return nodes[selector.slice('[data-about-'.length, -1)] || null; }, querySelectorAll() { return []; }};
  return {wrapper, host, nodes};
}

test('Both real native components share one example owner and preview links keep the Library origin', async () => {
  const {mountAboutPanel} = await import('../about-live-panels.mjs');
  const fixture = nativeMountFixture(), desks = [], viewers = [];
  const panel = explorerFixture();
  const api = await mountAboutPanel(fixture.wrapper, panel, {cssText: '', scopeCSSText: '', viewerCSSText: '', viewerHTML: '', libraryOrigin: 'https://carelibrary.org/', renderer(component) { desks.push(component); return () => {}; }, viewerRenderer(component) { viewers.push(component); return () => {}; }});
  const desk = desks.at(-1), viewer = viewers.at(-1);
  assert.equal(desk.data.studio_embed, false);
  assert.equal(desk.data.ephemeral_workspace, true);
  assert.equal(viewer.data.ephemeral_workspace, true);
  assert.equal(desk.eventRoot, fixture.wrapper);
  assert.equal(viewer.eventRoot, fixture.wrapper);
  assert.equal(desk.eventScope, viewer.eventScope);
  assert.equal(typeof desk.eventScope, 'string');
  assert.ok(desk.eventScope.length);
  for (const row of viewer.data.references) assert.equal(new URL(row.destination).origin, 'https://carelibrary.org');
  desk.setStateValue('selected_axiom', {work_id: 'WORK_EXAMPLE', unit_id: 'CH_1', axiom_id: 'CH_1:A1'});
  assert.equal(hash(fixture.nodes['open-claim'].href).get('ref'), 'CH_1:A1');
  assert.equal(new URL(fixture.nodes['open-claim'].href).origin, 'https://carelibrary.org');
  api.destroy();
});

test('About sizing preserves native pane controls, chapter dropdowns and reading typography', async () => {
  const {ABOUT_PANEL_CSS} = await import('../about-live-panels.mjs');
  const nativeControls = /window-titlebar|pane-slider|slider-heading|care-pane-controls|data-pane-control|sheet-actions/;
  for (const [, selector, declarations] of ABOUT_PANEL_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/display\s*:\s*none\b/.test(declarations)) assert.doesNotMatch(selector, nativeControls);
    if (/reader-(full|simple)-title|axiom-text|passage-text|source-head h2|care-head h2/.test(selector)) assert.doesNotMatch(declarations, /font-size|line-height|display\s*:/);
  }
  assert.match(ABOUT_PANEL_CSS, /desk-window:not\(\.care-pane-minimized\)/, 'Native minimize controls retain their own width');
  assert.match(ABOUT_PANEL_CSS, /--source-paper:#191c22/, 'The source uses the actual public Library paper');
});
