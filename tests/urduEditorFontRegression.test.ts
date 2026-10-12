import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import puppeteer from "puppeteer-core";

const CHROME = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1234/chrome-linux64/chrome"].find(
  (path): path is string => typeof path === "string" && existsSync(path),
);

function latinFace(): string {
  const regular = readFileSync("public/fonts/inter-latin-400.woff2").toString("base64");
  return `@font-face{font-family:"Qalam Studio Latin";src:url(data:font/woff2;base64,${regular}) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}`;
}

async function paintedFamilies(css: string): Promise<string[][]> {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body class="qalam-editor-content">
      <p dir="rtl"><span style="font-family: Jameel Noori Nastaleeq">تحقیق قلم</span></p>
      <p dir="rtl"><span style="font-family: Gulzar">تحقیق قلم</span></p>
      <p dir="rtl"><span style="font-family: Noto Nastaliq Urdu">تحقیق قلم</span></p>
    </body></html>`, { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.ready; });
    const session = await page.createCDPSession();
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const root = await session.send("DOM.getDocument");
    const nodes = await session.send("DOM.querySelectorAll", { nodeId: root.root.nodeId, selector: "span" });
    const rows = [];
    for (const nodeId of nodes.nodeIds) {
      const fonts = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      rows.push(fonts.fonts.filter(font => font.glyphCount > 0).map(font => font.familyName));
    }
    return rows;
  } finally {
    await browser.close();
  }
}

describe("Document Studio Urdu editor fonts", () => {
  it("no longer puts the Latin system stack ahead of the selected Nastaliq face", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const canvas = readFileSync("app/tools/document-studio/components/DocumentCanvas.tsx", "utf8");
    expect(css).toContain('"Qalam Studio Latin", "Jameel Noori Nastaleeq"');
    expect(css).toContain('"Qalam Studio Latin", "Gulzar"');
    expect(css).not.toContain('var(--qalam-ltr-font, var(--font-inter), Inter), "Jameel Noori Nastaleeq"');
    expect(canvas).not.toContain("var(--qalam-ltr-font, var(--font-inter), Inter), var(--qalam-rtl-font");
    expect(canvas).toContain('"Qalam Studio Latin", var(--qalam-rtl-font, var(--font-nastaliq), "Noto Nastaliq Urdu")');
  });

  it("paints Urdu with the selected face when an Arabic-capable sans is installed", async () => {
    if (!CHROME) return;
    const faces = `
      @font-face{font-family:Inter;src:url(data:font/woff2;base64,${readFileSync("public/fonts/inter-latin-400.woff2").toString("base64")}) format("woff2");}
      @font-face{font-family:"Jameel Noori Nastaleeq";src:url("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/jameel-noori-nastaleeq-400.woff2") format("woff2");}
      @font-face{font-family:Gulzar;src:url("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/Gulzar-Regular.woff2") format("woff2");}
      @font-face{font-family:"Noto Nastaliq Urdu";src:url(data:font/woff2;base64,${readFileSync("public/fonts/nastaliq-400.woff2").toString("base64")}) format("woff2");}
      :root{--font-inter:Inter;--font-nastaliq:"Noto Nastaliq Urdu";--qalam-ltr-font:var(--font-inter), Inter, system-ui, sans-serif;}
    `;
    const broken = `${faces}
      .qalam-editor-content [style*="Jameel Noori Nastaleeq"],
      .qalam-editor-content [style*="Gulzar"],
      .qalam-editor-content [style*="Noto Nastaliq Urdu"]{font-family:var(--qalam-ltr-font, var(--font-inter), Inter), var(--font-nastaliq), "Noto Nastaliq Urdu", serif !important;}
      p{font-size:42px}`;
    const before = await paintedFamilies(broken);
    expect(before.every(row => row.includes("DejaVu Sans"))).toBe(true);
    expect(before.every(row => !row.includes("Jameel Noori Nastaleeq") && !row.includes("Gulzar"))).toBe(true);

    const fixed = `${faces}${latinFace()}
      .qalam-editor-content [style*="Jameel Noori Nastaleeq"]{font-family:"Qalam Studio Latin","Jameel Noori Nastaleeq",var(--font-nastaliq),"Noto Nastaliq Urdu" !important;}
      .qalam-editor-content [style*="Gulzar"]{font-family:"Qalam Studio Latin",Gulzar,var(--font-nastaliq),"Noto Nastaliq Urdu" !important;}
      .qalam-editor-content [style*="Noto Nastaliq Urdu"]{font-family:"Qalam Studio Latin",var(--font-nastaliq),"Noto Nastaliq Urdu" !important;}
      p{font-size:42px}`;
    const after = await paintedFamilies(fixed);
    expect(after[0]).toContain("Jameel Noori Nastaleeq");
    expect(after[0]).not.toContain("DejaVu Sans");
    expect(after[1]).toContain("Gulzar");
    expect(after[1]).not.toContain("DejaVu Sans");
    expect(after[2]).toContain("Noto Nastaliq Urdu");
    expect(after[2]).not.toContain("DejaVu Sans");
  }, 30000);
});
