import { checkTextQuality, type QualityReport } from "../../../utils/quality/checkTextQuality";
import { buildQualityInput } from "./buildQualityInput";
import { getBlockTexts, type DocNode } from "./extractPlainText";

export interface QualityIssueCounts {
  mixedScript: number;
  punctuation: number;
  spacing: number;
  longParagraphs: number;
  repeatedWords: number;
}

export interface QualityRecommendation {
  id: string;
  type: keyof QualityIssueCounts;
  titleUrdu: string;
  titleEnglish: string;
  descriptionUrdu: string;
}

export interface QualityAuditReport {
  score: number;
  totalIssues: number;
  counts: QualityIssueCounts;
  recommendations: QualityRecommendation[];
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
    },
    recommendations: [],
  };
}

// checkTextQuality() returns one structured QualityReport object, never an
// array of "issues" — so this maps its real fields directly into the
// QualityIssueCounts shape, instead of guessing at a shape it doesn't have.
//
// longParagraphs is the one exception, computed separately below (see
// countLongParagraphs) rather than taken from report.typography.longParagraphs
// — see that function's comment for why.
function toCounts(report: QualityReport, longParagraphs: number): QualityIssueCounts {
  return {
    mixedScript: report.textQuality.mixedScript,
    punctuation: report.punctuation.mixedPunctuation + report.punctuation.wrongQuotes + report.punctuation.duplicatedPunctuation,
    spacing: report.typography.multipleSpaces + report.typography.emptyLines,
    longParagraphs,
    repeatedWords: report.textQuality.repeatedWords,
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

export function buildDocumentAuditReport(doc: DocNode): QualityAuditReport {
  const input = buildQualityInput(doc);

  if (!input || !input.trim()) {
    return createEmptyAuditReport();
  }

  const report = checkTextQuality(input);
  const counts = toCounts(report, countLongParagraphs(doc));

  // Computed from the same counts shown in this report, so the two numbers
  // always agree.
  const totalIssues =
    counts.mixedScript + counts.punctuation + counts.spacing + counts.longParagraphs + counts.repeatedWords;

  // NOTE (2026-08-07, per Sajjad): this 100/90/80.../50-floor formula is a
  // placeholder, not an approved business rule — it hasn't been reviewed or
  // locked in DECISIONS.md. Score is intentionally NOT shown in
  // QualityAuditPanel right now; it's kept here (rather than deleted) so a
  // future approved scoring model has a slot to land in without another
  // interface change. Do not treat this number as meaningful until then.
  const score = totalIssues > 0 ? Math.max(50, 100 - totalIssues * 10) : 100;

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
  };
}
