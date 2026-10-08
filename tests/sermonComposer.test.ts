import { sermonSentences } from "../app/lib/knowledge/sermonReview";
import type { AnswerInput, ResearchClaim } from "../app/lib/knowledge/researchAnswer";
import type { SermonRequest } from "../app/lib/knowledge/sermonComposer";
import { expect, it, vi } from "vitest";
import { composeSermon, chooseSermonReviewProvider, parseComposedSections, generateSermonSections, selectSermonEvidence } from "../app/lib/knowledge/sermonComposer";
import type { KnowledgeResult } from "../app/lib/knowledge/retrieval";
import { buildCustomSermonText, parseCustomSermonProject, serializeCustomSermonProject } from "../app/tools/khateeb-studio/engine/customSermonProject";
const result:KnowledgeResult={question:"صبر",status:"evidence",method:"lexical-bm25-topic-expansion",expandedTerms:[],availableCollections:["quran"],passages:[{id:"quran:test:2:153",collection:"quran",language:"ar",referenceUr:"قرآن، 2:153",referenceEn:"Quran, 2:153",text:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ",sourceSha256:"a".repeat(64),quranLocation:{surah:2,ayah:153},translator:null,suppliedTranslation:{language:"ur",text:"اے ایمان والو صبر اور نماز سے مدد لو۔",translator:"فراہم کردہ مترجم"}}]};
result.passages.push({...result.passages[0],id:"quran:test:2:154",referenceUr:"قرآن، 2:154",referenceEn:"Quran, 2:154",quranLocation:{surah:2,ayah:154}});
for(let index=1;index<=3;index++)result.passages.push({...result.passages[0],id:`nahj:test:${index}`,collection:"nahj",recordId:`nahj:${index}`,referenceUr:`نہج البلاغہ، قول ${index}`,referenceEn:`Nahj al-Balagha, saying ${index}`,text:"اَلصَّبْرُ صَبْرَانِ",quranLocation:undefined,suppliedTranslation:{language:"ur",text:"صبر کی دو صورتیں بیان ہوئی ہیں۔",translator:"فراہم کردہ مترجم"}});
const evidence=result.passages.map((passage,i)=>({ref:i+1,passage}));
const sections=Array.from({length:5},(_,i)=>({heading:`حصہ ${i+1}`,text:Array.from({length:14},(_,n)=>`یہ نکتہ ${i*14+n} صبر اور نماز سے مدد لینے کے بارے میں ماخذ میں بیان ہوا ہے۔`).join(" "),refs:[i+1]}));
const input={title:"صبر",duration:30 as const,locale:"ur" as const};
const generate=vi.fn(async(_input:SermonRequest)=>({sections}));
const reviewer={id:"fixture",draft:vi.fn(),review:vi.fn(async(_input:AnswerInput,claims:readonly ResearchClaim[])=>({reviews:claims.map(c=>({claimId:c.id,verdict:"supported",reason:"entailed"}))}))};
it("selects an independent source-review provider without changing the writing model",()=>{
 expect(chooseSermonReviewProvider({QALAM_SERMON_PROVIDER:"groq",CLOUDFLARE_ACCOUNT_ID:"account",CLOUDFLARE_AUTH_TOKEN:"token"})).toBe("cloudflare");
 expect(chooseSermonReviewProvider({QALAM_SERMON_PROVIDER:"groq"})).toBe("groq");
 expect(chooseSermonReviewProvider({QALAM_SERMON_PROVIDER:"groq",QALAM_SERMON_REVIEW_PROVIDER:"groq",CLOUDFLARE_ACCOUNT_ID:"account",CLOUDFLARE_AUTH_TOKEN:"token"})).toBe("groq");
});
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
it("never returns a final sermon unless its complete review explicitly approves all five sections",async()=>{
 const auditing={...reviewer,review:vi.fn(async(_input:AnswerInput,claims:readonly ResearchClaim[])=>({reviews:claims.map((claim,index)=>({claimId:claim.id,verdict:index===4?"unsupported":"supported",reason:index===4?"not-in-evidence":"entailed"}))}))};
 await expect(composeSermon(input,result,{generate,reviewer:auditing,env:{}})).rejects.toThrow("unverified");
 expect(auditing.review).toHaveBeenCalled();
});
it("rejects an unrecognized review provider instead of silently switching reviewers",async()=>{
 const writer=vi.fn();
 await expect(composeSermon(input,result,{generate:writer,reviewer,env:{QALAM_SERMON_REVIEW_PROVIDER:"unknown"}})).rejects.toThrow("not-configured");
 expect(writer).not.toHaveBeenCalled();
});
it("does not turn Arabic-only sources into invented Urdu translations",async()=>{
 await expect(composeSermon(input,{...result,passages:result.passages.map(p=>({...p,suppliedTranslation:undefined}))},{generate,reviewer,env:{}})).rejects.toThrow("missing-translation");
});
it("does not generate without configured review or sufficient evidence",async()=>{
 await expect(composeSermon(input,result,{generate,reviewer:null,env:{}})).rejects.toThrow("not-configured");
 await expect(composeSermon(input,{...result,status:"not-found",passages:[]},{generate,reviewer,env:{}})).rejects.toThrow("no-evidence");
});
it("refuses a timed Quran-only sermon even when many verses are available",async()=>{
 const quranOnly={...result,passages:Array.from({length:8},(_,index)=>({...result.passages[0],id:`quran:only:${index+1}`,quranLocation:{surah:2,ayah:index+1}}))};
 const provider=vi.fn();
 await expect(composeSermon(input,quranOnly,{generate:provider,reviewer,env:{}})).rejects.toThrow("insufficient-evidence");
 expect(provider).not.toHaveBeenCalled();
});
it("requires the generated sermon itself to cite enough distinct sources, not just retrieve them",async()=>{
 const quranReferences=sections.map(section=>({...section,refs:[1]}));const provider=vi.fn(async()=>({sections:quranReferences}));const audit=vi.fn();
 await expect(composeSermon(input,result,{generate:provider,reviewer:{...reviewer,review:audit},env:{}})).rejects.toThrow("insufficient-evidence");
 expect(provider).toHaveBeenCalledTimes(2);expect(audit).not.toHaveBeenCalled();
});
it("does not reuse a 30-minute source pack as a 45-minute pack",async()=>{
 const provider=vi.fn();
 await expect(composeSermon({...input,duration:45},result,{generate:provider,reviewer,env:{}})).rejects.toThrow("insufficient-evidence");
 expect(provider).not.toHaveBeenCalled();
});
it("keeps one length-repair attempt available after correcting malformed section count",async()=>{
 const provider=vi.fn(async()=>provider.mock.calls.length===1?{sections:[...sections,{...sections[4]}]}:provider.mock.calls.length===2?{sections:sections.map((section,index)=>index===0?{...section,text:section.text.slice(0,300)}:section)}:{sections});
 const project=await composeSermon(input,result,{generate:provider,reviewer,env:{}});
 expect(project.sections).toHaveLength(5);expect(provider).toHaveBeenCalledTimes(3);
});
it("permits independent format, length, and source-review corrections without publishing unreviewed prose",async()=>{
 let reviewCalls=0;
 const provider=vi.fn(async()=>{
   const attempt=provider.mock.calls.length;
   if(attempt===1)return {sections:[...sections,sections[4]]};
   if(attempt===2)return {sections:sections.map(s=>({...s,text:s.text.slice(0,300)}))};
   return {sections};
 });
 const audit={...reviewer,review:vi.fn(async(_input:AnswerInput,claims:readonly ResearchClaim[])=>{
   const reject=reviewCalls++===0;
   return {reviews:claims.map((c,i)=>({claimId:c.id,verdict:reject&&i===0?"unsupported":"supported",reason:reject&&i===0?"not-in-evidence":"entailed"}))};
 })};
 const project=await composeSermon(input,result,{generate:provider,reviewer:audit,env:{}});
 expect(project.sections).toHaveLength(5);
 expect(provider).toHaveBeenCalledTimes(4);
 expect(audit.review).toHaveBeenCalledTimes(2);
});
it("preserves source-approved sections while rewriting rejected ones",async()=>{
 let reviewCount=0;const sourceCheck={...reviewer,review:vi.fn(async(_input:AnswerInput,claims:readonly ResearchClaim[])=>{const reject=reviewCount++===0;return {reviews:claims.map((claim,index)=>({claimId:claim.id,verdict:reject&&index===0?"unsupported":"supported",reason:reject&&index===0?"not-in-evidence":"entailed"}))};})};
 const provider=vi.fn(async()=>provider.mock.calls.length===1?{sections}:{sections:sections.map((section,index)=>index===0?section:{...section,text:Array.from({length:16},(_,n)=>`یہ نیا تدوینی جملہ ${n+1} سامعین کو اسی ماخذی نکتے پر غور کی دعوت دیتا ہے۔`).join(" ")})});
 const project=await composeSermon(input,result,{generate:provider,reviewer:sourceCheck,env:{}});
 expect(provider).toHaveBeenCalledTimes(2);expect(sourceCheck.review).toHaveBeenCalledTimes(2);
 for(let index=1;index<5;index++)expect(project.sections[index].userText).toContain(sections[index].text);
});
it("uses bounded existing provider protocol without trusting previous draft as evidence",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections})}}]})));
 expect(await generateSermonSections({...input,previous:"غير ثابت",instruction:"زبان آسان کریں"},evidence,{CLOUDFLARE_ACCOUNT_ID:"test",CLOUDFLARE_AUTH_TOKEN:"test"},fetchMock)).toEqual({sections});
 const body=JSON.parse(fetchMock.mock.calls[0][1]!.body as string);expect(body.messages[0].content).toContain("Previous draft provides continuity, not proof");expect(body.max_completion_tokens).toBe(6500);expect(body.response_format.json_schema.schema.properties.sections.minItems).toBe(5);expect(body.response_format.json_schema.strict).toBe(true);
});

