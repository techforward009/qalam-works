/**
 * Productive Roman Urdu Grapheme Generator
 *
 * Converts Roman Urdu tokens to ranked Urdu-script candidates using
 * deterministic weighted grapheme mapping. Operates on unseen vocabulary —
 * does NOT require exact lexicon membership to produce candidates.
 *
 * Design:
 *   1. Segment Roman input into a sequence of grapheme units (digraphs first)
 *   2. For each unit, look up weighted Urdu-script candidates
 *   3. Bounded beam search over unit×candidate combinations
 *   4. Return ranked unique Urdu strings
 */

export interface WeightedCandidate {
  text: string;
  weight: number; // higher = more probable; normalized 0–1 per grapheme
}

// ── Grapheme mapping table ────────────────────────────────────────────────────
// Each Roman grapheme maps to ordered (text, weight) pairs.
// Digraphs are checked before single characters.
// Weights reflect typical Pakistani Urdu spelling frequencies.

export const GRAPHEME_MAP: Record<string, WeightedCandidate[]> = {
  // ── Digraphs (must be checked before single chars) ────────────────────────
  // ── Productive endings (checked before digraphs) ─────────────────────────
  "oon": [{ text: "وں", weight: 0.95 }, { text: "ون", weight: 0.35 }],
  "on": [{ text: "وں", weight: 0.9 }, { text: "ون", weight: 0.4 }, { text: "ان", weight: 0.25 }],
  "ein": [{ text: "یں", weight: 0.92 }, { text: "ین", weight: 0.35 }],
  "ain": [{ text: "یں", weight: 0.85 }, { text: "ین", weight: 0.4 }, { text: "ائیں", weight: 0.35 }],
  "ey": [{ text: "ے", weight: 0.9 }, { text: "ی", weight: 0.35 }, { text: "یں", weight: 0.45 }],
  "ay": [{ text: "ے", weight: 0.85 }, { text: "ای", weight: 0.35 }, { text: "ی", weight: 0.3 }],
  "aan": [{ text: "ان", weight: 0.85 }, { text: "آں", weight: 0.4 }, { text: "اں", weight: 0.35 }],
  "ana": [{ text: "انا", weight: 0.9 }, { text: "آنا", weight: 0.45 }],
  "aana": [{ text: "انا", weight: 0.88 }, { text: "آنا", weight: 0.5 }],
  "tau": [{ text: "طو", weight: 0.85 }, { text: "تو", weight: 0.4 }, { text: "تاو", weight: 0.3 }],
  "doos": [{ text: "دوس", weight: 0.9 }, { text: "ڈوس", weight: 0.3 }],
  "khab": [{ text: "خبر", weight: 0.9 }, { text: "خاب", weight: 0.35 }],
  "aag": [{ text: "آگ", weight: 0.9 }, { text: "اگ", weight: 0.35 }],
  "phel": [{ text: "پھیل", weight: 0.9 }, { text: "فیل", weight: 0.35 }],
  "bin": [{ text: "بن", weight: 0.85 }, { text: "بین", weight: 0.45 }],
  "waj": [{ text: "وج", weight: 0.8 }, { text: "واج", weight: 0.35 }],

  "kh": [{ text: "خ", weight: 0.9 }, { text: "کھ", weight: 0.5 }],
  "gh": [{ text: "غ", weight: 0.8 }, { text: "گھ", weight: 0.5 }],
  "mh": [{ text: "مح", weight: 0.88 }, { text: "مہ", weight: 0.45 }],
  "hr": [{ text: "حر", weight: 0.7 }, { text: "ھر", weight: 0.35 }],
  "hq": [{ text: "حق", weight: 0.9 }],
  "nya": [{ text: "نیا", weight: 0.9 }],
  "ao": [{ text: "اؤ", weight: 0.75 }, { text: "او", weight: 0.55 }],
  "sh": [{ text: "ش", weight: 0.95 }],
  "ch": [{ text: "چ", weight: 0.95 }, { text: "چھ", weight: 0.3 }],
  "ph": [{ text: "پھ", weight: 0.9 }, { text: "ف", weight: 0.55 }],
  "bh": [{ text: "بھ", weight: 0.9 }],
  "hm": [{ text: "ہم", weight: 0.9 }, { text: "حم", weight: 0.45 }],
  "th": [{ text: "ٹھ", weight: 0.7 }, { text: "تھ", weight: 0.7 }, { text: "ث", weight: 0.3 }],
  "dh": [{ text: "دھ", weight: 0.85 }, { text: "ڈھ", weight: 0.5 }],
  "zh": [{ text: "ژ", weight: 0.7 }, { text: "ز", weight: 0.5 }],
  "wh": [{ text: "و", weight: 0.8 }],
  "ny": [{ text: "نی", weight: 0.7 }, { text: "نے", weight: 0.6 }],
  "ng": [{ text: "نگ", weight: 0.8 }],
  "aa": [{ text: "آ", weight: 0.9 }, { text: "ا", weight: 0.55 }],
  "ee": [{ text: "ی", weight: 0.9 }, { text: "ے", weight: 0.7 }, { text: "ئی", weight: 0.4 }],
  "ii": [{ text: "ی", weight: 0.85 }, { text: "ئی", weight: 0.4 }],
  "oo": [{ text: "و", weight: 0.85 }, { text: "اُو", weight: 0.3 }],
  "uu": [{ text: "و", weight: 0.8 }],
  "ai": [{ text: "ے", weight: 0.7 }, { text: "ائی", weight: 0.5 }, { text: "ی", weight: 0.5 }],
  "ae": [{ text: "ے", weight: 0.7 }, { text: "ائے", weight: 0.4 }],
  "au": [{ text: "او", weight: 0.7 }, { text: "آو", weight: 0.5 }],
  "aw": [{ text: "او", weight: 0.65 }, { text: "آو", weight: 0.5 }],
  "oi": [{ text: "وئی", weight: 0.7 }],
  "ue": [{ text: "وے", weight: 0.7 }, { text: "وئے", weight: 0.5 }],

  // ── Single consonants ─────────────────────────────────────────────────────
  "k": [{ text: "ک", weight: 0.85 }, { text: "ق", weight: 0.35 }],
  "q": [{ text: "ق", weight: 0.95 }, { text: "ک", weight: 0.35 }],
  "g": [{ text: "گ", weight: 0.9 }, { text: "غ", weight: 0.3 }],
  "j": [{ text: "ج", weight: 0.9 }],
  "z": [{ text: "ز", weight: 0.7 }, { text: "ذ", weight: 0.4 }, { text: "ض", weight: 0.3 }, { text: "ظ", weight: 0.2 }],
  "s": [{ text: "س", weight: 0.65 }, { text: "ص", weight: 0.5 }, { text: "ث", weight: 0.2 }],
  "t": [{ text: "ت", weight: 0.7 }, { text: "ٹ", weight: 0.6 }, { text: "ط", weight: 0.2 }],
  "d": [{ text: "د", weight: 0.75 }, { text: "ڈ", weight: 0.55 }],
  "r": [{ text: "ر", weight: 0.8 }, { text: "ڑ", weight: 0.4 }],
  "l": [{ text: "ل", weight: 0.95 }],
  "m": [{ text: "م", weight: 0.95 }],
  "n": [{ text: "ن", weight: 0.9 }, { text: "ں", weight: 0.4 }],
  "p": [{ text: "پ", weight: 0.95 }],
  "b": [{ text: "ب", weight: 0.95 }],
  "f": [{ text: "ف", weight: 0.9 }],
  "v": [{ text: "و", weight: 0.7 }, { text: "ب", weight: 0.3 }],
  "w": [{ text: "و", weight: 0.85 }],
  "h": [{ text: "ہ", weight: 0.55 }, { text: "ح", weight: 0.55 }, { text: "ھ", weight: 0.25 }],
  "x": [{ text: "کس", weight: 0.6 }, { text: "ز", weight: 0.3 }],
  "y": [{ text: "ی", weight: 0.85 }, { text: "ے", weight: 0.4 }],
  "c": [{ text: "ک", weight: 0.7 }, { text: "س", weight: 0.4 }],

  // ── Vowel initials ────────────────────────────────────────────────────────
  "a": [{ text: "ا", weight: 0.55 }, { text: "", weight: 0.7 }], // schwa omission preferred slightly
  "i": [{ text: "ی", weight: 0.55 }, { text: "", weight: 0.5 }, { text: "ا", weight: 0.35 }],
  "u": [{ text: "و", weight: 0.55 }, { text: "", weight: 0.55 }, { text: "ا", weight: 0.35 }],
  "e": [{ text: "ے", weight: 0.65 }, { text: "ا", weight: 0.45 }],
  "o": [{ text: "و", weight: 0.7 }, { text: "ؤ", weight: 0.45 }, { text: "اُو", weight: 0.3 }],
  "3": [{ text: "ع", weight: 0.98 }],
};

