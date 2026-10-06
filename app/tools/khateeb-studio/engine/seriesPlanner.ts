import type { SermonDossier, ScholarPerspective } from "./topicDossier";
import { getCuratedMajlisSeries } from "./curatedSeries";
import type { PreparedSessionMaterial } from "./preparedSeries";

export type MajlisSeriesLength = 1 | 3 | 5 | 10;

export type MajlisSeriesSession = {
  preparation?: PreparedSessionMaterial;
  number: number;
  titleUr: string;
  titleEn: string;
  purposeUr: string;
  purposeEn: string;
  materialUr: readonly string[];
  materialEn: readonly string[];
  sourceUr: string;
  sourceEn: string;
  previousBridgeUr?: string;
  previousBridgeEn?: string;
  nextBridgeUr?: string;
  nextBridgeEn?: string;
  quranUr?: readonly string[];
  quranEn?: readonly string[];
  avoidRepeatUr?: string;
  avoidRepeatEn?: string;
  takeawayUr?: string;
  takeawayEn?: string;
};

export type MajlisSeriesPlan = {
  length: MajlisSeriesLength;
  titleUr: string;
  titleEn: string;
  aimUr: string;
  aimEn: string;
  sessions: readonly MajlisSeriesSession[];
  finalUr: string;
  finalEn: string;
};

type Candidate = {
  titleUr: string;
  titleEn: string;
  purposeUr: string;
  purposeEn: string;
  materialUr: readonly string[];
  materialEn: readonly string[];
  sourceUr: string;
  sourceEn: string;
};

function perspectiveCandidate(item: ScholarPerspective): Candidate {
  return {
    titleUr: item.sourceTitleUr,
    titleEn: item.sourceTitleEn,
    purposeUr: item.coreUr,
    purposeEn: item.coreEn,
    materialUr: [item.coreUr, ...item.explanationUr, item.useUr],
    materialEn: [item.coreEn, ...item.explanationEn, item.useEn],
    sourceUr: item.nameUr,
    sourceEn: item.nameEn,
  };
}

function candidatesFor(dossier: SermonDossier): readonly Candidate[] {
  const foundation: Candidate = {
    titleUr: "بنیادِ بحث اور مرکزی سوال",
    titleEn: "Foundation and governing question",
    purposeUr: dossier.thesisUr,
    purposeEn: dossier.thesisEn,
    materialUr: [dossier.thesisUr, dossier.governingQuestionUr],
    materialEn: [dossier.thesisEn, dossier.governingQuestionEn],
    sourceUr: "مرکزی تحقیقی دستاویز",
    sourceEn: "Core research dossier",
  };

  const scholars = dossier.perspectives.map(perspectiveCandidate);

  const speaking = dossier.pulpitFlowUr.map((item, index): Candidate => ({
    titleUr: item.heading.replace(/^\d+\.\s*/, ""),
    titleEn: dossier.pulpitFlowEn[index]?.heading.replace(/^\d+\.\s*/, "") ?? item.heading,
    purposeUr: item.body,
    purposeEn: dossier.pulpitFlowEn[index]?.body ?? item.body,
    materialUr: [item.body],
    materialEn: [dossier.pulpitFlowEn[index]?.body ?? item.body],
    sourceUr: "مرتب شدہ منبری ترتیب",
    sourceEn: "Prepared speaking flow",
  }));

  const conclusion: Candidate = {
    titleUr: "جامع نتیجہ اور عملی رخ",
    titleEn: "Synthesis and practical conclusion",
    purposeUr: dossier.synthesisUr.join(" "),
    purposeEn: dossier.synthesisEn.join(" "),
    materialUr: [...dossier.synthesisUr, dossier.closingUr],
    materialEn: [...dossier.synthesisEn, dossier.closingEn],
    sourceUr: "جامع تحقیقی نتیجہ",
    sourceEn: "Research synthesis",
  };

  return [foundation, ...scholars, ...speaking, conclusion];
}

function evenlySelect<T>(items: readonly T[], count: number): readonly T[] {
  if (count >= items.length) return items.slice(0, count);
  if (count <= 1) return [items[0]];
  const picked: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    let index = Math.round((i * (items.length - 1)) / (count - 1));
    while (used.has(index) && index + 1 < items.length) index += 1;
    while (used.has(index) && index - 1 >= 0) index -= 1;
    used.add(index);
    picked.push(items[index]);
  }
  return picked;
}

