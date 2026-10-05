// Rebuild small, actual examples from the already validated public export.
import fs from 'node:fs';
import {indexLibrary,incoming} from '../library-core.mjs';
const location=new URL('../data/library.json',import.meta.url);
const data=JSON.parse(fs.readFileSync(location,'utf8')),index=indexLibrary(data),chains={};
for(const work of data.works){
 let node=index.nodes.get(work.units.find(unit=>unit.layer==='WB').sections[0].items[0].id);
 const chain=[node];
 for(const layer of ['MC','CL','CH','SOURCE'].filter(layer=>layer==='SOURCE'||work.units.some(unit=>unit.layer===layer))){
  node=incoming(node).map(link=>index.nodes.get(link.id)).find(row=>row.unit.layer===layer&&row.work.id===work.id);
  if(!node)throw Error(`No complete saved showcase branch for ${work.slug}`);
  chain.unshift(node);
 }
 chains[work.slug]=chain.map(row=>({id:row.id,layer:row.unit.layer,title:row.unit.title,text:row.text}));
}
const showcase={work:data.works.find(w=>w.slug==='hume').title,chain:chains.hume,chains,
 books:data.works.map(({slug,title,author,edition,description})=>({slug,title,author,edition,description})),
 lateral:data.lateral.sections[0].items[0]};
fs.writeFileSync(new URL('../data/showcase.json',import.meta.url),JSON.stringify(showcase,null,2)+'\n');
