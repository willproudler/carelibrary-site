const previews = new Map([
  ['Run Room', {
    kind: 'runs',
    markup: `
      <header><small>CARE STUDIO</small><h2>Run Room</h2><p>See what is happening, keep work moving, and pick up where a run stopped.</p></header>
      <div class="feature-preview-bar"><b>Now</b><span>Needs attention</span><span>History</span><span>Costs</span><span>Build repair</span><span>Sequences</span></div>
      <div class="feature-preview-grid">
        <article><small>CARE BUILD</small><h3>Example reading</h3><p>Reading source chapters</p><progress value="72" max="100"></progress><small>72% · Chapter analysis</small></article>
        <article><small>TRANSLATION</small><h3>Example translation</h3><p>Translation needs attention</p><progress value="94" max="100"></progress><small>94% · Needs review</small></article>
        <article><small>LATERAL</small><h3>Example connection</h3><p>Prepared and ready to run</p><progress value="0" max="100"></progress><small>Waiting to start</small></article>
      </div>
      <h3>Prepare new work</h3>
      <div class="feature-preview-bar"><span>Prepare a CARE build</span><span>Prepare NUMO coverage</span><span>Prepare a Lateral run</span></div>`,
  }],
  ['Collaborate', {
    kind: 'collaborate',
    markup: `
      <article class="feature-preview-paper"><p>Untitled draft</p></article>
      <article class="feature-preview-share">
        <small>CARE STUDIO</small><h2>Collaborate</h2><p>Share a draft with an editor or prepare a copy for review.</p>
        <div class="feature-preview-bar"><b>Invite to edit</b><span>Share for review</span></div>
        <p class="feature-preview-field">Choose an editor</p>
        <span class="feature-preview-action">Share draft</span>
      </article>`,
  }],
  ['Dialogues', {
    kind: 'dialogues',
    markup: `
      <div class="feature-preview-bar"><strong>CARE Dialogues</strong><span class="feature-preview-query">Find a title or author…</span><span>Title · A–Z</span><span>Filters</span><span>More</span></div>
      <header class="feature-preview-shelf-heading"><span>4 example dialogues</span><span>Follow a thought through different voices</span></header>
      <div class="feature-preview-grid feature-preview-books">
        <article><div class="feature-preview-cover"><small>DIALOGUE</small><strong>Reading in Conversation</strong></div><h3>Reading in Conversation</h3><small>Dialogue · CH</small></article>
        <article><div class="feature-preview-cover"><small>DIALOGUE</small><strong>On Thought and Language</strong></div><h3>On Thought and Language</h3><small>Dialogue · CH</small></article>
        <article><div class="feature-preview-cover"><small>DIALOGUE</small><strong>The Shape of a Question</strong></div><h3>The Shape of a Question</h3><small>Dialogue · CH</small></article>
        <article><div class="feature-preview-cover"><small>DIALOGUE</small><strong>Ways of Listening</strong></div><h3>Ways of Listening</h3><small>Dialogue · CH</small></article>
      </div>`,
  }],
  ['CARE Store', {
    kind: 'store',
    markup: `
      <div class="feature-preview-bar"><strong>CARE Store</strong><span class="feature-preview-query">Find a thinker or a book…</span><span>Filters</span></div>
      <div class="feature-preview-bar"><b>Discover</b><span>Collections</span><span>Thinkers</span><span>Periods</span><span>Traditions</span><span>All books</span><span>My downloads</span></div>
      <header class="feature-preview-hero"><small>THE CARE STORE</small><h2>Find your next read.</h2><p>Follow a thinker, explore an era or start with one of our collections.</p></header>
      <h3>Explore collections</h3>
      <div class="feature-preview-grid"><article><h3>Greek philosophy</h3></article><article><h3>Chinese classics</h3></article><article><h3>Myth &amp; folklore</h3></article></div>`,
  }],
  ['Desktop settings', {
    kind: 'settings',
    markup: `
      <aside><h3>Settings</h3><p>Settings overview</p><p>Books &amp; builds</p><p>CARE Operations</p><p>Importer settings</p><p>Library health &amp; repair</p><p>AI settings</p><p>Library storage &amp; backups</p><p>Export settings</p></aside>
      <div class="feature-preview-settings-body">
        <header><small>CARE STUDIO</small><h2>Settings overview</h2><p>Set up CARE, manage your library, and open your saved work and viewers.</p></header>
        <p class="feature-preview-field">Search settings, saved work, or viewers</p>
        <div class="feature-preview-grid"><article><h3>Runs and imports</h3><p>CARE Operations</p><p>Importer settings</p><p>Run Room</p></article><article><h3>Library and connections</h3><p>Library health &amp; repair</p><p>Library storage &amp; backups</p><p>Export settings</p></article></div>
      </div>`,
  }],
]);

export function openFeaturePreview(dialog, name) {
  const heading = dialog.querySelector('#workbench-feature-title');
  heading.textContent = name;
  const preview = previews.get(name);
  dialog.querySelector('.feature-preview-stage')?.remove();
  dialog.classList.toggle('has-feature-preview', Boolean(preview));
  if (preview) {
    if (!dialog.querySelector('.feature-preview-notice')) {
      const notice = dialog.ownerDocument.createElement('div');
      const description = heading.nextElementSibling;
      notice.className = 'feature-preview-notice';
      description.id = 'workbench-feature-description';
      dialog.setAttribute('aria-describedby', description.id);
      heading.before(notice);
      notice.append(heading, description);
    }
    const stage = dialog.ownerDocument.createElement('div');
    stage.className = 'feature-preview-stage';
    stage.dataset.preview = preview.kind;
    stage.setAttribute('inert', '');
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = preview.markup;
    dialog.prepend(stage);
  }
  if (!dialog.open) dialog.showModal();
}
