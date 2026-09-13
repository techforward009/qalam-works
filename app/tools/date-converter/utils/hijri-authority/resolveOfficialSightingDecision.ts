import type { DateParts } from "../dateEngine";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "./pakistanOfficialAnchors";
import type { OfficialHijriMonthAnchor } from "./types";

const sameDate = (a: DateParts | undefined, b: DateParts) => !!a && a.year === b.year && a.month === b.month && a.day === b.day;
const eligible = (anchor: OfficialHijriMonthAnchor) => anchor.jurisdiction === "PK" && !!anchor.sightingDecision && (
  (anchor.authority === "official" && anchor.verificationStatus === "verified") ||
  (anchor.authority === "reported-official" && anchor.verificationStatus === "reported")
);

/** Exact reviewed announcement evidence only; this never derives a decision from calendar coverage or astronomy. */
export function resolvePakistanOfficialSightingDecisionForEvening(
  gregorian: DateParts,
  anchors: readonly OfficialHijriMonthAnchor[] = PAKISTAN_OFFICIAL_HIJRI_ANCHORS,
): OfficialHijriMonthAnchor | null {
  const matches = anchors.filter(eligible).filter(anchor => sameDate(anchor.announcementGregorianDate, gregorian));
  if (matches.length === 0) return null;
  if (new Set(matches.map(anchor => anchor.sightingDecision)).size !== 1) return null;
  const precedence = (anchor: OfficialHijriMonthAnchor) => anchor.authority === "official" ? 0 : 1;
  return matches.slice().sort((a, b) => precedence(a) - precedence(b) || a.id.localeCompare(b.id))[0] ?? null;
}
