import { describe, expect, it } from "vitest";
import { issueForPdfFailure, isPdfFailure } from "../app/tools/document-studio/utils/pdfExportDiagnostics";

const text = (value: string, font = "Digital Khatt Indo-Pak") => ({
  type: "text", text: value,
  marks: [{ type: "textStyle", attrs: { fontFamily: font } }],
});
const doc = { type: "doc", content: [
  { type: "paragraph", content: [text("اَلْحَمْدُ لِلّٰهِ. ")] },
  { type: "paragraph", content: [
    text("اردو متن", "Jameel Noori Nastaleeq"),
    { type: "text", text: "هٰذَا نَصٌّ. ", marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak" } }, { type: "bold" }] },
  ] },
] };
describe("PDF diagnostics: source paths, safe errors and unknown failures", () => {
  it("maps the second protected run by structural path, never a snippet search", () => {
    const result = issueForPdfFailure(new Error("Unsafe font at protected run 1:0; actual=Liberation Serif; U+064E; export blocked"), doc);
    expect(isPdfFailure(result)).toBe(true);
    expect(result.code).toBe("FONT_FALLBACK");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].location?.path).toEqual([1,1]);
    expect(result.issues[0].selectedFont).toBe("Digital Khatt Indo-Pak");
    expect(result.issues[0].actualFont).toBe("Liberation Serif");
  });
  it("keeps unsupported Quranic marks classified as font faults", () => {
    const result = issueForPdfFailure(new Error("Unsupported protected Arabic/Quranic U+06D7 at run 0:0; export blocked"), doc);
    expect(result.code).toBe("FONT_UNSUPPORTED");
    expect(result.issues[0].codePoint).toBe("U+06D7");
  });
  it("does not invent a font problem or source location for unrelated failures", () => {
    const failure = issueForPdfFailure(new Error("unknown upstream exception"), doc);
    expect(failure.code).toBe("UNKNOWN");
    expect(failure.issues).toEqual([]);
    expect(failure.retryable).toBe(true);
    expect(issueForPdfFailure(new Error("operation timed out"), doc).code).toBe("TIMEOUT");
    expect(issueForPdfFailure(new Error("PDF page count differs from measured ink pagination"), doc).code).toBe("PDF_LAYOUT");
  });
});