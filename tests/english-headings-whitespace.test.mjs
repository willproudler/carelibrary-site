import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceReadingText} from '../saved-translations.mjs';

test('heading cleanup preserves ordinary prose containing Unicode line and paragraph separators',()=>{
  const source={id:'raw',title:'THEOREMA XVI.',translations:[{id:'en',language_code:'en',paragraphs:[]}]};
  const work={id:'monad',title:'Monas Hieroglyphica',original_title:'Monas Hieroglyphica',sources:[source],units:[]};
  for(const value of ['', '\r', '\u2028', '\u2029', 'MONAS is quoted here.\u2028The quote stays unchanged.', 'ordinary\u2029quoted prose']){
    assert.equal(sourceReadingText(value,source,work),value);
  }
  assert.equal(sourceReadingText('  T H E O R Y. X V I.  ',source,work),'Theorem XVI.');
  assert.equal(sourceReadingText('80\nM O N A S',source,work),'80\nMONAD');
  assert.equal(sourceReadingText('MONAS',source,work,{readingLanguages:{monad:'original'}}),'MONAS');
});
