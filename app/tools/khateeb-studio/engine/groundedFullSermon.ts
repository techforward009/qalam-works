import { ahmedgrafQuranReference } from "../../arabic-diacritics/quran/ahmedgrafProvider";
import type { SermonDuration, SermonLocale } from "./sermonPrep";
import { getTopicDossier, type SermonDossier } from "./topicDossier";
import {
  verifiedHadithForDossierText,
  type VerifiedHadithRecord,
} from "./verifiedHadithCorpus";

export type SermonCompositionBlockKind =
  | "editorial"
  | "quran"
  | "hadith"
  | "scholar";

export type SermonCompositionBlock = {
  id: string;
  kind: SermonCompositionBlockKind;
  provenance: "source-grounded" | "editorial";
  headingUr: string;
  headingEn: string;
  bodyUr: string;
  bodyEn: string;
  arabic?: string;
  citationUr?: string;
  citationEn?: string;
  sourceUrl?: string;
  minutes: number;
};

export type GroundedFullSermon = {
  topicId: string;
  duration: SermonDuration;
  locale: SermonLocale;
  titleUr: string;
  titleEn: string;
  ready: boolean;
  blockersUr: readonly string[];
  blockersEn: readonly string[];
  blocks: readonly SermonCompositionBlock[];
  verifiedHadithCount: number;
  quranCount: number;
  scholarCount: number;
  editorialCount: number;
};

const BLOCK_LIMITS: Record<
  SermonDuration,
  { quran: number; hadith: number; scholar: number; editorialFlow: number }
> = {
  20: { quran: 2, hadith: 3, scholar: 2, editorialFlow: 3 },
  30: { quran: 3, hadith: 5, scholar: 4, editorialFlow: 4 },
  45: { quran: 4, hadith: 8, scholar: 6, editorialFlow: 6 },
};

function editorial(
  id: string,
  headingUr: string,
  headingEn: string,
  bodyUr: string,
  bodyEn: string,
): SermonCompositionBlock {
  return {
    id,
    kind: "editorial",
    provenance: "editorial",
    headingUr,
    headingEn,
    bodyUr,
    bodyEn,
    minutes: 0,
  };
}

function verifiedHadithBlock(
  dossier: SermonDossier,
  primaryId: string,
  record: VerifiedHadithRecord,
): SermonCompositionBlock | null {
  const source = dossier.primaryTexts?.find((item) => item.id === primaryId);
  if (!source || source.kind !== "hadith" || !record.exactArabic) return null;

  return {
    id: `hadith-${primaryId}`,
    kind: "hadith",
    provenance: "source-grounded",
    headingUr: source.refUr,
    headingEn: source.refEn,
    bodyUr: source.explanationUr,
    bodyEn: source.explanationEn,
    arabic: record.exactArabic,
    citationUr: record.verifiedReferenceUr ?? record.citedReferenceUr,
    citationEn: record.verifiedReferenceEn ?? record.citedReferenceEn,
    sourceUrl: record.verifiedSourceUrl ?? record.sourceUrl,
    minutes: 0,
  };
}

function quranBlocks(dossier: SermonDossier, limit: number): SermonCompositionBlock[] {
  return (dossier.primaryTexts ?? [])
    .filter((item) => item.kind === "quran" && item.quranLocation)
    .slice(0, limit)
    .flatMap((item) => {
      const location = item.quranLocation!;
      const ayah = ahmedgrafQuranReference.getAyah(location.surah, location.ayah);
      if (!ayah) return [];
      return [
        {
          id: `quran-${item.id}`,
          kind: "quran" as const,
          provenance: "source-grounded" as const,
          headingUr: item.refUr,
          headingEn: item.refEn,
          bodyUr: item.explanationUr,
          bodyEn: item.explanationEn,
          arabic: ayah.text,
          citationUr: item.refUr,
          citationEn: item.refEn,
          minutes: 0,
        },
      ];
    });
}

