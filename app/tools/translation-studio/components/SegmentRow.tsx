"use client";
import React, { useCallback, useRef, useState } from "react";
import type { TranslationSegment, TranslationLanguage, GlossaryEntry } from "../utils/translationTypes";
import { languageFontClass } from "../utils/translationTypes";
import type { TerminologyFinding, MemorySuggestion } from "../utils/terminology";
import type { QAIssue } from "../utils/translationQA";

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

const SEV_CLS: Record<string, string> = {
  critical: "text-red-700",
  warning: "text-amber-700",
  info: "text-blue-700",
};

function QAFindingsZone({ issues }: { issues: QAIssue[] }) {
  const [expanded, setExpanded] = useState(false);
  if (issues.length === 1) {
    return (
      <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs">
        <p className="font-semibold text-gray-600">QA check: <span className={SEV_CLS[issues[0].severity]}>{issues[0].message}</span></p>
      </div>
    );
  }
  return (
    <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs">
      <button type="button" onClick={() => setExpanded(e => !e)}
        className="font-semibold text-gray-600 flex items-center gap-1">
        QA check · {issues.length} items <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5">
          {issues.map((issue, i) => (
            <p key={i} className={SEV_CLS[issue.severity] ?? "text-gray-700"}>{issue.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}

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
      {/* Segment header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#F3F7F2] border-b border-[#1A3A2A]/8 text-xs">
        <span className="font-mono text-gray-500">{segment.id}</span>
        <span className={cls}>{label}</span>
      </div>

      {/* Source / Target columns */}
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

      {/* 17B.1: Terminology warnings — unchanged, separate from QA */}
      {terminologyFindings.length > 0 && (
        <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-0.5">
          <p className="font-semibold">Terminology check{terminologyFindings.length > 1 ? ` (${terminologyFindings.length})` : ""}:</p>
          {terminologyFindings.map(f => (
            <p key={f.entry.id}>
              Approved term not found: <span className="font-medium">{f.entry.sourceTerm}</span> → <span dir="auto" className="font-medium">{f.entry.targetTerm}</span>
            </p>
          ))}
        </div>
      )}

      {/* 17B.1: Repeated-source conflict — unchanged, separate from QA */}
      {hasRepeatedConflict && (
        <div className="border-t border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-700">
          Repeated source has different translations
        </div>
      )}

      {/* 17B.2: Translation QA findings — separate zone, collapsible when >1 */}
      {qaIssues.length > 0 && (
        <QAFindingsZone issues={qaIssues} />
      )}

      {/* 17B.1: Memory suggestion — unchanged */}
      {memorySuggestion && !segment.target.trim() && (
        <div className="border-t border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 flex items-center gap-2 flex-wrap">
          <span className="font-semibold shrink-0">Previously translated</span>
          <span dir="auto" className="flex-1 min-w-0 truncate text-blue-700">{memorySuggestion.target}</span>
          <button type="button" onClick={() => onApplyMemory(segment.id, memorySuggestion.target)}
            className="shrink-0 h-6 px-2 rounded bg-blue-700 text-white font-medium hover:bg-blue-800">Apply</button>
        </div>
      )}
    </div>
  );
}
