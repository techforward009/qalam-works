/**
 * Urdu Writer export helpers — Phase 19A.3a.
 *
 * Transport only. Never normalizes, standardizes, or re-runs the engine.
 * Copy uses the raw string; TXT prepends UTF-8 BOM (Qalam convention).
 */

export type WriterExportMode = "roman" | "urdu";

/** Canonical TXT filename for this tool. */
export const WRITER_TXT_FILENAME = "qalam-urdu-writer.txt";

/** UTF-8 BOM — same convention as Document Studio / Document Cleaner / Translation Studio. */
export const UTF8_BOM = "\uFEFF";

/**
 * Active Urdu document for Copy/TXT:
 *   Roman mode → current visible finalOutput (choices/sentence alt applied)
 *   Urdu mode  → current urduInput (manual edits, no conversion)
 */
export function getActiveUrduText(
  mode: WriterExportMode,
  finalOutput: string,
  urduInput: string
): string {
  return mode === "urdu" ? urduInput : finalOutput;
}

/** Empty or whitespace-only text is not exportable. */
export function hasExportableUrduText(text: string): boolean {
  return text.trim().length > 0;
}

/** Exact text plus BOM. No extra newline, no mutation of the payload. */
export function buildWriterTxtContents(text: string): string {
  return UTF8_BOM + text;
}

/**
 * Trigger a UTF-8 BOM TXT download. Caller must ensure text is exportable.
 */
export function downloadWriterTxt(text: string): void {
  const blob = new Blob([buildWriterTxtContents(text)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = WRITER_TXT_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
