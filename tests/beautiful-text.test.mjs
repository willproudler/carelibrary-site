import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';

function emittedClassifier(name) {
  const source = fs.readFileSync(new URL(`../native/${name}.mjs`,import.meta.url),'utf8');
  const start = source.indexOf("const BEAUTIFUL_TEXT_KEY='care-beautiful-text-v1'");
  const end = source.indexOf('\nfunction beautifulTextHasOCRWraps(',start);
  assert.ok(start >= 0 && end > start, `${name} ships the shared Beautiful text classifier`);
  return new Function(`${source.slice(start,end)};return beautifulSourceDetail;`)();
}

// Entirely invented text: these tests do not load the published collection.
function fixture() {
  const source = {
    id:'RAW_GARDEN', chapter_id:'CH_GARDEN', order:1, title:'A garden notebook',
    paragraphs:[
      {id:'RAW_GARDEN:P0001', kind:'passage', text:'[Source scan 17 · printed page 12](https://example.invalid/scans/17)'},
      {id:'RAW_GARDEN:P0002', kind:'passage', text:'https://example.invalid/notebook/source'},
      {id:'RAW_GARDEN:P0003', kind:'passage', text:'[Source scan 18 · printed page 13](https://example.invalid/scans/18)'},
      {id:'RAW_GARDEN:P0004', kind:'passage', text:'The tiny seedling\nleans towards the light.'},
      {id:'RAW_GARDEN:P0005', kind:'passage', text:'## Notes beside the gate'},
      {id:'RAW_GARDEN:P0006', kind:'passage', text:'A wooden bench stands in the shade.'},
    ],
  };
  const unit = (id, items) => ({id, layer:'CH', order:1, parents:[], title:'Notebook reading', sections:[{number:1, name:'Observations', items}]});
  return {
    works:[
      {id:'WORK_GARDEN', slug:'garden', title:'The garden notebook', author:'Invented author', sources:[source], units:[
        unit('CH_GARDEN', [{id:'CH_GARDEN:A1', text:'The seedling follows the light.', refs:['RAW_GARDEN:P0004']}]),
      ]},
      {id:'WORK_WINDOWS', slug:'windows', title:'Window observations', sources:[], units:[
        unit('CH_WINDOWS', [{id:'CH_WINDOWS:A1', text:'A recorded scan supports this observation.', refs:['RAW_GARDEN:P0001']}]),
      ]},
    ],
    lateral:{id:'XR_NOTEBOOKS', layer:'XR', title:'Notebook connections', parents:['CH_GARDEN','CH_WINDOWS'], sections:[
      {number:1, name:'Recorded connections', items:[
        {id:'XR_NOTEBOOKS:A1', text:'A source address is part of this connection.', deep_refs:['RAW_GARDEN:P0002']},
        {id:'XR_NOTEBOOKS:A2', text:'A second connection records the scan alignment.', passages:[{id:'RAW_GARDEN:P0001', type:'exact', review:'checked'}]},
      ]},
    ]},
  };
}

test('cross-book and lateral traces protect metadata even when local axioms are empty', () => {
  const adapter = createPublicReaderAdapter(fixture());
  const [scan, address] = adapter.chapter('RAW_GARDEN').passages;
  assert.deepEqual(scan.axioms, []);
  assert.equal(scan.trace_count, 2, 'count both the cross-book reference and the lateral passage alignment');
  assert.deepEqual(address.axioms, []);
  assert.equal(address.trace_count, 1, 'a lateral deep reference also protects source metadata');
  assert.equal(scan.route_available, true);
  assert.equal(address.route_available, true);
});

test('emitted Beautiful text helpers keep cross-book and lateral evidence fully visible', () => {
  const data = fixture(), before = structuredClone(data);
  const passages = createPublicReaderAdapter(data).chapter('RAW_GARDEN').passages;
  for (const name of ['study-desk','study-field']) {
    const classify = emittedClassifier(name);
    assert.deepEqual(passages.map(classify), [false,false,true,false,false,false]);
    assert.equal(classify({...passages[2],route_available:false}), false);
    assert.equal(classify({...passages[2],trace_count:undefined}), false);
  }
  assert.deepEqual(data,before);
});

