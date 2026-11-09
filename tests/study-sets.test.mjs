import test from 'node:test';
import assert from 'node:assert/strict';
import {loadStudySets, saveStudySets, changeStudySets, studySetBookChoices} from '../study-sets.mjs';

const books = new Map([
  ['WORK_N', {id:'WORK_N', title:'Also sprach Zarathustra', author:'Friedrich Nietzsche'}],
  ['WORK_B', {id:'WORK_B', title:'Évolution créatrice', author:'Henri Bergson'}],
]);
const run = (sets, command) => changeStudySets(sets, command, books);

test('the app reads and writes only the active account’s study sets', () => {
  const data = new Map();
  const storage = {getItem:key => data.get(key), setItem:(key, value) => data.set(key, value)};
  const first = run([], {type:'create', id:'one', title:'First account'});
  const second = run([], {type:'create', id:'two', title:'Second account'});
  assert.equal(saveStudySets(storage, ' First@example.test ', first), true);
  assert.equal(saveStudySets(storage, 'second@example.test', second), true);
  assert.deepEqual(loadStudySets(storage, 'first@EXAMPLE.test'), first);
  assert.deepEqual(loadStudySets(storage, 'second@example.test'), second);
  const unavailableStorage = {getItem() { throw Error('Should not read as a guest'); }, setItem() { throw Error('Should not write as a guest'); }};
  assert.deepEqual(loadStudySets(unavailableStorage, null), []);
  assert.equal(saveStudySets(unavailableStorage, null, first), false);
});

test('creating, renaming and deleting a set preserve other sets and members', () => {
  let sets = run([], {type:'create', id:'one', title:'  First   set '});
  sets = run(sets, {type:'create', id:'two', title:'Second set'});
  sets = run(sets, {type:'add', id:'one', bookIds:['WORK_B', 'WORK_N', 'WORK_B']});
  assert.deepEqual(sets[0], {id:'one', title:'First set', bookIds:['WORK_B', 'WORK_N']});
  assert.throws(() => run(sets, {type:'rename', id:'one', title:' SECOND SET '}), /already has this name/);
  const renamed = run(sets, {type:'rename', id:'one', title:'A new name'});
  assert.equal(renamed[0].title, 'A new name');
  assert.equal(sets[0].title, 'First set');
  assert.deepEqual(renamed[0].bookIds, ['WORK_B', 'WORK_N']);
  assert.deepEqual(run(renamed, {type:'delete', id:'one'}), [sets[1]]);
});

test('membership accepts published books only and supports removing withdrawn books', () => {
  const withdrawn = {id:'one', title:'An older set', bookIds:['WITHDRAWN', 'WORK_N']};
  assert.throws(() => run([withdrawn], {type:'add', id:'one', bookIds:['WORK_B', 'WITHDRAWN']}), /available in the Library/);
  assert.deepEqual(withdrawn.bookIds, ['WITHDRAWN', 'WORK_N']);
  assert.deepEqual(run([withdrawn], {type:'remove', id:'one', bookIds:['WITHDRAWN']})[0].bookIds, ['WORK_N']);
});

test('the shelf shortcut can create a set with a published book in one write', () => {
  assert.deepEqual(run([], {type:'create', id:'one', title:'Selected reading', bookIds:['WORK_N', 'WORK_N']}), [
    {id:'one', title:'Selected reading', bookIds:['WORK_N']},
  ]);
  assert.throws(() => run([], {type:'create', id:'one', title:'Selected reading', bookIds:['WITHDRAWN']}), /available in the Library/);
});

test('the book picker searches published titles and authors while excluding members', () => {
  assert.deepEqual(studySetBookChoices(books, [], 'bergson evolution').map(book => book.id), ['WORK_B']);
  assert.deepEqual(studySetBookChoices(books, ['WORK_B'], 'bergson'), []);
  assert.deepEqual(studySetBookChoices(books, [], '').map(book => book.id), ['WORK_N', 'WORK_B']);
});
