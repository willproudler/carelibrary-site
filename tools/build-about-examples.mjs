// Read only published files; no model calls. Usage: node tools/build-about-examples.mjs [website-root] [output.json]
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
const scriptRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot=resolve(process.argv[2]||scriptRoot);
const outputPath=resolve(process.argv[3]||resolve(sourceRoot,'about-panel-data.json'));
const root=pathToFileURL(sourceRoot+'/');
const {createPublicReaderAdapter}=await import(new URL('public-reader-adapter.mjs',root));
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
async function readVerified(url,sha256){
 const path=new URL(url,root);
 if(path.protocol!=='file:'||!path.href.startsWith(root.href))throw Error('Published asset is outside website root.');
 const bytes=await readFile(path);
 if(createHash('sha256').update(bytes).digest('hex')!==sha256)throw Error('Published asset hash mismatch: '+url);
 return JSON.parse(bytes.toString('utf8'));
}
const catalogue=await read('data/catalogue.json'),routes=await read('book-routes.json');
const workIdFor=slug=>{const route=routes.books.find(r=>r.route_slug===slug||r.reader_slug===slug);if(!route)throw Error('Missing published book route: '+slug);return route.work_id;};
const assetFor=id=>catalogue.public_assets.works[id];
const workFor=async id=>readVerified(assetFor(id).url,assetFor(id).sha256);
const [meta,kant]=await Promise.all([workFor(workIdFor('aristotlemetaphysics')),workFor(workIdFor('kant'))]);
const humeId=workIdFor('hume');
const candidates=(catalogue.fields||[]).filter(f=>f.field==='lateral'&&[kant.id,humeId].every(id=>(f.members||[]).some(member=>[member.id,member.work_id].includes(id))));
if(candidates.length>64)throw Error('Too many registered Kant-Hume lateral candidates to select safely.');
let fieldInfo,field;
for(const candidate of candidates){const loaded=await readVerified(candidate.bundle_url,candidate.bundle_sha256);if(loaded.bundle?.panes?.some(pane=>pane.unit_id==='XR_KPR_THN')){fieldInfo=candidate;field=loaded;break;}}
if(!field)throw Error('The published Kant-Hume lateral with preserved unit XR_KPR_THN is unavailable.');
const adapter=createPublicReaderAdapter({works:[meta,kant]});
const clone=value=>structuredClone(value);
const deep=(book,params={})=>'/library.html#'+new URLSearchParams({book,...params});
const metadata=value=>Object.fromEntries(Object.entries(value||{}).filter(([key])=>!['sections','paragraphs','text'].includes(key)));
let verifiedClaims=0,verifiedPassages=0,preparedRoutes=0;

// Exact native packets repeat the same cards and stacks in many routes. Intern
// repeated objects, arrays and long strings; the browser only expands a chosen
// native packet and never imports the full catalogue or reading adapter.
function packetPool(){
 const shared={},ids=new Map();let counter=0;
 function pack(value){
  if(value===null||typeof value!=='object'&&typeof value!=='string')return value;
  if(typeof value==='string'&&value.length<96)return value;
  const result=typeof value==='string'?value:Array.isArray(value)?value.map(pack):Object.fromEntries(Object.entries(value).map(([key,row])=>[key,pack(row)]));
  const key=(typeof result==='string'?'s:':'o:')+JSON.stringify(result);
  let id=ids.get(key);
  if(!id){id='p'+(++counter).toString(36);ids.set(key,id);shared[id]=result;}
  return {$aboutRef:id};
 }
 return {shared,pack};
}
function basePayload(stack){return {mode:'workspace',studio_embed:true,workspace_managed:true,hide_xa:true,outline_available:true,
 stack,reference:null,route_mode:'incoming',route_history:{can_back:false,can_forward:false},selected_reference_id:'',selected_axiom:null,
 outline_units:[],bookmarks:[],favourite_axiom_ids:[],connection_options:[],discovery_books:[],connection:null};}
