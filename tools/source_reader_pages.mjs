/* Fixed reading sheets measured at their logical size, independently of zoom. */

export function fittedPrefix(length, fits) {
  let low = 0, high = length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(middle)) low = middle;
    else high = middle - 1;
  }
  return low;
}

export function readableBoundary(text, limit) {
  let end = Math.min(text.length, Math.max(0, limit));
  if (end === text.length) return end;
  if (end > 0 && /[\uDC00-\uDFFF]/.test(text[end]) && /[\uD800-\uDBFF]/.test(text[end - 1])) end -= 1;
  const floor = Math.max(1, end - Math.min(180, Math.floor(end / 3)));
  for (let at = end; at > floor; at -= 1) {
    if (/\s/.test(text[at - 1])) return at;
  }
  return end;
}

const TEXT_BLOCK = 'p,h1,h2,h3,h4,h5,h6';

function textIndex(element, document) {
  const walker = document.createTreeWalker(element, 4);
  const nodes = [];
  let end = 0, previousBlock, span;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.length) continue;
    const start = end;
    end += node.length;
    const block = node.parentElement?.closest(TEXT_BLOCK);
    if (block !== previousBlock) {
      span = block ? { start, end } : null;
      previousBlock = block;
    }
    if (span) span.end = end;
    nodes.push({ node, start, end, span });
  }
  return nodes;
}

function indexedTextAt(nodes, offset, endBoundary) {
  let low = 0, high = nodes.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (nodes[middle].end < offset || (!endBoundary && nodes[middle].end === offset)) low = middle + 1;
    else high = middle;
  }
  return nodes[low];
}

export function sliceElement(element, start, end, document, nodes = textIndex(element, document)) {
  const part = element.cloneNode(false);
  if (!nodes.length || start === end) return part;
  const range = document.createRange();
  const first = indexedTextAt(nodes, start, false), last = indexedTextAt(nodes, end, true);
  range.setStart(first.node, start - first.start);
  range.setEnd(last.node, end - last.start);
  let contents = range.cloneContents();
  // A Range within one paragraph/link omits all of its surrounding elements.
  const ancestor = range.commonAncestorContainer;
  let wrapper = ancestor.nodeType === 1 ? ancestor : ancestor.parentElement;
  while (wrapper && wrapper !== element) {
    const copy = wrapper.cloneNode(false);
    copy.append(contents);
    contents = copy;
    wrapper = wrapper.parentElement;
  }
  part.append(contents);
  // Mark a break inside a block, even when the cut falls between nested links.
  // A cut between two original paragraphs keeps both paragraph boundaries.
  if (first.span && start > first.span.start) {
    const block = part.matches(TEXT_BLOCK) ? part : part.querySelector(TEXT_BLOCK);
    if (block) block.dataset.continuesFrom = '';
  }
  if (last.span && end < last.span.end) {
    const block = part.matches(TEXT_BLOCK) ? part : Array.from(part.querySelectorAll(TEXT_BLOCK)).at(-1);
    if (block) block.dataset.continuesTo = '';
  }
  if (start === 0) {
    const marker = element.querySelector(':scope > .passage-marker');
    if (marker) part.prepend(marker.cloneNode(true));
  }
  return part;
}

function readingSheet(document, kind, number) {
  const slot = document.createElement('div');
  slot.className = 'page-slot';
  slot.dataset.pageNumber = String(number);
  slot.style.width = 'var(--slot-width)';
  slot.style.height = 'var(--slot-height)';
  const page = document.createElement('article');
  page.className = 'reading-page';
  page.dataset.pageNumber = String(number);
  page.dataset.pageKind = kind;
  const inner = document.createElement('div');
  inner.className = 'page-content';
  const footer = document.createElement('footer');
  footer.className = 'page-number';
  footer.setAttribute('aria-label', `Reading page ${number}`);
  footer.textContent = String(number);
  page.append(inner, footer);
  slot.append(page);
  return { slot, page, inner };
}

