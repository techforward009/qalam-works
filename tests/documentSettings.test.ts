import { describe, expect, test } from "vitest";
import {
  defaultDocumentSettings,
  parseDocumentSettings,
  resolveFontSizePt,
} from "../app/tools/document-studio/utils/documentSettings";
import { applyPresetToSettings as applyPreset } from "../app/tools/document-studio/utils/publishingPresets";
import {
  resolvePageLayout,
  mmToTwips,
  ptToHalfPoints,
  clampMarginMm,
} from "../app/tools/document-studio/utils/pageLayout";
import { buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { normalizeDocumentNodes } from "../app/tools/document-studio/utils/normalizeDocumentNodes";

function face(name: string): PdfFontFace {
  return {
    familyName: name,
    regularSources: ["YQ=="],
    complete: true,
    declaredRegular: 1,
    declaredBold: 0,
    loadedRegular: 1,
    loadedBold: 0,
  };
}

describe("documentSettings", () => {
  test("defaults are versioned and safe", () => {
    const s = defaultDocumentSettings();
    expect(s.version).toBe(1);
    expect(s.page.size).toBe("a4");
    expect(s.typography.bodyFontSizePt).toBe(12);
  });

  test("parse recovers from corrupt input", () => {
    expect(parseDocumentSettings(null).page.size).toBe("a4");
    expect(parseDocumentSettings({ page: { size: "nope" } }).page.size).toBe("a4");
  });

  test("font size sanitization", () => {
    expect(resolveFontSizePt("16pt")).toBe(16);
    expect(resolveFontSizePt(20)).toBe(20);
    expect(resolveFontSizePt("999pt")).toBeNull();
    expect(resolveFontSizePt("huge")).toBeNull();
  });

  test("preset application does not require tip-tap rewrite", () => {
    const base = defaultDocumentSettings();
    const next = applyPreset(base, "book-manuscript");
    expect(next.presetId).toBe("book-manuscript");
    expect(next.typography.lineHeight).toBe(1.8);
    expect(next.typography.firstLineIndentMm).toBe(8);
    expect(next.page.size).toBe("a5");
  });
});

describe("pageLayout", () => {
  test("A4 portrait dimensions", () => {
    const l = resolvePageLayout({
      size: "a4",
      orientation: "portrait",
      marginPreset: "normal",
    });
    expect(l.widthMm).toBe(210);
    expect(l.heightMm).toBe(297);
  });

  test("A4 landscape swaps dimensions", () => {
    const l = resolvePageLayout({
      size: "a4",
      orientation: "landscape",
      marginPreset: "normal",
    });
    expect(l.widthMm).toBe(297);
    expect(l.heightMm).toBe(210);
  });

  test("conversions", () => {
    expect(ptToHalfPoints(12)).toBe(24);
    expect(mmToTwips(25.4)).toBe(1440);
    expect(clampMarginMm(100)).toBe(50);
    expect(clampMarginMm(1)).toBe(5);
  });
});

describe("PDF font size and underline", () => {
  test("emits validated pt size and underline", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Sized",
              marks: [
                { type: "underline" },
                { type: "textStyle", attrs: { fontFamily: "Inter", fontSize: "18pt" } },
              ],
            },
          ],
        },
      ],
    };
    const { html } = buildPdfHtml(doc, "ltr", { faces: [face("Inter")] });
    expect(html).toContain("font-size:18pt");
    expect(html).toContain("<u>");
  });
});

describe("normalize preserves new marks", () => {
  test("fontSize and underline survive", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { dir: "rtl", lineHeight: 1.8 },
          content: [
            {
              type: "text",
              text: "علي",
              marks: [
                { type: "underline" },
                { type: "textStyle", attrs: { fontFamily: "Amiri", fontSize: "14pt" } },
              ],
            },
          ],
        },
      ],
    };
    const { document: out } = normalizeDocumentNodes(doc, "ur");
    const text = out.content![0].content![0];
    expect(text.marks?.some((m) => m.type === "underline")).toBe(true);
    expect(text.marks?.find((m) => m.type === "textStyle")?.attrs?.fontSize).toBe("14pt");
    expect(out.content![0].attrs?.lineHeight).toBe(1.8);
  });
});

describe("Batch 16B — settings persistence round-trip", () => {
  test("A5 landscape with custom asymmetric margins survives JSON serialize/parse unchanged", () => {
    const original = {
      ...defaultDocumentSettings(),
      page: {
        size: "a5",
        orientation: "landscape",
        margins: { preset: "custom", topMm: 15, bottomMm: 25, startMm: 20, endMm: 40 },
      },
    };
    const roundTripped = parseDocumentSettings(JSON.parse(JSON.stringify(original)));
    expect(roundTripped.page).toEqual(original.page);
  });
});
