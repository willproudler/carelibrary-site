import { indexLibrary, incoming, LABELS } from './library-core.mjs';

const NS = 'http://www.w3.org/2000/svg';
const LEVELS = ['SOURCE', 'CH', 'CL', 'MC', 'WB'];
const COLOURS = { SOURCE: '#b87b4c', CH: '#7298b4', CL: '#70a795', MC: '#a28ebb', WB: '#cb8365', XR: '#9e78ab' };
const edgeKey = (source, target) => `${source}\0${target}`;

// Each line is a collapsed, recorded item-to-item reference or passage alignment.
// Unit parents are deliberately not used as evidence of a reading route.
export function buildAtlasModel(data) {
  const index = indexLibrary(data);
  const nodes = new Map();
  for (const [id, unit] of index.units) nodes.set(id, { id, unit, layer: unit.layer, work: unit.work, x: 0, y: 0 });
  const edges = new Map();
  for (const node of index.nodes.values()) {
    for (const link of incoming(node)) {
      const source = index.nodes.get(link.id);
      if (source.unit.id === node.unit.id) continue;
      const key = edgeKey(source.unit.id, node.unit.id);
      if (!edges.has(key)) edges.set(key, { key, source: source.unit.id, target: node.unit.id, references: [] });
      edges.get(key).references.push({ source: source.id, target: node.id, type: link.type });
    }
  }
  return { index, nodes, edges };
}

function svgElement(name, attributes = {}, content = '') {
  const element = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (content) element.textContent = content;
  return element;
}

// The full reference index stays available, while the drawing includes only
// the selected book or the recorded parents of an explicitly opened lateral.
export function atlasView(data, model, status = {}) {
  const lateral = status.book === 'lateral' || status.connectionId === data.lateral.id;
  const fallback = data.works.find(work => work.slug === 'hume') || data.works[0];
  const selectedWork = data.works.find(work => work.slug === status.book || work.id === status.workId) || fallback;
  const works = lateral
    ? data.works.filter(work => work.units.some(unit => data.lateral.parents.includes(unit.id)))
    : [selectedWork];
  const workIds = new Set(works.map(work => work.id));
  const nodes = new Map([...model.nodes].filter(([id, node]) => workIds.has(node.work?.id) || (lateral && id === data.lateral.id)));
  const edges = new Map([...model.edges].filter(([, edge]) => nodes.has(edge.source) && nodes.has(edge.target)));
  return { lateral, book: lateral ? 'lateral' : selectedWork.slug, works, nodes, edges };
}

function arrange(view, portrait = false) {
  let height = portrait ? 0 : 594;
  view.works.forEach((work, position) => {
    const from = portrait ? (view.lateral && position > 0 ? 660 : 100) : 139;
    const to = portrait ? from + Math.max(8, work.sources.length - 1) * 20 : 535;
    height = Math.max(height, to + 60);
    const levels = LEVELS.filter(layer => [...view.nodes.values()].some(node => node.work?.id === work.id && node.layer === layer));
    const xs = portrait
      ? levels.map((_, i) => 30 + i * (view.lateral ? 271 : 292) / Math.max(1, levels.length - 1))
      : view.lateral
        ? position === 0 ? [86, 186, 291, 396, 486] : [1114, 1014, 909, 804, 714]
        : levels.map((_, i) => 100 + i * 1000 / Math.max(1, levels.length - 1));
    const sources = [...work.sources].sort((a, b) => a.order - b.order);
    for (const [offset, source] of sources.entries()) {
      Object.assign(view.nodes.get(source.id), { x: xs[0], y: from + (to - from) * offset / Math.max(1, sources.length - 1) });
    }
    for (const [level, layer] of levels.slice(1).entries()) {
      const units = work.units.filter(unit => unit.layer === layer);
      for (const [offset, unit] of units.entries()) {
        const parents = [...view.edges.values()].filter(edge => edge.target === unit.id).map(edge => view.nodes.get(edge.source));
        const y = parents.length ? parents.reduce((sum, source) => sum + source.y, 0) / parents.length : from + (to - from) * offset / Math.max(1, units.length - 1);
        Object.assign(view.nodes.get(unit.id), { x: xs[level + 1], y });
      }
    }
  });
  if (view.lateral) {
    const node = [...view.nodes.values()].find(node => node.layer === 'XR');
    const parents = [...view.edges.values()].filter(edge => edge.target === node.id).map(edge => view.nodes.get(edge.source));
    Object.assign(node, { x: portrait ? 328 : 600, y: portrait ? 550 : parents.reduce((sum, parent) => sum + parent.y, 0) / Math.max(1, parents.length) });
    if (portrait) height = Math.max(1220, height);
  }
  return `0 0 ${portrait ? 360 : 1200} ${height}`;
}