test('page labels and standalone scholarly locators fold while authored text stays readable', () => {
  const clear = {trace_count:0,axioms:[],route_available:true};
  const details = ['Page 48', '> Page 48', 'Page iv',
    '[I q. 10 pr.](https://example.invalid/q10)',
    '[I q. 10 a. 2 ad arg.](https://example.invalid/q10a2)',
    '[I q. 10 a. 2 s. c. 1](https://example.invalid/q10a2)',
    '[I q. 10 a. 1 arg. 2](https://example.invalid/q10a1)'];
  const authored = ['48', 'IV', '34 Flowers beside the wall', 'Prologue', 'Chapter IV',
    'Page 48 describes the argument.', '> Page 48\n> The argument continues.',
    '[I q. 10 a. 1 arg. 2](https://example.invalid/q10a1) The argument continues.',
    '[The original argument](https://example.invalid/argument)',
    '[I q. 10 pr.](javascript:alert(1))', 'I q. 10 pr.'];
  for (const name of ['study-desk','study-field']) {
    const classify = emittedClassifier(name);
    for (const text of details) assert.equal(classify({...clear,text}), true, `${name}: ${text}`);
    for (const text of authored) assert.equal(classify({...clear,text}), false, `${name}: ${text}`);
  }
});

test('verified page furniture respects every trace guard and never mutates source rows', () => {
  const examples = [
    {text:'3',beautiful_source_detail:'page-number'},
    {text:'34 A garden notebook',beautiful_source_detail:'running-header'},
    {text:'I q. 10 pr.',beautiful_source_detail:'source-locator'},
  ];
  for (const name of ['study-desk','study-field']) {
    const classify = emittedClassifier(name);
    for (const example of examples) {
      const clear = {...example,trace_count:0,axioms:[],route_available:true};
      const before = structuredClone(clear);
      assert.equal(classify(clear), true);
      for (const trace_count of [undefined,null,'0',false,-1,1,NaN,Infinity]) {
        assert.equal(classify({...clear,trace_count}), false);
      }
      for (const axioms of [undefined,null,{},'',['CH_GARDEN:A1']]) {
        assert.equal(classify({...clear,axioms}), false);
      }
      for (const field of ['source_trace','deep_source_trace','matrix_trace','passage_trace_ids','linked_axioms','route_edges']) {
        assert.equal(classify({...clear,[field]:['RECORDED_REFERENCE']}), false, field);
      }
      assert.equal(classify({...clear,route_available:false}), false);
      assert.deepEqual(clear,before);
    }
    for (const hint of [undefined,null,true,[],{},'', 'paragraph', 'page-number ']) {
      assert.equal(classify({text:'34 A garden notebook',trace_count:0,axioms:[],beautiful_source_detail:hint}), false);
    }
  }
});

test('untraced source details, headings and prose have zero traces without losing their addresses', () => {
  const adapter = createPublicReaderAdapter(fixture());
  const chapter = adapter.chapter('RAW_GARDEN');
  for (const position of [2,4,5]) {
    const passage = chapter.passages[position];
    assert.equal(passage.trace_count, 0);
    assert.deepEqual(passage.axioms, []);
    assert.equal(passage.address, passage.id);
    assert.equal(passage.sequence, position + 1);
    assert.equal(passage.route_available, true);
    assert.equal(adapter.reference(passage.id).id, passage.id);
  }
  assert.equal(chapter.passages[2].preceding_id, 'RAW_GARDEN:P0002');
  assert.equal(chapter.passages[2].following_id, 'RAW_GARDEN:P0004');
});

test('trace protection preserves existing work-scoped axioms and routes', () => {
  const adapter = createPublicReaderAdapter(fixture());
  const prose = adapter.chapter('RAW_GARDEN').passages[3];
  assert.equal(prose.trace_count, 1);
  assert.deepEqual(prose.axioms, ['CH_GARDEN:A1']);
  assert.deepEqual(adapter.reference('RAW_GARDEN:P0001').route_edges, []);
  const globalRoute = adapter.reference('RAW_GARDEN:P0001', 'outgoing', {connection:true});
  assert.deepEqual(globalRoute.route_edges.map(edge => [edge.source_id,edge.target_id]), [
    ['RAW_GARDEN:P0001','CH_WINDOWS:A1'],
    ['RAW_GARDEN:P0001','XR_NOTEBOOKS:A2'],
  ]);
});

