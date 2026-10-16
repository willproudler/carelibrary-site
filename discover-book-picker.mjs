/* A searchable, keyboard-accessible chooser for published books. */
export function mountDiscoverBookPicker(host,choices,onChoose){
  if(!host)return null;
  const doc=host.ownerDocument;
  host.classList.add('discover-book-picker');
  host.innerHTML=`<button type="button" class="discover-book-trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="discover-book-menu">
    <svg class="discover-book-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c-3-2-7-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Zm0 0v15"/></svg>
    <span class="discover-book-current"><span class="discover-book-author"></span><span class="discover-book-title">Choose a book</span></span>
    <svg class="discover-book-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg>
  </button><div id="discover-book-menu" class="discover-book-menu" role="dialog" aria-label="Choose a published book" hidden>
    <label class="discover-book-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5"/><path d="m12 12 5 5"/></svg><input type="search" placeholder="Find a book or author" aria-label="Find a book or author" autocomplete="off"></label>
    <p class="discover-book-count"></p><div class="discover-book-options" role="listbox" aria-label="Published books"></div>
    <p class="discover-book-empty" hidden>No books match your search.</p>
  </div>`;
  const trigger=host.querySelector('.discover-book-trigger'),menu=host.querySelector('.discover-book-menu'),search=host.querySelector('input'),list=host.querySelector('[role=listbox]');
  let selected='',rows=[];
  const normalise=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
  function paint(){
    const query=normalise(search.value.trim()),visible=choices.filter(choice=>normalise(choice.label).includes(query));
    rows=visible.map(choice=>{
      const row=doc.createElement('button');row.type='button';row.className='discover-book-option';row.role='option';row.tabIndex=-1;row.dataset.value=choice.value;row.setAttribute('aria-selected',String(selected===choice.value));
      const text=doc.createElement('span'),author=doc.createElement('small'),title=doc.createElement('strong'),check=doc.createElement('span');
      author.textContent=choice.author||'Published book';title.textContent=choice.title||choice.label;check.className='discover-book-check';check.textContent='✓';check.setAttribute('aria-hidden','true');
      text.append(author,title);row.append(text,check);return row;
    });
    list.replaceChildren(...rows);
    host.querySelector('.discover-book-count').textContent=`${visible.length} ${visible.length===1?'book':'books'}${query?' found':' in the public library'}`;
    host.querySelector('.discover-book-empty').hidden=visible.length>0;
  }
  function close(restoreFocus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(restoreFocus)trigger.focus();}
  function show(){menu.hidden=false;trigger.setAttribute('aria-expanded','true');search.value='';paint();search.focus();}
  function select(value){
    selected=value;const choice=choices.find(choice=>choice.value===value);
    if(choice){host.querySelector('.discover-book-author').textContent=choice.author||'Published book';host.querySelector('.discover-book-title').textContent=choice.title||choice.label;trigger.setAttribute('aria-label',`Choose a book. Current reading: ${choice.label}`);}
    if(!menu.hidden)paint();
  }
  function click(event){
    if(event.target.closest('.discover-book-trigger')){menu.hidden?show():close();return;}
    const row=event.target.closest('[data-value]');if(!row||!host.contains(row))return;
    select(row.dataset.value);close(true);onChoose(row.dataset.value);
  }
  function keydown(event){
    if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();close(true);return;}
    if(event.target===trigger&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();show();(rows.find(row=>row.dataset.value===selected)||rows[0])?.focus();return;}
    if(menu.hidden||!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const index=rows.indexOf(doc.activeElement);if(index<0&&event.target!==search)return;
    if(event.target===search&&['Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?rows.length-1:index<0?(event.key==='ArrowUp'?rows.length-1:0):(index+(event.key==='ArrowUp'?-1:1)+rows.length)%rows.length;
    rows[next]?.focus();
  }
  const outside=event=>{if(!host.contains(event.target))close();};
  const blur=event=>{if(!host.contains(event.relatedTarget))close();};
  host.addEventListener('click',click);host.addEventListener('keydown',keydown);host.addEventListener('focusout',blur);search.addEventListener('input',paint);doc.addEventListener('pointerdown',outside);
  return {select,destroy(){host.removeEventListener('click',click);host.removeEventListener('keydown',keydown);host.removeEventListener('focusout',blur);search.removeEventListener('input',paint);doc.removeEventListener('pointerdown',outside);host.replaceChildren();}};
}