it("rejects a short summary posing as a full duration sermon",async()=>{
 const short=async()=>({sections:sections.map(s=>({...s,text:s.text.slice(0,300)}))});
 await expect(composeSermon(input,result,{generate:short,reviewer,env:{}})).rejects.toThrow("insufficient-draft");
});

it("repairs a rejected section once and still requires every replacement to pass review",async()=>{
 let calls=0;const repairReviewer={...reviewer,review:async(_i:AnswerInput,claims:readonly ResearchClaim[])=>{const first=calls++===0;return {reviews:claims.map((c,i)=>({claimId:c.id,verdict:first&&i===2?"unsupported":"supported",reason:first&&i===2?"not-in-evidence":"entailed"}))};}};
 const repairGenerate=vi.fn(async(_request:SermonRequest)=>({sections}));
 const next=await composeSermon(input,result,{generate:repairGenerate,reviewer:repairReviewer,env:{}});
 expect(next.sections).toHaveLength(5);expect(repairGenerate).toHaveBeenCalledTimes(2);expect(repairGenerate.mock.calls[1][0].instruction).toContain("section-3");
});

it("identifies composition provider failures without exposing provider responses",async()=>{
 const unavailable=async()=>{throw new Error("provider internals");};
 await expect(composeSermon(input,result,{generate:unavailable,reviewer,env:{}})).rejects.toThrow("generation-unavailable");
});

