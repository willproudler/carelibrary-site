import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAq, libraryReturnContext, resolveLanguageTarget, measureTextNode, visibleTextRoots } from '../tools/source_reader_runtime.mjs';

test('CCRU AQ uses digits 0–9 and A10–Z35, with actual zero distinct from no symbols', () => {
  assert.equal(calculateAq('CCRU'), 81);
  assert.equal(calculateAq('abcdefghijklmnopqrstuvwxyz'), 585);
  assert.equal(calculateAq('0123456789'), 45);
  assert.equal(calculateAq('0'), 0);
  assert.equal(calculateAq('—!?'), null);
  assert.equal(calculateAq(''), null);
});

test('AQ applies the specified Unicode normalization without inventing transliterations', () => {
  assert.equal(calculateAq('é'), 14);
  assert.equal(calculateAq('e\u0301'), 14);
  assert.equal(calculateAq('ß'), 56);
  assert.equal(calculateAq('Ａ９'), 19);
  assert.equal(calculateAq('𝔄'), 10);
  assert.equal(calculateAq('αβ 中文 שלום'), null);
  assert.equal(calculateAq('œæ'), null);
});

test('return context is explicit and strict', () => {
  assert.equal(libraryReturnContext('?from=library'), true);
  assert.equal(libraryReturnContext('?other=value&from=library'), true);
  for (const query of ['', '?from=Library', '?from=libraryish', '?referrer=library', '?from=', '?from=other&from=library']) {
    assert.equal(libraryReturnContext(query), false);
  }
});

test('language choices stay on the same origin and preserve explicit library context', () => {
  const base = 'https://carelibrary.org/book?from=library';
  assert.equal(resolveLanguageTarget('/book?language=fr', base, true), 'https://carelibrary.org/book?language=fr&from=library');
  assert.equal(resolveLanguageTarget('/book?language=fr', base), 'https://carelibrary.org/book?language=fr');
  for (const value of ['https://example.org/book', '//example.org/book', 'javascript:alert(1)', 'data:text/html,test', 'http://carelibrary.org/book']) {
    assert.equal(resolveLanguageTarget(value, base, true), null);
  }
  assert.equal(resolveLanguageTarget('preview-fr.html', 'file:///tmp/preview.html', true), 'file:///tmp/preview-fr.html?from=library');
  assert.equal(resolveLanguageTarget('https://example.org', 'file:///tmp/preview.html'), null);
  assert.equal(resolveLanguageTarget('file:///etc/private', 'file:///tmp/preview.html'), null);
});

function visualTextNode(text, columns, { left = 0, rtl = false } = {}) {
  const rect = index => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = left + (rtl ? columns - 1 - column : column) * 10;
    return { top: row * 24, bottom: row * 24 + 20, height: 20, left: x, right: x + 10, width: 10 };
  };
  const node = { nodeValue: text };
  node.ownerDocument = { createRange() {
    let start = 0, end = 0;
    return {
      setStart(value, offset) { assert.equal(value, node); start = offset; },
      setEnd(value, offset) { assert.equal(value, node); end = offset; },
      getClientRects() {
        const rows = new Map();
        for (let index = start; index < end; index += 1) {
          const item = rect(index), key = item.top;
          const prior = rows.get(key);
          rows.set(key, prior ? { ...prior, left: Math.min(prior.left, item.left), right: Math.max(prior.right, item.right) } : item);
        }
        return [...rows.values()];
      },
    };
  } };
  return node;
}

test('visual rows split an unbroken token at rendered wraps without editing its text node', () => {
  const node = visualTextNode('ABCDEFGHIJKL', 4);
  const lines = measureTextNode(node, { top: -10, bottom: 100 });
  assert.deepEqual(lines.map(line => line.text), ['ABCD', 'EFGH', 'IJKL']);
  assert.deepEqual(lines.map(line => calculateAq(line.text)), [46, 62, 78]);
  assert.equal(node.nodeValue, 'ABCDEFGHIJKL');
});

test('line measurement limits itself to the requested vertical slice and handles RTL positions', () => {
  const text = '0123456789'.repeat(500);
  const node = visualTextNode(text, 10, { rtl: true });
  const lines = measureTextNode(node, { top: 24 * 100, bottom: 24 * 102 + 20 });
  assert.deepEqual(lines.map(line => line.text), ['0123456789', '0123456789', '0123456789']);
  assert.equal(lines[0].top, 2400);
  assert.ok(lines.every(line => calculateAq(line.text) === 45));
  assert.equal(node.nodeValue, text);
});

test('a chapter with 50,000 passages measures only a logarithmic search and nearby blocks', () => {
  let layoutReads = 0;
  const overlay = { overlay: true };
  const host = { children: {
    length: 50001,
    item(index) {
      if (index === 50000) return overlay;
      return { index, matches: value => value === '.source-passage', getBoundingClientRect() {
        layoutReads += 1;
        return { top: index * 100, bottom: index * 100 + 80 };
      } };
    },
  } };
  const roots = visibleTextRoots(host, { top: 2000000, bottom: 2000380 }, overlay);
  assert.deepEqual(roots.map(root => root.index), [20000, 20001, 20002, 20003]);
  assert.ok(layoutReads < 40, `Only ${layoutReads} layout reads should cover nearby passages`);
});
