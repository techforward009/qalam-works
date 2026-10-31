import { preservedSpaceRanges, preservedSpaceStyle } from "../utils/preservedSpaces";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, type Transaction } from "@tiptap/pm/state";
import { AddMarkStep, RemoveMarkStep } from "@tiptap/pm/transform";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

interface LatinRunState { decorations: DecorationSet; widths: Map<string, number>; spaceFont: string }
const key = new PluginKey<LatinRunState>("studioLatinScriptRuns");
const stripKey = "studioLatinFaceStrip";
const spaceFontKey = "studioPreservedSpaceFont";
const scaleMeasureKey = "studioLatinScaleMeasure";
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

/** Words and the spaces between them. Spaces stay their own tokens so a line can break. */
export function latinScaleTokens(text: string): Array<{ text: string; start: number; end: number }> {
  const tokens: Array<{ text: string; start: number; end: number }> = [];
  for (const match of text.matchAll(/\s+|\S+/g)) {
    const token = match[0];
    const start = match.index ?? 0;
    tokens.push({ text: token, start, end: start + token.length });
  }
  return tokens;
}

/**
 * A word is an inline-block so scaleX actually stretches the glyphs (a plain
 * inline box ignores transforms). margin-inline-end, measured from the
 * unscaled offsetWidth, makes the layout slot equal the painted width.
 * Spaces stay ordinary inline text so the line can break, and only their
 * gap is scaled. 100% omits this entirely. The mark span around the Latin
 * run is an LTR isolate, so the atomic word boxes stay in reading order
 * inside an Urdu paragraph. Character-dialog scaling uses the same word boxes
 * for Arabic script, anchored at the right edge so joining and layout agree.
 */
export function latinScaleCss(scale: number, sample = "", rtl = false): string {
  const factor = scale / 100;
  if (/^\s+$/.test(sample)) {
    return "display:inline;white-space:pre-wrap;vertical-align:baseline;line-height:inherit";
  }
  return `display:inline-block;transform:scaleX(${factor});transform-origin:${rtl ? "right" : "left"} center;vertical-align:baseline;white-space:nowrap;line-height:inherit`;
}

export function latinScaleFactor(scale: number): number {
  return scale / 100;
}

/** Measure spaces off the line: a trailing/hanging space has no reliable DOM
 * width. The same routine runs before PDF pagination, so initial wrap positions
 * cannot change the scale compensation or the resulting line ends. */
export function scaleTokenWidth(el: HTMLElement, factor: number, zoom: number, cache: Map<string, number>, contextual = false): number {
  if (el.textContent?.trim()) return el.getBoundingClientRect().width / (factor * zoom);
  contextual = contextual && el.textContent === " " && !el.querySelector("[data-studio-preserved-space]");
  const style = getComputedStyle(el);
  const values = [style.font, style.letterSpacing, style.wordSpacing, style.fontKerning, style.fontFeatureSettings, style.textRendering, style.direction, el.textContent ?? ""];
  // A Nastaliq space can have a contextual advance very different from its
  // isolated U+0020 width. Keep neighbours in the shaping buffer, then measure
  // only the space range. This is shared verbatim with PDF measurement.
  const block = el.closest("p,h1,h2,h3,h4,h5,h6");
  const neighbour = (back: boolean) => {
    let node: globalThis.Node | null = el;
    while (node && node !== block) {
      const sibling: globalThis.Node | null = back ? node.previousSibling : node.nextSibling;
      if (sibling) return (sibling.textContent ?? "").match(back ? /\S+$/u : /^\S+/u)?.[0] ?? "";
      node = node.parentNode;
    }
    return "";
  };
  const prefix = contextual ? neighbour(true) : "", suffix = contextual ? neighbour(false) : "";
  const id = JSON.stringify([...values, prefix, suffix]);
  const cached = cache.get(id);
  if (cached != null) return cached;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;display:inline-block;white-space:pre;transform:none;margin:0;padding:0;border:0;width:auto;left:0;top:0";
  probe.style.font = style.font;
  probe.style.letterSpacing = style.letterSpacing;
  probe.style.wordSpacing = style.wordSpacing;
  probe.style.fontKerning = style.fontKerning;
  probe.style.fontFeatureSettings = style.fontFeatureSettings;
  probe.style.textRendering = style.textRendering;
  probe.style.direction = style.direction;
  probe.textContent = prefix + (el.textContent ?? "") + suffix;
  document.body.append(probe);
  let width = probe.getBoundingClientRect().width;
  if (contextual && probe.firstChild) {
    const range = document.createRange();
    range.setStart(probe.firstChild, prefix.length);
    range.setEnd(probe.firstChild, prefix.length + (el.textContent?.length ?? 0));
    width = range.getBoundingClientRect().width;
  }
  probe.remove();
  cache.set(id, width);
  return width;
}

