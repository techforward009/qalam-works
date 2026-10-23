import { describe, expect, it, vi } from "vitest";
import { createResearchR2Client } from "../app/api/research/researchR2Store";

const env = {
  QALAM_RESEARCH_R2_WORKER_URL: "https://example.workers.dev",
  QALAM_RESEARCH_R2_BEARER_TOKEN: "a".repeat(40),
};
const key = "research/v1/documents/doc_1.json";

describe("research private R2 client", () => {
  it("fails closed without credentials", () => {
    expect(() => createResearchR2Client({})).toThrow();
  });
  it("sends authorized write and reads exact JSON", async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "PUT"
        ? new Response(null, { status: 201 })
        : new Response('{"id":1}', { status: 200, headers: { "content-length": "8" } }),
    );
    const client = createResearchR2Client(env, fetcher as unknown as typeof fetch);
    await client.putObject(key, '{"id":1}');
    expect(await client.getObject(key)).toBe('{"id":1}');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: `Bearer ${env.QALAM_RESEARCH_R2_BEARER_TOKEN}` });
  });
  it("rejects unexpected keys and oversized payloads", async () => {
    const client = createResearchR2Client(env, vi.fn() as unknown as typeof fetch);
    await expect(client.putObject("user-feedback/v1/x.json", "{}")).rejects.toThrow();
    await expect(client.putObject("research/v1/documents/_bad.json", "{}")).rejects.toThrow();
    await expect(client.putObject(key, "x".repeat(25 * 1024 * 1024 + 1))).rejects.toThrow();
  });
  it("reads paginated document lists without touching other prefixes", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      calls.push(url);
      const next = url.includes("cursor=next");
      return Response.json(next
        ? { paths: ["research/v1/documents/doc_2.json"], truncated: false }
        : { paths: [key], cursor: "next", truncated: true });
    });
    const client = createResearchR2Client(env, fetcher as unknown as typeof fetch);
    expect(await client.listObjects("research/v1/documents/")).toEqual([key, "research/v1/documents/doc_2.json"]);
    expect(calls).toHaveLength(2);
    await expect(client.listObjects("khateeb-foundational/v1/")).rejects.toThrow();
  });
  it("rejects missing or mismatched response lengths", async () => {
    const missing = createResearchR2Client(env, vi.fn(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch);
    await expect(missing.getObject(key)).rejects.toThrow();
    const truncated = createResearchR2Client(env, vi.fn(async () => new Response("{}", { status: 200, headers: { "content-length": "20" } })) as unknown as typeof fetch);
    await expect(truncated.getObject(key)).rejects.toThrow();
  });
  it("never falls back when R2 fails", async () => {
    const client = createResearchR2Client(env, vi.fn(async () => new Response(null, { status: 503 })) as unknown as typeof fetch);
    await expect(client.getObject(key)).rejects.toThrow();
  });
});
