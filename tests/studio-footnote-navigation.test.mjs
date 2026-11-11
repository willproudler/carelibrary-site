import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createStudioDraftState, nativeStudioDocument, nativeStudioFootnotes,
  resolveStudioFootnoteReading, studioFootnoteFragment, studioLibraryFragment} from '../studio-workspace.mjs';
import {searchReadingHref} from '../native/beta-search.mjs';

const source = {kind:'axiom',item_id:'CH_SOURCE:A17',work_id:'source-work',text:'The saved axiom.',
  href:'#book=source&ref=CH_SOURCE%3AA17'};
const note = {id:'linked-note',block_id:'claim',marker_offset:15,marker_order:0,note:'Keep my own note.',source};

test('a footnote opens its exact reading, including older book-only addresses', () => {
  assert.equal(studioFootnoteFragment(source),'#book=source&focus=CH_SOURCE%3AA17');
  assert.equal(studioFootnoteFragment({...source,href:'#book=source'}),'#book=source&focus=CH_SOURCE%3AA17');
  assert.equal(studioFootnoteFragment({...source,href:'#field=corpus&scope=saved-v1&ref=CH_SOURCE%3AA17'}),
    '#field=corpus&scope=saved-v1&ref=CH_SOURCE%3AA17');
  assert.equal(studioFootnoteFragment({...source,href:'#scope=saved-v1&field=corpus&ref=CH_SOURCE%3AA17'}),
    '#field=corpus&scope=saved-v1&ref=CH_SOURCE%3AA17');
  for (const href of ['https://elsewhere.test/#book=source','#view=studio&draft=private',
    '#book=source&ref=CH_SOURCE%3AA18','#book=source&focus=CH_SOURCE%3AA18',
    '#book=source&ref=CH_SOURCE%3AA17&ref=CH_SOURCE%3AA18']) {
    assert.equal(studioFootnoteFragment({...source,href}),null);
  }
});

test('an ID-only footnote recovers only its exact published kind, ID and work', async () => {
  const draft={footnotes:[{...note,source:{kind:'axiom',item_id:source.item_id,work_id:source.work_id}}]};
  const calls=[];
  const actual=await resolveStudioFootnoteReading(draft,note.id,{search:async request=>{
    calls.push(request);
    return{results:[{...source,work_id:'other-work'}, {...source,item_id:'CH_SOURCE:A18'},
      {...source,kind:'passage'},source]};
  }});
  assert.equal(actual.href,'#book=source&focus=CH_SOURCE%3AA17');
  assert.deepEqual(calls,[{query:source.item_id,kind:'axiom',mode:'classic',limit:8}]);
  assert(!draft.footnotes[0].source.href,'Opening a reading does not rewrite its saved citation');
  await assert.rejects(resolveStudioFootnoteReading(draft,note.id,{search:async()=>({results:[{...source,work_id:'wrong'}]})}),
    /not available in the published Library/);
});

test('a saved scoped footnote route needs no search or silent canonical replacement', async () => {
  const saved={...source,href:'#field=corpus&scope=saved-v1&ref=CH_SOURCE%3AA17'};
  const actual=await resolveStudioFootnoteReading({footnotes:[{...note,source:saved}]},note.id,
    {search:()=>assert.fail('An exact saved route remains edition scoped')});
  assert.equal(actual.href,saved.href);
  await assert.rejects(resolveStudioFootnoteReading({footnotes:[{...note,source:undefined}]},note.id),
    /no linked Library reading/);
});

test('an unusable saved edition cannot silently fall back to another published reading', async () => {
  for (const href of ['#field=corpus&scope=saved-v1&ref=CH_SOURCE%3AA18',
    '#scope=saved-v1&ref=CH_SOURCE%3AA17', '#book=source&ref=CH_SOURCE%3AA17&ref=CH_SOURCE%3AA18']) {
    const draft={footnotes:[{...note,source:{...source,href}}]};
    await assert.rejects(resolveStudioFootnoteReading(draft,note.id,
      {search:()=>assert.fail('An explicit saved route must not become a canonical edition')}),
    /saved Library route is unavailable/);
    assert.equal(draft.footnotes[0].source.href,href);
  }
});

