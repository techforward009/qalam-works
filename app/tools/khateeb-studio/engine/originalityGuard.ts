import type { MajlisSeriesPlan } from "./seriesPlanner";

export type OriginalityCheck = {
  id: "titles" | "structure" | "wording" | "source-balance";
  labelUr: string;
  labelEn: string;
  status: "clear" | "review";
  detailUr: string;
  detailEn: string;
};

export type OriginalityReport = {
  status: "clear" | "review";
  score: number;
  checks: readonly OriginalityCheck[];
};

const URDU_STOP = new Set([
  "اور", "کی", "کے", "کا", "کو", "میں", "ہے", "ہیں", "سے", "پر", "یہ", "وہ",
  "ایک", "کہ", "اس", "جو", "بھی", "تک", "نے", "کر", "کریں", "ہو", "ہوتا",
  "ہوتی", "اپنے", "اپنی", "اپنا", "یا", "نہ", "تو", "اگر", "بلکہ",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !URDU_STOP.has(item));
}

function jaccard(a: string, b: string): number {
  const left = new Set(words(a));
  const right = new Set(words(b));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / (left.size + right.size - shared);
}

function sessionTextUr(plan: MajlisSeriesPlan, index: number): string {
  const s = plan.sessions[index];
  if (!s) return "";
  return [s.titleUr, s.purposeUr, ...s.materialUr].join(" ");
}

function samePositionSimilarity(fresh: MajlisSeriesPlan, research: MajlisSeriesPlan): number {
  const length = Math.min(fresh.sessions.length, research.sessions.length);
  if (!length) return 0;
  let total = 0;
  for (let i = 0; i < length; i += 1) {
    total += jaccard(sessionTextUr(fresh, i), sessionTextUr(research, i));
  }
  return total / length;
}

function maximumSessionSimilarity(fresh: MajlisSeriesPlan, research: MajlisSeriesPlan): number {
  let highest = 0;
  for (let i = 0; i < fresh.sessions.length; i += 1) {
    const freshText = sessionTextUr(fresh, i);
    for (let j = 0; j < research.sessions.length; j += 1) {
      highest = Math.max(highest, jaccard(freshText, sessionTextUr(research, j)));
    }
  }
  return highest;
}

function exactTitleCount(fresh: MajlisSeriesPlan, research: MajlisSeriesPlan): number {
  const researchTitles = new Set(research.sessions.map((item) => item.titleUr.trim()));
  return fresh.sessions.filter((item) => researchTitles.has(item.titleUr.trim())).length;
}

function sourceConcentration(plan: MajlisSeriesPlan): { top: string; ratio: number; count: number } {
  const counts = new Map<string, number>();
  for (const session of plan.sessions) {
    const key = session.sourceUr.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let top = "";
  let count = 0;
  for (const [key, value] of counts) {
    if (value > count) {
      top = key;
      count = value;
    }
  }
  return { top, count, ratio: plan.sessions.length ? count / plan.sessions.length : 0 };
}

export function checkSeriesOriginality(
  fresh: MajlisSeriesPlan,
  research: MajlisSeriesPlan,
): OriginalityReport {
  const exactTitles = exactTitleCount(fresh, research);
  const positional = samePositionSimilarity(fresh, research);
  const maximum = maximumSessionSimilarity(fresh, research);
  const concentration = sourceConcentration(fresh);

  const checks: OriginalityCheck[] = [
    {
      id: "titles",
      labelUr: "عنوانات کی آزادی",
      labelEn: "Independent titles",
      status: exactTitles === 0 ? "clear" : "review",
      detailUr:
        exactTitles === 0
          ? "نئی تشکیل کے کسی مجلس عنوان نے تحقیقی نقشے کا عنوان بعینہٖ نہیں دہرایا۔"
          : `${exactTitles} مجلس کے عنوان تحقیقی نقشے سے بعینہٖ مل رہے ہیں؛ انہیں نئی زبان میں دوبارہ بنانا چاہیے۔`,
      detailEn:
        exactTitles === 0
          ? "No fresh-session title exactly repeats a research-map title."
          : `${exactTitles} fresh titles exactly repeat research-map titles and should be reframed.`,
    },
    {
      id: "structure",
      labelUr: "ترتیب کی آزادی",
      labelEn: "Structural independence",
      status: positional < 0.48 ? "clear" : "review",
      detailUr:
        positional < 0.48
          ? "مجلس بہ مجلس ترتیب تحقیقی نقشے کی سیدھی نقل محسوس نہیں ہوتی۔"
          : "نئی تشکیل اور تحقیقی نقشے کی مجلس وار ترتیب بہت قریب ہے؛ کچھ مجالس کی جگہ، سوال یا زاویہ بدلنا چاہیے۔",
      detailEn:
        positional < 0.48
          ? "Session-by-session structure is sufficiently distinct from the research map."
          : "The fresh sequence is too close to the research-map sequence and should be reframed.",
    },
    {
      id: "wording",
      labelUr: "عبارت کی آزادی",
      labelEn: "Wording independence",
      status: maximum < 0.62 ? "clear" : "review",
      detailUr:
        maximum < 0.62
          ? "کسی نئی مجلس کا مجموعی لفظی اشتراک تحقیقی مجلس کے ساتھ خطرناک حد تک زیادہ نہیں۔"
          : "کم از کم ایک نئی مجلس کی عبارت تحقیقی مواد سے بہت قریب ہے؛ سوال، مثال اور جملہ بندی ازسرِنو بنائیں۔",
      detailEn:
        maximum < 0.62
          ? "No fresh session shows dangerously high lexical overlap with a research-map session."
          : "At least one fresh session is too close in wording to research material and should be rewritten.",
    },
    {
      id: "source-balance",
      labelUr: "ماخذی توازن",
      labelEn: "Source balance",
      status: concentration.ratio <= 0.7 || fresh.sessions.length <= 5 ? "clear" : "review",
      detailUr:
        concentration.ratio <= 0.7
          ? "پورا سلسلہ ایک ہی ماخذی اندراج کے زیرِ اثر نہیں ہے۔"
          : `اس سلسلے کی ${concentration.count} مجالس ایک ہی ماخذی اندراج سے چل رہی ہیں۔ اگر موضوع اجازت دے تو دوسرے معتبر ماخذ بھی شامل کریں۔`,
      detailEn:
        concentration.ratio <= 0.7
          ? "The series is not dominated by one source entry."
          : `${concentration.count} sessions rely on the same source entry; add other verified sources where the topic permits.`,
    },
  ];

  const reviewCount = checks.filter((item) => item.status === "review").length;
  return {
    status: reviewCount === 0 ? "clear" : "review",
    score: Math.max(0, 100 - reviewCount * 25),
    checks,
  };
}
