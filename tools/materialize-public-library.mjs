// Generated CARE catalogue materializer. Source: care_platform/beta_catalogue_loader.py.
import {readFile,writeFile,rename,rm,realpath} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,relative,isAbsolute} from 'node:path';
import {webcrypto} from 'node:crypto';
import {loadPublicLibrary} from '../public-library.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

export async function materializePublicLibrary(root = fileURLToPath(new URL('../', import.meta.url))) {
  const site = await realpath(root), catalogue = resolve(site, 'data/library.json');
  const catalogueURL = pathToFileURL(catalogue).href;
  const original = await readFile(catalogue), chunks = [];
  const fetcher = async requested => {
    const url = new URL(requested);
    if (url.protocol !== 'file:') throw Error('Catalogue build reads only local public files.');
    const path = await realpath(fileURLToPath(url)), local = relative(site, path);
    if (local === '..' || local.startsWith('../') || isAbsolute(local)) throw Error('Catalogue file is outside the public site.');
    const bytes = requested === catalogueURL ? original : await readFile(path);
    if (requested !== catalogueURL) chunks.push(bytes);
    return new Response(bytes);
  };
  // The shared loader verifies schema, paths, sizes, every checksum, UTF-8,
  // and the final library object before any file is replaced.
  await loadPublicLibrary(catalogueURL, fetcher);
  if (!chunks.length) return false;
  const temporary = `${catalogue}.materializing-${process.pid}`;
  try {
    // Keep exact reviewed bytes, including whitespace and the final newline.
    await writeFile(temporary, Buffer.concat(chunks));
    await rename(temporary, catalogue);
  } finally { await rm(temporary, {force:true}); }
  return true;
}

// Imports from stdin/eval have no on-disk entrypoint; do not run the CLI there.
const entrypoint = process.argv[1] && await realpath(process.argv[1]).catch(() => null);
if (entrypoint && pathToFileURL(entrypoint).href === import.meta.url) {
  const changed = await materializePublicLibrary(process.argv[2]);
  console.log(changed ? 'Materialized the verified public catalogue for the existing build.' : 'The complete public catalogue is ready for the existing build.');
}
