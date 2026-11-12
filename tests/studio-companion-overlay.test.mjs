import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createNumoCompanion, numogramCompanionLayout} from '../native/numogram-companion.mjs';

class Element {
  constructor() {
    this.children = []; this.dataset = {}; this.attributes = new Map(); this.listeners = new Map();
    this.style = {values: new Map(), setProperty(name, value) {this.values.set(name, value);}};
  }
  append(...nodes) {
    for (const node of nodes) {
      if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1);
      node.parentNode = this; this.children.push(node);
    }
  }
  replaceChildren(...nodes) {this.children = []; this.append(...nodes);}
  querySelector(selector) {return this.queries?.[selector] || null;}
  querySelectorAll(selector) {return this.queryLists?.[selector] || [];}
  closest(selector) {return selector === 'button' && this.tagName === 'BUTTON' ? this : null;}
  setAttribute(name, value) {this.attributes.set(name, String(value));}
  addEventListener(name, handler) {
    const group = this.listeners.get(name) || []; group.push(handler); this.listeners.set(name, group);
  }
  removeEventListener(name, handler) {this.listeners.set(name, (this.listeners.get(name) || []).filter(value => value !== handler));}
  dispatchEvent(event) {for (const handler of this.listeners.get(event.type) || []) handler(event); return true;}
  focus() {this.focused = true;}
}

function fixture() {
  const doc = new Element(), body = doc.body = new Element();
  const win = doc.defaultView = new Element();
  win.CustomEvent = class {constructor(type, options = {}) {this.type = type; this.detail = options.detail;}};
  const observed = [];
  win.MutationObserver = win.ResizeObserver = class {
    constructor(callback) {this.callback = callback; observed.push(this);}
    observe(node) {this.node = node;}
    unobserve() {} disconnect() {this.disconnected = true;}
  };
  let fullscreen = false;
  doc.documentElement = {hasAttribute: () => fullscreen};
  doc.createElement = tag => Object.assign(new Element(), {tagName: tag.toUpperCase()});
  const host = new Element(); host.ownerDocument = doc;
  const page = new Element(); body.append(page); page.append(host);
  const panel = new Element(), map = new Element(), finder = new Element(), input = new Element();
  const resume = doc.createElement('button'), close = doc.createElement('button'), minimize = doc.createElement('button');
  resume.dataset.action = 'resume'; close.dataset.action = 'close'; minimize.dataset.action = 'minimize';
  const margins = new Element(), form = new Element(), search = new Element();
  finder.queries = {'input': input, 'form': form};
  host.queries = {'aside': panel, '[data-action="resume"]': resume, '.numo-companion-instrument': map,
    '.numo-companion-draft': finder, '[data-numo-lines]': new Element(), '[data-numo-status]': new Element(),
    '[data-action="margins"]': margins, '.numo-companion-search': search};
  const toolbar = new Element(); toolbar.getBoundingClientRect = () => ({bottom: 46});
  const editor = new Element(); editor.queries = {'[data-formatting]:not([hidden])': toolbar};
  const native = {shadowRoot: {querySelector: () => editor}};
  const workspace = new Element(); workspace.queries = {'.studio-web__native-editor': native};
  workspace.getBoundingClientRect = () => ({top: 116, left: 0, width: 1200, height: 600});
  doc.queries = {'#studio-workspace': workspace, '.care-numo-companion': host};
  return {doc, win, host, body, page, panel, map, resume, close, minimize, toolbar, workspace, observed,
    fullscreen(value) {fullscreen = value;}};
}

