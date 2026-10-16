import test from 'node:test';
import assert from 'node:assert/strict';
import {featuredLateral,publishedLateralSamples} from '../discover-experiments.mjs';
import {discoverInitialReading,discoverChoices} from '../discover-reader.mjs';

test('changing the featured lateral updates its box without changing the book default',()=>{
  const fields=[{id:'OLDER',field:'lateral'},{id:'NEWER',field:'lateral'},{id:'CORPUS',field:'corpus'}];
  const data={works:[{id:'HUME',slug:'hume',title:'Treatise'}],fields};
  for(const id of ['NEWER','OLDER']){
    data.featured_reading={type:'field',id};
    assert.equal(featuredLateral(data).id,id);
    assert.deepEqual(discoverInitialReading(data),{book:'hume'});
    assert.deepEqual(discoverChoices(data).map(choice=>choice.id),['HUME']);
  }
  for(const id of ['MISSING','CORPUS']){
    data.featured_reading={type:'field',id};assert.equal(featuredLateral(data).id,'NEWER');
  }
  assert.equal(featuredLateral({fields:[fields[2]]}),null);
});

test('the Hume–Kant preview reads the latest published analysis, not the historic example text',()=>{
  const ids=['XR_KPR_THN:DRT-01','XR_KPR_THN:TLC-02','XR_KPR_THN:SCF-02'];
  const field={bundle:{panes:[{id:'diagnosis',layer:'XR',items:ids.map((id,i)=>({id,text:'Raw text',reading_text:`Latest saved claim ${i}`,source_trace:['WB_HUME:01']}))}]}};
  const samples=publishedLateralSamples(field);
  assert.deepEqual(samples.map(sample=>sample.label),['Agreement','Difference','New work']);
  assert.deepEqual(samples.map(sample=>sample.explanation),ids.map((_,i)=>`Latest saved claim ${i}`));
  assert.ok(samples.every(sample=>sample.pane==='diagnosis'));
});

test('other published laterals use their own sections and exclude parent-book text',()=>{
  const field={bundle:{panes:[{id:'parent',layer:'WB',items:[{id:'PRIVATE',text:'Parent text'}]},
    {id:'comparison',layer:'XR',items:[{id:'one',section_name:'Relations',text:'Saved relationship'},
      {id:'two',section_name:'Relations',text:'Second relationship'},{id:'three',section_name:'Possibilities',text:'Saved possibility'}]}]}};
  assert.deepEqual(publishedLateralSamples(field).map(sample=>[sample.id,sample.label]),[['one','Relations'],['three','Possibilities']]);
  assert.deepEqual(publishedLateralSamples({bundle:{panes:[]}}),[]);
});
