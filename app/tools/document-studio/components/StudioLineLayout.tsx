"use client";

import { useLayoutEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { createFirstLinePlugin, firstLineKey } from "../extensions/FirstLineLayout";

export function StudioLineLayout({ editor }: { editor: Editor | null }) {
  useLayoutEffect(() => {
    if (!editor) return;
    let destroyed = false;
    let frame = 0;
    editor.registerPlugin(createFirstLinePlugin());
    const pending = () => {
      if (!destroyed && !editor.isDestroyed) editor.view.dom.dataset.studioFontLayout = "pending";
    };
    const measured = ({ transaction }: { transaction: Transaction }) => {
      if (transaction.getMeta("qalam-first-line-measure") && document.fonts.status === "loaded") {
        editor.view.dom.dataset.studioFontLayout = "ready";
      }
    };
    const remeasure = () => {
      if (destroyed || frame || editor.isDestroyed) return;
      pending();
      // Drop stale fallback-face offsets synchronously when loading completes.
      // The fresh plugin measures the undecorated DOM on its next frame.
      editor.unregisterPlugin(firstLineKey);
      editor.registerPlugin(createFirstLinePlugin());
      frame = requestAnimationFrame(() => { frame = 0; });
    };
    const contentReplaced = ({ transaction }: { transaction: Transaction }) => {
      if (transaction.steps.some(step => {
        const range = step as { from?: number; to?: number };
        return range.from === 0 && range.to === transaction.before.content.size;
      })) { pending(); void document.fonts.ready.then(remeasure); }
    };
    editor.on("transaction", contentReplaced);
    editor.on("transaction", measured);
    document.fonts.addEventListener("loading", pending);
    document.fonts.addEventListener("loadingdone", remeasure);
    void document.fonts.ready.then(remeasure);
    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      document.fonts.removeEventListener("loadingdone", remeasure);
      document.fonts.removeEventListener("loading", pending);
      editor.off("transaction", contentReplaced);
      editor.off("transaction", measured);
      if (!editor.isDestroyed) {
        delete editor.view.dom.dataset.studioFontLayout;
        editor.unregisterPlugin(firstLineKey);
      }
    };
  }, [editor]);
  return null;
}
