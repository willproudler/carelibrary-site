const fold = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
const words = value => fold(value).match(/[\p{L}\p{N}]+/gu) || [];
const namesMatch = (name, author) => words(name).every(word => words(author).includes(word));
const kinds = {book:'books', books:'books', work:'books', works:'books',
  axiom:'axiom', axioms:'axiom', passage:'passage', passages:'passage', 'original text':'passage'};
const ordinal = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth',
  'eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth',
  'eighteenth','nineteenth','twentieth','twenty-first'];

export async function searchPublished(request, {signal, fetcher = globalThis.fetch} = {}) {
  const response = await fetcher('/api/library/search', {
    method:'POST', credentials:'same-origin', signal, cache:'no-store',
    headers:{'Content-Type':'application/json'}, body:JSON.stringify(request),
  });
  if (!response.ok) throw new Error('The published reading index could not search. Try again shortly.');
  const value = await response.json();
  if (!Array.isArray(value.results)) throw new Error('The published reading index returned an incomplete search.');
  return value;
}

function searchIntent(query) {
  let text = query.replace(/^(?:please\s+)?(?:show me|give me|find me|search for|look for|find|list)\s+/i, '');
  const kindMatch = /^(books?|works?|axioms?|passages?|original text)(?=\s+(?:by|about|on|from|in|during|mentioning)\b|$)\s*/i.exec(text);
  const kind = kindMatch ? kinds[kindMatch[1].toLowerCase()] : '';
  if (kindMatch) text = text.slice(kindMatch[0].length);
  const filters = [];
  let yearRange;
  if (!/["“”]/.test(text)) {
    const period = /(?:^|\s)(?:from|in|during)\s+(?:the\s+)?([\w-]+)\s+century(?:\s+(BCE|BC))?\b/i.exec(text);
    if (period) {
      const century = Number.parseInt(period[1],10) || ordinal.indexOf(period[1].toLowerCase()) + 1;
      if (century > 0 && century < 100) {
        const start = (century - 1) * 100 + 1;
        yearRange = period[2] ? [-century * 100,-start] : [start,century * 100];
        text = text.slice(0,period.index) + text.slice(period.index + period[0].length);
        filters.push('From ' + period[1] + ' century' + (period[2] ? ' BCE' : ''));
      }
    }
  }
  const by = /(?:^|\s)by\s+(?:"([^"]+)"|([^"“”]+?))(?=\s+(?:about|on|mentioning)\s|$)/i.exec(text);
  const author = (by?.[1] || by?.[2] || '').trim();
  if (author) {
    text = text.slice(0,by.index) + text.slice(by.index + by[0].length);
    filters.push('Author · ' + author);
  }
  if (kind) text = text.trim().replace(/^(?:about|on|mentioning)\s+/i, '');
  return {text:text.trim(),kind,author,yearRange,filters};
}

function highlights(value, query) {
  const text = String(value || '');
  if (!text) return [];
  const terms = (query.match(/[\p{L}\p{N}]{2,}/gu) || []).slice(0,30);
  if (!terms.length) return [[text,false]];
  const pattern = new RegExp('(?<![\\p{L}\\p{N}])(?:' + [...new Set(terms)].sort((a,b) => b.length - a.length)
    .join('|') + ')(?![\\p{L}\\p{N}])','giu');
  const out = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    if (end < match.index) out.push([text.slice(end,match.index),false]);
    out.push([match[0],true]);
    end = match.index + match[0].length;
  }
  if (end < text.length) out.push([text.slice(end),false]);
  return out;
}

function card({identity,href,title,badge,tone,meta,reason,heading,snippet,reference},query) {
  return {identity,href,presentation:{badge,tone,meta,reason,reference,
    title:highlights(title,query),heading:highlights(heading,query),snippet:highlights(snippet,query)}};
}

function matchesDate(work, range) {
  if (!range) return true;
  const original = String(work?.year ?? '');
  const year = Number.parseInt(original.match(/[+-]?\d{1,6}/)?.[0],10);
  if (!Number.isFinite(year)) return false;
  const signed = /\bB\.?C/i.test(original) ? -Math.abs(year) : year;
  return range[0] <= signed && signed <= range[1];
}

