import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";
import {
  isPrivateJameelBlobHost,
  jameelLoadToPdfFace,
  loadJameelFromBlob,
  type JameelFontLoadResult,
} from "../app/lib/privateJameelFont";
import { buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

const PRIVATE_URL = "https://store.private.blob.vercel-storage.com/jameel.woff2";
const PUBLIC_URL = "https://store.blob.vercel-storage.com/jameel.woff2";

const jameelDoc: DocNode = {
  type: "doc",
  content: [{
    type: "paragraph",
    attrs: { dir: "rtl" },
    content: [{ type: "text", text: "اردو", marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq" } }] }],
  }],
};

function response(status: number, body: Buffer = Buffer.from("font")) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  } as unknown as Response;
}

describe("Jameel blob auth", () => {
  it("private blob + OIDC succeeds (integrity still applied)", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("Authorization");
      expect(auth).toBe("Bearer oidc-token");
      return response(200);
    });
    const result = await loadJameelFromBlob({
      blobUrl: PRIVATE_URL,
      oidcToken: "oidc-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("integrity-failed");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("private blob + legacy token succeeds to integrity check", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer legacy-token");
      return response(200);
    });
    const result = await loadJameelFromBlob({
      blobUrl: PRIVATE_URL,
      blobToken: "legacy-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reason).toBe("integrity-failed");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("prefers OIDC over the legacy token", async () => {
    const auths: Array<string | null> = [];
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      auths.push(new Headers(init?.headers).get("Authorization"));
      return response(401);
    });
    await loadJameelFromBlob({
      blobUrl: PRIVATE_URL,
      oidcToken: "oidc-token",
      blobToken: "legacy-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(auths[0]).toBe("Bearer oidc-token");
    expect(auths[1]).toBe("Bearer legacy-token");
    expect(auths.some((value) => value === null)).toBe(false);
  });

  it("does not unsigned-retry a private blob", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBeTruthy();
      return response(403);
    });
    const result = await loadJameelFromBlob({
      blobUrl: PRIVATE_URL,
      oidcToken: "oidc-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reason).toBe("blob-403");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("public blob can fetch unsigned", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toBeUndefined();
      return response(200);
    });
    const result = await loadJameelFromBlob({
      blobUrl: PUBLIC_URL,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reason).toBe("integrity-failed");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports missing URL and missing auth distinctly", async () => {
    expect((await loadJameelFromBlob({})).reason).toBe("missing-url");
    expect((await loadJameelFromBlob({ blobUrl: PRIVATE_URL })).reason).toBe("missing-auth");
  });

  it("preserves 401, 403, and 404", async () => {
    for (const status of [401, 403, 404] as const) {
      const result = await loadJameelFromBlob({
        blobUrl: PRIVATE_URL,
        blobToken: "legacy-token",
        fetchImpl: (async () => response(status)) as unknown as typeof fetch,
      });
      expect(result.reason).toBe(`blob-${status}`);
    }
  });

  it("rejects integrity mismatch on HTTP 200", async () => {
    const body = Buffer.from("not-the-approved-woff2");
    expect(createHash("sha256").update(body).digest("hex")).not.toHaveLength(0);
    const result = await loadJameelFromBlob({
      blobUrl: PRIVATE_URL,
      oidcToken: "oidc-token",
      fetchImpl: (async () => response(200, body)) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("integrity-failed");
  });
});

describe("Jameel PDF face from loader", () => {
  it("successful load becomes a complete PDF face with no Noto fallback", () => {
    const loaded: JameelFontLoadResult = {
      ok: true,
      buffer: Buffer.from("woff2"),
      reason: "loaded-blob-oidc",
    };
    const pdfFace = jameelLoadToPdfFace(loaded);
    expect(pdfFace.complete).toBe(true);
    expect(pdfFace.regularSources).toHaveLength(1);
    const html = buildPdfHtml(jameelDoc, "rtl", {
      faces: [pdfFace as PdfFontFace, {
        familyName: "Noto Nastaliq Urdu",
        regularSources: ["noto"],
        complete: true,
        declaredRegular: 1,
        declaredBold: 0,
        loadedRegular: 1,
        loadedBold: 0,
      }],
    });
    expect(html.html).toContain("qf-jameel");
    expect(html.fontsUsed).toContain("Jameel Noori Nastaleeq");
    expect(html.fontFallbacks.some((item) => item.requested === "Jameel Noori Nastaleeq")).toBe(false);
  });

  it("failed load stays an incomplete face and falls back truthfully", () => {
    const pdfFace = jameelLoadToPdfFace({ ok: false, reason: "blob-404" });
    expect(pdfFace.complete).toBe(false);
    const html = buildPdfHtml(jameelDoc, "rtl", {
      faces: [pdfFace as PdfFontFace, {
        familyName: "Noto Nastaliq Urdu",
        regularSources: ["noto"],
        complete: true,
        declaredRegular: 1,
        declaredBold: 0,
        loadedRegular: 1,
        loadedBold: 0,
      }],
    });
    expect(html.fontFallbacks).toContainEqual({
      requested: "Jameel Noori Nastaleeq",
      used: "Noto Nastaliq Urdu",
    });
  });
});

describe("host classification", () => {
  it("distinguishes private and public blob hosts", () => {
    expect(isPrivateJameelBlobHost("abc.private.blob.vercel-storage.com")).toBe(true);
    expect(isPrivateJameelBlobHost("abc.blob.vercel-storage.com")).toBe(false);
  });
});
