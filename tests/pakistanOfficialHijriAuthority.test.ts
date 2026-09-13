import { describe, expect, it } from "vitest";
import { resolvePakistanOfficialHijriDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import type { OfficialHijriMonthAnchor } from "../app/tools/date-converter/utils/hijri-authority/types";

const anchor = (overrides: Partial<OfficialHijriMonthAnchor> = {}): OfficialHijriMonthAnchor => ({
  id: "pk-1446-ramadan", jurisdiction: "PK", hijriYear: 1446, hijriMonth: 9,
  officialDayOneGregorian: { year: 2025, month: 3, day: 1 }, coverageEndGregorian: { year: 2025, month: 3, day: 30 },
  authority: "official", evidenceKind: "official-declaration", verificationStatus: "verified", sightingDecision: "sighted",
  providerId: "pk-ruet-e-hilal", providerLabel: { en: "Central Ruet-e-Hilal Committee", ur: "مرکزی رویتِ ہلال کمیٹی" }, sourceUrl: "https://example.invalid/anchor", sourceReference: "Test anchor", provenance: {}, ...overrides,
});

describe("Pakistan official Hijri authority resolver", () => {
  it("resolves anchor day 1 and bounded derived days", () => {
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [anchor()])?.hijri).toEqual({ year: 1446, month: 9, day: 1 });
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 29 }, [anchor()])?.hijri.day).toBe(29);
  });

  it("resolves day 30 only with explicit coverage and never resolves day 31", () => {
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 30 }, [anchor()])?.hijri.day).toBe(30);
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 31 }, [anchor({ coverageEndGregorian: { year: 2025, month: 3, day: 31 } })])).toBeNull();
  });

  it("returns null with no anchor or invalid evidence", () => {
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [])).toBeNull();
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [anchor({ verificationStatus: "retracted" })])).toBeNull();
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [anchor({ verificationStatus: "superseded" })])).toBeNull();
  });

  it("requires verification status to match anchor authority", () => {
    const official = anchor({ id: "official", authority: "official", verificationStatus: "verified" });
    const reported = anchor({ id: "reported", authority: "reported-official", evidenceKind: "government-news-report", verificationStatus: "reported" });
    const invalidReportedOfficial = anchor({ id: "invalid-reported-official", authority: "official", verificationStatus: "reported" });
    const invalidPendingOfficial = anchor({ id: "invalid-pending-official", authority: "official", verificationStatus: "pending-verification" as never });

    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [official])?.anchorId).toBe("official");
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [reported])?.anchorId).toBe("reported");
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [invalidReportedOfficial])).toBeNull();
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [invalidPendingOfficial])).toBeNull();
  });

  it("does not let an invalid official record outrank a valid reported-official record", () => {
    const reported = anchor({ id: "reported", authority: "reported-official", evidenceKind: "government-news-report", verificationStatus: "reported" });
    const invalidOfficial = anchor({ id: "invalid-official", authority: "official", verificationStatus: "reported" });

    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [invalidOfficial, reported])?.anchorId).toBe("reported");
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [reported, invalidOfficial])?.anchorId).toBe("reported");
  });

  it("prefers a later valid anchor and preserves reported-official authority", () => {
    const later = anchor({ id: "pk-1446-shawwal", hijriMonth: 10, officialDayOneGregorian: { year: 2025, month: 3, day: 20 }, coverageEndGregorian: { year: 2025, month: 4, day: 18 }, authority: "reported-official", evidenceKind: "government-news-report", verificationStatus: "reported", providerId: "app", providerLabel: { en: "Associated Press of Pakistan", ur: "ایسوسی ایٹڈ پریس آف پاکستان" } });
    const resolved = resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 20 }, [anchor(), later]);
    expect(resolved).toMatchObject({ hijri: { year: 1446, month: 10, day: 1 }, authority: "reported-official", anchorId: "pk-1446-shawwal" });
  });

  it("does not revive an older anchor after a newer anchor has expired", () => {
    const older = anchor({ coverageEndGregorian: { year: 2025, month: 4, day: 30 } });
    const newer = anchor({ id: "newer", hijriMonth: 10, officialDayOneGregorian: { year: 2025, month: 3, day: 20 }, coverageEndGregorian: { year: 2025, month: 3, day: 25 } });
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 26 }, [older, newer])).toBeNull();
  });

  it("prefers a matching verified official declaration independently of input order", () => {
    const reported = anchor({ id: "reported", authority: "reported-official", evidenceKind: "government-news-report", verificationStatus: "reported" });
    const official = anchor({ id: "official", authority: "official", verificationStatus: "verified" });
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [reported, official])?.anchorId).toBe("official");
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [official, reported])?.anchorId).toBe("official");
  });

  it("rejects conflicting same-start anchors rather than relying on array order", () => {
    const reported = anchor({ id: "reported", authority: "reported-official", evidenceKind: "government-news-report", verificationStatus: "reported", hijriMonth: 10 });
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [anchor(), reported])).toBeNull();
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [reported, anchor()])).toBeNull();
  });

  it("rejects same-precedence conflicts", () => {
    const competing = anchor({ id: "other-official", hijriYear: 1447 });
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [anchor(), competing])).toBeNull();
  });

  it("does not permit scientific or observed authorities to become official anchors", () => {
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [anchor({ authority: "official-scientific" as never })])).toBeNull();
    expect(resolvePakistanOfficialHijriDate({ year: 2025, month: 3, day: 1 }, [anchor({ authority: "observed" as never })])).toBeNull();
  });
});
