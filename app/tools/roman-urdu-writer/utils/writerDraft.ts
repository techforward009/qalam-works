/** Qalam Urdu Writer — local draft persistence (19A.4e) */
export const WRITER_DRAFT_KEY = "qalam-urdu-writer-draft";
export const WRITER_DRAFT_VERSION = 1 as const;
export type WriterDraftMode = "roman" | "urdu";
export interface WriterDraftV1 {
  version: typeof WRITER_DRAFT_VERSION;
  romanInput: string;
  urduInput: string;
  mode: WriterDraftMode;
  updatedAt?: number;
}
export function isWriterDraftV1(value: unknown): value is WriterDraftV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.romanInput === "string" &&
    typeof v.urduInput === "string" &&
    (v.mode === "roman" || v.mode === "urdu")
  );
}
export function loadWriterDraft(): WriterDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WRITER_DRAFT_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isWriterDraftV1(parsed)) {
      try { localStorage.removeItem(WRITER_DRAFT_KEY); } catch { /* ignore */ }
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
export function saveWriterDraft(
  draft: Omit<WriterDraftV1, "version" | "updatedAt">,
): { ok: boolean } {
  if (typeof window === "undefined") return { ok: false };
  try {
    localStorage.setItem(
      WRITER_DRAFT_KEY,
      JSON.stringify({ version: WRITER_DRAFT_VERSION, ...draft, updatedAt: Date.now() }),
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
export function clearWriterDraft(): { ok: boolean } {
  if (typeof window === "undefined") return { ok: false };
  try {
    localStorage.removeItem(WRITER_DRAFT_KEY);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
