/* Read-only selection of translations already included in the public release.
 * This module never generates text, fetches records, or changes reference IDs. */
const array = value => Array.isArray(value) ? value : [];
export const ORIGINAL = 'original';
const names = {en:'English',fr:'French'};
export function originalLanguage(unit, work) {
  const code = unit?.language_code || work?.language_code || 'en';
  return {code,name:names[code] || unit?.language_name || work?.language_name || code};
}
export function savedVariants(unit) {
  return array(unit?.translations).filter(row=>row?.id && row.language_code && Array.isArray(row.sections));
}
export function selectedVariant(unit, work, state = {}) {
  const choices = savedVariants(unit), explicit = state.paneVersions?.[unit.id];
  if(explicit !== undefined)return choices.find(row=>row.id === explicit) || null;
  const language = state.readingLanguages?.[work?.id];
  return language && language !== ORIGINAL ? choices.find(row=>row.language_code === language) || null : null;
}
export function paneLanguages(unit, work, state = {}) {
  const original = originalLanguage(unit,work), selected = selectedVariant(unit,work,state);
  return {unit_id:unit.id,work_id:work?.id || '',title:selected?.title || unit.title,
    selected_id:selected?.id || ORIGINAL,language_code:selected?.language_code || original.code,
    language_name:selected?.language_name || original.name,is_translation:Boolean(selected),
    options:[{id:ORIGINAL,language_code:original.code,label:`${original.name} · original`,available:true},
      ...savedVariants(unit).map(row=>({id:row.id,language_code:row.language_code,label:`${row.language_name || names[row.language_code] || row.language_code} · saved machine translation`,available:true}))],
    can_translate:false,language_options:[],
    message:selected?'Saved machine translation of CARE analysis. References lead to the original source passages.':savedVariants(unit).length?'Choose an existing saved translation of this pane. Its references and original source stay available.':'This pane is available only in its original language. No saved translation is available.'};
}
export function bookLanguages(work, state = {}) {
  const original = originalLanguage(null,work), variants = work.units.flatMap(savedVariants), languages = new Map();
  for(const variant of variants)languages.set(variant.language_code,variant.language_name || names[variant.language_code] || variant.language_code);
  const selected = state.readingLanguages?.[work.id] || ORIGINAL;
  const selectedCount = work.units.filter(unit=>selectedVariant(unit,work,state)).length;
  const counts = [...languages].map(([code,name])=>({code,name,count:work.units.filter(unit=>savedVariants(unit).some(row=>row.language_code===code)).length}));
  const hasOverrides = work.units.some(unit=>Object.hasOwn(state.paneVersions || {},unit.id));
  const summary = selectedCount ? `${selectedCount} of ${work.units.length} CARE panes use saved translations. The source and other panes remain in ${original.name}.` : counts.length ? `Saved translations are available for ${Math.max(...counts.map(row=>row.count))} of ${work.units.length} CARE panes. The source remains in ${original.name}.` : '';
  return {work_id:work.id,title:work.title,selected:hasOverrides?'mixed':selected,original,
    options:[{code:ORIGINAL,label:`${original.name} · original`},...counts.map(row=>({code:row.code,label:`${row.name} · ${row.count}/${work.units.length} panes saved`}))],
    has_overrides:hasOverrides,translated_count:selectedCount,total:work.units.length,summary};
}
