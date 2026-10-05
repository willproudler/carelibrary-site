import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {publicReadingText} from '../native/reading-views.mjs';

const data=JSON.parse(readFileSync(new URL('../data/library.json',import.meta.url)));

test('every public CARE sheet uses clean prose without changing canonical text or routes',()=>{
  const original=JSON.stringify(data),adapter=createPublicReaderAdapter(data);
  let count=0;
  for(const source of [...data.works.flatMap(work=>work.units),data.lateral]){
    const display=adapter.unit(source.id);
    for(const [sectionIndex,section] of source.sections.entries()){
      for(const [position,item] of section.items.entries()){
        const projected=display.sections[sectionIndex].items[position];
        assert.equal(projected.text,item.text);
        assert.deepEqual(projected.source_trace,item.refs);
        assert.doesNotMatch(projected.reading_text,/^\[(?:Persistent|Mutating|Attractor|Emergent|Terminal)\]|\n(?:Relation Type|Inheritance Type|Source Trace)\s*[—:]/);
        const card=adapter.card(item.id);
        assert.equal(card.text,item.text);
        assert.equal(card.reading_text,projected.reading_text);
        if(projected.reading_text!==item.text)count++;
      }
    }
  }
  assert.ok(count>700);
  assert.equal(JSON.stringify(data),original);
});

test('saved translation cleanup is pinned to its exact original wording',()=>{
  let checked=0;
  function visit(value){
    if(Array.isArray(value))return value.forEach(visit);
    if(!value||typeof value!=='object')return;
    if(value.id&&value.text?.startsWith('[Mutating]')){
      assert.ok(!publicReadingText(value).startsWith('[Mutating]'));
      assert.equal(publicReadingText({...value,text:'A newly revised claim.'}),'A newly revised claim.');
      checked++;
    }
    Object.values(value).forEach(visit);
  }
  visit(data);
  assert.ok(checked>0);
});
