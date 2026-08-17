/**
 * Research Studio persistence — mirrors Translation Studio's proven
 * LocalStorageProjectStore pattern exactly. Same StoreResult type,
 * same list-key + per-project-key layout, same 512 KB guard.
 */

import type { ResearchProject } from "./researchTypes";
import { parseResearchProject } from "./researchTypes";
import { generateProjectId } from "../../translation-studio/utils/projectId";
import { sanitizeFilenameBase as _sanitizeFilenameBase } from "../../translation-studio/utils/translationExport";

export type StoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "quota" | "corrupt" | "not_found" | "unknown" };

// ── Storage keys ──────────────────────────────────────────────────────────────

const LIST_KEY = "qalam-research-projects-v1";
const PROJECT_KEY_PREFIX = "qalam-research-project-v1-";
const MAX_PROJECT_BYTES = 512 * 1024;

function projectKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

// ── Store interface ───────────────────────────────────────────────────────────

export interface ResearchProjectStore {
  list(): string[];
  get(id: string): StoreResult<ResearchProject>;
  save(project: ResearchProject): StoreResult<void>;
  remove(id: string): void;
}

// ── localStorage implementation ───────────────────────────────────────────────

class LocalStorageResearchProjectStore implements ResearchProjectStore {
  list(): string[] {
    try {
      const raw = localStorage.getItem(LIST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string") : [];
    } catch { return []; }
  }

  get(id: string): StoreResult<ResearchProject> {
    try {
      const raw = localStorage.getItem(projectKey(id));
      if (!raw) return { ok: false, error: "not_found" };
      const project = parseResearchProject(JSON.parse(raw));
      if (!project) return { ok: false, error: "corrupt" };
      return { ok: true, value: project };
    } catch { return { ok: false, error: "unknown" }; }
  }

  save(project: ResearchProject): StoreResult<void> {
    try {
      const data = JSON.stringify(project);
      if (data.length > MAX_PROJECT_BYTES) return { ok: false, error: "quota" };
      localStorage.setItem(projectKey(project.id), data);
      const ids = this.list();
      if (!ids.includes(project.id)) {
        const updated = JSON.stringify([...ids, project.id]);
        try { localStorage.setItem(LIST_KEY, updated); } catch { /* non-fatal */ }
      }
      return { ok: true, value: undefined };
    } catch { return { ok: false, error: "unknown" }; }
  }

  remove(id: string): void {
    try { localStorage.removeItem(projectKey(id)); } catch { /* ignore */ }
    const ids = this.list().filter(x => x !== id);
    try { localStorage.setItem(LIST_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }
}

export const defaultResearchStore: ResearchProjectStore =
  typeof localStorage !== "undefined"
    ? new LocalStorageResearchProjectStore()
    : {
        list: () => [],
        get: () => ({ ok: false, error: "not_found" }),
        save: () => ({ ok: false, error: "unknown" }),
        remove: () => {},
      };

/** Returns the default store, always freshly evaluated (safe for test environments). */
export function getResearchStore(): ResearchProjectStore {
  return new LocalStorageResearchProjectStore();
}

// ── Project factory ───────────────────────────────────────────────────────────

export function createResearchProject(title: string, question = ""): ResearchProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: generateProjectId(),
    title,
    question,
    sources: [],
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Loads all projects from the store (skips corrupt entries). */
export function loadAllResearchProjects(store: ResearchProjectStore = getResearchStore()): ResearchProject[] {
  return store.list()
    .map(id => store.get(id))
    .filter((r): r is { ok: true; value: ResearchProject } => r.ok)
    .map(r => r.value);
}

// ── Versioned backup ──────────────────────────────────────────────────────────

export const RESEARCH_BACKUP_FORMAT = "qalam-research-project";
export const RESEARCH_BACKUP_SCHEMA_VERSION = 1;

export interface ResearchBackupEnvelope {
  format: typeof RESEARCH_BACKUP_FORMAT;
  schemaVersion: typeof RESEARCH_BACKUP_SCHEMA_VERSION;
  project: ResearchProject;
}

/** Serialises a project to the versioned backup JSON string.
 *  No text normalization — verbatim round-trip. */
export function exportResearchBackup(project: ResearchProject): string {
  const envelope: ResearchBackupEnvelope = {
    format: RESEARCH_BACKUP_FORMAT,
    schemaVersion: RESEARCH_BACKUP_SCHEMA_VERSION,
    project,
  };
  return JSON.stringify(envelope, null, 2);
}

/** Parses and validates a backup JSON string.
 *  Returns null on any validation failure — never partially mutates caller state. */
export function importResearchBackup(json: string): StoreResult<ResearchProject> {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return { ok: false, error: "corrupt" };
    if (parsed.format !== RESEARCH_BACKUP_FORMAT) return { ok: false, error: "corrupt" };
    if (parsed.schemaVersion !== RESEARCH_BACKUP_SCHEMA_VERSION) return { ok: false, error: "corrupt" };
    const project = parseResearchProject(parsed.project);
    if (!project) return { ok: false, error: "corrupt" };
    return { ok: true, value: project };
  } catch { return { ok: false, error: "corrupt" }; }
}

/** Safe filename base for backup download. Reuses Translation Studio's sanitizer. */
export const sanitizeFilenameBase = _sanitizeFilenameBase;
