import {expect,it,vi} from "vitest";
import {fetchSermonProvider,sermonProviderSignal,sermonThrottleMetrics,sermonProviderErrorDetails} from "../app/lib/knowledge/sermonProviderFetch";
it("retries an explicit short throttle once",async()=>{
 const fetchMock=vi.fn().mockResolvedValueOnce(new Response(null,{status:429,headers:{"retry-after":"2"}})).mockResolvedValueOnce(new Response("ok"));const wait=vi.fn(async()=>{});
 expect((await fetchSermonProvider("https://provider.test",{},fetchMock,wait)).status).toBe(200);expect(wait).toHaveBeenCalledWith(3000);expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("does not loop or guess an unbounded delay",async()=>{
 for(const retryAfter of [null,"90","invalid","-1"]){const fetchMock=vi.fn(async()=>new Response(null,{status:429,headers:retryAfter===null?{}:{"retry-after":retryAfter}}));const wait=vi.fn(async()=>{});expect((await fetchSermonProvider("https://provider.test",{},fetchMock,wait)).status).toBe(429);expect(fetchMock).toHaveBeenCalledTimes(1);expect(wait).not.toHaveBeenCalled();}
 const fetchMock=vi.fn(async()=>new Response(null,{status:429,headers:{"retry-after":"0"}}));await fetchSermonProvider("https://provider.test",{},fetchMock,async()=>{});expect(fetchMock).toHaveBeenCalledTimes(3);
});
it("honors cancellation before retrying",async()=>{
 const controller=new AbortController();const fetchMock=vi.fn(async()=>new Response(null,{status:429,headers:{"retry-after":"1"}}));await expect(fetchSermonProvider("https://provider.test",{signal:controller.signal},fetchMock,async()=>controller.abort())).rejects.toThrow();expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("honors a full-minute provider delay without repeated retries",async()=>{
 const fetchMock=vi.fn().mockResolvedValueOnce(new Response(null,{status:429,headers:{"retry-after":"59"}})).mockResolvedValueOnce(new Response("ok"));const wait=vi.fn(async()=>{});
 expect((await fetchSermonProvider("https://provider.test",{},fetchMock,wait)).status).toBe(200);expect(wait).toHaveBeenCalledWith(60000);expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("cancels a pending wait without leaving a retry request",async()=>{
 const controller=new AbortController();const fetchMock=vi.fn(async()=>new Response(null,{status:429,headers:{"retry-after":"60"}}));const pending=fetchSermonProvider("https://provider.test",{signal:controller.signal},fetchMock);await Promise.resolve();controller.abort();await expect(pending).rejects.toThrow();expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("rejects an expired composition deadline before any provider work",()=>{
 expect(()=>sermonProviderSignal(Date.now()-1)).toThrow("composition-timeout");expect(sermonProviderSignal(Date.now()+10000).aborted).toBe(false);
});

it("extracts numeric quota facts without retaining private provider text",()=>{
 const metrics=sermonThrottleMetrics({error:{message:"private organization and topic: Limit 8000, Used 600, Requested 9100. Please try again in 12.4s."}});expect(metrics).toEqual({limit:8000,used:600,requested:9100,retrySeconds:12.4});expect(JSON.stringify(metrics)).not.toContain("private");
});
it("reduces an oversized output reservation using the provider count, without changing evidence",async()=>{
 const original={max_completion_tokens:3500,messages:[{content:"verified evidence"}],response_format:{json_schema:{name:"sermon_composition"}}};
 const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:{message:"tokens per minute (TPM): Limit 8000, Requested 9100"}}),{status:429})).mockResolvedValueOnce(new Response("ok"));
 expect((await fetchSermonProvider("https://provider.test",{body:JSON.stringify(original)},fetchMock)).status).toBe(200);
 const revised=JSON.parse(fetchMock.mock.calls[1][1].body);expect(revised.max_completion_tokens).toBe(2272);expect(revised.messages).toEqual(original.messages);
});
it("does not shrink below the composition floor or retry an impossible input",async()=>{
 const fetchMock=vi.fn(async()=>new Response(JSON.stringify({error:{message:"tokens per minute (TPM): Limit 8000, Requested 14000"}}),{status:429}));expect((await fetchSermonProvider("https://provider.test",{body:JSON.stringify({max_completion_tokens:3500,response_format:{json_schema:{name:"sermon_composition"}}})},fetchMock)).status).toBe(429);expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("distinguishes request limits from input and output token limits",()=>{
 for(const unit of ["TPM","ITPM","OTPM","RPM","RPD","TPD"])expect(sermonThrottleMetrics({error:{message:`quota (${unit}): Limit 1000, Used 999, Requested 182`}})).toMatchObject({unit,limit:1000,used:999,requested:182});
});
it("never adjusts output tokens for request counts or an unidentified quota",async()=>{
 for(const prefix of ["requests per day (RPD): ",""]){const fetchMock=vi.fn(async()=>new Response(JSON.stringify({error:{message:prefix+"Limit 1000, Requested 1031"}}),{status:429}));await fetchSermonProvider("https://provider.test",{body:JSON.stringify({max_completion_tokens:3500})},fetchMock);expect(fetchMock).toHaveBeenCalledTimes(1);}
});
it("retains a known format error code without model output or private messages",async()=>{
 const details=await sermonProviderErrorDetails(new Response(JSON.stringify({error:{code:"json_validate_failed",message:"private source",failed_generation:"private draft"}}),{status:400}));expect(details).toMatchObject({code:"json_validate_failed"});expect(JSON.stringify(details)).not.toContain("private");
});
