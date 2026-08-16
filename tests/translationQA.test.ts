// Batch 17B.2 — Translation QA tests (full spec-compliant matrix)

import { runSegmentQA, runProjectQA } from "../app/tools/translation-studio/utils/translationQA";
import type { TranslationSegment } from "../app/tools/translation-studio/utils/translationTypes";
import { makeSegmentId, segmentFingerprint } from "../app/tools/translation-studio/utils/segmentation";

function seg(overrides: Partial<TranslationSegment> & { source: string }): TranslationSegment {
  const { source, ...rest } = overrides;
  return {
    id: makeSegmentId(1), order: 1, source, target: "", sourceDir: "ltr", targetDir: "ltr",
    status: "untranslated", sourceFingerprint: segmentFingerprint(source),
    reviewStatus: "unreviewed" as const, reviewNote: "", reviewedTargetFingerprint: "",
    ...rest,
  };
}

// ── CRITICAL ──────────────────────────────────────────────────────────────────

describe("CRITICAL: empty Final", () => {
  test("Final + empty target → FINAL_TARGET_EMPTY critical", () => {
    const issues = runSegmentQA(seg({ source: "Test.", status: "final", target: "" }), "en", "ur");
    expect(issues.some(i => i.code === "FINAL_TARGET_EMPTY" && i.severity === "critical")).toBe(true);
  });
  test("Draft + empty target → no FINAL_TARGET_EMPTY", () => {
    expect(runSegmentQA(seg({ source: "Test.", status: "draft", target: "" }), "en", "ur").some(i => i.code === "FINAL_TARGET_EMPTY")).toBe(false);
  });
});

// ── Unicode digit normalisation ───────────────────────────────────────────────

