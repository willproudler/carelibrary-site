// First drafts is an owned Binder location. The document stays editable and
// keeps its saved text, footnotes and previous folder while it is on this shelf.
const untitled = /^(?:untitled(?:\s+(?:draft|document))?|new\s+(?:draft|document))(?:\s*\(?\d+\)?)?$/i;
const openingTags = 'h1,h2,h3,h4,h5,h6,p,div,blockquote,pre,li';

export function firstDraftTitle({title = '', body = '', format = 'text'}, {document = globalThis.document, stamp = Date.now()} = {}) {
  if (title.trim() && !untitled.test(title.trim())) return title;
  let lines;
  if (format === 'html') {
    const template = document.createElement('template');
    template.innerHTML = body;
    for (const decoration of template.content.querySelectorAll('[data-writing-footnote],.draft-footnotes')) decoration.remove();
    const text = node => node.nodeType === 3 ? node.textContent : [...node.childNodes].map(text).join(' ');
    lines = [...template.content.querySelectorAll(openingTags)].map(text);
  } else lines = body.split(/\r\n?|\n/);
  for (const incoming of lines) {
    const text = incoming.trim().replace(/\s+/gu, ' ');
    if (!text || untitled.test(text)) continue;
    let label = text.split(' ').slice(0, 12).join(' ');
    if ([...label].length > 84) {
      const truncated = [...label].slice(0, 84).join('');
      label = truncated.includes(' ') ? truncated.slice(0, truncated.lastIndexOf(' ')) : truncated;
    }
    return label.replace(/[ ,;:–—-]+$/u, '') + (label.length < text.length ? '…' : '');
  }
  const date = new Intl.DateTimeFormat('en-GB', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/London'}).format(stamp);
  return `First draft — ${date}`;
}

export function studioBinderDocuments(entries, binder) {
  const firstDrafts = new Set(binder?.first_drafts || []);
  return entries.map(entry => ({...entry, folder_id: binder?.locations?.[entry.id] || null,
    first_draft: firstDrafts.has(entry.id)}));
}
