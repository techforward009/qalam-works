import React from "react";
import type { DocumentStats } from "../utils/buildDocumentStats";

interface DocumentStatsBarProps {
  stats: DocumentStats | null;
}

const LANGUAGE_LABEL: Record<DocumentStats["language"]["dominant"], string> = {
  "arabic-script": "اردو/عربی (Arabic-script)",
  latin: "انگریزی (Latin)",
  mixed: "مخلوط (Mixed)",
  none: "—",
};

/**
 * Batch 1 (2026-08-09) — always-visible, live document statistics: word/
 * character/paragraph counts, Numeral Intelligence (which digit systems
 * are in use, flagged if mixed), and Language Intelligence (Arabic-script
 * vs Latin proportion). Analysis-only — never changes the document.
 *
 * Matches QualityAuditPanel.tsx's exact visual language (same card/grid/
 * badge styling) rather than introducing a new UI system.
 */
export const DocumentStatsBar: React.FC<DocumentStatsBarProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm text-right text-xs" dir="rtl">
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">الفاظ (Words)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">{stats.wordCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">حروف (Characters)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">{stats.characterCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">پیراگراف (Paragraphs)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">{stats.paragraphCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
        <div className="text-slate-500">
          زبان (Language): <span className="font-semibold text-slate-700">{LANGUAGE_LABEL[stats.language.dominant]}</span>
          {stats.language.dominant === "mixed" && (
            <span className="text-slate-400">
              {" "}
              ({stats.language.arabicScriptPercent}% / {stats.language.latinPercent}%)
            </span>
          )}
        </div>

        {stats.numerals.isMixed && (
          <div className="px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
            ⚠️ مخلوط ہندسے (Mixed Numerals)
          </div>
        )}
      </div>
    </div>
  );
};
