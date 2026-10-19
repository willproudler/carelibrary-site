import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {paneReadingTitle,paneTitle} from '../saved-translations.mjs';

function fixture() {
  const makeSource = (order,title,headings=[]) => ({
    id:`RAW_GARDEN_${order}`,chapter_id:`CH_GARDEN_${order}`,order,title,original_title:title,
    language_code:'fr',title_language_code:'en',
    paragraphs:[...headings.map((text,index)=>({id:`RAW_GARDEN_${order}:H${index}`,text:`## ${text}`,kind:'passage'})),
      {id:`RAW_GARDEN_${order}:P1`,text:'Une histoire inventée dans le jardin.',kind:'passage'}],
  });
  const sources=[makeSource(1,'1.',['Partie A','Histoires du jardin.','1.']),makeSource(2,'2.',['2.']),
    makeSource(3,'The pond'),makeSource(4,'1.',['1.']),makeSource(5,'2.',['2.'])];
  const english=[['Part A','Garden stories.','1.'],['2.'],[],['1.'],['2.']];
  for (const [index,source] of sources.entries()) source.translations=[{
    id:`EN_${source.id}`,language_code:'en',title:source.title,rendition_type:'machine',
    paragraphs:source.paragraphs.map((row,position)=>({...row,text:position<english[index].length?`## ${english[index][position]}`:'An invented story in the garden.'})),
  }];
  const units=sources.map(source=>({
    id:source.chapter_id,layer:'CH',order:source.order,title:source.title,original_title:source.title,
    language_code:'fr',title_language_code:'en',parents:[source.id],
    identity:{title:source.title,context:`Chapter ${source.order}`,original_context:`Chapitre ${source.order}`},
    sections:[{number:1,name:'Observation',items:[{id:`${source.chapter_id}:A1`,text:'An invented observation.',refs:[source.paragraphs.at(-1).id]}]}],
    translations:[{id:`EN_${source.chapter_id}`,language_code:'en',title:source.title,sections:[{number:1,name:'Observation',items:[{id:`${source.chapter_id}:A1`,text:'An invented observation.',refs:[source.paragraphs.at(-1).id]}]}]}],
  }));
  return {works:[{id:'GARDEN',slug:'garden',title:'Invented garden',language_code:'fr',sources,units}],lateral:{id:'XR_EMPTY',parents:[],sections:[]}};
}

test('explicit opening titles contextualize an uninterrupted numbered sequence across every reader label',()=>{
  const data=fixture(),before=structuredClone(data),adapter=createPublicReaderAdapter(data),stack=adapter.stack('GARDEN');
  assert.equal(stack.active_chapter.title,'Garden stories · 1');
  assert.equal(stack.active_chapter.reading_title,'Garden stories · 1');
  assert.equal(stack.active_chapter.reading_title_context,'Part A');
  assert.deepEqual(stack.active_chapter.reading_heading_titles,['Part A','Garden stories.','1.']);
  assert.deepEqual(stack.chapters.map(row=>row.title),['Garden stories · 1','Garden stories · 2','The pond','1.','2.']);
  assert.deepEqual(stack.sheet_options.CH.map(row=>row.title),stack.chapters.map(row=>row.title));
  assert.equal(adapter.unit('CH_GARDEN_2').identity.title,'Garden stories · 2');
  assert.equal(adapter.unit('CH_GARDEN_2').identity.context,'Part A');
  assert.equal(adapter.chapter('RAW_GARDEN_2').source_versions.title,'Garden stories · 2');
  assert.equal(adapter.unit('CH_GARDEN_2').sheet_versions.title,'Garden stories · 2');
  assert.equal(adapter.reference('RAW_GARDEN_2:P1').chapter_title,'Garden stories · 2');
  assert.deepEqual(adapter.chapter('RAW_GARDEN_2').reading_heading_titles,['2.']);
  assert.deepEqual(data,before);
});

test('source and CARE title choices respect their own selected language',()=>{
  const data=fixture(),adapter=createPublicReaderAdapter(data);
  const sourceOriginal={paneVersions:{RAW_GARDEN_2:'original'}};
  assert.equal(adapter.chapter('RAW_GARDEN_2',sourceOriginal).title,'Histoires du jardin · 2');
  assert.equal(adapter.chapter('RAW_GARDEN_2',sourceOriginal).reading_title_context,'Partie A');
  assert.equal(adapter.unit('CH_GARDEN_2',sourceOriginal).title,'Garden stories · 2');
  const careOriginal={paneVersions:{CH_GARDEN_2:'original'}};
  assert.equal(adapter.unit('CH_GARDEN_2',careOriginal).title,'Histoires du jardin · 2');
  assert.equal(adapter.unit('CH_GARDEN_2',careOriginal).identity.context,'Partie A');
  assert.equal(adapter.chapter('RAW_GARDEN_2',careOriginal).title,'Garden stories · 2');
});

