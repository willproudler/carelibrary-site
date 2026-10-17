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
export function paneTitle(unit, work, state = {}) {
  const variant = selectedVariant(unit,work,state);
  return variant?.title || (originalLabels(unit,work,state) ? unit.original_title || unit.title : unit.title);
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
