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
    expect(docToFrame(doc)).toEqual({ text: "", paragraphAligns: null });
  });

  it("keeps empty paragraphs, including a blank line between text", () => {
    expect(paragraphTexts(frameToDoc("\n\n", "right"))).toEqual(["", "", ""]);
    const doc = frameToDoc("a\n\nb", "right");
    expect(paragraphTexts(doc)).toEqual(["a", "", "b"]);
    expect(docToFrame(doc, "right")).toEqual({ text: "a\n\nb", textAlign: "right", paragraphAligns: null });
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
    expect(docToFrame(doc, "left")).toEqual({ text: "a\nb", textAlign: "center", paragraphAligns: null });
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
    });
    expect(JSON.stringify(frame)).not.toContain("dir");
    expect(JSON.stringify(frame)).not.toContain("marks");
  });
});
