const writingMerge = (() => {
class DraftMergeConflict extends Error {
  constructor() {
    super("Both versions changed the same part of the draft.");
  }
}

const same = (left, right) => left.length === right.length && left.every((token, index) => token === right[index]);

// Myers' shortest edit path. Cap the amount of work on a wholesale replacement.
function editPath(before, after) {
  const trace = [];
  let previous = new Map([[1, 0]]);
  const limit = Math.min(before.length + after.length, 512);
  for (let distance = 0; distance <= limit; distance++) {
    const current = new Map();
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const down = previous.get(diagonal + 1) ?? -1;
      const right = previous.get(diagonal - 1) ?? -1;
      let x = diagonal === -distance || (diagonal !== distance && right < down) ? down : right + 1;
      let y = x - diagonal;
      while (x < before.length && y < after.length && before[x] === after[y]) {
        x++;
        y++;
      }
      if (x >= before.length && y >= after.length) return backtrack(trace, before, after, distance);
      current.set(diagonal, x);
    }
    trace.push(current);
    previous = current;
  }
  return null;
}

function backtrack(trace, before, after, distance) {
  let x = before.length;
  let y = after.length;
  const path = [];
  for (let index = distance; index > 0; index--) {
    const previous = trace[index - 1];
    const diagonal = x - y;
    const down = previous.get(diagonal + 1) ?? -1;
    const right = previous.get(diagonal - 1) ?? -1;
    const from = diagonal === -index || (diagonal !== index && right < down) ? diagonal + 1 : diagonal - 1;
    const priorX = previous.get(from);
    const priorY = priorX - from;
    while (x > priorX && y > priorY) {
      path.push({type: "keep"});
      x--;
      y--;
    }
    if (x === priorX) path.push({type: "insert", token: after[--y]});
    else {
      path.push({type: "delete"});
      x--;
    }
  }
  while (x-- > 0) path.push({type: "keep"});
  return path.reverse();
}

function tokenEdits(before, after) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  if (endBefore === start && endAfter === start) return [];
  const replacement = after.slice(start, endAfter);
  if (endBefore === start || endAfter === start) return [{start, end: endBefore, tokens: replacement}];
  const path = editPath(before.slice(start, endBefore), replacement);
  if (!path) return [{start, end: endBefore, tokens: replacement}];
  const edits = [];
  let offset = start;
  let edit = null;
  for (const step of path) {
    if (step.type === "keep") {
      edit = null;
      offset++;
      continue;
    }
    if (!edit) {
      edit = {start: offset, end: offset, tokens: []};
      edits.push(edit);
    }
    if (step.type === "insert") edit.tokens.push(step.token);
    else edit.end = ++offset;
  }
  return edits;
}

function overlap(left, right) {
  if (left.start === left.end) return right.start < left.start && left.start < right.end;
  if (right.start === right.end) return left.start < right.start && right.start < left.end;
  return left.start < right.end && right.start < left.end;
}

function mergeTokens(base, latest, local) {
  if (same(base, local) || same(latest, local)) return latest;
  if (same(base, latest)) return local;
  const sharedEdits = tokenEdits(base, latest);
  const localEdits = tokenEdits(base, local);
  const edits = [...sharedEdits];
  for (const edit of localEdits) {
    if (sharedEdits.some(other => other.start === edit.start && other.end === edit.end && same(other.tokens, edit.tokens))) continue;
    if (sharedEdits.some(other => overlap(edit, other))) throw new DraftMergeConflict();
    edits.push(edit);
  }
  // Existing shared text precedes a simultaneous insertion at the same position.
  edits.sort((left, right) => left.start - right.start || left.end - right.end);
  const combined = [];
  let cursor = 0;
  for (const edit of edits) {
    for (let index = cursor; index < edit.start; index++) combined.push(base[index]);
    for (const token of edit.tokens) combined.push(token);
    cursor = edit.end;
  }
  for (let index = cursor; index < base.length; index++) combined.push(base[index]);
  return combined;
}

const markupToken = /<\/?[a-z][\w:-]*(?:\s+[\w:-]+(?:="[^"]*")?)*\s*\/?>|&(?:#[0-9]+|#x[\da-f]+|[a-z][a-z0-9]+);|[\s\S]/giu;

function parseBlocks(document, html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const blocks = new Map();
  for (const node of template.content.childNodes) {
    if (node.nodeType === 3 && !node.data.trim()) continue;
    const id = node.dataset?.blockId;
    if (!id || blocks.has(id)) throw new DraftMergeConflict();
    blocks.set(id, node.outerHTML);
  }
  return blocks;
}

function mergeMarkup(document, id, base, latest, local) {
  const tokens = value => value.match(markupToken) || [];
  const merged = mergeTokens(tokens(base), tokens(latest), tokens(local)).join("");
  // A merge of two formatting edits must still be well-formed and retain its anchor.
  if (parseBlocks(document, merged).get(id) !== merged) throw new DraftMergeConflict();
  return merged;
}

function mergeBlocks(document, baseHTML, latestHTML, localHTML) {
  if (baseHTML === localHTML || latestHTML === localHTML) return latestHTML;
  if (baseHTML === latestHTML) return localHTML;
  const base = parseBlocks(document, baseHTML);
  const latest = parseBlocks(document, latestHTML);
  const local = parseBlocks(document, localHTML);
  for (const [id, previous] of base) {
    if ((!latest.has(id) && local.has(id) && local.get(id) !== previous) ||
        (!local.has(id) && latest.has(id) && latest.get(id) !== previous)) throw new DraftMergeConflict();
  }
  const order = mergeTokens([...base.keys()], [...latest.keys()], [...local.keys()]);
  if (new Set(order).size !== order.length) throw new DraftMergeConflict();
  return order.map(id => {
    const previous = base.get(id);
    const shared = latest.get(id);
    const yours = local.get(id);
    if (shared === yours || yours === previous || yours === undefined) return shared;
    if (shared === previous || shared === undefined) return yours;
    if (previous === undefined) throw new DraftMergeConflict();
    return mergeMarkup(document, id, previous, shared, yours);
  }).join("");
}

function mergeDraft(document, base, latest, local) {
  return {
    title: mergeTokens(Array.from(base.title), Array.from(latest.title), Array.from(local.title)).join(""),
    html: mergeBlocks(document, base.html, latest.html, local.html),
  };
}

function rebaseTextOffset(before, after, offset) {
  let shift = 0;
  for (const edit of tokenEdits(before.split(""), after.split(""))) {
    if (offset < edit.start) break;
    if (offset < edit.end) return edit.start + shift + Math.min(offset - edit.start, edit.tokens.length);
    shift += edit.tokens.length - (edit.end - edit.start);
  }
  return offset + shift;
}

return {DraftMergeConflict, mergeDraft, rebaseTextOffset};
})();
// Measure the sheets separately and lay the single native editor over them.
// Breaks change the spacing in that editor, while its text and blocks stay put.
const a4Break = "[data-a4-break]";
const a4PageStart = "[data-a4-page-start]";
const a4Gap = "--writing-a4-gap";

function installWritingA4(runtime) {
  const well = runtime.paper.closest(".page-well");
  const source = runtime.paper.closest(".page");
  const stage = element("div", undefined, "writing-a4-stage");
  const pages = element("div", undefined, "writing-a4-pages");
  pages.hidden = true;
  pages.setAttribute("role", "region");
  pages.setAttribute("aria-label", "A4 pages");
  well.insertBefore(stage, source);
  stage.append(source, pages);
  runtime.footnotes.dataset.a4Original = "";
  const state = runtime.a4 = {
    well, stage, pages, active: false, width: 0, frame: 0, caretFrame: 0, typingTimer: 0,
    signature: null, document: "", followCaret: false,
  };
  const {signal} = runtime.controller;
  for (const event of ["wheel", "pointerdown"]) {
    well.addEventListener(event, () => { state.followCaret = false; }, {passive: true, signal});
  }
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (state.width === width) return;
      state.width = width;
      stage.style.setProperty("--writing-well-width", `${width}px`);
      refreshWritingA4(runtime);
    });
    observer.observe(well);
    signal.addEventListener("abort", () => observer.disconnect(), {once: true});
  }
  document.fonts?.ready.then(() => {
    if (signal.aborted) return;
    state.signature = null;
    refreshWritingA4(runtime);
  });
  signal.addEventListener("abort", () => {
    cancelAnimationFrame(state.frame);
    cancelAnimationFrame(state.caretFrame);
    clearTimeout(state.typingTimer);
  }, {once: true});

}

function clearWritingA4Start(block) {
  block.removeAttribute("data-a4-page-start");
  block.style.removeProperty(a4Gap);
  if (!block.style.length) block.removeAttribute("style");
}

function stripWritingA4Layout(root) {
  for (const gap of root.querySelectorAll(a4Break)) gap.remove();
  for (const block of root.querySelectorAll(a4PageStart)) clearWritingA4Start(block);
}

function refreshWritingA4(runtime, immediate = false, followCaret = false, typing = false) {
  const state = runtime.a4;
  if (!state || runtime.composing) return;
  if (state.document !== runtime.docId) {
    if (state.caretFrame) cancelAnimationFrame(state.caretFrame);
    state.caretFrame = 0;
    state.document = runtime.docId;
    state.signature = null;
    state.followCaret = false;
    state.pages.replaceChildren();
    state.well.scrollTop = 0;
  }
  if (state.frame) cancelAnimationFrame(state.frame);
  state.frame = 0;
  clearTimeout(state.typingTimer);
  state.typingTimer = 0;
  const wasActive = state.active;
  state.active = Boolean(!runtime.compact && !runtime.continuous && runtime.docId);
  state.pages.hidden = !state.active;
  state.stage.classList.toggle("writing-a4-live", state.active);
  // Reveal a new line on the next frame, even while page layout is deferred
  // during a burst of typing or the draft is in continuous view.
  if (followCaret) state.followCaret = followCaret;
  if (followCaret === "insert" && !state.caretFrame) {
    state.caretFrame = requestAnimationFrame(() => {
      state.caretFrame = 0;
      if (!runtime.composing && !runtime.composingFootnote) followWritingA4Caret(runtime, !state.active);
    });
  }
  if (!state.active) {
    if (wasActive) stripWritingA4Layout(runtime.paper);
    state.signature = null;
    if (state.followCaret !== "insert") state.followCaret = false;
    return;
  }
  const paintNextFrame = () => {
    state.frame = requestAnimationFrame(() => {
      state.frame = 0;
      paintWritingA4(runtime);
    });
  };
  if (immediate) paintWritingA4(runtime);
  // The native editor remains visible while a burst of typing settles.
  // Commands and changes to page geometry still take the normal layout path.
  else if (typing) state.typingTimer = setTimeout(() => {
    state.typingTimer = 0;
    paintNextFrame();
  }, 180);
  else paintNextFrame();
}

function writingA4Boundary(block, node, offset) {
  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(node, offset);
  return writingProseRange(range).length;
}

// Prefer breaks after a word (or a hard line break), with a grapheme fallback
// for very long unbroken tokens. A marker is kept with the preceding word.
function writingA4Breaks(block) {
  const initial = {node: block, offset: 0, text: 0};
  const prose = writingProseText(block);
  const final = {node: block, offset: block.childNodes.length, text: prose.length};
  if (block.matches("hr, table")) return [initial, final];
  const result = [initial];
  let text = 0;
  let lastLeaf = null;
  let run = null;
  function add(node, offset, merge = false) {
    const point = {node, offset, text, run};
    if (merge && result.length > 1) result[result.length - 1] = point;
    else result.push(point);
  }
  function addText(node, offset) {
    run ||= {start: result.length - 1, end: null};
    add(node, offset);
  }
  function endRun() {
    if (run) run.end = result.length - 1;
    run = null;
  }
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.length) return;
      // Formatting and citation nodes can divide one word into text nodes.
      // They must not introduce a page-break opportunity inside that word.
      if (run && text && /\S/u.test(prose[text - 1]) &&
          prose[text - 1] !== "\u00ad" && /\S/u.test(node.data[0]) &&
          result.length > 1 && result[result.length - 1].text === text) result.pop();
      const start = text;
      for (const match of node.data.matchAll(/\s+|\u00ad/g)) {
        const offset = match.index + match[0].length;
        if (offset === node.length) break;
        text = start + offset;
        addText(node, offset);
        if (/[\r\n]/.test(match[0])) endRun();
      }
      text = start + node.length;
      addText(node, node.length);
      if (/[\r\n][^\S\r\n]*$/.test(node.data)) endRun();
      lastLeaf = node;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches(a4Break)) return;
    if (node.matches("[data-writing-footnote], br, hr")) {
      const parent = node.parentNode;
      const index = Array.prototype.indexOf.call(parent.childNodes, node);
      const marker = node.matches("[data-writing-footnote]");
      if (!marker) endRun();
      add(parent, index + 1, marker && lastLeaf && !lastLeaf.matches?.("br, hr"));
      lastLeaf = node;
      return;
    }
    const paragraph = node !== block && node.matches("p, div, h1, h2, h3, h4, h5, h6, blockquote, pre, li");
    if (paragraph) endRun();
    const previous = lastLeaf;
    for (const child of node.childNodes) visit(child);
    if (paragraph) {
      const parent = node.parentNode;
      const index = Array.prototype.indexOf.call(parent.childNodes, node);
      add(parent, index + 1, previous !== lastLeaf);
      endRun();
    }
  }
  visit(block);
  if (result.length > 1 && lastLeaf) result[result.length - 1] = final;
  else result.push(final);
  endRun();
  return result;
}

function writingA4Part(block, start, end) {
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  const copy = block.cloneNode(false);
  copy.classList.remove("jump-highlight", "writing-a4-citation");
  let content = range.cloneContents();
  // A range wholly inside a nested paragraph or formatted span omits its
  // ancestors. Retain those wrappers so line measurements use their styles.
  for (let ancestor = range.commonAncestorContainer; ancestor !== block; ancestor = ancestor.parentNode) {
    if (ancestor.nodeType !== Node.ELEMENT_NODE) continue;
    const wrapper = ancestor.cloneNode(false);
    wrapper.append(content);
    content = wrapper;
  }
  copy.append(content);
  if (copy.matches(a4PageStart)) clearWritingA4Start(copy);
  stripWritingA4Layout(copy);
  if (block.matches("ol, ul") && start.node !== block) {
    let item = start.node.nodeType === Node.ELEMENT_NODE ? start.node : start.node.parentElement;
    while (item && item.parentElement !== block) item = item.parentElement;
    if (item?.matches("li")) {
      const position = [...block.children].indexOf(item);
      if (block.matches("ol")) copy.start = (block.hasAttribute("start") ? block.start : 1) + position;
      copy.firstElementChild?.classList.add("writing-a4-continued-item");
    }
  } else if (block.matches("ol") && start.offset) {
    const position = [...block.childNodes].slice(0, start.offset).filter(node => node.localName === "li").length;
    copy.start = (block.hasAttribute("start") ? block.start : 1) + position;
  }
  return {node: copy, block, start};
}

function writingA4Characters(block, start, end) {
  // Normal text uses word boundaries. Build grapheme boundaries lazily only
  // when the next word is too wide/tall even on an otherwise blank page.
  let node = start.node.nodeType === Node.TEXT_NODE && start.offset < start.node.length ? start.node
    : end.node.nodeType === Node.TEXT_NODE ? end.node : null;
  if (!node) {
    const piece = document.createRange();
    piece.setStart(start.node, start.offset);
    piece.setEnd(end.node, end.offset);
    const walker = writingProseWalker(block);
    while ((node = walker.nextNode())) {
      if (node.length && node !== start.node && piece.intersectsNode(node)) break;
    }
  }
  if (node?.nodeType !== Node.TEXT_NODE) return [];
  const begin = node === start.node ? start.offset : 0;
  const finish = node === end.node ? end.offset : node.length;
  const text = node.data.slice(begin, finish);
  const segments = typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(text), entry => entry.segment)
    : Array.from(text);
  let offset = begin;
  const base = writingA4Boundary(block, node, begin);
  return segments.slice(0, -1).map(segment => {
    offset += segment.length;
    return {node, offset, text: base + offset - begin};
  });
}

function writingA4Sheet(mode) {
  const article = element("article", undefined, "writing-a4-sheet");
  const paper = element("div", undefined, "paper writing-a4-paper");
  const notes = element("section", undefined, "draft-footnotes writing-a4-notes");
  notes.dataset.mode = mode;
  notes.setAttribute("aria-label", "Reference footnotes on this page");
  const list = element("ol");
  notes.append(list);
  notes.hidden = true;
  article.append(paper, notes);
  return {article, paper, notes, list};
}

function writingA4FootnoteRows(paper, rows) {
  return [...paper.querySelectorAll("[data-writing-footnote]")].flatMap(marker => {
    const id = marker.dataset.writingFootnote;
    const saved = rows.get(id);
    if (!saved) return [];
    const row = saved.cloneNode(true);
    row.value = Number(marker.dataset.footnoteNumber);
    return [row];
  });
}

function writingA4Search(first, last, fits) {
  let best = first - 1;
  while (first <= last) {
    const middle = (first + last) >>> 1;
    if (fits(middle)) {
      best = middle;
      first = middle + 1;
    } else last = middle - 1;
  }
  return best;
}

function writingA4LastFit(first, last, fits) {
  // Bound the search near one sheet. An imported paragraph can contain
  // hundreds of pages, so avoid reflowing its entire remainder each time.
  let size = 96;
  let upper = Math.min(last, first + size - 1);
  let lower = first;
  while (fits(upper)) {
    if (upper === last) return last;
    lower = upper + 1;
    size *= 2;
    upper = Math.min(last, first + size - 1);
  }
  return writingA4Search(lower, upper - 1, fits);
}

function writingA4HasTwoLines(content, start = 0, end = writingProseText(content).length) {
  const first = writingA4BoundaryLine(content, start, true);
  const last = writingA4BoundaryLine(content, end, false);
  return Boolean(first && last && (last.top >= first.bottom || last.bottom <= first.top));
}

function writingA4BalancedBreak(boundaries, start, first, lastFit, hasPageContent, hasTwoLines) {
  const cut = boundaries[lastFit];
  const run = cut.run;
  if (!run || lastFit >= run.end) return lastFit;
  const beginning = Math.max(first - 1, run.start);
  const from = beginning >= first ? boundaries[beginning] : start;
  const end = boundaries[run.end];
  const canDefer = beginning >= first || hasPageContent;
  const long = (count, from, to) => count > 96 || to.text - from.text > 4096;
  const enough = index => hasTwoLines(from, boundaries[index]);
  if (!long(lastFit - beginning, from, cut) && !enough(lastFit)) return canDefer ? beginning : lastFit;
  if (long(run.end - lastFit, cut, end) || hasTwoLines(cut, end)) return lastFit;

  // A line left at the top of the next sheet should travel with one more
  // line. Only take that line if the earlier sheet still has two of its own.
  const lower = beginning + 1;
  const earlier = writingA4Search(lower, lastFit - 1, index => hasTwoLines(boundaries[index], end));
  if (earlier >= lower && enough(earlier)) return earlier;
  return canDefer ? beginning : lastFit;
}

function writingA4BoundaryLine(content, offset, after) {
  const doc = content.ownerDocument;
  const walker = writingProseWalker(content);
  let position = 0;
  let glyph = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const begin = Math.max(0, offset - position);
    const end = Math.min(node.length, offset - position);
    const text = after ? node.data.slice(begin) : node.data.slice(0, Math.max(0, end));
    const match = (after ? /\S/u : /\S(?=\s*$)/u).exec(text);
    if (match) {
      const index = (after ? begin : 0) + match.index;
      const segment = typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(node.data).containing(index)
        : {index, segment: match[0]};
      glyph = {node, start: segment.index, end: segment.index + segment.segment.length};
      if (after) break;
    }
    position += node.length;
    if (!after && position >= offset) break;
  }
  if (!glyph) return null;
  const range = doc.createRange();
  range.setStart(glyph.node, glyph.start);
  range.setEnd(glyph.node, glyph.end);
  return [...range.getClientRects()].find(rect => rect.width > 0 && rect.height > 0) || null;
}

function writingA4SameLine(left, right) {
  return Boolean(left && right && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top) + .5);
}

function writingA4CompleteLineBreak(boundaries, start, first, lastFit, hasPageContent, lineAt) {
  if (lastFit < first) return lastFit;
  const cut = boundaries[lastFit];
  const run = cut.run;
  if (!run || lastFit >= run.end) return lastFit;
  const beginning = Math.max(first - 1, run.start);
  const canDefer = beginning >= first || hasPageContent;
  const next = lineAt(cut, true);
  let complete = lastFit;
  if (writingA4SameLine(lineAt(cut, false), next)) {
    const lower = beginning + 1;
    const prior = writingA4Search(lower, lastFit - 1, index => {
      const before = lineAt(boundaries[index], false);
      return Boolean(before && before.bottom <= next.top + .5);
    });
    if (prior < lower) return canDefer ? beginning : lastFit;
    complete = prior;
  }
  const from = beginning >= first ? boundaries[beginning] : start;
  if (canDefer && writingA4SameLine(lineAt(from, true), lineAt(boundaries[complete], false))) return beginning;
  return complete;
}

function writingA4ExistingGap({node, offset}) {
  const before = node.nodeType === Node.TEXT_NODE ? offset === 0 && node.previousSibling : node.childNodes[offset - 1];
  const after = node.nodeType === Node.TEXT_NODE ? offset === node.length && node.nextSibling : node.childNodes[offset];
  return [before, after].find(candidate => candidate?.matches?.(a4Break));
}

function writingA4InsertGap(range) {
  const gap = element("span");
  gap.dataset.a4Break = "";
  gap.contentEditable = "false";
  gap.setAttribute("aria-hidden", "true");
  const {startContainer: node, startOffset: offset} = range;
  // Avoid splitting text nodes when the break is already at their edge.
  if (node.nodeType === Node.TEXT_NODE && offset === 0) node.before(gap);
  else if (node.nodeType === Node.TEXT_NODE && offset === node.length) node.after(gap);
  else range.insertNode(gap);
  return gap;
}

function alignWritingA4(runtime, turns) {
  const {paper} = runtime;
  const scale = runtime.a4.scale || 1;
  const margins = new Set();
  const breaks = new Set();
  const placements = turns.map(({part, paper: nextPage}) => {
    const {block, start} = part;
    if (start.node === block && start.offset === 0) {
      margins.add(block);
      return {margin: block, nextPage, block, start};
    }
    const existing = writingA4ExistingGap(start);
    if (existing) breaks.add(existing);
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.collapse(true);
    return {gap: existing, range, nextPage, block, start};
  });
  for (const gap of paper.querySelectorAll(a4Break)) if (!breaks.has(gap)) gap.remove();
  for (const block of paper.querySelectorAll(a4PageStart)) if (!margins.has(block)) clearWritingA4Start(block);
  // Work backwards so splitting a text node leaves earlier caret offsets valid.
  for (const placement of [...placements].reverse()) {
    if (!placement.margin && !placement.gap) placement.gap = writingA4InsertGap(placement.range);
  }
  // Each turn's displacement includes the previous turns, so size in order.
  const tops = placements.map(({nextPage}) => nextPage.getBoundingClientRect().top);
  for (const [index, {margin, gap, nextPage, block, start}] of placements.entries()) {
    if (margin) {
      const current = parseFloat(getComputedStyle(margin).marginBlockStart) || 0;
      const offset = (tops[index] - margin.getBoundingClientRect().top) / scale;
      margin.dataset.a4PageStart = "";
      margin.style.setProperty(a4Gap, `${Math.max(0, current + offset)}px`);
    } else {
      const bounds = gap.getBoundingClientRect();
      const offset = (bounds.height + tops[index] - bounds.bottom) / scale;
      gap.style.setProperty(a4Gap, `${Math.max(0, offset)}px`);
    }
    // A continued nested paragraph can have different margins in its clone.
    // Match the actual text line after placing the page's box.
    const actual = writingA4BoundaryLine(block, start.text, true);
    const target = writingA4BoundaryLine(nextPage, 0, true);
    if (actual && target) {
      const node = margin || gap;
      const current = margin ? parseFloat(getComputedStyle(margin).marginBlockStart) || 0
        : gap.getBoundingClientRect().height / scale;
      node.style.setProperty(a4Gap, `${Math.max(0, current + (target.top - actual.top) / scale)}px`);
    }
  }
  runtime.a4.layoutNodes = placements.map(({gap, margin}) => gap || margin);
}

function writingA4CaretRect(range, afterInsertion) {
  const usable = rect => Number.isFinite(rect.top) && Number.isFinite(rect.bottom) && rect.bottom > rect.top;
  const native = [...range.getClientRects()].find(usable);
  if (native || !afterInsertion) return native;

  // A newly wrapped line can briefly have no collapsed range rectangle.
  // Measure its adjacent character or line break, never its enclosing block.
  const {startContainer, startOffset} = range;
  const inText = startContainer.nodeType === Node.TEXT_NODE;
  const after = !inText && startContainer.childNodes[startOffset];
  let node = inText ? startContainer : after || startContainer.childNodes[startOffset - 1];
  const forward = inText ? startOffset === 0 : Boolean(after);
  while (node?.matches?.(a4Break) || (node?.nodeType === Node.TEXT_NODE && !node.length)) {
    node = forward ? node.nextSibling : node.previousSibling;
  }
  if (node?.localName === "br") {
    const line = node.getBoundingClientRect();
    if (usable(line)) return line;
  }
  if (node?.nodeType !== Node.TEXT_NODE || !node.length) return;
  const offset = node === startContainer ? startOffset : forward ? 0 : node.length;
  const start = Math.max(0, offset - 1);
  const glyph = range.cloneRange();
  glyph.setStart(node, start);
  glyph.setEnd(node, start + 1);
  return [...glyph.getClientRects()].find(usable);
}

function followWritingA4Caret(runtime, consume = true) {
  const {a4: state, paper} = runtime;
  const request = state.followCaret;
  if (consume) state.followCaret = false;
  if (!request) return;
  if (!paper.matches(":focus")) return;
  const range = writingSelectionRange(paper);
  if (!range?.collapsed) return;
  const caret = writingA4CaretRect(range, request === "insert");
  if (!caret) return;
  const viewport = state.well.getBoundingClientRect();
  const top = viewport.top + writingViewportInset(state.well);
  const margin = 32;
  const bottomClearance = request === "insert" ? Math.max(margin, (viewport.bottom - top) * .32) : margin;
  if (caret.bottom > viewport.bottom - bottomClearance) state.well.scrollTop += caret.bottom - viewport.bottom + bottomClearance;
  else if (caret.top < top + margin) state.well.scrollTop += caret.top - top - margin;
}

function paintWritingA4(runtime) {
  const state = runtime.a4;
  if (!state?.active || state.pages.hidden || runtime.composing || runtime.composingFootnote) return;
  const {pages, stage} = state;
  const scale = state.scale || 1;
  const mode = runtime.footnotes.dataset.mode;
  const box = pages.getBoundingClientRect();
  if (!box.width) return;
  const width = box.width / scale;
  stage.style.setProperty("--writing-a4-width", `${width}px`);
  stage.style.setProperty("--writing-a4-left", `${(box.left - stage.getBoundingClientRect().left) / scale}px`);
  const clean = runtime.paper.cloneNode(true);
  stripWritingA4Layout(clean);
  const signature = JSON.stringify([runtime.docId, clean.innerHTML, runtime.footnoteList.innerHTML, mode, width, scale]);
  if (signature === state.signature && state.layoutNodes.every(node => runtime.paper.contains(node))) {
    followWritingA4Caret(runtime);
    return;
  }
  const prior = [...pages.children].find(page => page.getBoundingClientRect().bottom > state.well.getBoundingClientRect().top);
  const priorOffset = prior && prior.getBoundingClientRect().top - state.well.getBoundingClientRect().top;
  const priorIndex = prior && [...pages.children].indexOf(prior);
  const rows = new Map([...runtime.footnoteList.children].map(row => [row.dataset.footnoteId, row]));
  const assembled = document.createDocumentFragment();
  const turns = [];
  let firstPart = null;
  const sheet = writingA4Sheet(mode);
  sheet.article.classList.add("writing-a4-probe");
  sheet.article.setAttribute("aria-hidden", "true");
  sheet.article.inert = true;
  pages.append(sheet.article);
  function paintRows() {
    if (!rows.size) return;
    const pageRows = writingA4FootnoteRows(sheet.paper, rows);
    sheet.list.replaceChildren(...pageRows);
    sheet.notes.hidden = !pageRows.length;
  }

  let space;
  function fits() {
    paintRows();
    if (space === undefined) {
      const sheetBox = sheet.article.getBoundingClientRect();
      const styles = getComputedStyle(sheet.article);
      space = sheetBox.height / scale - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom) -
        parseFloat(styles.borderTopWidth) - parseFloat(styles.borderBottomWidth);
    }
    const used = (sheet.paper.getBoundingClientRect().height +
      (sheet.notes.hidden ? 0 : sheet.notes.getBoundingClientRect().height)) / scale;
    return used <= space + 0.5;
  }

  function finish(oversized = false) {
    const next = writingA4Sheet(mode);
    next.article.setAttribute("aria-label", `Page ${assembled.childElementCount + 1}`);
    next.article.classList.toggle("writing-a4-oversized", oversized);
    next.paper.append(...sheet.paper.children);
    if (assembled.childElementCount && firstPart) turns.push({part: firstPart, paper: next.paper});
    firstPart = null;
    next.paper.inert = true;
    next.paper.setAttribute("aria-hidden", "true");
    next.list.append(...sheet.list.children);
    next.notes.hidden = !next.list.childElementCount;
    assembled.append(next.article);
  }

  function commit(part) {
    firstPart ||= part;
    sheet.paper.append(part.node);
  }

  try {
    for (const block of runtime.paper.children) {
      const boundaries = writingA4Breaks(block);
      const last = boundaries.length - 1;
      let start = boundaries[0];
      let first = 1;
      while (first <= last) {
        let fittedEnd;
        function test(candidate) {
          const part = writingA4Part(block, start, candidate);
          sheet.paper.append(part.node);
          const acceptable = fits();
          part.node.remove();
          if (acceptable && candidate === boundaries[last]) fittedEnd = part;
          return acceptable;
        }

        let lastFit = writingA4LastFit(first, last, index => test(boundaries[index]));
        if (lastFit === last) {
          commit(fittedEnd);
          break;
        }
        if (lastFit >= first) {
          // Compose a little beyond the fitted text before choosing a break.
          // Reflowing a suffix alone can turn half a line into a second line.
          const hasPageContent = Boolean(sheet.paper.childElementCount);
          const probe = writingA4Part(block, start, boundaries[Math.min(last, lastFit + 96)]);
          sheet.paper.append(probe.node);
          let balanced;
          try {
            const lineAt = (point, after) => writingA4BoundaryLine(probe.node, point.text - start.text, after);
            const complete = writingA4CompleteLineBreak(boundaries, start, first, lastFit, hasPageContent, lineAt);
            balanced = complete < first ? complete : writingA4BalancedBreak(
              boundaries, start, first, complete, hasPageContent,
              (from, to) => writingA4HasTwoLines(probe.node, from.text - start.text, to.text - start.text),
            );
            balanced = writingA4CompleteLineBreak(boundaries, start, first, balanced, hasPageContent, lineAt);
          } finally {
            probe.node.remove();
          }
          if (balanced < first || (balanced !== lastFit && test(boundaries[balanced]))) lastFit = balanced;
        }
        if (lastFit >= first) {
          commit(writingA4Part(block, start, boundaries[lastFit]));
          paintRows();
          finish();
          start = boundaries[lastFit];
          first = lastFit + 1;
        } else if (sheet.paper.childElementCount) {
          paintRows();
          finish();
        } else {
          const extra = writingA4Characters(block, start, boundaries[first]);
          const lastCharacter = writingA4Search(0, extra.length - 1, index => test(extra[index]));
          if (lastCharacter >= 0) {
            commit(writingA4Part(block, start, extra[lastCharacter]));
            paintRows();
            finish();
            start = extra[lastCharacter];
          } else {
            // A table or very long full-text note may itself be taller than
            // A4. Keep it readable and on the same sheet as its citation.
            commit(writingA4Part(block, start, boundaries[first]));
            const oversized = !fits();
            finish(oversized);
            start = boundaries[first++];
          }
        }
      }
    }
    if (sheet.paper.childElementCount || !assembled.childElementCount) {
      paintRows();
      finish();
    }
    const restoreFootnote = writingA4FootnoteFocus(pages, state.well);
    const selection = state.followCaret === "insert" && writingSelectionRange(runtime.paper);
    const caret = selection?.collapsed &&
      writingHistoryPoint(runtime.paper, selection.startContainer, selection.startOffset);
    runtime.replacingFootnoteFields = true;
    try {
      pages.replaceChildren(assembled);
      alignWritingA4(runtime, turns);
      if (caret?.blockId && runtime.paper.matches(":focus")) {
        const range = writingSelectionRange(runtime.paper);
        const live = range?.collapsed && writingHistoryPoint(runtime.paper, range.startContainer, range.startOffset);
        if (live?.blockId !== caret.blockId || live?.position !== caret.position) {
          const point = writingHistoryBoundary(runtime, caret);
          if (point) {
            const restored = document.createRange();
            restored.setStart(...point);
            restored.collapse(true);
            restoreSelection(runtime, restored);
          }
        }
      }
      state.signature = signature;
      const current = priorIndex == null ? null : pages.children[Math.min(priorIndex, pages.children.length - 1)];
      if (current && priorOffset !== false && priorOffset !== undefined) {
        state.well.scrollTop += current.getBoundingClientRect().top - state.well.getBoundingClientRect().top - priorOffset;
      }
      if (restoreFootnote) restoreFootnote();
      else followWritingA4Caret(runtime);
    } finally {
      runtime.replacingFootnoteFields = false;
    }
  } finally {
    sheet.article.remove();
  }
}

function writingA4FootnoteFocus(pages, well) {
  const field = pages.getRootNode().activeElement;
  if (!field?.dataset?.footnoteNote || !pages.contains(field)) return null;
  const {footnoteNote} = field.dataset;
  const position = footnoteNoteSelection(field);
  const top = field.getBoundingClientRect().top;
  return () => {
    const replacement = pages.querySelector(`[data-footnote-note="${CSS.escape(footnoteNote)}"]`);
    if (!replacement) return;
    restoreFootnoteNoteSelection(replacement, position);
    well.scrollTop += replacement.getBoundingClientRect().top - top;
  };
}

function writingViewportInset(well) {
  return parseFloat(well.style?.getPropertyValue("--studio-scroll-inset")) || 0;
}

function scrollWritingA4Context(well, origin) {
  const inset = writingViewportInset(well);
  const margin = Math.min(140, Math.max(0, well.clientHeight - inset) * .22);
  const top = well.scrollTop + origin.top - well.getBoundingClientRect().top - inset - margin;
  well.scrollTo({top: Math.max(0, top), behavior: "auto"});
}

function revealWritingA4(runtime, blockId, reference) {
  const state = runtime.a4;
  if (!state?.active) return false;
  refreshWritingA4(runtime, true);
  const marker = reference && [...runtime.paper.querySelectorAll("[data-writing-footnote]")]
    .find(node => node.dataset.writingFootnote === reference.id);
  const block = findBlock(runtime, blockId);
  if (!marker && !block) return false;

  // Keep the citation in view when its quotation starts on an earlier sheet.
  const highlight = marker || block;
  let origin = highlight.getBoundingClientRect();
  const quote = reference && referenceRange(runtime, reference);
  const firstLine = quote && [...quote.getClientRects()].find(rect => rect.height > 0);
  if (firstLine && origin.top - firstLine.top < state.well.clientHeight * .62) origin = firstLine;
  scrollWritingA4Context(state.well, origin);
  highlight.classList.add("writing-a4-citation");
  clearTimeout(runtime.highlightTimer);
  runtime.highlightTimer = setTimeout(() => highlight.classList.remove("writing-a4-citation"), 2100);
  return true;
}

// The editor's pagination and paragraph commands can replace DOM nodes used
// by native undo. Keep one history for the editable draft and its footnotes.
const writingHistorySteps = 60;
const writingHistoryBudget = 8_000_000;
const writingHistoryGroupWindow = 700;
const writingHistoryGroupedEdits = new Set(["insertText", "deleteContentBackward", "deleteContentForward"]);

function writingHistoryDecoration(node) {
  return node.matches?.("[data-a4-break], [data-writing-footnote]");
}

function writingHistoryLength(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.length;
  if (writingHistoryDecoration(node)) return 0;
  if (node.localName === "br") return 1;
  return [...node.childNodes].reduce((length, child) => length + writingHistoryLength(child), 0);
}

function writingHistoryPoint(paper, node, offset) {
  if (node === paper) return {paperOffset: offset};
  const marker = node.closest?.("[data-writing-footnote]") || node.parentElement?.closest("[data-writing-footnote]");
  if (marker) {
    node = marker.parentNode;
    offset = Array.prototype.indexOf.call(node.childNodes, marker) + Number(offset > 0);
  }
  const block = topBlock(paper, node);
  if (!block?.dataset.blockId) return null;
  // Count explicit line breaks as well as text so an empty line or a caret at
  // the start of a new line can round-trip through the saved markup.
  let position = node.nodeType === Node.TEXT_NODE ? offset :
    [...node.childNodes].slice(0, offset).reduce((length, child) => length + writingHistoryLength(child), 0);
  for (let current = node; current !== block; current = current.parentNode) {
    for (let sibling = current.previousSibling; sibling; sibling = sibling.previousSibling) {
      position += writingHistoryLength(sibling);
    }
  }
  return {blockId: block.dataset.blockId, position, forward: offset === 0};
}

function writingHistoryBookmark(runtime, range) {
  if (!rangeInPaper(runtime.paper, range)) return null;
  const start = writingHistoryPoint(runtime.paper, range.startContainer, range.startOffset);
  const end = range.collapsed ? start : writingHistoryPoint(runtime.paper, range.endContainer, range.endOffset);
  if (!start || !end) return null;
  const selection = selectionFor(runtime.paper);
  const reversed = !range.collapsed && selection?.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
  return {start, end, collapsed: range.collapsed, reversed};
}

function writingHistoryBoundary(runtime, point) {
  if (point.paperOffset !== undefined) return [runtime.paper, Math.min(point.paperOffset, runtime.paper.childNodes.length)];
  const block = findBlock(runtime, point.blockId);
  if (!block) return null;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (writingHistoryDecoration(node)) return NodeFilter.FILTER_REJECT;
      if (node.nodeType === Node.TEXT_NODE || node.localName === "br") return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    },
  });
  let remaining = point.position;
  let last = [block, 0];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const size = writingHistoryLength(node);
    if (node.nodeType === Node.TEXT_NODE) {
      if (!size) continue;
      if (remaining < size) return [node, remaining];
      last = [node, size];
    } else {
      const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
      if (remaining === 0) return [node.parentNode, index];
      last = [node.parentNode, index + 1];
    }
    remaining -= size;
    if (remaining === 0 && !point.forward) return last;
  }
  return last;
}

function restoreWritingHistoryBookmark(runtime, bookmark) {
  const start = bookmark && writingHistoryBoundary(runtime, bookmark.start);
  const end = bookmark && writingHistoryBoundary(runtime, bookmark.end);
  if (!start || !end) {
    runtime.range = null;
    restoreSelection(runtime);
    return;
  }
  const range = document.createRange();
  range.setStart(...start);
  range.setEnd(...end);
  restoreSelection(runtime, range);
  if (bookmark.reversed) selectionFor(runtime.paper)?.setBaseAndExtent?.(...end, ...start);
}

function resetWritingHistory(runtime) {
  runtime.editHistory = runtime.docId ? {
    documentId: runtime.docId, current: {html: capture(runtime).html, bookmark: null, positions: writingHistoryPositions(runtime)},
    undo: [], redo: [], pending: null, group: null, replaying: false,
  } : null;
}

function writingHistoryPositions(runtime) {
  const positions = {};
  if (runtime.references?.some(reference => reference.id)) {
    footnotePositions(runtime, null, positions, {compareSaved: false});
  }
  return positions;
}

function restoreWritingFootnotePositions(runtime, positions) {
  const references = new Map((runtime.references || []).map(reference => [reference.id, reference]));
  const placed = Object.entries(positions || {}).filter(([identity]) => references.has(identity));
  if (!placed.length) return;
  const existing = new Map([...runtime.paper.querySelectorAll("[data-writing-footnote]")]
    .map(marker => [marker.dataset.writingFootnote, marker]));
  // Insert equal-offset markers in reverse order so their saved order survives.
  for (const [identity, [blockId, position, order]] of placed.sort((left, right) => right[1][2] - left[1][2])) {
    const point = writingHistoryBoundary(runtime, {blockId, position, forward: false});
    if (!point) continue;
    const anchor = document.createRange();
    anchor.setStart(...point);
    anchor.collapse(true);
    anchor.insertNode(existing.get(identity) || footnoteMarker(references.get(identity), order));
  }
}

function beginWritingEdit(runtime, kind = "", range = writingSelectionRange(runtime.paper) || runtime.range) {
  const history = runtime.editHistory;
  if (!history || history.replaying) return;
  const pending = {kind, bookmark: writingHistoryBookmark(runtime, range)};
  if (runtime.references?.length) {
    const positions = {};
    const changed = footnotePositions(runtime, null, positions);
    pending.footnotes = {positions, changed};
  }
  history.pending = pending;
  // Cancelled beforeinput events should not lend their caret to a later edit.
  if (kind !== "composition") setTimeout(() => {
    if (history.pending === pending) history.pending = null;
  }, 0);
}

function sameWritingHistoryCaret(left, right) {
  return left?.collapsed && right?.collapsed &&
    left.start.blockId === right.start.blockId && left.start.position === right.start.position &&
    left.start.paperOffset === right.start.paperOffset && left.start.forward === right.start.forward;
}

function rememberWritingEdit(runtime, removed = []) {
  const history = runtime.editHistory;
  if (!history || history.documentId !== runtime.docId || history.replaying) return;
  const pending = history.pending;
  history.pending = null;
  const html = capture(runtime).html;
  const positions = writingHistoryPositions(runtime);
  const deletingFootnotes = removed.length > 0;
  const movingFootnotes = pending?.kind === "moveFootnote" &&
    JSON.stringify(pending.footnotes?.positions || {}) !== JSON.stringify(positions);
  if (html === history.current.html && !deletingFootnotes && !movingFootnotes) return;

  const now = performance.now();
  const before = pending?.bookmark || history.current.bookmark;
  const kind = pending?.kind;
  const groupable = !deletingFootnotes && writingHistoryGroupedEdits.has(kind) && before?.collapsed;
  const group = history.group;
  if (!groupable || group?.kind !== kind || now - group.at > writingHistoryGroupWindow ||
      !sameWritingHistoryCaret(before, history.current.bookmark)) {
    const entry = {...history.current, bookmark: before,
      positions: pending?.footnotes?.positions || history.current.positions};
    if (deletingFootnotes) {
      const beforeNotes = pending?.footnotes;
      const afterPositions = {};
      footnotePositions(runtime, null, afterPositions, {compareSaved: false});
      const restorePositions = {...beforeNotes?.changed};
      const deletePositions = {};
      for (const [identity, location] of Object.entries(beforeNotes?.positions || {})) {
        const after = afterPositions[identity];
        if (after && (location[0] !== after[0] || location[1] !== after[1])) {
          restorePositions[identity] = location;
          deletePositions[identity] = after;
        }
      }
      entry.footnotes = {ids: removed, restore: true, restorePositions, deletePositions};
      history.deletion = {entry, redo: [...history.redo], unchangedBody: html === history.current.html};
    } else if (movingFootnotes) {
      entry.footnotes = {
        clipboard: true, removed: [], restored: [], positions: entry.positions || {}, inversePositions: positions,
      };
    }
    history.undo.push(entry);
  }
  history.redo.length = 0;
  history.current = {html, bookmark: writingHistoryBookmark(runtime, writingSelectionRange(runtime.paper) || runtime.range),
    positions};
  history.group = groupable ? {kind, at: now} : null;
  trimWritingHistory(history);
}

function trimWritingHistory(history) {
  let size = history.current.html.length + history.undo.reduce((total, entry) => total + entry.html.length, 0);
  while (history.undo.length > writingHistorySteps || (size > writingHistoryBudget && history.undo.length > 1)) {
    size -= history.undo.shift().html.length;
  }
}

function recordWritingClipboardEdit(runtime, before, after, {added = [], removed = []}) {
  const history = runtime.editHistory;
  if (!history || history.documentId !== runtime.docId || history.replaying ||
      (before.html === after.html && !added.length && !removed.length)) return;
  const entry = {html: before.html, bookmark: before.bookmark, positions: structuredClone(before.positions || {})};
  if (added.length || removed.length) {
    entry.footnotes = {
      clipboard: true, removed: [...added], restored: [...removed],
      positions: structuredClone(before.positions || {}), inversePositions: structuredClone(after.positions || {}),
    };
  }
  history.undo.push(entry);
  history.redo.length = 0;
  history.pending = null;
  history.group = null;
  history.current = {html: after.html, bookmark: after.bookmark, positions: structuredClone(after.positions || {})};
  trimWritingHistory(history);
}

function acknowledgeWritingFootnoteDeletion(runtime, success) {
  const history = runtime.editHistory;
  const deletion = history?.deletion;
  if (!deletion) return;
  history.deletion = null;
  if (success) return;
  delete deletion.entry.footnotes;
  if (deletion.unchangedBody) {
    history.undo = history.undo.filter(entry => entry !== deletion.entry);
    history.redo = deletion.redo;
  }
}

function acknowledgeWritingFootnoteHistory(runtime, ack, snapshot) {
  const history = runtime.editHistory;
  const replay = history?.footnoteReplay;
  if (history) history.footnoteReplay = null;
  if (ack.error) return;
  runtime.paper.replaceChildren(safeFragment(snapshot.html, true));
  runtime.blocks = new Map([...runtime.paper.children].map(block => [block.dataset.blockId, blockText(block)]));
  runtime.snapshot = null;
  if (!replay) return;
  const {next, from, to} = replay;
  from.pop();
  const notes = next.footnotes;
  const inverse = notes.clipboard ? {
    ...notes, removed: notes.restored, restored: notes.removed,
    positions: notes.inversePositions, inversePositions: notes.positions,
  } : {...notes, restore: !notes.restore};
  to.push({...history.current, footnotes: inverse});
  history.current = {html: snapshot.html, bookmark: next.bookmark, positions: next.positions || {}};
  // The acknowledgement also brings the restored markers. Wait until those
  // are painted before locating the caret in the authored text.
  const {docId} = runtime;
  requestAnimationFrame(() => {
    if (!runtime.pending && runtime.docId === docId && runtime.root.isConnected) {
      restoreWritingHistoryBookmark(runtime, next.bookmark);
    }
  });
}

function applyWritingHistory(runtime, direction, nativeChanged = false) {
  const history = runtime.editHistory;
  if (!history || history.documentId !== runtime.docId || history.replaying || runtime.composing ||
      runtime.paper.contentEditable !== "true") return false;
  const from = direction === "redo" ? history.redo : history.undo;
  const to = direction === "redo" ? history.undo : history.redo;
  const next = from.at(-1);
  if (!next && !nativeChanged) return true;

  const target = next || history.current;
  history.pending = null;
  history.group = null;
  if (target.footnotes) {
    if (nativeChanged) {
      runtime.paper.replaceChildren(safeFragment(history.current.html, true));
      restoreWritingFootnotePositions(runtime, history.current.positions);
      runtime.snapshot = null;
      updatePaper(runtime);
    }
    if (runtime.pending || runtime.queued || runtime.collaboration && !canChangeFootnotes(runtime)) {
      status(runtime, "Wait for the current draft save, then undo or redo the footnote.");
      return true;
    }
    const notes = target.footnotes;
    const changes = notes.clipboard ? {
      removed_footnotes: notes.removed, restored_footnotes: notes.restored, footnote_positions: notes.positions,
    } : notes.restore ? {restored_footnotes: notes.ids, footnote_positions: notes.restorePositions} :
      {removed_footnotes: notes.ids, footnote_positions: notes.deletePositions};
    history.footnoteReplay = {next, from, to};
    send(runtime, "history-footnotes", changes, {...capture(runtime), html: target.html});
    return true;
  }
  history.replaying = true;
  try {
    runtime.paper.replaceChildren(safeFragment(target.html, true));
    restoreWritingFootnotePositions(runtime, target.positions);
    restoreWritingHistoryBookmark(runtime, target.bookmark);
    markEdited(runtime, true);
    if (next) {
      from.pop();
      to.push(history.current);
    }
    history.current = {html: capture(runtime).html, bookmark: target.bookmark, positions: writingHistoryPositions(runtime)};
  } finally {
    history.replaying = false;
  }
  return true;
}

function writingHistoryDirection(event) {
  if (event.inputType === "historyUndo") return "undo";
  if (event.inputType === "historyRedo") return "redo";
  return "";
}

function writingHistoryBeforeInput(runtime, event, range = writingSelectionRange(runtime.paper) || runtime.range) {
  const history = runtime.editHistory;
  if (!history || history.replaying || event.defaultPrevented || runtime.composing || event.isComposing) return;
  const direction = writingHistoryDirection(event);
  if (direction) {
    if (event.cancelable && applyWritingHistory(runtime, direction)) event.preventDefault();
  } else if (!history.pending) beginWritingEdit(runtime, event.inputType, range);
}

function writingHistoryInput(runtime, event) {
  const direction = writingHistoryDirection(event);
  return Boolean(direction && applyWritingHistory(runtime, direction, true));
}

function writingHistoryKey(runtime, event) {
  if (event.defaultPrevented || event.isComposing || runtime.composing || runtime.composingFootnote ||
      event.altKey || !writingPrimaryShortcut(event)) return false;
  const key = event.key.toLowerCase();
  const direction = key === "z" ? (event.shiftKey ? "redo" : "undo") : key === "y" && event.ctrlKey ? "redo" : "";
  if (!direction || !applyWritingHistory(runtime, direction)) return false;
  event.preventDefault();
  return true;
}

const writingFindBoundary = "p,div,h1,h2,h3,h4,h5,h6,blockquote,pre,li,td,th,br,hr";
const writingFindWidget = "[contenteditable=false],[data-a4-break],[data-writing-footnote]";

function writingFindSegments(paper) {
  const segments = [];
  let text = "";
  let runs = [];
  function finish() {
    if (!runs.length) return;
    segments.push({text, runs});
    text = "";
    runs = [];
  }
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE && node.length) {
      runs.push({node, offset: text.length});
      text += node.data;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches(writingFindWidget)) return;
    const boundary = node.matches(writingFindBoundary);
    if (boundary) finish();
    for (const child of node.childNodes) visit(child);
    if (boundary) finish();
  }
  for (const block of paper.childNodes) {
    visit(block);
    finish();
  }
  return segments;
}

function writingFindPattern(query, exactCase) {
  return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), exactCase ? "gu" : "giu");
}

function writingFindMatches(paper, query, exactCase) {
  if (!query) return [];
  const pattern = writingFindPattern(query, exactCase);
  const matches = [];
  for (const {text, runs} of writingFindSegments(paper)) {
    let firstRun = 0;
    for (const found of text.matchAll(pattern)) {
      const end = found.index + found[0].length;
      while (runs[firstRun].offset + runs[firstRun].node.length <= found.index) firstRun += 1;
      const slices = [];
      for (let index = firstRun; index < runs.length && runs[index].offset < end; index += 1) {
        const {node, offset} = runs[index];
        slices.push({node, start: Math.max(0, found.index - offset), end: Math.min(node.length, end - offset)});
      }
      matches.push(slices);
    }
  }
  return matches;
}

function replaceWritingFindMatch(match, value) {
  // Edit only authored text. A single match may straddle styled runs or a
  // footnote marker without deleting the surrounding markup or widgets.
  for (let index = match.length - 1; index >= 0; index -= 1) {
    const {node, start, end} = match[index];
    node.replaceData(start, end - start, index === 0 ? value : "");
  }
}

function writingFindRange(match) {
  if (!match?.length) return null;
  const first = match[0];
  const last = match.at(-1);
  const range = document.createRange();
  range.setStart(first.node, first.start);
  range.setEnd(last.node, last.end);
  return range;
}

function paintWritingFindMatch(runtime, reveal = false) {
  const state = runtime.find;
  if (!state.mode) return;
  const match = state.matches[state.index];
  const rects = [];
  for (const slice of match || []) {
    if (!runtime.paper.contains(slice.node) || slice.end > slice.node.length) continue;
    const range = writingFindRange([slice]);
    rects.push(...range.getClientRects());
  }
  const well = runtime.a4.well;
  const viewport = well.getBoundingClientRect();
  const wellTop = viewport.top + writingViewportInset(well);
  const panelBottom = state.mode === "local" ? state.panel.getBoundingClientRect().bottom : viewport.top;
  const visibleTop = Math.max(wellTop, panelBottom);
  if (reveal && rects.length && (rects[0].top < visibleTop + 12 || rects[0].bottom > viewport.bottom - 35)) {
    scrollWritingA4Context(well, rects[0]);
    paintWritingFindMatch(runtime);
    return;
  }
  const origin = state.overlay.getBoundingClientRect();
  const highlights = [];
  for (const rect of rects) {
    const left = Math.max(rect.left, viewport.left);
    const top = Math.max(rect.top, wellTop);
    const width = Math.min(rect.right, viewport.right) - left;
    const height = Math.min(rect.bottom, viewport.bottom) - top;
    if (width <= 0 || height <= 0) continue;
    const highlight = element("span");
    Object.assign(highlight.style, {
      left: `${left - origin.left}px`, top: `${top - origin.top}px`,
      width: `${width}px`, height: `${height}px`,
    });
    highlights.push(highlight);
  }
  state.overlay.replaceChildren(...highlights);
}

function writingFindCanReplace(runtime) {
  return runtime.paper.contentEditable === "true" && !runtime.clipboardDialog.open &&
    !runtime.composing && !runtime.composingFootnote;
}

function writingFindStatus(runtime) {
  const state = runtime.find;
  return {query: state.query.value, count: state.matches.length, index: state.matches.length ? state.index : -1,
    caseSensitive: state.exactCase, canReplace: writingFindCanReplace(runtime)};
}

function refreshWritingFind(runtime, index = runtime.find.index, reveal = false, wrap = false) {
  const state = runtime.find;
  state.matches = writingFindMatches(runtime.paper, state.query.value, state.exactCase);
  const count = state.matches.length;
  state.index = count && wrap ? ((index % count) + count) % count : Math.min(Math.max(0, index), Math.max(0, count - 1));
  state.count.textContent = count ? `${state.index + 1} of ${count}` : state.query.value ? "No matches" : "";
  state.previous.disabled = state.next.disabled = count < 2;
  state.replace.disabled = state.replaceAll.disabled = count === 0 || !writingFindCanReplace(runtime);
  paintWritingFindMatch(runtime, reveal);
  return writingFindStatus(runtime);
}

function closeWritingFind(runtime, returnToDraft = true) {
  const state = runtime.find;
  if (!state?.mode) return;
  if (returnToDraft) refreshWritingFind(runtime);
  const match = state.matches[state.index];
  state.mode = null;
  state.panel.hidden = true;
  state.overlay.replaceChildren();
  state.observer.disconnect();
  if (returnToDraft && runtime.docId === state.documentId && runtime.paper.contentEditable === "true") {
    const range = writingFindRange(match) || state.initialRange;
    if (rangeInPaper(runtime.paper, range)) restoreSelection(runtime, range);
    else restoreSelection(runtime);
    rememberSelection(runtime);
  }
  state.matches = [];
  state.initialRange = null;
  state.recheck = false;
}

function startWritingFind(runtime, mode, reuseQuery = false) {
  const state = runtime.find;
  if (!state || !runtime.docId || runtime.clipboardDialog.open) return false;
  if (state.documentId !== runtime.docId || (state.mode && state.mode !== mode)) closeWritingFind(runtime, false);
  if (state.mode) return writingFindStatus(runtime);
  rememberSelection(runtime);
  state.documentId = runtime.docId;
  state.initialRange = runtime.range?.cloneRange();
  const selection = state.initialRange?.toString();
  if (!reuseQuery && selection && selection.length <= 500 && !selection.includes("\n")) state.query.value = selection;
  state.mode = mode;
  state.panel.hidden = mode !== "local";
  state.notice.textContent = "";
  state.observer.observe(runtime.paper, {subtree: true, characterData: true, childList: true,
    attributes: true, attributeFilter: ["contenteditable"]});
  return refreshWritingFind(runtime, 0, true);
}

function openWritingFind(runtime, showReplace = false, reuseQuery = false) {
  const state = runtime.find;
  if (showReplace && state) {
    state.replaceRow.hidden = false;
    state.expand.setAttribute("aria-expanded", "true");
  }
  if (startWritingFind(runtime, "local", reuseQuery) === false) return false;
  state.query.focus({preventScroll: true});
  state.query.select();
  return true;
}

function requestWritingFind(runtime, options = {}) {
  const doc = runtime.paper.ownerDocument;
  return !doc.dispatchEvent(new doc.defaultView.CustomEvent("care-find-request", {cancelable: true,
    detail: {path: [runtime.paper], ...options}}));
}

function writingFindShortcut(runtime, event) {
  const key = String(event.key || "").toLowerCase();
  const controlFind = key === "f" && event.ctrlKey && !event.metaKey && !event.shiftKey &&
    !event.getModifierState?.("AltGraph");
  if (event.defaultPrevented || (!controlFind && !writingPrimaryShortcut(event)) || event.altKey || event.isComposing ||
      runtime.composing || runtime.composingFootnote || !runtime.docId || runtime.clipboardDialog.open) return false;
  const target = writingShortcutTarget(runtime, event);
  if (!target) return false;
  const field = target.closest("input, textarea, select, [contenteditable=true], [contenteditable=plaintext-only]");
  if (field && field !== runtime.paper && !runtime.paper.contains(field) && field !== runtime.title &&
      !runtime.find.panel.contains(target)) return false;
  const replace = key === "h" && (event.metaKey ? event.shiftKey : !event.shiftKey);
  if (key === "f" || replace) {
    const showReplace = replace || Boolean(event.shiftKey);
    event.preventDefault();
    if (!runtime.compact && requestWritingFind(runtime, {replace: showReplace})) return true;
    openWritingFind(runtime, showReplace);
    return true;
  }
  if (key !== "g" || !runtime.find.query.value) return false;
  event.preventDefault();
  if (!runtime.compact && requestWritingFind(runtime, {direction: event.shiftKey ? -1 : 1})) return true;
  if (runtime.find.panel.hidden) openWritingFind(runtime, false, true);
  refreshWritingFind(runtime, runtime.find.index + (event.shiftKey ? -1 : 1), true, true);
  return true;
}

function runWritingReplace(runtime, all, value = runtime.find.replacement.value) {
  const state = runtime.find;
  if (!state.mode || !writingFindCanReplace(runtime) || state.documentId !== runtime.docId) return 0;
  refreshWritingFind(runtime);
  if (!state.matches.length) return 0;
  const edits = all ? [...state.matches].reverse() : [state.matches[state.index]];
  let changed = 0;
  for (const match of edits) {
    if (match.map(({node, start, end}) => node.data.slice(start, end)).join("") === value) continue;
    if (!changed) beginWritingEdit(runtime, all ? "replaceAll" : "replace", writingFindRange(state.matches[state.index]));
    replaceWritingFindMatch(match, value);
    changed += 1;
  }
  if (changed) markEdited(runtime, true, [], null, state.mode === "local");
  const replacementsContainingQuery = [...value.matchAll(writingFindPattern(state.query.value, state.exactCase))].length;
  refreshWritingFind(runtime, all ? 0 : state.index + replacementsContainingQuery, !all, !all);
  if (all) state.notice.textContent = changed ? `${changed} replaced` : "No changes";
  return changed;
}

function writingFindToolbar(runtime, listeners) {
  const state = runtime.find;
  const active = () => state.mode === "toolbar" && state.documentId === runtime.docId && runtime.root.isConnected;
  return {
    label: "Find in draft",
    start: () => startWritingFind(runtime, "toolbar"),
    setQuery(query) {
      if (!active()) return false;
      state.query.value = query;
      return refreshWritingFind(runtime, 0, true);
    },
    step(direction) {
      if (!active()) return false;
      return refreshWritingFind(runtime, state.index + direction, true, true);
    },
    setCaseSensitive(value) {
      if (!active()) return false;
      state.exactCase = Boolean(value);
      state.exactCaseButton.setAttribute("aria-pressed", String(state.exactCase));
      return refreshWritingFind(runtime, 0, true);
    },
    replace(value, all) {
      if (!active()) return false;
      const replaced = runWritingReplace(runtime, all, value);
      return {...writingFindStatus(runtime), replaced};
    },
    close() {
      if (state.mode === "toolbar") closeWritingFind(runtime, false);
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

function installWritingFind(runtime) {
  const surface = runtime.paper.closest(".writing-surface");
  const panel = element("section", undefined, "writing-find");
  panel.setAttribute("role", "search");
  panel.setAttribute("aria-label", "Find and replace in draft");
  panel.hidden = true;
  const overlay = element("div", undefined, "writing-find-overlay");
  overlay.setAttribute("aria-hidden", "true");
  const findRow = element("div", undefined, "writing-find-row");
  const replaceRow = element("div", undefined, "writing-find-row");
  replaceRow.hidden = true;
  const {signal} = runtime.controller;

  function field(label, type) {
    const input = element("input");
    input.type = type;
    input.placeholder = label;
    input.setAttribute("aria-label", label);
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 500;
    return input;
  }
  function button(text, label, action) {
    const control = element("button", text);
    control.type = "button";
    control.setAttribute("aria-label", label);
    control.title = label;
    control.addEventListener("click", action, {signal});
    return control;
  }
  function step(amount) {
    state.notice.textContent = "";
    refreshWritingFind(runtime, state.index + amount, true, true);
  }
  const query = field("Find in draft", "search");
  const replacement = field("Replace with", "text");
  const count = element("span", "", "writing-find-count");
  count.setAttribute("aria-live", "polite");
  const notice = element("span", "", "writing-find-notice");
  notice.setAttribute("role", "status");
  const exactCase = button("Aa", "Match case", () => {
    state.exactCase = !state.exactCase;
    exactCase.setAttribute("aria-pressed", String(state.exactCase));
    state.notice.textContent = "";
    refreshWritingFind(runtime, 0, true);
  });
  exactCase.setAttribute("aria-pressed", "false");
  const previous = button("↑", "Previous match (Shift+Enter)", () => step(-1));
  const next = button("↓", "Next match (Enter)", () => step(1));
  const expand = button("Replace", "Replace controls", () => {
    replaceRow.hidden = !replaceRow.hidden;
    expand.setAttribute("aria-expanded", String(!replaceRow.hidden));
    (replaceRow.hidden ? query : replacement).focus({preventScroll: true});
  });
  expand.setAttribute("aria-expanded", "false");
  const close = button("×", "Close find (Escape)", () => closeWritingFind(runtime));
  const replace = button("Replace", "Replace current match", () => runWritingReplace(runtime, false));
  const replaceAll = button("All", "Replace all matches", () => runWritingReplace(runtime, true));
  findRow.append(query, count, exactCase, previous, next, expand, close);
  replaceRow.append(replacement, replace, replaceAll);
  panel.append(findRow, replaceRow, notice);
  surface.append(overlay, panel);

  const listeners = new Set();
  function invalidate() {
    const notify = state.mode === "toolbar";
    closeWritingFind(runtime, false);
    if (notify) for (const callback of listeners) callback(false);
  }
  let frame = 0;
  function schedule(recheck = false) {
    if (!state.mode) return;
    state.recheck ||= recheck;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!state.mode) return;
      if (state.documentId !== runtime.docId || !runtime.root.isConnected) return invalidate();
      const recheck = state.recheck;
      state.recheck = false;
      if (recheck) {
        const snapshot = refreshWritingFind(runtime);
        if (state.mode === "toolbar") for (const callback of listeners) callback(snapshot);
      } else paintWritingFindMatch(runtime);
    });
  }
  const observer = new MutationObserver(() => schedule(true));
  const state = runtime.find = {
    panel, overlay, observer, query, replacement, count, notice, previous, next, expand, exactCaseButton: exactCase,
    replaceRow, replace, replaceAll, mode: null, exactCase: false, matches: [], index: 0,
  };
  const toolbar = runtime.compact ? null : writingFindToolbar(runtime, listeners);
  runtime.paper.ownerDocument.addEventListener("care-find-targets", event => {
    if (!runtime.root.isConnected || !runtime.docId || runtime.clipboardDialog.open ||
        runtime.composing || runtime.composingFootnote || !Array.isArray(event.detail?.targets)) return;
    event.detail.targets.push({root: runtime.root, kind: "studio", main: !runtime.compact,
      open: ({replace} = {}) => openWritingFind(runtime, replace), toolbar});
  }, {signal});
  query.addEventListener("input", () => {
    notice.textContent = "";
    refreshWritingFind(runtime, 0, true);
  }, {signal});
  runtime.a4.well.addEventListener("scroll", () => schedule(), {passive: true, signal});
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => schedule()) : null;
  resize?.observe(runtime.a4.well);
  window.addEventListener("keydown", event => {
    if (!runtime.root.isConnected || !runtime.docId || event.isComposing || event.defaultPrevented) return;
    if (runtime.clipboardDialog.open || document.querySelector('[role="dialog"]')) return;
    if (writingFindShortcut(runtime, event)) return;
    if (!writingShortcutTarget(runtime, event)) return;
    if (!panel.hidden && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeWritingFind(runtime);
    } else if (!panel.hidden && event.key === "Enter") {
      if (event.composedPath().includes(query)) {
        event.preventDefault();
        step(event.shiftKey ? -1 : 1);
      } else if (event.composedPath().includes(replacement)) {
        event.preventDefault();
        runWritingReplace(runtime, false);
      }
    }
  }, {capture: true, signal});
  signal.addEventListener("abort", () => {
    invalidate();
    listeners.clear();
    resize?.disconnect();
    cancelAnimationFrame(frame);
  }, {once: true});
}

// A4 spacers are part of the editable flow, so WebKit paints the native
// selection through page margins and footnotes. Paint only authored text
// rectangles while retaining the browser's actual editable selection.
const writingSelectionWidget = "[contenteditable=false],[data-a4-break],[data-writing-footnote]";

function writingSelectionRects(paper, selection, viewport) {
  const doc = paper.ownerDocument;
  const walker = doc.createTreeWalker(paper, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!selection.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
      if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      if (node.matches(writingSelectionWidget)) return NodeFilter.FILTER_REJECT;
      if (node.parentNode === paper) {
        const bounds = node.getBoundingClientRect();
        if (bounds.bottom <= viewport.top || bounds.top >= viewport.bottom) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_SKIP;
    },
  });
  const range = doc.createRange();
  const rects = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const start = node === selection.startContainer ? selection.startOffset : 0;
    const end = node === selection.endContainer ? selection.endOffset : node.length;
    if (!node.data.slice(start, end).trim()) continue;
    range.setStart(node, start);
    range.setEnd(node, end);
    for (const rect of range.getClientRects()) {
      const left = Math.max(rect.left, viewport.left);
      const top = Math.max(rect.top, viewport.top);
      const width = Math.min(rect.right, viewport.right) - left;
      const height = Math.min(rect.bottom, viewport.bottom) - top;
      if (width > 0 && height > 0) rects.push({left, top, width, height});
    }
  }
  return rects;
}

function installWritingSelection(runtime) {
  const {paper, a4, controller} = runtime;
  const {well, stage} = a4;
  const doc = paper.ownerDocument;
  const root = paper.getRootNode();
  const view = doc.defaultView;
  const {signal} = controller;
  const overlay = element("div", undefined, "writing-selection-overlay");
  overlay.setAttribute("aria-hidden", "true");
  stage.append(overlay);
  let frame = 0;
  let painted = false;

  function clear() {
    if (!painted) return;
    painted = false;
    paper.classList.remove("writing-text-selection");
    overlay.replaceChildren();
  }

  function paint() {
    if (!paper.isConnected || !a4.active) return clear();
    const selection = writingSelectionRange(paper);
    if (!selection || selection.collapsed) return clear();
    const rects = writingSelectionRects(paper, selection, well.getBoundingClientRect());
    // A selection can extend through a viewport containing only page space.
    // Continue suppressing the native fill if the text has already painted.
    if (!rects.length && !painted) return;
    const origin = overlay.getBoundingClientRect();
    const scale = a4.scale || 1;
    const highlights = rects.map(rect => {
      const highlight = element("span");
      Object.assign(highlight.style, {
        left: `${(rect.left - origin.left) / scale}px`, top: `${(rect.top - origin.top) / scale}px`,
        width: `${rect.width / scale}px`, height: `${rect.height / scale}px`,
      });
      return highlight;
    });
    overlay.replaceChildren(...highlights);
    if (painted) return;
    painted = true;
    paper.classList.add("writing-text-selection");
  }

  function schedule() {
    if (frame || (!a4.active && !painted)) return;
    frame = view.requestAnimationFrame(() => {
      frame = 0;
      paint();
    });
  }
  runtime.scheduleWritingSelection = schedule;

  doc.addEventListener("selectionchange", schedule, {signal});
  if (root !== doc) root.addEventListener("selectionchange", schedule, {signal});
  paper.addEventListener("pointermove", event => {
    if (event.buttons & 1) schedule();
  }, {passive: true, signal});
  paper.addEventListener("pointerup", schedule, {signal});
  paper.addEventListener("keyup", schedule, {signal});
  well.addEventListener("scroll", () => { if (painted) schedule(); }, {passive: true, signal});
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (painted) schedule(); }) : null;
  resize?.observe(well);
  const mutation = new MutationObserver(records => {
    if (painted && records.some(record => !overlay.contains(record.target))) schedule();
  });
  mutation.observe(stage, {childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ["style", "class"]});
  signal.addEventListener("abort", () => {
    delete runtime.scheduleWritingSelection;
    resize?.disconnect();
    mutation.disconnect();
    view.cancelAnimationFrame(frame);
    clear();
    overlay.remove();
  }, {once: true});
}

const writingBinderLimit = 50;
const writingBinderDrag = "application/x-care-binder-item";
const binderIcons = {
  draft: "M10 4v12M4 10h12",
  folder: "M2.5 5h5l2 2H17v9H2.5zM11 10v4m-2-2h4",
  files: "M6 4h10v11H6zM4 7H3v10h10v-1M9 8h4m-4 3h4",
  trash: "M4 6h12m-9 0V4h6v2M6 6l1 11h6l1-11M9 9v5m2-5v5",
  archive: "M3 4h14v4H3zM5 8v8h10V8m-7 3h4",
};

function binderIcon(name) {
  const icon = element("span", undefined, "binder-icon");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `<svg viewBox="0 0 20 20"><path d="${binderIcons[name]}"/></svg>`;
  return icon;
}

function binderIconButton(name, label, handler) {
  const button = makeButton("", handler);
  button.append(binderIcon(name));
  button.title = label;
  button.setAttribute("aria-label", label);
  return button;
}

function writingBinderContents(documents, folders) {
  const byId = new Map(documents.map(document => [document.id, document]));
  const foldersById = new Map(folders.map(folder => [folder.id, folder]));
  const foldersByParent = new Map();
  const documentsByFolder = new Map();
  const sharedFolders = new Set();
  const group = (groups, key, item) => {
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  };
  for (const folder of [...folders].sort((left, right) => left.name.localeCompare(right.name))) {
    group(foldersByParent, foldersById.has(folder.parent_id) ? folder.parent_id : null, folder);
  }
  for (const document of [...documents].sort((left, right) => left.title.localeCompare(right.title))) {
    group(documentsByFolder, foldersById.has(document.folder_id) ? document.folder_id : null, document);
    if (!document.shared) continue;
    let folder = foldersById.get(document.folder_id);
    while (folder && !sharedFolders.has(folder.id)) {
      sharedFolders.add(folder.id);
      folder = foldersById.get(folder.parent_id);
    }
  }
  return {byId, foldersById, foldersByParent, documentsByFolder, sharedFolders};
}

function installWritingBinder(runtime) {
  if (runtime.binder) return;
  const panel = element("aside", undefined, "writing-binder");
  panel.id = "care-writing-binder";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Project Binder");
  const head = element("header", undefined, "binder-head");
  head.dataset.binderDropFolder = "";
  const title = element("h2", "Drafts");
  title.title = "Drop a draft or folder here to move it to the top level";
  const create = binderIconButton("draft", "New draft", () => {
    runtime.focusNewDraft = true;
    send(runtime, "new");
  });
  const files = binderIconButton("files", "Manage drafts and folders", () => send(runtime, "files"));
  const newFolder = binderIconButton("folder", "New folder", () => openBinderFolderForm(runtime, null));
  head.append(title, create, newFolder, files);

  const search = element("input", undefined, "binder-search");
  search.type = "search";
  search.autocomplete = "off";
  search.placeholder = "Find a draft or folder";
  search.setAttribute("aria-label", "Find a draft or folder in the Binder");
  const folderForm = element("form", undefined, "binder-folder-form");
  folderForm.hidden = true;
  const folderName = element("input");
  folderName.setAttribute("aria-label", "New folder name");
  folderName.placeholder = "Folder name";
  folderName.autocomplete = "off";
  folderName.required = true;
  folderName.maxLength = 120;
  const folderSubmit = element("button", "Create");
  folderSubmit.type = "submit";
  const folderCancel = makeButton("×", () => {
    folderForm.hidden = true;
    const trigger = runtime.binder.formTrigger;
    (trigger?.isConnected ? trigger : newFolder).focus({preventScroll: true});
  });
  folderCancel.setAttribute("aria-label", "Cancel");
  const folderLocation = element("small", "New folder in Drafts");
  folderForm.append(folderLocation, folderName, folderSubmit, folderCancel);

  const tree = element("div", undefined, "binder-tree");
  tree.dataset.binderDropFolder = "";
  const rootDrop = element("div", "Move to Drafts", "binder-root-drop");
  rootDrop.dataset.binderDropFolder = "";
  rootDrop.hidden = true;
  rootDrop.title = "Drop here to move out of folders";
  const searchArea = element("div", undefined, "binder-search-area");
  searchArea.append(search, rootDrop);
  const menu = element("div", undefined, "binder-item-menu");
  menu.id = "care-binder-item-menu";
  menu.hidden = true;
  menu.setAttribute("role", "group");
  const trash = element("details", undefined, "binder-trash");
  const trashSummary = element("summary");
  trashSummary.dataset.binderTrashDrop = "";
  const trashCount = element("span", undefined, "binder-trash-count");
  trashSummary.append(binderIcon("trash"), element("span", "Trash"), trashCount);
  const trashList = element("div", undefined, "binder-trash-list");
  trash.append(trashSummary, trashList);
  const archive = element("details", undefined, "binder-archive");
  archive.hidden = true;
  const archiveSummary = element("summary");
  const archiveCount = element("span", undefined, "binder-archive-count");
  archiveSummary.append(binderIcon("archive"), element("span", "Local Archive"), archiveCount);
  const archiveList = element("div", undefined, "binder-archive-list");
  archive.append(archiveSummary, archiveList);
  const notice = element("p", undefined, "binder-notice");
  notice.hidden = true;
  notice.setAttribute("role", "status");

  const exportArea = element("section", undefined, "binder-export");
  exportArea.setAttribute("aria-label", "Selected drafts");
  exportArea.hidden = true;
  const selectionDetails = element("details", undefined, "binder-order");
  const count = element("summary", "0 drafts selected", "binder-count");
  const selection = element("ol", undefined, "binder-selection");
  selectionDetails.append(count, selection);
  const footer = element("div", undefined, "binder-footer");
  const read = makeButton("Read together", () => {
    const document_ids = [...runtime.binder.order];
    if (document_ids.length) binderAction(runtime, "read", {
      document_ids, footnote_mode: runtime.footnotes.dataset.mode,
    });
  });
  read.className = "binder-read";
  const compile = makeButton("Compile…", () => {
    const document_ids = [...runtime.binder.order];
    if (document_ids.length) send(runtime, "compile", {document_ids});
  });
  compile.className = "binder-compile";
  const groupSelection = makeButton("New folder from selection…", () => openBinderSelectionFolder(runtime, groupSelection));
  groupSelection.className = "binder-group-selection";
  footer.append(read, compile);
  exportArea.append(selectionDetails, groupSelection, footer);
  panel.append(head, searchArea, folderForm, tree, menu, archive, trash, notice, exportArea);
  runtime.navigator.append(panel);

  const reading = element("section", undefined, "binder-reading");
  reading.hidden = true;
  reading.setAttribute("aria-label", "Read selected drafts together");
  const readingHead = element("header", undefined, "binder-reading-head");
  const readingTitle = element("span");
  const closeReading = makeButton("Back to draft", () => closeBinderReading(runtime));
  const readingText = element("article", undefined, "binder-reading-text");
  readingHead.append(readingTitle, closeReading);
  reading.append(readingHead, readingText);
  runtime.a4.well.append(reading);
  const binder = runtime.binder = {
    panel, create, files, newFolder, search, tree, rootDrop, menu, folderForm, folderName, folderSubmit, folderLocation,
    trash, trashCount, trashList, archive, archiveSummary, archiveCount, archiveList,
    notice, exportArea, selection, count, read, compile, groupSelection,
    reading, readingTitle, readingText, closeReading,
    launcher: runtime.root.querySelector("[data-binder-edge]"),
    order: [], foldersOpen: new Map(), contents: writingBinderContents([], []), locked: false,
  };
  const signal = runtime.controller.signal;
  binder.launcher?.addEventListener("click", () => toggleWritingBinder(runtime), {signal});
  paintWritingBinderLauncher(binder);
  const cancelDismissal = () => cancelWritingBinderDismissal(runtime);
  runtime.navigator.addEventListener("focusin", cancelDismissal, {signal});
  runtime.navigator.addEventListener("pointerdown", cancelDismissal, {signal});
  signal.addEventListener("abort", cancelDismissal, {once: true});
  search.addEventListener("input", () => renderWritingBinderTree(runtime), {signal});
  folderForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = folderName.value.trim();
    if (binder.locked || !name) return;
    if (binder.renamingItem) {
      const {kind, id} = binder.renamingItem;
      binderAction(runtime, "rename", {...binderItemFields(binder, kind, id), name});
    } else if (binder.creatingSelection) {
      binderAction(runtime, "folder-from-selection", {
        folder_name: name, folder_id: binder.creatingIn,
        document_ids: binder.creatingSelection,
        document_revisions: binderDocumentRevisions(binder, binder.creatingSelection),
      });
    } else binderAction(runtime, "create-folder", {folder_name: name, folder_id: binder.creatingIn});
  }, {signal});
  panel.addEventListener("keydown", event => {
    if (event.key !== "Escape" || event.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    if (!menu.hidden) closeBinderItemMenu(binder, true);
    else if (folderForm.hidden) closeWritingBinder(runtime);
    else folderCancel.click();
  }, {signal});
  window.addEventListener("pointerdown", event => {
    if (menu.hidden) return;
    const path = event.composedPath();
    if (!path.includes(menu) && !path.includes(binder.menuTrigger)) closeBinderItemMenu(binder);
  }, {capture: true, signal});
  menu.addEventListener("mousedown", event => {
    // Keep focus inside the popup until the action receives its click.
    if (event.button === 0 && event.target.closest("button")) event.preventDefault();
  }, {signal});
  tree.addEventListener("scroll", () => {
    if (menu.hidden) return;
    const anchor = binder.menuTrigger.getBoundingClientRect();
    const viewport = tree.getBoundingClientRect();
    if (anchor.bottom <= viewport.top || anchor.top >= viewport.bottom) closeBinderItemMenu(binder);
    else positionBinderItemMenu(binder, anchor);
  }, {passive: true, signal});
  // WebKit can blur the current button before delivering the next button's
  // click. Dismiss on an actual move of focus outside the menu.
  window.addEventListener("focusin", event => {
    const path = event.composedPath();
    if (!menu.hidden && !path.includes(menu) && !path.includes(binder.menuTrigger)) closeBinderItemMenu(binder);
  }, {signal});
  tree.addEventListener("change", event => {
    const checkbox = event.target.closest("input[data-binder-include]");
    if (!checkbox) return;
    setWritingBinderDraft(runtime, checkbox.dataset.binderInclude, checkbox.checked);
  }, {signal});
  reading.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeBinderReading(runtime);
  }, {signal});
  installWritingBinderDrag(runtime);
}

function paintWritingBinderLauncher({launcher, panel}) {
  if (!launcher) return;
  launcher.hidden = !panel.hidden;
  launcher.setAttribute("aria-expanded", String(!panel.hidden));
}

function cancelWritingBinderDismissal(runtime) {
  const binder = runtime.binder;
  if (!binder?.dismissTimer) return;
  clearTimeout(binder.dismissTimer);
  binder.dismissTimer = null;
}

function scheduleWritingBinderDismissal(runtime) {
  const binder = runtime.binder;
  if (!binder || binder.panel.hidden || runtime.outlineWide !== false || binder.dismissTimer) return;
  binder.dismissTimer = setTimeout(() => {
    binder.dismissTimer = null;
    if (binder.panel.hidden || runtime.outlineWide !== false || runtime.composing ||
        binder.locked || binder.drag || binder.order.length || !binder.menu.hidden ||
        !binder.folderForm.hidden || !binder.reading.hidden ||
        [runtime.pending, runtime.queued].some(action => ["binder", "compile"].includes(action?.type)) ||
        runtime.navigator.contains(runtime.paper.getRootNode().activeElement) ||
        writingSelectionRange(runtime.paper)?.collapsed === false) return;
    runtime.navigatorClosed = true;
    closeWritingBinder(runtime, false);
  }, 2800);
}

function closeWritingBinder(runtime, focus = true) {
  const binder = runtime.binder;
  if (!binder || binder.panel.hidden) return false;
  cancelWritingBinderDismissal(runtime);
  closeBinderItemMenu(binder);
  binder.panel.hidden = true;
  runtime.root.classList.remove("binder-open");
  paintWritingBinderLauncher(binder);
  paintWritingNavigator(runtime);
  if (focus && binder.reading.hidden) {
    if (runtime.docId) restoreSelection(runtime);
    else binder.launcher?.focus({preventScroll: true});
  }
  return true;
}

function toggleWritingBinder(runtime) {
  if (runtime.compact) return;
  if (!closeWritingBinder(runtime)) openWritingBinder(runtime);
}

function openWritingBinder(runtime, focus = true) {
  installWritingBinder(runtime);
  cancelWritingBinderDismissal(runtime);
  runtime.navigatorClosed = false;
  if (runtime.binder.panel.hidden) {
    runtime.binder.panel.hidden = false;
    runtime.root.classList.add("binder-open");
    paintWritingBinderLauncher(runtime.binder);
    renderWritingBinderTree(runtime);
    renderWritingBinderTrash(runtime);
    renderWritingBinderArchive(runtime);
    renderWritingBinderSelection(runtime);
  }
  paintWritingNavigator(runtime);
  if (focus) runtime.binder.search.focus({preventScroll: true});
}

function binderAction(runtime, operation, fields) {
  const {notice, locked} = runtime.binder;
  if (locked) return;
  notice.hidden = true;
  send(runtime, "binder", {operation, ...fields});
}

function openBinderFolderForm(runtime, folderId, trigger = null) {
  const binder = runtime.binder;
  binder.creatingIn = folderId;
  binder.creatingSelection = null;
  binder.renamingItem = null;
  binder.formTrigger = trigger;
  binder.folderLocation.textContent = "New folder in " + (binder.contents.foldersById.get(folderId)?.name || "Drafts");
  binder.folderSubmit.textContent = "Create";
  binder.folderName.setAttribute("aria-label", "New folder name");
  binder.folderName.maxLength = 120;
  binder.folderName.value = "";
  binder.folderForm.hidden = false;
  binder.folderName.focus({preventScroll: true});
}

function binderDocumentRevisions(binder, identities) {
  return Object.fromEntries(identities.map(identity => [identity, binder.contents.byId.get(identity)?.revision]));
}

function openBinderSelectionFolder(runtime, trigger = null) {
  const binder = runtime.binder;
  const identities = [...binder.order];
  if (binder.locked || !identities.length) return;
  const locations = new Set(identities.map(identity => binder.contents.byId.get(identity)?.folder_id || null));
  const parent = locations.size === 1 ? [...locations][0] : null;
  openBinderFolderForm(runtime, parent, trigger);
  binder.creatingSelection = identities;
  binder.folderLocation.textContent += ` · ${identities.length} ${identities.length === 1 ? "selected draft" : "selected drafts"}`;
}

function openBinderRenameForm(binder, kind, id, name, trigger) {
  binder.creatingSelection = null;
  binder.renamingItem = {kind, id};
  binder.formTrigger = trigger;
  binder.folderLocation.textContent = kind === "folder" ? "Rename folder" : "Rename draft";
  binder.folderSubmit.textContent = "Rename";
  binder.folderName.setAttribute("aria-label", binder.folderLocation.textContent);
  binder.folderName.maxLength = kind === "folder" ? 120 : 300;
  binder.folderName.value = name;
  binder.folderForm.hidden = false;
  binder.folderName.focus({preventScroll: true});
  binder.folderName.select();
}

function binderItemFields(binder, kind, id) {
  const fields = {item_kind: kind, target_id: id};
  if (kind === "document") fields.target_revision = binder.contents.byId.get(id)?.revision;
  return fields;
}

function trashBinderItem(runtime, kind, id) {
  runtime.binder.trash.open = true;
  binderAction(runtime, "trash", binderItemFields(runtime.binder, kind, id));
}

function closeBinderItemMenu(binder, focus = false) {
  if (binder.menu.hidden) return;
  const trigger = binder.menuTrigger;
  binder.menuTrigger = null;
  binder.menu.hidden = true;
  trigger.setAttribute("aria-expanded", "false");
  if (focus) trigger.focus({preventScroll: true});
}

function positionBinderItemMenu({menu, panel}, anchor) {
  const bounds = panel.getBoundingClientRect();
  const below = anchor.bottom - bounds.top + 4;
  const above = anchor.top - bounds.top - menu.offsetHeight - 4;
  menu.style.top = Math.max(0, below + menu.offsetHeight <= bounds.height ? below : above) + "px";
}

function binderItemMenuButton(runtime, kind, id, name) {
  const {binder} = runtime;
  const label = `Manage ${kind === "folder" ? "folder " : ""}${name}`;
  const trigger = makeButton("…", () => {
    if (binder.locked) return;
    if (binder.menuTrigger === trigger) return closeBinderItemMenu(binder, true);
    closeBinderItemMenu(binder);
    const action = (text, handler) => makeButton(text, () => {
      closeBinderItemMenu(binder, true);
      handler();
    });
    const buttons = [];
    const draft = kind === "document" ? binder.contents.byId.get(id) : null;
    if (draft?.shared) {
      if (!draft.can_unshare) return;
      const text = draft.return_pending ? "Finish moving to this Mac…" : "Stop sharing…";
      buttons.push(action(text, () => send(runtime, "unshare", {target_document_id: id})));
    } else {
      if (kind === "folder") buttons.push(
        action("New draft", () => {
          runtime.focusNewDraft = true;
          send(runtime, "new", {folder_id: id});
        }),
        action("New folder", () => openBinderFolderForm(runtime, id, trigger)),
      );
      if (kind === "document" && binder.order.includes(id)) {
        buttons.push(action("New folder from selection…", () => openBinderSelectionFolder(runtime, trigger)));
        if (binder.order.some(identity => binder.contents.byId.get(identity)?.folder_id)) {
          buttons.push(action("Move selection to Drafts", () => binderAction(runtime, "move-selection", {
            document_ids: [...binder.order], document_revisions: binderDocumentRevisions(binder, binder.order), folder_id: null,
          })));
        }
      } else {
        const location = kind === "folder" ? binder.contents.foldersById.get(id)?.parent_id : binder.contents.byId.get(id)?.folder_id;
        if (location) buttons.push(action("Move to Drafts", () => binderAction(runtime, "move", {
          ...binderItemFields(binder, kind, id), folder_id: null,
        })));
      }
      buttons.push(action("Rename…", () => openBinderRenameForm(binder, kind, id, name, trigger)));
      if (kind !== "folder" || !binder.contents.sharedFolders.has(id)) {
        const trashLabel = kind === "document" && binder.order.includes(id) && binder.order.length > 1
          ? "Move this draft to Trash" : "Move to Trash";
        const trash = action(trashLabel, () => {
          trashBinderItem(runtime, kind, id);
          binder.trash.querySelector("summary").focus({preventScroll: true});
        });
        trash.className = "binder-menu-trash";
        buttons.push(trash);
      }
    }
    const {menu} = binder;
    binder.menuTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-label", label);
    menu.replaceChildren(...buttons);
    menu.hidden = false;
    positionBinderItemMenu(binder, trigger.getBoundingClientRect());
    buttons[0].focus({preventScroll: true});
  });
  trigger.className = "binder-item-actions";
  trigger.dataset.binderFileAction = "";
  trigger.title = label;
  trigger.setAttribute("aria-label", label);
  trigger.setAttribute("aria-controls", binder.menu.id);
  trigger.setAttribute("aria-expanded", "false");
  trigger.disabled = binder.locked;
  return trigger;
}

function binderDropTarget(binder, node) {
  const drop = node?.closest?.("[data-binder-drop-folder], [data-binder-trash-drop]");
  if (!drop || !binder.panel.contains(drop) || binder.locked || !binder.drag) return null;
  if (drop.hasAttribute("data-binder-trash-drop")) {
    const {kind, id, documentIds} = binder.drag;
    if (documentIds?.length > 1 || (kind === "folder" && binder.contents.sharedFolders.has(id))) return null;
    return drop;
  }

  const {foldersById, byId} = binder.contents;
  const {kind, id, documentIds} = binder.drag;
  const folder = drop.dataset.binderDropFolder || null;
  if (kind === "document" && documentIds?.length) {
    if (documentIds.every(identity => (byId.get(identity)?.folder_id || null) === folder)) return null;
  } else {
    const current = (kind === "folder" ? foldersById.get(id)?.parent_id : byId.get(id)?.folder_id) || null;
    if (current === folder) return null;
  }
  let ancestor = folder;
  const visited = new Set();
  while (ancestor && !visited.has(ancestor)) {
    if (kind === "folder" && ancestor === id) return null;
    visited.add(ancestor);
    ancestor = foldersById.get(ancestor)?.parent_id;
  }
  return drop;
}

function installWritingBinderDrag(runtime) {
  const {binder, controller: {signal}} = runtime;
  const {panel} = binder;
  function highlight(target) {
    if (target === binder.dropTarget) return;
    binder.dropTarget?.removeAttribute("data-binder-drop-active");
    binder.dropTarget = target;
    target?.setAttribute("data-binder-drop-active", "");
  }
  function clear() {
    highlight(null);
    binder.drag = null;
    binder.rootDrop.hidden = true;
  }
  panel.addEventListener("dragstart", event => {
    const source = event.target.closest("[data-binder-drag-folder], [data-binder-drag-draft]");
    if (!source || !event.dataTransfer || binder.locked) return;
    const folderId = source.dataset.binderDragFolder;
    binder.drag = {kind: folderId ? "folder" : "document", id: folderId || source.dataset.binderDragDraft};
    if (!folderId && binder.order.includes(binder.drag.id) && binder.order.length > 1) {
      binder.drag.documentIds = [...binder.order];
    }
    binder.rootDrop.textContent = binder.drag.documentIds?.length > 1
      ? `Move ${binder.drag.documentIds.length} drafts to Drafts` : "Move to Drafts";
    binder.rootDrop.hidden = false;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(writingBinderDrag, binder.drag.id);
  }, {signal});
  panel.addEventListener("dragover", event => {
    const target = binderDropTarget(binder, event.target);
    highlight(target);
    if (!target || !event.dataTransfer) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, {signal});
  panel.addEventListener("dragleave", event => {
    if (binder.dropTarget?.contains(event.target) && !binder.dropTarget.contains(event.relatedTarget)) highlight(null);
  }, {signal});
  panel.addEventListener("drop", event => {
    const target = binderDropTarget(binder, event.target);
    const dragged = binder.drag;
    clear();
    if (!target || event.dataTransfer?.getData(writingBinderDrag) !== dragged.id) return;
    event.preventDefault();
    if (target.hasAttribute("data-binder-trash-drop")) {
      trashBinderItem(runtime, dragged.kind, dragged.id);
    } else {
      const folder_id = target.dataset.binderDropFolder || null;
      if (folder_id) binder.foldersOpen.set(folder_id, true);
      if (dragged.documentIds?.length > 1) binderAction(runtime, "move-selection", {
        document_ids: dragged.documentIds, document_revisions: binderDocumentRevisions(binder, dragged.documentIds), folder_id,
      });
      else binderAction(runtime, "move", {...binderItemFields(binder, dragged.kind, dragged.id), folder_id});
    }
  }, {signal});
  panel.addEventListener("dragend", clear, {signal});
}

function showBinderReading(runtime, preview, archived = false) {
  const {binder, a4} = runtime;
  if (binder.reading.hidden) binder.draftScroll = [a4.well.scrollLeft, a4.well.scrollTop];
  binder.readingTitle.textContent = archived ? `${preview.title} · Local Archive` :
    `${preview.count} ${preview.count === 1 ? "draft" : "drafts"} · Reading copy`;
  binder.reading.setAttribute("aria-label", archived ? "Read archived local draft" : "Read selected drafts together");
  binder.closeReading.textContent = archived ? "Close preview" : "Back to draft";
  binder.readingArchive = archived;
  // This fragment is produced by the same server-side allowlist as HTML compilation.
  binder.readingText.innerHTML = preview.html;
  a4.stage.hidden = true;
  runtime.root.classList.add("binder-reading-open");
  binder.reading.hidden = false;
  a4.well.scrollTo(0, 0);
  binder.closeReading.focus({preventScroll: true});
}

function closeBinderReading(runtime, focus = true) {
  const {binder, a4} = runtime;
  if (binder.reading.hidden) return;
  binder.reading.hidden = true;
  binder.readingText.replaceChildren();
  runtime.root.classList.remove("binder-reading-open");
  a4.stage.hidden = false;
  refreshWritingA4(runtime, true);
  a4.well.scrollTo(...binder.draftScroll);
  if (!focus) return;
  if (binder.readingArchive && !binder.panel.hidden) binder.archiveSummary.focus({preventScroll: true});
  else if (!binder.panel.hidden && !binder.read.disabled) binder.read.focus({preventScroll: true});
  else if (runtime.docId) restoreSelection(runtime);
}

function setWritingBinderDraft(runtime, id, included) {
  const binder = runtime.binder;
  const draft = binder?.contents.byId.get(id);
  if (!draft || binder.locked || draft.shared) return;
  binder.selectionAnchor = id;
  if (included && binder.order.length < writingBinderLimit && !binder.order.includes(id)) binder.order.push(id);
  if (!included) binder.order = binder.order.filter(selected => selected !== id);
  renderWritingBinderSelection(runtime);
}

function selectWritingBinderRange(runtime, toId) {
  const binder = runtime.binder;
  const visible = [...binder.tree.querySelectorAll("[data-binder-draft]")]
    .filter(button => !binder.contents.byId.get(button.dataset.binderDraft)?.shared && !button.closest("details:not([open])"))
    .map(button => button.dataset.binderDraft);
  const from = visible.indexOf(binder.selectionAnchor);
  const to = visible.indexOf(toId);
  if (from < 0 || to < 0) return setWritingBinderDraft(runtime, toId, true);
  binder.order = [...new Set([...binder.order, ...visible.slice(Math.min(from, to), Math.max(from, to) + 1)])]
    .slice(0, writingBinderLimit);
  renderWritingBinderSelection(runtime);
}

function reportWritingBinderSelection(runtime) {
  if (!runtime.binder) return;
  window.dispatchEvent(new CustomEvent("care-writing-binder-selection-change", {
    detail: {ids: [...runtime.binder.order]},
  }));
}

function lockWritingBinder(runtime, locked) {
  const binder = runtime.binder;
  if (!binder) return;
  binder.locked = locked;
  if (locked) closeBinderItemMenu(binder);
  binder.create.disabled = locked;
  binder.files.disabled = locked;
  binder.newFolder.disabled = locked;
  binder.groupSelection.disabled = locked || !binder.order.length;
  binder.folderName.disabled = locked;
  binder.folderSubmit.disabled = locked;
  binder.read.disabled = binder.compile.disabled = locked || !binder.order.length;
  for (const button of binder.panel.querySelectorAll("[data-binder-draft], [data-binder-file-action]")) {
    button.disabled = locked;
  }
  for (const checkbox of binder.tree.querySelectorAll("[data-binder-include]")) {
    checkbox.disabled = locked || (!checkbox.checked && binder.order.length >= writingBinderLimit);
  }
}

function paintWritingBinder(runtime, documents, folders, trashed = [], acknowledgement, archived = []) {
  const binder = runtime.binder;
  if (!binder) return;
  const ack = runtime.acknowledgedType === "binder" ? acknowledgement : null;
  if (ack?.binder_folder) {
    if (binder.creatingIn) binder.foldersOpen.set(binder.creatingIn, true);
    binder.foldersOpen.set(ack.binder_folder, true);
    binder.folderForm.hidden = true;
    binder.search.value = "";
    binder.newFolder.focus({preventScroll: true});
  }
  if (ack?.binder_renamed) {
    binder.folderForm.hidden = true;
    binder.renamingItem = null;
    binder.search.focus({preventScroll: true});
  }
  if (ack?.binder_preview) showBinderReading(runtime, ack.binder_preview);
  if (runtime.acknowledgedType === "open-archive" && acknowledgement?.binder_archive_preview) {
    showBinderReading(runtime, acknowledgement.binder_archive_preview, true);
  }
  if (ack?.binder_error || ack?.error) {
    binder.notice.textContent = ack.binder_error || ack.error;
    binder.notice.hidden = false;
  }
  binder.contents = writingBinderContents(documents, folders);
  const fileShape = documents.map(({id, title, folder_id, shared, offline, can_unshare, return_pending}) =>
    [id, title, folder_id, shared, offline, can_unshare, return_pending])
    .sort(([left], [right]) => left.localeCompare(right));
  const signature = JSON.stringify([fileShape, folders, trashed, archived, runtime.selectedDraftId || runtime.docId]);
  if (signature === binder.signature && !ack?.binder_folder) return;
  binder.signature = signature;
  binder.trashed = trashed;
  binder.archived = archived;
  binder.order = binder.order.filter(id => binder.contents.byId.has(id) && !binder.contents.byId.get(id).shared);
  if (binder.panel.hidden) {
    reportWritingBinderSelection(runtime);
    return;
  }
  renderWritingBinderTree(runtime);
  renderWritingBinderTrash(runtime);
  renderWritingBinderArchive(runtime);
  renderWritingBinderSelection(runtime);
}

function renderWritingBinderArchive(runtime) {
  const {binder} = runtime;
  const archived = binder.archived || [];
  const unavailable = !archived.length && runtime.showUnavailableArchive;
  binder.archive.hidden = !archived.length && !unavailable;
  binder.archiveCount.textContent = unavailable ? "Full version" : String(archived.length);
  if (unavailable) {
    binder.archiveList.replaceChildren(element("p", "Local Archive is available in the desktop app.", "binder-empty"));
    return;
  }
  binder.archiveList.replaceChildren(...archived.map(item => {
    const row = element("div", undefined, "binder-archive-item");
    const title = element("span", item.title);
    title.title = `${item.title} · Revision ${item.revision}`;
    const preview = makeButton("Preview", () => send(runtime, "open-archive", {target_document_id: item.id}));
    preview.setAttribute("aria-label", `Preview archived ${item.title}, revision ${item.revision}`);
    preview.dataset.binderFileAction = "";
    preview.disabled = binder.locked;
    row.append(title, preview);
    return row;
  }));
}

function renderWritingBinderTrash(runtime) {
  const {binder} = runtime;
  const trashed = binder.trashed || [];
  binder.trashCount.textContent = trashed.length ? String(trashed.length) : "";
  binder.trashList.replaceChildren(...trashed.map(item => {
    const row = element("div", undefined, "binder-trash-item");
    const title = element("span", item.title);
    title.title = item.title;
    const restore = makeButton("Restore", () => binderAction(runtime, "restore", {
      item_kind: item.kind, target_id: item.id,
    }));
    restore.setAttribute("aria-label", `Restore ${item.kind === "folder" ? "folder" : "draft"} ${item.title}`);
    restore.dataset.binderFileAction = "";
    restore.disabled = binder.locked;
    row.append(title, restore);
    return row;
  }));
  if (!trashed.length) binder.trashList.append(element("p", "Trash is empty.", "binder-empty"));
}

function renderWritingBinderTree(runtime) {
  const binder = runtime.binder;
  closeBinderItemMenu(binder);
  const {foldersById, foldersByParent, documentsByFolder} = binder.contents;
  const sharedTitles = new Set([...binder.contents.byId.values()]
    .filter(document => document.shared).map(document => document.title));
  const query = binder.search.value.trim().toLocaleLowerCase();
  const selected = new Set(binder.order);
  const seen = new Set();
  const containsCurrent = new Set();
  const currentDraft = runtime.selectedDraftId || runtime.docId;
  let current = binder.contents.byId.get(currentDraft)?.folder_id;
  while (current && !containsCurrent.has(current)) {
    containsCurrent.add(current);
    current = foldersById.get(current)?.parent_id;
  }
  const appendChildren = (container, parentId, reveal) => {
    for (const folder of foldersByParent.get(parentId) || []) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      const details = element("details", undefined, "binder-folder");
      const children = element("div", undefined, "binder-folder-children");
      children.dataset.binderDropFolder = folder.id;
      const showAll = reveal || folder.name.toLocaleLowerCase().includes(query);
      appendChildren(children, folder.id, showAll);
      if (!showAll && !children.childElementCount) continue;
      const summary = element("summary", folder.name);
      summary.title = folder.name;
      summary.dataset.binderDragFolder = summary.dataset.binderDropFolder = folder.id;
      summary.draggable = true;
      details.append(summary, children);
      details.open = Boolean(query) || (binder.foldersOpen.get(folder.id) ?? containsCurrent.has(folder.id));
      details.addEventListener("toggle", () => {
        if (!binder.search.value.trim() && details.isConnected) binder.foldersOpen.set(folder.id, details.open);
      });
      const row = element("div", undefined, "binder-folder-row");
      row.dataset.binderDropFolder = folder.id;
      row.append(details, binderItemMenuButton(runtime, "folder", folder.id, folder.name));
      container.append(row);
    }
    for (const document of documentsByFolder.get(parentId) || []) {
      if (!reveal && !document.title.toLocaleLowerCase().includes(query)) continue;
      const row = element("div", undefined, "binder-draft");
      row.dataset.binderDropFolder = parentId || "";
      if (document.shared) row.setAttribute("data-binder-shared", "");
      else {
        row.dataset.binderDragDraft = document.id;
        row.draggable = true;
        const checkbox = element("input");
        checkbox.type = "checkbox";
        checkbox.dataset.binderInclude = document.id;
        checkbox.checked = selected.has(document.id);
        row.toggleAttribute("data-binder-selected", checkbox.checked);
        checkbox.disabled = binder.locked || (!checkbox.checked && binder.order.length >= writingBinderLimit);
        checkbox.setAttribute("aria-label", "Select " + document.title);
        row.append(checkbox);
      }
      const open = makeButton(document.title, event => {
        if (!document.shared) {
          if (event?.shiftKey) return selectWritingBinderRange(runtime, document.id);
          if (event?.metaKey || event?.ctrlKey) {
            return setWritingBinderDraft(runtime, document.id, !binder.order.includes(document.id));
          }
          binder.selectionAnchor = document.id;
        }
        closeBinderReading(runtime, false);
        if (document.id === runtime.docId) restoreSelection(runtime);
        else send(runtime, "open", {target_id: document.id});
      });
      open.className = "binder-draft-open";
      open.dataset.binderDraft = document.id;
      const badge = document.shared ? "Shared" : (sharedTitles.has(document.title) ? "Local" : "");
      const badgeText = document.offline ? "Shared · offline" : document.return_pending ? "Return pending" : badge;
      open.title = badgeText ? `${document.title} · ${badgeText}` : document.title;
      if (badge) {
        open.classList.add("binder-draft-labeled");
        open.replaceChildren(element("span", document.title, "binder-draft-name"),
          element("span", badgeText, `binder-draft-badge binder-draft-badge-${badge.toLowerCase()}`));
      }
      open.disabled = binder.locked;
      if (document.id === currentDraft) open.setAttribute("aria-current", "true");
      row.append(open);
      if (!document.shared || document.can_unshare) {
        row.append(binderItemMenuButton(runtime, "document", document.id, document.title));
      }
      container.append(row);
    }
  };
  const fragment = document.createDocumentFragment();
  appendChildren(fragment, null, !query);
  if (!fragment.childElementCount) {
    fragment.append(element("p", query ? "No drafts or folders match." : "Create a draft or folder to begin.", "binder-empty"));
  }
  binder.tree.replaceChildren(fragment);
}

function renderWritingBinderSelection(runtime) {
  const binder = runtime.binder;
  const selected = new Set(binder.order);
  for (const checkbox of binder.tree.querySelectorAll("[data-binder-include]")) {
    checkbox.checked = selected.has(checkbox.dataset.binderInclude);
    checkbox.parentElement.toggleAttribute("data-binder-selected", checkbox.checked);
    checkbox.disabled = binder.locked || (!checkbox.checked && binder.order.length >= writingBinderLimit);
  }
  const rows = binder.order.map((id, position) => {
    const title = binder.contents.byId.get(id)?.title || "Untitled";
    const row = element("li", undefined, "binder-ordered-draft");
    const name = element("span", title, "binder-ordered-name");
    name.title = title;
    const actions = element("div", undefined, "binder-order-actions");
    for (const [offset, label, symbol] of [[-1, "Move earlier", "↑"], [1, "Move later", "↓"]]) {
      const button = makeButton(symbol, () => {
        const to = position + offset;
        [binder.order[position], binder.order[to]] = [binder.order[to], binder.order[position]];
        renderWritingBinderSelection(runtime);
        const controls = binder.selection.children[to].querySelectorAll("button");
        const next = controls[offset < 0 ? 0 : 1];
        (next.disabled ? controls[offset < 0 ? 1 : 0] : next).focus({preventScroll: true});
      });
      button.title = label;
      button.setAttribute("aria-label", label + ": " + title);
      button.disabled = position + offset < 0 || position + offset >= binder.order.length;
      actions.append(button);
    }
    const remove = makeButton("×", () => {
      binder.order = binder.order.filter(selectedId => selectedId !== id);
      renderWritingBinderSelection(runtime);
      const next = binder.selection.children[Math.min(position, binder.order.length - 1)];
      (next?.querySelector("button:last-child") || binder.search).focus({preventScroll: true});
    });
    remove.title = "Remove from compilation";
    remove.setAttribute("aria-label", "Remove " + title + " from compilation");
    actions.append(remove);
    row.append(name, actions);
    return row;
  });
  binder.selection.replaceChildren(...rows);
  binder.exportArea.hidden = !rows.length;
  binder.count.textContent = rows.length === 0 ? "0 drafts selected" :
    rows.length === writingBinderLimit ? writingBinderLimit + " drafts selected · limit" :
      rows.length === 1 ? "1 draft selected" : rows.length + " drafts selected";
  binder.read.disabled = binder.compile.disabled = binder.locked || !rows.length;
  binder.groupSelection.disabled = binder.locked || !rows.length;
  reportWritingBinderSelection(runtime);
}

const writingFontFamilies = new Set([
  "Iowan Old Style", "Georgia", "Palatino", "Times New Roman", "Helvetica", "Arial", "Menlo",
]);
const writingDefaultFont = "var(--serif, Georgia)";
const writingDefaultSize = "var(--writing-default-size, 12pt)";
const writingParagraphSelector = "p, div, h1, h2, h3, h4, h5, h6, blockquote, pre";
const writingHeadingSelector = "h1, h2, h3, h4, h5, h6";
const writingInlineMarks = new Map([
  ["bold", ["strong", "strong, b"]],
  ["italic", ["em", "em, i"]],
  ["underline", ["u", "u"]],
  ["strikeThrough", ["s", "s, strike, del"]],
]);
const writingListCommands = {insertUnorderedList: "ul", insertOrderedList: "ol"};

function safeWritingFont(value) {
  const family = String(value || "").trim().replace(/^(["'])(.*)\1$/, "$2");
  return writingFontFamilies.has(family) || family === writingDefaultFont ? family : "";
}

function safeWritingSize(value) {
  const size = String(value || "").trim();
  if (size === writingDefaultSize) return size;
  const points = /^(\d{1,2})pt$/.exec(size)?.[1];
  return points && Number(points) >= 8 && Number(points) <= 72 ? Number(points) + "pt" : "";
}

function writingLogicalParagraph(paper, node) {
  const block = topBlock(paper, node);
  const nested = writingElement(node)?.closest(writingParagraphSelector);
  return nested && block?.contains(nested) ? nested : block;
}

function writingParagraphUnits(paper, range) {
  if (range.collapsed) {
    const unit = writingLogicalParagraph(paper, range.startContainer);
    return unit ? [unit] : selectedWritingBlocks(paper, range);
  }
  return selectedWritingBlocks(paper, range).flatMap(block => {
    if (block.localName !== "div") return [block];
    const children = [...block.children].filter(child => child.matches(writingParagraphSelector));
    return children.length ? children.filter(child => {
      if (!range.intersectsNode(child)) return false;
      if (!child.contains(range.endContainer) || child.contains(range.startContainer)) return true;
      const prefix = range.cloneRange();
      prefix.setStart(child, 0);
      const content = prefix.cloneContents();
      return Boolean(content.textContent || content.querySelector("br"));
    }) : [block];
  });
}

function writingTypographyAt(paper, node) {
  let font = "", size = "";
  for (let ancestor = writingElement(node); ancestor && ancestor !== paper; ancestor = ancestor.parentElement) {
    font ||= safeWritingFont(ancestor.style?.fontFamily);
    size ||= safeWritingSize(ancestor.style?.fontSize);
    if (font && size) break;
  }
  return {font: writingFontFamilies.has(font) ? font : "default", size: size.endsWith("pt") ? size.slice(0, -2) : ""};
}

function writingHardLine(unit, selected) {
  if (!unit.querySelector("br") && !/[\r\n]/.test(unit.textContent)) return null;
  const left = document.createRange();
  const right = document.createRange();
  const compare = (a, b) => {
    left.setStart(...a);
    left.collapse(true);
    right.setStart(...b);
    right.collapse(true);
    return left.compareBoundaryPoints(Range.START_TO_START, right);
  };
  const first = [unit, 0];
  const last = [unit, unit.childNodes.length];
  const start = [selected.startContainer, selected.startOffset];
  const end = [selected.endContainer, selected.endOffset];
  let from = first;
  let to = last;
  const walker = document.createTreeWalker(unit, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const boundaries = [];
    if (node.nodeType === Node.TEXT_NODE) {
      for (const match of node.data.matchAll(/\r\n|[\r\n]/g)) {
        boundaries.push([[node, match.index], [node, match.index + match[0].length]]);
      }
    } else if (node.localName === "br") {
      const parent = node.parentNode;
      const offset = Array.prototype.indexOf.call(parent.childNodes, node);
      boundaries.push([[parent, offset], [parent, offset + 1]]);
    }
    for (const [before, after] of boundaries) {
      if (compare(after, start) <= 0) from = after;
      if (compare(before, end) >= 0) {
        to = before;
        break;
      }
    }
    if (to !== last) break;
  }
  if (from === first && to === last || compare(from, to) >= 0) return null;
  return {first, from, to, last};
}

function writingStylePiece(unit, tag, start, end) {
  const range = document.createRange();
  range.setStart(...start);
  range.setEnd(...end);
  const content = range.cloneContents();
  if (!content.childNodes.length) return null;
  const part = element(tag);
  part.style.cssText = unit.style.cssText;
  part.style.removeProperty("--writing-a4-gap");
  part.append(content);
  return part;
}

function splitWritingStyleUnit(runtime, unit, range, tag) {
  const cuts = writingHardLine(unit, range);
  if (!cuts) return false;
  const {first, from, to, last} = cuts;
  const middle = writingStylePiece(unit, tag, from, to);
  if (!middle || !middle.textContent.trim()) return false;
  // Hard breaks inside a pasted heading usually belong to the surrounding
  // body. Keep the original anchor wrapper and all characters for citations.
  const heading = unit.matches(writingHeadingSelector);
  const before = writingStylePiece(unit, unit.localName, first, from);
  const after = writingStylePiece(unit, heading ? "p" : unit.localName, to, last);
  if (!before?.textContent.trim() && !after?.textContent.trim()) return false;
  const pieces = [before, middle, after].filter(Boolean);
  if (unit.parentElement === runtime.paper) {
    const wrapper = element("div");
    wrapper.dataset.blockId = unit.dataset.blockId;
    wrapper.append(...pieces);
    unit.replaceWith(wrapper);
  } else unit.replaceWith(...pieces);
  return true;
}

function writingTypography(runtime, range, command, value) {
  const font = value === "default" ? writingDefaultFont : safeWritingFont(value);
  const size = !value || value === "default" ? writingDefaultSize : safeWritingSize(value + "pt");
  if (command === "fontFamily" && !font || command === "fontSize" && !size) return false;
  const reset = command === "clearTypography";
  const apply = (node, explicit) => {
    if (command === "fontFamily" || reset) node.style.fontFamily = reset ? (explicit ? writingDefaultFont : "") : font;
    if (command === "fontSize" || reset) node.style.fontSize = reset ? (explicit ? writingDefaultSize : "") : size;
    if (!node.style.length) node.removeAttribute("style");
  };
  if (range.collapsed) {
    const block = writingParagraphUnits(runtime.paper, range)[0];
    if (!block) return false;
    apply(block, false);
    return true;
  }
  const bookmark = writingHistoryBookmark(runtime, range);
  const portions = writingTextPortions(range);
  for (const {node, start, end} of portions) {
    if (start === 0 && end === node.length && node.parentElement.localName === "span" &&
        node.parentElement.childNodes.length === 1) {
      apply(node.parentElement, true);
      continue;
    }
    if (end < node.length) node.splitText(end);
    const selected = start ? node.splitText(start) : node;
    const wrapper = element("span");
    apply(wrapper, true);
    selected.before(wrapper);
    wrapper.append(selected);
  }
  if (!portions.length) return false;
  restoreWritingHistoryBookmark(runtime, bookmark);
  return true;
}

function writingTextPortions(range) {
  const portions = [];
  function add(node) {
    if (node.parentElement.closest("[contenteditable=false], [data-writing-footnote], [data-a4-break]")) return;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (start < end) portions.push({node, start, end});
  }
  const ancestor = range.commonAncestorContainer;
  if (ancestor.nodeType === Node.TEXT_NODE) add(ancestor);
  else {
    const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (range.intersectsNode(node)) add(node);
    }
  }
  return portions;
}

function writingFormatState(paper, range, command) {
  const start = writingElement(range.startContainer);
  const listTag = writingListCommands[command];
  if (listTag) {
    const list = start.closest("ul, ol");
    return list?.localName === listTag && paper.contains(list);
  }
  const mark = writingInlineMarks.get(command);
  if (mark && !range.collapsed) return Boolean(start.closest(mark[1]));
  return null;
}

function styleSimpleWritingList(runtime, range, tag) {
  if (!tag) return false;
  const blocks = selectedWritingBlocks(runtime.paper, range);
  if (blocks.length !== 1) return false;
  const [block] = blocks;
  const list = block.matches("ul, ol");
  if (!list && !block.matches("p, div")) return false;
  const source = list ? block.firstElementChild : block;
  if (!source || (list && block.childNodes.length !== 1) ||
      source.querySelector("p, div, h1, h2, h3, h4, h5, h6, ul, ol, table, blockquote, pre, hr")) return false;
  const unlist = block.localName === tag;
  const replacement = element(unlist ? "p" : tag);
  replacement.dataset.blockId = block.dataset.blockId;
  replacement.style.cssText = block.style.cssText;
  replacement.style.removeProperty("--writing-a4-gap");
  const destination = unlist ? replacement : element("li");
  const {startContainer, startOffset, endContainer, endOffset} = range;
  destination.append(...source.childNodes);
  if (!unlist) replacement.append(destination);
  block.replaceWith(replacement);
  const restored = document.createRange();
  const point = (node, offset) => {
    if (node === source) return [destination, offset];
    if (node !== block) return [node, offset];
    return [replacement, unlist && offset ? replacement.childNodes.length : offset];
  };
  restored.setStart(...point(startContainer, startOffset));
  restored.setEnd(...point(endContainer, endOffset));
  restoreSelection(runtime, restored, runtime.rangeReversed);
  return true;
}

function styleWritingInline(runtime, range, command) {
  const [tag, selector] = writingInlineMarks.get(command);
  const portions = writingTextPortions(range);
  if (!portions.length) return false;
  const bookmark = writingHistoryBookmark(runtime, range);
  const remove = portions.every(({node}) => node.parentElement.closest(selector));
  for (const {node, start, end} of portions) {
    if (!remove && node.parentElement.closest(selector)) continue;
    if (end < node.length) node.splitText(end);
    const selected = start ? node.splitText(start) : node;
    if (remove) unwrapWritingMark(selected, selector);
    else {
      const wrapper = element(tag);
      selected.before(wrapper);
      wrapper.append(selected);
    }
  }
  restoreWritingHistoryBookmark(runtime, bookmark);
  return true;
}

function unwrapWritingMark(selected, selector) {
  // Lift only the selected text out of its marks. Move the surrounding nodes
  // intact so links, other emphasis and citation markers stay where they were.
  let content = selected;
  while (content.parentElement.closest(selector)) {
    const parent = content.parentElement;
    const after = parent.cloneNode(false);
    while (content.nextSibling) after.append(content.nextSibling);
    if (!parent.matches(selector)) {
      const retained = parent.cloneNode(false);
      retained.append(content);
      content = retained;
    }
    parent.after(content);
    if (after.firstChild) content.after(after);
    if (!parent.firstChild) parent.remove();
  }
}

function writingHeadingLabel(node) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let label = "";
  for (let child = walker.nextNode(); child; child = walker.nextNode()) {
    if (child.localName === "br") break;
    if (child.nodeType !== Node.TEXT_NODE) continue;
    const line = child.data.split(/[\r\n]/, 1)[0];
    label += line;
    if (line.length !== child.data.length || label.length > 110) break;
  }
  label = label.replace(/\s+/g, " ").trim();
  return label.length > 110 ? label.slice(0, 107).trimEnd() + "…" : label;
}

const writeBesidePanelOwners = new WeakMap();

function installWriteBesideResize(runtime) {
  const root = runtime.root;
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const host = root.getRootNode().host || root;
  const surface = host.closest(".st-key-care_writing_drawer_surface");
  const panel = surface?.parentElement;
  if (!panel?.isConnected || !view) return;
  if (runtime.writeBesidePanel === panel) return panel;
  runtime.writeBesideResize?.abort();
  const resize = new AbortController();
  const {signal} = resize;
  runtime.controller.signal.addEventListener("abort", () => resize.abort(), {once: true, signal});
  runtime.writeBesideResize = resize;
  runtime.writeBesidePanel = panel;
  writeBesidePanelOwners.set(panel, runtime);

  const grip = doc.createElement("div");
  grip.dataset.careWriteBesideResize = "";
  grip.tabIndex = 0;
  grip.title = "Drag to resize · arrow keys adjust · double-click resets";
  grip.setAttribute("role", "separator");
  grip.setAttribute("aria-orientation", "vertical");
  grip.setAttribute("aria-label", "Resize Write beside");
  panel.append(grip);

  const preference = "care-write-beside-width";
  let drag = null;
  const limits = () => {
    const viewport = view.innerWidth;
    const margin = Math.max(0, viewport - panel.getBoundingClientRect().right);
    const available = Math.max(0, viewport - 2 * margin);
    const rem = parseFloat(view.getComputedStyle(doc.documentElement).fontSize) || 16;
    return {
      min: Math.min(21 * rem, available),
      max: view.matchMedia("(max-width: 42rem), (max-height: 36rem)").matches
        ? available : Math.min(56 * rem, .76 * viewport, available),
    };
  };
  const sync = () => {
    const {min, max} = limits();
    const width = Math.round(panel.getBoundingClientRect().width);
    grip.setAttribute("aria-valuemin", String(Math.round(min)));
    grip.setAttribute("aria-valuemax", String(Math.round(max)));
    grip.setAttribute("aria-valuenow", String(width));
    grip.setAttribute("aria-valuetext", `${width} pixels wide`);
  };
  const apply = width => {
    const {min, max} = limits();
    panel.style.setProperty("--write-beside-width", Math.round(Math.max(min, Math.min(max, width))) + "px");
    sync();
  };
  const remember = () => {
    try {
      view.sessionStorage.setItem(preference, panel.style.getPropertyValue("--write-beside-width"));
    } catch {}
  };
  try {
    const saved = parseFloat(view.sessionStorage.getItem(preference));
    if (Number.isFinite(saved) && saved > 0) panel.style.setProperty("--write-beside-width", saved + "px");
  } catch {}
  sync();

  grip.addEventListener("pointerdown", event => {
    if (event.button !== 0 || drag) return;
    drag = {id: event.pointerId, x: event.clientX, width: panel.getBoundingClientRect().width};
    grip.setPointerCapture(event.pointerId);
    grip.setAttribute("data-dragging", "");
    event.preventDefault();
  }, {signal});
  grip.addEventListener("pointermove", event => {
    if (event.pointerId === drag?.id) apply(drag.width + drag.x - event.clientX);
  }, {signal});
  const endDrag = event => {
    if (event.pointerId !== drag?.id) return;
    drag = null;
    grip.removeAttribute("data-dragging");
    remember();
  };
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    grip.addEventListener(event, endDrag, {signal});
  }
  grip.addEventListener("keydown", event => {
    const current = panel.getBoundingClientRect().width;
    const {min, max} = limits();
    const delta = event.shiftKey ? 80 : 24;
    const widths = {ArrowLeft: current + delta, ArrowRight: current - delta, Home: min, End: max};
    if (!Object.hasOwn(widths, event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    apply(widths[event.key]);
    remember();
  }, {signal});
  grip.addEventListener("dblclick", () => {
    panel.style.removeProperty("--write-beside-width");
    remember();
    sync();
  }, {signal});
  view.addEventListener("resize", sync, {signal});
  signal.addEventListener("abort", () => {
    grip.remove();
    if (writeBesidePanelOwners.get(panel) !== runtime) return;
    writeBesidePanelOwners.delete(panel);
    delete panel.dataset.careWriteBesideRequest;
    panel.removeAttribute("data-care-write-beside-ready");
    panel.removeAttribute("data-care-write-beside-closing");
  }, {once: true});
  return panel;
}

function revealWriteBeside(runtime, nonce) {
  if (runtime.controller.signal.aborted || !runtime.root.isConnected) return false;
  const panel = installWriteBesideResize(runtime);
  if (!panel) return false;
  const closing = runtime.pending?.type === "close" || runtime.queued?.type === "close";
  if (closing) panel.setAttribute("data-care-write-beside-closing", "");
  else panel.removeAttribute("data-care-write-beside-closing");
  if (runtime.writingClipboardRequest) panel.dataset.careWriteBesideRequest = runtime.writingClipboardRequest;
  else delete panel.dataset.careWriteBesideRequest;
  panel.setAttribute("data-care-write-beside-ready", nonce || "");
  if (nonce && nonce !== runtime.revealedWriteBeside) {
    runtime.revealedWriteBeside = nonce;
    const view = runtime.root.ownerDocument.defaultView;
    view.dispatchEvent(new view.CustomEvent("care-write-beside-ready", {detail: {nonce}}));
  }
  return true;
}

const writingZoomPreference = "care-writing-zoom";
const writingZoomMin = 70;
const writingZoomMax = 160;
const writingZoomStep = 10;

function writingZoomPercent(value) {
  const percent = Number(value || 100);
  return Number.isFinite(percent)
    ? Math.max(writingZoomMin, Math.min(writingZoomMax, Math.round(percent / writingZoomStep) * writingZoomStep))
    : 100;
}

function writingFitPercent(runtime) {
  const {well, pages, scale = 1} = runtime.a4;
  const sheet = runtime.continuous ? runtime.paper.closest(".page") : pages;
  const sheetWidth = sheet.getBoundingClientRect().width / scale;
  const padding = getComputedStyle(well);
  const width = well.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
  const height = well.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) - 8;
  if (!sheetWidth || width <= 0 || height <= 0) return 100;
  const fit = runtime.continuous ? width / sheetWidth : Math.min(width / sheetWidth, height / (sheetWidth * 297 / 210));
  return Math.max(1, Math.min(100, Math.floor(fit * 100)));
}

function writingZoomFocusRect(runtime) {
  const {paper, a4} = runtime;
  const active = paper.getRootNode().activeElement;
  if (active?.dataset?.footnoteNote && a4.stage.contains(active)) return active.getBoundingClientRect();
  const range = writingSelectionRange(paper)?.cloneRange();
  if (!range) return null;
  range.collapse(false);
  return range.getClientRects()[0] || topBlock(paper, range.startContainer)?.getBoundingClientRect();
}

function applyWritingZoom(runtime, percent, preserveScroll) {
  const {paper, a4} = runtime;
  const {well, stage} = a4;
  const source = paper.closest(".page");
  const scale = percent / 100;
  const previousScale = a4.scale || 1;
  if (scale === previousScale) return;

  const viewport = preserveScroll && well.getBoundingClientRect();
  const focus = preserveScroll && writingZoomFocusRect(runtime);
  const visibleFocus = focus && focus.bottom > viewport.top && focus.top < viewport.bottom;
  const scrollTop = preserveScroll ? well.scrollTop : 0;
  const relativeTop = scrollTop && (viewport.top - source.getBoundingClientRect().top) / previousScale;

  a4.scale = scale;
  stage.style.setProperty("--writing-page-zoom", String(scale));
  stage.classList.toggle("writing-zoomed", scale !== 1);
  if (!preserveScroll) return;

  refreshWritingA4(runtime, true);
  const updatedFocus = visibleFocus && writingZoomFocusRect(runtime);
  if (updatedFocus) {
    well.scrollTop += updatedFocus.top - focus.top;
    if (focus.right > viewport.left && focus.left < viewport.right) {
      well.scrollLeft += updatedFocus.left - focus.left;
    }
  } else {
    well.scrollTop = scrollTop ? well.scrollTop + source.getBoundingClientRect().top - viewport.top + relativeTop * scale : 0;
  }
  if (runtime.find?.mode) paintWritingFindMatch(runtime);
  runtime.peerReview?.refresh();
}

function installWritingZoom(runtime) {
  const control = runtime.root.querySelector("[data-writing-zoom]");
  if (!control || !CSS.supports("zoom", "1.1")) return;
  const decrease = control.querySelector("[data-zoom-out]");
  const choices = control.querySelector("[data-zoom-choices]");
  const summary = choices.querySelector("summary");
  const readout = summary.querySelector("[data-zoom-percent]");
  const levels = choices.querySelectorAll("[data-zoom-level]");
  const increase = control.querySelector("[data-zoom-in]");
  const {signal} = runtime.controller;
  let preference = "100";
  try {
    const saved = localStorage.getItem(writingZoomPreference);
    preference = saved === "fit" ? saved : String(writingZoomPercent(saved));
  } catch {
    // Zoom can still change when browser storage is unavailable.
  }
  let percent = preference === "fit" ? 100 : Number(preference);

  function paintControls() {
    readout.textContent = `${percent}%`;
    const mode = preference === "fit" ? "Fit size. " : "";
    summary.setAttribute("aria-label", `Document zoom ${percent}%. ${mode}Choose a zoom level`);
    decrease.disabled = percent <= writingZoomMin;
    increase.disabled = percent >= writingZoomMax;
    for (const level of levels) level.setAttribute("aria-pressed", String(level.dataset.zoomLevel === preference));
  }

  function change(value) {
    if (runtime.composing || runtime.composingFootnote) return;
    preference = value === "fit" ? value : String(writingZoomPercent(value));
    percent = preference === "fit" ? writingFitPercent(runtime) : Number(preference);
    applyWritingZoom(runtime, percent, true);
    paintControls();
    try {
      localStorage.setItem(writingZoomPreference, preference);
    } catch {
      // Keep the chosen zoom for this Studio session.
    }
  }

  function closeChoices() {
    if (!choices.open) return;
    const returnFocus = choices.contains(choices.getRootNode().activeElement);
    choices.open = false;
    if (returnFocus) summary.focus({preventScroll: true});
  }

  runtime.refreshWritingFit = () => {
    if (preference !== "fit" || runtime.composing || runtime.composingFootnote) return;
    const next = writingFitPercent(runtime);
    if (next === percent) return;
    percent = next;
    applyWritingZoom(runtime, percent, true);
    paintControls();
  };
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(runtime.refreshWritingFit);
    observer.observe(runtime.a4.well);
    signal.addEventListener("abort", () => observer.disconnect(), {once: true});
  }

  // Clicking the view controls keeps the editor's native selection and focus.
  control.addEventListener("mousedown", event => {
    if (event.button === 0) event.preventDefault();
  }, {signal});
  decrease.addEventListener("click", () => change((Math.ceil(percent / writingZoomStep) - 1) * writingZoomStep), {signal});
  increase.addEventListener("click", () => change((Math.floor(percent / writingZoomStep) + 1) * writingZoomStep), {signal});
  for (const level of levels) level.addEventListener("click", () => {
    change(level.dataset.zoomLevel);
    closeChoices();
  }, {signal});
  control.ownerDocument.addEventListener("pointerdown", event => {
    if (!event.composedPath().includes(choices)) closeChoices();
  }, {signal});
  runtime.root.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !choices.open) return;
    event.preventDefault();
    closeChoices();
  }, {signal, capture: true});
  applyWritingZoom(runtime, percent, false);
  paintControls();
  control.hidden = false;
}

const writingPeerLabels = {
  comment: "Comment",
  highlight: "Highlight",
  agree_use: "Agree with this use",
  contest_use: "Contest this use",
  contest_axiom: "Contest the axiom",
};
const writingPeerSeenPrefix = "care-writing-peer-seen-v1:";
const writingPeerShortcutLifetime = 48 * 60 * 60 * 1000;

function writingPeerReviewVersions(reviews) {
  const versions = new Map();
  for (const review of reviews || []) {
    if (review.review_id && review.review_version) versions.set(review.review_id, review.review_version);
  }
  return versions;
}

function writingPeerHasUnread(versions, seen) {
  for (const [identity, version] of versions) {
    if (seen.get(identity) !== version) return true;
  }
  return false;
}

// Reader anchors use Unicode code points, include explicit line breaks and
// omit editor furniture. DOM Ranges instead address UTF-16 text nodes.
function writingPeerBlockText(block) {
  const chunks = [];
  const runs = [];
  let length = 0;
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE && node.length) {
      const characters = [...node.data];
      chunks.push(node.data);
      runs.push({node, characters, offset: length});
      length += characters.length;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches("[data-a4-break],[data-writing-footnote]")) return;
    if (node.localName === "br") {
      chunks.push("\n");
      length += 1;
      return;
    }
    for (const child of node.childNodes) visit(child);
  }
  visit(block);
  return {characters: [...chunks.join("")], runs};
}

function writingPeerSpans(anchor, blocks, blockIndices, blockText) {
  if (!anchor?.quote || !Number.isInteger(anchor.start) || !Number.isInteger(anchor.end)) return [];
  const first = blockIndices.get(anchor.block_id);
  const last = blockIndices.get(anchor.end_block_id);
  if (first == null || last == null || last < first || anchor.start < 0 || anchor.end < 0) return [];
  const spans = [];
  const text = [];
  for (let index = first; index <= last; index++) {
    const block = blocks[index];
    const {characters, runs} = blockText(block);
    const start = index === first ? anchor.start : 0;
    const end = index === last ? anchor.end : characters.length;
    if (end > characters.length || start > end) return [];
    text.push(characters.slice(start, end).join(""));
    for (const run of runs) {
      const localStart = Math.max(start - run.offset, 0);
      const localEnd = Math.min(end - run.offset, run.characters.length);
      if (localStart >= localEnd) continue;
      spans.push({
        block, node: run.node, start: run.characters.slice(0, localStart).join("").length,
        end: run.characters.slice(0, localEnd).join("").length,
      });
    }
  }
  return text.join("\n") === anchor.quote ? spans : [];
}

function writingPeerMarginSlots(items, top, bottom, gap) {
  const ordered = [...items].sort((a, b) => a.y - b.y);
  const chosen = new Set();
  let room = bottom - top + gap;
  for (const item of [...ordered].sort((a, b) => Number(b.active) - Number(a.active))) {
    const needed = item.height + gap;
    if (needed > room) continue;
    chosen.add(item);
    room -= needed;
  }
  let nextTop = top;
  const slots = ordered.filter(item => chosen.has(item)).map(item => {
    const y = Math.max(nextTop, Math.min(item.y - 20, bottom - item.height));
    nextTop = y + item.height + gap;
    return {item, top: y};
  });
  let nextBottom = bottom;
  for (const slot of [...slots].reverse()) {
    slot.top = Math.min(slot.top, nextBottom - slot.item.height);
    nextBottom = slot.top - gap;
  }
  return slots;
}

function writingPeerThread(source, port, margin) {
  // Take a fine leader below the selected line, then bend across the gutter.
  // The long portion stays below the letters when the mark is mid-sentence.
  const turn = Math.min(port.x - 8, Math.max(source.x, margin));
  const shoulder = Math.min(turn, source.x + 10);
  const bend = Math.max(4, (port.x - turn) * .5);
  return `M ${source.x} ${source.y} C ${shoulder} ${source.y}, ${shoulder} ${source.floor}, ${Math.min(turn, shoulder + 4)} ${source.floor} L ${turn} ${source.floor} C ${turn + bend} ${source.floor}, ${port.x - bend} ${port.y}, ${port.x} ${port.y}`;
}

function installWritingPeerReview(runtime) {
  const {root, paper, a4: {well}, controller: {signal}} = runtime;
  const toggle = root.querySelector("[data-peer-review-toggle]");
  const menu = root.querySelector("[data-peer-review-menu]");
  const librarian = root.querySelector('[data-action="peek-research"]');
  const unread = root.querySelector("[data-peer-review-unread]");
  const menuUnread = root.querySelector("[data-peer-review-menu-unread]");
  const count = root.querySelector("[data-peer-review-count]");
  const panel = root.querySelector("[data-peer-review-pane]");
  const overlay = root.querySelector("[data-peer-review-overlay]");
  const list = root.querySelector("[data-peer-review-list]");
  const margin = root.querySelector("[data-peer-review-margin]");
  const index = root.querySelector("[data-peer-review-index]");
  const indexToggle = root.querySelector("[data-peer-review-index-toggle]");
  const indexClose = root.querySelector("[data-peer-review-index-close]");
  const indexCount = root.querySelector("[data-peer-review-index-count]");
  const located = root.querySelector("[data-peer-review-located]");
  const unplaced = root.querySelector("[data-peer-review-unplaced]");
  const unplacedList = root.querySelector("[data-peer-review-unplaced-list]");
  const empty = root.querySelector("[data-peer-review-empty]");
  const importButton = root.querySelector("[data-peer-review-import]");
  const marks = root.querySelector("[data-peer-review-marks]");
  const threads = root.querySelector("[data-peer-review-threads]");
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const range = doc.createRange();
  let entries = [];
  let frame = 0;
  let signature = "";
  let currentDocument = "";
  let versions = new Map();
  let seen = new Map();
  let shortcutTimer = 0;
  let shortcutActivity = null;
  let active = null;
  let hovered = null;
  let listSignature = "";
  let opening = false;
  let indexRequested = false;
  let rebuild = false;

  function paintUnread() {
    const pending = writingPeerHasUnread(versions, seen);
    unread.hidden = !pending;
    menuUnread.hidden = !pending;
    librarian.setAttribute("aria-label", pending ? "CARE the Librarian, unread Reader review" : "CARE the Librarian");
    menu.setAttribute("aria-label", pending ? "Reader review, unread" : "Reader review");
  }

  function loadSeen() {
    try {
      seen = new Map(JSON.parse(view.localStorage.getItem(writingPeerSeenPrefix + currentDocument) || "[]"));
    } catch {
      seen = new Map();
    }
  }

  function markSeen() {
    if (!writingPeerHasUnread(versions, seen)) return;
    for (const [identity, version] of versions) seen.set(identity, version);
    try {
      view.localStorage.setItem(writingPeerSeenPrefix + currentDocument, JSON.stringify([...seen]));
    } catch {
      // Keep seen state for the open draft when browser storage is blocked.
    }
    paintUnread();
  }

  function hideShortcut() {
    view.clearTimeout(shortcutTimer);
    shortcutTimer = 0;
    shortcutActivity = null;
    toggle.hidden = true;
    setVisible(false);
  }

  function expireShortcut() {
    const remaining = writingPeerShortcutLifetime - (Date.now() - shortcutActivity);
    if (remaining > 0) shortcutTimer = view.setTimeout(expireShortcut, remaining);
    else hideShortcut();
  }

  function openReview() {
    if (!currentDocument) return;
    markSeen();
    shortcutActivity = Date.now();
    if (!shortcutTimer) shortcutTimer = view.setTimeout(expireShortcut, writingPeerShortcutLifetime);
    toggle.hidden = false;
    setVisible(true, true);
  }

  function setVisible(visible, focus = false) {
    if (visible === !panel.hidden) return;
    if (visible && runtime.activePane === "research") {
      runtime.activePane = "";
      clearTimeout(runtime.scanTimer);
      renderPanel(runtime);
    }
    panel.hidden = !visible;
    overlay.hidden = !visible;
    toggle.setAttribute("aria-expanded", String(visible));
    toggle.title = visible ? "Close Reader review" : "Show Reader review";
    if (visible) {
      opening = true;
      schedule(true);
      if (focus) toggle.focus({preventScroll: true});
    } else {
      view.cancelAnimationFrame(frame);
      frame = 0;
      indexRequested = false;
      hovered = null;
      marks.replaceChildren();
      threads.replaceChildren();
      if (focus) (toggle.hidden ? librarian : toggle).focus({preventScroll: true});
    }
  }

  function resolveEntries() {
    const blocks = [...paper.children].filter(block => block.dataset.blockId);
    const indices = new Map(blocks.map((block, index) => [block.dataset.blockId, index]));
    const cache = new Map();
    const blockText = block => {
      if (!cache.has(block)) cache.set(block, writingPeerBlockText(block));
      return cache.get(block);
    };
    const markerMap = new Map([...paper.querySelectorAll("[data-writing-footnote]")]
      .map(marker => [marker.dataset.writingFootnote, marker]));
    for (const entry of entries) {
      const {review} = entry;
      const prose = review.kind === "comment" || review.kind === "highlight";
      entry.spans = prose ? writingPeerSpans(review.current_anchor, blocks, indices, blockText) : [];
      entry.marker = !prose && review.reference_id ? markerMap.get(review.reference_id) : null;
      entry.located = Boolean(entry.marker || entry.spans.length);
      for (const {button, placement} of [entry.margin, entry.index]) {
        button.hidden = !entry.located;
        placement.textContent = entry.located
          ? review.revision !== runtime.revision ? "From an earlier draft" : ""
          : review.status === "unplaced" ? "From the reviewed draft · no matching location"
          : "Location unavailable in the current text";
      }
    }
    const next = JSON.stringify(entries.map(entry => [entry.review.id, entry.located]));
    if (next === listSignature) return;
    listSignature = next;
    const matching = entries.filter(entry => entry.located);
    const missing = entries.filter(entry => !entry.located);
    located.replaceChildren(...matching.map(entry => entry.index.card));
    unplacedList.replaceChildren(...missing.map(entry => entry.index.card));
    unplaced.hidden = !missing.length;
    empty.hidden = Boolean(entries.length);
    indexCount.textContent = String(entries.length);
    indexToggle.setAttribute("aria-label", missing.length
      ? `All ${entries.length} marks, ${missing.length} without a location` : `All ${entries.length} marks`);
  }

  function rectsFor({node, start, end}) {
    if (!node || !paper.contains(node) || node.length < end) return [];
    range.setStart(node, start);
    range.setEnd(node, end);
    return range.getClientRects();
  }

  function svgElement(tag, attributes) {
    const node = doc.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  function paintMargin(candidates, origin, viewport) {
    const page = paper.parentElement.getBoundingClientRect();
    const left = page.right + 18;
    const width = Math.min(336, viewport.right - left - 23);
    const top = viewport.top + 10;
    const indexRequired = width < 220 || viewport.bottom - top < 250 || !entries.some(entry => entry.located);
    // If the author opens a review elsewhere in the draft, let them see its marks right away.
    if (opening) indexRequested = !indexRequired && !candidates.length;
    opening = false;
    indexToggle.hidden = indexRequired;
    indexClose.hidden = indexRequired;
    index.hidden = !(indexRequired || indexRequested);
    indexToggle.setAttribute("aria-expanded", String(!index.hidden));
    margin.hidden = !index.hidden;
    if (margin.hidden) {
      threads.replaceChildren();
      return;
    }
    const laneBottom = Math.min(viewport.bottom, indexToggle.getBoundingClientRect().top) - 10;
    const geometry = [];
    const candidatesByEntry = new Map(candidates.map(source => [source.entry, source]));
    for (const entry of entries) {
      const source = candidatesByEntry.get(entry);
      const {card} = entry.margin;
      card.hidden = !source;
      if (!source) continue;
      card.style.left = `${left - origin.left}px`;
      card.style.width = `${width}px`;
      card.style.maxHeight = `${Math.max(64, Math.min(320, laneBottom - top))}px`;
      geometry.push({entry, source, y: source.y, card, height: card.getBoundingClientRect().height,
        active: entry === active || entry === hovered || card.matches(":focus-within")});
    }
    const slots = writingPeerMarginSlots(geometry, top, laneBottom, 10);
    const shown = new Set(slots.map(slot => slot.item));
    for (const item of geometry) item.card.hidden = !shown.has(item);
    const wires = [];
    for (const {item, top: cardTop} of slots) {
      const {entry, source, card} = item;
      card.style.top = `${cardTop - origin.top}px`;
      const start = {x: source.x - origin.left, y: source.y - origin.top, floor: source.floor - origin.top};
      const port = {x: left - origin.left + 1, y: cardTop - origin.top + Math.min(20, item.height / 2)};
      const wire = svgElement("g", {"data-kind": entry.review.kind});
      if (entry === active || entry === hovered || card.matches(":focus-within")) wire.setAttribute("data-active", "");
      wire.append(svgElement("path", {d: writingPeerThread(start, port, page.right - origin.left - 12)}),
        svgElement("circle", {cx: start.x, cy: start.y, r: 2}),
        svgElement("circle", {cx: port.x, cy: port.y, r: 2.6}));
      wires.push(wire);
    }
    threads.setAttribute("viewBox", `0 0 ${origin.width} ${origin.height}`);
    threads.replaceChildren(...wires);
  }

  function paintMarks() {
    if (panel.hidden || !root.isConnected) return;
    if (rebuild) resolveEntries();
    rebuild = false;
    const origin = overlay.getBoundingClientRect();
    const bounds = well.getBoundingClientRect();
    const viewport = {top: bounds.top + writingViewportInset(well), bottom: bounds.bottom,
      left: bounds.left, right: bounds.right};
    const shown = [];
    const candidates = [];
    const visibility = new Map();
    const inView = block => {
      if (visibility.has(block)) return visibility.get(block);
      const rect = block.getBoundingClientRect();
      const visible = rect.bottom > viewport.top && rect.top < viewport.bottom;
      visibility.set(block, visible);
      return visible;
    };
    for (const entry of entries) {
      let source = null;
      const add = (rect, citation = false) => {
        const left = Math.max(rect.left, viewport.left);
        const top = Math.max(rect.top, viewport.top);
        const width = Math.min(rect.right, viewport.right) - left;
        const height = Math.min(rect.bottom, viewport.bottom) - top;
        if (width <= 0 || height <= 0) return;
        const mark = element("span");
        mark.dataset.kind = entry.review.kind;
        mark.toggleAttribute("data-active", entry === active || entry === hovered);
        mark.toggleAttribute("data-citation", citation);
        Object.assign(mark.style, {
          left: `${left - origin.left}px`, top: `${top - origin.top}px`,
          width: `${width}px`, height: `${height}px`,
        });
        shown.push(mark);
        const x = Math.min(left + width + 4, viewport.right);
        const y = top + height * (citation ? .58 : .86);
        const floor = Math.min(viewport.bottom, top + height + (citation ? 9 : 1));
        if (!source || y < source.y - 4 || (Math.abs(y - source.y) <= 4 && x > source.x)) {
          source = {entry, x, y, floor};
        }
      };
      if (entry.marker) add(entry.marker.getBoundingClientRect(), true);
      for (const span of entry.spans) {
        if (inView(span.block)) for (const rect of rectsFor(span)) add(rect);
      }
      if (source) candidates.push(source);
    }
    marks.replaceChildren(...shown);
    paintMargin(candidates, origin, viewport);
  }

  function schedule(refresh = false) {
    if (panel.hidden) return;
    rebuild ||= refresh;
    if (frame) return;
    frame = view.requestAnimationFrame(() => {
      frame = 0;
      paintMarks();
    });
  }

  function reveal(entry) {
    refreshWritingA4(runtime, true);
    resolveEntries();
    const rect = entry.marker?.getBoundingClientRect() || [...rectsFor(entry.spans[0] || {})]
      .find(candidate => candidate.height > 0);
    if (!rect?.height) return;
    active = entry;
    for (const item of entries) {
      for (const {card, button} of [item.margin, item.index]) {
        card.toggleAttribute("data-active", item === active);
        button.setAttribute("aria-pressed", String(item === active));
      }
    }
    scrollWritingA4Context(well, rect);
    schedule();
  }

  function makeCard(entry) {
    const {review} = entry;
    const card = element("article", undefined, "peer-review-card");
    card.dataset.kind = review.kind;
    card.dataset.peerMarkId = review.id;
    const head = element("header", undefined, "peer-review-byline");
    head.append(element("strong", review.reviewer), element("span", writingPeerLabels[review.kind]));
    card.append(head);
    if (review.reference_label) card.append(element("p", review.reference_label, "peer-review-reference"));
    if (review.reference_text) card.append(element("blockquote", review.reference_text, "peer-review-axiom"));
    if (review.anchor?.quote) card.append(element("blockquote", review.anchor.quote, "peer-review-excerpt"));
    if (review.body) card.append(element("p", review.body, "peer-review-body"));
    const placement = element("p", undefined, "peer-review-placement");
    const button = element("button", review.reference_id ? "Go to citation" : "Go to passage");
    button.type = "button";
    button.hidden = true;
    button.addEventListener("click", () => reveal(entry));
    card.append(placement, button);
    return {card, button, placement};
  }

  function render(reviews) {
    menu.hidden = !runtime.docId;
    if (runtime.docId !== currentDocument) {
      currentDocument = runtime.docId;
      active = null;
      hideShortcut();
      loadSeen();
      list.scrollTop = 0;
    }
    const next = JSON.stringify([currentDocument, runtime.revision, reviews]);
    if (signature !== next) {
      signature = next;
      versions = writingPeerReviewVersions(reviews);
      paintUnread();
      const previous = active?.review.id;
      const focused = panel.getRootNode().activeElement?.closest("[data-peer-mark-id]");
      const inMargin = focused && margin.contains(focused);
      hovered = null;
      entries = (reviews || []).filter(review => Object.hasOwn(writingPeerLabels, review.kind)).map(review => {
        const entry = {review, spans: [], marker: null, located: false};
        entry.margin = makeCard(entry);
        entry.index = makeCard(entry);
        entry.margin.card.hidden = true;
        entry.margin.card.addEventListener("pointerenter", () => { hovered = entry; schedule(); });
        entry.margin.card.addEventListener("pointerleave", () => { hovered = null; schedule(); });
        entry.margin.card.addEventListener("focusin", () => schedule());
        entry.margin.card.addEventListener("focusout", () => schedule());
        return entry;
      });
      active = entries.find(entry => entry.review.id === previous) || null;
      for (const entry of entries) {
        for (const {card, button} of [entry.margin, entry.index]) {
          card.toggleAttribute("data-active", entry === active);
          button.setAttribute("aria-pressed", String(entry === active));
        }
      }
      count.hidden = !entries.length;
      count.textContent = String(entries.length);
      toggle.setAttribute("aria-label", entries.length
        ? `Reader review, ${entries.length} ${entries.length === 1 ? "mark" : "marks"}` : "Reader review");
      listSignature = "";
      margin.replaceChildren(...entries.map(entry => entry.margin.card));
      schedule(true);
      if (focused && !panel.hidden) {
        resolveEntries();
        const entry = entries.find(entry => entry.review.id === focused.dataset.peerMarkId);
        const replacement = !inMargin && entry?.index.button;
        (replacement && !replacement.hidden ? replacement : toggle).focus({preventScroll: true});
      }
    }
  }

  runtime.peerReview = {
    render,
    close() {
      if (panel.hidden) return false;
      setVisible(false);
      return true;
    },
    refresh: () => schedule(),
  };
  menu.addEventListener("click", openReview, {signal});
  toggle.addEventListener("click", () => {
    if (panel.hidden) openReview();
    else setVisible(false, true);
  }, {signal});
  function keepShortcutActive() {
    if (shortcutActivity === null) return;
    const now = Date.now();
    if (now - shortcutActivity >= writingPeerShortcutLifetime) hideShortcut();
    else shortcutActivity = now;
  }
  root.addEventListener("pointerdown", keepShortcutActive, {passive: true, signal});
  root.addEventListener("keydown", keepShortcutActive, {signal});
  view.addEventListener("storage", event => {
    if (event.key !== writingPeerSeenPrefix + currentDocument) return;
    loadSeen();
    paintUnread();
  }, {signal});
  indexToggle.addEventListener("click", () => {
    indexRequested = true;
    paintMarks();
    indexClose.focus({preventScroll: true});
  }, {signal});
  indexClose.addEventListener("click", () => {
    indexRequested = false;
    paintMarks();
    indexToggle.focus({preventScroll: true});
  }, {signal});
  importButton.addEventListener("click", () => send(runtime, "peer-review-import"), {signal});
  panel.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    setVisible(false, true);
  }, {signal});
  well.addEventListener("scroll", () => schedule(), {passive: true, signal});
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => schedule()) : null;
  resize?.observe(well);
  const mutation = new MutationObserver(() => schedule(true));
  mutation.observe(paper, {childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ["style", "data-block-id", "data-a4-page-start", "data-writing-footnote"]});
  signal.addEventListener("abort", () => {
    view.cancelAnimationFrame(frame);
    view.clearTimeout(shortcutTimer);
    resize?.disconnect();
    mutation.disconnect();
  }, {once: true});
}

// A cursor is a stable block ID and a UTF-16 offset into authored content,
// using the same line-break and footnote rules as Studio's undo bookmarks.
const writingCollaborationPresenceLifetime = 15000;

function writingCollaborationPoint(paper, node, offset, end) {
  if (node === paper) {
    const children = [...paper.childNodes];
    const before = children.slice(0, offset).reverse().find(child => child.dataset?.blockId);
    const after = children.slice(offset).find(child => child.dataset?.blockId);
    const block = end ? before || after : after || before;
    return block ? {block_id: block.dataset.blockId, offset: block === before ? writingHistoryLength(block) : 0} : null;
  }
  const point = writingHistoryPoint(paper, node, offset);
  return point?.blockId ? {block_id: point.blockId, offset: point.position} : null;
}

function writingCollaborationSelection(paper) {
  const active = paper.getRootNode().activeElement;
  if (active && !paper.contains(active)) return null;
  const range = writingSelectionRange(paper);
  if (!range) return null;
  const start = writingCollaborationPoint(paper, range.startContainer, range.startOffset, false);
  const end = range.collapsed ? start : writingCollaborationPoint(paper, range.endContainer, range.endOffset, true);
  if (!start || !end) return null;
  const selection = selectionFor(paper);
  const backward = !range.collapsed && (selection?.direction === "backward" ||
    (selection?.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset));
  return backward ? {anchor: end, focus: start} : {anchor: start, focus: end};
}

function writingCollaborationColor(identity) {
  let hash = 0;
  for (const char of String(identity)) hash = Math.imul(hash, 31) + char.codePointAt(0) | 0;
  return `hsl(${(hash >>> 0) % 360} 75% 69%)`;
}

function writingCollaborationCaret(doc, point, scale) {
  const probe = doc.createRange();
  probe.setStart(...point);
  probe.collapse(true);
  const caret = probe.getBoundingClientRect();
  if (caret.height) return caret;

  // A collapsed range in an empty line often has no box. Measure its
  // placeholder break or its line container without inserting a marker.
  const [node, offset] = point;
  const line = node.nodeType === 1 ? node : node.parentElement;
  const adjacentBreak = line.childNodes[offset]?.localName === "br" ? line.childNodes[offset] :
    (line.childNodes[offset - 1]?.localName === "br" ? line.childNodes[offset - 1] : null);
  if (adjacentBreak) {
    const box = adjacentBreak.getBoundingClientRect();
    if (box.height) return box;
  }
  const box = line.getBoundingClientRect();
  if (!box.height) return null;
  const font = doc.defaultView.getComputedStyle(line);
  const lineHeight = (parseFloat(font.lineHeight) || parseFloat(font.fontSize) * 1.2) * scale || box.height;
  const left = font.direction === "rtl" ? box.right : box.left;
  const top = box.top;
  const height = Math.min(box.height, lineHeight);
  return {left, top, bottom: top + height, height};
}

function installWritingCollaborationCursors(runtime) {
  const {paper, controller: {signal}} = runtime;
  const doc = paper.ownerDocument;
  const view = doc.defaultView;
  const well = paper.closest(".page-well");
  const surface = paper.closest(".writing-surface");
  const overlay = doc.createElement("div");
  overlay.className = "writing-collaboration-overlay";
  overlay.setAttribute("aria-hidden", "true");
  surface.append(overlay);
  const presence = doc.createElement("div");
  presence.className = "writing-collaboration-presence";
  presence.setAttribute("role", "status");
  presence.hidden = true;
  surface.append(presence);

  let peers = [];
  let frame = 0;
  let expiry = 0;

  function mark(className, color, left, top, width, height) {
    const node = doc.createElement("span");
    node.className = className;
    node.style.setProperty("--writing-peer-color", color);
    Object.assign(node.style, {left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`});
    return node;
  }

  function paint() {
    if (!peers.length || !paper.isConnected) {
      overlay.replaceChildren();
      return;
    }
    const origin = overlay.getBoundingClientRect();
    const wellBounds = well.getBoundingClientRect();
    const viewport = {
      left: Math.max(wellBounds.left, origin.left), top: Math.max(wellBounds.top, origin.top),
      right: Math.min(wellBounds.right, origin.right), bottom: Math.min(wellBounds.bottom, origin.bottom),
    };
    const blocks = new Map([...paper.children].filter(block => block.dataset.blockId)
      .map((block, index) => [block.dataset.blockId, {block, index}]));
    const lengths = new Map();
    function resolve(point) {
      const value = point && blocks.get(point.block_id);
      if (!value || !Number.isSafeInteger(point.offset) || point.offset < 0) return null;
      if (!lengths.has(value.block)) lengths.set(value.block, writingHistoryLength(value.block));
      if (point.offset > lengths.get(value.block)) return null;
      return {...value, offset: point.offset,
        boundary: writingHistoryBoundary(runtime, {blockId: point.block_id, position: point.offset, forward: true})};
    }

    const highlights = [];
    const carets = [];
    for (const peer of peers) {
      const anchor = resolve(peer.selection?.anchor);
      const focus = resolve(peer.selection?.focus);
      if (!anchor?.boundary || !focus?.boundary) continue;
      const color = writingCollaborationColor(peer.session_id);
      if (anchor.index !== focus.index || anchor.offset !== focus.offset) {
        const backward = anchor.index > focus.index || (anchor.index === focus.index && anchor.offset > focus.offset);
        const [start, end] = backward ? [focus, anchor] : [anchor, focus];
        const range = doc.createRange();
        range.setStart(...start.boundary);
        range.setEnd(...end.boundary);
        for (const rect of writingSelectionRects(paper, range, viewport)) {
          highlights.push(mark("writing-collaboration-highlight", color,
            rect.left - origin.left, rect.top - origin.top, rect.width, rect.height));
        }
      }
      const caret = writingCollaborationCaret(doc, focus.boundary, runtime.a4?.scale || 1);
      if (!caret || caret.left < viewport.left || caret.left > viewport.right ||
          caret.bottom <= viewport.top || caret.top >= viewport.bottom) continue;
      const top = Math.max(caret.top, viewport.top) - origin.top;
      const node = mark("writing-collaboration-caret", color, caret.left - origin.left, top, 2,
        Math.min(caret.bottom, viewport.bottom) - origin.top - top);
      const name = doc.createElement("span");
      name.className = "writing-collaboration-name";
      name.textContent = peer.name || "Collaborator";
      node.toggleAttribute("data-label-below", caret.top < viewport.top + 22);
      node.toggleAttribute("data-label-left", caret.left > viewport.right - 145);
      node.append(name);
      carets.push(node);
    }
    overlay.replaceChildren(...highlights, ...carets);
  }

  function schedule() {
    if (!frame && !signal.aborted) frame = view.requestAnimationFrame(() => {
      frame = 0;
      paint();
    });
  }

  function setPeers(next) {
    if (signal.aborted) return;
    const wasActive = peers.length > 0;
    const current = Array.isArray(next) ? next.filter(peer => peer?.session_id) : [];
    peers = current.filter(peer => peer.selection);
    const names = [...new Map(current.map(peer => [
      peer.account_id || peer.session_id, peer.name || "Collaborator",
    ])).values()].sort((a, b) => a.localeCompare(b));
    const online = names.length > 2 ? `${names[0]} and ${names.length - 1} others are here` :
      (names.length === 2 ? `${names.join(" and ")} are here` : (names.length ? `${names[0]} is here` : ""));
    if (presence.textContent !== online) presence.textContent = online;
    if (presence.hidden !== !online) presence.hidden = !online;
    view.clearTimeout(expiry);
    // A failed poll should never leave permanent presence on the page.
    if (current.length) expiry = view.setTimeout(() => setPeers([]), writingCollaborationPresenceLifetime);
    if (peers.length && !wasActive) {
      layout.observe(surface, {childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ["class", "style", "hidden"]});
      resized?.observe(well);
      resized?.observe(paper);
    } else if (wasActive && !peers.length) {
      layout.disconnect();
      resized?.disconnect();
    }
    if (peers.length || wasActive) schedule();
  }

  const layout = new view.MutationObserver(records => {
    if (peers.length && records.some(record => !overlay.contains(record.target) && !presence.contains(record.target))) {
      schedule();
    }
  });
  const resized = typeof view.ResizeObserver === "function" ? new view.ResizeObserver(() => {
    if (peers.length) schedule();
  }) : null;
  well.addEventListener("scroll", () => { if (peers.length) schedule(); }, {passive: true, signal});
  view.addEventListener("resize", () => { if (peers.length) schedule(); }, {passive: true, signal});
  signal.addEventListener("abort", () => {
    view.clearTimeout(expiry);
    view.cancelAnimationFrame(frame);
    layout.disconnect();
    resized?.disconnect();
    overlay.remove();
    presence.remove();
  }, {once: true});

  return {getSelection: () => writingCollaborationSelection(paper), setPeers};
}

// Shared drafts use CARE Remote as their only saved copy. The ordinary editor
// stays mounted and only receives changes to the blocks that actually changed.
const writingSharedAction = new Set(["delete-footnotes", "move-footnote", "history-footnotes", "clipboard-footnotes"]);
const writingSharedLocalOnly = new Set(["paste-cited", "axiom-notes"]);
const writingSharedPoll = 800;
const writingSharedSave = 220;

function writingCollaborationEditable(runtime) {
  if (!writingSharedDocument(runtime.docId)) return true;
  const role = runtime.collaboration?.base?.role || runtime.collaboration?.config?.role;
  return role === "editor" || role === "owner";
}

function writingSharedNotice(runtime, message) {
  status(runtime, message);
}

function writingSharedSnapshot(runtime) {
  const {html, title, footnote_notes} = capture(runtime);
  return {html, title: title.trim() || "Untitled", ...(footnote_notes && {footnote_notes})};
}

function writingSharedBodyEqual(left, right) {
  return left?.html === right?.html && left?.title === right?.title;
}

function writingSharedFragment(document, html) {
  const fragment = safeFragment(html, true);
  const container = document.createElement("div");
  container.append(fragment);
  return container;
}

function writingSharedBlockTexts(document, html, withBreaks = true) {
  const container = writingSharedFragment(document, html);
  return new Map([...container.children].map(block => [block.dataset.blockId, writingSharedBlockText(block, withBreaks)]));
}

function writingSharedBlockText(block, withBreaks) {
  if (!withBreaks && !block.querySelector(inlineFootnote + "," + a4Break)) return block.textContent;
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.data;
    if (writingHistoryDecoration(node)) return "";
    if (node.localName === "br") return withBreaks ? "\n" : "";
    return [...node.childNodes].map(visit).join("");
  }
  return visit(block);
}

function writingSharedPosition(point, before, after) {
  if (!point?.blockId) return point;
  if (!after.has(point.blockId) || !before.has(point.blockId)) return null;
  const original = before.get(point.blockId), latest = after.get(point.blockId);
  if (original === latest) return point;
  return {...point, position: writingMerge.rebaseTextOffset(original, latest, point.position)};
}

function writingSharedBookmark(bookmark, before, after) {
  if (!bookmark) return null;
  const start = writingSharedPosition(bookmark.start, before, after);
  const end = writingSharedPosition(bookmark.end, before, after);
  return start && end ? {...bookmark, start, end} : null;
}

function writingSharedPositions(positions, before, after) {
  const result = {};
  for (const [id, [blockId, position, order]] of Object.entries(positions || {})) {
    const mapped = writingSharedPosition({blockId, position}, before, after);
    if (mapped) result[id] = [blockId, mapped.position, order];
  }
  return result;
}

function rebaseWritingSharedHistory(runtime, before, latest) {
  const history = runtime.editHistory;
  if (!history || before === latest) return;
  const {ownerDocument: doc} = runtime.paper;
  const base = {title: "", html: before}, shared = {title: "", html: latest};
  function rebase(entry) {
    const html = writingMerge.mergeDraft(doc, base, shared, {title: "", html: entry.html}).html;
    const beforeText = writingSharedBlockTexts(doc, entry.html), afterText = writingSharedBlockTexts(doc, html);
    const positions = writingSharedPositions(entry.positions, beforeText, afterText);
    const footnotes = entry.footnotes && {...entry.footnotes};
    if (footnotes) {
      for (const key of ["positions", "inversePositions", "restorePositions", "deletePositions"]) {
        if (footnotes[key]) footnotes[key] = writingSharedPositions(footnotes[key], beforeText, afterText);
      }
    }
    return {...entry, html, positions, bookmark: writingSharedBookmark(entry.bookmark, beforeText, afterText),
      ...(footnotes && {footnotes})};
  }
  for (const key of ["undo", "redo"]) {
    const transformed = [];
    for (const entry of history[key].slice().reverse()) {
      try { transformed.unshift(rebase(entry)); }
      catch (error) {
        if (!(error instanceof writingMerge.DraftMergeConflict)) throw error;
        // An older undo that overlaps a collaborator's change is no longer safe.
        break;
      }
    }
    history[key] = transformed;
  }
  history.current = {...rebase({...history.current, html: before}), html: latest};
  history.pending = null;
  history.group = null;
}

function writingSharedReferences(draft, html = draft.html) {
  const doc = document;
  const saved = writingSharedBlockTexts(doc, draft.html);
  const current = html === draft.html ? saved : writingSharedBlockTexts(doc, html);
  return (Array.isArray(draft.references) ? draft.references : []).map(reference => {
    if (reference.target) return reference;
    const raw = saved.get(reference.block_id);
    // Reader packets store Unicode code-point offsets; Studio counts UTF-16 and BRs.
    const offset = raw == null || !Number.isSafeInteger(reference.offset) ? null :
      Array.from(raw).slice(0, reference.offset).join("").length;
    const marker = offset == null ? null :
      writingSharedPosition({blockId: reference.block_id, position: offset}, saved, current);
    return {
      id: reference.id, item_id: reference.item_id,
      block_id: marker?.blockId || null, marker_offset: marker?.position ?? null,
      marker_order: Number.isSafeInteger(reference.number) ? reference.number - 1 : null,
      note: reference.note || "", shared_citation: reference.citation || "",
      shared_library_url: reference.library_url || "",
      target: {kind: reference.kind, item_id: reference.item_id, label: reference.label || reference.item_id,
        text: reference.text || "", target_key: "shared:" + reference.id},
    };
  });
}

function paintWritingSharedReferenceCards(runtime) {
  const previous = runtime.sharedReferenceCards || new Map();
  const next = new Map(), nodes = [];
  for (const ref of runtime.references) {
    let entry = previous.get(ref.id);
    if (!entry) {
      const {card, actions} = resultCard(ref);
      const locate = makeButton("Go to passage", () => {
        const current = runtime.references.find(row => row.id === ref.id);
        if (current?.block_id) jump(runtime, current.block_id, current);
      });
      const remove = makeButton("Remove link", () => {
        if (canChangeFootnotes(runtime)) deleteFootnotes(runtime, [ref.id]);
      });
      actions.append(locate, remove);
      if (safeHref(ref.shared_library_url)) actions.prepend(makeButton("Open source", () => openFootnote(runtime, ref.id)));
      const location = element("p", "", "reference-location");
      const details = element("details", undefined, "result-note");
      const summary = element("summary");
      const note = element("textarea");
      const save = makeButton("Save note", () => {
        if (entry.conflict && !window.confirm("Another collaborator changed this note. Save your version over it?")) return;
        entry.conflict = false;
        send(runtime, "note", {reference_id: ref.id, note: note.value});
      });
      note.setAttribute("aria-label", "Note on this use");
      note.rows = 3;
      note.maxLength = 10000;
      note.value = ref.note || "";
      details.append(summary, note, save);
      card.append(location);
      if (ref.shared_citation) card.append(element("p", ref.shared_citation, "reference-location"));
      card.append(details);
      entry = {card, locate, location, remove, note, summary, save, saved: note.value};
    }
    const currentNote = ref.note || "";
    if (entry.saved !== currentNote) {
      if (entry.note.value === entry.saved || entry.note.value === currentNote) {
        entry.note.value = currentNote;
        entry.conflict = false;
      } else entry.conflict = true;
      entry.saved = currentNote;
    }
    entry.summary.textContent = currentNote ? "Edit note on this use" : "Add note on this use";
    entry.locate.hidden = !ref.block_id || !findBlock(runtime, ref.block_id);
    entry.location.textContent = entry.locate.hidden ? "This passage has been removed from the draft." : "Linked to this draft";
    entry.note.readOnly = entry.save.disabled = entry.remove.disabled = !writingCollaborationEditable(runtime);
    next.set(ref.id, entry);
    nodes.push(entry.card);
  }
  runtime.sharedReferenceCards = next;
  if (!nodes.length) nodes.push(element("p", "References you link to this shared draft will appear here.", "empty-results"));
  const {referenceList} = runtime;
  let last = null;
  for (const node of nodes) {
    const position = last ? last.nextSibling : referenceList.firstChild;
    if (node !== position) referenceList.insertBefore(node, position);
    last = node;
  }
  while (last?.nextSibling) last.nextSibling.remove();
}

function patchWritingSharedDraft(runtime, draft, snapshot, options = {}) {
  const before = writingSharedSnapshot(runtime);
  const doc = runtime.paper.ownerDocument, {paper} = runtime;
  const active = paper.getRootNode().activeElement || doc.activeElement;
  const changed = before.html !== snapshot.html;
  const range = writingSelectionRange(paper);
  const liveBookmark = active === paper && range && writingHistoryBookmark(runtime, range);
  const savedBookmark = writingHistoryBookmark(runtime, runtime.range);
  const note = active?.closest?.("[data-footnote-note]");
  const noteId = note?.dataset.footnoteNote;
  const noteSelection = note && footnoteNoteSelection(note);
  const notes = new Map(Object.entries(snapshot.footnote_notes || {}));
  runtime.footnoteNotes = notes;

  if (runtime.title.value !== snapshot.title && !(active === runtime.title && before.title === snapshot.title)) {
    const {value, selectionStart, selectionEnd, selectionDirection} = runtime.title;
    runtime.title.value = snapshot.title;
    if (active === runtime.title) runtime.title.setSelectionRange(
      writingMerge.rebaseTextOffset(value, snapshot.title, selectionStart),
      writingMerge.rebaseTextOffset(value, snapshot.title, selectionEnd), selectionDirection,
    );
  }

  if (changed) {
    if (!options.resetHistory) rebaseWritingSharedHistory(runtime, before.html, snapshot.html);
    const target = writingSharedFragment(doc, snapshot.html);
    // Compare with the actual clean snapshot, including markup that the
    // server just normalized. Sanitizing both sides here keeps the old DOM
    // when it still differs from the saved copy, causing repeated no-op saves.
    const original = doc.createElement("template");
    original.innerHTML = before.html;
    const originals = new Map([...original.content.children].map(block => [block.dataset.blockId, block.outerHTML]));
    const existing = new Map([...paper.children].map(block => [block.dataset.blockId, block]));
    let previous = null;
    for (const block of [...target.children]) {
      const key = block.dataset.blockId;
      const old = existing.get(key);
      const next = old && originals.get(key) === block.outerHTML ? old : block;
      const position = previous ? previous.nextSibling : paper.firstChild;
      if (next !== position) paper.insertBefore(next, position);
      previous = next;
    }
    while (previous?.nextSibling) previous.nextSibling.remove();
    if (!previous) paper.replaceChildren();
    normalizeBlocks(paper);
    runtime.blocks = new Map([...paper.children].map(block => [block.dataset.blockId, blockText(block)]));
  }

  const references = writingSharedReferences(draft, snapshot.html);
  const old = new Map(runtime.references.map(reference => [reference.id, reference]));
  const refsChanged = JSON.stringify(references) !== JSON.stringify(runtime.references);
  if (refsChanged) {
    for (const marker of paper.querySelectorAll(inlineFootnote)) {
      const ref = references.find(row => row.id === marker.dataset.writingFootnote);
      const prior = old.get(marker.dataset.writingFootnote);
      const location = footnoteLocation(paper, footnoteBoundary(marker));
      if (!ref || (ref.block_id !== prior?.block_id || ref.marker_offset !== prior?.marker_offset) &&
          (ref.block_id !== location?.[0] || ref.marker_offset !== location?.[1])) marker.remove();
    }
    runtime.references = references;
  }
  runtime.snapshot = null;
  if (changed || refsChanged || noteId && options.resetHistory) {
    if (refsChanged) paintReferences(runtime);
    updatePaper(runtime);
    if (changed) {
      const beforeText = writingSharedBlockTexts(doc, before.html);
      const afterText = writingSharedBlockTexts(doc, snapshot.html);
      const mapped = writingSharedBookmark(liveBookmark || savedBookmark, beforeText, afterText);
      if (liveBookmark) restoreWritingHistoryBookmark(runtime, mapped);
      else if (mapped) {
        const start = writingHistoryBoundary(runtime, mapped.start), end = writingHistoryBoundary(runtime, mapped.end);
        runtime.range = start && end ? doc.createRange() : null;
        if (runtime.range) {
          runtime.range.setStart(...start);
          runtime.range.setEnd(...end);
        }
      } else runtime.range = null;
    }
    if (noteId && !active.isConnected) {
      const field = [...runtime.root.querySelectorAll("[data-footnote-note]")]
        .find(node => node.dataset.footnoteNote === noteId);
      field?.focus({preventScroll: true});
      if (field && noteSelection) restoreFootnoteNoteSelection(field, noteSelection);
    }
  }
  if (options.resetHistory) resetWritingHistory(runtime);
}

function setWritingSharedStatus(state, message) {
  if (state.runtime.collaboration !== state) return;
  if (state.runtime.status.textContent !== message) status(state.runtime, message);
}

function writingSharedURL(config) {
  const url = new URL(config.url, document.baseURI);
  if (url.origin !== window.location.origin ||
      url.pathname !== "/__care_studio_sync/drafts/" + config.id || url.search || url.hash) throw new Error("Invalid shared draft address");
  return url.pathname;
}

async function requestWritingShared(state, suffix = "", method = "GET", body, options = {}) {
  const result = await fetch(state.url + suffix, {
    method, cache: "no-store", credentials: "same-origin", redirect: "error",
    headers: {"X-Care-Studio-Capability": state.config.capability,
      ...(body ? {"Content-Type": "application/json"} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}),
    ...(options.keepalive ? {keepalive: true} : {signal: state.controller.signal}),
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw Object.assign(new Error(data.error || "The shared draft is unavailable."), {status: result.status, data});
  return data;
}

function normalizeWritingShared(state, draft) {
  if (draft?.id !== state.config.id || !Number.isSafeInteger(draft.revision) || draft.revision < 1 ||
      typeof draft.title !== "string" || typeof draft.html !== "string") throw new Error("Invalid shared draft");
  const container = writingSharedFragment(state.runtime.paper.ownerDocument, draft.html);
  normalizeBlocks(container);
  return {id: draft.id, title: draft.title, html: container.innerHTML, revision: draft.revision,
    role: draft.role, references: Array.isArray(draft.references) ? draft.references : []};
}

function writingSharedDirty(state, local = writingSharedSnapshot(state.runtime)) {
  return !writingSharedBodyEqual(state.base, local) || Object.keys(local.footnote_notes || {}).length ||
    Boolean(state.operation || state.outgoing);
}

function journalWritingShared(state, local = writingSharedSnapshot(state.runtime)) {
  try {
    if (writingSharedDirty(state, local) || state.conflict) {
      localStorage.setItem(state.journal, JSON.stringify({writer: state.session, base: state.base, local,
        outgoing: state.outgoing, operation: state.operation, conflict: state.conflict}));
    } else if (JSON.parse(localStorage.getItem(state.journal) || "null")?.writer === state.session) {
      localStorage.removeItem(state.journal);
    }
    state.storageFailed = false;
  } catch { state.storageFailed = true; }
}

function setWritingSharedConflict(state, message) {
  state.conflict = true;
  state.after = null;
  state.runtime.collaborationPanel.hidden = false;
  state.runtime.collaborationMessage.textContent = message;
  state.runtime.collaborationRetry.hidden = true;
  setNavigationLock(state.runtime, false);
  journalWritingShared(state);
  setWritingSharedStatus(state, state.storageFailed ? "Copy your edits before closing" : "Your edits are kept on this device");
}

function adoptWritingShared(state, latest, previous, local) {
  const {runtime} = state;
  const merged = writingMerge.mergeDraft(runtime.paper.ownerDocument, previous, latest, local);
  const previousNotes = new Map((previous.references || state.base.references).map(ref => [ref.id, ref.note || ""]));
  const latestNotes = new Map(latest.references.map(ref => [ref.id, ref.note || ""]));
  const notes = {};
  for (const [identity, note] of Object.entries(local.footnote_notes || {})) {
    if (latestNotes.get(identity) === note) continue;
    if (!latestNotes.has(identity) || previousNotes.get(identity) !== latestNotes.get(identity)) {
      throw new writingMerge.DraftMergeConflict();
    }
    notes[identity] = note;
  }
  if (Object.keys(notes).length) merged.footnote_notes = notes;
  state.base = latest;
  state.presenceTexts = null;
  runtime.base = {title: latest.title, html: latest.html};
  runtime.revision = latest.revision;
  patchWritingSharedDraft(runtime, latest, merged);
  setNavigationLock(runtime, Boolean(state.after?.lock || state.operation));
  journalWritingShared(state);
}

function rejectWritingSharedOperation(state, reason) {
  const {runtime} = state;
  if (!state.operation) return;
  const {type} = state.operation;
  state.operation = null;
  runtime.removingFootnotes = null;
  if (type === "clipboard-footnotes") acknowledgeWritingClipboard(runtime, {error: reason});
  if (type === "delete-footnotes") acknowledgeWritingFootnoteDeletion(runtime, false);
  if (type === "history-footnotes" && runtime.editHistory) runtime.editHistory.footnoteReplay = null;
  // The body can still be edited. Restore the saved references and their
  // mapped anchors so an unsuccessful metadata write never deletes a note.
  patchWritingSharedDraft(runtime, state.base, writingSharedSnapshot(runtime));
  setNavigationLock(runtime, false);
}

function finishWritingSharedOperation(state, accepted) {
  const {runtime, operation} = state;
  if (!operation) return;
  state.operation = null;
  runtime.removingFootnotes = null;
  const {type} = operation;
  if (type === "clipboard-footnotes") acknowledgeWritingClipboard(runtime, {});
  if (type === "delete-footnotes") acknowledgeWritingFootnoteDeletion(runtime, true);
  if (type === "history-footnotes") acknowledgeWritingFootnoteHistory(runtime, {}, accepted);
}

function writingSharedOperationPayload(type, extra, positions) {
  if (type === "move-footnote") return {footnote_positions: positions};
  const result = {};
  for (const key of ["footnote_positions", "removed_footnotes", "restored_footnotes", "pasted_footnotes"]) {
    if (Object.hasOwn(extra, key)) result[key] = extra[key];
  }
  if (!result.footnote_positions && positions) result.footnote_positions = positions;
  return result;
}

function writingSharedSavePayload(pending, account) {
  return {revision: pending.base.revision, title: pending.local.title, html: pending.local.html,
    mutation_id: pending.mutation, account_id: account, ...pending.operation?.payload,
    ...(pending.local.footnote_notes && {footnote_notes: pending.local.footnote_notes})};
}

async function syncWritingSharedOnce(state) {
  const {runtime} = state;
  const local = writingSharedSnapshot(runtime);
  const dirty = writingSharedDirty(state, local);
  if (state.rejected && same(state.rejected, local)) return;
  if (!state.outgoing && dirty && writingCollaborationEditable(runtime)) {
    const operation = state.operation;
    state.outgoing = {base: state.base, local: operation?.snapshot || local, mutation: id(), operation};
    journalWritingShared(state);
  }
  const pending = state.outgoing;
  try {
    const response = pending
      ? await requestWritingShared(state, "", "PUT", writingSharedSavePayload(pending, state.config.account_id))
      : await requestWritingShared(state);
    if (runtime.collaboration !== state || !runtime.root.isConnected) return;
    const latest = normalizeWritingShared(state, response);
    // Never mutate the live DOM during an IME composition.
    if (runtime.composing || runtime.composingFootnote || runtime.pending) return;
    if (pending) {
      state.outgoing = null;
      // Exact submitted notes are acknowledged; edits made in flight still
      // rebase against the submitted note values.
      const submitted = new Map(Object.entries(pending.local.footnote_notes || {}));
      for (const [identity, note] of submitted) {
        if (runtime.footnoteNotes.get(identity) === note) runtime.footnoteNotes.delete(identity);
      }
      runtime.snapshot = null;
      const prior = {...pending.local, references: pending.base.references.map(ref =>
        submitted.has(ref.id) ? {...ref, note: submitted.get(ref.id)} : ref)};
      if (pending.operation) finishWritingSharedOperation(state, latest);
      adoptWritingShared(state, latest, prior, writingSharedSnapshot(runtime));
    } else if (latest.revision !== state.base.revision || latest.role !== state.base.role ||
        !writingSharedBodyEqual(state.base, latest) || JSON.stringify(latest.references) !== JSON.stringify(state.base.references)) {
      if (state.operation) throw new writingMerge.DraftMergeConflict();
      adoptWritingShared(state, latest, state.base, writingSharedSnapshot(runtime));
    }
    state.rejected = null;
    runtime.collaborationPanel.hidden = true;
    if (writingSharedDirty(state)) {
      setWritingSharedStatus(state, "Saving shared edits…");
      queueWritingShared(state);
    } else {
      setWritingSharedStatus(state, writingCollaborationEditable(runtime) ? "Saved to shared draft" : "Shared draft · read only");
      if (state.after) {
        const {run} = state.after;
        state.after = null;
        setNavigationLock(runtime, false);
        run();
      }
    }
  } catch (error) {
    if (runtime.collaboration !== state || !runtime.root.isConnected) return;
    if (error.status === 409 && pending && error.data?.draft) {
      if (runtime.composing || runtime.composingFootnote || runtime.pending) return;
      try {
        state.outgoing = null;
        if (pending.operation) throw new writingMerge.DraftMergeConflict();
        const latest = normalizeWritingShared(state, error.data.draft);
        adoptWritingShared(state, latest, pending.base, writingSharedSnapshot(runtime));
        queueWritingShared(state, 0);
        return;
      } catch (conflict) { error = conflict; }
    }
    if (error instanceof writingMerge.DraftMergeConflict) {
      setWritingSharedConflict(state, "Both versions changed the same part of this draft. Copy your version before loading the shared one.");
      return;
    }
    if (pending && [400, 413, 415, 422].includes(error.status)) {
      state.outgoing = null;
      rejectWritingSharedOperation(state, error.message);
      state.rejected = writingSharedSnapshot(runtime);
      state.after = null;
      setNavigationLock(runtime, false);
      runtime.collaborationPanel.hidden = false;
      runtime.collaborationMessage.textContent = error.message;
      runtime.collaborationRetry.hidden = false;
    }
    if ([401, 403, 404].includes(error.status)) {
      state.after = null;
      if (dirty) {
        runtime.collaborationPanel.hidden = false;
        runtime.collaborationMessage.textContent = "The shared draft is unavailable. You can copy your unsynced edits.";
        runtime.collaborationRetry.hidden = false;
      }
      setNavigationLock(runtime, Boolean(state.operation));
      setWritingSharedStatus(state, "Shared draft unavailable · check your CARE Remote connection");
    } else {
      journalWritingShared(state);
      setWritingSharedStatus(state, state.storageFailed && writingSharedDirty(state)
        ? "Could not sync · copy your edits before closing" : "Could not sync shared draft · retrying");
    }
  }
}

function syncWritingShared(state) {
  const {runtime} = state;
  if (state.running || state.resetting || runtime.pending || runtime.composing || runtime.composingFootnote || state.conflict ||
      !runtime.root.isConnected || runtime.collaboration !== state) return;
  state.running = syncWritingSharedOnce(state).finally(() => { state.running = null; });
}

function queueWritingShared(state, delay = writingSharedSave) {
  clearTimeout(state.timer);
  if (!state.conflict) state.timer = setTimeout(() => syncWritingShared(state), delay);
}

function writingSharedPresenceSelection(state, selection, toServer) {
  if (!selection) return null;
  const {runtime} = state;
  const saved = state.presenceTexts ||= writingSharedBlockTexts(runtime.paper.ownerDocument, state.base.html);
  function map(point) {
    const block = point && findBlock(runtime, point.block_id);
    const accepted = point && saved.get(point.block_id);
    if (!block || accepted == null || !Number.isSafeInteger(point.offset)) return null;
    const displayed = writingSharedBlockText(block, true);
    const [before, after] = toServer ? [displayed, accepted] : [accepted, displayed];
    return {block_id: point.block_id, offset: writingMerge.rebaseTextOffset(before, after, Math.min(point.offset, before.length))};
  }
  const anchor = map(selection.anchor), focus = map(selection.focus);
  return anchor && focus ? {anchor, focus} : null;
}

async function updateWritingSharedPresence(state) {
  const {runtime} = state;
  if (state.presencePending || runtime.collaboration !== state || !runtime.root.isConnected) return;
  state.presencePending = true;
  const revision = state.base.revision;
  try {
    const selection = state.conflict || runtime.composing || runtime.composingFootnote ? null :
      writingSharedPresenceSelection(state, runtime.collaborationCursors?.getSelection(), true);
    const response = await requestWritingShared(state, "/presence", "POST",
      {session_id: state.session, account_id: state.config.account_id, revision, selection});
    if (runtime.collaboration === state) {
      runtime.collaborationCursors?.setPeers((response.peers || []).map(peer => ({...peer,
        selection: peer.revision === state.base.revision && !state.conflict
          ? writingSharedPresenceSelection(state, peer.selection, false) : null})));
    }
  } catch {
    if (runtime.collaboration === state) runtime.collaborationCursors?.setPeers([]);
  } finally { state.presencePending = false; }
}

function stopWritingCollaboration(runtime) {
  const state = runtime.collaboration;
  if (!state) return;
  journalWritingShared(state);
  runtime.collaboration = null;
  runtime.collaborationCursors?.setPeers([]);
  runtime.collaborationPanel.hidden = true;
  clearTimeout(state.timer);
  clearInterval(state.poll);
  clearInterval(state.presence);
  state.controller.abort();
  void requestWritingShared(state, "/presence", "POST",
    {session_id: state.session, account_id: state.config.account_id, active: false}, {keepalive: true}).catch(() => {});
}

function startWritingCollaboration(runtime, config, document) {
  if (!writingSharedDocument(runtime.docId)) return;
  if (!config || config.id !== runtime.docId.slice(7) || typeof config.capability !== "string" || !config.capability) {
    setNavigationLock(runtime, false);
    writingSharedNotice(runtime, "Shared draft unavailable · connect to CARE Remote");
    return;
  }
  const active = runtime.collaboration;
  if (active?.config.id === config.id && active.config.account_id === config.account_id) {
    active.config = config;
    if (!runtime.pending && writingSharedDirty(active) && !active.after) queueWritingShared(active);
    return;
  }
  if (active) stopWritingCollaboration(runtime);
  let url;
  try { url = writingSharedURL(config); }
  catch { writingSharedNotice(runtime, "Shared draft unavailable · check your CARE Remote connection"); return; }
  const state = {runtime, config, url, session: id(), controller: new AbortController(),
    journal: "care-studio-shared-v1:" + (config.account_id || "") + ":" + config.id};
  runtime.collaboration = state;
  try {
    state.base = normalizeWritingShared(state, {...document, id: config.id, role: config.role, references: config.references});
  } catch {
    runtime.collaboration = null;
    writingSharedNotice(runtime, "This shared draft could not open");
    return;
  }
  runtime.base = {title: state.base.title, html: state.base.html};
  patchWritingSharedDraft(runtime, state.base, runtime.base);
  paintWritingSharedReferenceCards(runtime);
  setNavigationLock(runtime, false);
  setWritingSharedStatus(state, "Connecting to shared draft…");
  try {
    const saved = JSON.parse(localStorage.getItem(state.journal) || "null");
    if (saved?.local && saved.base?.id === config.id) {
      state.base = normalizeWritingShared(state, saved.base);
      runtime.base = {title: state.base.title, html: state.base.html};
      runtime.revision = state.base.revision;
      state.outgoing = saved.outgoing || null;
      state.operation = saved.operation || null;
      patchWritingSharedDraft(runtime, state.base, {...saved.local,
        html: writingSharedFragment(runtime.paper.ownerDocument, saved.local.html).innerHTML}, {resetHistory: true});
      if (saved.conflict) setWritingSharedConflict(state, "Your edits are still here. Copy them before loading the shared version.");
      if (state.operation && !state.conflict) setNavigationLock(runtime, true);
      journalWritingShared(state);
    }
  } catch { /* The current saved draft can still open without local recovery. */ }
  state.poll = setInterval(() => syncWritingShared(state), writingSharedPoll);
  state.presence = setInterval(() => void updateWritingSharedPresence(state), writingSharedPoll);
  syncWritingShared(state);
  void updateWritingSharedPresence(state);
}

function deferWritingShared(state, run, lock = false) {
  const {runtime} = state;
  if (state.conflict) {
    runtime.collaborationPanel.scrollIntoView({block: "nearest"});
    return true;
  }
  if (!writingSharedDirty(state) && !state.running) return false;
  if (!state.after || lock && !state.after.lock) state.after = {run, lock};
  if (lock) setNavigationLock(runtime, true);
  setWritingSharedStatus(state, "Saving shared edits…");
  queueWritingShared(state, 0);
  return true;
}

function handleWritingSharedAction(runtime, type, extra, authoredSnapshot, run) {
  if (!writingSharedDocument(runtime.docId)) return false;
  const state = runtime.collaboration;
  if (writingSharedLocalOnly.has(type)) {
    writingSharedNotice(runtime, "New Library references can be added in a private draft.");
    return true;
  }
  if (type === "reload") {
    if (state) void loadWritingSharedVersion(state);
    return true;
  }
  if (type === "save") {
    if (state && !state.conflict) {
      state.rejected = null;
      queueWritingShared(state, 0);
    }
    return true;
  }
  if (type === "note") {
    if (state && writingCollaborationEditable(runtime) && !state.operation && !state.conflict &&
        runtime.references.some(reference => reference.id === extra.reference_id)) {
      runtime.footnoteNotes.set(extra.reference_id, String(extra.note || "").slice(0, 10000));
      runtime.snapshot = null;
      writingSharedEdited(runtime);
      updatePaper(runtime);
      queueWritingShared(state, 0);
    }
    return true;
  }
  if (writingSharedAction.has(type)) {
    if (!state || !writingCollaborationEditable(runtime) || state.operation || state.conflict) return true;
    const snapshot = authoredSnapshot || writingSharedSnapshot(runtime);
    const positions = Object.hasOwn(extra, "footnote_positions") ? null : footnotePositions(runtime, extra.reference_id);
    state.operation = {type, snapshot: {title: snapshot.title.trim() || "Untitled", html: snapshot.html, footnote_notes: snapshot.footnote_notes},
      payload: writingSharedOperationPayload(type, extra, positions)};
    journalWritingShared(state);
    setNavigationLock(runtime, true);
    queueWritingShared(state, 0);
    return true;
  }
  return Boolean(state && deferWritingShared(state, run, navigationActions.has(type)));
}

function writingSharedEdited(runtime) {
  const state = runtime.collaboration;
  if (!state) return;
  if (state.rejected && !same(state.rejected, writingSharedSnapshot(runtime))) state.rejected = null;
  journalWritingShared(state);
  if (!state.conflict) setWritingSharedStatus(state, "Unsaved shared edits");
}

async function loadWritingSharedVersion(state) {
  const {runtime} = state;
  if (state.resetting || runtime.collaboration !== state) return;
  if (writingSharedDirty(state) && !window.confirm("Load the shared version and discard edits that have not synced?")) return;
  state.resetting = true;
  try {
    const latest = normalizeWritingShared(state, await requestWritingShared(state));
    if (runtime.collaboration !== state) return;
    state.conflict = false;
    state.rejected = null;
    state.outgoing = null;
    state.operation = null;
    state.after = null;
    state.base = latest;
    state.presenceTexts = null;
    runtime.clipboardEdit = null;
    runtime.removingFootnotes = null;
    runtime.base = {title: latest.title, html: latest.html};
    runtime.revision = latest.revision;
    runtime.collaborationPanel.hidden = true;
    patchWritingSharedDraft(runtime, latest, runtime.base, {resetHistory: true});
    setNavigationLock(runtime, false);
    try { localStorage.removeItem(state.journal); } catch { /* The server version is still loaded. */ }
    journalWritingShared(state);
    setWritingSharedStatus(state, "Loaded shared version");
  } catch {
    setWritingSharedStatus(state, "Could not load the shared version · your edits are still here");
  } finally { state.resetting = false; }
}

function installWritingCollaboration(runtime) {
  const {root, controller} = runtime;
  runtime.collaborationCursors = installWritingCollaborationCursors(runtime);
  runtime.collaborationPanel = root.querySelector("[data-collaboration-recovery]");
  runtime.collaborationMessage = root.querySelector("[data-collaboration-message]");
  runtime.collaborationRetry = root.querySelector("[data-collaboration-retry]");
  const options = {signal: controller.signal};
  root.querySelector("[data-collaboration-copy]").addEventListener("click", () => void copyText(runtime), options);
  root.querySelector("[data-collaboration-load]").addEventListener("click", () => {
    if (runtime.collaboration) void loadWritingSharedVersion(runtime.collaboration);
  }, options);
  runtime.collaborationRetry.addEventListener("click", () => {
    if (runtime.collaboration) {
      runtime.collaboration.rejected = null;
      queueWritingShared(runtime.collaboration, 0);
    }
  }, options);
  controller.signal.addEventListener("abort", () => stopWritingCollaboration(runtime), {once: true});
}

// Match the visible prose across the editable and read-only renderers by block ID.
function rememberWritingModePosition(view, mode, draft, scroller, blocks, attribute, top = 0) {
  if (!draft || !scroller) return;
  const first = scroller.scrollTop > 1 && Array.from(blocks).find(block => block.getBoundingClientRect().bottom > top + 1);
  const rect = first && first.getBoundingClientRect();
  view.careWritingModePosition = {
    mode, draft, time: Date.now(), block: first ? first.getAttribute(attribute) : "",
    ratio: rect && rect.height ? (top - rect.top) / rect.height : 0,
  };
}

function takeWritingModePosition(view, mode, draft) {
  const position = view.careWritingModePosition;
  if (position?.mode !== mode || position.draft !== draft) return null;
  delete view.careWritingModePosition;
  return Date.now() - position.time < 30_000 ? position : null;
}

function restoreWritingModePosition(position, scroller, block, top = 0) {
  const rect = block?.getBoundingClientRect();
  // A paragraph can wrap differently in the two modes. Keep the same part of it in view.
  scroller.scrollTop = rect ? scroller.scrollTop + rect.top + rect.height * position.ratio - top : 0;
}

const instances = new WeakMap();
const recovery = new Map();
const blockTags = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "ul", "ol", "hr", "table"]);
const inlineTags = new Set(["b", "strong", "i", "em", "u", "s", "strike", "br", "code", "a", "li", "del", "mark", "sub", "sup", "tbody", "thead", "tr", "td", "th"]);
const ignoredTags = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "img", "video", "audio", "form", "button"]);
const paragraphStarters = new Map([
  ["#", ["formatBlock", "h1"]],
  ["##", ["formatBlock", "h2"]],
  ["###", ["formatBlock", "h3"]],
  [">", ["formatBlock", "blockquote"]],
  ["-", ["insertUnorderedList", null]],
  ["1.", ["insertOrderedList", null]],
]);
const paragraphStyles = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre"]);
const paragraphAlignments = new Set(["left", "center", "right", "justify"]);
const inlineFootnote = "[data-writing-footnote]";
const textOf = node => node.matches?.(".paper") ? [...node.children].map(blockText).filter(Boolean).join(" ") : blockText(node);
const blockText = node => writingProseText(node).replace(/\s+/g, " ").trim();
const id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
const writingSharedDocument = id => typeof id === "string" && /^shared-[a-f0-9]{32}$/.test(id);
const navigationActions = new Set([
  "new", "open", "close", "reload", "studio", "reading-open", "files", "import", "export", "compile",
  "peer-review-import", "open-care-reader", "remote-share", "remote-review-request", "remote-connect", "open-archive", "unshare",
  "history-open", "axiom-notes", "axiom-footnote", "library-full", "library-draft", "binder",
  "open-use", "compact-axiom", "studio-axiom-return", "paste-cited", "manual-footnote", "delete-footnotes", "move-footnote", "history-footnotes", "clipboard-footnotes",
]);
const preserveQueuedDraftEdits = new Set(["paste-cited", "manual-footnote", "delete-footnotes", "move-footnote"]);
const studioSourceMime = "application/x-care-studio-source";
const studioFragmentMime = "application/x-care-studio-fragment";
const writingFragmentCache = new Map();
const writingExplicitSelections = new WeakMap();
const studioReferenceSelectionLimit = 20000;
const readingHistoryKeys = [
  "care-writing-reference-history-v1", "care-studio-reference-history-v1",
  "care-studio-embedded-reference-history-v1", "care-reference-history-v1",
];
const historyKinds = new Set(["axioms", "routes", "books", "runs"]);
const writingSearchKinds = new Set(["axiom", "passage"]);
const writingSearchModes = new Set(["classic", "deep", "explore", "wild", "challenge"]);
const writingSearchSettingsKey = "care-writing-search-settings-v1";
const writingSearchTextLimit = 160000;
const shellNavigation = [
  ".st-key-care_study_home button",
  ".st-key-care_study_library button",
  ".st-key-care_study_add_book button",
  ".st-key-care_study_writing button",
  ".st-key-care_study_laterals button",
  ".st-key-care_study_dialogues button",
  ".st-key-care_study_corpuses button",
  ".st-key-care_study_numo button",
  ".st-key-care_study_store button",
  ".st-key-care_study_rooms_add_book button",
].join(",");

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function safeHref(value) {
  if (!value) return "";
  try {
    const url = new URL(value, document.baseURI);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeFragment(html, preserveIds = false) {
  const template = document.createElement("template");
  template.innerHTML = html;
  function copy(source, parent, top = false) {
    if (source.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(source.textContent));
      return;
    }
    const tag = source.localName;
    if (!tag || ignoredTags.has(tag) || source.hasAttribute("data-writing-footnote")) return;
    const family = safeWritingFont(source.style?.fontFamily);
    const size = safeWritingSize(source.style?.fontSize);
    const allowed = blockTags.has(tag) || inlineTags.has(tag) || (tag === "span" && (family || size));
    const node = allowed ? element(tag) : document.createDocumentFragment();
    if (family && (blockTags.has(tag) || tag === "span")) node.style.fontFamily = family;
    if (size && (blockTags.has(tag) || tag === "span")) node.style.fontSize = size;
    if (preserveIds && top && blockTags.has(tag) && /^[\w-]{1,100}$/.test(source.dataset.blockId || "")) {
      node.dataset.blockId = source.dataset.blockId;
    }
    if (tag === "a") {
      const href = safeHref(source.getAttribute("href"));
      if (href) node.setAttribute("href", href);
    }
    if (tag === "ol" && /^-?[0-9]{1,8}$/.test(source.getAttribute("start") || "")) {
      node.setAttribute("start", source.getAttribute("start"));
    }
    if (tag === "td" || tag === "th") {
      for (const attribute of ["colspan", "rowspan"]) {
        const value = source.getAttribute(attribute) || "";
        if (/^[1-9][0-9]{0,2}$/.test(value)) node.setAttribute(attribute, value);
      }
    }
    const style = source.style;
    if (allowed && blockTags.has(tag) && ["left", "center", "right", "justify"].includes(style?.textAlign)) {
      node.style.textAlign = style.textAlign;
    }
    let container = node;
    if (tag === "span" || tag === "font") {
      const marks = [];
      if (style?.fontWeight === "bold" || Number(style?.fontWeight) >= 600) marks.push("strong");
      if (style?.fontStyle === "italic") marks.push("em");
      if ((style?.textDecorationLine || style?.textDecoration || "").includes("underline")) marks.push("u");
      if ((style?.textDecorationLine || style?.textDecoration || "").includes("line-through")) marks.push("s");
      for (const mark of marks) {
        const wrapper = element(mark);
        container.append(wrapper);
        container = wrapper;
      }
    }
    for (const child of source.childNodes) copy(child, container);
    parent.append(node);
  }
  const fragment = document.createDocumentFragment();
  for (const child of template.content.childNodes) copy(child, fragment, true);
  return fragment;
}

function selectionFor(paper) {
  const root = paper.getRootNode();
  return root.getSelection?.() || paper.ownerDocument.getSelection();
}

function rangeInPaper(paper, range) {
  return Boolean(range && paper.contains(range.startContainer) && paper.contains(range.endContainer));
}

function writingProseText(node) {
  if (!node.querySelector?.(inlineFootnote)) return node.textContent || "";
  const walker = writingProseWalker(node);
  let text = "";
  for (let child = walker.nextNode(); child; child = walker.nextNode()) text += child.data;
  return text;
}

function writingProseRange(range) {
  const text = range.toString();
  if (!text) return "";
  const ancestor = range.commonAncestorContainer;
  if (!ancestor?.querySelector?.(inlineFootnote) && !ancestor?.closest?.(inlineFootnote) &&
      !ancestor?.parentElement?.closest(inlineFootnote)) return text;
  return writingProseText(writingWholeFootnotes(range).cloneContents());
}

function writingProseWalker(node) {
  return node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: text => text.parentElement?.closest(inlineFootnote)
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
}

function writingSelectionRange(paper) {
  const selection = selectionFor(paper);
  if (!selection) return null;
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  if (rangeInPaper(paper, range)) return range;
  // WebKit may retarget the selection to the shadow host.
  const composed = selection.getComposedRanges?.({shadowRoots: [paper.getRootNode()]})?.[0];
  if (!rangeInPaper(paper, composed)) {
    const explicit = writingExplicitSelections.get(paper);
    const active = paper.getRootNode().activeElement || paper.ownerDocument.activeElement;
    if (!explicit || !paper.isConnected || explicit.range.collapsed || selection !== explicit.selection || selection.isCollapsed !== false ||
        !paper.contains(active) || !rangeInPaper(paper, explicit.range) ||
        ["anchorNode", "anchorOffset", "focusNode", "focusOffset"].some(key => selection[key] !== explicit[key]) ||
        selection.toString() !== explicit.text) {
      writingExplicitSelections.delete(paper);
      return null;
    }
    return explicit.range.cloneRange();
  }
  const result = document.createRange();
  result.setStart(composed.startContainer, composed.startOffset);
  result.setEnd(composed.endContainer, composed.endOffset);
  return result;
}

function topBlock(paper, node) {
  if (!node) return null;
  let block = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  while (block && block !== paper && block.parentNode !== paper) block = block.parentElement;
  return block?.parentNode === paper ? block : null;
}

function normalizeBlocks(paper, prior = new Map()) {
  let paragraph = null;
  for (const child of [...paper.childNodes]) {
    if (child.matches?.(a4Break)) {
      child.remove();
      continue;
    }
    if (child.nodeType === Node.ELEMENT_NODE && blockTags.has(child.localName)) {
      paragraph = null;
      continue;
    }
    if (!paragraph) {
      paragraph = element("p");
      paper.insertBefore(paragraph, child);
    }
    paragraph.append(child);
  }
  if (!paper.firstElementChild) {
    const empty = element("p");
    empty.append(element("br"));
    paper.append(empty);
  }
  const blocks = [...paper.children];
  const assigned = new Map();
  for (const block of blocks) {
    const key = block.dataset.blockId;
    if (!key) continue;
    const duplicate = assigned.get(key);
    if (!duplicate) {
      assigned.set(key, block);
    } else if (prior.get(key) === blockText(block) && prior.get(key) !== blockText(duplicate)) {
      delete duplicate.dataset.blockId;
      assigned.set(key, block);
    } else {
      delete block.dataset.blockId;
    }
  }
  const unassignedByText = new Map();
  for (const [key, text] of prior) {
    if (!text || assigned.has(key)) continue;
    const keys = unassignedByText.get(text) || [];
    keys.push(key);
    unassignedByText.set(text, keys);
  }
  for (const block of blocks) {
    if (!block.dataset.blockId) {
      const matches = unassignedByText.get(blockText(block)) || [];
      block.dataset.blockId = matches.length === 1 ? matches.pop() : id();
    }
  }
}

function capture(runtime) {
  if (runtime.snapshot) return runtime.snapshot;
  const clone = runtime.paper.cloneNode(true);
  stripWritingA4Layout(clone);
  for (const marker of clone.querySelectorAll("[data-writing-footnote]")) marker.remove();
  for (const block of clone.children) {
    block.classList.remove("jump-highlight", "writing-a4-citation");
    if (!block.className) block.removeAttribute("class");
  }
  runtime.snapshot = {title: runtime.title.value, html: clone.innerHTML};
  if (runtime.footnoteNotes?.size) runtime.snapshot.footnote_notes = Object.fromEntries(runtime.footnoteNotes);
  return runtime.snapshot;
}

const same = (a, b) => a?.title === b?.title && a?.html === b?.html &&
  JSON.stringify(a?.footnote_notes || {}) === JSON.stringify(b?.footnote_notes || {});

function storeRecovery(runtime) {
  if (!runtime.docId) return;
  if (writingSharedDocument(runtime.docId)) {
    if (runtime.collaboration) journalWritingShared(runtime.collaboration);
    return;
  }
  const snapshot = capture(runtime);
  if (same(snapshot, runtime.base) && !runtime.pending) {
    recovery.delete(runtime.docId);
    return;
  }
  recovery.delete(runtime.docId);
  recovery.set(runtime.docId, {
    snapshot, base: runtime.base, revision: runtime.revision, pending: runtime.pending, error: runtime.error,
    clipboardEdit: runtime.clipboardEdit, manualFootnoteEdit: runtime.manualFootnoteEdit,
  });
  while (recovery.size > 10) recovery.delete(recovery.keys().next().value);
}

function status(runtime, message, error = false) {
  runtime.status.textContent = message;
  runtime.status.toggleAttribute("data-error", error);
  runtime.emptyStatus.textContent = error ? message : "";
  runtime.root.querySelector('[data-action="reload"]').hidden = !(error && runtime.docId);
}

function setNavigationLock(runtime, locked) {
  const readOnly = locked || (writingSharedDocument(runtime.docId) && !writingCollaborationEditable(runtime));
  runtime.title.readOnly = readOnly;
  runtime.paper.contentEditable = !readOnly && runtime.docId ? "true" : "false";
  if (runtime.navigationLocked !== locked || runtime.editorReadOnly !== readOnly) {
    runtime.navigationLocked = locked;
    runtime.editorReadOnly = readOnly;
    for (const field of runtime.root.querySelectorAll("[data-footnote-note]")) setFootnoteNoteEditable(field, !readOnly);
  }
  runtime.select.disabled = locked;
  for (const button of runtime.root.querySelectorAll(
    '[data-action="new"],[data-action="close"],[data-action="studio"],[data-action="compact-axiom"],[data-action="studio-axiom-return"],[data-command]'
  )) {
    button.disabled = locked || Boolean(button.dataset.command && readOnly);
  }
  runtime.format.disabled = readOnly;
  if (runtime.formatLauncher) runtime.formatLauncher.disabled = readOnly;
  const manualNote = runtime.root.querySelector('[data-action="manual-footnote"]');
  if (manualNote) {
    manualNote.disabled = readOnly || writingSharedDocument(runtime.docId);
    manualNote.title = writingSharedDocument(runtime.docId) ? "Insert footnotes in a private Studio draft" : "Insert footnote";
  }
  for (const field of [runtime.alignment, runtime.fontFamily, runtime.fontSize]) if (field) field.disabled = readOnly;
  lockWritingBinder(runtime, locked);
}

function send(runtime, type, extra = {}, authoredSnapshot = null, sharedFlushed = false) {
  if (!sharedFlushed && type !== "axiom-bookmark" && writingSharedDocument(runtime.docId) && handleWritingSharedAction(runtime, type, extra, authoredSnapshot,
    () => send(runtime, type, extra, authoredSnapshot, true))) return;
  if (runtime.pending) {
    const navigation = navigationActions.has(type);
    if (type !== "save" && (!runtime.queued || (navigation && ["scan", "scan-deeper"].includes(runtime.queued.type)))) {
      runtime.queued = {type, extra};
      if (navigation) setNavigationLock(runtime, true);
      if (type === "close") runtime.writeBesidePanel?.setAttribute("data-care-write-beside-closing", "");
    }
    return;
  }
  if (!runtime.docId && !["new", "open", "close", "files", "import", "compile", "peer-review-import", "open-care-reader", "remote-connect", "open-archive", "unshare", "binder", "history-open", "history-load",
    "library-close", "library-full", "library-draft", "open-use", "compact-axiom"].includes(type)) return;
  if (type === "scan-poll") {
    const nonce = id();
    runtime.pending = {type, nonce, snapshot: runtime.base, extra};
    runtime.api.setTriggerValue("action", {type, nonce, document_id: runtime.docId, ...extra});
    return;
  }
  clearTimeout(runtime.saveTimer);
  runtime.saveTimer = 0;
  const snapshot = authoredSnapshot || (runtime.docId ? capture(runtime) : {title: "", html: ""});
  const positions = runtime.docId && runtime.references?.length && type !== "history-footnotes" &&
    !Object.hasOwn(extra, "footnote_positions") ? footnotePositions(runtime, extra.reference_id) : null;
  const movedFootnotes = positions && Object.keys(positions).length > 0;
  if (type === "save" && same(snapshot, runtime.base) && !movedFootnotes && !runtime.error) {
    status(runtime, "Saved privately");
    return;
  }
  const nonce = id();
  runtime.pending = {type, nonce, snapshot, extra};
  if (type === "close") runtime.writeBesidePanel?.setAttribute("data-care-write-beside-closing", "");
  runtime.error = "";
  const navigation = navigationActions.has(type);
  if (navigation) {
    clearTimeout(runtime.scanTimer);
    setNavigationLock(runtime, true);
  }
  const searchStatus = extra.search_kind === "passage" ? "Finding passages…" : "Finding axioms…";
  status(runtime, ["scan", "scan-deeper"].includes(type) ? searchStatus : type === "read" ? "Opening reading…" :
    type === "review-draft" ? "Preparing review…" : type === "review-poll" ? "Checking review…" : "Saving…");
  storeRecovery(runtime);
  runtime.api.setTriggerValue("action", {
    type, nonce, document_id: runtime.docId, revision: runtime.revision, ...snapshot, ...extra,
    ...(["export", "compile"].includes(type) ? {footnote_mode: runtime.footnotes?.dataset.mode} : {}),
    ...(movedFootnotes ? {footnote_positions: positions} : {}),
  });
}

function scheduleSave(runtime, delay = 650) {
  if (writingSharedDocument(runtime.docId)) {
    const state = runtime.collaboration;
    if (state && !state.conflict && writingSharedDirty(state)) queueWritingShared(state, Math.min(delay, writingSharedSave));
    return;
  }
  clearTimeout(runtime.saveTimer);
  runtime.saveTimer = 0;
  if (!runtime.docId || runtime.error || runtime.composing || runtime.composingFootnote || runtime.pending) return;
  runtime.saveTimer = setTimeout(() => {
    runtime.saveTimer = 0;
    send(runtime, "save");
  }, delay);
}

function holdNavigation(runtime, resume) {
  if ((runtime.compact && !runtime.writingClipboardRequest) || !runtime.docId || !runtime.root.isConnected) return false;
  if (runtime.pending?.type === "close" || runtime.queued?.type === "close") return false;
  if (runtime.collaboration) return deferWritingShared(runtime.collaboration, () => requestAnimationFrame(resume), true);
  if (!runtime.pending && same(capture(runtime), runtime.base)) return false;
  if (runtime.error || runtime.externalNavigation) return true;
  runtime.externalNavigation = resume;
  if (!preserveQueuedDraftEdits.has(runtime.queued?.type)) runtime.queued = null;
  finishNavigation(runtime);
  return true;
}

function finishNavigation(runtime) {
  const resume = runtime.externalNavigation;
  if (!resume || runtime.pending) return;
  if (runtime.error) {
    runtime.externalNavigation = null;
    return;
  }
  if (preserveQueuedDraftEdits.has(runtime.queued?.type)) {
    const {type, extra} = runtime.queued;
    runtime.queued = null;
    send(runtime, type, extra);
    return;
  }
  if (!same(capture(runtime), runtime.base)) {
    send(runtime, "save");
    setNavigationLock(runtime, true);
    return;
  }
  runtime.externalNavigation = null;
  requestAnimationFrame(resume);
}

function onAck(runtime, ack, incoming) {
  if (!ack?.nonce || ack.nonce !== runtime.pending?.nonce) return false;
  const {type, snapshot, extra} = runtime.pending;
  runtime.acknowledgedType = type;
  runtime.pending = null;
  setNavigationLock(runtime, false);
  // A progress poll never writes the draft. Its acknowledgement must not
  // declare text typed while it was in flight to have been saved.
  if (type === "scan-poll") return false;
  if (type === "delete-footnotes") {
    runtime.removingFootnotes = null;
    acknowledgeWritingFootnoteDeletion(runtime, !ack.error);
  }
  if (type === "history-footnotes") acknowledgeWritingFootnoteHistory(runtime, ack, snapshot);
  if (type === "clipboard-footnotes") acknowledgeWritingClipboard(runtime, ack);
  if (type === "paste-cited" && runtime.sourceQuoteEdit) {
    const edit = runtime.sourceQuoteEdit;
    runtime.sourceQuoteEdit = null;
    if (ack.error || ack.citation_error || !ack.citation_reference_id) {
      runtime.pastedFootnoteCaret = null;
      restoreWritingClipboard(runtime, edit.before);
    } else recordWritingClipboardEdit(runtime, edit.before, edit.after, {added: [ack.citation_reference_id]});
  }
  if (type === "manual-footnote") acknowledgeManualFootnote(runtime, ack);
  if (type === "axiom-footnote") restoreOpenedFootnoteFocus(runtime, extra?.reference_id, !ack.error);
  if ((type === "delete-footnotes" && !extra?.keep_printed_focus) || type === "move-footnote") {
    const {docId, range} = runtime;
    requestAnimationFrame(() => {
      if (!runtime.pending && runtime.docId === docId && runtime.root.isConnected && rangeInPaper(runtime.paper, range)) {
        restoreSelection(runtime, range);
      }
    });
  }
  if (["read", "history-read"].includes(type)) runtime.readingError = String(ack.error || "");
  if (type === "axiom-bookmark" && runtime.bookmarkStatus) {
    runtime.bookmarkStatus.textContent = ack.bookmark_error || ack.bookmark_notice || ack.error || "";
    runtime.bookmarkStatus.toggleAttribute("data-error", Boolean(ack.bookmark_error || ack.error));
  }
  if (ack.error) {
    if (runtime.queued?.type === "delete-footnotes") acknowledgeWritingFootnoteDeletion(runtime, false);
    if (type === "close" || runtime.queued?.type === "close") {
      runtime.writeBesidePanel?.removeAttribute("data-care-write-beside-closing");
    }
    runtime.queued = null;
    runtime.removingFootnotes = null;
    runtime.error = String(ack.error);
    // The server may have saved the draft before a secondary action failed.
    if (ack.saved && !writingSharedDocument(runtime.docId)) {
      runtime.revision = ack.revision ?? runtime.revision;
      runtime.base = snapshot;
    }
    status(runtime, runtime.error, true);
    storeRecovery(runtime);
    return false;
  }
  runtime.error = "";
  const reloaded = type === "reload";
  if (reloaded) {
    recovery.delete(runtime.docId);
    runtime.docId = "";
  } else {
    if (writingSharedDocument(runtime.docId)) {
      if (runtime.collaboration) queueWritingShared(runtime.collaboration, 0);
    } else if (type === "binder" && typeof ack.binder_title === "string") {
      if (runtime.title.value === snapshot.title) runtime.title.value = ack.binder_title;
      runtime.snapshot = null;
      runtime.base = {...snapshot, title: ack.binder_title};
    } else runtime.base = snapshot;
    if (!writingSharedDocument(runtime.docId) && String(incoming?.id || "") === runtime.docId) {
      runtime.revision = ack.revision ?? incoming.revision ?? runtime.revision;
    }
    storeRecovery(runtime);
  }
  if (!writingSharedDocument(runtime.docId) || ack.citation_error) {
    status(runtime, ack.citation_error || "Saved privately", Boolean(ack.citation_error));
  }
  return reloaded;
}

function loadDocument(runtime, doc, blockId, initialQuery, acknowledgement) {
  if (runtime.binder && runtime.docId !== String(doc?.id || "")) closeBinderReading(runtime, false);
  if (runtime.docId) storeRecovery(runtime);
  runtime.clipboardEpoch += 1;
  if (runtime.clipboardDialog.open) runtime.clipboardDialog.close();
  runtime.docId = String(doc?.id || "");
  runtime.revision = doc?.revision ?? 0;
  runtime.pending = null;
  runtime.queued = null;
  runtime.clipboardEdit = null;
  runtime.sourceQuoteEdit = null;
  runtime.manualFootnoteEdit = null;
  runtime.manualFootnoteFocus = null;
  runtime.pastedFootnoteCaret = null;
  runtime.error = "";
  runtime.anchorId = "";
  runtime.range = null;
  runtime.lastScan = "";
  runtime.lastSearchScope = initialQuery ? "query" : "";
  runtime.hasSearched = Boolean(initialQuery);
  runtime.references = [];
  runtime.footnoteNotes = new Map();
  runtime.composingFootnote = false;
  runtime.removingFootnotes = null;
  runtime.footnoteSignature = null;
  runtime.readingError = "";
  runtime.root.classList.remove("has-selection");
  clearTimeout(runtime.saveTimer);
  runtime.saveTimer = 0;
  clearTimeout(runtime.scanTimer);
  runtime.snapshot = null;
  runtime.title.value = doc?.title || "";
  runtime.paper.replaceChildren(safeFragment(doc?.html || "", true));
  normalizeBlocks(runtime.paper);
  runtime.base = capture(runtime);
  const savedDraft = writingSharedDocument(runtime.docId) ? null : recovery.get(runtime.docId);
  if (savedDraft) {
    const pending = savedDraft.pending;
    const acknowledged = pending && pending.nonce === acknowledgement?.nonce;
    const savedTitle = (pending?.snapshot.title || "").trim() || "Untitled";
    const scratch = element("div");
    if (pending) scratch.append(safeFragment(pending.snapshot.html, true));
    const pendingWasSaved = pending && same({title: savedTitle, html: scratch.innerHTML}, runtime.base);
    const incomingBase = runtime.base;
    runtime.snapshot = null;
    runtime.footnoteNotes = new Map(Object.entries(savedDraft.snapshot.footnote_notes || {}));
    runtime.title.value = savedDraft.snapshot.title;
    runtime.paper.replaceChildren(safeFragment(savedDraft.snapshot.html, true));
    runtime.error = savedDraft.error;
    if (acknowledged) {
      runtime.pending = pending;
      runtime.clipboardEdit = savedDraft.clipboardEdit;
      runtime.manualFootnoteEdit = savedDraft.manualFootnoteEdit;
      runtime.base = savedDraft.base;
      runtime.revision = savedDraft.revision;
    } else if (!pendingWasSaved) {
      runtime.base = savedDraft.base;
      if (savedDraft.revision !== runtime.revision) {
        runtime.error = "This draft changed in another window. Copy your edits or reload the saved draft.";
        runtime.revision = savedDraft.revision;
      }
    } else {
      // A navigation can remove the component before the server delivers its
      // acknowledgment. Keep any typing that happened after the saved snapshot.
      runtime.base = incomingBase;
    }
  }
  runtime.blocks = new Map([...runtime.paper.children].map(block => [block.dataset.blockId, blockText(block)]));
  runtime.query.value = initialQuery || "";
  runtime.anchorId = blockId || runtime.paper.firstElementChild?.dataset.blockId || "";
  setNavigationLock(runtime, navigationActions.has(runtime.pending?.type));
  updatePaper(runtime);
  resetWritingHistory(runtime);
  if (runtime.error) status(runtime, runtime.error, true);
  else if (runtime.pending) status(runtime, "Saving…");
  else if (!same(capture(runtime), runtime.base)) {
    status(runtime, "Unsaved edits");
    scheduleSave(runtime, 100);
  } else status(runtime, writingSharedDocument(runtime.docId) ? "Connecting to shared draft…" : "Saved privately");
}

function findBlock(runtime, blockId) {
  return [...runtime.paper.children].find(block => block.dataset.blockId === blockId);
}

function activeBlock(runtime) {
  return findBlock(runtime, runtime.anchorId) || runtime.paper.firstElementChild;
}

function selectedQuote(runtime, block) {
  if (rangeInPaper(runtime.paper, runtime.range) && !runtime.range.collapsed) {
    const selection = writingProseRange(runtime.range).trim();
    if (selection) return selection.slice(0, 3000);
  }
  return block ? textOf(block).slice(0, 3000) : "";
}

function blockAtBoundary(paper, node, offset, end) {
  if (node !== paper) return topBlock(paper, node);
  const child = paper.childNodes[end ? offset - 1 : offset];
  return topBlock(paper, child);
}

function offsetInBlock(block, node, offset, end = false) {
  if (!block.contains(node)) return end ? writingProseText(block).length : 0;
  const prefix = document.createRange();
  prefix.selectNodeContents(block);
  prefix.setEnd(node, offset);
  return writingProseRange(prefix).length;
}

function passageSelection(runtime, range = runtime.range, maxLength = 3000) {
  const {paper} = runtime;
  if (!rangeInPaper(paper, range) || range.collapsed) return null;
  const text = writingProseRange(range);
  if (!text.trim() || text.length > maxLength) return null;
  const start = blockAtBoundary(paper, range.startContainer, range.startOffset, false);
  const end = blockAtBoundary(paper, range.endContainer, range.endOffset, true);
  if (!start?.dataset.blockId || !end?.dataset.blockId) return null;
  return {
    blockId: start.dataset.blockId,
    selection: {
      start: offsetInBlock(start, range.startContainer, range.startOffset),
      end: offsetInBlock(end, range.endContainer, range.endOffset, true),
      end_block_id: end.dataset.blockId, text,
    },
  };
}

function rememberSelection(runtime, hasText) {
  const {paper} = runtime;
  // A native select can briefly move the browser selection as it opens.
  // Keep the manuscript range and the control's pending value during that time.
  if (runtime.formatting?.contains(paper.getRootNode().activeElement)) return;
  const range = writingSelectionRange(paper);
  if (!range) return;
  runtime.range = range.cloneRange();
  const selection = selectionFor(paper);
  runtime.rangeReversed = !range.collapsed && selection?.anchorNode === range.endContainer &&
    selection.anchorOffset === range.endOffset;
  const block = topBlock(paper, range.startContainer);
  if (block) runtime.anchorId = block.dataset.blockId;
  const paragraph = writingLogicalParagraph(paper, range.startContainer);
  const units = range.collapsed ? [paragraph] : writingParagraphUnits(paper, range);
  const tags = [...runtime.format.options].map(option => option.value);
  const tag = unit => tags.includes(unit?.localName) ? unit.localName : "p";
  const alignment = unit => unit?.style.textAlign || "left";
  const formatValue = tag(units[0]);
  const alignValue = alignment(units[0]);
  runtime.format.value = units.every(unit => tag(unit) === formatValue) ? formatValue : "";
  if (runtime.alignment) runtime.alignment.value = units.every(unit => alignment(unit) === alignValue) ? alignValue : "";
  const typography = range.collapsed ? [] : writingTextPortions(range).map(({node}) => writingTypographyAt(paper, node));
  const {font, size} = typography[0] || writingTypographyAt(paper, range.startContainer);
  if (runtime.fontFamily) runtime.fontFamily.value = typography.every(style => style.font === font) ? font : "";
  if (runtime.fontSize) {
    const sameSize = typography.every(style => style.size === size);
    runtime.fontSize.placeholder = sameSize ? "Auto" : "Mixed";
    runtime.fontSize.value = sameSize ? size : "";
  }
  for (const button of runtime.root.querySelectorAll("[data-command][aria-pressed]")) {
    const command = button.dataset.command;
    const state = writingFormatState(paper, range, command);
    button.setAttribute("aria-pressed", String(state ?? Boolean(paper.ownerDocument.queryCommandState?.(command))));
  }
  runtime.root.classList.toggle("has-selection", !range.collapsed);
  paintAnchor(runtime, hasText, block);
}

function restoreSelection(runtime, range = runtime.range, reversed = false) {
  const {paper} = runtime;
  paper.focus({preventScroll: true});
  const selection = selectionFor(paper);
  if (!rangeInPaper(paper, range)) {
    const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (rangeInPaper(paper, activeRange)) return activeRange;
    range = document.createRange();
    range.selectNodeContents(activeBlock(runtime) || paper);
    range.collapse(false);
  }
  try {
    if (selection?.setBaseAndExtent) {
      const start = [range.startContainer, range.startOffset];
      const end = [range.endContainer, range.endOffset];
      selection.setBaseAndExtent(...(reversed ? [...end, ...start] : [...start, ...end]));
    } else {
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  } catch {
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  return range;
}

function paintAnchor(runtime, hasText, block) {
  const selection = passageSelection(runtime);
  const selected = selection?.selection.text.replace(/\s+/g, " ").trim() || "";
  const preview = selected.length > 85 ? selected.slice(0, 82) + "…" : selected;
  runtime.anchor.textContent = preview ? "Selected passage · “" + preview + "”" : "Highlight the words you want to link.";
  for (const button of runtime.root.querySelectorAll("[data-link-passage]")) button.disabled = !selection;
  const ready = writingSearchReady(runtime);
  runtime.root.querySelector('[data-action="scan-passage"]').disabled = !ready || !selectedQuote(runtime, block || activeBlock(runtime));
  runtime.root.querySelector('[data-action="scan-draft"]').disabled = !ready || !(hasText ?? Boolean(textOf(runtime.paper)));
}

function paintWritingPaperSummary(runtime) {
  const text = textOf(runtime.paper);
  const words = text ? text.split(/\s+/).length : 0;
  runtime.count.textContent = String(words) + (words === 1 ? " word" : " words");
  runtime.paper.dataset.empty = String(!text);
  return Boolean(text);
}

function paintWritingPaperPanels(runtime) {
  if (!runtime.compact || runtime.activePane === "outline") paintOutline(runtime);
  if (runtime.draftReviewPane) paintDraftReview(runtime);
}

function updatePaper(runtime, followCaret = false, typing = false) {
  clearTimeout(runtime.paperSummaryTimer);
  paintAnchor(runtime, paintWritingPaperSummary(runtime));
  paintFootnotes(runtime);
  refreshWritingA4(runtime, false, followCaret, typing);
  paintWritingPaperPanels(runtime);
}

function markEdited(runtime, updateBlocks = false, removedFootnotes = [], backspaceCaret = null, followCaret = true,
  {typing = false, textBlock = null} = {}) {
  runtime.snapshot = null;
  if (textBlock) {
    const text = blockText(textBlock);
    runtime.blocks.set(textBlock.dataset.blockId, text);
    const hasText = Boolean(text) || [...runtime.blocks.values()].some(Boolean);
    runtime.paper.dataset.empty = String(!hasText);
    rememberSelection(runtime, hasText);
    clearTimeout(runtime.paperSummaryTimer);
    runtime.paperSummaryTimer = setTimeout(() => {
      paintWritingPaperSummary(runtime);
      paintWritingPaperPanels(runtime);
    }, 180);
    refreshWritingA4(runtime, false, followCaret, true);
    rememberWritingEdit(runtime);
  } else if (updateBlocks) {
    normalizeBlocks(runtime.paper, runtime.blocks);
    runtime.blocks = new Map([...runtime.paper.children].map(block => [block.dataset.blockId, blockText(block)]));
    rememberSelection(runtime);
    updatePaper(runtime, followCaret, typing);
    if (backspaceCaret) restoreWritingBackspaceCaret(runtime, backspaceCaret);
    rememberWritingEdit(runtime, removedFootnotes);
  }
  if (writingSharedDocument(runtime.docId)) writingSharedEdited(runtime);
  else if (!runtime.error && runtime.status?.textContent !== "Unsaved edits") status(runtime, "Unsaved edits");
  scheduleSave(runtime);
  if (updateBlocks && !runtime.panel.hidden && runtime.live.checked && !runtime.composing && !runtime.error) {
    clearTimeout(runtime.scanTimer);
    runtime.scanTimer = setTimeout(() => scan(runtime, "passage", true),
      ["wild", "challenge"].includes(runtime.searchMode) ? 3000 :
        runtime.searchMode === "explore" ? 2800 : runtime.searchMode === "deep" ? 2400 : 1900);
  }
}

function preferredWritingSearchSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(writingSearchSettingsKey) || "null");
    return {mode: writingSearchModes.has(value?.mode) ? value.mode : "deep",
      scope: ["work", "book"].includes(value?.scope) ? value.scope : "library",
      ...(typeof value?.book_id === "string" && value.book_id.length <= 2048 && value.book_id ? {book_id: value.book_id} : {})};
  } catch {
    return {mode: "deep", scope: "library"};
  }
}

function writingSearchOptions(runtime) {
  // A mounted editor always has settings; absent settings keep older embedded callers compatible.
  if (!runtime.searchMode) return {};
  if (runtime.searchScope === "book") return {search_mode: runtime.searchMode, search_scope: "book",
    search_work_id: runtime.searchBookId || ""};
  const route = writingSearchLibraryRoute(runtime);
  const currentWork = String(route?.work || runtime.searchWorkId || "");
  const scope = runtime.searchScope === "work" && currentWork ? "work" : "library";
  return {search_mode: runtime.searchMode, search_scope: scope,
    search_work_id: scope === "work" ? currentWork : "",
    ...(scope === "work" && route ? {search_library_route: route} : {})};
}

function writingSearchLibraryRoute(runtime) {
  if (!runtime.libraryRequest || !runtime.libraryFrameRequest || runtime.libraryDock?.hidden) return null;
  const route = libraryLocation(runtime);
  return route?.work ? route : null;
}

function selectedWritingSearchBook(runtime) {
  return (runtime.searchBooks || []).find(book => book.work_id === runtime.searchBookId);
}

function writingSearchReady(runtime) {
  return runtime.searchScope !== "book" || Boolean(selectedWritingSearchBook(runtime));
}

function writingSearchBookStatus(runtime) {
  if (runtime.searchScope !== "book" || writingSearchReady(runtime)) return "";
  return runtime.searchBookId ? "The saved book is unavailable. Choose another book to search." : "Choose a book to start searching.";
}

function matchingWritingSearchSettings(runtime, progress) {
  if (!runtime.searchMode) return true;
  if (!writingSearchReady(runtime)) return false;
  if (!progress) return !runtime.searchSettingsChanged;
  const selected = writingSearchOptions(runtime);
  return (progress.mode || "classic") === selected.search_mode &&
    (progress.scope || "library") === selected.search_scope &&
    (!["work", "book"].includes(selected.search_scope) || (progress.work_id || "") === selected.search_work_id);
}

function paintWritingSearchBooks(runtime) {
  if (!runtime.searchBookSelect) return;
  const books = runtime.searchBooks || [];
  const fold = value => String(value || "").normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
  const filter = fold(runtime.searchBookFilter.value).trim();
  const selected = selectedWritingSearchBook(runtime);
  const words = filter.split(/\s+/).filter(Boolean);
  const matches = books.filter(book => words.every(word => fold([book.title, book.author, book.work_id].join(" ")).includes(word)));
  const signature = JSON.stringify([books, filter, runtime.searchBookId]);
  if (signature !== runtime.searchBookOptionsSignature) {
    const option = (value, label) => {
      const node = element("option", label);
      node.value = value;
      return node;
    };
    const label = book => [book.title || book.work_id, book.author].filter(Boolean).join(" — ");
    const pinned = selected && !matches.includes(selected) ? [option(selected.work_id, "Selected: " + label(selected))] : [];
    runtime.searchBookSelect.replaceChildren(option("", matches.length ? "Choose a book…" : "No matching books"),
      ...pinned, ...matches.map(book => option(book.work_id, label(book))));
    runtime.searchBookSelect.value = selected?.work_id || "";
    runtime.searchBookOptionsSignature = signature;
  }
  runtime.searchBookSelect.disabled = !books.length;
  runtime.searchBookPicker.hidden = runtime.searchScope !== "book";
  runtime.searchBookStatus.textContent = writingSearchBookStatus(runtime) ||
    (selected ? [selected.title || selected.work_id, selected.author].filter(Boolean).join(" · ") :
      `${matches.length} ${matches.length === 1 ? "book" : "books"}${filter ? " match your filter" : " available"}`);
}

function paintWritingSearchSettings(runtime) {
  if (!runtime.searchModeSelect) return;
  const options = writingSearchOptions(runtime);
  runtime.searchModeSelect.value = options.search_mode;
  runtime.searchScopeSelect.value = options.search_scope;
  const currentBook = runtime.searchScopeSelect.querySelector('[value="work"]');
  const currentWork = writingSearchLibraryRoute(runtime)?.work || runtime.searchWorkId;
  if (currentBook) currentBook.disabled = !currentWork;
  runtime.searchScopeSelect.title = currentWork ? "" : "Open a book or write beside a Library reading to search the current book.";
  const names = {deep: "Thorough", classic: "Classic", explore: "Explore", wild: "Wild connections", challenge: "Possible challenges"};
  const book = selectedWritingSearchBook(runtime);
  const scopeName = options.search_scope === "book" ? book?.title || "Choose a book" :
    options.search_scope === "work" ? "Current book" : "Whole library";
  runtime.searchSettingSummary.textContent = `${names[options.search_mode]} · ${scopeName}`;
  runtime.searchSettingHelp.textContent = {
    classic: "The original search: matches phrases and distinctive words, with wider passes on request.",
    deep: "Weighs wording, related concepts and recorded connections to find the strongest matches.",
    explore: "Looks further across related concepts and recorded connections. Check each connection beside your draft.",
    wild: "Follows unlikely trails across the Library, including recorded routes, Numogram correspondences and structural analogies. Each result shows the bridge it used.",
    challenge: "Tests a claim against the Library. Look for counterclaims, exceptions and rival explanations, with the source wording shown beside each lead.",
  }[options.search_mode];
  paintWritingSearchBooks(runtime);
  if (runtime.searchSubmit) runtime.searchSubmit.disabled = !writingSearchReady(runtime);
}

function invalidateWritingSearch(runtime) {
  clearTimeout(runtime.scanTimer);
  clearTimeout(runtime.searchPollTimer);
  if (["scan", "scan-deeper"].includes(runtime.queued?.type)) runtime.queued = null;
  runtime.suggestions = [];
  runtime.searchProgress = null;
  runtime.hasSearched = false;
  runtime.lastScan = "";
  runtime.searchSettingsChanged = true;
}

function updateWritingSearchWork(runtime, value) {
  runtime.searchContextWorkId = String(value || "");
  const workId = String(writingSearchLibraryRoute(runtime)?.work || runtime.searchContextWorkId);
  if (runtime.searchWorkId !== workId && runtime.searchScope === "work") invalidateWritingSearch(runtime);
  runtime.searchWorkId = workId;
  paintWritingSearchSettings(runtime);
}

function updateWritingSearchBooks(runtime, values) {
  const oldSelected = selectedWritingSearchBook(runtime);
  const seen = new Set();
  runtime.searchBooks = (Array.isArray(values) ? values : []).flatMap(book => {
    const workId = String(book?.work_id || "");
    if (!workId || seen.has(workId)) return [];
    seen.add(workId);
    return [{work_id: workId, title: String(book.title || workId), author: String(book.author || "")}];
  });
  if (runtime.searchScope === "book" && Boolean(oldSelected) !== Boolean(selectedWritingSearchBook(runtime))) {
    invalidateWritingSearch(runtime);
  }
  if (runtime.searchScope === "book" && !writingSearchReady(runtime) && !runtime.searchBookAttentionShown) {
    if (runtime.searchSettingsDetails) runtime.searchSettingsDetails.open = true;
    runtime.searchBookAttentionShown = true;
  }
}

function saveWritingSearchSettings(runtime) {
  try {
    localStorage.setItem(writingSearchSettingsKey, JSON.stringify({mode: runtime.searchMode, scope: runtime.searchScope,
      ...(runtime.searchBookId ? {book_id: runtime.searchBookId} : {})}));
  } catch {
    // Search works when browser storage is unavailable.
  }
}

function chooseWritingSearchSettings(runtime) {
  const repeat = runtime.hasSearched || Boolean(runtime.query.value.trim());
  runtime.searchMode = writingSearchModes.has(runtime.searchModeSelect.value) ? runtime.searchModeSelect.value : "deep";
  runtime.searchScope = runtime.searchScopeSelect.value === "book" ? "book" :
    runtime.searchScopeSelect.value === "work" && (writingSearchLibraryRoute(runtime)?.work || runtime.searchWorkId) ? "work" : "library";
  saveWritingSearchSettings(runtime);
  invalidateWritingSearch(runtime);
  paintWritingSearchSettings(runtime);
  if (repeat && runtime.docId && writingSearchReady(runtime)) scan(runtime, runtime.lastSearchScope || "query");
  else paintResults(runtime);
  if (runtime.docId && runtime.paper) paintAnchor(runtime);
  paintDraftReview(runtime);
}

function chooseWritingSearchBook(runtime) {
  const identity = String(runtime.searchBookSelect.value || "");
  runtime.searchBookId = (runtime.searchBooks || []).some(book => book.work_id === identity) ? identity : "";
  saveWritingSearchSettings(runtime);
  const repeat = runtime.hasSearched || Boolean(runtime.query.value.trim());
  invalidateWritingSearch(runtime);
  paintWritingSearchSettings(runtime);
  if (repeat && runtime.docId && writingSearchReady(runtime)) scan(runtime, runtime.lastSearchScope || "query");
  else paintResults(runtime);
  if (runtime.docId && runtime.paper) paintAnchor(runtime);
  paintDraftReview(runtime);
}

function boundedWritingSearchText(value, limit = writingSearchTextLimit) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  // Preserve a spread of complete neighborhoods even for drafts beyond the scan limit.
  const sections = 17;
  const size = Math.floor((limit - (sections - 1) * 2) / sections);
  return Array.from({length: sections}, (_, index) => {
    const start = Math.floor((text.length - size) * index / (sections - 1));
    return text.slice(start, start + size);
  }).join("\n\n");
}

function writingDraftSearchText(runtime) {
  if (!runtime.searchMode || runtime.searchMode === "classic") return textOf(runtime.paper).slice(0, 12000);
  const blocks = Array.from(runtime.paper.children || [], block => blockText(block)).filter(Boolean);
  return boundedWritingSearchText(blocks.length ? blocks.join("\n\n") : textOf(runtime.paper));
}

function writingReviewText(runtime) {
  const blocks = Array.from(runtime.paper.children || [], block => blockText(block)).filter(Boolean);
  return boundedWritingSearchText(blocks.length ? blocks.join("\n\n") : textOf(runtime.paper));
}

function draftReviewWorking(review) {
  return ["pending", "queued", "running", "in_progress"].includes(review?.status);
}

function reviewWritingDraft(runtime) {
  if (!runtime.docId || !writingSearchReady(runtime) || draftReviewWorking(runtime.draftReview) ||
      [runtime.pending, runtime.queued].some(action => ["review-draft", "review-poll"].includes(action?.type) || navigationActions.has(action?.type))) return;
  const model = String(runtime.draftReviewModelSelect.value || "");
  if (!(runtime.reviewModels || []).some(value => value.id === model)) return;
  const query = writingReviewText(runtime);
  if (!query) return;
  send(runtime, "review-draft", {query, model, ...writingSearchOptions(runtime)});
  runtime.draftReviewPane.open = true;
  paintDraftReview(runtime);
}

function pollWritingDraftReview(runtime) {
  const review = runtime.draftReview;
  if (!runtime.docId || !review?.id || !draftReviewWorking(review) ||
      [runtime.pending, runtime.queued].some(action => ["review-draft", "review-poll"].includes(action?.type) || navigationActions.has(action?.type))) return;
  send(runtime, "review-poll", {review_id: review.id});
  paintDraftReview(runtime);
}

function paintDraftReviewModels(runtime, values) {
  const seen = new Set();
  const models = (Array.isArray(values) ? values : []).flatMap(model => {
    const identity = String(model?.id || "");
    if (!identity || seen.has(identity)) return [];
    seen.add(identity);
    return [{id: identity, label: String(model.label || identity)}];
  });
  runtime.reviewModels = models;
  const signature = JSON.stringify(models);
  if (signature === runtime.draftReviewModelsSignature || !runtime.draftReviewModelSelect) return;
  const selected = runtime.draftReviewModelSelect.value;
  runtime.draftReviewModelSelect.replaceChildren(...models.map(model => {
    const option = element("option", model.label);
    option.value = model.id;
    return option;
  }));
  runtime.draftReviewModelSelect.value = models.some(model => model.id === selected) ? selected : models[0]?.id || "";
  runtime.draftReviewModelsSignature = signature;
}

function paintDraftReview(runtime, incoming = runtime.draftReview) {
  if (!runtime.draftReviewPane) return;
  const review = incoming?.document_id && incoming.document_id !== runtime.docId ? null : incoming;
  runtime.draftReview = review;
  const submitting = [runtime.pending, runtime.queued].some(action => action?.type === "review-draft");
  const polling = [runtime.pending, runtime.queued].some(action => action?.type === "review-poll");
  const working = draftReviewWorking(review);
  const models = runtime.reviewModels || [];
  const ready = writingSearchReady(runtime);
  const findings = Array.isArray(review?.findings) ? review.findings :
    Array.isArray(review?.report?.findings) ? review.report.findings : [];
  const dirty = review && runtime.base ? !same(capture(runtime), runtime.base) : false;
  const stale = Boolean(review?.stale || dirty || (review?.revision != null && review.revision !== runtime.revision));
  const hasText = runtime.paper ? Boolean(textOf(runtime.paper)) : Boolean(runtime.docId);
  runtime.draftReviewButton.disabled = !runtime.docId || !hasText || !models.length || !ready || submitting || working || polling;
  runtime.draftReviewModelSelect.disabled = submitting || working;
  runtime.draftReviewPollButton.hidden = !working || !review?.id;
  runtime.draftReviewPollButton.disabled = submitting || polling;
  runtime.draftReviewStatus.dataset.error = String(Boolean(review?.error));
  runtime.draftReviewStatus.textContent = submitting ? "Preparing the draft and local reading shortlist…" :
    polling ? "Checking review progress…" : review?.error ? String(review.error) :
      working ? "The model is reviewing this saved draft. Check progress when you are ready." :
        !models.length ? "No review model is available in the Library settings." :
          !ready ? writingSearchBookStatus(runtime) : review ?
            findings.length ? "Reading leads from the review" : "The review returned no supported reading leads." : "";
  runtime.draftReviewRevision.hidden = !review;
  runtime.draftReviewRevision.dataset.stale = String(stale);
  runtime.draftReviewRevision.textContent = review ?
    `Saved revision ${review.revision ?? "—"} · ${review.model || "Review model"}${stale ? ". The draft has changed since this review; request a fresh review for the current text." : ""}${review.report?.draft_sampled ? " This long-draft review used excerpts distributed across the text." : ""}` : "";
  const signature = JSON.stringify([review?.id, findings]);
  if (signature === runtime.draftReviewFindingsSignature) return;
  runtime.draftReviewFindingsSignature = signature;
  const labels = {support: "Possible support", challenge: "Possible challenge", gap: "Possible gap",
    complicates: "Possible qualification", analogy: "Possible analogy", unclear: "Uncertain connection",
    supports: "Possible support", challenges: "Possible challenge", contradicts: "Possible challenge"};
  const cards = findings.map(finding => {
    const card = element("article", undefined, "draft-review-finding");
    card.append(element("span", labels[finding.relation] || "Reading lead", "eyebrow"));
    const quote = (label, value) => {
      if (!value) return;
      card.append(element("span", label, "draft-review-quote-label"), element("blockquote", String(value)));
    };
    quote("In your draft", finding.draft_quote);
    const target = finding.target;
    if (target) {
      card.append(element("strong", target.title || target.label || target.item_id || "Library reading"));
      const location = [target.work_title, target.item_id].filter(Boolean).join(" · ");
      if (location) card.append(element("span", location, "draft-review-quote-label"));
    }
    quote(target ? target.kind === "passage" ? "Original source passage" : "CARE analysis" : "Library evidence", finding.source_quote);
    if (finding.explanation) card.append(element("p", String(finding.explanation)));
    if (target?.target_key) {
      const actions = element("div", undefined, "result-actions");
      actions.append(readingButton(runtime, target));
      card.append(actions);
    }
    return card;
  });
  runtime.draftReviewFindings.replaceChildren(...cards);
}

function scan(runtime, scope, live = false) {
  if (!runtime.docId) return;
  if (runtime.searchMode) updateWritingSearchWork(runtime, runtime.searchContextWorkId ?? runtime.searchWorkId);
  if (!writingSearchReady(runtime)) { paintResults(runtime); return; }
  const block = activeBlock(runtime);
  let query = runtime.query.value.trim();
  if (scope === "passage") query = selectedQuote(runtime, block);
  if (scope === "document") query = writingDraftSearchText(runtime);
  if (!query || (live && query.length < 48)) return;
  const blockId = block?.dataset.blockId || "";
  const kind = runtime.searchKind;
  const settings = writingSearchOptions(runtime);
  const signature = JSON.stringify([kind, scope, blockId, settings, query]);
  if (live && (signature === runtime.lastScan || runtime.panel.hidden || runtime.suggestionPane.hidden || !runtime.live.checked)) return;
  runtime.lastScan = signature;
  runtime.lastSearchScope = scope;
  runtime.hasSearched = true;
  selectTab(runtime, "suggestions");
  if (["scan", "scan-deeper"].includes(runtime.queued?.type)) runtime.queued = null;
  send(runtime, "scan", {query, block_id: blockId, scope, search_kind: kind, ...settings,
    ...(runtime.asyncSearch ? {background_search: true} : {})});
  paintResults(runtime);
}

function deepenWritingSearch(runtime) {
  const progress = runtime.searchProgress;
  if (!runtime.docId || !progress?.more || progress.status === "running" || runtime.suggestionKind !== runtime.searchKind || runtime.queued ||
      !writingSearchReady(runtime) ||
      !matchingWritingSearchSettings(runtime, progress) ||
      ["scan", "scan-deeper"].includes(runtime.pending?.type) || navigationActions.has(runtime.pending?.type)) return;
  send(runtime, "scan-deeper", {
    search_id: progress.id, search_depth: progress.depth, search_kind: runtime.searchKind, ...writingSearchOptions(runtime),
    ...(runtime.asyncSearch ? {background_search: true} : {}),
  });
  paintResults(runtime);
}

function scheduleWritingSearchPoll(runtime) {
  clearTimeout(runtime.searchPollTimer);
  runtime.searchPollTimer = 0;
  const progress = runtime.searchProgress;
  if (!runtime.asyncSearch || !runtime.docId || progress?.status !== "running" ||
      !progress.job_id || runtime.panel.hidden || runtime.suggestionPane.hidden ||
      !matchingWritingSearchSettings(runtime, progress)) return;
  runtime.searchPollTimer = setTimeout(() => {
    runtime.searchPollTimer = 0;
    if (!runtime.root.isConnected || runtime.searchProgress !== progress) return;
    if (!runtime.pending && !runtime.queued && !runtime.externalNavigation && !runtime.saveTimer &&
        !runtime.composing && !runtime.composingFootnote && same(capture(runtime), runtime.base)) {
      send(runtime, "scan-poll", {search_id: progress.id, search_job: progress.job_id}, null, true);
    }
    scheduleWritingSearchPoll(runtime);
  }, 650);
}

function installWritingSearchScroll(runtime) {
  const pane = runtime.suggestionPane;
  const options = {signal: runtime.controller.signal, passive: true};
  let lastTop = pane.scrollTop;
  let lastWheel = -Infinity;
  let intent = null;
  const nearEnd = distance => pane.scrollHeight > pane.clientHeight + 1 &&
    pane.scrollHeight - pane.clientHeight - pane.scrollTop <= distance;
  const arm = event => {
    const progress = runtime.searchProgress;
    if (event.isTrusted === false || !progress?.more || runtime.panel.hidden || pane.hidden) return;
    intent = {id: progress.id, depth: progress.depth, until: Date.now() + 1600};
  };
  const load = () => {
    const progress = runtime.searchProgress;
    if (!intent || Date.now() > intent.until || intent.id !== progress?.id || intent.depth !== progress.depth ||
        runtime.panel.hidden || pane.hidden) return;
    intent = null;
    deepenWritingSearch(runtime);
  };
  pane.addEventListener("wheel", event => {
    if (event.isTrusted === false) return;
    if (event.deltaY > 0 && Date.now() - lastWheel > 220) arm(event);
    lastWheel = Date.now();
    // An additional downward gesture at the bottom can request a pass even
    // when the scroll container has no farther pixels to move through.
    if (event.deltaY > 0 && nearEnd(1)) load();
  }, options);
  pane.addEventListener("touchstart", arm, options);
  pane.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.target === pane) arm(event);
  }, options);
  pane.addEventListener("keydown", event => {
    if (!event.repeat && ["PageDown", "End", "ArrowDown", " "].includes(event.key) &&
        !event.target?.closest?.("input, textarea, select, button, a, [contenteditable]")) arm(event);
  }, options);
  pane.addEventListener("scroll", () => {
    const down = pane.scrollTop > lastTop;
    lastTop = pane.scrollTop;
    if (down && nearEnd(92)) load();
  }, options);
}

function chooseWritingSearchKind(runtime, kind) {
  if (!writingSearchKinds.has(kind) || runtime.searchKind === kind) return;
  clearTimeout(runtime.scanTimer);
  runtime.searchKind = kind;
  if (runtime.query.value.trim() && runtime.docId) scan(runtime, "query");
  else paintResults(runtime);
}

function selectTab(runtime, tab) {
  for (const button of runtime.root.querySelectorAll("[data-tab]")) {
    button.setAttribute("aria-pressed", String(button.dataset.tab === tab));
  }
  runtime.suggestionPane.hidden = tab !== "suggestions";
  runtime.referencePane.hidden = tab !== "references";
  if (runtime.readingPane) runtime.readingPane.hidden = tab !== "reading";
  if (runtime.historyPane) runtime.historyPane.hidden = tab !== "history";
  runtime.activeResearchTab = tab;
  if (tab === "history") paintHistory(runtime);
  scheduleWritingSearchPoll(runtime);
}

function renderPanel(runtime) {
  const hidePanes = runtime.focus && runtime.compact;
  runtime.panel.hidden = runtime.activePane !== "research" || hidePanes;
  scheduleWritingSearchPoll(runtime);
  if (!runtime.panel.hidden) runtime.peerReview?.close();
  if (runtime.compact) runtime.outline.hidden = runtime.activePane !== "outline" || hidePanes;
  else if (!runtime.docId) {
    runtime.outline.hidden = true;
    paintWritingNavigator(runtime);
  }
  runtime.formatting.hidden = runtime.compact && (!runtime.docId || !runtime.formattingOpen || runtime.focus);
  runtime.root.classList.toggle("no-panel", runtime.panel.hidden && runtime.outline.hidden);
  runtime.root.classList.toggle("focus", runtime.focus && runtime.compact);
  runtime.root.classList.toggle("bare", !runtime.compact);
  runtime.measureWritingScroll?.();
  const peek = runtime.root.querySelector('[data-action="peek-research"]');
  if (peek) {
    peek.hidden = runtime.compact;
    peek.setAttribute("aria-expanded", String(!runtime.panel.hidden));
  }
  runtime.root.querySelector('[data-action="panel"]').setAttribute("aria-expanded", String(!runtime.panel.hidden));
  runtime.root.querySelector('[data-action="outline"]').setAttribute("aria-expanded", String(!runtime.outline.hidden));
  paintWritingFormatLauncher(runtime);
  runtime.root.querySelector('[data-action="focus"]').setAttribute("aria-pressed", String(runtime.focus));
  if (runtime.compact && !runtime.outline.hidden) paintOutline(runtime);
  if (!runtime.panel.hidden && runtime.activeResearchTab === "history") {
    loadHistoryText(runtime);
    paintHistory(runtime);
  }
}

function renderLayout(runtime, immediate = false) {
  runtime.root.classList.toggle("continuous", runtime.continuous);
  refreshWritingA4(runtime, immediate);
  runtime.refreshWritingFit?.();
  runtime.peerReview?.refresh();
  const button = runtime.root.querySelector('[data-action="layout"]');
  if (button) {
    button.querySelector("span").textContent = "A4 pages";
    button.setAttribute("aria-label", "A4 pages");
    button.setAttribute("aria-pressed", String(!runtime.continuous));
    button.title = runtime.continuous ? "Switch to A4 pages" : "Switch to continuous view";
  }
}

function libraryBase() {
  const base = new URL(window.location.href);
  base.pathname = base.pathname.replace(/\/writing-studio\/?$/, "/");
  base.search = "";
  base.hash = "";
  return base;
}

function libraryFrameLocation(frame, request) {
  try {
    const base = libraryBase();
    const url = new URL(frame.contentWindow.location.href);
    if (url.origin === base.origin && url.pathname === base.pathname &&
        url.searchParams.get("care_studio_embed") === "1" &&
        url.searchParams.get("care_studio_request") === request) {
      return Object.fromEntries(url.searchParams);
    }
  } catch {
    // The initial Library route is still available while the frame loads.
  }
  return null;
}

function libraryLocation(runtime) {
  const route = libraryFrameLocation(runtime.libraryFrame, runtime.libraryFrameRequest);
  if (route && runtime.libraryReportedWorkId) route.work = runtime.libraryReportedWorkId;
  return route;
}

function setLibraryExpanded(runtime, expanded) {
  runtime.libraryExpanded = Boolean(expanded && runtime.libraryRequest);
  runtime.root.classList.toggle("library-expanded", runtime.libraryExpanded);
  const button = runtime.root.querySelector('[data-action="library-width"]');
  if (button) {
    button.setAttribute("aria-pressed", String(runtime.libraryExpanded));
    button.title = runtime.libraryExpanded ? "Restore Library beside draft" : "Expand Library to fill Studio";
  }
  return button;
}

function updateLibraryDockVisibility(runtime) {
  const hasLibrary = Boolean(runtime.libraryRequest);
  const minimized = hasLibrary && Boolean(runtime.libraryMinimized);
  runtime.libraryDock.hidden = !hasLibrary;
  runtime.libraryDock.inert = minimized;
  runtime.root.classList.toggle("library-open", hasLibrary && !minimized);
  runtime.root.classList.toggle("library-minimized", minimized);
  if (runtime.libraryResume) runtime.libraryResume.hidden = !minimized;
}

function setLibraryMinimized(runtime, minimized) {
  if (runtime.compact || !runtime.libraryRequest || Boolean(runtime.libraryMinimized) === minimized) return false;
  runtime.libraryMinimized = minimized;
  updateLibraryDockVisibility(runtime);
  if (minimized) {
    runtime.libraryResume.focus({preventScroll: true});
  } else {
    runtime.activePane = "";
    runtime.peerReview?.close();
    renderPanel(runtime);
    runtime.libraryDock.querySelector('[data-action="minimize-library"]').focus({preventScroll: true});
  }
  return true;
}

function revealDockPassage(runtime, referenceId) {
  const reference = runtime.references.find(row => row.id === referenceId);
  const well = runtime.paper.closest(".page-well");
  if (!reference || !well) return;
  if (revealWritingA4(runtime, reference.block_id, reference)) return;
  const range = referenceRange(runtime, reference);
  const firstLine = range && [...range.getClientRects()].find(rect => rect.height > 0);
  const marker = [...runtime.paper.querySelectorAll("[data-writing-footnote]")]
    .find(node => node.dataset.writingFootnote === referenceId);
  const origin = firstLine || marker?.getBoundingClientRect() || findBlock(runtime, reference.block_id)?.getBoundingClientRect();
  if (origin) scrollWritingA4Context(well, origin);
}

function paintLibraryRun(runtime, run) {
  const panel = runtime.libraryRun || element("section", undefined, "library-dock-run");
  if (!runtime.libraryRun) {
    panel.setAttribute("aria-label", "Saved run details");
    runtime.libraryFrame.after(panel);
    runtime.libraryRun = panel;
  }
  panel.hidden = false;
  const status = element("strong", run.status_label || "Saved run", "library-dock-run-status");
  status.dataset.status = run.status || "";
  panel.replaceChildren(status);
  const dates = [["Started", run.started_at], ["Completed", run.completed_at], ["Last activity", run.opened_at]];
  const facts = element("dl", undefined, "library-dock-run-facts");
  for (const [label, timestamp] of dates) {
    const date = historyDate(timestamp);
    if (date) facts.append(element("dt", label), element("dd", date));
  }
  if (facts.childElementCount) panel.append(facts);
  if (run.stages?.length) {
    const stages = element("dl", undefined, "library-dock-run-facts");
    for (const stage of run.stages) stages.append(element("dt", stage.name), element("dd", stage.status));
    panel.append(element("h3", "Recorded stages"), stages);
  }
  if (run.reading_route) panel.append(makeButton("Open saved reading", () => send(runtime, "history-open", {
    kind: "run", key: run.key, destination: "reading", beside: true,
  })));
  else panel.append(element("p", "Saved run record. A Library reading is available here when this attempt owns a completed build."));
  panel.scrollTop = 0;
}

function paintLibraryDockHeading(runtime, dock) {
  const modes = {sheet: "Reading pane", axiom: "Axiom", route: "Evidence route", source: "Source passage", notes: "Axiom notes", library: "Bookshelf", "study-set": "Study set", search: "Search", run: "Saved run"};
  const label = dock.mode === "notes" && String(dock.layer).toLowerCase() === "source"
    ? "Passage notes" : modes[dock.mode] || "CARE Library";
  const title = dock.title || "CARE Library";
  runtime.libraryDock.querySelector("[data-library-title]").textContent = dock.mode === "study-set" ? title : title.replaceAll("_", " ");
  runtime.libraryDock.querySelector("[data-library-label]").textContent =
    [label, dock.reference].filter(Boolean).join(" · ");
  runtime.libraryDock.dataset.libraryLayer = String(dock.layer || "").toLowerCase();
}

function finishLibraryFrame(runtime, pending, reveal = false) {
  if (!pending || runtime.libraryPending !== pending) return;
  runtime.libraryPending = null;
  clearTimeout(pending.fallback);
  clearTimeout(pending.indicator);
  pending.readyObserver?.disconnect();
  runtime.libraryLoading.hidden = true;
  if (!reveal) {
    pending.frame.remove();
    return;
  }
  runtime.libraryFrame.remove();
  runtime.libraryFrame = pending.frame;
  runtime.libraryFrameRequest = pending.dock.request;
  pending.frame.removeAttribute("data-library-staging");
  pending.frame.removeAttribute("aria-hidden");
  pending.frame.inert = false;
  paintLibraryDockHeading(runtime, pending.dock);
}

function stageLibraryFrame(runtime, dock, url) {
  // Keep the current reading interactive until its replacement can be shown.
  // Insert the new iframe once, since moving a mounted iframe can reload it.
  const frame = element("iframe");
  frame.dataset.libraryFrame = "";
  frame.dataset.libraryStaging = "";
  frame.title = runtime.libraryFrame.title;
  frame.inert = true;
  frame.setAttribute("aria-hidden", "true");
  const pending = runtime.libraryPending = {frame, dock};
  if (!runtime.libraryFrameRequest) pending.indicator = setTimeout(() => {
    if (runtime.libraryPending === pending) runtime.libraryLoading.hidden = false;
  }, 500);
  frame.addEventListener("load", () => {
    const location = libraryFrameLocation(frame, dock.request);
    if (!location) return;
    const child = frame.contentDocument;
    child?.addEventListener("keydown", event => {
      if (runtime.libraryFrame !== frame || runtime.libraryFrameRequest !== dock.request ||
          !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      document.dispatchEvent(new CustomEvent("care:spotlight-open"));
    }, {capture: true, signal: runtime.controller.signal});
    if (runtime.libraryPending !== pending) return;
    clearTimeout(pending.fallback);
    // Companion views without a reader handshake still display their response.
    pending.fallback = setTimeout(() => finishLibraryFrame(runtime, pending, true), 5000);
    let selector = "";
    if (location.view === "landing") {
      selector = location.q ? ".st-key-care_study_results" : ".st-key-care_study_search_box";
    } else if (location.view === "field") {
      selector = ".st-key-care_study_field_desk";
    }
    if (child && selector) {
      const revealReading = () => {
        if (child.querySelector(selector)) finishLibraryFrame(runtime, pending, true);
      };
      pending.readyObserver?.disconnect();
      pending.readyObserver = new MutationObserver(revealReading);
      pending.readyObserver.observe(child, {childList: true, subtree: true});
      revealReading();
    }
  }, {signal: runtime.controller.signal});
  frame.src = url.href;
  runtime.libraryFrame.after(frame);
}

function handleLibraryFrameMessage(runtime, event) {
  if (!runtime.libraryRequest || event.origin !== window.location.origin) return;
  if (event.data?.type === "care-studio-reader-ready") {
    const pending = runtime.libraryPending;
    if (pending && event.source === pending.frame.contentWindow && event.data.request === pending.dock.request) {
      finishLibraryFrame(runtime, pending, true);
    }
    if (event.source === runtime.libraryFrame?.contentWindow && event.data.request === runtime.libraryFrameRequest) {
      if (typeof event.data.shelfTitle === "string") {
        const title = event.data.shelfTitle.trim().slice(0, 300);
        paintLibraryDockHeading(runtime, {title: title || "CARE Library", mode: title ? "study-set" : "library"});
      }
      if (typeof event.data.workTitle === "string") {
        const title = event.data.workTitle.trim().slice(0, 300);
        runtime.libraryReportedWorkId = runtime.searchBooks?.some(book => book.work_id === event.data.workId)
          ? event.data.workId : "";
        paintLibraryDockHeading(runtime, {title: title || "CARE Library",
          mode: event.data.readingKind === "passage" ? "source" : title ? "sheet" : "library",
          layer: typeof event.data.readingLayer === "string" ? event.data.readingLayer.slice(0, 24) : "",
          reference: typeof event.data.readingReference === "string" ? event.data.readingReference.slice(0, 300) : ""});
      }
      updateWritingSearchWork(runtime, runtime.searchContextWorkId || "");
      paintResults(runtime);
      paintDraftReview(runtime);
    }
    return;
  }
  if (event.data?.type !== "care-study-draft" || !runtime.libraryFrameRequest ||
      event.source !== runtime.libraryFrame?.contentWindow || event.data.request !== runtime.libraryFrameRequest) return;
  if (typeof event.data.document !== "string" || typeof event.data.reference !== "string") return;
  send(runtime, "library-draft", {target_document: event.data.document, reference_id: event.data.reference});
}

function paintLibraryDock(runtime, dock) {
  if (!runtime.libraryDock || !runtime.libraryFrame) return;
  const run = dock?.mode === "run" ? dock.run : null;
  if (!(dock?.request && (dock.route || run))) {
    if (runtime.libraryRequest) {
      finishLibraryFrame(runtime, runtime.libraryPending);
      runtime.libraryFrame.removeAttribute("src");
      requestAnimationFrame(() => {
        if (!runtime.libraryRequest && runtime.docId && !runtime.a4?.active) restoreSelection(runtime);
      });
    }
    runtime.libraryRequest = "";
    runtime.libraryFrameRequest = "";
    runtime.libraryReportedWorkId = "";
    runtime.libraryMinimized = false;
    updateLibraryDockVisibility(runtime);
    if (runtime.libraryExpanded) setLibraryExpanded(runtime, false);
    return;
  }
  if (runtime.libraryRequest === dock.request) return;
  runtime.libraryRequest = dock.request;
  runtime.libraryReportedWorkId = "";
  runtime.libraryMinimized = false;
  updateLibraryDockVisibility(runtime);
  finishLibraryFrame(runtime, runtime.libraryPending);
  runtime.activePane = "";
  runtime.peerReview?.close();
  if (runtime.compact) runtime.libraryDock.querySelector('[data-action="close-library"]').focus({preventScroll: true});
  runtime.libraryDock.querySelector('[data-action="library-full"]').hidden = Boolean(run);
  runtime.libraryFrame.hidden = Boolean(run) || !runtime.libraryFrameRequest;
  if (run || !runtime.libraryFrameRequest) paintLibraryDockHeading(runtime, dock);
  if (run) {
    runtime.libraryFrame.removeAttribute("src");
    runtime.libraryFrameRequest = "";
    paintLibraryRun(runtime, run);
    return;
  }
  if (runtime.libraryRun) runtime.libraryRun.hidden = true;
  const url = libraryBase();
  for (const [key, value] of Object.entries(dock.route)) url.searchParams.set(key, value);
  if (typeof dock.fragment === "string") url.hash = dock.fragment;
  url.searchParams.set("care_studio_embed", "1");
  url.searchParams.set("care_studio_request", runtime.libraryRequest);
  if (!runtime.compact) url.searchParams.set("care_studio_pane_reading", "1");
  const requests = runtime.librarySourceRequests;
  requests.add(runtime.libraryRequest);
  if (requests.size > 16) requests.delete(requests.values().next().value);
  stageLibraryFrame(runtime, dock, url);
  if (dock.draft_reference && !runtime.compact) requestAnimationFrame(() => {
    if (runtime.libraryRequest === dock.request && runtime.docId === dock.draft_id) {
      revealDockPassage(runtime, dock.draft_reference);
    }
  });
}

function observeLibraryShell(runtime) {
  if (typeof ResizeObserver !== "function") return;
  const shell = document.querySelector(".st-key-care_studio_navigation_host");
  if (!shell) return;
  const measure = () => {
    const height = shell.getBoundingClientRect().height;
    runtime.root.style.setProperty("--library-shell-height", height + "px");
  };
  const observer = new ResizeObserver(measure);
  observer.observe(shell);
  measure();
  runtime.shellObserver = observer;
}

function installWritingScrollViewport(runtime) {
  const {formatting, navigator, a4: {well}, controller: {signal}} = runtime;
  let inset = 0;
  let navigatorInset = 0;
  const measure = () => {
    const top = well.getBoundingClientRect().top;
    const toolbarBottom = formatting.hidden || formatting.inert ? top :
      formatting.parentElement.getBoundingClientRect().top + formatting.offsetHeight;
    // Narrow Studio places the navigator above the draft instead of in the left rail.
    const layoutInset = getComputedStyle(navigator).position === "relative"
      ? Math.max(0, navigator.getBoundingClientRect().bottom - top) : 0;
    if (layoutInset !== navigatorInset) {
      well.style.setProperty("--studio-navigator-inset", `${layoutInset}px`);
      if (well.scrollTop > 0) well.scrollTop = Math.max(0, well.scrollTop + layoutInset - navigatorInset);
      navigatorInset = layoutInset;
    }
    const next = Math.max(0, toolbarBottom - top, layoutInset);
    if (next === inset) return;
    well.style.setProperty("--studio-scroll-inset", `${next}px`);
    inset = next;
  };
  runtime.measureWritingScroll = measure;
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(measure);
    observer.observe(formatting);
    observer.observe(navigator);
    observer.observe(well.parentElement);
    signal.addEventListener("abort", () => observer.disconnect(), {once: true});
  }
}

function togglePane(runtime, pane) {
  runtime.activePane = runtime.activePane === pane && !(runtime.focus && runtime.compact) ? "" : pane;
  if (runtime.compact) runtime.focus = false;
  if (runtime.activePane !== "research") clearTimeout(runtime.scanTimer);
  renderPanel(runtime);
}

function paintWritingFormatLauncher(runtime) {
  const expanded = !runtime.formatting.hidden && !runtime.formatting.inert;
  runtime.root.querySelector('[data-action="formatting"]').setAttribute("aria-expanded",
    String(expanded));
  runtime.formatLauncher.hidden = !runtime.compact || !runtime.docId || runtime.focus || expanded;
}

function tuckWritingFormatBar(runtime, tucked) {
  if (Boolean(runtime.formatting.inert) === tucked) return;
  runtime.formatting.inert = tucked;
  paintWritingFormatLauncher(runtime);
  runtime.measureWritingScroll?.();
}

function installWritingFormatOverflow(runtime, options) {
  const rail = runtime.formatting.parentElement;
  if (!rail) return;
  const overflow = options.querySelector("[data-format-overflow]");
  const groups = [...runtime.formatting.querySelectorAll("[data-format-min]")].filter(
    group => !group.hidden && !options.contains(group),
  ).map((group, order) => {
    const anchor = group.ownerDocument.createComment("Format group");
    group.before(anchor);
    return {group, anchor, order, minWidth: Number(group.dataset.formatMin)};
  });
  const {signal} = runtime.controller;
  const {well} = runtime.a4;
  const placeMenu = () => {
    if (runtime.compact || !runtime.formatMore.open) return;
    const right = runtime.formatMore.getBoundingClientRect().right - runtime.formatting.getBoundingClientRect().left;
    runtime.formatMore.style.setProperty("--format-more-right", `${right}px`);
  };
  const update = () => {
    const {width} = rail.getBoundingClientRect();
    if (!width) return;
    const doc = rail.ownerDocument;
    const rem = parseFloat(doc.defaultView.getComputedStyle(doc.documentElement).fontSize) || 16;
    const available = width / rem;
    runtime.narrowFormat = available < 44;
    if (runtime.compact && !runtime.narrowFormat && runtime.formattingOpen) tuckWritingFormatBar(runtime, false);
    for (const {group, anchor, order, minWidth} of groups) {
      const intoMore = available < minWidth;
      if (group.parentNode === (intoMore ? overflow : anchor.parentNode)) continue;
      const active = rail.getRootNode().activeElement;
      const focused = group.contains(active);
      if (intoMore) {
        if (focused) runtime.formatMore.open = true;
        const next = groups.find(entry => entry.order > order && entry.group.parentNode === overflow);
        overflow.insertBefore(group, next?.group || null);
      } else {
        anchor.after(group);
      }
      if (focused) active.focus({preventScroll: true});
    }
    placeMenu();
  };
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    signal.addEventListener("abort", () => observer.disconnect(), {once: true});
  } else {
    window.addEventListener("resize", update, {signal});
  }
  update();
  if (!runtime.compact) {
    runtime.formatMore.addEventListener("toggle", placeMenu, {signal});
    return;
  }

  // Respond to a scrolling gesture rather than caret following, Find, or pagination.
  let previous = well.scrollTop;
  let gesture = -Infinity;
  const scrolling = () => { gesture = performance.now(); };
  well.addEventListener("wheel", event => {
    if (event.deltaY && !event.ctrlKey) scrolling();
  }, {passive: true, signal});
  well.addEventListener("touchmove", scrolling, {passive: true, signal});
  well.addEventListener("scroll", () => {
    const top = well.scrollTop;
    const delta = top - previous;
    previous = top;
    if (!runtime.narrowFormat || !runtime.formattingOpen || runtime.formatting.hidden || performance.now() - gesture > 240 ||
        runtime.formatMore.open || runtime.formatting.contains(rail.getRootNode().activeElement)) return;
    if (top < 4 || delta < -1) tuckWritingFormatBar(runtime, false);
    else if (top > 24 && delta > 1 && writingSelectionRange(runtime.paper)?.collapsed !== false) {
      tuckWritingFormatBar(runtime, true);
    }
  }, {passive: true, signal});
}

function installWritingFormatBar(runtime) {
  const footnotes = runtime.formatting.querySelector("[data-format-footnotes]");
  if (footnotes && runtime.footnoteModeButton) footnotes.append(runtime.footnoteModeButton);
  const more = runtime.formatting.querySelector("[data-format-more]");
  const options = more.querySelector("[data-format-more-options]");
  for (const [selector, label] of [
    ['[data-command="strikeThrough"]', "Strikethrough"],
    ['[data-command="clearTypography"]', "Reset font and size"],
    ['[data-action="select-all-text"]', "Select all text"],
  ]) {
    const control = runtime.formatting.querySelector(selector);
    control.textContent = label;
    control.classList.remove("strikethrough");
    options.append(control);
  }
  if (runtime.compact) options.append(footnotes);
  else {
    runtime.root.insertBefore(runtime.formatting.parentElement, runtime.workspace);
    runtime.formatting.setAttribute("aria-label", "Studio tools");
    runtime.formatting.querySelector('[data-action="collaborate"]').hidden = false;
    const tools = runtime.formatting.querySelector("[data-format-document-tools]");
    tools.prepend(runtime.root.querySelector('[data-action="layout"]'));
    tools.hidden = false;
  }
  more.hidden = false;
  runtime.formatMore = more;
  installWritingFormatOverflow(runtime, options);
  options.addEventListener("click", event => {
    if (event.target.closest("button:not(:disabled)")) queueMicrotask(() => { more.open = false; });
  }, {signal: runtime.controller.signal});
}

function cancelWritingFormatDismissal(runtime) {
  clearTimeout(runtime.formatDismissTimer);
  runtime.formatDismissTimer = null;
}

function scheduleWritingFormatDismissal(runtime) {
  if (!runtime.compact || !runtime.formattingOpen || runtime.formatting.hidden ||
      runtime.formatting.inert || runtime.formatDismissTimer) return;
  runtime.formatDismissTimer = setTimeout(() => {
    runtime.formatDismissTimer = null;
    if (!runtime.formattingOpen || runtime.formatting.hidden || runtime.composing || runtime.formatMore.open ||
        runtime.formatting.contains(runtime.paper.getRootNode().activeElement) ||
        writingSelectionRange(runtime.paper)?.collapsed === false) return;
    runtime.formattingOpen = false;
    tuckWritingFormatBar(runtime, true);
  }, 2800);
}

function openWritingFormatting(runtime, footnotes = false) {
  if (!runtime.docId || runtime.paper.contentEditable !== "true") return;
  rememberSelection(runtime);
  if (runtime.compact) {
    cancelWritingFormatDismissal(runtime);
    runtime.formattingOpen = true;
    tuckWritingFormatBar(runtime, false);
    runtime.focus = false;
    renderPanel(runtime);
  }
  if (footnotes && runtime.formatMore.contains(runtime.footnoteModeButton)) runtime.formatMore.open = true;
  (footnotes ? runtime.footnoteModeButton : runtime.format).focus({preventScroll: true});
}

function closeWritingFormatting(runtime) {
  if (runtime.compact) {
    cancelWritingFormatDismissal(runtime);
    runtime.formattingOpen = false;
    if (runtime.formatMore) runtime.formatMore.open = false;
    renderPanel(runtime);
    tuckWritingFormatBar(runtime, false);
  }
  restoreSelection(runtime);
}

function paintWritingNavigator(runtime) {
  const binderOpen = runtime.binder && !runtime.binder.panel.hidden;
  const views = runtime.navigator.querySelector(".studio-navigator-views");
  views.hidden = runtime.navigatorClosed || (!binderOpen && runtime.outline.hidden);
  for (const button of views.querySelectorAll("[data-navigator-view]")) {
    const isBinder = button.dataset.navigatorView === "binder";
    button.disabled = !isBinder && !runtime.docId;
    button.setAttribute("aria-pressed", String(isBinder === Boolean(binderOpen)));
  }
}

function installOutline(runtime) {
  const surface = runtime.navigator.parentElement;
  const update = () => {
    const {width} = surface.getBoundingClientRect();
    if (!width) return;
    const doc = runtime.root.ownerDocument;
    const rem = parseFloat(doc.defaultView.getComputedStyle(doc.documentElement).fontSize) || 16;
    const wide = width >= 64 * rem;
    if (runtime.outlineWide === wide) return;
    runtime.outlineWide = wide;
    runtime.outlineDisclosure.open = wide;
  };
  const {signal} = runtime.controller;
  runtime.navigator.addEventListener("click", event => {
    if (event.target.closest("[data-close-writing-navigator]")) {
      runtime.navigatorClosed = true;
      closeWritingBinder(runtime, false);
      paintWritingNavigator(runtime);
      if (runtime.docId && runtime.binder.reading.hidden) restoreSelection(runtime);
      return;
    }
    const button = event.target.closest("[data-navigator-view]");
    if (!button) return;
    if (button.dataset.navigatorView === "binder") {
      openWritingBinder(runtime, false);
    } else {
      runtime.outlineRequested = true;
      runtime.outlineDisclosure.open = true;
      paintOutline(runtime);
      closeWritingBinder(runtime, false);
    }
  }, {signal});
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(update);
    observer.observe(surface);
    signal.addEventListener("abort", () => observer.disconnect(), {once: true});
  } else {
    window.addEventListener("resize", update, {signal});
    requestAnimationFrame(update);
  }
}

function noteTyping(runtime, dismissTools = true) {
  if (dismissTools) {
    scheduleWritingFormatDismissal(runtime);
    if (runtime.binder) scheduleWritingBinderDismissal(runtime);
  }
  if (runtime.compact) return;
  const now = performance.now();
  runtime.typingCount = now - (runtime.lastType || 0) > 950 ? 1 : (runtime.typingCount || 0) + 1;
  runtime.lastType = now;
  if (runtime.typingCount < 3) return;
  runtime.root.classList.add("typing");
  clearTimeout(runtime.typingTimer);
  runtime.typingTimer = setTimeout(() => runtime.root.classList.remove("typing"), 1700);
}

function paintOutline(runtime) {
  const headings = [...runtime.paper.querySelectorAll(writingHeadingSelector)]
    .map((heading, index) => [index, topBlock(runtime.paper, heading)?.dataset.blockId,
      heading.localName.slice(1), writingHeadingLabel(heading)])
    .filter(([, blockId, , text]) => blockId && text);
  if (!runtime.compact) {
    runtime.outline.hidden = !runtime.docId || (!headings.length && !runtime.outlineRequested);
    paintWritingNavigator(runtime);
  }
  const signature = JSON.stringify(headings);
  if (signature === runtime.outlineSignature) return;
  runtime.outlineSignature = signature;
  runtime.outlineList.replaceChildren(...(headings.length ? headings.map(([index, blockId, level, text]) => {
    const button = makeButton(text, () => {
      if (runtime.binder) closeBinderReading(runtime, false);
      if (!runtime.compact && !runtime.outlineWide) runtime.outlineDisclosure.open = false;
      const heading = runtime.paper.querySelectorAll(writingHeadingSelector)[index];
      if (!heading || heading.parentElement === runtime.paper) return jump(runtime, blockId, null, true);
      refreshWritingA4(runtime, true);
      const caret = document.createRange();
      caret.selectNodeContents(heading);
      caret.collapse(true);
      restoreSelection(runtime, caret);
      rememberSelection(runtime);
      scrollWritingA4Context(runtime.a4.well, heading.getBoundingClientRect());
    });
    button.dataset.level = level;
    return button;
  }) : [element("p", "Add a heading to make a place you can jump back to.", "empty-results")]));
}

function targetOf(record) {
  return record.target || record;
}

function makeButton(label, handler) {
  const button = element("button", label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

function browserHistory(key) {
  try {
    const rows = JSON.parse(window.sessionStorage.getItem(key) || "[]");
    return Array.isArray(rows) ? rows.filter(row => row && typeof row === "object") : [];
  } catch {
    return [];
  }
}

function rememberReading(target) {
  if (!target?.item_id || target.kind === "passage") return;
  const key = readingHistoryKeys[0];
  const scope = target.preserved_pane || "";
  const entry = {
    kind: "axiom", id: target.item_id, scope, title: target.title, work_id: target.work_id,
    metadata: [target.work_title].filter(Boolean), layer: target.layer, text: target.text?.slice(0, 12_000),
    studio_route: target.route, destination: target.href, at: new Date().toISOString(),
  };
  const previous = browserHistory(key).filter(row => row.id !== entry.id || row.scope !== scope);
  try {
    window.sessionStorage.setItem(key, JSON.stringify([entry, ...previous].slice(0, 60)));
  } catch {
    // The Librarian still shows whatever history the browser can read.
  }
}

function historyRows(runtime) {
  if (runtime.historyKind === "books") return browserHistory("care-writing-book-history-v1").slice(0, 40);
  if (runtime.historyKind !== "axioms") return runtime.history?.[runtime.historyKind] || [];
  const seen = new Set();
  return readingHistoryKeys.flatMap(browserHistory)
    .filter(row => row.kind === "axiom" && typeof row.id === "string")
    .sort((first, second) => String(second.at || "").localeCompare(String(first.at || "")))
    .filter(row => {
      const identity = row.id + "\u0000" + (row.scope || "");
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }).slice(0, 60).map(row => ({
      ...row, text: row.text || (!row.scope && runtime.history?.axiom_text?.[row.id]) || "",
    }));
}

function loadHistoryText(runtime) {
  if (runtime.compact || runtime.panel.hidden || runtime.activeResearchTab !== "history" ||
      runtime.historyKind !== "axioms" || runtime.pending) return;
  const items = historyRows(runtime).filter(row => !row.scope && !row.text && !runtime.historyRequested.has(row.id))
    .slice(0, 20).map(row => {
      runtime.historyRequested.add(row.id);
      const href = safeHref(row.destination);
      const work = href ? new URL(href).searchParams.get("work") : "";
      return {id: row.id, work_id: row.work_id || row.studio_route?.work || work || ""};
    });
  if (items.length) send(runtime, "history-load", {kind: "axioms", items});
}

function historyDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(undefined, {month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"});
}

function paintHistory(runtime) {
  if (!runtime.historyList) return;
  const kind = runtime.historyKind;
  const rows = historyRows(runtime);
  const waiting = runtime.pending?.type === "history-load" && runtime.pending.extra?.kind === kind;
  const signature = JSON.stringify([kind, rows, waiting, Boolean(runtime.docId)]);
  if (signature === runtime.historySignature) return;
  runtime.historySignature = signature;
  for (const button of runtime.root.querySelectorAll("[data-history-kind]")) {
    button.setAttribute("aria-pressed", String(button.dataset.historyKind === kind));
  }
  const list = rows.map(row => {
    const rowKind = {axioms: "axiom", routes: "route", books: "book", runs: "run"}[kind];
    const {card, actions} = resultCard({
      title: row.title, label: row.id || row.key, layer: row.layer || row.id, text: row.text,
      metadata: [
        ...(Array.isArray(row.metadata) ? row.metadata : []), row.subtitle, row.status_label,
        historyDate(row.at || row.opened_at),
      ].filter(Boolean).join(" · "),
    });
    card.classList.add("history-card");
    card.dataset.kind = rowKind;
    actions.classList.add("history-actions");
    if (rowKind === "axiom" && runtime.docId && !row.scope) {
      actions.append(makeButton("Read beside draft", () => {
        selectTab(runtime, "reading");
        runtime.root.querySelector('[data-tab="reading"]').hidden = false;
        runtime.readingContent?.replaceChildren(element("p", "Opening reading…", "empty-results"));
        runtime.readingSignature = "";
        send(runtime, "history-read", {
          item_id: row.id, work_id: row.work_id || "", destination: row.destination || "", open_library: !runtime.compact,
        });
      }));
    }
    if (rowKind === "run") {
      actions.append(makeButton("Open book", () => send(runtime, "history-open", {
        kind: "run", key: row.key, destination: "book", beside: true,
      })));
    } else if (rowKind !== "axiom" || row.studio_route || (row.destination && row.destination !== "/")) {
      const label = {axiom: "Open full reading", route: "Open route", book: "Open book"}[rowKind];
      actions.append(makeButton(label, () => send(runtime, "history-open", {
        kind: rowKind, key: row.key || "", item_id: row.id || "",
        route: row.studio_route || row.route || null, destination: row.destination || "",
        reading_title: row.title || "", beside: !runtime.compact,
      })));
    }
    return card;
  });
  const empty = {
    axioms: "Axioms you open in CARE appear here.",
    routes: "Routes you open in the Library appear here.",
    books: "Books you open in the Library appear here.",
    runs: "Recent activity from the Run Room appears here.",
  };
  runtime.historyList.replaceChildren(...(list.length ? list : [
    element("p", waiting ? "Loading history…" : empty[kind], "empty-results"),
  ]));
}

function chooseHistoryKind(runtime, kind) {
  if (!historyKinds.has(kind)) return;
  runtime.historyKind = kind;
  if (runtime.historyPane) runtime.historyPane.scrollTop = 0;
  if (kind === "routes" || kind === "runs") send(runtime, "history-load", {kind});
  if (kind === "axioms") loadHistoryText(runtime);
  paintHistory(runtime);
}

function shortenWritingPassage(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const chars = Array.from(text);
  if (chars.length <= limit) return text;
  const prefix = chars.slice(0, limit - 1).join("");
  const wordBoundary = prefix.search(/\s+\S*$/);
  return (wordBoundary >= limit / 2 ? prefix.slice(0, wordBoundary) : prefix).trimEnd() + "…";
}

function resultCard(record, {fullPassage = false, showSearchMatch = false, bookmark = null} = {}) {
  const target = targetOf(record);
  const card = element("article", undefined, "result");
  const passage = target.kind === "passage";
  const layer = passage ? "source" : String(target.layer || target.label || "").toLowerCase().match(/^(source|raw|ch|cl|mc|wb|numo)(?=[\s_.:/-]|$)/)?.[1];
  if (layer) card.dataset.layer = layer === "raw" ? "source" : layer;
  let meta = target.metadata || [target.work_title, target.label || target.item_id, target.version].filter(Boolean).join(" · ");
  if (passage) {
    const page = target.citation?.page;
    const location = page ? `${target.citation.page_kind === "pdf" ? "PDF page" : "Page"} ${page}` : "";
    const details = [target.item_id, location].filter(value => value && !meta.includes(value));
    meta = [meta, ...details].filter(Boolean).join(" · ");
  }
  const identity = bookmark ? element("div", undefined, "result-identity") : card;
  if (meta) identity.append(element("span", meta, "eyebrow"));
  identity.append(element("strong", target.title || target.label || target.item_id || (passage ? "Source passage" : "CARE axiom")));
  if (bookmark) {
    const header = element("header", undefined, "result-head");
    header.append(identity, bookmark);
    card.append(header);
  }
  const excerpt = passage && !fullPassage ? shortenWritingPassage(target.text, 520) : target.text;
  if (excerpt) {
    const prose = element("p", excerpt);
    if (passage && target.target_key && target.work_id && !target.preserved &&
        (!target.rendition_type || target.rendition_type === "canonical")) prose.dataset.sourceQuoteKey = target.target_key;
    card.append(prose);
  }
  const match = record.search_match || target.search_match;
  if (showSearchMatch && match?.reason) {
    const note = element("p", undefined, "search-match");
    if (match.label) note.append(element("span", String(match.label) + " · ", "search-match-label"));
    note.append(document.createTextNode(String(match.reason)));
    card.append(note);
  }
  const actions = element("div", undefined, "result-actions");
  card.append(actions);
  return {card, actions, target};
}

function resultBookmarkBusy(runtime) {
  return [runtime.pending, runtime.queued].find(action => action?.type === "axiom-bookmark");
}

function syncResultBookmarks(runtime) {
  const busy = resultBookmarkBusy(runtime);
  for (const button of runtime.results.querySelectorAll("[data-axiom-bookmark]")) {
    const saved = runtime.savedAxiomIds.has(button.dataset.axiomBookmark);
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute("aria-disabled", String(Boolean(busy || runtime.queued)));
    button.toggleAttribute("data-saving", busy?.extra?.target_key === button.dataset.targetKey);
    button.title = saved ? "Remove from Saved readings" : "Save axiom";
  }
}

function resultBookmark(runtime, target) {
  const button = makeButton("", () => {
    if (resultBookmarkBusy(runtime) || runtime.queued) return;
    runtime.bookmarkStatus.textContent = "";
    runtime.bookmarkStatus.removeAttribute("data-error");
    send(runtime, "axiom-bookmark", {
      target_key: target.target_key,
      active: !runtime.savedAxiomIds.has(target.bookmark_id),
    });
    syncResultBookmarks(runtime);
  });
  button.className = "result-bookmark";
  button.dataset.axiomBookmark = target.bookmark_id;
  button.dataset.targetKey = target.target_key;
  button.setAttribute("aria-label", `Bookmark axiom ${target.item_id}`);
  button.innerHTML = '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.25h10v14l-5-3.5-5 3.5z"/></svg>';
  return button;
}

function readingButton(runtime, target, label = "Read beside draft") {
  return makeButton(label, () => {
    const openLibrary = label === "Read beside draft" && !runtime.compact;
    runtime.activePane = "research";
    const tab = runtime.root.querySelector('[data-tab="reading"]');
    if (tab) tab.hidden = false;
    selectTab(runtime, "reading");
    renderPanel(runtime);
    if (runtime.reading?.focus?.target_key === target.target_key && target.target_key) {
      const passage = target.kind === "passage";
      const route = passage ? runtime.reading.focus.route : runtime.reading.focus.sheet_route;
      if (openLibrary && Object.keys(route || {}).length) {
        send(runtime, "reading-open", {destination: passage ? "source" : "sheet", item_id: target.item_id, target_key: target.target_key, beside: true});
      }
      return;
    }
    runtime.readingError = "";
    runtime.readingSignature = "";
    runtime.readingContent?.replaceChildren(element("p", "Opening reading…", "empty-results"));
    send(runtime, "read", {target_key: target.target_key || "", item_id: target.item_id || "", open_library: openLibrary});
  });
}

function linkButton(runtime, target) {
  const passageTarget = target.kind === "passage";
  const button = makeButton(passageTarget ? "Link passage" : "Link selection", () => {
    const passage = passageSelection(runtime);
    if (!passage) return;
    const quote = renderedText(runtime, runtime.range.cloneContents()).trim().slice(0, 3000) || passage.selection.text.trim();
    send(runtime, "link", {
      item_id: target.item_id || "",
      target_key: target.target_key || "",
      block_id: passage.blockId,
      quote,
      selection: passage.selection,
    });
  });
  button.dataset.linkPassage = "";
  button.title = `Highlight text in the draft to attach this ${passageTarget ? "source passage" : "axiom"}`;
  button.disabled = !passageSelection(runtime);
  return button;
}

function pointAtOffset(block, offset) {
  const walker = writingProseWalker(block);
  let node;
  while ((node = walker.nextNode())) {
    if (offset <= node.length) return [node, offset];
    offset -= node.length;
  }
  return offset === 0 ? [block, block.childNodes.length] : null;
}

function referenceRange(runtime, reference) {
  const location = reference.selection;
  if (!location) return null;
  const first = findBlock(runtime, reference.block_id);
  const last = findBlock(runtime, location.end_block_id);
  if (!first || !last) return null;
  const locate = (start, end) => {
    const blankPoint = first === last && start === 0 && end === 0 && !writingProseText(first);
    const startPoint = blankPoint ? [first, 0] : pointAtOffset(first, start);
    const endPoint = blankPoint ? startPoint : pointAtOffset(last, end);
    if (!startPoint || !endPoint) return null;
    const range = document.createRange();
    range.setStart(...startPoint);
    range.setEnd(...endPoint);
    return writingProseRange(range) === location.text ? range : null;
  };
  const saved = locate(location.start, location.end);
  if (saved || first !== last || !location.text) return saved;
  const text = writingProseText(first);
  const offset = text.indexOf(location.text);
  if (offset < 0 || text.indexOf(location.text, offset + 1) >= 0) return null;
  return locate(offset, offset + location.text.length);
}

function footnoteFocusIsNeutral(runtime, node) {
  const doc = runtime.paper.ownerDocument;
  return !node || node === doc.body || node === doc.documentElement || node === runtime.paper.getRootNode().host;
}

function installFootnoteFocusReturn(runtime) {
  const doc = runtime.paper.ownerDocument;
  const {signal} = runtime.controller;
  const cancel = () => {
    runtime.openedFootnoteFocus = null;
    runtime.pastedFootnoteCaret = null;
  };
  // A new pointer or focus gesture owns focus, even while the route loads.
  doc.addEventListener("pointerdown", cancel, {capture: true, signal});
  doc.addEventListener("focusin", event => {
    if (!runtime.openedFootnoteFocus && !runtime.pastedFootnoteCaret) return;
    const target = event.composedPath?.()[0] || event.target;
    if (footnoteFocusIsNeutral(runtime, target)) return;
    if (target !== runtime.openedFootnoteFocus?.marker) runtime.openedFootnoteFocus = null;
    if (target !== runtime.paper) runtime.pastedFootnoteCaret = null;
  }, {signal});
  doc.addEventListener("keydown", event => {
    const claim = runtime.pastedFootnoteCaret;
    if (!claim || claim.documentId !== runtime.docId || !runtime.navigationLocked ||
        event.key !== " " || !event.cancelable || event.defaultPrevented || event.isComposing ||
        event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
    const target = event.composedPath?.()[0] || event.target;
    if (target !== runtime.paper && !footnoteFocusIsNeutral(runtime, target)) return;
    event.preventDefault();
    claim.spaces += " ";
  }, {capture: true, signal});
  doc.defaultView?.addEventListener("blur", cancel, {signal});
}

function restoreOpenedFootnoteFocus(runtime, referenceId, success) {
  const claim = runtime.openedFootnoteFocus;
  if (!claim || claim.identity !== referenceId) return;
  if (!success) { runtime.openedFootnoteFocus = null; return; }
  requestAnimationFrame(() => {
    if (runtime.openedFootnoteFocus !== claim) return;
    runtime.openedFootnoteFocus = null;
    if (runtime.docId !== claim.documentId || !runtime.root.isConnected || runtime.paper.contentEditable !== "true") return;
    const active = runtime.paper.getRootNode().activeElement || runtime.paper.ownerDocument.activeElement;
    if (active !== claim.marker && !footnoteFocusIsNeutral(runtime, active)) return;
    const marker = [...runtime.paper.querySelectorAll(inlineFootnote)]
      .find(item => item.dataset.writingFootnote === claim.identity);
    marker?.focus({preventScroll: true});
  });
}

function restorePastedFootnoteCaret(runtime, acknowledgement) {
  const claim = runtime.pastedFootnoteCaret;
  runtime.pastedFootnoteCaret = null;
  const {paper} = runtime;
  if (!claim || claim.documentId !== runtime.docId || !runtime.root.isConnected || paper.contentEditable !== "true") return;
  const active = paper.getRootNode().activeElement || paper.ownerDocument.activeElement;
  if (active !== paper && !footnoteFocusIsNeutral(runtime, active)) return;

  // WebKit can blur the draft while the paste is saved. Restore the prose
  // caret after the new marker is painted, without scrolling the editor.
  const identity = acknowledgement?.citation_reference_id;
  const marker = identity && [...paper.querySelectorAll(inlineFootnote)]
    .find(item => item.dataset.writingFootnote === identity);
  const range = marker ? footnoteBoundary(marker, true) : claim.range;
  if (!rangeInPaper(paper, range)) return;
  restoreSelection(runtime, range);
  runtime.range = range.cloneRange();
  rememberSelection(runtime);
  if (claim.spaces && marker) insertWritingBoundaryText(runtime, claim.spaces, range);
}

function openFootnote(runtime, referenceId) {
  const reference = runtime.references?.find(item => item.id === referenceId);
  if (reference?.target.kind === "manual") {
    focusManualFootnote(runtime, referenceId);
    return;
  }
  if (writingSharedDocument(runtime.docId)) {
    const link = safeHref(reference?.shared_library_url);
    if (link) window.open(link, "_blank", "noopener,noreferrer");
    else {
      runtime.activePane = "research";
      selectTab(runtime, "references");
      renderPanel(runtime);
    }
    return;
  }
  const marker = [...runtime.paper.querySelectorAll(inlineFootnote)]
    .find(item => item.dataset.writingFootnote === referenceId);
  const active = runtime.paper.getRootNode().activeElement || runtime.paper.ownerDocument.activeElement;
  runtime.openedFootnoteFocus = marker && active === marker
    ? {identity: referenceId, documentId: runtime.docId, marker} : null;
  send(runtime, "axiom-footnote", {reference_id: referenceId});
}

function footnoteIdentity(reference) {
  return reference.target.item_id || reference.item_id || reference.target.label;
}

function numberFootnote(marker, reference, index) {
  const number = String(index + 1);
  marker.dataset.footnoteNumber = number;
  if (marker.textContent !== number) marker.textContent = number;
  marker.setAttribute("aria-label", reference.target.kind === "manual" ? `Edit footnote ${number}` :
    `Open route for footnote ${number}: ${footnoteIdentity(reference)}`);
}

function footnoteMarker(reference, index) {
  const marker = element("sup", undefined, "footnote-marker");
  marker.dataset.writingFootnote = reference.id;
  marker.title = reference.target.kind === "manual" ? "⌘-click to edit note · Option-drag to move" :
    "⌘-click to open reference · Option-drag to move";
  marker.setAttribute("role", "link");
  numberFootnote(marker, reference, index);
  marker.tabIndex = 0;
  return marker;
}

function writingFootnoteParts(reference, previous, mode) {
  const target = reference.target;
  if (target.kind === "manual") return [];
  const passage = target.kind === "passage";
  const clipboardPassage = target.clipboard_passage;
  const quotedPassage = passage && clipboardPassage?.quoted === true;
  if (passage && !quotedPassage && clipboardPassage?.label) return [
    {text: clipboardPassage.label, identity: true},
    ...(clipboardPassage.excerpt ? [{text: ` — “${clipboardPassage.excerpt}”`}] : []),
  ];
  const referenceId = footnoteIdentity(reference);
  const identity = referenceId || (passage ? "Source passage" : "CARE axiom");
  const source = target.academic_citation;
  const excerpt = passage && !quotedPassage ? shortenWritingPassage(source?.excerpt || target.text, 300) : "";
  const detailed = passage ? excerpt : target.text;
  if (!quotedPassage && mode === "compact") return [{text: identity, identity: true}];
  if (!quotedPassage && mode === "detailed") return [
    {text: identity, identity: true},
    ...(detailed ? [{text: " — " + detailed}] : []),
  ];
  const includeText = mode === "citation_id_text";
  if (reference.shared_citation) return [{text: reference.shared_citation},
    ...(includeText && !quotedPassage && target.text ? [{text: " — " + target.text}] : [])];
  const suffix = [];
  if (referenceId && (quotedPassage || (!passage && source?.title && (mode === "citation_id" || includeText)))) {
    suffix.push({text: " "}, {text: `[${referenceId}]`, identity: true});
  }
  if (excerpt && (!source?.page || includeText)) suffix.push({text: ` “${excerpt}”`});
  if (!passage && includeText) {
    const axiomText = String(detailed || "").trim();
    if (axiomText) suffix.push({text: ` — ${axiomText}`});
  }
  const period = text => /[.!?]$/.test(text) ? text : text + ".";
  if (!source?.title) return [
    {text: period(passage ? source?.locator || (quotedPassage ? "CARE source passage" : `CARE source passage ${identity}`) :
      `CARE axiom${referenceId ? " " + referenceId : ""}`)},
    ...suffix,
  ];
  const prior = previous?.target.academic_citation;
  const priorClipboard = previous?.target.clipboard_passage;
  const priorScholarly = priorClipboard?.quoted === true || (!priorClipboard && mode !== "compact" && mode !== "detailed");
  if (priorScholarly && source.source_key && source.source_key === prior?.source_key &&
      source.title === prior.title && source.locator && prior.locator) {
    const samePlace = !passage && source.locator_key && source.locator_key === prior.locator_key &&
      source.locator === prior.locator;
    return [{text: samePlace ? "Ibid." : period("Ibid., " + source.locator)}, ...suffix];
  }
  const tail = (source.details || "") + (source.locator ? ", " + source.locator : "");
  return [
    {text: source.lead || ""},
    {text: source.title, italic: true},
    {text: tail ? period(tail) : /[.!?]$/.test(source.title) ? "" : "."},
    ...suffix,
  ];
}

function appendWritingFootnote(parent, parts) {
  for (const part of parts) {
    if (!part.text) continue;
    if (part.italic) parent.append(element("em", part.text));
    else if (part.identity) parent.append(element("span", part.text, "footnote-id"));
    else parent.append(document.createTextNode(part.text));
  }
}

const footnoteNoteSelector = "[data-footnote-note]";
const printedFootnoteSelector = "[data-open-printed-footnote]";
const footnoteNoteCaret = "\u200b";
const footnoteCaretMemory = new WeakMap();

function setFootnoteNoteEditable(field, editable) {
  field.setAttribute("contenteditable", editable ? "plaintext-only" : "false");
  if (editable && field.contentEditable !== "plaintext-only") field.contentEditable = "true";
}

function plainFootnoteNote(text) {
  return text.replaceAll(footnoteNoteCaret, "").replace(/\r\n?/g, "\n");
}

function readFootnoteNote(field) {
  const text = plainFootnoteNote(field.textContent);
  return text && field.childElementCount ? plainFootnoteNote(field.innerText) : text;
}

function footnoteNoteDOMText(text) {
  return !text || text.endsWith("\n") ? text + footnoteNoteCaret : text;
}

function writeFootnoteNote(field, text) {
  field.textContent = footnoteNoteDOMText(text);
  field.toggleAttribute("data-note-space", /^\S/.test(text));
  field.toggleAttribute("data-note-empty", !text);
}

function footnoteNoteText(runtime, reference) {
  return plainFootnoteNote(runtime.footnoteNotes?.get(reference.id) ?? reference.note ?? "");
}

function footnoteNoteSelection(field, range = writingSelectionRange(field)) {
  if (!range) return footnoteCaretMemory.get(field) || null;
  const offset = (node, at) => {
    const prefix = range.cloneRange();
    prefix.selectNodeContents(field);
    prefix.setEnd(node, at);
    return prefix.toString().replaceAll(footnoteNoteCaret, "").length;
  };
  const selection = selectionFor(field);
  const position = {
    start: offset(range.startContainer, range.startOffset),
    end: offset(range.endContainer, range.endOffset),
    backward: !range.collapsed && selection.anchorNode === range.endContainer &&
      selection.anchorOffset === range.endOffset,
  };
  footnoteCaretMemory.set(field, position);
  return position;
}

function restoreFootnoteNoteSelection(field, position = null) {
  if (field.getRootNode().activeElement !== field) field.focus({preventScroll: true});
  const length = readFootnoteNote(field).length;
  const startOffset = Math.min(position?.start ?? length, length);
  const endOffset = Math.min(position?.end ?? length, length);
  footnoteCaretMemory.set(field, {start: startOffset, end: endOffset, backward: Boolean(position?.backward)});
  // The trailing character gives an empty line a visual caret stop. The
  // insertion point still belongs before it, so Backspace reaches the newline.
  const at = offset => pointAtOffset(field, length ? offset : field.textContent.length);
  const start = at(startOffset);
  const end = at(endOffset);
  const selection = selectionFor(field);
  if (!start || !end || !selection) return;
  if (selection.setBaseAndExtent) {
    selection.setBaseAndExtent(...(position?.backward ? end : start), ...(position?.backward ? start : end));
    return;
  }
  const range = field.ownerDocument.createRange();
  range.setStart(...start);
  range.setEnd(...end);
  selection.removeAllRanges();
  selection.addRange(range);
}

function recordFootnoteNote(runtime, field) {
  runtime.footnoteInputEpoch = (runtime.footnoteInputEpoch || 0) + 1;
  const value = readFootnoteNote(field);
  const text = value.length > 10000 ? value.slice(0, 10000).replace(/[\ud800-\udbff]$/, "") : value;
  if (field.childElementCount || field.textContent !== footnoteNoteDOMText(text)) {
    const position = footnoteNoteSelection(field);
    writeFootnoteNote(field, text);
    restoreFootnoteNoteSelection(field, position);
  } else {
    field.toggleAttribute("data-note-space", /^\S/.test(text));
    field.toggleAttribute("data-note-empty", !text);
    footnoteNoteSelection(field);
  }
  runtime.footnoteNotes.set(field.dataset.footnoteNote, text);
  runtime.snapshot = null;
  const original = runtime.footnoteList.querySelector(
    `[data-footnote-note="${CSS.escape(field.dataset.footnoteNote)}"]`);
  if (original && original !== field) writeFootnoteNote(original, text);
  storeRecovery(runtime);
  scheduleSave(runtime);
  clearTimeout(runtime.footnoteLayoutTimer);
  runtime.footnoteLayoutTimer = setTimeout(() => refreshWritingA4(runtime), 180);
}

function replaceFootnoteNoteText(runtime, field, value, position = footnoteNoteSelection(field)) {
  const before = readFootnoteNote(field);
  const {start, end} = position || {start: before.length, end: before.length};
  const text = plainFootnoteNote(value);
  const caret = start + text.length;
  writeFootnoteNote(field, before.slice(0, start) + text + before.slice(end));
  restoreFootnoteNoteSelection(field, {start: caret, end: caret});
  recordFootnoteNote(runtime, field);
}

function editFootnoteNoteAtCaret(runtime, field, event) {
  if (event.defaultPrevented || event.cancelable === false || event.isComposing || runtime.composingFootnote ||
      event.metaKey || event.ctrlKey || event.altKey || !field.isContentEditable) return false;
  const type = event.inputType;
  const lineBreak = event.key === "Enter" || type === "insertParagraph" || type === "insertLineBreak";
  const backwards = event.key === "Backspace" || type === "deleteContentBackward";
  const forwards = event.key === "Delete" || type === "deleteContentForward";
  if (!lineBreak && (!(backwards || forwards) || event.shiftKey)) return false;
  const range = writingSelectionRange(field);
  const text = readFootnoteNote(field);
  let {start, end} = footnoteNoteSelection(field, range) || {start: text.length, end: text.length};
  if (lineBreak) {
    event.preventDefault();
    replaceFootnoteNoteText(runtime, field, "\n", {start, end});
    return true;
  }
  if (start === end) {
    const index = backwards ? start - 1 : end;
    if (index >= 0 && index < text.length) {
      if (range && text[index] !== "\n") return false;
      const characters = backwards ? text.slice(0, start) : text.slice(end);
      const adjacent = typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(characters)
          .containing(backwards ? characters.length - 1 : 0)?.segment
        : Array.from(characters).at(backwards ? -1 : 0);
      if (backwards) start -= adjacent?.length || 0;
      else end += adjacent?.length || 0;
    }
  } else if (range && !text.slice(start, end).includes("\n")) return false;
  event.preventDefault();
  if (start !== end) replaceFootnoteNoteText(runtime, field, "", {start, end});
  return true;
}

function footnoteNoteKeyFallback(runtime, field, event) {
  if (event.defaultPrevented || event.isComposing || runtime.composingFootnote || event.metaKey || event.ctrlKey ||
      [...event.key].length !== 1 || !field.isContentEditable) return;
  const position = footnoteNoteSelection(field);
  const epoch = runtime.footnoteInputEpoch;
  setTimeout(() => {
    // A visible WebKit caret in a shadow root does not always accept native
    // typing. Use the remembered offsets only if the browser did not edit it.
    if (!event.defaultPrevented && !runtime.composingFootnote && epoch === runtime.footnoteInputEpoch &&
        field.isConnected && field.isContentEditable && field.getRootNode().activeElement === field) {
      replaceFootnoteNoteText(runtime, field, event.key, position);
    }
  }, 0);
}

function installFootnoteNotes(runtime) {
  const {root, controller: {signal}} = runtime;
  const fieldFor = event => event.target.closest(footnoteNoteSelector);
  root.addEventListener("click", event => {
    const row = event.target.closest("li[data-footnote-id]");
    if (event.detail !== 1 || event.target !== row) return;
    const selection = selectionFor(row);
    if (selection?.isCollapsed === false && row.contains(selection.anchorNode)) return;
    const field = row.querySelector(footnoteNoteSelector);
    if (!field?.isContentEditable) return;
    const tail = readFootnoteNote(field) || field.dataset.manualFootnote !== undefined ? field : row.querySelector(printedFootnoteSelector);
    const rect = [...tail.getClientRects()].at(-1);
    if (!rect || event.clientY < rect.top - 2 || event.clientY > rect.bottom + 2) return;
    const rtl = row.ownerDocument.defaultView.getComputedStyle(row).direction === "rtl";
    if (rtl ? event.clientX <= rect.left : event.clientX >= rect.right) restoreFootnoteNoteSelection(field);
  }, {signal});
  root.addEventListener("input", event => {
    const field = fieldFor(event);
    if (field && !event.isComposing && !runtime.composingFootnote) recordFootnoteNote(runtime, field);
  }, {signal});
  root.addEventListener("keydown", event => {
    const field = fieldFor(event);
    if (field) footnoteNoteKeyFallback(runtime, field, event);
  }, {signal});
  root.addEventListener("beforeinput", event => {
    const field = fieldFor(event);
    if (!field || event.isComposing || runtime.composingFootnote) return;
    if (editFootnoteNoteAtCaret(runtime, field, event)) return;
    if (event.inputType?.startsWith("format")) event.preventDefault();
    else if (event.inputType === "insertText" && event.cancelable && event.data && !writingSelectionRange(field)) {
      event.preventDefault();
      replaceFootnoteNoteText(runtime, field, event.data);
    }
  }, {signal});
  root.addEventListener("paste", event => {
    const field = fieldFor(event);
    if (!field) return;
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain");
    if (text) replaceFootnoteNoteText(runtime, field, text);
  }, {signal});
  root.addEventListener("drop", event => {
    if (fieldFor(event)) event.preventDefault();
  }, {signal});
  root.addEventListener("compositionstart", event => {
    const field = fieldFor(event);
    if (!field) return;
    runtime.composingFootnote = true;
    runtime.footnoteComposition = {field, text: readFootnoteNote(field), position: footnoteNoteSelection(field)};
    clearTimeout(runtime.saveTimer);
    runtime.saveTimer = 0;
  }, {signal});
  root.addEventListener("compositionend", event => {
    const field = fieldFor(event);
    if (!field) return;
    runtime.composingFootnote = false;
    const composition = runtime.footnoteComposition;
    runtime.footnoteComposition = null;
    if (event.data && composition?.field === field && composition.text === readFootnoteNote(field)) {
      replaceFootnoteNoteText(runtime, field, event.data, composition.position);
    } else recordFootnoteNote(runtime, field);
  }, {signal});
  root.addEventListener("focusin", event => {
    const field = fieldFor(event);
    if (field && !readFootnoteNote(field) && !writingSelectionRange(field)) restoreFootnoteNoteSelection(field);
  }, {signal});
  root.addEventListener("focusout", event => {
    if (!fieldFor(event) || runtime.replacingFootnoteFields) return;
    runtime.composingFootnote = false;
    runtime.footnoteComposition = null;
    scheduleSave(runtime, 0);
  }, {signal});
  signal.addEventListener("abort", () => clearTimeout(runtime.footnoteLayoutTimer), {once: true});
}

function reconcileFootnoteNotes(runtime, savedReferences) {
  if (!runtime.footnoteNotes?.size) return;
  const references = new Map(savedReferences.map(reference => [reference.id, reference]));
  const base = {...runtime.base.footnote_notes};
  for (const [identity, text] of runtime.footnoteNotes) {
    const reference = references.get(identity);
    if (!reference || (reference.note || "") === text) {
      runtime.footnoteNotes.delete(identity);
      delete base[identity];
      runtime.snapshot = null;
    }
  }
  runtime.base = {...runtime.base, footnote_notes: base};
}

function installFootnoteMode(runtime) {
  const control = runtime.footnoteModeButton;
  if (!control || !runtime.footnotes) return;
  const preferenceKey = "care-writing-footnote-style";
  const available = new Set(Array.from(control.options, option => option.value));
  let mode = "citation";
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (available.has(saved)) mode = saved;
  } catch {
    // The scholarly default remains available when preferences are blocked.
  }
  runtime.footnotes.dataset.mode = control.value = mode;
  control.addEventListener("change", () => {
    const selected = available.has(control.value) ? control.value : "citation";
    runtime.footnotes.dataset.mode = selected;
    try {
      localStorage.setItem(preferenceKey, selected);
    } catch {
      // Apply the preference to the current editor even without storage.
    }
    paintFootnotes(runtime);
    refreshWritingA4(runtime);
  }, {signal: runtime.controller.signal});
}

function footnoteBoundary(marker, after = false) {
  const range = marker.ownerDocument.createRange();
  if (after) range.setStartAfter(marker);
  else range.setStartBefore(marker);
  range.collapse(true);
  return range;
}

function writingWholeFootnotes(range) {
  const {startContainer, startOffset, endContainer, endOffset} = range;
  const markerAt = node => (node.parentElement?.closest(inlineFootnote) || node.closest?.(inlineFootnote));
  const start = markerAt(startContainer);
  const end = markerAt(endContainer);
  if (!start && !end) return range;
  if (range.collapsed) {
    return footnoteBoundary(start, startOffset > 0);
  }
  const whole = range.cloneRange();
  // A partially selected number still carries the complete citation. An
  // endpoint touching the number's outside edge leaves the citation alone.
  if (start) whole.setStartBefore(start);
  if (end) whole.setEndAfter(end);
  if (start && startOffset === (startContainer.nodeType === Node.TEXT_NODE ? startContainer.length : startContainer.childNodes.length)) {
    whole.setStartAfter(start);
  }
  if (end && endOffset === 0) whole.setEndBefore(end);
  return whole;
}

function writingBoundaryCaret(paper, caret, includePageGaps = false) {
  if (!caret?.collapsed || paper.contentEditable !== "true") return null;
  const {startContainer: node, startOffset: offset} = caret;
  const marker = writingElement(node)?.closest(inlineFootnote);
  if (marker) return footnoteBoundary(marker, offset > 0);
  const atText = node.nodeType === Node.TEXT_NODE;
  let before = atText ? offset === 0 && node.previousSibling : node.childNodes[offset - 1];
  let after = atText ? offset === node.length && node.nextSibling : node.childNodes[offset];
  while (before?.nodeType === Node.TEXT_NODE && !before.length) before = before.previousSibling;
  while (after?.nodeType === Node.TEXT_NODE && !after.length) after = after.nextSibling;
  const boundary = includePageGaps ? inlineFootnote + "," + a4Break : inlineFootnote;
  if (before?.matches?.(boundary) || after?.matches?.(boundary) ||
      (!includePageGaps && (adjacentFootnote(paper, caret, true) || adjacentFootnote(paper, caret, false)))) {
    return caret.cloneRange();
  }
  return null;
}

function insertWritingBoundaryText(runtime, text, caret = writingSelectionRange(runtime.paper)) {
  const position = writingBoundaryCaret(runtime.paper, caret, true);
  if (!position) return false;

  // Native insertion next to an inline citation or page spacer can swallow
  // a space or put it inside the decoration. Insert at the prose boundary.
  beginWritingEdit(runtime, "insertText", caret);
  writeTextAtCaret(position, text);
  finishWritingBoundaryEdit(runtime, position);
  return true;
}

function writeTextAtCaret(position, text) {
  const container = position.startContainer;
  if (container.nodeType === Node.TEXT_NODE) {
    const index = position.startOffset;
    container.insertData(index, text);
    position.setStart(container, index + text.length);
  } else {
    const inserted = container.ownerDocument.createTextNode(text);
    position.insertNode(inserted);
    position.setStart(inserted, text.length);
  }
  position.collapse(true);
}

function finishWritingBoundaryEdit(runtime, position, identities = []) {
  const removed = identities.length && omitFootnotes(runtime, identities);
  restoreSelection(runtime, position);
  markEdited(runtime, true, removed || [], null, "insert");
  if (removed) {
    paintReferences(runtime);
    send(runtime, "delete-footnotes", {removed_footnotes: removed});
  }
  noteTyping(runtime);
}

function writingBreakUnit(paper, node) {
  const unit = writingElement(node)?.closest(`${writingParagraphSelector}, li, td, th`);
  return unit !== paper && paper.contains(unit) ? unit : null;
}

function writeBreakAtCaret(position, unit, soft) {
  const tail = position.cloneRange();
  tail.setEnd(unit, unit.childNodes.length);
  if (soft || unit.matches("pre, td, th")) {
    const remainder = tail.cloneContents();
    const terminal = !writingHistoryLength(remainder) && !remainder.querySelector(`${inlineFootnote}, hr, table, ul, ol`);
    const line = element("br");
    position.insertNode(line);
    // At the end of an editable block, the browser needs a trailing break
    // to display the caret on the line created by the authored break.
    if (terminal) line.after(element("br"));
    position.setStartAfter(line);
  } else {
    const remainder = tail.extractContents();
    const tag = unit.matches(writingHeadingSelector) && !writingHistoryLength(remainder) &&
      !remainder.querySelector(inlineFootnote) ? "p" : unit.localName;
    const next = element(tag);
    next.style.cssText = unit.style.cssText;
    next.style.removeProperty("--writing-a4-gap");
    // If a split moves the entire original paragraph, block normalization
    // can keep its original identity with the prose and its citation.
    if (unit.dataset.blockId) next.dataset.blockId = unit.dataset.blockId;
    next.append(remainder);
    for (const part of [unit, next]) {
      if (!writingHistoryLength(part) && !part.querySelector(`${inlineFootnote}, hr, table, ul, ol`)) {
        part.append(element("br"));
      }
    }
    unit.after(next);
    position.setStart(next, 0);
  }
  position.collapse(true);
}

function insertWritingFootnoteBreak(runtime, inputType, caret = writingSelectionRange(runtime.paper)) {
  const position = writingBoundaryCaret(runtime.paper, caret);
  const unit = position && writingBreakUnit(runtime.paper, position.startContainer);
  if (!unit) return false;
  beginWritingEdit(runtime, inputType, caret);
  writeBreakAtCaret(position, unit, inputType === "insertLineBreak");
  finishWritingBoundaryEdit(runtime, position);
  return true;
}

function replaceWritingFootnoteSelection(runtime, inputType, text, original, range) {
  const {paper} = runtime;
  const start = writingBreakUnit(paper, range.startContainer);
  const end = writingBreakUnit(paper, range.endContainer);
  if (!start || !end || (start !== end &&
      (start.parentNode !== end.parentNode || !start.matches(writingParagraphSelector) || !end.matches(writingParagraphSelector)))) return false;
  const identities = selectedFootnotes(paper, range).map(marker => marker.dataset.writingFootnote);
  if (identities.length && !canChangeFootnotes(runtime)) return true;
  beginWritingEdit(runtime, inputType, original);
  const position = range.cloneRange();
  if (start !== end) {
    // Join the surviving paragraph fragments as a normal text replacement
    // would, keeping the cursor at the join and the later formatting intact.
    const tail = position.cloneRange();
    tail.collapse(false);
    tail.setEnd(end, end.childNodes.length);
    const remainder = tail.extractContents();
    position.deleteContents();
    end.remove();
    position.setStart(start, start.childNodes.length);
    start.append(remainder);
  } else position.deleteContents();
  position.collapse(true);
  if (inputType === "insertText") {
    if (text) writeTextAtCaret(position, text);
  } else writeBreakAtCaret(position, start, inputType === "insertLineBreak");
  finishWritingBoundaryEdit(runtime, position, identities);
  return true;
}

function keepFootnoteOnTerminalLine(anchor) {
  const {startContainer, startOffset} = anchor;
  const inText = startContainer.nodeType === Node.TEXT_NODE;
  if (inText && startContainer.data.slice(0, startOffset).trim()) return anchor;
  let previous = inText ? startContainer.previousSibling : startContainer.childNodes[startOffset - 1];
  while (previous?.matches?.(inlineFootnote)) previous = previous.previousSibling;
  if (previous?.localName !== "br") return anchor;
  let prose = previous.previousSibling;
  while (prose?.matches?.(inlineFootnote)) prose = prose.previousSibling;
  if (!prose?.textContent.trim()) return anchor;
  const line = previous.closest("p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th");
  if (!line) return anchor;
  const remainder = anchor.cloneRange();
  remainder.setEnd(line, line.childNodes.length);
  if (writingProseRange(remainder).trim()) return anchor;

  // A trailing line break still belongs to the draft. A citation placed at
  // its empty end belongs with the prose on the preceding line.
  const before = anchor.cloneRange();
  before.setStartBefore(previous);
  before.collapse(true);
  return before;
}

function normalizedFootnoteAnchor(runtime, position) {
  let anchor = keepFootnoteOnTerminalLine(position);
  const block = topBlock(runtime.paper, anchor.startContainer);
  if (!block) return anchor;
  const prefix = anchor.cloneRange();
  prefix.selectNodeContents(runtime.paper);
  prefix.setEnd(anchor.startContainer, anchor.startOffset);
  const remainder = anchor.cloneRange();
  remainder.setEnd(runtime.paper, runtime.paper.childNodes.length);
  const before = writingProseRange(prefix);
  const visible = before.trimEnd();
  if (visible && !writingProseRange(remainder).trim()) {
    const point = pointAtOffset(runtime.paper, visible.length);
    if (point) {
      const between = anchor.cloneRange();
      between.setStart(...point);
      between.setEnd(anchor.startContainer, anchor.startOffset);
      const blankLines = between.cloneContents().querySelector("br, p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre");
      if (writingProseRange(between) || blankLines) {
        anchor = anchor.cloneRange();
        anchor.setStart(...point);
        anchor.collapse(true);
      }
    }
  }
  const paragraph = writingLogicalParagraph(runtime.paper, anchor.startContainer);
  if (!paragraph) return anchor;
  const left = anchor.cloneRange();
  left.selectNodeContents(paragraph);
  left.setEnd(anchor.startContainer, anchor.startOffset);
  const right = anchor.cloneRange();
  right.setEnd(paragraph, paragraph.childNodes.length);
  for (const br of paragraph.querySelectorAll("br")) {
    if (footnoteBoundary(br).compareBoundaryPoints(Range.START_TO_START, anchor) >= 0) {
      right.setEndBefore(br);
      break;
    }
  }
  const leftText = writingProseRange(left);
  const word = /^[\p{L}\p{N}\p{M}_'’‐‑–-]+[.,!?;:…»”’")\]}]*/u.exec(writingProseRange(right));
  if (!/[\p{L}\p{N}\p{M}_]$/u.test(leftText) || !word ||
      !/^[\p{L}\p{N}\p{M}_]/u.test(word[0])) return anchor;
  const end = pointAtOffset(paragraph, leftText.length + word[0].length);
  if (!end) return anchor;
  const afterWord = anchor.cloneRange();
  afterWord.setStart(...end);
  afterWord.collapse(true);
  return afterWord;
}

function footnoteLocation(paper, range) {
  const point = writingHistoryPoint(paper, range.startContainer, range.startOffset);
  return point?.blockId ? [point.blockId, point.position] : null;
}

function savedFootnoteAnchor(runtime, reference) {
  if (reference.marker_offset != null) {
    const point = writingHistoryBoundary(runtime, {
      blockId: reference.block_id, position: reference.marker_offset, forward: false,
    });
    if (point) {
      const anchor = document.createRange();
      anchor.setStart(...point);
      anchor.collapse(true);
      return anchor;
    }
  }
  let anchor = referenceRange(runtime, reference);
  const block = !anchor && !reference.selection && findBlock(runtime, reference.block_id);
  if (block && block.localName !== "hr") {
    const container = ["ul", "ol"].includes(block.localName) ? block.lastElementChild || block : block;
    anchor = document.createRange();
    anchor.selectNodeContents(container);
  }
  anchor?.collapse(false);
  return anchor;
}

function footnotePositions(runtime, movedId, allPositions = null, {compareSaved = true} = {}) {
  const {paper} = runtime;
  const references = new Map(runtime.references.map(reference => [reference.id, reference]));
  const markers = [...paper.querySelectorAll(inlineFootnote)].map((marker, order) => ({
    identity: marker.dataset.writingFootnote, location: footnoteLocation(paper, footnoteBoundary(marker)), order,
  }));
  const moved = movedId && markers.find(marker => marker.identity === movedId)?.location;
  const positions = {};
  for (const {identity, location, order} of markers) {
    const reference = references.get(identity);
    if (!reference || !location) continue;
    if (allPositions) allPositions[identity] = [...location, order];
    if (!compareSaved) continue;
    const saved = savedFootnoteAnchor(runtime, reference);
    const [blockId, offset] = location;
    const [savedBlock, savedOffset] = saved && footnoteLocation(paper, saved) || [];
    const sharesDropPoint = moved?.[0] === blockId && moved[1] === offset;
    if (sharesDropPoint || blockId !== savedBlock || offset !== savedOffset ||
        (reference.marker_order != null && reference.marker_order !== order)) {
      positions[identity] = [blockId, offset, order];
    }
  }
  return positions;
}

function adjacentFootnote(paper, caret, backwards) {
  const block = topBlock(paper, caret.startContainer);
  if (!block) return null;
  const paragraph = writingLogicalParagraph(paper, caret.startContainer);
  const offset = writingHistoryPoint(paper, caret.startContainer, caret.startOffset)?.position;
  const markers = [...block.querySelectorAll(inlineFootnote)]
    .filter(marker => writingLogicalParagraph(paper, marker) === paragraph);
  if (backwards) markers.reverse();
  return markers.find(marker => {
    const edge = footnoteBoundary(marker, backwards);
    const order = caret.compareBoundaryPoints(Range.START_TO_START, edge);
    return (backwards ? order >= 0 : order <= 0)
      && writingHistoryPoint(paper, edge.startContainer, edge.startOffset)?.position === offset;
  }) || null;
}

function selectedFootnotes(paper, range) {
  if (!range || range.collapsed) return [];
  const first = range.cloneRange();
  const last = range.cloneRange();
  first.collapse(true);
  last.collapse(false);
  return [...paper.querySelectorAll(inlineFootnote)].filter(marker =>
    first.compareBoundaryPoints(Range.START_TO_START, footnoteBoundary(marker)) <= 0
    && last.compareBoundaryPoints(Range.START_TO_START, footnoteBoundary(marker, true)) >= 0);
}

function writingA4GapInRange(paper, range) {
  const block = topBlock(paper, range.startContainer);
  if (!block || topBlock(paper, range.endContainer) !== block) return null;
  return [...block.querySelectorAll(a4Break)].find(gap => range.intersectsNode(gap)) || null;
}

function writingA4GapForDeletion(paper, range, marker, backwards) {
  if (!range) return null;
  if (!range.collapsed) {
    const start = writingHistoryPoint(paper, range.startContainer, range.startOffset);
    const end = writingHistoryPoint(paper, range.endContainer, range.endOffset);
    if (start?.position == null || start.blockId !== end?.blockId || start.position !== end.position) return null;
    return writingA4GapInRange(paper, range);
  }
  if (!marker) return null;
  const edge = footnoteBoundary(marker, backwards);
  const between = range.cloneRange();
  if (backwards) between.setStart(edge.startContainer, edge.startOffset);
  else between.setEnd(edge.startContainer, edge.startOffset);
  return writingA4GapInRange(paper, between);
}

function clickedWritingA4Gap(runtime, event) {
  if (!runtime.a4?.active || event.detail !== 1 || event.target.closest(inlineFootnote)) return false;
  const selection = writingSelectionRange(runtime.paper);
  if (selection && !selection.collapsed) return false;
  const {clientX: x, clientY: y} = event;
  return runtime.a4.layoutNodes?.some(node => {
    if (!node.matches(a4Break)) return false;
    const {top, right, bottom, left} = node.getBoundingClientRect();
    return x >= left && x < right && y >= top && y < bottom;
  }) || false;
}

function removedByNativeFootnoteEdit(runtime, inputType, selection) {
  const removed = new Set(selection?.identities);
  const preserved = new Set(selection?.preserved);
  // In A4 mode WebKit can remove a widget while editing a synthetic gap.
  // Only a deliberate caret action or selected citation can remove its link.
  if (!runtime.a4?.active && (selection || inputType?.startsWith("delete"))) {
    const remaining = new Set([...runtime.paper.querySelectorAll(inlineFootnote)].map(marker => marker.dataset.writingFootnote));
    for (const identity of runtime.paintedFootnotes || []) {
      if (!remaining.has(identity) && !preserved.has(identity)) removed.add(identity);
    }
  }
  return [...removed];
}

function canChangeFootnotes(runtime) {
  if (writingSharedDocument(runtime.docId)) {
    const state = runtime.collaboration;
    if (!state || state.conflict || state.operation || state.outgoing || !writingCollaborationEditable(runtime)) {
      writingSharedNotice(runtime, state?.conflict ? "Resolve the shared draft conflict before editing its footnotes."
        : "Wait for shared edits to sync before changing a footnote.");
      return false;
    }
  }
  if (!runtime.navigationLocked &&
      (!runtime.pending || !runtime.queued || ["scan", "scan-deeper"].includes(runtime.queued.type))) return true;
  status(runtime, "Wait for the current draft action, then edit the footnote.");
  return false;
}

function omitFootnotes(runtime, identities) {
  runtime.removingFootnotes = new Set(identities);
  for (const marker of runtime.paper.querySelectorAll(inlineFootnote)) {
    if (runtime.removingFootnotes.has(marker.dataset.writingFootnote)) marker.remove();
  }
  runtime.references = runtime.references.filter(reference => !runtime.removingFootnotes.has(reference.id));
  return [...runtime.removingFootnotes];
}

function deleteFootnotes(runtime, identities, caret, keepPrintedFocus = false) {
  if (runtime.editHistory) beginWritingEdit(runtime, "deleteFootnote", caret || writingSelectionRange(runtime.paper) || runtime.range);
  const removed_footnotes = omitFootnotes(runtime, identities);
  if (caret) restoreSelection(runtime, caret);
  rememberSelection(runtime);
  runtime.snapshot = null;
  paintReferences(runtime);
  updatePaper(runtime);
  if (runtime.editHistory) rememberWritingEdit(runtime, removed_footnotes);
  send(runtime, "delete-footnotes", keepPrintedFocus ? {removed_footnotes, keep_printed_focus: true} : {removed_footnotes});
}

function printedFootnotesSurface(runtime) {
  return runtime.a4?.active ? runtime.a4.pages : runtime.footnoteList;
}

function selectedPrintedFootnotes(runtime) {
  const printed = printedFootnotesSurface(runtime);
  const selection = writingSelectionRange(printed);
  if (!selection || selection.collapsed) return [];
  const start = selection.cloneRange();
  const end = selection.cloneRange();
  start.collapse(true);
  end.collapse(false);
  return [...printed.querySelectorAll(printedFootnoteSelector)].filter(link => {
    const linkStart = link.ownerDocument.createRange();
    linkStart.selectNodeContents(link);
    const linkEnd = linkStart.cloneRange();
    linkStart.collapse(true);
    linkEnd.collapse(false);
    return start.compareBoundaryPoints(Range.START_TO_START, linkEnd) < 0 &&
      end.compareBoundaryPoints(Range.START_TO_START, linkStart) > 0;
  }).map(link => link.dataset.openPrintedFootnote);
}

function removePrintedFootnotes(runtime, identities) {
  if (runtime.navigationLocked || !canChangeFootnotes(runtime)) return;
  const removed = new Set(identities.filter(identity => runtime.references.some(reference => reference.id === identity)));
  if (!removed.size) return;
  const printed = printedFootnotesSurface(runtime);
  const links = [...printed.querySelectorAll(printedFootnoteSelector)];
  const index = links.findIndex(link => removed.has(link.dataset.openPrintedFootnote));
  const survives = link => !removed.has(link.dataset.openPrintedFootnote);
  const neighbor = (links.slice(index + 1).find(survives) ||
    links.slice(0, Math.max(0, index)).reverse().find(survives))?.dataset.openPrintedFootnote;
  const marker = !neighbor && [...runtime.paper.querySelectorAll(inlineFootnote)]
    .find(item => removed.has(item.dataset.writingFootnote));
  const documentId = runtime.docId;
  deleteFootnotes(runtime, [...removed], marker ? footnoteBoundary(marker) : null, Boolean(neighbor));
  if (neighbor) requestAnimationFrame(() => {
    if (!runtime.root.isConnected || runtime.docId !== documentId) return;
    printed.querySelector(`[data-open-printed-footnote="${CSS.escape(neighbor)}"]`)?.focus({preventScroll: true});
  });
}

function deletePrintedFootnoteSelection(runtime, event, focused = null) {
  if (event.defaultPrevented || !["Backspace", "Delete"].includes(event.key) || event.isComposing ||
      event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
  const target = event.composedPath?.()[0] || event.target;
  if (runtime.paper.contains(target) || target?.closest?.("input, textarea, select") ||
      (target?.isContentEditable && !target.closest(footnoteNoteSelector))) return false;
  const identities = selectedPrintedFootnotes(runtime);
  if (!identities.length && focused) identities.push(focused.dataset.openPrintedFootnote);
  if (!identities.length && (!target?.closest?.("li[data-footnote-id]") || target.isContentEditable ||
      !printedFootnotesSurface(runtime).contains(target))) return false;
  event.preventDefault();
  if (identities.length) removePrintedFootnotes(runtime, identities);
  return true;
}

function footnoteNativeEditRange(paper, event) {
  const target = event.getTargetRanges?.().find(range => rangeInPaper(paper, range));
  if (!target) return null;
  const range = paper.ownerDocument.createRange();
  range.setStart(target.startContainer, target.startOffset);
  range.setEnd(target.endContainer, target.endOffset);
  return range;
}

function footnoteParagraphJoin(paper, range, authoredSelection) {
  if (!range || range.collapsed || (authoredSelection && !authoredSelection.collapsed) ||
      writingLogicalParagraph(paper, range.startContainer) ===
      writingLogicalParagraph(paper, range.endContainer)) return false;
  const start = writingHistoryPoint(paper, range.startContainer, range.startOffset);
  const end = writingHistoryPoint(paper, range.endContainer, range.endOffset);
  if (!start?.blockId || !end?.blockId) return false;
  if (start.blockId === end.blockId) return start.position === end.position;
  return !writingProseRange(range) && !range.cloneContents().querySelector("br, hr, table");
}

function writingBackspaceCaret(runtime, event, authoredSelection, native) {
  if (event.inputType !== "deleteContentBackward" || event.isComposing || runtime.composing ||
      (authoredSelection && !authoredSelection.collapsed)) return null;
  const {paper} = runtime;
  const caret = authoredSelection || native;
  if (!rangeInPaper(paper, caret)) return null;
  const at = authoredSelection?.startContainer || native?.endContainer;
  const paragraph = writingLogicalParagraph(paper, at);
  let anchor;
  let preserved = [];
  if (paragraph && ["p", "div"].includes(paragraph.localName) && !writingProseText(paragraph) &&
      !paragraph.closest("li, td, th") && !paragraph.querySelector("hr, table, ul, ol")) {
    let previous = paragraph.previousSibling;
    while (previous && (previous.matches?.(a4Break) || previous.nodeType === Node.TEXT_NODE && !previous.data)) {
      previous = previous.previousSibling;
    }
    if (previous?.matches?.("p, div, h1, h2, h3, h4, h5, h6, blockquote, pre")) {
      anchor = paper.ownerDocument.createRange();
      anchor.selectNodeContents(previous);
      anchor.collapse(false);
      preserved = [...previous.querySelectorAll(inlineFootnote), ...paragraph.querySelectorAll(inlineFootnote)]
        .map(marker => marker.dataset.writingFootnote);
    }
  }
  if (!anchor && native && !native.collapsed && !writingProseRange(native) &&
      writingLogicalParagraph(paper, native.startContainer) === writingLogicalParagraph(paper, native.endContainer) &&
      native.cloneContents().querySelectorAll("br").length === 1) {
    // Deleting an empty hard line can have the same WebKit caret-affinity
    // problem as joining an empty paragraph. The authored break remains a
    // normal native deletion; only its resulting insertion point is repaired.
    anchor = native.cloneRange();
    anchor.collapse(true);
    preserved = selectedFootnotes(paper, native).map(marker => marker.dataset.writingFootnote);
  }
  if (!anchor) return null;
  const point = writingHistoryPoint(paper, anchor.startContainer, anchor.startOffset);
  return point?.blockId ? {documentId: runtime.docId, point, range: anchor, preserved} : null;
}

function restoreWritingBackspaceCaret(runtime, saved) {
  if (runtime.docId !== saved.documentId || runtime.paper.contentEditable !== "true") return;
  const point = writingHistoryBoundary(runtime, {...saved.point, forward: false});
  let caret = saved.range;
  if (point) {
    caret = runtime.paper.ownerDocument.createRange();
    caret.setStart(...point);
    caret.collapse(true);
  }
  if (!rangeInPaper(runtime.paper, caret)) return;
  // Repainting may have replaced a noneditable number removed during the
  // native join. Stay after that surviving number, ready for a deliberate
  // following Backspace, rather than restoring a stale before-widget edge.
  const preserved = new Set(saved.preserved);
  for (const marker of runtime.paper.querySelectorAll(inlineFootnote)) {
    if (!preserved.has(marker.dataset.writingFootnote)) continue;
    const location = footnoteLocation(runtime.paper, footnoteBoundary(marker));
    if (location?.[0] === saved.point.blockId && location[1] === saved.point.position) {
      caret = footnoteBoundary(marker, true);
    }
  }
  restoreSelection(runtime, caret);
  rememberSelection(runtime);
}

function editFootnoteAtCaret(runtime, event) {
  if (event.defaultPrevented || !event.cancelable || runtime.paper.contentEditable !== "true" ||
      runtime.composing || event.isComposing) return false;
  const backwards = event.key === "Backspace" || event.inputType === "deleteContentBackward";
  const deletion = backwards || event.key === "Delete" || event.inputType === "deleteContentForward";
  const arrow = event.key === "ArrowLeft" || event.key === "ArrowRight";
  if (!deletion) runtime.clickedA4Gap = false;
  if ((!deletion && !arrow) || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
  const focused = event.target.closest?.(inlineFootnote);
  const native = footnoteNativeEditRange(runtime.paper, event);
  const authoredSelection = writingSelectionRange(runtime.paper);
  const selection = authoredSelection && !authoredSelection.collapsed ? authoredSelection : native || authoredSelection;
  const range = selection && writingWholeFootnotes(selection);
  const joining = native && footnoteParagraphJoin(runtime.paper, native, authoredSelection);
  const selected = deletion && !range?.collapsed && selectedFootnotes(runtime.paper, range);
  if (!focused && selected?.length && !joining) {
    const first = writingHistoryPoint(runtime.paper, range.startContainer, range.startOffset);
    const last = writingHistoryPoint(runtime.paper, range.endContainer, range.endOffset);
    if (first?.blockId && first.blockId === last?.blockId && first.position === last.position) {
      event.preventDefault();
      if (canChangeFootnotes(runtime)) {
        const caret = range.cloneRange();
        caret.collapse(true);
        deleteFootnotes(runtime, selected.map(marker => marker.dataset.writingFootnote), caret);
      }
      return true;
    }
  }
  const inline = authoredSelection?.collapsed &&
    (authoredSelection.startContainer.parentElement?.closest(inlineFootnote) ||
      authoredSelection.startContainer.closest?.(inlineFootnote));
  const marker = focused || inline || (range?.collapsed &&
    adjacentFootnote(runtime.paper, range, arrow ? event.key === "ArrowLeft" : backwards));
  if (joining) return false;
  if (deletion && runtime.a4?.active) {
    // The pointer can resolve to the nearest inline marker when the user
    // clicks the blank area. Wait for an explicit caret placement or edit.
    if (runtime.clickedA4Gap && !focused && !native) {
      event.preventDefault();
      return true;
    }
    const gap = !focused && writingA4GapForDeletion(runtime.paper, range, marker, backwards);
    if (gap) {
      event.preventDefault();
      restoreSelection(runtime, footnoteBoundary(gap, !backwards));
      return true;
    }
  }
  if (!marker) return false;
  event.preventDefault();
  if (deletion) {
    if (canChangeFootnotes(runtime)) deleteFootnotes(runtime, [marker.dataset.writingFootnote], footnoteBoundary(marker));
  }
  else restoreSelection(runtime, footnoteBoundary(marker, event.key === "ArrowRight"));
  return true;
}

function writingTextRangeAtPoint(paper, event, scale = 1) {
  const doc = paper.ownerDocument;
  const root = paper.getRootNode();
  const {clientX: x, clientY: y} = event;
  let hit = event.composedPath?.().find(node => node.nodeType === Node.ELEMENT_NODE && paper.contains(node)) || event.target;
  let paragraph = hit && writingLogicalParagraph(paper, hit);
  if (!paragraph) {
    hit = root.elementFromPoint?.(x, y);
    paragraph = hit && paper.contains(hit) && writingLogicalParagraph(paper, hit);
  }
  if (!paragraph || !paper.contains(paragraph) || typeof Intl.Segmenter !== "function") return null;
  const excluded = `${inlineFootnote},${a4Break},[contenteditable=false]`;
  const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      return node.matches(excluded) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
    },
  });
  const probe = doc.createRange();
  let nearest = null;
  // Stay within the paragraph under the pointer, even for a large imported draft.
  for (let node = walker.nextNode(), visited = 0; node && visited < 256; node = walker.nextNode(), visited++) {
    if (!node.length) continue;
    probe.selectNodeContents(node);
    const rects = probe.getClientRects();
    let from = 0;
    let to = rects.length;
    while (from < to) {
      const middle = (from + to) >>> 1;
      if (rects[middle].bottom < y) from = middle + 1;
      else to = middle;
    }
    const style = doc.defaultView.getComputedStyle(node.parentElement);
    const lineHeight = (parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 || 0) * scale;
    for (const line of [rects[from], rects[from - 1]]) {
      if (!line?.height) continue;
      const tolerance = Math.max(2 * scale, (lineHeight - line.height) / 2);
      if (y < line.top - tolerance || y > line.bottom + tolerance) continue;
      const distance = Math.max(line.left - x, 0, x - line.right) + Math.max(line.top - y, 0, y - line.bottom);
      if (!nearest || distance < nearest.distance) nearest = {node, line, distance};
    }
  }
  if (!nearest) return null;
  const {node, line} = nearest;
  const glyphAt = offset => {
    probe.setStart(node, offset);
    probe.setEnd(node, Math.min(node.length, offset + 1));
    return probe.getBoundingClientRect();
  };
  const boundary = test => {
    let from = 0;
    let to = node.length;
    while (from < to) {
      const middle = (from + to) >>> 1;
      if (test(glyphAt(middle))) to = middle;
      else from = middle + 1;
    }
    return from;
  };
  const first = boundary(rect => rect.bottom > line.top + .5);
  const end = boundary(rect => rect.top >= line.bottom - .5);
  const segments = new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(node.data);
  const rtl = doc.defaultView.getComputedStyle(node.parentElement).direction === "rtl";
  let best = null;
  let offset = first;
  for (let visited = 0; offset < end && visited < 512; visited++) {
    const segment = segments.containing(offset);
    if (!segment) break;
    const finish = segment.index + segment.segment.length;
    probe.setStart(node, segment.index);
    probe.setEnd(node, finish);
    const glyph = probe.getBoundingClientRect();
    if (glyph.width && glyph.height && glyph.bottom > line.top && glyph.top < line.bottom) {
      for (const [at, fallback] of [[segment.index, rtl ? glyph.right : glyph.left], [finish, rtl ? glyph.left : glyph.right]]) {
        probe.setStart(node, at);
        probe.collapse(true);
        const caret = [...probe.getClientRects()].find(rect => rect.height && y >= rect.top && y <= rect.bottom);
        const distance = Math.abs(x - (caret?.left ?? fallback));
        if (!best || distance < best.distance) best = {offset: at, distance};
      }
    }
    offset = finish;
  }
  if (!best || offset < end) return null;
  const range = doc.createRange();
  range.setStart(node, best.offset);
  range.collapse(true);
  return range;
}

function writingRangeAtPoint(paper, event, scale = 1) {
  const doc = paper.ownerDocument;
  const root = paper.getRootNode();
  const {clientX: x, clientY: y} = event;
  const valid = range => rangeInPaper(paper, range) && topBlock(paper, range.startContainer) &&
    !writingElement(range.startContainer)?.closest(a4Break);
  let range;
  try {
    const point = root === doc ? doc.caretPositionFromPoint?.(x, y) :
      doc.caretPositionFromPoint?.(x, y, {shadowRoots: [root]});
    if (point && paper.contains(point.offsetNode)) {
      range = doc.createRange();
      range.setStart(point.offsetNode, point.offset);
    }
  } catch {}
  if (!valid(range)) try {
    range = root.caretRangeFromPoint?.(x, y);
  } catch {}
  if (!valid(range) && root !== doc) try {
    range = doc.caretRangeFromPoint?.(x, y);
  } catch {}
  if (!valid(range)) range = writingTextRangeAtPoint(paper, event, scale);
  if (!valid(range)) {
    const selection = writingSelectionRange(paper);
    const rect = selection?.collapsed && selection.getBoundingClientRect();
    if (rect && Math.abs(rect.left - x) < 16 && y >= rect.top && y <= rect.bottom) range = selection.cloneRange();
  }
  if (!valid(range)) return null;
  range?.collapse(true);
  return range;
}

function dropFootnote(runtime, event) {
  const marker = runtime.draggingFootnote;
  if (!marker) return false;
  event.preventDefault();
  runtime.draggingFootnote = null;
  if (runtime.paper.contentEditable !== "true" || !runtime.paper.contains(marker) || !canChangeFootnotes(runtime)) return true;
  const {paper} = runtime;
  let range = writingRangeAtPoint(paper, event, runtime.a4?.scale || 1);
  if (!rangeInPaper(paper, range) || !topBlock(paper, range.startContainer)) return true;
  const atMarker = writingElement(range.startContainer)?.closest(inlineFootnote);
  if (atMarker === marker) return true;
  if (atMarker) {
    const box = atMarker.getBoundingClientRect();
    range = footnoteBoundary(atMarker, event.clientX > (box.left + box.right) / 2);
  }
  range = normalizedFootnoteAnchor(runtime, range);
  beginWritingEdit(runtime, "moveFootnote", range);
  range.insertNode(marker);
  restoreSelection(runtime, footnoteBoundary(marker, true));
  rememberSelection(runtime);
  runtime.snapshot = null;
  updatePaper(runtime);
  rememberWritingEdit(runtime);
  send(runtime, "move-footnote", {reference_id: marker.dataset.writingFootnote});
  return true;
}

function installFootnotePointerDrag(runtime) {
  const {paper, controller: {signal}} = runtime;
  const doc = paper.ownerDocument;
  let gesture = null;
  let suppressClick = false;
  const finish = () => {
    const current = gesture;
    gesture = null;
    runtime.footnotePointerDragging = false;
    if (!current?.moved) return current;
    paper.style.cursor = current.cursor;
    current.marker.style.opacity = current.opacity;
    if (paper.hasPointerCapture?.(current.pointer)) paper.releasePointerCapture(current.pointer);
    return current;
  };
  paper.addEventListener("pointerdown", event => {
    suppressClick = false;
    if (event.button !== 0 || event.isPrimary === false || event.pointerType === "touch" ||
        paper.contentEditable !== "true" || runtime.navigationLocked) return;
    const marker = event.target.closest?.(inlineFootnote);
    if (!event.altKey || !marker || !paper.contains(marker)) return;
    finish();
    gesture = {marker, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false};
  }, {signal});
  doc.addEventListener("pointermove", event => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    if (!gesture.moved) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6) return;
      if (!canChangeFootnotes(runtime)) { finish(); return; }
      gesture.moved = true;
      gesture.cursor = paper.style.cursor;
      gesture.opacity = gesture.marker.style.opacity;
      paper.style.cursor = "grabbing";
      gesture.marker.style.opacity = ".55";
      runtime.footnotePointerDragging = true;
      try { paper.setPointerCapture?.(gesture.pointer); } catch {}
    }
    event.preventDefault();
  }, {signal});
  doc.addEventListener("pointerup", event => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const current = finish();
    if (!current.moved) return;
    suppressClick = true;
    runtime.draggingFootnote = current.marker;
    dropFootnote(runtime, event);
  }, {signal});
  doc.addEventListener("pointercancel", event => {
    if (gesture?.pointer === event.pointerId) {
      if (gesture.moved) suppressClick = true;
      finish();
    }
  }, {signal});
  doc.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !gesture?.moved) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = true;
    finish();
  }, {signal, capture: true});
  paper.addEventListener("dragstart", () => {
    // Native dragging takes over only before the pointer gesture activates.
    if (!gesture?.moved) finish();
  }, {signal});
  paper.addEventListener("click", event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, {signal, capture: true});
  doc.defaultView?.addEventListener("blur", finish, {signal});
  signal.addEventListener("abort", finish, {once: true});
}

function paintFootnotes(runtime) {
  if (!runtime.footnotes || !runtime.footnoteList) return;
  if (runtime.footnoteModeButton) runtime.footnoteModeButton.hidden = !runtime.docId;
  const current = new Map();
  const references = new Set(runtime.references.map(reference => reference.id));
  for (const marker of runtime.paper.querySelectorAll(inlineFootnote)) {
    const identity = marker.dataset.writingFootnote;
    if (!references.has(identity) || current.has(identity)) marker.remove();
    else current.set(identity, marker);
  }
  const notes = runtime.references.map(reference => {
    const marker = current.get(reference.id);
    const position = marker ? footnoteBoundary(marker) : savedFootnoteAnchor(runtime, reference);
    // An existing marker is already anchored in the draft. Normalising it
    // again while typing can move it across a just-inserted space.
    const anchor = marker || reference.target.kind === "manual" ? position : position && normalizedFootnoteAnchor(runtime, position);
    return {reference, anchor, marker, move: anchor !== position};
  }).sort((left, right) => {
    if (!left.anchor) return right.anchor ? 1 : 0;
    if (!right.anchor) return -1;
    return left.anchor.compareBoundaryPoints(Range.START_TO_START, right.anchor) ||
      (left.reference.marker_order ?? Number.MAX_SAFE_INTEGER) - (right.reference.marker_order ?? Number.MAX_SAFE_INTEGER);
  });
  const attached = notes.filter(note => note.anchor);
  runtime.paintedFootnotes = attached.map(note => note.reference.id);
  // Keep live markers in place while typing. Rebuilding them moves the native
  // caret across a footnote and can put the number back at its old offset.
  for (let index = attached.length - 1; index >= 0; index--) {
    const {reference, anchor, marker, move} = attached[index];
    if (marker) numberFootnote(marker, reference, index);
    if (!marker || move) anchor.insertNode(marker || footnoteMarker(reference, index));
  }
  if (attached.some(note => note.move)) scheduleSave(runtime);
  const mode = runtime.footnotes.dataset.mode || "citation";
  const styled = notes.map(({reference, anchor}, index) => ({
    reference, parts: writingFootnoteParts(reference, anchor && notes[index - 1]?.anchor
      ? notes[index - 1].reference : null, mode),
  }));
  const signature = JSON.stringify(styled.map(({reference, parts}) => [
    reference.id, reference.target.target_key, footnoteIdentity(reference), parts,
  ]));
  if (signature === runtime.footnoteSignature) {
    for (const [index, row] of [...runtime.footnoteList.children].entries()) {
      const field = row.querySelector("[data-footnote-note]");
      const text = footnoteNoteText(runtime, styled[index].reference);
      if (readFootnoteNote(field) !== text) writeFootnoteNote(field, text);
    }
    return;
  }
  runtime.footnoteSignature = signature;
  const rows = styled.map(({reference, parts}, index) => {
    const row = element("li");
    row.dataset.footnoteId = reference.id;
    const identity = footnoteIdentity(reference);
    const link = element("span", undefined, "footnote-link");
    link.dataset.openPrintedFootnote = reference.id;
    link.setAttribute("role", "link");
    link.tabIndex = 0;
    if (reference.target.clipboard_passage) link.dataset.clipboardPassage = "";
    if (reference.target.clipboard_passage?.quoted === true) link.dataset.quotedPassage = "";
    link.title = `Open ${reference.target.kind === "passage" ? "source passage" : "axiom route for"} ${identity}`;
    const content = element("span", undefined, "footnote-content");
    appendWritingFootnote(content, parts);
    link.append(content);
    const field = element("span", undefined, "footnote-note");
    field.dataset.footnoteNote = reference.id;
    if (reference.target.kind === "manual") {
      link.hidden = true;
      link.removeAttribute("data-open-printed-footnote");
      field.setAttribute("data-manual-footnote", "");
    }
    field.setAttribute("aria-label", `Note on footnote ${index + 1}`);
    field.setAttribute("role", "textbox");
    field.setAttribute("aria-multiline", "true");
    setFootnoteNoteEditable(field, !runtime.editorReadOnly);
    field.tabIndex = 0;
    writeFootnoteNote(field, footnoteNoteText(runtime, reference));
    row.append(link, field);
    return row;
  });
  runtime.footnotes.hidden = !rows.length;
  runtime.footnoteList.replaceChildren(...rows);
}

function readingDestination(runtime, target, destination, label) {
  return makeButton(label, () => send(runtime, "reading-open", {
    destination, item_id: target.item_id || "", target_key: target.target_key || "",
    beside: !runtime.compact,
  }));
}

function paintReading(runtime, reading) {
  if (!runtime.readingContent) return;
  runtime.reading = reading;
  const tab = runtime.root.querySelector('[data-tab="reading"]');
  if (tab) tab.hidden = !reading?.focus && runtime.activeResearchTab !== "reading";
  runtime.root.classList.toggle("has-reading", Boolean(reading?.focus));
  const signature = JSON.stringify([reading || null, runtime.readingError]);
  if (signature === runtime.readingSignature) return;
  runtime.readingSignature = signature;
  if (!reading?.focus) {
    if (runtime.readingError) runtime.readingContent.replaceChildren(element("p", runtime.readingError, "empty-results"));
    else if (runtime.pending?.type !== "read") {
      runtime.readingContent.replaceChildren();
      if (runtime.activeResearchTab === "reading") selectTab(runtime, "suggestions");
      if (tab) tab.hidden = true;
    }
    return;
  }

  const focus = resultCard(reading.focus, {fullPassage: true});
  focus.card.classList.add("reading-card");
  focus.actions.classList.add("reading-actions");
  const passage = focus.target.kind === "passage";
  const hasSheet = Object.keys(focus.target.sheet_route || {}).length > 0;
  if (passage) {
    if (focus.target.href || Object.keys(focus.target.route || {}).length) {
      focus.actions.append(readingDestination(runtime, focus.target, "source", "Open exact source"));
    }
  } else {
    if (hasSheet) focus.actions.append(readingDestination(runtime, focus.target, "sheet", runtime.compact ? "Open full panes" : "Open pane beside draft"));
    if (Object.keys(focus.target.route || {}).length) focus.actions.append(readingDestination(runtime, focus.target, "route", runtime.compact ? "Open full route" : "Open route beside draft"));
    if (!hasSheet && focus.target.href) focus.actions.append(readingDestination(runtime, focus.target, "axiom", "Open in Library"));
  }
  if (focus.target.target_key && !(passage && reading.current === false)) focus.actions.append(linkButton(runtime, focus.target));
  if (reading.current === false) {
    const message = passage ? "The exact source is unavailable. Showing the saved passage." :
      "Saved wording. Current Library routes may differ.";
    focus.card.append(element("p", message, "reference-location"));
  }

  const sections = runtime.readingError ? [element("p", runtime.readingError, "empty-results"), focus.card] : [focus.card];
  const previous = reading.nearby?.find(target => target.offset === -1);
  const next = reading.nearby?.find(target => target.offset === 1);
  if (previous || next) {
    const browse = element("nav", undefined, "reading-actions reading-browse");
    browse.setAttribute("aria-label", "Move through this book");
    if (previous) browse.append(readingButton(runtime, previous, passage ? "← Previous passage" : "← Previous axiom"));
    if (next) browse.append(readingButton(runtime, next, passage ? "Next passage →" : "Next axiom →"));
    sections.push(browse);
  }
  if (reading.chain?.some(target => target.direction !== "focus")) {
    const chain = element("section", undefined, "reading-route");
    chain.append(element("h3", "Evidence route", "reading-heading"));
    for (const target of reading.chain) {
      if (target.direction === "focus") continue;
      const step = resultCard(target);
      step.card.classList.add("route-step");
      if (target.kind === "passage") {
        if (target.href || Object.keys(target.route || {}).length) {
          step.actions.append(readingDestination(runtime, target, "source", "Open exact source"));
        }
        if (target.target_key) step.actions.append(linkButton(runtime, target));
      } else if (target.kind === "axiom") {
        step.actions.append(readingButton(runtime, target));
      }
      chain.append(step.card);
    }
    sections.push(chain);
  }
  if (reading.nearby?.length) {
    const nearby = element("section", undefined, "reading-neighbors");
    nearby.append(element("h3", "Nearby in this book", "reading-heading"));
    for (const target of reading.nearby) {
      const card = resultCard(target);
      card.actions.append(readingButton(runtime, target));
      nearby.append(card.card);
    }
    sections.push(nearby);
  }
  runtime.readingContent.replaceChildren(...sections);
  runtime.readingPane.scrollTop = 0;
}

function jump(runtime, blockId, reference = null, focusEditor = false) {
  const block = findBlock(runtime, blockId);
  if (!block) return;
  runtime.anchorId = blockId;
  const exact = reference?.selection && referenceRange(runtime, reference);
  const range = exact || document.createRange();
  if (!exact) {
    range.selectNodeContents(block);
    range.collapse(true);
  }
  runtime.range = range.cloneRange();
  if (revealWritingA4(runtime, blockId, reference)) {
    if (focusEditor) {
      restoreSelection(runtime, range);
      runtime.anchorId = blockId;
      runtime.range = range.cloneRange();
    }
    paintAnchor(runtime);
    return;
  }
  runtime.paper.focus({preventScroll: true});
  const selection = selectionFor(runtime.paper);
  selection?.removeAllRanges();
  selection?.addRange(range);
  const marker = exact && [...runtime.paper.querySelectorAll("[data-writing-footnote]")]
    .find(node => node.dataset.writingFootnote === reference.id);
  const anchor = marker || block;
  if (runtime.compact) scrollWritingA4Context(runtime.a4.well, anchor.getBoundingClientRect());
  else anchor.scrollIntoView({block: "center", behavior: "auto"});
  if (!reference?.selection) {
    block.classList.add("jump-highlight");
    clearTimeout(runtime.highlightTimer);
    runtime.highlightTimer = setTimeout(() => block.classList.remove("jump-highlight"), 2100);
  }
  paintAnchor(runtime);
}

function paintResults(runtime) {
  const kind = runtime.searchKind;
  const passage = kind === "passage";
  const ready = writingSearchReady(runtime);
  const challenge = runtime.searchMode === "challenge";
  const wild = runtime.searchMode === "wild";
  const isWaiting = type => [runtime.pending, runtime.queued].some(action =>
    action?.type === type && action.extra?.search_kind === kind &&
    (!runtime.searchMode || (action.extra?.search_mode === runtime.searchMode &&
      action.extra?.search_scope === writingSearchOptions(runtime).search_scope &&
      (action.extra?.search_work_id || "") === writingSearchOptions(runtime).search_work_id)));
  const matchesSettings = matchingWritingSearchSettings(runtime, runtime.searchProgress);
  const running = matchesSettings && runtime.searchProgress?.status === "running";
  const waiting = isWaiting("scan") || (running && !runtime.searchProgress.append);
  const deepening = isWaiting("scan-deeper") || (running && runtime.searchProgress.append);
  const progress = !waiting && matchesSettings && runtime.suggestionKind === kind ? runtime.searchProgress : null;
  const suggestions = waiting || !matchesSettings ? [] : runtime.suggestions.filter(record =>
    (targetOf(record).kind === "passage") === passage);
  const searched = Boolean(progress) || (runtime.hasSearched && runtime.suggestionKind === kind);
  const cardsSignature = JSON.stringify(suggestions);
  const signature = JSON.stringify([kind, writingSearchOptions(runtime), ready, waiting, deepening, searched, progress, cardsSignature]);
  if (signature === runtime.suggestionsSignature) {
    syncResultBookmarks(runtime);
    return;
  }
  runtime.suggestionsSignature = signature;
  for (const button of runtime.root.querySelectorAll("[data-search-kind]")) {
    button.setAttribute("aria-pressed", String(button.dataset.searchKind === kind));
  }
  runtime.query.setAttribute("aria-label", challenge ? "Claim to test" : passage ? "Search source passages" : "Search axioms by idea or ID");
  runtime.query.placeholder = challenge ? "Enter a claim or a reading ID…" :
    passage ? "Search by phrase or passage ID…" : "Search by idea or axiom ID…";
  if (runtime.searchHint) runtime.searchHint.textContent = challenge ?
    "Try a statement such as “Memory preserves the past unchanged,” or scan a claim in your draft." :
    wild ? "Start with an image, a mechanism, a Numogram name or an exact reading ID." :
    passage ? "Use a phrase or an exact source passage ID." : "Try an idea, a phrase or an exact ID such as CH_KCPI:A3.";
  runtime.results.setAttribute("aria-busy", String(waiting || deepening));
  runtime.searchStatus.textContent = runtime.searchProgress?.error || (!ready ? writingSearchBookStatus(runtime) : waiting ?
    (challenge ? "Looking for counterpoints and exceptions…" : wild ? "Following connections across the Library…" :
      passage ? "Searching source passages…" : "Searching axioms…") :
    suggestions.length ? "" : searched ?
      (challenge ? (progress?.more ? "No grounded counterpoint in this pass. Search deeper to look further." :
        "No grounded counterpoint found. Try a shorter claim with a clear subject and assertion.") :
        progress?.more ? "No matches yet. Try a wider search below." :
        passage ? "No source passages found. Try a shorter phrase or a passage ID." : "No related axioms found. Try a shorter phrase.") :
      (challenge ? "Scan a claim or draft to look for possible counterpoints in the Library." :
        passage ? "Search the original texts by phrase or passage ID." : "Search by idea or scan your writing to find related axioms."));
  runtime.searchDeeper.hidden = !progress || (!progress.more && !suggestions.length);
  runtime.searchDeeperButton.hidden = !progress?.more;
  runtime.searchDeeperButton.disabled = waiting || deepening || !ready;
  runtime.searchDepthStatus.textContent = deepening ? "Searching wider…" :
    progress && !progress.more && suggestions.length ? "Reached the end of this search." : "";
  const continuing = progress?.id && progress.id === runtime.paintedScanId;
  runtime.paintedScanId = progress?.id;
  if (cardsSignature === runtime.resultCardsSignature) {
    syncResultBookmarks(runtime);
    return;
  }
  runtime.resultCardsSignature = cardsSignature;
  const cardKeys = suggestions.map(record => JSON.stringify(record));
  const priorCards = runtime.resultCardKeys || [];
  const append = continuing && priorCards.every((key, index) => cardKeys[index] === key);
  runtime.resultCardKeys = cardKeys;
  const scroll = continuing ? runtime.suggestionPane.scrollTop : 0;
  const cards = suggestions.slice(append ? priorCards.length : 0).map(record => {
    const reading = targetOf(record);
    const bookmark = reading.bookmark_id && reading.target_key ? resultBookmark(runtime, reading) : null;
    const {card, actions, target} = resultCard(record, {showSearchMatch: true, bookmark});
    actions.append(readingButton(runtime, target), linkButton(runtime, target));
    return card;
  });
  if (append) runtime.results.append(...cards);
  else runtime.results.replaceChildren(...cards);
  syncResultBookmarks(runtime);
  if (continuing) runtime.suggestionPane.scrollTop = scroll;
}

function citationDetails(target) {
  const details = element("details", undefined, "result-note");
  details.append(element("summary", "Saved citation"));
  const passage = target.kind === "passage";
  const source = passage ? target.citation || {} : {};
  const fields = [
    [passage ? "Source passage ID" : "Reading", passage ? target.item_id : target.label || target.item_id],
    ["Chapter", source.chapter],
    ["Section", source.section],
    [source.page_kind === "pdf" ? "PDF page" : "Printed page", source.page],
    ["Build", target.build_id],
    ["Version", target.revision_id || target.version],
    ["Record", target.version_status === "registered" ? "Registered version" : "Snapshot taken when linked"],
    ["Source route", Array.isArray(target.source_route) ? target.source_route.join(" → ") : target.source_route],
    ["Fingerprint", target.content_sha256],
  ].filter(([, value]) => value);
  const list = element("dl", undefined, "citation-details");
  for (const [label, value] of fields) list.append(element("dt", label), element("dd", value));
  details.append(list);
  return details;
}

function paintReferences(runtime) {
  const signature = JSON.stringify(runtime.references);
  if (signature === runtime.referenceSignature) return;
  runtime.referenceSignature = signature;
  runtime.refCount.textContent = runtime.references.length ? "(" + runtime.references.length + ")" : "";
  if (writingSharedDocument(runtime.docId)) {
    paintWritingSharedReferenceCards(runtime);
    return;
  }
  runtime.sharedReferenceCards = null;
  const cards = runtime.references.map(reference => {
    if (reference.target.kind === "manual") {
      const card = element("article", undefined, "result");
      card.append(element("strong", "Footnote"), element("p", footnoteNoteText(runtime, reference) || "Write this note below your draft."));
      const actions = element("div", undefined, "result-actions");
      actions.append(makeButton("Edit footnote", () => focusManualFootnote(runtime, reference.id)),
        makeButton("Remove footnote", () => {
          if (!runtime.navigationLocked && canChangeFootnotes(runtime)) deleteFootnotes(runtime, [reference.id]);
        }));
      card.append(actions);
      return card;
    }
    const {card, actions, target} = resultCard(reference);
    actions.append(readingButton(runtime, target),
      makeButton(target.kind === "passage" ? "Passage notes" : "Axiom notes",
        () => send(runtime, "axiom-notes", {reference_id: reference.id})));
    const block = findBlock(runtime, reference.block_id);
    const location = reference.quote || (block ? textOf(block) : "");
    card.append(element("p", location ? "Linked passage · “" + location.slice(0, 220) + "”" : "Linked to this draft", "reference-location"));
    if (block) actions.append(makeButton("Go to passage", () => jump(runtime, reference.block_id, reference)));
    else card.append(element("p", "This passage has been removed from the draft.", "reference-location"));
  actions.append(makeButton("Remove link", () => {
    if (!runtime.navigationLocked && canChangeFootnotes(runtime)) deleteFootnotes(runtime, [reference.id]);
  }));
    const note = element("details", undefined, "result-note");
    const summary = element("summary", reference.note ? "Edit note on this use" : "Add note on this use");
    const textarea = element("textarea");
    textarea.setAttribute("aria-label", "Note on this use");
    textarea.rows = 3;
    textarea.maxLength = 10000;
    textarea.value = reference.note || "";
    if (reference.note) card.append(element("p", reference.note));
    note.append(summary, textarea, makeButton("Save note", () => send(runtime, "note", {
      reference_id: reference.id, note: textarea.value,
    })));
    card.append(note, citationDetails(target));
    if (reference.annotations?.length) {
      const notes = element("details", undefined, "result-note");
      notes.append(element("summary", "Studio notes · " + reference.annotations.length));
      for (const annotation of reference.annotations) {
        const entry = element("article", undefined, "reference-annotation");
        entry.append(element("strong", String(annotation.note_type || "comment").replaceAll("_", " ")),
          element("p", annotation.body), element("small", annotation.author));
        notes.append(entry);
      }
      card.append(notes);
    }
    return card;
  });
  runtime.referenceList.replaceChildren(...(cards.length ? cards : [
    element("p", "Axioms and source passages you link to this document will appear here.", "empty-results"),
  ]));
}

function paintDocuments(runtime, documents) {
  const signature = JSON.stringify(documents.map(({id, title}) => [id, title]));
  if (signature !== runtime.documentSignature) {
    runtime.documentSignature = signature;
    const placeholder = element("option", documents.length ? "Choose a draft" : "No drafts yet");
    placeholder.value = "";
    placeholder.disabled = true;
    runtime.select.replaceChildren(placeholder, ...documents.map(doc => {
      const option = element("option", doc.title || "Untitled document");
      option.value = doc.id;
      return option;
    }));
  }
  runtime.select.value = runtime.docId;
  if (runtime.select.selectedIndex < 0) runtime.select.selectedIndex = 0;
  if (runtime.compact && runtime.drawerDraftLabel) {
    const title = runtime.select.selectedOptions[0]?.textContent || "Choose a draft";
    runtime.drawerDraftLabel.textContent = title;
    runtime.select.title = title;
  }
}

function renderedText(runtime, fragment) {
  const scratch = element("div", undefined, "clipboard-measure");
  scratch.append(fragment);
  stripWritingA4Layout(scratch);
  runtime.root.append(scratch);
  const text = scratch.innerText;
  scratch.remove();
  return text;
}

function clipboardTarget(runtime) {
  rememberSelection(runtime);
  const range = runtime.range && writingWholeFootnotes(runtime.range);
  return {documentId: runtime.docId, epoch: runtime.clipboardEpoch, range: range?.cloneRange()};
}

function currentClipboardTarget(runtime, target) {
  return runtime.root.isConnected && Boolean(target.documentId) && target.documentId === runtime.docId &&
    target.epoch === runtime.clipboardEpoch;
}

function clipboardEdit(command, value = null) {
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

function showClipboardDialog(runtime, target, mode, text = "") {
  if (!currentClipboardTarget(runtime, target) || runtime.clipboardDialog.open) return;
  runtime.clipboardTarget = target;
  runtime.clipboardField.value = text;
  runtime.clipboardField.readOnly = mode === "copy";
  runtime.clipboardField.setAttribute("aria-label", mode === "copy" ? "Text to copy" : "Text to paste");
  runtime.clipboardDialog.querySelector("[data-clipboard-title]").textContent = mode === "copy" ? "Copy text" : "Paste text";
  runtime.clipboardDialog.querySelector("[data-clipboard-hint]").textContent = mode === "copy"
    ? "Press ⌘C to copy the selected text."
    : "Press ⌘V here, then choose Insert text.";
  runtime.clipboardDialog.querySelector("[data-clipboard-insert]").hidden = mode === "copy";
  runtime.clipboardDialog.querySelector("[data-clipboard-cancel]").textContent = mode === "copy" ? "Done" : "Cancel";
  runtime.clipboardDialog.showModal();
  runtime.clipboardField.focus();
  if (mode === "copy") runtime.clipboardField.select();
}

function writingClipboardEscape(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function writingPortableClipboardMarkup(html, text, notes) {
  if (!notes.length) return {html, text};
  const definitions = [];
  const plainNotes = [];
  for (const {placeholder, key, number, parts, note} of notes) {
    // Office-aware editors can recognise these footnote hints. Other editors
    // receive complete, ordinary HTML links and note text rather than numbers
    // detached from their sources. Native conversion belongs to the receiver.
    const attributes = `class="MsoFootnoteReference" style="mso-footnote-id:${key}"`;
    const reference = `<a ${attributes} id="_${key}ref" name="_${key}ref" href="#_${key}" role="doc-noteref"><sup>${number}</sup></a>`;
    html = html.replace(placeholder, reference);
    const citation = parts.map(part => part.italic
      ? `<em>${writingClipboardEscape(part.text || "")}</em>` : writingClipboardEscape(part.text || "")).join("");
    const addition = note ? ` ${writingClipboardEscape(note).replaceAll("\n", "<br>")}` : "";
    definitions.push(`<div style="mso-element:footnote" id="${key}" role="doc-footnote"><p class="MsoFootnoteText">` +
      `<a ${attributes} id="_${key}" name="_${key}" href="#_${key}ref" role="doc-backlink"><sup>${number}</sup></a> ` +
      citation + addition + "</p></div>");
    plainNotes.push(`[${number}] ${parts.map(part => part.text || "").join("")}${note ? " " + note : ""}`);
  }
  return {
    html: html + `<div style="mso-element:footnote-list"><h2>Footnotes</h2>${definitions.join("")}</div>`,
    text: text.replace(/\s+$/, "") + "\n\nFootnotes\n" + plainNotes.join("\n"),
  };
}

function writingPortableClipboard(runtime, source, text) {
  const notes = [];
  const scope = id().replace(/[^a-zA-Z0-9]/g, "");
  const mode = runtime.footnotes?.dataset.mode || "citation";
  let previous = null;
  for (const marker of source.querySelectorAll(inlineFootnote)) {
    const reference = runtime.references.find(row => row.id === marker.dataset.writingFootnote);
    if (!reference) { marker.remove(); continue; }
    const number = /^[1-9][0-9]{0,5}$/.test(marker.dataset.footnoteNumber || "")
      ? marker.dataset.footnoteNumber : String(notes.length + 1);
    const key = `ftn${scope}n${notes.length + 1}`;
    const placeholder = `CARECLIPREF${scope}N${notes.length + 1}END`;
    notes.push({placeholder, key, number, parts: writingFootnoteParts(reference, previous, mode),
      note: footnoteNoteText(runtime, reference)});
    previous = reference;
    marker.replaceWith(document.createTextNode(placeholder));
  }
  return writingPortableClipboardMarkup(source.innerHTML, text, notes);
}

// A manuscript fragment carries reference identities separately from its rich
// text. Only the private store can resolve those identities into source links.
function writingClipboardContent(runtime, range, printed = []) {
  const content = element("div");
  const selected = printed.length ? printed : selectedFootnotes(runtime.paper, range).map(marker => marker.dataset.writingFootnote);
  if (printed.length) {
    for (const identity of printed) {
      const original = runtime.paper.querySelector(`[data-writing-footnote="${identity}"]`);
      const reference = runtime.references.find(row => row.id === identity);
      if (original) content.append(original.cloneNode(true));
      else if (reference) content.append(footnoteMarker(reference, runtime.references.indexOf(reference)));
    }
  } else content.append(range.cloneContents());
  stripWritingA4Layout(content);
  const packet = {version: 1, document_id: runtime.docId, html: "", text: "", slots: []};
  const external = content.cloneNode(true);
  const textCopy = content.cloneNode(true);
  for (const marker of textCopy.querySelectorAll(inlineFootnote)) {
    marker.replaceWith(document.createTextNode(`[${marker.dataset.footnoteNumber || ""}]`));
  }
  if (printed.length) {
    const labels = printed.map(identity => [...runtime.footnoteList.querySelectorAll("[data-open-printed-footnote]")]
      .find(link => link.dataset.openPrintedFootnote === identity)?.querySelector(".footnote-content"));
    if (labels.every(Boolean)) {
      external.replaceChildren();
      for (const label of labels) {
        const paragraph = element("p");
        paragraph.append(...[...label.childNodes].map(node => node.cloneNode(true)));
        external.append(paragraph);
      }
      textCopy.replaceChildren(...[...external.childNodes].map(node => node.cloneNode(true)));
    }
  }
  for (const marker of content.querySelectorAll(inlineFootnote)) {
    const reference = runtime.references.find(row => row.id === marker.dataset.writingFootnote);
    if (!reference || !selected.includes(reference.id)) {
      marker.remove();
      continue;
    }
    const placeholder = `CAREFOOTNOTE${id().replace(/[^a-zA-Z0-9]/g, "")}END`;
    packet.slots.push({placeholder, source_reference_id: reference.id, note: footnoteNoteText(runtime, reference)});
    marker.replaceWith(document.createTextNode(placeholder));
  }
  packet.html = content.innerHTML;
  const portable = printed.length ? {html: external.innerHTML, text: renderedText(runtime, textCopy)}
    : writingPortableClipboard(runtime, external, renderedText(runtime, textCopy));
  packet.text = portable.text;
  const token = id();
  if (packet.slots.length) {
    writingFragmentCache.set(token, packet);
    while (writingFragmentCache.size > 10) writingFragmentCache.delete(writingFragmentCache.keys().next().value);
    try { sessionStorage.setItem("care-studio-fragment-clipboard-v1", JSON.stringify({token, packet})); } catch {}
  }
  const attribute = packet.slots.length ? ` data-care-studio-fragment="${writingClipboardEscape(token)}"` : "";
  return {packet, text: packet.text, html: `<div${attribute}>${portable.html}</div>`};
}

function studioClipboardFragment(text, html, metadata = "") {
  let packet;
  try {
    if (metadata && metadata.length < 3_000_000) packet = JSON.parse(metadata);
    if (!packet && html && html.length < 3_000_000) {
      const template = element("template");
      template.innerHTML = html;
      const tags = template.content.querySelectorAll("[data-care-studio-fragment]");
      const token = tags.length === 1 && tags[0].getAttribute("data-care-studio-fragment");
      if (token && token.length <= 100) {
        packet = writingFragmentCache.get(token);
        if (!packet) {
          const saved = JSON.parse(sessionStorage.getItem("care-studio-fragment-clipboard-v1"));
          if (saved?.token === token) packet = saved.packet;
        }
      }
    }
  } catch { return null; }
  if (packet?.version !== 1 || typeof packet.document_id !== "string" || !packet.document_id || packet.document_id.length > 128 ||
      typeof packet.html !== "string" || packet.html.length > 2_000_000 || typeof packet.text !== "string" ||
      packet.text.replace(/\r\n?/g, "\n") !== text.replace(/\r\n?/g, "\n") ||
      !Array.isArray(packet.slots) || !packet.slots.length || packet.slots.length > 2000) return null;
  const seen = new Set();
  for (const slot of packet.slots) {
    if (!slot || typeof slot.source_reference_id !== "string" || !slot.source_reference_id || slot.source_reference_id.length > 128 ||
        typeof slot.note !== "string" || slot.note.length > 20000 ||
        typeof slot.placeholder !== "string" || !/^CAREFOOTNOTE[a-zA-Z0-9]{1,100}END$/.test(slot.placeholder) ||
        seen.has(slot.placeholder) || packet.html.split(slot.placeholder).length !== 2) return null;
    seen.add(slot.placeholder);
  }
  return packet;
}

function writingClipboardState(runtime) {
  const positions = {};
  footnotePositions(runtime, null, positions);
  return {
    ...capture(runtime), bookmark: writingHistoryBookmark(runtime, writingSelectionRange(runtime.paper) || runtime.range),
    positions, nodes: [...runtime.paper.childNodes].map(node => node.cloneNode(true)), references: runtime.references,
  };
}

function restoreWritingClipboard(runtime, before) {
  runtime.paper.replaceChildren(...before.nodes);
  runtime.references = before.references;
  runtime.snapshot = null;
  runtime.blocks = new Map([...runtime.paper.children].map(block => [block.dataset.blockId, blockText(block)]));
  restoreWritingHistoryBookmark(runtime, before.bookmark);
  updatePaper(runtime);
}

function clipboardFootnoteAction(runtime, target, packet, cut = false, printed = []) {
  if (!currentClipboardTarget(runtime, target) || runtime.paper.contentEditable !== "true") return false;
  if (writingSharedDocument(runtime.docId)) {
    if (!canChangeFootnotes(runtime)) return false;
    if (!cut && !writingSharedDocument(packet?.document_id)) {
      writingSharedNotice(runtime, "Paste private Library references into a private draft. Use Paste and Match Style to paste only the text.");
      return false;
    }
  }
  if (runtime.pending || (runtime.queued && !["scan", "scan-deeper"].includes(runtime.queued.type))) {
    status(runtime, "Wait for the current draft save, then try again.");
    return false;
  }
  const range = restoreSelection(runtime, target.range).cloneRange();
  const before = writingClipboardState(runtime);
  const removed = printed.length ? printed : selectedFootnotes(runtime.paper, range).map(marker => marker.dataset.writingFootnote);
  const added = [];
  try {
    runtime.applyingClipboard = true;
    if (cut) {
      if (printed.length) {
        for (const marker of runtime.paper.querySelectorAll(inlineFootnote)) {
          if (printed.includes(marker.dataset.writingFootnote)) marker.remove();
        }
      } else range.deleteContents();
      range.collapse(true);
      restoreSelection(runtime, range);
    } else {
      const fragment = element("div");
      fragment.append(safeFragment(packet.html));
      if (!clipboardEdit("insertHTML", fragment.innerHTML)) throw new Error("CARE could not place the copied footnotes. Try pasting again.");
      const insertedEnd = writingSelectionRange(runtime.paper)?.cloneRange();
      insertedEnd?.collapse(false);
      const walker = document.createTreeWalker(runtime.paper, NodeFilter.SHOW_TEXT);
      const texts = [];
      for (let text = walker.nextNode(); text; text = walker.nextNode()) texts.push(text);
      for (const slot of packet.slots) {
        const text = texts.find(node => node.data.includes(slot.placeholder));
        if (!text) throw new Error("The copied footnotes could not be placed. Copy the selection again.");
        const at = text.data.indexOf(slot.placeholder);
        const placeholder = text.splitText(at);
        const tail = placeholder.splitText(slot.placeholder.length);
        if (insertedEnd?.startContainer === placeholder && insertedEnd.startOffset === placeholder.length) {
          // Replacing the final placeholder must leave the caret after its
          // marker, ready for the next typed word, including marker-only paste.
          insertedEnd.setStart(tail, 0);
          insertedEnd.collapse(true);
        }
        texts.push(tail);
        const identity = id();
        const marker = footnoteMarker({id: identity, target: {item_id: slot.source_reference_id}}, 0);
        placeholder.replaceWith(marker);
        added.push({id: identity,
          source_document_id: writingSharedDocument(runtime.docId) ? packet.document_id.slice(7) : packet.document_id,
          source_reference_id: slot.source_reference_id, note: slot.note});
      }
      if (insertedEnd) restoreSelection(runtime, insertedEnd);
    }
    normalizeBlocks(runtime.paper, runtime.blocks);
    runtime.blocks = new Map([...runtime.paper.children].map(block => [block.dataset.blockId, blockText(block)]));
    runtime.snapshot = null;
    rememberSelection(runtime);
    const positions = {};
    for (const [order, marker] of [...runtime.paper.querySelectorAll(inlineFootnote)].entries()) {
      const point = footnoteLocation(runtime.paper, footnoteBoundary(marker));
      if (!point) throw new Error("Place the cursor in a paragraph to paste a footnote.");
      positions[marker.dataset.writingFootnote] = [...point, order];
      marker.dataset.footnoteNumber = String(order + 1);
    }
    for (const reference of added) reference.location = positions[reference.id];
    const after = {...capture(runtime), bookmark: writingHistoryBookmark(runtime, runtime.range), positions};
    runtime.clipboardEdit = {before, after, added: added.map(row => row.id), removed};
    runtime.queued = null;
    send(runtime, "clipboard-footnotes", {pasted_footnotes: added, removed_footnotes: removed}, after);
    return true;
  } catch (error) {
    restoreWritingClipboard(runtime, before);
    status(runtime, error.message || "CARE could not paste the footnotes. Try again.", true);
    return false;
  } finally { runtime.applyingClipboard = false; }
}

function insertManualFootnote(runtime) {
  if (!runtime.docId || runtime.paper.contentEditable !== "true" || runtime.composing || runtime.composingFootnote ||
      writingSharedDocument(runtime.docId)) return;
  if (runtime.pending || runtime.queued) {
    status(runtime, "Wait for the current draft save, then insert the footnote.");
    return;
  }
  rememberSelection(runtime);
  const range = restoreSelection(runtime, runtime.range?.cloneRange(), runtime.rangeReversed).cloneRange();
  range.collapse(false);
  const before = writingClipboardState(runtime);
  const identity = id();
  const reference = {id: identity, target: {kind: "manual", item_id: "NOTE:" + identity, label: "Footnote"}, note: ""};
  try {
    const marker = footnoteMarker(reference, 0);
    range.insertNode(marker);
    runtime.references = [...runtime.references, reference];
    restoreSelection(runtime, footnoteBoundary(marker, true));
    runtime.range = writingSelectionRange(runtime.paper)?.cloneRange() || range;
    const positions = {};
    for (const [order, item] of [...runtime.paper.querySelectorAll(inlineFootnote)].entries()) {
      const point = footnoteLocation(runtime.paper, footnoteBoundary(item));
      if (!point) throw new Error("Place the cursor in a paragraph before inserting a footnote.");
      positions[item.dataset.writingFootnote] = [...point, order];
    }
    const location = positions[identity];
    reference.block_id = location[0];
    reference.marker_offset = location[1];
    reference.marker_order = location[2];
    runtime.snapshot = null;
    const after = {...capture(runtime), bookmark: writingHistoryBookmark(runtime, runtime.range), positions};
    runtime.manualFootnoteEdit = {before, after, identity};
    send(runtime, "manual-footnote", {reference_id: identity, location, footnote_positions: positions}, after);
    updatePaper(runtime, false);
  } catch (error) {
    runtime.manualFootnoteEdit = null;
    restoreWritingClipboard(runtime, before);
    status(runtime, error.message || "CARE could not insert the footnote. Try again.", true);
  }
}

function acknowledgeManualFootnote(runtime, ack) {
  const edit = runtime.manualFootnoteEdit;
  runtime.manualFootnoteEdit = null;
  if (!edit) return;
  if (ack.error || ack.manual_reference_id !== edit.identity) {
    restoreWritingClipboard(runtime, edit.before);
    return;
  }
  recordWritingClipboardEdit(runtime, edit.before, edit.after, {added: [edit.identity]});
  runtime.manualFootnoteFocus = {documentId: runtime.docId, identity: edit.identity};
}

function focusManualFootnote(runtime, identity) {
  refreshWritingA4(runtime, true);
  const scope = runtime.a4?.active ? runtime.a4.pages : runtime.footnoteList;
  const field = scope.querySelector(`[data-footnote-note="${CSS.escape(identity)}"]`);
  if (!field) return false;
  field.scrollIntoView({block: "nearest", inline: "nearest"});
  restoreFootnoteNoteSelection(field);
  return true;
}

function insertWritingFragment(runtime, target, packet) {
  return clipboardFootnoteAction(runtime, target, packet);
}

function acknowledgeWritingClipboard(runtime, ack) {
  const edit = runtime.clipboardEdit;
  runtime.clipboardEdit = null;
  if (!edit) return;
  if (ack.error) restoreWritingClipboard(runtime, edit.before);
  else {
    recordWritingClipboardEdit(runtime, edit.before, edit.after, {added: edit.added, removed: edit.removed});
    const {docId, range} = runtime;
    requestAnimationFrame(() => {
      if (!runtime.pending && runtime.docId === docId && rangeInPaper(runtime.paper, range)) restoreSelection(runtime, range);
    });
  }
}

function nativeWritingSourceQuote(runtime, event) {
  if (!runtime.root || writingSharedDocument(runtime.docId)) return false;
  const range = writingSelectionRange(runtime.root);
  if (!range || range.collapsed) return false;
  const first = writingElement(range.startContainer)?.closest?.("[data-source-quote-key]");
  const last = writingElement(range.endContainer)?.closest?.("[data-source-quote-key]");
  if (!first || first !== last) return false;
  const choices = [
    ...(runtime.suggestions || []), ...(runtime.references || []).map(reference => reference.target),
    runtime.reading?.focus, ...(runtime.reading?.nearby || []), ...(runtime.reading?.chain || []),
  ].filter(Boolean).map(targetOf);
  const source = choices.find(reading => reading.kind === "passage" && reading.target_key === first.dataset.sourceQuoteKey);
  const quote = range.toString().replace(/\r\n?/g, "\n").trim();
  if (!source || !quote || quote.length > studioReferenceSelectionLimit - 2 ||
      !String(source.text || "").replace(/\s+/g, " ").includes(quote.replace(/\s+/g, " "))) return false;
  const request = runtime.writingClipboardRequest || (runtime.sourceQuoteRequest ||= id());
  const packet = {kind: "passage", id: source.item_id, work_id: source.work_id, request,
    mode: "passage-quote", text: quote, quote, source_text: source.text,
    ...(source.passage_set_id ? {source_version: source.passage_set_id} : {})};
  const token = id();
  try {
    sessionStorage.setItem("care-studio-source-clipboard-v1", JSON.stringify({token, packet}));
    event.clipboardData.setData("text/plain", quote);
    event.clipboardData.setData("text/html", `<span data-care-studio-source="${token}">${writingClipboardEscape(quote)}</span>`);
    try { event.clipboardData.setData(studioSourceMime, token); } catch {}
  } catch { return false; }
  runtime.librarySourceRequests.add(request);
  event.preventDefault();
  return true;
}

function nativeWritingClipboard(runtime, event, cut = false) {
  if (!event.clipboardData || event.defaultPrevented || event.target.closest?.("input, textarea, select, [data-footnote-note]")) return;
  let manuscript = writingSelectionRange(runtime.paper);
  if (!cut && !manuscript && nativeWritingSourceQuote(runtime, event)) return;
  const target = clipboardTarget(runtime);
  let printed = [];
  if (!manuscript || manuscript.collapsed) {
    printed = selectedPrintedFootnotes(runtime);
    const focused = event.target.closest?.(inlineFootnote);
    if (!printed.length && focused && runtime.paper.contains(focused)) {
      manuscript = document.createRange();
      manuscript.selectNode(focused);
      target.range = manuscript;
    }
    const footer = event.target.closest?.("[data-open-printed-footnote]");
    if (!printed.length && !focused && footer) printed = [footer.dataset.openPrintedFootnote];
  }
  else target.range = writingWholeFootnotes(manuscript);
  if (!printed.length && (!manuscript || manuscript.collapsed)) return;
  const content = writingClipboardContent(runtime, target.range, printed);
  if (cut && (!content.packet.slots.length || runtime.pending || runtime.navigationLocked)) {
    if (content.packet.slots.length) event.preventDefault();
    return;
  }
  try {
    event.clipboardData.setData("text/plain", content.text);
    event.clipboardData.setData("text/html", content.html);
    if (content.packet.slots.length) event.clipboardData.setData(studioFragmentMime, JSON.stringify(content.packet));
  } catch {
    // A rejected clipboard write must leave the source selection in place.
    if (cut) event.preventDefault();
    return;
  }
  event.preventDefault();
  if (cut) clipboardFootnoteAction(runtime, target, null, true, printed);
}

async function copyWritingFragment(runtime, target) {
  const content = writingClipboardContent(runtime, target.range);
  try {
    await navigator.clipboard.write([new ClipboardItem({
      "text/plain": new Blob([content.text], {type: "text/plain"}),
      "text/html": new Blob([content.html], {type: "text/html"}),
    })]);
    if (currentClipboardTarget(runtime, target)) status(runtime,
      content.packet.slots.length ? "Copied with footnotes" : "Copied to clipboard");
  } catch {
    if (currentClipboardTarget(runtime, target)) status(runtime, "Press Copy with the text selected to copy its footnotes.", true);
  }
}

async function copyText(runtime) {
  const target = clipboardTarget(runtime);
  if (!currentClipboardTarget(runtime, target)) return;
  const {range} = target;
  if (range && !range.collapsed && rangeInPaper(runtime.paper, range) && selectedFootnotes(runtime.paper, range).length) {
    return copyWritingFragment(runtime, target);
  }
  if ((!range || range.collapsed) && runtime.references?.length) {
    const whole = runtime.paper.ownerDocument.createRange();
    whole.selectNodeContents(runtime.paper);
    return copyWritingFragment(runtime, {...target, range: whole});
  }
  const text = range && !range.collapsed && rangeInPaper(runtime.paper, range)
    ? renderedText(runtime, range.cloneContents()) : renderedText(runtime, runtime.paper.cloneNode(true));
  if (!text) return;
  restoreSelection(runtime, range);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    if (!currentClipboardTarget(runtime, target)) return;
    const fallback = element("textarea");
    fallback.value = text;
    fallback.className = "clipboard-measure";
    runtime.root.append(fallback);
    fallback.select();
    const copied = clipboardEdit("copy");
    fallback.remove();
    if (!copied) {
      showClipboardDialog(runtime, target, "copy", text);
      return;
    }
    restoreSelection(runtime, range);
  }
  if (currentClipboardTarget(runtime, target) && !runtime.error) status(runtime, "Copied to clipboard");
}

function citedWritingClipboard(runtime) {
  const range = runtime.paper.ownerDocument.createRange();
  range.selectNodeContents(runtime.paper);
  const {html, text} = writingClipboardContent(runtime, range);
  return {html, text};
}

async function copyWritingWithFootnotes(runtime) {
  const target = clipboardTarget(runtime);
  if (!currentClipboardTarget(runtime, target)) return;
  const {html, text} = citedWritingClipboard(runtime);
  if (!text) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], {type: "text/html"}),
      "text/plain": new Blob([text], {type: "text/plain"}),
    })]);
    if (currentClipboardTarget(runtime, target) && !runtime.error) status(runtime, "Draft and footnotes copied");
  } catch {
    if (!currentClipboardTarget(runtime, target)) return;
    try {
      await navigator.clipboard.writeText(text);
      if (currentClipboardTarget(runtime, target) && !runtime.error) status(runtime, "Draft and footnotes copied as text");
    } catch {
      showClipboardDialog(runtime, target, "copy", text);
    }
  }
}

function selectedWritingBlocks(paper, range) {
  const first = blockAtBoundary(paper, range.startContainer, range.startOffset, false) ||
    (range.collapsed ? blockAtBoundary(paper, range.startContainer, range.startOffset, true) : null);
  if (range.collapsed) return first ? [first] : [];
  const last = blockAtBoundary(paper, range.endContainer, range.endOffset, true);
  const blocks = [...paper.children];
  const start = blocks.indexOf(first);
  let end = blocks.indexOf(last);
  if (start < 0 || end < start) return [];
  if (end > start && last.contains(range.endContainer)) {
    const prefix = range.cloneRange();
    prefix.setStart(last, 0);
    const content = prefix.cloneContents();
    if (!content.textContent && !content.querySelector("br, hr, table")) end--;
  }
  return blocks.slice(start, end + 1);
}

function styleWritingBlocks(runtime, range, tag) {
  if (!paragraphStyles.has(tag)) return false;
  const {startContainer, startOffset, endContainer, endOffset} = range;
  const selection = selectionFor(runtime.paper);
  const backward = !range.collapsed && selection?.anchorNode === endContainer && selection.anchorOffset === endOffset;
  const units = writingParagraphUnits(runtime.paper, range);
  if (units.length === 1 && paragraphStyles.has(units[0].localName)) {
    const bookmark = writingHistoryBookmark(runtime, range);
    if (splitWritingStyleUnit(runtime, units[0], range, tag)) {
      restoreWritingHistoryBookmark(runtime, bookmark);
      return true;
    }
  }
  const changed = new Map();
  for (const block of units) {
    if (!paragraphStyles.has(block.localName) || block.localName === tag) continue;
    const replacement = element(tag);
    if (block.dataset.blockId) replacement.dataset.blockId = block.dataset.blockId;
    replacement.style.cssText = block.style.cssText;
    replacement.style.removeProperty("--writing-a4-gap");
    replacement.append(...block.childNodes);
    block.replaceWith(replacement);
    changed.set(block, replacement);
  }
  if (!changed.size) return false;
  const updated = document.createRange();
  updated.setStart(changed.get(startContainer) || startContainer, startOffset);
  updated.setEnd(changed.get(endContainer) || endContainer, endOffset);
  restoreSelection(runtime, updated);
  if (backward) selection.setBaseAndExtent?.(updated.endContainer, endOffset, updated.startContainer, startOffset);
  return true;
}

function formatText(runtime, command, value = null) {
  if (runtime.paper.contentEditable !== "true" || runtime.composing) return;
  if (command === "undo" || command === "redo") {
    applyWritingHistory(runtime, command);
    return;
  }
  rememberSelection(runtime);
  const range = restoreSelection(runtime, runtime.range?.cloneRange(), runtime.rangeReversed);
  runtime.range = range.cloneRange();
  beginWritingEdit(runtime, "format", range);
  if (command === "formatBlock") {
    if (styleWritingBlocks(runtime, range, value)) markEdited(runtime, true);
  } else if (command === "align" && paragraphAlignments.has(value)) {
    for (const block of writingParagraphUnits(runtime.paper, range)) block.style.textAlign = value;
    markEdited(runtime, true);
  } else if (["fontFamily", "fontSize", "clearTypography"].includes(command)) {
    if (writingTypography(runtime, range, command, value)) markEdited(runtime, true);
  } else if (!range.collapsed && writingInlineMarks.has(command)) {
    if (styleWritingInline(runtime, range, command)) markEdited(runtime, true);
  } else if (styleSimpleWritingList(runtime, range, writingListCommands[command])) {
    markEdited(runtime, true);
  } else if (clipboardEdit(command, value)) {
    markEdited(runtime, true);
  }
  rememberSelection(runtime);
}

function writingElement(node) {
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function moveWritingListItem(item, outdent) {
  const list = item.parentElement;
  if (!list.matches("ul, ol")) return false;
  if (outdent) {
    const parent = list.parentElement;
    if (!parent.matches("li") || list !== parent.lastChild) return false;
    // Keep later siblings after this item in reading order.
    if (item.nextElementSibling) {
      const remainder = element(list.localName);
      while (item.nextElementSibling) remainder.append(item.nextElementSibling);
      item.append(remainder);
    }
    parent.after(item);
    if (!list.firstElementChild) list.remove();
    return true;
  }
  const previous = item.previousElementSibling;
  if (!previous) return false;
  let nested = previous.lastElementChild;
  if (nested?.localName !== list.localName) {
    nested = element(list.localName);
    previous.append(nested);
  }
  nested.append(item);
  return true;
}

function tabInWriting(runtime, event) {
  if (event.key !== "Tab" || event.altKey || event.metaKey || event.ctrlKey ||
      event.isComposing || runtime.composing || runtime.paper.contentEditable !== "true") return false;
  const {paper} = runtime;
  const range = writingSelectionRange(paper);
  if (!range) return false;
  const start = writingElement(range.startContainer);
  const cell = start.closest("td, th");
  const table = cell?.closest("table");
  if (table) {
    const cells = [...table.querySelectorAll("td, th")].filter(candidate => candidate.closest("table") === table);
    const next = cells[cells.indexOf(cell) + (event.shiftKey ? -1 : 1)];
    if (!next) return false;
    event.preventDefault();
    const caret = document.createRange();
    caret.selectNodeContents(next);
    caret.collapse(true);
    restoreSelection(runtime, caret);
    rememberSelection(runtime);
    next.scrollIntoView({block: "nearest"});
    return true;
  }
  const item = start.closest("li");
  if (item && range.collapsed) {
    const {startContainer, startOffset} = range;
    beginWritingEdit(runtime, "indent", range);
    if (moveWritingListItem(item, event.shiftKey)) {
      event.preventDefault();
      const caret = document.createRange();
      caret.setStart(startContainer, startOffset);
      caret.collapse(true);
      restoreSelection(runtime, caret);
      markEdited(runtime, true);
      return true;
    }
  }
  if (event.shiftKey) {
    const block = topBlock(paper, range.startContainer);
    const first = block && pointAtOffset(block, 0)?.[0];
    if (first?.nodeType !== Node.TEXT_NODE || !first.data.startsWith("\t")) return false;
    event.preventDefault();
    beginWritingEdit(runtime, "indent", range);
    first.deleteData(0, 1);
    restoreSelection(runtime, range);
    markEdited(runtime, true);
    return true;
  }
  event.preventDefault();
  beginWritingEdit(runtime, "indent", range);
  range.deleteContents();
  const tab = document.createTextNode("\t");
  range.insertNode(tab);
  range.setStartAfter(tab);
  range.collapse(true);
  restoreSelection(runtime, range);
  markEdited(runtime, true);
  return true;
}

function selectWritingDocument(runtime) {
  const {paper} = runtime;
  if (paper.contentEditable !== "true") return;
  const well = runtime.a4?.well;
  const viewport = well && {top: well.scrollTop, left: well.scrollLeft};
  const range = paper.ownerDocument.createRange();
  range.selectNodeContents(paper);
  restoreSelection(runtime, range);
  const selection = selectionFor(paper);
  try {
    if (selection?.setBaseAndExtent) selection.setBaseAndExtent(paper, 0, paper, paper.childNodes.length);
    else selection?.selectAllChildren?.(paper);
  } catch {
    // Some WebKit releases reject cross-shadow ranges through one Selection
    // API while accepting the editable-root operation through another.
    try { selection?.selectAllChildren?.(paper); } catch {}
  }
  runtime.range = range.cloneRange();
  if (selection?.isCollapsed === false) writingExplicitSelections.set(paper, {
    range: range.cloneRange(), selection, text: range.toString(),
    anchorNode: selection.anchorNode, anchorOffset: selection.anchorOffset,
    focusNode: selection.focusNode, focusOffset: selection.focusOffset,
  });
  rememberSelection(runtime);
  if (well) {
    well.scrollTop = viewport.top;
    well.scrollLeft = viewport.left;
  }
  runtime.scheduleWritingSelection?.();
}

function writingSelectAllAtFocus(runtime, event, target) {
  if (event.defaultPrevented || !runtime.docId || !runtime.root.isConnected || runtime.composing ||
      runtime.composingFootnote || runtime.paper.contentEditable !== "true" ||
      !target || !runtime.paper.contains(target) ||
      target.closest?.("input, textarea, select, [data-footnote-note], [contenteditable=plaintext-only]")) return false;
  event.preventDefault();
  selectWritingDocument(runtime);
  return true;
}

function installWritingSelectAll(runtime) {
  const {paper, controller: {signal}} = runtime;
  const doc = paper.ownerDocument;
  const clear = () => writingExplicitSelections.delete(paper);
  // AppKit handles menu key equivalents before WebKit's DOM keydown. Claim
  // only a focused manuscript; inputs and embedded readers keep native Select All.
  doc.addEventListener("care-native-edit-command", event => {
    if (event.detail?.command !== "select-all") return;
    const root = paper.getRootNode();
    writingSelectAllAtFocus(runtime, event, root.activeElement || doc.activeElement);
  }, {signal});
  doc.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", "Escape"].includes(event.key)) clear();
    if (!writingPrimaryShortcut(event) || event.isComposing || event.altKey || event.shiftKey ||
        String(event.key || "").toLowerCase() !== "a") return;
    writingSelectAllAtFocus(runtime, event, writingShortcutTarget(runtime, event));
  }, {capture: true, signal});
  doc.addEventListener("pointerdown", clear, {capture: true, signal});
  doc.addEventListener("focusin", event => {
    const target = event.composedPath?.()[0] || event.target;
    if (!paper.contains(target)) clear();
  }, {signal});
  // beforeinput still needs the selected author range for replacement history
  // and citation deletion. Invalidate only after that edit has been consumed.
  paper.addEventListener("input", clear, {signal});
  doc.defaultView?.addEventListener("blur", clear, {signal});
  doc.defaultView?.addEventListener("care-workspace-before-navigation", clear, {signal});
  signal.addEventListener("abort", clear, {once: true});
}

function writingShortcutTarget(runtime, event) {
  const target = event.composedPath?.().find(node => node?.nodeType === Node.ELEMENT_NODE) || event.target;
  return target && runtime.root.contains(target) ? target : null;
}

function writingPrimaryShortcut(event) {
  const platform = globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || "";
  if (/mac|iphone|ipad|ipod/i.test(platform) && event.ctrlKey) return false;
  return Boolean(event.metaKey) !== Boolean(event.ctrlKey) && !event.getModifierState?.("AltGraph") &&
    !(event.ctrlKey && event.altKey);
}

function writingSaveShortcut(runtime, event) {
  if (event.defaultPrevented || event.isComposing || runtime.composing || runtime.composingFootnote ||
      !runtime.docId || !writingPrimaryShortcut(event) || event.altKey || event.shiftKey ||
      String(event.key || "").toLowerCase() !== "s") return false;
  event.preventDefault();
  send(runtime, "save");
  return true;
}

function writingFormatShortcut(runtime, event) {
  if (event.defaultPrevented || !writingPrimaryShortcut(event) || event.isComposing || runtime.composing ||
      runtime.composingFootnote || runtime.paper.contentEditable !== "true") return false;
  const key = String(event.key || "").toLowerCase();
  if (!event.altKey && !event.shiftKey && key === "a") {
    event.preventDefault();
    selectWritingDocument(runtime);
    return true;
  }
  if (event.altKey) {
    if (event.shiftKey) return false;
    const style = {Digit0: "p", Digit1: "h1", Digit2: "h2", Digit3: "h3"}[event.code];
    if (!style) return false;
    event.preventDefault();
    rememberSelection(runtime);
    formatText(runtime, "formatBlock", style);
    return true;
  }
  const alignment = event.shiftKey && {l: "left", e: "center", r: "right", j: "justify"}[key];
  const command = event.shiftKey
    ? {Digit7: "insertOrderedList", Digit8: "insertUnorderedList", KeyX: "strikeThrough"}[event.code] ||
      {"7": "insertOrderedList", "8": "insertUnorderedList", x: "strikeThrough"}[key]
    : {b: "bold", i: "italic", u: "underline"}[key];
  if (alignment) {
    event.preventDefault();
    rememberSelection(runtime);
    formatText(runtime, "align", alignment);
    return true;
  }
  if (!command) return false;
  event.preventDefault();
  rememberSelection(runtime);
  formatText(runtime, command);
  return true;
}

function applyParagraphStarter(runtime, event) {
  if (event.key !== " " || event.altKey || event.metaKey || event.ctrlKey ||
      event.isComposing || runtime.composing || runtime.paper.contentEditable !== "true") return;
  rememberSelection(runtime);
  const {paper, range} = runtime;
  const block = range && topBlock(paper, range.startContainer);
  const prefix = range?.startContainer;
  if (!range?.collapsed || !["p", "div"].includes(block?.localName) ||
      block.childNodes.length !== 1 || prefix !== block.firstChild ||
      prefix.nodeType !== Node.TEXT_NODE || range.startOffset !== prefix.length) return;
  const format = paragraphStarters.get(prefix.textContent);
  if (!format) return;

  event.preventDefault();
  beginWritingEdit(runtime, "format", range);
  const blockId = block.dataset.blockId;
  if (format[0] === "formatBlock") {
    const caret = document.createRange();
    const blank = element("br");
    block.replaceChildren(blank);
    caret.setStartBefore(blank);
    caret.collapse(true);
    styleWritingBlocks(runtime, caret, format[1]);
    markEdited(runtime, true);
    return;
  }
  const selection = selectionFor(paper);
  const wholePrefix = range.cloneRange();
  wholePrefix.setStart(prefix, 0);
  selection.removeAllRanges();
  selection.addRange(wholePrefix);
  runtime.applyingStarter = true;
  try {
    if (document.execCommand("delete")) {
      document.execCommand(format[0], false, format[1]);
    } else {
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("insertText", false, " ");
    }
  } finally {
    runtime.applyingStarter = false;
  }
  rememberSelection(runtime);
  const replacement = runtime.range && topBlock(paper, runtime.range.startContainer);
  if (replacement && !replacement.dataset.blockId && !findBlock(runtime, blockId)) {
    replacement.dataset.blockId = blockId;
  }
  markEdited(runtime, true);
}

function insertClipboard(runtime, target, text, html = "") {
  if (!currentClipboardTarget(runtime, target) || runtime.paper.contentEditable !== "true") return;
  const range = restoreSelection(runtime, target.range).cloneRange();
  beginWritingEdit(runtime, "paste", range);
  if (html) {
    const scratch = element("div");
    scratch.append(safeFragment(html));
    if (scratch.textContent.trim() && clipboardEdit("insertHTML", scratch.innerHTML)) {
      markEdited(runtime, true);
      return;
    }
    if (!text) text = renderedText(runtime, scratch);
  }
  if (!text) return;
  text = text.replace(/\r\n?/g, "\n");
  if (!clipboardEdit("insertText", text)) {
    // WebKit can reject the editing command for a shadow-root selection.
    // Keep the pasted text at the stored caret even in that case.
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    restoreSelection(runtime, range);
  }
  markEdited(runtime, true);
}

function studioClipboardSource(runtime, text, html, token) {
  if (!runtime.writingClipboardRequest && !runtime.librarySourceRequests.size) return null;
  if (!token && html && html.length < 800000) {
    const template = element("template");
    template.innerHTML = html;
    const tags = template.content.querySelectorAll("[data-care-studio-source]");
    if (tags.length === 1) token = tags[0].getAttribute("data-care-studio-source");
  }
  if (!token || token.length > 100) return null;
  let packet;
  try {
    const stored = JSON.parse(sessionStorage.getItem("care-studio-source-clipboard-v1"));
    if (stored?.token !== token) return null;
    packet = stored.packet;
  } catch {
    return null;
  }
  const quoting = packet?.kind === "passage" && packet.mode === "passage-quote";
  if (!writingSearchKinds.has(packet?.kind) || (!quoting && packet.mode !== "reference") ||
      !packet.request || (packet.request !== runtime.writingClipboardRequest && !runtime.librarySourceRequests.has(packet.request)) ||
      typeof packet.id !== "string" || !packet.id || packet.id.length > 300 ||
      typeof packet.work_id !== "string" || !packet.work_id || packet.work_id.length > 300 ||
      typeof packet.source_text !== "string" || !packet.source_text.trim() ||
      packet.source_text.length > 2000000) return null;
  if (quoting) {
    if (typeof packet.quote !== "string" || !packet.quote || packet.quote.length > studioReferenceSelectionLimit - 2 ||
        packet.quote !== packet.quote.trim() || packet.text !== packet.quote ||
        text.replace(/\r\n?/g, "\n") !== packet.quote ||
        !packet.source_text.replace(/\s+/g, " ").includes(packet.quote.replace(/\s+/g, " "))) return null;
  } else if (packet.text !== packet.id || text !== packet.id) return null;
  const {kind, id, work_id, mode, source_text, source_version, request} = packet;
  const source = {kind, id, work_id, mode, source_text, request};
  if (quoting) source.quote = packet.quote;
  if (typeof source_version === "string" && source_version) source.source_version = source_version;
  return source;
}

function citationPoint(runtime, range) {
  const {paper} = runtime;
  const {endContainer: node, endOffset: offset} = range;
  const next = blockAtBoundary(paper, node, offset, false);
  const block = next || blockAtBoundary(paper, node, offset, true);
  if (!block?.dataset.blockId) return null;
  const position = offsetInBlock(block, node, offset, !next);
  return {
    blockId: block.dataset.blockId,
    selection: {start: position, end: position, end_block_id: block.dataset.blockId, text: ""},
  };
}

function insertCitedClipboard(runtime, target, source) {
  if (!currentClipboardTarget(runtime, target) || runtime.paper.contentEditable !== "true") return;
  if (source.mode === "passage-quote") return insertSourceQuotation(runtime, target, source);
  if (runtime.queued && runtime.queued.type !== "scan") {
    status(runtime, "Wait for the current draft action, then paste the reference again.", true);
    return;
  }
  const range = restoreSelection(runtime, target.range).cloneRange();
  const anchor = passageSelection(runtime, range, studioReferenceSelectionLimit) || citationPoint(runtime, range);
  range.collapse(false);
  restoreSelection(runtime, range);
  if (anchor) {
    runtime.pastedFootnoteCaret = {documentId: runtime.docId, range, spaces: ""};
    send(runtime, "paste-cited", {source, block_id: anchor.blockId, selection: anchor.selection});
  } else status(runtime, "Place the cursor in a paragraph to paste a Library reference.", true);
}

function insertSourceQuotation(runtime, target, source) {
  if (runtime.pending || (runtime.queued && !["scan", "scan-deeper"].includes(runtime.queued.type))) {
    status(runtime, "Wait for the current draft save, then paste the quotation again.", true);
    return;
  }
  const range = restoreSelection(runtime, target.range).cloneRange();
  if (selectedFootnotes(runtime.paper, range).length) {
    status(runtime, "Place the cursor beside the existing footnotes to paste this quotation.", true);
    return;
  }
  const before = writingClipboardState(runtime);
  try {
    runtime.applyingClipboard = true;
    const quotation = document.createTextNode("‘" + source.quote + "’");
    range.deleteContents();
    range.insertNode(quotation);
    normalizeBlocks(runtime.paper, runtime.blocks);
    runtime.blocks = new Map([...runtime.paper.children].map(block => [block.dataset.blockId, blockText(block)]));
    range.selectNodeContents(quotation);
    const anchor = passageSelection(runtime, range, studioReferenceSelectionLimit);
    if (!anchor) throw new Error("Place the cursor in a paragraph to paste this quotation.");
    range.collapse(false);
    restoreSelection(runtime, range);
    runtime.snapshot = null;
    rememberSelection(runtime);
    runtime.sourceQuoteEdit = {before, after: {
      ...capture(runtime), bookmark: writingHistoryBookmark(runtime, range), positions: writingHistoryPositions(runtime),
    }};
    runtime.pastedFootnoteCaret = {documentId: runtime.docId, range: range.cloneRange(), spaces: ""};
    runtime.queued = null;
    send(runtime, "paste-cited", {source, block_id: anchor.blockId, selection: anchor.selection});
  } catch (error) {
    runtime.sourceQuoteEdit = null;
    runtime.pastedFootnoteCaret = null;
    restoreWritingClipboard(runtime, before);
    status(runtime, error.message || "CARE could not paste this quotation. Try again.", true);
  } finally { runtime.applyingClipboard = false; }
}

function pasteClipboard(runtime, target, text, html = "", metadata = "", fragmentMetadata = "") {
  const fragment = studioClipboardFragment(text, html, fragmentMetadata);
  if (fragment) return insertWritingFragment(runtime, target, fragment);
  const source = studioClipboardSource(runtime, text, html, metadata);
  if (source) insertCitedClipboard(runtime, target, source);
  else insertClipboard(runtime, target, text, html);
}

function paste(runtime, event) {
  const clipboard = event.clipboardData;
  if (!clipboard) return;
  event.preventDefault();
  pasteClipboard(runtime, clipboardTarget(runtime),
    clipboard.getData("text/plain"), clipboard.getData("text/html"), clipboard.getData(studioSourceMime), clipboard.getData(studioFragmentMime));
}

async function pasteFromMenu(runtime) {
  const target = clipboardTarget(runtime);
  if (!currentClipboardTarget(runtime, target) || runtime.paper.contentEditable !== "true") return;
  let text = "", html = "", metadata = "", fragment = "";
  {
    try {
      const items = await navigator.clipboard.read();
      const item = items.find(item => item.types.includes("text/plain"));
      if (item) {
        const read = async type => item.types.includes(type) ? (await item.getType(type)).text() : "";
        [text, html, metadata, fragment] = await Promise.all([
          read("text/plain"), read("text/html").catch(() => ""),
          read(item.types.includes(studioSourceMime) ? studioSourceMime : "web " + studioSourceMime).catch(() => ""),
          read(item.types.includes(studioFragmentMime) ? studioFragmentMime : "web " + studioFragmentMime).catch(() => ""),
        ]);
      }
    } catch {
      // Native paste in the dialog can still read the source data.
    }
  }
  if (text) {
    const copied = studioClipboardFragment(text, html, fragment);
    if (copied) return insertWritingFragment(runtime, target, copied);
    const source = studioClipboardSource(runtime, text, html, metadata);
    if (source) insertCitedClipboard(runtime, target, source);
    else insertClipboard(runtime, target, text);
    return;
  }
  try {
    text = await navigator.clipboard.readText();
  } catch {
    // The explicit paste gesture in the dialog works without clipboard read access.
  }
  if (text) insertClipboard(runtime, target, text);
  else showClipboardDialog(runtime, target, "paste");
}

function setup(root, api) {
  const get = selector => root.querySelector(selector);
  const drawerTools = get("#care-writing-drawer-tools");
  const drawerToolsToggle = get('[data-action="drawer-tools"]');
  const drawerToolsOpen = () => drawerToolsToggle.getAttribute("aria-expanded") === "true";
  const setDrawerTools = open => drawerToolsToggle.setAttribute("aria-expanded", String(open));
  const searchSettings = preferredWritingSearchSettings();
  const runtime = {
    root, api, docId: "", revision: 0, blocks: new Map(), references: [], footnoteNotes: new Map(), clipboardEpoch: 0,
    librarySourceRequests: new Set(),
    activePane: "", activeResearchTab: "suggestions", formattingOpen: false, focus: false,
    continuous: false, controller: new AbortController(),
    workspace: get("[data-workspace]"), empty: get("[data-empty]"), emptyStatus: get("[data-empty-status]"),
    select: get("[data-documents]"), drawerDraftLabel: get("[data-drawer-draft-label]"),
    title: get("[data-title]"), paper: get("[data-paper]"),
    status: get("[data-status]"), count: get("[data-count]"), format: get("[data-format]"),
    alignment: get("[data-alignment]"),
    fontFamily: get("[data-font-family]"), fontSize: get("[data-font-size]"),
    panel: get("[data-research]"), suggestionPane: get("[data-suggestions]"), referencePane: get("[data-references]"),
    readingPane: get("[data-reading]"), readingContent: get("[data-reading-content]"),
    libraryDock: get("[data-library-dock]"), libraryFrame: get("[data-library-frame]"),
    libraryLoading: get("[data-library-loading]"), libraryExpanded: false,
    libraryResume: get('[data-action="resume-library"]'),
    historyPane: get("[data-history]"), historyList: get("[data-history-list]"), historyKind: "axioms", historyRequested: new Set(),
    footnotes: get("[data-footnotes]"), footnoteList: get("[data-footnote-list]"),
    footnoteModeButton: get("[data-footnote-mode]"),
    navigator: get("[data-writing-navigator]"), outline: get("[data-outline]"), outlineList: get("[data-outline-list]"),
    outlineDisclosure: get("[data-outline-disclosure]"), formatting: get("[data-formatting]"),
    formatLauncher: get('[data-action="open-formatting"]'),
    query: get("[data-query]"), live: get("[data-live]"), anchor: get("[data-anchor]"), results: get("[data-results]"),
    searchStatus: get("[data-search-status]"), searchKind: "axiom", suggestionKind: "axiom", suggestions: [],
    bookmarkStatus: get("[data-suggestion-bookmark-status]"), savedAxiomIds: new Set(),
    searchMode: searchSettings.mode, searchScope: searchSettings.scope, searchWorkId: "",
    searchBooks: [], searchBookId: searchSettings.book_id || "",
    searchModeSelect: get("[data-search-mode]"), searchScopeSelect: get("[data-search-scope]"),
    searchSettingSummary: get("[data-search-setting-summary]"), searchSettingHelp: get("[data-search-setting-help]"),
    searchSettingsDetails: get("[data-search-settings]"), searchSubmit: get("[data-search-submit]"),
    searchHint: get("[data-search-hint]"), searchBookPicker: get("[data-search-book-picker]"),
    searchBookFilter: get("[data-search-book-filter]"), searchBookSelect: get("[data-search-book]"),
    searchBookStatus: get("[data-search-book-status]"),
    draftReviewPane: get("[data-draft-review-pane]"), draftReviewModelSelect: get("[data-draft-review-model]"),
    draftReviewButton: get('[data-action="review-draft"]'), draftReviewPollButton: get('[data-action="review-poll"]'),
    draftReviewStatus: get("[data-draft-review-status]"), draftReviewRevision: get("[data-draft-review-revision]"),
    draftReviewFindings: get("[data-draft-review-findings]"), reviewModels: [], draftReview: null,
    searchDeeper: get("[data-search-deeper]"), searchDeeperButton: get('[data-action="scan-deeper"]'),
    searchDepthStatus: get("[data-search-depth-status]"),
    refCount: get("[data-ref-count]"), referenceList: get("[data-reference-list]"),
    clipboardDialog: get("[data-clipboard-dialog]"), clipboardField: get("[data-clipboard-field]"),
  };
  installWritingA4(runtime);
  installWritingSelection(runtime);
  installWritingSelectAll(runtime);
  installFootnoteMode(runtime);
  installFootnoteNotes(runtime);
  installFootnoteFocusReturn(runtime);
  installWritingSearchScroll(runtime);
  function on(node, name, handler) {
    node.addEventListener(name, handler, {signal: runtime.controller.signal});
  }
  // Confirm that a native edit changed only one text node before skipping the
  // structural cleanup. Browsers can also emit insertText for DOM rewrites.
  let nativeTextEdit = null;
  let nativeTextRecords = [];
  const nativeTextObserver = new MutationObserver(records => { nativeTextRecords.push(...records); });
  function finishNativeTextEdit(inputType) {
    if (!nativeTextEdit) return;
    const records = nativeTextRecords.concat(nativeTextObserver.takeRecords());
    nativeTextObserver.disconnect();
    const edit = nativeTextEdit;
    nativeTextEdit = null;
    nativeTextRecords = [];
    if (edit.inputType !== inputType) return;
    const isolated = records.length && records.every(record => record.type === "characterData" && record.target === edit.node);
    return {typing: true, textBlock: isolated ? edit.block : null};
  }
  runtime.controller.signal.addEventListener("abort", () => nativeTextObserver.disconnect(), {once: true});
  on(runtime.paper, "beforeinput", event => {
    finishNativeTextEdit();
    if (runtime.applyingClipboard) return;
    if (editFootnoteAtCaret(runtime, event)) return;
    const native = footnoteNativeEditRange(runtime.paper, event);
    const authoredSelection = writingSelectionRange(runtime.paper);
    if (!event.defaultPrevented && !event.isComposing && !runtime.composing && event.cancelable &&
        runtime.paper.contentEditable === "true" && /^(insertText|insertParagraph|insertLineBreak)$/.test(event.inputType)) {
      const {inputType, data} = event;
      const selection = authoredSelection || native;
      let handled = false;
      if (selection?.collapsed) {
        handled = inputType === "insertText" ?
          data && insertWritingBoundaryText(runtime, data, selection) : insertWritingFootnoteBreak(runtime, inputType, selection);
      } else if (selection) {
        const whole = writingWholeFootnotes(selection);
        handled = whole !== selection && replaceWritingFootnoteSelection(runtime, inputType, data, selection, whole);
      }
      if (handled) {
        event.preventDefault();
        return;
      }
    }
    const backspaceCaret = writingBackspaceCaret(runtime, event, authoredSelection, native);
    runtime.backspaceCaret = backspaceCaret;
    if (backspaceCaret) setTimeout(() => {
      if (runtime.backspaceCaret === backspaceCaret) runtime.backspaceCaret = null;
    }, 0);
    const bookmark = authoredSelection || native?.cloneRange();
    if (!authoredSelection && bookmark && event.inputType?.startsWith("delete")) {
      bookmark.collapse(!event.inputType.endsWith("Backward"));
    }
    writingHistoryBeforeInput(runtime, event, bookmark || runtime.range);
    if (event.defaultPrevented || runtime.composing || event.isComposing ||
        !/^(delete|insert)/.test(event.inputType || "")) return;
    const caret = authoredSelection || native;
    const node = caret?.startContainer;
    const plainTextEdit = writingHistoryGroupedEdits.has(event.inputType) && caret?.collapsed &&
      node.nodeType === Node.TEXT_NODE && !node.parentElement.closest(writingSelectionWidget) &&
      (event.inputType === "insertText" || native?.startContainer === node && native.endContainer === node);
    const block = plainTextEdit && topBlock(runtime.paper, node);
    if (block?.dataset.blockId && runtime.blocks.has(block.dataset.blockId) && !backspaceCaret) {
      nativeTextEdit = {inputType: event.inputType, node, block};
      nativeTextObserver.observe(runtime.paper, {characterData: true, childList: true, attributes: true, subtree: true});
    }
    const selectionRange = authoredSelection && !authoredSelection.collapsed ? authoredSelection : native || authoredSelection;
    const range = selectionRange && writingWholeFootnotes(selectionRange);
    if ((!range || range.collapsed) && !backspaceCaret) return;
    const identities = range && !range.collapsed ?
      selectedFootnotes(runtime.paper, range).map(marker => marker.dataset.writingFootnote) : [];
    if (identities.length && !canChangeFootnotes(runtime) && event.cancelable) {
      event.preventDefault();
      return;
    }
    const joining = native && event.inputType.startsWith("delete") &&
      footnoteParagraphJoin(runtime.paper, range, authoredSelection);
    const selection = joining || backspaceCaret ?
      {identities: [], preserved: [...new Set([...identities, ...(backspaceCaret?.preserved || [])])]} : {identities};
    runtime.selectedFootnotes = selection;
    setTimeout(() => {
      if (runtime.selectedFootnotes === selection) runtime.selectedFootnotes = null;
    }, 0);
  });
  on(runtime.paper, "input", event => {
    const nativeEdit = finishNativeTextEdit(event.inputType);
    if (runtime.applyingClipboard) return;
    if (writingHistoryInput(runtime, event)) return;
    if (!event.isComposing && !runtime.composing && !runtime.applyingStarter) {
      const selection = runtime.selectedFootnotes;
      runtime.selectedFootnotes = null;
      const backspaceCaret = runtime.backspaceCaret;
      runtime.backspaceCaret = null;
      const removed = nativeEdit?.textBlock ? [] : removedByNativeFootnoteEdit(runtime, event.inputType, selection);
      const removed_footnotes = removed.length && canChangeFootnotes(runtime) && omitFootnotes(runtime, removed);
      markEdited(runtime, true, removed_footnotes || [], backspaceCaret,
        event.inputType?.startsWith("insert") ? "insert" : true, removed_footnotes ? undefined : nativeEdit);
      if (removed_footnotes) {
        paintReferences(runtime);
        send(runtime, "delete-footnotes", {removed_footnotes});
      }
      noteTyping(runtime, event.isTrusted && /^(insertText|insertParagraph|insertLineBreak|insertReplacementText|deleteContentBackward|deleteContentForward)$/.test(event.inputType));
    }
  });
  on(runtime.paper, "keydown", event => {
    if (editFootnoteAtCaret(runtime, event) || writingHistoryKey(runtime, event) ||
        tabInWriting(runtime, event) || writingFormatShortcut(runtime, event)) return;
    if (applyParagraphStarter(runtime, event) || event.defaultPrevented || !event.cancelable || event.isComposing ||
        runtime.composing || event.altKey || event.metaKey || event.ctrlKey) return;
    // Tab-focused citation links keep their keyboard activation. A prose
    // caret near the same superscript should keep editing the manuscript.
    if (runtime.paper.getRootNode().activeElement?.matches?.(inlineFootnote)) return;
    if (event.key === "Enter" &&
        insertWritingFootnoteBreak(runtime, event.shiftKey ? "insertLineBreak" : "insertParagraph")) event.preventDefault();
    if (event.key === " " && insertWritingBoundaryText(runtime, " ")) event.preventDefault();
  });
  on(runtime.paper, "click", event => {
    runtime.clickedA4Gap = clickedWritingA4Gap(runtime, event);
  });
  on(runtime.title, "input", () => markEdited(runtime));
  on(runtime.title, "keydown", event => {
    if (event.key !== "Enter" || event.isComposing || runtime.title.readOnly) return;
    event.preventDefault();
    restoreSelection(runtime);
  });
  on(runtime.paper, "compositionstart", () => {
    const selection = writingSelectionRange(runtime.paper);
    const whole = selection && writingWholeFootnotes(selection);
    if (whole && whole !== selection) restoreSelection(runtime, whole);
    beginWritingEdit(runtime, "composition");
    runtime.composing = true;
    cancelWritingFormatDismissal(runtime);
    if (runtime.binder) cancelWritingBinderDismissal(runtime);
    clearTimeout(runtime.saveTimer);
    clearTimeout(runtime.paperSummaryTimer);
  });
  on(runtime.paper, "compositionend", event => {
    runtime.composing = false;
    markEdited(runtime, true, [], null, "insert");
    noteTyping(runtime, event.isTrusted && Boolean(event.data));
  });
  on(runtime.paper, "paste", event => paste(runtime, event));
  on(runtime.root, "copy", event => nativeWritingClipboard(runtime, event));
  on(runtime.root, "cut", event => nativeWritingClipboard(runtime, event, true));
  on(window, "message", event => handleLibraryFrameMessage(runtime, event));
  if (runtime.historyPane) on(runtime.historyPane, "scroll", () => {
    const pane = runtime.historyPane;
    if (pane.scrollHeight - pane.scrollTop - pane.clientHeight < 180) loadHistoryText(runtime);
  });
  on(runtime.clipboardDialog, "submit", event => {
    event.preventDefault();
    const target = runtime.clipboardTarget;
    const text = runtime.clipboardField.value;
    runtime.clipboardDialog.close();
    if (target) insertClipboard(runtime, target, text);
  });
  on(runtime.clipboardField, "paste", event => {
    const clipboard = event.clipboardData;
    const target = runtime.clipboardTarget;
    if (!clipboard || !target || runtime.clipboardField.readOnly) return;
    const source = studioClipboardSource(runtime,
      clipboard.getData("text/plain"), clipboard.getData("text/html"), clipboard.getData(studioSourceMime), clipboard.getData(studioFragmentMime));
    if (!source) return;
    event.preventDefault();
    runtime.clipboardTarget = null;
    runtime.clipboardDialog.close();
    insertCitedClipboard(runtime, target, source);
  });
  on(runtime.clipboardDialog, "close", () => {
    const target = runtime.clipboardTarget;
    runtime.clipboardTarget = null;
    runtime.clipboardField.value = "";
    if (target && currentClipboardTarget(runtime, target) && !runtime.paper.matches(":focus")) {
      restoreSelection(runtime, target.range);
    }
  });
  // Pasted and dropped markup must both pass through the editor allowlist.
  on(runtime.paper, "drop", event => {
    if (dropFootnote(runtime, event)) return;
    if (event.dataTransfer?.types.includes("text/html") || event.dataTransfer?.files.length) event.preventDefault();
  });
  on(runtime.paper, "dragstart", event => {
    const selection = writingSelectionRange(runtime.paper);
    if (runtime.footnotePointerDragging || event.target.closest?.(inlineFootnote) ||
        (selection && selectedFootnotes(runtime.paper, writingWholeFootnotes(selection)).length)) event.preventDefault();
  });
  on(runtime.paper, "dragover", event => {
    if (!runtime.draggingFootnote) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });
  on(runtime.paper, "dragend", () => { runtime.draggingFootnote = null; });
  installFootnotePointerDrag(runtime);
  const rememberNativeSelection = () => rememberSelection(runtime,
    runtime.paper.dataset.empty === undefined ? undefined : runtime.paper.dataset.empty === "false");
  for (const event of ["pointerup", "keyup", "focus"]) on(runtime.paper, event, rememberNativeSelection);
  on(document, "selectionchange", rememberNativeSelection);
  on(window, "care-workspace-before-navigation", event => {
    if (typeof event.detail?.resume === "function" && holdNavigation(runtime, event.detail.resume)) event.preventDefault();
  });
  on(window, "care-writing-binder-selection-request", () => reportWritingBinderSelection(runtime));
  on(window, "care-writing-file-command", event => {
    if (runtime.compact || !root.isConnected) return;
    const command = event.detail?.command;
    if (command === "copy") return void copyText(runtime);
    if (command === "copy-cited") return void copyWritingWithFootnotes(runtime);
    if (command === "paste") return void pasteFromMenu(runtime);
    if (command === "binder") return toggleWritingBinder(runtime);
    if (command === "select-drafts") return openWritingBinder(runtime);
    if (command === "select-draft" && typeof event.detail.target_id === "string" && runtime.binder) {
      const id = event.detail.target_id;
      openWritingBinder(runtime, false);
      return setWritingBinderDraft(runtime, id, !runtime.binder.order.includes(id));
    }
    if (command === "find") {
      if (!requestWritingFind(runtime)) openWritingFind(runtime);
      return;
    }
    if (command === "format" || command === "footnote-style") return openWritingFormatting(runtime, command === "footnote-style");
    if (command === "manual-footnote") return insertManualFootnote(runtime);
    if (command === "open-recent" && typeof event.detail.target_id === "string") {
      return send(runtime, "open", {target_id: event.detail.target_id});
    }
    if (!["new", "files", "import", "save", "export", "peer-review-import", "open-care-reader", "remote-share", "remote-review-request", "remote-connect"].includes(command)) return;
    if (command === "new") {
      runtime.focusNewDraft = true;
      const folder = event.detail.folder_id;
      return send(runtime, "new", typeof folder === "string" && folder ? {folder_id: folder} : {});
    }
    if (command === "open-care-reader") {
      event.preventDefault();
      const {reader_choice, reader_target} = event.detail;
      if (reader_choice === "current" && runtime.a4?.well) {
        const well = runtime.a4.well;
        rememberWritingModePosition(window, "reader", runtime.docId, well, runtime.paper.children, "data-block-id",
          well.getBoundingClientRect().top + writingViewportInset(well));
      }
      return send(runtime, command, {reader_choice, reader_target});
    }
    send(runtime, command);
  });
  document.addEventListener("click", event => {
    if (!root.isConnected || runtime.replayingNavigation) return;
    const target = event.target.closest?.(shellNavigation);
    if (!target) return;
    if (target.matches(".st-key-care_study_library button") && setLibraryMinimized(runtime, false)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const selector = shellNavigation.split(",").find(option => target.matches(option));
    const resume = () => {
      runtime.replayingNavigation = true;
      try {
        document.querySelector(selector)?.click();
      } finally {
        runtime.replayingNavigation = false;
      }
    };
    if (holdNavigation(runtime, resume)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, {capture: true, signal: runtime.controller.signal});
  on(document, "keydown", event => {
    if (root.isConnected && deletePrintedFootnoteSelection(runtime, event)) return;
    if (event.defaultPrevented || event.key !== "Escape" || event.isComposing ||
        runtime.compact || !root.isConnected || runtime.clipboardDialog.open || document.querySelector('[role="dialog"]')) return;
    event.preventDefault();
    if (runtime.libraryExpanded && !runtime.libraryMinimized) setLibraryExpanded(runtime, false)?.focus();
    else if (!runtime.peerReview?.close()) togglePane(runtime, "research");
  });
  on(window, "beforeunload", event => {
    if (!root.isConnected || !runtime.docId || (runtime.collaboration ? !writingSharedDirty(runtime.collaboration) :
      same(capture(runtime), runtime.base))) return;
    event.preventDefault();
    event.returnValue = "";
  });
  on(runtime.paper, "focusout", () => scheduleSave(runtime, 0));
  on(runtime.paper, "focusin", () => {
    if (!runtime.narrowFormat) return;
    scheduleWritingFormatDismissal(runtime);
    if (runtime.binder) scheduleWritingBinderDismissal(runtime);
  });
  on(runtime.title, "focusout", () => scheduleSave(runtime, 0));
  on(runtime.select, "change", () => {
    const targetId = runtime.select.value;
    runtime.select.value = runtime.docId;
    if (!targetId || targetId === runtime.docId) return;
    if (runtime.compact) setDrawerTools(false);
    send(runtime, "open", {target_id: targetId});
  });
  on(runtime.formatting, "pointerdown", () => {
    cancelWritingFormatDismissal(runtime);
    rememberSelection(runtime);
  });
  on(runtime.formatLauncher, "pointerdown", () => rememberSelection(runtime));
  on(runtime.formatting, "focusin", () => cancelWritingFormatDismissal(runtime));
  on(runtime.format, "change", () => formatText(runtime, "formatBlock", runtime.format.value));
  on(runtime.alignment, "change", () => formatText(runtime, "align", runtime.alignment.value));
  on(runtime.fontFamily, "change", () => formatText(runtime, "fontFamily", runtime.fontFamily.value));
  on(runtime.fontSize, "change", () => formatText(runtime, "fontSize", runtime.fontSize.value));
  on(runtime.fontSize, "keydown", event => {
    if (event.key !== "Enter" || event.isComposing || !runtime.fontSize.validity.valid) return;
    event.preventDefault();
    formatText(runtime, "fontSize", runtime.fontSize.value);
  });
  on(get("[data-search-form]"), "submit", event => {
    event.preventDefault();
    scan(runtime, "query");
  });
  on(runtime.searchModeSelect, "change", () => chooseWritingSearchSettings(runtime));
  on(runtime.searchScopeSelect, "change", () => chooseWritingSearchSettings(runtime));
  on(runtime.searchBookFilter, "input", () => paintWritingSearchBooks(runtime));
  on(runtime.searchBookSelect, "change", () => chooseWritingSearchBook(runtime));
  on(runtime.draftReviewModelSelect, "change", () => paintDraftReview(runtime));
  on(runtime.live, "change", () => {
    if (!runtime.live.checked) clearTimeout(runtime.scanTimer);
    else scan(runtime, "passage", true);
  });
  document.addEventListener("pointerdown", event => {
    if (runtime.compact && drawerToolsOpen() && !event.composedPath().includes(root.getRootNode().host || root)) {
      setDrawerTools(false);
    }
  }, {capture: true, signal: runtime.controller.signal});
  on(root, "pointerdown", event => {
    runtime.clickedA4Gap = false;
    const marker = event.target.closest(inlineFootnote);
    if (marker && (event.metaKey || event.ctrlKey || event.altKey)) event.preventDefault();
    if (runtime.compact && drawerToolsOpen() &&
        !drawerTools.contains(event.target) && !drawerToolsToggle.contains(event.target)) setDrawerTools(false);
    if (runtime.formatMore?.open && !runtime.formatMore.contains(event.target)) runtime.formatMore.open = false;
    if (!runtime.compact && !runtime.outlineWide && runtime.outlineDisclosure.open &&
        !runtime.navigator.contains(event.target)) runtime.outlineDisclosure.open = false;
    if (event.target.closest('[data-command], [data-link-passage], [data-action="manual-footnote"]')) event.preventDefault();
  });
  on(root, "keydown", event => {
    if (runtime.clipboardDialog.contains(event.target)) return;
    if (runtime.compact && event.target === runtime.select && event.key === "Escape") return;
    const printed = event.target.closest(printedFootnoteSelector);
    if (printed && writingHistoryKey(runtime, event)) return;
    if (printed && event.key === "Enter") {
      event.preventDefault();
      openFootnote(runtime, printed.dataset.openPrintedFootnote);
      return;
    }
    if (deletePrintedFootnoteSelection(runtime, event, printed)) return;
    const note = event.target.closest(footnoteNoteSelector);
    if (note && editFootnoteNoteAtCaret(runtime, note, event)) return;
    const footnote = event.target.closest("[data-writing-footnote]");
    if (footnote && !event.defaultPrevented && ["Enter", " "].includes(event.key) &&
        runtime.paper.getRootNode().activeElement === footnote) {
      event.preventDefault();
      openFootnote(runtime, footnote.dataset.writingFootnote);
      return;
    }
    if (writingSaveShortcut(runtime, event)) return;
    if (event.key === "Escape" && !event.isComposing) {
      if (runtime.compact && drawerToolsOpen()) {
        event.preventDefault();
        setDrawerTools(false);
        drawerToolsToggle.focus();
      } else if (runtime.compact && runtime.libraryRequest) {
        event.preventDefault();
        send(runtime, "library-close");
      } else if (!runtime.compact && runtime.outline.contains(event.target)) {
        event.preventDefault();
        runtime.outlineDisclosure.open = false;
        runtime.outlineDisclosure.querySelector("summary").focus();
      } else if (runtime.panel.contains(event.target) || runtime.outline.contains(event.target)) {
        event.preventDefault();
        togglePane(runtime, runtime.activePane);
        (runtime.compact ? drawerToolsToggle : get('[data-action="peek-research"]'))?.focus();
      } else if (runtime.focus) {
        event.preventDefault();
        runtime.focus = false;
        renderPanel(runtime);
      } else if (runtime.formatting.contains(event.target)) {
        event.preventDefault();
        if (runtime.formatMore?.open) {
          runtime.formatMore.open = false;
          runtime.formatMore.querySelector("summary").focus();
        } else closeWritingFormatting(runtime);
      }
    }
  });
  on(root, "click", event => {
    const pageNote = event.target.closest(printedFootnoteSelector);
    if (pageNote) {
      if (!selectedPrintedFootnotes(runtime).includes(pageNote.dataset.openPrintedFootnote)) {
        openFootnote(runtime, pageNote.dataset.openPrintedFootnote);
      }
      return;
    }
    const footnote = event.target.closest("[data-writing-footnote]");
    if (footnote) {
      if (event.metaKey || event.ctrlKey || event.detail === 0) {
        event.preventDefault();
        openFootnote(runtime, footnote.dataset.writingFootnote);
      } else if (event.detail === 1 && !event.altKey && !event.shiftKey &&
          runtime.paper.contentEditable === "true" && writingSelectionRange(runtime.paper)?.collapsed !== false) {
        const {left, right} = footnote.getBoundingClientRect();
        const rtl = getComputedStyle(footnote).direction === "rtl";
        restoreSelection(runtime, footnoteBoundary(footnote, (event.clientX >= (left + right) / 2) !== rtl));
        rememberSelection(runtime);
      }
      return;
    }
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.tab) selectTab(runtime, button.dataset.tab);
    if (button.dataset.historyKind) chooseHistoryKind(runtime, button.dataset.historyKind);
    if (button.dataset.searchKind) chooseWritingSearchKind(runtime, button.dataset.searchKind);
    if (button.dataset.command) formatText(runtime, button.dataset.command);
    const action = button.dataset.action;
    if (action === "manual-footnote") insertManualFootnote(runtime);
    if (action === "drawer-tools") {
      setDrawerTools(!drawerToolsOpen());
      return;
    }
    if (action === "new") {
      runtime.focusNewDraft = true;
      if (runtime.compact) setDrawerTools(false);
    }
    if (["save", "open", "close", "new", "studio", "files"].includes(action)) send(runtime, action);
    if (action === "reload" && (same(capture(runtime), runtime.base) || window.confirm("Reload the saved document and discard unsaved edits in this editor?"))) send(runtime, "reload");
    if (action === "copy") void copyText(runtime);
    if (action === "paste") void pasteFromMenu(runtime);
    if (action === "clipboard-close") runtime.clipboardDialog.close();
    if (action === "scan-passage") scan(runtime, "passage");
    if (action === "scan-draft") scan(runtime, "document");
    if (action === "scan-deeper") deepenWritingSearch(runtime);
    if (action === "focus") {
      runtime.focus = !runtime.focus;
      renderPanel(runtime);
      if (runtime.focus) restoreSelection(runtime);
    }
    if (action === "formatting") {
      if (runtime.compact) setDrawerTools(false);
      if (runtime.formattingOpen && !runtime.focus && !runtime.formatting.inert) closeWritingFormatting(runtime);
      else openWritingFormatting(runtime);
    }
    if (action === "open-formatting") openWritingFormatting(runtime);
    if (action === "close-formatting") closeWritingFormatting(runtime);
    if (action === "collaborate") send(runtime, "remote-connect");
    if (action === "ribbon-find" && !requestWritingFind(runtime)) openWritingFind(runtime);
    if (action === "ribbon-export") send(runtime, "export");
    if (action === "select-all-text") selectWritingDocument(runtime);
    if (action === "layout") {
      rememberSelection(runtime);
      runtime.continuous = !runtime.continuous;
      try {
        localStorage.setItem("care-writing-layout", runtime.continuous ? "continuous" : "paper");
      } catch {
        // The current editor can still switch layouts when preferences are blocked.
      }
      renderLayout(runtime, true);
      const range = runtime.range;
      if (rangeInPaper(runtime.paper, range)) {
        const origin = range.getClientRects()[0];
        if (origin) scrollWritingA4Context(runtime.a4.well, origin);
      }
    }
    if (action === "panel") togglePane(runtime, "research");
    if (action === "peek-research") togglePane(runtime, "research");
    if (action === "history-library" || action === "library-shelf") {
      if (action === "history-library" && setLibraryMinimized(runtime, false)) return;
      send(runtime, "history-open", {kind: "library", beside: !runtime.compact});
    }
    if (action === "review-draft") reviewWritingDraft(runtime);
    if (action === "review-poll") pollWritingDraftReview(runtime);
    if (action === "minimize-library") setLibraryMinimized(runtime, true);
    if (action === "resume-library") setLibraryMinimized(runtime, false);
    if (action === "close-library") send(runtime, "library-close");
    if (action === "library-full") send(runtime, "library-full", {route: libraryLocation(runtime)});
    if (action === "compact-axiom") send(runtime, "compact-axiom");
    if (action === "studio-axiom-return") send(runtime, "studio-axiom-return");
    if (action === "library-width") {
      setLibraryExpanded(runtime, !runtime.libraryExpanded);
    }
    if (action === "outline") togglePane(runtime, "outline");
    if (action === "close-panel" || action === "close-outline") {
      togglePane(runtime, runtime.activePane);
      (runtime.compact ? drawerToolsToggle : get('[data-action="peek-research"]'))?.focus();
    }
  });
  return runtime;
}

export default function(component) {
  const {parentElement, data, setTriggerValue} = component;
  const root = parentElement.querySelector("[data-writing-studio]");
  if (!root) return;
  let runtime = instances.get(root);
  if (!runtime) {
    runtime = setup(root, {setTriggerValue});
    runtime.compact = Boolean(data.compact);
    installWritingFormatBar(runtime);
    installWritingFind(runtime);
    installWritingScrollViewport(runtime);
    installWritingCollaboration(runtime);
    if (data.compact) {
      root.setAttribute("aria-label", "Write beside");
      const back = root.querySelector('[data-action="close-library"]');
      back.title = "Back to draft";
      back.setAttribute("aria-label", "Back to draft");
      for (const action of ["library-shelf", "library-width", "minimize-library"]) {
        root.querySelector(`[data-action="${action}"]`).hidden = true;
      }
    } else {
      installOutline(runtime);
      installWritingBinder(runtime);
      installWritingZoom(runtime);
      installWritingPeerReview(runtime);
      selectTab(runtime, "history");
      observeLibraryShell(runtime);
      try {
        runtime.continuous = localStorage.getItem("care-writing-layout") === "continuous";
      } catch {
        // Fall back to paper view.
      }
    }
    instances.set(root, runtime);
  }
  runtime.api = {setTriggerValue};
  updateWritingSearchBooks(runtime, data.search_books);
  updateWritingSearchWork(runtime, data.search_work_id || data.context?.work_id || "");
  runtime.writingClipboardRequest = data.compact ? data.writing_clipboard_request || "" : "";
  const incoming = data.document || null;
  const incomingId = String(incoming?.id || "");
  // A selected shared row can stay in the Binder while its draft is unavailable.
  runtime.selectedDraftId = String(data.selected_id || incomingId);
  const changedDocument = runtime.docId !== incomingId;
  if (changedDocument) {
    cancelWritingFormatDismissal(runtime);
    if (runtime.binder) cancelWritingBinderDismissal(runtime);
    runtime.formattingOpen = false;
    tuckWritingFormatBar(runtime, false);
  }
  const shared = writingSharedDocument(incomingId);
  root.toggleAttribute("data-shared-draft", shared);
  if (changedDocument || !data.collaboration) stopWritingCollaboration(runtime);
  runtime.asyncSearch = Boolean(data.async_search);
  const acknowledgement = data.acknowledgement;
  const focusNewDraft = runtime.focusNewDraft && incomingId && changedDocument;
  if (focusNewDraft || acknowledgement?.error) runtime.focusNewDraft = false;
  const reloaded = onAck(runtime, acknowledgement, incoming);
  const newerSavedVersion = !shared && incoming && incoming.revision !== runtime.revision &&
    !runtime.pending && !runtime.error && same(capture(runtime), runtime.base);
  runtime.suggestionKind = data.search_kind === "passage" ? "passage" : "axiom";
  const contextSearchTarget = data.context?.target_key || "";
  const changedContext = contextSearchTarget !== (runtime.contextSearchTarget || "");
  if (changedDocument || reloaded || changedContext) runtime.searchKind = runtime.suggestionKind;
  if (changedContext && !changedDocument && !reloaded) {
    runtime.query.value = data.initial_query || "";
    runtime.hasSearched = Boolean(data.initial_query);
    runtime.lastScan = "";
    runtime.lastSearchScope = data.initial_query ? "query" : "";
  }
  runtime.contextSearchTarget = contextSearchTarget;
  if (changedDocument || reloaded || newerSavedVersion) {
    loadDocument(runtime, incoming, data.initial_block, data.initial_query, acknowledgement);
    // A remount may recover a save or reload that was already acknowledged.
    if (onAck(runtime, acknowledgement, incoming)) {
      loadDocument(runtime, incoming, data.initial_block, data.initial_query, acknowledgement);
    }
  }
  if (runtime.externalNavigation) {
    finishNavigation(runtime);
  } else if (runtime.queued && !runtime.pending) {
    const {type, extra} = runtime.queued;
    runtime.queued = null;
    send(runtime, type, extra);
  } else if (runtime.docId && !runtime.error && !same(capture(runtime), runtime.base) && !runtime.saveTimer) {
    scheduleSave(runtime);
  }
  const current = Boolean(incoming && incomingId);
  root.classList.toggle("no-document", !current);
  runtime.workspace.hidden = !current && runtime.compact;
  runtime.empty.hidden = current || !runtime.compact;
  if (!current) runtime.paper.contentEditable = "false";
  root.classList.toggle("compact", Boolean(data.compact));
  root.querySelector('[data-action="studio-axiom-return"]').hidden = !current || runtime.compact || !data.axiom_return_available;
  root.querySelector('[data-action="close"]').hidden = !data.compact;
  root.querySelector('[data-action="studio"]').hidden = !data.compact || !current;
  const drawerTools = root.querySelector('[data-action="drawer-tools"]');
  drawerTools.hidden = !data.compact;
  const layout = root.querySelector('[data-action="layout"]');
  if (layout) layout.hidden = Boolean(data.compact) || !current;
  const drawerReading = runtime.compact && Boolean(data.library_dock?.route && data.library_dock.request);
  drawerTools.disabled = !current || drawerReading;
  if (drawerTools.disabled) drawerTools.setAttribute("aria-expanded", "false");
  for (const action of ["focus", "panel", "outline", "formatting", "copy", "paste", "save"]) {
    const button = root.querySelector(`[data-action="${action}"]`);
    if (button) button.hidden = !current || drawerReading || (!runtime.compact && ["focus", "panel", "outline"].includes(action));
  }
  runtime.title.hidden = !current;
  const files = root.querySelector('[data-action="files"]');
  if (files) files.hidden = Boolean(data.compact);
  root.querySelector('[data-action="compact-axiom"]').hidden = !runtime.compact || !data.context?.target_key;
  if (!shared || !runtime.collaboration) {
    runtime.references = (data.references || []).filter(reference => !runtime.removingFootnotes?.has(reference.id));
    if (!shared) reconcileFootnoteNotes(runtime, data.references || []);
  }
  runtime.history = data.history || {};
  paintDocuments(runtime, data.documents || []);
  if (!runtime.compact) {
    runtime.showUnavailableArchive = data.show_unavailable_archive === true;
    paintWritingBinder(runtime, data.documents || [], data.folders || [], data.trash || [], acknowledgement, data.archived || []);
  }
  const matchingSearch = matchingWritingSearchSettings(runtime, data.search_progress);
  runtime.suggestions = matchingSearch ? data.suggestions || [] : [];
  runtime.savedAxiomIds = new Set(data.saved_axiom_ids || []);
  runtime.searchProgress = matchingSearch ? data.search_progress : null;
  if (matchingSearch && data.search_progress) runtime.searchSettingsChanged = false;
  paintResults(runtime);
  paintDraftReviewModels(runtime, data.review_models);
  paintDraftReview(runtime, data.draft_review || null);
  paintReferences(runtime);
  paintReading(runtime, data.reading);
  if (data.reading?.focus && ["read", "history-read"].includes(runtime.acknowledgedType) && !acknowledgement?.error) {
    rememberReading(data.reading.focus);
  }
  const pastedFootnote = runtime.acknowledgedType === "paste-cited";
  runtime.acknowledgedType = null;
  const initialReference = runtime.references.find(reference => reference.id === data.initial_reference);
  const initialBlock = initialReference?.block_id || data.initial_block;
  const jumpKey = [incomingId, initialBlock || "", data.initial_reference || "", data.context?.jump || ""].join(":");
  const jumpToReference = current && initialBlock && runtime.lastJump !== jumpKey;
  if (jumpToReference && !data.compact) {
    runtime.activePane = "research";
    selectTab(runtime, "references");
  } else if (changedDocument && !data.compact && data.reading?.focus) {
    runtime.activePane = "research";
    selectTab(runtime, "reading");
  }
  if (focusNewDraft && !data.compact) runtime.activePane = "";
  paintLibraryDock(runtime, data.library_dock);
  renderPanel(runtime);
  renderLayout(runtime);
  if (current) updatePaper(runtime);
  if (current && shared) startWritingCollaboration(runtime, data.collaboration, incoming);
  runtime.peerReview?.render(data.peer_reviews);
  if (pastedFootnote) restorePastedFootnoteCaret(runtime, acknowledgement);
  if (runtime.manualFootnoteFocus) {
    const claim = runtime.manualFootnoteFocus;
    runtime.manualFootnoteFocus = null;
    requestAnimationFrame(() => {
      if (runtime.docId === claim.documentId && runtime.root.isConnected && !runtime.pending) {
        focusManualFootnote(runtime, claim.identity);
      }
    });
  }
  if (jumpToReference) requestAnimationFrame(() => jump(runtime, initialBlock, initialReference));
  else if (focusNewDraft || (changedDocument && current && !runtime.compact)) {
    requestAnimationFrame(() => {
      const position = !focusNewDraft && takeWritingModePosition(window, "studio", incomingId);
      const well = runtime.a4?.well;
      if (position && well && runtime.docId === incomingId && root.isConnected) {
        refreshWritingA4(runtime, true);
        restoreWritingModePosition(position, well, findBlock(runtime, position.block),
          well.getBoundingClientRect().top + writingViewportInset(well));
        return;
      }
      if (focusNewDraft || !runtime.a4?.active) restoreSelection(runtime);
    });
  }
  if (runtime.compact && !revealWriteBeside(runtime, data.write_beside_nonce)) {
    requestAnimationFrame(() => revealWriteBeside(runtime, data.write_beside_nonce));
  }
  runtime.lastJump = jumpKey;
  component.setSnapshotReader?.(() => ({
    ...capture(runtime), footnote_positions: footnotePositions(runtime),
  }));
  return () => queueMicrotask(() => {
    if (root.isConnected) return;
    storeRecovery(runtime);
    clearTimeout(runtime.scanTimer);
    clearTimeout(runtime.searchPollTimer);
    clearTimeout(runtime.saveTimer);
    clearTimeout(runtime.highlightTimer);
    clearTimeout(runtime.typingTimer);
    cancelWritingFormatDismissal(runtime);
    if (runtime.binder) cancelWritingBinderDismissal(runtime);
    clearTimeout(runtime.paperSummaryTimer);
    finishLibraryFrame(runtime, runtime.libraryPending);
    runtime.shellObserver?.disconnect();
    runtime.controller.abort();
    instances.delete(root);
  });
}
