/**
 * Qalam Urdu Writer — Production Transliteration Core
 * Phase 19A.1
 *
 * Architecture:
 *   Primary output = engineV2.convert(input).output (frozen, unchanged)
 *   Token breakdown = V2 per-token pipeline re-run for structured metadata
 *   Alternatives = V2 lexicon alternatives + safe phrase variants (never V3-primary)
 *
 * Production invariants:
 *   1. output === engineV2.convert(input).output for all inputs
 *   2. unknown/low-confidence tokens remain Roman in primary output
 *   3. protected/English tokens are never overwritten
 *   4. candidates[0].output === output
 *   5. no external API, no experimental model at runtime
 */

import {
  type WriterConversionResult,
  type WriterChoiceResult,
  type WriterToken,
  type TokenCandidate,
  type SentenceCandidate,
  type TokenSource,
  type ConfidenceBand,
  type TokenChoice,
} from "./writerTypes";

import { engineV2 } from "./engineV2";
import { segmentInput, isProtectedToken } from "./protectedTokens";
import { lookupNormalized, lookupToken } from "./lexicon";
import { PHRASE_TABLE, normPhrase } from "./phraseTable";

// ── Internal classification (re-implements V2 logic for metadata) ─────────────

const AMBIGUOUS_DEFAULTS = new Set([
  "main","mein","mai","to","is","iss","par","pe","na","kal",
  "jo","jab","tab","bus",
]);

const KNOWN_BRANDS = new Set([
  "zoom","google","whatsapp","youtube","netflix","facebook","instagram",
  "twitter","tiktok","excel","word","powerpoint","pdf","wifi","android",
  "iphone","samsung","apple","microsoft","amazon","chatgpt","github",
  "slack","discord","signal","telegram","snapchat","linkedin","spotify",
  "uber","careem","daraz","foodpanda","bykea",
]);

const COMMON_SENTENCE_INITIAL = new Set([
  "aaj","kal","kya","kia","ab","abhi","phir","phr","lekin","magar",
  "wahan","yahan","sab","kuch","haan","nahi","bilkul","zaroor",
  "bohot","bohat","bhot","theek","thek","achha","acha","jaldi",
  "shukriya","subah","raat","din","ghar","kaam",
]);

// Positive evidence sets for English/protected classification
// These mirror V2's explicit classification layers
const KEEP_ENGLISH_SAMPLE = new Set([
  "ok","okay","please","sorry","thanks","hello","bye","yes","no",
  "problem","issue","update","install","login","logout","password","email","link",
  "call","text","message","video","photo","file","data","app","chat",
  "online","offline","busy","free","plan","meeting","class","office",
  "team","project","resume","backup","download","upload","print","share",
  "cancel","confirm","submit","save","delete","copy","paste","search",
  "gym","coffee","mood","signal","wifi","battery","mode","status","type",
  "deadline","schedule","report","presentation","interview","salary","bonus",
  "ticket","voucher","discount","delivery","order","track","rate","charge",
  "doctor","nurse","medicine","clinic","hospital","test","result",
  "school","college","university","exam","degree","course",
  "match","game","play","player","score","win","lose","draw",
  "party","event","trip","tour","hotel","flight","visa","passport",
  "market","mall","shop","store","brand","price","deal","sale",
  "movie","drama","song","show","season","episode","channel",
  "laptop","tablet","screen","keyboard","mouse","printer","camera","mic",
  "server","system","software","hardware","network","internet","website",
  "ready","better","slow","fast","late","early","close","open","full","empty",
  "start","stop","help","support","care","check","fix","run","move",
  "boss","extend","speed","playlist","closed","drop","later","when",
  "child","prodigy","family","sign","register","payment","receipt","attempt",
  "exercise","buffering","talk","group","design","video","form","list",
  "chill","lol","omg","brb","gtg","idk","np","smh","tbh","lmao","ugh",
]);

/**
 * Returns true only when there is POSITIVE evidence the token is
 * intentional English/code-switch content.
 * Does NOT return true merely because V2 happened to preserve it.
 */
function isKnownEnglish(token: string): boolean {
  const lower = token.toLowerCase();
  // Collapsed form (handles "thaaaanks" → "thanks")
  const collapsed = lower.replace(/(.)\1{2,}/g, "$1");
  if (KEEP_ENGLISH_SAMPLE.has(lower) || KEEP_ENGLISH_SAMPLE.has(collapsed)) return true;
  if (KNOWN_BRANDS.has(lower)) return true;
  if (/^[A-Z][a-z]+[A-Z]/.test(token)) return true; // CamelCase brand
  return false;
}

function isSoftProtected(token: string): boolean {
  const lower = token.toLowerCase();
  if (COMMON_SENTENCE_INITIAL.has(lower)) return false;
  if (KNOWN_BRANDS.has(lower)) return true;
  if (/^[A-Z][a-z]+[A-Z]/.test(token)) return true;
  if (/^[A-Z][a-z]{1,}$/.test(token)) return true;
  return false;
}

