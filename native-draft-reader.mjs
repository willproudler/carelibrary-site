import assets, {rememberWritingModePosition, restoreWritingModePosition, takeWritingModePosition} from './native/writing-reader-assets.mjs';
import {studioReaderCitation} from './native/studio-footnotes.mjs';

const blockTags = new Set('p div h1 h2 h3 h4 h5 h6 blockquote pre ul ol hr table'.split(' '));
const titleTags = new Set('p div h1 h2 h3 h4 h5 h6'.split(' '));
const flowTags = [...blockTags, 'br'].join(',');
const dropped = new Set('applet base button embed frame frameset iframe img input link math meta noscript object plaintext script select style svg template textarea xmp'.split(' '));
const safeId = value => typeof value === 'string' && /^[a-z\d_-]{1,128}$/i.test(value);
const escape = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const scriptData = value => JSON.stringify(value).replace(/</g, '\\u003c');

function logicalText(node) {
  if (node.nodeType === 3) return node.data;
  if (node.nodeType === 1 && !dropped.has(node.localName)) {
    return node.localName === 'br' ? '\n' : Array.from(node.childNodes, logicalText).join('');
  }
  return '';
}

function draftBlocks(draft, document) {
  const template = document.createElement('template');
  const legacyBody = typeof draft.body === 'string' ? draft.body : '';
  template.innerHTML = typeof draft.html === 'string' ? draft.html :
    legacyBody.replace(/\r\n?/g, '\n').split('\n').map(line => `<p>${escape(line) || '<br>'}</p>`).join('');
  // Keep the manuscript in a detached template. The native Reader rebuilds
  // and sanitizes each rich block when it paints the isolated iframe.
  for (const node of template.content.querySelectorAll([...dropped].join(','))) node.remove();
  let paragraph;
  const nodes = [];
  for (const node of [...template.content.childNodes]) {
    if (node.nodeType === 1 && blockTags.has(node.localName)) {
      nodes.push(node);
      paragraph = undefined;
    } else if (node.nodeType === 1 || (node.nodeType === 3 && (paragraph || node.data.trim()))) {
      if (!paragraph) {
        paragraph = template.content.ownerDocument.createElement('p');
        nodes.push(paragraph);
      }
      paragraph.append(node);
    }
  }
  if (!nodes.length) {
    const empty = document.createElement('p');
    empty.append(document.createElement('br'));
    nodes.push(empty);
  }
  const reserved = new Set(nodes.map(node => node.getAttribute('data-block-id')).filter(safeId));
  const used = new Set();
  const blocks = nodes.map((node, index) => {
    let id = node.getAttribute('data-block-id');
    if (!safeId(id) || used.has(id)) {
      id = `beta-block-${index}`;
      while (reserved.has(id) || used.has(id)) id += '-';
    }
    used.add(id);
    return {id, html: node.outerHTML, text: logicalText(node)};
  });
  return {nodes, blocks};
}

function openingTitle(nodes, blocks, title) {
  const first = nodes.findIndex(node => node.textContent.trim() || node.localName === 'hr');
  if (first < 0) return null;
  let node = nodes[first];
  while (node.localName === 'div' && node.querySelector(flowTags)) {
    node = [...node.childNodes].find(child => (child.nodeType === 1 || child.nodeType === 3) &&
      (child.textContent.trim() || child.localName === 'hr'));
    if (node?.nodeType !== 1) return null;
  }
  const key = text => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  return titleTags.has(node.localName) && !node.querySelector(flowTags) && key(node.textContent) === key(title)
    ? blocks[first].id : null;
}

function markerOffset(text, value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > text.length) return null;
  // Studio stores DOM (UTF-16) offsets; Reader addresses Unicode code points.
  const boundary = text.charCodeAt(value);
  const previous = text.charCodeAt(value - 1);
  if (boundary >= 0xdc00 && boundary <= 0xdfff && previous >= 0xd800 && previous <= 0xdbff) return null;
  return Array.from(text.slice(0, value)).length;
}

