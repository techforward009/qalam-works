/** Retry a short, explicit provider throttle once; never read or log its response body. */
export async function fetchSermonProvider(url: string, init: RequestInit, fetchImpl: typeof fetch = fetch, wait: (ms:number)=>Promise<void> = ms=>new Promise(resolve=>setTimeout(resolve,ms))): Promise<Response> {
  const response=await fetchImpl(url,init);
  if(response.status!==429)return response;
  const retryAfter=response.headers.get("retry-after");
  const seconds=retryAfter===null?NaN:Number(retryAfter);
  if(!Number.isFinite(seconds)||seconds<0||seconds>25)return response;
  await response.body?.cancel();
  await wait(Math.max(1000,Math.ceil(seconds*1000)));
  init.signal?.throwIfAborted();
  return fetchImpl(url,init);
}
