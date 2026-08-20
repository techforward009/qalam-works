/**
 * Protected-token detection for Roman Urdu transliteration.
 * Tokens matching these patterns must survive verbatim in the output.
 * Shared by all three bake-off engines.
 */

/** Patterns for tokens that must never be converted. */
const PROTECTED_PATTERNS: RegExp[] = [
  /^https?:\/\//i,                          // URLs
  /^www\.[a-z0-9-]+\.[a-z]{2,}/i,           // bare www. URLs
  /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i, // email
  /^#[a-z0-9_]+$/i,                         // hashtags
  /^@[a-z0-9_.]+$/i,                        // mentions
  /^\d+(\.\d+)?(%|px|pt|em|rem|km|kg|mb|gb|hz|rpm)?$/i, // numbers + units
  /^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i,  // times
  /^\d{1,4}[-/]\d+$/,                       // dates / phone segments / IDs
  /^[A-Z]{2,}$/,                            // all-caps acronyms (HR, PDF, ATM…)
  /^[A-Z][a-z]+[A-Z]/,                      // CamelCase product names
  /^\d+(st|nd|rd|th)$/i,                    // ordinals
  /^[+]?\d{7,}$/,                           // phone numbers
  /^[a-z0-9\-]+\.[a-z]{2,}(\/\S*)?$/i,     // domain / file paths
  /^[a-z0-9._-]+\.(?:pdf|docx?|xlsx?|pptx?|mp4|png|jpe?g|gif|txt|csv|zip)$/i, // filenames with digits in ext
];

/** Emoji run — preserve entire run. */
const EMOJI_RE = /^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]+$/u;

/** Pure-digit string. */
const DIGIT_RE = /^\d+$/;

/** Internet slang / abbreviations that should never be converted. */
const INTERNET_SLANG = new Set([
  "lol","lmao","omg","wtf","brb","gtg","idk","imo","tbh","smh","np",
  "ugh","argh","jk","jkjk","kkk","okk","hmm","haha","hahaha","zzz",
  "thnx","thx","omfg","rofl","fyi","asap","diy","dm","pm","rsvp",
]);

/** Test whether a single token must be protected verbatim. */
export function isProtectedToken(token: string): boolean {
  if (!token || !token.trim()) return false;
  if (DIGIT_RE.test(token)) return true;
  if (EMOJI_RE.test(token)) return true;
  if (INTERNET_SLANG.has(token.toLowerCase())) return true;
  for (const re of PROTECTED_PATTERNS) {
    if (re.test(token)) return true;
  }
  return false;
}

/**
 * Splits a string into alternating protected and Roman-Urdu segments.
 * Protected segments are returned verbatim; Roman segments are candidates
 * for transliteration.
 */
export interface TokenSegment {
  text: string;
  protected: boolean;
}

export function segmentInput(input: string): TokenSegment[] {
  // Split on whitespace boundaries; preserve whitespace runs as protected.
  const parts = input.split(/(\s+)/);
  return parts.map(part => {
    if (/^\s+$/.test(part)) return { text: part, protected: true };
    // Check each word-token (handles punctuation attached to tokens)
    const bare = part.replace(/^[^a-zA-Z0-9#@\p{Emoji}]+|[^a-zA-Z0-9\p{Emoji}!?]+$/gu, "");
    if (isProtectedToken(part) || isProtectedToken(bare)) return { text: part, protected: true };
    return { text: part, protected: false };
  });
}
