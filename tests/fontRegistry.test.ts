import { describe, expect, test } from "vitest";
import {
  directionForNode,
  listEditorFonts,
  resolveEditorFontFamily,
  getFontById,
} from "../app/tools/document-studio/utils/fontRegistry";
import {
  buildPdfHtml,
  requiredPdfEmbedFonts,
  type PdfFontFace,
} from "../app/tools/document-studio/utils/buildPdfHtml";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { normalizeDocumentNodes } from "../app/tools/document-studio/utils/normalizeDocumentNodes";

function face(
  familyName: string,
  opts: { complete?: boolean; regular?: number; declaredRegular?: number } = {}
): PdfFontFace {
  const loaded = opts.regular ?? 1;
  const declared = opts.declaredRegular ?? loaded;
  const complete = opts.complete ?? true;
  return {
    familyName,
    regularSources: Array.from({ length: loaded }, (_, i) => `src${i}`),
    complete,
    declaredRegular: declared,
    declaredBold: 0,
    loadedRegular: loaded,
    loadedBold: 0,
  };
}

describe("fontRegistry", () => {
  test("known fonts resolve for PDF and DOCX", () => {
    const r = resolveEditorFontFamily("Amiri", "rtl");
    expect(r.fellBack).toBe(false);
    expect(r.pdfFamily).toBe("Amiri");
    expect(r.docxFamily).toBe("Amiri");
    expect(r.cssClass).toBe("qf-amiri");
  });

  test("unknown font falls back safely", () => {
    const r = resolveEditorFontFamily("Comic Sans MS", "rtl");
    expect(r.fellBack).toBe(true);
    expect(r.pdfFamily).toBe("Noto Nastaliq Urdu");
  });

  test("default font depends on document direction", () => {
    expect(resolveEditorFontFamily(null, "rtl").pdfFamily).toBe("Noto Nastaliq Urdu");
    expect(resolveEditorFontFamily(null, "ltr").pdfFamily).toBe("Inter");
  });

  test("Jameel is bundled with PDF support (WOFF2 embedded)", () => {
    const j = getFontById("jameel-noori-nastaleeq");
    expect(j.availability).toBe("bundled");
    expect(j.pdf.supported).toBe(true);
    expect(j.pdf.embedded).toBe(true);
    expect(j.pdf.familyName).toBe("Jameel Noori Nastaleeq");
    expect(j.pdf.regularFiles).toEqual([
      "private-blob:jameel-noori-nastaleeq-400.woff2",
    ]);
    // No boldFiles — Regular 400 only
    expect(j.pdf.boldFiles ?? []).toHaveLength(0);
    // DOCX still preserves the family name
    expect(j.docx.familyName).toBe("Jameel Noori Nastaleeq");
    // fallbackFontId retained as emergency fallback
    expect(j.fallbackFontId).toBe("noto-nastaliq-urdu");
  });

  test("editor list includes main fonts", () => {
    const labels = listEditorFonts().map((f) => f.editorFamily);
    expect(labels).toContain("Noto Nastaliq Urdu");
    expect(labels).toContain("Amiri");
    expect(labels).toContain("Inter");
    expect(labels).toContain("Jameel Noori Nastaleeq");
  });

  test("directionForNode prefers node attrs", () => {
    expect(directionForNode({ attrs: { dir: "ltr" } }, "rtl")).toBe("ltr");
    expect(directionForNode({ attrs: {} }, "rtl")).toBe("rtl");
  });
});

