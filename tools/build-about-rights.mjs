// Extract recorded edition/source notices from the built PUBLIC catalogue only.
// Original-work public-domain status is project-provided page copy, not inferred here.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export function aboutRightsRows(catalogue,metadataOrigin={kind:'published_beta_catalogue'}) {
  if(!Array.isArray(catalogue?.works))throw Error('The published catalogue has no works array.');
  const ids=new Set();
  return catalogue.works.map(work=>{
    if(typeof work.id!=='string'||!work.id||ids.has(work.id))throw Error('Published rights records require unique work IDs.');
    ids.add(work.id);
    return {id:work.id,slug:work.slug??null,title:work.title??null,author:work.author??null,
      edition:work.edition??null,source_url:work.source_url??null,
      source_notices:work.source_notices==null?null:structuredClone(work.source_notices),
      metadata_origin:structuredClone(metadataOrigin)};
  });
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=resolve(process.argv[2]||resolve(dirname(fileURLToPath(import.meta.url)),'..'));
  const out=resolve(process.argv[3]||resolve(root,'about-book-rights.json'));
  const raw=await readFile(resolve(root,'data/catalogue.json'));
  const catalogue=JSON.parse(raw.toString('utf8'));
  const rows=aboutRightsRows(catalogue,{kind:'published_beta_catalogue',path:'data/catalogue.json',
    sha256:createHash('sha256').update(raw).digest('hex'),exported:catalogue.exported??null});
  await writeFile(out,JSON.stringify(rows)+'\n');
  console.log(JSON.stringify({books:rows.length,output:out}));
}
