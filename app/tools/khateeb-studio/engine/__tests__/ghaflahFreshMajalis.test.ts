import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PreparedSeriesSession from "../../PreparedSeriesSession";
import { preparedQuranSourceTexts, preparedArabicSourceTexts } from "../preparedSeries";
import { readFileSync } from "node:fs";
import { HAFS_AYAH_COUNTS } from "../../../arabic-diacritics/quran/hafsCounts";
import { ahmedgrafQuranReference } from "../../../arabic-diacritics/quran/ahmedgrafProvider";
import { quranTranslationFor } from "../quranTranslationProvider";
import { describe, it, expect } from "vitest";
import { GHAF_LAH_FRESH_FIVE } from "../ghaflahFreshMajalis";
import { buildFreshMajlisSeries } from "../freshPulpitSeries";
import { getTopicDossier } from "../topicDossier";
import { buildSessionWorkbench, buildSessionWorkbenchText } from "../sessionWorkbench";
import { verifiedHadithForDossierText } from "../verifiedHadithCorpus";
import { estimatePreparedSpeech } from "../preparedSeries";
describe("Ghaflah fresh five ready-to-deliver manuscript",()=>{
 it("preserves Ahmedgraf Qur'an with Muhammadi font in the five ready majalis",()=>{
   const css=readFileSync("app/globals.css","utf8");
   expect(css).toContain('.qalam-book-arabic {');
   expect(css).not.toContain(".qalam-book-arabic .khateeb-muhammadi-quranic");
   for(const session of GHAF_LAH_FRESH_FIVE.sessions){
     const prep=session.preparation!;
     const canonical=preparedQuranSourceTexts(prep);
     const arabic=preparedArabicSourceTexts(prep);
     expect(canonical.size).toBeGreaterThanOrEqual(2);
     for(const location of prep.quran){
       const ayah=ahmedgrafQuranReference.getAyah(location.surah,location.ayah)?.text;
       expect(ayah).toBeTruthy();
       expect(canonical.has(ayah)).toBe(true);
       expect(arabic.has(ayah)).toBe(true);
     }
     const html=renderToStaticMarkup(createElement(PreparedSeriesSession,{
       session,duration:20,locale:"ur",onCopy:async()=>{},
     }));
     for(const location of prep.quran){
       const ayah=ahmedgrafQuranReference.getAyah(location.surah,location.ayah)!.text;
       const offset=html.indexOf(ayah);
       expect(offset).toBeGreaterThan(0);
       const preceding=html.slice(Math.max(0,offset-200),offset);
       expect(preceding).toMatch(/<span dir="rtl" lang="ar" class="khateeb-muhammadi-quranic">$/);
     }
   }
 });

 it("matches each new Najafi/Qara'i pair to the exact canonical reader translation, no paraphrases",()=>{
  const verses=[[7,179],[21,1],[59,19],[102,1],[57,16],[24,37],[63,9],[17,23],[50,22],[7,201]] as const;
  for(const [surah,ayah] of verses){
    const i=HAFS_AYAH_COUNTS.slice(0,surah-1).reduce((a,b)=>a+b,0)+ayah-1;
    const chunk=String(Math.floor(i/256)).padStart(2,"0");
    const published=JSON.parse(readFileSync(`public/quran/translations/${chunk}.json`,"utf8")) as [string,string][];
    const row=published[i%256];
    expect(ahmedgrafQuranReference.getAyah(surah,ayah)?.text).toBeTruthy();
    expect(quranTranslationFor(surah,ayah,"ur")).toBe(row[0]);
    expect(quranTranslationFor(surah,ayah,"en")).toBe(row[1]);
  }
 });

 it("includes five separately sourced historical passages without fabricated Arabic claims",()=>{
   for(const session of GHAF_LAH_FRESH_FIVE.sessions){
     const m=session.preparation?.masaib;
     expect(m).toBeDefined();
     expect(m?.sourceUrl.startsWith("https://al-islam.org/")).toBe(true);
     expect(m?.originalArabicVerified).toBe(false);
     expect(m?.sourceType).toBe("historical-summary-of-translated-source");
     expect(m?.history.ur.length).toBeGreaterThan(400);
     expect(buildSessionWorkbenchText(buildSessionWorkbench(session,30),"ur")).toContain(m!.source.ur);
   }
 });
 it("calculates spoken-word duration without counting bibliography links or editor headings",()=>{
   for(const session of GHAF_LAH_FRESH_FIVE.sessions){
     const a=estimatePreparedSpeech(session.preparation!,"ur");
     expect(a.words).toBe(a.categories.prose+a.categories.masaib+a.categories.verses+a.categories.hadiths+a.categories.expansions+a.categories.scholars);
     expect(a.categories.masaib).toBeGreaterThan(150);
     expect(a.words).toBeGreaterThan(1150);
     expect(a.highMinutes).toBeGreaterThanOrEqual(a.lowMinutes);
     expect(a.words).toBeLessThan(buildSessionWorkbenchText(buildSessionWorkbench(session,30),"ur").split(/\s+/u).length);
   }
 });

 it("routes five sessions to their own authored material instead of generic scaffold",()=>{
  const dossier=getTopicDossier("ghaflah");
  expect(dossier).not.toBeNull();
  const s=buildFreshMajlisSeries(dossier!,5);
  expect(s).toBe(GHAF_LAH_FRESH_FIVE);
  expect(s?.sessions.map(x=>x.titleUr)).toEqual(GHAF_LAH_FRESH_FIVE.sessions.map(x=>x.titleUr));
 });
 it("keeps every lecture distinct with substantial Arabic/Urdu material",()=>{
  const sessions=GHAF_LAH_FRESH_FIVE.sessions;
  expect(sessions).toHaveLength(5);
  expect(new Set(sessions.map(x=>x.titleUr)).size).toBe(5);
  for(const s of sessions){
   expect(s.preparation?.blocks).toHaveLength(5);
   expect(s.preparation?.quran.length).toBeGreaterThanOrEqual(2);
   expect(s.preparation?.scholarSources?.length).toBeGreaterThanOrEqual(2);
   expect(verifiedHadithForDossierText(s.preparation!.hadithId!)).not.toBeNull();
   expect(s.preparation!.blocks.map(x=>x.delivery.ur).join(" ").length).toBeGreaterThan(2600);
  }
 });
 it("uses independently labelled Arabic witnesses for additional preaching texts",()=>{
  const p=GHAF_LAH_FRESH_FIVE.sessions[2].preparation!;
  const f=GHAF_LAH_FRESH_FIVE.sessions[3].preparation!;
  expect(p.additionalHadithIds).toEqual(["ghaflah-baqir-salat"]);
  expect(f.additionalHadithIds).toEqual(["ghaflah-ali-taghaful"]);
  for(const preparation of [p,f]){
    for(const id of preparation.additionalHadithIds??[]){
      const record=verifiedHadithForDossierText(id);
      expect(record?.verifiedSourceUrl).toContain("mizan-al-hikmah");
      expect(record?.exactArabic).toBeTruthy();
    }
  }
  const third=buildSessionWorkbenchText(buildSessionWorkbench(GHAF_LAH_FRESH_FIVE.sessions[2],30),"ur");
  expect(third).toContain("الکافی");
  const fourth=buildSessionWorkbenchText(buildSessionWorkbench(GHAF_LAH_FRESH_FIVE.sessions[3],30),"ur");
  expect(fourth).toContain("تَغافُل");
 });
 it("delivers independently authored deep passages for every session",()=>{
  for(const session of GHAF_LAH_FRESH_FIVE.sessions){
    const count=session.preparation!.blocks.map(row=>row.delivery.ur).join(" ").trim().split(/\s+/u).length;
    expect(count).toBeGreaterThan(450);
  }
 });
 it("offers genuinely additional text at each longer duration",()=>{
  for(const session of GHAF_LAH_FRESH_FIVE.sessions){
    const m=session.preparation!;
    const a=estimatePreparedSpeech(m,"ur",20);
    const b=estimatePreparedSpeech(m,"ur",30);
    const c=estimatePreparedSpeech(m,"ur",45);
    expect(b.words).toBeGreaterThan(a.words+100);
    expect(c.words).toBeGreaterThan(b.words+150);
    expect(buildSessionWorkbenchText(buildSessionWorkbench(session,45),"ur").length)
     .toBeGreaterThan(buildSessionWorkbenchText(buildSessionWorkbench(session,20),"ur").length+500);
  }
 });
 it("keeps all five Urdu delivery manuscripts free of external URLs and editorial assignments",()=>{
   for(const session of GHAF_LAH_FRESH_FIVE.sessions){
     for(const minutes of [20,30,45] as const){
       const manuscript=buildSessionWorkbenchText(buildSessionWorkbench(session,minutes),"ur");
       expect(manuscript).not.toContain("https://");
       expect(manuscript).not.toContain("http://");
       expect(manuscript).not.toContain("سامع سے کہیے");
       expect(manuscript).not.toContain("خطیب اپنے معتبر");
       expect(manuscript).toContain("قرآن مجید");
       expect(manuscript).toContain("حوالہ:");
     }
   }
 });
 it.each([20,30,45] as const)("includes Quran, Arabic hadith and plain-text references but no external URLs in %i-minute manuscript",duration=>{
  const session=GHAF_LAH_FRESH_FIVE.sessions[0];
  const workbench=buildSessionWorkbench(session,duration);
  expect(workbench.blocks.reduce((total,b)=>total+b.minutes,0)).toBe(duration);
  const manuscript=buildSessionWorkbenchText(workbench,"ur");
  expect(manuscript).toContain("7:179");
  expect(manuscript).toContain("غرر الحکم");
  expect(manuscript).not.toContain("https://");
  expect(manuscript).not.toContain("قابلِ بیان عبارت");
  expect(manuscript).not.toContain("sourceUrl");
  expect(manuscript).not.toContain("اصل ماخذ کھولیں");
  expect(manuscript).not.toContain("اپنی مثال کی جگہ");
 });
});
