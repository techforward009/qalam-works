import type { DateParts } from "../dateEngine";

export type HijriDateAuthority = "official" | "reported-official" | "official-scientific" | "observed" | "qalam-tabular";
export type OfficialAnchorAuthority = Extract<HijriDateAuthority, "official" | "reported-official">;
export type OfficialAnchorEvidenceKind = "official-declaration" | "government-news-report";
export type VerificationStatus = "verified" | "reported" | "superseded" | "retracted";

export interface OfficialHijriMonthAnchor {
  id: string;
  jurisdiction: "PK";
  hijriYear: number;
  hijriMonth: number;
  officialDayOneGregorian: DateParts;
  /** Explicitly bounded; anchors never imply an unlimited calendar. */
  coverageEndGregorian: DateParts;
  authority: OfficialAnchorAuthority;
  evidenceKind: OfficialAnchorEvidenceKind;
  verificationStatus: VerificationStatus;
  sightingDecision?: "sighted" | "not-sighted";
  announcementAt?: string;
  announcementGregorianDate?: DateParts;
  providerId: string;
  providerLabel: { en: string; ur: string };
  sourceUrl: string;
  sourceReference: string;
  provenance: { collectedAt?: string; verifiedAt?: string; verifiedBy?: string; notes?: string };
}

export interface ResolvedHijriDate {
  hijri: DateParts;
  authority: OfficialAnchorAuthority;
  anchorId: string;
  providerId: string;
  providerLabel: { en: string; ur: string };
  sourceUrl: string;
  sourceReference: string;
  verificationStatus: VerificationStatus;
}
