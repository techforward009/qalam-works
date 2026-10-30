export type CrescentDisplayLanguage = "ur" | "en";

/** A reference-site count is not the statistical probability of a sighting. */
export function getReferenceSiteConditionWording(
  favorable: number, total: number, lang: CrescentDisplayLanguage,
): string {
  if (favorable <= 0 || total <= 0)
    return lang === "ur" ? "کسی مقام پر حالات موافق نہیں" : "Conditions are unfavorable at all sites";
  if (favorable >= total)
    return lang === "ur" ? "تمام مقامات پر حالات موافق ہیں" : "Conditions are favorable at all sites";
  return lang === "ur" ? "بعض مقامات پر حالات موافق ہیں" : "Conditions are favorable at some sites";
}

/** Display Western digits in Urdu (with the established exception for صفر). */
export function formatReferenceSiteCount(
  favorable: number, total: number, lang: CrescentDisplayLanguage,
): string {
  if (lang === "en") return `${favorable}/${total} locations`;
  if (favorable === 0) return "صفر مقامات";
  return `${favorable} از ${total} مقامات`;
}

/** Return a displayed month-card evening only if selection is exactly its following day. */
export function getFollowingCardEvening(
  selectedIso: string, visibleCardDates: readonly string[],
): string | null {
  const utcDay = (iso: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [year, month, day] = iso.split("-").map(Number);
    const ms = Date.UTC(year, month - 1, day);
    return new Date(ms).toISOString().slice(0, 10) === iso ? ms : null;
  };
  const selected = utcDay(selectedIso);
  if (selected === null) return null;
  return visibleCardDates.find(card => {
    const observed = utcDay(card);
    return observed !== null && selected - observed === 86_400_000;
  }) ?? null;
}
