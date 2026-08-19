
import { describe, test, expect } from "vitest";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";
const n = normalizeUrduProsePunctuation;
describe("normalizeUrduProsePunctuation", () => {
  test("Urdu comma and question", () => expect(n("یہ ٹھیک ہے, واقعی?")).toBe("یہ ٹھیک ہے، واقعی؟"));
  test("Urdu semicolon and period", () => expect(n("یہ درست ہے; شاید.")).toBe("یہ درست ہے؛ شاید۔"));
  test("mixed Hello keeps English comma", () => expect(n("Hello, دنیا ٹھیک ہے?")).toBe("Hello, دنیا ٹھیک ہے؟"));
  test("Urdu comma then English clause keeps English ?", () => expect(n("یہ ٹھیک ہے, but status ok?")).toBe("یہ ٹھیک ہے، but status ok?"));
  test("status ok ہے? converts terminal ?", () => expect(n("status ok ہے?")).toBe("status ok ہے؟"));
  test("Version 3.14. unchanged", () => expect(n("Version 3.14.")).toBe("Version 3.14."));
  test("decimal and thousands preserved", () => expect(n("قیمت 3,500.75 ہے.")).toBe("قیمت 3,500.75 ہے۔"));
  test("filename preserved", () => expect(n("فائل report.pdf ہے.")).toBe("فائل report.pdf ہے۔"));
  test("URL unchanged", () => expect(n("لنک https://example.com/a,b?x=1 ہے.")).toContain("https://example.com/a,b?x=1"));
  test("email unchanged", () => expect(n("ای میل test@example.com ہے.")).toContain("test@example.com"));
});
