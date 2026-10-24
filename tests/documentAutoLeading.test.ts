import { blockLeadingPt } from "../app/tools/document-studio/utils/autoLeading";
import { autoLeadingPt } from "../app/tools/document-studio/utils/leading";
const defaults = {bodyFontSizePt:12,lineHeight:1.5,leading:{mode:"auto" as const}};
describe("font-aware Auto point leading", () => {
  test.each(["Mehr Nastaliq Web", "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu"])("%s uses about 20pt at 12pt", font => {
    expect(autoLeadingPt(font,12)).toBeCloseTo(19.8);
  });
  test("other fonts and explicit leading use their point values", () => {
    expect(autoLeadingPt("Arial",12)).toBe(15);
    expect(blockLeadingPt({},"Mehr Nastaliq Web",{...defaults,leading:{mode:"points",value:5}},"rtl")).toBe(5);
  });
  test("legacy paragraph override migrates and run font overrides are respected", () => {
    const content = [{ type: "text", text: "السلام", marks: [{ type: "textStyle", attrs: { fontFamily: "Mehr Nastaliq Web" } }] }];
    expect(blockLeadingPt({ content },"Arial",defaults,"rtl")).toBeCloseTo(19.8);
    expect(blockLeadingPt({ attrs:{lineHeight:1.5},content },"Arial",defaults,"rtl")).toBe(18);
    expect(blockLeadingPt({ content },"Arial",defaults,"ltr")).toBe(15);
  });
});
