/* The same saved-reference viewer used by the Mac reader, owned by this embed. */
export async function createDiscoverReferenceViewer({document:doc,fetcher,onAction}) {
  const read=async path=>{const response=await fetcher(new URL(path,import.meta.url));if(!response.ok)throw Error('The axiom viewer could not load. Please try again.');return response.text();};
  const [{default:mount},css,html]=await Promise.all([import('./native/reference-viewer.mjs?v=f6e04a1f9648f0aa'),read('./native/reference-viewer.css?v=f6e04a1f9648f0aa'),read('./native/reference-viewer.html?v=d6fb94305f051e89')]);
  const host=doc.createElement('div');host.setAttribute('data-discover-book-viewer','');
  host.innerHTML=`<style>.care-reference-component{--st-text-color:#ece8df;--st-background-color:#0e1117;--st-secondary-background-color:#171c23;--st-font:system-ui,sans-serif;--st-code-font:ui-monospace,monospace}${css}\n[data-discover-book-viewer] .crv-tool-rate,[data-discover-book-viewer] .crv-tool-quality,[data-discover-book-viewer] .crv-tool-collect,[data-discover-book-viewer] .crv-tool-sheet,[data-discover-book-viewer] .crv-tool-reveal-sheet{display:none!important}[data-discover-book-viewer] .crv-launcher{bottom:40px}[data-discover-book-viewer] .crv-panel{bottom:100px}[data-discover-book-viewer][hidden]{display:none!important}</style>${html}`;
  doc.body.append(host);let cleanup;
  return {render(data){host.hidden=false;cleanup?.();cleanup=mount({parentElement:host,data,setTriggerValue:(kind,value)=>{if(kind==='action')onAction(value);}});},hide(){cleanup?.();cleanup=null;host.hidden=true;},destroy(){cleanup?.();host.remove();}};
}
