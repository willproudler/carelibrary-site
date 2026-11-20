import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {publicSourceDisplayTitle, publicSourceFormatting} from '../native/source-opening-views.mjs';

const catalogue = JSON.parse(readFileSync(new URL('../data/library.json', import.meta.url)));
const timaeusId = 'WORK_STORE_PERSEUS_GREEK_TLG0059_TLG031_PERSEUS_GRC2';
const camilloId = 'WORK_L_IDEA_DEL_THEATRO_DELLO_ECCELLENTE_M_GIULIO_CAMILLO';
const timaeus = catalogue.works.find(({id}) => id === timaeusId);
const camillo = catalogue.works.find(({id}) => id === camilloId)
  || (process.env.CARE_CAMILLO_SOURCE_FIXTURE
    ? JSON.parse(readFileSync(process.env.CARE_CAMILLO_SOURCE_FIXTURE)) : undefined);
const adapter = createPublicReaderAdapter(catalogue.works.includes(camillo) || !camillo
  ? catalogue : {...catalogue, works:[...catalogue.works, camillo]});
const readingLanguage = (work, language) => ({readingLanguages:{[work.id]:language}});

function verifyNavigation(work, source, expected) {
  assert.equal(publicSourceDisplayTitle(source, work.id), expected, source.id);
  const editions = [['original', source]];
  const english = source.translations?.find(({language_code}) => language_code === 'en');
  if (english) editions.push(['en', english]);
  for (const [language, edition] of editions) {
    const state = readingLanguage(work, language);
    const chapter = adapter.chapter(source.id, state);
    const unit = adapter.unit(source.chapter_id, state);
    const stack = adapter.stack(work.id, {...state, rawUnitId:source.id});
    assert.equal(chapter.title, expected, source.id);
    assert.equal(chapter.source_versions.title, expected, source.id);
    assert.equal(unit.identity.title, expected, source.chapter_id);
    assert.equal(unit.sheet_versions.title, expected, source.chapter_id);
    assert.equal(stack.active_chapter.title, expected, source.id);
    assert.equal(stack.chapters.find(({id}) => id === source.id).title, expected, source.id);
    assert.equal(stack.sheet_options.CH.find(({id}) => id === source.chapter_id).title, expected, source.id);
    assert.deepEqual(chapter.passages.map(({id, text}) => ({id, text})),
      edition.paragraphs.map(({id, text}) => ({id, text})), source.id);
  }
  assert.equal(publicSourceDisplayTitle({...source, text:source.text + ' altered'}, work.id), '');
  assert.equal(publicSourceDisplayTitle({...source, sha256:'0'.repeat(64)}, work.id), '');
}

test('all 76 Timaeus sections show their topic and exact Stephanus range in both panes and navigation', {skip:!timaeus}, () => {
  const saved = JSON.stringify(timaeus);
  const expectedSamples = new Map([
    [0, 'Opening conversation · 17a–18a'],
    [31, 'Intellect and necessity · 47e–48e'],
    [75, 'Animals and the completed cosmos · 91e–92c'],
  ]);
  assert.equal(timaeus.sources.length, 76);
  const titles = timaeus.sources.map((source, position) => {
    const title = publicSourceDisplayTitle(source, timaeus.id);
    assert.match(title, /^.+ · \d{2}[a-e]–\d{2}[a-e]$/, source.id);
    if (expectedSamples.has(position)) assert.equal(title, expectedSamples.get(position));
    verifyNavigation(timaeus, source, title);
    return title;
  });
  assert.equal(new Set(titles).size, 76);
  assert.equal(JSON.stringify(timaeus), saved);
});

test('Camillo uses consistent titles for all seven source and CARE sections', {skip:!camillo}, () => {
  const saved = JSON.stringify(camillo);
  const titles = ['The Idea of the Theatre', 'The Banquet', 'The Cave', 'The Gorgons',
    'Pasiphaë', 'The Winged Sandals', 'Prometheus'];
  assert.equal(camillo.sources.length, titles.length);
  camillo.sources.forEach((source, index) => verifyNavigation(camillo, source, titles[index]));
  assert.equal(JSON.stringify(camillo), saved);
});

