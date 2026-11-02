import {postJSON} from './auth.mjs';

const form = document.querySelector('#access-form');
const button = form.querySelector('[type=submit]');
const status = document.querySelector('#form-status');
const preview = document.querySelector('#access-preview');
try {
  const response = await fetch('/api/access-requests/config', {cache:'no-store', credentials:'same-origin'});
  if (!response.ok) throw Error();
  const config = await response.json();
  preview.hidden = config.email_delivery_ready === true;
  button.disabled = config.email_delivery_ready !== true;
} catch {
  status.hidden = false;
  status.textContent = 'Access requests are unavailable at the moment. Please try again shortly.';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled || !form.reportValidity()) return;
  button.disabled = true;
  button.textContent = 'Sending request…';
  status.hidden = true;
  try {
    const result = await postJSON('/api/access-requests', {name:form.elements.name.value.trim(), email:form.elements.email.value.trim(), website:form.elements.website.value});
    form.hidden = true;
    const confirmation = document.querySelector('#access-confirmation');
    confirmation.hidden = false;
    confirmation.querySelector('h2').textContent = result.delivered ? 'Thank you for your interest.' : 'Your request is saved.';
    confirmation.querySelector('p').textContent = result.message || (result.delivered ? 'Your request has been sent to Will and Ian. We’ll get back to you by email.' : 'Your request is saved. Email delivery is still pending.');
    confirmation.focus();
  } catch (error) {
    status.textContent = error.message;
    status.hidden = false;
    button.disabled = false;
    button.textContent = 'Request access';
  }
});