it("allows a brief closing and deduplicates valid references without accepting unknown ones",()=>{
 const adjusted=sections.map((s,i)=>i===4?{...s,text:"آئیے اس موضوع پر غور کرتے ہوئے اپنی گفتگو مکمل کریں۔",refs:[2,2]}:s);
 expect(parseComposedSections({sections:adjusted},evidence)?.[4].refs).toEqual([2]);
 expect(parseComposedSections({sections:adjusted.map(s=>({...s,refs:[0]}))},evidence)).toBeNull();
});

 it("uses GPT-OSS on Groq when a server key is configured",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections})}}]})));
 await generateSermonSections(input,evidence,{GROQ_API_KEY:"test-secret"},fetchMock);
 expect(fetchMock.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
 const body=JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
 expect(body.model).toBe("openai/gpt-oss-120b");
 expect(body.max_completion_tokens).toBe(5000);expect(body.max_tokens).toBeUndefined();
 expect(body.reasoning_effort).toBe("low");
 expect(body.reasoning_format).toBeUndefined();
 expect(body.response_format).toEqual({type:"json_object"});
 expect(body.messages[0].content).toContain('{"sections":[{"heading":"section heading","text":"full spoken paragraphs","refs":[1]}]}');
 });

it("rejects foreign-script text in Urdu sermon prose before source review",async()=>{
 const contaminated=vi.fn(async()=>({sections:sections.map((s,i)=>i===1?{...s,text:s.text+" বিরطفت "}:s)}));
 const check={...reviewer,review:vi.fn()};
 await expect(composeSermon(input,result,{generate:contaminated,reviewer:check,env:{}})).rejects.toThrow("unverified");
 expect(check.review).not.toHaveBeenCalled();
});

