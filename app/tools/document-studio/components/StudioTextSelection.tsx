"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { selectedLineBoxes, selectedTextareaLineBoxes, type TextLineBox } from "../utils/textLineBoxes";

/** Paint selection independently of glyph overflow, without modifying editable DOM. */
export function StudioTextSelection({ editor, zoom }: { editor: Editor | null; zoom: number }) {
  const [boxes, setBoxes] = useState<TextLineBox[]>([]);
  useEffect(() => {
    if (!editor) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (editor.isDestroyed) { setBoxes([]); return; }
        const clip = editor.view.dom.closest("[data-studio-scroller]")?.getBoundingClientRect();
        const paint = (measured: TextLineBox[]) => setBoxes(clip ? measured.map(box => {
          const left = Math.max(box.left, clip.left), top = Math.max(box.top, clip.top);
          return { left, top, width: Math.max(0, Math.min(box.left + box.width, clip.right) - left), height: Math.max(0, Math.min(box.top + box.height, clip.bottom) - top) };
        }).filter(box => box.width > 0 && box.height > 0) : measured);
        const input = document.activeElement;
        if (input instanceof HTMLTextAreaElement && input.matches("[data-studio-text-frame]")) {
          paint(selectedTextareaLineBoxes(input));
          return;
        }
        const selection = window.getSelection();
        const root = editor.view.dom;
        paint(!editor.isDestroyed && selection?.rangeCount && !selection.isCollapsed && root.contains(selection.anchorNode) && root.contains(selection.focusNode)
          ? selectedLineBoxes(root, selection.getRangeAt(0)) : []);
      });
    };
    document.addEventListener("selectionchange", measure);
    document.addEventListener("select", measure, true);
    document.addEventListener("input", measure, true);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    editor.on("transaction", measure);
    editor.on("blur", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(editor.view.dom);
    document.fonts.addEventListener("loadingdone", measure);
    measure();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("selectionchange", measure);
      document.removeEventListener("select", measure, true);
      document.removeEventListener("input", measure, true);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      document.fonts.removeEventListener("loadingdone", measure);
      editor.off("transaction", measure);
      editor.off("blur", measure);
    };
  }, [editor, zoom]);
  if (typeof document === "undefined" || boxes.length === 0) return null;
  return createPortal(<div aria-hidden="true" data-studio-selection-layer className="studio-no-print" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 40, mixBlendMode: "difference" }}>
    {boxes.map((box, index) => <div key={index} data-studio-line-selection style={{ position: "absolute", ...box, background: "linear-gradient(#fff calc(100% - 1px), transparent 0)" }} />)}
  </div>, editor && !editor.isDestroyed ? editor.view.dom.closest("[data-studio-shell]") ?? document.body : document.body);
}
