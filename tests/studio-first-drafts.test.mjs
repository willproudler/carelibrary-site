import assert from 'node:assert/strict';
import test from 'node:test';
import {firstDraftTitle, studioBinderDocuments} from '../native/studio-first-drafts.mjs';

test('First drafts name Untitled from opening words without changing named manuscripts', () => {
  const body = 'Untitled draft 2\n\nA line from an early manuscript\nThe second line stays in the document.';
  assert.equal(firstDraftTitle({title: 'Untitled (2)', body}), 'A line from an early manuscript');
  assert.equal(firstDraftTitle({title: 'My chosen title', body}), 'My chosen title');
  assert.equal(firstDraftTitle({title: 'Untitled', body: 'one two three four five six seven eight nine ten eleven twelve thirteen'}),
    'one two three four five six seven eight nine ten eleven twelve…');
  assert.equal(firstDraftTitle({title: 'Untitled', body: ''}, {stamp: Date.UTC(2026, 10, 11)}), 'First draft — 11 Nov 2026');
});

test('First drafts metadata projects into the editor without changing stored summaries', () => {
  const entries = [{id: 'early', title: 'Early words', revision: 2}, {id: 'working', title: 'Working', revision: 1}];
  const binder = {first_drafts: ['early'], locations: {early: 'folder', working: null}};
  assert.deepEqual(studioBinderDocuments(entries, binder), [
    {...entries[0], folder_id: 'folder', first_draft: true}, {...entries[1], folder_id: null, first_draft: false},
  ]);
  assert.equal(Object.hasOwn(entries[0], 'first_draft'), false);
  assert.deepEqual(studioBinderDocuments(entries, null).map(entry => entry.first_draft), [false, false]);
  assert.equal(studioBinderDocuments(entries, {}).length, 2);
});
