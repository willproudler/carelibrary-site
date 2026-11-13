import {session, loginURL, bindLogout, watchSession, prepareAccountStorage, preparePublicStorage, showSessionNavigation} from './auth.mjs';

try {
  const current = await session();
  if (!current.authenticated && current.beta_enabled !== false) {
    location.replace(loginURL(location.pathname + location.search + location.hash));
  } else {
    if(current.local_preview)document.documentElement.dataset.careLocalPreview='true';
    if (current.authenticated) {
      document.documentElement.dataset.careAccount = current.user.email;
      delete document.documentElement.dataset.carePublicMode;
      prepareAccountStorage(current.user.email);
    } else {
      delete document.documentElement.dataset.careAccount;
      document.documentElement.dataset.carePublicMode = 'true';
      preparePublicStorage();
    }
    showSessionNavigation(current);
    bindLogout();
    watchSession(current, {library:true});
    await import('./boot.mjs?v=82e4a049abe7cf57');
  }
} catch (error) {
  if(window.CARELibraryBoot){window.CARELibraryBoot.fail(error);}else{
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
}
