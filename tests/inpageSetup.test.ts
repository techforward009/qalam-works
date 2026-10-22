import { readFileSync } from "node:fs";
import { parseInPageSetup } from "../app/tools/document-studio/utils/inpage/parseInPageSetup";
import { settingsFromInPageSetup } from "../app/tools/document-studio/utils/inpage/inpageSetupSettings";
import { parseInPage } from "../app/tools/document-studio/utils/inpage/parseInPage";
import { applyPresetToSettings } from "../app/tools/document-studio/utils/publishingPresets";
import { parseDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { resolvePageLayout, resolvePhysicalMargins } from "../app/tools/document-studio/utils/pageLayout";
import { inpageContainer, unicodeInpage } from "./fixtures/inpage";

const a4 = { width: 1190551, height: 1683779, inside: 72000, top: 72000, outside: 72000, bottom: 72000, first: 1 };
function syntheticSetup(values = a4, offset = 0x213) {
  const data = Buffer.alloc(offset + 42, 0xee);
  data.set([0, 0, 2, 0]);
  [values.first, values.width, values.height, values.inside, values.top, values.outside, values.bottom].forEach((value, i) => {
    data.writeUInt16LE([0x104, 0x106, 0x107, 0x108, 0x109, 0x10a, 0x10b][i], offset + i * 6);
    data.writeUInt32LE(value, offset + i * 6 + 2);
  });
  return inpageContainer(data, "InPage100");
}

describe("optional InPage document setup", () => {
  test("real uploaded fixture matches A5, physical margins and first page 77", () => {
    const file = readFileSync("tests/fixtures/inpage/hadiyat.inp");
    expect(file.length).toBeLessThan(300 * 1024);
    const setup = parseInPageSetup(file)!;
    expect(setup).not.toBeNull();
    expect(setup.widthPt).toBeCloseTo(419.53, 2);
    expect(setup.heightPt).toBeCloseTo(595.28, 2);
    expect(setup.marginsPt.inside).toBeCloseTo(57.6, 2);
    expect(setup.marginsPt.top).toBeCloseTo(50.98, 2);
    expect(setup.marginsPt.outside).toBeCloseTo(57.6, 2);
    expect(setup.marginsPt.bottom).toBeCloseTo(32.98, 2);
    expect(setup.firstPageNumber).toBe(77);
    expect(parseInPage(file).stories.some((story) => story.length > 1)).toBe(true);
    const settings = parseDocumentSettings(settingsFromInPageSetup(setup));
    expect(settings.page.size).toBe("a5");
    expect(settings.page.firstPageNumber).toBe(77);
    expect(applyPresetToSettings(settings, "default").page.customSizeMm).toBeUndefined();
    const layout = resolvePageLayout({ size: settings.page.size, orientation: settings.page.orientation, customSizeMm: settings.page.customSizeMm, marginPreset: "custom", customMargins: settings.page.margins });
    expect(layout.widthMm * 72 / 25.4).toBeCloseTo(setup.widthPt, 8);
    expect(layout.heightMm * 72 / 25.4).toBeCloseTo(setup.heightPt, 8);
    expect(resolvePhysicalMargins(layout.margins, "rtl").leftMm * 72 / 25.4).toBeCloseTo(57.6, 8);
  });
  test("synthetic v2 locates shifted tags and converts A4 and half-inch margins", () => {
    expect(parseInPageSetup(syntheticSetup())).toEqual({ widthPt: 595.2755, heightPt: 841.8895, marginsPt: { inside: 36, top: 36, outside: 36, bottom: 36 }, firstPageNumber: 1 });
  });
  test.each([
    { ...a4, width: 0 }, { ...a4, height: 0xffffffff },
    { ...a4, inside: a4.width }, { ...a4, top: a4.height },
    { ...a4, outside: 0xffffffff }, { ...a4, bottom: a4.height }, { ...a4, first: 0 },
  ])("invalid dimensions, margins or numbering are ignored: %j", (values) => {
    expect(parseInPageSetup(syntheticSetup(values))).toBeNull();
  });
  test("missing/damaged setup is optional and does not discard valid text", () => {
    const file = unicodeInpage([["متن برقرار ہے۔"]]);
    expect(parseInPageSetup(file)).toBeNull();
    expect(parseInPage(file).stories).toEqual([["متن برقرار ہے۔"]]);
    expect(parseInPageSetup(new Uint8Array([1, 2]))).toBeNull();
  });
  test("zero and large valid margins survive the settings model without old UI clamping", () => {
    const setup = parseInPageSetup(syntheticSetup({ ...a4, width: 2000000, height: 3000000, inside: 0, outside: 900000 }))!;
    const settings = parseDocumentSettings(settingsFromInPageSetup(setup));
    const layout = resolvePageLayout({ size: settings.page.size, orientation: settings.page.orientation, customSizeMm: settings.page.customSizeMm, marginPreset: "custom", customMargins: settings.page.margins });
    const physical = resolvePhysicalMargins(layout.margins, "rtl");
    expect(physical.leftMm).toBe(0);
    expect(physical.rightMm * 72 / 25.4).toBeCloseTo(450, 8);
  });
});
