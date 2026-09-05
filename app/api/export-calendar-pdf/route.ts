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
  hijriOffsetMonths?: number[];
  hijriOffsets?: number[];
  researchNote?: string;
  bannerName?: string;
  bannerTitle?: string;
  bannerLogo?: string;
  bannerSideText?: string;
  logoScale?: number;
  titleFontPx?: number;
  titleWidthMm?: number;
  titlePadYMm?: number;
  sideFontPx?: number;
}

function isMonthList(value: unknown): value is number[] {
  return Array.isArray(value) &&
    value.length <= 12 &&
    value.every((month) => Number.isInteger(month) && month >= 1 && month <= 12);
}

function isOffsetList(value: unknown): value is number[] {
  return Array.isArray(value) &&
    value.length === 12 &&
    value.every((offset) => Number.isInteger(offset) && offset >= -2 && offset <= 2);
}

function isBannerText(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.length <= 160);
}

function isBannerLogo(value: unknown): boolean {
  return value === undefined ||
    (typeof value === "string" &&
      value.length <= 800000 &&
      /^data:image\/(png|jpeg);base64,/i.test(value));
}

function isSizeNumber(value: unknown, min: number, max: number): boolean {
  return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max);
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
    (body.hijriOffsetMonths === undefined || isMonthList(body.hijriOffsetMonths)) &&
    (body.hijriOffsets === undefined || isOffsetList(body.hijriOffsets)) &&
    (body.researchNote === undefined ||
      (typeof body.researchNote === "string" && body.researchNote.length <= 240)) &&
    isBannerText(body.bannerName) &&
    isBannerText(body.bannerTitle) &&
    isBannerText(body.bannerSideText) &&
    isBannerLogo(body.bannerLogo) &&
    isSizeNumber(body.logoScale, 60, 180) &&
    isSizeNumber(body.titleFontPx, 10, 22) &&
    isSizeNumber(body.titleWidthMm, 48, 130) &&
    isSizeNumber(body.titlePadYMm, 0.6, 4.5) &&
    isSizeNumber(body.sideFontPx, 6, 16)
  );
}

function requireFontBase64(filename: string): string {
  const fontPath = path.join(process.cwd(), "public", "fonts", filename);
  if (!existsSync(fontPath)) {
    throw new Error(`Required bundled calendar PDF font is missing: ${filename}`);
  }
  return readFileSync(fontPath).toString("base64");
}

function optionalFontBase64(filename: string): string | undefined {
  const fontPath = path.join(process.cwd(), "public", "fonts", filename);
  if (!existsSync(fontPath)) return undefined;
  return readFileSync(fontPath).toString("base64");
}

