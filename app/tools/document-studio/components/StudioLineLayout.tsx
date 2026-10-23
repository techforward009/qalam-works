"use client";

import { useLayoutEffect } from "react";
import type { Editor } from "@tiptap/react";
import { createFirstLinePlugin, firstLineKey } from "../extensions/FirstLineLayout";

export function StudioLineLayout({ editor }: { editor: Editor | null }) {
  useLayoutEffect(() => {
    if (!editor) return;
    editor.registerPlugin(createFirstLinePlugin());
    return () => { if (!editor.isDestroyed) editor.unregisterPlugin(firstLineKey); };
  }, [editor]);
  return null;
}
