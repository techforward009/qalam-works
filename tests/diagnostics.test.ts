/**
 * Phase 19A.0g — Diagnostic Utility Tests
 * Tests tokenization, edit distance, WER, CER, leakage detection.
 * Does NOT modify the engine.
 */

import {
  tokenize, tokenEditCounts, wer, charEditDistance, cer,
  isRomanLeakage, destructiveType, diagnoseExample, buildDiagnosticReport,
} from "../app/tools/roman-urdu-writer/utils/diagnostics";

// ── Tokenizer ─────────────────────────────────────────────────────────────────
describe("tokenize", () => {
  test("splits on whitespace", () => expect(tokenize("a b c")).toEqual(["a", "b", "c"]));
  test("handles multiple spaces", () => expect(tokenize("a  b")).toEqual(["a", "b"]));
  test("trims leading/trailing", () => expect(tokenize("  a  ")).toEqual(["a"]));
  test("preserves punctuation attached to tokens", () => expect(tokenize("یہ!")).toEqual(["یہ!"]));
  test("returns empty for blank string", () => expect(tokenize("   ")).toEqual([]));
});

// ── Edit counts ───────────────────────────────────────────────────────────────
describe("tokenEditCounts", () => {
  test("identical sequences → 0 errors", () => {
    const r = tokenEditCounts(["a","b","c"], ["a","b","c"]);
    expect(r.correct).toBe(3); expect(r.substitutions).toBe(0);
    expect(r.insertions).toBe(0); expect(r.deletions).toBe(0);
  });
  test("one substitution", () => {
    const r = tokenEditCounts(["a","b","c"], ["a","x","c"]);
    expect(r.substitutions).toBe(1); expect(r.correct).toBe(2);
  });
  test("one insertion", () => {
    const r = tokenEditCounts(["a","b"], ["a","x","b"]);
    expect(r.insertions).toBe(1);
  });
  test("one deletion", () => {
    const r = tokenEditCounts(["a","b","c"], ["a","c"]);
    expect(r.deletions).toBe(1);
  });
  test("empty reference", () => {
    const r = tokenEditCounts([], ["a","b"]);
    expect(r.insertions).toBe(2); expect(r.correct).toBe(0);
  });
  test("empty hypothesis", () => {
    const r = tokenEditCounts(["a","b"], []);
    expect(r.deletions).toBe(2); expect(r.correct).toBe(0);
  });
  test("refTokens and hypTokens are recorded", () => {
    const r = tokenEditCounts(["a","b","c"], ["a","b"]);
    expect(r.refTokens).toBe(3); expect(r.hypTokens).toBe(2);
  });
});

// ── WER ───────────────────────────────────────────────────────────────────────
describe("wer", () => {
  test("perfect → 0.0", () => expect(wer({ refTokens:3, hypTokens:3, correct:3, substitutions:0, insertions:0, deletions:0 })).toBe(0));
  test("one sub in 4 → 0.25", () => expect(wer({ refTokens:4, hypTokens:4, correct:3, substitutions:1, insertions:0, deletions:0 })).toBeCloseTo(0.25));
  test("empty ref → 0", () => expect(wer({ refTokens:0, hypTokens:1, correct:0, substitutions:0, insertions:1, deletions:0 })).toBe(0));
  test("all deleted → 1.0", () => expect(wer({ refTokens:3, hypTokens:0, correct:0, substitutions:0, insertions:0, deletions:3 })).toBe(1.0));
});

// ── CER ───────────────────────────────────────────────────────────────────────
describe("cer / charEditDistance", () => {
  test("identical strings → 0", () => expect(charEditDistance("abc", "abc")).toBe(0));
  test("one char sub", () => expect(charEditDistance("abc", "axc")).toBe(1));
  test("one char insert", () => expect(charEditDistance("ab", "axb")).toBe(1));
  test("one char delete", () => expect(charEditDistance("abc", "ac")).toBe(1));
  test("empty ref → all inserts", () => expect(charEditDistance("", "abc")).toBe(3));
  test("CER = distance/refLen", () => expect(cer("abc", "axc")).toBeCloseTo(1/3));
  test("CER perfect → 0", () => expect(cer("یہ ہے", "یہ ہے")).toBe(0));
  test("empty ref → CER 0", () => expect(cer("", "abc")).toBe(0));
});

