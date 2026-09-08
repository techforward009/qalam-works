/**
 * Document title persistence — UI chrome only.
 * Intentionally separate from TipTap JSON / documentSettings so Phase 1
 * does not change the document schema or PDF/DOCX header behavior.
 */

export const TITLE_STORAGE_KEY = "qalam-document-studio-title";
export const TITLE_MAX_LENGTH = 120;

export function defaultDocumentTitle(isUr: boolean): string {
  return isUr ? "بلا عنوان دستاویز" : "Untitled document";
}

export function sanitizeDocumentTitle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, TITLE_MAX_LENGTH);
}

export function loadDocumentTitle(isUr: boolean): string {
  try {
    if (typeof window === "undefined") return defaultDocumentTitle(isUr);
    const saved = window.localStorage.getItem(TITLE_STORAGE_KEY);
    if (saved == null) return defaultDocumentTitle(isUr);
    return sanitizeDocumentTitle(saved) || defaultDocumentTitle(isUr);
  } catch {
    return defaultDocumentTitle(isUr);
  }
}

export function saveDocumentTitle(title: string): void {
  try {
    if (typeof window === "undefined") return;
    const cleaned = sanitizeDocumentTitle(title);
    if (!cleaned) {
      window.localStorage.removeItem(TITLE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(TITLE_STORAGE_KEY, cleaned);
  } catch {
    // Quota / private-mode — editor save-status handles local failures.
  }
}
