import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks=vi.hoisted(()=>({collect:vi.fn(),compose:vi.fn()}));
vi.mock("../app/lib/knowledge/sermonEvidence",()=>({collectSermonEvidence:mocks.collect}));
vi.mock("../app/lib/knowledge/sermonComposer",()=>({composeSermon:mocks.compose}));
import { POST } from "../app/api/khateeb/compose/route";
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
const request=(body:unknown,origin="https://qalam.test",caller="route-test")=>new NextRequest("https://qalam.test/api/khateeb/compose",{method:"POST",headers:{"Content-Type":"application/json",origin,"x-forwarded-for":caller},body:JSON.stringify(body)});
const valid={title:"صبر",duration:30,locale:"ur"};
it("rejects cross-origin generation and malformed duration before provider work",async()=>{
 expect((await POST(request(valid,"https://other.test"))).status).toBe(400);
 for(const body of [{...valid,duration:25},{...valid,title:"ا"},{...valid,previous:"x".repeat(24001)},{...valid,instruction:"x".repeat(601)},{...valid,unknown:1}])expect((await POST(request(body))).status).toBe(400);
 expect(mocks.collect).not.toHaveBeenCalled();
});
it("reports missing configuration without starting retrieval",async()=>{
 vi.stubEnv("CLOUDFLARE_ACCOUNT_ID","");vi.stubEnv("CLOUDFLARE_AUTH_TOKEN","");expect((await POST(request(valid))).status).toBe(503);expect(mocks.collect).not.toHaveBeenCalled();
});
it("collects sources automatically from the topic and preserves revision context for composition",async()=>{
 vi.stubEnv("CLOUDFLARE_ACCOUNT_ID","test");vi.stubEnv("CLOUDFLARE_AUTH_TOKEN","test");vi.stubEnv("GROQ_API_KEY","test-key");mocks.collect.mockResolvedValue({status:"evidence"});mocks.compose.mockResolvedValue({id:"new-version"});
 const response=await POST(request({...valid,instruction:"زبان آسان کریں",previous:"پچھلا مسودہ"},"https://qalam.test","compose-success"));expect(response.status).toBe(200);expect(await response.json()).toEqual({project:{id:"new-version"}});
 expect(mocks.collect).toHaveBeenCalledWith("صبر","ur","compose-success");expect(mocks.compose.mock.calls[0][0].previous).toBe("پچھلا مسودہ");expect(mocks.compose.mock.calls[0][2].env.GROQ_API_KEY).toBe("test-key");
});
it("never returns a rejected sermon as a completed project",async()=>{
 vi.stubEnv("CLOUDFLARE_ACCOUNT_ID","test");vi.stubEnv("CLOUDFLARE_AUTH_TOKEN","test");mocks.collect.mockResolvedValue({status:"evidence"});mocks.compose.mockRejectedValue(new Error("unverified"));const response=await POST(request(valid,"https://qalam.test","compose-rejected"));expect(response.status).toBe(503);expect(await response.json()).toEqual({code:"unverified"});
});

it("reports provider throttling as temporary busy without discarding an old draft",async()=>{
 vi.stubEnv("CLOUDFLARE_ACCOUNT_ID","test");vi.stubEnv("CLOUDFLARE_AUTH_TOKEN","test");mocks.collect.mockResolvedValue({status:"evidence"});mocks.compose.mockRejectedValue(new Error("provider-rate-limited"));const response=await POST(request(valid,"https://qalam.test","compose-provider-busy"));expect(response.status).toBe(429);expect(await response.json()).toEqual({code:"busy"});
});
