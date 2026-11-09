import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {draftReaderHtml} from '../native-draft-reader.mjs';

test('Reader only allows same-origin frames for its enabled Library companion', () => {
  const packet = {title: 'Private draft', documents: []};
  assert.match(draftReaderHtml(packet, {token: 'test-secret', library: true}), /frame-src 'self'/);
  assert.doesNotMatch(draftReaderHtml(packet, {token: 'test-secret'}), /frame-src/);
});
import assets from '../native/writing-reader-assets.mjs';

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
