import { readFileSync, existsSync } from "fs";
import path from "path";
import { applyJameelFace, resolveRequestScopedJameelFace } from "./pdfJameelRequest";
import { requiredPdfEmbedFonts, type PdfFonts, type PdfFontFace } from "./buildPdfHtml";
import type { DocNode, Direction } from "./extractPlainText";
import type { DocumentStudioSettings } from "./documentSettings";
import { STUDIO_FONTS } from "./fontRegistry";

let cachedFaces: Map<string, PdfFontFace> | null = null;

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
    const isPrivateBlob = def.pdf.regularFiles.some(f => f.startsWith("private-blob:"));
    if (isPrivateBlob) continue;
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
  const jameel = await resolveRequestScopedJameelFace(needed);
  const all = await loadAllBundledFaces();
  const faces: PdfFontFace[] = [];
  const seen = new Set<string>();
  for (const def of needed) {
    const name = def.pdf.familyName;
    if (!name || seen.has(name)) continue;
    const face = all.get(name);
    if (face) {
      faces.push(face);
      seen.add(name);
    }
  }
  // Mixed/LTR documents may still contain Urdu or a selected Jameel run.
  for (const fallbackName of ["Noto Nastaliq Urdu", "Inter"]) {
    if (!seen.has(fallbackName) && all.has(fallbackName)) faces.push(all.get(fallbackName)!);
  }
  return {
    fonts: { faces: applyJameelFace(faces, jameel.face) },
    jameelRequested: jameel.requested,
    jameelLoad: jameel.loadReason,
  };
}
