import {expect,it,vi} from "vitest";
import {createSermonSentenceReviewer} from "../app/lib/knowledge/sermonReview";
import {checkDeepSeekTrialBalance,createDeepSeekTrialSession,DEEPSEEK_TRIAL_MODELS,estimateDeepSeekTrialCeiling} from "../app/lib/knowledge/deepSeekTrial";

const payload=(max_completion_tokens=250):RequestInit=>({
 method:"POST",headers:{Authorization:"Bearer unrelated-key"},
 body:JSON.stringify({
  model:"@cf/model-that-must-not-leak",reasoning_effort:"low",temperature:0.2,
  chat_template_kwargs:{enable_thinking:false},
  messages:[{role:"system",content:"Return JSON only with reviews and reasons."},{role:"user",content:"صبر کا مفہوم کیا ہے؟"}],
  max_completion_tokens,response_format:{type:"json_schema",json_schema:{name:"section",strict:true,schema:{type:"object"}}}
 })
});
it("reads USD account balance without making a paid completion request",async()=>{
 const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({
  is_available:true,balance_infos:[{currency:"USD",total_balance:"2.00",granted_balance:"0",topped_up_balance:"2.00"}]
 }),{status:200}));
 await expect(checkDeepSeekTrialBalance({apiKey:"safe-token",fetchImpl})).resolves.toEqual({available:true,usd:2});
 const [endpoint,init]=fetchImpl.mock.calls[0] as unknown as [string,RequestInit];
 expect(endpoint).toBe("https://api.deepseek.com/user/balance");
 expect(init.method).toBe("GET");
 expect(init.headers).toMatchObject({Authorization:"Bearer safe-token"});
 expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it("fails closed for bad or absent provider balance metadata",async()=>{
 for(const value of [
  {is_available:true,balance_infos:[]},
  {is_available:true,balance_infos:[{currency:"USD",total_balance:"garbled"}]},
  {is_available:"yes",balance_infos:[{currency:"USD",total_balance:"2.0"}]},
 ]){
  const fetchImpl=vi.fn(async()=>new Response(JSON.stringify(value),{status:200}));
  if(!Array.isArray(value.balance_infos)||value.balance_infos.length===0)
   await expect(checkDeepSeekTrialBalance({apiKey:"a",fetchImpl})).resolves.toEqual({available:true,usd:null});
  else await expect(checkDeepSeekTrialBalance({apiKey:"a",fetchImpl})).rejects.toThrow("deepseek-balance-invalid");
 }
});
it("maps the writer to DeepSeek Flash JSON Output with non-thinking mode",async()=>{
 const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:'{"sections":[]}'}}],usage:{prompt_tokens:33,completion_tokens:44}}),{status:200}));
 const session=createDeepSeekTrialSession({apiKey:"direct-key",fetchImpl,maxTrialUsd:0.35});
 const res=await session.fetchFor("writer")("https://api.groq.com/old",payload());
 expect(res.status).toBe(200);
 expect(fetchImpl).toHaveBeenCalledTimes(1);
 const [url,init]=fetchImpl.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe("https://api.deepseek.com/chat/completions");
 expect(init.headers).toMatchObject({Authorization:"Bearer direct-key"});
 const body=JSON.parse(init.body as string);
 expect(body).toMatchObject({model:"deepseek-flash",thinking:{type:"disabled"},max_tokens:250,response_format:{type:"json_object"}});
 expect(body).not.toHaveProperty("temperature");
 expect(body).not.toHaveProperty("reasoning_effort");
 expect(body).not.toHaveProperty("chat_template_kwargs");
 expect(JSON.stringify(body)).not.toContain("unrelated-key");
 expect(JSON.stringify(body)).not.toContain("@cf/model-that-must-not-leak");
 expect(session.status()).toMatchObject({requests:1,writerCalls:1,reviewerCalls:0,promptTokens:33,completionTokens:44});
 expect(JSON.stringify(session.status())).not.toContain("direct-key");
});
it("uses an independent paid Pro model for checking every cited sentence",async()=>{
 const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:'{"reviews":[]}'}}]}),{status:200}));
 const session=createDeepSeekTrialSession({apiKey:"safe",fetchImpl});
 await session.fetchFor("reviewer")("ignored",payload(3000));
 const body=JSON.parse((fetchImpl.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);
 expect(body.model).toBe("deepseek-v4-pro");
 expect(body.response_format).toEqual({type:"json_object"});
 expect(session.status().reviewerCalls).toBe(1);
});
it("refuses overspending or a high number of requests without fetching",async()=>{
 const fetchImpl=vi.fn(async()=>new Response("{}",{status:200}));
 const session=createDeepSeekTrialSession({apiKey:"safe",fetchImpl,maxTrialUsd:0.00001});
 await expect(session.fetchFor("reviewer")("ignored",payload(5500))).rejects.toThrow("deepseek-trial-budget-exceeded");
 expect(fetchImpl).not.toHaveBeenCalled();
 const capped=createDeepSeekTrialSession({apiKey:"safe",fetchImpl,maxRequests:1});
 await capped.fetchFor("writer")("ignored",payload());
 await expect(capped.fetchFor("writer")("ignored",payload())).rejects.toThrow("deepseek-request-cap");
 expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it("rejects requests with unsafe models, unusually large prompts and too many output tokens",async()=>{
 const fetchImpl=vi.fn(async()=>new Response("{}",{status:200}));
 const session=createDeepSeekTrialSession({apiKey:"safe",fetchImpl});
 expect(()=>session.fetchFor("unauthorized" as "writer")).toThrow("invalid-deepseek-model-role");
 await expect(session.fetchFor("writer")("ignored",payload(6000))).rejects.toThrow("invalid-deepseek-output-limit");
 const large=payload();large.body=JSON.stringify({messages:[{role:"user",content:"ا".repeat(50_000)}],max_completion_tokens:250});
 await expect(session.fetchFor("writer")("ignored",large)).rejects.toThrow("deepseek-context-cap");
 expect(fetchImpl).not.toHaveBeenCalled();
});
it("reserves the higher peak rate rather than guessing cheaper off-peak costs",()=>{
 const estimate=estimateDeepSeekTrialCeiling("reviewer",8000,1500);
 expect(estimate).toBeCloseTo((8000*1.32+1500*3.96)/1_000_000,9);
 expect(DEEPSEEK_TRIAL_MODELS.writer.id).toBe("deepseek-flash");
});

it("runs the real sentence reviewer through a separate DeepSeek Pro request and validates every index",async()=>{
 const passage={
  id:"book:test:1",recordId:"book:test:1",collection:"nahj" as const,
  language:"ar" as const,referenceUr:"نہج البلاغہ، حکمت ۵۵",
  referenceEn:"Nahj al-Balagha saying 55",text:"الصَّبْرُ صَبْرَانِ",
  sourceSha256:"b".repeat(64),translator:null,
  suppliedTranslation:{language:"ur" as const,text:"صبر کی دو قسمیں ہیں۔",translator:"Provided"}
 };
 const evidence=[{ref:3,passage}];
 const claims=[{id:"section-1",text:"تمہید\nصبر کی دو قسمیں ہیں۔",citations:[{passageId:passage.id,quote:passage.text}]}];
 const fetchImpl=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
   const req=JSON.parse(init!.body as string);
   expect(req.model).toBe("deepseek-v4-pro");
   expect(req.response_format).toEqual({type:"json_object"});
   const text=JSON.parse(req.messages[1].content);
   const replies=text.sections.map((section:{claimId:string;refs:number[];sentences:{index:number}[]})=>({
     claimId:section.claimId,
     sentences:section.sentences.map(x=>({i:x.index,v:"s",r:"e",refs:[3]}))
   }));
   return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:JSON.stringify({reviews:replies})}}]}),{status:200});
 });
 const direct=createDeepSeekTrialSession({apiKey:"isolated",fetchImpl});
 const reviewer=createSermonSentenceReviewer({
  cloudflareAccountId:"not-used",cloudflareToken:"not-used",preferredProvider:"cloudflare",
  fetchImpl:direct.fetchFor("reviewer"),deadline:Date.now()+30000
 })!;
 const checked=await reviewer.review({question:"صبر",locale:"ur",evidence},claims) as {reviews:{verdict:string}[]};
 expect(checked.reviews).toHaveLength(1);
 expect(checked.reviews[0].verdict).toBe("supported");
 expect(direct.status().reviewerCalls).toBe(1);
 expect(fetchImpl).toHaveBeenCalledTimes(1);
});
