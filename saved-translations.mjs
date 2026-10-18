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
export function paneTitle(unit, work, state = {}) {
  const variant = selectedVariant(unit,work,state);
  return translatedTitle(variant?.title || (originalLabels(unit,work,state) ? unit.original_title || unit.title : unit.title),unit,variant);
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
  if(!variant && originalLabels(unit,work,state))return {...identity,
    ...(identity.original_context ? {context:identity.original_context} : {}),
    ...(identity.original_kicker ? {kicker:identity.original_kicker} : {})};
  const languageState = variant ? {...state,readingLanguages:{...state.readingLanguages,[work?.id]:variant.language_code}} : state;
  const label = work && bookTitle(work,languageState);
  if(identity.kicker && work?.original_title && label)identity.kicker = identity.kicker.split(work.original_title).join(label);
  if(variant?.language_code === 'en' && work?.original_title === 'Monas Hieroglyphica' && identity.context){
    identity.context = identity.context.split(' · ').map(part=>theoremNumber(part) ? `Theorem ${theoremNumber(part)}.` : part).join(' · ');
  }
  return identity;
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
