const binderFields = {
  'create-folder': ['folder_name', 'folder_id'],
  'folder-from-selection': ['folder_name', 'folder_id', 'document_ids', 'document_revisions'],
  'move-selection': ['folder_id', 'document_ids', 'document_revisions'],
  move: ['item_kind', 'target_id', 'target_revision', 'folder_id'],
  'place-draft': ['item_kind', 'target_id', 'target_revision', 'folder_id', 'first_draft'],
  rename: ['item_kind', 'target_id', 'target_revision', 'name'],
  trash: ['item_kind', 'target_id', 'target_revision'],
  restore: ['item_kind', 'target_id'],
  read: ['document_ids'],
};

const binderErrors = {
  binder_invalid: 'Choose a valid draft, folder or name.',
  binder_folder_not_found: 'That folder is no longer available.',
  binder_trash_not_found: 'That item is no longer in Trash.',
  binder_name_taken: 'This location already has a folder with that name.',
  binder_folder_limit: 'This account has reached the Binder folder limit.',
  binder_folder_contains_first_drafts: 'Move the First drafts out of this folder before moving it to Trash.',
  binder_cycle: 'A folder cannot move inside itself or a subfolder.',
  binder_preview_too_large: 'Choose fewer drafts to read together.',
  draft_too_large: 'Use a shorter draft name.',
  invalid_draft: 'Choose a valid draft name.',
  draft_not_found: 'That draft is no longer available.',
  draft_conflict: 'That draft changed in another window. Refresh the Binder and try again.',
  account_changed: 'This window is signed in to a different account.',
  login_required: 'Sign in again to use the Binder.',
};

export function binderActionPayload(action, activeRevision) {
  if (action.operation === 'place-draft') {
    if (typeof action.first_draft !== 'boolean') throw new Error('Choose a valid draft location.');
    action = {...action, item_kind: 'document'};
  }
  const {operation, document_id: activeId} = action;
  if (!Object.hasOwn(binderFields, operation)) throw new Error('Unsupported Binder action.');
  const payload = {operation};
  for (const key of binderFields[operation]) {
    if (action[key] !== undefined) payload[key] = action[key];
  }
  // Native actions carry the versions seen when the user pressed the button.
  // A preceding autosave can advance the open draft without touching the others.
  if (Number.isSafeInteger(activeRevision) && activeRevision > 0) {
    if (payload.item_kind === 'document' && payload.target_id === activeId && operation !== 'restore') {
      payload.target_revision = activeRevision;
    }
    if (payload.document_revisions && Object.hasOwn(payload.document_revisions, activeId)) {
      payload.document_revisions = {...payload.document_revisions, [activeId]: activeRevision};
    }
  }
  return payload;
}

export function studioBinderApi(fetcher = globalThis.fetch) {
  async function request(account, method, payload, signal) {
    const response = await fetcher('/api/studio/binder', {
      method, cache: 'no-store', credentials: 'same-origin', ...(signal ? {signal} : {}),
      headers: {'X-Care-Account': account, ...(payload ? {'Content-Type': 'application/json'} : {})},
      ...(payload ? {body: JSON.stringify({...payload, account})} : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Object.hasOwn(binderErrors, result.error) ? binderErrors[result.error] : 'CARE could not finish this Binder action. Try again.';
      const error = new Error(message);
      error.code = result.error;
      error.status = response.status;
      throw error;
    }
    return result;
  }
  return {
    list: (account, {signal} = {}) => request(account, 'GET', undefined, signal),
    act: (account, action, activeRevision) => request(account, 'POST', binderActionPayload(action, activeRevision)),
  };
}