function actionHandler(scope) {
  const code=readFileSync(new URL('../studio-workspace.mjs',import.meta.url),'utf8');
  const open=code.slice(code.indexOf('  function openLibraryReading('),code.indexOf('\n  function openLibrary(',code.indexOf('  function openLibraryReading(')));
  const handle=code.slice(code.indexOf('  async function handleAction('),code.indexOf('\n  function openInitialDraft(',code.indexOf('  async function handleAction(')));
  return new Function('scope',`with(scope){${open}\nreturn ${handle};}`)(scope);
}

test('the real footnote action opens Library beside the same draft without a prose write', async () => {
  const original={id:'draft',title:'My writing',body:'<p data-block-id="claim">Keep this prose.</p>',
    format:'html',revision:7,updated_at:1,footnotes:[note]};
  const state=createStudioDraftState({account:'writer@example.test',api:{load:async()=>({draft:original}),
    update:()=>assert.fail('A reading click must not write unchanged draft prose')},autoSave:false,change(){}});
  const draft=await state.load(original.id),editor={},routes=[],acks=[],messages=[];
  const before=JSON.stringify(nativeStudioDocument(draft));
  const scope={store:state,active:draft,mounted:editor,mode:'studio',local:false,editing:null,pendingNavigation:null,
    removedFootnotes:new Map(),nativeStudioDocument,nativeStudioFootnotes,resolveStudioFootnoteReading,
    searchReadingHref,studioLibraryFragment,libraryReading:null,
    setLibraryDock:(fragment,reading)=>routes.push({fragment,reading}),showRecovery:(text='')=>messages.push(text),
    renderEditor:ack=>acks.push(ack),notify(){},fullFeature(){assert.fail('Linked footnotes are a supported web feature');}};
  await actionHandler(scope)({type:'axiom-footnote',nonce:'open-note',document_id:draft.id,
    title:draft.title,html:draft.body,reference_id:note.id});
  assert.equal(routes.length,1);assert.equal(routes[0].fragment,'#book=source&focus=CH_SOURCE%3AA17');
  assert.equal(scope.active,draft);assert.equal(scope.mounted,editor,'The writing surface remains mounted beside Library');
  assert.equal(scope.libraryReading.focus.item_id,source.item_id);
  assert.equal(JSON.stringify(nativeStudioDocument(draft)),before);assert.equal(draft.revision,7);
  assert(!draft.dirty);assert(!acks[0].error);assert.deepEqual(messages,['']);
});

test('an asynchronous citation lookup cannot open against a different writing file', async () => {
  const original={id:'draft',title:'My writing',body:'<p data-block-id="claim">Keep this prose.</p>',
    format:'html',revision:7,updated_at:1,footnotes:[{...note,source:{kind:source.kind,item_id:source.item_id}}]};
  const state=createStudioDraftState({account:'writer@example.test',api:{load:async()=>({draft:original}),
    update:()=>assert.fail('No unchanged prose write')},autoSave:false,change(){}});
  const draft=await state.load(original.id),editor={},routes=[],acks=[];
  let begin,finish;
  const started=new Promise(resolve=>{begin=resolve;});
  const response=new Promise(resolve=>{finish=resolve;});
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{begin();return response;};
  const scope={store:state,active:draft,mounted:editor,mode:'studio',local:false,editing:null,pendingNavigation:null,
    removedFootnotes:new Map(),nativeStudioDocument,nativeStudioFootnotes,resolveStudioFootnoteReading,
    searchReadingHref,studioLibraryFragment,libraryReading:null,setLibraryDock:route=>routes.push(route),
    showRecovery(){},renderEditor:ack=>acks.push(ack),notify(){}};
  try {
    const task=actionHandler(scope)({type:'axiom-footnote',nonce:'open-note',document_id:draft.id,
      title:draft.title,html:draft.body,reference_id:note.id});
    await started;
    scope.active={id:'a-different-file'};
    finish(new Response(JSON.stringify({results:[source]}),{status:200,headers:{'Content-Type':'application/json'}}));
    await task;
    assert.equal(routes.length,0);assert.equal(acks.length,0);assert.equal(draft.revision,7);
  } finally {globalThis.fetch=originalFetch;}
});
