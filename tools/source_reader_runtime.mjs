/* Progressive reading controls. Source text nodes are never rewritten. */
import { initialisePagedReader } from './source_reader_pages.mjs';

const PREFERENCE_KEY = 'care-source-reader-preferences-v1';
const META_SELECTOR = 'script,style,noscript,template,.aq-overlay,.passage-marker';

export function calculateAq(value) {
  let total = 0;
  let found = false;
  for (const character of String(value ?? '').normalize('NFKD').toUpperCase()) {
    const code = character.codePointAt(0);
    if (code >= 48 && code <= 57) {
      total += code - 48;
      found = true;
    } else if (code >= 65 && code <= 90) {
      total += code - 55;
      found = true;
    }
  }
  return found ? total : null;
}

export function libraryReturnContext(search) {
  return new URLSearchParams(search || '').get('from') === 'library';
}

export function resolveLanguageTarget(value, baseHref, fromLibrary = false) {
  try {
    const base = new URL(baseHref);
    const target = new URL(value, base);
    const localPreview = base.protocol === 'file:' && target.protocol === 'file:'
      && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\\)/i.test(String(value))
      && target.hostname === base.hostname;
    const sameOrigin = ['https:', 'http:'].includes(base.protocol)
      && target.origin === base.origin && target.protocol === base.protocol;
    if (!sameOrigin && !localPreview) return null;
    if (fromLibrary) target.searchParams.set('from', 'library');
    return target.href;
  } catch {
    return null;
  }
}

function codePointBoundary(text, offset, forward = false) {
  const value = Math.max(0, Math.min(text.length, offset));
  const code = text.charCodeAt(value);
  const previous = text.charCodeAt(value - 1);
  return code >= 0xDC00 && code <= 0xDFFF && previous >= 0xD800 && previous <= 0xDBFF
    ? value + (forward ? 1 : -1) : value;
}

function lineGroups(rectangles) {
  const lines = [];
  for (const rect of rectangles.filter(rect => rect.height > 0 && Number.isFinite(rect.top)).sort((a, b) => a.top - b.top)) {
    const previous = lines.at(-1);
    if (previous && Math.abs(previous.top - rect.top) <= Math.max(1, Math.min(previous.height, rect.height) * 0.4)) {
      previous.left = Math.min(previous.left, rect.left);
      previous.right = Math.max(previous.right, rect.right);
      previous.bottom = Math.max(previous.bottom, rect.bottom);
      previous.height = previous.bottom - previous.top;
    } else {
      lines.push({ top: rect.top, bottom: rect.bottom, height: rect.height, left: rect.left, right: rect.right });
    }
  }
  return lines;
}

/** Measure only a nearby vertical slice, including long tokens that wrap mid-word. */
export function measureTextNode(node, viewport, fallbackRect = null) {
  const text = node.nodeValue || '';
  if (!text) return [];
  const range = node.ownerDocument.createRange();
  const samples = new Map();
  const rectAt = offset => {
    const start = codePointBoundary(text, Math.min(offset, text.length - 1));
    if (samples.has(start)) return samples.get(start);
    range.setStart(node, start);
    range.setEnd(node, codePointBoundary(text, start + 1, true));
    const rect = [...range.getClientRects()].find(item => item.height > 0 && Number.isFinite(item.top)) || null;
    samples.set(start, rect);
    return rect;
  };
  const sampleAt = offset => {
    const direct = rectAt(offset);
    if (direct) return direct;
    // Collapsed white space can lack a rectangle. Nearby glyphs determine its row.
    for (const distance of [1, 2, 4, 8, 16, 32]) {
      for (const index of [offset - distance, offset + distance]) {
        if (index >= 0 && index < text.length) {
          const rect = rectAt(index);
          if (rect) return rect;
        }
      }
    }
    return fallbackRect;
  };
  const firstMatching = (low, high, predicate) => {
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const rect = sampleAt(middle);
      if (!rect || predicate(rect)) high = middle;
      else low = middle + 1;
    }
    return low;
  };
  const start = codePointBoundary(text, firstMatching(0, text.length, rect => rect.bottom >= viewport.top));
  const end = codePointBoundary(text, firstMatching(start, text.length, rect => rect.top > viewport.bottom), true);
  if (end <= start) return [];
  range.setStart(node, start);
  range.setEnd(node, end);
  const lines = lineGroups([...range.getClientRects()].filter(rect => rect.bottom >= viewport.top && rect.top <= viewport.bottom));
  const result = [];
  let cursor = start;
  for (let index = 0; index < lines.length; index += 1) {
    const next = lines[index + 1];
    const boundary = next
      ? codePointBoundary(text, firstMatching(cursor, end, rect => rect.top >= next.top - Math.max(1, next.height * 0.25)))
      : end;
    if (boundary > cursor) result.push({ ...lines[index], text: text.slice(cursor, boundary) });
    cursor = boundary;
  }
  return result;
}

