import { describe, it, expect } from "vitest";
import { GHAF_LAH_FRESH_FIVE } from "../ghaflahFreshMajalis";
import { buildFreshMajlisSeries } from "../freshPulpitSeries";
import { getTopicDossier } from "../topicDossier";
import { buildSessionWorkbench, buildSessionWorkbenchText } from "../sessionWorkbench";
import { verifiedHadithForDossierText } from "../verifiedHadithCorpus";
import { estimatePreparedSpeech } from "../preparedSeries";
describe("Ghaflah fresh five ready-to-deliver manuscript",()=>{
 it("includes five separately sourced historical passages without fabricated Arabic claims",()=>{
   for(const session of GHAF_LAH_FRESH_FIVE.sessions){
     const m=session.preparation?.masaib;
     expect(m).toBeDefined();
     expect(m?.sourceUrl.startsWith("https://al-islam.org/")).toBe(true);
     expect(m?.originalArabicVerified).toBe(false);
     expect(m?.sourceType).toBe("historical-summary-of-translated-source");
     expect(m?.history.ur.length).toBeGreaterThan(400);
     expect(buildSessionWorkbenchText(buildSessionWorkbench(session,30),"ur")).toContain(m!.sourceUrl);
   }
 });
 it("calculates spoken-word duration without counting bibliography links or editor headings",()=>{
   for(const session of GHAF_LAH_FRESH_FIVE.sessions){
     const a=estimatePreparedSpeech(session.preparation!,"ur");
     expect(a.words).toBe(a.categories.prose+a.categories.masaib+a.categories.verses+a.categories.hadiths);
     expect(a.categories.masaib).toBeGreaterThan(150);
     expect(a.words).toBeGreaterThan(1150);
     expect(a.highMinutes).toBeGreaterThanOrEqual(a.lowMinutes);
     expect(a.words).toBeLessThan(buildSessionWorkbenchText(buildSessionWorkbench(session,30),"ur").split(/\\s+/u).length);
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
 it.each([20,30,45] as const)("includes authentic textual sources and source URLs in %i-minute draft",duration=>{
  const session=GHAF_LAH_FRESH_FIVE.sessions[0];
  const workbench=buildSessionWorkbench(session,duration);
  expect(workbench.blocks.reduce((total,b)=>total+b.minutes,0)).toBe(duration);
  const manuscript=buildSessionWorkbenchText(workbench,"ur");
  expect(manuscript).toContain("7:179");
  expect(manuscript).toContain("ghurar-al-hikam");
  expect(manuscript).toContain("قابلِ بیان");
 });
});