test('Camillo folds scan furniture and retains the four attested facsimile crops', {skip:!camillo}, () => {
  const visualPassages = new Map([
    ['RAW_LIDT_LIDT', [[2, 'Fleur-de-lis ornament']]],
    ['RAW_LIDT_ILCO', [[21, 'Pythagorean principles'], [34, 'solar analogy']]],
    ['RAW_LIDT_ITAL', [[35, 'Small ink mark in the margin']]],
  ]);
  let totalFigures = 0;
  for (const source of camillo.sources) {
    for (const edition of [source, ...source.translations]) {
      const state = edition === source ? readingLanguage(camillo, 'original') : {paneVersions:{[source.id]:edition.id}};
      const chapter = adapter.chapter(source.id, state);
      const rows = chapter.passages;
      assert.equal(chapter.beautiful_typeset, true, edition.id);
      assert.equal(rows[0].beautiful_apparatus_only, true, source.id);
      assert.ok(rows.filter(row => row.beautiful_apparatus_only).length >= 6, source.id);
      for (const [position, description] of visualPassages.get(source.id) || []) {
        const html = rows[position - 1].beautiful_reading_block_html;
        const image = html.match(/<figure><img[^>]+src="\/(assets\/facsimiles\/camillo-1550-[a-z-]+-([0-9a-f]{16})\.png)"/);
        assert.ok(image, rows[position - 1].id);
        const contents = readFileSync(new URL(`../${image[1]}`, import.meta.url));
        assert.equal(contents.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(createHash('sha256').update(contents).digest('hex').slice(0,16), image[2]);
        assert.ok(html.includes(description));
        assert.equal(Boolean(rows[position - 1].beautiful_apparatus_only), false);
        if (edition === source) totalFigures++;
      }
    }
    const paragraphs = source.paragraphs.map((row, index) => index ? row : {...row, text:row.text + ' altered'});
    assert.deepEqual(publicSourceFormatting(source, {...source, paragraphs}, camillo.id), {});
  }
  assert.equal(totalFigures, 4);
});

test('both reader layouts retain an image-only Camillo table as a selectable passage', () => {
  for (const reader of ['study-desk', 'study-field']) {
    const code = readFileSync(new URL(`../native/${reader}.mjs`, import.meta.url), 'utf8');
    const start = code.indexOf('function beautifulTypesetSource(');
    const end = code.indexOf('function beautifulTextPDFLabel(', start);
    assert.ok(end > start && start >= 0, reader);
    const typeset = new Function(`${code.slice(start,end)}\nreturn beautifulTypesetSource;`)();
    const element = (attributes = {}) => ({
      style:{}, dataset:{}, textContent:'', childElementCount:1, append(){}, remove(){},
      getAttribute:name => attributes[name] ?? null,
      setAttribute:(name, value) => {attributes[name] = value;},
      removeAttribute:name => {delete attributes[name];},
    });
    const address = {...element(), textContent:'21'};
    const figure = {
      tagName:'FIGURE', textContent:'', matches:() => false, hasAttribute:() => false,
      querySelector:selector => selector === 'img' ? {} : null,
      getBoundingClientRect:() => ({top:50, bottom:140}),
    };
    const container = {...element(), children:[figure], querySelector:() => null, querySelectorAll:() => []};
    const article = {...element({'aria-pressed':'true'}), dataset:{refId:'RAW_LIDT_ILCO:P0021'},
      querySelector:selector => selector.endsWith('passage-text') ? container : address};
    const rails = [];
    const source = {...element(),
      dataset:{beautifulTypesetReady:'true'}, classList:{add(){}, remove(){}}, isConnected:true,
      getBoundingClientRect:() => ({top:10}), closest:() => null,
      querySelectorAll:() => [{querySelector:selector => selector === ':scope>.passage' ? article : null}],
      ownerDocument:{
        createElement:() => element(), createTreeWalker:() => ({nextNode:() => null}), createRange:() => ({}),
        defaultView:{getComputedStyle:() => ({paddingLeft:'20px'})},
      },
      append:node => rails.push(node),
    };
    typeset(source);
    assert.equal(address.style.top, '40px', reader);
    assert.equal(rails[0].hidden, false, reader);
    assert.equal(rails[0].dataset.passageId, article.dataset.refId, reader);
  }
});
