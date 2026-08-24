"use client";
import React, { useCallback, useRef, useState } from "react";
import type { TranslationSegment, TranslationLanguage } from "../utils/translationTypes";
import { languageFontClass } from "../utils/translationTypes";
import type { TerminologyFinding, MemorySuggestion } from "../utils/terminology";
import type { QAIssue } from "../utils/translationQA";
import { formatQAMessage } from "../utils/qaMessageFormatter";
import { getReviewDisplayState, REVIEW_NOTE_MAX } from "../utils/reviewState";

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
  onApprove: (id: string) => void;
  onRequestChanges: (id: string, note: string) => void;
  isUr?: boolean;
}

function getStatusLabel(status: string, isUr?: boolean): { label: string; cls: string } {
  if (status === "untranslated") return { label: "—", cls: "text-gray-400" };
  if (status === "draft") return { label: isUr ? "مسودہ" : "Draft", cls: "text-amber-600" };
  return { label: isUr ? "حتمی ✓" : "Final ✓", cls: "text-green-700 font-semibold" };
}

const SEV_CLS: Record<string, string> = {
  critical: "text-red-700", warning: "text-amber-700", info: "text-blue-700",
};

function QAFindingsZone({ issues, isUr }: { issues: QAIssue[]; isUr?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (issues.length === 1) {
    return (
      <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs">
        <p className="font-semibold text-gray-600">{isUr ? "QA جانچ:" : "QA check:"} <span className={SEV_CLS[issues[0].severity]}>{formatQAMessage(issues[0], isUr)}</span></p>
      </div>
    );
  }
  return (
    <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs">
      <button type="button" onClick={() => setExpanded(e => !e)} className="font-semibold text-gray-600 flex items-center gap-1">
        {isUr ? "QA جانچ" : "QA check"} · {issues.length} {isUr ? "نکات" : "items"} <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <div className="mt-1 space-y-0.5">{issues.map((issue, i) => <p key={i} className={SEV_CLS[issue.severity]}>{formatQAMessage(issue, isUr)}</p>)}</div>}
    </div>
  );
}

function RequestChangesForm({ onSubmit, onCancel, isUr }: { onSubmit: (note: string) => void; onCancel: () => void; isUr?: boolean }) {
  const [note, setNote] = useState("");
  return (
    <div className="p-2 space-y-1.5">
      <textarea
        className="w-full rounded border border-orange-300 px-2 py-1.5 text-xs resize-none focus:outline-none"
        rows={3} maxLength={REVIEW_NOTE_MAX} value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={isUr ? "مطلوبہ تبدیلی بیان کریں (ضروری)…" : "Describe the required change (required)…"}
        autoFocus
      />
      <div className="flex gap-2">
        <button type="button" disabled={!note.trim()} onClick={() => onSubmit(note)}
          className="h-7 px-3 rounded bg-orange-600 text-white text-xs font-medium disabled:opacity-40">
          {isUr ? "جمع کریں" : "Submit"}
        </button>
        <button type="button" onClick={onCancel} className="h-7 px-2 text-xs text-gray-500">{isUr ? "منسوخ" : "Cancel"}</button>
      </div>
    </div>
  );
}

