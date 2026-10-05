export type HadithTranslationFields = {
  translationUr?: string;
  translationEn?: string;
  translationStatus?: "editorial" | "published";
  translationSourceLabelUr?: string;
  translationSourceLabelEn?: string;
};

type TranslationRecord = HadithTranslationFields & {
  id: string;
  status: string;
  exactArabic?: string;
  translationArabic?: string;
};

export function validateHadithTranslation(record: TranslationRecord): string[] {
  const hasTranslation = Boolean(record.translationUr || record.translationEn || record.translationStatus || record.translationArabic);
  if (!hasTranslation) return [];
  const errors: string[] = [];
  if (record.status !== "verified") errors.push(`${record.id}: translation requires verified Arabic`);
  if (!record.exactArabic || record.translationArabic !== record.exactArabic) {
    errors.push(`${record.id}: translation Arabic snapshot does not match exactArabic`);
  }
  if (!record.translationUr?.trim() || !record.translationEn?.trim()) {
    errors.push(`${record.id}: bilingual translation is incomplete`);
  }
  if (record.translationStatus !== "editorial" && record.translationStatus !== "published") {
    errors.push(`${record.id}: translation provenance is missing`);
  }
  if (!record.translationSourceLabelUr?.trim() || !record.translationSourceLabelEn?.trim()) {
    errors.push(`${record.id}: translation source labels are incomplete`);
  }
  return errors;
}

export function hadithTranslationFields(record: TranslationRecord): HadithTranslationFields {
  if (!record.translationStatus || validateHadithTranslation(record).length) return {};
  return {
    translationUr: record.translationUr,
    translationEn: record.translationEn,
    translationStatus: record.translationStatus,
    translationSourceLabelUr: record.translationSourceLabelUr,
    translationSourceLabelEn: record.translationSourceLabelEn,
  };
}
