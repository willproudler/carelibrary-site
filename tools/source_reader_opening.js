// Runs before the first sheet is parsed, including in standalone downloaded books.
(() => {
  const main = document.currentScript.parentElement;
  // A permanent chapter link has its own crawlable HTML. Reading it online opens
  // the already-generated edition at the same chapter, with the book's true folios.
  if (main.dataset.chapterSource && ['https:', 'http:'].includes(location.protocol)) {
    const book = new URL(main.dataset.bookEdition, location.href);
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const cleanPath = path => path.replace(/\/$/, '');
    if (book.origin === location.origin && canonical &&
        cleanPath(new URL(canonical).pathname) === cleanPath(location.pathname) &&
        cleanPath(book.pathname) !== cleanPath(location.pathname)) {
      book.search = location.search;
      const chapter = 'source-' + main.dataset.chapterSource;
      const go = target => {
        book.hash = encodeURIComponent(target).replace(/^ref%3D/, 'ref=');
        location.replace(book.href);
      };
      let requested = '';
      try { requested = decodeURIComponent(location.hash.slice(1)); } catch {}
      if (requested.startsWith('ref=') && !('translatedChapter' in main.dataset)) {
        // The chapter's source HTML proves which exact passage IDs are aligned.
        document.addEventListener('DOMContentLoaded', () => {
          go(document.getElementById(requested)?.hasAttribute('data-passage-id') ? requested : chapter);
        }, {once:true});
      } else {
        if (requested === 'download') book.searchParams.set('chapter', main.dataset.chapterSource);
        go(requested === 'download' || requested === 'document-contents-title' ? requested : chapter);
      }
      return;
    }
  }
  // The download fragment opens the tools. A chapter can independently identify
  // the place where reading continues when those tools are closed.
  if (location.hash === '#download') {
    const chapter = new URLSearchParams(location.search).get('chapter');
    if (chapter) {
      const settle = () => {
        const section = document.getElementById('source-' + chapter);
        const finished = ['true', 'continuous'].includes(main.dataset.pagesReady);
        if (!section && !finished) return;
        if (section && main.contains(section)) section.scrollIntoView({behavior:'instant'});
        document.removeEventListener('care-source-pages-added', settle);
        document.removeEventListener('care-source-pages-changed', settle);
      };
      document.addEventListener('care-source-pages-added', settle);
      document.addEventListener('care-source-pages-changed', settle);
    }
  }
  const width = 210 * 96 / 25.4, height = 297 * 96 / 25.4;
  const phone = matchMedia('(hover:none) and (pointer:coarse) and (max-width:700px), (hover:none) and (pointer:coarse) and (max-height:500px)');
  const key = 'care-source-pages-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  let zoom = saved.zoom === 'fit' ? 'fit' : null;
  if (Number.isFinite(saved.zoom)) zoom = Math.max(.25, Math.min(2.5, saved.zoom));
  let theme = saved.theme === 'blue' ? 'blue' : 'green';
  const applyScale = () => {
    const fit = main.clientWidth / width;
    const scale = phone.matches || zoom === 'fit' ? fit : zoom ?? Math.min(.82, fit);
    main.style.setProperty('--page-scale', String(scale));
    main.style.setProperty('--slot-width', (width * scale) + 'px');
    main.style.setProperty('--slot-height', (height * scale) + 'px');
    document.body.dataset.pageZoom = String(scale);
    const indicator = document.getElementById('reader-zoom-value');
    if (indicator) indicator.textContent = Math.round(scale * 100) + '%';
  };
  function save() {
    try { localStorage.setItem(key, JSON.stringify({zoom, theme})); } catch {}
  }
  main.readerPaper = {
    width, height, phone, applyScale,
    setZoom(value) { zoom = value; applyScale(); save(); },
    setTheme(value) { theme = value; document.body.dataset.readerTheme = theme; save(); }
  };
  document.body.dataset.readerTheme = theme;
  applyScale();
  main.dataset.pagesReady = 'opening';
  // Failed or blocked module loading still leaves every ordinary HTML passage available.
  window.addEventListener('load', () => {
    if (main.dataset.pagesReady === 'opening') main.dataset.pagesReady = 'continuous';
  }, {once:true});
})();
