/**
 * Urdu Script → Roman Urdu Converter
 * Phase 19A.23 — Deterministic transliteration engine.
 *
 * Architecture:
 *   1. Identify and protect non-Urdu tokens (English, numbers, URLs, files)
 *   2. Multi-word phrase lookup (longest match)
 *   3. Single-word dictionary lookup
 *   4. Character-level transliteration for unknown words
 *
 * Policy: TRANSLITERATION ONLY. No semantic translation.
 */

import { PHRASE_LEXICON, WORD_LEXICON, NAME_LEXICON } from "./urduRomanLexicon";
export { applyStyle, STYLE_OPTIONS } from "./urduRomanStyles";
export type { UrduRomanStyle } from "./urduRomanStyles";

// ── Urdu character map ────────────────────────────────────────────────────────

// Aspirate consonant pairs: consonant + ھ (do chashmi he, U+06BE)
const ASPIRATE_MAP: Record<string, string> = {
  "ب": "bh",  "پ": "ph",  "ت": "th",  "ٹ": "th",
  "ج": "jh",  "چ": "chh", "د": "dh",  "ڈ": "dh",
  "ر": "rh",  "ک": "kh",  "گ": "gh",  "ل": "lh",
  "م": "mh",  "ن": "nh",
};

// Base character → Roman (consonants)
const CHAR_MAP: Record<string, string> = {
  // Alif family
  "ا": "a",   "آ": "aa",  "أ": "a",   "إ": "i",   "ٱ": "a",
  // Ba / Pa family
  "ب": "b",   "پ": "p",
  // Ta family
  "ت": "t",   "ٹ": "t",   "ث": "s",
  // Jeem / Che / He
  "ج": "j",   "چ": "ch",  "ح": "h",   "خ": "kh",
  // Dal / Zal
  "د": "d",   "ڈ": "d",   "ذ": "z",
  // Re / Zain
  "ر": "r",   "ڑ": "r",   "ز": "z",   "ژ": "zh",
  // Seen / Sheen / Sad / Dhad
  "س": "s",   "ش": "sh",  "ص": "s",   "ض": "z",
  // Toa / Zoa
  "ط": "t",   "ظ": "z",
  // Ain / Ghain
  "ع": "",    "غ": "gh",
  // Fa / Qaf / Kaf / Gaf
  "ف": "f",   "ق": "q",   "ک": "k",   "گ": "g",
  // Lam / Meem / Noon
  "ل": "l",   "م": "m",   "ن": "n",   "ں": "n",
  // Waw
  "و": "o",
  // He family
  "ہ": "h",   "ھ": "h",   "ة": "h",   "ۃ": "h",   "ۂ": "h",
  // Hamza / Ya
  "ء": "",    "ئ": "y",   "ؤ": "w",
  "ی": "i",   "ے": "e",   "ۓ": "e",
  // Special characters — ﷲ U+FDF2 is the Allah ligature
  "\uFDF2": "Allah",
  // Diacritics
  "\u064E": "a",   // zabar
  "\u0650": "i",   // zer/kasra — primary entry
  "\u064F": "u",   // pesh / damma
  "\u0651": "",    // shadda
  "\u0652": "",    // sukun
  "\u0653": "aa",  // madda
  "\u064B": "an",  // tanwin nasal
  "\u064D": "in",  // tanwin kasra
  "\u064C": "un",  // tanwin damma
  "\u0670": "aa",  // superscript alif
  "\u0640": "",    // tatweel (kashida — stretch)
  // Izafat
};

// ── Protected token detection ─────────────────────────────────────────────────

const PROTECTED_RE =
  /https?:\/\/\S+|www\.\S+|[\w._%+-]+@[\w.-]+\.[a-z]{2,}|[a-zA-Z0-9][a-zA-Z0-9._\-]*\.[a-zA-Z]{2,4}(?:\/\S*)?|v\d+(?:\.\d+)*(?:-[a-z0-9]+)?|[A-Z]{2,}|[a-zA-Z][a-zA-Z0-9_\-]*|[\d,]+(?:\.\d+)?%?|\d+(?:[-\/]\d+)+|\d+/gu;

/** Returns true if a character is Urdu/Arabic script */
function isUrduChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x0600 && cp <= 0x06FF) ||   // Arabic/Urdu block
         (cp >= 0xFB50 && cp <= 0xFDFF) ||   // Arabic Presentation Forms A
         (cp >= 0xFE70 && cp <= 0xFEFF);      // Arabic Presentation Forms B
}