function items(unit){return (unit.sections||[]).flatMap(section=>section.items||[]);}
function collectCards(reference){
 return [reference,...(reference.built_from||[]),...(reference.used_by_same_sheet||[]),...(reference.used_by_elsewhere||[]),
 ...(reference.linked_axioms||[]),...(reference.source_passages||[]),...Object.values(reference.route_layers||{}).flat()]
 .filter(row=>row&&typeof row.id==='string');
}
function viewerCard(work,id){
 const node=adapter.index.nodes.get(id),row=adapter.card(id),citation=[node.work?.author,node.work?.title,id].filter(Boolean).join(', ')+'.';
 return {...row,scope:'',metadata:[row.author,row.work_title,row.chapter_title,row.is_translation?`${row.reading_language_name} · saved machine translation`:''].filter(Boolean),citation,citation_short:citation,citation_ibid:`Ibid., ${id}.`,destination:deep(work.slug,{ref:id}),
 sheet_destination:deep(work.slug,{[node.kind==='passage'?'source':'unit']:node.unit.id}),studio_route:{work:work.id},open_label:'Open Routes',favourite:false};
}
function buildBookPanel(work,key){
 const chosen=work.units.filter(unit=>unit.layer==='CH'&&unit.sections?.some(section=>section.items?.length)).slice(0,2);
 if(!chosen.length)throw Error('No published chapter reading: '+work.id);
 const sourceRows=chosen.map(unit=>work.sources.find(source=>source.chapter_id===unit.id)||work.sources.find(source=>unit.parents?.includes(source.id)));
 if(sourceRows.some(row=>!row))throw Error('A selected CARE chapter has no matching published source.');
 const sourceIds=new Set(sourceRows.map(row=>row.id));
 const unitIds=new Set(chosen.flatMap(unit=>adapter.stack(work.id,{unitId:unit.id}).care_path.map(row=>row.id)));
 const allowedSource=id=>sourceIds.has(id),allowedUnit=id=>unitIds.has(id);
 function boundedStack(state){
  const stack=clone(adapter.stack(work.id,state));
  stack.chapters=stack.chapters.filter(row=>allowedSource(row.raw_unit_id||row.id));
  stack.sheet_options=Object.fromEntries(Object.entries(stack.sheet_options).map(([layer,rows])=>[layer,rows.filter(row=>allowedUnit(row.id))]));
  // Only the two complete included chapters appear on source/CH sliders. Larger
  // saved sheets remain complete and are available through the real route path.
  if(stack.active_chapter&&!allowedSource(stack.active_chapter.raw_unit_id))stack.active_chapter=clone(adapter.chapter(sourceRows[0].id));
  stack.care_path=stack.care_path.filter(unit=>allowedUnit(unit.id));
  return stack;
 }
 const pool=packetPool(),explorer={format:'care-about-native-explorer/1',encoding:'object-intern/1',shared:pool.shared,
  sources:{},sheets:{},routes:{},references:{},outlines:{},initial:{source:sourceRows[0].id,chapter:chosen[0].id},
  scope:{source_ids:[...sourceIds],chapter_ids:chosen.map(unit=>unit.id),sheet_ids:[...unitIds],full_book_chapters:work.sources.length,
   description:'Two complete published source chapters and chapter readings, with their saved broader reading path. Further routes can continue in the Library.'}};
 const fullSources=new Map(),fullSheets=new Map();
 for(const source of sourceRows){
  const native=clone(adapter.chapter(source.id));fullSources.set(source.id,native);
  const rendition=source.translations?.find(row=>row.language_code==='en')||source;
  for(const passage of native.passages){if(passage.text!==rendition.paragraphs.find(row=>row.id===passage.id)?.text)throw Error('Changed source passage: '+passage.id);verifiedPassages++;}
  explorer.sources[source.id]=pool.pack(basePayload(boundedStack({rawUnitId:source.id})));
  explorer.outlines[source.id]=pool.pack(adapter.outline(work.id,{id:source.id,layer:'SOURCE'}));
 }
 for(const id of unitIds){
  const native=clone(adapter.unit(id)),original=work.units.find(row=>row.id===id),rendition=original.translations?.find(row=>row.language_code==='en')||original;
  const originalItems=new Map(rendition.sections.flatMap(section=>section.items).map(item=>[item.id,item]));
  for(const item of items(native)){if(item.text!==originalItems.get(item.id)?.text)throw Error('Changed saved claim: '+item.id);verifiedClaims++;}
  fullSheets.set(id,native);explorer.sheets[id]=pool.pack(basePayload(boundedStack({unitId:id})));
  const layer=id.startsWith('MC_')?`MC:${native.mc_level||'legacy'}`:native.type;
  explorer.outlines[id]=pool.pack(adapter.outline(work.id,{id,layer}));
 }
 const viewerIds=new Set([...fullSheets.values()].flatMap(unit=>items(unit).map(item=>item.id))),seedIds=new Set([...chosen.flatMap(unit=>items(fullSheets.get(unit.id)).map(item=>item.id)),...sourceRows.flatMap(source=>fullSources.get(source.id).passages.map(passage=>passage.id))]);
 for(const id of seedIds){
  const node=adapter.index.nodes.get(id),state=node.kind==='passage'?{rawUnitId:node.unit.id}:{unitId:node.unit.id};
  const stack=boundedStack(state);const packets={};
  for(const mode of node.kind==='passage'?['outgoing']:['incoming','outgoing','both']){
   const reference=adapter.reference(id,mode,{workId:work.id});
   for(const row of collectCards(reference))viewerIds.add(row.id);
   packets[mode]=pool.pack({...basePayload(stack),reference,route_mode:reference.route_mode,selected_reference_id:id});preparedRoutes++;
  }
  explorer.routes[id]=packets;
 }
 // All cards reachable in prepared routes can still open the unchanged native
 // axiom viewer. A deeper route not in this bounded packet opens in Library.
 for(const source of fullSources.values())for(const passage of source.passages)viewerIds.add(passage.id);
 for(const id of viewerIds)explorer.references[id]=pool.pack(viewerCard(work,id));
 explorer.scope.prepared_route_roots=Object.keys(explorer.routes).length;
 explorer.scope.viewer_cards=Object.keys(explorer.references).length;
 explorer.scope.route_policy='Every included complete sheet claim has its recorded native viewer card. Further routes not prepared in this finite sample continue in CARE Library.';
 const source=sourceRows[0],canonical=chosen[0],nativeSource=fullSources.get(source.id),nativeUnit=fullSheets.get(canonical.id);
 const initialStack=boundedStack({unitId:canonical.id});
 const sourcePayload=basePayload({...clone(initialStack),active_chapter:clone(nativeSource),care_path:[],active_unit_id:''});
 const chapterPayload=basePayload({...clone(initialStack),active_chapter:null,care_path:[clone(nativeUnit)]});
 const chapterHref=deep(work.slug,{unit:canonical.id});
 const panel={title:work.title+' · '+nativeUnit.title,href:chapterHref,sourceHref:deep(work.slug,{source:source.id}),chapterHref,claimHrefBase:deep(work.slug),
  source:sourcePayload,chapter:chapterPayload,explorer,
  provenance:{work_id:work.id,work_slug:work.slug,edition:work.edition||'MISSING',snapshot_asset:assetFor(work.id),
   source:{id:source.id,sha256:source.sha256,full_passage_count:nativeSource.passages.length,selected_passage_ids:nativeSource.passages.map(p=>p.id),
    canonical_paragraphs:clone(source.paragraphs.slice(0,1)),rendition:source.translations?.find(row=>row.language_code==='en')?metadata(source.translations.find(row=>row.language_code==='en')):{rendition_type:'canonical',model:'MISSING',created:'MISSING'}},
   chapter:{id:canonical.id,revision:canonical.revision||'MISSING',sha256:canonical.sha256||'MISSING',full_item_count:nativeUnit.item_count,
    selected_sections:nativeUnit.sections.map(section=>({number:section.number,name:section.name,shown:section.items.length,total:section.items.length})),
    rendition:canonical.translations?.find(row=>row.language_code==='en')?metadata(canonical.translations.find(row=>row.language_code==='en')):{rendition_type:'canonical',model:'MISSING',created:'MISSING'}},
   excerpt_policy:'Complete saved source and CARE chapter units. Navigation is bounded to two included source/CH chapters and their complete broader saved reading path. Every displayed initial claim and source passage has a prepared native route; further unprepared routes continue in Library.'}};
 if(key==='kant')delete panel.source;
 return panel;
}
console.log('Preparing complete Metaphysics native reading packets…');
const metaphysics=buildBookPanel(meta,'metaphysics');
console.log('Preparing complete Kant native reading packets…');
const kantPanel=buildBookPanel(kant,'kant');
console.log('Preparing preserved Kant × Hume native packets…');
const pane=field.bundle.panes.find(row=>row.unit_id==='XR_KPR_THN'),nativeUnit=clone(pane);
// The native desk addresses sheets by unit ID; retain the preserved field pane
// ID separately in provenance and scoped links. Claim IDs/text are unchanged.
nativeUnit.id=pane.unit_id;
delete nativeUnit.items;delete nativeUnit.variants;nativeUnit.item_count=items(nativeUnit).length;
const lateralBase='/library.html#'+new URLSearchParams({field:fieldInfo.id,scope:pane.id});
const lateralHref=lateralBase+'&'+new URLSearchParams({ref:items(nativeUnit)[0].id});
const lateralStack={work:{id:fieldInfo.id,title:fieldInfo.title,author:'Laterals'},edition_label:'',chapters:[],active_chapter:null,care_path:[nativeUnit],sheet_options:{XR:[{id:pane.unit_id,type:'XR',title:pane.title,available:true}]},active_raw_unit_id:'',active_unit_id:pane.unit_id};
const lateralPayload=basePayload(lateralStack),lateralPool=packetPool();
const lateralExplorer={format:'care-about-native-explorer/1',encoding:'object-intern/1',shared:lateralPool.shared,sources:{},sheets:{[pane.unit_id]:lateralPool.pack(lateralPayload)},routes:{},references:{},outlines:{},initial:{chapter:pane.unit_id},
 scope:{source_ids:[],chapter_ids:[pane.unit_id],sheet_ids:[pane.unit_id],description:'The complete saved Kant × Hume lateral and its preserved recorded route packets.'}};
