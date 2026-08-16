"use client";
import React, { useCallback, useRef } from "react";
import type { TranslationSegment, TranslationLanguage, GlossaryEntry } from "../utils/translationTypes";
import { languageFontClass } from "../utils/translationTypes";
import type { TerminologyFinding, MemorySuggestion } from "../utils/terminology";
import type { QAIssue } from "../utils/translationQA";
import { QAIssuePill } from "./QASummaryStrip";

interface SegmentRowProps {
  segment: TranslationSegment;
  targetLanguage: TranslationLanguage;
  terminologyFindings: TerminologyFinding[];
  qaIssues: QAIssue[];
  memorySuggestion: MemorySuggestion | null;
  hasRepeatedConflict: boolean;
  onTargetChange: (id: string, value: string) => void;
  onSetFinal: (id: string) => void;
  onApplyMemory: (id: string, target: string) => void;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  untranslated: { label: "—", cls: "text-gray-400" },
  draft: { label: "Draft", cls: "text-amber-600" },
  final: { label: "Final ✓", cls: "text-green-700 font-semibold" },
};

export default function SegmentRow({
  segment, targetLanguage, terminologyFindings, qaIssues, memorySuggestion, hasRepeatedConflict,
  onTargetChange, onSetFinal, onApplyMemory,
}: SegmentRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTargetChange(segment.id, e.target.value);
    const el = e.target; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  }, [segment.id, onTargetChange]);

  const targetFontClass = languageFontClass(targetLanguage);
  const { label, cls } = STATUS_LABEL[segment.status] ?? STATUS_LABEL.untranslated;

  return (
    <div className="border border-[#1A3A2A]/10 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#F3F7F2] border-b border-[#1A3A2A]/8 text-xs">
        <span className="font-mono text-gray-500">{segment.id}</span>
        <span className={cls}>{label}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#1A3A2A]/8">
        <div className="p-3 text-sm leading-relaxed select-text" dir={segment.sourceDir}>
          <p className="text-gray-700">{segment.source}</p>
        </div>

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
            <button type="button" onClick={() => onSetFinal(segment.id)} className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium">
              Mark Final
            </button>
          )}
        </div>
      </div>

      {/* QA issues — combines terminology, conflict, and all other checks */}
      {qaIssues.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 flex flex-wrap gap-1.5">
          {qaIssues.map((issue, i) => <QAIssuePill key={i} issue={issue} />)}
        </div>
      )}

      {/* Memory suggestion */}
      {memorySuggestion && !segment.target.trim() && (
        <div className="border-t border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 flex items-center gap-2 flex-wrap">
          <span className="font-semibold shrink-0">Previously translated</span>
          <span dir="auto" className="flex-1 min-w-0 truncate text-blue-700">{memorySuggestion.target}</span>
          <button
            type="button"
            onClick={() => onApplyMemory(segment.id, memorySuggestion.target)}
            className="shrink-0 h-6 px-2 rounded bg-blue-700 text-white font-medium hover:bg-blue-800"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
