/**
 * VIEW-ONLY page-gap spacers. Decorations never enter document JSON.
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { PAGE_STACK_GAP_PX, collectPageGapBreaksFromLines, type PageGapBreak } from "./documentView";

export type PageGapGeometry = {
  enabled: boolean;
  pageHeightPx: number;
  gapPx: number;
};

type PageGapPluginState = {
  geometry: PageGapGeometry;
  decorations: DecorationSet;
};

export const pageGapPluginKey = new PluginKey<PageGapPluginState>("qalamPageGaps");
export const PAGE_GAP_GEOMETRY_META = "qalamPageGapGeometry";
const PAGE_GAP_DECO_META = "qalamPageGapDecorations";
export const PAGE_GAP_ATTR = "data-studio-page-gap";

const DISABLED: PageGapGeometry = { enabled: false, pageHeightPx: 0, gapPx: PAGE_STACK_GAP_PX };


export function pageGapProbeXs(rect: { left: number; width: number }, dir: "rtl" | "ltr"): number[] {
  const mid = rect.left + rect.width / 2;
  const inset = Math.min(24, Math.max(8, rect.width / 8));
  if (dir === "rtl") {
    return [rect.left + rect.width - inset, mid, rect.left + inset];
  }
  return [rect.left + inset, mid, rect.left + rect.width - inset];
}

export function resolveInternalPageGapPos(
  view: EditorView,
  origin: DOMRect,
  block: HTMLElement,
  yFromOrigin: number,
  dir: "rtl" | "ltr",
  nodeFrom: number,
  nodeTo: number,
): number | null {
  const innerFrom = nodeFrom + 1;
  const innerTo = Math.max(innerFrom + 1, nodeTo - 1);
  const y = origin.top + yFromOrigin;
  const rect = block.getBoundingClientRect();
  for (const left of pageGapProbeXs(rect, dir)) {
    const hit = view.posAtCoords({ left, top: y });
    if (!hit) continue;
    const pos = Math.min(innerTo, Math.max(innerFrom + 1, hit.pos));
    if (pos > innerFrom && pos < nodeTo) return pos;
  }
  return null;
}

export function makePageGapElement(heightPx: number): HTMLElement {
  const el = document.createElement("span");
  el.setAttribute(PAGE_GAP_ATTR, "true");
  el.className = "qalam-page-gap";
  el.setAttribute("contenteditable", "false");
  el.setAttribute("aria-hidden", "true");
  el.style.display = "block";
  el.style.width = "100%";
  el.style.height = `${Math.max(0, heightPx)}px`;
  el.style.pointerEvents = "none";
  el.style.userSelect = "none";
  el.style.lineHeight = "0";
  el.style.margin = "0";
  el.style.padding = "0";
  el.style.background = "transparent";
  return el;
}

export function collectPageGapBreaks(
  view: EditorView,
  pageHeightPx: number,
  gapPx: number,
): PageGapBreak[] {
  if (!(pageHeightPx > 0)) return [];
  const pm = view.dom;
  const widgets = Array.from(pm.querySelectorAll<HTMLElement>(`[${PAGE_GAP_ATTR}]`));
  const previous = widgets.map((el) => el.style.display);
  widgets.forEach((el) => {
    el.style.display = "none";
  });
  void pm.offsetHeight;

  try {
    const origin = pm.getBoundingClientRect();
    const lines: { pos: number; top: number; bottom: number }[] = [];
    const blocks: Array<{ el: HTMLElement; dir: "rtl" | "ltr"; from: number; to: number }> = [];
    view.state.doc.forEach((node, offset) => {
      let dom: Node | null = null;
      try {
        if (view.isDestroyed) return;
        dom = view.nodeDOM(offset);
      } catch {
        return;
      }
      if (!(dom instanceof HTMLElement) || !node.isBlock) return;
      const rect = dom.getBoundingClientRect();
      const top = rect.top - origin.top;
      const bottom = rect.bottom - origin.top;
      const computedDir = typeof getComputedStyle === "function" ? getComputedStyle(dom).direction : "";
      const dir: "rtl" | "ltr" =
        node.attrs?.dir === "rtl" || (!node.attrs?.dir && (dom.dir === "rtl" || computedDir === "rtl"))
          ? "rtl"
          : "ltr";
      lines.push({
        pos: Math.max(1, offset + 1),
        top,
        bottom,
      });
      blocks.push({ el: dom, dir, from: offset, to: offset + node.nodeSize });
    });
    return collectPageGapBreaksFromLines(lines, pageHeightPx, gapPx, (line, offsetY) => {
      const block = blocks.find((entry) => entry.from + 1 === line.pos)
        ?? blocks.find((entry) => line.pos > entry.from && line.pos < entry.to);
      if (!block) return null;
      return resolveInternalPageGapPos(view, origin, block.el, line.top + offsetY, block.dir, block.from, block.to);
    });
  } finally {
    widgets.forEach((el, index) => {
      el.style.display = previous[index] ?? "";
    });
  }
}

function decorationSetFromBreaks(doc: EditorView["state"]["doc"], breaks: PageGapBreak[]): DecorationSet {
  return DecorationSet.create(
    doc,
    breaks.map((entry) =>
      Decoration.widget(
        entry.pos,
        () => makePageGapElement(entry.heightPx),
        { side: -1, ignoreSelection: true, key: `qalam-page-gap-${entry.pos}` },
      ),
    ),
  );
}

function breaksKey(breaks: PageGapBreak[]): string {
  return breaks.map((entry) => `${entry.pos}:${Math.round(entry.heightPx)}`).join("|");
}

function createPageGapPlugin() {
  return new Plugin<PageGapPluginState>({
    key: pageGapPluginKey,
    state: {
      init: () => ({ geometry: DISABLED, decorations: DecorationSet.empty }),
      apply(tr, prev) {
        const geometry = (tr.getMeta(PAGE_GAP_GEOMETRY_META) as PageGapGeometry | undefined) ?? prev.geometry;
        const nextDeco = tr.getMeta(PAGE_GAP_DECO_META) as DecorationSet | undefined;
        let decorations = nextDeco ?? prev.decorations.map(tr.mapping, tr.doc);
        if (!geometry.enabled) decorations = DecorationSet.empty;
        return { geometry, decorations };
      },
    },
    props: {
      decorations(state) {
        return pageGapPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
    view(view) {
      let scheduled = false;
      let lastKey = "";
      let destroyed = false;
      const recompute = () => {
        scheduled = false;
        if (destroyed || view.isDestroyed) return;
        const st = pageGapPluginKey.getState(view.state);
        if (!st) return;
        if (!st.geometry.enabled || !(st.geometry.pageHeightPx > 0)) {
          lastKey = "";
          if (st.decorations.find().length > 0) {
            view.dispatch(view.state.tr.setMeta(PAGE_GAP_DECO_META, DecorationSet.empty));
          }
          return;
        }
        const breaks = collectPageGapBreaks(view, st.geometry.pageHeightPx, st.geometry.gapPx);
        const key = breaksKey(breaks);
        if (key === lastKey) return;
        lastKey = key;
        view.dispatch(view.state.tr.setMeta(PAGE_GAP_DECO_META, decorationSetFromBreaks(view.state.doc, breaks)));
      };
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(recompute);
      };
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
      ro?.observe(view.dom);
      schedule();
      return {
        update(view, prevState) {
          const st = pageGapPluginKey.getState(view.state);
          const prev = pageGapPluginKey.getState(prevState);
          if (!st || !prev) return;
          const geoChanged =
            st.geometry.enabled !== prev.geometry.enabled ||
            st.geometry.pageHeightPx !== prev.geometry.pageHeightPx ||
            st.geometry.gapPx !== prev.geometry.gapPx;
          if (view.state.doc !== prevState.doc || geoChanged) schedule();
        },
        destroy() {
          destroyed = true;
          ro?.disconnect();
        },
      };
    },
  });
}

export function applyPageGapGeometry(
  editor: { view: EditorView } | null | undefined,
  geometry: PageGapGeometry,
): void {
  if (!editor?.view) return;
  editor.view.dispatch(editor.view.state.tr.setMeta(PAGE_GAP_GEOMETRY_META, geometry));
}

export const PageGapExtension = Extension.create({
  name: "qalamPageGaps",
  addProseMirrorPlugins() {
    return [createPageGapPlugin()];
  },
});
