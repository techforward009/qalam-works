/**
 * Phase 19A.0g — Post-Evaluation Diagnostic Utilities
 *
 * READ-ONLY. Does not modify engine, lexicon, phrase table, or corpora.
 * Used for diagnosis only — not a quality gate, not a retroactive weakening
 * of the 19A.0f evaluation result.
 */

// ── Token alignment ───────────────────────────────────────────────────────────

/**
 * Deterministic whitespace tokenizer.
 * Splits on runs of whitespace. Preserves punctuation attached to tokens.
 * No silent Unicode normalization.
 */
export function tokenize(s: string): string[] {
  return s.trim().split(/\s+/).filter(t => t.length > 0);
}

/**
 * Needleman–Wunsch sequence alignment for computing edit operations.
 * Returns { correct, substitutions, insertions, deletions }.
 * Insertions = tokens in hypothesis not in reference.
 * Deletions  = tokens in reference not in hypothesis.
 * Substitutions = mismatched tokens at aligned positions.
 */
export interface EditCounts {
  refTokens: number;
  hypTokens: number;
  correct: number;
  substitutions: number;
  insertions: number;
  deletions: number;
}

export function tokenEditCounts(ref: string[], hyp: string[]): EditCounts {
  const R = ref.length;
  const H = hyp.length;

  // DP table: dp[i][j] = min edit distance for ref[0..i-1] vs hyp[0..j-1]
  const dp: number[][] = Array.from({ length: R + 1 }, (_, i) =>
    Array.from({ length: H + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= R; i++) {
    for (let j = 1; j <= H; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Traceback to count operation types
  let i = R, j = H;
  let subs = 0, ins = 0, dels = 0, correct = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) {
      correct++;
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      subs++;
      i--; j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ins++;
      j--;
    } else {
      dels++;
      i--;
    }
  }

  return { refTokens: R, hypTokens: H, correct, substitutions: subs, insertions: ins, deletions: dels };
}

/** Word Error Rate = (S + I + D) / N */
export function wer(counts: EditCounts): number {
  if (counts.refTokens === 0) return 0;
  return (counts.substitutions + counts.insertions + counts.deletions) / counts.refTokens;
}

// ── Character-level ───────────────────────────────────────────────────────────

/** Levenshtein character edit distance. */
export function charEditDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/** Character Error Rate = charEditDistance(ref, hyp) / ref.length */
export function cer(ref: string, hyp: string): number {
  if (ref.length === 0) return 0;
  return charEditDistance(ref, hyp) / ref.length;
}

// ── Roman-leakage detection ───────────────────────────────────────────────────

const URDU_RANGE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ASCII_WORD = /^[A-Za-z][A-Za-z0-9]*$/;

/**
 * Returns true if a token is "Roman leakage" in the hypothesis:
 * - ASCII-looking word
 * - the reference token at the same aligned position is Urdu-script
 * - it is NOT a protected/English/unknown token
 */
export function isRomanLeakage(
  hypToken: string,
  refToken: string,
  protectedSet: Set<string>
): boolean {
  if (!ASCII_WORD.test(hypToken)) return false;
  if (protectedSet.has(hypToken)) return false;
  if (!URDU_RANGE.test(refToken)) return false; // ref was also Roman/mixed
  return true;
}

// ── Destructive transliteration detection ────────────────────────────────────

/**
 * Returns true if a token that should have stayed Roman was converted to Urdu.
 * Types: "protected", "english", "proper-name"
 */
export function destructiveType(
  hypToken: string,
  refToken: string,
  protectedSet: Set<string>
): "protected" | "english" | "proper-name" | null {
  if (URDU_RANGE.test(hypToken) && !URDU_RANGE.test(refToken)) {
    if (protectedSet.has(refToken)) return "protected";
    if (/^[A-Z]/.test(refToken) && /^[A-Z][a-z]/.test(refToken)) return "proper-name";
    if (ASCII_WORD.test(refToken)) return "english";
  }
  return null;
}

// ── Per-example diagnostics ───────────────────────────────────────────────────

export interface ExampleDiagnostic {
  id: string;
  category: string;
  input: string;
  expected: string;
  actual: string;
  exactMatch: boolean;
  wrongTokenCount: number;
  editCounts: EditCounts;
  wordErrorRate: number;
  characterErrorRate: number;
  romanLeakageTokens: string[];
  destructiveConversions: Array<{ token: string; type: string }>;
  severity: "perfect" | "minor" | "moderate" | "severe";
}

export function diagnoseExample(
  id: string,
  category: string,
  input: string,
  expected: string,
  actual: string,
  protectedTokens: string[] = []
): ExampleDiagnostic {
  const protectedSet = new Set(protectedTokens);
  const refToks = tokenize(expected);
  const hypToks = tokenize(actual);
  const exactMatch = expected === actual;

  const edits = tokenEditCounts(refToks, hypToks);
  const wordErrorRate = wer(edits);
  const characterErrorRate = cer(expected, actual);

  // Token-level Roman leakage and destructive conversions
  // Align greedily for per-token analysis (simpler than full traceback)
  const wrongTokenCount = edits.substitutions + edits.deletions + edits.insertions;
  const romanLeakage: string[] = [];
  const destructive: Array<{ token: string; type: string }> = [];

  const minLen = Math.min(refToks.length, hypToks.length);
  for (let i = 0; i < minLen; i++) {
    const ref = refToks[i];
    const hyp = hypToks[i];
    if (hyp === ref) continue;
    if (isRomanLeakage(hyp, ref, protectedSet)) romanLeakage.push(hyp);
    const dt = destructiveType(hyp, ref, protectedSet);
    if (dt) destructive.push({ token: hyp, type: dt });
  }

  // Severity classification
  let severity: ExampleDiagnostic["severity"];
  if (exactMatch) severity = "perfect";
  else if (wrongTokenCount === 1) severity = "minor";
  else if (wrongTokenCount <= 3 && wordErrorRate < 0.4) severity = "moderate";
  else severity = "severe";

  return {
    id, category, input, expected, actual, exactMatch, wrongTokenCount,
    editCounts: edits, wordErrorRate, characterErrorRate,
    romanLeakageTokens: romanLeakage,
    destructiveConversions: destructive,
    severity,
  };
}

// ── Aggregate diagnostics ─────────────────────────────────────────────────────

export interface CategoryDiagnostic {
  category: string;
  count: number;
  exactSentenceAccuracy: number;
  tokenAccuracy: number;
  avgWER: number;
  avgCER: number;
  romanLeakageRate: number;
  totalRefTokens: number;
  totalCorrectTokens: number;
}

export interface DiagnosticReport {
  label: string;
  totalExamples: number;
  exactSentenceAccuracy: number;

  // Error distribution
  perfect: number;
  oneWrongToken: number;
  twoWrongTokens: number;
  threeOrMoreWrongTokens: number;

  // Token-level
  totalRefTokens: number;
  totalCorrectTokens: number;
  tokenAccuracy: number;
  totalSubstitutions: number;
  totalInsertions: number;
  totalDeletions: number;
  avgWER: number;

  // Character-level
  avgCER: number;

  // Roman leakage
  romanLeakageExamples: number;
  romanLeakageTokenCount: number;
  romanLeakageRate: number;

  // Destructive conversion
  destructiveProtected: number;
  destructiveEnglish: number;
  destructiveProperName: number;

  // Severity
  minorFailures: number;
  moderateFailures: number;
  severeFailures: number;

  perCategory: CategoryDiagnostic[];
  examples: ExampleDiagnostic[];
}

export function buildDiagnosticReport(
  label: string,
  examples: Array<{
    id: string; category: string; input: string; expected: string;
    actual: string; protectedTokens?: string[];
  }>
): DiagnosticReport {
  const diags = examples.map(e =>
    diagnoseExample(e.id, e.category, e.input, e.expected, e.actual, e.protectedTokens ?? [])
  );

  const total = diags.length;
  const exact = diags.filter(d => d.exactMatch).length;

  const perfectD = diags.filter(d => d.severity === "perfect").length;
  const one = diags.filter(d => d.wrongTokenCount === 1 && !d.exactMatch).length;
  const two = diags.filter(d => d.wrongTokenCount === 2).length;
  const threeP = diags.filter(d => d.wrongTokenCount >= 3).length;

  const totalRef = diags.reduce((s, d) => s + d.editCounts.refTokens, 0);
  const totalCorr = diags.reduce((s, d) => s + d.editCounts.correct, 0);
  const totalSubs = diags.reduce((s, d) => s + d.editCounts.substitutions, 0);
  const totalIns = diags.reduce((s, d) => s + d.editCounts.insertions, 0);
  const totalDels = diags.reduce((s, d) => s + d.editCounts.deletions, 0);
  const avgWER = diags.reduce((s, d) => s + d.wordErrorRate, 0) / total;
  const avgCER = diags.reduce((s, d) => s + d.characterErrorRate, 0) / total;

  const leakEx = diags.filter(d => d.romanLeakageTokens.length > 0).length;
  const leakTok = diags.reduce((s, d) => s + d.romanLeakageTokens.length, 0);

  const destPT = diags.reduce((s, d) =>
    s + d.destructiveConversions.filter(c => c.type === "protected").length, 0);
  const destEN = diags.reduce((s, d) =>
    s + d.destructiveConversions.filter(c => c.type === "english").length, 0);
  const destPN = diags.reduce((s, d) =>
    s + d.destructiveConversions.filter(c => c.type === "proper-name").length, 0);

  const minorF = diags.filter(d => d.severity === "minor").length;
  const modF = diags.filter(d => d.severity === "moderate").length;
  const sevF = diags.filter(d => d.severity === "severe").length;

  // Per-category
  const catMap = new Map<string, ExampleDiagnostic[]>();
  for (const d of diags) {
    if (!catMap.has(d.category)) catMap.set(d.category, []);
    catMap.get(d.category)!.push(d);
  }
  const perCategory: CategoryDiagnostic[] = [];
  for (const [cat, cDiags] of catMap) {
    const cTotal = cDiags.length;
    const cExact = cDiags.filter(d => d.exactMatch).length;
    const cRef = cDiags.reduce((s, d) => s + d.editCounts.refTokens, 0);
    const cCorr = cDiags.reduce((s, d) => s + d.editCounts.correct, 0);
    const cLeakTok = cDiags.reduce((s, d) => s + d.romanLeakageTokens.length, 0);
    perCategory.push({
      category: cat, count: cTotal,
      exactSentenceAccuracy: cTotal > 0 ? cExact / cTotal : 0,
      tokenAccuracy: cRef > 0 ? cCorr / cRef : 0,
      avgWER: cDiags.reduce((s, d) => s + d.wordErrorRate, 0) / cTotal,
      avgCER: cDiags.reduce((s, d) => s + d.characterErrorRate, 0) / cTotal,
      romanLeakageRate: cRef > 0 ? cLeakTok / cRef : 0,
      totalRefTokens: cRef, totalCorrectTokens: cCorr,
    });
  }
  perCategory.sort((a, b) => a.category.localeCompare(b.category));

  return {
    label, totalExamples: total,
    exactSentenceAccuracy: total > 0 ? exact / total : 0,
    perfect: perfectD, oneWrongToken: one, twoWrongTokens: two, threeOrMoreWrongTokens: threeP,
    totalRefTokens: totalRef, totalCorrectTokens: totalCorr,
    tokenAccuracy: totalRef > 0 ? totalCorr / totalRef : 0,
    totalSubstitutions: totalSubs, totalInsertions: totalIns, totalDeletions: totalDels,
    avgWER, avgCER,
    romanLeakageExamples: leakEx, romanLeakageTokenCount: leakTok,
    romanLeakageRate: totalRef > 0 ? leakTok / totalRef : 0,
    destructiveProtected: destPT, destructiveEnglish: destEN, destructiveProperName: destPN,
    minorFailures: minorF, moderateFailures: modF, severeFailures: sevF,
    perCategory, examples: diags,
  };
}

// ── Mechanism coverage ────────────────────────────────────────────────────────

export type Mechanism =
  | "phrase-table"
  | "exact-lexicon"
  | "spelling-norm"
  | "morph-rule"
  | "context-sensitive"
  | "keep-english"
  | "hard-protect"
  | "unknown-passthrough";

export interface MechanismCoverage {
  mechanism: Mechanism;
  tokenCount: number;
  percentage: number;
}

/** Count mechanism breakdown using the same logic as engineV2 but read-only. */
export function analyzeMechanismCoverage(
  inputs: string[],
  convertFn: (token: string) => { output: string; mechanism: Mechanism }
): MechanismCoverage[] {
  const counts: Record<Mechanism, number> = {
    "phrase-table": 0, "exact-lexicon": 0, "spelling-norm": 0,
    "morph-rule": 0, "context-sensitive": 0, "keep-english": 0,
    "hard-protect": 0, "unknown-passthrough": 0,
  };
  let total = 0;

  for (const input of inputs) {
    const tokens = tokenize(input);
    for (const token of tokens) {
      total++;
      const result = convertFn(token);
      counts[result.mechanism]++;
    }
  }

  return (Object.entries(counts) as [Mechanism, number][]).map(([mechanism, count]) => ({
    mechanism, tokenCount: count, percentage: total > 0 ? count / total : 0,
  })).sort((a, b) => b.tokenCount - a.tokenCount);
}
