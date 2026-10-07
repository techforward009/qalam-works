/** Retry a bounded, explicit provider throttle once; never read or log its response body. */
export async function fetchSermonProvider(url: string, init: RequestInit, fetchImpl: typeof fetch = fetch, wait?: (ms:number)=>Promise<void>): Promise<Response> {
  init.signal?.throwIfAborted();
  const response=await fetchImpl(url,init);
  if(response.status!==429)return response;
  const numericHeader=(name:string)=>{const value=response.headers.get(name);if(value===null||!/^\d+(?:\.\d+)?$/.test(value))return undefined;return Number(value);};
  console.warn("Sermon provider throttle",{retryAfterSeconds:numericHeader("retry-after"),tokenLimit:numericHeader("x-ratelimit-limit-tokens"),remainingTokens:numericHeader("x-ratelimit-remaining-tokens"),remainingRequests:numericHeader("x-ratelimit-remaining-requests")});
  const retryAfter=response.headers.get("retry-after");
  const seconds=retryAfter===null?NaN:Number(retryAfter);
  if(!Number.isFinite(seconds)||seconds<0||seconds>60)return response;
  await response.body?.cancel();
  await (wait??(ms=>waitForSermonRetry(ms,init.signal)))(Math.max(1000,Math.ceil(seconds*1000)));
  init.signal?.throwIfAborted();
  return fetchImpl(url,init);
}

function waitForSermonRetry(ms:number,signal?:AbortSignal|null):Promise<void>{
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(signal.reason);return;}
    const abort=()=>{clearTimeout(timer);signal?.removeEventListener("abort",abort);reject(signal?.reason);};
    const timer=setTimeout(()=>{signal?.removeEventListener("abort",abort);resolve();},ms);
    signal?.addEventListener("abort",abort,{once:true});
  });
}
export function sermonProviderSignal(deadline?:number):AbortSignal{
  const remaining=deadline===undefined?90_000:Math.min(90_000,deadline-Date.now());
  if(remaining<=0)throw new Error("composition-timeout");
  return AbortSignal.timeout(Math.max(1,Math.ceil(remaining)));
}
