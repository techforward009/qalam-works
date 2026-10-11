/**
 * Read-only, opt-in OpenRouter bridge for an offline Khateeb experiment.
 * Never used by production routes; actual account-level limits must be
 * configured on the OpenRouter API key separately.
 */
export const OPENROUTER_TRIAL_MODELS = {
  qwen: {id:"qwen/qwen3.5-flash-02-23",inputPerMillion:0.065,outputPerMillion:0.26},
  deepseek: {id:"deepseek/deepseek-v3.2",inputPerMillion:0.2088,outputPerMillion:0.3096},
  lite: {id:"google/gemini-3.1-flash-lite",inputPerMillion:0.25,outputPerMillion:1.50}
} as const;
export type OpenRouterTrialModel=keyof typeof OPENROUTER_TRIAL_MODELS;
const ENDPOINT="https://openrouter.ai/api/v1/chat/completions";
type TrialPayload={messages:{role:string;content:unknown}[];max_completion_tokens?:number;max_tokens?:number;temperature?:number;response_format?:unknown};

/**
 * Conservative reservation: count each UTF-8 byte as a potential input token,
 * and all allowed output tokens at the most expensive FALLBACK price.
 * Not a billing guarantee; a key-level hard spending limit is still needed.
 */
export function estimateOpenRouterTrialCeiling(models:readonly OpenRouterTrialModel[],inputBytes:number,outputTokens:number):number{
  if(!models.length||models.some(m=>!Object.hasOwn(OPENROUTER_TRIAL_MODELS,m))
    || !Number.isInteger(inputBytes)||inputBytes<0||!Number.isInteger(outputTokens)||outputTokens<1)
    throw new Error("invalid-openrouter-estimate");
  const input=Math.max(...models.map(m=>OPENROUTER_TRIAL_MODELS[m].inputPerMillion));
  const output=Math.max(...models.map(m=>OPENROUTER_TRIAL_MODELS[m].outputPerMillion));
  return (inputBytes*input+outputTokens*output)/1_000_000;
}
export function createOpenRouterTrialSession(options:{
  apiKey:string; maxTrialUsd?:number; fetchImpl?:typeof fetch; maxRequests?:number
}){
  if(!options.apiKey?.trim())throw new Error("openrouter-key-required");
  const maxTrialUsd=options.maxTrialUsd??0.35;
  const maxRequests=options.maxRequests??24;
  if(!Number.isFinite(maxTrialUsd)||maxTrialUsd<=0||maxTrialUsd>1||
    !Number.isInteger(maxRequests)||maxRequests<1||maxRequests>40)throw new Error("invalid-openrouter-budget");
  const fetchImpl=options.fetchImpl??fetch;
  let reservedUsd=0,calls=0,observedUsd=0;
  const requestedModels:string[]=[];
  function fetchFor(models:readonly OpenRouterTrialModel[]):typeof fetch {
    if(!models.length||models.length>3||new Set(models).size!==models.length||
      models.some(m=>!Object.hasOwn(OPENROUTER_TRIAL_MODELS,m)))throw new Error("invalid-openrouter-model");
    const ids=models.map(m=>OPENROUTER_TRIAL_MODELS[m].id);
    return async (_upstream:RequestInfo|URL,init?:RequestInit):Promise<Response>=>{
      if(!init||typeof init.body!=="string")throw new Error("invalid-openrouter-request");
      if(calls>=maxRequests)throw new Error("openrouter-request-cap");
      let payload:TrialPayload;
      try{payload=JSON.parse(init.body) as TrialPayload;}catch{throw new Error("invalid-openrouter-request");}
      if(!payload||!Array.isArray(payload.messages)||!payload.messages.length
        ||payload.messages.some(m=>!m||!["system","user","assistant"].includes(m.role)||typeof m.content!=="string"))
        throw new Error("invalid-openrouter-messages");
      const ceiling=payload.max_completion_tokens??payload.max_tokens;
      if(!Number.isInteger(ceiling)||ceiling!<1||ceiling!>5000)throw new Error("invalid-openrouter-output-limit");
      const inputBytes=Buffer.byteLength(JSON.stringify(payload.messages),"utf8");
      if(inputBytes>100_000)throw new Error("openrouter-context-cap");
      const reserve=estimateOpenRouterTrialCeiling(models,inputBytes,ceiling!);
      if(reservedUsd+reserve>maxTrialUsd)throw new Error("openrouter-trial-budget-exceeded");
      calls++;reservedUsd+=reserve;
      requestedModels.push(ids[0]);
      const format=payload.response_format;
      if(format!==undefined && (!format || typeof format!=="object" || !["json_object","json_schema"].includes((format as {type?:string}).type??"")))
        throw new Error("invalid-openrouter-format");
      // Route only supported OpenAI-compatible fields. The original provider
      // bearer token, model and account URLs are NEVER sent to OpenRouter.
      const requestBody={
        ...(ids.length===1?{model:ids[0]}:{models:ids}),
        messages:payload.messages,
        max_completion_tokens:ceiling,
        temperature:typeof payload.temperature==="number" && Number.isFinite(payload.temperature)?payload.temperature:0.2,
        ...(format?{response_format:format}:{}),
        ...(format && (format as {type?:string}).type==="json_schema"?{provider:{require_parameters:true}}:{})
      };
      const response=await fetchImpl(ENDPOINT,{
        method:"POST",
        headers:{"Authorization":"Bearer "+options.apiKey,"Content-Type":"application/json",
          "HTTP-Referer":"https://www.qalamworks.com","X-Title":"Qalam Works Khateeb Offline Trial"},
        body:JSON.stringify(requestBody),signal:init.signal
      });
      // Read only standard billing metadata if present. Never print prompts,
      // the key, or model output. A failed request retains its reservation.
      if(response.ok){
        try{
          const usage=(await response.clone().json())?.usage;
          if(typeof usage?.cost==="number"&&Number.isFinite(usage.cost)&&usage.cost>=0)observedUsd+=usage.cost;
        }catch{/* optional billing metadata */}
      }
      return response;
    };
  }
  return {
    fetchFor,
    status:()=>({calls,reservedUsd:Number(reservedUsd.toFixed(6)),observedUsd:Number(observedUsd.toFixed(6)),requestedModels:[...requestedModels]})
  };
}
