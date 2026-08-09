// Document Intelligence — Suggestion Layer (2026-08-09, extended
// 2026-08-09 with context display + Typography/Structure categories).
// Generates concrete, per-instance suggestions (original text →
// suggested text) for a subset of already-detected issue categories.
// Deliberately PREVIEW-ONLY: nothing here modifies the document, the
// DocNode, or any export pipeline — it only produces data for display.
//
// Reuses the exact same character sets and regex patterns already
// established in checkTextQuality.ts and standardizeUrduText.ts rather
// than inventing new ones, so "what counts as an issue" stays consistent
// across the whole app. Where a pattern is duplicated here (rather than
// imported) it's because the source file only exposes COUNTS, not the
// actual match positions/instances a suggestion needs — the patterns
// themselves are copied verbatim and commented with their source, so
// they can be kept in sync if the source ever changes. Structure
// suggestions reuse buildDocumentAuditReport.ts's own exported counters
// directly (no duplicated detection logic there).

import { getBlockTexts, type DocNode } from "./extractPlainText";
import { countHeadingHierarchyIssues, countEmptyParagraphs, countLongParagraphs } from "./buildDocumentAuditReport";

export type SuggestionCategory = "unicode" | "typography" | "numeral" | "punctuation" | "spacing" | "structure";
export type SuggestionSeverity = "low" | "medium" | "high";

export interface DocumentSuggestion {
  type: string;
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  originalText: string;
  suggestedText: string;
  explanation: string;
  // Suggestion Context Display (2026-08-09): the text immediately
  // surrounding `originalText` in the document, for rendering
  // "...contextBefore [originalText → suggestedText] contextAfter...".
  // Empty for document-level advisories (numeral/punctuation
  // consistency, structure) that describe a document-wide pattern
  // rather than one findable span — there is no single position to pull
  // context from for those.
  contextBefore: string;
  contextAfter: string;
}

// Same {{ }} preserve-marker convention as checkTextQuality.ts and
// standardizeUrduText.ts — protected classical Arabic quotations are
// exempt from Unicode-form suggestions for the same reason they're exempt
// from correction/detection everywhere else in the app.
const PRESERVE_MARKER_REGEX = /\{\{([\s\S]*?)\}\}/g;

// Caps how many concrete examples are generated per issue TYPE, so a
// large document with hundreds of the same issue doesn't flood the
// preview panel — the issue COUNT (shown separately) still reflects the
// true total, only the example list is capped.
const MAX_EXAMPLES_PER_TYPE = 5;
const CONTEXT_RADIUS = 15;

interface Extraction {
  before: string;
  match: string;
  after: string;
}

// Separates a match from its surrounding context, rather than blending
// them into one window — `match` is the exact, minimal span a suggestion
// targets (used for both display highlighting and, via originalText, for
// applySuggestionToText's find/replace), so it stays precise even as
// display context grows independently.
function extractWithContext(text: string, index: number, matchLength: number, radius = CONTEXT_RADIUS): Extraction {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + matchLength + radius);
  return {
    before: text.slice(start, index),
    match: text.slice(index, index + matchLength),
    after: text.slice(index + matchLength, end),
  };
}

// A) Unicode normalization suggestions. Yeh/Kaf mappings are the exact
// same two of the five characters checkTextQuality.ts's
// mixedUrduArabicForms check (/[\u064A\u0649\u0643\u0623\u0625]/g) already
// counts, and the exact same direction as standardizeUrduText.ts's
// CHAR_NORMALIZATIONS (ي→ی, ك→ک). Heh (ه→ہ) is a NEW addition not
// currently in either existing list — flagged here as detection/
// suggestion only, at the same "medium" severity as Yeh/Kaf.
const UNICODE_RULES: { char: string; type: string; label: string }[] = [
  { char: "ي", type: "unicode-arabic-yeh", label: "Arabic Yeh (ي) → Urdu Yeh (ی)" },
  { char: "ك", type: "unicode-arabic-kaf", label: "Arabic Kaf (ك) → Urdu Kaf (ک)" },
  { char: "ه", type: "unicode-arabic-heh", label: "Arabic Heh (ه) → Urdu Heh/Goal (ہ)" },
];
const UNICODE_REPLACEMENT: Record<string, string> = { ي: "ی", ك: "ک", ه: "ہ" };

function findUnicodeSuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];
  const protectedStripped = text.replace(PRESERVE_MARKER_REGEX, (m) => " ".repeat(m.length));

  for (const rule of UNICODE_RULES) {
    const regex = new RegExp(rule.char, "g");
    let match: RegExpExecArray | null;
    let count = 0;
    while (count < MAX_EXAMPLES_PER_TYPE && (match = regex.exec(protectedStripped)) !== null) {
      const { before, match: exact, after } = extractWithContext(text, match.index, 1);
      suggestions.push({
        type: rule.type,
        category: "unicode",
        severity: "medium",
        originalText: exact,
        suggestedText: UNICODE_REPLACEMENT[rule.char],
        explanation: `${rule.label} — یکساں رسم الخط کے لیے تجویز کردہ`,
        contextBefore: before,
        contextAfter: after,
      });
      count++;
    }
  }
  return suggestions;
}

// B) Spacing suggestions. Same patterns as checkTextQuality.ts's
// multipleSpaces (/[ \t]{2,}/g) and spaceBeforePunctuation
// (/ [.,!?;:،؛؟۔]/g) checks.
function findSpacingSuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];

  const multiSpaceRegex = /[ \t]{2,}/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while (count < MAX_EXAMPLES_PER_TYPE && (match = multiSpaceRegex.exec(text)) !== null) {
    const { before, match: exact, after } = extractWithContext(text, match.index, match[0].length);
    suggestions.push({
      type: "spacing-multiple-spaces",
      category: "spacing",
      severity: "low",
      originalText: exact,
      suggestedText: " ",
      explanation: "دہری خالی جگہ کو ایک خالی جگہ سے تبدیل کرنے کی تجویز",
      contextBefore: before,
      contextAfter: after,
    });
    count++;
  }

  const beforePunctRegex = / [.,!?;:،؛؟۔]/g;
  count = 0;
  while (count < MAX_EXAMPLES_PER_TYPE && (match = beforePunctRegex.exec(text)) !== null) {
    const { before, match: exact, after } = extractWithContext(text, match.index, match[0].length);
    suggestions.push({
      type: "spacing-before-punctuation",
      category: "spacing",
      severity: "low",
      originalText: exact,
      suggestedText: exact.trimStart(),
      explanation: "رمزِ اوقاف سے پہلے خالی جگہ ہٹانے کی تجویز",
      contextBefore: before,
      contextAfter: after,
    });
    count++;
  }

  return suggestions;
}

// C) Typography suggestions — tatweel/kashida (U+0640), same character
// checkTextQuality.ts's tatweelCount check already detects. Per-instance,
// same style as Unicode/Spacing (a tatweel is a single removable
// character with an exact position, unlike numeral/punctuation's
// document-wide advisories below).
const TATWEEL_CHAR = "\u0640";

function findTypographySuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];
  const regex = new RegExp(TATWEEL_CHAR, "g");
  let match: RegExpExecArray | null;
  let count = 0;
  while (count < MAX_EXAMPLES_PER_TYPE && (match = regex.exec(text)) !== null) {
    const { before, match: exact, after } = extractWithContext(text, match.index, 1);
    suggestions.push({
      type: "typography-tatweel",
      category: "typography",
      severity: "low",
      originalText: exact,
      suggestedText: "",
      explanation: "تطویل (کشیدہ) حروف عام طور پر کاپی پیسٹ سے آتے ہیں اور غیر ضروری ہیں — ہٹانے کی تجویز",
      contextBefore: before,
      contextAfter: after,
    });
    count++;
  }
  return suggestions;
}

// D) Numeral consistency suggestion. Same three ranges as
// buildDocumentStats.ts's Numeral Intelligence. Deliberately ONE
// document-level suggestion (not one per digit) — converting every
// individual number without knowing its role (a date, a citation, a
// page number) would be presumptuous; this only flags that a choice is
// worth making, consistently, and names Urdu-Indic as the common
// convention in Urdu prose without forcing it. No single findable
// position, so contextBefore/contextAfter are empty.
const WESTERN_DIGIT = /[0-9]/;
const ARABIC_INDIC_DIGIT = /[\u0660-\u0669]/;
const URDU_INDIC_DIGIT = /[\u06F0-\u06F9]/;

