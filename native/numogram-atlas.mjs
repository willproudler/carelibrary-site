import mountInstrument, {arithmetic, css, html, instrumentAQInput} from './numogram-instrument.mjs?v=a786a5d3f8126c86';
import reference from './numogram-reference.mjs';

const aqEndpoint = '/api/numo/aq';

export {instrumentAQInput};

export default function mountNumogramAtlas(host, {openSource, focusHeaderAQ} = {}) {
  host.setAttribute('data-care-numo-surface', '');
  const shadow = host.shadowRoot ?? host.attachShadow({mode: 'open'});
  shadow.innerHTML = `<style>:host{overflow:auto}${css}</style>${html}`;
  const {demons} = reference;
  const world = {
    ...arithmetic,
    ...reference,
    arithmetic_only: false,
    zones: arithmetic.zones.map(zone=>({
      ...zone, demon_ids: demons.filter(demon=>demon.poles.includes(zone.id)).map(demon=>demon.id),
    })),
  };

  let acceptAQ, openAQ, pending;
  async function receiveAction(_key, {kind, total, id, match_kind = 'all', sort = 'variety', offset = 0}) {
    if (kind === 'instrument_aq_source') {
      const href = world.instrument_aq_match?.record?.source_href;
      if (href && world.instrument_aq_match?.id === id && world.instrument_aq_match.total === total) {
        openSource?.(href);
      }
      acceptAQ?.();
      return;
    }
    if (kind !== 'instrument_aq' && kind !== 'instrument_aq_match') return;
    pending?.abort();
    const request = new AbortController();
    pending = request;
    const browse = kind === 'instrument_aq';
    const params = new URLSearchParams(browse ? {total, match_kind, sort, offset} : {total, id});
    let result;
    try {
      const response = await fetch(`${aqEndpoint}?${params}`, {cache:'no-store', signal:request.signal});
      if (!response.ok) throw Error('AQ data unavailable');
      result = await response.json();
    } catch {
      result = browse
        ? {status:'unavailable', request:{instrument:true, query:String(total), match_kind, sort, offset}}
        : {status:'unavailable', total, id};
    }
    if (request.signal.aborted) return;
    pending = null;
    acceptAQ?.(kind, result);
  }

  const unmount = mountInstrument({
    parentElement: shadow,
    data: {
      world,
      public_reference: true,
      instrument_write: false,
      aq_collection_write: false,
      aq_scroll_url: aqEndpoint,
      bindAQResponse: receive=>{ acceptAQ = receive; },
      bindAQOpen: open=>{ openAQ = open; },
      focusHeaderAQ,
      instrument_font_prefix: new URL('./numo-', import.meta.url).href,
    },
    setTriggerValue: receiveAction,
  });
  return {
    openAQ: target=>openAQ?.(target),
    unmount() {
      acceptAQ = null;
      openAQ = null;
      pending?.abort();
      unmount?.();
      shadow.replaceChildren();
      host.removeAttribute('data-care-numo-surface');
    },
  };
}