// ── Word-level character transliteration ─────────────────────────────────────

/**
 * Convert a single Urdu word to Roman using character-level mapping.
 * Handles: aspirate consonants, alif (vowel vs consonant), ya/waw in context.
 */
export function transliterateWord(word: string): string {
  const chars = [...word];
  const result: string[] = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];
    const next = chars[i + 1] ?? "";

    // Aspirate pair: consonant + ھ (U+06BE)
    if (next === "ھ" && ASPIRATE_MAP[ch]) {
      result.push(ASPIRATE_MAP[ch]);
      i += 2;
      continue;
    }

    // Shadda (tashdid): double the previous consonant
    if (ch === "\u0651") {
      const prev = result[result.length - 1] ?? "";
      // Only double single-char consonant (not digraphs like kh, sh)
      if (prev.length === 1) result.push(prev);
      i++;
      continue;
    }

    // ا (alif) handling
    if (ch === "ا") {
      if (i === 0) {
        // Word-initial alif: vowel carrier — check for madda
        if (next === "ٰ" || next === "\u0670") { result.push("aa"); i += 2; continue; }
        result.push("a");
      } else {
        // Mid/end alif: long vowel 'aa' after consonant
        result.push("aa");
      }
      i++;
      continue;
    }

    // آ (alif with madda) — always long aa
    if (ch === "آ") { result.push("aa"); i++; continue; }

    // و (waw) context handling
    if (ch === "و") {
      if (i === 0 || result.length === 0) {
        result.push("w");          // word-initial: consonant
      } else {
        const prevRaw = chars[i - 1] ?? "";
        if (isUrduChar(prevRaw) && CHAR_MAP[prevRaw] && prevRaw !== "ا") {
          // After consonant: long vowel 'oo'
          result.push("oo");
        } else {
          result.push("w");
        }
      }
      i++;
      continue;
    }

    // ی (ya) context handling
    if (ch === "ی") {
      if (i === 0) {
        result.push("y");          // word-initial: consonant
      } else if (i === chars.length - 1) {
        // Word-final ya: long vowel 'ee' / 'i'
        result.push("i");
      } else {
        result.push("i");
      }
      i++;
      continue;
    }

    // ے (ye) — always word-final 'ay'
    if (ch === "ے" || ch === "ۓ") {
      result.push("ay");
      i++;
      continue;
    }

    // Lam-alif ligatures
    if (ch === "ل" && next === "ا") {
      result.push("la");
      i += 2;
      continue;
    }
    if (ch === "ل" && next === "آ") {
      result.push("laa");
      i += 2;
      continue;
    }

    // ع (ain) — silent in Pakistani Urdu: skip or approximate as vowel
    if (ch === "ع") {
      const diacritic = chars[i + 1] ?? "";
      if (diacritic === "\u064E") { result.push("a"); i += 2; continue; }
      if (diacritic === "\u0650") { result.push("i"); i += 2; continue; }
      if (diacritic === "\u064F") { result.push("u"); i += 2; continue; }
      // No diacritic — insert nothing (ain is silent in Urdu)
      i++;
      continue;
    }

    // Diacritics
    if (ch === "\u064E") { result.push("a"); i++; continue; }  // zabar
    if (ch === "\u0650") { result.push("i"); i++; continue; }  // zer
    if (ch === "\u064F") { result.push("u"); i++; continue; }  // pesh
    if (ch === "\u0652") { i++; continue; }                    // sukun — no vowel

    // Generic map lookup
    const mapped = CHAR_MAP[ch];
    if (mapped !== undefined) {
      result.push(mapped);
    } else if (!isUrduChar(ch)) {
      // Non-Urdu char: pass through (punctuation, space)
      result.push(ch);
    }
    // Unknown Urdu chars: skip silently

    i++;
  }

  return result.join("");
}

// ── Main converter ────────────────────────────────────────────────────────────

/**
 * Normalizes Roman output:
 * - Capitalize first letter of sentence
 * - Convert Urdu punctuation to Latin: ۔→. ،→, ؟→?
 * - Clean up multiple spaces
 */
