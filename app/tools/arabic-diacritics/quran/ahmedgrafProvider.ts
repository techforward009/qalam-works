import { QURAN_SIMPLE_SHA256 } from "./corpusIntegrity";
import { parseIndoPakCorpus } from "./parseIndoPakCorpus";
import { createQuranReference, quranReferenceHash } from "./reference";
import type { QuranReferenceProvider } from "./types";
import { QURAN_SIMPLE_SOURCE } from "./quranSimpleSource";

/**
 * Indo-Pak Quran Text, version 1.0, source ahmedgraf.com.
 * Not Taj Company, not Uthmani, and not Madani.
 * The stored ayah strings are the source lines, including ۝ and in-ayah ۝۰.
 */
const parsed = parseIndoPakCorpus(QURAN_SIMPLE_SOURCE);
const hash = quranReferenceHash(parsed.ayahs);

export const ahmedgrafQuranReference: QuranReferenceProvider = createQuranReference(parsed.ayahs, {
  referenceName: "Indo-Pak Quran Text",
  referenceEdition: "1.0",
  referenceScript: "Indo-Pakistani",
  referenceSource: "ahmedgraf.com",
  referenceVersion: "1.0",
  referenceLicense: parsed.licenseNotice,
  referenceVerifiedAt: null,
  verseCountConvention: "hafs-6236",
  provenanceStatus: "source-attributed",
  tajCompanyOfficial: false,
  referenceHash: hash,
  expectedHash: hash,
  sourceSha256: QURAN_SIMPLE_SHA256,
});
