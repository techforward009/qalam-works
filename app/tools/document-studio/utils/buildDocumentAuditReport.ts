import { checkTextQuality, type QualityReport } from "../../../utils/quality/checkTextQuality";
import { buildQualityInput } from "./buildQualityInput";
import { getBlockTexts, type DocNode } from "./extractPlainText";

export interface QualityIssueCounts {
  mixedScript: number;
  punctuation: number;
  spacing: number;
  longParagraphs: number;
  repeatedWords: number;
  // Advanced Quality Layer (2026-08-09):
  mixedUrduArabicForms: number;
  headingHierarchy: number;
  emptyParagraphs: number;
  // Advanced Typography Analyzer (Document Intelligence v2, 2026-08-09):
  spaceBeforePunctuation: number;
  tatweelCount: number;
  inconsistentPunctuationStyle: number;
}

export interface QualityRecommendation {
  id: string;
  type: keyof QualityIssueCounts;
  titleUrdu: string;
  titleEnglish: string;
  descriptionUrdu: string;
}

// Advanced Quality Layer (2026-08-09) — a categorical, non-numeric
// readiness signal per publishing concern. Deliberately "ok"/"needs_review"
// rather than a score: a raw 100/90/80...-style number was already tried
// for the overall audit (see the `score` field below) and explicitly
// rejected from the UI for implying false precision it hadn't earned —
// this follows the same principle at the category level.
//
// `rtlLtr` is a documented approximation, not a true per-block direction
// check: DocNode has no per-block direction attribute at all (direction is
// one global `dir` value for the whole document, set by the editor/export
// pipeline, not stored per-node) — so there is no way to detect "block A is
// marked RTL but block B is marked LTR" from the data available. This
// category is assessed from `mixedScript` instead (Latin text embedded in
// RTL prose), the closest real, observable signal to RTL/LTR embedding
// quality that current architecture can actually measure.
export interface PublishingReadiness {
  typography: "ok" | "needs_review";
  unicodeConsistency: "ok" | "needs_review";
  structure: "ok" | "needs_review";
  rtlLtr: "ok" | "needs_review";
}

export interface QualityAuditReport {
  score: number;
  totalIssues: number;
  counts: QualityIssueCounts;
  recommendations: QualityRecommendation[];
  readiness: PublishingReadiness;
}

function createEmptyAuditReport(): QualityAuditReport {
  return {
    score: 100,
    totalIssues: 0,
    counts: {
      mixedScript: 0,
      punctuation: 0,
      spacing: 0,
      longParagraphs: 0,
      repeatedWords: 0,
      mixedUrduArabicForms: 0,
      headingHierarchy: 0,
      emptyParagraphs: 0,
      spaceBeforePunctuation: 0,
      tatweelCount: 0,
      inconsistentPunctuationStyle: 0,
    },
    recommendations: [],
    readiness: { typography: "ok", unicodeConsistency: "ok", structure: "ok", rtlLtr: "ok" },
  };
}

// checkTextQuality() returns one structured QualityReport object, never an
// array of "issues" — so this maps its real fields directly into the
// QualityIssueCounts shape, instead of guessing at a shape it doesn't have.
//
// longParagraphs, headingHierarchy, and emptyParagraphs are the exceptions,
// computed separately below from the DocNode's real structure (see each
// function's own comment) rather than taken from checkTextQuality's output,
// which only ever sees flattened plain text and can't see block boundaries
// or heading levels at all.
function toCounts(
  report: QualityReport,
  longParagraphs: number,
  headingHierarchy: number,
  emptyParagraphs: number
): QualityIssueCounts {
  return {
    mixedScript: report.textQuality.mixedScript,
    punctuation: report.punctuation.mixedPunctuation + report.punctuation.wrongQuotes + report.punctuation.duplicatedPunctuation,
    spacing: report.typography.multipleSpaces + report.typography.emptyLines + report.typography.missingSpaceAfterPunctuation,
    longParagraphs,
    repeatedWords: report.textQuality.repeatedWords,
    mixedUrduArabicForms: report.textQuality.mixedUrduArabicForms,
    headingHierarchy,
    emptyParagraphs,
    spaceBeforePunctuation: report.typography.spaceBeforePunctuation,
    tatweelCount: report.typography.tatweelCount,
    inconsistentPunctuationStyle: report.punctuation.inconsistentPunctuationStyle ? 1 : 0,
  };
}

