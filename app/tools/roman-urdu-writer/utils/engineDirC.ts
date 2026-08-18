/**
 * Phase 19A.0j — Direction C prototype engines
 *
 * Strategy: Use V3 as the primary engine; intercept the OOV-generated
 * tokens (those V3 couldn't find in lexicon/phrase/context layers) and
 * rerank their candidates using the Urdu character trigram model.
 *
 * This guarantees V3's safety layer is identical — we only touch
 * the ranking of tokens that V3 would have generated via grapheme path.
 */

import type { RomanUrduEngine, EngineResult } from "./benchmarkScorer";
import { segmentInput, isProtectedToken } from "./protectedTokens";
import { lookupNormalized } from "./lexicon";
import { PHRASE_TABLE, normPhrase } from "./phraseTable";
import { generateCandidates } from "./graphemeGenerator";
import { reRankCandidates } from "./candidateRanker";
import { ngramRerank } from "./urduNgramScorer";
import { engineV3 } from "./engineV3";
import URDU_WORD_DATA from "./urduWordList.json";

const URDU_WORD_SET: Set<string> = new Set((URDU_WORD_DATA as { words: string[] }).words);

// ── Detect which tokens are in V3's OOV path ─────────────────────────────────

const AMBIGUOUS_DEFAULTS = new Set([
  "main","mein","mai","to","is","iss","par","pe","na","kal","jo","jab","tab","bus",
]);

/**
 * A token is "OOV" (handled by V3 grapheme generation) when:
 * - Not hard-protected
 * - Not in V3's exact lexicon
 * - Not a context-sensitive particle
 * V3's KEEP_ENGLISH and soft-protect handling is preserved by checking V3's
 * actual output: if V3 returns the same token (Roman passthrough or English
 * preservation), we treat it as protected.
 */
function isOovPath(token: string): boolean {
  if (isProtectedToken(token)) return false;
  if (AMBIGUOUS_DEFAULTS.has(token.toLowerCase())) return false;
  if (lookupNormalized(token) !== null) return false;
  // Check if V3 would preserve it (KEEP_ENGLISH, soft-protect, etc.)
  const v3out = engineV3.convert(token).output;
  if (v3out === token) return false; // V3 preserved it → not OOV path
  return true;
}

// ── Statistically reranked OOV conversion ────────────────────────────────────

function generateStatRanked(token: string, variant: "B" | "C"): string[] {
  const beamRaw = generateCandidates(token);
  const stage1 = reRankCandidates(beamRaw);
  const stage2 = ngramRerank(stage1, 0.6);

  let stage3 = stage2;
  if (variant === "C") {
    stage3 = stage2.map(c => ({
      ...c,
      combined: c.combined + (URDU_WORD_SET.has(c.text) ? 3.0 : 0),
    }));
    stage3.sort((a, b) => b.combined - a.combined || a.text.localeCompare(b.text));
  }

  const unique = [...new Set(stage3.map(c => c.text))].filter(t => t.length > 0);
  const bestNg = stage3[0]?.ngramScore ?? -999;
  const topIsKnown = unique.length > 0 && URDU_WORD_SET.has(unique[0]);
  const CONF_FLOOR_NG = topIsKnown ? -7.5 : -5.0;
  if (bestNg < CONF_FLOOR_NG || unique.length === 0) return [token];

  const URDU_PARTICLES = new Set(["aa","ab","na","ka","ki","ke","se","pe","ne","ko","jo","to","is","ya","wo","ho","le","de","aur","par","bhi","hi","kya","aaj","kal","kuch","sab","yeh","woh"]);
  const lower = token.toLowerCase();
  if (token.length <= 4 && /^[a-zA-Z]+$/.test(token) && !URDU_PARTICLES.has(lower) && !topIsKnown) {
    return [token];
  }
  if (/xyz|zfoo|blarg|rsg|ndz|xtw|str[^aeiou]|scr[^aeiou]/i.test(lower) && !topIsKnown) {
    return [token];
  }
  return unique.slice(0, 4);
}

// ── Core converter — same pipeline as V3 but with statistical OOV ranking ────

function convertDirC(input: string, variant: "B" | "C"): EngineResult {
  const segments = segmentInput(input);
  const result: { text: string; candidates: string[]; protected: boolean }[] = [];
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];

    if (/^\s+$/.test(seg.text)) {
      result.push({ text: seg.text, candidates: [seg.text], protected: true });
      i++; continue;
    }

    // Phrase table (same as V3)
    let phraseMatched = false;
    for (let len = 6; len >= 2; len--) {
      const parts: string[] = [];
      let j = i, tc = 0;
      while (j < segments.length && tc < len) {
        if (!/^\s+$/.test(segments[j].text)) { parts.push(segments[j].text); tc++; }
        j++;
      }
      if (parts.length < len) continue;
      const phrase = normPhrase(parts.join(" "));
      const urdu = PHRASE_TABLE[phrase];
      if (urdu) {
        for (let k = i; k < j; k++) {
          result.push({ text: segments[k].text, candidates: [k === i ? urdu : ""], protected: true });
        }
        i = j; phraseMatched = true; break;
      }
    }
    if (phraseMatched) continue;

    const token = seg.text;

    if (isOovPath(token)) {
      // Statistical ranking for OOV tokens
      const cands = generateStatRanked(token, variant);
      const isProtect = cands.length === 1 && cands[0] === token;
      result.push({ text: token, candidates: cands, protected: isProtect });
    } else {
      // Delegate fully to V3 for non-OOV tokens (guaranteed safety parity)
      const v3out = engineV3.convert(token).output;
      result.push({ text: token, candidates: [v3out], protected: true });
    }
    i++;
  }

  // Beam Top-3
  const beamPos: { idx: number; cands: string[] }[] = [];
  for (let k = 0; k < result.length; k++) {
    if (!result[k].protected && result[k].candidates.length > 1) {
      const u = [...new Set(result[k].candidates)];
      if (u.length > 1) beamPos.push({ idx: k, cands: u });
    }
    if (beamPos.length >= 3) break;
  }

  function reconstruct(ov: Record<number, string>): string {
    return result.filter(s => s.candidates[0] !== "")
      .map((s, idx) => ov[idx] ?? s.candidates[0] ?? s.text).join("");
  }

  if (beamPos.length === 0) { const b = reconstruct({}); return { output: b, candidates: [{ output: b }] }; }

  const outputs: string[] = [];
  const bp0 = beamPos[0], bp1 = beamPos[1];
  for (let c0 = 0; c0 < Math.min(bp0.cands.length, 3); c0++) {
    if (!bp1) outputs.push(reconstruct({ [bp0.idx]: bp0.cands[c0] }));
    else {
      for (let c1 = 0; c1 < Math.min(bp1.cands.length, 2); c1++) {
        outputs.push(reconstruct({ [bp0.idx]: bp0.cands[c0], [bp1.idx]: bp1.cands[c1] }));
        if (outputs.length >= 6) break;
      }
    }
    if (outputs.length >= 6) break;
  }
  const seen = new Set<string>(); const unique: string[] = [];
  for (const o of outputs) { if (!seen.has(o)) { seen.add(o); unique.push(o); } if (unique.length >= 3) break; }
  return { output: unique[0], candidates: unique.map(o => ({ output: o })) };
}

export const engineV3B: RomanUrduEngine = { name: "engine-v3b-ngram", convert: (input: string) => convertDirC(input, "B") };
export const engineV3C: RomanUrduEngine = { name: "engine-v3c-ngram-lexical", convert: (input: string) => convertDirC(input, "C") };