function hadithBlocks(dossier: SermonDossier, limit: number): SermonCompositionBlock[] {
  return (dossier.primaryTexts ?? [])
    .filter((item) => item.kind === "hadith")
    .flatMap((item) => {
      const verified = verifiedHadithForDossierText(item.id);
      if (!verified) return [];
      const block = verifiedHadithBlock(dossier, item.id, verified);
      return block ? [block] : [];
    })
    .slice(0, limit);
}

function scholarBlocks(dossier: SermonDossier, limit: number): SermonCompositionBlock[] {
  const blocks: SermonCompositionBlock[] = [];

  for (const perspective of dossier.perspectives) {
    for (const row of perspective.sourceGroundedUr ?? []) {
      const en = perspective.sourceGroundedEn?.find(
        (item) => item.heading === row.heading,
      );
      blocks.push({
        id: `scholar-${perspective.id}-${blocks.length + 1}`,
        kind: "scholar",
        provenance: "source-grounded",
        headingUr: `${perspective.nameUr} — ${row.heading}`,
        headingEn: `${perspective.nameEn} — ${en?.heading ?? row.heading}`,
        bodyUr: row.explanation,
        bodyEn: en?.explanation ?? perspective.coreEn,
        citationUr: row.exactRef,
        citationEn: en?.exactRef ?? perspective.sourceTitleEn,
        sourceUrl: row.sourceUrl ?? perspective.sourceUrl,
        minutes: 0,
      });
      if (blocks.length >= limit) return blocks;
    }
  }

  return blocks;
}

function editorialFlowBlocks(
  dossier: SermonDossier,
  limit: number,
): SermonCompositionBlock[] {
  const urRows = dossier.pulpitFlowUr.slice(0, limit);
  const enRows = dossier.pulpitFlowEn.slice(0, limit);

  return urRows.map((row, index) =>
    editorial(
      `flow-${index + 1}`,
      row.heading,
      enRows[index]?.heading ?? row.heading,
      row.body,
      enRows[index]?.body ?? row.body,
    ),
  );
}

function blockWeight(block: SermonCompositionBlock): number {
  if (block.id === "opening") return 1.2;
  if (block.kind === "quran") return 1.4;
  if (block.kind === "hadith") return 2.3;
  if (block.kind === "scholar") return 1.8;
  if (block.id === "synthesis") return 1.4;
  if (block.id === "closing") return 1;
  return 1.5;
}

function allocateMinutes(
  blocks: readonly SermonCompositionBlock[],
  duration: SermonDuration,
): SermonCompositionBlock[] {
  if (!blocks.length) return [];

  const base = blocks.map((block) => ({ block, minutes: 1 }));
  let remaining = duration - base.length;

  if (remaining < 0) {
    return blocks.map((block, index) => ({
      ...block,
      minutes: index < duration ? 1 : 0,
    }));
  }

  const totalWeight = blocks.reduce((sum, block) => sum + blockWeight(block), 0);
  const shares = blocks.map((block, index) => {
    const raw = totalWeight > 0
      ? (remaining * blockWeight(block)) / totalWeight
      : 0;
    const whole = Math.floor(raw);
    base[index].minutes += whole;
    return { index, fraction: raw - whole };
  });

  remaining = duration - base.reduce((sum, item) => sum + item.minutes, 0);
  shares
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .slice(0, remaining)
    .forEach(({ index }) => {
      base[index].minutes += 1;
    });

  return base.map(({ block, minutes }) => ({ ...block, minutes }));
}

