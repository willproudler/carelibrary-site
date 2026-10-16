import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {atlasView, atlasStatusMatchesView, buildAtlasModel} from '../discover-atlas.mjs';

const data = JSON.parse(fs.readFileSync(new URL('./fixtures/original-public-library.json', import.meta.url)));
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

test('newly featured books and laterals never replace the Hume homepage example', () => {
  for (const featured_reading of [
    {type: 'book', id: data.works.find(work => work.slug === 'kant').id},
    {type: 'field', id: data.lateral.id},
  ]) {
    const revised = {...data, works: [...data.works].reverse(), featured_reading};
    const view = atlasView(revised, model);
    assert.equal(view.book, 'hume');
    assert.equal(view.lateral, false);
    assert.ok([...view.nodes.values()].every(node => node.work?.slug === 'hume'));
  }
});

test('reader events can highlight Hume routes without replacing the homepage map', () => {
  const view = atlasView(data, model);
  const hume = data.works.find(work => work.slug === 'hume');
  const kant = data.works.find(work => work.slug === 'kant');
  for (const status of [
    {book: 'hume', workId: hume.id, referenceId: 'CH_THN_INTR:AS1'},
    {referenceId: 'RAW_THN_INTR:P0001'},
    {book: 'hume', unitId: 'WB_THN'},
  ]) assert.equal(atlasStatusMatchesView(view, model, status), true);
  for (const status of [
    {book: 'kant', workId: kant.id, referenceId: 'CH_KPR_INTRODUCTION:AS1'},
    {workId: kant.id},
    {referenceId: 'CH_KPR_INTRODUCTION:AS1'},
    {unitId: 'WB_KPR'},
    {book: 'lateral', connectionId: data.lateral.id},
    {book: 'hume', workId: hume.id, connectionId: data.lateral.id},
    {book: 'field:' + data.lateral.id},
  ]) assert.equal(atlasStatusMatchesView(view, model, status), false);
  assert.equal(view.book, 'hume');
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

test('the atlas remains a book map when a previously published lateral is removed',()=>{
 const revised=structuredClone(data);delete revised.lateral;
 const model=buildAtlasModel(revised);
 for(const status of [{},{book:'lateral',connectionId:'XR_KPR_THN'},{book:'kant'}]){
  const view=atlasView(revised,model,status);
  assert.equal(view.lateral,false);
  assert.equal(view.works.length,1);
  assert.ok(!view.nodes.has('XR_KPR_THN'));
 }
});
