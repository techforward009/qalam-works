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
    expect(byTopic.get("quran-hidayat")).toMatchObject({
      total: 8,
      verified: 8,
      pending: 0,
      untracked: 0,
    });
  });

  test("has no untracked hadith left in any prepared dossier", () => {
    const coverage = hadithVerificationCoverage();
    expect(coverage.every((row) => row.untracked === 0)).toBe(true);
    expect(coverage.flatMap((row) => row.untrackedIds)).toEqual([]);
  });

  test("locks the migration milestone at 36 tracked dossier hadiths", () => {
    const coverage = hadithVerificationCoverage();
    const total = coverage.reduce((sum, row) => sum + row.total, 0);
    const verified = coverage.reduce((sum, row) => sum + row.verified, 0);
    const pending = coverage.reduce((sum, row) => sum + row.pending, 0);

    expect(total).toBe(36);
    expect(verified).toBe(35);
    expect(pending).toBe(1);
  });


  test("the only remaining pending record is the Tanbih al-Khawatir edition conflict", () => {
    const coverage = hadithVerificationCoverage();
    const pending = coverage.flatMap((row) => row.pendingIds);

    expect(pending).toEqual(["dua-best-worship"]);
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
