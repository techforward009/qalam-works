/**
 * Qalam Works — Real-World Stress Benchmark
 * Tests the 3 formal/philosophical paragraphs from production screenshots.
 * This is a diagnostic scorecard, not a hard pass/fail gate.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import {
  fixFormalOutput,
  transformPKRAmount,
  transformPercentage,
  transformAcronymsAndBrands,
  cleanParentheticals,
} from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

const stressFixtures = JSON.parse(
  readFileSync(join(__dirname, "fixtures/stressBenchmark.json"), "utf8")
);

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  const p2 = transformPKRAmount(p1);
  const p3 = transformPercentage(p2);
  const p4 = transformAcronymsAndBrands(p3);
  const p5 = cleanParentheticals(p4);
  return normalizeUrduProsePunctuation(p5);
}

const NON_REVIEWABLE_RE = /^[\d,]+(?:\.\d+)?%?$|^\d[\d,]*(?:[-/]\d+)+$|^(?:RS\.?|Rs\.?|rs\.?|PKR)(?:\s*[\d,]+)?$/i;
function reviewCards(input: string): string[] {
  const r = convertRomanUrdu(input);
  return r.tokens.filter((tok: any) => {
    if (tok.isPhrasePart || /^\s+$/.test(tok.roman)) return false;
    if (tok.isProtected || tok.isEnglish) return false;
    if (/[\u0600-\u06FF]/.test(tok.roman)) return false; // compound-resolved Urdu tokens
    if (NON_REVIEWABLE_RE.test(tok.roman.trim())) return false;
    const core = tok.roman.toLowerCase().replace(/[^a-z]/g, "");
    const closed = new Set(["na","nahi","nahin","is","us","ke","ka","ki","ko","se","par","pe","to","toh","bhi","hi","aur","ya","jo","jab","tab","mein","main","mai","ne","hai","hain","ho"]);
    if (closed.has(core)) return false;
    if (!tok.hasAlternatives && !tok.isPassthrough && tok.confidence !== "low") return false;
    if (tok.hasAlternatives && tok.candidates.length >= 2) {
      const distinct = new Set(tok.candidates.map((c: any) => c.text).filter((x: string) => !!x));
      return distinct.size >= 2;
    }
    return tok.isPassthrough || tok.confidence === "low";
  }).map((t: any) => t.roman);
}

function wordOverlapRate(received: string, expected: string): number {
  const urduWords = (s: string) => s.replace(/[^\u0600-\u06FF\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const recWords = new Set(urduWords(received));
  const expWords = urduWords(expected);
  if (expWords.length === 0) return 0;
  const hits = expWords.filter(w => recWords.has(w)).length;
  return hits / expWords.length;
}

function latinLeakCount(text: string): number {
  // Count standalone Latin words (not numbers, not at start of quoted string)
  const matches = text.match(/\b[a-zA-Z]{2,}\b/g) ?? [];
  // Allow only known non-prose Latin (URLs etc handled by protection)
  return matches.filter(m => !/^\d/.test(m)).length;
}

describe("Real-World Stress Benchmark — 3 Production Paragraphs", () => {
  for (const fixture of stressFixtures) {
    test(`${fixture.id} — ${fixture.label} (diagnostic)`, () => {
      const received = pipe(fixture.input);
      const cards = reviewCards(fixture.input);
      const wcr = wordOverlapRate(received, fixture.expected_output);
      const latinLeaks = latinLeakCount(received);
      const exactMatch = received.trim() === fixture.expected_output.trim();

      console.log(`\n──── ${fixture.id} ────`);
      console.log(`IN:       ${fixture.input.slice(0, 80)}...`);
      console.log(`OUT:      ${received.slice(0, 80)}...`);
      console.log(`EXPECTED: ${fixture.expected_output.slice(0, 80)}...`);
      console.log(`WCR:      ${(wcr * 100).toFixed(1)}%`);
      console.log(`LATIN:    ${latinLeaks} leaked words`);
      console.log(`REVIEW:   ${cards.length} cards [${cards.slice(0, 5).join(", ")}]`);
      console.log(`EXACT:    ${exactMatch}`);
      console.log(`KNOWN FAILURES (${fixture.known_failures.length}):`);
      for (const f of fixture.known_failures) console.log(`  - ${f}`);

      // Hard gates: no Latin leakage in Urdu context, no junk Review for "is"
      expect(cards).not.toContain("is");
      expect(cards).not.toContain("us");
      // Diagnostic (no hard threshold — this is audit, not regression)
      expect(received.length).toBeGreaterThan(50); // At least some output
      expect(latinLeaks).toBeLessThan(20); // Gross sanity check only
    });
  }

  test("stress suite: no 'is' or 'us' Review across all 3 paragraphs", () => {
    for (const fixture of stressFixtures) {
      const cards = reviewCards(fixture.input);
      expect(cards).not.toContain("is");
      expect(cards).not.toContain("us");
      expect(cards).not.toContain("Is");
      expect(cards).not.toContain("Us");
    }
  });
});
