import assert from 'node:assert/strict';
import test from 'node:test';
import {bookOpeningState, recordBookOpening, setBookOpeningPreference} from '../book-opening.mjs';

function preferenceWindow(writable = true) {
  const view = new EventTarget(), data = new Map();
  view.Event = Event;
  view.localStorage = {
    getItem:key => data.get(key) ?? null,
    setItem(key,value) { if (!writable) throw new Error('storage disabled'); data.set(key,value); },
  };
  return view;
}
test('book opening defaults after two consecutive choices or an explicit Always, and can be reset', () => {
  for (const writable of [true,false]) {
    const view = preferenceWindow(writable);
    assert.equal(bookOpeningState(view).mode, 'ask');
    recordBookOpening(view, 'reader');
    recordBookOpening(view, 'library');
    assert.equal(bookOpeningState(view).mode, 'ask');
    recordBookOpening(view, 'library');
    assert.equal(bookOpeningState(view).mode, 'library');
    recordBookOpening(view, 'reader');
    assert.equal(bookOpeningState(view).mode, 'library', 'a one-time choice preserves the existing default');
    setBookOpeningPreference(view,'ask');
    assert.deepEqual(bookOpeningState(view), {mode:'ask',last:null});
    recordBookOpening(view,'reader',true);
    assert.equal(bookOpeningState(view).mode, 'reader');
  }
});
