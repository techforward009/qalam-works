import { describe, it, expect } from "vitest";
import bindings from "../app/tools/khateeb-studio/engine/patienceBookBindings.json";
import { resolvePatienceMaterials, createPatienceBookDraft, patienceGuideText } from "../app/tools/khateeb-studio/engine/patienceBookGuide";
import { bookExcerptText, type BookSource, type BookRecord } from "../app/tools/khateeb-studio/engine/bookLibrary";
import { buildCustomSermonText, parseCustomSermonProject, serializeCustomSermonProject } from "../app/tools/khateeb-studio/engine/customSermonProject";
function fixture() {
 const sources:BookSource[]=Array.from(new Map(bindings.map(b=>[b.sourceId,{id:b.sourceId,book:b.sourceId.startsWith('nahj')?'nahj':'sahifa',language:b.sourceId.endsWith('-ar')?'ar':b.sourceId.endsWith('-ur')?'ur':'en',filename:`${b.sourceId}.docx`,sha256:b.sourceSha256,translator:null} as BookSource])).values());
 const records:BookRecord[]=bindings.map(b=>({id:b.recordId,sourceId:b.sourceId,book:b.sourceId.startsWith('nahj')?'nahj':'sahifa',language:sources.find(s=>s.id===b.sourceId)!.language,kind:b.recordId.split(':')[1],number:Number(b.recordId.split(':')[2]),title:'Fixture passage',textSha256:b.recordSha256,reference:{sourceId:b.sourceId,section:'fixture',number:1,locator:'word/document.xml',printPage:null},paragraphs:Array.from({length:Math.max(...b.paragraphNumbers)},(_,i)=>({id:`${b.recordId}:p${i+1}`,text:`fixture ${b.recordId} paragraph ${i+1}`}))}));
 return {sources,records};
}
describe('curated patience',()=>{
 for(const locale of ['ur','en'] as const) for(const duration of [20,30,45] as const) it(`${locale} ${duration}: attribution survives draft serialization and copy`,()=>{
  const {records,sources}=fixture();const {materials,unavailable}=resolvePatienceMaterials(records,sources,locale);expect(unavailable).toBe(0);expect(materials).toHaveLength(12);
  const project=createPatienceBookDraft(materials,locale,duration);expect(project.sections.reduce((n,s)=>n+s.minutes,0)).toBe(duration);
  const restored=parseCustomSermonProject(serializeCustomSermonProject(project));expect(restored).toEqual(project);
  const text=buildCustomSermonText(project,locale);expect(text).toContain(locale==='ur'?'حکمت 55':'saying 55');expect(text).toContain(locale==='ur'?'109':'file entry 109');expect(text).toContain(`sahifa-${locale}:supplication:28`);
  expect(text).toContain(locale==='ur'?'تدوینی رہنمائی':'Editorial guidance');expect(text).toContain(locale==='ur'?'۱۰۳:۱ تا ۳':'103:1–3');
  expect(bookExcerptText(materials[0].excerpt,locale)).not.toContain('fixture nahj-ar:saying:109 paragraph 1');
 });
 it('blocks incomplete materials and rejects changed source or passage bindings',()=>{
  const {records,sources}=fixture();const data=resolvePatienceMaterials(records,sources,'ur');expect(()=>createPatienceBookDraft(data.materials.slice(1),'ur',30)).toThrow('incomplete-materials');
  sources[0].sha256='0'.repeat(64);expect(resolvePatienceMaterials(records,sources,'ur').unavailable).toBeGreaterThan(0);
  records.forEach(r=>r.textSha256='0'.repeat(64));expect(resolvePatienceMaterials(records,sources,'ur').materials).toHaveLength(0);
 });
 it('copy includes selected passages and clearly editorial examples',()=>{
  const {records,sources}=fixture();const materials=resolvePatienceMaterials(records,sources,'ur').materials.filter(m=>m.angleId==='hope');const text=patienceGuideText(materials,'ur',30);expect(text).toContain('دعا 28');expect(text).not.toContain('fixture nahj');expect(text).toContain('تدوینی وضاحت');
 });
});
