/* Project the fixed public collection into CARE's shipped study-desk contract.
 * This module has no fetch, storage, generation or private-library fallback.
 * Source alignments and item references are the only edges in a route.
 */
import {indexLibrary, incoming, selectionFor} from './library-core.mjs';
import {ORIGINAL, selectedVariant, paneLanguages as describePaneLanguages, bookLanguages as describeBookLanguages} from './saved-translations.mjs?v=20261005-covers2';

const array = value => Array.isArray(value) ? value : [];
const unique = values => [...new Set(values)];
const text = value => String(value ?? '');
const escape = value => text(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASE_LAYERS = ['CH','CL','MC','WB'];
const mcLevel = unit => {
  const matches = [...text(unit?.id || unit).matchAll(/_L([1-9][0-9]*)(?=_)/g)];
  return matches.length ? Number(matches.at(-1)[1]) : null;
};

// Conservative local presentation: preserve wording and escape source HTML.
// These are display views only; the unchanged text remains on every record.
function inline(value) {
  return escape(value).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
function block(value) {
  return text(value).split(/\n\s*\n/).map(part => {
    const heading = part.match(/^(#{1,6})\s+([^\n]+)$/);
    if (heading) return `<h${Math.min(heading[1].length + 1, 6)}>${inline(heading[2])}</h${Math.min(heading[1].length + 1, 6)}>`;
    return `<p>${inline(part)}</p>`;
  }).join('');
}

export function createPublicReaderAdapter(data) {
  const index = indexLibrary(data);
  const worksById = new Map(data.works.map(work => [work.id, work]));
  const lateral = data.lateral;
  const lateralWorks = data.works.filter(work => work.units.some(unit => lateral.parents.includes(unit.id)));
  const unitCache = new Map(), chapterCache = new Map();
  const workFor = value => worksById.get(value) || index.works.get(value);
  const requiredWork = value => {
    const work = workFor(value);
    if (!work) throw new Error('This book is not in the public collection.');
    return work;
  };
  const nodeFor = id => {
    const node = index.nodes.get(text(id));
    if (!node) throw new Error('This reference is not in the public collection.');
    return node;
  };
  const paneId = unit => `public:${unit.id}`;
  const inScope = (node, work) => !work || node?.work?.id === work.id;
  const linksFor = (node, work) => incoming(node).filter(link => inScope(index.nodes.get(link.id), work));
  const usesFor = (id, work) => array(index.outgoing.get(id)).filter(link => inScope(index.nodes.get(link.id), work));

  function nativeItem(item, section, position, unit) {
    return {
      id:item.id, local_id:item.id.split(':').slice(1).join(':'), text:item.text,
      reading_html:inline(item.text), reading_block_html:block(item.text), reading_text:item.text,
      section_number:text(section.number), section_name:section.name,
      address:`${unit.layer}.${section.number}.${String(position + 1).padStart(2,'0')}`,
      position:position + 1, layer:unit.layer,
      trace_type:item.trace_type || '', evidence_class:'',
      source_trace:array(item.refs), deep_source_trace:array(item.deep_refs), matrix_trace:[],
      passage_trace_ids:array(item.passages).map(passage => passage.id),
      passage_alignments:array(item.passages),
    };
  }

  function unit(id, state = {}) {
    const original = index.units.get(id);
    if (!original || original.layer === 'SOURCE') throw new Error('This CARE sheet is not in the public collection.');
    const variant = selectedVariant(original, original.work, state), reading = variant || original;
    const cacheKey = `${id}\0${variant?.id || ORIGINAL}`;
    if (unitCache.has(cacheKey)) return unitCache.get(cacheKey);
    const projected = {
      id:original.id, type:original.layer, layer:original.layer,
      label:reading.title || original.title, title:reading.title || original.title, version:original.revision || '',
      sequence_number:original.order, chapter_number:original.layer === 'CH' ? original.order : undefined,
      mc_level:mcLevel(original),
      sheet_versions:describePaneLanguages(original,original.work,state),
      sections:array(reading.sections).map(section => ({
        number:text(section.number), name:section.name,
        items:array(section.items).map((item, position) => nativeItem(item, section, position, original)),
      })),
      identity:{title:reading.title || original.title, kicker:original.layer === 'CH' ? `CHAPTER ${original.order}` : ({CL:'CLUSTER',MC:'META-CLUSTER',WB:'WHOLE BOOK',XR:'LATERAL'}[original.layer] || original.layer),
        context:original.work?.title || `${lateralWorks.map(work => work.title).join(' × ')} · Saved diagnostic reading`},
    };
    projected.item_count = projected.sections.reduce((sum, section) => sum + section.items.length, 0);
    unitCache.set(cacheKey, projected);
    return projected;
  }

  function chapter(id) {
    if (chapterCache.has(id)) return chapterCache.get(id);
    const source = index.units.get(id);
    if (!source || source.layer !== 'SOURCE') throw new Error('This source chapter is not in the public collection.');
    const rows = array(source.paragraphs);
    const result = {
      raw_unit_id:source.id, care_unit_id:source.chapter_id, chapter_number:source.order,
      sequence_number:source.order, title:source.title, label:source.title,
      passage_count:rows.length, source_versions:describePaneLanguages(source,source.work),
      passages:rows.map((passage, position) => ({
        id:passage.id, text:passage.text, reading_text:passage.text,
        reading_html:inline(passage.text), reading_block_html:block(passage.text),
        address:passage.kind === 'display' ? `Reading paragraph ${position + 1}` : passage.id,
        sequence:position + 1, preceding_id:rows[position - 1]?.id || '', following_id:rows[position + 1]?.id || '',
        axioms:usesFor(passage.id, source.work).map(link => link.id),
        source_kind:passage.kind || 'passage',
      })),
    };
    chapterCache.set(id, result);
    return result;
  }

  function stack(workId, state = {}) {
    const {unitId = '', rawUnitId = ''} = state;
    const work = requiredWork(workId);
    const selectedId = unitId || rawUnitId;
    if (selectedId && !inScope(index.nodes.get(selectedId), work)) throw new Error('The selected reading does not belong to this book.');
    const selected = selectionFor(work, selectedId);
    const result = {
      work:{id:work.id, title:work.title, author:work.author, cover_url:work.cover_url},
      edition_label:work.edition,
      chapters:work.sources.map(source => ({id:source.id, raw_unit_id:source.id, care_unit_id:source.chapter_id,
        chapter_number:source.order, sequence_number:source.order, title:source.title, readable:true})),
      active_chapter:chapter(selected.SOURCE.id),
      care_path:BASE_LAYERS.flatMap(layer => selected[layer] ? [unit(selected[layer].id,state)] : []),
      sheet_options:Object.fromEntries(BASE_LAYERS.map(layer => [layer, work.units.filter(row => row.layer === layer).map(row => ({
        id:row.id, type:layer, title:row.title, available:true, sequence_number:row.order,
        chapter_number:layer === 'CH' ? row.order : undefined, mc_level:mcLevel(row),
      }))])),
      active_raw_unit_id:selected.SOURCE.id,
      active_unit_id:unitId || selected.CH?.id || '',
    };
    return result;
  }

  function card(id, {connection = false, state = {}} = {}) {
    const node = nodeFor(id), isPassage = node.kind === 'passage';
    const isSheet = ['unit','source'].includes(node.kind);
    const native = !isPassage && !isSheet ? unit(node.unit.id,state).sections.flatMap(section => section.items).find(item => item.id === id) : null;
    const display = native?.text ?? node.text ?? '', language = describePaneLanguages(index.units.get(node.unit.id),node.work,state);
    const displayUnit = node.unit.layer === 'SOURCE' ? node.unit : unit(node.unit.id,state);
    return {
      ...(native || {}), id:node.id, kind:isPassage ? 'passage' : isSheet ? 'sheet' : 'axiom', resolved:true,
      text:display, reading_text:display, reading_html:inline(display), reading_block_html:block(display),
      reading_language_code:language.language_code,reading_language_name:language.language_name,is_translation:language.is_translation,translation_id:language.selected_id,
      title:isPassage ? node.unit.title : native?.section_name || node.section || node.title || node.id,
      layer:isPassage ? 'SOURCE' : node.unit.layer,
      unit_id:node.unit.id, local_id:node.id.split(':').slice(1).join(':'),
      sheet_title:displayUnit.title, chapter_title:displayUnit.title,
      work_id:node.work?.id || '', work_title:node.work?.title || lateral.title, author:node.work?.author || '',
      metadata:[node.work?.title || lateral.title, node.work?.author, node.unit.revision,language.is_translation?`${language.language_name} · saved machine translation`:''].filter(Boolean).join(' · '),
      mc_level:mcLevel(node.unit),
      ...(connection ? {source_pane:paneId(node.unit)} : {}),
    };
  }

  function reference(id, mode = 'incoming', options = {}) {
    const selected = nodeFor(id);
    if (!['claim','passage'].includes(selected.kind)) throw new Error('Select a passage or an individual CARE item to open its route.');
    const work = options.connection ? null : options.workId ? requiredWork(options.workId) : selected.work;
    if (!inScope(selected, work)) throw new Error('This route is outside the selected book.');
    const outgoing = usesFor(id, work);
    const direction = selected.kind === 'passage' ? 'outgoing' : ['incoming','outgoing','both'].includes(mode) ? mode : 'incoming';
    const cards = new Map([[id, card(id, options)]]), edges = new Map();
    function visit(start, backwards) {
      const pending = [start], visited = new Set();
      while (pending.length) {
        const current = pending.shift();
        if (visited.has(current)) continue;
        visited.add(current);
        const links = backwards ? linksFor(nodeFor(current), work) : usesFor(current, work);
        for (const link of links) {
          const sourceId = backwards ? link.id : current, targetId = backwards ? current : link.id;
          for (const nodeId of [sourceId,targetId]) if (!cards.has(nodeId)) cards.set(nodeId, card(nodeId, options));
          const source = cards.get(sourceId), target = cards.get(targetId);
          edges.set(`${sourceId}\0${targetId}`, {source_id:sourceId,target_id:targetId,source_layer:source.layer,target_layer:target.layer,
            relation:link.type, ...(options.connection ? {source_pane:source.source_pane,target_pane:target.source_pane} : {})});
          if (!visited.has(link.id)) pending.push(link.id);
        }
      }
    }
    if (direction !== 'outgoing') visit(id, true);
    if (direction !== 'incoming') visit(id, false);
    const routeLayers = {SOURCE:[],CH:[],CL:[],MC:[],WB:[],XR:[],TRACE:[]};
    for (const [nodeId, row] of cards) {
      row.feeds_ids = [...edges.values()].filter(edge => edge.source_id === nodeId).map(edge => edge.target_id);
      row.feeds_id = row.feeds_ids[0] || '';
      if (nodeId !== id) (routeLayers[row.layer] ||= []).push(row);
    }
    const direct = linksFor(selected, work).map(link => card(link.id, options));
    const uses = outgoing.map(link => card(link.id, options));
    const root = cards.get(id);
    return {
      ...root, layer:selected.kind === 'passage' ? 'PASSAGE' : root.layer,
      references:direct.map(row => row.id), children:uses.map(row => row.id),
      built_from:direct, used_by_same_sheet:uses.filter(row => row.unit_id === selected.unit.id),
      used_by_elsewhere:uses.filter(row => row.unit_id !== selected.unit.id),
      linked_axioms:selected.kind === 'passage' ? uses : [],
      source_passages:routeLayers.SOURCE, passages:routeLayers.SOURCE,
      route_layers:routeLayers, route_edges:[...edges.values()], route_mode:direction,
      has_outgoing:outgoing.length > 0,
      available_route_modes:selected.kind === 'passage' ? ['outgoing'] : outgoing.length ? ['incoming','both','outgoing'] : ['incoming'],
    };
  }

  function outline(workId, request = {}, state = {}) {
    const work = workFor(workId), id = text(request.id), layer = text(request.layer), base = layer.split(':')[0];
    const result = {id, layer, request_id:text(request.request_id), work_id:work?.id || text(workId)};
    const original = index.units.get(id);
    if (!work || original?.work?.id !== work.id || !['SOURCE',...BASE_LAYERS].includes(base) || original.layer !== base)
      return {...result,error:'This strip is not available in this public edition.'};
    if (layer.includes(':') && (base !== 'MC' || layer.split(':')[1] !== text(mcLevel(original) || 'legacy')))
      return {...result,error:'This CARE sheet belongs to a different layer.'};
    return {...result, ...(base === 'SOURCE' ? {chapter:chapter(id)} : {unit:unit(id,state)})};
  }

  function connectionPane(original, state = {}) {
    const isSource = original.layer === 'SOURCE';
    const reading = isSource ? {sections:[{number:'',name:'Saved source passages',items:chapter(original.id).passages.map(row => ({...row,layer:'SOURCE',kind:'passage'}))}]} : unit(original.id,state);
    return {
      id:paneId(original), unit_id:original.id, layer:original.layer,
      role:original.id === lateral.id ? 'reading' : 'origin',
      title:original.title, work_title:original.work?.title || original.title,
      author:original.work?.author || '', work_id:original.work?.id || '',
      version:original.revision || '', sections:reading.sections,
      items:reading.sections.flatMap(section => section.items),
      macro_level:mcLevel(original), provenance_verified:true,
      source_work_titles:original.id === lateral.id ? lateralWorks.map(work => work.title) : [],
    };
  }

  const members = lateralWorks.map(work => ({id:work.id,work_id:work.id,title:work.title,author:work.author,
    source_unit_ids:work.units.map(row => row.id),cloth:work.slug === 'kant' ? '#303b4c' : '#3b4531',cover_url:work.cover_url,foil:'#d6b177'}));
  const savedConnection = {id:lateral.id,field:'lateral',title:lateral.title,description:'Saved diagnostic reading with its recorded source routes.',
    layers:['XR'],members,member_count:members.length,member_titles:members.map(member => member.title),version:lateral.revision};

  function connection(work, state) {
    if (state.connectionId !== lateral.id) return null;
    const ref = state.connectionReferenceId ? reference(state.connectionReferenceId, state.connectionRouteMode || 'incoming', {connection:true,state}) : null;
    const originUnits = ref ? unique([ref.unit_id,...Object.values(ref.route_layers).flat().map(row => row.unit_id)]) : [];
    const panes = [connectionPane(index.units.get(lateral.id),state)];
    const routePanes = originUnits.filter(id => id !== lateral.id).map(id => connectionPane(index.units.get(id),state));
    return {
      ...savedConnection,origin_work_id:work.id,hide_xa:true,
      pane_id:ref?.source_pane || paneId(lateral),reference:ref,selection:state.connectionSelection || null,
      bundle:{id:lateral.id,field:'lateral',title:lateral.title,origin_work_id:work.id,members,panes,route_panes:routePanes},
      other_stacks:lateralWorks.filter(row => row.id !== work.id).map(row => {
        const selected = state.connectionBooks?.[row.id] || {};
        return {...stack(row.id, {...state,...selected}),reference:selected.referenceId ? reference(selected.referenceId, selected.routeMode, {workId:row.id,state}) : null};
      }),
    };
  }

  function workspace(state = {}) {
    const work = requiredWork(state.workId || data.works[0].id);
    const referenceId = text(state.referenceId);
    const target = referenceId ? nodeFor(referenceId) : null;
    const selected = {...state};
    if (target) {
      if (!inScope(target, work)) throw new Error('The selected reference does not belong to this book.');
      if (target.kind === 'passage') {selected.rawUnitId = target.unit.id;selected.unitId = '';}
      else selected.unitId = target.unit.id;
    }
    const context = `${work.seal}|public-fixed-edition|${JSON.stringify([state.readingLanguages,state.paneVersions])}`;
    return {
      mode:'workspace',stack:stack(work.id,selected),
      reference:referenceId ? reference(referenceId,state.routeMode,{workId:work.id,state}) : null,
      route_mode:state.routeMode || 'incoming',route_history:state.routeHistory || {can_back:false,can_forward:false},
      selected_reference_id:referenceId,selected_axiom:state.selectedAxiom || null,
      outline_available:true,outline_context:context,outline_response:state.outlineResponse || {},
      outline_units:array(state.outlineUnits).filter(row => row.work_id === work.id).map(row=>outline(work.id,row,state)),
      build_versions:[],selected_build_id:work.id,version_action_result:'',
      bookmarks:array(state.bookmarks),favourite_axiom_ids:array(state.favouriteAxiomIds),
      connection_options:lateralWorks.some(member=>member.id===work.id)?[{...savedConnection,origin_work_id:work.id}]:[],
      discovery_books:[],connection:connection(work,state),hide_xa:true,
      reviewer:'Reader',rating:0,workspace_managed:true,workspace_context:context,
    };
  }

  // Return a new state for native desk events; unsupported writes are inert.
  function reduce(state, kind, value) {
    const next = {...state};
    const currentWork = requiredWork(state.workId || data.works[0].id);
    const clearOutline = () => {next.outlineUnits=[];next.outlineResponse={};};
    if (kind === 'public_reading_language') {
      const work=workFor(value?.work_id || currentWork.id),language=text(value?.language_code);
      if(!work || !describeBookLanguages(work,state).options.some(row=>row.code===language))return state;
      if(work.id!==currentWork.id && !(state.connectionId===lateral.id && lateralWorks.some(row=>row.id===work.id)))return state;
      next.readingLanguages={...state.readingLanguages,[work.id]:language};
      next.paneVersions={...state.paneVersions};for(const row of work.units)delete next.paneVersions[row.id];
      clearOutline();
    } else if(kind === 'version_action') {
      const row=index.units.get(value?.unit_id),variantId=text(value?.variant_id);
      if(!['sheet','source'].includes(value?.kind) || !row?.work || row.work.id!==value.work_id || !describePaneLanguages(row,row.work,state).options.some(option=>option.id===variantId))return state;
      if(row.work.id!==currentWork.id && !(state.connectionId===lateral.id && lateralWorks.some(work=>work.id===row.work.id)))return state;
      next.paneVersions={...state.paneVersions,[row.id]:variantId};clearOutline();
    } else if (kind === 'open_work') {next.workId=requiredWork(value).id;next.unitId='';next.rawUnitId='';next.referenceId='';next.connectionId='';clearOutline();}
    else if (kind === 'open_field') {if (value === lateral.id) {next.connectionId=lateral.id;next.connectionReferenceId='';}}
    else if (kind === 'open_chapter' || kind === 'open_sheet') {
      const row=index.units.get(value);if(!row || row.work?.id !== currentWork.id)return state;
      next.unitId=kind === 'open_sheet' ? value : '';next.rawUnitId=kind === 'open_chapter' ? value : '';next.referenceId='';
    } else if (kind === 'open_reference') {
      const row=index.nodes.get(value);if(!row || row.work?.id !== currentWork.id)return state;
      next.referenceId=value;
    } else if (kind === 'clear_reference') next.referenceId='';
    else if (kind === 'set_route_mode') next.routeMode=typeof value === 'string' ? value : value?.mode || 'incoming';
    else if (kind === 'selected_axiom') next.selectedAxiom=value;
    else if (kind === 'open_outline_sheet') {
      next.outlineResponse=outline(currentWork.id,value,state);
      if (!next.outlineResponse.error) next.outlineUnits=[...array(state.outlineUnits).filter(row=>row.id !== next.outlineResponse.id),next.outlineResponse];
    } else if (kind === 'connection_action') {
      const action=value?.action;
      if (action === 'open' && value.id === lateral.id) {next.connectionId=lateral.id;next.connectionReferenceId='';next.referenceId='';}
      else if (action === 'close') {next.connectionId='';next.connectionReferenceId='';}
      else if (action === 'clear_reference') next.connectionReferenceId='';
      else if (action === 'select_axiom') next.connectionSelection=value;
      else if (action === 'reference' && index.nodes.has(value.reference_id)) {next.connectionReferenceId=value.reference_id;next.connectionRouteMode='incoming';next.referenceId='';}
      else if (['chapter','sheet','book_reference','clear_book_reference','set_book_route_mode'].includes(action)) {
        const work=workFor(value.work_id);if(!work || work.id === currentWork.id)return state;
        const books={...state.connectionBooks},book={...books[work.id]};
        if (action === 'clear_book_reference') book.referenceId='';
        else if(action === 'set_book_route_mode')book.routeMode=value.mode;
        else {
          const id=value.reference_id || value.id,node=index.nodes.get(id);
          if(!node || node.work?.id !== work.id)return state;
          if(action === 'book_reference'){book.referenceId=id;if(node.kind==='passage'){book.rawUnitId=node.unit.id;book.unitId='';}else book.unitId=node.unit.id;}
          else {book.referenceId='';book.unitId=action==='sheet'?id:'';book.rawUnitId=action==='chapter'?id:'';}
        }
        books[work.id]=book;next.connectionBooks=books;
      } else return state;
    } else return state;
    return next;
  }

  const paneLanguages=(id,state={})=>{const row=index.units.get(id);return row?describePaneLanguages(row,row.work,state):null;};
  const bookLanguages=(workId,state={})=>describeBookLanguages(requiredWork(workId),state);
  return {paneLanguages,bookLanguages,index,works:data.works,lateral,savedConnection,workFor,stack,unit,chapter,card,reference,outline,workspace,reduce};
}
