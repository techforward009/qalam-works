"use client";
import React from "react";
import type { QASummary, QAIssue } from "../utils/translationQA";

interface QASummaryStripProps {
  summary: QASummary;
}

const SEV_CLS: Record<string, string> = {
  critical: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const SEV_BADGE: Record<string, string> = {
  critical: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white",
};

export function QAIssuePill({ issue }: { issue: QAIssue }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs rounded px-1.5 py-0.5 border ${SEV_CLS[issue.severity]}`}>
      {issue.message}
    </span>
  );
}

export default function QASummaryStrip({ summary }: QASummaryStripProps) {
  if (summary.total === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 mb-3">
        <span className="font-semibold">QA ✓</span>
        <span>No issues found</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs mb-3">
      <span className="font-semibold text-gray-700">QA</span>
      {summary.critical > 0 && (
        <span className={`rounded px-1.5 py-0.5 font-semibold ${SEV_BADGE.critical}`}>{summary.critical} critical</span>
      )}
      {summary.warning > 0 && (
        <span className={`rounded px-1.5 py-0.5 font-semibold ${SEV_BADGE.warning}`}>{summary.warning} warning{summary.warning > 1 ? "s" : ""}</span>
      )}
      {summary.info > 0 && (
        <span className={`rounded px-1.5 py-0.5 font-semibold ${SEV_BADGE.info}`}>{summary.info} info</span>
      )}
    </div>
  );
}
