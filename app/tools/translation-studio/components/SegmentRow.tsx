"use client";
import React, { useCallback, useRef } from "react";
import type { TranslationSegment, TranslationLanguage } from "../utils/translationTypes";
import { languageFontClass } from "../utils/translationTypes";

interface SegmentRowProps {
  segment: TranslationSegment;
  targetLanguage: TranslationLanguage;
  onTargetChange: (id: string, value: string) => void;
  onSetFinal: (id: string) => void;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  untranslated: { label: "—", cls: "text-gray-400" },
  draft: { label: "Draft", cls: "text-amber-600" },
  final: { label: "Final ✓", cls: "text-green-700 font-semibold" },
};

export default function SegmentRow({ segment, targetLanguage, onTargetChange, onSetFinal }: SegmentRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTargetChange(segment.id, e.target.value);
      // Auto-grow
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    [segment.id, onTargetChange]
  );

  const targetFontClass = languageFontClass(targetLanguage);
  const { label, cls } = STATUS_LABEL[segment.status] ?? STATUS_LABEL.untranslated;

  return (
    <div className="border border-[#1A3A2A]/10 rounded-lg bg-white overflow-hidden">
      {/* Segment header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#F3F7F2] border-b border-[#1A3A2A]/8 text-xs">
        <span className="font-mono text-gray-500">{segment.id}</span>
        <span className={cls}>{label}</span>
      </div>

      {/* Source / Target columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#1A3A2A]/8">
        {/* Source — read-only */}
        <div
          className="p-3 text-sm leading-relaxed select-text"
          dir={segment.sourceDir}
          lang={undefined}
        >
          <p className="text-gray-700">{segment.source}</p>
        </div>

        {/* Target — editable */}
        <div className="p-3 relative">
          <textarea
            ref={textareaRef}
            className={`w-full text-sm leading-relaxed resize-none outline-none bg-transparent placeholder-gray-400 ${targetFontClass}`}
            dir={segment.targetDir}
            value={segment.target}
            onChange={handleInput}
            placeholder="Type translation here…"
            rows={Math.max(2, segment.source.split(" ").length > 10 ? 3 : 2)}
            aria-label={`Translation for ${segment.id}`}
          />
          {segment.target.trim().length > 0 && segment.status !== "final" && (
            <button
              type="button"
              onClick={() => onSetFinal(segment.id)}
              className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium"
            >
              Mark Final
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
