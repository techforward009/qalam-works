// Translation Studio localStorage persistence adapter.
// Defines the TranslationProjectStore interface so future implementations
// (IndexedDB, cloud) can swap in without changing workspace components.

import type { TranslationProject } from "./translationTypes";
import { parseProject } from "./translationTypes";

// ── Store interface ──────────────────────────────────────────────────────────

export type StoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "quota" | "corrupt" | "not_found" | "unknown" };

export interface TranslationProjectStore {
  list(): string[];
  get(id: string): StoreResult<TranslationProject>;
  save(project: TranslationProject): StoreResult<void>;
  remove(id: string): void;
}

// ── localStorage implementation ──────────────────────────────────────────────

const LIST_KEY = "qalam-translation-projects-v1";
const PROJECT_KEY_PREFIX = "qalam-translation-project-v1-";
const MAX_PROJECT_BYTES = 512 * 1024;

function projectKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

function safeStringify(value: unknown): string | null {
  try { return JSON.stringify(value); } catch { return null; }
}

function safeWrite(key: string, data: string): StoreResult<void> {
  if (data.length > MAX_PROJECT_BYTES) return { ok: false, error: "quota" };
  try {
    localStorage.setItem(key, data);
    return { ok: true, value: undefined };
  } catch (e) {
    const name = (e as { name?: string })?.name ?? "";
    const msg = e instanceof Error ? e.message : "";
    if (name === "QuotaExceededError" || msg.toLowerCase().includes("quota")) {
      return { ok: false, error: "quota" };
    }
    return { ok: false, error: "unknown" };
  }
}

export class LocalStorageTranslationProjectStore implements TranslationProjectStore {
  list(): string[] {
    try {
      const raw = localStorage.getItem(LIST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id): id is string => typeof id === "string");
    } catch { return []; }
  }

  get(id: string): StoreResult<TranslationProject> {
    try {
      const raw = localStorage.getItem(projectKey(id));
      if (!raw) return { ok: false, error: "not_found" };
      const parsed = JSON.parse(raw);
      const project = parseProject(parsed);
      if (!project) return { ok: false, error: "corrupt" };
      return { ok: true, value: project };
    } catch { return { ok: false, error: "corrupt" }; }
  }

  save(project: TranslationProject): StoreResult<void> {
    const data = safeStringify(project);
    if (!data) return { ok: false, error: "unknown" };
    const result = safeWrite(projectKey(project.id), data);
    if (!result.ok) return result;
    const ids = this.list();
    if (!ids.includes(project.id)) {
      const updated = safeStringify([project.id, ...ids]);
      if (updated) { try { localStorage.setItem(LIST_KEY, updated); } catch { /* non-fatal */ } }
    }
    return { ok: true, value: undefined };
  }

  remove(id: string): void {
    try { localStorage.removeItem(projectKey(id)); } catch { /* ignore */ }
    const ids = this.list().filter((x) => x !== id);
    try { localStorage.setItem(LIST_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }
}

// ── Default singleton instance ───────────────────────────────────────────────

export const defaultStore = new LocalStorageTranslationProjectStore();

// ── Thin compatibility wrappers (unchanged API surface for existing callers) ──

export function listProjectIds(): string[] { return defaultStore.list(); }
export function saveProject(project: TranslationProject): StoreResult<void> { return defaultStore.save(project); }
export function loadProject(id: string): StoreResult<TranslationProject> { return defaultStore.get(id); }
export function deleteProject(id: string): void { defaultStore.remove(id); }

export function loadAllProjects(): TranslationProject[] {
  return defaultStore.list()
    .map((id) => defaultStore.get(id))
    .filter((r): r is { ok: true; value: TranslationProject } => r.ok)
    .map((r) => r.value)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function exportProjectBackup(project: TranslationProject): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectBackup(json: string): StoreResult<TranslationProject> {
  try {
    const parsed = JSON.parse(json);
    const project = parseProject(parsed);
    if (!project) return { ok: false, error: "corrupt" };
    return { ok: true, value: project };
  } catch { return { ok: false, error: "corrupt" }; }
}
