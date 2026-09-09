import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

/** Integrity fingerprint of the approved Jameel WOFF2. Not a secret. */
export const JAMEEL_APPROVED_SHA256 =
  "d12978f4398f1f788d65fa7ccb872cf0e1c43aef89166816243e94487d9cee27";

const PRIVATE_BLOB_MAX_BYTES = 8 * 1024 * 1024;
const JAMEEL_FILENAME = "jameel-noori-nastaleeq-400.woff2";

export function isPrivateJameelBlobHost(hostname: string): boolean {
  return hostname.endsWith(".private.blob.vercel-storage.com");
}

export function isPublicJameelBlobHost(hostname: string): boolean {
  return hostname.endsWith(".blob.vercel-storage.com") && !isPrivateJameelBlobHost(hostname);
}

export function isAllowedJameelBlobHost(hostname: string): boolean {
  return isPrivateJameelBlobHost(hostname) || isPublicJameelBlobHost(hostname);
}

export type JameelFontLoadReason =
  | "loaded-local"
  | "loaded-blob-oidc"
  | "loaded-blob-token"
  | "loaded-public"
  | "missing-url"
  | "missing-auth"
  | "blob-401"
  | "blob-403"
  | "blob-404"
  | "blob-5xx"
  | "integrity-failed"
  | "network-failed"
  | "unavailable";

export type JameelFontLoadResult =
  | { ok: true; buffer: Buffer; reason: "loaded-local" | "loaded-blob-oidc" | "loaded-blob-token" | "loaded-public" }
  | { ok: false; reason: Exclude<JameelFontLoadReason, "loaded-local" | "loaded-blob-oidc" | "loaded-blob-token" | "loaded-public"> };

export interface JameelBlobFetchConfig {
  blobUrl?: string;
  oidcToken?: string;
  blobToken?: string;
  fetchImpl?: typeof fetch;
}

function sha256hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function reasonFromHttpStatus(status: number): Extract<JameelFontLoadReason, "blob-401" | "blob-403" | "blob-404" | "blob-5xx"> {
  if (status === 401) return "blob-401";
  if (status === 403) return "blob-403";
  if (status === 404) return "blob-404";
  return "blob-5xx";
}

type AuthAttempt =
  | { kind: "oidc"; token: string }
  | { kind: "token"; token: string }
  | { kind: "public" };

function bufferFromDownload(
  buf: Buffer,
  successReason: "loaded-blob-oidc" | "loaded-blob-token" | "loaded-public",
): JameelFontLoadResult {
  if (buf.byteLength > PRIVATE_BLOB_MAX_BYTES) return { ok: false, reason: "unavailable" };
  if (sha256hex(buf) !== JAMEEL_APPROVED_SHA256) return { ok: false, reason: "integrity-failed" };
  return { ok: true, buffer: buf, reason: successReason };
}

/** Fetch the configured blob using OIDC, then legacy token, then unsigned public-only. */
export async function loadJameelFromBlob(config: JameelBlobFetchConfig): Promise<JameelFontLoadResult> {
  const blobUrl = config.blobUrl?.trim();
  if (!blobUrl) return { ok: false, reason: "missing-url" };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(blobUrl);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (parsedUrl.protocol !== "https:" || !isAllowedJameelBlobHost(parsedUrl.hostname)) {
    return { ok: false, reason: "unavailable" };
  }

  const privateHost = isPrivateJameelBlobHost(parsedUrl.hostname);
  const attempts: AuthAttempt[] = [];
  if (config.oidcToken) attempts.push({ kind: "oidc", token: config.oidcToken });
  if (config.blobToken) attempts.push({ kind: "token", token: config.blobToken });
  if (!privateHost) attempts.push({ kind: "public" });

  if (attempts.length === 0) return { ok: false, reason: "missing-auth" };

  const fetchImpl = config.fetchImpl ?? fetch;
  let lastHttpReason: "blob-401" | "blob-403" | "blob-404" | "blob-5xx" | "network-failed" = "network-failed";

  try {
    for (const attempt of attempts) {
      const headers: HeadersInit | undefined =
        attempt.kind === "public" ? undefined : { Authorization: `Bearer ${attempt.token}` };
      const res = await fetchImpl(blobUrl, { headers, cache: "no-store" });
      if (res.ok) {
        const contentLen = res.headers.get("content-length");
        if (contentLen && parseInt(contentLen, 10) > PRIVATE_BLOB_MAX_BYTES) {
          return { ok: false, reason: "unavailable" };
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const successReason =
          attempt.kind === "oidc" ? "loaded-blob-oidc" : attempt.kind === "token" ? "loaded-blob-token" : "loaded-public";
        return bufferFromDownload(buf, successReason);
      }
      lastHttpReason = reasonFromHttpStatus(res.status);
    }
    return { ok: false, reason: lastHttpReason };
  } catch {
    return { ok: false, reason: "network-failed" };
  }
}

/** Load approved Jameel bytes. Never returns URLs, tokens, or font diagnostics beyond a reason code. */
export async function loadPrivateJameelWoff2(
  config?: JameelBlobFetchConfig,
): Promise<JameelFontLoadResult> {
  const localPath = path.join(process.cwd(), "assets", "fonts", JAMEEL_FILENAME);
  if (existsSync(localPath)) {
    const buf = readFileSync(localPath);
    if (sha256hex(buf) !== JAMEEL_APPROVED_SHA256) {
      return { ok: false, reason: "integrity-failed" };
    }
    return { ok: true, buffer: buf, reason: "loaded-local" };
  }

  return loadJameelFromBlob({
    blobUrl: config?.blobUrl ?? process.env.JAMEEL_FONT_BLOB_URL,
    oidcToken: config?.oidcToken ?? process.env.VERCEL_OIDC_TOKEN,
    blobToken: config?.blobToken ?? process.env.BLOB_READ_WRITE_TOKEN,
    fetchImpl: config?.fetchImpl,
  });
}

export async function loadPrivateJameelWoff2Base64(): Promise<string | null> {
  const result = await loadPrivateJameelWoff2();
  return result.ok ? result.buffer.toString("base64") : null;
}

export function jameelLoadToPdfFace(result: JameelFontLoadResult): {
  familyName: string;
  regularSources: string[];
  complete: boolean;
  declaredRegular: number;
  declaredBold: number;
  loadedRegular: number;
  loadedBold: number;
} {
  if (!result.ok) {
    return {
      familyName: "Jameel Noori Nastaleeq",
      regularSources: [],
      complete: false,
      declaredRegular: 1,
      declaredBold: 0,
      loadedRegular: 0,
      loadedBold: 0,
    };
  }
  return {
    familyName: "Jameel Noori Nastaleeq",
    regularSources: [result.buffer.toString("base64")],
    complete: true,
    declaredRegular: 1,
    declaredBold: 0,
    loadedRegular: 1,
    loadedBold: 0,
  };
}
