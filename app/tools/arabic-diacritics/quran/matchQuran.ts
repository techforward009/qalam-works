import { prepareArabicToken } from "../engine/orthography";
import { quranMatchKey } from "./normalizeQuran";
import { canUseForQuranMode } from "./reference";
import type { QuranAyah, QuranMatchStatus, QuranReferenceProvider, QuranRestoreResult, QuranSegment } from "./types";

const EDGE = /^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/u;
const HARD_URDU = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06AF\u06BA]/;
const URDU_YE_WORDS = new Set(["\u06C1\u06D2", "\u06BE\u06D2", "\u0647\u06D2"]);

type Tok = { raw: string; core: string; before: string; after: string; start: number; end: number };

type RefWord = { ayahId: string; index: number; key: string; start: number; end: number };

type Run = { ayahId: string; from: number; to: number; length: number; corrected: boolean; exact: string };

const CATEGORY: Record<QuranMatchStatus, string> = {
  verified: "Verified",
  corrected: "Corrected",
  unchanged: "Unchanged",
  ambiguous: "Ambiguous",
  "no-match": "No Quranic match",
};

function listedRecoveryKey(token: string): string | null {
  if (HARD_URDU.test(token) || URDU_YE_WORDS.has(token)) return null;
  const prepared = prepareArabicToken(token);
  if ([...prepared].length <= [...token].length) return null;
  const key = quranMatchKey(prepared);
  return key || null;
}

function tokenKey(token: string): string {
  if (HARD_URDU.test(token) || URDU_YE_WORDS.has(token)) return "";
  return quranMatchKey(token);
}

function peelEnds(paragraph: string): { lead: string; core: string; tail: string } {
  const spaced = /^(\s*)([\s\S]*?)(\s*)$/u.exec(paragraph);
  const leadSpace = spaced?.[1] ?? "";
  const trailSpace = spaced?.[3] ?? "";
  const body = spaced?.[2] ?? "";
  const punct = EDGE.exec(body);
  return {
    lead: leadSpace + (punct?.[1] ?? ""),
    core: punct?.[2] ?? body,
    tail: (punct?.[3] ?? "") + trailSpace,
  };
}

function tokenize(paragraph: string): Tok[] {
  const tokens: Tok[] = [];
  for (const match of paragraph.matchAll(/\S+/g)) {
    const raw = match[0];
    const peeled = EDGE.exec(raw);
    tokens.push({
      raw,
      before: peeled?.[1] ?? "",
      core: peeled?.[2] ?? raw,
      after: peeled?.[3] ?? "",
      start: match.index ?? 0,
      end: (match.index ?? 0) + raw.length,
    });
  }
  return tokens;
}

function indexReference(ayahs: readonly QuranAyah[]) {
  const byAyah = new Map<string, RefWord[]>();
  const byKey = new Map<string, RefWord[]>();
  const text = new Map(ayahs.map((ayah) => [ayah.id, ayah.text]));
  for (const ayah of ayahs) {
    const words: RefWord[] = [];
    let index = 0;
    for (const match of ayah.text.matchAll(/\S+/g)) {
      const key = quranMatchKey(match[0]);
      const word: RefWord = {
        ayahId: ayah.id,
        index,
        key,
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length,
      };
      words.push(word);
      if (key) {
        const list = byKey.get(key) ?? [];
        list.push(word);
        byKey.set(key, list);
      }
      index += 1;
    }
    byAyah.set(ayah.id, words);
  }
  return { byAyah, byKey, text };
}

function segment(
  input: string,
  output: string,
  status: QuranMatchStatus,
  referenceId: string | null,
  referenceText: string | null,
): QuranSegment {
  return {
    input,
    normalizedInput: quranMatchKey(input),
    output,
    status,
    matchedReferenceId: referenceId,
    referenceText,
    category: CATEGORY[status],
  };
}

function runsFrom(
  tokens: Tok[],
  start: number,
  index: ReturnType<typeof indexReference>,
): Run[] {
  const key = tokenKey(tokens[start]?.core ?? "");
  if (!key) return [];
  const anchors = index.byKey.get(key) ?? [];
  const runs: Run[] = [];
  for (const anchor of anchors) {
    const words = index.byAyah.get(anchor.ayahId) ?? [];
    let length = 1;
    let corrected = false;
    while (start + length < tokens.length) {
      const next = words[anchor.index + length];
      const token = tokens[start + length];
      if (!next || !token) break;
      const exact = tokenKey(token.core);
      if (exact && exact === next.key) {
        length += 1;
        continue;
      }
      const recovered = listedRecoveryKey(token.core);
      if (recovered && recovered === next.key && length >= 1) {
        length += 1;
        corrected = true;
        continue;
      }
      break;
    }
    const ayahText = index.text.get(anchor.ayahId) ?? "";
    const last = words[anchor.index + length - 1];
    runs.push({
      ayahId: anchor.ayahId,
      from: anchor.index,
      to: anchor.index + length - 1,
      length,
      corrected,
      exact: ayahText.slice(anchor.start, last?.end ?? anchor.end),
    });
  }
  return runs;
}

