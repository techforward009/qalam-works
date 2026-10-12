import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import puppeteer from "puppeteer-core";
import { buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";

const CHROME = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1234/chrome-linux64/chrome"].find(
  (path): path is string => typeof path === "string" && existsSync(path),
);

function face(familyName: string): PdfFontFace {
  return {
    familyName,
    regularSources: ["src"],
    complete: true,
    declaredRegular: 1,
    declaredBold: 0,
    loadedRegular: 1,
    loadedBold: 0,
  };
}

describe("original qalam document PDF sizes", () => {
  const file = JSON.parse(readFileSync("tests/fixtures/untitled-document-3.qalam", "utf8"));

  it("keeps every selected size in a style attribute the browser can parse", () => {
    const { html } = buildPdfHtml(file.content, "rtl", {
      faces: ["Gulzar", "Jameel Noori Nastaleeq", "Alvi Nastaleeq", "Noto Nastaliq Urdu", "Amiri", "Inter"].map(face),
    }, file.documentSettings.typography);
    expect(html).not.toMatch(/style="[^"]*font-family:"/);
    expect(html).toContain("font-family:'Gulzar';font-size:24pt;");
    expect(html).toContain("font-family:'Jameel Noori Nastaleeq';font-size:16pt;");
    expect(html).toContain("font-family:'Alvi Nastaleeq';font-size:16pt;");
    expect(html).toContain("font-family:'Alvi Nastaleeq';font-size:15pt;");
    expect(html).toContain("font-size:13pt;");
    expect(html).toContain("font-family:'Amiri';font-size:24pt;");
    expect(html).toContain("font-family:'Digital Khatt Indo-Pak';font-size:16pt;");
    const text = html.replace(/<[^>]+>/g, "");
    const idha = text.indexOf("إِذَا");
    const aqrab = text.indexOf("أَقْرُبْ");
    expect(idha).toBeGreaterThan(0);
    expect(aqrab).toBeGreaterThan(idha);
  });

  it("computes the editor point sizes instead of the 12pt body", async () => {
    if (!CHROME) return;
    const { html } = buildPdfHtml(file.content, "rtl", {
      faces: ["Gulzar", "Jameel Noori Nastaleeq", "Alvi Nastaleeq", "Noto Nastaliq Urdu", "Amiri", "Inter"].map(face),
    }, file.documentSettings.typography);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const sizes = await page.evaluate(() => {
        const read = (needle: string) => {
          const span = Array.from(document.querySelectorAll("span")).find(node => node.textContent?.includes(needle));
          return span ? getComputedStyle(span).fontSize : "";
        };
        return {
          gulzar: read("مستفاد"),
          jameel: read("ضلالت"),
          alvi16: read("فریقوں"),
          noto: read("مقتضی"),
          alvi15: read("احتمالات"),
          amiri: read("المہدی"),
          khatt: read("حَدَّثَنَا"),
        };
      });
      expect(sizes).toEqual({
        gulzar: "32px",
        jameel: "21.3333px",
        alvi16: "21.3333px",
        noto: "17.3333px",
        alvi15: "20px",
        amiri: "32px",
        khatt: "21.3333px",
      });
    } finally {
      await browser.close();
    }
  });
});
