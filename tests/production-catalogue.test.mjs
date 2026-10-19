import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {indexLibrary,incoming,selectionFor} from '../library-core.mjs';
import {createPublicReaderAdapter} from '../public-reader-adapter.mjs';
import {createDiscoverController} from '../discover-reader.mjs';
import {buildAtlasModel,atlasView} from '../discover-atlas.mjs';
import {publicFields} from '../public-fields.mjs';

// These checks deliberately read the release catalogue. Historical examples
// remain separately pinned in fixtures/original-public-library.json.
const raw=readFileSync(new URL('../data/library.json',import.meta.url),'utf8');
const data=JSON.parse(raw);

test('the release catalogue has unique identities and every saved link stays in its published book',()=>{
 const index=indexLibrary(data),ids=new Set(),slugs=new Set();
 function register(node){assert.ok(node.id);assert.ok(!ids.has(node.id),`Duplicate identity ${node.id}`);ids.add(node.id);}
 for(const work of data.works){
  assert.ok(work.id&&work.slug);assert.ok(!slugs.has(work.slug));slugs.add(work.slug);
  assert.equal(index.works.get(work.slug),work);
  for(const source of work.sources){
   register(source);for(const paragraph of source.paragraphs)register(paragraph);
   if(source.chapter_id){const chapter=index.units.get(source.chapter_id);assert.equal(chapter?.layer,'CH');assert.equal(chapter?.work.id,work.id);}
  }
  for(const unit of work.units){
   register(unit);for(const section of unit.sections)for(const item of section.items)register(item);
   for(const parent of unit.parents||[])assert.equal(index.units.get(parent)?.work.id,work.id,`${unit.id} parent ${parent}`);
  }
 }
 if(data.lateral?.id){register(data.lateral);for(const section of data.lateral.sections)for(const item of section.items)register(item);}
 assert.equal(index.nodes.size,ids.size);
 for(const node of index.nodes.values())for(const link of incoming(node)){
  const target=index.nodes.get(link.id);assert.ok(target,`${node.id} -> ${link.id}`);
  if(node.work)assert.equal(target.work?.id,node.work.id,`${node.id} crosses a book boundary`);
 }
 function inspect(value){
  if(Array.isArray(value))return value.forEach(inspect);
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
   assert.ok(!['api_key','authorization','access_token','encrypted_api_key'].includes(key.toLowerCase()),`Private field ${key}`);
   if(typeof child==='string')assert.doesNotMatch(child,/\/Users\/|\/home\/|file:\/\//);
   else inspect(child);
  }
 }
 inspect(data);
});

test('every release source and CARE sheet projects its original text and declared identity',()=>{
 const adapter=createPublicReaderAdapter(data),before=JSON.stringify(data);
 assert.equal(adapter.works.length,data.works.length);
 for(const work of data.works){
  const state={readingLanguages:{[work.id]:'original'}};
  assert.equal(adapter.workFor(work.id).id,work.id);assert.equal(adapter.workFor(work.slug).id,work.id);
  for(const source of work.sources){
   const selected=selectionFor(work,source.id);assert.equal(selected.SOURCE.id,source.id);
   const chapter=adapter.chapter(source.id,state);
   assert.equal(chapter.raw_unit_id,source.id);
   assert.deepEqual(chapter.passages.map(row=>[row.id,row.text]),source.paragraphs.map(row=>[row.id,row.text]));
   const outline=adapter.outline(work.id,{id:source.id,layer:'SOURCE',request_id:'release-source'},state);
   assert.equal(outline.chapter.raw_unit_id,source.id);assert.equal(outline.error,undefined);
  }
  for(const unit of work.units){
   const selected=selectionFor(work,unit.id);assert.equal(selected[unit.layer].id,unit.id);
   const displayed=adapter.unit(unit.id,state);
   assert.deepEqual(displayed.sections.flatMap(section=>section.items.map(item=>[item.id,item.text])),unit.sections.flatMap(section=>section.items.map(item=>[item.id,item.text])));
   if(unit.identity){
    const {title,context,...identity}=displayed.identity, {title:originalTitle,context:originalContext,...canonicalIdentity}=unit.identity;
    assert.deepEqual(identity,canonicalIdentity);
    const chapter=work.sources.find(source=>source.chapter_id===unit.id), reading=chapter&&adapter.chapter(chapter.id,state);
    const label=unit.original_title || unit.title, contextual=/^[IVXLCDM\d]+\.?$/.test(label) && reading?.reading_title?.includes(' · ');
    assert.equal(title,contextual ? reading.reading_title : label);
    assert.equal(context,contextual && reading.reading_title_context || unit.identity.original_context || originalContext);
   }
   const outline=adapter.outline(work.id,{id:unit.id,layer:unit.layer,request_id:'release-sheet'},state);
   assert.equal(outline.unit.id,unit.id);assert.equal(outline.error,undefined);
  }
  const workspace=adapter.workspace({...state,workId:work.id});
  assert.equal(workspace.stack.work.id,work.id);
  assert.equal(workspace.stack.chapters.length,work.sources.length);
  assert.deepEqual(new Set(workspace.stack.care_path.map(unit=>unit.layer)),new Set(work.units.map(unit=>unit.layer)));
 }
 assert.equal(JSON.stringify(data),before);
});

