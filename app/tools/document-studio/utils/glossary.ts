// User-defined Terminology Glossary MVP (2026-08-09). Follows the exact
// same localStorage pattern already established in
// DocumentStudioEditor.tsx for draft autosave (a plain key → JSON.stringify/
// parse round-trip, guarded by `typeof window === "undefined"` for SSR
// safety) — no new persistence mechanism introduced.
//
// CRUD functions are pure (operate on and return a plain array, never
// touch localStorage themselves) so they're fully testable in isolation;
// loadGlossary()/saveGlossary() are the only functions that touch
// localStorage, kept separate and thin.

export interface GlossaryEntry {
  id: string;
  incorrectTerm: string;
  correctTerm: string;
  note?: string;
}

const GLOSSARY_STORAGE_KEY = "qalam-terminology-glossary";

function generateEntryId(): string {
  return `glossary-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Pure — returns an error message if the given term pair is invalid,
 * or null if it's acceptable. Both terms must be non-empty after
 * trimming, and they must not be identical (a term "corrected" to
 * itself is not a meaningful rule).
 */
export function validateGlossaryEntry(incorrectTerm: string, correctTerm: string): string | null {
  const incorrect = incorrectTerm.trim();
  const correct = correctTerm.trim();
  if (!incorrect) return "غلط اصطلاح خالی نہیں ہو سکتی";
  if (!correct) return "درست اصطلاح خالی نہیں ہو سکتی";
  if (incorrect === correct) return "غلط اور درست اصطلاح ایک جیسی نہیں ہو سکتی";
  return null;
}

/**
 * Pure — adds a new entry to `entries`. Duplicate handling: if an entry
 * with the same `incorrectTerm` already exists, it is UPDATED in place
 * (its correctTerm/note replaced) rather than adding a second,
 * conflicting rule for the same term — two different "correct" answers
 * for the same incorrect term would make suggestion generation
 * ambiguous, so this keeps exactly one rule per incorrect term.
 */
export function addGlossaryEntry(
  entries: GlossaryEntry[],
  incorrectTerm: string,
  correctTerm: string,
  note?: string
): { entries: GlossaryEntry[]; error: string | null } {
  const error = validateGlossaryEntry(incorrectTerm, correctTerm);
  if (error) return { entries, error };

  const incorrect = incorrectTerm.trim();
  const correct = correctTerm.trim();

  const existingIndex = entries.findIndex((e) => e.incorrectTerm === incorrect);
  if (existingIndex !== -1) {
    const updated = [...entries];
    updated[existingIndex] = { ...updated[existingIndex], correctTerm: correct, note };
    return { entries: updated, error: null };
  }

  return {
    entries: [...entries, { id: generateEntryId(), incorrectTerm: incorrect, correctTerm: correct, note }],
    error: null,
  };
}

/**
 * Pure — updates an existing entry by id. Rejects the update (with an
 * error, entries unchanged) if another entry already claims the same
 * incorrectTerm — same one-rule-per-term guarantee as addGlossaryEntry.
 */
export function updateGlossaryEntry(
  entries: GlossaryEntry[],
  id: string,
  incorrectTerm: string,
  correctTerm: string,
  note?: string
): { entries: GlossaryEntry[]; error: string | null } {
  const error = validateGlossaryEntry(incorrectTerm, correctTerm);
  if (error) return { entries, error };

  const incorrect = incorrectTerm.trim();
  const correct = correctTerm.trim();

  const conflict = entries.some((e) => e.id !== id && e.incorrectTerm === incorrect);
  if (conflict) {
    return { entries, error: "یہ اصطلاح پہلے سے کسی اور اندراج میں موجود ہے" };
  }

  const updated = entries.map((e) => (e.id === id ? { ...e, incorrectTerm: incorrect, correctTerm: correct, note } : e));
  return { entries: updated, error: null };
}

/** Pure — removes the entry with the given id, if present. */
export function removeGlossaryEntry(entries: GlossaryEntry[], id: string): GlossaryEntry[] {
  return entries.filter((e) => e.id !== id);
}

/** Loads the glossary from localStorage. Returns an empty array on any failure (missing key, corrupt JSON, SSR) rather than throwing. */
export function loadGlossary(): GlossaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(GLOSSARY_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is GlossaryEntry =>
        !!e && typeof e === "object" && typeof (e as GlossaryEntry).id === "string" &&
        typeof (e as GlossaryEntry).incorrectTerm === "string" && typeof (e as GlossaryEntry).correctTerm === "string"
    );
  } catch (err) {
    console.error("Failed to parse glossary from localStorage:", err);
    return [];
  }
}

/** Saves the glossary to localStorage. Silently logs (never throws) on failure, matching the existing draft-autosave error-handling convention. */
export function saveGlossary(entries: GlossaryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GLOSSARY_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("Failed to save glossary to localStorage:", err);
  }
}

/** Pure — serializes the glossary for the JSON export/download flow. */
export function exportGlossaryToJson(entries: GlossaryEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

/**
 * Pure — parses an imported JSON string into valid glossary entries.
 * Invalid or malformed individual entries are silently skipped rather
 * than rejecting the whole import; a completely invalid file (not JSON,
 * or not an array) returns an empty list with an error message.
 * Imported entries missing an `id` get a freshly generated one.
 */
export function importGlossaryFromJson(json: string): { entries: GlossaryEntry[]; error: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { entries: [], error: "فائل درست JSON نہیں ہے" };
  }

  if (!Array.isArray(parsed)) {
    return { entries: [], error: "فائل میں glossary اندراجات کی فہرست متوقع تھی" };
  }

  const valid: GlossaryEntry[] = [];
  for (const item of parsed) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as GlossaryEntry).incorrectTerm === "string" &&
      typeof (item as GlossaryEntry).correctTerm === "string"
    ) {
      const entry = item as GlossaryEntry;
      if (!validateGlossaryEntry(entry.incorrectTerm, entry.correctTerm)) {
        valid.push({
          id: typeof entry.id === "string" && entry.id ? entry.id : generateEntryId(),
          incorrectTerm: entry.incorrectTerm.trim(),
          correctTerm: entry.correctTerm.trim(),
          note: typeof entry.note === "string" ? entry.note : undefined,
        });
      }
    }
  }

  return { entries: valid, error: null };
}
