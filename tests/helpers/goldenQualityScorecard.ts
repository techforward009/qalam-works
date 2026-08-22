/**
 * Phase 19A.11 — Golden Quality Scorecard (reporting only).
 * Compares engine output to frozen golden expected_output without changing the engine.
 */

export interface GoldenCase {
  id: string;
  category: string;
  difficulty: string;
  input: string;
  expected_output: string;
  tags: {
    contains_english: boolean;
    has_protected_tokens: boolean;
    tests: string[];
  };
}

export interface CaseMetrics {
  id: string;
  category: string;
  exactMatch: boolean;
  expectedWords: string[];
  receivedWords: string[];
  correctWords: number;
  missedWords: number;
  wrongUrduTokens: number;
  unjustifiedLatin: string[];
  protectedFailures: string[];
  englishSafetyViolation: boolean;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  exactMatches: number;
  wordCorrectionRate: number;
  wrongUrduSpellingRate: number;
  latinLeakageRate: number;
  protectedFailures: number;
  englishSafetyViolations: number;
}

export interface Scorecard {
  totalCases: number;
  exactMatches: number;
  exactMatchRate: number;
  wordCorrectionRate: number;
  wrongUrduSpellingRate: number;
  unjustifiedLatinLeakageRate: number;
  protectedTokenFailureCount: number;
  englishSafetyViolations: number;
  byCategory: CategoryBreakdown[];
  cases: CaseMetrics[];
}

const ARABIC = /[\u0600-\u06FF]/;
const LATIN_TOKEN = /[A-Za-z][A-Za-z0-9._+-]*/g;

