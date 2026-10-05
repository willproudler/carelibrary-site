
const INSTANCES = new WeakMap()
const esc = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character])
const arr = value => Array.isArray(value) ? value : []
const LAYER_COLORS = {"CB": "#a96624", "WB": "#9a4327", "MC": "#594f88", "CL": "#2d6b67", "CH": "#3d668b", "NUMO": "#3d765a", "XR": "#6e4f9a", "XS": "#8b4f86", "SC": "#8f394b", "XA": "#51667e"}

function mcLevel(value){
  if(value&&typeof value==='object'){
    for(const key of ['care_unit_id','unit_id','id','care_item_id','current_unit_id']){const level=mcLevel(value[key]);if(level)return level}
    for(const key of ['mc_level','unit_layer']){const raw=value[key];if((typeof raw==='number'||typeof raw==='string')&&/^[1-9][0-9]*$/.test(String(raw).trim()))return Number(raw)}
    return null
  }
  if(typeof value==='number')return Number.isSafeInteger(value)&&value>0?value:null
  const identity=String(value||'').trim().split(':',1)[0];if(!/^MC_/i.test(identity))return null
  const levels=[...identity.matchAll(/_L([1-9][0-9]*)(?=_)/gi)];return levels.length?Number(levels[levels.length-1][1]):null
}
function mcLevelLabel(value){const level=mcLevel(value);return level?`MC L${level}`:'MC'}
function mcLevelColor(value){
  const level=mcLevel(value);if(!level)return '#594f88';
  const h=265/360,s=.28,l=(30+22*(1-Math.exp(-(level-1)/2.7)))/100;
  const m2=l<=.5?l*(1+s):l+s-l*s,m1=2*l-m2;
  const channel=offset=>{let hue=(h+offset+1)%1;const value=hue<1/6?m1+(m2-m1)*hue*6:hue<.5?m2:hue<2/3?m1+(m2-m1)*(2/3-hue)*6:m1;return Math.round(value*255).toString(16).padStart(2,'0')};
  return '#'+channel(1/3)+channel(0)+channel(-1/3)
}

const layerColor = (layer,identity=null) => String(layer||"").toUpperCase()==="MC"?mcLevelColor(identity):({...LAYER_COLORS,SOURCE:"#8a431d",PASSAGE:"#8a431d",TRACE:"#3d3d3d"})[String(layer||"").toUpperCase()] || "#333"
const readerLayerLabel = (layer,identity=null) => String(layer||"").toUpperCase()==="MC"?mcLevelLabel(identity):String(layer||"")
const textClip = (value, limit=250) => { const text=String(value??""); return text.length>limit ? `${text.slice(0,limit).trim()}…` : text }
const TEXT_SCALES = [.86,1,1.16,1.32]
const TEXT_SCALE_KEY = "care-study-desk-text-scale-v1"
const SKIN_KEY = "care-study-desk-skin-v2"
const LEGACY_SKIN_KEY = "care-study-desk-skin-v1"

const readerLayoutScale=(element,bounds)=>((bounds||element?.getBoundingClientRect?.())?.width/Number(element?.offsetWidth))||1
function trackZoomControls(){
  return `<div class="desk-track-zoom" role="group" aria-label="Book track zoom"><button type="button" class="desk-tab" data-track-zoom="fit" aria-pressed="false" title="Fit the whole Source to WB track inside this viewer">Fit track</button><button type="button" class="desk-tab" data-track-zoom="out" aria-label="Zoom out book track">−</button><button type="button" class="desk-tab" data-track-zoom="read" aria-label="Return to reading size" title="Return to reading size" data-track-zoom-label>100%</button><button type="button" class="desk-tab" data-track-zoom="in" aria-label="Zoom in book track" disabled>+</button></div>`
}
function trackFitScale(width,padding,gap,widths){
  const total=widths.reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0)
  if(!total||width<=padding)return 1
  // Leave a pixel for fractional layout rounding; gaps stay at viewer scale.
  return Math.min(1,Math.max(.001,(width-padding-Math.max(0,widths.length-1)*gap-1)/total))
}
function setupTrackZoom(runtime){
  const root=runtime.root,view=root.ownerDocument.defaultView
  runtime.trackZoomStates=new Map()
  runtime.trackZoomState=()=>{
    const key=String(runtime.data?.stack?.work?.id||"")+"|"+String(runtime.data?.connection?.id||"")+(isRouteReference(runtime.data?.reference)||runtime.data?.connection?.reference?"|route":"")+(runtime.readerView==="outline"?"|outline":"")
    if(!runtime.trackZoomStates.has(key))runtime.trackZoomStates.set(key,{mode:"read",scale:1})
    return runtime.trackZoomStates.get(key)
  }
  runtime.applyTrackZoom=()=>{
    const strip=root.querySelector("[data-strip]")
    if(!strip?.clientWidth)return
    const panes=[...strip.querySelectorAll(":scope > .desk-window")].filter(pane=>!pane.hidden)
    if(!panes.length)return
    const state=runtime.trackZoomState(),style=view.getComputedStyle(strip),current=Number(strip.dataset.trackScale)||1
    // A corpus can zoom the whole book above this local zoom level. Rectangles
    // include that ancestor scale; layout widths and padding do not.
    const ancestorScale=readerLayoutScale(strip)
    const widths=panes.map(pane=>pane.getBoundingClientRect().width/current/ancestorScale)
    const fit=trackFitScale(strip.clientWidth,(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0),parseFloat(style.columnGap)||0,widths)
    const scale=state.mode==="fit"?fit:state.mode==="read"?1:Math.max(fit,Math.min(1,state.scale))
    if(current===1&&scale<1&&!state.readingPositions)state.readingPositions=new Map(panes.map(pane=>[pane.dataset.pane,pane.querySelector(".window-body")?.scrollTop||0]))
    state.scale=scale;runtime.trackFit=fit
    strip.style.setProperty("--desk-track-scale",String(scale))
    strip.dataset.trackScale=String(scale)
    if(scale<1)strip.setAttribute("data-track-scaled","");else strip.removeAttribute("data-track-scaled")
    if(current<1&&scale===1&&state.readingPositions){panes.forEach(pane=>{const body=pane.querySelector(".window-body"),top=state.readingPositions.get(pane.dataset.pane);if(body&&top!==undefined)body.scrollTop=top});state.readingPositions=null}
    if(state.mode==="fit")strip.scrollLeft=0
    root.querySelectorAll("[data-track-zoom]").forEach(button=>{
      const action=button.dataset.trackZoom
      if(action==="fit"){button.classList.toggle("active",state.mode==="fit");button.setAttribute("aria-pressed",String(state.mode==="fit"))}
      if(action==="read"){button.textContent=`${Math.round(scale*100)}%`;button.setAttribute("aria-label",`Track at ${Math.round(scale*100)} percent. Return to reading size`)}
      if(action==="out")button.disabled=scale<=fit+.001
      if(action==="in")button.disabled=scale>=.999
    })
  }
  runtime.setTrackZoom=action=>{
    const state=runtime.trackZoomState()
    if(action==="fit")state.mode="fit"
    else if(action==="read"){state.mode="read";state.scale=1}
    else{
      const next=state.scale+(action==="in"?.1:-.1)
      state.mode=next>=.999?"read":next<=(runtime.trackFit||.01)+.001?"fit":"manual"
      state.scale=Math.min(1,Math.max(runtime.trackFit||.01,next))
    }
    runtime.applyTrackZoom();runtime.queueThreads()
  }
  runtime.queueTrackZoom=()=>{
    if(runtime.trackZoomFrame||!view?.requestAnimationFrame)return
    runtime.trackZoomFrame=view.requestAnimationFrame(()=>{runtime.trackZoomFrame=null;runtime.applyTrackZoom();runtime.queueThreads()})
  }
  const click=runtime.onClick
  runtime.onClick=event=>{
    const control=event.target?.closest?.("[data-track-zoom]"),action=control?.dataset?.trackZoom
    if(["fit","read","in","out"].includes(action)){
      event.preventDefault();if(control.disabled)return
      runtime.setTrackZoom(action)
      if(action==="read")runtime.focus(runtime.focused)
      return
    }
    const heading=event.target?.closest?.(".window-titlebar"),pane=heading?.closest("[data-pane]")
    if(pane&&runtime.trackZoomState().scale<.999&&!event.target.closest("button,input,select,a")){
      runtime.setTrackZoom("read");runtime.focus(pane.dataset.pane);return
    }
    if(event.target?.closest?.("[data-pane-target]")&&runtime.trackZoomState().scale<.999)runtime.setTrackZoom("read")
    return click(event)
  }
  const focus=runtime.focus
  runtime.focus=id=>{if(runtime.trackZoomState().scale<.999)runtime.setTrackZoom("read");return focus(id)}
  const skin=runtime.applySkin
  runtime.applySkin=()=>{skin();runtime.queueTrackZoom()}
  runtime.watchTrackZoom=()=>{
    runtime.applyTrackZoom()
    const strip=root.querySelector("[data-strip]")
    const resize=view?.ResizeObserver?new view.ResizeObserver(runtime.queueTrackZoom):null
    if(strip){resize?.observe(strip);strip.querySelectorAll(":scope > .desk-window").forEach(pane=>resize?.observe(pane))}
    const mutations=view?.MutationObserver?new view.MutationObserver(runtime.queueTrackZoom):null
    // The discovery shelf can be revealed without a Python rerun.
    if(strip)mutations?.observe(strip,{subtree:true,attributes:true,attributeFilter:["hidden"]})
    return()=>{resize?.disconnect();mutations?.disconnect();if(runtime.trackZoomFrame&&view){view.cancelAnimationFrame(runtime.trackZoomFrame);runtime.trackZoomFrame=null}}
  }
}
function paneTab(id,label){return `<button type="button" class="desk-tab" data-pane-target="${esc(id)}">${esc(label)}</button>`}
const buildVersionName=option=>option?.version_number?`Version ${option.version_number}`:String(option?.version_label||option?.label||"Version").split(" · ")[0]
function buildVersionControl(data){
  const options=arr(data?.build_versions),selected=String(data?.selected_build_id||data?.stack?.work?.id||"")
  if(!options.length)return ""
  const current=options.find(option=>String(option.work_id||option.id)===selected)
  return `<button type="button" class="desk-tab desk-build-version" data-build-version-menu aria-label="Book versions · ${esc(buildVersionName(current))}" title="Choose book version" aria-haspopup="menu" aria-expanded="false"><span>${esc(buildVersionName(current))}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button>`
}
function buildVersionMenu(data){
  const options=[...arr(data?.build_versions)].sort((a,b)=>Number(b.version_number||0)-Number(a.version_number||0)),selected=String(data?.selected_build_id||data?.stack?.work?.id||"")
  const latest=options.find(option=>option.available!==false&&!option.archived)
  const date=option=>{const value=option.added_at||option.run_at;if(!value)return "";const parsed=new Date(value);return Number.isNaN(parsed.getTime())?"":new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(parsed)}
  return `<strong class="build-version-menu-head">Book versions</strong><div class="build-version-options" role="menu" aria-label="Book versions">${options.map(option=>{
    const id=String(option.work_id||option.id||""),chosen=id===selected,detail=[option.available===false?"Not ready to read":option.archived?"Archived":option===latest?"Latest version":"Earlier version",date(option)].filter(Boolean).join(" · ")
    return `<button type="button" class="build-version-option" role="menuitemradio" data-build-version-choice="${esc(id)}" aria-checked="${chosen}"${option.available===false?" disabled":""}><span class="build-version-copy"><strong>${esc(buildVersionName(option))}</strong><small>${esc(detail)}</small></span><span class="build-version-check" aria-hidden="true">${chosen?"✓":""}</span></button>`
  }).join("")}</div>`
}
function setupBuildVersionMenu(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeBuildVersionMenu=({restoreFocus=false}={})=>{const popup=runtime.buildVersionMenu;if(!popup)return;runtime.buildVersionMenu=null;popup.anchor.setAttribute("aria-expanded","false");popup.element.remove();if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})}
  runtime.positionBuildVersionMenu=()=>{
    const popup=runtime.buildVersionMenu;if(!popup)return
    const bounds=root.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect(),width=Math.min(304,bounds.width-16),top=Math.max(8,Math.min(bounds.height-120,anchor.bottom-bounds.top+8))
    Object.assign(popup.element.style,{width:width+"px",left:Math.max(8,Math.min(bounds.width-width-8,anchor.right-bounds.left-width))+"px",top:top+"px",maxHeight:Math.max(80,bounds.height-top-8)+"px"})
  }
  runtime.openBuildVersionMenu=anchor=>{
    const same=runtime.buildVersionMenu?.anchor===anchor
    runtime.closeBuildVersionMenu();if(same)return
    runtime.closeConnectionDiscovery?.();runtime.closeSheetVersionMenu?.()
    const element=doc.createElement("section");element.className="build-version-menu";element.innerHTML=buildVersionMenu(runtime.data)
    root.append(element);runtime.buildVersionMenu={anchor,element};anchor.setAttribute("aria-expanded","true");runtime.positionBuildVersionMenu()
    ;(element.querySelector('[aria-checked="true"]:not(:disabled)')||element.querySelector("[data-build-version-choice]:not(:disabled)"))?.focus({preventScroll:true})
  }
  runtime.onBuildVersionClick=event=>{
    const trigger=event.target?.closest?.("[data-build-version-menu]")
    if(trigger){event.preventDefault();runtime.openBuildVersionMenu(trigger);return}
    const choice=event.target?.closest?.("[data-build-version-choice]")
    if(!choice||choice.disabled||!runtime.buildVersionMenu?.element.contains(choice))return
    event.preventDefault();runtime.chooseBuildVersion(choice.dataset.buildVersionChoice);runtime.closeBuildVersionMenu({restoreFocus:true})
  }
  const onKey=runtime.onKey
  runtime.onKey=event=>{
    const popup=runtime.buildVersionMenu,trigger=event.target?.closest?.("[data-build-version-menu]")
    if(!popup&&trigger&&["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();runtime.openBuildVersionMenu(trigger);return}
    if(!popup)return onKey(event)
    event.stopPropagation?.()
    if(event.key==="Escape"){event.preventDefault();runtime.closeBuildVersionMenu({restoreFocus:true});return}
    if(event.key==="Tab"){runtime.closeBuildVersionMenu({restoreFocus:true});return}
    const choices=[...popup.element.querySelectorAll("[data-build-version-choice]:not(:disabled)")],index=choices.indexOf(event.target)
    if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){
      event.preventDefault();const next=event.key==="Home"?0:event.key==="End"?choices.length-1:(index+(event.key==="ArrowDown"?1:-1)+choices.length)%choices.length
      choices[next]?.focus({preventScroll:true});choices[next]?.scrollIntoView?.({block:"nearest"});return
    }
    // Native buttons handle Enter and Space; reader shortcuts stay in the reader.
  }
  const outside=event=>{const popup=runtime.buildVersionMenu,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeBuildVersionMenu()}
  runtime.attachBuildVersionMenu=()=>{root.addEventListener("click",runtime.onBuildVersionClick);doc.addEventListener("pointerdown",outside,true);view?.addEventListener("resize",runtime.positionBuildVersionMenu);root.addEventListener("scroll",runtime.positionBuildVersionMenu,true)}
  runtime.cleanupBuildVersionMenu=()=>{runtime.closeBuildVersionMenu();root.removeEventListener("click",runtime.onBuildVersionClick);doc.removeEventListener("pointerdown",outside,true);view?.removeEventListener("resize",runtime.positionBuildVersionMenu);root.removeEventListener("scroll",runtime.positionBuildVersionMenu,true)}
}

const bookmarkIcon=()=>'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.25h10v14l-5-3.5-5 3.5z"/></svg>'
const bookmarkLayers=new Set(["CH","CL","MC","WB"])
function bookBookmarks(data){
  const work=String(data?.stack?.work?.id||""),seen=new Set()
  return arr(data?.bookmarks).filter(row=>{const id=String(row.care_unit_id||"");if(!id||seen.has(id)||(row.work_id&&String(row.work_id)!==work))return false;seen.add(id);return true}).sort((a,b)=>String(b.saved_at||"").localeCompare(String(a.saved_at||"")))
}
function bookmarkablePane(data,focused){
  if(isRouteReference(data?.reference)||data?.connection?.reference)return null
  return arr(data?.stack?.care_path).find(unit=>String(unit.id)===String(focused)&&bookmarkLayers.has(String(unit.type).toUpperCase()))||null
}
function paneBookmarkButton(unit,bookmarks=[]){
  if(!bookmarkLayers.has(String(unit.type).toUpperCase()))return ""
  const active=arr(bookmarks).some(row=>String(row.care_unit_id)===String(unit.id)),title=unit.identity?.title||unit.title||unit.id,label=`${active?"Remove bookmark for":"Bookmark"} ${readerLayerLabel(unit.type,unit)} · ${title}`
  return `<button type="button" class="pane-bookmark" data-bookmark-toggle="${esc(unit.id)}" aria-pressed="${active}" aria-label="${esc(label)}" title="${esc(label)}">${bookmarkIcon()}</button>`
}
function bookmarkControl(data){
  if(!data?.stack?.work?.id)return ""
  const count=bookBookmarks(data).length
  return `<button type="button" class="desk-tab desk-bookmark-control" data-bookmark-menu aria-label="Bookmarks in this book${count?` · ${count}`:""}" title="Bookmarks in this book" aria-haspopup="dialog" aria-expanded="false">${bookmarkIcon()}${count?`<small aria-hidden="true">${count}</small>`:""}</button>`
}
function bookmarkMenu(data,focused){
  const bookmarks=bookBookmarks(data),unit=bookmarkablePane(data,focused),active=unit&&bookmarks.some(row=>String(row.care_unit_id)===String(unit.id))
  const current=unit?`<button type="button" class="pane-bookmark-current" data-bookmark-toggle="${esc(unit.id)}" aria-pressed="${Boolean(active)}">${bookmarkIcon()}<span><strong>${active?"Remove this bookmark":"Bookmark this pane"}</strong><small>${esc(readerLayerLabel(unit.type,unit))} · ${esc(unit.identity?.title||unit.title||unit.id)}</small></span></button>`:""
  const savedDate=value=>{const date=new Date(value);return value&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short"}).format(date):""}
  const rows=bookmarks.map(row=>`<button type="button" class="pane-bookmark-row" data-bookmark-open="${esc(row.care_unit_id)}"${row.available===false?` disabled aria-label="${esc(row.title||row.care_unit_id)} · Currently unavailable"`:""}><span class="pane-bookmark-layer" style="--bookmark-accent:${layerColor(row.layer,row)}">${esc(readerLayerLabel(row.layer,row)||"CARE")}</span><span class="pane-bookmark-copy"><strong>${esc(row.title||row.care_unit_id)}</strong><small>${esc(row.available===false?"Currently unavailable":[row.layer?`${readerLayerLabel(row.layer,row)} pane`:"Saved pane",savedDate(row.saved_at)].filter(Boolean).join(" · "))}</small></span></button>`).join("")
  return `<div class="pane-bookmark-heading"><div><strong>Bookmarks in this book</strong><small>${esc(data?.stack?.work?.title||"Your reading")}</small></div><button type="button" data-bookmark-close aria-label="Close bookmarks">×</button></div>${current}${rows?`<div class="pane-bookmark-list" role="group" aria-label="Saved panes">${rows}</div>`:`<div class="pane-bookmark-empty">${bookmarkIcon()}<strong>Keep a place worth returning to</strong><p>Bookmark a CH, CL, MC or WB pane to find it here.</p></div>`}${unit?"":'<p class="pane-bookmark-footnote">Choose a CARE pane to bookmark it.</p>'}`
}

const etchedRouteIcon=()=>'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v4c0 3 8 1 8 5v3M6 8v8"/><circle cx="6" cy="3" r="1.4"/><circle cx="6" cy="17" r="1.4"/><circle cx="14" cy="17" r="1.4"/></svg><span class="reader-action-tip" aria-hidden="true">Routes</span>'
function bookmarkableAxioms(data){
  const targets=new Map(),work=String(data?.stack?.work?.id||"")
  if(!work)return targets
  const add=(item,unitId,layer)=>{
    const id=String(item?.id||"")
    if(id&&unitId&&item?.resolved!==false&&(!item.kind||item.kind==="axiom")&&bookmarkLayers.has(String(layer||item.layer).toUpperCase())&&(!item.work_id||String(item.work_id)===work))targets.set(id,{care_item_id:id,unit_id:String(unitId),work_id:work})
  }
  for(const unit of [...arr(data?.stack?.care_path),...arr(data?.outline_units).map(row=>row.unit).filter(Boolean)])for(const item of [...arr(unit.items),...arr(unit.sections).flatMap(section=>arr(section.items))])add(item,unit.id,unit.type)
  const reference=data?.reference
  if(reference){add(reference,reference.unit_id,reference.layer);for(const rows of Object.values(reference.route_layers||{}))for(const item of arr(rows))add(item,item.unit_id,item.layer)}
  return targets
}
function decorateReadingActions(runtime){
  const root=runtime.root,targets=bookmarkableAxioms(runtime.data),favourites=new Set(arr(runtime.data?.favourite_axiom_ids).map(String))
  root.querySelectorAll("[data-open-axiom-routes],[data-open-passage-routes]").forEach(button=>{
    if(!button.classList.contains("reader-route-action")){button.classList.add("reader-route-action");button.innerHTML=etchedRouteIcon()}
  })
  root.querySelectorAll("[data-select-axiom]").forEach(axiom=>{
    if(axiom.closest("[data-connection-book],[data-connection-field]"))return
    const id=String(axiom.dataset.selectAxiom||""),target=targets.get(id),row=axiom.closest(".axiom-row")
    if(!row||!target)return
    const active=favourites.has(id),label=`${active?"Remove saved axiom":"Save axiom"} · ${id}`
    let button=row.querySelector("[data-favourite-axiom]")
    if(!button){button=root.ownerDocument.createElement("button");button.type="button";button.classList.add("reader-axiom-mark");button.setAttribute("data-favourite-axiom",id);button.innerHTML=bookmarkIcon();row.append(button)}
    button.setAttribute("aria-pressed",String(active));button.setAttribute("aria-label",label);button.title=label
    row.classList.add("reader-has-mark");row.classList.toggle("reader-axiom-saved",active)
  })
}
function setupAxiomFavourites(runtime){
  runtime.toggleAxiomFavourite=id=>{
    const care_item_id=String(id||""),target=bookmarkableAxioms(runtime.data).get(care_item_id)
    if(!target)return
    runtime.api?.setTriggerValue("axiom_favourite_action",{care_item_id,work_id:target.work_id,active:!arr(runtime.data?.favourite_axiom_ids).map(String).includes(care_item_id),token:`${Date.now()}-${Math.random().toString(36).slice(2)}`})
  }
  const click=runtime.onClick;runtime.onClick=event=>{
    const button=event.target?.closest?.("[data-favourite-axiom]")
    if(button){event.preventDefault();event.stopPropagation?.();if(!button.disabled&&!button.closest("[data-connection-book],[data-connection-field]"))runtime.toggleAxiomFavourite(button.dataset.favouriteAxiom);return}
    return click(event)
  }
}

function applySavedPaneFocus(runtime){
  const request=runtime.data?.saved_focus,token=String(request?.token||""),unitId=String(request?.unit_id||"")
  if(!token||runtime.savedFocusToken===token||String(request?.work_id||"")!==String(runtime.data?.stack?.work?.id||"")||!bookmarkablePane(runtime.data,unitId))return false
  const pane=runtime.root.querySelector(`[data-pane="${CSS.escape(unitId)}"]`),strip=runtime.root.querySelector("[data-strip]")
  // Do not consume a request before the reader has a measurable destination.
  // Its first ResizeObserver delivery retries after the workspace lays out.
  if(!pane||!strip?.clientWidth||!pane.getBoundingClientRect().width)return false
  if(pane.classList?.contains("care-pane-minimized"))pane.querySelector('[data-pane-control="minimize"]')?.click()
  runtime.savedFocusToken=token
  runtime.focus(unitId)
  return true
}
function setupPaneBookmarks(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeBookmarkMenu=({restoreFocus=false}={})=>{runtime.bookmarkMenuRestore=null;const popup=runtime.bookmarkMenu;if(!popup)return;runtime.bookmarkMenu=null;popup.anchor.setAttribute("aria-expanded","false");popup.element.remove();if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})}
  runtime.positionBookmarkMenu=()=>{
    const popup=runtime.bookmarkMenu;if(!popup)return
    const bounds=root.getBoundingClientRect(),scale=readerLayoutScale(root,bounds),anchor=popup.anchor.getBoundingClientRect(),rootWidth=bounds.width/scale,rootHeight=bounds.height/scale,width=Math.max(0,Math.min(360,rootWidth-16)),top=Math.max(8,Math.min(rootHeight-160,(anchor.bottom-bounds.top)/scale+8))
    Object.assign(popup.element.style,{width:width+"px",left:Math.max(8,Math.min(rootWidth-width-8,(anchor.right-bounds.left)/scale-width))+"px",top:top+"px",maxHeight:Math.max(80,rootHeight-top-8)+"px"})
  }
  runtime.openBookmarkMenu=(anchor,{restore=false}={})=>{
    if(!anchor||!runtime.data?.stack?.work?.id)return
    const same=runtime.bookmarkMenu?.anchor===anchor;runtime.closeBookmarkMenu();if(same&&!restore)return
    runtime.closeBuildVersionMenu?.();runtime.closeSheetVersionMenu?.();runtime.closeConnectionDiscovery?.()
    const element=doc.createElement("section");element.className="build-version-menu pane-bookmark-menu";element.setAttribute("role","dialog");element.setAttribute("aria-label","Bookmarks in this book");element.innerHTML=bookmarkMenu(runtime.data,runtime.focused)
    root.append(element);runtime.bookmarkMenu={anchor,element,workId:String(runtime.data.stack.work.id)};anchor.setAttribute("aria-expanded","true");runtime.positionBookmarkMenu()
    if(!restore)(element.querySelector('[data-bookmark-toggle],[data-bookmark-open]:not(:disabled)')||element.querySelector("[data-bookmark-close]"))?.focus({preventScroll:true})
  }
  runtime.emitBookmarkAction=(action,id)=>{
    const care_unit_id=String(id||""),work_id=String(runtime.data?.stack?.work?.id||""),saved=bookBookmarks(runtime.data),row=saved.find(row=>String(row.care_unit_id)===care_unit_id)
    if(!care_unit_id||!work_id)return
    if(action==="toggle"&&!bookmarkablePane(runtime.data,care_unit_id))return
    if(action==="open"&&(!row||row.available===false))return
    if(!["toggle","open"].includes(action))return
    if(action==="open")runtime.closeBookmarkMenu()
    runtime.api?.setTriggerValue("bookmark_action",{action,care_unit_id,work_id,...(action==="toggle"?{active:!row}:{}),token:`${Date.now()}-${Math.random().toString(36).slice(2)}`})
  }
  const click=runtime.onClick;runtime.onClick=event=>{
    const anchor=event.target?.closest?.("[data-bookmark-menu]")
    if(anchor){event.preventDefault();runtime.openBookmarkMenu(anchor);return}
    const toggle=event.target?.closest?.("[data-bookmark-toggle]")
    if(toggle){event.preventDefault();event.stopPropagation?.();runtime.emitBookmarkAction("toggle",toggle.dataset.bookmarkToggle);return}
    const open=event.target?.closest?.("[data-bookmark-open]")
    if(open){event.preventDefault();if(!open.disabled)runtime.emitBookmarkAction("open",open.dataset.bookmarkOpen);return}
    if(event.target?.closest?.("[data-bookmark-close]")){event.preventDefault();runtime.closeBookmarkMenu({restoreFocus:true});return}
    return click(event)
  }
  const key=runtime.onKey;runtime.onKey=event=>{
    const anchor=event.target?.closest?.("[data-bookmark-menu]"),popup=runtime.bookmarkMenu
    if(!popup&&anchor&&["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();runtime.openBookmarkMenu(anchor);return}
    if(!popup||(!popup.element.contains(event.target)&&!anchor))return key(event)
    event.stopPropagation?.()
    if(event.key==="Escape"){event.preventDefault();runtime.closeBookmarkMenu({restoreFocus:true});return}
    if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){
      event.preventDefault();const choices=[...popup.element.querySelectorAll("button:not(:disabled)")],index=choices.indexOf(event.target),next=event.key==="Home"?0:event.key==="End"?choices.length-1:(index+(event.key==="ArrowDown"?1:-1)+choices.length)%choices.length
      choices[next]?.focus({preventScroll:true});choices[next]?.scrollIntoView?.({block:"nearest"})
    }
    // Native buttons handle Enter/Space; Tab leaves this nonmodal popup normally.
  }
  const outside=event=>{const popup=runtime.bookmarkMenu,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeBookmarkMenu()}
  const wheel=runtime.onWheel;runtime.onWheel=event=>{if(event.target?.closest?.(".pane-bookmark-menu"))return;return wheel?.(event)}
  runtime.attachPaneBookmarks=()=>{doc.addEventListener("pointerdown",outside,true);doc.addEventListener("focusin",outside,true);view?.addEventListener("resize",runtime.positionBookmarkMenu);root.addEventListener("scroll",runtime.positionBookmarkMenu,true)}
  runtime.cleanupPaneBookmarks=()=>{const saved=runtime.bookmarkMenu?.workId;runtime.closeBookmarkMenu();runtime.bookmarkMenuRestore=saved||null;doc.removeEventListener("pointerdown",outside,true);doc.removeEventListener("focusin",outside,true);view?.removeEventListener("resize",runtime.positionBookmarkMenu);root.removeEventListener("scroll",runtime.positionBookmarkMenu,true)}
}

