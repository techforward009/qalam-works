/**
 * Conservative, presentation-only Arabic quotation detection for Tafsir text.
 * Source structure is the boundary: only a complete standalone line (or the
 * text before a recognized trailing verse reference) can become Arabic.
 * Ambiguous mixed Arabic-script lines remain Urdu. Source characters and
 * whitespace are never normalized, removed, or replaced.
 */
export type TafsirTypographyRun = Readonly<{
  kind: "urdu" | "arabic" | "reference";
  text: string;
}>;

const ARABIC_LETTER = /[\u0621-\u064A\u066E-\u06D3]/u;
const ARABIC_DIACRITIC = /[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/u;
const URDU_EXCLUSIVE = /[پچژگٹڈڑں]/u;
const LATIN_LETTER = /[A-Za-z]/u;
const URDU_REFERENCE_SUFFIX = /(\s*\(\s*[^()\n]*(?:سورہ|سورۃ|ہود|نمل|آیت|آیات)[^()\n]*\)\s*[۔.؟?]?)$/u;
const ENGLISH_REFERENCE_SUFFIX = /(\s*\(\s*[^()\n]*(?:surah|verse|ayah)[^()\n]*\)\s*[۔.؟?]?)$/iu;

function confidentArabicQuotation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || LATIN_LETTER.test(trimmed) || URDU_EXCLUSIVE.test(trimmed)) return false;
  const words = trimmed.split(/\s+/u).filter(Boolean);
  if (words.length < 2) return false;
  if (words.some((word) => !ARABIC_LETTER.test(word) && !/[ۚۖۗۙۛۜ۞،؛:؟,.()0-9٠-٩۰-۹]/u.test(word))) return false;

  const letters = [...trimmed].filter((char) => ARABIC_LETTER.test(char));
  const markedWords = words.filter((word) => ARABIC_LETTER.test(word) && ARABIC_DIACRITIC.test(word));
  const markedWordRatio = markedWords.length / Math.max(1, words.filter((word) => ARABIC_LETTER.test(word)).length);
  // Require both the standalone source-line boundary and Arabic orthographic
  // evidence. Diacritics alone never classify a mixed commentary sentence.
  return letters.length >= 8 && markedWords.length >= 2 && markedWordRatio >= 0.55;
}

function appendRun(runs: TafsirTypographyRun[], kind: TafsirTypographyRun["kind"], text: string) {
  if (!text) return;
  const last = runs[runs.length - 1];
  if (last?.kind === kind) runs[runs.length - 1] = { kind, text: last.text + text };
  else runs.push({ kind, text });
}

function lineRuns(line: string): TafsirTypographyRun[] {
  if (!line) return [];

  // A trailing printed source note is metadata, not part of the quotation.
  // The exact source slice (including its leading whitespace and punctuation)
  // is retained verbatim in the following run.
  const suffix = line.match(URDU_REFERENCE_SUFFIX) ?? line.match(ENGLISH_REFERENCE_SUFFIX);
  const quoteText = suffix ? line.slice(0, suffix.index) : line;
  const referenceText = suffix?.[0] ?? "";
  if (confidentArabicQuotation(quoteText)) {
    return [
      { kind: "arabic", text: quoteText },
      ...(referenceText ? [{ kind: "reference" as const, text: referenceText }] : []),
    ];
  }
  return [{ kind: "urdu", text: line }];
}

export function splitTafsirTypography(text: string): TafsirTypographyRun[] {
  if (!text) return [];
  const runs: TafsirTypographyRun[] = [];
  const lines = text.split(/(\n)/u);
  for (const line of lines) {
    if (line === "\n") appendRun(runs, "urdu", line);
    else for (const run of lineRuns(line)) appendRun(runs, run.kind, run.text);
  }
  return runs;
}

/** Verified display-only heading repairs; raw source titles remain unchanged. */
const VERIFIED_ENGLISH_HEADING_DISPLAY: Readonly<Record<string, string>> = {
  "Tafsir Bismillah-your-Rahman al-Rahim": "Tafsir of Bismillah al-Rahman al-Rahim",
  "Allah is the most comprehensive of the names of Allah": "Allah: the most comprehensive of God's names",
  "He doesn't sleep, he doesn't sleep.": "Neither drowsiness nor sleep overtakes Him",
  "What do you mean by the Throne and the Throne?": "What is meant by the Throne and the Kursi?",
  "The background of the revelation of Ayat": "Occasion of Revelation",
  "Commentary\nI seek refuge in the Lord of mankind.": "I seek refuge in the Lord of mankind",
};

export function displayTafsirHeading(title: string, language: "ur" | "en"): string {
  return language === "en" ? VERIFIED_ENGLISH_HEADING_DISPLAY[title] ?? title : title;
}

export function tafsirSourceHeading(title: string, language: "ur" | "en"): string {
  return displayTafsirHeading(title, language) === title ? "" : title;
}
