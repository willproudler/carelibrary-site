import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {publicSourceDisplayTitle, publicSourceFormatting} from '../native/source-opening-views.mjs';

const data = JSON.parse(readFileSync(new URL('../data/library.json',import.meta.url)));
const digest = () => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const before = digest(), adapter = createPublicReaderAdapter(data);
const monas = data.works.find(work=>work.id === 'WORK_MONAS_HIEROGLYPHICA_JOHN_DEE');
const english = work => ({readingLanguages:{[work.id]:'en'}});
const original = work => ({readingLanguages:{[work.id]:'original'}});

test('every saved English chapter title is shared by its header, jump menu and language popup',()=>{
  for(const work of data.works){
    const state = english(work), stack = adapter.stack(work.id,state);
    for(const source of work.sources){
      const variant = source.translations?.find(row=>row.language_code === 'en');
      if(!variant)continue;
      const chapter = adapter.chapter(source.id,state);
      assert.equal(stack.chapters.find(row=>row.id === source.id).title,chapter.title,source.id);
      assert.equal(chapter.source_versions.title,chapter.title,source.id);
      assert.equal(adapter.stack(work.id,{...state,rawUnitId:source.id}).active_chapter.title,chapter.title,source.id);
      const originalTitle = adapter.chapter(source.id,original(work)).title, label = publicSourceDisplayTitle(source,work.id) || source.original_title || source.title;
      assert.ok(originalTitle === label || originalTitle.endsWith(' · ' + label.replace(/\.$/,'')),source.id);
    }
    for(const unit of work.units){
      const variant = unit.translations?.find(row=>row.language_code === 'en');
      if(!variant)continue;
      const projected = adapter.unit(unit.id,state);
      assert.equal(stack.sheet_options[unit.layer].find(row=>row.id === unit.id).title,projected.title,unit.id);
      assert.equal(projected.identity.title,projected.title,unit.id);
      assert.equal(projected.sheet_versions.title,projected.title,unit.id);
      assert.deepEqual(projected.sections.map(row=>row.name),variant.sections.map(row=>row.name),unit.id);
      const originalTitle = adapter.unit(unit.id,original(work)).title, label = (unit.layer === 'CH' && publicSourceDisplayTitle(work.sources.find(source => source.chapter_id === unit.id),work.id)) || unit.original_title || unit.title;
      assert.ok(originalTitle === label || unit.layer === 'CH' && originalTitle.endsWith(' · ' + label.replace(/\.$/,'')),unit.id);
      assert.deepEqual(adapter.unit(unit.id,original(work)).sections.map(row=>row.name),unit.sections.map(row=>row.original_name || row.name),unit.id);
    }
  }
});

test('cluster and metacluster headings use the English book name and restore the original',()=>{
  for(const work of data.works){
    if(!work.original_title)continue;
    const name = work === monas ? 'The Hieroglyphic Monad' : work.title;
    for(const unit of work.units){
      const kicker = unit.identity?.kicker;
      if(!kicker?.includes(work.original_title) || name === work.original_title)continue;
      assert.equal(adapter.unit(unit.id,english(work)).identity.kicker,kicker.split(work.original_title).join(name),unit.id);
      assert.equal(adapter.unit(unit.id,original(work)).identity.kicker,kicker,unit.id);
    }
  }
  if(monas){
    assert.equal(adapter.stack(monas.id,english(monas)).work.title,'The Hieroglyphic Monad');
    assert.equal(adapter.stack(monas.id,original(monas)).work.title,'Monas Hieroglyphica');
  }
});

