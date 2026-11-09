export function numogramDraftLines(paper) {
  if (!paper) return [];
  const blocks = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,td,th,div';
  const skip = '[data-writing-footnote],.footnotes,.draft-footnotes,.folio-footnotes,.reader-footnotes,.inline-ref,.ref-token,[contenteditable=false]';
  const leaves = [...paper.querySelectorAll(blocks)].filter(block => !block.querySelector(blocks) && !block.closest(skip));
  const lines = [];
  for (const block of leaves.length ? leaves : [paper]) {
    let text = '', endNode, endOffset;
    function finish() {
      if (text.trim()) {
        const node = endNode, offset = endOffset;
        lines.push({text:text.trim(), block,
          reveal:()=>block.scrollIntoView({block:'center'}),
          endRect(){
            if (!node?.isConnected) return null;
            const range = paper.ownerDocument.createRange();
            range.setStart(node,Math.max(0,offset-1));
            range.setEnd(node,offset);
            return range.getBoundingClientRect();
          },
        });
      }
      text = '';
      endNode = undefined;
    }
    function read(node) {
      if (node.nodeType === 3) {
        let offset = 0;
        for (const fragment of node.data.split('\n')) {
          if (offset) finish();
          text += fragment;
          const last = fragment.trimEnd().length;
          if (last) { endNode = node; endOffset = offset + last; }
          offset += fragment.length + 1;
        }
      } else if (node.nodeType === 1 && (node === block || !node.matches(skip))) {
        if (node.localName === 'br') finish();
        else for (const child of node.childNodes) read(child);
      }
    }
    read(block);
    finish();
  }
  return lines;
}

export function mountNumogramDraftMargins(paper, calculate) {
  if (!paper) return () => {};
  const doc = paper.ownerDocument, view = doc.defaultView;
  const controller = new view.AbortController();
  const {signal} = controller;
  const well = paper.closest('.page-well');
  const port = well || doc.documentElement;
  const host = well || doc.body;
  const layer = doc.createElement('div');
  layer.setAttribute('aria-hidden','true');
  layer.dataset.numogramDraftMargins = '';
  layer.style.cssText = 'position:absolute;inset:0;z-index:12;pointer-events:none';
  const style = doc.createElement('style');
  style.textContent = `
    :is(.page-well,body):has(> [data-numogram-draft-margins]) { position:relative }
    @media print {[data-numogram-draft-margins]{display:none!important}}
  `;
  layer.append(style);
  const marks = doc.createElement('div');
  layer.append(marks);
  host.append(layer);
  let rows = [], frame = 0, timer = 0;
  function paint() {
    frame = 0;
    if (!paper.isConnected) { close(); return; }
    const bounds = paper.getBoundingClientRect(), clip = port.getBoundingClientRect(), origin = layer.getBoundingClientRect();
    const top = Math.max(0,clip.top), bottom = Math.min(view.innerHeight,clip.bottom || view.innerHeight);
    const right = Math.min(view.innerWidth,clip.right);
    const visible = [];
    for (const {line,total} of rows) {
      const block = line.block.getBoundingClientRect();
      if (block.bottom < top || block.top > bottom) continue;
      const end = line.endRect();
      if (!end?.height || end.bottom > bottom || end.top < top) continue;
      const x = Math.max(end.right+8,Math.min(bounds.right+10,right-66));
      if (x+44 > right) continue;
      const badge = doc.createElement('span');
      badge.style.cssText = 'position:absolute;white-space:nowrap;color:#dab473b8;font:500 10px/1 ui-monospace,monospace';
      badge.style.left = (x - origin.left) + 'px';
      badge.style.top = (end.bottom - origin.top - 11) + 'px';
      badge.textContent = 'AQ ' + total;
      visible.push(badge);
    }
    marks.replaceChildren(...visible);
  }
  function schedule() {
    if (!frame) frame = view.requestAnimationFrame(paint);
  }
  function read() {
    rows = numogramDraftLines(paper).flatMap(line=>{
      const value = calculate(line.text);
      return value ? [{line,total:value.total}] : [];
    });
    schedule();
  }
  const changed = new view.MutationObserver(()=>{
    view.clearTimeout(timer);
    timer = view.setTimeout(read,120);
  });
  changed.observe(paper,{childList:true,subtree:true,characterData:true});
  const resized = new view.ResizeObserver(schedule);
  resized.observe(paper);
  resized.observe(port);
  // Shadow-root scroll events do not reach the owner document.
  (well || view).addEventListener('scroll',schedule,{passive:true,signal});
  view.addEventListener('resize',schedule,{signal});
  function close() {
    controller.abort();
    changed.disconnect();
    resized.disconnect();
    view.cancelAnimationFrame(frame);
    view.clearTimeout(timer);
    layer.remove();
  }
  read();
  return close;
}
