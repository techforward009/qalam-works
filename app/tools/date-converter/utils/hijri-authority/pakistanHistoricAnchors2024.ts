import type { OfficialHijriMonthAnchor } from "./types";

/**
 * Pakistan's historical crescent declarations spanning all Gregorian 2024.
 * The first record begins December 2023 to provide January 2024 continuity.
 * The existing 4 December 2024 anchor in the 2025 archive supplies the last
 * month boundary, avoiding duplicate or fabricated month starts.
 */
export const PAKISTAN_2024_HISTORIC_ANCHORS: readonly OfficialHijriMonthAnchor[] = [
  {
    id: "pk-1445-jumada-al-thani-2023-12-15",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 6,
    officialDayOneGregorian: { year: 2023, month: 12, day: 15 },
    coverageEndGregorian: { year: 2024, month: 1, day: 12 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2023, month: 12, day: 14 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.radio.gov.pk/14-12-2023/jumadi-us-sani-moon-sighted",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2023-12-14 reports 1445/6 beginning 2023-12-15. Following month starts 2024-01-13, confirming 29 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1445-rajab-2024-01-13",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 7,
    officialDayOneGregorian: { year: 2024, month: 1, day: 13 },
    coverageEndGregorian: { year: 2024, month: 2, day: 11 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2024, month: 1, day: 12 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/rajab-al-murajab-to-start-on-saturday-as-crescent-sighted/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-01-12 reports 1445/7 beginning 2024-01-13. Following month starts 2024-02-12, confirming 30 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1445-shaban-2024-02-12",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 8,
    officialDayOneGregorian: { year: 2024, month: 2, day: 12 },
    coverageEndGregorian: { year: 2024, month: 3, day: 11 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2024, month: 2, day: 10 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.urdupoint.com/en/pakistan/first-shaban-on-monday-shab-e-barat-on-night-1794330.html",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-02-10 reports 1445/8 beginning 2024-02-12. Following month starts 2024-03-12, confirming 29 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1445-ramadan-2024-03-12",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 9,
    officialDayOneGregorian: { year: 2024, month: 3, day: 12 },
    coverageEndGregorian: { year: 2024, month: 4, day: 9 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2024, month: 3, day: 11 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/domestic/moon-sighted-first-ramazan-to-begin-from-tuesday/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-03-11 reports 1445/9 beginning 2024-03-12. Following month starts 2024-04-10, confirming 29 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1445-shawwal-2024-04-10",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 10,
    officialDayOneGregorian: { year: 2024, month: 4, day: 10 },
    coverageEndGregorian: { year: 2024, month: 5, day: 9 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2024, month: 4, day: 9 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/shawwal-moon-sighted-eid-on-wednesday/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-04-09 reports 1445/10 beginning 2024-04-10. Following month starts 2024-05-10, confirming 30 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1445-dhu-al-qadah-2024-05-10",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 11,
    officialDayOneGregorian: { year: 2024, month: 5, day: 10 },
    coverageEndGregorian: { year: 2024, month: 6, day: 7 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2024, month: 5, day: 8 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/ministry-confirms-moon-unseen-ziquad-to-commence-may-10/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-05-08 reports 1445/11 beginning 2024-05-10. Following month starts 2024-06-08, confirming 29 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1445-dhu-al-hijjah-2024-06-08",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 12,
    officialDayOneGregorian: { year: 2024, month: 6, day: 8 },
    coverageEndGregorian: { year: 2024, month: 7, day: 7 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2024, month: 6, day: 7 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/domestic/dhul-hijjah-crescent-sighted-eid-ul-adha-to-be-celebrated-on-june-17/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-06-07 reports 1445/12 beginning 2024-06-08. Following month starts 2024-07-08, confirming 30 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1446-muharram-2024-07-08",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 1,
    officialDayOneGregorian: { year: 2024, month: 7, day: 8 },
    coverageEndGregorian: { year: 2024, month: 8, day: 6 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2024, month: 7, day: 6 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/crescent-not-sighted-first-muharram-on-monday/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-07-06 reports 1446/1 beginning 2024-07-08. Following month starts 2024-08-07, confirming 30 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1446-safar-2024-08-07",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 2,
    officialDayOneGregorian: { year: 2024, month: 8, day: 7 },
    coverageEndGregorian: { year: 2024, month: 9, day: 5 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2024, month: 8, day: 5 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/crescent-not-sighted-safar-to-commence-from-wednesday/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-08-05 reports 1446/2 beginning 2024-08-07. Following month starts 2024-09-06, confirming 30 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1446-rabi-al-awwal-2024-09-06",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 3,
    officialDayOneGregorian: { year: 2024, month: 9, day: 6 },
    coverageEndGregorian: { year: 2024, month: 10, day: 4 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2024, month: 9, day: 4 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/rabi-ul-awwal-moon-not-sighted-eid-milad-un-nabi-on-sept-17/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-09-04 reports 1446/3 beginning 2024-09-06. Following month starts 2024-10-05, confirming 29 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1446-rabi-al-thani-2024-10-05",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 4,
    officialDayOneGregorian: { year: 2024, month: 10, day: 5 },
    coverageEndGregorian: { year: 2024, month: 11, day: 3 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2024, month: 10, day: 4 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/rabi-us-sani-moon-sighted/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-10-04 reports 1446/4 beginning 2024-10-05. Following month starts 2024-11-04, confirming 30 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  },
  {
    id: "pk-1446-jumada-al-awwal-2024-11-04",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 5,
    officialDayOneGregorian: { year: 2024, month: 11, day: 4 },
    coverageEndGregorian: { year: 2024, month: 12, day: 3 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2024, month: 11, day: 2 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.radio.gov.pk/02-11-2024/cresent-of-jamadi-ul-awwal-1446-ah-not-sighted",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee; public record dated 2024-11-02 reports 1446/5 beginning 2024-11-04. Following month starts 2024-12-04, confirming 30 days.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Calendar uses the announced Pakistani month start, bounded by the next publicly reported month start. Primary announcement source or reputable report is linked above."
    },
  }
];
