import { indexLibrary, incoming, LABELS } from './library-core.mjs';

const NS = 'http://www.w3.org/2000/svg';
const LEVELS = ['SOURCE', 'CH', 'CL', 'MC', 'WB'];
const COLOURS = { SOURCE: '#b87b4c', CH: '#7298b4', CL: '#70a795', MC: '#a28ebb', WB: '#cb8365', XR: '#dfb57b' };
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

function arrange(model, data, portrait = false) {
  data.works.forEach((work, position) => {
    const from = portrait ? (position === 0 ? 100 : 660) : 139;
    const to = portrait ? from + (work.sources.length - 1) * 20 : 535;
    const xs = portrait ? [30, 100, 169, 237, 301] : position === 0 ? [86, 186, 291, 396, 486] : [1114, 1014, 909, 804, 714];
    const sources = [...work.sources].sort((a, b) => a.order - b.order);
    for (const [offset, source] of sources.entries()) {
      Object.assign(model.nodes.get(source.id), { x: xs[0], y: from + (to - from) * offset / Math.max(1, sources.length - 1) });
    }
    for (const [level, layer] of LEVELS.slice(1).entries()) {
      const units = work.units.filter(unit => unit.layer === layer);
      for (const [offset, unit] of units.entries()) {
        const sources = [...model.edges.values()].filter(edge => edge.target === unit.id).map(edge => model.nodes.get(edge.source));
        const y = sources.length ? sources.reduce((sum, source) => sum + source.y, 0) / sources.length : from + (to - from) * offset / Math.max(1, units.length - 1);
        Object.assign(model.nodes.get(unit.id), { x: xs[level + 1], y });
      }
    }
  });
  const parents = [...model.edges.values()].filter(edge => edge.target === data.lateral.id).map(edge => model.nodes.get(edge.source));
  Object.assign(model.nodes.get(data.lateral.id), { x: portrait ? 328 : 600, y: portrait ? 550 : parents.reduce((sum, node) => sum + node.y, 0) / Math.max(1, parents.length) });
}

function pathBetween(source, target, portrait = false) {
  if (portrait && target.layer === 'XR') return `M ${source.x} ${source.y} C 348 ${source.y}, 348 ${target.y}, ${target.x} ${target.y}`;
  const midpoint = (source.x + target.x) / 2;
  return `M ${source.x} ${source.y} C ${midpoint} ${source.y}, ${midpoint} ${target.y}, ${target.x} ${target.y}`;
}

