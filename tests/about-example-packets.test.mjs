import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';

async function shippedExamples() {
  const html = await readFile(new URL('../about.html', import.meta.url), 'utf8');
  const script = html.match(/<script\b[^>]*\bid=["']about-panel-data["'][^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(script, 'The public About page ships its intentional native examples.');
  const data = JSON.parse(script[1]);
  assert.equal(data.schema, 'care-about-panels/1');
  return data;
}
function nativeExplorer(panel) {
  assert.equal(panel.explorer.format, 'care-about-native-explorer/1');
  assert.equal(panel.explorer.encoding, 'object-intern-gzip/1');
  const bytes = gunzipSync(Buffer.from(panel.explorer.gzip, 'base64'));
  assert.equal(bytes.length, panel.explorer.uncompressed_bytes);
  const explorer = JSON.parse(bytes), memo = new Map();
  function inflate(value) {
    if (!value || typeof value !== 'object') return value;
    if (Object.keys(value).length === 1 && Object.hasOwn(value, '$aboutRef')) {
      const id = value.$aboutRef;
      assert.ok(Object.hasOwn(explorer.shared, id), 'Every shared native record resolves.');
      if (!memo.has(id)) memo.set(id, inflate(explorer.shared[id]));
      return memo.get(id);
    }
    return Array.isArray(value) ? value.map(inflate) : Object.fromEntries(Object.entries(value).map(([key, row]) => [key, inflate(row)]));
  }
  return {explorer, inflate};
}
const claims = unit => (unit.sections || []).flatMap(section => section.items || []);

test('About examples contain complete initial saved source and CARE units', async () => {
  const data = await shippedExamples();
  assert.deepEqual(Object.keys(data.panels).sort(), ['kant', 'lateral', 'metaphysics']);
  for (const panel of Object.values(data.panels)) {
    const unit = panel.chapter.stack.care_path[0];
    assert.equal(claims(unit).length, panel.provenance.chapter?.full_item_count ?? panel.provenance.full_item_count);
    assert.ok(unit.sections.length > 2, 'The actual full saved sheet remains available to expand.');
    for (const section of panel.provenance.chapter?.selected_sections || panel.provenance.selected_sections) assert.equal(section.shown, section.total);
    if (panel.source) assert.equal(panel.source.stack.active_chapter.passages.length, panel.provenance.source.full_passage_count);
  }
});

test('Every native slider target and shown claim has an included real packet or viewer card', async () => {
  for (const panel of Object.values((await shippedExamples()).panels)) {
    const {explorer, inflate} = nativeExplorer(panel);
    for (const encoded of [...Object.values(explorer.sources), ...Object.values(explorer.sheets)]) {
      const payload = inflate(encoded);
      assert.equal(payload.mode, 'workspace');
      for (const option of payload.stack.chapters || []) assert.ok(explorer.sources[option.raw_unit_id || option.id]);
      for (const option of Object.values(payload.stack.sheet_options || {}).flat()) assert.ok(explorer.sheets[option.id]);
      for (const unit of payload.stack.care_path || []) for (const item of claims(unit)) assert.ok(explorer.references[item.id], 'A displayed claim can open its actual native viewer.');
    }
    for (const [id, encoded] of Object.entries(explorer.references)) {
      const card = inflate(encoded), destination = new URL(card.destination, 'https://carelibrary.org');
      assert.equal(card.id, id);
      assert.equal(destination.pathname, '/library.html');
      assert.equal(new URLSearchParams(destination.hash.slice(1)).get('ref'), id, 'Unprepared deeper routes retain an exact Library continuation.');
    }
  }
});

test('Prepared routes keep native root identities and directions without mutating shared saved data', async () => {
  let routeCount = 0;
  for (const panel of Object.values((await shippedExamples()).panels)) {
    const {explorer, inflate} = nativeExplorer(panel);
    for (const [id, modes] of Object.entries(explorer.routes)) for (const [mode, encoded] of Object.entries(modes)) {
      const payload = inflate(encoded);
      assert.equal(payload.reference.id, id);
      assert.equal(payload.selected_reference_id, id);
      assert.ok(payload.reference.route_layers);
      assert.ok(Array.isArray(payload.reference.route_edges));
      assert.ok(explorer.references[id]);
      if (!panel.provenance.field_id) assert.equal(payload.route_mode, mode);
      else assert.equal(mode, 'incoming', 'Preserved incoming routes do not invent other directions.');
      routeCount++;
    }
    const original = inflate(Object.values(explorer.sheets)[0]);
    const resettable = structuredClone(original);
    resettable.stack.work.title = 'Only the temporary interaction changed';
    assert.notEqual(original.stack.work.title, resettable.stack.work.title);
  }
  assert.ok(routeCount > 100, 'Real routes are prepared throughout the complete example chapters.');
});
