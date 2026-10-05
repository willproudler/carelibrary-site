import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {atlasView, buildAtlasModel} from '../discover-atlas.mjs';

const data = JSON.parse(fs.readFileSync(new URL('../data/library.json', import.meta.url)));
const model = buildAtlasModel(data);

test('the initial atlas shows only Hume and has no lateral node or edge', () => {
  const view = atlasView(data, model);
  assert.equal(view.book, 'hume');
  assert.equal(view.lateral, false);
  assert.deepEqual(view.works.map(work => work.slug), ['hume']);
  assert.deepEqual(new Set([...view.nodes.values()].map(node => node.layer)), new Set(['SOURCE', 'CH', 'CL', 'MC', 'WB']));
  assert.ok([...view.nodes.values()].every(node => node.work?.slug === 'hume'));
  assert.ok([...view.edges.values()].every(edge => view.nodes.has(edge.source) && view.nodes.has(edge.target)));
  assert.ok(!view.nodes.has(data.lateral.id));
});

test('book selection changes the map even with no selected reference', () => {
  for (const book of ['kant', 'hume', 'bergson']) {
    const view = atlasView(data, model, {book, referenceId: '', connectionId: ''});
    assert.equal(view.book, book);
    assert.ok([...view.nodes.values()].every(node => node.work?.slug === book));
    assert.equal(view.nodes.size, view.works[0].sources.length + view.works[0].units.length);
  }
  const bergson = data.works.find(work => work.slug === 'bergson');
  const view = atlasView(data, model, {workId: bergson.id});
  assert.equal(view.book, 'bergson');
  assert.ok(![...view.nodes.values()].some(node => node.layer === 'MC'));
  assert.ok([...view.nodes.values()].some(node => node.layer === 'WB'));
});

test('explicit lateral status draws only its two recorded parents', () => {
  for (const status of [{book: 'lateral'}, {book: 'hume', connectionId: data.lateral.id, referenceId: ''}]) {
    const view = atlasView(data, model, status);
    assert.equal(view.lateral, true);
    assert.equal(view.book, 'lateral');
    assert.deepEqual(new Set(view.works.map(work => work.slug)), new Set(['kant', 'hume']));
    assert.equal(view.nodes.size, 118);
    assert.ok(view.nodes.has(data.lateral.id));
    assert.ok([...view.nodes.values()].every(node => !node.work || node.work.slug !== 'bergson'));
    assert.deepEqual(new Set([...view.edges.values()].filter(edge => edge.target === data.lateral.id).map(edge => edge.source)), new Set(data.lateral.parents));
  }
});
