import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function helperSource(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  return source.slice(source.indexOf('function axiomCopyAttributes('), source.indexOf('function renderStudyDesk('));
}

function fixture(source, kind = 'axiom') {
  const listeners = new Map();
  let selection = { isCollapsed: true, toString: () => '' };
  const cardSelector = '[data-select-axiom],[data-select-passage],[data-open-item]';
  const card = { contains: node => [card, text, code].includes(node), closest: selector => selector === cardSelector ? card : null };
  const controlSelector = 'a[href],button,input,textarea,select,summary,[contenteditable="true"]';
  const text = { closest: selector => selector === cardSelector ? card : selector === controlSelector ? null : selector.startsWith('[data-reader-code],.axiom-text') ? text : null, setAttribute() {}, removeAttribute() {} };
  const code = { ...text, closest: selector => selector === cardSelector ? card : selector === controlSelector ? null : selector.startsWith('[data-reader-code]') ? code : null };
  const control = { closest: () => null };
  const scroller = { contains: node => node === card };
  const root = {
    contains: node => [card, text, code].includes(node), getRootNode: () => ({}),
    ownerDocument: {
      defaultView: { getSelection: () => selection },
      createTreeWalker: () => { let used = false; return { currentNode: { textContent: 'The axiom text', parentElement: { closest: () => null } }, nextNode() { if (used) return false; used = true; return true; } }; },
      createRange: () => ({ selectNodeContents() {}, getClientRects: () => [{ left: 0, right: 250, top: 0, bottom: 50 }] }),
    },
    addEventListener(name, handler) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(handler); },
    removeEventListener(name, handler) { const remaining = (listeners.get(name) || []).filter(item => item !== handler); if (remaining.length) listeners.set(name, remaining); else listeners.delete(name); },
  };
  const context = vm.createContext({ root, Date, Math });
  vm.runInContext(source + '\nthis.dispose=setupAxiomCopy({root});', context);
  let selected = 0, prevented = 0;
  const fire = (type, extra = {}) => {
    let stopped = false;
    const event = { type, target: text, detail: 1, pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 20, clientY: 20, timeStamp: 100, preventDefault() { prevented++; }, stopImmediatePropagation() { stopped = true; }, ...extra };
    for (const listener of [...(listeners.get(type) || [])]) { listener(event); if (stopped) break; }
    if (type === 'click' && !stopped && event.target.closest(cardSelector)) selected++;
    return stopped;
  };
  const tap = (target = text, extra = {}) => { fire('pointerdown', { target, ...extra }); fire('pointerup', { target, timeStamp: 180, ...extra }); return fire('click', { target, timeStamp: 185, ...extra }); };
  return { fire, tap, text, code, control, scroller, root, kind, get selected() { return selected; }, get prevented() { return prevented; }, set selection(value) { selection = value; }, cleanup() { context.dispose(); assert.equal(listeners.size, 0); } };
}

for (const reader of ['study-desk', 'study-field']) {
  const source = helperSource(`../native/${reader}.mjs`);
  test(`${reader}: a finger tap selects prose and metadata on the first attempt`, () => {
    const f = fixture(source);
    f.fire('pointerdown'); assert.equal(f.selected, 0, 'Nothing activates before release');
    f.fire('pointerup', { timeStamp: 180 }); f.fire('click', { timeStamp: 185 });
    assert.equal(f.selected, 1);
    f.tap(f.code); assert.equal(f.selected, 2, 'The code is no longer a dead tap target');
    f.selection = { isCollapsed: false, anchorNode: f.text, anchorOffset: 0, focusNode: f.text, focusOffset: 4, toString: () => 'old selection' };
    f.tap(); assert.equal(f.selected, 3, 'An unchanged earlier selection does not swallow the next tap');
    assert.equal(f.prevented, 0); f.cleanup();
  });

  test(`${reader}: scrolling, cancelled touches, long press and pinch never select a card`, () => {
    const f = fixture(source);
    f.fire('pointerdown'); f.fire('pointermove', { clientY: 45 }); f.fire('pointerup', { timeStamp: 180 }); f.fire('click', { timeStamp: 185 });
    f.fire('pointerdown'); f.fire('scroll', { target: f.scroller }); f.fire('pointerup', { timeStamp: 180 }); f.fire('click', { timeStamp: 185 });
    f.fire('pointerdown'); f.fire('pointercancel'); f.fire('click', { timeStamp: 185 });
    f.fire('pointerdown'); f.fire('pointerup', { timeStamp: 2100 }); f.fire('click', { timeStamp: 2105 });
    f.fire('pointerdown'); f.fire('contextmenu'); f.fire('pointerup', { timeStamp: 180 }); f.fire('click', { timeStamp: 185 });
    f.fire('pointerdown'); f.fire('pointerdown', { pointerId: 2, isPrimary: false }); f.fire('pointerup', { timeStamp: 180 }); f.fire('click', { timeStamp: 185 });
    assert.equal(f.selected, 0); assert.equal(f.prevented, 0, 'Native scrolling and text menus are not prevented');
    f.tap(); assert.equal(f.selected, 1, 'The next deliberate tap works after a cancelled gesture'); f.cleanup();
  });

  test(`${reader}: new text selections and mouse copying are preserved`, () => {
    const f = fixture(source);
    f.fire('pointerdown');
    f.selection = { isCollapsed: false, anchorNode: f.text, anchorOffset: 0, focusNode: f.text, focusOffset: 8, toString: () => 'selected' };
    f.fire('pointerup', { timeStamp: 180 }); f.fire('click', { timeStamp: 185 });
    assert.equal(f.selected, 0);
    f.tap(f.code, { pointerType: 'mouse' }); assert.equal(f.selected, 0, 'Mouse text interaction stays native');
    assert.equal(f.prevented, 0); f.cleanup();
  });
}
