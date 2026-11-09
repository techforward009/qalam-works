import { describe, expect, it } from "vitest";
import {
  applyParagraphAlignment,
  collapseParagraphAligns,
  createFrameHistory,
  isParagraphAlignList,
  paragraphTextPatch,
  realignAfterTextEdit,
  resolvedParagraphAligns,
  toolbarParagraphAlign,
} from "../app/tools/document-studio/utils/paragraphAlign";

const mixed = ["justify", "center", "right"] as const;

describe("paragraph alignment", () => {
  it("keeps a legacy frame on one alignment until a paragraph is changed", () => {
    expect(isParagraphAlignList(undefined)).toBe(false);
    expect(resolvedParagraphAligns("ایک\nدو", "justify", undefined)).toEqual(["justify", "justify"]);
    const changed = applyParagraphAlignment("ایک\nدو", "justify", undefined, 4, 4, "center");
    expect(changed).toEqual({ textAlign: "justify", paragraphAligns: ["justify", "center"] });
    expect(applyParagraphAlignment("ایک\nدو", "justify", changed.paragraphAligns ?? undefined, 0, 0, "left")).toEqual({
      textAlign: "justify",
      paragraphAligns: ["left", "center"],
    });
  });

  it("updates every paragraph covered by a selection and leaves the others", () => {
    const text = "ایک\nدو\nتین";
    expect(applyParagraphAlignment(text, undefined, mixed, 0, text.length, "justify-all")).toEqual({
      textAlign: "justify-all",
      paragraphAligns: null,
    });
    expect(applyParagraphAlignment(text, undefined, mixed, 4, text.indexOf("تین") + 1, "left")).toEqual({
      textAlign: undefined,
      paragraphAligns: ["justify", "left", "left"],
    });
  });

  it("inherits the edited paragraph through Enter, splits, merges and empty paragraphs", () => {
    expect(realignAfterTextEdit("پہلا\nدوسرا", "پہلا\n\nدوسرا", undefined, mixed.slice(0, 2))).toEqual({
      textAlign: undefined,
      paragraphAligns: ["justify", "justify", "center"],
    });
    expect(realignAfterTextEdit("پہلا\nدوسرا", "پہ\nلا\nدوسرا", undefined, ["right", "center"])).toEqual({
      textAlign: undefined,
      paragraphAligns: ["right", "right", "center"],
    });
    expect(realignAfterTextEdit("پہلا\nدوسرا", "پہلادوسرا", "justify", ["justify", "center"])).toEqual({
      textAlign: "justify",
      paragraphAligns: null,
    });
    expect(realignAfterTextEdit("ایک\n\nتین", "ایک\nتین", undefined, ["left", "center", "right"])).toEqual({
      textAlign: undefined,
      paragraphAligns: ["left", "right"],
    });
    expect(realignAfterTextEdit("پہلا\nدوسرا", "پہلا\n\nدوسرا", undefined, ["justify", "center"], { start: 4, end: 4 })).toEqual({
      textAlign: undefined,
      paragraphAligns: ["justify", "justify", "center"],
    });
    expect(realignAfterTextEdit("پہلا\nدوسرا", "پہلا\n\nدوسرا", undefined, ["justify", "center"], { start: 5, end: 5 })).toEqual({
      textAlign: undefined,
      paragraphAligns: ["justify", "center", "center"],
    });
    expect(paragraphTextPatch({ text: "ایک\nدو", textAlign: "right", paragraphAligns: ["right", "left"] }, "ایک\nدو\n")).toEqual({
      text: "ایک\nدو\n",
      textAlign: "right",
      paragraphAligns: ["right", "left", "left"],
    });
    expect(paragraphTextPatch({ text: "ایک", textAlign: "center", singleLine: true, paragraphAligns: ["left"] }, "ایک نیا")).toEqual({ text: "ایک نیا" });
    expect(paragraphTextPatch({ text: "ایک\nدو", textAlign: "center" }, "ایک\nدو\nسہ")).toEqual({ text: "ایک\nدو\nسہ" });
  });

  it("collapses one shared alignment back to the legacy field", () => {
    expect(collapseParagraphAligns("justify", ["center", "center"])).toEqual({ textAlign: "center", paragraphAligns: null });
    expect(collapseParagraphAligns(undefined, [null, null])).toEqual({ textAlign: undefined, paragraphAligns: null });
  });

  it("reports one toolbar alignment, or mixed when the selection disagrees", () => {
    const text = "ایک\nدو\nتین";
    expect(toolbarParagraphAlign(text, "justify", undefined, 0, 0)).toBe("justify");
    expect(toolbarParagraphAlign(text, undefined, mixed, 0, 0)).toBe("justify");
    expect(toolbarParagraphAlign(text, undefined, mixed, text.indexOf("دو"), text.indexOf("دو"))).toBe("center");
    expect(toolbarParagraphAlign(text, undefined, mixed, 0, text.length)).toBe("mixed");
  });

  it("restores paragraph alignment with undo and redo", () => {
    const history = createFrameHistory();
    const before = { text: "ایک\nدو", textAlign: "justify" as const, paragraphAligns: ["justify" as const, "center" as const], start: 4, end: 4 };
    history.remember(before);
    const after = { text: "ایک\n\nدو", textAlign: undefined, paragraphAligns: ["justify" as const, "justify" as const, "center" as const], start: 5, end: 5 };
    expect(history.undo(after)).toEqual(before);
    expect(history.redo(before)?.paragraphAligns).toEqual(after.paragraphAligns);
    expect(history.undo(after)).toEqual(before);
    expect(history.undo(before)).toBeNull();
  });
});
