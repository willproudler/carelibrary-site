/* Small, read-only previews of the existing Lateral and Corpus environments.
 * Claims come from the same sealed public export as the embedded reader.
 * The corpus sketch contains bibliographic metadata, never private CARE prose. */
import {publicReadingText} from './native/reading-views.mjs?v=dd05ea4b1e9de824';
import {loadPublicField} from './public-fields.mjs?v=21bcaf6e74c8e3e7';
import {loadLibrary} from './library-loader.mjs';
export const LATERAL_SAMPLES = Object.freeze([
  {label:'Agreement', id:'XR_KPR_THN:DRT-01', explanation:'Find ideas both books share. This comparison finds that both Hume and Kant place limits on what we can know.'},
  {label:'Difference', id:'XR_KPR_THN:TLC-02', explanation:'Identify where their explanations differ. Hume explains how habit forms expectations; Kant asks what makes experience possible.'},
  {label:'New work', id:'XR_KPR_THN:SCF-02', explanation:'A “strange child” is a new work developed from two books. This example proposes combining Hume’s account of how beliefs form with Kant’s tests of what makes them valid.'},
]);

// These titles occur in CARE_LIBRARY_CATALOGUE.md. Ancient dates describe
// approximate composition periods, not the dates of the modern editions.
export const CORPUS_SKETCH = Object.freeze([
  {id:'rigveda',title:'Rigveda',author:'Vedic poets',date:'c. 1500 BCE',year:-1500,
    place:'Northwestern South Asia',latitude:30,longitude:73,
    source:'https://www.getty.edu/cona/CONAIconographyRecord.aspx?iconid=901001863'},
  {id:'upanishads',title:'The Early Upanishads',author:'Early Upanishadic sages',date:'c. 700–300 BCE',year:-500,
    place:'South Asia',latitude:26,longitude:82,
    source:'https://iep.utm.edu/upanisad/'},
  {id:'timaeus',title:'Timaeus',author:'Plato',date:'c. 360 BCE',year:-360,
    place:'Athens',latitude:37.98,longitude:23.73,
    source:'https://classics.mit.edu/Plato/timaeus.html'},
  {id:'confessions',title:'Confessions',author:'Augustine of Hippo',date:'c. 400 CE',year:400,
    place:'North Africa',latitude:36.9,longitude:7.77,
    source:'https://plato.stanford.edu/archives/fall2014/entries/augustine/'},
  {id:'hume',title:'A Treatise of Human Nature',author:'David Hume',date:'1739–1740',year:1739,
    place:'Edinburgh',latitude:55.95,longitude:-3.19,book:'hume',
    source:'https://plato.stanford.edu/entries/hume/'},
  {id:'kant',title:'The Critique of Pure Reason',author:'Immanuel Kant',date:'1781 / 1787',year:1781,
    place:'Königsberg',latitude:54.71,longitude:20.51,book:'kant',
    source:'https://plato.stanford.edu/archives/fall2025/entries/kant/'},
]);

// The same deliberately schematic outlines used in CARE's Corpus atlas.
const continents=[
  'M64 87L83 73 117 64 139 71 156 68 173 89 162 104 171 122 154 137 145 157 131 164 119 159 112 175 100 165 92 144 76 142 67 119 52 107Z',
  'M164 166L184 168 203 184 220 191 232 216 226 240 214 259 205 282 188 304 177 301 173 276 161 254 151 228 152 205 143 188Z',
  'M273 58L289 43 310 47 326 63 317 90 298 109 278 95Z',
  'M356 103L366 89 387 84 402 91 411 80 425 81 437 101 428 116 414 125 393 120 385 132 371 125Z',
  'M365 134L393 125 420 137 442 166 445 190 428 218 415 237 392 242 379 222 369 202 353 185 347 158Z',
  'M413 79L440 61 474 63 496 52 525 66 553 63 578 74 613 74 641 91 665 98 662 118 639 125 626 142 612 150 602 140 588 162 573 174 561 192 546 184 534 167 524 157 513 174 509 198 496 191 487 172 472 162 457 143 441 130 427 114Z',
  'M547 207L559 205 568 222 586 229 604 234 607 243 587 246 575 236 559 232Z',
  'M585 259L600 246 623 247 639 259 654 275 647 296 623 303 600 294 581 292 573 274Z',
  'M669 288L677 282 685 286 681 300 671 312 666 307Z',
  'M430 236L438 231 443 240 437 260 431 264 427 252Z',
];
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const point=book=>[(book.longitude+180)/360*760,(90-book.latitude)/180*360];

export function savedLateralSamples(data){
  if(data?.lateral?.id!=='XR_KPR_THN')throw Error('The saved lateral is unavailable.');
  const items=new Map(data.lateral.sections.flatMap(section=>section.items.map(item=>[item.id,item])));
  return LATERAL_SAMPLES.map(sample=>{
    const item=items.get(sample.id);
    if(!item?.text||!item.refs?.length)throw Error('A saved lateral claim is unavailable.');
    return {...sample,text:item.text,refs:[...item.refs]};
  });
}

