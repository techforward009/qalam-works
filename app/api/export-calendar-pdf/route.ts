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

    await page.emulateMediaType("screen");
    await page.setContent(html, { waitUntil: "load" });

    await page.evaluate(async (mustVerifyNaskh) => {
      await (document as any).fonts?.ready;
      if (mustVerifyNaskh && !(document as any).fonts?.check('16px "QalamNaskh"')) {
        throw new Error("Embedded QalamNaskh font did not load");
      }

      const monthTitle = document.querySelector<HTMLElement>('[data-pdf-month-title="true"]');
      const monthHeader = monthTitle?.closest<HTMLElement>(".month-head") ?? null;
      const weekdayRow = document.querySelector<HTMLElement>('[data-pdf-weekday-row="true"]');
      const weekday = document.querySelector<HTMLElement>('[data-pdf-weekday="true"]');
      const hijriContextYear = document.querySelector<HTMLElement>(".ctx-year");
      const leftHijriContext = document.querySelector<HTMLElement>('[data-hijri-side="left"]');
      const rightHijriContext = document.querySelector<HTMLElement>('[data-hijri-side="right"]');
      const hijriDay = document.querySelector<HTMLElement>('[data-pdf-hijri-day="true"]');
      const gregorianDay = document.querySelector<HTMLElement>('[data-pdf-gregorian-day="true"]');

      if (!monthTitle || !monthHeader || !weekdayRow || !weekday || !leftHijriContext || !rightHijriContext) {
        throw new Error("Calendar PDF typography/context verification nodes are missing");
      }

      const monthTitleStyle = getComputedStyle(monthTitle);
      const monthHeaderStyle = getComputedStyle(monthHeader);
      const weekdayRowStyle = getComputedStyle(weekdayRow);
      const weekdayStyle = getComputedStyle(weekday);

      if (parseFloat(monthTitleStyle.fontSize) < 12.5) {
        throw new Error(`Calendar PDF month title is not readable: size=${monthTitleStyle.fontSize}, lineHeight=${monthTitleStyle.lineHeight}`);
      }
      const titleDisplay = monthTitleStyle.display;
      if (
        (titleDisplay !== "inline-flex" && titleDisplay !== "flex") ||
        monthTitleStyle.alignItems !== "center" ||
        monthTitleStyle.justifyContent !== "center"
      ) {
        throw new Error(`Calendar PDF month title alignment invalid: display=${monthTitleStyle.display}, alignItems=${monthTitleStyle.alignItems}, justifyContent=${monthTitleStyle.justifyContent}`);
      }
      if (mustVerifyNaskh && monthTitleStyle.flexDirection !== "row-reverse") {
        throw new Error(`Calendar PDF Urdu month title order invalid: ${monthTitleStyle.flexDirection}`);
      }
      const monthTitleName = monthTitle.querySelector<HTMLElement>(".month-title-name");
      const monthTitleYear = monthTitle.querySelector<HTMLElement>(".month-title-year");
      if (!monthTitleName || !monthTitleYear) {
        throw new Error("Calendar PDF month title/year split alignment nodes are missing");
      }
      const nameRect = monthTitleName.getBoundingClientRect();
      const yearRect = monthTitleYear.getBoundingClientRect();
      const nameCenterY = nameRect.top + nameRect.height / 2;
      const yearCenterY = yearRect.top + yearRect.height / 2;
      if (Math.abs(nameCenterY - yearCenterY) > 1.5) {
        throw new Error(`Calendar PDF month title vertical centers diverged: month=${nameCenterY}, year=${yearCenterY}`);
      }
      const monthCard = monthTitle.closest<HTMLElement>(".month");
      if (monthCard) {
        const monthRect = monthCard.getBoundingClientRect();
        const titleRect = monthTitle.getBoundingClientRect();
        if (titleRect.right > monthRect.right + 1) {
          throw new Error(`Calendar PDF month title overflows card: titleRight=${titleRect.right}, cardRight=${monthRect.right}`);
        }
      }
      if (mustVerifyNaskh) {
        const leftRect = leftHijriContext.getBoundingClientRect();
        const rightRect = rightHijriContext.getBoundingClientRect();
        if (rightRect.left <= leftRect.left) {
          throw new Error(`Calendar PDF Hijri physical side order invalid: left=${leftRect.left}, right=${rightRect.left}`);
        }
        if (rightHijriContext.dataset.hijriRole !== "start" || leftHijriContext.dataset.hijriRole !== "end") {
          throw new Error(`Calendar PDF Hijri chronological role mapping invalid: right=${rightHijriContext.dataset.hijriRole}, left=${leftHijriContext.dataset.hijriRole}`);
        }
      }
      if (leftHijriContext.getBoundingClientRect().width < 36 || rightHijriContext.getBoundingClientRect().width < 36) {
        throw new Error("Calendar PDF Hijri context columns were squeezed out of the header");
      }
      if (parseFloat(monthHeaderStyle.height) < 29) {
        throw new Error(`Calendar PDF month header is too short: ${monthHeaderStyle.height}`);
      }
      if (parseFloat(weekdayRowStyle.height) < 14.5 || parseFloat(weekdayStyle.height) < 14.5) {
        throw new Error(`Calendar PDF weekday strip is too short: row=${weekdayRowStyle.height}, cell=${weekdayStyle.height}`);
      }
      if (mustVerifyNaskh && parseFloat(weekdayStyle.fontSize) < 7.5) {
        throw new Error(`Calendar PDF Urdu weekday font is too small: ${weekdayStyle.fontSize}`);
      }
      if (mustVerifyNaskh && hijriContextYear) {
        const hijriContextYearStyle = getComputedStyle(hijriContextYear);
        if (parseFloat(hijriContextYearStyle.fontSize) < 6) {
          throw new Error(`Calendar PDF Hijri context year font is too small: ${hijriContextYearStyle.fontSize}`);
        }
      }

      if (gregorianDay) {
        const gregorianStyle = getComputedStyle(gregorianDay);
        if (parseFloat(gregorianStyle.fontSize) < 11) {
          throw new Error(`Calendar PDF Gregorian font is too small: ${gregorianStyle.fontSize}`);
        }
      }

      if (hijriDay) {
        const hijriStyle = getComputedStyle(hijriDay);
        if (parseFloat(hijriStyle.fontSize) < 8) {
          throw new Error(`Calendar PDF Hijri font is too small: ${hijriStyle.fontSize}`);
        }
        if (hijriStyle.position !== "absolute" || hijriStyle.display === "none") {
          throw new Error(`Calendar PDF Hijri positioning/display invalid: position=${hijriStyle.position}, display=${hijriStyle.display}`);
        }
        if (Math.abs(parseFloat(hijriStyle.bottom) - 2) > 0.5 || Math.abs(parseFloat(hijriStyle.right) - 2) > 0.5) {
          throw new Error(`Calendar PDF Hijri anchor drifted: bottom=${hijriStyle.bottom}, right=${hijriStyle.right}`);
        }
      }

      if (gregorianDay && hijriDay) {
        const dayBox = gregorianDay.closest<HTMLElement>(".day");
        if (dayBox) {
          const dayRect = dayBox.getBoundingClientRect();
          const gregRect = gregorianDay.getBoundingClientRect();
          const hijriRect = hijriDay.getBoundingClientRect();
          if (gregRect.bottom > dayRect.bottom + 1 || gregRect.top < dayRect.top - 1) {
            throw new Error(`Calendar PDF Gregorian digit clipped: gregBottom=${gregRect.bottom}, cellBottom=${dayRect.bottom}`);
          }
          if (hijriRect.bottom > dayRect.bottom + 1 || hijriRect.top < dayRect.top - 1) {
            throw new Error(`Calendar PDF Hijri digit clipped: hijriBottom=${hijriRect.bottom}, cellBottom=${dayRect.bottom}`);
          }
          if (gregRect.bottom > hijriRect.top + 1) {
            throw new Error(`Calendar PDF primary/secondary digits overlap: gregBottom=${gregRect.bottom}, hijriTop=${hijriRect.top}`);
          }
        }
      }
    }, body.language === "ur");

    const pdfBytes = await page.pdf({
      format: "A4",
      landscape: body.page === "a4-landscape",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      scale: 1,
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
