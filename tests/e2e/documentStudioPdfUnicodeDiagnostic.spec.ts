import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/** Diagnostic only: save real exported PDFs before attempting any stream rewrite. */
const folder = path.resolve("test-results/font-export-audit");
mkdirSync(folder, { recursive: true });

const paragraphs = [
  "یہ قلم ورکس میں اردو کتابت کی پہلی سطر ہے۔",
  "دوسرے پیراگراف میں نستعلیق خط اور الفاظ کی ترتیب دیکھیں۔",
  "تیسری سطر میں یہ سوال ہے: کیا متن درست نقل ہوگا؟",
];
const repeatedUrduLine = "یہ اردو متن ہے۔";
const multiplePages = Array.from({ length: 48 }, () => repeatedUrduLine);

const scenarios = [
  { name: "three-urdu-paragraphs", font: "Jameel Noori Nastaleeq", texts: paragraphs },
  { name: "three-noto-paragraphs", font: "Noto Nastaliq Urdu", texts: paragraphs },
  { name: "three-plain-urdu-paragraphs", font: "Jameel Noori Nastaleeq", texts: [
    paragraphs[0], paragraphs[1], "یہ تیسرا پیراگراف بھی اردو میں درست محفوظ ہوگا۔",
  ]},
  { name: "multipage-plain-urdu-paragraphs", font: "Noto Nastaliq Urdu", texts: multiplePages },
  { name: "urdu-english-mixed", font: "Gulzar", texts: [
    "پہلا عنوان — Qalam Works 2026 — اردو اور English ایک ساتھ۔",
    "دوسرا پیراگراف: 123 (Pakistan) اور مزید اردو عبارت۔",
  ]},
];

for (const scenario of scenarios) {
  test(`Capture PDF Unicode baseline: ${scenario.name}`, async ({ request }) => {
    test.setTimeout(175_000);
    const doc = {type: "doc", content: scenario.texts.map(text => ({
      type: "paragraph", attrs: { dir: "rtl" },
      content: [{type: "text", text, marks: [{type: "textStyle", attrs: {fontFamily:scenario.font}}]}],
    }))};
    const response = await request.post("/api/export-pdf", {data:{doc,dir:"rtl"}, timeout:120_000});
    const headers=response.headers();
    const bytes=await response.body();
    console.log("[unicode-pdf-baseline]", scenario.name, JSON.stringify({
      status:response.status(),bytes:bytes.length,
      actualFonts:headers["x-pdf-urdu-actual-fonts"],
      fallbacks:headers["x-pdf-font-fallbacks"],
    }));
    if (response.status() !== 200) {
      writeFileSync(path.join(folder,scenario.name+"-error.txt"),bytes);
    } else {
      writeFileSync(path.join(folder,scenario.name+".pdf"),bytes);
      writeFileSync(path.join(folder,scenario.name+"-source.json"),JSON.stringify(scenario,null,2));
    }
    expect(response.status()).toBe(200);
    expect(bytes.byteLength).toBeGreaterThan(2000);
    if (scenario.name === "multipage-plain-urdu-paragraphs") {
      expect(Number(headers["x-pdf-page-count"])).toBeGreaterThan(1);
      expect(headers["x-pdf-logical-text-lines"]).toBe(String(scenario.texts.length));
      const output = execFileSync("pdftotext", ["-raw", path.join(folder, scenario.name+".pdf"), "-"], {encoding:"utf8"});
      const normalized = output.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
      expect(normalized.split(repeatedUrduLine).length - 1).toBe(scenario.texts.length);
    }
    if (scenario.name === "three-plain-urdu-paragraphs") {
      expect(headers["x-pdf-logical-text-lines"]).toBe("3");
      const output = execFileSync("pdftotext", ["-raw", path.join(folder, scenario.name+".pdf"), "-"], {encoding:"utf8"});
      const normalized = output.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
      for (const text of scenario.texts) expect(normalized).toContain(text);
    }
    if (scenario.name === "urdu-english-mixed") {
      expect(headers["x-pdf-logical-text-lines"]).toBe("0");
    }
  });
}
