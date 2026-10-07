/** Retain only quota units, numeric counts and known error codes. */
type SermonErrorMetrics={unit?:string;limit?:number;used?:number;requested?:number;retrySeconds?:number;code?:string};
export function sermonThrottleMetrics(payload:unknown):SermonErrorMetrics{
  const message=payload&&typeof payload==="object"&&(payload as {error?:{message?:unknown}}).error?.message;
  if(typeof message!=="string")return {};
  const number=(pattern:RegExp)=>{const found=message.match(pattern);return found?Number(found[1]):undefined;};
  const unit=message.match(/\b(ITPM|OTPM|TPM|TPD|RPM|RPD)\b(?=[^:]*:|[^L]*Limit)/i)?.[1]?.toUpperCase();
  return {...(unit?{unit}:{}),limit:number(/\bLimit\s*:?\s*(\d+)/i),used:number(/\bUsed\s*:?\s*(\d+)/i),requested:number(/\bRequested\s*:?\s*(\d+)/i),retrySeconds:number(/try again in\s+(\d+(?:\.\d+)?)s\b/i)};
}
export async function sermonProviderErrorDetails(response:Response):Promise<SermonErrorMetrics>{
  try{
    const reader=response.clone().body?.getReader();if(!reader)return {};
    const chunks:Uint8Array[]=[];let bytes=0;
    while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>4096){void reader.cancel();return {};}chunks.push(chunk.value);}
    const payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const rawCode=payload?.error?.code;
    const code=["rate_limit_exceeded","json_validate_failed","context_length_exceeded","invalid_request_error","invalid_api_key","model_not_found"].includes(rawCode)?rawCode:undefined;
    return {...sermonThrottleMetrics(payload),...(code?{code}:{})};
  }catch{return {};}
}
export async function fetchSermonProvider(url:string,init:RequestInit,fetchImpl:typeof fetch=fetch,wait?:(ms:number)=>Promise<void>):Promise<Response>{
  let waited=0;let request=init;
  for(let attempt=0;attempt<3;attempt++){
    request.signal?.throwIfAborted();
    let response:Response;
    try{response=await fetchImpl(url,request);}
    catch(error){console.warn("Sermon provider transport",{code:error instanceof Error&&error.name==="TimeoutError"?"timeout":request.signal?.aborted?"aborted":"unavailable"});throw error;}
    if(response.status===503&&attempt<2){
      const delay=(attempt+1)*1000;
      console.warn("Sermon provider transient retry",{status:503,attempt,delayMs:delay});
      await response.body?.cancel();
      await (wait??(ms=>waitForSermonRetry(ms,request.signal)))(delay);
      continue;
    }
    if(response.status!==429){
      if(!response.ok)console.warn("Sermon provider rejection",{status:response.status,...await sermonProviderErrorDetails(response)});
      return response;
    }
    const details=await sermonProviderErrorDetails(response);
    request.signal?.throwIfAborted();
    const numericHeader=(name:string)=>{const value=response.headers.get(name);return value!==null&&/^\d+(?:\.\d+)?$/.test(value)?Number(value):undefined;};
    const seconds=numericHeader("retry-after")??details.retrySeconds;
    console.warn("Sermon provider throttle",{attempt,retryAfterSeconds:seconds,tokenLimit:numericHeader("x-ratelimit-limit-tokens"),remainingTokens:numericHeader("x-ratelimit-remaining-tokens"),remainingRequests:numericHeader("x-ratelimit-remaining-requests"),...details});
    if(attempt===2)return response;
    // If the provider's own token count exceeds its ceiling, reduce only the output reservation.
    if((details.unit==="TPM"||details.unit==="OTPM")&&details.requested!==undefined&&details.limit!==undefined&&details.requested>details.limit&&typeof request.body==="string"){
      try{
        const body=JSON.parse(request.body);const budget=body.max_completion_tokens;
        const minimum=body.response_format?.json_schema?.name==="sermon_composition"?2000:800;
        const reduced=budget-(details.requested-details.limit)-128;
        if(Number.isInteger(budget)&&reduced>=minimum){
          await response.body?.cancel();request={...request,body:JSON.stringify({...body,max_completion_tokens:reduced})};continue;
        }
      }catch{/* Invalid or nonadjustable requests remain rejected. */}
      return response;
    }
    const delay=seconds===undefined?NaN:Math.min(60000,Math.max(1000,Math.ceil(seconds*1000)+1000));
    if(!Number.isFinite(delay)||(seconds!==undefined&&(seconds<0||seconds>60))||waited+delay>60_000)return response;
    await response.body?.cancel();waited+=delay;
    await (wait??(ms=>waitForSermonRetry(ms,request.signal)))(delay);
  }
  throw new Error("provider-rate-limited");
}
function waitForSermonRetry(ms:number,signal?:AbortSignal|null):Promise<void>{
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(signal.reason);return;}
    const abort=()=>{clearTimeout(timer);signal?.removeEventListener("abort",abort);reject(signal?.reason);};
    const timer=setTimeout(()=>{signal?.removeEventListener("abort",abort);resolve();},ms);
    signal?.addEventListener("abort",abort,{once:true});
  });
}
export function sermonProviderSignal(deadline?:number,maximumMs=90_000):AbortSignal{
  const remaining=deadline===undefined?maximumMs:Math.min(maximumMs,deadline-Date.now());
  if(remaining<=0)throw new Error("composition-timeout");
  return AbortSignal.timeout(Math.max(1,Math.ceil(remaining)));
}

export function parseSermonProviderContent(payload:unknown,stage:"generation"|"review"):unknown{
  const body=payload as {choices?:{finish_reason?:unknown;message?:{content?:unknown}}[];result?:{choices?:{finish_reason?:unknown;message?:{content?:unknown}}[];response?:unknown};usage?:{completion_tokens?:unknown}}|null;
  const choice=(body?.choices??body?.result?.choices)?.[0];
  const content=choice?.message?.content??body?.result?.response;
  const fail=(code:string):never=>{
    console.warn("Sermon provider format",{stage,code,completionTokens:typeof body?.usage?.completion_tokens==="number"?body.usage.completion_tokens:undefined});
    throw new Error("provider-format");
  };
  if(choice?.finish_reason==="length")return fail("truncated");
  if(typeof content!=="string"&&!content)return fail("missing-content");
  if(typeof content!=="string")return content;
  try{return JSON.parse(content.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim());}
  catch{return fail("invalid-json");}
}
