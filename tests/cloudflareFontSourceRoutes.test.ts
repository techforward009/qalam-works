import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIRROR = "https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/";
const OLD = "https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/";
const sources = {
  "app/globals.css": [
    "muhammadi-quranic-400.woff2",
    "NafeesNastaleeq-v1.02.woff2",
    "Alvi_Nastaleeq.woff2",
    "Gulzar-Regular.woff2",
    "MehrNastaliqWeb.woff2",
    "Sahel.woff2",
    "ScheherazadeNew-Medium.woff2",
  ],
  "app/quran/QuranTranslationPage.tsx": ["MehrNastaliqWeb.woff2"],
  "app/quran/editions.ts": ["muhammadi-quranic-400.woff2"],
  "app/tools/khateeb-studio/KhateebStudioContent.tsx": ["NafeesNastaleeq-v1.02.woff2"],
  "app/components/knowledge/KnowledgeAssistant.tsx": ["NafeesNastaleeq-v1.02.woff2"],
};
describe("owner-authorized originals use new independent font gateway",()=>{
  for (const [source,fonts] of Object.entries(sources)) {
    it(source+" references only Cloudflare for recovered files",()=>{
      const text=readFileSync(source,"utf8");
      for(const font of fonts) {
        expect(text,source+" "+font).toContain(MIRROR+font);
        expect(text,source+" "+font).not.toContain(OLD+font);
      }
    });
  }
  it("serves the owner-provided original DigitalKhatt locally, not from Blob",()=>{
    const css=readFileSync("app/globals.css","utf8");
    expect(css).toContain("/fonts/DigitalKhattIndoPakRegular.woff2");
    expect(css).not.toContain(OLD+"DigitalKhattIndoPakRegular.woff2");
    const font=readFileSync("public/fonts/DigitalKhattIndoPakRegular.woff2");
    expect(font.subarray(0,4).toString("ascii")).toBe("wOF2");
  });
  it("does not request Jameel or Nafees v1.00 from the site stylesheet",()=>{
    const css=readFileSync("app/globals.css","utf8");
    const tailwind=readFileSync("tailwind.config.js","utf8");
    expect(css).not.toContain("jameel-noori-nastaleeq-400.woff2");
    expect(css).not.toContain(MIRROR+"NafeesNastaleeq.woff2");
    expect(tailwind).not.toContain("Jameel");
  });
});