it("repairs a short first draft before reviewing and preserves minimum length",async()=>{
 const repair=vi.fn(async(_request:SermonRequest)=>({sections:repair.mock.calls.length===1?sections.map(s=>({...s,text:s.text.slice(0,300)})):sections}));
 const check={...reviewer,review:vi.fn(async(_input:AnswerInput,claims:readonly ResearchClaim[])=>({reviews:claims.map(c=>({claimId:c.id,verdict:"supported",reason:"entailed"}))}))};
 const project=await composeSermon(input,result,{generate:repair,reviewer:check,env:{}});
 expect(project.sections).toHaveLength(5);expect(repair).toHaveBeenCalledTimes(2);expect(check.review).toHaveBeenCalledTimes(1);expect(repair.mock.calls[1][0].instruction).toContain("at least 750 words");expect(repair.mock.calls[1][0].previous).toContain("sections");
});
it("rejects a sermon with one underlength section even when its total is long enough",async()=>{
 const uneven=sections.map((section,i)=>i===2?{...section,text:Array.from({length:8},(_,n)=>`یہ جملہ نمبر ${n+1} سامعین کو غور کی دعوت دیتا ہے۔`).join(" ")}:section);
 const generateUneven=vi.fn(async()=>({sections:uneven}));const check={...reviewer,review:vi.fn()};
 await expect(composeSermon(input,result,{generate:generateUneven,reviewer:check,env:{}})).rejects.toThrow("insufficient-draft");
 expect(generateUneven).toHaveBeenCalledTimes(2);expect(check.review).not.toHaveBeenCalled();
});
it("sends supplied meanings to the writer without duplicated original text or metadata",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections})}}]})));
 await generateSermonSections(input,evidence,{GROQ_API_KEY:"test"},fetchMock);
 const body=JSON.parse(fetchMock.mock.calls[0][1]!.body as string);const data=JSON.parse(body.messages[1].content);
 expect(data.evidence[0].meaning).toBe(result.passages[0].suppliedTranslation!.text);expect(data.evidence[0].text).toBeUndefined();expect(data.evidence[0].suppliedTranslation).toBeUndefined();
});

it("reserves a primary non-Quran passage when ranked results begin with eight Quran entries",()=>{
 const quran=result.passages.find(p=>p.collection==="quran")!;
 const core=result.passages.find(p=>p.collection!=="quran")!;
 const ranked=[...Array.from({length:8},(_,i)=>({...quran,id:`quran:ranked:${i}`,recordId:undefined})),core];
 const chosen=selectSermonEvidence(ranked);
 expect(chosen.some(e=>e.passage.collection!=="quran")).toBe(true);
 expect(chosen.length).toBeLessThanOrEqual(8);
});
it("bounds sermon evidence with complete source units and unchanged verified translations",()=>{
 const long={...result.passages[0],id:"too-long",text:"ع".repeat(7000)};
 const chosen=selectSermonEvidence([long,...result.passages]);expect(chosen).toHaveLength(5);expect(chosen[0].passage).toBe(result.passages[0]);expect(chosen[0].ref).toBe(1);expect(chosen[1].ref).toBe(2);
});

