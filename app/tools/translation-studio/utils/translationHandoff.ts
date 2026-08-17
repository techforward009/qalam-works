/**
 * Translation Studio → Document Studio handoff.
 *
 * Mechanism: the canonical export model is converted to a TipTap DocNode
 * and written to the Document Studio's existing localStorage draft key.
 * Document Studio already reads that key on mount, so it opens with the
 * translated content automatically — no separate consumption hook needed.
 *
 * A sessionStorage sentinel key is used to mark that a handoff just
 * occurred; Document Studio reads it once and removes it so stale content
 * cannot be accidentally re-imported on subsequent reloads.
 *
 * Fidelity: target text is passed verbatim. No normalization, no source
 * fallback, no language conversion.
 */

import type { TranslationExportModel, TranslationExportBlock } from "../utils/translationExport";

export const HANDOFF_FORMAT = "qalam-translation-document-handoff";
export const HANDOFF_VERSION = 1;

export interface TranslationDocumentHandoff {
  format: typeof HANDOFF_FORMAT;
  version: typeof HANDOFF_VERSION;
  title: string;
  targetLanguage?: string;
  blocks: Array<{ id: string; text: string; direction: "rtl" | "ltr" }>;
}

const HANDOFF_SS_KEY = "qalam-translation-handoff";

export function buildHandoff(model: TranslationExportModel): TranslationDocumentHandoff {
  return {
    format: HANDOFF_FORMAT,
    version: HANDOFF_VERSION,
    title: model.title,
    targetLanguage: model.targetLanguage,
    blocks: model.blocks.map(b => ({ id: b.id, text: b.text, direction: b.direction })),
  };
}

function handoffToDocNode(handoff: TranslationDocumentHandoff): object {
  return {
    type: "doc",
    content: handoff.blocks.map(block => ({
      type: "paragraph",
      attrs: { dir: block.direction },
      content: block.text.length > 0 ? [{ type: "text", text: block.text }] : [],
    })),
  };
}

/**
 * Writes the versioned handoff payload to sessionStorage only.
 * Does NOT touch the Document Studio localStorage draft key.
 */
export function writeHandoff(handoff: TranslationDocumentHandoff): boolean {
  try {
    sessionStorage.setItem(HANDOFF_SS_KEY, JSON.stringify(handoff));
    return true;
  } catch {
    return false;
  }
}

/**
 * Called by Document Studio on initialization.
 * Reads, validates, and removes the pending sessionStorage handoff — then
 * converts it to a DocNode for Document Studio to load.
 *
 * Returns null (and removes the key) if no handoff or handoff is invalid.
 * Never touches the existing localStorage draft.
 */
export function consumeHandoff(): object | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_SS_KEY);
    sessionStorage.removeItem(HANDOFF_SS_KEY); // always remove, even on invalid
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidHandoff(parsed)) return null;
    return handoffToDocNode(parsed);
  } catch {
    return null;
  }
}

// consumeHandoffSentinel kept for backward-compat; no longer writes sentinel separately
export function consumeHandoffSentinel(): boolean {
  return false;
}

/** Validates a handoff payload — returns false for wrong format/version. */
export function isValidHandoff(raw: unknown): raw is TranslationDocumentHandoff {
  if (!raw || typeof raw !== "object") return false;
  const h = raw as Record<string, unknown>;
  if (h.format !== HANDOFF_FORMAT) return false;
  if (h.version !== HANDOFF_VERSION) return false;
  if (!Array.isArray(h.blocks)) return false;
  return true;
}
