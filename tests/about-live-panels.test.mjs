import test from 'node:test';
import assert from 'node:assert/strict';
import {panelPanes,panelReadingHref,panelSelectionHref,resolveAboutLibraryHref} from '../about-live-panels.mjs';

const chapter = {stack:{work:{id:'WORK_KANT'},care_path:[{id:'CH_KANT_01',sections:[{items:[{id:'CH_KANT_01:A1',text:'A saved claim.'}]}]}]}};
const source = {stack:{work:{id:'WORK_KANT'},active_chapter:{raw_unit_id:'RAW_KANT_01',passages:[{id:'RAW_KANT_01:P0001',text:'A saved passage.'}]},care_path:[]}};
const book = {
  href:'/library.html#book=kant',
  sourceHref:'/library.html#book=kant&source=RAW_KANT_01',
  chapterHref:'/library.html#book=kant&unit=CH_KANT_01',
  claimHrefBase:'/library.html#book=kant',source,chapter,
};
const selectedClaim={work_id:'WORK_KANT',unit_id:'CH_KANT_01',axiom_id:'CH_KANT_01:A1'};
const selectedPassage={work_id:'WORK_KANT',unit_id:'RAW_KANT_01',passage_id:'RAW_KANT_01:P0001'};
const hash = href => new URLSearchParams(href.split('#')[1]);

test('Source and chapter buttons keep the correct saved reading destination', () => {
  assert.deepEqual(panelPanes(book),['source','chapter']);
  assert.equal(hash(panelReadingHref(book,'source')).get('source'),'RAW_KANT_01');
  assert.equal(hash(panelReadingHref(book,'chapter')).get('unit'),'CH_KANT_01');
  assert.equal(panelReadingHref(book,'unknown'),'');
});

test('Selected native claims and source passages open their own exact addresses', () => {
  const claim=hash(panelSelectionHref(book,'chapter',selectedClaim));
  assert.equal(claim.get('book'),'kant');
  assert.equal(claim.get('ref'),'CH_KANT_01:A1');
  assert.equal(claim.has('unit'),false);
  assert.equal(hash(panelSelectionHref(book,'source',selectedPassage)).get('ref'),'RAW_KANT_01:P0001');
});

test('Cross-panel, wrong-work and missing claim selections cannot make misleading links', () => {
  assert.equal(panelSelectionHref(book,'source',selectedClaim),'');
  assert.equal(panelSelectionHref(book,'chapter',selectedPassage),'');
  assert.equal(panelSelectionHref(book,'chapter',{...selectedClaim,work_id:'WORK_OTHER'}),'');
  assert.equal(panelSelectionHref(book,'chapter',{...selectedClaim,unit_id:'CH_OTHER'}),'');
  assert.equal(panelSelectionHref(book,'chapter',{...selectedClaim,axiom_id:'CH_KANT_01:ABSENT'}),'');
  assert.equal(panelSelectionHref(book,'chapter',{...selectedClaim,passage_id:'RAW_KANT_01:P0001'}),'');
  assert.equal(panelSelectionHref(book,'chapter',null),'');
});

test('Lateral claim links retain their exact field and preserved input scope', () => {
  const panel={...book,claimHrefBase:'/library.html#field=FIELD%3Alateral%3A123&scope=XR%3Acomparison%3AR01'};
  const query=hash(panelSelectionHref(panel,'chapter',selectedClaim));
  assert.equal(query.get('field'),'FIELD:lateral:123');
  assert.equal(query.get('scope'),'XR:comparison:R01');
  assert.equal(query.get('ref'),'CH_KANT_01:A1');
  assert.equal(query.has('book'),false);
});

test('An unrelated destination cannot be substituted for the Library route', () => {
  assert.equal(panelSelectionHref({...book,claimHrefBase:'https://example.com/#book=kant'},'chapter',selectedClaim),'');
});

