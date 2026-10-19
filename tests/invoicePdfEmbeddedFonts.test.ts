import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { buildInvoiceHtml } from "../app/tools/invoice-generator/utils/buildInvoiceHtml";

describe.runIf(Boolean(process.env.QALAM_PDF_CHROMIUM))("real invoice Urdu font embedding", () => {
  it("paints an Urdu field in an English invoice using bundled Noto Nastaliq", async () => {
    const browser = await puppeteer.launch({
      executablePath: process.env.QALAM_PDF_CHROMIUM!,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    try {
      const html = buildInvoiceHtml({
        invoice: {
          id: "font-proof",
          type: "invoice",
          number: "آزمائشی-رسید",
          issueDate: "2026-10-19",
          dueDate: "2026-10-19",
          status: "draft",
          seller: { name: "قلم ورکس", address: "کراچی" },
          client: { name: "اردو صارف" },
          items: [{ id: "line", description: "جملہ ٹیسٹ", quantity: 1, unit: "", unitPrice: 100, discountPercent: 0, taxes: [] }],
          currency: "PKR",
          notes: "اردو عبارت صاف نظر آنی چاہیے",
          terms: "",
        },
        invoiceLang: "en",
        logo: { src: null, align: "center", size: "medium" },
        sig: { name: "قلم ورکس", designation: "Owner", image: null, stampImage: null, align: "right", size: "medium" },
        print: { style: "pakistani" },
      });
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
