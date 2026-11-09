// The server session is the authority. No credentials or session tokens go in browser storage.
export function libraryDestination(value = '/library.html', fragment = '') {
  return safeDestination(value, ['/library.html'], fragment);
}

export function postLoginDestination(value = '/library.html', fragment = '') {
  return safeDestination(value, ['/library.html', '/site-settings.html'], fragment);
}

function safeDestination(value, paths, fragment) {
  try {
    const url = new URL(value, 'https://care.invalid');
    if (url.origin !== 'https://care.invalid' || !paths.includes(url.pathname) || url.username || url.password) return '/library.html';
    return url.pathname + url.search + (fragment || url.hash);
  } catch { return '/library.html'; }
}

export function legacyLibraryDestination(hash = '', search = '') {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return ['book', 'field', 'lateral', 'view', 'ref', 'unit', 'source'].some(key => params.has(key))
    ? '/library.html' + search + hash : null;
}

export async function session(fetcher = globalThis.fetch) {
  const response = await fetcher('/api/session', {credentials:'same-origin', cache:'no-store'});
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw Error('Login is unavailable at the moment. Please try again shortly.');
  const value = await response.json();
  if (typeof value.authenticated !== 'boolean' || typeof value.beta_enabled !== 'boolean' || typeof value.can_manage_site !== 'boolean'
      || (value.authenticated && (typeof value.user?.email !== 'string' || !value.user.email.trim()))
      || (value.can_manage_site && !value.authenticated)) throw Error('Login is unavailable at the moment. Please try again shortly.');
  return response.headers.get('x-care-local-preview')==='1'?{...value,local_preview:true}:value;
}

export function accountStorageKey(key, email) {
  if (typeof email !== 'string' || !email.trim()) throw Error('A verified account is required to save readings.');
  return 'care-beta:' + encodeURIComponent(email.trim().toLowerCase()) + ':' + key;
}

export function readingStorageKey(key, {careAccount, carePublicMode} = {}) {
  if (careAccount) return accountStorageKey(key, careAccount);
  if (carePublicMode === 'true') return key;
  throw Error('A verified library session is required to save readings.');
}

const HISTORY_ACCOUNT_KEY = 'care-beta-reading-history-account';
const historyKey = key => typeof key === 'string' && (
  ['care-public-library-visits-v1', 'care-reference-history-v1', 'care-studio-reference-history-v1'].includes(key) ||
  ['care-study-workspace-reader-v1:', 'care-original-reader/1:', 'care-dialogue-playback/1:', 'care-field-layout-v3:'].some(prefix => key.startsWith(prefix))
);
function clearStoreHistory(storage) {
  const keys = Array.from({length:storage.length}, (_, index) => storage.key(index));
  keys.filter(historyKey).forEach(key => storage.removeItem(key));
}

export function prepareAccountStorage(email, view = globalThis) {
  // Native reading history is not account-aware. Discard it on account change,
  // retaining preferences, anonymous saves, and every account's saved collection.
  prepareReadingHistory(email.trim().toLowerCase(), view);
}

export function preparePublicStorage(view = globalThis) {
  prepareReadingHistory('public', view);
}

function prepareReadingHistory(account, view) {
  for (const kind of ['localStorage', 'sessionStorage']) {
    try {
      const storage = view[kind];
      const previous = storage.getItem(HISTORY_ACCOUNT_KEY);
      // Older public readers had no marker; retain their anonymous history.
      if (previous !== account && !(account === 'public' && previous === null)) clearStoreHistory(storage);
      storage.setItem(HISTORY_ACCOUNT_KEY, account);
    } catch { /* Browsers may block storage; the reader supports that mode. */ }
  }
}

export function clearReadingHistory(view = globalThis) {
  for (const kind of ['localStorage', 'sessionStorage']) {
    try { clearStoreHistory(view[kind]); view[kind].removeItem(HISTORY_ACCOUNT_KEY); } catch {}
  }
}

function discardReadingHistory() {
  clearReadingHistory();
  // Native readers checkpoint on pagehide; run again after those listeners.
  window.addEventListener('pagehide', () => clearReadingHistory(), {once:true});
}

export async function postJSON(path, body, fetcher = globalThis.fetch) {
  let response;
  try {
    response = await fetcher(path, {method:'POST', credentials:'same-origin', cache:'no-store', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  } catch { throw Error('We could not connect. Check your connection and try again.'); }
  let result;
  try { result = await response.json(); } catch { throw Error('This service is unavailable at the moment. Please try again shortly.'); }
  if (!response.ok) {
    const error = Error(typeof result?.error === 'string' ? result.error : typeof result?.message === 'string' ? result.message : 'Please try again shortly.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export function loginURL(destination) {
  return '/login.html?next=' + encodeURIComponent(postLoginDestination(destination));
}

export function showSessionNavigation(current) {
  document.querySelectorAll('[data-logout]').forEach(element => { element.hidden = !current.authenticated||current.local_preview===true; });
  document.querySelectorAll('[data-public-login]').forEach(element => { element.hidden = current.authenticated; });
  document.querySelectorAll('[data-owner-only]').forEach(element => { element.hidden = !current.authenticated || !current.can_manage_site; });
}

export function bindLogout() {
  for (const button of document.querySelectorAll('[data-logout]')) {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await postJSON('/api/logout', {});
        window.dispatchEvent(new Event('care:account-ended'));
        discardReadingHistory();
        // Other open tabs must discard their already-rendered readings too.
        try { localStorage.setItem('care-beta-logout', String(Date.now())); } catch {}
        location.replace('/');
      } catch (error) {
        button.disabled = false;
        const notice = document.querySelector('#notice');
        if (notice) { notice.textContent = error.message; notice.hidden = false; }
      }
    });
  }
}

export function watchSession(initial, {library = false} = {}) {
  window.addEventListener('storage', event => {
    if (['care-beta-login', 'care-beta-logout'].includes(event.key)) {
      window.dispatchEvent(new Event('care:account-ended'));
      discardReadingHistory();
      location.reload();
    } else if (event.key === 'care-beta-mode') location.reload();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  let checking = false;
  const check = async () => {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const current = await session();
      const identityChanged = current.authenticated !== initial.authenticated || current.user?.email !== initial.user?.email;
      if (identityChanged) {
        window.dispatchEvent(new Event('care:account-ended'));
        discardReadingHistory();
      }
      if (library && !current.authenticated && current.beta_enabled !== false) location.replace(loginURL(location.pathname + location.search + location.hash));
      else if (identityChanged || current.beta_enabled !== initial.beta_enabled || current.can_manage_site !== initial.can_manage_site) location.reload();
    } catch { /* Retain the reading during a temporary connection failure. */ }
    finally { checking = false; }
  };
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
  window.setInterval(check, 60000);
}
