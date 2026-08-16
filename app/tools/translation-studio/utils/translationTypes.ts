// Translation Studio core data model — Batch 17A.

export type TranslationLanguage = "ur" | "en" | "ar" | "fa";
export type TranslationSegmentStatus = "untranslated" | "draft" | "final";

export type TranslationReviewStatus = "unreviewed" | "changes-requested" | "approved";

export interface TranslationBrief {
  approach: "faithful" | "natural";
  audience: "general" | "academic-professional";
  additionalInstructions: string;
}

export interface TranslationSegment {
  id: string;
  order: number;
  source: string;
  target: string;
  sourceDir: "rtl" | "ltr";
  targetDir: "rtl" | "ltr";
  status: TranslationSegmentStatus;
  /** Deterministic 31-based hash for source change detection. */
  sourceFingerprint: string;
  /** 17C additive review fields — old v1 projects default to unreviewed. */
  reviewStatus: TranslationReviewStatus;
  reviewNote: string;
  /** segmentFingerprint(target) at time of approval — detects subsequent edits. */
  reviewedTargetFingerprint: string;
}

export interface GlossaryEntry {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  note?: string;
}

export interface TranslationProject {
  schemaVersion: 1;
  id: string;
  name: string;
  sourceLanguage: TranslationLanguage;
  targetLanguage: TranslationLanguage;
  brief: TranslationBrief;
  segments: TranslationSegment[];
  /** Additive field — older v1 projects without this field load as []. */
  glossary: GlossaryEntry[];
  createdAt: string;
  updatedAt: string;
}

export const SUPPORTED_LANGUAGES: { id: TranslationLanguage; label: string; dir: "rtl" | "ltr" }[] = [
  { id: "ur", label: "Urdu — اردو", dir: "rtl" },
  { id: "ar", label: "Arabic — عربي", dir: "rtl" },
  { id: "fa", label: "Persian — فارسی", dir: "rtl" },
  { id: "en", label: "English", dir: "ltr" },
];

export function languageDir(lang: TranslationLanguage): "rtl" | "ltr" {
  const found = SUPPORTED_LANGUAGES.find((l) => l.id === lang);
  return found?.dir ?? "rtl";
}

export function languageFontClass(lang: TranslationLanguage): string {
  if (lang === "ur") return "font-nastaliq";
  if (lang === "ar") return "font-amiri";
  if (lang === "fa") return "font-vazirmatn";
  return "font-sans";
}

export function defaultBrief(): TranslationBrief {
  return { approach: "faithful", audience: "general", additionalInstructions: "" };
}

/** Max length for additionalInstructions */
export const BRIEF_INSTRUCTIONS_MAX = 500;

/** Validate / parse an untrusted project object. Returns null on failure. */
export function parseProject(raw: unknown): TranslationProject | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (p.schemaVersion !== 1) return null;
  if (typeof p.id !== "string" || !p.id) return null;
  if (typeof p.name !== "string") return null;
  if (!isTranslationLanguage(p.sourceLanguage) || !isTranslationLanguage(p.targetLanguage)) return null;
  if (!Array.isArray(p.segments)) return null;
  const segments: TranslationSegment[] = [];
  for (const seg of p.segments) {
    const s = parseSegment(seg);
    if (!s) return null;
    segments.push(s);
  }
  const brief = parseBrief(p.brief);
  if (!brief) return null;
  // glossary is additive — old v1 projects without the field load as []
  const glossary: GlossaryEntry[] = parseGlossary(p.glossary);
  return {
    schemaVersion: 1,
    id: p.id as string,
    name: p.name as string,
    sourceLanguage: p.sourceLanguage as TranslationLanguage,
    targetLanguage: p.targetLanguage as TranslationLanguage,
    brief,
    segments,
    glossary,
    createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
  };
}

function isTranslationLanguage(v: unknown): v is TranslationLanguage {
  return v === "ur" || v === "en" || v === "ar" || v === "fa";
}

function isDir(v: unknown): v is "rtl" | "ltr" {
  return v === "rtl" || v === "ltr";
}

function isStatus(v: unknown): v is TranslationSegmentStatus {
  return v === "untranslated" || v === "draft" || v === "final";
}

function isReviewStatus(v: unknown): v is TranslationReviewStatus {
  return v === "unreviewed" || v === "changes-requested" || v === "approved";
}

function parseSegment(raw: unknown): TranslationSegment | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || typeof s.order !== "number") return null;
  if (typeof s.source !== "string" || typeof s.target !== "string") return null;
  return {
    id: s.id,
    order: s.order,
    source: s.source,
    target: typeof s.target === "string" ? s.target : "",
    sourceDir: isDir(s.sourceDir) ? s.sourceDir : "rtl",
    targetDir: isDir(s.targetDir) ? s.targetDir : "rtl",
    status: isStatus(s.status) ? s.status : "untranslated",
    sourceFingerprint: typeof s.sourceFingerprint === "string" ? s.sourceFingerprint : "",
    // 17C: additive — older projects without these fields get safe defaults
    reviewStatus: isReviewStatus(s.reviewStatus) ? s.reviewStatus : "unreviewed",
    reviewNote: typeof s.reviewNote === "string" ? s.reviewNote.slice(0, REVIEW_NOTE_MAX) : "",
    reviewedTargetFingerprint: typeof s.reviewedTargetFingerprint === "string" ? s.reviewedTargetFingerprint : "",
  };
}

function parseBrief(raw: unknown): TranslationBrief | null {
  if (!raw || typeof raw !== "object") return defaultBrief();
  const b = raw as Record<string, unknown>;
  return {
    approach: b.approach === "natural" ? "natural" : "faithful",
    audience: b.audience === "academic-professional" ? "academic-professional" : "general",
    additionalInstructions:
      typeof b.additionalInstructions === "string"
        ? b.additionalInstructions.slice(0, BRIEF_INSTRUCTIONS_MAX)
        : "",
  };
}

function parseGlossary(raw: unknown): GlossaryEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: GlossaryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (typeof e.id !== "string" || typeof e.sourceTerm !== "string" || typeof e.targetTerm !== "string") continue;
    if (!e.sourceTerm.trim() || !e.targetTerm.trim()) continue;
    result.push({ id: e.id, sourceTerm: e.sourceTerm, targetTerm: e.targetTerm, note: typeof e.note === "string" ? e.note : undefined });
  }
  return result;
}

export const GLOSSARY_TERM_MAX = 120;
export const GLOSSARY_NOTE_MAX = 300;
/** Shared constant — avoids circular import between reviewState.ts and translationTypes.ts */
export const REVIEW_NOTE_MAX = 500;
