import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QURAN_EDITIONS, getQuranEdition } from "../app/quran/editions";

describe("Quran edition registry", () => {
  it("registers exactly the three current Quran editions", () => {
    expect(QURAN_EDITIONS).toHaveLength(3);
    expect(QURAN_EDITIONS.map((edition) => edition.id)).toEqual([
      "qalam-indopak",
      "digital-khatt",
      "madinah-v2",
    ]);
  });

  it("keeps each edition's route distinct", () => {
    const routes = QURAN_EDITIONS.map((edition) => edition.route);
    expect(new Set(routes).size).toBe(3);
    expect(routes).toContain("/quran/1/1");
    expect(routes).toContain("/quran/indopak-digital-khatt/1/1");
    expect(routes).toContain("/quran/madinah/1/1");
  });

  it("resolves all registered editions by id", () => {
    for (const edition of QURAN_EDITIONS) {
      expect(getQuranEdition(edition.id)).toEqual(edition);
    }
  });

  it("uses the approved AhmedGraf wording and links every reader back to the center", () => {
    expect(QURAN_EDITIONS[0]?.description).toBe("IndoPak Quran text from AhmedGraf.");
    for (const file of [
      "app/quran/QuranReader.tsx",
      "app/quran/indopak-digital-khatt/DigitalKhattReader.tsx",
      "app/quran/madinah/MadinahReader.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain('href="/quran"');
      expect(source).toContain("All Quran Editions");
      expect(source).toContain("قرآن کے تمام ایڈیشنز");
    }
  });
});
