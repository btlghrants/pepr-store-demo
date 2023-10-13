export function sleep(seconds: number): Promise<void> {
  return new Promise(res => setTimeout(res, seconds * 1000));
}

export async function waitFor(pred: () => Promise<boolean>) {
  while (true) { if (await pred()) { break } await sleep(1) }
}
