export const NUMOGRAM_MARK = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10l4 7-3 6-6 6-6-6-3-6zM7 3l5 19m5-19-5 19m-9-12h18M6 16h12M7 3l11 13M17 3 6 16"/><g fill="currentColor" stroke="none"><circle cx="7" cy="3" r="1.3"/><circle cx="17" cy="3" r="1.3"/><circle cx="3" cy="10" r="1.3"/><circle cx="21" cy="10" r="1.3"/><circle cx="6" cy="16" r="1.3"/><circle cx="18" cy="16" r="1.3"/><circle cx="12" cy="22" r="1.3"/></g></svg>`;

const searchMark = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.5 4.5"/></svg>`;
const endpoint = '/api/numo/aq';
const matchKind = 'sentence';
const sort = 'variety';
const resultLimit = 4;
const loadInstrumentParser = () => import('./numogram-instrument.mjs').then(module => module.instrumentAQInput);
let nextSearchId = 0;

export function mountNumogramHeaderSearch({host, onOpenNumogram, onSearchCare, loadAQParser = loadInstrumentParser}) {
  const doc = host.ownerDocument;
  const frame = doc.defaultView;
  const searchId = `care-numo-header-${++nextSearchId}`;
  host.classList.add('numo-header-search');
  host.hidden = true;
  host.innerHTML = `
    <button type="button" class="numo-header-compact" data-aq-compact aria-label="Open AQ search" title="AQ search" aria-controls="${searchId}-surface" aria-expanded="false">${NUMOGRAM_MARK}<span>AQ</span></button>
    <div class="numo-header-surface" id="${searchId}-surface">
      <form class="numo-header-field" role="search" aria-label="Search the AQ index" id="${searchId}-form">
        <span class="numo-header-field-mark">${NUMOGRAM_MARK}</span>
        <input type="search" data-aq-query placeholder="AQ search" aria-label="AQ search" aria-controls="${searchId}-matches" maxlength="1024" autocomplete="off" spellcheck="false">
        <span class="numo-header-total" data-aq-total hidden></span>
        <button class="numo-header-close" type="button" data-aq-close aria-label="Close AQ search">×</button>
      </form>
      <section class="numo-header-panel" id="${searchId}-matches" aria-label="AQ sentence matches" hidden>
        <div class="numo-header-results-top"><div><span class="numo-header-kicker">AQ / SENTENCE INDEX</span>
          <div class="numo-header-status" role="status" data-aq-status></div></div>
          <button type="submit" class="numo-header-open" form="${searchId}-form" data-aq-open disabled>Open in Numogram <span aria-hidden="true">↗</span></button>
        </div>
        <ul class="numo-header-results" data-aq-results aria-label="Published sentence matches" hidden></ul>
        <div class="numo-header-results-foot"><button type="button" data-aq-care>${searchMark} Search CARE</button></div>
      </section>
    </div>
    <button type="button" class="numo-header-care" data-aq-care aria-label="Search CARE Library" title="Search CARE Library">${searchMark}<span>Search CARE</span></button>`;

  const $ = selector => host.querySelector(selector);
  const input = $('[data-aq-query]');
  const panel = $('.numo-header-panel');
  const status = $('[data-aq-status]');
  const list = $('[data-aq-results]');
  const totalLabel = $('[data-aq-total]');
  const compact = $('[data-aq-compact]');
  const openButton = $('[data-aq-open]');
  const cache = new Map();
  const mobile = frame.matchMedia('(max-width: 740px)');
  let active = false;
  let expanded = false;
  let calculation = null;
  let calculator;
  let timer;
  let pending;
  let revision = 0;

  function loadCalculator() {
    calculator ??= Promise.resolve().then(loadAQParser).catch(error => {
      calculator = null;
      throw error;
    });
    return calculator;
  }

  function clearRequest() {
    revision += 1;
    frame.clearTimeout(timer);
    pending?.abort();
    pending = null;
  }

  function placeMobileTray() {
    host.style.setProperty('--numo-aq-tray-top', `${Math.max(0, host.getBoundingClientRect().bottom + 7)}px`);
  }

  function setExpanded(value) {
    expanded = value;
    if (value) placeMobileTray();
    host.toggleAttribute('data-aq-expanded', value);
    compact.setAttribute('aria-expanded', String(value));
    panel.hidden = !value;
  }

  function close({restoreFocus = false} = {}) {
    if (!expanded) return;
    if (restoreFocus) (mobile.matches ? compact : input).focus({preventScroll:true});
    clearRequest();
    setExpanded(false);
  }

  function results(rows = []) {
    list.replaceChildren();
    for (const record of rows.slice(0, resultLimit)) {
      const item = doc.createElement('li');
      const button = doc.createElement('button');
      const excerpt = doc.createElement('span');
      const credit = doc.createElement('small');
      button.type = 'button';
      button.dataset.aqResult = record.id;
      button.setAttribute('aria-label', `Open in Numogram: ${record.text.slice(0, 170)}`);
      excerpt.textContent = record.text + (record.text_truncated ? '…' : '');
      credit.textContent = [record.work_title, record.author].filter(Boolean).join(' · ');
      button.append(excerpt, credit);
      item.append(button);
      list.append(item);
    }
    list.hidden = !list.childElementCount;
  }

  function showPage(page) {
    const count = page.total_count;
    status.textContent = count ? `${count.toLocaleString()} published ${count === 1 ? 'sentence' : 'sentences'}` : 'No published sentences at this total.';
    results(page.records);
  }

  async function lookup(total, token) {
    const request = new AbortController();
    pending = request;
    const params = new URLSearchParams({total, match_kind:matchKind, sort, offset:0});
    try {
      const response = await frame.fetch(`${endpoint}?${params}`, {cache:'no-store', signal:request.signal});
      if (!response.ok) throw new Error('AQ lookup failed');
      const page = await response.json();
      if (page.status !== 'ok' || Number(page.request?.query) !== total || page.request?.match_kind !== matchKind
          || !Array.isArray(page.records) || !Number.isSafeInteger(page.total_count)) throw new Error('Invalid AQ page');
      if (revision !== token || !expanded) return;
      const preview = {...page, records:page.records.filter(record => typeof record?.id === 'string' && typeof record.text === 'string').slice(0, resultLimit)};
      cache.set(total, preview);
      if (cache.size > 16) cache.delete(cache.keys().next().value);
      showPage(preview);
    } catch {
      if (!request.signal.aborted && revision === token && expanded) status.textContent = 'Couldn’t load sentence matches. You can open this AQ total in Numogram.';
    } finally {
      if (pending === request) pending = null;
    }
  }

  async function update() {
    clearRequest();
    const token = revision;
    const query = input.value.trim();
    calculation = null;
    totalLabel.hidden = true;
    openButton.disabled = true;
    results();
    if (!query) {
      status.textContent = 'Type a word, a phrase or an AQ number.';
      return;
    }
    try {
      const parse = await loadCalculator();
      if (revision !== token || !expanded) return;
      calculation = parse(query);
    } catch {
      if (revision === token && expanded) status.textContent = 'AQ search is unavailable. Search CARE is still available.';
      return;
    }
    if (!calculation) {
      status.textContent = 'Enter letters, digits or a valid AQ number.';
      return;
    }
    const {total, zoneLabel} = calculation;
    totalLabel.textContent = `AQ ${total.toLocaleString()}`;
    totalLabel.title = `AQ ${total} · Zone ${zoneLabel}`;
    totalLabel.hidden = false;
    openButton.disabled = false;
    if (cache.has(total)) showPage(cache.get(total));
    else {
      status.textContent = `Finding published sentences at AQ ${total.toLocaleString()}…`;
      timer = frame.setTimeout(() => lookup(total, token), 170);
    }
  }

  function open(query) {
    if (!active) return;
    if (typeof query === 'string') input.value = query.slice(0, input.maxLength);
    const changed = !expanded || typeof query === 'string';
    setExpanded(true);
    input.focus({preventScroll:true});
    if (changed) update();
  }

  function go(id = '') {
    if (!calculation) return;
    const selection = {query:input.value.trim(), total:calculation.total, id, matchKind, sort};
    close();
    onOpenNumogram(selection);
  }

  function onInput() {
    if (!expanded) setExpanded(true);
    update();
  }
  function onFocus() {
    if (active && !expanded) {
      setExpanded(true);
      update();
    }
  }
  function onSubmit(event) {
    event.preventDefault();
    go();
  }
  function onClick(event) {
    if (event.target === input && !expanded) {
      onFocus();
      return;
    }
    const button = event.target.closest?.('button');
    if (!button || !host.contains(button)) return;
    if (button.hasAttribute('data-aq-compact')) open();
    else if (button.hasAttribute('data-aq-close')) close({restoreFocus:true});
    else if (button.hasAttribute('data-aq-care')) {
      const query = input.value.trim();
      close();
      onSearchCare(query);
    } else if (button.dataset.aqResult) go(button.dataset.aqResult);
  }
  function onKeydown(event) {
    if (!expanded || event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close({restoreFocus:true});
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = [...list.querySelectorAll('button')];
    const current = buttons.indexOf(event.target);
    const next = event.target === input && event.key === 'ArrowDown' ? buttons[0] || (!openButton.disabled && openButton)
      : current < 0 ? null : event.key === 'ArrowDown' ? buttons[current + 1] : buttons[current - 1] || input;
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }
  function outside(event) {
    if (expanded && !event.composedPath().includes(host)) close();
  }
  function focusOut(event) {
    if (event.relatedTarget && !host.contains(event.relatedTarget)) close();
  }
  function resize() {
    if (expanded) placeMobileTray();
  }
  function setActive(value) {
    if (!value) close();
    active = Boolean(value);
    host.hidden = !active;
  }
  function destroy() {
    setActive(false);
    cache.clear();
    input.removeEventListener('focus', onFocus);
    input.removeEventListener('input', onInput);
    host.removeEventListener('submit', onSubmit);
    host.removeEventListener('click', onClick);
    host.removeEventListener('keydown', onKeydown);
    host.removeEventListener('focusout', focusOut);
    doc.removeEventListener('pointerdown', outside);
    frame.removeEventListener('resize', resize);
    frame.removeEventListener('care:account-ended', destroy);
    host.replaceChildren();
  }

  input.addEventListener('focus', onFocus);
  input.addEventListener('input', onInput);
  host.addEventListener('submit', onSubmit);
  host.addEventListener('click', onClick);
  host.addEventListener('keydown', onKeydown);
  host.addEventListener('focusout', focusOut);
  doc.addEventListener('pointerdown', outside);
  frame.addEventListener('resize', resize);
  frame.addEventListener('care:account-ended', destroy, {once:true});
  return {setActive, open, close, destroy};
}
