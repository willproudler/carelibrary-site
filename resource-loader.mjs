// Bounded requests: transient failures may be retried by the visible Retry action.
export async function loadText(url, {fetcher=fetch, timeout=20000}={}) {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
 try {const response=await fetcher(url,{signal:controller.signal});if(!response.ok)throw Error('A reading component could not load. Please try again.');return await response.text();}
 catch(error){if(error.name==='AbortError')throw Error('The connection took too long. Please try again.');throw error;}
 finally{clearTimeout(timer);}
}
