import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('Library exposes the public About page while keeping version details accessible', async () => {
  const library = await read('library.html');
  const menu = library.slice(library.indexOf('id="workbench-library-menu"'), library.indexOf('class="workbench-history"'));
  assert.match(menu, /<a href="\/about\.html">About CARE Library<\/a>/);
  assert.match(menu, /<button[^>]*data-care-about[^>]*>Version &amp; build<\/button>/);
  const settings = library.slice(library.indexOf('id="workbench-settings"'), library.indexOf('</details>', library.indexOf('id="workbench-settings"')));
  assert.match(settings, /<a href="\/about\.html">About CARE Library<\/a>/);
  assert.match(library, /<script[^>]*src="\/care-about\.mjs/);
  const version = await read('care-about.mjs');
  assert.match(version, /querySelector\('\[data-care-about\]'\)\?\.addEventListener\('click', showAboutCare\)/);
});

test('Discover has an ordinary About link available without authentication or JavaScript', async () => {
  const discover = await read('index.html');
  const header = discover.slice(discover.indexOf('<header'), discover.indexOf('</header>'));
  const link = header.match(/<a\b[^>]*href="\/about\.html"[^>]*>About<\/a>/)?.[0];
  assert.ok(link);
  assert.doesNotMatch(link, /hidden|data-(?:guest|members|owner)-only/);
});
