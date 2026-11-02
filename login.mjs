import {session, postJSON, libraryDestination} from './auth.mjs';

const form = document.querySelector('#login-form');
const button = form.querySelector('[type=submit]');
const status = document.querySelector('#form-status');
const password = form.elements.password;
const destination = libraryDestination(new URLSearchParams(location.search).get('next') || '/library.html', location.hash);
const show = message => { status.textContent = message; status.hidden = !message; };

document.querySelector('[data-toggle-password]').addEventListener('click', event => {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  event.currentTarget.textContent = visible ? 'Hide' : 'Show';
  event.currentTarget.setAttribute('aria-pressed', String(visible));
  event.currentTarget.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled || !form.reportValidity()) return;
  button.disabled = true;
  button.textContent = 'Logging in…';
  show('');
  try {
    await postJSON('/api/login', {email:form.elements.email.value.trim(), password:password.value});
    password.value = '';
    try { localStorage.setItem('care-beta-login', String(Date.now())); } catch {}
    location.replace(destination);
  } catch (error) {
    show(error.message);
    password.value = '';
    password.focus();
    button.disabled = false;
    button.textContent = 'Log in';
  }
});

try {
  const current = await session();
  if (current.authenticated) location.replace(destination);
  else button.disabled = false;
} catch (error) { show(error.message); }
