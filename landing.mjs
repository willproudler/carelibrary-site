import {session, legacyLibraryDestination, watchSession, bindLogout, prepareAccountStorage} from './auth.mjs';

const legacy = legacyLibraryDestination(location.hash, location.search);
if (legacy) {
  location.replace(legacy);
} else {
  try {
    const current = await session();
    if (current.authenticated) {
      document.documentElement.dataset.careAccount = current.user.email;
      prepareAccountStorage(current.user.email);
      document.querySelectorAll('[data-guest-only]').forEach(element => { element.hidden = true; });
      document.querySelectorAll('[data-members-only]').forEach(element => { element.hidden = false; });
      document.querySelectorAll('[data-library-entry]').forEach(link => { link.href = '/library.html'; link.textContent = 'Enter the library ↗'; });
      bindLogout();
      watchSession(current.user.email);
      await Promise.all([
        import('./discover-reader.mjs?v=b831bfdb675f0225'),
        import('./discover-atlas.mjs?v=b831bfdb675f0225'),
        import('./discover-experiments.mjs?v=b831bfdb675f0225'),
      ]);
    }
  } catch { /* Discover remains available even when the login service is offline. */ }
}
