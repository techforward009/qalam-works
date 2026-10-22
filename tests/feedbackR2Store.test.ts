import { describe, expect, it, vi } from "vitest";
import { allowedFeedbackObjectPath, createFeedbackR2Client, feedbackStoreFromEnv, FeedbackStoreUnavailable } from "../app/api/feedback/feedbackR2Store";

vi.mock("../app/api/research/vercelResearchBlob", () => ({
  researchBlobClientFromEnv: vi.fn(() => { throw Error("Blob fallback forbidden in R2 mode"); }),
}));

const secret = "private-preview-only-secret-for-tests-1234";
const config = { QALAM_FEEDBACK_R2_WORKER_URL: "https://qalam-feedback-private-mirror.example.workers.dev", QALAM_FEEDBACK_R2_BEARER_TOKEN: secret };
const contact = "contact-inquiries/v1/1792670000000-12345678-1234-1234-1234-123456789abc.json";
const feedback = "user-feedback/v1/khateeb-studio/1792670000000-12345678-1234-1234-1234-123456789abc.json";

describe("private feedback R2 client", () => {
  it("allows only the two private validated namespaces", () => {
    expect(allowedFeedbackObjectPath(contact)).toBe(true);
    expect(allowedFeedbackObjectPath(feedback)).toBe(true);
    for (const path of ["quran/v1/archive.json", "contact-inquiries/v1/../secrets.json", "user-feedback/v1/../../x.json", "user-feedback/v1/a/file.txt", "user-feedback/v1/a/%2e%2e.json"]) {
      expect(allowedFeedbackObjectPath(path)).toBe(false);
    }
  });
  it("writes and reads through the protected Worker, never a Blob URL", async () => {
    const fetchStub = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(config.QALAM_FEEDBACK_R2_WORKER_URL + "/v1/objects/" + contact);
      expect((init.headers as Record<string,string>).Authorization).toBe("Bearer " + secret);
      if (init.method === "PUT") return new Response(null, { status: 201 });
      return new Response('{"type":"contact"}', {status:200, headers:{"content-length":"18"}});
    });
    const client = createFeedbackR2Client(config, fetchStub as unknown as typeof fetch);
    await client.putObject(contact, '{"type":"contact"}');
    expect(await client.getObject(contact)).toBe('{"type":"contact"}');
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
  it("enumerates contact keys with pagination; no research corpus access", async () => {
    const calls: string[] = [];
    const fetchStub=vi.fn(async (url:string) => {
      calls.push(url);
      const params = new URL(url).searchParams;
      return Response.json(params.has("cursor")
        ? {paths:[],truncated:false}
        : {paths:[contact],cursor:"next",truncated:true});
    });
    const client=createFeedbackR2Client(config,fetchStub as unknown as typeof fetch);
    expect(await client.listObjects("contact-inquiries/v1/")).toEqual([contact]);
    expect(calls).toHaveLength(2);
    await expect(client.listObjects("research/v1/documents/")).rejects.toBeInstanceOf(FeedbackStoreUnavailable);
  });
  it("fails closed on unset or broken R2; never constructs Blob fallback", async () => {
    await expect(feedbackStoreFromEnv({...config,QALAM_FEEDBACK_STORAGE_BACKEND:"cloudflare-r2"})).resolves.toMatchObject({putObject:expect.any(Function)});
    await expect(feedbackStoreFromEnv({QALAM_FEEDBACK_STORAGE_BACKEND:"cloudflare-r2"})).rejects.toBeInstanceOf(FeedbackStoreUnavailable);
    await expect(feedbackStoreFromEnv({QALAM_FEEDBACK_STORAGE_BACKEND:"bogus"})).rejects.toBeInstanceOf(FeedbackStoreUnavailable);
    const stub=vi.fn(async()=>new Response(null,{status:503}));
    const client=createFeedbackR2Client(config,stub as unknown as typeof fetch);
    await expect(client.putObject(feedback,'{"rating":"partial"}')).rejects.toBeInstanceOf(FeedbackStoreUnavailable);
  });
});
