import mountSpotlight, {html, css} from './spotlight.mjs';
import {searchSpotlight} from './beta-search.mjs';

export function mountBetaSpotlight({works, fields, onSelect, workspaceTitle}) {
  const host = document.createElement('div');
  host.innerHTML = html;
  const style = document.createElement('style');
  style.textContent = css;
  host.prepend(style);
  const input = host.querySelector('.csp-input');
  input.setAttribute('aria-label','Search published books, passages and axioms');
  input.title = 'Search published books, passages and axioms';
  for (const [button, query] of [...host.querySelectorAll('[data-example]')].map((button,index) =>
    [button,['Books from the 19th century','"power of judging"','Books by David Hume'][index]])) {
    if (!query) continue;
    button.dataset.example = query;
    button.title = query;
    button.setAttribute('aria-label','Try ' + query);
  }
  document.body.append(host);
  const overlay = host.querySelector('.csp-overlay');
  const settings = {
    toolbarSelector:'.workbench-search',
    toolbarRoot:()=>document.querySelector('.beta-workbench'),
    workspaceTitle,
    manageDisplayPreferences:false,
    persist:false,
    searchPrompt:'Search published books, passages and axioms.',
    blocked:()=>!overlay.open && Boolean(document.querySelector('dialog[open]')),
  };
  let pending;
  let dispose;

  function paint(query, response = {results:[]}) {
    dispose = mountSpotlight({
      parentElement:host,
      host:settings,
      data:{has_toolbar:true,query,...response},
      setStateValue(name, value) { if (name==='query') run(value); },
      setTriggerValue(name, value) {
        if (name==='selection') onSelect(value);
        if (name==='full_search') {
          // The same Spotlight renderer presents the longer Library result list.
          paint('');
          open(value.query,{expanded:true});
        }
      },
    });
  }

  function open(query, {expanded=false} = {}) {
    document.dispatchEvent(new CustomEvent('care:spotlight-open',{detail:{query,expanded}}));
  }

  async function run(query) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    const limit = overlay.hasAttribute('data-toolbar') ? 9 : 48;
    const response = await searchSpotlight(query,{works,fields,limit,signal:controller.signal}).catch(error => ({
      results:[],error:error.message,
    }));
    if (!controller.signal.aborted) paint(query,response);
  }

  window.addEventListener('care:account-ended',()=>{
    pending?.abort();
    host.querySelector('.csp-close').click();
    dispose?.();
    host.remove();
  },{once:true});
  paint('');
  return {open};
}
