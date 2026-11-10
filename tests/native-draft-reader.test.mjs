import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {draftReaderHtml, mountNativeDraftReader} from '../native-draft-reader.mjs';
import assets, {rememberWritingModePosition, takeWritingModePosition} from '../native/writing-reader-assets.mjs';

test('Reader only allows same-origin frames for its enabled Library companion', () => {
  const packet = {title: 'Private draft', documents: []};
  assert.match(draftReaderHtml(packet, {token: 'test-secret', library: true}), /frame-src 'self'/);
  assert.doesNotMatch(draftReaderHtml(packet, {token: 'test-secret'}), /frame-src/);
});

test('the private copy embeds the exact versioned Reader assets', () => {
  const manifest = JSON.parse(readFileSync(new URL('../native/writing-reader-version.json', import.meta.url)));
  for (const [name, value] of Object.entries(assets)) {
    assert.equal(createHash('sha256').update(value).digest('hex'), manifest.assets[name]);
  }
  const html = draftReaderHtml({title: 'My private draft', documents: []}, {token: 'test-secret'});
  assert.ok(html.includes(assets.css));
  assert.ok(html.includes(assets.js));
  assert.match(html, /script-src 'nonce-test-secret'/);
  assert.match(html, /<script nonce="test-secret">/);
});

test('the beta Reader offers page layout next to zoom and keeps review in the Librarian', () => {
  const html = draftReaderHtml({title: 'Draft', documents: []}, {token: 'test-secret'});
  const tools = html.match(/<div[^>]+id="reader-zoom"[^>]*>(.*?)<\/details>\s*<\/div>/s)?.[1];
  assert.match(tools, /data-zoom-level="fit"/);
  assert.match(tools, /id="reader-format"/);
  assert.match(tools, /data-reader-layout="paper"/);
  assert.match(tools, /data-reader-layout="continuous"/);
  const librarian = html.match(/<div[^>]+id="reader-tools"[^>]*>(.*?)<\/header>/s)?.[1];
  assert.match(librarian, /id="toggle-margin"/);
  assert.match(librarian, /id="download"/);
});

test('a manuscript cannot add executable markup to its Reader copy', () => {
  const payload = `</script><script>window.parent.stolen = true</script><img src="x" onerror="alert(1)">`;
  const packet = {title: payload, documents: [{title: payload, blocks: [{html: payload, text: payload}]}]};
  const html = draftReaderHtml(packet, {token: 'test-secret', reviewer: payload});
  assert.ok(!html.includes(payload));
  assert.doesNotMatch(html, /<img src="x"/);
  assert.equal(html.match(/<script(?=[ >])/g).length, 3);
  const packetJson = html.match(/id="care-reader-packet">(.*?)<\/script>/s)[1];
  assert.deepEqual(JSON.parse(packetJson), packet);
  assert.throws(() => draftReaderHtml(packet, {token: 'x" onload="alert(1)'}), /host token/);
});

test('switching draft modes carries the visible paragraph and fit zoom both ways', async () => {
  const view = {crypto: globalThis.crypto, addEventListener() {}, removeEventListener() {}};
  const fit = {preference: 'fit', percent: 83};
  const studioBlock = {getAttribute: () => 'same-block',
    getBoundingClientRect: () => ({top: 40, bottom: 140, height: 100})};
  rememberWritingModePosition(view, 'reader', 'draft-one', {scrollTop: 100},
    [studioBlock], 'data-block-id', {top: 65, zoom: fit});
  assert.equal(takeWritingModePosition(view, 'reader', 'another-draft'), null);

  const scrollingElement = {scrollTop: 0};
  const block = {dataset: {reviewBlock: 'same-block'}, getAttribute: () => 'same-block',
    getBoundingClientRect() {
      const top = 900 - scrollingElement.scrollTop;
      return {top, bottom: top + 100, height: 100};
    }};
  let zoom;
  const frame = {style: {}, setAttribute() {}, remove() {},
    contentDocument: {scrollingElement, querySelectorAll: () => [block],
      body: {classList: {contains: name => name === 'reader-in-app'}}},
    contentWindow: {careReaderDocumentZoom: {snapshot: () => zoom, restore: value => { zoom = value; }}},
    addEventListener(type, callback) { this[type] = callback; },
  };
  const blank = {nodeType: 1, localName: 'p', textContent: '', outerHTML: '<p><br></p>',
    childNodes: [], getAttribute: () => null, append(node) { this.childNodes.push(node); }};
  const status = {setAttribute() {}, remove() {}};
  let paragraphCount = 0;
  const ownerDocument = {defaultView: view, createElement(tag) {
    if (tag === 'template') return {content: {querySelectorAll: () => [], childNodes: []}};
    if (tag === 'iframe') return frame;
    if (tag === 'br') return {nodeType: 1, localName: 'br'};
    return paragraphCount++ === 0 ? status : blank;
  }};
  const reader = mountNativeDraftReader({ownerDocument, append(node) { if (node === frame) frame.load(); }},
    {draft: {id: 'draft-one', title: 'Draft', body: '', revision: 1}});

  assert.equal(await reader.ready, true);
  assert.equal(scrollingElement.scrollTop, 925);
  assert.deepEqual(zoom, fit);
  scrollingElement.scrollTop = 950;
  zoom = {preference: '120', percent: 120};
  reader.rememberStudioPosition();
  const incoming = takeWritingModePosition(view, 'studio', 'draft-one');
  assert.equal(incoming.block, 'same-block');
  assert.equal(incoming.ratio, .5);
  assert.deepEqual(incoming.zoom, zoom);
  assert.equal(takeWritingModePosition(view, 'studio', 'draft-one'), null);
  reader.destroy();
});
