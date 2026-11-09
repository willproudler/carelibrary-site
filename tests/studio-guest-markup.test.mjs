import assert from 'node:assert/strict';
import test from 'node:test';
import {sanitizeGuestMarkup} from '../native/studio-guest-markup.mjs';

// Supply the tree that an inert browser template parses. The test exercises
// reconstruction of that tree without a browser or another markup parser.
function parsedMarkup() {
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
    element('h2', {'data-block-id': 'heading', onclick: 'run()'}, [text('😀'), element('br'), text('Prose')],
      {fontFamily: 'var(--serif, Georgia)', fontSize: '14pt', textAlign: 'center', backgroundImage: 'url(https://example.test)'}),
    element('p', {'data-block-id': 'heading'}, [
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
    {}, {href: 'https://example.test/read', rel: 'noopener noreferrer'},
  ]);
  assert.equal(anchors.get('guest-block-1-1'), 'Untrusted link');
  assert.equal(anchors.get(reserved.getAttribute('data-block-id')), 'Reserved');
  assert.equal(anchors.get(tail.getAttribute('data-block-id')), 'Unwrapped prose');
});
