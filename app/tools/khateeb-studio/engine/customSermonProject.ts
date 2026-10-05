import type {
  KhateebResearchEvidence,
  KhateebResearchResult,
} from "./researchTypes";
import type { SermonDuration } from "./sermonPrep";

export type CustomSermonKind = "majlis" | "jumuah" | "general";
export type CustomSermonStatus = "draft" | "researching" | "ready";

export type CustomSermonEvidenceSnapshot = {
  id: string;
  kind: KhateebResearchEvidence["kind"];
  status: KhateebResearchEvidence["status"];
  titleUr: string;
  titleEn: string;
  detailUr: string;
  detailEn: string;
  citationUr: string;
  citationEn: string;
  arabic?: string;
  sourceUrl?: string;
  providerId?: string;
};

export type CustomSermonSectionKind =
  | "opening"
  | "quran"
  | "hadith"
  | "scholar"
  | "own-material"
  | "editorial-bridge"
  | "closing"
  | "jumuah-first"
  | "jumuah-second";

export type CustomSermonSection = {
  id: string;
  kind: CustomSermonSectionKind;
  headingUr: string;
  headingEn: string;
  minutes: number;
  provenance: "source-grounded" | "user" | "editorial";
  evidenceIds: readonly string[];
  userText: string;
};

export type CustomSermonProject = {
  version: 1;
  id: string;
  kind: CustomSermonKind;
  title: string;
  objective: string;
  ownMaterial: string;
  duration: SermonDuration;
  status: CustomSermonStatus;
  createdAt: string;
  updatedAt: string;
  researchQuery: string;
  evidence: readonly CustomSermonEvidenceSnapshot[];
  selectedEvidenceIds: readonly string[];
  sections: readonly CustomSermonSection[];
};

export const CUSTOM_SERMON_PREFIX = "qalam-khateeb-custom-v1";

function uid(now = Date.now()): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function customSermonProjectKey(id: string): string {
  return `${CUSTOM_SERMON_PREFIX}:${id}`;
}

export function createCustomSermonProject(
  input: {
    kind: CustomSermonKind;
    title: string;
    objective: string;
    ownMaterial?: string;
    duration: SermonDuration;
  },
  now = new Date().toISOString(),
): CustomSermonProject {
  const id = uid(Date.parse(now) || Date.now());
  return {
    version: 1,
    id,
    kind: input.kind,
    title: input.title.trim(),
    objective: input.objective.trim(),
    ownMaterial: input.ownMaterial?.trim() ?? "",
    duration: input.duration,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    researchQuery: input.title.trim(),
    evidence: [],
    selectedEvidenceIds: [],
    sections: buildCustomSermonSections(input.kind, input.duration, []),
  };
}

export function snapshotResearchEvidence(
  result: KhateebResearchResult,
): readonly CustomSermonEvidenceSnapshot[] {
  return result.evidence.map((item) => ({
    id: item.id,
    kind: item.kind,
    status: item.status,
    titleUr: item.titleUr,
    titleEn: item.titleEn,
    detailUr: item.detailUr,
    detailEn: item.detailEn,
    citationUr: item.citationUr,
    citationEn: item.citationEn,
    arabic: item.arabic,
    sourceUrl: item.sourceUrl,
    providerId: item.providerId,
  }));
}

function sourceKindToSection(
  kind: KhateebResearchEvidence["kind"],
): CustomSermonSectionKind | null {
  if (kind === "quran") return "quran";
  if (kind === "hadith") return "hadith";
  if (kind === "scholar") return "scholar";
  return null;
}

