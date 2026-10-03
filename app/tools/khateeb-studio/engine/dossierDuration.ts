import type { SermonDossier, ScholarPerspective } from "./topicDossier";
import type { SermonDuration } from "./sermonPrep";

type DurationProfile = {
  quran: number;
  hadith: number;
  perspectives: number;
  explanationPoints: number;
  groundedSections: number;
  readySections: number;
  synthesis: number;
  pulpitSteps: number;
};

const DURATION_PROFILES: Readonly<Record<SermonDuration, DurationProfile>> = {
  20: {
    quran: 2,
    hadith: 5,
    perspectives: 2,
    explanationPoints: 1,
    groundedSections: 1,
    readySections: 1,
    synthesis: 1,
    pulpitSteps: 4,
  },
  30: {
    quran: 3,
    hadith: 8,
    perspectives: 3,
    explanationPoints: 2,
    groundedSections: 2,
    readySections: 2,
    synthesis: 2,
    pulpitSteps: 6,
  },
  45: {
    quran: Number.POSITIVE_INFINITY,
    hadith: Number.POSITIVE_INFINITY,
    perspectives: Number.POSITIVE_INFINITY,
    explanationPoints: Number.POSITIVE_INFINITY,
    groundedSections: Number.POSITIVE_INFINITY,
    readySections: Number.POSITIVE_INFINITY,
    synthesis: Number.POSITIVE_INFINITY,
    pulpitSteps: Number.POSITIVE_INFINITY,
  },
};

function take<T>(items: readonly T[] | undefined, count: number): readonly T[] | undefined {
  if (!items) return undefined;
  if (!Number.isFinite(count)) return items;
  return items.slice(0, count);
}

function adaptPerspective(
  perspective: ScholarPerspective,
  profile: DurationProfile,
): ScholarPerspective {
  return {
    ...perspective,
    explanationUr: take(perspective.explanationUr, profile.explanationPoints) ?? [],
    explanationEn: take(perspective.explanationEn, profile.explanationPoints) ?? [],
    sourceGroundedUr: take(perspective.sourceGroundedUr, profile.groundedSections),
    sourceGroundedEn: take(perspective.sourceGroundedEn, profile.groundedSections),
    readyUr: take(perspective.readyUr, profile.readySections),
    readyEn: take(perspective.readyEn, profile.readySections),
  };
}

export function dossierForDuration(
  dossier: SermonDossier,
  duration: SermonDuration,
): SermonDossier {
  const profile = DURATION_PROFILES[duration];
  const primaryTexts = dossier.primaryTexts ?? [];
  const quran = primaryTexts
    .filter((item) => item.kind === "quran")
    .slice(0, profile.quran);
  const hadith = primaryTexts
    .filter((item) => item.kind === "hadith")
    .slice(0, profile.hadith);

  return {
    ...dossier,
    primaryTexts: [...quran, ...hadith],
    perspectives: dossier.perspectives
      .slice(0, profile.perspectives)
      .map((item) => adaptPerspective(item, profile)),
    synthesisUr: dossier.synthesisUr.slice(0, profile.synthesis),
    synthesisEn: dossier.synthesisEn.slice(0, profile.synthesis),
    pulpitFlowUr: dossier.pulpitFlowUr.slice(0, profile.pulpitSteps),
    pulpitFlowEn: dossier.pulpitFlowEn.slice(0, profile.pulpitSteps),
  };
}

export function dossierDurationStats(
  dossier: SermonDossier,
  duration: SermonDuration,
) {
  const adapted = dossierForDuration(dossier, duration);
  const primaryTexts = adapted.primaryTexts ?? [];

  return {
    quran: primaryTexts.filter((item) => item.kind === "quran").length,
    hadith: primaryTexts.filter((item) => item.kind === "hadith").length,
    perspectives: adapted.perspectives.length,
    pulpitSteps: adapted.pulpitFlowUr.length,
  } as const;
}