/** Select nearby block passages without walking a long chapter's offscreen DOM. */
export function visibleTextRoots(host, viewport, overlay = null) {
  const children = host.children;
  let count = children.length;
  if (count && children.item(count - 1) === overlay) count -= 1;
  if (!count || !children.item(0).matches('.source-passage')
      || !children.item(count - 1).matches('.source-passage')) return [host];
  const bounds = new Map();
  const rectAt = index => {
    if (!bounds.has(index)) bounds.set(index, children.item(index).getBoundingClientRect());
    return bounds.get(index);
  };
  const firstMatching = predicate => {
    let low = 0, high = count;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (predicate(rectAt(middle))) high = middle;
      else low = middle + 1;
    }
    return low;
  };
  const start = firstMatching(rect => rect.bottom >= viewport.top);
  const end = firstMatching(rect => rect.top > viewport.bottom);
  const roots = [];
  for (let index = start; index < end; index += 1) roots.push(children.item(index));
  return roots;
}

export function readerSourceElements(document) {
  const root = document.getElementById('source-document') || document;
  return {
    hosts: [...root.querySelectorAll('.source-text')],
    sections: [...root.querySelectorAll('.source-section[data-source-id]')],
  };
}

export function logicalAqLineBox(row, hostRect, logicalWidth, scrollTop = 0, borderTop = 0) {
  const measuredScale = logicalWidth > 0 ? hostRect.width / logicalWidth : 1;
  const scale = Number.isFinite(measuredScale) && measuredScale > 0 ? measuredScale : 1;
  return { top: (row.top - hostRect.top) / scale + scrollTop - borderTop, height: row.height / scale };
}

// A one-finger gesture starts at the left margin. Let the browser handle
// ordinary page scrolling, pinching and panning a magnified page.
function installContentsSwipe(document, window, compact, navigation, openContents) {
  let start = null;
  function reset() {
    start = null;
    document.removeEventListener('touchmove', move);
  }
  function move(event) {
    if (!start || event.touches.length !== 1) { reset(); return; }
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = Math.abs(touch.clientY - start.y);
    if (touch.identifier !== start.id || dx < -8 || (dy > 12 && dy >= dx)) {
      reset();
      return;
    }
    if (dx > 16 && dx > 1.5 * dy && event.cancelable) event.preventDefault();
  }
  document.addEventListener('touchstart', event => {
    reset();
    if (!compact.matches || navigation.open || event.touches.length !== 1
        || window.scrollX > 1 || (window.visualViewport?.scale || 1) > 1.01) return;
    const touch = event.touches[0];
    if (touch.clientX > 48 || document.getSelection()?.isCollapsed === false) return;
    if (window !== window.top) {
      try {
        // A reader in the Library pane shares its host's pinch magnification.
        if (window.top.visualViewport?.scale > 1.01) return;
      } catch {
        // An external embedder owns its viewport and edge gestures.
        return;
      }
    }
    start = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
    document.addEventListener('touchmove', move, { passive: false });
  }, { passive: true });
  document.addEventListener('touchend', event => {
    if (!start) return;
    const touch = Array.from(event.changedTouches).find(item => item.identifier === start.id);
    const dx = touch ? touch.clientX - start.x : 0;
    const dy = touch ? Math.abs(touch.clientY - start.y) : Infinity;
    reset();
    if (!event.touches.length && dx >= 52 && dx > 1.5 * dy) openContents();
  }, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });
}

