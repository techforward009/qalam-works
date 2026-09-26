import { HAFS_AYAH_COUNTS } from "./hafsCounts";
import type { QuranAyah } from "./types";

const LICENSE_MARK = "# PLEASE DO NOT REMOVE";
const END_SIGN = "\u06dd";
const INTERNAL_ZERO = "\u06f0";
const EASTERN = "\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9";

export type ParsedIndoPakCorpus = {
  ayahs: QuranAyah[];
  licenseNotice: string;
};

function endNumber(line: string): number | null {
  let at = -1;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === END_SIGN && line[i + 1] !== INTERNAL_ZERO) at = i;
  }
  if (at < 0) return null;
  let digits = "";
  for (let i = at + 1; i < line.length && EASTERN.includes(line[i] ?? ""); i += 1) digits += line[i];
  if (!digits) return null;
  const zero = EASTERN.codePointAt(0) ?? 0;
  let value = 0;
  for (const ch of digits) value = value * 10 + (ch.codePointAt(0)! - zero);
  return value;
}

function endMarkerCount(line: string): number {
  let count = 0;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === END_SIGN && line[i + 1] !== INTERNAL_ZERO) count += 1;
  }
  return count;
}

/**
 * One nonempty source line is one ayah.
 * ۝ followed by ۰ is an in-ayah pause and stays inside the line.
 * The trailing ۝ plus its printed number is kept verbatim; it is not used as the id.
 * Ids follow the Hafs surah lengths. The stored line is not normalized.
 */
export function parseIndoPakCorpus(source: string): ParsedIndoPakCorpus {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const licenseAt = text.indexOf(LICENSE_MARK);
  if (licenseAt < 0) throw new Error("IndoPak corpus is missing the ahmedgraf.com license notice");
  const licenseNotice = text.slice(licenseAt).trim();
  if (!licenseNotice.includes("ahmedgraf.com") || !licenseNotice.includes("CHANGING IT IS NOT ALLOWED")) {
    throw new Error("IndoPak corpus license notice is incomplete");
  }
  const lines = text
    .slice(0, licenseAt)
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0);
  if (lines.length !== 6236) throw new Error(`expected 6236 ayah lines, found ${lines.length}`);

  const ayahs: QuranAyah[] = [];
  let index = 0;
  for (let surah = 1; surah <= HAFS_AYAH_COUNTS.length; surah += 1) {
    const count = HAFS_AYAH_COUNTS[surah - 1] ?? 0;
    const first = lines[index];
    const last = lines[index + count - 1];
    if (!first || !last) throw new Error(`surah ${surah} is incomplete`);
    const firstNumber = endNumber(first);
    const lastNumber = endNumber(last);
    if (surah === 1) {
      if (firstNumber !== null) throw new Error("surah 1 ayah 1 should not carry a printed number");
    } else if (firstNumber !== 1) {
      throw new Error(`surah ${surah} does not start at printed ayah 1`);
    }
    if (lastNumber !== count) throw new Error(`surah ${surah} does not end at printed ayah ${count}`);
    for (let ayah = 1; ayah <= count; ayah += 1) {
      const line = lines[index];
      if (!line?.trim()) throw new Error(`empty ayah ${surah}:${ayah}`);
      if (endMarkerCount(line) !== 1) throw new Error(`ayah boundary is ambiguous at ${surah}:${ayah}`);
      if (line.includes(LICENSE_MARK)) throw new Error("license text was parsed as an ayah");
      ayahs.push({ id: `${surah}:${ayah}`, surah, ayah, text: line });
      index += 1;
    }
  }
  if (index !== lines.length) throw new Error("ayah cursor did not consume the corpus");
  return { ayahs, licenseNotice };
}
