import type { SermonDuration } from "./sermonPrep";
import type { KhateebResearchEvidence, KhateebResearchResult } from "./researchTypes";

export type LiveResearchPack = {
  duration: SermonDuration;
  query: string;
  evidence: readonly KhateebResearchEvidence[];
  ready: boolean;
  minimumSources: number;
  missingSources: number;
  sections: readonly {
    id: string;
    minutes: number;
    headingUr: string;
    headingEn: string;
    evidenceIds: readonly string[];
  }[];
  totalMinutes: number;
};

const LIMITS: Record<SermonDuration, number> = {
  20: 5,
  30: 8,
  45: 12,
};

const MINIMUM_SOURCES: Record<SermonDuration, number> = {
  20: 3,
  30: 5,
  45: 8,
};

const SOURCE_ONLY_MINUTES: Record<SermonDuration, readonly number[]> = {
  20: [3, 8, 5, 4],
  30: [4, 12, 9, 5],
  45: [5, 15, 10, 10, 5],
};

const MIXED_MINUTES: Record<SermonDuration, readonly number[]> = {
  20: [3, 5, 8, 4],
  30: [4, 6, 8, 7, 5],
  45: [5, 8, 10, 9, 8, 5],
};

function rankEvidence(item: KhateebResearchEvidence): number {
  let score = 0;
  if (item.status === "verified") score += 100;
  if (item.kind === "quran") score += 40;
  if (item.kind === "hadith") score += 35;
  if (item.providerId === "eshia-library") score += 25;
  if (item.kind === "scholar") score += 15;
  if (item.arabic) score += 10;
  return score;
}

function chooseEvidence(result: KhateebResearchResult, duration: SermonDuration) {
  return [...result.evidence]
    .filter((item) => item.status === "verified")
    .sort((a, b) => rankEvidence(b) - rankEvidence(a))
    .slice(0, LIMITS[duration]);
}

export function buildLiveResearchPack(
  result: KhateebResearchResult,
  duration: SermonDuration,
): LiveResearchPack {
  const evidence = chooseEvidence(result, duration);
  const minimumSources = MINIMUM_SOURCES[duration];
  const hasNonQuranVerified = evidence.some((item) => item.kind !== "quran");
  const ready = evidence.length >= minimumSources && hasNonQuranVerified;

  const quran = evidence.filter((item) => item.kind === "quran").map((item) => item.id);
  const narrations = evidence.filter((item) => item.kind === "hadith").map((item) => item.id);
  const sourceTexts = evidence
    .filter((item) => item.kind === "source" || item.kind === "scholar")
    .map((item) => item.id);

  if (!ready) {
    return {
      duration,
      query: result.query,
      evidence,
      ready,
      minimumSources,
      missingSources: Math.max(0, minimumSources - evidence.length),
      sections: [],
      totalMinutes: 0,
    };
  }

  const hasQuranOrHadith = quran.length > 0 || narrations.length > 0;
  const sections: Array<LiveResearchPack["sections"][number]> = [];

  if (!hasQuranOrHadith) {
    const minutes = SOURCE_ONLY_MINUTES[duration];
    const base = [
      {
        id: "opening",
        headingUr: "تمہید اور مرکزی سوال",
        headingEn: "Opening and governing question",
        evidenceIds: evidence.slice(0, 1).map((item) => item.id),
      },
      {
        id: "sources",
        headingUr: "ای شیعہ کے متعلقہ ماخذی متون",
        headingEn: "Relevant eShia source texts",
        evidenceIds: sourceTexts,
      },
      {
        id: "synthesis",
        headingUr: "منبری ربط، ترتیب اور خلاصہ",
        headingEn: "Pulpit synthesis, ordering, and summary",
        evidenceIds: evidence.slice(0, Math.min(3, evidence.length)).map((item) => item.id),
      },
      {
        id: "closing",
        headingUr: "اختتام اور یاد رہنے والا نکتہ",
        headingEn: "Closing and memorable takeaway",
        evidenceIds: evidence.slice(-1).map((item) => item.id),
      },
    ];

    base.forEach((section, index) => {
      sections.push({ ...section, minutes: minutes[index] ?? 0 });
    });
  } else {
    const minutes = MIXED_MINUTES[duration];
    const base = [
      {
        id: "opening",
        headingUr: "تمہید اور مرکزی سوال",
        headingEn: "Opening and governing question",
        evidenceIds: evidence.slice(0, 1).map((item) => item.id),
      },
      {
        id: "quran",
        headingUr: "قرآنی بنیاد",
        headingEn: "Qur'anic foundation",
        evidenceIds: quran,
      },
      {
        id: "narrations",
        headingUr: "اصل روایات",
        headingEn: "Primary narrations",
        evidenceIds: narrations,
      },
      {
        id: "sources",
        headingUr: "متعلقہ ماخذی متون اور علمی توضیح",
        headingEn: "Relevant source texts and scholarly explanation",
        evidenceIds: sourceTexts,
      },
      {
        id: "synthesis",
        headingUr: "منبری ربط اور خلاصہ",
        headingEn: "Pulpit synthesis and summary",
        evidenceIds: evidence.slice(Math.max(0, evidence.length - 2)).map((item) => item.id),
      },
      {
        id: "closing",
        headingUr: "اختتام اور یاد رہنے والا نکتہ",
        headingEn: "Closing and memorable takeaway",
        evidenceIds: evidence.slice(-1).map((item) => item.id),
      },
    ].filter((section) =>
      section.id === "opening" ||
      section.id === "synthesis" ||
      section.id === "closing" ||
      section.evidenceIds.length > 0
    );

    const selected = base.slice(0, minutes.length);
    selected.forEach((section, index) => {
      sections.push({ ...section, minutes: minutes[index] ?? 0 });
    });

    const currentTotal = sections.reduce((sum, item) => sum + item.minutes, 0);
    const delta = duration - currentTotal;
    if (sections.length && delta !== 0) {
      const last = sections[sections.length - 1];
      sections[sections.length - 1] = { ...last, minutes: last.minutes + delta };
    }
  }

  return {
    duration,
    query: result.query,
    evidence,
    ready,
    minimumSources,
    missingSources: 0,
    sections,
    totalMinutes: sections.reduce((sum, item) => sum + item.minutes, 0),
  };
}
