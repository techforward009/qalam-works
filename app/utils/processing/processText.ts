import type { ProcessTextResult, ProcessingLanguage, ResolvedLanguage } from "./types";
import { directionForLanguage, resolveProcessingLanguage } from "./detectLanguage";
import { neutralCleanup } from "./neutralCleanup";
import { englishCleanup } from "./englishCleanup";
import { arabicSafeCleanup } from "./arabicSafeCleanup";
import { urduNormalize } from "./urduNormalize";
import {
  analyzeScriptContext,
  allowUrduNormalizationInAuto,
  type ScriptContext,
} from "./scriptContext";

function mergeMaps(...maps: Map<string, number>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of maps) {
    for (const [k, v] of m) out.set(k, (out.get(k) || 0) + v);
  }
  return out;
}

function applyUrdu(input: string) {
  return urduNormalize(input);
}

function applyEnglish(input: string) {
  const n = neutralCleanup(input);
  const e = englishCleanup(n.text);
  return {
    text: e.text,
    arabicNormalizations: 0,
    spacingFixes: n.spacingFixes + e.spacingFixes,
    punctuationFixes: e.punctuationFixes,
    corrections: mergeMaps(n.corrections, e.corrections),
  };
}

function applyRtlNeutral(input: string) {
  const n = neutralCleanup(input);
  const a = arabicSafeCleanup(n.text);
  return {
    text: a.text,
    arabicNormalizations: 0,
    spacingFixes: n.spacingFixes + a.spacingFixes,
    punctuationFixes: a.punctuationFixes,
    corrections: mergeMaps(n.corrections, a.corrections),
  };
}

function segmentScriptHint(text: string): "latin" | "arabic" | "neutral" {
  const ctx = analyzeScriptContext(text);
  if (ctx.hasArabicScript && !ctx.hasLatin) return "arabic";
  if (ctx.hasLatin && !ctx.hasArabicScript) return "latin";
  if (ctx.hasArabicScript) return "arabic";
  if (ctx.hasLatin) return "latin";
  return "neutral";
}

/**
 * Auto mixed path: process line-by-line (and respect document context).
 * - Pure Arabic-script documents → rtl-neutral (never silent Urdu maps)
 * - Pure Latin → English cleanup
 * - Mixed Latin + Arabic → English on Latin lines; Urdu maps on Arabic lines
 *   unless protected religious/classical Arabic
 */
function processAuto(
  input: string,
  documentContext?: ScriptContext
): {
  output: string;
  arabicNormalizations: number;
  spacingFixes: number;
  punctuationFixes: number;
  corrections: Map<string, number>;
  resolvedLanguage: ResolvedLanguage;
} {
  const local = analyzeScriptContext(input);
  const doc = documentContext ?? local;

  // Effective document signals (node may be a single paragraph inside a mixed doc)
  const hasLatin = doc.hasLatin || local.hasLatin;
  const hasArabic = doc.hasArabicScript || local.hasArabicScript;

  // Pure Latin
  if (!hasArabic && hasLatin) {
    const e = applyEnglish(input);
    return { ...e, output: e.text, resolvedLanguage: "en" };
  }

  // Pure Arabic-script (no Latin anywhere in context) → always safe neutral
  if (hasArabic && !hasLatin) {
    const n = applyRtlNeutral(input);
    return { ...n, output: n.text, resolvedLanguage: "rtl-neutral" };
  }

  // Mixed document context: process by lines
  if (hasArabic && hasLatin) {
    const lines = input.split("\n");
    let arabicNormalizations = 0;
    let spacingFixes = 0;
    let punctuationFixes = 0;
    let corrections = new Map<string, number>();
    let appliedUrdu = false;
    let appliedEn = false;

    const outLines = lines.map((line) => {
      if (line.length === 0) return line;
      const hint = segmentScriptHint(line);

      if (hint === "latin") {
        const e = applyEnglish(line);
        spacingFixes += e.spacingFixes;
        punctuationFixes += e.punctuationFixes;
        corrections = mergeMaps(corrections, e.corrections);
        appliedEn = true;
        return e.text;
      }

      if (hint === "arabic" || analyzeScriptContext(line).isMixed) {
        if (allowUrduNormalizationInAuto(line, doc)) {
          const u = applyUrdu(line);
          arabicNormalizations += u.arabicNormalizations;
          spacingFixes += u.spacingFixes;
          punctuationFixes += u.punctuationFixes;
          corrections = mergeMaps(corrections, u.corrections);
          appliedUrdu = true;
          return u.text;
        }
        const n = applyRtlNeutral(line);
        spacingFixes += n.spacingFixes;
        punctuationFixes += n.punctuationFixes;
        corrections = mergeMaps(corrections, n.corrections);
        return n.text;
      }

      const n = applyRtlNeutral(line);
      spacingFixes += n.spacingFixes;
      punctuationFixes += n.punctuationFixes;
      corrections = mergeMaps(corrections, n.corrections);
      return n.text;
    });

    // Report: prefer ur when Urdu maps ran; else en if only English work; else rtl-neutral
    let resolvedLanguage: ResolvedLanguage = "rtl-neutral";
    if (appliedUrdu) resolvedLanguage = "ur";
    else if (appliedEn && !hasArabic) resolvedLanguage = "en";
    else if (appliedEn) resolvedLanguage = "rtl-neutral";

    return {
      output: outLines.join("\n"),
      arabicNormalizations,
      spacingFixes,
      punctuationFixes,
      corrections,
      resolvedLanguage,
    };
  }

  // Digits/punct only
  const n = applyRtlNeutral(input);
  return { ...n, output: n.text, resolvedLanguage: "en" };
}

