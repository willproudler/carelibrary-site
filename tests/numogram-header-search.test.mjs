import assert from 'node:assert/strict';
import test from 'node:test';
import {findNumogramReferences} from '../native/numogram-header-search.mjs';
import reference from '../native/numogram-reference.mjs';

const target = query => findNumogramReferences(reference, query).map(({kind, id}) => ({kind, id}));

test('finds published demons by name, alias, ID and either order of their net-span', () => {
  for (const query of ['Lurgo', 'LEGB', 'Legba', 'MESH-00', 'mesh00', '1::0', '0–1']) {
    assert.deepEqual(target(query), [{kind:'demon', id:'MESH-00'}], query);
  }
});

test('returns the real card and skill IDs across all three correspondence shelves', () => {
  assert.deepEqual(target('Fool'), [{kind:'card', id:'philosophers-tarot:major:0'}]);
  assert.deepEqual(target('Antonin Artaud'), [{kind:'card', id:'philosophers-tarot:major:0'}]);
  assert.deepEqual(target('The Initiation'), [{kind:'card', id:'acephalous-tarot:major:0'}]);
  assert.deepEqual(target('Volition'), [{kind:'skill', id:'disco-skills:7'}]);
  assert.equal(findNumogramReferences(reference, 'acephalous tarot', 1).length, 1);
});

test('ranks exact names and aliases before prefixes and incidental matches', () => {
  const data = {demons:[
    {id:'exact', name:'Z name', aliases:['Logic']},
    {id:'prefix', name:'A name', aliases:['Logical']},
    {id:'incidental', name:'A logic of gates'},
  ]};
  assert.deepEqual(findNumogramReferences(data, 'Logic').map(({id}) => id), ['exact', 'prefix', 'incidental']);
  assert.deepEqual(target('118'), []);
});
