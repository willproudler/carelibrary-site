import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createPublicAssetPlan,validateCoverVariants} from '../tools/build-public-assets.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');

test('web cover paths apply to shelf, loaded books and field members without altering original records',()=>{
  const original='./assets/covers/book.png',small='./assets/covers/web/cover-'+('a'.repeat(24))+'.webp';
  const data={works:[{id:'BOOK',slug:'book',title:'Book',cover_url:original,sources:[],units:[]}],fields:[{id:'FIELD',members:[{id:'BOOK',cover_url:original}]}]};
  const before=JSON.stringify(data),{catalog,files}=createPublicAssetPlan(data,{coverVariants:{[original]:small}});
  assert.equal(JSON.stringify(data),before);
  assert.equal(catalog.works[0].cover_url,small);assert.equal(catalog.fields[0].members[0].cover_url,small);
  const work=JSON.parse(files.get(catalog.public_assets.works.BOOK.url));assert.equal(work.cover_url,small);
  assert.deepEqual({...work,cover_url:original},data.works[0]);
});

test('cover delivery rejects external paths, changed originals, changed copies and oversized output',async()=>{
  const root=await mkdtemp(join(tmpdir(),'care-cover-delivery-'));
  try{
    await mkdir(join(root,'assets/covers/web'),{recursive:true});
    const original=Buffer.from('published original'),delivered=Buffer.from('generated web copy'),sha256=digest(delivered);
    const source='./assets/covers/book.png',url=`./assets/covers/web/cover-${sha256.slice(0,24)}.webp`;
    await writeFile(join(root,source),original);await writeFile(join(root,url),delivered);
    const variant={url,source_sha256:digest(original),sha256,bytes:delivered.length,width:400,height:600};
    const manifest={version:1,covers:{[source]:variant}};
    assert.equal((await validateCoverVariants(root,manifest))[source],url);
    await assert.rejects(validateCoverVariants(root,{version:1,covers:{'https://elsewhere.test/book.png':variant}}),/public covers directory/);
    await assert.rejects(validateCoverVariants(root,{version:1,covers:{[source]:{...variant,url:'./assets/covers/../../secret.webp'}}}),/public covers directory/);
    await assert.rejects(validateCoverVariants(root,{version:1,covers:{[source]:{...variant,height:601}}}),/delivery size/);
    await writeFile(join(root,url),'changed');await assert.rejects(validateCoverVariants(root,manifest),/generated cover changed/);
    await writeFile(join(root,url),delivered);await writeFile(join(root,source),'new original');await assert.rejects(validateCoverVariants(root,manifest),/generated cover changed/);
  }finally{await rm(root,{recursive:true,force:true});}
});
