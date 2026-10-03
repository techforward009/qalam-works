import type { SermonDuration } from "./sermonPrep";
import type { KhateebResearchEvidence, KhateebResearchResult } from "./researchTypes";

export type LiveResearchPack = {
  duration: SermonDuration;
  query: string;
  evidence: readonly KhateebResearchEvidence[];
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

const SECTION_MINUTES: Record<SermonDuration, readonly number[]> = {
  20: [3, 6, 6, 5],
  30: [4, 7, 7, 7, 5],
  45: [5, 8, 8, 8, 8, 8],
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
  const quran = evidence.filter((item) => item.kind === "quran").map((item) => item.id);
  const narrations = evidence
    .filter((item) => item.kind === "hadith" || (item.providerId === "eshia-library" && Boolean(item.arabic)))
    .map((item) => item.id);
  const scholarly = evidence
    .filter((item) => item.kind === "scholar" || item.kind === "source")
    .map((item) => item.id);

  const groups = [
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
      headingUr: "اصل روایات و متون",
      headingEn: "Primary narrations and texts",
      evidenceIds: narrations,
    },
    {
      id: "scholarship",
      headingUr: "علمی توضیح اور ماخذی نکات",
      headingEn: "Scholarly explanation and source-led points",
      evidenceIds: scholarly,
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
  ];

  const minutes = SECTION_MINUTES[duration];
  const activeGroups = groups
    .filter((group) => group.evidenceIds.length > 0 || group.id === "opening" || group.id === "synthesis" || group.id === "closing")
    .slice(0, minutes.length);

  const assigned = activeGroups.map((group, index) => ({
    ...group,
    minutes: minutes[index] ?? 0,
  }));

  return {
    duration,
    query: result.query,
    evidence,
    sections: assigned,
    totalMinutes: assigned.reduce((sum, item) => sum + item.minutes, 0),
  };
}