function activeTranslationSheet(data,focused){
  if(isRouteReference(data?.reference))return null
  const chapter=data?.stack?.active_chapter
  if(focused==="source"&&chapter?.source_versions&&arr(chapter.source_versions.options).length)return sourceTranslationSheet(chapter)
  const unit=arr(data?.stack?.care_path).find(row=>String(row.id)===String(focused))
  if(!unit||!["CH","CL","MC","WB"].includes(String(unit.type).toUpperCase()))return null
  const versions=unit.sheet_versions
  return versions&&arr(versions.options).length?unit:null
}
function sourceTranslationSheet(chapter){return {id:chapter.raw_unit_id,type:"SOURCE",title:chapter.title,sheet_versions:chapter.source_versions}}
function sheetVersionTrigger(unit,{pane=false}={}){
  if(!unit?.sheet_versions||!arr(unit.sheet_versions.options).length)return ""
  const versions=unit.sheet_versions,current=arr(versions.options).find(option=>String(option.id)===String(versions.selected_id))
  const languages=new Set(arr(versions.options).filter(option=>option.available!==false).map(option=>String(option.language_code||"").toLowerCase()).filter(Boolean))
  if(pane&&languages.size<2)return ""
  const label='Language & translation · '+(unit.identity?.title||unit.title||unit.id),code=String(current?.language_code||"").toUpperCase()
  const content=pane?`${esc(code)}<span aria-hidden="true">⌄</span>`:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h12M9 3v2M5 5c1 6 5 9 9 11M13 5c-1 6-5 9-10 12M14 21l4-10 4 10M15.5 17h5"/></svg>'
  return `<button type="button" class="${pane?'pane-language':'desk-tab desk-sheet-version'}" data-sheet-version-menu="${esc(unit.id)}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(label)}" title="${esc(label)}">${content}</button>`
}
function sheetVersionControl(unit,stack){
  const versions=unit.sheet_versions
  if(!versions||!arr(versions.options).length)return ""
  const selected=String(versions.selected_id||""),languages=arr(versions.language_options),disabled=versions.translating||versions.can_translate===false||!languages.length
  return `<div class="sheet-versions" data-sheet-versions="${esc(unit.id)}" data-version-work="${esc(stack?.work?.id||"")}"><div class="sheet-version-heading"><div><strong>Language &amp; translation</strong><small>${esc(unit.type+' · '+(unit.identity?.title||unit.title||unit.id))}</small></div><button type="button" data-sheet-version-close aria-label="Close translations">×</button></div><div class="sheet-version-fields"><label>Read in<select data-sheet-version aria-label="Saved language for ${esc(unit.identity?.title||unit.title||unit.id)}">${arr(versions.options).map(option=>`<option value="${esc(option.id)}"${String(option.id)===selected?" selected":""}${option.available===false?" disabled":""}>${esc(option.label||option.id)}</option>`).join("")}</select></label><div class="sheet-translation-row"><label>Translate into<select data-translation-language aria-label="Translation language for ${esc(unit.identity?.title||unit.title||unit.id)}"${disabled?" disabled":""}>${languages.map(option=>`<option value="${esc(option.code)}">${esc(option.label||option.code)}</option>`).join("")}</select></label><button type="button" data-translate-sheet${disabled?" disabled":""}>${versions.translating?"Translating…":"Translate pane"}</button></div><small>${esc(versions.message||versions.status||"Creates a saved machine translation of this CARE sheet. The original and every reference remain available. Machine translation needs review.")}</small></div></div>`
}
function setupSheetVersionMenu(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeSheetVersionMenu=({restoreFocus=false}={})=>{const popup=runtime.sheetVersionPopover;if(!popup)return;runtime.sheetVersionPopover=null;popup.anchor.setAttribute("aria-expanded","false");popup.element.remove();if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})}
  runtime.positionSheetVersionMenu=()=>{
    const popup=runtime.sheetVersionPopover;if(!popup)return
    const bounds=root.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect(),width=Math.max(0,Math.min(360,bounds.width-16)),top=Math.max(8,Math.min(bounds.height-160,anchor.bottom-bounds.top+8))
    Object.assign(popup.element.style,{width:width+"px",left:Math.max(8,Math.min(bounds.width-width-8,anchor.right-bounds.left-width))+"px",top:top+"px",maxHeight:Math.max(80,bounds.height-top-8)+"px"})
  }
  runtime.openSheetVersionMenu=(anchor,{restore=false}={})=>{
    const unit=activeTranslationSheet(runtime.data,runtime.focused)
    if(!unit||String(unit.id)!==anchor?.dataset.sheetVersionMenu)return
    const same=runtime.sheetVersionPopover?.anchor===anchor;runtime.closeSheetVersionMenu();if(same&&!restore)return
    runtime.closeBuildVersionMenu?.();runtime.closeConnectionDiscovery?.()
    const element=doc.createElement("section");element.className="build-version-menu sheet-version-popover";element.setAttribute("role","dialog");element.setAttribute("aria-label",`Language & translation · ${unit.identity?.title||unit.title||unit.id}`);element.innerHTML=sheetVersionControl(unit,runtime.data.stack)
    root.append(element);runtime.sheetVersionPopover={anchor,element,id:String(unit.id),workId:String(runtime.data.stack.work.id)};anchor.setAttribute("aria-expanded","true");runtime.positionSheetVersionMenu()
    if(!restore)element.querySelector("[data-sheet-version]")?.focus({preventScroll:true})
  }
  runtime.paintSheetVersionControl=()=>{
    const slot=root.querySelector("[data-sheet-version-slot]");if(!slot)return
    const unit=activeTranslationSheet(runtime.data,runtime.focused),markup=sheetVersionTrigger(unit)
    if(runtime.sheetVersionPopover&&(runtime.sheetVersionPopover.id!==String(unit?.id)||runtime.sheetVersionPopover.workId!==String(runtime.data?.stack?.work?.id)))runtime.closeSheetVersionMenu()
    if(slot.innerHTML!==markup&&!runtime.sheetVersionPopover)slot.innerHTML=markup
    const saved=runtime.pendingSheetVersionMenu;runtime.pendingSheetVersionMenu=null
    if(saved&&unit&&saved.id===String(unit.id)&&saved.workId===String(runtime.data.stack.work.id)){
      const anchor=slot.querySelector("[data-sheet-version-menu]");runtime.openSheetVersionMenu(anchor,{restore:true})
      const popup=runtime.sheetVersionPopover?.element,input=popup?.querySelector("[data-translation-language]")
      if(input&&[...input.options].some(option=>option.value===saved.language))input.value=saved.language
      if(saved.focus)popup?.querySelector(saved.focus)?.focus({preventScroll:true})
    }
  }
  const paintFocus=runtime.paintFocus;runtime.paintFocus=()=>{paintFocus();runtime.paintSheetVersionControl()}
  runtime.captureVersionMenus=()=>{const popup=runtime.sheetVersionPopover,saved=runtime.savedSheetVersionMenu;runtime.savedSheetVersionMenu=null;if(!popup)return saved?[saved]:[];const menu=popup.element,focused=menu.querySelector(":focus");return [{id:popup.id,workId:popup.workId,language:menu.querySelector("[data-translation-language]")?.value,focus:["[data-sheet-version]","[data-translation-language]","[data-translate-sheet]"].find(selector=>focused?.matches(selector))||null}]}
  runtime.restoreVersionMenus=states=>{runtime.pendingSheetVersionMenu=states[0]||null}
  runtime.onSheetPaneFocus=event=>{const pane=event.target?.closest?.("[data-pane]");if(pane&&pane.dataset.pane!==runtime.focused){runtime.focused=pane.dataset.pane;runtime.paintFocus()}}
  const onClick=runtime.onClick;runtime.onClick=event=>{
    runtime.onSheetPaneFocus(event)
    const anchor=event.target?.closest?.("[data-sheet-version-menu]")
    if(anchor){event.preventDefault();runtime.openSheetVersionMenu(anchor);return}
    if(event.target?.closest?.("[data-sheet-version-close]")){event.preventDefault();runtime.closeSheetVersionMenu({restoreFocus:true});return}
    return onClick(event)
  }
  const onKey=runtime.onKey;runtime.onKey=event=>{
    if(runtime.sheetVersionPopover&&event.key==="Escape"){event.preventDefault();event.stopPropagation();runtime.closeSheetVersionMenu({restoreFocus:true});return}
    if(event.target?.closest?.("[data-sheet-versions]")){event.stopPropagation?.();return}
    return onKey(event)
  }
  const outside=event=>{const popup=runtime.sheetVersionPopover,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeSheetVersionMenu()}
  runtime.attachSheetVersionMenu=()=>{doc.addEventListener("pointerdown",outside,true);view?.addEventListener("resize",runtime.positionSheetVersionMenu);root.addEventListener("scroll",runtime.positionSheetVersionMenu,true);for(const event of ["pointerdown","focusin","wheel"])root.addEventListener(event,runtime.onSheetPaneFocus,{passive:true})}
  runtime.cleanupSheetVersionMenu=()=>{runtime.savedSheetVersionMenu=runtime.captureVersionMenus()[0]||null;runtime.closeSheetVersionMenu();doc.removeEventListener("pointerdown",outside,true);view?.removeEventListener("resize",runtime.positionSheetVersionMenu);root.removeEventListener("scroll",runtime.positionSheetVersionMenu,true);for(const event of ["pointerdown","focusin","wheel"])root.removeEventListener(event,runtime.onSheetPaneFocus)}
}
function setupVersionControls(runtime){
  const currentWork=()=>String(runtime.data?.stack?.work?.id||"")
  const emit=action=>runtime.api?.setTriggerValue("version_action",{...action,nonce:`${Date.now()}-${Math.random()}`})
  runtime.chooseBuildVersion=workId=>{
    workId=String(workId);const option=arr(runtime.data?.build_versions).find(row=>String(row.work_id||row.id)===workId)
    if(option&&option.available!==false&&workId!==currentWork())emit({kind:"build",work_id:workId,source_work_id:currentWork()})
  }
  const sheetFor=input=>{
    const menu=input?.closest?.("[data-sheet-versions]")
    if(!menu||menu.closest("[data-connection-book],[data-connection-field]")||menu.dataset.versionWork!==currentWork())return null
    const unit=activeTranslationSheet(runtime.data,runtime.focused)
    return unit&&String(unit.id)===menu.dataset.sheetVersions?{menu,unit,versions:unit.sheet_versions||{}}:null
  }
  runtime.onVersionChange=event=>{
    const input=event.target
    if(input?.matches?.("[data-build-version]")){
      runtime.chooseBuildVersion(input.value)
      return
    }
    if(!input?.matches?.("[data-sheet-version]"))return
    const sheet=sheetFor(input),option=arr(sheet?.versions.options).find(row=>String(row.id)===String(input.value))
    if(sheet&&option&&option.available!==false&&String(input.value)!==String(sheet.versions.selected_id))emit({kind:sheet.unit.type==="SOURCE"?"source":"sheet",work_id:currentWork(),unit_id:String(sheet.unit.id),variant_id:String(input.value)})
  }
  const onClick=runtime.onClick
  runtime.onClick=event=>{
    const button=event.target?.closest?.("[data-translate-sheet]")
    if(!button)return onClick(event)
    event.preventDefault()
    const sheet=sheetFor(button),language=sheet?.menu.querySelector("[data-translation-language]")?.value
    if(!sheet||button.disabled||sheet.versions.can_translate===false||!arr(sheet.versions.language_options).some(option=>String(option.code)===String(language)))return
    button.disabled=true;button.textContent="Translating…"
    emit({kind:sheet.unit.type==="SOURCE"?"translate_source":"translate",work_id:currentWork(),unit_id:String(sheet.unit.id),language_code:String(language)})
  }

}
const sheetLayerKey=unit=>String(unit?.type||unit?.layer).toUpperCase()==="MC"?`MC:${mcLevel(unit)||"legacy"}`:String(unit?.type||unit?.layer||"")
const paneLayerKey=pane=>pane?.dataset?.layer==="MC"?`MC:${pane.dataset.mcLevel||"legacy"}`:pane?.dataset?.layer||"SOURCE"
function paneForLayer(root,key){
  if(String(key).startsWith("MC:")){const level=String(key).split(":")[1];return root.querySelector(level==="legacy"?'[data-layer="MC"]:not([data-mc-level])':`[data-layer="MC"][data-mc-level="${CSS.escape(level)}"]`)}
  return root.querySelector(`[data-layer="${CSS.escape(key)}"]`)
}
function sliderOptions(stack,layer){
  if(layer==="SOURCE")return arr(stack?.chapters).filter(row=>row.readable).map(row=>({...row,id:row.raw_unit_id}))
  const level=String(layer).startsWith("MC:")?String(layer).split(":")[1]:null
  return arr(stack?.sheet_options?.[level?"MC":layer]).filter(row=>row.available!==false&&(!level||(mcLevel(row)||"legacy").toString()===level))
}
const sliderPosition=(value,length)=>Math.max(0,Math.min(Math.max(0,length-1),Number(value)||0))
const sliderIndex=(value,length)=>Math.round(sliderPosition(value,length))
// Studio uses exact chapter detents; previews stay local until release.
const sliderMagneticPosition=(value,length)=>sliderIndex(value,length)
const sliderMemoryKey=input=>{const workId=input?.closest?.("[data-connection-book]")?.dataset?.connectionBook;return `${workId?`${workId}|`:""}${input.dataset.sheetSlider}`}
const sliderTitle=option=>option.identity?.title||option.title||option.label||option.id
const sliderStopLabel=(option,layer,index)=>layer==="WB"?"WB":`${layer==="SOURCE"?"CH":readerLayerLabel(layer,option)} ${String(option.chapter_number||option.sequence_number||index+1).padStart(2,"0")}`
const sliderHeadingOriginals=new WeakMap()
function paintSliderHeading(input,option,index){
  const pane=input.closest?.("[data-pane]")
  if(!pane?.querySelector)return
  let original=sliderHeadingOriginals.get(pane)
  if(!original){
    const fields={}
    for(const name of ["title","kicker","context"]){const node=pane.querySelector(`[data-slider-preview-${name}]`);if(node)fields[name]={node,text:node.textContent}}
    if(!Object.keys(fields).length)return
    original={id:String(pane.querySelector("[data-reading-id]")?.dataset?.readingId||""),fields}
    sliderHeadingOriginals.set(pane,original)
  }
  const layer=String(input.dataset.sheetSlider).split(":")[0],identity=option.identity||{},source=layer==="SOURCE"
  const preview={title:source?(option.heading_title||option.title||sliderTitle(option)):sliderTitle(option),
    kicker:source?`CHAPTER ${option.chapter_number||index+1} · EXACT SOURCE`:(identity.kicker||sliderStopLabel(option,layer,index)),
    context:identity.context||option.id}
  const restoring=String(option.id)===original.id
  for(const [name,{node,text}] of Object.entries(original.fields)){
    const next=String((restoring?text:preview[name])??"")
    if(node.textContent!==next)node.textContent=next
  }
}
function keepSliderVisible(input,behavior="auto"){
  const track=input.closest?.("[data-slider-track]")
  if(!track||track.scrollWidth<=track.clientWidth+2)return
  const range=input.getBoundingClientRect(),bounds=track.getBoundingClientRect(),scale=readerLayoutScale(track,bounds),ratio=sliderPosition(input.value,Number(input.max)+1)/Math.max(1,Number(input.max))
  // Keep a visible stop anchored. Only reveal a clipped thumb, with its outline;
  // a large edge margin made ordinary clicks slide the whole chapter line.
  const point=(range.left-bounds.left)/scale+track.scrollLeft+8+ratio*Math.max(0,range.width/scale-16),margin=10,start=track.scrollLeft
  let target=start
  if(point<start+margin)target=point-margin
  else if(point>start+track.clientWidth-margin)target=point-track.clientWidth+margin
  target=Math.max(0,Math.min(track.scrollWidth-track.clientWidth,target))
  if(Math.abs(target-start)>1)track.scrollTo({left:target,behavior})
}
function paneSlider(stack,layer,activeId){
  const key=layer==="MC"?`MC:${mcLevel(activeId)||"legacy"}`:layer,options=sliderOptions(stack,key),index=options.findIndex(row=>String(row.id)===String(activeId)),active=options[index]
  if(!active)return ""
  const title=sliderTitle(active),label=layer==="SOURCE"?"Source chapter":`${readerLayerLabel(layer,active)} sheet`,denominator=Math.max(1,options.length-1)
  const stops=options.map((option,position)=>`<button type="button" class="slider-stop${position===index?" active":""}" data-slider-stop="${position}" data-slider-layer="${esc(key)}" style="--stop-x:${position/denominator*100}%" title="${esc(sliderTitle(option))}" aria-label="Choose ${esc(sliderTitle(option))}" aria-pressed="${position===index}" tabindex="${position===index?0:-1}"><span class="slider-dot" aria-hidden="true"></span><span class="slider-stop-label">${esc(sliderStopLabel(option,layer,position))}</span></button>`).join("")
  return `<div class="pane-slider" data-slider-control><div class="slider-heading"><span>${esc(label)}</span><button type="button" class="slider-jump-trigger" data-slider-jump aria-label="Choose ${esc(label.toLowerCase())}" aria-haspopup="dialog" aria-expanded="false"><strong data-slider-title title="${esc(title)}">${esc(title)}</strong><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button><output data-slider-count>${index+1} / ${options.length}</output></div><div class="slider-track" data-slider-track><div class="slider-rail" style="--slider-count:${options.length}"><input type="range" class="sheet-slider" data-sheet-slider="${esc(key)}" min="0" max="${Math.max(0,options.length-1)}" step="1" value="${index}" aria-label="${esc(label)}" aria-valuetext="${esc(title)}" ${options.length<2?"disabled":""} /><div class="slider-stops" role="group" aria-label="${esc(label)} stops">${stops}</div></div></div></div>`
}
const sliderJumpText=value=>String(value??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\b0+(\d+)/g,"$1").trim()
function sliderJumpMatches(options,layer,query=""){
  const terms=sliderJumpText(query).split(/\s+/).filter(Boolean),base=String(layer).split(":")[0]
  return options.map((option,index)=>({option,index,label:sliderStopLabel(option,base,index),title:sliderTitle(option)})).filter(row=>{
    const number=row.option.chapter_number||row.option.sequence_number||row.index+1
    const text=sliderJumpText([row.title,row.label,row.option.label,row.option.id,base==="SOURCE"?`source chapter ${number}`:`${base} sheet ${number}`].join(" "))
    return terms.every(term=>text.includes(term))
  })
}
let sliderJumpSequence=0
function setupSliderJumpMenu(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeSliderJumpMenu=({restoreFocus=false}={})=>{
    const popup=runtime.sliderJumpMenu;if(!popup)return
    runtime.sliderJumpMenu=null;popup.anchor.setAttribute("aria-expanded","false");popup.anchor.removeAttribute("aria-controls");popup.element.remove()
    if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})
  }
  runtime.positionSliderJumpMenu=()=>{
    const popup=runtime.sliderJumpMenu;if(!popup)return
    if(popup.anchor.isConnected===false){runtime.closeSliderJumpMenu();return}
    const bounds=root.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect(),scale=readerLayoutScale(root,bounds)
    const width=Math.min(380,(bounds.width/scale)-16),height=Math.min(bounds.height,(view?.innerHeight||bounds.bottom)-bounds.top)/scale
    const left=Math.max(8,Math.min(bounds.width/scale-width-8,(anchor.left-bounds.left)/scale)),below=(anchor.bottom-bounds.top)/scale+6
    const above=height-below<150&&(anchor.top-bounds.top)/scale>height-below,top=above?Math.max(8,(anchor.top-bounds.top)/scale-366):below
    Object.assign(popup.element.style,{width:Math.max(0,width)+"px",left:left+"px",top:top+"px",maxHeight:Math.max(0,Math.min(360,above?(anchor.top-bounds.top)/scale-top-6:height-top-8))+"px"})
  }
  runtime.highlightSliderJump=position=>{
    const popup=runtime.sliderJumpMenu;if(!popup)return
    popup.highlight=Math.max(0,Math.min(popup.matches.length-1,position))
    const choices=[...popup.list.querySelectorAll("[data-slider-jump-choice]")]
    choices.forEach((choice,index)=>choice.toggleAttribute("data-highlighted",index===popup.highlight))
    const active=choices[popup.highlight]
    if(!active){popup.search.removeAttribute("aria-activedescendant");return}
    popup.search.setAttribute("aria-activedescendant",active.id)
    const bounds=popup.list.getBoundingClientRect(),item=active.getBoundingClientRect(),scale=readerLayoutScale(root)
    if(item.top<bounds.top)popup.list.scrollTop+=(item.top-bounds.top)/scale
    else if(item.bottom>bounds.bottom)popup.list.scrollTop+=(item.bottom-bounds.bottom)/scale
  }
  runtime.filterSliderJump=()=>{
    const popup=runtime.sliderJumpMenu;if(!popup)return
    popup.matches=sliderJumpMatches(popup.options,popup.input.dataset.sheetSlider,popup.search.value)
    popup.list.innerHTML=popup.matches.map(row=>`<button type="button" role="option" tabindex="-1" class="slider-jump-option" id="${popup.id}-option-${row.index}" data-slider-jump-choice="${row.index}" aria-selected="${row.index===popup.selected}"><small>${esc(row.label)}</small><strong>${esc(row.title)}</strong><span class="slider-jump-check" aria-hidden="true">${row.index===popup.selected?"✓":""}</span></button>`).join("")
    popup.status.textContent=popup.matches.length?`${popup.matches.length} ${popup.input.dataset.sheetSlider==="SOURCE"?"chapter":"sheet"}${popup.matches.length===1?"":"s"}`:"No matches. Try another title or number."
    popup.list.scrollTop=0
    runtime.highlightSliderJump(popup.search.value?0:Math.max(0,popup.matches.findIndex(row=>row.index===popup.selected)))
  }
  runtime.openSliderJumpMenu=anchor=>{
    const same=runtime.sliderJumpMenu?.anchor===anchor
    runtime.closeSliderJumpMenu();if(same)return
    const input=anchor.closest("[data-slider-control]")?.querySelector("[data-sheet-slider]")
    if(!input)return
    const stack=runtime.connectionStack?.(input)||runtime.data?.stack,options=sliderOptions(stack,input.dataset.sheetSlider)
    if(!options.length)return
    runtime.closeBookMenu?.();runtime.closeBuildVersionMenu?.();runtime.closeSheetVersionMenu?.();runtime.closeBookmarkMenu?.();runtime.closeConnectionDiscovery?.()
    const element=doc.createElement("section"),id=`slider-jump-${++sliderJumpSequence}`,label=input.getAttribute("aria-label")||"Chapter or sheet"
    element.id=id;element.className="slider-jump-menu";element.setAttribute("role","dialog");element.setAttribute("aria-label",`Choose ${label.toLowerCase()}`)
    element.style.setProperty("--pane-accent",view?.getComputedStyle?.(anchor).getPropertyValue("--pane-accent")||"#8ca9bd")
    element.innerHTML=`<div class="slider-jump-search-row"><label for="${id}-search">Choose ${esc(label.toLowerCase())}</label><input id="${id}-search" data-slider-jump-search type="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="${id}-list" autocomplete="off" spellcheck="false" placeholder="Search by title or number…"></div><div class="slider-jump-options" id="${id}-list" role="listbox" aria-label="${esc(label)}"></div><p class="slider-jump-status" role="status" aria-live="polite"></p>`
    root.append(element)
    const popup={anchor,input,options,element,id,selected:sliderIndex(input.value,options.length),search:element.querySelector("[data-slider-jump-search]"),list:element.querySelector(".slider-jump-options"),status:element.querySelector(".slider-jump-status"),matches:[],highlight:0}
    runtime.sliderJumpMenu=popup;anchor.setAttribute("aria-expanded","true");anchor.setAttribute("aria-controls",id)
    popup.search.oninput=runtime.filterSliderJump
    runtime.positionSliderJumpMenu();runtime.filterSliderJump();popup.search.focus({preventScroll:true})
  }
  const choose=index=>{
    const popup=runtime.sliderJumpMenu;if(!popup||!popup.matches.some(row=>row.index===index))return
    if(index!==popup.selected)runtime.sliderJumpFocus={layer:popup.input.dataset.sheetSlider,book:popup.input.closest("[data-connection-book]")?.dataset.connectionBook||"",work:String(runtime.data?.stack?.work?.id||""),connection:String(runtime.data?.connection?.id||"")}
    runtime.closeSliderJumpMenu({restoreFocus:true});runtime.chooseSlider(popup.input,index)
  }
  const click=runtime.onClick
  runtime.onClick=event=>{
    const anchor=event.target?.closest?.("[data-slider-jump]")
    if(anchor){event.preventDefault();runtime.openSliderJumpMenu(anchor);return}
    const choice=event.target?.closest?.("[data-slider-jump-choice]")
    if(choice&&runtime.sliderJumpMenu?.element.contains(choice)){event.preventDefault();choose(Number(choice.dataset.sliderJumpChoice));return}
    return click(event)
  }
  const key=runtime.onKey
  runtime.onKey=event=>{
    const popup=runtime.sliderJumpMenu,anchor=event.target?.closest?.("[data-slider-jump]")
    if(!popup&&anchor&&["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();runtime.openSliderJumpMenu(anchor);return}
    if(!popup)return key(event)
    if(event.key==="Escape"){event.preventDefault();event.stopPropagation?.();runtime.closeSliderJumpMenu({restoreFocus:true});return}
    if(event.key==="Tab"){runtime.closeSliderJumpMenu({restoreFocus:true});return}
    if(!popup.element.contains(event.target))return key(event)
    event.stopPropagation?.()
    if(event.isComposing||event.metaKey||event.ctrlKey||event.altKey)return
    if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();runtime.highlightSliderJump(popup.highlight+(event.key==="ArrowDown"?1:-1));return}
    if(event.key==="Enter"){event.preventDefault();const row=popup.matches[popup.highlight];if(row)choose(row.index)}
  }
  const wheel=runtime.onWheel
  runtime.onWheel=event=>{if(event.target?.closest?.(".slider-jump-menu"))return;return wheel(event)}
  const outside=event=>{const popup=runtime.sliderJumpMenu,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeSliderJumpMenu()}
  const blur=event=>{const popup=runtime.sliderJumpMenu;if(popup&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeSliderJumpMenu()}
  runtime.attachSliderJumpMenu=()=>{doc.addEventListener("pointerdown",outside,true);root.addEventListener("focusin",blur);root.addEventListener("scroll",runtime.positionSliderJumpMenu,true);view?.addEventListener("resize",runtime.positionSliderJumpMenu)}
  runtime.restoreSliderJumpMenu=reuseReading=>{
    const saved=runtime.savedSliderJumpMenu,focus=runtime.sliderJumpFocus
    runtime.savedSliderJumpMenu=null;runtime.sliderJumpFocus=null
    if(saved&&reuseReading&&saved.signature===runtime.renderSignature&&saved.anchor.isConnected!==false){
      runtime.openSliderJumpMenu(saved.anchor)
      const popup=runtime.sliderJumpMenu
      if(popup){popup.search.value=saved.query;runtime.filterSliderJump();runtime.highlightSliderJump(saved.highlight)}
    }
    if(focus&&focus.work===String(runtime.data?.stack?.work?.id||"")&&focus.connection===String(runtime.data?.connection?.id||"")){
      const input=[...root.querySelectorAll(`[data-sheet-slider="${CSS.escape(focus.layer)}"]`)].find(input=>(input.closest("[data-connection-book]")?.dataset.connectionBook||"")===focus.book)
      input?.closest("[data-slider-control]")?.querySelector("[data-slider-jump]")?.focus({preventScroll:true})
    }
  }
  runtime.cleanupSliderJumpMenu=()=>{
    const popup=runtime.sliderJumpMenu
    runtime.savedSliderJumpMenu=popup?{anchor:popup.anchor,signature:runtime.renderSignature,query:popup.search.value,highlight:popup.highlight}:null
    runtime.closeSliderJumpMenu();doc.removeEventListener("pointerdown",outside,true);root.removeEventListener("focusin",blur);root.removeEventListener("scroll",runtime.positionSliderJumpMenu,true);view?.removeEventListener("resize",runtime.positionSliderJumpMenu)
  }
}
const layerRank=layer=>({SOURCE:0,PASSAGE:0,CH:1,CL:2,MC:3,WB:4})[String(layer||"").toUpperCase()] ?? 9
const ROUTE_MODES=["outgoing","both","incoming"]
const isRouteReference=reference=>["axiom","passage"].includes(reference?.kind)
const routeMode=reference=>reference?.kind==="passage"?"outgoing":ROUTE_MODES.includes(reference?.route_mode)?reference.route_mode:"incoming"
const routeModeLabel=mode=>({incoming:"Incoming routes",both:"Incoming and outgoing routes",outgoing:"Outgoing routes"})[mode]||"Incoming routes"
const routeCanMove=reference=>reference?.kind!=="passage"&&String(reference?.layer).toUpperCase()!=="WB"&&(reference?.has_outgoing===true||arr(reference?.available_route_modes).includes("outgoing"))
function routeItems(reference,layer){return arr(reference?.route_layers?.[String(layer||"").toUpperCase()])}
function routeItemsForUnit(reference,unit){
  const items=routeItems(reference,unit.type)
  if(unit.type!=="MC"||(!unit.mc_partitioned&&!mcLevel(unit)&&!items.some(mcLevel)))return items
  return items.filter(item=>mcLevel(item)===mcLevel(unit))
}
function readingRank(unit){
  const layer=String(unit?.type||unit?.layer||"").toUpperCase(),rank=layerRank(layer),level=layer==="MC"?mcLevel(unit):null
  return rank+(level?level/(level+1)*.5:0)
}
function exactRouteEdges(reference){return arr(reference?.route_edges).filter(edge=>edge.source_id&&edge.target_id)}
function routeNodeIndex(reference){
  const nodes=new Map([[String(reference?.id||""),reference]])
  Object.values(reference?.route_layers||{}).forEach(items=>arr(items).forEach(item=>nodes.set(String(item.id),item)))
  return nodes
}
function routeArrival(reference,mode=routeMode(reference)){
  const nodes=routeNodeIndex(reference),edges=exactRouteEdges(reference).filter(edge=>String(edge.target_id)===String(reference.id)),groups=new Map()
  edges.forEach(edge=>{const node=nodes.get(String(edge.source_id));if(!node)return;const key=`${node.layer}|${node.unit_id||node.sheet_title||node.layer}`;if(!groups.has(key))groups.set(key,{node,ids:[]});groups.get(key).ids.push(String(node.id))})
  const outgoing=exactRouteEdges(reference).filter(edge=>String(edge.source_id)===String(reference.id)).map(edge=>nodes.get(String(edge.target_id))).filter(Boolean),movable=routeCanMove(reference)
  if(!groups.size&&!outgoing.length&&!movable)return ""
  const rows=edges.map(edge=>({node:nodes.get(String(edge.source_id)),ids:[String(edge.source_id)]})).filter(row=>row.node)
  const centre=mode==="both"?34:mode==="outgoing"?11:57
  const branches=mode==="outgoing"?"":rows.map(({node,ids},index)=>{const y=rows.length===1?16:5+index*22/(rows.length-1),color=layerColor(node.layer,node);return `<g data-route-members="${esc(ids.join("|"))}"><path class="confluence-thread" stroke="${color}" d="M 6 ${y} C ${mode==="both"?16:28} ${y}, ${mode==="both"?20:32} 16, ${centre-6} 16"/><circle cx="6" cy="${y}" r="${rows.length>8?1:1.7}" fill="${color}"/></g>`}).join("")
  const departures=mode==="incoming"?"":outgoing.map((node,index)=>{const y=outgoing.length===1?16:5+index*22/(outgoing.length-1),color=layerColor(node.layer,node);return `<g data-route-members="${esc(node.id)}"><path class="confluence-thread" stroke="${color}" d="M ${centre+6} 16 C ${mode==="both"?48:36} 16, ${mode==="both"?52:40} ${y}, 62 ${y}"/><circle cx="62" cy="${y}" r="${outgoing.length>8?1:1.7}" fill="${color}"/></g>`}).join("")
  const label=mode==="incoming"?`${edges.length} direct feeder${edges.length===1?"":"s"} from ${groups.size} sheet${groups.size===1?"":"s"} converge into ${reference.id}`:`${routeModeLabel(mode)} for ${reference.id}: ${mode==="both"?`${rows.length} incoming, `:""}${outgoing.length} outgoing`
  const control=movable?`<input class="route-direction-slider" type="range" data-route-direction min="0" max="2" step="1" value="${ROUTE_MODES.indexOf(mode)}" aria-label="Route direction for ${esc(reference.id)}" aria-valuetext="${esc(routeModeLabel(mode))}" title="Move the dot: left — outgoing; centre — both; right — incoming" />`:""
  const fixedHint=reference.kind==="passage"?"Outgoing routes · Recorded uses of this passage":String(reference.layer).toUpperCase()==="WB"?"Incoming routes only · Whole-book level":"Incoming routes only · No outgoing route recorded for this axiom"
  return `<span class="route-arrival"${movable?' data-route-direction-control':` title="${fixedHint}" aria-label="${fixedHint}"`}><svg viewBox="0 0 68 32" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${branches}${departures}<circle class="confluence-target" cx="${centre}" cy="16" r="6"/><circle cx="${centre}" cy="16" r="2.3" fill="${layerColor(reference.layer,reference)}"/></svg>${control}</span>`
}
function routeFocusHead(reference,label,direction="incoming"){return `<header class="route-focus-head"><div><span>${direction==="outgoing"?"FLOWING FROM":"FEEDING INTO"} · ${esc(reference.layer)}</span><strong>${esc(reference?.id||"Selected axiom")}</strong><span>${direction==="outgoing"?"Hover an axiom to illuminate its connections.":"Hover a feeder to illuminate its connections."}</span></div><button type="button" class="route-close" data-clear-reference aria-label="Close route focus">×</button></header>`}
function routeGroups(items,selectedId){
  const groups=new Map()
  arr(items).forEach(item=>{const key=String(item.unit_id||item.sheet_title||item.layer||"TRACE");if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)})
  return [...groups.entries()].map(([key,rows])=>{const first=rows[0]||{},title=first.sheet_title||first.chapter_title||key||first.layer,mc=String(first.layer||"").toUpperCase()==="MC"&&mcLevel(first);const cards=rows.map(item=>`<div class="axiom-row"><button type="button" class="route-card ${String(item.id)===selectedId?"selected":""}"${String(item.layer||"").toUpperCase()==="MC"&&mcLevel(item)?` style="--pane-accent:${layerColor(item.layer,item)}"`:""} data-ref-id="${esc(item.id)}" data-select-axiom="${esc(item.id)}" data-selection-unit="${esc(item.unit_id||String(item.id).split(':')[0])}" aria-pressed="false"><span class="route-card-id">${esc(readerLayerLabel(item.layer||item.kind,item))} · ${esc(item.local_id||item.id)}</span><span class="route-card-text">${item.reading_html ?? esc(item.text||item.title)}</span><span class="route-card-via">${arr(item.feeds_ids).length?`FEEDS → ${arr(item.feeds_ids).map(esc).join(" · ")}`:item.feeds_id?`FEEDS → ${esc(item.feeds_id)}`:"REGISTERED ROUTE"}</span></button><button type="button" class="axiom-routes" data-open-axiom-routes="${esc(item.id)}" aria-label="Open Routes for ${esc(item.id)}" hidden>Routes →</button></div>`).join("");return `<section class="route-sheet"${mc?` style="--pane-accent:${layerColor("MC",first)}"`:""}><h3><span>${esc(mc?`${readerLayerLabel("MC",first)} · ${title}`:title||"Registered sheet")}</span><b>${rows.length}</b></h3><div class="route-list">${cards}</div></section>`}).join("")
}
function sameLayerRouteItems(reference,direction){
  if(reference?.kind!=="axiom"||routeMode(reference)===(direction==="incoming"?"outgoing":"incoming"))return []
  // Every recorded peer gets its own endpoint beside the focus, including
  // inputs from another section of the selected sheet.
  const edges=exactRouteEdges(reference),seen=new Set([String(reference.id)]),pending=[String(reference.id)]
  while(pending.length){const id=pending.pop();for(const edge of edges){const from=String(direction==="incoming"?edge.target_id:edge.source_id),to=String(direction==="incoming"?edge.source_id:edge.target_id);if(from===id&&!seen.has(to)){seen.add(to);pending.push(to)}}}
  return routeItems(reference,reference.layer).filter(item=>String(item.id)!==String(reference.id)&&seen.has(String(item.id))&&(reference.layer!=="MC"||!mcLevel(reference)||mcLevel(item)===mcLevel(reference)))
}
function sameLayerRoutePane(reference,direction,items){
  if(!items.length)return ""
  const layer=reference.layer,id=`route-${layer}-${direction}`,outgoing=direction==="outgoing",withinSheet=items.some(item=>String(item.unit_id)===String(reference.unit_id))
  return `<section class="desk-window care-pane route-pane" data-pane="${esc(id)}" data-layer="${esc(layer)}" data-route-intermediate="${direction}" style="--pane-accent:${layerColor(layer)}"><div class="window-titlebar"><strong>${esc(layer)} / ${outgoing?"FOLLOWING":"FEEDING"} ${withinSheet?"AXIOMS":"SHEETS"}</strong><span>${items.length} EXACT</span></div><div class="window-body"><div class="route-focus">${routeFocusHead(reference,layer,direction)}${routeGroups(items,String(reference.id))}</div></div></section>`
}
function sourceRoutePane(data,selectedId,reference){
  const sourceFocus=reference.kind==="passage",items=sourceFocus?[reference]:routeItems(reference,"SOURCE")
  const passages=items.map(item=>`<div class="passage-row"><article class="route-source-card ${String(item.id)===selectedId?"selected":""}" data-ref-id="${esc(item.id)}" data-select-passage="${esc(item.id)}" data-source-unit="${esc(item.unit_id||String(item.id).split(':')[0])}" role="button" tabindex="0" aria-pressed="false"><span class="passage-address"><span>${esc(item.id)}</span><b>${esc(item.sheet_title||item.title||"Exact source")}</b></span>${typeof item.reading_block_html === "string" ? `<div class="passage-text">${item.reading_block_html}</div>` : `<span class="passage-text">${esc(item.text)}</span>`}</article>${String(item.id)===selectedId?'':`<button type="button" class="axiom-routes passage-routes" data-open-passage-routes="${esc(item.id)}" aria-label="Open Routes for ${esc(item.id)}" hidden>Routes →</button>`}</div>`).join("")
  const emptySource=arr(reference.linked_axioms).length?"Recorded links for this passage could not be resolved to available axioms.":"No recorded axiom uses this passage."
  const content=sourceFocus?`<div class="route-axiom-row">${passages}${routeArrival(reference)}</div>${exactRouteEdges(reference).some(edge=>String(edge.source_id)===selectedId)?"":`<div class="route-empty">${emptySource}</div>`}`:passages||'<div class="route-empty">No registered passage has been resolved on this route yet. The axiom chain remains visible in the CARE panes.</div>'
  return `<section class="desk-window source-pane route-pane" data-pane="source" data-layer="SOURCE" style="--pane-accent:#8a431d"><div class="window-titlebar"><strong>SOURCE / EXACT ROUTE</strong><span>${items.length} PASSAGES</span></div><div class="window-body"><div class="route-source-copy">${routeFocusHead(reference,"The source pane",sourceFocus?"outgoing":"incoming")}${content}</div></div></section>`
}
function sourcePane(data,selectedId,reference){
  if(isRouteReference(reference))return sourceRoutePane(data,selectedId,reference)
  const chapter=data?.active_chapter
  if(!chapter)return `<section class="desk-window source-pane" data-pane="source" data-layer="SOURCE" style="--pane-accent:#8a431d"><div class="window-titlebar"><strong>SOURCE TEXT</strong><span>NOT REGISTERED</span></div><div class="window-body"><div class="inspector-empty"><div><b>NO READABLE CHAPTER</b><p>This book can still expose its available CARE sheets. Add or repair the source in CARE Library settings when needed.</p></div></div></div></section>`
  const passages=arr(chapter.passages).map(passage=>{
    return `<div class="passage-row"><article class="passage ${String(passage.id)===selectedId?"selected":""}" data-ref-id="${esc(passage.id)}" data-select-passage="${esc(passage.id)}" data-source-unit="${esc(chapter.raw_unit_id)}" role="button" tabindex="0" aria-pressed="false" aria-describedby="desk-selection-help"><span class="passage-address">${esc(passage.address||passage.id)}</span><div class="passage-text" dir="auto">${passage.reading_block_html ?? esc(passage.text)}</div></article><button type="button" class="axiom-routes passage-routes" data-open-passage-routes="${esc(passage.id)}" aria-label="Open Routes for ${esc(passage.id)}" hidden>Routes →</button></div>`
  }).join("")
  return `<section class="desk-window source-pane" data-pane="source" data-layer="SOURCE" style="--pane-accent:#8a431d"><div class="window-titlebar"><strong>SOURCE / ${esc(chapter.label||chapter.title)}</strong><span>${arr(chapter.passages).length} PASSAGES</span></div>${paneSlider(data,"SOURCE",chapter.raw_unit_id)}<div class="window-body" data-reading-id="${esc(chapter.raw_unit_id)}"><div class="source-layout"><main class="source-copy"><header class="source-head"><span class="pane-kicker" data-slider-preview-kicker>CHAPTER ${esc(chapter.chapter_number||"")} · ${chapter.source_rendition_type==="machine"?"MACHINE TRANSLATION":"EXACT SOURCE"}</span>${sheetVersionTrigger(sourceTranslationSheet(chapter),{pane:true})}<h2 data-slider-preview-title>${esc(chapter.title)}</h2><p>${esc(data?.work?.author||"")}</p></header>${passages||'<p class="trace-empty">No registered passages in this chapter.</p>'}</main></div></div></section>`
}
function traceLabel(item,layer){
  if(String(layer).toUpperCase()==="SOURCE")return "Saved source passage"
  const direct=[...new Set(arr(item.source_trace))],deep=[...new Set([...arr(item.deep_source_trace),...arr(item.matrix_trace)])].filter(id=>!direct.includes(id))
  if(deep.length&&direct.length&&["XR","XS","SC","XA","CB"].includes(String(layer).toUpperCase()))return `${direct.length} direct trace${direct.length===1?"":"s"} · ${deep.length} deeper reference${deep.length===1?"":"s"}`
  const traces=[...direct,...deep]
  const passages=new Set(arr(item.passage_trace_ids).map(String))
  if(String(layer).toUpperCase()==="CH"&&passages.size){
    const refs=[...new Set(traces.map(value=>String(value).trim().replace(/^[\[\]`]+|[\[\]`]+$/g,"")).filter(Boolean))]
    const axioms=refs.filter(id=>!passages.has(id)&&!/^RAW_.*:P\d+$/i.test(id)),unresolved=refs.filter(id=>!passages.has(id)&&/^RAW_.*:P\d+$/i.test(id))
    return [axioms.length?`${axioms.length} axiom trace${axioms.length===1?"":"s"}`:"",`${passages.size} passage trace${passages.size===1?"":"s"}`,unresolved.length?`${unresolved.length} unresolved passage reference${unresolved.length===1?"":"s"}`:""].filter(Boolean).join(" · ")
  }
  return traces.length?`${traces.length} exact trace${traces.length===1?"":"s"}`:"No explicit trace in this record"
}
function routeHistoryControls(history={}){
  const arrow=(direction,label,enabled,path)=>`<button type="button" class="route-history-arrow" data-route-history="${direction}" aria-label="${label}" title="${label}" ${enabled?"":"disabled"}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="${path}"/></svg></button>`
  return `<div class="route-history-actions" role="group" aria-label="Route navigation">${arrow(-1,"Previous route",history.can_back,"M16 10H4m6-6-6 6 6 6")}${arrow(1,"Next route",history.can_forward,"M4 10h12m-6-6 6 6-6 6")}<button type="button" class="route-close" data-clear-reference title="Close route and return to reading"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg><span>Close route</span></button></div>`
}
function carePane(unit,index,selectedId,reference,stack,relocatedIds=new Set(),showVersions=false,bookmarks=[]){
  const color=unit.pane_accent||layerColor(unit.type,unit)
  const focusLayer=String(reference?.layer||(reference?.kind==="passage"?"PASSAGE":"")).toUpperCase(),isRoute=isRouteReference(reference),isUpstream=isRoute&&readingRank(unit)<readingRank({...reference,layer:focusLayer}),isDownstream=isRoute&&routeMode(reference)!=="incoming"&&readingRank(unit)>readingRank({...reference,layer:focusLayer})
  const mcPartition=unit.type==="MC"&&Boolean(mcLevel(unit)||unit.mc_partitioned),isFocus=String(unit.id)===String(reference?.unit_id),routedItems=routeItemsForUnit(reference,unit),levelAttribute=unit.type==="MC"&&mcLevel(unit)?` data-mc-level="${mcLevel(unit)}"`:""
  if(isUpstream||isDownstream||(isRoute&&mcPartition&&!isFocus&&routedItems.length)){
    const feeders=routedItems,grouped=routeGroups(feeders,selectedId)
    return `<section class="desk-window care-pane route-pane" data-pane="${esc(unit.id)}" data-layer="${esc(unit.type)}"${levelAttribute} style="--pane-accent:${color}"><div class="window-titlebar"><strong>${esc(readerLayerLabel(unit.type,unit))} / ROUTE ${isDownstream?"DESTINATIONS":"FEEDERS"}</strong><span>${feeders.length} EXACT</span></div><div class="window-body"><div class="route-focus">${routeFocusHead(reference,`The ${unit.type} pane`,isDownstream?"outgoing":"incoming")}${grouped||`<div class="route-empty">This route does not name an explicit ${esc(unit.type)} axiom. It may jump across this scale or the trace may not yet be registered.</div>`}</div></div></section>`
  }
  const feederIds=new Set(routedItems.filter(item=>item.resolved!==false).map(item=>String(item.id)))
  // Dialogue sheets keep their original entry point, including text-only dialogues.
  const dialogue=/^WORK_DLG_/i.test(String(stack?.work?.id||unit.work_id||''))||/^CH_DLG_/i.test(String(unit.id||unit.unit_id||''))
  const defaultSectionIndex=dialogue?0:Math.min(1,arr(unit.sections).length-1)
  const sections=arr(unit.sections).map((section,sectionIndex)=>{
    const visibleItems=arr(section.items).filter(item=>String(item.id)===selectedId||!relocatedIds.has(String(item.id)))
    if(!visibleItems.length&&arr(section.items).length)return ""
    const contains=visibleItems.some(item=>String(item.id)===selectedId||feederIds.has(String(item.id)))
    const items=visibleItems.map(item=>{
      const content=`<span class="axiom-id">${esc(item.address||item.id)} · ${esc(item.id)}</span><span class="axiom-text">${item.reading_html ?? esc(item.text)}</span><span class="axiom-trace">${esc(traceLabel(item,unit.type))}</span>`
      if(isRoute){const button=`<button type="button" class="axiom-button ${String(item.id)===selectedId?"selected":feederIds.has(String(item.id))?"route-feeder":""}" data-ref-id="${esc(item.id)}" data-select-axiom="${esc(item.id)}" data-selection-unit="${esc(unit.id)}" aria-pressed="false">${content}</button>`;return `<div class="axiom-row route-axiom-row">${button}${String(item.id)===selectedId?routeArrival(reference):`<button type="button" class="axiom-routes" data-open-axiom-routes="${esc(item.id)}" aria-label="Open Routes for ${esc(item.id)}" hidden>Routes →</button>`}</div>`}
      return `<div class="axiom-row"${item.source_pane?` data-connection-source-pane="${esc(item.source_pane)}"`:""}><button type="button" class="axiom-button" data-ref-id="${esc(item.id)}" data-select-axiom="${esc(item.id)}" aria-pressed="false" aria-describedby="desk-selection-help">${content}</button><button type="button" class="axiom-routes" data-open-axiom-routes="${esc(item.id)}" aria-label="Open Routes for ${esc(item.id)}" hidden>Routes →</button></div>`
    }).join("")
    return `<details class="care-section"${section.source_pane?` data-connection-reading="${esc(section.source_pane)}"`:""} ${contains||(!isRoute&&sectionIndex===defaultSectionIndex)?"open":""}><summary><span>${esc(section.number||String(sectionIndex+1))} · ${esc(section.name)}</span><small>${visibleItems.length}</small></summary><div class="axiom-list">${items}</div></details>`
  }).join("")
  const identity=unit.identity||{}
  const sheetItems=new Set(arr(unit.sections).flatMap(section=>arr(section.items)).map(item=>String(item.id))),levelPeers=isRoute&&mcPartition&&isFocus?routedItems.filter(item=>!sheetItems.has(String(item.id))&&String(item.id)!==selectedId):[],levelPeerMarkup=levelPeers.length?`<div class="mc-level-peers">${routeGroups(levelPeers,selectedId)}</div>`:""
  const selectedNote=isRoute&&String(unit.type).toUpperCase()===focusLayer&&(!mcPartition||isFocus)?`<div class="route-recipient"><span>${routeMode(reference)==="incoming"?"Receiving at":routeMode(reference)==="both"?"Flowing through":"Flowing from"} <b>${esc(identity.title||unit.title||unit.id)}</b></span><button type="button" class="route-close route-pane-close" data-clear-reference aria-label="Close route focus" title="Close route"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div>`:""
  const sectionActions=!isRoute&&arr(unit.sections).length?`<div class="sheet-actions" role="group" aria-label="${esc(identity.title||unit.title||unit.id)} sections"><button type="button" data-sheet-sections="collapse" aria-label="Collapse all sections" title="Collapse all sections"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 3 4 4 4-4M4 10h12m-10 7 4-4 4 4"/></svg></button><button type="button" data-sheet-sections="expand" aria-label="Expand all sections" title="Expand all sections"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 4-4 4 4M4 10h12m-10 4 4 4 4-4"/></svg></button></div>`:""
  return `<section class="desk-window care-pane" data-pane="${esc(unit.id)}" data-layer="${esc(unit.type)}"${levelAttribute}${isRoute?"":" data-reading-sheet"} style="--pane-accent:${color}"><div class="window-titlebar"><strong>${esc(readerLayerLabel(unit.type,unit))} / ${esc(identity.title||unit.title||unit.id)}</strong><span>${unit.item_count??arr(unit.items).length} AXIOMS</span>${showVersions&&!isRoute?paneBookmarkButton(unit,bookmarks):""}</div>${isRoute?"":paneSlider(stack,unit.type,unit.id)}<div class="window-body" data-reading-id="${esc(unit.id)}"><header class="care-head">${showVersions&&!isRoute?sheetVersionTrigger(unit,{pane:true}):""}<span class="pane-kicker"${isRoute?"":" data-slider-preview-kicker"}>${esc(identity.kicker||unit.type||"CARE SHEET")}</span><div class="care-heading"><h2${isRoute?"":" data-slider-preview-title"}>${esc(identity.title||unit.title||unit.label)}</h2>${sectionActions}</div><p${isRoute?"":" data-slider-preview-context"}>${esc(identity.context||unit.id)}</p></header>${selectedNote}${levelPeerMarkup}<div class="care-sections">${sections||'<p class="trace-empty">No readable axioms in this sheet.</p>'}</div></div></section>`
}
function traceGroup(title,items,empty){
  const rows=arr(items).map(item=>`<button type="button" class="trace-card" data-ref-id="${esc(item.id)}" ${item.kind==="unresolved"?"disabled":""}><strong>${esc(item.layer||item.kind)} · ${esc(item.id)}</strong><span>${esc(textClip(item.reading_text ?? item.text ?? item.title,220))}</span></button>`).join("")
  return `<section class="trace-group"><h4>${esc(title)}<b>${arr(items).length}</b></h4>${rows?`<div class="trace-list">${rows}</div>`:`<div class="trace-empty">${esc(empty)}</div>`}</section>`
}
function inspectorPane(reference,reviewer,rating){
  if(!reference)return `<section class="desk-window inspector-pane" data-pane="inspector" style="--pane-accent:#333"><div class="window-titlebar"><strong>TRACE INSPECTOR</strong><span>READY</span></div><div class="window-body"><div class="inspector-empty"><div><b>CLICK ANY PASSAGE OR AXIOM</b><p>The desk will move here with exact provenance, same-sheet uses, higher-layer descendants, and personal ratings.</p></div></div></div></section>`
  const source=reference.kind==="passage"
  const stars=[1,2,3,4,5].map(score=>`<button type="button" class="star ${score<=Number(rating||0)?"active":""}" data-rate="${score}" data-rate-id="${esc(reference.id)}" aria-label="Rate ${score} stars">★</button>`).join("")
  const groups=source
    ? traceGroup("AXIOMS GROUNDED HERE",reference.linked_axioms,"No CH axiom is directly aligned to this passage yet.")
    : traceGroup("USED BY · SAME SHEET",reference.used_by_same_sheet,"No other axiom on this sheet explicitly names it.")+
      traceGroup("BUILT FROM",reference.built_from,"No earlier explicit trace is recorded.")+
      traceGroup("EXACT SOURCE PASSAGES",reference.source_passages||reference.passages,"No registered source passage has been resolved yet.")+
      traceGroup("USED BY · LATER LAYERS",reference.used_by_elsewhere,"No derived axiom explicitly names it yet.")
  return `<section class="desk-window inspector-pane" data-pane="inspector" style="--pane-accent:${layerColor(reference.layer,reference)}"><div class="window-titlebar"><strong>TRACE INSPECTOR / ${esc(reference.layer||reference.kind)}</strong><span>${source?"PASSAGE":"AXIOM"}</span></div><div class="window-body"><article class="inspector-content"><button type="button" class="route-close" data-clear-reference>× CLOSE FOCUS</button><div class="inspect-id">${esc(reference.id)}</div><h3 class="inspect-title">${esc(reference.title||reference.id)}</h3>${source && typeof reference.reading_block_html === "string" ? `<div class="inspect-text source">${reference.reading_block_html}</div>` : `<p class="inspect-text ${source?"source":""}">${reference.reading_html ?? esc(reference.text)}</p>`}<p class="inspect-meta">${esc(reference.metadata||"")}</p>${source?"":`<div class="rating-box"><div class="rating-head"><strong>${esc(reviewer||"Reader")}'S RATING</strong><span>${Number(rating||0)?`${Number(rating)} / 5`:"NOT RATED"}</span></div><div class="stars">${stars}</div></div>`}${groups}</article></div></section>`
}
function loadingScreen(){return `<div class="load-screen" data-load-screen><div class="load-box"><div class="load-title"><span>OPENING CARE DESK</span><span>READING LINEAGE</span></div><div class="care-wire"><div class="wire-node">CH</div><div class="wire-node">CL</div><div class="wire-node">MC</div><div class="wire-node">WB</div></div><div class="load-caption">Keeping source and every scale in one navigable line…</div></div></div>`}
function connectionControls(data){return connectionDiscoveryControls(data)}

