import type { OfficialHijriMonthAnchor } from "./types";

/**
 * Reviewed Pakistan official/reported-official month anchors belong here.
 * Records are explicitly bounded; no historical official date is inferred.
 */
export const PAKISTAN_OFFICIAL_HIJRI_ANCHORS: readonly OfficialHijriMonthAnchor[] = [
  {
    id: "pk-1448-rabi-al-awwal-2026-08-15",
    jurisdiction: "PK",
    hijriYear: 1448,
    hijriMonth: 3,
    officialDayOneGregorian: { year: 2026, month: 8, day: 15 },
    coverageEndGregorian: { year: 2026, month: 9, day: 13 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2026, month: 8, day: 13 },
    providerId: "pk-ministry-religious-affairs-central-ruet-e-hilal",
    providerLabel: {
      en: "Pakistan Ministry of Religious Affairs / Central Ruet-e-Hilal Committee",
      ur: "وزارتِ مذہبی امور پاکستان / مرکزی رویتِ ہلال کمیٹی",
    },
    // APP reports the Ministry notification; no direct Ministry URL is stored.
    sourceUrl: "https://www.app.com.pk/national/rabi-ul-awal-moon-not-sighted-eid-milad-un-nabi-to-fall-on-aug-26/",
    sourceReference: "APP report of the Ministry of Religious Affairs notification: 1 Rabi-ul-Awwal 1448 AH began Saturday, 15 August 2026.",
    provenance: {
      verifiedAt: "2026-08-13",
      notes: "Central Ruet-e-Hilal Committee decision and Ministry notification corroborated by APP and Radio Pakistan (https://www.radio.gov.pk/13-08-2026/moon-not-sighted-first-of-rabi-ul-awwal-on-saturday).",
    },
  },
];
