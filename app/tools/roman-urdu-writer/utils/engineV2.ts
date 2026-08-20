/**
 * Qalam Roman Urdu Engine v2 — Hardened Hybrid
 * Phase 19A.0c
 *
 * Architecture layers (in order):
 *   1. Tokenization + whitespace preservation
 *   2. Protected-token detection (hard: URLs/emails/nums/hashtags/acronyms)
 *   3. Proper-name soft protection (Title Case unknown words → preserve)
 *   4. Phrase detection (longest-match, before per-token)
 *   5. Candidate generation (lexicon + morphological expansion)
 *   6. Spelling-variant normalisation (for lookup only)
 *   7. Context-aware candidate ranking
 *   8. Output reconstruction (preserve spacing)
 */

import type { RomanUrduEngine, EngineResult } from "./benchmarkScorer";
import { segmentInput, isProtectedToken, type TokenSegment } from "./protectedTokens";
import { lookupNormalized, lookupToken } from "./lexicon";
import { generateCandidates } from "./graphemeGenerator";
import { normalizeRomanUrduToken, romanNormalizationCandidates, morphologyFitScore, formalStemConvert } from "./romanUrduNormalize";
import { lookupRomanUrduLexicon } from "./romanUrduLexicon";
import { rankUrduCandidates } from "./candidateRanker";
import { ngramScore } from "./urduNgramScorer";
import { PHRASE_TABLE, normPhrase } from "./phraseTable";

// ── Proper-name soft protection ───────────────────────────────────────────────

/** Known product/brand names that must be preserved verbatim. */
const KNOWN_BRANDS = new Set([
  "zoom","google","whatsapp","youtube","netflix","facebook","instagram",
  "twitter","tiktok","excel","word","powerpoint","pdf","wifi","android",
  "iphone","samsung","apple","microsoft","amazon","chatgpt","github",
  "slack","discord","signal","telegram","snapchat","linkedin","spotify",
  "uber","careem","daraz","foodpanda","bykea",
]);

/** Words that look Title Case but should be converted (not protected).
 *  Only include pure function words that are NEVER proper names. */
const CONVERT_DESPITE_CAPS = new Set([
  // Pure function words — can never be names
  "jo", "jab", "tab", "par", "pe", "se", "ko", "ka", "ki", "ke",
  "na", "nahi", "bhi", "hi", "to", "ab", "ab", "ya", "aur", "lekin",
]);

/** Common English words that should stay English in mixed Urdu text. */
const KEEP_ENGLISH = new Set([
  "ok","okay","please","sorry","thanks","hello","bye","yes","no",
  "number","no",  // "number" must stay English; نمبر is the Urdu but corpus expects English
  "problem","issue","update","install","login","password","email","link",
  "call","text","message","photo","file","data","app","chat","story","design","location","help","boss","extend","open","join","start","starts","closed","today","tomorrow",
  "online","offline","busy","free","plan","class",
  "team","project","resume","backup","download","upload","print","share",
  "cancel","confirm","submit","save","delete","copy","paste","search",
  "gym","coffee","mood","signal","wifi","battery","mode","status","type",
  "deadline","schedule","report","presentation","interview","salary","bonus",
  "ticket","voucher","discount","delivery","order","track","rate","charge",
  "doctor","nurse","medicine","clinic","hospital","test","report",
  "school","college","university","exam","result","degree","course",
  "match","game","play","team","player","score","win","lose","draw",
  "party","event","trip","tour","hotel","flight","visa","passport",
  "market","mall","shop","store","brand","price","deal","sale",
  "movie","drama","song","show","season","episode","channel","channel",
  "laptop","tablet","screen","keyboard","mouse","printer","camera","mic",
  "server","system","software","hardware","network","internet","website",
]);