function sectionHeading(
  kind: CustomSermonSectionKind,
): { ur: string; en: string } {
  switch (kind) {
    case "opening":
      return { ur: "تمہید اور مرکزی سوال", en: "Opening and governing question" };
    case "quran":
      return { ur: "قرآنی بنیاد", en: "Qur'anic foundation" };
    case "hadith":
      return { ur: "مصدقہ روایات", en: "Verified narrations" };
    case "scholar":
      return { ur: "ماخذ سے ثابت علمی توضیح", en: "Source-grounded scholarly explanation" };
    case "own-material":
      return { ur: "میرا مواد", en: "My material" };
    case "editorial-bridge":
      return { ur: "منبری ربط — تدوینی", en: "Pulpit bridge — editorial" };
    case "closing":
      return { ur: "اختتام", en: "Closing" };
    case "jumuah-first":
      return { ur: "پہلا خطبہ — مرکزی بحث", en: "First khutbah — main discussion" };
    case "jumuah-second":
      return { ur: "دوسرا خطبہ — عملی و اجتماعی ربط", en: "Second khutbah — practical and social link" };
  }
}

function allocate(
  duration: SermonDuration,
  kinds: readonly CustomSermonSectionKind[],
): number[] {
  const weights = kinds.map((kind) => {
    if (kind === "opening") return 1;
    if (kind === "quran") return 1.2;
    if (kind === "hadith") return 1.8;
    if (kind === "scholar") return 1.5;
    if (kind === "own-material") return 1.3;
    if (kind === "jumuah-first") return 2.2;
    if (kind === "jumuah-second") return 1.6;
    if (kind === "closing") return 0.8;
    return 1;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  const minutes = weights.map((weight) => Math.max(1, Math.floor((duration * weight) / total)));
  let delta = duration - minutes.reduce((sum, value) => sum + value, 0);
  let index = 0;
  while (delta > 0) {
    minutes[index % minutes.length] += 1;
    delta -= 1;
    index += 1;
  }
  while (delta < 0) {
    const target = minutes.findIndex((value) => value > 1);
    if (target < 0) break;
    minutes[target] -= 1;
    delta += 1;
  }
  return minutes;
}

export function buildCustomSermonSections(
  kind: CustomSermonKind,
  duration: SermonDuration,
  evidence: readonly CustomSermonEvidenceSnapshot[],
): readonly CustomSermonSection[] {
  const verified = evidence.filter((item) => item.status === "verified");
  const sourceKinds = Array.from(
    new Set(
      verified
        .map((item) => sourceKindToSection(item.kind))
        .filter((item): item is CustomSermonSectionKind => Boolean(item)),
    ),
  );

  const baseKinds: CustomSermonSectionKind[] =
    kind === "jumuah"
      ? [
          "opening",
          "jumuah-first",
          ...sourceKinds,
          "own-material",
          "jumuah-second",
          "closing",
        ]
      : [
          "opening",
          ...sourceKinds,
          "own-material",
          "editorial-bridge",
          "closing",
        ];

  const uniqueKinds = baseKinds.filter(
    (item, index) => baseKinds.indexOf(item) === index,
  );
  const minutes = allocate(duration, uniqueKinds);

  return uniqueKinds.map((sectionKind, index) => {
    const heading = sectionHeading(sectionKind);
    const evidenceIds =
      sectionKind === "quran"
        ? verified.filter((item) => item.kind === "quran").map((item) => item.id)
        : sectionKind === "hadith"
          ? verified.filter((item) => item.kind === "hadith").map((item) => item.id)
          : sectionKind === "scholar"
            ? verified.filter((item) => item.kind === "scholar").map((item) => item.id)
            : [];

    return {
      id: `${sectionKind}-${index + 1}`,
      kind: sectionKind,
      headingUr: heading.ur,
      headingEn: heading.en,
      minutes: minutes[index],
      provenance:
        sectionKind === "quran" ||
        sectionKind === "hadith" ||
        sectionKind === "scholar"
          ? "source-grounded"
          : sectionKind === "own-material"
            ? "user"
            : "editorial",
      evidenceIds,
      userText: "",
    };
  });
}

export function updateCustomProjectBasics(
  project: CustomSermonProject,
  patch: Partial<
    Pick<
      CustomSermonProject,
      "kind" | "title" | "objective" | "ownMaterial" | "duration" | "researchQuery"
    >
  >,
  now = new Date().toISOString(),
): CustomSermonProject {
  const next = {
    ...project,
    ...patch,
    title: patch.title !== undefined ? patch.title : project.title,
    objective:
      patch.objective !== undefined ? patch.objective : project.objective,
    ownMaterial:
      patch.ownMaterial !== undefined ? patch.ownMaterial : project.ownMaterial,
    researchQuery:
      patch.researchQuery !== undefined
        ? patch.researchQuery
        : project.researchQuery,
    updatedAt: now,
  };
  const structureChanged =
    (patch.kind !== undefined && patch.kind !== project.kind) ||
    (patch.duration !== undefined && patch.duration !== project.duration);

  if (!structureChanged) return next;

  const selected = next.evidence.filter((item) =>
    next.selectedEvidenceIds.includes(item.id),
  );
  const previousByKind = new Map(
    project.sections.map((section) => [section.kind, section.userText]),
  );
  return {
    ...next,
    sections: buildCustomSermonSections(next.kind, next.duration, selected).map(
      (section) => ({
        ...section,
        userText: previousByKind.get(section.kind) ?? "",
      }),
    ),
  };
}

export function applyResearchToCustomProject(
  project: CustomSermonProject,
  result: KhateebResearchResult,
  now = new Date().toISOString(),
): CustomSermonProject {
  const evidence = snapshotResearchEvidence(result);
  const selectedEvidenceIds = evidence
    .filter((item) => item.status === "verified")
    .map((item) => item.id);

  return {
    ...project,
    status: selectedEvidenceIds.length ? "researching" : "draft",
    updatedAt: now,
    evidence,
    selectedEvidenceIds,
    sections: buildCustomSermonSections(project.kind, project.duration, evidence),
  };
}

export function selectCustomEvidence(
  project: CustomSermonProject,
  evidenceIds: readonly string[],
  now = new Date().toISOString(),
): CustomSermonProject {
  const allowed = new Set(
    project.evidence
      .filter((item) => item.status === "verified")
      .map((item) => item.id),
  );
  const selectedEvidenceIds = Array.from(
    new Set(evidenceIds.filter((id) => allowed.has(id))),
  );
  const selected = project.evidence.filter((item) =>
    selectedEvidenceIds.includes(item.id),
  );

  return {
    ...project,
    updatedAt: now,
    selectedEvidenceIds,
    sections: buildCustomSermonSections(project.kind, project.duration, selected),
    status: selectedEvidenceIds.length ? "researching" : "draft",
  };
}

export function updateCustomSection(
  project: CustomSermonProject,
  sectionId: string,
  userText: string,
  now = new Date().toISOString(),
): CustomSermonProject {
  return {
    ...project,
    updatedAt: now,
    sections: project.sections.map((section) =>
      section.id === sectionId ? { ...section, userText } : section,
    ),
  };
}

export function markCustomProjectReady(
  project: CustomSermonProject,
  now = new Date().toISOString(),
): CustomSermonProject {
  const hasSourceCore = project.evidence.some(
    (item) =>
      project.selectedEvidenceIds.includes(item.id) &&
      item.status === "verified" &&
      (item.kind === "hadith" || item.kind === "scholar"),
  );

  return {
    ...project,
    status: hasSourceCore ? "ready" : project.status,
    updatedAt: now,
  };
}

export function validateCustomSermonProject(
  project: CustomSermonProject,
): readonly string[] {
  const errors: string[] = [];
  if (!project.title.trim()) errors.push("title is required");
  if (!project.objective.trim()) errors.push("objective is required");
  if (![20, 30, 45].includes(project.duration)) errors.push("invalid duration");
  if (project.sections.reduce((sum, item) => sum + item.minutes, 0) !== project.duration) {
    errors.push("section minutes do not match duration");
  }
  const evidenceIds = new Set(project.evidence.map((item) => item.id));
  for (const id of project.selectedEvidenceIds) {
    if (!evidenceIds.has(id)) errors.push(`selected evidence missing: ${id}`);
    const row = project.evidence.find((item) => item.id === id);
    if (row && row.status !== "verified") {
      errors.push(`unverified evidence selected: ${id}`);
    }
  }
  for (const section of project.sections) {
    if (section.provenance === "source-grounded") {
      for (const id of section.evidenceIds) {
        if (!project.selectedEvidenceIds.includes(id)) {
          errors.push(`${section.id}: evidence is not selected`);
        }
      }
    }
  }
  return errors;
}

export function serializeCustomSermonProject(
  project: CustomSermonProject,
): string {
  return JSON.stringify(project);
}

export function parseCustomSermonProject(
  raw: string | null,
): CustomSermonProject | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as CustomSermonProject;
    if (
      value?.version !== 1 ||
      typeof value.id !== "string" ||
      typeof value.title !== "string" ||
      !Array.isArray(value.sections) ||
      !Array.isArray(value.evidence)
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function customSermonKindLabel(
  kind: CustomSermonKind,
  locale: "ur" | "en",
): string {
  const ur = locale === "ur";
  if (kind === "majlis") return ur ? "مجلس" : "Majlis";
  if (kind === "jumuah") return ur ? "خطبۂ جمعہ" : "Friday khutbah";
  return ur ? "عام دینی خطاب" : "General religious talk";
}

export function buildCustomSermonText(
  project: CustomSermonProject,
  locale: "ur" | "en",
): string {
  const ur = locale === "ur";
  const selected = new Map(
    project.evidence
      .filter((item) => project.selectedEvidenceIds.includes(item.id))
      .map((item) => [item.id, item]),
  );

  const lines: string[] = [
    project.title,
    `${customSermonKindLabel(project.kind, locale)} — ${project.duration} ${ur ? "منٹ" : "min"}`,
    "",
    ur ? `مقصد: ${project.objective}` : `Objective: ${project.objective}`,
    "",
    ur
      ? "اصول: اصل ماخذ، میرے اپنے نوٹس، اور قلم کی تدوین الگ الگ رکھی گئی ہے۔"
      : "Rule: source material, my own notes, and Qalam editorial material are kept separate.",
  ];

  for (const section of project.sections) {
    lines.push(
      "",
      `${ur ? section.headingUr : section.headingEn} — ${section.minutes} ${ur ? "منٹ" : "min"}`,
      section.provenance === "source-grounded"
        ? ur
          ? "[مصدقہ ماخذ]"
          : "[Verified source]"
        : section.provenance === "user"
          ? ur
            ? "[میرا مواد]"
            : "[My material]"
          : ur
            ? "[قلم کی تدوین]"
            : "[Qalam editorial]",
    );

    for (const id of section.evidenceIds) {
      const item = selected.get(id);
      if (!item) continue;
      lines.push(
        "",
        ur ? item.titleUr : item.titleEn,
      );
      if (item.arabic) lines.push(item.arabic);
      lines.push(ur ? item.detailUr : item.detailEn);
      lines.push(
        `${ur ? "حوالہ" : "Reference"}: ${ur ? item.citationUr : item.citationEn}`,
      );
    }

    if (section.kind === "own-material" && project.ownMaterial) {
      lines.push(project.ownMaterial);
    }
    if (section.userText.trim()) lines.push(section.userText.trim());
  }

  lines.push(
    "",
    ur
      ? "تنبیہ: [قلم کی تدوین] اور [میرا مواد] کو آیت، حدیث یا عالم کے اصل الفاظ کے طور پر نقل نہ کریں۔"
      : "Warning: never present [Qalam editorial] or [My material] as the exact words of a verse, hadith, or scholar.",
  );

  return lines.join("\n");
}
