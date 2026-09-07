/**
 * /api/export-invoice-pdf
 *
 * Accepts a POST with InvoiceExportPayload JSON.
 * Returns a PDF blob containing ONLY the customer invoice.
 * No browser headers/footers, no Qalam Works branding.
 *
 * Page size / orientation come from the payload so preview and PDF match.
 */
export const runtime     = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { buildInvoiceHtml, type InvoiceExportPayload } from "../../tools/invoice-generator/utils/buildInvoiceHtml";
import { resolveInvoicePageBox, resolveInvoicePrintSettings } from "../../tools/invoice-generator/utils/invoiceLayout";

export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const payload: InvoiceExportPayload = await req.json();
    const print = resolveInvoicePrintSettings({
      ...payload.print,
      template: payload.template,
    });
    const box = resolveInvoicePageBox(print);

    const html = buildInvoiceHtml(payload);

    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

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
      preferCSSPageSize:   true,
      width:               `${box.widthMm}mm`,
      height:              `${box.heightMm}mm`,
      printBackground:     true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
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