for(const item of items(nativeUnit)){
 const original=pane.items.find(row=>row.id===item.id);
 if(item.text!==original?.text||item.reading_text!==original?.reading_text)throw Error('Changed preserved lateral claim: '+item.id);verifiedClaims++;
}
for(const [key,reference] of Object.entries(field.references||{})){
 if(!reference?.id)continue;
 const scope=reference.source_pane||key.slice(0,key.lastIndexOf('|'));
 // Keep the preserved scope on each native card. Cross-pane identities are not
 // remapped to the latest book revision.
 const destination='/library.html#'+new URLSearchParams({field:fieldInfo.id,scope,ref:reference.id});
 const citation=[reference.work_title||fieldInfo.title,reference.id].filter(Boolean).join(', ')+'.';
 const card={...clone(reference),scope,metadata:[reference.metadata].filter(Boolean),citation,citation_short:citation,citation_ibid:`Ibid., ${reference.id}.`,destination,sheet_destination:destination,open_label:'Open Routes'};
 lateralExplorer.references[reference.id]=lateralPool.pack(card);
 const route={...clone(reference),available_route_modes:['incoming'],has_outgoing:false};
 lateralExplorer.routes[reference.id]={incoming:lateralPool.pack({...clone(lateralPayload),reference:route,route_mode:reference.route_mode||'incoming',selected_reference_id:reference.id})};preparedRoutes++;
}
const lateral={title:'Kant × Hume',href:lateralHref,chapterHref:lateralHref,claimHrefBase:lateralBase,chapter:lateralPayload,explorer:lateralExplorer,
 provenance:{field_id:fieldInfo.id,field_revision:fieldInfo.revision,bundle_sha256:fieldInfo.bundle_sha256,snapshot_asset:{url:fieldInfo.bundle_url,sha256:fieldInfo.bundle_sha256},pane_id:pane.id,unit_id:pane.unit_id,version:pane.version,
 generation_model:'MISSING',generation_date:'MISSING',unit_sha256:'MISSING',full_item_count:pane.items.length,
 selected_sections:nativeUnit.sections.map(section=>({number:section.number,name:section.name,shown:section.items.length,total:section.items.length})),excerpt_policy:'Complete unchanged preserved lateral unit and original recorded reference packets. Recorded source-pane identities remain preserved.'}};
