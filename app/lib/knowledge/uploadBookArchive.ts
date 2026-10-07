import type { BookManifest } from "./bookCorpus";

const MAX_ARCHIVE = 8 * 1024 * 1024;
const MAX_PART = 3 * 1024 * 1024;
type EntryStream = {
  on(event: "data", callback: (bytes: Uint8Array) => void): void;
  on(event: "error", callback: (error: Error) => void): void;
  on(event: "end", callback: () => void): void;
  pause(): void;
  resume(): void;
};

/** Upload source members separately so the complete ZIP never crosses the function body limit. */
export async function uploadBookArchive(file: File, signal: AbortSignal, progress: (done: number, total: number) => void, send: typeof fetch = fetch) {
  if (!file.size || file.size > MAX_ARCHIVE) throw new Error("invalid");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  async function read(name: string, limit: number) {
    const entry = zip.file(name);
    if (!entry) throw new Error("invalid");
    return new Promise<Uint8Array>((resolve, reject) => {
      const parts: Uint8Array[] = [];
      let length = 0;
      const stream = (entry as unknown as { internalStream(type: "uint8array"): EntryStream }).internalStream("uint8array");
      stream.on("data", bytes => {
        length += bytes.length;
        if (length > limit) { stream.pause(); reject(new Error("invalid")); return; }
        parts.push(bytes);
      });
      stream.on("error", reject);
      stream.on("end", () => {
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const part of parts) { bytes.set(part, offset); offset += part.length; }
        resolve(bytes);
      });
      stream.resume();
    });
  }
  const manifest = JSON.parse(new TextDecoder().decode(await read("manifest.json", 256_000))) as BookManifest;
  if (!Array.isArray(manifest.sources) || ![7, 15].includes(manifest.sources.length)) throw new Error("invalid");
  const parts = new Map<string, Uint8Array>();
  const digests: Record<string, string> = {};
  let total = 0;
  for (const source of manifest.sources) {
    signal.throwIfAborted();
    if (typeof source.id !== "string" || !/^[a-z0-9-]+$/.test(source.id) || parts.has(source.id)) throw new Error("invalid");
    const bytes = await read(`${source.id}.json.gz`, MAX_PART);
    total += bytes.length;
    if (total > MAX_ARCHIVE) throw new Error("invalid");
    parts.set(source.id, bytes);
    digests[source.id] = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource)), b => b.toString(16).padStart(2, "0")).join("");
  }
  const plan = JSON.stringify({ manifest, digests });
  async function request(op: string, body: BodyInit, headers?: HeadersInit) {
    const response = await send(`/api/research/book-library?op=${op}`, { method: "POST", body, headers, signal, cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 400 ? "invalid" : "unavailable");
    return response.json();
  }
  let done = 0;
  progress(done, parts.size);
  for (const [id, bytes] of parts) {
    signal.throwIfAborted();
    const body = new FormData();
    body.set("source", new Blob([bytes as BlobPart], { type: "application/gzip" }), `${id}.json.gz`);
    body.set("sourceId", id); body.set("plan", plan);
    const response = await request("source", body);
    if (response.stored !== true) throw new Error("unavailable");
    progress(++done, parts.size);
  }
  return request("activate", plan, { "Content-Type": "application/json" });
}
