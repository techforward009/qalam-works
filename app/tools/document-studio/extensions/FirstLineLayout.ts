import { ReplaceStep } from "@tiptap/pm/transform";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { getQalamPaginationState } from "./QalamPagination";
import { firstLinePaintShift } from "../utils/firstLinePaint";

export interface FirstLineRun { block: number; from: number; to: number; offset: number; empty: boolean; selectionOffset?: number; page?:number; width?:number; height?:number }
interface LineState { blocks: number[]; runs: FirstLineRun[]; decorations: DecorationSet; dirty: Set<number>; textOnly:boolean }
export const firstLineKey = new PluginKey<LineState>("qalam-first-line");
const MEASURE = "qalam-first-line-measure";
function blockAt(doc: PMNode, pos: number): number | null {
  const resolved = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  for (let depth = resolved.depth; depth > 0; depth--) if (resolved.node(depth).isTextblock) return resolved.before(depth);
  return null;
}
function decorate(run: FirstLineRun): Decoration[] {
  // Empty paragraphs have no text to move. StudioCaret reads the same offset.
  return run.empty ? [] : [Decoration.inline(run.from, run.to, {
    "data-studio-line-run": "true", "data-studio-line-selection-offset": String(run.selectionOffset ?? 0), style: `position:relative;top:${run.offset}px`,
  }, { inclusiveStart: true, inclusiveEnd: true })];
}
export function firstLineRunAt(state: EditorState, pos: number): FirstLineRun | undefined {
  return firstLineKey.getState(state)?.runs.find(run => pos >= run.from && pos <= run.to);
}

/** Offsets and decorations belong to plugin state. Selection-only transactions
 * retain their identity; edits map them and invalidate only changed blocks. */
export function createFirstLinePlugin(): Plugin<LineState> {
  return new Plugin<LineState>({
    key: firstLineKey,
    state: {
      init(_, state) {
        const blocks: number[] = [];
        state.doc.descendants((node, pos) => { if (node.isTextblock) { blocks.push(pos); return false; } });
        return { blocks, runs: [], decorations: DecorationSet.empty, dirty: new Set<number>(), textOnly:false };
      },
      apply(tr, previous) {
        let next = previous;
        if (tr.docChanged) {
          const blocks = new Set<number>();
          for (const pos of previous.blocks) {
            const mapped = tr.mapping.mapResult(pos, 1);
            if (!mapped.deleted) blocks.add(mapped.pos);
          }
          const dirty = new Set<number>();
          tr.mapping.maps.forEach((map, index) => map.forEach((_a, _b, from, to) => {
            const rest = tr.mapping.slice(index + 1);
            const start = Math.max(0, rest.map(from, -1)), end = Math.min(tr.doc.content.size, rest.map(to, 1));
            tr.doc.nodesBetween(start, end, (node, pos) => { if (node.isTextblock) { blocks.add(pos); dirty.add(pos); return false; } });
            for (const edge of [start, end]) { const pos = blockAt(tr.doc, edge); if (pos !== null) { blocks.add(pos); dirty.add(pos); } }
          }));
          const runs = previous.runs.flatMap(run => {
            const block = tr.mapping.mapResult(run.block, 1), from = tr.mapping.mapResult(run.from, -1), to = tr.mapping.mapResult(run.to, 1);
            return block.deleted || (from.deletedAcross && to.deletedAcross) ? [] : [{ ...run, block: block.pos, from: from.pos, to: to.pos }];
          });
          const textOnly = tr.steps.every((step,index) => {
            if (!(step instanceof ReplaceStep) || step.slice.openStart || step.slice.openEnd) return false;
            let text = true; step.slice.content.forEach(node => { if (!node.isText) text = false; });
            const from = tr.docs[index].resolve(step.from), to = tr.docs[index].resolve(step.to);
            return text && from.parent.isTextblock && from.sameParent(to);
          });
          next = { blocks: [...blocks].sort((a,b) => a-b), runs, dirty, textOnly, decorations: previous.decorations.map(tr.mapping, tr.doc) };
        }
        const measured = tr.getMeta(MEASURE) as { blocks: number[]; runs: FirstLineRun[] } | undefined;
        if (measured) {
          const affected = new Set(measured.blocks);
          let decorations = next.decorations;
          const remove = next.runs.filter(run => affected.has(run.block)).flatMap(run => decorations.find(run.from, run.to));
          decorations = decorations.remove(remove).add(tr.doc, measured.runs.flatMap(decorate));
          const dirty = new Set(next.dirty); measured.blocks.forEach(pos => dirty.delete(pos));
          next = { ...next, dirty, decorations, runs: [...next.runs.filter(run => !affected.has(run.block)), ...measured.runs] };
        }
        return next;
      },
    },
    props: { decorations: state => firstLineKey.getState(state)!.decorations },
    view: view => new FirstLineView(view),
  });
}

