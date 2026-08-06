import { checkTextQuality } from "@/app/utils/checkTextQuality";
import { buildQualityInput } from "./buildQualityInput";
import type { DocNode } from "./extractPlainText";

export interface QualityIssueCounts {
  mixedScript: number;
  punctuation: number;
  spacing: number;
  longParagraphs: number;
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
    },
    recommendations: [],
  };
}

export function buildDocumentAuditReport(doc: DocNode): QualityAuditReport {
  const input = buildQualityInput(doc);

  if (!input || !input.trim()) {
    return createEmptyAuditReport();
  }

  const rawResults = checkTextQuality(input);
  const issues = rawResults.issues;

  const counts: QualityIssueCounts = {
    mixedScript: 0,
    punctuation: 0,
    spacing: 0,
    longParagraphs: 0,
  };

  for (const issue of issues) {
    switch (issue.type) {
      case "script_mix":
        counts.mixedScript++;
        break;
      case "punctuation":
        counts.punctuation++;
        break;
      case "spacing":
        counts.spacing++;
        break;
      case "paragraph_length":
        counts.longParagraphs++;
        break;
    }
  }

  const totalIssues =
    counts.mixedScript +
    counts.punctuation +
    counts.spacing +
    counts.longParagraphs;

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

  return {
    score: rawResults.score,
    totalIssues,
    counts,
    recommendations,
  };
}