function connectionTabRail(tabs,data){
  if(!data?.connection)return `<div class="desk-tabs">${tabs}</div>`
  return `<div class="connection-tab-rail" aria-label="Reading panes"><button type="button" class="connection-tab-scroll" data-connection-tabs-scroll="-1" aria-label="Earlier pane tabs">‹</button><div class="desk-tabs">${tabs}</div><button type="button" class="connection-tab-scroll" data-connection-tabs-scroll="1" aria-label="Later pane tabs">›</button></div>`
}
function connectionPaneTab(id,label){return paneTab(id,label).replace('<button ',`<button title="${esc(label)}" `)}
const connectionPaneId=(kind,scope,id)=>`connection:${kind}:${scope}:${id}`
function connectionScopeMarkup(html,kind,scope){
  const attribute=kind==="book"?"data-connection-book":"data-connection-field"
  // Namespace pane and reading positions. The original unit and axiom addresses
  // remain intact for routing; two editions may legitimately share an address.
  return html.replace(/data-pane="([^"]*)"/g,(_,id)=>`${attribute}="${esc(scope)}" data-original-pane="${id}" data-pane="${esc(connectionPaneId(kind,scope,id))}"`).replace(/data-reading-id="([^"]*)"/g,(_,id)=>`data-reading-id="${esc(connectionPaneId(kind,scope,id))}"`)
}
function connectionAllPanes(connection){
  const pending=[...arr(connection?.bundle?.panes),...arr(connection?.bundle?.route_panes),...arr(connection?.reference?.resolution_panes)],panes=[],seen=new Set()
  while(pending.length){const pane=pending.shift();if(!pane||seen.has(pane.id))continue;seen.add(pane.id);panes.push(pane);pending.push(...arr(pane.variants))}
  return panes
}
function connectionFieldUnit(pane,items=null,connection=null){
  const sourceTitles=arr(pane.source_work_titles).length?arr(pane.source_work_titles):arr(pane.input_titles),compared=!sourceTitles.length&&pane.role!=="origin"&&connection?.field==="lateral"
  const titles=compared?arr(connection?.bundle?.members).map(member=>member.title||member.work_title||member.work_id||member.id).filter(Boolean):sourceTitles,name=pane.work_title||pane.title||pane.unit_id||pane.id
  const sections=items?[{number:"",name:pane.layer==="SOURCE"?"Saved source passages":"Recorded routes",items}]:arr(pane.sections)
  return {...pane,id:pane.unit_id||pane.id,type:pane.layer||pane.type,title:name,sections,items:items||pane.items,item_count:items?items.length:arr(pane.items).length||sections.reduce((sum,section)=>sum+arr(section.items).length,0),identity:{title:name,kicker:`${pane.layer||pane.type} · ${pane.version||"Saved reading"}`,context:titles.length?`${compared?"Compared works":"Works feeding this reading"}: ${titles.join(" · ")}`:pane.description||pane.unit_id||""}}
}
function connectionMacroLevel(pane){return mcLevel({...pane,mc_level:pane.macro_level||pane.mc_level})}
function connectionMacroColor(pane){return mcLevelColor({...pane,mc_level:connectionMacroLevel(pane)})}
function connectionLayerLabel(pane){return pane.layer==="MC"?mcLevelLabel({...pane,mc_level:connectionMacroLevel(pane)}):pane.layer}
function groupConnectionLayers(panes,reference){
  if(!reference)return panes
  const result=[],groups=new Map()
  for(const pane of panes){
    if(pane.id===reference.source_pane||(pane.role==="origin"&&!pane.work_id)||!["MC","CL","CH","SOURCE"].includes(pane.layer)){result.push(pane);continue}
    const key=[pane.role||"reading",pane.work_id||"corpus",pane.layer,pane.layer==="MC"?connectionMacroLevel(pane):""].join(":")
    let group=groups.get(key)
    if(!group){group={...pane,macro_level:pane.layer==="MC"?connectionMacroLevel(pane):undefined,grouped_panes:[]};groups.set(key,group);result.push(group)}
    group.grouped_panes.push(pane)
  }
  return result.map(pane=>pane.grouped_panes?.length>1?{...pane,version:"",work_title:pane.work_id?pane.work_title:"",title:pane.work_id?pane.title:`${pane.layer} readings`,source_work_titles:[...new Set(pane.grouped_panes.flatMap(member=>arr(member.source_work_titles)))],id:`layer-group:${pane.role||"reading"}:${pane.work_id||"corpus"}:${pane.layer}:${pane.layer==="MC"?connectionMacroLevel(pane):""}`,unit_id:`layer-group:${pane.work_id||"corpus"}:${pane.layer}:${pane.layer==="MC"?connectionMacroLevel(pane):""}`}:(pane.grouped_panes?.[0]||pane))
}
function connectionLayerSlider(pane){
  const members=arr(pane.grouped_panes);if(members.length<2)return ""
  const choices=[{id:"",title:"All traced readings"},...members.map(member=>({id:member.id,title:resolutionUnitTitle(member)}))]
  return `<div class="pane-slider" data-connection-layer-control><div class="slider-heading"><span>${esc(connectionLayerLabel(pane))} readings</span><strong data-connection-layer-title>All traced readings</strong><output data-connection-layer-count>${members.length} readings</output></div><div class="slider-track" data-slider-track><div class="slider-rail" style="--slider-count:${choices.length}"><input type="range" class="sheet-slider" data-connection-layer-slider min="0" max="${choices.length-1}" step="1" value="0" aria-label="${esc(pane.work_title||pane.title)} · ${esc(pane.layer)} route reading" aria-valuetext="All traced readings"><div class="slider-stops" role="group" aria-label="${esc(pane.layer)} route readings">${choices.map((choice,index)=>`<button type="button" class="slider-stop ${index===0?"active":""}" data-connection-layer-stop="${index}" data-connection-layer-reading="${esc(choice.id)}" data-connection-layer-label="${esc(choice.title)}" style="--stop-x:${index*100/(choices.length-1)}%" title="${esc(choice.title)}" aria-label="Show ${esc(choice.title)}"><span class="slider-dot"></span><span class="slider-stop-label">${index===0?"All":esc(choice.title)}</span></button>`).join("")}</div></div></div></div>`
}
function connectionFieldWindows(connection){
  const reference=connection?.reference,all=connectionAllPanes(connection),cards=reference?[reference,...Object.values(reference.route_layers||{}).flatMap(arr)]:[],byPane=new Map()
  cards.forEach(card=>{if(!card.source_pane)return;if(!byPane.has(card.source_pane))byPane.set(card.source_pane,[]);const rows=byPane.get(card.source_pane);if(!rows.some(item=>item.id===card.id))rows.push(card)})
  const visible=(reference?all.filter(pane=>byPane.has(pane.id)):arr(connection?.bundle?.panes).filter(pane=>pane.role!=="origin")).filter(pane=>connection.hide_xa===false||pane.layer!=="XA")
  // A lateral route keeps its two source shores on their reading sides.
  // Current book layers return when the temporary saved-edition route closes.
  if(reference){
    const origin=String(connection.bundle?.origin_work_id||connection.origin_work_id||connection.bundle?.members?.[0]?.work_id||connection.bundle?.members?.[0]?.id||"")
    const workId=pane=>String(pane.work_id||arr(byPane.get(pane.id)).find(card=>card.work_id)?.work_id||arr(connection.bundle?.members).find(member=>arr(member.source_unit_ids).includes(pane.unit_id))?.work_id||"")
    const side=pane=>pane.id===reference.source_pane?1:connection.field==="lateral"&&workId(pane)&&workId(pane)!==origin?2:0
    const rank=pane=>["SOURCE","PASSAGE","CH","CL","MC","WB","CB","XR","XS","SC","XA"].indexOf(pane.layer)+(pane.layer==="MC"?((connectionMacroLevel(pane)||1)-1)*.1:0)
    visible.sort((a,b)=>side(a)-side(b)||(connection.field==="lateral"?(side(a)===2?rank(b)-rank(a):rank(a)-rank(b)):0))
  }
  const displayed=groupConnectionLayers(visible,reference)
  let windows=displayed.map((pane,index)=>{
    const rows=reference?byPane.get(pane.id):null,wholeSheet=arr(rows).find(card=>card.kind==="sheet"),unit=connectionFieldUnit(pane,wholeSheet?null:rows,connection),scope=String(pane.id)
    if(pane.grouped_panes){
      unit.sections=pane.grouped_panes.map(member=>{const cards=arr(byPane.get(member.id)),whole=cards.some(card=>card.kind==="sheet"),items=(whole?arr(member.items):cards).map(item=>({...item,source_pane:member.id}));return {number:"",source_pane:member.id,name:resolutionUnitTitle(member),items}})
      unit.items=unit.sections.flatMap(section=>section.items);unit.item_count=unit.items.length
      unit.identity={...unit.identity,kicker:`${connectionLayerLabel(pane)} · ${pane.grouped_panes.length} traced readings`}
    }
    if(pane.layer==="MC"){unit.pane_accent=connectionMacroColor(pane);unit.mc_level=connectionMacroLevel(pane)}
    let html=carePane(unit,index,reference?.id||"",null,{})
    if(pane.layer==="MC")html=html.replace('<div class="window-titlebar"><strong>MC /',`<div class="window-titlebar"><strong>${connectionLayerLabel(pane)} /`)
    if(pane.grouped_panes)html=html.replace('<div class="window-body"',connectionLayerSlider(pane)+'<div class="window-body"').replace(/(<details class="care-section"[^>]*)(>)/g,(_,attributes,end)=>attributes.includes(" open")?attributes+end:attributes+" open"+end)
    if(reference){if(!wholeSheet)html=html.replaceAll('class="axiom-button"',`class="axiom-button route-feeder"`);html=html.replace(`data-ref-id="${esc(reference.id)}"`, `data-ref-id="${esc(reference.id)}" data-connection-selected="true"`)}
    if(wholeSheet)html=html.replace('<header class="care-head">',`<header class="care-head" data-ref-id="${esc(wholeSheet.id)}" data-connection-whole-sheet="true">`)
    const note=(pane.role==="origin"?`<p class="connection-edition">${esc(pane.source_verification==="hash-recorded-import-closure"?"Original imported source · input edition not certified":pane.historical_input_verified===false?"Recorded source · matched preserved edition":pane.provenance_verified?"Saved source edition":"Recorded source · edition not certified")}${pane.version?` · ${esc(pane.version)}`:""}</p>`:"")+(pane.historical_input_verified===false?'<p class="connection-edition">Original run did not pin its input edition.</p>':"")+(wholeSheet?'<p class="connection-edition">Whole-book reference · no individual axiom specified</p>':"")
    html=html.replace('<div class="care-sections">',`${note}<div class="care-sections">`)
    return connectionScopeMarkup(html,"field",scope)
  }).join("")
  const unresolved=cards.filter(card=>card.resolved===false||card.kind==="unresolved")
  if(unresolved.length)windows+=`<section class="desk-window care-pane connection-unresolved" data-pane="connection:unresolved" data-layer="TRACE"><div class="window-titlebar"><strong>Sources awaiting exact text</strong><span>${unresolved.length}</span></div><div class="window-body"><header class="care-head"><h2>Recorded source references</h2><p>These references are kept as recorded. Their exact saved text is unavailable.</p></header>${unresolved.map(card=>`<article class="route-card"><span class="route-card-id">${esc(card.work_title||card.unit_id||card.id)}</span><span class="route-card-text">${esc(card.id)}</span><span class="route-card-via">${esc(card.text||card.metadata||"Exact source edition could not be resolved.")}</span></article>`).join("")}</div></section>`
  return {windows,panes:displayed}
}
function studyPanes(stack,reference){
  let units=[...arr(stack?.care_path)]
  const routes=routeItems(reference,"MC"),focusMC=reference?.layer==="MC"?reference:null,detailed=[...units.filter(unit=>unit.type==="MC"),...routes,...(focusMC?[focusMC]:[])].some(mcLevel)
  if(detailed){
    const levels=new Map()
    for(const unit of units.filter(unit=>unit.type==="MC")){const level=mcLevel(unit)||"legacy";if(!levels.has(level)||String(unit.id)===String(reference?.unit_id))levels.set(level,{...unit,mc_partitioned:true})}
    for(const item of [...routes,...(focusMC?[focusMC]:[])]){
      const level=mcLevel(item)||"legacy",id=String(item.unit_id||String(item.id).split(":")[0]||`route-MC-${level}`),selected=String(item.id)===String(reference?.id)
      if(!levels.has(level)||(selected&&String(levels.get(level).id)!==id)){
        const current=units.find(unit=>String(unit.id)===id),sameSheet=routes.filter(row=>String(row.unit_id||String(row.id).split(":")[0])===id&&String(row.id)!==String(item.id)),items=selected?[item,...sameSheet]:[]
        levels.set(level,current?{...current,mc_partitioned:true}:{id,type:"MC",mc_level:mcLevel(item),mc_partitioned:true,title:item.sheet_title||item.chapter_title||readerLayerLabel("MC",item),sections:items.length?[{name:"Recorded axioms",items}]:[],items})
      }
    }
    units=[...units.filter(unit=>unit.type!=="MC"),...levels.values()].sort((a,b)=>readingRank(a)-readingRank(b))
  }
  const outgoing=reference?.kind==="axiom"&&routeMode(reference)==="outgoing",routeLevels=new Set(routes.map(item=>mcLevel(item)||"legacy"))
  const panes=units.filter(unit=>!outgoing||readingRank(unit)>=readingRank(reference)||(unit.type==="MC"&&routeLevels.has(mcLevel(unit)||"legacy")))
  if(reference?.kind==="passage"){
    const seen=new Set()
    for(let index=0;index<panes.length;){const key=sheetLayerKey(panes[index]);if(seen.has(key))panes.splice(index,1);else{seen.add(key);index++}}
    for(const layer of ["CH","CL","MC","WB","TRACE"])if(routeItems(reference,layer).length&&!panes.some(unit=>unit.type===layer))panes.push({id:`route-${layer}-outgoing`,type:layer})
    panes.sort((a,b)=>readingRank(a)-readingRank(b))
  }
  return panes
}
function connectionBookWindows(stack){
  const reference=stack.reference||null,selectedId=String(reference?.id||""),workId=String(stack.work?.id||""),outgoingOnly=reference?.kind==="axiom"&&routeMode(reference)==="outgoing"
  const units=studyPanes(stack,reference),partitionedMC=reference?.layer==="MC"&&Boolean(mcLevel(reference)||units.some(unit=>unit.type==="MC"&&unit.mc_partitioned))
  const incoming=partitionedMC?[]:sameLayerRouteItems(reference,"incoming"),outgoing=partitionedMC?[]:sameLayerRouteItems(reference,"outgoing").filter(item=>!incoming.some(peer=>peer.id===item.id)),relocated=new Set([...incoming,...outgoing].map(item=>String(item.id)))
  const rows=units.flatMap((unit,index)=>{const focus=String(unit.id)===String(reference?.unit_id);return [focus?sameLayerRoutePane(reference,"incoming",incoming):"",carePane(unit,index,selectedId,reference,stack,focus?relocated:new Set()),focus?sameLayerRoutePane(reference,"outgoing",outgoing):""]})
  const windows=[...rows.reverse(),outgoingOnly?"":sourcePane(stack,selectedId,reference)].join("").replaceAll('<div class="window-titlebar"><strong>',`<div class="window-titlebar"><strong>${esc(stack.work?.title||"Connected book")} · `)
  const edition=`<span class="connection-edition-label">${esc(stack.edition_label||"Current Library edition")}</span>`
  return connectionScopeMarkup(windows.replaceAll('<header class="care-head">',`<header class="care-head">${edition}`).replaceAll('<header class="source-head">',`<header class="source-head">${edition}`),"book",workId)
}
function connectionWindows(data){
  const connection=data?.connection
  if(!connection)return {windows:"",tabs:""}
  const field=connectionFieldWindows(connection),others=connection.reference?[]:arr(connection.other_stacks)
  const tabs=field.panes.map(pane=>connectionPaneTab(connectionPaneId("field",pane.id,pane.unit_id||pane.id),`${connectionLayerLabel(pane)} · ${pane.work_title||pane.title}`)).join("")+others.map(stack=>connectionPaneTab(connectionPaneId("book",stack.work?.id,arr(stack.care_path).at(-1)?.id||"source"),stack.work?.title||"Connected book")).join("")
  return {windows:field.windows+others.map(connectionBookWindows).join(""),tabs,threePaneRoute:connection.field==="lateral"&&Boolean(connection.reference)&&field.panes.length===3&&!field.windows.includes("connection-unresolved")}
}
function workspace(data){
  const stack=data?.stack||{},reference=data?.reference||null,selectedId=String(reference?.id||data?.selected_reference_id||"")
  const connectedRouting=Boolean(data?.connection?.reference)
  const outgoingOnly=reference?.kind==="axiom"&&routeMode(reference)==="outgoing"
  const panes=studyPanes(stack,reference),partitionedMC=reference?.layer==="MC"&&Boolean(mcLevel(reference)||panes.some(unit=>unit.type==="MC"&&unit.mc_partitioned))
  const incomingPeers=partitionedMC?[]:sameLayerRouteItems(reference,"incoming"),outgoingPeers=partitionedMC?[]:sameLayerRouteItems(reference,"outgoing").filter(item=>!incomingPeers.some(peer=>peer.id===item.id))
  const relocatedIds=new Set([...incomingPeers,...outgoingPeers].map(item=>String(item.id)))
  const isFocus=unit=>String(unit.id)===String(reference?.unit_id)
  const connected=connectionWindows(data)
  const tabs=(dialogueMedia(data)?paneTab("dialogue-media",dialogueMedia(data).kind==="audio"?"AUDIO":"VIDEO"):"")+(connectedRouting?"":[outgoingOnly?"":paneTab("source","SOURCE"),dialogueExchangePane(data)?paneTab("dialogue-exchange","EXCHANGE"):"",...panes.map(unit=>`${isFocus(unit)&&incomingPeers.length?paneTab(`route-${unit.type}-incoming`,`${unit.type} · IN`):""}${paneTab(unit.id,readerLayerLabel(unit.type,unit))}${isFocus(unit)&&outgoingPeers.length?paneTab(`route-${unit.type}-outgoing`,`${unit.type} · OUT`):""}`)].join(""))+connected.tabs+(dialogueThinkerPane(data)?paneTab("dialogue-thinkers","THINKERS"):"")+(dialogueWBPane(data)?paneTab("dialogue-wb","WB SOURCE"):"")
  const windows=dialoguePane(data)+(connectedRouting?"":[outgoingOnly?"":sourcePane(stack,selectedId,reference),dialogueExchangePane(data),...panes.map((unit,index)=>`${isFocus(unit)?sameLayerRoutePane(reference,"incoming",incomingPeers):""}${carePane(unit,index,selectedId,reference,stack,isFocus(unit)?relocatedIds:new Set(),true,bookBookmarks(data))}${isFocus(unit)?sameLayerRoutePane(reference,"outgoing",outgoingPeers):""}`)].join(""))+connected.windows+dialogueThinkerPane(data)+dialogueWBPane(data)
  const routeLabel=routeMode(reference)==="incoming"?`${esc(reference?.layer)} → SOURCE`:routeMode(reference)==="both"?`SOURCE → ${esc(reference?.layer)} → WB`:`${esc(reference?.layer)} → WB`
  const routeToolbar=isRouteReference(reference)?`<div class="route-toolbar"><span>ROUTE · ${routeLabel}</span>${routeHistoryControls(data?.route_history||{})}</div>`:""
  return `<div class="desk-toolbar"><div class="desk-title"><strong>${esc(stack?.work?.title||"CARE STUDY")}</strong><span>${esc(stack?.work?.author||"")} · source and CARE remain independently readable</span></div>${routeToolbar}<div class="desk-reader-controls" role="group" aria-label="Reading controls">${buildVersionControl(data)}<span class="desk-sheet-version-slot" data-sheet-version-slot></span>${connectionControls(data)}${connectionResolutionControl(data)}${bookmarkControl(data)}${connectionTabRail(tabs,data)}<div class="desk-skin" aria-label="Visual skin"><span>SKIN</span><button type="button" data-skin-value="care">CARE</button><button type="button" data-skin-value="library">BOOK</button><button type="button" data-skin-value="classic">CLASSIC</button></div><div class="desk-text-size" aria-label="Reading text size"><button type="button" data-text-size="-1" aria-label="Make text smaller">A−</button><button type="button" data-text-size="1" aria-label="Make text larger">A+</button></div><div class="desk-nav"><button type="button" class="desk-arrow" data-step="-1" aria-label="Previous pane">←</button><button type="button" class="desk-arrow" data-step="1" aria-label="Next pane">→</button></div></div></div><div class="desk-strip${connected.threePaneRoute?" lateral-route-three":""}" data-strip>${windows}${connectionDiscoveryPane(data)}</div>${dialogueDock(data)}<div class="desk-status"><span class="status-cell focus" data-focus-label>FOCUS · SOURCE</span><span class="status-cell">${arr(stack.chapters).length} CHAPTERS</span><span class="status-cell">${panes.length} CARE PANES</span>${isRouteReference(reference)||connectedRouting?"":trackZoomControls()}<span class="status-help">${isRouteReference(reference)?`Select to read · Routes opens a new route · Close route returns to every sheet`:"Click to select · ↑ ↓ move axioms · Tab to Routes · [ and ] move panes"}</span></div>${isRouteReference(reference)?"":'<span id="desk-selection-help" class="desk-selection-help">Select this passage or axiom. Up and Down move through passages or expanded sections of this sheet; Home and End move to the first and last visible axiom. Tab to the Routes button to open Routes.</span>'}${loadingScreen()}`
}
const SHELF_STATE_KEY="care-studio-shelf/1"
const SHELF_SORTS=[["title","Title · A–Z"],["title-desc","Title · Z–A"],["author","Author · A–Z"],["newest","Publication · newest"],["oldest","Publication · oldest"],["added","Recently added"],["visited","Recently visited"],["coverage","Most CARE layers"]]
const SHELF_FIELDS=[["lateral","Laterals"],["corpus","Corpuses"],["numo","NUMO"],["living","Living books"],["lateral_sea","Lateral sea"],["grimoire","Solomon’s grimoire"]]
const SHELF_TABS=[["all","All"],["book","Books"],["lecture","Lectures"],["lateral","Laterals"],["corpus","Corpuses"]]
const shelfFieldLabel=field=>field==="dialogue"?"Dialogues":SHELF_FIELDS.find(([id])=>id===field)?.[1]||"Reading"
const isShelfField=book=>SHELF_FIELDS.some(([id])=>id===book.field)
const shelfScope=data=>["lateral","corpus","dialogue"].includes(data?.library_scope)?data.library_scope:""
const shelfDefaults=(scope="")=>({kind:scope||"book",query:"",sort:"title",author:"",language:"",layer:"",era:"",collection:"",filtersOpen:false})
const shelfStateFor=(data,state)=>shelfScope(data)?{...state,kind:shelfScope(data),collection:""}:state
const shelfText=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase()
const isCollection=book=>book.item_type==="collection"&&arr(book.members).length>0
const shelfLeaves=books=>arr(books).flatMap(book=>isCollection(book)?shelfLeaves(book.members):[book])
function shelfMatches(book,state,{ignoreQuery=false}={}){
  if(SHELF_FIELDS.some(([id])=>id===state.kind)&&book.field!==state.kind)return false
  if(["book","lecture","dialogue"].includes(state.kind)&&(isShelfField(book)||(book.content_kind||"book")!==state.kind))return false
  if(state.author&&book.author!==state.author&&!arr(book.author_names).includes(state.author))return false
  if(state.language&&book.language_code!==state.language&&!arr(book.languages).includes(state.language))return false
  if(state.layer==="source"&&!book.has_source&&!(isShelfField(book)&&arr(book.layers).includes("SOURCE")))return false
  if(state.layer==="unprocessed"&&(book.has_care||isShelfField(book)))return false
  if(state.layer&&!['source','unprocessed'].includes(state.layer)&&!arr(book.layers).includes(state.layer))return false
  const year=book.publication_year
  if(state.era==="undated"&&year!=null)return false
  if(state.era&&state.era!=="undated"){
    if(year==null)return false
    if(state.era==="before1800"&&year>=1800)return false
    if(state.era==="1800"&&(year<1800||year>=1900))return false
    if(state.era==="1900"&&(year<1900||year>=2000))return false
    if(state.era==="2000"&&year<2000)return false
  }
  const terms=shelfText(state.query).trim().split(/\s+/).filter(Boolean)
  return ignoreQuery||terms.every(term=>shelfText([book.title,book.author,book.year,book.language_name,...(isShelfField(book)?[shelfFieldLabel(book.field),book.description,...arr(book.member_titles)]:[])].join(" ")).includes(term))
}
function shelfSelection(data,state){
  state=shelfStateFor(data,state)
  const scope=shelfScope(data),all=scope==='dialogue'?shelfLeaves(data?.books).filter(book=>book.content_kind==='dialogue'):scope?[]:arr(data?.books),collection=all.find(book=>String(book.id)===state.collection&&isCollection(book))
  const fields=arr(data?.fields).filter(book=>isShelfField(book)&&(!scope||book.field===scope))
  const base=collection?arr(collection.members):[...all,...fields]
  const selected=base.flatMap(book=>{
    if(!collection&&state.kind==="collection"&&!isCollection(book))return []
    if(!isCollection(book))return shelfMatches(book,state)?[book]:[]
    const groupMatches=shelfMatches({...book,content_kind:["lecture","dialogue"].includes(state.kind)?state.kind:"book"},{...state,author:"",language:"",layer:"",era:""})
    const members=shelfLeaves(book.members).filter(member=>shelfMatches(member,state,{ignoreQuery:groupMatches}))
    return members.length?[{...book,matching_members:members.length}]:[]
  })
  const textCompare=(a,b)=>shelfText(a).localeCompare(shelfText(b),undefined,{numeric:true})
  const missingLast=(a,b,descending=false)=>a==null||a===""?(b==null||b===""?0:1):(b==null||b===""?-1:(descending?-1:1)*(typeof a==="number"?a-b:textCompare(a,b)))
  selected.sort((a,b)=>{
    let order=0
    if(state.sort==="title-desc")order=-textCompare(a.title,b.title)
    if(state.sort==="author")order=textCompare(a.author,b.author)
    if(state.sort==="newest"||state.sort==="oldest")order=missingLast(a.publication_year,b.publication_year,state.sort==="newest")
    if(state.sort==="added"||state.sort==="visited"){const field=state.sort==="added"?"ingested_at":"last_visited_at";order=missingLast(a[field],b[field],true)}
    if(state.sort==="coverage")order=arr(b.layers).length-arr(a.layers).length||Number(b.care_units||0)-Number(a.care_units||0)
    if(state.sort==="collection"&&collection)return 0
    return order||textCompare(a.title,b.title)||textCompare(a.id,b.id)
  })
  return {items:selected,collection,base,total:shelfLeaves(all).length,fieldTotal:fields.length}
}
function fieldMemberCover(member,book){
  return `<span class="field-member-copy"><strong>${esc(member.title||book.title)}</strong><small>${esc(member.author||book.author||"")}</small></span>${member.cover_url?`<img src="${esc(member.cover_url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`:""}`
}
function fieldSourceCover(book){
  const members=arr(book.members).slice(0,book.field==="lateral"?2:4)
  if(!members.length)members.push({title:book.title,author:book.author,cloth:book.cloth,foil:book.foil,cover_url:book.cover_url})
  const style=member=>`--cloth:${esc(member.cloth||book.cloth||"#2a2621")};--foil:${esc(member.foil||book.foil||"#eee7d6")}`
  if(book.field==="lateral"){
    while(members.length<2)members.push(members[members.length-1])
    return `<span class="book-cover field-split-cover" style="${style(book)}" aria-hidden="true">${members.map(member=>`<span class="field-source-half" style="${style(member)}">${fieldMemberCover(member,book)}</span>`).join("")}<svg class="field-split-seam" viewBox="0 0 2 3" preserveAspectRatio="none"><path d="M2 0L0 3"/></svg>${arr(book.layers).length?`<span class="field-cover-badge">${arr(book.layers).map(esc).join(" · ")}</span>`:""}</span>`
  }
  const count=Number(book.member_count||arr(book.members).length||0)
  while(members.length<4)members.push(members[members.length-1])
  return `<span class="book-cover field-stack-cover" style="${style(book)}" aria-hidden="true">${members.map(member=>`<span class="field-stack-book" style="${style(member)}">${fieldMemberCover(member,book)}</span>`).join("")}<span class="field-cover-badge">${count} ${count===1?"book":"books"}</span></span>`
}
function fieldShelfCard(book){
  const label=shelfFieldLabel(book.field),count=Number(book.member_count||arr(book.member_titles).length||0)
  const motifs={
    lateral:'<circle cx="36" cy="43" r="23"/><circle cx="64" cy="43" r="23"/><path d="M16 43h68M50 13v60"/>',
    corpus:'<path d="M22 25l28-12 28 12 10 32-38 26-38-26zM22 25l28 28 28-28M12 57l38-4 38 4M50 13v70"/><circle cx="50" cy="53" r="20"/>',
    numo:'<circle cx="50" cy="46" r="31"/><circle cx="50" cy="46" r="20"/><circle cx="50" cy="46" r="8"/><path d="M50 8v76M12 46h76"/>',
    living:'<path d="M49 79V24M49 54C17 52 16 27 16 27s32-5 33 27zM50 43C80 41 83 14 83 14S53 9 50 43zM49 69C25 66 24 49 24 49"/>',
    lateral_sea:'<path d="M5 25q15-17 30 0t30 0t30 0M5 40q15-17 30 0t30 0t30 0M5 55q15-17 30 0t30 0t30 0M5 70q15-17 30 0t30 0t30 0"/>',
    grimoire:'<circle cx="50" cy="46" r="34"/><circle cx="50" cy="46" r="29"/><path d="M50 15L77 62H23zM50 77L23 30h54z"/><circle cx="50" cy="46" r="9"/>'
  }
  const image=book.cover_url?`<img src="${esc(book.cover_url)}" alt="" loading="lazy" onerror="this.remove()">`:""
  const subtitle=book.author||(count?`${count} ${count===1?"source book":"source books"}`:"CARE library")
  const memberText=count?`${count} ${count===1?"source book":"source books"}`:""
  const cover=["lateral","corpus"].includes(book.field)?fieldSourceCover(book):`<span class="book-cover" style="--cloth:${esc(book.cloth||"#263239")};--foil:${esc(book.foil||"#f4e8cc")}"><span class="book-cover-fallback"><span class="field-cover-label">${esc(label)}</span><svg class="field-cover-art" viewBox="0 0 100 92" aria-hidden="true">${motifs[book.field]||motifs.corpus}</svg><strong>${esc(book.title)}</strong><small>${esc(subtitle)}</small></span>${image}</span>`
  return `<div class="book-card book-field"><button type="button" class="book-open" data-open-field="${esc(book.id)}" aria-label="${esc(`Read ${label}: ${book.title}`)}"><span class="book-object">${cover}</span><span class="book-copy"><strong>${esc(book.title)}</strong>${book.author?`<span>${esc(book.author)}</span>`:""}${book.description?`<span class="field-description">${esc(book.description)}</span>`:""}${memberText?`<span class="field-members">${esc(memberText)}</span>`:""}<span class="book-layers"><b class="book-kind">${esc(label)}</b>${arr(book.layers).map(layer=>`<b>${esc(layer)}</b>`).join("")}</span></span></button></div>`
}
function shelfCard(book){
  if(isShelfField(book))return fieldShelfCard(book)
  const collection=isCollection(book),count=arr(book.members).length
  const image=book.cover_url?`<img src="${esc(book.cover_url)}" alt="" loading="lazy" onerror="this.remove()">`:""
  const layers=arr(book.layers).map(layer=>`<b>${esc(layer)}</b>`).join("")
  const kind=collection?`${count} ${book.content_kind==="lecture"?"lectures":"volumes"}`:book.content_kind==="lecture"?"Lecture":book.content_kind==="dialogue"?"Dialogue":""
  const menu=collection?"":`<button type="button" class="book-menu-toggle" data-book-menu-toggle="${esc(book.id)}" aria-label="${esc(`Options for ${book.title}`)}" aria-haspopup="menu" aria-expanded="false" title="Book options"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="16" cy="10" r="1.4"/></svg></button>`
  return `<div class="book-card ${collection?"book-collection":""}" ${collection?"":`data-book-work="${esc(book.id)}"`}><button type="button" class="book-open" ${collection?"data-open-collection":"data-open-work"}="${esc(book.id)}" aria-label="${esc(`${collection?"Open collection":"Study"}: ${book.title}${collection?`, ${kind}`:""}`)}"><span class="book-object"><span class="book-cover" style="--cloth:${esc(book.cloth||"#263239")};--foil:${esc(book.foil||"#f4e8cc")}"><span class="book-cover-fallback"><i aria-hidden="true"></i><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small></span>${image}</span></span><span class="book-copy"><strong>${esc(book.title)}</strong><span>${esc(book.author)}${!collection&&book.year?` · ${esc(book.year)}`:""}</span><span class="book-layers">${kind?`<b class="book-kind">${esc(kind)}</b>`:""}${book.archived?'<b class="book-kind">Archived</b>':""}${layers}</span></span></button>${menu}</div>`
}
function setupBookMenu(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeBookMenu=({restoreFocus=false}={})=>{
    const current=runtime.bookMenu;if(!current)return
    runtime.bookMenu=null
    if(current.feedbackTimer)view?.clearTimeout(current.feedbackTimer)
    current.element.remove()
    current.card.classList.remove("menu-open")
    current.toggle?.setAttribute("aria-expanded","false")
    current.toggle?.removeAttribute("aria-controls")
    if(restoreFocus&&current.anchor?.isConnected!==false)current.anchor?.focus({preventScroll:true})
  }
  runtime.openBookMenu=(card,{anchor=null,x=null,y=null,last=false}={})=>{
    runtime.closeBookMenu()
    const workId=String(card?.dataset.bookWork||""),book=shelfLeaves(runtime.data?.books).find(item=>String(item.id)===workId&&item.item_type!=="collection")
    if(!book||!workId)return false
    const toggle=card.querySelector("[data-book-menu-toggle]"),origin=anchor||card.querySelector("[data-open-work]"),rect=(origin||card).getBoundingClientRect()
    const menu=doc.createElement("div");menu.className="book-context-menu";menu.id="care-book-context-menu";menu.setAttribute("data-book-context-menu","");menu.setAttribute("role","menu");menu.setAttribute("aria-label",`Options for ${book.title||"this book"}`)
    const actions=[["book_info","Book info",'<circle cx="10" cy="10" r="7"/><path d="M10 9v5m0-8h.01"/>'],["translate_book","Translate book",'<path d="M2 4h10M7 2v2M4 4c0 5 5 7 7 8M10 4c0 5-5 7-8 8m9 5 4-10 4 10m-6-3h4"/>'],["copy_title","Copy title",'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M4 13H3V3h10v1"/>'],book.archived?["restore_book","Restore",'<path d="M4 7v10h12V7M3 3h14v4H3zM10 14V9m-2 2 2-2 2 2"/>']:["archive_book","Archive",'<path d="M3 3h14v4H3zM4 7v10h12V7M8 10h4"/>']]
    for(const [action,label,path] of actions){
      const button=doc.createElement("button");button.type="button";button.tabIndex=-1;button.setAttribute("role","menuitem");button.setAttribute("data-book-menu-action",action)
      const icon=doc.createElement("span");icon.className="book-menu-icon";icon.setAttribute("aria-hidden","true");icon.innerHTML=`<svg viewBox="0 0 20 20">${path}</svg>`
      const text=doc.createElement("span");text.setAttribute("data-book-menu-label","");text.textContent=label;button.append(icon,text);menu.append(button)
    }
    const status=doc.createElement("span");status.className="book-menu-status";status.setAttribute("role","status");menu.append(status)
    const current={element:menu,card,book,toggle,anchor:origin,status,feedbackTimer:null};runtime.bookMenu=current
    root.append(menu);card.classList.add("menu-open");toggle?.setAttribute("aria-expanded","true");toggle?.setAttribute("aria-controls",menu.id)
    const bounds=menu.getBoundingClientRect(),width=view?.innerWidth||doc.documentElement?.clientWidth||1024,height=view?.innerHeight||doc.documentElement?.clientHeight||768
    menu.style.left=`${Math.max(8,Math.min(x??rect.right-bounds.width,width-bounds.width-8))}px`
    menu.style.top=`${Math.max(8,Math.min(y??rect.bottom+4,height-bounds.height-8))}px`
    const items=[...menu.querySelectorAll("[role='menuitem']")],first=last?items.at(-1):items[0];first.tabIndex=0;first.focus({preventScroll:true})
    return true
  }
  runtime.copyBookTitle=async button=>{
    const current=runtime.bookMenu;if(!current)return
    const title=String(current.book.title||"");let copied=false
    try{if(!view?.navigator?.clipboard?.writeText)throw Error("Clipboard unavailable");await view.navigator.clipboard.writeText(title);copied=true}catch(_){
      const helper=doc.createElement("textarea");helper.value=title;helper.setAttribute("readonly","");helper.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";root.append(helper);helper.select()
      try{copied=Boolean(doc.execCommand("copy"))}catch(_){}finally{helper.remove();if(runtime.bookMenu===current)button.focus({preventScroll:true})}
    }
    if(runtime.bookMenu!==current)return
    const label=button.querySelector("[data-book-menu-label]"),message=copied?"Title copied":"Couldn’t copy title";label.textContent=message;current.status.textContent=message
    if(current.feedbackTimer)view?.clearTimeout(current.feedbackTimer)
    current.feedbackTimer=view?.setTimeout(()=>{if(runtime.bookMenu===current){label.textContent="Copy title";current.status.textContent=""}},1800)
  }
  runtime.activateBookMenu=button=>{
    const current=runtime.bookMenu,action=button?.dataset.bookMenuAction;if(!current||!action)return false
    if(action==="copy_title"){runtime.copyBookTitle(button);return true}
    if(!["book_info","translate_book","archive_book","restore_book"].includes(action))return false
    const work_id=String(current.book.id);runtime.closeBookMenu({restoreFocus:true})
    runtime.api?.setTriggerValue("book_action",{action,work_id,nonce:`${Date.now()}-${Math.random()}`});return true
  }
  runtime.onBookMenuClick=event=>{
    const action=event.target?.closest?.("[data-book-menu-action]")
    if(action&&runtime.bookMenu?.element.contains(action)){event.preventDefault?.();event.stopPropagation?.();return runtime.activateBookMenu(action)}
    const toggle=event.target?.closest?.("[data-book-menu-toggle]");if(!toggle)return false
    event.preventDefault?.();event.stopPropagation?.()
    if(runtime.bookMenu?.toggle===toggle)runtime.closeBookMenu({restoreFocus:true})
    else runtime.openBookMenu(toggle.closest("[data-book-work]"),{anchor:toggle})
    return true
  }
  runtime.onBookContextMenu=event=>{
    const card=event.target?.closest?.("[data-book-work]");if(!card)return
    if(runtime.openBookMenu(card,{anchor:card.querySelector("[data-open-work]"),x:event.clientX,y:event.clientY})){event.preventDefault();event.stopPropagation()}
  }
  runtime.onBookMenuKey=event=>{
    const current=runtime.bookMenu,key=event.key
    if(current){
      if(key==="Escape"){event.preventDefault();event.stopPropagation();runtime.closeBookMenu({restoreFocus:true});return true}
      if(key==="Tab"){runtime.closeBookMenu({restoreFocus:true});return true}
      if(current.element.contains(event.target)){
        const items=[...current.element.querySelectorAll("[role='menuitem']")],index=Math.max(0,items.indexOf(event.target.closest("[role='menuitem']")))
        if(["ArrowDown","ArrowUp","Home","End"].includes(key)){
          event.preventDefault();event.stopPropagation();const next=key==="Home"?0:key==="End"?items.length-1:(index+(key==="ArrowDown"?1:-1)+items.length)%items.length
          items.forEach((item,position)=>item.tabIndex=position===next?0:-1);items[next].focus({preventScroll:true});return true
        }
        if(["Enter"," "].includes(key)){event.preventDefault();event.stopPropagation();return runtime.activateBookMenu(items[index])}
        return true
      }
    }
    if(event.metaKey||event.ctrlKey||event.altKey||event.isComposing)return false
    const toggle=event.target?.closest?.("[data-book-menu-toggle]"),card=event.target?.closest?.("[data-book-work]")
    if(card&&(key==="ContextMenu"||(event.shiftKey&&key==="F10")||(toggle&&["ArrowDown","ArrowUp"].includes(key)))){
      event.preventDefault();event.stopPropagation();return runtime.openBookMenu(card,{anchor:toggle||card.querySelector("[data-open-work]"),last:key==="ArrowUp"})
    }
    return false
  }
  runtime.onBookMenuOutside=event=>{
    const current=runtime.bookMenu;if(!current)return
    const path=event.composedPath?.()||[event.target]
    if(!path.includes(current.element)&&!path.includes(current.toggle)&&!current.element.contains(event.target))runtime.closeBookMenu()
  }
  runtime.onBookMenuScroll=event=>{if(runtime.bookMenu&&!event.target?.closest?.("[data-book-context-menu]"))runtime.closeBookMenu()}
  runtime.onBookMenuResize=()=>runtime.closeBookMenu()
}
function shelfHasFilters(state){return Boolean(state.query||state.author||state.language||state.layer||state.era)}
function shelfResults(data,state){
  state=shelfStateFor(data,state)
  const selection=shelfSelection(data,state),count=selection.items.length
  const fieldTab=SHELF_FIELDS.some(([id])=>id===state.kind),hasEntries=selection.total+selection.fieldTotal>0
  const label=selection.collection?`${count} of ${selection.base.length} volumes`:fieldTab?`${count} ${count===1?"reading":"readings"} · ${shelfFieldLabel(state.kind)}`:`${count} shelf ${count===1?"entry":"entries"} · ${selection.total} works${selection.fieldTotal?` · ${selection.fieldTotal} readings`:""}`
  const fieldEmpty=fieldTab&&!arr(data?.fields).some(field=>field.field===state.kind)
  return {selection,summary:`<span>${esc(label)}${state.kind==="collection"?" · Collections":state.kind==="dialogue"?" · Debates, interviews & conversations":""}</span>${shelfHasFilters(state)?'<button type="button" data-shelf-reset>Clear filters</button>':`<span>${selection.collection?"Choose a volume to begin":selection.fieldTotal?"Books, connections and their source routes":"Collections open to their own shelves"}</span>`}`,cards:selection.items.map(shelfCard).join("")||`<div class="library-empty"><strong>${fieldEmpty?`No ${esc(shelfFieldLabel(state.kind))} saved yet`:hasEntries?"No titles on this shelf":"Your library begins here"}</strong><p>${fieldEmpty?"Saved readings appear here, ready to open alongside their sources.":hasEntries?"Try another title, author, or combination of filters.":"Add a book to start your collection."}</p>${hasEntries&&!fieldEmpty?'<button type="button" data-shelf-reset>Clear filters</button>':""}</div>`}
}
function library(data,state=shelfDefaults()){
  state=shelfStateFor(data,state)
  const scope=shelfScope(data),all=scope==='dialogue'?shelfLeaves(data?.books).filter(book=>book.content_kind==='dialogue'):scope?arr(data?.fields).filter(book=>book.field===scope):[...shelfLeaves(data?.books),...arr(data?.fields)],result=shelfResults(data,state),collection=result.selection.collection
  const options=(pairs,value)=>pairs.map(([id,label])=>`<option value="${esc(id)}" ${id===value?"selected":""}>${esc(label)}</option>`).join("")
  const authors=[...new Set(all.flatMap(book=>[book.author,...arr(book.author_names)]).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
  const languages=[...new Map(all.map(book=>[book.language_code,book.language_name||book.language_code]).filter(([code])=>code)).entries()].sort((a,b)=>a[1].localeCompare(b[1]))
  const filterCount=[state.author,state.language,state.layer,state.era].filter(Boolean).length
  return `<div class="library-window" data-library-scope="${scope}">${collection?`<header class="library-head"><div><button type="button" class="library-back" data-close-collection>← All library</button><h2>${esc(collection.title)}</h2></div></header>`:""}<div class="library-toolbar"><div class="library-controls">${scope?`<div class="library-scope-title">${shelfFieldLabel(scope)}</div>`:`<div class="library-tabs" role="group" aria-label="Browse library">${SHELF_TABS.filter(([id])=>!collection||!["lateral","corpus"].includes(id)).map(([id,label])=>`<button type="button" data-shelf-kind="${id}" class="${state.kind===id?"active":""}" aria-pressed="${state.kind===id}">${label}</button>`).join("")}</div>`}<div class="library-tools"><label class="library-search"><input type="search" data-shelf-input="query" aria-label="Find on this shelf" placeholder="Find a title or author…" value="${esc(state.query)}"></label><label class="library-sort"><span>Sort</span><select data-shelf-input="sort" aria-label="Sort library">${options(collection?[["collection","Collection order"],...SHELF_SORTS]:SHELF_SORTS,state.sort)}</select></label><button type="button" class="library-filter-toggle ${filterCount?"active":""}" data-shelf-filters aria-expanded="${state.filtersOpen}" aria-controls="shelf-filters">Filters${filterCount?` · ${filterCount}`:""}</button><button type="button" class="library-archive" data-open-archive title="Open archived books"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3h14v4H3zM4 7v10h12V7M8 10h4"/></svg><span>Archive</span></button></div></div><div class="library-filters" id="shelf-filters" ${state.filtersOpen?"":"hidden"}><label>Author<select data-shelf-input="author">${options([["","All authors"],...authors.map(author=>[author,author])],state.author)}</select></label><label>Language<select data-shelf-input="language">${options([["","All languages"],...languages],state.language)}</select></label><label>Available reading<select data-shelf-input="layer">${options([["","Any reading"],["source","Source text"],["CH","Chapter · CH"],["CL","Cluster · CL"],["MC","Macro · MC"],["WB","Whole book · WB"],["unprocessed","Awaiting CARE"]],state.layer)}</select></label><label>Publication period<select data-shelf-input="era">${options([["","All periods"],["before1800","Before 1800"],["1800","1800–1899"],["1900","1900–1999"],["2000","2000 onwards"],["undated","Undated"]],state.era)}</select></label></div></div><div class="library-summary" data-shelf-summary role="status" aria-live="polite">${result.summary}</div><div class="library-grid" data-shelf-grid>${result.cards}</div></div>`
}
function centreSelectedReference(root,reference){
  if(!reference?.id)return false
  const card=root.querySelector(`.axiom-button[data-ref-id="${CSS.escape(String(reference.id))}"],.passage[data-ref-id="${CSS.escape(String(reference.id))}"],.route-source-card[data-ref-id="${CSS.escape(String(reference.id))}"]`)
  const pane=card?.closest("[data-pane]"),body=card?.closest(".window-body"),strip=root.querySelector("[data-strip]")
  if(!card||!pane||!body||!strip)return false
  const section=card.closest("details");if(section)section.open=true
  // Centre within the real content bounds. Extra end padding would leave a
  // half-screen of blank space when visiting the first or last pane.
  const sections=body.querySelector(".care-sections");if(sections)sections.style.paddingBottom=`${body.clientHeight/2}px`
  const paneRect=pane.getBoundingClientRect(),stripRect=strip.getBoundingClientRect()
  strip.scrollLeft+=paneRect.left+paneRect.width/2-stripRect.left-strip.clientWidth/2
  const text=card.querySelector(".axiom-text")||card.querySelector(".passage-text")||card,rect=text.getBoundingClientRect(),bodyRect=body.getBoundingClientRect()
  body.scrollTop+=rect.top+Math.min(rect.height,body.clientHeight*.8)/2-bodyRect.top-body.clientHeight/2
  return pane.dataset.pane
}
function drawRouteThreads(runtime){
  const root=runtime.root,reference=runtime.data?.reference,strip=root.querySelector("[data-strip]")
  let svg=root.querySelector("[data-route-threads]")
  if(!isRouteReference(reference)||!strip){svg?.remove();return}
  if(!svg){svg=root.ownerDocument.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("class","route-threads");svg.setAttribute("data-route-threads","");svg.setAttribute("aria-hidden","true");root.append(svg)}
  const bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect(),cards=new Map()
  root.querySelectorAll(".route-card[data-ref-id],.route-source-card[data-ref-id],.axiom-button[data-ref-id]").forEach(card=>{if(!card.closest("[data-connection-book],[data-connection-field]"))cards.set(card.dataset.refId,card)})
  const geometry=new Map(),edgeSlots=new Map()
  cards.forEach((card,id)=>{
    const rect=card.getBoundingClientRect(),body=card.closest(".window-body")?.getBoundingClientRect()
    if(!body||rect.width<=0||rect.height<=0||rect.right<=clip.left||rect.left>=clip.right)return
    const middle=rect.top+rect.height/2,offscreen=rect.bottom<=body.top+8?"above":rect.top>=body.bottom-8?"below":""
    let y=Math.max(body.top+10,Math.min(body.bottom-10,middle))
    if(offscreen){const key=`${body.left}|${offscreen}`,slot=edgeSlots.get(key)||0;edgeSlots.set(key,slot+1);const spread=Math.min(slot*6,Math.max(0,(body.bottom-body.top-20)/3));y=offscreen==="above"?body.top+8+spread:body.bottom-8-spread}
    geometry.set(id,{rect,body,y,offscreen,pane:card.closest("[data-pane]")})
  })
  const paths=exactRouteEdges(reference).map((edge,index)=>{
    const from=geometry.get(String(edge.source_id)),to=geometry.get(String(edge.target_id))
    if(!from||!to||(from.offscreen&&to.offscreen))return ""
    const samePane=from.pane===to.pane,a=from.rect,b=to.rect,forward=a.left<b.left
    const x1=(samePane?a.left+2:forward?a.right-3:a.left+3)-bounds.left,x2=(samePane?b.left+2:forward?b.left+3:b.right-3)-bounds.left
    const y1=from.y-bounds.top,y2=to.y-bounds.top,bend=Math.max(18,Math.abs(x2-x1)*.52),sign=forward?1:-1
    const color=layerColor(edge.source_layer,edge.source_id),targetColor=layerColor(edge.target_layer,edge.target_id),active=[String(edge.source_id),String(edge.target_id)].includes(runtime.hoverReference)
    return `<defs><linearGradient id="route-thread-${index}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop stop-color="${color}"/><stop offset="1" stop-color="${targetColor}"/></linearGradient></defs><path class="route-thread ${active?"active":""}" data-route-source="${esc(edge.source_id)}" data-route-target="${esc(edge.target_id)}" stroke="url(#route-thread-${index})" d="M ${x1} ${y1} C ${samePane?x1-15:x1+bend*sign} ${y1},${samePane?x2-15:x2-bend*sign} ${y2},${x2} ${y2}"/><circle class="route-port" cx="${x1}" cy="${y1}" r="${active?3.2:2.3}" stroke="${color}"/>${from.offscreen?`<path class="route-edge-continuation" stroke="${color}" d="M ${x1-2.5} ${y1+(from.offscreen==="above"?-4:4)} l 2.5 ${from.offscreen==="above"?-2.5:2.5} l 2.5 ${from.offscreen==="above"?2.5:-2.5}"/>`:""}<circle class="route-port" cx="${x2}" cy="${y2}" r="${active?3.2:2.3}" stroke="${targetColor}"/>`
  }).join("")
  svg.setAttribute("viewBox",`0 0 ${bounds.width} ${bounds.height}`);svg.innerHTML=paths
}
function connectionThreadGeometry(a,b,ab,bb,bounds,clip){
  if(!ab||!bb||!a.width||!b.width||!ab.height||!bb.height)return null
  const visible=rect=>rect.right>clip.left&&rect.left<clip.right,sourceVisible=visible(a),targetVisible=visible(b)
  if(!sourceVisible&&!targetVisible)return null
  const forward=a.left<b.left,clampX=x=>Math.max(clip.left+2,Math.min(clip.right-2,x))-bounds.left
  const x1=clampX(forward?a.right-3:a.left+3),x2=clampX(forward?b.left+3:b.right-3)
  const y1=Math.max(ab.top+12,Math.min(ab.bottom-12,a.top+a.height/2))-bounds.top,y2=Math.max(bb.top+12,Math.min(bb.bottom-12,b.top+b.height/2))-bounds.top
  return {x1,x2,y1,y2,bend:Math.max(18,Math.abs(x2-x1)*.52)*(forward?1:-1),sourceVisible,targetVisible}
}
function drawConnectionThreads(runtime){
  const root=runtime.root,connection=runtime.data?.connection,strip=root.querySelector("[data-strip]")
  let svg=root.querySelector("[data-connection-threads]")
  const groups=[{reference:connection?.reference,kind:"field"},...arr(connection?.other_stacks).filter(stack=>stack.reference).map(stack=>({reference:stack.reference,kind:"book",workId:String(stack.work?.id||"")}))]
  if(!strip||!groups.some(group=>group.reference)){svg?.remove();return}
  if(!svg){svg=root.ownerDocument.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("class","route-threads");svg.setAttribute("data-connection-threads","");svg.setAttribute("aria-hidden","true");root.append(svg)}
  const bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect()
  const paths=groups.flatMap(group=>{
    const cards=new Map()
    root.querySelectorAll("[data-connection-field] [data-ref-id],[data-connection-book] [data-ref-id]").forEach(card=>{const pane=card.closest("[data-connection-field],[data-connection-book]");if(group.kind==="book"&&pane.dataset.connectionBook!==group.workId||group.kind==="field"&&!pane.dataset.connectionField)return;cards.set(`${group.kind==="field"?(card.closest("[data-connection-source-pane]")?.dataset.connectionSourcePane||pane.dataset.connectionField):""}|${card.dataset.refId}`,card)})
    return exactRouteEdges(group.reference).map(edge=>{
      const source=cards.get(`${group.kind==="field"?edge.source_pane||"":""}|${edge.source_id}`),target=cards.get(`${group.kind==="field"?edge.target_pane||"":""}|${edge.target_id}`)
      if(!source||!target)return ""
      const endpoint=card=>{const pane=card.closest("[data-pane]"),folded=pane?.classList.contains("care-pane-minimized");return {rect:folded?pane.getBoundingClientRect():card.getBoundingClientRect(),body:folded?pane.getBoundingClientRect():card.closest(".window-body")?.getBoundingClientRect()}}
      const from=endpoint(source),to=endpoint(target),a=from.rect,b=to.rect,ab=from.body,bb=to.body
      const geometry=connectionThreadGeometry(a,b,ab,bb,bounds,clip);if(!geometry)return ""
      const {x1,x2,y1,y2,bend,sourceVisible,targetVisible}=geometry,color=layerColor(edge.source_layer,edge.source_id)
      const port=(x,y,visible,layer,identity)=>visible?`<circle class="route-port" cx="${x}" cy="${y}" r="2.3" stroke="${layerColor(layer,identity)}"/>`:`<path class="route-thread" stroke="${layerColor(layer,identity)}" d="M ${x+(x<bounds.width/2?5:-5)} ${y-4} L ${x} ${y} L ${x+(x<bounds.width/2?5:-5)} ${y+4}"/>`
      return `<g><title>${esc(edge.source_id)} → ${esc(edge.target_id)}${!sourceVisible||!targetVisible?" · continue along the panes":""}</title><path class="route-thread" ${edge.collapsed||arr(edge.via).length?'stroke-dasharray="5 4"':""} stroke="${color}" d="M ${x1} ${y1} C ${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}"/>${port(x1,y1,sourceVisible,edge.source_layer,edge.source_id)}${port(x2,y2,targetVisible,edge.target_layer,edge.target_id)}</g>`

    })
  }).join("")
  svg.setAttribute("viewBox",`0 0 ${bounds.width} ${bounds.height}`);svg.innerHTML=paths
}
function connectionViewportKey(connection){
  if(!connection?.id)return ""
  const reference=connection.reference||{}
  return JSON.stringify([connection.id,reference.id||"",reference.source_pane||"",connection.resolution||{},connection.hide_xa])
}
function centreConnectionPane(runtime,pane){
  const strip=runtime.root.querySelector("[data-strip]")
  if(!pane||!strip)return false
  const rect=pane.getBoundingClientRect(),bounds=strip.getBoundingClientRect(),desired=strip.scrollLeft+(rect.left+rect.width/2-bounds.left)/readerLayoutScale(strip,bounds)-strip.clientWidth/2
  const maximum=Number.isFinite(strip.scrollWidth)?Math.max(0,strip.scrollWidth-strip.clientWidth):Infinity
  strip.scrollLeft=Math.max(0,Math.min(maximum,desired))
  runtime.focused=pane.dataset.pane
  return true
}
function centreConnectionReference(runtime){
  const root=runtime.root,reference=runtime.data?.connection?.reference
  if(!reference?.id)return false
  const pane=root.querySelector(`[data-connection-field="${CSS.escape(reference.source_pane||runtime.data.connection.pane_id||"")}"]`),card=pane?.querySelector(`[data-ref-id="${CSS.escape(reference.id)}"]`),body=card?.closest(".window-body"),strip=root.querySelector("[data-strip]")
  if(!card||!body||!strip)return false
  const section=card.closest("details");if(section)section.open=true
  card.classList.add("selected")
  // Centre once on each axis. A smooth strip movement followed by
  // scrollIntoView let the browser race two different horizontal destinations.
  centreConnectionPane(runtime,pane)
  const text=card.querySelector(".axiom-text")||card,rect=text.getBoundingClientRect(),bodyRect=body.getBoundingClientRect()
  body.scrollTop+=rect.top+Math.min(rect.height,body.clientHeight*.8)/2-bodyRect.top-body.clientHeight/2
  runtime.focused=pane.dataset.pane
  return true
}
function setupConnectionReader(runtime){
  const root=runtime.root
  runtime.connectionAction=action=>runtime.api?.setTriggerValue("connection_action",action)
  runtime.connectionSelection=new Map()
  runtime.paintConnectionTabs=()=>{const tabs=root.querySelector(".connection-tab-rail .desk-tabs");if(!tabs)return;const before=root.querySelector('[data-connection-tabs-scroll="-1"]'),after=root.querySelector('[data-connection-tabs-scroll="1"]');if(before)before.disabled=tabs.scrollLeft<=1;if(after)after.disabled=tabs.scrollLeft>=tabs.scrollWidth-tabs.clientWidth-1}
  runtime.onConnectionTabsScroll=event=>{if(event.target?.matches?.(".connection-tab-rail .desk-tabs"))runtime.paintConnectionTabs()}
  runtime.connectionStack=input=>{const workId=input?.closest?.("[data-connection-book]")?.dataset?.connectionBook;return workId?arr(runtime.data?.connection?.other_stacks).find(stack=>String(stack.work?.id)===workId):null}
  const inBookContext=(input,callback)=>{const stack=runtime.connectionStack(input);if(!stack)return callback();const saved=runtime.data,api=runtime.api;runtime.data={...saved,stack,reference:stack.reference||null};runtime.api={...api,setTriggerValue:(kind,value)=>{if(["open_chapter","open_sheet"].includes(kind))api?.setTriggerValue("connection_action",{action:kind==="open_chapter"?"chapter":"sheet",work_id:String(stack.work?.id),id:String(value)});else if(kind==="set_route_mode")api?.setTriggerValue("connection_action",{action:"set_book_route_mode",work_id:String(stack.work?.id),mode:value});else api?.setTriggerValue(kind,value)}};try{return callback()}finally{runtime.data=saved;runtime.api=api}}
  for(const key of ["paintSlider","chooseSlider"]){const original=runtime[key];runtime[key]=(input,...args)=>inBookContext(input,()=>original(input,...args))}
  for(const key of ["onSliderInput","onSliderKey","onSliderClick","onRouteDirectionInput","onRouteDirectionChange","onSectionsClick"]){const original=runtime[key];runtime[key]=event=>inBookContext(event.target,()=>original(event))}
  runtime.paintConnectionSelection=()=>root.querySelectorAll("[data-connection-field],[data-connection-book]").forEach(pane=>{
    const server=runtime.data?.connection?.selection,selection=runtime.connectionSelection.get(pane.dataset.pane)||server
    pane.querySelectorAll("[data-select-axiom],[data-select-passage]").forEach(button=>{
      const source=button.closest("[data-connection-source-pane]")?.dataset.connectionSourcePane||pane.dataset.connectionField,scope=selection&&(selection.pane_id?selection.pane_id===source:selection.work_id===pane.dataset.connectionBook),active=Boolean(scope&&(button.dataset.selectAxiom||button.dataset.selectPassage)===selection.reference_id)||button.dataset.connectionSelected==="true"
      button.classList.toggle("axiom-selected",active);button.setAttribute("aria-pressed",String(active));const route=button.parentElement.querySelector("[data-open-axiom-routes],[data-open-passage-routes]");if(route)route.hidden=!active
    })
  })
  const select=button=>{
    const pane=button.closest("[data-connection-field],[data-connection-book]"),id=button.dataset.selectAxiom||button.dataset.selectPassage,selection={pane_id:button.closest("[data-connection-source-pane]")?.dataset.connectionSourcePane||pane.dataset.connectionField||"",work_id:pane.dataset.connectionBook||"",reference_id:id}
    runtime.connectionSelection.set(pane.dataset.pane,selection);runtime.paintConnectionSelection();button.focus({preventScroll:true})
    // The exact saved rows are already registered with the viewer. Inspection
    // remains entirely local; only an explicit Routes action rebuilds a graph.
    // A scoped acknowledgement prevents accidentally using a newer edition
    // with the same CARE ID. Fall back if the viewer has not mounted yet.
    const view=root.ownerDocument.defaultView,scope=selection.pane_id||(selection.work_id?`work:${selection.work_id}`:"")
    if(view?.CustomEvent){const event=new view.CustomEvent("care-reference-select",{cancelable:true,detail:{kind:button.dataset.selectPassage||pane.dataset.layer==="SOURCE"?"passage":"axiom",id,scope,open:false}});view.dispatchEvent(event);if(event.defaultPrevented)return}
    runtime.connectionAction({action:"select_axiom",...selection})
  }
  runtime.chooseConnectionLayer=(input,value)=>{
    const pane=input.closest("[data-pane]"),control=input.closest("[data-connection-layer-control]"),stops=[...control.querySelectorAll("[data-connection-layer-stop]")],index=Math.max(0,Math.min(stops.length-1,Number(value)||0)),stop=stops[index],source=stop.dataset.connectionLayerReading
    input.value=String(index);input.setAttribute("aria-valuetext",stop.dataset.connectionLayerLabel)
    control.querySelector("[data-connection-layer-title]").textContent=stop.dataset.connectionLayerLabel
    control.querySelector("[data-connection-layer-count]").textContent=index?`${index} / ${stops.length-1}`:`${stops.length-1} readings`
    stops.forEach((button,position)=>button.classList.toggle("active",position===index))
    pane.querySelectorAll("[data-connection-reading]").forEach(section=>{section.hidden=Boolean(source&&section.dataset.connectionReading!==source);if(!section.hidden)section.open=true})
    runtime.connectionLayerSelection=runtime.connectionLayerSelection||new Map();runtime.connectionLayerSelection.set(pane.dataset.pane,source)
    const body=pane.querySelector(".window-body");if(body)body.scrollTop=0
    runtime.queueThreads()
  }
  runtime.restoreConnectionLayers=()=>root.querySelectorAll("[data-connection-layer-slider]").forEach(input=>{const pane=input.closest("[data-pane]"),saved=runtime.connectionLayerSelection?.get(pane.dataset.pane);if(!saved)return;const stops=[...pane.querySelectorAll("[data-connection-layer-stop]")],index=stops.findIndex(stop=>stop.dataset.connectionLayerReading===saved);if(index>=0)runtime.chooseConnectionLayer(input,index)})
  const layerInput=runtime.onSliderInput;runtime.onSliderInput=event=>{const input=event.target.closest?.("[data-connection-layer-slider]");if(input){runtime.chooseConnectionLayer(input,input.value);return true}return layerInput(event)}
  runtime.onConnectionClick=event=>{
    const target=event.target
    const layerStop=target.closest?.("[data-connection-layer-stop]")
    if(layerStop){runtime.chooseConnectionLayer(layerStop.closest("[data-connection-layer-control]").querySelector("[data-connection-layer-slider]"),layerStop.dataset.connectionLayerStop);return true}
    const tabArrow=target.closest?.("[data-connection-tabs-scroll]")
    if(tabArrow){const tabs=root.querySelector(".connection-tab-rail .desk-tabs");tabs?.scrollBy({left:Number(tabArrow.dataset.connectionTabsScroll)*Math.max(120,tabs.clientWidth*.7),behavior:"smooth"});return true}
    const paneTab=target.closest?.("[data-pane-target]")
    if(paneTab?.dataset.paneTarget?.startsWith("connection:")){const pane=root.querySelector(`[data-pane="${CSS.escape(paneTab.dataset.paneTarget)}"]`);if(centreConnectionPane(runtime,pane))runtime.paintFocus();return true}
    if(target.closest?.("[data-connection-close]")){runtime.connectionAction({action:"close"});return true}
    if(target.closest?.("[data-connection-clear]")){runtime.connectionAction({action:"clear_reference"});return true}
    const pane=target.closest?.("[data-connection-field],[data-connection-book]");if(!pane)return false
    const workId=pane.dataset.connectionBook,paneId=target.closest("[data-connection-source-pane]")?.dataset.connectionSourcePane||pane.dataset.connectionField
    if(target.closest("[data-sheet-sections]"))return false
    if(target.closest("[data-clear-reference]")){runtime.connectionAction(workId?{action:"clear_book_reference",work_id:workId}:{action:"clear_reference"});return true}
    if(target.closest("[data-route-direction-control]"))return true
    const selection=target.closest("[data-select-axiom],[data-select-passage]")
    if(selection){select(selection);return true}
    const button=target.closest("[data-open-axiom-routes],[data-open-passage-routes],[data-ref-id]")
    if(button?.dataset.connectionWholeSheet==="true")return true
    if(button&&!button.disabled&&!button.hidden){const id=button.dataset.openAxiomRoutes||button.dataset.openPassageRoutes||button.dataset.refId;runtime.connectionAction(workId?{action:"book_reference",work_id:workId,reference_id:id}:{action:"reference",pane_id:paneId,reference_id:id});return true}
    return false
  }
  const onClick=runtime.onClick;runtime.onClick=event=>{if(runtime.onConnectionClick(event))return;return onClick(event)}
  const onWheel=runtime.onWheel;runtime.onWheel=event=>{const tabs=event.target?.closest?.(".connection-tab-rail .desk-tabs");if(tabs&&tabs.scrollWidth>tabs.clientWidth+1&&!event.ctrlKey&&!event.metaKey){const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY,unit=event.deltaMode===1?16:event.deltaMode===2?tabs.clientWidth:1;tabs.scrollLeft=Math.max(0,Math.min(tabs.scrollWidth-tabs.clientWidth,tabs.scrollLeft+delta*unit));event.preventDefault();event.stopPropagation();runtime.paintConnectionTabs();return}return onWheel(event)}
  const onKey=runtime.onKey;runtime.onKey=event=>{
    const pane=event.target?.closest?.("[data-connection-field],[data-connection-book]")
    if(!pane)return onKey(event)
    if(event.target.closest?.("[data-connection-layer-slider]"))return
    const button=event.target.closest("[data-select-axiom],[data-select-passage]")
    if(button&&["ArrowUp","ArrowDown","Home","End"].includes(event.key)){const buttons=runtime.visibleAxioms(pane),index=buttons.indexOf(button),next=event.key==="Home"?0:event.key==="End"?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==="ArrowDown"?1:-1)));if(buttons[next]){event.preventDefault();select(buttons[next]);buttons[next].scrollIntoView({block:"nearest",inline:"nearest"})}return}
    if(["Enter"," "].includes(event.key)&&event.target.closest("[data-ref-id],[data-open-axiom-routes],[data-open-passage-routes],[data-clear-reference]")){event.preventDefault();runtime.onConnectionClick(event);return}
    if(runtime.onSliderKey(event))return
    if(["[","]"].includes(event.key)){event.preventDefault();runtime.step(event.key==="["?-1:1)}
  }
  runtime.onConnectionChange=event=>{const select=event.target?.closest?.("[data-connection-choice]");if(select?.value)runtime.connectionAction({action:"open",id:select.value})}
  const paintSelection=runtime.paintSelection;runtime.paintSelection=()=>{paintSelection();runtime.paintConnectionSelection()}
}
function setup(root){
  let savedTextScale=1
  try{savedTextScale=Number(root.ownerDocument.defaultView?.sessionStorage?.getItem(TEXT_SCALE_KEY)??1)}catch(_){}
  let savedSkin="care"
  try{
    const storage=root.ownerDocument.defaultView?.sessionStorage
    savedSkin=String(storage?.getItem(SKIN_KEY)||"")
    if(!savedSkin){const legacy=String(storage?.getItem(LEGACY_SKIN_KEY)||"");savedSkin=["library","classic"].includes(legacy)?legacy:"care"}
  }catch(_){}
  if(!["care","library","classic"].includes(savedSkin))savedSkin="care"
  const runtime={root,api:null,data:null,signature:"",referenceId:"",scrollTimer:null,loadTimer:null,focused:"source",skin:savedSkin,textScaleIndex:Math.max(0,Math.min(TEXT_SCALES.length-1,Number.isFinite(savedTextScale)?savedTextScale:1))}
  setupBookMenu(runtime)
  // Reading selection stays local when the viewer has the exact card.
  // Server state is a fallback for a viewer that has not loaded the card yet.
  runtime.selectedAxiom=null
  // The desk renders before the viewer during a book switch. Reapply a saved
  // browser selection once the viewer has registered the destination's cards.
  runtime.onViewerReady=()=>{
    if(!runtime.viewerSelectionPending||!root.isConnected)return
    const selection=runtime.selectedAxiom,view=root.ownerDocument.defaultView
    if(!selection||selection.work_id!==runtime.workId||!view?.CustomEvent)return
    if(runtime.isRouting()&&selection.route_root_id!==runtime.referenceId)return
    const event=new view.CustomEvent("care-reference-select",{cancelable:true,detail:{kind:selection.passage_id?"passage":"axiom",id:selection.passage_id||selection.axiom_id,open:false}})
    view.dispatchEvent(event)
    if(event.defaultPrevented)runtime.viewerSelectionPending=false
  }
  runtime.sectionMemory=new Map()
  runtime.sliderScrollPositions=new Map()
  runtime.isRouting=()=>isRouteReference(runtime.data?.reference)
  runtime.visibleAxioms=pane=>[...pane.querySelectorAll("[data-select-axiom],[data-select-passage]")].filter(button=>!button.disabled&&!button.closest("[hidden]")&&(button.closest("details")?button.closest("details").open:Boolean(button.dataset.selectPassage||runtime.isRouting())))
  runtime.paintSelection=()=>{
    if(runtime.isRouting()){
      const selection=runtime.selectedAxiom?.route_root_id===runtime.referenceId?runtime.selectedAxiom:null
      root.querySelectorAll("[data-pane]").forEach(pane=>{
        const buttons=runtime.visibleAxioms(pane),matches=button=>Boolean(selection&&(button.dataset.selectAxiom||button.dataset.selectPassage)===(selection.axiom_id||selection.passage_id)&&(button.dataset.selectionUnit||button.dataset.sourceUnit||pane.dataset.pane)===selection.unit_id),tabStop=buttons.find(matches)||buttons[0]
        pane.querySelectorAll("[data-select-axiom],[data-select-passage]").forEach(button=>{const active=matches(button);button.classList.toggle("axiom-selected",active);button.setAttribute("aria-pressed",String(active));button.tabIndex=button===tabStop?0:-1;const routes=button.parentElement.querySelector("[data-open-axiom-routes],[data-open-passage-routes]");if(routes)routes.hidden=!active})
      })
      return
    }
    root.querySelectorAll("[data-reading-sheet]").forEach(pane=>{
      const visible=runtime.visibleAxioms(pane),selected=visible.find(button=>button.dataset.selectAxiom===runtime.selectedAxiom?.axiom_id&&(button.dataset.selectionUnit||pane.dataset.pane)===runtime.selectedAxiom?.unit_id),tabStop=selected||visible[0]
      pane.querySelectorAll("[data-select-axiom]").forEach(button=>{
        const active=button.dataset.selectAxiom===runtime.selectedAxiom?.axiom_id&&(button.dataset.selectionUnit||pane.dataset.pane)===runtime.selectedAxiom?.unit_id
        button.classList.toggle("axiom-selected",active)
        button.setAttribute("aria-pressed",String(active))
        button.tabIndex=button===tabStop?0:-1
        const routes=button.parentElement.querySelector("[data-open-axiom-routes]")
        if(routes)routes.hidden=!active
      })
    })
    const passages=[...root.querySelectorAll("[data-select-passage]")],selected=passages.find(button=>button.dataset.selectPassage===runtime.selectedAxiom?.passage_id&&button.dataset.sourceUnit===runtime.selectedAxiom?.unit_id)
    const passageTab=passages.filter(button=>!button.closest("[hidden]")).find(button=>button===selected)||passages.find(button=>!button.closest("[hidden]"))
    passages.forEach(button=>{
      const active=button===selected
      button.classList.toggle("selected",active)
      button.setAttribute("aria-pressed",String(active))
      button.tabIndex=button===passageTab?0:-1
      const routes=button.parentElement.querySelector("[data-open-passage-routes]")
      if(routes)routes.hidden=!active
    })
  }
  runtime.selectAxiom=button=>{
    if(!button||button.disabled)return
    const routing=runtime.isRouting()
    const passage=Boolean(button.dataset.selectPassage)
    if(!passage&&(!routing||button.closest("details"))&&!button.closest("details")?.open)return
    const pane=button.closest(passage||routing?"[data-pane]":"[data-reading-sheet]")
    if(!pane)return
    const selection={work_id:String(runtime.data?.stack?.work?.id||""),unit_id:button.dataset.selectionUnit||(passage?button.dataset.sourceUnit:pane.dataset.pane),...(passage?{passage_id:button.dataset.selectPassage}:{axiom_id:button.dataset.selectAxiom}),...(routing?{route_root_id:runtime.referenceId}: {})}
    const changed=JSON.stringify(selection)!==JSON.stringify(runtime.selectedAxiom)
    runtime.selectedAxiom=selection
    runtime.paintSelection()
    button.focus({preventScroll:true})
    const view=root.ownerDocument.defaultView
    if(view?.CustomEvent){
      const event=new view.CustomEvent("care-reference-select",{cancelable:true,detail:{kind:passage?"passage":"axiom",id:selection.passage_id||selection.axiom_id,open:false}})
      view.dispatchEvent(event)
      if(event.defaultPrevented){runtime.viewerSelectionPending=false;return}
    }
    if(changed)runtime.api?.setStateValue("selected_axiom",selection)
  }
  runtime.onSelectionKey=event=>{
    const button=event.target?.closest?.("[data-select-axiom],[data-select-passage]")
    if(!button||button.disabled)return false
    if(["Enter"," "].includes(event.key)){event.preventDefault();runtime.selectAxiom(button);return true}
    if(!["ArrowUp","ArrowDown","Home","End"].includes(event.key))return false
    const pane=button.closest(button.dataset.selectPassage||runtime.isRouting()?"[data-pane]":"[data-reading-sheet]"),buttons=runtime.visibleAxioms(pane),index=buttons.indexOf(button)
    if(index<0)return false
    event.preventDefault()
    const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==="ArrowDown"?1:-1)))
    runtime.selectAxiom(buttons[next])
    buttons[next].scrollIntoView({block:"nearest",inline:"nearest",behavior:"auto"})
    return true
  }
  runtime.rememberSections=pane=>runtime.sectionMemory.set(pane.dataset.pane,[...pane.querySelectorAll(".care-section")].map(section=>section.open))
  runtime.onSectionsClick=event=>{
    if(runtime.isRouting())return false
    const button=event.target?.closest?.("[data-sheet-sections]"),pane=button?.closest("[data-reading-sheet]")
    if(!pane)return false
    button.focus({preventScroll:true})
    pane.querySelectorAll(".care-section").forEach(section=>{section.open=button.dataset.sheetSections==="expand"})
    runtime.rememberSections(pane);runtime.paintSelection()
    return true
  }
  runtime.onSectionToggle=event=>{
    if(root.dataset.view==="outline"){runtime.captureOutline?.();runtime.paintSelection();return}
    if(runtime.isRouting())return
    const section=event.target,pane=section?.closest?.("[data-reading-sheet]")
    if(!pane||!section.matches(".care-section"))return
    // Never move focus from a collapse control, an editor, or another section.
    if(!section.open&&section.querySelector(":focus"))section.querySelector("summary")?.focus({preventScroll:true})
    runtime.rememberSections(pane);runtime.paintSelection()
  }
  runtime.shelf=shelfDefaults()
  // Reading destinations start fresh; only the sort order is a preference.
  try{const saved=JSON.parse(root.ownerDocument.defaultView?.sessionStorage?.getItem(SHELF_STATE_KEY)||"{}");if(SHELF_SORTS.some(([id])=>id===saved.sort))runtime.shelf.sort=saved.sort}catch(_){}
  runtime.syncShelf=data=>{
    const signature=JSON.stringify([shelfScope(data),data?.shelf_request||""])
    if(runtime.shelfSignature===signature)return false
    runtime.shelfSignature=signature
    const sort=SHELF_SORTS.some(([id])=>id===runtime.shelf.sort)?runtime.shelf.sort:"title"
    runtime.shelf={...shelfDefaults(shelfScope(data)),sort}
    return true
  }
  runtime.saveShelf=()=>{try{root.ownerDocument.defaultView?.sessionStorage?.setItem(SHELF_STATE_KEY,JSON.stringify(runtime.shelf))}catch(_){}}
  runtime.paintShelf=(full=false)=>{
    runtime.closeBookMenu()
    runtime.saveShelf()
    if(full){root.innerHTML=library(runtime.data,runtime.shelf);runtime.applySkin();return}
    const result=shelfResults(runtime.data,runtime.shelf),grid=root.querySelector("[data-shelf-grid]"),summary=root.querySelector("[data-shelf-summary]")
    if(grid)grid.innerHTML=result.cards
    if(summary)summary.innerHTML=result.summary
    root.querySelectorAll("[data-shelf-kind]").forEach(button=>{const active=button.dataset.shelfKind===runtime.shelf.kind;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))})
    const filterCount=[runtime.shelf.author,runtime.shelf.language,runtime.shelf.layer,runtime.shelf.era].filter(Boolean).length,toggle=root.querySelector("[data-shelf-filters]")
    if(toggle){toggle.textContent=`Filters${filterCount?` · ${filterCount}`:""}`;toggle.classList.toggle("active",filterCount>0);toggle.setAttribute("aria-expanded",String(runtime.shelf.filtersOpen))}
    const filters=root.querySelector(".library-filters");if(filters)filters.hidden=!runtime.shelf.filtersOpen
  }
  runtime.onShelfInput=event=>{const input=event.target.closest?.("[data-shelf-input]");if(!input||!["query","sort","author","language","layer","era"].includes(input.dataset.shelfInput))return;runtime.shelf[input.dataset.shelfInput]=input.value;runtime.paintShelf()}
  runtime.listen=(node,event,handler,options)=>{node.addEventListener(event,handler,options)}
  runtime.onRouteDirectionInput=event=>{
    const input=event.target?.closest?.("[data-route-direction]")
    if(!input||!routeCanMove(runtime.data?.reference))return
    const mode=ROUTE_MODES[sliderIndex(input.value,3)],control=input.closest("[data-route-direction-control]")
    input.setAttribute("aria-valuetext",routeModeLabel(mode))
    // The dot responds during dragging; commit the exact graph on release.
    const preview=routeArrival(runtime.data.reference,mode),svg=control?.querySelector("svg")
    if(svg)svg.outerHTML=preview.match(/<svg[\s\S]*?<\/svg>/)?.[0]||svg.outerHTML
  }
  runtime.onRouteDirectionChange=event=>{
    const input=event.target?.closest?.("[data-route-direction]")
    if(!input||!routeCanMove(runtime.data?.reference))return
    const mode=ROUTE_MODES[sliderIndex(input.value,3)]
    if(mode!==routeMode(runtime.data.reference))runtime.api?.setTriggerValue("set_route_mode",mode)
  }
  runtime.onClick=event=>{
    if(runtime.onBookMenuClick(event))return
    if(event.target?.closest?.("[data-route-direction-control]"))return
    if(runtime.onSectionsClick(event))return
    const select=event.target.closest("[data-select-axiom],[data-select-passage]")
    if(select){runtime.selectAxiom(select);return}
    const routes=event.target.closest("[data-open-axiom-routes],[data-open-passage-routes]")
    if(routes&&!routes.hidden){runtime.api?.setTriggerValue("open_reference",routes.dataset.openPassageRoutes||routes.dataset.openAxiomRoutes);return}
    if(runtime.onSliderClick?.(event))return
    const collection=event.target.closest("[data-open-collection]");if(collection){runtime.shelf={...shelfDefaults(),kind:"all",collection:collection.dataset.openCollection,sort:"collection"};runtime.paintShelf(true);root.querySelector(".library-back")?.focus();return}
    const closeCollection=event.target.closest("[data-close-collection]");if(closeCollection){const previous=runtime.shelf.collection;runtime.shelf={...shelfDefaults()};runtime.paintShelf(true);root.querySelector(`[data-open-collection="${CSS.escape(previous)}"]`)?.focus();return}
    const kind=event.target.closest("[data-shelf-kind]");if(kind){runtime.shelf.kind=kind.dataset.shelfKind;runtime.paintShelf();return}
    const archive=event.target.closest("[data-open-archive]");if(archive){runtime.api?.setTriggerValue("open_archive",true);return}
    const filters=event.target.closest("[data-shelf-filters]");if(filters){runtime.shelf.filtersOpen=!runtime.shelf.filtersOpen;runtime.paintShelf();return}
    const reset=event.target.closest("[data-shelf-reset]");if(reset){runtime.shelf={...shelfDefaults(shelfScope(runtime.data)),kind:runtime.shelf.kind,sort:runtime.shelf.sort,collection:runtime.shelf.collection,filtersOpen:runtime.shelf.filtersOpen};runtime.paintShelf(true);root.querySelector("[data-shelf-input='query']")?.focus();return}
    const field=event.target.closest("[data-open-field]");if(field){runtime.api?.setTriggerValue("open_field",String(field.dataset.openField));return}
    const work=event.target.closest("[data-open-work]");if(work){runtime.api?.setTriggerValue("open_work",work.dataset.openWork);return}
    const chapter=event.target.closest("[data-chapter-id]");if(chapter){runtime.api?.setTriggerValue("open_chapter",chapter.dataset.chapterId);return}
    const routeHistory=event.target.closest("[data-route-history]");if(routeHistory){const direction=Number(routeHistory.dataset.routeHistory);if(!routeHistory.disabled&&[-1,1].includes(direction))runtime.api?.setTriggerValue("navigate_route",direction);return}
    const clear=event.target.closest("[data-clear-reference]");if(clear){runtime.api?.setTriggerValue("clear_reference",true);return}
    const reference=event.target.closest("[data-ref-id]");if(reference&&!reference.disabled){const id=String(reference.dataset.refId||"");if(id&&id===runtime.referenceId)runtime.api?.setTriggerValue("clear_reference",true);else runtime.api?.setTriggerValue("open_reference",id);return}
    const rate=event.target.closest("[data-rate]");if(rate){runtime.api?.setTriggerValue("rate",{id:rate.dataset.rateId,score:Number(rate.dataset.rate)});return}
    const skin=event.target.closest("[data-skin-value]");if(skin){runtime.skin=["care","library","classic"].includes(skin.dataset.skinValue)?skin.dataset.skinValue:"care";try{root.ownerDocument.defaultView?.sessionStorage?.setItem(SKIN_KEY,runtime.skin)}catch(_){};runtime.applySkin();return}
    const textSize=event.target.closest("[data-text-size]");if(textSize){runtime.textScaleIndex=Math.max(0,Math.min(TEXT_SCALES.length-1,runtime.textScaleIndex+Number(textSize.dataset.textSize||0)));try{root.ownerDocument.defaultView?.sessionStorage?.setItem(TEXT_SCALE_KEY,String(runtime.textScaleIndex))}catch(_){};runtime.applyTextScale();return}
    const pane=event.target.closest("[data-pane-target]");if(pane){runtime.focus(pane.dataset.paneTarget);return}
    const step=event.target.closest("[data-step]");if(step){runtime.step(Number(step.dataset.step));return}
  }
  runtime.paintSlider=(input,position)=>{
    const options=sliderOptions(runtime.data?.stack,input.dataset.sheetSlider),index=sliderIndex(position,options.length),option=options[index]
    if(!option)return
    const title=sliderTitle(option),control=input.closest?.("[data-slider-control]")
    input.value=String(sliderPosition(position,options.length))
    input.setAttribute?.("aria-valuetext",`${title} · ${index+1} of ${options.length}`)
    if(control){
      const heading=control.querySelector("[data-slider-title]"),count=control.querySelector("[data-slider-count]")
      if(heading){heading.textContent=title;heading.title=title}
      if(count)count.textContent=`${index+1} / ${options.length}`
      // Long books have over a thousand stops. A drag changes only two dots;
      // rewriting every stop on every pointer event stalls the reading line.
      const previous=control.querySelector("[data-slider-stop].active"),next=control.querySelector(`[data-slider-stop="${index}"]`)
      if(previous!==next){
        if(previous){previous.classList.toggle("active",false);previous.setAttribute("aria-pressed","false");previous.tabIndex=-1}
        if(next){next.classList.toggle("active",true);next.setAttribute("aria-pressed","true");next.tabIndex=0}
      }
    }
    paintSliderHeading(input,option,index)
    keepSliderVisible(input)
  }
  runtime.chooseSlider=(input,position)=>{
    if(!input||input.disabled||runtime.isRouting())return
    const layer=input.dataset.sheetSlider,options=sliderOptions(runtime.data?.stack,layer),index=sliderIndex(position,options.length),option=options[index]
    if(!option)return
    runtime.paintSlider(input,index)
    const active=layer==="SOURCE"?runtime.data?.stack?.active_raw_unit_id:arr(runtime.data?.stack?.care_path).find(unit=>sheetLayerKey(unit)===layer||unit.type===layer)?.id
    if(String(option.id)===String(active))return
    const destination=`${layer}:${option.id}`
    if(runtime.pendingSlider===destination)return
    runtime.pendingSlider=destination
    runtime.pendingLayer=layer
    root.setAttribute("aria-busy","true")
    runtime.api?.setTriggerValue(layer==="SOURCE"?"open_chapter":"open_sheet",String(option.id))
  }
  runtime.onSliderInput=event=>{
    const input=event.target.closest?.("[data-sheet-slider]")
    if(!input||input.disabled||runtime.isRouting())return
    const options=sliderOptions(runtime.data?.stack,input.dataset.sheetSlider)
    runtime.paintSlider(input,sliderMagneticPosition(input.value,options.length))
  }
  runtime.onSliderChange=event=>{
    const input=event.target.closest?.("[data-sheet-slider]")
    if(input)runtime.chooseSlider(input,input.value)
  }
  runtime.onSliderClick=event=>{
    const stop=event.target.closest?.("[data-slider-stop]")
    if(!stop)return false
    const input=stop.closest("[data-slider-control]")?.querySelector("[data-sheet-slider]")
    if(!input||runtime.isRouting())return true
    input.focus({preventScroll:true})
    runtime.chooseSlider(input,stop.dataset.sliderStop)
    return true
  }
  runtime.onSliderKey=event=>{
    if(event.metaKey||event.ctrlKey||event.altKey)return false
    const stop=event.target.closest?.("[data-slider-stop]"),input=event.target.closest?.("[data-sheet-slider]")||stop?.closest("[data-slider-control]")?.querySelector("[data-sheet-slider]")
    if(!input)return false
    const options=sliderOptions(runtime.data?.stack,input.dataset.sheetSlider),moves={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-10,PageUp:10}
    let position
    if(event.key in moves)position=sliderIndex(input.value,options.length)+moves[event.key]
    else if(event.key==="Home"||event.key==="End")position=event.key==="Home"?0:options.length-1
    else return false
    event.preventDefault()
    if(stop)input.focus({preventScroll:true})
    runtime.chooseSlider(input,position)
    return true
  }
  runtime.onSliderWheel=event=>{
    if(event.ctrlKey||event.metaKey)return false
    const track=event.target.closest?.("[data-slider-track]")
    if(!track||track.scrollWidth<=track.clientWidth+2||(!event.shiftKey&&Math.abs(event.deltaX)<=Math.abs(event.deltaY)))return false
    const delta=event.shiftKey&&Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX,unit=event.deltaMode===1?16:event.deltaMode===2?track.clientWidth:1
    track.scrollLeft=Math.max(0,Math.min(track.scrollWidth-track.clientWidth,track.scrollLeft+delta*unit))
    event.preventDefault();event.stopPropagation()
    return true
  }
  runtime.rememberSliders=()=>root.querySelectorAll("[data-sheet-slider]").forEach(input=>{
    const track=input.closest("[data-slider-track]")
    if(track)runtime.sliderScrollPositions.set(sliderMemoryKey(input),track.scrollLeft)
  })
  runtime.refreshSliders=()=>root.querySelectorAll("[data-sheet-slider]").forEach(input=>{
    const track=input.closest("[data-slider-track]"),saved=runtime.sliderScrollPositions.get(sliderMemoryKey(input))
    if(track&&saved!==undefined)track.scrollLeft=saved
    runtime.paintSlider(input,input.value)
  })
  runtime.onKey=event=>{
    if(runtime.onBookMenuKey(event))return
    if(event.target?.closest?.("[data-route-direction]"))return
    if(event.defaultPrevented||event.isComposing||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.target?.isContentEditable||event.target?.closest?.('textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||event.target?.matches?.("input:not([data-sheet-slider])"))return
    if(runtime.onSelectionKey(event))return
    if(runtime.onSliderKey?.(event))return;if(event.metaKey||event.ctrlKey||event.altKey||event.target?.matches?.("input,textarea,select"))return;const reference=event.target?.closest?.("[data-ref-id]");if(reference&&!reference.disabled&&["Enter"," "].includes(event.key)){event.preventDefault();const id=String(reference.dataset.refId||"");if(id&&id===runtime.referenceId)runtime.api?.setTriggerValue("clear_reference",true);else runtime.api?.setTriggerValue("open_reference",id);return}const movement={"[":-1,"]":1}[event.key];if(movement){event.preventDefault();runtime.step(movement)}
  }
  runtime.focus=id=>{const strip=root.querySelector("[data-strip]"),target=root.querySelector(`[data-pane="${CSS.escape(id)}"]`);if(!strip||!target)return;runtime.focused=id;const rect=target.getBoundingClientRect(),bounds=strip.getBoundingClientRect();strip.scrollTo({left:Math.max(0,strip.scrollLeft+(rect.left+rect.width/2-bounds.left)/readerLayoutScale(strip,bounds)-strip.clientWidth/2),behavior:root.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});runtime.paintFocus()}
  runtime.step=direction=>{const panes=[...root.querySelectorAll("[data-pane]")].filter(pane=>!pane.hidden);if(!panes.length)return;let index=Math.max(0,panes.findIndex(pane=>pane.dataset.pane===runtime.focused));index=Math.max(0,Math.min(panes.length-1,index+direction));runtime.focus(panes[index].dataset.pane)}
  runtime.nearest=()=>{
    const strip=root.querySelector("[data-strip]"),panes=[...root.querySelectorAll("[data-pane]")]
    if(!strip||!panes.length)return "source"
    // Edge panes align to the content edge, so they need not be nearest the
    // viewport centre. Keep their tab selected when the strip reaches an end.
    const maxLeft=strip.scrollWidth-strip.clientWidth
    if(maxLeft>1){
      if(strip.scrollLeft<=1)return panes[0].dataset.pane
      if(strip.scrollLeft>=maxLeft-1)return panes.at(-1).dataset.pane
    }
    const stripBounds=strip.getBoundingClientRect(),centre=stripBounds.left+(stripBounds.width||strip.clientWidth)/2
    let id=panes[0].dataset.pane,distance=Infinity
    panes.forEach(pane=>{const rect=pane.getBoundingClientRect(),next=Math.abs(rect.left+rect.width/2-centre);if(next<distance){distance=next;id=pane.dataset.pane}})
    return id
  }
  runtime.paintFocus=()=>{root.querySelectorAll("[data-pane]").forEach(pane=>pane.classList.toggle("pane-focused",pane.dataset.pane===runtime.focused));root.querySelectorAll("[data-pane-target]").forEach(tab=>tab.classList.toggle("active",tab.dataset.paneTarget===runtime.focused));const label=root.querySelector("[data-focus-label]");const pane=root.querySelector(`[data-pane="${CSS.escape(runtime.focused)}"]`);if(label)label.textContent=`FOCUS · ${pane?.querySelector(".window-titlebar strong")?.textContent||runtime.focused}`}
  runtime.applySkin=()=>{root.dataset.skin=runtime.skin;root.querySelectorAll("[data-skin-value]").forEach(button=>button.classList.toggle("active",button.dataset.skinValue===runtime.skin))}
  runtime.applyTextScale=()=>{root.style.setProperty("--desk-text-scale",String(TEXT_SCALES[runtime.textScaleIndex]));root.querySelectorAll("[data-text-size]").forEach(button=>{const direction=Number(button.dataset.textSize||0);button.disabled=(direction<0&&runtime.textScaleIndex===0)||(direction>0&&runtime.textScaleIndex===TEXT_SCALES.length-1)})}
  runtime.onScroll=()=>{const view=root.ownerDocument.defaultView;if(!view)return;if(runtime.scrollTimer)view.clearTimeout(runtime.scrollTimer);runtime.scrollTimer=view.setTimeout(()=>{runtime.focused=runtime.nearest();runtime.paintFocus()},90)}
  runtime.onWheel=event=>{
    if(runtime.onSliderWheel?.(event))return
    if(event.ctrlKey||event.metaKey||event.target?.closest?.("[data-sheet-slider]"))return
    const strip=root.querySelector("[data-strip]");if(!strip)return
    const body=event.target?.closest?.(".window-body")
    const unit=event.deltaMode===1?16:event.deltaMode===2?(body?.clientHeight||strip.clientHeight):1
    const sideways=event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)
    if(sideways){
      const delta=event.shiftKey&&Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX
      if(!delta)return
      strip.scrollLeft=Math.max(0,Math.min(strip.scrollWidth-strip.clientWidth,strip.scrollLeft+delta*unit))
      event.preventDefault();event.stopPropagation();return
    }
    // Native vertical scrolling preserves trackpad momentum and avoids layout
    // reads/writes for every wheel event. Pane CSS contains vertical overscroll.
  }
  runtime.queueThreads=()=>{if(!runtime.isRouting()&&!runtime.data?.connection?.reference&&!arr(runtime.data?.connection?.other_stacks).some(stack=>stack.reference))return;const view=root.ownerDocument.defaultView;if(!view||runtime.threadFrame)return;runtime.threadFrame=view.requestAnimationFrame(()=>{runtime.threadFrame=null;if(runtime.readerView==="outline"&&root.dataset.view==="outline")drawOutlineThreads(runtime);else drawRouteThreads(runtime);drawConnectionThreads(runtime)})}
  runtime.onRouteHover=event=>{if(!runtime.isRouting())return;const id=event.type==="pointerout"||event.type==="focusout"?"":event.target?.closest?.("[data-ref-id]")?.dataset.refId||"";if(id===runtime.hoverReference)return;runtime.hoverReference=id;const related=new Set(exactRouteEdges(runtime.data?.reference).filter(edge=>String(edge.source_id)===id||String(edge.target_id)===id).flatMap(edge=>[String(edge.source_id),String(edge.target_id)]));root.querySelectorAll(".route-card,.route-source-card,.axiom-button.route-feeder").forEach(card=>card.classList.toggle("route-related",related.has(card.dataset.refId)));root.querySelectorAll("[data-route-members]").forEach(group=>{group.style.opacity=!id||group.dataset.routeMembers.split("|").some(member=>related.has(member))?"1":".25"});runtime.queueThreads()}
  setupConnectionReader(runtime)
  setupConnectionResolution(runtime)
  setupConnectionDiscovery(runtime)
  setupVersionControls(runtime)
  setupBuildVersionMenu(runtime)
  setupSheetVersionMenu(runtime)
  setupPaneBookmarks(runtime)
  setupAxiomFavourites(runtime)
  setupTrackZoom(runtime)
  setupOutlineView(runtime)
  setupDialoguePlayer(runtime)
  setupSliderJumpMenu(runtime)
  return runtime
}

