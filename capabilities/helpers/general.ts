import * as path from 'path';
import * as fs from 'fs';
import { promises as pfs } from 'fs';

export function sleep(seconds: number): Promise<void> {
  return new Promise(res => setTimeout(res, secs(1)));
}

export async function untilTrue(predicate: () => Promise<boolean>) {
  while (true) { if (await predicate()) { break } await sleep(1) }
}

export function ms(num: number): number { return num }
export function secs(num: number): number { return num * 1000 }
export function mins(num: number): number { return num * secs(60)}

export async function waitLock(file: string, unique: string) {
  const lock = async () => {
    let fileHandle: pfs.FileHandle;

    // 'wx' --> open for write; create if it does not exist & fail if does
    // https://nodejs.org/api/pfs.html#file-system-flags
    try { fileHandle = await pfs.open(file, 'wx') }
    catch (e) {
      if (e.code === 'EEXIST') { return false } else { throw e }
    }
    
    try { await fileHandle.write(unique) }
    finally { await fileHandle.close() }

    return true
  }
  
  await untilTrue(lock)
}

export function nearestAncestor(filename: string, fromPath: string): string {
  let parts = fromPath.split(path.sep)
  let starp = Array.from(parts).reverse()

  let searchPaths = []
  parts.forEach((_, idx) => searchPaths.push(
    starp.slice(idx, parts.length).reverse().join(path.sep)
  ))

  for (const sp of searchPaths) {
    const candidate = sp + path.sep + filename
    if (fs.statSync(candidate, { throwIfNoEntry: false })) { return candidate }
  }

  throw `Can't find file "${filename}" in/above path "${fromPath}".`
}
