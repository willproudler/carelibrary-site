// Only the Library shelf consults this device’s book-opening preference.
export const BOOK_OPENING_KEY = 'care-book-opening-v1';
const openingModes = new Set(['reader', 'library']);
const fallbackStates = new WeakMap();
const activeChoices = new WeakMap();

export function bookOpeningState(view) {
  let saved = fallbackStates.get(view);
  if (!saved) {
    try { saved = JSON.parse(view.localStorage.getItem(BOOK_OPENING_KEY)); } catch {}
  }
  saved ||= {};
  return {mode: openingModes.has(saved.mode) ? saved.mode : 'ask', last: openingModes.has(saved.last) ? saved.last : null};
}

function saveBookOpening(view, state) {
  try {
    view.localStorage.setItem(BOOK_OPENING_KEY, JSON.stringify(state));
    fallbackStates.delete(view);
  } catch { fallbackStates.set(view, state); }
  view.dispatchEvent(new view.Event('care-book-opening-changed'));
}

export function setBookOpeningPreference(view, mode) {
  saveBookOpening(view, {mode:openingModes.has(mode) ? mode : 'ask', last:null});
}

export function recordBookOpening(view, choice, always = false) {
  if (!openingModes.has(choice)) return;
  const {mode, last} = bookOpeningState(view);
  if (mode !== 'ask' && !always) return;
  saveBookOpening(view, {mode:always || last === choice ? choice : 'ask', last:choice});
}

export function bindBookOpeningPreference(doc, select) {
  if (!select) return;
  const view = doc.defaultView;
  const refresh = () => { select.value = bookOpeningState(view).mode; };
  refresh();
  select.addEventListener('change', () => setBookOpeningPreference(view, select.value));
  view.addEventListener('care-book-opening-changed', refresh);
  view.addEventListener('storage', event => { if (!event.key || event.key === BOOK_OPENING_KEY) refresh(); });
}

const openingStyle = `
dialog[data-book-opening] {box-sizing:border-box;color-scheme:dark;background:#24312b;color:#edf0e8;border:1px solid #a6bca140;border-radius:12px;padding:0;inline-size:min(400px,calc(100vw - 32px));max-block-size:calc(100dvh - 40px);box-shadow:0 18px 70px #07110bd9;font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:auto;text-align:start}
dialog[data-book-opening]::backdrop {background:#08120e59;backdrop-filter:blur(3px)}
[data-book-opening] .opening-head {display:flex;align-items:start;gap:12px;padding:24px 22px 12px}
[data-book-opening] .opening-head div {flex:1;min-width:0}
[data-book-opening] h2 {margin:0;font:500 24px/1.18 "Iowan Old Style",Palatino,Georgia,serif;color:inherit;overflow-wrap:anywhere;text-wrap:balance}
[data-book-opening] .opening-author {display:block;margin:.4em 0 0;color:#c0cabd;font:italic 15px/1.35 "Iowan Old Style",Palatino,Georgia,serif}
[data-book-opening] button,[data-book-opening] a {font:inherit;cursor:pointer}
[data-book-opening] .opening-close {background:none;color:#c3cdc3;border:0;padding:0;width:32px;height:32px;border-radius:5px;font-size:22px;line-height:1}
[data-book-opening] .opening-options {padding:3px 22px 22px;display:grid;gap:8px}
[data-book-opening] .opening-option {border:1px solid #a7c2ae48;border-radius:6px;padding:10px 14px;background:#34463a;color:#f0f1e9;text-align:left;min-height:44px;font-weight:550}
[data-book-opening] .opening-option + .opening-option {background:#293a30}
[data-book-opening] .opening-close:hover,[data-book-opening] .opening-option:hover {background:#405346}
[data-book-opening] :is(button,a,input,summary):focus-visible {outline:2px solid #c9dfbe;outline-offset:2px}
[data-book-opening] label {display:flex;align-items:center;gap:8px;min-height:32px;font-size:13px;color:#cdd4ca}
[data-book-opening] input {accent-color:#b8d0b2}
`;

export function chooseBookOpening(doc, {title, author} = {}) {
  const view = doc.defaultView;
  const {mode} = bookOpeningState(view);
  if (mode !== 'ask') return Promise.resolve(mode);
  activeChoices.get(doc)?.();
  return new Promise(resolve => {
    const dialog = doc.createElement('dialog');
    dialog.dataset.bookOpening = '';
    dialog.setAttribute('aria-labelledby', 'book-opening-title');
    const style = doc.createElement('style');
    style.textContent = openingStyle;
    dialog.innerHTML = '<div class="opening-head"><div><h2 id="book-opening-title"></h2><span class="opening-author"></span></div><button type="button" class="opening-close" aria-label="Close">×</button></div><div class="opening-options"><button type="button" class="opening-option" data-open-mode="reader">Open in Reader</button><button type="button" class="opening-option" data-open-mode="library">Open in CARE Library</button><label><input type="checkbox">Always open here</label></div>';
    dialog.querySelector('h2').textContent = title || 'Open book';
    dialog.querySelector('.opening-author').textContent = author || '';
    dialog.prepend(style);
    const done = (choice, remember = false) => {
      if (activeChoices.get(doc) !== cancel) return;
      activeChoices.delete(doc);
      if (choice && remember) recordBookOpening(view, choice, dialog.querySelector('input').checked);
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(choice);
    };
    const cancel = () => done(null);
    activeChoices.set(doc, cancel);
    dialog.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button?.dataset.openMode) done(button.dataset.openMode, true);
      else if (button?.classList.contains('opening-close')) cancel();
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
    dialog.addEventListener('close', cancel);
    doc.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('[data-open-mode=reader]').focus({preventScroll:true});
  });
}
