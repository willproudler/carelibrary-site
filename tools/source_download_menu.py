"""Public source file links grouped by edition and language."""
from html import escape

LABELS = {'pdf': 'PDF', 'epub': 'EPUB', 'docx': 'Word', 'md': 'Markdown', 'txt': 'TXT'}
ORDER = tuple(LABELS)


def file_links(rows):
    files = {row['format']: row for row in rows if row.get('format') in LABELS}
    return ''.join('<a download href="' + escape(files[fmt]['url'], quote=True) + '">' + LABELS[fmt] + '</a>'
                   for fmt in ORDER if fmt in files)


def language_downloads(editions):
    """Additional language editions supplied in the reading tools."""
    groups = []
    for row in editions:
        if not row.get('downloads'):
            continue
        name = row.get('language_name') or row['language_code']
        provenance = 'original' if row.get('kind') == 'original' else (
            'saved machine translation' if row.get('rendition_type') == 'machine' else 'saved translation')
        links = '<div class="download-links">' + file_links(row['downloads']) + '</div>'
        if row.get('axiom_downloads'):
            links += ('<details class="download-axioms"><summary>Include saved CARE axioms</summary>'
                      '<p>Appends the whole-book axioms as a separate CARE commentary.</p><div class="download-links">'
                      + file_links(row['axiom_downloads']) + '</div></details>')
        groups.append('<div class="download-edition"><strong>' + escape(name) + '</strong> · ' + provenance + links + '</div>')
    return ''.join(groups)