class FirstLineView {
  private raf = 0;
  private observer: ResizeObserver;
  private context = document.createElement("canvas").getContext("2d");
  private scroller: HTMLElement | null;
  private full = true;
  private sizes = new WeakMap<Element,{width:number;height:number}>();
  private observed = new Set<Element>();
  constructor(private view: EditorView) {
    this.scroller = view.dom.closest("[data-studio-scroller]");
    this.observer = new ResizeObserver(this.schedule); this.observer.observe(view.dom);
    this.scroller?.addEventListener("scroll", this.schedule, { passive: true });
    window.addEventListener("resize", this.schedule);
    document.fonts.addEventListener("loadingdone", this.schedule);
    this.schedule();
  }
  update(view: EditorView, previous: EditorState) {
    this.view = view;
    if (getQalamPaginationState({ state: previous })?.geometry !== getQalamPaginationState({ state: view.state })?.geometry) this.schedule();
    else if (previous.doc !== view.state.doc) {
      if (firstLineKey.getState(view.state)?.textOnly) this.enqueue(); else this.schedule();
    }
  }
  private schedule = () => { this.full = true; this.enqueue(); };
  private enqueue = () => { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; const full = this.full; this.full = false; this.measure(full); }); };
  private measure(full: boolean) {
    const view = this.view, state = firstLineKey.getState(view.state)!;
    const changedRuns = state.runs.filter(run => state.dirty.has(run.block));
    if (!full && !changedRuns.length) return; // ResizeObserver catches wrapping in ordinary body blocks.
    const geometry = getQalamPaginationState({ state: view.state })?.geometry;
    const clip = this.scroller?.getBoundingClientRect();
    if (!geometry?.enabled) {
      if (state.runs.length) view.dispatch(view.state.tr.setMeta(MEASURE,{blocks:[...new Set(state.runs.map(run=>run.block))],runs:[]}).setMeta("addToHistory",false));
      return;
    }
    if (!clip || !state.blocks.length) return;
    const root = view.dom.getBoundingClientRect();
    const scale = root.width / geometry.pageWidthPx;
    const stride = (geometry.pageHeightPx + geometry.gapPx) * scale;
    const firstPage = Math.max(0, Math.floor((clip.top - root.top) / stride));
    const lastPage = Math.max(firstPage, Math.floor((clip.bottom - root.top) / stride));
    const affected = new Set<number>(), runs: FirstLineRun[] = [];
    // Binary search the cached block index. No document-wide DOM walk on input.
    const blockIndexAt = (y: number) => {
      let lo = 0, hi = state.blocks.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1, dom = view.nodeDOM(state.blocks[mid]) as HTMLElement | null;
        if (dom && dom.getBoundingClientRect().bottom < y) lo = mid + 1; else hi = mid;
      }
      return lo;
    };
    const coordinates = new Map<number, {top:number;bottom:number;baseline:number;parent:HTMLElement}>();
    const metrics = new Map<string, number>();
    const natural = (pos: number) => {
      const cached = coordinates.get(pos); if (cached) return cached;
      // Measure a character range, not a bidi-ambiguous caret at a run edge.
      const resolved = view.state.doc.resolve(pos);
      const from = resolved.nodeAfter?.isText ? pos : resolved.nodeBefore?.isText ? pos-1 : pos;
      const to = resolved.nodeAfter?.isText ? pos+1 : pos;
      const dom = view.domAtPos(from), end = view.domAtPos(to);
      const range = document.createRange(); range.setStart(dom.node,dom.offset); range.setEnd(end.node,end.offset);
      const rects = [...range.getClientRects()].filter(rect => rect.height > 0);
      const coords = rects[rects.length-1] ?? view.coordsAtPos(pos);
      let owner = dom.node;
      if (owner.nodeType !== Node.TEXT_NODE) owner = owner.childNodes[dom.offset] ?? owner.childNodes[Math.max(0, dom.offset-1)] ?? owner;
      while (owner.firstChild && owner.nodeType !== Node.TEXT_NODE) owner = owner.firstChild;
      const parent = (owner.nodeType === Node.TEXT_NODE ? owner.parentElement : owner) as HTMLElement;
      const painted = parent.closest<HTMLElement>("[data-studio-line-run]");
      const prior = painted ? parseFloat(painted.style.top) || 0 : 0;
      const font = getComputedStyle(parent).font;
      let ascent = metrics.get(font);
      if (ascent === undefined) { if (this.context) this.context.font = font; ascent = this.context?.measureText("ا").fontBoundingBoxAscent ?? (coords.bottom-coords.top)/scale; metrics.set(font, ascent); }
      const top = coords.top - prior * scale, bottom = coords.bottom - prior * scale;
      const result = {top,bottom,baseline:top+ascent*scale,parent};
      coordinates.set(pos,result); return result;
    };
    for (let page = firstPage; page <= lastPage; page++) {
      const frameTop = root.top + page * stride + geometry.marginTopPx * scale;
      const frameBottom = root.top + page * stride + (geometry.pageHeightPx - geometry.marginBottomPx) * scale;
      if (frameTop < clip.top - 100 || frameTop > clip.bottom + 100) continue;
      const cached = !full ? changedRuns.find(run => run.page === page) : undefined;
      if (!full && !cached) continue;
      const index = cached ? state.blocks.indexOf(cached.block) : blockIndexAt(frameTop - 1);
      for (let candidate = index; candidate <= Math.min(index + 1, state.blocks.length - 1); candidate++) {
        const block = state.blocks[candidate], node = view.state.doc.nodeAt(block)!;
        const dom = view.nodeDOM(block) as HTMLElement | null;
        if (!dom) continue;
        const bounds = dom.getBoundingClientRect();
        if (bounds.top >= frameBottom || bounds.bottom < frameTop - 1) continue;
        affected.add(block);
        const start = block + 1, end = start + node.content.size;
        const size = this.sizes.get(dom) ?? cached;
        const unchangedSize = cached && size && Math.abs((size.height ?? -1)*scale-bounds.height)<0.1 && Math.abs((size.width ?? -1)*scale-bounds.width)<0.1;
        this.sizes.set(dom,{width:bounds.width/scale,height:bounds.height/scale});
        let from = unchangedSize ? cached.from : start;
        // Locate the first visual line if a paragraph spans a page boundary.
        if (!unchangedSize && end > start && natural(start).bottom < frameTop) {
          let lo = start, hi = end;
          while (lo < hi) { const mid = (lo + hi) >>> 1; if (natural(mid).bottom < frameTop) lo = mid + 1; else hi = mid; }
          from = lo;
        }
        const first = natural(from);
        if (first.top >= frameBottom) continue;
        let lo = unchangedSize ? cached.to : from, hi = unchangedSize ? cached.to : end;
        while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (natural(mid).baseline <= first.baseline + 1) lo = mid; else hi = mid - 1; }
        const to = lo;
        let lineTop = first.top, inkTop = first.top, inkBottom = first.bottom;
        let leading = parseFloat(getComputedStyle(dom).lineHeight)*scale || first.bottom-first.top;
        let measuredText = false;
        // Visit model runs only within this one visual line, never the whole block.
        view.state.doc.nodesBetween(from,to,(part,pos) => {
          if (!part.isText) return;
          const begin = Math.max(from,pos), finish = Math.min(to,pos+part.nodeSize);
          const glyph = natural(begin), style = getComputedStyle(glyph.parent);
          leading = Math.max(leading,parseFloat(style.lineHeight)*scale || 0);
          let top = glyph.top, bottom = glyph.bottom;
          if (this.context) {
            this.context.font = style.font;
            const metrics = this.context.measureText(part.text!.slice(begin-pos,finish-pos));
            const ascent = metrics.fontBoundingBoxAscent ?? (glyph.baseline-glyph.top)/scale;
            top = glyph.top+(ascent-metrics.actualBoundingBoxAscent)*scale;
            bottom = Math.max(bottom,glyph.top+(ascent+metrics.actualBoundingBoxDescent)*scale);
          }
          lineTop = measuredText ? Math.min(lineTop,glyph.top) : glyph.top;
          inkTop = measuredText ? Math.min(inkTop,top) : top;
          inkBottom = measuredText ? Math.max(inkBottom,bottom) : bottom;
          measuredText = true;
        });
        const layoutTop = from === start && bounds.top >= frameTop-1 ? bounds.top : lineTop-(leading-(first.bottom-first.top))/2;
        const offset = firstLinePaintShift(lineTop,inkTop,Math.max(inkBottom,layoutTop+leading),frameTop,frameBottom,layoutTop,scale)/scale;
        runs.push({block,from,to,offset,empty:from===to,selectionOffset:(frameTop-lineTop)/scale-offset,page,width:bounds.width/scale,height:bounds.height/scale});
        break; // Only the FIRST line of this page receives an offset.
      }
    }
    // Old page-start candidates displaced by edits must return to normal flow.
    if (full) {
      const startIndex = blockIndexAt(clip.top - 100), endIndex = Math.min(state.blocks.length-1,blockIndexAt(clip.bottom+100));
      const visibleStart = state.blocks[startIndex] ?? Infinity, visibleEnd = state.blocks[endIndex] ?? -Infinity;
      for (const run of state.runs) if (run.block >= visibleStart && run.block <= visibleEnd) affected.add(run.block);
      const visible = new Set<Element>();
      for (let i=startIndex;i<=endIndex;i++) { const dom = view.nodeDOM(state.blocks[i]); if (dom instanceof Element) visible.add(dom); }
      for (const dom of this.observed) if (!visible.has(dom)) this.observer.unobserve(dom);
      for (const dom of visible) if (!this.observed.has(dom)) this.observer.observe(dom);
      this.observed = visible;
    }
    const blocks = [...affected];
    const prior = state.runs.filter(run => affected.has(run.block));
    const same = prior.length === runs.length && runs.every(run => prior.some(old => old.block === run.block && old.empty === run.empty && old.page === run.page && old.from === run.from && old.to === run.to && Math.abs(old.offset - run.offset) < 0.05 && Math.abs((old.selectionOffset ?? 0) - (run.selectionOffset ?? 0)) < 0.05));
    if (same) return;
    view.dispatch(view.state.tr.setMeta(MEASURE, { blocks, runs }).setMeta("addToHistory", false));
    document.dispatchEvent(new Event("selectionchange"));
  }
  destroy() {
    cancelAnimationFrame(this.raf); this.observer.disconnect();
    this.scroller?.removeEventListener("scroll", this.schedule);
    window.removeEventListener("resize", this.schedule);
    document.fonts.removeEventListener("loadingdone", this.schedule);
  }
}
