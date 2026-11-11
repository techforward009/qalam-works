import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { cancelCanonicalFrame, requestCanonicalFrame, withCanonicalPages } from "../utils/facingPages";
import { getQalamPaginationState } from "./QalamPagination";
import {
  planRunAroundWidgets,
  wordEnd,
  runAroundExclusionPx,
  type RunAroundBox,
} from "../utils/runAroundFlow";

export { applyStoryRunAround, runAroundBrowserProgram } from "../utils/runAroundFlow";
export { planRunAroundWidgets };

export const runAroundKey = new PluginKey<RunAroundState>("qalam-run-around");
export const RUN_AROUND_REFRESH = "qalam-run-around-refresh";
const META = "qalam-run-around-measure";

interface RunAroundState {
  decorations: DecorationSet;
  signature: string;
}

interface Glyph {
  pos: number;
  width: number;
  space?: boolean;
}

interface PlannedWidget {
  pos: number;
  kind: "gap" | "break" | "skip" | "space";
  size: number;
  side: number;
}

const framesOf = new WeakMap<EditorView, RunAroundBox[]>();

export function runAroundFrameKey(frames: readonly RunAroundBox[]): string {
  return frames.map(frame => [
    frame.page, frame.kind, frame.textShape ?? "", frame.angle1Deg ?? "",
    frame.xMm, frame.yMm, frame.wMm, frame.hMm, frame.runAround ? 1 : 0,
    frame.runAroundLeftMm ?? "", frame.runAroundRightMm ?? "", frame.runAroundTopMm ?? "", frame.runAroundBottomMm ?? "",
  ].join(",")).join(";");
}

export function setRunAroundFrames(view: EditorView, frames: readonly RunAroundBox[]): void {
  framesOf.set(view, frames.map(frame => ({ ...frame })));
}

function insideTable(doc: PMNode, pos: number): boolean {
  const resolved = doc.resolve(pos);
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    const name = resolved.node(depth).type.name;
    if (name === "table" || name === "tableCell" || name === "tableHeader") return true;
  }
  return false;
}

function widgetElement(widget: PlannedWidget): HTMLElement {
  if (widget.kind === "break") {
    const rule = document.createElement("br");
    rule.setAttribute("data-run-around-break", "true");
    rule.setAttribute("aria-hidden", "true");
    return rule;
  }
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.setAttribute("contenteditable", "false");
  if (widget.kind === "skip") {
    span.setAttribute("data-run-around-skip", "true");
    span.setAttribute("data-run-around-at", String(widget.pos));
    span.style.cssText = `display:block;clear:both;width:100%;height:${widget.size}px;margin:0;padding:0;border:0;pointer-events:none;`;
    return span;
  }
  if (widget.kind === "space") {
    span.setAttribute("data-run-around-space", "true");
    // Padding beside the space, not an isolate, so the word itself is not stretched.
    span.style.cssText = `display:inline;padding-inline-start:${widget.size}px;line-height:inherit;vertical-align:baseline;pointer-events:none;`;
    return span;
  }
  span.setAttribute("data-run-around-gap", "true");
  // One pixel under an ink-based hole so subpixel glyph widths do not wrap the left run.
  // A trailing pad (side -3) and a filled geometric hole (side -4) keep their exact width.
  const width = widget.side === -3 || widget.side === -4 ? widget.size : widget.size > 2 ? widget.size - 1 : widget.size;
  // Isolate the hole so the RTL line keeps a run on each side of it.
  span.style.cssText = `display:inline-block;width:${width}px;height:0;font-size:0;line-height:0;vertical-align:baseline;unicode-bidi:isolate;direction:ltr;pointer-events:none;`;
  return span;
}

function decorationsFor(
  doc: PMNode,
  widgets: PlannedWidget[],
  justifyBlocks: Array<{ pos: number; size: number }>,
  segments: Array<{ from: number; to: number; style: string }>,
): DecorationSet {
  const decorations = widgets.map(widget => Decoration.widget(widget.pos, () => widgetElement(widget), {
    side: widget.side,
    ignoreSelection: true,
    key: `run-around-${widget.kind}-${widget.pos}-${widget.side}-${widget.size.toFixed(2)}`,
  }));
  for (const segment of segments) {
    if (segment.to <= segment.from) continue;
    decorations.push(Decoration.inline(segment.from, segment.to, {
      "data-run-around-segment": "true",
      style: segment.style,
    }));
  }
  for (const block of justifyBlocks) {
    decorations.push(Decoration.node(block.pos, block.pos + block.size, { "data-run-around-justify": "true" }));
  }
  return DecorationSet.create(doc, decorations);
}

