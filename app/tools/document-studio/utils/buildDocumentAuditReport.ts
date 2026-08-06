import { checkTextQuality } from "../../../utils/quality/checkTextQuality";
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

  const rawResults: any = checkTextQuality(input);

  // checkTextQuality کے تمام ممکنہ ایرے سٹرکچرز کو ہینڈل کرنا
  const issuesList: any[] = Array.isArray(rawResults)
    ? rawResults
    : Array.isArray(rawResults?.issues)
    ? rawResults.issues
    : Array.isArray(rawResults?.errors)
    ? rawResults.errors
    : Array.isArray(rawResults?.details)
    ? rawResults.details
    : [];

  const counts: QualityIssueCounts = {
    mixedScript: 0,
    punctuation: 0,
    spacing: 0,
    longParagraphs: 0,
  };

  for (const issue of issuesList) {
    if (!issue) continue;
    
    // Type کی تصدیق (type, category, kind, code)
    const issueType = String(issue.type || issue.category || issue.kind || issue.code || issue);

    if (issueType.includes("script") || issueType.includes("mix")) {
      counts.mixedScript++;
    } else if (issueType.includes("punct")) {
      counts.punctuation++;
    } else if (issueType.includes("space") || issueType.includes("spacing")) {
      counts.spacing++;
    } else if (issueType.includes("para") || issueType.includes("length")) {
      counts.longParagraphs++;
    } else {
      // اگر کوئی اور ایشو ہو تو اسے بھی گنتی میں شامل کریں
      counts.mixedScript++;
    }
  }

  // اگر کیٹگری میچ نہ ہو لیکن issuesList میں ڈیٹا موجود ہو
  const parsedCount =
    counts.mixedScript +
    counts.punctuation +
    counts.spacing +
    counts.longParagraphs;

  const totalIssues = parsedCount > 0 ? parsedCount : issuesList.length;

  // اگر مسائل 0 سے زیادہ ہوں تو Score کو 100 سے لازمی کم کریں
  let score = typeof rawResults?.score === "number" ? rawResults.score : 100;

  if (totalIssues > 0) {
    const calculated = Math.max(50, 100 - totalIssues * 10);
    score = score < 100 ? score : calculated;
  }

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
    score,
    totalIssues,
    counts,
    recommendations,
  };
}
