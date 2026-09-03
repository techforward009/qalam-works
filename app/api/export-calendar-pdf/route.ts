export const runtime = "nodejs";
export const maxDuration = 60;

import { existsSync, readFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {
  buildCalendarYearModel,
  type BuildCalendarYearOptions,
  type CalendarContentMode,
  type CalendarLanguage,
  type CalendarPage,
  type WeekStart,
} from "../../tools/calendar-maker/utils/calendarModel";
import { buildCalendarHtml } from "../../tools/calendar-maker/utils/buildCalendarHtml";

interface CalendarPdfRequest {
  year: number;
  content: CalendarContentMode;
  language: CalendarLanguage;
  weekStart: WeekStart;
  page: CalendarPage;
}

function isCalendarPdfRequest(value: unknown): value is CalendarPdfRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    Number.isInteger(body.year) && Number(body.year) >= 1900 && Number(body.year) <= 2100 &&
    (body.content === "gregorian" || body.content === "gregorian-hijri") &&
    (body.language === "en" || body.language === "ur") &&
    (body.weekStart === "sunday" || body.weekStart === "monday") &&
    (body.page === "a4-portrait" || body.page === "a4-landscape")
  );
}

function localNaskhFontBase64(): string | undefined {
  const fontPath = path.join(process.cwd(), "public", "fonts", "naskh-400.woff2");
  if (!existsSync(fontPath)) return undefined;
  return readFileSync(fontPath).toString("base64");
}

export async function POST(request: NextRequest) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!isCalendarPdfRequest(body)) {
      return NextResponse.json({ error: "Invalid calendar options" }, { status: 400 });
    }

    const model = buildCalendarYearModel(body as BuildCalendarYearOptions);
    const html = buildCalendarHtml(model, {
      naskhFontBase64: body.language === "ur" ? localNaskhFontBase64() : undefined,
    });

    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().startsWith("data:")) req.continue();
      else req.abort();
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (document as any).fonts?.ready;
    });

    const pdfBytes = await page.pdf({
      format: "A4",
      landscape: body.page === "a4-landscape",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    });

    await browser.close();
    browser = null;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="qalam-works-calendar-${body.year}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[export-calendar-pdf]", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
