import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, closePdfBrowser, createPdfExportLimiter } from "../app/api/export-pdf/pdfExportLimiter";

describe("PDF export admission limits", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1000); });
  afterEach(() => vi.useRealTimers());

  it("rejects the sixth request in a rolling minute with 429 and Retry-After", () => {
    const guard = createPdfExportLimiter();
    for (let i = 0; i < 5; i++) expect(guard.checkRate("192.0.2.1")).toBeNull();
    expect(guard.checkRate("192.0.2.1")).toMatchObject({ status: 429, retryAfter: 60 });
    vi.advanceTimersByTime(59000);
    expect(guard.checkRate("192.0.2.1")).toMatchObject({ status: 429, retryAfter: 1 });
    vi.advanceTimersByTime(1000);
    expect(guard.checkRate("192.0.2.1")).toBeNull();
  });

  it("keeps IPs independent and expires entries before admitting new clients", () => {
    const guard = createPdfExportLimiter({ maxClients: 2 });
    for (let i = 0; i < 5; i++) guard.checkRate("a");
    expect(guard.checkRate("b")).toBeNull();
    expect(guard.checkRate("c")).toMatchObject({ status: 503 });
    vi.advanceTimersByTime(60000);
    expect(guard.checkRate("c")).toBeNull();
  });

  it("uses the forwarded client, falls back to real IP, and shares the missing-IP bucket", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "192.0.2.7, 198.51.100.1", "x-real-ip": "192.0.2.8" }))).toBe("192.0.2.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "invalid", "x-real-ip": "192.0.2.8" }))).toBe("192.0.2.8");
    expect(clientIp(new Headers())).toBe("unknown");
    expect(clientIp(new Headers({ "x-real-ip": "2001:0DB8:0000::1" }))).toBe(clientIp(new Headers({ "x-real-ip": "2001:db8::1" })));
  });

  it("makes the third concurrent request wait, then returns 503 at 10 seconds", async () => {
    const guard = createPdfExportLimiter();
    const a = await guard.acquireSlot(), b = await guard.acquireSlot();
    expect("release" in a && "release" in b).toBe(true);
    let settled = false;
    const third = guard.acquireSlot().then(result => { settled = true; return result; });
    await vi.advanceTimersByTimeAsync(9999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await third).toMatchObject({ status: 503, retryAfter: 10 });
    if ("release" in a) a.release();
    if ("release" in b) b.release();
  });

  it.each(["success", "failure"])("hands the slot to the queued render after %s", async outcome => {
    const guard = createPdfExportLimiter();
    const a = await guard.acquireSlot(), b = await guard.acquireSlot();
    const third = guard.acquireSlot();
    try { if (outcome === "failure") throw new Error("render failed"); }
    catch { /* expected render failure */ }
    finally { if ("release" in a) a.release(); }
    const c = await third;
    expect("release" in c).toBe(true);
    if ("release" in b) b.release();
    if ("release" in c) c.release();
  });

  it("bounds the waiting queue and does not leak capacity on double release", async () => {
    const guard = createPdfExportLimiter({ maxQueued: 1 });
    const a = await guard.acquireSlot(), b = await guard.acquireSlot();
    const waiting = guard.acquireSlot();
    expect(await guard.acquireSlot()).toMatchObject({ status: 503 });
    if ("release" in a) { a.release(); a.release(); }
    const c = await waiting;
    let settled = false;
    const fourth = guard.acquireSlot().then(value => { settled = true; return value; });
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(false);
    if ("release" in b) b.release();
    const d = await fourth;
    if ("release" in c) c.release();
    if ("release" in d) d.release();
  });

  it("removes cancelled waiters so they cannot occupy a slot", async () => {
    const guard = createPdfExportLimiter({ maxQueued: 1 });
    const a = await guard.acquireSlot(), b = await guard.acquireSlot();
    const controller = new AbortController();
    const cancelled = guard.acquireSlot(controller.signal);
    controller.abort();
    expect(await cancelled).toMatchObject({ status: 503 });
    const waiting = guard.acquireSlot();
    if ("release" in a) a.release();
    const c = await waiting;
    expect("release" in c).toBe(true);
    if ("release" in b) b.release();
    if ("release" in c) c.release();
  });

  it("closes browsers and force-kills when graceful close fails or times out", async () => {
    const kill = vi.fn();
    const success = { close: vi.fn().mockResolvedValue(undefined), process: () => ({ kill }) };
    await closePdfBrowser(success);
    expect(success.close).toHaveBeenCalledOnce();
    expect(kill).not.toHaveBeenCalled();
    await closePdfBrowser({ close: vi.fn().mockRejectedValue(new Error("closed")), process: () => ({ kill }) });
    expect(kill).toHaveBeenCalledWith("SIGKILL");
    const closing = closePdfBrowser({ close: () => new Promise<void>(() => {}), process: () => ({ kill }) });
    await vi.advanceTimersByTimeAsync(5000);
    await closing;
    expect(kill).toHaveBeenCalledTimes(2);
  });
});
