// app/tools/document-studio/utils/inpageKeyboardExtension.ts

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { resolveKey, KeyboardLayout } from "./inpageKeyboard";

export const inpageKeyboardPluginKey = new PluginKey("inpageKeyboard");

export interface InpageKeyboardOptions {
  getLayout: () => KeyboardLayout | null;
}

export const InpageKeyboard = Extension.create<InpageKeyboardOptions>({
  name: "inpageKeyboard",

  addOptions() {
    return {
      getLayout: () => null,
    };
  },

  addProseMirrorPlugins() {
    const { getLayout } = this.options;

    return [
      new Plugin({
        key: inpageKeyboardPluginKey,
        props: {
          handleKeyDown(view, event) {
            if (!view.editable) {
              return false;
            }

            if (event.isComposing || event.keyCode === 229) {
              return false;
            }

            const layout = getLayout();
            if (!layout) {
              return false;
            }

            const charToInsert = resolveKey(layout, event);
            if (charToInsert === null) {
              return false;
            }

            event.preventDefault();
            view.dispatch(view.state.tr.insertText(charToInsert).scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});