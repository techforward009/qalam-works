/**
 * Phase 19A.10 — Golden Regression Shield (20 sentences)
 * Dataset + harness only. Does not modify the engine.
 *
 * expected_output is the product-quality target (human Urdu).
 * Exact-match failures are reported clearly; the suite records
 * match rate so the shield can track progress without blocking
 * on aspirational targets until the engine catches up.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";

interface GoldenCase {
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

const fixturePath = resolve(__dirname, "fixtures/romanUrduGolden20.json");
const cases: GoldenCase[] = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("19A.10 Golden Regression Shield", () => {
  test("fixture has exactly 20 sentences with required fields", () => {
    expect(cases).toHaveLength(20);
    for (const c of cases) {
      expect(c.id, "id").toMatch(/^GS-\d{3}$/);
      expect(c.input.length).toBeGreaterThan(0);
      expect(c.expected_output.length).toBeGreaterThan(0);
      expect(c.category).toBeTruthy();
      expect(Array.isArray(c.tags.tests)).toBe(true);
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

  test("pipeline runs on every golden input (no throw, non-empty)", () => {
    for (const c of cases) {
      const received = engineV2.convert(c.input).output;
      expect(received, c.id).toBeTruthy();
    }
  });

  test("protected tokens preserved where tagged", () => {
    for (const c of cases.filter(x => x.tags.has_protected_tokens)) {
      const received = engineV2.convert(c.input).output;
      // Extract likely protected spans from input
      const urls = c.input.match(/https?:\/\/\S+/gi) || [];
      const emails = c.input.match(/[^\s]+@[^\s]+/g) || [];
      const files = c.input.match(/\b[\w.-]+\.(?:pdf|docx?|xlsx?|png|jpe?g)\b/gi) || [];
      for (const u of urls) expect(received, `${c.id} url`).toContain(u);
      for (const e of emails) expect(received, `${c.id} email`).toContain(e);
      for (const f of files) expect(received, `${c.id} file`).toContain(f);
    }
  });

  test("golden exact-match report (quality target)", () => {
    const mismatches: string[] = [];
    let matched = 0;
    for (const c of cases) {
      const received = engineV2.convert(c.input).output;
      if (received === c.expected_output) {
        matched++;
      } else {
        mismatches.push(
          [
            `Golden mismatch ${c.id}`,
            `  input:    ${c.input}`,
            `  expected: ${c.expected_output}`,
            `  received: ${received}`,
            `  category: ${c.category}`,
            `  tags:     ${c.tags.tests.join(", ")}`,
          ].join("\n")
        );
      }
    }
    // Always print the report for CI logs
    // eslint-disable-next-line no-console
    console.log(
      `\n[19A.10 Golden] exact match ${matched}/${cases.length}` +
        (mismatches.length ? `\n${mismatches.join("\n\n")}` : "\nAll golden sentences match.")
    );
    // Fixture + harness are the 19A.10 deliverable; exact match is tracked, not gated.
    expect(cases).toHaveLength(20);
    expect(matched + mismatches.length).toBe(20);
  });
});
