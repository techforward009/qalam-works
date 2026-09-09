import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

/** Integrity fingerprint of the approved Jameel WOFF2. Not a secret. */
const JAMEEL_APPROVED_SHA256 =
  "d12978f4398f1f788d65fa7ccb872cf0e1c43aef89166816243e94487d9cee27";

const PRIVATE_BLOB_MAX_BYTES = 8 * 1024 * 1024;
const JAMEEL_FILENAME = "jameel-noori-nastaleeq-400.woff2";

export function isAllowedJameelBlobHost(hostname: string): boolean {
  return (
    hostname.endsWith(".private.blob.vercel-storage.com") ||
    hostname.endsWith(".blob.vercel-storage.com")
  );
}

export type JameelFontLoadReason =
  | "loaded-local"
  | "loaded-blob"
  | "missing-config"
  | "fetch-failed"
  | "integrity-failed"
  | "unavailable";

export type JameelFontLoadResult =
  | { ok: true; buffer: Buffer; reason: "loaded-local" | "loaded-blob" }
  | { ok: false; reason: Exclude<JameelFontLoadReason, "loaded-local" | "loaded-blob"> };

function sha256hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Load approved Jameel bytes. Never returns URLs, tokens, or font diagnostics beyond a reason code. */
export async function loadPrivateJameelWoff2(): Promise<JameelFontLoadResult> {
  const localPath = path.join(process.cwd(), "assets", "fonts", JAMEEL_FILENAME);
  if (existsSync(localPath)) {
    const buf = readFileSync(localPath);
    if (sha256hex(buf) !== JAMEEL_APPROVED_SHA256) {
      return { ok: false, reason: "integrity-failed" };
    }
    return { ok: true, buffer: buf, reason: "loaded-local" };
  }

  const blobUrl = process.env.JAMEEL_FONT_BLOB_URL;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobUrl || !token) {
    return { ok: false, reason: "missing-config" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(blobUrl);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (parsedUrl.protocol !== "https:" || !isAllowedJameelBlobHost(parsedUrl.hostname)) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    const attempts: Array<HeadersInit | undefined> = [
      { Authorization: `Bearer ${token}` },
      undefined,
    ];
    for (const headers of attempts) {
      const res = await fetch(blobUrl, { headers, cache: "no-store" });
      if (!res.ok) continue;
      const contentLen = res.headers.get("content-length");
      if (contentLen && parseInt(contentLen, 10) > PRIVATE_BLOB_MAX_BYTES) {
        return { ok: false, reason: "unavailable" };
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > PRIVATE_BLOB_MAX_BYTES) return { ok: false, reason: "unavailable" };
      if (sha256hex(buf) !== JAMEEL_APPROVED_SHA256) return { ok: false, reason: "integrity-failed" };
      return { ok: true, buffer: buf, reason: "loaded-blob" };
    }
    return { ok: false, reason: "fetch-failed" };
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}

export async function loadPrivateJameelWoff2Base64(): Promise<string | null> {
  const result = await loadPrivateJameelWoff2();
  return result.ok ? result.buffer.toString("base64") : null;
}
