import * as patterns from "../app/utils/quality/sharedTextPatterns";

describe("sharedTextPatterns — patterns exist and match expected real text", () => {
  test("MULTIPLE_SPACES_REGEX matches 2+ spaces", () => {
    expect("یہ  ٹھیک".match(patterns.MULTIPLE_SPACES_REGEX)).toEqual(["  "]);
  });

  test("STRAIGHT_QUOTES_REGEX matches straight quotes", () => {
    expect('"hello"'.match(patterns.STRAIGHT_QUOTES_REGEX)).toEqual(['"', '"']);
  });

  test("DUPLICATED_PUNCTUATION_REGEX matches repeated marks", () => {
    expect("کیا؟؟".match(patterns.DUPLICATED_PUNCTUATION_REGEX)).toEqual(["؟؟"]);
  });

  test("MISSING_SPACE_AFTER_PUNCTUATION_REGEX matches real missing-space cases", () => {
    expect("لفظ,اگلا".match(patterns.MISSING_SPACE_AFTER_PUNCTUATION_REGEX)).toEqual([",ا"]);
  });

  test("MISSING_SPACE_AFTER_PUNCTUATION_REGEX does NOT match thousands separators (Maintenance Batch fix)", () => {
    expect("1,000".match(patterns.MISSING_SPACE_AFTER_PUNCTUATION_REGEX)).toBeNull();
    expect("10,000".match(patterns.MISSING_SPACE_AFTER_PUNCTUATION_REGEX)).toBeNull();
  });

  test("ARABIC_FORM_LETTERS_REGEX matches the 5 known Arabic-form letters", () => {
    expect("علي".match(patterns.ARABIC_FORM_LETTERS_REGEX)).toEqual(["ي"]);
  });

  test("LATIN_LETTERS_REGEX matches Latin runs", () => {
    expect("یہ Document ہے".match(patterns.LATIN_LETTERS_REGEX)).toEqual(["Document"]);
  });

  test("stripProtectedMarkers replaces {{ }} content with equal-length whitespace (preserves offsets)", () => {
    const input = "پہلے {{محفوظ}} بعد";
    const result = patterns.stripProtectedMarkers(input);
    expect(result.length).toBe(input.length);
    expect(result).not.toContain("محفوظ");
  });
});

describe("sharedTextPatterns — g-flag regex objects are safe to reuse for .match() (stateless)", () => {
  test("calling .match() with the same shared regex twice in a row both succeed", () => {
    expect("یہ  ٹھیک".match(patterns.MULTIPLE_SPACES_REGEX)).not.toBeNull();
    expect("دوسرا  متن".match(patterns.MULTIPLE_SPACES_REGEX)).not.toBeNull();
  });
});

describe("sharedTextPatterns — numeral range patterns (Polish Batch, 2026-08-09)", () => {
  test("WESTERN_DIGIT_CHAR, ARABIC_INDIC_DIGIT_CHAR, URDU_INDIC_DIGIT_CHAR each match their own range", () => {
    expect(patterns.WESTERN_DIGIT_CHAR.test("5")).toBe(true);
    expect(patterns.ARABIC_INDIC_DIGIT_CHAR.test("٥")).toBe(true);
    expect(patterns.URDU_INDIC_DIGIT_CHAR.test("۵")).toBe(true);
  });

  test("numeral patterns are exported WITHOUT the /g flag (stateless .test() usage safety)", () => {
    expect(patterns.WESTERN_DIGIT_CHAR.flags).toBe("");
    expect(patterns.ARABIC_INDIC_DIGIT_CHAR.flags).toBe("");
    expect(patterns.URDU_INDIC_DIGIT_CHAR.flags).toBe("");
  });

  test(".test() on the shared numeral patterns gives correct results across repeated calls (no lastIndex leakage, since there's no /g flag)", () => {
    expect(patterns.WESTERN_DIGIT_CHAR.test("abc123")).toBe(true);
    expect(patterns.WESTERN_DIGIT_CHAR.test("5")).toBe(true);
    expect(patterns.WESTERN_DIGIT_CHAR.test("5")).toBe(true); // must stay true, not flip like a stateful g-flag regex would
  });
});

describe("sharedTextPatterns — freshRegex helper", () => {
  test("constructs an independent RegExp with the same source and flags by default", () => {
    const fresh = patterns.freshRegex(patterns.MULTIPLE_SPACES_REGEX);
    expect(fresh.source).toBe(patterns.MULTIPLE_SPACES_REGEX.source);
    expect(fresh.flags).toBe(patterns.MULTIPLE_SPACES_REGEX.flags);
    expect(fresh).not.toBe(patterns.MULTIPLE_SPACES_REGEX);
  });

  test("can force different flags (e.g. adding 'g' to a flag-less pattern for .match())", () => {
    const withG = patterns.freshRegex(patterns.WESTERN_DIGIT_CHAR, "g");
    expect(withG.flags).toBe("g");
    expect("123".match(withG)).toEqual(["1", "2", "3"]);
  });

  test("two fresh instances used in separate exec() loops never interfere with each other's lastIndex", () => {
    const regexA = patterns.freshRegex(patterns.MULTIPLE_SPACES_REGEX);
    const regexB = patterns.freshRegex(patterns.MULTIPLE_SPACES_REGEX);
    regexA.exec("لفظ  اگلا  دوسرا  تیسرا"); // advances regexA's lastIndex partway
    expect(regexB.lastIndex).toBe(0); // regexB is untouched
  });
});
