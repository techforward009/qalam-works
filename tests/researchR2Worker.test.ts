import { expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/research-mirror/src/index";

it("serves private object bytes without intermediary transformation", async () => {
  const body=new TextEncoder().encode("{}");
  const env={AUTH_TOKEN:"t".repeat(40),RESEARCH_BUCKET:{
    get:vi.fn(async()=>({body:new ReadableStream<Uint8Array>({start(c){c.enqueue(body);c.close();}}),size:body.byteLength})),
    put:vi.fn(async()=>undefined),list:vi.fn(async()=>({objects:[],truncated:false})),
  }};
  const response=await worker.fetch(new Request("https://worker.example/v1/objects/research/v1/documents/doc_1.json",{
    headers:{authorization:`Bearer ${env.AUTH_TOKEN}`},
  }),env);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store, no-transform");
  expect(await response.text()).toBe("{}");
});
