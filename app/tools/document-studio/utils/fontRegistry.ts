/**
 * Canonical typography registry for Document Studio editor + PDF + DOCX.
 * Only values from this registry may reach generated CSS/HTML/OOXML.
 */

import { detectParagraphDirection } from "./paragraphDirectionDetection";
import { PUBLIC_BLOB_FONT_FAMILIES, publicBlobFontUrl } from "./publicBlobFontCatalog";
import type { DocNode } from "./extractPlainText";

export type FontId =
  | "default"
  | "jameel-noori-nastaleeq"
  | "noto-nastaliq-urdu"
  | "amiri"
  | "noto-naskh-arabic"
  | "vazirmatn"
  | "sahel"
  | "al-fars-9-badr"
  | "b-nazanin"
  | "inter"
  | "mehr-nastaliq-web"
  | "digital-khatt-indo-pak"
  | "gulzar"
  | "nafees-nastaleeq"
  | "scheherazade-new"
;

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
  availability: "bundled" | "public-blob" | "local-preview-only" | "fallback";
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

const EXTRA_BLOB_FONTS: StudioFontDefinition[] = PUBLIC_BLOB_FONT_FAMILIES
  .filter((font) => !font.existingStudioId)
  .map((font): StudioFontDefinition => {
    const family = font.editorFamily ?? font.label;
    const fallbackFontId: FontId = font.script === "urdu" ? "noto-nastaliq-urdu"
      : font.script === "persian" ? "vazirmatn" : "noto-naskh-arabic";
    return {
      id: font.id as FontId,
      label: font.label,
      editorFamily: family,
      category: font.script === "quran" ? "arabic" : font.script,
      scripts: ["arabic"],
      cssStack: font.id === "mehr-nastaliq-web"
        ? '"Mehr Nastaliq Web", "Noto Nastaliq Urdu", serif'
        : `"${family}", serif`,
      cssClass: `qf-blob-${font.id}`,
      pdf: {
        supported: true,
        embedded: true,
        familyName: family,
        regularFiles: [publicBlobFontUrl(font.regular)],
        ...(font.bold ? { boldFiles: [publicBlobFontUrl(font.bold)] } : {}),
      },
      docx: { supported: true, embedded: false, familyName: family },
      fallbackFontId,
      availability: "public-blob" as const,
    };
  });

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
    pdf: {
      supported: true,
      embedded: true,
      familyName: "Jameel Noori Nastaleeq",
      regularFiles: [publicBlobFontUrl("jameel-noori-nastaleeq-400.woff2")],
      // No bold file — Jameel Noori Nastaleeq is distributed as Regular only.
    },
    docx: { supported: true, embedded: false, familyName: "Jameel Noori Nastaleeq" },
    fallbackFontId: "noto-nastaliq-urdu",
    availability: "public-blob",
    notes: "Optional Document Studio Nastaleeq. Browser and PDF use the Cloudflare mirror; an explicit Jameel selection is never rewritten to Alvi.",
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
      regularFiles: [
        "@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2",
        "@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-latin-400-normal.woff2",
      ],
      boldFiles: [
        "@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2",
        "@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-latin-700-normal.woff2",
      ],
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
      regularFiles: [
        "@fontsource/amiri/files/amiri-arabic-400-normal.woff2",
        "@fontsource/amiri/files/amiri-latin-400-normal.woff2",
        "@fontsource/amiri/files/amiri-latin-ext-400-normal.woff2",
      ],
      boldFiles: [
        "@fontsource/amiri/files/amiri-arabic-700-normal.woff2",
        "@fontsource/amiri/files/amiri-latin-700-normal.woff2",
        "@fontsource/amiri/files/amiri-latin-ext-700-normal.woff2",
      ],
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
      regularFiles: [
        "@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2",
        "@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-latin-400-normal.woff2",
        "@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-latin-ext-400-normal.woff2",
      ],
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
      regularFiles: [
        "@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff2",
        "@fontsource/vazirmatn/files/vazirmatn-latin-400-normal.woff2",
        "@fontsource/vazirmatn/files/vazirmatn-latin-ext-400-normal.woff2",
      ],
      boldFiles: [
        "@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff2",
        "@fontsource/vazirmatn/files/vazirmatn-latin-700-normal.woff2",
        "@fontsource/vazirmatn/files/vazirmatn-latin-ext-700-normal.woff2",
      ],
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
    pdf: { supported: true, embedded: true, familyName: "Sahel", regularFiles: [publicBlobFontUrl("Sahel.woff2")] },
    docx: { supported: true, embedded: false, familyName: "Sahel" },
    fallbackFontId: "vazirmatn",
    availability: "public-blob",
    notes: "Browser and PDF use the Vercel public Blob asset; DOCX references the installed font name.",
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
      regularFiles: [
        "@fontsource/inter/files/inter-latin-400-normal.woff2",
        "@fontsource/inter/files/inter-latin-ext-400-normal.woff2",
      ],
      boldFiles: [
        "@fontsource/inter/files/inter-latin-700-normal.woff2",
        "@fontsource/inter/files/inter-latin-ext-700-normal.woff2",
      ],
    },
    docx: { supported: true, embedded: false, familyName: "Inter" },
    availability: "bundled",
  },
  ...EXTRA_BLOB_FONTS,
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

