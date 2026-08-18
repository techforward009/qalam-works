/**
 * Phase 19A.0f — One-Time Blind Challenge Evaluation
 *
 * Runs Engine V2 (c51776bb) against the frozen challenge corpus (d81b9574).
 * Results are recorded here permanently.
 *
 * POLICY: Do NOT modify engineV2.ts, lexicon.ts, phraseTable.ts after this runs.
 * Do NOT tune the engine based on these results.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import {
  runChallengeEval,
  type ChallengeCorpus,
  type ChallengeEvalResult,
} from "../app/tools/roman-urdu-writer/utils/challengeEval";

const corpus: ChallengeCorpus = JSON.parse(
  readFileSync(join(__dirname, "fixtures/romanUrduChallenge.json"), "utf-8")
);

// ── Run evaluation once ───────────────────────────────────────────────────────

let result: ChallengeEvalResult;

beforeAll(() => {
  result = runChallengeEval(corpus, engineV2);
});

// ── Print full report ─────────────────────────────────────────────────────────

test("print challenge evaluation report", () => {
  const r = result;
  const pct = (n: number, d: number) => `${n}/${d} = ${(n / d * 100).toFixed(1)}%`;

  process.stdout.write(`
╔══════════════════════════════════════════════════════════════╗
║  PHASE 19A.0f — BLIND CHALLENGE EVALUATION REPORT           ║
║  Engine: c51776bb  |  Corpus: d81b9574                       ║
╚══════════════════════════════════════════════════════════════╝

── ACCURACY ──────────────────────────────────────────────────
Top-1: ${pct(r.top1Correct, r.totalExamples)}
Top-3: ${pct(r.top3Correct, r.totalExamples)}

── PROTECTED TOKENS ──────────────────────────────────────────
Examples with protectedTokens: ${r.ptExamplesChecked}
Tokens checked: ${r.ptTokensChecked}
Tokens failed: ${r.ptTokensFailed}
Integrity: ${r.ptTokensChecked > 0 ? pct(r.ptTokensChecked - r.ptTokensFailed, r.ptTokensChecked) : "N/A"}

── UNKNOWN TOKEN SAFETY ──────────────────────────────────────
Examples with unknownTokens: ${r.unkExamplesChecked}
Tokens checked: ${r.unkTokensChecked}
Tokens failed: ${r.unkTokensFailed}
Safe rate: ${r.unkTokensChecked > 0 ? pct(r.unkTokensChecked - r.unkTokensFailed, r.unkTokensChecked) : "N/A"}

── CANDIDATES ────────────────────────────────────────────────
1 candidate: ${r.examplesWith1Candidate}
2 candidates: ${r.examplesWith2Candidates}
3 candidates: ${r.examplesWith3Candidates}
Uniqueness failures: ${r.uniquenessFailures}
Primary≠Candidate[0]: ${r.primaryCandidateMismatches}

── LATENCY ───────────────────────────────────────────────────
Average: ${r.avgLatencyMs.toFixed(3)} ms
Maximum: ${r.maxLatencyMs.toFixed(3)} ms

── PER CATEGORY ──────────────────────────────────────────────
${r.perCategory.map(c =>
  `  ${c.category.padEnd(22)} Top1: ${pct(c.top1Correct, c.total).padEnd(18)} Top3: ${pct(c.top3Correct, c.total)}`
).join("\n")}

── AMBIGUITY (context_ambiguity category) ────────────────────
${(() => {
  const ca = r.perCategory.find(c => c.category === "context_ambiguity");
  if (!ca) return "  (none)";
  return `  Top-1: ${pct(ca.top1Correct, ca.total)}\n  Top-3: ${pct(ca.top3Correct, ca.total)}`;
})()}

── FAILURE ROOT CAUSES ───────────────────────────────────────
${(() => {
  const fails = r.scores.filter(s => !s.top1Pass);
  const classes: Record<string, number> = {};
  for (const s of fails) {
    let cause = "other";
    const inp = s.input.toLowerCase();
    const exp = s.expected;
    if (!s.protectedTokensPass) { cause = "protected-token failure"; }
    else if (s.unknownTokenFailures.length > 0) { cause = "unknown-token safety"; }
    else if (/[A-Z][a-z]/.test(s.input) && s.actual.includes(s.input.match(/[A-Z][a-z]+/)?.[0] ?? "")) { cause = "proper-name handling"; }
    else if (s.input.split(" ").some(t => ["main","to","is","par","na","bus","kal","mein"].includes(t.toLowerCase()))) { cause = "contextual ambiguity"; }
    else if (/[a-z]{6,}/.test(s.input) && s.actual.includes(s.input.match(/[a-z]{6,}/)?.[0] ?? "")) { cause = "lexicon coverage"; }
    else if (s.actual.replace(/\s+/g, " ") !== s.actual) { cause = "spacing/reconstruction"; }
    else if (/[A-Z]/.test(s.input)) { cause = "proper-name / English preservation"; }
    else { cause = "lexicon coverage / morphology"; }
    classes[cause] = (classes[cause] ?? 0) + 1;
  }
  return Object.entries(classes)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n") || "  (none — perfect score)";
})()}

── QUALITY GATE SUMMARY ──────────────────────────────────────
Top-1 ≥ 90%:               ${result.top1Accuracy >= 0.90 ? "✅ PASS" : "❌ FAIL"} (${(result.top1Accuracy*100).toFixed(1)}%)
Top-3 ≥ 97%:               ${result.top3Accuracy >= 0.97 ? "✅ PASS" : "❌ FAIL"} (${(result.top3Accuracy*100).toFixed(1)}%)
PT integrity = 100%:       ${result.ptIntegrity >= 1.0 ? "✅ PASS" : "❌ FAIL"} (${(result.ptIntegrity*100).toFixed(1)}%)
Destructive unknown ≤ 1%:  ${(1 - result.unkSafeRate) <= 0.01 ? "✅ PASS" : "❌ FAIL"} (${((1 - result.unkSafeRate)*100).toFixed(1)}%)
`);
  expect(true).toBe(true);
});

// ── Gate assertions ───────────────────────────────────────────────────────────

test("infrastructure: all 120 examples evaluated", () => {
  expect(result.totalExamples).toBe(120);
});

test("infrastructure: no candidate uniqueness failures", () => {
  expect(result.uniquenessFailures).toBe(0);
});

test("infrastructure: primary output always equals candidate[0]", () => {
  expect(result.primaryCandidateMismatches).toBe(0);
});

test("infrastructure: all candidates ≤ 3", () => {
  const over3 = result.scores.filter(s => s.candidateCount > 3);
  expect(over3).toHaveLength(0);
});

// ── Gate assertions (document actual outcome — do not tune engine to pass) ────

test("GATE: Top-1 ≥ 90% — record actual result", () => {
  process.stdout.write(`  Top-1 gate: ${result.top1Accuracy >= 0.90 ? "PASS" : "FAIL"} (${(result.top1Accuracy*100).toFixed(1)}% vs 90% target)\n`);
  // Not asserting pass — records the honest outcome without hiding failures
  expect(result.top1Accuracy).toBeGreaterThan(0); // sanity only
});

test("GATE: Top-3 ≥ 97% — record actual result", () => {
  process.stdout.write(`  Top-3 gate: ${result.top3Accuracy >= 0.97 ? "PASS" : "FAIL"} (${(result.top3Accuracy*100).toFixed(1)}% vs 97% target)\n`);
  expect(result.top3Accuracy).toBeGreaterThan(0);
});

test("GATE: PT integrity = 100% — record actual result", () => {
  process.stdout.write(`  PT gate: ${result.ptIntegrity >= 1.0 ? "PASS" : "FAIL"} (${(result.ptIntegrity*100).toFixed(1)}% vs 100% target)\n`);
  expect(result.ptTokensFailed).toBeGreaterThanOrEqual(0); // sanity only
});

test("GATE: Destructive unknown ≤ 1% — record actual result", () => {
  const destructiveRate = 1 - result.unkSafeRate;
  process.stdout.write(`  Unknown gate: ${destructiveRate <= 0.01 ? "PASS" : "FAIL"} (${(destructiveRate*100).toFixed(1)}% vs 1% target)\n`);
  expect(destructiveRate).toBeGreaterThanOrEqual(0);
});

// ── Failure analysis record ───────────────────────────────────────────────────

test("record all Top-1 failures for analysis", () => {
  const fails = result.scores.filter(s => !s.top1Pass);
  if (fails.length > 0) {
    process.stdout.write(`\n── TOP-1 FAILURES (${fails.length}) ──\n`);
    for (const s of fails) {
      process.stdout.write(`  [${s.category}] ${s.id}: "${s.input}"\n    expect: "${s.expected}"\n    got:    "${s.actual}"\n`);
    }
  }
  expect(fails.length).toBeLessThan(120); // sanity — not all failed
});

test("ambiguity category: record results", () => {
  const ca = result.scores.filter(s => s.category === "context_ambiguity");
  const pass = ca.filter(s => s.top1Pass).length;
  process.stdout.write(`\nContext ambiguity: ${pass}/${ca.length} Top-1 correct\n`);
  expect(ca.length).toBe(20);
});
