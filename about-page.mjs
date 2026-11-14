// The FAQ and saved text excerpts work without JavaScript. Live examples use
// the shipped CARE reader; no full shelf is loaded and no AI run is started.
const label = document.querySelector('[data-release-label]');
if (label) {
  fetch('/care-version.json', {credentials:'same-origin', cache:'no-store'})
    .then(response => { if (!response.ok) throw Error('Version unavailable'); return response.json(); })
    .then(value => {
      if (typeof value.version === 'string' && typeof value.build === 'string') {
        label.textContent = `Web beta · ${value.version} · ${value.build}`;
      }
    }).catch(() => { /* Keep the ordinary Web beta label if unavailable. */ });
}

// Import CARE's renderer only when a live example approaches the viewport.
// The small, frozen payload is already in this page; the full shelf is not loaded.
const wrappers = [...document.querySelectorAll('[data-about-live-panel]')];
let previews;
function activatePreviews() {
  if (!previews) previews = import('./about-live-panels.mjs').then(module => module.mountAboutPanels({
    document,
    libraryOrigin: location.protocol === 'file:' ? 'https://carelibrary.org/' : undefined,
    cssText: document.getElementById('about-preview-native-css')?.textContent,
    scopeCSSText: document.getElementById('about-preview-scope-css')?.textContent,
    viewerCSSText: document.getElementById('about-preview-viewer-css')?.textContent,
    viewerHTML: document.getElementById('about-preview-viewer-html')?.textContent,
  })).catch(() => {
    for (const wrapper of wrappers) {
      const status = wrapper.querySelector('[data-about-panel-status]');
      if (status) status.textContent = 'Open this saved excerpt in the Library.';
    }
  });
  return previews;
}
if (wrappers.length) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); activatePreviews(); }
    }, {rootMargin:'320px 0px'});
    for (const wrapper of wrappers) observer.observe(wrapper);
  } else activatePreviews();
}