// ── Roman leakage ─────────────────────────────────────────────────────────────
describe("isRomanLeakage", () => {
  const noProtect = new Set<string>();
  test("ASCII hyp, Urdu ref, no protection → leakage", () =>
    expect(isRomanLeakage("gaya", "گیا", noProtect)).toBe(true));
  test("Urdu hyp → not leakage", () =>
    expect(isRomanLeakage("گیا", "گیا", noProtect)).toBe(false));
  test("protected token → not leakage", () =>
    expect(isRomanLeakage("Zoom", "گیا", new Set(["Zoom"]))).toBe(false));
  test("ASCII ref → not leakage (ref was also Roman)", () =>
    expect(isRomanLeakage("abc", "abc", noProtect)).toBe(false));
});

// ── Destructive transliteration ───────────────────────────────────────────────
describe("destructiveType", () => {
  const noProtect = new Set<string>();
  test("Urdu hyp, protected ASCII ref → 'protected'", () =>
    expect(destructiveType("زوم", "Zoom", new Set(["Zoom"]))).toBe("protected"));
  test("Urdu hyp, Title Case ref → 'proper-name'", () =>
    expect(destructiveType("عمر", "Omar", noProtect)).toBe("proper-name"));
  test("Urdu hyp, lower ASCII ref → 'english'", () =>
    expect(destructiveType("آفس", "office", noProtect)).toBe("english"));
  test("no conversion → null", () =>
    expect(destructiveType("گیا", "گیا", noProtect)).toBeNull());
  test("Roman hyp from Urdu ref → null (not destructive)", () =>
    expect(destructiveType("gaya", "گیا", noProtect)).toBeNull());
});

// ── diagnoseExample ───────────────────────────────────────────────────────────
describe("diagnoseExample", () => {
  test("perfect match → severity='perfect', wrongTokenCount=0", () => {
    const d = diagnoseExample("t1","everyday","aaj","آج","آج");
    expect(d.exactMatch).toBe(true);
    expect(d.wrongTokenCount).toBe(0);
    expect(d.severity).toBe("perfect");
    expect(d.wordErrorRate).toBe(0);
    expect(d.romanLeakageTokens).toHaveLength(0);
  });

  test("one wrong token → severity='minor'", () => {
    const d = diagnoseExample("t2","everyday","aaj theek hai","آج ٹھیک ہے","آج theek ہے");
    expect(d.severity).toBe("minor");
    expect(d.wrongTokenCount).toBe(1);
    expect(d.romanLeakageTokens).toContain("theek");
  });

  test("protected token not counted as leakage", () => {
    const d = diagnoseExample("t3","mixed","Zoom meeting","Zoom meeting","Zoom meeting",["Zoom","meeting"]);
    expect(d.romanLeakageTokens).toHaveLength(0);
  });

  test("Roman passthrough where Urdu expected → leakage", () => {
    const d = diagnoseExample("t4","everyday","ghar gaya","گھر گیا","ghar گیا");
    expect(d.romanLeakageTokens).toContain("ghar");
  });

  test("severity severe for 4+ wrong tokens", () => {
    const d = diagnoseExample("t5","everyday",
      "a b c d e f", "آ بی سی ڈی ای ایف", "a b c d e f");
    expect(d.severity).toBe("severe");
  });
});

// ── buildDiagnosticReport ─────────────────────────────────────────────────────
describe("buildDiagnosticReport", () => {
  const examples = [
    { id:"e1", category:"everyday", input:"aaj", expected:"آج", actual:"آج" },
    { id:"e2", category:"everyday", input:"kal ghar", expected:"کل گھر", actual:"کل ghar" },
    { id:"e3", category:"mixed", input:"Zoom meeting", expected:"Zoom meeting", actual:"Zoom meeting", protectedTokens:["Zoom","meeting"] },
  ];

  const report = buildDiagnosticReport("test", examples);

  test("total examples = 3", () => expect(report.totalExamples).toBe(3));
  test("exact sentence accuracy = 2/3", () => expect(report.exactSentenceAccuracy).toBeCloseTo(2/3));
  test("one minor failure (e2)", () => expect(report.minorFailures).toBe(1));
  test("Roman leakage detected in e2", () => expect(report.romanLeakageTokenCount).toBeGreaterThan(0));
  test("no leakage for protected tokens in e3", () => {
    const e3diag = report.examples.find(d => d.id === "e3")!;
    expect(e3diag.romanLeakageTokens).toHaveLength(0);
  });
  test("perCategory has everyday and mixed", () => {
    const cats = report.perCategory.map(c => c.category);
    expect(cats).toContain("everyday");
    expect(cats).toContain("mixed");
  });
});
