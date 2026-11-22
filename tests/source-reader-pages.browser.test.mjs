/* Run against a local Chrome review browser with CARE_READER_CDP_PORT set. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';

const port = process.env.CARE_READER_CDP_PORT;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function reviewTab(t) {
  const endpoint = `http://127.0.0.1:${port}`;
  const target = await (await fetch(endpoint + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  t.after(async () => { ws.close(); await fetch(endpoint + '/json/close/' + target.id); });
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let serial = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++serial, { resolve, reject });
    ws.send(JSON.stringify({ method, params, id: serial }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const wait = async expression => {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await delay(40);
    }
    throw new Error('Timed out waiting for ' + expression);
  };
  const resize = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  return { send, evaluate, wait, resize };
}

async function reviewFixture(extraCss = '') {
  const asset = name => readFile(new URL('../tools/' + name, import.meta.url), 'utf8');
  const [css, opening, pages, runtime] = await Promise.all(['source_reader.css', 'source_reader_opening.js', 'source_reader_pages.mjs', 'source_reader_runtime.mjs'].map(asset));
  const chapters = Array.from({ length: 32 }, (_, i) => i + 1);
  const toc = chapters.map(i => `<li><a href="#source-c${i}"><span class="toc-title">Chapter ${i}</span><span class="toc-page" data-page-ref="source-c${i}"></span></a></li>`).join('');
  const sections = chapters.map(i => {
    const body = i === 2 ? '<p>Start 🪶 <a href="#source-c3">' + 'ink🪶'.repeat(4800) + '</a> — last.</p><h3 class="source-subheading">More words</h3><p>' + 'line\n'.repeat(65) + 'end</p>' : `<p>Start ${i}. Text, reading in Greek, ἀρχή.</p>`;
    return `<section class="source-section" id="source-c${i}" data-source-id="c${i}"><h2 class="source-section-title"><a href="#source-c${i}">Chapter ${i}</a></h2><div class="source-text"><div class="source-passage" data-passage-id="a${i}" id="ref=a${i}"><a class="passage-marker" href="#ref=a${i}"></a><div class="passage-copy">${body}</div></div></div></section>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css}
${extraCss}</style><body class="source-reader">
    <script>Object.defineProperty(window, 'localStorage', {value:window.sessionStorage})</script>
    <main id="source-document" class="reader-document"><script>${opening}</script>
      <div class="reading-pages" data-reader-opening><div class="page-slot"><article class="reading-page" data-page-kind="title" data-page-number="1" id="reading-page-1"><div class="page-content">
      <header data-title-page class="document-title"><h1 class="book-title">Reading pages</h1></header></div></article></div></div><article class="reader-paper" data-reader-source-flow>
      <nav data-contents-page class="document-contents"><h2 id="contents-title"><a href="#reader-navigation" data-open-reader-contents>Contents</a></h2><ol>${toc}</ol></nav>
      <div id="source-text">${sections}</div></article></main>
    <input id="text-size" type="range" min="18" max="27" value="19"><input id="aq-toggle" type="checkbox">
    <button id="reader-zoom-out">−</button><button id="reader-zoom-fit">Fit</button><button id="reader-zoom-value"></button>
    <details id="reader-navigation" class="reader-navigation">
      <summary class="reader-fab" aria-label="Library">Library</summary>
      <aside class="contents-panel" aria-label="Library">
        <button data-close-navigation>Minimize</button>
        <div class="nav-tabs"><button data-nav-tab="contents">Contents</button><button data-nav-tab="pages">Pages</button><button data-nav-tab="tools">Tools</button></div>
        <div data-nav-panel="contents"><a href="#source-c2" data-source-target="source-c2">Chapter two</a></div>
        <div data-nav-panel="pages" hidden><div style="height:340px;width:182px;overflow:auto" class="page-thumbnails" data-pages-list></div></div>
        <div data-nav-panel="tools" hidden><a href="#source-c2">Open in Library</a></div>
      </aside>
    </details>
    <script>
      const originals = new Map([...document.querySelectorAll('.source-passage')].map(p => [p.dataset.passageId, p.textContent]));
      const boundaries = new Map([...document.querySelectorAll('.source-passage')].map(p => {
        let offset = 0;
        const cuts = new Set([0]);
        for (const block of p.querySelectorAll('.passage-copy > *')) cuts.add(offset += block.textContent.length);
        return [p.dataset.passageId, cuts];
      }));
      const opening = document.querySelector('[data-reader-opening] .page-slot');
      window.beforeModule = {
        ready: document.querySelector('main').dataset.pagesReady,
        width: opening.getBoundingClientRect().width,
        height: opening.getBoundingClientRect().height,
        flow: getComputedStyle(document.querySelector('[data-reader-source-flow]')).display,
        text: opening.querySelector('h1').textContent,
      };
      window.commits = 0;
      if (location.search === '?read-while-opening') {
        document.addEventListener('care-source-pages-added', () => {
          if (window.earlyReading) return;
          const passage = document.querySelector('main .reader-page-stack .source-passage p');
          if (!passage) return;
          passage.scrollIntoView({behavior:'instant', block:'center'});
          const range = document.createRange();
          range.selectNodeContents(passage);
          getSelection().removeAllRanges(); getSelection().addRange(range);
          window.earlyReading = {
            passage, text: range.toString(), y: passage.getBoundingClientRect().top,
            scroll: scrollY, count: document.querySelectorAll('main .page-slot').length,
            complete: document.body.dataset.paginated === 'true',
          };
        });
      }
      document.addEventListener('DOMContentLoaded', () => {
        const cover = document.querySelector('main .reading-page[data-page-kind="title"]');
        window.firstCover = cover && [cover.offsetWidth, cover.offsetHeight, Math.round(cover.querySelector('h1').getBoundingClientRect().height)];
      });
      document.addEventListener('care-source-pages-changed', () => window.commits++);
      window.pageCheck = () => {
        const stack = document.querySelector('.reader-page-stack');
        const pages = [...stack.querySelectorAll('.reading-page')];
        const pieces = [...stack.querySelectorAll('.source-passage')];
        const reconstructed = new Map();
        for (const p of pieces) reconstructed.set(p.dataset.passageId, (reconstructed.get(p.dataset.passageId) || '') + p.querySelector('.passage-copy').textContent);
        let correctContinuations = true;
        for (const piece of pieces) {
          let offset = Number(piece.dataset.readerOffset || 0);
          const bounds = boundaries.get(piece.dataset.passageId);
          for (const block of piece.querySelectorAll('.passage-copy > *')) {
            if (!block.textContent.length) continue;
            if (block.hasAttribute('data-continues-from') === bounds.has(offset)) correctContinuations = false;
            offset += block.textContent.length;
            if (block.hasAttribute('data-continues-to') === bounds.has(offset)) correctContinuations = false;
          }
        }
        const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
        return {
          conserved: reconstructed.size === originals.size && [...originals].every(([id, text]) => reconstructed.get(id) === text),
          correctContinuations, unique: new Set(ids).size === ids.length,
          fits: pages.every(p => { const c = p.querySelector('.page-content'); return c.scrollHeight <= c.clientHeight && c.textContent.trim(); }),
          links: pieces.flatMap(p => [...p.querySelectorAll('.passage-copy a')]).map(a => a.textContent).join('') === 'ink🪶'.repeat(4800),
          wholeGlyphs: pieces.every(p => p.textContent.isWellFormed()),
          markers: stack.querySelectorAll('.passage-marker').length,
          correctOrder: [...stack.querySelectorAll('.source-section-title')].every(h => h === h.parentElement.firstElementChild),
          correctToc: [...stack.querySelectorAll('[data-page-ref]')].every(ref => ref.textContent === document.getElementById(ref.dataset.pageRef).closest('.reading-page').dataset.pageNumber),
          count: pages.length, contents: pages.filter(p => p.dataset.pageKind === 'contents').length,
          thumbs: document.querySelectorAll('[data-reader-page-link]').length,
          bodies: pages.map(p => {
            const copy = p.querySelector('.page-content').cloneNode(true);
            copy.querySelectorAll('.aq-overlay').forEach(overlay => overlay.remove());
            return copy.textContent;
          }),
        };
      };
    </script><script type="module">${pages}\n${runtime.replace("import { initialisePagedReader } from './source_reader_pages.mjs';", '')}</script>`;
}

test('real browser conserves structured source, scales fixed sheets, restores anchors and commits the latest text size', { skip: !port, timeout: 120000 }, async t => {
  const tab = await reviewTab(t);
  await tab.send('Page.enable');
  const dir = await mkdtemp(join(tmpdir(), 'care-page-regression-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'reader.html');
  await writeFile(file, await reviewFixture());
  await tab.resize(1280, 900);
  await tab.send('Page.navigate', { url: pathToFileURL(file).href + '#ref=a30' });
  await tab.wait('window.commits === 1');
  const check = async () => {
    const data = await tab.evaluate('pageCheck()');
    for (const key of ['conserved', 'unique', 'fits', 'links', 'wholeGlyphs', 'correctOrder', 'correctToc', 'correctContinuations']) assert.ok(data[key], key);
    assert.equal(data.markers, 32);
    assert.equal(data.thumbs, data.count);
    assert.ok(data.contents > 1);
    return data;
  };
  const original = await check();
  assert.equal(await tab.evaluate("document.body.dataset.pageZoom"), '0.82');
  assert.ok(await tab.evaluate("Math.abs(document.getElementById('reading-page-1').getBoundingClientRect().width - 651) < 1"), 'native A4 at 82 percent');
  const first = await tab.evaluate('beforeModule');
  assert.equal(first.ready, 'opening');
  assert.equal(first.text, 'Reading pages');
  assert.equal(first.flow, 'none', 'the unfinished continuous table never appears behind the cover');
  assert.ok(Math.abs(first.width - 651) < 1 && Math.abs(first.height - 920) < 1, 'first paint already has native A4 geometry');
  assert.deepEqual(await tab.evaluate('firstCover'), await tab.evaluate(`(() => {
    const cover = document.getElementById('reading-page-1');
    return [cover.offsetWidth, cover.offsetHeight, Math.round(cover.querySelector('h1').getBoundingClientRect().height)];
  })()`), 'the real title page is readable before background measurement and keeps its layout');
  await tab.evaluate("document.getElementById('reader-zoom-fit').click()");
  assert.ok(await tab.evaluate("Math.abs(document.querySelector('main .page-slot').getBoundingClientRect().width - document.getElementById('source-document').clientWidth) < 1"), 'explicit fit fills the available desktop width');
  assert.ok(await tab.evaluate("Math.abs(document.getElementById('ref=a30').getBoundingClientRect().top) < 150"), 'direct passage hash');
  await tab.resize(380, 780);
  await tab.wait('Number(document.body.dataset.pageZoom) < .5');
  assert.ok(await tab.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'fit width stays within the phone viewport');
  assert.deepEqual((await check()).bodies, original.bodies);
  await tab.evaluate("document.getElementById('reader-zoom-out').click()");
  assert.deepEqual((await check()).bodies, original.bodies);
  await tab.evaluate("document.getElementById('reader-zoom-fit').click(); document.getElementById('ref=a25').scrollIntoView({behavior:'instant'})");
  await tab.evaluate(`(async () => {
    for (const [size, pause] of [[26, 112], [19, 4], [27, 0]]) {
      const control = document.getElementById('text-size');
      control.value = size; control.dispatchEvent(new Event('input'));
      await new Promise(ok => setTimeout(ok, pause));
    }
  })()`);
  await tab.wait("getComputedStyle(document.querySelector('main .reading-page')).fontSize === '27px'");
  await check();
  assert.ok(await tab.evaluate("Math.abs(document.getElementById('ref=a25').getBoundingClientRect().top) < 185"), 'reading position after repagination');
  await tab.evaluate(`const aq = document.getElementById('aq-toggle'); aq.checked = true; aq.dispatchEvent(new Event('input'));
    const block = document.getElementById('ref=a25').querySelector('p'); const range = document.createRange(); range.selectNodeContents(block);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);`);
  await tab.wait("document.getElementById('ref=a25').parentElement.querySelector('.aq-line')");
  assert.ok(await tab.evaluate(`(() => {
    const block = document.getElementById('ref=a25').querySelector('p');
    const range = document.createRange(); range.selectNodeContents(block);
    const labels = [...block.closest('.source-text').querySelectorAll('.aq-line')];
    const rows = [...range.getClientRects()].filter(rect => rect.height);
    return labels.length === rows.length && rows.every((rect, i) => Math.abs(rect.top - labels[i].getBoundingClientRect().top) < 1.5) && window.getSelection().toString() === block.textContent;
  })()`), 'actual rendered lines align with their AQ at phone zoom and keep the selection intact');
  await tab.evaluate("const aqControl = document.getElementById('aq-toggle'); aqControl.checked = false; aqControl.dispatchEvent(new Event('input'))");
  await tab.evaluate("document.getElementById('reader-navigation').open = true; document.querySelector('[data-nav-tab=pages]').click(); document.querySelector('[data-reader-page-link]:last-child').scrollIntoView({behavior:'instant'})");
  await tab.wait("document.querySelector('[data-reader-page-link]:last-child .thumbnail-sheet')");
  assert.equal(await tab.evaluate("document.querySelector('[data-reader-page-link]:last-child .page-content').textContent"), await tab.evaluate("document.querySelector('.page-slot:last-child .page-content').textContent"));
  await tab.evaluate("document.querySelector('[data-reader-page-link]:last-child').click()");
  await tab.wait("location.hash === '#reading-page-' + document.querySelectorAll('main .reading-page').length && !document.getElementById('reader-navigation').open");
  await tab.evaluate("localStorage.setItem('care-source-pages-v1', JSON.stringify({zoom:1.2, theme:'blue'}))");
  await tab.send('Page.reload');
  await tab.wait("document.body?.dataset.paginated === 'true' && document.body.dataset.readerTheme === 'blue'");
  assert.ok(await tab.evaluate("Math.abs(beforeModule.width - 210 * 96 / 25.4 * 1.2) < 1 && beforeModule.width === document.querySelector('main .page-slot').getBoundingClientRect().width"), 'explicit zoom is restored on the first rendered sheet');
  // If page styles fail to load, preserve the original title, source and links.
  const fallback = join(dir, 'continuous-reader.html');
  await writeFile(fallback, await reviewFixture('.reading-page .page-content { display: none !important }'));
  await tab.send('Page.navigate', { url: pathToFileURL(fallback).href });
  await tab.wait("document.getElementById('source-document')?.dataset.pagesReady === 'continuous'");
  assert.ok(await tab.evaluate("!!document.querySelector('[data-reader-source-flow] > .document-title h1') && document.querySelectorAll('main .source-passage').length === 32 && !document.querySelector('main .reading-page')"), 'measurement failure keeps the complete readable source');
});

test('the first body sheets are readable, selectable and stable while the remaining book is being measured', { skip: !port }, async t => {
  const tab = await reviewTab(t);
  const dir = await mkdtemp(join(tmpdir(), 'care-reader-opening-'));
  t.after(() => rm(dir, {recursive:true, force:true}));
  const file = join(dir, 'early.html');
  await writeFile(file, await reviewFixture());
  await tab.resize(1280, 900);
  await tab.send('Page.navigate', {url:pathToFileURL(file).href + '?read-while-opening'});
  await tab.wait("document.body?.dataset.paginated === 'true'");
  assert.ok(await tab.evaluate(`(() => {
    const early = window.earlyReading;
    return early && !early.complete && early.count < document.querySelectorAll('main .page-slot').length
      && early.scroll > 0 && early.passage.isConnected && getSelection().toString() === early.text
      && Math.abs(early.passage.getBoundingClientRect().top - early.y) < 2
      && pageCheck().correctToc && pageCheck().conserved;
  })()`));
});

test('a one-finger margin swipe opens Contents and the desktop Library pane stays open for browsing', {skip: !port, timeout: 120000}, async t => {
  const tab = await reviewTab(t);
  await tab.send('Page.enable');
  const dir = await mkdtemp(join(tmpdir(), 'care-reader-controls-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'edition.html');
  await writeFile(file, await reviewFixture());
  await tab.send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await tab.send('Emulation.setTouchEmulationEnabled', {enabled:true,maxTouchPoints:2});
  await tab.send('Page.navigate', {url:pathToFileURL(file).href});
  await tab.wait("document.body?.dataset.paginated === 'true'");
  const touch = (type, points) => tab.send('Input.dispatchTouchEvent', {type,touchPoints:points.map(([x,y],id) => ({x,y,id}))});
  async function drag(points) {
    await touch('touchStart', points[0]);
    for (const step of points.slice(1)) await touch('touchMove', step);
    await touch('touchEnd', []);
  }
  const open = "document.getElementById('reader-navigation').open";
  const centrePassage = () => tab.evaluate("document.getElementById('ref=a8').scrollIntoView({block:'center',behavior:'instant'})");
  const readingPosition = () => tab.evaluate(`(async () => {
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const passage = document.getElementById('ref=a8');
    const box = node => {
      const {x,y,width,height} = node.getBoundingClientRect();
      return [x,y,width,height];
    };
    return {sheet:box(passage.closest('.page-slot')), passage:box(passage), scroll:[scrollX,scrollY],
      pageScale:document.body.dataset.pageZoom, browserScale:visualViewport.scale};
  })()`);
  const browseTabs = async position => {
    for (const name of ['pages','tools','contents']) {
      await tab.evaluate("document.querySelector('[data-nav-tab=" + name + "]').click()");
      assert.deepEqual(await readingPosition(), position, name + ' tab preserves the reading page');
    }
  };

  await drag([[[25,510]],[[28,461]],[[33,382]]]);
  assert.equal(await tab.evaluate(open), false, 'vertical reading gesture');
  await drag([[[150,280]],[[200,283]],[[264,285]]]);
  assert.equal(await tab.evaluate(open), false, 'mid-page horizontal gesture');
  await drag([[[19,310],[115,310]],[[28,310],[200,310]],[[42,310],[290,310]]]);
  assert.equal(await tab.evaluate(open), false, 'two-finger edge gesture');
  await tab.send('Emulation.setPageScaleFactor', {pageScaleFactor:1});

  await centrePassage();
  const phonePosition = await readingPosition();
  await drag([[[25,450]],[[53,449]],[[91,451]],[[123,455]]]);
  await tab.wait(open);
  assert.deepEqual(await readingPosition(), phonePosition, 'opening the phone drawer preserves the sheet and text');
  assert.equal(await tab.evaluate("document.body.dataset.readerTab"), 'contents');
  assert.ok(await tab.evaluate("document.getElementById('source-document').inert"));
  await browseTabs(phonePosition);
  await tab.evaluate("document.querySelector('[data-close-navigation]').click()");
  assert.deepEqual(await readingPosition(), phonePosition, 'closing the drawer preserves the reading page');
  await drag([[[25,450]],[[53,449]],[[91,451]],[[123,455]]]);
  await tab.wait(open);
  await tab.evaluate("document.querySelector('[data-nav-tab=pages]').click(); document.querySelector('[data-reader-page-link]').click()");
  await tab.wait('!' + open);
  assert.notDeepEqual((await readingPosition()).scroll, phonePosition.scroll, 'choosing a page navigates');
  assert.equal(await tab.evaluate("document.getElementById('source-document').inert"), false);
  await tab.evaluate("document.querySelector('main [data-open-reader-contents]').click()");
  await tab.wait(open);
  await tab.send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape'});
  assert.equal(await tab.evaluate(open), false);
  assert.ok(await tab.evaluate("document.activeElement.matches('[data-open-reader-contents]')"));

  await tab.send('Emulation.setTouchEmulationEnabled', {enabled:false});
  await tab.resize(1280,900);
  for (const fit of [false,true]) {
    if (fit) await tab.evaluate("document.getElementById('reader-zoom-fit').click()");
    await centrePassage();
    const position = await readingPosition();
    await tab.evaluate("document.querySelector('#reader-navigation > summary').click()");
    assert.deepEqual(await readingPosition(), position, 'opening the desktop Library preserves the sheet, including at Fit');
    await browseTabs(position);
    await tab.evaluate("document.querySelector('[data-close-navigation]').click()");
    assert.deepEqual(await readingPosition(), position, 'minimizing the Library preserves the reading page');
  }
  await tab.evaluate("document.querySelector('#reader-navigation > summary').click(); document.querySelector('[data-nav-tab=pages]').click(); document.querySelector('[data-reader-page-link]').click()");
  assert.equal(await tab.evaluate(open), true);
  assert.equal(await tab.evaluate("document.getElementById('source-document').inert"), false);
  await tab.evaluate("document.querySelector('[data-close-navigation]').click()");
  assert.equal(await tab.evaluate(open), false);
});

test('direct, shared and download links stay in the Reader for every Library opening preference', { skip: !port }, async t => {
  const fixture = (await reviewFixture()).replace('<div data-nav-panel="tools" hidden>', `
    <div data-nav-panel="tools" hidden><div data-download-scope="book" tabindex="-1"><a download href="/fixture.epub">EPUB</a></div>`);
  const server = createServer((req,res) => {
    res.setHeader('Content-Type','text/html;charset=utf-8');
    res.end(fixture);
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => {server.close(resolve);server.closeAllConnections();}));
  const tab = await reviewTab(t);
  const base = 'http://127.0.0.1:' + server.address().port;
  const visit = async path => {
    await tab.send('Page.navigate',{url:base + path});
    await tab.wait("document.body?.dataset.paginated === 'true'");
    assert.equal(await tab.evaluate("location.pathname+location.search+location.hash"), path);
    assert.ok(await tab.evaluate("!document.querySelector('[data-book-opening]')"));
  };
  await visit('/first');
  for (const mode of ['ask','library','reader']) {
    await tab.evaluate("localStorage.setItem('care-beta-book-opening-v2',JSON.stringify({mode:'"+mode+"',last:null}))");
    await visit('/book-' + mode);
    await visit('/share-' + mode + '#ref=a8');
    assert.ok(await tab.evaluate("Math.abs(document.getElementById('ref=a8').getBoundingClientRect().top)<150"));
    await visit('/library-' + mode + '?from=library#source-c8');
    await visit('/files-' + mode + '#download');
    assert.ok(await tab.evaluate("document.getElementById('reader-navigation').open && document.body.dataset.readerTab==='tools' && document.activeElement.matches('a[download]')"));
    assert.equal(await tab.evaluate("JSON.parse(localStorage.getItem('care-beta-book-opening-v2')).mode"), mode);
  }
});

test('permanent chapter links open the complete edition at a stable chapter or exact passage', {skip: !port, timeout: 120000}, async t => {
  const whole = (await reviewFixture()).replace('<div data-nav-panel="tools" hidden>',
    '<div data-nav-panel="tools" hidden><div data-download-scope="book"><a download href="/edition.pdf">PDF</a></div>');
  const opening = await readFile(new URL('../tools/source_reader_opening.js', import.meta.url), 'utf8');
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('Content-Type', 'text/html;charset=utf-8');
    if (!path.includes('/chapter-eight/')) return res.end(whole);
    const translated = path.endsWith('/language/en/');
    res.end('<link rel="canonical" href="' + path + '"><main data-book-edition="' +
      (translated ? '/book/language/en/' : '/book') + '" data-chapter-source="c8"' +
      (translated ? ' data-translated-chapter' : '') + '><script>' + opening +
      '</script><div id="ref=a8" data-passage-id="a8"></div></main>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const tab = await reviewTab(t);
  const base = 'http://127.0.0.1:' + server.address().port;
  const visit = async (from, to, anchor) => {
    await tab.send('Page.navigate', {url: base + from});
    await tab.wait('location.href === ' + JSON.stringify(base + to) +
      " && document.getElementById('source-document')?.dataset.pagesReady === 'true'");
    assert.equal(await tab.evaluate("document.querySelectorAll('[data-contents-page] .toc-title').length"), 32);
    if (!anchor) return;
    await tab.wait('Math.abs(document.getElementById(' + JSON.stringify(anchor) + ').getBoundingClientRect().top) < 150');
    const scroll = await tab.evaluate('window.scrollY');
    await delay(200);
    assert.equal(await tab.evaluate('window.scrollY'), scroll);
  };
  await visit('/book/chapter-eight/?from=library', '/book?from=library#source-c8', 'source-c8');
  await visit('/book/chapter-eight/#ref=a8', '/book#ref=a8', 'ref=a8');
  await visit('/book/chapter-eight/#ref=unknown', '/book#source-c8', 'source-c8');
  await visit('/book/chapter-eight/language/en/#ref=a8', '/book/language/en/#source-c8', 'source-c8');
  await visit('/book/chapter-eight/language/en/#download', '/book/language/en/?chapter=c8#download', 'source-c8');
  assert.ok(await tab.evaluate("document.getElementById('reader-navigation').open && document.activeElement.matches('a[download]')"));
});
