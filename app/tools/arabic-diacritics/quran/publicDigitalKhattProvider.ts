import raw from "../../../../public/quran/indopak-digital-khatt.json";
import { HAFS_AYAH_COUNTS } from "./hafsCounts";
import { createQuranReference, quranReferenceHash } from "./reference";
import type { QuranAyah } from "./types";

/**
 * Public Quran source: risan/quran-json data/digitalkhatt/quran.json,
 * from DigitalKhatt/digitalkhatt-js (MIT), distribution packaged by
 * risan/quran-json (CC BY-SA 4.0). The source strings are immutable.
 */
export const DIGITAL_KHATT_TEXT_SOURCE = {
  repository: "https://github.com/risan/quran-json",
  upstream: "https://github.com/DigitalKhatt/digitalkhatt-js",
  sourceFile: "data/digitalkhatt/quran.json",
  upstreamLicense: "MIT",
  distributionLicense: "CC BY-SA 4.0",
  fontLicense: "SIL OFL-1.1",
} as const;

const source = raw as Record<string, {chapter: number; verse: number; text: string}[]>;
const ayahs: QuranAyah[] = [];
for (let surah = 1; surah <= 114; surah++) {
  const rows = source[String(surah)] ?? [];
  if (rows.length !== HAFS_AYAH_COUNTS[surah - 1]) {
    throw new Error("DigitalKhatt verse count mismatch in surah " + surah);
  }
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row.chapter !== surah || row.verse !== index + 1 || !row.text) {
      throw new Error("Invalid DigitalKhatt verse identity " + surah + ":" + (index + 1));
    }
    ayahs.push({id: surah + ":" + row.verse, surah, ayah: row.verse, text: row.text});
  }
}
if (ayahs.length !== 6236) throw new Error("DigitalKhatt corpus must contain 6236 verses");
const hash = quranReferenceHash(ayahs);
export const publicDigitalKhattQuranReference = createQuranReference(ayahs, {
  referenceName: "DigitalKhatt IndoPak Quran",
  referenceEdition: "risan/quran-json snapshot",
  referenceScript: "Indo-Pakistani",
  referenceSource: DIGITAL_KHATT_TEXT_SOURCE.repository,
  referenceVersion: "snapshot in public/quran/indopak-digital-khatt.json",
  referenceLicense: "MIT (origin); CC BY-SA 4.0 (distribution)",
  referenceVerifiedAt: null,
  verseCountConvention: "hafs-6236",
  provenanceStatus: "source-attributed",
  tajCompanyOfficial: false,
  referenceHash: hash,
  expectedHash: hash,
});