function buildBlockers(
  dossier: SermonDossier,
  duration: SermonDuration,
  quranCount: number,
  hadithCount: number,
  scholarCount: number,
): { ur: string[]; en: string[] } {
  const ur: string[] = [];
  const en: string[] = [];

  if (hadithCount === 0 && scholarCount === 0) {
    ur.push(
      "اس موضوع میں ابھی کوئی لفظ بہ لفظ مصدقہ روایت یا ماخذ سے ثابت علمی توضیح دستیاب نہیں؛ مکمل مجلس خودکار طور پر نہیں بنائی جائے گی۔",
    );
    en.push(
      "No exact verified narration or source-grounded scholarly explanation is available yet, so a full sermon will not be assembled automatically.",
    );
  }

  const minimumCore = duration === 20 ? 2 : duration === 30 ? 3 : 4;
  if (hadithCount + scholarCount < minimumCore) {
    ur.push(
      `${duration} منٹ کی مجلس کے لیے کم از کم ${minimumCore} بنیادی مصدقہ روایتی/علمی حصے درکار ہیں؛ ابھی ${hadithCount + scholarCount} موجود ہیں۔`,
    );
    en.push(
      `A ${duration}-minute sermon requires at least ${minimumCore} core verified hadith/scholarly blocks; ${hadithCount + scholarCount} are available.`,
    );
  }

  if (quranCount === 0) {
    ur.push(
      "اس dossier میں داخلی قرآن corpus سے منسلک قرآنی بنیاد موجود نہیں؛ مجلس بن سکتی ہے مگر اسے قرآنی بنیاد کے بغیر واضح طور پر پیش کیا جائے گا۔",
    );
    en.push(
      "This dossier has no Qur'anic anchor linked to the internal corpus; the sermon may still be assembled, but this absence is kept explicit.",
    );
  }

  return { ur, en };
}

export function buildGroundedFullSermon(
  topicId: string,
  duration: SermonDuration,
  locale: SermonLocale = "ur",
): GroundedFullSermon | null {
  const dossier = getTopicDossier(topicId);
  if (!dossier) return null;

  const limits = BLOCK_LIMITS[duration];
  const quran = quranBlocks(dossier, limits.quran);
  const hadith = hadithBlocks(dossier, limits.hadith);
  const scholar = scholarBlocks(dossier, limits.scholar);
  const blockers = buildBlockers(
    dossier,
    duration,
    quran.length,
    hadith.length,
    scholar.length,
  );

  const hardBlocked = hadith.length + scholar.length <
    (duration === 20 ? 2 : duration === 30 ? 3 : 4);

  const rawBlocks: SermonCompositionBlock[] = hardBlocked
    ? []
    : [
        editorial(
          "opening",
          "تمہید — تدوینی",
          "Opening — editorial",
          dossier.governingQuestionUr,
          dossier.governingQuestionEn,
        ),
        ...quran,
        ...hadith,
        ...scholar,
        ...editorialFlowBlocks(dossier, limits.editorialFlow),
        editorial(
          "synthesis",
          "مرکزی جمع بندی — تدوینی",
          "Central synthesis — editorial",
          dossier.synthesisUr.join(" "),
          dossier.synthesisEn.join(" "),
        ),
        editorial(
          "closing",
          "اختتام — تدوینی",
          "Closing — editorial",
          dossier.closingUr,
          dossier.closingEn,
        ),
      ];
  const blocks = hardBlocked
    ? []
    : allocateMinutes(rawBlocks, duration);

  return {
    topicId,
    duration,
    locale,
    titleUr: dossier.titleUr,
    titleEn: dossier.titleEn,
    ready: !hardBlocked,
    blockersUr: blockers.ur,
    blockersEn: blockers.en,
    blocks,
    verifiedHadithCount: hadith.length,
    quranCount: quran.length,
    scholarCount: scholar.length,
    editorialCount: blocks.filter((item) => item.provenance === "editorial").length,
  };
}

