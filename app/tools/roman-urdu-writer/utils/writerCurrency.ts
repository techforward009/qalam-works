/**
 * Urdu Writer — Currency and BiDi presentation utilities
 * Phase 19A.13
 *
 * SCOPE: display/presentation layer only.
 * - transformPKRAmount: converts explicit RS./Rs./PKR amounts in-place
 * - renderUrduOutputWithBidi: wraps LTR islands (numbers, dates) in <bdi dir="ltr">
 *   for correct visual display in RTL context WITHOUT altering exported text
 *
 * Rules:
 *   RS. / Rs. / rs. followed by a number → Urdu words + روپے
 *   PKR followed by a number             → same
 *   Plain numbers, %, dates, URLs, emails, phones → NEVER touched
 *
 * Lakh/crore conventions:
 *   1,00,000 = 1 lakh
 *   1,00,00,000 = 1 crore
 *   This function handles plain comma or no-comma digit strings only;
 *   structured Indian notation is normalized in parsing.
 */

// ── Number-word conversion (Urdu, lakh/crore system) ─────────────────────────

const ONES: string[] = [
  "", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو",
  "دس", "گیارہ", "بارہ", "تیرہ", "چودہ", "پندرہ", "سولہ", "سترہ", "اٹھارہ", "انیس",
  "بیس",
];

const TENS: string[] = [
  "", "", "بیس", "تیس", "چالیس", "پچاس", "ساٹھ", "ستر", "اسی", "نوے",
];

// Pakistani Urdu numbers 21–99 use irregular compound forms (not compositional)
const TWO_DIGIT: Record<number, string> = {
  21:"اکیس",22:"بائیس",23:"تئیس",24:"چوبیس",25:"پچیس",26:"چھبیس",27:"ستائیس",28:"اٹھائیس",29:"انتیس",
  31:"اکتیس",32:"بتیس",33:"تینتیس",34:"چونتیس",35:"پینتیس",36:"چھتیس",37:"سینتیس",38:"اڑتیس",39:"انتالیس",
  41:"اکتالیس",42:"بیالیس",43:"تینتالیس",44:"چوالیس",45:"پینتالیس",46:"چھیالیس",47:"سینتالیس",48:"اڑتالیس",49:"انچاس",
  51:"اکیاون",52:"باون",53:"تریپن",54:"چون",55:"پچپن",56:"چھپن",57:"ستاون",58:"اٹھاون",59:"انسٹھ",
  61:"اکسٹھ",62:"باسٹھ",63:"تریسٹھ",64:"چوسٹھ",65:"پینسٹھ",66:"چھیاسٹھ",67:"سڑسٹھ",68:"اڑسٹھ",69:"انھتر",
  71:"اکہتر",72:"بہتر",73:"تہتر",74:"چوہتر",75:"پچھتر",76:"چھہتر",77:"ستتر",78:"اٹھہتر",79:"انیاسی",
  81:"اکاسی",82:"بیاسی",83:"تراسی",84:"چوراسی",85:"پچاسی",86:"چھیاسی",87:"ستاسی",88:"اٹھاسی",89:"نواسی",
  91:"اکانوے",92:"بانوے",93:"ترانوے",94:"چورانوے",95:"پچانوے",96:"چھیانوے",97:"ستانوے",98:"اٹھانوے",99:"ننانوے",
};

