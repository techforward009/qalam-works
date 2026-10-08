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
it("returns a clear client error when the selected duration lacks enough sources",async()=>{
 vi.stubEnv("CLOUDFLARE_ACCOUNT_ID","test");vi.stubEnv("CLOUDFLARE_AUTH_TOKEN","test");mocks.collect.mockResolvedValue({status:"evidence"});mocks.compose.mockRejectedValue(new Error("insufficient-evidence"));const response=await POST(request(valid,"https://qalam.test","compose-insufficient-evidence"));expect(response.status).toBe(422);expect(await response.json()).toEqual({code:"insufficient-evidence"});
});

it("reports provider throttling as temporary busy without discarding an old draft",async()=>{
 vi.stubEnv("CLOUDFLARE_ACCOUNT_ID","test");vi.stubEnv("CLOUDFLARE_AUTH_TOKEN","test");mocks.collect.mockResolvedValue({status:"evidence"});mocks.compose.mockRejectedValue(new Error("provider-rate-limited"));const response=await POST(request(valid,"https://qalam.test","compose-provider-busy"));expect(response.status).toBe(429);expect(await response.json()).toEqual({code:"busy"});
});

it("identifies the failing stage without logging private provider errors",async()=>{
 vi.stubEnv("CLOUDFLARE_ACCOUNT_ID","test");vi.stubEnv("CLOUDFLARE_AUTH_TOKEN","test");const warning=vi.spyOn(console,"warn").mockImplementation(()=>{});
 try{mocks.collect.mockRejectedValueOnce(new Error("private source and secret token"));const response=await POST(request(valid,"https://qalam.test","source-failure"));expect(response.status).toBe(503);expect(warning).toHaveBeenCalledWith("Sermon request failed",{stage:"sources",code:"unknown",elapsedMs:expect.any(Number)});expect(JSON.stringify(warning.mock.calls)).not.toContain("secret token");
 mocks.collect.mockResolvedValueOnce({status:"evidence"});mocks.compose.mockRejectedValueOnce(new Error("provider-format"));await POST(request(valid,"https://qalam.test","audit-failure"));expect(warning).toHaveBeenLastCalledWith("Sermon request failed",{stage:"composition",code:"provider-format",elapsedMs:expect.any(Number)});
 }finally{warning.mockRestore();}
});
