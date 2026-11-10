import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import assets from '../native/writing-reader-assets.mjs';
import {copyStudioFootnotes, footnoteSavePayload, linkStudioFootnote, nativeStudioFootnotes,
  studioFootnoteReference, studioReaderCitation} from '../native/studio-footnotes.mjs';

const source = {kind: 'passage', item_id: 'RAW_TEST:P01', work_id: 'WORK_TEST',
  work_title: 'A Source', author: 'A. Author', year: '1984', title: 'Opening', unit_id: 'RAW_TEST',
  unit_title: 'Opening', href: '#book=source&ref=RAW_TEST%3AP01', text: 'An exact passage.'};
const manual = {id: 'manual', block_id: 'first', marker_offset: 10, marker_order: 0, note: 'My note'};
const linked = {...manual, id: 'linked', marker_order: 1, source};

test('Studio notes retain linked sources when moved, edited and restored', () => {
  const draft = {footnotes: [manual, linked]};
  const moved = nativeStudioFootnotes(draft, {type: 'note', reference_id: linked.id, note: 'An observation',
    footnote_positions: {linked: ['second', 12, 1]}});
  assert.deepEqual(moved, [manual, {...linked, block_id: 'second', marker_offset: 12, note: 'An observation'}]);
  assert.deepEqual(nativeStudioFootnotes(draft, {removed_footnotes: ['linked']}), [manual]);
  assert.deepEqual(nativeStudioFootnotes({footnotes: [manual]}, {restored_footnotes: ['linked']},
    new Map([['linked', linked]])), [manual, linked]);
  assert.deepEqual(footnoteSavePayload([linked])[0].source, {kind: 'passage', item_id: 'RAW_TEST:P01'});
  assert.equal(studioFootnoteReference(manual).target.kind, 'manual');
  assert.equal(studioFootnoteReference(linked).target.academic_citation.title, 'A Source');
});

test('Studio links at the end of the exact selection and deduplicates retries', () => {
  const action = {selection: {end_block_id: 'first', end: 10}};
  assert.deepEqual(linkStudioFootnote({footnotes: [manual]}, action, source, 'new'), {
    id: 'new', location: ['first', 10, 1], note: '', source: {kind: 'passage', item_id: 'RAW_TEST:P01'},
  });
  assert.equal(linkStudioFootnote({footnotes: [manual, linked]}, action, source, 'retry').id, 'linked');
  assert.throws(() => linkStudioFootnote({footnotes: []}, action, null, 'missing'), /published Library/);
});

test('desktop clipboard source IDs copy notes only from a draft in this account', async () => {
  const doc = '1'.repeat(32);
  const draft = {id: doc, footnotes: [manual, linked]};
  const pasted_footnotes = [
    {source_document_id: doc, source_reference_id: manual.id, id: 'manual-copy', location: ['first', 25, 0]},
    {source_document_id: doc, source_reference_id: linked.id, id: 'linked-copy', location: ['first', 29, 1]},
  ];
  const added = await copyStudioFootnotes(draft, {pasted_footnotes}, () => assert.fail('Load reused active draft'));
  assert.deepEqual(added.map(note => note.source?.item_id), [undefined, 'RAW_TEST:P01']);
  assert.deepEqual(added.map(note => note.note), ['My note', 'My note']);
  await assert.rejects(copyStudioFootnotes(draft, {pasted_footnotes: [{
    ...pasted_footnotes[0], source_document_id: '2'.repeat(32),
  }]}, async () => { throw new Error('Outside this account'); }), /Outside this account/);
});

test('Reader sends the approved citation into the Library companion at the exact passage', () => {
  const safe = assets.js.match(/^function safeLink\(.*?^}/ms)[0];
  const cited = assets.js.match(/^function citedLibraryRoute\(.*?^}/ms)[0];
  const route = new Function('webHost', safe + '\n' + cited + '\nreturn citedLibraryRoute;')(true);
  const citation = studioReaderCitation(source);
  assert.equal(citation.citation, 'A. Author, A Source, 1984, Opening');
  assert.deepEqual(route(citation.library_url), {view: 'library', fragment: '#book=source&focus=RAW_TEST%3AP01'});
  assert.equal(route('care-library://read?' + new URLSearchParams({id: source.item_id, fragment: '#view=studio'})), null);
  assert.equal(route('care-library://read?' + new URLSearchParams({
    id: source.item_id, fragment: '#book=source&focus=RAW_TEST%3AP02',
  })), null);
});

test('the nested Library companion enables Studio citation clipboard', () => {
  const app = readFileSync(new URL('../public-app.mjs', import.meta.url), 'utf8');
  assert.match(app, /const embedded=window.parent!==window&&companionRequest.get\('care_studio_embed'\)==='1'/);
  assert.match(app, /const libraryCompanion=embedded&&companionRequest.get\('care_studio_pane_reading'\)==='1'/);
  assert.match(app, /const citationCompanion=embedded&&!readingSplitCompanion&&!documentSplitCompanion/);
  assert.match(app, /if\(citationCompanion\|\|libraryCompanion\)Object.assign\(payload,\{studio_embed:true,studio_axiom_draft_counts:\{\},copy_studio_source:citationCompanion\?copyStudioPacket:null\}\)/);
});
