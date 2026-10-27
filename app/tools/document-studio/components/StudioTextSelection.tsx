"use client";
import {pageProjection,projectPoint,withCanonicalPages} from "../utils/facingPages";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { selectedLineBoxes, type TextLineBox } from "../utils/textLineBoxes";

const EMPTY_BOXES: TextLineBox[] = [];

/** Native textarea selection is retained; only the main editor uses custom paint. */
export function StudioTextSelection({ editor, zoom, revision="" }: { editor: Editor | null; zoom: number;revision?:string }) {
  const [boxes, setBoxes] = useState<TextLineBox[]>(EMPTY_BOXES);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    const scroller = root.closest<HTMLElement>("[data-studio-scroller]");
    const layerHost = scroller?.querySelector<HTMLElement>("[data-studio-selection-host]") ?? null;
    setHost(layerHost);
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        let next = EMPTY_BOXES;
        const selection = window.getSelection();
        try {
        if (layerHost && scroller && !editor.isDestroyed && selection?.rangeCount && !selection.isCollapsed && root.contains(selection.anchorNode) && root.contains(selection.focusNode)) {
          const clip = scroller.getBoundingClientRect(), origin = layerHost.getBoundingClientRect();
          const hostScale = origin.width / parseFloat(getComputedStyle(layerHost).width) || 1;
          const projection=pageProjection(root);
          const canonical=withCanonicalPages(root,()=>selectedLineBoxes(root,selection.getRangeAt(0),projection?new DOMRect(-1e7,-1e7,2e7,2e7):clip));
          const rootBox=root.getBoundingClientRect();
          next = canonical.map(box=>{if(!projection)return box;const p=projectPoint((box.left-rootBox.left)/hostScale,(box.top-rootBox.top)/hostScale,projection);return {...box,left:rootBox.left+p.x*hostScale,top:rootBox.top+p.y*hostScale};}).map(box => {
            const left = Math.max(box.left, clip.left), top = Math.max(box.top, clip.top);
            return { left: (left - origin.left)/hostScale, top: (top - origin.top)/hostScale, width: Math.max(0, Math.min(box.left + box.width, clip.right) - left)/hostScale, height: Math.max(0, Math.min(box.top + box.height, clip.bottom) - top)/hostScale };
          }).filter(box => box.width > 0 && box.height > 0);
        }
        } catch { next = EMPTY_BOXES; }
        // If measurement fails or no selection is painted, keep native highlighting.
        setBoxes(prev => prev.length || next.length ? next : prev);
      });
    };
    document.addEventListener("selectionchange", update);
    scroller?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    editor.on("transaction", update);
    editor.on("blur", update);
    const observer = new ResizeObserver(update);
    observer.observe(root);
    document.fonts.addEventListener("loadingdone", update);
    update();
    return () => {
      cancelAnimationFrame(raf); observer.disconnect();
      root.removeAttribute("data-studio-selection-painted");
      document.removeEventListener("selectionchange", update);
      scroller?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.fonts.removeEventListener("loadingdone", update);
      editor.off("transaction", update); editor.off("blur", update);
    };
  }, [editor, zoom,revision]);
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const root = editor.view.dom;
    root.toggleAttribute("data-studio-selection-painted", Boolean(host && boxes.length));
    return () => root.removeAttribute("data-studio-selection-painted");
  }, [editor, host, boxes]);
  if (!host || !boxes.length) return null;
  // Paint a translucent highlight between effect backgrounds (0) and story ink (2).
  // Difference blending needs an opaque backdrop; effects require a transparent story.
  return createPortal(<div aria-hidden="true" data-studio-selection-layer className="studio-no-print" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
    {boxes.map((box, index) => <div key={index} data-studio-line-selection style={{ position: "absolute", ...box, background: "rgba(80, 145, 255, 0.35)" }} />)}
  </div>, host);
}
