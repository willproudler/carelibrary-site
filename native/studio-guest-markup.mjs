const htmlNamespace = 'http://www.w3.org/1999/xhtml';
const blocks = new Set('p div h1 h2 h3 h4 h5 h6 blockquote pre ul ol hr table'.split(' '));
const inline = new Set('a b br code del em i li mark s span strike strong sub sup u tbody td th thead tr'.split(' '));
const dropped = new Set(('applet audio base button embed form frame frameset iframe img input link math meta noscript ' +
  'object plaintext script select style svg template textarea video xmp').split(' '));
const blockId = /^[A-Za-z0-9_-]{1,100}$/;
const fonts = new Set(['Iowan Old Style', 'Georgia', 'Palatino', 'Times New Roman', 'Helvetica', 'Arial', 'Menlo',
  'var(--serif, Georgia)']);
const defaultSize = 'var(--writing-default-size, 12pt)';

function copyStyle(source, target, block) {
  const {textAlign, fontFamily, fontSize} = source.style;
  if (block && ['left', 'right', 'center', 'justify'].includes(textAlign)) target.style.textAlign = textAlign;
  const font = fontFamily.replace(/^(['"])(.*)\1$/, '$2');
  if (fonts.has(font)) target.style.fontFamily = font;
  const points = Number(/^(\d{1,2})pt$/.exec(fontSize)?.[1]);
  if (fontSize === defaultSize || points >= 8 && points <= 72) target.style.fontSize = fontSize;
}

function safeHref(value) {
  if (!value || /[\s\u0000-\u001f\u007f-\u009f\\<>]/.test(value)) return '';
  try {
    const url = new URL(value);
    if (['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password) return url.href;
    if (url.protocol === 'mailto:' && url.pathname && !url.host) return url.href;
  } catch { /* An invalid link remains ordinary draft text. */ }
  return '';
}

function logicalText(node) {
  if (node.nodeType === 3) return node.data;
  if (node.localName === 'br') return '\n';
  return Array.from(node.childNodes, logicalText).join('');
}

export function sanitizeGuestMarkup(html, document = globalThis.document) {
  // Guest drafts bypass the server's allowlist. Rebuild untrusted backups in
  // an inert template before saving them or displaying a Binder reading copy.
  const source = document.createElement('template');
  source.innerHTML = html;
  const target = document.createElement('template');
  const clean = target.content.ownerDocument;
  const fragment = clean.createDocumentFragment();
  function copy(node, parent, depth = 0) {
    if (depth >= 128) throw new RangeError('Draft markup is nested too deeply.');
    if (node.nodeType === 3) {
      parent.append(clean.createTextNode(node.data));
      return;
    }
    const tag = node.localName;
    if (node.namespaceURI !== htmlNamespace || dropped.has(tag) ||
        node.hasAttribute('data-writing-footnote') || node.hasAttribute('data-a4-break')) return;
    const block = blocks.has(tag);
    if (!block && !inline.has(tag)) {
      for (const child of node.childNodes) copy(child, parent, depth + 1);
      return;
    }
    const element = clean.createElement(tag);
    const id = node.getAttribute('data-block-id');
    if (block && parent === fragment && id && blockId.test(id)) element.setAttribute('data-block-id', id);
    if (block || tag === 'span') copyStyle(node, element, block);
    if (tag === 'a') {
      const href = safeHref(node.getAttribute('href'));
      if (href) {
        element.setAttribute('href', href);
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (tag === 'td' || tag === 'th') {
      for (const name of ['colspan', 'rowspan']) {
        const value = node.getAttribute(name);
        if (value && /^[1-9]\d{0,2}$/.test(value)) element.setAttribute(name, value);
      }
    }
    if (tag === 'ol') {
      const start = node.getAttribute('start');
      if (start && /^-?\d{1,8}$/.test(start)) element.setAttribute('start', start);
    }
    for (const child of node.childNodes) copy(child, element, depth + 1);
    parent.append(element);
  }
  for (const node of source.content.childNodes) copy(node, fragment);

  let paragraph;
  for (const node of [...fragment.childNodes]) {
    if (blocks.has(node.localName)) {
      target.content.append(node);
      paragraph = undefined;
    } else if (paragraph || node.nodeType !== 3 || node.data.trim()) {
      if (!paragraph) {
        paragraph = clean.createElement('p');
        target.content.append(paragraph);
      }
      paragraph.append(node);
    }
  }
  if (!target.content.firstChild) {
    const empty = clean.createElement('p');
    empty.append(clean.createElement('br'));
    target.content.append(empty);
  }
  const rows = [...target.content.children];
  const reserved = new Set(rows.map(node => node.getAttribute('data-block-id')));
  const anchors = new Map();
  rows.forEach((node, index) => {
    let id = node.getAttribute('data-block-id');
    if (!id || anchors.has(id)) {
      id = `guest-block-${index}`;
      for (let suffix = 1; reserved.has(id) || anchors.has(id); suffix++) id = `guest-block-${index}-${suffix}`;
      node.setAttribute('data-block-id', id);
    }
    anchors.set(id, logicalText(node));
  });
  return {body: target.innerHTML, anchors};
}