function signatureOf(widgets: readonly PlannedWidget[]): string {
  return widgets.map(widget => `${widget.kind}@${widget.pos}:${widget.side}:${widget.size.toFixed(1)}`).join("|");
}

export function createRunAroundPlugin(): Plugin<RunAroundState> {
  return new Plugin<RunAroundState>({
    key: runAroundKey,
    state: {
      init() {
        return { decorations: DecorationSet.empty, signature: "" };
      },
      apply(tr, previous) {
        const measured = tr.getMeta(META) as RunAroundState | undefined;
        if (measured) return measured;
        if (tr.docChanged) return { decorations: previous.decorations.map(tr.mapping, tr.doc), signature: "" };
        return previous;
      },
    },
    props: {
      decorations(state) {
        return runAroundKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
    view: view => new RunAroundView(view),
  });
}

class RunAroundView {
  private raf = 0;
  private burst = 0;
  private burstKey = "";
  private docEpoch = 0;

  constructor(private view: EditorView) {
    this.schedule();
  }

  update(view: EditorView, previous: { doc: PMNode }) {
    this.view = view;
    if (previous.doc !== view.state.doc) this.docEpoch += 1;
    this.schedule();
  }

  destroy() {
    if (this.raf) cancelCanonicalFrame(this.raf);
    this.raf = 0;
  }

  private schedule = () => {
    if (this.raf || this.view.isDestroyed) return;
    this.raf = requestCanonicalFrame(this.view.dom, () => {
      this.raf = 0;
      if (this.view.isDestroyed || this.view.composing) return;
      withCanonicalPages(this.view.dom, () => this.measure());
    });
  };

  private measure() {
    const view = this.view;
    const state = runAroundKey.getState(view.state);
    const geometry = getQalamPaginationState({ state: view.state })?.geometry;
    const frames = framesOf.get(view) ?? [];
    const burstKey = `${this.docEpoch}:${runAroundFrameKey(frames)}:${geometry?.enabled ? geometry.pageWidthPx : 0}`;
    if (burstKey !== this.burstKey) {
      this.burstKey = burstKey;
      this.burst = 0;
    }
    if (!state || !(geometry && geometry.pageWidthPx > 0)) {
      this.publish(state, []);
      return;
    }
    const root = view.dom.getBoundingClientRect();
    // Pageless keeps the paper width in geometry even when page chrome is off.
    const scale = root.width > 0 ? root.width / geometry.pageWidthPx : 0;
    if (!(scale > 0)) return;
    const stride = geometry.pageHeightPx + geometry.gapPx;
    // Pagination floats insert the bottom margin, gutter, and next top margin
    // between sheets. The planner has to jump that band or a page-1 wrap
    // assigns page-2 holes to the wrong words.
    const pages = geometry.enabled ? {
      stride,
      marginTop: geometry.marginTopPx,
      contentBottom: geometry.pageHeightPx - geometry.marginBottomPx,
    } : null;
    const exclusions = frames.flatMap(frame => {
      const exclusion = runAroundExclusionPx(frame, stride);
      return exclusion ? [exclusion] : [];
    });
    if (!exclusions.length) {
      this.publish(state, []);
      return;
    }
    const toPageX = (clientX: number) => (clientX - root.left) / scale;
    const toPageY = (clientY: number) => (clientY - root.top) / scale;
    const widgets: PlannedWidget[] = [];
    const justifyBlocks: Array<{ pos: number; size: number }> = [];
    const segmentStyles: Array<{ from: number; to: number; style: string }> = [];
    view.state.doc.descendants((node, pos) => {
      if (!node.isTextblock) return;
      if (insideTable(view.state.doc, pos)) return false;
      const dom = view.nodeDOM(pos) as HTMLElement | null;
      if (!dom) return false;
      const bounds = dom.getBoundingClientRect();
      const style = getComputedStyle(dom);
      const padLeft = parseFloat(style.paddingLeft) || 0;
      const padRight = parseFloat(style.paddingRight) || 0;
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderRight = parseFloat(style.borderRightWidth) || 0;
      const contentLeft = toPageX(bounds.left) + padLeft + borderLeft;
      const contentRight = toPageX(bounds.right) - padRight - borderRight;
      const blockTop = toPageY(bounds.top);
      const blockBottom = toPageY(bounds.bottom);
      if (!(contentRight > contentLeft) || !exclusions.some(exclusion => exclusion.top < blockBottom && exclusion.bottom > blockTop && exclusion.left < contentRight && exclusion.right > contentLeft)) return false;
      const contentStart = pos + 1;
      const contentEnd = pos + node.nodeSize - 1;
      const sampleAt = Math.min(contentStart, Math.max(contentStart, contentEnd - 1));
      const sample = view.coordsAtPos(sampleAt);
      // The painted line box, not the CSS line-height. Nastaliq's computed
      // line-height is taller than the line the browser actually wraps, and
      // that stride skipped a second object below the first.
      const painted = Math.max(1, (sample.bottom - sample.top) / scale);
      const cssHeight = parseFloat(style.lineHeight);
      const lineHeight = Number.isFinite(cssHeight) && cssHeight > 0 ? Math.min(cssHeight, painted) : painted;
      // The paragraph border box does not move when gap, break, or skip widgets
      // are inserted inside it. Reading coordsAtPos here would follow those
      // widgets and the next measurement would undo the wrap.
      const borderTop = parseFloat(style.borderTopWidth) || 0;
      const padTop = parseFloat(style.paddingTop) || 0;
      const overlapTop = toPageY(bounds.top) + borderTop + padTop;
      const fallback = (parseFloat(style.fontSize) || 16) * 0.5;
      const indent = parseFloat(style.textIndent) || 0;
      const rtl = style.direction !== "ltr";
      const glyphs: Glyph[] = [];
      for (let at = contentStart; at < contentEnd && glyphs.length < 8000;) {
        const after = view.state.doc.resolve(at).nodeAfter;
        if (!after) break;
        if (!after.isText || !after.text) {
          at += Math.max(1, after.nodeSize);
          continue;
        }
        // Adjacent text nodes are one run. A bold or italic boundary is not
        // a word boundary. A hard break or inline atom ends the run.
        const pieces: TextPiece[] = [];
        const seenFonts = new Map<Element, string>();
        while (at < contentEnd && pieces.length < 400) {
          const next = view.state.doc.resolve(at).nodeAfter;
          if (!next?.isText || !next.text) break;
          // Bold and italic are already separate text nodes. Split only when
          // one node paints Urdu and Latin in different families. Firefox
          // reports a different computed weight than nodeDOM, and splitting
          // on that weight drops marked words onto the object.
          if (!/[A-Za-z0-9]/.test(next.text)) {
            pieces.push({ pos: at, text: next.text, font: fontAtNode(view, at, style) });
          } else {
            let offset = 0;
            while (offset < next.text.length && pieces.length < 2000) {
              const end = Math.max(offset + 1, wordEnd(next.text, offset));
              const font = fontAt(view, at + offset, style, seenFonts);
              const previous = pieces[pieces.length - 1];
              const continues = previous && previous.pos + previous.text.length === at + offset && firstFamily(previous.font) === firstFamily(font);
              if (continues) previous.text += next.text.slice(offset, end);
              else pieces.push({ pos: at + offset, text: next.text.slice(offset, end), font });
              offset = end;
            }
          }
          at += next.nodeSize;
        }
        // Widths come from an undecorated probe. A gap widget changes
        // Nastaliq shaping, so measuring the decorated line makes one word
        // jump from side to side on every pass.
        if (pieces.length === 1 && !/[A-Za-z0-9]/.test(pieces[0].text)) {
          const widths = intrinsicWordWidths(dom, pieces[0].text);
          let offset = 0;
          let unit = 0;
          while (offset < pieces[0].text.length && glyphs.length < 8000) {
            // wordEnd returns the absolute end, not a length.
            const end = Math.max(offset + 1, wordEnd(pieces[0].text, offset));
            const slice = pieces[0].text.slice(offset, end);
            const blank = !slice.trim();
            const measured = widths[unit] ?? 0;
            glyphs.push({
              pos: pieces[0].pos + offset,
              width: measured > 0 ? Math.round(measured * 100) / 100 : blank ? 0 : fallback,
              space: blank,
            });
            offset = end;
            unit += 1;
          }
        } else {
          pushShapedWords(glyphs, dom, pieces, fallback);
        }
      }
      if (!glyphs.length) return false;
      const tagged = dom.getAttribute("data-text-align");
      const alignName = tagged || (style.textAlign === "justify" && style.textAlignLast === "justify" ? "justify-all" : style.textAlign);
      const flow = { pages, align: alignName, segments: [] as Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }> };
      const planned = planRunAroundWidgets(glyphs, overlapTop, lineHeight, firstLine => {
        if (!firstLine || !indent) return { left: contentLeft, right: contentRight };
        return rtl
          ? { left: contentLeft, right: contentRight - indent }
          : { left: contentLeft + indent, right: contentRight };
      }, exclusions, rtl ? "rtl" : "ltr", flow);
      widgets.push(...planned);
      if ((alignName === "justify" || alignName === "justify-all") && planned.length) justifyBlocks.push({ pos, size: node.nodeSize });
      for (const seg of flow.segments) {
        const from = glyphs[seg.from]?.pos;
        const toPos = seg.to < glyphs.length ? glyphs[seg.to].pos : contentEnd;
        if (from == null || toPos <= from || !(seg.wordSpacing > 0.05)) continue;
        segmentStyles.push({
          from,
          to: toPos,
          style: `word-spacing:${seg.wordSpacing.toFixed(2)}px;letter-spacing:0`,
        });
      }
      return false;
    });
    this.publish(state, widgets, justifyBlocks, segmentStyles);
  }

  private publish(
    state: RunAroundState | undefined,
    widgets: PlannedWidget[],
    justifyBlocks: Array<{ pos: number; size: number }> = [],
    segments: Array<{ from: number; to: number; style: string }> = [],
  ) {
    const signature = `${signatureOf(widgets)}#${justifyBlocks.map(block => block.pos).join(",")}#${segments.map(segment => `${segment.from}:${segment.to}:${segment.style}`).join("|")}`;
    if (!state || signature === state.signature) {
      this.burst = 0;
      return;
    }
    if (this.burst >= 8) return;
    this.burst += 1;
    const view = this.view;
    view.dispatch(view.state.tr
      .setMeta(META, { decorations: decorationsFor(view.state.doc, widgets, justifyBlocks, segments), signature })
      .setMeta("addToHistory", false));
  }
}

/** Cursor travel of one word. Ink boxes overlap in Nastaliq, so summing them overstates the run. */
function advanceWidth(node: Text, start: number, end: number): number {
  const caret = (offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    return range.getBoundingClientRect().left;
  };
  const width = Math.abs(caret(end) - caret(start));
  if (width > 0) return width;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return shapedWidth([...range.getClientRects()]);
}

function shapedWidth(rects: DOMRect[]): number {
  const lines = new Map<number, { min: number; max: number }>();
  for (const rect of rects) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    const key = Math.round(rect.top);
    const band = lines.get(key) ?? { min: rect.left, max: rect.right };
    band.min = Math.min(band.min, rect.left);
    band.max = Math.max(band.max, rect.right);
    lines.set(key, band);
  }
  let width = 0;
  for (const band of lines.values()) width = Math.max(width, band.max - band.min);
  return width;
}