export function buildMajlisSeries(
  dossier: SermonDossier,
  length: MajlisSeriesLength,
): MajlisSeriesPlan {
  const curated = getCuratedMajlisSeries(dossier.topicId, length);
  if (curated) return curated;

  const pool = candidatesFor(dossier);
  const chosen = evenlySelect(pool, Math.min(length, pool.length));

  const sessions = chosen.map((item, index): MajlisSeriesSession => {
    const previous = chosen[index - 1];
    const next = chosen[index + 1];
    return {
      number: index + 1,
      titleUr: item.titleUr,
      titleEn: item.titleEn,
      purposeUr: item.purposeUr,
      purposeEn: item.purposeEn,
      materialUr: item.materialUr,
      materialEn: item.materialEn,
      sourceUr: item.sourceUr,
      sourceEn: item.sourceEn,
      previousBridgeUr: previous
        ? `گزشتہ مجلس میں ہم نے «${previous.titleUr}» کی بنیاد رکھی تھی؛ آج اسی سلسلے کو «${item.titleUr}» تک آگے بڑھائیں۔`
        : undefined,
      previousBridgeEn: previous
        ? `The previous session established “${previous.titleEn}”; today the series advances to “${item.titleEn}”.`
        : undefined,
      nextBridgeUr: next
        ? `اگلی مجلس میں یہی بحث «${next.titleUr}» کے مرحلے میں داخل ہوگی۔`
        : undefined,
      nextBridgeEn: next
        ? `The next session carries this argument into “${next.titleEn}”.`
        : undefined,
    };
  });

  return {
    length,
    titleUr:
      length === 1
        ? dossier.titleUr
        : `${length === 3 ? "سہ روزہ" : length === 5 ? "خمسہ" : "عشرۂ"} مجالس — ${dossier.titleUr}`,
    titleEn:
      length === 1
        ? dossier.titleEn
        : `${length}-session majlis series — ${dossier.titleEn}`,
    aimUr:
      length === 1
        ? dossier.thesisUr
        : `اس سلسلے کا مقصد ایک ہی موضوع کو بار بار دہرانا نہیں، بلکہ اسے مرحلہ وار آگے بڑھانا ہے: بنیاد، علمی توضیح، مختلف زاویے، عملی نتیجہ اور جامع اختتام۔`,
    aimEn:
      length === 1
        ? dossier.thesisEn
        : "The aim is not to repeat one sermon several times, but to advance the subject in stages: foundation, scholarly development, distinct angles, practical implications, and synthesis.",
    sessions,
    finalUr:
      length === 1
        ? dossier.closingUr
        : `آخری مجلس میں پورے سلسلے کو دوبارہ مختصر طور پر جوڑیں، نئی بحث نہ چھیڑیں، اور مرکزی دینی و اخلاقی نتیجے کو واضح عملی عہد پر ختم کریں۔ ${dossier.closingUr}`,
    finalEn:
      length === 1
        ? dossier.closingEn
        : `In the final session, gather the whole series rather than opening a new line of argument, and end with a clear practical commitment. ${dossier.closingEn}`,
  };
}

export function buildMajlisSeriesText(
  plan: MajlisSeriesPlan,
  locale: "ur" | "en",
): string {
  const ur = locale === "ur";
  const lines: string[] = [
    ur ? plan.titleUr : plan.titleEn,
    "",
    `${ur ? "مجموعی علمی مقصد" : "Overall aim"}: ${ur ? plan.aimUr : plan.aimEn}`,
  ];

  for (const session of plan.sessions) {
    lines.push(
      "",
      `${ur ? "مجلس" : "Session"} ${session.number}: ${ur ? session.titleUr : session.titleEn}`,
      `${ur ? "اس مجلس کا مقصد" : "Purpose"}: ${ur ? session.purposeUr : session.purposeEn}`,
      `${ur ? "علمی بنیاد" : "Source basis"}: ${ur ? session.sourceUr : session.sourceEn}`,
    );
    const previous = ur ? session.previousBridgeUr : session.previousBridgeEn;
    if (previous) lines.push(`${ur ? "ربطِ گزشتہ" : "Bridge from previous"}: ${previous}`);
    const quran = ur ? session.quranUr : session.quranEn;
    if (quran?.length) {
      lines.push(ur ? "قرآنی بنیاد:" : "Qur'anic foundation:");
      for (const item of quran) lines.push(`• ${item}`);
    }
    for (const point of ur ? session.materialUr : session.materialEn) lines.push(`• ${point}`);
    const takeaway = ur ? session.takeawayUr : session.takeawayEn;
    if (takeaway) lines.push(`${ur ? "حاصلِ مجلس" : "Session takeaway"}: ${takeaway}`);
    const avoid = ur ? session.avoidRepeatUr : session.avoidRepeatEn;
    if (avoid) lines.push(`${ur ? "تکرار سے بچیں" : "Avoid repetition"}: ${avoid}`);
    const next = ur ? session.nextBridgeUr : session.nextBridgeEn;
    if (next) lines.push(`${ur ? "اگلی مجلس کی تمہید" : "Lead into next"}: ${next}`);
  }

  lines.push("", `${ur ? "اختتامی ہدایت" : "Final guidance"}: ${ur ? plan.finalUr : plan.finalEn}`);
  return lines.join("\n");
}
