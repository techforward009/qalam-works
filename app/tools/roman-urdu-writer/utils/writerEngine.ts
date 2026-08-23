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

import { engineV2, LOANWORD_URDU } from "./engineV2";
function isUrduScript(text: string): boolean { return /[\u0600-\u06FF]/.test(text); }

import { segmentInput, isProtectedToken } from "./protectedTokens";
import { lookupNormalized, lookupToken } from "./lexicon";
import { PHRASE_TABLE, normPhrase } from "./phraseTable";
import { formalStemConvert } from "./romanUrduNormalize";
import { resolveCompounds, resolveIzafatInOutput } from "./romanUrduCompoundResolver";

/**
 * Extended loanword map: English words → Urdu-SCRIPT TRANSLITERATIONS only.
 * Policy (Phase 19A.13+): NO translations — only phonetic Urdu-script rendering.
 *   correct:  meeting → میٹنگ
 *   WRONG:    monthly → ماہانہ (that is a translation, not transliteration)
 * Conversion triggers when the sentence has Urdu context cues.
 */
const EXTRA_LOANWORDS: Record<string, string> = {
  // ── Core tech/business ────────────────────────────────────────────────────
  film: "فلم",
  films: "فلمیں",
  industry: "انڈسٹری",
  industries: "انڈسٹریاں",
  digital: "ڈیجیٹل",
  internet: "انٹرنیٹ",
  network: "نیٹ ورک",
  connection: "کنکشن",
  budget: "بجٹ",
  manager: "مینیجر",
  management: "مینجمنٹ",
  payment: "پیمنٹ",
  payments: "پیمنٹس",
  revenue: "ریونیو",
  report: "رپورٹ",
  reports: "رپورٹس",
  website: "ویب سائٹ",
  software: "سافٹ وئیر",
  hardware: "ہارڈ وئیر",
  technology: "ٹیکنالوجی",
  application: "ایپلیکیشن",
  applications: "ایپلیکیشنز",
  project: "پروجیکٹ",
  projects: "پروجیکٹس",
  platform: "پلیٹ فارم",
  system: "سسٹم",
  systems: "سسٹمز",
  service: "سروس",
  services: "سروسز",
  server: "سرور",
  database: "ڈیٹا بیس",
  security: "سیکیورٹی",
  privacy: "پرائیویسی",
  market: "مارکیٹ",
  markets: "مارکیٹس",
  deadline: "ڈیڈ لائن",
  feature: "فیچر",
  features: "فیچرز",
  launch: "لانچ",
  portal: "پورٹل",
  dashboard: "ڈیش بورڈ",
  module: "ماڈیول",
  online: "آن لائن",
  offline: "آف لائن",
  admin: "ایڈمن",
  form: "فارم",
  // ── Corrected (were translations — now transliterations) ──────────────────
  economy: "اکانومی",       // was: معیشت (translation)
  monthly: "منتھلی",        // was: ماہانہ (translation)
  approval: "اپروول",       // was: منظوری (translation)
  pending: "پینڈنگ",        // was: زیرِ التوا (translation)
  available: "ایویلیبل",    // was: دستیاب (translation)
  access: "ایکسس",          // was: رسائی (translation)
  staff: "اسٹاف",           // was: عملہ (translation)
  // ── Policy seed list additions ────────────────────────────────────────────
  department: "ڈیپارٹمنٹ",
  departments: "ڈیپارٹمنٹس",
  verification: "ویریفیکیشن",
  performance: "پرفارمنس",   // V2 may produce پارفورمنس — see OUTPUT_CORRECTIONS in writerCurrency.ts
  better: "بیٹر",           // English adj; Roman Urdu behtar → بہتر (lexicon)
  show: "شو",
  amount: "اماؤنٹ",
  transfer: "ٹرانسفر",
  please: "پلیز",
  slow: "سلو",
  office: "آفس",
  meeting: "میٹنگ",
  meetings: "میٹنگز",
  send: "سینڈ",
  review: "ریویو",
  file: "فائل",             // file.pdf stays protected by isProtectedToken
  files: "فائلز",
  update: "اپ ڈیٹ",
  updates: "اپ ڈیٹس",
  percent: "پرسنٹ",         // English word; symbol % → فیصد via transformPercentage
  mobile: "موبائل",
  message: "میسج",
  messages: "میسجز",
  laptop: "لیپ ٹاپ",
  transaction: "ٹرانزیکشن",
  transactions: "ٹرانزیکشنز",
  failure: "فیلئر",
  salary: "سیلری",
  bonus: "بونس",
  bonuses: "بونسز",
  email: "ای میل",
  install: "انسٹال",
  start: "اسٹارٹ",
  check: "چیک",
  share: "شیئر",
  link: "لنک",
  links: "لنکس",
  drive: "ڈرائیو",
  change: "چینج",
  extend: "ایکسٹینڈ",
  inflation: "انفلیشن",
  pension: "پینشن",
  bank: "بینک",
  company: "کمپنی",
  companies: "کمپنیاں",
  policy: "پالیسی",
  policies: "پالیسیاں",
  document: "ڈاکومنٹ",
  documents: "ڈاکومنٹس",
  account: "اکاؤنٹ",
  accounts: "اکاؤنٹس",
  submit: "سبمٹ",
  rate: "ریٹ",
  interest: "انٹرسٹ",
  endpoint: "اینڈ پوائنٹ",
  configure: "کنفگر",
  advanced: "ایڈوانسڈ",
  quantum: "کوانٹم",
  framework: "فریم ورک",
  zoom: "زوم",
  // ── Apostrophe/ain clusters (Phase 19A.19) ───────────────────────────────
  // Keys use the raw apostrophized forms as they appear in inputSegs.
  // This ensures the per-token safety pass corrects them even when token
  // counts mismatch and the string-level pass cannot find the original form.
  "sho'oor":     "شعور",
  "shu'oor":     "شعور",
  "baa'is":      "باعث",
  "ba'is":       "باعث",
  "ijtima'ai":   "اجتماعی",
  "ijtima'ee":   "اجتماعی",
  "ma'ani":      "معانی",
  "mu'aashra":   "معاشرہ",
  "mu'aashray":  "معاشرے",
  "mu'aashre":   "معاشرے",
  "mu'aashrati": "معاشرتی",
  "mu'aashi":    "معاشی",
  "in'aam":      "انعام",
  "jaa'iz":      "جائز",
  "ja'iz":       "جائز",
  // ── Phase 19A.21 — everyday loanwords missing from EXTRA_LOANWORDS ──────
  problem: "پرابلم",
  problems: "پرابلمز",
  plan: "پلان",
  calls: "کالز",
  phone: "فون",
  phones: "فونز",
  school: "اسکول",
  result: "رزلٹ",
  results: "رزلٹس",
  idea: "آئیڈیا",
  ideas: "آئیڈیاز",
  game: "گیم",
  games: "گیمز",
  battery: "بیٹری",
  charger: "چارجر",
  wifi: "وائی فائی",
  uber: "اوبر",
  cancel: "کینسل",
  order: "آرڈر",
  orders: "آرڈرز",
  ready: "ریڈی",
  minute: "منٹ",
  minutes: "منٹ",
  presentation: "پریزینٹیشن",
  restaurant: "ریسٹورنٹ",
  try: "ٹرائی",
  color: "کلر",
  colour: "کلر",
  quality: "کوالٹی",
  crack: "کریک",
  screen: "اسکرین",
  // ── Brands (converted in Urdu context) ────────────────────────────────────
  // Note: WhatsApp/Google/YouTube/Zoom are in KNOWN_BRANDS → protected at engine level.
  // They are handled in the presentation layer by transformAcronymsAndBrands.
};

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
  "call","text","message","photo","file","data","app","chat",
  "online","offline","busy","free","plan","class",
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
  // Words in EXTRA_LOANWORDS or LOANWORD_URDU are known English (we have a mapping for them)
  if (EXTRA_LOANWORDS[lower] || LOANWORD_URDU[lower]) return true;
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
  if (v2Output !== roman && isUrduScript(v2Output)) {
    const core = roman.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    const lower = core.toLowerCase();
    if (LOANWORD_URDU[lower]) return { source: "lexicon", confidence: "high" };
    const lex = lookupNormalized(lower);
    if (lex && lex[0] && v2Output.includes(lex[0])) return { source: "lexicon", confidence: "high" };
    return { source: "phonetic", confidence: "medium" };
  }
  if (v2Output === roman) {
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

const CLOSED_REVIEW_PARTICLES = new Set([
  "na", "nahi", "nahin", "is", "us", "ke", "ka", "ki", "ko", "se", "par", "pe",
  "to", "bhi", "hi", "aur", "ya", "jo", "jab", "tab", "mein", "main", "mai",
  "ne", "e", "o", "ye", "woh", "wo", "hai", "hain", "ho",
]);

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

  // Closed particles with confident conversion: do not invent noisy Review choices
  const romanCore = roman.toLowerCase().replace(/[^a-z]/g, "");
  if (CLOSED_REVIEW_PARTICLES.has(romanCore) && confidence === "high") {
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

  // High-confidence context defaults (e.g. mein → میں) do not expose the
  // original Roman spelling as a "useful alternative". That falsely inflated
  // Review counts. Genuine multi-Urdu lexicon alternatives are already handled above.
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

    let v2TokOut = engineV2.convert(seg.text).output;
    const core = seg.text.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    const lower = core.toLowerCase();

    // formalStemConvert override: use deterministic stem result when available
    const stemHit = formalStemConvert(seg.text);

    if (stemHit) {
      v2TokOut = stemHit;
    } else if (LOANWORD_URDU[lower] || EXTRA_LOANWORDS[lower]) {
      const hasCue = segs.some(x => {
        const c = x.text.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "").toLowerCase();
        return !!c && c !== lower && !LOANWORD_URDU[c] && !EXTRA_LOANWORDS[c] &&
          ["mein","main","hai","hain","kal","aaj","jana","ana","aana","bhejo","kar","ko","se","par","ki","ka","ke","nahi","ho","gayi","gaya","cancel","karo","karein","kiya","hua","hui","hue","raha","rahe"].includes(c);
      });
      if (hasCue) {
        const idx = core ? seg.text.toLowerCase().indexOf(lower) : -1;
        const lead = idx >= 0 ? seg.text.slice(0, idx) : "";
        const trail = idx >= 0 ? seg.text.slice(idx + core.length) : "";
        const loanTarget = LOANWORD_URDU[lower] ?? EXTRA_LOANWORDS[lower];
        v2TokOut = lead + loanTarget + trail;
      }
    }
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
  // 0. Pre-tokenization structural compound resolver
  //    Converts X-e-Y izafat chains, X-o-Y coordination, and known lexical
  //    compounds into space-separated forms the engine handles correctly.
  const resolved = resolveCompounds(input);

  // 1. Get authoritative V2 output (this is the production result)
  const v2Result = engineV2.convert(resolved);
  let v2Output = v2Result.output;

  // 1b. Smart loanword safety pass: fix V2 phonetic garbage using EXTRA_LOANWORDS mappings,
  //     or preserve Latin when no established Urdu script form exists.
  {
    const inputSegs = resolved.split(/(\s+)/);
    // Check if sentence has Urdu context cues (needed for loanword conversion)
    const hasUrduCue = inputSegs.some(s => {
      const c = s.trim().toLowerCase();
      return /^(?:mein|main|hai|hain|ka|ki|ke|ko|se|par|ne|aur|ya|nahi|nhi|tha|thi|hoga|hogi|raha|rahe|karo|karein|kiya|hua|hui|hue|bhejo|bheja|bhejna|dijiye|lao|laao)$/.test(c);
    });
    if (hasUrduCue) {
      // Step 1: String-level EXTRA_LOANWORDS pass — applies even when phrase compression
      // changes token counts. Replaces English words with established Urdu loanword forms.
      for (const [eng, urdu] of Object.entries(EXTRA_LOANWORDS)) {
        const re = new RegExp(`(^|\s)${eng}(\s|$)`, "gi");
        v2Output = v2Output.replace(re, (m, pre, post) => pre + urdu + post);
      }
      // Step 2: Per-token alignment pass — only when token counts match.
      // Handles edge cases where string-level pass missed something.
      const outputToks = v2Output.split(/(\s+)/);
      if (inputSegs.length === outputToks.length) {
        const fixed = outputToks.map((tok, i) => {
          if (/^\s+$/.test(tok)) return tok;
          const src = inputSegs[i]?.trim() ?? "";
          const srcLower = src.toLowerCase();
          if (!src || isProtectedToken(src)) return tok;
          if (isKnownEnglish(srcLower)) {
            // Apply EXTRA_LOANWORDS mapping if available (overrides V2's phonetic)
            const extraHit = EXTRA_LOANWORDS[srcLower];
            if (extraHit) return extraHit;
            // If it's already in LOANWORD_URDU, V2 converted it correctly → keep tok
            if (LOANWORD_URDU[srcLower]) return tok;
            // No mapping in either table → preserve Latin (avoid phonetic garbage)
            if (isUrduScript(tok)) return src;
          }
          return tok;
        });
        v2Output = fixed.join("");
      }
    }
  }
  // 2. Build per-token metadata
  const segments = buildInternalSegments(resolved);

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

  // Phase 19A.18+: Resolve izafat placeholder from ALL candidate outputs.
  // _IZ_ is an internal compound-resolver marker. It must NEVER reach any
  // user-facing surface — primary output, Alternative Versions, exports,
  // Review text, or handoff. Applying here ensures complete coverage
  // regardless of which pipeline path each surface uses downstream.
  for (const cand of sentenceCandidates) {
    cand.output = resolveIzafatInOutput(cand.output);
  }
  v2Output = sentenceCandidates[0].output; // keep primary field in sync

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
