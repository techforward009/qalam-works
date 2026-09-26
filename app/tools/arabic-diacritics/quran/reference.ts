import { quranMatchKey } from "./normalizeQuran";
import type { QuranAyah, QuranCandidate, QuranReferenceMetadata, QuranReferenceProvider } from "./types";

export type ReferenceValidation = {
  ok: boolean;
  ayahCount: number;
  surahCount: number;
  reasons: string[];
};

const HAFS_SURAHS = 114;
const HAFS_AYAHS = 6236;

/** FNV-1a over stable id + exact text. Not a cryptographic seal of a mushaf. */
export function quranReferenceHash(ayahs: readonly QuranAyah[]): string {
  const payload = [...ayahs]
    .sort((a, b) => a.id.localeCompare(b.id, "en"))
    .map((ayah) => `${ayah.id}\t${ayah.text}`)
    .join("\n");
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function hasControlChar(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 0x09) continue;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function contiguousFromOne(numbers: number[]): boolean {
  const sorted = [...numbers].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i] !== i + 1) return false;
  }
  return true;
}

export function validateQuranReference(provider: QuranReferenceProvider): ReferenceValidation {
  const metadata = provider.getMetadata();
  const ayahs = provider.listAyahs();
  const reasons: string[] = [];
  const ids = new Set<string>();
  const locations = new Set<string>();
  const bySurah = new Map<number, number[]>();

  if (!metadata.referenceName) reasons.push("reference name is empty");
  if (metadata.provenanceStatus === "unresolved") {
    reasons.push("Taj Company 16-line Unicode text is not loaded");
  }
  if (metadata.tajCompanyOfficial) {
    if (metadata.provenanceStatus !== "verified") reasons.push("Taj Company claim is not verified");
    if (metadata.referenceEdition !== "16-line") reasons.push("Taj Company claim is not the 16-line edition");
    if (metadata.referenceScript !== "Indo-Pakistani") reasons.push("Taj Company claim is not Indo-Pakistani");
    if (!metadata.referenceSource || !metadata.referenceLicense || !metadata.referenceVerifiedAt) {
      reasons.push("Taj Company claim is missing source, license, or verification date");
    }
  }
  if (metadata.expectedHash && metadata.expectedHash !== quranReferenceHash(ayahs)) {
    reasons.push("reference hash does not match the expected version");
  }

  for (const ayah of ayahs) {
    const location = `${ayah.surah}:${ayah.ayah}`;
    if (ids.has(ayah.id)) reasons.push(`duplicate ayah id ${ayah.id}`);
    ids.add(ayah.id);
    if (ayah.id !== location) reasons.push(`ayah id ${ayah.id} is not surah:ayah`);
    if (locations.has(location)) reasons.push(`duplicate location ${location}`);
    locations.add(location);
    if (ayah.surah < 1 || ayah.surah > HAFS_SURAHS) reasons.push(`surah out of range ${ayah.surah}`);
    if (ayah.ayah < 1) reasons.push(`ayah number out of range ${location}`);
    if (!ayah.text.trim()) reasons.push(`empty reference ${location}`);
    if (hasControlChar(ayah.text)) reasons.push(`invalid characters in ${location}`);
    const list = bySurah.get(ayah.surah) ?? [];
    list.push(ayah.ayah);
    bySurah.set(ayah.surah, list);
  }

  if (metadata.verseCountConvention === "hafs-6236") {
    if (ayahs.length !== HAFS_AYAHS) reasons.push(`expected ${HAFS_AYAHS} ayahs, found ${ayahs.length}`);
    for (let surah = 1; surah <= HAFS_SURAHS; surah += 1) {
      const numbers = bySurah.get(surah);
      if (!numbers) {
        reasons.push(`missing surah ${surah}`);
        continue;
      }
      if (!contiguousFromOne(numbers)) reasons.push(`surah ${surah} ayah numbering is not contiguous`);
    }
  } else if (metadata.verseCountConvention === "source-defined") {
    for (const [surah, numbers] of bySurah) {
      if (!contiguousFromOne(numbers)) reasons.push(`surah ${surah} ayah numbering is not contiguous`);
    }
  }

  return {
    ok: reasons.length === 0,
    ayahCount: ayahs.length,
    surahCount: bySurah.size,
    reasons,
  };
}

