"use client";
import React from "react";
import type { ReviewFilter } from "../utils/reviewNavigation";
import type { ReviewSummary } from "../utils/reviewState";

interface ReviewFilterBarProps {
  filter: ReviewFilter;
  summary: ReviewSummary;
  totalSegments: number;
  visibleCount: number;
  onFilterChange: (filter: ReviewFilter) => void;
  onNext: () => void;
}

const FILTERS: { value: ReviewFilter; label: string; count: (s: ReviewSummary, total: number) => number }[] = [
  { value: "all",               label: "All",       count: (_, total) => total },
  { value: "ready",             label: "Ready",     count: s => s.ready },
  { value: "changes-requested", label: "Changes",   count: s => s.changesRequested },
  { value: "approved",          label: "Approved",  count: s => s.approved },
  { value: "not-ready",         label: "Not ready", count: s => s.notReady },
];

export default function ReviewFilterBar({
  filter, summary, totalSegments, visibleCount, onFilterChange, onNext,
}: ReviewFilterBarProps) {
  const nextDisabled = visibleCount === 0;

  return (
    <div className="mb-3 space-y-2">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter segments by review state">
        {FILTERS.map(f => {
          const count = f.count(summary, totalSegments);
          const selected = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onFilterChange(f.value)}
              className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                selected
                  ? "bg-[#1A3A2A] text-white border-[#1A3A2A]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#1A3A2A]/30 hover:text-[#1A3A2A]"
              }`}
            >
              {f.label} {count}
            </button>
          );
        })}
      </div>

      {/* Navigation row — sticky so Next remains reachable after scrolling */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm -mx-4 px-4 py-1.5 flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>Showing {visibleCount} of {totalSegments}</span>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="h-7 px-3 rounded border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next ↓
        </button>
      </div>
    </div>
  );
}
