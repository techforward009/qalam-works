import React from "react";
import type { QualityAuditReport } from "../utils/buildDocumentAuditReport";

interface QualityAuditPanelProps {
  report: QualityAuditReport | null;
  isLoading?: boolean;
  isStale?: boolean;
  isUr?: boolean;
}

const READINESS_LABELS = {
  typography: { en: "Typography", ur: "ٹائپوگرافی" },
  unicodeConsistency: { en: "Unicode", ur: "یونیکوڈ یکسانیت" },
  structure: { en: "Structure", ur: "ساخت" },
  rtlLtr: { en: "RTL/LTR", ur: "RTL/LTR" },
} as const;

export const QualityAuditPanel: React.FC<QualityAuditPanelProps> = ({
  report,
  isLoading = false,
  isStale = false,
  isUr = false,
}) => {
  const dir = isUr ? "rtl" : "ltr";
  const naskh = isUr ? "font-naskh" : "";

  if (isLoading) {
    return (
      <div className={`animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-3 ${isUr ? "text-right" : "text-left"}`} dir={dir}>
        <div className="mb-4 h-5 w-1/3 rounded bg-slate-200" />
        <div className="mb-2 h-12 rounded bg-slate-200" />
        <div className="h-12 rounded bg-slate-200" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 ${naskh}`} dir={dir} data-studio-audit="true">
        {isUr
          ? "متن کی کوالٹی آڈٹ دیکھنے کے لیے ایڈیٹر میں متن درج کریں یا آڈٹ کا بٹن دبائیں۔"
          : "Enter text in the editor or run Quality Audit to see results."}
      </div>
    );
  }

  return (
    <div className={`min-w-0 space-y-4 overflow-x-hidden rounded-xl border border-slate-200 bg-white p-3 ${naskh}`} dir={dir} data-studio-audit="true">
      {isStale && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
          {isUr ? "متن میں تبدیلی کی گئی ہے۔ تازہ نتائج کے لیے دوبارہ آڈٹ چلائیں۔" : "Text has changed. Re-run Quality Audit for fresh results."}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800">{isUr ? "متن کی معیار جانچ" : "Quality Audit"}</h3>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-700">
          {isUr ? "کل مسائل" : "Issues"}: {report.totalIssues}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="font-medium text-slate-500">{isUr ? "رسم الخط" : "Script"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{report.counts.mixedScript}</div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="font-medium text-slate-500">{isUr ? "رموزِ اوقاف" : "Punctuation"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{report.counts.punctuation}</div>
          <div className="mt-0.5 text-[10px] leading-tight text-slate-400">
            {isUr ? "وقوعات، بشمول انداز" : "Occurrences, including style"}
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="font-medium text-slate-500">{isUr ? "خالی جگہ" : "Spacing"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{report.counts.spacing}</div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="font-medium text-slate-500">{isUr ? "طویل پیراگراف" : "Long paragraphs"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{report.counts.longParagraphs}</div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="font-medium text-slate-500">{isUr ? "تکرارِ الفاظ" : "Repeated words"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{report.counts.repeatedWords}</div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="font-medium text-slate-500">{isUr ? "اردو/عربی حروف" : "Character forms"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{report.counts.mixedUrduArabicForms}</div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="font-medium text-slate-500">{isUr ? "عنوانات کی ترتیب" : "Heading order"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{report.counts.headingHierarchy}</div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="font-medium text-slate-500">{isUr ? "خالی پیراگراف" : "Empty paragraphs"}</div>
          <div className="mt-1 text-sm font-bold text-slate-700">{report.counts.emptyParagraphs}</div>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <h4 className="text-xs font-semibold text-slate-600">{isUr ? "اشاعتی تیاری" : "Publishing readiness"}</h4>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          {(Object.keys(READINESS_LABELS) as Array<keyof typeof READINESS_LABELS>).map((key) => {
            const ok = report.readiness[key] === "ok";
            return (
              <div
                key={key}
                className={`rounded-lg border p-2.5 text-xs font-semibold ${
                  ok ? "border-emerald-200 bg-emerald-50/60 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <div className="font-medium">{isUr ? READINESS_LABELS[key].ur : READINESS_LABELS[key].en}</div>
                <div className="mt-1">{ok ? (isUr ? "✓ درست" : "✓ OK") : isUr ? "⚠️ نظرِ ثانی درکار" : "⚠️ Needs review"}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-semibold text-slate-600">
          {isUr ? "تجویز کردہ اصلاحات" : "Recommendations"} ({report.recommendations.length})
        </h4>
        {report.recommendations.length === 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-700">
            {isUr ? "✓ متن میں کوئی قابلِ ذکر نقص نہیں ملا۔" : "✓ No significant issues found in this document."}
          </p>
        ) : (
          <ul className="space-y-2">
            {report.recommendations.map((rec) => (
              <li key={rec.id} className="min-w-0 space-y-1 rounded-lg border border-slate-200/80 bg-slate-50 p-3 text-xs">
                <div className="font-bold break-words text-slate-800">{isUr ? rec.titleUrdu : rec.titleEnglish}</div>
                <p className="leading-relaxed break-words text-slate-600">{isUr ? rec.descriptionUrdu : rec.descriptionEnglish}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