function scaleWidthKey(pos: number, factor: number, text: string): string {
  return `${pos}\u0000${factor}\u0000${text}`;
}

function remapScaleWidths(widths: Map<string, number>, tr: Transaction): Map<string, number> {
  if (!tr.docChanged || widths.size === 0) return widths;
  const next = new Map<string, number>();
  widths.forEach((px, id) => {
    const sep = id.indexOf("\u0000");
    const pos = Number(id.slice(0, sep));
    const mapped = tr.mapping.mapResult(pos, 1);
    if (!mapped.deleted) next.set(`${mapped.pos}${id.slice(sep)}`, px);
  });
  return next;
}

function latinFaceStyle(attrs: Record<string, unknown>): string {
  const face = bareFamily(attrs.latinFontFamily) || (isLatinFamilyName(attrs.fontFamily) ? bareFamily(attrs.fontFamily) : "");
  const parts = [face ? `font-family:"${face}", Arial, sans-serif` : "font-family:var(--qalam-ltr-font, Arial, sans-serif)"];
  const tracking = attrs.trackingPercent;
  if (typeof tracking === "number" && tracking !== 0) parts.push(`letter-spacing:${tracking / 100}em;word-spacing:0`);
  return parts.join(";");
}

function latinRunAttrs(explicitLatin: boolean, style: string, scale: number | null): Record<string, string> {
  const attrs: Record<string, string> = explicitLatin
    ? { "data-studio-latin-run": "true", style }
    : { "data-studio-latin-run": "true", "data-studio-latin-default": "true", style };
  if (scale != null) attrs["data-studio-latin-scale"] = String(latinScaleFactor(scale));
  return attrs;
}

function liveAttrs(attrs: Record<string, unknown>): boolean {
  return Object.values(attrs).some((value) => value != null && value !== false && value !== "");
}

