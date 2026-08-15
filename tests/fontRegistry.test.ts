import { describe, expect, test } from "vitest";
import {
  directionForNode,
  listEditorFonts,
  resolveEditorFontFamily,
  getFontById,
} from "../app/tools/document-studio/utils/fontRegistry";
import { buildPdfHtml, requiredPdfEmbedFonts } from "../app/tools/document-studio/utils/buildPdfHtml";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { normalizeDocumentNodes } from "../app/tools/document-studio/utils/normalizeDocumentNodes";

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

  test("Jameel is local-preview-only and PDF falls back to Noto Nastaliq", () => {
    const j = getFontById("jameel-noori-nastaleeq");
    expect(j.availability).toBe("local-preview-only");
    expect(j.pdf.supported).toBe(false);
    expect(j.pdf.embedded).toBe(false);
    const r = resolveEditorFontFamily("Jameel Noori Nastaleeq", "rtl");
    expect(r.fellBack).toBe(true);
    expect(r.pdfFamily).toBe("Noto Nastaliq Urdu");
    expect(r.docxFamily).toBe("Jameel Noori Nastaleeq");
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
      { familyName: "Noto Nastaliq Urdu", regularSources: ["YQ=="] },
      { familyName: "Amiri", regularSources: ["YQ=="] },
      { familyName: "Vazirmatn", regularSources: ["YQ=="] },
      { familyName: "Inter", regularSources: ["YQ=="] },
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

  test("Jameel is not claimed as embedded", () => {
    const { fontsUsed, fontFallbacks } = buildPdfHtml(multi, "rtl", { faces: [] });
    expect(fontsUsed).not.toContain("Jameel Noori Nastaleeq");
    expect(fontFallbacks[0].used).toBe("Noto Nastaliq Urdu");
  });

  test("required embed list excludes Jameel", () => {
    const defs = requiredPdfEmbedFonts(multi, "rtl");
    const names = defs.map((d) => d.pdf.familyName);
    expect(names).not.toContain("Jameel Noori Nastaleeq");
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

describe("PDF multi-subset and heading fidelity", () => {
  test("Amiri mixed Arabic+English uses Amiri class for both runs", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [
            {
              type: "text",
              text: "سلام ",
              marks: [{ type: "textStyle", attrs: { fontFamily: "Amiri" } }],
            },
            {
              type: "text",
              text: "Hello",
              marks: [{ type: "textStyle", attrs: { fontFamily: "Amiri" } }],
            },
          ],
        },
      ],
    };
    const { html, fontsUsed, fontFallbacks } = buildPdfHtml(doc, "rtl", {
      faces: [{ familyName: "Amiri", regularSources: ["dGVzdA=="] }],
    });
    expect(html).toContain("qf-amiri");
    expect(html).toContain("سلام");
    expect(html).toContain("Hello");
    expect(fontsUsed).toContain("Amiri");
    expect(fontFallbacks.length).toBe(0);
  });

  test("Vazirmatn mixed Persian+English uses Vazirmatn class", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [
            {
              type: "text",
              text: "سلام ",
              marks: [{ type: "textStyle", attrs: { fontFamily: "Vazirmatn" } }],
            },
            {
              type: "text",
              text: "World",
              marks: [{ type: "textStyle", attrs: { fontFamily: "Vazirmatn" } }],
            },
          ],
        },
      ],
    };
    const { html } = buildPdfHtml(doc, "rtl", { faces: [] });
    expect(html).toContain("qf-vazirmatn");
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
    const { html } = buildPdfHtml(doc, "ltr", { faces: [] });
    expect(html).toContain("<h4");
    expect(html).not.toMatch(/<h1[^>]*>Deep heading/);
  });

  test("fontsUsed only includes faces that were provided", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "textStyle", attrs: { fontFamily: "Amiri" } }],
            },
          ],
        },
      ],
    };
    // No faces provided → Amiri cannot be claimed as embedded
    const { fontsUsed, fontFallbacks } = buildPdfHtml(doc, "rtl", { faces: [] });
    expect(fontsUsed).not.toContain("Amiri");
    expect(fontFallbacks.some((f) => f.requested === "Amiri")).toBe(true);
  });
});
