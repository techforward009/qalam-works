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
    const lines: { pos: number; top: number; bottom: number; splitPos?: number }[] = [];
    view.state.doc.forEach((node, offset) => {
      const dom = view.nodeDOM(offset);
      if (!(dom instanceof HTMLElement) || !node.isBlock) return;
      const rect = dom.getBoundingClientRect();
      const top = rect.top - origin.top;
      const bottom = rect.bottom - origin.top;
      const metric: { pos: number; top: number; bottom: number; splitPos?: number } = {
        pos: Math.max(1, offset + 1),
        top,
        bottom,
      };
      if (bottom - top > pageHeightPx + 0.5) {
        const hit = view.posAtCoords({
          left: origin.left + Math.min(24, Math.max(8, origin.width / 2)),
          top: origin.top + top + pageHeightPx,
        });
        if (hit) metric.splitPos = hit.pos;
      }
      lines.push(metric);
    });
    return collectPageGapBreaksFromLines(lines, pageHeightPx, gapPx);
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
      const recompute = () => {
        scheduled = false;
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