describe("buildPdfHtml typography", () => {
  const multi: DocNode = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          {
            type: "text",
            text: "اردو",
            marks: [{ type: "textStyle", attrs: { fontFamily: "Noto Nastaliq Urdu" } }],
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          {
            type: "text",
            text: "عربي",
            marks: [{ type: "textStyle", attrs: { fontFamily: "Amiri" } }, { type: "bold" }],
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          {
            type: "text",
            text: "فارسی",
            marks: [{ type: "textStyle", attrs: { fontFamily: "Vazirmatn" } }],
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [
          {
            type: "text",
            text: "English",
            marks: [{ type: "textStyle", attrs: { fontFamily: "Inter" } }, { type: "italic" }],
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          {
            type: "text",
            text: "جمیل",
            marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq" } }],
          },
        ],
      },
    ],
  };

  test("emits safe font classes and per-block dir", () => {
    const faces = [
      face("Noto Nastaliq Urdu"),
      face("Amiri"),
      face("Vazirmatn"),
      face("Inter"),
    ];
    const { html, fontsUsed, fontFallbacks } = buildPdfHtml(multi, "rtl", { faces });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("qf-noto-nastaliq");
    expect(html).toContain("qf-amiri");
    expect(html).toContain("qf-vazirmatn");
    expect(html).toContain("qf-inter");
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
    expect(fontsUsed).toContain("Amiri");
    expect(fontsUsed).toContain("Inter");
    expect(fontFallbacks.some((f) => f.requested === "Jameel Noori Nastaleeq")).toBe(true);
  });

  test("Jameel is now embedded: fontsUsed contains Jameel when face is supplied", () => {
    const { fontsUsed, fontFallbacks } = buildPdfHtml(multi, "rtl", {
      faces: [face("Jameel Noori Nastaleeq"), face("Noto Nastaliq Urdu")],
    });
    expect(fontsUsed).toContain("Jameel Noori Nastaleeq");
    expect(fontFallbacks.some((f) => f.requested === "Jameel Noori Nastaleeq")).toBe(false);
  });

  test("required embed list now includes Jameel", () => {
    const defs = requiredPdfEmbedFonts(multi, "rtl");
    const names = defs.map((d) => d.pdf.familyName);
    expect(names).toContain("Jameel Noori Nastaleeq");
    expect(names).toContain("Amiri");
  });
});

describe("normalize preserves typography marks and dir", () => {
  test("fontFamily, bold, italic, dir, textAlign survive", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { dir: "rtl", textAlign: "right" },
          content: [
            {
              type: "text",
              text: "علي كتاب",
              marks: [
                { type: "bold" },
                { type: "italic" },
                { type: "textStyle", attrs: { fontFamily: "Amiri" } },
              ],
            },
          ],
        },
      ],
    };
    const { document: out } = normalizeDocumentNodes(doc, "ur");
    const p = out.content![0];
    expect(p.attrs?.dir).toBe("rtl");
    expect(p.attrs?.textAlign).toBe("right");
    const text = p.content![0];
    expect(text.marks?.some((m) => m.type === "bold")).toBe(true);
    expect(text.marks?.some((m) => m.type === "italic")).toBe(true);
    const style = text.marks?.find((m) => m.type === "textStyle");
    expect(style?.attrs?.fontFamily).toBe("Amiri");
  });
});

describe("PDF deterministic runtime fallbacks", () => {
  const amiriDoc: DocNode = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          {
            type: "text",
            text: "سلام Hello",
            marks: [{ type: "textStyle", attrs: { fontFamily: "Amiri" } }],
          },
        ],
      },
    ],
  };

  test("Amiri face entirely missing → class and metadata use Noto Nastaliq", () => {
    const { html, fontsUsed, fontFallbacks } = buildPdfHtml(amiriDoc, "rtl", {
      faces: [face("Noto Nastaliq Urdu")],
    });
    expect(html).toContain('class="qf-noto-nastaliq"');
    expect(html).not.toContain('class="qf-amiri"');
    expect(fontsUsed).toEqual(["Noto Nastaliq Urdu"]);
    expect(fontsUsed).not.toContain("Amiri");
    expect(fontFallbacks).toContainEqual({
      requested: "Amiri",
      used: "Noto Nastaliq Urdu",
    });
  });

  test("Amiri incomplete subsets (latin missing) → treated unavailable, falls back", () => {
    const incompleteAmiri = face("Amiri", {
      complete: false,
      regular: 1,
      declaredRegular: 3,
    });
    const { html, fontsUsed, fontFallbacks } = buildPdfHtml(amiriDoc, "rtl", {
      faces: [incompleteAmiri, face("Noto Nastaliq Urdu")],
    });
    expect(html).toContain("qf-noto-nastaliq");
    expect(html).not.toContain('class="qf-amiri"');
    expect(fontsUsed).toEqual(["Noto Nastaliq Urdu"]);
    expect(fontFallbacks.some((f) => f.requested === "Amiri")).toBe(true);
  });

  test("Vazirmatn Arabic subset missing → falls back deterministically", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [
            {
              type: "text",
              text: "فارسی",
              marks: [{ type: "textStyle", attrs: { fontFamily: "Vazirmatn" } }],
            },
          ],
        },
      ],
    };
    const incomplete = face("Vazirmatn", {
      complete: false,
      regular: 2,
      declaredRegular: 3,
    });
    const { html, fontsUsed, fontFallbacks } = buildPdfHtml(doc, "rtl", {
      faces: [incomplete, face("Noto Nastaliq Urdu")],
    });
    expect(html).toContain("qf-noto-nastaliq");
    expect(html).not.toContain('class="qf-vazirmatn"');
    expect(fontsUsed).toEqual(["Noto Nastaliq Urdu"]);
    expect(fontFallbacks).toContainEqual({
      requested: "Vazirmatn",
      used: "Noto Nastaliq Urdu",
    });
  });

  test("complete Amiri face still emits qf-amiri", () => {
    const { html, fontsUsed, fontFallbacks } = buildPdfHtml(amiriDoc, "rtl", {
      faces: [face("Amiri"), face("Noto Nastaliq Urdu")],
    });
    expect(html).toContain("qf-amiri");
    expect(fontsUsed).toContain("Amiri");
    expect(fontFallbacks.filter((f) => f.requested === "Amiri")).toHaveLength(0);
  });

  test("H4 is preserved in PDF HTML", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 4, dir: "ltr" },
          content: [{ type: "text", text: "Deep heading" }],
        },
      ],
    };
    const { html } = buildPdfHtml(doc, "ltr", { faces: [face("Inter")] });
    expect(html).toContain("<h4");
    expect(html).not.toMatch(/<h1[^>]*>Deep heading/);
  });
});
