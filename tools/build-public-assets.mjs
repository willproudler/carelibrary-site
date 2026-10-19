/* Build browser delivery files from the unchanged, reviewed public export. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {materializePublicLibrary} from './materialize-public-library.mjs';

const encode=value=>JSON.stringify(value)+'\n';
const digest=value=>createHash('sha256').update(value).digest('hex');
const rows=value=>Array.isArray(value)?value:[];
const sourceCoverURL=/^\.\/assets\/covers\/[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp)$/i;
const deliveryCoverURL=/^\.\/assets\/covers\/web\/cover-([a-f0-9]{24})\.webp$/;

export async function validateCoverVariants(root,manifest) {
  if(manifest?.version!==1||!manifest.covers||typeof manifest.covers!=='object'||Array.isArray(manifest.covers))throw Error('Invalid cover delivery manifest.');
  const covers=Object.create(null),coverRoot=await realpath(resolve(root,'assets/covers'));
  for(const [source,variant] of Object.entries(manifest.covers)){
    const match=deliveryCoverURL.exec(variant?.url||'');
    if(!sourceCoverURL.test(source)||!match)throw Error('Cover delivery paths must stay inside the public covers directory.');
    const sourcePath=await realpath(resolve(root,source)),targetPath=await realpath(resolve(root,variant.url));
    if(!sourcePath.startsWith(coverRoot+'/')||!targetPath.startsWith(coverRoot+'/'))throw Error('Cover delivery paths must stay inside the public covers directory.');
    const [original,delivered]=await Promise.all([readFile(sourcePath),readFile(targetPath)]);
    if(digest(original)!==variant.source_sha256||digest(delivered)!==variant.sha256||!variant.sha256.startsWith(match[1])||delivered.length!==variant.bytes)throw Error('A generated cover changed. Regenerate the web cover copies before publishing.');
    if(!Number.isInteger(variant.width)||!Number.isInteger(variant.height)||Math.min(variant.width,variant.height)<1||Math.max(variant.width,variant.height)>600)throw Error('A generated cover exceeds its delivery size.');
    covers[source]=variant.url;
  }
  return covers;
}

function deliveryCovers(value,variants) {
  if(Array.isArray(value))return value.map(row=>deliveryCovers(row,variants));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='cover_url'&&variants[child]?variants[child]:deliveryCovers(child,variants)]));
}

function paneHeader(pane) {
  const {text,sections,paragraphs,translations,...header}=pane;
  return {...header,...(sections?{sections:[]}:{}),...(paragraphs?{paragraphs:[]}:{}),
    ...(translations?{translations:rows(translations).map(paneHeader)}:{})};
}

export function createPublicAssetPlan(data,{coverVariants={}}={}) {
  if(!Array.isArray(data.works))throw Error('The public export has no works.');
  if(Object.keys(coverVariants).length)data=deliveryCovers(data,coverVariants);
  const files=new Map(),owners=Object.create(null),workIds=new Set(),slugs=new Set();
  const addFile=(kind,value)=>{
    const content=encode(value),sha256=digest(content),url=`./data/chunks/${kind}-${sha256.slice(0,24)}.json`;
    files.set(url,content);return {url,sha256,bytes:Buffer.byteLength(content)};
  };
  const register=(id,owner)=>{
    if(typeof id!=='string'||!id||Object.hasOwn(owners,id))throw Error(`Invalid or duplicate public identity: ${id}`);
    owners[id]=owner;
  };
  for(const work of data.works){
    if(!work.id||!work.slug||workIds.has(work.id)||slugs.has(work.slug))throw Error('Public books must have unique IDs and slugs.');
    workIds.add(work.id);slugs.add(work.slug);
    for(const source of rows(work.sources)){register(source.id,work.id);for(const row of rows(source.paragraphs))register(row.id,work.id);}
    for(const unit of rows(work.units)){register(unit.id,work.id);for(const section of rows(unit.sections))for(const item of rows(section.items))register(item.id,work.id);}
  }
  const lateral=data.lateral?.id?data.lateral:null;
  if(lateral){register(lateral.id,lateral.id);for(const section of rows(lateral.sections))for(const item of rows(section.items))register(item.id,lateral.id);}
  const dependencies=new Set();
  const verify=(item,owner)=>{
    const targets=[...rows(item.refs),...rows(item.deep_refs),...rows(item.passages).map(row=>row.id)];
    for(const id of targets){
      if(!Object.hasOwn(owners,id))throw Error(`Missing public reference: ${id}`);
      if(owner===lateral?.id){if(owners[id]!==owner)dependencies.add(owners[id]);}
      else if(owners[id]!==owner)throw Error(`A book reference crosses a book boundary: ${item.id} -> ${id}`);
    }
  };
  const assets={version:1,revision:digest(encode(data)),works:Object.create(null)};
  for(const work of data.works){
    for(const source of rows(work.sources))for(const item of rows(source.paragraphs))verify(item,work.id);
    for(const unit of rows(work.units)){
      for(const parent of rows(unit.parents))if(owners[parent]!==work.id)throw Error(`Invalid parent: ${unit.id} -> ${parent}`);
      for(const section of rows(unit.sections))for(const item of rows(section.items))verify(item,work.id);
    }
    assets.works[work.id]=addFile('work',work);
  }
  if(lateral){
    for(const id of rows(lateral.parents)){if(!owners[id])throw Error(`Missing lateral parent: ${id}`);dependencies.add(owners[id]);}
    for(const section of rows(lateral.sections))for(const item of rows(section.items))verify(item,lateral.id);
    assets.lateral={...addFile('lateral',lateral),dependencies:[...dependencies]};
  }
  assets.reference_owners=addFile('references',owners);
  const catalog={...data,works:data.works.map(work=>({...work,sources:rows(work.sources).map(paneHeader),units:rows(work.units).map(paneHeader)})),
    ...(lateral?{lateral:paneHeader(lateral)}:{}),public_assets:assets};
  return {catalog,files};
}

export async function buildPublicAssets(root=fileURLToPath(new URL('..',import.meta.url))) {
  await materializePublicLibrary(root);
  const data=JSON.parse(await readFile(resolve(root,'data/library.json'),'utf8'));
  let coverManifest;
  try{coverManifest=JSON.parse(await readFile(resolve(root,'data/cover-variants.json'),'utf8'));}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const coverVariants=coverManifest?await validateCoverVariants(root,coverManifest):{};
  const {catalog,files}=createPublicAssetPlan(data,{coverVariants});
  await mkdir(resolve(root,'data/chunks'),{recursive:true});
  for(const [url,contents] of files)await writeFile(resolve(root,url),contents);
  // Publish the catalogue last so it never refers to files still being written.
  const encoded=encode(catalog);
  await writeFile(resolve(root,'data/catalogue.json'),encoded);
  return {works:data.works.length,catalogBytes:Buffer.byteLength(encoded),catalogGzipBytes:gzipSync(encoded).length,
    originalGzipBytes:gzipSync(encode(data)).length,chunkCount:files.size,revision:catalog.public_assets.revision};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const result=await buildPublicAssets(process.argv[2]?resolve(process.argv[2]):undefined);
  console.log(`Prepared ${result.works} books; catalogue ${(result.catalogBytes/1024).toFixed(1)} KB (${(result.catalogGzipBytes/1024).toFixed(1)} KB gzip, ${(100*(1-result.catalogGzipBytes/result.originalGzipBytes)).toFixed(1)}% less than the complete export); ${result.chunkCount} immutable files.`);
}
