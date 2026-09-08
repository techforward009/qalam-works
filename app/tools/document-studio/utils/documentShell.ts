/**
 * Application-shell helpers for Document Studio Phase 1.
 * Pure: panel toggles, save-status copy, keyboard detection.
 * No React, no TipTap, no export/normalization.
 */

export type LeftPanelId = "none" | "outline";
export type RightPanelId = "none" | "quality" | "glossary" | "settings";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function toggleLeftPanel(current: LeftPanelId, next: Exclude<LeftPanelId, "none">): LeftPanelId {
  return current === next ? "none" : next;
}

export function toggleRightPanel(current: RightPanelId, next: Exclude<RightPanelId, "none">): RightPanelId {
  return current === next ? "none" : next;
}

export function describeSaveStatus(args: {
  saveStatus: SaveStatus;
  online: boolean;
  isUr: boolean;
}): { label: string; tone: "muted" | "saving" | "saved" | "offline" | "error" } {
  const { saveStatus, online, isUr } = args;
  if (saveStatus === "saving") {
    return { label: isUr ? "محفوظ ہو رہا ہے…" : "Saving…", tone: "saving" };
  }
  if (saveStatus === "error") {
    return { label: isUr ? "براؤزر میں محفوظ نہیں ہو سکا" : "Couldn’t save locally", tone: "error" };
  }
  if (!online) {
    if (saveStatus === "saved") {
      return { label: isUr ? "آف لائن · مقامی طور پر محفوظ" : "Offline · Saved locally", tone: "offline" };
    }
    return { label: isUr ? "آف لائن" : "Offline", tone: "offline" };
  }
  if (saveStatus === "saved") {
    return { label: isUr ? "محفوظ" : "Saved", tone: "saved" };
  }
  return { label: "", tone: "muted" };
}

export function isFindOpenShortcut(e: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "f";
}

export function describeDocumentLanguage(args: {
  dominant: "arabic-script" | "latin" | "mixed" | "none" | undefined;
  isUr: boolean;
}): string {
  const { dominant, isUr } = args;
  if (dominant === "arabic-script") return isUr ? "عربی رسم الخط" : "Arabic-script";
  if (dominant === "latin") return isUr ? "لاطینی" : "Latin";
  if (dominant === "mixed") return isUr ? "مخلوط" : "Mixed";
  return isUr ? "—" : "—";
}
