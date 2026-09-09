/** Puppeteer page.evaluate helper: wait until named families are loaded. */
export async function waitForPdfDocumentFonts(families: string[]): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const fonts = document.fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      /* continue */
    }
  }
  if (fonts?.load) {
    for (const family of families) {
      try {
        await fonts.load(`16px "${family}"`);
      } catch {
        /* family may be a fallback */
      }
    }
  }
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      /* continue */
    }
  }
  return families.every((family) => Boolean(fonts?.check?.(`16px "${family}"`)));
}
