import type { KhateebResearchEvidence } from "./researchTypes";
import type { LiveResearchPack } from "./liveResearchPack";

export type GroundedSermonBlueprintSection = {
  id: string;
  minutes: number;
  role: "source-grounded" | "editorial-bridge";
  headingUr: string;
  headingEn: string;
  evidence: readonly KhateebResearchEvidence[];
};

export type GroundedSermonBlueprint = {
  query: string;
  duration: number;
  ready: boolean;
  sections: readonly GroundedSermonBlueprintSection[];
  sourceIds: readonly string[];
  guardUr: string;
  guardEn: string;
};

export function buildGroundedSermonBlueprint(
  pack: LiveResearchPack,
): GroundedSermonBlueprint {
  if (!pack.ready) {
    return {
      query: pack.query,
      duration: pack.duration,
      ready: false,
      sections: [],
      sourceIds: [],
      guardUr:
        "یہ خاکہ ابھی تیار نہیں کیا جا سکتا کیونکہ مصدقہ بنیادی مواد مقررہ حد تک نہیں پہنچا۔",
      guardEn:
        "This blueprint cannot be built yet because the verified evidence threshold has not been met.",
    };
  }

  const evidenceById = new Map(pack.evidence.map((item) => [item.id, item]));
  const sections = pack.sections.map((section) => ({
    id: section.id,
    minutes: section.minutes,
    role: section.role,
    headingUr: section.headingUr,
    headingEn: section.headingEn,
    evidence: section.evidenceIds
      .map((id) => evidenceById.get(id))
      .filter((item): item is KhateebResearchEvidence => Boolean(item)),
  }));

  return {
    query: pack.query,
    duration: pack.duration,
    ready: true,
    sections,
    sourceIds: pack.evidence.map((item) => item.id),
    guardUr:
      "اصل نصوص اور ماخذی توضیحات مصدقہ اندراجات سے ہیں۔ منبری ربط، تمہید اور اختتام تدوینی حصے ہیں؛ انہیں اصل روایت یا عالم کا قول سمجھ کر نقل نہ کریں۔",
    guardEn:
      "Primary texts and source-grounded explanations come from verified records. Openings, transitions, and closings are editorial layers and must not be presented as source quotations.",
  };
}

function evidenceLabelUr(item: KhateebResearchEvidence): string {
  if (item.kind === "quran") return "قرآنی بنیاد";
  if (item.kind === "hadith") return "مصدقہ روایت";
  if (item.kind === "scholar") return "ماخذ سے ثابت علمی توضیح";
  if (item.kind === "speaker") return "محفوظ علمی خلاصہ";
  return "ماخذ";
}

function evidenceLabelEn(item: KhateebResearchEvidence): string {
  if (item.kind === "quran") return "Qur'anic foundation";
  if (item.kind === "hadith") return "Verified narration";
  if (item.kind === "scholar") return "Source-grounded scholarly explanation";
  if (item.kind === "speaker") return "Verified scholarly summary";
  return "Source";
}

export function buildGroundedSermonBlueprintText(
  pack: LiveResearchPack,
  locale: "ur" | "en",
): string {
  const blueprint = buildGroundedSermonBlueprint(pack);
  const ur = locale === "ur";

  if (!blueprint.ready) {
    const blockers = pack.blockers.map((item) =>
      ur ? item.messageUr : item.messageEn,
    );
    return [
      ur ? "مصدقہ منبری خاکہ ابھی تیار نہیں" : "Verified sermon blueprint not ready",
      "",
      ur ? blueprint.guardUr : blueprint.guardEn,
      ...blockers.map((item) => `• ${item}`),
    ].join("\n");
  }

  const lines: string[] = [
    ur
      ? `${blueprint.duration} منٹ کا مصدقہ منبری خاکہ`
      : `${blueprint.duration}-minute verified sermon blueprint`,
    ur ? `موضوع: ${blueprint.query}` : `Topic: ${blueprint.query}`,
    "",
    ur ? blueprint.guardUr : blueprint.guardEn,
  ];

  for (const section of blueprint.sections) {
    lines.push(
      "",
      `${section.headingUr && ur ? section.headingUr : section.headingEn} — ${section.minutes} ${ur ? "منٹ" : "min"}`,
      section.role === "editorial-bridge"
        ? ur
          ? "[تدوینی حصہ — اسے اصل ماخذ کا قول نہ سمجھیں]"
          : "[Editorial layer — do not present this as source wording]"
        : ur
          ? "[ماخذی بنیاد]"
          : "[Source-grounded]",
    );

    if (!section.evidence.length) {
      lines.push(
        ur
          ? "• اس حصے میں نیا ماخذی دعویٰ شامل نہ کریں؛ صرف پہلے مذکور مصدقہ مواد کو مربوط کریں۔"
          : "• Do not add a new source claim here; connect only the verified material already listed.",
      );
      continue;
    }

    for (const item of section.evidence) {
      lines.push(
        "",
        `• ${ur ? evidenceLabelUr(item) : evidenceLabelEn(item)}: ${ur ? item.titleUr : item.titleEn}`,
      );
      if (item.arabic) {
        lines.push(item.arabic);
      }
      if (item.kind === "quran" || item.kind === "hadith" || item.kind === "scholar") {
        lines.push(
          `${ur ? "موضوعی/علمی ربط" : "Topical/scholarly link"}: ${ur ? item.detailUr : item.detailEn}`,
        );
      }
      lines.push(
        `${ur ? "حوالہ" : "Reference"}: ${ur ? item.citationUr : item.citationEn}`,
      );
    }
  }

  lines.push(
    "",
    ur
      ? "اصولی یاد دہانی: مصدقہ متن کو جوں کا توں رکھیں؛ اپنی مثال، تمہید اور ربط کو الگ تدوینی زبان میں بیان کریں۔"
      : "Rule reminder: preserve verified source text exactly; keep your examples, opening, and transitions clearly editorial.",
  );

  return lines.join("\n");
}