test('verified source hierarchy supplies missing parents and uses explicit translated metadata',()=>{
  const data=fixture(),work=data.works[0],source=work.sources[3],english=source.translations[0];
  Object.assign(source,{source_title_context:'Les graines.',source_section_label:'1.',source_title_hierarchy:['Partie B']});
  Object.assign(english,{source_title_context:'The seeds.',source_section_label:'1.',source_title_hierarchy:['Part B']});
  const adapter=createPublicReaderAdapter(data);
  assert.equal(adapter.chapter(source.id).title,'The seeds · 1');
  assert.equal(adapter.chapter(source.id).reading_title_context,'Part B');
  assert.equal(adapter.unit(source.chapter_id).title,'The seeds · 1');
  assert.deepEqual(adapter.chapter(source.id).reading_heading_titles,['1.']);
  const original={paneVersions:{[source.id]:'original'}};
  assert.equal(adapter.chapter(source.id,original).title,'Les graines · 1');
  assert.equal(adapter.chapter(source.id,original).reading_title_context,'Partie B');
});

test('saved heading translations take precedence and verified original parents remain useful when untranslated',()=>{
  const data=fixture(),work=data.works[0],source=work.sources[1];
  Object.assign(source,{source_title_context:'Histoires du jardin.',source_section_label:'2.',source_title_hierarchy:['Partie A','Contexte sans traduction']});
  assert.equal(paneTitle(source,work),'Garden stories · 2');
  assert.equal(paneReadingTitle(source,work).reading_title_context,'Part A');
  const unknown=work.sources[3];
  Object.assign(unknown,{source_title_context:'Un titre inconnu.',source_section_label:'1.',source_title_hierarchy:['Partie A','Partie inconnue']});
  assert.equal(paneTitle(unknown,work),'Un titre inconnu · 1');
  assert.equal(paneReadingTitle(unknown,work).reading_title_context,'Part A');
  assert.deepEqual(paneReadingTitle(unknown,work).reading_heading_titles,['1.']);
  unknown.translations=[];
  assert.equal(paneTitle(unknown,work),'Un titre inconnu · 1','The exact verified parent remains available without a saved source translation');
  assert.equal(paneReadingTitle(unknown,work).reading_title_context,'Part A');
});

test('number resets, missing sequence members and prose do not invent parent chapters',()=>{
  const data=fixture(),work=data.works[0];
  work.sources[1].title='4.';work.sources[1].translations[0].title='4.';
  assert.equal(paneTitle(work.sources[1],work),'4.');
  work.sources[0].paragraphs.unshift({id:'RAW_PREFACE',text:'An invented introduction before a heading.'});
  work.sources[0].translations[0].paragraphs.unshift({id:'RAW_PREFACE',text:'An invented introduction before a heading.'});
  assert.equal(paneTitle(work.sources[0],work),'1.');
  assert.deepEqual(paneReadingTitle(work.sources[0],work).reading_heading_titles,[]);
});

test('authoritative parent changes and mismatched translated section metadata cannot borrow another chapter title',()=>{
  const data=fixture(),work=data.works[0],source=work.sources[1];
  Object.assign(source,{source_title_context:'Un autre parent.',source_section_label:'2.'});
  assert.equal(paneTitle(source,work),'Un autre parent · 2');
  Object.assign(source.translations[0],{source_title_context:'An unrelated section.',source_section_label:'9.'});
  assert.equal(paneTitle(source,work),'Un autre parent · 2');
});

test('original parent fallback folds only headings represented by the visible title and context',()=>{
  const data=fixture(),work=data.works[0],source=work.sources[3];
  Object.assign(source,{source_title_context:'Les graines.',source_section_label:'1.',source_title_hierarchy:['Partie A']});
  source.translations[0].paragraphs.unshift(
    {id:'EN_EXTRA_H1',text:'## Partie A'},
    {id:'EN_EXTRA_H2',text:'## An unrecorded English heading.'},
  );
  const before=structuredClone(data),adapter=createPublicReaderAdapter(data),chapter=adapter.chapter(source.id);
  assert.equal(chapter.title,'Les graines · 1');
  assert.equal(chapter.reading_title_context,'Part A');
  assert.deepEqual(chapter.reading_heading_titles,['1.']);
  assert.equal(adapter.unit(source.chapter_id).title,chapter.title);
  assert.equal(adapter.unit(source.chapter_id).identity.context,'Part A');
  assert.deepEqual(data,before);
  source.translations[0].paragraphs[0].text='## Part A';
  source.translations[0].paragraphs[1].text='## Les graines.';
  assert.deepEqual(paneReadingTitle(source,work).reading_heading_titles,['Part A','Les graines.','1.']);
});

test('descriptive and purely numerical fallback titles retain their words and represented headings',()=>{
  const work={id:'SIMPLE',language_code:'en',units:[],sources:[
    {id:'RAW_TITLE',title:'An invented title.',order:1,paragraphs:[{id:'H1',text:'An invented title.'},{id:'P1',text:'Original invented prose.'}]},
    {id:'RAW_NUMBER',title:'7.',order:2,paragraphs:[{id:'H7',text:'## 7.'},{id:'P7',text:'Further invented prose.'}]},
  ]};
  assert.equal(paneTitle(work.sources[0],work),'An invented title.');
  assert.deepEqual(paneReadingTitle(work.sources[0],work).reading_heading_titles,['An invented title.']);
  assert.equal(paneTitle(work.sources[1],work),'7.');
  assert.deepEqual(paneReadingTitle(work.sources[1],work).reading_heading_titles,['7.']);
});
