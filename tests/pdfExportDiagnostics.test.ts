import { describe, expect, it } from "vitest";
import { classifyPdfExportFailure } from "../app/tools/document-studio/utils/pdfExportDiagnostics";

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
  it("does not accept an ignore-and-export bypass", () => {
    const response = classifyPdfExportFailure(new Error("Unsupported Quranic U+06D7; export blocked"));
    expect(response.retryable).toBe(false);
    expect(JSON.stringify(response)).not.toMatch(/ignore.and.export/i);
  });
});
