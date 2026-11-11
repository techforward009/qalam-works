"use client";

import { useLayoutEffect } from "react";
import type { Editor } from "@tiptap/react";
import { createRunAroundPlugin, runAroundFrameKey, runAroundKey, RUN_AROUND_REFRESH, setRunAroundFrames } from "../extensions/RunAroundLayout";
import type { StudioFrame } from "./StudioObjectLayer";

/** Screen-only story wrap. Print and PDF keep their own path. */
export function StudioRunAround({ editor, frames }: { editor: Editor | null; frames: readonly StudioFrame[] }) {
  useLayoutEffect(() => {
    if (!editor) return;
    editor.registerPlugin(createRunAroundPlugin());
    return () => {
      if (!editor.isDestroyed) editor.unregisterPlugin(runAroundKey);
    };
  }, [editor]);

  const key = runAroundFrameKey(frames);
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    setRunAroundFrames(editor.view, frames);
    editor.view.dispatch(editor.view.state.tr.setMeta(RUN_AROUND_REFRESH, key).setMeta("addToHistory", false));
  }, [editor, key, frames]);
  return null;
}
