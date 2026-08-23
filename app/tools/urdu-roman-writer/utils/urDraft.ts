/**
 * Qalam Urdu → Roman Writer — local draft persistence (Phase 19A.25)
 *
 * Separate key from the Roman Urdu Writer so each tool has its own draft.
 * Same pattern as writerDraft.ts in the Roman Urdu Writer.
 */

import type { UrduRomanStyle } from "./urduToRoman";

export const UR_DRAFT_KEY     = "qalam-urdu-roman-draft";
export const UR_DRAFT_VERSION = 1 as const;

export interface UrDraftV1 {
  version: typeof UR_DRAFT_VERSION;
  urduInput: string;
  style: UrduRomanStyle;
  updatedAt?: number;
}

function isUrDraftV1(value: unknown): value is UrDraftV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.urduInput === "string" &&
    (v.style === "simple" || v.style === "academic" || v.style === "chat")
  );
}

export function loadUrDraft(): UrDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UR_DRAFT_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isUrDraftV1(parsed)) {
      try { localStorage.removeItem(UR_DRAFT_KEY); } catch { /* ignore */ }
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveUrDraft(
  draft: Omit<UrDraftV1, "version" | "updatedAt">,
): { ok: boolean } {
  if (typeof window === "undefined") return { ok: false };
  try {
    localStorage.setItem(
      UR_DRAFT_KEY,
      JSON.stringify({ version: UR_DRAFT_VERSION, ...draft, updatedAt: Date.now() }),
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function clearUrDraft(): { ok: boolean } {
  if (typeof window === "undefined") return { ok: false };
  try {
    localStorage.removeItem(UR_DRAFT_KEY);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
