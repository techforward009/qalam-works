"use client";

import { useEffect, useRef, useState } from "react";
import { useMovableStudioDialog } from "./useMovableStudioDialog";

export type ImportedStory = { number: number; text: string };

export default function InPageStoriesDialog({ stories, onClose }: { stories: ImportedStory[]; onClose: () => void }) {
  const drag = useMovableStudioDialog<HTMLDivElement>();
  const close = useRef<HTMLButtonElement>(null);
  const closeAction = useRef(onClose);
  closeAction.current = onClose;
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    close.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeAction.current(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="inpage-stories-title" dir="ltr">
      <div ref={drag.dialogRef} style={drag.style} className="w-full max-w-lg rounded border border-gray-400 bg-white p-4 text-sm text-black shadow-xl">
        <h2 {...drag.handleProps} style={drag.handleProps.style} id="inpage-stories-title" className="font-semibold">Additional InPage stories</h2>
        <p className="my-2">The main story is open. Other available stories can be copied below; their original layout is not restored.</p>
        <p className="mb-2">Other non-empty stories: {stories.length}</p>
        <ul className="max-h-[50vh] space-y-3 overflow-auto">
          {stories.map((story) => (
            <li key={story.number} className="border-t border-gray-200 pt-2">
              <div className="flex items-center justify-between gap-3">
                <span>Story {story.number}: <span dir="auto">{Array.from(story.text).slice(0, 40).join("")}</span></span>
                <button type="button" className="min-h-8 border border-gray-500 px-3" aria-label={`Copy story ${story.number}`} onClick={async () => {
                  try { await navigator.clipboard.writeText(story.text); setCopied(story.number); setError(""); }
                  catch { setError("Copy failed. Expand the full text below and copy it manually."); }
                }}>{copied === story.number ? "Copied" : "Copy"}</button>
              </div>
              <details className="mt-1"><summary>Full text</summary><textarea className="mt-1 w-full border p-2" dir="auto" readOnly aria-label={`Story ${story.number} full text`} value={story.text} /></details>
            </li>
          ))}
        </ul>
        {error ? <p role="status" className="mt-2">{error}</p> : null}
        <div className="mt-3 text-right"><button ref={close} type="button" className="min-h-8 border border-gray-500 px-4" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
