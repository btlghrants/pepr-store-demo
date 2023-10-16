export function sleep(seconds: number): Promise<void> {
  return new Promise(res => setTimeout(res, seconds * 1000));
}

export async function untilTrue(predicate: () => Promise<boolean>) {
  while (true) { if (await predicate()) { break } await sleep(1) }
}

export function secs(num: number): number { return num * 1000 }
export function mins(num: number): number { return num * secs(60)}