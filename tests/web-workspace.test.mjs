import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createTabMenus,createWorkspaceHistory,findCatalogue,manuscriptHash,updateLibraryMenu} from '../web-workspace.mjs';

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

test('the Library dropdown hands reading commands off to the real File and Go menus', () => {
  const element = () => ({
    children:[], attributes:new Map(),
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.children=children;},
    setAttribute(key,value){this.attributes.set(key,value);},
    getAttribute(key){return this.attributes.get(key);},
  });
  const calls=[];
  const reading={
    headings:()=>[['book','File'],['navigate','Go']],
    toggle:(...args)=>calls.push(args),
    dismiss:()=>calls.push('dismiss reading menu'),
  };
  let scope, anchors;
  const bridge={useShell({scope:next,paint}){scope=next;anchors=paint(next?reading:null);return ()=>paint(null);}};
  const host=element();
  host.ownerDocument={defaultView:{[Symbol.for('care.context-menus/1')]:bridge},createElement:element,createElementNS:element};
  const compactAnchor=element();
  const sync=createTabMenus(host,{compactAnchor,beforeOpen:()=>calls.push('close Library dropdown')});
  sync('study:WORK');
  assert.equal(scope,'study:WORK');
  assert.equal(host.hidden,false);
  assert.equal(anchors.get('$compact'),compactAnchor);
  assert.equal(anchors.get('book').getAttribute('aria-label'),'File');
  anchors.get('book').onclick();
  anchors.get('navigate').onkeydown({key:'ArrowUp',preventDefault:()=>calls.push('prevent arrow scroll')});
  sync.dismiss();
  assert.deepEqual(calls,[
    'close Library dropdown',['book',{toggle:true,focus:true}],
    'prevent arrow scroll','close Library dropdown',['navigate',{focus:true,last:true}],
    'dismiss reading menu',
  ]);
  sync('');
  assert.equal(host.hidden,true);
  assert.deepEqual(host.children,[]);
});

test('Library Home and workspace commands live in the CARE Library dropdown, leaving the tab rail clear', () => {
  const html=readFileSync(new URL('../library.html',import.meta.url),'utf8');
  const menu=html.match(/<details[^>]*id="workbench-library-menu"[^>]*>([\s\S]*?)<\/details>/)[1];
  assert.match(menu,/<summary[^>]*aria-label="CARE Library menu"/);
  assert.match(menu,/workbench-brand-chevron/);
  assert.match(menu,/<a(?![^>]*\bhidden\b)[^>]*href="\/library\.html"[^>]*>[^\n]*Library Home<\/a>/);
  const commands=/data-open-readings|id="reading-tab-menus"|data-write-beside|data-separate-tabs|data-file-group/g;
  assert.equal([...new Set(menu.match(commands))].length,5);
  const tabs=html.match(/<div[^>]*id="reading-tabbar"[^>]*>([\s\S]*?)<div id="load-status"/)[1];
  assert.match(tabs,/id="open-books"/);
  assert.match(tabs,/id="reading-tab-scroll"/);
  assert.doesNotMatch(tabs,commands);
});

test('Library dropdown keeps Home available and adapts command groups to the active workspace', () => {
  const groups=['library','numogram','documents'].map(fileGroup=>({dataset:{fileGroup}}));
  const command=editorOnly=>({hasAttribute:name=>name==='data-studio-editor-only'&&editorOnly});
  const commands=[command(true),command(false)];
  const home={hidden:false};
  const menu={
    querySelectorAll:selector=>selector==='[data-file-group]'?groups:commands,
    querySelector:()=>home,
  };
  for(const [view,visibleGroups,visibleCommands] of [
    ['library',['library','documents'],[false,false]],
    ['workspace',['library','documents'],[false,false]],
    ['studio',['documents'],[true,true]],
    ['reader',['documents'],[false,true]],
    ['numogram',['numogram'],[false,false]],
  ]){
    updateLibraryMenu(menu,view);
    assert.deepEqual(groups.filter(group=>!group.hidden).map(group=>group.dataset.fileGroup),visibleGroups,view);
    assert.deepEqual(commands.map(button=>!button.hidden),visibleCommands,view);
    assert.equal(home.hidden,false,view);
  }
});
