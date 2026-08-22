/**
 * Phase 19A.17 — GS-021 to GS-100 Benchmark Expansion + Quality Audit
 * Read-only: does not modify the engine or any expected outputs.
 * Identifies failure patterns for next-phase planning.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import { fixFormalOutput, transformPKRAmount, transformPercentage, transformAcronymsAndBrands, cleanParentheticals } from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";
import {
  buildScorecard,
  formatScorecard,
  type GoldenCase,
} from "./helpers/goldenQualityScorecard";

// Full display pipeline (same as RomanUrduWriterClient.tsx displayUrduOutput)
function pipe(input: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(input).output);
  const p2 = transformPKRAmount(p1);
  const p3 = transformPercentage(p2);
  const p4 = transformAcronymsAndBrands(p3);
  const p5 = cleanParentheticals(p4);
  return normalizeUrduProsePunctuation(p5);
}

const gs20Path = resolve(__dirname, "fixtures/romanUrduGolden20.json");
const gs100Path = resolve(__dirname, "fixtures/romanUrduGolden100.json");
const gs20: GoldenCase[] = JSON.parse(readFileSync(gs20Path, "utf8"));
const gs100: GoldenCase[] = JSON.parse(readFileSync(gs100Path, "utf8"));
const all80 = gs100; // GS-021..GS-100

describe("19A.17 — GS-100 Benchmark", () => {
  test("fixture has exactly 80 new golden sentences (GS-021 to GS-100)", () => {
    expect(all80.length).toBeGreaterThanOrEqual(80);
    expect(all80[0].id).toBe("GS-021");
    // GS-100 may not be last if new cases added
    for (const c of all80) {
      expect(c.id).toMatch(/^GS-\d{3}$/);
      expect(c.input.length).toBeGreaterThan(0);
      expect(c.expected_output.length).toBeGreaterThan(0);
    }
  });

  test("category distribution", () => {
    const cats: Record<string, number> = {};
    for (const c of all80) cats[c.category] = (cats[c.category] ?? 0) + 1;
    expect(cats["chat"]).toBeGreaterThanOrEqual(30);
    expect(cats["formal"]).toBeGreaterThanOrEqual(20);
    expect(cats["mixed_english"]).toBeGreaterThanOrEqual(15);
    expect(cats["religious_academic"]).toBeGreaterThanOrEqual(10);
    expect(cats["severe_noise"]).toBeGreaterThanOrEqual(5);
  });

  test("GS-021 to GS-100 quality scorecard", () => {
    const cases = all80;
    const outputStrs = cases.map(c => pipe(c.input));
    const scorecard = buildScorecard(cases, outputStrs);
    const outputs = cases.map((c, i) => ({ id: c.id, output: outputStrs[i] }));
    const report = formatScorecard(scorecard);
    console.log("\n=== 19A.17 GS-021..GS-100 Scorecard ===");
    console.log(report);

    // Diagnostic: show top 20 failures
    const failures: Array<{ id: string; input: string; expected: string; got: string; wcr: number }> = [];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const got = outputs[i].output;
      const expWords = c.expected_output.split(/\s+/).filter(Boolean);
      const gotWords = got.split(/\s+/).filter(Boolean);
      const correct = expWords.filter(w => gotWords.includes(w)).length;
      const wcr = expWords.length > 0 ? correct / expWords.length : 1;
      if (!c.expected_output.trim().split(/\s+/).every(w => got.includes(w))) {
        failures.push({ id: c.id, input: c.input, expected: c.expected_output, got, wcr });
      }
    }
    failures.sort((a, b) => a.wcr - b.wcr);

    console.log("\n=== Top Failing Sentences (worst first) ===");
    for (const f of failures.slice(0, 20)) {
      console.log(`\n${f.id} [WCR=${(f.wcr*100).toFixed(0)}%]`);
      console.log(`  IN:  ${f.input}`);
      console.log(`  EXP: ${f.expected}`);
      console.log(`  GOT: ${f.got}`);
    }

    // Failure pattern analysis
    const patternCounts: Record<string, number> = {
      "phonetic_garble": 0,
      "loanword_not_preserved": 0,
      "missing_vowel_fail": 0,
      "wrong_urdu_word": 0,
      "protected_token_corrupted": 0,
      "short_form_fail": 0,
    };
    for (const f of failures) {
      // Loanword not preserved
      if (f.id.startsWith("GS-07") || f.id.startsWith("GS-08")) patternCounts["loanword_not_preserved"]++;
      // Short form fail
      const tags = (all80.find(c => c.id === f.id) as any)?.tags?.tests ?? [];
      if (tags.includes("short_forms") || tags.includes("missing_vowels")) patternCounts["missing_vowel_fail"]++;
      // Phonetic garble detection: lots of individual letters / syllables in output
      if (/[a-zA-Z]{3,}/.test(f.got) && !f.expected.includes("email") && !f.expected.includes("WhatsApp")) patternCounts["phonetic_garble"]++;
    }
    console.log("\n=== Failure Pattern Counts ===");
    for (const [pattern, count] of Object.entries(patternCounts).sort((a,b) => b[1]-a[1])) {
      console.log(`  ${pattern}: ${count}`);
    }

    expect(scorecard.totalCases).toBeGreaterThanOrEqual(80);
    // No hard pass threshold for new benchmark — diagnostic only
    expect(true).toBe(true);
  });

  test("Combined GS-001..GS-100 quality scorecard", () => {
    const allCases = [...gs20, ...all80];
    const outputStrs = allCases.map(c => pipe(c.input));
    const scorecard = buildScorecard(allCases, outputStrs);
    const outputs = allCases.map((c, i) => ({ id: c.id, output: outputStrs[i] }));
    const report = formatScorecard(scorecard);
    console.log("\n=== COMBINED GS-001..GS-100 Full Scorecard ===");
    console.log(report);
    expect(scorecard.totalCases).toBeGreaterThanOrEqual(100);
  });
});
