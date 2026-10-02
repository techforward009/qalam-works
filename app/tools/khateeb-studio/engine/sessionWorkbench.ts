import type { SermonDuration } from "./sermonPrep";
import type { MajlisSeriesSession } from "./seriesPlanner";

export type MajlisWorkbenchBlock = {
  minutes: number;
  headingUr: string;
  headingEn: string;
  bodyUr: readonly string[];
  bodyEn: readonly string[];
};

export type MajlisSessionWorkbench = {
  titleUr: string;
  titleEn: string;
  duration: SermonDuration;
  openingUr: string;
  openingEn: string;
  centralUr: string;
  centralEn: string;
  blocks: readonly MajlisWorkbenchBlock[];
  audienceQuestionUr: string;
  audienceQuestionEn: string;
  ownExampleUr: string;
  ownExampleEn: string;
  voiceGuardUr: string;
  voiceGuardEn: string;
  closingUr: string;
  closingEn: string;
  nextUr?: string;
  nextEn?: string;
};

function timings(duration: SermonDuration): [number, number, number, number] {
  if (duration === 20) return [3, 5, 8, 4];
  if (duration === 45) return [5, 10, 22, 8];
  return [4, 7, 14, 5];
}

function distribute<T>(items: readonly T[], groups: number): readonly T[][] {
  if (!items.length) return Array.from({ length: groups }, () => []);
  const out: T[][] = Array.from({ length: groups }, () => []);
  items.forEach((item, index) => out[index % groups].push(item));
  return out;
}

export function buildSessionWorkbench(
  session: MajlisSeriesSession,
  duration: SermonDuration,
): MajlisSessionWorkbench {
  const [openingMinutes, evidenceMinutes, argumentMinutes, closingMinutes] = timings(duration);
  const materialUr = session.materialUr.length ? session.materialUr : [session.purposeUr];
  const materialEn = session.materialEn.length ? session.materialEn : [session.purposeEn];
  const [urFirst, urSecond] = distribute(materialUr, 2);
  const [enFirst, enSecond] = distribute(materialEn, 2);

  const quranUr = session.quranUr?.length
    ? session.quranUr
    : ["اگر اس مجلس کے لیے قرآنی آیت پہلے سے مصدقہ طور پر محفوظ نہیں تو نئی آیت اندازے سے شامل نہ کریں؛ موضوع کی تحقیقی دستاویز سے تصدیق کریں۔"];
  const quranEn = session.quranEn?.length
    ? session.quranEn
    : ["If no verified Qur'anic anchor is already stored for this session, do not improvise one; verify it from the topic research dossier."];

  const argumentFirstMinutes = Math.max(3, Math.floor(argumentMinutes / 2));
  const argumentSecondMinutes = argumentMinutes - argumentFirstMinutes;

  return {
    titleUr: `مجلس ${session.number} — ${session.titleUr}`,
    titleEn: `Session ${session.number} — ${session.titleEn}`,
    duration,
    openingUr:
      session.previousBridgeUr ??
      `آغاز میں عنوان فوراً سمجھا دینے کے بجائے سامع کے سامنے یہ سوال زندہ کریں: «${session.titleUr}»۔ پہلے مسئلہ محسوس کرائیں، پھر جواب کی طرف بڑھیں۔`,
    openingEn:
      session.previousBridgeEn ??
      `Do not explain the title immediately. Let the audience first feel the question: “${session.titleEn}”, then move toward the answer.`,
    centralUr: session.purposeUr,
    centralEn: session.purposeEn,
    blocks: [
      {
        minutes: openingMinutes,
        headingUr: "آغاز اور مرکزی سوال",
        headingEn: "Opening and governing question",
        bodyUr: [
          session.previousBridgeUr ?? `سامع کے سامنے عنوان کا بنیادی سوال رکھیں: ${session.titleUr}`,
          "ابتدا میں نتیجہ نہ سنائیں؛ مسئلہ، الجھن یا انسانی تجربہ پہلے سامنے آنے دیں۔",
        ],
        bodyEn: [
          session.previousBridgeEn ?? `Put the session's central question before the audience: ${session.titleEn}`,
          "Do not announce the conclusion first; let the human problem become clear.",
        ],
      },
      {
        minutes: evidenceMinutes,
        headingUr: "قرآنی اور علمی بنیاد",
        headingEn: "Qur'anic and scholarly foundation",
        bodyUr: [
          ...quranUr,
          `علمی ماخذ: ${session.sourceUr}`,
          "ماخذ کا نام دلیل کی جگہ نہیں لیتا؛ اصل علمی نکتہ واضح کرکے ہی آگے بڑھیں۔",
        ],
        bodyEn: [
          ...quranEn,
          `Source basis: ${session.sourceEn}`,
          "A scholar's name is not itself the argument; make the verified point clear.",
        ],
      },
      {
        minutes: argumentFirstMinutes,
        headingUr: "استدلال کا پہلا مرحلہ",
        headingEn: "First movement of the argument",
        bodyUr: urFirst.length ? urFirst : [session.purposeUr],
        bodyEn: enFirst.length ? enFirst : [session.purposeEn],
      },
      {
        minutes: argumentSecondMinutes,
        headingUr: "استدلال کا دوسرا مرحلہ اور زندگی سے ربط",
        headingEn: "Second movement and connection to life",
        bodyUr: [
          ...(urSecond.length ? urSecond : [session.takeawayUr ?? session.purposeUr]),
          "یہاں خطیب اپنے مخاطبین کے ماحول سے ایک تازہ اور حقیقی مثال شامل کرے؛ ماخذ عالم کی مخصوص مثال نقل نہ کرے۔",
        ],
        bodyEn: [
          ...(enSecond.length ? enSecond : [session.takeawayEn ?? session.purposeEn]),
          "Add one fresh example from the audience's real environment; do not copy a distinctive example from a source scholar.",
        ],
      },
      {
        minutes: closingMinutes,
        headingUr: "حاصلِ مجلس اور اختتام",
        headingEn: "Takeaway and close",
        bodyUr: [
          session.takeawayUr ?? "مرکزی علمی نتیجہ ایک جملے میں دوبارہ واضح کریں۔",
          session.nextBridgeUr ?? "اختتام پر سامع کے لیے ایک واضح عملی یا فکری سوال چھوڑیں۔",
        ],
        bodyEn: [
          session.takeawayEn ?? "Restate the central conclusion in one clear sentence.",
          session.nextBridgeEn ?? "Leave the audience with one clear practical or intellectual question.",
        ],
      },
    ],
    audienceQuestionUr:
      `سامع سے یہ سوال ضرور پیدا کریں: «${session.titleUr}» میرے اپنے فیصلوں، کردار یا دینی فہم میں کہاں ظاہر ہوتا ہے؟`,
    audienceQuestionEn:
      `Make the audience ask: where does “${session.titleEn}” appear in my own decisions, character, or religious understanding?`,
    ownExampleUr:
      "اپنی مثال کی جگہ: گھر، نوجوان، تعلیم، کاروبار، باہمی اختلاف یا مقامی معاشرت سے ایک مختصر مثال منتخب کریں جو مرکزی دلیل کو روشن کرے۔ مثال دلیل کا بدل نہ بنے۔",
    ownExampleEn:
      "Own-example slot: choose one short example from family, youth, education, business, disagreement, or local social life. The example should illuminate the argument, not replace it.",
    voiceGuardUr:
      session.avoidRepeatUr ??
      "اصل عالم کے مخصوص جملے، مکالمے، لطیفے، مثالیں اور مجلس کی ترتیب نقل نہ کریں۔ علمی نکتہ محفوظ رکھیں، زبان اور منبری تشکیل اپنی رکھیں۔",
    voiceGuardEn:
      session.avoidRepeatEn ??
      "Do not copy a source scholar's distinctive wording, dialogue, anecdotes, examples, or sermon sequence. Preserve the verified idea while keeping the sermonic voice your own.",
    closingUr:
      session.takeawayUr ??
      "اختتام ایک واضح فکری یا عملی نتیجے پر کریں؛ نئی بحث شروع نہ کریں۔",
    closingEn:
      session.takeawayEn ??
      "End on one clear intellectual or practical takeaway; do not open a new argument.",
    nextUr: session.nextBridgeUr,
    nextEn: session.nextBridgeEn,
  };
}