function installLibraryPane(document, window, navigation, selectPanel) {
  const compact = window.matchMedia('(max-width:700px), (pointer:coarse) and (max-height:500px)');
  const pane = navigation.querySelector('.contents-panel');
  const button = navigation.querySelector('summary');
  const main = document.getElementById('source-document');
  let opener = button;
  let closeTimer;
  function linger() {
    window.clearTimeout(closeTimer);
    document.body.dataset.libraryNear = 'true';
    closeTimer = window.setTimeout(() => { delete document.body.dataset.libraryNear; }, 3200);
  }

  function syncPane() {
    const modal = navigation.open && compact.matches;
    document.body.dataset.navOpen = String(navigation.open);
    button?.setAttribute('aria-expanded', String(navigation.open));
    if (main) main.inert = modal;
    if (modal) {
      pane?.setAttribute('role', 'dialog');
      pane?.setAttribute('aria-modal', 'true');
    } else {
      pane?.removeAttribute('role');
      pane?.removeAttribute('aria-modal');
    }
  }
  function closePane(restoreFocus) {
    if (!navigation.open) return;
    navigation.open = false;
    syncPane();
    if (restoreFocus) (opener?.isConnected ? opener : button)?.focus({ preventScroll: true });
    if (!compact.matches) linger();
  }
  function openContents(control = button) {
    opener = control;
    selectPanel('contents');
    navigation.open = true;
    syncPane();
    navigation.querySelector('[data-nav-tab="contents"]')?.focus({ preventScroll: true });
  }

  button?.addEventListener('click', () => { opener = button; });
  navigation.addEventListener('toggle', () => {
    syncPane();
    if (navigation.open && compact.matches && !pane?.contains(document.activeElement)) {
      navigation.querySelector('[data-nav-tab][aria-selected="true"]')?.focus({ preventScroll: true });
    }
  });
  compact.addEventListener('change', syncPane);
  syncPane();
  installContentsSwipe(document, window, compact, navigation, openContents);
  function openDownloadTools() {
    if (window.location.hash !== '#download') return;
    opener = button;
    selectPanel('tools');
    navigation.open = true;
    syncPane();
    const section = navigation.querySelector('[data-download-scope]');
    const target = section?.querySelector('a[download]') || section;
    if (target) {
      target.focus({preventScroll:true});
      // Scroll the tools pane to the file links without moving the reading page.
      for (let parent = target.parentElement; parent && pane?.contains(parent); parent = parent.parentElement) {
        if (parent.clientHeight && parent.scrollHeight > parent.clientHeight
            && ['auto','scroll'].includes(window.getComputedStyle(parent).overflowY)) {
          parent.scrollTop += target.getBoundingClientRect().top - parent.getBoundingClientRect().top - 12;
        }
      }
    }
  }
  window.addEventListener('hashchange', openDownloadTools);
  openDownloadTools();

  document.addEventListener('click', event => {
    const target = event.target.closest?.('a,button,summary');
    if (target?.matches('[data-open-reader-contents]') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      openContents(target);
      return;
    }
    if (!navigation.open) return;
    if (target?.closest('[data-close-navigation]')) closePane(true);
    else if (compact.matches && navigation.contains(target) && target?.matches('[data-source-target],[data-reader-page-link]')) {
      closePane(false);
    } else if (compact.matches && !pane?.contains(event.target) && !button?.contains(event.target)) {
      closePane(true);
    }
  });
  document.addEventListener('keydown', event => {
    if (!navigation.open || event.defaultPrevented) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePane(true);
    } else if (event.key === 'Tab' && compact.matches && pane) {
      const candidates = pane.querySelectorAll('button,a[href],input,select,summary,[tabindex]');
      const eligible = element => element.tabIndex >= 0 && !element.disabled
        && !element.closest('[hidden],[inert]') && element.getClientRects().length > 0;
      // Seek from each end so a page list only measures its first and last controls.
      let first, last;
      for (let i = 0; i < candidates.length && !first; i += 1) {
        if (eligible(candidates[i])) first = candidates[i];
      }
      for (let i = candidates.length - 1; i >= 0 && !last; i -= 1) {
        if (eligible(candidates[i])) last = candidates[i];
      }
      if (first && last && (document.activeElement === (event.shiftKey ? first : last)
          || !pane.contains(document.activeElement))) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  });

  if (!button) return;
  let frame = 0, pointerX = 0, pointerY = 0, near = false;
  function proximity() {
    frame = 0;
    const r = button.getBoundingClientRect();
    const inside = pointerX >= r.left - 72 && pointerX <= r.right + 72
      && pointerY >= r.top - 72 && pointerY <= r.bottom + 72;
    if (inside && !near) {
      window.clearTimeout(closeTimer);
      document.body.dataset.libraryNear = 'true';
    } else if (!inside && near) linger();
    near = inside;
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frame) frame = window.requestAnimationFrame(proximity);
  }, { passive: true });
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget && near) {
      near = false;
      linger();
    }
  }, { passive: true });
}

