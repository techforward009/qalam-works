export interface PdfRuntimeFontDiagnostics {
  fontSetStatus: "loaded" | "loading";
  jameelFaceCount: number;
  jameelLoadedFaceCount: number;
  jameelLoadResultCount: number;
  allRequestedFontsReady: boolean;
}

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

/**
 * Must be fully self-contained: Puppeteer page.evaluate serializes only this
 * function body into Chromium. Do not reference module-scope names.
 */
export async function inspectPdfRuntimeFonts(families: string[]): Promise<PdfRuntimeFontDiagnostics> {
  const JAMEEL = "Jameel Noori Nastaleeq";
  const fonts = typeof document === "undefined" ? undefined : document.fonts;
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
  const ready = families.every((family) => Boolean(fonts?.check?.(`16px "${family}"`)));
  const list = fonts ? Array.from(fonts as Iterable<FontFace>) : [];
  const jameelFaces = list.filter((face) => face.family.replace(/["']/g, "") === JAMEEL);
  let loadResultCount = 0;
  if (fonts?.load) {
    try {
      const loaded = await fonts.load(`16px "${JAMEEL}"`, "قلم ورکس نستعلیق");
      loadResultCount = Array.isArray(loaded) ? loaded.length : 0;
    } catch {
      loadResultCount = 0;
    }
  }
  return {
    fontSetStatus: fonts?.status === "loading" ? "loading" : "loaded",
    jameelFaceCount: jameelFaces.length,
    jameelLoadedFaceCount: jameelFaces.filter((face) => face.status === "loaded").length,
    jameelLoadResultCount: loadResultCount,
    allRequestedFontsReady: ready,
  };
}

export function jameelActuallyUsed(diag: PdfRuntimeFontDiagnostics, actualFont: string): boolean {
  if (actualFont.toLowerCase().includes("jameel")) return true;
  return diag.jameelLoadedFaceCount > 0 && diag.jameelLoadResultCount > 0 && diag.allRequestedFontsReady;
}
