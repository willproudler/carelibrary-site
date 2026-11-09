export function createNumoCompanion(host, {loadNumogram, draftLines, showAQMargins, beforeOpen, openSource}) {
  const doc = host.ownerDocument;
  host.className = 'numo-companion';
  host.hidden = true;
  host.innerHTML = `
    <aside class="numo-companion-panel" aria-label="NUMO beside draft" hidden>
      <header class="numo-companion-top">
        <strong>CARE / NUMO</strong>
        <form class="numo-companion-search" aria-label="Search the Numogram">
          <label><span>AQ</span><input type="search" aria-label="Search NUMO / AQ" placeholder="Word, phrase or number" maxlength="240" required></label>
          <button type="submit" aria-label="Open AQ on the map">↵</button>
        </form>
        <button type="button" data-view="map" aria-pressed="true">Map</button>
        <button type="button" data-view="matrix" aria-pressed="false">Demons</button>
        <button type="button" data-view="draft" aria-pressed="false">Draft AQ</button>
        <button type="button" data-action="minimize" aria-label="Minimize NUMO pane">−</button>
        <button type="button" data-action="close" aria-label="Close NUMO pane">×</button>
      </header>
      <div class="numo-companion-instrument" aria-label="Numogram"></div>
      <section class="numo-companion-draft" aria-label="AQ in this draft" hidden>
        <form aria-label="Find a draft AQ total">
          <input type="search" aria-label="AQ number or phrase" placeholder="Number or phrase" maxlength="240">
          <button type="submit">Find AQ</button>
          <button type="button" data-action="all">Scan draft</button>
          <button type="button" data-action="margins" aria-pressed="false">AQ margins</button>
        </form>
        <p role="status" data-numo-status></p>
        <ol data-numo-lines></ol>
      </section>
    </aside>
    <button class="numo-companion-resume" type="button" data-action="resume" hidden>Resume NUMO</button>`;
  const $ = selector => host.querySelector(selector);
  const panel = $('aside'), resume = $('[data-action="resume"]');
  const map = $('.numo-companion-instrument'), finder = $('.numo-companion-draft');
  const input = finder.querySelector('input'), output = $('[data-numo-lines]'), status = $('[data-numo-status]');
  let surface = 'map', phase = 'closed', visible = false, instrument, module, opening;
  const marginToggle = $('[data-action="margins"]');
  let generation = 0, clearMargins, draftKey;
  function hideMargins() {
    clearMargins?.();
    clearMargins = null;
    marginToggle.setAttribute('aria-pressed','false');
  }

  function paint() {
    host.hidden = !visible || phase === 'closed';
    panel.hidden = phase !== 'open';
    resume.hidden = phase !== 'minimized';
    map.hidden = surface === 'draft';
    finder.hidden = surface !== 'draft';
    for (const button of host.querySelectorAll('[data-view]')) {
      button.setAttribute('aria-pressed', String(button.dataset.view === surface));
    }
  }

  function stop() {
    generation += 1;
    opening = null;
    instrument?.unmount();
    instrument = null;
  }

  async function showMap({changeSurface = false} = {}) {
    if (phase !== 'open' || !visible || surface === 'draft') return;
    if (instrument) {
      if (changeSurface) instrument.openReference({kind:surface});
      return;
    }
    if (opening) return opening;
    const ticket = generation;
    map.textContent = 'Opening NUMO…';
    opening = loadNumogram().then(loaded => {
      module = loaded;
      if (ticket !== generation || phase !== 'open' || !visible) return;
      map.replaceChildren();
      instrument = module.default(map, {openSource, companion:true});
      instrument.openReference({kind:surface});
    }).catch(() => {
      if (ticket === generation) map.textContent = 'NUMO could not load. Choose Map to retry.';
    }).finally(() => {
      if (ticket === generation) opening = null;
    });
    return opening;
  }

  function setPhase(next) {
    phase = next;
    if (phase !== 'open') stop();
    if (phase === 'closed') hideMargins();
    paint();
  }

  async function scan(all = false) {
    const ticket = generation;
    try {
      module ||= await loadNumogram();
    } catch {
      status.textContent = 'AQ calculation is unavailable.';
      return;
    }
    if (ticket !== generation || phase !== 'open' || surface !== 'draft') return;
    const calculation = all ? null : module.instrumentAQInput(input.value);
    if (!all && !calculation) {
      status.textContent = 'Enter a number, word, or phrase to find its AQ total.';
      output.replaceChildren();
      return;
    }
    const rows = [];
    for (const [index, line] of draftLines().entries()) {
      const value = module.calculateInstrumentAQ(line.text);
      if (value && (all || value.total === calculation.total)) rows.push({index, value, ...line});
    }
    output.replaceChildren(...rows.slice(0, 160).map(({index, text, value, reveal})=>{
      const item = doc.createElement('li'), go = doc.createElement('button');
      const receipt = doc.createElement('small'), excerpt = doc.createElement('span');
      go.type = 'button';
      receipt.textContent = `LINE ${index + 1} · AQ ${value.total} · ZONE ${value.zoneLabel}`;
      excerpt.textContent = text;
      go.append(receipt, excerpt);
      if (reveal) go.onclick = () => { setPhase('minimized'); reveal(); };
      else go.disabled = true;
      item.append(go);
      return item;
    }));
    const count = rows.length;
    status.textContent = count ? `${count} ${count === 1 ? 'line' : 'lines'}${all ? ' in this draft' : ' at AQ ' + calculation.total}${count > 160 ? ' · showing the first 160' : ''}`
      : all ? 'This draft is empty.' : `No lines at AQ ${calculation.total} in this draft.`;
  }

  function open() {
    beforeOpen();
    setPhase('open');
    void showMap();
  }

  host.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.action === 'close') setPhase('closed');
    else if (button.dataset.action === 'minimize') { setPhase('minimized'); resume.focus(); }
    else if (button.dataset.action === 'resume') open();
    else if (button.dataset.action === 'all') void scan(true);
    else if (button.dataset.action === 'margins') {
      if (clearMargins) hideMargins();
      else if (module) {
        clearMargins = showAQMargins(module.calculateInstrumentAQ);
        marginToggle.setAttribute('aria-pressed','true');
      }
    }
    else if (button.dataset.view) {
      surface = button.dataset.view;
      if (surface === 'draft') {
        stop();
        paint();
        input.focus();
        void scan(true);
      } else {
        paint();
        void showMap({changeSurface:true});
      }
    }
  });
  finder.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    void scan();
  });

  $('.numo-companion-search').addEventListener('submit', async event => {
    event.preventDefault();
    const query = event.currentTarget.querySelector('input').value;
    try { module ||= await loadNumogram(); } catch { return; }
    const result = module.instrumentAQInput(query);
    if (!result || phase !== 'open') return;
    surface = 'map';
    paint();
    await showMap();
    instrument?.openAQ({query,total:result.total});
  });

  return {
    open,
    minimize() { if (phase === 'open') setPhase('minimized'); },
    close() { setPhase('closed'); },
    setVisible(value, key) {
      if (draftKey !== key) { draftKey = key; hideMargins(); }
      if (visible === value) return;
      visible = value;
      if (!visible) stop();
      paint();
      if (visible && phase === 'open') void showMap();
    },
  };
}
