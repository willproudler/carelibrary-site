// Only the Library shelf consults this device’s book-opening preference.
export const BOOK_OPENING_KEY = 'care-book-opening-v1';
const openingModes = new Set(['reader', 'library']);
const learningWindow = 5;
const fallbackStates = new WeakMap();
const activeChoices = new WeakMap();

export function bookOpeningState(view) {
  let saved = fallbackStates.get(view);
  if (!saved) {
    try { saved = JSON.parse(view.localStorage.getItem(BOOK_OPENING_KEY)); } catch {}
  }
  saved ||= {};
  // The earlier policy remembered one unconfirmed choice under "last".
  const choices = (Array.isArray(saved.choices) ? saved.choices : [saved.last])
    .filter(choice => openingModes.has(choice)).slice(0, learningWindow);
  return {mode:openingModes.has(saved.mode) ? saved.mode : 'ask', choices, last:choices.at(-1) ?? null};
}

function saveBookOpening(view, state) {
  try {
    view.localStorage.setItem(BOOK_OPENING_KEY, JSON.stringify(state));
    fallbackStates.delete(view);
  } catch { fallbackStates.set(view, state); }
  view.dispatchEvent(new view.Event('care-book-opening-changed'));
}

export function setBookOpeningPreference(view, mode) {
  saveBookOpening(view, {mode:openingModes.has(mode) ? mode : 'ask', choices:[], last:null});
}

function preferredOpening(choices) {
  const readers = choices.filter(choice => choice === 'reader').length;
  const libraries = choices.length - readers;
  if (readers === libraries) return choices.at(-1);
  return readers > libraries ? 'reader' : 'library';
}