/**
 * Language-aware text processing entry point.
 * Explicit mode overrides auto-detection.
 *
 * @param documentContext Optional full-document script signals so a single
 *   TipTap paragraph can inherit mixed-doc Auto behavior (Studio).
 */
export function processText(
  input: string,
  mode: ProcessingLanguage = "auto",
  documentContext?: ScriptContext
): ProcessTextResult {
  if (typeof input !== "string") {
    return {
      output: "",
      badges: [],
      summary: { totalCorrections: 0, arabicNormalizations: 0, spacingFixes: 0, punctuationFixes: 0 },
      corrections: [],
      resolvedLanguage: "en",
      direction: "ltr",
    };
  }

  if (mode === "auto") {
    const result = processAuto(input, documentContext);
    const direction = directionForLanguage(result.resolvedLanguage);
    const totalCorrections =
      result.arabicNormalizations + result.spacingFixes + result.punctuationFixes;
    const badges: string[] = [];
    if (totalCorrections === 0) {
      badges.push("✓ Text Already Standardized");
    } else {
      if (result.arabicNormalizations > 0) badges.push("✓ Arabic Letters Normalized");
      if (result.spacingFixes > 0) badges.push("✓ Extra Spaces Removed");
      if (result.punctuationFixes > 0) badges.push("✓ Punctuation Corrected");
      if (result.resolvedLanguage === "ur") badges.push("✓ Mixed Auto (Urdu-context segments)");
      else if (result.resolvedLanguage === "en") badges.push("✓ English-safe cleanup");
      else badges.push("✓ Safe RTL cleanup (no language-specific maps)");
    }
    return {
      output: result.output,
      badges,
      summary: {
        totalCorrections,
        arabicNormalizations: result.arabicNormalizations,
        spacingFixes: result.spacingFixes,
        punctuationFixes: result.punctuationFixes,
      },
      corrections: Array.from(result.corrections.entries()).map(([label, count]) => ({
        label,
        count,
      })),
      resolvedLanguage: result.resolvedLanguage,
      direction,
    };
  }

  const resolved: ResolvedLanguage = resolveProcessingLanguage(mode, input);
  const direction = directionForLanguage(resolved);

  let output = input;
  let arabicNormalizations = 0;
  let spacingFixes = 0;
  let punctuationFixes = 0;
  let corrections = new Map<string, number>();

  if (resolved === "ur") {
    const ur = applyUrdu(input);
    output = ur.text;
    arabicNormalizations = ur.arabicNormalizations;
    spacingFixes = ur.spacingFixes;
    punctuationFixes = ur.punctuationFixes;
    corrections = ur.corrections;
  } else if (resolved === "en") {
    const e = applyEnglish(input);
    output = e.text;
    spacingFixes = e.spacingFixes;
    punctuationFixes = e.punctuationFixes;
    corrections = e.corrections;
  } else {
    const n = applyRtlNeutral(input);
    output = n.text;
    spacingFixes = n.spacingFixes;
    punctuationFixes = n.punctuationFixes;
    corrections = n.corrections;
  }

  const totalCorrections = arabicNormalizations + spacingFixes + punctuationFixes;
  const badges: string[] = [];
  if (totalCorrections === 0) {
    badges.push("✓ Text Already Standardized");
  } else {
    if (arabicNormalizations > 0) badges.push("✓ Arabic Letters Normalized");
    if (spacingFixes > 0) badges.push("✓ Extra Spaces Removed");
    if (punctuationFixes > 0) badges.push("✓ Punctuation Corrected");
    if (resolved === "ur") badges.push("✓ RTL Optimized");
    else if (resolved === "en") badges.push("✓ English-safe cleanup");
    else if (resolved === "rtl-neutral") badges.push("✓ Safe RTL cleanup (no language-specific maps)");
    else badges.push("✓ Arabic-safe cleanup");
  }

  return {
    output,
    badges,
    summary: { totalCorrections, arabicNormalizations, spacingFixes, punctuationFixes },
    corrections: Array.from(corrections.entries()).map(([label, count]) => ({ label, count })),
    resolvedLanguage: resolved,
    direction,
  };
}
