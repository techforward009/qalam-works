"use client";
import React from "react";
import type { ReviewFilter } from "../utils/reviewNavigation";
import type { ReviewSummary } from "../utils/reviewState";

interface ReviewFilterBarProps {
  filter: ReviewFilter;
  summary: ReviewSummary;
  totalSegments: number;
  onFilterChange: (filter: ReviewFilter) => void;
  isUr?: boolean;
}

const FILTERS: { value: ReviewFilter; labelEn: string; labelUr: string; count: (s: ReviewSummary, total: number) => number }[] = [
  { value: "all",               labelEn: "All",       labelUr: "سب",       count: (_, total) => total },
  { value: "ready",             labelEn: "Ready",     labelUr: "تیار",     count: s => s.ready },
  { value: "changes-requested", labelEn: "Changes",   labelUr: "تبدیلی",   count: s => s.changesRequested },
  { value: "approved",          labelEn: "Approved",  labelUr: "منظور",    count: s => s.approved },
  { value: "not-ready",         labelEn: "Not ready", labelUr: "تیار نہیں", count: s => s.notReady },
];

export default function ReviewFilterBar({
  filter, summary, totalSegments, onFilterChange, isUr,
}: ReviewFilterBarProps) {

  return (
    <div className="mb-2">
      {/* Filter pills only — navigation row lives in Workspace as a sticky sibling */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={isUr ? "نظرثانی کی حالت سے فلٹر کریں" : "Filter segments by review state"}>
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
              {isUr ? f.labelUr : f.labelEn} {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