export function buildSessionWorkbenchText(
  workbench: MajlisSessionWorkbench,
  locale: "ur" | "en",
): string {
  const ur = locale === "ur";
  const lines: string[] = [
    ur ? workbench.titleUr : workbench.titleEn,
    `${ur ? "مدت" : "Duration"}: ${workbench.duration} ${ur ? "منٹ" : "minutes"}`,
    "",
    `${ur ? "مرکزی مقصد" : "Central purpose"}: ${ur ? workbench.centralUr : workbench.centralEn}`,
  ];

  for (const block of workbench.blocks) {
    lines.push(
      "",
      `${block.minutes} ${ur ? "منٹ" : "min"} — ${ur ? block.headingUr : block.headingEn}`,
    );
    for (const point of ur ? block.bodyUr : block.bodyEn) lines.push(`• ${point}`);
  }

  lines.push(
    "",
    `${ur ? "سامع کے لیے سوال" : "Audience question"}: ${ur ? workbench.audienceQuestionUr : workbench.audienceQuestionEn}`,
    `${ur ? "اپنی مثال" : "Own example"}: ${ur ? workbench.ownExampleUr : workbench.ownExampleEn}`,
    `${ur ? "اپنی آواز محفوظ رکھیں" : "Protect your own voice"}: ${ur ? workbench.voiceGuardUr : workbench.voiceGuardEn}`,
    `${ur ? "اختتام" : "Closing"}: ${ur ? workbench.closingUr : workbench.closingEn}`,
  );

  if (ur ? workbench.nextUr : workbench.nextEn) {
    lines.push(`${ur ? "اگلی مجلس کی تمہید" : "Lead into next"}: ${ur ? workbench.nextUr : workbench.nextEn}`);
  }

  return lines.join("\n");
}
