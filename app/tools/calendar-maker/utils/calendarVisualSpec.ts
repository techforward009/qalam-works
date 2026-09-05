import type { CalendarPage } from "./calendarModel";

export const CALENDAR_REFERENCE_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const CALENDAR_URDU_WEEKDAYS = ["پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار"] as const;
export const CALENDAR_PDF_HIJRI_SHORT_EN = [
  "Muharram",
  "Safar",
  "Rabi I",
  "Rabi II",
  "Jumada I",
  "Jumada II",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu Qadah",
  "Dhu Hijjah",
] as const;

export const CALENDAR_ANNUAL_GRID_CLASS =
  "grid grid-cols-1 gap-2 bg-[var(--calendar-paper)] p-2 md:grid-cols-2 xl:grid-cols-3";

/** Every month card always has 6 week rows so 4/5/6-week months share one cell height. */
export const CALENDAR_MONTH_WEEK_ROWS = 6;
export const CALENDAR_MONTH_DAY_CELLS = CALENDAR_MONTH_WEEK_ROWS * 7;

export const CALENDAR_VISUAL_SPEC = {
  colors: {
    frame: "#0B5136",
    gold: "#C99547",
    titleCapsule: "#F7E9D5",
    paper: "#FAF8F0",
    monthTitle: "#EF2B2F",
    hijriContext: "#0D633E",
    hijriDay: "#15803D",
    text: "#161A17",
    contextYear: "#26382E",
    gridStrong: "#5D6861",
    grid: "#77817A",
    weekdayGrid: "#6D756F",
    researchText: "#6F5B3E",
    footerText: "#69736C",
  },
  monthTones: {
    blue: {
      header: "#EEF7FA",
      weekday: "#F7FBFC",
      cell: "#F2F8FA",
      filler: "#F0F6F8",
    },
    green: {
      header: "#EEF8F0",
      weekday: "#F8FCF8",
      cell: "#F2F9F3",
      filler: "#EFF6F0",
    },
    cream: {
      header: "#FFF8DF",
      weekday: "#FFFCF0",
      cell: "#FFF9E7",
      filler: "#FCF6E2",
    },
    pink: {
      header: "#FDEEF3",
      weekday: "#FFF7F9",
      cell: "#FDF0F4",
      filler: "#FAEAF0",
    },
  },
  web: {
    compact: {
      monthHeaderMinPx: 68,
      cellMinPx: 50,
      gregorianFont: "clamp(14px, 1.8vw, 18px)",
      hijriFont: "clamp(10px, 1.3vw, 12px)",
    },
    detail: {
      monthHeaderMinPx: 90,
      cellMinPx: 92,
      gregorianFont: "clamp(24px, 4vw, 34px)",
      hijriFont: "clamp(13px, 1.9vw, 16px)",
    },
  },
  print: {
    safePageMarginMm: 7,
    innerFramePaddingMm: 0.8,
    portraitContentHeightMm: 282,
    landscapeContentHeightMm: 195,
    monthGapPortraitMm: 1.25,
    monthGapLandscapeMm: 1.05,
    monthHeaderPortraitMm: 9.0,
    monthHeaderLandscapeMm: 8.5,
    gregorianFontPortrait: "14px",
    gregorianFontLandscape: "14px",
    hijriFontPortrait: "11px",
    hijriFontLandscape: "11px",
    weekdayStripPortraitMm: 3.8,
    weekdayStripLandscapeMm: 3.6,
    weekdayFontPortrait: "8px",
    weekdayFontLandscape: "8px",
    hijriContextMonthFontPortrait: "7.5px",
    hijriContextMonthFontLandscape: "7px",
    hijriContextYearFontPortrait: "6.5px",
    hijriContextYearFontLandscape: "6px",
    monthTitleFontPortrait: "13px",
    monthTitleFontLandscape: "12px",
    weekdayHeightPortraitPx: 14,
    weekdayHeightLandscapePx: 13,
    monthHeaderHeightPortraitPx: 30,
    monthHeaderHeightLandscapePx: 28,
  },
} as const;

