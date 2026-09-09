/**
 * LI-2 — shared deterministic Protected Token Engine.
 * Syntactic technical spans only. No NLP, no semantic intent.
 * Offsets always refer to the original source string.
 */

export type ProtectedTokenKind =
  | "url"
  | "email"
  | "filename"
  | "acronym"
  | "decimal"
  | "number-group"
  | "date"
  | "time"
  | "mention"
  | "hashtag"
  | "code"
  | "placeholder"
  | "reference";

export interface ProtectedToken {
  kind: ProtectedTokenKind;
  text: string;
  start: number;
  end: number;
}

export const PRESERVE_MARKER_REGEX = /\{\{([\s\S]*?)\}\}/g;
export const URL_LIKE_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
export const EMAIL_LIKE_REGEX = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g;
export const FILENAME_LIKE_REGEX = /\b[\w.-]+\.(?:txt|docx?|pdf|xlsx?|pptx?|csv|json|zip)\b/gi;
export const TECHNICAL_ACRONYM_REGEX = /\b[A-Z]{2,6}\b/g;

const PLACEHOLDER_REGEX = /\{\{[\s\S]*?\}\}/g;
const CODE_BACKTICK_REGEX = /`[^`\n]+`/g;
const CODE_CALL_REGEX = /\b[A-Za-z_]\w*\.[A-Za-z_]\w*\(\)/g;
const CODE_ASSIGN_REGEX = /\b[A-Za-z_][\w-]*\=[^\s]+/g;
const DATE_REGEX = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
const TIME_REGEX = /\b\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?\b/g;
const DECIMAL_REGEX = /\b\d+\.\d+\b/g;
const NUMBER_GROUP_REGEX = /\b\d{1,3}(?:,\d{3})+\b/g;
const MENTION_REGEX = /(^|[^A-Za-z0-9_])@[A-Za-z0-9._]+/g;
const HASHTAG_REGEX = /#[A-Za-z][A-Za-z0-9_]*/g;
const REFERENCE_REGEX = /\[\d+\]|\(\d{4}\)|§\d+/g;

/** Higher priority first. Overlapping lower-priority matches are skipped. */
const RULES: ReadonlyArray<{ kind: ProtectedTokenKind; regex: RegExp; adjust?: "url" | "mention" }> = [
  { kind: "placeholder", regex: PLACEHOLDER_REGEX },
  { kind: "url", regex: URL_LIKE_REGEX, adjust: "url" },
  { kind: "email", regex: EMAIL_LIKE_REGEX },
  { kind: "code", regex: CODE_BACKTICK_REGEX },
  { kind: "code", regex: CODE_CALL_REGEX },
  { kind: "code", regex: CODE_ASSIGN_REGEX },
  { kind: "filename", regex: FILENAME_LIKE_REGEX },
  { kind: "date", regex: DATE_REGEX },
  { kind: "time", regex: TIME_REGEX },
  { kind: "decimal", regex: DECIMAL_REGEX },
  { kind: "number-group", regex: NUMBER_GROUP_REGEX },
  { kind: "mention", regex: MENTION_REGEX, adjust: "mention" },
  { kind: "hashtag", regex: HASHTAG_REGEX },
  { kind: "acronym", regex: TECHNICAL_ACRONYM_REGEX },
  { kind: "reference", regex: REFERENCE_REGEX },
];

const URL_TRAILING_PUNCT = /[.,;:!?،؟۔)\]"'”’]+$/;

function overlapsClaimed(claimed: boolean[], start: number, end: number): boolean {
  for (let i = start; i < end; i++) if (claimed[i]) return true;
  return false;
}

function claimRange(claimed: boolean[], start: number, end: number): void {
  for (let i = start; i < end; i++) claimed[i] = true;
}

function urlEnd(text: string, start: number, end: number): number {
  const slice = text.slice(start, end);
  const trimmed = slice.replace(URL_TRAILING_PUNCT, "");
  return start + trimmed.length;
}

export function findProtectedTokens(text: string): ProtectedToken[] {
  if (!text) return [];
  const claimed = new Array<boolean>(text.length).fill(false);
  const tokens: ProtectedToken[] = [];

  for (const rule of RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      let start = match.index;
      let end = start + match[0].length;
      if (rule.adjust === "mention") {
        const full = match[0];
        const at = full.lastIndexOf("@");
        start = match.index + at;
      } else if (rule.adjust === "url") {
        end = urlEnd(text, start, end);
      }
      if (end <= start) continue;
      if (overlapsClaimed(claimed, start, end)) continue;
      claimRange(claimed, start, end);
      tokens.push({
        kind: rule.kind,
        text: text.slice(start, end),
        start,
        end,
      });
    }
  }

  tokens.sort((a, b) => a.start - b.start || b.end - a.end);
  return tokens;
}

export function protectedIndexMask(text: string, tokens = findProtectedTokens(text)): boolean[] {
  const flags = new Array<boolean>(text.length).fill(false);
  for (const token of tokens) claimRange(flags, token.start, token.end);
  return flags;
}

/** Length-preserving mask: protected spans become spaces, indexes stay valid. */
export function maskProtectedTokens(text: string, tokens = findProtectedTokens(text)): string {
  if (!text) return text;
  const chars = text.split("");
  for (const token of tokens) {
    for (let i = token.start; i < token.end; i++) chars[i] = " ";
  }
  return chars.join("");
}

export function rangeIsProtected(flags: boolean[], start: number, length: number): boolean {
  const end = Math.min(flags.length, start + length);
  for (let i = start; i < end; i++) if (flags[i]) return true;
  return false;
}
