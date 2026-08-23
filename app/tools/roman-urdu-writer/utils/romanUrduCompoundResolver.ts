/**
 * Roman Urdu Structural Compound Resolver — Phase 19A.18
 *
 * Resolves structural Roman Urdu hyphen patterns BEFORE the tokenizer sees them,
 * so the existing engine processes well-formed input instead of broken sub-tokens.
 *
 * Patterns handled:
 *   X-e-Y  →  X یِ Y   (izafat genitive chain)    e.g. haq-e-tanqeed → حقِ تنقید
 *   X-o-Y  →  X و Y    (Urdu/Persian conjunction)  e.g. amn-o-amaan   → امن و امان
 *   known lexical hyphen compounds                  e.g. na-mumkin     → ناممکن
 *
 * Architecture:
 *   resolveCompounds(rawInput: string) → pre-processed string
 *   The output uses spaces so the existing tokenizer and engine work unchanged.
 *   Each resolved component becomes a normal space-separated token.
 *
 * Safety constraints:
 *   - Never touches protected tokens (URLs, emails, filenames, version strings)
 *   - Never rewrites English-only hyphenated terms
 *   - Never fires on single-letter sub-tokens (e.g. x-axis, e-mail as Latin)
 *   - Compound components must both look like Roman Urdu (not pure digits/code)
 */

// ── Protected-token guard ─────────────────────────────────────────────────────

