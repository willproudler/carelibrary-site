// Runs before the first sheet is parsed, including in standalone downloaded books.
(() => {
  const main = document.currentScript.parentElement;
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