export function editorFontFamilyStack(id: FontId): string {
  switch (id) {
    case "noto-nastaliq-urdu":
      return 'var(--font-nastaliq), "Noto Nastaliq Urdu", serif';
    case "jameel-noori-nastaleeq":
      return '"Jameel Noori Nastaleeq", var(--font-nastaliq), "Noto Nastaliq Urdu", serif';
    case "gulzar":
      return '"Gulzar", var(--font-nastaliq), "Noto Nastaliq Urdu", serif';
    case "mehr-nastaliq-web":
      return '"Mehr Nastaliq Web", var(--font-nastaliq), "Noto Nastaliq Urdu", serif';
    case "amiri":
      return 'var(--font-amiri), Amiri, serif';
    case "noto-naskh-arabic":
      return 'var(--font-naskh), "Noto Naskh Arabic", serif';
    case "vazirmatn":
      return 'var(--font-vazirmatn), Vazirmatn, sans-serif';
    case "sahel":
      return 'Sahel, Tahoma, "Segoe UI", sans-serif';
    case "al-fars-9-badr":
      return '"AlFars 9 Badr", Sahel, var(--font-vazirmatn), Vazirmatn, sans-serif';
    case "b-nazanin":
      return '"B Nazanin", Sahel, var(--font-vazirmatn), Vazirmatn, sans-serif';
    case "inter":
      return 'var(--font-inter), Inter, system-ui, sans-serif';
    case "scheherazade-new":
      return '"Scheherazade New", "Noto Naskh Arabic", serif';
    case "digital-khatt-indo-pak":
      return '"Digital Khatt Indo-Pak", "Noto Naskh Arabic", serif';
    default: {
      const font = getFontById(id);
      return font.cssStack && font.cssStack !== "inherit" ? font.cssStack : "serif";
    }
  }
}

/**
 * Export-time font choice for one directional segment.
 * Does not rewrite stored text. A Nastaliq mark keeps Urdu/Arabic glyphs,
 * while Latin segments use the Latin face so parentheses and English stay readable.
 */
export function exportFamilyForSegment(
  explicitFamily: string | null,
  segmentDir: Direction,
  blockDir: Direction,
): { family: string | null; fontDir: Direction } {
  if (!explicitFamily) return { family: null, fontDir: segmentDir };
  const resolved = resolveEditorFontFamily(explicitFamily, blockDir);
  const font = getFontById(resolved.fontId);
  // Nastaliq has no usable Latin. Latin-only faces such as Inter have no Arabic.
  if (font.category === "urdu" && segmentDir === "ltr") {
    return { family: null, fontDir: "ltr" };
  }
  if (segmentDir === "rtl" && !font.scripts.includes("arabic")) {
    return { family: null, fontDir: "rtl" };
  }
  return { family: explicitFamily, fontDir: blockDir };
}

