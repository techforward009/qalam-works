import {expect,it,vi} from "vitest";
import {fetchSermonProvider,sermonProviderSignal} from "../app/lib/knowledge/sermonProviderFetch";
it("retries an explicit short throttle once",async()=>{
 const fetchMock=vi.fn().mockResolvedValueOnce(new Response(null,{status:429,headers:{"retry-after":"2"}})).mockResolvedValueOnce(new Response("ok"));const wait=vi.fn(async()=>{});
 expect((await fetchSermonProvider("https://provider.test",{},fetchMock,wait)).status).toBe(200);expect(wait).toHaveBeenCalledWith(2000);expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("does not loop or guess an unbounded delay",async()=>{
 for(const retryAfter of [null,"90","invalid","-1"]){const fetchMock=vi.fn(async()=>new Response(null,{status:429,headers:retryAfter===null?{}:{"retry-after":retryAfter}}));const wait=vi.fn(async()=>{});expect((await fetchSermonProvider("https://provider.test",{},fetchMock,wait)).status).toBe(429);expect(fetchMock).toHaveBeenCalledTimes(1);expect(wait).not.toHaveBeenCalled();}
 const fetchMock=vi.fn(async()=>new Response(null,{status:429,headers:{"retry-after":"0"}}));await fetchSermonProvider("https://provider.test",{},fetchMock,async()=>{});expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("honors cancellation before retrying",async()=>{
 const controller=new AbortController();const fetchMock=vi.fn(async()=>new Response(null,{status:429,headers:{"retry-after":"1"}}));await expect(fetchSermonProvider("https://provider.test",{signal:controller.signal},fetchMock,async()=>controller.abort())).rejects.toThrow();expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("honors a full-minute provider delay without repeated retries",async()=>{
 const fetchMock=vi.fn().mockResolvedValueOnce(new Response(null,{status:429,headers:{"retry-after":"60"}})).mockResolvedValueOnce(new Response("ok"));const wait=vi.fn(async()=>{});
 expect((await fetchSermonProvider("https://provider.test",{},fetchMock,wait)).status).toBe(200);expect(wait).toHaveBeenCalledWith(60000);expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("cancels a pending wait without leaving a retry request",async()=>{
 const controller=new AbortController();const fetchMock=vi.fn(async()=>new Response(null,{status:429,headers:{"retry-after":"60"}}));const pending=fetchSermonProvider("https://provider.test",{signal:controller.signal},fetchMock);await Promise.resolve();controller.abort();await expect(pending).rejects.toThrow();expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("rejects an expired composition deadline before any provider work",()=>{
 expect(()=>sermonProviderSignal(Date.now()-1)).toThrow("composition-timeout");expect(sermonProviderSignal(Date.now()+10000).aborted).toBe(false);
});