export function recordBookOpening(view, choice, always = false) {
  if (!openingModes.has(choice)) return;
  const {mode, choices} = bookOpeningState(view);
  if (mode !== 'ask' && !always) return;
  const sample = [...choices, choice].slice(-learningWindow);
  const next = always ? choice : sample.length === learningWindow ? preferredOpening(sample) : 'ask';
  saveBookOpening(view, {mode:next, choices:sample, last:choice});
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
dialog[data-book-opening] {
  box-sizing:border-box; color-scheme:dark; color:#eeeae2; background:#1b2423;
  border:1px solid #81998a66; border-radius:12px; padding:0; overflow:auto;
  inline-size:min(710px,calc(100vw - 40px)); max-block-size:calc(100dvh - 32px);
  box-shadow:0 16px 80px #080d11b5,inset 0 1px #e2ead015;
  font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:start;
}
dialog[data-book-opening]::backdrop {background:#08120e8a;backdrop-filter:blur(5px)}
[data-book-opening] * {box-sizing:border-box}
[data-book-opening] .opening-head {display:flex;align-items:start;justify-content:space-between;gap:12px;padding:23px 24px 18px}
[data-book-opening] h2 {margin:0;font:500 clamp(22px,4vw,29px)/1.14 "Iowan Old Style",Palatino,Georgia,serif;text-wrap:balance;overflow-wrap:anywhere}
[data-book-opening] .opening-author {display:block;margin-top:.35em;font:italic 15px/1.35 "Iowan Old Style",Palatino,Georgia,serif;color:#bbc8bc}
[data-book-opening] .opening-author:empty {display:none}
[data-book-opening] button {font:inherit;cursor:pointer}
[data-book-opening] .opening-close {flex:none;background:none;color:#c3cdc3;border:0;width:36px;height:36px;border-radius:5px;font-size:22px;line-height:1}
[data-book-opening] .opening-options {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 24px}
[data-book-opening] .opening-option {display:grid;grid-template-rows:auto 1fr;min-width:0;padding:0;overflow:hidden;border:1px solid #778d7a70;border-radius:8px;background:#26332d;color:#f3f1e9;text-align:start}
[data-book-opening] .opening-option[data-open-mode="library"] {background:#242a31;border-color:#6974838a}
[data-book-opening] .opening-copy {display:grid;align-content:start;gap:4px;padding:14px 15px 16px}
[data-book-opening] .opening-copy strong {font-size:16px;line-height:1.25;font-weight:600;color:inherit}
[data-book-opening] .opening-copy small {font:400 13px/1.42 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#c2cdc3}
[data-book-opening] [data-open-mode="library"] small {color:#c2c8d0}
[data-book-opening] .opening-always {display:flex;align-items:center;gap:9px;min-height:44px;width:fit-content;margin:9px 24px 10px;color:#c3cfc5;font-size:13px;cursor:pointer}
[data-book-opening] .opening-always input {accent-color:#a9c9ad;margin:0;width:16px;height:16px}
[data-book-opening] :is(button,input):focus-visible {outline:2px solid #d6eacb;outline-offset:3px}
[data-book-opening] .opening-art {display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;isolation:isolate;width:100%;height:172px;border-bottom:1px solid #9aaa922e;container-type:inline-size;pointer-events:none}
[data-book-opening] .opening-reader {background:radial-gradient(ellipse at 20% 10%,#4354486b,transparent 67%),radial-gradient(ellipse at 85% 95%,#22322a,#16251e)}
[data-book-opening] .opening-paper {display:flex;flex-direction:column;justify-content:center;align-items:center;gap:.7em;position:relative;width:min(43%,105px);aspect-ratio:210/297;padding:10% 6%;color:#e6e7db;border:1px solid #a3bc9945;border-radius:1px;
  background:var(--writing-material-grain,none) 0 0 / 96px 96px,radial-gradient(125% 95% at 20% 5%,#354137,#29342e 80%);box-shadow:0 5px 12px #08130e60,0 1px 2px #07100c80;text-align:center;font:500 clamp(7px,3.3cqw,11px)/1.12 "Iowan Old Style",Palatino,Georgia,serif}
[data-book-opening] .opening-paper-title {display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;text-wrap:balance;overflow-wrap:anywhere}
[data-book-opening] .opening-paper-author {display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font:italic .68em/1.2 Georgia,serif;color:#bfcab9}
[data-book-opening] .opening-workspace {background:linear-gradient(150deg,#253140,#121820 85%);border-bottom-color:#75839242}
[data-book-opening] .opening-desk {width:88%;height:78%;display:grid;grid-template-rows:13% 8% 1fr;gap:2px;padding:3px;background:#111720;box-shadow:0 3px 12px #03081180;border:1px solid #6472817a;border-radius:3px;overflow:hidden}
[data-book-opening] .opening-deskbar {display:flex;align-items:center;gap:4%;padding:0 3%;background:#29333e;color:#d4dadf;font:600 clamp(4px,2.4cqw,7px)/1 system-ui}
[data-book-opening] .opening-command {height:45%;width:40%;margin:auto;background:#1d252f;border:1px solid #7a89913b;border-radius:2px}
[data-book-opening] .opening-tabs {background:linear-gradient(90deg,#586069 0 17%,#1b242e 17% 20%,#454f5c 20% 44%,#1b242e 44%)}
[data-book-opening] .opening-panes {min-height:0;display:grid;grid-template-columns:1.1fr 1fr;gap:3%;padding:2% 1%}
[data-book-opening] .opening-pane {position:relative;display:flex;flex-direction:column;align-items:stretch;gap:8%;min-width:0;background:#1b232d;border:1px solid #66758752;border-radius:2px;overflow:hidden;color:#c7d1dd}
[data-book-opening] .opening-pane-heading {display:flex;align-items:center;justify-content:space-between;padding:5% 7%;background:color-mix(in srgb,var(--pane-accent) 58%,#171b22);border-top:2px solid var(--pane-accent);font:650 clamp(3px,1.65cqw,6px)/1 system-ui;letter-spacing:.03em}
[data-book-opening] .opening-lights {width:30%;aspect-ratio:4/1;background:radial-gradient(circle at 13% 50%,#c3907c 0 10%,transparent 13%),radial-gradient(circle at 48% 50%,#c1af7e 0 10%,transparent 13%),radial-gradient(circle at 84% 50%,#87a492 0 10%,transparent 13%)}
[data-book-opening] .opening-pane-source {--pane-accent:#8a431d}
[data-book-opening] .opening-pane-chapter {--pane-accent:#3d668b}
[data-book-opening] .opening-pane-title {display:block;margin:0 8%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#e2e4df;font:600 clamp(4px,2cqw,7px)/1.2 system-ui}
[data-book-opening] .opening-pane-source .opening-pane-title {font-family:"Iowan Old Style",Palatino,Georgia,serif}
[data-book-opening] .opening-lines {align-self:start;margin-left:9%;width:78%;height:29%;background:repeating-linear-gradient(0deg,transparent 0 4px,#919dab85 4px 5px);mask-image:linear-gradient(90deg,#000 75%,#000a)}
[data-book-opening] .opening-pane-source .opening-lines {height:26%;background-image:repeating-linear-gradient(0deg,transparent 0 3px,#bdc3c38c 3px 4px)}
[data-book-opening] .opening-pane .opening-lines:last-child {width:61%;height:18%}
@media(hover:hover) {
  [data-book-opening] .opening-option:hover {border-color:#b3c9ad;box-shadow:0 3px 12px #07130f55}
  [data-book-opening] [data-open-mode="library"]:hover {border-color:#c4a98e}
  [data-book-opening] .opening-close:hover {background:#ffffff0d}
}
@media(prefers-reduced-motion:no-preference) {
  [data-book-opening] .opening-option {transition:border-color .16s,box-shadow .16s}
}
@media(max-width:540px) {
  dialog[data-book-opening] {inline-size:calc(100vw - 24px);max-block-size:calc(100dvh - 20px)}
  [data-book-opening] .opening-head {padding:18px 15px 16px}
  [data-book-opening] .opening-options {grid-template-columns:1fr;padding:0 15px;gap:9px}
  [data-book-opening] .opening-option {grid-template-columns:45% 1fr;grid-template-rows:auto}
  [data-book-opening] .opening-art {height:124px;border-bottom:0;border-right:1px solid #80917f42}
  [data-book-opening] .opening-paper {width:min(52%,74px);padding:9% 4%}
  [data-book-opening] .opening-copy {align-content:center;padding:11px}
  [data-book-opening] .opening-always {margin-inline:15px}
}
@media(forced-colors:active) {
  [data-book-opening] .opening-option {border-color:ButtonText}
  [data-book-opening] .opening-art {forced-color-adjust:none}
}
`;

const openingOptions = `
  <div class="opening-head"><div><h2 id="book-opening-title"></h2><span class="opening-author"></span></div>
    <button type="button" class="opening-close" aria-label="Close">×</button>
  </div>
  <div class="opening-options">
    <button type="button" class="opening-option" data-open-mode="reader">
      <span aria-hidden="true" class="opening-art opening-reader">
        <span class="opening-paper"><span class="opening-paper-title"></span><span class="opening-paper-author"></span></span>
      </span>
      <span class="opening-copy"><strong>Open in Reader</strong><small>Read the book page by page.</small></span>
    </button>
    <button type="button" class="opening-option" data-open-mode="library">
      <span aria-hidden="true" class="opening-art opening-workspace"><span class="opening-desk">
        <span class="opening-deskbar">CARE Library<span class="opening-command"></span></span>
        <span class="opening-tabs"></span>
        <span class="opening-panes">
          <span class="opening-pane opening-pane-source"><span class="opening-pane-heading"><span class="opening-lights"></span>Source</span>
            <span class="opening-pane-title" data-opening-pane-title></span>
            <span class="opening-lines"></span><span class="opening-lines"></span></span>
          <span class="opening-pane opening-pane-chapter"><span class="opening-pane-heading"><span class="opening-lights"></span>Chapter</span>
            <span class="opening-pane-title">Axiom</span>
            <span class="opening-lines"></span><span class="opening-lines"></span></span>
        </span>
      </span></span>
      <span class="opening-copy"><strong>Open in CARE Library</strong><small>Study the source alongside its CARE readings.</small></span>
    </button>
  </div>
  <label class="opening-always"><input type="checkbox">Always open here</label>
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
    dialog.innerHTML = openingOptions;
    dialog.querySelector('h2').textContent = title || 'Open book';
    dialog.querySelector('.opening-paper-title').textContent = title || '';
    dialog.querySelector('[data-opening-pane-title]').textContent = title || '';
    dialog.querySelector('.opening-author').textContent = author || '';
    dialog.querySelector('.opening-paper-author').textContent = author || '';
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
      if (event.button > 0) return;
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
