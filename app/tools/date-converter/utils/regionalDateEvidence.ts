/**
 * Qalam Works Date Converter — Regional Hijri Date Evidence
 *
 * Stores documented published/historical Hijri calendar references for specific
 * countries and date ranges. Does NOT modify the deterministic base calculation
 * from dateEngine.ts.
 *
 * Architecture rules:
 *  - Each record has an explicit coverage window (coverageStart..coverageEnd).
 *  - Saudi Arabia: single documentary anchor. Coverage is MINIMUM — only the
 *    two days needed to confirm the benchmark (days 3 and 4 of Ramadan 1368).
 *  - Pakistan/India/Iran: secondary calendar references that publish the full
 *    Ramadan month. Coverage is the full month (days 1–29).
 *  - Adjacent days are derived from the anchor only within the declared window.
 *  - Never extrapolate across months or years.
 *  - Missing evidence → null. Never invent a result.
 *  - Base engine result is always the deterministic calculated result.
 *    Regional references are supplementary context only.
 */

export type EvidenceSourceType =
  | "primary-historical"            // official/archival record, newspaper, government announcement
  | "secondary-calendar-reference"; // published calendar table or calendar conversion tool

export type EvidenceConfidence = "high" | "medium";

export interface HijriDate {
  year:  number;
  month: number; // 1-based
  day:   number;
}

export interface GregorianDate {
  year:  number;
  month: number;
  day:   number;
}

/** A single documented evidence record for one country. */
export interface RegionalEvidenceRecord {
  /** Matches id in countryCalendars.ts */
  countryId: string;
  /** The documented Hijri anchor date. */
  hijriAnchor: HijriDate;
  /** The documented Gregorian date corresponding to that anchor. */
  gregorianAnchor: GregorianDate;
  /**
   * Explicit Hijri coverage window.
   * Adjacent days may ONLY be derived within [coverageStart..coverageEnd].
   * For primary-historical anchors: keep this MINIMUM (just the days needed).
   * For secondary calendar references: may span a full published month.
   */
  coverageStart: HijriDate;
  coverageEnd:   HijriDate;
  sourceType:   EvidenceSourceType;
  confidence:   EvidenceConfidence;
  /** Short source label, EN and UR. */
  sourceLabel:  { en: string; ur: string };
  /** Concise explanatory note shown to the user, EN and UR. */
  explanation:  { en: string; ur: string };
  /** Auditable source URL (external published resource). */
  sourceUrl: string;
  /** Optional stable internal identifier for this evidence record. */
  evidenceId?: string;
}

// ── Evidence records ─────────────────────────────────────────────────────────
//
// Benchmark under review: 4 Ramadan 1368 AH
//   Qalam Works engine (Friday-epoch civil tabular): 29 June 1949
//
// Note on an additional separate historical source (not assigned to any country):
//   A separate historical regional source gives 4 Ramadan 1368 = 1 July 1949.
//   This documents that historical variation can reach +2 days from the engine
//   result. It is NOT assigned to Pakistan, India, Iran, Afghanistan, or
//   Tajikistan — no auditable country-specific source supports this date for
//   those countries.

