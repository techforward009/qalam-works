import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as ask } from "../../app/api/research/ask/route";
import { POST as upload } from "../../app/api/research/documents/route";
import { GET as page } from "../../app/api/research/documents/[id]/pages/[page]/route";
import { GET as libraryGET, POST as libraryPOST } from "../../app/api/research/book-library/route";
import { researchBlobClientFromEnv } from "../../app/api/research/memoryStore";
import { clearTestResearchAuth, testResearchSessionCookie, useTestResearchAuth } from "./researchAuthFixture";

const legacy=vi.hoisted(()=>({researchBlobClientFromEnv:vi.fn()}));
const delegates=vi.hoisted(()=>({GET:vi.fn(),POST:vi.fn()}));
vi.mock("../../app/api/research/vercelResearchBlob",()=>legacy);
vi.mock("../../app/api/khateeb/library/route",()=>delegates);
vi.mock("server-only",()=>({}));
afterEach(()=>{clearTestResearchAuth();vi.unstubAllEnvs();vi.restoreAllMocks();});

it("fails every authenticated data route closed with a clear 503 and logs once when the backend is unset",async()=>{
  useTestResearchAuth();
  delete process.env.QALAM_RESEARCH_STORAGE_BACKEND;
  const log=vi.spyOn(console,"error").mockImplementation(()=>{});
  await expect(researchBlobClientFromEnv()).rejects.toMatchObject({code:"research-storage-not-configured"});
  const headers={cookie:testResearchSessionCookie()};
  const responses=[
    await ask(new NextRequest("http://localhost/api/research/ask",{method:"POST",headers})),
    await upload(new NextRequest("http://localhost/api/research/documents",{method:"POST",headers})),
    await page(new NextRequest("http://localhost/api/research/documents/doc_1/pages/1",{headers}),{params:Promise.resolve({id:"doc_1",page:"1"})}),
    await libraryGET(new NextRequest("http://localhost/api/research/book-library",{headers})),
    await libraryPOST(new NextRequest("http://localhost/api/research/book-library",{method:"POST",headers})),
  ];
  for(const response of responses){
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({error:"Research storage is not configured.",code:"research-storage-not-configured"});
  }
  vi.stubEnv("QALAM_RESEARCH_STORAGE_BACKEND"," ");
  await expect(researchBlobClientFromEnv()).rejects.toMatchObject({code:"research-storage-not-configured"});
  expect(log).toHaveBeenCalledExactlyOnceWith("research-storage-not-configured");
  expect(legacy.researchBlobClientFromEnv).not.toHaveBeenCalled();
  expect(delegates.GET).not.toHaveBeenCalled();
  expect(delegates.POST).not.toHaveBeenCalled();
});

it("never calls a Blob fallback when explicitly selected R2 is unavailable",async()=>{
  vi.stubEnv("QALAM_RESEARCH_STORAGE_BACKEND","cloudflare-r2");
  vi.stubEnv("QALAM_RESEARCH_R2_WORKER_URL","");
  vi.stubEnv("QALAM_RESEARCH_R2_BEARER_TOKEN","");
  await expect(researchBlobClientFromEnv()).rejects.toMatchObject({code:"unavailable"});
  expect(legacy.researchBlobClientFromEnv).not.toHaveBeenCalled();
});
