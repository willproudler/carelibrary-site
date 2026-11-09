// Browser projection of care_numo/aq.py (ccru-aq/1.0). Saved calculations
// always come from the existing CARE index; this pen performs local arithmetic.
const instrumentAQGates = new Set([1, 3, 6, 10, 15, 21, 28, 36, 45]);
const instrumentAQNormalize = text => String(text ?? '').normalize('NFKD').toUpperCase().replace(/[^A-Z0-9]/g, '');
const instrumentAQRoot = value => value === 0 ? 0 : 1 + ((value - 1) % 9);
const instrumentAQZone = value => instrumentAQRoot(value) % 9;
const instrumentAQCoordinates = total => {
  const chain = [total];
  while (chain.at(-1) > 9) chain.push(Array.from(String(chain.at(-1))).reduce((sum, digit) => sum + Number(digit), 0));
  const reduction = instrumentAQRoot(total);
  return {total, reduction, chain, zone:instrumentAQZone(total), zoneLabel:reduction === 9 ? '9/0' : String(reduction),
    gate:instrumentAQGates.has(total) ? total : null};
};

export function instrumentAQAddress(total) {
  if (!Number.isSafeInteger(total) || total < 0 || total > 999_999_999_999) return null;
  return {...instrumentAQCoordinates(total), text:`AQ ${total}`, normalized:'', letters:[], address:true};
}

export function calculateInstrumentAQ(text) {
  const normalized = instrumentAQNormalize(text);
  if (!normalized) return null;
  let total = 0;
  const letters = Array.from(normalized, symbol => {
    const code = symbol.charCodeAt(0);
    const value = code < 65 ? code - 48 : code - 55;
    total += value;
    return {symbol, value, zone:instrumentAQZone(value)};
  });
  return {...instrumentAQCoordinates(total), text:String(text).trim(), normalized, letters};
}

export function instrumentAQInput(text) {
  const address = /^(?:AQ\s+)?([0-9]+)$/i.exec(String(text ?? '').trim().normalize('NFKC'));
  return address ? instrumentAQAddress(Number(address[1])) : calculateInstrumentAQ(text);
}

export function instrumentAQPreview(calc, committed) {
  if (!calc || (Boolean(calc.address) === Boolean(committed?.address) &&
      (calc.address ? calc.total === committed.total : calc.normalized === committed?.normalized))) return '';
  const {total, chain, zoneLabel, gate} = calc;
  const detail = `AQ ${chain.join(' → ')} · Zone ${zoneLabel}${gate === null ? '' : ` · Gate ${gate}`}`;
  return `<span title="${detail}"><b>${total}</b> → ${zoneLabel}</span>`;
}

export function instrumentAQForm(aq, e) {
  const draft = aq?.draft || '', preview = instrumentAQPreview(instrumentAQInput(draft), aq?.committed);
  return `<form class="nl-instrument-aq-form" aria-label="AQ calculator" autocomplete="off">
    <label><span>AQ</span><input name="aq" aria-label="AQ word, phrase or number" aria-keyshortcuts="/" data-instrument-aq-input
      type="text" maxlength="240" spellcheck="false" placeholder="Word, phrase or number" value="${e(draft)}"></label>
    <span class="nl-iaq-preview" data-instrument-aq-preview ${preview ? '' : 'hidden'}>${preview}</span>
    <button class="nl-iaq-submit" type="submit" aria-label="Trace AQ calculation" title="Trace AQ calculation">↵</button>
  </form>`;
}

const instrumentAQSourceLabels = {
  work:'Work', care_unit:'CARE unit', care_item:'CARE item', authorized_phrase:'Saved phrase',
  raw_phrase:'Raw excerpt', raw_title:'Raw title', raw_word:'Raw word', research_phrase:'Research phrase',
  axiom_phrase:'Axiom phrase', axiom_word:'Axiom word', raw_document:'Whole document',
};
const instrumentAQKinds = {all:'All indexed', text:'Readable saved', word:'Words', phrase:'Phrases', sentence:'Sentences', title:'Titles', research:'Research'};
const instrumentAQSorts = {variety:'Source variety', alphabetical:'A–Z', source:'Source order', shortest:'Shortest', longest:'Longest'};

function instrumentAQSameView(page, total, matchKind, matchSort) {
  const request=page?.request;
  return request?.instrument === true && String(request.query) === String(total) &&
    (request.match_kind || 'text') === matchKind && (request.sort || 'variety') === matchSort;
}

function instrumentAQNextOffset(page) {
  return Number(page.request?.offset || 0)+Number(page.limit || 24);
}

function instrumentAQMergePage(previous, page) {
  if (!previous || !page.request?.offset) return page;
  if (page.status !== 'ok') return {...previous, load_error:true};
  const existing=previous.records || [];
  const seen=new Set(existing.map(record=>record.id));
  const added=(page.records || []).filter(record=>!seen.has(record.id));
  return {...page, records:[...existing,...added]};
}

function instrumentAQRecordInfo(record, e) {
  const source = record.provenance || {};
  const word = record.word_stats;
  const factor = (record.factorization || []).map(({prime,exponent})=>exponent>1?`${prime}^${exponent}`:prime).join(' × ');
  const fields = [
    ['Record', record.id], ['Source ID', record.source_id], ['Source field', record.source_field],
    ['Section', source.section_name || source.section_number], ['Passage', source.passage_id], ['Sample', source.sample_title],
    ['Raw unit', source.raw_unit_id], ['CARE unit', source.care_unit_id], ['CARE item', source.care_item_id],
    ['Character range', source.character_start != null && source.character_end != null ? `${source.character_start}–${source.character_end}` : ''],
    ['Authority', source.authority], ['Recorded', record.created_at], ['Authorized by', source.authorized_by],
    ['Authorized at', source.authorized_at], ['Published revision', source.published_source_pin?.revision_id],
    ['Source seal', source.published_source_pin?.seal_id], ['Normalized text', record.normalized_text],
    ['AQ reduction', record.digital_reduction], ['Digit signature', record.digit_signature],
    ['Factorization', factor || record.prime_status], ['Rules', record.rules_version],
    ['Mapping', record.mapping_version], ['Normalization', record.normalization_version], ['Source hash', record.source_sha256],
    ['Occurrences', word?.occurrence_count ?? record.occurrence_count], ['Documents', word?.document_count ?? record.document_count],
    ['CARE units', record.unit_count], ['Tokens', record.token_count], ['Distinct words', record.distinct_word_count],
    ['Sentences', record.sentence_count],
  ].filter(([,value])=>value !== undefined && value !== null && value !== '');
  const forms=(word?.surface_forms || []).map(({text,count})=>`${text} × ${count}`).join(' · ');
  const samples=(word?.sample_occurrences || []).map(sample=>{
    const location=[sample.raw_unit_id, sample.char_start == null?'':`${sample.char_start}–${sample.char_end}`].filter(Boolean).join(' · ');
    return `<li>${e([sample.surface,sample.work_title,sample.author,location].filter(Boolean).join(' · '))}</li>`;
  }).join('');
  const values=(record.character_values || []).map(({symbol,value})=>`${symbol} ${value}`).join(' · ');
  if (!fields.length) return '';
  return `<details class="nl-iaq-receipt"><summary>Record details</summary><dl>${fields.map(([label,value])=>`<dt>${e(label)}</dt><dd>${e(value)}</dd>`).join('')}
    ${forms?`<dt>Recorded forms</dt><dd>${e(forms)}</dd>`:''}
    ${values?`<dt>Symbol values</dt><dd>${e(values)}</dd>`:''}</dl>
    ${samples?`<h4>Sample occurrences</h4><ul>${samples}</ul>`:''}</details>`;
}

function instrumentAQMatchReading(record, total, title, detail, e) {
  const selected = detail?.total === total && detail.id === record.id ? detail : null;
  const full = selected?.status === 'ok' ? selected.record : null;
  const provenance = full || record;
  const text = (full?.text || record.text || record.work_title || record.source_id || '') + (!full && record.text_truncated ? '…' : '');
  const credit = [provenance.work_title, provenance.author, provenance.provenance?.sample_title].filter(part => part && part !== text).join(' · ');
  const caption = credit || (text === title && !full?.can_open_source ? 'Saved AQ match' : '');
  const retry = selected && !full;
  return `<div class="nl-iaq-reading">
    ${text && text !== title ? `<p class="pass rom">${e(text)}</p>` : ''}
    ${caption ? `<p class="src">${e(caption)}</p>` : ''}
    ${selected?.from_collection ? '<p class="src">Collected snapshot</p>' : ''}
    ${!full ? `<p class="src" role="status">${retry ? 'The full saved record is unavailable.' : 'Reading the full saved record…'}</p>` : ''}
    ${retry ? `<button type="button" class="nl-instrument-link adv-l" data-instrument-aq-retry-match="${e(record.id)}">Retry full text ↻</button>` : ''}
    ${full?.can_open_source ? `<button type="button" class="nl-instrument-link adv-l" data-instrument-aq-source="${e(record.id)}">Open source in CARE →</button>` : ''}
    ${instrumentAQRecordInfo(provenance,e)}
  </div>`;
}

function instrumentAQMatchRows(records, {total,e,demons,detail,matchId,collection,collectionWrite,inCollection,instrumentSubjectLink}) {
  const saved = collection?.total === total ? collection.records || [] : [];
  const savedIds = new Set(saved.map(record=>record.id));
  const collecting = collectionWrite && collection?.total === total;
  const byId = new Map(demons.map(demon=>[demon.id,demon]));
  const collectionButton = (operation, id, label, symbol, disabled=false) =>
    `<button type="button" class="nl-iaq-collect" data-instrument-aq-collection="${operation}" data-record-id="${e(id)}" aria-label="${e(label)}" title="${e(label)}"${disabled?' disabled':''}>${symbol}</button>`;
  return records.map((record,index)=>{
    const value = String(record.text || record.work_title || record.source_id || '');
    const title = value.length > 170 ? value.slice(0,169).trimEnd()+'…' : value+(record.text_truncated?'…':'');
    const open = record.id === matchId;
    const label = record.source_label || instrumentAQSourceLabels[record.source_type] || record.source_type;
    const credit = [record.work_title,record.author].filter(part=>part && part!==value).join(' · ');
    const cited = [...new Set((record.placements || []).map(placement=>placement.demon_id))].map(id=>byId.get(id)).filter(Boolean);
    const isSaved = savedIds.has(record.id);
    const buttons = !collecting || !record.id || (!inCollection && record.collection_available===false) ? '' : inCollection ? [
      collectionButton('up',record.id,'Move earlier','↑',index===0),
      collectionButton('down',record.id,'Move later','↓',index===records.length-1),
      collectionButton('remove',record.id,'Remove from collection','×'),
    ].join('') : collectionButton(isSaved?'remove':'save',record.id,isSaved?'Remove from collection':'Save to collection',isSaved?'✓':'+');
    return `<li data-match-kind="${e(record.source_type==='axiom_word'?'word':record.match_kind || '')}">
      <div class="nl-iaq-result-head">${record.id ? `<button type="button" class="nl-iaq-match-text" data-instrument-aq-match="${e(record.id)}" data-aq-fetch aria-expanded="${open}" aria-label="Read AQ match ${e(title)}">${e(title)}</button>` : `<span class="nl-iaq-match-text">${e(title)}</span>`}${buttons ? `<div class="nl-iaq-collect-actions">${buttons}</div>` : ''}</div>
      <div class="nl-iaq-result-credit">${e([label,credit].filter(Boolean).join(' · '))}</div>
      ${cited.length ? `<div class="nl-iaq-result-credit">Cited in ${cited.map(demon=>instrumentSubjectLink('demon',demon.id,demon.name)).join(' · ')}</div>` : ''}
      ${open ? instrumentAQMatchReading(record,total,title,detail,e) : ''}</li>`;
  }).join('');
}

function instrumentAQFeedStatus(search,loaded=search?.records?.length || 0) {
  const count=Number.isInteger(search.total_count)?search.total_count:null;
  const indexed=Number.isInteger(search.index_count)?search.index_count:null;
  const number=value=>value.toLocaleString('en-GB');
  if (count===null) return loaded?`${number(loaded)} matches`:'';
  const shown=count?`${number(loaded)} of ${number(count)}`:'0 matches';
  if (indexed===null) return shown;
  return indexed===count?`${shown}${count?' indexed':''}`:`${shown} · ${number(indexed)} indexed in total`;
}

function instrumentAQFeedFooter(search) {
  if (!search) return '';
  if (search.status!=='ok' || search.load_error){
    const offset=search.load_error?instrumentAQNextOffset(search):Number(search.request?.offset || 0);
    return `<div class="nl-iaq-sentinel"><button type="button" class="nl-instrument-link adv-l" data-instrument-aq-retry-page="${offset}">Retry loading matches ↻</button></div>`;
  }
  return search.has_more?`<div class="nl-iaq-sentinel" data-instrument-aq-next="${instrumentAQNextOffset(search)}" role="status"><span class="nl-iaq-feed-status">More matches below</span></div>`:
    search.records?.length?'<div class="nl-iaq-sentinel"><span class="nl-iaq-feed-status">End of matches</span></div>':'';
}

function instrumentAQBrowse(calc, {e, demons, search, samples, detail, matchId,
    matchKind, matchSort, browseTab, collection, collectionWrite, publicReference, instrumentRegion, instrumentSubjectLink}) {
  const {total}=calc;
  const searched=instrumentAQSameView(search,total,matchKind,matchSort);
  const completePage=searched && search.status==='ok';
  const saved=collection?.total===total?collection.records || []:[];
  const inCollection=browseTab==='collection';
  const page=completePage?search.records || []:!searched && matchKind==='all'?samples:[];
  const records=(inCollection?saved:page).filter(record=>record.aq_total===total);
  const rowOptions={total,e,demons,detail,matchId,collection,collectionWrite,inCollection,instrumentSubjectLink};
  const rows=instrumentAQMatchRows(records,rowOptions);
  const selected=publicReference && detail?.status==='ok' && detail.total===total && detail.id===matchId &&
    !records.some(record=>record.id===matchId) ? detail.record : null;
  const status=inCollection?`${saved.length} saved`:completePage?instrumentAQFeedStatus(search,records.length):'';
  const tabs = collectionWrite ? `<div class="nl-iaq-tabs" role="group" aria-label="AQ shelves">
    <button type="button" data-instrument-aq-tab="matches" aria-pressed="${!inCollection}">Browse</button>
    <button type="button" data-instrument-aq-tab="collection" aria-pressed="${inCollection}">Collection <small>${saved.length}</small></button></div>` : '';
  const filters = inCollection ? '' : `<div class="nl-iaq-filters">
    <label class="nl-iaq-filter-select"><span>Filter</span><select data-instrument-aq-kind aria-label="Filter AQ matches">${Object.entries(instrumentAQKinds).filter(([key])=>!publicReference || key!=='research').map(([key,label])=>
      `<option value="${key}"${matchKind===key?' selected':''}>${label}</option>`).join('')}</select></label>
    <label class="nl-iaq-sort-select"><span>Sort</span><select data-instrument-aq-sort aria-label="Sort AQ matches">${Object.entries(instrumentAQSorts).map(([key,label])=>
      `<option value="${key}"${matchSort===key?' selected':''}>${label}</option>`).join('')}</select></label></div>`;
  const empty = inCollection ? 'Save a match to start this number’s collection.' : completePage ?
    `No matches in this view at AQ ${total}.` : searched ?
      'Saved AQ matches are unavailable.' : 'Reading the saved AQ index…';
  return instrumentRegion(`AQ ${total} · ${inCollection?'Collection':'Matches'}`,`<div class="nl-iaq-shelf">
    <div class="nl-iaq-shelf-header">${tabs}${filters}
      <div class="nl-iaq-summary-line"><p class="nl-iaq-results-status" aria-live="polite" data-instrument-aq-count>${status}</p>
        ${publicReference?'<span class="nl-iaq-results-status">Published Library</span>':
          !inCollection?'<button type="button" class="nl-instrument-link adv-l nl-iaq-index-link" data-instrument-aq-index>Full index ↗</button>':''}</div></div>
    ${!inCollection && matchKind==='research'?'<p class="nl-iaq-results-status">Extracts from the raw research and CARE axiom indexes.</p>':''}
    ${selected?`<ul class="nl-iaq-selected">${instrumentAQMatchRows([selected],rowOptions)}</ul>`:''}
    ${rows?`<ul class="nl-iaq-results">${rows}</ul>`:`<p class="empty-p">${e(empty)}</p>`}
    ${inCollection?'':`<div data-instrument-aq-feed-footer>${instrumentAQFeedFooter(searched?search:null)}</div>`}</div>`);
}

export function instrumentAQReadout(calc, {e, demons = [], search, samples = [], zoneInfo, detail,
    matchId = '', matchKind = 'all', matchSort = 'variety', browseTab = 'matches',
    collection, collectionWrite = false, arithmeticOnly = false, publicReference = false,
    instrumentIdentity, instrumentRegion, instrumentSubjectLink, instrumentDemonRows}) {
  if (!calc) return '';
  const identity = instrumentAQIdentityReadout(calc, {e,demons,zoneInfo,arithmeticOnly,instrumentIdentity,instrumentRegion,instrumentSubjectLink,instrumentDemonRows});
  if (arithmeticOnly) return identity;
  return identity + instrumentAQBrowse(calc, {e,demons,search,samples,detail,matchId,matchKind,matchSort,browseTab,
    collection,collectionWrite,publicReference,instrumentRegion,instrumentSubjectLink});
}

function instrumentAQIdentityReadout(calc, {e,demons,zoneInfo,arithmeticOnly,instrumentIdentity,instrumentRegion,instrumentSubjectLink,instrumentDemonRows}) {
  const {total,chain,zone,zoneLabel,gate,letters,normalized,text,address} = calc;
  const poles = demon => (demon.poles || []).filter(pole => pole != null).map(Number);
  const zoneDemons = demons.filter(demon => poles(demon).includes(zone));
  const twinZone = Number(zoneInfo?.twin ?? 9 - zone);
  const twin = zoneDemons.find(demon => poles(demon).includes(twinZone));
  const names = demons.flatMap(demon => {
    const matching = [demon.name,...(demon.aliases || [])].filter(name => calculateInstrumentAQ(name)?.total === total);
    return matching.length ? [{demon,matching:[...new Set(matching)]}] : [];
  });
  const meshes = demons.filter(demon => demon.number != null && Number(demon.number) === total);
  const rites = demons.flatMap(demon => (demon.rites || []).filter(rite => rite.calculable && rite.code === String(total))
    .map(rite => ({demon,rite})));
  const label = demon => [demon.name,demon.net_span].filter(Boolean).join(' ');
  const link = (demon,caption=label(demon)) => instrumentSubjectLink('demon',demon.id,caption);
  const muted = value => `<span class="q">${e(value)}</span>`;
  const exact = names.map(({demon,matching}) => {
    const aliases = matching.filter(name => name !== demon.name);
    const typed = !address && matching.some(name => instrumentAQNormalize(name) === normalized);
    const odds = new Set(poles(demon).filter(pole => Number.isInteger(pole) && pole >= 0 && pole <= 8)).size;
    const note = typed ? (zoneDemons.includes(demon) ? `The name lands on one of its own zones (chance about ${odds} in 9).` :
      'The name lands outside its own zones.') : '';
    return `<span class="nl-iaq-demon-hit">${link(demon)}${aliases.length ? muted('Alias: '+aliases.join(' · ')) : ''}${note ? muted(note) : ''}</span>`;
  }).join('');
  const place = [zoneInfo?.region,zoneInfo?.planet].filter(Boolean).join(' · ');
  const landing = instrumentSubjectLink('zone',zone,'ZONE '+zone);
  const zoneNote = [place,zoneLabel==='9/0' ? 'Root 9 maps to Zone 0 in AQ.' : ''].filter(Boolean).join(' · ');
  const twinTotal = twin && calculateInstrumentAQ(twin.name)?.total;
  const incidence = zoneDemons.length && instrumentDemonRows ?
    `<details class="nl-iaq-zone-demons"><summary>Demons touching Zone ${zone} · ${zoneDemons.length}</summary>${instrumentDemonRows(zoneDemons)}</details>` : '';
  return instrumentIdentity(`${address?'AQ address':'AQ'} · Zone ${zoneLabel}${zoneInfo?.region ? ' · '+zoneInfo.region : ''}`,address?String(total):text)
    + instrumentRegion('', `<dl class="nl-instrument-specs specs nl-iaq-coordinate">
      <dt>${chain.length>1?'Reduction':'AQ total'}</dt><dd class="amb">${chain.join(' → ')}</dd>
      <dt>Lands on</dt><dd>${landing}${zoneNote ? muted(zoneNote) : ''}</dd>
      ${arithmeticOnly?'':`<dt>Demon name AQ</dt><dd class="nl-iaq-demon-hits">${exact || muted(`No Matrix demon name or alias totals ${total}.`)}</dd>`}
      ${twin ? `<dt>Twin span</dt><dd>${link(twin)}${muted(`Spans Zones ${twinZone} and ${zone}${twinTotal==null?'':' · Name AQ '+twinTotal}`)} </dd>` : ''}
      ${meshes.length ? `<dt>Matrix number</dt><dd>${meshes.map(demon => link(demon,`Mesh-${String(total).padStart(2,'0')} · ${label(demon)}`)).join('')}</dd>` : ''}
      ${rites.length ? `<dt>Recorded rite</dt><dd>${rites.map(({demon,rite}) => link(demon,`${demon.name} · ${rite.rite_id} [${rite.code}]`)).join('')}</dd>` : ''}
      ${gate === null ? '' : `<dt>Gate</dt><dd class="amb">GATE ${gate}${muted(`Gate ${gate} cumulates Zone ${(Math.sqrt(1 + 8 * gate) - 1) / 2} and opens onto Zone ${instrumentAQRoot(gate)}.`)}</dd>`}
      ${letters.length ? `<dt>Letter path</dt><dd><span class="nl-iaq-letters lp">${letters.map(({symbol, zone:letterZone}) => `<span><b>${symbol}</b> ${letterZone}</span>`).join('')}</span></dd>` : ''}
    </dl>${incidence}`);
}

const instrumentAQPoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);
const instrumentAQCoord = value => Number(value.toFixed(1));
const instrumentAQXY = point => point.map(instrumentAQCoord).join(' ');

function instrumentAQJitter(text) {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return (((value ^ (value >>> 14)) >>> 0) / 4294967296 - .5) * 12;
  };
}

function instrumentAQSigil(xy, calc) {
  if (!calc?.letters?.length) return null;
  const points = calc.letters.map(({zone}, i) => {
    const jitter = instrumentAQJitter(calc.text.slice(0, i + 1) + i);
    const center = xy[zone];
    return instrumentAQPoint(center) ? [center[0] + jitter(), center[1] + jitter()] : null;
  });
  if (points.some(point => !point)) return null;
  let body = `M${instrumentAQXY(points[0])}`, last = '';
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy) || 1, bow = (i % 2 ? 1 : -1) * Math.min(26, length * .1);
    const segment = calc.letters[i - 1].zone === calc.letters[i].zone
      ? `C${instrumentAQXY([a[0] + 22, a[1] - 20])} ${instrumentAQXY([b[0] + 22, b[1] + 20])} ${instrumentAQXY(b)}`
      : `Q${instrumentAQXY([(a[0] + b[0]) / 2 - dy / length * bow, (a[1] + b[1]) / 2 + dx / length * bow])} ${instrumentAQXY(b)}`;
    if (i < points.length - 1) body += segment;
    else last = `M${instrumentAQXY(a)}${segment}`;
  }
  const end = points.at(-1), before = points.at(-2) || [end[0] - 1, end[1]];
  let dx = end[0] - before[0], dy = end[1] - before[1];
  if (!dx && !dy) dx = 1;
  const length = Math.hypot(dx, dy), tick = [-dy / length * 9, dx / length * 9];
  return {body, last, start:points[0],
    end:`M${instrumentAQXY([end[0] - tick[0], end[1] - tick[1]])}L${instrumentAQXY([end[0] + tick[0], end[1] + tick[1]])}`};
}

const instrumentAQTranslate = point => `translate(${instrumentAQXY(point)})`;
const instrumentAQLanding = (xy, gates, calc) => ({
  point:calc ? xy[calc.zone] : null, gate:calc?.gate == null ? null : gates[`gate:${calc.gate}`],
});

export function instrumentAQOverlay(xy, gates, draft, committed, fall = 0) {
  const sigil = instrumentAQSigil(xy, draft || committed);
  const {point, gate} = instrumentAQLanding(xy, gates, committed);
  const token = Number.isSafeInteger(fall) && fall > 0 ? fall : 0;
  const landing = token && instrumentAQPoint(point) ? `<g class="nl-iaq-fall" style="--nl-iaq-drop:${instrumentAQCoord(-point[1] - 12)}px">
    ${Array.from({length:8}, (_,i)=>`<circle cy="${-5*(i+1)}" r="${(2.7-i*.25).toFixed(2)}" opacity="${(0.72-i*.08).toFixed(2)}"/>`).join('')}
    <circle r="5"/><text x="11" y="5">${committed.total}</text>
  </g><circle class="nl-iaq-ripple" r="27"/><circle class="nl-iaq-ripple is-echo" r="27"/>` : '';
  return `<g data-iaq-pen="${(draft || committed)?.normalized || ''}">${sigil ? `
    <path class="nl-iaq-sigil" d="${sigil.body}"/>
    <path class="nl-iaq-sigil-last" pathLength="1" d="${sigil.last}"/>
    <circle class="nl-iaq-sigil-start" r="6.5" cx="${instrumentAQCoord(sigil.start[0])}" cy="${instrumentAQCoord(sigil.start[1])}"/>
    <path class="nl-iaq-sigil-end" d="${sigil.end}"/>` : ''}</g>
    <g data-iaq-locus="${token}">${instrumentAQPoint(point) ? `
      <g data-iaq-zone transform="${instrumentAQTranslate(point)}">
        ${landing}
      </g>` : ''}
      ${instrumentAQPoint(gate) ? `<g data-iaq-gate transform="${instrumentAQTranslate(gate)}">
        <circle class="nl-iaq-gate" r="21"/>${token ? '<circle class="nl-iaq-gate-flash" r="27"/>' : ''}</g>` : ''}
    </g>`;
}

export function updateInstrumentAQOverlay(svg, xy, gates, draft, committed, fall = 0) {
  const overlay = svg?.querySelector('[data-instrument-aq-overlay]');
  if (!overlay) return;
  const pen = overlay.querySelector('[data-iaq-pen]'), locus = overlay.querySelector('[data-iaq-locus]');
  const calc = draft || committed;
  const {point, gate} = instrumentAQLanding(xy, gates, committed);
  const markZone = locus?.querySelector('[data-iaq-zone]'), markGate = locus?.querySelector('[data-iaq-gate]');
  if (!pen || !locus || pen.dataset.iaqPen !== (calc?.normalized || '') || Number(locus.dataset.iaqLocus) !== fall ||
      Boolean(markZone) !== instrumentAQPoint(point) || Boolean(markGate) !== instrumentAQPoint(gate)) {
    const next = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    next.innerHTML = instrumentAQOverlay(xy, gates, draft, committed, fall);
    if (!pen || !locus) overlay.replaceChildren(...next.children);
    else {
      if (pen.dataset.iaqPen !== (calc?.normalized || '')) pen.replaceWith(next.firstElementChild);
      if (Number(locus.dataset.iaqLocus) !== fall || Boolean(markZone) !== instrumentAQPoint(point) ||
          Boolean(markGate) !== instrumentAQPoint(gate)) locus.replaceWith(next.lastElementChild);
    }
  }
  // Layout changes update SVG geometry in place. The falling dot and gate
  // flash only restart on a newly submitted calculation.
  const sigil = instrumentAQSigil(xy, calc);
  if (sigil) {
    for (const [selector, path] of [['.nl-iaq-sigil',sigil.body], ['.nl-iaq-sigil-last',sigil.last], ['.nl-iaq-sigil-end',sigil.end]]) {
      overlay.querySelector(selector)?.setAttribute('d', path);
    }
    const start = overlay.querySelector('.nl-iaq-sigil-start');
    start?.setAttribute('cx', instrumentAQCoord(sigil.start[0]));
    start?.setAttribute('cy', instrumentAQCoord(sigil.start[1]));
  }
  if (instrumentAQPoint(point)) overlay.querySelector('[data-iaq-zone]')?.setAttribute('transform', instrumentAQTranslate(point));
  if (instrumentAQPoint(gate)) overlay.querySelector('[data-iaq-gate]')?.setAttribute('transform', instrumentAQTranslate(gate));
}

// NUMO is a projection of preserved readings. Exploring this component is local.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unique = values => [...new Set(values.filter(value => value !== null && value !== undefined && value !== ''))];
const family = demon => (demon.demon_class || '').includes('Xeno') ? 'xeno' : (demon.demon_class || '').includes('Amphi') ? 'amphi' : 'chrono';
const numericYear = value => value === null || value === undefined || value === '' ? Infinity : (Number.isFinite(Number(value)) ? Number(value) : Infinity);
const yearLabel = value => numericYear(value) === Infinity ? 'Undated' : Number(value) < 0 ? `${Math.abs(Number(value))} BCE` : String(value);
const dateLabel = value => { if (!value) return 'Undated reading'; const date = new Date(value); return Number.isNaN(+date) ? String(value) : date.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}); };

export function studyScope(world, study) {
  const books=world.books || world.catalog_books || [], thinkers=world.thinkers || world.catalog_thinkers || [];
  const thinker=thinkers.find(t=>t.id===study.thinker);
  const workIds=study.work?[study.work]:thinker?.book_ids || (study.thinker?[]:books.map(b=>b.id));
  const workSet=new Set(workIds), selection=Array.isArray(study.selection)?new Set(study.selection):null;
  const base=(world.hosts || []).filter(h=>study.loaded && selection?selection.has(h.id):workSet.has(h.work_id) && (study.level==='ALL' ? ['CH','WB'].includes(h.type) : h.type===(study.level || 'CH')));
  const start=study.from==='' || study.from===undefined || study.from===null ? -Infinity : Number(study.from);
  const end=study.to==='' || study.to===undefined || study.to===null ? Infinity : Number(study.to);
  const invalid=Number.isNaN(start) || Number.isNaN(end) || start>end;
  const unknown=base.filter(h=>numericYear(h.source_year)===Infinity);
  const inRange=invalid?[]:base.filter(h=>{
    if(study.loaded)return true;
    const year=numericYear(h.source_year),last=numericYear(h.source_year_end);
    if(year===Infinity)return !!study.includeUndated;
    return year<=end && (last===Infinity?year:last)>=start;
  }).sort((a,b)=>numericYear(a.source_year)-numericYear(b.source_year) || String(a.source_date || '').localeCompare(String(b.source_date || '')) || String(a.work_id).localeCompare(String(b.work_id)) || (Number(a.sequence)||0)-(Number(b.sequence)||0) || a.title.localeCompare(b.title));
  const selected=selection?inRange.filter(h=>selection.has(h.id)):inRange;
  return {base,unknown,inRange,selected,invalid};
}

export function studyFrames(world, study) {
  const {selected}=studyScope(world,study), runsByHost=new Map(), observationsByRun=new Map();
  const pins=Array.isArray(study.pins)?new Set(study.pins):null;
  // Index once per projection instead of scanning every reading and assignment
  // again for each selected chapter. Preserve source order and exact versions.
  for(const run of world.runs || []){
    const host=run.catalog_host_id || run.host_id;
    if(!runsByHost.has(host))runsByHost.set(host,[]);
    runsByHost.get(host).push(run);
  }
  for(const demon of world.demons || [])for(const observation of demon.history || demon.observations || []){
    if(!observationsByRun.has(observation.run_id))observationsByRun.set(observation.run_id,[]);
    observationsByRun.get(observation.run_id).push(observation);
  }
  return selected.map(h=>{
    const saved=runsByHost.get(h.id) || [];
    const run=pins?saved.find(r=>pins.has(r.id)):saved.find(r=>r.is_latest===true);
    const observations=run?(observationsByRun.get(run.id) || []):[];
    return {...h,id:h.id,host_id:h.id,label:h.date_label || yearLabel(h.source_year),observations,run_ids:run?[run.id]:[],demon_ids:unique(observations.map(o=>o.mesh_id)),observed:!!run};
  });
}

export function studyUnreadHosts(world, study, wholeScope=false) {
  // Saved studies can deliberately pin older or empty snapshots. Paid-run
  // selection still checks present library coverage to avoid rereading them.
  const current=new Set((world.runs || []).filter(r=>r.is_latest===true).map(r=>r.catalog_host_id || r.host_id));
  const scope=studyScope(world,study);
  return (wholeScope?scope.inRange:scope.selected).filter(h=>!current.has(h.id));
}

export function compareFrames(a,b) {
  if(!a || !b || !a.observed || !b.observed)return {added:[],retained:[],unassigned:[],comparable:false};
  return {added:b.demon_ids.filter(id=>!a.demon_ids.includes(id)),retained:b.demon_ids.filter(id=>a.demon_ids.includes(id)),unassigned:a.demon_ids.filter(id=>!b.demon_ids.includes(id)),comparable:a.observed && b.observed};
}

export function parseStudyQuery(text,world) {
  const normalize=value=>String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const q=normalize(text),years=[...q.matchAll(/\b(\d{4})\b/g)].map(m=>Number(m[1]));
  const availableThinkers=world.thinkers || world.catalog_thinkers || [];
  const exactThinkers=availableThinkers.filter(t=>q.includes(normalize(t.name)));
  const thinkers=exactThinkers.length?exactThinkers:availableThinkers.filter(t=>{
    const name=normalize(t.name),last=name.trim().split(/\s+/).pop();
    return q.includes(name) || (last.length>2 && new RegExp(`(?:^|[^a-z])${last.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|[^a-z])`).test(q));
  });
  const books=(world.books || world.catalog_books || []).filter(b=>normalize(b.title).length>4 && q.includes(normalize(b.title)));
  if(thinkers.length!==1 && books.length!==1)return {error:thinkers.length>1?'More than one thinker matches. Choose a full name below.':'Choose a thinker or book from your library, with optional years—for example, “Nick Land 1988–2014”.'};
  if(years.length>2)return {error:'Use one year or one date range for this study.'};
  if(years.length===2 && years[0]>years[1])return {error:'The first year must come before the last year.'};
  const book=books.length===1?books[0]:null,thinker=thinkers.length===1?thinkers[0]:null;
  return {thinker:thinker?.id || book?.author_id || '',work:book?.id || '',from:years[0] ?? '',to:years[1] ?? years[0] ?? '',level:'CH',includeUndated:years.length===0};
}

export function readingFrames(world, state) {
  const books = world.catalog_books || world.books || [];
  const thinkers = world.catalog_thinkers || world.thinkers || [];
  const bookIds = state.mode === 'thinkers' ? (thinkers.find(t => t.id === state.thinker)?.book_ids || []) : [state.book];
  const observations = (world.demons || []).flatMap(d => d.history || d.observations || []).filter(o => bookIds.includes(o.book_id));
  const seen = new Set();
  const all = observations.filter(o => {const key=o.id || `${o.run_id}:${o.mesh_id}:${o.proposition}`; if (seen.has(key)) return false; seen.add(key); return true;});
  const complete = frame => ({...frame, demon_ids: unique((frame.observations || []).map(o => o.mesh_id)), observed: (frame.run_ids || []).length > 0});
  if (String(state.axis).startsWith('process:')) {
    const process = (world.journeys || []).find(j => j.id === state.axis.slice(8) && bookIds.includes(j.book_id));
    return (process?.steps || []).map((step, i) => complete({id:`${process.id}:${i}`,title:step.proposition || step.description || `Step ${i+1}`,label:`Step ${i+1}`,run_ids:[process.run_id],observations:[step],process:true,host_id:step.host_id || process.host_id}));
  }
  if (state.axis === 'publications') {
    return books.filter(b => bookIds.includes(b.id)).sort((a,b) => numericYear(a.source_year ?? a.year) - numericYear(b.source_year ?? b.year) || a.title.localeCompare(b.title)).map(b => {
      const obs = all.filter(o => o.book_id === b.id && o.is_latest !== false);
      const currentRuns = (world.runs || []).filter(r => (r.work_id || r.book_id) === b.id && r.is_latest !== false);
      return complete({id:b.id,work_id:b.id,title:b.title,label:yearLabel(b.source_year ?? b.year),year:b.year,observations:obs,run_ids:unique([...currentRuns.map(r=>r.id),...obs.map(o=>o.run_id)]),host_ids:b.host_ids || [],host_id:(world.hosts || []).find(h=>h.work_id===b.id && (h.type || h.host_level)==='WB')?.id});
    });
  }
  if (state.axis === 'chapters') {
    const trajectory = (world.trajectories?.books || []).find(t => t.id === state.book);
    return (trajectory?.steps || []).map((step,i) => {
      const obs = all.filter(o => (o.catalog_host_id || o.host_id) === step.host_id && o.is_latest !== false);
      const currentRun = step.latest_current_run_id || (world.runs || []).find(r => (r.catalog_host_id || r.host_id) === step.host_id && r.is_latest === true)?.id;
      return complete({id:step.host_id,title:step.title,label:step.position === null || step.position === undefined ? '?' : String(step.position),
        host_id:step.host_id,position:step.position,observations:obs,
        run_ids:currentRun ? [currentRun] : unique(obs.map(o=>o.run_id))});
    });
  }
  const runs = (world.runs || []).filter(r => bookIds.includes(r.book_id || r.work_id) || all.some(o=>o.run_id===r.id));
  const result = runs.map(r => complete({id:r.id,title:r.host_title || r.title || r.book_title || r.host_id,label:dateLabel(r.date),host_id:r.catalog_host_id || r.host_id,version:r.version,run_ids:[r.id],observations:all.filter(o=>o.run_id===r.id),date:r.date}));
  // Small or legacy projections may only have assignment history, without a run list.
  for (const o of all) if (!result.some(r=>r.id===o.run_id)) result.push(complete({id:o.run_id,title:o.host_title || o.book_title,label:dateLabel(o.date),host_id:o.catalog_host_id || o.host_id,version:o.run_version,run_ids:[o.run_id],observations:all.filter(p=>p.run_id===o.run_id),date:o.date}));
  return result.sort((a,b)=>String(a.date || '').localeCompare(String(b.date || '')) || a.id.localeCompare(b.id));
}

export function frameRoutes(world, frame) {
  if (!frame || frame.process) return [];
  return (world.routes || []).filter(r => frame.run_ids.includes(r.run_id) && frame.demon_ids.includes(r.mesh_id) && r.zones?.length > 1 && r.zones.every(z => Number.isInteger(z) && z >= 0 && z <= 9));
}

export function chamberEncounters(world, demonId, filters={}) {
  const demon=(world.demons || []).find(d=>d.id===demonId);
  const hostById=new Map((world.hosts || []).map(h=>[h.id,h]));
  const concepts=world.concept_instances || [], q=String(filters.query || '').trim().toLowerCase();
  const start=filters.from==='' || filters.from==null?-Infinity:Number(filters.from);
  const end=filters.to==='' || filters.to==null?Infinity:Number(filters.to);
  if(Number.isNaN(start) || Number.isNaN(end) || start>end)return [];
  return (demon?.history || demon?.observations || []).filter(o=>filters.history || o.is_latest!==false).map(o=>{
    const host=hostById.get(o.catalog_host_id || o.host_id) || {};
    const linked=concepts.filter(c=>c.run_id===o.run_id && (c.assignments || []).some(a=>a.mesh_id===demonId && ((a.observation_id && a.observation_id===o.id) || (a.assignment_id && a.assignment_id===o.assignment_id))));
    const year=filters.axis==='analysis'?numericYear(String(o.date || '').slice(0,4)):numericYear(host.source_year);
    const last=filters.axis==='analysis'?year:numericYear(host.source_year_end ?? host.source_year);
    return {...o,concepts:linked,host_type:host.type,source_year:host.source_year,source_year_end:host.source_year_end,source_date:host.source_date,date_basis:host.date_basis,date_label:host.date_label || yearLabel(host.source_year),date_evidence:host.date_evidence || [],sort_year:year,sort_year_end:last};
  }).filter(o=> (!filters.author || o.author_id===filters.author) && (!filters.run || o.run_id===filters.run)
    && (o.sort_year===Infinity?filters.includeUndated!==false:o.sort_year<=end && o.sort_year_end>=start)
    && `${o.author} ${o.book_title} ${o.host_title} ${o.proposition} ${(o.source_trace || []).join(' ')} ${o.concepts.map(c=>[c.label,...(c.aliases || [])].join(' ')).join(' ')}`.toLowerCase().includes(q))
    .sort((a,b)=>a.sort_year-b.sort_year || String(filters.axis==='analysis'?a.date:a.source_date || '').localeCompare(String(filters.axis==='analysis'?b.date:b.source_date || '')) || a.run_id.localeCompare(b.run_id));
}

export function demonSearchText(demon) {
  return [demon.name,demon.net_span,demon.domain,demon.epithet,demon.id,...(demon.aliases || []),
    ...(demon.chamber?.concepts || []).flatMap(c=>[c.label,...(c.aliases || [])]),
    ...(demon.chamber?.thinkers || []).map(t=>t.name),
    ...(demon.chamber?.hypotheses || []).flatMap(h=>[h.object_label,h.statement]),
    ...Object.values(demon.learned_account || {}).flat(),
    ...(demon.companion_notes || []).flatMap(n=>(n.sections || []).flatMap(s=>[s.heading,...(s.paragraphs || []).map(p=>typeof p==='string'?p:p.text)])),
  ].join(' ').toLowerCase();
}

const zones = Array.from({length:10}, (_, zone) => zone);
const demonNumber = demon => String(demon.number ?? demon.id.replace(/\D/g,'')).padStart(2,'0');
const encounterCount = demon => (demon.observations || (demon.history || []).filter(row=>row.is_latest!==false)).length;
const zonePoles = demon => [...new Set((demon.poles || []).map(Number))].filter(zone=>zones.includes(zone)).sort((a,b)=>a-b);

export function atlasDemons(demons, {zone=null, query='', family:group='', sort='matrix'}={}) {
  const q=query.trim().toLowerCase();
  const byNumber=(a,b)=>demonNumber(a).localeCompare(demonNumber(b),undefined,{numeric:true});
  const byName=(a,b)=>a.name.localeCompare(b.name) || byNumber(a,b);
  const byPair=(a,b)=>{
    const [lowA=10,highA=10]=zonePoles(a), [lowB=10,highB=10]=zonePoles(b);
    return highA-highB || lowA-lowB || byNumber(a,b);
  };
  const orders={matrix:byPair,number:byNumber,name:byName,encounters:(a,b)=>encounterCount(b)-encounterCount(a) || byNumber(a,b)};
  return demons.filter(d=>(zone===null || zonePoles(d).includes(zone)) && (!group || family(d)===group) && (!q || demonSearchText(d).includes(q)))
    .sort(orders[sort] || byPair);
}

export function preserveViewport(root) {
  // The page scroller lives outside the component's shadow root. Preserve
  // composed ancestors, as well as any scrolling local component container.
  const positions=[];
  for(let node=root;node;node=node.parentElement || node.getRootNode?.()?.host){
    if(typeof node.scrollTop==='number' && (node.scrollTop || node.scrollLeft || node.scrollHeight>node.clientHeight || node.scrollWidth>node.clientWidth)){
      positions.push({node,top:node.scrollTop,left:node.scrollLeft});
    }
  }
  return () => {for(const {node,top,left} of positions){node.scrollTop=top;node.scrollLeft=left;}};
}

export function structureReviewPacket(world, id) {
  const pages=world.structure_pages || {},entities=pages.entities || [];
  const entity=entities.find(item=>item.id===id);if(!entity)return null;
  const neighbours=entities.filter(item=>(entity.links || []).some(link=>link.id===item.id));
  const included=[entity,...neighbours],sourceIds=new Set(included.flatMap(item=>item.source_refs || []));
  const demonIds=new Set(included.flatMap(item=>item.demon_ids || []));
  const runIds=new Set(included.flatMap(item=>item.run_ids || item.current_run_ids || []));
  const routeIds=new Set(included.flatMap(item=>item.route_ids || item.current_route_ids || []));
  const packetDemons=(world.demons || []).filter(d=>demonIds.has(d.id)).map(d=>({id:d.id,name:d.name,poles:d.poles,source:d.source,source_text:d.source_text,rites:d.rites,learned_account:d.learned_account}));
  const researchIds=new Set(packetDemons.flatMap(d=>d.learned_account?.source_traces || []));
  const researchEvidence=(world.research_evidence || []).filter(item=>researchIds.has(item.id));
  const packetRuns=(world.runs || []).filter(run=>runIds.has(run.id)),packetRoutes=(world.routes || []).filter(route=>routeIds.has(route.id));
  // A downloadable evidence snapshot, not a model answer or a paid-run request.
  return JSON.parse(JSON.stringify({schema_version:'numo-structure-review/1.0',created_at:new Date().toISOString(),
    target:entity,neighbours,sources:(pages.sources || []).filter(source=>sourceIds.has(source.id)),
    demons:packetDemons,runs:packetRuns,routes:packetRoutes,research_evidence:researchEvidence,
    scope:'Current and earlier reading versions referenced by the target and its directly connected pages.',
    unresolved_dependencies:{runs:[...runIds].filter(id=>!packetRuns.some(item=>item.id===id)),routes:[...routeIds].filter(id=>!packetRoutes.some(item=>item.id===id)),research_evidence:[...researchIds].filter(id=>!researchEvidence.some(item=>item.id===id))},
    protocol:{purpose:'Compare this structure with its connected pages and the exact evidence each used.',
      round_rule:'Freeze every participant before a reciprocal reading round. Outputs may enter the next round only.',
      evidence_rule:'Prior interpretations remain attributed dependencies. Count independent underlying sources, not repeated conclusions.',
      revision_questions:['What is retained?','What is narrowed or reversed?','What remains unresolved?','What has new independent support?'],
      paid_run_started:false},provenance:pages.provenance}));
}

export default function ({parentElement, data, setTriggerValue}) {
  const root = parentElement.querySelector('.nl');
  if (!root || !data?.world) return;
  const world = data.world, demons = world.demons || [], books = world.catalog_books || world.books || [], thinkers = world.catalog_thinkers || world.thinkers || [], hosts = world.hosts || [], runs = world.runs || [];
  const arithmeticOnly = world.arithmetic_only === true;
  const publicReference = data.public_reference === true;
  const headerAQ = Boolean(data.focusHeaderAQ || data.header_aq);
  const storageKey = arithmeticOnly || publicReference ? 'care-numo-instrument-beta-v1' : 'care-numo-library-v1';
  const byId = Object.fromEntries(demons.map(d=>[d.id,d]));
  const fields = new Set((data.fields || []).map(f=>f.id || f.work_id));
  const e = escapeHtml, $ = selector => root.querySelector(selector);
  const instrumentWorkPage=8;
  const instrumentAQBrowseDefaults={match:'',scroll:null,matchKind:'all',matchSort:'variety',browseTab:'matches',indexScope:2};
  let saved = {}; try { saved=JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch {}
  const savedAQ=saved.instrument?.aq;
  if(savedAQ?.matchKind==='text' && savedAQ.indexScope!==instrumentAQBrowseDefaults.indexScope)savedAQ.matchKind=instrumentAQBrowseDefaults.matchKind;
  const state = {mode:'instrument',demon:demons.find(d=>d.name==='Lurgo')?.id || demons[0]?.id || '',book:books.find(b=>b.observed)?.id || books[0]?.id || '',thinker:thinkers.find(t=>t.name==='Nick Land')?.id || thinkers[0]?.id || '',axis:'chapters',frame:0,rite:0,zone:null,query:'',family:'',page:0,history:false,matrixRows:'all',...saved};
  state.instrument={zones:[],structure:'',subject:null,rite:null,replay:null,web:false,hetu:false,
    trail:[],forward:[],deck:'',deckGroup:'',proposing:'',proposalZone:null,depositLimit:24,workLimit:instrumentWorkPage,openWork:'',...(saved.instrument || {}),
    aq:{draft:'',committed:null,fall:0,...instrumentAQBrowseDefaults,...savedAQ,indexScope:instrumentAQBrowseDefaults.indexScope}};
  if(data.entrance_version && saved.entrance_version!==data.entrance_version){
    state.mode='instrument';state.entrance_version=data.entrance_version;
  }
  state.atlas={query:state.mode==='atlas'?state.query:'',sort:'matrix',format:'table',...(saved.atlas || {})};
  state.study={thinker:thinkers.find(t=>t.name==='Nick Land')?.id || thinkers[0]?.id || '',work:'',level:'CH',from:'',to:'',includeUndated:true,selection:null,pins:null,frame:0,compare:null,name:'',loaded:'',message:'',question:'',hostQuery:'',hostLimit:120,loadedComparison:null,loadedWorkIds:null,...(saved.study || {})};
  state.anatomy={authorMode:'groups',hiddenAuthors:[],collapsedAuthors:[],authorLimits:{},kind:'gate',id:'gate:36',query:'',encounterQuery:'',history:false,page:0,route:'',seen:{},...(saved.anatomy || {})};
  state.chamber={authorMode:'groups',hiddenAuthors:[],collapsedAuthors:[],authorLimits:{},tab:'encounters',query:'',author:'',axis:'source',from:'',to:'',includeUndated:true,history:false,run:'',page:0,moreConcepts:false,...(saved.chamber || {})};
  state.memory={path:false,coverage:'all',limit:40,...(saved.memory || {})};
  state.voices={shelf:'',id:'',query:'',group:'',...(saved.voices || {})};
  if(data.focus && byId[data.focus.mesh_id]){state.mode='chamber';state.demon=data.focus.mesh_id;const route=(world.routes || []).find(r=>r.run_id===data.focus.run_id && r.mesh_id===state.demon);state.rite=Math.max(0,(byId[state.demon].rites || []).findIndex(r=>r.rite_id===route?.rite_id || r.id===route?.rite_id));state.chamber={...state.chamber,hiddenAuthors:[],collapsedAuthors:[],authorLimits:{},tab:'encounters',query:'',author:'',from:'',to:'',run:data.focus.run_id || '',history:true,includeUndated:true,page:0};}
  const availableModes=publicReference?['instrument','atlas','anatomy','skills']:
    ['instrument','map','study','atlas','anatomy','directory','chamber','books','thinkers','skills','runs','aq'];
  if (arithmeticOnly || !availableModes.includes(state.mode)) state.mode='instrument';
  if (!byId[state.demon]) state.demon=demons[0]?.id || '';
  if (!books.some(b=>b.id===state.book)) state.book=books[0]?.id || '';
  if (!thinkers.some(t=>t.id===state.thinker)) state.thinker=thinkers[0]?.id || '';
  let timer,scrollRestoreFrame=0,instrumentAQTimer=0;
  const frameWindow=root.ownerDocument?.defaultView;
  // Detail and collection actions remount the component. Keep previews in this
  // document so those actions leave the browsed list and its position intact.
  const aqFeedSlot=Symbol.for('care.numo.aq-feed.v2');
  const aqFeed=frameWindow?(frameWindow[aqFeedSlot] ||= {}):{};
  let stopAQObserver,aqFeedRequest,aqServerPending=false;
  const persist = () => { try {sessionStorage.setItem(storageKey,JSON.stringify(state));} catch {} };
  const emit = (kind, payload={}) => {persist();setTriggerValue('action',{kind,...payload});};
  const paneRef = id => {
    const run = runs.find(r=>r.id===id);
    const exact = run?.pane_ref || `FIELD:numo:${id}`;
    if (run || fields.has(exact)) return exact;
    const unit = run?.numo_unit_id || String(id).split(':')[0];
    const current = `FIELD:numo:${unit}`;
    return fields.has(current) && (run?.is_latest !== false) ? current : '';
  };
  const paneButton = (id, label='Open in panes ↗') => {const ref=paneRef(id);return ref?`<button class="nl-textbutton" data-open-field="${e(ref)}">${e(label)}</button>`:'<span class="nl-meta">Reading not registered in panes</span>';};
  const chip = id => `<button class="nl-chip" data-demon="${e(id)}">${e(byId[id]?.name || id)}</button>`;
  const studySnapshot = () => {
    const s=state.study,scope=studyScope(world,s),frames=studyFrames(world,s);
    return {name:s.name || `${thinkers.find(t=>t.id===s.thinker)?.name || books.find(b=>b.id===s.work)?.title || 'Numogram study'}${s.from || s.to?' · '+(s.from || '…')+'–'+(s.to || '…'):''}`,thinker_id:s.thinker,work_ids:s.loaded && s.loadedWorkIds?s.loadedWorkIds:unique(scope.selected.map(h=>h.work_id)),host_ids:s.loaded && Array.isArray(s.selection)?s.selection:scope.selected.map(h=>h.id),host_level:s.level,include_undated:s.includeUndated,source_year_from:s.from===''?null:Number(s.from),source_year_to:s.to===''?null:Number(s.to),date_axis:'source',run_ids:s.loaded && Array.isArray(s.pins)?s.pins:unique(frames.flatMap(f=>f.run_ids)),comparison:s.loaded && s.loadedComparison?s.loadedComparison:{a:frames[s.compare]?.run_ids?.[0] || '',b:frames[s.frame]?.run_ids?.[0] || ''}};
  };
  const subjectIds = () => state.mode === 'thinkers' ? (thinkers.find(t=>t.id===state.thinker)?.book_ids || []) : [state.book];
  const currentFrames = () => readingFrames(world,state);
  const currentFrame = (frames=currentFrames()) => {state.frame=Math.max(0,Math.min(Number(state.frame)||0,frames.length-1));return frames[state.frame];};
  const canonicalMap = {3:[180,85],6:[275,85],2:[304,207],7:[360,280],5:[110,263],4:[73,350],1:[210,433],8:[215,544],9:[212,644],0:[213,737]};
  const syzygies = [[3,6],[2,7],[4,5],[1,8],[0,9]];
  const mapChannels = [
    [6,3,6,[197,61,212,20,261,20,274,58],[233,27]],
    [21,6,3,[267,110,249,171,190,169,183,113],[217,145]],
    [3,2,3,[281,196,235,227,117,185,163,104],[139,157]],
    [15,5,6,[94,242,20,77,110,-22,267,44],[272,7]],
    [10,4,1,[79,376,115,453,158,481,189,452],[137,454]],
    [1,1,1,[197,408,160,362,230,348,228,409],[213,360]],
    [28,7,1,[348,306,319,374,268,428,239,431],[280,394]],
    [36,8,9,[234,564,281,588,267,629,238,641],[270,598]],
    [45,9,9,[190,641,141,614,140,675,187,659],[150,642]],
  ];
  const mapCurrents = [
    [6,3,[226,89,228,121,206,125,190,111]],
    [7,5,[330,247,252,276,190,282,137,269]],
    [5,1,[92,308,142,340,177,379,196,408]],
    [8,7,[213,490,322,478,363,374,360,309]],
    [9,9,[212,690,272,714,262,659,239,650]],
  ];
  const mapRegions = [
    ['region:warp','Warp',[3,6],[26,89],['WARP']],
    ['region:time-circuit','Time-Circuit',[1,2,4,5,7,8],[28,522],['TIME','CIRCUIT']],
    ['region:plex','Plex',[0,9],[305,695],['PLEX']],
  ];
  // The instrument uses the reference drawing’s coordinate system.
  const instrumentMap = { 0: [268, 998], 1: [266, 642], 2: [404, 302], 3: [176, 172], 4: [52, 472], 5: [120, 388], 6: [282, 166], 7: [462, 394], 8: [268, 762], 9: [266, 882] };
  const penGateCentres = { g1: ['z', 1, 14, -98], g3: ['z', 3, -30, 88], g6: ['m', 3, 6, 0, -76], g10: ['m', 4, 1, 7, 107], g15: ['z', 6, 24, -128], g21: ['m', 3, 6, 8, 95], g28: ['m', 7, 1, -28, 70], g36: ['m', 8, 9, 66, 0], g45: ['z', 9, -74, -22] };
  const penGateShapes = [
    { z: 1, g: 'g1', s1: [['z', 1, 26, -62], ['g', 'g1', 6, 28]], s2: [['g', 'g1', -26, 2], ['z', 1, -20, -62]] },
    { z: 2, g: 'g3', s1: [['z', 2, -90, 40], ['g', 'g3', 60, 40]], s2: [['g', 'g3', -2, -26], ['z', 3, -24, 52]] },
    { z: 3, g: 'g6', s1: [['z', 3, 14, -62], ['g', 'g6', -24, 6]], s2: [['g', 'g6', 26, 2], ['z', 6, -18, -60]] },
    { z: 4, g: 'g10', s1: [['z', 4, 6, 110], ['g', 'g10', -56, 6]], s2: [['g', 'g10', 20, 0], ['z', 1, -62, 16]] },
    { z: 5, g: 'g15', s1: [['z', 5, -118, -210], ['g', 'g15', -210, -30]], s2: [['g', 'g15', 2, 40], ['z', 6, 16, -64]] },
    { z: 6, g: 'g21', s1: [['z', 6, 12, 78], ['g', 'g21', 30, 8]], s2: [['g', 'g21', -30, 0], ['z', 3, 6, 66]] },
    { z: 7, g: 'g28', s1: [['z', 7, -30, 120], ['g', 'g28', 36, -36]], s2: [['g', 'g28', -22, 18], ['z', 1, 44, -22]] },
    { z: 8, g: 'g36', s1: [['z', 8, 46, 36], ['g', 'g36', -12, -22]], s2: [['g', 'g36', -12, 24], ['z', 9, 44, -38]] },
    { z: 9, g: 'g45', s1: [['z', 9, -56, 14], ['g', 'g45', -8, 24]], s2: [['g', 'g45', 24, -16], ['z', 9, -40, -38]] }
  ];
  const penCurrentShapes = [
    { id: 'c7', pair: [8, 1], to: 7, p0: ['m', 1, 8, 26, 6], c1: ['m', 1, 8, 120, 0], c2: ['z', 7, 10, 150], w0: 34, w1: 9, n: 430, sp: .028, ah: 20 },
    { id: 'c5', pair: [7, 2], to: 5, p0: ['m', 2, 7, -24, 0], c1: ['m', 2, 7, -90, 22], c2: ['z', 5, 120, -8], w0: 34, w1: 9, n: 430, sp: .028, ah: 20 },
    { id: 'c1', pair: [5, 4], to: 1, p0: ['m', 4, 5, 16, 20], c1: ['m', 4, 5, 60, 90], c2: ['z', 1, -82, -74], w0: 34, w1: 9, n: 430, sp: .028, ah: 20 },
    { id: 'c3', pair: [6, 3], to: 3, p0: ['m', 3, 6, 0, 22], c1: ['m', 3, 6, 16, 58], c2: ['z', 3, 52, 64], w0: 20, w1: 7, n: 150, sp: .05, ah: 14 },
    { id: 'c9', pair: [9, 0], to: 9, p0: ['m', 9, 0, 8, 4], c1: ['m', 9, 0, 70, 14], c2: ['z', 9, 74, 10], w0: 22, w1: 7, n: 170, sp: .05, ah: 14 }
  ];
  const instrumentChannels=penGateShapes.map(shape=>{
    const gate=Number(shape.g.slice(1));
    const channel=world.channels?.find(row=>Number(row.gate)===gate);
    return [gate,Number(channel?.from ?? shape.z),Number(channel?.to ?? (1+(gate-1)%9)),shape];
  });
  const instrumentCurrents=penCurrentShapes.map(shape=>{
    const current=world.currents?.find(row=>row.syzygy?.map(Number).includes(shape.pair[0]) && row.syzygy?.map(Number).includes(shape.pair[1]));
    return [Number(current?.from ?? shape.pair[0]),Number(current?.to ?? shape.to),shape];
  });
  const pointText = ([x,y]) => `${Math.round(x*10)/10} ${Math.round(y*10)/10}`;
  const translate = point => `translate(${pointText(point)})`;
  const mix = (a,b,t=.5) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const addPoints = (a,b) => [a[0]+b[0],a[1]+b[1]];
  const mapBounds = [[37,388],[25,751]];
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  // Preserve saved custom movement when upgrading the old instrument plate.
  if(state.instrumentLayout && state.instrumentLayoutVersion!==2){
    const previous={3:[164,135],6:[252,130],2:[366,256],7:[421,330],5:[104,337],4:[60,404],1:[242,555],8:[244,657],9:[242,768],0:[244,868]};
    state.instrumentLayout=Object.fromEntries(Object.entries(state.instrumentLayout).filter(([zone,point])=>
      previous[zone] && Array.isArray(point) && point.length===2 && point.every(Number.isFinite)
    ).map(([zone,point])=>[zone,point.map((value,i)=>instrumentMap[zone][i]+(value-previous[zone][i])*1.16)]));
  }
  state.instrumentLayoutVersion=2;
  const mapSpecs = {
    standard:{nodes:canonicalMap,channels:mapChannels,currents:mapCurrents,bounds:mapBounds,labelBounds:[[14,411],[2,774]],stateKey:'mapLayout'},
    instrument:{nodes:instrumentMap,channels:instrumentChannels,currents:instrumentCurrents,bounds:[[24,488],[42,1026]],stateKey:'instrumentLayout'},
  };
  let mapDrag, suppressedMapClick, mapClickTimer, diagramNumber=0;
  let instrumentLayoutEditing=false, instrumentNoteLayer, instrumentNoteMarkup='';
  const positions = spec => Object.fromEntries(Object.entries(spec.nodes).map(([id,point])=>{
    const custom=state[spec.stateKey]?.[id];
    return [id,Array.isArray(custom) && custom.length===2 && custom.every(Number.isFinite)
      ? custom.map((value,i)=>clamp(value,...spec.bounds[i])) : point];
  }));
  function mapGeometry(xy,spec=mapSpecs.standard) {
    if(spec===mapSpecs.instrument)return penGeometry(xy);
    const edges={}, gates={}, regions={};
    const shift=id=>[xy[id][0]-spec.nodes[id][0],xy[id][1]-spec.nodes[id][1]];
    // Keep the original curves at rest. Move each curve's handles with the
    // structures it joins, preserving its direction as the layout changes.
    function warp(curve,from,to) {
      const length=curve.length/2;
      const warped=Array.from({length},(_,i)=>addPoints(curve.slice(i*2,i*2+2),mix(from,to,i/(length-1))));
      const points=warped.map(pointText);
      return `M${points[0]} C${points.slice(1).join(' ')}`;
    }
    for(const [a,b] of syzygies)edges[`syzygy:${b}-${a}`]=`M${pointText(xy[a])}L${pointText(xy[b])}`;
    for(const [gate,a,b,curve,label] of spec.channels){
      const key=`gate:${gate}`, from=shift(a), to=shift(b);
      edges[key]=warp(curve,from,to);
      gates[key]=addPoints(label,mix(from,to)).map((value,i)=>clamp(value,...spec.labelBounds[i]));
    }
    for(const [a,b,curve] of spec.currents){
      const key=`current:${a}-${b}`;
      edges[key]=warp(curve,mix(shift(a),shift(9-a)),shift(b));
    }
    for(const [key,,ids,label] of mapRegions){
      const delta=ids.map(shift).reduce(addPoints,[0,0]).map(value=>value/ids.length);
      const [x,y]=addPoints(label,delta);
      regions[key]=[clamp(x,12,355),clamp(y,16,752)];
    }
    return {edges,gates,regions};
  }
  function ritePath(xy,steps) {
    let path=`M${pointText(xy[steps[0]])}`;
    for(let i=1;i<steps.length;i++){
      const a=xy[steps[i-1]], b=xy[steps[i]];
      if(steps[i-1]===steps[i]){
        const side=a[0]>212?-1:1, [x,y]=a;
        path+=` C${pointText([x+48*side,y-44])} ${pointText([x+70*side,y-28])} ${pointText([x+70*side,y])} S${pointText([x+48*side,y+44])} ${pointText(a)}`;
        continue;
      }
      const distance=Math.hypot(b[0]-a[0],b[1]-a[1]) || 1;
      const bow=(i%2?1:-1)*Math.min(distance*.33,44);
      const middle=mix(a,b), control=[middle[0]+(b[1]-a[1])*bow/distance,middle[1]-(b[0]-a[0])*bow/distance];
      const left=mix(a,control), right=mix(control,b);
      // Each segment has a mid-curve vertex for a visible direction arrow.
      path+=` Q${pointText(left)} ${pointText(mix(left,right))} Q${pointText(right)} ${pointText(b)}`;
    }
    return path;
  }
  function diagram(selectedIds, routes, caption, atlas=false,structure=null) {
    if(state.mode==='instrument')return penDiagram(selectedIds,routes,structure);
    const editable=['map','atlas'].includes(state.mode);
    const browsesZones=editable || state.mode==='aq';
    const xy=editable?positions(mapSpecs.standard):canonicalMap, {edges,gates,regions}=mapGeometry(xy);
    const poles=structure?.zone_ids || unique(selectedIds.flatMap(id=>byId[id]?.poles || [])).map(Number);
    const mapId=`nl-map-${++diagramNumber}`;
    const controls='aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" aria-describedby="'+mapId+'-hint"';
    const mapLink=(id,label,body,pair)=>structureById[id] || (editable && pair)
      ? `<g class="nl-map-link ${structure?.id===id?'selected':''}"${structureById[id]?` data-structure="${e(id)}"`:''}${editable && pair?` data-map-drag="${pair.join(',')}" ${controls}`:''} role="button" tabindex="0" aria-label="${e(structureById[id]?'Open '+label:label)}">${body}</g>`
      : body;
    const arrow=(kind,color,shape)=>`<marker id="${mapId}-${kind}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${shape==='outline'?'none':color}" stroke="${color}"/></marker>`;
    const edgePath=(key,kind,marker='')=>`<path class="nl-map-hit" data-map-edge="${key}" d="${edges[key]}"/><path class="nl-${kind}" data-map-edge="${key}" d="${edges[key]}" ${marker?`marker-end="url(#${mapId}-${marker})"`:''}/>`;
    let svg=`<svg viewBox="0 -12 425 800" role="group" aria-label="Numogram: ten zones and their currents" ${editable?'data-editable-map':''}><defs>${arrow('current','#69e484')}${arrow('channel','#52795a','outline')}${arrow('rite','#e5c482')}</defs>`;
    svg += '<path d="M214 0V780" stroke="#204329" stroke-dasharray="2 7" opacity=".6"/>';
    for(const [key,name,,,labels] of mapRegions){
      const label=`<g data-map-region="${key}" transform="${translate(regions[key])}">${labels.map((line,i)=>`<text y="${i*13}" class="nl-region">${line}</text>`).join('')}</g>`;
      svg+=mapLink(key,`${name} region`,label);
    }
    for(const [a,b] of syzygies){
      const key=`syzygy:${b}-${a}`;
      svg+=mapLink(key,`Syzygy ${b}::${a}`,edgePath(key,'syzygy'),[a,b]);
    }
    for(const [gate] of mapChannels){
      const key=`gate:${gate}`;
      const label=`<g data-map-gate="${key}" transform="${translate(gates[key])}"><circle class="nl-gate" r="12"/><text class="nl-gate-label" y="3" text-anchor="middle">${gate}</text></g>`;
      svg+=mapLink(key,`Gate ${gate}`,edgePath(key,'channel','channel')+label);
    }
    for(const [a,b] of mapCurrents){
      const key=`current:${a}-${b}`;
      svg+=mapLink(key,structureById[key]?.title || key,edgePath(key,'current','current'));
    }
    let traced=0;
    const visits=new Set();
    for(const route of routes){
      const steps=route.zones || [];
      if(steps.length<2 || !steps.every(zone=>Number.isInteger(zone) && xy[zone]))continue;
      for(const step of steps)visits.add(step);
      const path=ritePath(xy,steps), attributes=`data-map-steps="${steps.join(',')}" d="${path}"`;
      svg+=`<path class="nl-route" ${attributes}${editable?` marker-mid="url(#${mapId}-rite)"`:''}/>`;
      if(editable && traced<4)svg+=`<path class="nl-route-tracer" ${attributes} pathLength="100" style="--trace-delay:${traced*-.7}s"/>`;
      traced++;
    }
    for(const [id,point] of Object.entries(xy)){
      const active=poles.includes(Number(id)) || (!structure && state.zone===Number(id));
      const label=state.mode==='aq'?`Show AQ results in zone ${id}`:state.mode==='map'?`Explore demons at zone ${id}`:`Open Zone ${id}`;
      const visit=editable && visits.has(Number(id))?'<circle class="nl-rite-stop" r="30"/>':'';
      svg+=`<g class="nl-zone ${active?'active':''}" data-zone="${id}" data-map-zone="${id}" transform="${translate(point)}" ${editable?`data-map-drag="${id}" ${controls}`:''} role="button" tabindex="0" aria-label="${label}"><circle class="halo" r="33" fill="none" stroke="#6cec8d" opacity="${active?.3:0}"/>${visit}<circle class="zone-circle" r="25"/><text y="8" text-anchor="middle">${id}</text></g>`;
    }
    svg+='</svg>';
    const reset=editable?`<button data-map-reset aria-label="Reset map layout" ${state.mapLayout?'':'disabled'}>Reset layout</button>`:'';
    const clear=state.zone!==null && browsesZones?'<button data-clear-zone>Clear zone ×</button>':'<span class="nl-kicker">0 — 9</span>';
    const hint=editable?`<small class="nl-map-drag-hint" id="${mapId}-hint">Drag a zone or a syzygy to move it. Use arrow keys when focused.</small>`:'';
    return `<div class="nl-map ${editable?'nl-map-editable':''}"><div class="nl-map-top"><span class="nl-kicker">Decimal time-map</span><span class="nl-map-tools">${reset}${clear}</span></div>${svg}<div class="nl-map-foot">${caption}${hint}</div><div class="nl-map-legend"><span>Current</span><span>Channel</span>${editable?'<span class="nl-map-key-syzygy">Syzygy</span>':''}${traced?`<span class="nl-map-key-rite">${atlas?'Selected rite':'Recorded rite'}</span>`:''}</div></div>`;
  }
  const penTau=Math.PI*2, penRadius=38, penGateRadius=14;
  const penHetu=[[1,6],[2,7],[3,8],[4,9],[5,0]];
  const penPair=(a,b)=>[Math.min(a,b),Math.max(a,b)].join(',');
  const penPush=(p,d,s)=>[p[0]+d[0]*s,p[1]+d[1]*s];
  const penDirection=(a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],l=Math.hypot(x,y)||1;return [x/l,y/l];};
  const penEdge=(a,b,r)=>penPush(a,penDirection(a,b),r);
  const penDemonPoles=d=>(d?.poles || []).map(Number);
  const penByPair=new Map(demons.map(d=>[penPair(...penDemonPoles(d)),d]));
  const penRound = v => Math.round(v * 10) / 10;
  const penSstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function penMulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function penHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function penBezier(p0, c1, c2, p3, t) { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]]; }
  function penBezierPoints(p0, c1, c2, p3, n) { const a = []; for (let i = 0; i <= n; i++) a.push(penBezier(p0, c1, c2, p3, i / n)); return a; }
  function penWobble(pts, amp, seed) {
    if (amp <= 0 || pts.length < 3) return pts;
    const r = penMulberry(seed), fa = .6 + r() * 1.6, fb = 2.2 + r() * 3, pa = r() * penTau, pb = r() * penTau, n = pts.length - 1;
    return pts.map((p, i) => {
      if (i === 0 || i === n) return p;
      const a = pts[i - 1], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, t = i / n;
      const o = amp * Math.sqrt(Math.sin(Math.PI * t)) * (.65 * Math.sin(penTau * fa * t + pa) + .35 * Math.sin(penTau * fb * t + pb));
      return [p[0] - dy / l * o, p[1] + dx / l * o];
    });
  }
  function penSmooth(pts) {
    if (pts.length < 2) return '';
    let d = 'M' + penRound(pts[0][0]) + ' ' + penRound(pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + penRound(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + penRound(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + penRound(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + penRound(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + penRound(p2[0]) + ' ' + penRound(p2[1]);
    }
    return d;
  }
  function penHandCircle(c, r, seed, over) {
    const q = penMulberry(seed), start = q() * penTau, sweep = penTau * (1 + (over || .1) + q() * .08), n = 60, pa = q() * penTau, pb = q() * penTau, drift = (q() - .5) * .06, pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, a = start + sweep * t, rr = r * (1 + .02 * Math.sin(2 * a + pa) + .012 * Math.sin(3 * a + pb) + drift * t); pts.push([c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a)]); }
    return pts;
  }
  function penArrow(tip, from, size, seed) {
    const dx = tip[0] - from[0], dy = tip[1] - from[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, q = penMulberry(penHash(seed));
    const b = [tip[0] - ux * size, tip[1] - uy * size], w = size * .42 * (.9 + q() * .2);
    const t = [tip[0] + (q() - .5) * 1.2, tip[1] + (q() - .5) * 1.2], p1 = [b[0] + nx * w, b[1] + ny * w], p2 = [b[0] - nx * w, b[1] - ny * w];
    return 'M' + penRound(t[0]) + ' ' + penRound(t[1]) + 'L' + penRound(p1[0]) + ' ' + penRound(p1[1]) + 'Q' + penRound(b[0] + ux * size * .2) + ' ' + penRound(b[1] + uy * size * .2) + ' ' + penRound(p2[0]) + ' ' + penRound(p2[1]) + 'Z';
  }
  function penPath(d, o) {
    const anim = o.draw ? ' draw' : o.pen ? ' pen-in' : '';
    const len = (o.draw || o.pen) ? ' pathLength="1"' : '';
    const st = o.draw ? ' style="--d:' + o.d.toFixed(2) + 's;--du:' + o.du + 's"' : '';
    return '<path class="f' + anim + '" d="' + d + '" stroke-width="' + penRound(o.w) + '"' + (o.op != null ? ' opacity="' + o.op + '"' : '') + len + st + '/>';
  }
  function penFelt(pts, o) {
    const seed = penHash(o.seed), passes = o.passes || 1; let s = '';
    for (let k = 0; k < passes; k++) {
      const p = penWobble(pts, (o.amp == null ? 1 : o.amp) * (k ? 1.6 : 1), seed + k * 7919);
      s += penPath(penSmooth(p), Object.assign({}, o, { w: k ? o.w * .62 : o.w, op: k ? .5 : (o.op == null ? .95 : o.op), d: (o.d || 0) + k * .06 }));
    }
    return s;
  }
  function penSample(curve,per=15){
    const points=[curve[0]];
    for(let i=1;i<curve.length;i+=3){
      const a=curve[i-1],b=curve[i],c=curve[i+1],d=curve[i+2];
      for(let j=1;j<=per;j++){
        const t=j/per,s=1-t;
        points.push([0,1].map(k=>s*s*s*a[k]+3*s*s*t*b[k]+3*s*t*t*c[k]+t*t*t*d[k]));
      }
    }
    return points;
  }
  // A chord is the interval between two zones. It bows around any zone in its way.
  function penChord(xy,a,b,gap=6){
    const A=xy[a],B=xy[b],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
    const mid=[(A[0]+B[0])/2,(A[1]+B[1])/2],base=Math.min(60,L*.12),clear=penRadius+16,need={1:0,'-1':0};
    for(let z=0;z<10;z++){
      if(z===a || z===b)continue;
      const P=xy[z],t=((P[0]-A[0])*dx+(P[1]-A[1])*dy)/(L*L);
      if(t<=.04 || t>=.96)continue;
      const sd=(P[0]-A[0])*nx+(P[1]-A[1])*ny;
      if(Math.abs(sd)>=clear)continue;
      const k=2*t*(1-t);
      need[1]=Math.max(need[1],(sd+clear)/k);
      need[-1]=Math.max(need[-1],(clear-sd)/k);
    }
    const sDef=(mid[0]-266)*nx<0?-1:1,hDef=Math.max(base,need[sDef]),hAlt=Math.max(base,need[-sDef]);
    const s=hAlt<hDef-1?-sDef:sDef,bend=Math.min(240,s===sDef?hDef:hAlt)*s;
    const C=[mid[0]+nx*bend,mid[1]+ny*bend],P0=penEdge(A,C,penRadius+gap),P1=penEdge(B,C,penRadius+gap);
    const at=t=>{
      const u=1-t;
      return [u*u*P0[0]+2*u*t*C[0]+t*t*P1[0],u*u*P0[1]+2*u*t*C[1]+t*t*P1[1]];
    };
    const pts=[];
    for(let i=0;i<=40;i++)pts.push(at(i/40));
    return {pts,mid:pts[20],n:[nx*s,ny*s],ang:Math.atan2(dy,dx)*180/Math.PI,path:penSmooth(pts),at};
  }
  const penTrimPoints=(pts,f)=>{const k=Math.round(pts.length*f);return pts.slice(k,pts.length-k);};
  const penDotLimit=24;
  const penDepositTime=deposit=>Date.parse(deposit.created_at || deposit.updated_at) || 0;
  const penNewestDeposits=deposits=>deposits.filter(dep=>dep.status==='ink'||dep.status==='pencil')
    .sort((a,b)=>penDepositTime(b)-penDepositTime(a) || a.id.localeCompare(b.id));
  const penDepositByDemon=Object.fromEntries(demons.map(d=>[d.id,(world.instrument?.by_demon?.[d.id]?.deposits || []).map(dep=>({...dep,demon_id:d.id}))]));
  const penRecent=(dep,now)=>{
    const parsed=Date.parse(dep.updated_at || dep.created_at);
    return dep.status==='ink' && Number.isFinite(parsed) && parsed<=now && now-parsed<7*24*60*60*1000;
  };
  function penPaint(selectedIds,routes,structure){
    const overrides=Array.isArray(structure?.deposits)?structure.deposits:null;
    const byDemon=overrides?Object.fromEntries(demons.map(d=>[d.id,overrides.filter(dep=>(dep.demon_id || dep.mesh_id)===d.id)])):penDepositByDemon;
    const selected=unique([...selectedIds,...(structure?.demon_ids || [])]).filter(id=>byId[id]);
    const now=Date.now(),weights=Array(10).fill(0),hot=Array(10).fill(0);
    for(const d of demons){
      const ink=(byDemon[d.id] || []).filter(dep=>dep.status==='ink');
      const recent=Math.max(0,...ink.filter(dep=>penRecent(dep,now)).map(dep=>Date.parse(dep.updated_at || dep.created_at)));
      for(const z of penDemonPoles(d)){weights[z]+=ink.length;hot[z]=Math.max(hot[z],recent);}
    }
    const poles=new Set((structure?.zone_ids || selected.flatMap(id=>penDemonPoles(byId[id]))).map(Number));
    return {selected,poles,weights,hot,byDemon,now,routes,structure};
  }
  let activePenMap=null, reusablePen=null;
  function penSpec(xy, s) {
    if (s[0] === 'z') return [xy[s[1]][0] + s[2], xy[s[1]][1] + s[3]];
    if (s[0] === 'm') return [(xy[s[1]][0] + xy[s[2]][0]) / 2 + s[3], (xy[s[1]][1] + xy[s[2]][1]) / 2 + s[4]];
    const c = penSpec(xy, penGateCentres[s[1]]); return [c[0] + s[2], c[1] + s[3]];
  }
  const penCurrentLuts=instrumentCurrents.map(([from,to,shape])=>({...shape,from,to}));
  let penGeometryCache;
  function penGeometry(xy) {
    const signature=zones.map(zone=>xy[zone].join(',')).join(';');
    if(penGeometryCache?.signature===signature)return penGeometryCache;
    const edges={}, gates={}, regions={}, curves={}, gateShapes={};
    for(const [gate,zone,dest,g] of instrumentChannels){
      const key='gate:'+gate,gc=penSpec(xy,penGateCentres[g.g]);
      const a1=penSpec(xy,g.s1[0]),a2=penSpec(xy,g.s1[1]),pa0=penEdge(xy[zone],a1,penRadius+2),pa3=penEdge(gc,a2,penGateRadius+1.5);
      const b1=penSpec(xy,g.s2[0]),b2=penSpec(xy,g.s2[1]),pb0=penEdge(gc,b1,penGateRadius+1.5),pb3=penEdge(xy[dest],b2,penRadius+3);
      const ptsA=penBezierPoints(pa0,a1,a2,pa3,36),ptsB=penBezierPoints(pb0,b1,b2,pb3,20);
      gateShapes[gate]={ptsA,ptsB,gc,pb0,b1,b2,pb3};
      gates[key]=gc;
      edges[key]='M'+pointText(pa0)+'C'+[a1,a2,pa3].map(pointText).join(' ')+'L'+pointText(gc)+'L'+pointText(pb0)+'C'+[b1,b2,pb3].map(pointText).join(' ');
    }
    for(const c of penCurrentLuts){
      const p0=penSpec(xy,c.p0),c1=penSpec(xy,c.c1),c2=penSpec(xy,c.c2),p3=penEdge(xy[c.to],c2,penRadius+2);
      c.geo={p0,c1,c2,p3};
      penBuildLUT(c);
      const key='current:'+c.from+'-'+c.to;
      curves[key]=[p0,c1,c2,p3];
      edges[key]='M'+pointText(p0)+'C'+[c1,c2,p3].map(pointText).join(' ');
    }
    for(const [lo,hi] of syzygies){
      const a=penEdge(xy[hi],xy[lo],penRadius+5),b=penEdge(xy[lo],xy[hi],penRadius+5);
      edges['syzygy:'+hi+'-'+lo]='M'+pointText(a)+'L'+pointText(b);
    }
    return penGeometryCache={signature,edges,gates,regions,curves,gateShapes,currents:penCurrentLuts};
  }
  function penRecentRings(xy, paint) {
    const recent=zones.filter(zone=>paint.hot[zone]).sort((a,b)=>paint.hot[b]-paint.hot[a]).slice(0,3);
    return recent.map(zone=>'<circle class="recent" cx="'+penRound(xy[zone][0])+'" cy="'+penRound(xy[zone][1])+'" r="'+(penRadius+4)+'"/>').join('');
  }
  function penViewport(xy, gates) {
    // Hold the drawing scale steady while dragging. The editing frame includes
    // the full movement range of zones and their gate markers.
    if(instrumentLayoutEditing)return '-76 -112 656 1272';
    let left=-4,top=8,right=518,bottom=1054;
    const include=([x,y],padding)=>{
      left=Math.min(left,x-padding);
      top=Math.min(top,y-padding);
      right=Math.max(right,x+padding);
      bottom=Math.max(bottom,y+padding);
    };
    for(const point of Object.values(xy))include(point,penRadius+12);
    for(const point of Object.values(gates))include(point,penGateRadius+8);
    return [left,top,right-left,bottom-top].map(penRound).join(' ');
  }
  function penStructure(xy, geo, paint, boot = false) {
    const B = boot && penMotion();
    let gates = '', curs = '', bonds = '', zones = '';
    instrumentChannels.forEach(([gate, zone], i) => {
      const { ptsA, ptsB, gc, pb0, b1, b2, pb3 } = geo.gateShapes[gate];
      const d = B ? 1.15 + i * .07 : 0;
      gates += '<g class="gate">'
        + penFelt(ptsA, { seed: 'ga' + zone, w: 1.5, amp: .8, draw: B, d, du: .5 })
        + penFelt(ptsB, { seed: 'gb' + zone, w: 1.5, amp: .5, draw: B, d: d + .35, du: .3 })
        + '<path class="fa' + (B ? ' fade' : '') + '" style="--d:' + (d + .6).toFixed(2) + 's" d="' + penArrow(pb3, penBezier(pb0, b1, b2, pb3, .72), 9, 'gh' + zone) + '"/>'
        + penPath(penSmooth(penHandCircle(gc, penGateRadius, penHash('gc' + zone), .14)), { w: 1.4, draw: B, d: d + .2, du: .35 })
        + '<text class="gn' + (B ? ' fade' : '') + '" style="--d:' + (d + .4).toFixed(2) + 's" x="' + penRound(gc[0]) + '" y="' + penRound(gc[1] + .5) + '">' + gate + '</text>'
        + '</g>';
    });
    geo.currents.forEach((c, i) => {
      const { p0, c1, c2, p3 } = c.geo;
      curs += '<path class="fa' + (B ? ' fade' : '') + '" style="--d:' + (.95 + i * .08).toFixed(2) + 's" d="' + penArrow(p3, penBezier(p0, c1, c2, p3, .86), c.ah, 'ca' + c.id) + '"/>';
    });
    for (const hi of [5, 6, 7, 8, 9]) {
      const lo = 9 - hi, A = penEdge(xy[hi], xy[lo], penRadius + 5), Bp = penEdge(xy[lo], xy[hi], penRadius + 5);
      const coordinates = 'x1="' + penRound(A[0]) + '" y1="' + penRound(A[1]) + '" x2="' + penRound(Bp[0]) + '" y2="' + penRound(Bp[1]) + '"';
      bonds += '<line class="bond" ' + coordinates + '/>';
    }
    const order = [0, 9, 8, 1, 7, 2, 6, 3, 5, 4];
    const maxWeight = Math.log1p(Math.max(...paint.weights)) || 1;
    for (let z = 0; z < 10; z++) {
      const c = xy[z], tw = xy[9 - z], l = Math.hypot(tw[0] - c[0], tw[1] - c[1]) || 1, dx = (tw[0] - c[0]) / l, dy = (tw[1] - c[1]) / l;
      const k = order.indexOf(z), d = B ? .1 + Math.floor(k / 2) * .16 + (k % 2) * .05 : 0;
      const passes = 2 + Math.floor(3 * Math.log1p(paint.weights[z]) / maxWeight);
      let circles = '';
      for (let p = 0; p < passes; p++) circles += penPath(penSmooth(penHandCircle(c, penRadius + (p ? ((p % 2) ? .9 : -.8) * Math.ceil(p / 2) : 0), penHash('z' + z + 'p' + p), .1)), { w: p ? 1.1 : 2.2, op: p ? .5 : .95, draw: B, d: d + p * .05, du: .55 });
      const tc = [c[0] + dx * penRadius * .62, c[1] + dy * penRadius * .62];
      const tip = [tc[0] + dx * 6, tc[1] + dy * 6];
      zones += '<g class="zone">' + circles
        + '<path class="fa' + (B ? ' fade' : '') + '" style="--d:' + (d + .4).toFixed(2) + 's" d="' + penArrow(tip, tc, 9, 'zt' + z) + '"/>'
        + '<text class="zn' + (B ? ' fade' : '') + '" style="--d:' + (d + .3).toFixed(2) + 's" x="' + penRound(c[0] - dx * penRadius * .2) + '" y="' + penRound(c[1] - dy * penRadius * .2) + '">' + z + '</text>'
        + '</g>';
    }
    return gates + curs + bonds + zones;
  }

  function penBuildLUT(c) {
    const { p0, c1, c2, p3 } = c.geo, N = 120; c.N = N; c.lut = new Float32Array((N + 1) * 4);
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = penBezier(p0, c1, c2, p3, t), q = penBezier(p0, c1, c2, p3, Math.min(1, t + .01)), o = penBezier(p0, c1, c2, p3, Math.max(0, t - .01));
      const tx = q[0] - o[0], ty = q[1] - o[1], l = Math.hypot(tx, ty) || 1;
      c.lut[i * 4] = p[0]; c.lut[i * 4 + 1] = p[1]; c.lut[i * 4 + 2] = -ty / l; c.lut[i * 4 + 3] = tx / l;
    }
    if (!c.dots) {
      const q = penMulberry(penHash('dots' + c.id)); c.dots = [];
      for (let i = 0; i < c.n; i++) c.dots.push({ t: q(), u: (q() + q() + q()) / 1.5 - 1, rad: .5 + q() * .8, b: q() < .45 ? 0 : q() < .65 ? 1 : 2, s: .8 + q() * .4 });
    }
  }
  function penLutAt(c, t) { const x = clamp(t, 0, 1) * c.N, i = Math.min(c.N - 1, x | 0), fr = x - i, a = i * 4, b = a + 4, L = c.lut; return [L[a] + (L[b] - L[a]) * fr, L[a + 1] + (L[b + 1] - L[a + 1]) * fr, L[a + 2], L[a + 3]]; }
  function penReticle(c,r,cls=''){
    const suffix=cls?' '+cls:'';
    let s='<circle class="ring'+suffix+'" cx="'+penRound(c[0])+'" cy="'+penRound(c[1])+'" r="'+r+'"/>';
    for(let k=0;k<4;k++){
      const a=k*Math.PI/2,x=Math.cos(a),y=Math.sin(a);
      s+='<line class="tick'+suffix+'" x1="'+penRound(c[0]+x*(r+3))+'" y1="'+penRound(c[1]+y*(r+3))+'" x2="'+penRound(c[0]+x*(r+10))+'" y2="'+penRound(c[1]+y*(r+10))+'"/>';
    }
    return s;
  }
  function penDot(dep,p,now){
    const title=dep.label || dep.text || dep.title || dep.host_id || dep.system+' '+(dep.status==='pencil'?'proposal':'deposit');
    const recent=penRecent(dep,now),warmth=recent?1-(now-Date.parse(dep.updated_at || dep.created_at))/604800000:0;
    const ink=dep.status==='pencil'?' is-pencil':recent?' is-hot':'';
    return '<circle class="nl-pen-deposit s-'+e(dep.system)+ink+'" data-instrument-deposit="'+e(dep.id)+'" cx="'+penRound(p[0])+'" cy="'+penRound(p[1])+'" r="3.6" style="--pen-warmth:'+warmth.toFixed(3)+'"><title>'+e(title)+'</title></circle>';
  }
  function penChordInk(d,g,n,p,max,o){
    if(!n)return p || o.showEmpty?'<path class="pencil'+(!p||o.faint?' faint':'')+'" d="'+g.path+'"/>':'';
    if(n<max*.1)return penFelt(g.pts,{seed:o.tag+d.number,w:1,amp:.8,op:.5,pen:o.pen});
    const weight=Math.log1p(n)/Math.log1p(max);
    return penFelt(g.pts,{seed:o.tag+d.number,w:(o.w || 1)+1.8*weight,amp:o.amp ?? .8,passes:1+Math.round(weight*2),op:o.op,pen:o.pen});
  }
  function penOverlay(xy,geo,paint){
    const {selected,byDemon,structure,now,routes}=paint;
    const kind=structure?.kind || 'rest',proposal=state.instrument.proposalZone;
    const A=kind==='zone'?structure.anchor_zone:proposal;
    const limited=Array.isArray(structure?.deposit_ids)?new Set(structure.deposit_ids):null;
    const inkCounts=deposits=>({n:deposits.filter(dep=>dep.status==='ink').length,p:deposits.some(dep=>dep.status==='pencil')});
    const entries=demons.map(d=>{
      const all=byDemon[d.id] || [],global=inkCounts(all);
      const scoped=limited?inkCounts(all.filter(dep=>limited.has(dep.id))):global;
      return {d,all,global,...scoped};
    });
    const byMesh=new Map(entries.map(entry=>[entry.d.id,entry]));
    const fullKind=['card','skill','thinker','book'].includes(kind);
    const chamberIds=new Set(structure?.chamber_demon_ids || []);
    const fullFootprint=fullKind?unique([...selected,...chamberIds,...(structure?.pencil_demon_ids || [])])
      .map(id=>byMesh.get(id)).filter(Boolean).sort((a,b)=>b.n-a.n || Number(b.p)-Number(a.p) || Number(a.d.number)-Number(b.d.number)):[];
    const maximum=Math.max(1,...entries.map(({d,global,n})=>{
      if(state.instrument.web || (A!=null && penDemonPoles(d).includes(A)))return global.n;
      return selected.includes(d.id)?n:0;
    }));
    let chords='',reticles='',names='',hits='',dots='',anchorPoint=null;
    const lit=markup=>'<g filter="url(#'+activePenMap.mapId+'-glow)">'+markup+'</g>';
    if(state.instrument.web)for(const {d,global:{n,p}} of entries){
      chords+=penChordInk(d,penChord(xy,...penDemonPoles(d)),n,p,maximum,{tag:'w',op:.8,faint:true,showEmpty:true});
    }
    if(state.instrument.web && arithmeticOnly){
      for(const a of zones)for(const b of zones.slice(a+1)){
        chords+=`<path class="pencil faint" d="${penChord(xy,a,b).path}"/>`;
      }
    }
    if(state.instrument.hetu)for(const [x,y] of penHetu){
      const g=penChord(xy,x,y);
      reticles+='<path class="hetu" d="'+g.path+'"/>';
      if(x+y===9)reticles+='<circle class="hetu-m" cx="'+penRound(g.mid[0])+'" cy="'+penRound(g.mid[1])+'" r="3.4"/><text class="hetu-l" x="'+penRound(g.mid[0]-10)+'" y="'+penRound(g.mid[1]+18)+'" text-anchor="end">ODDUBB · SYZYGY AND HETU</text>';
    }
    if(A!=null && xy[A]){
      for(let z=0;z<10;z++){
        if(z===A)continue;
        const d=penByPair.get(penPair(A,z)),entry=byMesh.get(d?.id);
        if(!entry && !arithmeticOnly)continue;
        const g=penChord(xy,A,z);
        if(!state.instrument.web)chords+=entry?penChordInk(d,g,entry.global.n,entry.global.p,maximum,{tag:'h',op:.85,showEmpty:true}):`<path class="pencil faint" d="${g.path}"/>`;
        if(kind==='zone' && proposal==null){
          const target=d?`data-instrument-chord="${e(d.id)}"`:`data-instrument-pair="${A},${z}"`;
          const label=d?d.name+', pair '+A+' and '+z:'Pair Zones '+A+' and '+z;
          hits+=`<g class="nl-pen-candidate" ${target} tabindex="0" role="button" aria-label="${e(label)}"><path class="chit" d="${penSmooth(penTrimPoints(g.pts,.14))}"><title>${e(d?d.name+' '+d.net_span:label)}</title></path><path class="nl-pen-candidate-preview" d="${g.path}"/></g>`;
        }
      }
      reticles+=penReticle(xy[A],penRadius+7);
      if(kind==='zone')anchorPoint=[xy[A][0]+penRadius+10,xy[A][1]];
    }
    if(kind==='interval'){
      const [a,b]=paint.poles,g=penChord(xy,a,b);
      chords+=`<path class="preview" d="${g.path}"/>`;
      reticles+=lit(penReticle(xy[a],penRadius+7)+penReticle(xy[b],penRadius+7));
      anchorPoint=g.mid;
    }
    if(kind==='demon' && selected.length===1){
      const entry=byMesh.get(selected[0]),d=entry.d,[a,b]=penDemonPoles(d),g=penChord(xy,a,b);
      const list=penNewestDeposits(entry.all).slice(0,penDotLimit);
      chords+=penChordInk(d,g,entry.n,entry.p,maximum,{tag:'d',w:1.5,amp:.9,pen:penMotion(),showEmpty:true});
      let ang=g.ang;
      if(ang>90)ang-=180;
      if(ang<-90)ang+=180;
      let lp,anchor='middle',tf='';
      if(Math.abs(ang)>60){
        const sx=g.n[0]>=0?1:-1;
        lp=[g.mid[0]+sx*18,g.mid[1]+7];
        anchor=sx>0?'start':'end';
      }else{
        lp=[g.mid[0]+g.n[0]*20,g.mid[1]+g.n[1]*20+7];
        tf=' transform="rotate('+penRound(ang)+' '+penRound(lp[0])+' '+penRound(lp[1]-7)+')"';
      }
      names+='<text class="cname'+(penMotion()?' ink-in':'')+'" x="'+penRound(lp[0])+'" y="'+penRound(lp[1])+'" text-anchor="'+anchor+'"'+tf+'>'+e(d.name)+'</text>';
      anchorPoint=[lp[0],lp[1]-7];
      list.forEach((dep,i)=>{
        const t=(i+1)/(list.length+1),idx=Math.round(t*40),p=g.pts[idx],u=g.pts[Math.max(0,idx-1)],v=g.pts[Math.min(40,idx+1)];
        const [dx,dy]=penDirection(u,v),side=(i%2?1:-1)*(7+Math.floor(i/6)*6);
        dots+=penDot(dep,[p[0]-dy*side,p[1]+dx*side],now);
      });
      reticles+=lit(penReticle(xy[a],penRadius+7)+penReticle(xy[b],penRadius+7));
      const routeGates=new Set(routes.flatMap(route=>route.zones?.slice(1).flatMap((to,i)=>{
        const from=route.zones[i],gate=mapSpecs.instrument.channels.find(([,u,v])=>u===from && v===to);
        return from+to!==9 && gate?['gate:'+gate[0]]:[];
      }) || []));
      for(const gate of routeGates){
        const point=geo.gates[gate];
        if(point)reticles+=lit('<circle class="gring" cx="'+penRound(point[0])+'" cy="'+penRound(point[1])+'" r="'+(penGateRadius+5)+'"/>');
      }
    }
    if(fullKind){
      const touched=new Set();
      fullFootprint.forEach(({d,n,p},i)=>{
        const [a,b]=penDemonPoles(d),g=penChord(xy,a,b);
        chords+=!n && chamberIds.has(d.id)?`<path class="chamber-link" d="${g.path}"/>`:
          penChordInk(d,g,n,p,maximum,{tag:'f',w:1.4,pen:penMotion()&&i<12,showEmpty:true});
        touched.add(a);touched.add(b);
        if(i===0)anchorPoint=[g.mid[0]+g.n[0]*10,g.mid[1]+g.n[1]*10];
      });
      for(const z of touched)reticles+=penReticle(xy[z],penRadius+7,'soft');
    }
    const aqZone=structure?.aq_zone;
    if(kind==='aq' && Number.isInteger(aqZone) && xy[aqZone]){
      reticles+=lit(penReticle(xy[aqZone],penRadius+7));
      anchorPoint=[xy[aqZone][0]+penRadius+10,xy[aqZone][1]];
    }
    if(kind==='structure'){
      const structureId=structure?.structure_id || structure?.id;
      if(geo.gates[structureId]){
        const p=geo.gates[structureId];
        reticles+=lit('<circle class="gring" transform="'+translate(p)+'" r="'+(penGateRadius+5)+'"/>');
        anchorPoint=[p[0]+penGateRadius+8,p[1]];
      }else if(structureId?.startsWith('current:') && geo.curves[structureId]){
        const pts=penSample(geo.curves[structureId]);
        chords+='<path class="preview" d="'+geo.edges[structureId]+'"/>';
        anchorPoint=pts[Math.floor(pts.length/2)];
      }
      for(const z of paint.poles)if(xy[z]){
        reticles+=penReticle(xy[z],penRadius+7,'soft');
        if(!anchorPoint)anchorPoint=[xy[z][0]+penRadius+10,xy[z][1]];
      }
    }
    if(anchorPoint)reticles+='<circle data-pen-anchor r="1" cx="'+penRound(anchorPoint[0])+'" cy="'+penRound(anchorPoint[1])+'" opacity="0" aria-hidden="true"/>';
    return {chords,reticles,names,hits,dots};
  }
  function penRite(xy,geo,steps){
    return steps.slice(1).map((to,i)=>{
      const from=steps[i],a=xy[from],b=xy[to];
      const channel=mapSpecs.instrument.channels.find(([,u,v])=>u===from && v===to);
      const current=mapSpecs.instrument.currents.find(([u,v])=>u===from && v===to);
      // Matrix records an ordered sequence. Highlight a physical link only
      // where the adjacent digits actually name one; other steps are jumps.
      let pts,kind;
      if(from+to===9){
        kind='syzygy';
        pts=[a,b];
      }else if(channel){
        kind='channel';
        const {ptsA,gc,ptsB}=geo.gateShapes[channel[0]];
        pts=[a,...ptsA,gc,...ptsB,b];
      }else if(current){
        kind='current';
        pts=[a,...penSample(geo.curves['current:'+from+'-'+to],24),b];
      }else{
        if(from===to){
          const side=a[0]>256?-1:1,r=penRadius,p=[a[0]+side*r,a[1]-r*.45],q=[a[0]+side*r,a[1]+r*.45];
          const c1=[a[0]+side*(r+54),a[1]-r-7],c2=[a[0]+side*(r+54),a[1]+r+7];
          const loop=penSample([p,c1,c2,q]);
          return {path:'M'+pointText(p)+'C'+pointText(c1)+' '+pointText(c2)+' '+pointText(q),arrow:penArrow(loop[10],loop[8],9,'rite-'+i),kind:'jump'};
        }
        const g=penChord(xy,from,to,3);
        return {path:g.path,arrow:penArrow(g.at(.66),g.at(.61),9,'rite-'+i),kind:'jump'};
      }
      return {path:'M'+pts.map(pointText).join('L'),kind};
    });
  }
  const penMotionPreference=frameWindow?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const penMotion=()=>!penMotionPreference?.matches;
  function penRoutePaths(xy,geo,routes,animate=true){
    return routes.filter(route=>route.zones?.length>1 && route.zones.every(zone=>Number.isInteger(zone)&&xy[zone])).map(route=>{
      const segs=penRite(xy,geo,route.zones);
      return '<g class="nl-pen-rite'+(!animate?' is-static':'')+'" data-map-steps="'+route.zones.join(',')+'">'+segs.map(({path,arrow,kind},i)=>{
        const duration=.46,delay=i*.39;
        return '<g class="nl-pen-rite-step is-'+kind+'" style="--pen-route-delay:'+delay.toFixed(2)+'s;--pen-route-duration:'+duration+'s"><path class="nl-pen-rite-line" d="'+path+'" pathLength="1"/>'+
          (arrow?'<path class="nl-pen-rite-tip" d="'+arrow+'"/>':'')+
          (animate && penMotion() && kind!=='jump'?'<circle class="nl-pen-rite-head" r="4.2" style=\'offset-path:path("'+path+'")\'/>':'')+'</g>';
      }).join('')+'</g>';
    }).join('');
  }
  function penDiagram(selectedIds,routes,structure) {
    const spec=mapSpecs.instrument,xy=positions(spec),geo=mapGeometry(xy,spec),{edges,gates}=geo;
    const mapId='nl-pen-'+ ++diagramNumber;
    const paint=penPaint(selectedIds,routes,structure);
    const routeKey=selectedIds.join(',')+'|'+routes.map(r=>r.rite_id || r.id || r.code || r.zones?.join(',')).join('|');
    const animateRoute=routeKey!==activePenMap?.routeKey;
    const reuseInk=Boolean(reusablePen && paint.weights.every((weight,zone)=>weight===activePenMap?.paint.weights[zone]));
    const boot=!state.instrument.booted && penMotion();
    state.instrument.booted=true;
    activePenMap={mapId,paint,routeKey,reuseInk};
    const ink=reuseInk?'':penStructure(xy,geo,paint,boot);
    const {chords,reticles,names,hits:candidates,dots}=penOverlay(xy,geo,paint);
    const editable=instrumentLayoutEditing?'aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"':'';
    const defs=`<defs>
          <filter id="${mapId}-felt" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="4" result="grain"/>
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="0.9" xChannelSelector="R" yChannelSelector="G" result="rough"/>
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9" result="wave"/>
            <feDisplacementMap in="rough" in2="wave" scale="2.4" xChannelSelector="G" yChannelSelector="B" result="drawn"/>
            <feGaussianBlur in="drawn" stdDeviation="0.45" result="bleed"/>
            <feMerge><feMergeNode in="bleed"/><feMergeNode in="drawn"/></feMerge>
          </filter>
          <filter id="${mapId}-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>`;
    const link=(id,label,body)=>structureById[id]?'<g class="nl-pen-hit" data-structure="'+e(id)+'" role="button" tabindex="0" aria-label="'+e(label)+'">'+body+'</g>':'';
    let hitTargets='';
    for(const [gate] of spec.channels){
      const key='gate:'+gate;
      hitTargets+=link(key,'Gate '+gate,'<path class="nl-map-hit nl-pen-target" data-map-edge="'+key+'" d="'+edges[key]+'"/><g data-map-gate="'+key+'" transform="'+translate(gates[key])+'"><circle class="nl-pen-target" r="18"/></g>');
    }
    for(const [a,b] of spec.currents){
      const key='current:'+a+'-'+b;
      hitTargets+=link(key,structureById[key]?.title || 'Current '+a+' to '+b,'<path class="nl-map-hit nl-pen-target" data-map-edge="'+key+'" d="'+edges[key]+'"/>');
    }
    for(const [a,b] of syzygies){
      const key='syzygy:'+b+'-'+a,pair=penPair(a,b),active=paint.poles.has(a) && paint.poles.has(b);
      hitTargets+='<g class="nl-pen-hit nl-pen-pair '+(active?'active':'')+'" data-instrument-pair="'+pair+'" data-map-drag="'+pair+'" '+editable+' role="button" tabindex="0" aria-label="Syzygy '+b+'::'+a+'" aria-pressed="'+active+'"><path class="nl-map-hit nl-pen-target" data-map-edge="'+key+'" d="'+edges[key]+'"/></g>';
    }
    let zoneHits='';
    for(const [id,point] of Object.entries(xy)){
      const selected=paint.poles.has(Number(id));
      zoneHits+='<g class="nl-pen-hit nl-pen-zone-hit '+(selected?'active':'')+'" data-zone="'+id+'" data-map-zone="'+id+'" data-map-drag="'+id+'" transform="'+translate(point)+'" '+editable+' role="button" tabindex="0" aria-label="Zone '+id+'" aria-pressed="'+selected+'"><circle class="nl-pen-target" r="'+(penRadius+8)+'"/></g>';
    }
    const aq=typeof instrumentAQOverlay==='function'?instrumentAQOverlay(xy,gates,structure?.aq_draft,structure?.aq_committed,structure?.aq_fall || 0):'';
    const cls=(state[spec.stateKey]?'rearranged ':'')+
      (structure?.kind==='zone'?'nl-pen-dim-zone':structure?.kind && structure.kind!=='rest'?'nl-pen-dim':'');
    return '<div class="nl-map nl-pen-map"><canvas class="nl-pen-canvas" aria-hidden="true"></canvas><svg class="'+cls+'" data-editable-map data-map-skin="instrument" viewBox="'+penViewport(xy,gates)+'" preserveAspectRatio="xMidYMid meet" id="'+mapId+'"'+(boot?' data-pen-boot':'')+' role="group" aria-label="Numogram, ten zones and five syzygies">'+defs+
      '<g data-pen-under aria-hidden="true" filter="url(#'+mapId+'-glow)">'+penRecentRings(xy,paint)+'</g><g data-pen-ink aria-hidden="true" filter="url(#'+mapId+'-felt)">'+ink+'</g>'+
      '<g data-pen-chords aria-hidden="true" filter="url(#'+mapId+'-felt)">'+chords+'</g><g data-pen-hover aria-hidden="true" pointer-events="none" filter="url(#'+mapId+'-felt)"></g><g data-pen-routes aria-hidden="true" filter="url(#'+mapId+'-glow)">'+penRoutePaths(xy,geo,routes,animateRoute)+'</g><g data-pen-reticles aria-hidden="true">'+reticles+'</g>'+
      '<g data-instrument-aq-overlay aria-hidden="true" pointer-events="none" filter="url(#'+mapId+'-felt)">'+aq+'</g><g data-pen-names aria-hidden="true">'+names+'</g>'+hitTargets+
      '<g data-pen-candidates>'+candidates+'</g>'+zoneHits+'<g data-pen-dots>'+dots+'</g>'+
      '<g data-pen-gesture aria-hidden="true" pointer-events="none" filter="url(#'+mapId+'-felt)"></g></svg><div class="nl-pen-notes" data-pen-notes></div></div>';
  }
  const mapSpec = svg => mapSpecs[svg?.dataset?.mapSkin] || mapSpecs.standard;
  function updateMap(svg,xy) {
    const spec=mapSpec(svg), geo=mapGeometry(xy,spec), {edges,gates,regions}=geo, paths=new Map();
    for(const edge of svg.querySelectorAll('[data-map-edge]'))edge.setAttribute('d',edges[edge.dataset.mapEdge]);
    for(const gate of svg.querySelectorAll('[data-map-gate]'))gate.setAttribute('transform',translate(gates[gate.dataset.mapGate]));
    for(const region of svg.querySelectorAll('[data-map-region]'))region.setAttribute('transform',translate(regions[region.dataset.mapRegion]));
    for(const zone of svg.querySelectorAll('[data-map-zone]'))zone.setAttribute('transform',translate(xy[zone.dataset.mapZone]));
    if(spec===mapSpecs.instrument && activePenMap?.mapId===svg.id){
      const {paint}=activePenMap, ink=penStructure(xy,geo,paint), overlay=penOverlay(xy,geo,paint);
      if(!instrumentLayoutEditing)svg.setAttribute('viewBox',penViewport(xy,gates));
      svg.removeAttribute('data-pen-boot');
      for(const [group,markup] of Object.entries({ink,...overlay,under:penRecentRings(xy,paint),candidates:overlay.hits,routes:penRoutePaths(xy,geo,paint.routes,false)})){
        const layer=svg.querySelector('[data-pen-'+group+']');
        if(layer)layer.innerHTML=markup;
      }
      svg.classList.toggle('rearranged',Boolean(state[spec.stateKey]));
      const EventType=svg.ownerDocument?.defaultView?.CustomEvent;
      if(EventType)svg.dispatchEvent(new EventType('numo:map-layout',{bubbles:true,detail:{svg,xy,gates}}));
    }else for(const route of svg.querySelectorAll('[data-map-steps]')){
      const steps=route.dataset.mapSteps;
      if(!paths.has(steps))paths.set(steps,ritePath(xy,steps.split(',').map(Number)));
      route.setAttribute('d',paths.get(steps));
    }
    const reset=svg.closest(spec===mapSpecs.instrument?'.nl-instrument':'.nl-map')?.querySelector('[data-map-reset]');
    if(reset){
      reset.disabled=!state[spec.stateKey];
      if(spec===mapSpecs.instrument)reset.hidden=reset.disabled && !instrumentLayoutEditing;
    }
  }
  function moveMap(svg,xy,ids,delta) {
    const spec=mapSpec(svg);
    const bounded=delta.map((value,i)=>clamp(value,
      Math.max(...ids.map(id=>spec.bounds[i][0]-xy[id][i])),
      Math.min(...ids.map(id=>spec.bounds[i][1]-xy[id][i]))));
    const next={...xy};
    for(const id of ids)next[id]=addPoints(xy[id],bounded);
    state[spec.stateKey]=next;
    updateMap(svg,next);
  }
  function mapPoint(svg,event) {
    const matrix=svg.getScreenCTM();
    if(!matrix)return null;
    const point=svg.createSVGPoint();
    point.x=event.clientX;
    point.y=event.clientY;
    return point.matrixTransform(matrix.inverse());
  }
  function instrumentDragTarget(drag,point) {
    if(!point)return null;
    let nearest=null, distance=penRadius+8;
    for(const [zone,[x,y]] of Object.entries(drag.xy)){
      const hit=Math.hypot(point.x-x,point.y-y);
      if(hit<distance){nearest=Number(zone);distance=hit;}
    }
    return nearest!==null && nearest!==drag.from && penByPair.has(penPair(drag.from,nearest))?nearest:null;
  }
  function drawInstrumentGesture(drag,point) {
    const to=instrumentDragTarget(drag,point), origin=drag.xy[drag.from];
    const bounds=drag.svg.viewBox.baseVal;
    const tip=[clamp(point.x,bounds.x,bounds.x+bounds.width),clamp(point.y,bounds.y,bounds.y+bounds.height)];
    const length=Math.hypot(tip[0]-origin[0],tip[1]-origin[1]);
    let points=to===null?null:penChord(drag.xy,drag.from,to).pts;
    if(!points && length>penRadius){
      const start=penEdge(origin,tip,penRadius), normal=penDirection(start,tip);
      const mid=penPush(start,normal,(length-penRadius)/2);
      const bend=penPush(mid,[-normal[1],normal[0]],Math.min(14,(length-penRadius)/9));
      points=penSample([start,mid,bend,tip]);
    }
    drag.gesture.innerHTML=penReticle(origin,penRadius+5)
      +(points?penFelt(points,{seed:'gesture-'+drag.from,w:2.1,amp:.65}):'')
      +(to===null?'':penReticle(drag.xy[to],penRadius+5));
    if(to!==drag.to){drag.to=to;instrumentNotes();}
  }
  function mapPointerDown(event) {
    if(mapDrag && !mapDrag.svg.isConnected)mapDrag=null;
    if(mapDrag || event.button!==0 || !event.isPrimary)return;
    const item=event.target.closest('[data-map-drag]'), svg=item?.closest('svg[data-editable-map]');
    if(!svg)return;
    const spec=mapSpec(svg);
    const pairing=spec===mapSpecs.instrument && !instrumentLayoutEditing;
    const gesture=pairing?svg.querySelector('[data-pen-gesture]'):null;
    if(pairing && (!gesture || item.dataset.mapZone===undefined))return;
    const start=mapPoint(svg,event);
    if(!start)return;
    item.setPointerCapture(event.pointerId);
    mapDrag={svg,item,start,xy:positions(spec),ids:item.dataset.mapDrag.split(','),pointer:event.pointerId,x:event.clientX,y:event.clientY,moved:false,
      gesture,from:Number(item.dataset.mapZone),to:null};
  }
  function mapPointerMove(event) {
    const drag=mapDrag;
    if(!drag || drag.pointer!==event.pointerId || !drag.svg.isConnected)return;
    if(!drag.moved && Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5)return;
    const next=mapPoint(drag.svg,event);
    if(!next)return;
    if(!drag.moved){
      drag.moved=true;
      if(drag.gesture){
        drag.svg.querySelector('[data-pen-hover]')?.replaceChildren();
        instrumentNotes();
      }else drag.svg.classList.add('nl-map-dragging');
    }
    if(drag.gesture){drawInstrumentGesture(drag,next);return;}
    moveMap(drag.svg,drag.xy,drag.ids,[next.x-drag.start.x,next.y-drag.start.y]);
  }
  function mapPointerEnd(event) {
    const drag=mapDrag;
    if(!drag || drag.pointer!==event.pointerId)return;
    mapDrag=null;
    if(drag.item.hasPointerCapture(event.pointerId))drag.item.releasePointerCapture(event.pointerId);
    if(!drag.moved)return;
    suppressedMapClick=drag.svg;
    clearTimeout(mapClickTimer);
    mapClickTimer=setTimeout(()=>{suppressedMapClick=null;},0);
    if(drag.gesture){
      drag.gesture.replaceChildren();
      const to=event.type==='pointerup' && drag.svg.isConnected?instrumentDragTarget(drag,mapPoint(drag.svg,event)):null;
      if(to!==null)instrumentJoinZones(drag.from,to);
      else{instrumentHoverZone(null);instrumentNotes();}
      return;
    }
    drag.svg.classList.remove('nl-map-dragging');
    if(mapSpec(drag.svg)===mapSpecs.instrument)updateMap(drag.svg,positions(mapSpecs.instrument));
    persist();
  }
  function mapClick(event) {
    if(event.detail && suppressedMapClick?.contains(event.target)){
      suppressedMapClick=null;
      return true;
    }
    const reset=event.target.closest('[data-map-reset]');
    if(!reset?.hasAttribute?.('data-map-reset'))return false;
    const svg=reset.closest('.nl-map')?.querySelector('svg') || reset.closest('.nl-instrument')?.querySelector('svg[data-map-skin="instrument"]');
    const spec=mapSpec(svg);
    state[spec.stateKey]=null;
    if(svg)updateMap(svg,spec.nodes);
    persist();
    return true;
  }
  function mapKeys(event) {
    const arrows={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0]};
    const delta=arrows[event.key], item=event.target.closest('[data-map-drag]'), svg=item?.closest('svg[data-editable-map]');
    if(!delta || !svg)return false;
    if(mapSpec(svg)===mapSpecs.instrument && !instrumentLayoutEditing)return false;
    event.preventDefault();
    moveMap(svg,positions(mapSpec(svg)),item.dataset.mapDrag.split(','),delta.map(value=>value*(event.shiftKey?20:5)));
    persist();
    return true;
  }
  const authorInfo = row => {const run=runs.find(r=>r.id===row.run_id);return {id:row.author_id || run?.author_id || row.author || run?.author || 'Unattributed',name:row.author || run?.author || 'Unattributed'};};
  function authorReadings(rows,s,scope,card,size){
    const groups=new Map();for(const row of rows){const a=authorInfo(row);if(!groups.has(a.id))groups.set(a.id,{...a,rows:[]});groups.get(a.id).rows.push(row);}
    const hidden=new Set(s.hiddenAuthors || []),collapsed=new Set(s.collapsedAuthors || []),visible=rows.filter(r=>!hidden.has(authorInfo(r).id));
    const action=(kind,label,id='')=>`<button class="nl-textbutton" data-author-scope="${scope}" data-author-action="${kind}" data-author-key="${e(id)}">${label}</button>`;
    const controls=`<div class="nl-author-lens"><div class="nl-author-lens-top">${action('groups','By thinker')}${action('chronology','Chronology')}<span>${visible.length} / ${rows.length} encounters · ${groups.size} thinkers</span>${hidden.size?action('restore','Show hidden thinkers'):''}</div><p>Collapse or hide a thinker to make room for others. This changes the view only.</p>${[...groups.values()].filter(g=>hidden.has(g.id)).map(g=>`<span class="nl-hidden-author">${e(g.name)} · hidden ${action('show','Show',g.id)}</span>`).join('')}</div>`;
    if(s.authorMode==='chronology')return controls+visible.slice(s.page*size,(s.page+1)*size).map(card).join('');
    return controls+[...groups.values()].filter(g=>!hidden.has(g.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(g=>{
      const closed=collapsed.has(g.id),limit=s.authorLimits?.[g.id] || size;
      return `<section class="nl-author-reading-group"><header>${action('collapse',`${closed?'▸':'▾'} ${e(g.name)} <small>${g.rows.length}</small>`,g.id)}<span>${action('only','Only',g.id)}${action('hide','Hide',g.id)}</span></header>${closed?'':g.rows.slice(0,limit).map(card).join('')+(g.rows.length>limit?action('more',`Show more from ${e(g.name)} · ${g.rows.length-limit} remaining`,g.id):'')}</section>`;
    }).join('');
  }
  function learningAccount(identity){
    const account=world.learning_accounts?.[identity];
    return `<section class="nl-learning-account"><div class="nl-kicker">Process A / Developing account</div>${account?`<h3>What is taking shape</h3><p class="nl-prose">${e(account.result.summary)}</p>${account.recovery?`<p class="nl-meta">Recovered from the saved response · ${account.recovery.retained_claim_indexes.length} claims retained. ${e(account.recovery.note)}</p>`:''}<p class="nl-meta">${e(account.completed_at.slice(0,16))} · ${e(account.model)} · ${account.coverage.included_readings} sampled readings</p>${account.result.claims.filter(c=>c.entity_id===identity).map(c=>`<details><summary>${e(c.aspect)} · ${e(c.status)}</summary><p>${e(c.statement)}</p><p class="nl-meta">${e(c.change)} · ${e(c.change_reason)}</p><p>Counter-reading: ${e(c.counter_reading)}</p></details>`).join('')}`:'<p class="nl-prose">Develop an account of what inhabits or passes through this structure. Each revision reads the sources, saved readings and earlier accounts together.</p>'}<button class="nl-button" data-learning="${e(identity)}">${account?'Read evidence or develop the next round':'Open learning studio'} →</button><p class="nl-meta">B can then reread a saved NUMO reading and its original through these accounts.</p></section>`;
  }
  const evidence = observation => `<article class="nl-encounter"><div class="nl-kicker">${e(observation.author || '')}</div><h3>${e(observation.book_title || observation.host_title || 'Saved encounter')}</h3><div class="nl-meta">${e(observation.host_title || observation.host_id || '')} · ${e(dateLabel(observation.date))}</div><p>${e(observation.proposition || observation.description || 'No proposition recorded.')}</p>${paneButton(observation.run_id)}<details><summary>Evidence & reading method</summary><p class="nl-meta">${e(observation.evidence_class || 'Saved NUMO interpretation')} · ${e(observation.prompt_version || 'Preserved reading method')}</p><pre>${e((observation.source_trace || []).join('\n'))}</pre>${observation.candidate_contrast?`<p class="nl-prose">${e(observation.candidate_contrast)}</p>`:''}</details></article>`;
  function companionNotes(demon) {
    return (demon.companion_notes || []).map(note=>`<details class="nl-companion"><summary>${e(note.source_title || 'Companion notebook')}</summary><h3>${e(note.title)}</h3><p class="nl-meta">${e(note.attribution || '')}<br>Speculative companion · preserved separately from the Matrix</p>${(note.sections || []).map(section=>`${section.heading?`<h4>${e(section.heading)}</h4>`:''}${(section.paragraphs || []).map(paragraph=>`<p>${e(typeof paragraph==='string'?paragraph:paragraph.text)}</p>`).join('')}`).join('')}</details>`).join('');
  }
  const chamberAuditReading=demon=>demon.chamber_audit?.summary
    ? `<p class="nl-demon-reading">${e(demon.chamber_audit.summary)}</p>` : '';
  const chamberAuditFacts=demon=>(demon.chamber_audit?.facts || []).map(({label,value})=>
    `<dt class="nl-audit-key">${e(label)}</dt><dd class="nl-audit-value">${e(value)}</dd>`).join('');
  function chamberAuditSources(demon) {
    const audit=demon.chamber_audit, source=world.chamber_audit;
    if(!audit || !source)return '';
    const sections=audit.sections.map(({title,paragraphs})=>{
      if(paragraphs.length===1 && /^none\.?$/i.test(paragraphs[0].trim()))return '';
      return `<details class="nl-audit-section"><summary>${e(title)}</summary>${paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}</details>`;
    }).join('');
    return `<details class="nl-audit-details"><summary>Sources &amp; further reading</summary>
        <p class="nl-audit-source">${e(source.title)} · ${e(source.attribution)} · <time datetime="${e(source.date)}">${e(source.date)}</time></p>
        ${sections}
        <details class="nl-audit-section"><summary>Method</summary>
          <p>CCRU Decadology records the Ace–9 playing-card assignments. The Tarot pip titles follow the audit’s deck crosswalk. The Major Arcana, courts, tens, decan wheel, skills and temporal states are proposed readings.</p>
          <p>The hexagram derivation turns on one line for each Time-Circuit pole, using Stillwell’s cycle. All six xenodemons share the empty pattern under this rule. The Tarot-to-hexagram tables provide a separate route for comparison.</p>
          <p>Nine-twinning both poles pairs 40 chambers into 20 pairs and fixes the five syzygies. Under the audit’s hexagram rule, this swaps the upper and lower trigrams. The printed Ace–9 assignments also preserve rank across each pair while exchanging clubs with diamonds and hearts with spades.</p>
          <p>The stars express the audit’s judgments. The repeated table passes draw on overlapping inputs.</p>
          <p>Further correspondences are leads for exploration. Works with saved CARE assignments appear under appearances.</p>
        </details>
      </details>`;
  }
  function chamber() {
    const d=byId[state.demon];if(!d)return '<p class="nl-empty">Choose a demon from the atlas.</p>';
    const c=state.chamber,notebook=d.chamber || {},learned=d.learned_account || {},rite=d.rites?.[state.rite];
    const observations=chamberEncounters(world,d.id,c),all=chamberEncounters(world,d.id,{history:false});
    const authors=(notebook.thinkers || unique(all.map(o=>o.author_id)).map(id=>({id,name:all.find(o=>o.author_id===id)?.author,current_run_count:1}))).filter(a=>c.history || a.current_run_count>0);
    const concepts=(notebook.concepts || []).filter(x=>c.history || x.current_instance_count>0);
    const pages=Math.max(1,Math.ceil(observations.filter(o=>!(c.hiddenAuthors || []).includes(authorInfo(o).id)).length/10));c.page=Math.max(0,Math.min(c.page,pages-1));
    const facts=(items,label)=>items?.length?`<div class="nl-detail-label">${label}</div><ul class="nl-learning-list">${items.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`:'';
    const refs=traces=>(traces || []).map(ref=>{
      const item=(world.research_evidence || []).find(x=>x.id===ref), correspondence=correspondenceById.get(ref);
      const link=correspondence?`<button class="nl-textbutton" data-correspondence="${e(ref)}">Visit ${e(correspondence.entry.name)} chamber ↗</button>`:'';
      return item?`<details><summary>${e(item.title)} · ${e(item.section || ref)}</summary><p class="nl-prose">${e(item.text)}</p><p class="nl-meta">${e(item.source_kind)} · ${e(item.provenance_note || '')}<br>${e(item.authority_boundary || '')}<br>${e(ref)}</p>${link}</details>`:`<p class="nl-meta">${e(ref)}</p>${link}`;
    }).join('');
    const aq=aqLayer.by_demon?.[d.id];
    const aqNotebook=aq?.count
      ? `<div class="nl-section-head"><h2>AQ traces</h2><span>${aq.count} shared sources</span></div><p class="nl-meta nl-aq-chamber-note">These calculations are indexed from source IDs that current readings in this chamber cite. Each calculation keeps its own zone.</p><button class="nl-button" data-aq-demon="${e(d.id)}">Browse all shared AQ sources →</button>${(aq.records || []).map(aqCard).join('')}`
      : '<div class="nl-section-head"><h2>AQ traces</h2></div><p class="nl-meta">No shared AQ sources are recorded for this chamber.</p><button class="nl-textbutton" data-mode="aq">Browse the AQ map →</button>';
    const otherChambers=observation=>`<div class="nl-chamber-reciprocal">
      ${books.some(book=>book.id===observation.book_id)?`<button class="nl-textbutton" data-memory-book="${e(observation.book_id)}">Visit book chamber ↗</button>`:''}
      ${thinkers.some(thinker=>thinker.id===observation.author_id)?`<button class="nl-textbutton" data-memory-thinker="${e(observation.author_id)}">Visit thinker chamber ↗</button>`:''}
    </div>`;
    const hypotheses=notebook.hypotheses || [];
    const yearGroups=new Map();for(const o of observations){const label=c.axis==='analysis'?yearLabel(o.sort_year===Infinity?null:o.sort_year):o.date_label;const group=yearGroups.get(label)||new Set();group.add(o.run_id);yearGroups.set(label,group);}
    const encounters=`<div class="nl-chamber-filter"><label>Find a concept, thinker or passage<input aria-label="Search chamber encounters" value="${e(c.query)}" placeholder="Oedipus, capture, Freud…"></label><label>Writing by<select aria-label="Chamber author"><option value="">All thinkers</option>${authors.map(a=>`<option value="${e(a.id)}" ${c.author===a.id?'selected':''}>${e(a.name)}</option>`).join('')}</select></label><label>Order by<select aria-label="Chamber date axis"><option value="source" ${c.axis==='source'?'selected':''}>Date of writing</option><option value="analysis" ${c.axis==='analysis'?'selected':''}>Date of NUMO reading</option></select></label><label>From year<input type="number" aria-label="Chamber from year" value="${e(c.from)}"></label><label>To year<input type="number" aria-label="Chamber to year" value="${e(c.to)}"></label></div><div class="nl-chamber-options"><label><input type="checkbox" data-chamber-history ${c.history?'checked':''}> Include earlier reading versions</label><label><input type="checkbox" data-chamber-undated ${c.includeUndated?'checked':''}> Include undated</label><button class="nl-textbutton" data-reset-chamber>Reset filters</button>${c.query?`<button class="nl-textbutton" data-library-search="${e(c.query)}">Search “${e(c.query)}” throughout Care ↗</button>`:''}</div>${c.run?`<div class="nl-focus-reading">Opened from ${e(c.run)} · ${paneButton(c.run,'Return to this reading ↗')} <button class="nl-textbutton" data-chamber-all>Show every encounter</button></div>`:''}<div class="nl-year-band" aria-label="Encounters by ${c.axis==='analysis'?'NUMO reading date':'date of writing'}">${[...yearGroups].map(([label,ids])=>`<div><strong>${e(label)}</strong><span>${ids.size} reading${ids.size===1?'':'s'}</span></div>`).join('')}</div><div class="nl-section-head"><h2>Encounters through time</h2><span aria-live="polite">${observations.length} assignment${observations.length===1?'':'s'} · ${unique(observations.map(o=>o.run_id)).length} reading${unique(observations.map(o=>o.run_id)).length===1?'':'s'}</span></div><p class="nl-meta">${c.axis==='source'?'Writing dates retain their source ranges; undated work stays undated.':'This order follows when NUMO interpreted the work.'} These are saved interpretations of particular passages.</p>${authorReadings(observations,c,'chamber',o=>`<article class="nl-chamber-encounter"><div class="nl-encounter-date"><strong>${e(o.date_label)}</strong><span>${o.host_type==='WB'?'work date':'writing'}</span><small>Read ${e(dateLabel(o.date))}<br>${o.is_latest===false?'Earlier version':'Current reading'}</small></div><div><div class="nl-kicker">${e(o.author)} · ${e(o.role)} / ${e(o.rank)}</div><h3>${e(o.host_title || o.book_title)}</h3><p class="nl-meta">${e(o.book_title)}</p><p class="nl-prose">${e(o.proposition || 'No proposition recorded.')}</p><div class="nl-chips">${o.concepts.map(x=>`<button class="nl-chip" data-chamber-concept="${e(x.label)}">${e(x.label)}</button>`).join('')}</div><div class="nl-actions">${paneButton(o.run_id,'Read exact NUMO version ↗')}${otherChambers(o)}${books.some(b=>b.id===o.book_id)?`<button class="nl-textbutton" data-open-work="${e(o.book_id)}">Open book in Care ↗</button>`:''}</div><details><summary>Passage references & date evidence</summary><pre>${e((o.source_trace || []).join('\n'))}</pre><p class="nl-meta">${e(o.evidence_class || '')} · ${e(o.prompt_version || '')}</p>${o.candidate_contrast?`<p class="nl-prose">${e(o.candidate_contrast)}</p>`:''}<p class="nl-meta">${e(o.date_basis || 'No source date recorded')}</p>${(o.date_evidence || []).map(x=>`<p class="nl-meta">${e(x.source_title)} · ${e(x.locator)} · ${e(x.assertion)}</p>`).join('')}${o.concepts.map(x=>`<div class="nl-concept-evidence"><strong>${e(x.label)}</strong><p class="nl-meta">${e(x.temporal_note || '')} ${e(x.notes || '')}</p><pre>${e((x.source_trace || []).join('\n'))}</pre><button class="nl-textbutton" data-library-search="${e(x.label)}">Find ${e(x.label)} throughout Care ↗</button></div>`).join('')}</details></div></article>`,10)}${c.authorMode==='chronology' && pages>1?`<div class="nl-pager"><button class="nl-button" data-chamber-page="${c.page-1}" ${c.page===0?'disabled':''}>← Previous</button><span>${c.page+1} / ${pages}</span><button class="nl-button" data-chamber-page="${c.page+1}" ${c.page===pages-1?'disabled':''}>Next →</button></div>`:''}`;
    const learning=`${learningAccount('demon:'+d.id)}<div class="nl-section-head"><h2>What this chamber has learned</h2><span>${e(learned.evidence_status || 'Research interpretation')}</span></div><p class="nl-meta">Saved research account · ${e(learned.release_id || 'No released account')} · ${e(dateLabel(learned.recorded_at))}</p><p class="nl-prose">${e(learned.operative_definition || learned.definition || 'No research definition has been recorded yet.')}</p>${facts(learned.recognition_cues,'Recognition cues')}<div class="nl-detail-label">Where the reading stops</div><p class="nl-prose">${e(learned.boundary_statement || learned.boundary || 'No boundary recorded.')}</p>${facts(learned.rival_discriminants,'Neighbouring demons & discriminants')}${facts(learned.counterevidence,'Counterevidence')}${learned.strongest_counter_reading?`<p class="nl-prose">${e(learned.strongest_counter_reading)}</p>`:''}${facts(learned.unresolved_questions,'Questions still open')}<details><summary>Sources behind this account</summary>${refs(learned.source_traces)}</details>${notebook.codex_revision?.entry_revision_id?`<div class="nl-detail-label">Recorded revision · ${e(notebook.codex_revision.entry_revision_id)}</div><p class="nl-meta">${e(notebook.codex_revision.revision_status)} · ${e(dateLabel(notebook.codex_revision.recorded_at))}</p>${facts(notebook.codex_revision.changes_since_baseline,'Changes from the baseline')}`:''}<p class="nl-meta">New readings accumulate in Encounters. The research account changes only when a new codex revision is recorded.</p>`;
    const correspondences=`<div class="nl-section-head"><h2>Tarot & neighbouring ideas</h2><span>${hypotheses.length} recorded proposal${hypotheses.length===1?'':'s'}</span></div><p class="nl-meta">These comparisons keep their own sources, reservations and status. A shared title or thinker’s name alone does not establish a correspondence.</p>${chamberAuditReading(d)}${d.chamber_audit?.facts.length?`<dl class="nl-audit-facts">${chamberAuditFacts(d)}</dl>`:''}${demonCardShelf(d)}${chamberAuditSources(d)}${hypotheses.map(h=>`<article class="nl-hypothesis"><span class="nl-kicker">${e(h.status || 'Research proposal')} · ${e(h.confidence || '')}</span><h3>${e(h.object_label || h.claim_id)}</h3><p class="nl-prose">${e(h.statement)}</p><p class="nl-meta">${e(h.relationship || '')} · ${e(h.scope || '')}<br>Recorded ${e(dateLabel(h.created_at))}</p><details><summary>Support, objections & source passages</summary>${facts(h.evidence_for,'Support')}${facts(h.evidence_against,'Objections')}${h.falsification_test?`<p class="nl-prose">${e(h.falsification_test)}</p>`:''}${h.latest_review?.verdict?`<div class="nl-detail-label">Latest review · ${e(dateLabel(h.latest_review.created_at))}</div><p class="nl-prose">${e(h.latest_review.verdict)} · ${e(h.latest_review.rationale)}</p>`:''}${refs(h.source_traces)}<pre>${e((h.matrix_traces || []).join('\n'))}</pre></details><button class="nl-textbutton" data-library-search="${e(h.object_label || d.name)}">Find in Care ↗</button></article>`).join('')}${companionNotes(d)}`;
    return `<section class="nl-chamber" aria-label="Demon chamber notebook"><div class="nl-chamber-heading"><div><span class="nl-kicker">Chamber ${e(d.number ?? d.id)} / ${e(d.demon_class)}</span><h2>${e(d.name)}<span>${e(d.net_span)}</span></h2><p class="nl-epithet">${e(d.epithet || d.domain)}</p></div><label class="nl-meta">Choose a chamber<select aria-label="Choose demon chamber">${demons.map(x=>`<option value="${e(x.id)}" ${d.id===x.id?'selected':''}>${e(x.name)} · ${e(x.net_span)}</option>`).join('')}</select></label></div><div class="nl-chamber-layout"><aside class="nl-chamber-sidebar"><div class="nl-chamber-counts"><span><b>${unique(all.map(o=>o.run_id)).length}</b> current readings</span><span><b>${unique(all.map(o=>o.book_id)).length}</b> works</span><span><b>${unique(all.map(o=>o.author_id)).length}</b> thinkers</span></div><div class="nl-detail-label">Concepts encountered</div><div class="nl-concept-cloud">${concepts.slice(0,c.moreConcepts?concepts.length:14).map(x=>`<button class="${c.query===x.label?'active':''}" data-chamber-concept="${e(x.label)}">${e(x.label)} <small>${x.current_instance_count || 0}</small></button>`).join('') || '<p class="nl-meta">No linked concepts recorded yet.</p>'}</div>${concepts.length>14?`<button class="nl-textbutton" data-more-concepts>${c.moreConcepts?'Show fewer':'Show all '+concepts.length+' concepts'}</button>`:''}<div class="nl-detail-label">Writings by</div><div class="nl-author-list">${authors.map(a=>`<button data-chamber-author="${e(a.id)}" class="${c.author===a.id?'active':''}">${e(a.name)}<span>${(c.history?a.run_count:a.current_run_count) ?? ''}</span></button>`).join('') || '<p class="nl-meta">No author-linked readings yet.</p>'}</div><div class="nl-chamber-map">${diagram([d.id],rite?.calculable?[rite]:[],`<strong>${e(d.name)}</strong> · ${(d.poles || []).join(' ↔ ')}<br>${rite?.calculable?(rite.zones || []).join(' → '):'No calculated rite selected.'}`,true)}</div>${(d.rites || []).map((r,i)=>`<button class="nl-rite ${state.rite===i?'active':''}" data-rite="${i}"><strong>${e(r.code || '?')} / ${r.calculable?(r.zones || []).join(' → '):'untraced'}</strong><small>${e(r.description)}</small></button>`).join('')}<details><summary>Canonical Matrix entry</summary><pre>${e(d.source?.text || d.source_text || '')}</pre></details></aside><div class="nl-chamber-main"><nav class="nl-chamber-tabs" aria-label="Chamber sections">${[['encounters','Encounters'],['learning','Learning record'],['correspondences','Tarot & ideas'],['aq','AQ traces']].map(([key,label])=>`<button data-chamber-tab="${key}" aria-pressed="${c.tab===key}" class="${c.tab===key?'active':''}">${label}</button>`).join('')}</nav>${c.tab==='learning'?learning:c.tab==='correspondences'?correspondences:c.tab==='aq'?aqNotebook:encounters}</div></div></section>`;
  }

  function inspector() {
    const d=byId[state.demon];if(!d)return '<p class="nl-empty">The demon atlas is unavailable.</p>';
    const observations=d.observations || (d.history || []).filter(o=>o.is_latest!==false);
    const learned=d.learned_account || {};
    const definition=learned.operative_definition || learned.definition || '', boundary=learned.boundary_statement || learned.boundary || '';
    return `<span class="nl-kicker">${e(d.id)} / ${e(d.demon_class)}</span><h2>${e(d.name)}</h2><p class="nl-epithet">${e(d.epithet || d.domain)}</p><div class="nl-pair"><strong>${e(d.net_span)}</strong><span>NET-SPAN<br>Zones ${(d.poles || []).join(' & ')}</span></div>${definition?`<div class="nl-detail-label">Care research interpretation</div><p class="nl-prose">${e(definition)}</p>`:`<p class="nl-prose">${e(d.domain || '')} An interval between zones ${(d.poles || []).join(' and ')}.</p>`}<button class="nl-button primary" data-open-chamber="${e(d.id)}">Open chamber notebook →</button><div class="nl-detail-label">Rites / ${(d.rites || []).length}</div>${(d.rites || []).map((r,i)=>`<button class="nl-rite ${state.rite===i?'active':''}" data-rite="${i}" aria-pressed="${state.rite===i}"><strong>${e(r.code || '?')} ${r.calculable?' / '+(r.zones || []).join(' → '):' / untraced'}</strong><small>${e(r.description || 'The source leaves this rite untraced.')}</small></button>`).join('')}<div class="nl-detail-label">${observations.length} saved encounters</div>${observations.length?observations.slice(0,4).map(evidence).join(''):'<p class="nl-prose">No current saved assignment. This demon remains part of the full Matrix.</p>'}${observations.length>4?`<button class="nl-textbutton" data-find-runs="${e(d.name)}">Find all ${observations.length} encounters in saved runs →</button>`:''}<details><summary>Matrix source & learned boundaries</summary><pre>${e(d.source?.text || d.source_text || 'CCRU Pandemonium Matrix')}</pre>${boundary?`<p class="nl-prose">${e(boundary)}</p>`:''}<div class="nl-meta">${e(learned.release_id || '')}</div></details>`;
  }
  const chamberModes=['directory','chamber','thinkers','books','skills'];
  const zonePicker=(label='Browse by zone')=>`<div class="nl-zone-picker" role="group" aria-label="${label}">${zones.map(zone=>`<button data-browse-zone="${zone}" aria-label="Select zone ${zone}" aria-pressed="${state.zone===zone}">${zone}</button>`).join('')}</div>`;
  const roomDoor=(mode,index,title,body)=>`<button class="nl-room-door" data-mode="${mode}"><span class="nl-room-door-id">${index}</span><strong>${title}</strong><span>${body}</span><b aria-hidden="true">↗</b></button>`;
  const instrumentData=world.instrument || {};
  const instrumentEvidenceByDemon=instrumentData.by_demon || {};
  const instrumentAllDeposits=Object.entries(instrumentEvidenceByDemon)
    .flatMap(([demon_id, value])=>(value.deposits || []).map(deposit=>({...deposit,demon_id})));
  const instrumentDepositsById=new Map(instrumentAllDeposits.map(deposit=>[deposit.id,deposit]));
  const instrumentReadings=new Map(demons.flatMap(d=>(d.history || d.observations || []).map(row=>[row.id,row])));
  const instrumentClaims=new Map(demons.flatMap(d=>(d.chamber?.hypotheses || []).map(row=>[row.claim_id,row])));
  const instrumentRuns=new Map(runs.map(run=>[run.id,run]));
  const instrumentBooks=new Map(books.map(book=>[book.id,book]));
  const instrumentAQRecords=new Map([
    ...(world.aq?.records || []),...Object.values(world.aq?.by_demon || {}).flatMap(value=>value.records || []),
  ].map(row=>[row.id,row]));
  const instrumentLabels=new Map((instrumentData.systems || []).map(system=>[system.id,system.label]));
  const instrumentDeposits=id=>instrumentEvidenceByDemon[id]?.deposits || [];
  const instrumentZoneDemons=zone=>demons.filter(d=>zonePoles(d).includes(zone));
  const instrumentPairDemon=selected=>selected.length===2?demons.find(d=>{
    const poles=zonePoles(d);
    return poles[0]===selected[0] && poles[1]===selected[1];
  }):null;
  const instrumentSubjectLink=(kind,id,label)=>`<button type="button" class="nl-instrument-link" data-instrument-subject-kind="${e(kind)}" data-instrument-subject="${e(id)}">${e(label)}</button>`;
  const instrumentIdentity=(label,title,subtitle='')=>`<header class="nl-instrument-identity ro-head"><span class="port" data-instrument-port aria-hidden="true"></span><p class="nl-instrument-kicker eyebrow">${e(label)}</p><h2 class="title${title.length>13?' long':''}">${e(title)}</h2>${subtitle?`<p class="nl-instrument-summary sub">${e(subtitle)}</p>`:''}</header>`;
  const instrumentRegion=(label,body)=>`<section class="nl-instrument-region">${label?`<h3 class="lbl">${e(label)}</h3>`:''}${body}</section>`;
  const instrumentEmpty=text=>`<p class="nl-instrument-empty">${e(text)}</p>`;
  function instrumentConsilience(deposits) {
    const settled=new Set(deposits.filter(row=>row.status==='ink').map(row=>row.system));
    const pending=new Set(deposits.filter(row=>row.status==='pencil' && !settled.has(row.system)).map(row=>row.system));
    const systems=instrumentData.systems || [];
    const marks=systems.map(system=>`<span class="cm${settled.has(system.id)?' on':pending.has(system.id)?' pen':''}" title="${e(system.label)}"></span>`).join('');
    const names=ids=>[...ids].map(id=>instrumentLabels.get(id) || id).join(' · ');
    const baseline=instrumentData.consilience_baseline;
    return `<div class="nl-instrument-consilience consil"><span class="marks">${marks}</span>
      <span class="cv">${settled.size} of ${systems.length}${settled.size?' · '+e(names(settled)):''}</span>
      ${pending.size?`<span class="cp">In pencil · ${e(names(pending))}</span>`:''}</div>
      <p class="note-chance">${baseline?.expected!=null?`Expected ${e(baseline.expected)} · ${e(baseline.label || 'saved control')}`:'No matched consilience control recorded.'}</p>`;
  }
  function instrumentDepositList(deposits) {
    if(!deposits.length)return instrumentEmpty('No deposits filed here.');
    const visible=deposits.slice(0,state.instrument.depositLimit);
    return instrumentDepositRows(visible)+(deposits.length>visible.length?`<button class="nl-instrument-link" data-instrument-more>Show ${deposits.length-visible.length} more deposits</button>`:'');
  }
  function instrumentDepositRows(deposits, grouped=false) {
    return `<ol class="nl-instrument-deposits deps">${deposits.map(deposit=>{
      const reading=instrumentReadings.get(deposit.ref);
      const claim=instrumentClaims.get(deposit.ref);
      const record=instrumentAQRecords.get(deposit.ref);
      const date=deposit.created_at || reading?.date;
      const freshDate=deposit.updated_at || date;
      const age=freshDate?Date.now()-Date.parse(freshDate):Infinity;
      const author=!grouped && reading?.author_id?instrumentThinker(reading.author_id):null;
      const links=[
        author?instrumentSubjectLink('thinker',author.id,author.name):'',
        !grouped && reading?.book_id?instrumentSubjectLink('book',reading.book_id,reading.book_title || reading.host_title || 'Work'):'',
        deposit.run_id?paneButton(deposit.run_id,'Saved reading ↗'):'',
        deposit.card_id?instrumentSubjectLink('card',deposit.card_id,correspondenceById.get(deposit.card_id)?.entry.name || 'Card or skill'):'',
      ].filter(Boolean).join('');
      const refs=(deposit.source_refs || []).map(ref=>`<code>${e(typeof ref==='string'?ref:ref?.ref || ref?.id || '')}</code>`).join('');
      const fresh=deposit.status==='ink' && age>=0 && age<604800000;
      const identity=deposit.relation==='numeric_identity' && record?.text && byId[deposit.demon_id];
      const passage=identity?`${byId[deposit.demon_id].name.toUpperCase()} = ${record.text.toUpperCase()}`:
        reading?.proposition || claim?.statement || claim?.hypothesis || claim?.summary || record?.text || deposit.label || deposit.ref;
      return `<li class="nl-instrument-deposit dep-i${deposit.status==='pencil'?' is-pencil':''}${fresh?' is-new':''}" data-instrument-deposit="${e(deposit.id)}" data-ink="${e(deposit.status)}" data-system="${e(deposit.system)}" data-fresh="${fresh}">
        <span class="dm s-${e(deposit.system)}" aria-hidden="true"></span><div>
        ${grouped && reading?.host_title && reading.host_title!==reading.book_title?`<p class="nl-instrument-occurrence-host">${e(reading.host_title)}</p>`:''}
        <p class="pass${deposit.system==='care'?'':' rom'}">${e(passage)}</p>
        <div class="nl-instrument-cites src">${links}<span>${e(instrumentLabels.get(deposit.system) || deposit.system)}${deposit.status==='pencil'?' · pencil':''}</span>${deposit.aq_total!=null?`<button type="button" class="aqn" data-instrument-aq-total="${e(deposit.aq_total)}">AQ ${e(deposit.aq_total)}</button>`:''}${deposit.model?`<span>${e(deposit.model)}</span>`:''}${date?`<time datetime="${e(date)}">${e(String(date).slice(0,10))}</time>`:''}</div>
        ${refs?`<details><summary>Source references</summary><div>${refs}</div></details>`:''}</div>
      </li>`;
    }).join('')}</ol>`;
  }
  function instrumentDemonAppearances(deposits) {
    const works=new Map(), unfiled=[], other=[];
    for(const deposit of deposits){
      if(deposit.kind!=='reading'){other.push(deposit);continue;}
      const reading=instrumentReadings.get(deposit.ref),run=instrumentRuns.get(deposit.run_id);
      const id=run?.work_id || deposit.book_id || reading?.book_id;
      if(!id){unfiled.push(deposit);continue;}
      if(!works.has(id)){
        const book=instrumentBooks.get(id),authorId=book?.author_id || reading?.author_id || deposit.author_id;
        const thinker=authorId?instrumentThinker(authorId):null;
        works.set(id,{id,book,thinker,authorId:thinker?.id || authorId,
          title:book?.title || reading?.book_title || run?.title || id,
          author:thinker?.name || book?.author || reading?.author || run?.author,
          occurrences:[]});
      }
      works.get(id).occurrences.push(deposit);
    }
    const first=[], rest=[], authors=new Set();
    for(const work of works.values()){
      if(work.authorId && !authors.has(work.authorId)){
        authors.add(work.authorId);first.push(work);
      }else rest.push(work);
    }
    const visible=first.concat(rest).slice(0,state.instrument.workLimit);
    const covers=visible.map(work=>{
      const count=work.occurrences.length;
      const url=data.work_covers?.[work.id] || '';
      const image=/^\/app\/static\/reader-covers\/[A-Za-z0-9.-]+$/.test(url)
        ?`<img src="${e(url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`:'';
      return `<li><button type="button" class="nl-instrument-work" data-instrument-work="${e(work.id)}" aria-controls="nl-instrument-work-readings" aria-expanded="${state.instrument.openWork===work.id}" title="${e(work.title)}">
        <span class="nl-instrument-work-cover" aria-hidden="true" data-cover-tone="${penHash(work.id)%4}"><span>${e(work.title)}</span>${image}</span>
        <span class="nl-instrument-work-title">${e(work.title)}</span>${work.author?`<span class="nl-instrument-work-author">${e(work.author)}</span>`:''}
        <span class="nl-instrument-work-count">${count} appearance${count===1?'':'s'}</span>
      </button></li>`;
    }).join('');
    const openWork=visible.find(work=>work.id===state.instrument.openWork);
    let readings='<section id="nl-instrument-work-readings" hidden></section>';
    if(openWork){
      const links=[openWork.book?instrumentSubjectLink('book',openWork.id,'Work chamber ↗'):'',
        openWork.thinker?instrumentSubjectLink('thinker',openWork.thinker.id,'Thinker chamber ↗'):''].join('');
      readings=`<section id="nl-instrument-work-readings" class="nl-instrument-work-readings" aria-label="Appearances in ${e(openWork.title)}">
        <header><h4>${e(openWork.title)}</h4><button type="button" class="nl-instrument-link" data-instrument-work-close aria-label="Close appearances for ${e(openWork.title)}">Close</button></header>
        ${links?`<div class="nl-instrument-cites src nl-instrument-work-links">${links}</div>`:''}
        ${instrumentDepositRows(openWork.occurrences,true)}
      </section>`;
    }
    const more=works.size-visible.length;
    const unfiledRow=unfiled.length?`<details class="nl-instrument-unfiled"><summary>${unfiled.length} appearance${unfiled.length===1?'':'s'} without a linked work</summary>${instrumentDepositRows(unfiled,true)}</details>`:'';
    const shelf=covers?`<ol class="nl-instrument-works" aria-label="Work covers">${covers}</ol>
      ${more?`<button type="button" class="nl-instrument-link" data-instrument-more-works>Show ${more} more work${more===1?'':'s'}</button>`:''}${readings}`:'';
    const list=shelf || unfiledRow?shelf+unfiledRow:instrumentEmpty('No saved appearances.');
    return instrumentRegion(`Appears in · ${works.size} work${works.size===1?'':'s'}`,list)
      +(other.length?instrumentRegion(`Other deposits · ${other.length}`,instrumentDepositList(other)):'');
  }
  function instrumentInkBar(ratio,pencil,id) {
    if(!ratio && !pencil)return '<svg class="inkbar" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true"><circle class="ib0" cx="3" cy="6" r="1.5"/></svg>';
    const length=pencil?40:Math.max(8,116*ratio),random=penMulberry(penHash('r'+id));
    const points=Array.from({length:11},(_,i)=>[2+length*i/10,6+(random()-.5)*1.6]);
    return `<svg class="inkbar" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true"><path class="ib${pencil?' pen':''}" d="${penSmooth(points)}" stroke-width="${pencil?1.2:1.6+ratio*2.2}"/></svg>`;
  }
  function instrumentDemonRows(list, depositsFor=instrumentDeposits) {
    if(!list.length)return instrumentEmpty('No intervals in this selection.');
    const rows=list.map(d=>{
      const rows=depositsFor(d.id);
      return {d,count:rows.filter(row=>row.status==='ink').length,pencil:rows.filter(row=>row.status==='pencil').length,
        linked:rows.some(row=>row.status==='chamber')};
    }).sort((a,b)=>b.count-a.count || Number(b.linked)-Number(a.linked) || b.pencil-a.pencil || Number(a.d.number)-Number(b.d.number));
    const max=Math.max(1,...rows.map(row=>row.count));
    return `<ol class="nl-instrument-demon-rows drows">${rows.map(({d,count,pencil,linked})=>
      `<li><button type="button" class="drow${count || linked?'':' empty'}" data-instrument-subject-kind="demon" data-instrument-subject="${e(d.id)}"><span class="iv">${e(d.net_span)}</span><span class="nm">${e(d.name)}</span><span class="bar">${instrumentInkBar(Math.log1p(count)/Math.log1p(max),!count && !linked && pencil>0,d.number)}</span><span class="ct">${count || (linked?'linked':pencil?pencil+'p':'·')}</span></button></li>`).join('')}</ol>`;
  }
  const instrumentZoneById=new Map((world.zones || []).map(zone=>[Number(zone.id),zone]));
  function instrumentZoneSchematic(selected,netSpan='') {
    const one=selected.length===1,cw=164,ch=96,gap=120,width=one?cw+40:cw*2+gap+40,height=ch+30;
    const chips=selected.map((id,i)=>{
      const zone=instrumentZoneById.get(id),x=20+i*(cw+gap),y=8;
      const twin=zone?.twin ?? 9-id;
      const rows=[['TWIN',twin],['CURRENT',Math.abs(id-twin)],['GATE',zone?`${zone.gate} → ${zone.channel}`:'—'],
        ['REGION',zone?.region?.toUpperCase() || '—'],['PLANET',zone?.planet?.toUpperCase() || '—']];
      return `<rect class="ch-b" x="${x}" y="${y}" width="${cw}" height="${ch}"/><path class="ch-n" d="M${x+cw/2-8} ${y}a8 8 0 0 0 16 0"/>${rows.map(([label,value],j)=>{
        const line=y+20+j*16;
        return `<path class="ch-p" d="M${x-10} ${line-4}h10m${cw} 0h10"/><text class="ch-k" x="${x+10}" y="${line}">${label}</text><text class="ch-v" x="${x+cw-10}" y="${line}" text-anchor="end">${e(value)}</text>`;
      }).join('')}<text class="ch-l" x="${x+cw/2}" y="${y+ch+18}" text-anchor="middle">ZONE ${id}</text>`;
    }).join('');
    const syzygy=selected.reduce((sum,id)=>sum+id,0)===9,mid=8+ch/2,xa=20+cw+10,xb=20+cw+gap-10;
    const bus=one?'':`${(syzygy?[mid-2,mid+2]:[mid]).map(y=>`<path class="bus" d="M${xa} ${y}H${xb}"/>`).join('')}
      <text class="bus-l" x="${(xa+xb)/2}" y="${mid-10}" text-anchor="middle">${e(netSpan)}</text><text class="bus-s" x="${(xa+xb)/2}" y="${mid+20}" text-anchor="middle">${syzygy?'SYZYGY':'NET-SPAN'}</text>`;
    return `<svg class="chip" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Pinout of zone${one?' ':'s '}${selected.join(' and ')}">${chips}${bus}</svg>`;
  }
  function instrumentZoneReadout(zone) {
    const entity=structureById['zone:'+zone];
    const address=instrumentZoneById.get(zone);
    const identity=instrumentIdentity(['Zone '+zone,address?.region,address?.planet?address.planet+' (source association)':''].filter(Boolean).join(' · '),'Zone '+zone)
      +instrumentRegion('',instrumentZoneSchematic([zone]));
    if(arithmeticOnly)return identity+instrumentRegion('',`<p class="lede">Choose another zone on the map or press another digit to trace the pair.</p>`);
    const matches=instrumentZoneDemons(zone);
    const filled=matches.filter(d=>instrumentDeposits(d.id).some(row=>row.status==='ink')).length;
    return identity
      +instrumentRegion(`Nine demons open from this zone · ${filled} hold deposits`,instrumentDemonRows(matches))
      +instrumentRegion('',`<p class="lede">Choose a second zone on the map, a chord, or a name above to enter its demon. Press ${zone} then another digit to do the same.</p>${entity?`<button class="nl-instrument-link adv-l" data-instrument-anatomy="${e(entity.id)}">Zone anatomy ↗</button>`:''}`);
  }
  function instrumentDemonReadout(demon,rite) {
    const poles=zonePoles(demon);
    const deposits=penNewestDeposits(instrumentDeposits(demon.id));
    const nameAQ=calculateInstrumentAQ(demon.name);
    const odds=instrumentEvidenceByDemon[demon.id]?.aq_zone_odds;
    const ritual=(demon.rites || []).map((row,index)=>row.calculable?`<button class="rp" title="Replay Matrix rite" data-instrument-rite="${index}" aria-pressed="${row===rite}">${e(row.zones.join(' → '))}</button>`:'').filter(Boolean).join(' · ');
    const syzygy=poles[0]+poles[1]===9;
    const regions=unique([...poles].reverse().map(id=>instrumentZoneById.get(id)?.region).filter(Boolean)).join(' / ');
    const identities=deposits.filter(row=>row.relation==='numeric_identity' && row.aq_total===nameAQ.total).map(row=>instrumentAQRecords.get(row.ref)?.text || row.label);
    const mesh=String(demon.number ?? '').padStart(2,'0');
    const cards=instrumentDemonCards(demon.id);
    return instrumentIdentity(`Mesh-${mesh} · ${demon.demon_class}${syzygy?' · Syzygy':''} · ${demon.net_span}`,demon.name,demon.epithet || demon.domain)
      +instrumentRegion('',`<div class="nl-demon-profile" role="group" aria-label="Demon profile">
        ${instrumentZoneSchematic([...poles].reverse(),demon.net_span)}
        <dl class="nl-instrument-specs specs">
        <dt>Net-span</dt><dd>ZONES ${poles[1]} &amp; ${poles[0]}<span class="q">${e(regions)}</span></dd>
        ${demon.pitch?`<dt>Pitch</dt><dd>${e(demon.pitch)}<span class="q">CCRU Matrix</span></dd>`:''}
        <dt>Route</dt><dd>${ritual?`${ritual}<span class="q">Matrix rite${rite?.code?' · '+e(rite.code):''}</span>`:'<span class="q">No calculable Matrix rite recorded.</span>'}</dd>
        ${syzygy?`<dt>Current</dt><dd>${poles[1]-poles[0]} → ZONE ${poles[1]-poles[0]}<span class="q">The syzygy’s difference</span></dd>`:''}
        <dt>Name AQ</dt><dd class="amb"><button class="aqn" data-instrument-aq-name="${e(demon.name)}">${e(nameAQ.chain.join(' → '))}</button>${poles.includes(nameAQ.zone)?'<span class="res">Own zone</span>':''}${identities.length?`<span class="q">Same number · ${e(unique(identities).join(' · '))}</span>`:''}${odds?`<span class="q">${odds.hits} in ${odds.out_of} under equal zone use</span>`:''}</dd>
        ${poles[0]===0?`<dt>Row</dt><dd>OPENS ROW ${poles[1]}<span class="q">Mesh ${mesh} is gate ${instrumentZoneById.get(poles[1]-1)?.gate ?? Number(demon.number)}, the cumulation of zone ${poles[1]-1}</span></dd>`:''}
        ${chamberAuditFacts(demon)}</dl>
        ${chamberAuditReading(demon)}
        <div class="nl-demon-support"><h3 class="lbl">Consilience</h3>${instrumentConsilience(deposits)}</div>
        ${cards?`<div class="nl-demon-linked"><h3 class="lbl">Cards &amp; skills</h3>${cards}</div>`:''}
      </div>`)
      +(publicReference?instrumentRegion('Matrix record',`<dl class="nl-instrument-specs">
        <dt>Domain</dt><dd>${e(demon.domain)}</dd>
        ${demon.aliases?.length?`<dt>Aliases</dt><dd>${e(demon.aliases.join(' · '))}</dd>`:''}
        ${demon.door?.name?`<dt>Door</dt><dd>${e([demon.door.name,demon.door.correspondence,demon.door.location].filter(Boolean).join(' · '))}</dd>`:''}
        ${demon.relations?.map(row=>`<dt>${e(row.relation)}</dt><dd>${e(row.target)}</dd>`).join('') || ''}
        </dl><p class="src">CCRU Pandemonium Matrix</p>`):instrumentDemonAppearances(deposits)
      +instrumentRegion('',`${chamberAuditSources(demon)}<button class="nl-instrument-link adv-l" data-open-chamber="${e(demon.id)}">Full demon chamber ↗</button>`));
  }
  function instrumentStructureReadout(entity) {
    const facts=(entity.facts || []).map(fact=>`<dt>${e(fact.label)}</dt><dd>${e(fact.value)}</dd>`).join('');
    if(arithmeticOnly)return instrumentIdentity('Numogram · '+entity.kind,entity.title)
      +instrumentRegion('Where it sits',`<dl class="nl-instrument-specs">${facts}</dl>`);
    const connected=(entity.links || []).filter(link=>structureById[link.id]).slice(0,10);
    const deposits=unique(entity.demon_ids || []).flatMap(id=>instrumentDeposits(id));
    return instrumentIdentity('Matrix · '+entity.kind,entity.title,entity.summary)
      +instrumentRegion('Where it sits',`<dl class="nl-instrument-specs">${facts}</dl>`)
      +instrumentRegion('Filed here',instrumentDepositList(deposits))
      +instrumentRegion('Also here',`${connected.map(link=>`<button class="nl-instrument-link" data-structure="${e(link.id)}">${e(link.label)}</button>`).join('')}<button class="nl-instrument-link" data-instrument-anatomy="${e(entity.id)}">Open full Anatomy ↗</button>`);
  }
  const land=thinkers.find(thinker=>thinker.name==='Nick Land');
  const landTimeline=land?instrumentAllDeposits.flatMap(deposit=>{
    const reading=instrumentReadings.get(deposit.ref),run=instrumentRuns.get(deposit.run_id);
    const from=run?.source_year,to=run?.source_year_end ?? from;
    return reading?.author_id===land.id && Number.isInteger(from) && Number.isInteger(to) && to>=1988 && from<=2014
      ? [{...deposit,year:Math.max(1988,to),dateLabel:run.date_label || String(from)}] : [];
  }).sort((a,b)=>a.year-b.year):[];
  function instrumentReplay() {
    const year=state.instrument.replay,rows=landTimeline.filter(row=>row.year<=year);
    const map={demon_ids:unique(rows.map(row=>row.demon_id)),deposit_ids:rows.map(row=>row.id)};
    const readout=instrumentIdentity('Saved source chronology','Nick Land','1988–2014')
      +instrumentRegion('Where it sits',`<label class="nl-instrument-time">Through <output>${year}</output><input aria-label="Replay Nick Land by source year" type="range" min="1988" max="2014" value="${year}" data-instrument-replay-year></label><p class="nl-instrument-summary">Only dated saved readings appear. A dated interval enters at its last year.</p>`)
      +instrumentRegion('Filed here · '+rows.length+' deposits',instrumentDepositList(rows.slice().reverse()))
      +instrumentRegion('Also here',instrumentSubjectLink('thinker',land.id,land.name));
    return {map,readout};
  }
  function instrumentSnapshot() {
    const {zones,structure,subject,rite,replay,aq}=state.instrument;
    return {zones,structure,subject,rite,replay,aqCommitted:aq.committed};
  }
  function sameInstrumentSpot(a,b) {
    return a.zones.join(',')===b.zones.join(',') && a.structure===b.structure && a.rite===b.rite && a.replay===b.replay
      && a.subject?.kind===b.subject?.kind && a.subject?.id===b.subject?.id
      && a.aqCommitted?.total===b.aqCommitted?.total && a.aqCommitted?.text===b.aqCommitted?.text
      && a.aqCommitted?.address===b.aqCommitted?.address;
  }

  function instrumentSelectionName({zones,structure,subject,replay,aqCommitted}) {
    if(aqCommitted)return aqCommitted.text;
    if(replay!==null && replay!==undefined)return 'Nick Land';
    if(subject){const item=instrumentSubjectEntity(subject);return item?.entry.name || item?.entry.title || '';}
    if(zones.length===2)return instrumentPairDemon(zones)?.name || zones.join('::');
    if(zones.length===1)return 'Zone '+zones[0];
    return structureById[structure]?.title || '';
  }

  const instrumentSlug=value=>String(value || '').normalize('NFKD').replace(/\p{M}/gu,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  function instrumentCardSlug(found) {
    const prefix={voice:'disco',tarot:'tarot',acephale:'acephale'}[instrumentShelfKind(found.shelf)];
    if(prefix==='tarot' && found.entry.card_position && !found.entry.card_position.startsWith('major:')){
      return 'tarot-'+found.entry.card_position.replace(':','-');
    }
    return prefix?`${prefix}-${String(found.entry.number ?? (found.index+1)).padStart(2,'0')}`:
      'card-'+encodeURIComponent(found.entry.id);
  }
  function instrumentHash(selection) {
    const {zones,subject,aqCommitted}=selection;
    if(aqCommitted)return 'aq-'+aqCommitted.total;
    if(subject?.kind==='card' || subject?.kind==='skill'){
      const found=correspondenceById.get(subject.id);
      return found?instrumentCardSlug(found):'';
    }
    if(subject)return subject.kind+'-'+encodeURIComponent(subject.id);
    if(zones.length===1)return 'zone-'+zones[0];
    return instrumentSlug(instrumentPairDemon(zones)?.name);
  }
  function instrumentLocationKey() {
    const hash=frameWindow?.location?.hash?.slice(1) || '';
    return publicReference ? new URLSearchParams(hash).get('numo') || '' : hash;
  }
  function instrumentFromHash() {
    if(arithmeticOnly)return null;
    const raw=instrumentLocationKey();
    const number=/^aq-([0-9]+)$/.exec(raw);
    if(number){const address=instrumentAQAddress(Number(number[1]));return address?{aqCommitted:address}:null;}
    const zone=/^zone-([0-9])$/.exec(raw);
    if(zone)return {zones:[Number(zone[1])]};
    const demon=demons.find(row=>instrumentSlug(row.name)===raw);
    if(demon)return {zones:zonePoles(demon)};
    const card=[...correspondenceById].find(([,found])=>instrumentCardSlug(found)===raw);
    if(card)return {subject:{kind:card[1].shelf.kind==='voice'?'skill':'card',id:card[0]}};
    const subject=/^(thinker|book)-(.+)$/.exec(raw);
    if(!subject)return null;
    try {
      const value={kind:subject[1],id:decodeURIComponent(subject[2])};
      return instrumentSubjectEntity(value)?{subject:value}:null;
    } catch {return null;}
  }
  function syncInstrumentHash(hash) {
    if(arithmeticOnly || !frameWindow?.location || !frameWindow.history)return;
    try {
      if(hash || instrumentFromHash()){
        const {pathname,search}=frameWindow.location;
        if(publicReference){
          const params=new URLSearchParams(frameWindow.location.hash.slice(1));
          if(params.get('view')!=='numogram')return;
          if(hash)params.set('numo',hash);
          else params.delete('numo');
          frameWindow.history.replaceState(frameWindow.history.state,'',pathname+search+'#'+params);
          return;
        }
        frameWindow.history.replaceState(frameWindow.history.state,'',pathname+search+(hash?'#'+hash:''));
      }
    } catch {}
  }
  function instrumentGo(next={}, {remember=true,repaint=true,hash=true,fall=false}={}) {
    instrumentPauseAQFeed();
    const view=state.instrument,previous=instrumentSnapshot();
    const {aqCommitted:previousAQ=null,...selection}=next;
    const aqCommitted=previousAQ && !previousAQ.address ? instrumentAQInput(previousAQ.text) || previousAQ : previousAQ;
    Object.assign(view,{zones:[],structure:'',subject:null,rite:null,replay:null,depositLimit:penDotLimit,workLimit:instrumentWorkPage,openWork:'',proposing:'',proposalZone:null},selection);
    view.aq={draft:aqCommitted?.address?String(aqCommitted.total):aqCommitted?.text || '',committed:aqCommitted,
      fall:fall?(view.aq.fall || 0)+1:0,...instrumentAQBrowseDefaults};
    const current=instrumentSnapshot();
    if(remember && !sameInstrumentSpot(previous,current)){
      view.trail=[...view.trail,previous].slice(-8);
      view.forward=[];
    }
    if(hash)syncInstrumentHash(instrumentHash(current));
    if(repaint)renderContent();
  }
  function instrumentWalk() {
    const current=instrumentSnapshot();
    return instrumentSelectionName(current)?state.instrument.trail.concat(current).filter(spot=>instrumentSelectionName(spot)).slice(-5):[];
  }
  const instrumentCanGoBack=()=>state.instrument.trail.length>0 || Boolean(instrumentSelectionName(instrumentSnapshot()));
  function instrumentHistoryControls() {
    const arrow=(direction,label,enabled,path)=>`<button type="button" data-instrument-history="${direction}" aria-label="${label}" title="${label}"${enabled?'':' disabled'}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="${path}" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    return `<nav class="nl-instrument-history" aria-label="Chamber history">${arrow('back','Previous chamber',instrumentCanGoBack(),'M10 3.5 5.5 8l4.5 4.5M6 8h7')}${arrow('forward','Next chamber',state.instrument.forward.length,'M6 3.5 10.5 8 6 12.5M3 8h7')}</nav>`;
  }
  function instrumentHistoryStep(direction,index=state.instrument.trail.length-1) {
    const view=state.instrument,current=instrumentSnapshot();
    let next;
    if(direction==='back' && instrumentCanGoBack()){
      const [previous,...between]=index<0?[]:view.trail.splice(index);
      next=previous || {};
      view.forward=[...between,current,...view.forward];
    }else if(direction==='forward' && view.forward.length){
      next=view.forward.shift();
      view.trail=[...view.trail,current].slice(-8);
    }
    if(!next)return;
    view.deck='';
    instrumentGo(next,{remember:false});
  }
  function instrumentClosePane() {
    state.instrument.deck='';
    instrumentGo();
    if(scrollRestoreFrame){
      frameWindow.cancelAnimationFrame(scrollRestoreFrame);
      scrollRestoreFrame=0;
    }
    $('[data-instrument-home]')?.focus();
  }
  function instrumentEscape() {
    const menu=$('[data-instrument-tools][open]');
    if(menu){
      menu.open=false;
      menu.querySelector('summary')?.focus({preventScroll:true});
      return;
    }
    const view=state.instrument;
    if(view.deck){view.deck='';renderContent();return;}
    if(instrumentLayoutEditing){instrumentLayoutEditing=false;renderContent();return;}
    if(instrumentSelectionName(instrumentSnapshot())){instrumentClosePane();return;}
    if(view.aq.draft){view.aq.draft='';renderContent();}
  }
  function instrumentProposal(operation, payload) {
    if(data.instrument_write===false)return;
    const request_id=globalThis.crypto?.randomUUID?.();
    if(!request_id)return;
    emit('instrument_proposal',{operation,request_id,...payload});
  }
  function instrumentJoinZones(first,second) {
    const zones=[first,second].sort((a,b)=>a-b), demon=instrumentPairDemon(zones);
    if(arithmeticOnly){
      if(first!==second && zones.every(zone=>Number.isInteger(zone) && zone>=0 && zone<=9))instrumentGo({zones});
      return;
    }
    if(!demon)return;
    const view=state.instrument, card_id=view.proposing;
    if(!card_id){instrumentGo({zones});return;}
    view.proposing='';view.proposalZone=null;
    renderContent();
    instrumentProposal('propose',{card_id,demon_id:demon.id});
  }
  function instrumentPickZone(zone) {
    if(instrumentLayoutEditing || !Number.isInteger(zone) || zone<0 || zone>9)return;
    const view=state.instrument;
    if(view.proposing){
      const first=view.proposalZone;
      if(first===null || first===zone){
        view.proposalZone=first===zone?null:zone;
        renderContent();
        return;
      }
      instrumentJoinZones(first,zone);
      return;
    }
    const current=view.zones;
    if(current.length===1 && current[0]!==zone)instrumentJoinZones(current[0],zone);
    else instrumentGo({zones:current.length===1?[]:[zone]});
  }
  function instrumentOpenSubject(kind,id,options) {
    if(kind==='zone'){instrumentGo({zones:[Number(id)]},options);return;}
    if(kind==='demon' && byId[id]){instrumentGo({zones:zonePoles(byId[id])},options);return;}
    const subject=instrumentSubjectEntity({kind,id});
    if(!subject)return;
    state.instrument.deck='';
    instrumentGo({subject:{kind:subject.kind,id:subject.id}},options);
  }
  function instrumentDrawAQ(event) {
    const draft=state.instrument.aq.draft,calc=instrumentAQInput(draft);
    const committed=state.instrument.aq.committed,feedback=instrumentAQPreview(calc,committed);
    const preview=$('[data-instrument-aq-preview]');
    if(preview){preview.hidden=!feedback;preview.innerHTML=feedback;}
    const svg=$('.nl-pen-map svg');
    if(!svg)return;
    const spec=mapSpec(svg),xy=event?.detail?.xy || positions(spec);
    const gates=event?.detail?.gates || mapGeometry(xy,spec).gates;
    updateInstrumentAQOverlay(svg,xy,gates,calc,committed,0);
  }
  function instrumentCommitAQ(text) {
    const calc=instrumentAQInput(text);
    if(!calc)return;
    instrumentGo({aqCommitted:calc},{fall:true});
  }
  function instrumentRequestAQ(kind, payload, atResults=false) {
    const aq=state.instrument.aq;
    if(arithmeticOnly || !aq.committed)return;
    clearTimeout(instrumentAQTimer);
    instrumentPauseAQFeed();
    aqServerPending=true;
    const scroller=instrumentAQScroller(), shelf=$('.nl-iaq-shelf');
    aq.scroll=scroller?.scrollTop ?? null;
    if(atResults && scroller && shelf){
      const top=scroller===root.ownerDocument?.scrollingElement?0:scroller.getBoundingClientRect().top;
      aq.scroll=Math.max(0,scroller.scrollTop+shelf.getBoundingClientRect().top-top-24);
    }
    const filters=kind==='instrument_aq'?{match_kind:aq.matchKind,sort:aq.matchSort}:{};
    emit(kind,{total:aq.committed.total,...filters,...payload});
  }
  function instrumentToggleAQMatch(id,fetch) {
    const aq=state.instrument.aq;
    if(!aq.committed)return;
    aq.match=aq.match===id?'':id;
    renderContent();
    const detail=world.instrument_aq_match;
    if(aq.match && fetch && !(detail?.total===aq.committed.total && detail.id===id))instrumentRequestAQ('instrument_aq_match',{id});
  }
  function instrumentLookupAQ(delay=0) {
    clearTimeout(instrumentAQTimer);
    const aq=state.instrument.aq,calc=aq.committed;
    if(arithmeticOnly || !calc || publicReference && aqServerPending)return;
    const page=instrumentAQSearch();
    if(page && (!data.aq_collection_write || instrumentAQSameView(world.instrument_aq,calc.total,aq.matchKind,aq.matchSort)))return;
    instrumentAQTimer=setTimeout(()=>{
      if(state.mode==='instrument' && state.instrument.aq===aq && (calc.address || aq.draft===calc.text))instrumentRequestAQ('instrument_aq',{});
    },delay);
  }
  function instrumentAQFilter(filters) {
    Object.assign(state.instrument.aq,{match:''},filters);
    aqFeed.page=null;
    instrumentRequestAQ('instrument_aq',{offset:0},true);
  }
  function instrumentAQSearch() {
    const aq=state.instrument.aq,server=world.instrument_aq;
    if(!aq.committed)return null;
    const matches=page=>instrumentAQSameView(page,aq.committed.total,aq.matchKind,aq.matchSort);
    const feed=matches(aqFeed.page)?aqFeed.page:null;
    if(!matches(server))return feed;
    const offset=Number(server.request.offset || 0);
    if(!feed && !offset)aqFeed.page=server;
    else if(feed && offset===instrumentAQNextOffset(feed))aqFeed.page=instrumentAQMergePage(feed,server);
    else return feed;
    return aqFeed.page;
  }
  function instrumentAQScroller() {
    const regions=$('.nl-instrument-regions');
    if(!frameWindow?.getComputedStyle || (regions && /^(auto|scroll)$/.test(frameWindow.getComputedStyle(regions).overflowY)))return regions;
    for(let node=root.parentElement || root.getRootNode?.().host;node;node=node.parentElement || node.getRootNode?.().host){
      if(/^(auto|scroll)$/.test(frameWindow.getComputedStyle(node).overflowY))return node;
    }
    return root.ownerDocument?.scrollingElement;
  }
  function instrumentPauseAQFeed() {
    stopAQObserver?.();
    aqFeedRequest?.abort();
    aqFeedRequest=null;
  }
  function instrumentObserveAQFeed() {
    stopAQObserver?.();
    const sentinel=$('[data-instrument-aq-next]');
    if(!sentinel || !frameWindow || aqServerPending || aqFeedRequest)return;
    const scroll=instrumentAQScroller(), owner=root.ownerDocument;
    const viewport=scroll===owner?.scrollingElement?null:scroll;
    const load=()=>instrumentAQLoadMore(Number(sentinel.dataset.instrumentAqNext));
    if(frameWindow.IntersectionObserver){
      const observer=new frameWindow.IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting))load();
      },{root:viewport,rootMargin:'260px 0px'});
      observer.observe(sentinel);
      stopAQObserver=()=>observer.disconnect();
    }else{
      const check=()=>{
        const bottom=viewport?.getBoundingClientRect().bottom ?? frameWindow.innerHeight;
        if(sentinel.getBoundingClientRect().top<=bottom+260)load();
      };
      frameWindow.addEventListener('scroll',check,{capture:true,passive:true});
      stopAQObserver=()=>frameWindow.removeEventListener('scroll',check,true);
      check();
    }
  }
  async function instrumentAQLoadMore(offset) {
    const aq=state.instrument.aq,feed=instrumentAQSearch();
    if(aqServerPending || aqFeedRequest || state.mode!=='instrument' || aq.browseTab==='collection')return;
    if(offset && (!feed?.has_more || offset!==instrumentAQNextOffset(feed)))return;
    stopAQObserver?.();
    const footer=$('[data-instrument-aq-feed-footer]');
    if(footer)footer.innerHTML='<div class="nl-iaq-sentinel" role="status"><span class="nl-iaq-feed-status">Loading matches…</span></div>';
    if(!offset || !data.aq_scroll_url || aqFeed.routeUnavailable || !frameWindow?.fetch || !frameWindow.AbortController){
      instrumentRequestAQ('instrument_aq',{offset});
      return;
    }
    const controller=new frameWindow.AbortController();
    aqFeedRequest=controller;
    const total=aq.committed.total;
    const params=new URLSearchParams({total,match_kind:aq.matchKind,sort:aq.matchSort,offset});
    try{
      const response=await frameWindow.fetch(`${data.aq_scroll_url}?${params}`,{signal:controller.signal,cache:'no-store'});
      if(controller.signal.aborted)return;
      if(response.status===404 || !response.headers.get('content-type')?.includes('application/json')){
        aqFeed.routeUnavailable=true;
        instrumentRequestAQ('instrument_aq',{offset});
        return;
      }
      const page=await response.json();
      if(controller.signal.aborted || state.instrument.aq!==aq)return;
      if(!response.ok || page.status!=='ok' || !instrumentAQSameView(page,total,aq.matchKind,aq.matchSort) || page.request.offset!==offset){
        throw new Error('AQ page unavailable');
      }
      const merged=instrumentAQMergePage(feed,page);
      aqFeed.page=merged;
      if(aq.browseTab==='matches' && state.mode==='instrument'){
        const added=merged.records.slice(feed.records.length);
        $('.nl-iaq-results')?.insertAdjacentHTML('beforeend',instrumentAQMatchRows(added,{
          total,e,demons,detail:world.instrument_aq_match,matchId:aq.match,collection:world.instrument_aq_collection,
          collectionWrite:data.aq_collection_write,inCollection:false,instrumentSubjectLink,
        }));
        const count=$('[data-instrument-aq-count]');
        if(count)count.textContent=instrumentAQFeedStatus(merged);
        const currentFooter=$('[data-instrument-aq-feed-footer]');
        if(currentFooter)currentFooter.innerHTML=instrumentAQFeedFooter(merged);
      }
    }catch{
      if(controller.signal.aborted || state.instrument.aq!==aq)return;
      aqFeed.page={...feed,load_error:true};
      const currentFooter=$('[data-instrument-aq-feed-footer]');
      if(currentFooter)currentFooter.innerHTML=instrumentAQFeedFooter(aqFeed.page);
    }finally{
      if(aqFeedRequest===controller){aqFeedRequest=null;instrumentObserveAQFeed();}
    }
  }
  const penLeftZones=new Set([1,3,4,5,9]);
  function instrumentNotes(){
    const svg=$('.nl-pen-map svg'),notes=$('[data-pen-notes]'),m=svg?.getScreenCTM?.();
    if(!notes || !m)return;
    const xy=positions(mapSpec(svg)),r=notes.getBoundingClientRect(),off=(penRadius+12)*m.a;
    const place=(z,cls,html,demon)=>{
      const [a,b]=xy[z],x=m.a*a+m.c*b+m.e-r.left,y=m.b*a+m.d*b+m.f-r.top,left=penLeftZones.has(z);
      const attrs=' class="note '+cls+(left?' L':'')+'" style="left:'+penRound(left?x-off:x+off)+'px;top:'+penRound(y)+'px"';
      return demon?'<button type="button"'+attrs+' data-note-zone="'+z+'" data-instrument-chord="'+e(demon.id)+'" aria-label="'+e('Summon '+demon.name)+'">'+html+'</button>'
        :'<div aria-hidden="true"'+attrs+'>'+html+'</div>';
    };
    const paint=activePenMap?.paint,kind=paint?.structure?.kind || 'rest',proposal=state.instrument.proposalZone;
    const hoverKey=svg.querySelector('[data-pen-hover]')?.dataset.hoverZone;
    const gesture=mapDrag?.svg===svg && mapDrag.gesture && mapDrag.moved?mapDrag:null;
    const hover=gesture?gesture.to:hoverKey?Number(hoverKey):null;
    let s='';
    if(kind==='rest' && hover!=null && !mapDrag && proposal==null){
      const z=hover,entity=structureById['zone:'+z],facts=Object.fromEntries((entity?.facts || []).map(fact=>[fact.label.toLowerCase(),fact.value]));
      const deposits=arithmeticOnly?'':'<br>'+(paint?.weights[z] || 0)+' DEPOSITS';
      const region=facts.region?(arithmeticOnly?'<br>':' · ')+e(facts.region.toUpperCase()):'';
      s+=place(z,'m','<b>ZONE '+z+'</b>'+e(facts.planet?' · '+facts.planet.toUpperCase():'')+'<br>TWIN '+(9-z)+e(facts.gate?' · GATE '+facts.gate:'')+deposits+region);
    }
    const A=kind==='zone'?paint.structure.anchor_zone:proposal;
    if(A!=null)for(let z=0;z<10;z++){
      if(z===A)continue;
      const d=penByPair.get(penPair(A,z));
      if(!d)continue;
      s+=place(z,'h',e(d.name),d);
    }
    if(notes!==instrumentNoteLayer || instrumentNoteMarkup!==s){
      notes.innerHTML=s;
      instrumentNoteLayer=notes;
      instrumentNoteMarkup=s;
    }
    for(const note of notes.querySelectorAll('[data-note-zone]'))note.classList.toggle('hot',Number(note.dataset.noteZone)===hover);
  }
  function instrumentLeader(){
    instrumentNotes();
    const L=$('.nl-instrument-leader'),anchor=$('[data-pen-anchor]'),port=$('[data-instrument-port]');
    if(!L)return;
    const clear=()=>{if(L.dataset.leaderKey){L.innerHTML='';delete L.dataset.leaderKey;}};
    if(!anchor || frameWindow?.matchMedia?.('(max-width: 820px)').matches){clear();return;}
    const m=$('.nl-pen-map svg')?.getScreenCTM?.(),origin=L.getBoundingClientRect();
    if(!m || !port || origin.width<=0 || origin.height<=0)return;
    const a=Number(anchor.getAttribute('cx')),b=Number(anchor.getAttribute('cy'));
    const ax=m.a*a+m.c*b+m.e-origin.left,ay=m.b*a+m.d*b+m.f-origin.top;
    const pr=port.getBoundingClientRect(),px=pr.left-origin.left,py=pr.top-origin.top;
    if(px<ax+30 || pr.width===0){clear();return;}
    // The leader leaves along the anchor's row and bends into the port.
    const kx=px-22,dyy=py-ay,c=Math.min(8,Math.abs(dyy)/2),sy=dyy<0?-1:1;
    const d=Math.abs(dyy)<2 || kx-c<=ax?'M'+penRound(ax)+' '+penRound(ay)+'L'+penRound(px)+' '+penRound(py)
      :'M'+penRound(ax)+' '+penRound(ay)+'L'+penRound(kx-c)+' '+penRound(ay)+'L'+penRound(kx)+' '+penRound(ay+sy*c)+'L'+penRound(kx)+' '+penRound(py-sy*c)+'L'+penRound(kx+c)+' '+penRound(py)+'L'+penRound(px)+' '+penRound(py);
    if(d===L.dataset.leaderKey)return;
    L.dataset.leaderKey=d;
    L.setAttribute('viewBox','0 0 '+origin.width+' '+origin.height);
    L.innerHTML='<path d="'+d+'"/><circle cx="'+penRound(ax)+'" cy="'+penRound(ay)+'" r="3"/>';
  }
  function instrumentLayoutChanged(event) {
    if(state.mode!=='instrument')return;
    syncInstrumentCurrents();
    instrumentLeader();
    instrumentDrawAQ(event);
  }
  function instrumentResize() {
    if(state.mode==='instrument'){instrumentFrameHeight();instrumentLeader();syncInstrumentCurrents();}
  }
  const instrumentSurface=()=>root.getRootNode?.().host?.closest?.('.st-key-care_study_numo_surface,[data-care-numo-surface]');
  function instrumentFrameHeight() {
    const height=instrumentSurface()?.clientHeight;
    if(!height || !frameWindow?.innerHeight)return;
    const chrome=`${Math.max(0,frameWindow.innerHeight-height)}px`;
    if(root.style.getPropertyValue('--care-numo-chrome')!==chrome)root.style.setProperty('--care-numo-chrome',chrome);
  }
  function instrumentLinkHighlights(event) {
    if(state.mode!=='instrument')return;
    const related=event.type==='pointerout' || event.type==='focusout'?event.relatedTarget:event.target;
    instrumentHoverZone(related);
    const dep=related?.closest?.('[data-instrument-deposit]')?.dataset.instrumentDeposit;
    for(const row of root.querySelectorAll?.('[data-instrument-deposit]') || []){
      row.classList.toggle('nl-instrument-highlight',Boolean(dep && row.dataset.instrumentDeposit===dep));
    }
    updateInstrumentSpreadCaption(related);
  }
  function instrumentHoverZone(target){
    const svg=$('.nl-pen-map svg'),overlay=svg?.querySelector('[data-pen-hover]');
    if(!overlay || mapDrag || instrumentLayoutEditing)return;
    const node=target?.closest?.('[data-map-zone],[data-note-zone]');
    const zone=node && (svg.contains(node) || instrumentNoteLayer?.contains(node))?Number(node.dataset.mapZone ?? node.dataset.noteZone):null;
    const paint=activePenMap?.paint,kind=paint?.structure?.kind || 'rest';
    const A=kind==='zone'?paint.structure.anchor_zone:state.instrument.proposalZone;
    const key=zone==null?'':String(zone);
    if(overlay.dataset.hoverZone===key)return;
    overlay.dataset.hoverZone=key;
    instrumentNotes();
    if(zone==null || zone===A || (A==null && kind!=='rest')){overlay.replaceChildren();return;}
    const xy=positions(mapSpec(svg));
    if(A!=null){overlay.innerHTML='<path class="preview" d="'+penChord(xy,A,zone).path+'"/>';return;}
    const fan=instrumentZoneDemons(zone).map(d=>{
      const list=paint?.byDemon[d.id] || [];
      return {d,n:list.filter(dep=>dep.status==='ink').length,p:list.some(dep=>dep.status==='pencil')};
    });
    const max=Math.max(1,...fan.map(entry=>entry.n));
    overlay.innerHTML=state.instrument.web?'':fan.map(({d,n,p})=>{
      const other=penDemonPoles(d).find(z=>z!==zone);
      return penChordInk(d,penChord(xy,zone,other),n,p,max,{tag:'h',op:.5,faint:true,showEmpty:true});
    }).join('');
  }
  const penBuckets = [.38, .66, .95];
  function penDrawCanvas(cv, svg, ctx, now, dt) {
    const rc = cv.getBoundingClientRect();
    const dpr = Math.min(2, frameWindow.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rc.width * dpr)), h = Math.max(1, Math.round(rc.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const m = svg.getScreenCTM?.(); if (!m || !rc.width) return;
    ctx.setTransform(dpr * m.a, dpr * m.b, dpr * m.c, dpr * m.d, dpr * (m.e - rc.left), dpr * (m.f - rc.top));
    const reduced = !penMotion();
    const paint = activePenMap.paint;
    const bootA = reduced || penBootTime === null ? 1 : penSstep(650, 1900, now - penBootTime);
    const openA = paint.structure?.kind === 'zone' ? .7 : paint.structure?.kind && paint.structure.kind !== 'rest' ? .4 : 1;
    for (const c of penCurrentLuts) {
      if (!c.lut) continue;
      const hl = penHighlightedCurrents.has(c.id), A = bootA * (hl ? 1 : openA); if (A < .01) continue;
      const adv = reduced ? 0 : c.sp * (hl ? 2.3 : 1) * dt;
      for (const d of c.dots) { d.t += adv * d.s; if (d.t > 1) d.t -= 1; }
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        for (const d of c.dots) {
          if (d.b !== b) continue;
          const L = penLutAt(c, d.t), w = (c.w0 + (c.w1 - c.w0) * d.t) / 2, rr = d.rad * penSstep(0, .07, d.t) * (1 - penSstep(.88, 1, d.t)) * (hl ? 1.15 : 1);
          if (rr < .05) continue;
          const px = L[0] + L[2] * d.u * w, py = L[1] + L[3] * d.u * w;
          ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, penTau);
        }
        ctx.fillStyle = 'rgba(116,246,74,' + (penBuckets[b] * A).toFixed(3) + ')'; ctx.fill();
      }
    }
  }
  let penBootTime=null,penCanvasFrame=0,penCanvasNode=null,penCanvasContext=null,penLastFrame=null;
  let penHighlightedCurrents=new Set();
  function stopInstrumentCurrents() {
    if(penCanvasFrame)frameWindow?.cancelAnimationFrame?.(penCanvasFrame);
    penCanvasFrame=0;
    penLastFrame=null;
  }
  function syncInstrumentCurrents() {
    const svg=$('.nl-pen-map svg'),cv=$('.nl-pen-canvas');
    stopInstrumentCurrents();
    if(!cv || !svg || !activePenMap || frameWindow?.document?.hidden)return;
    if(cv!==penCanvasNode){
      penCanvasNode=cv;
      penCanvasContext=cv.getContext?.('2d');
    }
    if(!penCanvasContext || !frameWindow)return;
    const paint=activePenMap.paint;
    penHighlightedCurrents=new Set(penCurrentLuts.filter(c=>
      paint.selected.length===1 && c.pair.every(zone=>paint.poles.has(zone)) ||
      paint.routes.some(route=>route.zones.some((zone,i)=>c.pair.includes(zone) && route.zones[i+1]===c.to))
    ).map(c=>c.id));
    const now=frameWindow.performance.now();
    if(penBootTime===null && svg.hasAttribute('data-pen-boot'))penBootTime=now;
    penDrawCanvas(cv,svg,penCanvasContext,now,0);
    if(!penMotion())return;
    const draw=now=>{
      if(!cv.isConnected || !svg.isConnected || frameWindow.document?.hidden || !penMotion()){
        penCanvasFrame=0;
        return;
      }
      const dt=penLastFrame===null?0:Math.min(.05,(now-penLastFrame)/1000);
      penLastFrame=now;
      penDrawCanvas(cv,svg,penCanvasContext,now,dt);
      penCanvasFrame=frameWindow.requestAnimationFrame(draw);
    };
    penCanvasFrame=frameWindow.requestAnimationFrame?.(draw) || 0;
  }
  function hideHeaderTools() {
    const strip=$('.has-header-aq[data-tools-open]');
    if(!strip)return false;
    strip.removeAttribute('data-tools-open');
    const details=strip.querySelector('[data-instrument-tools]');
    if(details)details.open=false;
    return true;
  }
  function showHeaderTools() {
    if(state.mode!=='instrument'){
      state.mode='instrument';
      render();
    }
    const strip=$('.has-header-aq');
    if(!strip)return;
    strip.setAttribute('data-tools-open','');
    const details=strip.querySelector('[data-instrument-tools]');
    if(details){
      details.open=true;
      details.querySelector('summary')?.focus({preventScroll:true});
    }
  }
  function dismissHeaderTools(event) {
    const strip=$('.has-header-aq[data-tools-open]');
    if(strip && !event.composedPath().includes(strip))hideHeaderTools();
  }
  function instrumentShortcuts(event) {
    if(state.mode!=='instrument' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.isComposing)return;
    const path=event.composedPath?.() || [event.target];
    if(path.some(node=>node.matches?.('[role="dialog"]')))return;
    const aqInput=path.some(node=>node.matches?.('[data-instrument-aq-input]'));
    const editing=path.some(node=>node.matches?.('input,textarea,select,[contenteditable="true"]'));
    if(event.key==='Escape' && (!editing || aqInput)){
      event.preventDefault();
      if(!hideHeaderTools())instrumentEscape();
      return;
    }
    if(editing || event.repeat)return;
    const key=event.key.toLowerCase();
    if(/^[0-9]$/.test(key)){event.preventDefault();instrumentPickZone(Number(key));}
    else if(key==='w' || key==='h'){
      event.preventDefault();
      const layer=key==='w'?'web':'hetu';
      state.instrument[layer]=!state.instrument[layer];renderContent();
    }else if(key==='/'){
      event.preventDefault();
      if(data.focusHeaderAQ)data.focusHeaderAQ();
      else if(data.header_aq)root.ownerDocument.dispatchEvent(new CustomEvent('care:spotlight-open'));
      else $('[data-instrument-aq-input]')?.focus();
    }
  }
  function instrumentHashChanged() {
    const next=instrumentFromHash();
    if(!next)return;
    const mounting=state.mode!=='instrument';
    state.mode='instrument';
    instrumentGo(next,{hash:false,repaint:!mounting});
    if(mounting)render();
  }
  function installInstrumentFonts() {
    const fonts=root.ownerDocument?.fonts,Font=frameWindow?.FontFace;
    if(!fonts || !Font)return;
    const files=[['Kalam','Kalam-Regular.ttf',{}],['IBM Plex Mono','IBMPlexMono-Regular.ttf',{}],
      ['IBM Plex Mono','IBMPlexMono-Medium.ttf',{weight:'500'}],
      ['EB Garamond','EBGaramond.ttf',{weight:'400 800'}],['EB Garamond','EBGaramond-Italic.ttf',{style:'italic',weight:'400 800'}],
      ['VT323','VT323-Regular.ttf',{}]];
    const prefix=data.instrument_font_prefix || '/app/static/numo-fonts/';
    for(const [family,filename,descriptor] of files){
      if([...fonts].some(face=>face.family===family && face.style===(descriptor.style || 'normal') && face.weight===(descriptor.weight || 'normal')))continue;
      const face=new Font(family,`url("${prefix}${filename}")`,descriptor);
      fonts.add(face);
      face.load().then(instrumentResize,()=>fonts.delete(face));
    }
  }
  let instrumentObserver,instrumentMotionFrame=0,instrumentActiveKey='';
  function mountInstrumentStage(previousMap) {
    const stage=$('.nl-instrument-stage'),map=$('.nl-pen-map svg'),readout=$('.nl-instrument-readout');
    if(!stage || !map)return;
    const sections=readout?.querySelectorAll(':scope > .nl-instrument-region');
    if(sections?.length){
      const regions=root.ownerDocument.createElement('div');
      regions.className='nl-instrument-regions ro-body';
      for(const section of sections)regions.appendChild(section);
      readout.appendChild(regions);
    }
    instrumentFrameHeight();
    if(frameWindow?.ResizeObserver){
      instrumentObserver=new frameWindow.ResizeObserver(instrumentResize);
      instrumentObserver.observe(stage);
      instrumentObserver.observe(map);
      const surface=instrumentSurface();
      if(surface)instrumentObserver.observe(surface);
    }
    const reduced=frameWindow?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const type=(element,perCharacter)=>{
      const length=element?.textContent.length;
      if(length && !reduced)element.animate?.([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],
        {duration:length*perCharacter,easing:`steps(${length},end)`});
    };
    const selection=instrumentSnapshot();
    const key=instrumentHash(selection) || selection.structure || selection.aqCommitted?.text || (selection.replay===null?'':'replay');
    if(key!==instrumentActiveKey){
      instrumentActiveKey=key;
      readout?.setAttribute('data-instrument-arriving','');
      type($('.eyebrow'),9);
    }
    instrumentLeader();
    syncInstrumentCurrents();
    const rect=map.getBoundingClientRect();
    const delta=previousMap?previousMap.left+(previousMap.width-rect.width)/2-rect.left:0;
    if(!reduced && Math.abs(delta)>12 && map.animate && frameWindow?.requestAnimationFrame){
      const slide=map.animate([{transform:`translateX(${delta}px)`},{transform:'translateX(0)'}],
        {duration:750,easing:'cubic-bezier(.2,.7,.1,1)'});
      const follow=()=>{
        instrumentLeader();
        instrumentMotionFrame=slide.playState==='running'?frameWindow.requestAnimationFrame(follow):0;
      };
      instrumentMotionFrame=frameWindow.requestAnimationFrame(follow);
    }
  }
  function instrumentRoom() {
    const view=state.instrument;
    const selected=view.zones;
    const entity=structureById[view.structure];
    const exact=instrumentPairDemon(selected);
    const rite=exact?.rites?.[view.rite ?? (exact.rites || []).findIndex(row=>row.calculable && row.zones?.length>1)];
    const aq=view.aq.committed;
    const footprint=view.subject?instrumentSubjectFootprint():null;
    const replay=view.replay!==null && landTimeline.length?instrumentReplay():null;
    const activeZones=view.proposalZone!==null?[view.proposalZone]:selected.length?selected:footprint?.zone_ids || entity?.zone_ids || [];
    const kind=replay?'thinker':view.subject?.kind || (aq?'aq':exact?'demon':selected.length===1?'zone':entity?'structure':arithmeticOnly && selected.length===2?'interval':'rest');
    const mapSelection={...footprint,...replay?.map,kind,zone_ids:activeZones,structure_id:entity?.id,
      anchor_zone:view.proposalZone ?? (selected.length===1?selected[0]:undefined),
      aq_zone:aq?.zone,aq_draft:instrumentAQInput(view.aq.draft),aq_committed:aq,aq_fall:view.aq.fall};
    const diagramMarkup=diagram(exact?[exact.id]:[],rite?.calculable?[rite]:[],'',false,mapSelection);
    const readout=replay?.readout || (view.subject?instrumentSubjectReadout():aq?instrumentAQReadout(aq,{
      e,demons,search:instrumentAQSearch(),samples:world.aq?.records,zoneInfo:instrumentZoneById.get(aq.zone),
      detail:world.instrument_aq_match,matchId:view.aq.match,
      matchKind:view.aq.matchKind,matchSort:view.aq.matchSort,browseTab:view.aq.browseTab,
      collection:world.instrument_aq_collection,collectionWrite:data.aq_collection_write,arithmeticOnly,publicReference,
      instrumentIdentity,instrumentRegion,instrumentSubjectLink,instrumentDemonRows,
    }):exact?instrumentDemonReadout(exact,rite):selected.length===1?instrumentZoneReadout(selected[0]):entity?instrumentStructureReadout(entity):kind==='interval'
      ?instrumentIdentity('Zone pair',selected.join('::'))+instrumentRegion('',instrumentZoneSchematic(selected,selected.join('::'))):'');
    const opened=Boolean(readout);
    const walk=headerAQ?[]:instrumentWalk();
    const decks=instrumentDeckBar();
    return `<section class="nl-instrument ${opened?'has-detail':''}${instrumentLayoutEditing?' is-layout-editing':''}" aria-label="Numogram instrument">
      <header class="nl-instrument-top${headerAQ?' has-header-aq':''}">
        <div class="nl-instrument-tools" role="group" aria-label="Instrument controls">
          <button type="button" class="nl-instrument-brand" data-instrument-home>${headerAQ?'Map home':'CARE / NUMO'}</button>
          ${instrumentHistoryControls()}
          <details class="nl-instrument-menu" data-instrument-tools>
            <summary aria-label="Map tools">Tools <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
            <div class="nl-instrument-menu-items">
              <button type="button" data-instrument-web aria-pressed="${view.web}">Web</button>
              <button type="button" data-instrument-hetu aria-pressed="${view.hetu}">Hetu lens</button>
              ${publicReference?'<button type="button" data-mode="atlas">Demon atlas ↗</button>':''}
              <button type="button" data-instrument-layout aria-pressed="${instrumentLayoutEditing}">${instrumentLayoutEditing?'Done moving':'Move layout'}</button>
              <button type="button" data-map-reset aria-label="Reset map layout" ${state.instrumentLayout?'':instrumentLayoutEditing?'disabled':'disabled hidden'}>Reset layout</button>
              ${landTimeline.length?`<button type="button" data-instrument-replay aria-pressed="${view.replay!==null}">Replay</button>`:''}
              ${arithmeticOnly || publicReference?'':`<button type="button" class="nl-instrument-advanced" data-mode="map">Research workspace ↗</button>`}
            </div>
          </details>
        </div>
        ${walk.length?`<nav class="nl-instrument-walk" aria-label="Your walk through the chambers"><span>Walk</span>${walk.map((spot,index)=>`<button type="button" data-instrument-walk="${index}" ${index===walk.length-1?'aria-current="page"':''}>${e(instrumentSelectionName(spot))}</button>`).join('')}</nav>`:''}
        ${headerAQ?'':instrumentAQForm(view.aq,e)}
      </header>
      <div class="nl-instrument-stage">
        <div class="nl-instrument-canvas">${diagramMarkup}${instrumentLayoutEditing?'<p class="nl-instrument-hint">Drag a zone or a twin bond to move it · Esc to finish</p>':''}</div>
        ${opened?`<svg class="nl-instrument-leader" aria-hidden="true"><path/><circle r="2"/></svg><aside class="nl-instrument-readout ro" aria-label="Chamber"><button type="button" class="nl-instrument-close" data-instrument-close aria-label="Close chamber and return to map" aria-keyshortcuts="Escape">Esc</button>${readout}</aside>`:''}
      </div>
      ${decks?`<footer class="nl-instrument-bottom">${decks}</footer>`:''}
      <p class="nl-instrument-status" role="status">${e(view.proposing?(view.proposalZone==null?'Pencil · choose two zones':'Pencil · choose the second zone'):view.hetu?'Hetu · pairs five apart · 7::2 is also a syzygy':'')}</p>
      ${instrumentSpread()}
    </section>`;
  }
  function mapRoom() {
    const selected=state.zone;
    const touching=selected===null?[]:atlasDemons(demons,{zone:selected});
    const demon=byId[state.mapTrace?.demon];
    const rite=demon?.rites?.[state.mapTrace?.index];
    const caption=rite?.calculable?`<strong>${e(demon.name)} · ${e(rite.code)}</strong> · ${e(rite.zones.join(' → '))}`:selected===null?'Select a zone to find its demons, or follow a gate or current into Anatomy.':`<strong>Zone ${selected}</strong> · ${touching.length} linked intervals`;
    return `<section class="nl-map-room" aria-labelledby="nl-map-title">
      <div class="nl-map-copy">
        <div class="nl-index-mark"><span>CARE / NUMO</span><span>00—09</span></div>
        <p class="nl-kicker">A house of intervals</p>
        <h1 id="nl-map-title">The <br>Numogram<span>.</span></h1>
        <p class="nl-room-lead">Ten zones, forty-five intervals. Follow a demon to the books and thinkers it has encountered, or enter through a work and see the routes its readings have left.</p>
        <div class="nl-actions"><button class="nl-button primary" data-mode="atlas">Explore the demon atlas <span aria-hidden="true">↗</span></button><button class="nl-button" data-mode="directory">Enter the chambers <span aria-hidden="true">→</span></button></div>
        <dl class="nl-map-metrics"><div><dt>Zones</dt><dd>10</dd></div><div><dt>Syzygies</dt><dd>05</dd></div><div><dt>Demons in atlas</dt><dd>${String(demons.length).padStart(2,'0')}</dd></div></dl>
      </div>
      <div class="nl-map-instrument">${diagram(demon?[demon.id]:[],rite?.calculable?[rite]:[],caption,true)}<label class="nl-map-rite">Trace a Matrix rite<select aria-label="Trace a Matrix rite"><option value="">Choose a rite…</option>${demons.flatMap(d=>(d.rites || []).flatMap((r,index)=>r.calculable && r.zones?.length>1?[`<option value="${e(d.id)}:${index}" ${demon?.id===d.id && state.mapTrace.index===index?'selected':''}>${e(d.name)} · ${e(r.code)}</option>`]:[])).join('')}</select></label></div>
      <aside class="nl-map-doors" aria-label="Numogram room directory">
        <div class="nl-map-doors-head"><span class="nl-kicker">Field guide</span><strong>Choose an entrance</strong></div>
        ${roomDoor('directory','01','Memory chambers','Enter by demon, thinker or book.')}
        ${roomDoor('aq','02','AQ traces','Place saved calculations on the map.')}
        ${roomDoor('study','03','Workbench','Compare writings and their saved demon readings.')}
        ${roomDoor('anatomy','04','Anatomy','Follow gates, syzygies, currents and rites.')}
      </aside>
      <div class="nl-zone-shelf">
        <div><p class="nl-kicker">Zone index</p><h2>${selected===null?'Where are the demons?':`At Zone ${selected}`}</h2></div>
        ${zonePicker()}
        ${selected===null?'<p>Choose a number to see which intervals touch it.</p>':`<div class="nl-zone-discover"><div class="nl-chips">${touching.map(d=>chip(d.id)).join('') || '<span class="nl-meta">No intervals recorded for this zone.</span>'}</div><div class="nl-actions"><button class="nl-textbutton" data-atlas-zone>Open this zone in the atlas →</button><button class="nl-textbutton" data-aq-zone>Find AQ in zone ${selected} →</button>${structureById['zone:'+selected]?`<button class="nl-textbutton" data-structure="zone:${selected}">Read zone anatomy →</button>`:''}</div></div>`}
      </div>
    </section>`;
  }
  function chamberDirectory() {
    return `<section class="nl-directory" aria-labelledby="nl-directory-title"><div class="nl-room-heading"><span class="nl-kicker">Memory palace / Directory</span><h1 id="nl-directory-title">The chambers</h1><p>Follow recorded encounters through demons, thinkers, books, Tarot cards and the inner voices of Disco Elysium.</p></div><div class="nl-directory-doors">${roomDoor('chamber','01 / '+demons.length,'Demon chambers','Rites, concepts, thinkers and source passages.')}${roomDoor('thinkers','02 / '+thinkers.length,'Thinker chambers','Works, reading paths and the demons encountered across them.')}${roomDoor('books','03 / '+books.length,'Book chambers','Readings, chapters and the demons recorded in each work.')}${roomDoor('skills','04','Tarot & voices','Individual cards and skills, with saved comparisons where they exist.')}</div></section>`;
  }
  function atlas() {
    const matches=atlasDemons(demons,{...state.atlas,zone:state.zone,family:state.family});
    if(matches.length && !matches.some(d=>d.id===state.demon)){state.demon=matches[0].id;state.rite=0;}
    const d=matches.length?byId[state.demon]:null,rite=d?.rites?.[state.rite];
    const cards=state.atlas.format==='cards';
    const matrix=!cards && state.atlas.sort==='matrix' && matches.length===demons.length;
    const caption=d?`<strong>${e(d.name)}</strong> · ${rite?.calculable?e((rite.zones || []).join(' → ')):'Select a calculated rite below'}`:'Choose a demon to see its poles.';
    const axisLabels=matrix?`<span class="nl-pair-origin" aria-hidden="true">↘</span>${zones.slice(0,9).map(zone=>`<span class="nl-pair-axis" style="grid-column:${zone+2};grid-row:1" aria-hidden="true">${zone}</span>`).join('')}${zones.slice(1).map(zone=>`<span class="nl-pair-axis" style="grid-column:1;grid-row:${zone+1}" aria-hidden="true">${zone}</span>`).join('')}`:'';
    const tile=entry=>{
      const [low,high]=zonePoles(entry);
      const sigil=cards && high!==undefined?`<svg class="nl-demon-card-sigil" viewBox="0 0 425 800" aria-hidden="true"><path d="M${canonicalMap[low].join(' ')}L${canonicalMap[high].join(' ')}" stroke="currentColor" stroke-width="9"/>${zones.map(zone=>`<circle cx="${canonicalMap[zone][0]}" cy="${canonicalMap[zone][1]}" r="${zone===low || zone===high?32:15}" fill="${zone===low || zone===high?'currentColor':'none'}" stroke="currentColor" stroke-width="5"/>`).join('')}</svg>`:'';
      return `<button class="nl-tile ${family(entry)} ${state.demon===entry.id?'active':''}" ${matrix && high!==undefined?`style="--pair-col:${low+2};--pair-row:${high+1}"`:''} data-demon="${e(entry.id)}" aria-label="${e(entry.name)}, ${e(entry.net_span)}, ${e(entry.demon_class)}" aria-pressed="${state.demon===entry.id}"><span class="nl-tile-top"><span>${e(demonNumber(entry))}</span>${encounterCount(entry)?'<i class="nl-observed" aria-label="Has saved encounters"></i>':''}</span>${sigil}<strong>${e(entry.name)}</strong><small>${e(entry.net_span)}</small></button>`;
    };
    return `<section class="nl-atlas-room" aria-labelledby="nl-atlas-title">
      <div class="nl-room-heading"><span class="nl-kicker">Demon atlas / Pandemonium</span><h1 id="nl-atlas-title">The periodic table of demons</h1><p>One chamber for every interval. Select a tile to locate its two zones and trace its rites.</p></div>
      <div class="nl-atlas-workspace">
        <section class="nl-atlas-index">
          <div class="nl-atlas-controls">
            <label>Find a demon<input type="search" aria-label="Search demons" placeholder="Name, thinker, concept, tarot…" value="${e(state.atlas.query)}"></label>
            <label>Family<select aria-label="Demon family"><option value="">All families</option>${[['chrono','Chronodemons'],['amphi','Amphidemons'],['xeno','Xenodemons']].map(([value,label])=>`<option value="${value}" ${state.family===value?'selected':''}>${label}</option>`).join('')}</select></label>
            <label>Arrange by<select aria-label="Sort demons">${[['matrix','Zone pairs'],['number','Matrix number'],['name','Name A–Z'],['encounters','Most encounters']].map(([value,label])=>`<option value="${value}" ${state.atlas.sort===value?'selected':''}>${label}</option>`).join('')}</select></label>
          </div>
          <div class="nl-atlas-zonebar"><span class="nl-kicker">Zone</span>${zonePicker()}${state.zone===null?'':'<button class="nl-textbutton" data-clear-zone>Clear ×</button>'}<span class="nl-meta" aria-live="polite">${matches.length} of ${demons.length}</span></div>
          <div class="nl-atlas-key"><div class="nl-families"><span class="nl-family">Chronodemons</span><span class="nl-family amphi">Amphidemons</span><span class="nl-family xeno">Xenodemons</span><span class="nl-atlas-dot"><i class="nl-observed"></i> Saved encounters</span></div><div class="nl-atlas-formats" role="group" aria-label="Atlas display"><button class="nl-tab ${cards?'':'active'}" data-atlas-format="table" aria-pressed="${!cards}">Table</button><button class="nl-tab ${cards?'active':''}" data-atlas-format="cards" aria-pressed="${cards}">Deck</button></div></div>
          ${d?`<div class="nl-atlas-selected"><strong>${e(d.name)} · ${e(d.net_span)}</strong><button class="nl-textbutton" data-atlas-inspect>View on map ↓</button><button class="nl-textbutton" data-open-chamber="${e(d.id)}">Open chamber ↗</button></div>`:''}
          ${matches.length?`<div class="nl-table nl-periodic ${matrix?'by-pair':''} ${cards?'as-cards':''}" aria-label="${cards?'Demon deck':'Demon atlas'}">${axisLabels}${matches.map(tile).join('')}</div>`:'<p class="nl-empty">No demons match these filters.</p>'}
          <p class="nl-table-note">${matrix?'The two numbers on each tile are its zones. ':''}A lit dot marks a current saved encounter.</p>
        </section>
        <aside class="nl-atlas-dossier" aria-label="Selected demon" tabindex="-1">${diagram(d?[d.id]:[],rite?.calculable?[rite]:[],caption,true)}${rite?.calculable?'<button class="nl-textbutton nl-atlas-trace" data-map-rite-open>Open this rite on the main map ↗</button>':''}<div class="nl-inspector">${d?inspector():'<p class="nl-meta">Clear a filter to return to the atlas.</p>'}</div></aside>
      </div>
    </section>`;
  }
  function runIdsForSubject() {return hosts.filter(h=>subjectIds().includes(h.work_id) && (h.type || h.host_level)==='WB').map(h=>h.id || h.host_id);}
  function matrixRows(frames) {
    const assigned=new Set(frames.flatMap(frame=>frame.demon_ids));
    // Keep a stable atlas order so new assignments never move existing rows.
    return [...demons].sort((a,b)=>Number(a.number)-Number(b.number))
      .filter(d=>state.matrixRows!=='assigned' || assigned.has(d.id)).map(d=>d.id);
  }
  function matrixControls(assignedCount) {
    return `<div class="nl-matrix-controls" role="group" aria-label="Demons shown in the movement matrix"><button class="nl-tab ${state.matrixRows!=='assigned'?'active':''}" data-matrix-rows="all" aria-pressed="${state.matrixRows!=='assigned'}">All ${demons.length} demons</button><button class="nl-tab ${state.matrixRows==='assigned'?'active':''}" data-matrix-rows="assigned" aria-pressed="${state.matrixRows==='assigned'}">Assigned only · ${assignedCount}</button><span>Scroll to explore every row and writing ↕ ↔</span></div>`;
  }
  const matrixLegend='<p class="nl-matrix-legend"><span><i class="assigned"></i>Assigned</span><span><i></i>Not assigned in this reading</span><span><i class="missing"></i>No saved reading</span></p><p class="nl-order-note">Saved assignments, not a score for every demon. Not assigned does not mean individually ruled out. Select a demon’s name to open its chamber.</p>';
  const structureEntities=world.structure_pages?.entities || [];
  const structureById=Object.fromEntries(structureEntities.map(item=>[item.id,item]));
  if(structureById[data.structure_focus]){state.mode='anatomy';Object.assign(state.anatomy,{id:data.structure_focus,kind:structureById[data.structure_focus].kind,query:'',page:0,route:''});}
  const structureKinds=[['gate','Gates'],['zone','Zones'],['current','Currents'],['syzygy','Syzygies'],['region','Regions'],['rite','Rites']];
  const structureButton=(id,label,relation='')=>`<button class="nl-structure-link" data-structure="${e(id)}"><strong>${e(label || structureById[id]?.title || id)}</strong>${relation?`<small>${e(relation.replaceAll('_',' '))}</small>`:''}</button>`;
  function anatomy() {
    const s=state.anatomy,entity=structureById[s.id] || structureEntities.find(x=>x.kind===s.kind) || structureEntities[0];
    if(!entity)return '<p class="nl-empty">Structure pages are not available in this library projection yet.</p>';
    s.id=entity.id;
    const q=s.query.trim().toLowerCase(),rows=structureEntities.filter(x=>x.kind===s.kind && `${x.title} ${x.subtitle} ${x.summary}`.toLowerCase().includes(q));
    const current=new Set(entity.current_route_ids || []),all=new Set(entity.route_ids || []),runById=Object.fromEntries(runs.map(r=>[r.id,r]));
    const query=s.encounterQuery.trim().toLowerCase();
    const matches=Object.fromEntries((entity.route_matches || []).map(m=>[m.route_id,m]));
    const encounters=(world.routes || []).filter(r=>(s.history?all:current).has(r.id)).filter(r=>{
      const run=runById[r.run_id] || {};return `${r.name} ${r.description} ${r.book_title} ${run.author} ${run.host_title} ${byId[r.mesh_id]?.name || ''}`.toLowerCase().includes(query);
    }).sort((a,b)=>String(b.date || '').localeCompare(String(a.date || '')) || a.id.localeCompare(b.id));
    const pages=Math.max(1,Math.ceil(encounters.filter(o=>!(s.hiddenAuthors || []).includes(authorInfo(o).id)).length/8));s.page=Math.max(0,Math.min(s.page,pages-1));
    const selectedRoute=encounters.find(r=>r.id===s.route),routes=selectedRoute?[selectedRoute]:[];
    const sources=(world.structure_pages?.sources || []).filter(source=>(entity.source_refs || []).includes(source.id));
    const matrixSources=sources.filter(source=>source.evidence_kind==='strict_matrix'),commentarySources=sources.filter(source=>source.evidence_kind!=='strict_matrix');
    const sourceCard=source=>`<details class="nl-structure-source"><summary>${e(source.title)}</summary><p class="nl-meta">${e(String(source.evidence_kind || 'Source text').replaceAll('_',' '))}${source.line_start?' · lines '+e(source.line_start)+'–'+e(source.line_end):''}</p><blockquote>${e(source.excerpt || '')}</blockquote>${source.excerpt_truncated?'<p class="nl-meta">Excerpt from the located passage.</p>':''}${/^(https?:\/\/|\/[^/])/.test(source.url || '')?`<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`:''}</details>`;
    const demonLinks=(entity.links || []).filter(link=>link.id.startsWith('demon:'));
    const regularLinks=(entity.links || []).filter(link=>!link.id.startsWith('demon:') && !link.id.startsWith('rite:'));
    const riteLinks=(entity.links || []).filter(link=>link.id.startsWith('rite:'));
    const seen=s.seen?.[entity.id],newRuns=seen?(entity.current_run_ids || []).filter(id=>!seen.run_ids.includes(id)):[];
    const routeCard=route=>{
      const run=runById[route.run_id] || {},match=matches[route.id] || {},positions=match.positions || [];
      const width=match.basis==='completed_syzygy_current'?3:['directed_channel_edge','directed_current_edge','syzygy_crossing'].includes(match.basis)?2:1;
      const touched=new Set(positions.flatMap(index=>Array.from({length:width},(_,i)=>index+i)));
      const context=positions.slice(0,4).map(index=>{const last=index+width-1;return `${index>0?route.zones[index-1]:'Start'} → [${route.zones.slice(index,last+1).join(' → ')}] → ${last+1<route.zones.length?route.zones[last+1]:'End'}`;});
      return `<article class="nl-structure-encounter ${s.route===route.id?'active':''}"><div class="nl-kicker">${e(run.author || 'Saved reading')} · ${e(run.date_label || dateLabel(route.date))}</div><h3>${e(run.host_title || route.book_title || route.name)}</h3><p class="nl-meta">${e(byId[route.mesh_id]?.name || route.mesh_id)} · ${e(route.rite_id || '')} · ${run.is_latest===false?'Earlier version':'Current reading'} · ${e(run.version || '')}</p><div class="nl-route-sequence">${(route.zones || []).map((zone,index)=>`${index?'<span>→</span>':''}<button class="${touched.has(index)?'active':''}" data-structure="zone:${e(zone)}" aria-label="Open Zone ${e(zone)} from route">${e(zone)}</button>`).join('') || `<span>${e(route.code || 'Symbolic rite')}</span>`}</div><p class="nl-prose">${e(route.description || 'No route interpretation recorded.')}</p><div class="nl-actions"><button class="nl-textbutton" data-anatomy-route="${e(route.id)}">${s.route===route.id?'Shown on map':'Trace on map'} ↗</button>${paneButton(route.run_id)}</div><details><summary>Exact match & source trace</summary><p class="nl-meta">${e(String(match.basis || 'Saved route').replaceAll('_',' '))} · ${positions.length} recorded position${positions.length===1?'':'s'}</p>${context.length && match.basis!=='exact_owned_rite'?`<p class="nl-meta">Before / through / after in this rite</p><pre>${e(context.join('\n'))}${positions.length>4?'\n…':''}</pre>`:''}<pre>${e((route.source_trace || []).join('\n'))}</pre><p class="nl-meta">${e(route.evidence_class || 'Saved NUMO interpretation')} · ${e(route.run_id)}</p></details></article>`;
    };
    return `<section class="nl-anatomy"><aside class="nl-structure-nav"><div class="nl-kicker">Anatomy of the Numogram</div><div class="nl-structure-kinds" role="group" aria-label="Structure types">${structureKinds.map(([kind,label])=>`<button class="nl-tab ${s.kind===kind?'active':''}" data-structure-kind="${kind}" aria-pressed="${s.kind===kind}">${label}<small>${structureEntities.filter(x=>x.kind===kind).length}</small></button>`).join('')}</div><input class="nl-host-search" aria-label="Find a structure" placeholder="Find in ${e(structureKinds.find(x=>x[0]===s.kind)?.[1].toLowerCase() || 'structures')}…" value="${e(s.query)}"><div class="nl-structure-list">${rows.map(item=>`<button class="nl-structure-item ${item.id===entity.id?'active':''}" data-structure="${e(item.id)}"><strong>${e(item.title)}</strong><small>${e(item.subtitle || item.kind)}</small><span>${(item.current_run_ids || []).length} readings</span></button>`).join('') || '<p class="nl-empty">No matching structures in this group.</p>'}</div></aside><section class="nl-structure-main"><header class="nl-structure-heading"><div class="nl-kicker">${e(entity.kind)} / Connected research page</div><h2>${e(entity.title)}</h2><p>${e(entity.summary)}</p><a class="nl-structure-permalink" href="/?view=numo&amp;structure=${e(encodeURIComponent(entity.id))}" target="_blank" rel="noopener noreferrer">Open this page separately ↗</a></header>${learningAccount(entity.id)}<div class="nl-structure-facts">${(entity.facts || []).map(fact=>`<div><span>${e(fact.label)}</span><strong>${e(fact.value)}</strong></div>`).join('')}</div><section class="nl-structure-section"><div class="nl-section-head"><h3>Connections</h3><span>Follow the diagram</span></div><div class="nl-structure-links">${regularLinks.map(link=>structureButton(link.id,link.label,link.relation)).join('') || '<p class="nl-meta">No direct structure links recorded.</p>'}</div>${riteLinks.length?`<details class="nl-related-rites"><summary>Connected Matrix rites · ${riteLinks.length}</summary><div class="nl-structure-links">${riteLinks.map(link=>structureButton(link.id,link.label,link.relation)).join('')}</div></details>`:''}<h4>Related demons · ${(entity.demon_ids || []).length}</h4><div class="nl-chips">${(entity.demon_ids || []).map(chip).join('') || '<p class="nl-meta">No demon relation recorded.</p>'}</div>${demonLinks.length?`<details class="nl-related-rites"><summary>How these demons relate</summary><div class="nl-structure-links">${demonLinks.map(link=>structureButton(link.id,link.label,link.relation)).join('')}</div></details>`:''}<p class="nl-order-note">Structural relationships and route ownership. Sharing a zone does not establish that one demon causes or follows another.</p></section><section class="nl-structure-section"><div class="nl-section-head"><h3>Source material</h3><span>${sources.length} references</span></div>${commentarySources.map(sourceCard).join('')}${matrixSources.length?`<details class="nl-matrix-sources"><summary>Matrix source entries · ${matrixSources.length}</summary>${matrixSources.map(sourceCard).join('')}</details>`:''}${!sources.length?'<p class="nl-meta">No source excerpt available in this projection.</p>':''}</section><section class="nl-structure-section"><div class="nl-section-head"><h3>In the readings</h3><span>${encounters.length} route occurrences</span></div><div class="nl-anatomy-filters"><input class="nl-host-search" aria-label="Find structure encounters" placeholder="Thinker, book, demon or phrase…" value="${e(s.encounterQuery)}"><label class="nl-meta"><input type="checkbox" data-anatomy-history ${s.history?'checked':''}> Include earlier versions</label></div><p class="nl-order-note">Matches are exact ordered passages in saved rites. Their frequency describes these readings, not the probability of what happens next.</p>${authorReadings(encounters,s,'anatomy',routeCard,8)}${s.authorMode==='chronology' && pages>1?`<div class="nl-pager"><button class="nl-button" data-anatomy-page="${s.page-1}" ${s.page===0?'disabled':''}>← Previous</button><span>${s.page+1} / ${pages}</span><button class="nl-button" data-anatomy-page="${s.page+1}" ${s.page===pages-1?'disabled':''}>Next →</button></div>`:''}</section></section><aside class="nl-structure-aside">${diagram([],routes,`<strong>${e(entity.title)}</strong><br>${selectedRoute?e(selectedRoute.name || selectedRoute.code):'Select a saved route to trace it here.'}`,false,entity)}<p class="nl-order-note">Select a gate, current, syzygy, region or zone on the map to open its page.</p><section class="nl-evolving"><span class="nl-kicker">An evolving account</span><h3>${(entity.current_run_ids || []).length} current readings</h3><p class="nl-meta">${seen?newRuns.length+' new reading versions since your last check.':'Evidence is rebuilt from saved readings when you refresh.'}${seen && seen.fingerprint!==entity.fingerprint?' The evidence snapshot has changed.':''}</p><div class="nl-actions"><button class="nl-textbutton" data-anatomy-seen>Mark evidence seen</button><button class="nl-textbutton" data-anatomy-export>Export review snapshot ↓</button></div><p class="nl-meta">The snapshot includes this page, connected pages, demon accounts and exact reading versions. Your seen marker is kept in this browser.</p><details><summary>How learning rounds work</summary><p>Read connected pages together against the same frozen evidence. Compare the next account with the previous one: what holds, changes or remains unresolved?</p><p>Accounts from one round become inputs to the next. Repeated interpretations retain their original sources; repetition alone adds no independent support.</p><p>Open the Learning studio to review A accounts or B rereadings before starting a model run. Exporting or browsing starts no model run.</p></details></section></aside></section>`;
  }
  function openStructure(id) {
    if(id.startsWith('demon:')){openChamber(id.slice(6));return;}
    const entity=structureById[id];if(!entity)return;
    const already=state.mode==='anatomy';state.mode='anatomy';state.zone=null;
    Object.assign(state.anatomy,{id,kind:entity.kind,query:'',page:0,route:''});
    already?renderContent():render();
  }

  function workbench() {
    const s=state.study,scope=studyScope(world,s),frames=studyFrames(world,s);
    s.frame=Math.max(0,Math.min(Number(s.frame)||0,frames.length-1));
    const f=frames[s.frame],a=s.compare===null?null:frames[s.compare],comparison=compareFrames(a,f);
    const observed=frames.filter(f=>f.observed),missing=studyUnreadHosts(world,s);
    const thinker=thinkers.find(t=>t.id===s.thinker),work=books.find(b=>b.id===s.work);
    const availableBooks=books.filter(b=>!thinker || (thinker.book_ids || []).includes(b.id));
    const selectedIds=new Set(scope.selected.map(h=>h.id));
    const hostQuery=String(s.hostQuery || '').toLowerCase();
    const visibleHosts=scope.inRange.filter(h=>`${h.title} ${books.find(b=>b.id===h.work_id)?.title || ''}`.toLowerCase().includes(hostQuery));
    const assignedIds=unique(frames.flatMap(f=>f.demon_ids)),demonIds=matrixRows(frames);
    const dateEvidence=(f?.date_evidence || []).map(item=>`<p><strong>${/^https?:\/\//.test(item.source_url || '')?`<a href="${e(item.source_url)}" target="_blank" rel="noopener noreferrer">${e(item.source_title || 'Recorded source')} ↗</a>`:e(item.source_title || item.date_basis || 'Recorded source')}</strong><br>${e(item.assertion || item.excerpt || '')}${item.locator?' · '+e(item.locator):''}</p>`).join('');
    const windowStart=Math.floor(s.frame/80)*80,windowFrames=frames.slice(windowStart,windowStart+80);
    const heat=frames.length && demonIds.length?`${frames.length>80?`<div class="nl-matrix-pages"><button class="nl-textbutton" data-study-frame="${windowStart-1}" ${windowStart===0?'disabled':''}>← Earlier</button><span>Writings ${windowStart+1}–${Math.min(frames.length,windowStart+80)} / ${frames.length}</span><button class="nl-textbutton" data-study-frame="${windowStart+80}" ${windowStart+80>=frames.length?'disabled':''}>Later →</button></div>`:''}<div class="nl-heatmap" role="region" aria-label="Demon movement matrix" tabindex="0"><div class="nl-heat-grid" style="grid-template-columns:120px repeat(${windowFrames.length},25px)"><span class="nl-heat-corner">Demon / writing</span>${windowFrames.map((frame,index)=>{const i=windowStart+index;return `<button class="nl-heat-index" data-study-frame="${i}" title="${e(frame.title)}">${i+1}</button>`;}).join('')}${demonIds.map(id=>`<button class="nl-textbutton nl-heat-label" data-demon="${e(id)}">${e(byId[id]?.name || id)}</button>${windowFrames.map((frame,index)=>{const i=windowStart+index;return `<button class="nl-heat-cell ${frame.observed?'':'missing'} ${frame.demon_ids.includes(id)?'observed':''} ${i===s.frame?'active':''}" data-study-frame="${i}" aria-label="${e(byId[id]?.name || id)} · ${e(frame.title)} · ${frame.demon_ids.includes(id)?'assigned':frame.observed?'not assigned':'no reading'}"></button>`;}).join('')}`).join('')}</div></div>`:`<p class="nl-empty">${!frames.length?'Choose writings to view their movement matrix.':'No demons have been assigned in these saved readings. Choose All '+demons.length+' demons to see the full matrix.'}</p>`;
    const comparisonHtml=a?`<section class="nl-comparison"><div class="nl-section-head"><h3>A → B</h3><button class="nl-textbutton" data-clear-compare>Clear comparison ×</button></div><p class="nl-meta">A · ${e(a.title)}<br>B · ${e(f?.title || '')}</p>${comparison.comparable?`<div class="nl-deltas"><div><span>Assigned in B only · ${comparison.added.length}</span><div class="nl-chips">${comparison.added.map(chip).join('') || '<small>None</small>'}</div></div><div><span>In both readings · ${comparison.retained.length}</span><div class="nl-chips">${comparison.retained.map(chip).join('') || '<small>None</small>'}</div></div><div><span>Assigned in A only · ${comparison.unassigned.length}</span><div class="nl-chips">${comparison.unassigned.map(chip).join('') || '<small>None</small>'}</div></div></div><p class="nl-order-note">Changes in saved assignments. A demon not assigned in one reading is not proof of its disappearance.</p>`:'<p class="nl-order-note">Both points need saved readings before their assignments can be compared.</p>'}</section>`:'';
    const notices=s.loaded?(world.saved_studies || []).find(study=>study.id===s.loaded)?.availability:null;
    return `<section class="nl-workbench"><form class="nl-question"><span class="nl-kicker">Build a study</span><div><input aria-label="Study query" placeholder="Nick Land 1988–2014, or a book title…" value="${e(s.question)}"><button class="nl-button primary" type="submit">Build scope →</button></div><p class="nl-meta">A thinker or a book, with optional years. Dates come from source evidence.</p></form><div class="nl-scopebar"><label>Thinker<select aria-label="Study thinker"><option value="">All thinkers</option>${thinkers.map(t=>`<option value="${e(t.id)}" ${s.thinker===t.id?'selected':''}>${e(t.name)}</option>`).join('')}</select></label><label>Work<select aria-label="Study work"><option value="">All works in scope</option>${availableBooks.map(b=>`<option value="${e(b.id)}" ${s.work===b.id?'selected':''}>${e(b.title)}</option>`).join('')}</select></label><label>Read at<select aria-label="Study level">${[['CH','Essays / chapters'],['WB','Whole works'],['ALL','Essays + works']].map(([key,label])=>`<option value="${key}" ${s.level===key?'selected':''}>${label}</option>`).join('')}</select></label><label>From<input type="number" aria-label="Study from year" value="${e(s.from)}" placeholder="Year"></label><label>To<input type="number" aria-label="Study to year" value="${e(s.to)}" placeholder="Year"></label></div><div class="nl-scope-summary"><span><strong>${scope.selected.length}</strong> selected / ${observed.length} ${s.loaded?'in saved snapshot':'read'} / <b>${missing.length} ${s.loaded?'currently unread':'unread'}</b></span><label><input type="checkbox" data-include-undated ${s.includeUndated?'checked':''}> Include ${scope.unknown.length} undated writings</label><button class="nl-textbutton" data-example-land>Try Land · 1988–2014</button></div>${s.message?`<p class="nl-warning" role="status" data-study-message>${e(s.message)} <button class="nl-textbutton" type="button" data-dismiss-study-message aria-label="Dismiss study message">Dismiss ×</button></p>`:''}${scope.invalid?'<p class="nl-warning">The date range is invalid. The first year must come before the last.</p>':''}${s.loaded?`<p class="nl-order-note">Saved study · preserved run versions${notices?.stale?' · Some sources are no longer available; saved references have been retained.':''} <button class="nl-textbutton" data-study-live>Use latest readings</button></p>`:''}<div class="nl-study-layout"><aside class="nl-selection"><div class="nl-section-head"><h2>Writings</h2><span>${scope.inRange.length}</span></div><input class="nl-host-search" aria-label="Find writings in scope" placeholder="Find a writing…" value="${e(s.hostQuery)}"><div class="nl-selection-tools"><button class="nl-textbutton" data-select-all>Select all</button><button class="nl-textbutton" data-select-unread>Select unread</button><button class="nl-textbutton" data-select-matching>Add matching</button><button class="nl-textbutton" data-select-none>Clear</button></div><p class="nl-meta">Tick only the writings you want. Changing this selection does not change a run already underway.</p><div class="nl-host-list">${visibleHosts.slice(0,s.hostLimit).map(h=>{const run=runs.find(r=>(r.catalog_host_id || r.host_id)===h.id && r.is_latest),position=frames.findIndex(f=>f.id===h.id);return `<div class="nl-host ${f?.id===h.id?'active':''}"><input type="checkbox" data-host-select="${e(h.id)}" aria-label="Select ${e(h.title)}" ${selectedIds.has(h.id)?'checked':''}><button data-study-frame="${position}" ${position<0?'disabled':''}><small>${e(h.date_label || yearLabel(h.source_year))} · ${h.type}</small><strong>${e(h.title)}</strong><span>${e(books.find(b=>b.id===h.work_id)?.title || '')}</span><small class="${run?'read':'unread'}">${run?'Saved reading':'Not yet read'}</small></button></div>`;}).join('') || '<p class="nl-empty">No writings match these dates or words. Undated texts can be included explicitly.</p>'}${visibleHosts.length>s.hostLimit?`<button class="nl-button" data-more-hosts>Show more · ${s.hostLimit} / ${visibleHosts.length}</button>`:''}</div></aside><section class="nl-study-main"><div class="nl-study-actions"><button class="nl-button primary" data-run-missing ${missing.length?'':'disabled'}>Review ${missing.length} unread ↗</button><button class="nl-button" data-run-scope ${frames.length?'':'disabled'}>Review selected ${frames.length} ↗</button><button class="nl-button" data-pin-compare ${f?'':'disabled'}>${a?'Replace point A':'Set as point A'}</button></div><p class="nl-order-note">Browsing and comparisons use saved readings at no charge. Review lets you choose exact sources and see the estimate; only Start makes new readings.</p><div class="nl-section-head"><h2>${e(work?.title || thinker?.name || 'Selected writings')}</h2><span>${assignedIds.length} / ${demons.length} demons assigned</span></div><p class="nl-order-note">Source chronology · date ranges overlap the selected period. Essays retain their own dates; an anthology’s publication year is not used as an essay date.</p><div class="nl-study-transport"><button class="nl-button" data-study-frame="${s.frame-1}" aria-label="Previous writing" ${s.frame<=0?'disabled':''}>←</button><input type="range" aria-label="Move through selected writings" min="0" max="${Math.max(0,frames.length-1)}" value="${s.frame}" ${frames.length<2?'disabled':''}><button class="nl-button" data-study-frame="${s.frame+1}" aria-label="Next writing" ${s.frame>=frames.length-1?'disabled':''}>→</button><span>${frames.length?s.frame+1:0} / ${frames.length}</span></div>${matrixControls(assignedIds.length)}${heat}${matrixLegend}${comparisonHtml}${f?`<article class="nl-frame"><span class="nl-kicker">${e(f.label)} · ${e((f.date_basis || 'unknown').replaceAll('_',' '))}</span><h3>${e(f.title)}</h3><div class="nl-actions">${f.run_ids.length?paneButton(f.run_ids[0],'Open complete NUMO in panes ↗'):''}<button class="nl-textbutton" data-run-host="${e(f.id)}">${f.observed?'Review a new reading':'Review this writing'} ↗</button><button class="nl-textbutton" data-open-work="${e(f.work_id)}">Open source book ↗</button></div>${dateEvidence?`<details><summary>Why this date?</summary><div class="nl-meta">${dateEvidence}</div></details>`:'<p class="nl-meta">No verified date is recorded for this writing.</p>'}<div class="nl-chips">${f.demon_ids.map(chip).join('')}</div>${!f.observed?'<p class="nl-prose">This writing has no saved NUMO reading in this study. Review it individually or choose unread writings together. A saved snapshot may omit readings that are now available; use latest readings to include them.</p>':f.observations.slice(0,3).map(evidence).join('')}${f.observations.length>3?`<p class="nl-meta">${f.observations.length} assignments. Open the complete reading for every proposition and source trace.</p>`:''}</article>`:''}<section class="nl-save-study"><label>Study name<input aria-label="Study name" placeholder="Name this investigation" value="${e(s.name)}"></label><div class="nl-actions"><button class="nl-button" data-save-study ${frames.length?'':'disabled'}>Save study</button><button class="nl-button" data-export-study ${frames.length?'':'disabled'}>Export evidence index ↓</button></div><label>Saved studies<select aria-label="Load saved study"><option value="">Open a saved investigation…</option>${(world.saved_studies || []).map(study=>`<option value="${e(study.id)}" ${s.loaded===study.id?'selected':''}>${e(study.name)}${study.availability?.stale?' · needs attention':''}</option>`).join('')}</select></label><p class="nl-meta">A study preserves your selected writings and exact saved reading versions.</p></section></section><aside class="nl-study-map">${diagram(f?.demon_ids || [],frameRoutes(world,f),f?`<strong>${e(f.label)}</strong> · ${e(f.title)}<br>${f.demon_ids.length} assigned demons · ${f.observed?'saved reading':'coverage gap'}`:'Choose a writing to inspect its constellation.')}<p class="nl-order-note">Exact recorded rites for the selected writing. The movement matrix keeps all co-present demons together.</p></aside></div></section>`;
  }
  let memoryRunsByWork;
  function memoryRuns() {
    if (memoryRunsByWork) return memoryRunsByWork;
    memoryRunsByWork = new Map();
    const assignments = new Map();
    for (const demon of demons) {
      for (const observation of demon.observations || demon.history || []) {
        if (observation.is_latest === false || !observation.run_id) continue;
        if (!assignments.has(observation.run_id)) assignments.set(observation.run_id, new Set());
        assignments.get(observation.run_id).add(observation.mesh_id || demon.id);
      }
    }
    for (const run of runs) {
      const work = run.work_id || run.book_id;
      if (!work || run.is_latest === false) continue;
      if (!memoryRunsByWork.has(work)) memoryRunsByWork.set(work, []);
      const demonIds = unique([...(run.demon_ids || []), ...(assignments.get(run.id) || [])]).filter(id => byId[id]);
      memoryRunsByWork.get(work).push({...run, demon_ids:demonIds});
    }
    return memoryRunsByWork;
  }

  function explore() {
    const thinkerMode = state.mode === 'thinkers';
    const selectedId = thinkerMode ? state.thinker : state.book;
    const noun = thinkerMode ? 'thinker' : 'book';
    const catalogue = thinkerMode ? thinkers : books;
    const subject = catalogue.find(item => item.id === selectedId);
    const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const terms = normalize(state.query).trim().split(/\s+/).filter(Boolean);
    const memory = state.memory;
    const indexedRuns = memoryRuns();
    const subjectWorks = new Set(subjectIds());
    const readings = [...subjectWorks].flatMap(id => indexedRuns.get(id) || [])
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const hits = new Map();
    for (const reading of readings) {
      for (const id of reading.demon_ids) hits.set(id, (hits.get(id) || 0) + 1);
    }
    const demonIds = [...hits.keys()].sort((a, b) => hits.get(b) - hits.get(a) || (byId[a].number ?? 0) - (byId[b].number ?? 0));
    const rows = catalogue.filter(item => {
      const text = normalize([item.title || item.name, item.author, item.source_year ?? item.year].join(' '));
      const hasReadings = thinkerMode
        ? (item.book_ids || []).some(id => indexedRuns.has(id))
        : indexedRuns.has(item.id);
      return (memory.coverage !== 'read' || hasReadings) && terms.every(term => text.includes(term));
    });
    const visibleRows = rows.slice(0, memory.limit);
    if (rows.includes(subject) && !visibleRows.includes(subject)) visibleRows.unshift(subject);
    const author = thinkerMode ? null : thinkers.find(item => item.id === subject?.author_id);
    const scopedHosts = hosts.filter(host => subjectWorks.has(host.work_id));
    const hasWholeWorks = scopedHosts.some(host => (host.type || host.host_level) === 'WB');
    const hasChapters = scopedHosts.some(host => (host.type || host.host_level) === 'CH');
    const title = subject?.title || subject?.name;
    const browseLabel = thinkerMode ? 'Thinker chambers' : 'Book chambers';
    const works = thinkerMode ? books.filter(book => subjectWorks.has(book.id)).sort((a, b) =>
      Number(!!b.observed) - Number(!!a.observed) || a.title.localeCompare(b.title)) : [];
    const nameFor = id => byId[id]?.name || id;
    const workLink = book => {
      const count = (indexedRuns.get(book.id) || []).length;
      return `<button type="button" class="nl-memory-work" data-memory-book="${e(book.id)}">
        <span><strong>${e(book.title)}</strong><small>${e(book.date_label || yearLabel(book.source_year ?? book.year))} · ${count ? count + (count === 1 ? ' current reading' : ' current readings') : 'No current reading'}</small></span><span aria-hidden="true">↗</span>
      </button>`;
    };
    const readingLabel = run => run.host_title || run.title || run.book_title || run.host_id;
    const directory = `<aside class="nl-memory-index" aria-label="${browseLabel}">
      <div class="nl-memory-index-head">
        <span class="nl-kicker">Memory index</span><h2>${browseLabel}</h2>
        <label class="nl-memory-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="${thinkerMode ? 'Find a thinker' : 'Find a book or author'}" placeholder="${thinkerMode ? 'Find a thinker…' : 'Find a book or author…'}" value="${e(state.query)}"></label>
        <div class="nl-memory-filters">
          <button type="button" data-memory-coverage="all" aria-pressed="${memory.coverage === 'all'}">All</button>
          <button type="button" data-memory-coverage="read" aria-pressed="${memory.coverage === 'read'}">With readings</button>
          <span aria-live="polite">${rows.length}</span>
        </div>
      </div>
      <div class="nl-memory-index-list">
        ${visibleRows.map(item => `<button type="button" class="nl-subject ${selectedId === item.id ? 'active' : ''}" data-${noun}="${e(item.id)}" aria-current="${selectedId === item.id ? 'true' : 'false'}">
          <strong>${e(item.title || item.name)}</strong>
          <small>${thinkerMode ? `${(item.book_ids || []).length} ${(item.book_ids || []).length===1?'work':'works'}` : e([item.author, item.date_label || yearLabel(item.source_year ?? item.year)].filter(Boolean).join(' · '))}</small>
          ${item.observed ? `<span class="nl-badge">${(item.demon_ids || []).length} recorded demons</span>` : ''}
        </button>`).join('') || '<p class="nl-empty">No chambers match this search.</p>'}
        ${rows.length > memory.limit ? `<button type="button" class="nl-memory-more nl-textbutton" data-memory-more>Show ${Math.min(40, rows.length - memory.limit)} more ↓</button>` : ''}
      </div>
    </aside>`;
    if (!subject) return `<div class="nl-memory">${directory}<p class="nl-empty">No ${noun} chambers are available yet.</p></div>`;
    return `<div class="nl-memory">${directory}<section class="nl-memory-room" aria-label="${noun} chamber">
      <header class="nl-memory-hero">
        <span class="nl-kicker">${thinkerMode ? 'Thinker chamber' : 'Book chamber'}</span>
        <h2>${e(title)}</h2>
        ${!thinkerMode ? `<div class="nl-memory-byline">${author ? `<button type="button" class="nl-textbutton" data-memory-thinker="${e(author.id)}">${e(author.name)} ↗</button>` : e(subject.author || 'Unattributed')}` + `<span>${e(subject.date_label || yearLabel(subject.source_year ?? subject.year))}</span></div>` : ''}
        <div class="nl-memory-stats">
          <div><strong>${thinkerMode ? works.length : scopedHosts.filter(host => (host.type || host.host_level) === 'CH').length}</strong><span>${thinkerMode ? 'Works in Care' : 'Chapters in Care'}</span></div>
          <div><strong>${readings.length}</strong><span>Current readings</span></div>
          <div><strong>${demonIds.length}</strong><span>Recorded demons</span></div>
        </div>
        <div class="nl-memory-actions">
          ${scopedHosts.length ? '<button type="button" class="nl-button primary" data-memory-study>Open in Workbench →</button>' : ''}
          ${!thinkerMode ? `<button type="button" class="nl-button" data-open-work="${e(subject.id)}">Open book in Care ↗</button>` : ''}
        </div>
      </header>
      <div class="nl-memory-presence">
        <section class="nl-memory-panel">
          <span class="nl-kicker">Demon index</span><h3>Who appears here</h3>
          <p class="nl-meta">Occurrences in current saved NUMO readings. Follow a demon to its chamber.</p>
          ${demonIds.length ? `<div class="nl-memory-demons">${demonIds.map(id => `<button type="button" class="nl-memory-demon ${family(byId[id])}" data-demon="${e(id)}">
            <span class="nl-memory-span">${e(byId[id].net_span)}</span>
            <span><strong>${e(nameFor(id))}</strong><small>${hits.get(id)} ${hits.get(id) === 1 ? 'reading' : 'readings'}</small></span>
            <span class="nl-memory-arrow" aria-hidden="true">↗</span>
          </button>`).join('')}</div>` : `<p class="nl-memory-empty">${readings.length ? 'The current readings have no recorded demon assignments.' : 'Demon assignments will appear here as readings are saved.'}</p>`}
        </section>
        ${demonIds.length ? `<aside class="nl-memory-map">${diagram(demonIds, [], '<strong>Chamber overview</strong><br>Zones linked to the recorded demons. Open the reading path to trace individual rites.')}</aside>` : ''}
      </div>
      <div class="nl-memory-ledgers ${works.length ? 'paired' : ''}">
        ${works.length ? `<section class="nl-memory-panel"><span class="nl-kicker">Book chambers</span><h3>Works in this chamber</h3>
          ${works.slice(0, 8).map(workLink).join('')}
          ${works.length > 8 ? `<details class="nl-memory-details"><summary>Show ${works.length - 8} more works</summary>${works.slice(8).map(workLink).join('')}</details>` : ''}
        </section>` : ''}
        <section class="nl-memory-panel">
          <span class="nl-kicker">Reading record</span><h3>Recent evidence</h3>
          ${readings.slice(0, 4).map(run => `<article class="nl-memory-reading">
            <div><h4>${e(readingLabel(run))}</h4><p class="nl-meta">${e(dateLabel(run.date))} · ${run.demon_ids.length} ${run.demon_ids.length === 1 ? 'demon' : 'demons'}</p></div>
            ${paneButton(run.id, 'Open exact reading ↗')}
          </article>`).join('') || '<p class="nl-memory-empty">No current saved readings for this chamber.</p>'}
          <div class="nl-memory-actions">
            ${hasWholeWorks ? `<button type="button" class="nl-textbutton" data-run-subject>${thinkerMode ? 'Review whole works' : 'Review whole-book reading'} ↗</button>` : ''}
            ${!thinkerMode && hasChapters ? '<button type="button" class="nl-textbutton" data-run-chapters>Review chapter readings ↗</button>' : ''}
          </div>
        </section>
      </div>
      <section class="nl-memory-path">
        <button type="button" class="nl-memory-path-toggle" aria-label="Reading path" aria-expanded="${memory.path}" aria-controls="nl-memory-path-content" data-memory-path>
          <span><span class="nl-kicker">Reading path</span><strong>${thinkerMode ? 'Trace the thinker across works' : 'Trace the book through its chapters'}</strong></span>
          <span aria-hidden="true">${memory.path ? '−' : '+'}</span>
        </button>
        <div id="nl-memory-path-content" ${memory.path ? '' : 'hidden'}>${memory.path ? memoryPath(thinkerMode) : ''}</div>
      </section>
    </section></div>`;
  }

  function memoryPath(thinkerMode) {
    const frames = currentFrames(), frame = currentFrame(frames);
    const journeys = (world.journeys || []).filter(journey => subjectIds().includes(journey.book_id));
    const axis = state.axis;
    const notes = {
      chapters:'Recorded chapter order. Gaps mark chapters without a saved reading.',
      publications:'Catalogue publication dates. Undated works come last. A blank column marks missing evidence.',
      readings:'Dates of saved readings, including earlier versions. Demons within a run appear together.',
    };
    const observedIds = unique(frames.flatMap(item => item.demon_ids));
    const demonIds = matrixRows(frames);
    const activeRun = frame?.run_ids?.[0];
    const heat = frames.length ? `<div class="nl-detail-label">Demon presence across ${axis === 'chapters' ? 'chapters' : axis === 'publications' ? 'works' : axis === 'readings' ? 'readings' : 'process steps'}</div>
      <div class="nl-heatmap" role="region" aria-label="Demon movement matrix" tabindex="0">
        <div class="nl-heat-grid" style="grid-template-columns:120px repeat(${frames.length},25px)">
          <span class="nl-heat-corner">Demon / writing</span>
          ${frames.map((item, i) => `<span class="nl-heat-index" title="${e(item.title)}">${i + 1}</span>`).join('')}
          ${demonIds.map(id => `<button type="button" class="nl-textbutton nl-heat-label" data-demon="${e(id)}">${e(byId[id]?.name || id)}</button>${frames.map((item, i) => {
            const observed = item.demon_ids.includes(id);
            const label = observed ? 'Recorded' : item.observed ? 'Unassigned in this reading' : 'No saved reading';
            return `<button type="button" class="nl-heat-cell ${item.observed ? '' : 'missing'} ${observed ? 'observed' : ''} ${i === state.frame ? 'active' : ''}" data-frame="${i}" title="${e(byId[id]?.name || id)} · ${e(item.title)} · ${label}" aria-label="${e(byId[id]?.name || id)} in ${e(item.title)} · ${label}"></button>`;
          }).join('')}`).join('')}
        </div>
      </div>` : '';
    return `<div class="nl-memory-path-grid"><div>
      <div class="nl-path-controls"><label for="nl-axis">Follow</label><select id="nl-axis" aria-label="Timeline order">
        ${thinkerMode ? `<option value="publications" ${axis === 'publications' ? 'selected' : ''}>Across works · publication year</option>` : `<option value="chapters" ${axis === 'chapters' ? 'selected' : ''}>Chapter sequence</option>`}
        <option value="readings" ${axis === 'readings' ? 'selected' : ''}>Saved reading history</option>
        ${journeys.map(journey => `<option value="process:${e(journey.id)}" ${axis === `process:${journey.id}` ? 'selected' : ''}>Process · ${e(journey.name || journey.id)}</option>`).join('')}
      </select></div>
      <p class="nl-order-note">${notes[axis] || 'Explicit process steps from a saved interpretation, separate from Matrix rites.'}</p>
      <div class="nl-timeline" aria-label="Reading sequence">
        ${frames.map((item, i) => `<button type="button" class="nl-step ${i === state.frame ? 'active' : ''} ${item.observed ? '' : 'unobserved'}" data-frame="${i}" aria-pressed="${i === state.frame}">
          <small>${e(item.label)}</small><strong>${e(item.title)}</strong><small>${item.observed ? item.demon_ids.length + ' demons' : 'No saved reading'}</small>
        </button>`).join('')}
      </div>
      ${frame ? `<article class="nl-frame"><span class="nl-kicker">${state.frame + 1} / ${frames.length} · ${e(frame.label)}</span>
        <h3>${e(frame.title)}</h3><div class="nl-chips">${frame.demon_ids.map(chip).join('')}</div>
        ${!frame.observed ? '<p class="nl-prose">No saved reading for this source yet.</p>' : ''}
        <div class="nl-actions">${activeRun ? paneButton(activeRun, 'Read this NUMO in panes ↗') : ''}
          ${hosts.some(host => host.id === frame.host_id) ? `<button type="button" class="nl-textbutton" data-run-host="${e(frame.host_id)}">${frame.observed ? 'Review a new run' : 'Review this reading'} ↗</button>` : ''}
        </div>
        ${(frame.observations || []).slice(0, 4).map(evidence).join('')}
        ${(frame.observations || []).length > 4 ? `<p class="nl-meta">${frame.observations.length} assignments in this reading. Open the full reading for every assignment and its evidence.</p>` : ''}
      </article>` : `<p class="nl-empty">${axis === 'chapters' ? 'No chapter sequence is catalogued. You can still look for saved reading history.' : 'No saved readings on this path yet.'}</p>`}
      ${frames.length ? matrixControls(observedIds.length) + heat + matrixLegend : ''}
    </div><aside class="nl-memory-path-map">
      ${diagram(frame?.demon_ids || [], frameRoutes(world, frame), frame ? `<strong>${frame.demon_ids.length} demons</strong> in this frame<br>${e(frame.title)}` : 'Select a frame to see its saved routes.')}
    </aside></div>`;
  }

  function openMemorySubject(mode, id) {
    const thinkerMode = mode === 'thinkers';
    if (!(thinkerMode ? thinkers : books).some(item => item.id === id)) return;
    const previousMode = state.mode;
    const key = thinkerMode ? 'thinker' : 'book';
    if (previousMode === mode && state[key] === id) return;
    state.mode = mode;
    state[key] = id;
    state.frame = 0;
    state.axis = thinkerMode ? 'publications' : 'chapters';
    state.memory.path = false;
    if (previousMode === mode) return renderContent();
    state.query = '';
    state.zone = null;
    Object.assign(state.memory, {coverage:'all',limit:40});
    render();
  }

  function openMemoryStudy() {
    const thinkerMode = state.mode === 'thinkers';
    const book = thinkerMode ? null : books.find(item => item.id === state.book);
    Object.assign(state.study, {
      thinker:thinkerMode ? state.thinker : book?.author_id || '',
      work:book?.id || '', level:'ALL', from:'', to:'', includeUndated:true,
      selection:null, pins:null, frame:0, compare:null, name:'', loaded:'',
      message:'', question:'', hostQuery:'', hostLimit:120, loadedComparison:null, loadedWorkIds:null,
    });
    state.mode = 'study';
    state.zone = null;
    state.query = '';
    render();
  }
  const correspondenceShelves=world.correspondence_chambers || [];
  const correspondenceById=new Map(correspondenceShelves.flatMap(shelf=>
    shelf.entries.map((entry,index)=>[entry.id,{shelf,entry,index}])));
  let claimsByPassage,passagesByDemon;

  function correspondenceClaims(id) {
    if (!claimsByPassage) {
      claimsByPassage=new Map();
      passagesByDemon=new Map();
      for (const demon of demons) for (const claim of demon.chamber?.hypotheses || []) {
        for (const trace of unique(claim.source_traces || [])) {
          if (!correspondenceById.has(trace)) continue;
          if (!claimsByPassage.has(trace)) claimsByPassage.set(trace,[]);
          if (!passagesByDemon.has(demon.id)) passagesByDemon.set(demon.id,new Set());
          claimsByPassage.get(trace).push({demon,claim});
          passagesByDemon.get(demon.id).add(trace);
        }
      }
    }
    return claimsByPassage.get(id) || [];
  }

  function relatedCards(id) {
    const related=new Map();
    for (const demonId of unique(correspondenceClaims(id).map(({demon})=>demon.id))) {
      for (const other of passagesByDemon.get(demonId) || []) {
        if (other===id) continue;
        if (!related.has(other)) related.set(other,[]);
        related.get(other).push(byId[demonId].name);
      }
    }
    return [...related].sort((a,b)=>b[1].length-a[1].length || correspondenceById.get(a[0]).entry.name.localeCompare(correspondenceById.get(b[0]).entry.name));
  }

  // The dealt decks and their chambers are projections of the same source IDs
  // and evidence as Advanced. A blank sigil has no inferred assignments.
  function instrumentThinker(id) {
    const canonical=world.instrument?.thinker_aliases?.[id] || id;
    const entry=thinkers.find(row=>row.id===canonical);
    if(!entry)return null;
    const override=world.instrument?.thinker_overrides?.[canonical];
    return override?{...entry,...override,id:canonical}:entry;
  }

  function instrumentSubjectEntity(subject=state.instrument.subject) {
    if(!subject)return null;
    const {kind,id}=subject;
    if(kind==='card' || kind==='skill'){
      const found=correspondenceById.get(id);
      return found?{kind:found.shelf.kind==='voice'?'skill':'card',id,...found}:null;
    }
    if(kind!=='book' && kind!=='thinker')return null;
    const entry=kind==='thinker'?instrumentThinker(id):books.find(row=>row.id===id);
    return entry?{kind,id:entry.id,entry}:null;
  }

  function instrumentCardFootprint(id) {
    const projected=world.instrument?.footprints?.[id];
    if(projected)return {
      demon_ids:projected.demon_ids || [],
      pencil_demon_ids:projected.pencil_demon_ids || [],
      chamber_demon_ids:projected.chamber_demon_ids || [],
      deposit_ids:projected.deposit_ids || [],
    };
    // The Advanced archive still has these exact citations in snapshots that
    // predate the instrument projection. Their authority is research pencil.
    return {demon_ids:[],pencil_demon_ids:unique(correspondenceClaims(id).map(({demon})=>demon.id)),chamber_demon_ids:[],deposit_ids:[]};
  }

  function instrumentSubjectEvidence(entity) {
    if(!entity)return {demon_ids:[],pencil_demon_ids:[],chamber_demon_ids:[],deposit_ids:[],records:[],zone_ids:[]};
    const {entry,kind,id}=entity;
    const card=kind==='card' || kind==='skill';
    const footprint=card?instrumentCardFootprint(id):{demon_ids:entry.demon_ids || [],pencil_demon_ids:[],chamber_demon_ids:[],deposit_ids:[]};
    const ids=new Set(footprint.deposit_ids);
    const workIds=new Set(kind==='book'?[id]:entry.book_ids || []);
    const records=[];
    const landed=new Set(footprint.demon_ids);
    const eligible=card?unique([...footprint.demon_ids,...footprint.chamber_demon_ids,...footprint.pencil_demon_ids]):Object.keys(world.instrument?.by_demon || {});
    for(const demonId of eligible){
      const demon=byId[demonId];
      const observations=card?new Set():new Set((demon?.observations || demon?.history || []).filter(row=>row.is_latest!==false && workIds.has(row.book_id)).map(row=>row.id));
      for(const record of world.instrument?.by_demon?.[demonId]?.deposits || []){
        if(record.status==='tombstoned')continue;
        const sameSubject=card?(ids.has(record.id) || record.card_id===id):
          record.kind==='reading'?(workIds.has(record.book_id) || observations.has(record.ref)):
          record.kind==='aq' && (workIds.has(record.work_id) || (record.reading_refs || []).some(ref=>observations.has(ref)));
        if(sameSubject){
          records.push(record);ids.add(record.id);
          if(record.status==='ink')landed.add(demonId);
        }
      }
    }
    records.sort((a,b)=>String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(a.id).localeCompare(String(b.id)));
    const demon_ids=[...landed];
    const chamber_demon_ids=footprint.chamber_demon_ids;
    const pencil_demon_ids=footprint.pencil_demon_ids.filter(demonId=>!landed.has(demonId));
    const zone_ids=unique([...demon_ids,...chamber_demon_ids,...pencil_demon_ids].flatMap(demonId=>byId[demonId]?zonePoles(byId[demonId]):[]));
    return {demon_ids,pencil_demon_ids,chamber_demon_ids,deposit_ids:[...ids],records,zone_ids};
  }

  function instrumentSubjectFootprint() {
    const {records,...footprint}=instrumentSubjectEvidence(instrumentSubjectEntity());
    return footprint;
  }

  const instrumentCardGlyphs={
    voice:'<path d="M0-4.4 3.6 0 0 4.4-3.6 0Z"/>',
    Intellect:'<path d="M0-4.4 3.6 0 0 4.4-3.6 0Z"/>',
    Psyche:'<path d="M-5 0Q0-5 5 0 0 5-5 0Z"/><circle r="1.15"/>',
    Physique:'<path d="M0 4.2-4-3.1H4Z"/>',
    Motorics:'<path d="M-3-3h6v6h-6Z"/><circle r=".6"/>',
    tarot:'<path d="M0-4.5v9m-4-7 8 5m0-5-8 5"/>',
    acephale:'<path d="M0-4.2 4 3.1H-4Z"/>',
  };

  function instrumentShelfKind(shelf) {
    if(shelf.kind==='voice')return 'voice';
    if(shelf.label==='Philosopher’s Tarot')return 'tarot';
    if(shelf.label==='Acéphalous Tarot')return 'acephale';
    return 'unknown';
  }

  function instrumentCardGlyph(shelf,entry,x,y) {
    const glyph=instrumentCardGlyphs[entry?.group] || instrumentCardGlyphs[instrumentShelfKind(shelf)] || '<circle r="3.2"/>';
    return `<g class="nl-ic-glyph" transform="translate(${x} ${y})">${glyph}</g>`;
  }

  function instrumentCardFrame(seed,x=2.5,y=2.5,w=59,h=95,r=5) {
    let n=2166136261;
    for(const ch of String(seed))n=Math.imul(n^ch.codePointAt(0),16777619);
    const wobble=()=>{n=Math.imul(n^n>>>15,2246822507);return ((n>>>0)/4294967296-.5)*.9;};
    const p=(a,b)=>`${(a+wobble()).toFixed(2)} ${(b+wobble()).toFixed(2)}`;
    return `M${p(x+r,y)}L${p(x+w-r,y)}Q${x+w} ${y} ${p(x+w,y+r)}L${p(x+w,y+h-r)}Q${x+w} ${y+h} ${p(x+w-r,y+h)}L${p(x+r,y+h)}Q${x} ${y+h} ${p(x,y+h-r)}L${p(x,y+r)}Q${x} ${y} ${p(x+r,y)}Z`;
  }

  function instrumentMiniMap(footprint,y=16,height=53) {
    const point=zone=>{
      const [x0,y0]=instrumentMap[zone];
      return [`${(32+(x0-236)*height/880).toFixed(2)}`,`${(y+y0*height/919).toFixed(2)}`];
    };
    const draw=(ids,style)=>ids.map(id=>{
      const poles=byId[id]?zonePoles(byId[id]):[];
      if(poles.length!==2)return '';
      const [[x1,y1],[x2,y2]]=poles.map(point);
      return `<line class="nl-ic-chord ${style}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }).join('');
    const dots=zones.map(zone=>{const [cx,cy]=point(zone);return `<circle class="nl-ic-dot" cx="${cx}" cy="${cy}" r="1.15"/>`;}).join('');
    return draw(footprint.pencil_demon_ids,'pencil')+draw(footprint.chamber_demon_ids,'chamber')+draw(footprint.demon_ids,'ink')+dots;
  }

  function instrumentCard(id,{portrait=false,fan=null}={}) {
    const found=correspondenceById.get(id);
    if(!found)return '';
    const {shelf,entry,index}=found;
    const fp=instrumentCardFootprint(id);
    const ink=fp.demon_ids.length?'ink':fp.chamber_demon_ids.length?'chamber':fp.pencil_demon_ids.length?'pencil':'dark';
    const number=String(entry.number ?? index+1).padStart(2,'0');
    const long=Math.max(...entry.name.split(/\s+/).map(word=>word.length))>11;
    const labelRise=fan?Math.min(30,Number(fan.drop)):0;
    const title=`<span class="nl-ic-title${long?' long':''}">${e(entry.name)}</span>`;
    const art=`<svg viewBox="0 0 64 100" aria-hidden="true" focusable="false">
      <path class="nl-ic-outline" d="${instrumentCardFrame(id)}"/>
      <text class="nl-ic-number" x="7" y="12">${e(number)}</text>${instrumentCardGlyph(shelf,entry,54,10)}
      ${instrumentMiniMap(fp,16,53-labelRise*.85)}<path class="nl-ic-rule" d="M14 ${72-labelRise*.9}H50"/>
    </svg>`;
    const cls=`nl-ic-card ${ink}${portrait?' nl-ic-portrait':''}`;
    if(portrait)return `<div class="${cls}" aria-hidden="true">${art}${title}</div>`;
    const kind=shelf.kind==='voice'?'skill':'card';
    const styles=fan?` style="--ic-turn:${fan.turn}deg;--ic-drop:${fan.drop}px;--ic-label-rise:${labelRise}px"`:'';
    const marker={pencil:', proposed connections only',ink:', inked connections',chamber:', chamber correspondence'}[ink] || '';
    return `<button type="button" class="${cls}" data-instrument-subject-kind="${kind}" data-instrument-subject="${e(id)}"${styles} aria-label="${e(number+' '+entry.name+(entry.subject?', '+entry.subject:'')+marker)}" title="${e(entry.name+(entry.subject?' · '+entry.subject:''))}">${art}${title}</button>`;
  }

  function instrumentDeckBar() {
    if(!correspondenceShelves.length)return '';
    const order=['tarot','voice','acephale'];
    const decks=[...correspondenceShelves].sort((a,b)=>(order.indexOf(instrumentShelfKind(a))+4)%4-(order.indexOf(instrumentShelfKind(b))+4)%4);
    return `<nav class="nl-ic-decks" aria-label="Correspondence decks">${decks.map(shelf=>{
      const footprints=shelf.entries.map(entry=>instrumentCardFootprint(entry.id));
      const connected=footprints.filter(fp=>fp.demon_ids.length).length;
      const linked=footprints.filter(fp=>fp.chamber_demon_ids.length).length;
      const pencilled=footprints.filter(fp=>!fp.demon_ids.length && fp.pencil_demon_ids.length).length;
      const frames=[2,1,0].map(i=>`<path class="nl-ic-outline${i?' back':''}" d="${instrumentCardFrame(shelf.id+i,1.5+i*2.3,1.5+(2-i)*1.4,23,38,3)}"/>`).join('');
      return `<button type="button" class="nl-ic-deck" data-instrument-deck="${e(shelf.id)}" aria-expanded="${state.instrument.deck===shelf.id}"><svg viewBox="0 0 30 44" aria-hidden="true" focusable="false">${frames}${instrumentCardGlyph(shelf,null,13.5,22)}</svg><span><span class="nl-ic-deck-label">${e(shelf.label)}</span><small>${shelf.entries.length}${linked?' · '+linked+' linked':''}${connected?' · '+connected+' inked':''}${pencilled?' · '+pencilled+' in pencil':''}</small></span></button>`;
    }).join('')}</nav>`;
  }

  function updateInstrumentSpreadCaption(target) {
    const caption=$('[data-instrument-deck-caption]');
    if(!caption)return;
    const id=target?.closest?.('.nl-ic-spread-cards [data-instrument-subject]')?.dataset.instrumentSubject;
    const found=correspondenceById.get(id);
    caption.textContent=found?[found.entry.name,found.entry.subject].filter(Boolean).join(' · '):caption.dataset.empty;
  }

  function instrumentSpread() {
    const shelf=correspondenceShelves.find(row=>row.id===state.instrument.deck);
    if(!shelf)return '';
    const n=shelf.entries.length;
    const groups=n>24?unique(shelf.entries.map(entry=>entry.group)):[];
    const group=groups.includes(state.instrument.deckGroup)?state.instrument.deckGroup:groups[0];
    const cards=group?shelf.entries.filter(entry=>entry.group===group):shelf.entries;
    const arc=n<=24,mid=(cards.length-1)/2;
    const fp=shelf.entries.map(entry=>instrumentCardFootprint(entry.id));
    const ink=fp.filter(row=>row.demon_ids.length).length;
    const linked=fp.filter(row=>row.chamber_demon_ids.length).length;
    const pencil=fp.filter(row=>!row.demon_ids.length && row.pencil_demon_ids.length).length;
    const unit=shelf.kind==='voice'?'skill':'card';
    return `<section class="nl-ic-spread" aria-label="${e(shelf.label)} deck">
      <header><h2>${e(shelf.label)}</h2><span>${n} ${unit}${n===1?'':'s'}${linked?' · '+linked+' linked':''} · ${ink} inked${pencil?' · '+pencil+' in pencil':''}</span>
      <p data-instrument-deck-caption data-empty="Open any ${unit} to enter its chamber.">Open any ${unit} to enter its chamber.</p><button type="button" class="nl-ic-link" data-instrument-deck-close aria-label="Close deck">Close</button></header>
      ${groups.length>1?`<div class="nl-ic-groups" role="group" aria-label="Card suits">${groups.map(name=>`<button type="button" data-instrument-deck-group="${e(name)}" aria-pressed="${name===group}">${e(name.replace(/^Suit of /i,''))}</button>`).join('')}</div>`:''}
      <div class="nl-ic-spread-cards ${arc?'arc':'flat'}">${cards.map((entry,i)=>instrumentCard(entry.id,{fan:arc?{turn:Math.max(-12,Math.min(12,(i-mid)*1.15)).toFixed(2),drop:(Math.pow(i-mid,2)*.3).toFixed(1)}:null})).join('')}</div>
    </section>`;
  }

  function instrumentMatchingCardIds(demonIds,except='') {
    const selected=new Set(demonIds);
    if(!selected.size)return [];
    return [...correspondenceById.keys()].filter(id=>{
      if(id===except)return false;
      const fp=instrumentCardFootprint(id);
      return [...fp.demon_ids,...fp.chamber_demon_ids,...fp.pencil_demon_ids].some(demonId=>selected.has(demonId));
    });
  }

  function instrumentDemonCards(demonId) {
    const ids=instrumentMatchingCardIds([demonId]);
    return ids.length?`<div class="nl-ic-row" aria-label="Cards and skills citing this demon">${ids.map(id=>instrumentCard(id)).join('')}</div>`:'';
  }

  function instrumentSubjectProposal(cardId) {
    if(data.instrument_write===false || !instrumentData.by_demon)return '';
    const proposals=instrumentAllDeposits.filter(row=>row.kind==='proposal' && row.card_id===cardId && row.status==='pencil');
    const active=state.instrument.proposing===cardId;
    return `<div class="penrow">
      ${active?`<span class="ptag" role="status">Choose two zones on the map</span><button type="button" class="pbtn ghost" data-instrument-proposal-cancel>Cancel pairing</button>`:`<button type="button" class="pbtn" data-instrument-propose="${e(cardId)}">Propose a demon in pencil</button><span class="ptag">Then choose two zones on the map</span>`}
      ${proposals.map(row=>`<div class="penrow"><span class="ptag">${e(byId[row.demon_id]?.name || row.demon_id)} · Pencil</span><button type="button" class="pbtn" data-instrument-ink="${e(row.id)}">Ink it</button><button type="button" class="pbtn ghost" data-instrument-erase="${e(row.id)}">Erase</button></div>`).join('')}
    </div>`;
  }

  function cardChamberLinks(records, inInstrument) {
    const ordered=[...records].sort((a,b)=>Number(a.relation==='echo')-Number(b.relation==='echo'));
    return ordered.map(record=>{
      const demon=byId[record.demon_id];
      if(!demon)return '';
      const label=`${demon.name} · ${demon.net_span}`;
      const link=inInstrument?instrumentSubjectLink('demon',demon.id,label):
        `<button type="button" class="nl-textbutton" data-correspondence-demon="${e(demon.id)}">${e(label)}</button>`;
      return `<article class="nl-card-chamber-link"><header>${link}<span>${record.relation==='echo'?'Echo':'Primary correspondence'}</span></header>
        ${record.note?`<p>${e(record.note)}</p>`:''}
        ${record.source_title?`<small>${e(record.source_title)}${record.audit_section?' · '+e(record.audit_section):''}</small>`:''}</article>`;
    }).join('');
  }

  function instrumentSubjectReadout() {
    const entity=instrumentSubjectEntity();
    if(!entity)return '';
    const {kind,id,entry,shelf,index}=entity;
    const card=kind==='card' || kind==='skill';
    const fp=instrumentSubjectEvidence(entity);
    const demonIds=unique([...fp.demon_ids,...fp.chamber_demon_ids,...fp.pencil_demon_ids]);
    const title=card || kind==='thinker'?entry.name:entry.title;
    const author=kind==='book'?instrumentThinker(entry.author_id):null;
    const workList=kind==='thinker'?books.filter(row=>(entry.book_ids || []).includes(row.id)):[];
    const label=card?`${shelf.label} · ${entry.group} · ${String(entry.number ?? index+1).padStart(2,'0')}`:
      kind==='thinker'?`Thinker · ${workList.length} work${workList.length===1?'':'s'} in CARE`:'Book';
    const note=card?entry.subject || '':kind==='book'?[author?.name || entry.author,entry.date_label || yearLabel(entry.source_year ?? entry.year)].filter(Boolean).join(' · '):'';
    const demonsHere=demonIds.length?instrumentDemonRows(demonIds.map(demonId=>byId[demonId]).filter(Boolean),
      demonId=>fp.records.filter(row=>row.demon_id===demonId)):'<p class="empty-p">No demon connections are filed here yet.</p>';
    const where=`<div class="nl-ic-location bigcard">${card?instrumentCard(id,{portrait:true}):`<svg class="nl-ic-sigil" viewBox="8 8 48 82" role="img" aria-label="Recorded Numogram footprint">${instrumentMiniMap(fp,10,74)}</svg>`}<div><p class="lbl">${card?kind==='skill'?'Under this skill':'Under this card':'Demons in these readings'}</p>${demonsHere}</div></div>`;
    const sourceRefs=card?(entry.source_refs || [id]):[];
    const frozen=card?`<details class="nl-ic-passage"><summary>Card source · ${e(entry.source_title || shelf.title)}</summary>${entry.text?`<p>${e(entry.text)}</p>`:''}<p class="nl-ic-muted">${e(entry.authority_boundary || shelf.authority_boundary)}</p>${sourceRefs.map(ref=>`<code>${e(ref)}</code>`).join('')}</details>`:'';
    const archived=card?`<button type="button" class="nl-ic-link" data-correspondence="${e(id)}">Full ${kind} archive ↗</button>`:
      `<button type="button" class="nl-ic-link" data-memory-${kind}="${e(id)}">Open reading path ↗</button>`;
    const library=kind==='book'?`<button type="button" class="nl-ic-link" data-open-work="${e(id)}">Open book in CARE ↗</button>`:'';
    const chamberLinks=cardChamberLinks(fp.records.filter(row=>row.status==='chamber'),true);
    const savedRecords=fp.records.filter(row=>row.status!=='chamber');
    const recordList=savedRecords.length?instrumentDepositList(savedRecords):`<p class="nl-ic-muted">No ${card?'deposits':'current NUMO readings'} are filed here.</p>`;
    const related=instrumentMatchingCardIds(demonIds,id);
    const relatedCardsMarkup=related.length?`<p class="nl-ic-muted">Cards and skills linked to the same demons</p><div class="nl-ic-row">${related.map(otherId=>instrumentCard(otherId)).join('')}</div>`:'';
    const works=workList.length?`<ul class="nl-ic-chords">${workList.map(work=>`<li>${instrumentSubjectLink('book',work.id,work.title)}<span>${(work.demon_ids || []).length} demon${(work.demon_ids || []).length===1?'':'s'}</span></li>`).join('')}</ul>`:'';
    const neighbours=author?`<p class="nl-ic-related">${instrumentSubjectLink('thinker',author.id,author.name)}</p>`:'';
    const otherReadings=card?demonIds.flatMap(demonId=>instrumentDeposits(demonId).filter(row=>row.system==='care' && row.status==='ink')):[];
    const proposal=card?instrumentSubjectProposal(id):'';
    return instrumentIdentity(label,title,note)+instrumentRegion('',where)
      +(chamberLinks?instrumentRegion('Chamber correspondences',chamberLinks):'')
      +(proposal?instrumentRegion('',proposal):'')
      +(savedRecords.length?instrumentRegion('Consilience · independent systems landing here',instrumentConsilience(savedRecords.concat(otherReadings))):'')
      +(!chamberLinks || savedRecords.length?instrumentRegion(`${card?(kind==='skill'?'This skill’s deposits':'This card’s deposits'):'Deposits'} · ${savedRecords.length}`,recordList):'')
      +(otherReadings.length?instrumentRegion(`Readings in the same chambers · ${otherReadings.length}`,instrumentDepositList(penNewestDeposits(otherReadings))):'')
      +instrumentRegion('Also here',neighbours+works+relatedCardsMarkup+frozen+`<div class="nl-ic-actions">${library}${archived}</div>`);
  }

  const deckDesigns={
    Intellect:['ink','<path d="M0-26 8-8 27 0 8 8 0 26-8 8-27 0-8-8Z"/><path d="M0-15 15 0 0 15-15 0Z"/><circle r="4"/>'],
    Psyche:['iris','<path d="M-27 0Q0-33 27 0 0 33-27 0Z"/><circle r="10"/><circle r="4"/><path d="M0-28v10m0 36v10"/>'],
    Physique:['ember','<path d="M0-28c13 14 23 27 16 40C9 30-14 27-18 11c-3-11 8-28 18-39Z"/><path d="M0-14C8-5 12 0 10 9 7 21-9 20-10 9-11 2-4-10 0-14Z"/><circle cy="10" r="3"/>'],
    Motorics:['verdigris','<path d="M-17-17H17V17H-17ZM0-27 27 0 0 27-27 0Z"/><path d="M-18-18 18 18m0-36-36 36"/><circle r="5"/>'],
    'Major Arcana':['gold','<circle r="19"/><path d="M0-28 23 14H-23ZM0 28-23-14H23Z"/><circle r="6"/>'],
    'Suit of Torches':['ember','<path d="M1-28C5-8 18-10 17 6 16 21-17 23-16 6-15-2-8-5-8-14c6 3 7 8 9 8 4-6 4-15 0-22Z"/><path d="M-7 20h14m-5 2v11m-4-11v11"/>'],
    'Suit of Wounds':['iris','<path d="M-23-15h46c0 13-10 23-23 23S-23-2-23-15ZM0 8v15m-13 1h26"/><path d="M0-30c8 7 7 13 0 13s-8-6 0-13Z"/>'],
    'Suit of Daggers':['ink','<path d="M0-30 6-18 3 12H-3L-6-18ZM-13 12h26M0 12v17m-5 0h10"/><path d="M-19-10-13-4m32-6-6 6m-32 14 6-6m32 6-6-6"/>'],
    'Suit of Coins':['verdigris','<circle r="25"/><circle r="19"/><path d="M0-15 15 0 0 15-15 0Z"/><circle r="5"/>'],
  };

  function deckCard(id,{via=[],portrait=false}={}) {
    const {shelf,entry,index}=correspondenceById.get(id);
    const suitArt={'Suit of Wands':'Suit of Torches','Suit of Cups':'Suit of Wounds','Suit of Swords':'Suit of Daggers','Suit of Pentacles':'Suit of Coins'};
    const [tone,mark]=deckDesigns[suitArt[entry.group] || entry.group] || deckDesigns['Major Arcana'];
    const number=String(entry.number ?? index+1).padStart(2,'0');
    const angle=(index*29)%180,sides=5+index%4;
    const vertices=Array.from({length:sides},(_,i)=>{
      const theta=i/sides*Math.PI*2;
      return `${(Math.cos(theta)*34).toFixed(2)},${(Math.sin(theta)*34).toFixed(2)}`;
    }).join(' ');
    const art=`<svg viewBox="0 0 100 103" aria-hidden="true" focusable="false">
      <g transform="translate(50 51.5)" fill="none" stroke="currentColor" stroke-width=".8" stroke-linejoin="round" stroke-linecap="round">
        <circle r="37.5" opacity=".35"/><circle r="42" stroke-dasharray="1 5" opacity=".5"/>
        <path d="M-47 0h10m74 0h10M0-47v10m0 74v10" opacity=".65"/>
        <polygon points="${vertices}" transform="rotate(${angle})" opacity=".45"/>
        <path d="M-31-31 31 31m0-62-62 62" transform="rotate(${angle})" opacity=".23"/>
        <g stroke-width="1.2">${mark}</g>
        <path d="M0-49v4m0 90v4m-49-49h4m90 0h4" opacity=".9"/>
      </g>
    </svg>`;
    const claims=correspondenceClaims(id);
    const linked=instrumentCardFootprint(id).chamber_demon_ids.length;
    const interior=`<span class="nl-deck-card-index"><span>${e(number)}</span><span>${e(entry.group.replace('Suit of ',''))}</span></span>
      <span class="nl-deck-glyph">${art}</span>
      <span class="nl-deck-card-title"><strong${entry.name.split(/\s+/).some(word=>word.length>11)?' class="nl-deck-long-word"':''}>${e(entry.name)}</strong>${entry.subject?`<small>${e(entry.subject)}</small>`:''}</span>
      <span class="nl-deck-card-foot">${via.length?e(shelf.label):linked?`${linked} chamber ${linked===1?'link':'links'}`:claims.length?`${claims.length} ${claims.length===1?'proposal':'proposals'}`:'<span aria-hidden="true">◇</span>'}</span>`;
    if (portrait) return `<div class="nl-deck-card ${tone}" aria-hidden="true">${interior}</div>`;
    return `<button type="button" class="nl-deck-card ${tone}" data-correspondence="${e(id)}" aria-label="Open ${e(entry.name)}${via.length?` · via ${e(via.join(', '))}`:''}">${interior}${via.length?`<span class="nl-deck-card-via">Via ${e(via.join(' · '))}</span>`:''}</button>`;
  }

  function demonCardShelf(demon) {
    const ids=instrumentMatchingCardIds([demon.id]);
    if (!ids.length) return '';
    return `<details class="nl-demon-card-shelf" ${ids.length<=8?'open':''}>
      <summary>Cards & skills · ${ids.length} linked</summary>
      <div class="nl-deck-grid compact">${ids.map(id=>deckCard(id)).join('')}</div>
    </details>`;
  }

  function deckGallery(shelf) {
    const {query,group}=state.voices;
    const allGroups=unique(shelf.entries.map(entry=>entry.group));
    const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
    const groups=new Map();
    for (const entry of shelf.entries) {
      if (group && entry.group!==group) continue;
      const text=normalize([entry.name,entry.group,entry.subject,entry.number].join(' '));
      if (!terms.every(term=>text.includes(term))) continue;
      if (!groups.has(entry.group)) groups.set(entry.group,[]);
      groups.get(entry.group).push(entry);
    }
    const count=[...groups.values()].reduce((total,entries)=>total+entries.length,0);
    return `<section class="nl-decks" aria-label="Tarot and voices decks">
      <header class="nl-deck-masthead" tabindex="-1" data-deck-focus>
        <div><span class="nl-kicker">NUMO · The correspondence archive</span><h2>Tarot &amp; voices</h2><p>Open a card to read its passage and follow its demon connections.</p></div>
        <div class="nl-deck-masthead-mark" aria-hidden="true"><span>◇</span><span>✧</span><span>◇</span></div>
      </header>
      <nav class="nl-deck-shelves" aria-label="Correspondence collection">
        ${correspondenceShelves.map((item,index)=>`<button type="button" data-correspondence-shelf="${e(item.id)}" aria-label="Browse ${e(item.label)}" aria-pressed="${item.id===shelf.id}"><span aria-hidden="true">${['◇','✧','△'][index%3]}</span><span><strong>${e(item.label)}</strong><small>${item.entries.length} ${item.kind==='voice'?'skills':'cards'}</small></span></button>`).join('')}
      </nav>
      <div class="nl-deck-toolbar">
        <div><h3>${e(shelf.label)}</h3><p aria-live="polite">${count} of ${shelf.entries.length} ${shelf.kind==='voice'?'skills':'cards'}</p></div>
        <label class="nl-memory-search"><span aria-hidden="true">⌕</span><input type="text" aria-label="Find a card or skill" placeholder="Find a card or skill…" value="${e(query)}"></label>
      </div>
      ${allGroups.length>1?`<div class="nl-deck-filters" role="group" aria-label="Filter by ${shelf.kind==='voice'?'skill house':'suit'}">${['',...allGroups].map(name=>`<button type="button" data-correspondence-group="${e(name)}" aria-label="${e(name || 'Full deck')}" aria-pressed="${name===group}">${e(name || 'Full deck')}</button>`).join('')}</div>`:''}
      ${[...groups].map(([name,entries])=>`<section class="nl-deck-spread"><div class="nl-deck-spread-head"><h4>${e(name)}</h4><span>${entries.length} ${entries.length===1?'chamber':'chambers'}</span></div><div class="nl-deck-grid">${entries.map(entry=>deckCard(entry.id)).join('')}</div></section>`).join('') || '<p class="nl-empty">No matching chambers in this collection.</p>'}
    </section>`;
  }

  function skillsRoom() {
    const {shelf:shelfId,id}=state.voices;
    const shelf=correspondenceShelves.find(item=>item.id===shelfId) || correspondenceShelves[0];
    if (!shelf) return '<p class="nl-empty">Frozen Tarot and skill passages will appear here when they are available in the research archive.</p>';
    state.voices.shelf=shelf.id;
    const entry=shelf.entries.find(item=>item.id===id);
    if (!entry) return deckGallery(shelf);
    const claims=correspondenceClaims(entry.id);
    const footprint=instrumentSubjectEvidence({entry,id:entry.id,kind:shelf.kind==='voice'?'skill':'card'});
    const chamberLinks=cardChamberLinks(footprint.records.filter(row=>row.status==='chamber'),false);
    const related=new Map(relatedCards(entry.id));
    for(const demonId of footprint.chamber_demon_ids){
      for(const id of instrumentMatchingCardIds([demonId],entry.id)){
        related.set(id,unique([...(related.get(id) || []),byId[demonId]?.name]));
      }
    }
    const claimCard=({demon,claim})=>`<article class="nl-voice-claim">
      <span class="nl-kicker">${e((claim.status || 'Research proposal').replaceAll('_',' '))}${claim.confidence?' · '+e(claim.confidence):''}</span>
      <h4>${e(claim.object_label || 'Recorded proposal')}</h4>
      <p class="nl-prose">${e(claim.statement)}</p>
      <button class="nl-textbutton" data-correspondence-demon="${e(demon.id)}">${e(demon.name)} · ${e(demon.net_span)} ↗</button>
      <details><summary>Support, objections and review</summary>
        ${(claim.evidence_for || []).map(text=>`<p class="nl-meta">Support · ${e(text)}</p>`).join('')}
        ${(claim.evidence_against || []).map(text=>`<p class="nl-meta">Objection · ${e(text)}</p>`).join('')}
        ${claim.falsification_test?`<p class="nl-meta">Test · ${e(claim.falsification_test)}</p>`:''}
        ${claim.latest_review?.verdict?`<p class="nl-meta">Review · ${e(claim.latest_review.verdict)} · ${e(claim.latest_review.rationale)}</p>`:''}
        <pre>${e((claim.source_traces || []).join('\n'))}</pre>
      </details>
    </article>`;
    return `<section class="nl-decks nl-voice-chamber" aria-label="${shelf.kind==='voice'?'Skill':'Card'} chamber">
      <button class="nl-textbutton nl-deck-back" data-correspondence-back>← ${e(shelf.label)} deck</button>
      <header class="nl-memory-hero nl-voice-hero" tabindex="-1" data-deck-focus>
        <div class="nl-voice-portrait">${deckCard(entry.id,{portrait:true})}</div>
        <div><span class="nl-kicker">${shelf.kind==='voice'?'Skill':'Card'} chamber · ${e(entry.group)}${entry.number!=null?' / '+e(entry.number):''}</span>
          <h2>${e(entry.name)}</h2><p class="nl-memory-byline">${entry.subject?e(entry.subject)+' · ':''}${e(shelf.label)}</p>
          <p class="nl-deck-evidence-count">${footprint.chamber_demon_ids.length} chamber links · ${claims.length} saved ${claims.length===1?'proposal':'proposals'} · ${related.size} related ${related.size===1?'chamber':'chambers'}</p>
        </div>
      </header>
      <div class="nl-memory-ledgers paired">
        <section class="nl-memory-panel nl-voice-source"><span class="nl-kicker">Card source</span><h3>${e(entry.source_title || shelf.title)}</h3>
          <p class="nl-meta">${e(entry.authority_boundary || shelf.authority_boundary)}</p>${entry.text?`<p class="nl-prose">${e(entry.text)}</p>`:''}${(entry.source_refs || [entry.id]).map(ref=>`<code>${e(ref)}</code>`).join('')}
        </section>
        <section class="nl-memory-panel"><span class="nl-kicker">${claims.length} saved ${claims.length===1?'proposal':'proposals'}</span><h3>Demon connections</h3>
          ${chamberLinks}${claims.map(claimCard).join('') || (chamberLinks?'':'<p class="nl-memory-empty">No saved demon connections.</p>')}
        </section>
      </div>
      <section class="nl-deck-related">
        <div class="nl-deck-spread-head"><h3>Related cards &amp; skills</h3><span>${related.size} connected</span></div>
        ${related.size?`<div class="nl-deck-grid compact">${[...related].map(([other,via])=>deckCard(other,{via})).join('')}</div>`:'<p class="nl-memory-empty">Other cards will appear when they are linked to a shared demon.</p>'}
      </section>
    </section>`;
  }

  function focusDeck(target) {
    frameWindow?.requestAnimationFrame?.(()=>{
      const item=target?[...root.querySelectorAll('[data-correspondence]')].find(button=>button.dataset.correspondence===target):null;
      const focus=item || $('[data-deck-focus]');
      focus?.focus({preventScroll:true});
      focus?.scrollIntoView({block:'nearest',inline:'nearest'});
    });
  }

  function selectCorrespondenceShelf(id) {
    if (!correspondenceShelves.some(shelf=>shelf.id===id)) return;
    Object.assign(state.voices,{shelf:id,id:'',query:'',group:''});
    renderContent();
  }

  function openCorrespondence(id) {
    const found=correspondenceById.get(id);
    if (!found) return;
    const sameMode=state.mode==='skills';
    if (!sameMode || state.voices.shelf!==found.shelf.id) Object.assign(state.voices,{query:'',group:''});
    Object.assign(state.voices,{shelf:found.shelf.id,id});
    state.mode='skills';
    if (sameMode) renderContent();else render();
    focusDeck();
  }

  function runReviewNotes(run) {
    const notes=run.review_notes || [];
    if(!notes.length)return '';
    return `<details class="nl-review-notes" aria-label="Review notes for ${e(run.host_title || run.id)}"><summary>Review notes · ${notes.length}</summary>${notes.map(note=>`<div><p class="nl-prose">${e(note.note)}</p><p class="nl-meta">${e(String(note.status || '').replaceAll('-',' '))}${note.reviewer?' · '+e(note.reviewer):''}</p>${note.evidence?.length?`<details><summary>Supporting passages · ${note.evidence.length}</summary>${note.evidence.map(source=>`<p class="nl-meta">${e(source.source_file || 'Preserved response')} · lines ${e(source.line_start)}–${e(source.line_end)}</p><pre>${e(source.quote || '')}</pre>`).join('')}</details>`:''}</div>`).join('')}</details>`;
  }
  function savedRuns() {
    const q=state.query.toLowerCase().trim();
    const selected=runs.filter(r=>{
      const ds=r.demon_ids || unique(demons.filter(d=>(d.history || d.observations || []).some(o=>o.run_id===r.id)).map(d=>d.id));
      return (state.history || r.is_latest!==false) && `${r.host_title} ${r.title || r.book_title || ''} ${r.author} ${r.host_id} ${r.id} ${r.model || ''} ${ds.map(id=>byId[id]?.name || id).join(' ')}`.toLowerCase().includes(q);
    }).sort((a,b)=>String(b.date || '').localeCompare(String(a.date || '')));
    const pages=Math.max(1,Math.ceil(selected.length/18));state.page=Math.max(0,Math.min(state.page,pages-1));
    return `<div class="nl-section-head"><h2>Saved encounters</h2><span aria-live="polite">${selected.length} readings</span></div><div class="nl-runs">${selected.slice(state.page*18,(state.page+1)*18).map(r=>{const ds=r.demon_ids || unique(demons.filter(d=>(d.history || d.observations || []).some(o=>o.run_id===r.id)).map(d=>d.id));return `<article class="nl-run"><span class="nl-kicker">${e(r.host_level || r.host_type || r.host_id?.split('_')[0] || 'NUMO')} · ${e(r.version || '')} · ${r.is_latest===false?'Earlier saved version':'Current reading'}</span><h2>${e(r.host_title || r.title || r.book_title || r.host_id)}</h2><p class="nl-meta">${e(r.author || '')}<br>${e(dateLabel(r.date))}<br>${e(r.model || 'Model not recorded')}</p>${runReviewNotes(r)}<div class="nl-chips">${ds.slice(0,6).map(chip).join('')}${ds.length>6?`<span class="nl-meta">+${ds.length-6}</span>`:''}</div><div class="nl-run-foot">${paneButton(r.id)}${hosts.some(h=>h.id===(r.catalog_host_id || r.host_id))?`<button class="nl-textbutton" data-run-host="${e(r.catalog_host_id || r.host_id)}">Run again ↗</button>`:''}</div></article>`;}).join('') || '<p class="nl-empty">No saved readings match. Try a demon, book, or thinker.</p>'}</div>${pages>1?`<div class="nl-pager"><button class="nl-button" data-page="${state.page-1}" ${state.page===0?'disabled':''}>← Previous</button><span>${state.page+1} / ${pages}</span><button class="nl-button" data-page="${state.page+1}" ${state.page===pages-1?'disabled':''}>Next →</button></div>`:''}`;
  }
  const aqLayer=world.aq || {};
  const aqLabels={work:'Work',care_unit:'CARE unit',care_item:'CARE item',authorized_phrase:'Saved phrase'};
  const aqEmpty=()=>({query:'',source_type:'',demon_id:'',offset:0,zone:null});
  state.aq={...aqEmpty(),record:'',...(saved.aq || {}),...(aqLayer.search?.request || {})};
  if(state.mode==='aq' && state.zone!==9)state.zone=state.aq.zone;
  function aqCard(record) {
    const links=(record.placements || []).filter(link=>byId[link.demon_id]);
    const title=record.text || record.source_id;
    const pin=record.provenance?.published_source_pin;
    return `<article class="nl-aq-result">
      <div class="nl-aq-address"><span class="nl-kicker">AQ total</span><strong>${e(record.aq_total)}</strong><span>${e(record.zone_label || `Zone ${record.zone}`)}</span></div>
      <div class="nl-aq-result-copy">
        <p class="nl-kicker">${e(aqLabels[record.source_type] || record.source_type)}${record.work_title && record.work_title!==title?` / ${e(record.work_title)}`:''}</p>
        <h3>${e(title)}${record.text_truncated?'…':''}</h3>
        ${record.author?`<p class="nl-meta">${e(record.author)}</p>`:''}
        <div class="nl-aq-card-links"><button class="nl-textbutton" data-aq-record="${e(record.id)}" aria-pressed="${state.aq.record===record.id}">${state.aq.record===record.id?'On the map':'Locate on map'} ↗</button>${record.url?`<button type="button" class="nl-textbutton" data-aq-open-source="${e(record.id)}" data-aq-total="${e(record.aq_total)}">Open source in CARE →</button>`:''}<button type="button" class="nl-textbutton" data-aq-open-index="${e(record.aq_total)}">Exact number index →</button></div>
        <details><summary>${links.length?'Shared-source evidence':'Source and calculation'}</summary>
          <p class="nl-meta">${e(record.source_id)} · ${e(record.rules_version || 'AQ')} · Digital reduction ${e(record.digital_reduction)}</p>
          ${pin?.revision_id?`<p class="nl-meta">Published source revision ${e(pin.revision_id)}</p>`:''}
          ${links.length?`<p class="nl-meta">These saved NUMO readings cite the same source ID.</p>${links.slice(0,12).map(link=>`<div class="nl-aq-evidence">${chip(link.demon_id)} ${paneButton(link.run_id,'Open saved reading ↗')}</div>`).join('')}${links.length>12?`<p class="nl-meta">${links.length-12} additional citations</p>`:''}`:'<p class="nl-meta">No current saved demon reading cites this AQ source.</p>'}
        </details>
      </div>
    </article>`;
  }
  function aqRoom() {
    const search=aqLayer.search, s=state.aq;
    const filtered=state.zone!==9 && search && ['query','zone','source_type','demon_id','offset'].every(key=>s[key]===search.request?.[key]);
    const records=state.zone===9?[]:filtered?search.records || []:aqLayer.records || [];
    const selected=records.find(record=>record.id===s.record);
    const caption=selected?`<strong>AQ ${e(selected.aq_total)}</strong> · Zone ${e(selected.zone_label ?? selected.zone)} · reduction ${e(selected.digital_reduction)}`
      :state.zone===9?'Reduction 9 deposits in Zone 0.':state.zone!==null?`<strong>Zone ${state.zone}</strong> · Browse its saved AQ calculations.`:'Choose a zone or locate a result to see its calculated address.';
    const unavailable=filtered?search.status!=='ok':!aqLayer.available;
    const aqStatus=filtered?search.status:aqLayer.status;
    const notice=aqStatus==='interrupted'?'This AQ lookup took too long. Try an exact total or add a zone or source type.':aqStatus==='empty'?'No saved AQ calculations are available yet.':'The saved AQ index is currently unavailable. Try refreshing or searching again.';
    return `<section class="nl-aq-room" aria-labelledby="nl-aq-title">
      <div class="nl-room-heading"><span class="nl-kicker">Alphanumeric Qabbala / Saved evidence</span><h1 id="nl-aq-title">AQ traces</h1><p>Look up a number or a passage and see its calculated zone. When a saved NUMO reading cites the same source, follow the evidence into its demon chamber.</p></div>
      <div class="nl-aq-layout"><div class="nl-aq-list">
        <form class="nl-aq-form">
          <label>Text, source ID or exact total<input aria-label="Search saved AQ" maxlength="240" name="query" placeholder="A phrase, source ID or AQ 333…" value="${e(s.query)}"></label>
          <label>Source type<select aria-label="AQ source type" name="source_type"><option value="">All sources</option>${(aqLayer.source_types || []).map(type=>`<option value="${e(type)}" ${s.source_type===type?'selected':''}>${e(aqLabels[type] || type)}</option>`).join('')}</select></label>
          <button class="nl-button primary" type="submit">Search saved AQ →</button>
        </form>
        <div class="nl-aq-filters">${s.demon_id?`<button class="nl-button" data-aq-clear-demon>Shared with ${e(byId[s.demon_id]?.name || s.demon_id)} ×</button>`:''}${state.zone!==null?`<button class="nl-button" data-clear-zone>Zone ${state.zone} ×</button>`:''}${(s.query || s.source_type || s.demon_id || state.zone!==null)?'<button class="nl-textbutton" data-aq-reset>Clear filters</button>':''}</div>
        <div class="nl-aq-results-head"><span class="nl-kicker">${state.zone===9?'Zone 9 / Plex':filtered?'Search results':'Across the zones'}</span><span class="nl-meta" role="status">${filtered && !unavailable && records.length?`${s.offset+1}–${s.offset+records.length} shown`:!filtered && aqLayer.record_count?`${Number(aqLayer.record_count).toLocaleString('en-GB')} saved calculations`:''}</span></div>
        ${state.zone===9?'<div class="nl-aq-empty"><p>AQ places digital reduction 9 at Zone 0.</p><button class="nl-textbutton" data-zone="0">Browse Zone 0 →</button></div>':unavailable?`<div class="nl-aq-empty" role="status">${notice}</div>`:records.length?records.map(aqCard).join(''):'<div class="nl-aq-empty">No saved calculations match these filters.</div>'}
        ${filtered && (s.offset || search.has_more)?`<div class="nl-pager"><button class="nl-button" data-aq-page="${Math.max(0,s.offset-search.limit)}" ${!s.offset?'disabled':''}>← Previous</button><button class="nl-button" data-aq-page="${s.offset+search.limit}" ${!search.has_more?'disabled':''}>Next →</button></div>`:''}
      </div><aside class="nl-aq-map" aria-label="AQ zone map" tabindex="-1">${diagram([],[],caption,false,selected?{zone_ids:[selected.zone]}:null)}
        ${zonePicker('Browse AQ by zone')}<p class="nl-meta">Each result has a calculated address. A demon link means its saved reading cites that result’s source ID.</p>
        <button type="button" class="nl-textbutton" data-aq-open-index="">Open the full AQ number index →</button>
      </aside></div>
    </section>`;
  }
  function searchAQ(changes={}) {
    state.aq={...state.aq,offset:0,record:'',...changes};
    const {query,zone,source_type,demon_id,offset}=state.aq;
    state.mode='aq';
    state.zone=zone;
    emit('aq_search',{query,zone,source_type,demon_id,offset});
  }
  function selectZone(zone) {
    const next=state.zone===zone?null:zone;
    if(state.mode==='aq'){
      if(next===9){state.zone=9;state.aq.record='';renderContent();return;}
      searchAQ({zone:next});return;
    }
    state.zone=next;
    renderContent();
  }
  function renderContent() {
    const content=$('[data-content]');
    stopAQObserver?.();
    if(mapDrag && mapSpec(mapDrag.svg)===mapSpecs.instrument)mapDrag=null;
    const previousPen=state.mode==='instrument'?$('.nl-pen-map svg'):null;
    const previousMap=previousPen?.getBoundingClientRect?.();
    instrumentObserver?.disconnect();
    if(instrumentMotionFrame)frameWindow?.cancelAnimationFrame?.(instrumentMotionFrame);
    if(scrollRestoreFrame)frameWindow.cancelAnimationFrame(scrollRestoreFrame);
    const restoreViewport=preserveViewport(root);
    const minHeight=content.style?.minHeight || '';
    const previousHeight=content.getBoundingClientRect?.().height;
    // Replacing a long reading must not briefly collapse the document and
    // clamp its surrounding scroller before the next reading is measured.
    if(content.style && previousHeight)content.style.minHeight=`${Math.ceil(previousHeight)}px`;
    const active=root.getRootNode?.().activeElement || root.ownerDocument?.activeElement;
    const focus=active && content.contains?.(active)?{
      label:active.closest?.('[data-instrument-tools]')?.querySelector('summary')?.getAttribute('aria-label') || active.getAttribute('aria-label'),
      start:active.selectionStart,end:active.selectionEnd,
    }:null;
    const previousInstrumentKey=instrumentActiveKey;
    const unfiledOpen=Boolean($('details.nl-instrument-unfiled[open]'));
    const scrolls=['.nl-host-list','.nl-heatmap','.nl-timeline','.nl-structure-list','.nl-structure-aside','.nl-memory-index-list','.nl-instrument-regions','.nl-instrument-works'].map(selector=>({selector,left:$(selector)?.scrollLeft || 0,top:$(selector)?.scrollTop || 0}));
    const views={instrument:instrumentRoom,map:mapRoom,atlas,study:workbench,anatomy,directory:chamberDirectory,chamber,books:explore,thinkers:explore,skills:skillsRoom,runs:savedRuns,aq:aqRoom};
    // Selections replace the interactive layer. The hand-inked structure only
    // needs to change when geometry or the saved evidence changes.
    reusablePen=previousPen;
    try{content.innerHTML=(views[state.mode] || chamberDirectory)();}
    finally{reusablePen=null;}
    if(state.mode==='instrument'){
      if(previousPen && activePenMap?.reuseInk){
        const map=$('.nl-pen-map svg');
        const source=previousPen.querySelector('[data-pen-ink]'),destination=map?.querySelector('[data-pen-ink]');
        if(source && destination)destination.replaceChildren(...source.childNodes);
      }
      instrumentLookupAQ(state.instrument.aq.fall && !frameWindow?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1050:0);
      state.instrument.aq.fall=0;
      mountInstrumentStage(previousMap);
      const unfiled=$('details.nl-instrument-unfiled');
      if(unfiled && previousInstrumentKey===instrumentActiveKey)unfiled.open=unfiledOpen;
    }
    if(focus?.label){
      const replacement=Array.from(content.querySelectorAll('[aria-label]')).find(el=>el.getAttribute('aria-label')===focus.label);
      replacement?.focus({preventScroll:true});
      if(replacement?.setSelectionRange && focus.start!==null)try{replacement.setSelectionRange(focus.start,focus.end);}catch{}
    }
    for(const saved of scrolls){
      if((saved.selector==='.nl-instrument-regions' || saved.selector==='.nl-instrument-works') && previousInstrumentKey!==instrumentActiveKey)continue;
      const element=$(saved.selector);if(element){element.scrollLeft=saved.left;element.scrollTop=saved.top;}
    }
    const aq=state.instrument.aq;
    const aqScroll=state.mode==='instrument' && aq.committed?aq.scroll:null;
    aq.scroll=null;
    const restoreAQ=()=>{
      if(!Number.isFinite(aqScroll))return;
      const scroller=instrumentAQScroller();
      if(scroller)scroller.scrollTop=aqScroll;
    };
    if(content.style)content.style.minHeight=minHeight;
    restoreViewport();
    restoreAQ();
    if(frameWindow?.requestAnimationFrame)scrollRestoreFrame=frameWindow.requestAnimationFrame(()=>{
      scrollRestoreFrame=0;restoreViewport();restoreAQ();
    });
    instrumentObserveAQFeed();
    persist();
  }
  function render() {
    clearTimeout(timer);
    if(state.mode==='instrument'){
      installInstrumentFonts();
      root.innerHTML='<div data-content></div>';
      renderContent();
      return;
    }
    instrumentLayoutEditing=false;
    syncInstrumentHash('');
    const inChambers=chamberModes.includes(state.mode);
    const tab=(mode,label,active=state.mode===mode)=>`<button class="nl-tab ${active?'active':''}" data-mode="${mode}" aria-pressed="${active}">${label}</button>`;
    const warnings=world.provenance?.warnings || [];
    root.innerHTML=`<div class="nl-toolbar"><nav class="nl-tabs nl-room-nav" aria-label="NUMO views">
      ${tab('instrument','← Main Numogram')}
      ${publicReference?tab('atlas','Demon atlas')+tab('anatomy','Anatomy')+tab('skills','Tarot &amp; voices'):
        tab('map','Map')+tab('atlas','Demon atlas')+tab('directory','Chambers',inChambers)+tab('aq','AQ traces')+tab('study','Workbench')}
    </nav>${publicReference?'':`<details class="nl-room-tools"><summary>More tools <span aria-hidden="true">⌄</span></summary><div>
      <button data-mode="anatomy">Anatomy</button><button data-mode="runs">Saved runs</button><button data-learning="">Learning studio ↗</button><button data-world>Immersive map ↗</button><button data-refresh aria-label="Refresh saved NUMO readings">Refresh readings ↻</button>
    </div></details>`}</div>
    ${inChambers && !publicReference?`<nav class="nl-chamber-nav" aria-label="Chamber types">${tab('directory','Directory')}${tab('chamber','Demons')}${tab('thinkers','Thinkers')}${tab('books','Books')}${tab('skills','Tarot &amp; voices')}</nav>`:''}
    ${state.mode==='runs'?`<div class="nl-filterbar"><label class="nl-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search saved runs" placeholder="Demon, book, thinker or model…" value="${e(state.query)}"></label><label class="nl-meta"><input type="checkbox" data-history ${state.history?'checked':''}> Earlier versions</label></div>`:''}
    ${warnings.length?`<details class="nl-room-warnings"><summary>Some saved data could not be loaded</summary><div class="nl-warning">${warnings.map(e).join('<br>')}</div></details>`:''}
    <div data-content></div><footer class="nl-footer"><span><b>●</b> ${publicReference?'Published NUMO reference':`Connected to your Care library · ${books.length} works available`}</span><span>${publicReference?'CCRU Matrix / Deck correspondences':'CCRU Matrix / Saved NUMO interpretations / Source-linked readings'}</span></footer>`;
    renderContent();
  }
  function click(event) {
    const tools=$('[data-instrument-tools][open]');
    if(tools && !tools.contains(event.target))tools.open=false;
    if(mapClick(event))return;
    const target=event.target.closest('button,[data-zone],[data-structure],[data-instrument-pair],[data-instrument-chord]');if(!target || !root.contains(target))return;
    const d=target.dataset;
    if('mode' in d){state.mode=d.mode;state.query='';state.page=0;state.zone=d.mode==='aq'?state.aq.zone:null;state.frame=0;state.axis=d.mode==='thinkers'?'publications':'chapters';if(d.mode==='instrument'){state.instrument.trail=[];state.instrument.forward=[];state.instrument.deck='';instrumentGo({},{remember:false,repaint:false});}render();}
    else if('instrumentLayout' in d){instrumentLayoutEditing=!instrumentLayoutEditing;renderContent();}
    else if('instrumentPair' in d){
      if(!instrumentLayoutEditing)instrumentJoinZones(...d.instrumentPair.split(',').map(Number));
    }
    else if('instrumentChord' in d){
      if(!instrumentLayoutEditing && byId[d.instrumentChord])instrumentJoinZones(...zonePoles(byId[d.instrumentChord]));
    }
    else if('instrumentSubject' in d){instrumentOpenSubject(d.instrumentSubjectKind,d.instrumentSubject);}
    else if('instrumentClose' in d){instrumentClosePane();}
    else if('instrumentHistory' in d){instrumentHistoryStep(d.instrumentHistory);}
    else if('instrumentHome' in d){state.instrument.deck='';instrumentGo();}
    else if('instrumentWeb' in d || 'instrumentHetu' in d){const layer='instrumentWeb' in d?'web':'hetu';state.instrument[layer]=!state.instrument[layer];renderContent();}
    else if('instrumentWalk' in d){
      const index=state.instrument.trail.indexOf(instrumentWalk()[Number(d.instrumentWalk)]);
      if(index>=0)instrumentHistoryStep('back',index);
    }
    else if('instrumentDeck' in d){
      state.instrument.deck=state.instrument.deck===d.instrumentDeck?'':d.instrumentDeck;
      state.instrument.deckGroup='';
      renderContent();
    }
    else if('instrumentDeckGroup' in d){state.instrument.deckGroup=d.instrumentDeckGroup;renderContent();}
    else if('instrumentDeckClose' in d){state.instrument.deck='';renderContent();}
    else if('instrumentPropose' in d){state.instrument.proposing=d.instrumentPropose;state.instrument.proposalZone=null;renderContent();}
    else if('instrumentProposalCancel' in d){state.instrument.proposing='';state.instrument.proposalZone=null;renderContent();}
    else if('instrumentInk' in d){instrumentProposal('ink',{id:d.instrumentInk});}
    else if('instrumentErase' in d){instrumentProposal('erase',{id:d.instrumentErase});}
    else if('instrumentAqName' in d){instrumentCommitAQ(d.instrumentAqName);}
    else if('instrumentAqTotal' in d){
      const address=instrumentAQAddress(Number(d.instrumentAqTotal));
      if(address)instrumentGo({aqCommitted:address});
    }
    else if('instrumentAqRetryPage' in d){instrumentAQLoadMore(Number(d.instrumentAqRetryPage));}
    else if('instrumentAqTab' in d){instrumentPauseAQFeed();Object.assign(state.instrument.aq,{browseTab:d.instrumentAqTab,match:''});renderContent();}
    else if('instrumentAqCollection' in d){
      const aq=state.instrument.aq;
      if(aq.browseTab==='collection' && d.instrumentAqCollection==='remove' && aq.match===d.recordId)aq.match='';
      instrumentRequestAQ('instrument_aq_collection',{operation:d.instrumentAqCollection,id:d.recordId});
    }
    else if('instrumentAqIndex' in d){instrumentRequestAQ('aq_open_index',{});}
    else if('instrumentAqMatch' in d){instrumentToggleAQMatch(d.instrumentAqMatch,'aqFetch' in d);}
    else if('instrumentAqRetryMatch' in d){instrumentRequestAQ('instrument_aq_match',{id:d.instrumentAqRetryMatch});}
    else if('instrumentAqSource' in d){instrumentRequestAQ('instrument_aq_source',{id:d.instrumentAqSource});}
    else if('instrumentReplay' in d){if(state.instrument.replay===null)instrumentGo({replay:1988});else instrumentHistoryStep('back');}
    else if('instrumentWork' in d || 'instrumentWorkClose' in d){
      const workId=d.instrumentWork || state.instrument.openWork;
      state.instrument.openWork=state.instrument.openWork===workId?'':workId;
      renderContent();
      const cover=Array.from(root.querySelectorAll?.('button[data-instrument-work]') || []).find(button=>button.dataset.instrumentWork===workId);
      cover?.focus({preventScroll:true});
      if(state.instrument.openWork)$('#nl-instrument-work-readings header')?.scrollIntoView({block:'nearest'});
      else cover?.scrollIntoView({block:'nearest',inline:'nearest'});
    }
    else if('instrumentMoreWorks' in d){
      const firstAdded=state.instrument.workLimit;
      state.instrument.workLimit+=instrumentWorkPage;
      renderContent();
      const added=$('.nl-instrument-works')?.children[firstAdded]?.firstElementChild;
      added?.focus({preventScroll:true});
      added?.scrollIntoView({block:'nearest',inline:'nearest'});
    }
    else if('instrumentMore' in d){state.instrument.depositLimit+=18;renderContent();}
    else if('instrumentRite' in d){state.instrument.rite=Number(d.instrumentRite);if(activePenMap)activePenMap.routeKey='';renderContent();}
    else if('instrumentAnatomy' in d){openStructure(d.instrumentAnatomy);}
    else if('browseZone' in d){selectZone(Number(d.browseZone));}
    else if('atlasZone' in d){state.mode='atlas';state.family='';state.atlas.query='';render();}
    else if('atlasFormat' in d){state.atlas.format=d.atlasFormat==='cards'?'cards':'table';renderContent();}
    else if('atlasInspect' in d){const dossier=$('.nl-atlas-dossier');dossier?.focus({preventScroll:true});dossier?.scrollIntoView({block:'start'});}
    else if('mapRiteOpen' in d){state.mode='instrument';state.zone=null;instrumentGo({zones:zonePoles(byId[state.demon]),rite:state.rite},{repaint:false});render();}
    else if('aqZone' in d){if(state.zone===9){state.mode='aq';render();}else searchAQ({...aqEmpty(),zone:state.zone});}
    else if('aqDemon' in d){searchAQ({...aqEmpty(),demon_id:d.aqDemon});}
    else if('aqClearDemon' in d){searchAQ({demon_id:'',zone:state.zone===9?null:state.zone});}
    else if('aqReset' in d){searchAQ(aqEmpty());}
    else if('aqPage' in d){searchAQ({offset:Number(d.aqPage)});}
    else if('aqOpenSource' in d){emit('aq_open_source',{total:Number(d.aqTotal),id:d.aqOpenSource});}
    else if('aqOpenIndex' in d){emit('aq_open_index',{total:d.aqOpenIndex===''?null:Number(d.aqOpenIndex)});}
    else if('aqRecord' in d){
      if(state.mode!=='aq'){searchAQ({...aqEmpty(),query:d.aqRecord,record:d.aqRecord});return;}
      state.aq.record=state.aq.record===d.aqRecord?'':d.aqRecord;renderContent();
      if(state.aq.record){const map=$('.nl-aq-map');map?.focus({preventScroll:true});map?.scrollIntoView({block:'nearest'});}
    }
    else if('learning' in d){emit('learning',{id:d.learning});}
    else if('authorAction' in d){
      const s=state[d.authorScope];if(!s || !['anatomy','chamber'].includes(d.authorScope))return;
      const hidden=new Set(s.hiddenAuthors || []),collapsed=new Set(s.collapsedAuthors || []),key=d.authorKey;
      if(d.authorAction==='hide')hidden.add(key);
      if(d.authorAction==='show')hidden.delete(key);
      if(d.authorAction==='restore')hidden.clear();
      if(d.authorAction==='collapse'){collapsed.has(key)?collapsed.delete(key):collapsed.add(key);s.authorMode='groups';}
      if(d.authorAction==='only'){hidden.clear();for(const r of runs){const a=authorInfo({run_id:r.id});if(a.id!==key)hidden.add(a.id);}for(const o of world.observations || []){const a=authorInfo(o);if(a.id!==key)hidden.add(a.id);}}
      if(d.authorAction==='more'){s.authorLimits=s.authorLimits || {};s.authorLimits[key]=(s.authorLimits[key] || (d.authorScope==='anatomy'?8:10))+10;}
      if(['groups','chronology'].includes(d.authorAction))s.authorMode=d.authorAction;
      s.hiddenAuthors=[...hidden];s.collapsedAuthors=[...collapsed];s.page=0;if(d.authorScope==='anatomy')s.route='';renderContent();
    }
    else if('structure' in d){
      if(state.mode==='instrument' && structureById[d.structure]){
        const item=structureById[d.structure];
        if(['zone','syzygy'].includes(item.kind))instrumentGo({zones:[...(item.zone_ids || [])].sort((a,b)=>a-b)});
        else instrumentGo({structure:item.id});
      }else openStructure(d.structure);
    }
    else if('structureKind' in d){const first=structureEntities.find(item=>item.kind===d.structureKind);if(first)openStructure(first.id);}
    else if('anatomyRoute' in d){state.anatomy.route=d.anatomyRoute;renderContent();}
    else if('anatomyPage' in d){state.anatomy.page=Number(d.anatomyPage);renderContent();}
    else if('anatomySeen' in d){const entity=structureById[state.anatomy.id];if(entity){state.anatomy.seen[entity.id]={fingerprint:entity.fingerprint,run_ids:entity.current_run_ids || [],recorded_at:new Date().toISOString()};renderContent();}}
    else if('anatomyExport' in d){
      const record=structureReviewPacket(world,state.anatomy.id);if(!record)return;
      const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
      const link=root.ownerDocument.createElement('a');link.href=url;link.download='numo-'+state.anatomy.id.replaceAll(':','-')+'-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    else if('matrixRows' in d){state.matrixRows=d.matrixRows==='assigned'?'assigned':'all';renderContent();}
    else if('studyFrame' in d){state.study.frame=Number(d.studyFrame);renderContent();}
    else if('dismissStudyMessage' in d){clearStudyMessage();persist();}
    else if('pinCompare' in d){state.study.compare=state.study.frame;renderContent();}
    else if('clearCompare' in d){state.study.compare=null;renderContent();}
    else if('selectAll' in d){state.study.selection=null;state.study.pins=null;state.study.loaded='';state.study.compare=null;renderContent();}
    else if('selectNone' in d){state.study.selection=[];state.study.pins=null;state.study.loaded='';state.study.compare=null;renderContent();}
    else if('selectUnread' in d){state.study.selection=studyUnreadHosts(world,state.study,true).map(h=>h.id);state.study.pins=null;state.study.loaded='';state.study.frame=0;state.study.compare=null;renderContent();}
    else if('selectMatching' in d){
      const selected=new Set(studyScope(world,state.study).selected.map(h=>h.id)),q=String(state.study.hostQuery || '').toLowerCase();
      studyScope(world,state.study).inRange.filter(h=>`${h.title} ${books.find(b=>b.id===h.work_id)?.title || ''}`.toLowerCase().includes(q)).forEach(h=>selected.add(h.id));
      state.study.selection=[...selected];state.study.loaded='';state.study.compare=null;renderContent();
    }
    else if('moreHosts' in d){state.study.hostLimit+=120;renderContent();}
    else if('runMissing' in d){const ids=studyUnreadHosts(world,state.study).map(h=>h.id);if(ids.length)emit('run',{host_ids:ids});}
    else if('runScope' in d)emit('run',{host_ids:studyScope(world,state.study).selected.map(h=>h.id)});
    else if('exampleLand' in d){applyStudyQuery('Nick Land 1988–2014');}
    else if('studyLive' in d){state.study.pins=null;state.study.loaded='';renderContent();}
    else if('saveStudy' in d)emit('save_study',{study:studySnapshot()});
    else if('exportStudy' in d){
      const snapshot=studySnapshot(),frames=studyFrames(world,state.study);
      const record={schema:'care-numo-study-export/v1',study:snapshot,frames:frames.map(f=>({host_id:f.id,title:f.title,work_id:f.work_id,date_label:f.label,source_date:f.source_date,source_year:f.source_year,source_year_end:f.source_year_end,date_basis:f.date_basis,date_evidence:f.date_evidence,run_ids:f.run_ids,demons:f.demon_ids.map(id=>({id,name:byId[id]?.name})),assignments:f.observations.map(o=>({id:o.id,run_id:o.run_id,demon_id:o.mesh_id,proposition:o.proposition,source_trace:o.source_trace,evidence_class:o.evidence_class}))}))};
      const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
      const link=root.ownerDocument.createElement('a');link.href=url;link.download='numo-study-evidence.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    else if('openChamber' in d){openChamber(d.openChamber);}
    else if('librarySearch' in d)emit('library_search',{query:d.librarySearch});
    else if('chamberTab' in d){state.chamber.tab=d.chamberTab;renderContent();}
    else if('chamberConcept' in d){Object.assign(state.chamber,{query:d.chamberConcept,tab:'encounters',run:'',page:0});renderContent();}
    else if('chamberAuthor' in d){Object.assign(state.chamber,{author:d.chamberAuthor,tab:'encounters',run:'',page:0});renderContent();}
    else if('chamberPage' in d){state.chamber.page=Number(d.chamberPage);renderContent();}
    else if('chamberAll' in d){state.chamber.run='';renderContent();}
    else if('moreConcepts' in d){state.chamber.moreConcepts=!state.chamber.moreConcepts;renderContent();}
    else if('resetChamber' in d){Object.assign(state.chamber,{query:'',author:'',from:'',to:'',run:'',history:false,includeUndated:true,page:0});renderContent();}
    else if('demon' in d){state.demon=d.demon;state.rite=0;if(state.mode!=='atlas'){openChamber(d.demon);}else renderContent();}
    else if('zone' in d){
      if(state.mode==='instrument'){
        instrumentPickZone(Number(d.zone));
        return;
      }
      if(['map','aq'].includes(state.mode)){selectZone(Number(d.zone));return;}
      if(structureById['zone:'+d.zone]){openStructure('zone:'+d.zone);return;}
      if(state.mode!=='atlas'){state.mode='atlas';state.atlas.query='';state.family='';state.zone=Number(d.zone);render();}
      else selectZone(Number(d.zone));
    }
    else if('clearZone' in d){if(state.mode==='aq')searchAQ({zone:null});else{state.zone=null;renderContent();}}
    else if('rite' in d){state.rite=Number(d.rite);renderContent();}
    else if('memoryBook' in d || 'book' in d){openMemorySubject('books',d.memoryBook ?? d.book);}
    else if('memoryThinker' in d || 'thinker' in d){openMemorySubject('thinkers',d.memoryThinker ?? d.thinker);}
    else if('correspondence' in d){openCorrespondence(d.correspondence);}
    else if('correspondenceShelf' in d){selectCorrespondenceShelf(d.correspondenceShelf);}
    else if('correspondenceGroup' in d){state.voices.group=d.correspondenceGroup;renderContent();}
    else if('correspondenceBack' in d){const id=state.voices.id;state.voices.id='';renderContent();focusDeck(id);}
    else if('correspondenceDemon' in d){state.chamber.tab='correspondences';openChamber(d.correspondenceDemon);}
    else if('memoryStudy' in d){openMemoryStudy();}
    else if('memoryPath' in d){state.memory.path=!state.memory.path;renderContent();}
    else if('memoryCoverage' in d){Object.assign(state.memory,{coverage:d.memoryCoverage==='read'?'read':'all',limit:40});renderContent();}
    else if('memoryMore' in d){state.memory.limit+=40;renderContent();}
    else if('frame' in d){const scroll=$('.nl-timeline')?.scrollLeft || 0;state.frame=Number(d.frame);renderContent();if($('.nl-timeline'))$('.nl-timeline').scrollLeft=scroll;}
    else if('openField' in d)emit('open_field',{id:d.openField});
    else if('openWork' in d)emit('open_work',{id:d.openWork});
    else if('runHost' in d)emit('run',{host_ids:[d.runHost]});
    else if('runSubject' in d)emit('run',{host_ids:runIdsForSubject()});
    else if('runChapters' in d)emit('run',{host_ids:hosts.filter(h=>h.work_id===state.book && (h.type || h.host_level)==='CH').map(h=>h.id || h.host_id)});
    else if('world' in d)emit('world');
    else if('refresh' in d){state.aq={...aqEmpty(),record:''};if(state.mode==='aq')state.zone=null;emit('refresh');}
    else if('findRuns' in d){state.mode='runs';state.query=d.findRuns;state.page=0;render();}
    else if('page' in d){state.page=Number(d.page);renderContent();}
  }
  function openChamber(id){if(!byId[id])return;if(publicReference){state.mode='instrument';instrumentOpenSubject('demon',id);render();return;}state.demon=id;state.rite=0;state.mode='chamber';Object.assign(state.chamber,{query:'',author:'',from:'',to:'',run:'',page:0});render();}
  function input(event) {
    if(event.target.matches('[data-instrument-aq-input]')){state.instrument.aq.draft=event.target.value;instrumentDrawAQ();return;}
    if(event.target.matches('[data-instrument-replay-year]')){const output=event.target.parentElement?.querySelector('output');if(output)output.value=event.target.value;return;}
    if(event.target.matches('[aria-label="Find a card or skill"]')){state.voices.query=event.target.value;clearTimeout(timer);timer=setTimeout(renderContent,80);return;}
    if(event.target.matches('[aria-label="Find a structure"]')){state.anatomy.query=event.target.value;clearTimeout(timer);timer=setTimeout(renderContent,160);return;}
    if(event.target.matches('[aria-label="Find structure encounters"]')){state.anatomy.encounterQuery=event.target.value;state.anatomy.page=0;clearTimeout(timer);timer=setTimeout(renderContent,160);return;}
    if(event.target.matches('[aria-label="Search chamber encounters"]')){state.chamber.query=event.target.value;state.chamber.page=0;clearTimeout(timer);timer=setTimeout(renderContent,160);return;}
    if(event.target.matches('input[type=search]')){if(state.mode==='atlas')state.atlas.query=event.target.value;else state.query=event.target.value;state.page=0;clearTimeout(timer);timer=setTimeout(renderContent,80);}
    else if(event.target.matches('[aria-label="Study name"]')){state.study.name=event.target.value;persist();}
    else if(event.target.matches('[aria-label="Study query"]')){state.study.question=event.target.value;clearStudyMessage();persist();}
    else if(event.target.matches('[aria-label="Find writings in scope"]')){state.study.hostQuery=event.target.value;state.study.hostLimit=120;clearTimeout(timer);timer=setTimeout(renderContent,160);}
    else if(event.target.matches('[aria-label="Move through selected writings"]')){state.study.frame=Number(event.target.value);renderContent();}
  }
  function clearStudyMessage(){state.study.message='';$('[data-study-message]')?.remove();}
  function resetStudyScope(){state.study.selection=null;state.study.pins=null;state.study.frame=0;state.study.compare=null;state.study.loaded='';state.study.message='';renderContent();}
  function applyStudyQuery(text){
    const result=parseStudyQuery(text,world);state.study.question=text;
    if(result.error){state.study.message=result.error;renderContent();return;}
    Object.assign(state.study,result,{name:''});resetStudyScope();
  }
  function submit(event){
    if(event.target.matches('.nl-instrument-aq-form')){event.preventDefault();instrumentCommitAQ(state.instrument.aq.draft);return;}
    if(event.target.matches('.nl-question')){event.preventDefault();applyStudyQuery(state.study.question);}
    if(event.target.matches('.nl-aq-form')){
      event.preventDefault();
      const form=new FormData(event.target);
      searchAQ({query:String(form.get('query') || '').trim(),source_type:String(form.get('source_type') || ''),zone:state.zone===9?null:state.zone});
    }
  }
  function change(event) {
    if(event.target.matches('[data-instrument-aq-kind]')){instrumentAQFilter({matchKind:event.target.value});return;}
    if(event.target.matches('[data-instrument-aq-sort]')){instrumentAQFilter({matchSort:event.target.value});return;}
    if(event.target.matches('[data-instrument-replay-year]')){state.instrument.replay=Number(event.target.value);renderContent();return;}
    if(event.target.matches('[aria-label="Sort demons"]')){state.atlas.sort=event.target.value;renderContent();return;}
    if(event.target.matches('[aria-label="Trace a Matrix rite"]')){
      const [demon,index]=event.target.value.split(':');
      state.mapTrace=demon?{demon,index:Number(index)}:null;renderContent();return;
    }
    if(event.target.matches('[data-anatomy-history]')){state.anatomy.history=event.target.checked;state.anatomy.page=0;renderContent();return;}
    if(event.target.matches('[aria-label="Choose demon chamber"]')){openChamber(event.target.value);return;}
    const chamberFields={'Chamber author':'author','Chamber date axis':'axis','Chamber from year':'from','Chamber to year':'to'};
    for(const [label,key] of Object.entries(chamberFields))if(event.target.matches(`[aria-label="${label}"]`)){state.chamber[key]=event.target.value;state.chamber.page=0;if(key==='axis'){state.chamber.from='';state.chamber.to='';}renderContent();return;}
    if(event.target.matches('[data-chamber-history]')){state.chamber.history=event.target.checked;state.chamber.page=0;renderContent();return;}
    if(event.target.matches('[data-chamber-undated]')){state.chamber.includeUndated=event.target.checked;state.chamber.page=0;renderContent();return;}
    if(event.target.matches('[aria-label="Demon family"]')){state.family=event.target.value;renderContent();}
    else if(event.target.matches('#nl-axis')){state.axis=event.target.value;state.frame=0;renderContent();}
    else if(event.target.matches('[data-history]')){state.history=event.target.checked;state.page=0;renderContent();}
    else if(event.target.matches('[aria-label="Study thinker"]')){state.study.thinker=event.target.value;state.study.work='';resetStudyScope();}
    else if(event.target.matches('[aria-label="Study work"]')){state.study.work=event.target.value;resetStudyScope();}
    else if(event.target.matches('[aria-label="Study level"]')){state.study.level=event.target.value;resetStudyScope();}
    else if(event.target.matches('[aria-label="Study from year"]')){state.study.from=event.target.value;resetStudyScope();}
    else if(event.target.matches('[aria-label="Study to year"]')){state.study.to=event.target.value;resetStudyScope();}
    else if(event.target.matches('[data-include-undated]')){state.study.includeUndated=event.target.checked;resetStudyScope();}
    else if(event.target.matches('[data-host-select]')){
      const selected=new Set(studyScope(world,state.study).selected.map(h=>h.id)),id=event.target.dataset.hostSelect;
      event.target.checked?selected.add(id):selected.delete(id);state.study.selection=[...selected];state.study.compare=null;state.study.loaded='';renderContent();
    }
    else if(event.target.matches('[aria-label="Load saved study"]')){
      const saved=(world.saved_studies || []).find(study=>study.id===event.target.value);if(!saved)return;
      const runsById=Object.fromEntries(runs.map(r=>[r.id,r]));
      state.study={...state.study,thinker:saved.thinker_id || '',work:saved.work_ids.length===1?saved.work_ids[0]:'',level:saved.host_level || 'CH',from:saved.source_year_from??'',to:saved.source_year_to??'',loadedWorkIds:saved.work_ids,loadedComparison:saved.comparison,includeUndated:!!saved.include_undated,selection:saved.host_ids,pins:saved.run_ids,name:saved.name,loaded:saved.id,message:(saved.availability?.notes || []).join(' '),question:'',frame:0,compare:null};
      const frames=studyFrames(world,state.study),aRun=runsById[saved.comparison?.a],bRun=runsById[saved.comparison?.b],a=aRun?.catalog_host_id || aRun?.host_id,b=bRun?.catalog_host_id || bRun?.host_id;
      state.study.compare=a?frames.findIndex(f=>f.id===a):null;state.study.frame=b?Math.max(0,frames.findIndex(f=>f.id===b)):0;renderContent();
    }
  }
  function keydown(event) {
    if(mapKeys(event))return;
    if((event.key==='Enter' || event.key===' ') && event.target.matches('svg [data-zone],svg [data-structure],svg [data-instrument-pair],svg [data-instrument-chord]')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
    instrumentShortcuts(event);
  }
  const handlers={click,input,change,keydown,submit,pointerdown:mapPointerDown,pointermove:mapPointerMove,pointerup:mapPointerEnd,pointercancel:mapPointerEnd,lostpointercapture:mapPointerEnd,
    pointerover:instrumentLinkHighlights,pointerout:instrumentLinkHighlights,focusin:instrumentLinkHighlights,focusout:instrumentLinkHighlights,'numo:map-layout':instrumentLayoutChanged};
  for(const [type,handler] of Object.entries(handlers))root.addEventListener(type,handler);
  frameWindow?.document?.addEventListener?.('keydown',instrumentShortcuts);
  frameWindow?.document?.addEventListener?.('visibilitychange',syncInstrumentCurrents);
  penMotionPreference?.addEventListener?.('change',syncInstrumentCurrents);
  frameWindow?.addEventListener?.('resize',instrumentResize);
  frameWindow?.addEventListener?.('hashchange',instrumentHashChanged);
  if(!data.focus && !data.structure_focus){
    const deepLink=instrumentFromHash();
    const aq=state.instrument.aq.committed;
    const restoredAddress=aq && !aq.address && instrumentAQInput(aq.text);
    if(state.mode==='instrument' && restoredAddress?.address && (!deepLink || deepLink.aqCommitted?.total===aq.total)){
      instrumentGo({aqCommitted:restoredAddress},{remember:false,repaint:false});
    }else if(deepLink && (state.mode!=='instrument' || instrumentHash(instrumentSnapshot())!==instrumentLocationKey())){
      state.mode='instrument';instrumentGo(deepLink,{repaint:false,hash:false});
    }
  }
  data.bindAQResponse?.((field,result)=>{
    if(field)world[field]=result;
    aqServerPending=false;
    renderContent();
  });
  function openHeaderAQ({query,total,id}, fetchMatch) {
    const input=instrumentAQInput(query);
    const address=input?.total===total?input:instrumentAQAddress(total);
    if(!address)return;
    state.mode='instrument';
    instrumentGo({aqCommitted:address},{repaint:false,fall:true});
    Object.assign(state.instrument.aq,{match:id || '',matchKind:'sentence'});
    if(id && fetchMatch)instrumentRequestAQ('instrument_aq_match',{id});
  }
  function openHeaderReference({kind,id}) {
    state.mode='instrument';
    instrumentOpenSubject(kind,id,{repaint:false});
  }
  if(data.reference_focus)openHeaderReference(data.reference_focus);
  if(data.aq_focus)openHeaderAQ(data.aq_focus,false);
  data.bindAQOpen?.(target=>{
    openHeaderAQ(target,true);
    render();
  });
  data.bindReferenceOpen?.(target=>{
    openHeaderReference(target);
    render();
  });
  data.bindToolsOpen?.(showHeaderTools);
  if(headerAQ)frameWindow?.document?.addEventListener?.('pointerdown',dismissHeaderTools);
  render();
  if(data.open_tools)showHeaderTools();
  return () => {
    if(headerAQ)frameWindow?.document?.removeEventListener?.('pointerdown',dismissHeaderTools);
    clearTimeout(timer);clearTimeout(mapClickTimer);clearTimeout(instrumentAQTimer);
    instrumentPauseAQFeed();
    stopInstrumentCurrents();
    instrumentObserver?.disconnect();
    if(instrumentMotionFrame)frameWindow?.cancelAnimationFrame?.(instrumentMotionFrame);
    if(scrollRestoreFrame)frameWindow.cancelAnimationFrame(scrollRestoreFrame);
    for(const [type,handler] of Object.entries(handlers))root.removeEventListener(type,handler);
    frameWindow?.document?.removeEventListener?.('keydown',instrumentShortcuts);
    frameWindow?.document?.removeEventListener?.('visibilitychange',syncInstrumentCurrents);
    penMotionPreference?.removeEventListener?.('change',syncInstrumentCurrents);
    frameWindow?.removeEventListener?.('resize',instrumentResize);
    frameWindow?.removeEventListener?.('hashchange',instrumentHashChanged);
  };
}

export const arithmetic = {"arithmetic_only": true, "zones": [{"id": 0, "name": "Zone 0", "region": "Plex", "planet": "Sol", "twin": 9, "gate": 0, "channel": 0, "description": "Plex. Twinned with 9; gate 00 channels to 0.", "demon_ids": []}, {"id": 1, "name": "Zone 1", "region": "Time-Circuit", "planet": "Mercury", "twin": 8, "gate": 1, "channel": 1, "description": "Time-Circuit. Twinned with 8; gate 01 channels to 1.", "demon_ids": []}, {"id": 2, "name": "Zone 2", "region": "Time-Circuit", "planet": "Venus", "twin": 7, "gate": 3, "channel": 3, "description": "Time-Circuit. Twinned with 7; gate 03 channels to 3.", "demon_ids": []}, {"id": 3, "name": "Zone 3", "region": "Warp", "planet": "Earth", "twin": 6, "gate": 6, "channel": 6, "description": "Warp. Twinned with 6; gate 06 channels to 6.", "demon_ids": []}, {"id": 4, "name": "Zone 4", "region": "Time-Circuit", "planet": "Mars", "twin": 5, "gate": 10, "channel": 1, "description": "Time-Circuit. Twinned with 5; gate 10 channels to 1.", "demon_ids": []}, {"id": 5, "name": "Zone 5", "region": "Time-Circuit", "planet": "Jupiter", "twin": 4, "gate": 15, "channel": 6, "description": "Time-Circuit. Twinned with 4; gate 15 channels to 6.", "demon_ids": []}, {"id": 6, "name": "Zone 6", "region": "Warp", "planet": "Saturn", "twin": 3, "gate": 21, "channel": 3, "description": "Warp. Twinned with 3; gate 21 channels to 3.", "demon_ids": []}, {"id": 7, "name": "Zone 7", "region": "Time-Circuit", "planet": "Uranus", "twin": 2, "gate": 28, "channel": 1, "description": "Time-Circuit. Twinned with 2; gate 28 channels to 1.", "demon_ids": []}, {"id": 8, "name": "Zone 8", "region": "Time-Circuit", "planet": "Neptune", "twin": 1, "gate": 36, "channel": 9, "description": "Time-Circuit. Twinned with 1; gate 36 channels to 9.", "demon_ids": []}, {"id": 9, "name": "Zone 9", "region": "Plex", "planet": "Pluto", "twin": 0, "gate": 45, "channel": 9, "description": "Plex. Twinned with 0; gate 45 channels to 9.", "demon_ids": []}], "currents": [{"from": 5, "to": 1, "syzygy": [5, 4], "kind": "current"}, {"from": 6, "to": 3, "syzygy": [6, 3], "kind": "current"}, {"from": 7, "to": 5, "syzygy": [7, 2], "kind": "current"}, {"from": 8, "to": 7, "syzygy": [8, 1], "kind": "current"}, {"from": 9, "to": 9, "syzygy": [9, 0], "kind": "current"}], "channels": [{"from": 0, "to": 0, "gate": 0, "kind": "channel", "disputed": true}, {"from": 1, "to": 1, "gate": 1, "kind": "channel", "disputed": false}, {"from": 2, "to": 3, "gate": 3, "kind": "channel", "disputed": false}, {"from": 3, "to": 6, "gate": 6, "kind": "channel", "disputed": false}, {"from": 4, "to": 1, "gate": 10, "kind": "channel", "disputed": false}, {"from": 5, "to": 6, "gate": 15, "kind": "channel", "disputed": false}, {"from": 6, "to": 3, "gate": 21, "kind": "channel", "disputed": false}, {"from": 7, "to": 1, "gate": 28, "kind": "channel", "disputed": false}, {"from": 8, "to": 9, "gate": 36, "kind": "channel", "disputed": false}, {"from": 9, "to": 9, "gate": 45, "kind": "channel", "disputed": false}], "structure_pages": {"entities": [{"id": "zone:0", "title": "Zone 0", "kind": "zone", "zone_ids": [0], "facts": [{"label": "Region", "value": "Plex"}, {"label": "Planet", "value": "Sol"}, {"label": "Gate", "value": "0"}]}, {"id": "zone:1", "title": "Zone 1", "kind": "zone", "zone_ids": [1], "facts": [{"label": "Region", "value": "Time-Circuit"}, {"label": "Planet", "value": "Mercury"}, {"label": "Gate", "value": "1"}]}, {"id": "zone:2", "title": "Zone 2", "kind": "zone", "zone_ids": [2], "facts": [{"label": "Region", "value": "Time-Circuit"}, {"label": "Planet", "value": "Venus"}, {"label": "Gate", "value": "3"}]}, {"id": "zone:3", "title": "Zone 3", "kind": "zone", "zone_ids": [3], "facts": [{"label": "Region", "value": "Warp"}, {"label": "Planet", "value": "Earth"}, {"label": "Gate", "value": "6"}]}, {"id": "zone:4", "title": "Zone 4", "kind": "zone", "zone_ids": [4], "facts": [{"label": "Region", "value": "Time-Circuit"}, {"label": "Planet", "value": "Mars"}, {"label": "Gate", "value": "10"}]}, {"id": "zone:5", "title": "Zone 5", "kind": "zone", "zone_ids": [5], "facts": [{"label": "Region", "value": "Time-Circuit"}, {"label": "Planet", "value": "Jupiter"}, {"label": "Gate", "value": "15"}]}, {"id": "zone:6", "title": "Zone 6", "kind": "zone", "zone_ids": [6], "facts": [{"label": "Region", "value": "Warp"}, {"label": "Planet", "value": "Saturn"}, {"label": "Gate", "value": "21"}]}, {"id": "zone:7", "title": "Zone 7", "kind": "zone", "zone_ids": [7], "facts": [{"label": "Region", "value": "Time-Circuit"}, {"label": "Planet", "value": "Uranus"}, {"label": "Gate", "value": "28"}]}, {"id": "zone:8", "title": "Zone 8", "kind": "zone", "zone_ids": [8], "facts": [{"label": "Region", "value": "Time-Circuit"}, {"label": "Planet", "value": "Neptune"}, {"label": "Gate", "value": "36"}]}, {"id": "zone:9", "title": "Zone 9", "kind": "zone", "zone_ids": [9], "facts": [{"label": "Region", "value": "Plex"}, {"label": "Planet", "value": "Pluto"}, {"label": "Gate", "value": "45"}]}, {"id": "gate:1", "title": "Gate 1", "kind": "gate", "zone_ids": [1, 1], "facts": [{"label": "Cumulates", "value": "Zone 1"}, {"label": "Opens onto", "value": "Zone 1"}]}, {"id": "gate:3", "title": "Gate 3", "kind": "gate", "zone_ids": [2, 3], "facts": [{"label": "Cumulates", "value": "Zone 2"}, {"label": "Opens onto", "value": "Zone 3"}]}, {"id": "gate:6", "title": "Gate 6", "kind": "gate", "zone_ids": [3, 6], "facts": [{"label": "Cumulates", "value": "Zone 3"}, {"label": "Opens onto", "value": "Zone 6"}]}, {"id": "gate:10", "title": "Gate 10", "kind": "gate", "zone_ids": [4, 1], "facts": [{"label": "Cumulates", "value": "Zone 4"}, {"label": "Opens onto", "value": "Zone 1"}]}, {"id": "gate:15", "title": "Gate 15", "kind": "gate", "zone_ids": [5, 6], "facts": [{"label": "Cumulates", "value": "Zone 5"}, {"label": "Opens onto", "value": "Zone 6"}]}, {"id": "gate:21", "title": "Gate 21", "kind": "gate", "zone_ids": [6, 3], "facts": [{"label": "Cumulates", "value": "Zone 6"}, {"label": "Opens onto", "value": "Zone 3"}]}, {"id": "gate:28", "title": "Gate 28", "kind": "gate", "zone_ids": [7, 1], "facts": [{"label": "Cumulates", "value": "Zone 7"}, {"label": "Opens onto", "value": "Zone 1"}]}, {"id": "gate:36", "title": "Gate 36", "kind": "gate", "zone_ids": [8, 9], "facts": [{"label": "Cumulates", "value": "Zone 8"}, {"label": "Opens onto", "value": "Zone 9"}]}, {"id": "gate:45", "title": "Gate 45", "kind": "gate", "zone_ids": [9, 9], "facts": [{"label": "Cumulates", "value": "Zone 9"}, {"label": "Opens onto", "value": "Zone 9"}]}, {"id": "current:5-1", "title": "Current 5 \u2192 1", "kind": "current", "zone_ids": [5, 1], "facts": [{"label": "Syzygy", "value": "5::4"}, {"label": "Flow", "value": "Zone 5 \u2192 Zone 1"}]}, {"id": "current:6-3", "title": "Current 6 \u2192 3", "kind": "current", "zone_ids": [6, 3], "facts": [{"label": "Syzygy", "value": "6::3"}, {"label": "Flow", "value": "Zone 6 \u2192 Zone 3"}]}, {"id": "current:7-5", "title": "Current 7 \u2192 5", "kind": "current", "zone_ids": [7, 5], "facts": [{"label": "Syzygy", "value": "7::2"}, {"label": "Flow", "value": "Zone 7 \u2192 Zone 5"}]}, {"id": "current:8-7", "title": "Current 8 \u2192 7", "kind": "current", "zone_ids": [8, 7], "facts": [{"label": "Syzygy", "value": "8::1"}, {"label": "Flow", "value": "Zone 8 \u2192 Zone 7"}]}, {"id": "current:9-9", "title": "Current 9 \u2192 9", "kind": "current", "zone_ids": [9, 9], "facts": [{"label": "Syzygy", "value": "9::0"}, {"label": "Flow", "value": "Zone 9 \u2192 Zone 9"}]}]}};
export const css = ":host{display:block;color-scheme:dark}\n/* All forty-five rows remain available in a bounded, keyboard-scrollable matrix. */\n.nl .nl-heatmap{max-height:min(560px,60dvh);max-width:100%;border-block:1px solid var(--line);scrollbar-color:#506b57 #101712;scrollbar-gutter:stable;padding:0 2px 8px 0}\n.nl .nl-heat-grid{row-gap:5px;grid-auto-rows:24px;align-items:center;isolation:isolate}\n.nl .nl-heat-label{position:sticky;left:0;z-index:2;background:var(--bg);height:100%;display:flex;align-items:center;text-align:left;box-shadow:4px 0 var(--bg)}\n.nl .nl-heat-index,.nl .nl-heat-corner{position:sticky;top:0;z-index:3;background:var(--bg);height:100%;display:grid;align-items:center;box-shadow:0 4px var(--bg)}\n.nl .nl-heat-corner{left:0;z-index:4;color:var(--muted);font:9px ui-monospace,monospace;box-shadow:4px 4px var(--bg)}\n.nl-matrix-controls{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:18px}\n.nl-matrix-controls .nl-tab{font-size:11px;padding:7px 10px!important}\n.nl-matrix-controls>span{flex-basis:100%;font:10px/1.6 sans-serif;color:var(--muted);margin-top:3px}\n.nl-matrix-legend{display:flex;flex-wrap:wrap;gap:8px 14px;font:10px/1.6 sans-serif;color:var(--muted);margin-top:12px!important}\n.nl-matrix-legend span{display:inline-flex;align-items:center;gap:6px}\n.nl-matrix-legend i{width:12px;height:10px;background:#1b251e;border:1px solid #2d3c31;border-radius:2px}\n.nl-matrix-legend i.assigned{background:#66c782;border-color:#72de90}\n.nl-matrix-legend i.missing{background:repeating-linear-gradient(135deg,transparent 0,transparent 3px,#42604a 3px,#42604a 4px)}\n.nl .nl-heatmap:focus-visible{outline:2px solid var(--green);outline-offset:3px}\n.nl{--bg:#0c110f;--surface:#111914;--line:#26342b;--text:#e4ebe0;--muted:#97a69a;--green:#78f59a;--gold:#d4c092;--violet:#b7a4d7;color:var(--text);background:var(--bg);font:13px/1.5 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;min-height:calc(100dvh - 100px);padding:0 30px 22px;container-type:inline-size}\n.nl *{box-sizing:border-box}.nl button,.nl input,.nl select{font:inherit;color:inherit}.nl button{cursor:pointer;background:transparent;border:0}.nl button:disabled{cursor:default;opacity:.38}.nl button:hover:not(:disabled){color:var(--green)}.nl button:focus-visible,.nl a:focus-visible,.nl select:focus-visible,.nl input:focus-visible{outline:2px solid var(--green);outline-offset:3px}.nl a{color:var(--green);text-decoration:none}.nl a:hover{text-decoration:underline}.nl [hidden]{display:none!important}.nl svg{display:block}.nl h1,.nl h2,.nl h3,.nl p{margin:0}.nl-kicker{font:10px/1.5 ui-monospace,SFMono-Regular,monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--muted)}\n.nl-topactions{display:flex;align-items:center;justify-content:flex-end;gap:18px;margin-left:auto;flex:none}.nl-link{font-size:11px!important;padding:8px 0;color:var(--muted)!important;white-space:nowrap}.nl-link:hover{color:var(--green)!important}\n.nl-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px 24px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding:10px 0;margin-bottom:20px}.nl-tabs{display:flex;gap:5px;min-width:0;max-width:100%;overflow-x:auto;scrollbar-width:thin}.nl-tab{padding:9px 13px!important;color:var(--muted)!important;border-radius:5px;white-space:nowrap}.nl-tab.active{color:var(--green)!important;background:#78f59a11;box-shadow:inset 0 0 0 1px #78f59a25}.nl-filterbar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 20px}.nl-search{display:flex;align-items:center;gap:10px;color:var(--muted);max-width:400px;flex:1;min-width:120px}.nl-search input{background:transparent;border:0;outline:0;width:100%;min-width:0;padding:8px 0;font-size:12px}.nl-search input::placeholder{color:#8c9b90}.nl-search:focus-within{color:var(--green)}.nl select{border:1px solid var(--line);padding:7px 10px;border-radius:4px;background:#101712;font-size:11px;max-width:100%}\n.nl-atlas{display:grid;grid-template-columns:minmax(245px,.86fr) minmax(380px,1.65fr) minmax(240px,.86fr);gap:24px;align-items:start}.nl-map{position:relative;border:1px solid #26392b;background:radial-gradient(ellipse at 50% 46%,#1c432224,transparent 70%),#090e0b;border-radius:7px;overflow:hidden}.nl-map-top{display:flex;justify-content:space-between;align-items:center;padding:17px 17px 0;position:relative;z-index:1}.nl-map-top button{font-size:10px;color:var(--muted);padding:0}.nl-map svg{width:100%;height:535px}.nl-map-foot{padding:14px 17px;border-top:1px solid #1d3022;font-size:10px;color:var(--muted);min-height:58px}.nl-map-foot strong{font-weight:500;color:var(--green)}.nl-map-legend{display:flex;gap:13px;flex-wrap:wrap;padding:10px 17px;font:8px ui-monospace,monospace;color:var(--muted);border-top:1px solid #1d3022}.nl-map-legend span::before{content:\"\";display:inline-block;width:12px;margin-right:5px;border-top:2px solid #64d37f;vertical-align:middle}.nl-map-legend span:nth-child(2)::before{border-top:1px dashed #65886a}.nl-map-legend span:nth-child(3)::before{border-color:var(--gold)}.nl-zone{cursor:pointer;outline:none}.nl-zone .zone-circle{fill:#0e1d12;stroke:#519b61;stroke-width:1.2;transition:all .18s}.nl-zone text{fill:#94dda0;font:25px Georgia,serif}.nl-zone.active .zone-circle,.nl-zone:hover .zone-circle,.nl-zone:focus-visible .zone-circle{fill:#244e2c;stroke:#98ffac;stroke-width:2}.nl-zone.active text{fill:#e0ffe5}.nl-zone:focus-visible .halo{stroke:#b8ffc6;opacity:1}.nl-current{stroke:#69e484;stroke-width:3;fill:none;opacity:.82}.nl-channel{stroke:#52795a;stroke-width:1;fill:none}.nl-route{stroke:var(--gold);stroke-width:2;stroke-dasharray:4 5;fill:none;opacity:.8;animation:nl-route 22s linear infinite}.nl-gate{fill:#0b140e;stroke:#375f40}.nl-gate-label{fill:#7da988;font:10px ui-monospace,monospace}.nl-region{fill:#42634b;font:8px ui-monospace,monospace;letter-spacing:1.5px}\n.nl-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:15px}.nl-section-head h2{font:normal 23px Georgia,serif;letter-spacing:-.3px}.nl-section-head>span{font:10px ui-monospace,monospace;color:var(--muted)}.nl-families{display:flex;gap:15px;flex-wrap:wrap;margin-bottom:18px;font-size:10px;color:var(--muted)}.nl-family::before{content:\"\";display:inline-block;width:5px;height:5px;border-radius:50%;margin:0 6px 2px 0;background:var(--green)}.nl-family.amphi::before{background:var(--gold)}.nl-family.xeno::before{background:var(--violet)}.nl-table{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.nl-tile{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-width:0;min-height:79px;padding:8px!important;border:1px solid #2c4935!important;border-radius:4px!important;background:linear-gradient(135deg,#172c1b80,#111b1480)!important;text-align:left;transition:background .15s,transform .15s;--tone:var(--green);color:var(--tone)!important}.nl-tile.amphi{--tone:var(--gold);border-color:#403c2d!important;background:linear-gradient(135deg,#29261b80,#17191480)!important}.nl-tile.xeno{--tone:var(--violet);border-color:#3b3445!important;background:linear-gradient(135deg,#251e3080,#17151c80)!important}.nl-tile:hover{transform:translateY(-2px);border-color:var(--tone)!important}.nl-tile.active{outline:1px solid var(--tone);outline-offset:2px;background:#25442c!important;box-shadow:0 0 22px #78f59a0b}.nl-tile.filtered{opacity:.2}.nl-tile-top{display:flex;justify-content:space-between;font:9px ui-monospace,monospace;opacity:.7}.nl-tile strong{font:normal 14px/1.2 Georgia,serif;overflow-wrap:anywhere;letter-spacing:-.2px;margin:6px 0}.nl-tile small{font:9px ui-monospace,monospace;opacity:.65}.nl-observed{width:4px;height:4px;border-radius:50%;background:currentColor;margin-top:2px}.nl-table-note{font:11px/1.7 Georgia,serif;color:var(--muted);padding-top:18px}.nl-inspector{border-left:1px solid var(--line);padding-left:24px;min-width:0}.nl-inspector h2{font:normal 38px/1.12 Georgia,serif;letter-spacing:-1px;margin:10px 0;overflow-wrap:anywhere}.nl-epithet{font:italic 15px/1.5 Georgia,serif;color:#b2c4b3}.nl-pair{display:flex;justify-content:space-between;align-items:center;margin:20px 0;padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.nl-pair strong{font:28px Georgia,serif;color:var(--green);letter-spacing:5px}.nl-pair span{font:9px/1.8 ui-monospace,monospace;color:var(--muted);text-align:right}.nl-prose{font:14px/1.8 Georgia,serif;color:#c1cec1;margin:14px 0!important;overflow-wrap:anywhere}.nl-meta{font-size:10px;color:var(--muted);line-height:1.8}.nl-detail-label{font:9px ui-monospace,monospace;letter-spacing:.11em;text-transform:uppercase;color:var(--muted);margin:24px 0 10px}.nl-rite{display:block;border:1px solid var(--line)!important;border-radius:4px;margin:6px 0;padding:10px!important;width:100%;text-align:left}.nl-rite.active{border-color:#74694d!important;color:var(--gold)}.nl-rite strong{font:11px ui-monospace,monospace}.nl-rite small{display:block;margin-top:5px;color:var(--muted);font-size:10px;line-height:1.7}.nl-encounter{padding:13px 0;border-top:1px solid var(--line)}.nl-encounter h3{font:normal 16px/1.4 Georgia,serif;margin:5px 0}.nl-encounter p{font-size:11px;line-height:1.75;color:var(--muted);margin:9px 0}.nl-textbutton{font-size:10px!important;color:var(--green)!important;padding:5px 0!important}.nl details{border-top:1px solid var(--line);padding:12px 0;margin-top:15px}.nl summary{font-size:11px;color:var(--muted);cursor:pointer}.nl pre{white-space:pre-wrap;font:11px/1.7 ui-monospace,monospace;color:var(--muted);overflow-wrap:anywhere}.nl-button{display:inline-flex;gap:9px;align-items:center;justify-content:center;padding:10px 14px!important;border:1px solid #385341!important;border-radius:5px;font-size:11px!important;color:var(--green)!important;background:#78f59a08!important}.nl-button.primary{background:var(--green)!important;color:#0a2112!important;border-color:var(--green)!important}.nl-button.primary:hover{background:#a2ffb8!important}.nl-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.nl-empty{color:var(--muted);font:14px/1.8 Georgia,serif;padding:25px 5px}.nl-countnote{font-size:10px;color:var(--muted);padding:14px 0}.nl-footer{display:flex;gap:15px;justify-content:space-between;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:18px;margin-top:28px;font:9px/1.8 ui-monospace,monospace;color:#859b8c}.nl-footer b{font-weight:normal;color:var(--green)}.nl-warning{border:1px solid #74694d;padding:12px;margin-bottom:18px;color:var(--gold);font-size:12px}\n.nl-explore{display:grid;grid-template-columns:240px minmax(300px,1fr) 290px;gap:25px;align-items:start}.nl-subjects{max-height:830px;overflow:auto;scrollbar-width:thin;scrollbar-color:#344739 transparent}.nl-subject{display:block;width:100%;text-align:left;border-bottom:1px solid var(--line)!important;padding:15px 10px!important;border-left:2px solid transparent!important}.nl-subject.active{border-left-color:var(--green)!important;background:#78f59a09}.nl-subject strong{display:block;font:normal 16px/1.4 Georgia,serif;margin-bottom:6px}.nl-subject small{display:block;color:var(--muted);font-size:10px;line-height:1.7}.nl-subject .nl-badge{display:inline-block;margin-top:7px;font:8px ui-monospace,monospace;color:#92c99e}.nl-subject-head h2{font:normal 34px/1.2 Georgia,serif;letter-spacing:-.8px;margin:8px 0}.nl-subject-head>p{font:12px/1.7 sans-serif;color:var(--muted)}.nl-path-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:23px 0 12px}.nl-path-controls label{font:10px ui-monospace,monospace;color:var(--muted)}.nl-timeline{display:flex;gap:6px;overflow:auto;padding:10px 2px 14px;scrollbar-width:thin;scrollbar-color:#344739 transparent}.nl-step{min-width:104px;max-width:145px;flex:0 0 120px;border-top:2px solid #35513f!important;text-align:left;padding:12px 8px!important;color:var(--muted)!important}.nl-step.active{border-top-color:var(--green)!important;background:#78f59a0a;color:var(--text)!important}.nl-step.unobserved{border-top-style:dashed!important;opacity:.7}.nl-step strong{display:block;font:normal 13px/1.4 Georgia,serif;margin:7px 0}.nl-step small{display:block;font:9px/1.6 ui-monospace,monospace}.nl-frame{border:1px solid var(--line);border-radius:6px;padding:20px;margin-top:6px}.nl-frame h3{font:normal 22px/1.35 Georgia,serif;margin:8px 0}.nl-chips{display:flex;flex-wrap:wrap;gap:6px;margin:15px 0}.nl-chip{border:1px solid #35533c!important;border-radius:3px;padding:7px 9px!important;color:var(--green)!important;font-size:11px!important}.nl-heatmap{overflow:auto;margin-top:22px;padding-bottom:8px;scrollbar-width:thin}.nl-heat-grid{display:grid;gap:4px;align-items:center;width:max-content;min-width:100%}.nl-heat-label{font:11px Georgia,serif;white-space:nowrap;padding-right:12px}.nl-heat-cell{width:25px;height:19px!important;min-width:25px;background:#1b251e!important;border:1px solid #2d3c31!important;border-radius:2px}.nl-heat-cell.observed{background:#66c782!important;border-color:#72de90!important}.nl-heat-cell.missing{background:repeating-linear-gradient(135deg,transparent 0px,transparent 3px,#26372b 3px,#26372b 4px)!important}.nl-heat-cell.active{outline:1px solid #e2f8e8;outline-offset:1px}.nl-heat-index{font:8px ui-monospace,monospace;text-align:center;color:var(--muted)}.nl-side-map .nl-map svg{height:465px}.nl-order-note{font:11px/1.75 sans-serif;color:var(--muted);margin:12px 0!important}.nl-runs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.nl-run{border:1px solid var(--line);padding:21px;border-radius:6px;background:linear-gradient(120deg,#17251a60,#101712);min-width:0}.nl-run h2{font:normal 22px/1.3 Georgia,serif;overflow-wrap:anywhere;margin:10px 0}.nl-run .nl-chips{margin:15px 0}.nl-run .nl-chip{font-size:10px!important;padding:5px 7px!important}.nl-run-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--line);padding-top:14px;margin-top:15px}.nl-pager{display:flex;justify-content:center;align-items:center;gap:20px;margin-top:25px}.nl-pager span{color:var(--muted);font-size:11px}\n@keyframes nl-route{to{stroke-dashoffset:-180}}\n@container(min-width:1450px){.nl-table{grid-template-columns:repeat(9,minmax(0,1fr))}.nl-tile{min-height:96px}.nl-atlas{grid-template-columns:minmax(300px,.85fr) minmax(660px,1.7fr) minmax(275px,.8fr)}.nl-map svg{height:590px}.nl-explore{grid-template-columns:280px minmax(450px,1fr) 350px}}\n@container(max-width:1100px){.nl-atlas{grid-template-columns:minmax(220px,.75fr) minmax(340px,1.25fr)}.nl-inspector{grid-column:1/-1;border-left:0;border-top:1px solid var(--line);padding:23px 0;columns:2;column-gap:35px}.nl-inspector>*{break-inside:avoid}.nl-map svg{height:630px}.nl-explore{grid-template-columns:210px minmax(300px,1fr)}.nl-side-map{grid-column:1/-1}.nl-side-map .nl-map{display:grid;grid-template-columns:1fr 1fr}.nl-side-map .nl-map svg{grid-row:1/4;height:460px}.nl-side-map .nl-map-top{grid-column:2;grid-row:1}.nl-side-map .nl-map-foot,.nl-side-map .nl-map-legend{grid-column:2}.nl-runs{grid-template-columns:repeat(2,minmax(0,1fr))}.nl-tabs{gap:0}.nl-tab{padding:9px 10px!important}.nl-toolbar{flex-wrap:wrap}.nl-search{max-width:none}}\n@container(max-width:650px){.nl-topactions{gap:14px;flex-wrap:wrap}.nl-toolbar{gap:9px}.nl-tabs{width:100%;justify-content:space-between}.nl-tab{padding:8px 9px!important;font-size:12px!important}.nl-search{margin-left:0}.nl-atlas{grid-template-columns:1fr}.nl-map{display:grid;grid-template-columns:1fr 1fr}.nl-map svg{grid-column:1;grid-row:1/4;height:365px}.nl-map-top{grid-column:2;grid-row:1;align-items:flex-start;padding:25px 15px 0;gap:10px}.nl-map-foot{grid-column:2;border-top:0;align-self:center}.nl-map-legend{grid-column:2;border-top:0;align-self:end;padding-bottom:25px;gap:10px}.nl-map-top button{white-space:nowrap}.nl-table{grid-template-columns:repeat(5,minmax(0,1fr))}.nl-tile{min-height:86px}.nl-inspector{columns:1}.nl-explore{grid-template-columns:1fr}.nl-subjects{display:flex;max-height:160px;border-bottom:1px solid var(--line);gap:8px;padding-bottom:12px}.nl-subject{flex:0 0 170px;border:1px solid var(--line)!important;padding:12px!important}.nl-subject strong{font-size:14px}.nl-subject.active{border-color:#60986d!important}.nl-side-map{grid-column:auto}.nl-side-map .nl-map svg{height:365px}.nl-runs{grid-template-columns:1fr}.nl-frame{padding:15px}}\n@media(max-width:550px){.nl{padding:0 16px 22px}.nl-topactions{margin-left:0;gap:16px}.nl-topactions .nl-link{font-size:10px!important}.nl-tile strong{font-size:13px}.nl-footer{font-size:8px}}\n@media(prefers-reduced-motion:reduce){.nl *{animation:none!important;transition:none!important}}\n.nl-question{padding:18px 22px;background:linear-gradient(100deg,#1736224d,#0f1c144d);border:1px solid #355340;border-radius:7px}.nl-question>div{display:flex;gap:16px;align-items:center;margin:8px 0}.nl-question input{background:transparent;border:0;outline:0;font:normal 22px/1.3 Georgia,serif;padding:5px 0;width:100%;min-width:0}.nl-question input::placeholder{color:#8ba092}.nl-question:focus-within{border-color:#73be88}.nl-question .nl-button{flex:none}.nl-scopebar{display:grid;grid-template-columns:1.1fr 1.4fr 1fr 90px 90px;gap:12px;padding:20px 0 14px}.nl-scopebar label,.nl-save-study label{display:flex;flex-direction:column;gap:7px;font-size:10px;color:var(--muted)}.nl-scopebar select{width:100%;padding:9px;font-size:12px}.nl-scopebar input,.nl-save-study input{width:100%;background:#101712;border:1px solid var(--line);border-radius:4px;color:var(--text);padding:9px;font-size:12px}.nl-scope-summary{display:flex;gap:18px;justify-content:space-between;align-items:center;flex-wrap:wrap;padding-bottom:18px;margin-bottom:20px;border-bottom:1px solid var(--line);color:var(--muted);font-size:11px}.nl-scope-summary strong{font-weight:500;color:var(--text)}.nl-scope-summary b{font-weight:500;color:var(--green)}.nl input[type=checkbox]{accent-color:#78f59a}.nl-study-layout{display:grid;grid-template-columns:minmax(210px,.8fr) minmax(420px,1.8fr) minmax(230px,.85fr);gap:24px;align-items:start}.nl-selection-tools{display:flex;gap:17px;border-bottom:1px solid var(--line);padding-bottom:9px}.nl-host-list{max-height:760px;overflow:auto;scrollbar-width:thin;scrollbar-color:#35513f transparent}.nl-host{display:flex;gap:9px;align-items:flex-start;padding:12px 8px 12px 2px;border-bottom:1px solid #203026}.nl-host.active{background:#78f59a0a}.nl-host>input{margin-top:4px;cursor:pointer}.nl-host>button{text-align:left;padding:0;min-width:0;flex:1}.nl-host strong{display:block;font:normal 14px/1.4 Georgia,serif;margin:6px 0;color:#d4e2d6;overflow-wrap:anywhere}.nl-host small{display:block;font:9px/1.6 ui-monospace,monospace;color:#9aad9e}.nl-host span{display:block;font-size:9px;color:#7c9383;line-height:1.5;margin-bottom:6px}.nl-host .read{color:#83d097}.nl-host .unread{color:#b7aa8a}.nl-study-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:23px}.nl-study-actions .nl-button{padding:9px 11px!important}.nl-study-transport{display:flex;align-items:center;gap:12px;margin:18px 0 5px}.nl-study-transport input{accent-color:#78f59a;flex:1;min-width:0}.nl-study-transport .nl-button{padding:5px 9px!important}.nl-study-transport span{font:10px ui-monospace,monospace;color:var(--muted);min-width:45px}.nl-study-main .nl-heatmap{max-width:100%;margin:18px 0 8px}.nl-study-main .nl-frame{margin-top:24px}.nl-study-main .nl-section-head h2{font-size:25px}.nl-study-map{position:sticky;top:20px}.nl-study-map .nl-map svg{height:475px}.nl-comparison{margin-top:24px;border:1px solid #46684e;background:#15321e33;border-radius:5px;padding:18px}.nl-comparison h3{font:normal 22px Georgia,serif;color:var(--green)}.nl-deltas{display:grid;grid-template-columns:1fr;gap:12px;margin-top:17px}.nl-deltas>div>span{font:9px ui-monospace,monospace;color:var(--muted)}.nl-deltas .nl-chips{margin:7px 0 0}.nl-deltas small{color:var(--muted)}.nl-save-study{margin-top:26px;padding:22px;border:1px solid var(--line);border-radius:5px}.nl-save-study select{width:100%;font-size:12px;padding:9px}.nl-save-study .nl-meta{margin-top:12px}.nl-companion{margin-top:15px}.nl-companion h3{font:normal 20px/1.4 Georgia,serif;margin:15px 0 8px}.nl-companion p{font:13px/1.8 Georgia,serif;color:#c0cebf;margin:10px 0}.nl-companion .nl-meta{font:10px/1.8 sans-serif;color:var(--muted)}.nl-companion h4{font:11px ui-monospace,monospace;color:#a4c9ad;margin:21px 0 10px}.nl-companion summary{color:#b6d8be}\n@container(min-width:1200px){.nl-table{grid-template-columns:repeat(9,minmax(0,1fr))}.nl-tile{min-height:88px;padding:6px!important}.nl-tile strong{font-size:12px}.nl-inspector{max-height:690px;overflow:auto;scrollbar-width:thin;scrollbar-color:#344739 transparent;padding-right:8px}.nl-atlas{grid-template-columns:minmax(270px,.85fr) minmax(610px,1.75fr) minmax(235px,.8fr)}}\n@container(max-width:1100px){.nl-study-layout{grid-template-columns:210px minmax(300px,1fr)}.nl-study-map{grid-column:1/-1;position:static}.nl-study-map .nl-map{display:grid;grid-template-columns:1fr 1fr}.nl-study-map .nl-map svg{grid-row:1/4;height:460px}.nl-study-map .nl-map-top{grid-column:2;grid-row:1}.nl-study-map .nl-map-foot,.nl-study-map .nl-map-legend{grid-column:2}.nl-scopebar{grid-template-columns:1fr 1.2fr 1fr 75px 75px;gap:8px}.nl-question input{font-size:21px}.nl-host-list{max-height:900px}}\n@container(max-width:650px){.nl-study-layout{grid-template-columns:1fr}.nl-selection{border:1px solid var(--line);border-radius:5px;padding:12px}.nl-selection .nl-section-head{margin-bottom:4px}.nl-host-list{max-height:240px}.nl-host{padding-top:8px;padding-bottom:8px}.nl-host strong{margin:4px 0}.nl-host span{display:none}.nl-study-map{grid-column:auto;grid-row:2}.nl-study-map .nl-map svg{height:330px}.nl-study-main{grid-row:3}.nl-scopebar{grid-template-columns:1fr 1fr}.nl-scopebar label:nth-child(2){grid-column:2}.nl-scopebar label:nth-child(3){grid-column:1/-1}.nl-question{padding:16px}.nl-question input{font-size:19px}.nl-question>div{flex-wrap:wrap;gap:8px}.nl-question .nl-button{margin-left:auto}.nl-scope-summary{gap:9px;font-size:10px}.nl-tabs{overflow:auto;justify-content:flex-start;gap:0}.nl-tab{white-space:nowrap;padding:8px!important;font-size:11px!important}.nl-study-actions{gap:5px}.nl-study-actions .nl-button{font-size:10px!important}.nl-study-map .nl-map-top{padding-top:18px}}\n.nl-study-main,.nl-selection,.nl-study-map{min-width:0}.nl-host-search{width:100%;margin-bottom:9px;padding:8px;border:1px solid var(--line);border-radius:4px;background:#101712;font-size:11px!important}.nl-question{padding:12px 17px}.nl-question>.nl-kicker{display:none}.nl-question>div{margin:0 0 6px}.nl-question>p{font-size:10px}.nl-question input{font-size:21px}.nl-scopebar{padding-top:16px}.nl-study-main .nl-encounter details p{margin-top:12px}\n.nl-matrix-pages{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:18px}.nl-matrix-pages span{font:9px ui-monospace,monospace;color:var(--muted)}\n/* Chamber notebooks keep the source, interpretation and correspondence distinct. */\n.nl-chamber-heading{display:flex;justify-content:space-between;gap:24px;align-items:center;margin:5px 0 24px}.nl-chamber-heading h2{font:normal 49px/1.2 Georgia,serif;letter-spacing:-1px;margin:8px 0}.nl-chamber-heading h2 span{display:inline-block;font:24px Georgia,serif;color:var(--green);letter-spacing:3px;margin-left:22px}.nl-chamber-heading>label{display:flex;flex-direction:column;gap:6px;min-width:180px}.nl-chamber-heading select{padding:10px}.nl-chamber-layout{display:grid;grid-template-columns:minmax(215px,.7fr) minmax(450px,2.3fr);gap:35px;align-items:start}.nl-chamber-sidebar,.nl-chamber-main{min-width:0}.nl-chamber-sidebar{border-right:1px solid var(--line);padding-right:26px}.nl-chamber-counts{display:flex;gap:18px;flex-wrap:wrap;padding:15px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.nl-chamber-counts span{font-size:9px;color:var(--muted)}.nl-chamber-counts b{display:block;font:26px Georgia,serif;color:var(--green);margin-bottom:4px}.nl-concept-cloud{display:flex;flex-wrap:wrap;gap:6px}.nl-concept-cloud button{font-size:11px;line-height:1.5;padding:6px 8px;border:1px solid #2c4735;border-radius:4px;text-align:left;color:#c4d8c8}.nl-concept-cloud button.active{border-color:var(--green);color:var(--green)}.nl-concept-cloud small{color:var(--muted);margin-left:6px}.nl-author-list{max-height:230px;overflow:auto;scrollbar-width:thin}.nl-author-list button{display:flex;justify-content:space-between;gap:8px;width:100%;font:13px/1.6 Georgia,serif;text-align:left;padding:8px 0;border-bottom:1px solid #203127}.nl-author-list button.active{color:var(--green)}.nl-author-list span{font:10px ui-monospace,monospace;color:var(--muted)}.nl-chamber-map{margin-top:24px}.nl-chamber-map .nl-map svg{height:390px}.nl-chamber-tabs{display:flex;gap:25px;border-bottom:1px solid var(--line);margin-bottom:24px;overflow:auto;white-space:nowrap}.nl-chamber-tabs button{font:15px Georgia,serif;padding:12px 0;border-bottom:2px solid transparent;color:var(--muted)}.nl-chamber-tabs button.active{color:var(--green);border-color:var(--green)}.nl-chamber-filter{display:grid;grid-template-columns:minmax(200px,1.5fr) minmax(135px,1fr) minmax(140px,1fr) 75px 75px;gap:10px}.nl-chamber-filter label{display:flex;flex-direction:column;gap:7px;font-size:10px;color:var(--muted)}.nl-chamber-filter input{min-width:0;width:100%;background:#101712;border:1px solid var(--line);border-radius:4px;padding:9px;font-size:12px}.nl-chamber-filter select{height:36px;padding:7px;font-size:11px}.nl-chamber-options{display:flex;flex-wrap:wrap;gap:9px 18px;align-items:center;margin:13px 0 20px;font-size:10px;color:var(--muted)}.nl-focus-reading{border:1px solid #46634c;padding:12px 15px;font-size:11px;color:#b8d9c1;margin-bottom:16px;overflow-wrap:anywhere}.nl-focus-reading button{margin-left:10px}.nl-year-band{display:flex;gap:0;overflow:auto;scrollbar-width:thin;margin:20px 0 27px}.nl-year-band>div{min-width:82px;border-left:1px solid #34573e;border-top:2px solid #70c68a;background:linear-gradient(#27483033,transparent);padding:12px 13px;flex:none}.nl-year-band strong{display:block;font:15px Georgia,serif;color:#cde8d2;white-space:nowrap}.nl-year-band span{display:block;font:9px ui-monospace,monospace;color:var(--muted);margin-top:8px}.nl-chamber-encounter{display:grid;grid-template-columns:105px minmax(0,1fr);gap:24px;border-top:1px solid var(--line);padding:25px 0}.nl-chamber-encounter:first-of-type{margin-top:20px}.nl-encounter-date{border-left:2px solid #496e53;padding-left:12px}.nl-encounter-date strong{display:block;font:19px/1.3 Georgia,serif;color:var(--green)}.nl-encounter-date span{display:block;font:9px ui-monospace,monospace;color:var(--muted);margin-top:4px}.nl-encounter-date small{display:block;font:9px/1.8 sans-serif;color:var(--muted);margin-top:18px}.nl-chamber-encounter h3,.nl-hypothesis h3{font:normal 25px/1.35 Georgia,serif;letter-spacing:-.3px;margin:8px 0}.nl-chamber-encounter .nl-actions{gap:20px;margin-bottom:0}.nl-chamber-encounter .nl-prose{max-width:78ch}.nl-learning-list{padding-left:18px;font:14px/1.8 Georgia,serif;color:#bfcec2}.nl-learning-list li{margin-bottom:8px}.nl-hypothesis{padding:25px 0;border-bottom:1px solid var(--line)}.nl-concept-evidence{padding:12px 0;border-top:1px solid var(--line)}\n@container(max-width:1200px){.nl-chamber-filter{grid-template-columns:1fr 1fr 1fr}.nl-chamber-filter label:first-child{grid-column:1/-1}.nl-chamber-filter label:nth-last-child(-n+2){max-width:120px}.nl-chamber-layout{grid-template-columns:205px minmax(300px,1fr);gap:24px}.nl-chamber-sidebar{padding-right:18px}.nl-chamber-encounter{grid-template-columns:85px minmax(0,1fr);gap:15px}}\n@container(max-width:800px){.nl-chamber-layout{grid-template-columns:1fr}.nl-chamber-sidebar{border-right:0;padding-right:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}.nl-chamber-counts{grid-column:1/-1}.nl-chamber-sidebar>.nl-detail-label{margin:8px 0;grid-column:1/-1}.nl-concept-cloud,.nl-author-list{grid-column:1/-1}.nl-chamber-map{grid-column:1/-1;grid-row:auto;margin-top:12px}.nl-chamber-map .nl-map{display:grid;grid-template-columns:1fr 1fr}.nl-chamber-map .nl-map svg{grid-column:1;grid-row:1/4;height:300px}.nl-chamber-map .nl-map-top{grid-column:2;grid-row:1}.nl-chamber-map .nl-map-foot,.nl-chamber-map .nl-map-legend{grid-column:2}.nl-chamber-sidebar>.nl-rite,.nl-chamber-sidebar>details{display:none}.nl-chamber-main{grid-row:1}.nl-chamber-heading h2{font-size:38px}.nl-chamber-heading{align-items:flex-start;gap:15px}.nl-chamber-heading h2 span{font-size:20px;margin-left:12px}.nl-chamber-heading>label{min-width:150px}.nl-chamber-sidebar{border-top:1px solid var(--line);padding-top:20px}}\n@container(max-width:480px){.nl-chamber-heading{flex-direction:column}.nl-chamber-heading>label{width:100%}.nl-chamber-filter{grid-template-columns:1fr 1fr}.nl-chamber-filter label:nth-child(3){grid-column:1/-1}.nl-chamber-encounter{grid-template-columns:1fr;gap:12px}.nl-encounter-date{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.nl-encounter-date small{margin-top:0;margin-left:auto}.nl-chamber-tabs{gap:18px}.nl-chamber-tabs button{font-size:13px}.nl-chamber-encounter h3{font-size:22px}}\n@container(min-width:481px) and (max-width:800px){.nl-chamber-filter{grid-template-columns:minmax(120px,1fr) minmax(135px,1fr) 76px 76px}.nl-chamber-filter label:first-child{grid-column:1/-1}.nl-chamber-filter label:nth-last-child(-n+2){max-width:none}}\n/* Local controls retain their viewport position when a reading is replaced. */\n.nl [data-content]{overflow-anchor:none}\n.nl-review-notes{margin:14px 0;padding:10px 12px;border:1px solid #625b3e;border-radius:4px;background:#d4c09208;overflow-wrap:anywhere}\n.nl-review-notes>summary{color:var(--gold);cursor:pointer;font-size:11px}\n.nl-review-notes>div{margin-top:12px}.nl-review-notes .nl-prose{font-size:12px;line-height:1.6}\n.nl-review-notes details{margin-top:8px}.nl-review-notes details summary{cursor:pointer;font-size:10px;color:var(--muted)}\n.nl-review-notes pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.6 ui-monospace,monospace;color:var(--muted)}\n\n/* Connected research pages for the diagram's structures. */\n.nl-anatomy{display:grid;grid-template-columns:190px minmax(320px,1fr) 285px;gap:28px;align-items:start}\n.nl-structure-nav,.nl-structure-aside{position:sticky;top:20px;min-width:0}\n.nl-structure-main{min-width:0}\n.nl-structure-kinds{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:15px 0}\n.nl-structure-kinds .nl-tab{display:flex;align-items:center;justify-content:space-between;padding:8px!important;font-size:11px!important;text-align:left}\n.nl-structure-kinds small{color:var(--muted);font:9px ui-monospace,monospace}\n.nl-structure-list{max-height:65dvh;overflow:auto;scrollbar-width:thin;scrollbar-color:#35513f transparent}\n.nl-structure-item{display:block;text-align:left;width:100%;padding:13px 10px!important;border-bottom:1px solid var(--line)!important;border-left:2px solid transparent!important}\n.nl-structure-item.active{border-left-color:var(--green)!important;background:#78f59a0b}\n.nl-structure-item strong{display:block;font:normal 16px/1.4 Georgia,serif;color:var(--text)}\n.nl-structure-item small{display:block;font-size:10px;color:var(--muted);margin-top:4px}\n.nl-structure-item>span{display:block;font:9px ui-monospace,monospace;color:#87ba93;margin-top:7px}\n.nl-structure-heading{padding:12px 0 24px}\n.nl-structure-heading h2{font:normal 40px/1.15 Georgia,serif;letter-spacing:-1px;margin:10px 0 18px}\n.nl-structure-heading>p{font:14px/1.85 Georgia,serif;color:#b4c7b8;max-width:760px}\n.nl-structure-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;border:1px solid var(--line);background:var(--line);border-radius:6px;overflow:hidden}\n.nl-structure-facts>div{padding:15px;background:#101a13;min-width:0}\n.nl-structure-facts span{display:block;font:9px ui-monospace,monospace;letter-spacing:.04em;color:var(--muted)}\n.nl-structure-facts strong{display:block;font:normal 18px/1.5 Georgia,serif;color:#a5e4b2;overflow-wrap:anywhere;margin-top:7px}\n.nl-structure-section{border-top:1px solid var(--line);padding-top:23px;margin-top:28px}\n.nl-structure-section h3{font:normal 24px/1.3 Georgia,serif;margin:0}\n.nl-structure-section h4{font:11px ui-monospace,monospace;color:var(--muted);font-weight:400;margin:22px 0 8px}\n.nl-structure-section .nl-section-head{margin-bottom:16px}\n.nl-structure-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}\n.nl-structure-link{min-width:0;text-align:left;border:1px solid #2d4233!important;border-radius:4px;padding:10px 12px!important;background:#11241940!important}\n.nl-structure-link:hover{border-color:#679e76!important}\n.nl-structure-link strong{display:block;font:normal 14px/1.45 Georgia,serif;overflow-wrap:anywhere}\n.nl-structure-link small{display:block;margin-top:4px;font:9px/1.5 ui-monospace,monospace;color:var(--muted)}\n.nl-related-rites{margin-top:15px}\n.nl-related-rites .nl-structure-links{max-height:360px;overflow:auto;margin-top:13px;scrollbar-width:thin}\n.nl-structure-source{padding:12px 0;border-bottom:1px solid #203026}\n.nl-structure-source summary{color:#a6d0af;cursor:pointer;font-size:12px;line-height:1.6}\n.nl-structure-source blockquote{border-left:2px solid #486c50;padding:0 0 0 16px;margin:15px 0;font:13px/1.85 Georgia,serif;color:#b8c6b8;white-space:pre-wrap}\n.nl-structure-source a{font-size:10px}\n.nl-structure-source .nl-meta{margin-top:12px}\n.nl-anatomy-filters{display:flex;gap:12px;align-items:center;flex-wrap:wrap}\n.nl-anatomy-filters>input{flex:1;min-width:160px;margin:0}\n.nl-anatomy-filters>label{white-space:nowrap}\n.nl-structure-encounter{padding:20px 0;border-bottom:1px solid var(--line)}\n.nl-structure-encounter.active{border-left:2px solid var(--gold);padding-left:15px}\n.nl-structure-encounter h3{font:normal 20px/1.4 Georgia,serif;margin:8px 0}\n.nl-route-sequence{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:14px 0}\n.nl-route-sequence>button{border:1px solid #344c3b!important;border-radius:3px;width:27px;height:29px;font:normal 17px Georgia,serif;color:var(--muted)}\n.nl-route-sequence>button.active{background:#21412b;border-color:#72bb85!important;color:#c0f9cb}\n.nl-route-sequence>span{color:#5d7b65;font-size:11px}\n.nl-structure-encounter .nl-actions{margin-top:15px}\n.nl-structure-encounter details{margin-top:14px}\n.nl-structure-aside .nl-map svg{height:450px}\n.nl-evolving{margin-top:22px;border:1px solid var(--line);border-radius:6px;padding:20px;background:#121e1644}\n.nl-evolving h3{font:normal 24px/1.3 Georgia,serif;margin:10px 0}\n.nl-evolving .nl-actions{gap:12px;margin:16px 0;flex-wrap:wrap}\n.nl-evolving details{margin-top:17px;font-size:11px;color:var(--muted)}\n.nl-evolving details p{font:12px/1.8 Georgia,serif;margin-top:13px}\n.nl-map-link{cursor:pointer;outline:none}\n.nl-map-hit{stroke:transparent;stroke-width:14px;fill:none;pointer-events:stroke}\n.nl-syzygy{stroke:#41694b;stroke-dasharray:2 4;opacity:.7;fill:none}\n.nl-map-tools{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px 12px}\n.nl-map-editable .nl-map-tools button:not(:disabled){color:#c8dec9}\n.nl-map-editable .nl-map-tools button:disabled{opacity:.45;cursor:default}\n.nl-map-editable svg{touch-action:none}\n.nl-map-editable [data-map-drag]{cursor:grab;user-select:none}\n.nl-map-editable .nl-map-dragging,.nl-map-editable .nl-map-dragging [data-map-drag]{cursor:grabbing}\n.nl-map-editable [data-map-drag] .nl-map-hit{stroke-width:22px}\n.nl-map-editable [data-map-drag] .nl-syzygy{stroke:#88a59a;opacity:.85}\n.nl-map-drag-hint{display:block;margin-top:7px;color:#96aa9b;font:11px/1.5 system-ui,sans-serif}\n.nl-map-editable .nl-route{animation:none;pointer-events:none;opacity:.9;stroke-width:2}\n.nl-map-editable .nl-rite-stop{fill:none;stroke:#e5c482;stroke-width:1;stroke-dasharray:2 3;pointer-events:none}\n.nl-map-legend .nl-map-key-syzygy::before{border-top:1px dotted #88a59a}\n.nl-map-legend .nl-map-key-rite::before{border-color:var(--gold)}\n.nl-route-tracer{fill:none;stroke:#ffedba;stroke-width:3;stroke-linecap:round;stroke-dasharray:5 95;stroke-dashoffset:100;pointer-events:none;filter:drop-shadow(0 0 4px #e5c482);animation:nl-route-tracer 4.5s linear var(--trace-delay,0s) infinite}\n@keyframes nl-route-tracer{to{stroke-dashoffset:0}}\n@media(prefers-reduced-motion:reduce){.nl-route-tracer{display:none}}\n/* The untouched instrument shows the original plate. Its movable drawing uses the same ink and positions. */\n.nl .nl-pen-map {display:block;position:relative;overflow:visible;background:#000;border:0;border-radius:0;color:#24ff11}\n.nl .nl-pen-map svg {display:block;touch-action:none}\n.nl-pen-map .has-reference:not(.rearranged) .nl-pen-vector,\n.nl-pen-map .rearranged .nl-pen-reference {display:none}\n.nl-pen-map .nl-pen-reference,.nl-pen-map .nl-pen-vector {pointer-events:none}\n.nl-pen-map .nl-pen-channel {fill:none;stroke:#24ff11;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\n.nl-pen-map .nl-pen-current,.nl-pen-map .nl-pen-current-haze {fill:none;stroke-width:23;stroke-linecap:round}\n.nl-pen-map .nl-pen-current-haze {stroke:#14e800;opacity:.17}\n.nl-pen-map .nl-pen-zone ellipse,.nl-pen-map .nl-pen-gate ellipse {fill:#000;stroke:#25ff12;stroke-width:2}\n.nl-pen-map .nl-pen-zone ellipse {stroke-dasharray:27 1 34 1 15 .7;stroke-linecap:round}\n.nl-pen-map .nl-pen-zone text,.nl-pen-map .nl-pen-gate text {fill:#29ff18;text-anchor:middle;dominant-baseline:middle;font-family:\"Bradley Hand\",\"Comic Sans MS\",cursive;font-weight:bold;font-size:24px}\n.nl-pen-map .nl-pen-gate text {font-size:16px}\n.nl-pen-map .nl-pen-zone path {fill:#23ff12}\n.nl-pen-map .nl-pen-hit {cursor:pointer;outline:none}\n.nl-pen-map .nl-pen-hit[data-map-drag] {cursor:grab;user-select:none}\n.nl-pen-map .nl-map-dragging,.nl-pen-map .nl-map-dragging [data-map-drag] {cursor:grabbing}\n.nl-pen-map .nl-pen-target {stroke:transparent}\n.nl-pen-map path.nl-pen-target {stroke-width:18px;pointer-events:stroke}\n.nl-pen-map circle.nl-pen-target {fill:transparent;stroke-width:2;pointer-events:all}\n.nl-pen-map .nl-pen-hit:hover .nl-pen-target,.nl-pen-map .nl-pen-hit:focus-visible .nl-pen-target,.nl-pen-map .nl-pen-hit.active .nl-pen-target {stroke:#b6ffae;opacity:.55}\n.nl-pen-map .nl-pen-hit:hover path.nl-pen-target,.nl-pen-map .nl-pen-hit:focus-visible path.nl-pen-target,.nl-pen-map .nl-pen-hit.active path.nl-pen-target {opacity:.22}\n.nl-pen-map .nl-route {animation:none;pointer-events:none;stroke:#a6ff95;stroke-width:2;opacity:.9}\n.nl-pen-map .nl-route-tracer {stroke:#ecffe8;filter:drop-shadow(0 0 5px #8aff71)}\n.nl .nl-pen-map > [data-map-reset] {position:absolute;bottom:7px;left:50%;translate:-50% 0;color:#8eea83;border:1px solid #1b5d13;border-radius:3px;background:#061105;padding:6px 9px;font:10px ui-monospace,monospace;white-space:nowrap}\n.nl .nl-pen-map > [data-map-reset]:disabled {display:none}\n.nl-map-link:hover .nl-channel,.nl-map-link:focus-visible .nl-channel,.nl-map-link.selected .nl-channel{stroke:#d4c092;stroke-width:2.5}\n.nl-map-link:hover .nl-gate,.nl-map-link:focus-visible .nl-gate,.nl-map-link.selected .nl-gate{fill:#24452c;stroke:#b3f7c2;stroke-width:2}\n.nl-map-link:hover .nl-gate-label,.nl-map-link:focus-visible .nl-gate-label,.nl-map-link.selected .nl-gate-label{fill:#d9fce0}\n.nl-map-link:hover .nl-current,.nl-map-link:focus-visible .nl-current,.nl-map-link.selected .nl-current{stroke:#c6ffd3;stroke-width:5}\n.nl-map-link:hover .nl-syzygy,.nl-map-link:focus-visible .nl-syzygy,.nl-map-link.selected .nl-syzygy{stroke:#c6ffd3;stroke-width:3;opacity:1}\n.nl-map-link:hover .nl-region,.nl-map-link:focus-visible .nl-region,.nl-map-link.selected .nl-region{fill:#d4c092}\n@container(max-width:1000px){.nl-anatomy{grid-template-columns:165px minmax(300px,1fr);gap:22px}.nl-structure-aside{grid-column:1/-1;position:static;display:grid;grid-template-columns:1fr 1fr;gap:20px}.nl-structure-aside>.nl-order-note{display:none}.nl-evolving{margin-top:0}.nl-structure-aside .nl-map svg{height:380px}}\n@container(max-width:650px){.nl-anatomy{grid-template-columns:1fr}.nl-structure-nav{position:static}.nl-structure-kinds{grid-template-columns:repeat(3,1fr)}.nl-structure-list{max-height:200px}.nl-structure-aside{grid-template-columns:1fr;grid-column:auto}.nl-structure-heading h2{font-size:32px}.nl-structure-facts strong{font-size:15px}.nl-structure-links{grid-template-columns:1fr}.nl-toolbar:has(.nl-tabs){flex-wrap:wrap}.nl-tabs{max-width:100%}}\n.nl-structure-facts>div:last-child:nth-child(odd){grid-column:1/-1}\n.nl-matrix-sources{margin-top:16px;color:var(--muted);font-size:11px}\n.nl-matrix-sources>summary{cursor:pointer}\n.nl-matrix-sources>.nl-structure-source{margin-left:12px}\n.nl-structure-permalink{display:inline-block;margin-top:15px;font-size:10px;color:var(--muted)!important}\n.nl-structure-aside{max-height:calc(100dvh - 95px);overflow-y:auto;scrollbar-width:thin;scrollbar-color:#35513f transparent}\n@container(max-width:1000px){.nl-structure-aside{max-height:none;overflow:visible}}\n.nl-learning-account{margin:23px 0;padding:20px;border:1px solid #3d6046;border-radius:6px;background:linear-gradient(135deg,#1c37252b,transparent)}\n.nl-learning-account h3{font:normal 24px Georgia,serif;margin:12px 0}\n.nl-learning-account .nl-button{margin:12px 0}.nl-learning-account details{margin:14px 0}\n.nl-author-lens{margin:15px 0 23px;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}\n.nl-author-lens-top{display:flex;gap:18px;flex-wrap:wrap;align-items:center}.nl-author-lens-top>span{font:10px ui-monospace,monospace;color:var(--muted)}\n.nl-author-lens p{font-size:10px;color:var(--muted);margin:10px 0 0}.nl-hidden-author{display:inline-flex;align-items:center;gap:9px;margin:12px 16px 0 0;font-size:11px;color:var(--muted)}\n.nl-author-reading-group{margin:20px 0 30px}.nl-author-reading-group>header{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:10px 0;border-bottom:1px solid #3a5843}\n.nl-author-reading-group>header>.nl-textbutton{font:normal 19px Georgia,serif!important}.nl-author-reading-group>header small{font:10px ui-monospace,monospace;margin-left:10px;color:var(--muted)}\n.nl-author-reading-group>header>span{display:flex;gap:13px}\n\n/* The same memory index opens both work and thinker chambers. */\n.nl-memory {\n  display:grid;\n  grid-template-columns:minmax(190px,.82fr) minmax(0,3.6fr);\n  gap:clamp(16px,2.2cqw,36px);\n  align-items:start;\n}\n.nl-memory-room,.nl-memory-index,.nl-memory-panel,.nl-memory-map,.nl-memory-path-map {min-width:0}\n.nl-memory-index {border:1px solid var(--line);border-radius:9px;background:#111a15;overflow:hidden}\n.nl-memory-index-head {padding:18px 16px 12px;border-bottom:1px solid var(--line)}\n.nl-memory-index h2 {font:normal 24px/1.2 Georgia,serif;margin:4px 0 15px}\n.nl-memory-search {display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid #395044;border-radius:5px;color:var(--muted);background:#0b130e}\n.nl-memory-search:focus-within {border-color:var(--green)}\n.nl-memory-search input {width:100%;min-width:0;padding:8px 0;border:0;background:transparent}\n.nl-memory-filters {display:flex;align-items:center;gap:4px;margin-top:10px;color:var(--muted);font-size:11px}\n.nl-memory-filters button {padding:5px 7px;border-radius:4px}\n.nl-memory-filters button[aria-pressed=true] {color:var(--green);background:#78f59a13}\n.nl-memory-filters>span {margin-left:auto;font:10px ui-monospace,monospace}\n.nl-memory-index-list {max-height:min(610px,62dvh);overflow:auto;scrollbar-width:thin;scrollbar-color:#3c5848 transparent}\n.nl-memory-index .nl-subject {width:100%;min-height:58px;padding:11px 14px!important;overflow-wrap:anywhere}\n.nl-memory-index .nl-subject:last-child {border-bottom:0!important}\n.nl-memory-index .nl-subject.active {background:#8fd4a317}\n.nl-memory-index .nl-subject strong {font-size:15px;margin-bottom:3px}\n.nl-memory-index .nl-subject .nl-badge {font-size:9px;margin-top:4px}\n.nl-memory-index .nl-empty {padding:14px}\n.nl-memory-index .nl-memory-more {display:block;width:100%;padding:12px!important}\n.nl-memory-hero {\n  padding:clamp(20px,3.3cqw,48px);\n  border:1px solid #42604d;\n  border-radius:9px;\n  background:radial-gradient(ellipse at 100% 0%,#426d4933,transparent 72%),linear-gradient(120deg,#17251d,#111915);\n}\n.nl-memory-hero>.nl-kicker {color:var(--gold)}\n.nl-memory-hero h2 {font:normal clamp(31px,4cqw,58px)/1.05 Georgia,serif;letter-spacing:-.035em;margin:12px 0;overflow-wrap:anywhere}\n.nl-memory-byline {display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;color:#b7c7bb;font-size:13px}\n.nl-memory-byline .nl-textbutton {font-size:13px!important;text-align:left}\n.nl-memory-stats {display:flex;gap:16px clamp(18px,3cqw,48px);flex-wrap:wrap;border-top:1px solid #46604e;margin-top:22px;padding-top:16px}\n.nl-memory-stats span {color:#b3c3b7;font-size:11px}\n.nl-memory-stats strong {display:block;color:var(--green);font:normal 28px/1.1 Georgia,serif;margin-bottom:4px}\n.nl-memory-actions {display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap;margin-top:18px}\n.nl-memory-presence,.nl-memory-ledgers {display:grid;gap:14px;margin-top:16px;align-items:start}\n.nl-memory-presence:has(.nl-memory-map) {grid-template-columns:minmax(0,1.5fr) minmax(220px,1fr)}\n.nl-memory-ledgers.paired {grid-template-columns:repeat(2,minmax(0,1fr))}\n.nl-memory-panel {border:1px solid var(--line);border-radius:8px;padding:clamp(14px,2cqw,25px);background:#111a15}\n.nl-memory-panel h3 {font:normal 25px/1.15 Georgia,serif;margin:5px 0 10px}\n.nl-memory-panel>p {font-size:12px}\n.nl-memory-demons {display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,151px),1fr));gap:7px;margin-top:14px}\n.nl-memory-demon,.nl-memory-work {\n  display:grid;\n  grid-template-columns:auto minmax(0,1fr) auto;\n  align-items:start;\n  gap:7px;\n  min-width:0;\n  padding:12px 10px;\n  border:1px solid #344a3b!important;\n  border-radius:5px;\n  text-align:left;\n  overflow-wrap:anywhere;\n  background:#121d16!important;\n}\n.nl-memory-demon:hover,.nl-memory-work:hover {border-color:#649375!important}\n.nl-memory-demon strong,.nl-memory-work strong {display:block;font:normal 16px/1.2 Georgia,serif}\n.nl-memory-demon small,.nl-memory-work small {display:block;color:#adbdaf;font-size:10px;margin-top:4px}\n.nl-memory-demon .nl-memory-span {color:var(--green);font:10px/1.9 ui-monospace,monospace}\n.nl-memory-demon.amphi .nl-memory-span {color:var(--gold)}\n.nl-memory-demon.xeno .nl-memory-span {color:var(--violet)}\n.nl-memory-arrow {color:var(--muted)}\n.nl-memory-work {grid-template-columns:minmax(0,1fr) auto;width:100%;margin-top:6px}\n.nl-memory-reading {display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;padding:11px 0;border-top:1px solid var(--line)}\n.nl-memory-reading h4 {font:normal 16px/1.3 Georgia,serif;margin:0 0 4px;overflow-wrap:anywhere}\n.nl-memory-empty {padding:13px 0;color:var(--muted);font:14px/1.65 Georgia,serif}\n.nl-memory-path {margin-top:16px;border:1px solid #344a3b;border-radius:8px;background:#101913}\n.nl-memory-path-toggle {width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px;text-align:left}\n.nl-memory-path-toggle strong {display:block;font:normal 20px/1.3 Georgia,serif;margin-top:4px}\n.nl-memory-path-toggle>span:last-child {color:var(--green);font-size:18px}\n.nl-memory-path-grid {display:grid;grid-template-columns:minmax(0,1.8fr) minmax(190px,1fr);gap:14px;padding:0 16px 16px}\n.nl-memory-path-grid>div {min-width:0}\n.nl-memory-path-grid .nl-path-controls {margin-top:10px}\n.nl-memory-map .nl-map svg,.nl-memory-path-map .nl-map svg {height:clamp(310px,36cqw,430px)}\n@container(max-width:930px) {\n  .nl-memory-presence:has(.nl-memory-map),.nl-memory-ledgers.paired,.nl-memory-path-grid {grid-template-columns:1fr}\n  .nl-memory-map .nl-map,.nl-memory-path-map .nl-map {display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}\n  .nl-memory-map .nl-map svg,.nl-memory-path-map .nl-map svg {grid-column:1;grid-row:1/4;height:300px}\n  .nl-memory-map .nl-map-top,.nl-memory-path-map .nl-map-top {grid-column:2;grid-row:1}\n  .nl-memory-map .nl-map-foot,.nl-memory-map .nl-map-legend,.nl-memory-path-map .nl-map-foot,.nl-memory-path-map .nl-map-legend {grid-column:2}\n}\n@container(max-width:650px) {\n  .nl-memory {grid-template-columns:1fr}\n  .nl-memory-index-list {display:flex;max-height:130px}\n  .nl-memory-index .nl-subject {flex:0 0 150px;padding:9px!important;border:0!important;border-bottom:2px solid transparent!important}\n  .nl-memory-index .nl-subject.active,.nl-memory-index .nl-subject:last-child.active {border-bottom:2px solid var(--green)!important}\n  .nl-memory-index .nl-memory-more {flex:0 0 95px}\n  .nl-memory-hero {padding:22px}\n}\n/* The three correspondence decks share a frame, with a glyph and tint for each suit or house. */\n.nl-decks {max-width:1530px;margin-inline:auto}\n.nl-deck-masthead {\n  position:relative;isolation:isolate;overflow:hidden;\n  display:flex;justify-content:space-between;align-items:center;gap:18px;\n  padding:clamp(23px,4.2cqw,57px);\n  border:1px solid #665b40;border-radius:12px;\n  background:radial-gradient(ellipse at 77% 5%,#c0a56522,transparent 57%),linear-gradient(118deg,#28261a,#14231b 72%,#151e18);\n}\n.nl-deck-masthead>.nl-kicker,.nl-deck-masthead .nl-kicker,.nl-voice-hero .nl-kicker {color:var(--gold)}\n.nl-deck-masthead h2 {font:normal clamp(40px,5.7cqw,78px)/.98 Georgia,serif;letter-spacing:-.055em;margin:12px 0 14px}\n.nl-deck-masthead p {max-width:45ch;color:#c1cbbb;font-size:13px;line-height:1.65}\n.nl-deck-masthead-mark {\n  display:grid;grid-template-columns:repeat(3,1fr);align-items:center;justify-items:center;\n  width:clamp(120px,22cqw,260px);min-height:110px;flex:none;\n  color:#dac68e;transform:rotate(-6deg);opacity:.75;\n}\n.nl-deck-masthead-mark>span {\n  display:grid;place-items:center;width:100%;aspect-ratio:5/7;border:1px solid #ad9356;\n  border-radius:6px;box-shadow:inset 0 0 0 4px #101914,inset 0 0 0 5px #6d6046;\n  background:radial-gradient(ellipse at 50% 45%,#746a3b80,#142019 76%);\n  font:normal clamp(17px,3cqw,35px)/1 Georgia,serif;\n}\n.nl-deck-masthead-mark>span:first-child {transform:translate(15%,8%) rotate(-12deg)}\n.nl-deck-masthead-mark>span:last-child {transform:translate(-15%,8%) rotate(12deg)}\n.nl-deck-masthead-mark>span:nth-child(2) {transform:translateY(-8%);z-index:1}\n.nl-deck-shelves {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:15px 0 26px}\n.nl-deck-shelves button {\n  display:flex;gap:12px;align-items:center;text-align:left;min-width:0;\n  padding:12px clamp(10px,1.4cqw,20px);border:1px solid #3c5042;border-radius:7px;background:#151e18;\n}\n.nl-deck-shelves button[aria-pressed=true] {background:#2b3526;border-color:#a28c5f;color:#f2e6c7}\n.nl-deck-shelves button>span:first-child {display:grid;place-items:center;width:30px;height:33px;flex:none;color:#d5bd82;border:1px solid #64573b;border-radius:4px;font-size:17px}\n.nl-deck-shelves strong {display:block;font:normal 17px/1.25 Georgia,serif;overflow-wrap:anywhere}\n.nl-deck-shelves small {display:block;margin-top:4px;color:var(--muted);font-size:11px}\n.nl-deck-toolbar {display:flex;align-items:end;justify-content:space-between;gap:14px;flex-wrap:wrap}\n.nl-deck-toolbar h3 {font:normal clamp(25px,3cqw,36px)/1.1 Georgia,serif;letter-spacing:-.025em}\n.nl-deck-toolbar p {margin-top:4px;color:var(--muted);font:10px/1.5 ui-monospace,monospace}\n.nl-deck-toolbar .nl-memory-search {max-width:300px;flex:1 1 210px}\n.nl-deck-filters {display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}\n.nl-deck-filters button {padding:6px 10px;border:1px solid #35483b;border-radius:4px;color:var(--muted);font-size:11px}\n.nl-deck-filters button[aria-pressed=true] {color:#e9d8ac;background:#584b303d;border-color:#88744f}\n.nl-deck-spread {margin-top:21px}\n.nl-deck-spread-head {display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding-bottom:9px;margin-bottom:10px;border-bottom:1px solid var(--line)}\n.nl-deck-spread-head h4,.nl-deck-spread-head h3 {font:normal 22px/1.2 Georgia,serif;margin:0}\n.nl-deck-spread-head>span {color:var(--muted);font:10px/1.5 ui-monospace,monospace;white-space:nowrap}\n.nl-deck-grid {display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,142px),1fr));gap:10px;align-items:stretch}\n.nl-deck-grid.compact {grid-template-columns:repeat(auto-fill,minmax(min(100%,132px),1fr));margin-top:13px;max-width:1120px}\n.nl .nl-deck-card {\n  --card-ink:#ddc78e;--card-surface:#2c291c;--card-deep:#141914;\n  isolation:isolate;position:relative;min-width:0;min-height:192px;aspect-ratio:5/7;\n  display:grid;grid-template-rows:auto minmax(58px,1fr) auto auto;align-items:center;gap:4px;\n  padding:12px 11px 11px;text-align:center;color:var(--card-ink);\n  border:1px solid color-mix(in srgb,var(--card-ink) 64%,#141916);border-radius:7px;\n  background:radial-gradient(ellipse at 50% 39%,color-mix(in srgb,var(--card-ink) 16%,var(--card-surface)),transparent 61%),linear-gradient(150deg,var(--card-surface),var(--card-deep));\n  box-shadow:0 6px 12px #0003;\n}\n.nl .nl-deck-card.ink {--card-ink:#adc9de;--card-surface:#202d3d;--card-deep:#141e24}\n.nl .nl-deck-card.iris {--card-ink:#d5bce6;--card-surface:#33273d;--card-deep:#1a1b26}\n.nl .nl-deck-card.ember {--card-ink:#edb18c;--card-surface:#3e291e;--card-deep:#251b16}\n.nl .nl-deck-card.verdigris {--card-ink:#b0d6b7;--card-surface:#20392d;--card-deep:#14221c}\n.nl-deck-card::before,.nl-deck-card::after {\n  content:\"\";position:absolute;pointer-events:none;border:1px solid color-mix(in srgb,var(--card-ink) 32%,transparent);border-radius:4px;inset:4px;\n}\n.nl-deck-card::after {inset:7px;border-color:color-mix(in srgb,var(--card-ink) 13%,transparent);border-radius:2px}\n.nl button.nl-deck-card {transition:transform .17s ease,border-color .17s ease,box-shadow .17s ease}\n.nl button.nl-deck-card:hover {color:var(--card-ink);border-color:var(--card-ink);transform:translateY(-3px);box-shadow:0 8px 17px #0006}\n.nl button.nl-deck-card:focus-visible {outline-color:var(--card-ink)}\n.nl-deck-card-index {display:flex;justify-content:space-between;align-items:baseline;gap:3px;font:9px/1.3 ui-monospace,monospace;text-align:right;text-transform:uppercase;letter-spacing:.045em}\n.nl-deck-card-index>span:first-child {font-size:10px;letter-spacing:0}\n.nl-deck-glyph {display:grid;place-items:center;width:100%;height:100%;min-height:0}\n.nl-deck-glyph svg {width:min(86%,108px);max-height:100%;overflow:visible}\n.nl-deck-card-title {align-self:end;min-width:0;min-height:2.35em;display:grid;align-content:center;gap:4px;line-height:1.1}\n.nl-deck-card-title strong {font:normal clamp(15px,1.6cqw,21px)/1.1 Georgia,serif;color:#f0e8d5;overflow-wrap:normal;text-wrap:balance}\n.nl-deck-card-title strong.nl-deck-long-word {font-size:clamp(10px,1.2cqw,16px)}\n.nl-deck-card-title small {font-size:10px;line-height:1.3;color:#d1c7b5;overflow-wrap:anywhere}\n.nl-deck-card-foot {min-width:0;min-height:13px;color:var(--card-ink);font:8px/1.2 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.045em}\n.nl-deck-card-via {min-width:0;color:#dbd9c8;font-size:10px;line-height:1.2;overflow-wrap:anywhere}\n.nl-deck-grid.compact .nl-deck-card {min-height:172px;max-width:176px}\n.nl-deck-back {margin-bottom:10px;font-size:12px!important}\n.nl-voice-hero {\n  display:grid;grid-template-columns:minmax(100px,170px) minmax(0,1fr);align-items:center;gap:clamp(15px,3.6cqw,55px);\n  background:radial-gradient(ellipse at 83% 0%,#75624342,transparent 72%),linear-gradient(120deg,#2c291b,#151c16 75%);border-color:#6e6041;\n}\n.nl-voice-portrait .nl-deck-card {width:100%}\n.nl-deck-evidence-count {color:var(--gold);font:11px/1.6 ui-monospace,monospace;margin-top:13px!important}\n.nl-voice-source .nl-prose {white-space:pre-wrap}\n.nl-voice-source code {display:block;font:10px/1.7 ui-monospace,monospace;color:var(--muted);overflow-wrap:anywhere}\n.nl-voice-claim {margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}\n.nl-voice-claim h4 {font:normal 19px/1.35 Georgia,serif;margin:6px 0}\n.nl-deck-related {margin-top:22px;border:1px solid var(--line);background:#111a15;border-radius:8px;padding:clamp(14px,2cqw,25px)}\n.nl-demon-card-shelf {padding-bottom:15px!important}\n.nl-demon-card-shelf>summary {color:var(--gold);font-size:13px;margin-bottom:8px}\n.nl-demon-card-shelf .nl-deck-grid {grid-template-columns:repeat(auto-fill,minmax(min(100%,120px),1fr));gap:8px}\n@container(max-width:650px) {\n  .nl-deck-masthead {padding:20px}\n  .nl-deck-masthead-mark {display:none}\n  .nl-deck-shelves {gap:5px;margin:10px 0 18px}\n  .nl-deck-shelves button {padding:9px 6px;min-height:61px}\n  .nl-deck-shelves button>span:first-child {display:none}\n  .nl-deck-shelves strong {font-size:14px}\n  .nl-deck-grid {grid-template-columns:repeat(auto-fill,minmax(min(100%,124px),1fr));gap:7px}\n  .nl-deck-grid.compact {grid-template-columns:repeat(auto-fill,minmax(min(100%,118px),1fr));gap:7px}\n  .nl .nl-deck-card {min-height:173px;padding:10px 8px}\n  .nl-deck-card-index {font-size:7px}\n  .nl-voice-hero {grid-template-columns:minmax(78px,105px) minmax(0,1fr);padding:14px;gap:14px}\n  .nl-voice-portrait .nl-deck-card {min-height:150px}\n  .nl-voice-hero h2 {font-size:clamp(24px,8cqw,34px);margin:6px 0}\n  .nl-deck-evidence-count {font-size:9px}\n}\n\n/* The map room and the Pandemonium index share the same palette and controls. */\n.nl {--numo-ink:#0a120e;--numo-panel:#101b14;--numo-hairline:#304438;--numo-paper:#e6eee2;--numo-mint:#9cf5ae;--numo-dim:#9fb2a4}\n.nl .nl-room-nav {margin-bottom:25px;gap:16px;align-items:center}\n.nl .nl-room-nav .nl-tab {font-size:13px!important;padding:10px 14px!important}\n.nl .nl-room-nav .nl-tab.active {color:var(--numo-mint)!important}\n.nl .nl-room-tools {position:relative;margin:0;padding:0;border:0;flex:none;z-index:6}\n.nl .nl-room-tools>summary {list-style:none;border:1px solid var(--numo-hairline);border-radius:5px;padding:9px 12px;color:var(--numo-dim);font-size:11px}\n.nl .nl-room-tools>summary::-webkit-details-marker {display:none}\n.nl .nl-room-tools>div {position:absolute;right:0;top:calc(100% + 5px);min-width:180px;background:#121e17;border:1px solid var(--numo-hairline);border-radius:6px;padding:5px;box-shadow:0 14px 30px #0007}\n.nl .nl-room-tools button {width:100%;display:block;text-align:left;padding:9px 10px!important;border-radius:3px;white-space:nowrap;color:#c8d9cb}\n.nl .nl-room-tools button:hover {background:#9cf5ae14;color:var(--numo-mint)}\n.nl .nl-chamber-nav {display:flex;flex-wrap:wrap;gap:6px;margin:0 0 25px;padding-bottom:13px;border-bottom:1px solid var(--line)}\n.nl .nl-chamber-nav button {font-size:11px}\n.nl .nl-room-heading {padding:9px 0 24px}\n.nl .nl-room-heading h1 {font:normal clamp(35px,5cqw,65px)/1.06 Georgia,serif;letter-spacing:-.045em;margin:8px 0 10px;color:var(--numo-paper)}\n.nl .nl-room-heading p {font-size:13px;line-height:1.65;color:var(--numo-dim);max-width:65ch;margin:0}\n.nl .nl-map-room {display:grid;grid-template-columns:minmax(255px,1.15fr) minmax(245px,1fr) minmax(170px,.61fr);gap:clamp(18px,2.4cqw,37px);padding:clamp(21px,3.4cqw,48px);border:1px solid var(--numo-hairline);border-radius:11px;align-items:center;background:radial-gradient(ellipse at 57% 37%,#25493438,transparent 59%),linear-gradient(143deg,#141f18 0%,#0d1711 50%,#0a110e 100%);position:relative;overflow:hidden}\n.nl .nl-map-copy {min-width:0}\n.nl .nl-index-mark {display:inline-flex;align-items:center;gap:14px;font:10px ui-monospace,monospace;letter-spacing:.12em;color:var(--numo-dim);margin:0 0 clamp(22px,3.8cqw,65px);border-bottom:1px solid #506251;padding-bottom:9px}\n.nl .nl-index-mark span:last-child {color:#c8bb92}\n.nl .nl-map-copy>.nl-kicker {color:var(--numo-mint)}\n.nl .nl-map-copy h1 {font:normal clamp(52px,7.9cqw,113px)/.9 Georgia,serif;letter-spacing:-.07em;margin:13px 0 21px;color:var(--numo-paper)}\n.nl .nl-map-copy h1 span {color:var(--numo-mint)}\n.nl .nl-room-lead {color:#b6c6ba;font-size:clamp(13px,1.26cqw,17px);line-height:1.65;max-width:35ch}\n.nl .nl-map-copy .nl-actions {margin:22px 0 0;gap:8px}\n.nl .nl-map-copy .nl-button,.nl .nl-aq-form .nl-button {font-size:12px!important;padding:11px 14px!important}\n.nl .nl-map-metrics {display:flex;gap:clamp(13px,2.4cqw,34px);border-top:1px solid var(--numo-hairline);margin:clamp(24px,3.7cqw,54px) 0 0;padding:16px 0 0}\n.nl .nl-map-metrics div {display:flex;flex-direction:column;gap:6px}\n.nl .nl-map-metrics dd {order:-1;margin:0;color:var(--numo-paper);font:normal clamp(20px,2.6cqw,34px)/1 Georgia,serif}\n.nl .nl-map-metrics dt {color:var(--numo-dim);font:9px/1.4 ui-monospace,monospace;letter-spacing:.07em;text-transform:uppercase}\n.nl .nl-map-instrument {min-width:0}\n.nl .nl-map-instrument .nl-map {background:repeating-radial-gradient(ellipse at 50% 50%,transparent 0 37px,#a4c9aa0a 38px 39px,transparent 40px 66px),radial-gradient(ellipse at 50% 43%,#36614330,transparent 72%),#09120dc9;border-color:#3d5546;box-shadow:0 14px 45px #050d0780,inset 0 0 28px #09120d}\n.nl .nl-map-instrument .nl-map svg {height:clamp(365px,37cqw,505px);display:block}\n.nl .nl-map-instrument .nl-map-foot {min-height:0;font-size:11px;color:#acbfb0}\n.nl .nl-map-instrument .nl-region {fill:#809887}\n.nl .nl-map-doors {display:grid;align-content:center}\n.nl .nl-map-doors-head {padding:0 0 13px;border-bottom:1px solid var(--numo-hairline)}\n.nl .nl-map-doors-head>strong {display:block;font:normal 19px/1.2 Georgia,serif;margin-top:6px;color:var(--numo-paper)}\n.nl .nl-room-door {display:grid;grid-template-columns:minmax(0,1fr) 15px;gap:5px 9px;width:100%;border-bottom:1px solid var(--numo-hairline)!important;text-align:left;padding:14px 0!important;min-width:0}\n.nl .nl-room-door:hover {background:#9cf5ae0a}\n.nl .nl-room-door>strong,.nl .nl-room-door>span {grid-column:1}\n.nl .nl-room-door>strong {font:normal 19px/1.2 Georgia,serif;color:var(--numo-paper)}\n.nl .nl-room-door>span {color:var(--numo-dim);font-size:11px;line-height:1.5}\n.nl .nl-room-door>span.nl-room-door-id {font:9px ui-monospace,monospace;letter-spacing:.1em;color:#c8bb92}\n.nl .nl-room-door>b {grid-column:2;grid-row:2;color:var(--numo-mint);font-size:13px;font-weight:400}\n.nl .nl-zone-shelf {grid-column:1/-1;display:flex;align-items:center;gap:16px 22px;flex-wrap:wrap;border-top:1px solid var(--numo-hairline);padding-top:21px}\n.nl .nl-zone-shelf h2 {font:normal 22px/1.25 Georgia,serif;margin:5px 0 0}\n.nl .nl-zone-shelf>p {margin:0;font-size:12px;color:var(--numo-dim)}\n.nl .nl-zone-discover {flex:1 1 330px}\n.nl .nl-zone-discover .nl-actions {margin:6px 0 0;gap:14px}\n.nl .nl-zone-picker {display:flex;gap:5px;flex-wrap:wrap}\n.nl .nl-zone-picker button {width:29px;height:30px;border:1px solid var(--numo-hairline)!important;border-radius:4px;font:13px/1 ui-monospace,monospace;color:#b5c7b9;background:#121d16}\n.nl .nl-zone-picker button[aria-pressed=true],.nl .nl-zone-picker button:hover {background:#23452d;color:#d8ffdf;border-color:#70bc81!important}\n.nl .nl-directory-doors {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}\n.nl .nl-directory-doors .nl-room-door {padding:21px!important;border:1px solid var(--numo-hairline)!important;border-radius:7px;gap:10px;background:linear-gradient(140deg,#1b3021,#101912)}\n.nl .nl-directory-doors .nl-room-door:hover {border-color:#70a47c!important}\n.nl .nl-directory-doors .nl-room-door>strong {font-size:23px}\n.nl .nl-atlas-workspace {display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,28%);gap:clamp(15px,2.2cqw,31px);align-items:start}\n.nl .nl-atlas-index {min-width:0;border:1px solid var(--numo-hairline);padding:clamp(11px,1.6cqw,21px);border-radius:8px;background:linear-gradient(145deg,#142019,#0b1510)}\n.nl .nl-atlas-controls {display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);gap:10px}\n.nl .nl-atlas-controls label,.nl .nl-aq-form label {display:grid;gap:6px;min-width:0;font-size:10px;color:var(--numo-dim)}\n.nl .nl-atlas-controls input,.nl .nl-aq-form input,.nl .nl-atlas-controls select,.nl .nl-aq-form select {min-width:0;width:100%;padding:8px 10px;background:#101a14;border:1px solid var(--numo-hairline);border-radius:4px;color:var(--numo-paper);font-size:12px}\n.nl .nl-atlas-zonebar {display:flex;align-items:center;gap:8px 13px;flex-wrap:wrap;margin:14px 0 13px}\n.nl .nl-atlas-zonebar>.nl-meta {margin-left:auto}\n.nl .nl-atlas-index .nl-families {margin:0 0 13px;gap:8px 13px}\n.nl .nl-atlas-dot {display:flex;align-items:center;gap:6px}\n.nl .nl-atlas-dot i {background:var(--numo-mint);margin:0}\n.nl .nl-periodic {grid-template-columns:repeat(auto-fill,minmax(85px,1fr));gap:5px}\n.nl .nl-periodic .nl-tile {min-height:64px;padding:6px!important}\n.nl .nl-periodic .nl-tile strong {margin:4px 0;font-size:clamp(11px,1.1cqw,15px)}\n.nl .nl-pair-axis,.nl .nl-pair-origin {display:none}\n.nl .nl-atlas-dossier {display:grid;gap:14px}\n.nl .nl-atlas-dossier .nl-map svg {height:clamp(270px,29cqw,440px);display:block}\n.nl .nl-atlas-dossier .nl-map-foot {min-height:0}\n.nl .nl-atlas-dossier .nl-inspector {border:1px solid var(--numo-hairline);border-radius:7px;padding:18px;background:#111b14}\n.nl .nl-atlas-dossier .nl-inspector h2 {font-size:32px}\n.nl .nl-atlas-dossier .nl-pair {margin:12px 0;padding:8px 0}\n.nl .nl-atlas-dossier .nl-encounter {padding:10px 0}\n.nl .nl-atlas-index .nl-table-note {font:11px/1.6 sans-serif;padding-top:12px}\n.nl :is(.nl-room-door,.nl-zone-picker button,.nl-room-tools summary,.nl-periodic button,.nl-room-nav button,.nl-chamber-nav button):focus-visible {outline:2px solid var(--numo-mint);outline-offset:3px}\n\n@container (min-width:1020px) {\n  .nl .nl-periodic.by-pair {grid-template-columns:17px repeat(9,minmax(0,1fr));grid-template-rows:20px repeat(9,minmax(62px,auto));align-items:stretch}\n  .nl .nl-periodic.by-pair .nl-tile {grid-column:var(--pair-col,auto);grid-row:var(--pair-row,auto)}\n  .nl .nl-pair-axis,.nl .nl-pair-origin {display:grid;place-items:center;color:#9eb2a3;font:10px ui-monospace,monospace}\n  .nl .nl-pair-origin {grid-column:1;grid-row:1;color:#c8bb92}\n}\n@container (max-width:1000px) {\n  .nl .nl-map-room {grid-template-columns:minmax(225px,1fr) minmax(230px,1fr)}\n  .nl .nl-map-doors {grid-column:1/-1;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 14px}\n  .nl .nl-map-doors-head {grid-column:1/-1}\n}\n@container (max-width:690px) {\n  .nl .nl-map-room,.nl .nl-atlas-workspace {grid-template-columns:minmax(0,1fr)}\n  .nl .nl-map-doors {grid-template-columns:repeat(2,minmax(0,1fr))}\n  .nl .nl-map-copy h1 br {display:none}\n  .nl .nl-map-copy h1 {font-size:clamp(36px,10cqw,66px);line-height:1}\n  .nl .nl-map-copy h1 br::after {content:\" \"}\n  .nl .nl-map-instrument .nl-map svg {height:370px}\n  .nl .nl-directory-doors {grid-template-columns:minmax(0,1fr)}\n  .nl .nl-room-nav {flex-wrap:wrap}\n  .nl .nl-room-nav .nl-tab {padding:8px 9px!important;font-size:11px!important}\n  .nl .nl-atlas-controls {grid-template-columns:1fr 1fr}\n  .nl .nl-atlas-controls label:first-child {grid-column:1/-1}\n  .nl .nl-atlas-dossier {grid-template-columns:minmax(0,1fr)}\n}\n@container (max-width:390px) {\n  .nl .nl-map-room {padding:14px}\n  .nl .nl-map-doors {grid-template-columns:minmax(0,1fr)}\n}\n@media (prefers-reduced-motion: reduce) {\n  .nl .nl-periodic .nl-tile {transition:none}\n  .nl .nl-periodic .nl-tile:hover {transform:none}\n}\n\n.nl .nl-toolbar:has(.nl-room-nav) {margin-bottom:25px;gap:12px;align-items:center;justify-content:space-between}\n.nl .nl-room-nav {margin-bottom:0}\n.nl .nl-room-warnings {margin:0 0 15px}\n.nl .nl-map-rite {display:flex;align-items:center;gap:8px;justify-content:space-between;margin-top:9px;font-size:11px;color:var(--numo-dim)}\n.nl .nl-map-rite select {flex:1;min-width:0;max-width:65%}\n.nl .nl-aq-layout {display:grid;grid-template-columns:minmax(0,1fr) minmax(245px,33%);align-items:start;gap:clamp(18px,3cqw,42px)}\n.nl .nl-aq-map {position:sticky;top:14px;min-width:0;border-radius:7px}\n.nl .nl-aq-map:focus-visible {outline:2px solid var(--numo-mint);outline-offset:5px}\n.nl .nl-aq-map .nl-map {background:radial-gradient(ellipse at 50% 48%,#274a3a45,transparent 70%),#0a130e}\n.nl .nl-aq-map .nl-map svg {height:clamp(280px,31cqw,460px);display:block}\n.nl .nl-aq-map .nl-map-foot {min-height:0}\n.nl .nl-aq-map>.nl-zone-picker {margin:14px 0 10px}\n.nl .nl-aq-map>.nl-meta {margin-bottom:7px;max-width:39ch}\n.nl .nl-aq-form {display:grid;grid-template-columns:minmax(0,1fr) minmax(110px,.55fr) auto;gap:10px;align-items:end}\n.nl .nl-aq-form .nl-button {align-self:end;min-height:35px;padding-block:8px!important}\n.nl .nl-aq-filters {display:flex;gap:8px;flex-wrap:wrap}\n.nl .nl-aq-filters:not(:empty) {margin:10px 0}\n.nl .nl-aq-filters .nl-button {padding:4px 8px!important;font-size:10px!important}\n.nl .nl-aq-results-head {display:flex;align-items:center;justify-content:space-between;gap:15px;border-bottom:1px solid var(--numo-hairline);padding:12px 0;margin-top:12px}\n.nl .nl-aq-result {display:grid;grid-template-columns:minmax(64px,90px) minmax(0,1fr);gap:clamp(12px,2.6cqw,24px);padding:17px 0;border-bottom:1px solid var(--numo-hairline)}\n.nl .nl-aq-address {display:flex;flex-direction:column;gap:5px;align-self:start;border-left:2px solid #987c50;padding-left:11px}\n.nl .nl-aq-address strong {font:normal clamp(20px,2.5cqw,34px)/1 Georgia,serif;color:#e3ca9e;overflow-wrap:anywhere}\n.nl .nl-aq-address>span:last-child {font:10px/1.25 ui-monospace,monospace;color:var(--numo-dim)}\n.nl .nl-aq-result-copy {min-width:0}\n.nl .nl-aq-result-copy h3 {font:normal 19px/1.36 Georgia,serif;margin:4px 0;color:var(--numo-paper);overflow-wrap:anywhere}\n.nl .nl-aq-card-links {display:flex;flex-wrap:wrap;column-gap:14px;margin-top:6px}\n.nl .nl-aq-card-links a {text-decoration:none}\n.nl .nl-aq-card-links button[aria-pressed=true] {text-decoration:underline;text-underline-offset:4px}\n.nl .nl-aq-result details {margin:5px 0 0;padding:7px 0 0;border:0}\n.nl .nl-aq-result details p {margin:6px 0;overflow-wrap:anywhere}\n.nl .nl-aq-evidence {display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:5px 0}\n.nl .nl-aq-empty {padding:16px;border:1px solid var(--numo-hairline);border-radius:6px;margin-top:12px;color:var(--numo-dim)}\n.nl .nl-aq-chamber-note {margin-bottom:12px}\n.nl .nl-chamber-reciprocal {display:flex;flex-wrap:wrap;gap:10px}\n.nl .nl-chamber-reciprocal:empty {display:none}\n@container (max-width:850px) {\n  .nl .nl-aq-form {grid-template-columns:minmax(0,1fr) minmax(100px,.65fr)}\n  .nl .nl-aq-form .nl-button {grid-column:1/-1;justify-self:start}\n}\n@container (max-width:660px) {\n  .nl .nl-aq-layout {grid-template-columns:minmax(0,1fr)}\n  .nl .nl-aq-map {position:static;grid-row:1}\n  .nl .nl-aq-map .nl-map svg {height:260px}\n  .nl .nl-aq-map .nl-map-foot {padding-block:10px}\n  .nl .nl-toolbar:has(.nl-room-nav) {flex-wrap:wrap}\n  .nl .nl-room-nav {gap:2px}\n  .nl .nl-room-nav .nl-tab {padding:8px 9px!important;font-size:11px!important}\n}\n\n.nl .nl-atlas-selected {display:none}\n.nl .nl-atlas-trace {justify-self:start}\n.nl .nl-atlas-dossier:focus-visible {outline:2px solid var(--numo-mint);outline-offset:5px;border-radius:7px}\n@container (min-width:920px) {\n  .nl .nl-directory-doors {grid-template-columns:repeat(4,minmax(0,1fr))}\n}\n@container (min-width:691px) and (max-width:919px) {\n  .nl .nl-directory-doors {grid-template-columns:repeat(2,minmax(0,1fr))}\n}\n@container (max-width:690px) {\n  .nl .nl-atlas-selected {display:flex;align-items:center;gap:8px 13px;flex-wrap:wrap;margin-bottom:10px;padding:7px 9px;border:1px solid var(--numo-hairline);border-radius:4px;background:#183022}\n  .nl .nl-atlas-selected strong {font:15px Georgia,serif;color:var(--numo-paper);margin-right:auto}\n}\n@media (max-width:520px) {\n  .nl {padding-inline:12px}\n}\n\n.nl .nl-atlas-key {display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;margin-bottom:13px}\n.nl .nl-atlas-key .nl-families {margin:0}\n.nl .nl-atlas-formats {display:flex;gap:3px}\n.nl .nl-atlas-formats .nl-tab {font-size:10px;padding:4px 8px!important}\n.nl .nl-periodic.as-cards {grid-template-columns:repeat(auto-fill,minmax(102px,1fr));gap:9px}\n.nl .nl-periodic.as-cards .nl-tile {isolation:isolate;aspect-ratio:5/7;min-height:120px;align-items:center;justify-content:space-between;border-radius:6px!important;text-align:center;padding:9px!important;background:radial-gradient(ellipse at 50% 40%,color-mix(in srgb,var(--tone) 16%,transparent),transparent 71%),#101814!important}\n.nl .nl-periodic.as-cards .nl-tile::before {content:\"\";position:absolute;z-index:-1;inset:4px;border:1px solid color-mix(in srgb,var(--tone) 29%,transparent);border-radius:3px;pointer-events:none}\n.nl .nl-periodic.as-cards .nl-tile-top {width:100%}\n.nl .nl-periodic.as-cards .nl-tile strong {font-size:15px;margin:2px 0;line-height:1.08}\n.nl .nl-demon-card-sigil {width:100%;height:53%;min-height:43px;opacity:.76}\n\n/* CARE / NUMO: ink on black. The research rooms retain their own styles. */\n.nl:has(.nl-instrument) {\n  min-height: 0;\n  padding: 0;\n  background: #000;\n}\n\n.nl .nl-instrument {\n  color-scheme: dark;\n  --ni-black: #000;\n  --ni-felt: #74f64a;\n  --ni-phos: #3dff8c;\n  --ni-phos-dim: #2bb866;\n  --ni-bone: #e8e3d1;\n  --ni-bone-dim: #ada897;\n  --ni-grey: #939b90;\n  --ni-grey-dim: #4c544d;\n  --ni-pencil: #8c9688;\n  --ni-amber: #ffb547;\n  --ni-amber-dim: #a07c40;\n  --ni-hand: Kalam, 'Segoe Print', 'Bradley Hand', cursive;\n  --ni-mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;\n  --ni-book: 'EB Garamond', Garamond, 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;\n  --ni-ui: Arial, 'Helvetica Neue', Helvetica, sans-serif;\n  --ni-crt: VT323, 'IBM Plex Mono', ui-monospace, monospace;\n  --ni-gutter: 16px;\n  position: relative;\n  isolation: isolate;\n  display: grid;\n  grid-template-rows: auto minmax(0, 1fr) auto;\n  place-items: stretch;\n  gap: 0;\n  width: 100%;\n  height: calc(100dvh - var(--care-numo-chrome, 0px));\n  overflow: hidden;\n  min-height: 0;\n  padding-inline: max(var(--ni-gutter), env(safe-area-inset-left)) max(var(--ni-gutter), env(safe-area-inset-right));\n  padding-block-end: 5px;\n  margin: 0;\n  color: var(--ni-bone);\n  background: var(--ni-black);\n  font: 400 13px/1.5 var(--ni-ui);\n}\n\n.nl .nl-instrument.has-detail {\n  grid-template-columns: minmax(0, 1fr);\n  align-items: stretch;\n  max-width: none;\n}\n\n.nl .nl-instrument :is(button, a, input, select, summary):focus-visible {\n  outline: 1px solid var(--ni-phos);\n  outline-offset: 3px;\n}\n\n.nl-instrument .nl-instrument-top {\n  position: relative;\n  z-index: 3;\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr) minmax(220px, 350px);\n  grid-template-areas: \"tools walk aq\";\n  align-items: center;\n  gap: 4px 22px;\n  min-width: 0;\n  min-height: 46px;\n  padding-block: 6px 0;\n}\n\n.nl-instrument .nl-instrument-walk {\n  grid-area: walk;\n  justify-self: end;\n  display: flex;\n  align-items: baseline;\n  gap: 9px;\n  max-width: 100%;\n  overflow-x: auto;\n  scrollbar-width: none;\n  white-space: nowrap;\n}\n\n.nl-instrument .nl-instrument-walk :is(button, a) {\n  padding: 6px 0;\n  color: var(--ni-bone-dim);\n  font: italic 400 16px/1 var(--ni-book);\n  text-decoration: none;\n}\n\n.nl-instrument .nl-instrument-walk [aria-current] { color: var(--ni-bone); }\n.nl-instrument .nl-instrument-walk > span {\n  color: var(--ni-grey);\n  font: 400 10px/1 var(--ni-ui);\n  letter-spacing: .18em;\n  text-transform: uppercase;\n}\n.nl-instrument .nl-instrument-walk button + button::before {\n  margin-inline-end: 9px;\n  color: var(--ni-grey-dim);\n  content: '\u203a';\n}\n\n.nl-instrument .nl-instrument-top > .nl-instrument-aq-form { grid-area: aq; }\n\n.nl-instrument .nl-instrument-tools {\n  grid-area: tools;\n  justify-self: start;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.nl-instrument .nl-instrument-history {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  padding-inline-start: 6px;\n  border-inline-start: 1px solid #1a2a20;\n}\n\n.nl .nl-instrument .nl-instrument-tools :is(button, summary) {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  min-height: 29px;\n  padding: 0 8px;\n  border: 0;\n  border-radius: 3px;\n  color: var(--ni-grey);\n  background: none;\n  font: 500 10px/1.2 var(--ni-mono);\n  letter-spacing: .08em;\n  text-transform: uppercase;\n  white-space: nowrap;\n}\n\n.nl .nl-instrument .nl-instrument-tools :is(button, summary):hover:not(:disabled) {\n  color: var(--ni-bone);\n  background: rgb(61 255 140 / .08);\n}\n.nl .nl-instrument .nl-instrument-tools :is(button, summary):focus-visible { outline-offset: -2px; }\n.nl .nl-instrument .nl-instrument-tools .nl-instrument-brand {\n  padding-inline-start: 0;\n  color: var(--ni-phos);\n  font-size: 11px;\n  letter-spacing: .22em;\n  text-shadow: 0 0 8px rgb(61 255 140 / .35);\n}\n.nl .nl-instrument .nl-instrument-tools [data-instrument-history] {\n  width: 29px;\n  padding-inline: 0;\n  color: var(--ni-phos);\n}\n.nl .nl-instrument .nl-instrument-tools [data-instrument-history]:disabled { color: var(--ni-grey); }\n.nl .nl-instrument .nl-instrument-tools button[aria-pressed=\"true\"] {\n  color: var(--ni-felt);\n  background: rgb(116 246 74 / .08);\n}\n.nl-instrument .nl-instrument-tools [aria-pressed]::before {\n  box-sizing: border-box;\n  width: 6px;\n  height: 6px;\n  border: 1px solid currentColor;\n  content: '';\n}\n.nl-instrument .nl-instrument-tools [aria-pressed=\"true\"]::before {\n  background: currentColor;\n  box-shadow: 0 0 5px rgb(116 246 74 / .4);\n}\n\n.nl .nl-instrument .nl-instrument-menu {\n  position: relative;\n  margin: 0;\n  padding: 0;\n  padding-inline-start: 6px;\n  border: 0;\n  border-inline-start: 1px solid #1a2a20;\n}\n.nl-instrument .nl-instrument-menu summary { cursor: pointer; list-style: none; }\n.nl-instrument .nl-instrument-menu summary::-webkit-details-marker { display: none; }\n.nl .nl-instrument .nl-instrument-menu[open] summary { color: var(--ni-phos); background: rgb(61 255 140 / .08); }\n.nl-instrument .nl-instrument-menu[open] summary svg { transform: rotate(180deg); }\n.nl-instrument .nl-instrument-menu:not([open]) .nl-instrument-menu-items { display: none; }\n.nl-instrument .nl-instrument-menu-items {\n  position: absolute;\n  inset: calc(100% + 7px) auto auto 6px;\n  z-index: 1;\n  display: grid;\n  gap: 2px;\n  width: max-content;\n  min-width: 168px;\n  max-height: min(290px, 55dvh);\n  overflow: auto;\n  padding: 4px;\n  border: 1px solid #253b2c;\n  border-radius: 4px;\n  background: #080e0a;\n  box-shadow: 0 10px 22px rgb(0 0 0 / .7);\n}\n.nl .nl-instrument .nl-instrument-menu-items button { justify-content: flex-start; padding-inline: 9px; }\n.nl .nl-instrument .nl-instrument-menu-items .nl-instrument-advanced {\n  margin-top: 3px;\n  border-top: 1px solid #253b2c;\n  border-radius: 0 0 3px 3px;\n  letter-spacing: .04em;\n}\n\n.nl-instrument .nl-instrument-stage {\n  position: relative;\n  display: flex;\n  min-width: 0;\n  min-height: 0;\n}\n\n.nl .nl-instrument .nl-instrument-canvas,\n.nl .nl-instrument.has-detail .nl-instrument-canvas {\n  position: relative;\n  top: auto;\n  display: grid;\n  grid-template-rows: minmax(0, 1fr) auto;\n  place-items: stretch;\n  align-self: stretch;\n  flex: 0 0 100%;\n  min-width: 0;\n  min-height: 0;\n  padding: 0;\n  transition: flex-basis .75s cubic-bezier(.2, .7, .1, 1);\n}\n\n.nl .nl-instrument.has-detail .nl-instrument-canvas {\n  flex-basis: 44%;\n}\n\n.nl .nl-instrument .nl-instrument-canvas .nl-pen-map {\n  min-width: 0;\n  min-height: 0;\n  width: 100%;\n  height: 100%;\n  background: none;\n}\n\n.nl .nl-instrument .nl-instrument-canvas :is(svg.nl-pen-map, .nl-pen-map > svg) {\n  display: block;\n  width: 100%;\n  height: 100%;\n  max-width: none;\n  min-height: 0;\n  overflow: visible;\n}\n\n.nl-instrument :is(.nl-instrument-hint, .nl-instrument-help, .nl-instrument-instruction) {\n  color: var(--ni-grey);\n  font: 400 11px/1.55 var(--ni-ui);\n  letter-spacing: .025em;\n  text-wrap: pretty;\n}\n\n.nl-instrument .nl-instrument-canvas :is(.nl-instrument-hint, .nl-instrument-help) {\n  padding: 7px 0 3px;\n  text-align: center;\n  text-wrap: balance;\n}\n\n.nl-instrument .nl-instrument-leader {\n  position: absolute;\n  z-index: 2;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  overflow: visible;\n  pointer-events: none;\n}\n\n.nl-instrument .nl-instrument-leader :is(path, polyline, line, circle) {\n  fill: none;\n  stroke: var(--ni-phos);\n  stroke-width: 1;\n  vector-effect: non-scaling-stroke;\n  opacity: .5;\n}\n\n.nl-instrument .nl-instrument-leader circle { opacity: .85; }\n.nl-instrument .nl-instrument-leader circle:not([cx]) { visibility: hidden; }\n\n.nl-instrument .nl-instrument-readout {\n  position: relative;\n  z-index: 1;\n  flex: 0 0 0%;\n  min-width: 0;\n  min-height: 0;\n  overflow: hidden;\n  border: 0;\n  background: none;\n  opacity: 0;\n  visibility: hidden;\n  transition: flex-basis .75s cubic-bezier(.2, .7, .1, 1), opacity .3s, visibility 0s .75s;\n}\n\n.nl-instrument.has-detail .nl-instrument-readout {\n  flex-basis: 56%;\n  opacity: 1;\n  visibility: visible;\n  transition: flex-basis .75s cubic-bezier(.2, .7, .1, 1), opacity .45s .25s, visibility 0s;\n}\n\n/* Prototype readout, scoped to the instrument. */\n.nl-instrument .ro {height:100%;display:flex;flex-direction:column;max-width:660px}\n.nl-instrument .nl-instrument-readout.ro {max-width:none}\n.nl-instrument .nl-instrument-readout.ro > :is(.ro-head, .ro-body) {width:100%;max-width:660px}\n.nl .nl-instrument .nl-instrument-close {\n  position: absolute;\n  z-index: 1;\n  inset-block-start: 6px;\n  inset-inline-end: 4px;\n  min-height: 32px;\n  padding: 0 8px;\n  border: 0;\n  background: transparent;\n  color: var(--ni-grey);\n  font: 500 10px/1 var(--ni-mono);\n  letter-spacing: .12em;\n  text-transform: uppercase;\n}\n.nl .nl-instrument .nl-instrument-close:hover { color: var(--ni-phos); }\n.nl-instrument .ro-head {position:relative;padding:14px 8px 0 26px;flex:none}\n.nl-instrument .ro-head .eyebrow {padding-inline-end:44px}\n.nl-instrument .port {position:absolute;left:0;top:21px;width:12px;height:1px;background:var(--ni-phos);box-shadow:0 0 6px var(--ni-phos)}\n.nl-instrument .eyebrow {margin:0;font:500 11px/1.5 var(--ni-mono);letter-spacing:.16em;text-transform:uppercase;color:var(--ni-phos);text-shadow:0 0 8px rgba(61,255,140,.35);min-height:1.5em}\n.nl-instrument .title {margin:.1em 0 0;font:400 clamp(54px,6.2vw,104px)/.95 var(--ni-book);letter-spacing:-.012em;color:var(--ni-bone);text-wrap:balance}\n.nl-instrument .title.long {font-size:clamp(40px,4.4vw,72px);line-height:1}\n.nl-instrument .sub {margin:.35em 0 0;font:italic 400 clamp(19px,1.6vw,24px)/1.3 var(--ni-book);color:var(--ni-bone-dim)}\n.nl-instrument .soak {animation:nl-instrument-soak .7s cubic-bezier(.2,.7,.2,1) both}\n@keyframes nl-instrument-soak{from{opacity:0;filter:blur(7px)}to{opacity:1;filter:blur(0)}}\n.nl-instrument .ro-body {flex:1;min-height:0;overflow-y:auto;padding:22px 10px 48px 26px;display:flex;flex-direction:column;gap:28px;scrollbar-width:thin;scrollbar-color:#2a3a2c transparent}\n.nl-instrument .ro-body>* {flex-shrink:0}\n.nl-instrument .lbl {margin:0 0 10px;font:400 10.5px/1.3 var(--ni-ui);letter-spacing:.2em;text-transform:uppercase;color:var(--ni-grey)}\n.nl-instrument .lede {margin:0;max-width:56ch;font:400 17px/1.5 var(--ni-book);color:var(--ni-bone-dim)}\n.nl-instrument .chip {display:block;max-width:100%;height:auto}\n.nl-instrument .chip .ch-b,\n.nl-instrument .chip .ch-n {fill:none;stroke:var(--ni-phos);stroke-width:1;opacity:.75}\n.nl-instrument .chip .ch-p {stroke:var(--ni-phos);stroke-width:1;opacity:.55}\n.nl-instrument .chip .ch-k {font:400 9.5px var(--ni-mono);letter-spacing:.12em;fill:var(--ni-grey)}\n.nl-instrument .chip .ch-v {font:500 10.5px var(--ni-mono);fill:var(--ni-phos)}\n.nl-instrument .chip .ch-l {font:500 10px var(--ni-mono);letter-spacing:.2em;fill:var(--ni-phos)}\n.nl-instrument .chip .bus {stroke:var(--ni-felt);stroke-width:1.3}\n.nl-instrument .chip .bus-l {font:400 17px var(--ni-hand);fill:var(--ni-felt)}\n.nl-instrument .chip .bus-s {font:400 9.5px var(--ni-mono);letter-spacing:.2em;fill:var(--ni-grey)}\n.nl-instrument .specs {display:grid;grid-template-columns:max-content minmax(0,1fr);gap:9px 22px;margin:0}\n.nl-instrument .specs dt {font:400 10.5px/1.75 var(--ni-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--ni-grey)}\n.nl-instrument .specs dd {margin:0;font:400 12.5px/1.6 var(--ni-mono);color:var(--ni-phos);min-width:0;display:flex;flex-wrap:wrap;gap:2px 10px;align-items:baseline}\n.nl-instrument .specs .q {color:var(--ni-grey);font:400 11.5px/1.6 var(--ni-ui);letter-spacing:.01em}\n.nl-instrument .specs .amb {color:var(--ni-amber)}\n.nl-instrument .rp {background:none;border:0;padding:0;cursor:pointer;font:400 12.5px/1.6 var(--ni-mono);color:var(--ni-phos);text-decoration:underline;text-decoration-color:rgba(61,255,140,.35);text-underline-offset:3px}\n.nl-instrument .res {display:inline-block;font:500 9.5px/1 var(--ni-mono);letter-spacing:.14em;text-transform:uppercase;color:#000;background:var(--ni-amber);padding:3px 5px}\n.nl-instrument .consil {display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}\n.nl-instrument .consil .marks {display:inline-flex;gap:6px}\n.nl-instrument .cm {width:11px;height:11px;border-radius:50%;border:1px solid var(--ni-felt);display:inline-block}\n.nl-instrument .cm.on {background:var(--ni-felt);box-shadow:0 0 6px rgba(116,246,74,.5)}\n.nl-instrument .cm.pen {border:1px dashed var(--ni-pencil)}\n.nl-instrument .consil .cv {font:400 12.5px var(--ni-mono);color:var(--ni-phos);letter-spacing:.06em}\n.nl-instrument .consil .cp {font:400 11.5px var(--ni-mono);color:var(--ni-pencil);letter-spacing:.06em}\n.nl-instrument .deps {list-style:none;margin:0;padding:0}\n.nl-instrument .dep-i {display:grid;grid-template-columns:12px minmax(0,1fr);gap:14px;padding:13px 0;border-top:1px solid rgba(116,246,74,.1)}\n.nl-instrument .dep-i:first-child {border-top:0;padding-top:2px}\n.nl-instrument .dm {width:8px;height:8px;border-radius:50%;margin-top:10px;background:var(--ni-felt);transition:transform .2s}\n.nl-instrument .dm.s-aq {background:var(--ni-amber)}\n.nl-instrument .dm.s-tarot,\n.nl-instrument .dm.s-disco,\n.nl-instrument .dm.s-aceph {background:var(--ni-bone)}\n.nl-instrument .is-pencil .dm {background:transparent;border:1px dashed var(--ni-pencil)}\n.nl-instrument .is-new .dm {box-shadow:0 0 9px 1px var(--ni-phos)}\n.nl-instrument .dep-i:is(.hl, .nl-instrument-highlight) .dm {transform:scale(1.6)}\n.nl-instrument .pass {margin:0;font:italic 400 19px/1.42 var(--ni-book);color:var(--ni-bone);text-wrap:pretty}\n.nl-instrument .pass.rom {font-style:normal}\n.nl-instrument .pass i {color:var(--ni-bone-dim)}\n.nl-instrument .pass .yr {font:400 12px var(--ni-mono);color:var(--ni-grey);margin-left:6px}\n.nl-instrument .dep-i:is(.hl, .nl-instrument-highlight) .pass {color:#fff}\n.nl-instrument .src {margin:6px 0 0;font:400 12px/1.5 var(--ni-ui);color:var(--ni-grey);display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}\n.nl-instrument .aqn {background:none;border:0;padding:0;cursor:pointer;font:400 12px var(--ni-mono);color:var(--ni-amber)}\n.nl-instrument .aqn:hover {text-decoration:underline}\n.nl-instrument .lnk {background:none;border:0;padding:0;cursor:pointer;font:inherit;color:inherit;text-decoration:underline;text-decoration-color:rgba(232,227,209,.3);text-underline-offset:3px}\n.nl-instrument .penrow {display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin-top:9px}\n.nl-instrument .ptag {font:400 11px var(--ni-mono);color:var(--ni-pencil);letter-spacing:.06em}\n.nl-instrument .pbtn {background:none;border:1px solid var(--ni-grey-dim);cursor:pointer;padding:7px 11px;min-height:32px;font:400 10px/1 var(--ni-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--ni-bone)}\n.nl-instrument .pbtn:hover {border-color:var(--ni-felt);color:var(--ni-felt)}\n.nl-instrument .pbtn.ghost {border-style:dashed}\n.nl-instrument .note-chance {margin:10px 0 0;font:400 11.5px/1.5 var(--ni-ui);color:var(--ni-grey);max-width:60ch}\n.nl-instrument .drows {list-style:none;margin:0;padding:0}\n.nl-instrument .drow {width:100%;background:none;border:0;border-top:1px solid rgba(116,246,74,.08);cursor:pointer;display:grid;grid-template-columns:44px minmax(0,1fr) minmax(60px,120px) 34px;align-items:center;gap:12px;padding:7px 0;text-align:left;color:inherit}\n.nl-instrument .drows li:first-child .drow {border-top:0}\n.nl-instrument .drow .iv {font:400 11.5px var(--ni-mono);color:var(--ni-phos)}\n.nl-instrument .drow .nm {font:400 21px/1.15 var(--ni-book);color:var(--ni-bone);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.nl-instrument .drow .ct {font:400 12px var(--ni-mono);color:var(--ni-grey);text-align:right}\n.nl-instrument .drow:hover .nm,\n.nl-instrument .drow:focus-visible .nm {color:#fff}\n.nl-instrument .drow.empty .nm {color:var(--ni-bone-dim)}\n.nl-instrument .inkbar {display:block;width:100%;height:12px;overflow:visible}\n.nl-instrument .inkbar .ib {fill:none;stroke:var(--ni-felt);stroke-linecap:round}\n.nl-instrument .inkbar .ib.pen {stroke:var(--ni-pencil);stroke-dasharray:2 3}\n.nl-instrument .inkbar .ib0 {fill:var(--ni-grey-dim)}\n.nl-instrument .nb {list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px 22px}\n.nl-instrument .nb :is(button, a) {background:none;border:0;padding:4px 0;cursor:pointer;font:400 19px/1.2 var(--ni-book);color:var(--ni-bone)}\n.nl-instrument .nb :is(button, a):hover {color:#fff;text-decoration:underline;text-decoration-color:rgba(232,227,209,.3)}\n.nl-instrument .nb .ct {font:400 11.5px var(--ni-mono);color:var(--ni-grey);margin-left:6px}\n.nl-instrument :is(.empty-p, .nl-instrument-empty) {margin:0;font:italic 400 17px/1.45 var(--ni-book);color:var(--ni-bone-dim);max-width:52ch}\n.nl-instrument .adv-l {background:none;border:0;padding:0;cursor:pointer;font:400 10.5px/1 var(--ni-ui);letter-spacing:.18em;text-transform:uppercase;color:var(--ni-grey);align-self:flex-start}\n.nl-instrument .adv-l:hover {color:var(--ni-bone)}\n.nl-instrument .aqbig {margin:0;font:400 96px/.8 var(--ni-crt);color:var(--ni-amber);text-shadow:0 0 18px rgba(255,181,71,.4)}\n.nl-instrument .lp {display:flex;flex-wrap:wrap;gap:4px 12px;font:400 12.5px var(--ni-mono);color:var(--ni-amber)}\n.nl-instrument .lp span b {font-weight:400;color:var(--ni-bone-dim)}\n.nl-instrument .bigcard {display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap}\n.nl-instrument .bigcard .card {width:116px;height:181px;cursor:default}\n.nl-instrument .bigcard .card:hover {transform:none}\n.nl-instrument .sigil {width:150px;height:auto;display:block}\n.nl-instrument .sigil .cdot {fill:var(--ni-felt);opacity:.55}\n.nl-instrument .sigil .cch {stroke:var(--ni-felt);stroke-width:1.1;fill:none}\n.nl-instrument .sigil .cch.pen {stroke:var(--ni-pencil);stroke-dasharray:2 2}\n\n.nl-instrument .ro-body { overscroll-behavior: contain; }\n.nl-instrument .ro-head .title { overflow-wrap: break-word; }\n.nl-instrument [data-instrument-arriving] .ro-head :is(.title, .sub) {\n  animation: nl-instrument-soak .7s cubic-bezier(.2,.7,.2,1) both;\n}\n.nl-instrument .ro-head .port { pointer-events: none; }\n.nl-instrument .nl-instrument-region { min-width: 0; }\n.nl-instrument .nl-instrument-region :is(ol, ul) { list-style: none; }\n.nl-instrument .nl-instrument-region .nl-instrument-link:not(.adv-l, .nb *, .rp) {\n  padding: 0;\n  border: 0;\n  color: var(--ni-phos);\n  background: none;\n  font: 400 12.5px/1.6 var(--ni-mono);\n  text-align: left;\n  text-decoration: underline rgb(61 255 140 / .35);\n  text-underline-offset: 3px;\n}\n.nl-instrument .nl-instrument-region .nl-instrument-amber {\n  color: var(--ni-amber);\n  text-decoration-color: rgb(255 181 71 / .45);\n}\n.nl-instrument .nl-instrument-cites > .nl-instrument-link {\n  color: inherit;\n  font: inherit;\n  text-decoration-color: rgb(232 227 209 / .3);\n}\n.nl-instrument .nl-instrument-deposit details {\n  margin-block-start: 4px;\n  padding: 4px 0;\n  border: 0;\n}\n.nl-instrument .nl-instrument-deposit details code {\n  display: block;\n  color: var(--ni-grey);\n  font: 400 11px/1.4 var(--ni-mono);\n}\n.nl-instrument .consil small {\n  flex-basis: 100%;\n  color: var(--ni-grey);\n  font: 400 11.5px/1.6 var(--ni-ui);\n}\n.nl-instrument .consil :is(.cv, .cp), .nl-instrument .ptag {text-transform:uppercase}\n.nl-instrument .nl-instrument-deposit .pass { overflow-wrap: anywhere; }\n\n.nl-instrument .nl-instrument-works {\n  display: grid;\n  grid-auto-flow: column;\n  grid-auto-columns: clamp(82px, 18%, 108px);\n  align-items: start;\n  gap: 15px;\n  overflow-x: auto;\n  scrollbar-width: thin;\n  scrollbar-color: #2a3a2c transparent;\n  overscroll-behavior-inline: contain;\n  list-style: none;\n  margin: 0;\n  padding: 5px 5px 10px;\n}\n.nl-instrument .nl-instrument-work {\n  display: grid;\n  width: 100%;\n  gap: 4px;\n  padding: 0;\n  text-align: start;\n  color: var(--ni-bone);\n}\n.nl-instrument .nl-instrument-work-cover {\n  --cover-tone: #202a20;\n  position: relative;\n  display: grid;\n  place-items: center;\n  aspect-ratio: 2 / 3;\n  overflow: hidden;\n  padding: 10px 7px 10px 11px;\n  border: 1px solid #73816a66;\n  border-radius: 2px 4px 4px 2px;\n  background: linear-gradient(90deg, #0006 0 5px, transparent 5px), var(--cover-tone);\n  box-shadow: 0 3px 9px #0009;\n  font: 400 14px/1.08 var(--ni-book);\n  text-align: center;\n}\n.nl-instrument .nl-instrument-work-cover[data-cover-tone=\"1\"] { --cover-tone: #382d22; }\n.nl-instrument .nl-instrument-work-cover[data-cover-tone=\"2\"] { --cover-tone: #242a35; }\n.nl-instrument .nl-instrument-work-cover[data-cover-tone=\"3\"] { --cover-tone: #38252b; }\n.nl-instrument .nl-instrument-work-cover img {\n  position: absolute;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n  background: #161a15;\n}\n.nl-instrument .nl-instrument-work :is(.nl-instrument-work-title, .nl-instrument-work-cover > span) {\n  display: -webkit-box;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: 2;\n  overflow: hidden;\n  overflow-wrap: anywhere;\n}\n.nl-instrument .nl-instrument-work-cover > span { -webkit-line-clamp: 5; }\n.nl-instrument .nl-instrument-work-title { font: 400 17px/1.05 var(--ni-book); }\n.nl-instrument :is(.nl-instrument-work-author, .nl-instrument-work-count, .nl-instrument-occurrence-host) {\n  color: var(--ni-grey);\n  font: 400 11px/1.35 var(--ni-ui);\n}\n.nl-instrument .nl-instrument-work-author { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.nl-instrument .nl-instrument-work:is(:hover, :focus-visible, [aria-expanded=\"true\"]) .nl-instrument-work-cover { border-color: var(--ni-phos); }\n.nl-instrument .nl-instrument-work[aria-expanded=\"true\"] .nl-instrument-work-title { color: var(--ni-phos); }\n.nl-instrument .nl-instrument-work-readings {\n  margin-top: 15px;\n  border-top: 1px solid #2a3a2c;\n  padding-top: 12px;\n}\n.nl-instrument .nl-instrument-work-readings > header {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 12px;\n}\n.nl-instrument .nl-instrument-work-readings h4 {\n  margin: 0;\n  font: 400 24px/1.1 var(--ni-book);\n}\n.nl-instrument .nl-instrument-unfiled {\n  margin-top: 12px;\n  border-top: 1px solid #2a3a2c;\n  padding-top: 10px;\n}\n.nl-instrument .nl-instrument-unfiled > summary {\n  color: var(--ni-grey);\n  cursor: pointer;\n}\n.nl-instrument .nl-instrument-work-links { margin-block: 5px 10px; }\n.nl-instrument .nl-instrument-occurrence-host { margin: 0 0 3px; }\n\n.nl-instrument .nl-instrument-time {\n  display: grid;\n  grid-template-columns: max-content max-content minmax(0, 1fr);\n  align-items: center;\n  gap: 11px;\n  color: var(--ni-grey);\n  font: 400 11px/1.4 var(--ni-mono);\n  letter-spacing: .1em;\n  text-transform: uppercase;\n}\n.nl-instrument .nl-instrument-time output { color: var(--ni-phos); font-size: 17px; }\n.nl-instrument .nl-instrument-time input { min-width: 0; accent-color: var(--ni-phos); }\n\n.nl-instrument .nl-instrument-bottom {\n  position: relative;\n  z-index: 3;\n  min-width: 0;\n  padding-block-start: 4px;\n}\n\n.nl-instrument .nl-instrument-status {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  margin: -1px;\n  padding: 0;\n  overflow: hidden;\n  clip-path: inset(50%);\n  white-space: nowrap;\n}\n\n.nl-instrument .nl-iaq-results { list-style: none; }\n.nl-instrument .nl-iaq-results > li small { color: var(--ni-grey); font: 400 11.5px var(--ni-mono); }\n.nl-instrument .nl-instrument-note { color: var(--ni-grey); font: 400 11px/1.55 var(--ni-ui); }\n\n@container (min-width: 821px) {\n  .nl > [data-content]:has(> .nl-instrument) { overflow: hidden; }\n}\n\n@container (max-width: 820px) {\n  .nl .nl-instrument.has-detail { height: auto; min-height: calc(100dvh - var(--care-numo-chrome, 0px)); overflow: visible; }\n  .nl-instrument .nl-instrument-top {\n    grid-template-columns: auto minmax(0, 1fr);\n    grid-template-areas: \"tools aq\";\n    padding-block-start: 8px;\n  }\n  .nl-instrument .nl-instrument-top:has(.nl-instrument-walk) { grid-template-areas: \"tools aq\" \"walk walk\"; }\n  .nl-instrument .nl-instrument-walk { justify-self: start; }\n  .nl-instrument .nl-instrument-stage { flex-direction: column; }\n  .nl .nl-instrument .nl-instrument-canvas { flex: 1 1 0; }\n  .nl .nl-instrument.has-detail .nl-instrument-canvas {\n    flex: none;\n    height: min(68svh, 640px);\n    min-height: 440px;\n  }\n  .nl-instrument .nl-instrument-readout { display: none; }\n  .nl-instrument.has-detail .nl-instrument-readout { display: block; flex: none; }\n  .nl-instrument .ro { height: auto; }\n  .nl-instrument .ro-body { overflow: visible; }\n  .nl-instrument .nl-instrument-leader { display: none; }\n  .nl .nl-instrument .nl-instrument-canvas :is(svg.nl-pen-map, .nl-pen-map > svg) { touch-action: pan-y; }\n  .nl .nl-instrument .nl-instrument-canvas [data-map-drag] { touch-action: none; }\n}\n\n@container (max-width: 470px) {\n  .nl .nl-instrument { --ni-gutter: 14px; }\n  .nl-instrument .nl-instrument-top {\n    grid-template-columns: minmax(0, 1fr);\n    grid-template-areas: \"tools\" \"aq\";\n  }\n  .nl-instrument .nl-instrument-top:has(.nl-instrument-walk) { grid-template-areas: \"tools\" \"aq\" \"walk\"; }\n  .nl-instrument .nl-instrument-menu-items { inset-inline: auto 0; }\n  .nl .nl-instrument .nl-instrument-tools :is(button, summary) {\n    min-height: 40px;\n    padding-inline: 5px;\n    font-size: 9.5px;\n    letter-spacing: .035em;\n  }\n  .nl .nl-instrument .nl-instrument-tools [data-instrument-history] { width: 36px; }\n  .nl-instrument .nl-instrument-walk button:not([aria-current]) { display: none; }\n  .nl-instrument .nl-instrument-walk button + button::before { content: none; }\n  .nl-instrument .ro-head, .nl-instrument .ro-body { padding-left: 16px; }\n  .nl-instrument .title { font-size: clamp(43px, 12cqw, 58px); }\n  .nl-instrument .title.long { font-size: clamp(39px, 10.5cqw, 49px); }\n  .nl-instrument .drow { grid-template-columns: 40px minmax(0,1fr) 54px 28px; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .nl .nl-instrument .nl-instrument-canvas,\n  .nl-instrument .nl-instrument-readout,\n  .nl-instrument.has-detail .nl-instrument-readout { transition: none; }\n  .nl-instrument .ro-head :is(.title, .sub) { animation: none; }\n}\n\n/* The instrument's SVG. The legacy atlas and other diagrams use their own inks. */\n.nl .nl-pen-map {\n  --pen-felt:#74f64a;\n  --pen-phos:#3dff8c;\n  --pen-bone:#e8e3d1;\n  --pen-grey:#939b90;\n  --pen-pencil:#8c9688;\n  --pen-amber:#ffb547;\n  --pen-hand:\"Kalam\",\"Segoe Print\",\"Bradley Hand\",cursive;\n  --pen-mono:\"IBM Plex Mono\",ui-monospace,monospace;\n  display:flex;\n  flex-direction:column;\n  align-items:center;\n  width:100%;\n  min-width:0;\n  background:transparent;\n  border:0;\n  border-radius:0;\n  overflow:visible;\n  -webkit-user-select:none;\n  user-select:none;\n}\n/* The canvas and SVG share the full stage area and the same screen matrix. */\n.nl .nl-pen-map .nl-pen-canvas {position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}\n.nl .nl-pen-map > svg {position:relative;z-index:1;overflow:visible;touch-action:pan-y}\n.nl .nl-pen-map .nl-pen-notes {z-index:2}\n.nl .nl-pen-map svg [data-map-drag] {touch-action:none}\n.nl .nl-instrument:not(.is-layout-editing) .nl-pen-pair[data-map-drag] {cursor:pointer;touch-action:pan-y}\n.nl .nl-instrument:not(.is-layout-editing) .nl-pen-zone-hit[data-map-drag] {cursor:default}\n.nl .nl-pen-map .nl-pen-zone-hit circle {touch-action:none}\n.nl .nl-pen-map :is([data-pen-under],[data-pen-ink],[data-pen-chords],[data-pen-routes],[data-pen-reticles],[data-pen-names]) {pointer-events:none}\n.nl .nl-pen-map .nl-map-dragging :is([data-pen-ink],[data-pen-chords],[data-pen-hover]) {filter:none}\n.nl .nl-pen-map .f{fill:none;stroke:var(--pen-felt);stroke-linecap:round;stroke-linejoin:round}\n.nl .nl-pen-map .fa{fill:var(--pen-felt)}\n.nl .nl-pen-map .zn{font-family:var(--pen-hand);font-size:35px;font-weight:400;fill:var(--pen-felt);text-anchor:middle;dominant-baseline:central}\n.nl .nl-pen-map .gn{font-family:var(--pen-hand);font-size:14px;fill:var(--pen-felt);text-anchor:middle;dominant-baseline:central}\n.nl .nl-pen-map .bond{stroke:var(--pen-phos);stroke-width:1.1;stroke-dasharray:1.5 4;opacity:.3;stroke-linecap:round}\n.nl .nl-pen-map .recent{fill:none;stroke:var(--pen-phos);stroke-width:4;opacity:.14}\n.nl .nl-pen-map [data-pen-ink]{transition:opacity .6s}\n.nl .nl-pen-map .nl-pen-dim-zone [data-pen-ink]{opacity:.66}\n.nl .nl-pen-map .nl-pen-dim [data-pen-ink]{opacity:.36}\n.nl .nl-pen-map .pencil {fill:none;stroke:var(--pen-pencil);stroke-width:1.1;stroke-dasharray:3 5;stroke-linecap:round}\n.nl .nl-pen-map .pencil.faint {opacity:.5}\n.nl .nl-pen-map .chamber-link {fill:none;stroke:var(--pen-phos);stroke-width:1.6;stroke-linecap:round}\n.nl .nl-pen-map .preview {fill:none;stroke:var(--pen-phos);stroke-width:1.4;opacity:.9}\n.nl .nl-pen-map .cname {font-family:var(--pen-hand);font-size:22px;fill:var(--pen-felt);paint-order:stroke;stroke:#000;stroke-width:7px;stroke-linejoin:round}\n.nl .nl-pen-map .ring {fill:none;stroke:var(--pen-phos);stroke-width:1.3}\n.nl .nl-pen-map .ring.soft {opacity:.55}\n.nl .nl-pen-map .tick {stroke:var(--pen-phos);stroke-width:1.3}\n.nl .nl-pen-map .gring {fill:none;stroke:var(--pen-phos);stroke-width:1.2}\n.nl .nl-pen-map .hetu {fill:none;stroke:var(--pen-bone);stroke-width:1.1;stroke-dasharray:9 6;opacity:.75}\n.nl .nl-pen-map .hetu-m {fill:var(--pen-bone)}\n.nl .nl-pen-map .hetu-l {font-family:var(--pen-mono);font-size:10px;letter-spacing:.14em;fill:var(--pen-bone);paint-order:stroke;stroke:#000;stroke-width:5px}\n.nl .nl-pen-map .ink-in {animation:nl-pen-arrive .5s .6s ease-out both}\n.nl .nl-pen-map .nl-pen-rite-line {fill:none;stroke:var(--pen-phos);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;opacity:.9;animation:nl-pen-draw var(--pen-route-duration,.46s) var(--pen-route-delay,0s) linear both}\n.nl .nl-pen-map .nl-pen-rite-tip {fill:var(--pen-phos);animation:nl-pen-arrive .25s calc(var(--pen-route-delay,0s) + .29s) ease-out both}\n.nl .nl-pen-map .nl-pen-rite-head {display:none;fill:var(--pen-phos);filter:drop-shadow(0 0 4px var(--pen-phos));opacity:0}\n@supports (offset-path:path(\"M0 0L1 1\")) {\n  .nl .nl-pen-map .nl-pen-rite-head {display:block;animation:nl-pen-head var(--pen-route-duration,.46s) var(--pen-route-delay,0s) linear both}\n}\n.nl .nl-pen-map .nl-pen-rite-step.is-jump .nl-pen-rite-line {stroke-dasharray:.04 .055;opacity:.65;animation:nl-pen-arrive .25s var(--pen-route-delay,0s) ease-out both}\n.nl .nl-pen-map .nl-pen-rite.is-static :is(.nl-pen-rite-line,.nl-pen-rite-tip) {animation:none}\n.nl .nl-pen-map [data-pen-boot] .draw,\n.nl .nl-pen-map .pen-in {stroke-dasharray:1 1;stroke-dashoffset:1;animation:nl-pen-draw var(--du,.95s) var(--d,0s) cubic-bezier(.45,.05,.3,1) forwards}\n.nl .nl-pen-map [data-pen-boot] .fade {opacity:0;animation:nl-pen-arrive .45s var(--d,0s) ease-out forwards}\n.nl .nl-pen-map .nl-map-dragging :is(.nl-pen-rite-line,.nl-pen-rite-tip,.pen-in) {animation:none;stroke-dashoffset:0}\n@keyframes nl-pen-draw {from{stroke-dashoffset:1}to{stroke-dashoffset:0}}\n@keyframes nl-pen-arrive {from{opacity:0}to{opacity:1}}\n@keyframes nl-pen-head {0%{opacity:0;offset-distance:0%}14%,89%{opacity:1}100%{opacity:0;offset-distance:100%}}\n.nl .nl-pen-map .nl-pen-candidate {outline:none;cursor:pointer}\n.nl .nl-pen-map .chit {fill:none;stroke:transparent;stroke-width:16;cursor:pointer;pointer-events:stroke}\n.nl .nl-pen-map .nl-pen-candidate-preview {fill:none;stroke:transparent;stroke-width:1.4;pointer-events:none}\n.nl .nl-pen-map .nl-pen-candidate:is(:hover,:focus-visible) .nl-pen-candidate-preview {stroke:var(--pen-phos)}\n.nl .nl-pen-map .nl-pen-hit.active .nl-pen-target {stroke:transparent}\n.nl .nl-pen-map .nl-pen-hit:is(:hover,:focus-visible) .nl-pen-target {stroke:var(--pen-phos)}\n.nl .nl-pen-map .nl-pen-zone-hit:hover:not(:focus-visible) .nl-pen-target {stroke:transparent}\n.nl .nl-pen-map .nl-pen-zone-hit:focus-visible .nl-pen-target {stroke-width:1.2;stroke-dasharray:3 5}\n.nl .nl-pen-map .nl-pen-deposit {fill:var(--pen-felt);stroke:#000;stroke-width:1.6;cursor:pointer;transition:r .2s}\n.nl .nl-pen-map .nl-pen-deposit.s-aq {fill:var(--pen-amber)}\n.nl .nl-pen-map .nl-pen-deposit:is(.s-tarot,.s-disco,.s-acephale) {fill:var(--pen-bone)}\n.nl .nl-pen-map .nl-pen-deposit.is-pencil {fill:#000;stroke:var(--pen-pencil);stroke-width:1.3;stroke-dasharray:2 2}\n.nl .nl-pen-map .nl-pen-deposit:is(:hover,.nl-instrument-highlight) {r:7px}\n.nl .nl-pen-map .nl-pen-deposit.is-hot {filter:drop-shadow(0 0 calc(4px * var(--pen-warmth,1)) var(--pen-phos))}\n.nl .nl-pen-map .nl-pen-deposit.is-hot.s-care {fill:color-mix(in srgb,var(--pen-phos) calc(var(--pen-warmth,1)*100%),var(--pen-felt))}\n.nl .nl-pen-map .nl-pen-notes {position:absolute;inset:0;pointer-events:none}\n.nl .nl-pen-map .note {position:absolute;white-space:nowrap;transform:translate(0,-50%);text-shadow:0 0 3px #000,0 0 7px #000,0 0 12px #000}\n.nl .nl-pen-map .note.L {transform:translate(-100%,-50%);text-align:right}\n.nl .nl-pen-map .note.m {font:400 10.5px/1.55 var(--pen-mono);letter-spacing:.08em;color:var(--pen-phos)}\n.nl .nl-pen-map .note.m b {font-weight:500;color:var(--pen-bone)}\n.nl .nl-pen-map button.note.h {padding:0;border:0;background:transparent;font:400 16px/1 var(--pen-hand);color:var(--pen-pencil);pointer-events:auto;cursor:pointer}\n.nl .nl-pen-map button.note.h.hot {color:var(--pen-felt)}\n.nl .nl-instrument.is-layout-editing .nl-pen-map :is(button.note.h,.chit,.nl-pen-deposit) {pointer-events:none}\n.nl .nl-instrument-tools [data-map-reset][hidden] {display:none}\n@media (prefers-reduced-motion:reduce) {\n  .nl .nl-pen-map * {animation:none!important;transition:none!important}\n  .nl .nl-pen-map :is(.draw,.pen-in) {stroke-dashoffset:0!important}\n  .nl .nl-pen-map :is(.fade,.ink-in) {opacity:1!important}\n}\n\n.nl .nl-instrument-leader path {opacity:.55}\n.nl .nl-instrument-leader circle {opacity:.8}\n\n/* AQ occupies its own amber line alongside the instrument controls. */\n.nl-instrument .nl-instrument-aq-form {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n  min-height: 34px;\n  margin: 0;\n  padding-inline: 3px 0;\n  border-bottom: 1px solid rgb(255 181 71 / .3);\n  color: var(--ni-amber);\n}\n.nl-instrument .nl-instrument-aq-form:focus-within { border-color: var(--ni-amber); }\n.nl-instrument .nl-instrument-aq-form > label {\n  display: flex;\n  align-items: center;\n  align-self: stretch;\n  flex: 1;\n  gap: 9px;\n  min-width: 0;\n  font: 500 11px/1 var(--ni-mono);\n  letter-spacing: .2em;\n}\n.nl .nl-instrument input[data-instrument-aq-input] {\n  flex: 1;\n  min-width: 0;\n  width: 100%;\n  padding: 0;\n  border: 0;\n  border-radius: 0;\n  color: var(--ni-amber);\n  background: none;\n  caret-color: var(--ni-amber);\n  font: 400 13px/1.4 var(--ni-mono);\n  letter-spacing: 0;\n}\n.nl .nl-instrument input[data-instrument-aq-input]:focus-visible { outline: 0; }\n.nl-instrument input[data-instrument-aq-input]::placeholder { color: var(--ni-amber-dim); }\n.nl .nl-instrument .nl-iaq-submit {\n  flex: none;\n  min-width: 26px;\n  align-self: stretch;\n  padding: 2px 5px;\n  color: var(--ni-amber-dim);\n  font: 400 15px/1 var(--ni-mono);\n}\n.nl .nl-instrument .nl-iaq-submit:hover:not(:disabled) { color: var(--ni-amber); }\n.nl .nl-instrument .nl-iaq-submit:focus-visible { outline-color: var(--ni-amber); outline-offset: -2px; }\n.nl-instrument .nl-iaq-preview {\n  flex: none;\n  color: var(--ni-amber-dim);\n  font: 400 11px/1 var(--ni-mono);\n  white-space: nowrap;\n}\n.nl-instrument .nl-iaq-preview b { color: var(--ni-amber); font-weight: 500; }\n.nl-instrument .nl-iaq-address { display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px 12px; }\n.nl-instrument .nl-iaq-coordinate .nl-iaq-demon-hits { flex-direction: column; align-items: flex-start; }\n.nl-instrument .nl-iaq-demon-hit { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; }\n.nl-instrument .nl-iaq-zone-demons { margin-top: 12px; }\n.nl-instrument .nl-iaq-zone-demons > summary {\n  width: fit-content;\n  padding-block: 4px;\n  color: var(--ni-grey);\n  cursor: pointer;\n  font: 400 11.5px/1.5 var(--ni-ui);\n}\n.nl-instrument .nl-iaq-zone-demons > summary:hover { color: var(--ni-phos); }\n@container (max-width: 820px) {\n  .nl .nl-instrument input[data-instrument-aq-input] { font-size: 16px; }\n}\n\n/* The SVG wrapper never receives input. */\n.nl-instrument [data-instrument-aq-overlay] {\n  --nl-aq-ink: #ffb547;\n  color: var(--nl-aq-ink);\n  pointer-events: none;\n}\n\n.nl-instrument :is(.nl-iaq-sigil,.nl-iaq-sigil-last,.nl-iaq-sigil-start,.nl-iaq-sigil-end,.nl-iaq-reticle,.nl-iaq-gate,.nl-iaq-gate-flash) {\n  fill: none;\n  stroke: currentColor;\n  stroke-width: 1.5;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n}\n\n.nl-instrument :is(.nl-iaq-sigil,.nl-iaq-sigil-last,.nl-iaq-sigil-end) { stroke-width: 2.1; }\n.nl-instrument .nl-iaq-sigil-start { stroke-width: 1.8; }\n.nl-instrument .nl-iaq-sigil-last {\n  stroke-dasharray: 1;\n  animation: nl-iaq-draw .35s cubic-bezier(.45,.05,.3,1) both;\n}\n.nl-instrument .nl-iaq-reticle { stroke-dasharray: 3 4; }\n.nl-instrument .nl-iaq-gate { opacity: .82; }\n.nl-instrument .nl-iaq-gate-flash {\n  opacity: 0;\n  stroke-width: 2.4;\n  animation: nl-iaq-flash 2.8s 1.02s ease-out both;\n}\n.nl-instrument .nl-iaq-fall {\n  fill: currentColor;\n  opacity: 0;\n  animation: nl-iaq-land 1.05s linear both;\n}\n.nl-instrument .nl-iaq-fall text { font: 400 15px var(--ni-mono); }\n.nl-instrument .nl-iaq-ripple { fill:none; stroke:currentColor; opacity:0; animation:nl-iaq-ripple .95s 1.02s ease-out both; }\n.nl-instrument .nl-iaq-ripple.is-echo { animation-delay:1.15s; }\n\n@keyframes nl-iaq-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }\n@keyframes nl-iaq-flash {\n  0% { opacity: 0; }\n  16% { opacity: .96; }\n  100% { opacity: 0; }\n}\n@keyframes nl-iaq-land {\n  0% { transform: translate(28px,var(--nl-iaq-drop)); opacity: 0; }\n  14% { transform: translate(17px,calc(var(--nl-iaq-drop) * .98)); opacity: .96; }\n  50% { transform: translate(-9px,calc(var(--nl-iaq-drop) * .75)); opacity: .96; }\n  89% { transform: translate(3px,calc(var(--nl-iaq-drop) * .21)); opacity: .96; }\n  100% { transform: translate(0,0); opacity: 0; }\n}\n@keyframes nl-iaq-ripple {\n  from { transform:scale(.72); opacity:.83; }\n  to { transform:scale(1.92); opacity:0; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .nl-instrument .nl-iaq-sigil-last { animation: none; stroke-dasharray: none; }\n  .nl-instrument :is(.nl-iaq-fall,.nl-iaq-gate-flash,.nl-iaq-ripple) { animation: none; display: none; }\n}\n.nl-instrument .nl-iaq-shelf { container: nl-iaq-shelf / inline-size; }\n.nl-instrument .nl-iaq-tabs {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 3px 14px;\n  margin-block-end: 12px;\n  border-block-end: 1px solid rgb(255 181 71 / .22);\n}\n.nl .nl-instrument .nl-iaq-tabs button {\n  min-height: 30px;\n  padding: 3px 0;\n  color: var(--ni-grey);\n  font: 400 12px/1.4 var(--ni-ui);\n}\n.nl .nl-instrument .nl-iaq-tabs button:is([aria-pressed=\"true\"], :hover, :focus-visible) { color: var(--ni-amber); }\n.nl .nl-instrument .nl-iaq-tabs button[aria-pressed=\"true\"] { box-shadow: inset 0 -1px var(--ni-amber); }\n.nl-instrument .nl-iaq-tabs small { margin-inline-start: 3px; font: 400 10px/1 var(--ni-mono); }\n.nl-instrument .nl-iaq-filters {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px 16px;\n  margin-block-end: 10px;\n}\n.nl-instrument .nl-iaq-filters :is(.nl-iaq-filter-select, .nl-iaq-sort-select) {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  min-width: 0;\n  color: var(--ni-grey);\n  font: 400 11px/1.4 var(--ni-ui);\n}\n.nl .nl-instrument .nl-iaq-filters select {\n  min-width: 0;\n  max-width: 100%;\n  min-height: 32px;\n  padding: 4px 7px;\n  border: 1px solid rgb(255 181 71 / .25);\n  border-radius: 3px;\n  background: #0e0c09;\n  color: var(--ni-bone);\n  font: 400 12px/1.4 var(--ni-ui);\n  cursor: pointer;\n}\n.nl .nl-instrument .nl-iaq-filters select:hover { border-color: rgb(255 181 71 / .5); }\n.nl .nl-instrument .nl-iaq-filters select:focus-visible { outline-color: var(--ni-amber); }\n.nl-instrument .nl-iaq-shelf-header {\n  position: sticky;\n  z-index: 1;\n  inset-block-start: 0;\n  padding-block: 3px;\n  background: #000;\n  border-block-end: 1px solid rgb(255 181 71 / .16);\n}\n.nl-instrument .nl-iaq-summary-line { display: flex; align-items: center; justify-content: space-between; gap: 4px 12px; }\n.nl-instrument :is(.nl-iaq-results-status, .nl-iaq-sentinel) {\n  margin: 6px 0;\n  color: var(--ni-grey);\n  font: 400 11px/1.45 var(--ni-mono);\n}\n.nl-instrument :is(.nl-iaq-results, .nl-iaq-selected) {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 0 16px;\n  margin: 8px 0;\n  padding: 0;\n}\n.nl-instrument :is(.nl-iaq-results, .nl-iaq-selected) > li { grid-column: 1 / -1; min-width: 0; padding: 9px 0; border-block-end: 1px solid rgb(255 181 71 / .13); }\n.nl-instrument :is(.nl-iaq-results, .nl-iaq-selected) > li { content-visibility: auto; contain-intrinsic-block-size: auto 55px; }\n.nl-instrument :is(.nl-iaq-results, .nl-iaq-selected) > li[data-match-kind=\"word\"]:not(:has(> .nl-iaq-reading)) { grid-column: auto; }\n.nl-instrument .nl-iaq-result-head { display: flex; align-items: start; justify-content: space-between; gap: 8px; }\n.nl-instrument .nl-iaq-result-credit { color: var(--ni-grey); font: 400 11px/1.5 var(--ni-ui); overflow-wrap: anywhere; }\n.nl-instrument :is(.nl-iaq-results, .nl-iaq-selected) .nl-iaq-match-text {\n  min-width: 0;\n  min-height: 26px;\n  max-inline-size: 100%;\n  padding: 0;\n  color: var(--ni-bone);\n  font: 400 19px/1.25 var(--ni-book);\n  text-align: start;\n  overflow-wrap: anywhere;\n}\n.nl-instrument :is(.nl-iaq-results, .nl-iaq-selected) button[data-instrument-aq-match]:is(:hover, :focus-visible) { color: var(--ni-amber); }\n.nl-instrument :is(.nl-iaq-results, .nl-iaq-selected) button[aria-expanded=\"true\"] {\n  text-decoration: underline;\n  text-decoration-color: rgb(255 181 71 / .45);\n  text-underline-offset: 4px;\n}\n.nl-instrument .nl-iaq-reading {\n  margin-block: 6px 10px;\n  padding: 2px 0 3px 12px;\n  border-inline-start: 1px solid rgb(255 181 71 / .3);\n}\n.nl-instrument .nl-iaq-reading .pass { white-space: pre-wrap; overflow-wrap: anywhere; }\n.nl-instrument .nl-iaq-collect-actions { display: flex; flex: none; }\n.nl .nl-instrument button.nl-iaq-collect { min-width: 28px; min-height: 29px; padding: 0 3px; color: var(--ni-amber-dim); font: 400 15px/1 var(--ni-mono); }\n.nl .nl-instrument button.nl-iaq-collect:is(:hover, :focus-visible):not(:disabled) { color: var(--ni-amber); }\n.nl .nl-instrument button.nl-iaq-collect:disabled { opacity: .4; }\n.nl-instrument .nl-iaq-receipt dl { display: grid; grid-template-columns: minmax(75px, 26%) minmax(0, 1fr); gap: 4px 10px; font: 400 11px/1.5 var(--ni-mono); }\n.nl-instrument .nl-iaq-receipt dt { color: var(--ni-grey); }\n.nl-instrument .nl-iaq-receipt dd { margin: 0; overflow-wrap: anywhere; }\n.nl-instrument .nl-iaq-receipt :is(h4, li) { color: var(--ni-grey); font: 400 12px/1.5 var(--ni-ui); overflow-wrap: anywhere; }\n.nl-instrument .nl-iaq-sentinel:not([hidden]) { min-block-size: 1px; }\n.nl-instrument .nl-iaq-feed-status { display: inline-block; padding-block: 4px; }\n@container nl-iaq-shelf (max-width: 365px) {\n  .nl-instrument :is(.nl-iaq-results, .nl-iaq-selected) { grid-template-columns: minmax(0, 1fr); }\n  .nl .nl-instrument .nl-iaq-filters select { min-height: 36px; }\n}\n.nl .nl-instrument :is(.nl-iaq-reading .adv-l, .nl-iaq-sentinel button, .nl-iaq-index-link) {\n  min-height: 29px;\n  padding: 5px 0;\n  color: var(--ni-grey);\n  font: 400 10.5px/1.4 var(--ni-ui);\n  letter-spacing: .12em;\n  text-transform: uppercase;\n}\n.nl .nl-instrument :is(.nl-iaq-reading .adv-l, .nl-iaq-sentinel button, .nl-iaq-index-link):is(:hover, :focus-visible) {\n  color: var(--ni-amber);\n  outline-color: var(--ni-amber);\n}\n\n.nl-instrument .nl-instrument-top.has-header-aq {\n  min-height: 0;\n  height: 0;\n  padding: 0;\n}\n.nl-instrument .has-header-aq .nl-instrument-tools {\n  display: none;\n}\n.nl-instrument .has-header-aq[data-tools-open] .nl-instrument-tools {\n  display: flex;\n  position: absolute;\n  inset-block-start: 8px;\n  inset-inline-start: 0;\n  padding: 4px 8px;\n  border: 1px solid var(--line);\n  border-radius: 8px;\n  background: #050b07;\n}\n\n/* Dealt cards are the only outlined objects in the main instrument. */\n.nl-instrument .nl-ic-decks {display:flex;align-items:flex-end;gap:16px;min-width:0;max-width:100%;flex-wrap:nowrap}\n.nl-instrument button.nl-ic-deck {display:flex;align-items:flex-end;gap:9px;min-width:0;padding:4px 2px;text-align:left}\n.nl-instrument .nl-ic-deck svg {flex:none;width:30px;height:44px;overflow:visible;transition:transform .25s}\n.nl-instrument .nl-ic-deck:hover svg,.nl-instrument .nl-ic-deck:focus-visible svg,.nl-instrument .nl-ic-deck[aria-expanded=\"true\"] svg {transform:translateY(-4px) rotate(-3deg)}\n.nl-instrument .nl-ic-deck>span {display:flex;flex-direction:column;gap:5px;min-width:0}\n.nl-instrument .nl-ic-deck-label {font:400 9.5px/1.3 var(--ni-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--ni-grey);max-width:9.6em}\n.nl-instrument .nl-ic-deck small {font:400 11px/1 var(--ni-mono);color:var(--ni-felt)}\n.nl-instrument .nl-ic-outline {fill:#000;stroke:var(--ni-felt,#74f64a);stroke-width:1.15}\n.nl-instrument .nl-ic-outline.back {stroke:#2e5027}\n.nl-instrument .nl-ic-deck[aria-expanded=\"true\"] .nl-ic-outline:not(.back) {stroke:var(--ni-phos,#3dff8c)}\n.nl-instrument .nl-ic-glyph {fill:none;stroke:var(--ni-felt,#74f64a);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round}\n\n.nl-instrument .nl-ic-spread {position:fixed;inset:auto 0 0;z-index:30;padding:26px max(16px,env(safe-area-inset-right,0px)) calc(14px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:linear-gradient(to top,#000 74%,transparent)}\n.nl-instrument .nl-ic-spread header {display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 18px}\n.nl-instrument .nl-ic-spread h2 {margin:0;color:var(--ni-bone);font:italic 400 25px/1 var(--ni-book)}\n.nl-instrument .nl-ic-spread header>span {color:var(--ni-phos);font:400 11px var(--ni-mono);text-transform:uppercase;letter-spacing:.1em}\n.nl-instrument .nl-ic-spread header>p {flex:1;min-width:220px;color:var(--ni-bone-dim);font:400 18px/1.2 var(--ni-book)}\n.nl .nl-instrument .nl-ic-spread [data-instrument-deck-close] {border:0;padding:0 2px;min-height:36px;color:var(--ni-grey);background:none;font:400 10.5px/1 var(--ni-ui);letter-spacing:.16em;text-transform:uppercase;text-decoration:none;white-space:nowrap}\n.nl .nl-instrument .nl-ic-spread [data-instrument-deck-close]:hover {color:var(--ni-bone)}\n.nl-instrument .nl-ic-spread-cards {display:flex;min-width:0;overflow-x:auto;padding:36px 22px 8px 6px;scrollbar-width:thin;scrollbar-color:#2a3a2c transparent;overscroll-behavior-inline:contain}\n.nl-instrument .nl-ic-spread-cards.arc .nl-ic-card {margin-inline-end:-11px}\n.nl-instrument .nl-ic-spread-cards.flat {gap:3px}\n.nl-instrument .nl-ic-groups {display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:12px}\n.nl .nl-instrument .nl-ic-groups button {min-height:32px;padding:4px 0;border-bottom:1px solid transparent;color:var(--ni-grey);font:400 12px var(--ni-ui)}\n.nl .nl-instrument .nl-ic-groups button:is(:hover, :focus-visible, [aria-pressed=\"true\"]) {color:var(--ni-phos);border-bottom-color:var(--ni-phos)}\n.nl-instrument .nl-ic-groups + .nl-ic-spread-cards {padding-top:22px}\n.nl-instrument .nl-ic-card {position:relative;display:block;flex:none;width:70px;aspect-ratio:70/110;isolation:isolate;--ic-card-font:11px;color:var(--ni-bone)}\n.nl-instrument button.nl-ic-card {padding:0;transform:rotate(var(--ic-turn,0deg)) translateY(var(--ic-drop,0px));transform-origin:50% 160%;transition:transform .28s cubic-bezier(.2,.7,.2,1)}\n.nl-instrument button.nl-ic-card:hover,.nl-instrument button.nl-ic-card:focus-visible {z-index:2;transform:rotate(var(--ic-turn,0deg)) translateY(calc(var(--ic-drop,0px) - 18px))}\n.nl-instrument button.nl-ic-card:hover .nl-ic-outline,.nl-instrument button.nl-ic-card:focus-visible .nl-ic-outline {stroke:var(--ni-phos,#3dff8c);stroke-dasharray:none}\n.nl-instrument .nl-ic-card svg {width:100%;height:100%;overflow:visible}\n.nl-instrument .nl-ic-number {fill:var(--ni-phos,#3dff8c);font:400 7.5px var(--ni-mono,monospace);letter-spacing:.09em}\n.nl-instrument .nl-ic-dot {fill:var(--ni-felt,#74f64a);opacity:.54}\n.nl-instrument .nl-ic-chord {fill:none;stroke:var(--ni-felt,#74f64a);stroke-width:.95}\n.nl-instrument .nl-ic-chord.pencil {stroke:var(--ni-pencil,#8c9688);stroke-width:.9;stroke-dasharray:2 2}\n.nl-instrument .nl-ic-chord.chamber {stroke:var(--ni-phos);stroke-width:1.35}\n.nl-instrument .nl-ic-rule {fill:none;stroke:var(--ni-felt,#74f64a);stroke-width:.55;opacity:.44}\n.nl-instrument .nl-ic-card.pencil .nl-ic-outline {stroke:var(--ni-pencil,#8c9688);stroke-dasharray:3 3}\n.nl-instrument .nl-ic-card.chamber .nl-ic-outline {stroke:var(--ni-phos);opacity:.85}\n.nl-instrument .nl-ic-card.dark .nl-ic-outline {stroke:#465345}\n.nl-instrument .nl-ic-card.dark .nl-ic-dot {fill:#697969;opacity:.7}\n.nl-instrument .nl-ic-card.dark .nl-ic-rule,.nl-instrument .nl-ic-card.dark .nl-ic-glyph {stroke:#657362}\n.nl-instrument .nl-ic-card.dark .nl-ic-number {fill:var(--ni-grey,#a2ad9c)}\n.nl-instrument .nl-ic-title {position:absolute;z-index:1;inset:74% 9% 5%;display:grid;align-items:center;text-align:center;text-wrap:balance;color:var(--ni-bone,#e8e3d1);font:400 var(--ic-card-font)/1 var(--ni-book,Georgia,serif);overflow-wrap:normal;word-break:normal;hyphens:none}\n.nl-instrument .nl-ic-title.long {font-size:calc(var(--ic-card-font)*.75)}\n.nl-instrument .nl-ic-spread-cards.arc .nl-ic-title {inset-inline:6px 13px;transform:translateY(calc(-1 * var(--ic-label-rise, 0px)))}\n.nl-instrument .nl-ic-spread-cards.arc .nl-ic-title.long {font-size:6.5px}\n.nl-instrument .nl-ic-row {display:flex;flex-wrap:wrap;gap:7px;align-items:flex-start;margin-block:7px}\n.nl-instrument .nl-ic-row .nl-ic-card {width:76px;--ic-card-font:11.25px}\n.nl-instrument .nl-ic-row button.nl-ic-card:hover,.nl-instrument .nl-ic-row button.nl-ic-card:focus-visible {transform:translateY(-4px)}\n.nl-instrument .nl-ic-portrait {width:116px;aspect-ratio:116/181;--ic-card-font:16px}\n.nl-instrument .nl-ic-sigil {width:150px;height:auto;overflow:visible;flex:none}\n\n.nl-instrument .nl-ic-location {display:flex;align-items:flex-start;flex-wrap:wrap;gap:22px}\n.nl-instrument .nl-ic-location>div:not(.nl-ic-portrait) {min-width:0}\n.nl-instrument .nl-ic-location:has(.nl-ic-sigil)>div {flex:1;min-width:min(240px,100%)}\n.nl-instrument .nl-ic-muted {font:400 16px/1.35 var(--ni-book,Georgia,serif);color:var(--ni-bone-dim,#b3b19f)}\n.nl-instrument .nl-ic-chords {display:grid;gap:0;max-width:100%;padding:0;margin:0;list-style:none}\n.nl-instrument .nl-ic-chords>li {display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:3px 12px;padding:4px 0;border-bottom:1px solid #1a2619;min-width:0}\n.nl-instrument .nl-ic-chords>li:last-child {border-bottom:0}\n.nl .nl-instrument .nl-ic-chords>li>button.nl-instrument-link,.nl .nl-instrument .nl-ic-related>button.nl-instrument-link {color:var(--ni-bone,#e8e3d1);font:400 18px/1.25 var(--ni-book,Georgia,serif);padding:1px 0;text-align:left;text-decoration-color:#3b5d37;overflow-wrap:break-word;min-width:0;white-space:normal}\n.nl-instrument .nl-ic-chords>li>span {color:var(--ni-felt,#74f64a);font:400 10.5px/1.5 var(--ni-mono,monospace);white-space:nowrap}\n.nl-instrument .nl-ic-chords>li.pencil>span {color:var(--ni-pencil,#8c9688)}\n.nl-instrument .nl-ic-passage {padding-block:3px 10px}\n.nl-instrument .nl-ic-passage summary {font:400 12px/1.45 var(--ni-ui,Arial,sans-serif);color:var(--ni-grey,#a2ad9c);cursor:pointer}\n.nl-instrument .nl-ic-passage>p {padding-top:8px;white-space:pre-line;max-width:65ch;font:400 17px/1.5 var(--ni-book,Georgia,serif);color:var(--ni-bone,#e8e3d1)}\n.nl-instrument .nl-ic-passage>p.nl-ic-muted {font-size:14px;color:var(--ni-bone-dim,#b3b19f)}\n.nl-instrument .nl-ic-passage code {display:block;font:400 10px/1.5 var(--ni-mono,monospace);color:var(--ni-grey,#a2ad9c);overflow-wrap:anywhere}\n.nl-instrument button.nl-ic-link {padding:4px 0;color:var(--ni-grey,#a2ad9c);font:400 10.5px/1.45 var(--ni-mono,monospace);text-align:left;letter-spacing:.03em;text-decoration:underline;text-decoration-color:#39523c;text-underline-offset:3px}\n.nl-instrument button.nl-ic-link:hover,.nl-instrument button.nl-ic-link:focus-visible {color:var(--ni-phos,#3dff8c)}\n.nl-instrument .nl-ic-actions {display:flex;flex-wrap:wrap;gap:6px 15px;margin-top:9px}\n\n@media (max-width:580px) {\n  .nl-instrument .nl-ic-decks {gap:7px;justify-content:space-between}\n  .nl-instrument button.nl-ic-deck {gap:4px}\n  .nl-instrument .nl-ic-deck svg {width:24px;height:35px}\n  .nl-instrument .nl-ic-deck-label {font-size:8.5px;letter-spacing:.08em}\n  .nl-instrument .nl-ic-spread-cards.arc {padding:20px 5px 18px;gap:3px}\n  .nl-instrument .nl-ic-spread-cards.arc .nl-ic-card {transform:none;margin-inline-end:0}\n}\n@media (max-width:820px) {\n  .nl-instrument .nl-ic-decks {overflow-x:auto;padding-bottom:4px}\n  .nl-instrument .nl-ic-spread header>p {flex-basis:100%;min-width:0}\n}\n@media (prefers-reduced-motion:reduce) {\n  .nl-instrument .nl-ic-card,.nl-instrument .nl-ic-deck svg {transition:none}\n  .nl-instrument button.nl-ic-card:hover,.nl-instrument button.nl-ic-card:focus-visible,.nl-instrument .nl-ic-row button.nl-ic-card:hover,.nl-instrument .nl-ic-row button.nl-ic-card:focus-visible {transform:rotate(var(--ic-turn,0deg)) translateY(var(--ic-drop,0px))}\n  .nl-instrument .nl-ic-deck:hover svg,.nl-instrument .nl-ic-deck:focus-visible svg,.nl-instrument .nl-ic-deck[aria-expanded=\"true\"] svg {transform:none}\n}\n.nl-demon-reading {\n  margin: 0;\n  color: var(--ni-bone, inherit);\n  font: italic 400 21px/1.35 var(--ni-book, Georgia, serif);\n}\n.nl-instrument .nl-demon-profile {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  gap: 16px;\n  min-width: 0;\n}\n.nl-instrument .nl-demon-profile .specs {\n  grid-template-columns: clamp(6.4rem, 25%, 10rem) minmax(0, 1fr);\n  gap: 6px 16px;\n}\n.nl-instrument .nl-demon-profile .specs dt { letter-spacing: .09em; }\n.nl-instrument .nl-demon-profile .specs .nl-audit-value {\n  display: block;\n  color: var(--ni-bone);\n  font: 400 13px/1.5 var(--ni-ui);\n}\n.nl-instrument .nl-demon-profile .lbl { margin-block-end: 6px; }\n.nl-instrument .nl-demon-support .note-chance { margin-block-end: 0; }\n.nl-instrument .nl-demon-linked .nl-ic-row { flex-wrap: nowrap; overflow-x: auto; margin: 0; padding-block: 4px; }\n.nl-card-chamber-link { padding: 9px 0; border-block-end: 1px solid var(--line, rgb(103 174 104 / .22)); }\n.nl-card-chamber-link header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px 12px; }\n.nl-card-chamber-link header span, .nl-card-chamber-link small { color: var(--ni-grey, var(--muted)); font: 400 11px/1.4 var(--ni-ui, sans-serif); }\n.nl-card-chamber-link p { margin: 5px 0; font: 400 17px/1.35 var(--ni-book, Georgia, serif); white-space: pre-line; }\n.nl-audit-details summary { cursor: pointer; }\n.nl-audit-details .nl-audit-source {\n  color: var(--ni-grey, var(--muted));\n  font-size: 12px;\n  margin: 10px 0;\n}\n.nl-audit-facts {\n  display: grid;\n  grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);\n  gap: 4px 14px;\n  margin: 10px 0;\n  font-size: 13px;\n  line-height: 1.5;\n}\n.nl-audit-facts dt { color: var(--ni-grey, var(--muted)); }\n.nl-audit-facts dd, .nl-demon-profile .nl-audit-value { margin: 0; overflow-wrap: anywhere; }\n.nl .nl-audit-details .nl-audit-section {\n  margin: 0;\n  padding: 7px 0;\n}\n.nl-audit-details .nl-audit-section p {\n  margin: 5px 0 8px 12px;\n  font-size: 13px;\n  line-height: 1.55;\n  overflow-wrap: anywhere;\n}\n";
export const html = "<section class=\"nl\" aria-label=\"NUMO library\"></section>";
