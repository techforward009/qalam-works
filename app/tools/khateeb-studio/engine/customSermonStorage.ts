import { CUSTOM_SERMON_PREFIX, customSermonProjectKey, parseCustomSermonProject, serializeCustomSermonProject, type CustomSermonProject } from "./customSermonProject";

export const CUSTOM_SERMON_ACTIVE_KEY = "qalam-khateeb-custom-active-v1";
export const sortCustomProjects = (projects: readonly CustomSermonProject[]) => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export function loadCustomProjects(storage: Storage) {
  const projects: CustomSermonProject[] = [];
  let invalidCount = 0;
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(`${CUSTOM_SERMON_PREFIX}:`)) continue;
    const project = parseCustomSermonProject(storage.getItem(key));
    if (project && key === customSermonProjectKey(project.id)) projects.push(project);
    else invalidCount++;
  }
  const sorted = sortCustomProjects(projects);
  const lastActive = storage.getItem(CUSTOM_SERMON_ACTIVE_KEY);
  return { projects: sorted, activeId: sorted.find(project => project.id === lastActive)?.id ?? sorted[0]?.id ?? "", invalidCount };
}

export function buildCustomBackup(projects: readonly CustomSermonProject[]): string {
  return JSON.stringify({ type: "qalam-khateeb-custom-sermons", version: 1, exportedAt: new Date().toISOString(), projects }, null, 2);
}

export function prepareCustomRestore(raw: string, existing: readonly CustomSermonProject[]) {
  const payload = JSON.parse(raw);
  if (payload?.type !== "qalam-khateeb-custom-sermons" || payload.version !== 1 || !Array.isArray(payload.projects) || !payload.projects.length || payload.projects.length > 500) throw new Error("invalid-backup");
  const incoming = payload.projects.map((item: unknown) => parseCustomSermonProject(JSON.stringify(item))) as (CustomSermonProject | null)[];
  if (incoming.some(item => !item) || new Set(incoming.map(item => item!.id)).size !== incoming.length) throw new Error("invalid-project");
  const merged = new Map(existing.map(project => [project.id, project]));
  const added: CustomSermonProject[] = [];
  let activeId = "";
  for (const project of incoming as CustomSermonProject[]) {
    const current = merged.get(project.id);
    const identical = [...merged.values()].find(item => serializeCustomSermonProject({ ...item, id: project.id }) === serializeCustomSermonProject(project));
    if (identical) { activeId ||= identical.id; continue; }
    const restored = current ? { ...project, id: `${Date.now().toString(36)}-restored-${Math.random().toString(36).slice(2, 12)}` } : project;
    merged.set(restored.id, restored);
    added.push(restored);
    activeId ||= restored.id;
  }
  return { projects: sortCustomProjects([...merged.values()]), added, activeId };
}

export function persistRestoredProjects(storage: Storage, projects: readonly CustomSermonProject[]) {
  const written: string[] = [];
  try {
    for (const project of projects) {
      const key = customSermonProjectKey(project.id);
      // Restore creates new records; existing drafts are never overwritten.
      if (storage.getItem(key) !== null) throw new Error("restore-conflict");
      storage.setItem(key, serializeCustomSermonProject(project));
      written.push(key);
    }
  } catch (error) {
    for (const key of written) storage.removeItem(key);
    throw error;
  }
}
