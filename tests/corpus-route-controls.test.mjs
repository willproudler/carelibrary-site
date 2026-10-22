import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const checks=readFileSync(new URL('./fixtures/corpus_route_continuation_checks.js',import.meta.url),'utf8');
const desk=readFileSync(new URL('../native/study-desk.mjs',import.meta.url),'utf8').replace('export default function(component)','function mount(component)');
const field=readFileSync(new URL('../native/study-field.mjs',import.meta.url),'utf8');
const embedded=field.split('const CORPUS_BOOK_READER = (() => {')[1].split('\nreturn {')[0];
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
for(const [name,source] of [['shared desk',desk],['embedded corpus reader',embedded]])test(`${name}: corpus feeder controls continue exact routes without selecting prose`,()=>new AsyncFunction('assert',source+'\n'+checks)(assert));
