import { defaultDocumentSettings, type DocumentStudioSettings } from "../documentSettings";
import type { InPageSetup } from "./parseInPageSetup";

export function settingsFromInPageSetup(setup: InPageSetup): DocumentStudioSettings {
  const mm = (pt: number) => pt * 25.4 / 72;
  const widthMm = mm(setup.widthPt), heightMm = mm(setup.heightPt);
  const portrait = { widthMm: Math.min(widthMm, heightMm), heightMm: Math.max(widthMm, heightMm) };
  const size = Math.abs(portrait.widthMm - 148) < 0.5 && Math.abs(portrait.heightMm - 210) < 0.5 ? "a5" :
    Math.abs(portrait.widthMm - 215.9) < 0.5 && Math.abs(portrait.heightMm - 279.4) < 0.5 ? "letter" : "a4";
  return {
    ...defaultDocumentSettings(),
    page: {
      size, orientation: widthMm > heightMm ? "landscape" : "portrait", customSizeMm: portrait,
      firstPageNumber: setup.firstPageNumber,
      // Facing-page fields are not persisted by the current setup model.
      // Imported stories are RTL: logical end is physical left (inside).
      margins: { preset: "custom", startMm: mm(setup.marginsPt.outside), endMm: mm(setup.marginsPt.inside), topMm: mm(setup.marginsPt.top), bottomMm: mm(setup.marginsPt.bottom) },
    },
  };
}
