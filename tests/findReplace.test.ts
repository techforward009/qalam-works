import { findAllTextMatches } from "../app/tools/document-studio/utils/findReplace";

describe("findAllTextMatches", () => {
  test("finds a single occurrence", () => {
    expect(findAllTextMatches("hello world", "world")).toEqual([{ index: 6, length: 5 }]);
  });

  test("finds multiple occurrences in order", () => {
    const matches = findAllTextMatches("یہ ایک جملہ ہے، یہ دوسرا جملہ ہے", "جملہ");
    expect(matches).toEqual([
      { index: 7, length: 4 },
      { index: 25, length: 4 },
    ]);
  });

  test("is case-insensitive by default", () => {
    expect(findAllTextMatches("Hello World HELLO", "hello")).toEqual([
      { index: 0, length: 5 },
      { index: 12, length: 5 },
    ]);
  });

  test("respects case-sensitive mode when requested", () => {
    expect(findAllTextMatches("Hello World hello", "hello", true)).toEqual([{ index: 12, length: 5 }]);
  });

  test("returns an empty array when there are no matches", () => {
    expect(findAllTextMatches("hello world", "xyz")).toEqual([]);
  });

  test("returns an empty array for an empty search string (never matches every position)", () => {
    expect(findAllTextMatches("hello", "")).toEqual([]);
  });

  test("returns an empty array for an empty document text", () => {
    expect(findAllTextMatches("", "hello")).toEqual([]);
  });

  test("does NOT count overlapping occurrences — advances past each full match (correct semantics for Replace All)", () => {
    expect(findAllTextMatches("aaaa", "aa")).toEqual([
      { index: 0, length: 2 },
      { index: 2, length: 2 },
    ]);
  });

  test("works correctly with Urdu/Arabic text", () => {
    expect(findAllTextMatches("علی نے کتاب پڑھی، علی خوش تھا", "علی")).toEqual([
      { index: 0, length: 3 },
      { index: 18, length: 3 },
    ]);
  });

  test("each match's length always equals the search string's length", () => {
    const matches = findAllTextMatches("test TEST Test", "test");
    matches.forEach((m) => expect(m.length).toBe(4));
  });
});

// Batch 16D — termination safety and descending-order replacement tests.
// These test the PURE logic only (collectMatchesDescending is a module-level
// function; we test the underlying findAllTextMatches + descending-sort pattern
// rather than the editor-dependent function directly).

describe("Batch 16D — Replace All termination safety (pure logic)", () => {
  test("self-referential replacement: find 'a', replace 'aa' — original matches found ONCE, not re-searched", () => {
    // Simulates: original doc has 3 'a' chars. We collect ONCE (3 matches),
    // then replace them all. The replacement produces 'aa' which would match
    // again — but since we never re-search, we replace exactly 3 times.
    const original = "a b a c a";
    const originalMatches = findAllTextMatches(original, "a");
    expect(originalMatches).toHaveLength(3);
    // Apply descending — last-first ordering so offsets don't shift earlier positions.
    const descending = [...originalMatches].sort((a, b) => b.index - a.index);
    expect(descending[0].index).toBeGreaterThan(descending[1].index);
    expect(descending[1].index).toBeGreaterThan(descending[2].index);
  });

  test("find 'test', replace 'test test' — same-length check: 2 matches collected, not re-searched", () => {
    const original = "run test again test end";
    const matches = findAllTextMatches(original, "test");
    expect(matches).toHaveLength(2);
  });

  test("empty search: findAllTextMatches returns empty array, no operation possible", () => {
    expect(findAllTextMatches("anything", "")).toHaveLength(0);
  });

  test("find 'x', replace '': all original 'x' matches are identified before deletion", () => {
    const original = "x foo x bar x";
    const matches = findAllTextMatches(original, "x");
    expect(matches).toHaveLength(3);
  });

  test("length-changing replacement: descending order ensures earlier offsets stay valid", () => {
    // Find 'abc' in 'abc ... abc ... abc'. Collecting in descending order:
    // the LAST match replaced first, so the first match's offset is unchanged.
    const original = "abc def abc ghi abc";
    const matches = findAllTextMatches(original, "abc").sort((a, b) => b.index - a.index);
    expect(matches[0].index).toBe(16); // last 'abc'
    expect(matches[1].index).toBe(8);  // middle 'abc'
    expect(matches[2].index).toBe(0);  // first 'abc'
  });
});