function pathBetween(source, target, portrait = false) {
  if (portrait && target.layer === 'XR') return `M ${source.x} ${source.y} C 348 ${source.y}, 348 ${target.y}, ${target.x} ${target.y}`;
  const midpoint = (source.x + target.x) / 2;
  return `M ${source.x} ${source.y} C ${midpoint} ${source.y}, ${midpoint} ${target.y}, ${target.x} ${target.y}`;
}

export function mountDiscoverAtlas(host, data, showcase = {}) {
  const model = buildAtlasModel(data);
  let portrait = host.clientWidth <= 700;
  let view = atlasView(data, model);
  let lastBook = view.book;
  let currentStatus = { book: view.book };
  let selectedReference = '', selectedUnit = '';
  let orderedNodes = [];
  const edgeElements = new Map(), nodeElements = new Map();
  host.classList.add('discover-atlas');
  host.setAttribute('tabindex', '-1');
  host.innerHTML = `<div class="discover-atlas__mode"><p class="discover-atlas__description"></p><button class="discover-atlas__back" type="button" hidden>Back to one book</button></div><div class="discover-atlas__scroll" tabindex="0" role="region" aria-label="Map of the selected CARE reading"><svg class="discover-atlas__svg" role="group" aria-describedby="discover-atlas-instructions"></svg></div><div class="discover-atlas__footer"><div class="discover-atlas__selection" aria-live="polite" aria-atomic="true"><span class="discover-atlas__selection-label"></span><span class="discover-atlas__selection-title"></span></div><button class="discover-atlas__open" type="button">Read this route <span aria-hidden="true">↗</span></button></div><p class="discover-atlas__note" id="discover-atlas-instructions"><span class="discover-atlas__counts"></span><span>Lines follow saved references. Select a point to read.</span></p>`;
  const svg = host.querySelector('svg');
  const backdrop = svgElement('g', { 'aria-hidden': 'true' });
  const edgeLayer = svgElement('g', { class: 'discover-atlas__edges', 'aria-hidden': 'true' });
  const nodeLayer = svgElement('g', { class: 'discover-atlas__nodes' });
  svg.append(backdrop, edgeLayer, nodeLayer);

  function drawBackdrop() {
    backdrop.replaceChildren();
    for (const [position, work] of view.works.entries()) {
      const labelX = portrait ? 20 : view.lateral && position > 0 ? 1130 : 70;
      const anchor = portrait || !view.lateral || position === 0 ? 'start' : 'end';
      const firstSource = view.nodes.get([...work.sources].sort((a, b) => a.order - b.order)[0].id);
      const headingY = portrait ? firstSource.y - 70 : 43;
      backdrop.append(svgElement('text', { x: labelX, y: headingY, 'text-anchor': anchor, class: 'discover-atlas__author' }, work.author.split(' ').at(-1)));
      backdrop.append(svgElement('text', { x: labelX, y: headingY + (portrait ? 21 : 24), 'text-anchor': anchor, class: 'discover-atlas__book' }, work.title));
      LEVELS.forEach(layer => {
        const node = [...view.nodes.values()].find(node => node.work?.id === work.id && node.layer === layer);
        if (!node) return;
        const label = { SOURCE: 'Source', CH: 'Chapter', CL: 'Cluster', MC: 'Meta', WB: 'Whole' }[layer];
        backdrop.append(svgElement('text', { x: node.x, y: portrait ? firstSource.y - 22 : 105, 'text-anchor': 'middle', class: 'discover-atlas__level' }, label));
        backdrop.append(svgElement('line', { x1: node.x, y1: portrait ? firstSource.y - 10 : 122, x2: node.x, y2: portrait ? firstSource.y + Math.max(8, work.sources.length - 1) * 20 + 12 : 552, class: 'discover-atlas__guide' }));
      });
    }
  }

  function representative(node) {
    const chains = Object.values(showcase.chains || {}).concat([showcase.chain || []]);
    const preferred = chains.flat().find(item => model.index.nodes.get(item.id)?.unit.id === node.id);
    if (preferred) return preferred.id;
    if (node.layer === 'SOURCE') return node.unit.paragraphs?.[0]?.id || '';
    return node.unit.sections?.flatMap(section => section.items).find(item => incoming(item).length)?.id || node.unit.sections?.[0]?.items?.[0]?.id || '';
  }

  function openSelection() {
    const node = view.nodes.get(selectedUnit);
    if (!node) return;
    window.dispatchEvent(new CustomEvent('care:discover-open', { detail: { book: node.layer === 'XR' ? 'lateral' : node.work.slug, ref: selectedReference, unit: node.id } }));
  }

  function updateHighlight(unitIds, edgeIds, selectedId) {
    for (const [id, element] of nodeElements) {
      element.classList.toggle('is-route', unitIds.has(id));
      element.classList.toggle('is-selected', id === selectedId);
      element.setAttribute('aria-pressed', String(id === selectedId));
    }
    for (const [key, element] of edgeElements) element.classList.toggle('is-route', edgeIds.has(key));
    for (const key of edgeIds) if (edgeElements.has(key)) edgeLayer.append(edgeElements.get(key));
  }

  function describeSelection(node, referenceId) {
    selectedUnit = node.id;
    selectedReference = referenceId;
    host.querySelector('.discover-atlas__selection-label').textContent = node.layer === 'XR' ? 'Saved lateral' : `${node.work.author.split(' ').at(-1)} · ${LABELS[node.layer]}`;
    host.querySelector('.discover-atlas__selection-title').textContent = node.unit.title;
  }

  function showRoute(referenceId, mode = 'incoming') {
    const selected = model.index.nodes.get(referenceId);
    if (!selected || !view.nodes.has(selected.unit.id)) return;
    const unitIds = new Set([selected.unit.id]), edgeIds = new Set();
    const direction = selected.kind === 'passage' ? 'outgoing' : mode;
    function visit(backwards) {
      const pending = [referenceId], visited = new Set();
      while (pending.length) {
        const id = pending.pop();
        if (visited.has(id)) continue;
        visited.add(id);
        const current = model.index.nodes.get(id);
        const links = backwards ? incoming(current) : model.index.outgoing.get(id) || [];
        for (const link of links) {
          const other = model.index.nodes.get(link.id);
          if (!other || !view.nodes.has(other.unit.id)) continue;
          // A book route stays inside that book; a lateral route may cross both.
          if (selected.work && other.work?.id !== selected.work.id) continue;
          unitIds.add(other.unit.id);
          const source = backwards ? other.unit.id : current.unit.id;
          const target = backwards ? current.unit.id : other.unit.id;
          if (source !== target) edgeIds.add(edgeKey(source, target));
          if (!visited.has(other.id)) pending.push(other.id);
        }
      }
    }
    if (direction !== 'outgoing') visit(true);
    if (direction !== 'incoming') visit(false);
    describeSelection(view.nodes.get(selected.unit.id), referenceId);
    updateHighlight(unitIds, edgeIds, selected.unit.id);
    setTabStop(selected.unit.id);
  }

  function setTabStop(id) {
    for (const [unitId, element] of nodeElements) element.setAttribute('tabindex', unitId === id ? '0' : '-1');
  }

  function draw() {
    svg.setAttribute('viewBox', arrange(view, portrait));
    host.classList.toggle('discover-atlas--portrait', portrait);
    host.classList.toggle('discover-atlas--lateral', view.lateral);
    host.dataset.book = view.book;
    host.dataset.mode = view.lateral ? 'lateral' : 'book';
    svg.setAttribute('aria-label', view.lateral
      ? 'Kant and Hume connected by a saved lateral reading'
      : `${view.works[0].author}: source sections and CARE readings`);
    host.querySelector('.discover-atlas__description').textContent = view.lateral
      ? 'A lateral compares two books. Purple lines show the sources behind the selected comparison.'
      : 'One book: follow its original text through chapter readings, groups of chapters and the whole book.';
    host.querySelector('.discover-atlas__back').hidden = !view.lateral;
    const readingCount = view.works.reduce((sum, work) => sum + work.units.length, 0);
    const sourceCount = view.works.reduce((sum, work) => sum + work.sources.length, 0);
    host.querySelector('.discover-atlas__counts').textContent = `${view.works.length} ${view.lateral ? 'books' : 'book'} · ${readingCount} CARE sheets · ${sourceCount} source sections${view.lateral ? ' · 1 lateral' : ''}`;
    drawBackdrop();
    edgeLayer.replaceChildren(); nodeLayer.replaceChildren(); edgeElements.clear(); nodeElements.clear();
    for (const edge of view.edges.values()) {
      const element = svgElement('path', { d: pathBetween(view.nodes.get(edge.source), view.nodes.get(edge.target), portrait), class: 'discover-atlas__edge' });
      edgeLayer.append(element); edgeElements.set(edge.key, element);
    }
    orderedNodes = [];
    view.works.forEach(work => LEVELS.forEach(layer => {
      orderedNodes.push(...[...view.nodes.values()].filter(node => node.work?.id === work.id && node.layer === layer).sort((a, b) => a.y - b.y));
    }));
    if (view.lateral) orderedNodes.push(view.nodes.get(data.lateral.id));
    for (const node of orderedNodes) {
      const workName = node.work?.author.split(' ').at(-1);
      const label = node.layer === 'XR' ? `Open the saved ${node.unit.title} lateral` : `Open ${workName}, ${LABELS[node.layer]}, ${node.unit.title}`;
      const group = svgElement('g', { class: `discover-atlas__node discover-atlas__node--${node.layer.toLowerCase()}`, transform: `translate(${node.x}, ${node.y})`, tabindex: '-1', role: 'button', 'aria-label': label, 'aria-pressed': 'false', 'data-unit': node.id, style: `--atlas-node: ${COLOURS[node.layer]}` });
      group.append(svgElement('title', {}, `${workName ? `${workName} · ` : ''}${LABELS[node.layer]} · ${node.unit.title}`));
      group.append(svgElement('circle', { r: node.layer === 'XR' ? 25 : 10, class: 'discover-atlas__hit' }));
      group.append(svgElement('circle', { r: node.layer === 'XR' ? 20 : node.layer === 'WB' ? 9 : ['MC', 'CL'].includes(node.layer) ? 6 : 4, class: 'discover-atlas__point' }));
      if (node.layer === 'XR') {
        group.append(svgElement('path', { d: 'M -7 0 H 7 M 3 -4 L 7 0 L 3 4 M -3 -4 L -7 0 L -3 4', class: 'discover-atlas__lateral-mark', 'aria-hidden': 'true' }));
        group.append(svgElement('text', { x: portrait ? -29 : 0, y: portrait ? 4 : 42, 'text-anchor': portrait ? 'end' : 'middle', class: 'discover-atlas__lateral-label', 'aria-hidden': 'true' }, 'Lateral'));
      }
      group.addEventListener('click', () => {
        const ref = representative(node);
        if (ref) showRoute(ref);
        else { describeSelection(node, ''); updateHighlight(new Set([node.id]), new Set(), node.id); }
        setTabStop(node.id); openSelection();
      });
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); group.dispatchEvent(new MouseEvent('click')); return; }
        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let next;
        const position = orderedNodes.indexOf(node);
        if (event.key === 'Home') next = orderedNodes[0];
        else if (event.key === 'End') next = orderedNodes.at(-1);
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') next = orderedNodes[(position + (event.key === 'ArrowDown' ? 1 : -1) + orderedNodes.length) % orderedNodes.length];
        else {
          const direction = event.key === 'ArrowRight' ? 1 : -1;
          next = orderedNodes.filter(candidate => (candidate.x - node.x) * direction > 0).sort((a, b) => Math.abs(a.x - node.x) - Math.abs(b.x - node.x) || Math.abs(a.y - node.y) - Math.abs(b.y - node.y))[0];
        }
        if (next) { setTabStop(next.id); nodeElements.get(next.id).focus(); }
      });
      nodeLayer.append(group); nodeElements.set(node.id, group);
    }
  }

  function selectStatus(status) {
    const reference = model.index.nodes.get(status.referenceId);
    if (reference && view.nodes.has(reference.unit.id)) {
      showRoute(status.referenceId, status.routeMode || 'incoming');
      return;
    }
    let node = view.nodes.get(status.unitId);
    if (!node) {
      const chain = showcase.chains?.[view.book] || [];
      const example = chain.find(item => item.layer === 'CH' && view.nodes.has(model.index.nodes.get(item.id)?.unit.id));
      node = view.lateral ? view.nodes.get(data.lateral.id) : example ? view.nodes.get(model.index.nodes.get(example.id).unit.id) : orderedNodes[0];
    }
    if (!node) return;
    const ref = representative(node);
    if (ref) showRoute(ref, status.routeMode || 'both');
    else { describeSelection(node, ''); updateHighlight(new Set([node.id]), new Set(), node.id); setTabStop(node.id); }
  }

  function sync(status = {}) {
    const next = atlasView(data, model, status);
    if (!next.lateral) lastBook = next.book;
    const changed = next.book !== view.book;
    view = next; currentStatus = status;
    if (changed) draw();
    selectStatus(status);
  }

  host.querySelector('.discover-atlas__back').addEventListener('click', () => {
    sync({ book: lastBook });
    window.dispatchEvent(new CustomEvent('care:discover-open', { detail: { book: lastBook } }));
    host.focus({ preventScroll: true });
    queueMicrotask(() => host.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
  });
  host.querySelector('.discover-atlas__open').addEventListener('click', () => {
    openSelection();
    queueMicrotask(() => {
      const reader = document.getElementById('discover-reader');
      if (!reader) return;
      reader.focus({ preventScroll: true });
      reader.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
  });
  const onRoute = event => sync(event.detail || {});
  window.addEventListener('care:discover-route', onRoute);
  window.addEventListener('care:discover-ready', onRoute);
  draw();
  sync(document.getElementById('discover-reader')?.discoverReader?.status() || currentStatus);
  const resize = new ResizeObserver(entries => {
    const nextPortrait = entries[0].contentRect.width <= 700;
    if (nextPortrait === portrait) return;
    const focusedId = document.activeElement?.dataset.unit;
    portrait = nextPortrait;
    draw(); selectStatus(currentStatus);
    if (focusedId && nodeElements.has(focusedId)) nodeElements.get(focusedId).focus({ preventScroll: true });
  });
  resize.observe(host);
  return { model, showRoute, sync, destroy: () => { resize.disconnect(); window.removeEventListener('care:discover-route', onRoute); window.removeEventListener('care:discover-ready', onRoute); } };
}

const host = typeof document === 'undefined' ? null : document.getElementById('discover-atlas');
if (host) {
  host.setAttribute('aria-busy', 'true');
  Promise.all([
    fetch(new URL('./data/library.json?v=20261005', import.meta.url)).then(response => { if (!response.ok) throw new Error('The collection could not load.'); return response.json(); }),
    fetch(new URL('./data/showcase.json?v=20261005', import.meta.url)).then(response => { if (!response.ok) throw new Error('The reading route could not load.'); return response.json(); }),
  ]).then(([data, showcase]) => mountDiscoverAtlas(host, data, showcase)).catch(error => {
    host.innerHTML = `<p class="discover-atlas__error">The collection map could not load. <a href="./library.html">Open the public library</a>.</p>`;
    console.error('CARE collection map:', error);
  }).finally(() => host.removeAttribute('aria-busy'));
}
