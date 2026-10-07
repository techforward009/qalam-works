import type { AnswerInput, ResearchClaim } from "../app/lib/knowledge/researchAnswer";
import type { SermonRequest } from "../app/lib/knowledge/sermonComposer";
import { expect, it, vi } from "vitest";
import { composeSermon, parseComposedSections, generateSermonSections } from "../app/lib/knowledge/sermonComposer";
import type { KnowledgeResult } from "../app/lib/knowledge/retrieval";
import { buildCustomSermonText, parseCustomSermonProject, serializeCustomSermonProject } from "../app/tools/khateeb-studio/engine/customSermonProject";
const result:KnowledgeResult={question:"صبر",status:"evidence",method:"lexical-bm25-topic-expansion",expandedTerms:[],availableCollections:["quran"],passages:[{id:"quran:test:2:153",collection:"quran",language:"ar",referenceUr:"قرآن، 2:153",referenceEn:"Quran, 2:153",text:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ",sourceSha256:"a".repeat(64),quranLocation:{surah:2,ayah:153},translator:null,suppliedTranslation:{language:"ur",text:"اے ایمان والو صبر اور نماز سے مدد لو۔",translator:"فراہم کردہ مترجم"}}]};
result.passages.push({...result.passages[0],id:"quran:test:2:154",referenceUr:"قرآن، 2:154",referenceEn:"Quran, 2:154",quranLocation:{surah:2,ayah:154}});
const evidence=result.passages.map((passage,i)=>({ref:i+1,passage}));
const sections=Array.from({length:5},(_,i)=>({heading:`حصہ ${i+1}`,text:"صبر اور نماز سے مدد لینے کی بات اس آیت میں بیان ہوئی ہے۔ ".repeat(14),refs:[i===4?2:1]}));
const input={title:"صبر",duration:30 as const,locale:"ur" as const};
const generate=vi.fn(async(_input:SermonRequest)=>({sections}));
const reviewer={id:"fixture",draft:vi.fn(),review:vi.fn(async(_input:AnswerInput,claims:readonly ResearchClaim[])=>({reviews:claims.map(c=>({claimId:c.id,verdict:"supported",reason:"entailed"}))}))};
it("creates five composed sections with exact references, portable sources and correct duration",async()=>{
 const project=await composeSermon(input,result,{generate,reviewer,env:{}});
 expect(project.sections).toHaveLength(5);expect(project.sections.reduce((n,s)=>n+s.minutes,0)).toBe(30);
 expect(project.sections[0].userText).toContain("قرآن، 2:153");
 expect(project.evidence[0].arabic).toBe(result.passages[0].text);
 expect(buildCustomSermonText(project,"ur")).toContain(result.passages[0].suppliedTranslation!.text);
 expect(parseCustomSermonProject(serializeCustomSermonProject(project))).toEqual(project);
});
it("preserves the prior version and passes revision preferences as data",async()=>{
 const prior=await composeSermon(input,result,{generate,reviewer,env:{}});const before=serializeCustomSermonProject(prior);
 const next=await composeSermon({...input,duration:20,instruction:"زبان آسان کریں",previous:prior.sections.map(s=>s.userText).join("\n")},result,{generate,reviewer,env:{}});
 expect(next.id).not.toBe(prior.id);expect(next.sections.reduce((n,s)=>n+s.minutes,0)).toBe(20);expect(serializeCustomSermonProject(prior)).toBe(before);
 expect(generate.mock.calls.at(-1)?.[0].instruction).toBe("زبان آسان کریں");
});
it("rejects invented references, short outlines and absent sections",()=>{
 for(const raw of [{sections:[]},{sections:sections.map(s=>({...s,refs:[9]}))},{sections:sections.map(s=>({...s,text:"خاکہ"}))}])expect(parseComposedSections(raw,evidence)).toBeNull();
});
it("rejects the entire new version when one section is unsupported",async()=>{
 const reject={...reviewer,review:async(_i:AnswerInput,claims:readonly ResearchClaim[])=>({reviews:claims.map((c,i)=>({claimId:c.id,verdict:i===2?"unsupported":"supported",reason:i===2?"not-in-evidence":"entailed"}))})};
 await expect(composeSermon(input,result,{generate,reviewer:reject,env:{}})).rejects.toThrow("unverified");
});
it("does not turn Arabic-only sources into invented Urdu translations",async()=>{
 await expect(composeSermon(input,{...result,passages:result.passages.map(p=>({...p,suppliedTranslation:undefined}))},{generate,reviewer,env:{}})).rejects.toThrow("missing-translation");
});
it("does not generate without configured review or sufficient evidence",async()=>{
 await expect(composeSermon(input,result,{generate,reviewer:null,env:{}})).rejects.toThrow("not-configured");
 await expect(composeSermon(input,{...result,status:"not-found",passages:[]},{generate,reviewer,env:{}})).rejects.toThrow("no-evidence");
});
it("uses bounded existing provider protocol without trusting previous draft as evidence",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections})}}]})));
 expect(await generateSermonSections({...input,previous:"غير ثابت",instruction:"زبان آسان کریں"},evidence,{CLOUDFLARE_ACCOUNT_ID:"test",CLOUDFLARE_AUTH_TOKEN:"test"},fetchMock)).toEqual({sections});
 const body=JSON.parse(fetchMock.mock.calls[0][1]!.body as string);expect(body.messages[0].content).toContain("Previous draft provides continuity, not proof");expect(body.max_completion_tokens).toBe(9000);
});

it("rejects a short summary posing as a full duration sermon",async()=>{
 const short=async()=>({sections:sections.map(s=>({...s,text:s.text.slice(0,300)}))});
 await expect(composeSermon(input,result,{generate:short,reviewer,env:{}})).rejects.toThrow("insufficient-draft");
});

it("repairs a rejected section once and still requires every replacement to pass review",async()=>{
 let calls=0;const repairReviewer={...reviewer,review:async(_i:AnswerInput,claims:readonly ResearchClaim[])=>({reviews:claims.map((c,i)=>({claimId:c.id,verdict:calls===0&&i===2?"unsupported":"supported",reason:calls===0&&i===2?"not-in-evidence":"entailed"})),...(++calls?{}:{})})};
 const repairGenerate=vi.fn(async(_request:SermonRequest)=>({sections}));
 const next=await composeSermon(input,result,{generate:repairGenerate,reviewer:repairReviewer,env:{}});
 expect(next.sections).toHaveLength(5);expect(repairGenerate).toHaveBeenCalledTimes(2);expect(repairGenerate.mock.calls[1][0].instruction).toContain("section-3");
});
