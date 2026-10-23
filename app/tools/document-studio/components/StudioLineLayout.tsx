"use client";

import { useLayoutEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** Align the font's first line box with the frame, retaining its normal ascent.
 * Relative inline paint offsets do not alter line wrapping or pagination flow;
 * overflow stays visible so Nastaliq ascenders are never clipped. */
export function StudioLineLayout({ editor }: { editor: Editor | null }) {
  useLayoutEffect(() => {
    if (!editor) return;
    const key = new PluginKey("qalam-line-paint");
    const offsets = new Map<number, number>();
    editor.registerPlugin(new Plugin({
      key,
      props: { decorations(state) {
        const runs: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (!node.isTextblock) return;
          runs.push(Decoration.node(pos, pos + node.nodeSize, { "data-studio-line-block": String(pos) }));
          if (node.content.size) runs.push(Decoration.inline(pos + 1, pos + 1 + node.content.size, {
            "data-studio-line-run": "true",
            style: `position:relative;top:${offsets.get(pos) ?? 0}px`,
          }));
          return false;
        });
        return DecorationSet.create(state.doc, runs);
      } },
    }));
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (editor.isDestroyed) return;
        const root = editor.view.dom;
        const scale = root.getBoundingClientRect().width / parseFloat(getComputedStyle(root).width) || 1;
        const rootStyle = getComputedStyle(root);
        const marginTop = parseFloat(rootStyle.paddingTop) * scale;
        const pages = [...(root.closest("[data-studio-zoom-surface]")?.querySelectorAll("[data-studio-page-paper]") ?? [])].map(page => page.getBoundingClientRect());
        const blocks = [...root.querySelectorAll<HTMLElement>("[data-studio-line-block]")];
        let changed = false;
        for (const block of blocks) {
          const pos = Number(block.dataset.studioLineBlock);
          const prior = offsets.get(pos) ?? 0;
          const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
          let firstTop = Infinity;
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (text instanceof HTMLBRElement) break;
            if (text.nodeType !== Node.TEXT_NODE || !text.textContent?.length) continue;
            const range = document.createRange();
            range.setStart(text, 0); range.setEnd(text, 1);
            firstTop = Math.min(firstTop, range.getBoundingClientRect().top);
          }
          const unpaintedTop = firstTop - prior * scale;
          let frameTop = block.getBoundingClientRect().top;
          // A pagination float may leave the paragraph's block box on the
          // previous sheet. Anchor its first visible line to its actual frame.
          for (const page of pages) {
            if (page.top + marginTop <= unpaintedTop + 1) frameTop = Math.max(frameTop, page.top + marginTop);
            else break;
          }
          const next = Number.isFinite(firstTop) ? (frameTop - unpaintedTop) / scale : 0;
          if (Math.abs(next - prior) > 0.01) { offsets.set(pos, next); changed = true; }
        }
        if (changed) {
          editor.view.updateState(editor.state);
          document.dispatchEvent(new Event("selectionchange"));
        }
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(editor.view.dom);
    editor.on("transaction", update);
    document.fonts.addEventListener("loadingdone", update);
    window.addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(raf); observer.disconnect();
      editor.off("transaction", update);
      document.fonts.removeEventListener("loadingdone", update);
      window.removeEventListener("resize", update);
      if (!editor.isDestroyed) editor.unregisterPlugin(key);
    };
  }, [editor]);
  return null;
}