export default function SegmentRow({
  segment, targetLanguage, terminologyFindings, qaIssues, memorySuggestion, hasRepeatedConflict,
  onTargetChange, onSetFinal, onApplyMemory, onApprove, onRequestChanges, isUr,
}: SegmentRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTargetChange(segment.id, e.target.value);
    const el = e.target; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  }, [segment.id, onTargetChange]);

  const reviewState = getReviewDisplayState(segment);
  const targetFontClass = languageFontClass(targetLanguage);
  const { label, cls } = getStatusLabel(segment.status, isUr);

  // Compact header label for changes-requested segments
  const headerCls = reviewState === "changes-requested"
    ? "bg-orange-50 border-b border-orange-200"
    : "bg-[#F3F7F2] border-b border-[#1A3A2A]/8";

  return (
    <div className="border border-[#1A3A2A]/10 rounded-lg bg-white overflow-hidden">
      {/* Segment header */}
      <div className={`flex items-center justify-between px-3 py-1.5 text-xs ${headerCls}`}>
        <span className="font-mono text-gray-500">{segment.id}</span>
        <span className="flex items-center gap-2">
          {reviewState === "changes-requested" && <span className="font-semibold text-orange-700">{isUr ? "تبدیلی درکار ہے" : "Changes requested"}</span>}
          {reviewState === "approved" && <span className="font-semibold text-green-700">{isUr ? "منظور ✓" : "Approved ✓"}</span>}
          {reviewState === "ready" && <span className="text-blue-700">{isUr ? "نظرثانی کے لیے تیار" : "Ready for review"}</span>}
          <span className={cls}>{label}</span>
        </span>
      </div>

      {/* Changes requested review note — prominent */}
      {reviewState === "changes-requested" && segment.reviewNote && (
        <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 text-xs text-orange-800">
          <p className="font-semibold mb-0.5">{isUr ? "جائزہ کار کا نوٹ:" : "Reviewer note:"}</p>
          <p>{segment.reviewNote}</p>
        </div>
      )}

      {/* Previous note (retained after resubmission) — shown when ready OR approved */}
      {(reviewState === "ready" || reviewState === "approved") && segment.reviewNote && (
        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-xs">
          <button type="button" onClick={() => setShowNote(n => !n)} className="text-gray-500 hover:text-gray-700">
            {isUr ? `پچھلا جائزہ نوٹ ${showNote ? "▲" : "▼"}` : `Previous review note ${showNote ? "▲" : "▼"}`}
          </button>
          {showNote && <p className="mt-1 text-gray-600">{segment.reviewNote}</p>}
        </div>
      )}

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
            placeholder={isUr ? "ترجمہ یہاں لکھیں…" : "Type translation here…"}
            rows={Math.max(2, segment.source.split(" ").length > 10 ? 3 : 2)}
            aria-label={`Translation for ${segment.id}`}
          />
          {segment.target.trim().length > 0 && segment.status !== "final" && (
            <button type="button" onClick={() => onSetFinal(segment.id)} className="mt-1 text-xs text-green-700 hover:text-green-900 font-medium">
              {isUr ? "حتمی کریں" : "Mark Final"}
            </button>
          )}
        </div>
      </div>

      {/* 17C: Review actions for ready/approved segments */}
      {reviewState === "ready" && !showRequestForm && (
        <div className="border-t border-blue-100 bg-blue-50 px-3 py-2 text-xs flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-blue-800 shrink-0">{isUr ? "نظرثانی کے لیے تیار" : "Ready for review"}</span>
          <button type="button" onClick={() => onApprove(segment.id)}
            className="h-7 px-3 rounded bg-green-700 text-white font-medium hover:bg-green-800">{isUr ? "منظور" : "Approve"}</button>
          <button type="button" onClick={() => setShowRequestForm(true)}
            className="h-7 px-3 rounded border border-orange-300 text-orange-700 font-medium hover:bg-orange-50">{isUr ? "تبدیلی مانگیں" : "Request changes"}</button>
        </div>
      )}

      {reviewState === "ready" && showRequestForm && (
        <div className="border-t border-orange-200 bg-orange-50">
          <RequestChangesForm
            onSubmit={note => { onRequestChanges(segment.id, note); setShowRequestForm(false); }}
            onCancel={() => setShowRequestForm(false)}
            isUr={isUr}
          />
        </div>
      )}

      {/* 17B.1: Terminology warnings */}
      {terminologyFindings.length > 0 && (
        <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-0.5">
          <p className="font-semibold">{isUr ? "اصطلاحی جانچ" : "Terminology check"}{terminologyFindings.length > 1 ? ` (${terminologyFindings.length})` : ""}:</p>
          {terminologyFindings.map(f => (
            <p key={f.entry.id}>{isUr ? "منظور شدہ اصطلاح نہیں ملی:" : "Approved term not found:"} <span className="font-medium">{f.entry.sourceTerm}</span> → <span dir="auto" className="font-medium">{f.entry.targetTerm}</span></p>
          ))}
        </div>
      )}

      {/* 17B.1: Repeated-source conflict */}
      {hasRepeatedConflict && (
        <div className="border-t border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-700">
{isUr ? "ایک جیسے ماخذ کے مختلف ترجمے" : "Repeated source has different translations"}
        </div>
      )}

      {/* 17B.2: QA findings */}
      {qaIssues.length > 0 && <QAFindingsZone issues={qaIssues} isUr={isUr} />}

      {/* 17B.1: Memory suggestion */}
      {memorySuggestion && !segment.target.trim() && (
        <div className="border-t border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 flex items-center gap-2 flex-wrap">
          <span className="font-semibold shrink-0">{isUr ? "پہلے ترجمہ شدہ" : "Previously translated"}</span>
          <span dir="auto" className="flex-1 min-w-0 truncate text-blue-700">{memorySuggestion.target}</span>
          <button type="button" onClick={() => onApplyMemory(segment.id, memorySuggestion.target)}
            className="shrink-0 h-6 px-2 rounded bg-blue-700 text-white font-medium hover:bg-blue-800">{isUr ? "لگائیں" : "Apply"}</button>
        </div>
      )}
    </div>
  );
}
