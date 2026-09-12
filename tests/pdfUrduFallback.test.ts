import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "puppeteer-core";
import { loadPdfUrduFace, guardPdfUrduFonts } from "../app/tools/document-studio/utils/pdfUrduFontGuard";
import { buildPdfHtml, requiredPdfEmbedFonts, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import { pdfFontUnicodeRange } from "../app/tools/document-studio/utils/pdfFontSubsets";
import { getFontById } from "../app/tools/document-studio/utils/fontRegistry";
import nextConfig from "../next.config";

afterEach(() => vi.unstubAllGlobals());

function bundledNoto(): PdfFontFace {
  const def = getFontById("noto-nastaliq-urdu").pdf;
  const read = (file: string) => readFileSync(path.join(process.cwd(), "node_modules", file)).toString("base64");
  return { familyName: def.familyName!, regularSources: def.regularFiles!.map(read), boldSources: def.boldFiles!.map(read), complete: true, declaredRegular: 2, declaredBold: 2, loadedRegular: 2, loadedBold: 2 };
}

describe("PDF Nastaliq fallback assets and HTML", () => {
  it("bundles both weights/subsets with matching unicode ranges and explicit route tracing", () => {
    const files = [...getFontById("noto-nastaliq-urdu").pdf.regularFiles!, ...getFontById("noto-nastaliq-urdu").pdf.boldFiles!];
    const includes = nextConfig.outputFileTracingIncludes!["/api/export-pdf"];
    for (const file of files) {
      expect(existsSync(path.join("node_modules", file))).toBe(true);
      expect(pdfFontUnicodeRange(file)).toMatch(/^U\+/);
      expect(includes).toContain(`./node_modules/${file}`);
    }
  });

  it("keeps Jameel primary with Noto fallback, even in an LTR document", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "کراچی", marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq" } }] }] }] };
    const noto = bundledNoto();
    expect(requiredPdfEmbedFonts(doc, "ltr").map(font => font.pdf.familyName)).toContain("Noto Nastaliq Urdu");
    const jameel: PdfFontFace = { ...noto, familyName: "Jameel Noori Nastaleeq", regularSources: ["primary"], boldSources: [], declaredRegular: 1, declaredBold: 0, loadedRegular: 1, loadedBold: 0 };
    const primary = buildPdfHtml(doc, "ltr", { faces: [jameel, noto] });
    expect(primary.html).toContain('font-family: "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif');
    expect(primary.html).toContain('class="qf-jameel"');
    expect(primary.html).toContain('data-pdf-urdu="true"');
    expect(primary.html).toContain('unicode-range:U+0600-06FF');
    expect(primary.html).toContain('unicode-range:U+0000-00FF');
    const fallback = buildPdfHtml(doc, "ltr", { faces: [noto] });
    expect(fallback.fontFallbacks).toContainEqual({ requested: "Jameel Noori Nastaleeq", used: "Noto Nastaliq Urdu" });
    expect(fallback.html).toContain('class="qf-noto-nastaliq"');
  });
});

describe("real face readiness contract", () => {
  it("rejects an absent family even when check claims success", async () => {
    vi.stubGlobal("document", { fonts: { ready: Promise.resolve(), load: vi.fn(async () => []), check: () => true } });
    expect(await loadPdfUrduFace("Noto Nastaliq Urdu")).toBe(false);
  });
  it("loads Urdu sample text at regular and bold weights before success", async () => {
    const load = vi.fn(async () => [{ status: "loaded" }]);
    vi.stubGlobal("document", { fonts: { ready: Promise.resolve(), load } });
    expect(await loadPdfUrduFace("Noto Nastaliq Urdu")).toBe(true);
    expect(load).toHaveBeenCalledWith('400 16px "Noto Nastaliq Urdu"', expect.stringContaining("کراچی"));
    expect(load).toHaveBeenCalledWith('700 16px "Noto Nastaliq Urdu"', expect.stringContaining("کراچی"));
  });
  it("rejects rejected/corrupt fonts", async () => {
    vi.stubGlobal("document", { fonts: { load: vi.fn(async () => { throw new Error("OTS decoding failed"); }) } });
    expect(await loadPdfUrduFace("Jameel Noori Nastaleeq")).toBe(false);
  });
});

function runtimePage(names: string[], fallbackLoaded = true) {
  let calls = 0;
  const detach = vi.fn();
  const send = vi.fn(async (method: string) => {
    if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
    if (method === "DOM.querySelectorAll") return { nodeIds: [2] };
    if (method === "DOM.describeNode") return { node: { nodeId: 2, nodeType: 1, nodeValue: "", children: [
      { nodeId: 3, nodeType: 1, nodeValue: "", children: [{ nodeId: 4, nodeType: 3, nodeValue: "کراچی" }] },
    ] } };
    if (method === "CSS.getPlatformFontsForNode") {
      const familyName = names[Math.min(calls++, names.length - 1)];
      return { fonts: [{ familyName, glyphCount: 7, isCustomFont: familyName !== "LastResort" }] };
    }
    return {};
  });
  const page = { $$eval: vi.fn(async () => 1), evaluate: vi.fn(async () => fallbackLoaded), createCDPSession: vi.fn(async () => ({ send, detach })) };
  return { page: page as unknown as Page, detach, send };
}

describe("Chromium actual-font guard", () => {
  it("preserves a successfully rendered Jameel run", async () => {
    const { page, detach, send } = runtimePage(["Jameel Noori Nastaleeq"]);
    expect(await guardPdfUrduFonts(page)).toEqual({ fallbackRuns: 0, actualFamilies: ["Jameel Noori Nastaleeq"] });
    expect(detach).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith("CSS.getPlatformFontsForNode", { nodeId: 2 });
  });
  it("replaces unusable Urdu with verified Noto and records the substitution", async () => {
    const { page } = runtimePage(["LastResort", "Noto Nastaliq Urdu"]);
    expect(await guardPdfUrduFonts(page)).toEqual({ fallbackRuns: 1, actualFamilies: ["Noto Nastaliq Urdu"] });
    expect(page.$$eval).toHaveBeenCalledTimes(2);
  });
  it("blocks printing if bundled fallback is absent", async () => {
    const { page } = runtimePage(["LastResort"], false);
    await expect(guardPdfUrduFonts(page)).rejects.toThrow("bundled Noto Nastaliq Urdu did not load");
  });
  it("blocks printing when fallback still resolves to missing-glyph/system font", async () => {
    const { page, detach } = runtimePage(["LastResort"]);
    await expect(guardPdfUrduFonts(page)).rejects.toThrow("printing blocked");
    expect(detach).toHaveBeenCalled();
  });
});
