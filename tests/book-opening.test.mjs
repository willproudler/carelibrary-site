import assert from 'node:assert/strict';
import test from 'node:test';
import {BOOK_OPENING_KEY, bookOpeningState, chooseBookOpening, recordBookOpening, setBookOpeningPreference} from '../book-opening.mjs';

function preferenceWindow(writable = true, initial = null) {
  const view = new EventTarget(), data = new Map();
  if (initial) data.set(BOOK_OPENING_KEY, JSON.stringify(initial));
  view.Event = Event;
  view.localStorage = {
    getItem:key => data.get(key) ?? null,
    setItem(key,value) { if (!writable) throw new Error('storage disabled'); data.set(key,value); },
  };
  return view;
}

for (const writable of [true,false]) {
  test('five normal choices learn the most frequent destination with '+(writable?'device':'in-memory')+' storage', async () => {
    const view = preferenceWindow(writable);
    setBookOpeningPreference(view,'ask');
    const history = ['reader','library','reader','reader','library'];
    for (const [index, choice] of history.entries()) {
      assert.equal(bookOpeningState(view).mode,'ask');
      recordBookOpening(view,choice);
      assert.deepEqual(bookOpeningState(view).choices,history.slice(0,index+1));
    }
    assert.equal(bookOpeningState(view).mode,'reader','the fifth choice was Library but the majority chose Reader');
    assert.equal(await chooseBookOpening({defaultView:view}),'reader','a learned opening needs no chooser UI');
    assert.deepEqual(bookOpeningState(view).choices,history,'using the default does not count a sixth choice');
    setBookOpeningPreference(view,'ask');
    assert.deepEqual(bookOpeningState(view),{mode:'ask',choices:[],last:null});
    recordBookOpening(view,'reader',true);
    assert.equal(bookOpeningState(view).mode,'reader');
    setBookOpeningPreference(view,'library');
    assert.equal(await chooseBookOpening({defaultView:view}),'library','an explicit Settings choice applies immediately');
  });
}

test('all five matching votes still require five shelf choices', () => {
  const view=preferenceWindow();
  setBookOpeningPreference(view,'ask');
  for(let i=0;i<5;i++){
    assert.equal(bookOpeningState(view).mode,'ask');
    recordBookOpening(view,'library');
  }
  assert.equal(bookOpeningState(view).mode,'library');
});

test('existing defaults and partial histories migrate without discarding prior choices', async () => {
  const saved=preferenceWindow(true,{mode:'library',last:'library'});
  assert.equal(await chooseBookOpening({defaultView:saved}),'library');
  const partial=preferenceWindow(true,{mode:'ask',last:'reader'});
  assert.deepEqual(bookOpeningState(partial).choices,['reader']);
  for(const choice of ['reader','library','library'])recordBookOpening(partial,choice);
  assert.equal(bookOpeningState(partial).mode,'ask');
  recordBookOpening(partial,'reader');
  assert.equal(bookOpeningState(partial).mode,'reader');
  assert.deepEqual(JSON.parse(partial.localStorage.getItem(BOOK_OPENING_KEY)).choices,
    ['reader','reader','library','library','reader']);
});

test('invalid input never votes or consumes a shelf choice', () => {
  const view=preferenceWindow(true,{mode:'ask',choices:['reader',null,'bad']});
  recordBookOpening(view,'bad');
  assert.deepEqual(bookOpeningState(view),{mode:'ask',last:'reader',choices:['reader']});
});

test('beta shelf opens Library without a dialog, including on devices trained by the former prompt', async () => {
  for (const old of [null, {mode:'ask',last:'reader'}, {mode:'reader',choices:Array(5).fill('reader')}]) {
    const view = preferenceWindow();
    if (old) view.localStorage.setItem('care-book-opening-v1', JSON.stringify(old));
    assert.equal(await chooseBookOpening({defaultView:view}), 'library');
    setBookOpeningPreference(view,'reader');
    assert.equal(await chooseBookOpening({defaultView:view}), 'reader');
    setBookOpeningPreference(view,'library');
    assert.equal(await chooseBookOpening({defaultView:view}), 'library');
  }
});