export function initialiseSourceReader(document, window) {
  if (!document?.body || document.body.dataset.sourceReaderReady === 'true') return;
  document.body.dataset.sourceReaderReady = 'true';
  const body = document.body;
  const navigation = document.getElementById('reader-navigation');
  const font = document.getElementById('text-size');
  const fontOutput = document.getElementById('text-size-value');
  const passages = document.getElementById('passage-toggle');
  const aq = document.getElementById('aq-toggle');
  const fromLibrary = libraryReturnContext(window.location.search);
  if (fromLibrary) {
    // Carry the entry context through source navigation, including local review files.
    const readerLinks = document.querySelectorAll('.source-section-title a,.document-contents-list a,.section-nav a,.contents-link,.page-thumbnail');
    for (const link of readerLinks) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) continue;
      const destination = resolveLanguageTarget(href, window.location.href, true);
      if (destination) link.href = destination;
    }
  }
  const readPreferences = () => {
    try {
      const value = JSON.parse(window.localStorage.getItem(PREFERENCE_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  };
  const preferences = readPreferences();
  const savePreferences = () => {
    try {
      window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify({
        textSize: Number(font?.value || 19), passages: Boolean(passages?.checked), aq: Boolean(aq?.checked),
      }));
    } catch { /* Reading remains available when storage is disabled. */ }
  };
  if (font && Number.isFinite(preferences.textSize)) font.value = String(Math.max(18, Math.min(27, preferences.textSize)));
  if (passages && typeof preferences.passages === 'boolean') passages.checked = preferences.passages;
  if (aq && typeof preferences.aq === 'boolean') aq.checked = preferences.aq;

  // The native Reader's standard 1.19rem is 19.04 logical pixels.
  const textSize = () => {
    const step = Math.max(18, Math.min(27, Number(font?.value) || 19));
    return step === 19 ? 19.04 : step;
  };
  let currentTextSize = textSize();
  body.style.setProperty('--reader-text-size', `${currentTextSize}px`);
  initialisePagedReader(document, window);
  const sourceDocument = document.getElementById('source-document');
  if (sourceDocument && !sourceDocument.careSourcePosition) {
    sourceDocument.careSourcePosition = () => {
      const line = Math.min(100, window.innerHeight * .18);
      for (const passage of sourceDocument.querySelectorAll('.source-passage,.source-section-title')) {
        const rect = passage.getBoundingClientRect();
        if (rect.height && rect.bottom > line && rect.top < window.innerHeight) {
          return {sourceId:passage.closest('[data-source-id]')?.dataset.sourceId,
            passageId:passage.dataset.passageId || '', paneRow:passage.dataset.paneRow};
        }
      }
      return null;
    };
  }
  for (const back of document.querySelectorAll('.open-care-action,[data-reader-back]')) {
    // The installed offline reader's blob URL has no relative base. Its host
    // wires both links directly to the originating native pane.
    let original;
    try { original = new URL(back.href, document.baseURI); } catch { continue; }
    const update = () => {
      if (back.hasAttribute('data-clean-source-back')) return;
      const address = new URL(original);
      const params = new URLSearchParams(address.hash.slice(1));
      if (!params.has('book')) return;
      const position = sourceDocument?.careSourcePosition?.();
      if (position?.sourceId) {
        params.set('source', position.sourceId);
        if (position.passageId) params.set('focus', position.passageId);
        else params.delete('focus');
        address.hash = params.toString();
      }
      back.href = address.href;
    };
    for (const event of ['focus','pointerdown','contextmenu','click','auxclick']) back.addEventListener(event, update);
  }
  let { hosts, sections } = readerSourceElements(document);
  const activeHosts = new Set();
  const measured = new WeakMap();
  const overlays = new WeakMap();
  let frame = 0;
  let geometryRevision = 0;
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };
  const applyPreferences = () => {
    const size = textSize();
    const fontChanged = size !== currentTextSize;
    currentTextSize = size;
    body.style.setProperty('--reader-text-size', `${size}px`);
    if (fontOutput) fontOutput.textContent = `${Math.round(size)} px`;
    body.dataset.passages = String(Boolean(passages?.checked));
    body.dataset.aq = String(Boolean(aq?.checked));
    geometryRevision += 1;
    schedule();
    if (fontChanged) document.dispatchEvent(new window.CustomEvent('care-source-reader-font-change', { detail: { textSize: size } }));
  };
  for (const control of [font, passages, aq]) control?.addEventListener('input', () => {
    applyPreferences();
    savePreferences();
  });
  applyPreferences();

  const contentsSearch = document.getElementById('contents-search');
  let searchableHeadings = [];
  const filterContents = () => {
    const query = (contentsSearch?.value || '').normalize('NFC').toLowerCase().trim();
    let matches = 0;
    for (const { element, title } of searchableHeadings) {
      element.hidden = !title.includes(query);
      if (!element.hidden && !element.closest('[data-nav-panel]')?.hidden) matches += 1;
    }
    document.querySelectorAll('[data-contents-empty]').forEach(element => {
      element.hidden = !query || matches > 0 || body.dataset.readerTab === 'tools';
    });
  };
  const refreshSearchableHeadings = () => {
    searchableHeadings = [...document.querySelectorAll('.contents-row[data-source-title],.page-thumbnail[data-source-title]')]
      .map(element => ({ element, title: element.dataset.sourceTitle.normalize('NFC').toLowerCase() }));
    filterContents();
  };
  contentsSearch?.addEventListener('input', refreshSearchableHeadings);
  navigation?.addEventListener('toggle', () => { if (navigation.open) refreshSearchableHeadings(); });
  refreshSearchableHeadings();
  const tabs = [...document.querySelectorAll('[data-nav-tab]')];
  const selectTab = selected => {
    body.dataset.readerTab = selected.dataset.navTab;
    const settings = selected.dataset.navTab === 'tools';
    const searchLabel = contentsSearch?.closest('label');
    if (searchLabel) {
      searchLabel.hidden = settings;
      const prompt = selected.dataset.navTab === 'pages' ? 'Find a page' : 'Find a section';
      contentsSearch.placeholder = prompt;
      const name = searchLabel.querySelector('.sr-only');
      if (name) name.textContent = prompt;
    }
    for (const tab of tabs) {
      const current = tab === selected;
      tab.setAttribute('role', 'tab');
      if (!tab.id) tab.id = `reader-tab-${tab.dataset.navTab}`;
      tab.setAttribute('aria-controls', `reader-panel-${tab.dataset.navTab}`);
      tab.setAttribute('aria-selected', String(current));
      tab.tabIndex = current ? 0 : -1;
    }
    for (const panel of document.querySelectorAll('[data-nav-panel]')) {
      panel.hidden = panel.dataset.navPanel !== selected.dataset.navTab;
      panel.setAttribute('role', 'tabpanel');
      panel.id = `reader-panel-${panel.dataset.navPanel}`;
      panel.setAttribute('aria-labelledby', `reader-tab-${panel.dataset.navPanel}`);
    }
    filterContents();
  };
  tabs[0]?.parentElement?.setAttribute('role', 'tablist');
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % tabs.length
          : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index + tabs.length - 1) % tabs.length : null;
      if (next === null) return;
      event.preventDefault();
      selectTab(tabs[next]);
      tabs[next].focus();
    });
  }
  if (tabs.length) selectTab(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
  if (navigation) installLibraryPane(document, window, navigation, name => {
    const selected = tabs.find(tab => tab.dataset.navTab === name);
    if (selected) selectTab(selected);
  });
  document.getElementById('reader-language')?.addEventListener('change', event => {
    const destination = resolveLanguageTarget(event.target.value, window.location.href, fromLibrary);
    if (destination) window.location.href = destination;
  });

  const sectionVisibility = new Map();
  let links = [];
  const refreshSourceLinks = () => {
    links = [...document.querySelectorAll(body.dataset.paginated === 'true'
      ? '.contents-link[data-source-target]' : '.contents-link[data-source-target],.page-thumbnail[data-source-target]')];
  };
  refreshSourceLinks();
  let activeSource = null;
  const selectSource = sourceId => {
    if (!sourceId || activeSource === sourceId) return;
    activeSource = sourceId;
    for (const link of links) {
      const current = link.dataset.sourceTarget === sourceId || link.dataset.sourceTarget === `source-${sourceId}`;
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  let sectionObserver = null;
  const observeSections = () => {
    if (!window.IntersectionObserver) return;
    sectionObserver?.disconnect();
    sectionVisibility.clear();
    const observer = new window.IntersectionObserver(entries => {
      if (sectionObserver !== observer) return;
      for (const entry of entries) {
        if (entry.isIntersecting) sectionVisibility.set(entry.target, entry.boundingClientRect.top);
        else sectionVisibility.delete(entry.target);
      }
      // Only currently visible sections are measured, never all book sections on scroll.
      const visible = [...sectionVisibility.keys()].map(section => ({ section, top: section.getBoundingClientRect().top }));
      visible.sort((a, b) => Math.abs(a.top - window.innerHeight * 0.2) - Math.abs(b.top - window.innerHeight * 0.2));
      if (visible[0]) selectSource(visible[0].section.dataset.sourceId);
    }, { rootMargin: `-${window.innerHeight * 0.1}px 0px -${window.innerHeight * 0.55}px 0px`, threshold: 0 });
    sectionObserver = observer;
    sections.forEach(section => observer.observe(section));
  };
  observeSections();
  selectSource(sections[0]?.dataset.sourceId);

  const resizeObserver = window.ResizeObserver ? new window.ResizeObserver(entries => {
    for (const entry of entries) measured.delete(entry.target);
    schedule();
  }) : null;
  let hostObserver = null;
  const observeHosts = () => {
    hostObserver?.disconnect();
    hostObserver = null;
    for (const host of activeHosts) resizeObserver?.unobserve(host);
    activeHosts.clear();
    if (!aq?.checked) return;
    if (!window.IntersectionObserver) {
      hosts.forEach(host => activeHosts.add(host));
      return;
    }
    const observer = new window.IntersectionObserver(entries => {
      if (hostObserver !== observer) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeHosts.add(entry.target);
          resizeObserver?.observe(entry.target);
        } else {
          activeHosts.delete(entry.target);
          resizeObserver?.unobserve(entry.target);
          overlays.get(entry.target)?.replaceChildren();
          measured.delete(entry.target);
        }
      }
      schedule();
    }, { rootMargin: `${window.innerHeight}px 0px`, threshold: 0 });
    hostObserver = observer;
    hosts.forEach(host => observer.observe(host));
  };
  observeHosts();
  aq?.addEventListener('input', observeHosts);

  document.addEventListener('care-source-scale-changed', () => {
    geometryRevision += 1;
    schedule();
  });
  const observeNewPages = event => {
    const batch = event.detail;
    if (batch && !batch.replacing) {
      for (const slot of batch.added) {
        for (const section of slot.querySelectorAll('.source-section[data-source-id]')) {
          sections.push(section);
          sectionObserver?.observe(section);
        }
        for (const host of slot.querySelectorAll('.source-text')) {
          hosts.push(host);
          if (hostObserver) hostObserver.observe(host);
          else if (aq?.checked) activeHosts.add(host);
        }
      }
      if (navigation?.open || contentsSearch?.value) refreshSearchableHeadings();
      return;
    }
    geometryRevision += 1;
    ({ hosts, sections } = readerSourceElements(document));
    refreshSearchableHeadings();
    refreshSourceLinks();
    const previousSource = activeSource;
    activeSource = null;
    observeSections();
    observeHosts();
    selectSource(previousSource || sections[0]?.dataset.sourceId);
    schedule();
  };
  document.addEventListener('care-source-pages-added', observeNewPages);
  document.addEventListener('care-source-pages-changed', observeNewPages);

  function measureHost(host, viewport) {
    const hostRect = host.getBoundingClientRect();
    if (hostRect.bottom < viewport.top || hostRect.top > viewport.bottom) return;
    const prior = measured.get(host);
    const documentTop = window.scrollY + viewport.top;
    const documentBottom = window.scrollY + viewport.bottom;
    const buffer = window.innerHeight * 0.5;
    if (prior && prior.revision === geometryRevision && prior.width === hostRect.width
        && prior.top <= documentTop + buffer && prior.bottom >= documentBottom - buffer) return;
    let overlay = overlays.get(host);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'aq-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      host.append(overlay);
      overlays.set(host, overlay);
    }
    const parentBounds = new Map();
    const parentVisibility = new Map();
    const filter = {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(META_SELECTOR)) return 2;
        let visible = parentVisibility.get(parent);
        if (visible === undefined) {
          const style = window.getComputedStyle(parent);
          visible = style.display !== 'none' && style.visibility !== 'hidden' && !parent.closest('[hidden]');
          parentVisibility.set(parent, visible);
        }
        if (!visible) return 2;
        let rect = parentBounds.get(parent);
        if (!rect) { rect = parent.getBoundingClientRect(); parentBounds.set(parent, rect); }
        return rect.bottom >= viewport.top && rect.top <= viewport.bottom ? 1 : 2;
      },
    };
    const fragments = [];
    for (const root of visibleTextRoots(host, viewport, overlay)) {
      const walker = document.createTreeWalker(root, 4, filter);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        fragments.push(...measureTextNode(node, viewport, parentBounds.get(node.parentElement)));
      }
    }
    const rows = [];
    for (const fragment of fragments.sort((a, b) => a.top - b.top)) {
      let row = rows.at(-1);
      if (!row || Math.abs(row.top - fragment.top) > Math.max(1, Math.min(row.height, fragment.height) * 0.4)) {
        row = { top: fragment.top, height: fragment.height, value: null };
        rows.push(row);
      }
      const value = calculateAq(fragment.text);
      if (value !== null) row.value = (row.value ?? 0) + value;
    }
    const labels = document.createDocumentFragment();
    const border = Number.parseFloat(window.getComputedStyle(host).borderTopWidth) || 0;
    for (const row of rows) {
      const box = logicalAqLineBox(row, hostRect, host.offsetWidth, host.scrollTop, border);
      const label = document.createElement('span');
      label.className = 'aq-line';
      label.textContent = row.value === null ? '—' : `AQ ${row.value}`;
      label.style.top = `${box.top}px`;
      label.style.height = `${box.height}px`;
      label.style.lineHeight = `${box.height}px`;
      labels.append(label);
    }
    overlay.replaceChildren(labels);
    measured.set(host, { top: documentTop, bottom: documentBottom, width: hostRect.width, revision: geometryRevision });
  }

  function update() {
    frame = 0;
    if (body.dataset.paginated !== 'true' && document.getElementById('source-document')?.dataset.pagesReady !== 'reading') {
      const scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const progress = scrollable ? Math.max(0, Math.min(100, window.scrollY / scrollable * 100)) : 100;
      document.querySelectorAll('.progress-fill').forEach(element => { element.style.width = `${progress}%`; });
      document.querySelectorAll('[data-reading-progress]').forEach(element => { element.textContent = `${Math.round(progress)}%`; });
    }
    if (!aq?.checked) return;
    const viewport = { top: -window.innerHeight, bottom: window.innerHeight * 2 };
    for (const host of activeHosts) measureHost(host, viewport);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    geometryRevision += 1;
    observeSections();
    observeHosts();
    schedule();
  }, { passive: true });
  document.fonts?.ready?.then(() => { geometryRevision += 1; schedule(); });
  schedule();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') initialiseSourceReader(document, window);
