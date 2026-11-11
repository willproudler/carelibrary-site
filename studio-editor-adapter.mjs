import mountStudio, {rememberStudioModePosition} from './native/writing-editor.mjs';

// The beta shares Studio's editor but has a smaller, account-scoped Binder API.
// Keep only controls backed by that API; desktop Book storage stays on the Mac.
const unsupportedBinderLabels = new Set([
  'New book', 'New book from selection…', 'Convert to Book', 'Send to First drafts', 'Collaborate',
]);
const adapters = new WeakMap();

export function betaBinderControlAvailable(button) {
  return !['collaborate','remote-send','remote-connect'].includes(button.getAttribute('data-action')) &&
    !unsupportedBinderLabels.has((button.getAttribute('aria-label') || button.textContent || '').trim());
}

export function filterBetaStudioControls(root) {
  for (const button of root.querySelectorAll('.binder-head button, .binder-item-menu button, [data-action="collaborate"], [data-action="remote-send"], [data-action="remote-connect"]')) {
    if (!betaBinderControlAvailable(button)) {
      button.hidden = true;
      button.disabled = true;
      button.setAttribute('aria-hidden', 'true');
    }
  }
}

function installBetaStudioCapabilities(root) {
  if (adapters.has(root)) return adapters.get(root);
  const host = root.host || root;
  host.setAttribute('data-beta-studio', '');
  const Observer = root.ownerDocument?.defaultView?.MutationObserver || globalThis.MutationObserver;
  const observer = Observer ? new Observer(() => filterBetaStudioControls(root)) : null;
  filterBetaStudioControls(root);
  observer?.observe(root, {childList: true, subtree: true});
  const close = () => { observer?.disconnect(); host.removeAttribute('data-beta-studio'); adapters.delete(root); };
  adapters.set(root, close);
  return close;
}

export {rememberStudioModePosition};
export default function mountBetaStudio(component) {
  const cleanup = mountStudio(component);
  const close = installBetaStudioCapabilities(component.parentElement);
  return () => { close(); cleanup?.(); };
}