describe("Unicode digit normalisation", () => {
  test("A: 2026 ↔ ۲۰۲۶ → no number mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Year 2026", target: "سال ۲۰۲۶", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("B: 2026 ↔ ٢٠٢٦ → no number mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Year 2026", target: "سال ٢٠٢٦", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("C: 1,250 ↔ ۱٬۲۵۰ → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Cost 1,250", target: "لاگت ۱٬۲۵۰", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("D: 3.5 ↔ ۳٫۵ → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "3.5 hours", target: "۳٫۵ گھنٹے", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("E: 18 ↔ 19 → NUMBER_MISMATCH", () => {
    const issues = runSegmentQA(seg({ source: "18 districts", target: "19 اضلاع", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(true);
  });
  test("F: 12 and 12 ↔ 12 → mismatch (multiplicity)", () => {
    const issues = runSegmentQA(seg({ source: "12 and 12", target: "12", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(true);
  });
  test("G: date 2026-08-16 ↔ 16/08/2026 → NO mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Date 2026-08-16", target: "16/08/2026", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("H: date 2026-08-16 ↔ 16 اگست 2026 (textual month) → NO number mismatch", () => {
    // Per spec §8 fix: textual-month dates are masked so month→text swap
    // does NOT produce a number mismatch.
    const issues = runSegmentQA(seg({ source: "Date 2026-08-16", target: "تاریخ 16 اگست 2026", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("H-change-day: textual month but changed day → NUMBER_MISMATCH", () => {
    const issues = runSegmentQA(seg({ source: "Date 2026-08-16", target: "17 اگست 2026", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(true);
  });
  test("H-change-year: textual month but changed year → NUMBER_MISMATCH", () => {
    const issues = runSegmentQA(seg({ source: "Date 2026-08-16", target: "16 اگست 2025", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(true);
  });
});

// ── Percentage ────────────────────────────────────────────────────────────────

describe("Percentage integrity", () => {
  test("75% ↔ ۷۵٪ → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Reached 75%", target: "پہنچا ۷۵٪", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "PERCENTAGE_MISMATCH" || i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("75% ↔ 75 فیصد → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Reached 75%", target: "75 فیصد تک پہنچا", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "PERCENTAGE_MISMATCH")).toBe(false);
  });
  test("75% ↔ ٧٥ بالمئة → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Growth 75%", target: "نمو ٧٥ بالمئة", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "PERCENTAGE_MISMATCH")).toBe(false);
  });
  test("75% ↔ 75 درصد → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "75% complete", target: "75 درصد مکمل", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "PERCENTAGE_MISMATCH")).toBe(false);
  });
  test("75% ↔ 57٪ → PERCENTAGE_MISMATCH only, not NUMBER_MISMATCH", () => {
    const issues = runSegmentQA(seg({ source: "Reached 75%", target: "57٪ ہوا", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "PERCENTAGE_MISMATCH")).toBe(true);
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
});

// ── References ────────────────────────────────────────────────────────────────

describe("Reference marker integrity", () => {
  test("[12] ↔ [۱۲] → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "See [12]", target: "دیکھیں [۱۲]", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "REFERENCE_MISMATCH" || i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("[12] ↔ [21] → REFERENCE_MISMATCH only", () => {
    const issues = runSegmentQA(seg({ source: "See [12]", target: "دیکھیں [21]", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "REFERENCE_MISMATCH")).toBe(true);
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("(3) ↔ (۳) → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Note (3)", target: "نوٹ (۳)", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "REFERENCE_MISMATCH" || i.code === "NUMBER_MISMATCH")).toBe(false);
  });
});

// ── Bracket structure ─────────────────────────────────────────────────────────

describe("Bracket structure", () => {
  test("balanced () both sides → no finding", () => {
    const issues = runSegmentQA(seg({ source: "Use (draft) text.", target: "متن (مسودہ) استعمال کریں۔", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code.startsWith("BRACKET"))).toBe(false);
  });
  test("missing close → BRACKET_UNBALANCED warning", () => {
    const issues = runSegmentQA(seg({ source: "Use (draft) text.", target: "متن (مسودہ استعمال کریں۔", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "BRACKET_UNBALANCED" && i.severity === "warning")).toBe(true);
  });
  test("([text]) → balanced", () => {
    const issues = runSegmentQA(seg({ source: "([text])", target: "([متن])", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "BRACKET_UNBALANCED")).toBe(false);
  });
  test("([text)] → BRACKET_UNBALANCED", () => {
    const issues = runSegmentQA(seg({ source: "([text])", target: "([متن)]", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "BRACKET_UNBALANCED")).toBe(true);
  });
  test("source 1 pair / target 0 pairs (balanced) → BRACKET_COUNT_DIFFERS info", () => {
    const issues = runSegmentQA(seg({ source: "Use (draft) text.", target: "متن استعمال کریں۔", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "BRACKET_COUNT_DIFFERS" && i.severity === "info")).toBe(true);
  });
});

// ── Quote structure ───────────────────────────────────────────────────────────

describe("Quote structure", () => {
  test('"hello" ↔ «ہیلو» → equivalent spans, no finding', () => {
    const issues = runSegmentQA(seg({ source: 'He said, "hello".', target: "اس نے کہا، «ہیلو»۔", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code.startsWith("QUOTE"))).toBe(false);
  });
  test("missing closing quote → QUOTE_UNBALANCED", () => {
    const issues = runSegmentQA(seg({ source: 'He said, "hello".', target: 'اس نے کہا، «ہیلو', status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "QUOTE_UNBALANCED")).toBe(true);
  });
  test("apostrophes don't trigger quote findings", () => {
    const issues = runSegmentQA(seg({ source: "Don't stop.", target: "مت رکو۔", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code.startsWith("QUOTE"))).toBe(false);
  });
});

// ── Identical source/target ───────────────────────────────────────────────────

describe("Identical source/target (SOURCE_TARGET_IDENTICAL)", () => {
  test("cross-language long identical sentence → info", () => {
    const s = "This sentence was not translated at all.";
    const issues = runSegmentQA(seg({ source: s, target: s, status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "SOURCE_TARGET_IDENTICAL" && i.severity === "info")).toBe(true);
  });
  test("short word OpenAI → no finding (below threshold)", () => {
    const issues = runSegmentQA(seg({ source: "OpenAI", target: "OpenAI", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "SOURCE_TARGET_IDENTICAL")).toBe(false);
  });
  test("URL → no finding", () => {
    const s = "https://example.com";
    const issues = runSegmentQA(seg({ source: s, target: s, status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "SOURCE_TARGET_IDENTICAL")).toBe(false);
  });
  test("same-language project → no finding", () => {
    const s = "This sentence was not translated at all.";
    const issues = runSegmentQA(seg({ source: s, target: s, status: "draft" }), "en", "en");
    expect(issues.some(i => i.code === "SOURCE_TARGET_IDENTICAL")).toBe(false);
  });
});

// ── No warnings for empty target ─────────────────────────────────────────────

describe("untranslated segments: no warnings", () => {
  test("numbers/refs in source, empty target → no warnings (only FINAL_TARGET_EMPTY on Final)", () => {
    const issues = runSegmentQA(seg({ source: "Page 42, see [1].", target: "", status: "untranslated" }), "en", "ur");
    expect(issues.filter(i => i.severity === "warning")).toHaveLength(0);
  });
});

// ── Project aggregation ───────────────────────────────────────────────────────

describe("runProjectQA aggregation", () => {
  test("1 number, 1 percentage, 1 identical, 2 untranslated → total=3 untranslated=2, no glossary/conflict in count", () => {
    const segs: TranslationSegment[] = [
      seg({ id: makeSegmentId(1), order: 1, source: "18 districts", target: "19 اضلاع", status: "draft" }),
      seg({ id: makeSegmentId(2), order: 2, source: "Reached 75%", target: "57٪ ہوا", status: "draft" }),
      seg({ id: makeSegmentId(3), order: 3, source: "This sentence was not translated at all.", target: "This sentence was not translated at all.", status: "draft" }),
      seg({ id: makeSegmentId(4), order: 4, source: "Untranslated 1", target: "", status: "untranslated" }),
      seg({ id: makeSegmentId(5), order: 5, source: "Untranslated 2", target: "", status: "untranslated" }),
    ];
    const summary = runProjectQA(segs, "en", "ur");
    expect(summary.total).toBe(3);
    expect(summary.untranslatedCount).toBe(2);
  });
});

// ── Immutability ──────────────────────────────────────────────────────────────

describe("Immutability", () => {
  test("QA helpers do not mutate source, target, or segment", () => {
    const origSrc = "Page 42, cost 1,250. See [1]. Reached 75%. He said \"hello\". (note)";
    const origTgt = "صفحہ 42، لاگت 1٬250. دیکھیں [1]. 57٪ ہوا. اس نے کہا «ہیلو». (نوٹ)";
    const s = seg({ source: origSrc, target: origTgt, status: "draft" });
    const origSeg = { ...s };
    runSegmentQA(s, "en", "ur");
    expect(s.source).toBe(origSrc);
    expect(s.target).toBe(origTgt);
    expect(s.status).toBe("draft");
    expect(s.source).toBe(origSeg.source);
  });
});

// ── New 17B.2.1 regressions ───────────────────────────────────────────────────

describe("Reference does not also cause bracket-count finding", () => {
  test("[12] missing from target → REFERENCE_MISMATCH only, not BRACKET_COUNT_DIFFERS", () => {
    const issues = runSegmentQA(seg({ source: "See [12].", target: "حوالہ موجود نہیں۔", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "REFERENCE_MISMATCH")).toBe(true);
    expect(issues.some(i => i.code === "BRACKET_COUNT_DIFFERS")).toBe(false);
  });
});

describe("Mixed quote-style → unbalanced", () => {
  test('"text» → QUOTE_UNBALANCED (mismatched pair)', () => {
    const issues = runSegmentQA(seg({ source: '"hello"', target: '"ہیلو»', status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "QUOTE_UNBALANCED")).toBe(true);
  });
  test('«text" → QUOTE_UNBALANCED', () => {
    const issues = runSegmentQA(seg({ source: '"hello"', target: '«ہیلو"', status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "QUOTE_UNBALANCED")).toBe(true);
  });
  test('"text" → balanced (ASCII pair)', () => {
    const issues = runSegmentQA(seg({ source: '"hello"', target: '"ہیلو"', status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "QUOTE_UNBALANCED")).toBe(false);
  });
  test('«text» → balanced (guillemet pair)', () => {
    const issues = runSegmentQA(seg({ source: '"hello"', target: '«ہیلو»', status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "QUOTE_UNBALANCED")).toBe(false);
  });
});

describe("Decimal percentages", () => {
  test("3.5% ↔ ۳٫۵٪ → no mismatch", () => {
    const issues = runSegmentQA(seg({ source: "Rate 3.5%", target: "شرح ۳٫۵٪", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "PERCENTAGE_MISMATCH" || i.code === "NUMBER_MISMATCH")).toBe(false);
  });
  test("3.5% ↔ ۳٫۶٪ → PERCENTAGE_MISMATCH only (not NUMBER_MISMATCH)", () => {
    const issues = runSegmentQA(seg({ source: "Rate 3.5%", target: "شرح ۳٫۶٪", status: "draft" }), "en", "ur");
    expect(issues.some(i => i.code === "PERCENTAGE_MISMATCH")).toBe(true);
    expect(issues.some(i => i.code === "NUMBER_MISMATCH")).toBe(false);
  });
});