function catalogueMatches(works,fields,{text,kind,author,yearRange},query) {
  if (kind && kind!=='books') return [];
  const literal = /^["“](.+)["”]$/.exec(text)?.[1];
  const terms = fold(text).split(/\s+/).filter(Boolean);
  const matches = (haystack) => literal ? fold(haystack).includes(fold(literal)) : terms.every(term => fold(haystack).includes(term));
  const result = [];
  for (const work of works) {
    if (!matchesDate(work,yearRange) || (author && !namesMatch(author,work.author))) continue;
    if (!matches([work.title,work.author,work.year,work.edition,work.original_title,work.id,work.slug].join(' '))) continue;
    const exact = fold(work.title)===fold(text)||fold(work.id)===fold(text)||fold(work.slug)===fold(text);
    result.push({score:exact?3:matches(work.title)?2:1,
      row:card({identity:'book:'+work.id,href:'#book='+encodeURIComponent(work.slug),title:work.title,
        badge:'Book',tone:'books',meta:[work.author,work.year].filter(Boolean).join(' · '),
        reason:exact?'Exact title or ID':''},query)});
  }
  if (!author&&!yearRange&&!kind) for (const field of fields) {
    if (!matches([field.title,field.field,field.author,field.id].join(' '))) continue;
    result.push({score:fold(field.title)===fold(text)?3:1,
      row:card({identity:'field:'+field.id,href:'#field='+encodeURIComponent(field.id),title:field.title,
        badge:field.field==='corpus'?'Corpus':'Lateral',tone:'care'},query)});
  }
  return result.sort((a,b)=>b.score-a.score||
    a.row.presentation.title.map(([text])=>text).join('').localeCompare(b.row.presentation.title.map(([text])=>text).join('')))
    .map(({row})=>row);
}

export function searchReadingHref(href,itemId) {
  if (typeof href!=='string'||!/^#(?:book|field|lateral)=/.test(href)) return '';
  const route = new URLSearchParams(href.slice(1));
  if (route.has('book') && route.get('ref')===itemId) {
    route.delete('ref');
    route.set('focus',itemId);
  }
  return '#'+route;
}

function contentCard(item,query) {
  const passage = item.kind==='passage';
  const excerpt = String(item.text||'').trim().slice(0,420);
  const layer = item.layer ? item.layer + ' · ' : '';
  return card({identity:item.target_key || item.kind+':'+item.item_id,href:searchReadingHref(item.href,item.item_id),
    title:passage ? excerpt || item.title : item.title || layer + 'Axiom',
    badge:passage?'Original passage':layer+'Axiom',tone:passage?'text':'care',
    meta:[item.work_title,item.author,item.year].filter(Boolean).join(' · '),
    reason:item.search_match,
    heading:passage?item.title:'',
    snippet:passage?'':excerpt,
    reference:item.item_id,
  },query);
}

export async function searchSpotlight(query,{works,fields,limit=9,signal,search=searchPublished}) {
  if (!query.trim()) return {results:[],filters:[]};
  const intent = searchIntent(query);
  const catalogue = catalogueMatches(works,fields,intent,query);
  if (intent.kind==='books'||!intent.text) return {results:catalogue.slice(0,limit),filters:intent.filters};
  const workById = new Map(works.map(work=>[work.id,work]));
  const eligible = work => work && matchesDate(work,intent.yearRange)&&(!intent.author||namesMatch(intent.author,work.author));
  const scope = intent.author||intent.yearRange ? works.filter(eligible) : null;
  if (scope && !scope.length) return {results:catalogue.slice(0,limit),filters:intent.filters};
  try {
    const request = {query:intent.text,kind:intent.kind||'all',mode:'classic',limit};
    if (scope?.length===1) request.work_id=scope[0].id;
    const {results} = await search(request,{signal});
    const readings = results.filter(item =>
      (item.kind==='axiom'||item.kind==='passage')&&/^#(?:book|field|lateral)=/.test(item.href||'')&&
      (!scope||eligible(workById.get(item.work_id)))
    ).map(item=>contentCard(item,query));
    const books = catalogue.slice(0,readings.length ? Math.max(1,Math.ceil(limit/3)) : limit);
    return {results:[...books,...readings].slice(0,limit),filters:intent.filters};
  } catch (error) {
    if (signal?.aborted) throw error;
    return {results:catalogue.slice(0,limit),filters:[...intent.filters,'Reading search is temporarily unavailable.']};
  }
}
