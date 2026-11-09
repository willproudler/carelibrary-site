import mountInstrument, {arithmetic, css, html} from './numogram-instrument.mjs?v=94ec7566f50fa1a8';

export default function mountNumogramAtlas(host) {
  host.setAttribute('data-care-numo-surface', '');
  const shadow = host.shadowRoot ?? host.attachShadow({mode: 'open'});
  shadow.innerHTML = `<style>:host{overflow:auto}${css}</style>${html}`;
  const unmount = mountInstrument({
    parentElement: shadow,
    data: {
      world: arithmetic,
      instrument_write: false,
      aq_collection_write: false,
      instrument_font_prefix: new URL('./numo-', import.meta.url).href,
    },
    setTriggerValue() {},
  });
  return () => {
    unmount?.();
    shadow.replaceChildren();
    host.removeAttribute('data-care-numo-surface');
  };
}