test('chapter, workspace and outline projections preserve original text, IDs and recorded references', () => {
  const data = fixture(), original = structuredClone(data);
  const adapter = createPublicReaderAdapter(data), state = {workId:'WORK_GARDEN'};
  const expected = original.works[0].sources[0].paragraphs.map(({id,text}) => ({id,text}));
  const chapters = [
    adapter.chapter('RAW_GARDEN', state),
    adapter.workspace(state).stack.active_chapter,
    adapter.outline('WORK_GARDEN', {id:'RAW_GARDEN',layer:'SOURCE'}, state).chapter,
  ];
  for (const chapter of chapters) {
    assert.deepEqual(chapter.passages.map(({id,text}) => ({id,text})), expected);
    assert.equal(chapter.passage_count, expected.length);
    assert.deepEqual(chapter.passages.map(row => row.trace_count), [2,1,0,1,0,0]);
  }
  for (const {id,text} of expected) assert.equal(adapter.reference(id).text, text);
  assert.deepEqual(adapter.unit('CH_WINDOWS').sections[0].items[0].source_trace, ['RAW_GARDEN:P0001']);
  assert.deepEqual(adapter.unit('XR_NOTEBOOKS').sections[0].items[0].deep_source_trace, ['RAW_GARDEN:P0002']);
  assert.deepEqual(adapter.unit('XR_NOTEBOOKS').sections[0].items[1].passage_alignments,
    original.lateral.sections[0].items[1].passages);
  assert.deepEqual(data, original, 'presentation projections must not rewrite saved source text or edges');
});

test('unaligned supplied translations remain unroutable and keep canonical source traces on the original', () => {
  const data = fixture(), source = data.works[0].sources[0];
  source.language_code = 'fr';
  source.translations = [{
    id:'GARDEN_SUPPLIED_EN', language_code:'en', language_name:'English', rendition_type:'supplied',
    title:'A supplied garden reading', paragraphs:[
      {id:'GARDEN_SUPPLIED_EN:DISPLAY-0001', kind:'display', text:'A supplied reading describes a small plant.'},
    ],
  }];
  const original = structuredClone(data), adapter = createPublicReaderAdapter(data), state = {workId:'WORK_GARDEN'};
  const chapter = adapter.workspace(state).stack.active_chapter, passage = chapter.passages[0];
  assert.equal(chapter.source_versions.selected_id, 'GARDEN_SUPPLIED_EN');
  assert.equal(chapter.source_rendition_type, 'supplied');
  assert.equal(passage.text, source.translations[0].paragraphs[0].text);
  assert.equal(passage.route_available, false);
  assert.equal(passage.trace_count, 0);
  assert.deepEqual(passage.axioms, []);
  assert.equal(adapter.index.nodes.has(passage.id), false);
  assert.equal(adapter.reduce(state, 'open_reference', passage.id), state);
  assert.throws(() => adapter.reference(passage.id), /not in the public collection/);
  const route = adapter.reference('CH_GARDEN:A1', 'incoming', {state});
  assert.equal(route.source_passages[0].id, 'RAW_GARDEN:P0004');
  assert.equal(route.source_passages[0].text, source.paragraphs[3].text);
  assert.equal(route.source_passages[0].is_translation, false);
  assert.deepEqual(route.route_edges.map(edge => [edge.source_id,edge.target_id]), [['RAW_GARDEN:P0004','CH_GARDEN:A1']]);
  assert.deepEqual(data, original);
});

function prefixFixture() {
  const data = fixture(), source = data.works[0].sources[0], passage = source.paragraphs[3];
  source.language_code = 'fr';
  passage.text = 'q\n\nUne plante inventée grandit.';
  passage.beautiful_omit_prefix = 'q';
  source.translations = [{
    id:'GARDEN_PREFIX_EN', language_code:'en', language_name:'English', rendition_type:'machine',
    title:'A translated notebook', paragraphs:[
      {id:passage.id, kind:'passage', text:'q\n\nAn invented plant grows.'},
    ],
  }];
  return {data, source, passage, translation:source.translations[0].paragraphs[0]};
}

