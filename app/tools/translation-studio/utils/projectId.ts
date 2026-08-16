/** Generates a short UUID-like project ID (collision-resistant for local-only use). */
export function generateProjectId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `proj-${ts}-${rand}`;
}
