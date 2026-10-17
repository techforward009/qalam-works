import { describe, it, expect } from "vitest";
import { GHAF_LAH_FRESH_FIVE } from "../ghaflahFreshMajalis";
import { buildFreshMajlisSeries } from "../freshPulpitSeries";
import { getTopicDossier } from "../topicDossier";
import { buildSessionWorkbench, buildSessionWorkbenchText } from "../sessionWorkbench";
import { verifiedHadithForDossierText } from "../verifiedHadithCorpus";
describe("Ghaflah fresh five ready-to-deliver manuscript",()=>{
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
 it.each([20,30,45] as const)("includes authentic textual sources and source URLs in %i-minute draft",duration=>{
  const session=GHAF_LAH_FRESH_FIVE.sessions[0];
  const workbench=buildSessionWorkbench(session,duration);
  expect(workbench.blocks.reduce((total,b)=>total+b.minutes,0)).toBe(duration);
  const manuscript=buildSessionWorkbenchText(workbench,"ur");
  expect(manuscript).toContain("الأعراف");
  expect(manuscript).toContain("ghurar-al-hikam");
  expect(manuscript).toContain("قابلِ بیان");
 });
});
