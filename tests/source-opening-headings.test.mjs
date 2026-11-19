import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

for (const reader of ['study-desk', 'study-field']) {
  const source = readFileSync(new URL(`../native/${reader}.mjs`, import.meta.url), 'utf8');
  const start = source.indexOf('function beautifulTextHeadingKey(');
  const end = source.indexOf('function beautifulTextOpeningTitles(', start);
  const {titles, key, matches} = new Function(source.slice(start, end) +
    'return {titles:beautifulTextChapterTitles,key:beautifulTextHeadingKey,matches:beautifulTextHeadingMatches};')();

  test(`${reader} matches heading variants by division number and wording`, () => {
    const known = new Set([key('Chapter IV. On the nature of memory')]);
    assert.equal(matches('Fourth section: On the nature of memory', known), true);
    assert.equal(matches('Fifth section: On the nature of memory', known), false);
    assert.equal(matches('Fourth section: On the nature of the mind', known), false);
  });

  test(`${reader} accepts an alternative translation only from the aligned chapter heading`, () => {
    const chapter = {
      raw_unit_id: 'RAW_DEMO_04',
      original_title: 'Sur la nature de la mémoire',
      reading_title: 'On memory',
      passages: [
        {id: 'RAW_OTHER:P001', original_text: '# Sur la nature de la mémoire', text: '# Wrong chapter'},
        {id: 'RAW_DEMO_04:P002', original_text: '# Sur la nature de la mémoire', text: '# Unaligned', route_available: false},
        {id: 'RAW_DEMO_04:P003', original_text: '# Sur la nature de la mémoire', text: '# On the nature of memory'},
      ],
    };
    assert.deepEqual(titles(chapter), ['On memory', 'On the nature of memory']);
  });
}
