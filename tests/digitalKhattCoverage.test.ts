import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isQuranicCodePoint, missingQuranicCodePoints, readWoff2Cmap, splitQuranicRuns } from "../app/tools/document-studio/utils/digitalKhattCoverage";

describe("Digital Khatt coverage", () => {
  const cmap = readWoff2Cmap(readFileSync("public/fonts/DigitalKhattIndoPak.woff2"));

  it("reads the real font cmap", () => {
    expect(cmap.has(0x0627)).toBe(true);
    expect(cmap.has(0x064e)).toBe(true);
    expect(cmap.has(0x06da)).toBe(true);
    expect(cmap.has(0x002e)).toBe(false);
    expect(cmap.has(0x06d7)).toBe(false);
  });

  it("keeps Quranic text together and peels a Latin period", () => {
    expect(splitQuranicRuns("اَلْحَمْدُ.")).toEqual([
      { text: "اَلْحَمْدُ", quranic: true },
      { text: ".", quranic: false },
    ]);
    expect(isQuranicCodePoint(0x002e)).toBe(false);
    expect(isQuranicCodePoint(0x06d7)).toBe(true);
  });

  it("names a Quranic mark the font does not contain", () => {
    expect(missingQuranicCodePoints("ا\u06D7", cmap)).toEqual([0x06d7]);
    expect(missingQuranicCodePoints("ا.", cmap)).toEqual([]);
  });
});
