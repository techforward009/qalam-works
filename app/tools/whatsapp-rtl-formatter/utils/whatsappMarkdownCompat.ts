/**
 * convertMarkdownForWhatsApp
 *
 * Converts ChatGPT / GitHub Markdown bold syntax to WhatsApp-native bold
 * BEFORE the bidi formatter runs.  Called only by the standalone WhatsApp
 * RTL Formatter tool — NOT by formatForWhatsAppRTL() itself, which keeps its
 * no-visible-content-mutation contract intact for all other callers.
 *
 * Conversion:   **text** → *text*
 *
 * Safety constraints (all enforced by the regex):
 *   - Only non-nested pairs: the body must contain no `*` and no newline.
 *   - Does NOT touch existing WhatsApp-native *bold*, _italic_, ~strike~.
 *   - Does NOT touch triple-asterisk constructs (***text***).
 *   - Does NOT convert `-` bullets to `*` bullets.
 *   - Preserves blank lines, paragraphs, bullet markers, numbering,
 *     punctuation, fractions (1/4), URLs, emails.
 *   - Preserves all visible characters inside the markers exactly.
 *   - Multiple bold spans on a single line are all converted.
 *   - Idempotent: running twice produces the same result (** → * once,
 *     then * is already WhatsApp-native and the regex does not match it).
 */
export function convertMarkdownForWhatsApp(text: string): string {
  if (typeof text !== "string" || !text.includes("**")) return text;

  // Match paired ** where:
  //   - Not preceded or followed by a third *  (avoids ***text***)
  //   - Body contains no * and no newline (avoids nesting and multi-line pairs)
  //   - Body is non-empty
  const BOLD_RE = /(?<!\*)\*\*([^*\n]+?)\*\*(?!\*)/g;
  return text.replace(BOLD_RE, "*$1*");
}