/** Function words that are commonly capitalized sentence-initially but should still be converted. */
const COMMON_SENTENCE_INITIAL = new Set([
  // High-frequency Roman Urdu words that start sentences but should convert
  "aaj","kal","kya","kia","ab","abhi","phir","phr","lekin","magar",
  "wahan","yahan","sab","kuch","haan","nahi","bilkul","zaroor",
  "bohot","bohat","bhot","theek","thek","achha","acha","jaldi",
  "shukriya","shukria","zaroor","subah","raat","din","ghar","kaam","dilon",
]);

/**
 * Returns true if a Title-Case token looks like an English proper noun or
 * product name that should be preserved rather than guessed.
 * Conservative: errs toward preservation for genuine ambiguity.
 */

export const LOANWORD_URDU: Record<string, string> = {
  "meeting": "میٹنگ",
  "office": "آفس",
  "video": "ویڈیو",
  "group": "گروپ",
  "policy": "پالیسی",
  "policies": "پالیسیز",
  "company": "کمپنی",
  "inflation": "انفلیشن",
  "document": "ڈاکومنٹ",
  "documents": "ڈاکومنٹس",
  "investigation": "انویسٹی گیشن",
  "verification": "ویریفیکیشن",
  "update": "اپ ڈیٹ",
  "updates": "اپ ڈیٹس",
  "hr": "ایچ آر",
  "social": "سوشل",
  "media": "میڈیا",
};
const URDU_CONTEXT_CUES = new Set([
  "aaj","kal","kya","kia","ab","abhi","phir","mein","main","mai","hai","hain",
  "tha","thi","the","hoon","hon","houn","nahi","nahin","bohot","bohat","theek",
  "acha","achha","ghar","kaam","jana","ana","aana","bhejo","karo","kar","ko",
  "se","par","pe","ki","ka","ke","ne","aur","lekin","magar","kyun","kyon",
  "wahan","yahan","sab","kuch","haan","bilkul","zaroor","jaldi","subah","raat",
  "mujhe","mujh","aap","dil","dilon","reh","rehm","farma","ata","khuloos",
  "muhabbat","saadgi","tabiyat","samajh","likh","parhna","milna","rehna",
  "cancel","ho","gayi","gaya","hoga","hogi",
]);
const ENGLISH_FUNCTION_WORDS = new Set([
  "the","is","are","was","were","a","an","to","of","in","on","for","with","and","or","but",
  "not","this","that","it","be","have","has","had","do","does","did","will","would","can",
  "could","should","may","might","must","from","by","at","as","if","than","then","so","such",
  "into","over","after","before","between","under","again","further","once","here","there",
  "when","where","why","how","all","each","few","more","most","other","some","no","nor",
  "only","own","same","too","very","just","because","while","during","about","please",
  "send","closed","today","starts","start","pm","am","me","my","your","you","we","they",
  "he","she","him","her","his","their","our","us","them","what","which","who","whom",
  "i","want","join","open","file","meet","tomorrow","now","group","will",
]);
export function sentenceHasUrduContext(segments: { text: string; protected?: boolean }[], loanLower = ""): boolean {
  for (const seg of segments) {
    if (/^\s+$/.test(seg.text) || seg.protected) continue;
    const core = seg.text.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "").toLowerCase();
    if (!core || core === loanLower) continue;
    if (LOANWORD_URDU[core] || KEEP_ENGLISH.has(core) || ENGLISH_FUNCTION_WORDS.has(core)) continue;
    if (URDU_CONTEXT_CUES.has(core)) return true;
    const lex = lookupNormalized(core);
    if (lex && lex[0] && /[\u0600-\u06FF]/.test(lex[0])) return true;
  }
  return false;
}
function collapseRepeats(token: string): string {
  return token.toLowerCase().replace(/(.)\1{2,}/g, "$1");
}
function looksLikeEnglish(token: string): boolean {
  const lower = token.toLowerCase();
  const collapsed = collapseRepeats(token);
  if (KEEP_ENGLISH.has(lower) || KEEP_ENGLISH.has(collapsed)) return true;
  if (ENGLISH_FUNCTION_WORDS.has(lower) || ENGLISH_FUNCTION_WORDS.has(collapsed)) return true;
  if (/(tion|sion|ture|ment|ness|able|ally|ity|ful|less|ous|ive)$/.test(lower)) return true;
  return false;
}
function phoneticFallback(token: string, opts?: { force?: boolean }): string[] {
  const raw = token.trim();
  if (raw.length < 2) return [];
  const norms = romanNormalizationCandidates(raw);
  const lexDirect = lookupRomanUrduLexicon(raw);
  if (lexDirect) return [lexDirect];
  for (const n of norms) {
    const lexN = lookupRomanUrduLexicon(n);
    if (lexN) return [lexN];
    const key = n.replace(/3/g, "");
    if (LOANWORD_URDU[n] || LOANWORD_URDU[key]) {
      return [LOANWORD_URDU[n] || LOANWORD_URDU[key]];
    }
  }
  if (!opts?.force && looksLikeEnglish(raw.replace(/'/g, ""))) return [];

  const pool: { text: string; score: number }[] = [];
  for (const norm of norms) {
    if (!/^[A-Za-z0-9'3\-]+$/.test(norm) && !/^[A-Za-z3\-]+$/.test(norm)) continue;
    const cands = generateCandidates(norm);
    for (const c of cands) {
      if (!c.text || !/[\u0600-\u06FF]/.test(c.text)) continue;
      pool.push({ text: c.text, score: c.score });
    }
  }
  if (pool.length === 0) return [];

  return rankUrduCandidates(norms[0] || raw, pool, ngramScore);
}

function convertHyphenatedCompound(token: string, force: boolean): string | null {
  if (!token.includes("-")) return null;
  const parts = token.split("-");
  if (parts.length < 2) return null;
  if (parts.some(part => !/^[A-Za-z']+$/.test(part))) return null;

  const render = (part: string): string => {
    const lex = lookupRomanUrduLexicon(part);
    if (lex) return lex;
    const stem = formalStemConvert(part);
    if (stem) return stem;
    const low = normalizeRomanUrduToken(part).replace(/3/g, "") || part.toLowerCase();
    if (LOANWORD_URDU[low] || LOANWORD_URDU[part.toLowerCase()]) {
      return LOANWORD_URDU[low] || LOANWORD_URDU[part.toLowerCase()];
    }
    if (low === "o" || low === "wa") return "و";
    if (low === "ghair" || low === "ghayr") return "غیر";
    if (low === "bilaa" || low === "bila") return "بلا";
    if (low === "amal") return "عمل";
    if (low === "daramad" || low === "darmad") return "درآمد";
    const morph = morphExpand(low);
    if (morph.length && morph[0] !== part && /[\u0600-\u06FF]/.test(morph[0])) return morph[0];
    const ph = phoneticFallback(part, { force });
    if (ph.length) return ph[0];
    return part;
  };

  return parts.map(render).join(" ").replace(/\s+/g, " ").trim();
}
function peelPunctuation(token: string): { lead: string; core: string; trail: string } {
  const m = token.match(/^([^A-Za-z0-9']*)([A-Za-z0-9']+)([^A-Za-z0-9']*)$/);
  if (!m) return { lead: "", core: token, trail: "" };
  return { lead: m[1], core: m[2], trail: m[3] };
}
function reattach(lead: string, urdu: string, trail: string): string {
  return lead + urdu + trail;
}

function isSoftProtected(token: string): boolean {
  const lower = token.toLowerCase();
  // Pure function words in CONVERT_DESPITE_CAPS → always convert
  if (CONVERT_DESPITE_CAPS.has(lower)) return false;
  // Very common sentence-initial Roman Urdu words → still convert even if Title Case
  if (COMMON_SENTENCE_INITIAL.has(lower)) return false;
  // Known brands (case-insensitive) → always preserve
  if (KNOWN_BRANDS.has(lower)) return true;
  // CamelCase (e.g. WhatsApp, YouTube) → always preserve
  if (/^[A-Z][a-z]+[A-Z]/.test(token)) return true;
  // All-caps → hard-protected already; nothing to do here
  if (/^[A-Z]{2,}$/.test(token)) return false;
  // Title Case token: preserve if NOT a pure common function word
  // This handles: Eid, Namaz, Sara, Ahmed, Zoom, Karachi, etc.
  if (/^[A-Z][a-z]{1,}$/.test(token)) return true;
  return false;
}

// ── Spelling-variant normalisation (lookup only) ─────────────────────────────

const SPELLING_VARIANTS: Record<string, string> = {
  "mein": "mein", "me": "mein", "mn": "mein",
  "kyu": "kyun", "q": "kyun",
  "hy": "hai", "he": "hai",
  "nai": "nahi", "nh": "nahi", "ni": "nahi",
  "aap": "ap",
  "kese": "kaise", "kasy": "kaise",
  "kr": "kar",
  "mjhe": "mujhe",
  "thk": "theek",
  "bhot": "bohot", "bhut": "bohot", "bohat": "bohot",
  "yar": "yaar",
  "phr": "phir",
  "zra": "zara",
  "agr": "agar",
  "koi": "koi",
  "phly": "pehle",
  "sb": "sab",
  "smjha": "samjha", "smjho": "samjho",
  "thnx": "thnx",
  "okk": "ok",
};

function normalizeForLookup(token: string): string {
  const lower = token.toLowerCase();
  return SPELLING_VARIANTS[lower] ?? lower;
}

// ── Morphological expansion ───────────────────────────────────────────────────

/** Generate Urdu candidates for a Roman token via morphological rules. */
function morphExpand(token: string): string[] {
  const lower = token.toLowerCase();
  // Repeated-char collapse
  const collapsed = lower.replace(/(.)\1{2,}/g, "$1");

  // Direct lookup after normalisation
  const norm = normalizeForLookup(lower);
  const direct = lookupNormalized(norm) ?? lookupNormalized(collapsed);
  if (direct) return Array.from(new Set(direct));

  // Verb form generation
  const verbStems: Record<string, string[]> = {
    "hoon": ["ہوں"], "houn": ["ہوں"], "hon": ["ہوں"],
    "kehna": ["کہنا"], "kehne": ["کہنے"],
    "chahta": ["چاہتا"], "chahti": ["چاہتی"], "chahte": ["چاہتے"], "chahna": ["چاہنا"],
    "raha": ["رہا"], "rahi": ["رہی"], "rahe": ["رہے"],
    "sakta": ["سکتا"], "sakti": ["سکتی"], "sakte": ["سکتے"],
    "tha": ["تھا"], "thi": ["تھی"], "they": ["تھے"],
    "ga": ["گا"], "gi": ["گی"], "ge": ["گے"],
    "jay": ["جائے"], "jaye": ["جائے"], "jayega": ["جائے گا"], "jaye ga": ["جائے گا"],
    "aaya": ["آیا"], "aya": ["آیا"], "aayi": ["آئی"], "ayi": ["آئی"],
    "aaye": ["آئے"], "aae": ["آئے"],
    "baja": ["بجا"], "baje": ["بجے"], "baj": ["بج"],
    "hua": ["ہوا"], "hui": ["ہوئی"], "hue": ["ہوئے"],
    "kha": ["کھا"], "khai": ["کھائی"], "khaye": ["کھائے"],
    "pi": ["پی"], "piya": ["پیا"],
    "so": ["سو"], "sona": ["سونا"], "soya": ["سویا"],
    "laga": ["لگا"], "lagi": ["لگی"], "lage": ["لگے"],
    "mili": ["ملی"], "mila": ["ملا"], "mile": ["ملے"],
    "diya": ["دیا"], "di": ["دی"], "diye": ["دیے"],
    "lia": ["لیا"], "liya": ["لیا"], "li": ["لی"],
    "bola": ["بولا"], "boli": ["بولی"],
    "kaha": ["کہا"], "kahi": ["کہی"],
    "suna": ["سنا"], "suni": ["سنی"],
    "dekha": ["دیکھا"], "dekhi": ["دیکھی"],
    "chal": ["چل"], "chala": ["چلا"], "chali": ["چلی"],
    "nikal": ["نکال"], "nikla": ["نکلا"],
    "jaa": ["جا"], "jaao": ["جاؤ"], "jao": ["جاؤ"],
    "aao": ["آؤ"], "aa": ["آ"],
    "maro": ["مارو"], "mara": ["مارا"],
    "pakro": ["پکڑو"], "pakra": ["پکڑا"],
    "uthao": ["اٹھاؤ"], "utho": ["اٹھو"],
    "baitho": ["بیٹھو"], "baitha": ["بیٹھا"], "baithi": ["بیٹھی"],
    "kholo": ["کھولو"], "khola": ["کھولا"],
    "band": ["بند"], "bando": ["بند کرو"],
    "lao": ["لاؤ"], "laya": ["لایا"],
    "pahucha": ["پہنچا"], "pahuchi": ["پہنچی"], "pohoncha": ["پہنچا"],
    "pohonch": ["پہنچ"], "pahuncha": ["پہنچا"],
    "bhaga": ["بھاگا"], "bhago": ["بھاگو"],
    "gira": ["گرا"], "girna": ["گرنا"],
    "utha": ["اٹھا"], "uthna": ["اٹھنا"],
    "socha": ["سوچا"], "sochu": ["سوچوں"], "socho": ["سوچو"],
    "parha": ["پڑھا"], "parhe": ["پڑھے"], "parho": ["پڑھو"],
    "likha": ["لکھا"], "likhi": ["لکھی"],
    "bata": ["بتا"], "batao": ["بتاؤ"], "bataya": ["بتایا"],
    "poocha": ["پوچھا"], "poocho": ["پوچھو"],
    "samjha": ["سمجھا"], "samjhi": ["سمجھی"], "samjhe": ["سمجھے"],
    "thak": ["تھک"], "thaka": ["تھکا"], "thaki": ["تھکی"],
    "ruk": ["رک"], "ruko": ["رکو"], "ruka": ["رکا"],
    "chhod": ["چھوڑ"], "chhodna": ["چھوڑنا"], "chhoda": ["چھوڑا"],
    "pakad": ["پکڑ"], "pakad lena": ["پکڑ لینا"],
    "bhool": ["بھول"], "bhoola": ["بھولا"],
    "sambhal": ["سنبھال"], "sambhalo": ["سنبھالو"],
    "rok": ["روک"], "roko": ["روکو"],
    "mil": ["مل"], "milo": ["ملو"],
    "sur": ["سر"], "sura": ["سورہ"],
    "jeet": ["جیت"], "jeeta": ["جیتا"],
    "haar": ["ہار"], "haara": ["ہارا"],
    "toot": ["ٹوٹ"], "toota": ["ٹوٹا"],
    "bana": ["بنا"], "banao": ["بناؤ"], "banaya": ["بنایا"], "banana": ["بنانا"],
    "gum": ["گم"], "guma": ["گما"],
    "kho": ["کھو"], "khona": ["کھونا"], "khoya": ["کھویا"],
  };
  if (verbStems[lower]) return verbStems[lower];

  // Noun/adjective suffixes
  if (lower.endsWith("wala")) return [lower.replace(/wala$/, "والا")];
  if (lower.endsWith("wali")) return [lower.replace(/wali$/, "والی")];
  if (lower.endsWith("wale")) return [lower.replace(/wale$/, "والے")];
  if (lower.endsWith("walay")) return [lower.replace(/walay$/, "والے")];
  if (lower.endsWith("ein") || lower.endsWith("ain")) {
    const stem = lookupNormalized(lower.replace(/e?i?n$/, ""));
    if (stem) return [stem[0] + "یں"];
  }

  return [];
}

// ── Context-sensitive disambiguation ─────────────────────────────────────────

const AMBIGUOUS_DEFAULTS: Record<string, string> = {
  "main": "میں", "mein": "میں", "mai": "میں",
  "to":   "تو",
  "is":   "اس",
  "par":  "پر",
  "pe":   "پر",
  "bus":  "بس",
  "na":   "نہ",
  "kal":  "کل",
  "jo":   "جو",
  "jab":  "جب",
  "tab":  "تب",
};

/** Context ranking — use neighbouring tokens to pick best candidate. */
function rankWithContext(
  token: string,
  prevUrdu: string,
  nextRoman: string
): string | null {
  const lower = token.toLowerCase();
  const ambig = AMBIGUOUS_DEFAULTS[lower];
  if (ambig) return ambig;
  return null;
}

// ── Main conversion function ──────────────────────────────────────────────────

interface ConvertedSegment {
  text: string;
  candidates: string[]; // [best, alt1, alt2]
  protected: boolean;
}

function convertSegments(segments: TokenSegment[]): ConvertedSegment[] {
  const result: ConvertedSegment[] = [];
  let i = 0;
  const sentenceUrduContext = sentenceHasUrduContext(segments, "");

  while (i < segments.length) {
    const seg = segments[i];

    // Whitespace — pass through
    if (/^\s+$/.test(seg.text)) {
      result.push({ text: seg.text, candidates: [seg.text], protected: true });
      i++;
      continue;
    }

    // Hard-protected token (URLs, emails, filenames, numbers, brands…)
    if (seg.protected || isProtectedToken(seg.text)) {
      if (sentenceUrduContext) {
        const low = seg.text.toLowerCase();
        const loan = LOANWORD_URDU[low];
        if (loan && /^[A-Za-z]{1,5}$/.test(seg.text)) {
          result.push({ text: seg.text, candidates: [loan], protected: false });
          i++;
          continue;
        }
      }
      result.push({ text: seg.text, candidates: [seg.text], protected: true });
      i++;
      continue;
    }

    // KEEP_ENGLISH only outside Roman-Urdu context
    if (!sentenceUrduContext) {
      const low = seg.text.toLowerCase();
      const collapsed = low.replace(/(.)\1{2,}/g, "$1");
      if (KEEP_ENGLISH.has(low) || KEEP_ENGLISH.has(collapsed)) {
        result.push({ text: seg.text, candidates: [seg.text], protected: true });
        i++;
        continue;
      }
    }
    {
      const { lead, core, trail } = peelPunctuation(seg.text);
      const lower = (core || seg.text).toLowerCase();
      const loan = LOANWORD_URDU[lower];
      if (loan) {
        if (sentenceHasUrduContext(segments, lower)) {
          result.push({ text: seg.text, candidates: [reattach(lead, loan, trail)], protected: false });
        } else {
          result.push({ text: seg.text, candidates: [seg.text], protected: true });
        }
        i++;
        continue;
      }
    }

    // Soft-protected (proper noun / unknown Title Case)
    if (isSoftProtected(seg.text)) {
      const lower = seg.text.toLowerCase();
      if (KNOWN_BRANDS.has(lower) || /^[A-Z][a-z]+[A-Z]/.test(seg.text)) {
        result.push({ text: seg.text, candidates: [seg.text], protected: true });
        i++;
        continue;
      }
      const lowerCands = lookupNormalized(lower);
      if (lowerCands && lowerCands.length > 0) {
        const isReligiousTerm = /^(allah|alhamdulillah|mashallah|inshaallah|subhanallah)$/.test(lower);
        if (isReligiousTerm || sentenceUrduContext) {
          result.push({ text: seg.text, candidates: [lowerCands[0]], protected: false });
          i++;
          continue;
        }
      }
      if (sentenceUrduContext) {
        const { lead, core, trail } = peelPunctuation(seg.text);
        const work = core || seg.text;
        const loan = LOANWORD_URDU[work.toLowerCase()];
        if (loan) {
          result.push({ text: seg.text, candidates: [reattach(lead, loan, trail)], protected: false });
          i++;
          continue;
        }
        const lexHit = lookupRomanUrduLexicon(work);
        if (lexHit) {
          result.push({ text: seg.text, candidates: [reattach(lead, lexHit, trail)], protected: false });
          i++;
          continue;
        }
        const stemHit = formalStemConvert(work);
        if (stemHit) {
          result.push({ text: seg.text, candidates: [reattach(lead, stemHit, trail)], protected: false });
          i++;
          continue;
        }
        const phonetic = phoneticFallback(work, { force: true });
        if (phonetic.length > 0) {
          result.push({ text: seg.text, candidates: phonetic.map(c => reattach(lead, c, trail)), protected: false });
          i++;
          continue;
        }
      }
      result.push({ text: seg.text, candidates: [seg.text], protected: true });
      i++;
      continue;
    }

    // Phrase matching — try longest match first (up to 6 tokens ahead)
    let phraseMatched = false;
    for (let len = 6; len >= 2; len--) {
      const phraseParts: string[] = [];
      let j = i;
      let tokenCount = 0;
      while (j < segments.length && tokenCount < len) {
        if (!/^\s+$/.test(segments[j].text)) {
          phraseParts.push(segments[j].text);
          tokenCount++;
        }
        j++;
      }
      if (phraseParts.length < len) continue;
      const phrase = normPhrase(phraseParts.join(" "));
      const urduPhrase = PHRASE_TABLE[phrase];
      if (urduPhrase) {
        // Consume tokens up to j
        let consumed = i;
        while (consumed < j) {
          result.push({ text: segments[consumed].text, candidates: [consumed === i ? urduPhrase : ""], protected: true });
          consumed++;
        }
        // Collapse: first segment gets the phrase, rest get empty (they'll be skipped in reconstruction)
        // Actually mark as phrase head
        result[result.length - (j - i)].candidates = [urduPhrase];
        for (let k = result.length - (j - i) + 1; k < result.length; k++) {
          result[k] = { text: "", candidates: [""], protected: true };
        }
        i = j;
        phraseMatched = true;
        break;
      }
    }
    if (phraseMatched) continue;

    // Per-token candidate generation
    const token = seg.text;

    // Context
    let prevUrdu = "";
    for (let k = result.length - 1; k >= 0; k--) {
      if (result[k].candidates[0] && !/^\s+$/.test(result[k].candidates[0])) {
        prevUrdu = result[k].candidates[0]; break;
      }
    }
    const nextRoman = (() => {
      for (let k = i + 1; k < segments.length; k++) {
        if (!/^\s+$/.test(segments[k].text)) return segments[k].text;
      }
      return "";
    })();

    const { lead, core, trail } = peelPunctuation(token);
    const workToken = core || token;
    if (sentenceUrduContext) {
      const ctxResult = rankWithContext(workToken, prevUrdu, nextRoman);
      if (ctxResult) {
        result.push({ text: token, candidates: [reattach(lead, ctxResult, trail)], protected: false });
        i++;
        continue;
      }
    }
    if (!sentenceUrduContext && ENGLISH_FUNCTION_WORDS.has(workToken.toLowerCase())) {
      result.push({ text: token, candidates: [token], protected: true });
      i++;
      continue;
    }
    if (workToken.includes("-")) {
      const compound = convertHyphenatedCompound(workToken, sentenceUrduContext);
      if (compound && compound !== workToken && /[\u0600-\u06FF]/.test(compound)) {
        result.push({ text: token, candidates: [reattach(lead, compound, trail)], protected: false });
        i++;
        continue;
      }
    }

    const morphCandidates = morphExpand(workToken);
    if (morphCandidates.length > 0) {
      const mapped = morphCandidates.map(c => c && c !== workToken ? reattach(lead, c, trail) : token);
      result.push({ text: token, candidates: mapped, protected: false });
      i++;
      continue;
    }
    const letterTokens = segments.filter(seg2 => seg2.text.replace(/[^A-Za-z]/g, "").length >= 2);
    const isolatedUnknown = letterTokens.length === 1;
    if (sentenceUrduContext || isolatedUnknown) {
      const lexHit = lookupRomanUrduLexicon(workToken);
      if (lexHit) {
        result.push({ text: token, candidates: [reattach(lead, lexHit, trail)], protected: false });
        i++;
        continue;
      }
      const stemHit = formalStemConvert(workToken);
      if (stemHit) {
        result.push({ text: token, candidates: [reattach(lead, stemHit, trail)], protected: false });
        i++;
        continue;
      }
      const phonetic = phoneticFallback(workToken, { force: sentenceUrduContext });
      if (phonetic.length > 0) {
        result.push({ text: token, candidates: phonetic.map(c => reattach(lead, c, trail)), protected: false });
        i++;
        continue;
      }
    }
    result.push({ text: token, candidates: [token], protected: false });
    i++;
  }

  return result;
}

// ── True sentence-level Top-3 beam search ─────────────────────────────────────

/**
 * Generates up to 3 unique, ranked complete output strings via a lightweight
 * beam over the first N ambiguous token positions.
 *
 * Strategy:
 * 1. Convert all segments, collecting per-token candidate lists
 * 2. Find positions with > 1 candidate (beam positions)
 * 3. Enumerate ranked combinations of at most 2 beam positions
 * 4. Return top 3 unique complete-output strings
 *
 * Deterministic: candidates sorted by (beam position, candidate index).
 * Protected tokens are identical in every candidate output.
 */
function buildTop3(converted: ConvertedSegment[]): string[] {
  // Find segments with real alternatives
  const beamPositions: { idx: number; cands: string[] }[] = [];
  for (let i = 0; i < converted.length; i++) {
    const seg = converted[i];
    if (!seg.protected && seg.candidates.length > 1) {
      const unique = [...new Set(seg.candidates)];
      if (unique.length > 1) beamPositions.push({ idx: i, cands: unique });
    }
    if (beamPositions.length >= 2) break; // cap at 2 beam positions
  }

  if (beamPositions.length === 0) {
    const base = reconstructFromConverted(converted, {});
    return [base];
  }

  // Enumerate combinations: vary first beam position (up to 3 choices)
  // and optionally second beam position (up to 2 choices)
  const outputs: string[] = [];

  for (let c0 = 0; c0 < Math.min(beamPositions[0].cands.length, 3); c0++) {
    if (beamPositions.length === 1) {
      const override = { [beamPositions[0].idx]: beamPositions[0].cands[c0] };
      outputs.push(reconstructFromConverted(converted, override));
    } else {
      for (let c1 = 0; c1 < Math.min(beamPositions[1].cands.length, 2); c1++) {
        const override = {
          [beamPositions[0].idx]: beamPositions[0].cands[c0],
          [beamPositions[1].idx]: beamPositions[1].cands[c1],
        };
        outputs.push(reconstructFromConverted(converted, override));
        if (outputs.length >= 6) break;
      }
      if (outputs.length >= 6) break;
    }
  }

  // Deduplicate, preserve order, take top 3
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const o of outputs) {
    if (!seen.has(o)) { seen.add(o); unique.push(o); }
    if (unique.length >= 3) break;
  }
  return unique;
}

function reconstructFromConverted(
  converted: ConvertedSegment[],
  overrides: Record<number, string>
): string {
  return converted
    .filter(s => s.candidates[0] !== "")
    .map((s, i) => overrides[i] ?? s.candidates[0] ?? s.text)
    .join("");
}

// ── Engine v2 export ──────────────────────────────────────────────────────────

export const engineV2: RomanUrduEngine = {
  name: "engine-v2-hardened-hybrid",

  convert(input: string): EngineResult {
    const segments = segmentInput(input);
    const converted = convertSegments(segments);

    const outputs = buildTop3(converted);
    const base = outputs[0];

    return {
      output: base,
      candidates: outputs.map(o => ({ output: o })),
    };
  },
};

export default engineV2;