it("uses the same Qwen model on Cloudflare for long composition when both providers are configured",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections}),reasoning:"never sermon text"}}]})));
 expect(await generateSermonSections(input,evidence,{GROQ_API_KEY:"groq-key",CLOUDFLARE_ACCOUNT_ID:"account",CLOUDFLARE_AUTH_TOKEN:"cloudflare-key"},fetchMock)).toEqual({sections});
 expect(fetchMock.mock.calls[0][0]).toBe("https://api.cloudflare.com/client/v4/accounts/account/ai/v1/chat/completions");
 const request=fetchMock.mock.calls[0][1]!;expect((request.headers as Record<string,string>).Authorization).toBe("Bearer cloudflare-key");const body=JSON.parse(request.body as string);expect(body.model).toBe("@cf/qwen/qwen3.8-27b");expect(body.chat_template_kwargs.enable_thinking).toBe(false);expect(body.reasoning_effort).toBe("low");expect(body.reasoning_format).toBeUndefined();expect(body.max_completion_tokens).toBe(6500);expect(body.response_format.json_schema.strict).toBe(true);
});

it("repairs specific rejected sentences and rechecks every section after removing remaining unsupported text",async()=>{
 let checks=0;const precise={...reviewer,review:vi.fn(async(reviewInput:AnswerInput,claims:readonly ResearchClaim[])=>{const rejected=checks++<2;return {reviews:claims.map((c,i)=>({claimId:c.id,verdict:rejected&&i===0?"unsupported":"supported",reason:rejected&&i===0?"not-in-evidence":"entailed"})),sentenceAudit:claims.map((c,i)=>({claimId:c.id,sentences:sermonSentences(c.text).map((_,n)=>({index:n+1,verdict:rejected&&i===0&&n===1?"unsupported":"supported",reason:rejected&&i===0&&n===1?"not-in-evidence":"entailed",refs:[reviewInput.evidence.find(e=>c.citations.some(r=>r.passageId===e.passage.id))!.ref]}))}))};})};
 const repair=vi.fn(async(_request:SermonRequest)=>({sections}));const project=await composeSermon(input,result,{generate:repair,reviewer:precise,env:{}});expect(repair).toHaveBeenCalledTimes(2);expect(precise.review).toHaveBeenCalledTimes(3);expect(repair.mock.calls[1][0].instruction).toContain(sermonSentences(sections[0].text)[0]);expect(project.sections[0].userText).not.toContain(sermonSentences(sections[0].text)[0]);expect(precise.review.mock.calls[2][1]).toHaveLength(5);
});

it("does not publish a filtered version unless its final complete review passes",async()=>{
 const reject={...reviewer,review:vi.fn(async(reviewInput:AnswerInput,claims:readonly ResearchClaim[])=>({reviews:claims.map((c,i)=>({claimId:c.id,verdict:i===0?"unsupported":"supported",reason:i===0?"not-in-evidence":"entailed"})),sentenceAudit:claims.map((c,i)=>({claimId:c.id,sentences:sermonSentences(c.text).map((_,n)=>({index:n+1,verdict:i===0&&n===1?"unsupported":"supported",reason:i===0&&n===1?"not-in-evidence":"entailed",refs:[reviewInput.evidence.find(e=>c.citations.some(r=>r.passageId===e.passage.id))!.ref]}))}))}))};await expect(composeSermon(input,result,{generate,reviewer:reject,env:{}})).rejects.toThrow("unverified");expect(reject.review).toHaveBeenCalledTimes(3);
});

it("includes source assertions in section headings in the independent review",async()=>{
 const assertion="ہر صبر کرنے والے کو دولت ملتی ہے";const claimed=async()=>({sections:sections.map((s,i)=>i===0?{...s,heading:assertion}:s)});const checked={...reviewer,review:vi.fn(async(_input:AnswerInput,claims:readonly ResearchClaim[])=>({reviews:claims.map((c,i)=>({claimId:c.id,verdict:i===0?"unsupported":"supported",reason:i===0?"not-in-evidence":"entailed"}))}))};await expect(composeSermon(input,result,{generate:claimed,reviewer:checked,env:{}})).rejects.toThrow("unverified");expect(checked.review.mock.calls[0][1][0].text).toContain(assertion);
});

