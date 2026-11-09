import {searchReadingHref} from './beta-search.mjs';

function sourceClaim({kind, item_id, quote}) {
  return {kind, item_id, ...(quote ? {quote} : {})};
}

export function footnoteSavePayload(notes) {
  return notes.map(note => note.source ? {...note, source: sourceClaim(note.source)} : note);
}

export function nativeStudioFootnotes(draft, action, removed = new Map(), added = []) {
  const entries = new Map((draft.footnotes || []).map(note => [note.id, {...note}]));
  const position = (id, location, attributes = {}) => {
    if (!Array.isArray(location) || location.length !== 3) return;
    const [block_id, marker_offset, marker_order] = location;
    entries.set(id, {id, note: '', ...entries.get(id), ...attributes, block_id, marker_offset, marker_order});
  };
  if (action.type === 'manual-footnote') position(action.reference_id, action.location);
  for (const {id, location, note, source} of added) {
    position(id, location, {note, ...(source ? {source} : {})});
  }
  for (const id of action.removed_footnotes || []) entries.delete(id);
  for (const id of action.restored_footnotes || []) {
    if (removed.has(id)) entries.set(id, {...removed.get(id)});
  }
  for (const [id, location] of Object.entries(action.footnote_positions || {})) {
    if (entries.has(id)) position(id, location);
  }
  for (const [id, note] of Object.entries(action.footnote_notes || {})) {
    if (entries.has(id)) entries.get(id).note = note;
  }
  if (action.type === 'note' && entries.has(action.reference_id)) {
    entries.get(action.reference_id).note = action.note;
  }
  return [...entries.values()];
}

export function linkStudioFootnote(draft, action, source, id) {
  if (!source || !['passage', 'axiom'].includes(source.kind) || !source.item_id) {
    throw new Error('Search again to choose an exact reading from the published Library.');
  }
  const block = action.selection?.end_block_id;
  const offset = action.selection?.end;
  if (typeof block !== 'string' || !block || !Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('Place the cursor in your draft before adding a Library footnote.');
  }
  const existing = draft.footnotes?.find(note => note.block_id === block && note.marker_offset === offset &&
    note.source?.kind === source.kind && note.source.item_id === source.item_id && note.source.quote === source.quote);
  if (existing) return {id: existing.id, location: [block, offset, existing.marker_order], note: existing.note, source: existing.source};
  const order = Math.max(-1, ...(draft.footnotes || []).map(note => note.marker_order)) + 1;
  return {id, location: [block, offset, order], note: '', source: sourceClaim(source)};
}

export async function copyStudioFootnotes(draft, action, loadDraft) {
  const loaded = new Map([[draft.id, Promise.resolve(draft)]]);
  return Promise.all((action.pasted_footnotes || []).map(async entry => {
    const {source_document_id: documentId, source_reference_id: referenceId} = entry;
    if (!/^[a-f0-9]{32}$/.test(documentId || '') || typeof referenceId !== 'string' ||
        !Array.isArray(entry.location) || entry.location.length !== 3) {
      throw new Error('Copy the footnotes again from a draft in this account.');
    }
    if (!loaded.has(documentId)) loaded.set(documentId, loadDraft(documentId));
    const copied = (await loaded.get(documentId)).footnotes?.find(note => note.id === referenceId);
    if (!copied) throw new Error('A copied footnote could not be found. Copy it again from the source draft.');
    return {id: entry.id, location: entry.location, note: entry.note ?? copied.note,
      ...(copied.source ? {source: sourceClaim(copied.source)} : {})};
  }));
}

export function studioFootnoteReference(note) {
  const {source} = note;
  if (!source) return {...note, target: {kind: 'manual', item_id: 'NOTE:' + note.id, label: 'Footnote'}};
  const {item_id, work_id, work_title, author, year, unit_id, unit_title, text, kind} = source;
  return {...note, target: {...source, target_key: item_id,
    label: unit_title || item_id, metadata: [work_title, unit_title].filter(Boolean).join(' · '),
    academic_citation: {
      title: work_title, lead: author ? author + ', ' : '', details: year ? ' (' + year + ')' : '',
      locator: unit_title, locator_key: unit_id, source_key: work_id || unit_id, excerpt: text,
    },
    ...(kind === 'passage' && source.quote ? {clipboard_passage: {quoted: true}} : {}),
  }};
}

export function studioReaderCitation(source) {
  const {kind, item_id, work_id, author, year, work_title, unit_title, text} = source;
  const fragment = searchReadingHref(source.href, item_id);
  const route = new URLSearchParams({cite: kind, id: item_id});
  if (work_id) route.set('work', work_id);
  if (fragment) route.set('fragment', fragment);
  return {
    kind, item_id, label: unit_title || item_id, text,
    citation: [author, work_title, year, unit_title].filter(Boolean).join(', '),
    library_url: fragment ? 'care-library://read?' + route : '',
  };
}
