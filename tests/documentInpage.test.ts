import { describe, expect, it } from "vitest";
import { resolveRulerDirection, rulerDirectionAtSelection } from "../app/tools/document-studio/utils/paragraphDirection";
import { contentFromNewDocument, defaultNewDocumentDraft, pageCountFromNewDocument, settingsFromNewDocument } from "../app/tools/document-studio/components/NewDocumentDialog";
import { defaultDocumentSettings, withStudioOpeningMargins } from "../app/tools/document-studio/utils/documentSettings";
import { buildDocumentStats } from "../app/tools/document-studio/utils/buildDocumentStats";
import { createDocumentAnalysisContext } from "../app/tools/document-studio/utils/extractPlainText";

describe("InPage document defaults", () => {
  it("starts a new document right to left on A4 with half-inch margins", () => {
    const draft = defaultNewDocumentDraft();
    expect(draft.direction).toBe("rtl");
    expect(draft.size).toBe("a4");
    expect(draft.orientation).toBe("portrait");
    expect(draft.top).toBe(12.7);
    expect(draft.left).toBe(12.7);
    expect(draft.gutter).toBe(4.23);
    const settings = settingsFromNewDocument(draft);
    expect(settings.page.size).toBe("a4");
    expect(settings.page.margins.topMm).toBe(12.7);
    expect(settings.page.margins.startMm).toBe(12.7);
    const content = contentFromNewDocument(draft);
    expect(content.content?.[0]).toMatchObject({ type: "paragraph", attrs: { dir: "rtl", directionMode: "rtl" } });
    expect(buildDocumentStats(content, createDocumentAnalysisContext(content, "ur")).characterCount).toBe(0);
  });

  it("keeps extra pages as a page count, not page-break characters", () => {
    const draft = { ...defaultNewDocumentDraft(), pages: 2 };
    const content = contentFromNewDocument(draft);
    expect(pageCountFromNewDocument(draft)).toBe(2);
    expect(content.content).toHaveLength(1);
    expect(JSON.stringify(content)).not.toContain("pageBreak");
    expect(buildDocumentStats(content, createDocumentAnalysisContext(content, "ur")).characterCount).toBe(0);
  });

  it("opens the studio on 12.7 mm margins without changing the factory default", () => {
    const factory = defaultDocumentSettings();
    expect(factory.page.margins.preset).toBe("normal");
    expect(factory.page.margins.topMm).toBe(25.4);
    const opened = withStudioOpeningMargins(factory);
    expect(opened.page.margins).toMatchObject({ topMm: 12.7, bottomMm: 12.7, startMm: 12.7, endMm: 12.7 });
    expect(defaultDocumentSettings().page.margins.topMm).toBe(25.4);
    expect(withStudioOpeningMargins(opened)).toBe(opened);
  });

  it("follows the current paragraph when the ruler direction changes", () => {
    expect(resolveRulerDirection("ltr", "rtl", "rtl")).toBe("ltr");
    expect(resolveRulerDirection("auto", "rtl", "ltr")).toBe("rtl");
    expect(resolveRulerDirection("auto", undefined, "rtl")).toBe("rtl");
    expect(rulerDirectionAtSelection([
      { typeName: "doc", directionMode: undefined, dir: undefined },
      { typeName: "paragraph", directionMode: "ltr", dir: "ltr" },
    ])).toBe("ltr");
  });
});
