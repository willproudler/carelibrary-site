/* Public, preserved CARE records only. No connection to the private application. */
(async () => {
  const canvas = document.getElementById('reader-canvas');
  if (!canvas) return;
  let sample;
  try { const response=await fetch('/data/showcase.json'); if(!response.ok)throw Error();sample=await response.json(); }
  catch { canvas.innerHTML='<p class="pane-note">The saved reading could not be loaded. <a href="/">Open the public library</a>.</p>';return; }
  const names=['Source','Chapter','Cluster','Metacluster','Whole book'],colors=['source','chapter','cluster','meta','whole'];
  let layers=sample.chain.map((item,i)=>({label:names[i],code:item.layer,color:colors[i],title:item.title,text:item.text,note:item.id,support:i===0?'Original Hume text · retained transcription.':'Saved CARE interpretation · inspect all contributors in the reading room.'}));
  let scale=1, view='read', routed=false;
  document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{
    const slug=button.dataset.example, chain=sample.chains?.[slug]||sample.chain;
    layers=chain.map((item,i)=>({label:names[i],code:item.layer,color:colors[i],title:item.title,text:item.text,note:item.id,support:i===0?`Original ${slug==='kant'?'Kant (Meiklejohn translation)':'Hume'} text · retained transcription.`:'Saved CARE interpretation · inspect all contributors in the library.'}));
    document.querySelectorAll('[data-example]').forEach(b=>b.setAttribute('aria-pressed',b===button));
    document.getElementById('demo-author').textContent='SAVED CARE READING · '+slug.toUpperCase();
    document.getElementById('demo-title').textContent=slug==='kant'?'The Critique of Pure Reason':'A Treatise of Human Nature';
    document.getElementById('demo-open-book').href='/#book='+slug;
    render();
  }));
  const status=document.getElementById('reader-status'), routeButton=document.getElementById('route-button');
  routeButton.hidden=false;
  const esc=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  function pane(layer,index){
    return `<article class="demo-pane ${index===scale?'current':''}" data-node="${index}"><div class="pane-bar ${layer.color}"><span>${layer.code} / ${layer.label.toUpperCase()}</span><span>${String(index+1).padStart(2,'0')}</span></div><div class="demo-body"><span class="micro">${layer.note}</span><h4>${esc(layer.title)}</h4>${index===0?`<p class="demo-source ${routed?'highlight':''}">“${esc(layer.text)}”</p>`:`<button type="button" class="demo-claim" data-claim="${index}" aria-pressed="${routed&&index===scale}">${esc(layer.text)}<small>${routed?'Recorded branch shown':'Select this claim to follow its route'}</small></button>`}<p class="support">${layer.support}</p></div></article>`;
  }
  function render(){
    document.querySelectorAll('[data-scale]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.scale)===scale));
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
    canvas.classList.toggle('outline',view==='outline');
    canvas.classList.toggle('routed',routed);
    if(view==='outline'){
      canvas.innerHTML=layers.map((l,i)=>`<article class="outline-pane" data-node="${i}"><h4 class="${l.color}">${l.code} · ${l.label}</h4><button type="button" class="outline-unit ${i<=scale&&routed?'selected':''}" data-open="${i}">${esc(l.title)}</button></article>`).join('');
    }else{
      const ids=routed?Array.from({length:Math.max(1,scale)+1},(_,i)=>i):(scale<2?[0,1,2]:scale===2?[1,2,3]:[2,3,4]);
      canvas.innerHTML=ids.map(i=>pane(layers[i],i)).join('');
    }
    routeButton.textContent=routed?'Close source route':'Show source route';
    status.textContent=routed?`${layers.slice(0,Math.max(1,scale)+1).map(l=>l.label).join(' → ')}. Follow one recorded branch. Open the library to inspect every contributor.`:view==='outline'?'The saved reading at a glance. Open a strip to return to its pane.':`${layers[scale].label} reading · select a claim to inspect its route.`;
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
    books:{title:'Two books, open at every scale.',description:'The exact saved readings used by the Kant–Hume lateral, with their original source texts.',items:sample.books.map((b,i)=>({title:b.title,desc:b.description,by:b.author,color:i?'#5d4c31':'#30474b',url:'/#book='+b.slug}))},
    laterals:{title:'Put Kant and Hume into conversation.',description:'A saved diagnostic reading: convergences, tensions, translation limits and the claims behind them.',items:[{title:'Kant × Hume',desc:sample.lateral.text,by:'Saved diagnostic lateral · R01',color:'#49334f',url:'/#lateral=XR_KPR_THN'}]}
  };
  function shelf(key){const data=shelves[key];document.getElementById('shelf-heading').textContent=data.title;document.getElementById('shelf-description').textContent=data.description;document.querySelectorAll('[data-shelf]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.shelf===key));document.getElementById('bookshelf').innerHTML=data.items.map(b=>`<article class="shelf-item"><a href="${b.url}"><div class="book-cover" style="--book:${b.color}" aria-hidden="true"><span class="book-mark">◇</span><h4>${esc(b.title)}</h4><small>${esc(b.by)}</small></div><span class="book-kind">${key==='books'?'Public reading':'Saved lateral'}</span><h4>${esc(b.title)}</h4></a><p>${esc(b.desc)}</p><a class="text-link" href="${b.url}">Open this reading ↗</a></article>`).join('');}
  document.querySelectorAll('[data-shelf]').forEach(b=>b.addEventListener('click',()=>shelf(b.dataset.shelf)));shelf('books');
})();