// BUG THIS FIXES (found 2026-08-07, via Sajjad's screenshot of a document
// made of 8 separate short paragraph/citation lines flagged as "1 long
// paragraph"): checkTextQuality's own longParagraphs check
// (app/utils/quality/checkTextQuality.ts) splits its input on a BLANK line
// (/\n\s*\n/) to find paragraph boundaries — that's the right convention for
// its actual caller (the standalone Quality Checker tool, which gets raw
// pasted/uploaded text where blank lines are the real paragraph separator).
// But buildQualityInput() joins Document Studio's separate, structurally-
// known paragraph/heading/list-item blocks with a single "\n" (not a blank
// line) specifically so multipleSpaces/emptyLines aren't miscounted — which
// means checkTextQuality's blank-line paragraph split never fires here, and
// it silently treats the ENTIRE document as one giant "paragraph" for the
// length check. A document made of many short blocks whose total length
// exceeds 250 characters (nearly any real document) gets wrongly flagged.
//
// Fix: Document Studio already knows its real paragraph boundaries
// structurally (one entry per block from getBlockTexts) — no need to
// re-derive them from whitespace at all. Count long paragraphs directly
// against those real blocks, using the same threshold and whitespace-
// collapse convention as checkTextQuality for consistency.
function countLongParagraphs(doc: DocNode): number {
  const LONG_PARAGRAPH_THRESHOLD = 250;
  return getBlockTexts(doc).filter((block) => block.replace(/\s+/g, " ").trim().length > LONG_PARAGRAPH_THRESHOLD)
    .length;
}

// Advanced Quality Layer (2026-08-09) — empty paragraph/heading blocks.
// Reuses the already-exported getBlockTexts() (same traversal Copy/
// Download and the long-paragraph check use) rather than writing a new
// tree walk — a block whose text is empty/whitespace-only after trimming
// is very likely an accidental blank line left in the document (e.g. two
// Enter presses), distinct from checkTextQuality's own "emptyLines" (which
// looks for blank LINES inside already-flattened text, not real empty
// block nodes in the document's own structure).
export function countEmptyParagraphs(doc: DocNode): number {
  return getBlockTexts(doc).filter((block) => block.trim().length === 0).length;
}

// Advanced Quality Layer (2026-08-09) — heading hierarchy issues. Only
// looks at TOP-LEVEL headings (doc.content directly) since TipTap/
// ProseMirror's schema doesn't allow a heading node to be nested inside a
// list item or blockquote anyway — headings are always block-level
// siblings, matching how buildDocxDocument.ts's own title-detection
// (deriveDocumentTitle) already treats headings the same way.
//
// Two kinds of issue counted:
// 1. The document's first heading isn't H1 (starts "too deep").
// 2. A heading skips a level going deeper than its predecessor (e.g. H1
//    directly to H3, skipping H2) — going shallower (H3 back to H1) is
//    normal document structure (starting a new top-level section) and is
//    NOT flagged.
export function countHeadingHierarchyIssues(doc: DocNode): number {
  const levels: number[] = [];
  (doc.content ?? []).forEach((node) => {
    if (node.type === "heading" && typeof node.attrs?.level === "number") {
      levels.push(node.attrs.level as number);
    }
  });

  if (levels.length === 0) return 0;

  let issues = 0;
  if (levels[0] !== 1) issues += 1;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) issues += 1;
  }
  return issues;
}

