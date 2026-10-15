import type { OfficialHijriMonthAnchor } from "./types";

/**
 * Pakistan's historic lunar announcements covering calendar 2023.
 * Includes December 2022 first-day to cover 1 January 2023.
 * The 15 December 2023 start is stored in the following 2024 archive.
 * Every recorded month has a reported Pakistani announcement and 29/30 days.
 */
export const PAKISTAN_2023_HISTORIC_ANCHORS: readonly OfficialHijriMonthAnchor[] = [
  {
    id: "pk-1444-jumada-al-thani-2022-12-25",
    jurisdiction: "PK",
    hijriYear: 1444,
    hijriMonth: 6,
    officialDayOneGregorian: { year: 2022, month: 12, day: 25 },
    coverageEndGregorian: { year: 2023, month: 1, day: 23 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2022, month: 12, day: 24 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://pni.net.pk/en/pakistan-news/jamad-us-sani-crescent-sighted/",
    sourceReference: "APP report republished by PNI, 24 Dec 2022; Ministry of Religious Affairs announced first Jumada al-Thani 1444 on Sunday 25 December 2022.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 30-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1444-rajab-2023-01-24",
    jurisdiction: "PK",
    hijriYear: 1444,
    hijriMonth: 7,
    officialDayOneGregorian: { year: 2023, month: 1, day: 24 },
    coverageEndGregorian: { year: 2023, month: 2, day: 21 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2023, month: 1, day: 22 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/rajab-moon-not-sighted-azad/",
    sourceReference: "APP, 22 Jan 2023; Central Ruet-e-Hilal Committee announced Rajab not sighted, 1 Rajab 1444 on 24 January 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 29-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1444-shaban-2023-02-22",
    jurisdiction: "PK",
    hijriYear: 1444,
    hijriMonth: 8,
    officialDayOneGregorian: { year: 2023, month: 2, day: 22 },
    coverageEndGregorian: { year: 2023, month: 3, day: 22 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2023, month: 2, day: 21 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.thenews.com.pk/latest/1042859-when-is-shab-e",
    sourceReference: "The News, 21 Feb 2023; Central Ruet-e-Hilal Committee announced Sha'ban moon sighted, 1 Sha'ban 1444 on 22 February 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 29-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1444-ramadan-2023-03-23",
    jurisdiction: "PK",
    hijriYear: 1444,
    hijriMonth: 9,
    officialDayOneGregorian: { year: 2023, month: 3, day: 23 },
    coverageEndGregorian: { year: 2023, month: 4, day: 21 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2023, month: 3, day: 22 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.brecorder.com/news/40232902",
    sourceReference: "Business Recorder, 22 Mar 2023; Central Ruet-e-Hilal Committee announced Ramadan crescent sighted, 1 Ramadan 1444 on 23 March 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 30-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1444-shawwal-2023-04-22",
    jurisdiction: "PK",
    hijriYear: 1444,
    hijriMonth: 10,
    officialDayOneGregorian: { year: 2023, month: 4, day: 22 },
    coverageEndGregorian: { year: 2023, month: 5, day: 21 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2023, month: 4, day: 20 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/shawwal-crescent-not-sighted-eid-ul-fitr-on-saturday/",
    sourceReference: "APP, 20 Apr 2023; Central Ruet-e-Hilal Committee announced Shawwal not sighted, 1 Shawwal 1444 on 22 April 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 30-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1444-dhu-al-qadah-2023-05-22",
    jurisdiction: "PK",
    hijriYear: 1444,
    hijriMonth: 11,
    officialDayOneGregorian: { year: 2023, month: 5, day: 22 },
    coverageEndGregorian: { year: 2023, month: 6, day: 19 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2023, month: 5, day: 20 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://mmnews.tv/moon-not-sighted-in-pakistan-first-zilqad-to-fall-on-may-22/",
    sourceReference: "MM News, 20 May 2023; Central Ruet-e-Hilal Committee announced Zulqad moon not sighted, 1 Dhu al-Qadah 1444 on 22 May 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 29-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1444-dhu-al-hijjah-2023-06-20",
    jurisdiction: "PK",
    hijriYear: 1444,
    hijriMonth: 12,
    officialDayOneGregorian: { year: 2023, month: 6, day: 20 },
    coverageEndGregorian: { year: 2023, month: 7, day: 19 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2023, month: 6, day: 19 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/domestic/zil-hajj-moon-sighted-eid-ul-azha-on-june-29/",
    sourceReference: "APP, 19 Jun 2023; Central Ruet-e-Hilal Committee sighted Dhul Hijjah crescent, 1 Dhu al-Hijjah 1444 on 20 June 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 30-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1445-muharram-2023-07-20",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 1,
    officialDayOneGregorian: { year: 2023, month: 7, day: 20 },
    coverageEndGregorian: { year: 2023, month: 8, day: 18 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2023, month: 7, day: 18 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/domestic/first-muharram-ul-harram-to-fall-on-july-20-ashura-on-july-29/",
    sourceReference: "APP, 18 Jul 2023; Central Ruet-e-Hilal Committee announced Muharram not sighted, 1 Muharram 1445 on 20 July 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 30-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1445-safar-2023-08-19",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 2,
    officialDayOneGregorian: { year: 2023, month: 8, day: 19 },
    coverageEndGregorian: { year: 2023, month: 9, day: 17 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2023, month: 8, day: 17 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.urdupoint.com/en/pakistan/safar-moon-not-sighted-ruet-body-1739608.html",
    sourceReference: "APP syndicated via UrduPoint, 17 Aug 2023; Ministry of Religious Affairs declared Safar crescent not sighted; 1 Safar 1445 on 19 August 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 30-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1445-rabi-al-awwal-2023-09-18",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 3,
    officialDayOneGregorian: { year: 2023, month: 9, day: 18 },
    coverageEndGregorian: { year: 2023, month: 10, day: 16 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2023, month: 9, day: 16 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.radio.gov.pk/16-09-2023/moon-not-sighted-12th-rabi-ul-awwal-to-be-observed-on-29-sept",
    sourceReference: "Radio Pakistan, 16 Sep 2023; Central Ruet-e-Hilal Committee announced Rabi al-Awwal crescent not sighted; 1 Rabi al-Awwal 1445 on 18 September 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 29-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1445-rabi-al-thani-2023-10-17",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 4,
    officialDayOneGregorian: { year: 2023, month: 10, day: 17 },
    coverageEndGregorian: { year: 2023, month: 11, day: 15 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2023, month: 10, day: 16 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/rabi-us-sani-moon-sighted-1st-rabi-us-sani-on-tuesday/",
    sourceReference: "APP, 16 Oct 2023; Central Ruet-e-Hilal Committee announced Rabi al-Thani crescent sighted, 1 Rabi al-Thani 1445 on 17 October 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 30-day duration. Historical sighting supersedes predictive lunar tables."
    }
  },
  {
    id: "pk-1445-jumada-al-awwal-2023-11-16",
    jurisdiction: "PK",
    hijriYear: 1445,
    hijriMonth: 5,
    officialDayOneGregorian: { year: 2023, month: 11, day: 16 },
    coverageEndGregorian: { year: 2023, month: 12, day: 14 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2023, month: 11, day: 14 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: { en: "Pakistan Central Ruet-e-Hilal Committee", ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی" },
    sourceUrl: "https://www.app.com.pk/national/jamadi-ul-awal-moon-not-sighted/",
    sourceReference: "APP, 14 Nov 2023; Central Ruet-e-Hilal Committee announced Jumada al-Awwal not sighted, 1 Jumada al-Awwal 1445 on 16 November 2023.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "The Pakistani announcement fixes the lunar first date; the next announced month start confirms this month's 29-day duration. Historical sighting supersedes predictive lunar tables."
    }
  }
];
