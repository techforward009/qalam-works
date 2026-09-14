import { describe, expect, it } from "vitest";
import { resolvePakistanOfficialSightingDecisionForEvening } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialSightingDecision";
import { PAKISTAN_OFFICIAL_HIJRI_ANCHORS } from "../app/tools/date-converter/utils/hijri-authority/pakistanOfficialAnchors";

const rabiAlAwwal = PAKISTAN_OFFICIAL_HIJRI_ANCHORS.find(anchor => anchor.id === "pk-1448-rabi-al-awwal-2026-08-15")!;

describe("historical crescent decision lookup", () => {
  it("uses only the exact reviewed announcement evening", () => {
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 })).toMatchObject({ sightingDecision: "not-sighted", authority: "official", verificationStatus: "verified" });
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 15 })).toBeNull();
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 9, day: 13 })).toBeNull();
  });
  it("keeps the Rabi al-Thani not-sighted decision exact to 12 September", () => {
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 9, day: 12 })).toMatchObject({ sightingDecision: "not-sighted", authority: "official", verificationStatus: "verified" });
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 9, day: 13 })).toBeNull();
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 9, day: 14 })).toBeNull();
  });
  it("excludes invalid and distinguishes reported records", () => {
    const base = rabiAlAwwal;
    const reported = { ...base, id: "reported", authority: "reported-official" as const, verificationStatus: "reported" as const };
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [reported])).toMatchObject({ authority: "reported-official" });
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [{ ...base, verificationStatus: "retracted" }])).toBeNull();
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [{ ...base, verificationStatus: "superseded" }])).toBeNull();
  });
  it("prefers matching verified official evidence independently of input order", () => {
    const official = rabiAlAwwal, reported = { ...official, id: "reported", authority: "reported-official" as const, verificationStatus: "reported" as const };
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [reported, official])?.id).toBe(official.id);
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [official, reported])?.id).toBe(official.id);
  });
  it("rejects conflicting same-evening decisions", () => {
    const official = rabiAlAwwal;
    const reportedConflict = { ...official, id: "reported-conflict", authority: "reported-official" as const, verificationStatus: "reported" as const, sightingDecision: "sighted" as const };
    const officialConflict = { ...official, id: "official-conflict", sightingDecision: "sighted" as const };
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [official, reportedConflict])).toBeNull();
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [official, officialConflict])).toBeNull();
  });
  it("uses lexical IDs for equivalent same-precedence ties independent of array order", () => {
    const base = rabiAlAwwal, z = { ...base, id: "z" }, a = { ...base, id: "a" };
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [z, a])?.id).toBe("a");
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [a, z])?.id).toBe("a");
    const rz = { ...z, authority: "reported-official" as const, verificationStatus: "reported" as const }, ra = { ...a, authority: "reported-official" as const, verificationStatus: "reported" as const };
    expect(resolvePakistanOfficialSightingDecisionForEvening({ year: 2026, month: 8, day: 13 }, [rz, ra])?.id).toBe("a");
  });
});