function makeThumbnail(document, page, link, pageWidth) {
  if (link.dataset.previewReady) return;
  const sheet = page.cloneNode(true);
  sheet.classList.add('thumbnail-sheet');
  sheet.style.textAlign = 'start';
  sheet.setAttribute('aria-hidden', 'true');
  sheet.setAttribute('inert', '');
  for (const node of [sheet, ...sheet.querySelectorAll('[id]')]) node.removeAttribute('id');
  sheet.querySelectorAll('.aq-overlay').forEach(node => node.remove());
  const mini = link.querySelector('.mini-page');
  mini.style.setProperty('--thumbnail-scale', String((mini.clientWidth || 156) / pageWidth));
  mini.append(sheet);
  link.dataset.previewReady = 'true';
}

export function initialisePagedReader(document, window) {
  const main = document.getElementById('source-document');
  const flow = main?.querySelector('[data-reader-source-flow]');
  if (!flow || !main.readerPaper || main.dataset.pagesReady !== 'opening') return null;
  const paper = main.readerPaper;
  main.dataset.pagesReady = 'pending';
  const units = [];
  for (const section of flow.querySelectorAll('.source-section[data-source-id]')) {
    const sectionTemplate = section.cloneNode(false);
    const children = section.querySelectorAll('.source-section-title,.source-text > .source-passage,.unavailable');
    for (const node of children) {
      node.dataset.readerUnit = String(units.length);
      units.push({ section: sectionTemplate, node, heading: node.matches('.source-section-title') });
    }
  }
  let openingCover = main.querySelector('[data-reader-opening]');
  const title = openingCover?.querySelector('[data-title-page]');
  const toc = flow.querySelector('[data-contents-page]')?.cloneNode(true);
  const tail = flow.querySelector('.section-nav')?.cloneNode(true);
  const theme = document.getElementById('reader-theme');
  if (theme) {
    theme.value = document.body.dataset.readerTheme;
    theme.addEventListener('change', () => paper.setTheme(theme.value === 'blue' ? 'blue' : 'green'));
  }
  let stack, pages = [], slots = [], links = [], currentPage = 1;
  let thumbnailObserver, progressFrame, revision = 0;
  const emit = (name, detail) => document.dispatchEvent(new window.CustomEvent(name, { detail }));
  const scalePages = paper.applyScale;
  scalePages();

  // The page that contains the reading line stays current, even on tall sheets.
  const visibleIndex = (y = window.innerHeight * .18) => {
    let low = 0, high = slots.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (slots[middle].getBoundingClientRect().bottom < y) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const setZoom = next => {
    if (paper.phone.matches) return;  // The mobile viewport itself handles pinch zoom.
    const slot = slots[visibleIndex()];
    const top = slot?.getBoundingClientRect().top;
    const oldScale = Number(document.body.dataset.pageZoom) || 1;
    paper.setZoom(next === null ? 'fit' : Math.max(.25, Math.min(2.5, next)));
    if (slot) window.scrollBy({ top: slot.getBoundingClientRect().top - top * Number(document.body.dataset.pageZoom) / oldScale, behavior: 'instant' });
    emit('care-source-scale-changed');
  };
  document.getElementById('reader-zoom-out')?.addEventListener('click', () => setZoom((Number(document.body.dataset.pageZoom) || 1) - .1));
  document.getElementById('reader-zoom-in')?.addEventListener('click', () => setZoom((Number(document.body.dataset.pageZoom) || 1) + .1));
  document.getElementById('reader-zoom-fit')?.addEventListener('click', () => setZoom(null));
  document.getElementById('reader-zoom-value')?.addEventListener('click', () => setZoom(1));

  const refreshProgress = (force = false) => {
    if (!slots.length) return;
    const number = visibleIndex() + 1;
    if (!force && currentPage === number) return;
    links[currentPage - 1]?.removeAttribute('aria-current');
    currentPage = number;
    links[number - 1]?.setAttribute('aria-current', 'page');
    document.body.dataset.currentReadingPage = String(number);
    document.querySelectorAll('[data-reading-progress]').forEach(node => { node.textContent = main.dataset.pagesReady === 'reading' ? String(number) : `${number} / ${pages.length}`; });
    document.querySelectorAll('.progress-fill').forEach(node => { node.style.width = `${number / pages.length * 100}%`; });
  };
  const scheduleProgress = () => {
    if (!progressFrame) progressFrame = window.requestAnimationFrame(() => { progressFrame = 0; refreshProgress(); });
  };
  window.addEventListener('scroll', scheduleProgress, { passive: true });

  const installThumbnails = (append = false) => {
    const list = document.querySelector('[data-pages-list]');
    if (!list) return;
    if (!append) {
      thumbnailObserver?.disconnect();
      thumbnailObserver = null;
      links = [];
      list.replaceChildren();
    }
    const start = links.length;
    const added = pages.slice(start).map((page, index) => {
      const number = start + index + 1;
      const link = document.createElement('a');
      const section = page.querySelector('.source-section');
      const sectionName = section && sectionTitles.get(section.dataset.sourceId);
      const label = sectionName || (page.dataset.pageKind === 'title' ? 'Title' : page.dataset.pageKind === 'contents' ? 'Contents' : '');
      link.className = 'page-thumbnail';
      link.href = `#reading-page-${number}`;
      link.dataset.readerPageLink = String(number);
      link.dataset.sourceTitle = `Page ${number} ${label}`;
      link.setAttribute('aria-label', `Go to page ${number}${label ? ' · ' + label : ''}`);
      const preview = document.createElement('span');
      preview.className = 'page-preview';
      preview.setAttribute('aria-hidden', 'true');
      const mini = document.createElement('span');
      mini.className = 'mini-page';
      preview.append(mini);
      const caption = document.createElement('span');
      caption.className = 'thumbnail-label';
      caption.textContent = String(number);
      link.append(preview, caption);
      return link;
    });
    links.push(...added);
    list.append(...added);
    if (window.IntersectionObserver && !thumbnailObserver) {
      const observer = new window.IntersectionObserver(entries => {
        if (observer !== thumbnailObserver) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          makeThumbnail(document, pages[Number(entry.target.dataset.readerPageLink) - 1], entry.target, paper.width);
          observer.unobserve(entry.target);
        }
      }, { root: list, rootMargin: '250px' });
      thumbnailObserver = observer;
    }
    for (const link of added) {
      if (thumbnailObserver) thumbnailObserver.observe(link);
      else makeThumbnail(document, pages[Number(link.dataset.readerPageLink) - 1], link, paper.width);
    }
  };
  const sectionTitles = new Map(units.filter(unit => unit.heading).map(unit => [unit.section.dataset.sourceId, unit.node.textContent]));

  function readingLocation() {
    const y = Math.min(100, window.innerHeight * .18);
    const index = visibleIndex(y);
    const current = pages[index] || main;
    const rect = current.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 1, Math.max(1, (rect.left + rect.right) / 2));
    const point = document.caretPositionFromPoint?.(x, y);
    const range = !point && document.caretRangeFromPoint?.(x, y);
    const node = point?.offsetNode || range?.startContainer;
    const unit = node?.parentElement?.closest('[data-reader-unit]');
    if (unit && current.contains(unit) && node.nodeType === 3 && !node.parentElement.closest('.aq-overlay,.passage-marker')) {
      const before = document.createRange();
      before.selectNodeContents(unit);
      before.setEnd(node, point?.offset ?? range.startOffset);
      return { unit: unit.dataset.readerUnit, offset: Number(unit.dataset.readerOffset || 0) + before.toString().length, y };
    }
    const line = [...current.querySelectorAll('[data-reader-unit]')].find(el => el.getBoundingClientRect().bottom > y);
    if (line && line.getBoundingClientRect().top < window.innerHeight) {
      return { unit: line.dataset.readerUnit, offset: Number(line.dataset.readerOffset || 0), y: line.getBoundingClientRect().top };
    }
    return { index, top: rect.top };
  }

  // Split continuations retain their original unit even after the printed
  // passage anchor moves to an earlier sheet.
  main.careSourcePosition = () => {
    const selection = window.getSelection();
    const selected = !selection?.isCollapsed && selection?.anchorNode?.parentElement?.closest('[data-reader-unit]');
    const location = selected && stack?.contains(selected)
      ? {unit:selected.dataset.readerUnit} : readingLocation();
    const unit = units[location.unit];
    if (!unit) return null;
    return { sourceId:unit.section.dataset.sourceId, passageId:unit.node.dataset.passageId || '',
      paneRow:unit.node.dataset.paneRow };
  };

  function restoreLocation(location) {
    if (location.unit !== undefined) {
      const pieces = [...stack.querySelectorAll(`[data-reader-unit="${location.unit}"]`)];
      const piece = pieces.reverse().find(el => Number(el.dataset.readerOffset || 0) <= location.offset);
      if (piece) {
        const nodes = textIndex(piece, document);
        if (nodes.length) {
          const offset = Math.min(nodes.at(-1).end, location.offset - Number(piece.dataset.readerOffset || 0));
          const point = indexedTextAt(nodes, offset, false);
          const range = document.createRange();
          range.setStart(point.node, offset - point.start);
          range.collapse(true);
          const rect = range.getClientRects()[0] || piece.getBoundingClientRect();
          window.scrollBy({ top: rect.top - location.y, behavior: 'instant' });
          return;
        }
      }
    }
    const slot = slots[Math.min(location.index ?? 0, slots.length - 1)];
    if (slot) window.scrollBy({ top: slot.getBoundingClientRect().top - (location.top ?? 0), behavior: 'instant' });
  }

  async function reflow() {
    const token = ++revision;
    const first = main.dataset.pagesReady !== 'true';
    const progressive = !stack;
    const nextStack = document.createElement('div');
    nextStack.className = 'reading-pages reader-page-stack';
    const textSize = document.body.style.getPropertyValue('--reader-text-size');
    nextStack.style.setProperty('--reader-text-size', textSize);
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.setAttribute('inert', '');
    probe.style.cssText = 'position:fixed;left:-100000px;top:0;width:210mm;height:297mm;visibility:hidden;contain:strict;pointer-events:none;';
    probe.style.setProperty('--reader-text-size', textSize);
    document.body.append(probe);
    const nextPages = [], nextSlots = [], ids = new Map();
    const sectionPages = new Map(), contentsRefs = [];
    let exposed = 0;
    let page, inner, section, host, sectionKey;
    const deferIds = el => {
      for (const node of [el, ...el.querySelectorAll('[id]')]) {
        if (!node.id) continue;
        if (!ids.has(node.id)) ids.set(node.id, node);
        node.removeAttribute('id');
      }
    };
    const newPage = kind => {
      if (section && section.childElementCount === 1 && !host.childElementCount) section.remove();
      if (page) nextSlots.at(-1).append(page);
      const number = nextPages.length + 1;
      const sheet = readingSheet(document, kind, number);
      page = sheet.page;
      inner = sheet.inner;
      const slot = sheet.slot;
      ids.set(`reading-page-${number}`, page);
      if (kind === 'text' && !ids.has('source-text')) ids.set('source-text', slot);
      nextSlots.push(slot);
      nextPages.push(page);
      probe.replaceChildren(page);
      section = host = sectionKey = null;
    };
    const fits = () => inner.clientHeight > 0 && inner.scrollHeight <= inner.clientHeight;
    const requireFit = () => {
      if (!fits()) throw new Error('The page content needs more than one sheet.');
    };
    const startSection = unit => {
      if (sectionKey === unit.section.dataset.sourceId) return;
      section = unit.section.cloneNode(false);
      sectionKey = section.dataset.sourceId;
      section.removeAttribute('id');
      inner.append(section);
      host = document.createElement('div');
      host.className = 'source-text';
      section.append(host);
    };
    const appendUnit = (unit, copy) => {
      startSection(unit);
      if (unit.heading) section.insertBefore(copy, host);
      else host.append(copy);
    };
    const acceptUnit = (unit, copy) => {
      if (!sectionPages.has(unit.section.id)) {
        sectionPages.set(unit.section.id, nextPages.length);
        if (unit.section.id) ids.set(unit.section.id, section);
      }
      deferIds(copy);
    };
    function reveal(count, complete) {
      const replacing = stack !== nextStack;
      const previous = stack;
      const location = replacing ? readingLocation() : null;
      let hashId;
      if (first && window.location.hash) {
        try { hashId = decodeURIComponent(window.location.hash.slice(1)); } catch {}
      }
      const knownTarget = hashId && previous?.contains(document.getElementById(hashId));
      const added = nextSlots.slice(exposed, count);
      nextStack.append(...added);
      if (replacing) main.replaceChildren(nextStack);
      stack = nextStack;
      exposed = count;
      pages = nextPages.slice(0, count);
      slots = nextSlots.slice(0, count);
      for (const [id, node] of ids) {
        if (node.id !== id && nextStack.contains(node)) node.id = id;
      }
      // Printed and miniature contents use the same folios. Unmeasured destinations
      // keep their real links and acquire a number when their sheet is available.
      const previewRefs = document.querySelectorAll('.thumbnail-sheet [data-page-ref]');
      for (const ref of [...contentsRefs, ...previewRefs]) {
        const folio = sectionPages.get(ref.dataset.pageRef);
        const label = folio <= count ? String(folio) : complete ? '' : '…';
        if (ref.textContent !== label) ref.textContent = label;
      }
      main.dataset.pagesReady = complete ? 'true' : 'reading';
      if (complete) document.body.dataset.paginated = 'true';
      if (replacing) scalePages();
      installThumbnails(!replacing);
      const target = hashId && document.getElementById(hashId);
      if (target && !knownTarget && stack.contains(target)) target.scrollIntoView({behavior:'instant'});
      else if (replacing && (previous || window.scrollY > 0)) restoreLocation(location);
      refreshProgress(true);
      emit(complete ? 'care-source-pages-changed' : 'care-source-pages-added', { added, replacing });
    }

    let lastYield = window.performance.now();
    const yieldLayout = async () => {
      // The current sheet remains in the measurement probe. Finished sheets are
      // immutable: append them once, without disturbing a selection or scroll.
      const finished = nextPages.length - 1;
      if (progressive && finished > exposed && nextPages[finished - 1]?.dataset.pageKind === 'text'
          && (!exposed || finished - exposed >= 12)) reveal(finished, false);
      await new Promise(resolve => window.setTimeout(resolve, 0));
      lastYield = window.performance.now();
    };

    try {
      if (title) {
        newPage('title');
        const copy = title.cloneNode(true);
        deferIds(copy);
        inner.append(copy);
        requireFit();
      }
      if (toc) {
        let list, continuation = 0;
        const contentsPage = () => {
          newPage('contents');
          const nav = toc.cloneNode(false);
          const heading = toc.querySelector('h2').cloneNode(true);
          if (continuation) {
            nav.dataset.contentsContinuation = '';
            (heading.querySelector('[data-open-reader-contents]') || heading).textContent = 'Contents · continued';
            heading.id += '-' + (continuation + 1);
          }
          nav.setAttribute('aria-labelledby', heading.id);
          list = document.createElement('ol');
          list.className = 'document-contents-list';
          nav.append(heading, list);
          deferIds(nav);
          inner.append(nav);
          continuation += 1;
        };
        contentsPage();
        for (const item of toc.querySelectorAll('ol > li')) {
          const copy = item.cloneNode(true);
          contentsRefs.push(...copy.querySelectorAll('[data-page-ref]'));
          list.append(copy);
          if (!fits() && list.children.length > 1) {
            copy.remove();
            contentsPage();
            list.append(copy);
          }
          requireFit();
          deferIds(copy);
        }
      }
      for (const unit of units) {
        if (token !== revision) return;
        if (page?.dataset.pageKind !== 'text' || (unit.heading && inner.childElementCount)) newPage('text');
        let copy = unit.node.cloneNode(true);
        appendUnit(unit, copy);
        if (fits()) {
          acceptUnit(unit, copy);
        } else {
          copy.remove();
          const text = unit.node.textContent;
          const nodes = textIndex(unit.node, document);
          let offset = 0;
          while (offset < text.length) {
            if (token !== revision) return;
            const remaining = text.length - offset;
            const fitsPrefix = length => {
              copy = sliceElement(unit.node, offset, offset + length, document, nodes);
              appendUnit(unit, copy);
              const result = fits();
              copy.remove();
              return result;
            };
            // Bound layout work per trial even for a book saved as a single paragraph.
            let upper = Math.min(remaining, 2048);
            while (upper < remaining && fitsPrefix(upper)) upper = Math.min(remaining, upper * 2);
            const count = fittedPrefix(upper, fitsPrefix);
            const take = readableBoundary(text.slice(offset, Math.min(text.length, offset + count + 1)), count);
            if (take) {
              copy = sliceElement(unit.node, offset, offset + take, document, nodes);
              copy.dataset.readerOffset = String(offset);
              appendUnit(unit, copy);
              requireFit();
              acceptUnit(unit, copy);
              offset += take;
            } else if (!inner.textContent.trim()) {
              throw new Error('A source glyph cannot fit on a reading page.');
            }
            if (offset < text.length) newPage('text');
            if (window.performance.now() - lastYield >= 10) await yieldLayout();
          }
        }
        if (window.performance.now() - lastYield >= 10) await yieldLayout();
      }
      if (tail?.firstElementChild) {
        if (!page) newPage('text');
        const copy = tail.cloneNode(true);
        inner.append(copy);
        if (!fits()) {
          copy.remove();
          newPage('text');
          inner.append(copy);
        }
        requireFit();
        deferIds(copy);
      }
      if (token !== revision || !page) return;
      nextSlots.at(-1).append(page);
      if (!ids.has('source-text')) ids.set('source-text', nextSlots[0]);
      reveal(nextPages.length, true);
      openingCover = null;
    } catch (error) {
      if (token !== revision) return;
      // Preserve access to every source node when the browser cannot measure a sheet.
      console.warn('CARE reader kept the continuous source edition.', error);
      if (first) {
        if (title) flow.prepend(title);
        const currentHash = window.location.hash;
        main.replaceChildren(flow);
        main.dataset.pagesReady = 'continuous';
        openingCover = stack = null;
        pages = []; slots = [];
        installThumbnails();
        if (currentHash) {
          try { document.getElementById(decodeURIComponent(currentHash.slice(1)))?.scrollIntoView({behavior:'instant'}); } catch {}
        }
        emit('care-source-pages-added');
      }
    } finally {
      probe.remove();
    }
  }

  let timer;
  const requestReflow = delay => {
    revision += 1;
    window.clearTimeout(timer);
    timer = window.setTimeout(reflow, delay);
  };
  document.addEventListener('care-source-reader-font-change', () => requestReflow(100));
  let lastWidth = main.clientWidth;
  const fitOnResize = () => {
    const width = main.clientWidth;
    if (width === lastWidth) return;
    lastWidth = width;
    scalePages();
    scheduleProgress();
    emit('care-source-scale-changed');
  };
  if (window.ResizeObserver) new window.ResizeObserver(fitOnResize).observe(main);
  else window.addEventListener('resize', fitOnResize, { passive: true });
  // Measure after initial fonts settle. Subsequent loads invalidate the layout once.
  if (document.fonts) {
    document.fonts.ready.then(() => requestReflow(0));
    document.fonts.addEventListener('loadingdone', () => requestReflow(0));
  } else window.requestAnimationFrame(() => requestReflow(0));
  return { reflow, setZoom, get pages() { return pages; } };
}
