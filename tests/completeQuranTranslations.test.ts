import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { completeQuranTranslationFor, completeQuranTranslationCount } from "../app/lib/knowledge/completeQuranTranslations";
import { HAFS_AYAH_COUNTS } from "../app/tools/arabic-diacritics/quran/hafsCounts";
it("makes every supplied reader translation available unchanged to server-side sermon preparation",()=>{
 const rows=Array.from({length:25},(_,i)=>JSON.parse(readFileSync(`public/quran/translations/${String(i).padStart(2,"0")}.json`,"utf8"))).flat();let index=0;
 expect(completeQuranTranslationCount).toBe(6236);
 HAFS_AYAH_COUNTS.forEach((count,s)=>{for(let a=1;a<=count;a++){expect(completeQuranTranslationFor(s+1,a,"ur")).toBe(rows[index][0]);expect(completeQuranTranslationFor(s+1,a,"en")).toBe(rows[index][1]);index++;}});
 expect(index).toBe(6236);
});
it("includes verses beyond the old curated sermon subset and rejects invalid locations",()=>{
 expect(completeQuranTranslationFor(2,45,"ur")).toBeTruthy();
 for(const [surah,ayah] of [[0,1],[115,1],[2,0],[2,287]])expect(completeQuranTranslationFor(surah,ayah,"ur")).toBeNull();
});
