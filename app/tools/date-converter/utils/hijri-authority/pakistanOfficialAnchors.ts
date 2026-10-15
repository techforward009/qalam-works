import type { OfficialHijriMonthAnchor } from "./types";

/**
 * Reviewed Pakistan official/reported-official month anchors belong here.
 * Records are explicitly bounded; no historical official date is inferred.
 */
export const PAKISTAN_OFFICIAL_HIJRI_ANCHORS: readonly OfficialHijriMonthAnchor[] = [
  {
    id: "pk-1447-ramadan-2026-02-19",
    jurisdiction: "PK",
    hijriYear: 1447,
    hijriMonth: 9,
    officialDayOneGregorian: { year: 2026, month: 2, day: 19 },
    // The reviewed Shawwal decision confirms that Ramadan completed 30 days.
    coverageEndGregorian: { year: 2026, month: 3, day: 20 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2026, month: 2, day: 18 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رویتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.radio.gov.pk/18-02-2026/moon-sighted-first-ramadan-on-thursday",
    sourceReference: "Radio Pakistan, 18 February 2026: Central Ruet-e-Hilal Committee announced the Ramadan moon sighted; 1 Ramadan 1447 AH on Thursday, 19 February 2026. Completion of 30 days confirmed by the 19 March Shawwal decision.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Corroborated by APP (https://www.app.com.pk/national/ramazan-moon-sighted-ist-fast-on-february-19-in-pakistan-khabeer-azad/) and the Shawwal decision reported by Radio Pakistan (https://www.radio.gov.pk/19-03-2026/shawwal-moon-not-sighted-eid-ul-fitr-on-saturday).",
    },
  },
  {
    id: "pk-1447-shawwal-2026-03-21",
    jurisdiction: "PK",
    hijriYear: 1447,
    hijriMonth: 10,
    officialDayOneGregorian: { year: 2026, month: 3, day: 21 },
    // Bounded to 29 days; do not infer day 30 without next-month evidence.
    coverageEndGregorian: { year: 2026, month: 4, day: 18 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2026, month: 3, day: 19 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رویتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.radio.gov.pk/19-03-2026/shawwal-moon-not-sighted-eid-ul-fitr-on-saturday",
    sourceReference: "Radio Pakistan, 19 March 2026: Shawwal crescent was not sighted; Eid al-Fitr and 1 Shawwal 1447 AH fell on Saturday, 21 March 2026.",
    provenance: { verifiedAt: "2026-10-15", notes: "Corroborated by APP (https://www.app.com.pk/national/eid-ul-fitr-on-saturday-as-shawwal-moon-not-sighted/)." },
  },
  {
    id: "pk-1448-jumada-al-awwal-2026-10-13",
    jurisdiction: "PK",
    hijriYear: 1448,
    hijriMonth: 5,
    officialDayOneGregorian: { year: 2026, month: 10, day: 13 },
    // Only the first 29 days are covered until the next monthly sighting is confirmed.
    coverageEndGregorian: { year: 2026, month: 11, day: 10 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2026, month: 10, day: 12 },
    providerId: "pk-ministry-religious-affairs-central-ruet-e-hilal",
    providerLabel: {
      en: "Pakistan Ministry of Religious Affairs / Central Ruet-e-Hilal Committee",
      ur: "وزارتِ مذہبی امور پاکستان / مرکزی رویتِ ہلال کمیٹی",
    },
    // APP reports the official Ministry notification; do not invent a Ministry URL.
    sourceUrl: "https://www.app.com.pk/national/jamadi-ul-awwal-moon-sighted-in-pakistan-first-day-to-fall-on-october-13/",
    sourceReference: "APP, 12 October 2026: Ministry notification confirms Jamadi-ul-Awwal crescent sighted and 1 Jumada al-Awwal 1448 AH on Tuesday, 13 October 2026.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "APP reports the 12 October Central Ruet-e-Hilal Committee decision and Ministry notification; corroborated by Daily Pakistan (https://en.dailypakistan.com.pk/12-Oct-2026/jumadi-ul-awwal-1448-ah-moon-sighted-in-pakistan-first-day-on-oct-13).",
    },
  },
  {
    id: "pk-1448-rabi-al-thani-2026-09-14",
    jurisdiction: "PK",
    hijriYear: 1448,
    hijriMonth: 4,
    officialDayOneGregorian: { year: 2026, month: 9, day: 14 },
    // Day 30 is not inferred: this verified anchor is authoritative through day 29 only.
    coverageEndGregorian: { year: 2026, month: 10, day: 12 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2026, month: 9, day: 12 },
    providerId: "pk-ministry-religious-affairs-central-ruet-e-hilal",
    providerLabel: {
      en: "Pakistan Ministry of Religious Affairs / Central Ruet-e-Hilal Committee",
      ur: "وزارتِ مذہبی امور پاکستان / مرکزی رویتِ ہلال کمیٹی",
    },
    // Hum News reproduces the Ministry's official social announcement; no Ministry URL is fabricated.
    sourceUrl: "https://humnews.pk/latest/613649/",
    sourceReference: "Hum News report of the Ministry of Religious Affairs notification: 1 Rabi al-Thani 1448 AH began Monday, 14 September 2026.",
    provenance: {
      verifiedAt: "2026-09-12",
      notes: "Central Ruet-e-Hilal Committee decision and Ministry notification corroborated by Aaj News (https://www.aaj.tv/news/amp/30517000).",
    },
  },
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
