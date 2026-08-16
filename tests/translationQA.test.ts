// Batch 17B.2 — Translation QA tests

import { runSegmentQA, runProjectQA } from "../app/tools/translation-studio/utils/translationQA";
import type { TranslationSegment } from "../app/tools/translation-studio/utils/translationTypes";
import { makeSegmentId, segmentFingerprint } from "../app/tools/translation-studio/utils/segmentation";

function seg(overrides: Partial<TranslationSegment> & { source: string }): TranslationSegment {
  const { source, ...rest } = overrides;
  return {
    id: makeSegmentId(1), order: 1, source, target: "", sourceDir: "ltr", targetDir: "ltr",
    status: "untranslated", sourceFingerprint: segmentFingerprint(source), ...rest,
  };
}

const NO_GLOSSARY = [] as never;
const NO_CONFLICT = false;

// ── CRITICAL ─────────────────────────────────────────────────────────────────

describe("CRITICAL: empty Final segment", () => {
  test("Final with empty target → EMPTY_FINAL critical", () => {
    const issues = runSegmentQA(seg({ source: "Test.", status: "final", target: "" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "EMPTY_FINAL" && i.severity === "critical")).toBe(true);
  });

  test("Draft with empty target → no EMPTY_FINAL", () => {
    const issues = runSegmentQA(seg({ source: "Test.", status: "draft", target: "" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "EMPTY_FINAL")).toBe(false);
  });

  test("Final with non-empty target → no EMPTY_FINAL", () => {
    const issues = runSegmentQA(seg({ source: "Test.", status: "final", target: "ترجمہ" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "EMPTY_FINAL")).toBe(false);
  });
});

// ── Number mismatch ───────────────────────────────────────────────────────────

describe("WARNING: number mismatch", () => {
  test("number in source missing from target → NUMBER_MISMATCH", () => {
    const issues = runSegmentQA(seg({ source: "Page 42.", target: "صفحہ", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(true);
  });

  test("same number in both → no warning", () => {
    const issues = runSegmentQA(seg({ source: "Page 42.", target: "صفحہ 42", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });

  test("percentage preserved → no warning", () => {
    const issues = runSegmentQA(seg({ source: "Growth 12.5%.", target: "اضافہ 12.5%.", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });

  test("no numbers in source → no warning", () => {
    const issues = runSegmentQA(seg({ source: "Hello world.", target: "سلام دنیا", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
});

// ── Date mismatch ─────────────────────────────────────────────────────────────

describe("WARNING: date mismatch", () => {
  test("date in source missing from target → DATE_MISMATCH", () => {
    const issues = runSegmentQA(seg({ source: "Published 2026-08-16.", target: "شائع ہوا", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "DATE_MISMATCH")).toBe(true);
  });

  test("date preserved → no warning", () => {
    const issues = runSegmentQA(seg({ source: "Date: 2026-08-16.", target: "تاریخ: 2026-08-16", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "DATE_MISMATCH")).toBe(false);
  });
});

// ── Reference markers ─────────────────────────────────────────────────────────

describe("WARNING: reference marker missing", () => {
  test("[1] missing from target → REFERENCE_MISSING", () => {
    const issues = runSegmentQA(seg({ source: "See [1] for details.", target: "تفصیل دیکھیں", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "REFERENCE_MISSING")).toBe(true);
  });

  test("[1] preserved in target → no warning", () => {
    const issues = runSegmentQA(seg({ source: "See [1] for details.", target: "دیکھیں [1]", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "REFERENCE_MISSING")).toBe(false);
  });
});

// ── Bracket imbalance ─────────────────────────────────────────────────────────

describe("WARNING: bracket imbalance", () => {
  test("unbalanced '(' → BRACKET_IMBALANCE", () => {
    const issues = runSegmentQA(seg({ source: "Test (a) end.", target: "ٹیسٹ (الف", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "BRACKET_IMBALANCE")).toBe(true);
  });

  test("balanced '()' → no warning", () => {
    const issues = runSegmentQA(seg({ source: "Test (a).", target: "ٹیسٹ (الف).", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "BRACKET_IMBALANCE")).toBe(false);
  });
});

// ── Quote imbalance ───────────────────────────────────────────────────────────

describe("WARNING: quote imbalance", () => {
  test("odd number of \" in target → QUOTE_IMBALANCE", () => {
    const issues = runSegmentQA(seg({ source: 'Say "hello".', target: 'کہیں "ہیلو', status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "QUOTE_IMBALANCE")).toBe(true);
  });

  test("even number of \" → no warning", () => {
    const issues = runSegmentQA(seg({ source: 'Say "hello".', target: 'کہیں "ہیلو".', status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "QUOTE_IMBALANCE")).toBe(false);
  });
});

// ── Source = Target ───────────────────────────────────────────────────────────

describe("WARNING: suspicious source=target", () => {
  test("identical non-trivial target → SOURCE_EQUALS_TARGET", () => {
    const s = "This is a longer sentence for testing.";
    const issues = runSegmentQA(seg({ source: s, target: s, status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "SOURCE_EQUALS_TARGET")).toBe(true);
  });

  test("short identical text (≤10 chars) does not trigger", () => {
    const issues = runSegmentQA(seg({ source: "Yes", target: "Yes", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "SOURCE_EQUALS_TARGET")).toBe(false);
  });
});

// ── Duplicate spaces ──────────────────────────────────────────────────────────

describe("INFO: duplicate spaces", () => {
  test("double space in target → DUPLICATE_SPACES info", () => {
    const issues = runSegmentQA(seg({ source: "Test.", target: "ٹیسٹ  کریں", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "DUPLICATE_SPACES" && i.severity === "info")).toBe(true);
  });

  test("single spaces only → no info", () => {
    const issues = runSegmentQA(seg({ source: "Test.", target: "ٹیسٹ کریں", status: "draft" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.some(i => i.code === "DUPLICATE_SPACES")).toBe(false);
  });
});

// ── No issues for untranslated ────────────────────────────────────────────────

describe("untranslated segments generate no warnings", () => {
  test("empty target with numbers/refs in source → no warnings", () => {
    const issues = runSegmentQA(seg({ source: "Page 42, see [1].", target: "", status: "untranslated" }), NO_GLOSSARY, NO_CONFLICT);
    expect(issues.filter(i => i.severity === "warning")).toHaveLength(0);
  });
});

// ── Project-level QA summary ──────────────────────────────────────────────────

describe("runProjectQA summary", () => {
  test("project with one Final empty segment → critical:1", () => {
    const segments: TranslationSegment[] = [
      seg({ id: makeSegmentId(1), order: 1, source: "A.", target: "", status: "final" }),
      seg({ id: makeSegmentId(2), order: 2, source: "B.", target: "ب", status: "draft" }),
    ];
    const summary = runProjectQA(segments, [], new Map());
    expect(summary.critical).toBe(1);
    expect(summary.segmentIssues.has(makeSegmentId(1))).toBe(true);
  });

  test("clean project → total 0", () => {
    const segments: TranslationSegment[] = [
      seg({ id: makeSegmentId(1), order: 1, source: "Hello.", target: "سلام", status: "final" }),
    ];
    const summary = runProjectQA(segments, [], new Map());
    expect(summary.total).toBe(0);
  });
});
