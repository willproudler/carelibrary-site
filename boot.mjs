// Keep a dependency/network failure from leaving the beta loading mark forever.
import('./public-app.mjs?v=d0c876207d90a4a4').catch(()=>{
 const host=document.querySelector('#reader');
 const message=document.createElement('p');message.textContent='CARE Library could not load. Check your connection and try again.';
 const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();
 host.classList.add('loading');host.replaceChildren(message,retry);
});
