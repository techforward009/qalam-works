import { parseInPage } from "../app/tools/document-studio/utils/inpage/parseInPage";
import { inpageContainer, legacyInpage, unicodeInpage } from "./fixtures/inpage";

describe("InPage OLE2 text parser", () => {
  test("Unicode lengths preserve two stories, paragraphs and Arabic without stale font text", () => {
    const stories = [["سرخی"], ["یہ مرکزی کہانی ہے۔", "نص عربي 😀"]];
    const file = unicodeInpage(stories, "پرانا متن جو فونٹ بفر میں رہ گیا\r");
    expect(parseInPage(file)).toEqual({ version: 3, stories });
  });
  test("preserves an empty story between running heads and the main story", () => {
    const stories = [["سرخی"], [], ["پہلا پیراگراف", ""]];
    expect(parseInPage(unicodeInpage(stories))).toEqual({ version: 3, stories });
  });
  test.each(["InPage100", "InPage200"])("%s reverses digits and decodes composites, tabs and spaces", (name) => {
    const paragraph = [4, 0xd8, 4, 0xd5, 4, 0x20, 4, 0x81, 4, 0xb3, 9, 4, 0x81, 4, 0x82, 4, 0x20, 4, 0xa4, 4, 0xf3];
    expect(parseInPage(legacyInpage([paragraph], name))).toEqual({ version: 2, stories: [["۵۸ آ\tاب ی۔"]] });
  });
  test.each([
    { label: "CR-only", decoy: [] },
    { label: "short non-empty", decoy: [4, 0x81] },
  ])("legacy skips an early $label decoy and chooses the real two-paragraph table", ({ decoy }) => {
    const prefix = Buffer.alloc(32, 0xee);
    prefix.set([0, 0, 2, 0], 0);
    prefix.writeUInt32LE(decoy.length + 1, 4);
    prefix.set([...decoy, 13], 8);
    prefix.writeUInt32LE(0, 9 + decoy.length);
    const records = [[4, 0x81, 4, 0x8e, 4, 0x8b, 4, 0xa2], [4, 0x81, 4, 0x9f, 4, 0x81, 4, 0xa0, 4, 0x84]].flatMap((p) => {
      const length = Buffer.alloc(4);
      length.writeUInt32LE(p.length + 1);
      return [length, Buffer.from([...p, 13])];
    });
    expect(parseInPage(inpageContainer(Buffer.concat([prefix, ...records, Buffer.alloc(4)]), "InPage100")))
      .toEqual({ version: 2, stories: [["اردو", "امانت"]] });
  });
  test("book-length story tables do not repeatedly decode every suffix", () => {
    const paragraphs = Array.from({ length: 2000 }, (_, i) => `پیراگراف ${i}`);
    expect(parseInPage(unicodeInpage([paragraphs])).stories[0]).toEqual(paragraphs);
    expect(parseInPage(legacyInpage(Array.from({ length: 2000 }, () => [4, 0x81]))).stories[0]).toHaveLength(2000);
  });
  test("unsupported legacy glyphs fail the whole import rather than losing a paragraph", () => {
    expect(() => parseInPage(legacyInpage([[4, 0x81], [4, 0xff]]))).toThrow(/Unsupported InPage glyph/);
  });
  test("rejects invalid lengths rather than scanning stale Urdu", () => {
    const data = Buffer.alloc(16);
    data.writeUInt16LE(3, 2); data.writeUInt32LE(500, 4); data.writeUInt32LE(0xffffffff, 12);
    expect(() => parseInPage(inpageContainer(Buffer.concat([data, Buffer.from("پرانی عبارت\r", "utf16le")])))).toThrow(/paragraph lengths/);
  });
  test("rejects plain files, truncated containers and unsupported versions", () => {
    expect(() => parseInPage(new Uint8Array([1, 2]))).toThrow(/OLE2/);
    expect(() => parseInPage(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toThrow(/container/);
    expect(() => parseInPage(inpageContainer(Buffer.from([0, 0, 9, 0])))).toThrow(/Only InPage/);
  });
});
