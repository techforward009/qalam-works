import { createQuranReference } from "./reference";
import type { QuranReferenceMetadata, QuranReferenceProvider } from "./types";

/**
 * Production Quran reference.
 *
 * Required source, still unresolved:
 * an official Taj Company 16-line Indo-Pak Unicode ayah text
 * (Hafizi 16-line edition, not a 9/11/13/14/15-line layout),
 * with a recorded source, edition, script, version, and a license that allows bundling.
 *
 * Not loaded, because none of the available files is that text:
 * - Quran Foundation mushaf 7 is an IndoPak 16-line page layout. Its text API
 *   forbids redistribution and does not identify the string as Taj Company.
 * - QUL 16-line resources are page grids. Tarteel terms treat the content as
 *   proprietary, and the mainstream Indo-Pak string (QuranWBW) says not to distribute it.
 * - DigitalKhatt's MIT Indo-Pak file is a different typesetting, not Taj Company.
 * - Internet Archive Taj scans are page images. OCR of them is not a verified corpus,
 *   and the publisher's own app claims copyright.
 *
 * Do not derive this text from Uthmani. The matcher accepts a later provider
 * without changing the correction engine.
 */
export const UNRESOLVED_QURAN_METADATA: QuranReferenceMetadata = {
  referenceName: "unresolved",
  referenceEdition: "16-line target not loaded",
  referenceScript: "unresolved",
  referenceSource: "",
  referenceVersion: "",
  referenceLicense: "",
  referenceVerifiedAt: null,
  verseCountConvention: "none",
  provenanceStatus: "unresolved",
  tajCompanyOfficial: false,
  referenceHash: "",
  expectedHash: "",
};

export const unresolvedQuranReference: QuranReferenceProvider = createQuranReference([], UNRESOLVED_QURAN_METADATA);
