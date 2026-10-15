import type { OfficialHijriMonthAnchor } from "./types";

/**
 * Pakistan-specific historical Hijri dates for the full Gregorian year 2021.
 * For dates in the published government's first-of-month table that were later
 * overridden by the Central Ruet-e-Hilal Committee, the final observed
 * Pakistan committee declaration determines the month start (not forecasts).
 * December 2020 is included to cover 1 January 2021; the 6 December 2021
 * next-month start already lives in the 2022 archive.
 */
export const PAKISTAN_2021_HISTORIC_ANCHORS: readonly OfficialHijriMonthAnchor[] = [
  {
    id: "pk-1442-jumada-al-awwal-2020-12-16",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 5,
    officialDayOneGregorian: { year: 2020, month: 12, day: 16 },
    coverageEndGregorian: { year: 2021, month: 1, day: 14 },
    authority: "reported-official",
    evidenceKind: "government-news-report",
    verificationStatus: "reported",
    providerId: "pk-ministry-science-pak-moon-sighting",
    providerLabel: {
      en: "Pakistan Ministry of Science and Technology historic lunar calendar",
      ur: "پاکستانی وزارت سائنس و ٹیکنالوجی کی تاریخی قمری تقویم",
    },
    sourceUrl: "https://pakmoonsighting.pk/DaytoDayCalendar.aspx",
    sourceReference: "Ministry of Science and Technology, Pakistan, archived day-to-day calendar: 1 January 2021 = 17 Jumada al-Awwal 1442, hence 1 Jumada al-Awwal = 16 December 2020.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; official government historical calendar record rather than an independently dated committee announcement; bounded to 30 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1442-jumada-al-thani-2021-01-15",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 6,
    officialDayOneGregorian: { year: 2021, month: 1, day: 15 },
    coverageEndGregorian: { year: 2021, month: 2, day: 13 },
    authority: "reported-official",
    evidenceKind: "government-news-report",
    verificationStatus: "reported",
    providerId: "pk-ministry-science-pak-moon-sighting",
    providerLabel: {
      en: "Pakistan Ministry of Science and Technology historic lunar calendar",
      ur: "پاکستانی وزارت سائنس و ٹیکنالوجی کی تاریخی قمری تقویم",
    },
    sourceUrl: "https://pakmoonsighting.pk/FirstofLunarMonth.aspx",
    sourceReference: "Government of Pakistan, Ministry of Science and Technology, published First of Lunar Month record: 1 Jumada al-Thani 1442 = 15 January 2021.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; official government historical calendar record rather than an independently dated committee announcement; bounded to 30 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1442-rajab-2021-02-14",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 7,
    officialDayOneGregorian: { year: 2021, month: 2, day: 14 },
    coverageEndGregorian: { year: 2021, month: 3, day: 15 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2021, month: 2, day: 12 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.geo.tv/latest/334727-rajab-moon-not-sighted-in-pakistan",
    sourceReference: "Geo News, 12 February 2021: Central Ruet-e-Hilal Committee said Rajab moon was not sighted, announcing 1 Rajab 1442 on Sunday 14 February 2021. Overrides earlier Pakistan science ministry projected 13 February.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 30 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1442-shaban-2021-03-16",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 8,
    officialDayOneGregorian: { year: 2021, month: 3, day: 16 },
    coverageEndGregorian: { year: 2021, month: 4, day: 13 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2021, month: 3, day: 14 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/shahab-crescent-moon-not-sighted-shaban-to-commence-on-tuesday/",
    sourceReference: "APP, 14 March 2021: Central Ruet-e-Hilal Committee declared Sha'ban crescent not sighted; 1 Sha'ban 1442 on Tuesday 16 March 2021.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 29 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1442-ramadan-2021-04-14",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 9,
    officialDayOneGregorian: { year: 2021, month: 4, day: 14 },
    coverageEndGregorian: { year: 2021, month: 5, day: 12 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2021, month: 4, day: 13 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.mora.gov.pk/NewsDetail/MzA5MTJjYzQtZjc0MC00NThiLTk2ZjEtNWRlNDc1ZDRmM2Ez",
    sourceReference: "Pakistan Ministry of Religious Affairs dated 13 April 2021: Central Ruet-e-Hilal Committee declared Ramadan sighted; 1 Ramadan 1442 on Wednesday 14 April 2021.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 29 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1442-shawwal-2021-05-13",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 10,
    officialDayOneGregorian: { year: 2021, month: 5, day: 13 },
    coverageEndGregorian: { year: 2021, month: 6, day: 11 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2021, month: 5, day: 12 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.app.com.pk/national/shawwal-crescent-moon-sighted-in-country-eid-on-thursday/",
    sourceReference: "APP, 12 May 2021: Central Ruet-e-Hilal Committee sighted Shawwal crescent; 1 Shawwal 1442 and Eid-ul-Fitr on Thursday 13 May 2021. This later decision replaces projected 14 May from the science ministry calendar.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 30 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1442-dhu-al-qadah-2021-06-12",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 11,
    officialDayOneGregorian: { year: 2021, month: 6, day: 12 },
    coverageEndGregorian: { year: 2021, month: 7, day: 11 },
    authority: "reported-official",
    evidenceKind: "government-news-report",
    verificationStatus: "reported",
    providerId: "pk-ministry-science-pak-moon-sighting",
    providerLabel: {
      en: "Pakistan Ministry of Science and Technology historic lunar calendar",
      ur: "پاکستانی وزارت سائنس و ٹیکنالوجی کی تاریخی قمری تقویم",
    },
    sourceUrl: "https://pakmoonsighting.pk/FirstofLunarMonth.aspx",
    sourceReference: "Ministry of Science and Technology, Government of Pakistan, published First of Lunar Month record: 1 Dhu al-Qadah 1442 = Saturday 12 June 2021. The Pakistan Government Press Information Department records Ruet-e-Hilal sittings for 10 June 2021.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; official government historical calendar record rather than an independently dated committee announcement; bounded to 30 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1442-dhu-al-hijjah-2021-07-12",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 12,
    officialDayOneGregorian: { year: 2021, month: 7, day: 12 },
    coverageEndGregorian: { year: 2021, month: 8, day: 9 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2021, month: 7, day: 10 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.radio.gov.pk/10-07-2021/eid-ul-adha-to-be-celebrated-on-21st-july",
    sourceReference: "Radio Pakistan, 10 July 2021: Central Ruet-e-Hilal Committee announced Dhu al-Hijjah crescent not sighted, 1 Dhu al-Hijjah 1442 on 12 July 2021; Eid ul Adha on 21 July 2021.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 29 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1443-muharram-2021-08-10",
    jurisdiction: "PK",
    hijriYear: 1443,
    hijriMonth: 1,
    officialDayOneGregorian: { year: 2021, month: 8, day: 10 },
    coverageEndGregorian: { year: 2021, month: 9, day: 8 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2021, month: 8, day: 9 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.radio.gov.pk/09-08-2021/muharram-moon-sighted-ashura-to-be-observed-on-august-19",
    sourceReference: "Radio Pakistan, 9 August 2021: Muharram crescent sighted in Pakistan, 1 Muharram 1443 on Tuesday 10 August 2021; Ashura 19 August.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 30 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1443-safar-2021-09-09",
    jurisdiction: "PK",
    hijriYear: 1443,
    hijriMonth: 2,
    officialDayOneGregorian: { year: 2021, month: 9, day: 9 },
    coverageEndGregorian: { year: 2021, month: 10, day: 7 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2021, month: 9, day: 7 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.brecorder.com/news/40118727/first-safar-tomorrow",
    sourceReference: "Business Recorder, 8 September 2021: Central Ruet-e-Hilal Committee did not sight Safar crescent on 7 September; 1 Safar 1443 on Thursday 9 September 2021.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 29 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1443-rabi-al-awwal-2021-10-08",
    jurisdiction: "PK",
    hijriYear: 1443,
    hijriMonth: 3,
    officialDayOneGregorian: { year: 2021, month: 10, day: 8 },
    coverageEndGregorian: { year: 2021, month: 11, day: 6 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2021, month: 10, day: 7 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.brecorder.com/news/40125180/rabi-ul-awwal-moon-sighted-eid-i-milad-un-nabi-to-be-celebrated-on-october-19",
    sourceReference: "Business Recorder, 7 October 2021: Central Ruet-e-Hilal Committee announced Rabi al-Awwal crescent sighted; 1 Rabi al-Awwal 1443 = 8 October 2021, with 12 Rabi al-Awwal on 19 October.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 30 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  },
  {
    id: "pk-1443-rabi-al-thani-2021-11-07",
    jurisdiction: "PK",
    hijriYear: 1443,
    hijriMonth: 4,
    officialDayOneGregorian: { year: 2021, month: 11, day: 7 },
    coverageEndGregorian: { year: 2021, month: 12, day: 5 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2021, month: 11, day: 5 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://dunyanews.tv/en/Pakistan/627282-Rabi-us-Sani-moon-not-sighted",
    sourceReference: "Dunya News, 5 November 2021: Central Ruet-e-Hilal Committee declared Rabi al-Thani moon not sighted; 1 Rabi al-Thani 1443 on Sunday 7 November 2021.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Pakistan-specific historic date; committee lunar announcement; bounded to 29 days by the next documented month start. Later official crescent decisions take priority over advance table projections."
    },
  }
];
