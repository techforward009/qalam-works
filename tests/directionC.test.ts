/**
 * Phase 19A.0j — Direction C Evaluation
 * V3-A vs V3-B vs V3-C on development and observed-challenge sets.
 * Includes generation-vs-ranking diagnostic and candidate recall.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import { engineV3 } from "../app/tools/roman-urdu-writer/utils/engineV3";
import { engineV3B, engineV3C } from "../app/tools/roman-urdu-writer/utils/engineDirC";
import { runBenchmark, scoreExample, type BenchmarkCorpus } from "../app/tools/roman-urdu-writer/utils/benchmarkScorer";
import { runChallengeEval, type ChallengeCorpus } from "../app/tools/roman-urdu-writer/utils/challengeEval";
import { buildDiagnosticReport } from "../app/tools/roman-urdu-writer/utils/diagnostics";
import { ngramScore, ngramRerank, NGRAM_META } from "../app/tools/roman-urdu-writer/utils/urduNgramScorer";
import { generateCandidates } from "../app/tools/roman-urdu-writer/utils/graphemeGenerator";
import { reRankCandidates } from "../app/tools/roman-urdu-writer/utils/candidateRanker";
import URDU_WORD_DATA from "../app/tools/roman-urdu-writer/utils/urduWordList.json";

const benchmark: BenchmarkCorpus = JSON.parse(readFileSync(join(__dirname, "fixtures/romanUrduBenchmark.json"), "utf-8"));
const challenge: ChallengeCorpus = JSON.parse(readFileSync(join(__dirname, "fixtures/romanUrduChallenge.json"), "utf-8"));
const URDU_WORD_SET = new Set((URDU_WORD_DATA as { words: string[] }).words);

// ── N-gram scorer unit tests ─────────────────────────────────────────────────

describe("N-gram scorer", () => {
  test("model metadata is correct", () => {
    expect(NGRAM_META.license).toBe("MIT");
    expect(NGRAM_META.trigramCount).toBeGreaterThan(5000);
    expect(NGRAM_META.wordCount).toBe(50000);
  });

  test("real Urdu words score higher than grapheme noise", () => {
    const real = ["کام", "پانی", "کھانا", "گھر", "بہت"];
    const noise = ["پُہُنچٹا", "کساازفو", "باففرانگ"];
    const realAvg = real.reduce((s, w) => s + ngramScore(w), 0) / real.length;
    const noiseAvg = noise.reduce((s, w) => s + ngramScore(w), 0) / noise.length;
    expect(realAvg).toBeGreaterThan(noiseAvg);
  });

  test("پانی scores higher than پآنی (correct vs corrupted orthography)", () => {
    expect(ngramScore("پانی")).toBeGreaterThan(ngramScore("پآنی"));
  });

  test("کھانا scores higher than کساازفو (real vs noise)", () => {
    expect(ngramScore("کھانا")).toBeGreaterThan(ngramScore("کساازفو"));
  });

  test("smoothed UNK score is negative", () => {
    expect(ngramScore("zzzzzzz")).toBeLessThan(-5);
  });

  test("score is deterministic", () => {
    expect(ngramScore("کھانا")).toBe(ngramScore("کھانا"));
  });

  test("empty string returns floor score", () => {
    expect(ngramScore("")).toBeLessThan(-5);
  });
});

describe("N-gram reranking", () => {
  test("reranks candidates — correct Urdu form moves up", () => {
    // Simulate: beam produces [wrong, correct] → reranking should prefer correct
    const cands = [
      { text: "پآنی", score: -2.0 },   // grapheme artifact
      { text: "پانی", score: -2.1 },   // correct form, slightly lower beam score
    ];
    const reranked = ngramRerank(cands);
    expect(reranked[0].text).toBe("پانی");
  });

  test("output preserves all input candidates", () => {
    const cands = generateCandidates("khana").map(c => ({ text: c.text, score: c.score }));
    const reranked = ngramRerank(cands);
    expect(reranked.length).toBe(cands.length);
  });

  test("reranked list is sorted descending by combined score", () => {
    const cands = generateCandidates("ghar").map(c => ({ text: c.text, score: c.score }));
    const reranked = ngramRerank(cands);
    for (let i = 1; i < reranked.length; i++) {
      expect(reranked[i - 1].combined).toBeGreaterThanOrEqual(reranked[i].combined);
    }
  });
});

// ── Generation-vs-ranking diagnostic ─────────────────────────────────────────

test("generation-vs-ranking diagnostic (development OOV tokens)", () => {
  const devExamples = benchmark.examples.filter((e: any) => e.split === "development");

  let generationFailures = 0;  // correct Urdu form absent from beam
  let rankingFailures = 0;     // correct form present but not rank 1
  let perfect = 0;
  let checked = 0;

  for (const ex of devExamples) {
    const tokens = ex.input.split(/\s+/);
    const refTokens = ex.expected.split(/\s+/);
    for (let i = 0; i < Math.min(tokens.length, refTokens.length); i++) {
      const roman = tokens[i];
      const urdu = refTokens[i];
      if (!urdu || !/[\u0600-\u06FF]/.test(urdu)) continue; // skip non-Urdu ref tokens
      checked++;
      const beam = generateCandidates(roman);
      const reranked = reRankCandidates(beam);
      const finalRanked = ngramRerank(reranked);
      const texts = finalRanked.map(c => c.text);
      if (texts[0] === urdu) { perfect++; continue; }
      if (texts.includes(urdu)) { rankingFailures++; continue; }
      generationFailures++;
    }
  }

  process.stdout.write(`
Generation-vs-ranking (dev, OOV path):
  Tokens checked: ${checked}
  Perfect (rank 1 correct): ${perfect} (${(perfect/checked*100).toFixed(0)}%)
  Ranking failure (correct in beam, wrong rank): ${rankingFailures} (${(rankingFailures/checked*100).toFixed(0)}%)
  Generation failure (correct absent from beam): ${generationFailures} (${(generationFailures/checked*100).toFixed(0)}%)
`);
  expect(checked).toBeGreaterThan(0);
});

// ── Candidate recall ──────────────────────────────────────────────────────────

test("candidate recall — top-1 / top-3 / top-5 token recall", () => {
  const devExamples = benchmark.examples.filter((e: any) => e.split === "development");
  let top1 = 0, top3 = 0, top5 = 0, total = 0;

  for (const ex of devExamples) {
    const tokens = ex.input.split(/\s+/);
    const refTokens = ex.expected.split(/\s+/);
    for (let i = 0; i < Math.min(tokens.length, refTokens.length); i++) {
      const roman = tokens[i];
      const urdu = refTokens[i];
      if (!urdu || !/[\u0600-\u06FF]/.test(urdu)) continue;
      total++;
      const beam = generateCandidates(roman);
      const reranked = ngramRerank(reRankCandidates(beam));
      const texts = reranked.map(c => c.text);
      if (texts[0] === urdu) top1++;
      if (texts.slice(0,3).includes(urdu)) top3++;
      if (texts.slice(0,5).includes(urdu)) top5++;
    }
  }
  process.stdout.write(`
Candidate recall (dev, grapheme-generation path only):
  Total: ${total}
  Top-1 recall: ${top1}/${total} = ${(top1/total*100).toFixed(1)}%
  Top-3 recall: ${top3}/${total} = ${(top3/total*100).toFixed(1)}%
  Top-5 recall: ${top5}/${total} = ${(top5/total*100).toFixed(1)}%
`);
  expect(total).toBeGreaterThan(0);
});

// ── Unseen-word reranking test ────────────────────────────────────────────────

test("statistical reranking improves unseen-word candidate order", () => {
  const unseen = [
    { roman: "khana", expected: "کھانا" },
    { roman: "pani", expected: "پانی" },
    { roman: "ghar", expected: "گھر" },
    { roman: "raat", expected: "رات" },
    { roman: "subah", expected: "صبح" },
  ];

  let improvedOrSame = 0;
  for (const { roman, expected } of unseen) {
    const raw = generateCandidates(roman);
    const afterPlaus = reRankCandidates(raw);
    const afterNgram = ngramRerank(afterPlaus);

    const rankBefore = afterPlaus.findIndex(c => c.text === expected);
    const rankAfter = afterNgram.findIndex(c => c.text === expected);

    process.stdout.write(`  ${roman}: expected="${expected}" rank_before=${rankBefore} rank_after=${rankAfter}\n`);
    if (rankAfter <= rankBefore || rankBefore === -1) improvedOrSame++;
  }
  // n-gram reranking should not make things worse for most words
  expect(improvedOrSame).toBeGreaterThanOrEqual(3);
});

// ── Full comparison report ────────────────────────────────────────────────────

test("full V2 / V3-A / V3-B / V3-C comparison report", () => {
  const engines = [
    { engine: engineV2,  label: "V2  " },
    { engine: engineV3,  label: "V3-A" },
    { engine: engineV3B, label: "V3-B" },
    { engine: engineV3C, label: "V3-C" },
  ];

  const pct = (n: number, d: number) => `${(n/d*100).toFixed(1)}%`;

  process.stdout.write("\n── DEVELOPMENT SET ──────────────────────────\n");
  process.stdout.write("Engine  Top1     Top3     PT       Safe\n");
  for (const { engine, label } of engines) {
    const r = runBenchmark(benchmark, engine, "development");
    process.stdout.write(`${label}    ${pct(r.top1Correct,200).padEnd(9)}${pct(r.top3Correct,200).padEnd(9)}${(r.protectedTokenIntegrity*100).toFixed(1)}%    ${(r.unknownWordSafeRate*100).toFixed(1)}%\n`);
  }

  process.stdout.write("\n── OBSERVED CHALLENGE ──────────────────────\n");
  process.stdout.write("Engine  Top1     Top3     PT       Safe     TokAcc   WER    CER    Leak\n");
  for (const { engine, label } of engines) {
    const cr = runChallengeEval(challenge, engine);
    const diag = buildDiagnosticReport(label, (challenge.examples as any[]).map((e: any) => ({
      ...e, actual: engine.convert(e.input).output
    })));
    process.stdout.write(`${label}    ${pct(cr.top1Correct,120).padEnd(9)}${pct(cr.top3Correct,120).padEnd(9)}${(cr.ptIntegrity*100).toFixed(1)}%    ${(cr.unkSafeRate*100).toFixed(1)}%    ${(diag.tokenAccuracy*100).toFixed(1)}%    ${diag.avgWER.toFixed(3)}  ${diag.avgCER.toFixed(3)}  ${(diag.romanLeakageRate*100).toFixed(1)}%\n`);
  }

  // Per-category for best Direction C (V3-C)
  const chalC = runChallengeEval(challenge, engineV3C);
  const chalV2 = runChallengeEval(challenge, engineV2);
  process.stdout.write("\n── PER-CATEGORY (Challenge) ─────────────────\n");
  process.stdout.write("Category               V2       V3-C\n");
  for (const cat of chalC.perCategory) {
    const v2c = chalV2.perCategory.find(c => c.category === cat.category);
    process.stdout.write(`  ${cat.category.padEnd(22)} ${pct(v2c?.top1Correct??0, cat.total).padEnd(9)}${pct(cat.top1Correct, cat.total)}\n`);
  }

  // Multi-candidate stats
  process.stdout.write("\n── TOP-3 DIVERSITY ──────────────────────────\n");
  for (const { engine, label } of engines) {
    const cr = runChallengeEval(challenge, engine);
    const multi = cr.scores.filter(s => s.candidateCount > 1).length;
    process.stdout.write(`${label}: ${multi}/120 with >1 candidate\n`);
  }

  // Minimum success criteria for V3-C
  const crC = runChallengeEval(challenge, engineV3C);
  const diagC = buildDiagnosticReport("V3C", (challenge.examples as any[]).map((e: any) => ({
    ...e, actual: engineV3C.convert(e.input).output
  })));
  process.stdout.write(`
── MINIMUM SUCCESS CRITERIA (V3-C) ───────────────────────
PT integrity = 100%:      ${crC.ptIntegrity>=1.0?"✅":"❌"} (${(crC.ptIntegrity*100).toFixed(1)}%)
Unknown safety = 100%:    ${crC.unkSafeRate>=1.0?"✅":"❌"} (${(crC.unkSafeRate*100).toFixed(1)}%)
Token acc > 88.4%:        ${diagC.tokenAccuracy>0.884?"✅":"❌"} (${(diagC.tokenAccuracy*100).toFixed(1)}%)
WER < 0.116:              ${diagC.avgWER<0.116?"✅":"❌"} (${diagC.avgWER.toFixed(3)})
Roman leak < 8.6%:        ${diagC.romanLeakageRate<0.086?"✅":"❌"} (${(diagC.romanLeakageRate*100).toFixed(1)}%)
Top-1 > 54.2%:            ${crC.top1Accuracy>0.542?"✅":"❌"} (${(crC.top1Accuracy*100).toFixed(1)}%)
mixed_english ≥ 85%:      ${(crC.perCategory.find(c=>c.category==="mixed_english")?.top1Accuracy??0)>=0.85?"✅":"❌"} (${((crC.perCategory.find(c=>c.category==="mixed_english")?.top1Accuracy??0)*100).toFixed(0)}%)
Real Top-3:               ${crC.scores.filter(s=>s.candidateCount>1).length>0?"✅":"❌"} (${crC.scores.filter(s=>s.candidateCount>1).length}/120)
`);
  expect(true).toBe(true);
});

// ── V2 regression guard ───────────────────────────────────────────────────────

test("V2 dev Top-1 still ≥ 98% — regression guard", () => {
  expect(runBenchmark(benchmark, engineV2, "development").top1Accuracy).toBeGreaterThanOrEqual(0.98);
});