it("honors an explicit server provider without changing the retrieval credentials",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections})}}]})));await generateSermonSections(input,evidence,{GROQ_API_KEY:"groq-key",CLOUDFLARE_ACCOUNT_ID:"account",CLOUDFLARE_AUTH_TOKEN:"cf-key",QALAM_SERMON_PROVIDER:"groq"},fetchMock);expect(fetchMock.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
 for(const mode of ["unknown","groq","cloudflare"])await expect(generateSermonSections(input,evidence,{QALAM_SERMON_PROVIDER:mode},fetchMock)).rejects.toThrow("not-configured");expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("uses Gemini with its own key and compatible thinking and output parameters",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({status:"completed",steps:[{type:"model_output",content:[{type:"text",text:JSON.stringify({sections})}]}]})));
 await generateSermonSections(input,evidence,{GEMINI_API_KEY:"gemini-test",GROQ_API_KEY:"groq-test",CLOUDFLARE_ACCOUNT_ID:"account",CLOUDFLARE_AUTH_TOKEN:"cf-test"},fetchMock);
 expect(fetchMock.mock.calls[0][0]).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
 const init=fetchMock.mock.calls[0][1]!;const body=JSON.parse(init.body as string);
 expect(init.headers).toMatchObject({"x-goog-api-key":"gemini-test"});expect(body.model).toBe("gemini-3.8-flash");expect(body.generation_config.thinking_level).toBe("low");expect(body.generation_config.max_output_tokens).toBe(11500);expect(body.max_completion_tokens).toBeUndefined();expect(body.reasoning_format).toBeUndefined();expect(body.chat_template_kwargs).toBeUndefined();
 await expect(generateSermonSections(input,evidence,{QALAM_SERMON_PROVIDER:"gemini",GROQ_API_KEY:"groq-test"},fetchMock)).rejects.toThrow("not-configured");expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("keeps a source-review repair after a short draft without unbounded retries",async()=>{
 const draft=vi.fn(async(_request:SermonRequest)=>({sections:draft.mock.calls.length===1?sections.map(s=>({...s,text:s.text.slice(0,300)})):sections}));
 let checks=0;
 const check={...reviewer,review:vi.fn(async(_input:AnswerInput,claims:readonly ResearchClaim[])=>{const reject=checks++===0;return {reviews:claims.map((c,i)=>({claimId:c.id,verdict:reject&&i===2?'unsupported':'supported',reason:reject&&i===2?'not-in-evidence':'entailed'}))};})};
 expect((await composeSermon(input,result,{generate:draft,reviewer:check,env:{}})).sections).toHaveLength(5);
 expect(draft).toHaveBeenCalledTimes(3);expect(check.review).toHaveBeenCalledTimes(2);
 expect(draft.mock.calls[2][0].instruction).toContain('section-3');
});

it("preserves rejected-source feedback when a repair draft also needs more length",async()=>{
 let reviewCount=0;
 const auditor={...reviewer,review:vi.fn(async(reviewInput:AnswerInput,claims:readonly ResearchClaim[])=>{
  const first=reviewCount++===0;
  return {reviews:claims.map((claim,i)=>({claimId:claim.id,verdict:first&&i===0?"unsupported":"supported",reason:first&&i===0?"not-in-evidence":"entailed"})),sentenceAudit:claims.map((claim,i)=>({claimId:claim.id,sentences:sermonSentences(claim.text).map((_,n)=>({index:n+1,verdict:first&&i===0&&n===1?"unsupported":"supported",reason:first&&i===0&&n===1?"not-in-evidence":"entailed",refs:[reviewInput.evidence.find(e=>claim.citations.some(c=>c.passageId===e.passage.id))!.ref]}))}))};
 })};
 const generateDraft=vi.fn(async(_request:SermonRequest)=>generateDraft.mock.calls.length===2?{sections:sections.map(section=>({...section,text:section.text.slice(0,300)}))}:{sections});
 await composeSermon(input,result,{generate:generateDraft,reviewer:auditor,env:{}});
 expect(generateDraft).toHaveBeenCalledTimes(3);
 expect(generateDraft.mock.calls[1][0].instruction).toContain("Source review rejected section-1");
 expect(generateDraft.mock.calls[2][0].instruction).toContain("Source review rejected section-1");
 expect(generateDraft.mock.calls[2][0].instruction).toContain(sermonSentences(sections[0].text)[0]);
});
