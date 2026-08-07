import { checkTextQuality } from "../app/utils/quality/checkTextQuality";

describe("checkTextQuality — quote detection", () => {
  // Regression test for a real bug (reported 2026-08-07): a document
  // missing its opening curly quote (”) showed "no notable issues" in the
  // audit — the existing wrongQuotes check only counted straight ASCII
  // quotes, so a curly quote with no matching pair went completely
  // unnoticed regardless of whether it was actually balanced.
  test("flags an unmatched closing curly double-quote with no opening pair", () => {
    const text =
      "چنانچہ حیاء  العلوم میں ہے:\nقال ابن مسعود رضی الله عنه: لیس العلم بکثرة الروایة، انماالعلم نوریقذف فی القلب\u201D";
    const result = checkTextQuality(text);
    expect(result.punctuation.wrongQuotes).toBe(1);
  });

  test("does not flag properly balanced curly double-quotes", () => {
    const result = checkTextQuality("اس نے کہا \u201Cسب ٹھیک ہے\u201D");
    expect(result.punctuation.wrongQuotes).toBe(0);
  });

  test("does not flag ordinary apostrophe use (single curly quote) as unmatched", () => {
    const result = checkTextQuality("don\u2019t worry, it\u2019s fine");
    expect(result.punctuation.wrongQuotes).toBe(0);
  });

  test("still flags straight ASCII quotes as before (no regression)", () => {
    const result = checkTextQuality('he said "hello"');
    expect(result.punctuation.wrongQuotes).toBe(2);
  });

  test("counts straight quotes and unmatched curly quotes together", () => {
    const result = checkTextQuality('he said "hello\u201D');
    expect(result.punctuation.wrongQuotes).toBe(2); // 1 straight + 1 unmatched curly
  });
});

describe("checkTextQuality — duplicated punctuation", () => {
  // Broader follow-up to the quote fix (reported 2026-08-07): not just
  // inverted commas — ANY punctuation mark repeated 2+ times in a row
  // ("؟؟", "!!", "۔۔", "،،") should be flagged, in any script.
  test("flags each duplicated punctuation mark", () => {
    const result = checkTextQuality("کیا یہ ٹھیک ہے؟؟ بالکل!! ہاں،، درست۔۔");
    expect(result.punctuation.duplicatedPunctuation).toBe(4);
  });

  test("does not flag single (correct) punctuation marks", () => {
    const result = checkTextQuality("کیا یہ ٹھیک ہے؟ بالکل! ہاں، درست۔");
    expect(result.punctuation.duplicatedPunctuation).toBe(0);
  });

  test("does not double-count quote characters (they have their own check)", () => {
    const result = checkTextQuality('he said ""hello""');
    expect(result.punctuation.duplicatedPunctuation).toBe(0);
  });
});
