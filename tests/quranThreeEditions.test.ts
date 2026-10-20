import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import raw from "../public/quran/indopak-digital-khatt.json";
import {HAFS_AYAH_COUNTS} from "../app/tools/arabic-diacritics/quran/hafsCounts";
import {publicDigitalKhattQuranReference as digital} from "../app/tools/arabic-diacritics/quran/publicDigitalKhattProvider";
import {ahmedgrafQuranReference as ahmed} from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import {DIGITAL_KHATT_BASMILLAH,alignDigitalKhattToTranslation} from "../app/quran/indopak-digital-khatt/data";
import {translationGlobalIndex} from "../app/quran/reader/translationCorpus";
import {QURAN_EDITIONS} from "../app/quran/editions";
import {resolveEditorFontFamily} from "../app/tools/document-studio/utils/fontRegistry";

describe("new Quran edition rules",()=>{
 it("starts on Madinah; Digital follows and Ahmed Grafics stays third",()=>{
   expect(QURAN_EDITIONS.map(e=>e.id)).toEqual(["madinah-v2","digital-khatt","qalam-indopak"]);
   expect(readFileSync("app/quran/page.tsx","utf8")).toContain("/quran/madinah/1/1");
   expect(readFileSync("app/quran/[surah]/[ayah]/page.tsx","utf8")).toContain("/quran/indopak-digital-khatt/");
   expect(readFileSync("app/quran/layout.tsx","utf8")).not.toContain("QuranThemeControl");
 });
 it("aligns precisely all 114 surahs to existing Urdu translation verse numbering",()=>{
   const originalRaw=raw as Record<string,{chapter:number;verse:number;text:string}[]>;
   const aligned=alignDigitalKhattToTranslation(originalRaw);
   let offset=0;
   const original=raw["1"].map(row=>row.text);
   expect(aligned["1"].map(row=>row.text)).toEqual([
     DIGITAL_KHATT_BASMILLAH,...original.slice(0,5),original[5]+" "+original[6]]);
   const waqf=/[\u0614-\u0617\u06D6-\u06DC\u08D5-\u08DF]/gu;
   expect((aligned["1"].slice(1).map(v=>v.text).join("").match(waqf)??[]).join(""))
     .toBe((original.join("").match(waqf)??[]).join(""));
   for(let s=1;s<=114;s++){
     const source=originalRaw[String(s)],shown=aligned[String(s)];
     expect(shown).toHaveLength(HAFS_AYAH_COUNTS[s-1]);
     for(let a=1;a<=shown.length;a++){
       expect(digital.getAyah(s,a)?.text).toBe(shown[a-1].text);
       expect(translationGlobalIndex(s,a)).toBe(offset);
       if(s!==1)expect(shown[a-1].text).toBe(source[a-1].text);
       offset++;
     }
   }
   expect(offset).toBe(6236);
 });
 it("Ahmed Graf source stays untouched and every source verse can be copied unnormalized",()=>{
   const rows=ahmed.listAyahs();
   expect(rows).toHaveLength(6236);
   const file=readFileSync("app/tools/arabic-diacritics/quran/data/quran-simple.txt","utf8");
   expect(file).toContain("ahmedgraf.com");
   expect(ahmed.getMetadata().referenceLicense.length).toBeGreaterThan(0);
   expect(readFileSync("app/quran/QuranReader.tsx","utf8")).toContain("ahmedReaderModel.getReaderAyah(item.surah,item.ayah)");
   expect(readFileSync("app/quran/QuranReader.tsx","utf8")).toContain("https://ahmedgraf.com");
 });
 it("public pages never request Muhammadi; legacy saved docs map to licensed Digital Khatt",()=>{
   const css=readFileSync("app/globals.css","utf8");
   const editions=readFileSync("app/quran/editions.ts","utf8");
   const catalog=readFileSync("app/tools/document-studio/utils/publicBlobFontCatalog.ts","utf8");
   expect(css).not.toContain("muhammadi-quranic-400.woff2");
   expect(editions).not.toContain("Muhammadi Quranic");
   expect(catalog).not.toContain("muhammadi-quranic");
   expect(readFileSync("app/tools/document-studio/utils/fontRegistry.ts","utf8")).toContain('QURAN_FONT_FALLBACK_FAMILY = "Digital Khatt Indo-Pak"');
   expect(readFileSync("app/tools/document-studio/utils/documentLibrary.ts","utf8")).toContain('"digital-khatt-indo-pak"');
   expect(readFileSync("app/quran/madinah/MadinahReader.tsx","utf8")).not.toContain("QuranTranslationPage");
   expect(readFileSync("app/quran/madinah/MadinahReader.tsx","utf8")).not.toContain("QuranTafsirPage");
   expect(resolveEditorFontFamily("Muhammadi Quranic","rtl").docxFamily).toBe("Digital Khatt Indo-Pak");
   expect(resolveEditorFontFamily("Asif Quranic","rtl").docxFamily).toBe("Scheherazade New");
 });
});
