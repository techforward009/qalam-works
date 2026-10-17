import { describe, expect, it } from "vitest";
import { GHAF_LAH_SCHOLARLY_VOICES } from "../ghaflahScholarlyVoices";
import { GHAF_LAH_FRESH_FIVE } from "../ghaflahFreshMajalis";
import { buildPreparedSessionWorkbench, preparedSourceLines } from "../preparedSeries";
describe("Ghaflah source-grounded scholarly voices",()=>{
 it("has diversified scholarly sources with exact provenance and no Jawad as featured voice",()=>{
  expect(GHAF_LAH_SCHOLARLY_VOICES.length).toBeGreaterThanOrEqual(6);
  const ids=GHAF_LAH_SCHOLARLY_VOICES.map(x=>x.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).not.toContain("jawad-naqvi");
  expect(ids.slice(0,2)).toEqual(["mazaheri","misbah"]);
  expect(GHAF_LAH_SCHOLARLY_VOICES.some(x=>x.kind==="published-english-translation")).toBe(true);
  expect(GHAF_LAH_SCHOLARLY_VOICES.some(x=>x.kind==="official-published-outline")).toBe(true);
  expect(GHAF_LAH_SCHOLARLY_VOICES.every(x=>x.url.startsWith("https://"))).toBe(true);
 });
 it("has no falsely labelled original-Arabic quotation or overlong speech excerpt",()=>{
  for(const x of GHAF_LAH_SCHOLARLY_VOICES){
   expect(["fa","en"]).toContain(x.language);
   expect(x.quote.trim().split(/\s+/u).length).toBeLessThanOrEqual(24);
   if(x.kind==="published-english-translation")expect(x.language).toBe("en");
   if(x.kind==="official-published-outline")expect(x.noteUr).toContain("شائع");
  }
 });
 it("makes at least two scholarly excerpts available to every fresh majlis",()=>{
  for(const session of GHAF_LAH_FRESH_FIVE.sessions){
   const prep=session.preparation!;
   expect(prep.scholarlyExcerpts?.length).toBeGreaterThanOrEqual(2);
   const sources=preparedSourceLines(prep,"ur");
   for(const voice of prep.scholarlyExcerpts??[]){
    expect(sources).toContain(voice.original);
    expect(sources).toContain(voice.sourceUrl);
    expect(sources).toContain(voice.sourceNote.ur);
   }
   expect(buildPreparedSessionWorkbench(session,20).blocks[1].bodyUr.join(" ")).toContain("مصباح");
  }
 });
});