export function validateGroundedFullSermon(
  sermon: GroundedFullSermon,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const block of sermon.blocks) {
    if (ids.has(block.id)) errors.push(`duplicate block id: ${block.id}`);
    ids.add(block.id);

    if (block.provenance === "source-grounded") {
      if (!block.citationUr || !block.citationEn) {
        errors.push(`${block.id}: source-grounded block has no complete citation`);
      }
      if (
        (block.kind === "quran" || block.kind === "hadith") &&
        !block.arabic?.trim()
      ) {
        errors.push(`${block.id}: primary source block has no exact Arabic`);
      }
      if (block.kind === "hadith" && block.arabic?.includes("...")) {
        errors.push(`${block.id}: verified hadith block contains ellipsis`);
      }
    }

    if (block.provenance === "editorial") {
      if (block.kind !== "editorial") {
        errors.push(`${block.id}: editorial provenance used on source block`);
      }
      if (block.citationUr || block.citationEn || block.sourceUrl) {
        errors.push(`${block.id}: editorial block must not impersonate a source`);
      }
    }
  }

  if (sermon.ready && sermon.blocks.length === 0) {
    errors.push("ready sermon has no blocks");
  }
  if (
    sermon.ready &&
    sermon.blocks.reduce((sum, block) => sum + block.minutes, 0) !== sermon.duration
  ) {
    errors.push("block minutes do not add up to sermon duration");
  }
  if (!sermon.ready && sermon.blocks.length > 0) {
    errors.push("blocked sermon exposes composed blocks");
  }

  const counted = {
    hadith: sermon.blocks.filter((item) => item.kind === "hadith").length,
    quran: sermon.blocks.filter((item) => item.kind === "quran").length,
    scholar: sermon.blocks.filter((item) => item.kind === "scholar").length,
    editorial: sermon.blocks.filter((item) => item.kind === "editorial").length,
  };

  if (counted.hadith !== sermon.verifiedHadithCount) {
    errors.push("verifiedHadithCount does not match blocks");
  }
  if (counted.quran !== sermon.quranCount) {
    errors.push("quranCount does not match blocks");
  }
  if (counted.scholar !== sermon.scholarCount) {
    errors.push("scholarCount does not match blocks");
  }
  if (counted.editorial !== sermon.editorialCount) {
    errors.push("editorialCount does not match blocks");
  }

  return errors;
}

export function buildGroundedFullSermonText(
  sermon: GroundedFullSermon,
  locale: SermonLocale,
): string {
  const ur = locale === "ur";

  if (!sermon.ready) {
    return [
      ur ? "مکمل مصدقہ مجلس ابھی تیار نہیں" : "Verified full sermon not ready",
      "",
      ...(ur ? sermon.blockersUr : sermon.blockersEn).map((item) => `• ${item}`),
    ].join("\n");
  }

  const lines: string[] = [
    ur ? sermon.titleUr : sermon.titleEn,
    ur ? `${sermon.duration} منٹ — مصدقہ مجلس` : `${sermon.duration} min — verified sermon`,
    "",
    ur
      ? "اصول: اصل نصوص و علمی توضیحات ماخذی ہیں؛ تمہید، ربط، جمع بندی اور اختتام تدوینی حصے ہیں۔"
      : "Rule: primary texts and scholarly explanations are source-grounded; opening, transitions, synthesis, and closing are editorial.",
  ];

  for (const block of sermon.blocks) {
    lines.push(
      "",
      `${ur ? block.headingUr : block.headingEn} — ${block.minutes} ${ur ? "منٹ" : "min"}`,
      block.provenance === "source-grounded"
        ? ur
          ? "[ماخذی بنیاد]"
          : "[Source-grounded]"
        : ur
          ? "[تدوینی حصہ]"
          : "[Editorial]",
    );

    if (block.arabic) lines.push(block.arabic);
    lines.push(ur ? block.bodyUr : block.bodyEn);

    const citation = ur ? block.citationUr : block.citationEn;
    if (citation) lines.push(`${ur ? "حوالہ" : "Reference"}: ${citation}`);
  }

  lines.push(
    "",
    ur
      ? "تنبیہ: تدوینی حصوں کو حدیث، آیت یا عالم کے اصل الفاظ کے طور پر نقل نہ کریں۔"
      : "Warning: never present editorial sections as the exact words of a verse, hadith, or scholar.",
  );

  return lines.join("\n");
}
