
const INSTANCES = new WeakMap()
const SAVED_VIEWERS = new WeakMap()
const keyFor = (kind, id, scope="") => `${String(kind || "").toLowerCase()}\u0000${String(id || "")}${scope?`\u0000${scope}`:""}`
const HISTORY_KEY = "care-reference-history-v1"
const TEXT_SIZE_KEY = "care-reference-viewer-text-size-v1"
const TEXT_SCALES = [.78,.88,1,1.12,1.26]
const layerColor = layer => ({
  CB:"#a96624",WB:"#9a4327",MC:"#594f88",CL:"#2d6b67",CH:"#3d668b",
  NUMO:"#3d765a",XR:"#6e4f9a",XS:"#8b4f86",SC:"#8f394b",XA:"#51667e",PASSAGE:"#8a6849"
}[String(layer || "").toUpperCase()] || "#b56f3b")
function setup(parentElement, root, setTriggerValue) {
  const runtime = {
    root, registry:new Map(), sequence:[], selected:null, spatialElement:null, open:false, surface:"read", toolScreen:"home", statusTimer:null, textScaleIndex:2, setTriggerValue,
    launcher:root.querySelector(".crv-launcher"),launcherLabel:root.querySelector(".crv-launcher-label"),panel:root.querySelector(".crv-panel"),close:root.querySelector(".crv-close"),
    textSmaller:root.querySelector(".crv-text-smaller"),textLarger:root.querySelector(".crv-text-larger"),previous:root.querySelector(".crv-previous"),next:root.querySelector(".crv-next"),referenceId:root.querySelector(".crv-reference-id"),copyId:root.querySelector(".crv-copy-id"),empty:root.querySelector(".crv-empty"),content:root.querySelector(".crv-content"),
    readTab:root.querySelector(".crv-read-tab"),toolsTab:root.querySelector(".crv-tools-tab"),editionTab:root.querySelector(".crv-edition-tab"),readSurface:root.querySelector(".crv-read-surface"),toolsSurface:root.querySelector(".crv-tools-surface"),editionSurface:root.querySelector(".crv-edition-surface"),emptyEdition:root.querySelector(".crv-empty-edition"),
    title:root.querySelector(".crv-title"),meta:root.querySelector(".crv-meta"),text:root.querySelector(".crv-text"),citation:root.querySelector(".crv-citation"),openLink:root.querySelector(".crv-open"),sheetLink:root.querySelector(".crv-open-sheet"),clear:root.querySelector(".crv-clear"),
    copyText:root.querySelector(".crv-copy-text"),copyCitation:root.querySelector(".crv-copy-citation"),copyShortCitation:root.querySelector(".crv-copy-short-citation"),copyIbidCitation:root.querySelector(".crv-copy-ibid-citation"),
    toolHome:root.querySelector(".crv-tool-home"),rateScreen:root.querySelector(".crv-rate-screen"),qualityScreen:root.querySelector(".crv-quality-screen"),historyScreen:root.querySelector(".crv-history-screen"),sheetScreen:root.querySelector(".crv-sheet-screen"),
    toolRate:root.querySelector(".crv-tool-rate"),toolFavourite:root.querySelector(".crv-tool-favourite"),toolQuality:root.querySelector(".crv-tool-quality"),toolCollect:root.querySelector(".crv-tool-collect"),toolFamily:root.querySelector(".crv-tool-family"),toolDownloadSheet:root.querySelector(".crv-tool-download-sheet"),toolDownloadRoute:root.querySelector(".crv-tool-download-route"),toolRevealSheet:root.querySelector(".crv-tool-reveal-sheet"),toolSheet:root.querySelector(".crv-tool-sheet"),toolHistory:root.querySelector(".crv-tool-history"),
    ratingSummary:root.querySelector(".crv-rating-summary"),favouriteSummary:root.querySelector(".crv-favourite-summary"),qualitySummary:root.querySelector(".crv-quality-summary"),stars:root.querySelector(".crv-stars"),qualityButtons:[...root.querySelectorAll("[data-rank]")],toolBacks:[...root.querySelectorAll(".crv-tool-back")],
    historyList:root.querySelector(".crv-history-list"),historyClear:root.querySelector(".crv-history-clear"),status:root.querySelector(".crv-status"),sheetTitle:root.querySelector(".crv-sheet-title"),sheetMeta:root.querySelector(".crv-sheet-meta"),sheetModes:[...root.querySelectorAll("[data-sheet-mode]")],sheetTraces:root.querySelector(".crv-sheet-traces"),sheetCollect:root.querySelector(".crv-sheet-collect"),sheetExport:root.querySelector(".crv-sheet-export"),
    edition:null,editionTitle:root.querySelector(".crv-edition-title"),editionDescription:root.querySelector(".crv-edition-description"),editionStatistics:root.querySelector(".crv-edition-statistics"),editionPrepare:root.querySelector(".crv-edition-prepare"),editionDownloads:root.querySelector(".crv-edition-downloads"),editionMarkdown:root.querySelector(".crv-edition-markdown"),editionPdf:root.querySelector(".crv-edition-pdf"),editionStatus:root.querySelector(".crv-edition-status"),
  }
  try {
    const savedScale = window.sessionStorage.getItem(TEXT_SIZE_KEY)
    const parsedScale = savedScale === null ? Number.NaN : Number(savedScale)
    if (Number.isInteger(parsedScale)) runtime.textScaleIndex = Math.max(0,Math.min(TEXT_SCALES.length-1,parsedScale))
  } catch (_) {}
  for (let score=1;score<=5;score+=1) { const button=document.createElement("button");button.type="button";button.className="crv-star";button.dataset.score=String(score);button.setAttribute("aria-label",`${score} star${score===1?"":"s"}`);button.textContent="★";runtime.stars.append(button) }
  const surfaceFor = element => element.closest(".care-axiom,.relative-card,.passage-card,.related-axiom,.lineage-node,.lineage-passage-card,.family-card") || element
  runtime.historyRecords = () => {
    try { const value = JSON.parse(window.sessionStorage.getItem(runtime.historyKey || HISTORY_KEY) || "[]"); return Array.isArray(value) ? value : [] }
    catch (_) { return [] }
  }
  runtime.lineageElement = ref => {
    if (!ref?.id) return null
    return [...document.querySelectorAll("[data-care-lineage-node]")].find(
      element => String(element.dataset.careLineageNode || "") === String(ref.id)
    ) || null
  }
  runtime.renderLineageFlow = () => {
    document.querySelectorAll(".family-edge.flowing:not([data-care-flow-order])").forEach(element => {
      element.classList.remove("flowing");element.style.removeProperty("--flow-delay")
    })
    document.querySelectorAll(".family-edge[data-care-flow-order]").forEach(element => {
      const order=Math.max(0,Number(element.dataset.careFlowOrder||0));element.classList.add("flowing");element.style.setProperty("--flow-delay",`${order*160}ms`)
    })
    document.querySelectorAll(".family-card.flow-node:not([data-care-flow-node])").forEach(element=>element.classList.remove("flow-node"))
    document.querySelectorAll(".family-card[data-care-flow-node]").forEach(element=>element.classList.add("flow-node"))
    document.querySelectorAll(".family-card.flow-selected").forEach(element=>element.classList.remove("flow-selected"))
    document.querySelectorAll(".family-tree-board[data-care-flow-focus]").forEach(board=>{
      const focus=String(board.dataset.careFlowFocus||"");if(!focus)return
      ;[...board.querySelectorAll("[data-care-lineage-node]")].find(element=>String(element.dataset.careLineageNode||"")===focus)?.classList.add("flow-selected")
    })
  }
  runtime.markSpatial = element => {
    document.querySelectorAll(".family-card.keyboard-selected,.lineage-node.keyboard-selected").forEach(card=>card.classList.remove("keyboard-selected"))
    runtime.spatialElement=element||null
    if(!element)return
    element.classList.add("keyboard-selected")
    try{element.focus({preventScroll:true})}catch(_){element.focus()}
    element.scrollIntoView({behavior:"smooth",block:"center",inline:"center"})
  }
  runtime.remember = ref => {
    if (!ref?.id) return
    const record = {kind:ref.kind,id:ref.id,scope:ref.scope||"",title:ref.title||ref.id,metadata:ref.metadata||[],destination:ref.destination||"/",at:new Date().toISOString()}
    const records = runtime.historyRecords().filter(item => keyFor(item.kind,item.id,item.scope) !== keyFor(ref.kind,ref.id,ref.scope))
    records.unshift(record)
    try { window.sessionStorage.setItem(runtime.historyKey || HISTORY_KEY, JSON.stringify(records.slice(0,60))) } catch (_) {}
  }
  runtime.renderHistory = () => {
    runtime.historyList.replaceChildren()
    for (const item of runtime.historyRecords().slice(0,60)) {
      const link=document.createElement("a");link.className="crv-history-item";link.href=item.destination||"/"
      const kind=document.createElement("div");kind.className="crv-history-kind";kind.textContent=item.kind||"reference"
      const title=document.createElement("div");title.className="crv-history-title";title.textContent=item.title||item.id
      const id=document.createElement("div");id.className="crv-history-id";id.textContent=item.id||""
      link.append(kind,title,id);runtime.historyList.append(link)
    }
    if (!runtime.historyList.children.length) {
      const empty=document.createElement("div");empty.className="crv-history-title";empty.textContent="No axiom or passage history yet.";runtime.historyList.append(empty)
    }
  }
  runtime.render = () => {
    const ref = runtime.selected
    const hasEdition=Boolean(runtime.edition)
    if(runtime.surface==="edition"&&!hasEdition)runtime.surface="read"
    runtime.root.style.setProperty("--crv-text-scale",String(TEXT_SCALES[runtime.textScaleIndex]))
    runtime.root.style.setProperty("--crv-accent",ref?.accent||layerColor(ref?.layer || ref?.kind))
    runtime.textSmaller.disabled=runtime.textScaleIndex===0;runtime.textLarger.disabled=runtime.textScaleIndex===TEXT_SCALES.length-1
    runtime.panel.hidden = !runtime.open
    runtime.launcher.setAttribute("aria-expanded", runtime.open ? "true" : "false")
    runtime.launcherLabel.textContent = "Axiom viewer"
    runtime.launcher.setAttribute("aria-label", `${runtime.open ? "Close" : "Open"} Axiom viewer`)
    runtime.root.classList.toggle("has-edition",hasEdition)
    runtime.empty.hidden = Boolean(ref)||runtime.surface==="edition"; runtime.content.hidden = !ref&&runtime.surface!=="edition"
    runtime.emptyEdition.hidden=!hasEdition
    runtime.referenceId.textContent = ref ? ref.id : "Select an axiom or passage"
    runtime.copyId.hidden = !ref
    if (ref) {
      if (ref.kind !== "axiom" && !runtime.sheetContext && !runtime.routeDownload?.url && runtime.surface === "tools") { runtime.surface="read";runtime.toolScreen="home" }
      runtime.title.textContent = ref.title || ref.id
      runtime.meta.textContent = Array.isArray(ref.metadata) ? ref.metadata.filter(Boolean).join(" · ") : ""
      if(ref.reading_block_html)runtime.text.innerHTML = ref.reading_block_html
      else runtime.text.textContent = ref.text || "No exact wording is registered for this reference."
      runtime.citation.textContent = ref.citation || ""
      runtime.openLink.href = ref.destination || "/"
      runtime.openLink.hidden = runtime.studioMode && !ref.studio_route?.work
      runtime.openLink.textContent = ref.open_label || (ref.kind === "passage" ? "Open exact passage in reader" : "Open full axiom")
      runtime.sheetLink.hidden = !ref.sheet_destination
      runtime.sheetLink.href = ref.sheet_destination || "/"
      const axiomTools=ref.kind === "axiom",hasSheet=Boolean(runtime.sheetContext),hasRouteDownload=Boolean(runtime.routeDownload?.url)
      runtime.toolsTab.hidden = !axiomTools && !hasSheet && !hasRouteDownload
      ;[runtime.toolRate,runtime.toolFavourite,runtime.toolQuality,runtime.toolCollect,runtime.toolFamily].forEach(element=>{element.hidden=!axiomTools})
      runtime.toolFamily.hidden=!axiomTools||(runtime.studioMode&&!ref.studio_route?.work)
      runtime.toolFamily.querySelector("span:not(.crv-tool-icon)").textContent=runtime.studioMode?"Routes":"Family"
      runtime.toolFamily.querySelector("small").textContent=runtime.studioMode?"Follow connected axioms":"Open lineage"
      runtime.toolSheet.hidden=!hasSheet||runtime.studioMode
      const hasSheetFile=Boolean(ref.sheet_download_url)
      runtime.toolDownloadSheet.hidden=!hasSheetFile;runtime.toolRevealSheet.hidden=!hasSheetFile||runtime.studioMode
      runtime.toolDownloadSheet.href=ref.sheet_download_url||"/";runtime.toolDownloadSheet.download=ref.sheet_download_name||"CARE-sheet.md"
      runtime.toolDownloadRoute.hidden=!hasRouteDownload;runtime.toolDownloadRoute.href=runtime.routeDownload?.url||"/";runtime.toolDownloadRoute.download=runtime.routeDownload?.file_name||"CARE-route.md"
      const rating=Number(ref.rating||0);runtime.ratingSummary.textContent=rating?`${"★".repeat(rating)}${"☆".repeat(5-rating)}`:"Not rated"
      runtime.favouriteSummary.textContent=ref.favourite?"Saved":"Save";runtime.toolFavourite.classList.toggle("active",Boolean(ref.favourite))
      runtime.qualitySummary.textContent=ref.quality?String(ref.quality).replace(/^./,value=>value.toUpperCase()):"Unmarked"
      runtime.stars.querySelectorAll(".crv-star").forEach(button=>button.classList.toggle("active",Number(button.dataset.score)<=rating))
      runtime.qualityButtons.forEach(button=>button.classList.toggle("active",button.dataset.rank===ref.quality))
      if(hasSheet){
        runtime.sheetTitle.textContent=runtime.sheetContext.title||"CARE sheet"
        runtime.sheetMeta.textContent=[runtime.sheetContext.level,runtime.sheetContext.unit_label,runtime.sheetContext.summary].filter(Boolean).join(" · ")
        runtime.sheetModes.forEach(button=>button.classList.toggle("active",button.dataset.sheetMode===runtime.sheetContext.mode))
        runtime.sheetTraces.classList.toggle("active",Boolean(runtime.sheetContext.show_traces));runtime.sheetTraces.setAttribute("aria-pressed",runtime.sheetContext.show_traces?"true":"false")
      }
    } else runtime.toolsTab.hidden=true
    runtime.editionTab.hidden=!hasEdition
    if(hasEdition){
      const edition=runtime.edition||{},stats=edition.statistics||{},ready=edition.status==="ready"
      runtime.editionTitle.textContent=edition.title||"Take the preserved reading with you."
      runtime.editionDescription.textContent=edition.description||"Every finding, exact quotation, and resolved CARE axiom in one complete edition."
      runtime.editionStatistics.textContent=[stats.findings?`${stats.findings} findings`:"",stats.axioms?`${stats.axioms} cited axioms`:"",stats.quotations?`${stats.quotations} verified quotations`:""].filter(Boolean).join("  /  ")
      runtime.editionPrepare.hidden=ready
      runtime.editionPrepare.disabled=edition.status==="preparing"
      runtime.editionPrepare.textContent=edition.status==="preparing"?"Preparing the complete edition…":"Prepare the complete edition"
      runtime.editionDownloads.hidden=!ready
      runtime.editionMarkdown.href=edition.markdown_url||"/";runtime.editionMarkdown.download=edition.markdown_name||"complete-findings.md"
      runtime.editionPdf.href=edition.pdf_url||"/";runtime.editionPdf.download=edition.pdf_name||"complete-edition.pdf"
      runtime.editionStatus.textContent=edition.message||""
    }
    runtime.readTab.hidden=!ref
    runtime.readSurface.hidden=runtime.surface!=="read"||!ref;runtime.toolsSurface.hidden=runtime.surface!=="tools";runtime.editionSurface.hidden=runtime.surface!=="edition"
    runtime.readTab.classList.toggle("active",runtime.surface==="read");runtime.readTab.setAttribute("aria-selected",runtime.surface==="read"?"true":"false")
    runtime.toolsTab.classList.toggle("active",runtime.surface==="tools");runtime.toolsTab.setAttribute("aria-selected",runtime.surface==="tools"?"true":"false")
    runtime.editionTab.classList.toggle("active",runtime.surface==="edition");runtime.editionTab.setAttribute("aria-selected",runtime.surface==="edition"?"true":"false")
    runtime.toolHome.hidden=runtime.toolScreen!=="home";runtime.rateScreen.hidden=runtime.toolScreen!=="rate";runtime.qualityScreen.hidden=runtime.toolScreen!=="quality";runtime.historyScreen.hidden=runtime.toolScreen!=="history";runtime.sheetScreen.hidden=runtime.toolScreen!=="sheet"
    const position = ref ? runtime.sequence.findIndex(item => keyFor(item.kind,item.id,item.scope) === keyFor(ref.kind,ref.id,ref.scope)) : -1
    runtime.previous.disabled = position <= 0
    runtime.next.disabled = position < 0 || position >= runtime.sequence.length - 1
    const selectedKey = ref ? keyFor(ref.kind, ref.id, ref.scope) : ""
    document.querySelectorAll("[data-care-reference-kind][data-care-reference-id]").forEach(element => {
      const matches = Boolean(selectedKey && keyFor(element.dataset.careReferenceKind, element.dataset.careReferenceId) === selectedKey)
      element.classList.toggle("previewing", matches); surfaceFor(element).classList.toggle("previewing", matches)
    })
    document.querySelectorAll("[data-care-reference-bookmark][data-care-reference-kind][data-care-reference-id]").forEach(button => {
      const item=runtime.registry.get(keyFor(button.dataset.careReferenceKind,button.dataset.careReferenceId));const active=Boolean(item?.favourite)
      button.classList.toggle("active",active);button.setAttribute("aria-pressed",active?"true":"false")
      button.setAttribute("aria-label",`${active?"Remove favourite":"Favourite"} ${button.dataset.careReferenceId||"axiom"}`);button.title=active?"Remove from favourites":"Save to favourites"
    })
    runtime.renderLineageFlow(ref)
    if (runtime.toolScreen==="history") runtime.renderHistory()
  }
  runtime.scrollTo = ref => {
    const element = [...document.querySelectorAll("[data-care-reference-kind][data-care-reference-id]")].find(item => keyFor(item.dataset.careReferenceKind,item.dataset.careReferenceId) === keyFor(ref.kind,ref.id,ref.scope))
    if (element) surfaceFor(element).scrollIntoView({behavior:"smooth",block:"center"})
  }
  runtime.select = (ref,{open=runtime.open,scroll=false,remember=true}={}) => {
    if (!ref) return
    runtime.selected=ref;runtime.open=open;runtime.surface="read";runtime.toolScreen="home";if(remember)runtime.remember(ref);runtime.render();if(scroll)runtime.scrollTo(ref)
  }
  runtime.move = delta => {
    if (!runtime.sequence.length) return
    const current=runtime.selected?runtime.sequence.findIndex(item=>keyFor(item.kind,item.id,item.scope)===keyFor(runtime.selected.kind,runtime.selected.id,runtime.selected.scope)):-1
    const nextIndex=Math.max(0,Math.min(runtime.sequence.length-1,(current<0?(delta>0?0:runtime.sequence.length-1):current+delta)))
    runtime.select(runtime.sequence[nextIndex],{open:runtime.open,scroll:true})
  }
  runtime.moveSpatial = direction => {
    const currentElement=runtime.spatialElement||runtime.lineageElement(runtime.selected),board=currentElement?.closest(".family-tree-board")
    if (!currentElement || !board) return false
    const currentRect=currentElement.getBoundingClientRect(),cx=currentRect.left+currentRect.width/2,cy=currentRect.top+currentRect.height/2
    const candidates=[]
    board.querySelectorAll("[data-care-lineage-node][data-care-lineage-href]").forEach(element=>{
      if(element===currentElement)return
      const ref=runtime.registry.get(keyFor(element.dataset.careReferenceKind,element.dataset.careReferenceId))||null
      const rect=element.getBoundingClientRect(),dx=rect.left+rect.width/2-cx,dy=rect.top+rect.height/2-cy
      let primary=0,cross=0
      if(direction==="left"){if(dx>=-4)return;primary=-dx;cross=Math.abs(dy)}
      else if(direction==="right"){if(dx<=4)return;primary=dx;cross=Math.abs(dy)}
      else if(direction==="up"){if(dy>=-4)return;primary=-dy;cross=Math.abs(dx)}
      else {if(dy<=4)return;primary=dy;cross=Math.abs(dx)}
      const crossWeight=(direction==="left"||direction==="right")?2.8:1.9
      candidates.push({element,ref,score:primary+cross*crossWeight,primary,cross})
    })
    candidates.sort((a,b)=>a.score-b.score||a.primary-b.primary||a.cross-b.cross)
    if(!candidates.length)return false
    const next=candidates[0];runtime.markSpatial(next.element)
    if(next.ref)runtime.select(next.ref,{open:runtime.open,scroll:false})
    return true
  }
  runtime.moveLineageOrder = delta => {
    const current=runtime.spatialElement||runtime.lineageElement(runtime.selected),board=current?.closest(".family-tree-board")
    if(!current||!board)return false
    const elements=[...board.querySelectorAll("[data-care-lineage-node][data-care-lineage-href]")]
    const position=elements.indexOf(current);if(position<0||!elements.length)return false
    const next=elements[Math.max(0,Math.min(elements.length-1,position+delta))]
    if(!next||next===current)return false
    runtime.markSpatial(next)
    const ref=runtime.registry.get(keyFor(next.dataset.careReferenceKind,next.dataset.careReferenceId))||null
    if(ref)runtime.select(ref,{open:runtime.open,scroll:false})
    return true
  }
  runtime.showStatus = message => {
    runtime.status.textContent = message
    if (runtime.statusTimer !== null) window.clearTimeout(runtime.statusTimer)
    runtime.statusTimer = window.setTimeout(() => { runtime.status.textContent = "" }, 1500)
  }
  runtime.copy = async (value, message = "Copied") => {
    const text=String(value || "");if(!text)return
    try {
      if(!navigator.clipboard?.writeText)throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(text);runtime.showStatus(message)
    } catch (_) {
      const helper=document.createElement("textarea");helper.value=text;helper.setAttribute("readonly","");helper.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";runtime.root.appendChild(helper);helper.select()
      const copied=document.execCommand("copy");helper.remove();runtime.showStatus(copied?message:"Select the text and copy it manually")
    }
  }
  runtime.selectedText = () => {
    const selections=[]
    const addSelection=selection=>{if(selection&&!selections.includes(selection))selections.push(selection)}
    try{addSelection(window.getSelection?.())}catch(_){}
    try{addSelection(document.getSelection?.())}catch(_){}
    try{addSelection(runtime.root.getRootNode()?.getSelection?.())}catch(_){}
    for(const selection of selections){
      if(selection.isCollapsed)continue
      const value=String(selection.toString()||"")
      if(value.trim())return value
    }
    return ""
  }
  runtime.selectionWithin = element => {
    if(!element)return false
    const selections=[]
    const addSelection=selection=>{if(selection&&!selections.includes(selection))selections.push(selection)}
    try{addSelection(window.getSelection?.())}catch(_){}
    try{addSelection(document.getSelection?.())}catch(_){}
    try{addSelection(runtime.root.getRootNode()?.getSelection?.())}catch(_){}
    const parent=node=>node instanceof Element?node:node?.parentElement
    return selections.some(selection=>{
      if(selection.isCollapsed||!String(selection.toString()||"").trim())return false
      const anchor=parent(selection.anchorNode),focus=parent(selection.focusNode)
      return Boolean(anchor&&focus&&element.contains(anchor)&&element.contains(focus))
    })
  }
  runtime.showTools = screen => { if(runtime.selected?.kind!=="axiom"&&!runtime.sheetContext)return;runtime.open=true;runtime.surface="tools";runtime.toolScreen=screen||"home";runtime.render() }
  runtime.showEdition = () => {if(!runtime.edition)return;runtime.open=true;runtime.surface="edition";runtime.toolScreen="home";runtime.render()}
  runtime.showRead = () => {runtime.surface="read";runtime.toolScreen="home";runtime.render()}
  runtime.emit = (type,payload={}) => { if(!runtime.selected?.id)return;runtime.setTriggerValue("action",{type,id:runtime.selected.id,scope:runtime.selected.scope||"",nonce:`${Date.now()}-${Math.random()}`,...payload}) }
  runtime.onLauncher = () => { runtime.open = !runtime.open; runtime.render() }
  runtime.setTextScale = delta => {
    const next=Math.max(0,Math.min(TEXT_SCALES.length-1,runtime.textScaleIndex+delta))
    if(next===runtime.textScaleIndex)return
    runtime.textScaleIndex=next
    try { window.sessionStorage.setItem(TEXT_SIZE_KEY,String(next)) } catch (_) {}
    runtime.render();runtime.showStatus(delta<0?"Viewer text made smaller":"Viewer text made larger")
  }
  runtime.onTextSmaller = () => runtime.setTextScale(-1)
  runtime.onTextLarger = () => runtime.setTextScale(1)
  runtime.onClose = () => { runtime.open = false;runtime.surface="read";runtime.toolScreen="home";runtime.render() }
  runtime.onClear = () => { runtime.selected = null;runtime.surface="read";runtime.toolScreen="home";runtime.open = true;runtime.render() }
  runtime.onPrevious = () => runtime.move(-1)
  runtime.onNext = () => runtime.move(1)
  runtime.onHistoryClear = () => { try { window.sessionStorage.removeItem(runtime.historyKey || HISTORY_KEY) } catch (_) {};runtime.renderHistory() }
  runtime.onCopyText = () => runtime.copy(runtime.selected?.text)
  runtime.onCopyId = () => runtime.copy(runtime.selected?.id, "Copied CARE ID")
  runtime.onCopyCitation = () => runtime.copy(runtime.selected?.citation, "Copied full reference")
  runtime.onCopyShortCitation = () => runtime.copy(runtime.selected?.citation_short, "Copied short note")
  runtime.onCopyIbidCitation = () => runtime.copy(runtime.selected?.citation_ibid, "Copied Ibid. + CARE ID")
  runtime.onReadTab=()=>runtime.showRead();runtime.onToolsTab=()=>runtime.showTools("home");runtime.onEditionTab=()=>runtime.showEdition();runtime.onEmptyEdition=()=>runtime.showEdition()
  runtime.onToolRate=()=>runtime.showTools("rate");runtime.onToolQuality=()=>runtime.showTools("quality");runtime.onToolHistory=()=>runtime.showTools("history");runtime.onToolSheet=()=>runtime.showTools("sheet")
  runtime.onToolFavourite=()=>{const active=!Boolean(runtime.selected?.favourite);runtime.selected.favourite=active;runtime.render();runtime.showStatus(active?"Saved to favourites":"Removed from favourites");runtime.emit("favourite",{active})}
  runtime.onToolCollect=()=>{runtime.showStatus("Added to export collection");runtime.emit("collect")}
  runtime.onToolFamily=()=>runtime.studioMode?runtime.emit("studio_open_reference"):runtime.emit("open_lineage")
  runtime.onOpenReference=event=>{if(!runtime.studioMode||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();runtime.emit("studio_open_reference")}
  runtime.onOpenSheet=event=>{if(!runtime.studioMode||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();runtime.emit("studio_open_sheet")}
  runtime.onToolRevealSheet=()=>{runtime.showStatus("Opening the original CARE sheet in Finder");runtime.emit("sheet_reveal")}
  runtime.onToolBack=()=>runtime.showTools("home")
  runtime.onStars=event=>{const button=event.target.closest("[data-score]");if(!button)return;const score=Number(button.dataset.score);runtime.selected.rating=score;runtime.render();runtime.showStatus(`${score} star${score===1?"":"s"} saved`);runtime.emit("rate",{score})}
  runtime.onQuality=event=>{const button=event.target.closest("[data-rank]");if(!button)return;const rank=String(button.dataset.rank||"");runtime.selected.quality=rank;runtime.render();runtime.showStatus(`${rank.replace(/^./,value=>value.toUpperCase())} mark saved`);runtime.emit("quality",{rank})}
  runtime.onSheetMode=event=>{const button=event.target.closest("[data-sheet-mode]");if(!button||!runtime.sheetContext)return;const value=String(button.dataset.sheetMode||"");runtime.sheetContext.mode=value;runtime.render();runtime.showStatus(`${value} selected`);runtime.emit("sheet_view",{value,sheet_id:runtime.sheetContext.unit_id||""})}
  runtime.onSheetTraces=()=>{if(!runtime.sheetContext)return;const active=!Boolean(runtime.sheetContext.show_traces);runtime.sheetContext.show_traces=active;runtime.render();runtime.showStatus(active?"Source traces shown":"Source traces hidden");runtime.emit("sheet_traces",{active,sheet_id:runtime.sheetContext.unit_id||""})}
  runtime.onSheetCollect=()=>{if(!runtime.sheetContext)return;runtime.showStatus("Full CARE sheet added");runtime.emit("sheet_collect",{sheet_id:runtime.sheetContext.unit_id||""})}
  runtime.onSheetExport=()=>{if(!runtime.sheetContext)return;runtime.emit("sheet_export",{sheet_id:runtime.sheetContext.unit_id||""})}
  runtime.onEditionPrepare=()=>{if(!runtime.edition)return;runtime.editionPrepare.disabled=true;runtime.editionPrepare.textContent="Preparing the complete edition…";runtime.editionStatus.textContent="Binding every finding, quotation, and cited axiom…";runtime.setTriggerValue("action",{type:"edition_prepare",id:runtime.edition.signature||"edition",nonce:`${Date.now()}-${Math.random()}`})}
  runtime.onReferencePreview=event=>{const detail=event.detail||{},ref=runtime.registry.get(keyFor(detail.kind,detail.id,detail.scope));if(!ref)return;const selected=runtime.selected&&keyFor(runtime.selected.kind,runtime.selected.id,runtime.selected.scope)===keyFor(ref.kind,ref.id,ref.scope);runtime.select(ref,{open:true,remember:!selected})}
  runtime.onReferenceSelect=event=>{const detail=event.detail||{},ref=runtime.registry.get(keyFor(detail.kind,detail.id,detail.scope));if(!ref)return;const selected=runtime.selected&&keyFor(runtime.selected.kind,runtime.selected.id,runtime.selected.scope)===keyFor(ref.kind,ref.id,ref.scope);runtime.select(ref,{open:runtime.open,remember:!selected});event.preventDefault?.()}
  runtime.onDocumentClick = event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (event.target instanceof Element && event.target.closest("a[data-care-reference-direct]")) return
    const bookmark = event.target instanceof Element ? event.target.closest("[data-care-reference-bookmark][data-care-reference-kind][data-care-reference-id]") : null
    if (bookmark && !root.contains(bookmark)) {
      const bookmarkKey=keyFor(bookmark.dataset.careReferenceKind,bookmark.dataset.careReferenceId),bookmarkRef=runtime.registry.get(bookmarkKey)
      if (!bookmarkRef) return
      event.preventDefault();event.stopPropagation();const active=!Boolean(bookmarkRef.favourite);bookmarkRef.favourite=active;runtime.selected=bookmarkRef;runtime.render();runtime.showStatus(active?"Saved to favourites":"Removed from favourites");runtime.emit("favourite",{active});return
    }
    const target = event.target instanceof Element ? event.target.closest("[data-care-reference-kind][data-care-reference-id]") : null
    if (!target || root.contains(target)) return
    if(target.matches(".care-axiom") && runtime.selectionWithin(target))return
    const key = keyFor(target.dataset.careReferenceKind, target.dataset.careReferenceId)
    const ref = runtime.registry.get(key)
    if (!ref) return
    const selected = runtime.selected && keyFor(runtime.selected.kind, runtime.selected.id, runtime.selected.scope) === key
    const directLink=event.target instanceof Element ? event.target.closest("a[data-care-reference-kind][data-care-reference-id]") : null
    event.preventDefault(); event.stopPropagation(); runtime.select(ref,{open:directLink?true:runtime.open,remember:!selected})
  }
  runtime.eventComesFromEditable = event => {
    const path=typeof event.composedPath==="function"?event.composedPath():[event.target]
    return path.some(node=>node instanceof HTMLElement&&(node.matches("input,textarea,select")||node.isContentEditable))
  }
  runtime.onDocumentKeydown = event => {
    // The ordinary CARE sheet owns its selection controls. These attributes
    // are absent inside Routes, whose viewer shortcuts remain unchanged.
    const path=typeof event.composedPath==="function"?event.composedPath():[event.target]
    if(path.some(node=>node instanceof HTMLElement&&node.matches("[data-reading-sheet]")))return
    if(runtime.eventComesFromEditable(event))return
    const origin=event.composedPath?.()[0]||event.target
    const target=origin instanceof Element?origin:null
    const key=String(event.key||"").toLowerCase()
    const command=event.metaKey||event.ctrlKey
    if(command&&key==="c"&&!event.altKey){
      const value=runtime.selectedText()
      if(value){
        event.preventDefault()
        let copied=false
        try{copied=document.execCommand("copy")}catch(_){}
        if(copied)runtime.showStatus("Copied selection")
        else runtime.copy(value,"Copied selection")
      }
      return
    }
    if (event.defaultPrevented || command || event.altKey) return
    if (key.startsWith("arrow")&&!runtime.selected) return
    if (key==="arrowdown") {event.preventDefault();if(!runtime.moveSpatial("down"))runtime.move(1);return}
    if (key==="arrowup") {event.preventDefault();if(!runtime.moveSpatial("up"))runtime.move(-1);return}
    if (key==="arrowleft") {if(runtime.moveSpatial("left"))event.preventDefault();return}
    if (key==="arrowright") {if(runtime.moveSpatial("right"))event.preventDefault();return}
    if (key==="j") {event.preventDefault();if(!runtime.moveLineageOrder(1))runtime.move(1);return}
    if (key==="k") {event.preventDefault();if(!runtime.moveLineageOrder(-1))runtime.move(-1);return}
    if (key==="escape"&&runtime.open) {event.preventDefault();if(runtime.surface==="tools"&&runtime.toolScreen!=="home")runtime.showTools("home");else if(runtime.surface==="tools")runtime.showRead();else{runtime.open=false;runtime.render()}return}
    if (key==="enter"&&target?.closest("button,a")) return
    if (key==="enter"&&runtime.selected) {event.preventDefault();if(runtime.open){if(runtime.studioMode)runtime.emit("studio_open_reference");else window.location.assign(runtime.selected.destination||"/")}else{runtime.open=true;runtime.render()}return}
    if (key==="t"&&runtime.selected?.kind==="axiom") {event.preventDefault();if(runtime.surface==="tools")runtime.showRead();else runtime.showTools("home");return}
  }
  runtime.onDocumentCopy = event => {
    const value=runtime.selectedText()
    if(!value)return
    if(event.clipboardData){event.clipboardData.setData("text/plain",value);event.preventDefault();return}
    if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value).catch(()=>{});event.preventDefault()}
  }
  runtime.launcher.addEventListener("click", runtime.onLauncher); runtime.close.addEventListener("click", runtime.onClose)
  runtime.textSmaller.addEventListener("click",runtime.onTextSmaller);runtime.textLarger.addEventListener("click",runtime.onTextLarger)
  runtime.previous.addEventListener("click",runtime.onPrevious);runtime.next.addEventListener("click",runtime.onNext)
  runtime.clear.addEventListener("click", runtime.onClear); runtime.copyId.addEventListener("click", runtime.onCopyId); runtime.copyText.addEventListener("click", runtime.onCopyText)
  runtime.openLink.addEventListener("click",runtime.onOpenReference);runtime.sheetLink.addEventListener("click",runtime.onOpenSheet)
  runtime.copyCitation.addEventListener("click", runtime.onCopyCitation)
  runtime.copyShortCitation.addEventListener("click", runtime.onCopyShortCitation)
  runtime.copyIbidCitation.addEventListener("click", runtime.onCopyIbidCitation)
  runtime.readTab.addEventListener("click",runtime.onReadTab);runtime.toolsTab.addEventListener("click",runtime.onToolsTab);runtime.editionTab.addEventListener("click",runtime.onEditionTab);runtime.emptyEdition.addEventListener("click",runtime.onEmptyEdition);runtime.editionPrepare.addEventListener("click",runtime.onEditionPrepare)
  runtime.toolRate.addEventListener("click",runtime.onToolRate);runtime.toolQuality.addEventListener("click",runtime.onToolQuality);runtime.toolHistory.addEventListener("click",runtime.onToolHistory);runtime.toolSheet.addEventListener("click",runtime.onToolSheet)
  runtime.toolFavourite.addEventListener("click",runtime.onToolFavourite);runtime.toolCollect.addEventListener("click",runtime.onToolCollect);runtime.toolFamily.addEventListener("click",runtime.onToolFamily);runtime.toolRevealSheet.addEventListener("click",runtime.onToolRevealSheet);runtime.toolBacks.forEach(button=>button.addEventListener("click",runtime.onToolBack))
  runtime.stars.addEventListener("click",runtime.onStars);runtime.qualityScreen.addEventListener("click",runtime.onQuality);runtime.historyClear.addEventListener("click",runtime.onHistoryClear)
  runtime.sheetScreen.addEventListener("click",runtime.onSheetMode);runtime.sheetTraces.addEventListener("click",runtime.onSheetTraces);runtime.sheetCollect.addEventListener("click",runtime.onSheetCollect);runtime.sheetExport.addEventListener("click",runtime.onSheetExport)
  document.addEventListener("click", runtime.onDocumentClick, true)
  document.addEventListener("keydown",runtime.onDocumentKeydown,true)
  document.addEventListener("copy",runtime.onDocumentCopy,true)
  window.addEventListener("care-reference-preview",runtime.onReferencePreview)
  window.addEventListener("care-reference-select",runtime.onReferenceSelect)
  Object.assign(runtime,SAVED_VIEWERS.get(parentElement)||{})
  INSTANCES.set(parentElement, runtime)
  return runtime
}

