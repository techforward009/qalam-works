import { describe, expect, test } from "vitest";
import { hadithVerificationCoverage } from "../app/tools/khateeb-studio/engine/topicDossier";

describe("Khateeb hadith verification coverage audit", () => {
  test("reports verification state per prepared dossier", () => {
    const coverage = hadithVerificationCoverage();
    const byTopic = new Map(coverage.map((row) => [row.topicId, row]));

    expect(byTopic.get("sabr")).toMatchObject({
      total: 5,
      verified: 5,
      pending: 0,
      untracked: 0,
    });
    expect(byTopic.get("dua")).toMatchObject({
      total: 5,
      verified: 4,
      pending: 1,
      untracked: 0,
    });
    expect(byTopic.get("imamate")).toMatchObject({
      total: 5,
      verified: 5,
      pending: 0,
      untracked: 0,
    });
    expect(byTopic.get("ismah")).toMatchObject({
      total: 5,
      verified: 5,
      pending: 0,
      untracked: 0,
    });
    expect(byTopic.get("parents-barsi")).toMatchObject({
      total: 8,
      verified: 8,
      pending: 0,
      untracked: 0,
    });
  });

  test("keeps untracked legacy dossier hadiths visible instead of silently treating them as verified", () => {
    const quranHidayat = hadithVerificationCoverage().find(
      (row) => row.topicId === "quran-hidayat",
    );

    expect(quranHidayat).toBeDefined();
    expect(quranHidayat!.total).toBeGreaterThan(0);
    expect(quranHidayat!.verified).toBe(0);
    expect(quranHidayat!.pending).toBe(0);
    expect(quranHidayat!.untracked).toBe(quranHidayat!.total);
    expect(quranHidayat!.untrackedIds.length).toBe(quranHidayat!.total);
  });

  test("never lets coverage arithmetic drift", () => {
    for (const row of hadithVerificationCoverage()) {
      expect(row.verified + row.pending + row.untracked).toBe(row.total);
      expect(row.verifiedIds).toHaveLength(row.verified);
      expect(row.pendingIds).toHaveLength(row.pending);
      expect(row.untrackedIds).toHaveLength(row.untracked);
    }
  });
});
