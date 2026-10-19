/* Read-only selection of translations already included in the public release.
 * This module never generates text, fetches records, or changes reference IDs. */
const array = value => Array.isArray(value) ? value : [];
export const ORIGINAL = 'original';
const names = {en:'English',fr:'French',de:'German'};
const panes = work => [...array(work?.sources),...array(work?.units)];
export function originalLanguage(unit, work) {
  const code = unit?.language_code || work?.language_code || 'en';
  return {code,name:names[code] || unit?.language_name || work?.language_name || code};
}
export function savedVariants(unit) {
  return array(unit?.translations).filter(row=>row?.id && row.language_code && (Array.isArray(row.sections) || Array.isArray(row.paragraphs)));
}
export function readingLanguage(work, state = {}) {
  const chosen = state.readingLanguages?.[work?.id];
  if(chosen !== undefined)return chosen;
  return panes(work).some(unit=>savedVariants(unit).some(row=>row.language_code === 'en')) ? 'en' : ORIGINAL;
}
export function selectedVariant(unit, work, state = {}) {
  const choices = savedVariants(unit), explicit = state.paneVersions?.[unit.id];
  if(explicit !== undefined)return choices.find(row=>row.id === explicit) || null;
  const language = readingLanguage(work,state);
  return language !== ORIGINAL ? choices.find(row=>row.language_code === language) || null : null;
}
export function originalLabels(unit, work, state = {}) {
  const explicit = state.paneVersions?.[unit?.id];
  return explicit === ORIGINAL || explicit === undefined && state.readingLanguages?.[work?.id] === ORIGINAL;
}
// Clean OCR spacing only when the original identifies this as a theorem.
// The recorded numeral and saved translation remain unchanged.
const theoremNumber = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f\s]/g,'').match(/^THEOR(?:EMA|EM|Y)?\.?([IVXLCDM]+)\.?$/i)?.[1]?.toUpperCase();
function translatedTitle(value, unit, variant) {
  const number = variant?.language_code === 'en' && theoremNumber(unit.original_title || unit.title) && theoremNumber(value);
  return number ? `Theorem ${number}.` : value;
}
function savedPaneTitle(unit, work, state = {}) {
  const variant = selectedVariant(unit,work,state);
  return translatedTitle(variant?.title || (originalLabels(unit,work,state) ? unit.original_title || unit.title : unit.title),unit,variant);
}
const titleLabel = value => typeof value === 'string' ? value.trim() : '';
const titleKey = value => titleLabel(value).replace(/\.$/,'').trim();
function sectionNumber(value) {
  const label = titleKey(value);
  if (/^\d+$/.test(label)) return Number(label);
  if (!/^(?=[IVXLCDM]+$)M{0,4}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/.test(label)) return null;
  const values = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
  return [...label].reduce((sum,letter,index) => sum + (values[letter] < (values[label[index + 1]] || 0) ? -values[letter] : values[letter]),0);
}
function openingHeadings(reading, represented = []) {
  const result = [], rows = array(reading?.paragraphs);
  for (const row of (rows.length ? rows : [{text:reading?.text}])) {
    let lineIndex = 0;
    for (const line of String(row?.text || '').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const heading = line.match(/^ {0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/)
        || (represented.some(value=>titleKey(value) === titleKey(line)) ? [line,line.trim()] : null);
      if (!heading) return result;
      result.push({id:row.id || '',line:lineIndex++,title:heading[1].trim()});
    }
  }
  return result;
}
function sourceInLanguage(source, work, language) {
  return originalLanguage(source,work).code === language ? source : savedVariants(source).find(row=>row.language_code === language) || null;
}
function savedHeadingLabel(label, work, language) {
  const key = titleKey(label), matches = new Set();
  const add = (original,translated) => {if (titleKey(original) === key && titleLabel(translated)) matches.add(titleLabel(translated));};
  for (const pane of panes(work)) {
    if (pane.title_language_code === language) add(pane.original_title,pane.title);
    const translated = sourceInLanguage(pane,work,language);
    if (!translated || translated === pane) continue;
    add(pane.original_title || pane.title,translated.title);
    if (!translated.source_section_label || sectionNumber(translated.source_section_label) === sectionNumber(pane.source_section_label))
      add(pane.source_title_context,translated.source_title_context);
    const originals = openingHeadings(pane), saved = openingHeadings(translated);
    for (const heading of originals) {
      const aligned = heading.id && saved.find(row=>row.id === heading.id && row.line === heading.line);
      if (aligned) add(heading.title,aligned.title);
    }
  }
  return matches.size === 1 ? [...matches][0] : '';
}
function sourceTitleProfile(source, work, language, reading, label) {
  const number = sectionNumber(label);
  const readingLanguage = reading === source ? originalLanguage(source,work).code : reading?.language_code;
  let parent = '', hierarchy = [];
  const canonicalParent = titleLabel(source.source_title_context);
  const canonicalNumber = sectionNumber(source.source_section_label);
  if (number !== null && canonicalParent && canonicalNumber === number) {
    if (reading === source && readingLanguage === language) {
      parent = canonicalParent;
      hierarchy = array(source.source_title_hierarchy).map(titleLabel).filter(Boolean);
    } else {
      const translated = reading !== source && (!reading?.source_section_label || sectionNumber(reading.source_section_label) === number) ? reading : null;
      // The verified original parent is preferable to an ambiguous bare number
      // when this heading has no saved translation. Never invent a translation.
      parent = titleLabel(translated?.source_title_context) || savedHeadingLabel(canonicalParent,work,language) || canonicalParent;
      hierarchy = Array.isArray(translated?.source_title_hierarchy)
        ? translated.source_title_hierarchy.map(titleLabel).filter(Boolean)
        : array(source.source_title_hierarchy).map(value=>savedHeadingLabel(value,work,language)).filter(Boolean);
    }
  }
  // Older public exports may lack verified hierarchy metadata. Only explicit
  // opening headings, carried through an uninterrupted numbered run, qualify.
  if (number !== null && !parent && reading && readingLanguage === language) {
    let cursor = array(work?.sources).findIndex(row=>row.id === source.id), expected = number, candidate = reading;
    while (cursor >= 0 && candidate) {
      const titles = openingHeadings(candidate).map(row=>row.title).filter(value=>sectionNumber(value) === null);
      if (titles.length) {parent=titles.at(-1);hierarchy=titles.slice(0,-1);break;}
      if (expected <= 1) break;
      const previous = work.sources[--cursor];
      if (!previous) break;
      if (canonicalParent) {
        const previousParent = titleLabel(previous.source_title_context) || openingHeadings(previous).map(row=>row.title).filter(value=>sectionNumber(value) === null).at(-1);
        if (titleKey(previousParent) !== titleKey(canonicalParent)) break;
      }
      candidate = sourceInLanguage(previous,work,language);
      if (!candidate || sectionNumber(candidate.title || previous.title) !== expected - 1) break;
      expected--;
    }
  }
  const composed = parent ? `${titleKey(parent)} · ${titleKey(label)}` : label;
  const context = parent ? hierarchy.map(titleKey).filter(Boolean).join(' · ') : '';
  const represented = [label, ...(parent ? [parent,...hierarchy] : [])];
  return {title:composed,reading_title:composed,reading_title_context:context,
    reading_heading_titles:[...new Set(openingHeadings(reading,represented).filter(row=>represented.some(value=>titleKey(value) === titleKey(row.title))).map(row=>row.title))]};
}
export function paneReadingTitle(unit, work, state = {}) {
  const label = savedPaneTitle(unit,work,state);
  const source = Array.isArray(unit?.paragraphs) || unit?.layer === 'SOURCE' ? unit
    : unit?.layer === 'CH' ? array(work?.sources).find(row=>row.chapter_id === unit.id) : null;
  if (!source) return {title:label};
  const variant = selectedVariant(unit,work,state), isOriginal = !variant && originalLabels(unit,work,state);
  const language = variant?.language_code || (isOriginal ? originalLanguage(unit,work).code : unit.title_language_code || originalLanguage(unit,work).code);
  const reading = source.id === unit.id ? variant || source : sourceInLanguage(source,work,language);
  return sourceTitleProfile(source,work,language,reading,label);
}
export function paneTitle(unit, work, state = {}) {
  return paneReadingTitle(unit,work,state).title;
}
export function bookTitle(work, state = {}) {
  if(readingLanguage(work,state) === ORIGINAL)return work.original_title || work.title;
  // Some catalogue titles deliberately retain the original name. A saved
  // whole-book translation supplies its English reading label without renaming it.
  if(work.original_title && work.title === work.original_title){
    const whole = array(work.units).find(unit=>unit.layer === 'WB');
    const variant = whole && selectedVariant(whole,work,state);
    if(variant?.title)return variant.title;
  }
  return work.title;
}
export function paneIdentity(unit, work, state = {}) {
  const variant = selectedVariant(unit,work,state), identity = {...unit.identity,...variant?.identity};
  const contextual = value => {
    const reading = paneReadingTitle(unit,work,state);
    return {...value,...(reading.reading_title_context ? {context:reading.reading_title_context} : {})};
  };
  if(!variant && originalLabels(unit,work,state))return contextual({...identity,
    ...(identity.original_context ? {context:identity.original_context} : {}),
    ...(identity.original_kicker ? {kicker:identity.original_kicker} : {})});
  const languageState = variant ? {...state,readingLanguages:{...state.readingLanguages,[work?.id]:variant.language_code}} : state;
  const label = work && bookTitle(work,languageState);
  if(identity.kicker && work?.original_title && label)identity.kicker = identity.kicker.split(work.original_title).join(label);
  if(variant?.language_code === 'en' && work?.original_title === 'Monas Hieroglyphica' && identity.context){
    identity.context = identity.context.split(' · ').map(part=>theoremNumber(part) ? `Theorem ${theoremNumber(part)}.` : part).join(' · ');
  }
  return contextual(identity);
}
export function sourceReadingText(value, unit, work, state = {}) {
  const variant = selectedVariant(unit,work,state);
  if(variant?.language_code !== 'en')return value;
  return String(value).split('\n').map(line=>{
    const heading = line.match(/^(#{1,6}\s+)?([\s\S]*)$/), label = translatedTitle(heading[2],unit,variant);
    if(label !== heading[2])return (heading[1] || '') + label;
    // This running heading is part of the saved Monas source rendition.
    // Restrict the replacement to a whole line, with an optional page number.
    if(work?.original_title === 'Monas Hieroglyphica')return line.replace(/^(\s*(?:\d+\s+)?)M\s*O\s*N\s*A\s*S\s*$/i,'$1MONAD');
    return line;
  }).join('\n');
}
const renditionLabel = row => row.rendition_type === 'supplied' ? 'supplied translation' : 'saved machine translation';
export function paneLanguages(unit, work, state = {}) {
  const original = originalLanguage(unit,work), selected = selectedVariant(unit,work,state);
  const source = unit.layer === 'SOURCE' || Array.isArray(unit.paragraphs);
  const translatedMessage = source ? selected?.rendition_type === 'supplied' ? 'Supplied source translation. Recorded references still lead to the original source passages.' : 'Saved machine translation of the source text. The original remains available.' : 'Saved machine translation of CARE analysis. References lead to the original source passages.';
  return {unit_id:unit.id,work_id:work?.id || '',title:paneTitle(unit,work,state),
    selected_id:selected?.id || ORIGINAL,language_code:selected?.language_code || original.code,
    language_name:selected?.language_name || original.name,is_translation:Boolean(selected),rendition_type:selected?.rendition_type || (selected?'machine':'original'),
    options:[{id:ORIGINAL,language_code:original.code,label:`${original.name} · original`,available:true},
      ...savedVariants(unit).map(row=>({id:row.id,language_code:row.language_code,label:`${row.language_name || names[row.language_code] || row.language_code} · ${renditionLabel(row)}`,available:true}))],
    can_translate:false,language_options:[],
    message:selected?translatedMessage:savedVariants(unit).length?'Choose an existing saved translation of this pane. Its references and original source stay available.':'This pane is available only in its original language. No saved translation is available.'};
}
export function bookLanguages(work, state = {}) {
  const original = originalLanguage(null,work), all = panes(work), languages = new Map();
  for(const variant of all.flatMap(savedVariants))languages.set(variant.language_code,variant.language_name || names[variant.language_code] || variant.language_code);
  const selected = readingLanguage(work,state), selectedCount = all.filter(unit=>selectedVariant(unit,work,state)).length;
  const counts = [...languages].map(([code,name])=>({code,name,count:all.filter(unit=>savedVariants(unit).some(row=>row.language_code===code)).length}));
  const hasOverrides = all.some(unit=>Object.hasOwn(state.paneVersions || {},unit.id));
  const summary = selectedCount ? `${selectedCount} of ${all.length} reading panes use saved translations. Other panes use their original text.` : counts.length ? `Saved translations are available for ${Math.max(...counts.map(row=>row.count))} of ${all.length} reading panes.` : '';
  return {work_id:work.id,title:work.title,selected:hasOverrides?'mixed':selected,original,
    options:[{code:ORIGINAL,label:'Original texts'},...counts.map(row=>({code:row.code,label:`${row.name} · ${row.count}/${all.length} panes saved`}))],
    has_overrides:hasOverrides,translated_count:selectedCount,total:all.length,summary};
}
