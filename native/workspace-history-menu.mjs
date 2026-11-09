export function bindWorkspaceBackHistory(buttons, {entries, jump}) {
  if (!buttons.length) return;
  const doc = buttons[0].ownerDocument, win = doc.defaultView;
  const controller = new win.AbortController();
  const listen = (node, type, handler, capture = false) => node.addEventListener(type, handler, {capture, signal:controller.signal});
  const menu = doc.createElement('div');
  menu.id = 'care-workspace-history';
  menu.className = 'reading-menu workspace-history-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Recent workspace history');
  doc.body.append(menu);
  let anchor, timer, pointer, heldButton;

  function stopPress() {
    win.clearTimeout(timer);
    pointer = null;
  }
  function close(focus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    anchor?.setAttribute('aria-expanded','false');
    if (focus && anchor?.getClientRects().length) anchor.focus({preventScroll:true});
    anchor = null;
  }
  function open(button) {
    const rows = entries();
    if (!rows.length) return false;
    close();
    anchor = button;
    button.setAttribute('aria-expanded','true');
    menu.hidden = false;
    const title = doc.createElement('div');
    title.className = 'workspace-history-title';
    title.textContent = 'Recent history';
    title.setAttribute('aria-hidden','true');
    const list = doc.createElement('div');
    list.className = 'workspace-history-list';
    for (const row of rows) {
      const item = doc.createElement('button');
      item.type = 'button';
      item.setAttribute('role','menuitem');
      item.tabIndex = -1;
      item.dataset.historyKind = row.kind;
      const name = doc.createElement('strong');
      name.textContent = row.title;
      const tag = doc.createElement('span');
      tag.className = 'workspace-history-kind';
      tag.textContent = row.kind;
      item.append(name, tag);
      if (row.detail) {
        const detail = doc.createElement('small');
        detail.textContent = row.detail;
        item.append(detail);
      }
      item.onclick = () => { close(); jump(row); };
      list.append(item);
    }
    menu.replaceChildren(title, list);
    const rect = button.getBoundingClientRect();
    const width = Math.min(360, win.innerWidth - 16);
    menu.style.width = width + 'px';
    menu.style.left = Math.max(8, Math.min(rect.left, win.innerWidth - width - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(rect.bottom + 6, win.innerHeight - menu.offsetHeight - 8)) + 'px';
    list.firstElementChild?.focus({preventScroll:true});
    return true;
  }
  for (const button of buttons) {
    button.setAttribute('aria-haspopup','menu');
    button.setAttribute('aria-controls',menu.id);
    button.setAttribute('aria-expanded','false');
    listen(button, 'pointerdown', event => {
      heldButton = null;
      if (button.disabled || event.button !== 0) return;
      stopPress();
      pointer = {id:event.pointerId, x:event.clientX, y:event.clientY};
      timer = win.setTimeout(() => { if (open(button)) heldButton = button; }, 420);
    });
    listen(button, 'contextmenu', event => {
      if (!open(button)) return;
      stopPress();
      event.preventDefault();
    });
    listen(button, 'click', event => {
      if (heldButton !== button) return;
      heldButton = null;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    listen(button, 'keydown', event => {
      heldButton = null;
      if (!(event.key === 'ArrowDown' || event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey)) return;
      if (open(button)) event.preventDefault();
    });
  }
  listen(doc, 'pointermove', event => {
    if (pointer?.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 10) stopPress();
  });
  listen(doc, 'pointerup', stopPress);
  listen(doc, 'pointercancel', stopPress);
  listen(doc, 'pointerdown', event => {
    if (anchor && !menu.contains(event.target) && !anchor.contains(event.target)) close();
  }, true);
  listen(menu, 'keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (event.key === 'Tab') { close(true); return; }
    if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...menu.querySelectorAll('[role=menuitem]')], index = items.indexOf(doc.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  });
  listen(win, 'resize', () => close());
  listen(win, 'hashchange', () => close());
  listen(win, 'popstate', () => close());
  return () => {
    stopPress();
    close();
    controller.abort();
    menu.remove();
  };
}
