// Release identity is captured once for this open workspace, so a later server
// update cannot silently change the version shown for an already-open page.
const release = fetch('/care-version.json', {cache:'no-store', credentials:'same-origin'})
  .then(response => {
    if (!response.ok) throw new Error('Release details could not be loaded.');
    return response.json();
  }).catch(() => null);

export function releaseRows(value) {
  if (!value || typeof value.version !== 'string' || typeof value.build !== 'string') return [];
  return [
    ['Version', value.version], ['Build', value.build], ['Edition', 'Web beta'],
    ...(typeof value.released_at === 'string' ? [['Released', value.released_at.slice(0, 10)]] : []),
  ];
}

export async function showAboutCare() {
  let dialog = document.querySelector('#care-about-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'care-about-dialog';
    dialog.setAttribute('aria-labelledby', 'care-about-title');
    dialog.innerHTML = '<div class="dialog-heading"><h2 id="care-about-title">CARE Library</h2><button type="button" aria-label="Close About CARE Library">×</button></div><p class="care-about-description">A place to read, write and follow ideas.</p><dl class="care-about-details"></dl><p class="care-about-status" role="status">Loading version details…</p>';
    dialog.querySelector('button').onclick = () => dialog.close();
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    document.body.append(dialog);
  }
  document.querySelector('#workbench-library-menu')?.removeAttribute('open');
  if (!dialog.open) dialog.showModal();
  const value = await release;
  const rows = releaseRows(value);
  const details = dialog.querySelector('.care-about-details');
  details.replaceChildren();
  for (const [label, value] of rows) {
    const term = document.createElement('dt'), description = document.createElement('dd');
    term.textContent = label; description.textContent = value;
    details.append(term, description);
  }
  dialog.querySelector('.care-about-status').textContent = rows.length ? '' : 'Version details are unavailable. Reopen CARE Library to try again.';
}

if (typeof document !== 'undefined') {
  document.querySelector('[data-care-about]')?.addEventListener('click', showAboutCare);
  window.addEventListener('care-open-about', showAboutCare);
}
