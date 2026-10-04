import type { SermonDuration } from "./sermonPrep";
import type { KhateebResearchEvidence, KhateebResearchResult } from "./researchTypes";

export type LiveResearchSectionRole =
  | "source-grounded"
  | "editorial-bridge";

export type LiveResearchPackBlocker = {
  code:
    | "not-enough-verified"
    | "not-enough-core-evidence"
    | "quran-only";
  messageUr: string;
  messageEn: string;
};

export type LiveResearchEvidenceProfile = {
  verified: number;
  quran: number;
  hadith: number;
  scholar: number;
  speaker: number;
  source: number;
  core: number;
};

export type LiveResearchPack = {
  duration: SermonDuration;
  query: string;
  evidence: readonly KhateebResearchEvidence[];
  ready: boolean;
  minimumSources: number;
  minimumCoreEvidence: number;
  missingSources: number;
  missingCoreEvidence: number;
  blockers: readonly LiveResearchPackBlocker[];
  profile: LiveResearchEvidenceProfile;
  sections: readonly {
    id: string;
    minutes: number;
    headingUr: string;
    headingEn: string;
    role: LiveResearchSectionRole;
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

const MINIMUM_CORE_EVIDENCE: Record<SermonDuration, number> = {
  20: 1,
  30: 2,
  45: 3,
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
  if (item.kind === "scholar") score += 20;
  if (item.kind === "speaker") score += 5;
  if (item.arabic) score += 10;
  return score;
}

function chooseEvidence(result: KhateebResearchResult, duration: SermonDuration) {
  return [...result.evidence]
    .filter((item) => item.status === "verified")
    .sort((a, b) => rankEvidence(b) - rankEvidence(a))
    .slice(0, LIMITS[duration]);
}

function evidenceProfile(
  evidence: readonly KhateebResearchEvidence[],
): LiveResearchEvidenceProfile {
  const count = (kind: KhateebResearchEvidence["kind"]) =>
    evidence.filter((item) => item.kind === kind).length;
  const hadith = count("hadith");
  const scholar = count("scholar");

  return {
    verified: evidence.length,
    quran: count("quran"),
    hadith,
    scholar,
    speaker: count("speaker"),
    source: count("source"),
    core: hadith + scholar,
  };
}

function packBlockers(
  profile: LiveResearchEvidenceProfile,
  minimumSources: number,
  minimumCoreEvidence: number,
): readonly LiveResearchPackBlocker[] {
  const blockers: LiveResearchPackBlocker[] = [];

  if (profile.verified < minimumSources) {
    blockers.push({
      code: "not-enough-verified",
      messageUr: `کم از کم ${minimumSources} لفظ بہ لفظ یا ماخذی طور پر مصدقہ اندراج درکار ہیں۔`,
      messageEn: `At least ${minimumSources} source-verified records are required.`,
    });
  }

  if (profile.quran > 0 && profile.core === 0) {
    blockers.push({
      code: "quran-only",
      messageUr:
        "صرف قرآنی آیات کی بنیاد پر وقت بند منبری پیک نہیں بنایا جائے گا؛ کم از کم ایک مصدقہ روایت یا ماخذ سے ثابت علمی توضیح ضروری ہے۔",
      messageEn:
        "A timed sermon pack is not built from Qur'anic verses alone; at least one verified narration or source-grounded scholarly explanation is required.",
    });
  }

  if (profile.core < minimumCoreEvidence) {
    blockers.push({
      code: "not-enough-core-evidence",
      messageUr: `اس مدت کے لیے کم از کم ${minimumCoreEvidence} بنیادی مصدقہ روایتی یا علمی اندراج درکار ہیں۔`,
      messageEn: `This duration requires at least ${minimumCoreEvidence} core verified hadith or scholarly records.`,
    });
  }

  return blockers;
}

function roleForSection(id: string): LiveResearchSectionRole {
  return id === "synthesis" || id === "closing"
    ? "editorial-bridge"
    : "source-grounded";
}

export function buildLiveResearchPack(
  result: KhateebResearchResult,
  duration: SermonDuration,
): LiveResearchPack {
  const evidence = chooseEvidence(result, duration);
  const minimumSources = MINIMUM_SOURCES[duration];
  const minimumCoreEvidence = MINIMUM_CORE_EVIDENCE[duration];
  const profile = evidenceProfile(evidence);
  const blockers = packBlockers(profile, minimumSources, minimumCoreEvidence);
  const ready = blockers.length === 0;

  const quran = evidence
    .filter((item) => item.kind === "quran")
    .map((item) => item.id);
  const narrations = evidence
    .filter((item) => item.kind === "hadith")
    .map((item) => item.id);
  const sourceTexts = evidence
    .filter(
      (item) =>
        item.kind === "source" ||
        item.kind === "scholar" ||
        item.kind === "speaker",
    )
    .map((item) => item.id);

  const baseResult = {
    duration,
    query: result.query,
    evidence,
    ready,
    minimumSources,
    minimumCoreEvidence,
    missingSources: Math.max(0, minimumSources - profile.verified),
    missingCoreEvidence: Math.max(0, minimumCoreEvidence - profile.core),
    blockers,
    profile,
  };

  if (!ready) {
    return {
      ...baseResult,
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
        headingUr: "مصدقہ علمی ماخذ",
        headingEn: "Verified scholarly sources",
        evidenceIds: sourceTexts,
      },
      {
        id: "synthesis",
        headingUr: "منبری ربط — تدوینی",
        headingEn: "Editorial pulpit bridge",
        evidenceIds: evidence.slice(0, Math.min(3, evidence.length)).map((item) => item.id),
      },
      {
        id: "closing",
        headingUr: "اختتامی ربط — تدوینی",
        headingEn: "Editorial closing bridge",
        evidenceIds: evidence.slice(-1).map((item) => item.id),
      },
    ];

    base.forEach((section, index) => {
      sections.push({
        ...section,
        role: roleForSection(section.id),
        minutes: minutes[index] ?? 0,
      });
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
        headingUr: "اصل روایات و متون",
        headingEn: "Primary narrations and texts",
        evidenceIds: narrations,
      },
      {
        id: "sources",
        headingUr: "ماخذ سے ثابت علمی توضیح",
        headingEn: "Source-grounded scholarly explanation",
        evidenceIds: sourceTexts,
      },
      {
        id: "synthesis",
        headingUr: "منبری ربط — تدوینی",
        headingEn: "Editorial pulpit bridge",
        evidenceIds: evidence
          .slice(Math.max(0, evidence.length - 3))
          .map((item) => item.id),
      },
      {
        id: "closing",
        headingUr: "اختتامی ربط — تدوینی",
        headingEn: "Editorial closing bridge",
        evidenceIds: evidence.slice(-1).map((item) => item.id),
      },
    ].filter(
      (section) =>
        section.id === "opening" ||
        section.id === "synthesis" ||
        section.id === "closing" ||
        section.evidenceIds.length > 0,
    );

    const selected = base.slice(0, minutes.length);
    selected.forEach((section, index) => {
      sections.push({
        ...section,
        role: roleForSection(section.id),
        minutes: minutes[index] ?? 0,
      });
    });

    const currentTotal = sections.reduce((sum, item) => sum + item.minutes, 0);
    const delta = duration - currentTotal;
    if (sections.length && delta !== 0) {
      const last = sections[sections.length - 1];
      sections[sections.length - 1] = {
        ...last,
        minutes: last.minutes + delta,
      };
    }
  }

  return {
    ...baseResult,
    sections,
    totalMinutes: sections.reduce((sum, item) => sum + item.minutes, 0),
  };
}