interface TextPiece {
  pos: number;
  text: string;
  font: string;
}

function firstFamily(signature: string): string {
  return signature.split("\n")[0].replace(/["']/g, "").split(",")[0].trim().toLowerCase();
}

function fontAtNode(view: EditorView, pos: number, fallback: CSSStyleDeclaration): string {
  const dom = view.nodeDOM(pos);
  const el = dom instanceof Text ? dom.parentElement : dom instanceof HTMLElement ? dom : null;
  return fontSignature(el ? getComputedStyle(el) : fallback);
}

function fontSignature(style: CSSStyleDeclaration): string {
  return [style.fontFamily, style.fontSize, style.fontWeight, style.fontStyle, style.letterSpacing, style.wordSpacing, style.fontFeatureSettings].join("\n");
}

function fontAt(view: EditorView, pos: number, fallback: CSSStyleDeclaration, seen: Map<Element, string>): string {
  let el: Element | null = null;
  try {
    const found = view.domAtPos(pos);
    const node = found.node;
    el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node instanceof Element ? node : null;
  } catch {
    el = null;
  }
  if (!el) return fontSignature(fallback);
  const cached = seen.get(el);
  if (cached) return cached;
  const signature = fontSignature(getComputedStyle(el));
  seen.set(el, signature);
  return signature;
}

function documentPos(pieces: readonly TextPiece[], index: number): number {
  let cursor = 0;
  for (const piece of pieces) {
    if (index < cursor + piece.text.length) return piece.pos + (index - cursor);
    cursor += piece.text.length;
  }
  const last = pieces[pieces.length - 1];
  return last.pos + last.text.length;
}

/** One nowrap probe, with each mark's font kept, so a split word is measured as the browser shapes it. */
function pushShapedWords(glyphs: Glyph[], source: HTMLElement, pieces: readonly TextPiece[], fallback: number): void {
  const style = getComputedStyle(source);
  const joined = pieces.map(piece => piece.text).join("");
  const key = `${style.direction}\n${pieces.map(piece => `${piece.font}\n${piece.text}`).join("\n")}`;
  let widths = intrinsicWidthCache.get(key);
  if (!widths) {
    widths = [];
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = `position:fixed;left:-100000px;top:0;white-space:nowrap;opacity:0;pointer-events:none;direction:${style.direction};`;
    const nodes: Text[] = [];
    for (const piece of pieces) {
      const [family, size, weight, fontStyle, spacing, wordSpacing, features] = piece.font.split("\n");
      const span = document.createElement("span");
      span.style.fontFamily = family;
      span.style.fontSize = size;
      span.style.fontWeight = weight;
      span.style.fontStyle = fontStyle;
      span.style.letterSpacing = spacing;
      span.style.wordSpacing = wordSpacing;
      if (features) span.style.fontFeatureSettings = features;
      span.textContent = piece.text;
      probe.appendChild(span);
      const text = span.firstChild;
      if (text && text.nodeType === Node.TEXT_NODE) nodes.push(text as Text);
    }
    document.body.appendChild(probe);
    const locate = (index: number) => {
      let cursor = 0;
      for (let i = 0; i < pieces.length; i += 1) {
        const len = pieces[i].text.length;
        if (index < cursor + len || i === pieces.length - 1) {
          return { node: nodes[i], offset: Math.max(0, Math.min(len, index - cursor)) };
        }
        cursor += len;
      }
      return { node: nodes[0], offset: 0 };
    };
    if (nodes.length === pieces.length) {
      for (let offset = 0; offset < joined.length;) {
        const end = wordEnd(joined, offset);
        const start = locate(offset);
        const finish = locate(end);
        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(finish.node, finish.offset);
        const startCaret = range.cloneRange();
        startCaret.collapse(true);
        const endCaret = range.cloneRange();
        endCaret.collapse(false);
        let width = Math.abs(endCaret.getBoundingClientRect().left - startCaret.getBoundingClientRect().left);
        if (!(width > 0)) width = shapedWidth([...range.getClientRects()]);
        widths.push(width);
        offset = end;
      }
    }
    probe.remove();
    if (intrinsicWidthCache.size > 80) intrinsicWidthCache.clear();
    intrinsicWidthCache.set(key, widths);
  }
  let unit = 0;
  for (let offset = 0; offset < joined.length && glyphs.length < 8000;) {
    const end = Math.max(offset + 1, wordEnd(joined, offset));
    const slice = joined.slice(offset, end);
    const blank = !slice.trim();
    const measured = widths[unit] ?? 0;
    glyphs.push({
      pos: documentPos(pieces, offset),
      width: measured > 0 ? Math.round(measured * 100) / 100 : blank ? 0 : fallback,
      space: blank,
    });
    offset = end;
    unit += 1;
  }
}

const intrinsicWidthCache = new Map<string, number[]>();

/** Shaped width of each word in `text`, with its real neighbors and no wrap widgets. */
function intrinsicWordWidths(source: HTMLElement, text: string): number[] {
  const style = getComputedStyle(source);
  const key = `${style.fontFamily}\n${style.fontSize}\n${style.fontWeight}\n${style.fontStyle}\n${style.direction}\n${style.letterSpacing}\n${text}`;
  const cached = intrinsicWidthCache.get(key);
  if (cached) return cached;
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:fixed", "left:-100000px", "top:0", "white-space:nowrap", "opacity:0", "pointer-events:none",
    `direction:${style.direction}`, `font-family:${style.fontFamily}`, `font-size:${style.fontSize}`,
    `font-weight:${style.fontWeight}`, `font-style:${style.fontStyle}`, `letter-spacing:${style.letterSpacing}`,
    `word-spacing:${style.wordSpacing}`, `line-height:${style.lineHeight}`,
  ].join(";");
  probe.textContent = text;
  document.body.appendChild(probe);
  const node = probe.firstChild;
  const widths: number[] = [];
  if (node && node.nodeType === Node.TEXT_NODE) {
    for (let offset = 0; offset < text.length;) {
      const end = wordEnd(text, offset);
      widths.push(advanceWidth(node as Text, offset, end));
      offset = end;
    }
  }
  probe.remove();
  if (intrinsicWidthCache.size > 80) intrinsicWidthCache.clear();
  intrinsicWidthCache.set(key, widths);
  return widths;
}