export const REGIONAL_EVIDENCE: RegionalEvidenceRecord[] = [

  // ── Saudi Arabia — PRIMARY-HISTORICAL, HIGH confidence ────────────────────
  //
  // Documentary evidence confirms:
  //   3 Ramadan 1368 = 28 June 1949
  //   → 4 Ramadan 1368 = 29 June 1949  (matches engine result)
  //
  // Coverage: MINIMUM — only days 3 and 4 of Ramadan 1368.
  // We have a single documentary anchor for day 3; day 4 follows by sequential
  // day derivation within the same source. No broader month coverage is claimed.
  {
    countryId:        "sa",
    hijriAnchor:      { year: 1368, month: 9, day: 3 },
    gregorianAnchor:  { year: 1949, month: 6, day: 28 },
    coverageStart:    { year: 1368, month: 9, day: 3 },
    coverageEnd:      { year: 1368, month: 9, day: 4 },
    sourceType:  "primary-historical",
    confidence:  "high",
    sourceLabel: {
      en: "Historical Aramco document — 3 Ramadan 1368 = 28 June 1949",
      ur: "تاریخی آرامکو دستاویز — 3 رمضان 1368 = 28 جون 1949",
    },
    explanation: {
      en: "Documentary evidence places 3 Ramadan 1368 on 28 June 1949, giving 4 Ramadan as 29 June 1949. This matches the calculated result. Coverage limited to days 3–4 only.",
      ur: "دستاویزی شواہد کے مطابق 3 رمضان 1368 = 28 جون 1949، اس لیے 4 رمضان = 29 جون 1949۔ یہ حسابی نتیجے سے مطابقت رکھتا ہے۔ صرف 3 اور 4 رمضان کی کوریج۔",
    },
    sourceUrl:  "https://www.supremecourt.gov/DocketPDF/21/21-1335/220246/20220404173934982_Aramco%20Appendix%20EFILE%20Apr%2004%2022%20at%2003%2053%20PM%20EST.pdf",
    evidenceId: "sa-1368-ramadan-aramco",
  },

  // ── Pakistan — SECONDARY CALENDAR REFERENCE, MEDIUM confidence ────────────
  //
  // A published country-calendar reference records:
  //   1 Ramadan 1368 = 27 June 1949
  //   → 4 Ramadan 1368 = 30 June 1949  (+1 day from engine)
  //
  // Coverage: full Ramadan 1368 month (days 1–29). A calendar reference
  // that gives the first day implicitly provides the full month calendar.
  {
    countryId:        "pk",
    hijriAnchor:      { year: 1368, month: 9, day: 1 },
    gregorianAnchor:  { year: 1949, month: 6, day: 27 },
    coverageStart:    { year: 1368, month: 9, day: 1 },
    coverageEnd:      { year: 1368, month: 9, day: 29 },
    sourceType:  "secondary-calendar-reference",
    confidence:  "medium",
    sourceLabel: {
      en: "IslamicCal — Pakistan Gregorian/Islamic Calendar 1949",
      ur: "اسلامک کیل — پاکستان عیسوی/اسلامی کیلنڈر 1949",
    },
    explanation: {
      en: "A country-calendar reference places 1 Ramadan 1368 on 27 June 1949, giving 4 Ramadan as 30 June 1949 — 1 day later than the calculated result. This is a secondary reference, not an official moon-sighting record.",
      ur: "ایک ملکی کیلنڈر حوالے کے مطابق 1 رمضان 1368 = 27 جون 1949، اس لیے 4 رمضان = 30 جون 1949 — حسابی نتیجے سے ایک دن بعد۔ یہ ثانوی حوالہ ہے، سرکاری رویتِ ہلال ریکارڈ نہیں۔",
    },
    sourceUrl:  "https://www.islamiccal.com/en/gregorian-calendar/pakistan/1949/",
    evidenceId: "pk-1368-ramadan-islamiccal",
  },

  // ── India — SECONDARY CALENDAR REFERENCE, MEDIUM confidence ──────────────
  //
  // Same published month start as Pakistan:
  //   1 Ramadan 1368 = 27 June 1949
  //   → 4 Ramadan 1368 = 30 June 1949
  {
    countryId:        "in",
    hijriAnchor:      { year: 1368, month: 9, day: 1 },
    gregorianAnchor:  { year: 1949, month: 6, day: 27 },
    coverageStart:    { year: 1368, month: 9, day: 1 },
    coverageEnd:      { year: 1368, month: 9, day: 29 },
    sourceType:  "secondary-calendar-reference",
    confidence:  "medium",
    sourceLabel: {
      en: "Date Converter — India Hijri Calendar 1368",
      ur: "ڈیٹ کنورٹر — بھارت ہجری کیلنڈر 1368",
    },
    explanation: {
      en: "A country-calendar reference places 1 Ramadan 1368 on 27 June 1949, giving 4 Ramadan as 30 June 1949 — 1 day later than the calculated result. This is a secondary reference, not an official moon-sighting record.",
      ur: "ایک ملکی کیلنڈر حوالے کے مطابق 1 رمضان 1368 = 27 جون 1949، اس لیے 4 رمضان = 30 جون 1949 — حسابی نتیجے سے ایک دن بعد۔ یہ ثانوی حوالہ ہے، سرکاری رویتِ ہلال ریکارڈ نہیں۔",
    },
    sourceUrl:  "https://www.date-converter.com/en/hijri-calendar/india/1368/",
    evidenceId: "in-1368-ramadan-date-converter",
  },

  // ── Iran — SECONDARY CALENDAR REFERENCE, MEDIUM confidence ───────────────
  //
  //   1 Ramadan 1368 = 27 June 1949
  //   → 4 Ramadan 1368 = 30 June 1949
  {
    countryId:        "ir",
    hijriAnchor:      { year: 1368, month: 9, day: 1 },
    gregorianAnchor:  { year: 1949, month: 6, day: 27 },
    coverageStart:    { year: 1368, month: 9, day: 1 },
    coverageEnd:      { year: 1368, month: 9, day: 29 },
    sourceType:  "secondary-calendar-reference",
    confidence:  "medium",
    sourceLabel: {
      en: "IslamicCal — Iran Gregorian/Islamic Calendar 1949",
      ur: "اسلامک کیل — ایران عیسوی/اسلامی کیلنڈر 1949",
    },
    explanation: {
      en: "A country-calendar reference places 1 Ramadan 1368 on 27 June 1949, giving 4 Ramadan as 30 June 1949 — 1 day later than the calculated result. This is a secondary reference, not an official moon-sighting record.",
      ur: "ایک ملکی کیلنڈر حوالے کے مطابق 1 رمضان 1368 = 27 جون 1949، اس لیے 4 رمضان = 30 جون 1949 — حسابی نتیجے سے ایک دن بعد۔ یہ ثانوی حوالہ ہے، سرکاری رویتِ ہلال ریکارڈ نہیں۔",
    },
    sourceUrl:  "https://www.islamiccal.com/pdf/gregorian/en-iran-1949.pdf",
    evidenceId: "ir-1368-ramadan-islamiccal",
  },

  // Afghanistan (af) and Tajikistan (tj): no evidence record.
  // Do not infer or extrapolate without a documented, auditable source.
];

