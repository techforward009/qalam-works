/**
 * Qalam Works Date Converter Engine
 *
 * Converts between three calendar systems:
 *   1. Gregorian (proleptic Gregorian calendar)
 *   2. Hijri / Islamic Lunar (Tabular Islamic calendar — civil calculation)
 *      The tabular calendar is used because it is deterministic and reproducible.
 *      It agrees with observational calendars within ±1 day; that ±1-day caveat
 *      is surfaced to the user in the UI.
 *   3. Solar Hijri / Persian (Algorithmic Solar Hijri calendar, Borkowski 1996)
 *
 * All conversions route through Julian Day Number (JDN) as the neutral
 * intermediate representation. No Date objects are used so there are no
 * timezone-dependent shifts.
 *
 * Supported range:
 *   Gregorian  1900-01-01 … 2100-12-31
 *   Hijri      1318 AH … 1521 AH  (approx)
 *   Solar Hijri 1279 SH … 1479 SH  (approx)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CalendarType = "gregorian" | "hijri" | "solar";

export interface DateParts {
  year:  number;   // full year (e.g. 2026, 1447, 1405)
  month: number;   // 1-based
  day:   number;   // 1-based
}

export interface ConversionResult {
  gregorian:  DateParts;
  hijri:      DateParts;
  solar:      DateParts;
}

export interface ValidationError {
  field: "day" | "month" | "year";
  message: string;
}

// ── Julian Day Number helpers ─────────────────────────────────────────────────

/**
 * Gregorian date → Julian Day Number.
 * Algorithm: Jean Meeus, "Astronomical Algorithms" §7.
 */
function gregorianToJDN(y: number, m: number, d: number): number {
  // Proleptic Gregorian
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
}

function jdnToGregorian(jdn: number): DateParts {
  const z = jdn;
  const a = Math.floor((z - 1867216.25) / 36524.25);
  const b = z + 1 + a - Math.floor(a / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);
  const day   = c - e - Math.floor(30.6001 * f);
  const month = f < 14 ? f - 1 : f - 13;
  const year  = month > 2 ? d - 4716 : d - 4715;
  return { year, month, day };
}

// ── Hijri (Tabular Islamic calendar) ─────────────────────────────────────────
// Epoch: 1 Muharram 1 AH = Julian Day 1948439 (Friday 16 July 622 CE Gregorian)
const HIJRI_EPOCH_JDN = 1948439;

/**
 * Tabular Islamic calendar (most-common civil variant).
 * Leap years in a 30-year cycle: years 2,5,7,10,13,15,18,21,24,26,29.
 */
const HIJRI_LEAP_YEARS = new Set([2, 5, 7, 10, 13, 15, 18, 21, 24, 26, 29]);

function isHijriLeap(year: number): boolean {
  return HIJRI_LEAP_YEARS.has(((year - 1) % 30) + 1);
}

function hijriMonthLength(month: number, year: number): number {
  if (month % 2 === 1) return 30;          // odd months: 30 days
  if (month === 12) return isHijriLeap(year) ? 30 : 29;
  return 29;
}

function hijriToJDN(y: number, m: number, d: number): number {
  // Days since epoch
  const cycle     = Math.floor((y - 1) / 30);
  const yearInCyc = ((y - 1) % 30) + 1;
  // Count leap years in this cycle up to (not including) current year
  let leapsBefore = 0;
  for (const ly of HIJRI_LEAP_YEARS) { if (ly < yearInCyc) leapsBefore++; }
  // Days for complete cycles + years in cycle + months + day
  const daysFromEpoch =
    cycle * 10631 +
    (yearInCyc - 1) * 354 + leapsBefore +
    // Sum complete months
    29 * (m - 1) + Math.floor(m / 2) +    // days in complete months 1…(m-1)
    // Adjust for month 12 leap correction already handled in sum:
    d - 1;
  return HIJRI_EPOCH_JDN + daysFromEpoch;
}

