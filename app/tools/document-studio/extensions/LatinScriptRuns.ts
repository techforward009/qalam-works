import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

const key = new PluginKey<DecorationSet>("studioLatinScriptRuns");

// View decorations keep mixed-script font selection out of the saved document.
function decorations(doc: Node) {
  const spans: Decoration[] = [];
  doc.descendants((block, pos) => {
    if (block.type.name !== "paragraph" || block.attrs.dir !== "rtl") return;
    block.descendants((node, offset) => {
      if (!node.isText || !node.text) return;
      for (const match of node.text.matchAll(/\p{Script=Latin}[\p{Script=Latin}\p{M}\p{N}\s.,:;!?'"()/_+%=@#&-]*/gu)) {
        const start = pos + 1 + offset + match.index;
        spans.push(Decoration.inline(start, start + match[0].length, {
          "data-studio-latin-run": "true",
          style: "font-family:var(--qalam-ltr-font, Arial, sans-serif)",
        }));
      }
    });
    return false;
  });
  return DecorationSet.create(doc, spans);
}

export const LatinScriptRuns = Extension.create({
  name: "studioLatinScriptRuns",
  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key,
      state: {
        init: (_, state) => decorations(state.doc),
        apply: (transaction, previous) => transaction.docChanged ? decorations(transaction.doc) : previous,
      },
      props: { decorations: state => key.getState(state) },
    })];
  },
});
