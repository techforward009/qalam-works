import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HAFS_AYAH_COUNTS } from "../app/tools/arabic-diacritics/quran/hafsCounts";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { publicDigitalKhattQuranReference, DIGITAL_KHATT_TEXT_SOURCE } from "../app/tools/arabic-diacritics/quran/publicDigitalKhattProvider";
import { alignDigitalKhattToTranslation, DIGITAL_KHATT_BASMILLAH } from "../app/quran/indopak-digital-khatt/data";
import { translationGlobalIndex } from "../app/quran/reader/translationCorpus";

const stops = /[\u0614-\u0617\u06D6-\u06DC\u08D5-\u08DF]/gu;
describe("DigitalKhatt immutable public Quran audit", () => {
  it("preserves all 114 chapter counts and 6236 exact source strings", () => {
    const digital = publicDigitalKhattQuranReference.listAyahs();
    const source = JSON.parse(readFileSync("public/quran/indopak-digital-khatt.json","utf8"));
    expect(digital).toHaveLength(6236);
    expect(Object.keys(source)).toHaveLength(114);
    const aligned = alignDigitalKhattToTranslation(source);
    let offset = 0;
    for (let surah = 1; surah <= 114; surah++) {
      const rows = source[String(surah)];
      expect(rows).toHaveLength(HAFS_AYAH_COUNTS[surah - 1]);
      for(const row of rows) {
        const actual = digital[offset++];
        expect(actual.surah).toBe(surah);
        expect(actual.ayah).toBe(row.verse);
        expect(actual.text).toBe(aligned[String(surah)][row.verse - 1].text);
        if (surah !== 1) expect(actual.text).toBe(row.text);
        expect(translationGlobalIndex(surah, row.verse)).toBe(offset - 1);
      }
    }
    expect(DIGITAL_KHATT_TEXT_SOURCE.upstreamLicense).toBe("MIT");
    expect(DIGITAL_KHATT_TEXT_SOURCE.distributionLicense).toBe("CC BY-SA 4.0");
  });
  it("realigns every Fatiha verse to the current Urdu translation while keeping all upstream marks", () => {
    const raw = JSON.parse(readFileSync("public/quran/indopak-digital-khatt.json","utf8"));
    const original = raw["1"].map((row: {text: string}) => row.text);
    const expected = [DIGITAL_KHATT_BASMILLAH,
      ...original.slice(0, 5), original[5] + " " + original[6]];
    expect(expected).toHaveLength(7);
    for (let ayah = 1; ayah <= 7; ayah++) {
      expect(publicDigitalKhattQuranReference.getAyah(1, ayah)?.text).toBe(expected[ayah - 1]);
      expect(translationGlobalIndex(1, ayah)).toBe(ayah - 1);
    }
    expect(expected.slice(1).join(" ")).toBe(original.join(" "));
    expect((expected.slice(1).join("").match(stops) ?? []).join("")).toBe((original.join("").match(stops) ?? []).join(""));
    expect(readFileSync("app/quran/indopak-digital-khatt/DigitalKhattReader.tsx","utf8")).toContain("alignDigitalKhattToTranslation(value)");
    expect(readFileSync("app/quran/QuranReader.tsx","utf8")).toContain('kind: "bismillah", id: ayah.id, surah: 1');
  });
  it("documents rather than normalizes every waqf and Fatiha difference", () => {
    const a = ahmedgrafQuranReference.listAyahs();
    const d = publicDigitalKhattQuranReference.listAyahs();
    let differentText = 0, differentWaqf = 0;
    for(let i=0;i<6236;i++){
      expect(d[i].id).toBe(a[i].id);
      if(d[i].text!==a[i].text)differentText++;
      if((d[i].text.match(stops)??[]).join("") !== (a[i].text.match(stops)??[]).join("")) differentWaqf++;
    }
    expect(differentText).toBeGreaterThan(6200);
    expect(differentWaqf).toBeGreaterThan(3700);
    expect(a[0].text).toMatch(/^بِسْمِ/);
    expect(d[0].text).toBe(DIGITAL_KHATT_BASMILLAH);
    expect(d[1].text).toMatch(/^اَلْحَمْدُ/);
  });
  it("never exposes private Muhammadi font from the public global stylesheet", () => {
    const css = readFileSync("app/globals.css","utf8");
    expect(css).not.toMatch(/font-family:\s*"Muhammadi Quranic"/);
    expect(css).not.toContain("muhammadi-quranic-400.woff2");
    expect(readFileSync("app/my/quran/owner.module.css","utf8")).toContain("/api/my/quran/font");
    expect(readFileSync("app/my/quran/page.tsx","utf8")).toContain("hasOwnerSession()");
  });
});
