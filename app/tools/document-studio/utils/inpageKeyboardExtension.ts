// app/tools/document-studio/utils/inpageKeyboardExtension.ts

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { mapLatinText, resolveKey, KeyboardLayout } from "./inpageKeyboard";

export const inpageKeyboardPluginKey = new PluginKey("inpageKeyboard");
const routing = new WeakSet<object>();

function insertText(view: Parameters<NonNullable<import("@tiptap/pm/view").EditorProps["handleTextInput"]>>[0], text: string) {
  const { from, to } = view.state.selection;
  routing.add(view);
  try {
    const handled = view.someProp("handleTextInput", (f) => f(view, from, to, text, () => view.state.tr.insertText(text, from, to)));
    if (!handled) view.dispatch(view.state.tr.insertText(text, from, to).scrollIntoView());
  } finally { routing.delete(view); }
}

export interface InpageKeyboardOptions {
  getLayout: () => KeyboardLayout | null;
}

export const InpageKeyboard = Extension.create<InpageKeyboardOptions>({
  name: "inpageKeyboard",
  // Run before the table-cell guard so its beforeinput/handleTextInput route
  // receives mapped text exactly once.
  priority: 300,

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
          handleTextInput(view, from, to, text, _defaultInsert) {
            if (routing.has(view)) return false;
            // Rewriting text mid-composition makes Android IMEs resend the
            // whole composed word (duplicates). Map the committed word at
            // compositionend instead.
            if (view.composing) return false;
            const layout = getLayout();
            if (!layout) return false;
            const mapped = mapLatinText(layout, text);
            if (mapped === text) return false;
            routing.add(view);
            try {
              const handled = view.someProp("handleTextInput", (f) => f(
                view, from, to, mapped,
                () => view.state.tr.insertText(mapped, from, to).scrollIntoView(),
              ));
              if (!handled) view.dispatch(view.state.tr.insertText(mapped, from, to).scrollIntoView());
            } finally { routing.delete(view); }
            return true;
          },
          handleDOMEvents: {
            compositionend(view, event) {
              const data = (event as CompositionEvent).data;
              const layout = getLayout();
              if (!view.editable || !layout || !data) return false;
              const mapped = mapLatinText(layout, data);
              if (mapped === data) return false;
              let tries = 0;
              const commit = () => {
                if (view.isDestroyed) return;
                if (view.composing && tries++ < 10) { setTimeout(commit, 20); return; }
                const { from, empty } = view.state.selection;
                const start = from - data.length;
                if (!empty || start < 0 || view.state.doc.textBetween(start, from, "\n", "\n") !== data) {
                  if (tries++ < 10) setTimeout(commit, 20);
                  return;
                }
                view.dispatch(view.state.tr.insertText(mapped, start, from).scrollIntoView());
              };
              setTimeout(commit, 0);
              return false;
            },
            beforeinput(view, event) {
              const input = event as InputEvent;
              const layout = getLayout();
              if (!view.editable || !layout || input.inputType !== "insertText" || !input.data || !input.cancelable) return false;
              const mapped = mapLatinText(layout, input.data);
              if (mapped === input.data) return false;
              event.preventDefault();
              insertText(view, mapped);
              return true;
            },
          },
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
            // Route through handleTextInput so input rules and AllahAutoMarks
            // see layout characters exactly like native typing. This plugin has
            // no handleTextInput of its own, so there is no recursion.
            const { from, to } = view.state.selection;
            const handled = view.someProp("handleTextInput", (f) =>
              f(view, from, to, charToInsert, () => view.state.tr.insertText(charToInsert, from, to)),
            );
            if (!handled) view.dispatch(view.state.tr.insertText(charToInsert, from, to).scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});
