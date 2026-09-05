import {
  GREGORIAN_MONTHS_EN,
  GREGORIAN_MONTHS_UR,
  HIJRI_MONTHS_EN,
  HIJRI_MONTHS_UR,
  convert,
  gregorianToJDN,
  jdnToGregorian,
  type DateParts,
} from "../../date-converter/utils/dateEngine";
import type { CalendarLanguage, CalendarMonth } from "./calendarModel";

const URDU_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

export interface HijriMonthContext {
  month: number;
  year: number;
  label: string;
}

export function toUrduDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => URDU_DIGITS[Number(digit)]);
}

export function shiftGregorian(date: DateParts, days: number): DateParts {
  if (!days) return date;
  return jdnToGregorian(gregorianToJDN(date.year, date.month, date.day) + days);
}

export function adjustedHijriForGregorian(date: DateParts, hijriOffset = 0): DateParts {
  return convert("gregorian", shiftGregorian(date, hijriOffset)).hijri;
}

export function deriveHijriMonthContexts(
  month: CalendarMonth,
  language: CalendarLanguage,
  hijriOffset = 0,
): HijriMonthContext[] {
  const labels = language === "ur" ? HIJRI_MONTHS_UR : HIJRI_MONTHS_EN;
  const contexts: HijriMonthContext[] = [];

  for (const cell of month.weeks.flatMap((week) => week.cells)) {
    if (!cell.inCurrentMonth) continue;
    const hijri = cell.hijri ?? adjustedHijriForGregorian(cell.gregorian, hijriOffset);
    if (!hijri) continue;
    const previous = contexts[contexts.length - 1];
    if (previous?.month === hijri.month && previous.year === hijri.year) continue;
    contexts.push({
      month: hijri.month,
      year: hijri.year,
      label: labels[hijri.month - 1],
    });
  }

  return contexts;
}

export function formatHijriContextYear(
  context: HijriMonthContext,
  language: CalendarLanguage,
): string {
  const value = language === "ur" ? toUrduDigits(context.year) : String(context.year);
  return `${value} ${language === "ur" ? "ھ" : "AH"}`;
}

export function formatHijriContextList(
  contexts: HijriMonthContext[],
  language: CalendarLanguage,
): string {
  if (!contexts.length) return "";
  return contexts
    .map((context) => {
      const year = formatHijriContextYear(context, language);
      return `${context.label} ${year}`;
    })
    .join(" / ");
}

export function formatGregorianMonthTitle(
  month: number,
  year: number,
  language: CalendarLanguage,
): string {
  const labels = language === "ur" ? GREGORIAN_MONTHS_UR : GREGORIAN_MONTHS_EN;
  return `${labels[month - 1]} ${year}`;
}

export function isSunday(date: DateParts): boolean {
  const mondayIndex = ((gregorianToJDN(date.year, date.month, date.day) % 7) + 7) % 7;
  return mondayIndex === 6;
}