test('NUMO opens over a fixed draft in both writing modes and resumes the same loaded map', async () => {
  const f = fixture(); let mounts = 0, unmounts = 0, beforeOpen = 0;
  const draft = {html: '<p data-block-id="one">Unsaved writing.</p>', caret: ['one', 8], scrollTop: 824, width: 793, left: 160};
  const before = structuredClone(draft);
  const companion = createNumoCompanion(f.host, {
    loadNumogram: async () => ({default: () => {mounts++; return {openReference() {}, unmount() {unmounts++;}};}}),
    draftLines: () => [], showAQMargins: () => () => {}, beforeOpen: () => {beforeOpen++;},
  });
  const loaded = () => new Promise(resolve => setImmediate(resolve));
  assert.equal(f.host.parentNode, f.body, 'Only the overlay leaves the page stacking context');
  companion.setVisible(true, 'studio:draft');
  const editorTools = new Element(); editorTools.append(f.host.careNumoResume);
  assert.equal(f.resume.hidden, false); assert.equal(f.resume.attributes.get('aria-label'), 'Open NUMO');
  f.resume.onclick(); await loaded();
  assert.equal(f.panel.hidden, false); assert.equal(mounts, 1);
  assert.equal(f.host.style.values.get('--numo-dock-top'), '116px');
  assert.deepEqual(draft, before, 'Opening NUMO does not resize, scroll or rewrite the document');
  f.host.dispatchEvent({type: 'click', target: f.minimize});
  assert.equal(f.panel.hidden, true); assert.equal(unmounts, 0, 'Minimizing retains the loaded map');
  assert.equal(f.resume.attributes.get('aria-label'), 'Resume NUMO');
  f.fullscreen(true);
  f.resume.onclick(); await loaded();
  assert.equal(f.panel.hidden, false); assert.equal(mounts, 1);
  assert.equal(f.host.style.values.get('--numo-dock-top'), '46px', 'The overlay clears the writing toolbar');
  assert.equal(f.doc.documentElement.hasAttribute('data-care-writing-fullscreen'), true);
  f.doc.dispatchEvent(new f.win.CustomEvent('care:numogram-companion-minimize'));
  assert.equal(f.panel.hidden, true, 'Escape can tuck NUMO away without leaving writing view');
  assert.equal(f.doc.documentElement.hasAttribute('data-care-writing-fullscreen'), true);
  f.resume.onclick(); await loaded();
  f.host.dispatchEvent({type: 'click', target: f.close});
  assert.equal(f.panel.hidden, true); assert.equal(unmounts, 1);
  assert.equal(f.resume.hidden, false); assert.equal(f.resume.attributes.get('aria-label'), 'Open NUMO');
  assert.deepEqual(draft, before);
  assert.equal(beforeOpen, 3);
  companion.destroy();
  assert(f.observed.every(observer => observer.disconnected));
});