const workspaceSnapshots = new Map()
const WORKSPACE_READER_PREFIX = 'care-study-workspace-reader-v1:'
function workspaceSnapshotSlot(workId, connectionId = '') { return connectionId ? workId + '|connection:' + connectionId : workId }
function workspaceReaderKey(workId, connectionId = '') { return WORKSPACE_READER_PREFIX + encodeURIComponent(workspaceSnapshotSlot(workId,connectionId)) }
function workspaceReadSnapshot(root, workId, signature, referenceId, context = '', connectionId = '') {
  if (!workId) return null
  let saved = workspaceSnapshots.get(workspaceSnapshotSlot(workId,connectionId))
  if (!saved) {
    try { saved = JSON.parse(root.ownerDocument.defaultView?.localStorage?.getItem(workspaceReaderKey(workId,connectionId)) || 'null') } catch (_) {}
  }
  if (!saved || saved.version !== 1 || saved.workId !== workId || saved.signature !== signature || saved.referenceId !== referenceId || (saved.context || '') !== context) return null
  return saved
}
function workspaceCheckpoint(runtime) {
  if (runtime.root.dataset?.view === 'outline') return
  const root = runtime.root, strip = root.querySelector('[data-strip]')
  // React may call cleanup after detaching the old host. Detached scroll boxes
  // report zero; never let teardown overwrite the last live reading position.
  if (!runtime.workId || !strip || !root.isConnected || !strip.clientWidth || !strip.clientHeight) return
  const positions = [...root.querySelectorAll('.desk-window[data-pane]')].map(pane => {
    const body = pane.querySelector('.window-body')
    return [pane.dataset.pane, {readingId:body?.dataset.readingId || '', top:body?.scrollTop || 0, left:body?.scrollLeft || 0,
      sections:[...pane.querySelectorAll('.care-section')].map(section=>section.open)}]
  })
  const saved = {version:1, workId:runtime.workId, signature:runtime.signature, referenceId:runtime.referenceId, context:runtime.data?.workspace_context || '',
    focused:runtime.focused, left:strip.scrollLeft, skin:runtime.skin, textScaleIndex:runtime.textScaleIndex,
    positions, selectedAxiom:runtime.selectedAxiom, sections:[...runtime.sectionMemory],
    bookPosition:runtime.bookPosition ? {...runtime.bookPosition,positions:[...runtime.bookPosition.positions]} : null}
  const connectionId = runtime.data?.connection?.id || ''
  workspaceSnapshots.set(workspaceSnapshotSlot(runtime.workId,connectionId), saved)
  try { root.ownerDocument.defaultView?.localStorage?.setItem(workspaceReaderKey(runtime.workId,connectionId), JSON.stringify(saved)) } catch (_) {}
}
function workspaceRestoreRuntime(runtime, saved) {
  if (!saved) return
  const pairs = value => Array.isArray(value) ? value.filter(row=>Array.isArray(row)&&row.length===2&&typeof row[0]==='string') : []
  runtime.sectionMemory = new Map(pairs(saved.sections))
  runtime.selectedAxiom = saved.selectedAxiom?.work_id === runtime.data?.stack?.work?.id ? saved.selectedAxiom : null
  runtime.bookPosition = saved.bookPosition ? {...saved.bookPosition,positions:new Map(pairs(saved.bookPosition.positions))} : null
  if (['care','library','classic'].includes(saved.skin)) runtime.skin = saved.skin
  if (Number.isInteger(saved.textScaleIndex)) runtime.textScaleIndex = Math.max(0,Math.min(TEXT_SCALES.length-1,saved.textScaleIndex))
}
function workspaceRestorePosition(runtime, saved) {
  if (!saved) return
  const root = runtime.root
  const number = value => Number.isFinite(value) ? Math.max(0,value) : 0
  for (const row of Array.isArray(saved.positions) ? saved.positions : []) {
    if (!Array.isArray(row) || typeof row[0] !== 'string' || !row[1]) continue
    const [id, position] = row, pane = root.querySelector(`[data-pane="${CSS.escape(id)}"]`), body = pane?.querySelector('.window-body')
    if (!body || (position.readingId && body.dataset.readingId !== position.readingId)) continue
    if (Array.isArray(position.sections)) pane.querySelectorAll('.care-section').forEach((section,index)=>{if(typeof position.sections[index]==='boolean')section.open=position.sections[index]})
    body.scrollTop = number(position.top); body.scrollLeft = number(position.left)
  }
  const strip = root.querySelector('[data-strip]')
  if (strip) strip.scrollLeft = number(saved.left)
  if (typeof saved.focused === 'string' && root.querySelector(`[data-pane="${CSS.escape(saved.focused)}"]`)) runtime.focused = saved.focused
  runtime.paintSelection(); runtime.paintFocus(); runtime.queueThreads()
}
function workspaceWatchReader(runtime) {
  const root = runtime.root, view = root.ownerDocument.defaultView
  if (!view) return () => {}
  let timer = null
  const flush = () => { if (timer) view.clearTimeout(timer); timer = null; workspaceCheckpoint(runtime) }
  const queue = () => { if (timer) view.clearTimeout(timer); timer = view.setTimeout(flush,120) }
  // Only a pending reading change needs saving before an outside click. A
  // document-wide unconditional checkpoint made every shell button scan the
  // whole desk and synchronously write browser storage before handling input.
  const beforeNavigation = event => {
    if (timer !== null && !event.composedPath().includes(root)) flush()
  }
  // Local writes avoid server reruns while scrolling and survive refresh/crash.
  for (const event of ['scroll','toggle','click','keyup']) root.addEventListener(event,queue,true)
  view.addEventListener('pagehide',flush)
  view.addEventListener('care-workspace-checkpoint',flush)
  root.ownerDocument.addEventListener('pointerdown',beforeNavigation,true)
  const visibility = () => { if (root.ownerDocument.visibilityState === 'hidden') flush() }
  root.ownerDocument.addEventListener('visibilitychange',visibility)
  return () => {
    flush()
    for (const event of ['scroll','toggle','click','keyup']) root.removeEventListener(event,queue,true)
    view.removeEventListener('pagehide',flush)
    view.removeEventListener('care-workspace-checkpoint',flush)
    root.ownerDocument.removeEventListener('pointerdown',beforeNavigation,true)
    root.ownerDocument.removeEventListener('visibilitychange',visibility)
  }
}
function workspaceFitReader(runtime) {
  if (!runtime.data?.workspace_managed) return () => {}
  const root = runtime.root, host = root.getRootNode()?.host, view = root.ownerDocument.defaultView
  if (!host) return () => {}
  // The canonical desk has a viewport-based height. Its containing workspace
  // supplies the available height; only this outer boundary needs adjustment.
  const fit = () => {
    const height = host.clientHeight
    if (height > 0) { root.style.height = height + 'px'; root.style.maxHeight = height + 'px' }
  }
  fit()
  const observer = view?.ResizeObserver ? new view.ResizeObserver(fit) : null
  observer?.observe(host)
  return () => observer?.disconnect()
}


