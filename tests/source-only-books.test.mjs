import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionFor} from '../library-core.mjs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';

const work = {
  id:'WORK_TEXT_ONLY',slug:'text-only',title:'An original text',author:'Example author',
  sources:[1,2].map(order=>({
    id:`RAW_TEXT_ONLY_${order}`,chapter_id:'',order,title:`Chapter ${order}`,
    paragraphs:[{id:`RAW_TEXT_ONLY_${order}:DISPLAY-0001`,text:`Original paragraph ${order}`,kind:'display'}],
  })),
  units:[],
};
const data = {works:[work],lateral:{id:'XR_EMPTY',parents:[],sections:[]}};

test('text-only books default to their first original chapter without fabricated sheets',()=>{
  const selected=selectionFor(work);
  assert.equal(selected.SOURCE.id,work.sources[0].id);
  assert.equal(selected.CH,undefined);
  const payload=createPublicReaderAdapter(data).workspace({workId:work.id});
  assert.equal(payload.stack.active_raw_unit_id,work.sources[0].id);
  assert.equal(payload.stack.active_unit_id,'');
  assert.deepEqual(payload.stack.care_path,[]);
  assert.deepEqual(payload.stack.active_chapter.passages.map(row=>row.text),['Original paragraph 1']);
});

test('text-only books retain the selected chapter and support its source outline',()=>{
  const adapter=createPublicReaderAdapter(data);
  const state=adapter.reduce({workId:work.id},'open_chapter',work.sources[1].id);
  const payload=adapter.workspace(state);
  assert.equal(payload.stack.active_raw_unit_id,work.sources[1].id);
  assert.deepEqual(payload.stack.active_chapter.passages.map(row=>row.text),['Original paragraph 2']);
  assert.equal(adapter.outline(work.id,{id:work.sources[1].id,layer:'SOURCE'}).chapter.raw_unit_id,work.sources[1].id);
  const route=adapter.reference(work.sources[1].paragraphs[0].id);
  assert.equal(route.text,'Original paragraph 2');
  assert.deepEqual(route.route_edges,[]);
});
