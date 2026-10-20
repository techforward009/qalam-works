import { describe, expect, it } from "vitest";
import { resolveRulerDirection, rulerDirectionAtSelection } from "../app/tools/document-studio/utils/paragraphDirection";
import { contentFromNewDocument, defaultNewDocumentDraft, settingsFromNewDocument } from "../app/tools/document-studio/components/NewDocumentDialog";

describe("InPage document defaults", () => {
  it("starts a new document right to left on A4 with half-inch margins", () => {
    const draft = defaultNewDocumentDraft();
    expect(draft.direction).toBe("rtl");
    expect(draft.size).toBe("a4");
    expect(draft.orientation).toBe("portrait");
    expect(draft.top).toBe(12.7);
    expect(draft.left).toBe(12.7);
    const settings = settingsFromNewDocument(draft);
    expect(settings.page.size).toBe("a4");
    expect(settings.page.margins.topMm).toBe(12.7);
    expect(settings.page.margins.startMm).toBe(12.7);
    const content = contentFromNewDocument(draft);
    expect(content.content?.[0]).toMatchObject({ type: "paragraph", attrs: { dir: "rtl", directionMode: "rtl" } });
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
