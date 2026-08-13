import type { ProcessTextResult, ProcessingLanguage, ResolvedLanguage } from "./types";
import { directionForLanguage, resolveProcessingLanguage } from "./detectLanguage";
import { neutralCleanup } from "./neutralCleanup";
import { englishCleanup } from "./englishCleanup";
import { arabicSafeCleanup } from "./arabicSafeCleanup";
import { urduNormalize } from "./urduNormalize";

function mergeMaps(...maps: Map<string, number>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of maps) {
    for (const [k, v] of m) out.set(k, (out.get(k) || 0) + v);
  }
  return out;
}

/**
 * Language-aware text processing entry point.
 * Explicit mode overrides auto-detection.
 */
export function processText(
  input: string,
  mode: ProcessingLanguage = "ur"
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

  const resolved: ResolvedLanguage = resolveProcessingLanguage(mode, input);
  const direction = directionForLanguage(resolved);

  let output = input;
  let arabicNormalizations = 0;
  let spacingFixes = 0;
  let punctuationFixes = 0;
  let corrections = new Map<string, number>();

  if (resolved === "ur") {
    const ur = urduNormalize(input);
    output = ur.text;
    arabicNormalizations = ur.arabicNormalizations;
    spacingFixes = ur.spacingFixes;
    punctuationFixes = ur.punctuationFixes;
    corrections = ur.corrections;
  } else if (resolved === "en") {
    const n = neutralCleanup(input);
    const e = englishCleanup(n.text);
    output = e.text;
    spacingFixes = n.spacingFixes + e.spacingFixes;
    punctuationFixes = e.punctuationFixes;
    corrections = mergeMaps(n.corrections, e.corrections);
  } else {
    // "ar" and "rtl-neutral": neutral + Arabic-safe spacing only — never Urdu letter maps
    const n = neutralCleanup(input);
    const a = arabicSafeCleanup(n.text);
    output = a.text;
    spacingFixes = n.spacingFixes + a.spacingFixes;
    punctuationFixes = a.punctuationFixes;
    corrections = mergeMaps(n.corrections, a.corrections);
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
