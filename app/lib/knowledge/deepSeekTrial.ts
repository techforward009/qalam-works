/**
 * Opt-in, offline-only DeepSeek direct provider. Not imported by production routes.
 * Pricing is the September 2026 published PEAK upper estimate, not an invoice.
 * Billing is controlled by DeepSeek's separate prepaid account, not this code.
 */
export const DEEPSEEK_TRIAL_MODELS={
  writer:{id:"deepseek-flash",inputPerMillion:0.30,outputPerMillion:1.20},
  reviewer:{id:"deepseek-v4-pro",inputPerMillion:1.32,outputPerMillion:3.96},
} as const;
export type DeepSeekTrialRole=keyof typeof DEEPSEEK_TRIAL_MODELS;
const CHAT_ENDPOINT="https://api.deepseek.com/chat/completions";
const BALANCE_ENDPOINT="https://api.deepseek.com/user/balance";

export async function checkDeepSeekTrialBalance(options:{apiKey:string;fetchImpl?:typeof fetch}):
 Promise<{available:boolean;usd:number|null}>{
  if(!options.apiKey?.trim())throw new Error("deepseek-key-required");
  const response=await (options.fetchImpl??fetch)(BALANCE_ENDPOINT,{
    method:"GET",headers:{Authorization:"Bearer "+options.apiKey}
  });
  if(!response.ok)throw new Error("deepseek-balance-unavailable");
  let data:unknown;
  try{data=await response.json();}catch{throw new Error("deepseek-balance-unavailable");}
  const record=data as {is_available?:unknown;balance_infos?:unknown};
  if(typeof record?.is_available!=="boolean"||!Array.isArray(record.balance_infos))
    throw new Error("deepseek-balance-invalid");
  const usd=record.balance_infos.find((x:unknown)=>!!x&&typeof x==="object"&&(x as {currency?:unknown}).currency==="USD");
  const amount=usd&&Number((usd as {total_balance?:unknown}).total_balance);
  if(usd&&(typeof (usd as {total_balance?:unknown}).total_balance!=="string"||!Number.isFinite(amount)||amount<0))
    throw new Error("deepseek-balance-invalid");
  return {available:record.is_available,usd:usd?amount:null};
}

export function estimateDeepSeekTrialCeiling(role:DeepSeekTrialRole,inputBytes:number,outputTokens:number):number{
  const price=DEEPSEEK_TRIAL_MODELS[role];
  if(!price||!Number.isSafeInteger(inputBytes)||inputBytes<0
    ||!Number.isSafeInteger(outputTokens)||outputTokens<1)throw new Error("invalid-deepseek-estimate");
  // Every UTF-8 byte is reserved as a possible input token, deliberately overestimates.
  return (inputBytes*price.inputPerMillion+outputTokens*price.outputPerMillion)/1_000_000;
}

export function createDeepSeekTrialSession(options:{
  apiKey:string;maxTrialUsd?:number;maxRequests?:number;fetchImpl?:typeof fetch
}){
  if(!options.apiKey?.trim())throw new Error("deepseek-key-required");
  const maxTrialUsd=options.maxTrialUsd??0.35, maxRequests=options.maxRequests??24;
  if(!Number.isFinite(maxTrialUsd)||maxTrialUsd<=0||maxTrialUsd>0.5
    ||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>30)throw new Error("invalid-deepseek-trial-budget");
  const fetchImpl=options.fetchImpl??fetch;
  let requests=0,reservedUsd=0;
  const counts:{writer:number;reviewer:number}={writer:0,reviewer:0};
  const usage={promptTokens:0,completionTokens:0};
  return {
    fetchFor(role:DeepSeekTrialRole):typeof fetch {
      if(!Object.hasOwn(DEEPSEEK_TRIAL_MODELS,role))throw new Error("invalid-deepseek-model-role");
      return async (_ignoredUrl:RequestInfo|URL,init?:RequestInit):Promise<Response>=>{
        if(!init||typeof init.body!=="string"||init.method?.toUpperCase()!=="POST")
          throw new Error("invalid-deepseek-request");
        let payload:Record<string,unknown>;
        try{payload=JSON.parse(init.body);}catch{throw new Error("invalid-deepseek-request");}
        if(!payload||!Array.isArray(payload.messages)||!payload.messages.length||
          payload.messages.length>20||payload.messages.some((m:unknown)=>
            !m||typeof m!=="object"||!["system","user","assistant"].includes((m as {role?:string}).role??"")||
            typeof (m as {content?:unknown}).content!=="string"))
          throw new Error("invalid-deepseek-messages");
        const output=payload.max_completion_tokens??payload.max_tokens;
        if(!Number.isInteger(output)||!(output as number)||Number(output)>5500)
          throw new Error("invalid-deepseek-output-limit");
        const promptBytes=Buffer.byteLength(JSON.stringify(payload.messages),"utf8");
        if(promptBytes>85_000)throw new Error("deepseek-context-cap");
        const reservation=estimateDeepSeekTrialCeiling(role,promptBytes,output as number);
        if(requests>=maxRequests)throw new Error("deepseek-request-cap");
        if(reservedUsd+reservation>maxTrialUsd)throw new Error("deepseek-trial-budget-exceeded");
        // DeepSeek only supports json_object, not OpenAI strict json_schema.
        const incomingFormat=payload.response_format as {type?:string}|undefined;
        if(incomingFormat&&!["json_schema","json_object"].includes(incomingFormat.type??""))
          throw new Error("invalid-deepseek-output-format");
        const max=output as number;
        // Do not forward the previous provider's credentials, host, model ID,
        // chat template settings or unsupported JSON schema fields.
        const requestBody={
          model:DEEPSEEK_TRIAL_MODELS[role].id,
          messages:payload.messages,
          thinking:{type:"disabled"},
          max_tokens:max,
          response_format:{type:"json_object"},
        };
        requests++;reservedUsd+=reservation;counts[role]++;
        const response=await fetchImpl(CHAT_ENDPOINT,{
          method:"POST",
          headers:{Authorization:"Bearer "+options.apiKey,"Content-Type":"application/json"},
          body:JSON.stringify(requestBody),
          signal:init.signal
        });
        if(response.ok){
          try{
            const metrics=(await response.clone().json())?.usage;
            if(typeof metrics?.prompt_tokens==="number"&&metrics.prompt_tokens>=0)usage.promptTokens+=metrics.prompt_tokens;
            if(typeof metrics?.completion_tokens==="number"&&metrics.completion_tokens>=0)usage.completionTokens+=metrics.completion_tokens;
          }catch{/* optional usage metrics */}
        }
        return response;
      };
    },
    status:()=>({requests,writerCalls:counts.writer,reviewerCalls:counts.reviewer,
      reservedUsd:Number(reservedUsd.toFixed(6)),...usage}),
  };
}