/** Returns true if the token should not be touched by the resolver. */
function isProtectedFromResolver(token: string): boolean {
  if (/^https?:\/\//i.test(token)) return true;      // URLs
  if (/^www\./i.test(token)) return true;
  if (/^[\w._%+-]+@[\w.-]+\.[a-z]{2,}$/i.test(token)) return true;  // email
  if (/\.[a-z]{2,4}$/i.test(token) && !/\s/.test(token) && token.includes(".")) return true; // filenames/domains
  if (/^v\d+(\.\d+)*(-[a-z0-9]+)?$/i.test(token)) return true;       // version strings
  if (/^\d/.test(token)) return true;                                   // starts with digit
  if (/^[A-Z]{2,}$/.test(token)) return true;                          // all-caps acronyms
  return false;
}

/** True if a sub-segment looks like a Roman Urdu word (not a digit, not pure Latin article). */
function looksLikeRomanUrdu(seg: string): boolean {
  if (!seg || seg.length < 2) return false;
  if (/^\d+$/.test(seg)) return false;       // pure number
  if (/^[A-Z]{2,}$/.test(seg)) return false; // all-caps acronym (AI, HR, etc.)
  if (/\.\w{2,4}$/.test(seg)) return false;  // has file extension
  // Allow apostrophe-marked segments (ijtima'ai, baa'is) — they're Roman Urdu
  return /[a-zA-Z'3]/.test(seg);
}

// ── Izafat resolver ───────────────────────────────────────────────────────────

/**
 * Resolves X-e-Y[-e-Z...] chains by inserting izafat zer (ِ) marker text.
 *
 * Strategy: convert to "X IZAFAT_E Y" in the pre-processed string.
 * The engine then processes X and Y as separate tokens and izafat is
 * inserted between them in the output.
 *
 * We use the placeholder " _IZAFAT_ " which resolveIzafatPlaceholder()
 * converts to the ِ diacritic after the engine produces Urdu output.
 *
 * Multi-link chains: haq-e-azaadi-e-raaye → haq IZAFAT azaadi IZAFAT raaye
 */
const IZAFAT_PLACEHOLDER = " _IZ_ ";

function resolveIzafatChain(raw: string): string {
  // Match: word -e- word [-e- word]* where each word is ≥2 chars
  // Require at least one non-ASCII-art component (real Urdu word)
  // Case-insensitive for Aazaadi-e-..., haq-e-...
  return raw.replace(
    /\b([A-Za-z'][A-Za-z3']{1,}(?:'[a-z]+)?)-e-([A-Za-z'][A-Za-z3']{1,}(?:-e-[A-Za-z'][A-Za-z3']{1,})*)\b/gi,
    (match, first, rest) => {
      if (isProtectedFromResolver(match)) return match;
      if (!looksLikeRomanUrdu(first)) return match;
      // Split remaining links on -e-
      const parts = [first, ...rest.split(/-e-/i)];
      if (parts.some(p => !looksLikeRomanUrdu(p))) return match;
      return parts.join(IZAFAT_PLACEHOLDER);
    }
  );
}

// ── Coordination resolver ─────────────────────────────────────────────────────

function resolveCoordination(raw: string): string {
  // Match: word -o- word — treat -o- as Urdu وَ / و
  // Guard: don't fire on English words with 'o' (color, motor, etc.)
  // Both sides must be ≥3 chars and look like Roman Urdu
  return raw.replace(
    /\b([A-Za-z'][A-Za-z3']{2,}(?:'[a-z]+)?)-o-([A-Za-z'][A-Za-z3']{2,}(?:'[a-z]+)?)\b/gi,
    (match, left, right) => {
      if (isProtectedFromResolver(match)) return match;
      if (!looksLikeRomanUrdu(left) || !looksLikeRomanUrdu(right)) return match;
      // Avoid English compound words where -o- is not Urdu (e.g. "go-over")
      // Heuristic: if both halves are short English words, skip
      const commonEnglish = new Set(["go","no","so","to","do","co","pro","eco","bio","auto","audio","micro","macro","photo"]);
      if (commonEnglish.has(left.toLowerCase()) || commonEnglish.has(right.toLowerCase())) return match;
      return `${left} و ${right}`;
    }
  );
}

// ── Lexical compound map ──────────────────────────────────────────────────────

/**
 * Known reusable Roman Urdu hyphenated compounds that should be resolved
 * into their canonical Urdu form before tokenization.
 *
 * Keys are lowercased. The resolver does case-insensitive matching.
 * Values are space-separated Roman Urdu that the engine handles well,
 * or direct Urdu where the form is fully deterministic.
 *
 * DO NOT add sentence-specific one-offs here — only productive patterns.
 */
const LEXICAL_COMPOUNDS: Record<string, string> = {
  // Negation prefix
  "na-mumkin":     "ناممکن",
  "na-insafi":     "ناانصافی",
  "na-aahli":      "نااہلی",
  "na-qabil":      "ناقابل",
  // Ham- (together/co-)
  "ham-aahanggi":  "ہم آہنگی",
  "ham-ahangi":    "ہم آہنگی",
  "ham-qadm":      "ہم قدم",
  "ham-safar":     "ہم سفر",
  // Darham / Barham
  "darham-barham": "درہم برہم",
  // Ghair- (non/un-)
  "ghair-qanooni":    "غیر قانونی",
  "ghair-mulki":      "غیر ملکی",
  "ghair-zaroori":    "غیر ضروری",
  "ghair-mamool":     "غیر معمول",
  "ghair-sanjida":    "غیر سنجیدہ",
  "ghair-tadeeq-shuda": "غیر تصدیق شدہ",
  "ghair-yaqeeni":    "غیر یقینی",
  // Bila- (without)
  "bila-tahqeeq":  "بلا تحقیق",
  "bila-taassub":  "بلا تعصب",
  "bila-ta'assub": "بلا تعصب",
  "bila-wajah":    "بلا وجہ",
  "bila-shuba":    "بلا شبہ",
  // Ba- (with)
  "ba-waqt":       "بہ وقت",
  // Known formal compounds
  "naqd-o-nazar":  "نقد و نظر",
  "falah-o-behbood": "فلاح و بہبود",
  "amn-o-amaan":   "امن و امان",
  "ilm-o-hikmat":  "علم و حکمت",
  "ilm-o-amal":    "علم و عمل",
  "khoon-o-aansoo": "خون و آنسو",
  // Phase 19A.20 — compound with non-e/o hyphen
  "wujoodiyat-pasandana": "وجودیت پسندانہ",
};

function resolveLexicalCompounds(raw: string): string {
  // Sort by length descending so longer compounds match before sub-compounds
  const sortedKeys = Object.keys(LEXICAL_COMPOUNDS).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const urdu = LEXICAL_COMPOUNDS[key];
    // Word-boundary case-insensitive match
    const re = new RegExp(`\\b${escapeRegex(key)}\\b`, "gi");
    raw = raw.replace(re, (match) => {
      // Never touch protected tokens
      if (isProtectedFromResolver(match)) return match;
      return urdu;
    });
  }
  return raw;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Izafat placeholder resolution ─────────────────────────────────────────────

/**
 * After the engine produces Urdu output, replace "_IZ_" with izafat (ِ).
 * "حق _IZ_ تنقید" → "حقِ تنقید"
 * The placeholder is stripped of surrounding spaces and the izafat kasra is
 * appended directly to the preceding Urdu word.
 */
export function resolveIzafatInOutput(urduOutput: string): string {
  // " _IZ_ " between two Urdu words → attach ِ to left word
  return urduOutput.replace(/\s*_IZ_\s*/g, "ِ ");
}

// ── Post-coordination apostrophe cluster resolution ──────────────────────────

/**
 * Resolves known apostrophe-cluster Roman forms to their Urdu equivalents
 * in the pre-tokenized string. This runs AFTER coordination/izafat resolution
 * so that forms like `ma'ani` that appear after coordination `و` are still
 * correctly converted even when the per-token safety pass is skipped due to
 * token-count mismatches in long paragraphs.
 *
 * Safe to run on any Roman Urdu input — these are unambiguous deterministic
 * mappings (no Roman Urdu form other than the listed keys should produce
 * these outputs).
 *
 * Injected Urdu text is treated as protected passthrough by V2 (Urdu-script
 * input is kept as-is by the engine, same as LEXICAL_COMPOUNDS output).
 */
const APOSTROPHE_CLUSTER_DIRECT: Record<string, string> = {
  "ma'ani":      "معانی",
  "ma'aanee":    "معانی",
  "sho'oor":     "شعور",
  "shu'oor":     "شعور",
  "mu'aashra":   "معاشرہ",
  "mu'aashray":  "معاشرے",
  "mu'aashre":   "معاشرے",
  "mu'aashrati": "معاشرتی",
  "mu'aashi":    "معاشی",
  "baa'is":      "باعث",
  "ba'is":       "باعث",
  "ijtima'ai":   "اجتماعی",
  "ijtima'ee":   "اجتماعی",
  "ta'assub":    "تعصب",
  "in'aam":      "انعام",
  "jaa'iz":      "جائز",
  "ja'iz":       "جائز",
};

function resolveApostropheClusters(s: string): string {
  // Sort by length descending so longer forms match before sub-forms
  const keys = Object.keys(APOSTROPHE_CLUSTER_DIRECT).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const urdu = APOSTROPHE_CLUSTER_DIRECT[key];
    // Escape apostrophe and match word boundaries
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Use lookahead/lookbehind for word boundaries that work with apostrophes
    const re = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, "gi");
    s = s.replace(re, (match) => {
      if (isProtectedFromResolver(match)) return match;
      return urdu;
    });
  }
  return s;
}

// ── High-confidence noisy Roman recovery (Phase 19A.20) ──────────────────────

/**
 * Deterministic mappings for high-confidence noisy Roman Urdu forms that V2
 * cannot recover phonetically. Applied BEFORE the engine sees the input,
 * same mechanism as resolveApostropheClusters.
 *
 * These are human-reviewed and locked. Every entry must be:
 *   - unambiguous (this Roman form has exactly one intended Urdu)
 *   - attested in real production paragraphs
 *   - NOT a semantic rewrite (script recovery only)
 *
 * EXCLUDED intentionally (see phase spec):
 *   roaydaadein, tanweeq, tarseei — too ambiguous or context-dependent
 */
const NOISY_ROMAN_DIRECT: Record<string, string> = {
  // Exact target → must not change
  "samajik":        "سماجی",
  "hayajaan":       "ہیجان",
  "hayajan":        "ہیجان",
  "majrooh":        "مجروح",
  "majruh":         "مجروح",
  "mubham":         "مبہم",
  "tawaazun":       "توازن",
  "tawazun":        "توازن",
  "soorathaal":     "صورتِ حال",
  "soot-e-haal":    "صورتِ حال",
  "inhinraf":       "انحراف",
  "inhiraaf":       "انحراف",
  "pukhtagii":      "پختگی",  // also in FORMAL_STEMS; belt-and-suspenders
  "wujoodiyat":     "وجودیت",  // also in FORMAL_STEMS; belt-and-suspenders
  // ── Priority 1: Critical semantic errors ─────────────────────────────────
  // V2 maps these to wrong words with incompatible meaning
  "cancel":         "کینسل",   // V2: کنکال (skeleton!) → کینسل
  "cancelled":      "کینسل",
  "order":          "آرڈر",    // V2: وردار (garble) → آرڈر
  "orders":         "آرڈرز",
  "ordered":        "آرڈر",
  "karni":          "کرنی",    // V2: قرآن (Quran!) → کرنی
  "karna":          "کرنا",    // same family — V2 may garble
  "sasta":          "سستا",    // V2: سست (lazy) → سستا (cheap)
  "raste":          "راستے",   // V2: ریاست (state) → راستے (paths)
  "raaste":         "راستے",
  "rasta":          "راستہ",
  "raasta":         "راستہ",
  // ── Priority 2: Common verb forms ────────────────────────────────────────
  "hun":            "ہوں",     // V2: حان → ہوں
  "hoon":           "ہوں",
  "aayega":         "آئے گا",  // V2: آیاگا → آئے گا
  "aayegi":         "آئے گی",
  "aayenge":        "آئیں گے", // V2: آیانگے → آئیں گے
  "aayengay":       "آئیں گے",
  "aaungi":         "آؤں گی",
  "aaonga":         "آؤں گا",
  // ── Priority 3: Islamic expressions ──────────────────────────────────────
  // Fixed phrases: always the same in Pakistani Urdu usage
  "mashallah":      "ماشاء اللہ",
  "mashaallah":     "ماشاء اللہ",
  "masha'allah":    "ماشاء اللہ",
  "subhanallah":    "سبحان اللہ",
  "subhanaallah":   "سبحان اللہ",
  "jazakallah":     "جزاک اللہ",
  "jazakallahkhair":"جزاک اللہ خیر",
  "inshallah":      "انشاء اللہ",
  "inshaallah":     "انشاء اللہ",
  "alhumdullilah":  "الحمدللہ",
  "alhumdulillah":  "الحمدللہ",
  // ── Priority 4 + bonus: common loanwords V2 garbles ─────────────────────
  "call":           "کال",
  "calls":          "کالز",
  "phone":          "فون",
  "phones":         "فونز",
  "school":         "اسکول",
  "schools":        "اسکول",
  "result":         "رزلٹ",
  "results":        "رزلٹ",
  "idea":           "آئیڈیا",
  "ideas":          "آئیڈیاز",
  "game":           "گیم",
  "games":          "گیمز",
  "battery":        "بیٹری",
  "charger":        "چارجر",
  "wifi":           "وائی فائی",
  "uber":           "اوبر",
  "ready":          "ریڈی",
  "minute":         "منٹ",
  "minutes":        "منٹ",
  "presentation":   "پریزینٹیشن",
  // Common Urdu words V2 garbles in isolation
  "kaun":           "کون",    // V2: قاوں → کون
  "biryani":        "بریانی", // V2: برینی → بریانی
  "salam":          "سلام",   // V2: سالم → سلام
  "restaurant":     "ریسٹورنٹ",
  "email":          "ای میل",    // in EXTRA_LOANWORDS but hasCue fails for 2-word sentences
  // ── High-frequency morphology (missed without hasCue) ─────────────────────
  "zaroor":         "ضرور",      // V2: ضروری (wrong adjectival suffix)
  "zarur":          "ضرور",
  "late":           "لیٹ",       // V2: لاتے (present tense confusion)
  "change":         "چینج",      // V2: چنگا (WRONG meaning: 'good'!)
  "wapis":          "واپس",      // V2: واپیس (extra vowel)
  "waapis":         "واپس",
  "mahine":         "مہینے",     // V2: ماہانہ (translation: monthly)
  "mahinay":        "مہینے",
  "mahina":         "مہینہ",
  "bachay":         "بچے",       // V2: بچاؤ (imperative confusion)
  "bacha":          "بچہ",
  "achhi":          "اچھی",      // V2: چہی (drops first syllable)
  "achha":          "اچھا",
  "achhe":          "اچھے",
  "bhej":           "بھیج",      // stays Latin without cue
  "bhejna":         "بھیجنا",
  "bhejdo":         "بھیج دو",
  "nikal":          "نکل",       // V2: نکال (long vowel insertion)
  "nikla":          "نکلا",
  "nikli":          "نکلی",
  "nikle":          "نکلے",
  "milte":          "ملتے",      // V2: معاملات (CRITICAL: completely wrong word!)
  "milta":          "ملتا",
  "milti":          "ملتی",
  "milein":         "ملیں",
  "khelna":         "کھیلنا",    // V2: خالنا (kh→خ not کھ)
  "khelne":         "کھیلنے",
  "khelo":          "کھیلو",
  "khela":          "کھیلا",
  "khayenge":       "کھائیں گے",
  "khayen":         "کھائیں",
  "problem":        "پرابلم",    // stays Latin (not in EXTRA_LOANWORDS or hasCue fails)
  "plan":           "پلان",      // stays Latin in short sentences
  "plans":          "پلانز",
  "file":           "فائل",      // V2: فیلے (phonetic garble)
  "bas":            "بس",        // V2: باس (boss confusion)
  "password":       "پاسورڈ",   // V2: پاسسوورد (doubled consonants)
  "rickshaw":       "رکشہ",      // V2: رک کشاو (splits incorrectly)
  "warna":          "ورنہ",      // V2: ورنا (ہ vs ا)
  "jayegi":         "جائے گی",   // V2: جے اگی (splits future tense)
  "jayenge":        "جائیں گے",
  "jayega":         "جائے گا",
  "aao":            "آؤ",        // V2: آوو or keeps Latin
  "aaoo":           "آؤ",
  "manzar":         "منظر",      // V2: منزار (ظ/ز confusion)
  "khair":          "خیر",       // V2: خائیر
  "doston":         "دوستوں",    // V2: دوسٹوں
  "dosto":          "دوستوں",
  "zaroorat":       "ضرورت",     // V2 sometimes garbles
  // ── Phase 19A.21a — Loanword hotfix ──────────────────────────────────────
  "endless":        "اینڈلیس",   // V2: اندلیسس (phonetic garble)
  "endles":         "اینڈلیس",   // alternate spelling
  // ── Phase 19A.22 — kh cluster morphology ─────────────────────────────────
  // کھڑا/کھڑی/کھڑے — "standing" — V2 garbles all variants
  "kharhi":         "کھڑی",
  "kharhay":        "کھڑے",
  "kharhe":         "کھڑے",
  "khara":          "کھڑا",     // V2: خار (thorn!) — CRITICAL
  "khare":          "کھڑے",     // V2: کرے (do it!) — CRITICAL
  // کھلا/کھلی/کھلے — "open" — V2 produces خدا (God!) — CRITICAL
  "khula":          "کھلا",
  "khuli":          "کھلی",
  "khule":          "کھلے",
  // خود — "self" — V2+OUTPUT_CORRECTIONS produces خدا (God!) — CRITICAL
  "khud":           "خود",
  // کھا لو — "eat (it)" split form
  "khalo":          "کھا لو",
  "khalen":         "کھائیں",
  // ── Bonus fix from collision audit ───────────────────────────────────────
  "sust":           "سست",   // V2: سوست (extra و) — unambiguous: always سست (lazy/slow)
};

function resolveNoisyRoman(s: string): string {
  const keys = Object.keys(NOISY_ROMAN_DIRECT).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const urdu = NOISY_ROMAN_DIRECT[key];
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, "gi");
    s = s.replace(re, (match) => {
      if (isProtectedFromResolver(match)) return match;
      return urdu;
    });
  }
  return s;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Applies structural compound resolution to raw Roman Urdu input.
 *
 * Run this on the full input string before passing to convertRomanUrdu().
 * Mutates only structural compounds — all other text passes through unchanged.
 *
 * Pipeline:
 *   1. Protect machine tokens (URLs, files, versions) — handled by guards above
 *   2. Resolve known lexical compounds (exact map)
 *   3. Resolve izafat chains (X-e-Y)
 *   4. Resolve coordination (X-o-Y) for any remaining after lexical pass
 */
export function resolveCompounds(input: string): string {
  // Split on whitespace so we can protect space-delimited tokens individually
  // Actually process the full string since compounds are space-delimited themselves.
  // Guards inside each resolver prevent touching protected tokens.
  let s = input;
  s = resolveLexicalCompounds(s);     // Exact map first (highest priority)
  s = resolveIzafatChain(s);          // X-e-Y chains
  s = resolveCoordination(s);         // Remaining X-o-Y
  s = resolveApostropheClusters(s);   // Known apostrophe clusters → Urdu directly
  s = resolveNoisyRoman(s);           // Phase 19A.20: high-confidence noisy Roman forms
  return s;
}
