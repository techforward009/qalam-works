/**
 * Presentation-layer formatter for QAIssue messages.
 * Maps QAIssue codes to locale-appropriate messages.
 * Does NOT change QA logic, codes, or severity — those live in translationQA.ts.
 *
 * Numeric details are extracted from the English message via regex so they
 * are preserved correctly in Urdu output.
 */

import type { QAIssue } from "./translationQA";

/** Extract content inside brackets, e.g. "[12, 5]" → "12, 5" */
function extractBracket(msg: string): string {
  const m = msg.match(/\[([^\]]*)\]/);
  return m ? m[1] : "";
}

function localiseQAMessage(issue: QAIssue): string {
  const m = issue.message;
  switch (issue.code) {
    case "FINAL_TARGET_EMPTY":
      return "سیگمنٹ حتمی ہے لیکن ہدف متن خالی ہے";

    case "PERCENTAGE_MISMATCH": {
      const src = extractBracket(m.split("target")[0]);
      const tgt = extractBracket(m.split("target has")[1] ?? "");
      return `فیصد کی قدر مختلف ہے: ماخذ [${src}]، ہدف [${tgt}]`;
    }

    case "REFERENCE_MISMATCH": {
      const src = extractBracket(m.split("target")[0]);
      const tgt = extractBracket(m.split("target has")[1] ?? "");
      return `حوالہ نمبر مختلف ہے: ماخذ ${src}، ہدف ${tgt}`;
    }

    case "NUMBER_MISMATCH": {
      const src = extractBracket(m.split("target")[0]);
      const tgt = extractBracket(m.split("target")[1] ?? "");
      return `اعداد مختلف ہیں: ماخذ [${src}]، ہدف [${tgt}]`;
    }

    case "BRACKET_UNBALANCED":
      return "ہدف متن میں قوسین کا توازن درست نہیں";

    case "BRACKET_COUNT_DIFFERS": {
      const nums = m.match(/\d+/g) ?? [];
      return `قوسین کے جوڑوں کی تعداد مختلف ہے: ماخذ ${nums[0] ?? "—"}، ہدف ${nums[1] ?? "—"}`;
    }

    case "QUOTE_UNBALANCED":
      return "ہدف متن میں اقتباس کے نشانات کا توازن درست نہیں";

    case "QUOTE_COUNT_DIFFERS": {
      const nums = m.match(/\d+/g) ?? [];
      return `اقتباس کے جوڑوں کی تعداد مختلف ہے: ماخذ ${nums[0] ?? "—"}، ہدف ${nums[1] ?? "—"}`;
    }

    case "SOURCE_TARGET_IDENTICAL":
      return "ماخذ اور ہدف ایک جیسے ہیں — جانچیں کہ ترجمہ جان بوجھ کر ہے";

    default:
      return issue.message;
  }
}

/** Returns a localised QAIssue message when isUr=true, otherwise the original. */
export function formatQAMessage(issue: QAIssue, isUr?: boolean): string {
  if (!isUr) return issue.message;
  return localiseQAMessage(issue);
}
