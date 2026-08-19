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
  "kh": [{ text: "خ", weight: 0.9 }, { text: "کھ", weight: 0.5 }],
  "gh": [{ text: "غ", weight: 0.8 }, { text: "گھ", weight: 0.5 }],
  "sh": [{ text: "ش", weight: 0.95 }],
  "ch": [{ text: "چ", weight: 0.95 }, { text: "چھ", weight: 0.3 }],
  "ph": [{ text: "ف", weight: 0.8 }, { text: "پھ", weight: 0.5 }],
  "bh": [{ text: "بھ", weight: 0.9 }],
  "hm": [{ text: "حم", weight: 0.75 }, { text: "ہم", weight: 0.55 }],
  "th": [{ text: "ٹھ", weight: 0.7 }, { text: "تھ", weight: 0.7 }, { text: "ث", weight: 0.3 }],
  "dh": [{ text: "دھ", weight: 0.85 }, { text: "ڈھ", weight: 0.5 }],
  "zh": [{ text: "ژ", weight: 0.7 }, { text: "ز", weight: 0.5 }],
  "wh": [{ text: "و", weight: 0.8 }],
  "ny": [{ text: "نی", weight: 0.7 }, { text: "نے", weight: 0.6 }],
  "ng": [{ text: "نگ", weight: 0.8 }],
  "aa": [{ text: "آ", weight: 0.85 }, { text: "ا", weight: 0.5 }],
  "ee": [{ text: "ی", weight: 0.9 }, { text: "ے", weight: 0.7 }, { text: "ئی", weight: 0.4 }],
  "ii": [{ text: "ی", weight: 0.85 }, { text: "ئی", weight: 0.4 }],
  "oo": [{ text: "و", weight: 0.85 }, { text: "اُو", weight: 0.3 }],
  "uu": [{ text: "و", weight: 0.8 }],
  "ai": [{ text: "ے", weight: 0.7 }, { text: "ائی", weight: 0.5 }, { text: "ی", weight: 0.5 }],
  "ay": [{ text: "ے", weight: 0.75 }, { text: "ائے", weight: 0.4 }, { text: "ی", weight: 0.4 }],
  "ae": [{ text: "ے", weight: 0.7 }, { text: "ائے", weight: 0.4 }],
  "au": [{ text: "او", weight: 0.7 }, { text: "آو", weight: 0.5 }],
  "aw": [{ text: "او", weight: 0.65 }, { text: "آو", weight: 0.5 }],
  "oi": [{ text: "وئی", weight: 0.7 }],
  "ue": [{ text: "وے", weight: 0.7 }, { text: "وئے", weight: 0.5 }],

  // ── Single consonants ─────────────────────────────────────────────────────
  "k": [{ text: "ک", weight: 0.85 }, { text: "ق", weight: 0.35 }],
  "q": [{ text: "ق", weight: 0.9 }, { text: "ک", weight: 0.5 }],
  "g": [{ text: "گ", weight: 0.9 }, { text: "غ", weight: 0.3 }],
  "j": [{ text: "ج", weight: 0.9 }],
  "z": [{ text: "ز", weight: 0.7 }, { text: "ذ", weight: 0.4 }, { text: "ض", weight: 0.3 }, { text: "ظ", weight: 0.2 }],
  "s": [{ text: "س", weight: 0.75 }, { text: "ص", weight: 0.35 }, { text: "ث", weight: 0.2 }],
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
  "h": [{ text: "ہ", weight: 0.75 }, { text: "ح", weight: 0.35 }, { text: "ھ", weight: 0.3 }],
  "x": [{ text: "کس", weight: 0.6 }, { text: "ز", weight: 0.3 }],
  "y": [{ text: "ی", weight: 0.85 }, { text: "ے", weight: 0.4 }],
  "c": [{ text: "ک", weight: 0.7 }, { text: "س", weight: 0.4 }],

  // ── Vowel initials ────────────────────────────────────────────────────────
  "a": [{ text: "ا", weight: 0.7 }, { text: "", weight: 0.5 }], // 'a' may be a schwa (no vowel marker)
  "i": [{ text: "ا", weight: 0.6 }, { text: "ی", weight: 0.5 }],
  "u": [{ text: "ا", weight: 0.55 }, { text: "و", weight: 0.55 }],
  "e": [{ text: "ے", weight: 0.65 }, { text: "ا", weight: 0.45 }],
  "o": [{ text: "و", weight: 0.75 }, { text: "اُو", weight: 0.4 }],
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
    // Try digraph first
    if (i + 1 < lower.length) {
      const bigram = lower[i] + lower[i + 1];
      if (GRAPHEME_MAP[bigram]) {
        units.push({ roman: bigram, candidates: GRAPHEME_MAP[bigram] });
        i += 2;
        matched = true;
      }
    }
    if (!matched) {
      const ch = lower[i];
      const cands = GRAPHEME_MAP[ch] ?? [{ text: ch, weight: 0.1 }]; // unknown char → passthrough
      units.push({ roman: ch, candidates: cands });
      i++;
    }
  }
  return units;
}

// ── Bounded beam search ───────────────────────────────────────────────────────

export const BEAM_WIDTH = 4; // configurable

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
      const topCands = unit.candidates
        .filter(c => c.text !== "") // skip null/empty expansion for now
        .slice(0, 2); // limit expansions per unit
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

  return unique.slice(0, BEAM_WIDTH);
}
