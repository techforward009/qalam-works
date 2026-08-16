// Batch 16A.1 — permanent regression tests for the precedence bug fix
// (block-style size vs. document body default in PDF) and the editor
// CSS / BLOCK_STYLES divergence fix.

import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { BLOCK_STYLE_EDITOR_CSS } from "../app/tools/document-studio/components/DocumentStudioEditor";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

const emptyFonts = { faces: [] } as never;

describe("Batch 16A.1 — PDF block-style size precedence", () => {
  test("Title with no explicit FontSize: the paragraph gets 28pt, and the unmarked run does NOT stamp a competing body-size span", () => {
    const settings = defaultDocumentSettings(); // bodyFontSizePt: 12 by default
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "paragraph", attrs: { blockStyle: "title" }, content: [{ type: "text", text: "My Title" }] }],
    };
    const { html } = buildPdfHtml(doc, "ltr", emptyFonts, settings.typography);
    // The <p> itself carries the canonical 28pt (from openAttrs()/BLOCK_STYLES).
    expect(html).toMatch(/<p[^>]*font-size:28pt[^>]*>/);
    // The bug: the unmarked run's <span> must NOT carry its own font-size
    // at all — if it did (e.g. 12pt from bodyFontSizePt), it would
    // override the inherited 28pt via CSS cascade (inline style on the
    // child wins over an inherited parent style).
    const spanMatch = html.match(/<span[^>]*>My Title<\/span>/);
    expect(spanMatch).toBeTruthy();
    expect(spanMatch![0]).not.toMatch(/font-size/);
  });

  test("Title with an explicit 20pt run: that run's span DOES carry 20pt (wins over both Title's 28pt and body default)", () => {
    const settings = defaultDocumentSettings();
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { blockStyle: "title" },
          content: [{ type: "text", text: "Custom", marks: [{ type: "textStyle", attrs: { fontSize: "20pt" } }] }],
        },
      ],
    };
    const { html } = buildPdfHtml(doc, "ltr", emptyFonts, settings.typography);
    expect(html).toMatch(/<p[^>]*font-size:28pt[^>]*>/); // paragraph still canonical Title size
    const spanMatch = html.match(/<span[^>]*>Custom<\/span>/);
    expect(spanMatch![0]).toContain("font-size:20pt");
  });

  test("Subtitle: canonical 18pt on the paragraph, no competing span size", () => {
    const settings = defaultDocumentSettings();
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "paragraph", attrs: { blockStyle: "subtitle" }, content: [{ type: "text", text: "Sub" }] }],
    };
    const { html } = buildPdfHtml(doc, "ltr", emptyFonts, settings.typography);
    expect(html).toMatch(/<p[^>]*font-size:18pt[^>]*>/);
  });

  test("Caption: canonical 10pt on the paragraph", () => {
    const settings = defaultDocumentSettings();
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "paragraph", attrs: { blockStyle: "caption" }, content: [{ type: "text", text: "Cap" }] }],
    };
    const { html } = buildPdfHtml(doc, "ltr", emptyFonts, settings.typography);
    expect(html).toMatch(/<p[^>]*font-size:10pt[^>]*>/);
  });

  test("an ordinary paragraph (no blockStyle) still correctly gets the document body size via the <body> rule, not a per-span stamp", () => {
    const settings = { ...defaultDocumentSettings(), typography: { ...defaultDocumentSettings().typography, bodyFontSizePt: 13 } };
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Plain body text" }] }],
    };
    const { html } = buildPdfHtml(doc, "ltr", emptyFonts, settings.typography);
    expect(html).toMatch(/font-size:\s*13pt/); // Batch 16B — canonical pt unit, not rounded px
    const spanMatch = html.match(/<span[^>]*>Plain body text<\/span>/);
    expect(spanMatch![0]).not.toMatch(/font-size/); // no per-span override needed
  });
});

describe("Batch 16A.1 — Editor block-style CSS derives from canonical BLOCK_STYLES (single source of truth)", () => {
  test("generated editor CSS contains the canonical pt values converted to rem, not old hardcoded rem values", () => {
    expect(BLOCK_STYLE_EDITOR_CSS).toContain(`font-size:${28 / 12}rem`); // Title
    expect(BLOCK_STYLE_EDITOR_CSS).toContain(`font-size:${18 / 12}rem`); // Subtitle
    expect(BLOCK_STYLE_EDITOR_CSS).toContain(`font-size:${10 / 12}rem`); // Caption
    // The old, now-divergent hardcoded values must be gone.
    expect(BLOCK_STYLE_EDITOR_CSS).not.toContain("1.9rem");
    expect(BLOCK_STYLE_EDITOR_CSS).not.toContain("1.25rem");
    expect(BLOCK_STYLE_EDITOR_CSS).not.toContain("0.7rem");
  });
});