function findNumeralSuggestions(text: string): DocumentSuggestion[] {
  const hasWestern = WESTERN_DIGIT.test(text);
  const hasArabicIndic = ARABIC_INDIC_DIGIT.test(text);
  const hasUrduIndic = URDU_INDIC_DIGIT.test(text);
  const systemsPresent = [hasWestern, hasArabicIndic, hasUrduIndic].filter(Boolean).length;

  if (systemsPresent <= 1) return [];

  const westernExample = text.match(new RegExp(WESTERN_DIGIT.source + "+"))?.[0] ?? "";
  const arabicIndicExample = text.match(new RegExp(ARABIC_INDIC_DIGIT.source + "+"))?.[0] ?? "";
  const urduIndicExample = text.match(new RegExp(URDU_INDIC_DIGIT.source + "+"))?.[0] ?? "";
  const found = [westernExample, arabicIndicExample, urduIndicExample].filter(Boolean).join(" / ");

  return [
    {
      type: "numeral-mixed",
      category: "numeral",
      severity: "medium",
      originalText: found,
      suggestedText: "ایک ہی نظام (عام طور پر اردو ہندسے ۰-۹) پورے دستاویز میں یکساں استعمال کریں",
      explanation: "دستاویز میں ایک سے زیادہ ہندسوں کے نظام ملے — مغربی، عربی-انڈک، اور اردو-انڈک۔ یکسانیت تجویز کی جاتی ہے۔",
      contextBefore: "",
      contextAfter: "",
    },
  ];
}

// E) Punctuation consistency suggestion. Same three pairs as
// checkTextQuality.ts's inconsistentPunctuationStyle check. One
// document-level suggestion per detected pair, matching the same
// "flag the choice, don't presume the fix" reasoning as numerals above.
function findPunctuationSuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];
  const pairs: { ascii: string; arabic: string; label: string }[] = [
    { ascii: ",", arabic: "،", label: "کوما (, / ،)" },
    { ascii: ";", arabic: "؛", label: "سیمی کولن (; / ؛)" },
    { ascii: "?", arabic: "؟", label: "سوالیہ نشان (? / ؟)" },
  ];

  for (const pair of pairs) {
    const hasAscii = text.includes(pair.ascii);
    const hasArabic = text.includes(pair.arabic);
    if (hasAscii && hasArabic) {
      suggestions.push({
        type: "punctuation-inconsistent",
        category: "punctuation",
        severity: "medium",
        originalText: `${pair.ascii} اور ${pair.arabic} دونوں موجود`,
        suggestedText: `صرف ${pair.arabic} استعمال کریں`,
        explanation: `${pair.label} دونوں شکلوں میں استعمال ہوا ہے۔ یکساں انداز تجویز کیا جاتا ہے۔`,
        contextBefore: "",
        contextAfter: "",
      });
    }
  }
  return suggestions;
}

