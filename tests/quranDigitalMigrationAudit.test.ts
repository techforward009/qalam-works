import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HAFS_AYAH_COUNTS } from "../app/tools/arabic-diacritics/quran/hafsCounts";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { publicDigitalKhattQuranReference, DIGITAL_KHATT_TEXT_SOURCE } from "../app/tools/arabic-diacritics/quran/publicDigitalKhattProvider";

const stops = /[\u0614-\u0617\u06D6-\u06DC\u08D5-\u08DF]/gu;
describe("DigitalKhatt immutable public Quran audit", () => {
  it("preserves all 114 chapter counts and 6236 exact source strings", () => {
    const digital = publicDigitalKhattQuranReference.listAyahs();
    const source = JSON.parse(readFileSync("public/quran/indopak-digital-khatt.json","utf8"));
    expect(digital).toHaveLength(6236);
    expect(Object.keys(source)).toHaveLength(114);
    let offset = 0;
    for (let surah = 1; surah <= 114; surah++) {
      const rows = source[String(surah)];
      expect(rows).toHaveLength(HAFS_AYAH_COUNTS[surah - 1]);
      for(const row of rows) {
        const actual = digital[offset++];
        expect(actual.surah).toBe(surah);
        expect(actual.ayah).toBe(row.verse);
        expect(actual.text).toBe(row.text);
      }
    }
    expect(DIGITAL_KHATT_TEXT_SOURCE.upstreamLicense).toBe("MIT");
    expect(DIGITAL_KHATT_TEXT_SOURCE.distributionLicense).toBe("CC BY-SA 4.0");
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
    expect(differentText).toBe(6236);
    expect(differentWaqf).toBe(3758);
    expect(a[0].text).toMatch(/^بِسْمِ/);
    expect(d[0].text).toMatch(/^اَلْحَمْدُ/);
  });
  it("never exposes private Muhammadi font from the public global stylesheet", () => {
    const css = readFileSync("app/globals.css","utf8");
    expect(css).not.toMatch(/font-family:\s*"Muhammadi Quranic"/);
    expect(css).not.toContain("muhammadi-quranic-400.woff2");
    expect(readFileSync("app/my/quran/owner.module.css","utf8")).toContain("/api/my/quran/font");
    expect(readFileSync("app/my/quran/page.tsx","utf8")).toContain("hasOwnerSession()");
  });
});
