export type QuranProvenance = "verified" | "unresolved" | "test-fixture";

export type QuranScript = "Indo-Pakistani" | "Uthmani" | "unresolved";

export type QuranVerseConvention = "hafs-6236" | "source-defined" | "partial-test" | "none";

/** Immutable ayah. `words` is optional metadata; the matcher derives slices from `text`. */
export type QuranAyah = {
  id: string;
  surah: number;
  ayah: number;
  text: string;
  words?: readonly { id: string; text: string }[];
};

/**
 * Provenance of the loaded reference. Empty license/source means unresolved.
 * `tajCompanyOfficial` may be true only for a verified 16-line Indo-Pak text.
 */
export type QuranReferenceMetadata = {
  referenceName: string;
  referenceEdition: string;
  referenceScript: QuranScript;
  referenceSource: string;
  referenceVersion: string;
  referenceLicense: string;
  referenceVerifiedAt: string | null;
  verseCountConvention: QuranVerseConvention;
  provenanceStatus: QuranProvenance;
  tajCompanyOfficial: boolean;
  referenceHash: string;
  expectedHash: string;
};

export type QuranMatchStatus = "verified" | "corrected" | "unchanged" | "ambiguous" | "no-match";

export type QuranSegment = {
  input: string;
  normalizedInput: string;
  output: string;
  status: QuranMatchStatus;
  matchedReferenceId: string | null;
  referenceText: string | null;
  category: string;
};

export type QuranRestoreResult = {
  input: string;
  output: string;
  segments: QuranSegment[];
  metadata: QuranReferenceMetadata;
  referenceReady: boolean;
};

export type QuranCandidate = {
  ayahId: string;
  kind: "ayah" | "word";
  exact: string;
  key: string;
};

export type QuranReferenceProvider = {
  getMetadata(): QuranReferenceMetadata;
  getAyah(surah: number, ayah: number): QuranAyah | null;
  listAyahs(): readonly QuranAyah[];
  findExact(normalizedText: string): readonly QuranAyah[];
  findCandidates(normalizedText: string): readonly QuranCandidate[];
};