test('companion placement follows writing geometry without changing the workspace', () => {
  const f = fixture(), bounds = f.workspace.getBoundingClientRect();
  assert.deepEqual(numogramCompanionLayout(f.doc), {toolbar: null, top: 116});
  f.fullscreen(true);
  assert.deepEqual(numogramCompanionLayout(f.doc), {toolbar: f.toolbar, top: 46});
  assert.deepEqual(f.workspace.getBoundingClientRect(), bounds);
  const css = readFileSync(new URL('../native/numogram-companion.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /numo-split-width|#studio-workspace\s*\{/);
  assert.match(css, /position: fixed; z-index: 54/);
  assert.match(css, /html\[data-care-writing-fullscreen\][\s\S]*z-index: 999982/);
  assert.match(css, /background: #000/);
});

function nativeFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, name);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

test('the native Library companion opens its app entry from clean book and chapter URLs', () => {
  const source = readFileSync(new URL('../native/writing-editor.mjs', import.meta.url), 'utf8');
  for (const path of [
    '/library.html#view=studio&draft=saved-draft',
    '/books/a-treatise-of-human-nature-david-hume/001-introduction/#view=studio&draft=saved-draft',
    '/a-treatise-of-human-nature/001-introduction/?from=search#view=studio&draft=saved-draft',
  ]) {
    const window = {location: new URL(path, 'https://care.example')};
    const functions = new Function('window', nativeFunction(source, 'libraryBase') + '\n' +
      nativeFunction(source, 'libraryFrameLocation') + '\nreturn {libraryBase, libraryFrameLocation};')(window);
    const url = functions.libraryBase();
    assert.equal(url.href, 'https://care.example/library.html');
    url.searchParams.set('view', 'library');
    url.searchParams.set('care_studio_embed', '1');
    url.searchParams.set('care_studio_request', 'saved-request');
    url.searchParams.set('care_studio_pane_reading', '1');
    const frame = {contentWindow: {location: url}};
    assert.equal(functions.libraryFrameLocation(frame, 'saved-request')?.view, 'library');
    assert.equal(functions.libraryFrameLocation(frame, 'another-request'), null);
    frame.contentWindow.location = new URL(url.href.replace('care.example', 'other.example'));
    assert.equal(functions.libraryFrameLocation(frame, 'saved-request'), null);
    assert.equal(window.location.href, new URL(path, 'https://care.example').href, 'Opening a companion preserves the draft route');
  }
});

test('the Library ready handshake reveals only the requested same-origin companion', () => {
  const source = readFileSync(new URL('../native/writing-editor.mjs', import.meta.url), 'utf8');
  const child = {}, frame = {contentWindow: child, removeAttribute() {}}, previous = {remove() {this.removed = true;}};
  const dock = {request: 'saved-request'}, pending = {dock, frame};
  const runtime = {libraryRequest: dock.request, libraryFrameRequest: '', libraryPending: pending,
    libraryFrame: previous, libraryLoading: {hidden: false}};
  const handle = new Function('window', 'paintLibraryDockHeading', 'updateWritingSearchWork', 'paintResults', 'paintDraftReview',
    nativeFunction(source, 'finishLibraryFrame') + '\n' + nativeFunction(source, 'handleLibraryFrameMessage') +
    '\nreturn handleLibraryFrameMessage;')({location: {origin: 'https://care.example'}}, () => {}, () => {}, () => {}, () => {});
  const ready = {type: 'care-studio-reader-ready', request: dock.request};
  handle(runtime, {origin: 'https://other.example', source: child, data: ready});
  handle(runtime, {origin: 'https://care.example', source: {}, data: ready});
  handle(runtime, {origin: 'https://care.example', source: child, data: {...ready, request: 'another-request'}});
  assert.equal(runtime.libraryFrame, previous);
  assert.equal(runtime.libraryLoading.hidden, false);
  handle(runtime, {origin: 'https://care.example', source: child, data: ready});
  assert.equal(runtime.libraryFrame, frame);
  assert.equal(runtime.libraryFrameRequest, dock.request);
  assert.equal(runtime.libraryPending, null);
  assert.equal(runtime.libraryLoading.hidden, true);
  assert.equal(previous.removed, true);
  assert.equal(frame.inert, false);
});

test('the actual native Library action preserves fullscreen, draft and scroll while opening its frame', () => {
  const source = readFileSync(new URL('../native/writing-editor.mjs', import.meta.url), 'utf8');
  const actions = [], doc = new Element(); doc.defaultView = {CustomEvent: class {constructor(type, {detail}) {this.type = type; this.detail = detail;}}};
  const control = {}, classes = new Map(), frame = {};
  const runtime = {writingFullscreen: true, docId: 'draft', libraryRequest: '', libraryFrameRequest: '',
    libraryDock: {querySelector: () => control}, libraryFrame: frame, librarySourceRequests: new Set(),
    root: {ownerDocument: doc, classList: {toggle: (name, value) => classes.set(name, value)}},
    draft: {html: '<p>Unsent text.</p>', caret: 14, scrollTop: 800}};
  const before = structuredClone(runtime.draft);
  const setup = new Function('libraryBase', 'stageLibraryFrame', 'paintLibraryDockHeading', 'finishLibraryFrame',
    'setWritingFullscreen', nativeFunction(source, 'updateLibraryDockVisibility') + '\n' + nativeFunction(source, 'paintLibraryDock') + '\nreturn paintLibraryDock;');
  const open = setup(() => new URL('https://care.example/library.html'), (_runtime, _dock, url) => actions.push(url), () => {}, () => {},
    () => {throw new Error('Opening a Library overlay must never leave writing view');});
  open(runtime, {request: 'local-open', route: {view: 'library'}, fragment: '#book=kant'});
  assert.equal(runtime.writingFullscreen, true);
  assert.equal(runtime.libraryDock.hidden, false); assert.equal(runtime.libraryDock.inert, false);
  assert.equal(classes.get('library-open'), true);
  assert.equal(actions[0].hash, '#book=kant');
  assert.deepEqual(runtime.draft, before);
  const css = readFileSync(new URL('../native/writing-editor.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\[data-writing-fullscreen\]\s+:is\(\.library-dock[^}]+visibility:\s*hidden/);
  assert.doesNotMatch(css, /\.studio\.library-open\s+\.writing-a4-pages\s*\{/, 'Opening the overlay must not change the paper offset');
});

test('the actual native Escape helper minimizes companions before exiting writing view', () => {
  const source = readFileSync(new URL('../native/writing-editor.mjs', import.meta.url), 'utf8');
  const actions = [], doc = new Element(); doc.defaultView = {CustomEvent: class {constructor(type) {this.type = type;}}};
  doc.queries = {'.care-numo-companion': {careNumoDockState: {mode: 'open'}}};
  doc.addEventListener('care:numogram-companion-minimize', () => actions.push('numo'));
  const helper = new Function('setLibraryMinimized', 'setLibraryExpanded',
    nativeFunction(source, 'minimizeWritingFullscreenCompanion') + '\nreturn minimizeWritingFullscreenCompanion;')(
    (_runtime, minimized) => actions.push(['library', minimized]), () => assert.fail('No expanded Library'));
  const runtime = {writingFullscreen: true, libraryRequest: 'open-library', libraryMinimized: false, root: {ownerDocument: doc}};
  assert.equal(helper(runtime), true); assert.deepEqual(actions, [['library', true]]);
  runtime.libraryRequest = '';
  assert.equal(helper(runtime), true); assert.deepEqual(actions, [['library', true], 'numo']);
  assert.equal(runtime.writingFullscreen, true);
  const keyboard = source.slice(source.indexOf('on(document, "keydown", event => {'), source.indexOf('on(window, "beforeunload", event => {'));
  assert(keyboard.indexOf('minimizeWritingFullscreenCompanion(runtime)') < keyboard.indexOf('setWritingFullscreen(runtime, false)'));
});

test('the Beta Library command keeps its mounted editor and document route', () => {
  const source = readFileSync(new URL('../studio-workspace.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('  function openLibrary('), end = source.indexOf('\n  function minimizeLibrary(', start);
  const doc = new Element(), events = [], renders = [];
  doc.addEventListener('care:library-companion-open', () => events.push('library'));
  const root = {querySelector: () => null}, mounted = {root};
  const draft = {id: 'draft', html: '<p>Still typing.</p>', scrollTop: 800};
  const view = {location: {hash: '#view=studio&draft=draft'}, CustomEvent: class {constructor(type) {this.type = type;}}};
  const open = new Function('host', 'mounted', 'active', 'reader', 'doc', 'win', 'studioLibraryFragment', 'renderEditor',
    `let libraryDock=null;function setLibraryDock(fragment){libraryDock={fragment};}\n${source.slice(start, end)}\nreturn openLibrary;`)(
    {hidden: false}, mounted, draft, null, doc, view, value => value, () => renders.push(mounted));
  assert.equal(open('#book=kant'), true);
  assert.deepEqual(events, ['library']); assert.deepEqual(renders, [mounted]);
  assert.equal(mounted.root, root);
  assert.equal(view.location.hash, '#view=studio&draft=draft');
  assert.deepEqual(draft, {id: 'draft', html: '<p>Still typing.</p>', scrollTop: 800});
});
