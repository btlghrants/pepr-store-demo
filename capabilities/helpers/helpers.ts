import { promises as fs } from 'fs';

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
    let fileHandle: fs.FileHandle;

    // 'wx' --> open for write; create if it does not exist & fail if does exist.
    // https://nodejs.org/api/fs.html#file-system-flags
    try { fileHandle = await fs.open(file, 'wx') }
    catch (e) {
      if (e.code === 'EEXIST') { return false } else { throw e }
    }
    
    try { await fileHandle.write(unique) }
    finally { await fileHandle.close() }

    return true
  }
  
  await untilTrue(lock)
}