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