// Advanced Quality Layer (2026-08-09) — categorical, not numeric (see
// PublishingReadiness's own comment for why). Each category maps to a
// distinct, non-overlapping signal already computed in `counts`, so no
// single issue is silently counted toward two different readiness labels.
//
// Document Intelligence v2 (2026-08-09): the two new Advanced Typography
// checks (spaceBeforePunctuation, tatweelCount) fold into `typography`
// readiness (they ARE typography concerns); inconsistentPunctuationStyle
// also folds into `typography` for the same reason — there is no separate
// "punctuation readiness" category, and punctuation style consistency is
// a typography matter, not a script/structure/direction one.
function computeReadiness(counts: QualityIssueCounts): PublishingReadiness {
  return {
    typography:
      counts.spacing +
        counts.longParagraphs +
        counts.spaceBeforePunctuation +
        counts.tatweelCount +
        counts.inconsistentPunctuationStyle ===
      0
        ? "ok"
        : "needs_review",
    unicodeConsistency: counts.mixedUrduArabicForms === 0 ? "ok" : "needs_review",
    structure: counts.headingHierarchy + counts.emptyParagraphs === 0 ? "ok" : "needs_review",
    rtlLtr: counts.mixedScript === 0 ? "ok" : "needs_review",
  };
}

export function buildDocumentAuditReport(doc: DocNode): QualityAuditReport {
  const input = buildQualityInput(doc);

  if (!input || !input.trim()) {
    return createEmptyAuditReport();
  }

  const report = checkTextQuality(input);
  const counts = toCounts(
    report,
    countLongParagraphs(doc),
    countHeadingHierarchyIssues(doc),
    countEmptyParagraphs(doc)
  );

  // Computed from the same counts shown in this report, so the two numbers
  // always agree.
  const totalIssues =
    counts.mixedScript +
    counts.punctuation +
    counts.spacing +
    counts.longParagraphs +
    counts.repeatedWords +
    counts.mixedUrduArabicForms +
    counts.headingHierarchy +
    counts.emptyParagraphs +
    counts.spaceBeforePunctuation +
    counts.tatweelCount +
    counts.inconsistentPunctuationStyle;

  // NOTE (2026-08-07, per Sajjad): this 100/90/80.../50-floor formula is a
  // placeholder, not an approved business rule — it hasn't been reviewed or
  // locked in DECISIONS.md. Score is intentionally NOT shown in
  // QualityAuditPanel right now; it's kept here (rather than deleted) so a
  // future approved scoring model has a slot to land in without another
  // interface change. Do not treat this number as meaningful until then.
  const score = totalIssues > 0 ? Math.max(50, 100 - totalIssues * 10) : 100;

  const readiness = computeReadiness(counts);

  const recommendations: QualityRecommendation[] = [];

  if (counts.mixedScript > 0) {
    recommendations.push({
      id: "rec-mixed-script",
      type: "mixedScript",
      titleUrdu: "رسم الخط کی اصلاح",
      titleEnglish: "Script Normalization",
      descriptionUrdu:
        "متن میں عربی/فارسی اور اردو حروف کا غیر معیاری امتزاج موجود ہے۔ معیاری بنائیں بٹن استعمال کریں۔",
    });
  }

  if (counts.mixedUrduArabicForms > 0) {
    recommendations.push({
      id: "rec-mixed-urdu-arabic-forms",
      type: "mixedUrduArabicForms",
      titleUrdu: "اردو/عربی حروف کی یکسانیت",
      titleEnglish: "Urdu/Arabic Character Consistency",
      descriptionUrdu:
        "متن میں عربی رسم الخط کے حروف (ي، ى، ك، أ، إ) اردو تحریر میں شامل ہیں۔ یونیکوڈ اسٹینڈرڈائزر سے درست کریں۔",
    });
  }

  if (counts.punctuation > 0) {
    recommendations.push({
      id: "rec-punctuation",
      type: "punctuation",
      titleUrdu: "رموزِ اوقاف کی درستگی",
      titleEnglish: "Punctuation Standardisation",
      descriptionUrdu:
        "انگریزی رموزِ اوقاف یا غیر مناسب نشانات کو اردو طرز پر تبدیل کریں۔",
    });
  }

  if (counts.spacing > 0) {
    recommendations.push({
      id: "rec-spacing",
      type: "spacing",
      titleUrdu: "خالی جگہ کا توازن",
      titleEnglish: "Spacing Standardization",
      descriptionUrdu:
        "متن میں دہرے اسپیسز یا الگ تھلگ الفاظ کے درمیان فاصلہ درست کریں۔",
    });
  }

  if (counts.spaceBeforePunctuation > 0) {
    recommendations.push({
      id: "rec-space-before-punctuation",
      type: "spaceBeforePunctuation",
      titleUrdu: "رموزِ اوقاف سے پہلے خالی جگہ",
      titleEnglish: "Space Before Punctuation",
      descriptionUrdu:
        "کچھ رموزِ اوقاف (، ؛ ؟ ۔) سے پہلے غیر ضروری خالی جگہ موجود ہے۔ انہیں پچھلے لفظ سے متصل کریں۔",
    });
  }

  if (counts.tatweelCount > 0) {
    recommendations.push({
      id: "rec-tatweel",
      type: "tatweelCount",
      titleUrdu: "تطویل (کشیدہ) حروف",
      titleEnglish: "Tatweel/Kashida Characters",
      descriptionUrdu:
        "متن میں تطویل (ـ) حروف موجود ہیں، جو عام طور پر کاپی پیسٹ سے آ جاتے ہیں اور عام تحریر میں غیر ضروری ہیں۔",
    });
  }

  if (counts.inconsistentPunctuationStyle > 0) {
    recommendations.push({
      id: "rec-inconsistent-punctuation-style",
      type: "inconsistentPunctuationStyle",
      titleUrdu: "رموزِ اوقاف کا غیر یکساں انداز",
      titleEnglish: "Inconsistent Punctuation Style",
      descriptionUrdu:
        "دستاویز میں ایک ہی نشان (جیسے کوما) کی انگریزی اور اردو دونوں شکلیں استعمال ہوئی ہیں۔ ایک ہی انداز اپنائیں۔",
    });
  }

  if (counts.longParagraphs > 0) {
    recommendations.push({
      id: "rec-long-paragraphs",
      type: "longParagraphs",
      titleUrdu: "طویل پیراگراف کی تقسیم",
      titleEnglish: "Paragraph Structure",
      descriptionUrdu:
        "کچھ پیراگراف بہت طویل ہیں۔ پڑھنے میں آسانی کے لیے انہیں چھوٹے حصوں میں تقسیم کریں۔",
    });
  }

  if (counts.headingHierarchy > 0) {
    recommendations.push({
      id: "rec-heading-hierarchy",
      type: "headingHierarchy",
      titleUrdu: "عنوانات کی ترتیب",
      titleEnglish: "Heading Hierarchy",
      descriptionUrdu:
        "عنوانات کی سطحیں (H1، H2، H3...) ترتیب سے نہیں ہیں — کوئی سطح چھوڑی گئی ہے یا دستاویز H1 سے شروع نہیں ہوتی۔",
    });
  }

  if (counts.emptyParagraphs > 0) {
    recommendations.push({
      id: "rec-empty-paragraphs",
      type: "emptyParagraphs",
      titleUrdu: "خالی پیراگراف",
      titleEnglish: "Empty Paragraphs",
      descriptionUrdu:
        "دستاویز میں خالی پیراگراف موجود ہیں (غالباً غیر ارادی طور پر Enter دبانے سے)۔ انہیں ہٹا دیں۔",
    });
  }

  if (counts.repeatedWords > 0) {
    recommendations.push({
      id: "rec-repeated-words",
      type: "repeatedWords",
      titleUrdu: "تکرارِ الفاظ",
      titleEnglish: "Repeated Words",
      descriptionUrdu:
        "کچھ الفاظ لگاتار دو مرتبہ آ گئے ہیں، جو عموماً ٹائپنگ کی غلطی ہوتی ہے۔ جائزہ لیں۔",
    });
  }

  return {
    score,
    totalIssues,
    counts,
    recommendations,
    readiness,
  };
}
