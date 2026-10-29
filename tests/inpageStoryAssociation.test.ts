import { describe, expect, it } from "vitest";
import { associateOneInPageBoxStory, associateObservedInPageBoxStories, makeEditableInPageFrame } from "../app/tools/document-studio/utils/inpage/associateInPageStory";
import type { InPageObjectMetadata } from "../app/tools/document-studio/utils/inpage/parseInPageObjectMetadata";

const box = {
  kind: "text-box-candidate" as const,
  descriptorSubtype: 6 as const,
  storyReferenceCode: 7,
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
  it("maps the controlled two-box profile 6/ref 7 and profile 7/ref 9 to different text stories", () => {
    const second = { ...box, descriptorSubtype: 7 as const, descriptorOffset: 9542,
      storyReferenceCode: 9, candidateStoryIndex: undefined, xMm: 20, yMm: 50 };
    const main = [["یہ ایک طویل مرکزی عبارت ہے اور اس میں تمام عام معلومات موجود ہیں۔".repeat(5)]];
    const paragraphs = [[], [], [], [], [], [], ...main, ["یہ پہلا باکس ہے۔"], ["یہ دوسرا باکس ہے۔"]];
    const linked = associateObservedInPageBoxStories({version:3,candidates:[box, second]},paragraphs,6);
    expect(linked).toHaveLength(2);
    expect(linked.map(x => x.storyNumber)).toEqual([8,9]);
    expect(linked.map(x => x.text)).toEqual(["یہ پہلا باکس ہے۔", "یہ دوسرا باکس ہے۔"]);
    expect(linked.map(x => x.xMm)).toEqual([30,20]);
    expect(linked.map(x => x.yMm)).toEqual([16.54,50]);
    const swapped = associateObservedInPageBoxStories({version:3,candidates:[
      {...box,xMm:20,yMm:50},{...second,xMm:115,yMm:15}
    ]},paragraphs,6);
    expect(swapped.map(x => x.text)).toEqual(linked.map(x => x.text));
    expect(swapped.map(x => [x.xMm,x.yMm])).toEqual([[20,50],[115,15]]);
  });
  it("rejects unsupported multi-box reference patterns without guessing", () => {
    const second = { ...box, descriptorSubtype: 7 as const, descriptorOffset:9542,
      storyReferenceCode: 9, candidateStoryIndex: undefined };
    const paragraphs = [[],[],[],[],[],[],["یہ طویل مرکزی عبارت ہے".repeat(10)],["اول"],["دوم"]];
    expect(associateObservedInPageBoxStories({version:3,candidates:[box,{...second,storyReferenceCode:8}]},paragraphs,6)).toEqual([]);
    expect(associateObservedInPageBoxStories({version:3,candidates:[box,{...second,descriptorSubtype:6}]},paragraphs,6)).toEqual([]);
    expect(associateObservedInPageBoxStories({version:3,candidates:[box,second]},paragraphs,7)).toEqual([]);
    expect(associateObservedInPageBoxStories({version:3,candidates:[box,second]},[...paragraphs,[]],6)).toEqual([]);
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
  it("creates an editable local frame with source flag and geometry", () => {
    const match = associateOneInPageBoxStory(meta, stories, 6)!;
    expect(makeEditableInPageFrame(match, "document-1", { widthMm: 210, heightMm: 297 })).toMatchObject({
      id: "inpage-document-1-9484", page: 1, kind: "text", flip: false,
      text: stories[7].join("\n"),
      xMm: 30, yMm: 16.54, wMm: 70, hMm: 30,
      inPageSource: { version: 3, storyNumber: 8, descriptorOffset: 9484, runAround: "explicit-on" },
    });
  });
  it("refuses frames that fall outside the actual page or contain invalid text", () => {
    const match = associateOneInPageBoxStory(meta, stories, 6)!;
    expect(makeEditableInPageFrame(match, "doc", { widthMm: 80, heightMm: 80 })).toBeNull();
    expect(makeEditableInPageFrame({ ...match, xMm: -1 }, "doc", { widthMm: 210, heightMm: 297 })).toBeNull();
    expect(makeEditableInPageFrame({ ...match, yMm: Number.NaN }, "doc", { widthMm: 210, heightMm: 297 })).toBeNull();
    expect(makeEditableInPageFrame({ ...match, text: "" }, "doc", { widthMm: 210, heightMm: 297 })).toBeNull();
    expect(makeEditableInPageFrame(match, "", { widthMm: 210, heightMm: 297 })).toBeNull();
  });
  it("does not duplicate a story whose text equals the main text", () => {
    expect(associateOneInPageBoxStory(meta, stories.map((x, i) => i === 7 ? stories[6] : x), 6)).toBeNull();
  });
});
