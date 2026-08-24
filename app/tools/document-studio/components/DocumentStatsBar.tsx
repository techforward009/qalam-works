import React from "react";
import type { DocumentStats } from "../utils/buildDocumentStats";
import type { DocumentHealthReport, HealthStatus } from "../utils/buildDocumentHealthReport";

interface DocumentStatsBarProps {
  stats: DocumentStats | null;
  health: DocumentHealthReport | null;
  isUr?: boolean;
}

const LANGUAGE_LABEL: Record<DocumentStats["language"]["dominant"], string> = {
  "arabic-script": "اردو/عربی (Arabic-script)",
  latin: "انگریزی (Latin)",
  mixed: "مخلوط (Mixed)",
  none: "—",
};

function HealthBadge({ label, status, isUr }: { label: string; status: HealthStatus; isUr?: boolean }) {
  const ok = status === "ok";
  return (
    <div
      className={`p-2 rounded-lg border text-xs font-semibold text-center ${
        ok ? "bg-emerald-50/60 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className="mt-0.5">{ok ? (isUr ? "✓ درست" : "✓ OK") : (isUr ? "⚠️ نظرِ ثانی درکار" : "⚠️ Review")}</div>
    </div>
  );
}

/**
 * Document Intelligence v2 (2026-08-09) — "Document Statistics" from
 * Batch 1, now extended into a live Document Health assistant: word/
 * character/paragraph counts, Numeral Intelligence, Language
 * Intelligence, AND a live Document Health Report (Unicode consistency,
 * typography issue count, numeral consistency, paragraph structure,
 * heading hierarchy) — all computed live on every edit, no "Run Audit"
 * click required, matching the goal of feeling like a continuous
 * publishing assistant rather than an on-demand tool.
 *
 * Analysis-only — never changes the document. Matches
 * QualityAuditPanel.tsx's exact visual language (same card/grid/badge
 * styling) rather than introducing a new UI system.
 */
export const DocumentStatsBar: React.FC<DocumentStatsBarProps> = ({ stats, health, isUr = false }) => {
  if (!stats) return null;

  return (
    <div className={`p-3 border border-slate-200 rounded-xl bg-white shadow-sm text-xs space-y-3 ${isUr ? "text-right" : "text-left"}`} dir={isUr ? "rtl" : "ltr"}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">{isUr ? "الفاظ" : "Words"}</div>
          <div className="text-sm font-bold text-slate-700 mt-1">{stats.wordCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">{isUr ? "حروف" : "Characters"}</div>
          <div className="text-sm font-bold text-slate-700 mt-1">{stats.characterCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">{isUr ? "پیراگراف" : "Paragraphs"}</div>
          <div className="text-sm font-bold text-slate-700 mt-1">{stats.paragraphCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="text-slate-500">
          {isUr ? "زبان" : "Language"}: <span className="font-semibold text-slate-700">{LANGUAGE_LABEL[stats.language.dominant]}</span>
          {stats.language.dominant === "mixed" && (
            <span className="text-slate-400">
              {" "}
              ({stats.language.arabicScriptPercent}% / {stats.language.latinPercent}%)
            </span>
          )}
        </div>

        {stats.numerals.isMixed && (
          <div className="px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
            {isUr ? "⚠️ مخلوط ہندسے" : "⚠️ Mixed Numerals"}
          </div>
        )}
      </div>

      {health && (
        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-600 mb-2">{isUr ? "دستاویز کی صحت" : "Document Health"}</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <HealthBadge label={isUr ? "یونیکوڈ" : "Unicode"} status={health.unicodeConsistency} isUr={isUr} />
            <HealthBadge label={isUr ? "ہندسے" : "Numerals"} status={health.numeralConsistency} isUr={isUr} />
            <HealthBadge label={isUr ? "ساخت" : "Structure"} status={health.paragraphStructure} isUr={isUr} />
            <HealthBadge label={isUr ? "عنوانات" : "Headings"} status={health.headingHierarchy} isUr={isUr} />
            <div className="p-2 rounded-lg border border-slate-100 bg-slate-50 text-center">
              <div className="font-medium text-slate-500">{isUr ? "ٹائپوگرافی مسائل" : "Typography Issues"}</div>
              <div className="mt-0.5 font-bold text-slate-700">{health.typographyIssueCount}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
