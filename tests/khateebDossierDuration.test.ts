import { describe, expect, test } from "vitest";
import { dossierDurationStats, dossierForDuration } from "../app/tools/khateeb-studio/engine/dossierDuration";
import { getTopicDossier } from "../app/tools/khateeb-studio/engine/topicDossier";

describe("Khateeb dossier duration shaping", () => {
  const parents = getTopicDossier("parents-barsi")!;

  test("20, 30, and 45 minute parents preparations are materially different", () => {
    const short = dossierDurationStats(parents, 20);
    const medium = dossierDurationStats(parents, 30);
    const long = dossierDurationStats(parents, 45);

    expect(short).toEqual({ quran: 2, hadith: 5, perspectives: 2, pulpitSteps: 4 });
    expect(medium.quran).toBeGreaterThan(short.quran);
    expect(medium.hadith).toBeGreaterThan(short.hadith);
    expect(medium.perspectives).toBeGreaterThanOrEqual(short.perspectives);
    expect(medium.pulpitSteps).toBeGreaterThan(short.pulpitSteps);

    expect(long.quran).toBeGreaterThanOrEqual(medium.quran);
    expect(long.hadith).toBeGreaterThanOrEqual(medium.hadith);
    expect(long.perspectives).toBeGreaterThanOrEqual(medium.perspectives);
    expect(long.pulpitSteps).toBeGreaterThan(medium.pulpitSteps);
  });

  test("45 minutes keeps the full dossier while shorter durations trim depth", () => {
    const short = dossierForDuration(parents, 20);
    const medium = dossierForDuration(parents, 30);
    const long = dossierForDuration(parents, 45);

    expect(long.primaryTexts?.length).toBe(parents.primaryTexts?.length);
    expect(long.perspectives.length).toBe(parents.perspectives.length);
    expect(long.pulpitFlowUr.length).toBe(parents.pulpitFlowUr.length);

    expect(short.primaryTexts!.length).toBeLessThan(medium.primaryTexts!.length);
    expect(medium.primaryTexts!.length).toBeLessThanOrEqual(long.primaryTexts!.length);

    const shortReady = short.perspectives.flatMap((item) => item.readyUr ?? []).length;
    const mediumReady = medium.perspectives.flatMap((item) => item.readyUr ?? []).length;
    const longReady = long.perspectives.flatMap((item) => item.readyUr ?? []).length;

    expect(shortReady).toBeLessThanOrEqual(mediumReady);
    expect(mediumReady).toBeLessThanOrEqual(longReady);
  });

  test("duration shaping preserves exact references on selected narrations", () => {
    for (const duration of [20, 30, 45] as const) {
      const shaped = dossierForDuration(parents, duration);
      const hadiths = shaped.primaryTexts?.filter((item) => item.kind === "hadith") ?? [];
      expect(hadiths.length).toBeGreaterThan(0);
      expect(hadiths.every((item) => Boolean(item.sourceRefUr))).toBe(true);
    }
  });
});