function tokenizeWords(text: string): string[] {
  return text
    .split(/[\s\u060C\u061B\u061F\u06D4.,;:!?()[\]{}"""'']+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
}

function extractProtectedFromInput(input: string): string[] {
  const out: string[] = [];
  const urls = input.match(/https?:\/\/[^\s]+/gi) || [];
  const emails = input.match(/[^\s]+@[^\s]+/g) || [];
  const files = input.match(/\b[\w.-]+\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|txt|csv|zip)\b/gi) || [];
  out.push(...urls, ...emails, ...files);
  // Brands like WhatsApp, Google are now Urdu-script transliterated per policy,
  // so they are NOT protected verbatim tokens anymore.
  // Only truly machine-readable tokens (URLs, emails, filenames) are checked here.
  return out;
}

function bagCount(words: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of words) m.set(w, (m.get(w) || 0) + 1);
  return m;
}

function isPureEnglishExpected(expected: string): boolean {
  const hasArabic = ARABIC.test(expected);
  const hasLatin = /[A-Za-z]{2,}/.test(expected);
  return hasLatin && !hasArabic;
}

export function scoreCase(c: GoldenCase, received: string): CaseMetrics {
  const expectedWords = tokenizeWords(c.expected_output);
  const receivedWords = tokenizeWords(received);
  const expBag = bagCount(expectedWords);
  const recBag = bagCount(receivedWords);

  let correctWords = 0;
  let missedWords = 0;
  for (const [w, n] of expBag) {
    const got = recBag.get(w) || 0;
    const ok = Math.min(n, got);
    correctWords += ok;
    missedWords += n - ok;
  }

  let wrongUrduTokens = 0;
  for (const [w, n] of recBag) {
    if (!ARABIC.test(w)) continue;
    const exp = expBag.get(w) || 0;
    if (n > exp) wrongUrduTokens += n - exp;
  }

  const protectedSpans = extractProtectedFromInput(c.input);
  const protectedFailures = protectedSpans.filter(p => !received.includes(p));

  const justifiedLatin = new Set<string>();
  for (const w of expectedWords) {
    for (const m of w.match(LATIN_TOKEN) || []) justifiedLatin.add(m);
  }
  for (const p of protectedSpans) {
    for (const m of p.match(LATIN_TOKEN) || []) justifiedLatin.add(m);
    justifiedLatin.add(p);
  }

  const unjustifiedLatin: string[] = [];
  const seenLatin = new Set<string>();
  for (const m of received.match(LATIN_TOKEN) || []) {
    if (justifiedLatin.has(m)) continue;
    if (m.length <= 1) continue;
    if (seenLatin.has(m)) continue;
    seenLatin.add(m);
    unjustifiedLatin.push(m);
  }

  const englishSafetyViolation =
    isPureEnglishExpected(c.expected_output) && ARABIC.test(received);

  return {
    id: c.id,
    category: c.category,
    exactMatch: received === c.expected_output,
    expectedWords,
    receivedWords,
    correctWords,
    missedWords,
    wrongUrduTokens,
    unjustifiedLatin,
    protectedFailures,
    englishSafetyViolation,
  };
}

export function buildScorecard(cases: GoldenCase[], outputs: string[]): Scorecard {
  const caseMetrics = cases.map((c, i) => scoreCase(c, outputs[i] ?? ""));
  const totalExpectedWords = caseMetrics.reduce((s, m) => s + m.expectedWords.length, 0);
  const totalCorrect = caseMetrics.reduce((s, m) => s + m.correctWords, 0);
  const totalWrongUrdu = caseMetrics.reduce((s, m) => s + m.wrongUrduTokens, 0);
  const totalReceivedUrdu = caseMetrics.reduce(
    (s, m) => s + m.receivedWords.filter(w => ARABIC.test(w)).length,
    0
  );
  const casesWithLatinLeak = caseMetrics.filter(m => m.unjustifiedLatin.length > 0).length;
  const protectedTokenFailureCount = caseMetrics.reduce(
    (s, m) => s + m.protectedFailures.length,
    0
  );
  const englishSafetyViolations = caseMetrics.filter(m => m.englishSafetyViolation).length;
  const exactMatches = caseMetrics.filter(m => m.exactMatch).length;

  const categories = [...new Set(cases.map(c => c.category))];
  const byCategory: CategoryBreakdown[] = categories.map(category => {
    const subset = caseMetrics.filter(m => m.category === category);
    const expW = subset.reduce((s, m) => s + m.expectedWords.length, 0);
    const corW = subset.reduce((s, m) => s + m.correctWords, 0);
    const wrongU = subset.reduce((s, m) => s + m.wrongUrduTokens, 0);
    const recU = subset.reduce(
      (s, m) => s + m.receivedWords.filter(w => ARABIC.test(w)).length,
      0
    );
    return {
      category,
      total: subset.length,
      exactMatches: subset.filter(m => m.exactMatch).length,
      wordCorrectionRate: expW ? corW / expW : 1,
      wrongUrduSpellingRate: recU ? wrongU / recU : 0,
      latinLeakageRate: subset.length
        ? subset.filter(m => m.unjustifiedLatin.length > 0).length / subset.length
        : 0,
      protectedFailures: subset.reduce((s, m) => s + m.protectedFailures.length, 0),
      englishSafetyViolations: subset.filter(m => m.englishSafetyViolation).length,
    };
  });

  return {
    totalCases: cases.length,
    exactMatches,
    exactMatchRate: cases.length ? exactMatches / cases.length : 0,
    wordCorrectionRate: totalExpectedWords ? totalCorrect / totalExpectedWords : 1,
    wrongUrduSpellingRate: totalReceivedUrdu ? totalWrongUrdu / totalReceivedUrdu : 0,
    unjustifiedLatinLeakageRate: cases.length ? casesWithLatinLeak / cases.length : 0,
    protectedTokenFailureCount,
    englishSafetyViolations,
    byCategory,
    cases: caseMetrics,
  };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

const CATEGORY_LABELS: Record<string, string> = {
  chat: "Chat",
  formal: "Formal",
  mixed: "Mixed English",
  religious_academic: "Religious/Academic",
  severe_noise: "Severe Noise",
};

export function formatScorecard(sc: Scorecard): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("===========================================================");
  lines.push("         Qalam Urdu Writer Quality Scorecard");
  lines.push("===========================================================");
  lines.push(`  Golden cases (frozen GS-001–GS-020):  ${sc.totalCases}`);
  lines.push(`  Exact sentence matches:               ${sc.exactMatches}/${sc.totalCases}  (${pct(sc.exactMatchRate)})`);
  lines.push("");
  lines.push("  -- Core metrics --");
  lines.push(`  1. Word Correction Rate:              ${pct(sc.wordCorrectionRate)}`);
  lines.push(`  2. Wrong Urdu Spelling Rate:           ${pct(sc.wrongUrduSpellingRate)}`);
  lines.push(`  3. Unjustified Latin Leakage Rate:     ${pct(sc.unjustifiedLatinLeakageRate)}`);
  lines.push(`  4. Protected Token Failure Count:      ${sc.protectedTokenFailureCount}`);
  lines.push(`  5. English Safety Violations:          ${sc.englishSafetyViolations}`);
  lines.push("");
  lines.push("  -- Category breakdown --");
  for (const row of sc.byCategory) {
    const label = (CATEGORY_LABELS[row.category] || row.category).padEnd(20);
    lines.push(
      `  ${label} n=${row.total}  exact=${row.exactMatches}/${row.total}  wordCorr=${pct(row.wordCorrectionRate)}  wrongUrdu=${pct(row.wrongUrduSpellingRate)}  latinLeak=${pct(row.latinLeakageRate)}  protFail=${row.protectedFailures}  enSafeViol=${row.englishSafetyViolations}`
    );
  }
  lines.push("");
  lines.push("  -- Per-case mismatches --");
  for (const m of sc.cases) {
    if (m.exactMatch) continue;
    const bits: string[] = [];
    if (m.missedWords) bits.push(`missedWords=${m.missedWords}`);
    if (m.wrongUrduTokens) bits.push(`wrongUrdu=${m.wrongUrduTokens}`);
    if (m.unjustifiedLatin.length) bits.push(`latin=[${m.unjustifiedLatin.join(", ")}]`);
    if (m.protectedFailures.length) bits.push(`protFail=[${m.protectedFailures.join(", ")}]`);
    if (m.englishSafetyViolation) bits.push("englishSafetyViolation");
    lines.push(`  ${m.id} [${m.category}] ${bits.join("; ") || "differs"}`);
  }
  lines.push("===========================================================");
  lines.push("");
  return lines.join("\n");
}
