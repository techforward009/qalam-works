import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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

  it("keeps each edition's route and page model distinct", () => {
    const routes = QURAN_EDITIONS.map((edition) => edition.route);
    expect(new Set(routes).size).toBe(3);
    expect(routes).toContain("/quran/1/1");
    expect(routes).toContain("/quran/indopak-digital-khatt/1/1");
    expect(routes).toContain("/quran/madinah/1/1");
    expect(QURAN_EDITIONS[0]?.lineCount).toBeNull();
    expect(QURAN_EDITIONS[1]?.lineCount).toBeNull();
    expect(QURAN_EDITIONS[2]?.lineCount).toBe(15);
  });

  it("uses the final AhmedGraf wording and structured provenance", () => {
    const first = getQuranEdition("qalam-indopak");
    expect(first.description.en).toBe("IndoPak Quran text from AhmedGraf.");
    expect(first.rendering.en).toBe("AhmedGraf text + Font");
    expect(first.rendering.ur).toBe("احمد گراف کا انڈو پاک متن + فونٹ");
    expect(first.provenance.textSource).toContain("AhmedGraf");
    expect(first.provenance.fontSource).toContain("Muhammadi Quranic");
  });

  it("keeps the readers linked back to the Quran center", () => {
    for (const file of [
      "app/quran/QuranReader.tsx",
      "app/quran/indopak-digital-khatt/DigitalKhattReader.tsx",
      "app/quran/madinah/MadinahReader.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("EditionTopBar");
    }
    const topBar = readFileSync("app/quran/reader/EditionTopBar.tsx", "utf8");
    expect(topBar).toContain('href="/quran"');
    expect(topBar).toContain("قرآن کے تمام ایڈیشنز");
    expect(topBar).toContain("All Quran Editions");
  });
});
