import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {indexLibrary,incoming,selectionFor,LAYERS,searchLibrary} from '../library-core.mjs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
const raw=fs.readFileSync(new URL('../data/library.json',import.meta.url),'utf8');
const data=JSON.parse(raw),index=indexLibrary(data);
test('the release contains only the two authorised books and their saved lateral',()=>{
 assert.deepEqual(data.works.map(w=>w.slug),['kant','hume']);assert.equal(data.lateral.id,'XR_KPR_THN');
 assert.deepEqual(data.lateral.parents,['WB_THN','WB_KPR']);
 assert.equal(data.works.reduce((n,w)=>n+w.units.length,0),70);
 assert.doesNotMatch(raw,/\/Users\/|api_key|apiKey|encrypted_api|access_token|Anna_s_Archive/);
 for(const n of index.nodes.values())assert.match(n.id,/^(?:(?:RAW|CH|CL|MC|WB)_(?:KPR|THN)(?:_|:|$)|XR_KPR_THN)/);
});
test('all saved references and lateral parent pins resolve inside the public versions',()=>{
 for(const n of index.nodes.values())for(const link of incoming(n))assert.ok(index.nodes.has(link.id),`${n.id} -> ${link.id}`);
 for(const p of data.lateral.pins){const n=index.nodes.get(p.unit_id);assert.equal(n.unit.revision,p.revision_id);assert.equal(n.work.seal,p.seal_id);}
});
test('every retained section and sheet can be selected without losing any layer',()=>{
 for(const w of data.works)for(const u of [...w.sources,...w.units]){
  const selected=selectionFor(w,u.id);for(const l of LAYERS)assert.ok(selected[l],u.id+' '+l);
  assert.equal(selected[u.layer||'SOURCE'].id,u.id);
  assert.equal(selected.SOURCE.chapter_id,selected.CH.id);
 }
});
test('the showcase branch consists of actual connected saved records',()=>{
 const sample=JSON.parse(fs.readFileSync(new URL('../data/showcase.json',import.meta.url)));
 for(const chain of Object.values(sample.chains))for(const [i,n] of chain.entries()){
  assert.equal(index.nodes.get(n.id).text,n.text);
  if(i)assert.ok(incoming(index.nodes.get(n.id)).some(l=>l.id===chain[i-1].id));
 }
});
test('Kant grounding preserves explicit unreviewed and unresolved results',()=>{
 const k=data.works[0];assert.equal(k.grounding.completed_chapters,20);assert.equal(k.grounding.claims,2692);
 assert.equal(k.grounding.aligned_claims,2669);assert.equal(k.grounding.unresolved_claims,23);
 let unresolved=0,edges=0;
 for(const u of k.units.filter(u=>u.layer==='CH'))for(const s of u.sections)for(const i of s.items){
  assert.equal(i.grounding.review,'unreviewed');
  if(i.grounding.type==='Unresolved'){unresolved++;assert.equal(i.passages.length,0);}else assert.ok(i.passages.length);
  for(const p of i.passages){assert.equal(p.review,'unreviewed');assert.equal(index.nodes.get(p.id).kind,'passage');edges++;}
 }
 assert.equal(unresolved,23);assert.equal(edges,4107);
 for(const s of k.sources)for(const p of s.paragraphs){assert.equal(p.kind,'passage');assert.match(p.id,/:P\d{4}$/);}
});
test('source and claim search returns real references without changing records',()=>{
 const found=searchLibrary(index,'absence of evidentially secure');assert.ok(found.some(n=>n.id==='CH_THN_INTR:AS1'));
 assert.equal(searchLibrary(index,'').length,0);assert.equal(searchLibrary(index,'zxqvnoexistent').length,0);
 assert.equal(JSON.stringify(data),JSON.stringify(JSON.parse(raw)));
});
test('native CARE projection retains all sheets and source paragraphs',()=>{
 const a=createPublicReaderAdapter(data);
 for(const w of data.works)for(const u of [...w.sources,...w.units]){
  const payload=a.workspace({workId:w.id,unitId:u.layer?u.id:'',rawUnitId:u.layer?'':u.id});
  assert.equal(payload.stack.care_path.length,4);assert.equal(payload.stack.chapters.length,w.sources.length);
  const expanded=a.outline(w.id,{id:u.id,layer:u.layer||'SOURCE',request_id:'check'});assert.ok(!expanded.error);
  if(u.layer)assert.deepEqual(expanded.unit.sections.flatMap(s=>s.items.map(i=>i.text)),u.sections.flatMap(s=>s.items.map(i=>i.text)));
  else assert.deepEqual(expanded.chapter.passages.map(p=>p.text),u.paragraphs.map(p=>p.text));
 }
 assert.throws(()=>a.workspace({workId:'private-work'}));
 assert.throws(()=>a.workspace({workId:'hume',unitId:'WB_KPR'}));
});
test('native routes use recorded edges, maintain book boundaries and expose both lateral parents',()=>{
 const a=createPublicReaderAdapter(data);
 for(const w of data.works){const id=w.units.find(u=>u.layer==='WB').sections[0].items[0].id,r=a.reference(id);
  assert.ok(r.route_layers.SOURCE.length);
  for(const edge of r.route_edges){assert.equal(index.nodes.get(edge.source_id).work.id,w.id);assert.equal(index.nodes.get(edge.target_id).work.id,w.id);assert.ok(incoming(index.nodes.get(edge.target_id)).some(l=>l.id===edge.source_id));}
 }
 const p=a.workspace({workId:'kant',connectionId:data.lateral.id,connectionReferenceId:data.lateral.sections[0].items[0].id});
 assert.equal(p.connection.members.length,2);assert.ok(p.connection.reference.route_edges.length);
 assert.deepEqual(new Set(Object.values(p.connection.reference.route_layers).flat().filter(n=>n.work_id).map(n=>n.work_id)),new Set(data.works.map(w=>w.id)));
 for(const kind of ['upload','generate','archive_book','delete']){const s={workId:'kant'};assert.equal(a.reduce(s,kind,{}),s);}
});
