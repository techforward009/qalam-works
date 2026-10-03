import type { SermonDossier } from "./topicDossier";

export type KhateebDuration = 20 | 30 | 45;

export const KHATEEB_HADITH_BANK_TARGETS: Readonly<Record<KhateebDuration, number>> = {
  20: 5,
  30: 8,
  45: 10,
};

export type HadithBankCoverage = {
  count: number;
  target: number;
  missing: number;
  ready: boolean;
};

export function hadithBankCoverage(
  dossier: SermonDossier | null | undefined,
  duration: KhateebDuration,
): HadithBankCoverage {
  const count =
    dossier?.primaryTexts?.filter((item) => item.kind === "hadith").length ?? 0;
  const target = KHATEEB_HADITH_BANK_TARGETS[duration];

  return {
    count,
    target,
    missing: Math.max(0, target - count),
    ready: count >= target,
  };
}
