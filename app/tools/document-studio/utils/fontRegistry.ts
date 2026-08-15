/**
 * Canonical typography registry for Document Studio editor + PDF + DOCX.
 * Only values from this registry may reach generated CSS/HTML/OOXML.
 */

export type FontId =
  | "default"
  | "jameel-noori-nastaleeq"
  | "noto-nastaliq-urdu"
  | "amiri"
  | "noto-naskh-arabic"
  | "vazirmatn"
  | "sahel"
  | "inter";

export type Direction = "rtl" | "ltr";

export interface StudioFontDefinition {
  id: FontId;
  label: string;
  editorFamily: string;
  category: "urdu" | "arabic" | "persian" | "latin" | "multilingual";
  scripts: Array<"arabic" | "latin">;
  cssStack: string;
  cssClass: string;
  pdf: {
    supported: boolean;
    embedded: boolean;
    familyName?: string;
    regularFiles?: string[];
    boldFiles?: string[];
  };
  docx: {
    supported: boolean;
    embedded: boolean;
    familyName?: string;
  };
  fallbackFontId?: FontId;
  availability: "bundled" | "local-preview-only" | "fallback";
  notes?: string;
}

export interface FontResolution {
  requested: string | null;
  fontId: FontId;
  editorFamily: string | null;
  pdfFamily: string;
  docxFamily: string;
  cssClass: string;
  fellBack: boolean;
  fallbackFrom?: string;
}

export const STUDIO_FONTS: StudioFontDefinition[] = [
  {
    id: "default",
    label: "Default",
    editorFamily: "",
    category: "multilingual",
    scripts: ["arabic", "latin"],
    cssStack: "inherit",
    cssClass: "qf-default",
    pdf: { supported: true, embedded: false },
    docx: { supported: true, embedded: false },
    availability: "fallback",
  },
  {
    id: "jameel-noori-nastaleeq",
    label: "Jameel Noori Nastaleeq",
    editorFamily: "Jameel Noori Nastaleeq",
    category: "urdu",
    scripts: ["arabic"],
    cssStack: '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif',
    cssClass: "qf-jameel",
    pdf: { supported: false, embedded: false },
    docx: { supported: true, embedded: false, familyName: "Jameel Noori Nastaleeq" },
    fallbackFontId: "noto-nastaliq-urdu",
    availability: "local-preview-only",
    notes:
      "Local editor preview when installed. Not bundled for server PDF. DOCX preserves family name for Word local install.",
  },
  {
    id: "noto-nastaliq-urdu",
    label: "Noto Nastaliq Urdu",
    editorFamily: "Noto Nastaliq Urdu",
    category: "urdu",
    scripts: ["arabic"],
    cssStack: '"Noto Nastaliq Urdu", serif',
    cssClass: "qf-noto-nastaliq",
    pdf: {
      supported: true,
      embedded: true,
      familyName: "Noto Nastaliq Urdu",
      regularFiles: ["@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2"],
      boldFiles: ["@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2"],
    },
    docx: { supported: true, embedded: false, familyName: "Noto Nastaliq Urdu" },
    availability: "bundled",
  },
  {
    id: "amiri",
    label: "Amiri",
    editorFamily: "Amiri",
    category: "arabic",
    scripts: ["arabic", "latin"],
    cssStack: "Amiri, serif",
    cssClass: "qf-amiri",
    pdf: {
      supported: true,
      embedded: true,
      familyName: "Amiri",
      regularFiles: ["@fontsource/amiri/files/amiri-arabic-400-normal.woff2"],
      boldFiles: ["@fontsource/amiri/files/amiri-arabic-700-normal.woff2"],
    },
    docx: { supported: true, embedded: false, familyName: "Amiri" },
    availability: "bundled",
  },
  {
    id: "noto-naskh-arabic",
    label: "Noto Naskh Arabic",
    editorFamily: "Noto Naskh Arabic",
    category: "arabic",
    scripts: ["arabic"],
    cssStack: '"Noto Naskh Arabic", serif',
    cssClass: "qf-noto-naskh",
    pdf: {
      supported: true,
      embedded: true,
      familyName: "Noto Naskh Arabic",
      regularFiles: ["@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2"],
      boldFiles: ["@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-700-normal.woff2"],
    },
    docx: { supported: true, embedded: false, familyName: "Noto Naskh Arabic" },
    availability: "bundled",
  },
  {
    id: "vazirmatn",
    label: "Vazirmatn",
    editorFamily: "Vazirmatn",
    category: "persian",
    scripts: ["arabic", "latin"],
    cssStack: "Vazirmatn, sans-serif",
    cssClass: "qf-vazirmatn",
    pdf: {
      supported: true,
      embedded: true,
      familyName: "Vazirmatn",
      regularFiles: ["@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff2"],
      boldFiles: ["@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff2"],
    },
    docx: { supported: true, embedded: false, familyName: "Vazirmatn" },
    availability: "bundled",
  },
  {
    id: "sahel",
    label: "Sahel",
    editorFamily: "Sahel",
    category: "persian",
    scripts: ["arabic", "latin"],
    cssStack: 'Sahel, Tahoma, "Segoe UI", sans-serif',
    cssClass: "qf-sahel",
    pdf: { supported: false, embedded: false },
    docx: { supported: true, embedded: false, familyName: "Sahel" },
    fallbackFontId: "vazirmatn",
    availability: "local-preview-only",
    notes: "No bundled embeddable asset; PDF falls back to Vazirmatn.",
  },
  {
    id: "inter",
    label: "Inter",
    editorFamily: "Inter",
    category: "latin",
    scripts: ["latin"],
    cssStack: "Inter, system-ui, sans-serif",
    cssClass: "qf-inter",
    pdf: {
      supported: true,
      embedded: true,
      familyName: "Inter",
      regularFiles: ["@fontsource/inter/files/inter-latin-400-normal.woff2"],
      boldFiles: ["@fontsource/inter/files/inter-latin-700-normal.woff2"],
    },
    docx: { supported: true, embedded: false, familyName: "Inter" },
    availability: "bundled",
  },
];

