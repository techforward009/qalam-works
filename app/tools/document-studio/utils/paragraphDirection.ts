import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

export type ParagraphDirectionMode = "auto" | "rtl" | "ltr";

/** Count strong letters only; Arabic digits, marks and punctuation are neutral. */
export function detectParagraphDirection(text: string, fallback: "rtl" | "ltr" = "rtl"): "rtl" | "ltr" {
  let rtl = 0;
  let ltr = 0;
  for (const letter of text) {
    if (!/\p{Letter}/u.test(letter)) continue;
    if (/[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u.test(letter)) rtl++;
    else ltr++;
  }
  return rtl === ltr ? fallback : rtl > ltr ? "rtl" : "ltr";
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
