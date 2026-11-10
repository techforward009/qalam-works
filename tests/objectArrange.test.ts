import { describe, expect, it } from "vitest";
import { bringFramesToFront, sendFramesToBack } from "../app/tools/document-studio/utils/objectArrange";

function item(id: string, kind: string) {
  return { id, kind };
}

describe("object arrange", () => {
  const frames = [
    item("text", "text"),
    item("picture", "picture-rect"),
    item("shape", "ellipse"),
    item("line", "line"),
  ];

  it("sends selected frames behind unselected ones and keeps relative order", () => {
    expect(sendFramesToBack(frames, ["line", "picture"]).map((frame) => frame.id)).toEqual([
      "picture", "line", "text", "shape",
    ]);
    expect(sendFramesToBack(frames, ["text"]).map((frame) => frame.id)).toEqual([
      "text", "picture", "shape", "line",
    ]);
  });

  it("brings selected frames in front of unselected ones and keeps relative order", () => {
    expect(bringFramesToFront(frames, ["text", "shape"]).map((frame) => frame.id)).toEqual([
      "picture", "line", "text", "shape",
    ]);
    expect(bringFramesToFront(frames, ["line"]).map((frame) => frame.id)).toEqual([
      "text", "picture", "shape", "line",
    ]);
  });

  it("leaves an empty selection unchanged", () => {
    expect(sendFramesToBack(frames, []).map((frame) => frame.id)).toEqual(["text", "picture", "shape", "line"]);
    expect(bringFramesToFront(frames, []).map((frame) => frame.id)).toEqual(["text", "picture", "shape", "line"]);
  });
});
