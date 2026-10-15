import type { OfficialHijriMonthAnchor } from "./types";
/**
 * Pakistan's reported historic crescent announcements: full civil year 2025.
 * Each 29/30-day end boundary is supported by the next reviewed month start.
 * Dates represent the Gregorian daytime of Hijri day 1, not the prior sunset.
 */
export const PAKISTAN_2025_HISTORIC_ANCHORS: readonly OfficialHijriMonthAnchor[] = [
  {
    id: "pk-1446-jumada-al-thani-2024-12-04",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 6,
    officialDayOneGregorian: { year: 2024, month: 12, day: 4 },
    coverageEndGregorian: { year: 2025, month: 1, day: 1 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2024, month: 12, day: 2 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/moon-of-jamadi-us-sani-not-sighted-first-day-to-begin-on-wednesday/",
    sourceReference: "APP, 2 December 2024: ministry announced 1 Jumada al-Thani 1446 on Wednesday 4 December 2024, followed by official 1 Rajab on 2 January 2025.",
    provenance: { verifiedAt: "2026-10-15", notes: "The subsequent verified Rajab start confirms the 29-day month and covers New Year's Day 2025." }
  },

  {
    id: "pk-1446-rajab-2025-01-02",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 7,
    officialDayOneGregorian: { year: 2025, month: 1, day: 2 },
    coverageEndGregorian: { year: 2025, month: 1, day: 30 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2025, month: 1, day: 1 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.radio.gov.pk/01-01-2025/moon-of-rajab-sighted-rajab-ul-murrajab-begins-tomorrow",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-01-01; 1 rajab 1446 AH: 2025-01-02. Historical month length 29 days, bounded by the following reviewed 1st of the next lunar month (2025-01-31).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1446-shaban-2025-01-31",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 8,
    officialDayOneGregorian: { year: 2025, month: 1, day: 31 },
    coverageEndGregorian: { year: 2025, month: 3, day: 1 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2025, month: 1, day: 30 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://radio.gov.pk/30-01-2025/shaban-moon-sighted-islamic-month-begins-tomorrow",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-01-30; 1 shaban 1446 AH: 2025-01-31. Historical month length 30 days, bounded by the following reviewed 1st of the next lunar month (2025-03-02).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1446-ramadan-2025-03-02",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 9,
    officialDayOneGregorian: { year: 2025, month: 3, day: 2 },
    coverageEndGregorian: { year: 2025, month: 3, day: 30 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2025, month: 2, day: 28 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/moon-not-sighted-ramadan-to-begin-on-march-2/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-02-28; 1 ramadan 1446 AH: 2025-03-02. Historical month length 29 days, bounded by the following reviewed 1st of the next lunar month (2025-03-31).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1446-shawwal-2025-03-31",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 10,
    officialDayOneGregorian: { year: 2025, month: 3, day: 31 },
    coverageEndGregorian: { year: 2025, month: 4, day: 28 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2025, month: 3, day: 30 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.radio.gov.pk/30-03-2025/shawwal-moon-sighted-eid-to-be-celebrated-tomorrow",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-03-30; 1 shawwal 1446 AH: 2025-03-31. Historical month length 29 days, bounded by the following reviewed 1st of the next lunar month (2025-04-29).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1446-dhu-al-qadah-2025-04-29",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 11,
    officialDayOneGregorian: { year: 2025, month: 4, day: 29 },
    coverageEndGregorian: { year: 2025, month: 5, day: 28 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2025, month: 4, day: 28 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/zul-qadah-moon-sighted-maulana-azad/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-04-28; 1 dhu-al-qadah 1446 AH: 2025-04-29. Historical month length 30 days, bounded by the following reviewed 1st of the next lunar month (2025-05-29).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1446-dhu-al-hijjah-2025-05-29",
    jurisdiction: "PK",
    hijriYear: 1446,
    hijriMonth: 12,
    officialDayOneGregorian: { year: 2025, month: 5, day: 29 },
    coverageEndGregorian: { year: 2025, month: 6, day: 26 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2025, month: 5, day: 27 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.dawn.com/news/1913794/eidul-azha-on-june-7",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-05-27; 1 dhu-al-hijjah 1446 AH: 2025-05-29. Historical month length 29 days, bounded by the following reviewed 1st of the next lunar month (2025-06-27).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1447-muharram-2025-06-27",
    jurisdiction: "PK",
    hijriYear: 1447,
    hijriMonth: 1,
    officialDayOneGregorian: { year: 2025, month: 6, day: 27 },
    coverageEndGregorian: { year: 2025, month: 7, day: 26 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2025, month: 6, day: 26 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://radio.gov.pk/26-06-2025/muharram-ul-haram-moon-sighted-in-country-tomorrow-will-be-1st-of-muharram-1447-hijri",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-06-26; 1 muharram 1447 AH: 2025-06-27. Historical month length 30 days, bounded by the following reviewed 1st of the next lunar month (2025-07-27).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1447-safar-2025-07-27",
    jurisdiction: "PK",
    hijriYear: 1447,
    hijriMonth: 2,
    officialDayOneGregorian: { year: 2025, month: 7, day: 27 },
    coverageEndGregorian: { year: 2025, month: 8, day: 25 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2025, month: 7, day: 25 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/safar-moon-not-sighted-islamic-month-to-begin-on-sunday-mora/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-07-25; 1 safar 1447 AH: 2025-07-27. Historical month length 30 days, bounded by the following reviewed 1st of the next lunar month (2025-08-26).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1447-rabi-al-awwal-2025-08-26",
    jurisdiction: "PK",
    hijriYear: 1447,
    hijriMonth: 3,
    officialDayOneGregorian: { year: 2025, month: 8, day: 26 },
    coverageEndGregorian: { year: 2025, month: 9, day: 24 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2025, month: 8, day: 24 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.radio.gov.pk/24-08-2025/eid-milad-un-nabi-saww-to-be-celebrated-on-6th-sept",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-08-24; 1 rabi-al-awwal 1447 AH: 2025-08-26. Historical month length 30 days, bounded by the following reviewed 1st of the next lunar month (2025-09-25).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1447-rabi-al-thani-2025-09-25",
    jurisdiction: "PK",
    hijriYear: 1447,
    hijriMonth: 4,
    officialDayOneGregorian: { year: 2025, month: 9, day: 25 },
    coverageEndGregorian: { year: 2025, month: 10, day: 23 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2025, month: 9, day: 23 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/rabi-us-sani-to-begin-thursday-as-new-crescent-moon-not-sighted/",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-09-23; 1 rabi-al-thani 1447 AH: 2025-09-25. Historical month length 29 days, bounded by the following reviewed 1st of the next lunar month (2025-10-24).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1447-jumada-al-awwal-2025-10-24",
    jurisdiction: "PK",
    hijriYear: 1447,
    hijriMonth: 5,
    officialDayOneGregorian: { year: 2025, month: 10, day: 24 },
    coverageEndGregorian: { year: 2025, month: 11, day: 22 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2025, month: 10, day: 23 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.radio.gov.pk/23-10-2025/jumada-al-awwal-moon-sighted",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-10-23; 1 jumada-al-awwal 1447 AH: 2025-10-24. Historical month length 30 days, bounded by the following reviewed 1st of the next lunar month (2025-11-23).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  },
  {
    id: "pk-1447-jumada-al-thani-2025-11-23",
    jurisdiction: "PK",
    hijriYear: 1447,
    hijriMonth: 6,
    officialDayOneGregorian: { year: 2025, month: 11, day: 23 },
    coverageEndGregorian: { year: 2025, month: 12, day: 21 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2025, month: 11, day: 21 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.radio.gov.pk/21-11-2025/jumada-al-thani-moon-not-sighted-1st-of-jumada-al-thani-to-fall-on-sunday",
    sourceReference: "Pakistan Central Ruet-e-Hilal Committee lunar month announcement, 2025-11-21; 1 jumada-al-thani 1447 AH: 2025-11-23. Historical month length 29 days, bounded by the following reviewed 1st of the next lunar month (2025-12-22).",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Public archival report of the Pakistani official lunar announcement; month-end bounded exclusively by the next reviewed official month start, not by a tabular estimate."
    }
  }
];