const resolutionDepthOrder=["WB","MC","CL","CH","SOURCE"]
const resolutionLayerColour=layer=>({DIRECT:"#a895be",WB:"#9a4327",MC:"#594f88",CL:"#2d6b67",CH:"#3d668b",SOURCE:"#8a431d",CB:"#a96624",XR:"#6e4f9a",XS:"#8b4f86",SC:"#8f394b"})[layer]||"#a895be"
function resolutionUnitTitle(unit){
  const id=String(unit.unit_id||""),macro=id.match(/^MC_.+_L(\d+)_(\d+)$/),numbered=id.match(/^(CL|CH)_.+_(\d+)$/)
  if(macro)return `Level ${Number(macro[1])} · Reading ${Number(macro[2])}`
  if(numbered)return `${numbered[1]} ${Number(numbered[2])}`
  if(unit.title&&unit.title!==unit.work_title)return unit.title
  if(id.startsWith("MC_"))return id.slice(3).toLowerCase().replaceAll("_"," ").replace(/^./,letter=>letter.toUpperCase())
  return unit.title||id
}
function resolutionStops(reference){const available=new Set(arr(reference?.resolution_choices?.units).map(unit=>unit.layer));return ["DIRECT",...resolutionDepthOrder.filter(layer=>available.has(layer))]}
function resolutionForDepth(reference,stop){
  if(stop==="DIRECT")return {mode:"immediate"}
  if(stop==="SOURCE")return {mode:"full"}
  const depth=resolutionDepthOrder.indexOf(stop),available=new Set(arr(reference?.resolution_choices?.units).map(unit=>unit.layer))
  return {mode:"selected",layers:[...available].filter(layer=>!resolutionDepthOrder.includes(layer)||resolutionDepthOrder.indexOf(layer)<=depth),pane_ids:[]}
}
function resolutionDepthIndex(reference,resolution){
  const stops=resolutionStops(reference);if(resolution?.mode==="full")return stops.length-1
  if(resolution?.mode!=="selected")return 0
  if(arr(resolution.pane_ids).length)return -1
  return stops.findIndex(stop=>{const candidate=resolutionForDepth(reference,stop);return candidate.mode==="selected"&&JSON.stringify([...candidate.layers].sort())===JSON.stringify([...arr(resolution.layers)].sort())})
}
function connectionResolutionControl(data){
  const reference=data?.connection?.reference;if(!reference)return ""
  const resolution=data.connection.resolution||{},index=resolutionDepthIndex(reference,resolution),stop=resolutionStops(reference)[index],label=resolution.mode==="full"?"Full path":index<0?"Selected readings":stop&&stop!=="DIRECT"?`To ${stop}`:"Direct inputs"
  return `<button type="button" class="desk-action" data-connection-resolution aria-haspopup="dialog" title="Choose layers and individual readings along this route">Resolution · ${label}</button>`
}
function setupConnectionResolution(runtime){
  const root=runtime.root
  runtime.closeConnectionResolution=()=>{root.querySelector(".connection-resolution-panel")?.remove()}
  runtime.openConnectionResolution=()=>{
    runtime.closeConnectionResolution()
    const connection=runtime.data?.connection,reference=connection?.reference;if(!reference)return
    const choices=reference.resolution_choices||{},units=arr(choices.units).filter(unit=>connection.hide_xa===false||unit.layer!=="XA"),layers=[...new Set(units.map(unit=>unit.layer))].sort((a,b)=>["SC","XS","XR","CB","WB","MC","CL","CH","SOURCE"].indexOf(a)-["SC","XS","XR","CB","WB","MC","CL","CH","SOURCE"].indexOf(b)),resolution=connection.resolution||{},visible=new Set(Object.values(reference.route_layers||{}).flatMap(arr).map(item=>item.source_pane)),explicit=new Set(arr(resolution.pane_ids)),selected=unit=>resolution.mode==="full"||explicit.has(unit.id)||arr(resolution.layers).includes(unit.layer)||(resolution.mode!=="selected"&&visible.has(unit.id))
    const element=root.ownerDocument.createElement("section");element.className="connection-resolution-panel";element.setAttribute("role","dialog");element.setAttribute("aria-label","Route resolution")
    const stops=resolutionStops(reference),depth=resolutionDepthIndex(reference,resolution),current=Math.max(0,depth),stopLabel=stop=>stop==="DIRECT"?"Direct inputs":stop==="SOURCE"?"Full path to source":`Through ${stop}`,missing=resolutionDepthOrder.filter(layer=>!stops.includes(layer))
    element.innerHTML=`<header><h3>Route resolution</h3><button type="button" data-resolution-close aria-label="Close route resolution">×</button></header><p>Move toward the source to unfold the route on either side. Only the readings behind this axiom appear.</p><div class="resolution-depth" style="--resolution-accent:${resolutionLayerColour(stops[current])};--resolution-gradient:linear-gradient(90deg,${stops.map(resolutionLayerColour).join(",")})"><div class="resolution-depth-heading"><span>Reading depth</span><output data-resolution-depth-label>${depth<0?"Selected readings":stopLabel(stops[current])}</output></div><div class="resolution-depth-rail"><input type="range" data-resolution-depth min="0" max="${stops.length-1}" step="1" value="${current}" aria-label="Route depth" aria-valuetext="${esc(stopLabel(stops[current]))}" ${stops.length<2?"disabled":""}><div class="resolution-depth-stops">${stops.map((stop,index)=>`<button type="button" class="resolution-depth-stop" data-resolution-stop="${esc(stop)}" style="--stop-color:${resolutionLayerColour(stop)}" aria-current="${index===depth}" title="${esc(stopLabel(stop))}"><span>${stop==="DIRECT"?"Direct":stop==="SOURCE"?"Source":stop}</span></button>`).join("")}</div></div></div>${missing.length?`<p class="resolution-availability">No saved ${missing.join(" / ")} ${missing.length===1?"layer":"layers"} on this route.</p>`:""}<details class="resolution-custom" ${depth<0?"open":""}><summary>Choose individual layers & readings</summary><div class="resolution-custom-actions"><button type="button" data-resolution-clear>Clear selection</button></div>${layers.map(layer=>`<details><summary><span class="resolution-unit-title" style="--stop-color:${resolutionLayerColour(layer)}"><i></i>${esc(layer)} <small>${units.filter(unit=>unit.layer===layer).length}</small></span><button type="button" data-resolution-layer="${esc(layer)}">Select layer</button></summary>${units.filter(unit=>unit.layer===layer).map(unit=>`<label><input type="checkbox" data-resolution-unit="${esc(unit.id)}" data-resolution-unit-layer="${esc(layer)}" ${selected(unit)?"checked":""}><span><b>${esc(resolutionUnitTitle(unit))}</b><small>${esc([unit.work_title,unit.unit_id,unit.version].filter(Boolean).join(" · "))}</small></span></label>`).join("")}</details>`).join("")}<footer><button type="button" data-resolution-apply>Show selected readings</button></footer></details>${!units.length?'<p>No further saved layers are available for this route.</p>':""}${reference.route_truncated?'<p>This path is larger than the current display limit. Open a branch to continue.</p>':""}${arr(reference.route_limitations).length?`<details><summary>Source availability · ${arr(reference.route_limitations).length}</summary>${arr(reference.route_limitations).map(note=>`<p>${esc(typeof note==="string"?note:note.message||note.reason||"An exact saved source mapping is unavailable for part of this path.")}</p>`).join("")}</details>`:""}`
    const slider=element.querySelector("[data-resolution-depth]")
    if(slider){slider.oninput=()=>{const stop=stops[Number(slider.value)];element.querySelector("[data-resolution-depth-label]").textContent=stopLabel(stop);slider.setAttribute("aria-valuetext",stopLabel(stop));element.querySelector(".resolution-depth").style.setProperty("--resolution-accent",resolutionLayerColour(stop));element.querySelectorAll("[data-resolution-stop]").forEach(button=>button.setAttribute("aria-current",String(button.dataset.resolutionStop===stop)))};slider.onchange=()=>{runtime.connectionAction({action:"resolution",resolution:resolutionForDepth(reference,stops[Number(slider.value)])});runtime.closeConnectionResolution()}}

    root.append(element);element.querySelector("[data-resolution-close]")?.focus({preventScroll:true})
  }
  const onClick=runtime.onConnectionClick
  runtime.onConnectionClick=event=>{
    const target=event.target
    if(target.closest?.("[data-connection-resolution]")){runtime.openConnectionResolution();return true}
    const panel=target.closest?.(".connection-resolution-panel")
    if(panel){
      if(target.closest("[data-resolution-close]")){runtime.closeConnectionResolution();return true}
      const stop=target.closest("[data-resolution-stop]")
      if(stop){runtime.connectionAction({action:"resolution",resolution:resolutionForDepth(runtime.data.connection.reference,stop.dataset.resolutionStop)});runtime.closeConnectionResolution();return true}
      if(target.closest("[data-resolution-clear]")){panel.querySelectorAll("[data-resolution-unit]").forEach(input=>input.checked=false);return true}
      const mode=target.closest("[data-resolution-mode]")
      if(mode){runtime.connectionAction({action:"resolution",resolution:{mode:mode.dataset.resolutionMode}});runtime.closeConnectionResolution();return true}
      const layer=target.closest("[data-resolution-layer]")
      if(layer){event.preventDefault();const boxes=[...panel.querySelectorAll("[data-resolution-unit]")].filter(input=>input.dataset.resolutionUnitLayer===layer.dataset.resolutionLayer),checked=!boxes.every(input=>input.checked);boxes.forEach(input=>input.checked=checked);return true}
      if(target.closest("[data-resolution-apply]")){runtime.connectionAction({action:"resolution",resolution:{mode:"selected",pane_ids:[...panel.querySelectorAll("[data-resolution-unit]:checked")].map(input=>input.dataset.resolutionUnit),layers:[]}});runtime.closeConnectionResolution();return true}
      return true
    }
    runtime.closeConnectionResolution();return onClick(event)
  }
  const onKey=runtime.onKey
  runtime.onKey=event=>{if(event.target.closest?.(".connection-resolution-panel")){if(event.key==="Escape"){runtime.closeConnectionResolution();root.querySelector("[data-connection-resolution]")?.focus();event.preventDefault()}return}return onKey(event)}
}


