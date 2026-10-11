import type { CustomSermonProject } from "../../tools/khateeb-studio/engine/customSermonProject";

/**
 * Estimated spoken reading time, not a guarantee of actual delivery time.
 * Count each source's original and supplied translation once, as the
 * composed sermon export does, and never count written citation labels.
 */
export const SERMON_SPEAKING_RATES = {
  urduWordsPerMinute: 95,
  arabicWordsPerMinute: 65,
  translatedWordsPerMinute: 90,
  pausePerUniqueSourceMinutes: 0.15,
};

type RateOverrides = Partial<typeof SERMON_SPEAKING_RATES>;
type TimedSermon = Pick<CustomSermonProject, "sections" | "evidence" | "selectedEvidenceIds">;

function words(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export function assessSermonSpeakingTime(
  project: TimedSermon,
  rateOverrides: RateOverrides = {},
) {
  const rates = { ...SERMON_SPEAKING_RATES, ...rateOverrides };
  if (Object.values(rates).some(rate => !Number.isFinite(rate) || rate <= 0))
    throw new Error("invalid-speaking-rates");

  const selectedIds = new Set(project.selectedEvidenceIds);
  const citedIds = new Set(
    project.sections.flatMap(section => section.evidenceIds).filter(id => selectedIds.has(id)),
  );
  const allSources = project.evidence.filter(source => citedIds.has(source.id));
  const originals = new Set<string>();
  const translations = new Set<string>();
  for (const source of allSources) {
    const original = source.arabic?.trim();
    if (!original || originals.has(original)) continue;
    originals.add(original);
    const translation = source.detailUr.split(/\nمترجم:/u)[0]?.trim();
    if (translation) translations.add(translation);
  }

  const wordCounts = project.sections.map(section =>
    words(section.userText
      .split(/\n/u)
      .filter(line => !/^\s*(?:حوالہ|Reference)\s*:/iu.test(line))
      .join("\n")),
  );
  const proseWords = wordCounts.reduce((sum, count) => sum + count, 0);
  const arabicWords = [...originals].reduce((sum, text) => sum + words(text), 0);
  const translationWords = [...translations].reduce((sum, text) => sum + words(text), 0);
  const minutes = proseWords / rates.urduWordsPerMinute
    + arabicWords / rates.arabicWordsPerMinute
    + translationWords / rates.translatedWordsPerMinute
    + originals.size * rates.pausePerUniqueSourceMinutes;

  return {
    estimatedMinutes: Number(minutes.toFixed(1)),
    proseWords,
    arabicWords,
    translationWords,
    sectionWords: wordCounts,
    distinctSourceRecords: citedIds.size,
    distinctReadings: originals.size,
    isEstimate: true as const,
  };
}