/** Indo-Pak matching is allowed only for a validated Indo-Pak provider. Uthmani is refused. */
export function canUseForQuranMode(provider: QuranReferenceProvider): { ok: boolean; reasons: string[] } {
  const metadata = provider.getMetadata();
  const validation = validateQuranReference(provider);
  const reasons = [...validation.reasons];
  if (metadata.referenceScript === "Uthmani") {
    reasons.push("Uthmani text is not the Indo-Pak target");
  }
  if (metadata.referenceScript !== "Indo-Pakistani") {
    reasons.push("reference script is not Indo-Pakistani");
  }
  if (metadata.provenanceStatus === "unresolved") {
    reasons.push("Quranic reference match not established");
  }
  return { ok: validation.ok && metadata.referenceScript === "Indo-Pakistani" && metadata.provenanceStatus !== "unresolved", reasons };
}

export function quranReferenceLabel(metadata: QuranReferenceMetadata): string {
  if (
    metadata.tajCompanyOfficial &&
    metadata.provenanceStatus === "verified" &&
    metadata.referenceEdition === "16-line" &&
    metadata.referenceScript === "Indo-Pakistani" &&
    metadata.referenceSource &&
    metadata.referenceLicense &&
    metadata.referenceVerifiedAt
  ) {
    return "Quran reference: Indo-Pakistani / Taj Company 16-line";
  }
  if (metadata.provenanceStatus === "unresolved") {
    return "Quran reference: unresolved. Taj Company 16-line text is not loaded.";
  }
  if (metadata.provenanceStatus === "source-attributed" && metadata.referenceSource === "ahmedgraf.com") {
    return "Quran reference: Indo-Pak Quran Text — source: ahmedgraf.com";
  }
  return `Quran reference: ${metadata.referenceName} (${metadata.referenceEdition}, ${metadata.referenceScript})`;
}

export function createQuranReference(
  ayahs: readonly QuranAyah[],
  metadata: QuranReferenceMetadata,
): QuranReferenceProvider {
  const frozen = Object.freeze(
    ayahs.map((ayah) =>
      Object.freeze({
        ...ayah,
        text: ayah.text,
        words: ayah.words ? Object.freeze(ayah.words.map((word) => Object.freeze({ ...word }))) : undefined,
      }),
    ),
  );
  const byLocation = new Map(frozen.map((ayah) => [`${ayah.surah}:${ayah.ayah}`, ayah]));
  const byExactKey = new Map<string, QuranAyah[]>();
  for (const ayah of frozen) {
    const key = quranMatchKey(ayah.text);
    if (!key) continue;
    const list = byExactKey.get(key);
    if (list) list.push(ayah);
    else byExactKey.set(key, [ayah]);
  }

  return {
    getMetadata: () => metadata,
    getAyah: (surah, ayah) => byLocation.get(`${surah}:${ayah}`) ?? null,
    listAyahs: () => frozen,
    findExact: (normalizedText) => (normalizedText ? (byExactKey.get(normalizedText) ?? []) : []),
    findCandidates: (normalizedText) => {
      if (!normalizedText) return [];
      const hits: QuranCandidate[] = [];
      for (const ayah of frozen) {
        if (quranMatchKey(ayah.text) === normalizedText) {
          hits.push({ ayahId: ayah.id, kind: "ayah", exact: ayah.text, key: normalizedText });
        }
        for (const piece of ayah.text.split(/\s+/)) {
          if (quranMatchKey(piece) === normalizedText) {
            hits.push({ ayahId: ayah.id, kind: "word", exact: piece, key: normalizedText });
          }
        }
      }
      return hits;
    },
  };
}