function installPaneControls(root,states,onChange=()=>{},scope=""){
  for(const pane of root.querySelectorAll(".desk-window[data-pane],.field-pane[data-pane]")){
    const bar=pane.querySelector(":scope > .window-titlebar,:scope > .pane-top")
    if(!bar||pane.dataset.pane==="connection:explore")continue
    const key=scope+"|"+pane.dataset.pane,state=states[key]||(states[key]={}),name=bar.querySelector("strong")?.textContent?.trim()||"pane"
    let controls=bar.querySelector(".care-pane-controls")
    if(!controls){controls=root.ownerDocument.createElement("div");controls.className="care-pane-controls";controls.setAttribute("role","group");controls.setAttribute("aria-label",`Controls for ${name}`);for(const [action,glyph] of [["minimize","−"],["sections","⌃"]]){const button=root.ownerDocument.createElement("button");button.type="button";button.dataset.paneControl=action;button.textContent=glyph;controls.append(button)}bar.prepend(controls)}
    const hasSections=[...pane.querySelectorAll("details")].some(section=>!section.matches?.(".sheet-versions")),sectionControl=[...controls.children].find(button=>button.dataset.paneControl==="sections")
    if(!hasSections)sectionControl?.remove()
    else if(!sectionControl){const button=root.ownerDocument.createElement("button");button.type="button";button.dataset.paneControl="sections";controls.append(button)}
    const paint=()=>{
      if(!pane.classList.contains("care-pane-minimized")){
        const a=controls.getBoundingClientRect(),b=bar.getBoundingClientRect()
        if(a.width&&b.width){
          // Coordinates stay relative to the title bar, but pane width includes
          // its borders. Keep those borders so the fixed dot is also centred.
          const borderWidth=Math.max(0,Number(pane.offsetWidth||0)-Number(pane.clientWidth||0))
          // Bounding rectangles are already scaled by track zoom. Convert
          // back to layout pixels before storing values that will scale again.
          const scale=(pane.getBoundingClientRect?.().width/Number(pane.offsetWidth))||1
          pane.style.setProperty("--care-controls-top",`${(a.top-b.top)/scale}px`)
          pane.style.setProperty("--care-controls-left",`${(a.left-b.left)/scale}px`)
          pane.style.setProperty("--care-folded-width",`${(2*(a.left-b.left)+(controls.firstElementChild?.getBoundingClientRect().width||16*scale))/scale+borderWidth}px`)
        }
      }
      pane.classList.toggle("care-pane-minimized",Boolean(state.minimized))
      for(const button of controls.children){const action=button.dataset.paneControl,label=action==="minimize"?(state.minimized?"Restore":"Minimise")+` ${name}`:([...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open)?"Fold":"Unfold")+` all sections in ${name}`;button.title=label;button.setAttribute("aria-label",label);button.setAttribute("aria-pressed",String(action==="minimize"?Boolean(state.minimized):![...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open)));const folded=![...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open),path=action==="minimize"?(state.minimized?"M2 6h8M6 2v8":"M2 6h8"):(folded?"M3 4l3-3 3 3M3 8l3 3 3-3":"M3 1l3 3 3-3M3 11l3-3 3 3");button.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true"><path d="${path}"/></svg>`;if(action==="sections")button.disabled=![...pane.querySelectorAll("details")].some(section=>!section.matches?.(".sheet-versions"))}
    }
    // Assign a local handler so repeated renders neither duplicate events nor
    // invoke Streamlit. The reading body and scroll positions stay mounted.
    controls.onclick=event=>{const button=event.target.closest("[data-pane-control]");if(!button)return;event.preventDefault();event.stopPropagation();const action=button.dataset.paneControl;if(action==="minimize")state.minimized=!state.minimized;else{const sections=[...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")),open=!sections.some(section=>section.open);sections.forEach(section=>section.open=open)}paint();onChange(pane)}
    paint()
  }
}


const DISCOVERY_ICONS={
  lateral:'<path d="M3 4h7v15H3zM14 4h7v15h-7zM10 8h4M10 15h4"/>',
  corpus:'<path d="m5 5 12-2 3 15-12 2zM5 8l-2 1 3 13 12-2M10 7h5M11 10h5"/>',
  explore:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
}
const discoveryIcon=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true">${DISCOVERY_ICONS[kind]||DISCOVERY_ICONS.explore}</svg>`
const discoveryOrigin=data=>String(data?.stack?.work?.id||data?.stack?.work?.work_id||data?.work?.id||data?.connection?.origin_work_id||'')
function discoverySaved(data,kind=''){
  return arr(data?.connection_options).filter(option=>['lateral','corpus'].includes(option.field)&&(!kind||option.field===kind))
}
function discoveryTitle(option,data){
  if(option.field!=='lateral')return String(option.title||'Corpus')
  const explicit=arr(option.other_member_titles).filter(Boolean)
  const others=arr(option.members).filter(member=>String(member.work_id||member.id)!==String(option.origin_work_id||discoveryOrigin(data))).map(member=>member.title||member.work_title).filter(Boolean)
  return (explicit.length?explicit:others).join(' · ')||String(option.title||'Saved comparison')
}
function discoveryBooks(data){
  const origin=discoveryOrigin(data),pending=[...arr(data?.discovery_books)],seen=new Set(),books=[]
  while(pending.length){const book=pending.shift();if(!book)continue;if(arr(book.members).length){pending.push(...book.members);continue}const id=String(book.work_id||book.id||'');if(!id||id===origin||seen.has(id)||book.field)continue;seen.add(id);books.push({...book,id})}
  return books.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')))
}
function discoveryMatches(row,query){
  const words=String(query||'').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  const text=[row.title,row.author,row.description,...arr(row.layers),...arr(row.member_titles),...arr(row.other_member_titles),...arr(row.members).flatMap(member=>[member.title,member.author])].join(' ').toLocaleLowerCase()
  return words.every(word=>text.includes(word))
}
function discoveryMiniCover(book){
  return `<span class="discovery-mini-cover" aria-hidden="true" style="--cloth:${esc(book.cloth||'#353128')};--foil:${esc(book.foil||'#e9dec4')}">${book.cover_url?`<img src="${esc(book.cover_url)}" alt="" loading="lazy" decoding="async">`:`<span>${esc(book.title||'CARE')}</span>`}</span>`
}
function discoverySavedCard(option,data,compact=false){
  const title=discoveryTitle(option,data),members=arr(option.members),origin=String(option.origin_work_id||discoveryOrigin(data)),other=members.find(member=>String(member.work_id||member.id)!==origin)||members[0]||option
  const label=option.field==='corpus'?'Open corpus':'Open saved comparison',layers=arr(option.layers).join(' · '),authors=[...new Set(members.filter(member=>String(member.work_id||member.id)!==origin).map(member=>member.author).filter(Boolean))].join(' · ')
  if(compact)return `<button type="button" class="discovery-result" data-discovery-open="${esc(option.id)}" aria-label="${esc(label+': '+title)}">${discoveryMiniCover(other)}<span class="discovery-result-copy"><strong>${esc(title)}</strong><small>${esc(option.field==='corpus'?`${option.member_count||members.length} source books`:authors||'Saved comparison')}${layers?` · ${esc(layers)}`:''}</small></span><i aria-hidden="true">↗</i></button>`
  return `<button type="button" class="discovery-saved-card" data-discovery-open="${esc(option.id)}" aria-label="${esc(label+': '+title)}"><span class="discovery-cover-object">${fieldSourceCover(option)}</span><span class="discovery-saved-copy"><strong>${esc(title)}</strong><span>${esc(option.field==='corpus'?`${option.member_count||members.length} source books`:authors||'Saved comparison')}</span><small>${esc(layers||'Saved reading')} <span aria-hidden="true">↗</span></small></span></button>`
}
function discoveryBookChoice(book){
  return `<button type="button" class="discovery-result" data-discovery-compare="${esc(book.id)}" aria-label="${esc('Prepare comparison with '+book.title)}">${discoveryMiniCover(book)}<span class="discovery-result-copy"><strong>${esc(book.title||book.id)}</strong><small>${esc(book.author||'Library book')}</small></span><i aria-hidden="true">+</i></button>`
}
function discoverySearch(label,kind){
  return `<label class="discovery-search">${discoveryIcon('search')}<input type="search" data-discovery-search="${kind}" aria-label="${esc(label)}" placeholder="${esc(label)}" autocomplete="off" spellcheck="false"></label>`
}
function discoveryShelfResults(data,query=''){
  const saved=discoverySaved(data).filter(option=>discoveryMatches(option,query)),books=discoveryBooks(data).filter(book=>discoveryMatches(book,query))
  const group=(field,label)=>{const rows=saved.filter(option=>option.field===field);return rows.length?`<section class="discovery-shelf-section"><h3>${label}<small>${rows.length}</small></h3><div class="discovery-saved-grid">${rows.map(option=>discoverySavedCard(option,data)).join('')}</div></section>`:''}
  const limit=query?60:12
  return group('lateral','Saved comparisons')+group('corpus','Saved corpora')+`<section class="discovery-shelf-section"><h3>Compare with another book<small>${books.length}</small></h3>${books.slice(0,limit).map(discoveryBookChoice).join('')||`<p class="discovery-empty">${query?'No books match this search.':'Other library books will appear here.'}</p>`}${books.length>limit?`<p class="discovery-more">${books.length-limit} more books · Search by title or author.</p>`:''}</section>`
}
function connectionDiscoveryPane(data){
  if(!data?.stack?.work||(!data.connection_options?.length&&!data.discovery_books?.length)||data.reference||data.connection||arr(data.connection?.other_stacks).some(stack=>stack.reference))return ''
  const title=data.stack.work.title||'this book',count=discoverySaved(data).length
  return `<section class="desk-window connection-discovery-pane" data-pane="connection:explore" data-layer="DISCOVER" hidden><div class="window-titlebar"><strong>EXPLORE / CONNECTIONS</strong><span>${count} SAVED</span></div><div class="window-body"><header class="connection-discovery-head"><span class="pane-kicker">THE NEXT READING</span><h2>Follow a connection.</h2><p>Open a saved comparison or corpus around ${esc(title)}, or choose another book to prepare a new comparison.</p></header>${discoverySearch('Search titles, authors, or saved readings','shelf')}<div class="discovery-shelf-results" data-discovery-results>${discoveryShelfResults(data)}</div></div></section>`
}
function connectionDiscoveryControls(data){
  if(!data?.stack?.work||(!data.connection_options?.length&&!data.discovery_books?.length&&!data.connection))return ''
  const button=(kind,label)=>`<button type="button" class="desk-tab connection-discovery-button" data-discovery-menu="${kind}" aria-label="${label}" title="${label}" aria-haspopup="dialog" aria-expanded="false">${discoveryIcon(kind)}</button>`
  return `<div class="connection-controls connection-discovery-controls" aria-label="Explore connected works">${button('corpus','Add corpus')}${data.connection?'':`<button type="button" class="desk-tab connection-discovery-button" data-discovery-explore aria-label="Explore connections" title="Explore connections">${discoveryIcon('explore')}</button>`}${data.connection?.reference?'<button type="button" class="desk-action" data-connection-clear>Close route</button>':''}${data.connection?`<button type="button" class="desk-action" data-connection-close aria-label="Close connected reading">Close ${data.connection.field==='corpus'?'corpus':'comparison'} ×</button>`:''}</div>`
}
function discoveryPopoverResults(data,kind,query=''){
  const saved=discoverySaved(data,kind==='all'?'':kind).filter(option=>discoveryMatches(option,query)),books=kind==='corpus'?[]:discoveryBooks(data).filter(book=>discoveryMatches(book,query)),limit=query?60:10
  const group=(field,label)=>{const rows=saved.filter(option=>option.field===field);return rows.length?`<section class="discovery-result-group"><h3>${label}</h3>${rows.map(option=>discoverySavedCard(option,data,true)).join('')}</section>`:''}
  let html=group('lateral','Saved comparisons')+group('corpus','Saved corpora')
  if(kind!=='corpus')html+=`<section class="discovery-result-group"><h3>Prepare a new comparison</h3>${books.slice(0,limit).map(discoveryBookChoice).join('')}${books.length>limit?`<p class="discovery-empty">Search ${books.length} books by title or author.</p>`:''}</section>`
  if(!saved.length&&!books.length)html=`<p class="discovery-empty">${query?'No matching readings. Try another title or author.':kind==='corpus'?'No saved corpus includes this book yet.':'Other books and saved comparisons will appear here.'}</p>`
  return html
}
// A fresh second gesture is required: momentum from reaching the end is not intent.
function advanceDiscoveryGate(gate,{atEnd,delta,now}){
  if(!atEnd||delta<=0){gate.waiting=false;gate.intentional=false;gate.push=0;gate.last=now;return false}
  if(!gate.waiting){gate.waiting=true;gate.intentional=false;gate.push=0;gate.last=now;return false}
  if(now-gate.last>180){gate.intentional=true;gate.push=0}
  gate.last=now
  if(!gate.intentional)return false
  gate.push+=Math.max(0,delta)
  return gate.push>=120
}
function setupConnectionDiscovery(runtime){
  if(runtime.discoveryInstalled)return
  runtime.discoveryInstalled=true
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeConnectionDiscovery=({restoreFocus=false}={})=>{const current=runtime.discoveryPopover;if(!current)return;runtime.discoveryPopover=null;current.anchor?.setAttribute('aria-expanded','false');current.element.remove();if(restoreFocus&&current.anchor?.isConnected!==false)current.anchor?.focus({preventScroll:true})}
  runtime.positionConnectionDiscovery=()=>{const current=runtime.discoveryPopover;if(!current)return;const bounds=root.getBoundingClientRect(),anchor=current.anchor?.getBoundingClientRect()||bounds,width=Math.max(0,Math.min(416,bounds.width-16)),left=Math.max(8,Math.min(bounds.width-width-8,anchor.right-bounds.left-width)),top=Math.max(8,Math.min(bounds.height-120,anchor.bottom-bounds.top+7));Object.assign(current.element.style,{width:width+'px',left:left+'px',top:top+'px',maxHeight:Math.max(80,bounds.height-top-8)+'px'})}
  runtime.openConnectionDiscovery=(kind,anchor)=>{
    const same=runtime.discoveryPopover?.kind===kind&&runtime.discoveryPopover?.anchor===anchor
    runtime.closeConnectionDiscovery();if(same)return
    const popup=doc.createElement('section'),label=kind==='lateral'?'Compare books':kind==='corpus'?'Add a corpus':'Explore connections'
    popup.className='connection-discovery-popover';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',label)
    popup.innerHTML=`<div class="discovery-popover-head"><strong>${label}</strong><button type="button" class="discovery-popover-close" data-discovery-close aria-label="Close connections">×</button></div>${discoverySearch(kind==='corpus'?'Search saved corpora':'Search titles or authors','popover')}<div class="discovery-results" data-discovery-popover-results>${discoveryPopoverResults(runtime.data,kind)}</div>`
    root.append(popup);runtime.discoveryPopover={kind,anchor,element:popup};anchor?.setAttribute('aria-expanded','true');runtime.positionConnectionDiscovery();popup.querySelector('input')?.focus({preventScroll:true})
  }
  runtime.revealConnectionShelf=()=>{const pane=root.querySelector('[data-pane="connection:explore"]'),strip=root.querySelector('[data-strip]');if(!pane||!strip)return false;if(pane.hidden){runtime.discoveryBookEnd=Math.max(0,strip.scrollWidth-strip.clientWidth);pane.hidden=false;runtime.discoveryShelfEntered=false}runtime.discoveryShelfOpen=true;return true}
  runtime.syncConnectionShelf=()=>{const pane=root.querySelector('[data-pane="connection:explore"]');if(!pane)return;if(runtime.discoveryShelfOpen)pane.hidden=false}
  const originalWheel=runtime.onWheel
  runtime.onWheel=event=>{
    const pane=root.querySelector('[data-pane="connection:explore"]'),strip=root.querySelector('[data-strip]'),target=event.target
    if(pane?.hidden&&strip?.contains(target)&&!event.ctrlKey&&!event.metaKey&&(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))){const unit=event.deltaMode===1?16:event.deltaMode===2?strip.clientWidth:1,delta=(event.shiftKey&&Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX)*unit,gate=runtime.discoveryGate||(runtime.discoveryGate={}),atEnd=strip.scrollLeft>=strip.scrollWidth-strip.clientWidth-2;if(advanceDiscoveryGate(gate,{atEnd,delta,now:Date.now()})){event.preventDefault();event.stopPropagation();runtime.revealConnectionShelf();strip.scrollTo({left:strip.scrollWidth-strip.clientWidth,behavior:view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return}}
    return originalWheel?.(event)
  }
  runtime.onDiscoveryShelfScroll=event=>{const strip=root.querySelector('[data-strip]'),pane=root.querySelector('[data-pane="connection:explore"]');if(event.target!==strip||!pane||pane.hidden||!runtime.discoveryShelfOpen)return;if(strip.scrollLeft>(runtime.discoveryBookEnd||0)+16)runtime.discoveryShelfEntered=true;if(runtime.discoveryShelfEntered&&strip.scrollLeft<(runtime.discoveryBookEnd||0)-32){pane.hidden=true;runtime.discoveryShelfOpen=false;runtime.discoveryShelfEntered=false;runtime.discoveryGate={}}}
  const originalClick=runtime.onConnectionClick
  runtime.onConnectionClick=event=>{
    const target=event.target,open=target.closest?.('[data-discovery-open]'),compare=target.closest?.('[data-discovery-compare]'),menu=target.closest?.('[data-discovery-menu]')
    if(open){const id=open.dataset.discoveryOpen;if(discoverySaved(runtime.data).some(option=>String(option.id)===id)){runtime.closeConnectionDiscovery();runtime.connectionAction({action:'open',id})}return true}
    if(compare){const work_id=compare.dataset.discoveryCompare;if(discoveryBooks(runtime.data).some(book=>book.id===work_id)){runtime.closeConnectionDiscovery();runtime.connectionAction({action:'start_comparison',work_id})}return true}
    if(menu){runtime.openConnectionDiscovery(menu.dataset.discoveryMenu,menu);return true}
    if(target.closest?.('[data-discovery-close]')){runtime.closeConnectionDiscovery({restoreFocus:true});return true}
    if(target.closest?.('[data-discovery-explore]')){const pane=root.querySelector('[data-pane="connection:explore"]'),strip=root.querySelector('[data-strip]');if(pane&&strip){runtime.closeConnectionDiscovery();runtime.revealConnectionShelf();const a=pane.getBoundingClientRect(),b=strip.getBoundingClientRect();strip.scrollTo({left:strip.scrollLeft+a.left-b.left-12,behavior:view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});runtime.focused='connection:explore';runtime.paintFocus?.();pane.querySelector('input')?.focus({preventScroll:true})}else runtime.openConnectionDiscovery('all',target.closest('[data-discovery-explore]'));return true}
    return originalClick?.(event)||false
  }
  runtime.onDiscoveryInput=event=>{const input=event.target?.closest?.('[data-discovery-search]');if(!input)return false;const popup=runtime.discoveryPopover;if(input.dataset.discoverySearch==='popover'&&popup){const results=popup.element.querySelector('[data-discovery-popover-results]');if(results)results.innerHTML=discoveryPopoverResults(runtime.data,popup.kind,input.value)}else{const pane=input.closest('.connection-discovery-pane'),results=pane?.querySelector('[data-discovery-results]');if(results)results.innerHTML=discoveryShelfResults(runtime.data,input.value)}return true}
  const originalChange=runtime.onConnectionChange
  runtime.onConnectionChange=event=>{if(runtime.onDiscoveryInput(event))return;return originalChange?.(event)}
  const originalKey=runtime.onKey
  runtime.onKey=event=>{
    const popup=runtime.discoveryPopover
    if(popup&&event.key==='Escape'){event.preventDefault();runtime.closeConnectionDiscovery({restoreFocus:true});return}
    const scope=event.target?.closest?.('.connection-discovery-popover,.connection-discovery-pane')
    if(scope&&['ArrowDown','ArrowUp'].includes(event.key)){const buttons=[...scope.querySelectorAll('[data-discovery-open],[data-discovery-compare]')],index=buttons.indexOf(event.target),next=Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowDown'?1:-1)));if(buttons[next]){event.preventDefault();buttons[next].focus({preventScroll:true});buttons[next].scrollIntoView({block:'nearest',inline:'nearest'})}return}
    if(scope&&event.key==='Enter'&&event.target?.matches?.('[data-discovery-search]')){const first=scope.querySelector('[data-discovery-open],[data-discovery-compare]');if(first){event.preventDefault();runtime.onConnectionClick({target:first})}return}
    return originalKey?.(event)
  }
  const outside=event=>{const popup=runtime.discoveryPopover;if(popup&&!popup.element.contains(event.target)&&!popup.anchor?.contains(event.target))runtime.closeConnectionDiscovery()}
  const resize=()=>runtime.positionConnectionDiscovery()
  runtime.attachConnectionDiscovery=()=>{root.addEventListener('input',runtime.onDiscoveryInput);root.addEventListener('scroll',runtime.onDiscoveryShelfScroll,true);doc.addEventListener('pointerdown',outside,true);view?.addEventListener('resize',resize)}
  runtime.cleanupConnectionDiscovery=()=>{runtime.closeConnectionDiscovery();root.removeEventListener('input',runtime.onDiscoveryInput);root.removeEventListener('scroll',runtime.onDiscoveryShelfScroll,true);doc.removeEventListener('pointerdown',outside,true);view?.removeEventListener('resize',resize)}
}


function outlineViewControl(){return '<div class="desk-view" role="group" aria-label="Reader view"><button type="button" data-reader-view="normal" aria-pressed="true" class="active" title="The original reading panes">Normal</button><button type="button" data-reader-view="outline" aria-pressed="false" title="Every chapter and CARE sheet as an expandable strip">Outline</button></div>'}
const outlineUnitId=node=>String(node?.unit_id||String(node?.id||'').split(':')[0])
function outlineLayers(data){
  const stack=data?.stack||{},reference=data?.reference,groups=new Map()
  const add=(key,layer,option)=>{
    if(!option.id)return
    if(!groups.has(key))groups.set(key,{key,layer,label:key.startsWith('MC:')?readerLayerLabel('MC',option):layer,id:`outline:${key}`,options:[]})
    const group=groups.get(key),id=String(option.id)
    if(!group.options.some(row=>row.id===id))group.options.push({...option,id,title:sliderTitle(option),routeIds:[]})
  }
  for(const chapter of sliderOptions(stack,'SOURCE'))add('SOURCE','SOURCE',chapter)
  for(const [layer,rows] of Object.entries(stack.sheet_options||{}))for(const option of arr(rows).filter(row=>row.available!==false))add(layer==='MC'?`MC:${mcLevel(option)||'legacy'}`:layer,layer,option)
  for(const unit of arr(stack.care_path))add(sheetLayerKey(unit),unit.type,unit)
  if(stack.active_chapter)add('SOURCE','SOURCE',{...stack.active_chapter,id:stack.active_chapter.raw_unit_id})
  if(isRouteReference(reference))for(const node of routeNodeIndex(reference).values()){
    const layer=node?.kind==='passage'?'SOURCE':String(node?.layer||'').toUpperCase(),id=outlineUnitId(node)
    if(!layer||!id)continue
    const key=layer==='MC'?`MC:${mcLevel(node)||'legacy'}`:layer
    add(key,layer,{id,title:node.sheet_title||node.chapter_title||id,mc_level:mcLevel(node)})
    const option=groups.get(key).options.find(row=>row.id===id)
    if(!option.routeIds.includes(String(node.id)))option.routeIds.push(String(node.id))
  }
  return [...groups.values()].sort((a,b)=>readingRank({type:a.layer,mc_level:a.key.split(':')[1]})-readingRank({type:b.layer,mc_level:b.key.split(':')[1]}))
}
function outlineRouteEndpoint(root,id){
  const member=root.querySelector(`[data-outline-members~="${CSS.escape(String(id))}"]`)
  if(!member)return null
  const toggle=member.querySelector('[data-outline-toggle]'),content=member.querySelector('.outline-content')
  if(content?.hidden)return toggle
  const exact=member.querySelector(`[data-ref-id="${CSS.escape(String(id))}"]`)
  if(!exact)return toggle
  const section=exact.closest('details')
  return section&&!section.open?section.querySelector('summary'):exact
}
function outlineRouteCards(runtime){
  const cards=new Map()
  for(const id of routeNodeIndex(runtime.data?.reference).keys()){const card=outlineRouteEndpoint(runtime.root,id);if(card)cards.set(id,card)}
  return cards
}
function drawOutlineThreads(runtime){
  const root=runtime.root,reference=runtime.data?.reference,strip=root.querySelector('[data-strip]')
  root.querySelector('[data-route-threads]')?.remove()
  let svg=root.querySelector('[data-outline-threads]')
  if(!isRouteReference(reference)||!strip){svg?.remove();return}
  if(!svg){svg=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','outline-thread-overlay');svg.setAttribute('data-outline-threads','');svg.setAttribute('aria-hidden','true');root.append(svg)}
  const bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect(),geometry=new Map(),scale=readerLayoutScale(root,bounds)
  outlineRouteCards(runtime).forEach((card,id)=>{
    const rect=card.getBoundingClientRect(),body=card.closest('.window-body')?.getBoundingClientRect()
    if(!body||!rect.width||!rect.height||rect.right<=clip.left||rect.left>=clip.right)return
    const y=Math.max(Math.max(body.top,clip.top)+7,Math.min(Math.min(body.bottom,clip.bottom)-7,rect.top+rect.height/2))
    geometry.set(id,{rect,y,pane:card.closest('[data-pane]')})
  })
  const active=runtime.outlineHoverIds||new Set(),paths=exactRouteEdges(reference).map((edge,index)=>{
    const from=geometry.get(String(edge.source_id)),to=geometry.get(String(edge.target_id));if(!from||!to)return ''
    const same=from.pane===to.pane,forward=from.rect.left<to.rect.left
    const x1=((same?from.rect.left+2:forward?from.rect.right-2:from.rect.left+2)-bounds.left)/scale,x2=((same?to.rect.left+2:forward?to.rect.left+2:to.rect.right-2)-bounds.left)/scale,y1=(from.y-bounds.top)/scale,y2=(to.y-bounds.top)/scale,bend=Math.max(20,Math.abs(x2-x1)*.48),sign=forward?1:-1
    const color=layerColor(edge.source_layer,edge.source_id),target=layerColor(edge.target_layer,edge.target_id),lit=active.has(String(edge.source_id))||active.has(String(edge.target_id)),gradient=`outline-thread-${index}`
    return `<defs><linearGradient id="${gradient}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop stop-color="${color}"/><stop offset="1" stop-color="${target}"/></linearGradient></defs><path class="outline-thread${lit?' active':''}" data-outline-source="${esc(edge.source_id)}" data-outline-target="${esc(edge.target_id)}" stroke="url(#${gradient})" d="M ${x1} ${y1} C ${same?x1-16:x1+bend*sign} ${y1},${same?x2-16:x2-bend*sign} ${y2},${x2} ${y2}"/><circle class="outline-port" cx="${x1}" cy="${y1}" r="${lit?3:2}" stroke="${color}"/><circle class="outline-port" cx="${x2}" cy="${y2}" r="${lit?3:2}" stroke="${target}"/>`
  }).join('')
  svg.setAttribute('viewBox',`0 0 ${bounds.width/scale} ${bounds.height/scale}`);svg.innerHTML=paths
}
function setupOutlineView(runtime){
  const root=runtime.root,view=root.ownerDocument.defaultView
  runtime.readerView='normal';runtime.outlineBooks=new Map();runtime.outlineHoverIds=new Set()
  const bookKey=()=>`${runtime.data?.stack?.work?.id||''}|${runtime.data?.outline_context||''}`
  runtime.outlineState=()=>{
    const key=bookKey()
    if(!runtime.outlineBooks.has(key))runtime.outlineBooks.set(key,{open:new Set(),cache:new Map(),positions:new Map(),sections:new Map(),left:0,routeOnly:false,requests:new Map(),errors:new Map()})
    return runtime.outlineBooks.get(key)
  }
  runtime.ingestOutline=()=>{
    const state=runtime.outlineState(),stack=runtime.data?.stack||{}
    for(const unit of arr(stack.care_path))state.cache.set(String(unit.id),{unit})
    if(stack.active_chapter)state.cache.set(String(stack.active_chapter.raw_unit_id),{chapter:stack.active_chapter})
    for(const row of arr(runtime.data?.outline_units))if(row.work_id===stack.work?.id&&(row.unit||row.chapter)){state.cache.set(String(row.id),row);if(state.requests.get(String(row.id))===row.request_id)state.requests.delete(String(row.id))}
    const response=runtime.data?.outline_response
    if(response&&response.work_id===stack.work?.id&&state.requests.get(String(response.id))===response.request_id){
      state.requests.delete(String(response.id))
      if(response.error)state.errors.set(String(response.id),response.error)
      else {state.cache.set(String(response.id),response);state.errors.delete(String(response.id))}
    }
    // Keep open readers; discard the oldest closed content when traversing a long book.
    for(const id of state.cache.keys())if(state.cache.size>32&&!state.open.has(id))state.cache.delete(id)
  }
  runtime.captureOutline=()=>{
    if(!root.querySelector('.outline-lane'))return
    const state=runtime.outlineState(),strip=root.querySelector('[data-strip]');state.left=strip?.scrollLeft||0
    root.querySelectorAll('.outline-lane').forEach(lane=>state.positions.set(lane.dataset.outlineLayer,lane.querySelector('.window-body').scrollTop))
    root.querySelectorAll('.outline-sheet').forEach(sheet=>{const sections=[...sheet.querySelectorAll('.care-section')];if(sections.length)state.sections.set(sheet.dataset.outlineSheet,sections.map(section=>section.open))})
  }
  runtime.restoreNormalOutline=()=>{
    const parked=runtime.outlineParked;if(!parked)return
    runtime.captureOutline()
    const strip=root.querySelector('[data-strip]')
    if(strip){strip.replaceChildren(...parked.nodes);strip.scrollLeft=parked.left;for(const [body,top,left] of parked.positions||[]){body.scrollTop=top;body.scrollLeft=left}}
    const tabs=root.querySelector('.desk-tabs');if(tabs)tabs.innerHTML=parked.tabs
    runtime.focused=parked.focused
    root.querySelector('[data-outline-threads]')?.remove()
    runtime.outlineParked=null;root.dataset.view='normal'
    root.querySelector('[data-outline-tools]')?.remove()
    runtime.paintOutlineSwitch()
  }
  runtime.beforeOutlineRender=()=>{runtime.restoreNormalOutline()}
  runtime.paintOutlineSwitch=()=>root.querySelectorAll('[data-reader-view]').forEach(button=>{const connected=Boolean(runtime.data?.connection?.reference),active=button.dataset.readerView===(connected?'normal':runtime.readerView);button.disabled=connected&&button.dataset.readerView==='outline';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))})
  runtime.outlineContent=(option,group)=>{
    const state=runtime.outlineState(),loaded=state.cache.get(option.id),reference=runtime.data?.reference,template=root.ownerDocument.createElement('template')
    if(loaded?.chapter){template.innerHTML=sourcePane({...runtime.data.stack,active_chapter:loaded.chapter},String(reference?.id||''),null)}
    else if(loaded?.unit){template.innerHTML=carePane(loaded.unit,0,'',null,{},new Set(),false)}
    else {
      const nodes=routeNodeIndex(reference),items=option.routeIds.map(id=>nodes.get(id)).filter(Boolean),error=state.errors.get(option.id)
      const snippets=group.layer==='SOURCE'?items.map(item=>`<div class="passage-row"><article class="route-source-card" data-ref-id="${esc(item.id)}" data-select-passage="${esc(item.id)}" data-source-unit="${esc(option.id)}" role="button" tabindex="0"><span class="passage-address">${esc(item.id)}</span><div class="passage-text">${item.reading_block_html ?? esc(item.text)}</div></article><button type="button" class="axiom-routes" data-open-passage-routes="${esc(item.id)}" hidden>Routes</button></div>`).join(''):routeGroups(items,String(reference?.id||''))
      return `<p class="outline-load-note" role="status">${error?`${esc(error)} <button type="button" data-outline-retry="${esc(option.id)}">Retry</button>`:'Opening the full '+(group.layer==='SOURCE'?'chapter':'CARE sheet')+'…'}</p>${snippets}`
    }
    const body=template.content.querySelector('.window-body')
    body?.querySelectorAll('[data-select-axiom]').forEach(button=>{
      button.dataset.selectionUnit=option.id
      if(option.routeIds.includes(button.dataset.refId)){
        button.classList.add('route-feeder');button.closest('details').open=true
        if(button.dataset.refId===String(reference?.id)){button.classList.add('selected');button.parentElement.insertAdjacentHTML('beforeend',routeArrival(reference))}
      }
    })
    body?.querySelectorAll('[data-select-passage]').forEach(button=>{if(option.routeIds.includes(button.dataset.refId))button.classList.add('selected')})
    const saved=state.sections.get(option.id)
    if(saved)body?.querySelectorAll('.care-section').forEach((section,index)=>{if(typeof saved[index]==='boolean')section.open=saved[index]})
    return (body?.innerHTML||'')+`<button type="button" class="outline-close-bottom" data-outline-toggle="${esc(option.id)}">− Close ${group.layer==='SOURCE'?'chapter':'sheet'} · ${esc(option.title)}</button>`
  }
  runtime.requestOutline=(option,group,force=false)=>{
    const state=runtime.outlineState();if((state.cache.has(option.id)&&!force)||state.requests.size||state.errors.has(option.id))return
    const request_id=`${Date.now()}-${Math.random().toString(36).slice(2)}`;state.requests.set(option.id,request_id)
    runtime.api?.setTriggerValue('open_outline_sheet',{id:option.id,layer:group.key,request_id})
  }
  runtime.renderOutlineSheet=(option,group,index)=>{
    const state=runtime.outlineState(),open=state.open.has(option.id),members=option.routeIds
    return `<section class="outline-sheet${members.length?' outline-on-route':''}" data-outline-sheet="${esc(option.id)}" data-outline-members="${esc(members.join(' '))}"${state.routeOnly&&isRouteReference(runtime.data?.reference)&&!members.length?' hidden':''}><button type="button" class="outline-strip" data-outline-toggle="${esc(option.id)}" aria-expanded="${open}" aria-controls="outline-body-${esc(option.id)}" title="${esc(option.title)}"><span class="outline-fold" aria-hidden="true">${open?'−':'+'}</span><span class="outline-order">${String(option.chapter_number||option.sequence_number||index+1).padStart(2,'0')}</span><span class="outline-strip-title">${esc(option.title)}</span>${members.length?`<span class="outline-route-count" title="${members.length} exact route ${members.length===1?'point':'points'}">${members.length}</span>`:''}</button><div class="outline-content" id="outline-body-${esc(option.id)}"${open?'':' hidden'}>${open?runtime.outlineContent(option,group):''}</div></section>`
  }
  runtime.applyOutline=()=>{
    if(runtime.data?.outline_available&&!root.querySelector('[data-reader-view]'))root.querySelector('.desk-skin')?.insertAdjacentHTML('beforebegin',outlineViewControl())
    runtime.ingestOutline();runtime.paintOutlineSwitch()
    if(runtime.readerView!=='outline'||runtime.data?.mode==='library'||runtime.data?.connection?.reference)return
    const strip=root.querySelector('[data-strip]');if(!strip||root.querySelector('.outline-lane'))return
    const state=runtime.outlineState(),groups=outlineLayers(runtime.data),tabs=root.querySelector('.desk-tabs'),reference=runtime.data?.reference
    runtime.outlineGroups=groups
    if(runtime.readerView==='outline')workspaceCheckpoint(runtime)
    runtime.outlineParked={nodes:[...strip.childNodes],tabs:tabs?.innerHTML||'',left:strip.scrollLeft,focused:runtime.focused,positions:[...strip.querySelectorAll('.window-body')].map(body=>[body,body.scrollTop,body.scrollLeft])}
    root.dataset.view='outline'
    strip.innerHTML=groups.map(group=>`<section class="desk-window outline-lane ${group.layer==='SOURCE'?'source-pane':'care-pane'}" data-pane="${esc(group.id)}" data-outline-layer="${esc(group.key)}" data-layer="${esc(group.layer)}"${group.layer==='MC'?` data-mc-level="${esc(group.key.split(':')[1])}"`:''}${group.layer==='SOURCE'?'':' data-reading-sheet'} style="--pane-accent:${layerColor(group.layer,{mc_level:group.key.split(':')[1]})}"><div class="outline-lane-head"><strong>${esc(group.label)}</strong><span>${group.options.length} ${group.layer==='SOURCE'?'chapters':'sheets'}</span><button type="button" data-outline-collapse="${esc(group.key)}" title="Close every strip in ${esc(group.label)}">Fold all</button></div><div class="window-body">${group.options.map((option,index)=>runtime.renderOutlineSheet(option,group,index)).join('')||'<p class="outline-empty">No sheets at this layer.</p>'}</div></section>`).join('')
    // Connected fields keep their canonical panes and their own controls.
    for(const node of runtime.outlineParked.nodes)if(node.nodeType===1&&node.matches('[data-connection-field],[data-connection-book],.connection-discovery-pane'))strip.append(node)
    if(tabs)tabs.innerHTML=groups.map(group=>paneTab(group.id,group.label)).join('')
    const status=root.querySelector('.desk-status')
    status?.insertAdjacentHTML('beforeend',`<div class="outline-tools" data-outline-tools><span>Open a strip to read · routes follow every fold</span>${isRouteReference(reference)?`<button type="button" class="desk-tab" data-outline-route-only aria-pressed="${state.routeOnly}">${state.routeOnly?'Show whole book':'Route strips only'}</button>`:''}<button type="button" class="desk-tab" data-outline-collapse="*">Fold all</button>${isRouteReference(reference)?trackZoomControls():''}</div>`)
    root.querySelectorAll('.outline-lane').forEach(lane=>{lane.querySelector('.window-body').scrollTop=state.positions.get(lane.dataset.outlineLayer)||0})
    strip.scrollLeft=state.left
    runtime.focused=groups.find(group=>group.key===state.focused)?.id||groups[0]?.id||'source'
    runtime.paintSelection();decorateReadingActions(runtime);runtime.paintFocus();runtime.applyTrackZoom();runtime.queueThreads()
    // Only explicitly opened strips cause I/O, never every title in a long book.
    const pending=runtime.outlineViewerPending
    if(pending){
      if(arr(runtime.data?.outline_units).some(row=>row.id===pending.id)){runtime.viewerSelectionPending=true;runtime.onViewerReady?.();runtime.outlineViewerPending=null}
      else runtime.requestOutline(pending.option,pending.group,true)
    }
    for(const group of groups)for(const option of group.options)if(state.open.has(option.id))runtime.requestOutline(option,group)
  }
  runtime.setReaderView=value=>{
    if(!['normal','outline'].includes(value)||value===runtime.readerView)return
    runtime.restoreNormalOutline();runtime.readerView=value
    runtime.applyOutline();runtime.paintOutlineSwitch();runtime.applyTrackZoom();runtime.paintFocus();runtime.queueThreads()
  }
  const zoom=runtime.applyTrackZoom
  runtime.applyTrackZoom=()=>{
    zoom?.()
    if(root.dataset.view!=='outline')return
    const strip=root.querySelector('[data-strip]');if(!strip)return
    const style=view.getComputedStyle(strip),height=strip.clientHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0),scale=Number(strip.dataset.trackScale)||1
    strip.querySelectorAll('.outline-lane').forEach(lane=>{lane.style.height=`${height/scale}px`})
  }
  const paintFocus=runtime.paintFocus
  runtime.paintFocus=()=>{paintFocus?.();if(root.dataset.view==='outline'){const group=runtime.outlineGroups?.find(row=>row.id===runtime.focused),label=root.querySelector('[data-focus-label]');if(group&&label)label.textContent=`FOCUS · ${group.label}`}}
  const click=runtime.onClick
  runtime.onClick=event=>{
    const switcher=event.target?.closest?.('[data-reader-view]');if(switcher){event.preventDefault();runtime.setReaderView(switcher.dataset.readerView);return}
    if(runtime.readerView!=='outline')return click(event)
    const sectionAction=event.target?.closest?.('[data-sheet-sections]')
    if(sectionAction){const sheet=sectionAction.closest('.outline-sheet');if(sheet){event.preventDefault();sheet.querySelectorAll('.care-section').forEach(section=>section.open=sectionAction.dataset.sheetSections==='expand');runtime.captureOutline();runtime.paintSelection();runtime.queueThreads();return}}
    const selected=event.target?.closest?.('[data-select-axiom],[data-select-passage]')
    if(selected){
      const id=selected.dataset.selectionUnit||selected.dataset.sourceUnit,known=[...arr(runtime.data?.outline_units).map(row=>row.id),...arr(runtime.data?.stack?.care_path).map(unit=>unit.id),runtime.data?.stack?.active_chapter?.raw_unit_id]
      if(id&&!known.includes(id)){const group=runtime.outlineGroups.find(group=>group.options.some(option=>option.id===id)),option=group?.options.find(option=>option.id===id);if(option){runtime.outlineViewerPending={id,group,option};runtime.requestOutline(option,group,true);runtime.viewerSelectionPending=true}}
    }
    const target=event.target?.closest?.('[data-outline-toggle],[data-outline-retry]')
    if(target){
      event.preventDefault();const id=target.dataset.outlineToggle||target.dataset.outlineRetry,group=runtime.outlineGroups.find(group=>group.options.some(option=>option.id===id)),option=group?.options.find(option=>option.id===id);if(!option)return
      const state=runtime.outlineState(),sheet=target.closest('.outline-sheet'),body=sheet.closest('.window-body'),top=sheet.getBoundingClientRect().top,bounds=body.getBoundingClientRect(),content=sheet.querySelector('.outline-content'),button=sheet.querySelector('.outline-strip')
      runtime.captureOutline();state.focused=group.key
      const open=target.dataset.outlineRetry||!state.open.has(id)
      if(open){state.open.add(id);if(target.dataset.outlineRetry)state.errors.delete(id);if(!content.innerHTML||target.dataset.outlineRetry)content.innerHTML=runtime.outlineContent(option,group);runtime.requestOutline(option,group)}else state.open.delete(id)
      content.hidden=!open;button.setAttribute('aria-expanded',String(Boolean(open)));button.querySelector('.outline-fold').textContent=open?'−':'+'
      if(!open&&top<bounds.top)body.scrollTop+= (top-bounds.top)/readerLayoutScale(body,bounds)
      button.focus({preventScroll:true});runtime.paintSelection();decorateReadingActions(runtime);runtime.queueThreads();return
    }
    const collapse=event.target?.closest?.('[data-outline-collapse]')
    if(collapse){
      const state=runtime.outlineState();runtime.captureOutline()
      root.querySelectorAll('.outline-lane').forEach(lane=>{if(collapse.dataset.outlineCollapse!=='*'&&collapse.dataset.outlineCollapse!==lane.dataset.outlineLayer)return;lane.querySelectorAll('.outline-sheet').forEach(sheet=>{state.open.delete(sheet.dataset.outlineSheet);sheet.querySelector('.outline-content').hidden=true;sheet.querySelector('.outline-strip').setAttribute('aria-expanded','false');sheet.querySelector('.outline-fold').textContent='+'});lane.querySelector('.window-body').scrollTop=0});runtime.queueThreads();return
    }
    const filter=event.target?.closest?.('[data-outline-route-only]')
    if(filter){const state=runtime.outlineState();state.routeOnly=!state.routeOnly;runtime.restoreNormalOutline();runtime.applyOutline();return}
    return click(event)
  }
  const hover=runtime.onRouteHover
  runtime.onRouteHover=event=>{
    if(runtime.readerView!=='outline')return hover(event)
    const out=['pointerout','focusout'].includes(event.type),card=event.target?.closest?.('[data-ref-id]'),sheet=event.target?.closest?.('.outline-sheet'),ids=out?[]:card?[card.dataset.refId]:(sheet?.dataset.outlineMembers||'').split(' ').filter(Boolean)
    runtime.outlineHoverIds=new Set(ids)
    const related=new Set(exactRouteEdges(runtime.data?.reference).filter(edge=>ids.includes(String(edge.source_id))||ids.includes(String(edge.target_id))).flatMap(edge=>[String(edge.source_id),String(edge.target_id)]))
    root.querySelectorAll('.outline-sheet').forEach(row=>row.classList.toggle('outline-related',row.dataset.outlineMembers.split(' ').some(id=>related.has(id))))
    runtime.queueThreads()
  }
}


function dialogueMedia(data){
  const media=data?.dialogue_media
  // URLs are produced by the authenticated, content-addressed local media route.
  return data?.mode!=='library'&&media&&['video','audio'].includes(media.kind)&&/^\/dialogue-media\/[a-f0-9]+\.[a-z0-9]+$/i.test(String(media.url||''))?media:null
}
function dialogueTime(value){const seconds=Math.max(0,Math.floor(Number(value)||0)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);return `${hours?`${hours}:${String(minutes).padStart(2,'0')}`:minutes}:${String(seconds%60).padStart(2,'0')}`}
function dialogueTimingRanges(media){return arr(media?.timings).flatMap(item=>(arr(item.ranges).length?item.ranges:[item]).map(range=>({passage_id:String(item.passage_id||''),start:Number(range.start_seconds),end:Number(range.end_seconds)}))).filter(row=>row.passage_id&&Number.isFinite(row.start)&&Number.isFinite(row.end)&&row.end>row.start).sort((a,b)=>a.start-b.start)}
function dialogueActiveRange(rows,time){
  // A gap in the saved evidence is deliberately not attributed to a passage.
  let low=0,high=rows.length
  while(low<high){const middle=(low+high)>>1;if(rows[middle].start<=time)low=middle+1;else high=middle}
  for(let index=low-1;index>=0;index--)if(time<rows[index].end)return rows[index]
  return null
}
function dialoguePane(data){
  const media=dialogueMedia(data);if(!media)return ''
  return `<section class="desk-window dialogue-pane" data-pane="dialogue-media" data-layer="RECORDING" style="--pane-accent:#796044"><div class="window-titlebar"><strong>${media.kind==='audio'?'AUDIO':'VIDEO'} / ${esc(media.title||'Recording')}</strong></div><div class="window-body"><p class="dialogue-pane-intro">Watch or listen alongside the source. Select a timed passage to return to its moment in the recording.</p><div class="dialogue-media-slot" data-dialogue-media-slot data-media-kind="${media.kind}"></div><div class="dialogue-caption"><small data-dialogue-speaker>TRANSCRIPT</small><p data-dialogue-caption>The transcript follows as the recording plays.</p></div>${media.timing_warning?`<p class="dialogue-timing-note">${esc(media.timing_warning)}</p>`:''}<p class="dialogue-playback-error" data-dialogue-error role="status" hidden></p></div></section>`
}
function dialogueDock(data){
  const media=dialogueMedia(data);if(!media)return ''
  return `<div class="dialogue-dock" role="group" aria-label="Recording playback"><button type="button" data-dialogue-play aria-label="Play recording"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 3 11 7-11 7z"/></svg></button><span class="dialogue-dock-title">${esc(media.title||'Recording')}</span><span class="dialogue-dock-time" data-dialogue-time>0:00 / ${dialogueTime(media.duration)}</span><input type="range" data-dialogue-seek aria-label="Recording position" min="0" max="${Math.max(1,Number(media.duration)||1)}" step="0.1" value="0"><select data-dialogue-rate aria-label="Playback speed">${[.75,1,1.25,1.5,1.75,2].map(rate=>`<option value="${rate}"${rate===1?' selected':''}>${rate}×</option>`).join('')}</select><button type="button" data-dialogue-follow aria-pressed="true">Follow transcript</button><button type="button" data-dialogue-show>${media.kind==='audio'?'Audio':'Video'} pane</button></div>`
}
function dialogueContributionFrame(contributions,time){
  const rows=arr(contributions).flatMap(contribution=>(arr(contribution.ranges).length?contribution.ranges:[contribution]).map(range=>({contribution,start:Number(range.start_seconds),end:Number(range.end_seconds)}))).filter(row=>Number.isFinite(row.start)&&Number.isFinite(row.end)&&row.end>row.start).sort((a,b)=>a.start-b.start)
  const active=rows.filter(row=>row.start<=time&&time<row.end)
  if(active.length)return {phase:'IN THIS MOMENT',entries:[...new Map(active.map(row=>[row.contribution.id,row])).values()]}
  const previous=rows.filter(row=>row.start<=time).at(-1),next=rows.find(row=>row.start>time)
  return previous?{phase:'RECENT CONTRIBUTION',entries:[previous]}:next?{phase:'UP NEXT',entries:[next]}:{phase:'EXCHANGE',entries:[]}
}
function dialogueExchangePane(data){
  const media=dialogueMedia(data);if(!media||!arr(media.contributions).length)return ''
  const groups=new Map();for(const contribution of media.contributions){const key=contribution.issue_id||contribution.question||'Conversation';if(!groups.has(key))groups.set(key,{question:contribution.question||'Conversation',items:[]});groups.get(key).items.push(contribution)}
  return `<section class="desk-window care-pane dialogue-exchange-pane" data-pane="dialogue-exchange" data-layer="EXCHANGE" style="--pane-accent:#4f7477"><div class="window-titlebar"><strong>EXCHANGE / ${esc(media.title||'Conversation')}</strong></div><div class="window-body" data-dialogue-contribution><div class="dialogue-exchange-controls"><button type="button" data-dialogue-follow aria-pressed="true">Follow transcript &amp; Exchange</button><span data-dialogue-exchange-status>All ${media.contributions.length} saved contributions</span></div><div class="care-sections">${[...groups.values()].map((group,index)=>`<details class="care-section"${index===0?' open':''}><summary><span>${String(index+1).padStart(2,'0')} · ${esc(group.question)}</span><small>${group.items.length}</small></summary><div class="axiom-list">${dialogueContributionHTML({phase:'CONTRIBUTION',entries:group.items.map(contribution=>({contribution,start:contribution.start_seconds??arr(contribution.ranges)[0]?.start_seconds}))},true)}</div></details>`).join('')}</div></div></section>`
}
function dialogueContributionHTML(frame,full=false){
  if(!frame.entries.length)return '<p class="dialogue-pane-intro">This Exchange has no timed contributions yet. The original source remains available beside it.</p>'
  return frame.entries.map(({contribution:c,start})=>`<article class="dialogue-exchange-entry" data-dialogue-contribution-id="${esc(c.id)}"><small class="dialogue-exchange-phase">${esc(frame.phase==='IN THIS MOMENT'&&c.timing_confidence==='source_context'?'FROM THIS PASSAGE':frame.phase)}${Number.isFinite(start)?` · ${dialogueTime(start)}`:' · untimed'}</small>${c.question&&!full?`<h2 class="dialogue-exchange-question">${esc(c.question)}</h2>`:''}<h3 class="dialogue-exchange-voice">${esc(c.speaker_name||'Speaker')}</h3><span class="dialogue-exchange-kind">${esc(c.kind||'Contribution')}${c.attribution_status==='provisional'?' · provisional attribution':''}</span><p class="dialogue-exchange-text">${esc(c.text)}</p>${dialogueTraceNote(c)}<div class="dialogue-exchange-actions">${arr(c.passage_ids).map((id,index)=>`<button type="button" data-dialogue-evidence="${esc(id)}">Read the transcript${arr(c.passage_ids).length>1?` · ${index+1}`:''} ↗</button>`).join('')}${Number.isFinite(start)?`<button type="button" data-dialogue-moment="${start}">Play from ${dialogueTime(start)} ↗</button>`:''}</div>${arr(c.care_details).length?`<section class="dialogue-exchange-care"><small>MORE FROM THIS PASSAGE · CARE</small>${arr(c.care_details).map(detail=>`<article><small>${esc(detail.section_title||'CARE')}${detail.stance?` · ${esc(detail.stance)}`:''}</small><p>${esc(detail.text)}</p>${dialogueTraceNote(detail)}${dialogueMainPremises(detail)}${arr(detail.passage_ids).map((id,index)=>`<button type="button" class="dialogue-care-evidence" data-dialogue-evidence="${esc(id)}">Read this CARE evidence${arr(detail.passage_ids).length>1?` · ${index+1}`:''} ↗</button>`).join('')}</article>`).join('')}</section>`:''}</article>`).join('')
}
function dialogueMainPremises(item){return arr(item.resolved_source_trace).map(id=>`<button type="button" class="dialogue-care-evidence" data-dialogue-care-premise="${esc(id)}">Premise · ${esc(id)} ↗</button>`).join('')}
function replaceStudyDeskMarkup(runtime,markup){
  const root=runtime.root,host=runtime.dialoguePlayer?.host
  if(!host||host.parentNode!==root){root.innerHTML=markup;return}
  // Keep the actual media element connected while source/route panes redraw.
  // Replacing innerHTML here would interrupt playback even at the same URL.
  const template=root.ownerDocument.createElement('template');template.innerHTML=markup
  for(const child of [...root.childNodes])if(child!==host)child.remove()
  root.insertBefore(template.content,host)
}
function setupDialoguePlayer(runtime){
  const root=runtime.root,view=root.ownerDocument.defaultView
  const pause=()=>runtime.dialoguePlayer?.media.pause()
  const save=()=>{const player=runtime.dialoguePlayer;if(!player)return;const state=player.thinker;try{view?.sessionStorage?.setItem(`care-dialogue-playback/1:${player.id}`,JSON.stringify({time:player.media.currentTime,rate:player.media.playbackRate,follow:player.follow,thinker:state?{id:state.id,follow:state.follow,mode:state.mode,wb:state.wb}:null}))}catch(_){}}
  const play=()=>{const player=runtime.dialoguePlayer;if(!player)return;const pending=player.media.play();pending?.catch(()=>{player.error='Press play to start the recording.';runtime.paintDialoguePlayer()})}
  runtime.disposeDialoguePlayer=()=>{const player=runtime.dialoguePlayer;if(!player)return;save();pause();player.host.remove();runtime.dialoguePlayer=null;delete root.dataset.dialogueReady}
  runtime.seekDialogue=time=>{const player=runtime.dialoguePlayer;if(!player||!Number.isFinite(Number(time)))return;const limit=Number.isFinite(player.media.duration)?player.media.duration:Number(player.payload.duration)||Infinity,value=Math.max(0,Math.min(Number(time),limit));player.pendingTime=Number(player.media.readyState)===0?value:null;try{player.media.currentTime=value}catch(_){player.pendingTime=value}player.activePassage='';runtime.paintDialoguePlayer();save()}
  runtime.scrollDialogueCard=card=>{const body=card?.closest('.window-body');if(!body)return;const a=card.getBoundingClientRect(),b=body.getBoundingClientRect(),scale=(b.height/Number(body.offsetHeight))||1;body.scrollTop+=(a.top-b.top-b.height*.2)/scale;runtime.positionDialoguePlayer()}
  runtime.positionDialoguePlayer=()=>{
    const player=runtime.dialoguePlayer;if(!player)return
    const slot=root.querySelector('[data-dialogue-media-slot]'),pane=slot?.closest('[data-pane]'),strip=root.querySelector('[data-strip]')
    // Native focus/scrollIntoView can move an overflow-hidden axis when panes
    // are scaled. Only pane bodies scroll vertically; keep the track anchored.
    if(strip?.scrollTop)strip.scrollTop=0
    const parked=!slot||!strip||Boolean(pane?.classList.contains('care-pane-minimized'))
    player.host.dataset.parked=String(parked)
    player.host.inert=parked;player.host.setAttribute('aria-hidden',String(parked))
    if(parked)return
    const rect=slot.getBoundingClientRect(),bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect(),body=slot.closest('.window-body')?.getBoundingClientRect()||clip
    const edge={top:Math.max(body.top,clip.top,bounds.top),bottom:Math.min(body.bottom,clip.bottom,bounds.bottom),left:Math.max(clip.left,bounds.left),right:Math.min(clip.right,bounds.right)}
    if(!rect.width||!rect.height||rect.right<=edge.left||rect.left>=edge.right||rect.bottom<=edge.top||rect.top>=edge.bottom){player.host.dataset.parked='true';player.host.inert=true;player.host.setAttribute('aria-hidden','true');return}
    // Track zoom scales the pane; positioning follows its rendered rectangle.
    const scale=(bounds.width/Number(root.offsetWidth))||1
    Object.assign(player.host.style,{left:`${(rect.left-bounds.left)/scale-root.clientLeft}px`,top:`${(rect.top-bounds.top)/scale-root.clientTop}px`,width:`${rect.width/scale}px`,height:`${rect.height/scale}px`,clipPath:`inset(${Math.max(0,edge.top-rect.top)/scale}px ${Math.max(0,rect.right-edge.right)/scale}px ${Math.max(0,rect.bottom-edge.bottom)/scale}px ${Math.max(0,edge.left-rect.left)/scale}px)`})
  }
  runtime.paintDialoguePlayer=()=>{
    const player=runtime.dialoguePlayer;if(!player)return
    const media=player.media,time=Number(media.currentTime)||0,duration=Number.isFinite(media.duration)?media.duration:Number(player.payload.duration)||0,playing=!media.paused&&!media.ended
    const button=root.querySelector('[data-dialogue-play]');if(button){button.setAttribute('aria-label',playing?'Pause recording':'Play recording');button.innerHTML=`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${playing?'M5 3h4v14H5zM12 3h4v14h-4z':'m6 3 11 7-11 7z'}"/></svg>`}
    const clock=root.querySelector('[data-dialogue-time]');if(clock)clock.textContent=`${dialogueTime(time)} / ${dialogueTime(duration)}`
    const seek=root.querySelector('[data-dialogue-seek]');if(seek){seek.max=String(Math.max(1,duration));if(!player.scrubbing)seek.value=String(time);seek.setAttribute('aria-valuetext',`${dialogueTime(time)} of ${dialogueTime(duration)}`)}
    const rate=root.querySelector('[data-dialogue-rate]');if(rate)rate.value=String(media.playbackRate)
    root.querySelectorAll('[data-dialogue-follow]').forEach(follow=>follow.setAttribute('aria-pressed',String(player.follow)))
    const error=root.querySelector('[data-dialogue-error]');if(error){error.hidden=!player.error;error.textContent=player.error||''}
    const active=dialogueActiveRange(player.ranges,time),id=active?.passage_id||'',changed=id!==player.activePassage
    player.activePassage=id
    root.querySelectorAll('[data-select-passage]').forEach(card=>{const current=card.dataset.selectPassage===id;card.classList.toggle('dialogue-speaking',current);if(current)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current')})
    if(changed&&id&&player.follow){const card=root.querySelector(`[data-select-passage="${CSS.escape(id)}"]`),body=card?.closest('.window-body');if(card&&body&&!card.closest('.care-pane-minimized')){const a=card.getBoundingClientRect(),b=body.getBoundingClientRect();if(a.top<b.top+24||a.bottom>b.bottom-24){const scale=(b.height/Number(body.offsetHeight))||1;body.scrollTop+=((a.top-b.top)-b.height*.25)/scale}}}
    const cue=dialogueActiveRange(player.cues,time),caption=root.querySelector('[data-dialogue-caption]'),speaker=root.querySelector('[data-dialogue-speaker]')
    if(caption)caption.textContent=cue?.text||(id?player.passageText.get(id):'')||'The transcript follows as the recording plays.'
    if(speaker)speaker.textContent=cue?.speaker_label?`TRANSCRIPT · ${cue.speaker_label}`:'TRANSCRIPT'
    const contribution=root.querySelector('[data-dialogue-contribution]')
    if(contribution){const frame=dialogueContributionFrame(player.payload.contributions,time),active=frame.phase==='IN THIS MOMENT'?frame.entries:[],ids=new Set(active.map(row=>String(row.contribution.id))),frameKey=JSON.stringify([...ids]);contribution.querySelectorAll('[data-dialogue-contribution-id]').forEach(card=>card.classList.toggle('dialogue-speaking',ids.has(card.dataset.dialogueContributionId)));const status=contribution.querySelector('[data-dialogue-exchange-status]');if(status)status.textContent=player.follow?(active.length?'Following the recording':'Browse all saved contributions'):'Reading freely';if(player.follow&&active.length&&contribution.dataset.frame!==frameKey){const card=contribution.querySelector(`[data-dialogue-contribution-id="${CSS.escape(String(active[0].contribution.id))}"]`);if(card){const section=card.closest('details');if(section)section.open=true;const a=card.getBoundingClientRect(),b=contribution.getBoundingClientRect(),scale=(b.height/Number(contribution.offsetHeight))||1;contribution.scrollTop+=(a.top-b.top-b.height*.18)/scale}}contribution.dataset.frame=frameKey}
    if(Math.abs(time-player.savedAt)>=5){player.savedAt=time;save()}
  }
  runtime.mountDialoguePlayer=()=>{
    const payload=dialogueMedia(runtime.data)
    if(!payload){runtime.disposeDialoguePlayer();return}
    const id=`${payload.source_id||payload.work_id||''}|${payload.url}`
    if(runtime.dialoguePlayer?.id!==id){
      runtime.disposeDialoguePlayer()
      const host=root.ownerDocument.createElement('div'),media=root.ownerDocument.createElement(payload.kind)
      host.className='dialogue-media-host';host.dataset.dialogueMediaHost='';host.append(media);root.append(host)
      media.controls=true;media.preload='metadata';media.setAttribute('playsinline','');media.setAttribute('aria-label',payload.title||'Recording');media.src=payload.url
      let saved={};try{saved=JSON.parse(view?.sessionStorage?.getItem(`care-dialogue-playback/1:${id}`)||'{}')}catch(_){}
      const thinker=saved.thinker?{id:String(saved.thinker.id||''),follow:saved.thinker.follow!==false,mode:saved.thinker.mode==='care'?'care':'comparison',wb:String(saved.thinker.wb||''),match:''}:null
      const player={id,host,media,payload,follow:saved.follow!==false,thinker,ranges:[],cues:[],passageText:new Map(),activePassage:'',savedAt:0,pendingTime:Math.max(0,Number(saved.time)||0),error:''};runtime.dialoguePlayer=player
      media.playbackRate=[.75,1,1.25,1.5,1.75,2].includes(Number(saved.rate))?Number(saved.rate):1
      media.addEventListener('loadedmetadata',()=>{if(runtime.dialoguePlayer!==player)return;if(player.pendingTime!==null){const time=player.pendingTime;player.pendingTime=null;runtime.seekDialogue(time)}runtime.paintDialoguePlayer()})
      for(const event of ['timeupdate','play','pause','ended','durationchange','ratechange','seeked'])media.addEventListener(event,()=>{if(runtime.dialoguePlayer!==player)return;runtime.paintDialoguePlayer();if(['pause','seeked','ratechange'].includes(event))save()})
      media.addEventListener('playing',()=>{if(runtime.dialoguePlayer!==player)return;player.error='';runtime.paintDialoguePlayer()})
      media.addEventListener('error',()=>{if(runtime.dialoguePlayer!==player)return;player.error='This recording could not be played. The transcript is still available.';runtime.paintDialoguePlayer()})
    }
    const player=runtime.dialoguePlayer;player.payload=payload;player.ranges=dialogueTimingRanges(payload);player.cues=arr(payload.cues).filter(cue=>Number.isFinite(cue.start)&&Number.isFinite(cue.end)&&cue.end>cue.start).sort((a,b)=>a.start-b.start)
    player.passageText=new Map(arr(runtime.data?.stack?.active_chapter?.passages).map(row=>[String(row.id),String(row.text||'')]))
    root.dataset.dialogueReady='true'
    const byId=new Map(arr(payload.timings).map(row=>[String(row.passage_id),row]))
    root.querySelectorAll('[data-select-passage]').forEach(card=>{const timing=byId.get(card.dataset.selectPassage);if(!timing)return;const address=card.querySelector('.passage-address');if(address&&!address.querySelector('.dialogue-passage-time')){const timestamp=root.ownerDocument.createElement('span');timestamp.className='dialogue-passage-time';timestamp.textContent=`↗ ${dialogueTime(timing.start_seconds)}`;timestamp.title='Select this passage to seek the recording';address.append(timestamp)}})
    runtime.paintDialoguePlayer();runtime.positionDialoguePlayer()
  }
  runtime.onDialogueInput=event=>{if(event.target?.matches?.('[data-dialogue-seek]')){const player=runtime.dialoguePlayer;if(player){player.scrubbing=event.type==='input';runtime.seekDialogue(Number(event.target.value))}}else if(event.target?.matches?.('[data-dialogue-rate]')){if(runtime.dialoguePlayer){runtime.dialoguePlayer.media.playbackRate=Number(event.target.value);save()}}}
  const click=runtime.onClick
  runtime.onClick=event=>{
    const target=event.target,player=runtime.dialoguePlayer
    if(target?.closest?.('.dialogue-media-host'))return
    if(target?.closest?.('[data-dialogue-play]')){if(player){player.media.paused?play():pause()}return}
    if(target?.closest?.('[data-dialogue-follow]')){if(player){player.follow=!player.follow;player.activePassage='';runtime.paintDialoguePlayer();save()}return}
    if(target?.closest?.('[data-dialogue-show]')){if(runtime.readerView==='outline')runtime.setReaderView('normal');const pane=root.querySelector('[data-pane="dialogue-media"]');if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click();runtime.focus('dialogue-media');runtime.positionDialoguePlayer();return}
    const moment=target?.closest?.('[data-dialogue-moment]');if(moment){runtime.seekDialogue(Number(moment.dataset.dialogueMoment));play();return}
    const premise=target?.closest?.('[data-dialogue-care-premise]');if(premise){const id=premise.dataset.dialogueCarePremise,card=root.querySelector(`[data-select-axiom="${CSS.escape(id)}"],[data-select-passage="${CSS.escape(id)}"]`);if(card){const pane=card.closest('[data-pane]'),section=card.closest('details');if(section)section.open=true;if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click();runtime.selectAxiom(card);runtime.focus(pane?.dataset.pane||'source');runtime.scrollDialogueCard(card)}else runtime.api?.setTriggerValue('open_reference',id);return}
    const evidence=target?.closest?.('[data-dialogue-evidence]');if(evidence){const id=evidence.dataset.dialogueEvidence,card=root.querySelector(`[data-select-passage="${CSS.escape(id)}"]`);if(card){const pane=card.closest('[data-pane]');if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click();runtime.selectAxiom(card);runtime.focus(pane?.dataset.pane||'source');runtime.scrollDialogueCard(card)}else runtime.api?.setTriggerValue('open_reference',id);return}
    return click(event)
  }
  const select=runtime.selectAxiom;runtime.selectAxiom=button=>{const id=button?.dataset?.selectPassage,player=runtime.dialoguePlayer,timing=id&&arr(player?.payload.timings).find(row=>String(row.passage_id)===id);if(timing)runtime.seekDialogue(timing.start_seconds);return select(button)}
  const outline=runtime.applyOutline;runtime.applyOutline=()=>{outline?.();runtime.positionDialoguePlayer();runtime.paintDialoguePlayer()}
  const zoom=runtime.applyTrackZoom;runtime.applyTrackZoom=()=>{zoom?.();runtime.positionDialoguePlayer()}
  const key=runtime.onKey;runtime.onKey=event=>{if(event.target?.closest?.('.dialogue-media-host'))return;return key?.(event)}
  runtime.watchDialoguePlayer=()=>{
    if(!runtime.dialoguePlayer)return ()=>{}
    root.addEventListener('scroll',runtime.positionDialoguePlayer,true);root.addEventListener('input',runtime.onDialogueInput);root.addEventListener('change',runtime.onDialogueInput)
    const resize=view?.ResizeObserver?new view.ResizeObserver(runtime.positionDialoguePlayer):null;resize?.observe(root);const strip=root.querySelector('[data-strip]');if(strip)resize?.observe(strip);const slot=root.querySelector('[data-dialogue-media-slot]');if(slot)resize?.observe(slot)
    view?.addEventListener('pagehide',save)
    return ()=>{save();root.removeEventListener('scroll',runtime.positionDialoguePlayer,true);root.removeEventListener('input',runtime.onDialogueInput);root.removeEventListener('change',runtime.onDialogueInput);resize?.disconnect();view?.removeEventListener('pagehide',save);view?.setTimeout(()=>{if(!root.isConnected)runtime.disposeDialoguePlayer()},0)}
  }
  setupDialogueThinkers(runtime)
}

const dialogueThinkers=data=>dialogueMedia(data)?arr(data.dialogue_media.thinker_comparisons):[]
function dialogueThinkerPane(data){
  if(!dialogueThinkers(data).length)return ''
  return '<section class="desk-window care-pane dialogue-thinker-pane" data-pane="dialogue-thinkers" data-layer="THINKERS" style="--pane-accent:#73578c"><div class="window-titlebar"><strong>THINKERS / Saved comparisons</strong></div><div class="window-body" data-dialogue-thinker-body></div></section>'
}
function dialogueWBPane(data){
  if(!dialogueThinkers(data).some(run=>arr(run.wb_sources).length))return ''
  return '<section class="desk-window care-pane dialogue-wb-pane" data-pane="dialogue-wb" data-layer="WB" style="--pane-accent:#a26558"><div class="window-titlebar"><strong>WB / Saved comparison source</strong></div><div class="window-body" data-dialogue-wb-body></div></section>'
}
function dialogueThinkerStatements(run,mode='comparison'){
  const care=arr(run?.care?.sections).flatMap(section=>arr(section.items).map(item=>({...item,desk_id:`care:${item.id}`})))
  const comparison=arr(run?.comparisons).map(item=>({...item,desk_id:`comparison:${item.id}`})),speakers=arr(run?.speaker_reconstructions).map((item,index)=>({...item,desk_id:`speaker:${index}`}))
  return mode==='care'?[...care,...comparison,...speakers]:[...comparison,...speakers,...care]
}
function dialogueThinkerMatch(runs,time,mode='comparison'){
  const matches=[]
  for(const run of runs)for(const statement of dialogueThinkerStatements(run,mode))for(const range of arr(statement.ranges))if(Number(range.start_seconds)<=time&&time<Number(range.end_seconds))matches.push({run,statement,start:Number(range.start_seconds),end:Number(range.end_seconds)})
  const rank=row=>row.statement.desk_id.startsWith(mode==='care'?'care:':'comparison:')?0:row.statement.desk_id.startsWith('speaker:')?2:1
  return matches.sort((a,b)=>rank(a)-rank(b)||(a.end-a.start)-(b.end-b.start)||b.start-a.start)[0]||null
}
function dialogueTraceNote(item){
  const status=item?.trace_status,gaps=arr(item?.trace_gaps)
  if(!status&&!gaps.length||status?.status==='resolved'&&!gaps.length)return ''
  if(status?.status==='deeper_route'&&gaps.every(gap=>gap.reason==='outside_snapshot'))return '<p class="dialogue-trace-status" data-trace-status="deeper_route">Preserved routes available · continue in Routes to follow the original sources.</p>'
  const label=status?.has_evidence?'Some source traces are unavailable':'No verified source trace'
  return gaps.length?`<details class="dialogue-trace-status"><summary>${label}</summary>${gaps.map(gap=>`<p>${esc(gap.label||gap.id||'Source trace')}${gap.reason?` · ${esc(gap.reason)}`:''}</p>`).join('')}</details>`:`<p class="dialogue-trace-status">${label}</p>`
}
function dialogueThinkerEvidence(item,run){
  const passages=arr(item.passage_ids),books=[...new Map(arr(item.wb_evidence).map(ref=>[`${ref.unit_id}:${ref.care_item_id}`,ref])).values()],careIds=new Set(arr(run?.care?.sections).flatMap(section=>arr(section.items).map(row=>String(row.id))))
  const premises=arr(item.resolved_source_trace).filter(id=>careIds.has(String(id)))
  return `<div class="dialogue-thinker-evidence">${passages.map((passage,index)=>`<button type="button" data-dialogue-evidence="${esc(passage)}">Read the transcript${passages.length>1?` · ${index+1}`:''} ↗</button>`).join('')}${books.map(ref=>`<button type="button" data-dialogue-wb-evidence="${esc(ref.unit_id)}" data-dialogue-wb-item="${esc(ref.care_item_id)}" title="${esc(ref.quote||'Read this original saved whole-book CARE item')}">Read WB · ${esc(ref.care_item_id)} ↗</button>`).join('')}${premises.map(id=>`<button type="button" data-dialogue-thinker-premise="${esc(id)}">Premise · ${esc(id)} ↗</button>`).join('')}</div>${dialogueTraceNote(item)}`
}
function dialogueThinkerComparison(run){
  const corpus=run.corpus_reconstruction||{},name=run.thinker?.name||'Thinker'
  return `<div class="dialogue-thinker-copy"><small>IN THE LIBRARY’S WHOLE-BOOK CARE</small><h2>${esc(name)}</h2><p>${esc(corpus.summary||run.summary||'')}</p>${arr(corpus.claims).map(item=>`<article class="dialogue-thinker-statement"><p>${esc(item.text)}</p>${dialogueThinkerEvidence(item,run)}</article>`).join('')}${arr(run.speaker_reconstructions).map((item,index)=>`<article class="dialogue-thinker-statement" data-dialogue-thinker-statement="speaker:${index}"><small>IN THIS CONVERSATION${item.attribution_status==='provisional'?' · PROVISIONAL ATTRIBUTION':''}</small><h3>${esc(item.speaker_name||'Speaker')}</h3><p>${esc(item.summary)}</p>${item.how_invoked?`<small>HOW THE THINKER IS USED</small><p>${esc(item.how_invoked)}</p>`:''}${item.why_invoked?`<small>WHAT THIS DOES IN THE EXCHANGE</small><p>${esc(item.why_invoked)}</p><p class="dialogue-thinker-note">${item.purpose_status==='explicit'?'Purpose stated in the conversation':item.purpose_status==='inferred'?'Purpose inferred by this reading':'Purpose remains unclear'}</p>`:''}${dialogueThinkerEvidence(item,run)}</article>`).join('')}${arr(run.comparisons).map(item=>`<article class="dialogue-thinker-statement" data-dialogue-thinker-statement="comparison:${esc(item.id)}"><small>${esc(String(item.dimension||'Comparison').replaceAll('_',' '))} · ${esc(item.speaker_name||'Speaker')}</small><h3>${esc(item.title)}</h3><p>${esc(item.account)}</p>${dialogueThinkerEvidence(item,run)}</article>`).join('')}${run.scope_notice?`<p class="dialogue-thinker-note">${esc(run.scope_notice)}</p>`:''}${arr(run.limits).length?`<details><summary>Scope and limits</summary>${arr(run.limits).map(text=>`<p class="dialogue-thinker-note">${esc(text)}</p>`).join('')}</details>`:''}</div>`
}
function dialogueThinkerCare(run){
  const sections=arr(run.care?.sections)
  return `<header class="care-head"><span class="pane-kicker">COMPARISON CARE</span><h2>${esc(run.thinker?.name||'Thinker')}</h2><p>${esc(run.summary||'')}</p></header><div class="care-sections">${sections.map((section,index)=>`<details class="care-section"${index===0?' open':''}><summary><span>${esc(section.number||index+1)} · ${esc(section.title)}</span><small>${arr(section.items).length}</small></summary><div class="axiom-list">${arr(section.items).map(item=>`<article class="dialogue-thinker-statement" data-dialogue-thinker-statement="care:${esc(item.id)}"><small>${esc(item.id)} · ${esc(item.perspective==='speaker'?item.speaker_name||'Speaker':item.perspective==='library'?'Library reconstruction':'Comparison reconstruction')}${item.attribution_status==='provisional'?' · provisional attribution':''}</small><p class="dialogue-exchange-text">${esc(item.text)}</p>${dialogueThinkerEvidence(item,run)}</article>`).join('')}</div></details>`).join('')||'<p class="dialogue-pane-intro">This saved comparison has no CARE sheet.</p>'}</div>`
}
function dialogueWBContent(run,source){
  if(!source)return '<div class="dialogue-thinker-copy"><p>No whole-book source was saved for this comparison.</p></div>'
  const groups=new Map();for(const item of arr(source.record?.items)){const key=String(item.section_number||'');if(!groups.has(key))groups.set(key,{name:item.section_name||'Whole-book CARE',number:key,items:[]});groups.get(key).items.push(item)}
  const pin=source.pin?.revision_id||source.revision_id||''
  return `<div class="dialogue-wb-controls"><label for="dialogue-wb-select">Original WB</label><select id="dialogue-wb-select" data-dialogue-wb-select aria-label="Saved whole-book source">${arr(run.wb_sources).map(book=>`<option value="${esc(book.unit_id)}"${book.unit_id===source.unit_id?' selected':''}>${esc(book.title||book.unit_id)}</option>`).join('')}</select></div><header class="care-head"><span class="pane-kicker">SAVED WHOLE-BOOK CARE</span><h2>${esc(source.title||source.unit_id)}</h2><p>${esc(source.author||'')}${pin?` · saved revision ${esc(pin)}`:''}</p>${source.route_available===false&&source.route_reason?`<p class="dialogue-thinker-note">Full route unavailable · ${esc(source.route_reason)}</p>`:''}</header>${groups.size?`<div class="care-sections">${[...groups.values()].map((group,index)=>`<details class="care-section"${index===0?' open':''}><summary><span>${esc(group.number)} · ${esc(group.name)}</span><small>${group.items.length}</small></summary><div class="axiom-list">${group.items.map(item=>`<article class="dialogue-wb-item" tabindex="-1" data-dialogue-wb-snapshot-item="${esc(item.care_item_id||item.local_id)}" data-dialogue-wb-local-id="${esc(item.local_id||'')}"><span class="axiom-id">${esc(item.care_item_id||item.local_id)}</span><p>${esc(item.item_text||'')}</p>${dialogueTraceNote(item)}${dialogueWBRouteButton(run,source,item)}</article>`).join('')}</div></details>`).join('')}</div>`:`<div class="dialogue-wb-markdown">${esc(source.markdown||'This saved source has no readable text.')}</div>`}`
}
function dialogueWBRouteButton(run,source,item){
  const direct=arr(item.resolved_source_trace),distant=arr(item.resolved_deep_source_trace).filter(id=>!direct.includes(id)),links=(ids,label)=>ids.map(id=>`<button type="button" data-dialogue-wb-evidence="${esc(source.unit_id)}" data-dialogue-wb-item="${esc(id)}">${label} · ${esc(id)} ↗</button>`).join('')
  return `<div class="dialogue-thinker-evidence">${links(direct,'Premise')}${links(distant,'Recorded ancestor')}${item.route_available===true?`<button type="button" data-dialogue-wb-route="${esc(item.care_item_id)}" data-dialogue-route-run="${esc(run.id)}" data-dialogue-route-unit="${esc(source.unit_id)}">Open Routes ↗</button>`:''}</div>`
}
function setupDialogueThinkers(runtime){
  const root=runtime.root
  runtime.paintDialogueThinkers=()=>{
    const player=runtime.dialoguePlayer,runs=dialogueThinkers(runtime.data),body=root.querySelector('[data-dialogue-thinker-body]');if(!player||!body||!runs.length)return
    const state=player.thinker||(player.thinker={id:runs[0].id,follow:true,mode:'comparison',wb:'',match:''}),time=Number(player.media.currentTime)||0
    const match=dialogueThinkerMatch(runs,time,state.mode)
    if(state.follow&&match)state.id=match.run.id
    const run=runs.find(row=>row.id===state.id)||runs[0];state.id=run.id
    const frame=`${run.id}|${state.mode}`,selectedMatch=match?.run.id===run.id?match:null
    let controlsChanged=false
    if(body.dataset.frame!==frame){body.innerHTML=`<div class="dialogue-thinker-controls"><select data-dialogue-thinker-select aria-label="Saved thinker comparison">${runs.map(row=>`<option value="${esc(row.id)}"${row.id===run.id?' selected':''}>${esc(row.thinker?.name||'Thinker')}</option>`).join('')}</select><button type="button" data-dialogue-thinker-follow aria-pressed="${state.follow}">Follow recording</button><button type="button" data-dialogue-thinker-mode="comparison" aria-pressed="${state.mode==='comparison'}">Comparison</button><button type="button" data-dialogue-thinker-mode="care" aria-pressed="${state.mode==='care'}">CARE</button><small data-dialogue-thinker-phase></small></div>${state.mode==='care'?dialogueThinkerCare(run):dialogueThinkerComparison(run)}`;body.dataset.frame=frame;body.scrollTop=0;controlsChanged=true;state.match='';const title=body.closest('[data-pane]')?.querySelector('.window-titlebar strong');if(title)title.textContent=`THINKERS / ${run.thinker?.name||'Saved comparison'}`}
    const follow=body.querySelector('[data-dialogue-thinker-follow]');follow?.setAttribute('aria-pressed',String(state.follow))
    const phase=body.querySelector('[data-dialogue-thinker-phase]');if(phase)phase.textContent=!state.follow?'Reading selected thinker':selectedMatch?`From this passage · ${dialogueTime(selectedMatch.start)}`:state.match?'Last matched passage':'Saved comparison · waiting for a matched passage'
    const activeId=state.follow?selectedMatch?.statement.desk_id||'':''
    body.querySelectorAll('[data-dialogue-thinker-statement]').forEach(card=>card.classList.toggle('dialogue-speaking',Boolean(activeId&&card.dataset.dialogueThinkerStatement===activeId)))
    if(activeId&&activeId!==state.match){const card=body.querySelector(`[data-dialogue-thinker-statement="${CSS.escape(activeId)}"]`);if(card){const section=card.closest('details');if(section)section.open=true;const a=card.getBoundingClientRect(),b=body.getBoundingClientRect(),scale=(b.height/Number(body.offsetHeight))||1;body.scrollTop+=(a.top-b.top-b.height*.2)/scale}state.match=activeId}
    const sources=arr(run.wb_sources),preferred=state.follow&&selectedMatch?arr(selectedMatch.statement.wb_evidence)[0]?.unit_id:''
    const source=sources.find(row=>row.unit_id===(preferred||state.wb))||sources[0];state.wb=source?.unit_id||''
    const wbBody=root.querySelector('[data-dialogue-wb-body]'),wbFrame=`${run.id}|${state.wb}`
    if(wbBody&&wbBody.dataset.frame!==wbFrame){wbBody.innerHTML=dialogueWBContent(run,source);wbBody.dataset.frame=wbFrame;wbBody.scrollTop=0;controlsChanged=true;const title=wbBody.closest('[data-pane]')?.querySelector('.window-titlebar strong');if(title)title.textContent=`WB / ${source?.title||'Saved comparison source'}`}
    if(controlsChanged&&typeof installPaneControls==='function'){installPaneControls(root,runtime.paneControlState||(runtime.paneControlState={}),()=>{runtime.queueTrackZoom?.();runtime.positionDialoguePlayer?.()},String(runtime.data?.stack?.work?.id||''));runtime.queueTrackZoom?.();runtime.paintFocus?.()}
  }
  const paint=runtime.paintDialoguePlayer;runtime.paintDialoguePlayer=()=>{paint();runtime.paintDialogueThinkers()}
  const input=runtime.onDialogueInput;runtime.onDialogueInput=event=>{
    const state=runtime.dialoguePlayer?.thinker,target=event.target
    if(state&&target?.matches?.('[data-dialogue-thinker-select]')){state.id=target.value;state.follow=false;state.wb='';state.match='';runtime.paintDialogueThinkers();return}
    if(state&&target?.matches?.('[data-dialogue-wb-select]')){state.wb=target.value;state.follow=false;runtime.paintDialogueThinkers();return}
    return input(event)
  }
  const click=runtime.onClick;runtime.onClick=event=>{
    const target=event.target,state=runtime.dialoguePlayer?.thinker
    if(state&&target?.closest?.('[data-dialogue-thinker-follow]')){state.follow=!state.follow;state.match='';runtime.paintDialogueThinkers();return}
    const mode=target?.closest?.('[data-dialogue-thinker-mode]');if(state&&mode){state.mode=mode.dataset.dialogueThinkerMode;state.match='';runtime.paintDialogueThinkers();return}
    const premise=target?.closest?.('[data-dialogue-thinker-premise]');if(state&&premise){state.follow=false;state.mode='care';runtime.paintDialogueThinkers();const pane=root.querySelector('[data-pane="dialogue-thinkers"]'),card=pane?.querySelector(`[data-dialogue-thinker-statement="${CSS.escape('care:'+premise.dataset.dialogueThinkerPremise)}"]`);if(card){const section=card.closest('details');if(section)section.open=true;card.setAttribute('tabindex','-1');card.focus({preventScroll:true});runtime.scrollDialogueCard(card)}return}
    const route=target?.closest?.('[data-dialogue-wb-route]');if(route){if(state)state.follow=false;runtime.api?.setTriggerValue('connection_action',{action:'dialogue_wb_route',run_id:route.dataset.dialogueRouteRun,unit_id:route.dataset.dialogueRouteUnit,reference_id:route.dataset.dialogueWbRoute});return}
    const evidence=target?.closest?.('[data-dialogue-wb-evidence]');if(state&&evidence){state.wb=evidence.dataset.dialogueWbEvidence;state.follow=false;runtime.paintDialogueThinkers();const pane=root.querySelector('[data-pane="dialogue-wb"]');if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click();runtime.focus('dialogue-wb');const id=evidence.dataset.dialogueWbItem,local=id.startsWith(state.wb+':')?id.slice(state.wb.length+1):id;const card=[...(pane?.querySelectorAll('[data-dialogue-wb-snapshot-item]')||[])].find(row=>[id,local,`${state.wb}:${local}`].includes(row.dataset.dialogueWbSnapshotItem)||row.dataset.dialogueWbLocalId===local);pane?.querySelectorAll('.dialogue-evidence-active').forEach(row=>row.classList.remove('dialogue-evidence-active'));if(card){const section=card.closest('details');if(section)section.open=true;card.classList.add('dialogue-evidence-active');card.focus({preventScroll:true});runtime.scrollDialogueCard(card)}return}
    return click(event)
  }
}

export default function(component){
  const {parentElement,data,setStateValue,setTriggerValue}=component
  const root=parentElement.querySelector("[data-study-desk]");if(!root)return
  try {
    let runtime=INSTANCES.get(parentElement);if(!runtime||runtime.root!==root){runtime=setup(root);INSTANCES.set(parentElement,runtime)}
    root.ownerDocument.defaultView?.addEventListener("care-reference-viewer-ready",runtime.onViewerReady)
    root.addEventListener("click",runtime.onClick)
    root.addEventListener("keydown",runtime.onKey)
    root.addEventListener("contextmenu",runtime.onBookContextMenu)
    root.addEventListener("scroll",runtime.onBookMenuScroll,true)
    root.ownerDocument.addEventListener("pointerdown",runtime.onBookMenuOutside,true)
    root.ownerDocument.defaultView?.addEventListener("resize",runtime.onBookMenuResize)
    root.addEventListener("input",runtime.onSliderInput)
    root.addEventListener("change",runtime.onSliderChange)
    root.addEventListener("pointerup",runtime.onSliderChange)
    root.addEventListener("input",runtime.onRouteDirectionInput)
    root.addEventListener("change",runtime.onRouteDirectionChange)
    root.addEventListener("input",runtime.onShelfInput)
    root.addEventListener("change",runtime.onShelfInput)
    root.addEventListener("change",runtime.onConnectionChange)
    root.addEventListener("change",runtime.onVersionChange)
    root.addEventListener("scroll",runtime.onConnectionTabsScroll,true)
    root.addEventListener("wheel",runtime.onWheel,{passive:false,capture:true})
    root.addEventListener("scroll",runtime.queueThreads,true)
    root.addEventListener("toggle",runtime.queueThreads,true)
    root.addEventListener("toggle",runtime.onSectionToggle,true)
    for(const event of ["pointerover","pointerout","focusin","focusout"])root.addEventListener(event,runtime.onRouteHover)
    runtime.beforeOutlineRender?.()
    const previousConnection=runtime.data?.connection,previousFocused=runtime.focused
    runtime.api={setStateValue,setTriggerValue};runtime.data=data||{}
    const shelfReset=data?.mode==="library"&&runtime.syncShelf(data)
    runtime.attachConnectionDiscovery?.()
    runtime.attachBuildVersionMenu?.()
    runtime.attachSheetVersionMenu?.()
    runtime.attachPaneBookmarks?.()
    runtime.attachSliderJumpMenu?.()
    const bookmarkMenuWork=runtime.bookmarkMenu?.workId||runtime.bookmarkMenuRestore
    runtime.bookmarkMenuRestore=null
    const stopWorkspaceFit=workspaceFitReader(runtime)
    const mode=String(data?.mode||"workspace"),stack=data?.stack||{},nextSignature=`${mode}|${stack?.work?.id||""}|${stack?.active_raw_unit_id||""}|${arr(stack?.care_path).map(unit=>unit.id).join(",")}${isRouteReference(data?.reference)?`|routes/4:${routeMode(data.reference)}`:""}`,nextReference=String(data?.reference?.id||"")
    const versionMenus=runtime.captureVersionMenus()
    const previousStrip=root.querySelector("[data-strip]"),previousLeft=previousStrip?.scrollLeft||0,signatureChanged=runtime.signature!==nextSignature,referenceChanged=Boolean(nextReference&&runtime.referenceId!==nextReference)
    const sameWork=runtime.workId===String(stack?.work?.id||""),sameReference=runtime.referenceId===nextReference,sameConnection=runtime.connectionId===String(data?.connection?.id||"")
    // Replacing chapter markup must not reset the user's position on each line.
    // Keep offsets while Routes temporarily hides the sliders; reset for a new book.
    if(sameWork)runtime.rememberSliders();else runtime.sliderScrollPositions.clear()
    const resumedSnapshot=(!sameWork||!sameConnection)?workspaceReadSnapshot(root,String(stack?.work?.id||""),nextSignature,nextReference,data?.workspace_context||"",String(data?.connection?.id||"")):null
    if(!sameWork){runtime.sectionMemory.clear();runtime.selectedAxiom=data?.selected_axiom||null}
    workspaceRestoreRuntime(runtime,resumedSnapshot)
    runtime.viewerSelectionPending=Boolean(resumedSnapshot?.selectedAxiom)
    // Local selection leads while an acknowledgement is in flight, so a rapid
    // series of arrow presses cannot be rolled back by an older rerun.
    if(!runtime.selectedAxiom)runtime.selectedAxiom=data?.selected_axiom||null
    if(!runtime.isRouting()&&runtime.readerView!=="outline"&&runtime.selectedAxiom){
      const selection=runtime.selectedAxiom,valid=selection.passage_id?String(stack.active_chapter?.raw_unit_id)===selection.unit_id&&arr(stack.active_chapter?.passages).some(item=>String(item.id)===selection.passage_id):arr(stack.care_path).some(unit=>String(unit.id)===selection.unit_id&&arr(unit.sections).some(section=>arr(section.items).some(item=>String(item.id)===selection.axiom_id)))
      if(!valid)runtime.selectedAxiom=null
    }
    const hadDeskFocus=Boolean(root.querySelector(":focus")),activeReading=root.querySelector("[data-select-axiom]:focus,[data-open-axiom-routes]:focus,[data-select-passage]:focus,[data-open-passage-routes]:focus"),readingFocus=activeReading?{id:activeReading.dataset.selectPassage||activeReading.dataset.openPassageRoutes||activeReading.dataset.selectAxiom||activeReading.dataset.openAxiomRoutes,passage:Boolean(activeReading.dataset.selectPassage||activeReading.dataset.openPassageRoutes),routes:Boolean(activeReading.dataset.openPassageRoutes||activeReading.dataset.openAxiomRoutes)}:null
    const favouriteFocus=root.querySelector("[data-favourite-axiom]:focus")?.dataset.favouriteAxiom
    if(sameWork&&!runtime.referenceId)root.querySelectorAll("[data-reading-sheet]").forEach(runtime.rememberSections)
    const previousLayer=paneLayerKey(root.querySelector(`[data-pane="${CSS.escape(runtime.focused)}"]`))
    const readingPositions=new Map([...root.querySelectorAll(".window-body")].map(body=>[body.dataset.readingId||body.closest("[data-pane]")?.dataset.pane,{top:body.scrollTop,sections:[...body.querySelectorAll(".care-section")].map(section=>section.open)}]))
    if(sameWork&&sameConnection&&!previousConnection?.reference&&data?.connection?.reference)runtime.connectionReadingPosition={positions:readingPositions,left:previousLeft,focused:runtime.focused}
    const returningToConnection=sameWork&&sameConnection&&previousConnection?.reference&&!data?.connection?.reference
    if(sameWork&&!runtime.referenceId&&nextReference)runtime.bookPosition={positions:readingPositions,left:previousLeft,layer:previousLayer}
    if(!resumedSnapshot&&(!sameWork||runtime.workspaceContext!==(data?.workspace_context||"")))runtime.bookPosition=null
    if(!sameWork||!sameConnection){runtime.discoveryShelfOpen=false;runtime.discoveryGate={}}
    runtime.workspaceContext=data?.workspace_context||""
    const returningToBook=sameWork&&Boolean(runtime.referenceId)&&!nextReference
    const sliderFocused=Boolean(root.querySelector("[data-sheet-slider]:focus"))
    const directionFocused=Boolean(root.querySelector("[data-route-direction]:focus"))
    const historyFocused=root.querySelector("[data-route-history]:focus")?.dataset.routeHistory
    const previousShelfTop=root.querySelector(".library-window")?.scrollTop||0
    // Selection-only state acknowledgements keep the actual focused DOM node.
    // Routes always follows its original render/restore/centring path below.
    const renderSignature=JSON.stringify({...data,selected_axiom:null,connection:data.connection?{...data.connection,selection:null}:null}),reuseReading=mode==="workspace"&&runtime.renderSignature===renderSignature
    const reuseShelf=mode==="library"&&runtime.renderSignature===renderSignature
    if(!reuseReading&&!reuseShelf){runtime.closeSliderJumpMenu?.();runtime.closeBookMenu();runtime.closeConnectionDiscovery?.();runtime.closeBuildVersionMenu?.();runtime.closeSheetVersionMenu?.();runtime.closeConnectionResolution?.();runtime.closeBookmarkMenu?.();replaceStudyDeskMarkup(runtime,mode==="library"?library(data,runtime.shelf):workspace(data))}
    runtime.renderSignature=renderSignature
    if(mode==="library")root.querySelector(".library-window").scrollTop=shelfReset?0:previousShelfTop
    root.removeAttribute("aria-busy")
    runtime.pendingSlider=null
    runtime.applySkin()
    runtime.applyTextScale()
    if(sameWork)runtime.restoreVersionMenus(versionMenus)
    runtime.refreshSliders?.()
    if(!reuseReading)runtime.restoreConnectionLayers?.()
    runtime.paintConnectionTabs?.()
    runtime.signature=nextSignature;runtime.referenceId=nextReference;runtime.workId=String(stack?.work?.id||"");runtime.connectionId=String(data?.connection?.id||"")
    const strip=root.querySelector("[data-strip]")
    if(strip){strip.addEventListener("scroll",runtime.onScroll,{passive:true});if(sameWork)strip.scrollLeft=previousLeft}
    // Direction changes can relocate different sections into peer panes.
    // Restore index-based section flags only for the same route layout.
    if(sameWork&&sameReference&&(!nextReference||!signatureChanged))root.querySelectorAll(".window-body").forEach(body=>{const saved=readingPositions.get(body.dataset.readingId||body.closest("[data-pane]")?.dataset.pane);if(saved){body.querySelectorAll(".care-section").forEach((section,index)=>{section.open=saved.sections[index]??section.open});body.scrollTop=saved.top}})
    if(returningToBook&&runtime.bookPosition){root.querySelectorAll(".window-body[data-reading-id]").forEach(body=>{const saved=runtime.bookPosition.positions.get(body.dataset.readingId);if(saved){body.querySelectorAll(".care-section").forEach((section,index)=>{section.open=saved.sections[index]??section.open});body.scrollTop=saved.top}});if(strip)strip.scrollLeft=runtime.bookPosition.left}
    if(!runtime.isRouting()){
      root.querySelectorAll("[data-reading-sheet]").forEach(pane=>{const saved=runtime.sectionMemory.get(pane.dataset.pane);if(saved)pane.querySelectorAll(".care-section").forEach((section,index)=>{section.open=saved[index]??section.open})})
    }
    runtime.paintSelection()
    decorateReadingActions(runtime)
    if(!reuseReading&&sameWork&&favouriteFocus)root.querySelector(`[data-favourite-axiom="${CSS.escape(favouriteFocus)}"]`)?.focus({preventScroll:true})
    const restoreFocus=readingFocus||(returningToBook&&hadDeskFocus&&runtime.selectedAxiom?{id:runtime.selectedAxiom.passage_id||runtime.selectedAxiom.axiom_id,passage:Boolean(runtime.selectedAxiom.passage_id),routes:false}:null)
    if(!reuseReading&&sameWork&&restoreFocus){const kind=restoreFocus.passage?"passage":"axiom",attribute=restoreFocus.routes?`data-open-${kind}-routes`:`data-select-${kind}`,target=root.querySelector(`[${attribute}="${CSS.escape(restoreFocus.id)}"]`);if(target){const section=target.closest("details");if((restoreFocus.passage||section?.open||(runtime.isRouting()&&!section))&&!target.hidden)target.focus({preventScroll:true});else section?.querySelector("summary")?.focus({preventScroll:true})}}
    const alignedLayer=runtime.pendingLayer||(returningToBook?runtime.bookPosition?.layer:null)||previousLayer,alignedPane=paneForLayer(root,alignedLayer)
    runtime.focused=sameWork?(alignedPane?.dataset.pane||"source"):"source"
    const preserveRoutePosition=sameWork&&sameReference&&!signatureChanged&&Boolean(nextReference)&&root.querySelector(`[data-pane="${CSS.escape(previousFocused||"")}"]`)
    if(preserveRoutePosition)runtime.focused=previousFocused
    const selectedPane=preserveRoutePosition?null:centreSelectedReference(root,data?.reference)
    if(selectedPane)runtime.focused=selectedPane
    const connectionReference=data?.connection?.reference
    const preserveConnectionPosition=sameWork&&sameConnection&&Boolean(data?.connection?.id)&&connectionViewportKey(previousConnection)===connectionViewportKey(data.connection)&&root.querySelector(`[data-pane="${CSS.escape(previousFocused||"")}"]`)
    if(preserveConnectionPosition)runtime.focused=previousFocused
    else if(connectionReference&&!reuseReading)centreConnectionReference(runtime)
    else if(!sameConnection&&data?.connection&&!resumedSnapshot){const pane=root.querySelector("[data-connection-field]");centreConnectionPane(runtime,pane)}
    if(referenceChanged)root.querySelector(".route-arrival")?.classList.add("route-arrival-new")
    runtime.paintFocus()
    if(sliderFocused&&runtime.pendingLayer)root.querySelector(`[data-sheet-slider="${CSS.escape(runtime.pendingLayer)}"]`)?.focus({preventScroll:true})
    if(directionFocused)root.querySelector("[data-route-direction]")?.focus({preventScroll:true})
    if(historyFocused){const target=root.querySelector(`[data-route-history="${historyFocused}"]:not(:disabled)`)||root.querySelector("[data-route-history]:not(:disabled)")||root.querySelector(".route-history-actions [data-clear-reference]");target?.focus({preventScroll:true})}
    if(returningToConnection&&runtime.connectionReadingPosition){const saved=runtime.connectionReadingPosition;root.querySelectorAll(".window-body[data-reading-id]").forEach(body=>{const position=saved.positions.get(body.dataset.readingId);if(position){body.querySelectorAll(".care-section").forEach((section,index)=>{section.open=position.sections[index]??section.open});body.scrollTop=position.top}});if(strip)strip.scrollLeft=saved.left;runtime.focused=saved.focused;runtime.paintFocus()}
    runtime.syncConnectionShelf?.()
    installPaneControls(root,runtime.paneControlState||(runtime.paneControlState={}),()=>{runtime.queueTrackZoom();runtime.queueThreads();runtime.positionDialoguePlayer?.()},String(data?.stack?.work?.id||""))
    runtime.mountDialoguePlayer()
    runtime.restoreSliderJumpMenu(reuseReading)
    if(bookmarkMenuWork===String(data?.stack?.work?.id||""))runtime.openBookmarkMenu(root.querySelector("[data-bookmark-menu]"),{restore:true})
    runtime.pendingLayer=null
    const view=root.ownerDocument.defaultView
    runtime.queueThreads()
    workspaceRestorePosition(runtime,resumedSnapshot)
    let resumeOnResize=applySavedPaneFocus(runtime)?null:resumedSnapshot
    let initialRouteLayout=true
    const stopTrackZoom=runtime.watchTrackZoom()
    const stopWorkspaceWatch=workspaceWatchReader(runtime)
    const stopDialogueWatch=runtime.watchDialoguePlayer()
    const resize=view?.ResizeObserver?new view.ResizeObserver(()=>{if(resumeOnResize){workspaceRestorePosition(runtime,resumeOnResize);resumeOnResize=null}else if(initialRouteLayout&&data?.connection?.reference){if(!preserveConnectionPosition&&centreConnectionReference(runtime))runtime.paintFocus()}else if(initialRouteLayout&&data?.reference&&!preserveRoutePosition){const selected=centreSelectedReference(root,data.reference);if(selected){runtime.focused=selected;runtime.paintFocus()}}if(applySavedPaneFocus(runtime))resumeOnResize=null;initialRouteLayout=false;runtime.queueThreads()}):null
    if(resize){resize.observe(root);const text=root.querySelector(".axiom-button.selected .axiom-text");if(text)resize.observe(text)}
    if(runtime.loadTimer&&view)view.clearTimeout(runtime.loadTimer)
    const loader=root.querySelector("[data-load-screen]")
    // The reader data and DOM are ready; do not add a timed input-blocking delay.
    loader?.remove()
    runtime.applyOutline?.()
    return()=>{view?.removeEventListener("care-reference-viewer-ready",runtime.onViewerReady);runtime.closeBookMenu();runtime.cleanupConnectionDiscovery?.();runtime.cleanupBuildVersionMenu?.();runtime.cleanupSheetVersionMenu?.();runtime.cleanupPaneBookmarks?.();runtime.cleanupSliderJumpMenu?.();root.removeEventListener("contextmenu",runtime.onBookContextMenu);root.removeEventListener("scroll",runtime.onBookMenuScroll,true);root.ownerDocument.removeEventListener("pointerdown",runtime.onBookMenuOutside,true);view?.removeEventListener("resize",runtime.onBookMenuResize);stopTrackZoom();stopWorkspaceWatch();stopDialogueWatch();stopWorkspaceFit();resize?.disconnect();const current=INSTANCES.get(parentElement);if(current!==runtime)return;root.removeEventListener("click",runtime.onClick);root.removeEventListener("keydown",runtime.onKey);root.removeEventListener("wheel",runtime.onWheel,true);root.removeEventListener("input",runtime.onShelfInput);root.removeEventListener("change",runtime.onShelfInput);root.removeEventListener("change",runtime.onConnectionChange);root.removeEventListener("change",runtime.onVersionChange);root.removeEventListener("scroll",runtime.onConnectionTabsScroll,true);root.removeEventListener("input",runtime.onSliderInput);root.removeEventListener("change",runtime.onSliderChange);root.removeEventListener("pointerup",runtime.onSliderChange);root.removeEventListener("input",runtime.onRouteDirectionInput);root.removeEventListener("change",runtime.onRouteDirectionChange);root.removeEventListener("scroll",runtime.queueThreads,true);root.removeEventListener("toggle",runtime.queueThreads,true);root.removeEventListener("toggle",runtime.onSectionToggle,true);for(const event of ["pointerover","pointerout","focusin","focusout"])root.removeEventListener(event,runtime.onRouteHover);if(runtime.threadFrame&&view){view.cancelAnimationFrame(runtime.threadFrame);runtime.threadFrame=null}if(runtime.scrollTimer&&view)view.clearTimeout(runtime.scrollTimer);if(runtime.loadTimer&&view)view.clearTimeout(runtime.loadTimer)}
  } catch(error) {
    INSTANCES.get(parentElement)?.disposeDialoguePlayer?.()
    root.innerHTML=`<div class="inspector-empty"><div><b>THE DESK COULD NOT DRAW</b><p>${esc(error?.stack||error)}</p></div></div>`
  }
}