function chooseRun(runs: Run[]): { kind: "use"; run: Run } | { kind: "ambiguous" } | null {
  if (runs.length === 0) return null;
  const max = Math.max(...runs.map((run) => run.length));
  const top = runs.filter((run) => run.length === max);
  const distinct = [...new Set(top.map((run) => run.exact))];
  if (distinct.length !== 1) return { kind: "ambiguous" };
  const run = top[0];
  if (!run || (run.corrected && run.length < 2)) return { kind: "ambiguous" };
  return { kind: "use", run };
}

function restoreParagraph(paragraph: string, provider: QuranReferenceProvider, index: ReturnType<typeof indexReference>): { text: string; segments: QuranSegment[] } {
  const peeled = peelEnds(paragraph);
  const tokensForAyah = tokenize(peeled.core);
  const arabicOnly = tokensForAyah.length > 0 && tokensForAyah.every((token) => tokenKey(token.core).length > 0);
  const exact = arabicOnly ? provider.findExact(quranMatchKey(peeled.core)) : [];
  if (peeled.core && exact.length === 1 && exact[0]) {
    const output = `${peeled.lead}${exact[0].text}${peeled.tail}`;
    return { text: output, segments: [segment(paragraph, output, "verified", exact[0].id, exact[0].text)] };
  }
  if (peeled.core && exact.length > 1) {
    return { text: paragraph, segments: [segment(paragraph, paragraph, "ambiguous", null, null)] };
  }

  const tokens = tokenize(paragraph);
  const segments: QuranSegment[] = [];
  let text = "";
  let cursor = 0;
  let tokenIndex = 0;
  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (!token) break;
    if (token.start > cursor) text += paragraph.slice(cursor, token.start);
    const decision = chooseRun(runsFrom(tokens, tokenIndex, index));
    if (decision?.kind === "use") {
      const last = tokens[tokenIndex + decision.run.length - 1] ?? token;
      const inputSlice = paragraph.slice(token.start, last.end);
      const outputSlice = `${token.before}${decision.run.exact}${last.after}`;
      text += outputSlice;
      segments.push(
        segment(
          inputSlice,
          outputSlice,
          decision.run.corrected ? "corrected" : "verified",
          decision.run.ayahId,
          decision.run.exact,
        ),
      );
      cursor = last.end;
      tokenIndex += decision.run.length;
      continue;
    }
    const status: QuranMatchStatus = decision?.kind === "ambiguous" ? "ambiguous" : tokenKey(token.core) ? "no-match" : "unchanged";
    text += token.raw;
    segments.push(segment(token.raw, token.raw, status, null, null));
    cursor = token.end;
    tokenIndex += 1;
  }
  if (cursor < paragraph.length) text += paragraph.slice(cursor);
  return { text, segments };
}

/**
 * Quran mode. Returns stored reference text only.
 * Does not call the general diacritizer and does not invent marks.
 */
export function restoreQuran(input: string, provider: QuranReferenceProvider): QuranRestoreResult {
  const metadata = provider.getMetadata();
  const ready = canUseForQuranMode(provider);
  if (!ready.ok) {
    return {
      input,
      output: input,
      metadata,
      referenceReady: false,
      segments: input
        ? [
            {
              input,
              normalizedInput: quranMatchKey(input),
              output: input,
              status: "no-match",
              matchedReferenceId: null,
              referenceText: null,
              category: "Quranic reference match not established.",
            },
          ]
        : [],
    };
  }

  const index = indexReference(provider.listAyahs());
  const segments: QuranSegment[] = [];
  let output = "";
  for (const chunk of input.split(/(\r\n|\n|\r)/)) {
    if (chunk === "\n" || chunk === "\r" || chunk === "\r\n") {
      output += chunk;
      continue;
    }
    const restored = restoreParagraph(chunk, provider, index);
    output += restored.text;
    segments.push(...restored.segments);
  }
  return { input, output, segments, metadata, referenceReady: true };
}
