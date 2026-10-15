import type { OfficialHijriMonthAnchor } from "./types";

/**
 * Historic Pakistan lunar calendar covering every Gregorian day of leap-year 2020.
 * Final Pakistani crescent committee decisions are preferred. A minority of
 * month starts supported by a local retrospective calendar (not an independent
 * committee announcement) are kept explicitly marked as reported history.
 * Initial 28 December 2019 anchor covers 1 January 2020. The following
 * 17 December 2020 start is in the corrected 2021 archive.
 */
export const PAKISTAN_2020_HISTORIC_ANCHORS: readonly OfficialHijriMonthAnchor[] = [
  {
    id: "pk-1441-jumada-al-awwal-2019-12-28",
    jurisdiction: "PK",
    hijriYear: 1441,
    hijriMonth: 5,
    officialDayOneGregorian: { year: 2019, month: 12, day: 28 },
    coverageEndGregorian: { year: 2020, month: 1, day: 26 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2019, month: 12, day: 27 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.suchtv.pk/urdu/pakistan/general/item/78120-moon-sight.html",
    sourceReference: "Such TV Urdu, 27 Dec 2019: Pakistan Central Ruet-e-Hilal Committee sighted Jumada al-Awwal moon; 1 Jumada al-Awwal 1441 on Saturday 28 December 2019.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 30 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1441-jumada-al-thani-2020-01-27",
    jurisdiction: "PK",
    hijriYear: 1441,
    hijriMonth: 6,
    officialDayOneGregorian: { year: 2020, month: 1, day: 27 },
    coverageEndGregorian: { year: 2020, month: 2, day: 25 },
    authority: "reported-official",
    evidenceKind: "government-news-report",
    verificationStatus: "reported",
    // Pakistan-specific historical calendar entry. No separate committee announcement is asserted.
    providerId: "pk-published-historic-calendar",
    providerLabel: {
      en: "Pakistan historical lunar calendar record",
      ur: "پاکستان کا تاریخی قمری ریکارڈ",
    },
    sourceUrl: "https://islamiccalendar.pk/2020-ce/january/",
    sourceReference: "IslamicCalendar.pk Pakistan historical January 2020 table: Monday 27 January 2020 = 1 Jumada al-Thani 1441; corroborated by Pakistan dated commercial documents for 27 January 2020.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Retrospective Pakistani date-calendar source, retained with source-status distinction; first-day to next published boundary is 30 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1441-rajab-2020-02-26",
    jurisdiction: "PK",
    hijriYear: 1441,
    hijriMonth: 7,
    officialDayOneGregorian: { year: 2020, month: 2, day: 26 },
    coverageEndGregorian: { year: 2020, month: 3, day: 25 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2020, month: 2, day: 24 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://arynews.tv/rajab-moon-sight-ruet-e-hilal-committee-mufti-muneeb",
    sourceReference: "ARY News, 24 February 2020: Pakistan Central Ruet-e-Hilal Committee announced Rajab crescent not sighted; 1 Rajab 1441 Wednesday 26 February.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 29 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1441-shaban-2020-03-26",
    jurisdiction: "PK",
    hijriYear: 1441,
    hijriMonth: 8,
    officialDayOneGregorian: { year: 2020, month: 3, day: 26 },
    coverageEndGregorian: { year: 2020, month: 4, day: 24 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2020, month: 3, day: 25 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.dawnnews.tv/news/1123646/",
    sourceReference: "Dawn Urdu, 25 March 2020: committee announced Sha'ban crescent sighted; 1 Sha'ban 1441 Thursday 26 March 2020.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 30 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1441-ramadan-2020-04-25",
    jurisdiction: "PK",
    hijriYear: 1441,
    hijriMonth: 9,
    officialDayOneGregorian: { year: 2020, month: 4, day: 25 },
    coverageEndGregorian: { year: 2020, month: 5, day: 23 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2020, month: 4, day: 23 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.brecorder.com/news/591815/moon-not-sighted-first-ramazan-on-april-25",
    sourceReference: "Business Recorder, 23 April 2020: committee announced Ramadan crescent not sighted; 1 Ramadan 1441 Saturday 25 April.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 29 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1441-shawwal-2020-05-24",
    jurisdiction: "PK",
    hijriYear: 1441,
    hijriMonth: 10,
    officialDayOneGregorian: { year: 2020, month: 5, day: 24 },
    coverageEndGregorian: { year: 2020, month: 6, day: 22 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2020, month: 5, day: 23 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.dawn.com/news/1559159/ruet-i-hilal-committee-meeting-underway-for-eid-moon-sighting",
    sourceReference: "Dawn, 23 May 2020: Pakistan Central Ruet-e-Hilal Committee confirmed Shawwal crescent and announced Eid-ul-Fitr Sunday 24 May 2020; overrides an older calendar's 25 May entry.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 30 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1441-dhu-al-qadah-2020-06-23",
    jurisdiction: "PK",
    hijriYear: 1441,
    hijriMonth: 11,
    officialDayOneGregorian: { year: 2020, month: 6, day: 23 },
    coverageEndGregorian: { year: 2020, month: 7, day: 22 },
    authority: "reported-official",
    evidenceKind: "government-news-report",
    verificationStatus: "reported",
    // Pakistan-specific historical calendar entry. No separate committee announcement is asserted.
    providerId: "pk-published-historic-calendar",
    providerLabel: {
      en: "Pakistan historical lunar calendar record",
      ur: "پاکستان کا تاریخی قمری ریکارڈ",
    },
    sourceUrl: "https://islamiccalendar.pk/2020-ce/june/",
    sourceReference: "IslamicCalendar.pk Pakistan historical June 2020 calendar: Tuesday 23 June 2020 = 1 Dhu al-Qadah 1441; exact original committee declaration not linked here.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Retrospective Pakistani date-calendar source, retained with source-status distinction; first-day to next published boundary is 30 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1441-dhu-al-hijjah-2020-07-23",
    jurisdiction: "PK",
    hijriYear: 1441,
    hijriMonth: 12,
    officialDayOneGregorian: { year: 2020, month: 7, day: 23 },
    coverageEndGregorian: { year: 2020, month: 8, day: 20 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2020, month: 7, day: 21 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.dawn.com/news/1570338/zilhaj-moon-not-sighted-eidul-azha-to-be-celebrated-on-aug-1",
    sourceReference: "Dawn, 21 July 2020: Pakistan Ministry of Religious Affairs notification: no Dhu al-Hijjah crescent sighted; 1 Dhu al-Hijjah Thursday 23 July 2020 and Eid Saturday 1 August.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 29 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1442-muharram-2020-08-21",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 1,
    officialDayOneGregorian: { year: 2020, month: 8, day: 21 },
    coverageEndGregorian: { year: 2020, month: 9, day: 18 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2020, month: 8, day: 20 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.geo.tv/latest/303719-muharram-moon-sighted-ashura-to-be-observed-on-august-30",
    sourceReference: "Geo News, 20 August 2020: Central Ruet-e-Hilal Committee confirmed Muharram crescent; 1 Muharram 1442 Friday 21 August, Ashura 30 August 2020.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 29 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1442-safar-2020-09-19",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 2,
    officialDayOneGregorian: { year: 2020, month: 9, day: 19 },
    coverageEndGregorian: { year: 2020, month: 10, day: 18 },
    authority: "reported-official",
    evidenceKind: "government-news-report",
    verificationStatus: "reported",
    // Pakistan-specific historical calendar entry. No separate committee announcement is asserted.
    providerId: "pk-published-historic-calendar",
    providerLabel: {
      en: "Pakistan historical lunar calendar record",
      ur: "پاکستان کا تاریخی قمری ریکارڈ",
    },
    sourceUrl: "https://islamiccalendar.pk/2020-ce/",
    sourceReference: "IslamicCalendar.pk Pakistan 2020 year table: Saturday 19 September 2020 = 1 Safar 1442; tied to the observed Pakistan 1 Muharram 21 August and 1 Rabi al-Awwal 19 October. Original committee declaration for Safar is not claimed.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Retrospective Pakistani date-calendar source, retained with source-status distinction; first-day to next published boundary is 30 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1442-rabi-al-awwal-2020-10-19",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 3,
    officialDayOneGregorian: { year: 2020, month: 10, day: 19 },
    coverageEndGregorian: { year: 2020, month: 11, day: 16 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "not-sighted",
    announcementGregorianDate: { year: 2020, month: 10, day: 17 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.geo.tv/amp/313746-rabiul-awwal-moon-not-sighted-eid-i-miladun-nabi-on-oct-30",
    sourceReference: "Geo News, 17 October 2020: committee declared Rabi al-Awwal moon not sighted; 1 Rabi al-Awwal Monday 19 October 2020; 12 Rabi al-Awwal Friday 30 October.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 29 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  },
  {
    id: "pk-1442-rabi-al-thani-2020-11-17",
    jurisdiction: "PK",
    hijriYear: 1442,
    hijriMonth: 4,
    officialDayOneGregorian: { year: 2020, month: 11, day: 17 },
    coverageEndGregorian: { year: 2020, month: 12, day: 16 },
    authority: "official",
    evidenceKind: "official-declaration",
    verificationStatus: "verified",
    sightingDecision: "sighted",
    announcementGregorianDate: { year: 2020, month: 11, day: 16 },
    providerId: "pk-central-ruet-e-hilal-committee",
    providerLabel: {
      en: "Pakistan Central Ruet-e-Hilal Committee",
      ur: "پاکستان مرکزی رؤیتِ ہلال کمیٹی",
    },
    sourceUrl: "https://www.express.pk/story/2105879/1",
    sourceReference: "Express Urdu, 16 November 2020: Pakistan Central Ruet-e-Hilal Committee sighted Rabi al-Thani crescent; 1 Rabi al-Thani 1442 Tuesday 17 November.",
    provenance: {
      verifiedAt: "2026-10-15",
      notes: "Dated Pakistan crescent-committee announcement; first-day to next published boundary is 30 days. Pakistan final announcements override advance or generic international tabular estimates."
    },
  }
];
