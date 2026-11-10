import { describe, expect, it } from "vitest";
import { docToFrame, frameContentPatch, frameToDoc, type FrameDocNode } from "../app/tools/document-studio/utils/frameEditorDoc";

function paragraphTexts(doc: FrameDocNode): string[] {
  return (doc.content ?? []).map((node) => (node.content ?? []).map((child) => child.text ?? "").join(""));
}

function paragraphAligns(doc: FrameDocNode): Array<string | null> {
  return (doc.content ?? []).map((node) => {
    const align = node.attrs?.textAlign;
    return typeof align === "string" ? align : null;
  });
}

describe("frameToDoc / docToFrame", () => {
  it("maps an empty string to one empty paragraph", () => {
    const doc = frameToDoc("", undefined, undefined);
    expect(doc.content).toHaveLength(1);
    expect(paragraphTexts(doc)).toEqual([""]);
    expect(paragraphAligns(doc)).toEqual([null]);
    expect(docToFrame(doc)).toEqual({ text: "", paragraphAligns: null, paragraphFormats: null });
  });

  it("keeps empty paragraphs, including a blank line between text", () => {
    expect(paragraphTexts(frameToDoc("\n\n", "right"))).toEqual(["", "", ""]);
    const doc = frameToDoc("a\n\nb", "right");
    expect(paragraphTexts(doc)).toEqual(["a", "", "b"]);
    expect(docToFrame(doc, "right")).toEqual({ text: "a\n\nb", textAlign: "right", paragraphAligns: null, paragraphFormats: null });
  });

  it("round-trips mixed aligns and keeps stored nulls on a text-only edit", () => {
    const frame = {
      text: "a\nb\nc\nd",
      textAlign: "right" as const,
      paragraphAligns: ["center", null, "left", null] as const,
    };
    const doc = frameToDoc(frame.text, frame.textAlign, frame.paragraphAligns);
    expect(paragraphAligns(doc)).toEqual(["center", null, "left", null]);
    expect(frameContentPatch(frame, doc)).toBeNull();
    const edited = structuredClone(doc);
    edited.content![2]!.content = [{ type: "text", text: "changed" }];
    expect(frameContentPatch(frame, edited)).toEqual({ text: "a\nb\nchanged\nd" });
  });

  it("collapses a shared alignment onto textAlign and omits paragraphAligns", () => {
    const doc = frameToDoc("a\nb", "left", ["center", "center"]);
    expect(docToFrame(doc, "left")).toEqual({ text: "a\nb", textAlign: "center", paragraphAligns: null, paragraphFormats: null });
  });

  it("does not add paragraphAligns to a legacy frame after a text-only edit", () => {
    const frame = { text: "سلام", textAlign: "right" as const };
    const doc = frameToDoc(frame.text, frame.textAlign);
    expect(frameContentPatch(frame, doc)).toBeNull();
    const edited = structuredClone(doc);
    edited.content![0]!.content = [{ type: "text", text: "سلاما" }];
    const patch = frameContentPatch(frame, edited);
    expect(patch).toEqual({ text: "سلاما" });
    expect(patch && "paragraphAligns" in patch).toBe(false);
  });

  it("drops marks, hard breaks, dir, images, and flattens headings and lists", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center", dir: "rtl", directionMode: "rtl" },
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "hardBreak" },
            { type: "text", text: "rest" },
          ],
        },
        { type: "heading", attrs: { level: 1, textAlign: "left" }, content: [{ type: "text", text: "H" }] },
        { type: "image", attrs: { src: "x" } },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item" }] }] }],
        },
      ],
    } as FrameDocNode;
    const frame = docToFrame(doc, "right");
    expect(frame).toEqual({
      text: "boldrest\nH\nitem",
      textAlign: "right",
      paragraphAligns: ["center", "left", "right"],
      paragraphFormats: null,
    });
    expect(JSON.stringify(frame)).not.toContain("dir");
    expect(JSON.stringify(frame)).not.toContain("marks");
  });

  it("round-trips paragraph formats and collapses away empty format lists", () => {
    const frame = {
      text: "first\nsecond\nthird",
      textAlign: "right" as const,
      paragraphFormats: [
        { spaceBeforePt: 12, firstLineIndentMm: 5 },
        null,
        { leading: { mode: "points" as const, value: 24 } },
      ],
    };
    const doc = frameToDoc(frame.text, frame.textAlign, undefined, frame.paragraphFormats);
    expect(doc.content?.[0]?.attrs?.spaceBeforePt).toBe(12);
    expect(doc.content?.[0]?.attrs?.firstLineIndentMm).toBe(5);
    expect(doc.content?.[1]?.attrs?.spaceBeforePt).toBeUndefined();
    expect(doc.content?.[2]?.attrs?.leading).toEqual({ mode: "points", value: 24 });

    const restored = docToFrame(doc, frame.textAlign);
    expect(restored.paragraphFormats).toEqual([
      { spaceBeforePt: 12, firstLineIndentMm: 5 },
      null,
      { leading: { mode: "points", value: 24 } },
    ]);
    expect(frameContentPatch(frame, doc)).toBeNull();

    const emptyDoc = frameToDoc("a\nb", "left", undefined, [null, null]);
    expect(docToFrame(emptyDoc, "left").paragraphFormats).toBeNull();
  });

  it("does not add paragraphFormats to a legacy frame after text-only or align-only edit", () => {
    const legacy = { text: "سطر اول\nسطر دوم", textAlign: "right" as const };
    const doc = frameToDoc(legacy.text, legacy.textAlign);
    expect(frameContentPatch(legacy, doc)).toBeNull();

    // Text-only edit
    const textEdited = structuredClone(doc);
    textEdited.content![0]!.content = [{ type: "text", text: "بدلا ہوا سطر" }];
    const textPatch = frameContentPatch(legacy, textEdited);
    expect(textPatch).toEqual({ text: "بدلا ہوا سطر\nسطر دوم" });
    expect(textPatch && "paragraphFormats" in textPatch).toBe(false);
    expect(textPatch && "paragraphAligns" in textPatch).toBe(false);

    // Align-only edit
    const alignEdited = structuredClone(doc);
    alignEdited.content![0]!.attrs = { textAlign: "center" };
    const alignPatch = frameContentPatch(legacy, alignEdited);
    expect(alignPatch).toEqual({
      text: "سطر اول\nسطر دوم",
      textAlign: "right",
      paragraphAligns: ["center", "right"],
    });
    expect(alignPatch && "paragraphFormats" in alignPatch).toBe(false);
  });

  it("round-trips lineGapPt and keeps the key absent on a legacy frame", () => {
    const frame = {
      text: "first\nsecond",
      textAlign: "right" as const,
      paragraphFormats: [
        { lineGapPt: 6, spaceBeforePt: 4 },
        null,
      ],
    };
    const doc = frameToDoc(frame.text, frame.textAlign, undefined, frame.paragraphFormats);
    expect(doc.content?.[0]?.attrs?.lineGapPt).toBe(6);
    expect(doc.content?.[0]?.attrs?.spaceBeforePt).toBe(4);
    expect(doc.content?.[1]?.attrs?.lineGapPt).toBeUndefined();
    expect(docToFrame(doc, frame.textAlign).paragraphFormats).toEqual([
      { lineGapPt: 6, spaceBeforePt: 4 },
      null,
    ]);
    expect(frameContentPatch(frame, doc)).toBeNull();

    const legacy = { text: "first\nsecond", textAlign: "right" as const };
    const legacyDoc = frameToDoc(legacy.text, legacy.textAlign);
    expect(legacyDoc.content?.[0]?.attrs?.lineGapPt).toBeUndefined();
    expect(frameContentPatch(legacy, legacyDoc)).toBeNull();
    const textEdited = structuredClone(legacyDoc);
    textEdited.content![0]!.content = [{ type: "text", text: "first!" }];
    const textPatch = frameContentPatch(legacy, textEdited);
    expect(textPatch).toEqual({ text: "first!\nsecond" });
    expect(textPatch && "paragraphFormats" in textPatch).toBe(false);

    const gapped = structuredClone(legacyDoc);
    gapped.content![0]!.attrs = { ...(gapped.content![0]!.attrs ?? {}), lineGapPt: 6 };
    expect(frameContentPatch(legacy, gapped)).toEqual({
      text: "first\nsecond",
      paragraphFormats: [{ lineGapPt: 6 }, null],
    });

    const cleared = frameToDoc("a\nb", "left", undefined, [{ lineGapPt: null }, null]);
    expect(docToFrame(cleared, "left").paragraphFormats).toBeNull();
  });
});
