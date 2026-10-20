import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../../app/api/research/book-library/route";
import { TEST_RESEARCH_PASSWORD, TEST_RESEARCH_SECRET, testResearchSessionCookie } from "./researchAuthFixture";

const delegates = vi.hoisted(() => ({ GET: vi.fn(async () => new Response("{}")), POST: vi.fn(async () => new Response("{}")) }));
vi.mock("../../app/api/khateeb/library/route", () => delegates);
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it.each(["both", "password", "secret"])("refuses library reads and writes with missing %s configuration before reading sources", async missing => {
  vi.stubEnv("QALAM_RESEARCH_ACCESS_PASSWORD", missing === "secret" ? TEST_RESEARCH_PASSWORD : "");
  vi.stubEnv("QALAM_RESEARCH_SESSION_SECRET", missing === "password" ? TEST_RESEARCH_SECRET : "");
  for (const [method, handler] of [["GET", GET], ["POST", POST]] as const) {
    const response = await handler(new NextRequest("http://localhost/api/research/book-library", { method, headers: { cookie: testResearchSessionCookie() } }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Research access is not configured.", code: "auth_not_configured" });
  }
  expect(delegates.GET).not.toHaveBeenCalled();
  expect(delegates.POST).not.toHaveBeenCalled();
});

it("refuses anonymous requests but allows the signed owner session", async () => {
  vi.stubEnv("QALAM_RESEARCH_ACCESS_PASSWORD", TEST_RESEARCH_PASSWORD);
  vi.stubEnv("QALAM_RESEARCH_SESSION_SECRET", TEST_RESEARCH_SECRET);
  for (const [method, handler] of [["GET", GET], ["POST", POST]] as const) {
    expect((await handler(new NextRequest("http://localhost/api/research/book-library", { method }))).status).toBe(401);
    expect((await handler(new NextRequest("http://localhost/api/research/book-library", { method, headers: { cookie: testResearchSessionCookie() } }))).status).toBe(200);
  }
  expect(delegates.GET).toHaveBeenCalledTimes(1);
  expect(delegates.POST).toHaveBeenCalledTimes(1);
});
