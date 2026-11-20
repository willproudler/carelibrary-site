import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {publicSourceDisplayTitle, publicSourceFormatting} from '../native/source-opening-views.mjs';

const data = JSON.parse(readFileSync(new URL('../data/library.json',import.meta.url)));
const work = data.works.find(row=>row.id==='WORK_MONAS_HIEROGLYPHICA_JOHN_DEE');
const adapter = createPublicReaderAdapter(data);
const headings = [
  'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII',
  'XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV',
];
const workLanguage = language => ({readingLanguages:{[work.id]:language}});

test('all 24 attested Monas titles agree in Source, CH and navigation while saved renditions stay exact',{skip:!work},()=>{
  assert.equal(work.sources.length,25);
  const canonicalCatalogue=JSON.stringify(work);
  for (const [ordinal, source] of work.sources.slice(1).entries()) {
    const expected='Theorem '+headings[ordinal]+'.';
    assert.equal(publicSourceDisplayTitle(source,work.id),expected,source.id);
    for (const [language, edition] of [['original',source],['en',source.translations.find(row=>row.language_code==='en')]]) {
      const state=workLanguage(language);
      const chapter=adapter.chapter(source.id,state);
      const unit=adapter.unit(source.chapter_id,state);
      const stack=adapter.stack(work.id,{...state,rawUnitId:source.id});
      assert.equal(chapter.title,expected,source.id);
      assert.equal(chapter.source_versions.title,expected,source.id);
      assert.equal(unit.identity.title,expected,source.chapter_id);
      assert.equal(unit.sheet_versions.title,expected,source.chapter_id);
      assert.equal(stack.active_chapter.title,expected,source.id);
      assert.equal(stack.chapters.find(row=>row.id===source.id).title,expected,source.id);
      assert.equal(stack.sheet_options.CH.find(row=>row.id===source.chapter_id).title,expected,source.id);
      assert.deepEqual(chapter.passages.map(({id,text})=>({id,text})),
        edition.paragraphs.map(({id,text})=>({id,text})),source.id);
    }
  }
  assert.equal(JSON.stringify(work),canonicalCatalogue);
});

test('Monas facsimile views preserve attested figures, routes and reading order',{skip:!work},()=>{
  const expectations = new Map([
    ['RAW_MHON_THEI',{figures:0,joins:[],archive:[2,4,5,6]}],
    ['RAW_MHON_TH_3',{figures:1,joins:[[5,2],[7,5]],archive:[4,6,8,9]}],
    ['RAW_MHON_TH_5',{figures:1,joins:[[4,2],[7,4]],archive:[5,6]}],
    ['RAW_MHON_TH_8',{figures:2,joins:[[4,2],[8,4],[10,8]],archive:[5,6,7]}],
  ]);
  for (const [id, expected] of expectations) {
    const source=work.sources.find(row=>row.id===id);
    for (const language of ['original','en']) {
      const chapter=adapter.chapter(id,workLanguage(language));
      const rows=chapter.passages;
      assert.equal(chapter.beautiful_typeset,true,id);
      const figures=rows.filter(row=>row.beautiful_inline_figure);
      assert.equal(figures.length,expected.figures,id);
      for (const row of figures) assert.match(row.beautiful_reading_block_html,/<figure>.*<img[^>]+data:image\/png;base64,/s);
      for (const [right,left] of expected.joins) assert.equal(rows[right-1].beautiful_join_previous,rows[left-1].id,id);
      for (const position of expected.archive) assert.equal(rows[position-1].beautiful_apparatus_only,true,id);
      for (const row of rows.filter(row=>row.beautiful_apparatus_only)) {
        assert.equal(row.trace_count,0,`${row.id} has a public trace and must stay readable`);
      }
    }
    const edited={...source,paragraphs:source.paragraphs.map((row,index)=>index===0?{...row,text:row.text+' altered'}:row)};
    assert.deepEqual(publicSourceFormatting(source,edited,work.id),{});
    assert.equal(publicSourceDisplayTitle({...source,text:source.text+' altered'},work.id),'');
  }
});

test('retained chapter rails use the mounted theorem in both public readers',()=>{
  for (const reader of ['study-desk','study-field']) {
    const code=readFileSync(new URL('../native/'+reader+'.mjs',import.meta.url),'utf8');
    const snippet=(from,to)=>{
      const start=code.indexOf(from),end=code.indexOf(to,start+from.length);
      assert.ok(start>=0&&end>start,reader);
      return code.slice(start,end);
    };
    const exercise=new Function(`
      const options=[{id:'CH_I',title:'Theorem I.'},{id:'CH_III',title:'Theorem III.'}];
      const sliderHeadingOriginals=new WeakMap(),sliderTitle=option=>option.title;
      const paneSimpleTitle=sliderTitle,sliderStopLabel=sliderTitle;
      const sliderOptions=()=>options,sliderMemoryKey=()=>'CH';
      ${snippet('function paintSliderHeading(', 'function keepSliderVisible(')}
      let heading,body;
      const mount=(id,title)=>{
        heading={textContent:title};
        body={dataset:{readingId:id}};
      };
      const pane={querySelector:selector=>selector==='[data-reading-id]'?body:
        selector==='[data-slider-preview-title]'?heading:null};
      const input={value:'0',dataset:{sheetSlider:'CH'},closest:selector=>selector==='[data-pane]'?pane:null};
      const root={querySelectorAll:()=>[input]};
      const runtime={sliderScrollPositions:new Map(),paintSlider(target,index){
        target.value=String(index);
        paintSliderHeading(input,options[index],index);
      }};
      ${snippet('  runtime.refreshSliders=(scope=root)=>','  runtime.attachPaneKeyFocus=()=>')}
      mount('CH_III','Theorem III. · Saved reading');
      runtime.refreshSliders();
      const retained=[input.value,heading.textContent];
      mount('CH_I','Theorem I. · Saved reading');
      runtime.refreshSliders();
      paintSliderHeading(input,options[1],1);
      const preview=heading.textContent;
      paintSliderHeading(input,options[0],0);
      return {retained,preview,restored:heading.textContent};
    `);
    assert.deepEqual(exercise(),{
      retained:['1','Theorem III. · Saved reading'],preview:'Theorem III.',restored:'Theorem I. · Saved reading',
    },reader);
  }
});
