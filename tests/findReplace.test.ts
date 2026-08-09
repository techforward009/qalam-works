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