// A featured field belongs to the comparison card, never the book chooser.
export function featuredLateral(data){
  const laterals=(data.fields||[]).filter(field=>field.id&&field.field==='lateral');
  return laterals.find(field=>data.featured_reading?.type==='field'&&field.id===data.featured_reading.id)
    ||laterals.at(-1)||null;
}

export function publishedLateralSamples(field){
  const panes=(field.bundle?.panes||[]).filter(pane=>pane.layer==='XR'&&pane.role!=='source');
  const items=panes.flatMap(pane=>(pane.items||[]).map(item=>({...item,pane: pane.id})));
  const saved=LATERAL_SAMPLES.map(sample=>({sample,item:items.find(item=>item.id===sample.id)}));
  if(saved.every(({item})=>item))return saved.map(({sample,item})=>({
    label:sample.label,id:item.id,pane:item.pane,text:item.reading_text||item.text,
    explanation:item.reading_text||item.text,refs:item.source_trace||[],
  }));
  const sections=new Set();
  return items.filter(item=>{
    const key=item.pane+'|'+item.section_name;
    if(!(item.reading_text||item.text)||sections.has(key))return false;
    sections.add(key);return true;
  }).slice(0,3).map(item=>({label:item.section_name||'Saved analysis',id:item.id,pane:item.pane,
    text:item.reading_text||item.text,explanation:item.reading_text||item.text,refs:item.source_trace||[]}));
}

function mapMarkup(){
  return `<svg viewBox="0 30 760 300" role="img" aria-label="Schematic map of places associated with the selected texts and their authors">
    <g class="de-map-grid">${[90,180,270].map(y=>`<path d="M25 ${y}H735"/>`).join('')}${[190,380,570].map(x=>`<path d="M${x} 45V315"/>`).join('')}</g>
    <g class="de-map-land">${continents.map(path=>`<path d="${path}"/>`).join('')}</g>
    ${CORPUS_SKETCH.map(book=>{const [x,y]=point(book);return `<g data-place="${book.id}"><circle class="de-map-halo" cx="${x}" cy="${y}" r="16"/><circle class="de-map-dot" cx="${x}" cy="${y}" r="5"/><title>${escapeHTML(book.title)} · ${escapeHTML(book.place)}</title></g>`;}).join('')}
  </svg>`;
}

