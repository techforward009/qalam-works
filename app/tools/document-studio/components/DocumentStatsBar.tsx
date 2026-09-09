import React from "react";
import type { DocumentStats } from "../utils/buildDocumentStats";
import type { DocumentHealthReport, HealthStatus } from "../utils/buildDocumentHealthReport";

interface DocumentStatsBarProps {
  stats: DocumentStats | null;
  health: DocumentHealthReport | null;
  isUr?: boolean;
}

function languageLabel(dominant: DocumentStats["language"]["dominant"], isUr: boolean): string {
  if (dominant === "arabic-script") return isUr ? "عربی رسم الخط" : "Arabic-script";
  if (dominant === "latin") return isUr ? "لاطینی" : "Latin";
  if (dominant === "mixed") return isUr ? "مخلوط" : "Mixed";
  return "—";
}

function HealthBadge({ label, status, isUr }: { label: string; status: HealthStatus; isUr?: boolean }) {
  const ok = status === "ok";
  return (
    <div
      className={`rounded-lg border p-2 text-center text-xs font-semibold ${
        ok ? "border-emerald-200 bg-emerald-50/60 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className="mt-0.5">{ok ? (isUr ? "✓ درست" : "✓ OK") : isUr ? "⚠️ نظرِ ثانی درکار" : "⚠️ Review"}</div>
    </div>
  );
}

export const DocumentStatsBar: React.FC<DocumentStatsBarProps> = ({ stats, health, isUr = false }) => {
  if (!stats) return null;

  return (
    <div
      className={`min-w-0 space-y-3 overflow-x-hidden rounded-xl border border-slate-200 bg-white p-3 text-xs ${isUr ? "text-right font-naskh" : "text-left"}`}
      dir={isUr ? "rtl" : "ltr"}
      data-studio-stats="true"
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
          <div className="font-medium text-slate-500">{isUr ? "الفاظ" : "Words"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{stats.wordCount}</div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
          <div className="font-medium text-slate-500">{isUr ? "حروف" : "Characters"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{stats.characterCount}</div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
          <div className="font-medium text-slate-500">{isUr ? "پیراگراف" : "Paragraphs"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{stats.paragraphCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <div className="min-w-0 text-slate-500">
          {isUr ? "زبان" : "Language"}: <span className="font-semibold text-slate-700">{languageLabel(stats.language.dominant, isUr)}</span>
          {stats.language.dominant === "mixed" && (
            <span className="text-slate-400">
              {" "}
              ({stats.language.arabicScriptPercent}% / {stats.language.latinPercent}%)
            </span>
          )}
        </div>

        {stats.numerals.isMixed && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-800">
            {isUr ? "مخلوط ہندسے" : "Mixed numerals"}
          </div>
        )}
      </div>

      {health && (
        <div className="border-t border-slate-100 pt-2">
          <h4 className="mb-2 text-xs font-semibold text-slate-600">{isUr ? "دستاویز کی صحت" : "Document health"}</h4>
          <div className="grid grid-cols-2 gap-2">
            <HealthBadge label={isUr ? "یونیکوڈ" : "Unicode"} status={health.unicodeConsistency} isUr={isUr} />
            <HealthBadge label={isUr ? "ہندسے" : "Numerals"} status={health.numeralConsistency} isUr={isUr} />
            <HealthBadge label={isUr ? "ساخت" : "Structure"} status={health.paragraphStructure} isUr={isUr} />
            <HealthBadge label={isUr ? "عنوانات" : "Headings"} status={health.headingHierarchy} isUr={isUr} />
            <div className="col-span-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
              <div className="font-medium text-slate-500">{isUr ? "ٹائپوگرافی مسائل" : "Typography issues"}</div>
              <div className="mt-0.5 font-bold text-slate-700">{health.typographyIssueCount}</div>
              <div className="mt-0.5 text-[10px] text-slate-400">
                {isUr ? "مخلوط رسم الخط، تطویل، دہرائے الفاظ" : "Mixed script, tatweel, repeated words"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
