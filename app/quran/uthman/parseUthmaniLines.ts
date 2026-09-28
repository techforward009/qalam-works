const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const BASMALA_WITH_SHADDA = "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const UNMARKED_OPENING = "بَرَآءَةٌ";

export type UthmanAyah = {
  surah: number;
  ayah: number;
  text: string;
};

export type UthmanText = {
  ayahs: UthmanAyah[];
  surahAyahCounts: number[];
};

function isOpening(line: string, index: number): boolean {
  if (index === 0) return true;
  if (line.startsWith(BASMALA) || line.startsWith(BASMALA_WITH_SHADDA)) return true;
  return line.startsWith(UNMARKED_OPENING);
}

export function parseUthmaniLines(source: string): UthmanText {
  const withoutBom = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const lines = withoutBom.split(/\r\n|\n|\r/);
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const ayahs: UthmanAyah[] = [];
  const surahAyahCounts: number[] = [];
  let surah = 0;
  let ayah = 0;
  lines.forEach((text, index) => {
    if (isOpening(text, index)) {
      if (surah > 0) surahAyahCounts.push(ayah);
      surah += 1;
      ayah = 1;
    } else {
      ayah += 1;
    }
    ayahs.push({ surah, ayah, text });
  });
  if (surah > 0) surahAyahCounts.push(ayah);
  return { ayahs, surahAyahCounts };
}
