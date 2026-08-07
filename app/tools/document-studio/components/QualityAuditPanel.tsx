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

      {/* Header & Score / Total Issues Display */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full text-lg font-bold border border-slate-200 bg-slate-50 text-slate-700">
            {report.score} / 100
          </div>
          <div className="flex flex-col text-xs text-slate-500">
            <span className="font-medium">کیفیت کا اسکور</span>
            <span className="text-slate-600 font-semibold mt-0.5">
              کل مسائل: {report.totalIssues}
            </span>
          </div>
        </div>
        <h3 className="text-base font-bold text-slate-800">
          متن کی معیار جانچ (Quality Audit)
        </h3>
      </div>

      {/* Issues Breakdown Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
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