function twoDigit(n: number): string {
  if (n === 0) return "";
  if (n <= 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return TENS[tens];
  return TWO_DIGIT[n] ?? (ONES[ones] + " " + TENS[tens]);
}

function threeDigit(n: number): string {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const hundreds = h > 0 ? ONES[h] + " سو" : "";
  const rest = rem > 0 ? twoDigit(rem) : "";
  return [hundreds, rest].filter(Boolean).join(" ");
}

/**
 * Convert a plain integer to Urdu words using lakh/crore conventions.
 * Handles up to 9,99,99,999 (10 crore minus 1).
 */
export function toUrduWords(amount: number): string {
  if (amount === 0) return "صفر";
  const parts: string[] = [];

  const crore = Math.floor(amount / 10_000_000);
  amount -= crore * 10_000_000;
  if (crore > 0) parts.push(threeDigit(crore) + " کروڑ");

  const lakh = Math.floor(amount / 100_000);
  amount -= lakh * 100_000;
  if (lakh > 0) parts.push(threeDigit(lakh) + " لاکھ");

  const thousand = Math.floor(amount / 1_000);
  amount -= thousand * 1_000;
  if (thousand > 0) parts.push(twoDigit(thousand) + " ہزار");

  const hundred = Math.floor(amount / 100);
  amount -= hundred * 100;
  if (hundred > 0) parts.push(ONES[hundred] + " سو");

  if (amount > 0) parts.push(twoDigit(amount));

  return parts.join(" ");
}

// ── Currency detection and transformation ─────────────────────────────────────

/**
 * Pattern: RS. / Rs. / rs. / PKR optionally followed by space and a number
 * (with optional commas, e.g. 75,000 or 1,250 or 250,000).
 * Captures: marker and digits.
 *
 * Does NOT match:
 *   - plain numbers without a currency marker
 *   - percentages, dates, phone numbers, codes
 */
const PKR_RE =
  /\b(?:RS\.|Rs\.|rs\.|PKR)\s*([\d,]+(?:\.\d+)?)/g;

/**
 * Transforms explicit Pakistani rupee amounts in a string to Urdu prose.
 * All other content is unchanged.
 *
 * RS. 75,000   →  75,000 (پچھتر ہزار) روپے
 * PKR 250,000  →  250,000 (دو لاکھ پچاس ہزار) روپے
 */
export function transformPKRAmount(text: string): string {
  return text.replace(PKR_RE, (_match, numStr: string) => {
    // Strip commas to get integer value
    const intStr = numStr.replace(/,/g, "").split(".")[0];
    const value = parseInt(intStr, 10);
    if (isNaN(value)) return _match; // safety: leave unchanged

    const words = toUrduWords(value);
    // Preserve original digit formatting (with commas) from source
    const formatted = numStr.includes(".") ? numStr.split(".")[0].replace(/,/g, ",") : numStr;
    return `${formatted} (${words}) روپے`;
  });
}

// ── Bidi-safe patterns ────────────────────────────────────────────────────────

/**
 * Patterns that should be wrapped in <bdi dir="ltr"> when rendered in RTL.
 * These are DISPLAY-ONLY — exported text is never wrapped.
 *
 * Matches:
 *   2025-26     (year ranges)
 *   2025/26     (year ranges slash form)
 *   15%         (percentages)
 *   75,000      (numbers with commas)
 *   3.14        (decimals)
 *   1,250.00    (numbers with both)
 *   Standalone integer sequences that might flip
 *
 * Does NOT match:
 *   Urdu words (U+0600–U+06FF)
 *   URLs/emails (handled by protection layer)
 */
const LTR_ISLAND_RE =
  /(\d[\d,]*(?:\.\d+)?(?:[-/]\d+)*%?|\b\d+(?:[-/]\d+)+)/g;

export type BidiSegment =
  | { kind: "text"; text: string }
  | { kind: "ltr"; text: string };

/**
 * Split a string into alternating Urdu text and LTR-island segments.
 * The caller renders ltr segments as <bdi dir="ltr">.
 */
export function splitBidiSegments(text: string): BidiSegment[] {
  const segments: BidiSegment[] = [];
  let last = 0;

  for (const m of text.matchAll(LTR_ISLAND_RE)) {
    const start = m.index!;
    const end = start + m[0].length;
    if (start > last) segments.push({ kind: "text", text: text.slice(last, start) });
    segments.push({ kind: "ltr", text: m[0] });
    last = end;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

// ── Percentage presentation ───────────────────────────────────────────────────

/**
 * Converts percentage symbols to Urdu prose in output.
 * 15% → 15 فیصد, 3.5% → 3.5 فیصد
 *
 * POLICY:
 *   % symbol → فیصد (presentation normalization — NOT translation)
 *   English word "percent" → پرسنٹ (via EXTRA_LOANWORDS in engine)
 *   Roman Urdu "feesad/fisad" → فیصد (via lexicon/FORMAL_STEMS in engine)
 *
 * Only runs on already-converted Urdu output strings.
 * Protected tokens (URLs, code) do not contain bare `%` patterns so are safe.
 */
export function transformPercentage(text: string): string {
  // Match: digit(s) optionally with commas/decimal, optionally a space, then %
  // Replace: "15%" → "15 فیصد", "3.5 %" → "3.5 فیصد"
  return text.replace(/(\d[\d,]*(?:\.\d+)?)\s*%/g, "$1 فیصد");
}

// ── Acronym and brand presentation ──────────────────────────────────────────

/**
 * All-caps acronyms (HR, AI, PDF, etc.) and brand names (WhatsApp, Google, etc.)
 * are protected by the engine (protectedTokens.ts) and remain Latin in engine output.
 * The presentation layer converts them to Urdu-script transliteration.
 *
 * POLICY: Ordinary acronyms and brands in Urdu prose → Urdu-script transliteration.
 * NOT applied to machine-readable protected tokens (URLs, filenames, codes).
 *
 * Only uppercase acronyms and CamelCase brands — case-sensitive matches prevent
 * collisions with lowercase occurrences inside URLs (ai.google.com stays intact).
 */
const ACRONYM_TRANSLIT: Record<string, string> = {
  HR:  "ایچ آر",
  AI:  "اے آئی",
  API: "اے پی آئی",
  PDF: "پی ڈی ایف",
  SMS: "ایس ایم ایس",
  OTP: "او ٹی پی",
  ATM: "اے ٹی ایم",
  MRI: "ایم آر آئی",
  CNG: "سی این جی",
};

const BRAND_TRANSLIT: Record<string, string> = {
  WhatsApp:  "واٹس ایپ",
  whatsapp:  "واٹس ایپ",
  Google:    "گوگل",
  google:    "گوگل",
  YouTube:   "یوٹیوب",
  youtube:   "یوٹیوب",
  Zoom:      "زوم",
  zoom:      "زوم",
  Netflix:   "نیٹ فلکس",
  Facebook:  "فیس بک",
  Instagram: "انسٹاگرام",
  Twitter:   "ٹوئٹر",
  TikTok:    "ٹک ٹاک",
  Spotify:   "اسپوٹی فائی",
  Amazon:    "ایمیزون",
};

export function transformAcronymsAndBrands(text: string): string {
  let out = text;
  // Acronyms: case-sensitive uppercase — unlikely in domain names
  for (const [acr, urdu] of Object.entries(ACRONYM_TRANSLIT)) {
    out = out.replace(new RegExp(`\\b${acr}\\b`, "g"), urdu);
  }
  // Brands: exact key match, negative lookahead to avoid domain names (zoom.com etc.)
  for (const [brand, urdu] of Object.entries(BRAND_TRANSLIT)) {
    // Escape any regex special chars in brand name
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\b${escaped}\\b(?!\\.[a-z])`, "g"), urdu);
  }
  return out;
}

// ── Parenthetical cleanup ────────────────────────────────────────────────────

/**
 * Auto-gloss map — intentionally empty per Phase 19A.13+ policy.
 * The Writer is a script-conversion tool, not a translation tool.
 * Adding Urdu translations for English loanwords is NOT permitted.
 * "inflation" → "انفلیشن" (no مہنگائی gloss)
 */
const LOANWORD_GLOSS: Record<string, string> = {};

/**
 * English words that are a direct translation of a preceding Urdu word.
 * When found as parenthetical, they are redundant and should be removed.
 * Set is lower-cased for matching.
 */
const REDUNDANT_ENGLISH = new Set([
  "verification","postponed","postpone","delay","delayed",
  "approval","approved","rejected","cancelled","canceled",
  "confirmed","completed","pending","review","submitted",
  "department","official","formal","authority","committee",
  "meeting","session","hearing","trial","judgment",
  "increase","decrease","reduction","expansion","implementation",
  "update","record","account","statement","document",
  "salary","pension","payment","allowance","bonus",
  "policy","rule","law","regulation","order","notice",
  "inspection","audit","report","certificate","registration",
]);

/**
 * Post-process Urdu output to apply parenthetical cleanup rules:
 *
 * CASE 1: Urdu word followed by (English equivalent) → drop parenthetical
 *   "تصدیق (verification)" → "تصدیق"
 *   "ملتوی (postponed)"    → "ملتوی"
 *
 * CASE 2: Loanword in Urdu with known gloss → add Urdu gloss
 *   "انفلیشن"  → "انفلیشن (مہنگائی)"
 *   (only when not already glossed)
 *
 * CASE 3: Parentheses with real info → preserve
 *   "(HR)" "(v2.1)" "(12b)" → unchanged
 */
const URDU_PAREN_RE = /([\u0600-\u06FF\s]+?)\s*\(([^)]{1,40})\)/g;

export function cleanParentheticals(text: string): string {
  // CASE 1: strip redundant English equivalents after Urdu words
  // Also strip short Urdu-transliterated equivalents (engine may have transliterated "(postponed)" → "(پوستپوندڈ)")
  // We catch both English and Urdu-script only parentheticals that are <= 4 words (likely just a translation)
  const URDU_ONLY_PAREN_RE = /([؀-ۿ\s]+?)\s*\(([؀-ۿ\sء-ي]{2,30})\)/g;
  let out = text.replace(URDU_PAREN_RE, (match, urduPart, inner) => {
    const clean = inner.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (REDUNDANT_ENGLISH.has(clean)) return urduPart.trimEnd();
    return match; // preserve
  });
  // Also handle when the engine has already transliterated the parenthetical to Urdu script
  // But ONLY strip if it looks like a pure transliteration (no numbers, not an intentional gloss)
  const GLOSS_VALUES = new Set(Object.values(LOANWORD_GLOSS));
  // Currency word markers — never strip these
  const CURRENCY_WORDS = /ہزار|لاکھ|کروڑ|سو|روپے/;
  out = out.replace(URDU_ONLY_PAREN_RE, (match, urduPart, inner) => {
    const w = inner.trim();
    // Keep if this is a LOANWORD_GLOSS value (we added it intentionally)
    if (GLOSS_VALUES.has(w)) return match;
    // Keep if it contains currency word patterns (number words like پچھتر ہزار)
    if (CURRENCY_WORDS.test(w)) return match;
    // Short (1-3 Urdu word) transliterated equivalent — strip
    const wordCount = w.split(/\s+/).length;
    if (wordCount <= 3) return urduPart.trimEnd();
    return match;
  });

  // CASE 2: add Urdu gloss for loanwords not already glossed
  for (const [loanword, gloss] of Object.entries(LOANWORD_GLOSS)) {
    // Only add gloss if loanword appears WITHOUT an existing parenthetical
    const re = new RegExp(loanword + "(?!\\s*\\()", "g");
    out = out.replace(re, `${loanword} (${gloss})`);
  }

  // Fix stray Latin connector "e" between two Urdu words (izafat ِ )
  // "عدالت e عالیہ" → "عدالتِ عالیہ"
  out = out.replace(/([؀-ۿ]+)\s+e\s+([؀-ۿ]+)/g, "$1ِ $2");

  return out;
}

// ── Formal output post-corrections ──────────────────────────────────────────

/**
 * Token-level substitutions applied to V2's raw output string.
 * Each entry is [wrongForm, correctForm] — wrongForm is a regex string
 * that matches the bad phonetic output exactly as a word boundary.
 *
 * This is the narrowest possible fix: only tokens V2 consistently mis-ranks
 * get a deterministic override here. All other output is V2 verbatim.
 *
 * These substitutions run BEFORE cleanParentheticals and normalizeUrduProsePunctuation.
 */
const OUTPUT_CORRECTIONS: [RegExp, string][] = [
  // film → فالم (phonetic noise)
  [/(^|[\s،؛۔])فالم($|[\s،؛۔])/g, "$1فلم$2"],
  // industry → ندوستری (phonetic noise)
  [/(^|[\s،؛۔])ندوستری($|[\s،؛۔])/g, "$1انڈسٹری$2"],
  // behtar → بیہتر (phonetic noise — بہتر is correct)
  [/بیہتر|بے\s*ہتر/g, "بہتر"],
  // performance → پارفورمنس/پارفورمن/پیرفورمینس (V2 phonetic variants) → correct: پرفارمنس
  // Also fix merged form: پرفارمنسکے → پرفارمنس کے
  [/پا(?:ر|رر)فورمن(?:س|ز)?|پیرفورمینس?|پرفورمنس/g, "پرفارمنس"],
  [/پرفارمنسکے\b/g, "پرفارمنس کے"],
  // better → بے تتار / بیہتر (V2 phonetic garbage) → correct: بیٹر
  // Note: Roman Urdu "behtar" → بہتر via lexicon (not affected by this rule)
  [/بے\s*تتار|بی\s*ٹار|بیترر/g, "بیٹر"],
  // خد (truncated khuda) → خدا — only when not already followed by ا or حافظ
  [/خد(?!ا|\s*حافظ)/g, "خدا"],
  // Grammar guard: active/passive conflict.
  // Urdu: نے marks active ergative agent; گیا/گئی are passive auxiliaries.
  // They cannot coexist for the same verb. When نے is present, drop the passive گیا/گئی.
  // Pattern: [Urdu agent] نے [verb chain ≤60 chars] گیا/گئی
  [/([\u0600-\u06FF]+) نے ([\u0600-\u06FF ]{2,60}?) گیا(\s|$)/g, "$1 نے $2$3"],
  [/([\u0600-\u06FF]+) نے ([\u0600-\u06FF ]{2,60}?) گئی(\s|$)/g, "$1 نے $2$3"],
  // Formal discourse: "اور تو" → "اور"
  // "تو" after "اور" is a hedge particle. In published formal Urdu it is dropped.
  // "تو" elsewhere (agar X تو Y conditional) is preserved.
  [/اور تو(?=[\s،؛۔])/g, "اور"],
  // ── English loanword garble corrections ─────────────────────────────────
  // Fix V2 phonetic garbage AND residual Latin for words that fail in the engine
  // safety pass due to token-count mismatch. Each entry handles BOTH the Latin
  // form AND all known V2 garble variants for that word.
  [/\b(?:نتاورست|نتارست|نتیرسٹ|نتارسٹ|نتیرست|interest)\b/g, "انٹرسٹ"],
  [/\brate\b/g, "ریٹ"],
  [/\bmobile\b/g, "موبائل"],
  [/سوفتوار(?:ے|ی)|(?<!\w)سافٹوئیر/g, "سافٹ ویئر"],
  [/ناتوؤرک|ناتوارک|نیٹورک/g, "نیٹ ورک"],
  [/(^|[\s،؛۔])سلوو([\s،؛۔]|$)/g, "$1سلو$2"],
  [/\bsubmit\b/g, "سبمٹ"],
  [/اندپوئینت|اینڈپوئنٹ|اینڈپوائنٹ/g, "اینڈ پوائنٹ"],
  [/کوءنفیگر(?:ے|ی)?|کنفیگر(?:ے|ی)\b|کوفیگر\b/g, "کنفگر"],
  [/\b(?:دوانکد|ایدوانکد|دواینکد|ایدوانسڈ)\b/g, "ایڈوانسڈ"],
  [/\bقنتم\b/g, "کوانٹم"],
  [/فراماوورک|فریماورک|فریموورک/g, "فریم ورک"],
  [/\bzoom\b/g, "زوم"],
];

/**
 * Apply deterministic output corrections for known V2 phonetic mis-rankings.
 * Called inside the display pipeline BEFORE cleanParentheticals.
 */
export function fixFormalOutput(text: string): string {
  let out = text;
  for (const [pattern, replacement] of OUTPUT_CORRECTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
