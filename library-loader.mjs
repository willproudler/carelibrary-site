/* The catalogue is small; complete books are fetched only when opened. */
const emptyLateral=()=>({id:'',title:'',parents:[],sections:[]});
const message='This reading could not load. Please try again.';
const immutableURL=/^\.\/data\/chunks\/(?:work|lateral|references)-[a-f0-9]{24}\.json$/;

export async function fetchPublicJSON(url,{fetch:fetcher=globalThis.fetch.bind(globalThis),cache='default',timeout=45000,retries=1}={}) {
  for(let attempt=0;;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetcher(url,{cache,signal:controller.signal});
      if(!response.ok){
        const error=Error(message);error.retryable=response.status===408||response.status===429||response.status>=500;throw error;
      }
      let data;
      try{data=await response.json();}catch{const error=Error('This published reading is incomplete. Please try again.');error.retryable=false;throw error;}
      if(!data||typeof data!=='object'||Array.isArray(data)){const error=Error('This published reading is incomplete. Please try again.');error.retryable=false;throw error;}
      return data;
    }catch(error){
      if(attempt>=retries||error.retryable===false)throw Error(error.name==='AbortError'?'This reading took too long to load. Please try again.':error.message||message);
    }finally{clearTimeout(timer);}
  }
}

export function createLibraryLoader(catalog,{fetch:fetcher=globalThis.fetch.bind(globalThis),baseURL=import.meta.url}={}) {
  if(!Array.isArray(catalog?.works)||catalog.public_assets?.version!==1)throw Error('The library catalogue could not load. Please refresh to try again.');
  const data=catalog,assets=data.public_assets,pending=new Map(),loaded=new Set();
  data.lateral ||= emptyLateral();
  const byId=new Map(data.works.map(work=>[work.id,work]));
  const bySlug=new Map(data.works.map(work=>[work.slug,work.id]));
  const aliases=new Map(data.works.filter(work=>work.version_work_id).map(work=>[work.version_work_id,work.id]));
  const ownerHeaders=new Map(data.works.flatMap(work=>[...work.sources,...work.units].map(unit=>[unit.id,work.id])));
  if(data.lateral.id)ownerHeaders.set(data.lateral.id,data.lateral.id);
  let referenceOwners;
  const resolveId=value=>byId.has(value)?value:bySlug.get(value)||aliases.get(value);
  function once(key,load){
    if(!pending.has(key)){
      const request=Promise.resolve().then(load);
      pending.set(key,request);request.catch(()=>{if(pending.get(key)===request)pending.delete(key);});
    }
    return pending.get(key);
  }
  function chunk(descriptor){
    if(!immutableURL.test(descriptor?.url||''))throw Error('This reading has no published file.');
    return fetchPublicJSON(new URL(descriptor.url,baseURL),{fetch:fetcher,cache:'force-cache'});
  }
  function ensureWork(value){
    const id=resolveId(value);
    if(!id)return Promise.reject(Error('This book is not in the public collection.'));
    return once('work:'+id,async()=>{
      const work=await chunk(assets.works[id]),header=byId.get(id);
      if(work.id!==id||work.slug!==header.slug||!Array.isArray(work.sources)||!Array.isArray(work.units))throw Error('This published book does not match its shelf entry.');
      const position=data.works.findIndex(row=>row.id===id);data.works[position]=work;byId.set(id,work);loaded.add(id);return work;
    });
  }
  async function ensureWorks(ids){return Promise.all([...new Set(ids)].map(ensureWork));}
  function ensureLateral(){
    if(!data.lateral.id)return Promise.resolve(data);
    return once('lateral',async()=>{
      const descriptor=assets.lateral;
      if(!descriptor||!Array.isArray(descriptor.dependencies))throw Error('This saved comparison has no published file.');
      const [lateral]=await Promise.all([chunk(descriptor),ensureWorks(descriptor.dependencies)]);
      if(lateral.id!==data.lateral.id||!Array.isArray(lateral.sections))throw Error('This published comparison does not match its shelf entry.');
      data.lateral=lateral;return data;
    });
  }
  async function ensureAll(){await Promise.all([ensureWorks(data.works.map(work=>work.id)),ensureLateral()]);return data;}
  async function ownerFor(id){
    if(ownerHeaders.has(id))return ownerHeaders.get(id);
    referenceOwners ||= await once('references',()=>chunk(assets.reference_owners));
    return Object.hasOwn(referenceOwners,id)?referenceOwners[id]:null;
  }
  async function ensureReference(id){const owner=await ownerFor(id);if(!owner)throw Error('This saved reference is no longer in the public collection.');return owner===data.lateral.id?ensureLateral():ensureWork(owner);}
  return {data,ensureWork,ensureWorks,ensureLateral,ensureAll,ownerFor,ensureReference,isWorkLoaded:value=>loaded.has(resolveId(value))};
}

let sharedLibrary;
export function loadLibrary(options={}) {
  const load=async()=>{
    const baseURL=options.baseURL||import.meta.url;
    const catalog=await fetchPublicJSON(new URL('./data/catalogue.json',baseURL),{fetch:options.fetch,cache:'no-cache'});
    return createLibraryLoader(catalog,{...options,baseURL});
  };
  if(options.fetch||options.baseURL)return load();
  if(!sharedLibrary){sharedLibrary=load();sharedLibrary.catch(()=>{sharedLibrary=null;});}
  return sharedLibrary;
}
