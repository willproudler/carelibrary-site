import assert from 'node:assert/strict';
import test from 'node:test';
import {binderActionPayload, studioBinderApi} from '../native/beta-binder.mjs';

test('Binder requests omit manuscript fields and rebase only the active draft revision', () => {
  const revisions = {active: 1, another: 2};
  const action = {type: 'binder', operation: 'folder-from-selection', document_id: 'active',
    folder_name: 'Project', folder_id: null, document_ids: ['active', 'another'], document_revisions: revisions,
    html: '<p>Private text</p>', body: 'Private text', footnote_notes: {ref: 'Private note'}, title: 'Private title'};
  assert.deepEqual(binderActionPayload(action, 3), {operation: 'folder-from-selection', folder_name: 'Project',
    folder_id: null, document_ids: ['active', 'another'], document_revisions: {active: 3, another: 2}});
  assert.deepEqual(revisions, {active: 1, another: 2});

  const rename = {operation: 'rename', item_kind: 'document', document_id: 'active', target_id: 'another',
    target_revision: 2, name: 'New title', body: 'Private text'};
  assert.equal(binderActionPayload(rename, 3).target_revision, 2);
  assert.equal(binderActionPayload({...rename, target_id: 'active'}, 3).target_revision, 3);
  assert.throws(() => binderActionPayload({operation: 'unknown'}), /Unsupported Binder action/);
});

test('Binder API is account-scoped and preserves conflict status', async () => {
  const requests = [];
  const api = studioBinderApi(async (path, request) => {
    requests.push({path, ...request});
    return new Response(JSON.stringify(request.method === 'GET' ? {folders: [], locations: {}} : {error: 'draft_conflict'}),
      {status: request.method === 'GET' ? 200 : 409});
  });
  const account = 'writer@example.test';
  assert.deepEqual(await api.list(account), {folders: [], locations: {}});
  await assert.rejects(api.act(account, {operation: 'move', document_id: 'active', item_kind: 'document',
    target_id: 'active', target_revision: 2, folder_id: null}, 3), {code: 'draft_conflict', status: 409});
  assert.ok(requests.every(request => request.path === '/api/studio/binder' && request.cache === 'no-store' &&
    request.credentials === 'same-origin' && request.headers['X-Care-Account'] === account));
  assert.deepEqual(JSON.parse(requests[1].body), {account, operation: 'move', item_kind: 'document',
    target_id: 'active', target_revision: 3, folder_id: null});
});

test('the current Studio placement dialog uses the supported beta move API', () => {
  const action = {operation:'place-draft',document_id:'active',target_id:'active',target_revision:2,
    folder_id:'a-folder',first_draft:false,html:'Private manuscript markup'};
  assert.deepEqual(binderActionPayload(action,3),{operation:'move',item_kind:'document',target_id:'active',
    target_revision:3,folder_id:'a-folder'});
  assert.equal(action.operation,'place-draft');
  assert.throws(()=>binderActionPayload({...action,first_draft:true},3),/First drafts.*Mac/);
  for(const operation of ['create-book','book-save','book-drag','book-container-drop','convert-folder-to-book'])
    assert.throws(()=>binderActionPayload({operation}),/Unsupported Binder action/);
});
