import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

const key = new PluginKey<DecorationSet>("studioLatinScriptRuns");
const stripKey = "studioLatinFaceStrip";
const LATIN = /^(inter|arial|arial unicode ms|times|times new roman|tahoma|calibri|georgia|verdana|courier new|cambria|segoe ui|helvetica)$/i;

export function bareFamily(family: unknown): string {
  return String(family ?? "").replace(/["']/g, "").split(",")[0].trim();
}

export function isLatinFamilyName(family: unknown): boolean {
  return LATIN.test(bareFamily(family));
}

const LATIN_CONTINUE = /[\p{N}\s.,:;!?'"()/_+%=@#&-]/u;

type Slot = "ar" | "lat" | "mark" | "zw" | "other";

function slotOf(ch: string): Slot {
  if (ch === "\u200C" || ch === "\u200D") return "zw";
  // Harakat, tatweel, "،" and "؟" are Script_Extensions=Arabic even when Script is Inherited or Common.
  if (/\p{Script_Extensions=Arabic}/u.test(ch)) return "ar";
  if (/\p{M}/u.test(ch)) return "mark";
  if (/\p{Script=Latin}/u.test(ch)) return "lat";
  return "other";
}

/** One classification for Arabic and Latin, so a combining mark never changes script or splits a word. */
function classify(text: string): Slot[] {
  const kinds: Slot[] = new Array(text.length);
  for (let i = 0; i < text.length; i += 1) kinds[i] = slotOf(text[i]);
  for (let i = 0; i < kinds.length; i += 1) {
    if (kinds[i] !== "mark") continue;
    let j = i - 1;
    while (j >= 0 && (kinds[j] === "mark" || kinds[j] === "zw")) j -= 1;
    if (j >= 0 && (kinds[j] === "ar" || kinds[j] === "lat")) kinds[i] = kinds[j];
  }
  for (let i = 0; i < kinds.length; i += 1) {
    if (kinds[i] !== "zw") continue;
    const left = i > 0 ? kinds[i - 1] : "other";
    const right = i + 1 < kinds.length ? kinds[i + 1] : "other";
    if (left === "ar" || right === "ar") kinds[i] = "ar";
    else if (left === "lat" || right === "lat") kinds[i] = "lat";
  }
  // A Latin phrase keeps its spaces, digits and ordinary punctuation, matching the
  // previous run, but it stops at Arabic letters, harakat, tatweel, "،" and "؟".
  for (let i = 0; i < kinds.length; i += 1) {
    if (kinds[i] !== "lat") continue;
    let j = i + 1;
    while (j < kinds.length && kinds[j] === "other" && LATIN_CONTINUE.test(text[j])) {
      kinds[j] = "lat";
      j += 1;
    }
  }
  return kinds;
}

export function scriptRanges(text: string, script: "arabic" | "latin"): Array<{ start: number; end: number }> {
  const want = script === "arabic" ? "ar" : "lat";
  const kinds = classify(text);
  const ranges: Array<{ start: number; end: number }> = [];
  let start = -1;
  for (let i = 0; i < kinds.length; i += 1) {
    if (kinds[i] === want) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      ranges.push({ start, end: i });
      start = -1;
    }
  }
  if (start >= 0) ranges.push({ start, end: kinds.length });
  return ranges;
}

export function hasScript(text: string, script: "arabic" | "latin"): boolean {
  return scriptRanges(text, script).length > 0;
}

/**
 * scaleX is ignored on a plain inline span. inline-block makes it paint, and the
 * inline-end margin pulls the layout box toward the visual width so neighbours
 * do not sit under the glyphs. The caret still follows the unscaled advances
 * inside the transformed box.
 */
export function latinScaleCss(scale: number, sample: string): string {
  const factor = scale / 100;
  const em = Math.max(sample.length, 1) * 0.5;
  const margin = (factor - 1) * em;
  return `display:inline-block;transform:scaleX(${factor});transform-origin:left center;vertical-align:baseline;margin-inline-end:${margin.toFixed(3)}em`;
}

function latinVisual(attrs: Record<string, unknown>, sample: string): string {
  const face = bareFamily(attrs.latinFontFamily) || (isLatinFamilyName(attrs.fontFamily) ? bareFamily(attrs.fontFamily) : "");
  const parts = [face ? `font-family:"${face}", Arial, sans-serif` : "font-family:var(--qalam-ltr-font, Arial, sans-serif)"];
  const tracking = attrs.trackingPercent;
  const scale = attrs.scalePercent;
  if (typeof tracking === "number" && tracking !== 0) parts.push(`letter-spacing:${tracking / 100}em`);
  if (typeof scale === "number" && scale !== 100) parts.push(latinScaleCss(scale, sample));
  return parts.join(";");
}

function liveAttrs(attrs: Record<string, unknown>): boolean {
  return Object.values(attrs).some((value) => value != null && value !== false && value !== "");
}

function decorations(doc: Node) {
  const spans: Decoration[] = [];
  doc.descendants((block, pos) => {
    if (!block.isTextblock) return;
    block.descendants((node, offset) => {
      if (!node.isText || !node.text) return;
      const attrs = (node.marks.find((mark) => mark.type.name === "textStyle")?.attrs ?? {}) as Record<string, unknown>;
      const explicitLatin = bareFamily(attrs.latinFontFamily) || (isLatinFamilyName(attrs.fontFamily) ? bareFamily(attrs.fontFamily) : "");
      const arabicNeedsFace = isLatinFamilyName(attrs.fontFamily);
      for (const range of scriptRanges(node.text, "latin")) {
        const start = pos + 1 + offset + range.start;
        const sample = node.text.slice(range.start, range.end);
        const style = latinVisual(attrs, sample);
        spans.push(Decoration.inline(start, start + sample.length, explicitLatin
          ? { "data-studio-latin-run": "true", style }
          : { "data-studio-latin-run": "true", "data-studio-latin-default": "true", style }));
      }
      if (!arabicNeedsFace) return;
      for (const range of scriptRanges(node.text, "arabic")) {
        const start = pos + 1 + offset + range.start;
        const sample = node.text.slice(range.start, range.end);
        spans.push(Decoration.inline(start, start + sample.length, {
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
          if (!attrs.latinFontFamily && !isLatinFamilyName(attrs.fontFamily)) return;
          for (const range of scriptRanges(node.text, "arabic")) {
            const start = pos + range.start;
            const end = pos + range.end;
            if (end <= Math.max(0, min) || start >= max) continue;
            const next: Record<string, unknown> = { ...attrs, latinFontFamily: null };
            if (isLatinFamilyName(next.fontFamily)) next.fontFamily = null;
            jobs.push({ from: start, to: end, attrs: next });
          }
        });
        if (jobs.length === 0) return null;
        jobs.sort((a, b) => b.from - a.from);
        let tr = state.tr;
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
