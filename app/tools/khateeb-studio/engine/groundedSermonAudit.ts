import {
  validateGroundedFullSermon,
  type GroundedFullSermon,
} from "./groundedFullSermon";

export type GroundedSermonAuditItem = {
  id: string;
  level: "pass" | "warning" | "error";
  titleUr: string;
  titleEn: string;
  detailUr: string;
  detailEn: string;
};

export type GroundedSermonAudit = {
  status: "pass" | "warning" | "error";
  items: readonly GroundedSermonAuditItem[];
  uniqueSourceCount: number;
  sourceGroundedBlockCount: number;
  editorialBlockCount: number;
};

function sourceDiversityTarget(duration: number): number {
  if (duration >= 45) return 4;
  if (duration >= 30) return 3;
  return 2;
}

export function auditGroundedFullSermon(
  sermon: GroundedFullSermon,
): GroundedSermonAudit {
  const items: GroundedSermonAuditItem[] = [];
  const integrityErrors = validateGroundedFullSermon(sermon);
  const sourceGrounded = sermon.blocks.filter(
    (block) => block.provenance === "source-grounded",
  );
  const editorial = sermon.blocks.filter(
    (block) => block.provenance === "editorial",
  );
  const uniqueSourceCount = sermon.sourceLedger.length;

  if (integrityErrors.length) {
    items.push({
      id: "integrity",
      level: "error",
      titleUr: "ساختی سالمیت",
      titleEn: "Structural integrity",
      detailUr: integrityErrors.join("؛ "),
      detailEn: integrityErrors.join("; "),
    });
  } else {
    items.push({
      id: "integrity",
      level: "pass",
      titleUr: "ساختی سالمیت",
      titleEn: "Structural integrity",
      detailUr:
        "تمام ماخذی حصے اپنے حوالوں سے منسلک ہیں اور تدوینی حصے الگ شناخت رکھتے ہیں۔",
      detailEn:
        "All source-grounded blocks are linked to references and editorial blocks remain separately identified.",
    });
  }

  const allocatedMinutes = sermon.blocks.reduce(
    (sum, block) => sum + block.minutes,
    0,
  );
  items.push({
    id: "duration",
    level:
      sermon.ready && allocatedMinutes === sermon.duration ? "pass" : "error",
    titleUr: "وقت کی تقسیم",
    titleEn: "Duration allocation",
    detailUr: sermon.ready
      ? `${allocatedMinutes} منٹ کے تمام حصے واضح طور پر تقسیم ہیں۔`
      : "مجلس ابھی مواد کی کمی کے باعث فعال نہیں۔",
    detailEn: sermon.ready
      ? `All ${allocatedMinutes} minutes are explicitly allocated across sermon blocks.`
      : "The sermon is not active because core evidence is insufficient.",
  });

  const diversityTarget = sourceDiversityTarget(sermon.duration);
  items.push({
    id: "source-diversity",
    level: uniqueSourceCount >= diversityTarget ? "pass" : "warning",
    titleUr: "ماخذی تنوع",
    titleEn: "Source diversity",
    detailUr:
      uniqueSourceCount >= diversityTarget
        ? `${uniqueSourceCount} منفرد ماخذی حوالوں سے مجلس کا توازن بہتر ہے۔`
        : `صرف ${uniqueSourceCount} منفرد ماخذی حوالے ہیں؛ ${sermon.duration} منٹ کے لیے ${diversityTarget} یا زیادہ مراجع بہتر توازن دیں گے۔`,
    detailEn:
      uniqueSourceCount >= diversityTarget
        ? `${uniqueSourceCount} unique source references give the sermon useful source diversity.`
        : `Only ${uniqueSourceCount} unique source references are present; ${diversityTarget} or more would give a stronger balance for ${sermon.duration} minutes.`,
  });

  items.push({
    id: "quran-foundation",
    level: sermon.quranCount > 0 ? "pass" : "warning",
    titleUr: "قرآنی بنیاد",
    titleEn: "Qur'anic foundation",
    detailUr:
      sermon.quranCount > 0
        ? `${sermon.quranCount} قرآنی اندراج داخلی احمد گراف متن سے لیا گیا ہے۔`
        : "اس موضوع کی تیار مجلس میں داخلی قرآن corpus سے منسلک آیت شامل نہیں۔",
    detailEn:
      sermon.quranCount > 0
        ? `${sermon.quranCount} Qur'anic record(s) come from the internal AhmedGraf text.`
        : "This prepared sermon has no verse linked to the internal Qur'an corpus.",
  });

  items.push({
    id: "verified-hadith",
    level: sermon.verifiedHadithCount > 0 ? "pass" : "warning",
    titleUr: "مصدقہ روایات",
    titleEn: "Verified narrations",
    detailUr:
      sermon.verifiedHadithCount > 0
        ? `${sermon.verifiedHadithCount} روایتیں لفظ بہ لفظ مصدقہ متن سے شامل ہیں۔`
        : "اس مجلس میں کوئی لفظ بہ لفظ مصدقہ روایت شامل نہیں۔",
    detailEn:
      sermon.verifiedHadithCount > 0
        ? `${sermon.verifiedHadithCount} narration(s) use exact verified source text.`
        : "No exact verified narration is included in this sermon.",
  });

  const groundedRatio =
    sermon.blocks.length > 0
      ? sourceGrounded.length / sermon.blocks.length
      : 0;
  items.push({
    id: "editorial-balance",
    level: groundedRatio >= 0.5 ? "pass" : "warning",
    titleUr: "ماخذ اور تدوین کا توازن",
    titleEn: "Source/editorial balance",
    detailUr:
      groundedRatio >= 0.5
        ? "مجلس کا کم از کم نصف حصہ واضح ماخذی بنیاد رکھتا ہے۔"
        : "تدوینی حصے نسبتاً زیادہ ہیں؛ مزید ماخذی مواد شامل کرنا بہتر ہوگا۔",
    detailEn:
      groundedRatio >= 0.5
        ? "At least half of the sermon blocks are explicitly source-grounded."
        : "Editorial material outweighs source-grounded blocks; adding more verified evidence would improve balance.",
  });

  const duplicatedArabic = new Set<string>();
  const seenArabic = new Set<string>();
  for (const block of sourceGrounded) {
    if (!block.arabic) continue;
    if (seenArabic.has(block.arabic)) duplicatedArabic.add(block.arabic);
    seenArabic.add(block.arabic);
  }
  items.push({
    id: "duplicate-primary-text",
    level: duplicatedArabic.size === 0 ? "pass" : "warning",
    titleUr: "اصل متن کی تکرار",
    titleEn: "Primary-text duplication",
    detailUr:
      duplicatedArabic.size === 0
        ? "ایک ہی اصل عربی متن کو متعدد حصوں میں بلا ضرورت دہرایا نہیں گیا۔"
        : `${duplicatedArabic.size} اصل عربی متن ایک سے زیادہ مرتبہ آیا ہے؛ تدوین میں تکرار چیک کریں۔`,
    detailEn:
      duplicatedArabic.size === 0
        ? "No exact Arabic primary text is unnecessarily repeated across multiple blocks."
        : `${duplicatedArabic.size} exact Arabic text(s) appear more than once; review for repetition.`,
  });

  const status = items.some((item) => item.level === "error")
    ? "error"
    : items.some((item) => item.level === "warning")
      ? "warning"
      : "pass";

  return {
    status,
    items,
    uniqueSourceCount,
    sourceGroundedBlockCount: sourceGrounded.length,
    editorialBlockCount: editorial.length,
  };
}
