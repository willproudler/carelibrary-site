import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {betaBinderControlAvailable,filterBetaStudioControls} from '../studio-editor-adapter.mjs';

const button=(text,label=null,action=null)=>({textContent:text,attributes:{},hidden:false,disabled:false,
  getAttribute:name=>name==='aria-label'?label:name==='data-action'?action:null,setAttribute(name,value){this.attributes[name]=value;}});

test('the beta exposes supported draft tools while withholding unimplemented Book storage controls',()=>{
  const enabled=['New draft','New folder','Move to folder…','Move to Drafts','Rename…','Move to Trash','Read together'];
  const unsupported=['New book','New book from selection…','Convert to Book','Send to First drafts','Collaborate'];
  const controls=[...enabled,...unsupported].map(text=>button(text));
  controls.push(button('', 'New book'));
  for(const action of ['collaborate','remote-send','remote-connect'])controls.push(button('',null,action));
  filterBetaStudioControls({querySelectorAll:()=>controls});
  for(const control of controls){
    const available=betaBinderControlAvailable(control);
    assert.equal(control.hidden,!available);
    assert.equal(control.disabled,!available);
    if(!available)assert.equal(control.attributes['aria-hidden'],'true');
  }
  for(const label of enabled)assert(betaBinderControlAvailable(button(label)));
  for(const control of controls.slice(enabled.length))assert.equal(betaBinderControlAvailable(control),false);
});

test('web Studio loads its capability adapter and production staging includes it',()=>{
  const host=readFileSync(new URL('../studio-workspace.mjs',import.meta.url),'utf8');
  assert.match(host,/import\('\.\/studio-editor-adapter\.mjs'\)/);
  assert.match(host,/action\.operation === 'place-draft'\) binderAck\.binder_placed = true/);
  const build=readFileSync(new URL('../tools/build-production-site.py',import.meta.url),'utf8');
  assert.match(build,/studio-editor-adapter\.mjs/);
  const adapter=readFileSync(new URL('../studio-editor-adapter.mjs',import.meta.url),'utf8');
  assert.match(adapter,/childList: true, subtree: true/);
  assert.match(adapter,/observer\?\.disconnect\(\)/);
  const styles=readFileSync(new URL('../web-workspace.css',import.meta.url),'utf8');
  assert.match(styles,/\[data-beta-studio\] \[data-action="collaborate"\]/);
  assert.match(styles,/\[data-beta-studio\] \.binder-archive \{ display: none !important; \}/);
});
