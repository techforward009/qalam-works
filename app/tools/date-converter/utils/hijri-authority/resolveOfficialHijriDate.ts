import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "./pakistanOfficialAnchors";
import type { OfficialHijriMonthAnchor, ResolvedHijriDate } from "./types";
import type { DateParts } from "../dateEngine";

const jdn = ({ year, month, day }: DateParts): number => {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + (2 - a + Math.floor(a / 4)) - 1524;
};

function eligible(anchor: OfficialHijriMonthAnchor): boolean {
  const hasAlignedVerification =
    (anchor.authority === "official" && anchor.verificationStatus === "verified")
    || (anchor.authority === "reported-official" && anchor.verificationStatus === "reported");

  return anchor.jurisdiction === "PK"
    && hasAlignedVerification
    && jdn(anchor.coverageEndGregorian) >= jdn(anchor.officialDayOneGregorian);
}

function priority(anchor: OfficialHijriMonthAnchor): number {
  if (anchor.authority === "official" && anchor.verificationStatus === "verified") return 0;
  if (anchor.authority === "reported-official") return 1;
  return 2;
}

/** Pure, bounded resolver; it never calls dateEngine or external providers. */
export function resolvePakistanOfficialHijriDate(
  gregorian: DateParts,
  anchors: readonly OfficialHijriMonthAnchor[] = PAKISTAN_OFFICIAL_HIJRI_ANCHORS,
): ResolvedHijriDate | null {
  const requested = jdn(gregorian);
  const candidates = anchors.filter(eligible).filter(item => jdn(item.officialDayOneGregorian) <= requested);
  const latestStart = Math.max(...candidates.map(item => jdn(item.officialDayOneGregorian)));
  if (!Number.isFinite(latestStart)) return null;
  const latest = candidates.filter(item => jdn(item.officialDayOneGregorian) === latestStart);
  const semanticKey = (item: OfficialHijriMonthAnchor) => `${item.hijriYear}/${item.hijriMonth}/${jdn(item.officialDayOneGregorian)}`;
  if (new Set(latest.map(semanticKey)).size !== 1) return null;
  // A verified official declaration wins only when same-start records agree.
  const anchor = latest.slice().sort((a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id))[0];
  if (!anchor) return null;
  if (requested > jdn(anchor.coverageEndGregorian)) return null;
  const day = requested - jdn(anchor.officialDayOneGregorian) + 1;
  if (day < 1 || day > 30) return null;
  return {
    hijri: { year: anchor.hijriYear, month: anchor.hijriMonth, day }, authority: anchor.authority,
    anchorId: anchor.id, providerId: anchor.providerId, providerLabel: anchor.providerLabel,
    sourceUrl: anchor.sourceUrl, sourceReference: anchor.sourceReference, verificationStatus: anchor.verificationStatus,
  };
}
