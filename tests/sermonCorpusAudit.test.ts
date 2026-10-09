import { expect, it, vi } from "vitest";
vi.mock("../app/api/research/vercelResearchBlob", () => ({ researchBlobClientFromEnv: vi.fn() }));
vi.mock("../app/lib/knowledge/store", () => ({
  BOOK_POINTER_PATH: "khateeb-foundational/v1/current.json",
  loadBookCatalog: vi.fn(async(client:{getObject:(p:string)=>Promise<string|null>}) => {
    const value = await client.getObject("khateeb-foundational/v1/current.json");
    return value ? JSON.parse(value) : null;
  }),
}));
vi.mock("../app/lib/knowledge/sourceCache", () => ({
  readBookSource: vi.fn(async(client:{getObject:(p:string)=>Promise<string|null>},_catalog:unknown,id:string) => JSON.parse((await client.getObject(id))??"[]")),
}));
import { auditSermonCorpus } from "../app/lib/knowledge/sermonCorpusAudit";
const origins=["nahj","sahifa","kafi"] as const;
const manifest={sources:origins.flatMap(book=>[{id:book+"-ar",book,language:"ar"},{id:book+"-ur",book,language:"ur"}])};
const objects=Object.fromEntries([
 ["khateeb-foundational/v1/current.json",JSON.stringify({manifest})],
 ...origins.map(book=>[book+"-ar",JSON.stringify([{reference:{locator:book+" reference"}}])]),
]);
const make=(values:Record<string,string>=objects)=>({
 getObject:vi.fn(async(path:string)=>values[path]??null),
 listObjects:vi.fn(async()=>[]),
 putObject:vi.fn(async()=>{throw Error("must not write");}),
});
it("audits original Arabic sources without emitting text or writing a byte",async()=>{
 const client=make();
 const report=await auditSermonCorpus(client);
 expect(report.status).toBe("passed");
 expect(report.sources.map(s=>s.book)).toEqual(["nahj","sahifa","kafi"]);
 expect(report.sources.every(s=>s.arabicRecords===1&&s.hasUrduEdition)).toBe(true);
 expect(JSON.stringify(report)).not.toContain("reference");
 expect(client.putObject).not.toHaveBeenCalled();
});
it("does not falsely pass when al-Kafi Arabic corpus is missing",async()=>{
 const client=make({...objects,"kafi-ar":"[]"});
 const report=await auditSermonCorpus(client);
 expect(report.status).toBe("incomplete");
 expect(report.missingBooks).toEqual(["kafi"]);
 expect(client.putObject).not.toHaveBeenCalled();
});
it("rejects an absent catalog instead of claiming validation",async()=>{
 await expect(auditSermonCorpus(make({}))).rejects.toThrow("missing-catalog");
});
