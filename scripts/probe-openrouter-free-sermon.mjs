/**
 * Live, STRICTLY FREE two-model Urdu source-grounding smoke test.
 * Explicit :free slugs, checked against the provider's live zero-cost catalog
 * before sending any completion. No paid model fallback. No private corpus.
 * This script NEVER reads any production corpus or changes application routes.
 */
import {pathToFileURL} from "node:url";
export const FREE_WRITER="google/gemma-4-31b-it:free";
export const FREE_REVIEWER="nvidia/nemotron-3-ultra-550b-a55b:free";
const API="https://openrouter.ai/api/v1";
export const SAMPLE_EVIDENCE=[
 {ref:1,reference:"القرآن، البقرۃ ۲:۱۵۳",arabic:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
   meaning:"اے ایمان والو! صبر اور نماز سے مدد طلب کرو۔ بے شک اللہ صبر کرنے والوں کے ساتھ ہے۔ (صرف آزمائشی مفہوم، قلم ورکس کے مصدقہ ترجمے کا متبادل نہیں)"},
 {ref:2,reference:"نہج البلاغہ، حکمت ۵۵، آزمائشی اقتباس",arabic:"الصَّبْرُ صَبْرَانِ: صَبْرٌ عَلَى مَا تَكْرَهُ، وَصَبْرٌ عَمَّا تُحِبُّ",
   meaning:"صبر کی دو قسمیں ہیں: ناپسندیدہ چیز پر صبر اور پسندیدہ چیز سے رکنے پر صبر۔ (آزمائشی ادارتی مفہوم)"}
];
export function assertActuallyFreeCatalog(data,models=[FREE_WRITER,FREE_REVIEWER]){
 if(!data||!Array.isArray(data.data))throw new Error("free-catalog-invalid");
 if(models.length!==2||new Set(models).size!==2)throw new Error("free-model-independence-required");
 for(const id of models){
  if(!id.endsWith(":free"))throw new Error("non-free-model-blocked");
  const model=data.data.find(m=>m?.id===id);
  if(!model)throw new Error("free-model-not-listed");
  const price=model.pricing;
  if(!price||String(price.prompt)!=="0"||String(price.completion)!=="0"||
    ("request" in price && Number(price.request)!==0)||
    ("web_search" in price && Number(price.web_search)!==0))
   throw new Error("non-zero-free-pricing-blocked");
  if(!model.architecture?.output_modalities?.includes("text"))throw new Error("free-text-model-required");
 }
 return models;
}
export function inspectWriterReply(text){
 const length=text.trim().split(/\s+/u).filter(Boolean).length;
 const matches=[...text.matchAll(/\[(\d+)\]/g)].map(x=>Number(x[1]));
 return {
  wordCount:length,urdu:/[\u0600-\u06ff]/u.test(text),
  validReferences:matches.length>0&&matches.every(n=>n===1||n===2),
  mentionsBoth:matches.includes(1)&&matches.includes(2),
  hasLatin:/[A-Za-z]/.test(text),
  usable:length>=65&&length<=240&&matches.includes(1)&&matches.includes(2)&&matches.every(n=>n===1||n===2)&&!/[\p{Script=Latin}]/u.test(text)
 };
}
function briefError(status){
 if(status===429)return "free-quota-or-provider-rate-limit";
 if(status===402)return "free-request-payment-blocked";
 if(status===401||status===403)return "free-key-not-authorized";
 return "free-provider-error-"+status;
}
async function readJson(response){
 try{return await response.json();}catch{throw new Error("invalid-provider-json");}
}
export async function runFreeProbe({apiKey,fetchImpl=fetch,log=console.log}){
 if(!apiKey?.trim())throw new Error("OPENROUTER_API_KEY-required");
 const catalogResponse=await fetchImpl(API+"/models",{method:"GET",signal:AbortSignal.timeout(20000)});
 if(!catalogResponse.ok)throw new Error("free-catalog-unavailable");
 const models=assertActuallyFreeCatalog(await readJson(catalogResponse));
 log("FREE_MODEL_CATALOG "+JSON.stringify({writer:models[0],reviewer:models[1],bothZeroPriced:true}));
 let freeCalls=0;
 async function ask(model,messages,maxTokens){
  if(freeCalls>=2)throw new Error("free-call-cap");
  if(!models.includes(model)||!model.endsWith(":free"))throw new Error("non-free-model-blocked");
  freeCalls++;
  const response=await fetchImpl(API+"/chat/completions",{
    method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json",
      "HTTP-Referer":"https://www.qalamworks.com","X-Title":"Qalam Khateeb Free Fixture Smoke Test"},
    body:JSON.stringify({model,messages,max_tokens:maxTokens,temperature:0.3,stream:false}),
    signal:AbortSignal.timeout(105000)
  });
  if(!response.ok){await response.body?.cancel();throw new Error(briefError(response.status));}
  const payload=await readJson(response);
  const actual=payload.model;
  // A free slug may be normalized in a response, but only a listed FREE slug
  // can be sent: the upstream model is never chosen by this application.
  const content=payload?.choices?.[0]?.message?.content;
  if(typeof content!=="string"||content.length<25)throw new Error("free-empty-model-output");
  const cost=payload?.usage?.cost;
  if(typeof cost==="number"&&cost>0)throw new Error("free-unexpected-charged-usage");
  return {content,actualModel:typeof actual==="string"?actual:"not-reported",
    tokens:payload?.usage?{input:payload.usage.prompt_tokens??null,output:payload.usage.completion_tokens??null}:null};
 }
 const instruction=[
  "صرف ذیل میں موجود عربی متن اور فراہم کردہ اردو مفہوم کو بنیاد بنائیں۔",
  "اردو میں مختصر منبری تمہید کے دو مربوط پیراگراف، تقریباً ۱۱۰ الفاظ لکھیں۔",
  "ہر اہم بات کے ساتھ حوالہ [1] یا [2] لگائیں؛ دونوں حوالوں کا استعمال کریں۔",
  "اصل میں موجود نہ ہونے والی حدیث، حکم، تاریخی واقعہ، وعدہ یا نتیجہ اپنی طرف سے نہ بڑھائیں۔",
  "سادہ اردو رسم الخط استعمال کریں، کسی قسم کی فہرست یا انگریزی لفظ نہ لکھیں۔"
 ].join("\n");
 const draft=await ask(models[0],[{role:"system",content:"آپ اردو مذہبی تحریر کے معاون ہیں۔ صرف دیے گئے متن تک محدود رہیں۔"},{role:"user",content:JSON.stringify({instruction,evidence:SAMPLE_EVIDENCE})}],640);
 const precheck=inspectWriterReply(draft.content);
 log("FREE_WRITER_RESULT "+JSON.stringify({model:draft.actualModel,requested:models[0],words:precheck.wordCount,urdu:precheck.urdu,validReferences:precheck.validReferences,mentionsBoth:precheck.mentionsBoth,hasLatin:precheck.hasLatin,usable:precheck.usable,tokens:draft.tokens}));
 // Retain the real text as a GitHub Actions artifact; source is only a public
 // excerpt and provisional gloss, never hidden texts or private corpus.
 const reviewPrompt=[
  "You are a SEPARATE critical source auditor. Read the Urdu draft. Check EACH religious or historical assertion against ONLY the two Arabic source excerpts and their provisional supplied meanings. Do not add outside facts.",
  "Reply in Urdu only. For any unsupported statement, reproduce a short identifiable quote from that statement and explain briefly what the supplied source does NOT establish.",
  "Finish with exactly one English machine marker on its own line: VERDICT: SUPPORTED or VERDICT: UNSUPPORTED.",
  "Do not approve unsupported source expansions or invented quotations. A supported ordinary rhetorical question is fine.",
  JSON.stringify({sources:SAMPLE_EVIDENCE,sermon:draft.content})
 ].join("\n\n");
 const reviewed=await ask(models[1],[{role:"user",content:reviewPrompt}],780);
 const verdict=reviewed.content.match(/VERDICT:\s*(SUPPORTED|UNSUPPORTED)/g);
 const approved=verdict?.length===1&&verdict[0]==="VERDICT: SUPPORTED";
 log("FREE_INDEPENDENT_REVIEW "+JSON.stringify({requested:models[1],model:reviewed.actualModel,reviewed:!!verdict?.length,approved,tokens:reviewed.tokens,freeCalls}));
 // Console output shows an exact but bounded sample, no secret.
 log("FREE_WRITER_EXCERPT "+JSON.stringify({text:draft.content.slice(0,1100)}));
 log("FREE_REVIEW_EXCERPT "+JSON.stringify({text:reviewed.content.slice(0,1100)}));
 return {ok:precheck.usable&&approved,freeCalls,writer:precheck,reviewed:!!verdict?.length,approved};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv.includes("--dry-run")){
  const catalog={data:[FREE_WRITER,FREE_REVIEWER].map(id=>({id,pricing:{prompt:"0",completion:"0"},architecture:{output_modalities:["text"]}}))};
  assertActuallyFreeCatalog(catalog);
  console.log("OPENROUTER_FREE_DRY_RUN "+JSON.stringify({ready:true,calls:0,models:[FREE_WRITER,FREE_REVIEWER],sources:SAMPLE_EVIDENCE.map(x=>x.reference)}));
 }else if(process.argv.includes("--live-free")){
  try{
   const result=await runFreeProbe({apiKey:process.env.OPENROUTER_API_KEY});
   console.log("OPENROUTER_FREE_RESULT "+JSON.stringify(result));
   if(!result.ok)process.exitCode=2;
  }catch(error){
   console.error("OPENROUTER_FREE_ERROR "+JSON.stringify({code:error instanceof Error?error.message:"unknown"}));
   process.exitCode=2;
  }
 }else{console.error("Use --dry-run or --live-free");process.exitCode=2;}
}
