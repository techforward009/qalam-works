"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { selectedLineBoxes, type TextLineBox } from "../utils/textLineBoxes";

const EMPTY_BOXES: TextLineBox[] = [];

/** Native textarea selection is retained; only the main editor uses custom paint. */
export function StudioTextSelection({ editor, zoom }: { editor: Editor | null; zoom: number }) {
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
          next = selectedLineBoxes(root, selection.getRangeAt(0), clip).map(box => {
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
  }, [editor, zoom]);
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const root = editor.view.dom;
    root.toggleAttribute("data-studio-selection-painted", Boolean(host && boxes.length));
    return () => root.removeAttribute("data-studio-selection-painted");
  }, [editor, host, boxes]);
  if (!host || !boxes.length) return null;
  return createPortal(<div aria-hidden="true" data-studio-selection-layer className="studio-no-print" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, mixBlendMode: "difference" }}>
    {boxes.map((box, index) => <div key={index} data-studio-line-selection style={{ position: "absolute", ...box, background: "#fff" }} />)}
  </div>, host);
}
