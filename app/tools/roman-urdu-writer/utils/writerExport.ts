/**
 * Urdu Writer export helpers — Phase 19A.3a / 19A.3b / 19A.3c.
 *
 * Transport only. Never normalizes, standardizes, or re-runs the engine.
 * Copy uses the raw string; TXT prepends UTF-8 BOM (Qalam convention).
 * WhatsApp Ready reuses the existing pure formatter — no duplicate BiDi logic.
 * Document Studio reuses the canonical Translation Studio sessionStorage handoff.
 */

import { formatForWhatsAppRTL } from "../../../utils/whatsappRtlFormatter";
import {
  HANDOFF_FORMAT,
  HANDOFF_VERSION,
  writeHandoff,
  type TranslationDocumentHandoff,
} from "../../translation-studio/utils/translationHandoff";

export type WriterExportMode = "roman" | "urdu" | "urdu-roman";

/** Canonical TXT filename for this tool. */
export const WRITER_TXT_FILENAME = "qalam-urdu-writer.txt";

/** UTF-8 BOM — same convention as Document Studio / Document Cleaner / Translation Studio. */
export const UTF8_BOM = "\uFEFF";

/** Existing Document Studio route — do not invent a new path. */
export const DOCUMENT_STUDIO_ROUTE = "/tools/document-studio";

/** Canonical sessionStorage key used by consumeHandoff(). */
export const WRITER_HANDOFF_STORAGE_KEY = "qalam-translation-handoff";

/**
 * Active Urdu document for Copy/TXT/WhatsApp/Document Studio:
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

/**
 * WhatsApp transport formatting of the active Urdu text.
 * Delegates entirely to the frozen WhatsApp RTL formatter.
 */
export function formatActiveTextForWhatsApp(text: string): string {
  return formatForWhatsAppRTL(text);
}

/**
 * Canonical Document Studio handoff envelope for Writer text.
 * Same format/version/key as Translation Studio. Line breaks become
 * successive paragraph blocks so Studio reconstructs them as lines.
 * Block ids are namespaced so the source is identifiable without a schema change.
 */
export function buildWriterHandoff(text: string): TranslationDocumentHandoff {
  const lines = text.split(/\r?\n/);
  return {
    format: HANDOFF_FORMAT,
    version: HANDOFF_VERSION,
    title: "Qalam Urdu Writer",
    targetLanguage: "ur",
    blocks: lines.map((line, i) => ({
      id: `urdu-writer-${i}`,
      text: line,
      direction: "rtl" as const,
    })),
  };
}

/** Reconstruct active text from a Writer handoff payload (tests / fidelity). */
export function handoffBlocksToText(handoff: TranslationDocumentHandoff): string {
  return handoff.blocks.map((b) => b.text).join("\n");
}

/** Write canonical payload. Returns false if sessionStorage is unavailable. */
export function writeWriterHandoff(text: string): boolean {
  return writeHandoff(buildWriterHandoff(text));
}
