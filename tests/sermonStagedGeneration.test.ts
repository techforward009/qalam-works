import { expect, it, vi } from "vitest";
import { generateStagedSermonSections } from "../app/lib/knowledge/sermonStagedGeneration";
import type { AnswerEvidence } from "../app/lib/knowledge/researchAnswer";

const evidence=[
  {ref:1,passage:{id:"quran:test:1",collection:"quran",language:"ar",referenceUr:"قرآن 2:153",referenceEn:"Quran 2:153",text:"اسْتَعِينُوا بِالصَّبْرِ",sourceSha256:"a".repeat(64),translator:null,suppliedTranslation:{text:"صبر سے مدد لو",language:"ur",translator:"آزمائشی"}}},
  {ref:2,passage:{id:"nahj:test:1",recordId:"nahj:test:1",collection:"nahj",language:"ar",referenceUr:"نہج البلاغہ، حکمت 55",referenceEn:"Nahj 55",text:"الصَّبْرُ صَبْرَانِ",sourceSha256:"b".repeat(64),translator:null,suppliedTranslation:{text:"صبر کی دو قسمیں ہیں",language:"ur",translator:"آزمائشی"}}},
  {ref:3,passage:{id:"quran:test:3",collection:"quran",language:"ar",referenceUr:"قرآن 103:3",referenceEn:"Quran 103:3",text:"وَتَوَاصَوْا بِالصَّبْرِ",sourceSha256:"c".repeat(64),translator:null,suppliedTranslation:{text:"صبر کی تلقین کی",language:"ur",translator:"آزمائشی"}}},
] as unknown as AnswerEvidence[];
const input={title:"صبر",duration:20 as const,locale:"ur" as const};

it("creates exactly five substantial sections with source references using five one-section model requests",async()=>{
  const requests:any[]=[];
  const fetchMock=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
    const body=JSON.parse(init!.body as string);
    const idx=requests.length;
    requests.push(body);
    const refs=idx===0?[1]:idx===4?[3]:[2];
    const text=Array.from({length:34},(_,n)=>
      "سامعین کرام، صبر کے اس نکتے کے بارے میں سوال نمبر "+(idx*100+n+1)+" پر غور کیجیے، کیونکہ ہم دی گئی اصل عبارت کا مطلب سمجھنا اور اپنی گفتگو میں اسے درست رکھنا چاہتے ہیں۔"
    ).join(" ");
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections:[{heading:"صبر کے معنی پر غور",text,refs}]})}}]}));
  });
  const raw=await generateStagedSermonSections(input,evidence,{GROQ_API_KEY:"test"},fetchMock);
  expect((raw as {sections:unknown[]}).sections).toHaveLength(5);
  expect(requests).toHaveLength(5);
  for(const body of requests){
    expect(body.messages[0].content).toContain("exactly ONE section");
    expect(body.messages[0].content).not.toContain("Produce exactly five sections");
    expect(body.max_completion_tokens).toBe(2200);
  }
  expect(requests[1].messages[1].content).toContain("previousSections");
});

it("fails closed after two attempts when a short section pretends to be 20 minutes",async()=>{
  const fetchMock=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections:[{heading:"تمہید",text:"مختصر گفتگو۔",refs:[1]}]})}}]})));
  await expect(generateStagedSermonSections(input,evidence,{GROQ_API_KEY:"test"},fetchMock)).rejects.toThrow("staged-insufficient-draft");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
