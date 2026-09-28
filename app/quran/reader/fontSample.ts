import { surahTitle } from "./metadata";
import { getReaderAyah } from "./model";

export type SampleAyah = { id: string; text: string };

export type FontSampleBlock = {
  id: string;
  label: string;
  ayahs: SampleAyah[];
};

function range(surah: number, from: number, to: number): SampleAyah[] {
  const ayahs: SampleAyah[] = [];
  for (let ayah = from; ayah <= to; ayah += 1) {
    const found = getReaderAyah(surah, ayah);
    if (!found) throw new Error(`missing canonical ayah ${surah}:${ayah}`);
    ayahs.push({ id: found.id, text: found.text });
  }
  return ayahs;
}

/** Canonical AhmedGraf records only. Nothing here is rewritten. */
export function fontComparisonBlocks(): FontSampleBlock[] {
  return [
    { id: "opening", label: "Beginning of the Quran", ayahs: [...range(1, 1, 7), ...range(2, 1, 1)] },
    { id: "pause", label: "Internal pause mark", ayahs: range(2, 2, 2) },
    { id: "long", label: "Long ayah", ayahs: range(2, 282, 282) },
    { id: "maryam", label: surahTitle(19), ayahs: range(19, 1, 4) },
    { id: "closing", label: "End of the Quran", ayahs: range(114, 1, 6) },
  ];
}
