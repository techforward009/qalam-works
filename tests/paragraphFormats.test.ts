import { describe, expect, it } from "vitest";
import {
  PARAGRAPH_FORMAT_KEYS,
  collapseParagraphFormats,
  fitParagraphFormats,
  isEmptyParagraphFormat,
  isParagraphFormat,
  isParagraphFormatList,
  normalizeParagraphFormat,
  resolvedParagraphFormats,
  type ParagraphFormat,
} from "../app/tools/document-studio/utils/paragraphFormats";

describe("paragraphFormats", () => {
  it("exports known keys", () => {
    expect(PARAGRAPH_FORMAT_KEYS).toEqual([
      "lineHeight",
      "leading",
      "spaceBeforePt",
      "spaceAfterPt",
      "lineGapPt",
      "firstLineIndentMm",
      "indentStartMm",
      "indentEndMm",
    ]);
  });

  it("checks empty format", () => {
    expect(isEmptyParagraphFormat(null)).toBe(true);
    expect(isEmptyParagraphFormat({})).toBe(true);
    expect(isEmptyParagraphFormat({ spaceBeforePt: null })).toBe(true);
    expect(isEmptyParagraphFormat({ lineGapPt: null })).toBe(true);
    expect(isEmptyParagraphFormat({ spaceBeforePt: 12 })).toBe(false);
    expect(isEmptyParagraphFormat({ lineGapPt: 0 })).toBe(false);
  });

  it("normalizes paragraph formats", () => {
    expect(normalizeParagraphFormat(null)).toBe(null);
    expect(normalizeParagraphFormat({})).toBe(null);
    expect(normalizeParagraphFormat({ spaceBeforePt: 12 })).toEqual({ spaceBeforePt: 12 });
    expect(normalizeParagraphFormat({ spaceBeforePt: -5 })).toBe(null);
    expect(normalizeParagraphFormat({ lineGapPt: 6 })).toEqual({ lineGapPt: 6 });
    expect(normalizeParagraphFormat({ lineGapPt: 0 })).toEqual({ lineGapPt: 0 });
    expect(normalizeParagraphFormat({ lineGapPt: null })).toBe(null);
    expect(normalizeParagraphFormat({ lineGapPt: -1 })).toBe(null);
    expect(normalizeParagraphFormat({ lineGapPt: 201 })).toBe(null);
    expect(normalizeParagraphFormat({ leading: "18pt" })).toEqual({ leading: { mode: "points", value: 18 } });
    expect(normalizeParagraphFormat({ leading: { mode: "auto" } })).toEqual({ leading: { mode: "auto" } });
  });

  it("validates individual formats", () => {
    expect(isParagraphFormat(null)).toBe(true);
    expect(isParagraphFormat({})).toBe(true);
    expect(isParagraphFormat({ spaceBeforePt: 12 })).toBe(true);
    expect(isParagraphFormat({ lineGapPt: 6 })).toBe(true);
    expect(isParagraphFormat({ lineGapPt: "6" })).toBe(false);
    expect(isParagraphFormat({ unknownKey: 12 })).toBe(false);
    expect(isParagraphFormat({ spaceBeforePt: "invalid" })).toBe(false);
  });

  it("validates paragraph format lists with bounds", () => {
    expect(isParagraphFormatList(undefined)).toBe(false);
    expect(isParagraphFormatList(null)).toBe(false);
    expect(isParagraphFormatList([])).toBe(false);
    expect(isParagraphFormatList([null, { spaceBeforePt: 12 }])).toBe(true);
    expect(isParagraphFormatList([{ invalid: true }])).toBe(false);
    const huge = Array.from({ length: 10001 }, () => null);
    expect(isParagraphFormatList(huge)).toBe(false);
  });

  it("resolves parallel formats to paragraph count", () => {
    const text = "First\nSecond\nThird";
    const formats: ParagraphFormat[] = [{ spaceBeforePt: 10 }];
    const resolved = resolvedParagraphFormats(text, formats);
    expect(resolved).toEqual([{ spaceBeforePt: 10 }, null, null]);
  });

  it("collapses all-empty formats to null", () => {
    expect(collapseParagraphFormats([null, null])).toBe(null);
    expect(collapseParagraphFormats([{}, { spaceBeforePt: null }])).toBe(null);
    expect(collapseParagraphFormats([null, { spaceBeforePt: 10 }])).toEqual([
      null,
      { spaceBeforePt: 10 },
    ]);
    expect(collapseParagraphFormats([null, { lineGapPt: null }])).toBe(null);
    expect(collapseParagraphFormats([{ lineGapPt: 6 }, null])).toEqual([{ lineGapPt: 6 }, null]);
  });

  it("fits formats to text length", () => {
    expect(fitParagraphFormats("Single line", null)).toBe(null);
    expect(fitParagraphFormats("Single line", [])).toBe(null);
    expect(fitParagraphFormats("A\nB", [{ spaceBeforePt: 5 }, null, { spaceBeforePt: 10 }])).toEqual([
      { spaceBeforePt: 5 },
      null,
    ]);
  });
});
