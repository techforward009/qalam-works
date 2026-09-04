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
import {
  buildCalendarHtml,
  type EmbeddedNaskhFonts,
} from "../../tools/calendar-maker/utils/buildCalendarHtml";

interface CalendarPdfRequest {
  year: number;
  content: CalendarContentMode;
  language: CalendarLanguage;
  weekStart: WeekStart;
  page: CalendarPage;
  hijriOffset?: number;
  researchNote?: string;
}

function isCalendarPdfRequest(value: unknown): value is CalendarPdfRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    Number.isInteger(body.year) && Number(body.year) >= 1900 && Number(body.year) <= 2100 &&
    (body.content === "gregorian" || body.content === "gregorian-hijri") &&
    (body.language === "en" || body.language === "ur") &&
    (body.weekStart === "sunday" || body.weekStart === "monday") &&
    (body.page === "a4-portrait" || body.page === "a4-landscape") &&
    (body.hijriOffset === undefined ||
      (Number.isInteger(body.hijriOffset) && Number(body.hijriOffset) >= -2 && Number(body.hijriOffset) <= 2)) &&
    (body.researchNote === undefined ||
      (typeof body.researchNote === "string" && body.researchNote.length <= 240))
  );
}

function requireFontBase64(filename: string): string {
  const fontPath = path.join(process.cwd(), "public", "fonts", filename);
  if (!existsSync(fontPath)) {
    throw new Error(`Required bundled calendar PDF font is missing: ${filename}`);
  }
  return readFileSync(fontPath).toString("base64");
}

function requireLocalNaskhFontsBase64(): EmbeddedNaskhFonts {
  const regularBase64 = requireFontBase64("naskh-400.woff2");
  const boldPath = path.join(process.cwd(), "public", "fonts", "naskh-700.woff2");
  return {
    regularBase64,
    boldBase64: existsSync(boldPath) ? readFileSync(boldPath).toString("base64") : regularBase64,
  };
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
    const naskhFonts = body.language === "ur" ? requireLocalNaskhFontsBase64() : undefined;
    const html = buildCalendarHtml(model, {
      naskhFonts,
      researchNote: body.researchNote?.trim() || undefined,
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

    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load" });

    await page.evaluate(async (mustVerifyNaskh) => {
      await (document as any).fonts?.ready;
      if (mustVerifyNaskh && !(document as any).fonts?.check('16px "QalamNaskh"')) {
        throw new Error("Embedded QalamNaskh font did not load");
      }
    }, body.language === "ur");

    const pdfBytes = await page.pdf({
      format: "A4",
      landscape: body.page === "a4-landscape",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
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
      try {
        await browser.close();
      } catch {}
    }
  }
}