function draftReferences(draft, blocks) {
  if (!Array.isArray(draft.footnotes)) return [];
  const byId = new Map(blocks.map((block, index) => [block.id, {...block, index}]));
  const ids = new Set();
  const notes = [];
  for (const footnote of draft.footnotes) {
    if (!safeId(footnote?.id) || ids.has(footnote.id) || typeof footnote.note !== 'string') continue;
    ids.add(footnote.id);
    const block = byId.get(footnote.block_id);
    const offset = block ? (footnote.marker_offset == null ? Array.from(block.text).length :
      markerOffset(block.text, footnote.marker_offset)) : null;
    notes.push({id: footnote.id, note: footnote.note, offset, source: footnote.source, block_id: offset == null ? null : block.id,
      order: block?.index ?? Infinity, markerOrder: footnote.marker_order ?? Infinity});
  }
  notes.sort((left, right) => left.order - right.order || (left.offset ?? 0) - (right.offset ?? 0) ||
    left.markerOrder - right.markerOrder);
  return notes.map(({id, note, offset, block_id, source}, index) => ({
    id, number: index + 1, block_id, offset, note,
    ...(source ? studioReaderCitation(source) : {
      kind: 'manual', label: 'Footnote', item_id: `NOTE:${id}`, text: '', library_url: '', citation: '',
    }),
  }));
}

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  }
  return value;
}

export async function draftReaderPacket(draft, document, crypto = document.defaultView.crypto) {
  if (!safeId(draft?.id) || !Number.isSafeInteger(draft.revision) || draft.revision < 1) {
    throw new Error('Open a saved draft to use Reader.');
  }
  const title = (typeof draft.title === 'string' && draft.title.trim()) || 'Untitled';
  const {nodes, blocks} = draftBlocks(draft, document);
  const titleBlock = openingTitle(nodes, blocks, title);
  const payload = {
    title, documents: [{id: draft.id, title, revision: draft.revision, blocks, references: draftReferences(draft, blocks),
      show_title: titleBlock === null, title_block_id: titleBlock}], reviews: [],
  };
  // Reviews can be downloaded and resumed for the exact saved edition. The
  // edition never leaves this tab unless the writer chooses to download marks.
  const bytes = new TextEncoder().encode(JSON.stringify(ordered(payload)));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const id = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
  return {schema: 'care.reader.packet', version: 1, id, ...payload};
}

export function draftReaderHtml(packet, {token, reviewer = '', library = false} = {}) {
  if (!safeId(token)) throw new Error('Invalid Reader host token.');
  const fallback = packet.documents.map(({title, blocks}) =>
    `<article class="folio" aria-label="${escape(title)}">${blocks.map(({text}) => `<p>${escape(text)}</p>`).join('')}</article>`).join('');
  const values = {
    BODY_CLASS: 'embedded', CSS: assets.css, JS: assets.js,
    PACKET: scriptData(packet), SETTINGS: scriptData({
      bridge_token: token, default_reviewer: typeof reviewer === 'string' ? reviewer.trim().slice(0, 120) : '',
      web_host: true, studio_available: true, library_available: library,
    }),
    TITLE: escape(packet.title), FALLBACK: fallback,
    FRAME_CSP: "; img-src data:" + (library ? "; frame-src 'self'" : ""),
    SCRIPT_POLICY: `'nonce-${token}'`, SCRIPT_NONCE: ` nonce="${token}"`,
  };
  return assets.template.replace(/__CARE_([A-Z_]+)__/g, (marker, name) => values[name] ?? marker);
}

