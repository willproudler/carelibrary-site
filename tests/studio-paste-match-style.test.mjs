import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';

const editor = readFileSync(new URL('../native/writing-editor.mjs', import.meta.url), 'utf8');
const start = editor.indexOf('function insertWritingMatchStyle(');
const end = editor.indexOf('const writeBesidePanelOwners', start);
assert.ok(start >= 0 && end > start);

function fixture(readText) {
  const listeners = new Map();
  const field = {};
  const range = {cloneRange: () => range};
  const edits = [];
  const focus = [];
  const messages = [];
  const runtime = {
    docId: 'draft-one',
    root: {isConnected: true},
    controller: new AbortController(),
    paper: {
      contentEditable: 'true',
      contains: node => node === field,
      ownerDocument: {
        addEventListener: (name, callback) => listeners.set(name, callback),
        defaultView: {navigator: {clipboard: {readText}}},
      },
    },
  };
  const {installWritingPasteMatch, pasteWritingAndMatchStyle} = runInNewContext(
    editor.slice(start, end) + '\n({installWritingPasteMatch, pasteWritingAndMatchStyle})',
    {
      clipboardTarget: runtime => ({documentId: runtime.docId, range}),
      currentClipboardTarget: (runtime, target) => runtime.docId === target.documentId,
      rangeInPaper: (_paper, value) => value === range,
      selectedFootnotes: () => [],
      restoreSelection: (_runtime, value) => {
        focus.push(value);
        return value;
      },
      status: (_runtime, message) => messages.push(message),
      insertClipboard: (_runtime, target, text) => edits.push([target.range, text]),
    },
  );
  installWritingPasteMatch(runtime);
  const paste = (target = field) => {
    const event = {
      target,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
      clipboardData: {
        getData(type) {
          assert.equal(type, 'text/plain');
          return 'Plain text\r\nSecond line';
        },
      },
    };
    listeners.get('paste')(event);
    return event;
  };
  return {runtime, range, edits, focus, messages, listeners, paste, invoke: () => pasteWritingAndMatchStyle(runtime)};
}

test('Paste and Match Style uses the browser clipboard at the saved caret', async () => {
  const studio = fixture(async () => 'Literal <b>text</b>\r\nSecond line');
  await studio.invoke();
  assert.deepEqual(studio.edits, [[studio.range, 'Literal <b>text</b>\nSecond line']]);
  assert.deepEqual(studio.messages, []);
  assert.equal(studio.paste().defaultPrevented, undefined);
});

test('permission denial falls back to a single plain paste inside the editor', async () => {
  const studio = fixture(async () => { throw Error('Clipboard permission denied'); });
  await studio.invoke();
  assert.deepEqual(studio.focus, [studio.range]);
  assert.match(studio.messages[0], /at the cursor/);
  const event = studio.paste();
  assert.equal(event.defaultPrevented, true);
  assert.equal(event.stopped, true);
  assert.deepEqual(studio.edits, [[studio.range, 'Plain text\nSecond line']]);
  assert.equal(studio.paste().defaultPrevented, undefined);
});

test('a draft switch or pointer gesture cancels a pending clipboard read', async () => {
  for (const cancel of [
    ({runtime}) => { runtime.docId = 'draft-two'; },
    ({listeners}) => listeners.get('pointerdown')(),
  ]) {
    let resolve;
    const studio = fixture(() => new Promise(done => { resolve = done; }));
    const pending = studio.invoke();
    cancel(studio);
    resolve('Clipboard result for the previous editing position');
    await pending;
    assert.deepEqual(studio.edits, []);
    assert.equal(studio.paste().defaultPrevented, undefined);
  }
});
