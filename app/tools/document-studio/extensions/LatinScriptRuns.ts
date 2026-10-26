import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

const key = new PluginKey<DecorationSet>("studioLatinScriptRuns");
const stripKey = "studioLatinFaceStrip";
const LATIN = /^(inter|arial|arial unicode ms|times new roman|tahoma|calibri|georgia|verdana|courier new|cambria|segoe ui|helvetica)$/i;

function bare(family: unknown): string {
  return String(family ?? "").replace(/["']/g, "").split(",")[0].trim();
}

function latinFamily(family: unknown): boolean {
  return LATIN.test(bare(family));
}

function latinVisual(attrs: Record<string, unknown>): string {
  const face = bare(attrs.latinFontFamily) || (latinFamily(attrs.fontFamily) ? bare(attrs.fontFamily) : "");
  const parts = [face ? `font-family:"${face}", Arial, sans-serif` : "font-family:var(--qalam-ltr-font, Arial, sans-serif)"];
  // Letter-spacing and scaleX break Urdu joining and the caret, so they paint on Latin runs only.
  const tracking = attrs.trackingPercent;
  const scale = attrs.scalePercent;
  if (typeof tracking === "number" && tracking !== 0) parts.push(`letter-spacing:${tracking / 100}em`);
  if (typeof scale === "number" && scale !== 100) {
    parts.push(`transform:scaleX(${scale / 100})`, "transform-origin:left center");
  }
  return parts.join(";");
}

function liveAttrs(attrs: Record<string, unknown>): boolean {
  return Object.values(attrs).some((value) => value != null && value !== false && value !== "");
}

// View decorations keep mixed-script font selection out of the saved document.
function decorations(doc: Node) {
  const spans: Decoration[] = [];
  doc.descendants((block, pos) => {
    if (!block.isTextblock) return;
    block.descendants((node, offset) => {
      if (!node.isText || !node.text) return;
      const attrs = (node.marks.find((mark) => mark.type.name === "textStyle")?.attrs ?? {}) as Record<string, unknown>;
      const explicitLatin = bare(attrs.latinFontFamily) || (latinFamily(attrs.fontFamily) ? bare(attrs.fontFamily) : "");
      const arabicNeedsFace = latinFamily(attrs.fontFamily);
      for (const match of node.text.matchAll(/\p{Script=Latin}[\p{Script=Latin}\p{M}\p{N}\s.,:;!?'"()/_+%=@#&-]*/gu)) {
        const start = pos + 1 + offset + (match.index ?? 0);
        const style = latinVisual(attrs);
        if (explicitLatin) {
          spans.push(Decoration.inline(start, start + match[0].length, {
            "data-studio-latin-run": "true",
            style,
          }));
        } else {
          spans.push(Decoration.inline(start, start + match[0].length, {
            "data-studio-latin-run": "true",
            "data-studio-latin-default": "true",
            style,
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
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        latinFontFamily: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute("data-latin-font") || null,
          renderHTML: (attributes: { latinFontFamily?: string | null }) => (
            attributes.latinFontFamily ? { "data-latin-font": attributes.latinFontFamily } : {}
          ),
        },
        trackingPercent: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const raw = element.getAttribute("data-tracking");
            if (raw == null || raw === "") return null;
            const value = Number(raw);
            return Number.isFinite(value) ? value : null;
          },
          renderHTML: (attributes: { trackingPercent?: number | null }) => (
            typeof attributes.trackingPercent === "number" ? { "data-tracking": String(attributes.trackingPercent) } : {}
          ),
        },
        scalePercent: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const raw = element.getAttribute("data-scale");
            if (raw == null || raw === "") return null;
            const value = Number(raw);
            return Number.isFinite(value) ? value : null;
          },
          renderHTML: (attributes: { scalePercent?: number | null }) => (
            typeof attributes.scalePercent === "number" ? { "data-scale": String(attributes.scalePercent) } : {}
          ),
        },
      },
    }];
  },
  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key,
      state: {
        init: (_, state) => decorations(state.doc),
        apply: (transaction, previous) => transaction.docChanged ? decorations(transaction.doc) : previous,
      },
      props: { decorations: (state) => key.getState(state) },
      // A stored Latin face applies to the next character of either script. Take it back off Urdu.
      appendTransaction(transactions, _old, state) {
        if (!transactions.some((tr) => tr.docChanged)) return null;
        if (transactions.some((tr) => tr.getMeta(stripKey))) return null;
        const type = state.schema.marks.textStyle;
        if (!type) return null;
        let min = state.doc.content.size;
        let max = 0;
        let touched = false;
        for (const tr of transactions) {
          tr.steps.forEach((step, index) => {
            const later = tr.mapping.slice(index + 1);
            step.getMap().forEach((_from, _to, start, end) => {
              touched = true;
              min = Math.min(min, later.map(start, -1));
              max = Math.max(max, later.map(end, 1));
            });
          });
        }
        if (!touched || max <= min) return null;
        const jobs: { from: number; to: number; attrs: Record<string, unknown> }[] = [];
        state.doc.nodesBetween(Math.max(0, min), Math.min(state.doc.content.size, max), (node, pos) => {
          if (!node.isText || !node.text) return;
          const mark = node.marks.find((item) => item.type === type);
          if (!mark) return;
          const attrs = mark.attrs as Record<string, unknown>;
          if (!attrs.latinFontFamily && !latinFamily(attrs.fontFamily)) return;
          for (const match of node.text.matchAll(/\p{Script=Arabic}+/gu)) {
            const start = pos + (match.index ?? 0);
            const end = start + match[0].length;
            if (end <= Math.max(0, min) || start >= max) continue;
            const next: Record<string, unknown> = { ...attrs, latinFontFamily: null };
            if (latinFamily(next.fontFamily)) next.fontFamily = null;
            jobs.push({ from: start, to: end, attrs: next });
          }
        });
        if (jobs.length === 0) return null;
        jobs.sort((a, b) => b.from - a.from);
        let tr = state.tr;
        // Keep the Latin face available for the next Latin character after it is removed from Urdu.
        const inherit = state.storedMarks ?? (state.selection.empty ? state.selection.$from.marks() : null);
        for (const job of jobs) {
          tr = tr.removeMark(job.from, job.to, type);
          if (liveAttrs(job.attrs)) tr = tr.addMark(job.from, job.to, type.create(job.attrs));
        }
        if (inherit) tr.setStoredMarks(inherit);
        tr.setMeta(stripKey, true);
        return tr.docChanged ? tr : null;
      },
    })];
  },
});