function teardown(parentElement, runtime) {
  SAVED_VIEWERS.set(parentElement,{selected:runtime.selected,defaultKey:runtime.defaultKey,open:runtime.open,surface:runtime.surface,toolScreen:runtime.toolScreen,textScaleIndex:runtime.textScaleIndex})
  runtime.renderLineageFlow(null)
  runtime.markSpatial(null)
  runtime.launcher.removeEventListener("click", runtime.onLauncher); runtime.close.removeEventListener("click", runtime.onClose)
  runtime.textSmaller.removeEventListener("click",runtime.onTextSmaller);runtime.textLarger.removeEventListener("click",runtime.onTextLarger)
  runtime.previous.removeEventListener("click",runtime.onPrevious);runtime.next.removeEventListener("click",runtime.onNext)
  runtime.clear.removeEventListener("click", runtime.onClear); runtime.copyId.removeEventListener("click", runtime.onCopyId); runtime.copyText.removeEventListener("click", runtime.onCopyText)
  runtime.openLink.removeEventListener("click",runtime.onOpenReference);runtime.sheetLink.removeEventListener("click",runtime.onOpenSheet)
  runtime.copyCitation.removeEventListener("click", runtime.onCopyCitation)
  runtime.copyShortCitation.removeEventListener("click", runtime.onCopyShortCitation)
  runtime.copyIbidCitation.removeEventListener("click", runtime.onCopyIbidCitation)
  runtime.readTab.removeEventListener("click",runtime.onReadTab);runtime.toolsTab.removeEventListener("click",runtime.onToolsTab);runtime.editionTab.removeEventListener("click",runtime.onEditionTab);runtime.emptyEdition.removeEventListener("click",runtime.onEmptyEdition);runtime.editionPrepare.removeEventListener("click",runtime.onEditionPrepare)
  runtime.toolRate.removeEventListener("click",runtime.onToolRate);runtime.toolQuality.removeEventListener("click",runtime.onToolQuality);runtime.toolHistory.removeEventListener("click",runtime.onToolHistory);runtime.toolSheet.removeEventListener("click",runtime.onToolSheet)
  runtime.toolFavourite.removeEventListener("click",runtime.onToolFavourite);runtime.toolCollect.removeEventListener("click",runtime.onToolCollect);runtime.toolFamily.removeEventListener("click",runtime.onToolFamily);runtime.toolRevealSheet.removeEventListener("click",runtime.onToolRevealSheet);runtime.toolBacks.forEach(button=>button.removeEventListener("click",runtime.onToolBack))
  runtime.stars.removeEventListener("click",runtime.onStars);runtime.qualityScreen.removeEventListener("click",runtime.onQuality);runtime.historyClear.removeEventListener("click",runtime.onHistoryClear)
  runtime.sheetScreen.removeEventListener("click",runtime.onSheetMode);runtime.sheetTraces.removeEventListener("click",runtime.onSheetTraces);runtime.sheetCollect.removeEventListener("click",runtime.onSheetCollect);runtime.sheetExport.removeEventListener("click",runtime.onSheetExport)
  document.removeEventListener("click", runtime.onDocumentClick, true)
  document.removeEventListener("keydown",runtime.onDocumentKeydown,true)
  document.removeEventListener("copy",runtime.onDocumentCopy,true)
  window.removeEventListener("care-reference-preview",runtime.onReferencePreview)
  window.removeEventListener("care-reference-select",runtime.onReferenceSelect)
  if (runtime.statusTimer !== null) window.clearTimeout(runtime.statusTimer)
  INSTANCES.delete(parentElement)
}

