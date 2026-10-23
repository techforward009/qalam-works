/**
 * Optional verified HTTPS mirror for immutable Tafsir Namoona v10 archives.
 * Mirror locations and bearer tokens are server-side environment variables only.
 * Never trust URL parameters, never follow redirects, and never expose the archive.
 * The calling release loader MUST validate SHA-256 before parsing its result.
 */
const MAX_TAFSIR_ARCHIVE_BYTES = 16 * 1024 * 1024;

export type TafsirMirrorLanguage = "ur" | "en";
export type TafsirMirrorConfig = {
  urUrl?: string;
  enUrl?: string;
  bearerToken?: string;
};

export function tafsirMirrorConfig(env: Record<string, string | undefined> = process.env): TafsirMirrorConfig {
  return {
    urUrl: env.QALAM_TAFSIR_V10_MIRROR_UR_URL?.trim(),
    enUrl: env.QALAM_TAFSIR_V10_MIRROR_EN_URL?.trim(),
    bearerToken: env.QALAM_TAFSIR_V10_MIRROR_BEARER_TOKEN?.trim(),
  };
}

function mirrorUrl(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Invalid Tafsir mirror URL"); }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
      url.hash || url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
      url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) {
    throw new Error("Invalid Tafsir mirror URL");
  }
  return url.href;
}

/**
 * Return null only if the language has no mirror configured.
 * If a configured mirror is unreachable, raise an error: silently serving a
 * wrong/partial corpus or falling back to a suspended Blob store is unsafe.
 */
export async function readTafsirMirror(
  language: TafsirMirrorLanguage,
  config: TafsirMirrorConfig = tafsirMirrorConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<Buffer | null> {
  const target = language === "ur" ? config.urUrl : config.enUrl;
  if (!target) return null;
  const url = mirrorUrl(target);
  const headers: Record<string, string> = {};
  if (config.bearerToken) headers.Authorization = `Bearer ${config.bearerToken}`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok || !response.body) throw new Error("Tafsir mirror unavailable");
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && (!Number.isSafeInteger(Number(declaredLength)) || Number(declaredLength) < 1 || Number(declaredLength) > MAX_TAFSIR_ARCHIVE_BYTES)) {
    await response.body.cancel();
    throw new Error("Tafsir mirror archive too large");
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_TAFSIR_ARCHIVE_BYTES) {
        await reader.cancel();
        throw new Error("Tafsir mirror archive too large");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  // Fetch decodes Content-Encoding; Content-Length then describes the wire bytes,
  // not the decoded stream. The independent decoded-size limit above still applies.
  if (!response.headers.has("content-encoding") && declaredLength !== null && total !== Number(declaredLength)) throw new Error("Tafsir mirror length mismatch");
  return Buffer.concat(chunks, total);
}
