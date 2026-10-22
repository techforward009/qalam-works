import { autoLineHeight, blockAutoLineHeight } from "../app/tools/document-studio/utils/autoLeading";

describe("font-aware Auto leading", () => {
  test.each(["Mehr Nastaliq Web", "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu"])("%s gets room for Nastaliq ascenders", (font) => {
    expect(autoLineHeight(font)).toBe(2.2);
  });
  test("other fonts and explicit document leading stay unchanged", () => {
    expect(autoLineHeight("Arial")).toBe(1.5);
    expect(autoLineHeight("Mehr Nastaliq Web", 1.8)).toBe(1.8);
  });
  test("explicit paragraph 1.5 wins and run font overrides are respected", () => {
    const content = [{ type: "text", text: "السلام", marks: [{ type: "textStyle", attrs: { fontFamily: "Mehr Nastaliq Web" } }] }];
    expect(blockAutoLineHeight({ content }, "Arial", 1.5, "rtl")).toBe(2.2);
    expect(blockAutoLineHeight({ attrs: { lineHeight: 1.5 }, content }, "Arial", 1.5, "rtl")).toBe(1.5);
    expect(blockAutoLineHeight({ content }, "Arial", 1.5, "ltr")).toBe(1.5);
  });
});