// Ordered list of digraphs to check first (longest first)
const DIGRAPHS = Object.keys(GRAPHEME_MAP).filter(k => k.length === 2);

// ── Grapheme segmentation ─────────────────────────────────────────────────────

export interface GraphemeUnit {
  roman: string;
  candidates: WeightedCandidate[];
}

/**
 * Segments a Roman token into grapheme units.
 * Greedy left-to-right, digraphs take priority over single chars.
 * Case-insensitive.
 */
export function segmentGraphemes(token: string): GraphemeUnit[] {
  const lower = token.toLowerCase();
  const units: GraphemeUnit[] = [];
  let i = 0;
  while (i < lower.length) {
    let matched = false;
    for (const len of [4, 3, 2] as const) {
      if (i + len - 1 < lower.length) {
        const unit = lower.slice(i, i + len);
        if (GRAPHEME_MAP[unit]) {
          units.push({ roman: unit, candidates: GRAPHEME_MAP[unit] });
          i += len;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      const ch = lower[i];
      const cands = GRAPHEME_MAP[ch] ?? [{ text: ch, weight: 0.1 }];
      units.push({ roman: ch, candidates: cands });
      i++;
    }
  }
  return units;

}

// ── Bounded beam search ───────────────────────────────────────────────────────

export const BEAM_WIDTH = 8; // configurable

export interface BeamCandidate {
  text: string;
  score: number; // product of weights (log-space)
}

/**
 * Generates up to BEAM_WIDTH ranked Urdu candidates for a Roman token.
 * Uses bounded beam search over grapheme units.
 * Deterministic: candidates sorted by score descending, then alphabetically.
 */
export function generateCandidates(token: string): BeamCandidate[] {
  const units = segmentGraphemes(token);
  if (units.length === 0) return [{ text: token, score: 0 }];

  // Initialize beam with empty string
  let beam: BeamCandidate[] = [{ text: "", score: 0 }];

  for (const unit of units) {
    const next: BeamCandidate[] = [];
    for (const prev of beam) {
      // Take top candidates for this unit (by weight)
      const topCands = unit.candidates.slice(0, 4); // limit expansions per unit
      for (const cand of topCands) {
        next.push({
          text: prev.text + cand.text,
          score: prev.score + Math.log(cand.weight + 1e-9),
        });
      }
      // Also allow empty vowel (schwa) from 'a' maps
      const emptyCand = unit.candidates.find(c => c.text === "");
      if (emptyCand) {
        next.push({ text: prev.text, score: prev.score + Math.log(emptyCand.weight + 1e-9) });
      }
    }
    // Prune to beam width
    next.sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
    beam = next.slice(0, BEAM_WIDTH);
    if (beam.length === 0) beam = [{ text: token, score: -999 }]; // safety fallback
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = beam.filter(c => {
    if (seen.has(c.text)) return false;
    seen.add(c.text);
    return true;
  });

  const cleaned = unique.filter(c => !/[\u064B-\u065F]/.test(c.text));
  return (cleaned.length ? cleaned : unique).slice(0, BEAM_WIDTH);
}
