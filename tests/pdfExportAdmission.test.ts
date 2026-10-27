import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ launch: vi.fn(), fonts: vi.fn() }));
vi.mock("puppeteer-core", () => ({ default: { launch: mocks.launch } }));
vi.mock("@sparticuz/chromium", () => ({ default: { args: [], executablePath: async () => "/test/chromium" } }));
vi.mock("../app/tools/document-studio/utils/pdfDocumentFonts", () => ({ fontsForDocument: mocks.fonts }));

const doc = { type: "doc", content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Hello" }] }] };
const request = (ip: number, body: unknown = { doc, dir: "ltr" }) => new NextRequest("http://local/api/export-pdf", {
  method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": `192.0.2.${ip}` }, body: JSON.stringify(body),
});

describe("PDF route admission and cleanup", () => {
  beforeEach(() => {
    vi.resetModules(); vi.useFakeTimers();
    mocks.launch.mockReset(); mocks.fonts.mockReset();
    mocks.fonts.mockResolvedValue({ fonts: { faces: [] }, jameelRequested: false, jameelLoad: "not-requested" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("returns JSON 429 and Retry-After before parsing the sixth request", async () => {
    const { POST } = await import("../app/api/export-pdf/route");
    for (let i = 0; i < 5; i++) expect((await POST(request(1, {}))).status).toBe(400);
    const sixth = await POST(request(1));
    expect(sixth.status).toBe(429);
    expect(Number(sixth.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await sixth.json()).toMatchObject({ code: "pdf-export-rate-limited", error: expect.any(String) });
    expect(mocks.launch).not.toHaveBeenCalled();
  });

  it("waits ten seconds for a third render, returns JSON 503, then frees failed slots", async () => {
    const { POST } = await import("../app/api/export-pdf/route");
    let failFirst!: (error: Error) => void, failSecond!: (error: Error) => void;
    mocks.fonts.mockImplementationOnce(() => new Promise((_, reject) => { failFirst = reject; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { failSecond = reject; }));
    const first = POST(request(1)), second = POST(request(2));
    await vi.waitFor(() => expect(mocks.fonts).toHaveBeenCalledTimes(2));
    let settled = false;
    const third = POST(request(3)).then(response => { settled = true; return response; });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(9999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const denied = await third;
    expect(denied.status).toBe(503);
    expect(denied.headers.get("Retry-After")).toBe("10");
    expect(await denied.json()).toMatchObject({ code: "pdf-export-busy" });
    failFirst(new Error("failed fonts")); failSecond(new Error("failed fonts"));
    expect((await first).status).toBe(500); expect((await second).status).toBe(500);
    mocks.fonts.mockRejectedValue(new Error("failure after admission"));
    expect((await POST(request(4))).status).toBe(500);
  });

  it.each([false, true])("closes on Puppeteer timeout; a close failure=%s cannot leak slots", async closeFails => {
    const { POST } = await import("../app/api/export-pdf/route");
    const close = closeFails ? vi.fn().mockRejectedValue(new Error("close failed")) : vi.fn().mockResolvedValue(undefined);
    const kill = vi.fn();
    mocks.launch.mockImplementation(async () => ({ close, process: () => ({ kill }), newPage: async () => { throw new Error("TimeoutError: page operation timed out"); } }));
    for (const ip of [1, 2, 3, 4]) expect((await POST(request(ip))).status).toBe(500);
    expect(close).toHaveBeenCalledTimes(4);
    expect(kill).toHaveBeenCalledTimes(closeFails ? 4 : 0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts a stalled browser at the render deadline and closes it in finally", async () => {
    const { POST } = await import("../app/api/export-pdf/route");
    const close = vi.fn().mockResolvedValue(undefined);
    mocks.launch.mockImplementation(async ({ signal }: { signal: AbortSignal }) => ({
      close, process: () => null,
      newPage: () => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("browser aborted")), { once: true })),
    }));
    const rendering = POST(request(1));
    await vi.waitFor(() => expect(mocks.launch).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(40000);
    const response = await rendering;
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("10");
    expect(await response.json()).toMatchObject({ code: "pdf-export-timeout" });
    expect(close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
