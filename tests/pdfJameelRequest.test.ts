import { describe, expect, it, vi } from "vitest";
import { requiredPdfEmbedFonts, buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import {
  applyJameelFace,
  isJameelPdfRequested,
  resolveRequestScopedJameelFace,
} from "../app/tools/document-studio/utils/pdfJameelRequest";
import { jameelLoadToPdfFace, type JameelFontLoadResult } from "../app/lib/privateJameelFont";

const jameelMarkDoc: DocNode = {
  type: "doc",
  content: [{
    type: "paragraph",
    attrs: { dir: "rtl" },
    content: [{
      type: "text",
      text: "اردو",
      marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq" } }],
    }],
  }],
};

const plainRtlDoc: DocNode = {
  type: "doc",
  content: [{
    type: "paragraph",
    attrs: { dir: "rtl" },
    content: [{ type: "text", text: "اردو" }],
  }],
};

const latinDoc: DocNode = {
  type: "doc",
  content: [{
    type: "paragraph",
    attrs: { dir: "ltr" },
    content: [{ type: "text", text: "Hello", marks: [{ type: "textStyle", attrs: { fontFamily: "Inter" } }] }],
  }],
};

function notoFace(): PdfFontFace {
  return {
    familyName: "Noto Nastaliq Urdu",
    regularSources: ["noto"],
    complete: true,
    declaredRegular: 1,
    declaredBold: 0,
    loadedRegular: 1,
    loadedBold: 0,
  };
}

describe("requiredPdfEmbedFonts Jameel request", () => {
  it("requests Jameel from an explicit fontFamily mark", () => {
    const names = requiredPdfEmbedFonts(jameelMarkDoc, "rtl").map((d) => d.pdf.familyName);
    expect(names).toContain("Jameel Noori Nastaleeq");
    expect(isJameelPdfRequested(requiredPdfEmbedFonts(jameelMarkDoc, "rtl"))).toBe(true);
  });

  it("requests Jameel from defaultRtlFontId", () => {
    const settings = defaultDocumentSettings();
    settings.typography.defaultRtlFontId = "jameel-noori-nastaleeq";
    const names = requiredPdfEmbedFonts(plainRtlDoc, "rtl", settings.typography).map((d) => d.pdf.familyName);
    expect(names).toContain("Jameel Noori Nastaleeq");
  });
});

describe("request-scoped Jameel load", () => {
  it("loads Jameel only once when requested", async () => {
    const load = vi.fn(async (): Promise<JameelFontLoadResult> => ({
      ok: true,
      buffer: Buffer.from("woff2"),
      reason: "loaded-blob-oidc",
    }));
    const needed = requiredPdfEmbedFonts(jameelMarkDoc, "rtl");
    const resolved = await resolveRequestScopedJameelFace(needed, load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(resolved.requested).toBe(true);
    expect(resolved.loadReason).toBe("loaded-blob-oidc");
    expect(resolved.face?.complete).toBe(true);
  });

  it("does not invoke the private loader when Jameel is not requested", async () => {
    const load = vi.fn(async (): Promise<JameelFontLoadResult> => ({
      ok: true,
      buffer: Buffer.from("woff2"),
      reason: "loaded-blob-oidc",
    }));
    const needed = requiredPdfEmbedFonts(latinDoc, "ltr");
    const resolved = await resolveRequestScopedJameelFace(needed, load);
    expect(load).not.toHaveBeenCalled();
    expect(resolved.loadReason).toBe("not-requested");
    expect(resolved.requested).toBe(false);
  });

  it("distinguishes blob-403 from a successful OIDC load", async () => {
    const failed = await resolveRequestScopedJameelFace(
      requiredPdfEmbedFonts(jameelMarkDoc, "rtl"),
      async () => ({ ok: false, reason: "blob-403" }),
    );
    expect(failed.loadReason).toBe("blob-403");
    expect(failed.face?.complete).toBe(false);
    const ok = await resolveRequestScopedJameelFace(
      requiredPdfEmbedFonts(jameelMarkDoc, "rtl"),
      async () => ({ ok: true, buffer: Buffer.from("woff2"), reason: "loaded-blob-oidc" }),
    );
    expect(ok.loadReason).toBe("loaded-blob-oidc");
  });

  it("complete face yields Jameel fontsUsed and no Noto fallback", () => {
    const loaded: JameelFontLoadResult = { ok: true, buffer: Buffer.from("woff2"), reason: "loaded-blob-oidc" };
    const faces = applyJameelFace([notoFace()], jameelLoadToPdfFace(loaded) as PdfFontFace);
    const html = buildPdfHtml(jameelMarkDoc, "rtl", { faces });
    expect(html.fontsUsed).toContain("Jameel Noori Nastaleeq");
    expect(html.fontFallbacks.some((item) => item.requested === "Jameel Noori Nastaleeq")).toBe(false);
    expect(html.html).toContain("qf-jameel");
  });

  it("failed loader keeps deterministic Noto fallback", () => {
    const faces = applyJameelFace(
      [notoFace()],
      jameelLoadToPdfFace({ ok: false, reason: "blob-403" }) as PdfFontFace,
    );
    const html = buildPdfHtml(jameelMarkDoc, "rtl", { faces });
    expect(html.fontFallbacks).toContainEqual({
      requested: "Jameel Noori Nastaleeq",
      used: "Noto Nastaliq Urdu",
    });
  });
});
