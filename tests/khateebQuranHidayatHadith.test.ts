import { describe, expect, test } from "vitest";
import { getTopicDossier } from "../app/tools/khateeb-studio/engine/topicDossier";
import { hadithBankCoverage } from "../app/tools/khateeb-studio/engine/hadithBank";
import { dossierDurationStats } from "../app/tools/khateeb-studio/engine/dossierDuration";

describe("Khateeb Qur'an and guidance source bank", () => {
  const dossier = getTopicDossier("quran-hidayat")!;

  test("uses eShia-backed hadith material as the primary narration bank", () => {
    const hadiths = dossier.primaryTexts?.filter((item) => item.kind === "hadith") ?? [];
    expect(hadiths.length).toBeGreaterThanOrEqual(8);
    expect(hadiths.every((item) => item.sourceUrl?.startsWith("https://lib.eshia.ir/"))).toBe(true);
    expect(hadiths.every((item) => Boolean(item.sourceRefUr))).toBe(true);
    expect(hadiths.every((item) => Boolean(item.sourceArabic))).toBe(true);
  });

  test("meets both 20 and 30 minute hadith-bank targets", () => {
    expect(hadithBankCoverage(dossier, 20).ready).toBe(true);
    expect(hadithBankCoverage(dossier, 30).ready).toBe(true);
  });

  test("duration shaping now changes Qur'an and hadith depth", () => {
    expect(dossierDurationStats(dossier, 20)).toEqual({
      quran: 2,
      hadith: 5,
      perspectives: 2,
      pulpitSteps: 4,
    });
    expect(dossierDurationStats(dossier, 30).quran).toBe(3);
    expect(dossierDurationStats(dossier, 30).hadith).toBe(8);
    expect(dossierDurationStats(dossier, 45).hadith).toBeGreaterThanOrEqual(8);
  });
});
