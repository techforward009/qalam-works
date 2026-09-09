import { describe, expect, it, vi } from "vitest";
import { waitForPdfDocumentFonts } from "../app/tools/document-studio/utils/pdfFontReady";
import { isAllowedJameelBlobHost } from "../app/lib/privateJameelFont";
import { requiredPdfEmbedFonts, buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { studioJameelFontFaceCss } from "../app/tools/document-studio/utils/fontRegistry";

const jameelDoc: DocNode = {
  type: "doc",
  content: [{
    type: "paragraph",
    attrs: { dir: "rtl" },
    content: [{ type: "text", text: "اردو", marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq" } }] }],
  }],
};

function face(familyName: string, complete = true): PdfFontFace {
  return {
    familyName,
    regularSources: complete ? ["src"] : [],
    complete,
    declaredRegular: 1,
    declaredBold: 0,
    loadedRegular: complete ? 1 : 0,
    loadedBold: 0,
  };
}

describe("Download PDF Jameel contract", () => {
  it("required fonts include Jameel and complete face uses qf-jameel", () => {
    const names = requiredPdfEmbedFonts(jameelDoc, "rtl").map((def) => def.pdf.familyName);
    expect(names).toContain("Jameel Noori Nastaleeq");
    const complete = buildPdfHtml(jameelDoc, "rtl", {
      faces: [face("Jameel Noori Nastaleeq"), face("Noto Nastaliq Urdu")],
    });
    expect(complete.html).toContain("qf-jameel");
    expect(complete.fontsUsed).toContain("Jameel Noori Nastaleeq");
    expect(complete.fontFallbacks.some((item) => item.requested === "Jameel Noori Nastaleeq")).toBe(false);
  });

  it("incomplete Jameel still falls back truthfully", () => {
    const fallback = buildPdfHtml(jameelDoc, "rtl", {
      faces: [face("Jameel Noori Nastaleeq", false), face("Noto Nastaliq Urdu")],
    });
    expect(fallback.html).toContain("qf-noto-nastaliq");
    expect(fallback.fontFallbacks).toContainEqual({
      requested: "Jameel Noori Nastaleeq",
      used: "Noto Nastaliq Urdu",
    });
  });
});

describe("Puppeteer font-ready path", () => {
  it("waits for document.fonts.ready and loads named families", async () => {
    const load = vi.fn(async () => undefined);
    const check = vi.fn(() => true);
    const ready = Promise.resolve();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { fonts: { ready, load, check } },
    });
    await expect(waitForPdfDocumentFonts(["Jameel Noori Nastaleeq"])).resolves.toBe(true);
    expect(load).toHaveBeenCalledWith('16px "Jameel Noori Nastaleeq"');
  });
});

describe("shared Jameel source", () => {
  it("allows the approved blob hosts and print face uses the same family name", () => {
    expect(isAllowedJameelBlobHost("abc.private.blob.vercel-storage.com")).toBe(true);
    expect(isAllowedJameelBlobHost("abc.blob.vercel-storage.com")).toBe(true);
    expect(isAllowedJameelBlobHost("evil.example.com")).toBe(false);
    expect(studioJameelFontFaceCss()).toContain("Jameel Noori Nastaleeq");
    expect(studioJameelFontFaceCss()).toContain("/api/studio-font/jameel");
  });
});
