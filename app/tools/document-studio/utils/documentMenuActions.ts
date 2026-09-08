/**
 * Menu action dispatcher. Visual menus call this; TipTap work stays in
 * documentCommands. Editor-owned flows (new/upload/export/panels) stay
 * in the supplied handlers.
 */
import type { Editor } from "@tiptap/react";
import {
  applyBlockStyle,
  applyLineHeight,
  redo,
  selectAll,
  setAlign,
  toggleBold,
  toggleBulletList,
  toggleItalic,
  toggleOrderedList,
  toggleUnderline,
  undo,
} from "./documentCommands";
import type { MenuActionId } from "./documentMenus";
import type { BlockStyleId } from "./documentStyles";
import { validateLineHeight } from "./documentSettings";

export type HelpDialogMode = "about" | "shortcuts" | "rtl" | "voice";

export type DocumentMenuHandlers = {
  newDocument: () => void;
  upload: () => void;
  downloadTxt: () => void;
  downloadDocx: () => void;
  downloadPdf: () => void;
  find: () => void;
  toggleOutline: () => void;
  toggleQuality: () => void;
  toggleGlossary: () => void;
  toggleSettings: () => void;
  toggleFullscreen: () => void;
  loadExample: () => void;
  promptLink: () => void;
  setDir: (dir: "rtl" | "ltr") => void;
  standardize: () => void;
  audit: () => void;
  showStats: () => void;
  startDictation: () => void;
  openHelp: (mode: HelpDialogMode) => void;
};

const STYLE_ACTIONS: Record<string, BlockStyleId> = {
  "format.style.normal": "normal",
  "format.style.title": "title",
  "format.style.subtitle": "subtitle",
  "format.style.heading-1": "heading-1",
  "format.style.heading-2": "heading-2",
  "format.style.heading-3": "heading-3",
  "format.style.heading-4": "heading-4",
  "format.style.quote": "quote",
  "format.style.caption": "caption",
};

export function lineHeightFromMenuAction(id: MenuActionId): number | null | undefined {
  if (id === "format.lh.default") return null;
  if (!id.startsWith("format.lh.")) return undefined;
  const raw = Number(id.slice("format.lh.".length));
  return validateLineHeight(raw);
}

export function dispatchDocumentMenuAction(
  id: MenuActionId,
  editor: Editor | null,
  handlers: DocumentMenuHandlers,
): void {
  const style = STYLE_ACTIONS[id];
  if (style) {
    if (editor) applyBlockStyle(editor, style);
    return;
  }
  const lineHeight = lineHeightFromMenuAction(id);
  if (lineHeight !== undefined) {
    if (editor) applyLineHeight(editor, lineHeight);
    return;
  }

  switch (id) {
    case "file.new":
      handlers.newDocument();
      return;
    case "file.upload":
      handlers.upload();
      return;
    case "file.downloadTxt":
      handlers.downloadTxt();
      return;
    case "file.downloadDocx":
      handlers.downloadDocx();
      return;
    case "file.downloadPdf":
      handlers.downloadPdf();
      return;
    case "edit.undo":
      if (editor) undo(editor);
      return;
    case "edit.redo":
      if (editor) redo(editor);
      return;
    case "edit.selectAll":
      if (editor) selectAll(editor);
      return;
    case "edit.find":
      handlers.find();
      return;
    case "view.outline":
      handlers.toggleOutline();
      return;
    case "view.quality":
      handlers.toggleQuality();
      return;
    case "view.glossary":
      handlers.toggleGlossary();
      return;
    case "view.settings":
      handlers.toggleSettings();
      return;
    case "view.fullscreen":
      handlers.toggleFullscreen();
      return;
    case "insert.link":
      handlers.promptLink();
      return;
    case "insert.example":
      handlers.loadExample();
      return;
    case "format.bold":
      if (editor) toggleBold(editor);
      return;
    case "format.italic":
      if (editor) toggleItalic(editor);
      return;
    case "format.underline":
      if (editor) toggleUnderline(editor);
      return;
    case "format.alignLeft":
      if (editor) setAlign(editor, "left");
      return;
    case "format.alignCenter":
      if (editor) setAlign(editor, "center");
      return;
    case "format.alignRight":
      if (editor) setAlign(editor, "right");
      return;
    case "format.alignJustify":
      if (editor) setAlign(editor, "justify");
      return;
    case "format.rtl":
      handlers.setDir("rtl");
      return;
    case "format.ltr":
      handlers.setDir("ltr");
      return;
    case "format.bullet":
      if (editor) toggleBulletList(editor);
      return;
    case "format.ordered":
      if (editor) toggleOrderedList(editor);
      return;
    case "tools.standardize":
      handlers.standardize();
      return;
    case "tools.audit":
      handlers.audit();
      return;
    case "tools.stats":
      handlers.showStats();
      return;
    case "tools.dictation":
      handlers.startDictation();
      return;
    case "tools.glossary":
      handlers.toggleGlossary();
      return;
    case "help.about":
      handlers.openHelp("about");
      return;
    case "help.shortcuts":
      handlers.openHelp("shortcuts");
      return;
    case "help.rtl":
      handlers.openHelp("rtl");
      return;
    case "help.voice":
      handlers.openHelp("voice");
      return;
    default:
      return;
  }
}

export function toggleStudioFullscreen(root?: HTMLElement | null): void {
  if (typeof document === "undefined") return;
  const el = root ?? document.querySelector<HTMLElement>("[data-studio-shell]");
  if (!el || typeof el.requestFullscreen !== "function") return;
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  void el.requestFullscreen();
}

export function focusExistingDictationControl(): void {
  if (typeof document === "undefined") return;
  const button = document.querySelector<HTMLButtonElement>("[data-studio-dictation]");
  if (!button) return;
  button.focus();
  button.click();
}