// G) Quote Correction (Batch 1, 2026-08-09). Reuses checkTextQuality.ts's
// exact detection: straight quotes (/["']/g) and the open/close curly
// count (\u201C/\u201D) used for its unmatched-pair check. Preview only —
// never auto-applied (enforced by the existing Accept/Ignore/Apply
// workflow, not by anything special here).
//
// Direction for a straight-quote suggestion is a simple, standard
// "smart quotes" heuristic (whitespace/start/opening-punctuation before
// → opening quote; otherwise → closing quote) — good enough for a
// SUGGESTION a human reviews, not claimed to be perfect in every case.
const OPENING_CONTEXT = /[\s([{"'\u201C\u2018]|^$/;

function quoteReplacement(quoteChar: string, precedingChar: string): string {
  const isOpening = precedingChar === "" || OPENING_CONTEXT.test(precedingChar);
  if (quoteChar === '"') return isOpening ? "\u201C" : "\u201D";
  return isOpening ? "\u2018" : "\u2019";
}

function findQuoteSuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];

  // Straight quotes → curly, per instance.
  const straightQuoteRegex = /["']/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while (count < MAX_EXAMPLES_PER_TYPE && (match = straightQuoteRegex.exec(text)) !== null) {
    const precedingChar = match.index > 0 ? text[match.index - 1] : "";
    const replacement = quoteReplacement(match[0], precedingChar);
    const { before, match: exact, after } = extractWithContext(text, match.index, 1);
    suggestions.push({
      type: "punctuation-straight-quote",
      category: "punctuation",
      severity: "low",
      originalText: exact,
      suggestedText: replacement,
      explanation: "سیدھے quote کو مناسب گھمے ہوئے (curly) quote سے تبدیل کرنے کی تجویز",
      contextBefore: before,
      contextAfter: after,
    });
    count++;
  }

  // Unmatched curly double quotes — same \u201C/\u201D counting as
  // checkTextQuality.ts. No single position to fix (the missing quote
  // could belong anywhere), so this is ONE document-level advisory, same
  // pattern as numeral/punctuation-consistency above.
  const openCurly = (text.match(/\u201C/g) ?? []).length;
  const closeCurly = (text.match(/\u201D/g) ?? []).length;
  if (openCurly !== closeCurly) {
    suggestions.push({
      type: "punctuation-unmatched-quotes",
      category: "punctuation",
      severity: "medium",
      originalText: `کھلے quotes: ${openCurly}، بند quotes: ${closeCurly}`,
      suggestedText: "ہر کھلے quote کا ایک متعلقہ بند quote یقینی بنائیں",
      explanation: "دستاویز میں گھمے ہوئے quotes کی تعداد برابر نہیں — کوئی quote بے جوڑ ہو سکتا ہے۔",
      contextBefore: "",
      contextAfter: "",
    });
  }

  return suggestions;
}

// H) Duplicated Punctuation (Batch 1). Exact same regex as
// checkTextQuality.ts's duplicatedPunctuation check
// (/([.,!?;:،؛؟۔])\1+/g) — per instance, suggests collapsing to one.
function findDuplicatedPunctuationSuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];
  const regex = /([.,!?;:،؛؟۔])\1+/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while (count < MAX_EXAMPLES_PER_TYPE && (match = regex.exec(text)) !== null) {
    const { before, match: exact, after } = extractWithContext(text, match.index, match[0].length);
    suggestions.push({
      type: "punctuation-duplicated",
      category: "punctuation",
      severity: "low",
      originalText: exact,
      suggestedText: match[1],
      explanation: "دہرایا گیا رمزِ اوقاف — عام طور پر ٹائپنگ کی غلطی، ایک نشان کافی ہے۔",
      contextBefore: before,
      contextAfter: after,
    });
    count++;
  }
  return suggestions;
}

// I) Missing Space After Punctuation (Batch 1). Exact same (now
// extended, see checkTextQuality.ts) regex —
// /[)\]:,!?،؟۔][A-Za-z0-9\u0600-\u06FF]/g — per instance, suggests
// inserting a space right after the punctuation mark.
function findMissingSpaceSuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];
  const regex = /[)\]:,!?،؟۔][A-Za-z0-9\u0600-\u06FF]/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while (count < MAX_EXAMPLES_PER_TYPE && (match = regex.exec(text)) !== null) {
    const { before, match: exact, after } = extractWithContext(text, match.index, match[0].length);
    suggestions.push({
      type: "spacing-missing-after-punctuation",
      category: "spacing",
      severity: "low",
      originalText: exact,
      suggestedText: `${exact[0]} ${exact[1]}`,
      explanation: "رمزِ اوقاف کے بعد خالی جگہ درکار ہے۔",
      contextBefore: before,
      contextAfter: after,
    });
    count++;
  }
  return suggestions;
}

// J) Repeated Words Detection (Batch 2). Same adjacent-word comparison
// checkTextQuality.ts's repeatedWords check uses, on the same {{ }}-
// stripped text (protected classical Arabic quotations may legitimately
// repeat a word rhetorically — exempted here for the same reason).
function findRepeatedWordSuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];
  const stripped = text.replace(PRESERVE_MARKER_REGEX, (m) => " ".repeat(m.length));
  const regex = /(\S+)(\s+)\1(?!\S)/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while (count < MAX_EXAMPLES_PER_TYPE && (match = regex.exec(stripped)) !== null) {
    const { before, match: exact, after } = extractWithContext(text, match.index, match[0].length);
    suggestions.push({
      type: "typography-repeated-word",
      category: "typography",
      severity: "low",
      originalText: exact,
      suggestedText: match[1],
      explanation: "لفظ لگاتار دو مرتبہ آ گیا ہے — عموماً ٹائپنگ کی غلطی۔ اگر شاعرانہ تکرار ارادی ہے تو نظرانداز کریں۔",
      contextBefore: before,
      contextAfter: after,
    });
    count++;
  }
  return suggestions;
}

