"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { Editor } from "@tiptap/react";

/** Follow the painted caret AFTER pagination and React have committed its position.
 * A wheel/scrollbar action suspends following until the next edit/caret move.
 * Mouse selections never trigger a follow, either during or after their drag.
 */
export function useStudioCaretVisibility(editor: Editor | null, caretRef: RefObject<HTMLDivElement | null>, position: unknown) {
  const scheduleRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const scroller = dom.closest<HTMLElement>("[data-studio-scroller]");
    if (!scroller) return;
    let following = true, selecting = false, frame = 0;
    const canFollow = () => following && !selecting && !editor.isDestroyed && editor.isFocused &&
      editor.state.selection.empty && !document.querySelector('[data-studio-text-menu]') && window.getSelection()?.isCollapsed;
    const follow = () => {
      if (!canFollow() || !caretRef.current) return;
      const caret = caretRef.current.getBoundingClientRect();
      const viewport = scroller.getBoundingClientRect();
      const top = viewport.top + scroller.clientTop, left = viewport.left + scroller.clientLeft;
      const bottom = top + scroller.clientHeight, right = left + scroller.clientWidth;
      const native = window.getSelection()?.anchorNode;
      const owner = native?.nodeType === Node.TEXT_NODE ? native.parentElement : native instanceof HTMLElement ? native : editor.view.dom;
      const scale = caret.height / parseFloat(getComputedStyle(caretRef.current).height) || 1;
      const leading = parseFloat(getComputedStyle(owner ?? editor.view.dom).lineHeight) * scale;
      const margin = Math.min(scroller.clientHeight / 4, Math.max(16, Number.isFinite(leading) ? leading : caret.height));
      // Already visible means NO scrolling, even if closer than one line to an edge.
      if (caret.top < top) scroller.scrollTop += caret.top - top - margin;
      else if (caret.bottom > bottom) scroller.scrollTop += caret.bottom - bottom + margin;
      if (caret.left < left) scroller.scrollLeft += caret.left - left - 8;
      else if (caret.right > right) scroller.scrollLeft += caret.right - right + 8;
    };
    const schedule = () => {
      // Repeating keys must not continually postpone an already queued follow.
      if(frame||!canFollow())return;
      frame=requestAnimationFrame(()=>{frame=0;follow();});
    };
    // This hook's layout effect runs after the drawn caret DOM is committed.
    // Follow it before paint, instead of adding another two-frame delay.
    scheduleRef.current = follow;
    const move = () => {
      if (!selecting && editor.state.selection.empty) { following = true; schedule(); }
    };
    const transaction = ({ transaction }: { transaction: { docChanged: boolean; selectionSet: boolean } }) => {
      if (transaction.docChanged || transaction.selectionSet) move();
    };
    const pointerDown = (event: PointerEvent) => {
      following = false;
      selecting = event.button === 0 && event.target instanceof Node && dom.contains(event.target);
    };
    const pointerUp = () => {
      const wasSelecting = selecting; selecting = false;
      if (wasSelecting && window.getSelection()?.isCollapsed) move();
    };
    const suspend = () => { following = false; };
    const cancel = () => { selecting = false; suspend(); };
    editor.on("transaction", transaction);
    editor.on("selectionUpdate", move);
    editor.on("focus", move);
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("pointerup", pointerUp);
    document.addEventListener("pointercancel", cancel);
    scroller.addEventListener("wheel", suspend, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scheduleRef.current = () => {};
      editor.off("transaction", transaction); editor.off("selectionUpdate", move); editor.off("focus", move);
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("pointerup", pointerUp); document.removeEventListener("pointercancel", cancel);
      scroller.removeEventListener("wheel", suspend);
    };
  }, [editor, caretRef]);
  // This runs on the committed custom-caret position, including late layout-only updates.
  useLayoutEffect(() => { scheduleRef.current(); }, [position]);
}
