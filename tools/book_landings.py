"""Reviewed editorial context and literal published-heading reading maps.

This web presentation does not change saved source text or CARE readings.
Unreviewed books get a map of informative existing titles, never a generated
synopsis or a fabricated list of subjects.
"""
from __future__ import annotations

import re
import unicodedata

TIMAEUS_WORK = 'WORK_STORE_PERSEUS_GREEK_TLG0059_TLG031_PERSEUS_GRC2'
_TIMAEUS_OVERVIEW = (
    'Plato’s Timaeus begins with Socrates recalling an ideal city and Critias introducing the story of Atlantis. Timaeus then turns the conversation towards the origin and order of the cosmos and the place of human beings within it.',
    'A divine Craftsman, the Demiurge, orders the world after an eternal model. The account connects the world soul, the motions of the heavens and the emergence of time. It then considers necessity and the receptacle, or chōra, alongside the geometrical construction of the four elements from triangles.',
    'The final movement follows the formation of human bodies and souls into anatomy, sensation, health and disorder, including discussion of the liver. The original citation pages, close readings and whole-book structural reading below offer different ways through the published edition.',
)
_TIMAEUS_DESCRIPTION = 'Plato’s Timaeus: the Demiurge, world soul, time and receptacle (chōra). An editorial overview, original text, close readings and structural analysis.'
_GENERIC = {
    'book','chapter','section','part','theorem','question','article','passage','reading','volume',
    'first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth',
    'one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty',
    'eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth','twentieth',
    'premiere','deuxieme','troisieme','quatrieme','cinquieme','sixieme','septieme','huitieme','neuvieme','dixieme','partie',
    'introduction','intro','preface','contents','index','appendix','bibliography','front','matter','prologue',
    'summary','conclusion',
    'by','of','the','to','and','a','an','on','for','in','edition','from',
}


def is_timaeus(work: dict) -> bool:
    return work.get('id') == TIMAEUS_WORK


def has_stephanus_pages(work: dict) -> bool:
    return is_timaeus(work) and 'tlg0059.tlg031.perseus-grc2' in str(work.get('source_url') or '')


def source_page_number(work: dict, source: dict) -> int | None:
    if not has_stephanus_pages(work):
        return None
    match = re.fullmatch(r'Section\s+(\d+)', str(source.get('title') or ''), re.I)
    number = int(match[1]) if match else 0
    return number if 17 <= number <= 92 else None


def source_label(work: dict, source: dict, fallback: str = '') -> str:
    if page := source_page_number(work, source):
        return f'Stephanus page {page}'
    return str(source.get('title') or fallback)


def _informative(title: str, work: dict) -> bool:
    normalized = ''.join(char for char in unicodedata.normalize('NFKD', title).casefold()
                         if not unicodedata.combining(char))
    words = re.findall(r'[^\W\d_]+', normalized, re.UNICODE)
    if re.fullmatch(r'(?:theorem|theor|theory)[ivxlcdm]+', ''.join(words)):
        return False
    meaningful = [word for word in words if word not in _GENERIC and not re.fullmatch(r'[ivxlcdm]+', word)]
    if not meaningful:
        return False
    if title.strip().casefold() in {str(work.get('title') or '').casefold(), str(work.get('author') or '').casefold()}:
        return False
    if normalized.startswith('by '):
        return False
    # CARE's template section labels are not topics of a source book.
    return normalized.strip() not in {'argumental spine','book-scale argumental spine','load-bearing axioms','global load-bearing axioms','argument flow map','hidden system image','minimal reconstruction test'}


def reading_map(work: dict, *, limit: int = 4) -> list[dict]:
    sources = [source for source in work.get('sources', []) if isinstance(source, dict) and source.get('id')]
    source_order = {source['id']: index for index, source in enumerate(sources)}
    chapter_source = {source.get('chapter_id'): source['id'] for source in sources if source.get('chapter_id')}
    candidates = []
    for index, unit in enumerate(work.get('units', [])):
        if not isinstance(unit, dict) or unit.get('layer') != 'CH' or not unit.get('id'):
            continue
        translations = [value for value in unit.get('translations', []) if isinstance(value, dict) and value.get('language_code') == 'en']
        titles = [str(value.get('title') or '').strip() for value in translations]
        titles.append(str(unit.get('title') or '').strip())
        title = next((value for value in titles if _informative(value, work)), '')
        if not title:
            continue
        parents = unit.get('parents') or []
        source_id = next((identity for identity in parents if identity in source_order), chapter_source.get(unit['id']))
        order = source_order.get(source_id, len(sources) + index)
        candidates.append((order, {'kind':'reading','id':unit['id'],'title':title,'basis':'Published close-reading title'}))
    if not candidates:
        for index, source in enumerate(sources):
            title = str(source.get('title') or '').strip()
            if _informative(title, work):
                candidates.append((index, {'kind':'source','id':source['id'],'title':title,'basis':'Published source heading'}))
    unique=[];seen=set()
    for _, candidate in sorted(candidates, key=lambda value:value[0]):
        key=' '.join(candidate['title'].casefold().split())
        if key not in seen:
            unique.append(candidate);seen.add(key)
    if len(unique) <= limit:
        return unique
    indexes = [round(index*(len(unique)-1)/(limit-1)) for index in range(limit)] if limit>1 else [0]
    return [unique[index] for index in indexes]


def landing_metadata(work: dict) -> dict:
    if is_timaeus(work):
        sources = [source for source in work.get('sources', []) if isinstance(source, dict)]
        by_page = {source_page_number(work, source):source['id'] for source in sources if source.get('id')}
        cues = ((28,'Demiurge / divine Craftsman'),(34,'World soul'),(48,'Receptacle (chōra)'),
                (53,'Geometrical elements'),(69,'Human body and soul'),(71,'The liver'))
        return {'description':_TIMAEUS_DESCRIPTION,'overview':list(_TIMAEUS_OVERVIEW),
                'overview_label':'Overview of the work · editorial guide',
                'references':[{'label':'Timaeus in Jowett’s English translation','url':'https://www.gutenberg.org/files/1572/1572-h/1572-h.htm'},
                              {'label':'Plato’s Timaeus · Stanford Encyclopedia of Philosophy','url':'https://plato.stanford.edu/entries/plato-timaeus/'}],
                'topics':[{'title':title,'source_id':by_page[page],'citation':f'Stephanus page {page}'} for page,title in cues if page in by_page],
                'citation_note':'Source links follow Stephanus page numbers in the published Perseus Greek edition.' if has_stephanus_pages(work) else '',
                'reading_map':[]}
    topics = reading_map(work)
    description = str(work.get('description') or '').strip()
    if not description and topics:
        names = '; '.join(topic['title'] for topic in topics[:2])
        description = f"{work['title']} by {work['author']}. Explore {names} through the original text and saved close readings."
    return {'description':description,'overview':[],'references':[],'topics':[],'citation_note':'','reading_map':topics}
