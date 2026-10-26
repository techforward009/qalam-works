import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

const key = new PluginKey<DecorationSet>("studioLatinScriptRuns");
const LATIN = /^(inter|arial|arial unicode ms|times new roman|tahoma|calibri|georgia|verdana|courier new|cambria|segoe ui|helvetica)$/i;

function latinFamily(family: unknown): boolean {
  if (typeof family !== "string" || !family.trim()) return false;
  const name = family.replace(/["']/g, "").split(",")[0].trim();
  return LATIN.test(name);
}

// View decorations keep mixed-script font selection out of the saved document.
function decorations(doc: Node) {
  const spans: Decoration[] = [];
  doc.descendants((block, pos) => {
    if (!block.isTextblock) return;
    block.descendants((node, offset) => {
      if (!node.isText || !node.text) return;
      const family = node.marks.find(mark => mark.type.name === "textStyle")?.attrs?.fontFamily;
      const explicitLatin = latinFamily(family) ? String(family).replace(/["']/g, "").split(",")[0].trim() : "";
      const arabicNeedsFace = latinFamily(family);
      for (const match of node.text.matchAll(/\p{Script=Latin}[\p{Script=Latin}\p{M}\p{N}\s.,:;!?'"()/_+%=@#&-]*/gu)) {
        const start = pos + 1 + offset + (match.index ?? 0);
        if (explicitLatin) {
          spans.push(Decoration.inline(start, start + match[0].length, {
            "data-studio-latin-run": "true",
            style: `font-family:"${explicitLatin}", Arial, sans-serif`,
          }));
        } else {
          spans.push(Decoration.inline(start, start + match[0].length, {
            "data-studio-latin-run": "true",
            "data-studio-latin-default": "true",
            style: "font-family:var(--qalam-ltr-font, Arial, sans-serif)",
          }));
        }
      }
      if (!arabicNeedsFace) return;
      for (const match of node.text.matchAll(/\p{Script=Arabic}+/gu)) {
        const start = pos + 1 + offset + (match.index ?? 0);
        spans.push(Decoration.inline(start, start + match[0].length, {
          "data-studio-arabic-run": "true",
          style: "font-family:var(--qalam-rtl-font, \"Mehr Nastaliq Web\")",
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
