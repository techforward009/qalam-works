"use client";
import React from "react";
import type { ReviewFilter } from "../utils/reviewNavigation";
import type { ReviewSummary } from "../utils/reviewState";

interface ReviewFilterBarProps {
  filter: ReviewFilter;
  summary: ReviewSummary;
  totalSegments: number;
  onFilterChange: (filter: ReviewFilter) => void;
}

const FILTERS: { value: ReviewFilter; label: string; count: (s: ReviewSummary, total: number) => number }[] = [
  { value: "all",               label: "All",       count: (_, total) => total },
  { value: "ready",             label: "Ready",     count: s => s.ready },
  { value: "changes-requested", label: "Changes",   count: s => s.changesRequested },
  { value: "approved",          label: "Approved",  count: s => s.approved },
  { value: "not-ready",         label: "Not ready", count: s => s.notReady },
];

export default function ReviewFilterBar({
  filter, summary, totalSegments, onFilterChange,
}: ReviewFilterBarProps) {

  return (
    <div className="mb-2">
      {/* Filter pills only — navigation row lives in Workspace as a sticky sibling */}
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
    </div>
  );
}
