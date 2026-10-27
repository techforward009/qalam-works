import { isIP } from "node:net";

export const PDF_EXPORT_LIMITS = {
  requestsPerMinute: 5, windowMs: 60_000, concurrent: 2,
  maxQueued: 4, queueTimeoutMs: 10_000, maxClients: 10_000,
};
export type PdfExportDenied = { status: 429 | 503; retryAfter: number; code: string };
export type PdfExportSlot = { release: () => void } | PdfExportDenied;
const busy = (): PdfExportDenied => ({ status: 503, retryAfter: 10, code: "pdf-export-busy" });

/** Hosting proxy headers identify the client; never manufacture a new key when absent. */
export function clientIp(headers: Headers): string {
  for (const candidate of [headers.get("x-forwarded-for")?.split(",")[0], headers.get("x-real-ip")]) {
    const ip = candidate?.trim();
    if (!ip || !isIP(ip)) continue;
    try { return isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname.slice(1, -1) : ip; }
    catch { /* IPv6 zone identifiers are not public proxy client addresses. */ }
  }
  return "unknown";
}

/** Deliberately local to this warm server instance: no remote store or services. */
export function createPdfExportLimiter(options: Partial<typeof PDF_EXPORT_LIMITS> = {}) {
  const limits = { ...PDF_EXPORT_LIMITS, ...options };
  const clients = new Map<string, number[]>();
  let lastSweep = -Infinity, active = 0;
  const queue: Array<{ deadline: number; finish: (result: PdfExportSlot) => void }> = [];

  function checkRate(ip: string): PdfExportDenied | null {
    const now = Date.now(), cutoff = now - limits.windowMs;
    if (now - lastSweep >= limits.windowMs || clients.size >= limits.maxClients) {
      for (const [key, times] of clients) if (times[times.length - 1] <= cutoff) clients.delete(key);
      lastSweep = now;
    }
    const times = (clients.get(ip) ?? []).filter(time => time > cutoff);
    if (times.length >= limits.requestsPerMinute) return {
      status: 429, retryAfter: Math.max(1, Math.ceil((times[0] + limits.windowMs - now) / 1000)),
      code: "pdf-export-rate-limited",
    };
    // Do not evict live clients and accidentally reset their rate limits.
    if (!clients.has(ip) && clients.size >= limits.maxClients) return busy();
    times.push(now);
    clients.set(ip, times);
    return null;
  }

  function slot(): { release: () => void } {
    let released = false;
    return { release() {
      if (released) return;
      released = true;
      while (queue.length) {
        const next = queue[0];
        if (next.deadline <= Date.now()) { next.finish(busy()); continue; }
        // Hand over the occupied slot synchronously, preserving FIFO and the cap.
        next.finish(slot());
        return;
      }
      active--;
    } };
  }

  async function acquireSlot(signal?: AbortSignal): Promise<PdfExportSlot> {
    if (signal?.aborted) return busy();
    if (active < limits.concurrent) { active++; return slot(); }
    if (queue.length >= limits.maxQueued) return busy();
    return new Promise(resolve => {
      let settled = false;
      const onAbort = () => entry.finish(busy());
      const entry = {
        deadline: Date.now() + limits.queueTimeoutMs,
        finish(result: PdfExportSlot) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          resolve(result);
        },
      };
      const timer = setTimeout(() => entry.finish(busy()), limits.queueTimeoutMs);
      queue.push(entry);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
    });
  }
  return { checkRate, acquireSlot };
}

export const pdfExportLimiter = createPdfExportLimiter();

/** A failed/hung graceful shutdown must not leak Chromium or hold the slot forever. */
export async function closePdfBrowser(browser: {
  close: () => Promise<void>;
  process: () => { kill: (signal: NodeJS.Signals) => unknown } | null;
}): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      browser.close(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("PDF browser close timed out")), 5000); }),
    ]);
  } catch (error) {
    console.error("PDF browser cleanup failed:", error);
    try { browser.process()?.kill("SIGKILL"); } catch { /* process may already have exited */ }
  } finally {
    clearTimeout(timer);
  }
}
