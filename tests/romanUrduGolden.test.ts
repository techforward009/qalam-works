/**
 * Phase 19A.10/19A.11 — Golden Regression Shield + Quality Scorecard
 * Dataset + reporting only. Does not modify the engine.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import {
  buildScorecard,
  formatScorecard,
  type GoldenCase,
} from "./helpers/goldenQualityScorecard";

const fixturePath = resolve(__dirname, "fixtures/romanUrduGolden20.json");
const cases: GoldenCase[] = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("19A.10/19A.11 Golden Regression Shield + Quality Scorecard", () => {
  test("fixture has exactly 20 frozen golden sentences", () => {
    expect(cases).toHaveLength(20);
    expect(cases[0].id).toBe("GS-001");
    expect(cases[19].id).toBe("GS-020");
    for (const c of cases) {
      expect(c.id).toMatch(/^GS-\d{3}$/);
      expect(c.input.length).toBeGreaterThan(0);
      expect(c.expected_output.length).toBeGreaterThan(0);
    }
  });

  test("category distribution", () => {
    const counts: Record<string, number> = {};
    for (const c of cases) counts[c.category] = (counts[c.category] || 0) + 1;
    expect(counts.chat).toBe(6);
    expect(counts.formal).toBe(5);
    expect(counts.mixed).toBe(4);
    expect(counts.religious_academic).toBe(3);
    expect(counts.severe_noise).toBe(2);
  });

  test("pipeline runs on every golden input", () => {
    for (const c of cases) {
      expect(engineV2.convert(c.input).output, c.id).toBeTruthy();
    }
  });

  test("protected tokens preserved where tagged", () => {
    for (const c of cases.filter(x => x.tags.has_protected_tokens)) {
      const received = engineV2.convert(c.input).output;
      const urls = c.input.match(/https?:\/\/\S+/gi) || [];
      const emails = c.input.match(/[^\s]+@[^\s]+/g) || [];
      const files = c.input.match(/\b[\w.-]+\.(?:pdf|docx?|xlsx?|png|jpe?g)\b/gi) || [];
      for (const u of urls) expect(received, `${c.id} url`).toContain(u);
      for (const e of emails) expect(received, `${c.id} email`).toContain(e);
      for (const f of files) expect(received, `${c.id} file`).toContain(f);
    }
  });

  test("Qalam Urdu Writer Quality Scorecard", () => {
    const outputs = cases.map(c => engineV2.convert(c.input).output);
    const scorecard = buildScorecard(cases, outputs);
    const report = formatScorecard(scorecard);
    // eslint-disable-next-line no-console
    console.log(report);

    expect(scorecard.totalCases).toBe(20);
    expect(scorecard.byCategory).toHaveLength(5);
    expect(scorecard.wordCorrectionRate).toBeGreaterThanOrEqual(0);
    expect(scorecard.wordCorrectionRate).toBeLessThanOrEqual(1);
    expect(scorecard.wrongUrduSpellingRate).toBeGreaterThanOrEqual(0);
    expect(scorecard.unjustifiedLatinLeakageRate).toBeGreaterThanOrEqual(0);
    expect(scorecard.protectedTokenFailureCount).toBeGreaterThanOrEqual(0);
    expect(scorecard.englishSafetyViolations).toBeGreaterThanOrEqual(0);
  });
});
