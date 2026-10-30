import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { JAMEEL_EDITOR_FONT_URL } from '../../app/tools/document-studio/utils/fontRegistry';

/** Owner-supplied font stays outside git. Never substitute another font or skip. */
export function localJameelBytes(): Buffer {
  const filename = process.env.QALAM_TEST_JAMEEL_FONT;
  if (!filename) throw new Error('Set QALAM_TEST_JAMEEL_FONT to the owner-supplied local WOFF2 (outside the repository).');
  const bytes = readFileSync(filename);
  if (createHash('sha256').update(bytes).digest('hex') !== 'd12978f4398f1f788d65fa7ccb872cf0e1c43aef89166816243e94487d9cee27') throw new Error('Local Jameel fixture is not the approved font.');
  return bytes;
}
export async function interceptLocalJameel(page: Page) {
  const bytes=localJameelBytes();
  await page.route(JAMEEL_EDITOR_FONT_URL,route=>route.fulfill({status:200,body:bytes,contentType:'font/woff2',headers:{'access-control-allow-origin':'*'}}));
}
export function localJameelFetch() {
  const bytes=localJameelBytes(), original=globalThis.fetch;
  globalThis.fetch = async (input,init) => {
    const url=input instanceof Request?input.url:String(input);
    if (url===JAMEEL_EDITOR_FONT_URL) return new Response(new Uint8Array(bytes),{status:200,headers:{'content-type':'font/woff2','content-length':String(bytes.length)}});
    return original(input,init);
  };
  return ()=>{globalThis.fetch=original;};
}
