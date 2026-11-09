import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {fieldPayload} from '../public-fields.mjs';

function renderer(name, exports) {
  const source=readFileSync(new URL(`../native/${name}.mjs`,import.meta.url),'utf8');
  return new Function(source.replace('export default function(component)', 'function mount(component)')+`\nreturn {${exports}};`)();
}

const desk=renderer('study-desk','library,shelfDefaults,readingFileControls,sheetVersionControl');
const field=renderer('study-field','fieldReadingDownloadControls');

test('the public shelf shows available reading categories and the web Study sets entry',()=>{
  const payload={books:[{id:'work',title:'Example book',author:'Reader',layers:['WB']}],fields:[],web_study_sets:true};
  const markup=desk.library(payload,desk.shelfDefaults());
  for (const id of ['all','book','lateral','corpus']) assert.match(markup,new RegExp(`data-shelf-kind="${id}"`));
  assert.match(markup,/data-open-web-study-sets>Study sets/);
  assert.match(markup,/Example book/);
  assert.doesNotMatch(markup,/data-open-archive|data-portrait-open|data-library-selection-toggle|data-shelf-kind="(lecture|collection)"/);
  assert.doesNotMatch(desk.library({...payload,web_study_sets:false},desk.shelfDefaults()),/data-open-web-study-sets/);
});

test('the native shelf More menu opens available author and study set actions',()=>{
  const payload={books:[{id:'one',title:'First book',author:'First author',layers:['WB']},
    {id:'two',title:'Second book',author:'Second author',layers:['WB']}],fields:[],web_study_sets:true};
  const initial=desk.library(payload,desk.shelfDefaults());
  assert.match(initial,/data-shelf-actions/);
  assert.match(initial,/data-web-browse-authors/);
  assert.doesNotMatch(initial,/data-new-web-study-set/);
  const filtered=desk.library({...payload,web_study_set_actions:true},
    {...desk.shelfDefaults(),author:'Second author',filtersOpen:true});
  assert.match(filtered,/data-new-web-study-set/);
  assert.match(filtered,/Second book/);
  assert.doesNotMatch(filtered,/First book/);
});

test('published language menus offer saved renditions without source editing or translation creation',()=>{
  const work={public_reading_languages:{selected:'fr',options:[{code:'original',label:'Original texts'},{code:'fr',label:'French · 1/1 panes saved'}]}};
  const file=desk.readingFileControls(work);
  assert.match(file,/data-reading-language="original" aria-pressed="false"/);
  assert.match(file,/data-reading-language="fr" aria-pressed="true"/);
  assert.doesNotMatch(file,/data-reading-language="en"/);
  const pane=desk.sheetVersionControl({id:'source',title:'Example',type:'SOURCE',sheet_versions:{options:[{id:'original',label:'Original'},{id:'fr',label:'Saved French'}],can_translate:true,quotation_language_options:[]}},{});
  assert.match(pane,/data-sheet-version /);
  assert.match(pane,/Saved French/);
  assert.doesNotMatch(pane,/data-edit-source|data-translate-sheet|data-translate-quotations/);
});

test('published field payloads do not offer an unsupported download',()=>{
  const data=fieldPayload({bundle:{id:'published-corpus',field:'corpus',members:[],reading_downloads_available:true}}, {}, {fieldSaved:{reading_downloads_available:true}});
  assert.equal(field.fieldReadingDownloadControls(data.field),'');
});
