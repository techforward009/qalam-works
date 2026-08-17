"use client";
import React, { useState } from "react";
import type { ReviewSummary } from "../utils/reviewState";

export default function ReviewSummaryPanel({ summary, isUr }: { summary: ReviewSummary; isUr?: boolean }) {
  const [open, setOpen] = useState(false);
  const parts: string[] = [];
  if (summary.ready > 0) parts.push(`${summary.ready} ready`);
  if (summary.approved > 0) parts.push(`${summary.approved} approved`);
  if (summary.changesRequested > 0) parts.push(`${summary.changesRequested} changes requested`);
  if (summary.notReady > 0) parts.push(`${summary.notReady} not ready`);
  const headerLabel = parts.length > 0 ? parts.join(" · ") : isUr ? "نظرثانی کے لیے کوئی سیگمنٹ نہیں" : "No segments ready for review";

  return (
    <div className="border border-gray-200 rounded-lg bg-white mb-3">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left">
        <span className="font-semibold text-gray-700">Review</span>
        <span className="text-xs text-gray-500 ml-2 flex-1">{headerLabel}</span>
        <span className="text-gray-400 text-xs ml-2">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-600 space-y-0.5">
          <p><span className="font-medium text-green-700">Approved:</span> {summary.approved}</p>
          <p><span className="font-medium text-blue-700">Ready for review:</span> {summary.ready}</p>
          <p><span className="font-medium text-orange-600">Changes requested:</span> {summary.changesRequested}</p>
          <p><span className="font-medium text-gray-500">Not ready:</span> {summary.notReady}</p>
        </div>
      )}
    </div>
  );
}
