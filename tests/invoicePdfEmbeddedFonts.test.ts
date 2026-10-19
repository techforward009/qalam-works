import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { buildInvoiceHtml } from "../app/tools/invoice-generator/utils/buildInvoiceHtml";

const invoicePayload = {
  invoice: {
    id: "font-proof",
    type: "invoice" as const,
    number: "آزمائشی-رسید",
    issueDate: "2026-10-19",
    dueDate: "2026-10-19",
    status: "draft" as const,
    seller: { name: "قلم ورکس", address: "کراچی" },
    client: { name: "اردو صارف" },
    items: [{ id: "line", description: "جملہ ٹیسٹ", quantity: 1, unit: "", unitPrice: 100, discountPercent: 0, taxes: [] }],
    currency: "PKR",
    notes: "اردو عبارت صاف نظر آنی چاہیے",
    terms: "",
  },
  logo: { src: null, align: "center" as const, size: "medium" as const },
  sig: { name: "قلم ورکس", designation: "Owner", image: null, stampImage: null, align: "right" as const, size: "medium" as const },
  print: { style: "pakistani" as const },
};

describe("Urdu invoice font", () => {
  it("embeds Mehr Nastaliq Web for an Urdu invoice and keeps Noto as the fallback", () => {
    const html = buildInvoiceHtml({ ...invoicePayload, invoiceLang: "ur" });
    expect(html).toContain('font-family:"Mehr Nastaliq Web"');
    expect(html).toContain("'Mehr Nastaliq Web', 'Noto Nastaliq Urdu', serif");
    expect(html).toContain('font-family:"Noto Nastaliq Urdu"');
    expect(html).toContain("font-family:'Mehr Nastaliq Web','Noto Nastaliq Urdu',serif;");
    expect(html).not.toContain("font-family:'Noto Nastaliq Urdu',serif;");
    expect(Buffer.from(html.split("data:font/woff2;base64,")[1]?.slice(0, 8) ?? "", "base64").length).toBeGreaterThan(0);
  });
});

describe.runIf(Boolean(process.env.QALAM_PDF_CHROMIUM))("real invoice Urdu font embedding", () => {
  it("paints an Urdu field in an English invoice using bundled Noto Nastaliq", async () => {
    const browser = await puppeteer.launch({
      executablePath: process.env.QALAM_PDF_CHROMIUM!,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    try {
      const html = buildInvoiceHtml({ ...invoicePayload, invoiceLang: "en" });
      expect(html).toContain("Noto Nastaliq Urdu");
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const ready = await page.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check('16px "Noto Nastaliq Urdu"', "قلم ورکس");
      });
      expect(ready).toBe(true);
      const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
      const dir = join(tmpdir(), "pdf-phase1e-evidence");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "invoice-urdu.pdf"), pdf);
      expect(pdf.length).toBeGreaterThan(1000);
    } finally {
      await browser.close();
    }
  }, 90_000);
});
