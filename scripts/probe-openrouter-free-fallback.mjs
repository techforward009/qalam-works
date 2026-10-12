/** Multi-candidate, read-only catalog gated FREE OpenRouter Urdu source audit.
 * This file is ONLY an opt-in fixture experiment. No private research corpus.
 */
import {pathToFileURL} from "node:url";
import {SAMPLE_EVIDENCE,inspectWriterReply,assertActuallyFreeCatalog} from "./probe-openrouter-free-sermon.mjs";
const API="https://openrouter.ai/api/v1";
export const FREE_WRITE_CANDIDATES=[
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
] ;
export const FREE_REVIEW_CANDIDATES=[
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "thinkingmachines/inkling-small:free"
];
function org(id){return id.split("/")[0];}
export function selectFreeCandidates(catalog){
 if(!catalog||!Array.isArray(catalog.data))throw new Error("missing-model-catalog");
 const all=[...new Set([...FREE_WRITE_CANDIDATES,...FREE_REVIEW_CANDIDATES])];
 const zero=new Set(all.filter(id=>{
   const m=catalog.data.find(x=>x?.id===id);
   const p=m?.pricing;
   return Boolean(id.endsWith(":free")&&m?.architecture?.output_modalities?.includes("text")
    &&p&&Number(p.prompt)===0&&Number(p.completion)===0
    &&("request" in p?Number(p.request)===0:true)
    &&("web_search" in p?Number(p.web_search)===0:true));
 }));
 const writers=FREE_WRITE_CANDIDATES.filter(x=>zero.has(x));
 const reviewers=FREE_REVIEW_CANDIDATES.filter(x=>zero.has(x));
 if(!writers.length||!reviewers.length||![...writers,...reviewers].some(w=>reviewers.some(r=>r!==w&&org(r)!==org(w))))throw new Error("no-independent-free-pair");
 return {writers,reviewers};
}
const allowedFailure=new Set([429,502,503,504]);
export async function probeFreeFallback({apiKey,fetchImpl=fetch,log=console.log}){
 if(!apiKey?.trim())throw new Error("missing-free-api-key");
 const cat=await fetchImpl(API+"/models",{method:"GET",signal:AbortSignal.timeout(25000)});
 if(!cat.ok)throw new Error("catalog-unavailable");
 const choices=selectFreeCandidates(await cat.json());
 let calls=0;const failures=[];
 log("FREE_CATALOG_SELECTION "+JSON.stringify({writers:choices.writers,reviewers:choices.reviewers,allZero:true}));
 const ask=async(model,messages,max_tokens)=>{
  if(calls>=5)throw new Error("free-request-safety-cap");
  if(!model.endsWith(":free")||![...choices.writers,...choices.reviewers].includes(model))throw new Error("free-price-guard");
  calls++;
  let response;
  try {
   response=await fetchImpl(API+"/chat/completions",{
     method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
     body:JSON.stringify({model,messages,max_tokens,temperature:0.3,stream:false}),
     signal:AbortSignal.timeout(105000)
   });
  }catch(error){return {ok:false,retryable:true,reason:"network-or-timeout"};}
  if(!response.ok){
   let details={};
   try{
    const e=(await response.json())?.error;
    const t=e?.metadata?.error_type;
    const p=e?.metadata?.provider_code;
    details={...(typeof t==="string"&&/^[a-z_]{1,60}$/.test(t)?{type:t}:{}),
      ...((typeof p==="number"&&Number.isSafeInteger(p))||(typeof p==="string"&&/^[a-zA-Z0-9_-]{1,40}$/.test(p))?{providerCode:p}:{})};
   }catch{}
   failures.push({model,status:response.status,...details});
   log("FREE_MODEL_REJECTED "+JSON.stringify({model,status:response.status,...details}));
   return {ok:false,retryable:allowedFailure.has(response.status),reason:"http-"+response.status};
  }
  let d;try{d=await response.json();}catch{return {ok:false,retryable:false,reason:"bad-json"};}
  const content=d?.choices?.[0]?.message?.content;
  const cost=d?.usage?.cost;
  if(typeof cost==="number"&&cost>0)throw new Error("unexpected-nonzero-free-charge");
  if(typeof content!=="string"||!content.trim())return {ok:false,retryable:true,reason:"empty-completion"};
  return {ok:true,content,model:d?.model??model,tokens:{
   input:d?.usage?.prompt_tokens??null,output:d?.usage?.completion_tokens??null}};
 };
 const instruction=[
  "یہ صرف ایک تحقیقی نمونہ ہے؛ اضافی تاریخی یا مذہبی دعویٰ نہ لکھیں۔",
  "فراہم کردہ عربی نصوص اور اردو مفہوم تک محدود رہ کر خطیب کے لیے دو مربوط پیراگراف تقریباً ۱۱۰ اردو الفاظ میں لکھیں۔",
  "دونوں حوالے [1] اور [2] استعمال کریں۔ حوالہ صرف اس دعوے کے ساتھ لگائیں جسے ماخذ واقعی ثابت کرتا ہو۔",
  "کوئی انگریزی الفاظ یا فہرست نہ لکھیں۔"
 ].join("\n");
 let writer=null;
 for(const model of choices.writers){
  const outcome=await ask(model,[{role:"system",content:"مختصر، رواں، مستند اردو تحریر لکھیں۔ صرف فراہم کردہ متن استعمال کریں۔"},
  {role:"user",content:JSON.stringify({instruction,evidence:SAMPLE_EVIDENCE})}],800);
  if(outcome.ok){
   const metrics=inspectWriterReply(outcome.content);
   log("FREE_WRITER_AUDIT "+JSON.stringify({model,actual:outcome.model,...metrics,tokens:outcome.tokens}));
   if(metrics.usable){writer={...outcome,model};break;}
   failures.push({model,reason:"failed-format-or-reference-check"});
   continue;
  }
  if(!outcome.retryable)throw new Error("writer-"+outcome.reason);
 }
 if(!writer){log("FREE_FALLBACK_RESULT "+JSON.stringify({ok:false,phase:"writer",calls,failures}));return {ok:false,phase:"writer",calls,failures};}
 let reviewer=null;
 const independence=choices.reviewers.filter(r=>org(r)!==org(writer.model)).slice(0,2);
 for(const model of independence){
  const prompt=[
   "Act as an INDEPENDENT religious-source auditor. Work only with these two supplied excerpts. Check every religious/historical statement in the Urdu text; identify unsupported phrases in Urdu. Do not assume general knowledge establishes a fact.",
   "Give one or more brief Urdu review sentences, then exactly ONE final line: VERDICT: SUPPORTED or VERDICT: UNSUPPORTED.",
   "If any factual statement is not directly entailed by the attached evidence, choose UNSUPPORTED.",
   JSON.stringify({evidence:SAMPLE_EVIDENCE,text:writer.content})
  ].join("\n\n");
  const outcome=await ask(model,[{role:"user",content:prompt}],1000);
  if(outcome.ok){
   const markers=outcome.content.match(/VERDICT:\s*(SUPPORTED|UNSUPPORTED)/g);
   const verdict=markers?.length===1&&markers[0].trim()==="VERDICT: SUPPORTED"?"supported":
      markers?.length===1&&markers[0].trim()==="VERDICT: UNSUPPORTED"?"unsupported":"invalid-review";
   reviewer={...outcome,model,verdict};break;
  }
  if(!outcome.retryable)throw new Error("review-"+outcome.reason);
 }
 log("FREE_FALLBACK_RESULT "+JSON.stringify({ok:!!reviewer&&reviewer.verdict==="supported",phase:reviewer?"reviewed":"review-unavailable",
  writerModel:writer.model,reviewerModel:reviewer?.model??null,verdict:reviewer?.verdict??null,
  calls,failures,writerTokens:writer.tokens,reviewerTokens:reviewer?.tokens??null}));
 log("FREE_WRITER_TEXT "+JSON.stringify({text:writer.content.slice(0,1100)}));
 if(reviewer)log("FREE_REVIEW_TEXT "+JSON.stringify({text:reviewer.content.slice(0,1100)}));
 return {ok:!!reviewer&&reviewer.verdict==="supported",calls,phase:reviewer?"reviewed":"review-unavailable",
   failures,verdict:reviewer?.verdict??null};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv.includes("--dry-run")){
  const all=[...FREE_WRITE_CANDIDATES,...FREE_REVIEW_CANDIDATES];
  const catalog={data:all.map(id=>({id,pricing:{prompt:"0",completion:"0"},architecture:{output_modalities:["text"]}}))};
  const c=selectFreeCandidates(catalog);
  console.log("FREE_FALLBACK_DRY "+JSON.stringify({ready:true,paidCalls:0,writeChoices:c.writers.length,reviewChoices:c.reviewers.length}));
 }else if(process.argv.includes("--live-free")){
  try{const result=await probeFreeFallback({apiKey:process.env.OPENROUTER_API_KEY});if(!result.ok)process.exitCode=2;}
  catch(e){console.log("FREE_FALLBACK_ERROR "+JSON.stringify({reason:e instanceof Error?e.message:"unknown"}));process.exitCode=2;}
 }else{console.log("Choose --dry-run or --live-free");process.exitCode=2;}
}