/**
 * Hidden from new document formatting choices at the owner's request.
 * Keep these definitions in the registry for old documents, DOCX and PDF.
 * Site-wide font faces and other Qalam Works tools must remain untouched.
 */
const HIDDEN_EDITOR_FONT_IDS: ReadonlySet<FontId> = new Set([
  "default",
  "noto-nastaliq-urdu",
  "nafees-nastaleeq",
]);

export function listEditorFonts(): StudioFontDefinition[] {
  return STUDIO_FONTS.filter((font) => !HIDDEN_EDITOR_FONT_IDS.has(font.id));
}

export function directionForNode(
  node: DocNode,
  globalDir: Direction
): Direction {
  const mode = node.attrs?.directionMode;
  if (mode === "rtl" || mode === "ltr") return mode;
  const value = node.attrs?.dir;
  if (mode === "auto") {
    const text = (node.content ?? []).map(child => child.type === "hardBreak" ? "\n" : child.text ?? "").join("");
    return detectParagraphDirection(text, value === "ltr" || value === "rtl" ? value : globalDir);
  }
  if (value === "rtl" || value === "ltr") return value;
  return globalDir;
}

export function isRetiredAlviFont(raw: unknown): boolean {
  if (raw === "alvi-nastaleeq") return true;
  if (typeof raw !== "string") return false;
  const first = raw.split(",")[0]?.trim().replace(/^["']+|["']+$/g, "") ?? "";
  return first === "Alvi Nastaleeq" || first === "alvi-nastaleeq";
}

/** Adobe Arabic, Traditional Arabic, Al Majeed Quranic, and Faiz Lahori are not licensed. */
const REMOVED_UNLICENSED_FONT_IDS = new Set([
  "adobe-arabic",
  "traditional-arabic",
  "al-majeed-quranic",
  "faiz-lahori",
]);
const REMOVED_UNLICENSED_FONT_FAMILIES = new Set([
  "Adobe Arabic",
  "Traditional Arabic",
  "Al Majeed Quranic",
  "Al Majeed Quranic Font",
  "Faiz Lahori Nastaleeq",
  "Faiz Lahori",
]);
export const REMOVED_FONT_FALLBACK_FAMILY = "Scheherazade New";
export const QURAN_FONT_FALLBACK_FAMILY = "Digital Khatt Indo-Pak";

/** Asif Quranic and Al Qalam Quran Majeed are not licensed for this site. */
const REMOVED_QURAN_FONT_IDS = new Set(["asif-quranic", "al-qalam-quran-majeed", "muhammadi-quranic"]);
const REMOVED_QURAN_FONT_FAMILIES = new Set(["Asif Quranic", "Al Qalam Quran Majeed", "Muhammadi Quranic"]);
const QURAN_TEXT_SIGNS = /[\u0615-\u0617\u06D6-\u06ED\u08D3-\u08FF]/u;

export function isRemovedQuranFont(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (REMOVED_QURAN_FONT_IDS.has(trimmed)) return true;
  const first = trimmed.split(",")[0]?.trim().replace(/^["']+|["']+$/g, "") ?? "";
  return REMOVED_QURAN_FONT_FAMILIES.has(first);
}

/** Legacy Quranic annotations use OFL Digital Khatt, not a restricted font. */
export function removedQuranFontReplacement(text: string): string {
  return QURAN_TEXT_SIGNS.test(text) ? QURAN_FONT_FALLBACK_FAMILY : REMOVED_FONT_FALLBACK_FAMILY;
}

export function isRemovedUnlicensedFont(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (REMOVED_UNLICENSED_FONT_IDS.has(trimmed)) return true;
  const first = trimmed.split(",")[0]?.trim().replace(/^["']+|["']+$/g, "") ?? "";
  return REMOVED_UNLICENSED_FONT_FAMILIES.has(first);
}

function retiredFontReplacement(raw: unknown, text = ""): string | null {
  if (isRetiredAlviFont(raw)) return "Mehr Nastaliq Web";
  if (isRemovedQuranFont(raw)) return removedQuranFontReplacement(text);
  if (isRemovedUnlicensedFont(raw)) return REMOVED_FONT_FALLBACK_FAMILY;
  return null;
}

/** Replace a stored Alvi mark with Mehr, and an unlicensed face with Scheherazade New. */
export function migrateAlviDocumentContent<T extends DocNode>(doc: T): T {
  const walk = (node: DocNode): DocNode => {
    const marks = node.marks?.map((mark) => {
      const replacement = retiredFontReplacement(mark.attrs?.fontFamily, node.text ?? "");
      const current = replacement ?? mark.attrs?.fontFamily;
      if (typeof current !== "string") return mark;
      const quoted = quoteEditorFontFamily(current);
      if (!replacement && quoted === mark.attrs?.fontFamily) return mark;
      return { ...mark, attrs: { ...mark.attrs, fontFamily: quoted || current } };
    });
    const content = node.content?.map(walk);
    const marksChanged = marks !== undefined && marks.some((mark, index) => mark !== node.marks?.[index]);
    const contentChanged = content !== undefined && content.some((child, index) => child !== node.content?.[index]);
    if (!marksChanged && !contentChanged) return node;
    return {
      ...node,
      ...(marksChanged ? { marks } : {}),
      ...(contentChanged ? { content } : {}),
    };
  };
  return walk(doc) as T;
}

export function storedRecordUsesAlvi(raw: unknown): boolean {
  if (isRetiredAlviFont(raw) || isRemovedUnlicensedFont(raw) || isRemovedQuranFont(raw)) return true;
  if (!raw || typeof raw !== "object") return false;
  const record = raw as {
    content?: DocNode;
    documentSettings?: { typography?: { defaultRtlFontId?: unknown; defaultLtrFontId?: unknown } };
  };
  const typography = record.documentSettings?.typography;
  if (isRetiredAlviFont(typography?.defaultRtlFontId) || isRetiredAlviFont(typography?.defaultLtrFontId)) {
    return true;
  }
  if (isRemovedUnlicensedFont(typography?.defaultRtlFontId) || isRemovedUnlicensedFont(typography?.defaultLtrFontId)) {
    return true;
  }
  if (isRemovedQuranFont(typography?.defaultRtlFontId) || isRemovedQuranFont(typography?.defaultLtrFontId)) {
    return true;
  }
  const walk = (node: DocNode | undefined): boolean => {
    if (!node) return false;
    if (node.marks?.some((mark) => retiredFontReplacement(mark.attrs?.fontFamily))) return true;
    return node.content?.some((child) => walk(child)) ?? false;
  };
  return walk(record.content);
}

export function resolveEditorFontFamily(
  raw: unknown,
  globalDir: Direction = "rtl"
): FontResolution {
  const requested =
    typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;

  if (isRetiredAlviFont(requested)) {
    return resolveEditorFontFamily("Mehr Nastaliq Web", globalDir);
  }
  if (isRemovedQuranFont(requested)) {
    return resolveEditorFontFamily(QURAN_FONT_FALLBACK_FAMILY, globalDir);
  }
  if (isRemovedUnlicensedFont(requested)) {
    return resolveEditorFontFamily(REMOVED_FONT_FALLBACK_FAMILY, globalDir);
  }

  if (!requested) {
    const defId: FontId = globalDir === "ltr" ? "inter" : "mehr-nastaliq-web";
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

  // TipTap persists some font-family values with surrounding quotes or
  // a CSS fallback stack. Match their first family against the registry
  // before applying the fallback: otherwise DOCX silently becomes Noto.
  const normalized = normalizeEditorFontFamily(requested);
  const found = normalized ? byEditorFamily.get(normalized) : undefined;
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

export const JAMEEL_EDITOR_FONT_URL = publicBlobFontUrl("jameel-noori-nastaleeq-400.woff2");

/** Shared @font-face for editor + browser print. Same identity as PDF embedding. */
export function studioJameelFontFaceCss(): string {
  return `@font-face{font-family:"Jameel Noori Nastaleeq";src:url("${JAMEEL_EDITOR_FONT_URL}") format("woff2");font-weight:400;font-style:normal;font-display:swap;}`;
}

/** Same public Gulzar file the PDF embedder uses, so the editor does not silently fall back. */
export function studioGulzarFontFaceCss(): string {
  const url = getFontById("gulzar").pdf.regularFiles?.[0] ?? "";
  return `@font-face{font-family:"Gulzar";src:url("${url}") format("woff2");font-weight:400;font-style:normal;font-display:swap;}`;
}

/** Same Mehr file the PDF embedder uses. Same-origin until it is uploaded to the font Worker. */
export function studioMehrFontFaceCss(): string {
  const url = getFontById("mehr-nastaliq-web").pdf.regularFiles?.[0] ?? "/fonts/MehrNastaliqWeb.woff2";
  return `@font-face{font-family:"Mehr Nastaliq Web";src:url("${url}") format("woff2");font-weight:400;font-style:normal;font-display:swap;}`;
}

/** Persian faces requested only after a Document Studio document uses them. */
const ON_DEMAND_STUDIO_FACES = [
  { family: "AlFars 9 Badr", file: "AlFars9Badr.woff2" },
  { family: "B Nazanin", file: "BNazanin.woff2" },
] as const;

export function studioOnDemandFontFaceCss(source: string): string {
  return ON_DEMAND_STUDIO_FACES
    .filter((face) => source.includes(face.family))
    .map((face) => `@font-face{font-family:"${face.family}";src:url("${publicBlobFontUrl(face.file)}") format("woff2");font-weight:400;font-style:normal;font-display:swap;}`)
    .join("\n");
}

/** CSS font-family tokens that may appear unquoted. A digit-leading token is not one of these. */
const CSS_FONT_IDENT = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;
/** These names are quoted in the editor, saved JSON, and PDF CSS. Al Fars is invalid unquoted. */
const QUOTED_EDITOR_FAMILIES = new Set(["AlFars 9 Badr", "B Nazanin"]);

/** A CSS font-family value TipTap can assign with element.style.cssText. */
export function quoteEditorFontFamily(raw: string): string {
  const first = raw.trim().split(",")[0]?.trim() ?? "";
  const bare = first.replace(/^["']+|["']+$/g, "");
  if (!bare) return "";
  const tokens = bare.split(/\s+/).filter(Boolean);
  const safe = tokens.every((token) => CSS_FONT_IDENT.test(token));
  if (safe && !QUOTED_EDITOR_FAMILIES.has(bare)) return bare;
  return `"${bare.replace(/"/g, "")}"`;
}

/** Map a TipTap/CSS fontFamily value onto a registry editorFamily, or "". */
export function normalizeEditorFontFamily(raw: unknown): string {
  if (isRetiredAlviFont(raw)) return "Mehr Nastaliq Web";
  if (isRemovedQuranFont(raw)) return REMOVED_FONT_FALLBACK_FAMILY;
  if (isRemovedUnlicensedFont(raw)) return REMOVED_FONT_FALLBACK_FAMILY;
  if (typeof raw !== "string") return "";
  const first = raw.split(",")[0]?.trim().replace(/^["']+|["']+$/g, "") ?? "";
  if (!first) return "";
  const found = STUDIO_FONTS.find(
    (font) => font.editorFamily === first || font.label === first,
  );
  return found?.editorFamily ?? "";
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
