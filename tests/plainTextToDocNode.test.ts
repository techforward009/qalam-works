// Regression tests for the 2026-08-08 DOCX blank-paragraph bug fix
// (including same-day revision for the trailing-artifact bug). Root cause
// and both fixes are documented in normalizeDocxParagraphBreaks' own
// comment in plainTextToDocNode.ts.
//
// Every raw string below is the EXACT output empirically captured from a
// real mammoth.extractRawText() call on a real .docx generated with the
// `docx` package for that specific scenario — not hand-approximated.

import { plainTextToDocNode, normalizeDocxParagraphBreaks } from "../app/tools/document-studio/utils/plainTextToDocNode";

function paragraphTextsOf(rawMammothOutput: string): (string | null)[] {
  const normalized = normalizeDocxParagraphBreaks(rawMammothOutput);
  const docNode = plainTextToDocNode(normalized);
  return docNode.content?.map((p) => p.content?.[0]?.text ?? null) ?? [];
}

describe("normalizeDocxParagraphBreaks — paragraph separators", () => {
  test("consecutive DOCX paragraphs with no blank paragraph produce exactly those paragraphs, nothing extra", () => {
    // Real mammoth output for 3 clean paragraphs, no blanks anywhere.
    const raw = "پہلا\n\nدوسرا\n\nتیسرا\n\n";
    expect(paragraphTextsOf(raw)).toEqual(["پہلا", "دوسرا", "تیسرا"]);
  });

  test("one intentional blank paragraph in the middle is preserved as exactly one blank", () => {
    // Real mammoth output for para1, one genuine blank paragraph, para2.
    const raw = "پہلا\n\n\n\nدوسرا\n\n";
    expect(paragraphTextsOf(raw)).toEqual(["پہلا", null, "دوسرا"]);
  });

  test("two consecutive intentional blank paragraphs in the middle are both preserved, not collapsed into one", () => {
    // Real mammoth output for para1, two genuine consecutive blank
    // paragraphs, para2.
    const raw = "پہلا\n\n\n\n\n\nدوسرا\n\n";
    expect(paragraphTextsOf(raw)).toEqual(["پہلا", null, null, "دوسرا"]);
  });
});

describe("normalizeDocxParagraphBreaks — trailing artifact (fixed 2026-08-08, same-day revision)", () => {
  test("does NOT add a spurious trailing blank paragraph when the document has no trailing blank", () => {
    // Real mammoth output for 3 clean paragraphs — confirms the fix: the
    // very first version of this function left one spurious trailing
    // empty paragraph here; this must now be gone.
    const raw = "پہلا\n\nدوسرا\n\nتیسرا\n\n";
    const texts = paragraphTextsOf(raw);
    expect(texts).toEqual(["پہلا", "دوسرا", "تیسرا"]);
    expect(texts[texts.length - 1]).not.toBeNull();
  });

  test("a genuine trailing blank paragraph IS preserved (not stripped along with the artifact)", () => {
    // Real mammoth output for 2 real paragraphs + 1 genuine TRAILING
    // blank paragraph — the fix must strip only mammoth's own artifact
    // "\n\n", not this real one.
    const raw = "پہلا\n\nدوسرا\n\n\n\n";
    expect(paragraphTextsOf(raw)).toEqual(["پہلا", "دوسرا", null]);
  });

  test("two genuine trailing blank paragraphs are both preserved", () => {
    // Real mammoth output for 1 real paragraph + 2 genuine TRAILING
    // blank paragraphs.
    const raw = "پہلا\n\n\n\n\n\n";
    expect(paragraphTextsOf(raw)).toEqual(["پہلا", null, null]);
  });

  test("does not affect plain text with no double-newlines at all", () => {
    const raw = "single line, no paragraph breaks";
    expect(normalizeDocxParagraphBreaks(raw)).toBe(raw);
  });
});

describe("plainTextToDocNode — unchanged, TXT behavior confirmation", () => {
  // Confirms the shared function itself was NOT modified for either DOCX
  // fix — a .txt file's own blank lines and trailing newline (if any)
  // still behave exactly as before, since normalizeDocxParagraphBreaks is
  // never called on the .txt import path.
  test("a plain .txt-style blank line is preserved as-is, without DOCX normalization", () => {
    const txt = "پہلی لائن\n\nدوسری لائن"; // one real blank line, as typed in a .txt file
    const docNode = plainTextToDocNode(txt); // no normalizeDocxParagraphBreaks call
    const paragraphTexts = docNode.content?.map((p) => p.content?.[0]?.text ?? null);
    expect(paragraphTexts).toEqual(["پہلی لائن", null, "دوسری لائن"]);
  });

  test("a .txt file's own trailing newline still produces a trailing blank paragraph, untouched by the DOCX fix", () => {
    const txt = "صرف ایک لائن\n"; // a .txt file ending with a newline, as many editors save
    const docNode = plainTextToDocNode(txt);
    const paragraphTexts = docNode.content?.map((p) => p.content?.[0]?.text ?? null);
    expect(paragraphTexts).toEqual(["صرف ایک لائن", null]);
  });
});
