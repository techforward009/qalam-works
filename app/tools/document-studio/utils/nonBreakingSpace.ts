import { Extension } from "@tiptap/core";
import { SYMBOL_INSERT } from "./formattingSafety";

/** InPage: Shift+Space joins two words with a non-breaking space so they stay on one line. */
export const NON_BREAKING_SPACE = "\u00A0";

export const NonBreakingSpace = Extension.create({
  name: "nonBreakingSpace",
  addKeyboardShortcuts() {
    return {
      "Shift-Space": () => {
        const { state, view } = this.editor;
        const { from, to } = state.selection;
        view.dispatch(state.tr.insertText(NON_BREAKING_SPACE, from, to).setMeta(SYMBOL_INSERT, true).scrollIntoView());
        return true;
      },
    };
  },
});
