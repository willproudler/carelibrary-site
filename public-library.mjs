// Generated CARE catalogue loader. Source: care_platform/beta_catalogue_loader.py.
const PARTS_FORMAT = 'care-public-library-parts/1';
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_PARTS = 2048;
const MAX_LIBRARY_BYTES = 1024 * 1024 * 1024;
const MAX_PART_BYTES = 8 * 1024 * 1024;

function invalid(message) {
  return new Error(`CARE Library Beta could not load: ${message}`);
}

function library(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.works)) {
    throw invalid('the catalogue is not a valid library.');
  }
  return value;
}

function manifest(value) {
  if (value.format !== PARTS_FORMAT || !SHA256.test(value.sha256 || '')
      || !Number.isSafeInteger(value.bytes) || value.bytes <= 0 || value.bytes > MAX_LIBRARY_BYTES
      || !Array.isArray(value.parts) || !value.parts.length || value.parts.length > MAX_PARTS) {
    throw invalid('the catalogue parts manifest is invalid.');
  }
  let total = 0;
  for (const part of value.parts) {
    if (!part || typeof part !== 'object' || !SHA256.test(part.sha256 || '')
        || part.path !== `library-parts/${part.sha256}.jsonpart`
        || !Number.isSafeInteger(part.bytes) || part.bytes <= 0 || part.bytes > Math.min(value.bytes, MAX_PART_BYTES)) {
      throw invalid('a catalogue part has an invalid path, checksum or size.');
    }
    total += part.bytes;
    if (!Number.isSafeInteger(total) || total > value.bytes) throw invalid('catalogue part sizes do not match the total.');
  }
  if (total !== value.bytes) throw invalid('catalogue part sizes do not match the total.');
  return value;
}

async function fetchResponse(fetcher, url, cache) {
  let response;
  try { response = await fetcher(url, {cache}); }
  catch (error) { throw invalid(`a catalogue request failed (${error?.message || 'network error'}). Please refresh to try again.`); }
  if (!response?.ok) throw invalid(`a catalogue request failed${response?.status ? ` (HTTP ${response.status})` : ''}. Please refresh to try again.`);
  return response;
}

async function digest(bytes) {
  if (!globalThis.crypto?.subtle) throw invalid('this browser cannot verify catalogue checksums.');
  const result = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(result)].map(value => value.toString(16).padStart(2, '0')).join('');
}

/** Load either a complete catalogue or its integrity-checked UTF-8 parts. */
export async function loadPublicLibrary(url, fetcher = globalThis.fetch) {
  if (typeof fetcher !== 'function') throw invalid('network access is unavailable.');
  const response = await fetchResponse(fetcher, url, 'no-cache');
  let value;
  try { value = await response.json(); }
  catch (_) { throw invalid('the catalogue response is not valid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return library(value);
  if (!Object.hasOwn(value, 'format') || value.format === 'care-public-library/1') return library(value);
  const parts = manifest(value);
  const fallbackBase = globalThis.document?.baseURI || globalThis.location?.href;
  let base;
  try { base = new URL(response.url || String(url), fallbackBase); }
  catch (_) { throw invalid('the catalogue URL cannot resolve its parts.'); }
  const joined = new Uint8Array(parts.bytes);
  let offset = 0;
  // Sequential requests keep memory and concurrent downloads bounded. Parts
  // are immutable by checksum and can be reused from the browser cache.
  for (const part of parts.parts) {
    const partResponse = await fetchResponse(fetcher, new URL(part.path, base).href, 'force-cache');
    let bytes;
    try { bytes = new Uint8Array(await partResponse.arrayBuffer()); }
    catch (_) { throw invalid('a catalogue part could not be read.'); }
    if (bytes.byteLength !== part.bytes) throw invalid('a catalogue part has the wrong size. Please refresh to try again.');
    if (await digest(bytes) !== part.sha256) throw invalid('a catalogue part failed its checksum. Please refresh to try again.');
    joined.set(bytes, offset);
    offset += bytes.byteLength;
  }
  if (await digest(joined) !== parts.sha256) throw invalid('the assembled catalogue failed its checksum.');
  let decoded;
  try { decoded = new TextDecoder('utf-8', {fatal:true}).decode(joined); }
  catch (_) { throw invalid('the assembled catalogue is not valid UTF-8.'); }
  try { value = JSON.parse(decoded); }
  catch (_) { throw invalid('the assembled catalogue is not valid JSON.'); }
  return library(value);
}
