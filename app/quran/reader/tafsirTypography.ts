/**
 * Conservative, presentation-only detection of vowelled Arabic passages.
 * Urdu and Arabic share a script, so unmarked or ambiguous words stay Urdu.
 * Source characters are never normalized, deleted, or replaced.
 */
export type TafsirTypographyRun = Readonly<{
  kind: "urdu" | "arabic";
  text: string;
}>;

const ARABIC_DIACRITIC = /[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/u;
const ARABIC_LETTER = /[\u0621-\u064A\u066E-\u06D3]/u;
const URDU_EXCLUSIVE = /[پچژگٹڈڑںے]/u;
const LATIN_LETTER = /[A-Za-z]/u;

function isMarkedArabicWord(word: string): boolean {
  return ARABIC_LETTER.test(word) && ARABIC_DIACRITIC.test(word) && !URDU_EXCLUSIVE.test(word);
}

function splitLine(line: string): TafsirTypographyRun[] {
  if (!line) return [];
  const pieces = line.split(/(\s+)/u);
  const wordPositions: number[] = [];
  const markedPositions: number[] = [];
  for (let i = 0; i < pieces.length; i += 1) {
    if (/^\s+$/u.test(pieces[i]) || !ARABIC_LETTER.test(pieces[i])) continue;
    wordPositions.push(i);
    if (isMarkedArabicWord(pieces[i])) markedPositions.push(i);
  }
  if (markedPositions.length === 0) return [{ kind: "urdu", text: line }];

  // Style whole Quran/quotation lines only when their first Arabic word
  // is vowelled. Never style an introductory Urdu heading as Arabic.
  const firstWordIsMarked = markedPositions.includes(wordPositions[0]);
  const entireLineArabic =
    firstWordIsMarked &&
    !URDU_EXCLUSIVE.test(line) &&
    !LATIN_LETTER.test(line) &&
    ((markedPositions.length >= 2 && markedPositions.length * 3 >= wordPositions.length) ||
      (markedPositions.length === 1 && wordPositions.length <= 2 &&
        [...line].filter((ch) => ARABIC_DIACRITIC.test(ch)).length >= 2));
  if (entireLineArabic) return [{ kind: "arabic", text: line }];

  const marked = new Set(markedPositions);
  // A connector may be unvowelled, but only join it BETWEEN vowelled words.
  // Do not extend an Arabic span into surrounding Urdu prose.
  for (let index = 1; index < wordPositions.length - 1; index += 1) {
    const current = wordPositions[index];
    if (marked.has(current) || URDU_EXCLUSIVE.test(pieces[current]) || LATIN_LETTER.test(pieces[current])) continue;
    if (marked.has(wordPositions[index - 1]) && marked.has(wordPositions[index + 1])) {
      marked.add(current);
    }
  }

  const runs: TafsirTypographyRun[] = [];
  for (let i = 0; i < pieces.length; i += 1) {
    const part = pieces[i];
    if (!part) continue;
    const whitespace = /^\s+$/u.test(part);
    const kind: TafsirTypographyRun["kind"] =
      marked.has(i) ||
      (whitespace && marked.has(i - 1) && marked.has(i + 1))
        ? "arabic"
        : "urdu";
    const previous = runs[runs.length - 1];
    if (previous?.kind === kind) {
      runs[runs.length - 1] = { kind, text: previous.text + part };
    } else {
      runs.push({ kind, text: part });
    }
  }
  return runs;
}

export function splitTafsirTypography(text: string): TafsirTypographyRun[] {
  if (!text) return [];
  const lines = text.split(/(\n)/u);
  const all: TafsirTypographyRun[] = [];
  for (const item of lines) {
    if (!item) continue;
    const next = item === "\n" ? [{ kind: "urdu" as const, text: item }] : splitLine(item);
    for (const run of next) {
      const last = all[all.length - 1];
      if (last?.kind === run.kind) {
        all[all.length - 1] = { kind: run.kind, text: last.text + run.text };
      } else {
        all.push(run);
      }
    }
  }
  return all;
}
