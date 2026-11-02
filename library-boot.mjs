import {session, loginURL, bindLogout, watchSession, prepareAccountStorage} from './auth.mjs';

try {
  const current = await session();
  if (!current.authenticated) {
    location.replace(loginURL(location.pathname + location.search + location.hash));
  } else {
    document.documentElement.dataset.careAccount = current.user.email;
    prepareAccountStorage(current.user.email);
    bindLogout();
    watchSession(current.user.email);
    await import('./boot.mjs?v=b831bfdb675f0225');
  }
} catch (error) {
  const host = document.querySelector('#reader');
  const message = document.createElement('p');
  message.className = 'loading';
  message.textContent = error.message + ' ';
  const link = document.createElement('a');
  link.href = loginURL(location.pathname + location.search + location.hash);
  link.textContent = 'Return to login';
  message.append(link);
  host.replaceChildren(message);
}
