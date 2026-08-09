import React from "react";

interface FindReplacePanelProps {
  isOpen: boolean;
  searchQuery: string;
  replaceQuery: string;
  matchCount: number;
  currentMatchIndex: number; // -1 when no match is active
  onSearchChange: (value: string) => void;
  onReplaceChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

/**
 * Phase 1 Professional Usability (2026-08-09) — Find & Replace panel.
 * Purely presentational; all actual document interaction (selection,
 * replacement) happens in DocumentStudioEditor.tsx via real TipTap
 * commands — this component only reports user intent upward through
 * its callback props. Matches the app's existing panel visual language.
 */
export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
  isOpen,
  searchQuery,
  replaceQuery,
  matchCount,
  currentMatchIndex,
  onSearchChange,
  onReplaceChange,
  onNext,
  onPrevious,
  onReplaceCurrent,
  onReplaceAll,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm space-y-2 text-xs" dir="ltr">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Find... / تلاش کریں"
          className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-xs"
          dir="rtl"
        />
        <span className="text-slate-500 whitespace-nowrap px-1">
          {matchCount > 0 ? `${currentMatchIndex + 1} / ${matchCount}` : "0 / 0"}
        </span>
        <button
          type="button"
          onClick={onPrevious}
          disabled={matchCount === 0}
          className="px-2 py-1 rounded border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
        >
          ↑ Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={matchCount === 0}
          className="px-2 py-1 rounded border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
        >
          ↓ Next
        </button>
        <button type="button" onClick={onClose} className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100">
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={replaceQuery}
          onChange={(e) => onReplaceChange(e.target.value)}
          placeholder="Replace with... / تبدیل کریں"
          className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-xs"
          dir="rtl"
        />
        <button
          type="button"
          onClick={onReplaceCurrent}
          disabled={matchCount === 0}
          className="px-3 py-1 rounded-md bg-amber-600 text-white font-semibold disabled:opacity-40 hover:bg-amber-700 whitespace-nowrap"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onReplaceAll}
          disabled={matchCount === 0}
          className="px-3 py-1 rounded-md border border-amber-600 text-amber-700 font-semibold disabled:opacity-40 hover:bg-amber-50 whitespace-nowrap"
        >
          Replace All
        </button>
      </div>
    </div>
  );
};
