// Translation Studio localStorage adapter.
// Uses a versioned project-list key + per-project key. Never silently
// overwrites; returns typed errors instead.

import type { TranslationProject } from "./translationTypes";
import { parseProject } from "./translationTypes";

const LIST_KEY = "qalam-translation-projects-v1";
const PROJECT_KEY_PREFIX = "qalam-translation-project-v1-";
/** Generous safety limit — one project rarely exceeds 200KB of plain text. */
const MAX_PROJECT_BYTES = 512 * 1024;

export type StoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "quota" | "corrupt" | "not_found" | "unknown" };

function projectKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function safeWrite(key: string, data: string): StoreResult<void> {
  if (data.length > MAX_PROJECT_BYTES) return { ok: false, error: "quota" };
  try {
    localStorage.setItem(key, data);
    return { ok: true, value: undefined };
  } catch (e) {
    // QuotaExceededError or SecurityError
    const msg = e instanceof Error ? e.message : "";
    if (msg.toLowerCase().includes("quota") || (e as { name?: string })?.name === "QuotaExceededError") {
      return { ok: false, error: "quota" };
    }
    return { ok: false, error: "unknown" };
  }
}

/** Returns sorted list of project IDs (most recently updated first via metadata). */
export function listProjectIds(): string[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function saveProject(project: TranslationProject): StoreResult<void> {
  const data = safeStringify(project);
  if (!data) return { ok: false, error: "unknown" };
  const result = safeWrite(projectKey(project.id), data);
  if (!result.ok) return result;
  // Update the project list
  const ids = listProjectIds();
  if (!ids.includes(project.id)) {
    const updated = safeStringify([project.id, ...ids]);
    if (updated) {
      try { localStorage.setItem(LIST_KEY, updated); } catch { /* non-fatal */ }
    }
  }
  return { ok: true, value: undefined };
}

export function loadProject(id: string): StoreResult<TranslationProject> {
  try {
    const raw = localStorage.getItem(projectKey(id));
    if (!raw) return { ok: false, error: "not_found" };
    const parsed = JSON.parse(raw);
    const project = parseProject(parsed);
    if (!project) return { ok: false, error: "corrupt" };
    return { ok: true, value: project };
  } catch {
    return { ok: false, error: "corrupt" };
  }
}

export function loadAllProjects(): TranslationProject[] {
  const ids = listProjectIds();
  const result: TranslationProject[] = [];
  for (const id of ids) {
    const r = loadProject(id);
    if (r.ok) result.push(r.value);
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteProject(id: string): void {
  try { localStorage.removeItem(projectKey(id)); } catch { /* ignore */ }
  const ids = listProjectIds().filter((x) => x !== id);
  try { localStorage.setItem(LIST_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

/** Export project as a portable JSON backup string. */
export function exportProjectBackup(project: TranslationProject): string {
  return JSON.stringify(project, null, 2);
}

/** Attempt to import a backup JSON string. */
export function importProjectBackup(json: string): StoreResult<TranslationProject> {
  try {
    const parsed = JSON.parse(json);
    const project = parseProject(parsed);
    if (!project) return { ok: false, error: "corrupt" };
    return { ok: true, value: project };
  } catch {
    return { ok: false, error: "corrupt" };
  }
}
