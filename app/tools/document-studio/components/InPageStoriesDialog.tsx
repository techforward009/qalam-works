"use client";

import { useEffect, useState } from "react";

export type ImportedStory = { number: number; text: string };

export default function InPageStoriesDialog({ stories, convertedStoryNumbers = [], onClose }: {
  stories: ImportedStory[];
  convertedStoryNumbers?: number[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  // The source story list remains available as backup, but once the
  // corresponding editable frames exist it must not occupy the page view.
  useEffect(() => {
    if (convertedStoryNumbers.length > 0) setExpanded(false);
  }, [convertedStoryNumbers.length]);
  const converted = new Set(convertedStoryNumbers);
  return (
    <section data-studio-inpage-stories-notice="true" className="mx-2 my-1 max-w-3xl rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800" role="dialog" aria-modal="false" aria-labelledby="inpage-stories-title" dir="ltr"
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="inpage-stories-title" className="font-semibold">InPage text imported</h2>
          <p>{converted.size
            ? "Editable text boxes were saved. This panel preserves the original story copies; native Run Around is not yet applied."
            : "The longest story is open. Other stories are preserved; original layout is not yet imported."}</p>
        </div>
        <button type="button" className="shrink-0 border border-slate-400 px-2 py-1" onClick={onClose}>Close</button>
      </div>
      <details className="mt-1" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
        <summary className="cursor-pointer">Original secondary stories: {stories.length} — {converted.size ? `${converted.size} converted to editable boxes; ` : ""}open to inspect or copy</summary>
        <ul className="mt-1 max-h-44 space-y-1 overflow-auto">
          {stories.map((story) => (
            <li key={story.number} className="border-t border-gray-200 pt-2">
              <div className="flex items-center justify-between gap-3">
                <span>Story {story.number}{converted.has(story.number) ? " (original source copy)" : ""}: <span dir="auto">{Array.from(story.text).slice(0, 40).join("")}</span></span>
                <button type="button" className="min-h-8 border border-gray-500 px-3" aria-label={`Copy story ${story.number}`} onClick={async () => {
                  try { await navigator.clipboard.writeText(story.text); setCopied(story.number); setError(""); }
                  catch { setError("Copy failed. Expand the full text below and copy it manually."); }
                }}>{copied === story.number ? "Copied" : "Copy"}</button>
              </div>
              <details className="mt-1"><summary>Full text</summary><textarea className="mt-1 w-full min-h-20 border p-2" rows={3} dir="auto" readOnly aria-label={`Story ${story.number} full text`} value={story.text} /></details>
            </li>
          ))}
        </ul>
      </details>
      {error ? <p role="status" className="mt-1">{error}</p> : null}
    </section>
  );
}
