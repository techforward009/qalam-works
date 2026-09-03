import {
  convert,
  gregorianMonthLength,
  gregorianToJDN,
  isGregorianLeap,
  todayGregorian,
  jdnToGregorian,
  type ConversionResult,
  type DateParts,
} from "./dateEngine";


function compareGregorian(a: DateParts, b: DateParts): number {
  return gregorianToJDN(a.year, a.month, a.day) - gregorianToJDN(b.year, b.month, b.day);
}

function addDaysToGregorian(base: DateParts, days: number): DateParts {
  return jdnToGregorian(gregorianToJDN(base.year, base.month, base.day) + days);
}

export function weekdayIndexFromGregorian(parts: DateParts): number {
  return ((gregorianToJDN(parts.year, parts.month, parts.day) % 7) + 7) % 7;
}

export interface CalendarAge {
  years: number;
  months: number;
  days: number;
}

export type DateRelation = "past" | "today" | "future";

export interface RichDateIntelligence {
  gregorian: DateParts;
  weekdayIndex: number; // Monday=0 ... Sunday=6
  leapYear: boolean;
  dayOfYear: number;
  isoWeek: number;
  isoWeekYear: number;
  julianDayNumber: number;
  relation: DateRelation;
  wholeDayDistance: number;
  age: CalendarAge | null;
}

export interface HijriYearSearchInput {
  hijriDay: number;
  hijriMonth: number;
  gregorianYear: number;
}

export interface HijriYearSearchMatch extends ConversionResult {
  weekdayIndex: number;
}

export function gregorianDayOfYear(parts: DateParts): number {
  let total = parts.day;
  for (let month = 1; month < parts.month; month++) {
    total += gregorianMonthLength(month, parts.year);
  }
  return total;
}

export function isoWeekInfo(parts: DateParts): { week: number; year: number } {
  const weekday = weekdayIndexFromGregorian(parts); // Mon=0
  const thursday = addDaysToGregorian(parts, 3 - weekday);
  const week = Math.floor((gregorianDayOfYear(thursday) - 1) / 7) + 1;
  return { week, year: thursday.year };
}

/**
 * Add whole calendar months using a deterministic month-end clamp.
 *
 * Policy: preserve the original day-of-month when it exists in the destination
 * month; otherwise clamp to that destination month's final Gregorian day.
 * Examples: 31 Jan + 1 month = 28 Feb 2023; 29 Feb 2020 + 12 months = 28 Feb 2021.
 * Each calculation is anchored to the original `from` date, so clamping does not
 * cascade through later months (31 Jan + 2 months = 31 Mar, not 28 Mar).
 */
function addGregorianMonthsClamped(from: DateParts, wholeMonths: number): DateParts {
  const zeroBased = (from.year * 12 + (from.month - 1)) + wholeMonths;
  const year = Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12 + 1;
  return {
    year,
    month,
    day: Math.min(from.day, gregorianMonthLength(month, year)),
  };
}

/**
 * Exact non-negative calendar age from `from` to `to`.
 *
 * The result is the largest whole number of clamped calendar months that can be
 * added to `from` without passing `to`; it is then expressed as years + months,
 * with the remaining interval returned as whole Gregorian days via JDN.
 * Therefore months are always 0..11 and days are always non-negative.
 */
export function exactCalendarAge(from: DateParts, to: DateParts): CalendarAge | null {
  if (compareGregorian(from, to) > 0) return null;

  let totalMonths = (to.year - from.year) * 12 + (to.month - from.month);
  if (totalMonths < 0) return null;

  let anchor = addGregorianMonthsClamped(from, totalMonths);
  if (compareGregorian(anchor, to) > 0) {
    totalMonths -= 1;
    anchor = addGregorianMonthsClamped(from, totalMonths);
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const days = gregorianToJDN(to.year, to.month, to.day) - gregorianToJDN(anchor.year, anchor.month, anchor.day);

  // Defensive invariant guard. Valid ordered dates should never reach this.
  if (years < 0 || months < 0 || months > 11 || days < 0) {
    throw new Error("Calendar age invariant violated");
  }

  return { years, months, days };
}

export function getRichDateIntelligence(
  gregorian: DateParts,
  today: DateParts = todayGregorian(),
): RichDateIntelligence {
  const delta = compareGregorian(today, gregorian);
  const relation: DateRelation = delta === 0 ? "today" : delta > 0 ? "past" : "future";
  const iso = isoWeekInfo(gregorian);

  return {
    gregorian,
    weekdayIndex: weekdayIndexFromGregorian(gregorian),
    leapYear: isGregorianLeap(gregorian.year),
    dayOfYear: gregorianDayOfYear(gregorian),
    isoWeek: iso.week,
    isoWeekYear: iso.year,
    julianDayNumber: gregorianToJDN(gregorian.year, gregorian.month, gregorian.day),
    relation,
    wholeDayDistance: Math.abs(delta),
    age: relation === "future" ? null : exactCalendarAge(gregorian, today),
  };
}

/**
 * Scan every supported Gregorian day in a year using the existing deterministic
 * conversion engine. No approximate Hijri-year formula is used.
 */
export function findHijriDateInGregorianYear(
  input: HijriYearSearchInput,
): HijriYearSearchMatch[] {
  const { hijriDay, hijriMonth, gregorianYear } = input;
  if (!Number.isInteger(gregorianYear) || gregorianYear < 1900 || gregorianYear > 2100) return [];
  if (!Number.isInteger(hijriMonth) || hijriMonth < 1 || hijriMonth > 12) return [];
  if (!Number.isInteger(hijriDay) || hijriDay < 1 || hijriDay > 30) return [];

  const matches: HijriYearSearchMatch[] = [];
  for (let month = 1; month <= 12; month++) {
    const monthLength = gregorianMonthLength(month, gregorianYear);
    for (let day = 1; day <= monthLength; day++) {
      const converted = convert("gregorian", { year: gregorianYear, month, day });
      if (converted.hijri.month === hijriMonth && converted.hijri.day === hijriDay) {
        matches.push({
          ...converted,
          weekdayIndex: weekdayIndexFromGregorian(converted.gregorian),
        });
      }
    }
  }
  return matches;
}
