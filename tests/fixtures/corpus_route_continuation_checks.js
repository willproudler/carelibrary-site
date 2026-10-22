const items=[
 {id:'MC_SAVED:GA-01',layer:'MC',mc_level:1,source_pane:'saved-mc:exact',source_trace:['CL_SAVED:BSA-01'],text:'Copyable MC wording'},
 {id:'CL_SAVED:BSA-01',layer:'CL',source_pane:'saved-cl:exact',matrix_trace:['WB_SAVED:A1'],text:'Copyable CL wording'},
 {id:'WB_SAVED:A1',layer:'WB',source_pane:'saved-wb:exact',source_trace:[],text:'Terminal WB wording'},
]
const markup=routeGroups(items,'CB_FINAL:GA-01')
const attrsFor=id=>[...markup.matchAll(/<button\b([^>]*data-open-axiom-routes="([^"]+)"[^>]*)>/g)].find(match=>match[2]===id)?.[1]||''
assert.match(attrsFor(items[0].id),/data-route-continuation="true"/)
assert.match(attrsFor(items[1].id),/data-route-continuation="true"/)
assert.doesNotMatch(attrsFor(items[2].id),/data-route-continuation/)
assert.ok(markup.includes('data-connection-source-pane="saved-mc:exact"'))
assert.ok(markup.includes('<article role="button"'),'Prose stays selectable outside native controls')
for(const item of [{...items[0],source_pane:''},{...items[0],resolved:false},{...items[0],unresolved:true},{...items[0],source_trace:[],deep_source_trace:['CL_SAVED:A1']}])assert.equal(routeContinuationAttributes(item),'')
function fixture(corpus=true){
 const actions=[],pane={dataset:{pane:'connection:field:feeders',connectionField:'synthetic-feeders'}}
 const rows=items.map(item=>{
  const row={dataset:{connectionSourcePane:item.source_pane}}
  const route={dataset:{openAxiomRoutes:item.id,...(attrsFor(item.id).includes('data-route-continuation="true"')?{routeContinuation:'true'}:{})},hidden:true,disabled:false}
  const card={dataset:{selectAxiom:item.id},parentElement:{querySelector:()=>route},classList:{toggle(){}},setAttribute(){},focus(){}}
  const closest=(element,selector)=>{
   if(selector==='[data-connection-field],[data-connection-book]')return pane
   if(selector==='[data-connection-source-pane]')return row
   if(selector==='[data-select-axiom],[data-select-passage]')return element===card?card:null
   if(selector==='[data-open-axiom-routes],[data-open-passage-routes],[data-ref-id]'||selector==='[data-ref-id],[data-open-axiom-routes],[data-open-passage-routes],[data-clear-reference]')return element===route?route:card
   return null
  }
  card.closest=selector=>closest(card,selector);route.closest=selector=>closest(route,selector)
  return {card,route}
 })
 pane.querySelectorAll=()=>rows.map(row=>row.card)
 const root={querySelector:()=>null,querySelectorAll:()=>[pane],ownerDocument:{defaultView:{}}}
 const runtime={root,data:{corpus_build:corpus,connection:{reference:{id:'CB_FINAL:GA-01'}}},api:{setTriggerValue:(kind,value)=>actions.push({kind,value})},paintSelection(){},onClick(){},onKey(){},onWheel(){}}
 setupConnectionReader(runtime);runtime.paintSelection()
 return {runtime,rows,actions}
}
const corpus=fixture()
assert.deepEqual(corpus.rows.map(row=>row.route.hidden),[false,false,true],'MC/CL continuation is present before text selection; terminal WB is unchanged')
assert.equal(corpus.runtime.onConnectionClick({target:corpus.rows[0].route}),true)
assert.deepEqual(corpus.actions.at(-1),{kind:'connection_action',value:{action:'reference',pane_id:'saved-mc:exact',reference_id:'MC_SAVED:GA-01'}},'A direct mouse click dispatches the exact preserved MC edition')
let prevented=false
corpus.runtime.onKey({target:corpus.rows[1].route,key:'Enter',preventDefault(){prevented=true}})
assert.equal(prevented,true)
assert.deepEqual(corpus.actions.at(-1).value,{action:'reference',pane_id:'saved-cl:exact',reference_id:'CL_SAVED:BSA-01'},'Keyboard continuation keeps the exact CL scope')
corpus.runtime.onConnectionClick({target:corpus.rows[2].card})
assert.deepEqual(corpus.rows.map(row=>row.route.hidden),[false,false,false],'Selecting another card never hides the persistent traced feeders')
const ordinary=fixture(false)
assert.deepEqual(ordinary.rows.map(row=>row.route.hidden),[true,true,true],'Ordinary readers keep selection-based actions')
ordinary.runtime.onConnectionClick({target:ordinary.rows[0].card})
assert.deepEqual(ordinary.rows.map(row=>row.route.hidden),[false,true,true])