export type CalendarMonthTone = keyof typeof CALENDAR_VISUAL_SPEC.monthTones;

export function calendarMonthToneKey(month: number): CalendarMonthTone {
  if (month <= 3) return "blue";
  if (month <= 6) return "green";
  if (month <= 9) return "cream";
  return "pink";
}

export function calendarMonthTone(month: number) {
  return CALENDAR_VISUAL_SPEC.monthTones[calendarMonthToneKey(month)];
}

export function calendarCssVariables(month?: number): Record<string, string> {
  const colors = CALENDAR_VISUAL_SPEC.colors;
  const base: Record<string, string> = {
    "--calendar-frame": colors.frame,
    "--calendar-gold": colors.gold,
    "--calendar-title-capsule": colors.titleCapsule,
    "--calendar-paper": colors.paper,
    "--calendar-month-title": colors.monthTitle,
    "--calendar-hijri-context": colors.hijriContext,
    "--calendar-hijri-day": colors.hijriDay,
    "--calendar-text": colors.text,
    "--calendar-context-year": colors.contextYear,
    "--calendar-grid-strong": colors.gridStrong,
    "--calendar-grid": colors.grid,
    "--calendar-weekday-grid": colors.weekdayGrid,
    "--calendar-research-text": colors.researchText,
    "--calendar-footer-text": colors.footerText,
  };

  if (month !== undefined) {
    const tone = calendarMonthTone(month);
    base["--calendar-header"] = tone.header;
    base["--calendar-weekday"] = tone.weekday;
    base["--calendar-cell"] = tone.cell;
    base["--calendar-filler"] = tone.filler;
  }

  return base;
}

export function calendarPrintMetrics(page: CalendarPage) {
  const landscape = page === "a4-landscape";
  const print = CALENDAR_VISUAL_SPEC.print;

  return {
    landscape,
    safeMarginMm: print.safePageMarginMm,
    contentHeightMm: landscape ? print.landscapeContentHeightMm : print.portraitContentHeightMm,
    monthGapMm: landscape ? print.monthGapLandscapeMm : print.monthGapPortraitMm,
    monthHeaderMm: landscape ? print.monthHeaderLandscapeMm : print.monthHeaderPortraitMm,
    weekdayStripMm: landscape ? print.weekdayStripLandscapeMm : print.weekdayStripPortraitMm,
    weekdayFont: landscape ? print.weekdayFontLandscape : print.weekdayFontPortrait,
    hijriContextMonthFont: landscape ? print.hijriContextMonthFontLandscape : print.hijriContextMonthFontPortrait,
    hijriContextYearFont: landscape ? print.hijriContextYearFontLandscape : print.hijriContextYearFontPortrait,
    monthTitleFont: landscape ? print.monthTitleFontLandscape : print.monthTitleFontPortrait,
    weekdayHeightPx: landscape ? print.weekdayHeightLandscapePx : print.weekdayHeightPortraitPx,
    monthHeaderHeightPx: landscape ? print.monthHeaderHeightLandscapePx : print.monthHeaderHeightPortraitPx,
    gregorianFont: landscape ? print.gregorianFontLandscape : print.gregorianFontPortrait,
    hijriFont: landscape ? print.hijriFontLandscape : print.hijriFontPortrait,
    innerFramePaddingMm: print.innerFramePaddingMm,
  };
}

export function calendarPdfRootVariables(): string {
  const vars = calendarCssVariables();
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

export function calendarPdfMonthVariables(month: number): string {
  const tone = calendarMonthTone(month);
  return [
    `--calendar-header:${tone.header}`,
    `--calendar-weekday:${tone.weekday}`,
    `--calendar-cell:${tone.cell}`,
    `--calendar-filler:${tone.filler}`,
  ].join(";");
}
