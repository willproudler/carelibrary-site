import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildAtlasModel} from '../discover-atlas.mjs';
import {savedLateralSamples} from '../discover-experiments.mjs';
import {incoming} from '../library-core.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/library.json',import.meta.url)));
test('every map edge is supported by saved claim or passage references',()=>{
 const {index,nodes,edges}=buildAtlasModel(data);
 assert.equal(nodes.size,133);
 for(const edge of edges.values()){
  assert.ok(nodes.has(edge.source));assert.ok(nodes.has(edge.target));assert.ok(edge.references.length);
  for(const ref of edge.references)assert.ok(incoming(index.nodes.get(ref.target)).some(link=>link.id===ref.source));
 }
});
test('lateral previews preserve actual saved wording and reference identities',()=>{
 const items=new Map(data.lateral.sections.flatMap(section=>section.items).map(item=>[item.id,item]));
 for(const sample of savedLateralSamples(data)){
  assert.equal(sample.text,items.get(sample.id).text);assert.deepEqual(sample.refs,items.get(sample.id).refs);
 }
});
