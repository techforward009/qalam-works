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

describe("checkTextQuality — missing space after punctuation", () => {
  // Reported 2026-08-07: "(المتوفی:179ھ)نے" — a closing bracket and a
  // colon each immediately followed by the next word/number with no space.
  test("flags a missing space after a closing bracket and after a colon", () => {
    const result = checkTextQuality("اور حضرت امام مالک علیہ الرحمہ (المتوفی:179ھ)نے فرمایا");
    expect(result.typography.missingSpaceAfterPunctuation).toBe(2);
  });

  test("does not flag properly spaced punctuation", () => {
    const result = checkTextQuality("یہ ٹھیک ہے: درست طریقے سے۔ اور (یہ بھی) ٹھیک ہے۔");
    expect(result.typography.missingSpaceAfterPunctuation).toBe(0);
  });
});

describe("checkTextQuality — mixed Urdu/Arabic character forms (Advanced Quality Layer)", () => {
  // Reuses the exact same 5 characters app/utils/unicode/
  // standardizeUrduText.ts already normalizes (ي→ی, ى→ی, ك→ک, أ→ا, إ→ا) —
  // this is detection only, not correction.
  test("flags Arabic-form ي, ى, ك, أ, إ appearing in Urdu prose", () => {
    const result = checkTextQuality("علي اور موسى نے كتاب أور إحسان کے بارے میں بات کی۔");
    expect(result.textQuality.mixedUrduArabicForms).toBe(5);
  });

  test("does not flag ordinary Urdu forms (ی، ک، ا) of the same letters", () => {
    const result = checkTextQuality("علی اور موسیٰ نے کتاب اور احسان کے بارے میں بات کی۔");
    expect(result.textQuality.mixedUrduArabicForms).toBe(0);
  });

  test("does not flag Arabic-form letters inside {{ }} protected classical quotations", () => {
    const result = checkTextQuality("متن سے پہلے {{قال ابن مسعود: العلم نور}} اور متن کے بعد");
    expect(result.textQuality.mixedUrduArabicForms).toBe(0);
  });

  test("counts toward totalIssues", () => {
    const clean = checkTextQuality("علی ایک اچھا آدمی ہے۔");
    const withIssue = checkTextQuality("علي ایک اچھا آدمی ہے۔");
    expect(withIssue.totalIssues).toBe(clean.totalIssues + 1);
  });
});

describe("checkTextQuality — Advanced Typography Analyzer (space before punctuation)", () => {
  test("flags a space immediately before Urdu/Arabic comma", () => {
    const result = checkTextQuality("یہ ٹھیک ہے ، اور یہ بھی");
    expect(result.typography.spaceBeforePunctuation).toBe(1);
  });

  test("flags a space immediately before ASCII punctuation too", () => {
    const result = checkTextQuality("hello , world");
    expect(result.typography.spaceBeforePunctuation).toBe(1);
  });

  test("does not flag correctly-attached punctuation (no space before)", () => {
    const result = checkTextQuality("یہ ٹھیک ہے، اور یہ بھی۔");
    expect(result.typography.spaceBeforePunctuation).toBe(0);
  });
});

describe("checkTextQuality — Advanced Typography Analyzer (tatweel/kashida)", () => {
  test("flags tatweel (U+0640) characters", () => {
    const result = checkTextQuality("الحمـــد لله");
    expect(result.typography.tatweelCount).toBe(3);
  });

  test("clean text with no tatweel reports zero", () => {
    const result = checkTextQuality("الحمد لله");
    expect(result.typography.tatweelCount).toBe(0);
  });
});

describe("checkTextQuality — Advanced Typography Analyzer (inconsistent punctuation style)", () => {
  test("flags when both ASCII and Urdu/Arabic comma are used in the same document", () => {
    const result = checkTextQuality("یہ، اور یہ بھی, اور یہ");
    expect(result.punctuation.inconsistentPunctuationStyle).toBe(true);
  });

  test("does not flag a document using only one comma style throughout", () => {
    const result = checkTextQuality("یہ، اور یہ بھی، اور یہ");
    expect(result.punctuation.inconsistentPunctuationStyle).toBe(false);
  });

  test("flags mixed question mark styles", () => {
    const result = checkTextQuality("کیا یہ ٹھیک ہے؟ Is this ok?");
    expect(result.punctuation.inconsistentPunctuationStyle).toBe(true);
  });

  test("a document with no punctuation at all is not flagged", () => {
    const result = checkTextQuality("یہ ایک سادہ جملہ ہے");
    expect(result.punctuation.inconsistentPunctuationStyle).toBe(false);
  });
});

describe("checkTextQuality — Advanced Typography Analyzer (no false positives, totals)", () => {
  test("a clean, standard sentence reports zero for all three new checks", () => {
    const result = checkTextQuality("یہ ایک صاف ستھرا جملہ ہے۔");
    expect(result.typography.spaceBeforePunctuation).toBe(0);
    expect(result.typography.tatweelCount).toBe(0);
    expect(result.punctuation.inconsistentPunctuationStyle).toBe(false);
  });

  test("new checks are included in totalIssues", () => {
    const clean = checkTextQuality("یہ ایک صاف ستھرا جملہ ہے۔");
    const withTatweel = checkTextQuality("یہ ایک صافـ ستھرا جملہ ہے۔");
    expect(withTatweel.totalIssues).toBe(clean.totalIssues + 1);
  });
});