test('verified opening-fragment hints accompany exact canonical and aligned translated prefixes without rewriting text', () => {
  const {data,source,passage,translation} = prefixFixture(), before = structuredClone(data);
  const adapter = createPublicReaderAdapter(data);
  const originalState = {workId:'WORK_GARDEN',paneVersions:{[source.id]:'original'}};
  const original = adapter.chapter(source.id, originalState).passages[3];
  const translated = adapter.chapter(source.id, {workId:'WORK_GARDEN'}).passages[0];
  for (const [actual, expected] of [[original,passage],[translated,translation]]) {
    assert.equal(actual.beautiful_omit_prefix, 'q');
    assert.equal(actual.text, expected.text);
    assert.equal(actual.reading_text, expected.text);
    assert.equal(actual.route_available, true);
    assert.equal(actual.trace_count, 1);
    assert.deepEqual(actual.axioms, ['CH_GARDEN:A1']);
  }
  assert.equal(adapter.reference(passage.id, 'outgoing', {state:originalState}).text, passage.text);
  assert.deepEqual(data, before);
});

test('malformed or mismatched canonical opening-fragment hints are omitted', () => {
  for (const hint of [undefined,null,0,true,[],{},'', 'wrong', 'q\n\n', ' q', '<', '\n']) {
    const {data,source,passage} = prefixFixture();
    passage.beautiful_omit_prefix = hint;
    const adapter = createPublicReaderAdapter(data);
    for (const state of [{}, {paneVersions:{[source.id]:'original'}}]) {
      assert.equal(adapter.chapter(source.id,state).passages.some(row => Object.hasOwn(row,'beautiful_omit_prefix')), false);
    }
  }
  for (const text of ['p\n\nA different opening.', ' q\n\nAn indented opening.', 'q\nA single break.', 'q\n\n', 'q\n\n  ']) {
    const {data,source,passage} = prefixFixture();
    passage.text = text;
    const adapter = createPublicReaderAdapter(data);
    for (const state of [{}, {paneVersions:{[source.id]:'original'}}]) {
      assert.equal(adapter.chapter(source.id,state).passages.some(row => Object.hasOwn(row,'beautiful_omit_prefix')), false);
    }
  }
});

test('saved renditions cannot supply or broaden canonical opening-fragment hints', () => {
  for (const text of ['An opening without the fragment.', 'p\n\nAnother fragment.', 'q\nA single break.', 'q\n\n']) {
    const {data,source,translation} = prefixFixture();
    translation.text = text;
    translation.beautiful_omit_prefix = 'q';
    assert.equal(Object.hasOwn(createPublicReaderAdapter(data).chapter(source.id).passages[0], 'beautiful_omit_prefix'), false);
  }
  const {data,source,passage,translation} = prefixFixture();
  delete passage.beautiful_omit_prefix;
  translation.beautiful_omit_prefix = 'q';
  assert.equal(Object.hasOwn(createPublicReaderAdapter(data).chapter(source.id).passages[0], 'beautiful_omit_prefix'), false);
  passage.beautiful_omit_prefix = 'q';
  translation.id = 'GARDEN_PREFIX_EN:DISPLAY-0001';
  translation.kind = 'display';
  const projected = createPublicReaderAdapter(data).chapter(source.id).passages[0];
  assert.equal(projected.route_available, false);
  assert.equal(Object.hasOwn(projected, 'beautiful_omit_prefix'), false);
});

test('verified fragments accept only the bounded ASCII fragment protocol', () => {
  for (const prefix of ['iv','ABCD']) {
    const {data,source,passage,translation} = prefixFixture();
    passage.beautiful_omit_prefix = prefix;
    passage.text = prefix + passage.text.slice(1);
    translation.text = prefix + translation.text.slice(1);
    const adapter = createPublicReaderAdapter(data);
    assert.equal(adapter.chapter(source.id).passages[0].beautiful_omit_prefix, prefix);
    assert.equal(adapter.chapter(source.id,{paneVersions:{[source.id]:'original'}}).passages[3].beautiful_omit_prefix, prefix);
  }
});

function sourceDetailFixture(kind = 'running-header', original = '34 Notes by the gate', translated = '34 Notes près du portail') {
  const data = fixture(), source = data.works[0].sources[0], passage = source.paragraphs[3];
  source.language_code = 'en';
  passage.text = original;
  passage.beautiful_source_detail = kind;
  source.translations = [{
    id:'GARDEN_DETAILS_FR',language_code:'fr',language_name:'French',rendition_type:'machine',
    paragraphs:[{id:passage.id,kind:'passage',text:translated}],
  }];
  return {data,source,passage,translation:source.translations[0].paragraphs[0],
    state:{workId:'WORK_GARDEN',paneVersions:{[source.id]:'GARDEN_DETAILS_FR'}}};
}