// K) Mixed Script Intelligence — ADVISORY ONLY (Batch 2). Same Latin-
// letter-run detection as checkTextQuality.ts's mixedScript check
// (/[a-zA-Z]+/g). Deliberately proposes NO replacement — suggestedText
// equals originalText verbatim, so even if this is "Accepted" and
// "Applied", applySuggestionToText's find/replace is a genuine no-op.
// This is what makes it a pure advisory rather than a correction: there
// is no way for this suggestion to ever change the document's text.
function findMixedScriptSuggestions(text: string): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];
  const stripped = text.replace(PRESERVE_MARKER_REGEX, (m) => " ".repeat(m.length));
  const regex = /[a-zA-Z]+/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while (count < MAX_EXAMPLES_PER_TYPE && (match = regex.exec(stripped)) !== null) {
    const { before, match: exact, after } = extractWithContext(text, match.index, match[0].length);
    suggestions.push({
      type: "unicode-mixed-script-advisory",
      category: "unicode",
      severity: "low",
      originalText: exact,
      suggestedText: exact, // advisory only — never proposes a change
      explanation: "Check mixed script usage — لاطینی حروف اردو/عربی متن میں شامل ہیں۔ یہ جان بوجھ کر (حوالہ، مخفف) ہو سکتا ہے۔",
      contextBefore: before,
      contextAfter: after,
    });
    count++;
  }
  return suggestions;
}

// F) Structure suggestions — reuses buildDocumentAuditReport.ts's own
// exported counters directly (countHeadingHierarchyIssues,
// countEmptyParagraphs, countLongParagraphs — the last added Batch 2)
// rather than re-implementing DocNode traversal here. Document-level
// advisories, same as numeral/punctuation — none of these has a single
// "original text span" to highlight the way a Unicode/spacing/typography
// issue does.
function findStructureSuggestions(doc: DocNode): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];

  if (countHeadingHierarchyIssues(doc) > 0) {
    suggestions.push({
      type: "structure-heading-hierarchy",
      category: "structure",
      severity: "medium",
      originalText: "عنوانات کی ترتیب میں سطح چھوٹی ہے یا H1 سے شروع نہیں ہوتی",
      suggestedText: "عنوانات کو H1 → H2 → H3 ترتیب سے استعمال کریں",
      explanation: "دستاویز کی عنوان کی سطحیں ترتیب سے نہیں ہیں۔",
      contextBefore: "",
      contextAfter: "",
    });
  }

  if (countEmptyParagraphs(doc) > 0) {
    suggestions.push({
      type: "structure-empty-paragraphs",
      category: "structure",
      severity: "low",
      originalText: "خالی پیراگراف موجود ہیں",
      suggestedText: "غیر ضروری خالی پیراگراف ہٹا دیں",
      explanation: "دستاویز میں خالی پیراگراف موجود ہیں، غالباً غیر ارادی طور پر۔",
      contextBefore: "",
      contextAfter: "",
    });
  }

  if (countLongParagraphs(doc) > 0) {
    suggestions.push({
      type: "structure-long-paragraphs",
      category: "structure",
      severity: "low",
      originalText: "کچھ پیراگراف بہت طویل ہیں",
      suggestedText: "طویل پیراگراف کو چھوٹے حصوں میں تقسیم کریں",
      explanation: "طویل پیراگراف پڑھنے میں مشکل بنا سکتے ہیں۔",
      contextBefore: "",
      contextAfter: "",
    });
  }

  return suggestions;
}

/**
 * Pure — generates preview-only suggestions from a document. Never
 * modifies anything; there is no "apply" path here at all yet.
 */
export function generateDocumentSuggestions(doc: DocNode): DocumentSuggestion[] {
  const text = getBlockTexts(doc).join("\n");
  const structureSuggestions = findStructureSuggestions(doc);

  if (!text.trim()) return structureSuggestions;

  return [
    ...findUnicodeSuggestions(text),
    ...findMixedScriptSuggestions(text),
    ...findTypographySuggestions(text),
    ...findRepeatedWordSuggestions(text),
    ...findSpacingSuggestions(text),
    ...findMissingSpaceSuggestions(text),
    ...findNumeralSuggestions(text),
    ...findPunctuationSuggestions(text),
    ...findQuoteSuggestions(text),
    ...findDuplicatedPunctuationSuggestions(text),
    ...structureSuggestions,
  ];
}
