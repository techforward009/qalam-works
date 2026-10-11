import { expect, it, vi } from "vitest";
import { generateStagedSermonSections, planSermonStageEvidence } from "../app/lib/knowledge/sermonStagedGeneration";
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

it("allows a middle section to cite only its relevant Quran source once a primary hadith is retained elsewhere",async()=>{
 const requests:any[]=[];
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  const body=JSON.parse(init!.body as string);requests.push(body);
  const idx=requests.length-1;
  // The first stage carries the primary hadith; later stages need not
  // repeat it merely to satisfy an artificial stage-by-stage source quota.
  const refs=idx===0?[1,2]:idx===1?[3]:idx===2?[1]:idx===3?[3]:[2];
  const text=Array.from({length:34},(_,n)=>
    "سامعین کرام، اس ماخذ کی عبارت میں صبر کے موضوع پر غور کرنے کا موقع ملتا ہے۔ آئیے اس کے الفاظ کو پڑھیں اور سوال نمبر "+(idx*100+n+1)+" پر توجہ دیں۔"
  ).join(" ");
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections:[{heading:"صبر پر گفتگو",text,refs}]})}}]}));
 });
 const result=await generateStagedSermonSections(input,evidence,{GROQ_API_KEY:"test"},fetchMock) as {sections:{refs:number[]}[]};
 expect(result.sections).toHaveLength(5);
 expect(result.sections[1].refs).toEqual([3]);
 expect(fetchMock).toHaveBeenCalledTimes(5);
});

it("accepts a source-cited 314-word middle section; final duration is still audited separately",async()=>{
 let count=0;
 const fetchMock=vi.fn(async()=>{
   const index=count++;
   const refs=index===0?[1,2,3]:index===1?[1,2]:index===2?[1,2]:index===3?[3]:[2];
   const wordCount=index===2?314:340;
   const text=Array.from({length:wordCount},(_,i)=>i%2?"سوال":"صبر").join(" ");
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections:[{heading:"صبر کا سبق",text,refs}]})}}]}));
 });
 const draft=await generateStagedSermonSections(input,evidence,{GROQ_API_KEY:"test"},fetchMock) as {sections:{text:string}[]};
 expect(draft.sections).toHaveLength(5);
 expect(draft.sections[2].text.trim().split(/\s+/u)).toHaveLength(314);
 expect(fetchMock).toHaveBeenCalledTimes(5);
});

it("regenerates only source-review-rejected stages instead of paying for five full sections again",async()=>{
 const prior=Array.from({length:5},(_,i)=>({
   heading:"سابقہ حصہ "+(i+1),
   text:Array.from({length:115},(_,n)=>"اس آیت پر غور کا سوال "+(i+1)+" "+n+" ہے۔").join(" "),
   refs:i===0?[1,2]:i===2?[2]:[3]
 }));
 const fetchMock=vi.fn(async()=>{
   const text=Array.from({length:38},(_,n)=>
     "سامعین محترم، آج صبر کے موضوع پر غور کے لیے یہ سوال سامنے رکھیں کہ کیا ہم اصل عبارت کو بغیر کسی اضافے کے سمجھتے ہیں؟ "+(n+1)
   ).join(" ");
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections:[{heading:"درست کیا گیا حصہ",text,refs:[2]}]})}}]}));
 });
 const draft=await generateStagedSermonSections({
   ...input,previous:JSON.stringify({sections:prior}),repairSectionIndexes:[2]
 },evidence,{GROQ_API_KEY:"test"},fetchMock) as {sections:{heading:string;text:string;refs:number[]}[]};
 expect(draft.sections).toHaveLength(5);
 expect(fetchMock).toHaveBeenCalledTimes(1);
 expect(draft.sections[2].heading).toBe("درست کیا گیا حصہ");
 expect(draft.sections[0]).toEqual(prior[0]);
 expect(draft.sections[1]).toEqual(prior[1]);
 expect(draft.sections[3]).toEqual(prior[3]);
});

it("allocates different verified sources across five stages rather than repeating one saying",()=>{
 const more=Array.from({length:8},(_,i)=>({
    ...evidence[0],ref:i+1,passage:{...evidence[0].passage,id:"quran:test:"+i,collection:i===5?"nahj":"quran"}
 })) as AnswerEvidence[];
 const groups=planSermonStageEvidence(more);
 expect(groups).toHaveLength(5);
 expect(groups.every(x=>x.length>0&&x.length<=3)).toBe(true);
 expect(groups[0].map(e=>e.ref)).not.toEqual(groups[1].map(e=>e.ref));
 expect(groups[2].some(e=>e.passage.collection!=="quran")).toBe(true);
 expect(new Set(groups.flatMap(g=>g.map(e=>e.ref))).size).toBeGreaterThanOrEqual(6);
});

it("passes each stage only the evidence assigned to it, preserving global reference integers",async()=>{
 const rich=Array.from({length:8},(_,i)=>({
  ...evidence[0],ref:i+1,passage:{...evidence[0].passage,id:"quran:test:"+i,collection:i===5?"nahj":"quran"}
 })) as AnswerEvidence[];
 const intended=planSermonStageEvidence(rich);
 const requests:any[]=[];
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  const body=JSON.parse(init!.body as string);const idx=requests.length;requests.push(body);
  const text=Array.from({length:340},(_,i)=>i%2?"سوال":"صبر").join(" ");
  const refs=intended[idx].map(e=>e.ref).slice(0,2);
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({sections:[{heading:"صبر کی گفتگو",text,refs}]})}}]}));
 });
 const result=await generateStagedSermonSections(input,rich,{GROQ_API_KEY:"test"},fetchMock) as {sections:{refs:number[]}[]};
 expect(result.sections).toHaveLength(5);
 expect(requests).toHaveLength(5);
 requests.forEach((body,index)=>{
  const refs=body.messages[1].content&&JSON.parse(body.messages[1].content).evidence.map((e:{ref:number})=>e.ref);
  expect(refs).toEqual(intended[index].map(e=>e.ref));
  expect(body.response_format.type).toBe("json_object");
 });
});
