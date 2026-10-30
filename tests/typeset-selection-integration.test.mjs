import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('clearing a source passage in a comparison clears its public selection state', async () => {
  const source=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
  const start=source.indexOf(' async function dispatchField(field,action){');
  const end=source.indexOf('\n function toggleFavourite(',start);
  assert.ok(start>=0&&end>start);
  const calls=[];
  const dispatch=new Function('paintFieldViewer',`
    let state={fieldSelected:{id:'RAW_GARDEN:P1',kind:'passage'}};
    ${source.slice(start,end)}
    return async action=>{await dispatchField({id:'FIELD_GARDEN'},action);return state};
  `)(field=>calls.push(field.id));
  assert.equal((await dispatch({type:'selected_axiom',value:null})).fieldSelected,null);
  assert.deepEqual((await dispatch({type:'selected_axiom',value:{passage_id:'RAW_GARDEN:P2',work_id:'WORK_GARDEN'}})).fieldSelected,
    {id:'RAW_GARDEN:P2',source_pane:'',work_id:'WORK_GARDEN',kind:'passage'});
  assert.equal((await dispatch({type:'selected_axiom',value:{work_id:'WORK_GARDEN'}})).fieldSelected,null);
  assert.deepEqual(calls,['FIELD_GARDEN','FIELD_GARDEN','FIELD_GARDEN']);
});
