import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryDestination, postLoginDestination, loginURL} from '../auth.mjs';

test('login returns readers to their canonical book or demon page', () => {
  for (const path of ['/books/', '/books/a-treatise-of-human-nature-david-hume/', '/books/a-treatise-of-human-nature-david-hume/1-introduction/', '/books/hume/%E6%9B%B8/', '/numogram/', '/numogram/lurgo/']) {
    const target = path + '?reading=1#source=chapter-2';
    assert.equal(libraryDestination(target), target);
    assert.equal(postLoginDestination(target), target);
    assert.equal(loginURL(target), '/login.html?next=' + encodeURIComponent(target));
  }
});

test('search return URLs retain the same-origin boundary and clean paths', () => {
  for (const path of ['https://elsewhere.test/books/hume/', '//elsewhere.test/numogram/lurgo/', '/books/book/text.html', '/books/%2fexample/', '/api/studio/drafts/', '/books/book/chapter/other/', 'https://name:secret@care.invalid/books/hume/']) {
    assert.equal(postLoginDestination(path), '/library.html');
  }
});

test('compact author-title books and chapters retain exact safe login returns',()=>{
 for(const path of ['/platotimaeus','/platotimaeus/','/humetreatiseofhumannature','/platotimaeus/003-introduction/']){
  const target=path+'?reading=1#source=RAW_TIM%3A002';
  assert.equal(libraryDestination(target),target);
  assert.equal(loginURL(target),'/login.html?next='+encodeURIComponent(target));
 }
 for(const path of ['/api','/admin','/logout','/data','/platotimaeus/../../api','/platotimaeus/%2fother/','//evil.test/platotimaeus','/platotimaeus/chapter/third/']){
  assert.equal(postLoginDestination(path),'/library.html',path);
 }
});