test('the attested Monas edition opens on its printed dedication and preserves canonical routing', {skip:!monas}, () => {
  const source = monas.sources[0];
  assert.equal(source.id, 'RAW_MHON_FROM');
  const opening = source.id + ':P0019';
  assert.equal(source.title, 'Front matter');
  assert.equal(publicSourceDisplayTitle({...source,text:source.text + ' Changed'},monas.id),'');
  for (const state of [english(monas), original(monas)]) {
    const chapter = adapter.chapter(source.id,state);
    assert.equal(chapter.title,'Dedication to Maximilian');
    assert.equal(chapter.beautiful_opening_passage_id,opening);
    const visibleTitle = chapter.passages.find(row => row.id === opening);
    assert.ok(visibleTitle.beautiful_reading_block_html.startsWith('<article class="care-reading-text"><h2>'));
    const engraving = chapter.passages.find(row => row.beautiful_title_page_role === 'engraving');
    assert.ok(engraving.beautiful_reading_block_html.includes('data:image/png;base64,'));
    assert.equal(chapter.passages[28].beautiful_apparatus_only,true);
    const registered = source.paragraphs.find(row => row.id === opening);
    assert.equal(visibleTitle.original_text,registered.text);
    assert.equal(adapter.card(opening,{state}).id,registered.id);
  }
  const edited = {...source,paragraphs:source.paragraphs.map((row,i) => i === 30 ? {...row,text:row.text + ' Changed'} : row)};
  assert.deepEqual(publicSourceFormatting(source,edited,monas.id),{});
});

test('the English Monas reader shows theorem headings without OCR spacing or Theory mistranslations',{skip:!monas},()=>{
  for(const [raw,care,title] of [
    ['RAW_MHON_TH_6','CH_MHON_TH_6','Theorem VII.'],
    ['RAW_MHON_T_13','CH_MHON_T_13','Theorem XVI.'],
    ['RAW_MHON_THER','CH_MHON_THER','Theorem XIX.'],
  ]){
    const chapter = adapter.chapter(raw,english(monas));
    assert.equal(chapter.title,title);
    assert.equal(chapter.passages[0].reading_text,title);
    assert.equal(chapter.passages[0].reading_block_html,`<article class="care-reading-text"><p>${title}</p></article>`);
    assert.equal(adapter.unit(care,english(monas)).title,title);
    const canonical = monas.sources.find(source=>source.id === raw), variant = canonical.translations.find(row=>row.language_code === 'en');
    assert.equal(chapter.passages[0].text,variant.paragraphs[0].text);
    assert.equal(adapter.chapter(raw,original(monas)).passages[0].reading_text,canonical.paragraphs[0].text);
  }
  const context = adapter.unit('CL_MHON_03',english(monas)).identity.context;
  assert.equal(context,'Theorem VI. · Theorem VII. · Theorem VIII.');
});

test('English Monas running headings are translated while page numbers and saved wording remain intact',{skip:!monas},()=>{
  const expectations = new Map([
    ['RAW_MHON_TH_5:DISPLAY-0006','MONAD'],
    ['RAW_MHON_T_16:DISPLAY-0004','68\u2003\u2003\u2003\u2003MONAD'],
    ['RAW_MHON_T_17:DISPLAY-0027','80\nMONAD'],
  ]);
  let count = 0;
  for(const source of monas.sources){
    const variant = source.translations.find(row=>row.language_code === 'en'), projected = adapter.chapter(source.id,english(monas));
    for(const [index,row] of variant.paragraphs.entries()){
      assert.equal(projected.passages[index].id,row.id);
      assert.equal(projected.passages[index].text,row.text);
      if(/^(?:\s*\d+\s+)?M\s*O\s*N\s*A\s*S\s*$/im.test(row.text)){
        count++;
        assert.doesNotMatch(projected.passages[index].reading_text,/^\s*(?:\d+\s+)?M\s*O\s*N\s*A\s*S\s*$/im);
      }
      if(expectations.has(row.id))assert.equal(projected.passages[index].reading_text,expectations.get(row.id));
    }
  }
  assert.equal(count,14);
});

test('heading presentation preserves all published records, saved prose and references',()=>{
  assert.equal(digest(),before);
});
