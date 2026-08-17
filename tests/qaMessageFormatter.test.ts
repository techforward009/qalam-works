// Focused tests for the presentation-layer QA message formatter.
// Verifies EN pass-through, UR localisation, dynamic value preservation,
// and safe fallback for unknown future codes.
// Does NOT test QA logic — translationQA.ts is untouched.

import { formatQAMessage } from "../app/tools/translation-studio/utils/qaMessageFormatter";
import type { QAIssue } from "../app/tools/translation-studio/utils/translationQA";

function issue(
  code: string,
  message: string,
  severity: "critical" | "warning" | "info" = "warning"
): QAIssue {
  return { code, message, severity };
}

// ── EN pass-through ───────────────────────────────────────────────────────────

describe("formatQAMessage — EN (isUr=false / undefined)", () => {
  const codes: [string, string][] = [
    ["FINAL_TARGET_EMPTY",       "Final segment has empty target"],
    ["PERCENTAGE_MISMATCH",       "Source has percentage [50%], target has [60%]"],
    ["REFERENCE_MISMATCH",        "Source has reference [§3], target has [§4]"],
    ["NUMBER_MISMATCH",           "Source has numbers [1, 2], target has [3]"],
    ["BRACKET_UNBALANCED",        "Target has unbalanced brackets"],
    ["BRACKET_COUNT_DIFFERS",     "Bracket pairs differ: source 2, target 1"],
    ["QUOTE_UNBALANCED",          "Target has unbalanced quotation marks"],
    ["QUOTE_COUNT_DIFFERS",       "Quote pairs differ: source 1, target 0"],
    ["SOURCE_TARGET_IDENTICAL",   "Source and target are identical — verify this is intentional"],
    ["UNKNOWN_FUTURE_CODE",       "Some future message"],
  ];

  for (const [code, msg] of codes) {
    test(`${code}: returns original message unchanged`, () => {
      expect(formatQAMessage(issue(code, msg), false)).toBe(msg);
      expect(formatQAMessage(issue(code, msg), undefined)).toBe(msg);
    });
  }
});

// ── UR localisation ───────────────────────────────────────────────────────────

describe("formatQAMessage — UR (isUr=true)", () => {
  test("FINAL_TARGET_EMPTY returns Urdu message", () => {
    const result = formatQAMessage(issue("FINAL_TARGET_EMPTY", "Final segment has empty target"), true);
    expect(result).toBe("سیگمنٹ حتمی ہے لیکن ہدف متن خالی ہے");
    expect(result).not.toContain("Final");
  });

  test("PERCENTAGE_MISMATCH preserves numeric percentage values in Urdu", () => {
    const msg = "Source has percentage [25%], target has [30%]";
    const result = formatQAMessage(issue("PERCENTAGE_MISMATCH", msg), true);
    expect(result).toContain("25%");
    expect(result).toContain("30%");
    expect(result).not.toMatch(/^Source/);
    expect(result).toContain("فیصد");
  });

  test("PERCENTAGE_MISMATCH preserves different numeric values", () => {
    const msg = "Source has percentage [100%], target has [99.5%]";
    const result = formatQAMessage(issue("PERCENTAGE_MISMATCH", msg), true);
    expect(result).toContain("100%");
    expect(result).toContain("99.5%");
  });

  test("REFERENCE_MISMATCH preserves reference tokens in Urdu", () => {
    const msg = "Source has reference [§3.1], target has [§4]";
    const result = formatQAMessage(issue("REFERENCE_MISMATCH", msg), true);
    expect(result).toContain("§3.1");
    expect(result).toContain("§4");
    expect(result).not.toMatch(/^Source/);
  });

  test("NUMBER_MISMATCH preserves number lists in Urdu", () => {
    const msg = "Source has numbers [1, 2, 3], target has [1, 2]";
    const result = formatQAMessage(issue("NUMBER_MISMATCH", msg), true);
    expect(result).toContain("1, 2, 3");
    expect(result).toContain("1, 2");
    expect(result).not.toMatch(/^Source/);
    expect(result).toContain("اعداد");
  });

  test("BRACKET_UNBALANCED returns Urdu message without dynamic values", () => {
    const result = formatQAMessage(issue("BRACKET_UNBALANCED", "Target has unbalanced brackets"), true);
    expect(result).toBe("ہدف متن میں قوسین کا توازن درست نہیں");
    expect(result).not.toContain("Target");
  });

  test("BRACKET_COUNT_DIFFERS preserves source and target bracket counts", () => {
    const msg = "Bracket pairs differ: source 3, target 1";
    const result = formatQAMessage(issue("BRACKET_COUNT_DIFFERS", msg), true);
    expect(result).toContain("3");
    expect(result).toContain("1");
    expect(result).not.toMatch(/^Bracket/);
    expect(result).toContain("قوسین");
  });

  test("QUOTE_UNBALANCED returns Urdu message", () => {
    const result = formatQAMessage(issue("QUOTE_UNBALANCED", "Target has unbalanced quotation marks"), true);
    expect(result).toBe("ہدف متن میں اقتباس کے نشانات کا توازن درست نہیں");
    expect(result).not.toContain("Target");
  });

  test("QUOTE_COUNT_DIFFERS preserves quote counts in Urdu", () => {
    const msg = "Quote pairs differ: source 2, target 0";
    const result = formatQAMessage(issue("QUOTE_COUNT_DIFFERS", msg), true);
    expect(result).toContain("2");
    expect(result).toContain("0");
    expect(result).not.toMatch(/^Quote/);
    expect(result).toContain("اقتباس");
  });

  test("SOURCE_TARGET_IDENTICAL returns Urdu message", () => {
    const result = formatQAMessage(
      issue("SOURCE_TARGET_IDENTICAL", "Source and target are identical — verify this is intentional"),
      true
    );
    expect(result).toContain("ایک جیسے");
    expect(result).not.toMatch(/^Source/);
  });

  test("Unknown future code falls back to original English message in UR mode", () => {
    const original = "Some future deterministic check failed";
    const result = formatQAMessage(issue("UNKNOWN_FUTURE_CODE_XYZ", original), true);
    expect(result).toBe(original);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("formatQAMessage — edge cases", () => {
  test("PERCENTAGE_MISMATCH with missing bracket content gracefully returns Urdu string", () => {
    // Message without expected bracket format — should not throw
    const result = formatQAMessage(issue("PERCENTAGE_MISMATCH", "malformed message"), true);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("BRACKET_COUNT_DIFFERS with no numbers gracefully returns Urdu string", () => {
    const result = formatQAMessage(issue("BRACKET_COUNT_DIFFERS", "no numbers here"), true);
    expect(typeof result).toBe("string");
    expect(result).toContain("قوسین");
  });

  test("same issue code returns identical result across multiple calls (deterministic)", () => {
    const iss = issue("FINAL_TARGET_EMPTY", "Final segment has empty target");
    expect(formatQAMessage(iss, true)).toBe(formatQAMessage(iss, true));
    expect(formatQAMessage(iss, false)).toBe(formatQAMessage(iss, false));
  });

  test("severity field is not used by formatter (only code and message matter)", () => {
    const base = "Final segment has empty target";
    expect(formatQAMessage(issue("FINAL_TARGET_EMPTY", base, "critical"), true))
      .toBe(formatQAMessage(issue("FINAL_TARGET_EMPTY", base, "info"), true));
  });
});
