/* Original illustrative material only. This tour never connects to the private library. */
(() => {
  const canvas = document.getElementById('reader-canvas');
  if (!canvas) return;
  const layers = [
    {label:'Source',code:'SOURCE',color:'source',title:'A place held in common',text:'A garden becomes common when its keepers can question the rules by which it is tended. Sharing the harvest is not the same as sharing responsibility for the garden.',note:'Original demonstration text · §1',support:'The source is kept separate from the interpretation.'},
    {label:'Chapter',code:'CH',color:'chapter',title:'The right to question',text:'A shared place depends on participation in its rules, as well as access to what it produces.',note:'CH · Argument 1',support:'A chapter reading proposes a structure for the argument.'},
    {label:'Cluster',code:'CL',color:'cluster',title:'From use to responsibility',text:'Access, responsibility and the ability to revise rules together define the practice of sharing.',note:'CL · Chapters together',support:'A cluster brings related chapter readings into conversation.'},
    {label:'Metacluster',code:'MC',color:'meta',title:'Keeping a commons open',text:'A commons lasts through an ongoing relationship between participation, care and revision.',note:'MC · Larger pattern',support:'A metacluster connects patterns across groups of chapters.'},
    {label:'Whole book',code:'WB',color:'whole',title:'A commons is a practice',text:'A commons is sustained by how people care for it, share responsibility and keep its rules open to question.',note:'WB · Whole-work interpretation',support:'The whole-book reading gathers the work’s larger architecture.'}
  ];
  let scale=1, view='read', routed=false;
  const status=document.getElementById('reader-status'), routeButton=document.getElementById('route-button');
  routeButton.hidden=false;
  const esc=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  function pane(layer,index){
    return `<article class="demo-pane ${index===scale?'current':''}" data-node="${index}"><div class="pane-bar ${layer.color}"><span>${layer.code} / ${layer.label.toUpperCase()}</span><span>${String(index+1).padStart(2,'0')}</span></div><div class="demo-body"><span class="micro">${layer.note}</span><h4>${layer.title}</h4>${index===0?`<p class="demo-source ${routed?'highlight':''}">“${layer.text}”</p>`:`<button type="button" class="demo-claim" data-claim="${index}" aria-pressed="${routed&&index===scale}">${layer.text}<small>${routed?'Recorded route shown below':'Select this claim to follow its route'}</small></button>`}<p class="support">${layer.support}</p></div></article>`;
  }
  function render(){
    document.querySelectorAll('[data-scale]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.scale)===scale));
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
    canvas.classList.toggle('outline',view==='outline');
    canvas.classList.toggle('routed',routed);
    if(view==='outline'){
      canvas.innerHTML=layers.map((l,i)=>`<article class="outline-pane" data-node="${i}"><h4 class="${l.color}">${l.code} · ${l.label}</h4><button type="button" class="outline-unit ${i<=scale&&routed?'selected':''}" data-open="${i}">${l.title}</button></article>`).join('');
    }else{
      const ids=routed?Array.from({length:Math.max(1,scale)+1},(_,i)=>i):(scale<2?[0,1,2]:scale===2?[1,2,3]:[2,3,4]);
      canvas.innerHTML=ids.map(i=>pane(layers[i],i)).join('');
    }
    routeButton.textContent=routed?'Close source route':'Show source route';
    status.textContent=routed?`${layers.slice(0,Math.max(1,scale)+1).map(l=>l.label).join(' → ')}. Follow the panes across this illustrative chain. The full reader can show branches and multiple contributing passages.`:view==='outline'?'The reading at a glance. Open a strip to return to its pane.':`${layers[scale].label} reading · select a claim to inspect its route.`;
    canvas.scrollLeft=0;
    requestAnimationFrame(drawRoutes);
  }
  function drawRoutes(){
    canvas.querySelector('.connector')?.remove();
    if(!routed)return;
    const nodes=[...canvas.querySelectorAll('[data-node]')].filter(n=>Number(n.dataset.node)<=Math.max(1,scale));
    if(nodes.length<2)return;
    const bounds=canvas.getBoundingClientRect();let paths='';
    for(let i=1;i<nodes.length;i++){
      const a=nodes[i-1].getBoundingClientRect(),b=nodes[i].getBoundingClientRect(),vertical=b.top>=a.bottom-1;
      const x1=(vertical?a.left+a.width/2:a.right)-bounds.left+canvas.scrollLeft,y1=(vertical?a.bottom:a.top+a.height*.6)-bounds.top+canvas.scrollTop;
      const x2=(vertical?b.left+b.width/2:b.left)-bounds.left+canvas.scrollLeft,y2=(vertical?b.top:b.top+b.height*.6)-bounds.top+canvas.scrollTop;
      const d=vertical?`M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`:`M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`;
      paths+=`<path d="${d}"/><circle cx="${x1}" cy="${y1}" r="3"/><circle cx="${x2}" cy="${y2}" r="3"/>`;
    }
    canvas.insertAdjacentHTML('beforeend',`<svg class="connector" width="${canvas.scrollWidth}" height="${canvas.clientHeight}" aria-hidden="true">${paths}</svg>`);
  }
  document.querySelectorAll('[data-scale]').forEach(b=>b.addEventListener('click',()=>{scale=Number(b.dataset.scale);render();}));
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
  routeButton.addEventListener('click',()=>{routed=!routed;render();});
  canvas.addEventListener('click',e=>{const claim=e.target.closest('[data-claim]'),open=e.target.closest('[data-open]');if(claim){scale=Number(claim.dataset.claim);routed=true;render();routeButton.focus({preventScroll:true});}if(open){scale=Number(open.dataset.open);view='read';render();document.querySelector('[data-view="read"]').focus({preventScroll:true});}});
  new ResizeObserver(drawRoutes).observe(canvas);render();
  const shelves={
    books:{title:'A whole work, open at every scale.',description:'Read a book or lecture through its source, chapter arguments and larger structures.',items:[['The Common Garden','A place, its keepers, its rules.','#344837'],['On Keeping a Record','Memory as a shared responsibility.','#334754'],['Learning in Public','How an idea changes between readers.','#4f3830'],['A Place for Questions','An essay on disagreement.','#403d50']]},
    laterals:{title:'Put two works into conversation.',description:'Laterals explore relationships and tensions across works, retaining the sources declared by each reading.',items:[['Garden × Record','What does a commons need to remember?','#45334d'],['Record × Learning','When does a record become a lesson?','#3a3b55'],['Learning × Questions','How does disagreement change a reading?','#4c3740'],['Questions × Garden','Who can revise a shared rule?','#34483d']]},
    dialogues:{title:'Follow the exchange, not just the conclusion.',description:'Read claims, objections and replies alongside their transcript evidence. Keep each voice and its contribution visible.',items:[['Who Keeps the Garden?','An illustrative exchange about responsibility.','#4d422d'],['What Should We Remember?','An illustrative exchange about shared records.','#304950'],['Can a Rule Stay Open?','An illustrative exchange about revision.','#4c3635'],['Reading Together','An illustrative exchange about interpretation.','#3a434e']]},
    corpuses:{title:'See a collection become a larger reading.',description:'A corpus brings several works into one field of inquiry while preserving their individual readings and recorded connections.',items:[['The Commons','Garden, record and responsibility.','#4a4029'],['Memory & Revision','Records that remain open to question.','#3a4349'],['Practices of Care','Attention, participation and shared space.','#35473a'],['Ways of Reading','Interpretation, learning and disagreement.','#463849']]}
  };
  function shelf(key){const data=shelves[key];document.getElementById('shelf-heading').textContent=data.title;document.getElementById('shelf-description').textContent=data.description;document.querySelectorAll('[data-shelf]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.shelf===key));document.getElementById('bookshelf').innerHTML=data.items.map(([title,desc,color],i)=>`<article class="shelf-item"><div class="book-cover" style="--book:${color}" aria-hidden="true"><span class="book-mark">◇</span><h4>${esc(title)}</h4><small>CARE · Demonstration ${String(i+1).padStart(2,'0')}</small></div><span class="book-kind">${key==='corpuses'?'Corpus':key==='books'?'Source work':key==='laterals'?'Lateral reading':'Dialogue'}</span><h4>${esc(title)}</h4><p>${esc(desc)}</p></article>`).join('');}
  document.querySelectorAll('[data-shelf]').forEach(b=>b.addEventListener('click',()=>shelf(b.dataset.shelf)));shelf('books');
})();
