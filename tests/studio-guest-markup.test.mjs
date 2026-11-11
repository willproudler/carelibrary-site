import assert from 'node:assert/strict';
import test from 'node:test';
import {sanitizeGuestMarkup, guestParagraphStyles} from '../native/studio-guest-markup.mjs';

// Supply the tree that an inert browser template parses. The test exercises
// reconstruction of that tree without a browser or another markup parser.
function parsedMarkup({definitions, typography = {}} = {}) {
  const templates = [];
  const text = data => ({nodeType: 3, data});
  class Fragment {
    ownerDocument = document;
    childNodes = [];
    get firstChild() { return this.childNodes[0]; }
    get children() { return this.childNodes.filter(node => node.localName); }
    append(...nodes) {
      for (const node of nodes) {
        const previous = node.parent?.childNodes;
        if (previous) previous.splice(previous.indexOf(node), 1);
        node.parent = this;
        this.childNodes.push(node);
      }
    }
  }
  function element(tag, attributes = {}, children = [], style = {}) {
    const node = Object.assign(new Fragment(), {
      namespaceURI: 'http://www.w3.org/1999/xhtml', localName: tag, nodeType: 1, attributes,
      style: {fontFamily: '', fontSize: '', textAlign: '', ...style},
      getAttribute(name) { return this.attributes[name] ?? null; },
      hasAttribute(name) { return Object.hasOwn(this.attributes, name); },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
    });
    node.append(...children);
    return node;
  }
  const document = {
    createElement(tag) {
      if (tag !== 'template') return element(tag);
      const template = {
        content: new Fragment(),
        set innerHTML(value) {
          assert.equal(value, 'input');
          this.content.append(...source);
        },
        get innerHTML() { return 'browser serialization'; },
      };
      templates.push(template);
      return template;
    },
    createTextNode: text,
    createDocumentFragment: () => new Fragment(),
  };
  const source = [
    element('h2', {'data-block-id': 'heading', onclick: 'run()', ...(definitions ? {'data-writing-styles': definitions} : {})}, [text('😀'), element('br'), text('Prose')],
      {fontFamily: 'var(--serif, Georgia)', fontSize: '14pt', textAlign: 'center', backgroundImage: 'url(https://example.test)', ...typography}),
    element('p', {'data-block-id': 'heading', ...(definitions ? {'data-writing-styles': definitions} : {})}, [
      element('h3', definitions ? {'data-writing-styles': definitions} : {}, []),
      element('a', {href: 'javascript:run()'}, [text('Untrusted')]),
      element('a', {href: 'https://example.test/read', ping: 'https://example.test/track'}, [text(' link')]),
      element('img', {src: 'https://example.test/track', onerror: 'run()'}),
      element('script', {}, [text('run()')]),
      element('span', {'data-writing-footnote': ''}, [text('1')]),
    ]),
    element('p', {'data-block-id': 'guest-block-1'}, [text('Reserved')]),
    text('Unwrapped prose'),
  ];
  return {document, output: () => templates[1].content};
}

test('guest markup retains anchored prose and formatting while dropping active content', () => {
  const {document, output} = parsedMarkup();
  const {body, anchors} = sanitizeGuestMarkup('input', document);
  const [heading, paragraph, reserved, tail] = output().children;
  assert.equal(body, 'browser serialization');
  assert.deepEqual(heading.attributes, {'data-block-id': 'heading'});
  assert.deepEqual(heading.style, {fontFamily: 'var(--serif, Georgia)', fontSize: '14pt', textAlign: 'center'});
  assert.equal(anchors.get('heading'), '😀\nProse');
  assert.equal(anchors.get('heading').length, 8);
  assert.equal(paragraph.getAttribute('data-block-id'), 'guest-block-1-1');
  assert.deepEqual(paragraph.children.map(node => node.attributes), [
    {}, {}, {href: 'https://example.test/read', rel: 'noopener noreferrer'},
  ]);
  assert.equal(anchors.get('guest-block-1-1'), 'Untrusted link');
  assert.equal(anchors.get(reserved.getAttribute('data-block-id')), 'Reserved');
  assert.equal(anchors.get(tail.getAttribute('data-block-id')), 'Unwrapped prose');
});

const style = {font: 'Georgia', size: '18', bold: true, italic: false, underline: true, align: 'left', weight: '700'};

test('guest saves retain typed heading presets and typography on the first block only', () => {
  const definitions = JSON.stringify({h2: style, p: {...style, font: 'default', size: 'default'}});
  const {document, output} = parsedMarkup({definitions, typography: {fontWeight: '700', fontStyle: 'italic', textDecorationLine: 'underline'}});
  sanitizeGuestMarkup('input', document);
  const [heading, paragraph] = output().children;
  assert.deepEqual(JSON.parse(heading.getAttribute('data-writing-styles')), JSON.parse(definitions));
  assert.equal(paragraph.getAttribute('data-writing-styles'), null);
  assert.equal(paragraph.children[0].getAttribute('data-writing-styles'), null);
  assert.equal(heading.style.fontWeight, '700');
  assert.equal(heading.style.fontStyle, 'italic');
  assert.equal(heading.style.textDecorationLine, 'underline');
});

test('guest heading preset validation rejects arbitrary attributes and CSS values', () => {
  const invalid = [null, '', '[]', '{}', '{', 'x'.repeat(4097),
    JSON.stringify({script: style}), JSON.stringify({h2: {...style, background: 'red'}}),
    JSON.stringify({h2: {...style, font: 'url(https://example.test)'}}),
    JSON.stringify({h2: {...style, size: '18px'}}), JSON.stringify({h2: {...style, size: '018'}}),
    JSON.stringify({h2: {...style, bold: 1}}), JSON.stringify({h2: {...style, weight: '1000'}})];
  for (const value of invalid) assert.equal(guestParagraphStyles(value), '');
  assert.deepEqual(JSON.parse(guestParagraphStyles(JSON.stringify({h2: style}))), {h2: style});
});