export function mountNativeDraftReader(host, {
  draft, reviewer, onStudio, library = false, onClose, onSearch, onError,
} = {}) {
  const document = host.ownerDocument;
  const view = document.defaultView;
  let frame;
  let stopped = false;
  let active = false;
  let handlingReaderNavigation = false;
  let approvedAddress = '';
  let finish;
  const ready = new Promise(resolve => { finish = resolve; });
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.className = 'native-draft-reader-status';
  status.textContent = 'Opening Reader…';
  host.append(status);
  const token = Array.from(view.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  const callbacks = {studio: onStudio, close: onClose};

  function started() {
    if (stopped || active) return;
    active = true;
    const position = takeWritingModePosition(view, 'reader', draft.id);
    const doc = frame.contentDocument;
    if (position && doc?.scrollingElement) {
      frame.contentWindow.careReaderDocumentZoom?.restore(position.zoom);
      const block = Array.from(doc.querySelectorAll('[data-review-block]'))
        .find(node => node.dataset.reviewBlock === position.block);
      restoreWritingModePosition(position, doc.scrollingElement, block);
    }
    status.remove();
    finish(true);
  }

  function failed() {
    if (stopped) return;
    frame?.remove();
    status.textContent = 'Reader couldn’t open this draft. Return to Studio and try again.';
    finish(false);
    onError?.();
  }

  function message(event) {
    const data = event.data;
    if (stopped || !frame || event.origin !== view.location.origin || event.source !== frame.contentWindow ||
        data?.token !== token) return;
    if (data.type === 'care-reader-ready') started();
    if (['care:numogram-companion-open','care:library-companion-open','care:library-companion-visibility','care:librarian-visibility'].includes(data.type)) {
      document.dispatchEvent(new view.CustomEvent(data.type, {detail:{open:data.open === true}}));
    }
    if (data.type === 'care-reader-search') onSearch?.(typeof data.query === 'string' ? data.query.slice(0, 500) : '');
    if (data.type === 'care-reader-action' && typeof data.action === 'string' && Object.hasOwn(callbacks, data.action)) {
      // The Reader already gave the writer a chance to keep pending marks.
      const previousAddress = view.location.href;
      handlingReaderNavigation = true;
      try { callbacks[data.action]?.(); }
      finally {
        handlingReaderNavigation = false;
        // A hash change is handled after this message callback. Carry the
        // approval only to that address and consume it on the first guard.
        if (view.location.href !== previousAddress) approvedAddress = view.location.href;
      }
    }
  }

  function readerEvent(name) {
    const reader = frame?.contentWindow;
    if (!active || !reader) return true;
    return reader.dispatchEvent(new reader.CustomEvent(name, {cancelable: true}));
  }

  view.addEventListener('message', message);
  draftReaderPacket(draft, document, view.crypto).then(packet => {
    if (stopped) return;
    frame = document.createElement('iframe');
    frame.title = 'CARE Reader';
    frame.className = 'native-draft-reader-frame';
    frame.style.cssText = 'display:block;border:0;width:100%;height:100%;min-height:0;flex:1';
    // Same-origin access is only for the synchronous Reader navigation/Find
    // hooks. The sole executable script is the nonce-bound bundled renderer;
    // draft strings only enter inert JSON and escaped fallback markup.
    frame.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox');
    frame.referrerPolicy = 'no-referrer';
    frame.addEventListener('load', () => {
      if (frame.contentDocument?.body?.classList.contains('reader-in-app')) started();
      else failed();
    }, {once: true});
    frame.srcdoc = draftReaderHtml(packet, {token, reviewer, library});
    host.append(frame);
  }).catch(failed);

  return {
    ready,
    canLeave() {
      if (handlingReaderNavigation) return true;
      const approved = approvedAddress === view.location.href;
      approvedAddress = '';
      return approved || readerEvent('care-reader-before-navigation');
    },
    find: () => !readerEvent('care-reader-find'),
    draftPaper: () => frame?.contentDocument?.querySelector('#folio'),

    rememberStudioPosition() {
      const doc = active && frame.contentDocument;
      if (!doc) return;
      rememberWritingModePosition(view, 'studio', draft.id, doc.scrollingElement,
        doc.querySelectorAll('[data-review-block]'), 'data-review-block', {
          zoom: frame.contentWindow.careReaderDocumentZoom?.snapshot(),
        });
    },
    minimizeLibrary() {
      const button = frame?.contentDocument?.querySelector('#library-pane:not([hidden]) #library-minimize');
      button?.click();
    },
    openLibrary(fragment) {
      if (!active || !library) return false;
      frame.contentWindow.postMessage({type: 'care-reader-library', token, fragment}, view.location.origin);
      return true;
    },
    destroy() {
      stopped = true;
      active = false;
      view.removeEventListener('message', message);
      frame?.remove();
      status.remove();
      finish(false);
    },
  };
}