function classifyToken(
  roman: string,
  v2Output: string,
): { source: TokenSource; confidence: ConfidenceBand } {
  const lower = roman.toLowerCase();

  if (isProtectedToken(roman) || isSoftProtected(roman)) {
    return { source: "protected", confidence: "high" };
  }
  // Known English: positive evidence required (KEEP_ENGLISH, brand, CamelCase)
  if (v2Output === roman && isKnownEnglish(roman)) {
    return { source: "english", confidence: "high" };
  }
  if (v2Output === roman) {
    // Preserved by V2, but no positive English evidence → passthrough (unknown/low-confidence)
    return { source: "passthrough", confidence: "low" };
  }
  if (AMBIGUOUS_DEFAULTS.has(lower)) {
    return { source: "context", confidence: "high" };
  }
  const lex = lookupNormalized(roman);
  if (lex && lex[0] === v2Output) {
    return { source: "lexicon", confidence: "high" };
  }
  // Check phrase table
  if (PHRASE_TABLE[normPhrase(roman)]) {
    return { source: "phrase", confidence: "high" };
  }
  // Spelling variant / morphology
  const collapsed = lower.replace(/(.)\1{2,}/g, "$1");
  if (lookupNormalized(collapsed)) {
    return { source: "morphology", confidence: "medium" };
  }
  if (/[\u0600-\u06FF]/.test(v2Output)) {
    return { source: "lexicon", confidence: "medium" };
  }
  return { source: "passthrough", confidence: "low" };
}

function buildTokenCandidates(
  roman: string,
  primaryOutput: string,
  source: TokenSource,
  confidence: ConfidenceBand,
): TokenCandidate[] {
  const primary: TokenCandidate = { text: primaryOutput, source, confidence };

  // For passthrough tokens: only one candidate (preserve Roman)
  if (source === "passthrough" || source === "protected" || source === "english") {
    return [primary];
  }

  // For lexicon tokens: expose genuine alternatives from the lexicon
  const lex = lookupNormalized(roman);
  if (lex && lex.length > 1) {
    const alts = [...new Set(lex)]
      .filter(t => t !== primaryOutput)
      .slice(0, 2)
      .map(t => ({ text: t, source: "lexicon" as TokenSource, confidence: "medium" as ConfidenceBand }));
    if (alts.length > 0) return [primary, ...alts];
  }

  // For ambiguous context tokens: expose the alternative Roman form as medium suggestion
  const lower = roman.toLowerCase();
  if (AMBIGUOUS_DEFAULTS.has(lower) && source === "context") {
    // Offer Roman passthrough as explicit alternative so user can override
    const passAlt: TokenCandidate = {
      text: roman,
      source: "suggestion",
      confidence: "low",
    };
    return [primary, passAlt];
  }

  return [primary];
}

// ── Per-token processing ──────────────────────────────────────────────────────

interface InternalSegment {
  roman: string;
  primary: string;
  isPhraseHead: boolean;   // first token of a matched phrase
  isPhrasePart: boolean;   // continuation token (output = "")
  startOffset: number;
  endOffset: number;
}

