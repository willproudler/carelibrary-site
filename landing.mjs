import {session, legacyLibraryDestination, watchSession, bindLogout, prepareAccountStorage, preparePublicStorage, showSessionNavigation} from './auth.mjs';

const legacy = legacyLibraryDestination(location.hash, location.search);
if (legacy) {
  location.replace(legacy);
} else {
  try {
    const current = await session();
    if (current.beta_enabled === false && location.pathname !== '/discover.html') {
      location.replace('/library.html' + location.search + location.hash);
    } else if (current.authenticated || current.beta_enabled === false) {
      if (current.authenticated) {
        document.documentElement.dataset.careAccount = current.user.email;
        delete document.documentElement.dataset.carePublicMode;
        prepareAccountStorage(current.user.email);
      } else {
        delete document.documentElement.dataset.careAccount;
        document.documentElement.dataset.carePublicMode = 'true';
        preparePublicStorage();
      }
      document.querySelectorAll('[data-guest-only]').forEach(element => { element.hidden = true; });
      document.querySelectorAll('[data-members-only]').forEach(element => { element.hidden = false; });
      document.querySelectorAll('[data-library-entry]').forEach(link => { link.href = '/library.html'; link.textContent = 'Enter the library ↗'; });
      showSessionNavigation(current);
      bindLogout();
      watchSession(current);
      await Promise.all([
        import('./discover-reader.mjs?v=b831bfdb675f0225'),
        import('./discover-atlas.mjs?v=b831bfdb675f0225'),
        import('./discover-experiments.mjs?v=b831bfdb675f0225'),
      ]);
    } else {
      watchSession(current);
    }
  } catch { /* Discover remains available even when the login service is offline. */ }
}
