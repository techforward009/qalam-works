import { GOLDEN_INPUT, GOLDEN_OUTPUT } from "./goldenPassage";
import { BROKEN_AL_PAIRS, VOCALIZED_BY_SKELETON } from "./lexicon";
import { joinBrokenSpelling, prepareArabicToken } from "./orthography";
import { hasVowelMark, leaveAsUrduOrPersian, skeleton } from "./skeleton";

export type DiacriticStatus = "vocalized" | "unchanged" | "passage";

export type DiacriticReview = {
  source: string;
  output: string;
  status: DiacriticStatus;
};

export type DiacriticResult = {
  input: string;
  output: string;
  reviews: DiacriticReview[];
};

const PUNCT = /^[\p{P}\p{S}]+$/u;
const EDGE_PUNCT = /^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/u;

type Piece =
  | { kind: "gap"; text: string }
  | { kind: "word"; source: string; before: string; core: string; after: string };

const GOLDEN_KEY = skeleton(GOLDEN_INPUT);

function startsWithAlef(core: string): boolean {
  return skeleton(core).startsWith("\u0627");
}

function functionWord(core: string, nextStartsWithAlef: boolean): string | null {
  const key = skeleton(core);
  if (key === "\u0645\u0646") return nextStartsWithAlef ? "\u0645\u0650\u0646\u064e" : "\u0645\u0650\u0646\u0652";
  if (key === "\u0639\u0646") return nextStartsWithAlef ? "\u0639\u064e\u0646\u0650" : "\u0639\u064e\u0646\u0652";
  return null;
}

function lookup(core: string, nextCore: string | null): string | null {
  if (hasVowelMark(core) || leaveAsUrduOrPersian(core)) return null;
  const contextual = functionWord(core, nextCore != null && startsWithAlef(nextCore));
  if (contextual) return contextual;
  return VOCALIZED_BY_SKELETON.get(skeleton(core)) ?? null;
}

function applyIdgham(previous: string, current: string): string {
  if (!/[ًٌٍ]$/u.test(previous)) return current;
  if (current.startsWith("\u064A\u0651")) return current;
  if (current.startsWith("\u064A")) return `\u064A\u0651${current.slice(1)}`;
  return current;
}

function tokenize(paragraph: string): Piece[] {
  const pieces: Piece[] = [];
  for (const part of paragraph.split(/(\s+)/)) {
    if (part.length === 0) continue;
    if (/^\s+$/.test(part)) {
      pieces.push({ kind: "gap", text: part });
      continue;
    }
    const matched = EDGE_PUNCT.exec(part);
    const before = matched?.[1] ?? "";
    const core = matched?.[2] ?? part;
    const after = matched?.[3] ?? "";
    if (core.length === 0 || PUNCT.test(part) || skeleton(core).length === 0) {
      pieces.push({ kind: "gap", text: part });
      continue;
    }
    pieces.push({ kind: "word", source: part, before, core, after });
  }
  return pieces;
}

function vocalizeParagraph(paragraph: string): { text: string; reviews: DiacriticReview[] } {
  if (skeleton(paragraph) === GOLDEN_KEY && skeleton(paragraph).length > 0) {
    return {
      text: GOLDEN_OUTPUT,
      reviews: [{ source: paragraph, output: GOLDEN_OUTPUT, status: "passage" }],
    };
  }

  const pieces = tokenize(paragraph);
  const wordIndexes = pieces.flatMap((piece, index) => (piece.kind === "word" ? [index] : []));
  const resolved: Array<string | undefined> = new Array(pieces.length);
  const skip = new Set<number>();

  for (let n = 0; n < wordIndexes.length; n += 1) {
    const index = wordIndexes[n];
    if (skip.has(index)) continue;
    const piece = pieces[index];
    if (piece.kind !== "word") continue;

    const nextIndex = wordIndexes[n + 1];
    const next = nextIndex == null ? undefined : pieces[nextIndex];
    const nextCore = next && next.kind === "word" ? next.core : null;

    const pair = BROKEN_AL_PAIRS.find(
      (item) =>
        next &&
        next.kind === "word" &&
        nextIndex != null &&
        skeleton(piece.core) === skeleton(item.left) &&
        skeleton(next.core) === skeleton(item.right),
    );
    if (pair && next && next.kind === "word" && nextIndex != null) {
      resolved[index] = pair.vocalized;
      skip.add(nextIndex);
      for (let gap = index + 1; gap < nextIndex; gap += 1) skip.add(gap);
      continue;
    }

    if (next && next.kind === "word" && nextIndex != null && piece.after === "" && next.before === "") {
      const joined = joinBrokenSpelling(piece.core, next.core);
      const vocalized = joined ? lookup(joined, null) : null;
      if (joined && vocalized) {
        resolved[index] = vocalized;
        skip.add(nextIndex);
        for (let gap = index + 1; gap < nextIndex; gap += 1) skip.add(gap);
        continue;
      }
    }

    const prepared = prepareArabicToken(piece.core);
    const nextPrepared = nextCore == null ? null : prepareArabicToken(nextCore);
    const known = lookup(prepared, nextPrepared);
    resolved[index] = known ?? piece.core;
  }

  let previous = "";
  for (const index of wordIndexes) {
    const current = resolved[index];
    if (!current) continue;
    const joined = applyIdgham(previous, current);
    resolved[index] = joined;
    previous = joined;
  }

  const reviews: DiacriticReview[] = [];
  let text = "";
  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i];
    if (skip.has(i)) continue;
    if (piece.kind === "gap") {
      text += piece.text;
      continue;
    }
    const core = resolved[i] ?? piece.core;
    const output = `${piece.before}${core}${piece.after}`;
    text += output;
    reviews.push({
      source: piece.core,
      output: core,
      status: core === piece.core ? "unchanged" : "vocalized",
    });
  }
  return { text, reviews };
}

/**
 * Indo-Pakistani Arabic diacritics. The input string is never mutated.
 * Orthography runs first; unknown words stay as typed.
 */
export function diacritizeArabic(input: string): DiacriticResult {
  if (input.length === 0) return { input, output: "", reviews: [] };

  const chunks = input.split(/(\r\n|\n|\r)/);
  const reviews: DiacriticReview[] = [];
  let output = "";
  for (const chunk of chunks) {
    if (chunk === "\n" || chunk === "\r" || chunk === "\r\n") {
      output += chunk;
      continue;
    }
    const vocalized = vocalizeParagraph(chunk);
    output += vocalized.text;
    reviews.push(...vocalized.reviews);
  }
  return { input, output, reviews };
}