export async function mountDiscoverExperiments(host,options={}){
  if(!host)return null;
  const doc=host.ownerDocument,view=doc.defaultView;
  let selectedSample=0,selectedBook=0,samples=[],lateralHref='./#view=laterals',published=false;
  host.classList.add('discover-experiments');
  host.innerHTML=`<section class="de-card de-lateral" aria-labelledby="de-lateral-title">
      <div class="de-heading"><p class="de-label">Laterals</p><h2 id="de-lateral-title">Compare two books.</h2><p class="de-description">A lateral compares two books: where their arguments agree, where they differ, and what could be developed from both.</p></div>
      <h3 class="de-featured-title" hidden></h3><p class="de-featured-books" hidden></p>
      <div class="de-strands" aria-hidden="true"><span>Hume</span><span>Kant</span>
        <svg viewBox="0 0 560 74"><g class="de-rungs"><path d="M140 27L140 47M180 47L180 27M220 48L220 26M260 29L260 45M300 27L300 47M340 47L340 27M380 48L380 26M420 29L420 45"/></g><path class="de-strand-a" d="M22 37H72C112 37 116 12 146 17S177 65 212 55S249 11 284 20S319 64 354 54S390 13 425 21S452 37 490 37H538"/><path class="de-strand-b" d="M22 37H72C112 37 116 62 146 57S177 9 212 19S249 63 284 54S319 10 354 20S390 61 425 53S452 37 490 37H538"/><circle cx="22" cy="37" r="5"/><circle cx="538" cy="37" r="5"/></svg>
      </div>
      <div class="de-sample-tabs" role="group" aria-label="Explore the saved lateral">${LATERAL_SAMPLES.map((sample,i)=>`<button type="button" data-sample="${i}" aria-pressed="${i===0}" disabled>${sample.label}</button>`).join('')}</div>
      <div class="de-claim"><p class="de-explanation" aria-live="polite" aria-atomic="true">Loading the saved comparison…</p><details class="de-saved-claim"><summary>Read the saved analysis</summary><p class="de-claim-text"></p><p class="de-claim-kind"></p><span class="de-claim-ref"></span></details></div>
      <div class="de-card-foot"><a class="de-show" data-show-lateral href="./#view=laterals">Open comparison <span aria-hidden="true">↗</span></a><a class="de-open" href="./#view=laterals">All laterals <span aria-hidden="true">↗</span></a></div>
    </section>
    <section class="de-card de-corpus" aria-labelledby="de-corpus-title">
      <div class="de-heading"><p class="de-label">Corpuses</p><h2 id="de-corpus-title">Study a collection.</h2><p class="de-description">A corpus groups books by author, subject, place or time period. CARE analyses them together to find shared ideas, differences and changes across the collection.</p></div>
      <div class="de-map">${mapMarkup()}</div>
      <div class="de-timeline" role="group" aria-label="Choose a text on the timeline">${CORPUS_SKETCH.map((book,i)=>`<button type="button" data-book="${i}" aria-pressed="${i===0}" aria-label="${escapeHTML(book.title)}, ${escapeHTML(book.date)}"><span class="de-time-dot" aria-hidden="true"></span><span>${escapeHTML(book.date)}</span></button>`).join('')}</div>
      <div class="de-book" aria-live="polite" aria-atomic="true"><div><h3 class="de-book-title"></h3><p class="de-book-meta"></p></div><a class="de-book-source" target="_blank" rel="noopener noreferrer">About this text <span aria-hidden="true">↗</span></a></div>
      <p class="de-sketch-note">Explore this example collection by date and place. It shows the selected texts; a combined CARE analysis has not been generated. Early dates and places are approximate.</p>
    </section>`;
  const $=selector=>host.querySelector(selector);
  function paintSample(){
    const sample=samples[selectedSample];
    if(!sample)return;
    const prose=publicReadingText(sample);
    $('.de-explanation').textContent=sample.explanation;
    $('.de-claim-text').textContent=prose;
    $('.de-claim-kind').textContent=selectedSample===2?'A proposal from the saved comparison. No new work has been generated in this example.':'';
    $('.de-saved-claim').open=false;
    $('.de-saved-claim').hidden=published;
    $('.de-claim-ref').textContent=sample.id;
    host.querySelectorAll('[data-sample]').forEach(button=>{button.disabled=false;button.setAttribute('aria-pressed',String(Number(button.dataset.sample)===selectedSample));});
    $('[data-show-lateral]').href=lateralHref;
    $('.de-lateral').dataset.mode=String(selectedSample);
  }
  function paintBook(){
    const book=CORPUS_SKETCH[selectedBook];
    host.querySelectorAll('[data-book]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.book)===selectedBook)));
    host.querySelectorAll('[data-place]').forEach(pin=>pin.classList.toggle('is-selected',pin.dataset.place===book.id));
    $('.de-book-title').textContent=book.title;
    $('.de-book-meta').textContent=`${book.author} · ${book.place}`;
    $('.de-book-source').href=book.source;
  }
  function onClick(event){
    const button=event.target.closest('button');
    if(!button||!host.contains(button)||button.disabled)return;
    if(button.hasAttribute('data-sample')){selectedSample=Number(button.dataset.sample);paintSample();}
    if(button.hasAttribute('data-book')){selectedBook=Number(button.dataset.book);paintBook();}

  }
  host.addEventListener('click',onClick);paintBook();
  try{
    const library=options.data?null:await (options.library||loadLibrary(options.fetch?{fetch:options.fetch}:{}));
    const data=options.data||library.data;
    const field=featuredLateral(data);
    if(field){
      published=true;lateralHref='./#field='+encodeURIComponent(field.id);
      $('[data-show-lateral]').href=lateralHref;
      const members=field.members||[];
      const authors=members.map(member=>member.author).filter(Boolean);
      $('.de-featured-title').hidden=false;
      $('.de-featured-title').textContent=authors.length?authors.join(' × '):field.title;
      $('.de-featured-books').hidden=false;
      $('.de-featured-books').textContent=members.length?members.map(member=>member.title).join(' × '):'';
      const strandLabels=host.querySelectorAll('.de-strands>span');
      strandLabels.forEach((label,i)=>{label.textContent=members[i]?.author||members[i]?.title||'';});
      const fetcher=options.fetch||view.fetch.bind(view);
      await loadPublicField(field,(url,init)=>fetcher(new URL(url,import.meta.url),init));
      samples=publishedLateralSamples(field);
      $('.de-sample-tabs').innerHTML=samples.map((sample,i)=>`<button type="button" data-sample="${i}" aria-pressed="${i===0}">${escapeHTML(sample.label)}</button>`).join('');
      if(samples.length)paintSample();
      else{$('.de-explanation').textContent='Open this published comparison to explore its saved readings.';$('.de-saved-claim').hidden=true;}
    }else if(data.lateral?.id==='XR_KPR_THN'){
      if(library)await library.ensureLateral();
      lateralHref='./#lateral='+encodeURIComponent(data.lateral.id);
      samples=savedLateralSamples(data);paintSample();
    }else{
      $('.de-strands').hidden=true;
      $('.de-sample-tabs').hidden=true;
      $('.de-saved-claim').hidden=true;
      $('.de-card-foot').hidden=false;
      $('[data-show-lateral]').hidden=true;
      $('.de-explanation').textContent='Selected laterals can be published from the Mac Library. Open the beta Library to see the readings currently shared.';
    }
  }catch(error){$('.de-explanation').textContent='The saved comparison preview could not load. Open the comparison in the Library to read it.';$('.de-sample-tabs').hidden=true;$('.de-saved-claim').hidden=true;}
  return {destroy(){host.removeEventListener('click',onClick);}};
}

if(typeof document!=='undefined'){
  const start=()=>mountDiscoverExperiments(document.querySelector('#discover-experiments'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
