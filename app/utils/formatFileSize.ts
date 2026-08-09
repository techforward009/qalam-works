/**
 * Formats a byte count as a human-readable size string (B/KB/MB),
 * avoiding unnecessary decimal places for whole numbers.
 *
 * Shared by Document Cleaner (app/actions/documentAction.ts) and the PDF
 * Export summary (DocumentStudioEditor.tsx) — one implementation instead
 * of two copies.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${trimTrailingZero(bytes / 1024)} KB`;
  return `${trimTrailingZero(bytes / (1024 * 1024))} MB`;
}

// "2.0" -> "2", "2.4" stays "2.4" — avoids showing a decimal that carries
// no information (per the PDF export summary's explicit formatting rule).
function trimTrailingZero(value: number): string {
  const rounded = value < 10 ? value.toFixed(1) : value.toFixed(0);
  return rounded.replace(/\.0$/, "");
}
