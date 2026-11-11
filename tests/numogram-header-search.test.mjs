import assert from 'node:assert/strict';
import test from 'node:test';
import mountNumogramAtlas from '../native/numogram-atlas.mjs';
import {findNumogramReferences} from '../native/numogram-header-search.mjs';
import reference from '../native/numogram-reference.mjs';

const target = query => findNumogramReferences(reference, query).map(({kind, id}) => ({kind, id}));

test('finds published demons by name, alias, ID and either order of their net-span', () => {
  for (const query of ['Lurgo', 'LEGB', 'Legba', 'MESH-00', 'mesh00', '1::0', '0–1']) {
    assert.deepEqual(target(query), [{kind:'demon', id:'MESH-00'}], query);
  }
});

test('returns the real card and skill IDs across all three correspondence shelves', () => {
  assert.deepEqual(target('Fool'), [{kind:'card', id:'philosophers-tarot:major:0'}]);
  assert.deepEqual(target('Antonin Artaud'), [{kind:'card', id:'philosophers-tarot:major:0'}]);
  assert.deepEqual(target('The Initiation'), [{kind:'card', id:'acephalous-tarot:major:0'}]);
  assert.deepEqual(target('Volition'), [{kind:'skill', id:'disco-skills:7'}]);
  assert.equal(findNumogramReferences(reference, 'acephalous tarot', 1).length, 1);
});

test('ranks exact names and aliases before prefixes and incidental matches', () => {
  const data = {demons:[
    {id:'exact', name:'Z name', aliases:['Logic']},
    {id:'prefix', name:'A name', aliases:['Logical']},
    {id:'incidental', name:'A logic of gates'},
  ]};
  assert.deepEqual(findNumogramReferences(data, 'Logic').map(({id}) => id), ['exact', 'prefix', 'incidental']);
  assert.deepEqual(target('118'), []);
});

test('the public demon panel shows only books still available in the beta catalogue', () => {
  const [published, unavailable] = reference.public_books_by_demon['MESH-02'];
  const content = {innerHTML:''}, handlers = {}, opened = [];
  const frames = new Map(), readiness = [];
  let frameId = 0;
  const ownerDocument = {addEventListener() {}, removeEventListener() {}, dispatchEvent() {}};
  const frame = {
    document:ownerDocument,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    matchMedia() { return {matches:true}; },
    CustomEvent:class { constructor(type, options) { this.type=type; Object.assign(this, options); } },
  };
  ownerDocument.defaultView = frame;
  const root = {
    ownerDocument,
    get childElementCount() { return content.innerHTML ? 1 : 0; },
    querySelector: selector => selector === '[data-content]' ? content : null,
    contains: () => true,
    addEventListener(type, handler) { handlers[type] = handler; },
    removeEventListener(type) { delete handlers[type]; },
  };
  const shadow = {querySelector: () => root, replaceChildren() {}};
  const host = {ownerDocument, shadowRoot:shadow, dataset:{}, isConnected:true,
    setAttribute() {}, removeAttribute() {}, dispatchEvent(event) { readiness.push(event); }};
  const atlas = mountNumogramAtlas(host, {
    libraryBooks:[{id:published, title:'Published book', slug:'beta-public'}],
    openSource: href => opened.push(href),
  });
  try {
    atlas.openReference({kind:'demon', id:'MESH-02'});
    assert.match(content.innerHTML, /Books in CARE Library/);
    assert.match(content.innerHTML, /Published book/);
    assert.ok(!content.innerHTML.includes(unavailable));
    assert.doesNotMatch(content.innerHTML, /Matrix record/);
    assert.equal(readiness.length, 0, 'The panel must render before readiness is announced');
    for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
    assert.equal(readiness.filter(event => event.type === 'care:numo-ready').length, 1);
    assert.equal(host.dataset.careNumoReady, 'true');
    handlers.click({target:{closest:() => ({dataset:{instrumentPublicBook:published}})}});
    assert.deepEqual(opened, ['/library.html#book=beta-public']);

    atlas.openReference({kind:'demon', id:reference.demons.find(demon => !reference.public_books_by_demon[demon.id]).id});
    assert.doesNotMatch(content.innerHTML, /Matrix record|Books in CARE Library/);
  } finally {
    atlas.unmount();
    assert.equal(host.dataset.careNumoReady, undefined);
    assert.equal(frames.size, 0, 'Unmount cancels pending browser frames');
  }
});