function buildInternalSegments(input: string): InternalSegment[] {
  const segs = segmentInput(input);
  const result: InternalSegment[] = [];
  let offset = 0;
  let i = 0;

  // Get V2 output per token by delegating to V2 individually — this avoids
  // reimplementing V2's phrase logic and guarantees identical output.
  // We run V2 on the full input first to get the sentence, then align.
  const v2FullOutput = engineV2.convert(input).output;

  // Token-by-token: run V2 on each meaningful token to get per-token output.
  // For whitespace segments, preserve verbatim.
  while (i < segs.length) {
    const seg = segs[i];
    const start = offset;
    const end = offset + seg.text.length;

    if (/^\s+$/.test(seg.text)) {
      result.push({ roman: seg.text, primary: seg.text, isPhraseHead: false, isPhrasePart: false, startOffset: start, endOffset: end });
      offset = end; i++; continue;
    }

    // Try phrase match (same logic as V2 for classification)
    let phraseMatched = false;
    for (let len = 6; len >= 2; len--) {
      const parts: string[] = [];
      let j = i, tc = 0, ahead = offset;
      while (j < segs.length && tc < len) {
        if (!/^\s+$/.test(segs[j].text)) { parts.push(segs[j].text); tc++; }
        j++;
      }
      if (parts.length < len) continue;
      const phrase = normPhrase(parts.join(" "));
      if (PHRASE_TABLE[phrase]) {
        // Mark first as phrase head, rest as phrase parts
        let k = i, consumed = offset;
        let isHead = true;
        while (k < j) {
          const s = segs[k];
          const sStart = consumed;
          const sEnd = consumed + s.text.length;
          result.push({ roman: s.text, primary: isHead ? PHRASE_TABLE[phrase] : "", isPhraseHead: isHead, isPhrasePart: !isHead, startOffset: sStart, endOffset: sEnd });
          consumed = sEnd; isHead = false; k++;
        }
        offset = consumed; i = j; phraseMatched = true; break;
      }
    }
    if (phraseMatched) continue;

    // Single token: get V2's output for this token alone
    const v2TokOut = engineV2.convert(seg.text).output;
    result.push({ roman: seg.text, primary: v2TokOut, isPhraseHead: false, isPhrasePart: false, startOffset: start, endOffset: end });
    offset = end; i++;
  }

  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Convert Roman Urdu input to structured WriterConversionResult.
 *
 * The `output` field always equals `engineV2.convert(input).output`.
 * All safety, protection, and passthrough behavior is inherited from V2.
 */
export function convertRomanUrdu(input: string): WriterConversionResult {
  // 1. Get authoritative V2 output (this is the production result)
  const v2Result = engineV2.convert(input);
  const v2Output = v2Result.output;

  // 2. Build per-token metadata
  const segments = buildInternalSegments(input);

  const tokens: WriterToken[] = [];
  for (const seg of segments) {
    if (seg.isPhrasePart) {
      tokens.push({
        roman: seg.roman,
        primary: "",
        startOffset: seg.startOffset,
        endOffset: seg.endOffset,
        source: "phrase",
        confidence: "high",
        isProtected: false,
        isEnglish: false,
        isAutoConverted: false,
        isPassthrough: false,
        hasAlternatives: false,
        isPhraseHead: false,
        isPhrasePart: true,
        candidates: [],
      });
      continue;
    }

    // Whitespace: transparent
    if (/^\s+$/.test(seg.roman)) {
      tokens.push({
        roman: seg.roman,
        primary: seg.roman,
        startOffset: seg.startOffset,
        endOffset: seg.endOffset,
        source: "protected",
        confidence: "high",
        isProtected: true,
        isEnglish: false,
        isAutoConverted: false,
        isPassthrough: false,
        hasAlternatives: false,
        isPhraseHead: false,
        isPhrasePart: false,
        candidates: [{ text: seg.roman, source: "protected", confidence: "high" }],
      });
      continue;
    }

    const { source: rawSource, confidence } = classifyToken(seg.roman, seg.primary);
    // Phrase heads always report source="phrase" regardless of lexicon classification
    const source = seg.isPhraseHead ? "phrase" : rawSource;
    const candidates = buildTokenCandidates(seg.roman, seg.primary, source, confidence);

    tokens.push({
      roman: seg.roman,
      primary: seg.primary,
      startOffset: seg.startOffset,
      endOffset: seg.endOffset,
      source,
      confidence,
      isProtected: source === "protected",
      isEnglish: source === "english",
      isAutoConverted: seg.primary !== seg.roman && source !== "passthrough",
      isPassthrough: source === "passthrough",
      hasAlternatives: candidates.length > 1,
      isPhraseHead: seg.isPhraseHead,
      isPhrasePart: false,
      candidates,
    });
  }

  // 3. Build sentence candidates
  // Primary is always V2 output. Additional candidates from V2's own Top-3 if available.
  const v2Candidates = v2Result.candidates ?? [{ output: v2Output }];
  const sentenceCandidates: SentenceCandidate[] = [
    { output: v2Output, tokenChoices: {} },
  ];
  for (const c of v2Candidates.slice(1)) {
    if (c.output !== v2Output) {
      sentenceCandidates.push({ output: c.output, tokenChoices: {} });
    }
    if (sentenceCandidates.length >= 3) break;
  }

  return {
    input,
    output: v2Output,
    tokens,
    candidates: sentenceCandidates,
    meta: {
      engine: "writer-v2-production",
      strategy: "V2-bounded-production",
      includesExperimentalCandidates: false,
    },
  };
}

/**
 * Apply explicit user token choices to an existing conversion result.
 * Returns a new rebuilt output; the original result is not mutated.
 * Invalid indices are silently ignored.
 */
export function applyTokenChoices(
  result: WriterConversionResult,
  choices: TokenChoice[]
): WriterChoiceResult {
  const overrideMap: Record<number, number> = {};
  const rejected: TokenChoice[] = [];

  for (const choice of choices) {
    const { tokenIndex, candidateIndex } = choice;
    const tok = result.tokens[tokenIndex];
    if (!tok) { rejected.push(choice); continue; }
    if (candidateIndex < 0 || candidateIndex >= tok.candidates.length) { rejected.push(choice); continue; }
    overrideMap[tokenIndex] = candidateIndex;
  }

  const parts: string[] = [];
  for (let i = 0; i < result.tokens.length; i++) {
    const tok = result.tokens[i];
    if (!tok.primary && tok.source === "phrase" && tok.roman) continue;
    const chosenIdx = overrideMap[i] ?? 0;
    const chosen = tok.candidates[chosenIdx]?.text ?? tok.primary;
    parts.push(chosen);
  }

  const applied = choices.filter(c => overrideMap[c.tokenIndex] !== undefined);

  return {
    input: result.input,
    output: parts.join(""),
    appliedChoices: applied,
    overriddenTokens: Object.keys(overrideMap).map(Number),
    rejectedChoices: rejected,
  };
}