test('attested page furniture reaches original, workspace and aligned translated views without changing references', () => {
  const {data,source,passage,translation,state} = sourceDetailFixture(), before = structuredClone(data);
  const adapter = createPublicReaderAdapter(data);
  const original = adapter.chapter(source.id,{paneVersions:{[source.id]:'original'}}).passages[3];
  const translated = adapter.chapter(source.id,state).passages[0];
  assert.equal(original.beautiful_source_detail,'running-header');
  for (const projected of [translated,adapter.workspace(state).stack.active_chapter.passages[0],adapter.outline('WORK_GARDEN',{id:source.id,layer:'SOURCE'},state).chapter.passages[0]]) {
    assert.equal(projected.beautiful_source_detail,'running-header');
    assert.equal(projected.text,translation.text);
    assert.equal(projected.reading_text,translation.text);
    assert.equal(projected.id,passage.id);
    assert.equal(projected.route_available,true);
    assert.equal(projected.trace_count,1);
    assert.deepEqual(projected.axioms,['CH_GARDEN:A1']);
  }
  const route = adapter.reference(passage.id,'outgoing',{state});
  assert.equal(route.text,translation.text);
  assert.deepEqual(route.route_edges.map(edge=>[edge.source_id,edge.target_id]),[[passage.id,'CH_GARDEN:A1']]);
  assert.deepEqual(data,before);
});

test('translated furniture hints require matching canonical text or the same bounded running folio', () => {
  for (const [kind,original,translated] of [
    ['page-number','> Page 48','  > Page   48 '],
    ['page-number','3','3'],
    ['source-locator','[I q. 10 pr.](https://example.invalid/q10)','[I q. 10 pr.](https://example.invalid/q10)'],
    ['running-header','Notes by the gate 34','Notes près du portail 34'],
    ['running-header','34 Notes by the gate','34 Notes près du portail'],
  ]) {
    const {data,source,state} = sourceDetailFixture(kind,original,translated);
    assert.equal(createPublicReaderAdapter(data).chapter(source.id,state).passages[0].beautiful_source_detail,kind);
  }
  for (const [kind,original,translated] of [
    ['page-number','3','4'],
    ['page-number','Page 48','Page 49'],
    ['source-locator','I q. 10 pr.','I q. 11 pr.'],
    ['running-header','34 Notes by the gate','35 Notes près du portail'],
    ['running-header','34 Notes by the gate','Notes près du portail 34'],
    ['running-header','34 Notes by the gate','34 A complete sentence.'],
    ['running-header','34 Notes by the gate','34 Notes\nprès du portail'],
    ['running-header','34 Notes by the gate','34 [Notes](https://example.invalid)'],
    ['running-header','34 Notes by the gate','34 Chapter 2'],
    ['running-header','34 Notes by the gate',`34 ${'long '.repeat(17)}`],
    ['running-header','34 Notes by the gate',`34 ${'A'.repeat(141)}`],
  ]) {
    const {data,source,state} = sourceDetailFixture(kind,original,translated);
    assert.equal(Object.hasOwn(createPublicReaderAdapter(data).chapter(source.id,state).passages[0],'beautiful_source_detail'),false,translated);
  }
});

test('saved and supplied translations cannot invent page furniture hints', () => {
  for (const hint of [undefined,null,0,true,[],{},'', 'page-number ']) {
    const {data,source,passage,translation,state} = sourceDetailFixture();
    passage.beautiful_source_detail = hint;
    translation.beautiful_source_detail = 'running-header';
    assert.equal(Object.hasOwn(createPublicReaderAdapter(data).chapter(source.id,state).passages[0],'beautiful_source_detail'),false);
  }
  const {data,source,translation,state} = sourceDetailFixture();
  translation.id = 'GARDEN_DETAILS_FR:DISPLAY-0001';
  translation.kind = 'display';
  translation.beautiful_source_detail = 'running-header';
  const projected = createPublicReaderAdapter(data).chapter(source.id,state).passages[0];
  assert.equal(projected.route_available,false);
  assert.equal(Object.hasOwn(projected,'beautiful_source_detail'),false);
});
