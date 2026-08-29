/**
 * /api/export-invoice-pdf
 *
 * Accepts a POST with InvoiceExportPayload JSON.
 * Returns a PDF blob containing ONLY the customer invoice.
 * No browser headers/footers, no Qalam Works branding.
 *
 * Reuses the same Puppeteer/Chromium infrastructure as the Document Studio
 * export, with displayHeaderFooter: false to suppress browser-added metadata.
 */
export const runtime     = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { buildInvoiceHtml, type InvoiceExportPayload } from "../../tools/invoice-generator/utils/buildInvoiceHtml";

export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const payload: InvoiceExportPayload = await req.json();

    const html = buildInvoiceHtml(payload);

    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // Block all network requests — fonts are embedded as base64 data URIs
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (r.url().startsWith("data:")) r.continue();
      else r.abort();
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (document as any).fonts?.ready;
    });

    const pdfBytes = await page.pdf({
      format:              "A4",
      printBackground:     true,
      displayHeaderFooter: false,   // ← key: suppresses browser title/URL/date
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });

    await browser.close();
    browser = null;

    const invoiceNumber = (payload.invoice.number || "invoice").replace(/[^a-zA-Z0-9\-_]/g, "-");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    console.error("[export-invoice-pdf]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
