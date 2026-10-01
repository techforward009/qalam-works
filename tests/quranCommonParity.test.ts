import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QURAN_READER_COPY } from "../app/quran/reader/copy";
import { QURAN_EDITIONS } from "../app/quran/editions";

describe("Quran common reader parity", () => {
  it("has shared English/Urdu reader copy", () => {
    for (const language of ["en", "ur"] as const) {
      expect(QURAN_READER_COPY[language].search).toBeTruthy();
      expect(QURAN_READER_COPY[language].copy).toBeTruthy();
      expect(QURAN_READER_COPY[language].display).toBeTruthy();
      expect(QURAN_READER_COPY[language].previousPage).toBeTruthy();
      expect(QURAN_READER_COPY[language].nextPage).toBeTruthy();
    }
  });

  it("keeps the three page models explicit", () => {
    expect(QURAN_EDITIONS.map((edition) => edition.layoutModel)).toEqual([
      "flowing-text-with-page-boundaries",
      "flowing-text-with-page-boundaries",
      "native-15-line-page-layout",
    ]);
  });

  it("uses the shared keyboard and edition-header components in all readers", () => {
    for (const file of [
      "app/quran/QuranReader.tsx",
      "app/quran/indopak-digital-khatt/DigitalKhattReader.tsx",
      "app/quran/madinah/MadinahReader.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toContain("EditionTopBar");
    }
    for (const file of [
      "app/quran/indopak-digital-khatt/DigitalKhattReader.tsx",
      "app/quran/madinah/MadinahReader.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toContain("useQuranKeyboardNavigation");
      expect(readFileSync(file, "utf8")).toContain("QURAN_READER_COPY");
    }
  });
});
