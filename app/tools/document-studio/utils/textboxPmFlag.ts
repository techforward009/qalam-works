/** Multi-line text box ProseMirror editor. Off unless a client signal turns it on.
 * SSR and the first paint must not call this with a live `window` result:
 * read it from event handlers and effects, not during the server render. */
export function textboxPmEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const query = new URLSearchParams(window.location.search).get("textboxPm");
    if (query === "1") return true;
    if (query === "0") return false;
  } catch {
    /* malformed location */
  }
  try {
    const stored = window.localStorage.getItem("qalam.textboxPm");
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {
    /* private mode */
  }
  return process.env.NEXT_PUBLIC_QALAM_TEXTBOX_PM === "1";
}
