/* Selected saved fields use the same native reader as the desktop app. */
export function publicFields(data, adapter) {
  return [...(data.lateral?.id ? [adapter.savedConnection] : []), ...(data.fields || [])];
}
export function fieldPayload(field, adapter, state = {}) {
  const stacks = {}, member_load_errors = {};
  for (const member of field.bundle.members || []) {
    const id = member.work_id || member.id;
    const work = adapter.works.find(work => work.id === id || work.version_work_id === id);
    if (!work) {member_load_errors[id]='This source book has not been published to the beta yet. Its saved reading remains available below.';continue;}
    const selected = state.fieldBookStates?.[id] || {};
    const stack = adapter.stack(work.id, selected);
    stacks[id] = {...stack, work:{...stack.work,id}, work_id:id};
  }
  return {field:{...field.bundle,member_load_errors,...(state.fieldSaved || {}),saved_focus:state.fieldSavedFocus},stacks,reference:state.fieldReference || null};
}
export function fieldReference(field, paneId, referenceId) {
  const entries = field.references || {};
  const exact = entries[`${paneId}|${referenceId}`];
  if (exact) return exact;
  if (paneId) return null;
  const matches = Object.entries(entries).filter(([key]) => key.endsWith(`|${referenceId}`));
  return matches.length === 1 ? matches[0][1] : null;
}
export async function loadPublicField(field, fetcher = fetch) {
  if (field.bundle) return field;
  if (!/^\.\/data\/fields\/[a-zA-Z0-9_-]+\.json$/.test(field.bundle_url || '')) throw Error('This saved reading has no published file.');
  const response = await fetcher(field.bundle_url, {cache:'no-cache'});
  if (!response.ok) throw Error('This reading is still being published. Please try again shortly.');
  const payload = await response.json();
  if (!payload.bundle || payload.bundle.id !== field.id || payload.bundle.field !== field.field) throw Error('The published reading does not match this shelf entry.');
  field.bundle = {...payload.bundle,members:field.members || payload.bundle.members};field.references = payload.references || {};
  return field;
}
