import { checkTextQuality, type QualityReport } from "../../../utils/quality/checkTextQuality";
import { buildQualityInput } from "./buildQualityInput";
import type { DocNode } from "./extractPlainText";

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
function toCounts(report: QualityReport): QualityIssueCounts {
  return {
    mixedScript: report.textQuality.mixedScript,
    punctuation: report.punctuation.mixedPunctuation + report.punctuation.wrongQuotes,
    spacing: report.typography.multipleSpaces + report.typography.emptyLines,
    longParagraphs: report.typography.longParagraphs,
    repeatedWords: report.textQuality.repeatedWords,
  };
}

export function buildDocumentAuditReport(doc: DocNode): QualityAuditReport {
  const input = buildQualityInput(doc);

  if (!input || !input.trim()) {
    return createEmptyAuditReport();
  }

  const report = checkTextQuality(input);
  const counts = toCounts(report);

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