const byEditorFamily = new Map<string, StudioFontDefinition>();
const byId = new Map<FontId, StudioFontDefinition>();
for (const f of STUDIO_FONTS) {
  byId.set(f.id, f);
  if (f.editorFamily) byEditorFamily.set(f.editorFamily, f);
}

export function getFontById(id: FontId): StudioFontDefinition {
  return byId.get(id)!;
}

export function listEditorFonts(): StudioFontDefinition[] {
  return STUDIO_FONTS.filter((f) => f.id !== "default");
}

export function directionForNode(
  node: { attrs?: Record<string, unknown> | null },
  globalDir: Direction
): Direction {
  const value = node.attrs?.dir;
  if (value === "rtl" || value === "ltr") return value;
  return globalDir;
}

export function resolveEditorFontFamily(
  raw: unknown,
  globalDir: Direction = "rtl"
): FontResolution {
  const requested =
    typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;

  if (!requested) {
    const defId: FontId = globalDir === "ltr" ? "inter" : "noto-nastaliq-urdu";
    const def = getFontById(defId);
    return {
      requested: null,
      fontId: defId,
      editorFamily: null,
      pdfFamily: def.pdf.familyName ?? def.editorFamily,
      docxFamily: def.docx.familyName ?? def.editorFamily,
      cssClass: def.cssClass,
      fellBack: false,
    };
  }

  const found = byEditorFamily.get(requested);
  if (!found) {
    const fallback = getFontById(globalDir === "ltr" ? "inter" : "noto-nastaliq-urdu");
    return {
      requested,
      fontId: fallback.id,
      editorFamily: requested,
      pdfFamily: fallback.pdf.familyName ?? fallback.editorFamily,
      docxFamily: fallback.docx.familyName ?? fallback.editorFamily,
      cssClass: fallback.cssClass,
      fellBack: true,
      fallbackFrom: requested,
    };
  }

  if (!found.pdf.supported || !found.pdf.familyName) {
    const fb = getFontById(found.fallbackFontId ?? "noto-nastaliq-urdu");
    return {
      requested,
      fontId: found.id,
      editorFamily: found.editorFamily,
      pdfFamily: fb.pdf.familyName ?? fb.editorFamily,
      docxFamily: found.docx.familyName ?? found.editorFamily,
      cssClass: fb.cssClass,
      fellBack: true,
      fallbackFrom: found.editorFamily,
    };
  }

  return {
    requested,
    fontId: found.id,
    editorFamily: found.editorFamily,
    pdfFamily: found.pdf.familyName,
    docxFamily: found.docx.familyName ?? found.editorFamily,
    cssClass: found.cssClass,
    fellBack: false,
  };
}

export function resolvePdfFontId(familyName: string): FontId | null {
  for (const f of STUDIO_FONTS) {
    if (f.pdf.familyName === familyName) return f.id;
  }
  return null;
}

export function collectPdfEmbedFonts(
  usedFamilyNames: Iterable<string>
): StudioFontDefinition[] {
  const out: StudioFontDefinition[] = [];
  const seen = new Set<FontId>();
  for (const name of usedFamilyNames) {
    const id = resolvePdfFontId(name);
    if (!id) continue;
    const def = getFontById(id);
    if (!def.pdf.embedded || !def.pdf.familyName) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(def);
  }
  return out;
}
