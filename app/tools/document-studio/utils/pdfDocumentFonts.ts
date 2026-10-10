import { readFileSync, existsSync } from "fs";
import path from "path";
import { isApprovedPublicBlobFontUrl } from "./publicBlobFontCatalog";
import { requiredPdfEmbedFonts, type PdfFonts, type PdfFontFace } from "./buildPdfHtml";
import type { DocNode, Direction } from "./extractPlainText";
import type { DocumentStudioSettings } from "./documentSettings";
import { STUDIO_FONTS, type StudioFontDefinition } from "./fontRegistry";

let cachedFaces: Map<string, PdfFontFace> | null = null;

const cachedPublicFonts = new Map<string, Promise<string | null>>();
const PUBLIC_FONT_MAX_BYTES = 21 * 1024 * 1024;

/** Fetch only selected public fonts, never the full 29 MB font catalogue. */
async function loadPublicFontSource(url: string): Promise<string | null> {
  if (!isApprovedPublicBlobFontUrl(url)) return null;
  const cached = cachedPublicFonts.get(url);
  if (cached) return cached;
  const loading = (async (): Promise<string | null> => {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 25000);
    try {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) return null;
      const declared = Number(response.headers.get("content-length"));
      if (declared > PUBLIC_FONT_MAX_BYTES) return null;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > PUBLIC_FONT_MAX_BYTES) return null;
      return bytes.toString("base64");
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();
  cachedPublicFonts.set(url, loading);
  void loading.then((value) => { if (value === null) cachedPublicFonts.delete(url); });
  return loading;
}

async function loadPublicFontFace(def: StudioFontDefinition): Promise<PdfFontFace> {
  const regularFiles = def.pdf.regularFiles ?? [];
  const boldFiles = def.pdf.boldFiles ?? [];
  const [regular, bold] = await Promise.all([
    Promise.all(regularFiles.map(loadPublicFontSource)),
    Promise.all(boldFiles.map(loadPublicFontSource)),
  ]);
  const regularSources = regular.filter((s): s is string => s !== null);
  const boldSources = bold.filter((s): s is string => s !== null);
  return {
    familyName: def.pdf.familyName ?? def.editorFamily,
    regularSources,
    boldSources: boldSources.length ? boldSources : undefined,
    complete: regularSources.length === regularFiles.length
      && boldSources.length === boldFiles.length && regularSources.length > 0,
    declaredRegular: regularFiles.length,
    declaredBold: boldFiles.length,
    loadedRegular: regularSources.length,
    loadedBold: boldSources.length,
  };
}


function resolveLocalFontPath(relPath: string): string | null {
  const cwd = process.cwd();
  let full: string;
  if (relPath.startsWith("assets/fonts/")) {
    const filename = path.basename(relPath.slice("assets/fonts/".length));
    if (!filename || filename.includes("..")) return null;
    full = path.join(cwd, "assets", "fonts", filename);
    const root = path.join(cwd, "assets", "fonts");
    if (!full.startsWith(root + path.sep) && full !== root) return null;
  } else {
    full = path.join(cwd, "node_modules", relPath);
    const root = path.join(cwd, "node_modules");
    if (!full.startsWith(root + path.sep) && full !== root) {
      console.warn("[pdf-font] Path outside approved root, skipping:", relPath);
      return null;
    }
  }
  return full;
}

function readBase64Sync(relPath: string): string | null {
  const full = resolveLocalFontPath(relPath);
  if (!full) return null;
  if (!existsSync(full)) {
    console.warn("[pdf-font] Font file missing:", relPath);
    return null;
  }
  return readFileSync(full).toString("base64");
}

async function loadAllBundledFaces(): Promise<Map<string, PdfFontFace>> {
  if (cachedFaces) return cachedFaces;
  const map = new Map<string, PdfFontFace>();
  for (const def of STUDIO_FONTS) {
    if (!def.pdf.embedded || !def.pdf.familyName || !def.pdf.regularFiles?.length) continue;
    const declaredRegular = def.pdf.regularFiles.length;
    const declaredBold = def.pdf.boldFiles?.length ?? 0;
    // Public fonts are loaded per-document, not during cold starts.
    if (def.availability === "public-blob") continue;
    const regularSources: string[] = [];
    for (const f of def.pdf.regularFiles) {
      const b = readBase64Sync(f);
      if (b) regularSources.push(b);
    }
    const boldSources: string[] = [];
    for (const f of def.pdf.boldFiles ?? []) {
      const b = readBase64Sync(f);
      if (b) boldSources.push(b);
    }
    const complete =
      regularSources.length === declaredRegular &&
      (declaredBold === 0 || boldSources.length === declaredBold) &&
      regularSources.length > 0;
    if (!complete) {
      console.warn(
        `[pdf-font] Incomplete: ${def.pdf.familyName}` +
        ` regular ${regularSources.length}/${declaredRegular}` +
        ` bold ${boldSources.length}/${declaredBold}`,
      );
    }
    map.set(def.pdf.familyName, {
      familyName: def.pdf.familyName,
      regularSources,
      boldSources: boldSources.length > 0 ? boldSources : undefined,
      complete,
      declaredRegular,
      declaredBold,
      loadedRegular: regularSources.length,
      loadedBold: boldSources.length,
    });
  }
  cachedFaces = map;
  return map;
}

export async function fontsForDocument(
  doc: DocNode,
  dir: Direction,
  typography?: DocumentStudioSettings["typography"],
): Promise<{ fonts: PdfFonts; jameelRequested: boolean; jameelLoad: string }> {
  const needed = requiredPdfEmbedFonts(doc, dir, typography);
  const all = await loadAllBundledFaces();
  const names = new Set<string>();
  const faces: PdfFontFace[] = [];
  for (const def of needed) {
    const name = def.pdf.familyName;
    if (!name || names.has(name)) continue;
    const face = def.availability === "public-blob"
      ? await loadPublicFontFace(def)
      : all.get(name);
    if (face) {
      faces.push(face);
      names.add(name);
    }
  }
  // Always preserve the known-good fallback faces for mixed-script PDFs.
  for (const name of ["Noto Nastaliq Urdu", "Inter"]) {
    const fallback = all.get(name);
    if (!names.has(name) && fallback) {
      faces.push(fallback);
      names.add(name);
    }
  }
  const jameelRequested = needed.some(def => def.id === "jameel-noori-nastaleeq");
  const jameelFace = faces.find(face => face.familyName === "Jameel Noori Nastaleeq");
  return {
    fonts: { faces },
    jameelRequested,
    jameelLoad: !jameelRequested ? "not-requested" : jameelFace?.complete ? "loaded-public" : "unavailable",
  };
}
