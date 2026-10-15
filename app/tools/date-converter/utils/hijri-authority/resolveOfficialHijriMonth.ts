import { gregorianToJDN, jdnToGregorian, type DateParts } from "../dateEngine";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "./pakistanOfficialAnchors";
import { resolvePakistanOfficialHijriDate } from "./resolveOfficialHijriDate";

/** Explicitly reviewed days only. Never fabricate an unverified day 30. */
export interface ReviewedPakistanHijriMonth {
  days: Array<{ hijriDay: number; gregorian: DateParts }>;
  complete: boolean;
  sourceUrl: string;
}

export function getReviewedPakistanHijriMonth(year: number, month: number): ReviewedPakistanHijriMonth | null {
  const anchors = PAKISTAN_OFFICIAL_HIJRI_ANCHORS.filter(anchor =>
    anchor.hijriYear === year && anchor.hijriMonth === month &&
    ((anchor.authority === "official" && anchor.verificationStatus === "verified") ||
      (anchor.authority === "reported-official" && anchor.verificationStatus === "reported")),
  );
  if (anchors.length !== 1) return null;
  const anchor = anchors[0];
  const start = gregorianToJDN(anchor.officialDayOneGregorian.year, anchor.officialDayOneGregorian.month, anchor.officialDayOneGregorian.day);
  const end = gregorianToJDN(anchor.coverageEndGregorian.year, anchor.coverageEndGregorian.month, anchor.coverageEndGregorian.day);
  const count = end - start + 1;
  if (count < 1 || count > 30) return null;

  const days = Array.from({ length: count }, (_, i) => ({ hijriDay: i + 1, gregorian: jdnToGregorian(start + i) }));
  if (!days.every(day => resolvePakistanOfficialHijriDate(day.gregorian)?.anchorId === anchor.id)) return null;

  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const confirmedNextStart = PAKISTAN_OFFICIAL_HIJRI_ANCHORS.some(next =>
    next.hijriYear === nextMonth.year && next.hijriMonth === nextMonth.month &&
    gregorianToJDN(next.officialDayOneGregorian.year, next.officialDayOneGregorian.month, next.officialDayOneGregorian.day) === end + 1 &&
    ((next.authority === "official" && next.verificationStatus === "verified") ||
      (next.authority === "reported-official" && next.verificationStatus === "reported")),
  );
  return { days, complete: count === 30 || (count === 29 && confirmedNextStart), sourceUrl: anchor.sourceUrl };
}