function decorations(doc: Node, widths: Map<string, number>, spaceFont = "") {
  const spans: Decoration[] = [];
  doc.descendants((block, pos) => {
    if (!block.isTextblock) return;
    block.descendants((node, offset) => {
      if (!node.isText || !node.text) return;
      const attrs = (node.marks.find((mark) => mark.type.name === "textStyle")?.attrs ?? {}) as Record<string, unknown>;
      const explicitLatin = Boolean(bareFamily(attrs.latinFontFamily) || (isLatinFamilyName(attrs.fontFamily) ? bareFamily(attrs.fontFamily) : ""));
      const arabicNeedsFace = isLatinFamilyName(attrs.fontFamily);
      const scale = typeof attrs.scalePercent === "number" && attrs.scalePercent !== 100 ? attrs.scalePercent : null;
      const face = latinFaceStyle(attrs);
      for (const range of scriptRanges(node.text, "latin")) {
        const origin = pos + 1 + offset + range.start;
        const sample = node.text.slice(range.start, range.end);
        if (scale != null && typeof attrs.charScale === "number") {
          spans.push(Decoration.inline(origin, origin + sample.length, { dir: "ltr", style: `${face};unicode-bidi:isolate;direction:ltr` }));
          continue;
        }
        if (scale == null) {
          spans.push(Decoration.inline(origin, origin + sample.length, latinRunAttrs(explicitLatin, face, null)));
          continue;
        }
        for (const token of latinScaleTokens(sample)) {
          const from = origin + token.start;
          const factor = latinScaleFactor(scale);
          const margin = widths.get(scaleWidthKey(from, factor, token.text));
          const tokenStyle = `${face};${latinScaleCss(scale, token.text)}${margin == null ? "" : `;margin-inline-end:${margin.toFixed(2)}px`}`;
          spans.push(Decoration.inline(from, origin + token.end, latinRunAttrs(explicitLatin, tokenStyle, scale)));
        }
      }
      // Character scale applies to whole shaped words, never a mark-sized box
      // or individual Arabic letters. Spaces remain break opportunities.
      if (scale != null && typeof attrs.charScale === "number") {
        let rtl = block.attrs.dir !== "ltr";
        for (const token of latinScaleTokens(node.text)) {
          const from = pos + 1 + offset + token.start;
          if (token.text.trim()) rtl = hasScript(token.text, "arabic");
          const factor = latinScaleFactor(scale);
          const margin = widths.get(scaleWidthKey(from, factor, token.text));
          const style = `${latinScaleCss(scale, token.text, rtl)};direction:${rtl ? "rtl" : "ltr"}${margin == null ? "" : `;margin-inline-end:${margin}px`}`;
          spans.push(Decoration.inline(from, pos + 1 + offset + token.end, {
            "data-studio-latin-scale": String(factor), style,
          }));
        }
      }
      const atLineEnd = offset + node.nodeSize === block.content.size || block.childAfter(offset + node.nodeSize).node?.type.name === "hardBreak";
      for (const range of preservedSpaceRanges(node.text,atLineEnd)) {
        spans.push(Decoration.inline(pos+1+offset+range.start,pos+1+offset+range.end,{
          "data-studio-preserved-space":"true",style:preservedSpaceStyle(bareFamily(attrs.fontFamily) || spaceFont),
        }));
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

function scaledWord(el: Element | null): HTMLElement | null {
  if (!(el instanceof HTMLElement)) return null;
  const word = el.closest("[data-studio-latin-scale]");
  if (!(word instanceof HTMLElement)) return null;
  if (word.style.display !== "inline-block") return null;
  if (!word.style.transform.includes("scaleX")) return null;
  return word;
}

function wordAtPoint(root: HTMLElement, x: number, y: number, target: EventTarget | null): HTMLElement | null {
  const direct = scaledWord(target instanceof Element ? target : null);
  if (direct) {
    const rect = direct.getBoundingClientRect();
    if (x >= rect.left - 1 && x <= rect.right + 1 && y >= rect.top - 2 && y <= rect.bottom + 2) return direct;
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-studio-latin-scale]")) {
    if (el.style.display !== "inline-block" || !el.style.transform.includes("scaleX")) continue;
    const rect = el.getBoundingClientRect();
    if (x >= rect.left - 0.5 && x <= rect.right + 0.5 && y >= rect.top - 1 && y <= rect.bottom + 1) return el;
  }
  return null;
}

/** Visual fraction across a uniform scaleX, mapped with the unscaled glyph advances. */
function offsetInWord(el: HTMLElement, clientX: number): number {
  const textNode = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode() as Text | null;
  const text = textNode?.data ?? "";
  if (!text) return 0;
  const rect = el.getBoundingClientRect();
  const rtl = getComputedStyle(el).direction === "rtl";
  const x = rtl ? rect.right - clientX : clientX - rect.left;
  const fraction = rect.width > 0 ? Math.min(1, Math.max(0, x / rect.width)) : 0;
  const range = document.createRange();
  range.selectNodeContents(textNode!);
  const full = range.getBoundingClientRect();
  let best = 0, distance = Infinity;
  for (let i = 0; i <= text.length; i++) {
    range.setEnd(textNode!, i);
    const part = range.getBoundingClientRect();
    const advance = full.width > 0 ? part.width / full.width : 0;
    if (Math.abs(advance - fraction) < distance) { distance = Math.abs(advance - fraction); best = i; }
  }
  return best;
}

function posInWord(view: EditorView, el: HTMLElement, clientX: number): number | null {
  const textNode = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode() as Text | null;
  if (!textNode) return null;
  const offset = Math.max(0, Math.min(textNode.data.length, offsetInWord(el, clientX)));
  try { return view.posAtDOM(textNode, offset); } catch { return null; }
}

function posAtClient(view: EditorView, x: number, y: number): number | null {
  const word = wordAtPoint(view.dom, x, y, null);
  if (word) return posInWord(view, word, x);
  return view.posAtCoords({ left: x, top: y })?.pos ?? null;
}

function scheduleScaleMeasure(timer: { raf: number; attempts: number; view: EditorView }) {
  if (timer.raf) return;
  timer.raf = requestAnimationFrame(() => {
    timer.raf = 0;
    const view = timer.view;
    if (!view.dom.isConnected) return;
    const current = key.getState(view.state);
    if (!current) return;
    const spaceFont = getComputedStyle(view.dom).getPropertyValue("--qalam-rtl-font").trim();
    const next = new Map(current.widths);
    let changed = spaceFont !== current.spaceFont;
    let pending = false;
    const measurements = new Map<string, number>();
    view.dom.querySelectorAll<HTMLElement>("[data-studio-latin-scale]").forEach((el) => {
      const factor = Number(el.getAttribute("data-studio-latin-scale"));
      if (!Number.isFinite(factor) || factor === 1) return;
      const zoom = view.dom.getBoundingClientRect().width / parseFloat(getComputedStyle(view.dom).width) || 1;
      const width = scaleTokenWidth(el, factor, zoom, measurements);
      if (width <= 0) { pending = true; return; }
      const advance = el.textContent?.trim() ? width : scaleTokenWidth(el, factor, zoom, measurements, true);
      const px = Number((advance * factor - width).toFixed(2));
      let pos = -1;
      try { pos = view.posAtDOM(el, 0); } catch { return; }
      const id = scaleWidthKey(pos, factor, el.textContent ?? "");
      const prev = next.get(id);
      // A matching cache entry means this width is already in the decoration.
      // Writing it again just rebuilds the span and restarts line measurement.
      if (prev === px) return;
      next.set(id, px);
      changed = true;
    });
    if (changed) {
      timer.attempts = 0;
      view.dispatch(view.state.tr.setMeta(scaleMeasureKey, next).setMeta(spaceFontKey, spaceFont).setMeta("addToHistory", false));
      return;
    }
    if (pending && timer.attempts < 8) {
      timer.attempts += 1;
      scheduleScaleMeasure(timer);
    }
  });
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
          renderHTML: (attributes: { trackingPercent?: number | null }) => {
            if (typeof attributes.trackingPercent !== "number") return {};
            if (attributes.trackingPercent === 0) return { "data-tracking": "0" };
            return { "data-tracking": String(attributes.trackingPercent), style: `word-spacing:${attributes.trackingPercent / 100}em;letter-spacing:0;text-rendering:geometricPrecision` };
          },
        },
        scalePercent: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const raw = element.getAttribute("data-scale");
            if (raw == null || raw === "") return null;
            const value = Number(raw);
            return Number.isFinite(value) ? value : null;
          },
          renderHTML: (attributes: { scalePercent?: number | null; charScale?: number | null }) => {
            if (typeof attributes.scalePercent !== "number") return {};
            if (attributes.scalePercent === 100) return { "data-scale": "100" };
            const data = { "data-scale": String(attributes.scalePercent) };
            // Character scaling is a real width change on every script, not an LTR isolate.
            // Match PDF's fractional advances instead of platform grid-fitting.
            // Scope this to scaled runs; unscaled text keeps its existing style.
            if (typeof attributes.charScale === "number") {
              return { ...data, style: "text-rendering:geometricPrecision" };
            }
            return { ...data, dir: "ltr", style: "unicode-bidi:isolate;direction:ltr;text-rendering:geometricPrecision" };
          },
        },
      },
    }];
  },
  addProseMirrorPlugins() {
    return [new Plugin<LatinRunState>({
      key,
      state: {
        init: (_, state) => ({ decorations: decorations(state.doc, new Map()), widths: new Map(), spaceFont: "" }),
        apply: (transaction, previous) => {
          const incoming = transaction.getMeta(scaleMeasureKey) as Map<string, number> | undefined;
          const spaceFont = transaction.getMeta(spaceFontKey) as string | undefined;
          if (!transaction.docChanged && !incoming && spaceFont === undefined) return previous;
          const widths = incoming ?? remapScaleWidths(previous.widths, transaction);
          const family = spaceFont ?? previous.spaceFont;
          return { decorations: decorations(transaction.doc, widths, family), widths, spaceFont: family };
        },
      },
      props: {
        decorations: (state) => key.getState(state)?.decorations ?? DecorationSet.empty,
        handleKeyDown(view, event) {
          if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return false;
          const { $head, anchor, head } = view.state.selection;
          if (!$head.parent.isTextblock) return false;
          const marks = [...$head.marks(), ...($head.nodeAfter?.marks ?? []), ...($head.nodeBefore?.marks ?? [])];
          if (!marks.some(mark => mark.type.name === "textStyle" && typeof mark.attrs.scalePercent === "number" && mark.attrs.scalePercent !== 100)) return false;
          // Native extension across atomic inline-block words can collapse back
          // to their edge. Extend the logical grapheme selection, keeping anchor.
          const caretNode = view.domAtPos(head).node;
          const caretElement = caretNode instanceof HTMLElement ? caretNode : caretNode.parentElement;
          const rtl = caretElement ? getComputedStyle(caretElement).direction === "rtl" : $head.parent.attrs.dir === "rtl";
          const backward = (event.key === "ArrowLeft") !== rtl;
          const text = $head.parent.textBetween(0, $head.parent.content.size, "\n", "\ufffc");
          const boundaries = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(part => part.index);
          boundaries.push(text.length);
          const offset = backward ? boundaries.filter(i => i < $head.parentOffset).pop() : boundaries.find(i => i > $head.parentOffset);
          if (offset == null) return false;
          const next = $head.start() + offset;
          if (next === head) return true;
          view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, anchor, next)).scrollIntoView());
          return true;
        },
      },
      view(editorView) {
        const timer = { raf: 0, attempts: 0, view: editorView };
        const schedule = () => scheduleScaleMeasure(timer);
        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(schedule);
          observer.observe(editorView.dom);
        }
        const onFonts = () => schedule();
        document.fonts?.ready?.then(schedule).catch(() => {});
        document.fonts?.addEventListener?.("loadingdone", onFonts);
        schedule();
        let drag: { anchor: number } | null = null;
        const onMove = (event: MouseEvent) => {
          if (!drag) return;
          const view = timer.view;
          const head = posAtClient(view, event.clientX, event.clientY);
          if (head == null) return;
          const selection = TextSelection.create(view.state.doc, drag.anchor, head);
          if (!view.state.selection.eq(selection)) view.dispatch(view.state.tr.setSelection(selection));
        };
        const onUp = () => {
          drag = null;
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        const onDown = (event: MouseEvent) => {
          if (event.button !== 0) return;
          const view = timer.view;
          const word = wordAtPoint(view.dom, event.clientX, event.clientY, event.target);
          if (!word) return;
          const textNode = document.createTreeWalker(word, NodeFilter.SHOW_TEXT).nextNode() as Text | null;
          if (!textNode) return;
          event.preventDefault();
          event.stopPropagation();
          let from = posInWord(view, word, event.clientX);
          let to = from;
          if (event.detail >= 2) {
            try {
              from = view.posAtDOM(textNode, 0);
              to = view.posAtDOM(textNode, textNode.data.length);
            } catch { /* keep the point */ }
          }
          if (from == null) return;
          const anchor = event.shiftKey ? view.state.selection.anchor : from;
          const head = event.shiftKey ? from : (to ?? from);
          const selection = TextSelection.create(view.state.doc, anchor, head);
          view.dispatch(view.state.tr.setSelection(selection));
          view.focus();
          drag = { anchor };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        };
        editorView.dom.addEventListener("mousedown", onDown, true);
        return {
          update(view) {
            timer.view = view;
            timer.attempts = 0;
            schedule();
          },
          destroy() {
            if (timer.raf) cancelAnimationFrame(timer.raf);
            observer?.disconnect();
            document.fonts?.removeEventListener?.("loadingdone", onFonts);
            editorView.dom.removeEventListener("mousedown", onDown, true);
            onUp();
          },
        };
      },
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
            if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) {
              const scale = (step.mark.attrs as { scalePercent?: number | null }).scalePercent;
              if (typeof scale !== "number" || scale === 100) return;
              touched = true;
              min = Math.min(min, later.map(step.from, -1));
              max = Math.max(max, later.map(step.to, 1));
            }
          });
        }
        if (!touched || max <= min) return null;
        const jobs: { from: number; to: number; attrs: Record<string, unknown> }[] = [];
        state.doc.nodesBetween(Math.max(0, min), Math.min(state.doc.content.size, max), (node, pos) => {
          if (!node.isText || !node.text) return;
          const mark = node.marks.find((item) => item.type === type);
          if (!mark) return;
          const attrs = mark.attrs as Record<string, unknown>;
          const scaled = typeof attrs.scalePercent === "number" && attrs.scalePercent !== 100;
          if (!attrs.latinFontFamily && !isLatinFamilyName(attrs.fontFamily) && !scaled) return;
          for (const range of scriptRanges(node.text, "arabic")) {
            const start = pos + range.start;
            const end = pos + range.end;
            if (end <= Math.max(0, min) || start >= max) continue;
            const next: Record<string, unknown> = { ...attrs, latinFontFamily: null };
            if (isLatinFamilyName(next.fontFamily)) next.fontFamily = null;
            if (scaled && typeof attrs.charScale !== "number") next.scalePercent = null;
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
