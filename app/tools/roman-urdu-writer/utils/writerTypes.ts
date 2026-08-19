/**
 * Qalam Urdu Writer — Production Core Types
 *
 * Phase 19A.1 — stable, UI-decoupled interface for the Roman Urdu Writer.
 * These types are consumed by the Writer UI; they must not import engine internals.
 */

// ── Token classification ──────────────────────────────────────────────────────

/**
 * How a token was resolved by the engine.
 * Reflects V2 pipeline layers; does not expose internal implementation names.
 */
export type TokenSource =
  | "protected"    // hard-protected: URL, email, hashtag, number, phone, etc.
  | "english"      // keep-English: intentional English word in mixed text
  | "phrase"       // matched a multi-token phrase rule
  | "context"      // resolved via context-sensitive rule (main→میں, to→تو, etc.)
  | "lexicon"      // exact match in Roman→Urdu lexicon
  | "morphology"   // morphological rule / spelling variant
  | "phonetic"     // pronunciation-based Urdu-script fallback
  | "passthrough"  // unknown or low-confidence → original Roman preserved
  | "suggestion";  // speculative candidate (V3 or alternative) — never primary

/**
 * How confident the engine is in this token's conversion.
 * Semantic bands; not fake numerical probabilities.
 */
export type ConfidenceBand = "high" | "medium" | "low";

// ── Token result ──────────────────────────────────────────────────────────────

/** A single token candidate with its Urdu (or Roman) text and source. */
export interface TokenCandidate {
  /** Urdu-script or Roman text for this candidate. */
  text: string;
  /** How this candidate was generated. */
  source: TokenSource;
  /** Confidence in this candidate. */
  confidence: ConfidenceBand;
}

/**
 * Per-token result from the Urdu Writer engine.
 * Safe to pass to React components without importing engine internals.
 */
export interface WriterToken {
  /** Original Roman Urdu text (byte-for-byte, never mutated). */
  roman: string;

  /**
   * Primary conversion output.
   * For high-confidence tokens: Urdu script.
   * For low-confidence/unknown tokens: same as `roman`.
   */
  primary: string;

  /** Character offset of this token in the original input string. */
  startOffset: number;
  /** Exclusive end offset (startOffset + roman.length). */
  endOffset: number;

  /** How the primary output was determined. */
  source: TokenSource;

  /** Engine confidence in the primary output. */
  confidence: ConfidenceBand;

  // ── State flags ──────────────────────────────────────────────────────────

  /** True if the token is syntactically protected (URL, number, etc.). Must never be altered. */
  isProtected: boolean;

  /** True if the token is an English word preserved intentionally. */
  isEnglish: boolean;

  /** True if the engine converted this token automatically to Urdu. */
  isAutoConverted: boolean;

  /**
   * True if the primary output is the same as the Roman input
   * (passthrough because of unknown/low confidence).
   */
  isPassthrough: boolean;

  /**
   * True if the token has genuine alternatives the user might want to review.
   * Drives future "suggestion chip" UI.
   */
  hasAlternatives: boolean;

  /**
   * True if this is the first token of a phrase-table match.
   * Its `primary` contains the full Urdu phrase output.
   * Its `endOffset` covers only this token's source span.
   */
  isPhraseHead: boolean;

  /**
   * True if this token is a continuation part of a phrase match.
   * `primary` is empty (""); the token is preserved for offset tracking only.
   */
  isPhrasePart: boolean;

  /**
   * Ranked alternative candidates for this token.
   * Candidate[0] always matches `primary`.
   * May be empty for unambiguous tokens.
   */
  candidates: TokenCandidate[];
}

// ── Sentence-level result ─────────────────────────────────────────────────────

/**
 * A complete sentence candidate — the full reconstructed output string,
 * corresponding to one alternative set of per-token choices.
 */
export interface SentenceCandidate {
  /** Fully reconstructed output string. */
  output: string;
  /**
   * Index into `tokens` → which candidate was chosen per token.
   * Key: token index. Value: candidate index within that token's `candidates`.
   * Tokens not in the map use their default (index 0 = primary).
   */
  tokenChoices: Record<number, number>;
}

// ── Main result ───────────────────────────────────────────────────────────────

/**
 * Full result from `convertRomanUrdu(input)`.
 *
 * - `output`     — primary converted string (always equals `engineV2.convert(input).output`)
 * - `tokens`     — per-token breakdown
 * - `candidates` — up to 3 unique complete-sentence alternatives (Candidate 0 = `output`)
 */
export interface WriterConversionResult {
  /** The original Roman Urdu input, unchanged. */
  input: string;

  /**
   * Primary conversion output.
   * Equals engineV2.convert(input).output for all inputs.
   */
  output: string;

  /** Per-token breakdown. Whitespace tokens are included with isProtected=true. */
  tokens: WriterToken[];

  /**
   * Up to 3 unique complete-sentence alternatives.
   * candidates[0].output always equals `output`.
   * May contain only 1 entry if no alternatives exist.
   */
  candidates: SentenceCandidate[];

  /** Engine metadata for debugging/regression tracking. */
  meta: WriterEngineMeta;
}

// ── User-choice types ─────────────────────────────────────────────────────────

/**
 * A user-made selection: for token at `tokenIndex`, use candidate at `candidateIndex`.
 * candidateIndex 0 = primary (reset to engine default).
 */
export interface TokenChoice {
  tokenIndex: number;
  candidateIndex: number;
}

/**
 * Result of applying user choices to an existing conversion result.
 * The `output` is rebuilt deterministically from the choices.
 * The original `input` and per-token Roman text are never modified.
 */
export interface WriterChoiceResult {
  /** Same as original WriterConversionResult.input. */
  input: string;
  /** Rebuilt output applying all user choices. */
  output: string;
  /** Applied choices (valid indices only). */
  appliedChoices: TokenChoice[];
  /** Which token indices have non-default (user-selected) choices. */
  overriddenTokens: number[];
  /**
   * Choices that were not applied because the index was invalid.
   * Includes: tokenIndex out of range, candidateIndex out of range,
   * or candidateIndex pointing to an empty candidates array.
   * Never throws — callers can inspect this to detect stale UI state.
   */
  rejectedChoices: TokenChoice[];
}

// ── Engine metadata ───────────────────────────────────────────────────────────

export interface WriterEngineMeta {
  /** Production engine identifier. */
  engine: "writer-v2-production";
  /** Strategy summary for debugging. */
  strategy: "V2-bounded-production";
  /** Whether experimental V3 candidates are included in any token alternatives. */
  includesExperimentalCandidates: boolean;
}
