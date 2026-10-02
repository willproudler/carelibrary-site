export const LAYERS = ['SOURCE','CH','CL','MC','WB'];
export const LABELS = {SOURCE:'Source',CH:'Chapter',CL:'Cluster',MC:'Metacluster',WB:'Whole book',XR:'Lateral'};
export function indexLibrary(data) {
  const nodes = new Map(), units = new Map(), works = new Map(), outgoing = new Map();
  function registerUnit(u,w) {
    units.set(u.id,{...u,work:w}); nodes.set(u.id,{...u,work:w,unit:u,kind:'unit'});
    for(const s of u.sections || []) for(const i of s.items) nodes.set(i.id,{...i,work:w,unit:u,section:s.name,kind:'claim'});
  }
  for(const w of data.works) {
    works.set(w.slug,w);
    for(const s of w.sources) {
      const unit={...s,layer:'SOURCE'};
      units.set(s.id,{...unit,work:w});nodes.set(s.id,{...unit,work:w,unit,kind:'source'});
      for(const p of s.paragraphs) nodes.set(p.id,{...p,work:w,unit,kind:'passage'});
    }
    for(const u of w.units) registerUnit(u,w);
  }
  registerUnit(data.lateral,null);
  for(const n of nodes.values()) for(const link of incoming(n)) {
    if(!nodes.has(link.id)) throw new Error(`Missing public reference: ${link.id}`);
    if(!outgoing.has(link.id)) outgoing.set(link.id,[]);
    outgoing.get(link.id).push({id:n.id,type:link.type});
  }
  return {data,nodes,units,works,outgoing};
}
export function incoming(n) {
  const links = (n.refs || []).map(id=>({id,type:'Recorded reference'}));
  for(const id of n.deep_refs || []) if(!links.some(l=>l.id===id)) links.push({id,type:'Recorded deep reference'});
  for(const p of n.passages || []) if(!links.some(l=>l.id===p.id)) links.push({id:p.id,type:`Passage alignment · ${p.type || 'recorded'} · ${p.review || 'review unspecified'}`});
  return links;
}
export function ancestors(work,id) {
  const found=new Set(),all=new Map(work.units.map(u=>[u.id,u]));
  function visit(uid){if(found.has(uid))return;found.add(uid);for(const p of all.get(uid)?.parents || [])visit(p);}
  visit(id);return found;
}
export function selectionFor(work,id) {
  const source=work.sources.find(s=>s.id===id);
  const target=source?source.chapter_id:id || work.units.find(u=>u.layer==='CH').id;
  const branch=ancestors(work,target),selection={};
  for(const layer of LAYERS.slice(1)) {
    const options=work.units.filter(u=>u.layer===layer);
    selection[layer]=options.find(u=>u.id===target) || options.find(u=>branch.has(u.id)) || options.find(u=>ancestors(work,u.id).has(target)) || options[0];
  }
  selection.SOURCE=work.sources.find(s=>s.chapter_id===selection.CH.id) || work.sources[0];
  return selection;
}
export function searchLibrary(index,query,limit=60) {
  const words=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if(!words.length)return [];
  const matches=[];
  for(const n of index.nodes.values()) if(n.text && words.every(w=>(n.id+' '+n.text).toLocaleLowerCase().includes(w))) {
    matches.push(n);if(matches.length===limit)break;
  }
  return matches;
}