function normalizeOutput(text: string): string {
  return text
    .replace(/۔/g, ".")
    .replace(/،/g, ",")
    .replace(/؟/g, "?")
    .replace(/؛/g, ";")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert Urdu script text to Roman Urdu.
 *
 * Steps:
 *   1. Split on whitespace + punctuation, preserving non-Urdu tokens
 *   2. For Urdu segments: try phrase → word dict → char-level
 *   3. Rejoin and normalize
 */
export function convertUrduToRoman(input: string): string {
  if (!input.trim()) return "";

  // Step 1: tokenize preserving non-Urdu tokens
  // Split on whitespace, then process each chunk
  const tokens = input.split(/(\s+)/);
  const parts: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];

    // Whitespace: preserve
    if (/^\s+$/.test(tok)) {
      parts.push(" ");
      i++;
      continue;
    }

    // Non-Urdu (English, numbers, URLs, etc.): pass through
    if (!tok.split("").some(isUrduChar)) {
      parts.push(tok);
      i++;
      continue;
    }

    // Urdu chunk: try phrase lookup across multiple tokens
    // Build a window of Urdu tokens for phrase matching
    let matched = false;

    // Collect consecutive Urdu-containing tokens for phrase lookup
    // Strip trailing Latin punctuation from each token for matching
    const urduWindow: string[] = [];
    const urduWindowRaw: string[] = [];  // preserve original for skipping
    let j = i;
    while (j < tokens.length && j < i + 20) {
      if (/^\s+$/.test(tokens[j])) { j++; continue; }
      if (!tokens[j].split("").some(isUrduChar)) break;
      const norm = tokens[j].replace(/[.,!?;:()\[\]'"]+$/, "").replace(/^[.,!?;:()\[\]'"]+/, "");
      urduWindow.push(norm);
      urduWindowRaw.push(tokens[j]);
      j++;
    }

    // Try phrase matches (longest first)
    for (const [phrase, roman] of PHRASE_LEXICON) {
      const phraseWords = phrase.split(/\s+/);
      if (phraseWords.length > urduWindow.length) continue;
      const candidate = urduWindow.slice(0, phraseWords.length).join(" ");
      if (candidate === phrase) {
        parts.push(roman);
        // Skip the tokens we consumed (including spaces between them)
        let consumed = 0;
        let k = i;
        while (consumed < phraseWords.length && k < tokens.length) {
          if (/^\s+$/.test(tokens[k])) { k++; continue; }
          consumed++;
          k++;
        }
        i = k;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Single token: word dict → char-level
    // Strip both Urdu and Latin punctuation from token edges for lookup
    const stripped = tok
      .replace(/^[۔،؟؛.,!?;:()\[\]'"]+/g, "")
      .replace(/[۔،؟؛.,!?;:()\[\]'"]+$/g, "");
    const trailingPunct = tok.slice(stripped.length + (tok.length - stripped.length - tok.replace(/^[۔،؟؛.,!?;:()\[\]'"]+/, "").length));
    const leadingStrip = tok.length - tok.replace(/^[۔،؟؛.,!?;:()\[\]'"]+/, "").length;
    const trailingStrip = tok.length - tok.replace(/[۔،؟؛.,!?;:()\[\]'"]+$/, "").length;
    const trailing = trailingStrip > 0 ? tok.slice(-trailingStrip) : "";

    if (WORD_LEXICON[stripped]) {
      parts.push(WORD_LEXICON[stripped]);
      if (trailing) parts.push(normalizeOutput(trailing));
    } else if (NAME_LEXICON[stripped]) {
      // Priority name dictionary — proper nouns with conventional spellings
      parts.push(NAME_LEXICON[stripped]);
      if (trailing) parts.push(normalizeOutput(trailing));
    } else if (stripped) {
      parts.push(transliterateWord(stripped));
      if (trailing) parts.push(normalizeOutput(trailing));
    } else {
      parts.push(normalizeOutput(tok));
    }
    i++;
  }

  // Preserve URLs exactly (don't capitalize)
  const urlTokenRe = /^https?:\/\/\S+|^www\.\S+/i;

  const raw = parts.join("").replace(/\s+/g, " ").trim();
  // Capitalize only the very first letter — but NOT if first token is URL/number
  const firstNonSpace = raw.trimStart();
  if (!firstNonSpace || /^https?:\/\//i.test(firstNonSpace) || /^\d/.test(firstNonSpace)) {
    return normalizeOutput(raw);
  }
  return normalizeOutput(capitalizeFirst(raw));
}
