import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { detectParagraphDirection } from "./paragraphDirectionDetection";
export { detectParagraphDirection } from "./paragraphDirectionDetection";

export type ParagraphDirectionMode = "auto" | "rtl" | "ltr";

/** Ruler origin follows an explicit mode, then the paragraph dir, then the document default. */
export function resolveRulerDirection(
  directionMode: unknown,
  paragraphDir: unknown,
  documentDir: "rtl" | "ltr" = "rtl",
): "rtl" | "ltr" {
  if (directionMode === "rtl" || directionMode === "ltr") return directionMode;
  if (paragraphDir === "rtl" || paragraphDir === "ltr") return paragraphDir;
  return documentDir;
}

export function rulerDirectionAtSelection(
  nodes: Array<{ typeName: string; directionMode: unknown; dir: unknown }>,
): "rtl" | "ltr" {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (node.typeName !== "paragraph" && node.typeName !== "heading") continue;
    return resolveRulerDirection(node.directionMode, node.dir, "rtl");
  }
  return "rtl";
}

export const ParagraphAutoDirection = Extension.create({
  name: "paragraphAutoDirection",
  onCreate() {
    // Also normalize initial/restored content, before the first text edit.
    this.editor.view.dispatch(this.editor.state.tr.setMeta("normalizeParagraphDirection", true).setMeta("addToHistory", false));
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      appendTransaction(transactions, _oldState, state) {
        if (!transactions.some(tr => tr.docChanged || tr.getMeta("normalizeParagraphDirection"))) return null;
        const tr = state.tr;
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "paragraph" && node.type.name !== "heading") return;
          if (node.attrs.directionMode === "rtl" || node.attrs.directionMode === "ltr") return;
          const dir = detectParagraphDirection(node.textContent, node.attrs.dir === "ltr" ? "ltr" : "rtl");
          if (dir !== node.attrs.dir) tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir });
        });
        return tr.docChanged ? tr : null;
      },
    })];
  },
});
