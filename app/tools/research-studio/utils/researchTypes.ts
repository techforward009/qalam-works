/**
 * Research Studio — core types and strict parsing.
 * No text normalization, no source fallback, exact Unicode preservation.
 */

// ── Note type ─────────────────────────────────────────────────────────────────

export type ResearchNoteType = "excerpt" | "note" | "question";

export interface ResearchNote {
  id: string;
  order: number;
  text: string;           // verbatim — never normalized
  sourceId?: string;      // optional link to a ResearchSource
  pageOrLocation?: string;
  noteType: ResearchNoteType;
  createdAt: string;
  // "selected" deliberately omitted — selection is transient workspace UI state
}

// ── Source type ───────────────────────────────────────────────────────────────

export type ResearchSourceType = "book" | "article" | "website" | "other";

export interface ResearchSource {
  id: string;
  type: ResearchSourceType;
  title: string;
  author: string;
  year?: string;
  url?: string;
  publication?: string;   // journal, publisher, or outlet
  location?: string;      // city for books; volume/issue for journals
  notes?: string;         // user annotation about this source
}

// ── Project ───────────────────────────────────────────────────────────────────

export interface ResearchProject {
  schemaVersion: 1;
  id: string;
  title: string;
  question: string;       // guiding research question
  sources: ResearchSource[];
  notes: ResearchNote[];
  createdAt: string;
  updatedAt: string;
}

// ── Strict validators ─────────────────────────────────────────────────────────

function isNoteType(v: unknown): v is ResearchNoteType {
  return v === "excerpt" || v === "note" || v === "question";
}

function isSourceType(v: unknown): v is ResearchSourceType {
  return v === "book" || v === "article" || v === "website" || v === "other";
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function optStr(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Returns null on ANY malformed field, duplicate ID, or structural error. */
function parseNote(raw: unknown, existingIds: Set<string>): ResearchNote | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Record<string, unknown>;
  const id = str(n.id);
  if (!id) return null;
  if (existingIds.has(id)) return null; // duplicate ID → reject whole project
  if (typeof n.order !== "number") return null;
  existingIds.add(id);
  return {
    id,
    order: n.order,
    text: str(n.text),
    sourceId: optStr(n.sourceId),
    pageOrLocation: optStr(n.pageOrLocation),
    noteType: isNoteType(n.noteType) ? n.noteType : "note",
    createdAt: str(n.createdAt) || new Date().toISOString(),
  };
}

/** Returns null on ANY malformed field or duplicate ID. */
function parseSource(raw: unknown, existingIds: Set<string>): ResearchSource | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const id = str(s.id);
  if (!id) return null;
  if (existingIds.has(id)) return null; // duplicate ID → reject whole project
  existingIds.add(id);
  return {
    id,
    type: isSourceType(s.type) ? s.type : "other",
    title: str(s.title),
    author: str(s.author),
    year: optStr(s.year),
    url: optStr(s.url),
    publication: optStr(s.publication),
    location: optStr(s.location),
    notes: optStr(s.notes),
  };
}

/**
 * Parses an unknown value into a ResearchProject, or returns null if invalid.
 *
 * Strict: any malformed source, malformed note, duplicate ID, or dangling
 * sourceId rejects the ENTIRE project. No silent repair or partial loading.
 * Unknown extra object fields are ignored (forward compatibility).
 */
export function parseResearchProject(raw: unknown): ResearchProject | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (p.schemaVersion !== 1) return null;
  const id = str(p.id);
  if (!id) return null;

  const noteIds = new Set<string>();
  const sourceIds = new Set<string>();

  const rawSources = Array.isArray(p.sources) ? p.sources : [];
  const sources: ResearchSource[] = [];
  for (const s of rawSources) {
    const parsed = parseSource(s, sourceIds);
    if (!parsed) return null; // malformed or duplicate source → reject project
    sources.push(parsed);
  }

  const rawNotes = Array.isArray(p.notes) ? p.notes : [];
  const notes: ResearchNote[] = [];
  for (const n of rawNotes) {
    const parsed = parseNote(n, noteIds);
    if (!parsed) return null; // malformed or duplicate note → reject project
    // Dangling sourceId (references non-existent source) → reject project
    if (parsed.sourceId && !sourceIds.has(parsed.sourceId)) return null;
    notes.push(parsed);
  }

  return {
    schemaVersion: 1,
    id,
    title: str(p.title),
    question: str(p.question),
    sources,
    notes,
    createdAt: str(p.createdAt) || new Date().toISOString(),
    updatedAt: str(p.updatedAt) || new Date().toISOString(),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns notes sorted by order ascending. */
export function sortedNotes(notes: ResearchNote[]): ResearchNote[] {
  return [...notes].sort((a, b) => a.order - b.order);
}

/** Assigns fresh sequential order values (1, 2, 3…) to notes preserving existing sort. */
export function reindexNotes(notes: ResearchNote[]): ResearchNote[] {
  return sortedNotes(notes).map((n, i) => ({ ...n, order: i + 1 }));
}

/** Generates a unique note ID. */
export function generateNoteId(notes: ResearchNote[]): string {
  const max = notes.reduce((m, n) => Math.max(m, n.order), 0);
  return `NOTE-${String(max + 1).padStart(4, "0")}`;
}

/** Generates a unique source ID. */
export function generateSourceId(sources: ResearchSource[]): string {
  return `SRC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
