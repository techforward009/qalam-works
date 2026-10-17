import { describe, expect, it } from "vitest";
import { classifyPdfExportFailure, identifyUnsupportedProtectedCharacters } from "../app/tools/document-studio/utils/pdfExportDiagnostics";

describe("PDF guided failure diagnostics", () => {
  it("identifies missing Quranic mark without exposing private text", () => {
    const response = classifyPdfExportFailure(new Error("Unsupported protected Arabic/Quranic U+06D7 at run 1:0; export blocked"));
    expect(response.diagnostics[0]).toMatchObject({
      kind: "font", codepoint: "U+06D7", location: { runIndex: 1 },
      selectedFont: "Digital Khatt Indo-Pak",
    });
    expect(response.error).not.toContain("U+06D7");
    expect(response.retryable).toBe(false);
    expect(response.diagnostics[0].page).toBeUndefined();
  });
  it("reports actual painted faces but never fabricates an unknown Unicode glyph", () => {
    const response = classifyPdfExportFailure(new Error("Unexpected glyph fallback at run 2:0; faces=Liberation Serif,DejaVu Sans; export blocked"));
    expect(response.diagnostics[0].location?.runIndex).toBe(2);
    expect(response.diagnostics[0].actualFont).toContain("Liberation Serif");
    expect(response.diagnostics[0].codepoint).toBeUndefined();
    expect(response.diagnostics[0].character).toBeUndefined();
  });
  it("treats resource failures separately rather than inventing a font issue", () => {
    expect(classifyPdfExportFailure(new Error("Request timed out")).diagnostics[0].kind).toBe("timeout");
    expect(classifyPdfExportFailure(new Error("Document size limit exceeded")).diagnostics[0].kind).toBe("too_large");
    expect(classifyPdfExportFailure(new Error("Service temporarily unavailable")).diagnostics[0].kind).toBe("server");
    expect(classifyPdfExportFailure(null).diagnostics[0].kind).toBe("unknown");
  });

  it("lists multiple missing Quranic marks in distinct protected source runs without changing text", () => {
    const first = "هٰذَا";
    const second = "ا\u06D7";
    const third = "ب\u06D7";
    const doc = { type: "doc", content: [first, second, third].map(value => ({
      type: "paragraph", content: [{ type: "text", text: value, marks: [{
        type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak" },
      }] }],
    })) };
    const before = JSON.stringify(doc);
    const issues = identifyUnsupportedProtectedCharacters(doc);
    expect(issues.filter(x => x.codepoint === "U+06D7").map(x => x.location?.runIndex)).toEqual([1, 2]);
    expect(JSON.stringify(doc)).toBe(before);
    expect(issues.every(x => x.kind === "font" && x.page === undefined)).toBe(true);
  });

  it("classifies layout and complexity safety guards with stable codes", () => {
    for (const [raw, code] of [
      ["printable horizontal boundary", "PDF_LAYOUT_OVERFLOW"],
      ["300 visual-line limit", "PDF_LIMIT_VISUAL_LINES"],
      ["40000px staging limit", "PDF_LIMIT_STAGING_HEIGHT"],
      ["98304-byte limit", "PDF_LIMIT_SOURCE_BYTES"],
      ["20000 code-point single-text-node limit", "PDF_LIMIT_NODE_CODEPOINTS"],
      ["2500-node limit", "PDF_LIMIT_NODE_COUNT"],
    ]) {
      const report = classifyPdfExportFailure(new Error(raw + "; export blocked"));
      expect(report.diagnostics[0].code).toBe(code);
      expect(report.diagnostics[0].kind).not.toBe("font");
      expect(report.retryable).toBe(false);
    }
  });
  it("does not accept an ignore-and-export bypass", () => {
    const response = classifyPdfExportFailure(new Error("Unsupported Quranic U+06D7; export blocked"));
    expect(response.retryable).toBe(false);
    expect(JSON.stringify(response)).not.toMatch(/ignore.and.export/i);
  });
});
