import { parseLeading } from "./leading";
/**
 * Menu action dispatcher. Visual menus call this; TipTap work stays in
 * documentCommands. Editor-owned flows (new/upload/export/panels) stay
 * in the supplied handlers.
 */
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import {
  applyBlockStyle,
  applyHighlight,
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
import type { DocumentViewMode, DocumentZoom, RulerUnit } from "./documentView";
import { zoomFromMenuAction } from "./documentView";

export type HelpDialogMode = "about" | "shortcuts" | "rtl" | "voice";

export type DocumentMenuHandlers = {
  newDocument: () => void;
  openLibrary: () => void;
  upload: () => void;
  downloadTxt: () => void;
  downloadDocx: () => void;
  downloadPdf: () => void;
  print: () => void;
  openPageSetup: () => void;
  find: () => void;
  toggleOutline: () => void;
  toggleQuality: () => void;
  toggleGlossary: () => void;
  toggleSettings: () => void;
  toggleFullscreen: () => void;
  setViewMode: (mode: DocumentViewMode) => void;
  setZoom: (zoom: DocumentZoom) => void;
  setRulerUnit: (unit: RulerUnit) => void;
  toggleRuler: () => void;
  loadExample: () => void;
  promptLink: () => void;
  openTableInsert?: () => void;
  openImageInsert?: () => void;
  insertPageBreak?: () => void;
  insertSectionBreak?: (type: "nextPage" | "continuous") => void;
  setDir: (dir: "rtl" | "ltr") => void;
  standardize: () => void;
  audit: () => void;
  showStats: () => void;
  startDictation: () => void;
  openQalamAi: () => void;
  openHelp: (mode: HelpDialogMode) => void;
  setCanvasTool?: (tool: "select" | "hand" | "text" | "zoom") => void;
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

function updateSelectedImage(editor: Editor, attrs: Record<string, unknown>): void {
  const selection = editor.state.selection;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return;
  editor.chain().focus().updateAttributes("image", attrs).run();
}

export function lineHeightFromMenuAction(id: MenuActionId): number | null | undefined {
  if (id === "format.lh.default") return null;
  if (!id.startsWith("format.lh.")) return undefined;
  const raw = Number(id.slice("format.lh.".length));
  const leading = parseLeading(raw);
  return leading?.mode === "points" ? leading.value : null;
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
  const zoom = zoomFromMenuAction(id);
  if (zoom) {
    handlers.setZoom(zoom);
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
    case "file.open":
      handlers.openLibrary();
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
    case "file.print":
      handlers.print();
      return;
    case "file.pageSetup":
      handlers.openPageSetup();
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
    case "view.facing": handlers.setViewMode("facing"); return;
    case "view.pages":
      handlers.setViewMode("pages");
      return;
    case "view.pageless":
      handlers.setViewMode("pageless");
      return;
    case "view.ruler":
      handlers.toggleRuler();
      return;
    case "view.rulerUnit.cm":
      handlers.setRulerUnit("cm");
      return;
    case "view.rulerUnit.in":
      handlers.setRulerUnit("in");
      return;
    case "view.hand":
      handlers.setCanvasTool?.("hand");
      return;
    case "view.stats":
      handlers.showStats();
      return;
    case "insert.link":
      handlers.promptLink();
      return;
    case "insert.table":
      handlers.openTableInsert?.();
      return;
    case "insert.image":
      handlers.openImageInsert?.();
      return;
    case "insert.pageBreak":
      handlers.insertPageBreak?.();
      return;
    case "insert.sectionBreakNextPage":
      handlers.insertSectionBreak?.("nextPage");
      return;
    case "insert.sectionBreakContinuous":
      handlers.insertSectionBreak?.("continuous");
      return;
    case "table.addRowBefore":
      editor?.chain().focus().addRowBefore().run();
      return;
    case "table.addRowAfter":
      editor?.chain().focus().addRowAfter().run();
      return;
    case "table.deleteRow":
      editor?.chain().focus().deleteRow().run();
      return;
    case "table.addColumnBefore":
      editor?.chain().focus().addColumnBefore().run();
      return;
    case "table.addColumnAfter":
      editor?.chain().focus().addColumnAfter().run();
      return;
    case "table.deleteColumn":
      editor?.chain().focus().deleteColumn().run();
      return;
    case "table.toggleHeaderRow":
      editor?.chain().focus().toggleHeaderRow().run();
      return;
    case "table.delete":
      editor?.chain().focus().deleteTable().run();
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
    case "format.shade":
      if (editor) applyHighlight(editor, "#fff2a8");
      return;
    case "format.image.left":
      if (editor) updateSelectedImage(editor, { alignment: "left" });
      return;
    case "format.image.center":
      if (editor) updateSelectedImage(editor, { alignment: "center", wrapMode: "break" });
      return;
    case "format.image.right":
      if (editor) updateSelectedImage(editor, { alignment: "right" });
      return;
    case "format.image.wrap":
      if (editor) updateSelectedImage(editor, { wrapMode: "wrap", alignment: "left" });
      return;
    case "format.image.break":
      if (editor) updateSelectedImage(editor, { wrapMode: "break" });
      return;
    case "format.image.alt":
      if (editor && typeof window !== "undefined") {
        const alt = window.prompt("Alternative text", String(editor.getAttributes("image").alt ?? ""));
        if (alt !== null) updateSelectedImage(editor, { alt });
      }
      return;
    case "format.image.delete":
      if (editor && editor.state.selection instanceof NodeSelection && editor.state.selection.node.type.name === "image") {
        editor.chain().focus().deleteSelection().run();
      }
      return;
    case "window.outline":
      handlers.toggleOutline();
      return;
    case "window.quality":
      handlers.toggleQuality();
      return;
    case "window.settings":
      handlers.toggleSettings();
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
    case "tools.qalamAi":
      handlers.openQalamAi();
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
