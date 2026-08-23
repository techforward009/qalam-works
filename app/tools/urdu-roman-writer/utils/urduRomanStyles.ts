/**
 * Urdu → Roman Urdu Output Style Engine
 * Phase 19A.24 — Post-conversion style layer.
 *
 * Applies AFTER convertUrduToRoman() to adjust spelling conventions.
 * Three styles:
 *   simple   — Pakistani standard (most common online usage)
 *   academic — Scholarly diacritics (ALA-LC-inspired)
 *   chat     — Casual short forms for social media / WhatsApp
 *
 * The base converter (convertUrduToRoman) always produces "simple" output.
 * This layer transforms it for academic or chat contexts.
 */

export type UrduRomanStyle = "simple" | "academic" | "chat";

// ── Academic diacritic mapping ────────────────────────────────────────────────
// Maps Simple Pakistani forms → scholarly transliteration with diacritics.
// Applied word-by-word on the Roman output from convertUrduToRoman.

const ACADEMIC_MAP: Record<string, string> = {
  // Core Islamic names/terms
  "Muhammad":    "Muḥammad",
  "mohammad":    "Muḥammad",
  "Ahmad":       "Aḥmad",
  "Ali":         "ʿAlī",
  "Hussain":     "Ḥusayn",
  "Hasan":       "Ḥasan",
  "Fatimah":     "Fāṭimah",
  "Zahra":       "Zahrāʾ",
  "Ibrahim":     "Ibrāhīm",
  "Musa":        "Mūsā",
  "Isa":         "ʿĪsā",
  "Yusuf":       "Yūsuf",
  "Allah":       "Allāh",
  "Quran":       "Qurʾān",
  "Islam":       "Islām",
  "Muslim":      "Muslim",
  "Imam":        "Imām",
  "Madinah":     "Madīnah",
  "Makkah":      "Makkah",
  // Scholarly vowel lengthening for common words
  "aur":         "aur",    // conjunction — no change needed
  "hai":         "hai",
  "nahi":        "nahī",
  "mein":        "meṃ",
  "se":          "se",
  "ko":          "ko",
  "ka":          "kā",
  "ki":          "kī",
  "ke":          "ke",
  "yeh":         "yah",
  "woh":         "wuh",
  "hain":        "haiṃ",
  "kya":         "kyā",
  "aaj":         "āj",
  "kal":         "kal",
  "bohot":       "bahut",
  "shukriya":    "shukriyā",
  "Pakistan":    "Pākistān",
  "Lahore":      "Lāhaur",
  "Karachi":     "Karāchī",
};

// Academic phrase overrides (multi-word forms)
const ACADEMIC_PHRASES: [string, string][] = ([
  ["InshaAllah",           "In shāʾ Allāh"],
  ["Inshallah",            "In shāʾ Allāh"],
  ["Alhamdulillah",        "al-Ḥamdulillāh"],
  ["MashaAllah",           "Māshāʾ Allāh"],
  ["JazakAllah Khair",     "Jazāka Allāhu Khayran"],
  ["JazakAllah",           "Jazāka Allāh"],
  ["Bismillah ir Rahman ir Raheem", "Bismi-llāhi r-Raḥmāni r-Raḥīm"],
  ["Assalamu Alaikum",     "al-Salāmu ʿAlaykum"],
  ["Wa Alaikum Assalam",   "wa ʿAlaykumu s-Salām"],
  ["Allah Akbar",          "Allāhu Akbar"],
  ["SubhanAllah",          "Subḥāna Allāh"],
  ["Astaghfirullah",       "Astaghfiru-llāh"],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length);

// ── Chat style mapping ────────────────────────────────────────────────────────
// Shorter, more casual forms used in WhatsApp/SMS.

const CHAT_PHRASES: [string, string][] = ([
  ["InshaAllah",                    "InshAllah"],
  ["Alhamdulillah",                 "Alhumdulillah"],
  ["MashaAllah",                    "MashaAllah"],
  ["JazakAllah Khair",              "Jzk"],
  ["JazakAllah",                    "JZK"],
  ["Bismillah ir Rahman ir Raheem", "Bismillah"],
  ["Assalamu Alaikum",              "AOA"],
  ["Wa Alaikum Assalam",            "WOAS"],
  ["SubhanAllah",                   "SubhanAllah"],
  ["Allah Akbar",                   "AllahuAkbar"],
  ["Astaghfirullah",                "Astaghfirullah"],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length);

const CHAT_WORDS: Record<string, string> = {
  "bohot":     "bohat",
  "theek":     "thik",
  "shukriya":  "shukriya",
  "Pakistan":  "Pak",
  "Lahore":    "Lhr",
  "nahi":      "nahi",
  "aur":       "aur",
  "yaar":      "yar",
  "bhai":      "bhi",
  "karo":      "karo",
};

// ── Style transformer ─────────────────────────────────────────────────────────

/**
 * Apply a style transform to Roman Urdu output from convertUrduToRoman().
 * Input is always the "simple" baseline output.
 */
export function applyStyle(romanOutput: string, style: UrduRomanStyle): string {
  if (style === "simple") return romanOutput;

  const phrases = style === "academic" ? ACADEMIC_PHRASES : CHAT_PHRASES;
  const words   = style === "academic" ? ACADEMIC_MAP    : CHAT_WORDS;

  let result = romanOutput;

  // Apply phrase overrides first (longest match)
  for (const [from, to] of phrases) {
    const re = new RegExp(`\\b${escapeRe(from)}\\b`, "g");
    result = result.replace(re, to);
  }

  // Apply word overrides (case-preserving)
  const wordRe = /\b[A-Za-z'-]+\b/g;
  result = result.replace(wordRe, (m) => {
    // Try exact match first
    if (words[m]) return words[m];
    // Try lowercase match, preserve original capitalisation
    const lower = m.charAt(0).toLowerCase() + m.slice(1);
    if (words[lower]) {
      const mapped = words[lower];
      return m[0] === m[0].toUpperCase()
        ? mapped.charAt(0).toUpperCase() + mapped.slice(1)
        : mapped;
    }
    return m;
  });

  return result;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Style metadata ────────────────────────────────────────────────────────────

export const STYLE_OPTIONS: { value: UrduRomanStyle; label: string; description: string }[] = [
  {
    value: "simple",
    label: "Simple",
    description: "Standard Pakistani Roman Urdu",
  },
  {
    value: "academic",
    label: "Academic",
    description: "Scholarly diacritics (ALA-LC style)",
  },
  {
    value: "chat",
    label: "Chat / Social",
    description: "Short casual forms for WhatsApp & social media",
  },
];
