import React from "react";
import type { QualityAuditReport } from "../utils/buildDocumentAuditReport";

interface QualityAuditPanelProps {
  report: QualityAuditReport | null;
  isLoading?: boolean;
  isStale?: boolean;
}

export const QualityAuditPanel: React.FC<QualityAuditPanelProps> = ({
  report,
  isLoading = false,
  isStale = false,
}) => {
  // 1. Loading State
  if (isLoading) {
    return (
      <div
        className="p-4 border border-slate-200 rounded-xl bg-slate-50 animate-pulse text-right"
        dir="rtl"
      >
        <div className="h-5 bg-slate-200 rounded w-1/3 mb-4 ms-auto" />
        <div className="h-12 bg-slate-200 rounded mb-2" />
        <div className="h-12 bg-slate-200 rounded" />
      </div>
    );
  }

  // 2. Empty / Initial State
  if (!report) {
    return (
      <div
        className="p-4 border border-slate-200 rounded-xl bg-slate-50 text-right text-slate-500 text-xs"
        dir="rtl"
      >
        متن کی کوالٹی آڈٹ دیکھنے کے لیے ایڈیٹر میں متن درج کریں یا آڈٹ کا بٹن دبائیں۔
      </div>
    );
  }

  // 3. Main Presentational UI
  return (
    <div
      className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm space-y-4 text-right"
      dir="rtl"
    >
      {/* Stale Text Warning Banner */}
      {isStale && (
        <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800 font-medium">
          ⚠️ متن میں تبدیلی کی گئی ہے۔ تازہ نتائج کے لیے دوبارہ آڈٹ چلائیں۔
        </div>
      )}

      {/* Header & Total Issues Display. A numeric "score" used to be shown
          here too, but that 100/90/80...-style formula was never reviewed
          or approved as a business rule (see buildDocumentAuditReport.ts,
          2026-08-07 note) — showing it prominently implied a certainty it
          doesn't have. Total issues + the category breakdown below are the
          real, directly-measured numbers. */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="px-3 py-1 rounded-full text-lg font-bold border border-slate-200 bg-slate-50 text-slate-700">
          کل مسائل: {report.totalIssues}
        </div>
        <h3 className="text-base font-bold text-slate-800">
          متن کی معیار جانچ (Quality Audit)
        </h3>
      </div>

      {/* Issues Breakdown Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">رسم الخط (Script)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {report.counts.mixedScript}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">رموزِ اوقاف (Punctuation)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {report.counts.punctuation}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">خالی جگہ (Spacing)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {report.counts.spacing}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">طویل پیراگراف</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {report.counts.longParagraphs}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">تکرارِ الفاظ (Repeated)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {report.counts.repeatedWords}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">اردو/عربی حروف (Char Forms)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {report.counts.mixedUrduArabicForms}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">عنوانات کی ترتیب (Headings)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {report.counts.headingHierarchy}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-slate-500 font-medium">خالی پیراگراف (Empty)</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {report.counts.emptyParagraphs}
          </div>
        </div>
      </div>

      {/* Publishing Readiness — categorical (OK / Needs Review), not a raw
          score. Matches the same small-badge visual language used above,
          not a new UI system. */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <h4 className="text-xs font-semibold text-slate-600 pt-2">
          اشاعتی تیاری (Publishing Readiness)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
          {(
            [
              ["typography", "ٹائپوگرافی (Typography)"],
              ["unicodeConsistency", "یونیکوڈ یکسانیت (Unicode)"],
              ["structure", "ساخت (Structure)"],
              ["rtlLtr", "RTL/LTR"],
            ] as const
          ).map(([key, label]) => {
            const ok = report.readiness[key] === "ok";
            return (
              <div
                key={key}
                className={`p-2.5 rounded-lg border text-xs font-semibold ${
                  ok
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-700"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                <div className="font-medium">{label}</div>
                <div className="mt-1">{ok ? "✓ درست" : "⚠️ نظرِ ثانی درکار"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations List (Display Only) */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-semibold text-slate-600">
          تجویز کردہ اصلاحات ({report.recommendations.length})
        </h4>
        {report.recommendations.length === 0 ? (
          <p className="text-xs text-emerald-700 bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
            ✓ متن میں کوئی قابلِ ذکر نقص نہیں ملا۔
          </p>
        ) : (
          <ul className="space-y-2">
            {report.recommendations.map((rec) => (
              <li
                key={rec.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1"
              >
                <div className="font-bold text-slate-800">
                  {rec.titleUrdu}{" "}
                  <span className="text-slate-400 font-normal">
                    ({rec.titleEnglish})
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {rec.descriptionUrdu}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
