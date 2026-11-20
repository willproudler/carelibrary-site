import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../boot.mjs', import.meta.url), 'utf8');
const runBoot = new Function('document', 'window', 'localStorage', 'importModule',
  source.replace(/\bimport\(/g, 'importModule('));

function openWith(app, {loadStyle = path => path} = {}) {
  const events = [];
  const finished = Promise.withResolvers();
  const library = {data: {works: []}};
  const importModule = async url => {
    switch (url.split('?')[0]) {
      case './public-app.mjs': return app;
      case './library-loader.mjs': return {loadLibrary() { events.push('catalogue'); return library; }};
      case './resource-loader.mjs': return {loadText(url) {
        const path = url.split('?')[0];
        events.push(path);
        return loadStyle(path);
      }};
      default: throw Error('Unexpected dependency ' + url);
    }
  };
  runBoot({body: {dataset: {}}}, {CARELibraryBoot: {
    ready() { finished.resolve({state: 'ready'}); },
    fail(error) { finished.resolve({state: 'failed', error}); },
    retryStartup(error) { finished.resolve({state: 'retry', error}); },
  }}, {getItem() { return null; }}, importModule);
  return {events, library, finished: finished.promise};
}

test('the catalogue and both shelf styles start before the reader modules finish', async () => {
  const app = Promise.withResolvers();
  const route = Promise.withResolvers();
  const {events, library, finished} = openWith(app.promise);
  await new Promise(setImmediate);
  const styles = ['./native/study-desk.css', './native/public-scope.css'];
  assert.deepEqual(events, ['catalogue', ...styles]);
  app.resolve({start(...inputs) {
    assert.deepEqual(inputs, [library, ...styles]);
    return route.promise;
  }});
  let settled = false;
  finished.then(() => { settled = true; });
  await new Promise(setImmediate);
  assert.equal(settled, false);
  route.resolve();
  assert.deepEqual(await finished, {state: 'ready'});
});

test('a failure to load a module or style can retry while an application error stays visible', async () => {
  const networkError = new TypeError('Network request failed');
  assert.deepEqual(await openWith(Promise.reject(networkError)).finished, {state: 'retry', error: networkError});
  assert.deepEqual(await openWith({}, {loadStyle() { throw networkError; }}).finished, {state: 'retry', error: networkError});
  const error = new TypeError('Cannot read properties of undefined');
  assert.deepEqual(await openWith({start() { throw error; }}).finished, {state: 'failed', error});
});
