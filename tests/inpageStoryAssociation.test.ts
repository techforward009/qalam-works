import { describe, expect, it } from "vitest";
import { associateOneInPageBoxStory } from "../app/tools/document-studio/utils/inpage/associateInPageStory";
import type { InPageObjectMetadata } from "../app/tools/document-studio/utils/inpage/parseInPageObjectMetadata";

const box = {
  kind: "text-box-candidate" as const,
  descriptorOffset: 9484,
  xMm: 30, yMm: 16.54, widthMm: 70, heightMm: 30,
  runAround: "explicit-on" as const,
  candidateStoryIndex: 7,
};
const meta: InPageObjectMetadata = { version: 3, candidates: [box] };
const stories: string[][] = [
  [], [], [], [], [], [""],
  ["یہ ایک لمبی مرکزی عبارت ہے۔", "مزید معلومات والا پیراگراف۔"],
  ["یہ ٹیکسٹ باکس کی عبارت ہے۔", "اس کے اندر دو سطریں ہیں۔"],
];

describe("experimental InPage object-to-story association stays opt-in", () => {
  it("links explicit 0x82 index 7 to eighth story when main is separate", () => {
    expect(associateOneInPageBoxStory(meta, stories, 6)).toMatchObject({
      storyNumber: 8,
      descriptorOffset: 9484,
      text: stories[7].join("\n"),
      xMm: 30, yMm: 16.54, widthMm: 70, heightMm: 30,
      runAround: "explicit-on",
    });
  });
  it("rejects matching the main story: prevents duplicate paragraph text", () => {
    expect(associateOneInPageBoxStory(meta, stories, 7)).toBeNull();
  });
  it("rejects ambiguous multiple boxes and missing metadata", () => {
    expect(associateOneInPageBoxStory({ ...meta, candidates: [box, box] }, stories, 6)).toBeNull();
    expect(associateOneInPageBoxStory(null, stories, 6)).toBeNull();
  });
  it("rejects missing index, unknown index, empty stories and oversized text", () => {
    expect(associateOneInPageBoxStory({ ...meta, candidates: [{ ...box, candidateStoryIndex: undefined }] }, stories, 6)).toBeNull();
    expect(associateOneInPageBoxStory({ ...meta, candidates: [{ ...box, candidateStoryIndex: 63 }] }, stories, 6)).toBeNull();
    expect(associateOneInPageBoxStory(meta, stories.map((x, i) => i === 7 ? [""] : x), 6)).toBeNull();
    expect(associateOneInPageBoxStory(meta, stories.map((x, i) => i === 7 ? ["ا".repeat(20001)] : x), 6)).toBeNull();
  });
  it("does not duplicate a story whose text equals the main text", () => {
    expect(associateOneInPageBoxStory(meta, stories.map((x, i) => i === 7 ? stories[6] : x), 6)).toBeNull();
  });
});
