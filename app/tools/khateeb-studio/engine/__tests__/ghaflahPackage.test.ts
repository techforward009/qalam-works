import { describe, expect, it } from "vitest";
import { GHAF_LAH_DOSSIER, GHAF_LAH_TOPIC, ghaflahMajlisSeries, GHAF_LAH_VERIFIED_HADITHS } from "../ghaflahPackage";
import { ghaflahScholarCoverage } from "../ghaflahCoverage";
import { buildGroundedFullSermon } from "../groundedFullSermon";

describe("Ghaflah research and all formats", () => {
  it("has distinct one, three, five and ten-session sequences", () => {
    for (const n of [1,3,5,10] as const) {
      const s = ghaflahMajlisSeries(n);
      expect(s.sessions).toHaveLength(n);
      expect(s.sessions.every(x => x.materialUr.length >= 3 && x.sourceUr)).toBe(true);
    }
  });
  it("keeps 29 scholars' real evidence states visible", () => {
    const coverage = ghaflahScholarCoverage();
    expect(coverage).toHaveLength(29);
    expect(new Set(coverage.map(x=>x.scholarId)).size).toBe(coverage.length);
    expect(coverage.find(x=>x.scholarId==="jawad-naqvi")?.status).toBe("source-analysed");
    expect(coverage.find(x=>x.scholarId==="qaraati")?.status).toBe("catalog-only");
    expect(coverage.filter(x=>x.status==="not-researched").length).toBeGreaterThan(0);
  });
  it("links every exact hadith to the dossier and a verified source witness", () => {
    const ids=new Set(GHAF_LAH_DOSSIER.primaryTexts?.map(x=>x.id));
    for (const h of GHAF_LAH_VERIFIED_HADITHS) {
      expect(ids.has(h.dossierPrimaryTextId)).toBe(true);
      expect(h.witnesses.find(w=>w.id===h.verificationWitnessId)?.exactArabic).toBe(h.exactArabic);
    }
    expect(GHAF_LAH_TOPIC.keywordsUr).toContain("غفلت");
  });
  it.each([20,30,45] as const)("offers source-grounded %i-minute composition", (minutes) => {
    const s=buildGroundedFullSermon("ghaflah", minutes, "ur");
    expect(s).not.toBeNull();
    expect(s?.verifiedHadithCount).toBeGreaterThan(0);
    expect(s?.sourceLedger.length).toBeGreaterThan(2);
    expect(s?.blocks.reduce((n,b)=>n+b.minutes,0)).toBe(minutes);
  });
});