function jdnToHijri(jdn: number): DateParts {
  // Shift to epoch day 0
  let n = jdn - HIJRI_EPOCH_JDN;
  // 30-year cycles (10631 days each)
  const cycles = Math.floor(n / 10631);
  n -= cycles * 10631;
  // Year within cycle
  let year = cycles * 30 + 1;
  while (true) {
    const yearLen = isHijriLeap(year) ? 355 : 354;
    if (n < yearLen) break;
    n -= yearLen;
    year++;
  }
  // Month
  let month = 1;
  while (month <= 12) {
    const mLen = hijriMonthLength(month, year);
    if (n < mLen) break;
    n -= mLen;
    month++;
  }
  const day = n + 1;
  return { year, month, day };
}

// ── Solar Hijri (Persian / Jalali) ───────────────────────────────────────────
// Epoch: 1 Farvardin 1 SH = Julian Day 1948320 (Gregorian 22 March 622 CE)
// Algorithm: Borkowski (1996) as described in the "Calendrical Calculations" approach.

const SOLAR_EPOCH_JDN = 1948320; // 1 Farvardin 1 SH

function solarToJDN(y: number, m: number, d: number): number {
  // Cycles of 2820 years + 4 extra years prefix (total leap-cycle 2820 years)
  const ep = y - 1;
  const cyc = Math.floor(ep / 2820);
  const yr  = ep % 2820;

  // Days in 2820-year grand cycle = 2820*365 + 683 = 1029983
  // Days in 4-year section = 365*4 + 1 = 1461 (same as Gregorian 4-year)
  // But Persian uses a 2820-year cycle with 683 leap years
  // Simplified leap: year is leap if mod 4 == 1 (for years 1,5,9…) but with a
  // correction that fits the 2820 cycle. We use: leap if (year*8+29)%33<8.
  function isLeap(y: number): boolean {
    return ((y * 8) + 29) % 33 < 8;
  }

  // Count leap years from 1 to yr (within the 2820-year span)
  let leaps = 0;
  for (let i = 1; i <= yr; i++) { if (isLeap(i)) leaps++; }

  const dayOfYear = m <= 6 ? (m - 1) * 31 + d - 1 : 186 + (m - 7) * 30 + d - 1;

  return SOLAR_EPOCH_JDN +
    cyc * 1029983 +
    yr * 365 + leaps +
    dayOfYear;
}

function jdnToSolar(jdn: number): DateParts {
  function isLeap(y: number): boolean {
    return ((y * 8) + 29) % 33 < 8;
  }

  let n = jdn - SOLAR_EPOCH_JDN;

  // 2820-year grand cycle
  const cyc = Math.floor(n / 1029983);
  n -= cyc * 1029983;

  // Year within cycle
  let year = cyc * 2820 + 1;
  // Binary search or linear: find year in cycle
  let lo = 1, hi = 2820, yr = 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    // Days from start of cycle to start of year mid (0-based)
    let d0 = (mid - 1) * 365;
    for (let i = 1; i < mid; i++) { if (isLeap(i)) d0++; }
    if (d0 > n) { hi = mid - 1; }
    else { yr = mid; lo = mid + 1; }
  }
  let dOrd0 = (yr - 1) * 365;
  for (let i = 1; i < yr; i++) { if (isLeap(i)) dOrd0++; }
  year = cyc * 2820 + yr;
  let dayOfYear = n - dOrd0; // 0-based

  // Month
  let month: number;
  if (dayOfYear < 186) {
    month = Math.floor(dayOfYear / 31) + 1;
    dayOfYear -= (month - 1) * 31;
  } else {
    dayOfYear -= 186;
    month = Math.floor(dayOfYear / 30) + 7;
    dayOfYear -= (month - 7) * 30;
  }

  return { year, month, day: dayOfYear + 1 };
}

// ── Month lengths ─────────────────────────────────────────────────────────────

export function isSolarLeap(year: number): boolean {
  return ((year * 8) + 29) % 33 < 8;
}

function solarMonthLength(month: number, year: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isSolarLeap(year) ? 30 : 29;
}

export function gregorianMonthLength(month: number, year: number): number {
  const lengths = [31,28,31,30,31,30,31,31,30,31,30,31];
  if (month === 2 && isGregorianLeap(year)) return 29;
  return lengths[month - 1];
}