function requireLocalCalendarFontsBase64(): EmbeddedNaskhFonts {
  const regularBase64 = requireFontBase64("naskh-400.woff2");
  const boldPath = path.join(process.cwd(), "public", "fonts", "naskh-700.woff2");
  const nastaliqRegular = requireFontBase64("nastaliq-400.woff2");
  const nastaliqBoldPath = path.join(process.cwd(), "public", "fonts", "nastaliq-700.woff2");
  const nastaliqLatinRegular = optionalFontBase64("nastaliq-latin-400.woff2");
  const nastaliqLatinBold = optionalFontBase64("nastaliq-latin-700.woff2");
  return {
    regularBase64,
    boldBase64: existsSync(boldPath) ? readFileSync(boldPath).toString("base64") : regularBase64,
    nastaliqRegularBase64: nastaliqRegular,
    nastaliqBoldBase64: existsSync(nastaliqBoldPath) ? readFileSync(nastaliqBoldPath).toString("base64") : nastaliqRegular,
    nastaliqLatinRegularBase64: nastaliqLatinRegular,
    nastaliqLatinBoldBase64: nastaliqLatinBold ?? nastaliqLatinRegular,
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
    const naskhFonts = requireLocalCalendarFontsBase64();
    const html = buildCalendarHtml(model, {
      naskhFonts,
      researchNote: body.researchNote?.trim() || undefined,
      bannerName: body.bannerName,
      bannerTitle: body.bannerTitle,
      bannerLogo: body.bannerLogo,
      bannerSideText: body.bannerSideText,
      logoScale: body.logoScale,
      titleFontPx: body.titleFontPx,
      titleWidthMm: body.titleWidthMm,
      titlePadYMm: body.titlePadYMm,
      sideFontPx: body.sideFontPx,
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
      const fontsApi = (document as any).fonts;
      if (fontsApi?.load) {
        await Promise.allSettled([
          fontsApi.load('16px "QalamNaskh"'),
          fontsApi.load('700 16px "QalamNaskh"'),
          fontsApi.load('16px "QalamNastaliq"'),
          fontsApi.load('700 16px "QalamNastaliq"'),
        ]);
      }
      await fontsApi?.ready;
      if (mustVerifyNaskh && !fontsApi?.check('16px "QalamNaskh"')) {
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

      const dayCounts = [...document.querySelectorAll(".month")].map(
        (month) => month.querySelectorAll(".day").length,
      );
      if (dayCounts.length !== 12 || dayCounts.some((count) => count !== 42)) {
        throw new Error(`Calendar PDF month week rows are not fixed at 6: ${dayCounts.join(",")}`);
      }

      const firstMonth = document.querySelector(".month");
      if (firstMonth) {
        const monthDays = [...firstMonth.querySelectorAll(".day")];
        const widths = monthDays.map((day) => day.getBoundingClientRect().width);
        const heights = monthDays.map((day) => day.getBoundingClientRect().height);
        if (Math.max(...widths) - Math.min(...widths) > 0.6) {
          throw new Error(`Calendar PDF day cells are not equal width: ${Math.min(...widths)}-${Math.max(...widths)}`);
        }
        if (Math.max(...heights) - Math.min(...heights) > 0.6) {
          throw new Error(`Calendar PDF day cells are not equal height: ${Math.min(...heights)}-${Math.max(...heights)}`);
        }
        const columnLefts = [0, 7, 14, 21, 28, 35].map((index) => monthDays[index].getBoundingClientRect().left);
        if (Math.max(...columnLefts) - Math.min(...columnLefts) > 0.6) {
          throw new Error(`Calendar PDF vertical grid lines are not aligned: ${columnLefts.join(",")}`);
        }
      }

      const monthTitleStyle = getComputedStyle(monthTitle);
      const monthHeaderStyle = getComputedStyle(monthHeader);
      const weekdayRowStyle = getComputedStyle(weekdayRow);
      const weekdayStyle = getComputedStyle(weekday);

      if (parseFloat(monthTitleStyle.fontSize) < 11.5) {
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
      if (Math.abs(nameCenterY - yearCenterY) > 5) {
        throw new Error(`Calendar PDF month title vertical centers diverged: month=${nameCenterY}, year=${yearCenterY}`);
      }
      const monthCard = monthTitle.closest<HTMLElement>(".month");
      if (monthCard) {
        const monthRect = monthCard.getBoundingClientRect();
        const titleRect = monthTitle.getBoundingClientRect();
        if (titleRect.right > monthRect.right + 3) {
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
      if (leftHijriContext.getBoundingClientRect().width < 24 || rightHijriContext.getBoundingClientRect().width < 24) {
        throw new Error("Calendar PDF Hijri context columns were squeezed out of the header");
      }
      if (parseFloat(monthHeaderStyle.height) < 27) {
        throw new Error(`Calendar PDF month header is too short: ${monthHeaderStyle.height}`);
      }
      if (parseFloat(weekdayRowStyle.height) < 12.5 || parseFloat(weekdayStyle.height) < 12.5) {
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
        if (parseFloat(gregorianStyle.fontSize) < 13) {
          throw new Error(`Calendar PDF Gregorian font is too small: ${gregorianStyle.fontSize}`);
        }
      }

      if (hijriDay) {
        const hijriStyle = getComputedStyle(hijriDay);
        if (parseFloat(hijriStyle.fontSize) < 10) {
          throw new Error(`Calendar PDF Hijri font is too small: ${hijriStyle.fontSize}`);
        }
        if (hijriStyle.display === "none") {
          throw new Error(`Calendar PDF Hijri positioning/display invalid: position=${hijriStyle.position}, display=${hijriStyle.display}`);
        }
      }

      if (gregorianDay && hijriDay) {
        const dayBox = gregorianDay.closest<HTMLElement>(".day");
        if (dayBox) {
          const dayRect = dayBox.getBoundingClientRect();
          const gregRect = gregorianDay.getBoundingClientRect();
          const hijriRect = hijriDay.getBoundingClientRect();
          if (gregRect.width < 2 || gregRect.height < 2) {
            throw new Error("Calendar PDF Gregorian digit did not paint");
          }
          if (hijriRect.width < 2 || hijriRect.height < 2) {
            throw new Error("Calendar PDF Hijri digit did not paint");
          }
          if (gregRect.bottom > dayRect.bottom + 1 || gregRect.top < dayRect.top - 1) {
            throw new Error(`Calendar PDF Gregorian digit clipped: gregBottom=${gregRect.bottom}, cellBottom=${dayRect.bottom}`);
          }
          if (hijriRect.bottom > dayRect.bottom + 1 || hijriRect.top < dayRect.top - 1) {
            throw new Error(`Calendar PDF Hijri digit clipped: hijriBottom=${hijriRect.bottom}, cellBottom=${dayRect.bottom}`);
          }
          if (gregRect.left > hijriRect.left - 1) {
            throw new Error(`Calendar PDF Gregorian is not left of Hijri: gregLeft=${gregRect.left}, hijriLeft=${hijriRect.left}`);
          }
          if (gregRect.top > hijriRect.top - 1) {
            throw new Error(`Calendar PDF Gregorian is not above Hijri: gregTop=${gregRect.top}, hijriTop=${hijriRect.top}`);
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
