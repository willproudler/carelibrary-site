// Restore the reader appearance before the library has finished loading.
try { document.body.dataset.careVibrantView = String(localStorage.getItem('care-vibrant-view-v1') === 'true'); } catch (_) {}
// Keep a dependency/network failure from leaving the beta loading mark forever.
import('./public-app.mjs?v=d6fb94305f051e89').catch(()=>{
 const host=document.querySelector('#reader');
 const message=document.createElement('p');message.textContent='CARE Library could not load. Check your connection and try again.';
 const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();
 host.classList.add('loading');host.replaceChildren(message,retry);
});