export function isGregorianLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateDate(calendar: CalendarType, parts: DateParts): ValidationError | null {
  const { year, month, day } = parts;

  if (!Number.isInteger(year) || year < 1)
    return { field: "year", message: `Year must be a positive integer.` };

  if (!Number.isInteger(month) || month < 1 || month > 12)
    return { field: "month", message: `Month must be between 1 and 12.` };

  if (!Number.isInteger(day) || day < 1)
    return { field: "day", message: `Day must be a positive integer.` };

  if (calendar === "gregorian") {
    const max = gregorianMonthLength(month, year);
    if (day > max)
      return { field: "day", message: `${year}-${month} has only ${max} days.` };
    if (year < 1900 || year > 2100)
      return { field: "year", message: `Gregorian year must be between 1900 and 2100.` };
  }

  if (calendar === "hijri") {
    const max = hijriMonthLength(month, year);
    if (day > max)
      return { field: "day", message: `Hijri ${year}/${month} has only ${max} days.` };
  }

  if (calendar === "solar") {
    const max = solarMonthLength(month, year);
    if (day > max)
      return { field: "day", message: `Solar Hijri ${year}/${month} has only ${max} days.` };
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function convert(calendar: CalendarType, parts: DateParts): ConversionResult {
  let jdn: number;
  switch (calendar) {
    case "gregorian": jdn = gregorianToJDN(parts.year, parts.month, parts.day); break;
    case "hijri":     jdn = hijriToJDN(parts.year, parts.month, parts.day);     break;
    case "solar":     jdn = solarToJDN(parts.year, parts.month, parts.day);     break;
  }
  return {
    gregorian: jdnToGregorian(jdn),
    hijri:     jdnToHijri(jdn),
    solar:     jdnToSolar(jdn),
  };
}

/**
 * Returns today's date as Gregorian DateParts without using Date.toLocaleDateString
 * to avoid timezone drift. Uses UTC date components only.
 */
export function todayGregorian(): DateParts {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
}

// ── Month name tables ─────────────────────────────────────────────────────────

export const GREGORIAN_MONTHS_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
export const GREGORIAN_MONTHS_UR = [
  "جنوری","فروری","مارچ","اپریل","مئی","جون",
  "جولائی","اگست","ستمبر","اکتوبر","نومبر","دسمبر",
];
export const HIJRI_MONTHS_EN = [
  "Muharram","Safar","Rabi al-Awwal","Rabi al-Thani",
  "Jumada al-Awwal","Jumada al-Thani","Rajab","Sha'ban",
  "Ramadan","Shawwal","Dhu al-Qadah","Dhu al-Hijjah",
];
export const HIJRI_MONTHS_UR = [
  "محرم","صفر","ربیع الاول","ربیع الثانی",
  "جمادی الاول","جمادی الثانی","رجب","شعبان",
  "رمضان","شوال","ذوالقعدہ","ذوالحجہ",
];
export const SOLAR_MONTHS_EN = [
  "Farvardin","Ordibehesht","Khordad","Tir",
  "Mordad","Shahrivar","Mehr","Aban",
  "Azar","Dey","Bahman","Esfand",
];
export const SOLAR_MONTHS_UR = [
  "فروردین","اردی بہشت","خرداد","تیر",
  "مرداد","شہریور","مہر","آبان",
  "آذر","دی","بہمن","اسفند",
];

export function monthName(calendar: CalendarType, month: number, lang: "en" | "ur"): string {
  const idx = month - 1;
  if (calendar === "gregorian") return lang === "ur" ? GREGORIAN_MONTHS_UR[idx] : GREGORIAN_MONTHS_EN[idx];
  if (calendar === "hijri")     return lang === "ur" ? HIJRI_MONTHS_UR[idx]     : HIJRI_MONTHS_EN[idx];
  return lang === "ur" ? SOLAR_MONTHS_UR[idx] : SOLAR_MONTHS_EN[idx];
}

export function formatDate(p: DateParts, calendar: CalendarType, lang: "en" | "ur"): string {
  const m = monthName(calendar, p.month, lang);
  const suffix = calendar === "hijri" ? (lang === "ur" ? " ھ" : " AH") :
                 calendar === "solar" ? (lang === "ur" ? " ش" : " SH") : "";
  return `${p.day} ${m} ${p.year}${suffix}`;
}

export function isoDate(p: DateParts): string {
  return `${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`;
}
