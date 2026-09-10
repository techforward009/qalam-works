import {
  jameelLoadToPdfFace,
  loadPrivateJameelWoff2,
  type JameelFontLoadReason,
  type JameelFontLoadResult,
} from "../../../lib/privateJameelFont";
import type { PdfFontFace } from "./buildPdfHtml";
import type { StudioFontDefinition } from "./fontRegistry";

export const JAMEEL_PDF_FAMILY = "Jameel Noori Nastaleeq";

export type JameelPdfLoadReason = JameelFontLoadReason | "not-requested";

export function isJameelPdfRequested(needed: StudioFontDefinition[]): boolean {
  return needed.some((def) => def.pdf.familyName === JAMEEL_PDF_FAMILY);
}

export async function resolveRequestScopedJameelFace(
  needed: StudioFontDefinition[],
  load: () => Promise<JameelFontLoadResult> = loadPrivateJameelWoff2,
): Promise<{ requested: boolean; loadReason: JameelPdfLoadReason; face: PdfFontFace | null }> {
  if (!isJameelPdfRequested(needed)) {
    return { requested: false, loadReason: "not-requested", face: null };
  }
  const result = await load();
  const face = jameelLoadToPdfFace(result) as PdfFontFace;
  return {
    requested: true,
    loadReason: result.reason,
    face,
  };
}

export function applyJameelFace(faces: PdfFontFace[], face: PdfFontFace | null): PdfFontFace[] {
  if (!face) return faces;
  const next = faces.filter((item) => item.familyName !== JAMEEL_PDF_FAMILY);
  next.push(face);
  return next;
}