// Exercise delayed/failed stylesheet delivery without relying on the native
// renderer or a network. The readable fallback must remain assigned until paint.
class Element {
  constructor(tag,doc) { this.tagName=tag;this.ownerDocument=doc;this.childNodes=[];this.dataset={};this.attributes=new Map();this.listeners=new Map();this.textContent=''; }
  append(...nodes) { for(const node of nodes){node.parent=this;this.childNodes.push(node);} }
  replaceChildren(...nodes) { for(const node of this.childNodes)node.parent=null;this.childNodes=[];this.append(...nodes); }
  setAttribute(name,value) { this.attributes.set(name,String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(name,handler) { this.listeners.set(name,handler); }
  removeEventListener(name,handler) { if(this.listeners.get(name)===handler)this.listeners.delete(name); }
  remove() { if(this.parent)this.parent.childNodes=this.parent.childNodes.filter(node=>node!==this);this.parent=null; }
  cloneNode() { const clone=new Element(this.tagName,this.ownerDocument);clone.textContent=this.textContent;clone.append(...this.childNodes.map(node=>node.cloneNode(true)));return clone; }
  querySelector(selector) { if(selector==='a[href]')return this.childNodes.find(node=>node.tagName==='a'&&node.href)||null;return null; }
  querySelectorAll() { return []; }
}
function mountingFixture() {
  const doc={created:[],defaultView:{location:{assign(){}}},createElement(tag){const element=new Element(tag,this);this.created.push(element);return element;}};
  const host=doc.createElement('host'),fallback=doc.createElement('section');fallback.textContent='The exact saved passage remains readable.';host.append(fallback);
  host.attachShadow=()=>host.shadowRoot=doc.createElement('shadow');
  const status=doc.createElement('status'),reading=doc.createElement('a'),claim=doc.createElement('a');
  const wrapper={ownerDocument:doc,dataset:{},querySelector(selector){return {'[data-about-live-content]':host,'[data-about-panel-status]':status,'[data-about-open-reading]':reading,'[data-about-open-claim]':claim}[selector]||null;},querySelectorAll(){return [];}};
  return {doc,host,wrapper,status,reading};
}

test('A pending native stylesheet keeps the real-text fallback slotted until successful paint', async () => {
  const {mountAboutPanel}=await import('../about-live-panels.mjs');
  const fixture=mountingFixture();let paints=0;
  const pending=mountAboutPanel(fixture.wrapper,book,{renderer(){paints++;return ()=>{};}});
  const children=fixture.host.shadowRoot.childNodes;
  assert.ok(children.some(node=>node.tagName==='slot'));
  assert.equal(children.some(node=>node.dataset.aboutNative!==undefined),false);
  assert.equal(fixture.host.childNodes[0].textContent,'The exact saved passage remains readable.');
  assert.equal(paints,0);
  fixture.doc.created.find(node=>node.tagName==='link').listeners.get('load')();
  const api=await pending;
  assert.equal(paints,1);
  assert.equal(fixture.host.shadowRoot.childNodes.some(node=>node.tagName==='slot'),false);
  assert.ok(fixture.host.shadowRoot.childNodes.some(node=>node.dataset.aboutNative!==undefined));
  api.destroy();
});

test('Failed native styles restore readable saved text and an exact reading link', async () => {
  const {mountAboutPanel}=await import('../about-live-panels.mjs');
  const fixture=mountingFixture();
  const pending=mountAboutPanel(fixture.wrapper,book,{renderer(){throw Error('Must not render without styles');}});
  fixture.doc.created.find(node=>node.tagName==='link').listeners.get('error')();
  await assert.rejects(pending,/style could not load/);
  assert.ok(fixture.host.shadowRoot.childNodes.some(node=>node.textContent==='The exact saved passage remains readable.'));
  assert.equal(fixture.host.shadowRoot.querySelector('a[href]').href,book.sourceHref);
  assert.match(fixture.status.textContent,/saved reading is still available/);
  assert.equal(fixture.wrapper.dataset.aboutPanelReady,'error');
});


test('Standalone preview Library links resolve to the real site while production stays relative', () => {
  const href='/library.html#book=kant&ref=CH_KANT_01%3AA1';
  assert.equal(resolveAboutLibraryHref(href),'\/library.html#book=kant&ref=CH_KANT_01%3AA1');
  assert.equal(resolveAboutLibraryHref(href,'https://carelibrary.org/'),'https://carelibrary.org/library.html#book=kant&ref=CH_KANT_01%3AA1');
  assert.equal(resolveAboutLibraryHref('', 'https://carelibrary.org/'),'');
  assert.equal(resolveAboutLibraryHref(href,'javascript:alert(1)'),href);
});

test('A file preview native mount keeps its sheet link on the live Library origin', async () => {
  const {mountAboutPanel}=await import('../about-live-panels.mjs');
  const fixture=mountingFixture();
  const api=await mountAboutPanel(fixture.wrapper,book,{cssText:'',libraryOrigin:'https://carelibrary.org/',renderer(){return ()=>{};}});
  assert.equal(fixture.reading.href,'https://carelibrary.org'+book.sourceHref);
  api.choose('chapter');
  assert.equal(fixture.reading.href,'https://carelibrary.org'+book.chapterHref);
  api.destroy();
});
