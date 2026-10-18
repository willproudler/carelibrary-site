import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../native/study-desk.mjs',import.meta.url),'utf8');
const body=source.slice(source.indexOf('function sourcePane('),source.indexOf('\nfunction traceLabel('));
const render=new Function('arr','esc','isRouteReference','paneSlider','sheetVersionTrigger','sourceTranslationSheet','beautifulSourceDetail',`${body};return sourcePane;`)(
 value=>Array.isArray(value)?value:[],value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),()=>false,()=>'',()=>'',value=>value,()=>false);
const pane=(route_available,rendition)=>render({active_chapter:{raw_unit_id:'RAW_CHAPTER',title:'Chapter',source_rendition_type:rendition,passages:[{id:'TRANSLATED_ROW',text:'English reading',route_available}]}},'',null);

test('unaligned translated paragraphs are readable without invented route controls',()=>{
 const html=pane(false,'supplied');
 assert.match(html,/English reading/);assert.match(html,/SUPPLIED TRANSLATION/);
 assert.doesNotMatch(html,/data-select-passage|data-ref-id|data-open-passage-routes/);
});

test('aligned passages retain route controls and accurate translation labels',()=>{
 const html=pane(true,'machine');
 assert.match(html,/MACHINE TRANSLATION/);assert.match(html,/data-select-passage="TRANSLATED_ROW"/);assert.match(html,/data-open-passage-routes/);
 assert.match(pane(undefined,'original'),/EXACT SOURCE/);
});
