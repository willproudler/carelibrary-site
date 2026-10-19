/* Public shelf metadata and preferences; the native shelf owns sorting and UI. */
export const LIBRARY_SORT_KEY='care-public-library-sort-v1';
export const LIBRARY_VISITS_KEY='care-public-library-visits-v1';
const nativeShelfKey='care-studio-shelf/1';
const sorts=new Set(['title','title-desc','author','newest','oldest','added','visited','coverage']);
const validSort=value=>sorts.has(value)?value:null;
const read=(view,key,kind='localStorage')=>{try{return JSON.parse(view?.[kind]?.getItem(key)||'null');}catch{return null;}};
const save=(view,key,value)=>{try{view?.localStorage?.setItem(key,JSON.stringify(value));}catch{}};

export function libraryYear(value){
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 const label=String(value??'').trim().replace(/^−/,'-').replace(/\./g,'');
 const match=label.match(/^(?:(?:c|ca|circa)\s*)?(?:(?:AD|CE)\s+)?([+-]?\d{1,4})(?=$|\s|[–—/\-])/i);
 if(!match)return null;
 const year=Number(match[1]);
 return /\b(?:BC|BCE)\b/i.test(label)?-Math.abs(year):year;
}

function timestamp(value){
 if(typeof value!=='string'||!value.trim())return null;
 const time=Date.parse(value);
 return Number.isFinite(time)?new Date(time).toISOString():null;
}
function recordedAddedDate(work){
 const explicit=timestamp(work.ingested_at)||timestamp(work.added_at);
 if(explicit)return explicit;
 // The exported edition label records an actual added date, distinct from
 // its build/run date. Older editions without that evidence stay undated.
 const date=String(work.version_label||'').match(/\bAdded (\d{1,2}) ([A-Za-z]{3}) (\d{4})\b/);
 if(!date)return null;
 const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(date[2].toLowerCase());
 if(month<0)return null;
 const value=new Date(Date.UTC(Number(date[3]),month,Number(date[1])));
 return value.getUTCDate()===Number(date[1])?value.toISOString():null;
}

export function librarySortMetadata(work){
 return {
  original_year:libraryYear(work.original_year)??libraryYear(work.year)??libraryYear(work.publication_year),
  publication_year:libraryYear(work.publication_year),
  ingested_at:recordedAddedDate(work),
  last_visited_at:timestamp(work.last_visited_at),
  care_units:Array.isArray(work.units)?work.units.length:0,
 };
}

export function createLibrarySort(root,books,{view=root.ownerDocument?.defaultView,now=()=>new Date().toISOString()}={}){
 const stored=read(view,LIBRARY_SORT_KEY),legacy=read(view,nativeShelfKey,'sessionStorage');
 let sort=validSort(stored?.sort)||validSort(legacy?.sort)||'oldest',applying=false;
 if(!validSort(stored?.sort)&&validSort(legacy?.sort))save(view,LIBRARY_SORT_KEY,{sort});
 const storedVisits=read(view,LIBRARY_VISITS_KEY),visits={};
 if(storedVisits&&typeof storedVisits==='object'&&!Array.isArray(storedVisits)){
  for(const [id,value]of Object.entries(storedVisits)){const date=timestamp(value);if(date)visits[id]=date;}
 }
 for(const book of books)if(visits[book.id])book.last_visited_at=visits[book.id];
 const change=event=>{
  const control=event.target?.closest?.('[data-shelf-input="sort"]'),next=validSort(control?.value);
  if(applying||!next)return;
  sort=next;save(view,LIBRARY_SORT_KEY,{sort});
 };
 root.addEventListener('change',change);
 return {
  apply(){
   const control=root.querySelector('[data-shelf-input="sort"]');
   if(!control||control.value===sort)return;
   // Apply through the real shelf handler, including when browser storage is
   // unavailable. The native control, rendered cards, and runtime stay in sync.
   applying=true;
   try{control.value=sort;control.dispatchEvent(new view.Event('change',{bubbles:true}));}finally{applying=false;}
  },
  visit(id){
   const book=books.find(row=>row.id===id),date=timestamp(now());
   if(!book||!date)return;
   visits[id]=date;book.last_visited_at=date;save(view,LIBRARY_VISITS_KEY,visits);
  },
  dispose(){root.removeEventListener('change',change);},
 };
}
