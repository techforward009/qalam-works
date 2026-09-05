import {
  convert,
  gregorianMonthLength,
  isoDate,
  gregorianToJDN,
  jdnToGregorian,
  type DateParts,
} from "../../date-converter/utils/dateEngine";

function addDaysToGregorian(base: DateParts, days: number): DateParts {
  return jdnToGregorian(gregorianToJDN(base.year, base.month, base.day) + days);
}

function weekdayIndexFromGregorian(parts: DateParts): number {
  return ((gregorianToJDN(parts.year, parts.month, parts.day) % 7) + 7) % 7;
}

export type CalendarContentMode = "gregorian" | "gregorian-hijri";
export type CalendarLanguage = "en" | "ur";
export type WeekStart = "sunday" | "monday";
export type CalendarPage = "a4-portrait" | "a4-landscape";

export const MIN_GREGORIAN_YEAR = 1900;
export const MAX_GREGORIAN_YEAR = 2100;

export function parseCalendarYearInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < MIN_GREGORIAN_YEAR || parsed > MAX_GREGORIAN_YEAR) return null;
  return parsed;
}

export interface CalendarCell {
  gregorian: DateParts;
  gregorianIso: string;
  inCurrentMonth: boolean;
  conversionSupported: boolean;
  hijri: DateParts | null;
}

export interface CalendarWeek {
  cells: CalendarCell[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  weeks: CalendarWeek[];
}

export interface CalendarYearModel {
  year: number;
  content: CalendarContentMode;
  language: CalendarLanguage;
  weekStart: WeekStart;
  page: CalendarPage;
  hijriOffset: number;
  hijriOffsetMonths: number[];
  months: CalendarMonth[];
}

export interface BuildCalendarYearOptions {
  year: number;
  content: CalendarContentMode;
  language: CalendarLanguage;
  weekStart: WeekStart;
  page: CalendarPage;
  hijriOffset?: number;
  hijriOffsetMonths?: number[];
}

export const GREGORIAN_MONTH_LABELS = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  ur: [
    "جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون",
    "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر",
  ],
} as const;

export const HIJRI_MONTH_SHORT_LABELS = {
  en: ["Muh", "Saf", "Rb1", "Rb2", "Jm1", "Jm2", "Raj", "Shb", "Ram", "Shw", "DQ", "DH"],
  ur: ["مح", "صف", "رب۱", "رب۲", "جم۱", "جم۲", "رج", "شع", "رم", "شو", "ذق", "ذح"],
} as const;

const WEEKDAY_LABELS_MONDAY = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ur: ["پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار"],
} as const;

export function weekdayLabels(language: CalendarLanguage, weekStart: WeekStart): readonly string[] {
  const labels = [...WEEKDAY_LABELS_MONDAY[language]];
  if (language === "ur") return labels;
  if (weekStart === "sunday") labels.unshift(labels.pop()!);
  return labels;
}

export function calendarWeekdayColumn(date: DateParts, weekStart: WeekStart): number {
  const mondayIndex = weekdayIndexFromGregorian(date);
  return weekStart === "monday" ? mondayIndex : (mondayIndex + 1) % 7;
}

export function isSupportedGregorianDate(date: DateParts): boolean {
  return date.year >= MIN_GREGORIAN_YEAR && date.year <= MAX_GREGORIAN_YEAR;
}

function cellFor(
  date: DateParts,
  currentMonth: number,
  includeHijri: boolean,
  hijriOffset: number,
): CalendarCell {
  const conversionSupported = isSupportedGregorianDate(date);
  const shifted = hijriOffset
    ? addDaysToGregorian(date, hijriOffset)
    : date;

  return {
    gregorian: date,
    gregorianIso: isoDate(date),
    inCurrentMonth: date.month === currentMonth,
    conversionSupported,
    hijri:
      includeHijri && conversionSupported && isSupportedGregorianDate(shifted)
        ? convert("gregorian", shifted).hijri
        : null,
  };
}

export function buildCalendarMonth(
  year: number,
  month: number,
  content: CalendarContentMode,
  weekStart: WeekStart,
  hijriOffset = 0,
): CalendarMonth {
  if (!Number.isInteger(year) || year < MIN_GREGORIAN_YEAR || year > MAX_GREGORIAN_YEAR) {
    throw new RangeError(`Gregorian year must be between ${MIN_GREGORIAN_YEAR} and ${MAX_GREGORIAN_YEAR}.`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("Gregorian month must be between 1 and 12.");
  }

  const includeHijri = content === "gregorian-hijri";
  const first = { year, month, day: 1 };
  const leading = calendarWeekdayColumn(first, weekStart);
  const daysInMonth = gregorianMonthLength(month, year);
  const totalUsed = leading + daysInMonth;
  const trailing = (7 - (totalUsed % 7)) % 7;

  const cells: CalendarCell[] = [];
  for (let offset = -leading; offset < daysInMonth + trailing; offset++) {
    const date = addDaysToGregorian(first, offset);
    cells.push(cellFor(date, month, includeHijri, hijriOffset));
  }

  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push({ cells: cells.slice(i, i + 7) });
  }

  return { year, month, weeks };
}

export function buildCalendarYearModel(options: BuildCalendarYearOptions): CalendarYearModel {
  const year = options.year;
  if (!Number.isInteger(year) || year < MIN_GREGORIAN_YEAR || year > MAX_GREGORIAN_YEAR) {
    throw new RangeError(`Gregorian year must be between ${MIN_GREGORIAN_YEAR} and ${MAX_GREGORIAN_YEAR}.`);
  }

  const effectiveWeekStart: WeekStart = options.language === "ur" ? "monday" : options.weekStart;
  const hijriOffset = Number.isInteger(options.hijriOffset) ? Number(options.hijriOffset) : 0;
  const hijriOffsetMonths = Array.isArray(options.hijriOffsetMonths)
    ? [...new Set(options.hijriOffsetMonths.filter((month) => Number.isInteger(month) && month >= 1 && month <= 12))]
    : [];

  return {
    ...options,
    year,
    weekStart: effectiveWeekStart,
    hijriOffset,
    hijriOffsetMonths,
    months: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const applyOffset = hijriOffsetMonths.length === 0 || hijriOffsetMonths.includes(month);
      return buildCalendarMonth(year, month, options.content, effectiveWeekStart, applyOffset ? hijriOffset : 0);
    }),
  };
}