export default function(component) {
  const { parentElement, data, setTriggerValue } = component
  const root = parentElement.querySelector("[data-care-reference-viewer-root]")
  if (!root) return
  let runtime = INSTANCES.get(parentElement)
  if (!runtime) runtime = setup(parentElement, root, setTriggerValue)
  runtime.setTriggerValue = setTriggerValue
  runtime.studioMode = Boolean(data?.studio_mode)
  runtime.routeDownload = data?.route_download||null
  runtime.historyKey = runtime.studioMode ? "care-studio-reference-history-v1" : HISTORY_KEY
  root.classList.toggle("inline-launcher", Boolean(data?.inline_launcher))
  if(runtime.spatialElement&&!runtime.spatialElement.isConnected)runtime.spatialElement=null
  runtime.sheetContext = data?.sheet_context && typeof data.sheet_context === "object" ? {...data.sheet_context} : null
  runtime.edition = data?.edition && typeof data.edition === "object" && Object.keys(data.edition).length ? {...data.edition} : null
  runtime.sequence = Array.isArray(data?.references) ? data.references : []
  runtime.registry = new Map(runtime.sequence.map(ref => [keyFor(ref.kind, ref.id, ref.scope), ref]))
  const defaultKey = keyFor(data?.default_kind, data?.default_id, data?.default_scope)
  const defaultRef = runtime.registry.get(defaultKey)
  // A desk selection changes the viewer once; unrelated reruns preserve its own navigation.
  const defaultChanged = Boolean(data?.follow_default) && runtime.defaultKey !== defaultKey
  runtime.defaultKey = data?.follow_default ? defaultKey : null
  if (defaultChanged || !runtime.selected || !runtime.registry.has(keyFor(runtime.selected.kind, runtime.selected.id, runtime.selected.scope))) {
    runtime.selected = defaultRef || null
    if (defaultChanged) {runtime.surface="read";runtime.toolScreen="home"}
    if (defaultRef) runtime.remember(defaultRef)
  } else runtime.selected = runtime.registry.get(keyFor(runtime.selected.kind, runtime.selected.id, runtime.selected.scope))
  if (data?.open_default && defaultRef) {
    runtime.selected = defaultRef
    runtime.remember(defaultRef)
    runtime.open = true
  }
  if (data?.open_request && data.open_request !== runtime.openRequest && defaultRef) {
    runtime.openRequest = data.open_request
    runtime.selected = defaultRef
    runtime.surface = "read"; runtime.toolScreen = "home"
    runtime.remember(defaultRef)
    runtime.open = true
  }
  if (data?.clean_legacy_query) {
    const url = new URL(window.location.href); url.searchParams.delete("inspect_kind"); url.searchParams.delete("inspect_id")
    window.history.replaceState(window.history.state, "", url)
  }
  runtime.render()
  if(runtime.studioMode)window.dispatchEvent(new CustomEvent("care-reference-viewer-ready"))
  return () => teardown(parentElement, runtime)
}
