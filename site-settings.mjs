import {postJSON, bindLogout} from './auth.mjs';

function validSettings(value) {
  if (!value || typeof value.beta_enabled !== 'boolean' || !Number.isSafeInteger(value.revision) || value.revision < 0) {
    throw Error('The current setting could not be verified. Refresh it before making a change.');
  }
  return {beta_enabled:value.beta_enabled, revision:value.revision};
}

export async function readSiteSettings(fetcher = globalThis.fetch) {
  const response = await fetcher('/api/site-settings', {credentials:'same-origin', cache:'no-store'});
  let value;
  try { value = await response.json(); } catch { throw Error('Website settings are unavailable. Please try again.'); }
  if (!response.ok) {
    const error = Error(value?.error || 'Website settings are unavailable. Please try again.');
    error.status = response.status;
    throw error;
  }
  return validSettings(value);
}

export function createBetaSettings({read = readSiteSettings, save = body => postJSON('/api/site-settings', body), changed = () => {}} = {}) {
  let state = {current:null, selected:null, revision:null, loading:false, saving:false, needsRefresh:true, needsLogin:false, error:'', message:''};
  const snapshot = () => ({...state, canSave:typeof state.selected === 'boolean' && state.selected !== state.current && Number.isSafeInteger(state.revision) && !state.loading && !state.saving && !state.needsRefresh});
  const emit = () => changed(snapshot());
  return {
    snapshot,
    select(value) {
      if (state.loading || state.saving || typeof state.selected !== 'boolean' || typeof value !== 'boolean') return;
      state = {...state, selected:value, message:''}; emit();
    },
    async reload({preserveChoice = true} = {}) {
      if (state.loading || state.saving) return;
      state = {...state, loading:true, error:'', message:''}; emit();
      try {
        const value = validSettings(await read());
        const selected = preserveChoice && typeof state.selected === 'boolean' ? state.selected : value.beta_enabled;
        state = {...state, current:value.beta_enabled, selected, revision:value.revision, needsRefresh:false, needsLogin:false};
      } catch (error) {
        state = {...state, error:error.message || 'Website settings are unavailable. Please try again.', needsRefresh:true, needsLogin:error.status === 401};
      } finally { state = {...state, loading:false}; emit(); }
    },
    async submit() {
      if (!snapshot().canSave) return false;
      const selected = state.selected;
      state = {...state, saving:true, error:'', message:''}; emit();
      try {
        const value = validSettings(await save({beta_enabled:selected, revision:state.revision}));
        if (value.beta_enabled !== selected || value.revision <= state.revision) throw Error('The saved setting could not be verified. Refresh it before trying again.');
        state = {...state, current:value.beta_enabled, selected:value.beta_enabled, revision:value.revision, needsRefresh:false, needsLogin:false,
          message:value.beta_enabled ? 'Saved. Visitors now land on Discover and must log in to enter the library.' : 'Saved. Anyone can now open the library directly, without logging in.'};
        return true;
      } catch (error) {
        state = {...state, error:error.status === 409 ? 'This setting changed elsewhere. Refresh the current setting before saving your choice.' : error.message || 'The change could not be saved. Please try again.',
          needsRefresh:[401,403,409].includes(error.status) || !Number.isInteger(error.status), needsLogin:error.status === 401};
        return false;
      } finally { state = {...state, saving:false}; emit(); }
    },
  };
}

export async function mountSiteSettings(doc = globalThis.document) {
  const form = doc.querySelector('#site-settings-form');
  const toggle = form.elements.beta_enabled;
  const button = doc.querySelector('#save-settings');
  const refresh = doc.querySelector('#refresh-settings');
  const error = doc.querySelector('#settings-error');
  const message = doc.querySelector('#settings-success');
  const current = doc.querySelector('#saved-mode');
  const login = doc.querySelector('#settings-login');
  const controller = createBetaSettings({changed:state => {
    toggle.checked = state.selected === true;
    toggle.hidden = state.selected === null;
    toggle.disabled = state.loading || state.saving || state.selected === null;
    button.disabled = !state.canSave;
    button.textContent = state.saving ? 'Saving…' : 'Save changes';
    current.textContent = state.loading ? 'Loading the current setting…' : state.current === null ? 'The current setting has not been verified.' : `Currently saved: beta mode ${state.current ? 'on' : 'off'}.${state.selected !== state.current ? ' You have an unsaved change.' : ''}`;
    error.textContent = state.error; error.hidden = !state.error;
    message.textContent = state.message; message.hidden = !state.message;
    refresh.hidden = !state.needsRefresh || state.loading;
    refresh.disabled = state.saving;
    login.hidden = !state.needsLogin;
  }});
  toggle.addEventListener('change', () => controller.select(toggle.checked));
  refresh.addEventListener('click', () => controller.reload());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (await controller.submit()) {
      try { localStorage.setItem('care-beta-mode', String(Date.now())); } catch {}
    }
  });
  bindLogout();
  await controller.reload({preserveChoice:false});
  return controller;
}

if (typeof document !== 'undefined' && document.querySelector('#site-settings-form')) mountSiteSettings();