export function mountDiscoverAtlas(host, data, showcase = {}) {
  // This diagram follows the two recorded parents of the Kant–Hume lateral.
  data={...data,works:data.works.filter(work=>work.units.some(unit=>data.lateral.parents.includes(unit.id)))};
  const model = buildAtlasModel(data);
  let portrait = host.clientWidth <= 700;
  arrange(model, data, portrait);
  const readingCount = data.works.reduce((sum, work) => sum + work.units.length, 0);
  const sourceCount = data.works.reduce((sum, work) => sum + work.sources.length, 0);
  host.classList.add('discover-atlas');
  host.innerHTML = `<div class="discover-atlas__scroll" tabindex="0" role="region" aria-label="Map of the public CARE collection"><svg class="discover-atlas__svg" viewBox="${portrait ? '0 0 360 1220' : '0 0 1200 594'}" role="group" aria-label="Kant and Hume: sources, chapters, clusters, metaclusters and whole-book readings connected by a saved lateral" aria-describedby="discover-atlas-instructions"></svg></div><div class="discover-atlas__footer"><div class="discover-atlas__selection" aria-live="polite" aria-atomic="true"><span class="discover-atlas__selection-label">Selected route</span><span class="discover-atlas__selection-title">Hume · Introduction</span></div><button class="discover-atlas__open" type="button">Read this route <span aria-hidden="true">↗</span></button></div><p class="discover-atlas__note" id="discover-atlas-instructions"><span>${data.works.length} books · ${readingCount} CARE sheets · ${sourceCount} source sections · 1 lateral</span><span>Lines follow saved references. Select a point to read.</span></p>`;
  const svg = host.querySelector('svg');
  const backdrop = svgElement('g', { 'aria-hidden': 'true' });
  const edgeLayer = svgElement('g', { class: 'discover-atlas__edges', 'aria-hidden': 'true' });
  const nodeLayer = svgElement('g', { class: 'discover-atlas__nodes' });
  svg.append(backdrop, edgeLayer, nodeLayer);
  const edgeElements = new Map(), nodeElements = new Map();
  let selectedReference = '';
  let selectedUnit = '';

  function drawBackdrop() {
    backdrop.replaceChildren();
    for (const [position, work] of data.works.entries()) {
      const labelX = portrait ? 20 : position === 0 ? 70 : 1130;
      const anchor = portrait || position === 0 ? 'start' : 'end';
      const firstSource = model.nodes.get(work.sources[0].id);
      const headingY = portrait ? firstSource.y - 70 : 43;
      backdrop.append(svgElement('text', { x: labelX, y: headingY, 'text-anchor': anchor, class: 'discover-atlas__author' }, work.author.split(' ').at(-1)));
      backdrop.append(svgElement('text', { x: labelX, y: headingY + (portrait ? 21 : 24), 'text-anchor': anchor, class: 'discover-atlas__book' }, work.title));
      LEVELS.forEach(layer => {
        const node = [...model.nodes.values()].find(node => node.work?.id === work.id && node.layer === layer);
        const label = { SOURCE: 'Source', CH: 'Chapter', CL: 'Cluster', MC: 'Meta', WB: 'Whole' }[layer];
        backdrop.append(svgElement('text', { x: node.x, y: portrait ? firstSource.y - 22 : 105, 'text-anchor': 'middle', class: 'discover-atlas__level' }, label));
        backdrop.append(svgElement('line', { x1: node.x, y1: portrait ? firstSource.y - 10 : 122, x2: node.x, y2: portrait ? firstSource.y + (work.sources.length - 1) * 20 + 12 : 552, class: 'discover-atlas__guide' }));
      });
    }
  }
  drawBackdrop();
  host.classList.toggle('discover-atlas--portrait', portrait);
  for (const edge of model.edges.values()) {
    const element = svgElement('path', { d: pathBetween(model.nodes.get(edge.source), model.nodes.get(edge.target), portrait), class: 'discover-atlas__edge' });
    edgeLayer.append(element);
    edgeElements.set(edge.key, element);
  }

  function representative(node) {
    const chains = Object.values(showcase.chains || {}).concat([showcase.chain || []]);
    const preferred = chains.flat().find(item => model.index.nodes.get(item.id)?.unit.id === node.id);
    if (preferred) return preferred.id;
    if (node.layer === 'SOURCE') return node.unit.paragraphs?.[0]?.id || '';
    return node.unit.sections?.flatMap(section => section.items).find(item => incoming(item).length)?.id || node.unit.sections?.[0]?.items?.[0]?.id || '';
  }

  function openSelection() {
    const node = model.nodes.get(selectedUnit);
    if (!node) return;
    const work = node.work || data.works.find(work => work.slug === 'hume') || data.works[0];
    window.dispatchEvent(new CustomEvent('care:discover-open', { detail: { book: work.slug, ref: selectedReference, unit: node.id } }));
  }

  function updateHighlight(unitIds, edgeIds, selectedId) {
    for (const [id, element] of nodeElements) {
      element.classList.toggle('is-route', unitIds.has(id));
      element.classList.toggle('is-selected', id === selectedId);
      element.setAttribute('aria-pressed', String(id === selectedId));
    }
    for (const [key, element] of edgeElements) element.classList.toggle('is-route', edgeIds.has(key));
    // Paint the selected route over the quiet web without duplicating any edge.
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
    if (!selected) return;
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
          if (!other) continue;
          // A book route stays inside that book; the lateral may cross both works.
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
    describeSelection(model.nodes.get(selected.unit.id), referenceId);
    updateHighlight(unitIds, edgeIds, selected.unit.id);
  }

  const orderedNodes = [];
  data.works.forEach(work => LEVELS.forEach(layer => {
    orderedNodes.push(...[...model.nodes.values()].filter(node => node.work?.id === work.id && node.layer === layer).sort((a, b) => a.y - b.y));
  }));
  orderedNodes.push(model.nodes.get(data.lateral.id));
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
      setTabStop(node.id);
      openSelection();
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
    nodeLayer.append(group);
    nodeElements.set(node.id, group);
  }

  function setTabStop(id) {
    for (const [unitId, element] of nodeElements) element.setAttribute('tabindex', unitId === id ? '0' : '-1');
  }
  host.querySelector('.discover-atlas__open').addEventListener('click', () => {
    openSelection();
    queueMicrotask(() => {
      const reader = document.getElementById('discover-reader');
      if (!reader) return;
      reader.focus({ preventScroll: true });
      reader.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
  });
  const initialChain = showcase.chains?.hume || showcase.chain || [];
  const initial = initialChain.filter(item => model.index.nodes.has(item.id));
  if (initial.length) {
    const unitIds = new Set(initial.map(item => model.index.nodes.get(item.id).unit.id));
    const routeEdges = new Set();
    for (let position = 1; position < initial.length; position++) {
      const previous = model.index.nodes.get(initial[position - 1].id), current = model.index.nodes.get(initial[position].id);
      // The showcase is presentation data; verify every highlighted link against the export.
      if (incoming(current).some(link => link.id === previous.id)) routeEdges.add(edgeKey(previous.unit.id, current.unit.id));
    }
    const focused = initial.find(item => item.layer === 'CH') || initial[0];
    const node = model.nodes.get(model.index.nodes.get(focused.id).unit.id);
    describeSelection(node, focused.id);
    updateHighlight(unitIds, routeEdges, node.id);
    setTabStop(node.id);
  } else {
    const node = orderedNodes[0];
    showRoute(representative(node));
    setTabStop(node.id);
  }
  const onRoute = event => {
    const { referenceId, routeMode } = event.detail || {};
    if (referenceId && model.index.nodes.has(referenceId)) showRoute(referenceId, routeMode || 'incoming');
  };
  window.addEventListener('care:discover-route', onRoute);
  const resize = new ResizeObserver(entries => {
    const nextPortrait = entries[0].contentRect.width <= 700;
    if (nextPortrait === portrait) return;
    portrait = nextPortrait;
    arrange(model, data, portrait);
    host.classList.toggle('discover-atlas--portrait', portrait);
    svg.setAttribute('viewBox', portrait ? '0 0 360 1220' : '0 0 1200 594');
    drawBackdrop();
    for (const [id, element] of nodeElements) {
      const node = model.nodes.get(id);
      element.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    }
    for (const edge of model.edges.values()) edgeElements.get(edge.key).setAttribute('d', pathBetween(model.nodes.get(edge.source), model.nodes.get(edge.target), portrait));
    const lateralLabel = nodeElements.get(data.lateral.id).querySelector('.discover-atlas__lateral-label');
    lateralLabel.setAttribute('x', portrait ? '-29' : '0');
    lateralLabel.setAttribute('y', portrait ? '4' : '42');
    lateralLabel.setAttribute('text-anchor', portrait ? 'end' : 'middle');
  });
  resize.observe(host);
  return { model, showRoute, destroy: () => { resize.disconnect(); window.removeEventListener('care:discover-route', onRoute); } };
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