test('release route cards and Discover choose existing references after edition replacement',()=>{
 const adapter=createPublicReaderAdapter(data),controller=createDiscoverController(data);
 for(const work of data.works){
  controller.open({book:work.slug});assert.equal(controller.status().workId,work.id);
  const payload=controller.payload();assert.equal(payload.stack.work.id,work.id);
  if(payload.reference)assert.equal(adapter.index.nodes.get(payload.reference.id)?.work?.id,work.id);
  const selected=[];
  for(const layer of new Set(work.units.map(unit=>unit.layer))){
   const unit=work.units.find(unit=>unit.layer===layer&&unit.sections.some(section=>section.items.length));
   const item=unit?.sections.flatMap(section=>section.items)[0];if(item)selected.push(item);
  }
  for(const item of selected){
   const route=adapter.reference(item.id,'incoming',{state:{readingLanguages:{[work.id]:'original'}}});
   assert.equal(route.id,item.id);
   for(const edge of route.route_edges){
    const source=adapter.index.nodes.get(edge.source_id),target=adapter.index.nodes.get(edge.target_id);
    assert.equal(source?.work?.id,work.id);assert.equal(target?.work?.id,work.id);
    assert.ok(incoming(target).some(link=>link.id===source.id));
   }
  }
 }
});

test('books remain usable when the catalogue has no saved lateral',()=>{
 const without=structuredClone(data);delete without.lateral;
 const adapter=createPublicReaderAdapter(without),model=buildAtlasModel(without),controller=createDiscoverController(without);
 assert.ok(!publicFields(without,adapter).some(field=>field.id===data.lateral?.id));
 for(const work of without.works){
  const payload=adapter.workspace({workId:work.id});assert.equal(payload.connection,null);
  assert.equal(payload.connection_options.length,0);
  const atlas=atlasView(without,model,{book:work.slug});
  assert.equal(atlas.lateral,false);assert.deepEqual(atlas.works.map(row=>row.id),[work.id]);
 }
 assert.throws(()=>controller.open({book:'lateral'}),/no longer published/);
});

test('published field files have the shelf identity and recorded content hash',()=>{
 for(const field of data.fields||[]){
  assert.match(field.bundle_url,/^\.\/data\/fields\/[a-f0-9]{16}-[a-f0-9]{16}\.json$/);
  const bytes=readFileSync(new URL('../'+field.bundle_url.slice(2),import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),field.bundle_sha256);
  const payload=JSON.parse(bytes);
  assert.equal(payload.bundle.id,field.id);assert.equal(payload.bundle.field,field.field);
  assert.deepEqual(payload.bundle.members.map(member=>member.work_id||member.id),field.members.map(member=>member.work_id||member.id));
  assert.equal(payload.stacks,undefined);
 }
});
