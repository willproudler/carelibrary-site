// Match the Mac reader's opt-in appearance, ignoring the retired v1 preference.
try { document.body.dataset.careVibrantView = String(localStorage.getItem('care-vibrant-view-v2') === 'true'); } catch (_) { document.body.dataset.careVibrantView = 'false'; }
document.body.dataset.careVibrantViewVersion = '2';
// Keep a dependency/network failure from leaving the beta loading mark forever.
import('./public-app.mjs?v=aefc8861e610f34d').catch(()=>{
 const host=document.querySelector('#reader');
 const message=document.createElement('p');message.textContent='CARE Library could not load. Check your connection and try again.';
 const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();
 host.classList.add('loading');host.replaceChildren(message,retry);
});
