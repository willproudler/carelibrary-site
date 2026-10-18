import test from 'node:test';
import assert from 'node:assert/strict';
import {loadText} from '../resource-loader.mjs';
test('reading styles fail clearly and a later retry succeeds',async()=>{
 await assert.rejects(loadText('style',{fetcher:async()=>({ok:false})}),/could not load/);
 assert.equal(await loadText('style',{fetcher:async()=>({ok:true,text:async()=>'.reader{}'})}),'.reader{}');
});
test('a stalled style request times out instead of blocking the reader forever',async()=>{
 await assert.rejects(loadText('style',{timeout:5,fetcher:(_,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'}))))}),/took too long/);
});
