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
  kind: "gap" | "break" | "skip";
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
  span.setAttribute("data-run-around-gap", "true");
  // One pixel under the measured hole so subpixel glyph widths do not wrap the left run.
  const width = widget.size > 2 ? widget.size - 1 : widget.size;
  // Isolate the hole so the RTL line keeps a run on each side of it.
  span.style.cssText = `display:inline-block;width:${width}px;height:0;font-size:0;line-height:0;vertical-align:baseline;unicode-bidi:isolate;direction:ltr;pointer-events:none;`;
  return span;
}

function decorationsFor(doc: PMNode, widgets: PlannedWidget[]): DecorationSet {
  return DecorationSet.create(doc, widgets.map(widget => Decoration.widget(widget.pos, () => widgetElement(widget), {
    side: widget.side,
    ignoreSelection: true,
    key: `run-around-${widget.kind}-${widget.pos}-${widget.side}-${widget.size.toFixed(2)}`,
  })));
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
        // Widths come from the plain paragraph text. A gap widget changes
        // Nastaliq shaping, so measuring the decorated line makes one word
        // jump from side to side on every pass.
        const widths = intrinsicWordWidths(dom, after.text);
        let offset = 0;
        let unit = 0;
        while (offset < after.text.length && glyphs.length < 8000) {
          // wordEnd returns the absolute end, not a length.
          const end = Math.max(offset + 1, wordEnd(after.text, offset));
          const slice = after.text.slice(offset, end);
          const blank = !slice.trim();
          const measured = widths[unit] ?? 0;
          glyphs.push({
            pos: at + offset,
            width: measured > 0 ? Math.round(measured * 100) / 100 : blank ? 0 : fallback,
            space: blank,
          });
          offset = end;
          unit += 1;
        }
        at += after.nodeSize;
      }
      if (!glyphs.length) return false;
      const planned = planRunAroundWidgets(glyphs, overlapTop, lineHeight, firstLine => {
        if (!firstLine || !indent) return { left: contentLeft, right: contentRight };
        return rtl
          ? { left: contentLeft, right: contentRight - indent }
          : { left: contentLeft + indent, right: contentRight };
      }, exclusions, rtl ? "rtl" : "ltr");
      widgets.push(...planned);
      return false;
    });
    this.publish(state, widgets);
  }

  private publish(state: RunAroundState | undefined, widgets: PlannedWidget[]) {
    const signature = signatureOf(widgets);
    if (!state || signature === state.signature) {
      this.burst = 0;
      return;
    }
    if (this.burst >= 8) return;
    this.burst += 1;
    const view = this.view;
    view.dispatch(view.state.tr
      .setMeta(META, { decorations: decorationsFor(view.state.doc, widgets), signature })
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
