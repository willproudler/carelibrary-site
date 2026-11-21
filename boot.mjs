// Match the Mac reader's opt-in appearance, ignoring the retired v1 preference.
try { document.body.dataset.careVibrantView = String(localStorage.getItem('care-vibrant-view-v2') === 'true'); } catch (_) { document.body.dataset.careVibrantView = 'false'; }
document.body.dataset.careVibrantViewVersion = '2';
// Begin the catalogue and styles while the browser downloads the reader's module graph.
async function openLibrary() {
 let resourcesLoaded = false;
 try {
  const [app, loader, [css, scope]] = await Promise.all([
   import('./public-app.mjs?v=8d2763a9327f47d2'),
   import('./library-loader.mjs?v=20261018').then(module => module.loadLibrary()),
   import('./resource-loader.mjs?v=20261018').then(({loadText}) => Promise.all([
    loadText('./native/study-desk.css?v=8d2763a9327f47d2'),
    loadText('./native/public-scope.css?v=8d2763a9327f47d2'),
   ])),
  ]);
  resourcesLoaded = true;
  await app.start(loader, css, scope);
  window.CARELibraryBoot?.ready();
 } catch (error) {
  const boot = window.CARELibraryBoot;
  if (!boot) throw error;
  if (resourcesLoaded) boot.fail(error);
  else boot.retryStartup(error);
 }
}

openLibrary().catch(error=>{
 const host=document.querySelector('#reader');
 const message=document.createElement('p');message.textContent=error.message || 'CARE Library could not load. Check your connection and try again.';
 const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();
 host.classList.add('loading');host.replaceChildren(message,retry);
});
