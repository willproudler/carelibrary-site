import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../library-boot.mjs',import.meta.url),'utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
// Exercise the boot's session handling while replacing its application import.
const runBoot=new AsyncFunction('context',
 'const {session,loginURL,bindLogout,watchSession,prepareAccountStorage,preparePublicStorage,showSessionNavigation,location,document}=context;\n'
 +source.replace(/^import[^\n]+\n/,'').replace(/await import\('\.\/boot\.mjs[^']*'\);/,"await context.startBoot();")
);

function contextFor(current,dataset={}){
 const calls={boot:0,publicStorage:0,accounts:[],sessions:[]};
 return {
  calls,document:{documentElement:{dataset}},
  location:{pathname:'/library.html',search:'',hash:'#book=hume',replace:value=>{calls.redirect=value;}},
  session:async()=>current,loginURL:value=>'/login.html?next='+encodeURIComponent(value),
  bindLogout(){},showSessionNavigation(){},
  watchSession:(value,options)=>calls.sessions.push([value,options]),
  prepareAccountStorage:email=>calls.accounts.push(email),
  preparePublicStorage:()=>{calls.publicStorage++;},
  startBoot:async()=>{calls.boot++;},
 };
}

test('logged-in readers can enter clean sources when the server library is public',async()=>{
 const current={authenticated:true,beta_enabled:false,user:{email:'will@example.test'}};
 const context=contextFor(current,{carePublicMode:'true'});
 await runBoot(context);
 assert.equal(context.document.documentElement.dataset.careSourcePublic,'true');
 assert.equal(context.document.documentElement.dataset.careAccount,'will@example.test');
 assert.equal(context.document.documentElement.dataset.carePublicMode,undefined);
 assert.deepEqual(context.calls.accounts,['will@example.test']);
 assert.equal(context.calls.publicStorage,0);
 assert.equal(context.calls.boot,1);
 assert.deepEqual(context.calls.sessions,[[current,{library:true}]]);
});

test('gated owners keep account storage and do not expose the public source action',async()=>{
 const context=contextFor({authenticated:true,beta_enabled:true,user:{email:'owner@example.test'}},
                          {careSourcePublic:'true'});
 await runBoot(context);
 assert.equal(context.document.documentElement.dataset.careSourcePublic,'false');
 assert.equal(context.document.documentElement.dataset.carePublicMode,undefined);
 assert.deepEqual(context.calls.accounts,['owner@example.test']);
 assert.equal(context.calls.boot,1);
});

test('public guests retain existing anonymous storage while source visibility follows every session response',async()=>{
 const dataset={};
 const guest=contextFor({authenticated:false,beta_enabled:false},dataset);
 await runBoot(guest);
 assert.equal(dataset.carePublicMode,'true');
 assert.equal(dataset.careSourcePublic,'true');
 assert.equal(guest.calls.publicStorage,1);
 assert.deepEqual(guest.calls.accounts,[]);
 const gated=contextFor({authenticated:false,beta_enabled:true},dataset);
 await runBoot(gated);
 assert.equal(dataset.careSourcePublic,'false');
 assert.equal(gated.calls.boot,0);
 assert.match(gated.calls.redirect,/^\/login\.html\?next=/);
});

test('book information, shelf and pane links use public source access independently of guest drafts',()=>{
 const app=readFileSync(new URL('../public-app.mjs',import.meta.url),'utf8');
 assert.match(app,/cleanSourceHref\([^;]+?enabled:\s*document\.documentElement\.dataset\.careSourcePublic\s*===\s*'true'/);
 assert.match(app,/paneSourceEdition\([^;]+?document\.documentElement\.dataset\.careSourcePublic\s*===\s*'true'\)/);
 assert.match(app,/const published\s*=\s*document\.documentElement\.dataset\.careSourcePublic\s*===\s*'true';\s*const edition\s*=\s*published\s*&&\s*bookAddressing\.book\(/);
 assert.match(app,/const guestDrafts=[^\n]*dataset\.carePublicMode==='true'/);
});
