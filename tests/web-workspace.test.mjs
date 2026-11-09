import assert from 'node:assert/strict';
import test from 'node:test';
import {createTabMenus,createWorkspaceHistory,findCatalogue,manuscriptHash} from '../web-workspace.mjs';

test('catalogue search can find accents, authors and published connections without loading text', () => {
  const books=[{title:'Matière et mémoire',author:'Henri Bergson',year:'1896',slug:'bergson'}];
  const fields=[{title:'Kant × Hume',id:'FIELD:pair',field:'lateral'}];
  assert.equal(findCatalogue(books,fields,'matiere bergson')[0].href,'#book=bergson');
  assert.equal(findCatalogue(books,fields,'hume lateral')[0].href,'#field=FIELD%3Apair');
  assert.deepEqual(findCatalogue(books,fields,'unpublished'),[]);
  assert.equal(manuscriptHash('reader','abc123'),'#view=reader&draft=abc123');
});

test('workspace history keeps its entry on route replacement and discards the forward branch on a new visit', () => {
  let entries=[{hash:'',state:null}], index=0;
  const location={get hash(){return entries[index].hash;}};
  const history={
    get state(){return entries[index].state;},
    replaceState(state,_title,hash){entries[index]={hash:hash??location.hash,state};},
    go(step){index+=step;},
  };
  const push=hash=>{entries=entries.slice(0,index+1);entries.push({hash,state:null});index++;};
  let status;
  const navigation=createWorkspaceHistory(history,location,value=>{status=value;});
  assert.deepEqual(status,{back:false,forward:false});
  push('#book=kant');navigation.observe();
  push('#view=studio');navigation.observe();
  navigation.replace('#view=studio&draft=abc');
  assert.deepEqual(status,{back:true,forward:false});
  navigation.move(-1);navigation.observe();
  assert.equal(location.hash,'#book=kant');
  assert.deepEqual(status,{back:true,forward:true});
  push('#view=study-sets');navigation.observe();
  assert.deepEqual(status,{back:true,forward:false});
  navigation.move(-1);navigation.observe();
  navigation.move(-1);navigation.observe();
  assert.deepEqual(status,{back:false,forward:true});
});

test('the tab bar anchors the real File and Go menus and leaves the shelf clear', () => {
  const element = () => ({
    children:[], attributes:new Map(),
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.children=children;},
    setAttribute(key,value){this.attributes.set(key,value);},
    getAttribute(key){return this.attributes.get(key);},
  });
  const calls=[];
  const reading={headings:()=>[['book','File'],['navigate','Go']],toggle:(...args)=>calls.push(args)};
  let scope, anchors;
  const bridge={useShell({scope:next,paint}){scope=next;anchors=paint(next?reading:null);return ()=>paint(null);}};
  const host=element();
  host.ownerDocument={defaultView:{[Symbol.for('care.context-menus/1')]:bridge},createElement:element,createElementNS:element};
  const sync=createTabMenus(host);
  sync('study:WORK');
  assert.equal(scope,'study:WORK');
  assert.equal(host.hidden,false);
  assert.equal(anchors.get('book').getAttribute('aria-label'),'File');
  anchors.get('book').onclick();
  assert.deepEqual(calls,[['book',{toggle:true,focus:true}]]);
  sync('');
  assert.equal(host.hidden,true);
  assert.deepEqual(host.children,[]);
});