// ── Pure arithmetic helpers (no Date objects — no timezone drift) ─────────────

/** Gregorian → Julian Day Number. Meeus §7 formula, same as dateEngine.ts. */
function gregorianToJDN(year: number, month: number, day: number): number {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524;
}

/** Julian Day Number → Gregorian. Meeus §7 inverse, same as dateEngine.ts. */
function jdnToGregorian(jdn: number): GregorianDate {
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

/**
 * Add `days` (positive or negative) to a Gregorian date.
 * Pure JDN arithmetic — no Date objects, no timezone dependence.
 */
function addDaysToGregorian(base: GregorianDate, days: number): GregorianDate {
  return jdnToGregorian(gregorianToJDN(base.year, base.month, base.day) + days);
}

/** Offset from anchor to target (days). Returns null if not same year+month. */
function hijriDayOffset(anchor: HijriDate, target: HijriDate): number | null {
  if (anchor.year !== target.year || anchor.month !== target.month) return null;
  return target.day - anchor.day;
}

/** True when `date` falls within [start, end] (inclusive, same year+month). */
function inCoverage(date: HijriDate, start: HijriDate, end: HijriDate): boolean {
  if (date.year !== start.year || date.month !== start.month) return false;
  return date.day >= start.day && date.day <= end.day;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface RegionalReference {
  gregorianDate: GregorianDate;
  confidence:    EvidenceConfidence;
  sourceType:    EvidenceSourceType;
  sourceLabel:   { en: string; ur: string };
  explanation:   { en: string; ur: string };
  sourceUrl:     string;
}

// ── Public resolver ───────────────────────────────────────────────────────────

/**
 * Return a documented regional Gregorian reference for the given country and
 * Hijri date, or null when no verified evidence covers that date.
 *
 * This result is supplementary context only.
 * It does NOT replace the deterministic result from dateEngine.ts.
 */
export function resolveRegionalHijriReference(
  countryId: string,
  hijriDate: HijriDate
): RegionalReference | null {

  const matches = REGIONAL_EVIDENCE.filter(
    r =>
      r.countryId === countryId &&
      inCoverage(hijriDate, r.coverageStart, r.coverageEnd)
  );

  if (matches.length === 0) return null;

  // Prefer higher-confidence records; stable sort keeps declaration order as tie-breaker.
  const best = matches.slice().sort(
    (a, b) => (a.confidence === "high" && b.confidence !== "high" ? -1 : 0)
  )[0];

  const offset = hijriDayOffset(best.hijriAnchor, hijriDate);
  if (offset === null) return null; // belt-and-suspenders cross-month guard

  return {
    gregorianDate: addDaysToGregorian(best.gregorianAnchor, offset),
    confidence:    best.confidence,
    sourceType:    best.sourceType,
    sourceLabel:   best.sourceLabel,
    explanation:   best.explanation,
    sourceUrl:     best.sourceUrl,
  };
}
