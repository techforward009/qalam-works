"use client";
import React, { useState } from "react";
import type { QASummary } from "../utils/translationQA";

interface QASummaryStripProps {
  summary: QASummary;
  sourceLanguage: string;
  targetLanguage: string;
}

export default function QASummaryStrip({ summary }: QASummaryStripProps) {
  const [open, setOpen] = useState(false);
  const { total, critical, warning, info, untranslatedCount } = summary;

  const headerLabel = total === 0
    ? `No deterministic checks · ${untranslatedCount} untranslated`
    : `${total} check${total > 1 ? "s" : ""} · ${untranslatedCount} untranslated`;

  return (
    <div className="border border-gray-200 rounded-lg bg-white mb-3">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left">
        <span className="font-semibold text-gray-700">Translation QA</span>
        <span className="text-xs text-gray-500 ml-2 flex-1">{headerLabel}</span>
        <span className="text-gray-400 text-xs ml-2">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-600 space-y-0.5">
          {critical > 0 && <p className="text-red-700 font-medium">Critical: {critical}</p>}
          {warning > 0 && <p className="text-amber-700">Warnings: {warning}</p>}
          {info > 0 && <p className="text-blue-700">Info: {info}</p>}
          {total === 0 && <p className="text-gray-400">No deterministic issues detected. Human review is still required for translation accuracy.</p>}
          <p className="text-gray-400 pt-1">Untranslated segments: {untranslatedCount}</p>
        </div>
      )}
    </div>
  );
}