const data={schema:'care-about-panels/1',snapshot:{path:'published website export',exported:catalogue.exported,public_revision:catalogue.public_assets.revision},panels:{metaphysics,kant:kantPanel,lateral}};
const panelStats={};
for(const [key,panel] of Object.entries(data.panels)){
 const explorer=panel.explorer,raw=JSON.stringify(explorer),compressed=gzipSync(raw,{level:9});
 if(gunzipSync(compressed).toString('utf8')!==raw)throw Error('Native packet compression changed data.');
 panelStats[key]={href:panel.href,initial_claims:panel.chapter.stack.care_path[0].item_count,source_chapters:Object.keys(explorer.sources).length,sheets:Object.keys(explorer.sheets).length,route_roots:Object.keys(explorer.routes).length,viewer_cards:Object.keys(explorer.references).length,shared_records:Object.keys(explorer.shared).length,raw_explorer_bytes:Buffer.byteLength(raw),gzip_bytes:compressed.length};
 panel.explorer={format:explorer.format,encoding:'object-intern-gzip/1',gzip:compressed.toString('base64'),uncompressed_bytes:Buffer.byteLength(raw),initial:explorer.initial,scope:explorer.scope};
}
const output=JSON.stringify(data)+'\n',bytes=Buffer.byteLength(output);
if(bytes>6*1024*1024)throw Error(`Native About examples exceed 6MiB (${bytes}bytes).`);
await writeFile(outputPath,output);
console.log(JSON.stringify({bytes,asset_hashes_verified:3,verbatim_claims_verified:verifiedClaims,verbatim_source_passages_verified:verifiedPassages,prepared_native_routes:preparedRoutes,panels:panelStats},null,2));
